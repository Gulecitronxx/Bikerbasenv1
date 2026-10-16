/* Udvælgelse og navngivning af de NYE søgeintention-sider (S-007, S-015, S-016,
   S-017): prisintervaller, byer, flere modeller og mærke+type-kombinationer.

   Alt her er rene funktioner (ingen netværk, ingen filer undtagen laesPostnumre),
   så scripts/seo-sider.test.js kan låse reglerne med fixtures. Selve siderne
   tegnes af scripts/build-facet-pages.js med samme komponenter som de
   eksisterende facetsider (css/p-facet.css, .fa-*).

   DEN RØDE TRÅD: ingen skov af tomme sider (D-010). En side får kun lov at
   eksistere, hvis den har noget at sige, som den nærmeste eksisterende side
   ikke allerede siger — og kun hvis den har nok annoncer og et ægte indhold
   (pris og årgang), ellers er den noindex. Tærsklerne er målt på det rigtige
   lager (604 annoncer, 16.10.2026) og står med deres begrundelse nedenfor. */

const fs = require('fs');
const path = require('path');

/* ---------- Tærskler ---------- */
const TAERSKLER = {
  /* Type, kørekort og landsdel: uændret 10 (se build-facet-pages.js). */
  indeks: 10,
  /* Modelsider: sænket fra 10 til 5. Målt: 6 modeller har >= 10 annoncer, 9 til har
     5-8. En model med 5 annoncer har stadig et prisspænd, flere årgange og et
     kilometerspænd — men KUN hvis der er oplyst pris og årgang på mindst 3 af dem
     (harIndhold). Under 5 er et prisspænd en enkelt tilfældig annonce. */
  model: 5,
  /* Byer: 10, som landsdelene. */
  by: 10,
  /* Prisintervaller: 10. Alle fire trin ligger langt over (55-262 annoncer), så
     tærsklen afgør i dag ikke noget — den er der, hvis lageret skrumper. */
  budget: 10,
  /* Mærke+type: 15, strengere end de øvrige, fordi en kombination er en TREDJE vej
     ind til de samme annoncer som mærkesiden og typesiden (se vaelgKombi). */
  kombi: 15,
};

/* Fastlagte prisgrænser (S-015). En lukket, redaktionel liste som typerne: alle
   trin bygges ved hvert byg, og et trin under tærsklen bliver noindex, aldrig 404.
   30, 50, 75 og 100.000 er de runde grænser, folk søger på ("motorcykel under
   50.000"); 150/200.000 er udeladt, fordi de dækker 67 % / 83 % af lageret og
   derfor næsten er hele søgningen. */
const BUDGET_TRIN = [30000, 50000, 75000, 100000];

/* En by-side må ikke være en dublet af landsdelssiden. Står mere end denne andel
   af landsdelens annoncer i byen, er landsdelssiden allerede svaret. (Rødding:
   346 af 357 i Syddanmark.) */
const BY_OVERLAP_MAX = 0.8;

/* En mærke+type-side må højst indeholde denne andel af typesidens annoncer,
   ellers er den typesiden i andet ord (Honda adventure: 53 af 67 = 79 %). */
const KOMBI_ANDEL_AF_TYPE_MAX = 0.75;

/* ---------- Sluggere ---------- */
const slugify = s => String(s).toLowerCase()
  .replace(/ø/g, 'oe').replace(/æ/g, 'ae').replace(/å/g, 'aa')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const budgetSlug = max => `budget-under-${max}`;
const bySlug = navn => `by-${slugify(navn)}`;
const kombiSlug = (brand, typeId) => `mc-${slugify(brand)}-${slugify(typeId)}`;

/* ---------- Hjælpere ---------- */
const tilTal = v => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const medPris = (l) => { const p = tilTal(l.price); return p !== null && p > 0 ? p : null; };
const I_AAR = 2026;
const troevaerdigtAar = y => y != null && y >= 1900 && y <= I_AAR + 1;

function median(sorteret){
  if (!sorteret.length) return null;
  const m = Math.floor(sorteret.length / 2);
  return sorteret.length % 2 ? sorteret[m] : Math.round((sorteret[m - 1] + sorteret[m]) / 2);
}

/* Har udvalget et ægte indhold, som en side kan stå på? Mindst 3 oplyste priser og
   3 oplyste årgange. Uden dem er "prisniveau" og "årgange" tomme ord. */
function harIndhold(items){
  const priser = items.map(medPris).filter(p => p !== null);
  const aar = items.map(l => tilTal(l.year)).filter(troevaerdigtAar);
  return priser.length >= 3 && aar.length >= 3;
}

/* ---------- Modelnavne (S-007a) ---------- */
/* Søgenavn i titel/overskrift uden at ændre sluggen. Kilden skriver "CRF 1100 L
   Africa"; folk søger på "Africa Twin" (Hondas modelnavn er CRF1100L Africa Twin;
   siden har selv de andre varianter som "CRF 1100 L Africa Twin"). Tabellen er
   bevidst lille: kun navne hvor kildens forkortelse er kendt forkert for søgeren. */
const MODEL_ALIAS = new Map([
  ['Honda|CRF 1100 L Africa', 'CRF 1100 L Africa Twin'],
]);
function visModel(brand, model){
  return MODEL_ALIAS.get(`${brand}|${model}`) || model;
}

