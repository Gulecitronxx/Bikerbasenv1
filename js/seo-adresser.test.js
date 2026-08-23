/* Tests for de PÅSTANDE, js/seo.js skriver ind i struktureret data — adresser
   og billeder. Kør: npm test

   Hvorfor de her tests findes:

   `seoSearchResults()` satte url = listingPageUrl(l) for hver annonce i
   resultatet. Målt på produktion, hvor 332 af 332 annoncer er indekserede fra
   en anden side: hver eneste af de adresser svarede 404, fordi en indekseret
   annonce hverken får en genereret side eller lov at blive indekseret
   (findingen C-015). Google fik en ItemList, hvor ingen af URL'erne fandtes.

   Fejlen var ikke i slug'en. Den var, at der blev spurgt om en adresse for en
   annonce, der ikke har en — og at funktionen ikke kunne svare nej. Det er
   dét, testene låser: at listingPageUrl() svarer null for en indekseret
   annonce, at kalderne udelader posten i stedet for at skrive en død URL, og
   at antallet i JSON-LD'et passer med det, listen faktisk indeholder.

   Den sidste test er den vigtigste af en anden grund: den holder js/seo.js og
   scripts/shared.js op mod hinanden. De to filer beregner det SAMME filnavn
   hver for sig, og kommentaren i shared.js siger hvorfor det skal være
   sådan ("Lå adresseberegningen to steder, ville et sitemap før eller siden
   pege på sider der ikke findes"). Indtil nu var det en hensigt. Nu er det
   målt.

   Den sidste gruppe er C-016 og handler om det samme, bare om et billede:
   `Vehicle.image` faldt tilbage på `og-image.png` — Bikerbasens logo —
   på en annonce, hvis egen side skrev "Ingen fotos i denne annonce". Et
   JSON-LD, der påstår noget, siden nægter, er den fejl, hele projektet er
   skrevet imod, og en fallback er præcis den slags kode, en senere oprydning
   sætter tilbage "for fuldstændighedens skyld".

   Mønstret er det samme som js/koerekort.test.js og js/eksternt-kort.test.js:
   browserscripts uden module.exports evalueres i en funktion, der giver
   navnene tilbage. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { listingSlug } = require('../scripts/shared.js');

/* Et minimalt <head>, der kan huske det, Seo.setJsonLd lægger i det. Der er
   ingen jsdom i dette repo (nul devDependencies, låst valg), så head'et er en
   liste af de elementer, koden har oprettet. */
/* Nok af en vælger til de mønstre, js/seo.js faktisk bruger:
   meta[name="..."], meta[property="..."], link[rel="..."]. Head'et SKAL kunne
   finde et tag, det allerede har fået — ellers ville setMeta() lægge et nyt
   ved siden af hver gang, og testen ville måle det første i stedet for det
   sidste. Præcis den forskel skjulte, at "nul træf" ikke satte description
   tilbage. */
function passer(el, vælger){
  const m = /^([a-z]+)\[([a-zA-Z:-]+)="([^"]+)"\]$/.exec(String(vælger).trim());
  return !!m && el.__tag === m[1] && el[m[2]] === m[3];
}

function lavDokument(){
  const børn = [];
  return {
    børn,
    head: {
      querySelector: v => børn.find(e => passer(e, v)) || null,
      querySelectorAll: v => børn.filter(e => String(v).split(',').some(d => passer(e, d))),
      appendChild(el){ børn.push(el); },
    },
    getElementById: id => børn.find(e => e.id === id) || null,
    createElement: tag => ({
      __tag: tag, id: '', type: '', textContent: '',
      setAttribute(k, v){ this[k] = v; },
      remove(){ const i = børn.indexOf(this); if (i >= 0) børn.splice(i, 1); },
    }),
    title: '',
  };
}

/* seo.js kalder fire formateringsfunktioner, der bor i js/data.js. De sendes
   ind som parametre i stedet for at hele data.js evalueres med: testen her
   handler om hvad der PÅSTÅS i struktureret data, ikke om hvordan et tal
   skrives på dansk. */
function indlæsSeo(doc){
  const src = fs.readFileSync(path.join(__dirname, 'seo.js'), 'utf8');
  return new Function('document', 'console', 'formatKm', 'formatCcm', 'formatPrice', 'typeLabel',
    src + '\n;return { listingPageUrl, itemListElementer, seoListingPage, seoSearchResults, seoDealerPage, Seo };'
  )(doc, { warn(){}, log(){} },
    n => `${n} km`, n => `${n} ccm`, n => `${n} kr.`, t => String(t));
}

function jsonLd(doc, id){
  const el = doc.børn.find(e => e.id === 'jsonld-' + id);
  return el ? JSON.parse(el.textContent) : null;
}

/* Værdien af et meta-tag, som Seo.setMeta har oprettet det. Attributnavnet
   skifter mellem 'property' (Open Graph) og 'name' (description, twitter).
   Der må kun være ÉT af hver — er der to, er det setMeta, der er brækket. */
