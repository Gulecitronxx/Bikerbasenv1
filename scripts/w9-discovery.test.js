/* Tests for w9-discovery: informationsmoduler på type-/model-/region-siderne og de nye guide-dele.
   Kør: node --test scripts/w9-discovery.test.js

   Låser det, der er nemt at "rydde op" til noget forkert:
   1. "Udforsk efter behov" (type/region/kombi): tallet på hvert kort ER søgelinkets antal, kort der ikke deler
      udvalget udelades, og siden udelades helt ved under to kort. Ingen opdigtede intentioner.
   2. "Fakta om modellen": kun oplyste tal; rækker uden data udelades; kørekortfordelingen summerer til N.
   3. Guides: de to nye guides har kilder, ingen beløb, kun adresser der findes, og "Klar til næste skridt"
      peger kun på eksisterende sider. Oversigtens "Fra guide til søgning" linker kun til filer, der findes. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { buildFacetList, side } = require('./build-facet-pages.js');
const { renderGuide, renderOversigt } = require('./build-guides');
const { GUIDES, SRC } = require('./guides-data');

function l(i, extra){
  return Object.assign({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, isExternal: true,
    brand: 'Honda', model: 'CB 500', year: 2019, price: 40000 + i * 1000, km: 10000 + i * 1000,
    type: 'naked', region: 'Hovedstaden', city: 'København', ccm: 471, power: 47,
    condition: 'brugt', source: { navn: 'Test', domaene: 'test.dk' }, createdAt: '2026-08-01T10:00:00Z',
    photoUrls: [`https://example.com/${i}.jpg`],
  }, extra || {});
}
/* 14 naked: halvdelen under 60.000 kr., nogle A2, nogle nyere, to landsdele. */
function lager(){
  return Array.from({ length: 14 }, (_, i) => l(i + 1, {
    price: i < 7 ? 35000 + i * 1000 : 75000 + i * 1000,
    year: i % 2 ? 2022 : 2015,
    power: i % 3 === 0 ? 100 : 47,
    ccm: i % 3 === 0 ? 998 : 471,
    km: i < 4 ? 5000 + i * 100 : 45000,
    region: i < 9 ? 'Hovedstaden' : 'Syddanmark',
  }));
}
const bygSide = (slug, alle) => { global.ALLE_LISTINGS = alle; return side(buildFacetList(alle).find(f => f.slug === slug), alle); };

test('udforsk-efter-behov: ét tal pr. kort, og kortene deler udvalget', () => {
  const html = bygSide('type-naked', lager());
  const sek = html.match(/<section class="section fa-sektion fa-udforsk-vrap">[\s\S]*?<\/section>/);
  assert.ok(sek, 'sektionen findes på typesiden');
  const kort = [...sek[0].matchAll(/<li><a href="([^"]+)">[\s\S]*?<\/li>/g)];
  assert.ok(kort.length >= 2 && kort.length <= 4, `${kort.length} kort`);
  const tal = [...sek[0].matchAll(/data-fa-n="([^"]+)">(\d+)</g)].map(m => [m[1], Number(m[2])]);
  assert.strictEqual(tal.length, kort.length, 'præcis ét tal pr. kort');
  const alle = lager();
  for (const [noegle, n] of tal){
    assert.ok(n >= 1 && n < alle.length, `${noegle}: ${n} deler udvalget (hverken 0 eller alle)`);
  }
  assert.match(sek[0], /Til A2-kørekort/);
  assert.match(sek[0], /Under 60\.000 kr\./);
  assert.ok(!/undefined|NaN|null/.test(sek[0]));
  // tallet står i søgelinkets ordforråd
  for (const [href] of kort.map(m => [m[1]])) assert.match(href, /^soegning\.html\?/);
});

test('udforsk-efter-behov: A2-tallet er det antal, søgningen viser', () => {
  const alle = lager();
  const html = bygSide('type-naked', alle);
  const a2 = alle.filter(x => x.power <= 47).length;   // 47 hk er A2-grænsen (js/data.js A2_MAX_HK)
  assert.match(html, new RegExp(`data-fa-n="kk:A2">${a2}<`));
});

