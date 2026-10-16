/* Integrationstest: den statiske annonceside (scripts/build-listing-pages.js side()) har brødkrummens
   pile og handlingsrækken i markup FØR JavaScript, og markuppen er den samme som js/annonce.js
   skriver bagefter (anBrodkrumme/anAktioner). Så hydreringen skifter intet, og CSS-reservationen
   af pladsen kan fjernes. Ingen netværk: side() er ren og modulet bygger kun, når det køres direkte. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { side } = require('./build-listing-pages.js');

const FIXTURE = {
  id: 'fx-1', brand: 'Yamaha', model: 'MT-07 & Co', year: 2019, price: 59995, km: 12000, ccm: 689,
  city: 'Aarhus', postnr: '8000', region: 'Midtjylland', type: 'naked', condition: 'God',
  description: 'Fixture.', photoUrls: [], equipment: [], seller: { is_dealer: false },
};

const norm = s => s.replace(/\s+/g, ' ').replace(/> </g, '><').trim();
const udtræk = (html, id) => {
  const start = html.indexOf(`id="${id}"`);
  const m = start < 0 ? null : html.slice(start).match(/^[^>]*>([^]*?)<\/(?:nav|div)>/);
  assert.ok(m, `${id} findes i markup`);
  return norm(m[1]);
};

/* js/annonce.js' egen udgave, kørt mod en stub-DOM der fanger innerHTML. */
function hydreret(l, eget = false){
  const els = {};
  const stub = `
    const noop = () => {};
    const els = arguments[0];
    const mk = id => (els[id] = els[id] || { innerHTML: '', classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, style: {}, addEventListener: noop, setAttribute: noop, getAttribute: () => null, appendChild: noop, querySelector: () => null, querySelectorAll: () => [], dataset: {} });
    const document = { addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], getElementById: mk, createElement: () => mk('x'), documentElement: mk('html'), body: mk('body'), readyState: 'loading', title: '' };
    const window = { location: { href: '', search: '', pathname: '/annonce.html' }, addEventListener: noop, matchMedia: () => ({ matches: false, addEventListener: noop }), scrollTo: noop, history: {} };
    const history = { scrollRestoration: 'auto', replaceState: noop, pushState: noop };
    const location = { href: '', search: '', pathname: '/annonce.html', origin: 'http://localhost' };
    const localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
    const sessionStorage = localStorage;
    const Store = { isComparing: () => false, isFavorite: () => false, getUser: () => null };
  `;
  const kilder = ['icons.js', 'data.js', 'filtrering.js', 'components.js', 'annonce.js']
    .map(f => fs.readFileSync(path.join(ROOT, 'js', f), 'utf8')).join('\n');
  const fn = new Function(stub + kilder + '\nreturn { anBrodkrumme, anAktioner };');
  const { anBrodkrumme, anAktioner } = fn(els);
  anBrodkrumme(l); anAktioner(l, eget);
  return { bc: norm(els['bc-nav'].innerHTML), act: norm(els['an-actions'].innerHTML) };
}

test('brødkrummens pile står i markup uden JavaScript', () => {
  const html = side(FIXTURE);
  const bc = udtræk(html, 'bc-nav');
  const sepTomme = (bc.match(/<span class="bc-sep"><\/span>/g) || []).length;
  const sepMedPil = (bc.match(/<span class="bc-sep"><svg[^>]*><path d="M9 5l7 7-7 7"\/><\/svg><\/span>/g) || []).length;
  assert.equal(sepTomme, 0, 'ingen tomme .bc-sep');
  assert.equal(sepMedPil, 4, 'fire pile mellem fem led');
  assert.match(bc, /<span id="bc-current" aria-current="page">Yamaha MT-07 &amp; Co \(2019\)<\/span>/);
  assert.match(bc, /soegning\.html\?brands=Yamaha&amp;model=MT-07%20%26%20Co"/, '& i href er &amp;');
  assert.doesNotMatch(bc, /href="[^"]*&(?!amp;)[^"]*"/, 'ingen rå & i href');
});

test('handlingsrækken (Del, Sammenlign, Gem som favorit) står i markup uden JavaScript', () => {
  const html = side(FIXTURE);
  const act = udtræk(html, 'an-actions');
  assert.match(act, /id="share-listing-btn"/);
  assert.match(act, /data-compare-toggle="fx-1" aria-pressed="false"/);
  assert.match(act, /data-fav-toggle="fx-1"/);
  assert.match(act, /Gem som favorit/);
  assert.equal((act.match(/<svg/g) || []).length, 3, 'tre ikoner');
});

test('markup før JS er identisk med markup efter JS (ingen layoutspring)', () => {
  for (const l of [FIXTURE, { ...FIXTURE, brand: 'Ukendt', model: 'Virago', year: null }, { ...FIXTURE, model: '' }]){
    const efter = hydreret(l);
    const html = side(l);
    assert.equal(udtræk(html, 'bc-nav'), efter.bc.replace(/&(?!amp;)/g, '&amp;'), 'brødkrumme');
    assert.equal(udtræk(html, 'an-actions').replace(/\s+/g, ' '), efter.act.replace(/\s+/g, ' '), 'handlinger');
  }
});

test('eksterne annoncer får ingen favoritknap i den statiske række', () => {
  const act = udtræk(side({ ...FIXTURE, isExternal: true }), 'an-actions');
  assert.doesNotMatch(act, /data-fav-toggle/);
});