function metaVærdi(doc, attr, navn){
  const alle = doc.børn.filter(e => e.__tag === 'meta' && e[attr] === navn);
  assert.ok(alle.length <= 1, `${alle.length} × <meta ${attr}="${navn}"> i head'et`);
  return alle.length ? alle[0].content : null;
}

const egen = extra => Object.assign({
  id: 1032, brand: 'KTM', model: 'RC 390', year: 2021,
}, extra || {});
const ekstern = extra => Object.assign({
  id: '72eb6a40-1111-2222-3333-444455556666', isExternal: true,
  brand: 'Honda', model: 'CBR 250 R', year: 2011,
}, extra || {});

/* ---- listingPageUrl ---- */

test('en indekseret annonce har ingen forrenderet adresse — og siger det', () => {
  const { listingPageUrl } = indlæsSeo(lavDokument());
  assert.equal(listingPageUrl(ekstern()), null,
    'annonce-honda-cbr-250-r-2011-72eb6a40.html findes ikke og svarede 404 i drift');
  assert.equal(listingPageUrl(null), null, 'ingen annonce, ingen adresse');
});

test('en egen annonce får stadig sin adresse', () => {
  const { listingPageUrl } = indlæsSeo(lavDokument());
  assert.equal(listingPageUrl(egen()), 'https://bikerbasen.dk/annonce-ktm-rc-390-2021-1032.html');
});

test('js/seo.js og scripts/shared.js beregner det SAMME filnavn', () => {
  // De to har hver sin kopi af udregningen. Driver de fra hinanden, peger
  // canonical og sitemap på hver sin adresse, og den ene af dem er en 404.
  const { listingPageUrl } = indlæsSeo(lavDokument());
  const annoncer = [
    egen(),
    egen({ id: 1017, brand: 'Suzuki', model: 'GSX-R750', year: 2017 }),
    egen({ id: 1021, brand: 'Yamaha', model: 'XV 750 Virago', year: 1990 }),
    // Danske bogstaver og skråstreg: de to translitterationer skal være ens.
    egen({ id: 1044, brand: 'Bæltebjørn', model: 'Ålborg/Øst 500', year: 2003 }),
  ];
  for (const l of annoncer){
    assert.equal(listingPageUrl(l), `https://bikerbasen.dk/${listingSlug(l)}`,
      `uenige om filnavnet for ${l.brand} ${l.model}`);
  }
});

/* ---- Søgesidens ItemList ---- */

test('søgeresultatets ItemList bortfalder, når ingen af annoncerne har en side', () => {
  const doc = lavDokument();
  const { seoSearchResults } = indlæsSeo(doc);
  seoSearchResults([ekstern(), ekstern({ id: 'aabbccdd-0000' })], 'Brugte Honda');
  assert.equal(jsonLd(doc, 'results'), null,
    'et ItemList med to døde URL\'er er værre end intet ItemList');
});

test('blandet resultat: kun annoncer med en side kommer med, og tallet passer', () => {
  const doc = lavDokument();
  const { seoSearchResults } = indlæsSeo(doc);
  seoSearchResults([ekstern(), egen(), ekstern(), egen({ id: 1017 })], 'Sport');

  const ld = jsonLd(doc, 'results');
  assert.equal(ld.numberOfItems, 2, 'numberOfItems skal tælle listen, ikke resultatsiden');
  assert.equal(ld.itemListElement.length, 2);
  assert.deepEqual(ld.itemListElement.map(p => p.position), [1, 2],
    'positionerne skal være sammenhængende, ikke have huller efter de udeladte');
  for (const post of ld.itemListElement){
    assert.ok(post.url.includes('/annonce-'), post.url);
    assert.ok(!post.url.includes('undefined') && !post.url.includes('null'), post.url);
  }
});

test('et tomt resultat sætter ingen ItemList (uændret adfærd)', () => {
  const doc = lavDokument();
  const { seoSearchResults } = indlæsSeo(doc);
  seoSearchResults([], 'Ingen træf');
  assert.equal(jsonLd(doc, 'results'), null);
});

/* ---- Søgesidens titel og description (C-017) ---- */

test('facetten får sin egen titel, hentet fra samme sted som H1', () => {
  const doc = lavDokument();
  const { seoSearchResults } = indlæsSeo(doc);
  seoSearchResults([egen()], 'Brugte Harley-Davidson til salg i København');

  assert.equal(doc.title, 'Brugte Harley-Davidson til salg i København — Bikerbasen');
  assert.equal(metaVærdi(doc, 'property', 'og:title'), doc.title);
  assert.ok(metaVærdi(doc, 'name', 'description').startsWith('Brugte Harley-Davidson'),
    'description skal sige det samme som titlen, ikke den generiske sætning');
});

