/* Tests for facet-siderne (type, kørekort, landsdel, model) efter designstrømmen
   gauntlet/facet. Kør: node --test scripts/facet-sider.test.js

   Låser tre ting, der er nemme at "rydde op" til noget forkert:
   1. Kørekortfaktaene (kilde: Færdselsstyrelsen, se scripts/facet-indhold.js).
   2. Kategori A er IKKE "alt": kun annoncer med oplyst effekt over A2-grænsen.
      Ukendt effekt er hverken A eller ikke-A ("vi gætter aldrig").
   3. SEO-kontrakten: én h1, canonical, noindex under tærsklen, og at hvert
      facet-link (type/kørekort/landsdel/model) stadig står på siden. */
const test = require('node:test');
const assert = require('node:assert');
const { KK_FAKTA, KK_BOKSE, TYPE_VIDEN, GUIDE } = require('./facet-indhold');
const { THRESHOLD, buildFacetList, uoplystAntal, side, facetSearchUrl, kraeverA } = require('./build-facet-pages.js');

function l(i, extra){
  return Object.assign({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, isExternal: true,
    brand: 'Honda', model: 'CB 500', year: 2019, price: 40000 + i * 1000, km: 10000 + i,
    type: 'naked', region: 'Hovedstaden', city: 'København', ccm: 471, power: 47,
    condition: 'brugt', source: { navn: 'Test', domaene: 'test.dk' }, createdAt: '2026-08-01T10:00:00Z',
  }, extra || {});
}

test('kørekortfakta: de verificerede tal står på A1, A2 og A', () => {
  const tekst = k => KK_FAKTA[k].map(f => f.titel + ' ' + f.tekst).join(' | ');
  assert.match(tekst('A1'), /11 kW/); assert.match(tekst('A1'), /0,1 kW/); assert.match(tekst('A1'), /18 år/);
  assert.match(tekst('A2'), /35 kW/); assert.match(tekst('A2'), /0,2 kW/); assert.match(tekst('A2'), /20 år/);
  assert.match(tekst('A2'), /dobbelt/); assert.match(tekst('A2'), /22 år/); assert.match(tekst('A2'), /24 år/);
  assert.match(tekst('A'), /24 år/); assert.match(tekst('A'), /22 år/);
  assert.ok(KK_FAKTA.A2.length >= 4 && KK_FAKTA.A2.length <= 5);
  for (const k of ['A1', 'A2', 'A']) assert.ok(KK_BOKSE[k].maa.length && KK_BOKSE[k].ikkeSe.length && KK_BOKSE[k].raad.length);
});

test('alle otte typer har fire redaktionelle bokse uden tal om lageret', () => {
  for (const [t, bokse] of Object.entries(TYPE_VIDEN)){
    assert.strictEqual(bokse.length, 4, t);
    for (const b of bokse) assert.ok(!/\d{2,}\s*(annoncer|stk)/i.test(b.tekst), `${t}: ${b.titel}`);
  }
});

test('kategori A: kun oplyst effekt over A2-grænsen, aldrig ukendt effekt', () => {
  assert.strictEqual(kraeverA(l(1, { power: 100 })), true);
  assert.strictEqual(kraeverA(l(2, { power: 47 })), false);
  assert.strictEqual(kraeverA(l(3, { power: null })), false, 'ukendt effekt er ikke A');
  assert.strictEqual(kraeverA(l(4, { power: 100, kanNedsaettesA2: true })), false);
  const a = buildFacetList([]).find(f => f.slug === 'koerekort-a');
  assert.ok(a && a.match(l(5, { power: 120 })) && !a.match(l(6, { power: null })));
  assert.strictEqual(uoplystAntal(a, [l(1, { power: null }), l(2, { power: 90 })]), 1);
  assert.match(facetSearchUrl(a), /koerekort=A/); assert.match(facetSearchUrl(a), /hkMin=48/);
});

