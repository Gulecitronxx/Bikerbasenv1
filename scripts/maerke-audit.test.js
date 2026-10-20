/* V3 indhold: ALLE mærker med. Låser (1) at hvert mærke med en side står i oversigten med samme tal som siden selv,
   (2) at "Flere mærker" er alias-bevidst og ikke indeholder noget, der har en side, (3) at 0-fliser og CTA-foto er rettet. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const { maerkerUdenLager } = require('./build-brand-pages.js');
const BrandLogos = require('../js/brand-logos.js');
let n = 0;
const t = (navn, fn) => { fn(); n++; console.log('ok -', navn); };

t('maerkerUdenLager folder aliaser: "Zero Motorcycles" og "Zero" er ét mærke', () => {
  assert.deepEqual(maerkerUdenLager(['Zero Motorcycles', 'Vespa'], ['Zero']), ['Vespa']);
  assert.deepEqual(maerkerUdenLager(['CFMOTO'], ['CFMoto']), []);
  assert.deepEqual(maerkerUdenLager(['Zero Motorcycles', 'Zero'], []), ['Zero']);
});

const sider = fs.readdirSync(ROOT).filter(f => /^maerke-.+\.html$/.test(f));
const oversigt = read('maerker.html');

t('hvert mærke med side står i A–Z med samme tal som sidens eget [data-mk-n]', () => {
  assert.ok(sider.length >= 20);
  for (const f of sider){
    const slug = f.replace(/^maerke-|\.html$/g, '');
    const side = read(f);
    const m = side.match(/data-mk-n>([\d.]+)</);
    assert.ok(m, `${f}: intet data-mk-n`);
    const re = new RegExp(String.raw`<a href="maerke-${slug}\.html"><span class="mk-az-navn">.*?<span class="mk-az-n">([\d.]+)</span>`, 's');
    const o = oversigt.match(re);
    assert.ok(o, `${slug} mangler i A–Z-listen`);
    assert.equal(o[1], m[1], `${slug}: oversigten siger ${o[1]}, siden ${m[1]}`);
  }
});

t('"Flere mærker" nævner ingen mærker, der har en side (ingen dubletter via alias)', () => {
  const blok = (oversigt.match(/<ul class="mk-flere"[^>]*>([\s\S]*?)<\/ul>/) || [])[1] || '';
  const navne = [...blok.matchAll(/<li\b[^>]*>([^<]+)<\/li>/g)].map(x => x[1].replace(/&amp;/g, '&'));
  assert.ok(navne.length >= 20, 'sektionen er tom');
  const harSide = new Set(sider.map(f => f.replace(/^maerke-|\.html$/g, '')));
  for (const nv of navne){
    const slug = BrandLogos.normaliser(nv);
    assert.ok(!harSide.has(slug), `${nv} står som "uden annoncer", men har siden maerke-${slug}.html`);
    assert.ok(!oversigt.includes(`href="maerke-${slug}.html"`), `${nv} er linket`);
  }
  assert.equal(new Set(navne.map(x => BrandLogos.normaliser(x))).size, navne.length, 'to navne samme mærke');
});

t('mærker med under 5 annoncer er noindex; mærker med mindst 5 er det ikke', () => {
  for (const f of sider){
    const side = read(f);
    const n = +(side.match(/data-mk-n>([\d.]+)</) || [])[1].replace('.', '');
    assert.equal(/name="robots" content="noindex/.test(side), n < 5, `${f} (${n})`);
  }
});

t('facetflisen skjules ved 0 (klienttal) og CTA-fotoet ligger i knaprækken', () => {
  const js = read('scripts/build-facet-pages.js');
  assert.ok(/\.fa-udforsk li, \.brand-facet-raekke a'/.test(js));
  assert.ok(/<div class="fa-cta-fod">[\s\S]*?class="btn btn-primary"[\s\S]*?fa-cta-foto[\s\S]*?<\/div>\s*<\/aside>/.test(js));
  assert.ok(/\.fa-udforsk li\[hidden\]/.test(read('css/p-facet.css')));
});

t('guidesidernes dateModified er løftet til 2026-10-18 og aldrig før datePublished', () => {
  for (const f of fs.readdirSync(ROOT).filter(x => /^guide-.+\.html$/.test(x))){
    const h = read(f);
    const mod = (h.match(/"dateModified":"([\d-]+)"/) || [])[1], pub = (h.match(/"datePublished":"([\d-]+)"/) || [])[1];
    assert.equal(mod, '2026-10-18', f);
    assert.ok(mod >= pub, f);
  }
});
console.log(`${n} tests ok`);
