/* Tests for scripts/seo-sider.js: hvilke af de nye søgeintention-sider (priser, byer, flere
   modeller, mærke+type) der får lov at eksistere. Kør: node --test scripts/seo-sider.test.js

   Reglen bag hver test er D-010-lærdommen: ingen skov af tomme sider, ingen duplicate content. */
const test = require('node:test');
const assert = require('node:assert');
const S = require('./seo-sider');

const TABEL = new Map([
  ['8000', { navn: 'Aarhus C', region: 'Midtjylland' }],
  ['8200', { navn: 'Aarhus N', region: 'Midtjylland' }],
  ['8210', { navn: 'Aarhus V', region: 'Midtjylland' }],
  ['8700', { navn: 'Horsens', region: 'Midtjylland' }],
  ['6630', { navn: 'Rødding', region: 'Syddanmark' }],
  ['5000', { navn: 'Odense C', region: 'Syddanmark' }],
  ['2200', { navn: 'København N', region: 'Hovedstaden' }],
  ['8520', { navn: 'Lystrup', region: 'Midtjylland' }],
]);

let teller = 0;
function l(extra){
  teller++;
  return Object.assign({
    id: `id-${teller}`, brand: 'Honda', model: 'CB 500', year: 2015 + (teller % 8), price: 30000 + teller * 1000,
    km: 10000, type: 'naked', postnr: '8700', city: 'Horsens', region: 'Midtjylland',
  }, extra || {});
}
const mange = (n, extra) => Array.from({ length: n }, () => l(typeof extra === 'function' ? extra() : extra));

test('renBynavn: postdistrikter slås sammen, rigtige bynavne røres ikke', () => {
  assert.strictEqual(S.renBynavn('Aarhus C'), 'Aarhus');
  assert.strictEqual(S.renBynavn('Odense SØ'), 'Odense');
  assert.strictEqual(S.renBynavn('København NV'), 'København');
  assert.strictEqual(S.renBynavn('Svenstrup J'), 'Svenstrup');
  assert.strictEqual(S.renBynavn('Horsens'), 'Horsens');
  assert.strictEqual(S.renBynavn('Ry'), 'Ry');
  assert.strictEqual(S.renBynavn('Vejle Øst'), 'Vejle Øst');
  assert.strictEqual(S.renBynavn('Nørre Aaby'), 'Nørre Aaby');
  assert.strictEqual(S.renBynavn(''), '');
});

test('byNavn: postnummeret afgør, bynavnet i annoncen er reserven', () => {
  assert.strictEqual(S.byNavn('8200', 'Århus N', TABEL), 'Aarhus', 'DAWA-navnet vinder over kildens stavemåde');
  assert.strictEqual(S.byNavn('9999', 'Skagen', TABEL), 'Skagen', 'ukendt postnummer => annoncens by');
  assert.strictEqual(S.byNavn('', 'Skagen', TABEL), 'Skagen');
  assert.strictEqual(S.byNavn(undefined, '', TABEL), '');
});

test('byGrupper: Aarhus C/N/V er én by med tre postnumre', () => {
  const alle = [l({ postnr: '8000' }), l({ postnr: '8200' }), l({ postnr: '8210' }), l({ postnr: '8700' }), l({ postnr: '', city: '' })];
  const g = S.byGrupper(alle, TABEL);
  assert.strictEqual(g.size, 2, 'annoncen uden postnummer og by tæller ikke med');
  const aarhus = g.get('by-aarhus');
  assert.deepStrictEqual([...aarhus.postnumre].sort(), ['8000', '8200', '8210']);
  assert.strictEqual(aarhus.items.length, 3);
});

