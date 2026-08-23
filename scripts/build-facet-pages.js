/* Genererer statiske facet-landingssider: én pr. motorcykeltype (TYPES i
   js/data.js) og én pr. kørekortkategori (A1/A2 — se begrundelsen for at "A"
   IKKE får en side nedenfor).

   HVORFOR DEN HER FIL FINDES
   --------------------------
   Runde 3's brief (arkitekt-delen af opgaven) er præcis: der findes i dag
   INGEN statisk, indekserbar side for type, kørekortklasse eller
   mærke+type — kun `soegning.html?type=naked` og `?koerekort=A2`, som er
   client-side query-parameter-filtre på en `noindex`-side. Google kan ikke
   rangere "brugt cruiser til salg" eller "motorcykel til A2-kørekort" på en
   side, den er bedt om at IKKE indeksere. maerke-*.html lukkede præcis det
   samme hul for mærker (SEO-runde 3, builder A+B); denne fil gør det samme
   for type og kørekort.

   Køres: node scripts/build-facet-pages.js
   Kaldes fra: scripts/build.js, EFTER build-brand-pages.js (så sitemap.xml
   allerede findes og kan udvides — se bunden af filen) og FØR build-meta.js
   (som skriver delelistetags ind i ALLE *.html-filer i roden — mine skal
   altså findes, når den kigger).

   TÆRSKEL — hvorfor 10, og hvorfor det ikke er en tilfældig runding
   -------------------------------------------------------------------
   "En facet med 2 annoncer er en tynd side, ikke en landingsside" (opgavens
   egen formulering). Målt på den RIGTIGE database (548 aktive annoncer,
   20.08.2026, fetchListings()+fetchExternalListings()):

     Type (eksakt match på l.type, samme felt soegning.html?type= filtrerer på):
       cruiser 89 · adventure 67 · naked 60 · touring 53 · sport 20 ·
       classic 6 · cross 1 · scooter 0        (252 annoncer har slet ingen
       type — normalizeExternalListing kunne ikke udlede den fra kilden, og
       de optræder derfor på INGEN typeside, hverken som ja eller nej)

     Kørekort (passerKoerekort() — SAMME funktion soegning.html?koerekort=
       og js/home.js's hero bruger, altså den KUMULATIVE "kan køres på
       licens X", ikke kun "mindste påkrævede kategori"):
       A1 15 · A2 47 · A 548 (= HELE lageret, se "A" nedenfor)

   Tærsklen 10 er sat, fordi den ikke afgør noget enkelt grænsetilfælde: de
   fem typer, der klarer den, ligger alle over 20 (mindst 20, højst 89), og
   de tre der ikke gør, ligger alle under 6 (0, 1, 6). Der er intet mellem 7
   og 19 — så uanset om tærsklen havde været 8 eller 19, var resultatet det
   samme. Det er den tærskel værd at have: en, der ikke selv er en gættet
   linje.

   HVORFOR "A" IKKE FÅR EN SIDE
   -----------------------------
   `passerKoerekort(l, 'A')` returnerer altid true (koden selv: "A dækker
   alt") — en side for kørekort A ville derfor vise ALLE 548 annoncer, dvs.
   nøjagtig samme indhold som soegning.html uden noget filter overhovedet.
   Det er ikke en tynd side (den er tyk), men den er en DUBLET af forsiden af
   søgeresultatet — nul differentiering, og et ekstra crawl-mål Google
   rimeligvis ville se som duplicate content af soegning.html/index.html.
   A1 og A2 er reelle, afgrænsede spørgsmål ("hvad kan jeg køre på MIT
   kørekort"); "A" er spørgsmålet "vis mig alt", som allerede har en side.

   MÆRKE+TYPE / MÆRKE+KØREKORT — OVERVEJET, IKKE BYGGET
   -------------------------------------------------------
   45 mærke+type-kombinationer findes i data, men kun 8 af dem har >=10
   annoncer (Honda/adventure 52, Honda/cruiser 39, Honda/naked 38,
   Honda/touring 31, Harley-Davidson/cruiser 31, Honda/sport 10,
   Suzuki/cruiser 8, BMW/touring 8 — de sidste to er faktisk under
   tærsklen, øverste 6 er over). At bygge alle 480 tænkelige
   mærke×type-kombinationer (60 mærker × 8 typer) ville enten give en
   skov af tomme noindex-sider (samme fejlklasse som D-010's 44
   mærkelinks til nul træf) eller kræve en ANDEN tærskelregel for hvornår en
   kombinationsside overhovedet skabes — og de 8, der rent faktisk har
   volumen, overlapper allerede fuldt ud med både maerke-honda.html/
   maerke-harley-davidson.html (som allerede viser dem) OG type-cruiser.html/
   type-adventure.html (som denne fil bygger). En Honda+Adventure-side ville
   være tredje vej ind til de samme 52 annoncer, uden ny tekst at sige om
   dem. Denne runde bygger dem IKKE. Kandidat til en senere runde, HVIS
   søgekonsollen (findes ikke i dag — sitet er ni dage gammelt, jf.
   opgavens præmis) viser reelle forespørgsler på "honda adventure" adskilt
   fra "honda" og "adventure" hver for sig.

   ALDRIG 404 — facet-katalogets URL'er er FASTE
   -----------------------------------------------
   TYPES (8) og KOEREKORT_FACETS (2) er lukkede, opremsede lister — ikke
   noget, der opdages fra dataene. Derfor skrives ALLE 10 filer ved HVERT
   byg, uanset antal. Falder en facets antal til 0 i morgen (typen bliver
   umoderne, kilden stopper), forsvinder filen ALDRIG, og adressen svarer
   ALDRIG 404 — den skifter i stedet til den tynde/tomme udgave (noindex,
   ærlig "0 lige nu"-tekst, link tilbage til hele søgningen). Det er den
   modsatte regel af maerke-*.html, hvor en mærkeside der falder til 0
   FJERNES (se build-brand-pages.js's `forventede`/`slettet`-blok) — en
   bevidst forskel, ikke en inkonsekvens: mærker er en ÅBEN mængde (dukker op
   og forsvinder med hvad kilderne fører), type og kørekort er en LUKKET,
   redaktionel liste, der altid har eksisteret på sitet i kraft af selve
   filterpanelet. En lukket liste kan love en adresse for evigt; en åben kan
   ikke. Se work/DECISIONS.md for denne begrundelse skrevet ud i sin helhed —
   værd at genoverveje for maerke-*.html i en senere runde. */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { siteUrl, fetchListings, fetchExternalListings, siteParts, esc, browserModules, listingSlug } = require('./shared');
