/* Strukturerede data (W7 SEO): korrekt og minimal JSON-LD på alle indekserbare sider.

   Kør: node --test scripts/seo-schema.test.js

   Testen læser de committede .html-filer i roden (ingen netværk, ingen Supabase) og kontrollerer
   skema-invarianterne, som søgemaskinerne straffer, hvis de brydes:
     - alt JSON-LD kan parses, og kun de forventede typer står på hver sidefamilie,
     - BreadcrumbList: positioner 1..n, starter med Forside, ender i sidens egen canonical, peger ikke på
       noindex-sider, og navnene er de samme som brødkrummen, læseren ser,
     - FAQPage: hvert spørgsmål OG svar står synligt på siden (usynlig FAQ-markup er en manual action),
     - ItemList: tæller rigtigt og kun med adresser, siden selv linker til,
     - Article: datoer stammer fra guides-data.js (ingen opdigtede datoer), og modified >= published,
     - aldrig aggregateRating/review (vi har ingen anmeldelser).
   Generatorfunktionerne testes desuden direkte med fixtures, så en fremtidig regression fanges, også
   når de committede sider ikke indeholder typen. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { siteUrl } = require('./shared');
const BASE = siteUrl();

const sider = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort().map(fil => {
  const raa = fs.readFileSync(path.join(ROOT, fil), 'utf8');
  const noindex = /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(raa);
  const ld = [...raa.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map(m => JSON.parse(m[1].replace(/\\u003c/g, '<')))
    .flatMap(o => Array.isArray(o['@graph']) ? o['@graph'] : [o]);   // forsidens WebSite+Organization ligger i @graph
  const canonical = (raa.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || null;
  const synlig = dekod(raa.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
  const bc = (raa.match(/<nav class="[^"]*breadcrumb[^"]*"[^>]*>([\s\S]*?)<\/nav>/) || [])[1] || '';
  const bcNavne = bc ? dekod(bc.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<span class="bc-sep"[^>]*>[\s\S]*?<\/span>/g, '|').replace(/<[^>]+>/g, ' ')).split('|').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean) : [];
  return { fil, raa, noindex, ld, canonical, synlig, bcNavne };
});
function dekod(s){
  return String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ');
}
const indekserbare = sider.filter(s => !s.noindex);
const typer = s => s.ld.map(o => o['@type']);
const fil = f => sider.find(s => s.fil === f);
const urlTilFil = u => {
  const p = String(u).replace(BASE, '').replace(/^\//, '').replace(/[?#].*$/, '');
  if (!p) return 'index.html';
  return p.endsWith('.html') ? p : p + '.html';
};

/* Hvilke typer må stå hvor. Alt andet er støj og et tegn på, at en generator har skrevet noget, den ikke kan
   stå inde for. */
function tilladt(s){
  const f = s.fil;
  if (f === 'index.html') return ['WebSite', 'Organization'];
  if (/^annonce-/.test(f)) return ['Product', 'BreadcrumbList'];
  if (/^guide-/.test(f)) return ['Article', 'BreadcrumbList'];
  if (f === 'guides.html') return ['CollectionPage', 'BreadcrumbList'];
  if (f === 'om-bikerbasen.html') return ['AboutPage', 'BreadcrumbList'];
  if (/^(maerke|model|type|region|budget|by|mc|koerekort)-/.test(f)) return ['BreadcrumbList', 'FAQPage', 'ItemList'];
  return ['BreadcrumbList'];
}
const flad = t => [].concat(t);

test('alt JSON-LD kan parses (også på noindex-sider), og ingen anmeldelser opfindes', () => {
  assert.ok(sider.length > 30);
  for (const s of sider){
    const blok = s.raa.match(/<script type="application\/ld\+json"[^>]*>/g) || [];
    assert.ok(s.ld.length >= blok.length, `${s.fil}: JSON-LD-blok kunne ikke læses`);
    assert.ok(!/aggregateRating|"review"|"Review"|"Rating"|ratingValue/.test(JSON.stringify(s.ld)), `${s.fil}: opdigtet vurdering`);
  }
});

