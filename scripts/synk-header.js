/* Synkroniserer sidehovedet (skip-link, header og menuskuffen) fra index.html
   ind i alle andre HTML-sider i roden.

   Generatorerne (build-brand-pages, build-facet-pages, build-listing-pages)
   trækker selv headeren ud af index.html ved hvert byg. De håndskrevne sider
   (annonce.html, login.html, dashboard.html, om-*.html, vilkaar.html m.fl.)
   har hver sin kopi, og dem rører generatorerne ikke. Uden dette script
   driver kopierne fra hinanden, hver gang headeren ændres.

   Rediger headeren ÉT sted — i index.html — og kør:
     node scripts/synk-header.js          (skriver)
     node scripts/synk-header.js --tjek   (skriver intet, afbryder med kode 1 ved afvigelse)

   Linjeskift bevares pr. fil (CRLF/LF). Sider uden .site-header (404.html,
   afmeld.html) springes over. */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const START = '<a class="skip-link"';
const SLUT = '</div>\n</div>';   // menuskuffens lukning — headerens sidste linjer

function udtraek(html){
  const a = html.indexOf(START);
  const b = a === -1 ? -1 : html.indexOf(SLUT, a);
  if (a === -1 || b === -1) return null;
  return { a, b: b + SLUT.length };
}

const kilde = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const kr = udtraek(kilde);
if (!kr) throw new Error('synk-header: fandt ikke headeren i index.html');
const header = kilde.slice(kr.a, kr.b);
if (!/site-header/.test(header)) throw new Error('synk-header: udtrukket header mangler .site-header');

const tjek = process.argv.includes('--tjek');
let skrevet = 0, afvigende = [];
for (const fil of fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && f !== 'index.html').sort()){
  const raa = fs.readFileSync(path.join(ROOT, fil), 'utf8');
  const crlf = /\r\n/.test(raa);
  const s = raa.replace(/\r\n/g, '\n');
  if (!/<header class="site-header">/.test(s) || !/class="main-nav"/.test(s)) continue;   // afmeld.html har med vilje kun logoet
  const r = udtraek(s);
  if (!r) throw new Error(`synk-header: ${fil} har en header, men ikke den forventede afslutning`);
  if (s.slice(r.a, r.b) === header) continue;
  afvigende.push(fil);
  if (tjek) continue;
  const ny = s.slice(0, r.a) + header + s.slice(r.b);
  fs.writeFileSync(path.join(ROOT, fil), crlf ? ny.replace(/\n/g, '\r\n') : ny, 'utf8');
  skrevet++;
}
if (tjek){
  if (afvigende.length){ console.error(`synk-header: ${afvigende.length} sider afviger fra index.html: ${afvigende.join(', ')}`); process.exit(1); }
  console.log('synk-header: alle sider har samme header som index.html.');
} else {
  console.log(`synk-header: opdaterede ${skrevet} sider.`);
}