const { listingCardHTML, normalizeRemoteListing, normalizeExternalListing } = browserModules();
const BASE = siteUrl();

// data.js giver koerekortForListing, passerKoerekort, hkEllerNull, TYPES,
// typeLabel, formatPrice/Km/Ccm, A1_MAX_CCM/A1_MAX_HK/A2_MAX_HK — samme
// eval-mønster som build-brand-pages.js og build-listing-pages.js bruger.
// eval() af en lokal, forfatterstyret fil (ikke brugerinput) — samme
// begrundelse som de to andre steder i byggekæden, der gør det samme.
// A1_MAX_CCM/A1_MAX_HK/A2_MAX_HK er "const" i js/data.js, og const-bindinger
// (modsat function-erklæringer) lækker ikke ud af et direkte eval — samme
// grund til at LISTINGS/TYPES i build-brand-pages.js hentes via global.__X
// i stedet for at læses direkte efter eval-kaldet.
const dataSrc = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8');
eval(dataSrc + '\nglobal.__L = LISTINGS; global.__T = TYPES; '
  + 'global.__A1CCM = A1_MAX_CCM; global.__A1HK = A1_MAX_HK; global.__A2HK = A2_MAX_HK;');
const TYPES = global.__T;
const A1_MAX_CCM = global.__A1CCM, A1_MAX_HK = global.__A1HK, A2_MAX_HK = global.__A2HK;

/* Samme cleanUrl() som build-meta.js og build-brand-pages.js: canonical uden
   ".html" (GitHub Pages løser den om), forsiden undtaget. Duplikeret med
   vilje — se build-brand-pages.js's egen note om hvorfor (scripts/shared.js
   er ikke min at røre denne runde, og reglen er tre linjer). */
function cleanUrl(file){
  return file === 'index.html' ? BASE : `${BASE}/${file.replace(/\.html$/, '')}`;
}

const dkk = n => Number(n).toLocaleString('da-DK') + ' kr.';
const tal = n => Number(n).toLocaleString('da-DK');
function tilTal(v){
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* Har annoncen en forrenderet annonce-<slug>.html? Samme regel og samme
   begrundelse som build-brand-pages.js's harEgenSide — kun egne annoncer
   har en, en indekseret er noindex og skal aldrig påstås at have en side. */
const harEgenSide = l => !l.isExternal;

const THRESHOLD = 10;

function jsonLdBlock(objs){
  return objs.filter(Boolean).map(o =>
    `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`
  ).join('\n');
}
function breadcrumbLd(items){
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, item: cleanUrl(it.path),
    })),
  };
}
function itemListLd(name, items){
  const medSide = items.filter(harEgenSide);
  if (!medSide.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: medSide.length,
    itemListElement: medSide.map((l, i) => ({
      '@type': 'ListItem', position: i + 1,
      url: `${BASE}/${listingSlug(l)}`,
      name: `${l.brand} ${l.model} ${l.year}`,
    })),
  };
}