test('vaelgByer: 10 annoncer og ægte indhold giver en side', () => {
  const alle = [...mange(10, { postnr: '8700', city: 'Horsens' }), ...mange(30, { postnr: '8520', city: 'Lystrup' })];
  const v = S.vaelgByer(alle, TABEL);
  const horsens = v.find(b => b.slug === 'by-horsens');
  assert.strictEqual(horsens.afvist, null);
  assert.strictEqual(horsens.region, 'Midtjylland');
  assert.deepStrictEqual(horsens.postnumre, ['8700']);
});

test('vaelgByer: under tærsklen, region-dublet og tyndt indhold afvises med årsag', () => {
  const alle = [
    ...mange(9, { postnr: '8700', city: 'Horsens' }),                                    // for få
    ...mange(40, { postnr: '8520', city: 'Lystrup' }),
    ...mange(30, { postnr: '6630', city: 'Rødding', region: 'Syddanmark' }),            // 30 af 31 i Syddanmark
    ...mange(1, { postnr: '5000', city: 'Odense C', region: 'Syddanmark' }),
    ...mange(12, { postnr: '2200', city: 'København N', region: 'Hovedstaden', price: null, year: null }), // tyndt (og 100 % af regionen)
  ];
  const v = Object.fromEntries(S.vaelgByer(alle, TABEL).map(b => [b.slug, b.afvist]));
  assert.strictEqual(v['by-horsens'], 'for-faa');
  assert.strictEqual(v['by-lystrup'], 'region-dublet', '40 af 49 i Midtjylland = 82 % => landsdelssiden er svaret');
  assert.strictEqual(v['by-roedding'], 'region-dublet');
  assert.strictEqual(v['by-kobenhavn'] ?? v['by-koebenhavn'], 'region-dublet');
  const tyndt = S.vaelgByer([...mange(12, { postnr: '8700', city: 'Horsens', price: null, year: null }), ...mange(40, { postnr: '8520', city: 'Lystrup' }), ...mange(40, { postnr: '8520', city: 'Lystrup', region: 'Nordjylland' })], TABEL);
  assert.strictEqual(tyndt.find(b => b.slug === 'by-horsens').afvist, 'tyndt-indhold', 'ingen oplyst pris og årgang => tomme ord');
});

test('vaelgByer: sorteret efter antal, og samme input giver samme svar', () => {
  const alle = [...mange(12, { postnr: '8700' }), ...mange(20, { postnr: '8520', city: 'Lystrup' }), ...mange(60, { postnr: '5000', city: 'Odense C', region: 'Syddanmark' }), ...mange(60, { postnr: '6630', city: 'Rødding', region: 'Syddanmark' })];
  const a = S.vaelgByer(alle, TABEL), b = S.vaelgByer(alle.slice().reverse(), TABEL);
  assert.deepStrictEqual(a.map(x => x.slug), b.map(x => x.slug));
  assert.deepStrictEqual(a.map(x => x.antal), [...a.map(x => x.antal)].sort((x, y) => y - x));
});

test('vaelgKombi: typesiden i andet ord og for små kombinationer afvises', () => {
  const typer = ['naked', 'cruiser', 'adventure'];
  const alle = [
    ...mange(20, { brand: 'Honda', type: 'cruiser' }), ...mange(10, { brand: 'Yamaha', type: 'cruiser' }),   // Honda 67 % af typen
    ...mange(25, { brand: 'Honda', type: 'adventure' }), ...mange(5, { brand: 'KTM', type: 'adventure' }),    // 83 % => dublet
    ...mange(14, { brand: 'BMW', type: 'naked' }), ...mange(40, { brand: 'Triumph', type: 'naked' }),         // 14 < 15
    ...mange(30, { brand: 'Ukendt', type: 'naked' }),                                                         // aldrig "Ukendt"
    ...mange(30, { brand: 'Honda', type: null }),
  ];
  const v = Object.fromEntries(S.vaelgKombi(alle, typer).map(k => [k.slug, k.afvist]));
  assert.strictEqual(v['mc-honda-cruiser'], null);
  assert.strictEqual(v['mc-honda-adventure'], 'type-dublet');
  assert.strictEqual(v['mc-bmw-naked'], 'for-faa');
  assert.strictEqual(v['mc-triumph-naked'], null, '40 af 84 naked (de 30 "Ukendt" tæller med i typen) = 48 % af typesiden => ok');
  assert.ok(!('mc-ukendt-naked' in v));
  assert.ok(!Object.keys(v).some(k => /null/.test(k)), 'annoncer uden type danner ingen kombination');
});

