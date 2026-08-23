/* ============================================================
   Bro mellem Supabase og den eksisterende (synkrone) UI-kode.

   Resten af sitet er skrevet synkront omkring Store.getUser() og
   Store.getAllListings(). I stedet for at skrive alle sider om, henter vi
   session + annoncer én gang ved sideindlæsning og lægger dem et sted,
   hvor de synkrone funktioner kan finde dem.

   Demodataene bliver liggende, så siden ikke ser tom ud, mens databasen
   er ny. Rigtige annoncer vises først.
   ============================================================ */

window.REMOTE_LISTINGS = [];
window.EXTERNAL_LISTINGS = [];

/* ============================================================
   LÆSEVEJEN MÅ IKKE GÅ GENNEM EN TREDJEPART — D-013

   HVAD DER VAR GALT, målt: den SAMME søge-URL svarede "383 annoncer
   fundet" på nogle indlæsninger og "51 annoncer fundet" på andre, og
   kildelinjen ("51 annoncer på Bikerbasen · 332 indekseret hos MC Syd")
   fandtes kun i den første tilstand. Hvert eneste facettal flyttede med:
   "A2 (mellem mc)" stod 39 i den ene tilstand og 15 i den anden, og
   `?priceMax=60000&koerekort=A2` gav 28 mod 14.

   Det var ikke en langsom efterindlæsning. Det var to forskellige svar, og
   forskellen var ÉN ting: om `https://cdn.jsdelivr.net/npm/@supabase/
   supabase-js@2` nåede at blive hentet og kørt. (SDK'et serveres siden
   23.08.2026 fra vores egen origin som js/vendor/supabase.js — se
   scripts/vendor-supabase.js — så den fremmede vært er væk, men kæden
   nedenfor gælder stadig, hvis filen af en anden grund ikke når frem.)

   Kæden, hele vejen ned:
     jsDelivr fejler  →  `typeof supabase === 'undefined'`
                      →  `init()` i js/supabase-api.js logger
                         "Supabase-biblioteket blev ikke indlæst." og svarer null
                      →  `db.enabled === false`
                      →  `backendReady()` sprang HELE hentningen over og svarede
                         `{ enabled: false }`
                      →  REMOTE_LISTINGS = [] og EXTERNAL_LISTINGS = []
                      →  `Store.getAllListings()` = kun demolageret (51 på
                         localhost, 0 i drift)
                      →  kildelinjen skjuler sig selv, fordi der ikke ER nogen
                         indekserede annoncer i resultatet.
   Ingen fejlbesked nogen steder på skærmen. Tallet blev bare mindre og pænere.

   EFTERPRØVET: med `route('**cdn.jsdelivr.net**', abort)` i playwright rammer
   siden nøjagtig den tilstand, kritikeren beskrev — 51 / ingen kildelinje /
   A2 = 15, og 14 på den filtrerede URL. Uden blokeringen: 383 / kildelinje /
   A2 = 39. Der er ikke andre tilstande.

   RETTELSEN er ikke et gentagelsesforsøg og ikke en timeout — begge dele ville
   bare gøre løgnen sjældnere. Annoncerne hentes nu med almindelig `fetch()`
   direkte mod PostgREST, præcis som `scripts/inline-boot.js` allerede gør for
   vores egne annoncer og `scripts/shared.js` for byggekæden. SDK'et er dermed
   ude af den sti, der afgør HVILKE annoncer siden viser. Det bruges stadig til
   det, det er nødvendigt til — session, tokenfornyelse, favoritter, skrivning —
   og de dele fejler for sig uden at tage resultatsættet med sig.

   OG: hvis hentningen alligevel fejler, siger siden det (se meldDataafbrud()).
   Et mindre resultat uden en forklaring er den værste af de to fejl.
   ============================================================ */

/* 'ikke-hentet' → endnu ikke forsøgt. 'sprunget-over' → siden har ikke brug
   for listen (se SIDER_UDEN_*). 'ok' → svaret er kommet. 'fejlet' → vi
   spurgte, og vi fik ikke noget svar; tallene på siden dækker altså ikke
   hele lageret, og det SKAL siges højt. */
window.DATA_STATUS = { egne: 'ikke-hentet', eksterne: 'ikke-hentet' };

function supabaseKonfigureret(){
  return typeof SUPABASE_CONFIG !== 'undefined'
    && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured();
}

/* ============ SDK'et hentes kun, naar der er brug for det (C1, 23.08.2026) ============

   js/vendor/supabase.js er 52 KB gzip — den tungeste fil paa sitet — og den
   bruges KUN til session, tokenfornyelse, favoritsynk og skrivning. Laesevejen
   (annoncerne) gaar med vilje uden om den (D-013 ovenfor). Alligevel laa den
   som <script> paa 49 af 52 sider, ogsaa paa de 36 SEO-landingssider og
   soegesiden, hvor langt de fleste besoegende er udloggede og aldrig roerer
   noget, den er til.

   Nu afgoer siden selv ved opstart, om den skal hentes:
     - der ligger en session i localStorage (sb-<ref>-auth-token) — saa skal
       den fornys og favoritterne synkes, praecis som foer, ELLER
     - siden skriver (login, opret, mine annoncer, dashboard, forhandler,
       annonce) — de beholder <script>-tagget i HTML'en og rammes slet ikke
       her, ELLER
     - nogen kalder bbSikrSdk({ tving: true }) fordi en handling kraever den.
   Ellers hentes den ikke. En udlogget paa maerke-honda.html sparer 52 KB
   gzip og parsningen af 212 KB javascript — og mister ingenting, for der er
   ingen session at forny og ingen favoritter i databasen at synke.

   Versionen (?v=) laeses af dette scripts eget src, saa den lazy-hentede
   SDK rammer samme cachepost som stamp-version.js skrev. CSP: script-src
   'self' — same-origin, dynamisk indsat, tilladt. */
const SDK_VERSION = (() => {
  try {
    const s = typeof document !== 'undefined' && document.currentScript && document.currentScript.src;
    return (s && (s.match(/[?&]v=([a-z0-9]+)/) || [])[1]) || '';
  } catch (e) { return ''; }
})();
const SDK_STI = 'js/vendor/supabase.js';

