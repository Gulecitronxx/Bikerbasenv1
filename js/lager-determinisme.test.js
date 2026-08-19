/* ÉN URL, ÉT RESULTATSÆT — vagthunden på D-013. Kør: npm test

   HVAD DEN HOLDER ØJE MED, og hvorfor den findes:

   Den samme søge-URL svarede "383 annoncer fundet" med kildelinjen "51
   annoncer på Bikerbasen · 332 indekseret hos MC Syd" på nogle indlæsninger
   og "51 annoncer fundet" helt uden kildelinje på andre. Målt over 20
   indlæsninger med et ustabilt cdn: 10 af hver. `?priceMax=60000&koerekort=A2`
   gav 28 i den ene tilstand og 14 i den anden, og hvert eneste facettal i
   filterskinnen flyttede med.

   Årsagen var ÉN ting: `js/backend-bridge.js` hentede annoncerne gennem
   Supabase-SDK'et, og SDK'et kommer fra cdn.jsdelivr.net. Kom scriptet ikke
   frem, var `db.enabled` falsk, `backendReady()` sprang hele hentningen over,
   og `Store.getAllListings()` faldt tilbage til demolageret — uden ét ord om
   det nogen steder på skærmen.

   Den slags giver ingen fejlmeddelelse. Den giver et mindre og pænere tal.
   Derfor de her tests: de kører den RIGTIGE bro to gange med præcis de samme
   svar fra databasen — én gang med SDK'et til stede og én gang uden — og
   kræver, at resultatsættet er BID FOR BID det samme.

   FÆLDE FOR DEN NÆSTE: fristes man til at lægge SDK'et tilbage i læsevejen
   ("det er jo pænere at bruge klienten"), fejler "ingen db i læsevejen"
   nedenfor. Læs blokken øverst i js/backend-bridge.js før du fjerner den. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const broSrc = fs.readFileSync(path.join(__dirname, 'backend-bridge.js'), 'utf8');
const dataSrc = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');

/* ---------- rækker, der ligner dem databasen faktisk sender ---------- */
const EKSTERNE_RAEKKER = [
  { id: 'e1', url: 'https://mcsyd.dk/a/1', titel: 'Yamaha XV 750 Virago Cruiser',
    maerke: 'Yamaha', model: 'XV 750 Virago', variant: 'Cruiser', type: 'cruiser',
    aargang: 1996, km: 41000, ccm: 748, hk: 60, pris_dkk: 34800, stand: 'brugt',
    salgsmarkoerer: [], udledte_felter: [], by: 'Rødding', postnr: 6630,
    saelgertype: 'forhandler', thumbnail_url: 'https://images.danbase.dk/1.jpg',
    uddrag: 'Pæn cruiser', status: 'aktiv', foerst_set: '2026-07-01',
    sidst_set: '2026-08-17', kilde: { navn: 'MC Syd', domaene: 'mcsyd.dk' } },
  { id: 'e2', url: 'https://mcsyd.dk/Produkter/Motorcykel/Ny/2', titel: 'Honda CB 650 Street R',
    maerke: 'Honda', model: 'CB 650 R', variant: 'Street', type: null,
    aargang: 2026, km: null, ccm: 649, hk: null, pris_dkk: 99800, stand: 'ny',
    salgsmarkoerer: ['ENGROS'], udledte_felter: ['ccm'], by: 'Rødding', postnr: 6630,
    saelgertype: 'forhandler', thumbnail_url: null,
    uddrag: null, status: 'aktiv', foerst_set: '2026-07-01',
    sidst_set: '2026-08-17', kilde: { navn: 'MC Syd', domaene: 'mcsyd.dk' } },
];
const EGNE_RAEKKER = [
  { id: '11111111-1111-1111-1111-111111111111', brand: 'Honda', model: 'CB650R',
    type: 'naked', year: 2021, km: 11300, ccm: 649, power: 95, price: 72900,
    condition: 'God stand', postnr: 8000, city: 'Aarhus', region: 'Midtjylland',
    description: 'Fin maskine', created_at: '2026-07-25T10:00:00Z',
    seller_id: 'aaaa', seller: { name: 'Test', is_dealer: true },
    photos: [{ id: 'p1', storage_path: 'a/b/c.webp', position: 0 }] },
];

/* Kører HELE js/backend-bridge.js i node med præcis de globaler, browseren
   giver den. Ingen kopi af logikken — det er filen selv, der prøves. */
