/* Tests for js/sortering.js — rækkefølgen er et løfte, og den køres nu to
   steder (scripts/build-srp.js i Node og js/search.js i browseren). Det her
   låser reglerne, så flytningen (B4) og fremtidige rettelser ikke kan ændre
   rækkefølgen af ét kort, uden at en test siger det. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const læs = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
// Samme stubbe som scripts/shared.js browserModules(): components.js vil have
// document/Store/db, men sorteringen rører dem ikke.
const Sortering = new Function('document', 'Store', 'window', 'db',
  ['data.js', 'icons.js', 'components.js', 'sortering.js'].map(læs).join('\n;\n')
  + '\n;return Sortering;')(
  { readyState: 'loading', addEventListener(){}, querySelector(){ return null; } },
  { getUser: () => null, isFavorite: () => false, isComparing: () => false, getCompare: () => [] },
  {}, { enabled: false, photoUrl: () => null });

const foto = 'https://example.test/f.webp';
// Fuldt oplyst (pris, km, kørekort udledt af ccm/hk, årgang, ccm, hk, stand, beskrivelse).
const fuld = (id, extra) => Object.assign({
  id, brand: 'Honda', model: 'CB', price: 50000, km: 10000, year: 2020, ccm: 650, power: 95,
  condition: 'brugt', description: 'x'.repeat(100), photoUrls: [foto], createdAt: null,
}, extra);

test('blandet: samme input i anden rækkefølge giver samme output (determinisme)', () => {
  const liste = [fuld('c'), fuld('a'), fuld('b', { photoUrls: [] }), fuld('d', { price: null }), fuld('e', { photoUrls: [] })];
  const a = Sortering.sorter(liste.slice(), 'blandet').map(l => l.id);
  const b = Sortering.sorter(liste.slice().reverse(), 'blandet').map(l => l.id);
  assert.deepEqual(a, b);
});

test('blandet: annoncer uden foto fordeles med midtpunktsudtagning, ikke i en klump', () => {
  // 8 med foto + 2 uden → n=10, m=2 → pladser floor((0.5)*5)=2 og floor(1.5*5)=7.
  const med = Array.from({ length: 8 }, (_, i) => fuld('m' + i));
  const uden = [fuld('u0', { photoUrls: [] }), fuld('u1', { photoUrls: [] })];
  const ud = Sortering.sorter(med.concat(uden), 'blandet');
  assert.equal(ud.length, 10);
  assert.deepEqual(ud.map((l, i) => (l.photoUrls.length ? null : i)).filter(i => i !== null), [2, 7]);
});

test('blandet: inden for gruppen står den mest oplyste først, ellers id', () => {
  const a = fuld('zzz');                          // fuldt hus
  const b = fuld('aaa', { km: null, power: null }); // 3 point mindre
  const c = fuld('mmm');                           // fuldt hus, id mellem
  const ud = Sortering.sorter([b, a, c], 'blandet').map(l => l.id);
  assert.deepEqual(ud, ['mmm', 'zzz', 'aaa']);
  assert.ok(Sortering.annonceOplysthed(a) > Sortering.annonceOplysthed(b));
});

test('price-asc / km-asc: ukendt værdi bagest — det ukendte vinder aldrig en sortering', () => {
  const liste = [fuld('dyr', { price: 90000 }), fuld('ukendt', { price: null }), fuld('billig', { price: 1000 })];
  assert.deepEqual(Sortering.sorter(liste.slice(), 'price-asc').map(l => l.id), ['billig', 'dyr', 'ukendt']);
  assert.deepEqual(Sortering.sorter(liste.slice(), 'price-desc').map(l => l.id), ['dyr', 'billig', 'ukendt']);
  const km = [fuld('a', { km: null }), fuld('b', { km: 500 })];
  assert.deepEqual(Sortering.sorter(km, 'km-asc').map(l => l.id), ['b', 'a']);
});

test('date-desc: daterede først (nyeste øverst), de udaterede bagefter i blandet orden', () => {
  const liste = [
    fuld('u1'), fuld('u2', { photoUrls: [] }),
    fuld('gammel', { createdAt: '2026-01-01T00:00:00Z' }),
    fuld('ny', { createdAt: '2026-08-01T00:00:00Z' }),
  ];
  const ud = Sortering.sorter(liste, 'date-desc').map(l => l.id);
  assert.deepEqual(ud.slice(0, 2), ['ny', 'gammel']);
  assert.deepEqual(ud.slice(2).sort(), ['u1', 'u2']);
});

test('ukendt sortering falder tilbage til date-desc i stedet for at vælte', () => {
  const liste = [fuld('a', { createdAt: '2026-01-01' }), fuld('b', { createdAt: '2026-02-01' })];
  assert.deepEqual(Sortering.sorter(liste, 'findes-ikke').map(l => l.id), ['b', 'a']);
});