/* Er der en gemt session? supabase-js v2 gemmer den under
   `sb-<projekt-ref>-auth-token`. Vi kigger kun efter NOEGLEN — aldrig i den. */
function sessionGemt(){
  try {
    if (!supabaseKonfigureret()) return false;
    const ref = (SUPABASE_CONFIG.url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1];
    return !!ref && localStorage.getItem(`sb-${ref}-auth-token`) != null;
  } catch (e) { return false; }
}

let _sdkPromise = null;
/* Henter SDK'et, hvis det mangler og skal bruges. Svarer true, naar
   `supabase.createClient` findes bagefter. { tving: true } henter uanset. */
function bbSikrSdk({ tving = false } = {}){
  if (typeof supabase !== 'undefined' && supabase.createClient) return Promise.resolve(true);
  if (!tving && !sessionGemt()) return Promise.resolve(false);
  if (_sdkPromise) return _sdkPromise;
  _sdkPromise = new Promise(res => {
    const s = document.createElement('script');
    s.src = SDK_STI + (SDK_VERSION ? `?v=${SDK_VERSION}` : '');
    s.onload = () => res(typeof supabase !== 'undefined' && !!supabase.createClient);
    s.onerror = () => { console.warn('Supabase-biblioteket kunne ikke hentes.'); res(false); };
    document.head.appendChild(s);
  });
  return _sdkPromise;
}
if (typeof window !== 'undefined') window.bbSikrSdk = bbSikrSdk;

/* Lytteren paa login/ud-logning. Foer laa den i DOMContentLoaded og sprang
   over, hvis SDK'et ikke var der ENDNU — nu saettes den, naar SDK'et er
   klar, uanset om det kom med HTML'en eller blev hentet undervejs. */
let _authLytterSat = false;
function saetAuthLytter(){
  if (_authLytterSat || !db.enabled || !db.raw) return;
  _authLytterSat = true;
  db.raw.auth.onAuthStateChange(async (event) => {
    if (event === 'SIGNED_OUT') Store.logout();
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') await syncSessionToStore();
    // Nulstillingslink landet paa en anden side end login.html (sker, hvis
    // login.html ikke staar paa Supabases Redirect URLs-liste): sessionen er
    // gemt, saa send videre til trin 2 i stedet for at lade brugeren staa
    // logget ind paa forsiden uden at vide hvorfor. js/login.js laeser ?nulstil=1.
    if (event === 'PASSWORD_RECOVERY' && !/\/login(\.html)?$/.test(location.pathname)) location.replace('login.html?nulstil=1');
  });
}

/* Ét sted at spørge PostgREST uden SDK'et.

   Nøglen er den offentlige publishable-nøgle, der i forvejen står i
   js/supabase-config.js og i den indlejrede boot-blok i hver side. Den er
   ikke en hemmelighed — RLS bestemmer adgangen.

   Svaret er `{ data, error }` som resten af datalaget, men `error` er her et
   RIGTIGT nej: en HTTP-fejl bliver ikke til et tomt array. Det var netop den
   forveksling, der gjorde "vi kunne ikke hente" til "der er ingen". */
async function restHent(sti, ekstraHeaders){
  if (!supabaseKonfigureret()) return { data: null, error: new Error('Supabase er ikke konfigureret.') };
  const n = SUPABASE_CONFIG.anonKey;
  try {
    const r = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${sti}`,
      { headers: { apikey: n, Authorization: 'Bearer ' + n, ...(ekstraHeaders || {}) } });
    if (!r.ok) return { data: null, error: new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`) };
    const data = await r.json();
    if (!Array.isArray(data)) return { data: null, error: new Error('Uventet svar fra databasen.') };
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

/* Henter ALLE raekker bag en forespoergsel, 1000 ad gangen (PostgREST's
   `limit=`/`offset=` i selve adressen), i stedet for ét kald med `limit=`.
   Ikke Range-headeren: `Range: 0-999` er ikke CORS-safelisted (kun
   `bytes=`-former er), saa browseren ville sende en OPTIONS-preflight foer
   HVER side — en ekstra tur/retur foran den hentning, LCP'en venter paa.
   Query-parametrene giver samme svar uden preflight.

   Hvorfor (B4, 23.08.2026): loadExternalListings() stod med `&limit=500`,
   og databasen havde 548 aktive indekserede annoncer. De sidste 48 fandtes
   ingen steder paa sitet — ikke i soegningen, ikke i facettallene, ikke i
   forsidens "500 motorcykler til salg" — mens byggekaeden (scripts/shared.js)
   hentede uden graense og skrev 548 i sitemap og maerkesider. To tal for
   samme lager, og ingen fejlbesked: praecis den slags stille mindre sandhed,
   D-013 handler om. En side, der ikke er fuld, er den sidste; saa stopper
   loekken. `sti` SKAL have en stabil `order=` (fx `sidst_set.desc,id.asc`),
   ellers kan samme raekke komme to gange og en anden slet ikke. */
async function restHentAlle(sti, sideStoerrelse = 1000){
  const alle = [];
  for (let fra = 0; ; fra += sideStoerrelse){
    const res = await restHent(`${sti}&limit=${sideStoerrelse}&offset=${fra}`);
    if (res.error) return res;
    alle.push(...res.data);
    if (res.data.length < sideStoerrelse) break;
  }
  return { data: alle, error: null };
}

/* Den offentlige adresse på et uploadet foto.

   Stod før som `db.photoUrl()`, altså inde i SDK'et — så et fotos adresse
   afhang også af jsDelivr, og uden biblioteket blev hvert `photoUrls` tomt.
   Adressen er en ren strengsammensætning; den behøver intet bibliotek.
   Formen er den samme, som `scripts/shared.js` bygger i byggekæden. */
function lagerUrl(sti){
  if (!sti || !supabaseKonfigureret()) return null;
  return `${SUPABASE_CONFIG.url}/storage/v1/object/public/listing-photos/${sti}`;
}