test('titlen bliver ikke sat af annoncer uden egen side — den følger resultatet', () => {
  // ItemList'et bortfalder for indekserede annoncer (C-015), men de STÅR på
  // siden. Titlen hører til det, brugeren ser, ikke til det, Google må følge.
  const doc = lavDokument();
  const { seoSearchResults } = indlæsSeo(doc);
  seoSearchResults([ekstern(), ekstern()], 'Brugte Honda til salg');

  assert.equal(doc.title, 'Brugte Honda til salg — Bikerbasen');
  assert.equal(jsonLd(doc, 'results'), null);
});

test('nul træf giver sidens egne, neutrale tags tilbage', () => {
  // "Brugte Harley-Davidson til salg" på en side uden en eneste Harley er en
  // paastand, siden selv modsiger. Og den maa ikke blive haengende fra den
  // foregaaende facet.
  const doc = lavDokument();
  const { seoSearchResults } = indlæsSeo(doc);
  seoSearchResults([egen()], 'Brugte Yamaha til salg');
  assert.equal(doc.title, 'Brugte Yamaha til salg — Bikerbasen');

  seoSearchResults([], 'Brugte Harley-Davidson til salg');
  // Sidens egne tags er siden B4 standardsøgningens ("Brugte motorcykler til
  // salg"), ikke "Søg motorcykler": det er sitets generelle sidenavn, ikke
  // facettens påstand — og stadig ikke "Harley-Davidson".
  assert.equal(doc.title, 'Brugte motorcykler til salg — Bikerbasen');
  assert.equal(metaVærdi(doc, 'name', 'description'),
    'Brugte motorcykler til salg på Bikerbasen. Filtrér på pris, årgang, km og kørekort — A1, A2 og A.');
});

test('canonical og og:url røres ikke — facetterne samles stadig ét sted', () => {
  // Det er den ene ting, der IKKE må følge med titlen. Facet-canonical peger
  // på bare soegning.html, og det er rigtigt.
  const doc = lavDokument();
  const { seoSearchResults } = indlæsSeo(doc);
  seoSearchResults([egen()], 'Brugte KTM til salg');
  assert.equal(doc.børn.find(e => e.rel === 'canonical'), undefined);
  assert.equal(metaVærdi(doc, 'property', 'og:url'), null);
});

/* ---- Annoncesidens Vehicle.image (C-016) ---- */

/* En fuldt udfyldt egen annonce. seoListingPage() læser flere felter end
   resten af filen, og de skal være der, ellers tester vi en TypeError. */
const annonce = extra => Object.assign({
  id: 1017, brand: 'Suzuki', model: 'GSX-R750', year: 2017,
  price: 62900, km: 18400, ccm: 750, condition: 'God', city: 'Odense',
  postnr: '5000', type: 'sport', description: 'Velholdt.',
  isDealer: false, seller: { name: 'Privat' },
}, extra || {});

test('uden fotos påstår Vehicle intet billede — men delingskortet består', () => {
  const doc = lavDokument();
  const { seoListingPage } = indlæsSeo(doc);
  seoListingPage(annonce(), []);

  const v = jsonLd(doc, 'vehicle');
  assert.ok(v, 'annoncen har en egen side, så blokken skal skrives');
  assert.ok(!('image' in v),
    'og-image.png er Bikerbasens logo, ikke motorcyklen — siden skrev selv "Ingen fotos i denne annonce"');
  assert.equal(metaVærdi(doc, 'property', 'og:image'), 'https://bikerbasen.dk/og-image.png',
    'og:image er et kort om SIDEN og skal blive');
});

test('med fotos er Vehicle.image annoncens egne billeder, alle sammen', () => {
  const doc = lavDokument();
  const { seoListingPage } = indlæsSeo(doc);
  const fotos = ['https://eksempel.dk/a.jpg', 'https://eksempel.dk/b.jpg'];
  seoListingPage(annonce(), fotos);

  assert.deepEqual(jsonLd(doc, 'vehicle').image, fotos);
  assert.equal(metaVærdi(doc, 'property', 'og:image'), fotos[0],
    'delingskortet bruger det første foto, når der ER et');
});

test('tomme pladser i fotolisten bliver ikke til et billede', () => {
  // photoUrls kommer fra databasen; en manglende storage_path gav før en
  // undefined midt i listen, og JSON.stringify skriver den som null.
  const doc = lavDokument();
  const { seoListingPage } = indlæsSeo(doc);
  seoListingPage(annonce(), [null, undefined, '']);
  assert.ok(!('image' in jsonLd(doc, 'vehicle')));
});

/* ---- Forhandlerprofilen har samme liste og samme fælde ---- */

test('forhandlerprofilens ItemList følger samme regel', () => {
  const doc = lavDokument();
  const { seoDealerPage } = indlæsSeo(doc);
  const saelger = { id: 'abc', name: 'MC Syd', isDealer: true, city: 'Rødding' };

  seoDealerPage(saelger, 2, [ekstern(), ekstern()]);
  assert.equal(jsonLd(doc, 'dealer-items'), null);

  seoDealerPage(saelger, 2, [ekstern(), egen()]);
  assert.equal(jsonLd(doc, 'dealer-items').numberOfItems, 1);
});
