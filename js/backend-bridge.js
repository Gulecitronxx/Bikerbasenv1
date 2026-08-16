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
    // i stedet for at røre dem alle.
    photoRows: photos.map(p => ({ id: p.id, path: p.storage_path, url: db.photoUrl(p.storage_path) })),
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
    model: row.model || row.titel || '',
    type: null,
    year: row.aargang,
    km: row.km,
    ccm: row.ccm,
    power: null,
    price: row.pris_dkk,
    condition: null,
    postnr: row.postnr,
    city: row.by || '',
    region: null,
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
    equipment: [],
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
   at forsvinde. */
async function syncFavorites(){
  if (!db.enabled || !Store.getUser()?.remote) return;

  const remoteIds = await db.listFavorites();
  const localIds = Store.getFavorites();

  // Kun uuid'er hører til i databasen; demo-annoncer har numeriske id'er.
  const toPush = localIds.filter(id => isUuid(id) && !remoteIds.includes(id));
  for (const id of toPush){
    const { error } = await db.addFavorite(id);
    if (!error) remoteIds.push(id);
  }

  // Behold lokale demo-favoritter, så UI'et ikke pludselig glemmer dem.
  const demoIds = localIds.filter(id => !isUuid(id));
  localStorage.setItem(Store.KEYS.favorites, JSON.stringify([...remoteIds, ...demoIds]));
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
      await Promise.all([loadRemoteListings(), loadExternalListings()]);
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