const { header, footer, csp } = siteParts();
if (!/site-header/.test(header)) throw new Error('build-facet-pages: header mangler .site-header — build afbrudt.');

/* ---------- Facet-katalog ----------
   Type: alle 8 fra TYPES. Kørekort: kun A1 og A2 — se begrundelsen i
   filhovedet for hvorfor "A" bevidst mangler. */
const KOEREKORT_FACETS = [
  {
    id: 'A1', slug: 'koerekort-a1',
    titel: 'Kørekort A1',
    // "frase" bruges, hvor titel ville blive sat med småt midt i en sætning
    // ("Søg i alle kørekort a1" er forkert dansk — "A1" skal blive ved med
    // at være et alfanumerisk kort, ikke et ord der kan lower-cases).
    frase: 'motorcykler til A1-kørekort',
    forklaring: `Må køres på et A1-kørekort: højst ${A1_MAX_CCM} cm³ og højst ${A1_MAX_HK} hk.`,
  },
  {
    id: 'A2', slug: 'koerekort-a2',
    titel: 'Kørekort A2',
    frase: 'motorcykler til A2-kørekort',
    forklaring: `Må køres på et A2-kørekort: højst ${A2_MAX_HK} hk (eller effektbegrænset til det).`,
  },
];

function buildFacetList(){
  const typeFacets = TYPES.map(t => ({
    kind: 'type', id: t.id, slug: `type-${t.id}`, label: t.label,
    titel: `${t.label}-motorcykler`,
    match: l => l.type === t.id,
  }));
  const kkFacets = KOEREKORT_FACETS.map(k => ({
    kind: 'koerekort', id: k.id, slug: k.slug, label: k.titel,
    titel: k.titel, frase: k.frase, forklaring: k.forklaring,
    match: l => passerKoerekort(l, k.id),
  }));
  return [...typeFacets, ...kkFacets];
}

/* Den småt-skrevne udgave af facettens navn, brugt midt i en sætning
   ("Søg i alle …"). Type-labels ("cruiser-motorcykler") tåler small caps
   fint; kørekortkoder ("A2") gør ikke — de har deres egen "frase" derfor. */
function frase(facet){
  return facet.kind === 'koerekort' ? facet.frase : esc(facet.titel).toLowerCase();
}

/* Antal annoncer, der IKKE kan afgøres for denne facet, fordi et felt
   mangler — ikke fordi de reelt falder udenfor. "Vi gætter aldrig"
   (work/DECISIONS.md, "Kørekort er vores ene strukturelle fordel").
   For A1 er det ccm; for A2 er det hk (samme skel som passerKoerekort()
   selv laver: A1 kan afgøres uden hk, A2 kan ikke afgøres uden). */
function uoplystAntal(facet, alle){
  if (facet.kind !== 'koerekort') return 0;
  if (facet.id === 'A1') return alle.filter(l => !(Number(l.ccm) > 0)).length;
  if (facet.id === 'A2') return alle.filter(l => hkEllerNull(l.power) == null).length;
  return 0;
}

function introForType(facet, items){
  const priser = items.map(l => tilTal(l.price)).filter(p => p !== null && p > 0).sort((a, b) => a - b);
  const aar = items.map(l => tilTal(l.year)).filter(y => y !== null && y > 0);
  const eksterne = items.filter(l => l.isExternal);
  const kilder = [...new Set(eksterne.map(l => l.source?.navn).filter(Boolean))];
  const en = items.length === 1;

  const dele = [`Der er lige nu <strong>${items.length}</strong> ${en ? 'brugt' : 'brugte'} `
    + `${esc(facet.label)}${en ? '-motorcykel' : '-motorcykler'} til salg på Bikerbasen`];
  if (priser.length > 1 && priser[0] !== priser[priser.length - 1]){
    dele.push(` — fra ${dkk(priser[0])} til ${dkk(priser[priser.length - 1])}`);
  } else if (priser.length){
    dele.push(` — til ${dkk(priser[0])}`);
  }
  if (aar.length){
    const lav = Math.min(...aar), hoej = Math.max(...aar);
    dele.push(lav === hoej ? `, årgang ${lav}.` : `, med årgange mellem ${lav} og ${hoej}.`);
  } else if (!priser.length){
    // Kun tilføj punktum, hvis sætningen ikke allerede slutter på "kr."
    // (dkk() bærer selv punktummet) — ellers "58.400 kr..".
    dele.push('.');
  }
  if (eksterne.length && kilder.length){
    const hvem = eksterne.length === items.length
      ? (en ? 'Annoncen er' : 'Annoncerne er')
      : `${eksterne.length} af annoncerne er`;
    dele.push(` ${hvem} indekseret fra ${kilder.map(esc).join(' og ')}, og handlen sker hos kilden.`);
  }
  return dele.join('');
}

