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
    photoUrls: photos.map(p => db.photoUrl(p.storage_path)).filter(Boolean),
    // Id og sti følger med, så redigering kan fjerne ét enkelt billede
    // i stedet for at røre dem alle. `position` følger med, fordi
    // js/opret-annonce.js skal kende den HØJESTE position, der bliver
    // liggende, for at kunne lægge et nyt billede bagefter uden at ramme
    // samme position som et billede, der stadig er der (position 0 er
    // forsidebilledet). Antallet af rækker duer ikke som mål: efter en
    // sletning midt i rækken er der huller i positionerne.
    photoRows: photos.map(p => ({ id: p.id, path: p.storage_path, position: p.position, url: db.photoUrl(p.storage_path) })),
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
async function loadRemoteListings(){
  if (!db.enabled) return [];

  let data = window.__bbListingsBoot ? await window.__bbListingsBoot : null;
  if (!Array.isArray(data)){
    const res = await db.listListings({ limit: 200 });
    if (res.error){
      console.warn('Kunne ikke hente annoncer fra databasen:', res.error.message);
      return [];
    }
    data = res.data;
  }

  window.REMOTE_LISTINGS = (data || []).map(normalizeRemoteListing);
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
function normalizeExternalListing(row){
  const kilde = row.kilde || {};
  return {
    id: row.id,
    brand: row.maerke || 'Ukendt',
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

    // Kildens stand (migration 015). Se ordlisten ovenfor: "brugt" oversættes,
    // "ny" har endnu ingen plads i CONDITIONS og forbliver uoplyst.
    condition: conditionFraStand(row.stand),

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
    photoUrls: row.thumbnail_url ? [row.thumbnail_url] : [],
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

async function loadExternalListings(){
  if (!db.enabled) return [];
  const res = await db.listExternalListings({ limit: 500 });
  if (res.error){
    // En fejl her må ikke tage dine egne annoncer med sig. Søgningen skal
    // stadig virke, bare uden forhandlerannoncerne.
    console.warn('Kunne ikke hente indekserede annoncer:', res.error.message);
    return [];
  }
  window.EXTERNAL_LISTINGS = (res.data || []).map(normalizeExternalListing);
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

/* Kald denne før første render på sider der viser data. */
let _bootPromise = null;
function backendReady(){
  if (_bootPromise) return _bootPromise;
  _bootPromise = (async () => {
    if (!db.enabled) return { enabled: false };
    try {
      await syncSessionToStore();
      // Egne annoncer og indekserede hentes samtidig — de er uafhængige, og
      // serielt ville de lægge en rundtur oven i sidens første render.
      await Promise.all([
        SIDER_UDEN_EGNE.has(sidensNavn()) ? Promise.resolve([]) : loadRemoteListings(),
        harBrugForEksterne() ? loadExternalListings() : Promise.resolve([]),
      ]);
      await syncFavorites();
    } catch (e) {
      console.warn('Backend-opstart fejlede, fortsætter på lokale data:', e);
    }
    return { enabled: true };
  })();
  return _bootPromise;
}

/* Supabase gemmer sessionen selv; vi holder Store i sync ved skift. */
document.addEventListener('DOMContentLoaded', () => {
  if (!db.enabled) return;
  db.raw?.auth.onAuthStateChange(async (event) => {
    if (event === 'SIGNED_OUT') Store.logout();
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') await syncSessionToStore();
  });
});