function lavBro({ sdk, eksterneFejler = false, egneFejler = false }){
  const lavElement = () => ({
    id: '', className: '', innerHTML: '', boern: [],
    setAttribute(){}, addEventListener(){}, remove(){},
    querySelector(){ return { addEventListener(){} }; },
    prepend(barn){ this.boern.unshift(barn); },
  });
  const main = lavElement();
  const window = { REMOTE_LISTINGS: [], EXTERNAL_LISTINGS: [] };
  const document = {
    getElementById(id){ return id === 'main-content' ? main : null; },
    querySelector(){ return main; },
    createElement(){ return lavElement(); },
    addEventListener(){},
  };

  const kaldte = [];
  const fetchStub = async (url) => {
    kaldte.push(String(url));
    const erEkstern = /eksterne_annoncer/.test(url);
    if (erEkstern ? eksterneFejler : egneFejler) throw new Error('net::ERR_FAILED');
    const raekker = erEkstern ? EKSTERNE_RAEKKER : EGNE_RAEKKER;
    return { ok: true, json: async () => raekker, text: async () => '' };
  };

  const forbudt = () => { throw new Error('SDK maa ikke bruges i laesevejen'); };
  const db = {
    get enabled(){ return sdk; },
    raw: null,
    listListings: forbudt, listExternalListings: forbudt, photoUrl: forbudt,
    currentUser: async () => null,
    listFavorites: async () => ({ ids: [], error: null }),
  };
  const Store = {
    getUser: () => null, logout(){}, setUser(){}, getFavorites: () => [],
    KEYS: { favorites: 'bb_favorites' },
  };

  /* regionFraPostnr og isUuid bor i js/data.js; vi låner dem DERFRA i stedet
     for at digte dem, så testen bruger den rigtige postnummertabel. */
  const hjaelp = new Function(dataSrc + '\nreturn { regionFraPostnr, isUuid };')();

  const api = new Function(
    'window', 'document', 'db', 'Store', 'fetch', 'localStorage', 'location',
    'SUPABASE_CONFIG', 'isSupabaseConfigured', 'regionFraPostnr', 'isUuid', 'console',
    broSrc + '\nreturn { backendReady, loadExternalListings, loadRemoteListings };'
  )(
    window, document, db, Store, fetchStub,
    { setItem(){}, getItem: () => null },
    { pathname: '/soegning.html', search: '' },
    { url: 'https://x.supabase.co', anonKey: 'noegle' },
    () => true, hjaelp.regionFraPostnr, hjaelp.isUuid,
    { warn(){}, log(){}, error(){} },
  );
  return { ...api, window, main, kaldte };
}

/* Sammenligner præcis det, søgesiden tæller på: hvilke annoncer, i hvilken
   rækkefølge, og med hvilke felter i behold. */
const aftryk = (bro) => JSON.stringify({
  egne: bro.window.REMOTE_LISTINGS.map(l => [l.id, l.brand, l.model, l.price, l.power, l.photoUrls]),
  eksterne: bro.window.EXTERNAL_LISTINGS.map(l =>
    [l.id, l.brand, l.model, l.price, l.power, l.type, l.isExternal, l.source.navn]),
});

/* ---------- D-013: én URL, ét resultatsæt ---------- */

test('resultatsaettet er det SAMME med og uden Supabase-SDK', async () => {
  /* Det her er hele fejlen skrevet som en test. Uden SDK'et svarede siden
     før 51 i stedet for 383, og kildelinjen forsvandt. */
  const med = lavBro({ sdk: true });
  await med.backendReady();
  const uden = lavBro({ sdk: false });
  await uden.backendReady();

  assert.equal(aftryk(uden), aftryk(med),
    'et manglende cdn-script maa ikke aendre ét eneste felt i resultatsaettet');
  assert.equal(uden.window.EXTERNAL_LISTINGS.length, EKSTERNE_RAEKKER.length,
    'de indekserede annoncer skal hentes, ogsaa naar SDK-scriptet aldrig blev indlaest');
  assert.equal(uden.window.REMOTE_LISTINGS.length, EGNE_RAEKKER.length);
});

test('gentagne opstarter giver bid for bid det samme', async () => {
  const svar = new Set();
  for (let i = 0; i < 10; i++){
    const bro = lavBro({ sdk: i % 2 === 0 });   // cdn'et falder ind og ud
    await bro.backendReady();
    svar.add(aftryk(bro));
  }
  assert.equal(svar.size, 1, `10 opstarter gav ${svar.size} forskellige resultatsaet`);
});

