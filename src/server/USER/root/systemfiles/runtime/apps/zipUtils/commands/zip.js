(async () => {
  try {
    const rawArgs = (self._startArgs && typeof self._startArgs === 'object') ? self._startArgs : (Array.isArray(self._startArgs) ? self._startArgs : []);
    const positional = Array.isArray(rawArgs) ? rawArgs.slice() : [];
    const named = (rawArgs && typeof rawArgs === 'object' && !Array.isArray(rawArgs)) ? rawArgs : {};

    const firstNonEmpty = (...values) => {
      for (const value of values) {
        if (value === undefined || value === null) continue;
        const text = String(value).trim();
        if (text) return text;
      }
      return '';
    };

    const sourceArg = firstNonEmpty(
      named.src,
      named.source,
      named.path,
      named.file,
      named.target,
      named.s,
      positional[0]
    );

    const destArg = firstNonEmpty(
      named.dest,
      named.destination,
      named.path,
      named.target,
      named.d,
      positional[1]
    );

    const levelArg = firstNonEmpty(
      named.lv,
      named.level,
      named.l,
      named.compression,
      named.compressionLevel,
      positional[2]
    );

    const normalizeCloudPath = (pathValue) => {
      if (pathValue === undefined || pathValue === null) return '/';
      const value = String(pathValue).replace(/\\/g, '/').trim();
      if (!value) return '/';
      const parts = [];
      for (const part of value.split('/')) {
        if (!part || part === '.') continue;
        if (part === '..') {
          if (parts.length) parts.pop();
          continue;
        }
        parts.push(part);
      }
      return '/' + parts.join('/');
    };

    const joinAndNormalize = (base, rel) => {
      try {
        const baseNorm = normalizeCloudPath(base || '/');
        const baseParts = baseNorm === '/' ? [] : baseNorm.slice(1).split('/');
        const relParts = String(rel || '').replace(/\\/g, '/').split('/');
        const out = baseParts.slice();
        for (const part of relParts) {
          if (!part || part === '.') continue;
          if (part === '..') {
            if (out.length) out.pop();
            continue;
          }
          out.push(part);
        }
        return '/' + out.join('/');
      } catch (e) {
        return normalizeCloudPath(rel.startsWith('/') ? rel : '/' + rel);
      }
    };

    const parseCompressionLevel = (value) => {
      const number = Number(value);
      if (!Number.isFinite(number) || !Number.isInteger(number)) return 0;
      return (number >= 0 && number <= 9) ? number : 0;
    };

    const compressBuffer = async (payload, level) => {
      const targetLevel = parseCompressionLevel(level);
      if (!payload || payload.length === 0 || targetLevel === 0) {
        return { method: 0, bytes: new Uint8Array(payload || []) };
      }
      if (!('CompressionStream' in self)) {
        return { method: 0, bytes: new Uint8Array(payload || []) };
      }
      try {
        const stream = new Blob([payload]).stream().pipeThrough(new CompressionStream('deflate-raw'));
        const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
        return { method: 8, bytes: compressed };
      } catch (e) {
        return { method: 0, bytes: new Uint8Array(payload || []) };
      }
    };

    const cwdInfo = (typeof self.api.cwd === 'function') ? await self.api.cwd() : { full: '/' };
    const cwd = String((cwdInfo && cwdInfo.full) ? cwdInfo.full : '/');

    const resolvePath = (value, fallback) => {
      const raw = String(value ?? '').trim();
      const target = raw || fallback;
      const normalized = normalizeCloudPath(target);
      if (target.startsWith('/')) return normalized;
      return joinAndNormalize(cwd, target);
    };

    const basename = (pathValue) => String(pathValue || '').split('/').filter(Boolean).pop() || '';
    const dirname = (pathValue) => {
      const parts = String(pathValue || '').split('/').filter(Boolean);
      parts.pop();
      return '/' + parts.join('/');
    };
    const joinPath = (...parts) => {
      const filtered = parts.filter((part) => part !== undefined && part !== null && String(part) !== '');
      return '/' + filtered.map((part) => String(part).replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/');
    };

    const readAsArrayBuffer = async (path) => {
      const result = await self.api.readFile(path, { buffer: true, direct: true });
      if (result && typeof result === 'object' && typeof result.fileContent !== 'undefined') {
        return result.fileContent;
      }
      if (result instanceof ArrayBuffer) return result;
      return result;
    };

    const ensureFolder = async (path) => {
      if (!path || path === '/') return true;
      const normalized = normalizeCloudPath(path);
      const parts = normalized.split('/').filter(Boolean);
      let current = '';
      for (const part of parts) {
        current = joinPath(current, part);
        const exists = await self.api.folderExists(current);
        if (!exists) {
          await self.api.writeFolder(current);
        }
      }
      return true;
    };

    const writeBinaryFile = async (path, bytes) => {
      await self.api.writeFile(path, bytes, { replace: true });
    };

    const u16 = (value) => {
      const b = new Uint8Array(2);
      const view = new DataView(b.buffer);
      view.setUint16(0, value >>> 0, true);
      return b;
    };

    const u32 = (value) => {
      const b = new Uint8Array(4);
      const view = new DataView(b.buffer);
      view.setUint32(0, value >>> 0, true);
      return b;
    };

    const concatBytes = (...arrays) => {
      let total = 0;
      for (const array of arrays) total += array.length;
      const out = new Uint8Array(total);
      let offset = 0;
      for (const array of arrays) {
        out.set(array, offset);
        offset += array.length;
      }
      return out;
    };

    const textBytes = (text) => new TextEncoder().encode(text);

    const crc32Table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crc32Table[i] = c >>> 0;
    }
    const crc32 = (bytes) => {
      let crc = 0xffffffff;
      for (let i = 0; i < bytes.length; i++) {
        crc = (crc32Table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
      }
      return (crc ^ 0xffffffff) >>> 0;
    };

    const createLocalHeader = (nameBytes, crc, compressedSize, uncompressedSize, method) => concatBytes(
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(method || 0),
      u16(0),
      u16(0),
      u32(crc),
      u32(compressedSize),
      u32(uncompressedSize),
      u16(nameBytes.length),
      u16(0),
      nameBytes
    );

    const createCentralHeader = (nameBytes, crc, compressedSize, uncompressedSize, offset, method) => concatBytes(
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(method || 0),
      u16(0),
      u16(0),
      u32(crc),
      u32(compressedSize),
      u32(uncompressedSize),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes
    );

    const createEndRecord = (entryCount, centralSize, centralOffset) => concatBytes(
      u32(0x06054b50),
      u16(0),
      u16(0),
      u16(entryCount),
      u16(entryCount),
      u32(centralSize),
      u32(centralOffset),
      u16(0)
    );

    const collectFolderEntries = async (folderPath, relativePath = '') => {
      const results = [];
      const entries = await self.api.readFolder(folderPath, { detail: true });
      for (const entry of entries) {
        const name = entry.name || entry.path.split('/').filter(Boolean).pop();
        if (!name) continue;
        const childPath = joinPath(folderPath, name);
        const archivePath = relativePath ? joinPath(relativePath, name) : name;
        const isDirectory = entry.type === 'folder' || entry.type === 'directory';
        if (isDirectory) {
          results.push({ type: 'directory', name: archivePath + '/', path: childPath });
          const nested = await collectFolderEntries(childPath, archivePath);
          results.push(...nested);
          continue;
        }
        results.push({ type: 'file', name: archivePath, path: childPath });
      }
      return results;
    };

    const buildZipFromSource = async (source, destination) => {
      const sourceIsFolder = await self.api.folderExists(source);
      const sourceIsFile = await self.api.fileExists(source);
      if (!sourceIsFile && !sourceIsFolder) {
        throw new Error(`Source does not exist: ${source}`);
      }

      const baseName = basename(source);
      let resolvedDestination = destination;
      if (resolvedDestination.endsWith('/')) {
        resolvedDestination = joinPath(resolvedDestination, (baseName || 'archive') + '.zip');
      }
      if (!resolvedDestination.toLowerCase().endsWith('.zip')) {
        const folderExists = await self.api.folderExists(resolvedDestination);
        if (folderExists || resolvedDestination === '/' || String(resolvedDestination).endsWith('/')) {
          resolvedDestination = joinPath(resolvedDestination, (baseName || 'archive') + '.zip');
        } else {
          resolvedDestination = resolvedDestination + '.zip';
        }
      }

      const entries = [];
      if (sourceIsFolder) {
        const folderEntries = await collectFolderEntries(source, '');
        for (const entry of folderEntries) {
          if (entry.type === 'directory') {
            entries.push({ name: entry.name, data: new Uint8Array(0), isDirectory: true });
            continue;
          }
          const fileBuffer = await readAsArrayBuffer(entry.path);
          entries.push({ name: entry.name, data: new Uint8Array(fileBuffer), isDirectory: false });
        }
      } else {
        const fileBuffer = await readAsArrayBuffer(source);
        entries.push({ name: basename(source), data: new Uint8Array(fileBuffer), isDirectory: false });
      }

      if (!entries.length) {
        throw new Error('Nothing to archive.');
      }

      const localParts = [];
      const centralParts = [];
      let offset = 0;
      for (const entry of entries) {
        const nameBytes = textBytes(entry.name);
        const rawData = entry.data || new Uint8Array(0);
        const compressed = await compressBuffer(rawData, levelArg);
        const checksum = crc32(rawData);
        const localHeader = createLocalHeader(nameBytes, checksum, compressed.bytes.length, rawData.length, compressed.method);
        const centralHeader = createCentralHeader(nameBytes, checksum, compressed.bytes.length, rawData.length, offset, compressed.method);
        localParts.push(localHeader, compressed.bytes);
        centralParts.push(centralHeader);
        offset += localHeader.length + compressed.bytes.length;
      }
      const centralDirectory = concatBytes(...centralParts);
      const endRecord = createEndRecord(centralParts.length, centralDirectory.length, offset);
      const zipBytes = concatBytes(...localParts, centralDirectory, endRecord);
      await writeBinaryFile(resolvedDestination, zipBytes);
      return resolvedDestination;
    };

    if (!sourceArg) {
      throw new Error('zip: missing source path');
    }

    const sourcePath = resolvePath(sourceArg, cwd);
    const destinationPath = resolvePath(destArg, cwd);
    const compressionLevel = parseCompressionLevel(levelArg);
    const destinationParent = destinationPath;
    await ensureFolder(destinationParent === '/' ? '/' : dirname(destinationParent));
    const archivePath = await buildZipFromSource(sourcePath, destinationPath);
    await self.api.writeline(`Created ${archivePath} (level ${compressionLevel})`, undefined, '#3ddc97');
    self.close();
  } catch (err) {
    try {
      await self.api.writeline('zip error: ' + String(err && err.message ? err.message : err), undefined, '#b20a0a');
    } catch (e) {}
    try {
      self.close();
    } catch (e) {}
  }
})();