/* Oversætter en databaserække til den form, UI'et allerede forventer. */
function normalizeRemoteListing(row){
  const photos = (row.photos || []).slice().sort((a, b) => a.position - b.position);
  const seller = row.seller || {};
  return {
    id: row.id,
    brand: row.brand, model: row.model, type: row.type,
    year: row.year, km: row.km, ccm: row.ccm, power: row.power,
    price: row.price, condition: row.condition,
    registration: row.registration, afgift: row.afgift,
    fuel: row.fuel || null, drive: row.drive || null,
    cylinders: row.cylinders || null, color: row.color || null,
    serviceHistorik: row.service_historik || null,
    antalEjere: row.antal_ejere || null,
    sidsteSyn: row.sidste_syn || null,
    daekAar: row.daek_aar || null,
    vinterklar: !!row.vinterklar,
    kanNedsaettesA2: !!row.kan_nedsaettes_a2,
    equipment: row.equipment || [],
    postnr: row.postnr, city: row.city, region: row.region,
    description: row.description,
    createdAt: row.created_at,
    isDealer: !!seller.is_dealer,
    isRemote: true,
    photoUrls: photos.map(p => lagerUrl(p.storage_path)).filter(Boolean),
    // Id og sti følger med, så redigering kan fjerne ét enkelt billede
    // i stedet for at røre dem alle. `position` følger med, fordi
    // js/opret-annonce.js skal kende den HØJESTE position, der bliver
    // liggende, for at kunne lægge et nyt billede bagefter uden at ramme
    // samme position som et billede, der stadig er der (position 0 er
    // forsidebilledet). Antallet af rækker duer ikke som mål: efter en
    // sletning midt i rækken er der huller i positionerne.
    photoRows: photos.map(p => ({ id: p.id, path: p.storage_path, position: p.position, url: lagerUrl(p.storage_path) })),
    photos: Math.max(3, photos.length || 4),
    seller: {
      id: row.seller_id,
      name: seller.name || 'Ukendt sælger',
      isDealer: !!seller.is_dealer,
      verified: !!seller.verified,
      city: seller.city || row.city,
      company: seller.company || null,
      memberSince: seller.member_since || new Date(row.created_at).getFullYear(),
      phone: null,           // hentes kun når køber trykker "vis telefonnummer"
      rating: null, reviews: 0,
    },
  };
}

/* Spejler Supabase-sessionen ind i Store, så synkron kode virker uændret. */
async function syncSessionToStore(){
  if (!db.enabled) return null;
  const user = await db.currentUser();
  if (!user){
    if (Store.getUser()?.remote) Store.logout();
    return null;
  }
  const p = await db.currentProfile();
  const merged = {
    remote: true,
    id: user.id,
    email: user.email,
    name: p?.name || user.email,
    phone: p?.phone || null,
    isDealer: !!p?.is_dealer,
    company: p?.company || null,
    cvr: p?.cvr || null,
    emailVerified: !!user.email_confirmed_at,
    phoneVerified: !!p?.phone_verified,
    mitIdVerified: !!p?.mitid_verified,
    cvrVerified: !!p?.cvr_verified,
    plan: p?.plan || 'free',
    subscriptionStatus: p?.subscription_status || null,
    verified: p?.is_dealer ? (!!p?.mitid_verified && !!p?.cvr_verified) : !!p?.mitid_verified,
  };
  Store.setUser(merged);
  return merged;
}

/* Annoncerne er som regel allerede undervejs: scripts/inline-boot.js sender
   forespørgslen af sted i sidens første HTML-chunk, længe før SDK'et er
   hentet. Vi samler den op her og sparer hele den serielle ventetid. Fejler
   den (offline, ændret skema, blokeret), henter vi som før via SDK'et. */
/* Kolonnerne er ORDRET dem, `scripts/inline-boot.js` beder om i den indlejrede
   boot-blok. De to skal ændres i samme ombæring: falder boot-blokken på gulvet
   (offline, 4xx), er det den her forespørgsel, siden ender med — og den skal
   give det SAMME resultatsæt, ikke et lidt andet. */
const EGNE_KOLONNER =
  '*,seller:public_profiles!listings_seller_id_fkey(*),photos:listing_photos(id,storage_path,position)';

async function loadRemoteListings(){
  let data = window.__bbListingsBoot ? await window.__bbListingsBoot : null;

  /* Reservevejen går IKKE længere gennem `db.listListings()`. Se blokken
     øverst i filen: SDK'et er en tredjepart på et cdn, og et manglende
     bibliotek blev til "der er ingen annoncer". */
  if (!Array.isArray(data)){
    const res = await restHent(`listings?select=${encodeURIComponent(EGNE_KOLONNER)}`
      + '&status=eq.active&order=created_at.desc&limit=200');
    if (res.error){
      console.warn('Kunne ikke hente annoncer fra databasen:', res.error.message);
      window.DATA_STATUS.egne = 'fejlet';
      return [];
    }
    data = res.data;
  }

  window.REMOTE_LISTINGS = (data || []).map(normalizeRemoteListing);
  window.DATA_STATUS.egne = 'ok';
  return window.REMOTE_LISTINGS;
}

/* ---------- Landsdel ud fra postnummer ----------
   regionFraPostnr() bruges af normalizeExternalListing() nedenfor og ligger i
   js/data.js (se REGION_KNAEK dér). Den stod før BÅDE her og i
   js/components.js — to tabeller med samme navn i global scope, hvor sidste
   script-tag vandt for alle kaldere, også for den her fil, der troede den
   kaldte sin egen. Læg den ikke tilbage. */