test('fotoadresser overlever et manglende SDK', async () => {
  /* db.photoUrl() laa inde i SDK'et. Uden biblioteket blev photoUrls tomt,
     og hvert eneste kort mistede sit billede — uden en fejl nogen steder. */
  const uden = lavBro({ sdk: false });
  await uden.backendReady();
  assert.deepEqual(uden.window.REMOTE_LISTINGS[0].photoUrls,
    ['https://x.supabase.co/storage/v1/object/public/listing-photos/a/b/c.webp']);
});

/* ---------- Fejler hentningen, skal siden SIGE det ---------- */

test('mislykket hentning bliver til en synlig besked, ikke til et mindre tal', async () => {
  const bro = lavBro({ sdk: true, eksterneFejler: true });
  await bro.backendReady();
  assert.equal(bro.window.DATA_STATUS.eksterne, 'fejlet');
  assert.equal(bro.window.EXTERNAL_LISTINGS.length, 0);
  assert.equal(bro.main.boern.length, 1, 'der skal staa en besked oeverst i <main>');
  const tekst = bro.main.boern[0].innerHTML;
  assert.match(tekst, /indekseret hos andre forhandlere/,
    'beskeden skal sige HVAD der mangler: ' + tekst);
  assert.match(tekst, /ikke hele lageret/,
    'beskeden skal sige, at tallene ikke daekker lageret: ' + tekst);
  // Vi kender ikke antallet af manglende annoncer, og vi maa ikke gaette det.
  assert.ok(!/\d/.test(tekst),
    'beskeden maa ikke indeholde et opfundet antal: ' + tekst);
});

test('lykkes hentningen, er der INGEN besked', async () => {
  const bro = lavBro({ sdk: true });
  await bro.backendReady();
  assert.equal(bro.window.DATA_STATUS.eksterne, 'ok');
  assert.equal(bro.main.boern.length, 0);
});

test('backendReady() afviser aldrig — heller ikke naar alt fejler', async () => {
  /* js/search.js gør `await backendReady()` som allerførste handling i
     boot(). Afviser den, stopper hele opstarten, og siden staar tilbage med
     den statiske "0 annoncer fundet" fra soegning.html — en tom side, der
     ligner et tomt marked. */
  const bro = lavBro({ sdk: true, eksterneFejler: true, egneFejler: true });
  const svar = await bro.backendReady();
  assert.equal(svar.enabled, true);
  assert.equal(bro.window.DATA_STATUS.egne, 'fejlet');
  assert.equal(bro.window.DATA_STATUS.eksterne, 'fejlet');
});

/* ---------- Vagthund: SDK'et maa ikke tilbage i laesevejen ---------- */

function udklipKrop(src, noegle){
  const start = src.indexOf(noegle);
  assert.notEqual(start, -1, noegle + ' findes ikke laengere');
  let i = src.indexOf('{', start), dybde = 0;
  for (; i < src.length; i++){
    if (src[i] === '{') dybde++;
    else if (src[i] === '}' && --dybde === 0) return src.slice(start, i + 1);
  }
  throw new Error('kunne ikke finde slutningen paa ' + noegle);
}

function udklip(navn){
  const start = broSrc.indexOf(`async function ${navn}(`);
  assert.notEqual(start, -1, `${navn}() findes ikke laengere i js/backend-bridge.js`);
  let i = broSrc.indexOf('{', start), dybde = 0;
  for (; i < broSrc.length; i++){
    if (broSrc[i] === '{') dybde++;
    else if (broSrc[i] === '}' && --dybde === 0) return broSrc.slice(start, i + 1);
  }
  throw new Error('kunne ikke finde slutningen paa ' + navn);
}

test('ingen db i laesevejen', () => {
  for (const navn of ['loadRemoteListings', 'loadExternalListings']){
    const krop = udklip(navn).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.ok(!/\bdb\./.test(krop),
      `${navn}() roerer SDK'et igen — saa er cdn'et tilbage i laesevejen, og `
      + 'resultatsaettet afhaenger igen af, om jsDelivr svarer. Se D-013.');
  }
  /* Kun backendReady()s EGEN krop. Filen har flere `if (!db.enabled) return`
     længere nede (auth-lytteren), og de er helt i orden — det er kun gaten
     FORAN hentningen, der var fejlen. */
  const boot = udklipKrop(broSrc, 'function backendReady(')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.ok(!/if \(!db\.enabled\)/.test(boot),
    'backendReady() gater igen hele hentningen paa db.enabled — det VAR fejlen.');
});

