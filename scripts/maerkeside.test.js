/* Tests for maerkesidens egne ord og dens interne adresser. Kør: npm test

   Hvorfor lige de her:

   Mærkesiderne fandtes ikke i drift. `fetchListings()` læste kun `listings`,
   som har 0 rækker, så byggekæden producerede nul mærkesider og et sitemap
   med syv adresser, mens 332 indekserede annoncer lå ulæste i
   `eksterne_annoncer` (findingen C-014). Nu bygges siderne af begge kilder —
   og dermed af data med huller: målt på lageret har 22 af 332 annoncer ingen
   pris og 163 af 332 ingen kilometerstand.

   Det er præcis dér, en genereret side begynder at påstå noget. Den gamle
   indledning skrev prisspændet ubetinget ("null kr.") og
   `l.km.toLocaleString()` ubetinget — sidstnævnte ville have kastet en
   TypeError midt i byggeriet. Og `brandItemListLd()` navngav en
   annonce-<slug>.html for hver annonce, også de indekserede, som ikke HAR en
   (samme fejl som C-015 i js/seo.js: struktureret data, der peger på 404).

   Den sidste gruppe er D-010 og handler om det samme et niveau højere:
   mærkeindekset linkede alle 60 kendte mærker til soegning.html?brands=X, og
   44 af de links gav nul træf. Et link er en påstand om, at der er noget for
   enden. Reglen — nævn mærket, men link det først når der er lager — er en
   linje kode, og den er nem at "forenkle" tilbage.

   De fire ting er små nok til at blive "ryddet op" af en senere runde og dyre
   nok til at blive låst her. */

const test = require('node:test');
const assert = require('node:assert');

// require.main-gaten i build-brand-pages.js gør, at det her IKKE kører et byg.
const { introFor, noscriptLinje, brandItemListLd, harEgenSide, internAdresse, maerkerUdenLager }
  = require('./build-brand-pages.js');

function ekstern(extra){
  return Object.assign({
    id: '42410d86-c150-4ce9-8e0f-8ca744bb4e0c',
    isExternal: true, brand: 'Honda', model: 'VT 700', year: 1986,
    price: 34800, km: 67000, type: 'cruiser', city: 'Rødding',
    source: { navn: 'MC Syd', domaene: 'mcsyd.dk' },
  }, extra || {});
}
function egen(extra){
  return Object.assign({
    id: 1017, brand: 'Suzuki', model: 'GSX-R750', year: 2017,
    price: 79800, km: 21000, type: 'sport', city: 'Aarhus',
    createdAt: '2026-08-01T10:00:00Z',
  }, extra || {});
}

/* ---- Indledningen må ikke opfinde det, kilden ikke har oplyst ---- */

test('en annonce uden pris giver hverken "null kr." eller NaN', () => {
  const tekst = introFor('Honda', [ekstern({ price: null }), ekstern({ price: null })]);
  for (const skidt of ['null', 'NaN', 'undefined']){
    assert.ok(!tekst.includes(skidt), `indledningen indeholdt "${skidt}": ${tekst}`);
  }
  // Ingen pris hos nogen => intet prisspaend paastaas overhovedet.
  assert.ok(!/\bfra .* til .*kr\./.test(tekst), 'der blev skrevet et prisspænd uden priser');
});

test('delvis prisdækning siges højt i stedet for at blive rundet væk', () => {
  const tekst = introFor('Honda', [ekstern({ price: 34800 }), ekstern({ price: null })]);
  assert.match(tekst, /34\.800 kr\./);
  assert.match(tekst, /1 annonce oplyser pris ved henvendelse/);
});

test('manglende årgang giver ikke "mellem NaN og NaN"', () => {
  const tekst = introFor('Honda', [ekstern({ year: null }), ekstern({ year: null })]);
  assert.ok(!tekst.includes('NaN'), tekst);
  assert.ok(!/årgang/.test(tekst), 'der blev skrevet en årgang, kilden ikke har oplyst');
});

test('indekserede annoncer nævner kilden — siden er ikke stedet, handlen sker', () => {
  const tekst = introFor('Honda', [ekstern(), ekstern()]);
  assert.match(tekst, /indekseret fra MC Syd/);
  assert.match(tekst, /handlen sker hos kilden/);
});

