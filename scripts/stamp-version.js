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

// Hash af alt indhold i js/, js/vendor/ og css/ — ændrer sig kun når koden
// ændrer sig. js/vendor/ er med, så en opgradering af supabase-js
// (scripts/vendor-supabase.js) også giver nyt ?v= — ellers ville browsere
// køre den gamle SDK mod den nye app-kode i op til et år (Cloudflare-cachen
// sætter immutable på ?v=-stemplede filer).
const files = [];
for (const dir of ['js', 'js/vendor', 'css']){
  const p = path.join(ROOT, dir);
  if (!fs.existsSync(p)) continue;
  for (const f of fs.readdirSync(p).sort()){
    if (/\.(js|css)$/.test(f)) files.push(path.join(p, f));
  }
}
const hash = crypto.createHash('sha1');
files.forEach(f => hash.update(fs.readFileSync(f)));
const version = hash.digest('hex').slice(0, 8);

/* Fonte: ?v= er indholdshash, ikke et haandskrevet '1'. Cloudflare-reglen i scripts/cloudflare-setup.js
   gemmer ?v=-stemplede woff2 i et aar med immutable; med et fast ?v=1 ville en udskiftet eller
   gen-subsettet font aldrig naa en browser, der har den i cachen. Hashen er af selve filens bytes
   og skifter derfor kun, naar fonten goer. Regex'en tager baade <link rel=preload> og
   @font-face-url() i sidens inline <style>, saa preload og brug altid peger paa SAMME url -
   ellers henter browseren fonten to gange. En ukendt fil roeres ikke. */
const fontHash = {};
function fontVersion(rel){
  if (!(rel in fontHash)){
    const p = path.join(ROOT, rel);
    fontHash[rel] = fs.existsSync(p) ? crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex').slice(0, 8) : null;
  }
  return fontHash[rel];
}
const FONT_REF = /(fonts\/[a-zA-Z0-9._-]+\.woff2)(\?v=[a-z0-9]+)?(?=["')])/g;

let changed = 0;
for (const file of fs.readdirSync(ROOT)){
  if (!file.endsWith('.html')) continue;
  const full = path.join(ROOT, file);
  let html = fs.readFileSync(full, 'utf8');
  const before = html;

  // src="js/x.js"  /  src="js/vendor/x.js"  /  href="css/x.css"  (med eller uden eksisterende ?v=)
  html = html.replace(
    /(src|href)="((?:js|css)\/(?:vendor\/)?[a-zA-Z0-9._-]+\.(?:js|css))(\?v=[a-z0-9]+)?"/g,
    (_m, attr, p) => `${attr}="${p}?v=${version}"`
  );

  html = html.replace(FONT_REF, (m, p) => {
    const v = fontVersion(p);
    return v ? p + '?v=' + v : m;
  });

  if (html !== before){ fs.writeFileSync(full, html, 'utf8'); changed++; }
}

console.log(`Version ${version} stemplet på ${changed} HTML-filer (${files.length} kildefiler).`);
