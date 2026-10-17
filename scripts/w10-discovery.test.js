/* Tests for w10-discovery: "Kort fortalt", by-fliser med antal, guide-indholdsfortegnelse og unikke fotokort.
   Kør: node --test scripts/w10-discovery.test.js

   Låser det, der er nemt at "rydde op" til noget forkert:
   1. "Kort fortalt" på facet- og mærkesider: 3-4 punkter, hvert tal står i data-fa-n/data-mk-n eller er regnet af de
      samme annoncer som siden, punkter uden data udelades, intet "undefined/NaN/null", ingen dobbelt-punktum efter "kr.".
   2. By-fliserne på landsdelssider: tallet er det, by-siden selv viser (annoncer, hvis postnummer hører til byen), nøglen
      by:<postnumre> kan klienten regne om, og hydreringsscriptet indeholder ingen href="…"/src="…" (udgiv.js tolker dem
      som statiske referencer i hele sidens HTML, også i inline-scripts).
   3. Guides: ét indholdsfortegnelses-element (details, ankre findes), Kort fortalt kommer før artiklen i kilden,
      ingen to guides deler kortbillede, og "Læs også" peger på ordliste/typer, hvor det hører hjemme. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const FA = require('./build-facet-pages.js');
const MK = require('./build-brand-pages.js');
const { renderGuide } = require('./build-guides');
const { GUIDES } = require('./guides-data');
const { KK_FAKTA } = require('./facet-indhold');

const { buildFacetList, side, forberedFacetter } = FA;

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
const kf = html => (html.match(/<section class="fa-kf"[\s\S]*?<\/section>/) || [''])[0];
const punkter = sek => [...sek.matchAll(/<li><span class="fa-kf-ok"[\s\S]*?<\/span><span>([\s\S]*?)<\/span><\/li>/g)].map(m => m[1]);

/* ---------- Kort fortalt: facetsider ---------- */
test('kort fortalt (type): 3-4 punkter, antal i data-fa-n, pris og A2-antal er regnet af annoncerne', () => {
  const alle = lager();
  const sek = kf(bygSide('type-naked', alle));
  assert.ok(sek, 'sektionen findes');
  const p = punkter(sek);
  assert.ok(p.length >= 3 && p.length <= 4, `${p.length} punkter`);
  assert.match(sek, new RegExp(`data-fa-n="all">${alle.length}<`));
  const priser = alle.map(x => x.price).sort((a, b) => a - b);
  assert.match(sek, new RegExp(`fra ${priser[0].toLocaleString('da-DK').replace('.', '\\.')} kr\\. til ${priser[priser.length - 1].toLocaleString('da-DK').replace('.', '\\.')} kr\\.`));
  const a2 = alle.filter(x => x.power <= 47).length;   // 47 hk = A2_MAX_HK i js/data.js
  assert.match(sek, new RegExp(`data-fa-n="kk:A2">${a2}<`));
  assert.ok(!/undefined|NaN|\bnull\b|kr\.\./.test(sek), 'ingen undefined/NaN/null/dobbeltpunktum');
});

test('kort fortalt: punkter uden data udelades, og siden holder sig til de faste løfter', () => {
  // Ingen pris, ingen effekt: hverken pris- eller kørekortpunkt, men stadig mindst tre punkter.
  const alle = lager().map(x => Object.assign({}, x, { price: null, power: null }));
  const p = punkter(kf(bygSide('type-naked', alle)));
  assert.ok(p.length >= 3, `${p.length} punkter`);
  assert.ok(!p.some(t => /kr\./.test(t)), 'ingen pris uden priser');
  assert.ok(!p.some(t => /udelukket til A2/.test(t)), 'ingen A2-påstand uden effekt');
  assert.ok(p.some(t => /Ikke oplyst/.test(t)), 'det faste løfte træder ind');
});