function introForKoerekort(facet, items, uoplyst){
  const priser = items.map(l => tilTal(l.price)).filter(p => p !== null && p > 0).sort((a, b) => a - b);
  const en = items.length === 1;
  const dele = [`Der er lige nu <strong>${items.length}</strong> ${en ? 'brugt motorcykel' : 'brugte motorcykler'} `
    + `til salg på Bikerbasen, der må køres på et ${esc(facet.id)}-kørekort.`];
  // dkk() slutter selv på "kr." — et ekstra punktum ville give "kr..".
  if (priser.length > 1 && priser[0] !== priser[priser.length - 1]){
    dele.push(` Priserne ligger mellem ${dkk(priser[0])} og ${dkk(priser[priser.length - 1])}`);
  } else if (priser.length){
    dele.push(` Prisen er ${dkk(priser[0])}`);
  }
  dele.push(` ${esc(facet.forklaring)}`);
  if (uoplyst){
    // Den samme ærlighed som js/home.js's hero: et manglende felt tælles
    // aldrig som et nej. Se "Hero'en siger, hvor mange vi ikke kan svare
    // for" i work/DECISIONS.md — samme regnskab, ny side.
    dele.push(` ${tal(uoplyst)} ${uoplyst === 1 ? 'annonce mangler' : 'annoncer mangler'} `
      + `${facet.id === 'A1' ? 'oplyst motorstørrelse (ccm)' : 'oplyst effekt (hk)'}, og kan derfor `
      + `hverken bekræftes eller afvises til ${esc(facet.id)} — de vises IKKE her. Vi gætter aldrig.`);
  }
  return dele.join('');
}

function noscriptLinje(l){
  const navn = [l.brand, l.model].filter(Boolean).map(esc).join(' ');
  const aar = tilTal(l.year), pris = tilTal(l.price), km = tilTal(l.km);
  const fakta = [
    aar && aar > 0 ? String(aar) : null,
    pris !== null && pris > 0 ? dkk(pris) : 'pris ved henvendelse',
    km !== null ? `${tal(km)} km` : null,
  ].filter(Boolean);
  const sted = String(l.city || '').trim();
  return `${navn}${fakta.length ? ' — ' + fakta.map(esc).join(', ') : ''}${sted ? ` (${esc(sted)})` : ''}`;
}

/* "Se {facet} efter mærke" — samme rolle som mærkesidens modelchips: kun
   mærker der FAKTISK er repræsenteret i denne facet, aldrig en kurateret
   liste der kan pege på nul træf (D-010). Linker til den kombinerede
   søgning (type+brand eller koerekort+brand stakker begge i
   js/search.js's LIST_PARAMS/state.koerekort i dag) i stedet for en
   mærke+facet-side, der ikke findes (se begrundelsen i filhovedet). */
function maerkeChips(facet, items){
  const antal = new Map();
  for (const l of items){
    const b = String(l.brand || '').trim();
    if (!b || b === 'Ukendt') continue;
    antal.set(b, (antal.get(b) || 0) + 1);
  }
  return [...antal.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'da')).slice(0, 12);
}
function facetSearchUrl(facet, extra){
  const p = new URLSearchParams();
  if (facet.kind === 'type') p.set('type', facet.id); else p.set('koerekort', facet.id);
  if (extra) p.set('brands', extra);
  return `soegning.html?${p.toString()}`;
}

