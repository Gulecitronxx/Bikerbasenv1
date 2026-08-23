/* Tests for js/maaling.js — hændelser sendes kun bag samtykke, uden persondata,
   og med de navne og parametre, rapporterne bygges på. */
const test = require('node:test');
const assert = require('node:assert/strict');
const Maaling = require('./maaling');

function medGtag(fn){
  const kald = [];
  global.window = { gtag: (...a) => kald.push(a) };
  try { fn(kald); } finally { delete global.window; }
}

test('uden samtykke (intet window.gtag) sendes INTET — og intet køes', () => {
  global.window = {};
  try {
    assert.equal(Maaling.send('search', { x: 1 }), false);
    assert.equal(Maaling.visAnnonce({ id: 'a' }), false);
  } finally { delete global.window; }
  // gtag dukker op bagefter: den gamle hændelse er væk, kun nye sendes
  medGtag(kald => { assert.equal(Maaling.send('search', {}), true); assert.equal(kald.length, 1); });
});

test('search: filtrenes værdier og antal, søgeord klippet til 80 tegn, tomme felter udelades', () => medGtag(kald => {
  const state = { q: 'Yamaha MT-07 '.repeat(20), brands: ['Honda', 'Yamaha'], types: [], koerekort: 'A2', priceMax: 60000, priceMin: null, sort: 'blandet' };
  Maaling.soegning(state, 47);
  const [ev, navn, p] = kald[0];
  assert.equal(ev, 'event'); assert.equal(navn, 'search');
  assert.equal(p.search_term.length, 80);
  assert.equal(p.brands, 'Honda,Yamaha');
  assert.equal(p.types, undefined, 'tom liste sendes ikke');
  assert.equal(p.koerekort, 'A2'); assert.equal(p.price_max, 60000); assert.equal(p.price_min, undefined);
  assert.equal(p.results, 47);
}));

test('view_item / kilde_klik: annoncens mærke, model, type, pris og kilde — aldrig sælgerens oplysninger', () => medGtag(kald => {
  const l = { id: 'dcfc2beb-e64d-4873-b21c-135c93ecfc2e', brand: 'Honda', model: 'NT 1100 A', type: 'touring', price: 164995,
    isExternal: true, source: { navn: 'Gul og Gratis', domaene: 'guloggratis.dk' },
    seller: { name: 'Hemmelig Person', phone: '12345678', email: 'x@y.dk' } };
  Maaling.visAnnonce(l);
  const p = kald[0][2];
  assert.equal(kald[0][1], 'view_item');
  assert.deepEqual(Object.keys(p.items[0]).sort(), ['currency', 'item_brand', 'item_category', 'item_id', 'item_name', 'kilde', 'price']);
  assert.equal(p.items[0].item_name, 'Honda NT 1100 A'); assert.equal(p.items[0].kilde, 'guloggratis.dk'); assert.equal(p.kilde, 'guloggratis.dk');
  assert.doesNotMatch(JSON.stringify(p), /Hemmelig|12345678|x@y\.dk/);

  Maaling.kildeKlik(l, 'https://www.guloggratis.dk/annonce/123/honda');
  assert.equal(kald[1][1], 'kilde_klik'); assert.equal(kald[1][2].link_domain, 'www.guloggratis.dk'); assert.equal(kald[1][2].item_id, l.id);
  Maaling.kildeKlik(null, 'https://mcsyd.dk/x');
  assert.equal(kald[2][2].link_domain, 'mcsyd.dk', 'uden kendt annonce sendes stadig domænet');
}));

test('egen annonce: kilde = bikerbasen; pris uden tal giver ingen currency', () => medGtag(kald => {
  Maaling.visAnnonce({ id: 1, brand: 'KTM', model: '390 Duke', type: 'naked', price: null, isExternal: false });
  const i = kald[0][2].items[0];
  assert.equal(i.kilde, 'bikerbasen'); assert.equal(i.price, undefined); assert.equal(i.currency, undefined);
}));

test('de øvrige tragt-hændelser har de aftalte navne', () => medGtag(kald => {
  Maaling.gemSoegning({ brands: ['Honda'], koerekort: 'A' }, 12);
  Maaling.favorit({ id: 'x', brand: 'Honda' }, true);
  Maaling.favorit({ id: 'x', brand: 'Honda' }, false);
  Maaling.kontakt({ id: 'x', brand: 'Honda' });
  Maaling.opretAnnonce({ brand: 'Honda', type: 'sport' }, false);
  Maaling.opretAnnonce({ brand: 'Honda', type: 'sport' }, true);
  Maaling.login(); Maaling.oprettet('email', true);
  assert.deepEqual(kald.map(k => k[1]), ['save_search', 'add_to_wishlist', 'remove_from_wishlist', 'generate_lead', 'publish_listing', 'edit_listing', 'login', 'sign_up']);
  assert.equal(kald[7][2].dealer, true);
}));

test('en kastende gtag vælter ikke siden', () => {
  global.window = { gtag: () => { throw new Error('boom'); } };
  try { assert.equal(Maaling.send('search', {}), false); } finally { delete global.window; }
});
