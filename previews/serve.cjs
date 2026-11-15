const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const files = new Map([
  ['/previews/retro-flip.html', 'text/html; charset=utf-8'],
  ['/previews/barlow-semi-condensed-700.ttf', 'font/ttf'],
  ['/app/index.html', 'text/html; charset=utf-8'],
  ['/app/lcd.js', 'text/javascript'],
  ['/app/manifest.json', 'application/manifest+json'],
  ['/app/flip.wav', 'audio/wav'],
  ['/app/flip-hour.wav', 'audio/wav'],
  ['/desktop/widget-frame.css', 'text/css'],
]);
for (const name of fs.readdirSync(path.join(__dirname, '../app/fonts'))) {
  if (name.endsWith('.ttf')) files.set('/app/fonts/' + name, 'font/ttf');
  if (name.endsWith('.woff2')) files.set('/app/fonts/' + name, 'font/woff2');
}

http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const type = files.get(pathname);
  const file = path.join(__dirname, '..', pathname);
  if (!type || !fs.existsSync(file)) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(response);
}).listen(8793, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8793/previews/retro-flip.html');
});