/* ---------- D-014: facettallene og skjult-taelleren er ÉN udregning ---------- */

const koerekortApi = new Function(dataSrc +
  '\nreturn { KOEREKORT, passerKoerekort, koerekortForListing, hkEllerNull };')();

/* koerekortSvar() er FLYTTET til js/filtrering.js — ét filterhus for både
   forsiden og soegning.html. Det er dermed den ene udregning, BEGGE tal i
   skinnen kommer af: facettallet er `koerekortSvar(l, kat) === true`, og
   skjult-taelleren er `=== UOPLYST`. Modulet laener sig paa to globaler fra
   js/data.js, praecis som i browseren, hvor det loades bagefter. */
global.passerKoerekort = koerekortApi.passerKoerekort;
global.hkEllerNull = koerekortApi.hkEllerNull;
const Filtrering = require('./filtrering.js');
const UOPLYST = Filtrering.UOPLYST;
const koerekortSvar = Filtrering.koerekortSvar;

/* Et lager, der rummer alle fire tilstande: A1, A2, A og "vi ved det ikke". */
const LAGER = [
  { ccm: 125, power: 12 },    // A1
  { ccm: 471, power: 46 },    // A2
  { ccm: 999, power: 207 },   // A
  { ccm: 1746, power: null }, // over 125 ccm uden hk: kategorien kan ikke afgøres
  { ccm: null, power: null },  // intet oplyst overhovedet
];

test('facettal og skjult-taeller kommer fra samme udregning', () => {
  /* Facettallet i skinnen er `koerekortSvar(l, kat) === true`, og
     skjult-taelleren er `koerekortSvar(l, kat) === UOPLYST`. Tallene skal
     derfor gaa op med lagerets stoerrelse for HVER kategori — ingen annonce
     maa falde ud mellem de tre svar. */
  for (const k of koerekortApi.KOEREKORT){
    const svar = LAGER.map(l => koerekortSvar(l, k.id));
    const ja = svar.filter(s => s === true).length;
    const uoplyst = svar.filter(s => s === UOPLYST).length;
    const nej = svar.filter(s => s === false).length;
    assert.equal(ja + uoplyst + nej, LAGER.length,
      `${k.id}: ${ja}+${uoplyst}+${nej} gaar ikke op i ${LAGER.length}`);
  }
});

test('koerekortstigen ligger inden i sig selv: A1 er en delmaengde af A2, A2 af A', () => {
  /* Et hoejere koerekort daekker de lavere. Holder det ikke, er de tre tal i
     skinnen tre forskellige spoergsmaal med samme udseende. */
  const vist = (kat) => new Set(LAGER.map((l, i) => koerekortSvar(l, kat) === true ? i : -1)
    .filter(i => i >= 0));
  const a1 = vist('A1'), a2 = vist('A2'), a = vist('A');
  for (const i of a1) assert.ok(a2.has(i), `annonce ${i} er A1 men ikke med i A2`);
  for (const i of a2) assert.ok(a.has(i), `annonce ${i} er A2 men ikke med i A`);
  assert.equal(a.size, LAGER.length, 'A har ingen effektgraense og skal daekke hele lageret');
});

test('A-chippens etiket paastaar ikke en stoerrelse', () => {
  /* HVAD DER VAR GALT: chippen hed "A (stor mc)" og stod med hele lagerets
     tal (383). Ved siden af "A1 (lille mc) 15" og "A2 (mellem mc) 39" laeses
     det som "383 store motorcykler" — mens A2-filteret paa samme skaerm
     melder, at 121 af dem slet ikke har en oplyst koerekortkategori. Tallet
     var rigtigt; etiketten var ikke. */
  const a = koerekortApi.KOEREKORT.find(k => k.id === 'A');
  assert.ok(!/stor/i.test(a.label),
    `A-chippen maa ikke kalde sig en stoerrelse, naar den taeller hele lageret: "${a.label}"`);
  assert.match(a.label, /alle/i, 'etiketten skal sige, at A daekker alle: ' + a.label);
  assert.match(a.hint, /ikke er oplyst/,
    'hjaelpeteksten skal naevne de annoncer, hvor effekten ikke er oplyst: ' + a.hint);
});
