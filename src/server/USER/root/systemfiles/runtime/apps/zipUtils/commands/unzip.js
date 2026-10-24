(async () => {
  const log = async (message, color = '#b20a0a') => {
    try {
      await self.api.writeline(String(message), undefined, color);
    } catch (_) {}
  };

  try {
    // Conservative limits to reduce memory pressure.
    const MAX_ARCHIVE_BYTES = 512 * 1024 * 1024;
    const MAX_ENTRY_BYTES = 256 * 1024 * 1024;
    const MAX_TOTAL_BYTES = 800 * 1024 * 1024;
    const MAX_ENTRIES = 100000;

    const api = self.api;
    const raw = self._startArgs;
    const args = Array.isArray(raw) ? raw : [];
    const named = raw && typeof raw === 'object' && !Array.isArray(raw)
      ? raw
      : {};

    const first = (...values) => {
      for (const value of values) {
        if (value == null) continue;
        const s = String(value).trim();
        if (s) return s;
      }
      return '';
    };

    const srcArg = first(
      named.src, named.source, named.path, named.file,
      named.target, named.s, args[0]
    );

    const dstArg = first(
      named.dest, named.destination, args[1]
    );

    const normalize = value => {
      const parts = [];
      for (const part of String(value ?? '/').replace(/\\/g, '/').trim().split('/')) {
        if (!part || part === '.') continue;
        if (part === '..') {
          if (parts.length) parts.pop();
        } else {
          parts.push(part);
        }
      }
      return '/' + parts.join('/');
    };

    const cwdInfo = typeof api.cwd === 'function'
      ? await api.cwd()
      : { full: '/' };

    const cwd = normalize(cwdInfo?.full || '/');

    const resolve = (value, fallback = '') => {
      const input = String(value ?? '').trim() || fallback;
      if (!input) throw new Error('Missing path.');
      if (/^[a-z][a-z0-9+.-]*:\/\//i.test(input)) {
        throw new Error('URL paths are not supported.');
      }
      return normalize(
        input.startsWith('/') || input.startsWith('\\')
          ? input
          : cwd + '/' + input
      );
    };

    if (!srcArg) throw new Error('Provide the ZIP source path.');

    const source = resolve(srcArg);
    const outputDir = resolve(dstArg, cwd);

    if (source === '/' || outputDir === source ||
        outputDir.startsWith(source + '/')) {
      throw new Error('Invalid source or destination path.');
    }

    const join = (...parts) =>
      normalize(parts.filter(Boolean).join('/'));

    const dirname = path => {
      const parts = path.split('/').filter(Boolean);
      parts.pop();
      return '/' + parts.join('/');
    };

    const toBytes = value => {
      if (value instanceof Uint8Array) {
        return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      }
      if (value instanceof ArrayBuffer) return new Uint8Array(value);
      if (ArrayBuffer.isView(value)) {
        return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      }
      if (Array.isArray(value)) return Uint8Array.from(value);
      throw new Error('Could not read ZIP binary data.');
    };

    const readBytes = async path => {
      const result = await api.readFile(path, {
        buffer: true,
        direct: true
      });
      const content = result && typeof result === 'object' &&
        'fileContent' in result ? result.fileContent : result;
      return toBytes(content);
    };

    const ensureFolder = async path => {
      if (!path || path === '/') return;
      let current = '';
      for (const part of normalize(path).split('/').filter(Boolean)) {
        current += '/' + part;
        if (!(await api.folderExists(current))) {
          await api.writeFolder(current);
        }
      }
    };

    const hasRange = (bytes, offset, length) =>
      Number.isSafeInteger(offset) &&
      Number.isSafeInteger(length) &&
      offset >= 0 && length >= 0 &&
      offset <= bytes.length &&
      length <= bytes.length - offset;

    const u16 = (view, offset) => {
      if (offset < 0 || offset + 2 > view.byteLength) {
        throw new Error('ZIP structure is truncated.');
      }
      return view.getUint16(offset, true);
    };

    const u32 = (view, offset) => {
      if (offset < 0 || offset + 4 > view.byteLength) {
        throw new Error('ZIP structure is truncated.');
      }
      return view.getUint32(offset, true);
    };

    const crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crcTable[n] = c >>> 0;
    }

    const crc32 = bytes => {
      let crc = 0xffffffff;
      for (const byte of bytes) {
        crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
      }
      return (crc ^ 0xffffffff) >>> 0;
    };

    const findEOCD = bytes => {
      const view = new DataView(
        bytes.buffer, bytes.byteOffset, bytes.byteLength
      );
      const start = Math.max(0, bytes.length - 22 - 0xffff);

      for (let i = bytes.length - 22; i >= start; i--) {
        if (
          bytes[i] === 0x50 && bytes[i + 1] === 0x4b &&
          bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06
        ) {
          if (i + 22 > bytes.length) continue;
          const commentLength = u16(view, i + 20);
          if (i + 22 + commentLength === bytes.length) return i;
        }
      }
      throw new Error('Invalid ZIP file or missing end record.');
    };

    const decodeName = (bytes, utf8) => {
      try {
        return new TextDecoder(utf8 ? 'utf-8' : 'windows-1252', {
          fatal: true
        }).decode(bytes);
      } catch (_) {
        throw new Error('A ZIP filename has invalid encoding.');
      }
    };

    const safeName = name => {
      const value = String(name).replace(/\\/g, '/');
      if (!value || value.startsWith('/') ||
          /^[a-z]:/i.test(value) || value.includes('\0')) {
        throw new Error('Unsafe ZIP path: ' + JSON.stringify(name));
      }

      const parts = value.split('/');
      if (parts.some(part =>
        part === '..' || part.includes(':') ||
        /[\x00-\x1f\x7f]/.test(part)
      )) {
        throw new Error('Unsafe ZIP path: ' + JSON.stringify(name));
      }

      const safe = parts.filter(part => part && part !== '.').join('/');
      if (!safe) throw new Error('Empty ZIP entry path.');
      return safe;
    };

    const parse = bytes => {
      if (bytes.length < 22) throw new Error('ZIP file is too small.');

      const view = new DataView(
        bytes.buffer, bytes.byteOffset, bytes.byteLength
      );
      const eocd = findEOCD(bytes);
      const disk = u16(view, eocd + 4);
      const centralDisk = u16(view, eocd + 6);
      const diskCount = u16(view, eocd + 8);
      const count = u16(view, eocd + 10);
      const size = u32(view, eocd + 12);
      const offset = u32(view, eocd + 16);

      if (disk || centralDisk || diskCount !== count) {
        throw new Error('Multi-disk ZIP files are unsupported.');
      }
      if (count === 0xffff || size === 0xffffffff ||
          offset === 0xffffffff) {
        throw new Error('ZIP64 files are unsupported.');
      }
      if (count > MAX_ENTRIES) throw new Error('Too many ZIP entries.');
      if (!hasRange(bytes, offset, size) || offset + size > eocd) {
        throw new Error('Invalid ZIP directory bounds.');
      }

      const entries = [];
      const offsets = new Set();
      let pos = offset;
      const end = offset + size;

      for (let i = 0; i < count; i++) {
        if (pos + 46 > end || u32(view, pos) !== 0x02014b50) {
          throw new Error('Invalid ZIP directory entry.');
        }

        const flags = u16(view, pos + 8);
        const method = u16(view, pos + 10);
        const crc = u32(view, pos + 16);
        const compressedSize = u32(view, pos + 20);
        const uncompressedSize = u32(view, pos + 24);
        const nameLength = u16(view, pos + 28);
        const extraLength = u16(view, pos + 30);
        const commentLength = u16(view, pos + 32);
        const diskStart = u16(view, pos + 34);
        const external = u32(view, pos + 38);
        const localOffset = u32(view, pos + 42);
        const recordLength = 46 + nameLength + extraLength + commentLength;

        if (pos + recordLength > end) {
          throw new Error('Truncated ZIP directory entry.');
        }
        if (diskStart !== 0) throw new Error('Multi-disk entries are unsupported.');
        if (compressedSize === 0xffffffff ||
            uncompressedSize === 0xffffffff ||
            localOffset === 0xffffffff) {
          throw new Error('ZIP64 entries are unsupported.');
        }
        if (offsets.has(localOffset)) {
          throw new Error('ZIP entries share a local header.');
        }
        offsets.add(localOffset);

        if (flags & ((1 << 0) | (1 << 6) | (1 << 13))) {
          throw new Error('Encrypted ZIP entries are unsupported.');
        }
        if (flags & (1 << 5)) throw new Error('Patched ZIP entries are unsupported.');
        if (method !== 0 && method !== 8) {
          throw new Error('Unsupported compression method: ' + method);
        }
        if (method === 0 && compressedSize !== uncompressedSize) {
          throw new Error('Invalid stored-entry size.');
        }

        const nameBytes = bytes.slice(pos + 46, pos + 46 + nameLength);
        const name = decodeName(nameBytes, !!(flags & (1 << 11)));

        entries.push({
          name, flags, method, crc, compressedSize,
          uncompressedSize, localOffset,
          isDirectory: name.endsWith('/') || name.endsWith('\\') ||
            ((external >>> 16) & 0xf000) === 0x4000
        });

        pos += recordLength;
      }

      if (pos !== end) throw new Error('ZIP directory size mismatch.');

      // Reject overlapping local-header/data ranges.
      const ranges = [];
      for (const entry of entries) {
        const o = entry.localOffset;
        if (!hasRange(bytes, o, 30) || u32(view, o) !== 0x04034b50) {
          throw new Error('Invalid local header: ' + entry.name);
        }

        const flags = u16(view, o + 6);
        const method = u16(view, o + 8);
        const nameLength = u16(view, o + 26);
        const extraLength = u16(view, o + 28);

        if (flags !== entry.flags || method !== entry.method) {
          throw new Error('Inconsistent local header: ' + entry.name);
        }
        if (!hasRange(bytes, o + 30, nameLength + extraLength)) {
          throw new Error('Truncated local header.');
        }

        const localName = decodeName(
          bytes.slice(o + 30, o + 30 + nameLength),
          !!(flags & (1 << 11))
        );
        if (localName !== entry.name) {
          throw new Error('ZIP filename mismatch.');
        }

        const dataStart = o + 30 + nameLength + extraLength;
        const dataEnd = dataStart + entry.compressedSize;
        if (!hasRange(bytes, dataStart, entry.compressedSize) ||
            dataEnd > offset) {
          throw new Error('Invalid compressed data bounds: ' + entry.name);
        }

        ranges.push({ start: o, end: dataEnd, name: entry.name });
      }

      ranges.sort((a, b) => a.start - b.start);
      for (let i = 1; i < ranges.length; i++) {
        if (ranges[i].start < ranges[i - 1].end) {
          throw new Error('ZIP entries overlap: ' + ranges[i].name);
        }
      }

      return { entries, view, centralOffset: offset };
    };

    const extractEntry = async (bytes, entry, view) => {
      const offset = entry.localOffset;
      const nameLength = u16(view, offset + 26);
      const extraLength = u16(view, offset + 28);
      const start = offset + 30 + nameLength + extraLength;
      const compressed = bytes.slice(start, start + entry.compressedSize);
      let output;

      if (entry.method === 0) {
        output = compressed;
      } else {
        if (typeof DecompressionStream === 'undefined') {
          throw new Error('DEFLATE is unavailable in this runtime.');
        }

        let stream;
        try {
          stream = new Blob([compressed]).stream()
            .pipeThrough(new DecompressionStream('deflate-raw'));
        } catch (_) {
          throw new Error('Raw DEFLATE is unsupported in this runtime.');
        }

        const reader = stream.getReader();
        const chunks = [];
        let total = 0;

        try {
          while (true) {
            const result = await reader.read();
            if (result.done) break;
            total += result.value.byteLength;

            if (total > MAX_ENTRY_BYTES ||
                total > entry.uncompressedSize) {
              try { await reader.cancel(); } catch (_) {}
              throw new Error('Entry exceeds its decompression limit.');
            }
            chunks.push(result.value);
          }
        } finally {
          try { reader.releaseLock(); } catch (_) {}
        }

        output = new Uint8Array(total);
        let p = 0;
        for (const chunk of chunks) {
          output.set(chunk, p);
          p += chunk.byteLength;
        }
      }

      if (output.byteLength !== entry.uncompressedSize) {
        throw new Error('Size verification failed: ' + entry.name);
      }
      if (crc32(output) !== entry.crc) {
        throw new Error('CRC verification failed: ' + entry.name);
      }
      return output;
    };

    const existsAsFile = async path => {
      // Only report a collision when the API can positively confirm it.
      // Some cloud APIs throw for both missing files and other failures.
      if (typeof api.fileExists === 'function') {
        return !!(await api.fileExists(path));
      }
      return null;
    };

    await log('Reading ZIP: ' + source, '#7db7ff');
    const bytes = await readBytes(source);

    if (bytes.byteLength > MAX_ARCHIVE_BYTES) {
      throw new Error('ZIP exceeds the ' + (MAX_ARCHIVE_BYTES / (1024 * 1024)) + ' MiB archive limit.');
    }

    const { entries, view } = parse(bytes);
    if (!entries.length) throw new Error('ZIP contains no entries.');

    const seen = new Map();
    const plans = [];
    let total = 0;

    for (const entry of entries) {
      const name = safeName(entry.name);
      const key = name.toLowerCase();

      if (seen.has(key)) {
        throw new Error('Duplicate ZIP path: ' + name);
      }
      seen.set(key, entry.isDirectory ? 'dir' : 'file');

      if (entry.uncompressedSize > MAX_ENTRY_BYTES) {
        throw new Error('Entry exceeds the ' + (MAX_ENTRY_BYTES / (1024 * 1024)) + ' MiB limit: ' + name);
      }

      total += entry.uncompressedSize;
      if (total > MAX_TOTAL_BYTES) {
        throw new Error('ZIP exceeds the ' + (MAX_TOTAL_BYTES / (1024 * 1024)) + ' MiB total extraction limit.');
      }

      plans.push({
        entry,
        name,
        target: join(outputDir, name)
      });
    }

    // Detect a regular file used as a parent directory.
    for (const item of plans) {
      const parts = item.name.split('/');
      for (let i = 1; i < parts.length; i++) {
        const parent = parts.slice(0, i).join('/').toLowerCase();
        if (seen.get(parent) === 'file') {
          throw new Error('File/directory conflict: ' + parts.slice(0, i).join('/'));
        }
      }
      if (!item.entry.isDirectory) {
        const prefix = item.name.toLowerCase() + '/';
        if (Array.from(seen.keys()).some(k => k.startsWith(prefix))) {
          throw new Error('File/directory conflict: ' + item.name);
        }
      }
    }

    // Validate all entries and CRCs before writing anything.
    if (bytes.byteLength > MAX_ARCHIVE_BYTES) {
      throw new Error('ZIP exceeds the ' + (MAX_ARCHIVE_BYTES / (1024 * 1024)) + ' MiB archive limit.');
    }

    const validated = [];
    let completed = 0;

    for (const item of plans) {
      if (item.entry.isDirectory) {
        validated.push({ ...item, data: null });
      } else {
        const data = await extractEntry(bytes, item.entry, view);
        validated.push({ ...item, data });
      }

      completed++;
      if (completed % 25 === 0 || completed === plans.length) {
        await log(
          'Validated ' + completed + '/' + plans.length + ' ZIP entries',
          '#7db7ff'
        );
      }
    }

    // Detect pre-existing file collisions when the API supports it.
    if (typeof api.fileExists === 'function') {
      for (const item of validated) {
        if (item.entry.isDirectory) continue;
        if (await existsAsFile(item.target)) {
          throw new Error('Destination file already exists: ' + item.target);
        }
      }
    } else {
      await log(
        'Note: fileExists() is unavailable; overwrite checks cannot be guaranteed.',
        '#e6b450'
      );
    }

    await ensureFolder(outputDir);

    // Write only after archive validation succeeds.
    let written = 0;
    for (const item of validated) {
      if (item.entry.isDirectory) {
        await ensureFolder(item.target);
      } else {
        await ensureFolder(dirname(item.target));
        await api.writeFile(item.target, item.data, { replace: false });
      }

      written++;
      if (written % 25 === 0 || written === validated.length) {
        await log(
          'Extracted ' + written + '/' + validated.length + ' ZIP entries',
          '#7db7ff'
        );
      }
    }

    await log(
      'Success: extracted ' + written + ' entries into ' + outputDir,
      '#3ddc97'
    );
  } catch (err) {
    const message = String(err?.message || err || 'Unknown error');
    await log('ZIP extraction failed: ' + message, '#b20a0a');
  } finally {
    try { self.close(); } catch (_) {}
  }
})();
