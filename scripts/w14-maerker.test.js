/* Tests for w14-maerker (Visual Fidelity Gauntlet, agent 4): mærkeside, type-, kørekort-, region- og modelsider tættere på billede 7/8/9.
   Kør: node --test scripts/w14-maerker.test.js

   Låser det, der er nemt at "rydde op" til noget forkert:
   1. Facetsiderne: søgefelterne har ikoner, rækkefølgen er billedets (udvalgte -> typefliser -> Kort fortalt -> info), og alle linkgrupper
      nederst står i ÉT gitter (.fa-links3) med de samme overskrifter og links som før.
   2. Mærkesiden: "Kort fortalt" står efter typefliserne (annoncerne kommer lige efter tillidsrækken), modelfliserne har foto, når en annonce har et.
   3. Hero-lockup: mærker med både emblem- og ordmærke-variant viser dem side om side; øvrige mærker er uændrede; godkendelserne i manifestet er uændrede.
   4. CSS: de regler, der giver billedets proportioner (hero-højde, chips på én række, slanke typefliser), står stadig i filerne.
   Intet i sidernes tal er hårdkodet: alt regnes af de syntetiske annoncer herunder. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const FA = require('./build-facet-pages.js');
const MK = require('./build-brand-pages.js');
const BrandLogos = require('../js/brand-logos.js');
const { buildFacetList, side, forberedFacetter } = FA;
const les = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

function l(i, extra){
  return Object.assign({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, isExternal: true,
    brand: 'Honda', model: 'CB 500', year: 2019, price: 40000 + i * 1000, km: 10000 + i * 1000,
    type: 'naked', region: 'Hovedstaden', city: 'København', postnr: '2100', ccm: 471, power: 47,
    condition: 'brugt', source: { navn: 'Test', domaene: 'test.dk' }, createdAt: '2026-08-01T10:00:00Z',
    photoUrls: [`https://example.com/${i}.jpg`],
  }, extra || {});
}
const lager = (n = 14) => Array.from({ length: n }, (_, i) => l(i + 1, { power: i % 3 === 0 ? 100 : 47, ccm: i % 3 === 0 ? 998 : 471 }));
function bygSide(slug, alle){
  global.ALLE_LISTINGS = alle;
  const facets = forberedFacetter(alle);
  return side(facets.find(f => f.slug === slug), alle);
}
const pos = (html, s) => { const i = html.indexOf(s); assert.ok(i >= 0, `mangler: ${s}`); return i; };

/* ---------- 1. Facetsider ---------- */
test('søgekortet har et ikon i hvert felt (søg, type, pris, årgang) og beholder labels og navne', () => {
  const html = bygSide('type-naked', lager());
  const form = html.slice(pos(html, '<form class="fa-soeg"'), pos(html, '</form>'));
  assert.equal((form.match(/class="input-icon-wrap fa-ikon-felt"/g) || []).length, 4, 'søg + type + pris + årgang');
  for (const n of ['q', 'type', 'maxPrice', 'yearMin']) assert.match(form, new RegExp(`name="${n}"`), `felt ${n}`);
  assert.match(form, /<label for="fa-q">Mærke eller model<\/label>/);
  assert.ok(!/undefined|NaN/.test(form));
});

test('rækkefølgen følger billedet: udvalgte -> typefliser -> info-bokse -> guides -> Kort fortalt (nederst, ikke et ekstra modul midt på siden)', () => {
  const html = bygSide('koerekort-a2', lager());
  const udv = pos(html, 'class="section facet-liste-sektion fa-udvalgte"');
  const typer = pos(html, 'class="fa-typer"');
  const kf = pos(html, 'class="fa-kf"');
  const bokse = pos(html, 'fa-bokse fa-bokse-kk');
  const guides = pos(html, 'class="fa-guides"');
  assert.ok(udv < typer && typer < bokse && bokse < guides && guides < kf, `rækkefølge ${[udv, typer, bokse, guides, kf]}`);
  const t = bygSide('type-naked', lager());
  assert.ok(pos(t, 'fa-udvalgte') < pos(t, 'class="fa-kf"'), 'typeside: Kort fortalt efter udvalgte');
});

