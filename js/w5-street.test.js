/* F2-008: ordet "Street" i et modelnavn er ikke en kategori. Kør: node --test js/w5-street.test.js

   FLHX Street Glide blev til model "FLHX Glide" + type Naked, Street Bob til "FXBB Bob", og søgning på
   "street glide" gav 0. To lag, begge testet:
     - crawleren (crawler/normalize.js delModelOgVariant/normaliserType) for NYE rækker,
     - broen (js/backend-bridge.js) for de rækker, der allerede ligger i databasen med den ødelagte model
       (titlen er bevaret, så modellen kan genskabes uden at gætte).
   Typen af en "Street"-model kommer fra kilden eller model-tabellen (TYPE_BY_MODEL_HINT), aldrig fra ordet. */

const test = require('node:test');
const assert = require('node:assert');
const { broModuler } = require('./w5-hjaelp.js');
const n = require('../crawler/normalize.js');
const Filtrering = require('./filtrering.js');

const M = broModuler(['normalizeExternalListing', 'typeFraTitel']);

/* ---------- crawler: modelnavne bevares (15 navne) ---------- */

const MODELNAVNE = [
  ['FLHX Street Glide', 'FLHX Street Glide', null],
  ['FLHXS Street Glide Special', 'FLHXS Street Glide Special', null],
  ['FXBB Street Bob', 'FXBB Street Bob', null],
  ['FXBB Street Bob 107"', 'FXBB Street Bob 107"', null],
  ['FLSB Sport Glide', 'FLSB Sport Glide', null],
  ['XG750A Street Rod', 'XG750A Street Rod', null],
  ['Street 750', 'Street 750', null],
  ['Street Triple 765', 'Street Triple 765', null],
  ['Street Triple RS', 'Street Triple RS', null],
  ['Street Twin', 'Street Twin', null],
  ['FLTRX Road Glide', 'FLTRX Road Glide', null],
  ['Streetfighter V4', 'Streetfighter V4', null],
  // ÆGTE kategoriord til sidst er stadig en type (kildens eget ord):
  ['ZR-7 Street', 'ZR-7', 'Naked'],
  ['MSX 125 Street', 'MSX 125', 'Naked'],
  ['CB 650 Street', 'CB 650', 'Naked'],
];

for (const [titel, model, variant] of MODELNAVNE){
  test(`crawler: "${titel}" -> model "${model}", variant ${variant}`, () => {
    const r = n.delModelOgVariant(titel);
    assert.equal(r.model, model);
    assert.equal(r.variant, variant);
  });
}

test('crawler: normaliserType læser ikke Street Glide / Street Bob som typen Street', () => {
  const voc = ['Street', 'Sport', 'Cruiser', 'Touring'];
  assert.equal(n.normaliserType('Harley-Davidson FLHX Street Glide', voc), null);
  assert.equal(n.normaliserType('Harley-Davidson FXBB Street Bob 107"', voc), null);
  assert.equal(n.normaliserType('Harley-Davidson FLSB Sport Glide', voc), null);
  assert.equal(n.normaliserType('Triumph Street Triple 765', voc), null);
  // Men kildens eget kategoriord til sidst er stadig en type:
  assert.equal(n.normaliserType('Kawasaki ZR-7 Street', voc), 'Street');
  assert.equal(n.normaliserType('Triumph Street Triple Street', voc), 'Street');
  assert.equal(n.normaliserType('Yamaha XV 950 Cruiser', voc), 'Cruiser');
});

/* ---------- broen: rækker, der allerede ligger i databasen ---------- */

function raa(o){
  return Object.assign({
    id: 'x', kilde_annonce_id: '1', url: 'https://www.rydbergsmc.dk/x', titel: 'x', maerke: 'Harley-Davidson', model: null,
    variant: null, type: null, aargang: 2007, km: 20000, ccm: 1584, hk: 70, pris_dkk: 150000, stand: 'brugt',
    salgsmarkoerer: [], udledte_felter: [], by: 'Odense', postnr: 5000, saelgertype: 'forhandler',
    thumbnail_url: null, uddrag: null, status: 'aktiv', foerst_set: '2026-08-01', sidst_set: '2026-08-24T10:00:00Z',
    kilde: { navn: 'Rydbergs MC', domaene: 'rydbergsmc.dk' },
  }, o);
}
const norm = o => M.normalizeExternalListing(raa(o));