function side(facet, alle){
  const items = alle.filter(facet.match).slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const qualifies = items.length >= THRESHOLD;
  const uoplyst = uoplystAntal(facet, alle);
  const fil = `${facet.slug}.html`;
  const kort = items.map((l, i) => listingCardHTML(l, i)).join('\n      ');
  const foersteFoto = (items[0] && items[0].photoUrls && items[0].photoUrls[0]) || null;

  const intro = facet.kind === 'type' ? introForType(facet, items) : introForKoerekort(facet, items, uoplyst);
  const beskrivelse = qualifies
    ? `Se ${items.length} brugte ${facet.kind === 'type' ? esc(facet.label) + '-motorcykler' : `motorcykler til ${esc(facet.id)}-kørekort`} `
      + `til salg i Danmark. Sammenlign pris, årgang, km-stand og ccm på Bikerbasen.`
    : `${items.length} ${items.length === 1 ? 'annonce' : 'annoncer'} lige nu — se hele udvalget af `
      + `brugte motorcykler på Bikerbasen i stedet.`;

  const andreTyper = TYPES.filter(t => `type-${t.id}` !== facet.slug)
    .map(t => `<a class="popular-chip" href="type-${t.id}.html">${esc(t.label)}</a>`).join('\n        ');
  const andreKk = KOEREKORT_FACETS.filter(k => k.slug !== facet.slug)
    .map(k => `<a class="popular-chip" href="${k.slug}.html">${esc(k.titel)}</a>`).join('\n        ');

  const maerker = maerkeChips(facet, items);

  return `<!doctype html>
<html lang="da">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${csp}
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>${qualifies
  ? (facet.kind === 'type' ? `Brugte ${esc(facet.titel)} til salg` : `Brugte motorcykler til ${esc(facet.id)}-kørekort`)
  : esc(facet.titel)} — Bikerbasen</title>
<meta name="description" content="${esc(beskrivelse)}">
<!-- Canonical staar HER, foer scripts/build-meta.js koerer (samme moenster
     som maerke-*.html — SEO-runde 3, builder B/facet-runde). Uden filendelse:
     GitHub Pages loeser "${facet.slug}" om til "${facet.slug}.html" af sig
     selv (efterproevet paa maerke-*.html i forrige runde). -->
<link rel="canonical" href="${cleanUrl(fil)}">
${qualifies ? '' : '<meta name="robots" content="noindex, follow">\n'}<link rel="icon" href="favicon.png?v=logo1" type="image/png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<script>try{var t=localStorage.getItem("bb_theme");if(t)document.documentElement.setAttribute("data-theme",t);}catch(e){}</script>
<link rel="preconnect" href="https://hkcjrwglwurdjnobewzb.supabase.co" crossorigin>
<link rel="preload" href="fonts/spacegrotesk.woff2?v=1" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/ibmplexsans.woff2?v=1" as="font" type="font/woff2" crossorigin>
<style>
@font-face{font-family:'Space Grotesk';font-style:normal;font-weight:500 700;font-display:swap;src:url(fonts/spacegrotesk.woff2?v=1) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:400 700;font-display:swap;src:url(fonts/ibmplexsans.woff2?v=1) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
</style>
${foersteFoto ? `<link rel="preload" as="image" href="${foersteFoto}" fetchpriority="high">
` : ''}<link rel="stylesheet" href="css/styles.css">
${jsonLdBlock([
  breadcrumbLd([
    { name: 'Forside', path: 'index.html' },
    { name: facet.kind === 'type' ? 'Type' : 'Kørekort', path: facet.kind === 'type' ? 'soegning.html' : 'soegning.html' },
    { name: facet.titel, path: fil },
  ]),
  itemListLd(`${facet.titel} — Bikerbasen`, items),
])}
</head>
<body>
${header}

<main id="main-content">
  <div class="container">
    <nav class="breadcrumb" aria-label="Brødkrumme">
      <a href="index.html">Forside</a><span class="bc-sep"></span>
      <a href="soegning.html">Søgning</a><span class="bc-sep"></span>
      <span>${esc(facet.titel)}</span>
    </nav>

    <div class="brand-hero">
      <h1>${esc(facet.titel)}</h1>
      <p class="brand-intro">${intro}</p>
      <div class="brand-actions">
        <a href="${facetSearchUrl(facet)}" class="btn btn-primary">Søg i alle ${frase(facet)}</a>
        <a href="opret-annonce.html" class="btn btn-outline">Sælg din motorcykel</a>
      </div>
    </div>

    ${maerker.length ? `<section class="section" style="padding-top:0;">
      <!-- Samme regel som maerke-*.html's modelchips: kun maerker der reelt
           er repraesenteret her, aldrig en kurateret liste (D-010). -->
      <h2 class="brand-sub">Se ${frase(facet)} efter mærke</h2>
      <div class="popular-row">
        ${maerker.map(([b]) => `<a class="popular-chip" href="${facetSearchUrl(facet, b)}">${esc(b)}</a>`).join('\n        ')}
      </div>
    </section>` : ''}

    <section class="section" style="padding-top:var(--space-6);">
      <h2 class="brand-sub">${items.length} ${items.length === 1 ? 'annonce' : 'annoncer'} lige nu</h2>
      ${items.length ? `<div class="listings-grid" id="facet-listings" data-facet-kind="${facet.kind}" data-facet-id="${esc(facet.id)}">${kort}</div>
      <noscript>
        <ul class="brand-noscript">
          ${items.map(l => `<li>${harEgenSide(l) ? `<a href="${esc(listingSlug(l))}">${noscriptLinje(l)}</a>` : noscriptLinje(l)}</li>`).join('\n          ')}
        </ul>
      </noscript>` : `<div class="empty-state" id="facet-listings" data-facet-kind="${facet.kind}" data-facet-id="${esc(facet.id)}">
        <h3>Ingen ${frase(facet)} til salg lige nu</h3>
        <p>Vi har ingen annoncer, der matcher denne kategori i øjeblikket. Adressen bliver stående —
           kig forbi igen, eller søg i hele udvalget.</p>
        <a href="soegning.html" class="btn btn-primary" style="margin-top:16px;">Søg alle motorcykler</a>
      </div>`}
    </section>

    <section class="section" style="padding-top:0;">
      <h2 class="brand-sub">Andre typer</h2>
      <div class="popular-row">
        ${andreTyper}
      </div>
    </section>

    <section class="section" style="padding-top:0;">
      <h2 class="brand-sub">Kørekortkategorier</h2>
      <div class="popular-row">
        ${andreKk}
        <a class="popular-chip" href="soegning.html">Alle motorcykler</a>
      </div>
    </section>
  </div>
</main>

${footer}

<script defer src="js/security.js"></script>
<script defer src="js/vendor/supabase.js"></script>
<script defer src="js/supabase-config.js"></script>
<script defer src="js/supabase-api.js"></script>
<script defer src="js/icons.js"></script>
<script defer src="js/bike-art.js"></script>
<script defer src="js/data.js"></script>
<script defer src="js/store.js"></script>
<script defer src="js/maaling.js"></script>
<script defer src="js/backend-bridge.js"></script>
<script defer src="js/components.js"></script>
<!-- Ingen separat js/facet.js: opgavens filliste omfatter ikke nye
     js/*.js-filer, og siden hydrerer sig selv med samme fem linjer som
     js/maerke.js bruger til maerke-*.html, bare filtreret paa type/koerekort
     i stedet for maerke. Samme moenster som maerker.html's eget indlejrede
     script (den har heller ingen separat fil). koerekortForListing/
     passerKoerekort kommer fra js/data.js, som allerede er indlaest ovenfor. -->
<script>document.addEventListener('DOMContentLoaded', async () => {
  await backendReady();
  renderHeader(null);
  document.querySelectorAll('.bc-sep').forEach(s => s.innerHTML = Icon.chevronRight);
  const mount = document.getElementById('facet-listings');
  if (!mount) return;
  const kind = mount.dataset.facetKind, id = mount.dataset.facetId;
  const alle = Store.getAllListings();
  const items = (kind === 'type' ? alle.filter(l => l.type === id) : alle.filter(l => passerKoerekort(l, id)))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (!items.length){
    mount.className = 'empty-state';
    mount.innerHTML = '<h3>Ingen til salg lige nu</h3>'
      + '<p>Vi har ingen annoncer, der matcher denne kategori i øjeblikket. Adressen bliver stående — kig forbi igen, eller søg i hele udvalget.</p>'
      + '<a href="soegning.html" class="btn btn-primary" style="margin-top:16px;">Søg alle motorcykler</a>';
    return;
  }
  mount.className = 'listings-grid';
  mount.innerHTML = items.map(listingCardHTML).join('');
  wireFavoriteButtons(mount);
});</script>
</body>
</html>
`;
}

