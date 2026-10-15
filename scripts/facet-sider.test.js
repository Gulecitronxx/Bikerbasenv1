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