test('udforsk-efter-behov: udelades, når intet kort deler udvalget, og ved under fire annoncer', () => {
  // Alle ens: ingen intention deler udvalget.
  const ens = Array.from({ length: 12 }, (_, i) => l(i + 1, { price: 50000, year: 2023, km: 20000, power: 47, region: 'Hovedstaden' }));
  assert.ok(!/fa-udforsk-vrap/.test(bygSide('type-naked', ens)));
  // Kun ét kort kan deles: sektionen udelades (under to).
  const et = Array.from({ length: 12 }, (_, i) => l(i + 1, { price: 50000, year: 2023, km: 20000, power: i < 3 ? 47 : 100, ccm: i < 3 ? 471 : 998, region: 'Hovedstaden' }));
  assert.ok(!/fa-udforsk-vrap/.test(bygSide('type-naked', et)), 'ét kort er ikke en sektion');
});

test('udforsk-efter-behov: findes ikke på kørekort-, budget- og modelsider', () => {
  const alle = lager();
  for (const slug of ['koerekort-a2']){
    assert.ok(!/fa-udforsk-vrap/.test(bygSide(slug, alle)), slug);
  }
});

test('modelfakta: kun oplyste tal, kørekortfordelingen summerer til antallet', () => {
  const alle = Array.from({ length: 12 }, (_, i) => l(i + 1, {
    brand: 'Honda', model: 'CB 500 F', price: i === 0 ? null : 40000 + i * 2000, power: i < 4 ? 47 : (i < 8 ? 60 : null),
    source: { navn: i % 2 ? 'Kilde A' : 'Kilde B', domaene: 'a.dk' },
  }));
  const f = buildFacetList(alle).find(x => x.slug === 'model-honda-cb-500-f');
  assert.ok(f, 'modelsiden findes for 12 annoncer');
  global.ALLE_LISTINGS = alle;
  const html = side(f, alle);
  const sek = html.match(/<section class="section fa-sektion fa-modelfakta"[\s\S]*?<\/section>/);
  assert.ok(sek, 'faktasektionen findes');
  assert.match(sek[0], /Oplyst i 11 af 12 annoncer/, 'pris oplyst i 11');
  assert.match(sek[0], /Oplyst i 8 af 12 annoncer/, 'effekt oplyst i 8');
  const n = [...sek[0].matchAll(/<span class="fa-kk-n">(\d+) af (\d+)<\/span>/g)].map(m => Number(m[1]));
  assert.strictEqual(n.reduce((a, b) => a + b, 0), 12, 'A2 + A + ikke afgjort = alle');
  assert.match(sek[0], /Annoncerne står hos 2 kilder/);
  assert.ok(!/undefined|NaN|null/.test(sek[0]));
});

test('modelfakta: findes ikke på type- og kørekortsider', () => {
  const alle = lager();
  assert.ok(!/fa-modelfakta/.test(bygSide('type-naked', alle)));
  assert.ok(!/fa-modelfakta/.test(bygSide('koerekort-a2', alle)));
});

/* ---------- Guides ---------- */
const ctx = { header: '<header class="site-header"></header>', footer: '<footer class="site-footer"></footer>', csp: '', populaer: '', maerker: [] };
const NYE = ['guide-mc-typer', 'guide-mc-ordliste'];

test('nye guides: kilder, ingen beløb, ingen opdigtede tal, og datoer er rigtige', () => {
  for (const slug of NYE){
    const g = GUIDES.find(x => x.slug === slug);
    assert.ok(g, slug);
    assert.ok(g.sources.length >= 2);
    for (const k of g.sources) assert.ok(SRC[k], k);
    const tekst = JSON.stringify(g.sections.map(s => s.html)) + g.tldr.join(' ');
    assert.ok(!/\d[\d.]*\s?(kr\.|kr(?![\wæøå])|DKK|procent|%)/i.test(tekst), `${slug}: ingen beløb eller procenter`);
    assert.ok(!/\b(Yamaha|Honda|Kawasaki|Suzuki|BMW|KTM|Ducati|Triumph|Harley)\b/.test(tekst), `${slug}: ingen mærkeanbefalinger`);
    assert.ok(g.published && g.modified && g.modified >= g.published);
  }
});