/* ---------- Interne links til de indekserbare facet-sider ----------
   RETTELSE (efterprøvet af en uafhængig kritiker): de 10 facet-siderne
   ovenfor er ægte, bygger deterministisk og lukker et reelt SEO-hul — men
   var orphan pages. Intet på sitet linkede til dem, kun sitemap.xml, hvilket
   underminerede hele formålet: en side, kun en crawler kan finde, konkurrerer
   aldrig i praksis mod soegning.html?type=, som brugerne rent faktisk lander
   på via filterpanelet.

   Løsningen skal, som mærkeindekset (build-brand-pages.js) allerede gør for
   maerke-*.html, afspejle DE SAMME tal som selve tærsklen (THRESHOLD) —
   aldrig en fastfrosset liste, der driver fra virkeligheden, den dag lageret
   ændrer sig. `resultater` (fra byg() herunder) ER de tal: `qualifies` er
   nøjagtig den samme boolean, som afgør om siden selv er noindex. Kun de
   facetter, der er sande her, får et link — samme regel som D-010
   (maerkerUdenLager i build-brand-pages.js): et link er en påstand om, at
   der er noget for enden af det. */
/* "variant" skifter KUN overskrifterne, aldrig hvilke facetter der vises —
   index.html har allerede en h2 "Søg efter type" (kategoriflisernes egen
   sektion, længere oppe på siden, linker til soegning.html?type=X). Samme
   ordlyd to gange på én side er en ægte dublet, ikke kun pynt — retter det
   her i stedet for at undlade indexforsidens sektion, fordi forsiden er den
   mest trafikerede side på sitet og derfor det vigtigste sted at linke fra. */
