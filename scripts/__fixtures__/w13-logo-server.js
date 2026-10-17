/* Lille statisk server til logotests (kun 127.0.0.1, egen port). Leverer filer fra en rodmappe, virtuelle sider (/t/<navn>.html)
   og placeholder-SVG'erne under /img/brands/ med et styrbart svar: 'ok' | 'langsom' (600 ms) | '404' | 'html' (200, men en HTML-side i stedet for SVG).
   mask-image kræver samme oprindelse (CORS) — derfor en rigtig server og ikke file://. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const H = require('./w13-logo-hjaelp.js');

const TYPER = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };

function start(rodSti, virtuelle){
  const rod = path.resolve(rodSti);
  const tilstand = { svg: 'ok', forespoergsler: [] };
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const p = decodeURIComponent(u.pathname);
    tilstand.forespoergsler.push(p);
    const virt = /^\/t-([a-z0-9-]+)\.html$/.exec(p);
    if (virt && virtuelle && virtuelle[virt[1]]){
      res.writeHead(200, { 'content-type': TYPER['.html'] });
      return res.end(typeof virtuelle[virt[1]] === 'function' ? virtuelle[virt[1]]() : virtuelle[virt[1]]);
    }
    const svg = /^\/img\/brands\/(fx-[a-z-]+\.svg)$/.exec(p);
    if (svg){
      const send = () => {
        if (tilstand.svg === '404'){ res.writeHead(404); return res.end('nej'); }
        if (tilstand.svg === 'html'){ res.writeHead(200, { 'content-type': TYPER['.html'] }); return res.end('<!doctype html><title>x</title><p>Siden findes ikke</p>'); }
        res.writeHead(200, { 'content-type': TYPER['.svg'], 'cache-control': 'no-store' });
        res.end(fs.readFileSync(path.join(H.FIX_DIR, svg[1])));
      };
      return tilstand.svg === 'langsom' ? setTimeout(send, 600) : send();
    }
    const fil = path.join(rod, p === '/' ? 'index.html' : p);
    if (!fil.startsWith(rod) || !fs.existsSync(fil) || fs.statSync(fil).isDirectory()){ res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'content-type': TYPER[path.extname(fil)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(fs.readFileSync(fil));
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => {
    ok({ url: `http://127.0.0.1:${server.address().port}`, tilstand, close: () => new Promise(r => server.close(r)) });
  }));
}

module.exports = { start };
