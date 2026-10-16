/* Tests for ÉT annoncekort + ÉN containerskala (w2-bredde). Kør: node --test js/annoncekort.test.js

   Samlet Critic (P2-1, P2-5): hver sidefamilie havde sin egen containerbredde og tre korttyper. Her låses det,
   der ikke kan ses i en enkelt CSS-regel: at der kun er ét kort (samme anatomi for indekseret og egen annonce,
   med og uden foto/pris), at kørekortbadgen står først, at et kort uden foto får en ærligt mærket typeillustration,
   at ingen sidefamilie sætter sin egen containerbredde, og at menu/footer peger på kørekort A og guides. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROD = path.join(__dirname, '..');
const læs = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const læsRod = f => fs.readFileSync(path.join(ROD, f), 'utf8');
const KILDER = ['icons.js', 'data.js', 'filtrering.js', 'components.js', 'sortering.js', 'search.js'];

const STUB = `
const noop = () => {};
const elStub = () => ({
  classList:{add:noop,remove:noop,toggle:noop,contains:()=>false}, style:{},
  appendChild:noop, setAttribute:noop, getAttribute:()=>null, addEventListener:noop,
  querySelector:()=>null, querySelectorAll:()=>[], dataset:{}, hidden:true,
  textContent:'', innerHTML:'', firstElementChild:null,
});
const document = {
  addEventListener:noop, querySelector:()=>null, querySelectorAll:()=>[],
  getElementById:()=>null, createElement:elStub, documentElement:elStub(),
  body:{classList:{add:noop,remove:noop,toggle:noop},appendChild:noop,style:{}},
  readyState:'loading', title:'',
};
const window = { location:{href:'',search:'',pathname:'/soegning.html'}, addEventListener:noop,
  matchMedia:()=>({matches:false,addEventListener:noop}), scrollTo:noop, history:{} };
const history = { scrollRestoration:'auto', replaceState:noop, pushState:noop };
const location = { href:'', search:'', pathname:'/soegning.html', origin:'http://localhost' };
const localStorage = { getItem:()=>null, setItem:noop, removeItem:noop };
const sessionStorage = { getItem:()=>null, setItem:noop, removeItem:noop };
const Store = { isComparing:()=>false, isFavorite:()=>false, getUser:()=>null };
`;

const { listingCardHTML, markerFotoFejl, fotoFejlHTML } = new Function(
  STUB + KILDER.map(læs).join('\n') +
  '\nreturn { listingCardHTML, markerFotoFejl, fotoFejlHTML };')();

const KILDE_URL = 'https://mcsyd.dk/Produkter/Motorcykel/Brugt/Honda?p=180898&m=1489';
function ekstern(extra){
  return Object.assign({
    id: '42410d86-c150-4ce9-8e0f-8ca744bb4e0c', isExternal: true,
    brand: 'Honda', model: 'CB 1000 Hornet', type: 'naked',
    price: 124800, year: 2024, km: 8100, ccm: 1000, power: 150, city: 'Rødding', postnr: 6630,
    isDealer: true, externalUrl: KILDE_URL, source: { navn: 'MC Syd', domaene: 'mcsyd.dk' },
    photoUrls: ['https://images.example/h.jpg'],
  }, extra || {});
}
function egen(extra){
  return Object.assign({
    id: 1021, brand: 'KTM', model: 'RC 390', type: 'sport', price: 44900, year: 2021,
    km: 9100, ccm: 373, power: 44, city: 'Aarhus', isDealer: false, createdAt: '2020-01-01T00:00:00Z',
    photoUrls: ['https://images.example/k.jpg'],
  }, extra || {});
}
const chips = html => (html.match(/<ul class="rk-chips">([\s\S]*?)<\/ul>/) || [, ''])[1];
const lister = html => (chips(html).match(/<li\b[^>]*>[\s\S]*?<\/li>/g) || []);

/* ---------- ét kort ---------- */

