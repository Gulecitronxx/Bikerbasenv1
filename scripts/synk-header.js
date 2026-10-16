/* Synkroniserer sidehovedet (skip-link, header og menuskuffen) OG footerens link-gitter (.footer-grid) fra
   index.html ind i alle andre HTML-sider i roden. Footerens bundlinje (.footer-bottom) er sidens egen og røres ikke
   (dashboard.html har fx en særlig tekst dér).

   Generatorerne (build-brand-pages, build-facet-pages, build-listing-pages)
   trækker selv headeren og footeren ud af index.html ved hvert byg. De håndskrevne sider
   (annonce.html, login.html, dashboard.html, om-*.html, vilkaar.html m.fl.)
   har hver sin kopi, og dem rører generatorerne ikke. Uden dette script
   driver kopierne fra hinanden, hver gang headeren eller footeren ændres.

   Rediger headeren og footeren ÉT sted — i index.html — og kør:
     node scripts/synk-header.js          (skriver)
     node scripts/synk-header.js --tjek   (skriver intet, afbryder med kode 1 ved afvigelse)

   Linjeskift bevares: mange sider har BLANDEDE linjeskift (CRLF og LF), så kun de udskiftede stykker skrives om —
   resten af filen røres ikke byte for byte. Sider uden .site-header (404.html) springes over.

   FOOTER_KUN: sider med vilje UDEN menu (kun logoet i toppen) men MED footer. Her synkroniseres kun footerens
   link-gitter, aldrig headeren. afmeld.html: man lander dér fra en mail, uden menu, men skal ikke ende i en blindgyde. */

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

/* Footerens link-gitter: fra <div class="footer-grid"> og frem til bundlinjen. */
const FOOT_START = '<div class="footer-grid">';
const FOOT_SLUT = '<div class="footer-bottom">';
function udtraekFooter(html){
  const f = html.indexOf('<footer class="site-footer">');
  if (f === -1) return null;
  const a = html.indexOf(FOOT_START, f);
  const b = a === -1 ? -1 : html.indexOf(FOOT_SLUT, a);
  if (a === -1 || b === -1) return null;
  return { a, b };
}

/* Normaliseret tekst (kun \n) + et kort fra normaliseret til rå position, så et stykke kan udskiftes uden at
   røre filens øvrige linjeskift. */
function normKort(raa){
  const map = [];
  let norm = '';
  for (let i = 0; i < raa.length; i++){
    if (raa[i] === '\r' && raa[i + 1] === '\n') continue;
    map.push(i);
    norm += raa[i];
  }
  map.push(raa.length);
  return { norm, map };
}
function udskift(raa, map, a, b, tekst){
  const ra = map[a];
  let rb = map[b];
  if (rb > 0 && raa[rb - 1] === '\r' && raa[rb] === '\n') rb--;   // linjeskiftet efter stykket hører ikke til det
  const eol = raa.slice(ra, rb).includes('\r\n') ? '\r\n' : '\n';
  return raa.slice(0, ra) + tekst.replace(/\n/g, eol) + raa.slice(rb);
}

const kilde = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const kr = udtraek(kilde);
if (!kr) throw new Error('synk-header: fandt ikke headeren i index.html');
const header = kilde.slice(kr.a, kr.b);
if (!/site-header/.test(header)) throw new Error('synk-header: udtrukket header mangler .site-header');
const fr = udtraekFooter(kilde);
if (!fr) throw new Error('synk-header: fandt ikke footerens link-gitter i index.html');
const footerGitter = kilde.slice(fr.a, fr.b);

const FOOTER_KUN = ['afmeld.html'];

const tjek = process.argv.includes('--tjek');
let skrevet = 0, afvigende = [];
for (const fil of fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && f !== 'index.html').sort()){
  const raa = fs.readFileSync(path.join(ROOT, fil), 'utf8');
  const { norm: s, map } = normKort(raa);
  if (FOOTER_KUN.includes(fil)){
    const sf = udtraekFooter(s);
    if (!sf) throw new Error(`synk-header: ${fil} står i FOOTER_KUN, men har ingen footer med link-gitter`);
    if (s.slice(sf.a, sf.b) === footerGitter) continue;
    afvigende.push(fil);
    if (!tjek){ fs.writeFileSync(path.join(ROOT, fil), udskift(raa, map, sf.a, sf.b, footerGitter), 'utf8'); skrevet++; }
    continue;
  }
  if (!/<header class="site-header">/.test(s) || !/class="main-nav"/.test(s)) continue;   // 404.html har sin egen header
  const r = udtraek(s);
  if (!r) throw new Error(`synk-header: ${fil} har en header, men ikke den forventede afslutning`);
  const sf = udtraekFooter(s);
  const headerOk = s.slice(r.a, r.b) === header;
  const footerOk = !sf || s.slice(sf.a, sf.b) === footerGitter;   // sider uden footer (404, afmeld) springes over
  if (headerOk && footerOk) continue;
  afvigende.push(fil);
  if (tjek) continue;
  let ny = raa;
  if (!footerOk) ny = udskift(ny, map, sf.a, sf.b, footerGitter);   // footeren ligger efter headeren: skriv den først, så positionerne holder
  if (!headerOk) ny = udskift(ny, map, r.a, r.b, header);
  fs.writeFileSync(path.join(ROOT, fil), ny, 'utf8');
  skrevet++;
}
if (tjek){
  if (afvigende.length){ console.error(`synk-header: ${afvigende.length} sider afviger fra index.html: ${afvigende.join(', ')}`); process.exit(1); }
  console.log('synk-header: alle sider har samme header og footer som index.html.');
} else {
  console.log(`synk-header: opdaterede ${skrevet} sider.`);
}
