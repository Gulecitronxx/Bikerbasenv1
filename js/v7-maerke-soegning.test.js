/* V7 mærke: søgning på tværs af stavemåder mod hele lageret (scripts/fixtures/v7-lager-maerke.json, 735 rækker fra 26.10.2026).
   "gl1800" = "gl 1800" = "GL-1800"; "cb650r" = "cb 650 r"; frase først, ord (OG) som reserve; mærketal = fritekst-tal.
   Kør: node --test js/v7-maerke-soegning.test.js */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const REPO = path.join(__dirname, '..');
const { browserModules } = require(path.join(REPO, 'scripts', 'shared.js'));
const M = browserModules();
const F = M.Filtrering;
const LAGER = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts', 'fixtures', 'v7-lager-maerke.json'), 'utf8')).raekker;
const raa = o => ({
  id: o.i, kilde_annonce_id: '1', url: o.u, titel: o.t, maerke: o.m, model: o.mo, variant: null, type: o.ty || null, aargang: o.a, km: o.km, ccm: o.c, hk: null, pris_dkk: o.p,
  stand: o.s || null, salgsmarkoerer: [], udledte_felter: [], by: null, postnr: o.pn, saelgertype: o.st || null, thumbnail_url: null, uddrag: null, status: 'aktiv',
  foerst_set: '2026-10-01', sidst_set: o.ss || '2026-10-20T10:00:00Z', kilde: { navn: o.kn || 'Gul og Gratis', domaene: o.k || 'guloggratis.dk' },
});
const L = M.markerTvaerkildeDubletter(LAGER.map(o => M.normalizeExternalListing(raa(o)))).beholdt;
const find = (q, ekstra) => F.anvendFiltre(L, { q, ...(ekstra || {}) });
const ids = l => l.map(x => x.id).sort().join();

test('modelstavemåder giver samme træf: gl1800 = gl 1800 = GL-1800 = Gl  1800', () => {
  const ref = find('gl1800');
  assert.ok(ref.length >= 20, 'Gold Wing 1800 findes i lageret: ' + ref.length);
  assert.ok(ref.every(l => /GL 1800/.test(l.model)));
  for (const q of ['gl 1800', 'GL-1800', 'Gl  1800', 'honda gl1800', 'HONDA GL 1800']) assert.strictEqual(ids(find(q)), ids(ref), q);
});

test('cb650r = cb 650 r = CB-650-R: kun CB 650 R-familien, ikke en BSA Spitfire 650 Classic Bike (frase først)', () => {
  const ref = find('cb650r');
  assert.ok(ref.length >= 5);
  assert.ok(ref.every(l => /^CB 650 R/.test(l.model)), [...new Set(ref.map(l => l.model))].join());
  for (const q of ['cb 650 r', 'CB-650-R', 'honda cb 650 r']) {
    const r = find(q);
    assert.strictEqual(ids(r), ids(ref), q);
    assert.ok(!r.some(l => l.brand === 'BSA'), q + ' finder en BSA');
  }
});

test('reserve: findes frasen ikke, gælder ordene hver for sig (OG), som før — og typeord virker uændret', () => {
  const guld = find('gold wing 1800');
  assert.ok(guld.length >= 20 && guld.every(l => /GL 1800 Gold Wing/.test(l.model)), 'ord i anden rækkefølge end modellen');
  assert.ok(find('gold wing').length > guld.length, 'frasen "goldwing" finder også GL 1100/1500');
  assert.strictEqual(find('650 cb').length > 0, true, 'omvendt rækkefølge falder tilbage til ord');
  const cruiser = find('cruiser');
  assert.ok(cruiser.length > 20 && cruiser.every(l => l.type === 'cruiser' || /cruiser/i.test(l.model)));
});

test('mærke + model: "honda cbr 650 r" og "harley road king" er mærkekrav + frase', () => {
  const a = find('honda cbr 650 r');
  assert.ok(a.length > 0 && a.every(l => l.brand === 'Honda' && /CBR 650 R/.test(l.model)));
  const b = find('harley road king');
  assert.ok(b.every(l => l.brand === 'Harley-Davidson') && b.length > 0);
});

test('stavemåder af mærket: harley davidson, hd, cf moto, moto-guzzi, mv agusta giver samme træf som det kanoniske navn', () => {
  const T = [['harley davidson', 'Harley-Davidson'], ['HD', 'Harley-Davidson'], ['h-d', 'Harley-Davidson'], ['cf moto', 'CFMoto'], ['CF-MOTO', 'CFMoto'], ['moto-guzzi', 'Moto Guzzi'],
    ['Moto Guzzi', 'Moto Guzzi'], ['mv agusta', 'MV Agusta'], ['Mv Agusta', 'MV Agusta'], ['royal-enfield', 'Royal Enfield'], ['fb mondial', 'FB Mondial'], ['sym', 'SYM']];
  for (const [q, b] of T) {
    const forventet = F.anvendFiltre(L, { brands: [b] });
    assert.ok(forventet.length > 0, b);
    assert.strictEqual(ids(find(q)), ids(forventet), `"${q}" -> ${b}`);
  }
});

test('mærketal: hvert mærke i mærkelisten giver samme antal i fritekst, mærkefilter og mærkelisten (ingen tal der flytter sig)', () => {
  for (const m of F.maerkeListe(L)) {
    if (m.uoplyst) continue;
    const viaFilter = F.anvendFiltre(L, { brands: [m.navn] }).length;
    assert.strictEqual(viaFilter, m.antal, `${m.navn}: filter`);
    assert.strictEqual(find(m.navn).length, m.antal, `${m.navn}: fritekst`);
  }
});

test('kombinerede filtre, pris og sortering: mærke + pris-interval + ccm + stand giver en delmængde, og sorteringen er stabil', () => {
  const basis = F.anvendFiltre(L, { brands: ['Honda'] });
  const med = F.anvendFiltre(L, { brands: ['Honda'], priceMin: 50000, priceMax: 120000, ccmMin: 500 });
  assert.ok(med.length > 0 && med.length < basis.length);
  assert.ok(med.every(l => l.price >= 50000 && l.price <= 120000 && l.ccm >= 500));
  const sorteret = M.Sortering.sorter ? M.Sortering.sorter(med, 'price-asc') : null;
  if (sorteret) {
    const p = sorteret.map(l => l.price).filter(x => x != null);
    assert.deepStrictEqual(p, [...p].sort((a, b) => a - b));
  }
  // mindsteværdi over maksimum = tomt resultat, ikke en fejl
  assert.deepStrictEqual(F.anvendFiltre(L, { priceMin: 200000, priceMax: 100000 }), []);
  // mærke + model + år
  const gw = F.anvendFiltre(L, { brands: ['Honda'], models: ['GL 1800 Gold Wing'], yearMin: 2018 });
  assert.ok(gw.length > 0 && gw.every(l => l.year >= 2018 && /GL 1800/.test(l.model)));
});