test('bundens linkgrupper står i ét gitter med samme overskrifter; ingen løse "Andre typer"-sektioner', () => {
  const html = bygSide('type-naked', lager());
  const m = html.match(/<section class="section fa-sektion fa-links3"[\s\S]*?<\/section>/);
  assert.ok(m, 'fa-links3 findes');
  const blok = m[0];
  assert.equal((html.match(/fa-links3/g) || []).length >= 1, true);
  assert.doesNotMatch(html, /fa-rel-vrap/);
  for (const h of ['Relaterede søgninger', 'Andre typer', 'Kørekortkategorier']) assert.ok(blok.includes(`>${h}</h2>`), `overskrift: ${h}`);
  assert.ok(!/<h2 class="fa-h2">Andre typer<\/h2>/.test(html), 'ingen separat sektion');
  /* de interne links er bevaret: de andre typer og kørekortsiderne */
  assert.match(blok, /href="type-sport\.html"|href="soegning\.html\?type=sport"/);
  assert.match(blok, /koerekort-a2\.html|koerekort=A2/);
  const modelSide = bygSide('type-naked', lager());
  assert.ok(modelSide.includes('fa-chips'));
});

test('regionssider: "Andre landsdele" ligger i samme gitter', () => {
  const alle = lager(20);
  const facets = forberedFacetter(global.ALLE_LISTINGS = alle);
  const f = facets.find(x => x.kind === 'region');
  if (!f) return;   // ingen region i fixturen
  const html = side(f, alle);
  const blok = (html.match(/<section class="section fa-sektion fa-links3"[\s\S]*?<\/section>/) || [''])[0];
  assert.ok(blok.includes('>Andre landsdele</h2>'), 'overskrift');
});

/* ---------- 2. Mærkesiden ---------- */
test('mærkesidens modelfliser får foto fra en annonce af netop den model; uden foto er flisen tekst som før', () => {
  const items = [l(1, { brand: 'Yamaha', model: 'MT-07' }), l(2, { brand: 'Yamaha', model: 'MT-07' }), l(3, { brand: 'Yamaha', model: 'R7', photoUrls: [] })];
  const fakta = MK.maerkeFakta('Yamaha', items);
  const mt = fakta.modeller.find(x => x.m === 'MT-07'), r7 = fakta.modeller.find(x => x.m === 'R7');
  assert.equal(mt.foto, 'https://example.com/1.jpg');
  assert.equal(r7.foto, null);
  const html = MK.treKolonnerHTML('Yamaha', fakta, items);
  assert.match(html, /class="mk-mini-foto"><img src="https:\/\/example\.com\/1\.jpg"/);
  assert.equal((html.match(/mk-mini-foto/g) || []).length, 1, 'kun MT-07 har foto');
});

/* ---------- 3. Hero-lockup ---------- */
test('hero-lockup: emblem + ordmærke side om side, når begge varianter findes; ellers uændret', () => {
  /* V6: Yamaha har nu en officiel enkeltfil; kun de tre AI-udkast (GasGas, Zero, Moto Guzzi) har stadig emblem + ordmærke */
  const y = MK.heroOrdmaerkeHTML('Zero');
  assert.match(y, /mk-wordmark--lockup/);
  assert.equal((y.match(/bl--hero/g) || []).length >= 1, true);
  assert.match(y, /bl--wm/);
  assert.match(y, /zero-emblem\.svg/);
  assert.match(y, /zero-ordmaerke\.svg/);
  assert.ok(y.indexOf('bl--hero') < y.indexOf('bl--wm'), 'emblem før ordmærke');
  assert.match(y, /aria-hidden="true"/);
  /* Ducati har ingen varianter: ét logo i hero-slotten og ingen lockup-klasse */
  const d = MK.heroOrdmaerkeHTML('Ducati');
  assert.doesNotMatch(d, /mk-wordmark--lockup|bl--wm/);
  assert.match(d, /bl--hero/);
  const yy = MK.heroOrdmaerkeHTML('Yamaha');
  assert.doesNotMatch(yy, /mk-wordmark--lockup|bl--wm/);
  assert.match(yy, /img\/brands\/yamaha\.svg/);
  /* mærke uden logo: monogram som før */
  const b = MK.heroOrdmaerkeHTML('Bajaj');
  assert.doesNotMatch(b, /bl--wm|lockup/);
});