test('ét kort: samme anatomi uanset kilde, foto og pris', () => {
  const dele = html => ['card-media', 'rk-top', 'rk-titel', 'rk-pris', 'rk-linje', 'rk-chips', 'rk-fod', 'rk-sted', 'rk-kilde', 'card-compare', 'card-link']
    .filter(k => html.includes(k));
  const alle = [
    ekstern(), ekstern({ photoUrls: [] }), ekstern({ price: null }), ekstern({ type: null, photoUrls: [] }),
    egen(), egen({ photoUrls: [] }), egen({ price: null }), egen({ isDealer: true }),
  ].map(l => listingCardHTML(l, 1));
  const facit = dele(alle[0]);
  assert.equal(facit.length, 11, 'kortet skal have alle elementer');
  for (const html of alle) assert.deepEqual(dele(html), facit);
  for (const html of alle){
    assert.ok(/class="card card-rich/.test(html), 'altid samme kortklasse');
    assert.ok(!/card-external|card-body|card-meta|card-specs|card-kildelinje|card-source-badge/.test(html), 'ingen rester af de gamle korttyper');
  }
});

test('kørekortbadgen står FØRST i chip-rækken, for alle kort', () => {
  for (const l of [ekstern(), ekstern({ power: null }), ekstern({ power: 28, ccm: 300 }), egen(), egen({ ccm: null, power: null })]){
    const første = lister(listingCardHTML(l, 1))[0] || '';
    assert.match(første, /class="rk-chip rk-kk kk-/, 'første chip er kørekortbadgen');
  }
});

test('chips: kun oplyste tal, aldrig kg — selv om en kilde en dag sender et vægtfelt', () => {
  const html = listingCardHTML(ekstern({ weight: 210, vaegt: 210, kg: 210 }), 1);
  assert.ok(!/\bkg\b/i.test(chips(html)), 'ingen vægtchip: vægt er ikke et felt, vi må gemme (CLAUDE.md regel 2)');
  assert.match(chips(html), /1\.000 ccm/);
  assert.match(chips(html), /150 hk/);
  const udenTal = listingCardHTML(ekstern({ ccm: null, power: null }), 1);
  assert.match(chips(udenTal), /ccm og hk ikke oplyst/);
  assert.ok(!/ 0 ccm|0 hk|null|NaN|undefined/.test(udenTal));
});

test('"Kørekort Kørekort A": kørekortbadgen siger "Kræver A", ikke en dobbelt label', () => {
  const html = listingCardHTML(ekstern(), 1);   // 150 hk -> A
  const badge = lister(html)[0];
  assert.match(badge, /<span>Kræver A<\/span>/);
  assert.ok(!/Kørekort Kørekort/.test(html));
  assert.ok(!/class="card-koerekort/.test(html), 'det gamle foto-overlay med ::before-label findes ikke mere');
});

test('salgsmarkør vises fuldt som chip — aldrig klippet til "EN…" — og uden pris står der "Pris ved henvendelse"', () => {
  const html = listingCardHTML(ekstern({ price: null, salgsmarkoerer: ['ENGROS', 'UDEN KLARGØRING'] }), 1);
  // F-010 (w3-data): kildens ord vises, kun versalerne pænnes ("ENGROS" -> "Engros").
  assert.match(html, /<li class="rk-chip rk-chip-note" title="Engros · Uden klargøring">Engros \+1<\/li>/);
  assert.match(html, /class="rk-pris pris-mangler">Pris ved henvendelse</);
  assert.ok(!/…|&hellip;|\.\.\./.test(html.replace(/<svg[\s\S]*?<\/svg>/g, '')), 'ingen afkortning skrevet ind i markup');
});

test('bunden: sted og sælgertype + kilde; egne annoncer siger "Privat sælger" eller forhandlerens navn', () => {
  const e = listingCardHTML(ekstern(), 1);
  assert.match(e, /class="rk-sted"[\s\S]*?<span>Rødding<\/span>/);
  assert.match(e, /<span class="rk-saelgertype">Forhandler · <\/span>mcsyd\.dk/);
  assert.match(listingCardHTML(egen(), 1), /class="rk-kilde"[\s\S]*?<span>Privat sælger<\/span>/);
  assert.match(listingCardHTML(egen({ isDealer: true, seller: { name: 'Roskilde MC ApS' } }), 1), /class="rk-kilde"[\s\S]*?Roskilde MC ApS/);
  // Kilden oplyser ingen sælgertype: domænet står alene — ingen gættet "Privat".
  const ukendt = listingCardHTML(ekstern({ isDealer: false, saelgertype: null }), 1);
  assert.ok(!/rk-saelgertype/.test(ukendt));
});

test('ikoner: sammenlign på alle kort, hjerte KUN hvor det virker (egne annoncer)', () => {
  assert.match(listingCardHTML(ekstern(), 1), /data-compare-toggle/);
  assert.ok(!/fav-btn/.test(listingCardHTML(ekstern(), 1)));
  assert.match(listingCardHTML(egen(), 1), /data-compare-toggle/);
  assert.match(listingCardHTML(egen(), 1), /data-fav-toggle="1021"/);
});

test('"Ny" (fabriksny hos forhandler) står først i linjen og forklarer garanti — og savnet km tælles ikke som hul', () => {
  // Katalogsti (MC Syds /Ny/): "katalog over NYE motorcykler" og garantisætningen.
  const html = listingCardHTML(ekstern({ km: null, kildeStand: 'ny', externalUrl: 'https://mcsyd.dk/Produkter/Motorcykel/Ny/Honda%20CB%201000/1' }), 1);
  assert.match(html, /<p class="rk-linje"><span class="rk-ny" title="[^"]*katalog over NYE motorcykler[^"]*garanti frem for reklamationsret[^"]*">Ny<\/span>/);
  assert.ok(!/Km ikke oplyst/.test(html), 'en ny motorcykel har ingen km — det er ikke et hul');
  // Ingen katalogsti: kortet siger kun, hvad kilden markerer — aldrig "katalog".
  const uden = listingCardHTML(ekstern({ km: null, kildeStand: 'ny' }), 1);
  assert.match(uden, /<span class="rk-ny" title="Kilden markerer annoncen som ny[^"]*">Ny<\/span>/);
  assert.ok(!/katalog/.test(uden));
});

/* ---------- uden foto ---------- */

test('uden foto: ærligt tomt felt med kameraikon — aldrig en tegning eller et typebillede', () => {
  for (const l of [ekstern({ photoUrls: [] }), egen({ photoUrls: [] })]){
    const html = listingCardHTML(l, 1);
    const felt = (html.match(/<div class="foto-tom[^"]*"[\s\S]*?<\/div>/) || [''])[0];
    assert.match(felt, /class="foto-tom"/);
    assert.match(felt, /Ingen fotos i denne annonce/);
    assert.ok(!/tt-|Typebillede|foto-tom--type/.test(felt), 'ingen typeillustration (annoncesiden lover: vi viser ikke en tegning i stedet)');
  }
});

test('uden foto og uden kendt type: kameraikon + sætningen (ingen opfundet type)', () => {
  const html = listingCardHTML(ekstern({ photoUrls: [], type: null }), 1);
  assert.match(html, /<div class="foto-tom">/);
  assert.match(html, /Ingen fotos i denne annonce/);
  assert.ok(!/tt-/.test(html));
});

test('mislykket kortfoto er et ærligt felt uden typeillustration', () => {
  assert.match(fotoFejlHTML('sport'), /class="foto-tom foto-fejl"/);
  assert.ok(!/tt-|foto-tom--type/.test(fotoFejlHTML('sport')));
  const kort = { dataset: { type: 'cruiser' } };
  const media = { children: [], closest: s => (s === '.card' ? kort : null) };
  let indsat = '';
  const img = {
    tagName: 'IMG', dataset: {}, classList: { contains: c => c === 'card-photo' },
    closest: s => (s === '.card-media' ? media : null),
    insertAdjacentHTML: (_p, h) => { indsat = h; }, remove: () => {},
  };
  assert.equal(markerFotoFejl(img), true);
  assert.ok(!/tt-/.test(indsat), 'ingen typeillustration i stedet for et mislykket foto');
});

/* ---------- én containerskala ---------- */

test('én containerbredde: --site-w og --gutter i styles.css, og ingen familie sætter sin egen', () => {
  const css = læsRod('css/styles.css');
  assert.match(css, /--site-w: 1480px;/);
  assert.match(css, /\.container\{\s*width:100%;\s*max-width:var\(--site-w\);/);
  assert.match(css, /\.container--wide\{ max-width:var\(--site-w\); \}/);
  for (const f of fs.readdirSync(path.join(ROD, 'css')).filter(n => /^p-.*\.css$/.test(n))){
    const kilde = læsRod('css/' + f);
    // medieforespørgsler er knækpunkter, ikke bredder: de strippes før tjekket
    const afvigende = kilde.replace(/@(media|container)[^{]*\{/g, '').match(/max-width:\s*(1[0-9]{3})px/g) || [];
    assert.deepEqual(afvigende, [], `${f} må ikke sætte en egen sidebredde (brug var(--site-w))`);
  }
});

test('ét labelsæt og én h1-skala i søgekort og hero', () => {
  const css = læsRod('css/styles.css');
  for (const sel of ['.search-panel .field label', '.so-field > label', '.fa-soeg .field label', '.mk-search .field label'])
    assert.ok(css.includes(sel), `${sel} i den fælles labelregel`);
  assert.match(css, /--h1-hero: clamp\(/);
  for (const [fil, sel] of [['p-facet.css', '.fa-hero h1{'], ['p-guides.css', 'font-size: var(--h1-hero)'], ['p-opret.css', 'var(--h1-hero)'], ['p-dashboard.css', 'var(--h1-hero)'], ['p-login.css', 'var(--h1-hero)'], ['p-soegning.css', 'var(--h1-hero)']])
    assert.ok(læsRod('css/' + fil).includes(sel), `${fil} bruger h1-skalaen`);
});

/* ---------- menu og footer ---------- */

test('menuen har Kørekort A1/A2/A, og footeren peger på Artikler & guides og Kørekort A', () => {
  const index = læsRod('index.html');
  assert.match(index, /<div class="nav-sub"><a href="koerekort-a1\.html">Kørekort A1<\/a><a href="koerekort-a2\.html">Kørekort A2<\/a><a href="koerekort-a\.html">Kørekort A<\/a><\/div>/);
  const footer = index.slice(index.indexOf('<footer class="site-footer">'));
  assert.match(footer, /<li><a href="guides\.html">Artikler &amp; guides<\/a><\/li>/);
  assert.match(footer, /<li><a href="koerekort-a\.html">Kørekort A<\/a><\/li>/);
});

test('footeren er ens på tværs af håndskrevne sider (synk-header.js synkroniserer link-gitteret)', () => {
  const grid = html => { const a = html.indexOf('<div class="footer-grid">'); const b = html.indexOf('<div class="footer-bottom">', a); return a < 0 || b < 0 ? null : html.slice(a, b).replace(/\r\n/g, '\n'); };
  const facit = grid(læsRod('index.html'));
  assert.ok(facit);
  for (const f of ['soegning.html', 'annonce.html', 'login.html', 'dashboard.html', 'opret-annonce.html', 'guides.html', 'maerke-honda.html', 'type-sport.html'])
    assert.equal(grid(læsRod(f)), facit, `${f}: footerens link-gitter afviger fra index.html`);
});