test('egne annoncer får IKKE en kildesætning på sig', () => {
  const tekst = introFor('Suzuki', [egen(), egen()]);
  assert.ok(!/indekseret fra/.test(tekst), tekst);
  assert.match(tekst, /privat sælger eller forhandler/);
});

/* ---- <noscript>-listen ---- */

test('noscript-linjen kaster ikke på en annonce uden km', () => {
  const linje = noscriptLinje(ekstern({ km: null }));
  assert.ok(!/km/.test(linje), `km blev nævnt uden et tal: ${linje}`);
  assert.ok(!linje.includes('null') && !linje.includes('NaN'), linje);
});

test('noscript-linjen skriver "pris ved henvendelse", ikke "0 kr."', () => {
  assert.match(noscriptLinje(ekstern({ price: null })), /pris ved henvendelse/);
});

/* ---- Adresser: kun sider, der findes ---- */

test('kun egne annoncer har en forrenderet side', () => {
  assert.equal(harEgenSide(egen()), true);
  assert.equal(harEgenSide(ekstern()), false);
});

test('en indekseret annonce peges til annonce.html?id=, aldrig til en annonce-slug', () => {
  const adresse = internAdresse(ekstern());
  assert.equal(adresse, 'annonce.html?id=42410d86-c150-4ce9-8e0f-8ca744bb4e0c');
  assert.ok(!adresse.startsWith('annonce-'),
    'annonce-<slug>.html findes ikke for indekserede annoncer — det ville være en 404');
});

test('ItemList udelader annoncer uden egen side — og bortfalder, når ingen har en', () => {
  // Det var C-015-fejlen: hvert ListItem fik en url, der svarede 404.
  assert.equal(brandItemListLd('Honda', [ekstern(), ekstern()]), null,
    'et ItemList over sider, der ikke findes, er værre end intet ItemList');

  const blandet = brandItemListLd('Suzuki', [ekstern(), egen(), ekstern()]);
  assert.equal(blandet.numberOfItems, 1, 'numberOfItems skal tælle det, listen faktisk indeholder');
  assert.equal(blandet.itemListElement.length, 1);
  assert.equal(blandet.itemListElement[0].position, 1, 'positionerne skal være sammenhængende');
  assert.match(blandet.itemListElement[0].url, /\/annonce-suzuki-gsx-r750-2017-1017\.html$/);
});

/* ---- Mærkeindekset: intet link uden noget for enden (D-010) ---- */

test('et mærke uden lager bliver ikke til et link', () => {
  const uden = maerkerUdenLager(['Honda', 'Vespa', 'Nimbus'], ['Honda']);
  assert.deepEqual(uden, ['Nimbus', 'Vespa'],
    'de to uden lager nævnes stadig — de skal bare ikke være links til nul træf');
});

test('Sym og SYM er samme mærke — ellers står det begge steder', () => {
  // Mærkefiltret er versalfølsomt: soegning.html?brands=SYM gav 0 annoncer,
  // ?brands=Sym gav 1. Listen i js/data.js skriver "SYM", lageret "Sym".
  // Uden en versalufølsom sammenligning ville Sym stå både i grid'en over
  // mærker MED annoncer og på listen over mærker UDEN.
  assert.deepEqual(maerkerUdenLager(['SYM', 'Vespa'], ['Sym']), ['Vespa']);
});

test('et mærke, listen ikke kender, dukker ikke op blandt dem uden lager', () => {
  // Rewaco har lager, men står ikke i BRANDS_BY_MODEL. Den hører hjemme i
  // grid'en ovenfor, ikke på nogen af de to lister her.
  assert.deepEqual(maerkerUdenLager(['Honda'], ['Honda', 'Rewaco']), []);
});

test('rækkefølgen er dansk, og tomme lister vælter ikke', () => {
  assert.deepEqual(maerkerUdenLager(['Ural', 'Beta', 'Zontes'], []), ['Beta', 'Ural', 'Zontes']);
  assert.deepEqual(maerkerUdenLager([], ['Honda']), []);
  assert.deepEqual(maerkerUdenLager(['Honda'], null), ['Honda']);
});