test('hver indekserbar side har kun de JSON-LD-typer, familien skal have', () => {
  for (const s of indekserbare){
    const ok = tilladt(s);
    for (const t of typer(s).flatMap(flad)){
      assert.ok(ok.includes(t) || (t === 'Motorcycle' && ok.includes('Product')), `${s.fil}: uventet @type ${t}`);
    }
    const antal = {};
    for (const t of typer(s).map(x => flad(x)[0])) antal[t] = (antal[t] || 0) + 1;
    for (const [t, n] of Object.entries(antal)) assert.strictEqual(n, 1, `${s.fil}: ${n} stk. ${t}`);
  }
});

test('BreadcrumbList: findes, positioner 1..n, Forside først, canonical sidst, ingen noindex-led', () => {
  const uden = new Set(['index.html', 'soegning.html', 'opret-annonce.html']);
  for (const s of indekserbare.filter(x => !uden.has(x.fil))){
    const bc = s.ld.filter(o => o['@type'] === 'BreadcrumbList');
    assert.strictEqual(bc.length, 1, `${s.fil}: præcis én BreadcrumbList`);
    const it = bc[0].itemListElement;
    assert.ok(it.length >= 2, `${s.fil}: mindst to led`);
    it.forEach((x, i) => {
      assert.strictEqual(x.position, i + 1, `${s.fil}: position ${i + 1}`);
      assert.ok(x.name && String(x.name).trim(), `${s.fil}: led uden navn`);
      assert.ok(String(x.item).startsWith(BASE), `${s.fil}: led uden for sitet (${x.item})`);
    });
    assert.strictEqual(it[0].name, 'Forside', `${s.fil}: første led`);
    assert.strictEqual(it[0].item.replace(/\/$/, ''), BASE, `${s.fil}: Forside peger på roden`);
    assert.strictEqual(it[it.length - 1].item, s.canonical, `${s.fil}: sidste led = canonical`);
    assert.strictEqual(new Set(it.map(x => x.item)).size, it.length, `${s.fil}: dublet-led`);
    /* Mellemled med parametre (søgeadresser) kan ikke afgøres som fil; de øvrige må ikke være noindex. */
    for (const x of it.slice(0, -1).filter(y => !/[?#]/.test(y.item))){
      const mal = fil(urlTilFil(x.item));
      assert.ok(mal, `${s.fil}: ${x.item} findes ikke`);
      assert.ok(!mal.noindex, `${s.fil}: brødkrumme-led ${x.item} er noindex`);
    }
  }
});

test('BreadcrumbList: navnene er en tro delmængde af den brødkrumme, læseren ser', () => {
  /* Facetsiderne viser "Forside > Søgning > Side", men JSON-LD udelader mellemleddet "Søgning" bevidst (T-007,
     facet-sider.test.js). Delmængde i samme rækkefølge, samme første og sidste led — aldrig et led, læseren ikke ser. */
  for (const s of indekserbare.filter(x => x.bcNavne.length)){
    const bc = s.ld.find(o => o['@type'] === 'BreadcrumbList');
    if (!bc) continue;
    const ld = bc.itemListElement.map(x => x.name);
    assert.strictEqual(ld[0], s.bcNavne[0], `${s.fil}: første led`);
    assert.strictEqual(ld[ld.length - 1], s.bcNavne[s.bcNavne.length - 1], `${s.fil}: sidste led`);
    let i = 0;
    for (const n of s.bcNavne) if (ld[i] === n) i++;
    assert.strictEqual(i, ld.length, `${s.fil}: JSON-LD ${JSON.stringify(ld)} er ikke en delmængde af synlig ${JSON.stringify(s.bcNavne)}`);
  }
});

test('FAQPage: spørgsmål og svar står synligt på siden', () => {
  let set = 0;
  for (const s of indekserbare){
    for (const o of s.ld.filter(x => x['@type'] === 'FAQPage')){
      set++;
      assert.ok(o.mainEntity.length >= 1, `${s.fil}: tom FAQ`);
      for (const q of o.mainEntity){
        assert.strictEqual(q['@type'], 'Question');
        const navn = q.name.replace(/\s+/g, ' ').trim();
        const svar = q.acceptedAnswer.text.replace(/\s+/g, ' ').trim();
        assert.ok(s.synlig.includes(navn), `${s.fil}: spørgsmålet er ikke synligt: ${navn.slice(0, 60)}`);
        assert.ok(s.synlig.includes(svar), `${s.fil}: svaret er ikke synligt: ${svar.slice(0, 60)}`);
      }
    }
  }
  assert.ok(set > 10, 'forventede FAQ på mærke-, model-, type- og budgetsider');
});

test('ItemList: tæller rigtigt, har kun adresser, siden selv linker til', () => {
  for (const s of indekserbare){
    for (const o of s.ld.filter(x => x['@type'] === 'ItemList')){
      assert.strictEqual(o.numberOfItems, o.itemListElement.length, `${s.fil}: numberOfItems`);
      o.itemListElement.forEach((x, i) => {
        assert.strictEqual(x.position, i + 1);
        assert.ok(String(x.url).startsWith(BASE + '/'), `${s.fil}: ${x.url}`);
        const rel = String(x.url).replace(BASE + '/', '');
        assert.ok(s.raa.includes(`href="${rel}"`), `${s.fil}: ItemList-adressen ${rel} er ikke linket på siden`);
        assert.ok(fs.existsSync(path.join(ROOT, rel)), `${s.fil}: ${rel} findes ikke`);
      });
    }
  }
});

test('ItemList-generatorerne skriver kun en liste, der dækker ALLE annoncer', () => {
  const brand = require('./build-brand-pages');
  const mk = (n, medSide) => Array.from({ length: n }, (_, i) => ({ id: 'a' + i, brand: 'Honda', model: 'CB' + i, year: 2020, isExternal: !medSide, externalUrl: 'https://kilde.example/' + i }));
  const egne = mk(3, true);
  assert.strictEqual(brand.brandItemListLd('Honda', mk(3, false)), null, 'ingen med egen side: ingen liste');
  const ld = brand.brandItemListLd('Honda', egne);
  if (ld){
    assert.strictEqual(ld.numberOfItems, 3);
    assert.strictEqual(ld.itemListElement.length, 3);
    assert.strictEqual(brand.brandItemListLd('Honda', egne.concat(mk(2, false))), null, 'delmængde er en misvisende liste');
  }
});

test('Article: datoerne stammer fra guides-data, modified >= published, og meta-tags stemmer', () => {
  const { GUIDES, PUBLISHED, MODIFIED } = require('./guides-data');
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  for (const g of GUIDES){
    const s = fil(g.file);
    assert.ok(s, `${g.file} findes ikke på disk — kør node scripts/build-guides.js`);
    const art = s.ld.find(o => o['@type'] === 'Article');
    assert.ok(art, `${g.file}: Article`);
    const pub = g.published || PUBLISHED, mod = g.modified || MODIFIED;
    assert.match(art.datePublished, ISO);
    assert.match(art.dateModified, ISO);
    assert.strictEqual(art.datePublished, pub);
    assert.strictEqual(art.dateModified, mod);
    assert.ok(art.dateModified >= art.datePublished);
    assert.ok(s.raa.includes(`<meta property="article:published_time" content="${pub}">`));
    assert.ok(s.raa.includes(`<meta property="article:modified_time" content="${mod}">`));
    assert.strictEqual(art.author['@type'], 'Organization');
    assert.strictEqual(art.headline, g.h1);
    assert.ok(s.synlig.includes(art.headline), 'headline står som synlig overskrift');
    assert.ok(art.headline.length <= 110, 'Article.headline over 110 tegn afkortes af Google');
  }
});

test('Product (annonce): pris, valuta og adresse er konkrete — intet gættet', () => {
  for (const s of indekserbare.filter(x => /^annonce-/.test(x.fil))){
    const p = s.ld.find(o => flad(o['@type']).includes('Product'));
    assert.ok(p, `${s.fil}: Product`);
    assert.ok(p.name && p.url === s.canonical, `${s.fil}: navn og url`);
    const tilbud = [].concat(p.offers);
    for (const t of tilbud){
      assert.ok(Number(t.price) > 0, `${s.fil}: pris`);
      assert.strictEqual(t.priceCurrency, 'DKK');
    }
  }
});