test('side: type over tærsklen er indekserbar, har én h1, canonical og alle faste links', () => {
  global.ALLE_LISTINGS = [];
  const alle = Array.from({ length: THRESHOLD + 2 }, (_, i) => l(i + 1));
  const facet = buildFacetList(alle).find(f => f.slug === 'type-naked');
  const html = side(facet, alle);
  assert.strictEqual((html.match(/<h1[ >]/g) || []).length, 1);
  assert.match(html, /<link rel="canonical" href="[^"]*\/type-naked">/);
  assert.ok(!/name="robots"/.test(html));
  assert.match(html, /css\/p-facet\.css/);
  assert.match(html, /<form class="fa-soeg" action="soegning\.html" method="get"/);
  assert.match(html, /<option value="naked" selected>/);
  assert.match(html, new RegExp(GUIDE.foerste.replace('.', '\.')));
  for (const s of ['type-sport.html', 'type-cruiser.html', 'koerekort-a1.html', 'koerekort-a2.html', 'koerekort-a.html']) assert.ok(html.includes(`href="${s}"`), s);
  assert.match(html, /Det skal du vide om naked-motorcykler/);
});

test('side: under tærsklen er noindex, og tom facet har stadig en adresse og et søgelink', () => {
  global.ALLE_LISTINGS = [];
  const alle = [l(1, { type: 'cross' })];
  const cross = buildFacetList(alle).find(f => f.slug === 'type-cross');
  assert.match(side(cross, alle), /<meta name="robots" content="noindex, follow">/);
  const scooter = buildFacetList(alle).find(f => f.slug === 'type-scooter');
  const tom = side(scooter, alle);
  assert.match(tom, /noindex/); assert.match(tom, /soegning\.html\?type=scooter/);
});

test('side: kørekortsiden viser kilden og de verificerede fakta', () => {
  global.ALLE_LISTINGS = [];
  const alle = Array.from({ length: 12 }, (_, i) => l(i + 1));
  const a2 = buildFacetList(alle).find(f => f.slug === 'koerekort-a2');
  const html = side(a2, alle);
  assert.match(html, /fstyr\.dk/);
  assert.match(html, /Op til 35 kW/);
  assert.match(html, /Hvad må du køre med A2\?/);
  assert.match(html, /Hvad kan du ikke se direkte i en annonce\?/);
  assert.match(html, new RegExp(GUIDE.a2.replace('.', '\.')));
  assert.match(html, /ikke er udelukket til et A2-kørekort ud fra det, annoncerne oplyser/);
});

test('type-siden bruger typens eget hero-foto, og alle lagertal står i data-fa-n (ét tal pr. side)', () => {
  global.ALLE_LISTINGS = [];
  const alle = Array.from({ length: THRESHOLD + 3 }, (_, i) => l(i + 1, { type: 'sport', power: 100 }));
  const html = side(buildFacetList(alle).find(f => f.slug === 'type-sport'), alle);
  assert.match(html, /<div class="fa-hero-bike"[^>]*><img src="img\/type\/sport\.webp"/);
  assert.match(html, /data-fa-n="all"/);
  assert.match(html, /data-fa-hydreret/);
  // intet lagertal står uden for et data-fa-n-element i "Se alle"-linket
  assert.match(html, /Se alle <span data-fa-n="all">13<\/span> i søgningen/);
});

test('flertal: "1 A2-motorcykel", ikke "1 A2-motorcykler"', () => {
  global.ALLE_LISTINGS = [];
  const alle = Array.from({ length: THRESHOLD + 2 }, (_, i) => l(i + 1, { type: i === 0 ? 'sport' : 'naked' }));
  const html = side(buildFacetList(alle).find(f => f.slug === 'koerekort-a2'), alle);
  assert.match(html, /<span data-fa-n="type:sport">1<\/span> <span data-fa-ord[^>]*>A2-motorcykel<\/span>/);
  assert.match(html, /<span data-fa-n="type:naked">11<\/span> <span data-fa-ord[^>]*>A2-motorcykler<\/span>/);
});