function facetLinksBlock(resultater, variant){
  const typer = resultater.filter(r => r.qualifies && r.facet.kind === 'type');
  const koerekort = resultater.filter(r => r.qualifies && r.facet.kind === 'koerekort');
  if (!typer.length && !koerekort.length) return '';

  const tekst = variant === 'index'
    ? {
        typeH2: 'Se hele udvalget efter type', typeP: 'Priser, årgange og hvad du skal tjekke — for hver type for sig, ikke kun et filter.',
        kkH2: 'Se hele udvalget efter kørekort', kkP: 'Faste sider med kun de motorcykler, du faktisk må køre.',
      }
    : {
        typeH2: 'Søg efter type', typeP: 'Faste sider med det aktuelle udvalg, prisniveau og hvad du skal tjekke — ikke kun et filter.',
        kkH2: 'Søg efter kørekort', kkP: 'Se kun de motorcykler, du faktisk må køre på dit kørekort.',
      };

  const chip = r => `<a class="popular-chip" href="${r.facet.slug}.html">${esc(r.facet.titel)}</a>`;

  const dele = [];
  if (typer.length){
    dele.push(`<section class="section" style="padding-top:0;">
      <div class="section-head"><div>
        <h2>${tekst.typeH2}</h2>
        <p>${tekst.typeP}</p>
      </div></div>
      <div class="popular-row">
        ${typer.map(chip).join('\n        ')}
      </div>
    </section>`);
  }
  if (koerekort.length){
    dele.push(`<section class="section" style="padding-top:0;">
      <div class="section-head"><div>
        <h2>${tekst.kkH2}</h2>
        <p>${tekst.kkP}</p>
      </div></div>
      <div class="popular-row">
        ${koerekort.map(chip).join('\n        ')}
      </div>
    </section>`);
  }
  return dele.join('\n\n  ');
}

function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

const FACET_LINKS_START = '<!-- facet-links:start (genereret af scripts/build-facet-pages.js, funktionen skrivFacetLinks) -->';
const FACET_LINKS_END = '<!-- facet-links:end -->';

/* Skriver blokken ind mellem de faste markører i soegning.html og
   index.html — samme mønster som build-meta.js's meta:start/meta:end:
   kilden (markørerne) ligger i selve HTML-filen, så et nyt byg altid
   ERSTATTER blokken i stedet for at hobe kopier op. Markørerne skal findes i
   forvejen (de står i begge filer, tilføjet sammen med denne funktion) —
   findes de ikke, er byggekæden eller filerne kommet ud af sync, og build
   afbrydes hellere end at gætte, hvor blokken skulle stå. */
function skrivFacetLinks(resultater){
  const re = new RegExp(`${escapeRegExp(FACET_LINKS_START)}[\\s\\S]*?${escapeRegExp(FACET_LINKS_END)}`);
  let skrevet = 0;
  for (const file of ['soegning.html', 'index.html']){
    const variant = file === 'index.html' ? 'index' : 'soegning';
    const block = facetLinksBlock(resultater, variant);
    const full = path.join(ROOT, file);
    let html = fs.readFileSync(full, 'utf8');
    if (!re.test(html)){
      throw new Error(`build-facet-pages: fandt ikke facet-links-markørerne i ${file} — `
        + 'kan ikke skrive linksektionen. Markørerne skal stå i selve filen (samme mønster som meta:start/meta:end).');
    }
    const nyBlok = block
      ? `${FACET_LINKS_START}\n  ${block}\n  ${FACET_LINKS_END}`
      : `${FACET_LINKS_START}\n  ${FACET_LINKS_END}`;
    html = html.replace(re, nyBlok);
    fs.writeFileSync(full, html, 'utf8');
    skrevet++;
  }
  const antalTyper = resultater.filter(r => r.qualifies && r.facet.kind === 'type').length;
  const antalKk = resultater.filter(r => r.qualifies && r.facet.kind === 'koerekort').length;
  console.log(`Skrev facet-linksektion ind i ${skrevet} filer (soegning.html, index.html): `
    + `${antalTyper} type-links, ${antalKk} kørekort-links (kun de indekserbare, >= tærsklen på ${THRESHOLD}).`);
}

