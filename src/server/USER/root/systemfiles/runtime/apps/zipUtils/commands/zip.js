
(async () => {
  try {
    const rawArgs = self._startArgs;
    const positional = Array.isArray(rawArgs) ? rawArgs : [];
    const named =
      rawArgs && typeof rawArgs === 'object' && !Array.isArray(rawArgs)
        ? rawArgs
        : {};

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
      named.d,
      positional[1]
    );

    const normalizeCloudPath = (value) => {
      const parts = [];
      for (const part of String(value ?? '/').replace(/\\/g, '/').split('/')) {
        if (!part || part === '.') continue;
        if (part === '..') {
          if (parts.length) parts.pop();
        } else {
          parts.push(part);
        }
      }
      return '/' + parts.join('/');
    };

    const joinPath = (...parts) =>
      normalizeCloudPath(parts.filter(Boolean).join('/'));

    const basename = (path) =>
      String(path).split('/').filter(Boolean).pop() || '';

    const dirname = (path) => {
      const parts = String(path).split('/').filter(Boolean);
      parts.pop();
      return '/' + parts.join('/');
    };

    const cwdInfo =
      typeof self.api.cwd === 'function'
        ? await self.api.cwd()
        : { full: '/' };

    const cwd = normalizeCloudPath(cwdInfo?.full || '/');

    const resolvePath = (value, fallback) => {
      const raw = String(value ?? '').trim() || fallback;
      if (raw.startsWith('/')) return normalizeCloudPath(raw);
      return joinPath(cwd, raw);
    };

    const readAsArrayBuffer = async (path) => {
      const result = await self.api.readFile(path, {
        buffer: true,
        direct: true
      });

      if (result && typeof result === 'object' &&
          result.fileContent !== undefined) {
        return result.fileContent;
      }

      return result;
    };

    const writeBinaryFile = async (path, bytes) => {
      await self.api.writeFile(path, bytes, { replace: true });
    };

    const ensureFolder = async (path) => {
      const normalized = normalizeCloudPath(path);
      if (normalized === '/') return;

      let current = '';
      for (const part of normalized.split('/').filter(Boolean)) {
        current += '/' + part;
        if (!(await self.api.folderExists(current))) {
          await self.api.writeFolder(current);
        }
      }
    };

    const textBytes = (text) => new TextEncoder().encode(text);

    const concatBytes = (...arrays) => {
      const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
      const output = new Uint8Array(total);
      let offset = 0;

      for (const arr of arrays) {
        output.set(arr, offset);
        offset += arr.length;
      }

      return output;
    };

    const u16 = (value) => {
      const bytes = new Uint8Array(2);
      new DataView(bytes.buffer).setUint16(0, value, true);
      return bytes;
    };

    const u32 = (value) => {
      const bytes = new Uint8Array(4);
      new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
      return bytes;
    };

    // Browser-managed DEFLATE compression.
    // If raw DEFLATE is unavailable, safely store the file instead.
    const compressBuffer = async (input) => {
      const bytes = input instanceof Uint8Array
        ? input
        : new Uint8Array(input || []);

      if (!bytes.length || typeof CompressionStream === 'undefined') {
        return { method: 0, bytes };
      }

      try {
        const stream = new Blob([bytes])
          .stream()
          .pipeThrough(new CompressionStream('deflate-raw'));

        const compressed = new Uint8Array(
          await new Response(stream).arrayBuffer()
        );

        if (compressed.length < bytes.length) {
          return { method: 8, bytes: compressed };
        }
      } catch (_) {
        // Unsupported format or compression failure: use ZIP Store.
      }

      return { method: 0, bytes };
    };

    const crc32Table = new Uint32Array(256);

    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1)
          ? (0xedb88320 ^ (c >>> 1))
          : (c >>> 1);
      }
      crc32Table[i] = c >>> 0;
    }

    const crc32 = (bytes) => {
      let crc = 0xffffffff;

      for (let i = 0; i < bytes.length; i++) {
        crc = (
          crc32Table[(crc ^ bytes[i]) & 0xff] ^
          (crc >>> 8)
        ) >>> 0;
      }

      return (crc ^ 0xffffffff) >>> 0;
    };

    // Set the UTF-8 filename flag for ZIP compatibility.
    const UTF8_FLAG = 0x0800;

    const createLocalHeader = (
      nameBytes, crc, compressedSize, originalSize, method
    ) => concatBytes(
      u32(0x04034b50),
      u16(20),
      u16(UTF8_FLAG),
      u16(method),
      u16(0),
      u16(0),
      u32(crc),
      u32(compressedSize),
      u32(originalSize),
      u16(nameBytes.length),
      u16(0),
      nameBytes
    );

    const createCentralHeader = (
      nameBytes, crc, compressedSize, originalSize, offset, method
    ) => concatBytes(
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(UTF8_FLAG),
      u16(method),
      u16(0),
      u16(0),
      u32(crc),
      u32(compressedSize),
      u32(originalSize),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes
    );

    const createEndRecord = (count, centralSize, centralOffset) =>
      concatBytes(
        u32(0x06054b50),
        u16(0),
        u16(0),
        u16(count),
        u16(count),
        u32(centralSize),
        u32(centralOffset),
        u16(0)
      );

    const collectFolderEntries = async (folderPath, relative = '') => {
      const results = [];
      const entries = await self.api.readFolder(folderPath, {
        detail: true
      });

      for (const entry of entries) {
        const name = entry.name ||
          basename(entry.path || '');

        if (!name) continue;

        const childPath = joinPath(folderPath, name);
        const archivePath = relative
          ? joinPath(relative, name).slice(1)
          : name;

        const isDirectory =
          entry.type === 'folder' ||
          entry.type === 'directory';

        if (isDirectory) {
          results.push({
            type: 'directory',
            name: archivePath + '/'
          });

          results.push(
            ...await collectFolderEntries(childPath, archivePath)
          );
        } else {
          results.push({
            type: 'file',
            name: archivePath,
            path: childPath
          });
        }
      }

      return results;
    };

    const buildZipFromSource = async (source, destination) => {
      const sourceIsFolder = await self.api.folderExists(source);
      const sourceIsFile = await self.api.fileExists(source);

      if (!sourceIsFile && !sourceIsFolder) {
        throw new Error('Source does not exist: ' + source);
      }

      const baseName = basename(source);
      let outputPath = destination;

      if (outputPath.endsWith('/')) {
        outputPath = joinPath(
          outputPath,
          (baseName || 'archive') + '.zip'
        );
      } else if (!outputPath.toLowerCase().endsWith('.zip')) {
        if (
          await self.api.folderExists(outputPath) ||
          outputPath === '/'
        ) {
          outputPath = joinPath(
            outputPath,
            (baseName || 'archive') + '.zip'
          );
        } else {
          outputPath += '.zip';
        }
      }

      const entries = [];

      if (sourceIsFolder) {
        const files = await collectFolderEntries(source);

        for (const entry of files) {
          if (entry.type === 'directory') {
            entries.push({
              name: entry.name,
              data: new Uint8Array(0)
            });
          } else {
            const buffer = await readAsArrayBuffer(entry.path);
            entries.push({
              name: entry.name,
              data: new Uint8Array(buffer)
            });
          }
        }
      } else {
        const buffer = await readAsArrayBuffer(source);

        entries.push({
          name: baseName,
          data: new Uint8Array(buffer)
        });
      }

      if (!entries.length) {
        throw new Error('Nothing to archive.');
      }

      if (entries.length > 65535) {
        throw new Error(
          'Too many entries for a standard ZIP archive.'
        );
      }

      const localParts = [];
      const centralParts = [];
      let offset = 0;

      for (const entry of entries) {
        const nameBytes = textBytes(entry.name);
        const rawData = entry.data || new Uint8Array(0);

        const compressed = await compressBuffer(rawData);
        const checksum = crc32(rawData);

        const localHeader = createLocalHeader(
          nameBytes,
          checksum,
          compressed.bytes.length,
          rawData.length,
          compressed.method
        );

        const centralHeader = createCentralHeader(
          nameBytes,
          checksum,
          compressed.bytes.length,
          rawData.length,
          offset,
          compressed.method
        );

        localParts.push(localHeader, compressed.bytes);
        centralParts.push(centralHeader);

        offset += localHeader.length + compressed.bytes.length;
      }

      const centralDirectory = concatBytes(...centralParts);
      const endRecord = createEndRecord(
        centralParts.length,
        centralDirectory.length,
        offset
      );

      const zipBytes = concatBytes(
        ...localParts,
        centralDirectory,
        endRecord
      );

      await writeBinaryFile(outputPath, zipBytes);
      return outputPath;
    };

    if (!sourceArg) {
      throw new Error('zip: missing source path');
    }

    const sourcePath = resolvePath(sourceArg, cwd);
    const destinationPath = resolvePath(
      destArg,
      cwd
    );

    await ensureFolder(dirname(destinationPath));

    const archivePath = await buildZipFromSource(
      sourcePath,
      destinationPath
    );

    await self.api.writeline(
      'Created ' + archivePath,
      undefined,
      '#3ddc97'
    );

    self.close();
  } catch (err) {
    try {
      await self.api.writeline(
        'zip error: ' +
          String(err?.message || err),
        undefined,
        '#b20a0a'
      );
    } catch (_) {}

    try {
      self.close();
    } catch (_) {}
  }
})();
