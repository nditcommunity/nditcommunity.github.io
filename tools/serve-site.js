const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const outputRoot = path.resolve(__dirname, '..', '_site');
const port = Number(process.env.PORT ?? 8081);
const host = '127.0.0.1';
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
};

const findFile = (pathname) => {
  const relativePath = decodeURIComponent(pathname).replace(/^\/+/, '');
  const requestedPath = path.resolve(outputRoot, relativePath);

  if (requestedPath !== outputRoot && !requestedPath.startsWith(`${outputRoot}${path.sep}`)) {
    return null;
  }

  const candidates = [
    requestedPath,
    path.join(requestedPath, 'index.html'),
    path.join(outputRoot, `${relativePath}.html`),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
};

const server = http.createServer((request, response) => {
  let pathname;

  try {
    pathname = new URL(request.url, `http://${request.headers.host ?? host}`).pathname;
  } catch {
    response.writeHead(400);
    response.end('Bad request');
    return;
  }

  const requestedFile = findFile(pathname);
  const file = requestedFile ?? path.join(outputRoot, '404.html');
  const status = requestedFile ? 200 : 404;
  const contentType = contentTypes[path.extname(file).toLowerCase()] ?? 'application/octet-stream';

  response.writeHead(status, {
    'content-type': contentType,
    'x-content-type-options': 'nosniff',
  });

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  fs.createReadStream(file).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Serving _site at http://${host}:${port}`);
});