/* ---------- Postnumre og byer (S-016) ---------- */

/* js/postnumre.js er en ren const-erklæring: [postnr, bynavn, region]. */
function laesPostnumre(root){
  const src = fs.readFileSync(path.join(root, 'js', 'postnumre.js'), 'utf8');
  const tabel = new Function(src + '\n;return POSTNUMRE;')();
  return new Map(tabel.map(([nr, navn, region]) => [String(nr), { navn, region }]));
}

/* "København K", "Aarhus C", "Odense SØ", "Svenstrup J" er bydele/postdistrikter af
   samme by — folk søger på "motorcykel Aarhus", ikke på "Aarhus V". */
function renBynavn(navn){
  return String(navn || '').trim().replace(/\s+(?:NV|NØ|SV|SØ|[CKNSVØJM])$/, '');
}

function byNavn(postnr, city, tabel){
  const hit = tabel && tabel.get(String(postnr || '').trim());
  return renBynavn(hit ? hit.navn : city);
}

/* Alle byer med mindst ét postnummer i lageret: Map<slug, {navn, slug, postnumre, items}>.
   Annoncer uden postnummer og uden bynavn tæller ikke med. */
function byGrupper(alle, tabel){
  const g = new Map();
  for (const l of alle){
    const pn = String(l.postnr || '').trim();
    const navn = byNavn(pn, l.city, tabel);
    if (!navn) continue;
    const slug = bySlug(navn);
    if (!g.has(slug)) g.set(slug, { navn, slug, postnumre: new Set(), items: [] });
    const e = g.get(slug);
    if (pn) e.postnumre.add(pn);
    e.items.push(l);
  }
  return g;
}

/* De byer, der får en side NU. Afviser med årsag, så rapporten kan vise hvorfor. */
function vaelgByer(alle, tabel, opts = {}){
  const taerskel = opts.taerskel ?? TAERSKLER.by;
  const overlapMax = opts.overlapMax ?? BY_OVERLAP_MAX;
  const regionAntal = new Map();
  for (const l of alle) if (l.region) regionAntal.set(l.region, (regionAntal.get(l.region) || 0) + 1);
  const ud = [];
  for (const e of byGrupper(alle, tabel).values()){
    const pr = new Map();
    for (const l of e.items) if (l.region) pr.set(l.region, (pr.get(l.region) || 0) + 1);
    const region = [...pr.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const andel = region ? e.items.length / (regionAntal.get(region) || e.items.length) : 0;
    let afvist = null;
    if (e.items.length < taerskel) afvist = 'for-faa';
    else if (!region) afvist = 'ingen-region';
    else if (andel >= overlapMax) afvist = 'region-dublet';
    else if (!harIndhold(e.items)) afvist = 'tyndt-indhold';
    ud.push({ navn: e.navn, slug: e.slug, postnumre: [...e.postnumre].sort(), antal: e.items.length, region, andelAfRegion: andel, afvist });
  }
  return ud.sort((a, b) => b.antal - a.antal || a.navn.localeCompare(b.navn, 'da'));
}

/* ---------- Mærke + type (S-017/d) ---------- */
function vaelgKombi(alle, typeIds, opts = {}){
  const taerskel = opts.taerskel ?? TAERSKLER.kombi;
  const andelMax = opts.andelMax ?? KOMBI_ANDEL_AF_TYPE_MAX;
  const antalType = new Map(), antalKombi = new Map();
  for (const l of alle){
    if (!l.type) continue;
    antalType.set(l.type, (antalType.get(l.type) || 0) + 1);
    const b = String(l.brand || '').trim();
    if (!b || b === 'Ukendt') continue;
    const k = `${b}\u0000${l.type}`;
    antalKombi.set(k, (antalKombi.get(k) || 0) + 1);
  }
  const ud = [];
  for (const [k, n] of antalKombi){
    const [brand, typeId] = k.split('\u0000');
    if (!typeIds.includes(typeId)) continue;
    const andelAfType = n / (antalType.get(typeId) || n);
    const items = alle.filter(l => String(l.brand || '').trim() === brand && l.type === typeId);
    let afvist = null;
    if (n < taerskel) afvist = 'for-faa';
    else if (andelAfType > andelMax) afvist = 'type-dublet';
    else if (!harIndhold(items)) afvist = 'tyndt-indhold';
    ud.push({ brand, typeId, slug: kombiSlug(brand, typeId), antal: n, andelAfType, afvist });
  }
  return ud.sort((a, b) => b.antal - a.antal || a.slug.localeCompare(b.slug));
}

/* ---------- Pris (S-015) ---------- */
const underGraense = (alle, max) => alle.filter(l => { const p = medPris(l); return p !== null && p <= max; });

module.exports = {
  TAERSKLER, BUDGET_TRIN, BY_OVERLAP_MAX, KOMBI_ANDEL_AF_TYPE_MAX, MODEL_ALIAS,
  slugify, budgetSlug, bySlug, kombiSlug, tilTal, medPris, median, troevaerdigtAar, harIndhold,
  visModel, laesPostnumre, renBynavn, byNavn, byGrupper, vaelgByer, vaelgKombi, underGraense,
};