function byg(){
  const alle = global.ALLE_LISTINGS;
  const facets = buildFacetList();
  const resultater = [];
  for (const facet of facets){
    const items = alle.filter(facet.match);
    const qualifies = items.length >= THRESHOLD;
    fs.writeFileSync(path.join(ROOT, `${facet.slug}.html`), side(facet, alle), 'utf8');
    resultater.push({ facet, antal: items.length, qualifies });
  }

  console.log(`Byggede ${resultater.length} facet-sider (${resultater.filter(r => r.qualifies).length} indekserbare, `
    + `${resultater.filter(r => !r.qualifies).length} noindex under tærsklen på ${THRESHOLD}).`);
  console.log('Facet-oversigt (den, en person skal kunne se uden at læse kode):');
  for (const r of resultater){
    console.log(`  ${r.qualifies ? '[INDEX] ' : '[noindex]'} ${r.facet.slug}.html — ${r.antal} annoncer`
      + (r.qualifies ? '' : ` (under tærsklen på ${THRESHOLD} — se filhovedets begrundelse)`));
  }
  console.log(`  ["A" (kørekort) er MED VILJE ikke bygget — passerKoerekort(l,'A') er altid sand, `
    + `så siden ville være en dublet af soegning.html med ${alle.length} annoncer. Se filhovedet.]`);

  return resultater;
}

/* ---------- sitemap.xml: udvid den, build-brand-pages.js allerede skrev ----------
   build-facet-pages.js kører EFTER build-brand-pages.js (scripts/build.js),
   så sitemap.xml findes allerede med forsiden, mærkesiderne og annoncerne.
   Kun de INDEKSERBARE facet-sider (qualifies === true) tilføjes — en
   noindex-side i sitemappet er et modsat signal (samme regel som
   build-brand-pages.js allerede bruger på login.html). Fejler filen ikke at
   findes, er byggekædens rækkefølge brudt — smid en tydelig fejl frem for at
   skrive et sitemap uden facet-siderne. */
function udvidSitemap(resultater){
  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)){
    throw new Error('build-facet-pages: sitemap.xml findes ikke. Denne fil skal køre EFTER '
      + 'build-brand-pages.js (som skriver sitemap.xml) — tjek rækkefølgen i scripts/build.js.');
  }
  let xml = fs.readFileSync(sitemapPath, 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  const nye = resultater.filter(r => r.qualifies)
    .map(r => `  <url><loc>${cleanUrl(`${r.facet.slug}.html`)}</loc><lastmod>${today}</lastmod></url>`);
  if (!/<\/urlset>/.test(xml)){
    throw new Error('build-facet-pages: sitemap.xml har ikke </urlset> — kan ikke udvide den sikkert.');
  }
  xml = xml.replace('</urlset>', nye.join('\n') + '\n</urlset>\n');
  fs.writeFileSync(sitemapPath, xml, 'utf8');
  console.log(`Tilføjede ${nye.length} facet-URL'er til sitemap.xml (de øvrige ${resultater.length - nye.length} `
    + 'er noindex og bevidst udeladt).');
}

/* ---------- Data: samme hentning + sammenlægning som build-brand-pages.js ----------
   Duplikeret med vilje (samme begrundelse: scripts/shared.js røres ikke
   denne runde). Rækkefølgen (egne foerst, saa eksterne, begge nyeste-foerst)
   er den samme js/store.js bruger, saa siden ikke omrokerer naar
   klientscriptet overtager. */
async function hentAlt(){
  const egne = (await fetchListings(global.__L)).map(normalizeRemoteListing);
  const eksterne = (await fetchExternalListings()).map(normalizeExternalListing);
  if (!egne.length && !eksterne.length){
    throw new Error('build-facet-pages: nul annoncer i alt. Build afbrudt — se samme vagt i '
      + 'build-brand-pages.js (findingen C-014).');
  }
  return [...egne, ...eksterne].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

if (require.main === module){
  (async () => {
    global.ALLE_LISTINGS = await hentAlt();
    const resultater = byg();
    skrivFacetLinks(resultater);
    udvidSitemap(resultater);
  })().catch(e => { console.error(e.message); process.exit(1); });
}

module.exports = { THRESHOLD, buildFacetList, uoplystAntal, cleanUrl, facetLinksBlock };
