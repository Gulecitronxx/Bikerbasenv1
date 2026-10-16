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

const KILDE = d => ({ source: { domaene: d } });
test('vaelgByer: en ny by kræver 20 annoncer, eller 15 fra mindst to kilder', () => {
  const alle = [...mange(20, { postnr: '8700', city: 'Horsens', ...KILDE('a.dk') }), ...mange(30, { postnr: '8520', city: 'Lystrup' }), ...mange(40, { postnr: '8520', city: 'Lystrup' })];
  const horsens = S.vaelgByer(alle, TABEL).find(b => b.slug === 'by-horsens');
  assert.strictEqual(horsens.afvist, null);
  assert.strictEqual(horsens.region, 'Midtjylland');
  assert.deepStrictEqual(horsens.postnumre, ['8700']);
  const to = [...mange(8, { postnr: '8700', ...KILDE('a.dk') }), ...mange(7, { postnr: '8700', ...KILDE('b.dk') }), ...mange(60, { postnr: '8520', city: 'Lystrup' })];
  assert.strictEqual(S.vaelgByer(to, TABEL).find(b => b.slug === 'by-horsens').afvist, null, '15 fra to kilder');
  const en = [...mange(16, { postnr: '8700', ...KILDE('a.dk') }), ...mange(60, { postnr: '8520', city: 'Lystrup' })];
  assert.strictEqual(S.vaelgByer(en, TABEL).find(b => b.slug === 'by-horsens').afvist, 'faa-kilder', '16 fra én kilde er flygtigt');
  const faa = [...mange(14, { postnr: '8700', ...KILDE('a.dk') }), ...mange(7, { postnr: '8700', ...KILDE('b.dk') }).slice(0, 0), ...mange(60, { postnr: '8520', city: 'Lystrup' })];
  assert.strictEqual(S.vaelgByer(faa, TABEL).find(b => b.slug === 'by-horsens').afvist, 'for-faa');
});

test('vaelgByer: hysterese — en side, der allerede er indekseret, beholdes til lageret er under 8', () => {
  const rest = mange(60, { postnr: '8520', city: 'Lystrup' });
  const med = n => [...mange(n, { postnr: '8700', ...KILDE('a.dk') }), ...rest];
  const beholdt = new Set(['by-horsens']);
  const find = (alle, opts) => S.vaelgByer(alle, TABEL, opts).find(b => b.slug === 'by-horsens').afvist;
  assert.strictEqual(find(med(10), {}), 'for-faa', 'ny side på 10 fra én kilde: nej');
  assert.strictEqual(find(med(10), { beholdt }), null, 'men findes den som indekseret, bliver den ved');
  assert.strictEqual(find(med(8), { beholdt }), null);
  assert.strictEqual(find(med(7), { beholdt }), 'for-faa', 'under 8: nedlagt');
  assert.strictEqual(find(med(9), {}), 'for-faa');
});

test('vaelgByer: under tærsklen, region-dublet og tyndt indhold afvises med årsag', () => {
  const alle = [
    ...mange(9, { postnr: '8700', city: 'Horsens' }),                                    // for få
    ...mange(40, { postnr: '8520', city: 'Lystrup' }),
    ...mange(30, { postnr: '6630', city: 'Rødding', region: 'Syddanmark' }),            // 30 af 31 i Syddanmark
    ...mange(1, { postnr: '5000', city: 'Odense C', region: 'Syddanmark' }),
    ...mange(22, { postnr: '2200', city: 'København N', region: 'Hovedstaden', price: null, year: null }), // tyndt (og 100 % af regionen)
  ];
  const v = Object.fromEntries(S.vaelgByer(alle, TABEL).map(b => [b.slug, b.afvist]));
  assert.strictEqual(v['by-horsens'], 'for-faa');
  assert.strictEqual(v['by-lystrup'], 'region-dublet', '40 af 49 i Midtjylland = 82 % => landsdelssiden er svaret');
  assert.strictEqual(v['by-roedding'], 'region-dublet');
  assert.strictEqual(v['by-kobenhavn'] ?? v['by-koebenhavn'], 'region-dublet');
  const tyndt = S.vaelgByer([...mange(22, { postnr: '8700', city: 'Horsens', price: null, year: null }), ...mange(40, { postnr: '8520', city: 'Lystrup' }), ...mange(40, { postnr: '8520', city: 'Lystrup', region: 'Nordjylland' })], TABEL);
  assert.strictEqual(tyndt.find(b => b.slug === 'by-horsens').afvist, 'tyndt-indhold', 'ingen oplyst pris og årgang => tomme ord');
});

