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

/* Oversætter en databaserække til den form, UI'et allerede forventer. */
function normalizeRemoteListing(row){
  const photos = (row.photos || []).slice().sort((a, b) => a.position - b.position);
  const seller = row.seller || {};
  return {
    id: row.id,
    brand: row.brand, model: row.model, type: row.type,
    year: row.year, km: row.km, ccm: row.ccm, power: row.power,
    price: row.price, condition: row.condition,
    vin: row.vin, registration: row.registration, afgift: row.afgift,
    fuel: row.fuel || null, drive: row.drive || null,
    cylinders: row.cylinders || null, color: row.color || null,
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

async function loadRemoteListings(){
  if (!db.enabled) return [];
  const { data, error } = await db.listListings({ limit: 200 });
  if (error){
    console.warn('Kunne ikke hente annoncer fra databasen:', error.message);
    return [];
  }
  window.REMOTE_LISTINGS = (data || []).map(normalizeRemoteListing);
  return window.REMOTE_LISTINGS;
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
      await loadRemoteListings();
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