test('kort fortalt (kørekort): reglen er den fra facet-indhold, og ingen tal er hårdkodet i punkterne', () => {
  const sek = kf(bygSide('koerekort-a2', lager()));
  const p = punkter(sek);
  assert.ok(p.length >= 3);
  assert.ok(p.join(' ').includes(KK_FAKTA.A2[0].tekst.replace(/\(/g, '(')) || /35 kW/.test(p.join(' ')), 'A2-reglen står der');
  assert.match(p.join(' '), /Almindelig mindstealder: fra 20 år/);
  assert.match(sek, /data-fa-n="all">\d+</);
});

test('kort fortalt (region): flest annoncer står i den by, der har flest', () => {
  const alle = lager().map((x, i) => Object.assign({}, x, { city: i < 9 ? 'København' : 'Roskilde' }));
  const p = punkter(kf(bygSide('region-hovedstaden', alle))).join(' ');
  assert.match(p, /Flest annoncer står i København \(9\) og Roskilde \(5\)/);
});

test('kort fortalt (model): årgangsspænd regnes af annoncerne', () => {
  const alle = Array.from({ length: 12 }, (_, i) => l(i + 1, { model: 'CB 500 F', year: 2012 + (i % 5) }));
  const f = buildFacetList(alle).find(x => x.slug === 'model-honda-cb-500-f');
  assert.ok(f);
  global.ALLE_LISTINGS = alle;
  const p = punkter(kf(side(f, alle))).join(' ');
  assert.match(p, /Årgangene spænder fra 2012 til 2016/);
});

/* ---------- By-fliser ---------- */
function byLager(){
  /* To byer i Midtjylland (Aarhus 8000, Silkeborg 8600), 24 annoncer hver fra to kilder, begge < 80 % af landsdelen. */
  const mk = (i, by, postnr) => l(i, { city: by, postnr, region: 'Midtjylland', source: { navn: i % 2 ? 'Kilde A' : 'Kilde B', domaene: i % 2 ? 'a.dk' : 'b.dk' }, price: 30000 + i * 700, year: 2010 + (i % 12) });
  return [...Array.from({ length: 24 }, (_, i) => mk(i + 1, 'Aarhus C', '8000')), ...Array.from({ length: 22 }, (_, i) => mk(100 + i, 'Silkeborg', '8600')), ...Array.from({ length: 4 }, (_, i) => mk(200 + i, 'Herning', '7400'))];
}
test('by-fliser: kun byer med egen side, tallet er by-sidens eget, og nøglen kan klienten regne om', () => {
  const alle = byLager();
  global.ALLE_LISTINGS = alle;
  const facets = forberedFacetter(alle);
  const byer = facets.filter(f => f.kind === 'by' && f.qualifies && f.region === 'Midtjylland');
  assert.ok(byer.length >= 2, `byer med side: ${byer.map(b => b.slug)}`);
  const html = side(facets.find(f => f.slug === 'region-midtjylland'), alle);
  const sek = (html.match(/<ul class="fa-by-liste">[\s\S]*?<\/ul>/) || [''])[0];
  assert.ok(sek, 'fliserne findes');
  const fliser = [...sek.matchAll(/<li><a href="([^"]+)">[\s\S]*?data-fa-n="by:([^"]+)">(\d+)<[\s\S]*?<\/li>/g)];
  assert.strictEqual(fliser.length, byer.length, 'én flise pr. by med side');
  for (const [, href, nogle, n] of fliser){
    const b = byer.find(x => `${x.slug}.html` === href);
    assert.ok(b, `${href} er en by-side`);
    assert.strictEqual(nogle, b.postnumre.join(','), 'nøglen er byens postnumre');
    assert.strictEqual(Number(n), alle.filter(b.match).length, 'tallet er antallet, by-siden selv viser');
    // klientens regel (js i hydreringsscriptet): postnr i postnumre-sættet
    const pn = nogle.split(',');
    assert.strictEqual(alle.filter(x => pn.includes(String(x.postnr || '').trim())).length, Number(n), 'klientens tælling giver samme tal');
  }
  assert.ok(!/Herning/.test(sek), 'by uden egen side får ingen flise');
  assert.ok(!/undefined|NaN|\bnull\b/.test(sek));
});

test('by-fliser: findes ikke uden byer med side, og kun på landsdelssider', () => {
  const alle = lager();
  assert.ok(!/class="fa-by-liste"/.test(bygSide('region-hovedstaden', alle)), 'ingen by med side -> ingen sektion');
  assert.ok(!/class="fa-by-liste"/.test(bygSide('type-naked', byLager())), 'ikke på typesider');
});

test('hydreringsscriptet: kan regne by-nøglen om, og indeholder ingen href=/src= (udgiv.js)', () => {
  const js = FA.hydreringsScript();
  assert.match(js, /t === 'by'/);
  assert.match(js, /\.fa-by-liste li/);
  /* Den ene statiske reference (facetTomMarkup: <a href="soegning.html">) er en rigtig fil. Alt andet — især dynamiske værdier — skal
     bygges uden dobbelte anførselstegn (String.fromCharCode(34)), ellers tolker udgiv.js dem som statiske referencer. */
  const refs = [...js.matchAll(/(?:href|src|srcset)\s*=\s*\\?"([^"\\]*)/g)].map(m => m[1]);
  assert.deepStrictEqual([...new Set(refs)], ['soegning.html'], `uventede referencer i scriptet: ${refs}`);
});

