/* CLS ved hydrering af facet-siderne (w8-cls). Kør: node --test scripts/facet-cls.test.js

   Problemet (målt med scripts/smoke-browser.js): CLS 0,43-0,58 ved 320/390 px på by-thorsoe.html og model-*.html, når
   lageret på visningstidspunktet ikke har de annoncer, siden blev bygget med. Hydreringen skiftede containerens klasse
   fra den vandrette kortscroller til .empty-state, og Chrome regnede hele containeren som flyttet.

   Testen låser kontrakten fixture-baseret (ingen browser, ingen netværk):
   1. Den statiske kortrække og den statiske tom-tilstand har SAMME container: samme klasse og samme inline min-height.
   2. Hydreringen skifter aldrig containerens klasse, og tom-tilstanden den tegner er byte-for-byte den statiske.
   3. Før indholdet skiftes, hæves min-height til containerens målte højde (en tom-tilstand må ikke krympe rækken).
   4. Tom-lager-vagten (data-fa-hydreret, ingen tom-tilstand, "Prøv igen" står alene) virker stadig. */
const test = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const { THRESHOLD, buildFacetList, side, facetSearchUrl, FACET_RESERVE_H, hydreringsScript, facetTomMarkup } = require('./build-facet-pages.js');

function l(i, extra){
  return Object.assign({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, isExternal: true,
    brand: 'Honda', model: 'CB 500', year: 2019, price: 40000 + i * 1000, km: 10000 + i,
    type: 'naked', region: 'Hovedstaden', city: 'København', ccm: 471, power: 47,
    condition: 'brugt', source: { navn: 'Test', domaene: 'test.dk' }, createdAt: '2026-08-01T10:00:00Z',
  }, extra || {});
}

/* Containerens åbningstag og indhold ud af den statiske side. */
function mountAf(html){
  const m = html.match(/<div class="([^"]*)" id="facet-listings"([^>]*)>/);
  assert.ok(m, 'siden har en #facet-listings');
  const attrs = m[2];
  const get = n => { const a = attrs.match(new RegExp(`\\sdata-${n}="([^"]*)"`)); return a ? a[1] : null; };
  const stil = (attrs.match(/\sstyle="([^"]*)"/) || [])[1] || '';
  const start = m.index + m[0].length;
  return { klasse: m[1], stil, attrs, frase: get('facet-frase'), soeg: get('facet-soeg'), indhold: html.slice(start, start + 600) };
}
const minHoejde = stil => { const m = stil.match(/min-height:\s*(\d+)px/); return m ? Number(m[1]) : null; };
const afesc = s => String(s).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/* To statiske sider for SAMME facet: én bygget med annoncer, én bygget uden. */
function toSider(slug, antal){
  global.ALLE_LISTINGS = [];
  const med = Array.from({ length: antal }, (_, i) => l(i + 1));
  const facet = buildFacetList(med).find(f => f.slug === slug);
  const facetTom = buildFacetList([]).find(f => f.slug === slug);
  return { medHtml: side(facet, med), tomHtml: side(facetTom, []), facet, facetTom };
}

test('statisk kortrække og statisk tom-tilstand har samme container: klasse og min-height', () => {
  const { medHtml, tomHtml } = toSider('type-naked', THRESHOLD + 2);
  const med = mountAf(medHtml), tom = mountAf(tomHtml);
  assert.strictEqual(med.klasse, 'listings-grid fa-kortraekke');
  assert.strictEqual(tom.klasse, med.klasse, 'tom-tilstanden bruger samme containerklasse som kortrækken');
  assert.strictEqual(minHoejde(med.stil), FACET_RESERVE_H);
  assert.strictEqual(minHoejde(tom.stil), FACET_RESERVE_H);
  assert.match(tom.indhold, /^<div class="empty-state"[^>]*><h3>Ingen /, 'tom-tilstanden er et barn i containeren');
  assert.ok(!/class="empty-state" id="facet-listings"/.test(tomHtml), 'ingen container skifter klasse til .empty-state');
});

test('tom-tilstanden er ÉN funktion: den statiske markup er præcis funktionens output', () => {
  const { tomHtml, facetTom } = toSider('type-scooter', 0);
  const tom = mountAf(tomHtml);
  assert.strictEqual(afesc(tom.soeg), facetSearchUrl(facetTom));
  const forventet = facetTomMarkup(tom.frase, afesc(tom.soeg));
  assert.ok(tomHtml.includes(forventet), 'statisk tom-markup === facetTomMarkup(frase, søge-URL)');
  assert.match(hydreringsScript(), /const facetTomMarkup = function facetTomMarkup/, 'hydreringen stringificerer samme funktion ind');
});

test('hydreringsscriptet skifter aldrig containerens klasse', () => {
  const sc = hydreringsScript();
  assert.ok(!/mount\.className\s*=/.test(sc), 'ingen className-tildeling på containeren');
  assert.ok(!/mount\.classList/.test(sc));
});