test('vaelgKombi: ukendte typer og tyndt indhold', () => {
  const alle = [...mange(20, { brand: 'Honda', type: 'cruiser', price: null, year: null }), ...mange(20, { brand: 'Yamaha', type: 'cruiser' }), ...mange(20, { brand: 'Honda', type: 'raket' })];
  const v = Object.fromEntries(S.vaelgKombi(alle, ['cruiser']).map(k => [k.slug, k.afvist]));
  assert.strictEqual(v['mc-honda-cruiser'], 'tyndt-indhold');
  assert.ok(!('mc-honda-raket' in v), 'kun typer fra TYPES');
});

test('harIndhold: mindst tre oplyste priser og tre troværdige årgange', () => {
  assert.strictEqual(S.harIndhold(mange(5)), true);
  assert.strictEqual(S.harIndhold(mange(5, { price: null })), false);
  assert.strictEqual(S.harIndhold(mange(5, { price: 0 })), false, 'pris 0 er ikke en pris');
  assert.strictEqual(S.harIndhold(mange(5, { year: 2090 })), false, 'årgang i fremtiden er ikke troværdig');
  assert.strictEqual(S.harIndhold(mange(2)), false);
});

test('tærsklerne: modeller 5, byer 10, priser 10, kombi strengest', () => {
  assert.strictEqual(S.TAERSKLER.model, 5);
  assert.strictEqual(S.TAERSKLER.by, 10);
  assert.strictEqual(S.TAERSKLER.budget, 10);
  assert.ok(S.TAERSKLER.kombi > S.TAERSKLER.indeks, 'en kombination er en tredje vej ind => højere krav');
});

test('BUDGET_TRIN: stigende, unikke, runde, og slugs følger', () => {
  assert.deepStrictEqual(S.BUDGET_TRIN, [...S.BUDGET_TRIN].sort((a, b) => a - b));
  assert.strictEqual(new Set(S.BUDGET_TRIN).size, S.BUDGET_TRIN.length);
  assert.ok(S.BUDGET_TRIN.every(n => n % 5000 === 0));
  assert.strictEqual(S.budgetSlug(50000), 'budget-under-50000');
  assert.strictEqual(S.bySlug('Nørresundby'), 'by-noerresundby');
  assert.strictEqual(S.kombiSlug('Harley-Davidson', 'cruiser'), 'mc-harley-davidson-cruiser');
});

test('underGraense: kun annoncer med pris, grænsen er inklusiv', () => {
  const alle = [l({ price: 49999 }), l({ price: 50000 }), l({ price: 50001 }), l({ price: null }), l({ price: 0 })];
  assert.strictEqual(S.underGraense(alle, 50000).length, 2);
});

test('visModel: søgenavn i titlen, kildens navn bevares ellers', () => {
  assert.strictEqual(S.visModel('Honda', 'CRF 1100 L Africa'), 'CRF 1100 L Africa Twin');
  assert.strictEqual(S.visModel('Honda', 'CMX 500 Rebel'), 'CMX 500 Rebel');
  assert.strictEqual(S.visModel('Yamaha', 'CRF 1100 L Africa'), 'CRF 1100 L Africa', 'aliaset er pr. mærke');
});

test('median', () => {
  assert.strictEqual(S.median([]), null);
  assert.strictEqual(S.median([5]), 5);
  assert.strictEqual(S.median([1, 3]), 2);
  assert.strictEqual(S.median([1, 2, 10]), 2);
});
