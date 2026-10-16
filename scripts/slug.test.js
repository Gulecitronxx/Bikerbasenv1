/* Tests for ÉN slugify (w4-smaating). Kør: node --test scripts/slug.test.js

   Zündapp blev model-z-ndapp-ks-50, fordi slugify kun kendte æ/ø/å. Her låses (1) accentfoldningen, (2) at dansk
   praksis (ø->oe, æ->ae, å->aa) er uændret, (3) at ALLE committede model-/maerke-/by-/mc-/budget-/region-adresser
   er uændrede, og (4) at de fire generatorer deler den samme funktion. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROD = path.join(__dirname, '..');
const { slugify } = require('./slug');
const gammel = s => String(s).toLowerCase()
  .replace(/ø/g, 'oe').replace(/æ/g, 'ae').replace(/å/g, 'aa')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const html = f => fs.readFileSync(path.join(ROD, f), 'utf8');
const attr = (h, n) => { const m = h.match(new RegExp(`${n}="([^"]*)"`)); return m ? m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'") : null; };

test('accenter foldes til grundbogstavet: Zündapp bliver zundapp, ikke z-ndapp', () => {
  assert.equal(slugify('Zündapp KS 50'), 'zundapp-ks-50');
  assert.equal(`model-${slugify('Zündapp')}-${slugify('KS 50')}`, 'model-zundapp-ks-50');
  assert.equal(slugify('Café Racer'), 'cafe-racer');
  assert.equal(slugify('Märklin Öl'), 'marklin-ol');
  assert.equal(slugify('Straße'), 'strasse');
});

test('dansk praksis uændret: ø -> oe, æ -> ae, å -> aa (også som a + kombinerende ring)', () => {
  assert.equal(slugify('Ærø'), 'aeroe');
  assert.equal(slugify('Åbenrå'), 'aabenraa');
  assert.equal(slugify('Thorsø'), 'thorsoe');
  assert.equal(slugify('Skælskør'), 'skaelskoer');
  assert.equal(slugify('Åbenrå'), 'aabenraa', 'dekomponeret å skal ikke blive "a"');
  assert.equal(slugify('Harley-Davidson  FLSTC (Heritage)'), 'harley-davidson-flstc-heritage');
  assert.equal(slugify('  --X--  '), 'x');
});

test('alle committede adresser er uændrede (model, mærke, by, mc, budget, region)', () => {
  const filer = fs.readdirSync(ROD).filter(f => /^(model|maerke|by|mc|budget|region)-.*\.html$/.test(f));
  assert.ok(filer.length > 40, 'der skal være committede sider at måle mod');
  let tjekket = 0;
  for (const f of filer){
    const h = html(f);
    const slug = f.replace(/\.html$/, '');
    let navne = null;
    if (f.startsWith('model-')) navne = `model-${slugify(attr(h, 'data-facet-brand'))}-${slugify(attr(h, 'data-facet-model'))}`;
    else if (f.startsWith('maerke-')) navne = `maerke-${slugify(attr(h, 'data-mk-brand'))}`;
    else if (f.startsWith('by-')) navne = `by-${slugify(attr(h, 'data-facet-by'))}`;
    else if (f.startsWith('mc-')) navne = `mc-${slugify(attr(h, 'data-facet-brand'))}-${slugify(attr(h, 'data-facet-type'))}`;
    else if (f.startsWith('region-')) navne = `region-${slugify(attr(h, 'data-facet-id'))}`;
    else if (f.startsWith('budget-')) navne = `budget-under-${attr(h, 'data-facet-max')}`;
    assert.equal(navne, slug, `${f}: ny slugify giver en anden adresse`);
    // Og den gamle funktion gav det samme på præcis de samme navne.
    const gml = f.startsWith('model-') ? `model-${gammel(attr(h, 'data-facet-brand'))}-${gammel(attr(h, 'data-facet-model'))}` : null;
    if (gml) assert.equal(gml, slug);
    tjekket++;
  }
  assert.equal(tjekket, filer.length);
});

test('statiske annoncesider: filnavnets slug er uændret (annonce-<mærke>-<model>-<år>-<id8>)', () => {
  const { listingSlug } = require('./shared');
  // Navnene står ikke som attributter på de statiske annoncesider, så de to committede filnavne låses her på kendte input.
  const filer = fs.readdirSync(ROD).filter(f => /^annonce-.*-[0-9a-f]{8}.html$/.test(f));
  assert.ok(filer.includes('annonce-bmw-r45-1979-59d3a9a1.html') && filer.includes('annonce-harley-davidson-flhx-2007-541ad405.html'));
  assert.equal(listingSlug({ id: '59d3a9a1-0000-0000-0000-000000000000', brand: 'BMW', model: 'R45', year: 1979 }), 'annonce-bmw-r45-1979-59d3a9a1.html');
  assert.equal(listingSlug({ id: '541ad405-0000-0000-0000-000000000000', brand: 'Harley-Davidson', model: 'FLHX', year: 2007 }), 'annonce-harley-davidson-flhx-2007-541ad405.html');
  assert.equal(listingSlug({ id: '12345678-0', brand: 'Zündapp', model: 'KS 50', year: 1972 }), 'annonce-zundapp-ks-50-1972-12345678.html');
});

test('shared.js og seo-sider.js bruger den samme funktion, og generatorerne har ingen egen kopi', () => {
  assert.equal(require('./shared').slugify('Zündapp'), 'zundapp');
  assert.equal(require('./seo-sider').slugify('Zündapp'), 'zundapp');
  assert.equal(require('./seo-sider').kombiSlug('Zündapp', 'naked'), 'mc-zundapp-naked');
  for (const f of ['shared.js', 'seo-sider.js', 'build-facet-pages.js', 'build-brand-pages.js']){
    const kilde = fs.readFileSync(path.join(__dirname, f), 'utf8');
    assert.match(kilde, /require\('\.\/slug'\)/, `${f} skal bruge scripts/slug.js`);
    assert.ok(!/replace\(\/ø\/g,\s*'oe'\)/.test(kilde), `${f} har stadig en egen ø/æ/å-kopi`);
  }
});

test('klientens kopier (js/seo.js, js/home.js) giver samme adresser som serverens slugify', () => {
  const { listingSlug } = require('./shared');
  const seoSrc = fs.readFileSync(path.join(ROD, 'js/seo.js'), 'utf8');
  const { listingPageUrl } = new Function('document', 'console', 'formatKm', 'formatCcm', 'formatPrice', 'typeLabel',
    seoSrc + '\n;return { listingPageUrl };')({}, console, String, String, String, String);
  for (const l of [
    { id: 'abcdef12-3', brand: 'Zündapp', model: 'KS 50', year: 1972 },
    { id: 'abcdef12-3', brand: 'Harley-Davidson', model: 'FLHX', year: 2007 },
    { id: 'abcdef12-3', brand: 'Æbelø', model: 'Åben Ø', year: 2001 },
  ]){
    assert.ok(listingPageUrl(l).endsWith('/' + listingSlug(l)), `${l.brand}: seo.js og shared.js er uenige`);
  }
  // home.js' slugify bor inde i en closure; her kontrolleres kilden for samme foldning som scripts/slug.js.
  const home = fs.readFileSync(path.join(ROD, 'js/home.js'), 'utf8');
  const m = home.match(/const slugify = \(name\) => ([\s\S]*?);\s*\n/);
  assert.ok(m, 'fandt ikke home.js slugify');
  const homeSlug = new Function('name', 'return ' + m[1] + ';');
  for (const n of ['Zündapp', 'Moto Guzzi', 'Royal-enfield', 'Æbelø', 'Café Racer']) assert.equal(homeSlug(n), slugify(n), n);
});