/* ---- Hydreringen kørt mod en minimal DOM-attrap ---- */

function koerHydrering({ statiskHtml, lager, maaltHoejde }){
  const m = mountAf(statiskHtml);
  const dataset = {};
  for (const a of m.attrs.matchAll(/\sdata-([a-z-]+)="([^"]*)"/g)) dataset[a[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = afesc(a[2]);
  const mount = {
    id: 'facet-listings', className: m.klasse, dataset, innerHTML: m.indhold,
    style: { minHeight: `${minHoejde(m.stil)}px`, maskImage: '', webkitMaskImage: '' },
    getBoundingClientRect: () => ({ height: maaltHoejde }),
  };
  const klasseFoer = mount.className, indholdFoer = mount.innerHTML;
  const attrs = {}, handlers = {};
  const document = {
    addEventListener: (n, f) => { handlers[n] = f; },
    getElementById: id => id === 'facet-listings' ? mount : null,
    querySelectorAll: () => [],
    documentElement: { setAttribute: (k, v) => { attrs[k] = v; } },
  };
  const ctx = {
    document, console, Math, Number, String, Map, Set,
    backendReady: async () => {}, renderHeader: () => {}, Icon: { chevronRight: '' },
    Store: { getAllListings: () => lager }, koerekortForListing: () => 'A2', passerKoerekort: () => true,
    listingCardHTML: x => `<article class="card" data-listing-id="${x.id}"></article>`, wireFavoriteButtons: () => {},
  };
  const kode = hydreringsScript().replace(/^<script>/, '').replace(/<\/script>$/, '');
  vm.runInNewContext(kode, ctx);
  return { mount, attrs, klasseFoer, indholdFoer, kør: () => handlers.DOMContentLoaded() };
}

test('hydrering uden match: tom-tilstanden er identisk med den statiske, klassen uændret, højden reserveret', async () => {
  const { medHtml, tomHtml } = toSider('type-naked', THRESHOLD + 2);
  // Siden er bagt MED annoncer, men lageret har kun en anden type -> 0 match (CLS-scenariet fra smoke-testen).
  const h = koerHydrering({ statiskHtml: medHtml, lager: [l(900, { type: 'sport' })], maaltHoejde: 359 });
  await h.kør();
  assert.strictEqual(h.mount.className, h.klasseFoer, 'klassen er uændret');
  const tomStatisk = mountAf(tomHtml);
  assert.strictEqual(h.mount.innerHTML.trim(), facetTomMarkup(h.mount.dataset.facetFrase, h.mount.dataset.facetSoeg),
    'hydreret tom-markup === byggetrinnets');
  assert.ok(h.mount.innerHTML.includes('class="btn btn-outline"'), 'begge knapper, så højden er den samme som den statiske');
  assert.strictEqual(minHoejde(`min-height:${h.mount.style.minHeight}`), 359, 'min-height hævet til den målte højde');
  assert.ok(parseInt(h.mount.style.minHeight, 10) >= FACET_RESERVE_H);
  assert.strictEqual(tomStatisk.klasse, h.mount.className, 'statisk tom og hydreret tom har samme containerklasse');
  assert.strictEqual(h.attrs['data-fa-hydreret'], '1');
});

test('hydrering med match: klassen uændret og min-height aldrig under reservationen', async () => {
  const { tomHtml } = toSider('type-naked', 0);
  // Siden er bagt UDEN annoncer; lageret har nu to -> kort tegnes ind i samme container.
  const h = koerHydrering({ statiskHtml: tomHtml, lager: [l(1), l(2)], maaltHoejde: 120 });
  await h.kør();
  assert.strictEqual(h.mount.className, h.klasseFoer);
  assert.match(h.mount.innerHTML, /data-listing-id="00000000-0000-4000-8000-000000000001"/);
  assert.ok(!/empty-state/.test(h.mount.innerHTML));
  assert.strictEqual(parseInt(h.mount.style.minHeight, 10), FACET_RESERVE_H, 'målt 120 px < reservation -> reservationen bevares');
  assert.strictEqual(h.mount.style.maskImage, '', 'kantfade fra CSS genindsat, når kortene vender tilbage');
});

test('tom-lager-vagten bevares: helt tomt lager rører hverken indhold eller højde og melder hydreret', async () => {
  const { medHtml } = toSider('type-naked', THRESHOLD + 2);
  const h = koerHydrering({ statiskHtml: medHtml, lager: [], maaltHoejde: 359 });
  await h.kør();
  assert.strictEqual(h.mount.innerHTML, h.indholdFoer, 'indholdet er urørt');
  assert.ok(!/empty-state/.test(h.mount.innerHTML), 'ingen tom-tilstand, der modsiger bannerets "Prøv igen"');
  assert.strictEqual(h.mount.className, h.klasseFoer);
  assert.strictEqual(h.attrs['data-fa-hydreret'], '1');
});