test('kørekortsiden har foto-guidekort til de reserverede guide-adresser', () => {
  global.ALLE_LISTINGS = [];
  const alle = Array.from({ length: 12 }, (_, i) => l(i + 1));
  const html = side(buildFacetList(alle).find(f => f.slug === 'koerekort-a2'), alle);
  for (const g of [GUIDE.a2, GUIDE.foerste, GUIDE.brugt]) assert.match(html, new RegExp(`<a href="${g.replace('.', '\.')}"><img src="img/`));
});

/* ---------- F2-004 + F2-005: chippens tal = linkets resultat ----------
   Detective runde 2 fandt 5 budgetchips med to `maxPrice` i linket ("Under 30.000 kr. · 55" -> 104 træf)
   og 16+ modelchips, hvis tal og link talte forskellige ting (q= er en delstrengssøgning).
   Testen bygger SIDERNE (side()) for hver facet over et fixturelager og kører hver chip, der bærer et
   tal, gennem søgesidens egen URL-læser (readStateFromURL klippet ud af js/search.js) og
   Filtrering.anvendFiltre — det, browseren gør, når man klikker. Linkene til statiske sider
   (slug.html) regnes med sidens egen match. Ingen streng-søgning efter et bestemt link. */
const { forberedFacetter } = require('./build-facet-pages.js');
const CHIP = require('./seo-chip-tjek.js');
const { Filtrering: FiltreringChip } = require('./shared').browserModules();

function chipRevision(){
  const alle = CHIP.lagerFixture();
  global.ALLE_LISTINGS = alle;
  const facetter = forberedFacetter(alle);
  const ctx = { alle, facetter, Filtrering: FiltreringChip };
  const fejl = [], dubletter = [];
  let tjekket = 0;
  const pr = new Map();
  for (const facet of facetter){
    const html = side(facet, alle);
    for (const chip of CHIP.udtraekChips(html)){
      if (!/^(soegning\.html\?|(?!annonce)[a-z0-9-]+\.html$)/.test(chip.href)) continue;
      const d = /^soegning/.test(chip.href) ? CHIP.dubletNoegler(chip.href) : [];
      if (d.length) dubletter.push(`${facet.slug}: ${chip.href} gentager ${d.join(', ')}`);
      if (chip.tal === null) continue;
      tjekket++;
      pr.set(facet.kind, (pr.get(facet.kind) || 0) + 1);
      const n = CHIP.traefFraHref(chip.href, ctx);
      if (n !== chip.tal) fejl.push(`${facet.slug}: "${chip.tekst}" lover ${chip.tal}, ${chip.href} giver ${n}`);
    }
  }
  return { fejl, dubletter, tjekket, pr, facetter };
}

test('F2-004/F2-005: hver chip på hver facetside lover præcis det antal, linket giver', () => {
  const { fejl, tjekket, pr } = chipRevision();
  assert.ok(tjekket >= 150, `kun ${tjekket} chips blev tjekket — fixture eller parser rammer ikke siderne`);
  for (const k of ['type', 'region', 'koerekort', 'budget', 'model']) assert.ok(pr.get(k) > 0, `ingen chips tjekket på ${k}-sider`);
  assert.deepEqual(fejl, []);
});

test('F2-004: intet søgelink gentager en query-parameter (budgetsiderne havde to maxPrice)', () => {
  const { dubletter } = chipRevision();
  assert.deepEqual(dubletter, []);
});

test('T-001: kørekortsiden koerekort-a2 beholder den kommercielle titel og H1', () => {
  const alle = CHIP.lagerFixture();
  global.ALLE_LISTINGS = alle;
  const f = forberedFacetter(alle).find(x => x.slug === 'koerekort-a2');
  const html = side(f, alle);
  assert.match(html, /<title>Motorcykler til A2-kørekort — Bikerbasen<\/title>/);
  assert.match(html, /<h1>Motorcykler til A2-kørekort<\/h1>/);
});