/* ---------- Motorcykeltype ----------

   MC Syd skriver deres egen kategori direkte ind i titlen — "Honda VT 700
   Cruiser", "Honda CBR 1000 F Sportstouring", "Yamaha XS 650 Klassiker".
   Det er ikke noget, vi udleder eller skønner; det er sælgerens egen
   rubricering, som bare står i et tekstfelt i stedet for et kategorifelt.
   At læse den er oversættelse, ikke gætteri.

   Oversættelsen og aflæsningen er to ting, og de er delt i to funktioner
   med vilje. MCSYD_KATEGORI/typeFraKategoriord() er ordbogen fra kildens
   ord til de gyldige type-id'er i js/data.js. typeFraTitel() er kun
   nødudgangen, der graver ordet ud af titlen, fordi databasen lige nu ikke
   har en kategorikolonne (se supabase/014_aggregator.sql — den er bevidst
   mager). Får rækken en dag et rigtigt kategorifelt fra crawleren, vinder
   det felt automatisk, og nødudgangen bliver aldrig kaldt. Ordbogen skal
   ikke skrives to steder.

   To fælder gjorde en naiv understrengs-søgning direkte forkert, målt på
   alle 332 titler:

   1. Kategoriordet står til SIDST (268 gange som allersidste ord, 15 gange
      1–2 ord inde, fx "XV 750 Cruiser Virago" og "CB 650 Street R").
      Ord længere fremme i titlen er modelnavne. Derfor scannes kun de sidste
      tre ord — og bagfra, så "Road King Classic Cruiser" bliver cruiser og
      ikke classic.

   2. Nogle modelNAVNE indeholder et kategoriord. "Softail Classic",
      "Road King Classic", "Electra Glide Ultra Classic" er alle cruisere og
      tourere — Harleys navne, ikke MC Syds kategori. MC Syds eget ord for
      den kategori er det danske "Klassiker", og engelsk "Classic" optræder
      i alle 332 titler UDELUKKENDE som modelnavn. Derfor står "Classic"
      slet ikke i ordlisten. Af samme grund maskeres Harleys "… Glide"-navne
      væk først (Sport Glide, Street Glide, Road Glide …), og "Sport" tælles
      kun, når det er allersidste ord — ellers blev "FLSB Sport Glide"
      til en sportsmaskine.

   Resultat på de 332: 283 får en type, 49 gør ikke. De 49 er titler helt
   uden kategoriord ("Honda GL 1800 Gold Wing", "Rewaco Trike", "Honda
   Honda"). Dér HOLDER vi op. En Gold Wing er åbenlyst en tourer for et
   menneske, men den slags model-for-model-tabel er en påstand, vi selv
   finder på, og den ville stå på kortet som om kilden havde sagt den.
   Ukendt type er ukendt type. */
const MCSYD_KATEGORI = {
  cruiser: 'cruiser',
  street: 'naked',          // "Street" er den danske forhandlerbetegnelse for en naked bike
  naked: 'naked',
  adventure: 'adventure',
  offroader: 'adventure',   // MC Syds "Offroader" er CRF 300 L, V-Strom, Transalp, NC 750 X
  enduro: 'adventure',      // vores 'adventure' hedder "Adventure/Enduro"
  touring: 'touring',
  sportstouring: 'touring', // en sportstourer er en tourer med kåbe, ikke en supersport
  klassiker: 'classic',
  veteran: 'classic',
  scooter: 'scooter',
  cross: 'cross',
  sport: 'sport',
};
// Se fælde 2 ovenfor: kun gyldig som allersidste ord.
const KATEGORI_KUN_SIDST = new Set(['sport']);
const HD_GLIDE = /\b(Sport|Street|Road|Super|Electra|Ultra)\s+Glide\b/gi;
const TITEL_STOEJ = /\b(BYTTER GERNE|UDEN KLARGØRING|ENGROS|\d+\s*ÅRS FABRIKS GARANTI|FABRIKS GARANTI|NYSYNET|SOLGT)\b/gi;

/* Kildens kategoriord -> vores type-id. Kender vi ikke ordet, siger vi det
   ved at svare null. Et ukendt kategoriord må ikke lande i en tilfældig
   nabokategori, bare fordi listen skulle gå op. */
function typeFraKategoriord(ord){
  const o = String(ord || '').toLowerCase().trim();
  return MCSYD_KATEGORI[o] || null;
}

