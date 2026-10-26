/* scripts/maal-aktualitet.js: percentiler, trin og tilstande på et fast snapshot (V7, data). Kør: node --test scripts/maal-aktualitet.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const { maal, percentil } = require('./maal-aktualitet.js');

const NU = new Date('2026-10-26T12:00:00Z');
const siden = d => new Date(NU.getTime() - d * 86_400_000).toISOString();
const r = (dage, domaene, ekstra) => ({ id: Math.random().toString(36), sidst_set: siden(dage), status: 'aktiv', kilde: { navn: domaene, domaene }, ...ekstra });

test('percentil: nearest-rank på en sorteret liste, tom liste giver null', () => {
  assert.equal(percentil([], 50), null);
  assert.equal(percentil([1, 2, 3, 4], 0), 1);
  assert.equal(percentil([1, 2, 3, 4], 50), 3);
  assert.equal(percentil([1, 2, 3, 4], 100), 4);
});

test('produktionens fordeling 26.10.2026 (403 på 9 dage, 332 på 63-71 dage) giver p50 9, p75 63 og 332 over 60 dage', () => {
  const lager = [
    ...Array.from({ length: 403 }, () => r(9.3, 'mcsyd.dk')),
    ...Array.from({ length: 332 }, (_, i) => r(63 + (i % 9), i % 2 ? 'rydbergsmc.dk' : 'jensensmc.dk')),
  ];
  const m = maal(lager, NU);
  assert.equal(m.antal, 735);
  assert.equal(m.percentiler_dage.p50, 9.3);
  assert.ok(m.percentiler_dage.p75 >= 63);
  assert.equal(m.over_14_dage, 332);
  assert.equal(m.over_30_dage, 332);
  assert.equal(m.over_60_dage, 332);
  assert.equal(m.over_90_dage, 0);
  assert.equal(m.fordeling['0-7 d'], 0);
  assert.equal(m.fordeling['7-14 d'], 403);
  assert.equal(m.fordeling['60-90 d'], 332);
  assert.deepEqual(m.tilstande, { aktiv_bekraeftet: 403, aktiv_forsinket: 332 });
  assert.equal(m.kilder['mcsyd.dk'].andel_over_14, 0);
  assert.equal(m.kilder['rydbergsmc.dk'].andel_over_14, 100);
});

test('rækker uden dato tælles ikke med i alder; over 90 dage er "slettet_udloebet"', () => {
  const m = maal([r(2, 'a'), { id: 'x', sidst_set: null, kilde: { domaene: 'b' } }, r(120, 'a')], NU);
  assert.equal(m.antal, 3);
  assert.equal(m.med_dato, 2);
  assert.equal(m.tilstande.slettet_udloebet, 1);
});
