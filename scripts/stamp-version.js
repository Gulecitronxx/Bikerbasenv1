/* Stempler en version på alle lokale js/css-referencer, så browsere henter
   nye filer efter en deploy i stedet for at køre videre på en cachet kopi.

   GitHub Pages sætter aggressive cache-headers på statiske filer, og et
   almindeligt F5 rammer derfor ofte den gamle version. Versionen skifter kun
   når filernes indhold skifter, så uændrede filer stadig caches.

   Kør efter ændringer i js/ eller css/:  node scripts/stamp-version.js */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');

// Hash af alt indhold i js/ og css/ — ændrer sig kun når koden ændrer sig.
const files = [];
for (const dir of ['js', 'css']){
  const p = path.join(ROOT, dir);
  if (!fs.existsSync(p)) continue;
  for (const f of fs.readdirSync(p).sort()){
    if (/\.(js|css)$/.test(f)) files.push(path.join(p, f));
  }
}
const hash = crypto.createHash('sha1');
files.forEach(f => hash.update(fs.readFileSync(f)));
const version = hash.digest('hex').slice(0, 8);

let changed = 0;
for (const file of fs.readdirSync(ROOT)){
  if (!file.endsWith('.html')) continue;
  const full = path.join(ROOT, file);
  let html = fs.readFileSync(full, 'utf8');
  const before = html;

  // src="js/x.js"  /  href="css/x.css"  (med eller uden eksisterende ?v=)
  html = html.replace(
    /(src|href)="((?:js|css)\/[a-zA-Z0-9._-]+\.(?:js|css))(\?v=[a-z0-9]+)?"/g,
    (_m, attr, p) => `${attr}="${p}?v=${version}"`
  );

  if (html !== before){ fs.writeFileSync(full, html, 'utf8'); changed++; }
}

console.log(`Version ${version} stemplet på ${changed} HTML-filer (${files.length} kildefiler).`);