function typeFraTitel(titel){
  const ord = String(titel || '')
    .replace(HD_GLIDE, ' ')
    .replace(TITEL_STOEJ, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ');
  for (let i = ord.length - 1; i >= 0 && i >= ord.length - 3; i--){
    const o = ord[i].toLowerCase();
    if (!(o in MCSYD_KATEGORI)) continue;
    if (KATEGORI_KUN_SIDST.has(o) && i !== ord.length - 1) continue;
    return MCSYD_KATEGORI[o];
  }
  return null;
}

/* ---------- Kildens stand -> vores CONDITIONS ----------

   Migration 015 giver rækken et `stand`-felt, udledt af produktlinkets sti
   hos MC Syd: 170 brugte og 162 fabriksnye.

   "brugt" har en hjemmel i vores egen liste. "ny" har ikke.

   CONDITIONS i js/data.js er ['Som ny', 'God stand', 'Brugt',
   'Defekt/Projekt'] — fire beskrivelser af en BRUGT motorcykels tilstand.
   "Som ny" betyder "brugt, men næsten uden slid". En fabriksny motorcykel
   med 0 km er ikke "som ny"; den ER ny. Oversætter vi ny -> 'Som ny', står
   der på 162 annoncer, at de er brugte motorcykler i fremragende stand, og
   en køber der filtrerer "Som ny" for at undgå fabriksnye priser, får
   præcis dem, han sorterede fra.

   Så de 162 får null og bliver ved med at være uoplyste — ikke fordi vi
   ikke ved det, men fordi vores egen ordliste ikke har et ord for det. Det
   er en mangel i CONDITIONS, ikke i dataene, og den løses ved at tilføje
   'Ny' til CONDITIONS i js/data.js og til standfilteret. Den dag det sker,
   er det linjen herunder, der skal ændres, og intet andet. */
const KILDE_STAND = {
  brugt: 'Brugt',
  used:  'Brugt',
  ny:    null,   // <- sæt til 'Ny', når CONDITIONS har værdien
  new:   null,
};

function conditionFraStand(stand){
  const s = String(stand || '').toLowerCase().trim();
  if (!s) return null;
  // Ukendt ord: sig ved ikke frem for at vælge en nabokategori.
  return KILDE_STAND[s] ?? null;
}

/* ---------- Indekserede annoncer ----------
   Oversættes til den samme form som alt andet i UI'et, så søgning, filtre og
   sortering virker uændret. Men de bærer isExternal og source med sig, og de
   to felter er der ikke for pynt: kortet SKAL kunne se forskel, fordi køberen
   skal videre til kilden i stedet for at kontakte en sælger hos os.

   Bemærk hvad der IKKE oversættes. Der er ingen seller, fordi vi ikke kender
   sælgeren — kun forhandleren, annoncen står hos. Sætter man et sellerobjekt
   op med kildens navn, begynder resten af UI'et at behandle den som en
   Bikerbasen-sælger med profil, anmeldelser og kontaktknap, og så er
   skellet væk igen. */
/* Spejl af crawler/normalize.js erKildensPladsholder() — browseren kan ikke
   require() crawleren. Holdes i sync i SAMME commit, ellers gemmer crawleren
   ét og viser broen noget andet. Fundet 23.08.2026: Gul og Gratis'
   /assets/files/default-listing.<hash>.svg stod som thumbnail paa en annonce. */
const PLADSHOLDER_MOENSTRE = [
  /\/default-listing[^/]*\.svg(\?|$)/i,
  /\/(?:no|missing|default)[-_]?(?:image|photo|foto|billede)[^/]*\.(?:svg|png|gif|jpe?g|webp)(\?|$)/i,
  /\.svg(\?|$)/i,
];
function erKildensPladsholder(url){
  const u = String(url || '').trim();
  return !!u && PLADSHOLDER_MOENSTRE.some(re => re.test(u));
}

const MAERKE_AKRONYM = { bsa: 'BSA', ajs: 'AJS', mz: 'MZ', ktm: 'KTM', bmw: 'BMW', gasgas: 'GasGas', 'gas gas': 'GasGas', cfmoto: 'CFMoto', 'cf moto': 'CFMoto', 'mv agusta': 'MV Agusta' };
function maerkeAkronym(m){
  if (!m) return m;
  const k = String(m).trim().toLowerCase();
  return MAERKE_AKRONYM[k] || m;
}
function normalizeExternalListing(row){
  const kilde = row.kilde || {};
  return {
    id: row.id,
    /* Runde 6 (D6-F7): akronymer, kilden skrev med smaa bogstaver og crawleren
       gav stort forbogstav ("Bsa"). Rammer de raekker, der allerede ligger;
       crawler/normalize.js har samme opslag for nye. */
    brand: maerkeAkronym(row.maerke) || 'Ukendt',
    /* Falder tilbage på titlen, når kilden ikke har en model — MEN ikke når
       titlen bare ER mærket. Seks af MC Syds annoncer har kun "Honda" eller
       "BMW" som titel (deres egen URL-slug siger det samme, så det er ikke
       vores parsning). Uden det her tjek blev kortet til "Honda Honda".

       Er der intet modelnavn, står der kun mærket. Det er sandt, og det er
       kildens hul — ikke noget vi skal fylde ud. */
    model: (() => {
      if (row.model) return row.model;
      const t = String(row.titel || '').trim();
      return t && t.toLowerCase() !== String(row.maerke || '').trim().toLowerCase() ? t : '';
    })(),

    /* Kolonnen `type` (migration 015) kommer fra kildens egen facetliste og
       vinder ALTID. Titel-scanneren nedenunder er kun nødudgangen for rækker,
       der endnu ikke er crawlet igen — og den dag alle 332 har feltet, er
       fallbacken bare stille. Kildens felt slår en scanner, også når de
       dækker næsten lige mange (285 mod 283): hans kommer fra kilden, min
       gætter sig frem fra en tekststreng. */
    type: typeFraKategoriord(row.type) || typeFraTitel(row.titel || row.model),

    /* Titlens anden linje — Bilbasens "54 Altitude 5d" under "Jeep Avenger".
       Hos os "Cruiser" under "Yamaha XV 750 Virago". 285 af 332 rækker har
       den efter 015; uden det her felt stod kortets to-linjers titel med en
       tom anden linje, mens værdien lå klar i databasen.

       salgsmarkoerer er forhandlerens vilkår, ikke motorcyklens: ENGROS,
       UDEN KLARGØRING, BYTTER GERNE. "Uden klargøring" betyder, at cyklen
       sælges som beset — det skal en køber vide FØR han kører til Rødding.
       Altid et array; kolonnen er not null default '{}'. */
    variant: row.variant || null,
    salgsmarkoerer: Array.isArray(row.salgsmarkoerer) ? row.salgsmarkoerer : [],

    /* Hvilke af tallene crawleren har GÆTTET frem for læst — i praksis 'ccm'
       udledt af modelnavnet på 97 annoncer. Modstykket til manuelle_felter.
       En visning kan skrive "ca. 750 ccm" i stedet for at lade et gæt stå
       som en måling. */
    udledteFelter: Array.isArray(row.udledte_felter) ? row.udledte_felter : [],

    year: row.aargang,
    km: row.km,
    ccm: row.ccm,

    /* MC Syds kort har fire specrækker — årgang, km, HK, ccm. Hestekræfterne
       stod der hele tiden og blev tabt, fordi kolonnen manglede. Med `hk`
       (migration 015) kan koerekortForListing() endelig svare: 221 af 332
       får en kategori mod 9 før. De sidste 111 er over 125 ccm uden oplyst
       effekt, hvor kategorien ikke KAN afgøres — og efter e29c381 lyver
       js/data.js ikke længere om dem. */
    power: row.hk ?? null,

    price: row.pris_dkk,
    postnr: row.postnr,
    city: row.by || '',

    // Kildens stand (migration 015) OVERSAT til vores ordliste. Se
    // ordlisten ovenfor: "brugt" oversættes, "ny" har endnu ingen plads i
    // CONDITIONS og bliver derfor null.
    condition: conditionFraStand(row.stand),

    /* ---------- Kildens EGNE ord, ubearbejdet ----------

       EN OVERSÆTTELSE MÅ IKKE VÆRE DEN ENESTE KOPI. `condition` ovenfor er
       et opslag i VORES ordliste, og opslaget taber med vilje det, listen
       ikke har et ord for: 162 af de 332 annoncer er FABRIKSNYE, og "ny"
       har ingen plads i CONDITIONS, så de kom ud som null. Oplysningen
       fandtes i databasen hele vejen — den forsvandt her, i broen.

       Prisen for det stod i js/components.js: `eksternErNy()` måtte
       rekonstruere ny/brugt ved at læse annoncens ADRESSE hos kilden
       (/Produkter/Motorcykel/Ny/), fordi det var det eneste sted, ordet
       stadig stod. Det er en omvej uden om det lag, der havde svaret.
       Feltet er derfor båret med råt her, og omvejen kan sløjfes.

       LÆREN, og den gælder bredere end det her felt: et felt, der stille
       bliver til null i broen, er den samme slags fejl som et resultatsæt,
       der stille bliver mindre (D-013) — ingen fejlmeddelelse, bare mindre
       sandhed længere nede. Oversæt gerne, men behold originalen ved siden
       af, så den næste kan se, hvad kilden faktisk sagde.

       De to andre er fundet ved at gå kolonnelisten i EKSTERNE_KOLONNER
       igennem felt for felt mod det, der kom ud i den anden ende:
       `titel` blev kun brugt som nødudgang for et manglende modelnavn og
       var ellers væk, og `sidst_set` blev slet ikke båret med, selv om det
       er det eneste, vi ved om, hvor frisk annoncen er hos kilden
       (`createdAt` er med vilje null — se blokken nedenfor).
       `status` bæres IKKE med: forespørgslen filtrerer på status=aktiv, så
       feltet er den samme værdi på hver eneste række. */
    kildeStand: row.stand || null,
    kildeTitel: row.titel || null,
    sidstSet: row.sidst_set || null,

    /* Landsdel er et opslag på postnummeret, ikke et skøn. Alle 332 MC
       Syd-annoncer har postnr 6630 Rødding og hører altså til Syddanmark. */
    region: regionFraPostnr(row.postnr),

    description: row.uddrag || null,

    /* createdAt er MED VILJE null.

       foerst_set er den dag, crawleren så annoncen første gang — ikke den dag
       forhandleren satte motorcyklen til salg. Den kan være år gammel hos
       kilden. Bruger vi den som oprettelsesdato, påstår alle 332 at være
       nyere end alt andet på sitet, og "Nyeste først" begraver hver eneste
       Bikerbasen-annonce bag en blok, der blev til i det øjeblik, vi crawlede.
       Målt: 50 ud af de 50 øverste var eksterne.

       Vi kender ikke den rigtige dato, og så er det ærligste at lade være med
       at have en. Udaterede annoncer sorteres bagest ved datosortering og
       påvirker ikke pris-, årgangs- og km-sortering, hvor de konkurrerer på
       lige fod. Dagen vi kan læse en rigtig annoncedato hos kilden, sættes
       den her. */
    createdAt: null,
    indekseretFoerste: row.foerst_set,   // kun til fejlfinding og statistik

    isDealer: row.saelgertype === 'forhandler',

    // Det, der gør den ekstern.
    isExternal: true,
    externalUrl: row.url,
    source: { navn: kilde.navn || 'ekstern kilde', domaene: kilde.domaene || null },
    sourceListingId: row.kilde_annonce_id,

    // Kun miniaturen. Vi kopierer ikke gallerier — billederne er kildens.
    /* Kildens egen "intet foto"-grafik er ikke et foto af motorcyklen — se
       erKildensPladsholder() i crawler/normalize.js (samme regel, dér for det
       der GEMMES, her for det der allerede ligger i databasen fra foer
       rettelsen). Uden foto faar kortet det aerlige "Ingen fotos"-felt. */
    photoUrls: row.thumbnail_url && !erKildensPladsholder(row.thumbnail_url) ? [row.thumbnail_url] : [],
    photoRows: [],
    photos: row.thumbnail_url ? 1 : 0,

    /* ---------- Det vi ikke ved ----------

       Her står felterne, kilden aldrig har fortalt os noget om. De er
       skrevet ud ét for ét og sat til null MED VILJE. To grunde:

       1. null betyder "uoplyst". Det er ikke det samme som en værdi.
          equipment var før [], og en tom liste er en PÅSTAND: "denne
          motorcykel har intet udstyr". Det ved vi ikke. Måske har den ABS,
          måske har den ikke. En tom liste og et ubesvaret spørgsmål ser ens
          ud i et filter, men de betyder to vidt forskellige ting, og
          filtrene i js/search.js skelner nu mellem dem.

       2. Listen skal være læselig. Står de ikke her, ser man ikke, hvad
          der mangler — man opdager det først den dag et filter opfører sig
          mærkeligt. Sådan opstod fejlen i første omgang.

       Fristelsen er at fylde dem ud. Vinterklar kunne sættes til false, for
       det er sikrest; farve kunne læses ud af billedet. Begge dele ville stå
       på annoncesiden som en oplysning, MC Syd har givet — og det har de
       ikke. Vi gætter ikke på en andens vegne.

       Listen bliver kortere, efterhånden som kilden leverer mere. Stand,
       hestekræfter og type stod her indtil migration 015 og er nu flyttet op
       som rigtige felter. Det er sådan, den skal bruges: et felt forlader
       listen, når kilden begynder at fortælle os det — ikke når vi bliver
       trætte af at mangle det. */
    equipment: null,       // udstyr — ikke oplyst (ikke "intet udstyr")
    serviceHistorik: null, // servicehistorik
    antalEjere: null,      // antal ejere
    sidsteSyn: null,       // seneste syn
    vinterklar: null,      // vinterklargjort
    fuel: null, drive: null, cylinders: null, color: null,
    afgift: null, registration: null, kanNedsaettesA2: null,

    seller: null,
  };
}

/* Kolonnelisten er den samme som `listExternalListings()` i
   js/supabase-api.js og `EKSTERNE_KOLONNER` i scripts/shared.js, og den skal
   udvides i SAMME ombæring som den migration, der tilføjer kolonnen — aldrig
   før. Beder vi om en kolonne, der ikke findes, svarer PostgREST 42703, og så
   forsvinder alle 332 annoncer på én gang. Nu forsvinder de i det mindste
   HØJLYDT: statussen bliver 'fejlet', og siden skriver det (meldDataafbrud). */
const EKSTERNE_KOLONNER =
  'id, kilde_annonce_id, url, titel, maerke, model, variant, type, ' +
  'aargang, km, ccm, hk, pris_dkk, stand, salgsmarkoerer, udledte_felter, ' +
  'by, postnr, saelgertype, thumbnail_url, uddrag, status, foerst_set, sidst_set, ' +
  'kilde:kilder(navn, domaene)';

/* Rækkefølgen er `sidst_set` faldende — den SAMME som scripts/shared.js
   bruger, når mærkesidernes kort forudtegnes. Målt over otte indlæsninger er
   de 332 rækker kommet i samme orden hver gang, men Postgres lover det ikke
   ved lige `sidst_set` (crawleren stempler hele kørslen ens). Et fast
   brydeled — `,id.asc` — ville låse den helt; det skal bare lægges ind BEGGE
   steder samtidig, ellers omrokerer mærkesiden i det øjeblik javascriptet
   overtager fra den forudtegnede markup. Se noten i work/DECISIONS.md. */
async function loadExternalListings(){
  // `,id.asc` er brydeleddet, noten ovenfor efterlyste — lagt ind HER og i
  // scripts/shared.js fetchExternalListings() i samme commit (B4), saa de
  // forudtegnede kort og de hentede staar i samme orden. Ingen `limit=`:
  // restHentAlle() henter alt, se dens hoved.
  const res = await restHentAlle(`eksterne_annoncer?select=${encodeURIComponent(EKSTERNE_KOLONNER)}`
    + '&status=eq.aktiv&order=sidst_set.desc,id.asc');
  if (res.error){
    // En fejl her må ikke tage dine egne annoncer med sig. Søgningen skal
    // stadig virke, bare uden forhandlerannoncerne — OG køberen skal have det
    // at vide, for ellers er hvert tal på siden en påstand om et lager, vi
    // ikke har set.
    console.warn('Kunne ikke hente indekserede annoncer:', res.error.message);
    window.DATA_STATUS.eksterne = 'fejlet';
    return [];
  }
  window.EXTERNAL_LISTINGS = (res.data || []).map(normalizeExternalListing);
  window.DATA_STATUS.eksterne = 'ok';
  return window.EXTERNAL_LISTINGS;
}

/* Favoritter: databasen er sandheden, når man er logget ind.
   Det man nåede at gemme som anonym, flyttes med op ved login i stedet for
   at forsvinde.

   HVAD DER GIK GALT FØR (C-008). Funktionen skrev ALTID til localStorage,
   også når læsningen fra databasen var fejlet. Kæden var:
   `listFavorites()` slugte sin `error` og svarede `[]`; `toPush` blev
   dermed alle brugerens uuid-favoritter; hvert `addFavorite()` ramte
   primærnøglen `favorites_pkey (user_id, listing_id)` og fejlede som
   dublet; `remoteIds.push(id)` blev derfor sprunget over; og sidste linje
   skrev listen tilbage UDEN brugerens favoritter. Hjerterne slukkede,
   "Gemte" stod tom, og der kom ingen fejlbesked nogen steder.

   To ting holder den lukket nu, og de skal begge blive:
     1. Fejler læsningen, skrives der IKKE. En sammenfletning, der bygger på
        et tomt svar, må aldrig være destruktiv.
     2. Sammenfletningen er en UNION af databasen og det lokale. En favorit,
        der ikke kunne skrives op, bliver liggende lokalt, så næste
        synkronisering kan prøve igen — før faldt den på gulvet. */
async function syncFavorites(){
  if (!db.enabled || !Store.getUser()?.remote) return;

  const { ids: remoteIds, error } = await db.listFavorites();
  if (error){
    /* Vi ved ikke, hvad der står i databasen. Så rører vi ikke det, der
       står i browseren — det er brugerens eneste kopi lige nu. */
    console.warn('Favoritterne blev ikke synkroniseret, og de lokale står urørt:', error.message);
    return;
  }

  const localIds = Store.getFavorites();

  // Kun uuid'er hører til i databasen; demo-annoncer har numeriske id'er.
  const toPush = localIds.filter(id => isUuid(id) && !remoteIds.some(r => String(r) === String(id)));
  let ikkeSkrevet = 0;
  for (const id of toPush){
    const { error: skrivFejl } = await db.addFavorite(id);
    if (skrivFejl) ikkeSkrevet++;
  }
  if (ikkeSkrevet){
    console.warn(`${ikkeSkrevet} af ${toPush.length} favoritter kunne ikke gemmes i databasen — de bliver liggende lokalt.`);
  }

  /* Union, sammenlignet som streng: favoritter kan være uuid'er (database)
     eller tal (demo), og et strengt includes ville lade dem forbi hinanden.
     Rækkefølgen er database først, så den kopi, der overlever på tværs af
     enheder, står øverst. */
  const flettet = [];
  const set = new Set();
  for (const id of [...remoteIds, ...localIds]){
    const noegle = String(id);
    if (set.has(noegle)) continue;
    set.add(noegle);
    flettet.push(id);
  }
  localStorage.setItem(Store.KEYS.favorites, JSON.stringify(flettet));
}

/* ---------- Hvilke annoncer har DENNE side brug for? ----------

   De indekserede er målt til 29.867 B gzip (500 rækker, cross-origin, High)
   og blev hentet på hver side, der rører databasen — også dem, hvor ingen
   kodesti kan vise en af dem. `/annonce.html?id=1` hentede 332
   forhandlerannoncer for at skrive "Annoncen findes ikke".

   Listerne er DENYLISTER med vilje: en side, ingen har gennemgået, opfører
   sig som før. Begrundelsen pr. side:
   - `forhandler.html`: `hentSaelgerLokalt()` matcher på `seller.id ?? name`,
     og eksterne har `seller: null` — de frafiltreres altid. Er nøglen en
     uuid, slår siden op i databasen og rører ingen af listerne. Derfor er
     `<script id="boot-listings">` også taget ud af den side.
   - `login.html`: viser ingen annoncer.
   - `dashboard.html`: bruger `getMyListings()`, ikke `getAllListings()`.
   - `opret-annonce.html`: slår kun op for at REDIGERE, og en indekseret
     annonce har hverken ejer eller sælger hos os.
   - `annonce.html` uden uuid i `?id`: eksterne nøgler ER uuid'er, så svaret
     kan ikke ligge i listen.
   Uændret: forsiden, `soegning.html`, `maerke-*.html`, `mine-annoncer.html`
   (søgeagenter tælles mod HELE lageret) og `annonce.html` med en uuid.

   PRISEN: `prisSammenligning()` i js/data.js regner sit grundlag ud af
   `getAllListings()`. På de her sider bliver grundlaget mindre, og under fem
   sammenlignelige svarer den ingenting. Den kan altså UNDLADE et mærkat, den
   før satte — den kan ikke sætte et forkert. Målt i dag: nul annoncer i hele
   lageret ligger under grænsen, så ingen synlig forskel.

   Skal en side alligevel bruge listen, kan `loadExternalListings()` kaldes
   direkte bagefter — den skriver stadig `window.EXTERNAL_LISTINGS`. */
const SIDER_UDEN_EKSTERNE = new Set([
  'forhandler.html', 'login.html', 'dashboard.html', 'opret-annonce.html',
]);
const SIDER_UDEN_EGNE = new Set([
  'forhandler.html', 'login.html',
]);

function sidensNavn(){
  const navn = String(location.pathname || '').split('/').pop();
  return navn || 'index.html';
}

function harBrugForEksterne(){
  const side = sidensNavn();
  if (SIDER_UDEN_EKSTERNE.has(side)) return false;
  if (side !== 'annonce.html') return true;
  // Kun uuid'er kan pege på en indekseret annonce.
  return isUuid(new URLSearchParams(location.search).get('id') || '');
}

/* ---------- Når lageret IKKE kunne hentes, skal siden sige det ----------

   Kildelinjen over resultaterne ("51 annoncer på Bikerbasen · 332 indekseret
   hos MC Syd") tegnes af js/search.js ud fra det resultat, den får. Den kan
   derfor ikke fortælle om annoncer, der aldrig kom — den skjuler sig bare,
   fordi der ikke er nogen indekserede tilbage at forklare. Præcis dét var
   kritikerens hovedanke: sitets bedste tillidsfunktion fandtes kun i den
   tilstand, hvor alt var gået godt.

   Beskeden hører hjemme HER og ikke i den enkelte sides render: datalaget er
   det eneste sted, der ved, om vi spurgte og ikke fik svar. Den skrives ind
   øverst i <main> på hvilken som helst side, der bad om listen.

   Vi skriver ikke, HVOR mange der mangler. Det ved vi ikke — det er hele
   pointen med, at hentningen fejlede. Et gættet tal ville være den samme fejl
   én gang til, bare med flere decimaler. */
function meldDataafbrud(){
  const fejlet = window.DATA_STATUS.eksterne === 'fejlet' || window.DATA_STATUS.egne === 'fejlet';
  const vaert = document.getElementById('main-content') || document.querySelector('main');
  const gammel = document.getElementById('data-afbrud');
  if (!fejlet || !vaert){ gammel?.remove(); return; }
  if (gammel) return;

  const p = document.createElement('div');
  p.id = 'data-afbrud';
  p.className = 'data-afbrud';
  p.setAttribute('role', 'status');
  const hvad = window.DATA_STATUS.eksterne === 'fejlet' && window.DATA_STATUS.egne === 'fejlet'
    ? 'Vi kunne ikke hente annoncerne fra databasen.'
    : window.DATA_STATUS.eksterne === 'fejlet'
      ? 'Vi kunne ikke hente de annoncer, Bikerbasen har indekseret hos andre forhandlere.'
      : 'Vi kunne ikke hente de annoncer, Bikerbasen selv hoster.';
  p.innerHTML = `<strong>${hvad}</strong> `
    + 'Du ser derfor ikke hele lageret, og hverken antallet af annoncer eller '
    + 'tallene ved filtrene dækker det, der faktisk er til salg. '
    + '<button type="button" class="data-afbrud-igen">Prøv igen</button>';
  p.querySelector('.data-afbrud-igen').addEventListener('click', () => location.reload());
  vaert.prepend(p);
}

/* Kald denne før første render på sider der viser data. */
let _bootPromise = null;
function backendReady(){
  if (_bootPromise) return _bootPromise;
  _bootPromise = (async () => {
    if (!supabaseKonfigureret()){
      window.DATA_STATUS.egne = window.DATA_STATUS.eksterne = 'sprunget-over';
      return { enabled: false };
    }
    const side = sidensNavn();
    if (SIDER_UDEN_EGNE.has(side)) window.DATA_STATUS.egne = 'sprunget-over';
    if (!harBrugForEksterne()) window.DATA_STATUS.eksterne = 'sprunget-over';

    /* Sessionen kræver SDK'et (tokens, fornyelse) — annoncerne gør ikke
       længere. Derfor står de tre i samme Promise.all i stedet for at have
       sessionen som en rundtur FORAN annoncerne: det, køberen er kommet
       efter, skal ikke stå i kø bag en login-kontrol, han måske ikke har
       brug for. Fejler sessionen, fejler den for sig. */
    // SDK'et hentes kun, naar der er en session at forny — se bbSikrSdk().
    await bbSikrSdk();
    const medSdk = db.enabled;
    if (medSdk) saetAuthLytter();

    /* HVER kilde har sit eget net. backendReady() må ALDRIG afvise:
       js/search.js' boot() gør `await backendReady()` som allerførste
       handling, så en afvisning her stopper hele opstarten — ingen filtre,
       ingen kort, og resultatlinjen står tilbage med den statiske "0
       annoncer fundet", der er skrevet i soegning.html. Det er en tom side,
       der ligner et tomt marked. Den gamle udgave havde ét stort try/catch
       om det hele netop derfor; det er bevaret, men opdelt, så én kilde, der
       falder, ikke river de andre med sig — OG så statussen bliver 'fejlet'
       i stedet for bare at blive slugt. */
    const gren = (navn, p, noegle) => Promise.resolve(p).catch(e => {
      console.warn(`${navn} fejlede:`, e);
      if (noegle) window.DATA_STATUS[noegle] = 'fejlet';
      return null;
    });

    await Promise.all([
      medSdk ? gren('Sessionen', syncSessionToStore()) : null,
      SIDER_UDEN_EGNE.has(side) ? null : gren('Egne annoncer', loadRemoteListings(), 'egne'),
      harBrugForEksterne() ? gren('Indekserede annoncer', loadExternalListings(), 'eksterne') : null,
    ]);

    // Favoritterne skal kende brugeren, så de kommer bagefter — og de kræver
    // SDK'et, fordi de SKRIVER.
    if (medSdk) await gren('Favoritterne', syncFavorites());

    try { meldDataafbrud(); } catch (e) { console.warn('Afbrudsbeskeden kunne ikke tegnes:', e); }
    return { enabled: true, sdk: medSdk };
  })();
  return _bootPromise;
}

/* Supabase gemmer sessionen selv; vi holder Store i sync ved skift. */
document.addEventListener('DOMContentLoaded', () => { saetAuthLytter(); });
