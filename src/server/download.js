const http = require('http');
const https = require('https');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { withUserLock, finalizeDownloadWithQuota } = require('./quotaFs');
function getUserShard(username) {
  return crypto
    .createHash('sha256')
    .update(String(username))
    .digest('hex')
    .slice(0, 3);
}

function getUserDir(username) {
  return path.join(directoryPath, getUserShard(username), username);
}
let directoryPath = path.resolve(__dirname, './zmcdfiles');
if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath, { recursive: true });

const MAX_JSON_BODY = 10 * 1024 * 1024; // 10MB

// Authenticate user against <directoryPath>/<username>/<username>.txt using a Bearer token.
async function authenticateUser(username, authHeader) {
  try {
    if (!username) return false;
    const userDir = getUserDir(username);
    const userFile = path.join(userDir, `${username}.txt`);

    const txt = await fsp.readFile(userFile, 'utf8');
    const obj = JSON.parse(txt);
    if (!obj) return false;

    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const now = Date.now();
      const expires = Number(obj.authTokenExpires);

      if (typeof obj.authToken === 'string' && obj.authToken === token) {
        return Number.isFinite(expires) ? expires > now : false;
      }

      return false;
    }

    return false;
  } catch (e) {
    return false;
  }
}

// Keep a naming strategy similar to fetchfiles to avoid collisions
async function getUniquePath(destPath) {
  const dir = path.dirname(destPath);
  const ext = path.extname(destPath);
  let base = path.basename(destPath, ext);

  const leadMatch = base.match(/^\((\d+)\)\s*(.*)$/);
  if (leadMatch) base = leadMatch[2] || '';
  const compareName = base + ext;

  let entries = [];
  try { entries = await fsp.readdir(dir); } catch (e) { return path.join(dir, compareName); }

  let found = false;
  let maxNum = -Infinity;
  for (const name of entries) {
    if (name === compareName) { found = true; maxNum = Math.max(maxNum, 0); continue; }
    const m = name.match(/^\((\d+)\)\s*(.*)$/);
    if (m && m[2] === compareName) {
      found = true;
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
    }
  }

  if (!found) return path.join(dir, compareName);
  const newName = `(${maxNum + 1}) ${base}${ext}`;
  return path.join(dir, newName);
}

function respondJSON(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}

async function handleDownload(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method !== 'POST') {
    return respondJSON(res, 405, { error: 'Use POST' });
  }

  let body = '';
  let total = 0;
  let bodyTooLarge = false;

  req.on('data', (c) => {
    total += c.length;
    if (total > MAX_JSON_BODY) {
      bodyTooLarge = true;
      req.destroy();
      return;
    }
    body += c;
  });

  req.on('end', async () => {
    if (bodyTooLarge) {
      return respondJSON(res, 413, { error: 'Request body too large' });
    }

    let payload;
    try { payload = JSON.parse(body); } catch (e) { return respondJSON(res, 400, { error: 'Invalid JSON' }); }

    console.log('[download] request payload received');

    const username = payload.username;
    const data = payload.data || {};

    if (!username) return respondJSON(res, 400, { error: 'missing username' });
    if (!data.href) return respondJSON(res, 400, { error: 'missing data.href' });
    if (typeof username !== 'string' ||
        !/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
      return respondJSON(res, 400, { error: 'invalid username' });
    }
    console.log('[download] username=', username, 'href=', data.href);

    const authHeader = req.headers && (req.headers.authorization || req.headers.Authorization) || '';
    if (!(await authenticateUser(username, authHeader))) {
      console.log('download auth failed for', username);
      return respondJSON(res, 401, { error: 'unauthorized' });
    }

    console.log('[download] authenticated', username);

    // Echo the validated Bearer token back in the download response.
    const tokenToReturn = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    try {
      const userRoot = path.join(getUserDir(username), 'root');
      await fsp.mkdir(userRoot, { recursive: true });
      const downloadsDir = path.join(userRoot, 'downloads');
      await fsp.mkdir(downloadsDir, { recursive: true });

      // determine filename
      let filename = data.filename || '';
      try {
        if (!filename) {
          const u = new URL(data.href);
          filename = path.basename(u.pathname) || 'download';
        }
      } catch (e) {
        filename = filename || 'download';
      }

      let destCandidate = path.join(downloadsDir, filename);
      destCandidate = await getUniquePath(destCandidate);

      // fetch remote resource and stream to file with redirect handling
      const tmpPath = destCandidate + '.part';

      let responded = false;
      function safeRespond(code, obj) {
        if (responded) return;
        responded = true;
        respondJSON(res, code, obj);
      }

      const MAX_REDIRECTS = 5;

      function fetchToFile(urlStr, redirectsLeft = MAX_REDIRECTS) {
        try {
          console.log('[download] fetchToFile start', urlStr, 'redirectsLeft=', redirectsLeft);
          const u = new URL(urlStr);
          const client = u.protocol === 'https:' ? https : http;

          const req = client.get(u.href, (resp) => {
            // handle redirects
            if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
              console.log('[download] redirect', resp.statusCode, '->', resp.headers.location);
              if (redirectsLeft <= 0) {
                fs.unlink(tmpPath, () => {});
                return safeRespond(502, { error: 'Too many redirects' });
              }
              // follow relative or absolute location
              const next = new URL(resp.headers.location, u).toString();
              resp.resume();
              return fetchToFile(next, redirectsLeft - 1);
            }

            if (resp.statusCode < 200 || resp.statusCode >= 300) {
              console.log('[download] bad remote status', resp.statusCode);
              resp.resume();
              fs.unlink(tmpPath, () => {});
              return safeRespond(502, { error: 'Bad response from remote', statusCode: resp.statusCode });
            }

            const fileStream = fs.createWriteStream(tmpPath);

            resp.pipe(fileStream);

            resp.on('error', (err) => {
              fileStream.destroy();
              fs.unlink(tmpPath, () => {});
              console.error('response stream error', err);
              return safeRespond(500, { error: 'response stream error', message: String(err) });
            });

            fileStream.on('error', (err) => {
              fileStream.destroy();
              resp.resume();
              fs.unlink(tmpPath, () => {});
              console.error('file write error', err);
              return safeRespond(500, { error: 'file write error', message: String(err) });
            });

            fileStream.on('finish', async () => {
              try {
                console.log('[download] fileStream finished for', urlStr);

                await withUserLock(username, () => finalizeDownloadWithQuota(username, userRoot, tmpPath, destCandidate));
                const relPath = path.relative(userRoot, destCandidate).replace(/\\/g, '/');
                const resp = { success: true, path: relPath };
                if (tokenToReturn) {
                  resp.authToken = tokenToReturn;
                  resp.token = tokenToReturn;
                }
                return safeRespond(200, resp);
              } catch (e) {
                console.error('finalize error', e);
                return safeRespond(500, { error: 'finalize error', message: String(e) });
              }
            });
          });

          req.on('error', (err) => {
            fs.unlink(tmpPath, () => {});
            console.error('request error', err);
            return safeRespond(500, { error: 'request error', message: String(err) });
          });

          // timeout to avoid hanging
          req.setTimeout(30000, () => {
            req.abort();
          });
        } catch (e) {
          fs.unlink(tmpPath, () => {});
          console.error('fetchToFile error', e);
          return safeRespond(500, { error: 'fetchToFile error', message: String(e) });
        }
      }

      // start
      fetchToFile(data.href);

    } catch (err) {
      console.error('download handler error', err);
      return respondJSON(res, 500, { error: err.message });
    }
  });
}

module.exports = { handleDownload };
