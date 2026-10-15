/* Tests for den rene logik i js/mine-annoncer.js (statuser, kladde, tal,
   række-metadata). DOM-koden testes i browseren; her låses det, siden VISER:
   kun statuser databasen kender, og kun tal beregnet af brugerens egne data. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const læs = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const M = new Function('document', 'window', 'Store', 'db',
  ['data.js', 'icons.js', 'mine-annoncer.js'].map(læs).join('\n;\n')
  + '\n;return { listingStatus, statusVisning, naesteStatus, rowMeta, draftSummary, initials, oversigtTal, sortListings };')(
  { readyState: 'loading', addEventListener(){}, querySelector(){ return null; } }, {}, {}, { enabled: false });

test('listingStatus: hidden=pause, sold=solgt, alt andet aktivt', () => {
  assert.equal(M.listingStatus({ status: 'hidden' }), 'paused');
  assert.equal(M.listingStatus({ status: 'sold' }), 'sold');
  assert.equal(M.listingStatus({ status: 'active' }), 'active');
  assert.equal(M.listingStatus({}), 'active');
});

test('statusVisning kender kun Aktiv / På pause / Solgt / Kladde — ingen "Udløbet"', () => {
  const labels = ['active', 'paused', 'sold', 'draft'].map(s => M.statusVisning(s).label);
  assert.deepEqual(labels, ['Aktiv', 'På pause', 'Solgt', 'Kladde']);
  assert.ok(!labels.includes('Udløbet'));
});

test('naesteStatus: pause <-> aktiv, solgt kan sættes til salg igen', () => {
  assert.equal(M.naesteStatus('active').status, 'hidden');
  assert.equal(M.naesteStatus('paused').status, 'active');
  assert.equal(M.naesteStatus('sold').status, 'active');
  assert.equal(M.naesteStatus('active').knap, 'Sæt på pause');
});

test('rowMeta: "år | km | type" og kun oplyste dele', () => {
  assert.equal(M.rowMeta({ year: 2022, km: 12834, type: 'sport' }), '2022 | 12.834 km | Sport');
  assert.equal(M.rowMeta({ year: 2022 }), '2022');
  assert.equal(M.rowMeta({}), '');
});

test('draftSummary: tom kladde tæller ikke, udfyldt giver titel', () => {
  assert.equal(M.draftSummary(null), null);
  assert.equal(M.draftSummary({}), null);
  assert.equal(M.draftSummary({ form: { brand: '', model: '', city: 'Aarhus' } }), null);
  const k = M.draftSummary({ form: { brand: 'Suzuki', model: 'GSX-S750', year: 2020, price: null, city: 'Randers' } });
  assert.equal(k.titel, 'Suzuki GSX-S750');
  assert.equal(k.pris, null);
  assert.equal(k.sted, 'Randers');
  assert.equal(M.draftSummary({ form: { year: 2020 } }).titel, 'Ufærdig annonce');
});

test('initials', () => {
  assert.equal(M.initials('Jonas Pedersen'), 'JP');
  assert.equal(M.initials('jonas'), 'J');
  assert.equal(M.initials(''), '?');
});

test('oversigtTal beregnes af brugerens data', () => {
  const egne = [{ status: 'active' }, {}, { status: 'hidden' }, { status: 'sold' }];
  const t = M.oversigtTal(egne, { form: { brand: 'X' } }, 7, 2);
  assert.deepEqual(t, { aktive: 2, pause: 1, solgt: 1, kladder: 1, favoritter: 7, agenter: 2 });
  assert.equal(M.oversigtTal([], {}, 0, 0).kladder, 0);
});

test('sortListings: nyeste først og pris', () => {
  const l = [{ id: 1, price: 5, year: 2000, createdAt: '2026-01-01' }, { id: 2, price: 9, year: 2010, createdAt: '2026-03-01' }];
  assert.deepEqual(M.sortListings(l, 'date').map(x => x.id), [2, 1]);
  assert.deepEqual(M.sortListings(l, 'price-asc').map(x => x.id), [1, 2]);
  assert.deepEqual(M.sortListings(l, 'year-desc').map(x => x.id), [2, 1]);
});