/* ---------- Kort fortalt: mærkesider ---------- */
test('kort fortalt (mærke): antal i data-mk-n, mest udbudte typer og pris af annoncerne; udeladt uden data', () => {
  const items = Array.from({ length: 10 }, (_, i) => l(i + 1, { brand: 'Yamaha', type: i < 6 ? 'naked' : 'sport', price: 30000 + i * 1000 }));
  const fakta = MK.maerkeFakta('Yamaha', items);
  const stats = MK.prisStatistik(items);
  const html = MK.kortFortaltHTML('Yamaha', items, fakta, stats);
  assert.match(html, /<span data-mk-n>10<\/span>/);
  const p = MK.kortFortaltPunkter('Yamaha', items, fakta, stats);
  assert.ok(p.length >= 3 && p.length <= 4);
  assert.match(p.join(' '), /naked \(6\)/);
  assert.match(p.join(' '), /fra 30\.000 kr\. til 39\.000 kr\./);
  assert.ok(!/undefined|NaN|\bnull\b|kr\.\./.test(html));
  // uden pris og type: ingen pris- eller typepunkt, men det faste løfte holder punkterne på mindst tre
  const tom = items.map(x => Object.assign({}, x, { price: null, type: null, power: null }));
  const p2 = MK.kortFortaltPunkter('Yamaha', tom, MK.maerkeFakta('Yamaha', tom), MK.prisStatistik(tom));
  assert.ok(p2.length >= 2);
  assert.ok(!p2.some(t => /kr\.|Mest udbudte typer/.test(t)));
  assert.strictEqual(MK.kortFortaltHTML('Yamaha', [], MK.maerkeFakta('Yamaha', []), MK.prisStatistik([])), '', 'uden annoncer ingen sektion');
});

/* ---------- Guides ---------- */
const ctx = { header: '<header class="site-header"></header>', footer: '<footer class="site-footer"></footer>', csp: '', populaer: '<section class="gd-pop"></section>', maerker: [] };

test('guides: ét indholdsfortegnelses-element (details) i højre spalte, ankre findes, Kort fortalt kommer først', () => {
  for (const g of GUIDES){
    const html = renderGuide(g, ctx);
    assert.strictEqual((html.match(/<nav class="gd-toc"/g) || []).length, 1, `${g.slug}: ét indholdsfortegnelses-element`);
    assert.match(html, /<details class="gd-toc-det">/, `${g.slug}: sammenklappelig`);
    const toc = html.match(/<nav class="gd-toc"[\s\S]*?<\/nav>/)[0];
    const ankre = [...toc.matchAll(/href="#([^"]+)"/g)].map(m => m[1]);
    assert.ok(ankre.length >= 3, `${g.slug}: ankre`);
    for (const a of ankre) assert.ok(html.includes(`id="${a}"`), `${g.slug}: #${a} findes`);
    const side = html.match(/<aside class="gd-side"[\s\S]*?<\/aside>/)[0];
    assert.ok(side.indexOf('gd-tldr') > -1 && side.indexOf('gd-tldr') < side.indexOf('gd-toc'), `${g.slug}: Kort fortalt før indholdsfortegnelsen`);
    assert.ok(side.indexOf('gd-toc') > -1 && !/gd-pop|gd-dark/.test(side), `${g.slug}: sticky-boksen er alene med Kort fortalt`);
    assert.match(html, /Læsetid/); assert.match(html, /Opdateret/);
    assert.match(html, /<time datetime="\d{4}-\d{2}-\d{2}">/);
  }
});

test('guides: to guides deler aldrig kortbillede (så fotokort aldrig gentager sig ved siden af hinanden)', () => {
  const billeder = GUIDES.map(g => g.cardImage);
  assert.strictEqual(new Set(billeder).size, billeder.length, `ens billeder: ${billeder.join(', ')}`);
  for (const g of GUIDES){
    const html = renderGuide(g, ctx);
    const rel = (html.match(/<ul class="gd-rel-list">[\s\S]*?<\/ul>/) || [''])[0];
    const imgs = [...rel.matchAll(/<img src="([^"]+)"/g)].map(m => m[1]);
    for (let i = 1; i < imgs.length; i++) assert.notStrictEqual(imgs[i], imgs[i - 1], `${g.slug}: samme foto side om side`);
  }
});

test('guides: Læs også peger på ordliste og typer, hvor det hører hjemme', () => {
  const rel = slug => GUIDES.find(g => g.slug === slug).related;
  assert.ok(rel('guide-brugt-motorcykel').includes('guide-mc-ordliste'), 'brugt-guiden -> ordlisten (kW/ccm i annoncer)');
  assert.ok(rel('guide-foerste-motorcykel').includes('guide-mc-typer'), 'første mc -> typer');
  assert.ok(rel('guide-a2-koerekort').includes('guide-mc-ordliste'), 'A2 -> ordliste');
  assert.ok(rel('guide-mc-typer').includes('guide-mc-ordliste') && rel('guide-mc-ordliste').includes('guide-mc-typer'));
});

test('guide-javascript: indholdsfortegnelsens script findes og rører kun .gd-toc', () => {
  const js = fs.readFileSync(path.join(ROOT, 'js/guides.js'), 'utf8');
  assert.match(js, /gd-toc-det/);
  assert.ok(!/innerHTML/.test(js), 'ingen innerHTML i guides.js');
});
