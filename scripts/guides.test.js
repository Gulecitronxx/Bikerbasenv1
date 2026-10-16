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

test('guide-adresserne: de tre reserverede findes stadig, og to nye er kommet til', () => {
  assert.deepStrictEqual(GUIDES.map(g => g.file).sort(),
    ['guide-a2-koerekort.html', 'guide-brugt-motorcykel.html', 'guide-foerste-motorcykel.html', 'guide-mc-forsikring.html', 'guide-mc-udstyr.html']);
  assert.ok(sider.some(s => s.navn === 'guides.html'));
});

test('privatkøb: ingen falsk påstand om, at reklamationsretten slet ikke findes', () => {
  const g = GUIDES.find(x => x.slug === 'guide-brugt-motorcykel');
  const html = renderGuide(g, ctx);
  assert.ok(!/Ved privatkøb gælder den ikke/.test(html), 'tl;dr må ikke afvise reklamationsretten ved privatkøb');
  assert.match(html, /Har I ikke aftalt andet, gælder købeloven/);
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

test('sidebjælken: maxi-scootere og el-crossere udelukkes; privatkøb nævner yderfrist og svig', () => {
  const mk = (i, brand, model, extra) => Object.assign({ id: String(i), brand, model, year: 2020, km: 1000, ccm: 300, power: 28, price: 50000, photoUrls: ['https://example.com/a.jpg'], isExternal: false, createdAt: '2026-01-01', saelgertype: 'forhandler' }, extra);
  const ud = udvalgTilSidebjaelke([mk(1, 'Honda', 'NSS 300 Forza'), mk(2, 'Suzuki', 'AN 400 Burgman'), mk(3, 'BMW', 'C 400 GT'), mk(4, 'Triumph', 'TF 250-E'), mk(5, 'Honda', 'X', { type: 'cross', model: 'Y 250' }), mk(6, 'Honda', 'CB500F'), mk(7, 'Yamaha', 'MT-07')]);
  assert.deepStrictEqual(ud.map(l => l.model).sort(), ['CB500F', 'MT-07']);
  const html = renderGuide(GUIDES.find(x => x.slug === 'guide-brugt-motorcykel'), ctx);
  assert.match(html, /uden ugrundet ophold/);
  assert.match(html, /yderste frist/);
  assert.match(html, /Det dækker ikke svig/);
  assert.match(html, /ikke normal slitage/);
  assert.ok(!/§ 19/.test(html), '§ 19 er ikke "som beset"-paragraffen');
  assert.match(html, /eli\/lta\/2021\/1853/);
});

test('T-001: A2-guiden har informationsintention — én tekst overalt, og den kommercielle titel ligger kun på kørekortsiden', () => {
  const g = GUIDES.find(x => x.file === 'guide-a2-koerekort.html');
  const side = sider.find(s => s.navn === 'guide-a2-koerekort.html').html;
  const tekst = 'A2-kørekort: regler, alder og krav';
  assert.strictEqual(g.title, tekst);
  assert.strictEqual(g.h1, tekst);
  assert.strictEqual(g.navn, tekst);
  const title = side.match(/<title>([^<]+)<\/title>/)[1];
  assert.ok(title.length <= 60, `title ${title.length} tegn`);
  assert.ok(!/Motorcykler til A2-kørekort/.test(title + g.h1 + g.navn), 'den kommercielle titel hører til koerekort-a2');
  assert.strictEqual(side.match(/<h1[^>]*>([^<]+)<\/h1>/)[1], tekst, 'H1 = title-stammen');
  const art = ldBlokke(side).find(o => o['@type'] === 'Article');
  assert.strictEqual(art.headline, tekst, 'Article-headline = H1 = title-stammen');
  assert.match(side, new RegExp('<meta property="og:title" content="' + tekst));
  // Oversigtens kort bruger samme tekst.
  assert.match(sider.find(s => s.navn === 'guides.html').html, new RegExp('gd-card-title">' + tekst));
});

test('W7: nye guides har egne, ikke-opdigtede datoer, og oversigten tæller alle guides', () => {
  for (const g of GUIDES){
    const html = sider.find(x => x.navn === g.file).html;
    const pub = g.published || '2026-10-15', mod = g.modified || '2026-10-15';
    assert.ok(mod >= pub, g.file + ': modified >= published');
    const art = ldBlokke(html).find(o => o['@type'] === 'Article');
    assert.strictEqual(art.datePublished, pub);
    assert.strictEqual(art.dateModified, mod);
    assert.match(html, new RegExp('<meta property="article:published_time" content="' + pub + '">'));
    assert.match(html, new RegExp('<meta property="article:modified_time" content="' + mod + '">'));
  }
  const nye = GUIDES.filter(g => g.published === '2026-10-16');
  assert.strictEqual(nye.length, 2);
  const over = sider.find(s => s.navn === 'guides.html').html;
  for (const g of GUIDES) assert.ok(over.includes('href="' + g.file + '"'), g.file + ' mangler i oversigten');
  assert.strictEqual(ldBlokke(over).find(o => o['@type'] === 'CollectionPage').mainEntity.numberOfItems, GUIDES.length);
});

test('W7: "Læs også" er højst 3 ægte guides, aldrig siden selv, og alle guides har mindst ét indlink fra en anden guide', () => {
  const { relateredeGuides, MAX_RELATEREDE } = require('./build-guides');
  const indgaaende = new Map(GUIDES.map(g => [g.slug, 0]));
  for (const g of GUIDES){
    const r = relateredeGuides(g);
    assert.ok(r.length <= MAX_RELATEREDE && MAX_RELATEREDE === 3);
    assert.ok(!r.includes(g), g.slug + ' linker til sig selv');
    for (const x of r) indgaaende.set(x.slug, indgaaende.get(x.slug) + 1);
    for (const x of (g.related || [])) assert.ok(GUIDES.some(y => y.slug === x), g.slug + ': ukendt relateret guide ' + x);
    const html = sider.find(x => x.navn === g.file).html;
    assert.strictEqual(tael(html, /class="gd-sources gd-related"/g), r.length ? 1 : 0);
  }
  for (const [slug, n] of indgaaende) assert.ok(n >= 1, slug + ' har intet indlink fra en anden guide');
});

test('W7: forsikrings- og udstyrsguiden holder sig til sikre fakta — ingen tal, ingen anbefalede selskaber', () => {
  for (const f of ['guide-mc-forsikring.html', 'guide-mc-udstyr.html']){
    const g = GUIDES.find(x => x.file === f);
    const tekst = JSON.stringify(g.sections.map(s => s.html)) + g.tldr.join(' ');
    assert.ok(!/d[d.]*s?(kr|kr.|procent|%|DKK)/i.test(tekst), f + ': ingen beløb eller procenter');
    assert.ok(!/(Tryg|Alka|Topdanmark|Codan|Gjensidige|If Skadeforsikring|Lærerstandens|Købstædernes)/.test(tekst), f + ': ingen navngivne selskaber');
    assert.ok(g.sources.length >= 3, f + ': kilder');
  }
  const f = GUIDES.find(x => x.slug === 'guide-mc-forsikring');
  assert.ok(f.sources.includes('faerdsel') && f.sources.includes('ankenaevn') && f.sources.includes('forbrugerombudsmanden'));
  const html = sider.find(x => x.navn === 'guide-mc-forsikring.html').html;
  assert.match(html, /§ 105/);
  assert.match(html, /ikke forsikringsrådgivning/);
});

test('W7: sitemap-linjerne bruger hver guides egen dato', () => {
  const { udvidSitemap } = require('./build-guides');
  const os = require('node:os');
  assert.strictEqual(typeof udvidSitemap, 'function');
  const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  for (const g of GUIDES){
    assert.ok(xml.includes('<loc>' + cleanUrl(g.file) + '</loc><lastmod>' + (g.modified || '2026-10-15') + '</lastmod>'), g.file + ' mangler i sitemap.xml med rigtig lastmod');
  }
});