test('ordmærke-varianter: filerne findes, er med i kernen, og de tre AI-godkendelser er uændrede (ejerens beslutning); de officielle har ingen varianter', () => {
  const m = JSON.parse(les('img/brands/manifest.json'));
  const med = m.maerker.filter(x => x.varianter && x.varianter.ordmaerke);
  /* V5 + V6: sytten AI-udkast er erstattet af officielle filer (uden emblem/ordmærke-varianter); tre mærker (GasGas, Zero, Moto Guzzi) har stadig lockup-varianter */
  assert.deepStrictEqual(med.map(x => x.slug).sort(), ['gasgas', 'moto-guzzi', 'zero'], 'mærker med ordmærke-variant');
  for (const x of med){
    assert.ok(fs.existsSync(path.join(ROOT, x.varianter.ordmaerke.fil)), x.varianter.ordmaerke.fil);
    assert.ok(x.varianter.emblem, `${x.slug}: lockup kræver også emblem`);
    const lf = BrandLogos.logoFor(x.navn);
    assert.ok(lf.ordmaerke && lf.ordmaerke.src === x.varianter.ordmaerke.fil, `${x.slug}: kernen kender varianten`);
  }
  const godkendte = m.maerker.filter(x => x.godkendt && x.autenticitet !== 'officiel');
  assert.equal(godkendte.length, 3);
  for (const x of godkendte){ assert.equal(x.godkendt_af, 'ejer'); assert.equal(x.godkendt_dato, '2026-10-17'); }
  const officielle = m.maerker.filter(x => x.godkendt && x.autenticitet === 'officiel');
  assert.equal(officielle.length, 28);
  for (const x of officielle){ assert.equal(x.varianter, undefined, x.slug); assert.ok(['2026-10-20', '2026-10-21'].includes(x.godkendt_dato), x.slug); }
  assert.deepEqual(BrandLogos.logoFor('Ducati').ordmaerke, null);
  /* form:'ordmaerke' uden variant falder tilbage til hovedfilen */
  assert.match(BrandLogos.logoHTML('Ducati', { storrelse: 'wm', form: 'ordmaerke' }), /img\/brands\/ducati\.svg/);
});

