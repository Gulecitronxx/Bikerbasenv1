/* Fælles byggehjælpere.

   Mærkesider, annoncesider og sitemap skal være enige om hvor en annonce
   bor. Lå adresseberegningen to steder, ville et sitemap før eller siden
   pege på sider der ikke findes. Derfor ét sted. */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function siteUrl(){
  return require('./site-url')(ROOT);
}

function slugify(name){
  return String(name).toLowerCase()
    .replace(/ø/g, 'oe').replace(/æ/g, 'ae').replace(/å/g, 'aa')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Filnavnet på en annonces statiske side.

   Mærke, model og årgang står i adressen, fordi det er dét folk søger på.
   De første otte tegn af id'et hænges på, så to ens motorcykler aldrig
   overskriver hinandens side. Filerne ligger i roden som maerke-*.html —
   så slipper vi for at omskrive alle relative stier i header og footer. */
function listingSlug(l){
  const kort = String(l.id).slice(0, 8);
  return `annonce-${slugify(`${l.brand} ${l.model} ${l.year}`)}-${kort}.html`;
}

/* Henter annoncerne fra databasen. Falder tilbage på det, js/data.js måtte
   indeholde, hvis databasen ikke kan nås — et build skal ikke fejle alene
   på grund af netværket. */
async function fetchListings(fallback = []){
  const cfg = fs.readFileSync(path.join(ROOT, 'js/supabase-config.js'), 'utf8');
  const url = (cfg.match(/url:\s*'([^']+)'/) || [])[1];
  const key = (cfg.match(/anonKey:\s*'([^']+)'/) || [])[1];
  if (!url || !key){
    console.warn('Ingen Supabase-konfiguration — bruger annoncer fra js/data.js.');
    return fallback;
  }
  try {
    const select = '*,photos:listing_photos(storage_path,position),seller:public_profiles!listings_seller_id_fkey(*)';
    const r = await fetch(`${url}/rest/v1/listings?select=${encodeURIComponent(select)}&status=eq.active`,
      { headers: { apikey: key } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const rows = await r.json();
    console.log(`Hentede ${rows.length} annoncer fra databasen.`);
    return rows.map(l => ({
      ...l,
      createdAt: l.created_at,
      photoUrls: (l.photos || [])
        .slice().sort((a, b) => a.position - b.position)
        .map(p => `${url}/storage/v1/object/public/listing-photos/${p.storage_path}`),
    }));
  } catch (e) {
    console.warn('Kunne ikke hente fra databasen (' + e.message + ') — bruger js/data.js.');
    return fallback;
  }
}

/* Henter de INDEKSEREDE annoncer fra `eksterne_annoncer`.

   Hvorfor funktionen findes: byggekæden læste kun `listings`, og den har 0
   rækker i drift. Målt resultat: 7 indekserbare adresser, nul mærkesider,
   404 på maerke-honda.html — mens 332 aktive rækker lå i `eksterne_annoncer`
   og aldrig blev læst af et byggescript. Mærkesider er VORES aggregering (et
   antal, et prisspænd, veje ind i vores søgning), så de må gerne bygges af
   dem. De enkelte annoncer forbliver noindex — se js/annonce.js.

   Kolonnelisten er den samme som js/supabase-api.js listExternalListings og
   skal udvides i SAMME ombæring som migrationen. Grunden er den samme dér som
   her, men konsekvensen er ikke: beder vi om en kolonne, der ikke findes,
   svarer PostgREST 42703. I klienten forsvinder annoncerne fra siden; her
   ville et build skrive et sitemap uden dem. Derfor KASTES fejlen i stedet for
   at falde tilbage til et tomt array. Et build, der stopper, kan ses. Et
   sitemap, der stilfærdigt skrumper til 7 URL'er, kan ikke — og det er
   præcis den tilstand, der blev fundet i drift.

   `ejet_af` og `manuelle_felter` er MED VILJE ude af listen: de bruges ikke i
   en genereret side, og `ejet_af` er et bruger-id. Vi henter ikke
   personoplysninger ind i en byggeproces, der ingen brug har for dem. */
const EKSTERNE_KOLONNER =
  'id, kilde_annonce_id, url, titel, maerke, model, variant, type, ' +
  'aargang, km, ccm, hk, pris_dkk, stand, salgsmarkoerer, udledte_felter, ' +
  'by, postnr, saelgertype, thumbnail_url, uddrag, status, foerst_set, sidst_set, ' +
  'kilde:kilder(navn, domaene)';

async function fetchExternalListings(){
  const cfg = fs.readFileSync(path.join(ROOT, 'js/supabase-config.js'), 'utf8');
  const url = (cfg.match(/url:\s*'([^']+)'/) || [])[1];
  const key = (cfg.match(/anonKey:\s*'([^']+)'/) || [])[1];
  if (!url || !key){
    throw new Error('Ingen Supabase-konfiguration — de indekserede annoncer kan ikke hentes, '
      + 'og et maerkeindeks bygget uden dem ville vaere tomt. Build afbrudt.');
  }
  // Samme raekkefoelge som klienten (js/supabase-api.js): sidst_set faldende.
  // Maerkesidens forudtegnede kort skal staa i samme orden som js/maerke.js
  // tegner dem bagefter, ellers omrokerer siden naar javascriptet overtager.
  const r = await fetch(
    `${url}/rest/v1/eksterne_annoncer?select=${encodeURIComponent(EKSTERNE_KOLONNER)}`
    + '&status=eq.aktiv&order=sidst_set.desc',
    { headers: { apikey: key } });
  if (!r.ok){
    throw new Error(`Kunne ikke hente eksterne_annoncer (HTTP ${r.status}: ${await r.text()}). `
      + 'Build afbrudt frem for at skrive et sitemap uden annoncer.');
  }
  const rows = await r.json();
  console.log(`Hentede ${rows.length} indekserede annoncer fra databasen.`);
  return rows;
}

/* Genbruger den levende header og footer, så genererede sider aldrig
   driver fra resten af sitet. */
function sliceBetween(src, start, end, label){
  const a = src.indexOf(start);
  const b = src.indexOf(end);
  if (a === -1 || b === -1 || b <= a){
    throw new Error(`Kunne ikke udtraekke ${label} fra index.html — markoererne matchede ikke. `
      + `Sider ville blive genereret uden ${label}, saa build afbrydes.`);
  }
  return src.slice(a, b + end.length);
}

function siteParts(){
  // Normalisér linjeskift først: git checker filerne ud som CRLF på Windows,
  // og match på "\n" gav tidligere sider helt uden header.
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
  const header = sliceBetween(index, '<a class="skip-link"', '</div>\n</div>', 'header');
  const footer = sliceBetween(index, '<footer class="site-footer">', '</footer>', 'footer');
  if (!/site-header/.test(header)) throw new Error('Udtrukket header mangler .site-header — build afbrudt.');
  if (!/site-footer/.test(footer)) throw new Error('Udtrukket footer mangler .site-footer — build afbrudt.');
  const csp = (index.match(/<meta http-equiv="Content-Security-Policy"[^>]*>/) || [])[0] || '';

  // Kontaktmodalen er en del af annonce.html's egen skabelon — den findes
  // ikke på forsiden. Den ligger uden for <main>, mellem footer og scripts,
  // så js/annonce.js kan åbne den uden at skulle bygge den selv.
  const annonce = fs.readFileSync(path.join(ROOT, 'annonce.html'), 'utf8').replace(/\r\n/g, '\n');
  const contactModal = sliceBetween(annonce, '<div class="modal-overlay" id="contact-modal">', '</div>\n\n<script', 'kontaktmodal')
    .replace(/\n<script$/, '');

  return { header, footer, csp, contactModal };
}

/* Sidens EGEN kortmarkup og rækkeoversættelse, kørt i byggeriet.

   Forudtegnede annoncekort (søgeside, mærkesider) skal være tegn for tegn
   det samme, som js/search.js og js/maerke.js laver bagefter — ellers
   omrokerer siden, når javascriptet overtager. Derfor evalueres de rigtige
   browsermoduler her med små stubbe for browser-globalerne i stedet for at
   duplikere hverken markup eller feltnavne. Vokser modulerne nye
   browserafhængigheder, fejler byggeriet højlydt, hvilket er meningen.

   Returnerer:
     listingCardHTML(l, i)          — samme kort som klienten tegner
     normalizeRemoteListing(row)    — databaserække → UI-form (isDealer,
                                      serviceHistorik, photoUrls osv.)
     normalizeExternalListing(row)  — række i eksterne_annoncer → samme UI-form,
                                      med isExternal og source. Skal gennem den
                                      HER, ikke en kopi: den er stedet, hvor det
                                      står skrevet ned hvad vi IKKE ved om en
                                      indekseret annonce (equipment: null osv.). */
function browserModules(){
  const cfg = fs.readFileSync(path.join(ROOT, 'js/supabase-config.js'), 'utf8');
  const url = (cfg.match(/url:\s*'([^']+)'/) || [])[1] || '';

  // components.js' initCompare og backend-bridge.js venter begge på
  // DOMContentLoaded; med readyState 'loading' registrerer de bare en
  // lytter og gør intet.
  const doc = { readyState: 'loading', addEventListener(){}, querySelector(){ return null; } };
  // Ingen bruger, ingen favoritter, ingen sammenligning ved første maling.
  const store = {
    getUser: () => null,
    isFavorite: () => false,
    isComparing: () => false,
    getCompare: () => [],
  };
  // Kun photoUrl bruges af normalizeRemoteListing; resten af db røres ikke.
  const db = {
    enabled: false,
    photoUrl: p => p ? `${url}/storage/v1/object/public/listing-photos/${p}` : null,
  };

  const src = ['js/data.js', 'js/icons.js', 'js/bike-art.js', 'js/components.js', 'js/backend-bridge.js']
    .map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n');

  return new Function('document', 'Store', 'window', 'db',
    src + '\n;return { listingCardHTML, normalizeRemoteListing, normalizeExternalListing };')(doc, store, {}, db);
}

module.exports = { ROOT, siteUrl, slugify, listingSlug, fetchListings, fetchExternalListings,
  siteParts, esc, browserModules };
