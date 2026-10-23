(async () => {
  try {
    const print = (msg) => {
      try { self.api.writeline(String(msg || ''), undefined, '#3ddc97'); } catch (e) {}
    };

    print('Text Editor help');
    print('writefile path=/path');
    print('What it does: opens or creates a file and lets you edit its contents inline.');
    print('Args:');
    print('  path/file/source - required file path to open or create. Relative paths use the current working directory.');
    print('Examples:');
    print('  Text Editor writefile path=/example.txt');
    print('  Text Editor writefile file=/example.txt');
    print('Notes: if the file does not exist, it is created as an empty file before editing.');
  } catch (err) {
    try { self.api.writeline('help command error: ' + String(err && err.message ? err.message : err), undefined, '#3ddc97'); } catch (e) {}
  } finally {
    try { self.close(); } catch (e) {}
  }
})();
