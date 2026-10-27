(async () => {
  try {
    const print = (msg) => {
      try { self.api.writeline(String(msg || ''), undefined, '#3ddc97'); } catch (e) {}
    };

    print('ZIP Utility help');
    print('zip src=/path [dest=/path]');
    print('unzip src=/path [dest=/path]');
    print('zip: creates a ZIP archive from a file or folder.');
    print('unzip: extracts a ZIP archive into a destination folder.');
    print('Args for zip:');
    print('  src/source/path/file - file or folder to archive. If omitted, it uses the current working directory.');
    print('  dest/destination - output zip path or target folder. If omitted, it uses the current working directory.');
    print('Args for unzip:');
    print('  src/source/path/file - ZIP file to extract. If omitted, it uses the current working directory.');
    print('  dest/destination - folder to extract into. If omitted, it uses the current working directory.');
    print('Aliases supported: src, source, path, file, target, dest, destination, compression');
    print('Examples:');
    print('  zipUtility zip src=/folder dest=/archive.zip');
    print('  zipUtility unzip src=/archive.zip dest=/extract');
  } catch (err) {
    try { self.api.writeline('help command error: ' + String(err && err.message ? err.message : err), undefined, '#3ddc97'); } catch (e) {}
  } finally {
    try { self.close(); } catch (e) {}
  }
})();