test('vaelgByer: sorteret efter antal, og samme input giver samme svar', () => {
  const alle = [...mange(22, { postnr: '8700' }), ...mange(25, { postnr: '8520', city: 'Lystrup' }), ...mange(60, { postnr: '5000', city: 'Odense C', region: 'Syddanmark' }), ...mange(60, { postnr: '6630', city: 'Rødding', region: 'Syddanmark' })];
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

test('distinkte: identiske dealer-lagerenheder tæller én gang', () => {
  const ens = mange(4, { price: 114995, year: 2023, km: 0, ...KILDE('mcsyd.dk') }).map(x => ({ ...x }));
  const alle = [...ens, l({ price: 119995, year: 2023, km: 0, ...KILDE('mcsyd.dk') }), l({ price: 114995, year: 2023, km: 0, ...KILDE('anden.dk') })];
  assert.strictEqual(S.distinkte(alle).length, 3, 'fire ens + én anden pris + samme pris fra anden kilde');
  assert.strictEqual(S.distinkte([]).length, 0);
});

test('percentil: en enkelt fejlpris bliver ikke "priser fra"', () => {
  const priser = [1900, ...Array.from({ length: 99 }, (_, i) => 20000 + i * 500)];
  assert.ok(S.percentil(priser, 0.05) > 10000, 'ikke 1.900');
  assert.strictEqual(S.percentil([], 0.05), null);
  assert.strictEqual(S.percentil([5], 0.5), 5);
});

test('tærsklerne: modeller 5 (distinkte), byer 15/20/2 kilder/behold 8, priser 10, kombi strengest', () => {
  assert.strictEqual(S.TAERSKLER.model, 5);
  assert.strictEqual(S.TAERSKLER.by, 15);
  assert.strictEqual(S.TAERSKLER.byStor, 20);
  assert.strictEqual(S.TAERSKLER.byKilder, 2);
  assert.strictEqual(S.TAERSKLER.byBehold, 8);
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

test('T-003 modelKvalificerer: kun distinkte annoncer tæller — 10 identiske dealerenheder er IKKE en side', () => {
  const ens = mange(10, { price: 89995, year: 2024, km: 0, ...KILDE('mcsyd.dk') });
  assert.strictEqual(S.distinkte(ens).length, 1);
  assert.strictEqual(S.modelKvalificerer(ens), false, '10 ens = 1 distinkt');
  const toForskellige = [...mange(8, { price: 89995, year: 2024, km: 0, ...KILDE('mcsyd.dk') }), l({ price: 79995, year: 2023, km: 5000, ...KILDE('mcsyd.dk') }), l({ price: 85000, year: 2022, km: 100, ...KILDE('guloggratis.dk') })];
  assert.strictEqual(S.distinkte(toForskellige).length, 3);
  assert.strictEqual(S.modelKvalificerer(toForskellige), true, '3 forskellige med pris og årgang er nok');
  assert.strictEqual(S.modelKvalificerer(toForskellige.slice(0, 7)), false, 'under 3 forskellige');
  assert.strictEqual(S.modelKvalificerer(mange(4)), false, 'under tærsklen på 5 annoncer');
  assert.strictEqual(S.TAERSKLER.modelDistinkt, 3);
});

test('W6 P3a: annoncer uden pris/årgang fra samme kilde er IKKE identiske lagerenheder', () => {
  const tomme = [1, 2, 3, 4, 5].map(id => ({ id, price: null, year: null, km: null, source: { domaene: 'mcsyd.dk' } }));
  assert.strictEqual(S.distinkte(tomme).length, 5, 'fem ukendte er fem, ikke én');
  const udenPris = [1, 2, 3].map(id => ({ id, price: null, year: 2019, km: 100, source: { domaene: 'mcsyd.dk' } }));
  assert.strictEqual(S.distinkte(udenPris).length, 3, 'uden pris kan vi ikke kalde dem ens');
  // stadig ens, når pris og årgang er oplyst og ens (km må mangle)
  const ens = [1, 2, 3].map(id => ({ id, price: 49995, year: 2024, km: null, source: { domaene: 'mcsyd.dk' } }));
  assert.strictEqual(S.distinkte(ens).length, 1);
  // samme annonce to gange (samme id) tæller stadig én
  assert.strictEqual(S.distinkte([tomme[0], tomme[0]]).length, 1);
});

test('W6 P3c: medianårgang rundes ikke skjult op (2015,5 bliver aldrig 2016)', () => {
  assert.strictEqual(S.medianAarTekst([2014, 2015, 2016, 2018]), '2015–2016');
  assert.strictEqual(S.medianAarTekst([2015, 2016]), '2015–2016');
  assert.strictEqual(S.medianAarTekst([2015, 2016, 2017]), '2016');
  assert.strictEqual(S.medianAarTekst([2016, 2016, 2016, 2018]), '2016');
  assert.strictEqual(S.medianAarTekst([]), null);
  assert.doesNotMatch(S.medianAarTekst([2015, 2016]), /,/);
});
