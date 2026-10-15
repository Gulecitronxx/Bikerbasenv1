/* Vagthund for guide-generatoren (scripts/build-guides.js). Kør: node --test scripts/guides.test.js

   Testen bygger siderne i hukommelsen med et tomt rammesæt (ingen netværk,
   ingen skrivning til disken) og kontrollerer det, SEO og læseren er
   afhængige af: én h1, canonical, JSON-LD der kan parses, indholdsfortegnelsens
   ankre mod sidens id'er, kilder under hver guide, interne links der peger på
   filer, der findes, og at der ikke er opdigtet nogen forfatter. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { renderGuide, renderOversigt, laesetid, udvalgTilSidebjaelke, cleanUrl, guideMinutter } = require('./build-guides');
const { GUIDES, SRC } = require('./guides-data');

const ctx = { header: '<header class="site-header"></header>', footer: '<footer class="site-footer"></footer>', csp: '', populaer: '' };
const sider = [
  ...GUIDES.map(g => ({ navn: g.file, html: renderGuide(g, ctx), guide: g })),
  { navn: 'guides.html', html: renderOversigt(ctx), guide: null },
];

const tael = (html, re) => (html.match(re) || []).length;
function ldBlokke(html){
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1].replace(/\\u003c/g, '<')));
}

for (const { navn, html, guide } of sider){
  test(`${navn}: én h1, canonical, title og description`, () => {
    assert.strictEqual(tael(html, /<h1[ >]/g), 1, 'præcis én h1');
    const canon = html.match(/<link rel="canonical" href="([^"]+)">/g) || [];
    assert.strictEqual(canon.length, 1, 'præcis én canonical');
    assert.ok(canon[0].includes(cleanUrl(navn)), 'canonical peger på siden selv, uden .html');
    assert.ok(!/canonical" href="[^"]*\.html/.test(html), 'canonical uden .html');
    const title = html.match(/<title>([^<]+)<\/title>/)[1];
    const desc = html.match(/<meta name="description" content="([^"]+)"/)[1];
    assert.ok(title.length >= 20 && title.length <= 70, `title ${title.length} tegn`);
    assert.ok(desc.length >= 80 && desc.length <= 160, `description ${desc.length} tegn`);
    assert.match(html, /<meta property="og:title"/);
    assert.match(html, /<meta name="twitter:card"/);
    assert.ok(!/noindex/.test(html), 'guider skal kunne indekseres');
  });

  test(`${navn}: JSON-LD kan parses og er ærligt`, () => {
    const ld = ldBlokke(html);
    assert.ok(ld.length >= 2);
    const crumbs = ld.find(o => o['@type'] === 'BreadcrumbList');
    assert.ok(crumbs && crumbs.itemListElement.length >= 2);
    assert.strictEqual(crumbs.itemListElement[0].name, 'Forside');
    if (guide){
      const art = ld.find(o => o['@type'] === 'Article');
      assert.ok(art, 'Article');
      assert.ok(art.headline && art.datePublished && art.dateModified);
      assert.match(art.datePublished, /^\d{4}-\d{2}-\d{2}$/);
      assert.strictEqual(art.publisher.name, 'Bikerbasen');
      assert.notStrictEqual(art.author['@type'], 'Person', 'ingen opdigtet forfatter-person');
      assert.strictEqual(art.author.name, 'Bikerbasen');
      assert.ok(!/aggregateRating|review/i.test(JSON.stringify(ld)));
    } else {
      const list = ld.find(o => o['@type'] === 'CollectionPage');
      assert.strictEqual(list.mainEntity.itemListElement.length, GUIDES.length);
    }
  });

  test(`${navn}: ingen inline-scripts ud over temalinjen, og siden-CSS er linket`, () => {
    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    assert.strictEqual(inline.length, 1);
    assert.match(inline[0], /bb_theme/);
    assert.match(html, /<link rel="stylesheet" href="css\/p-guides\.css">/);
  });

  test(`${navn}: interne links peger på filer, der findes`, () => {
    const hrefs = [...html.matchAll(/<a [^>]*href="([^"#?]+\.html)(?:[?#][^"]*)?"/g)].map(m => m[1]);
    assert.ok(hrefs.length >= 3);
    for (const h of hrefs){
      assert.ok(fs.existsSync(path.join(ROOT, h)) || GUIDES.some(g => g.file === h) || h === 'guides.html', `${h} findes ikke`);
    }
  });
}

for (const { navn, html, guide } of sider.filter(s => s.guide)){
  test(`${navn}: indholdsfortegnelsens ankre matcher sektionernes id'er`, () => {
    const toc = html.match(/<nav class="gd-toc"[\s\S]*?<\/nav>/)[0];
    const ankre = [...toc.matchAll(/href="#([^"]+)"/g)].map(m => m[1]);
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
    assert.strictEqual(ankre.length, guide.sections.length);
    for (const a of ankre) assert.ok(ids.includes(a), `#${a} har ingen sektion`);
    assert.strictEqual(new Set(ids).size, ids.length, 'id\'er skal være unikke');
    assert.strictEqual(tael(html, /class="gd-sec"/g), ankre.length);
  });

  test(`${navn}: Kilder, Kort fortalt, dato og læsetid`, () => {
    assert.match(html, /<h2 id="kilder-h">Kilder<\/h2>/);
    for (const k of guide.sources){
      assert.ok(SRC[k], `ukendt kilde ${k}`);
      assert.match(SRC[k].url, /^https:\/\//);
      assert.ok(html.includes(`href="${SRC[k].url}"`), `${k} mangler under Kilder`);
    }
    assert.ok(guide.sources.length >= 2);
    assert.match(html, /Kort fortalt/);
    assert.match(html, /Søg motorcykler på Bikerbasen/);
    assert.match(html, /href="koerekort-a2\.html"/);
    assert.match(html, /<time datetime="\d{4}-\d{2}-\d{2}">\d+\. \w+ \d{4}<\/time>/);
    const min = Number((html.match(/Læsetid<\/span>(\d+) minut/) || [])[1]);
    assert.strictEqual(min, guideMinutter(guide));
    assert.match(html, /Af Bikerbasen/);
  });

  test(`${navn}: teksten har det omfang, brieffen beder om, og påstår ikke modeller`, () => {
    const art = html.split('<article')[1].split('</article>')[0].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    const ord = art.trim().split(' ').length;
    assert.ok(ord >= 900 && ord <= 1500, `${ord} ord`);
    assert.ok(!/må køre (en|et)? ?(Yamaha|Honda|Kawasaki|BMW|KTM|Suzuki)/i.test(art));
  });
}

test('læsetid: 200 ord i minuttet, aldrig under ét minut', () => {
  assert.strictEqual(laesetid(0), 1);
  assert.strictEqual(laesetid(200), 1);
  assert.strictEqual(laesetid(201), 2);
  assert.strictEqual(laesetid(1000), 5);
});

test('sidebjælkens udvalg: kun kendt effekt under A2-grænsen, og tomt uden data', () => {
  assert.deepStrictEqual(udvalgTilSidebjaelke([]), []);
  assert.deepStrictEqual(udvalgTilSidebjaelke(null), []);
  const mk = (i, power) => ({ id: String(i), brand: 'B' + i, model: 'M' + i, year: 2020, km: 1000, ccm: 400, power, price: 50000, photoUrls: ['https://example.com/a.jpg'], isExternal: false, createdAt: '2026-01-01', saelgertype: 'forhandler' });
  const ud = udvalgTilSidebjaelke([mk(1, null), mk(2, 0), mk(3, 120), mk(4, 40), mk(5, 30), mk(6, 35)]);
  assert.ok(ud.length <= 3);
  for (const l of ud) assert.ok(l.power > 0 && l.power <= 47, `power ${l.power}`);
  assert.deepStrictEqual(udvalgTilSidebjaelke([mk(1, 40)]), [], 'under to kort udelades modulet');
});

test('reserverede adresser findes og er de fire, andre strømme linker til', () => {
  assert.deepStrictEqual(GUIDES.map(g => g.file).sort(),
    ['guide-a2-koerekort.html', 'guide-brugt-motorcykel.html', 'guide-foerste-motorcykel.html']);
  assert.ok(sider.some(s => s.navn === 'guides.html'));
});

test('privatkøb: ingen falsk påstand om, at reklamationsretten slet ikke findes', () => {
  const g = GUIDES.find(x => x.slug === 'guide-brugt-motorcykel');
  const html = renderGuide(g, ctx);
  assert.ok(!/Ved privatkøb gælder den ikke/.test(html), 'tl;dr må ikke afvise reklamationsretten ved privatkøb');
  assert.match(html, /hvis I ikke har aftalt noget andet/);
  assert.match(html, /Til og med 31\. december 2026/);
  assert.match(html, /3 uger/);
  assert.match(html, /passagerer fra 15 år/);
});

test('sidebjælken: trehjulede og scootere udelukkes, og overskriften lover kun oplyst effekt', () => {
  const mk = (i, brand, model, extra) => Object.assign({ id: String(i), brand, model, year: 2020, km: 1000, ccm: 300, power: 28, price: 50000, photoUrls: ['https://example.com/a.jpg'], isExternal: false, createdAt: '2026-01-01', saelgertype: 'forhandler' }, extra);
  const ud = udvalgTilSidebjaelke([mk(1, 'Yamaha', 'Tricity 300'), mk(2, 'Piaggio', 'MP3 500'), mk(3, 'Honda', 'NMAX 125', { type: 'scooter' }), mk(4, 'Honda', 'CB500F'), mk(5, 'Yamaha', 'MT-07')]);
  assert.deepStrictEqual(ud.map(l => l.model).sort(), ['CB500F', 'MT-07']);
  const { populaerModul } = require('./build-guides');
  const html = populaerModul(ud, '24. august 2026');
  assert.match(html, /Oplyst effekt under A2-grænsen/);
  assert.ok(!/Motorcykler til A2-kørekort/.test(html));
  assert.match(html, /Udvalg pr\. 24\. august 2026/);
});