test('bro: FLHX Street Glide (model "FLHX Glide", type "Street" i DB) -> model bevaret, IKKE Naked', () => {
  const l = norm({ titel: 'Harley-Davidson FLHX Street Glide', model: 'FLHX Glide', type: 'Street' });
  assert.equal(l.model, 'FLHX Street Glide');
  assert.notEqual(l.type, 'naked');
  assert.equal(l.type, 'touring', 'typen kommer fra model-tabellen');
});

test('bro: Street Bob (model "FXBB Bob", type "Street") -> "FXBB Street Bob", cruiser', () => {
  const l = norm({ titel: 'Harley-Davidson FXBB Street Bob 107"', model: 'FXBB Bob', type: 'Street' });
  assert.match(l.model, /^FXBB Street Bob/);
  assert.equal(l.type, 'cruiser');
});

test('bro: Sport Glide (model "FLSB Glide") -> "FLSB Sport Glide"', () => {
  const l = norm({ titel: 'Harley-Davidson FLSB Sport Glide', model: 'FLSB Glide', type: null });
  assert.equal(l.model, 'FLSB Sport Glide');
  assert.notEqual(l.type, 'naked');
});

test('bro: ægte Street-nakeds beholder Naked — fra kilden / model-tabellen, ikke fra ordet', () => {
  const trip = norm({ maerke: 'Triumph', titel: 'Triumph Street Triple 765', model: 'Street Triple 765', type: 'Street', ccm: 765, hk: 123 });
  assert.equal(trip.model, 'Street Triple 765');
  assert.equal(trip.type, 'naked');
  const zr7 = norm({ maerke: 'Kawasaki', titel: 'Kawasaki ZR-7 Street', model: 'ZR-7', type: 'Street', ccm: 738, hk: 108 });
  assert.equal(zr7.type, 'naked', 'kildens eget kategoriord til sidst er en type');
  const msx = norm({ maerke: 'Honda', titel: 'Honda MSX 125 Street', model: 'MSX 125', type: 'Street', ccm: 125, hk: 10 });
  assert.equal(msx.type, 'naked');
});

test('bro: Street Twin (Triumph) er ikke Naked via ordet Street', () => {
  const l = norm({ maerke: 'Triumph', titel: 'Triumph Street Twin', model: 'Street Twin', type: 'Street', ccm: 900, hk: 55 });
  assert.equal(l.model, 'Street Twin');
  assert.equal(l.type, 'classic');
});

test('bro: titel-nødudgangen (typeFraTitel) læser heller ikke Street Glide/Bob som type', () => {
  assert.notEqual(M.typeFraTitel('Harley-Davidson FLHX Street Glide'), 'naked');
  assert.notEqual(M.typeFraTitel('Harley-Davidson FXBB Street Bob'), 'naked');
  assert.equal(M.typeFraTitel('Kawasaki ZR-7 Street'), 'naked');
});

/* ---------- søgning ---------- */

test('søgning: "street glide" og "street bob" finder dem; Naked-filteret rummer dem ikke', () => {
  const liste = [
    norm({ id: 'a', titel: 'Harley-Davidson FLHX Street Glide', model: 'FLHX Glide', type: 'Street' }),
    norm({ id: 'b', titel: 'Harley-Davidson FXBB Street Bob 107"', model: 'FXBB Bob', type: 'Street' }),
    norm({ id: 'c', maerke: 'Triumph', titel: 'Triumph Street Triple 765', model: 'Street Triple 765', type: 'Street' }),
    norm({ id: 'd', maerke: 'Kawasaki', titel: 'Kawasaki ZR-7 Street', model: 'ZR-7', type: 'Street' }),
  ];
  const find = q => Filtrering.anvendFiltre(liste, { q }).map(l => l.id).sort();
  assert.deepEqual(find('street glide'), ['a']);
  assert.deepEqual(find('street bob'), ['b']);
  assert.deepEqual(find('street triple'), ['c']);
  assert.deepEqual(find('glide'), ['a']);
  const naked = Filtrering.anvendFiltre(liste, { types: ['naked'] }).map(l => l.id).sort();
  assert.deepEqual(naked, ['c', 'd'], 'kun de ægte nakeds');
});