/* ---------- 4. CSS ---------- */
test('CSS: heroer, chips og typefliser har billedets proportioner', () => {
  const fc = les('css/p-facet.css'), mc = les('css/p-maerke.css');
  assert.match(fc, /\.fa-hero h1\{ font-size: clamp\(1\.875rem, 1\.1rem \+ 2\.4vw, 3rem\)/, 'facet-h1 højst 48 px');
  assert.match(fc, /\.fa-side \.rk-chips:not\(:has\(\.rk-chip-note\)\):not\(:has\(\.kk-ukendt\)\)\{ flex-wrap:nowrap/, 'chips på én række');
  assert.match(fc, /\.fa-typer a\{ aspect-ratio:auto; height:96px; \}/, 'slanke typefliser');
  assert.match(fc, /\.fa-links3 \.fa-rel-grid\{ grid-template-columns: minmax\(0,1fr\)/);
  assert.match(mc, /\.mk-hero h1\{ font-size: clamp\(1\.25rem, 0\.9rem \+ 1\.1vw, 1\.9rem\)/, 'mærke-h1 højst ca. 30 px');
  assert.match(mc, /\.mk-featured \.rk-chips:not\(:has\(\.rk-chip-note\)\):not\(:has\(\.kk-ukendt\)\)\{ flex-wrap:nowrap/);
  assert.match(mc, /\.mk-wordmark--lockup\{/);
  assert.match(les('css/p-brand-logo.css'), /\.bl--wm\{ --bl-maxh:44px; --bl-maxw:300px; --bl-k:128px; \}/);
});

/* ---------- Iteration 2 (blind Critic: AFVIS) ---------- */
test('iteration 2: ingen sticker-hero og ingen fremmed motorcykel i mærke-/modelsiders hero; foldens tekst ligger under annoncerne', () => {
  const alle = lager();
  const t = bygSide('type-naked', alle);
  assert.doesNotMatch(t, /fa-hero-bike|fa-hero-studio/);
  const heroSlut = t.indexOf('</section>', t.indexOf('class="fa-hero"'));
  assert.ok(!t.slice(t.indexOf('class="fa-hero"'), heroSlut).includes('fa-mere-intro'), 'folden står ikke i heroen');
  const facets = forberedFacetter(global.ALLE_LISTINGS = alle);
  const k = facets.find(f => f.kind === 'model') || facets.find(f => f.kind === 'kombi');
  if (k){ const h = side(k, alle); assert.doesNotMatch(h, /fa-hero-bike|fa-hero-studio|fa-hero-typefoto/); }
});

test('iteration 2/3: "Udforsk efter behov" har forskellige dekorative typefotos, og tal og link er det samme filter', () => {
  const alle = lager(30);
  const html = bygSide('type-naked', alle);
  const m = html.match(/<ul class="fa-udforsk">[\s\S]*?<\/ul>/);
  if (!m) return;   // intet udvalg at dele
  const src = [...m[0].matchAll(/<img src="([^"]+)"/g)].map(x => x[1]);
  assert.equal(new Set(src).size, src.length, 'aldrig samme foto to gange (dekorative, forskellige typefotos)');
  const links = [...m[0].matchAll(/href="([^"]+)"/g)].map(x => x[1]);
  assert.equal(new Set(links).size, links.length, 'ingen to kort peger det samme sted hen');
});

test('iteration 2: annoncer med foto kommer først i udsnittet, og højst 5 + 8 kort bages ind (resten via søgning)', () => {
  const alle = lager(30).map((x, i) => Object.assign({}, x, { externalUrl: `https://test.dk/a/${i}` }, i % 2 ? { photoUrls: [] } : {}));
  const html = bygSide('type-naked', alle);
  const ider = [...html.matchAll(/class="card card-rich[^"]*" data-listing-id="([^"]+)"/g)].map(x => x[1]);
  assert.equal(ider.length, 13, '5 udvalgte + 8 flere');
  const medFoto = new Set(alle.filter(x => x.photoUrls.length).map(x => x.id));
  const forsteFem = ider.slice(0, 5);
  assert.ok(forsteFem.every(i => medFoto.has(i)), 'første række har foto');
  assert.match(html, /class="fa-mere-lille"/);
  assert.doesNotMatch(html, /<p class="brand-mere">/, 'ingen stor orange pille');
});

test('iteration 2/3: mærkesidens kørekortfliser viser kun kategorier med annoncer; hero har faktapanel; MAERKE_KORT = 8', () => {
  const items = [l(1, { brand: 'Yamaha', model: 'MT-07', power: 70, ccm: 689 }), l(2, { brand: 'Yamaha', model: 'R7', power: 70, ccm: 689 })];
  const fakta = MK.maerkeFakta('Yamaha', items);
  const kol = MK.treKolonnerHTML('Yamaha', fakta, items);
  const kk = kol.match(/<ul class="mk-mini mk-mini-kk">[\s\S]*?<\/ul>/)[0];
  assert.equal((kk.match(/<li>/g) || []).length, fakta.kk.length, 'kun kategorier med annoncer; ingen 0-flise');
  assert.doesNotMatch(kk, /mk-mini-nul/);
  assert.match(les('css/p-maerke.css'), /\.mk-cols\{ align-items:start; \}/);
  assert.match(les('scripts/build-brand-pages.js'), /class="mk-hero mk-hero-flad"/);
  assert.match(les('scripts/build-brand-pages.js'), /mkPanelHTML[(]brand, items, fakta, stats[)]/);
  assert.match(les('scripts/build-brand-pages.js'), /const MAERKE_KORT = 8;/);
});

/* ---------- Iteration 3 (blind Critic runde 2) ---------- */
test('iteration 3: typesiderne har deres EGET typefoto som hero (sport != cruiser), øvrige sider landskabsfoto; ingen flad tom flade', () => {
  const alle = lager(14).map((x, i) => Object.assign({}, x, { type: 'sport', power: 100 }));
  const sport = bygSide('type-sport', alle);
  const hero = sport.slice(sport.indexOf('class="fa-hero"'), sport.indexOf('</section>', sport.indexOf('class="fa-hero"')));
  assert.match(hero, /fa-hero-type[^>]*><img class="fa-hero-typefoto" src="img\/type\/sport\.webp"/);
  assert.doesNotMatch(hero, /hero-1600|cruiser/, 'sport-heroen er hverken landskabsfoto eller cruiser');
  const typer = new Set();
  for (const t of ['sport', 'naked', 'cruiser', 'touring']){ const h = bygSide(`type-${t}`, lager(14).map(x => Object.assign({}, x, { type: t }))); typer.add((h.match(/fa-hero-typefoto" src="([^"]+)"/) || [])[1]); }
  assert.equal(typer.size, 4, 'forskellig hero-baggrund pr. type');
  const a2 = bygSide('koerekort-a2', lager());
  assert.match(a2, /<div class="fa-hero-media" aria-hidden="true">\s*<img src="img\/hero-1600\.webp"/);
  const mk = les('scripts/build-brand-pages.js');
  assert.match(mk, /class="mk-hero mk-hero-flad"[\s\S]{0,400}class="mk-hero-photo" src="img\/hero-1600\.webp"/, 'mærkehero: landskabsfoto, ingen fremmed motorcykel');
  assert.match(les('css/p-maerke.css'), /\.mk-hero-flad \.mk-hero-photo\{[^}]*width:68%/, 'fotoet fylder >= 35 % af heroen');
});

test('iteration 3: søgeknappen står på én linje med kort label; ingen 0-fliser; behovskort har forskellige fotos; CTA uden foto-sliver', () => {
  const mkHtml = MK.treKolonnerHTML('Yamaha', MK.maerkeFakta('Yamaha', [l(1, { brand: 'Yamaha', model: 'MT-07', power: 70, ccm: 689 })]), []);
  assert.doesNotMatch(mkHtml, /mk-mini-nul|>0 Yamaha</, 'ingen flise med tallet 0');
  for (const s of ['css/p-facet.css', 'css/p-maerke.css']) assert.match(les(s), /\.fa-soeg-knap, \.mk-f-go \.btn\{ white-space:nowrap; \}/);
  const html = bygSide('type-naked', lager(30));
  const knap = html.match(/class="btn btn-primary btn-lg fa-soeg-knap">([^<]*)</)[1].trim();
  assert.ok(knap.length <= 28, `knaplabel "${knap}"`);
  const m = html.match(/<ul class="fa-udforsk">[\s\S]*?<\/ul>/);
  if (m){ const src = [...m[0].matchAll(/<img src="([^"]+)"/g)].map(x => x[1]); assert.ok(src.length >= 2); assert.equal(new Set(src).size, src.length, 'aldrig samme foto to gange'); assert.ok(!src.some(s => /naked\.webp/.test(s)), 'ikke sidens egen type'); }
  assert.match(les('css/p-maerke.css'), /@media \(min-width:1100px\)\{ \.mk-cta-img\{ display:none; \} \}/, 'ingen klippet foto-sliver i mærke-CTA');
  assert.match(html, /fa-cta-foto/, 'typesidens CTA har typefoto');
});

test('iteration 3: rækkens skabelon er den samme uanset antal bagte kort (CLS på små mærkesider), og knappen på mærkesider er kort', () => {
  const css = les('css/p-maerke.css');
  assert.match(css, /\.mk-featured\[data-n="1"\], \.mk-featured\[data-n="2"\]\{ grid-template-columns: repeat\(4, minmax\(0,1fr\)\); \}/);
  assert.match(css, /\.mk-featured\[data-n\] \.mk-cta\{ grid-column: -2 \/ -1; grid-row:1; \}/);
  assert.match(les('scripts/build-brand-pages.js'), /const faa = false;/);
  assert.match(les('js/maerke.js'), /fm\.dataset\.n = String\(frem\.length\)/);
  const hero = MK.heroOrdmaerkeHTML('Vespa');
  assert.match(les('css/p-maerke.css'), /\.mk-wordmark:not\(\.mk-wordmark--logo\)\{[^}]*min-height:72px/, 'fallback-ordmærket (Vespa) har samme ramme som logoerne: H1 flytter sig ikke');
  assert.doesNotMatch(hero, /bl--wm/);
});