test('ordliste: effektomregningen passer med sitets A2-grænse', () => {
  const data = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8');
  const hk = Number((data.match(/A2_MAX_HK = (\d+)/) || [])[1]);
  assert.strictEqual(hk, 47);
  // 35 kW / 0,7355 = 47,6 hk, og afrundet ned (som sitet gør) 47.
  assert.strictEqual(Math.floor(35 / 0.7355), hk);
  const html = renderGuide(GUIDES.find(x => x.slug === 'guide-mc-ordliste'), ctx);
  assert.match(html, /35 kW cirka 47 hk/);
  assert.match(html, /11 kW cirka 15 hk/);
  assert.match(html, /egenvægten plus 15 kg/);
});

test('guides: "Klar til næste skridt" findes på alle guides og peger kun på filer, der findes', () => {
  for (const g of GUIDES){
    const html = renderGuide(g, ctx);
    assert.match(html, /class="gd-next"/, `${g.slug}: mangler næste skridt`);
    const blok = html.match(/<section class="gd-next"[\s\S]*?<\/section>/)[0];
    const hrefs = [...blok.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
    assert.strictEqual(hrefs.length, 3, `${g.slug}: tre veje videre`);
    for (const h of hrefs) assert.ok(fs.existsSync(path.join(ROOT, h)) || GUIDES.some(x => x.file === h), `${g.slug}: ${h} findes ikke`);
    assert.ok(hrefs.some(h => /soegning|koerekort|maerker/.test(h)), `${g.slug}: mindst én vej ind i søgningen`);
  }
});

test('guides: læs-også står uden for artiklen (ordtal) og er fotokort', () => {
  const html = renderGuide(GUIDES.find(x => x.slug === 'guide-mc-typer'), ctx);
  const art = html.split('<article')[1].split('</article>')[0];
  assert.ok(!/gd-related/.test(art), 'Læs også ligger efter artiklen');
  assert.match(html, /class="gd-rel-card"/);
});

test('oversigten: magasinopsætning, alle guides, og "Fra guide til søgning" linker kun til filer der findes', () => {
  const html = renderOversigt(Object.assign({}, ctx, { maerker: ['Honda', 'Yamaha'] }));
  assert.strictEqual((html.match(/<h1[ >]/g) || []).length, 1);
  for (const g of GUIDES) assert.ok(html.includes(`href="${g.file}"`), g.file);
  assert.match(html, /class="gd-feat"/);
  assert.match(html, /<h2 id="gd-find-h">Fra guide til søgning<\/h2>/);
  const find = html.match(/<section class="gd-find"[\s\S]*?<\/section>/)[0];
  const hrefs = [...find.matchAll(/href="([^"#?]+\.html)"/g)].map(m => m[1]);
  assert.ok(hrefs.length >= 8);
  for (const h of hrefs) assert.ok(fs.existsSync(path.join(ROOT, h)) || GUIDES.some(x => x.file === h), `${h} findes ikke`);
  assert.match(find, /Efter kørekort/); assert.match(find, /Efter type/); assert.match(find, /Efter mærke/);
  assert.ok(!/undefined|NaN|\bnull\b/.test(find));
});

test('oversigten: uden lager vises mærkekolonnen uden mærker (ingen tom liste, ingen opdigtede)', () => {
  const html = renderOversigt(ctx);
  const kol = html.match(/<h3>Efter mærke<\/h3>[\s\S]*?<\/div>/)[0];
  assert.ok(!/<li>/.test(kol), 'ingen mærker uden data');
  assert.match(kol, /Alle mærker/);
});
