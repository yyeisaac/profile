const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT || 4173);
const root = __dirname;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  const safePath = path.normalize(urlPath).replace(/^\.\.(\/|\\|$)+/, '');
  let filePath = path.join(root, safePath);

  if (urlPath === '/' || urlPath === '') {
    filePath = path.join(root, 'index.html');
  }

  fs.stat(filePath, (statErr, stats) => {
    if (statErr || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const size = stats.size;
    const range = req.headers.range;

    // ── Range request: serve partial content so <video>/<audio> can seek ──
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      let start = match && match[1] !== '' ? Number(match[1]) : 0;
      let end   = match && match[2] !== '' ? Number(match[2]) : size - 1;

      if (
        !match ||
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start > end ||
        end >= size
      ) {
        res.writeHead(416, {
          'Content-Range': `bytes */${size}`,
          'Content-Type': 'text/plain; charset=utf-8',
        });
        res.end('Range Not Satisfiable');
        return;
      }

      res.writeHead(206, {
        'Content-Type': contentType,
        'Content-Length': end - start + 1,
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      });

      const stream = fs.createReadStream(filePath, { start, end });
      stream.on('error', () => {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        }
        res.end('Stream error');
      });
      stream.pipe(res);
      return;
    }

    // ── Full file ────────────────────────────────────────────────────────
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': size,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Portfolio landing page available at http://localhost:${port}`);
});
