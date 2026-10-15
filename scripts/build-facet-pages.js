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

   HVORFOR "A" IKKE FÅR EN SIDE (OPDATERET 15.10.2026: den fik en, men IKKE som "alt")
   ---------------------------------------------------------------------------------
   koerekort-a.html findes nu, men den viser kun de annoncer, hvis oplyste effekt
   er over A2-graensen (kraeverA()), saa den er ikke en dublet af soegning.html.
   Den oprindelige begrundelse herunder gaelder stadig for "alt":
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
const { listingCardHTML, normalizeRemoteListing, normalizeExternalListing, markerTvaerkildeDubletter, Sortering } = browserModules();
const BASE = siteUrl();
const { KILDE_URL, KK_FAKTA, KK_BOKSE, TYPE_VIDEN, REGION_VIDEN, GUIDE, EGNE_IKONER } = require('./facet-indhold');
// js/icons.js er en ren const-erklaering uden DOM-afhaengighed i toppen — samme
// eval-moenster som js/data.js ovenfor, bare via new Function.
const IkonKilde = new Function(fs.readFileSync(path.join(ROOT, 'js/icons.js'), 'utf8') + ';return Icon;')();

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
eval(dataSrc + '\nglobal.__L = LISTINGS; global.__T = TYPES; global.__R = REGIONS; '
  + 'global.__A1CCM = A1_MAX_CCM; global.__A1HK = A1_MAX_HK; global.__A2HK = A2_MAX_HK;');
const TYPES = global.__T;
const REGIONS = global.__R;
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

/* KORTLOFT — runde 11 (R11-F-5). Mærkesiderne har cappet til 24 siden runde 7;
   facetsiderne bagte ALT. Målt: region-midtjylland 522 KB / 12.885 tags /
   88.482 px høj på mobil, type-cruiser 49.515 px. Ingen køber scroller
   88.000 px, Lighthouse klager over DOM-størrelsen, og hver crawl henter en
   halv megabyte. Samme kontrakt som mærkesiden: de første 24 + et link til
   søgningen, hvor resten ligger. noscript-listen beholder ALLE — den er ren
   tekst og koster ingenting, og så er lageret stadig synligt uden JS. */
const FACET_KORT = 24;

/* Er annoncens tal til at stole på? Runde 11 (R11-F-9): mærkesiden ankrede
   "fra 4.000 kr." i en outlier, og regionssiden skrev "årgange mellem 1955 og
   2027". Vi RETTER ikke kildens tal og skjuler ikke annoncen — men et tal, der
   ikke kan passe, må ikke blive til sidens overskrift. Kun aggregaterne
   (min/max/spænd) renses; kortene viser, hvad kilden skrev. */
const I_AAR = 2026;
const troværdigtAar = y => y != null && y >= 1900 && y <= I_AAR + 1;
function aggregatPriser(items){
  return items.map(l => tilTal(l.price)).filter(p => p !== null && p > 0).sort((a, b) => a - b);
}

/* Substans først (R11-F-11, og blinddommerens ene råd til taberen): den rå
   createdAt-sortering lagde fotoløse kort uden km øverst på en vareside.
   Vi opdigter intet — vi viser bare det bedst oplyste først, og inden for
   samme oplysningsgrad det nyeste. */
/* RUNDE 15 (efter menneskets beslutning): HER STOD facetsidernes EGEN
   sortering — en lokal substansScore (foto 4, km 2, pris 2, hk 1) og derefter
   dato. Den var ikke forkert, men den var vores ANDEN sorteringsregel, og den
   manglede det, den foerste allerede kunne.

   Runde 15's blinde dommer: "de foerste seks kort er alle fotograferet foran
   samme graa rulleport med samme store groenne logo tvaers over billedet. Det
   ER rigtige, forskellige motorcykler, men ved en hurtig scroll paa telefon
   ligner det den samme annonce seks gange — og det faar en ellers
   trovaerdig liste til at ligne autogenereret fyld."

   Praecis det problem loeste D6-S4 for soegesiden og maerkesiderne med
   Sortering 'blandet': KILDE-RUNDGANG inden for hver oplysthedsklasse. Ingen
   daarligere oplyst annonce kommer foran en bedre oplyst, fordi den er fra en
   anden kilde — der skiftes kun mellem kilderne blandt ligemaend, hvor
   tie-breakeren foer var id/dato. Rangeringen er altsaa uaendret; det er kun
   raekkefoelgen blandt lige gode, der nu spreder kilderne.

   Facetsiderne bruger den samme funktion som soegesiden og maerkesiderne —
   ikke en kopi. Saa kan de tre ikke skride fra hinanden, og js/sortering.test.js
   vogter dem alle tre paa én gang. */
function sorterSubstans(items){
  return Sortering.sorter(items.slice(), 'blandet');
}

/* "Brugte" var hardcodet i titel, meta og intro — på type-cruiser bar 32 af
   91 kort "Ny"-mærkat, og modelsiden skrev "Brugte Honda CMX 500 Rebel" over
   en tekst, der selv sagde "12 af dem sælges som nye". Mærkesiden har længe
   haft den rigtige regel (D7-M1); den flyttes hertil. */
const erNyVare = l => l.condition === 'ny' || l.kildeStand === 'ny';
function brugtOrd(items, ental, flertal){
  const nye = items.filter(erNyVare).length;
  const en = items.length === 1;
  if (!nye) return `brugt${en ? ` ${ental}` : `e ${flertal}`}`;
  if (nye === items.length) return `fabriksny${en ? ` ${ental}` : `e ${flertal}`}`;
  return en ? ental : flertal;   // blandet lager: intet adjektiv, tallene står i introen
}

/* Kommaliste med ét afsluttende "og" (R11-F-13) — brand-generatorens
   listeJoin(). Uden den blev kildelinjen "MC Syd og Jensens Motorcykler og
   Gul og Gratis og Rydbergs MC": tre "og" i træk, hvoraf det ene hører til
   et kildenavn. */
function listeJoin(dele){
  if (dele.length <= 1) return dele.join('');
  return `${dele.slice(0, -1).join(', ')} og ${dele[dele.length - 1]}`;
}

/* Største sidst_set = hvornår lageret sidst er bekræftet hos kilderne.
   Mærkesiden har vist datoen siden D9-M2; facetsiderne sagde intet om
   friskhed overhovedet (R11-F-10). */
function senestBekraeftet(items){
  const datoer = items.map(l => l.sidstSet || l.sidst_set).filter(Boolean).sort();
  if (!datoer.length) return null;
  const d = new Date(datoer[datoer.length - 1]);
  return Number.isFinite(d.getTime())
    ? d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
}

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
    // "Må køres på et A1-kørekort" var et løfte, filteret ikke kan holde:
    // A1 kræver også højst 0,1 kW pr. kg, og vægten står ikke i annoncerne
    // (js/data.js, "vi kan aldrig love at en mc ER A2" — samme regel for A1).
    // Sig grænserne og hullet, ikke konklusionen.
    forklaring: `A1-grænsen er højst ${A1_MAX_CCM} cm³ og højst ${A1_MAX_HK} hk (11 kW). A1 kræver også højst 0,1 kW pr. kg — vægten står ikke i annoncerne, så tjek altid registreringsattesten.`,
  },
  {
    id: 'A2', slug: 'koerekort-a2',
    titel: 'Kørekort A2',
    frase: 'motorcykler til A2-kørekort',
    // Samme rettelse som A1 ovenfor: grænser og hul, ikke "må køres".
    // A2's to ekstra krav (kW/kg og afledningsreglen) står i js/data.js ~852.
    forklaring: `Et A2-kørekort dækker også A1-motorcykler, så dem finder du her sammen med A2-maskinerne. A2-grænsen er maks. 35 kW (${A2_MAX_HK} hk), også for maskiner effektbegrænset til det. A2 kræver desuden højst 0,2 kW pr. kg, og at maskinen ikke er afledt af en model med over dobbelt effekt — det står ikke i annoncerne, så tjek altid registreringsattesten.`,
  },
];

/* KATEGORI A (gauntlet/facet, 15.10.2026): "A" fik ingen side, fordi
   passerKoerekort(l,'A') er sand for alt og siden ville vaere en dublet af
   soegning.html. Siden her er IKKE den dublet: den viser kun de annoncer, hvis
   OPLYSTE effekt ligger over A2-graensen (og som ikke kan nedsaettes til A2) —
   dem, der kraever A. Annoncer uden oplyst effekt kan hverken bekraeftes eller
   afvises og er ikke med ("vi gaetter aldrig"). Soegekortets hkMin-parameter
   goer, at "Soeg"-knappen giver samme udsnit. */
const kraeverA = l => { const hk = hkEllerNull(l.power); return hk != null && hk > A2_MAX_HK && !l.kanNedsaettesA2; };
KOEREKORT_FACETS.push({
  id: 'A', slug: 'koerekort-a',
  titel: 'Kørekort A',
  frase: 'motorcykler til A-kørekort',
  forklaring: `Kategori A har ingen effektgrænse og dækker alle motorcykler. Her står de annoncer, hvis oplyste effekt ligger over A2-grænsen på 35 kW (${A2_MAX_HK} hk) — dem kræver kategori A. Almindelig mindstealder er 24 år, eller 22 år efter mindst 2 års erfaring på A2 og en praktisk prøve.`,
  match: kraeverA,
});

/* ---------- D1 (23.08.2026): landsdele og modeller ----------
   To facetter mere paa samme maskine, samme taerskel, samme noindex-regel.

   LANDSDELE: de fem fra REGIONS i js/data.js — altid alle fem bygget, som
   typerne (en adresse, der har vaeret indekseret, maa aldrig blive 404; under
   taersklen bliver den noindex). Region udledes af postnummeret (regionFraPostnr
   i js/backend-bridge.js), saa en annonce uden postnummer taeller ikke med, og
   siden siger det.

   MODELLER: (maerke, model) med mindst THRESHOLD annoncer. Her bygges IKKE en
   side pr. kombination "for en sikkerheds skyld" — det ville vaere praecis den
   skov af tomme noindex-sider, D-010 handler om (ca. 300 kombinationer i
   dag). I stedet: kun dem, der kvalificerer NU, plus dem, der allerede
   findes som model-*.html paa disken (committet fra et tidligere build). En
   model, der falder under taersklen, bliver saa noindex i stedet for 404;
   forsvinder den helt, staar den tomme side med "ingen lige nu". Filerne
   er i git, saa CI's friske checkout ser dem ogsaa.

   Modelnoeglen er maerke + model praecis som kortet viser dem (samme
   felter, som js/filtrering.js matcher `?model=` paa), trimmet og med
   dobbelte mellemrum slaaet sammen — ingen anden normalisering, for saa
   ville siden og soegningen kunne vaere uenige om, hvad der er "samme
   model". Slug: model-<maerke>-<model>. */
function modelNoegle(l){
  const b = String(l.brand || '').trim().replace(/\s+/g, ' ');
  const m = String(l.model || '').trim().replace(/\s+/g, ' ');
  if (!b || b === 'Ukendt' || !m) return null;
  return `${b}\u0000${m}`;
}
const slugify = s => String(s).toLowerCase()
  .replace(/ø/g, 'oe').replace(/æ/g, 'ae').replace(/å/g, 'aa')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function modelSlug(brand, model){ return `model-${slugify(brand)}-${slugify(model)}`; }
/* Eksisterende model-sider paa disken: { slug -> { brand, model } } laest ud
   af sidens egne data-attributter, saa noeglen er den samme som ved bygning. */
function eksisterendeModelSider(){
  const ud = new Map();
  for (const f of fs.readdirSync(ROOT)){
    if (!/^model-.*\.html$/.test(f)) continue;
    const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const b = (html.match(/data-facet-brand="([^"]*)"/) || [])[1];
    const m = (html.match(/data-facet-model="([^"]*)"/) || [])[1];
    if (b && m) ud.set(f.replace(/\.html$/, ''), { brand: afEsc(b), model: afEsc(m) });
  }
  return ud;
}
function afEsc(s){
  return String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
function modelFacets(alle){
  const antal = new Map(), navne = new Map();
  for (const l of alle){
    const k = modelNoegle(l);
    if (!k) continue;
    antal.set(k, (antal.get(k) || 0) + 1);
    if (!navne.has(k)){ const [brand, model] = k.split('\u0000'); navne.set(k, { brand, model }); }
  }
  const valgte = new Map(); // slug -> { brand, model }
  for (const [k, n] of antal) if (n >= THRESHOLD){ const { brand, model } = navne.get(k); valgte.set(modelSlug(brand, model), { brand, model }); }
  for (const [slug, bm] of eksisterendeModelSider()) if (!valgte.has(slug)) valgte.set(slug, bm);
  return [...valgte.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([slug, { brand, model }]) => ({
    kind: 'model', id: `${brand} ${model}`, slug, label: `${brand} ${model}`, brand, model,
    titel: `${brand} ${model}`,
    match: l => modelNoegle(l) === `${brand}\u0000${model}`,
  }));
}

function buildFacetList(alle){
  const typeFacets = TYPES.map(t => ({
    kind: 'type', id: t.id, slug: `type-${t.id}`, label: t.label,
    titel: `${t.label}-motorcykler`,
    match: l => l.type === t.id,
  }));
  const kkFacets = KOEREKORT_FACETS.map(k => ({
    kind: 'koerekort', id: k.id, slug: k.slug, label: k.titel,
    titel: k.titel, frase: k.frase, forklaring: k.forklaring,
    match: k.match || (l => passerKoerekort(l, k.id)),
  }));
  const regionFacets = REGIONS.map(r => ({
    kind: 'region', id: r, slug: `region-${slugify(r)}`, label: r,
    titel: `Motorcykler til salg i ${r}`,
    match: l => l.region === r,
  }));
  return [...typeFacets, ...kkFacets, ...regionFacets, ...modelFacets(alle || global.ALLE_LISTINGS || [])];
}

/* Den småt-skrevne udgave af facettens navn, brugt midt i en sætning
   ("Søg i alle …"). Type-labels ("cruiser-motorcykler") tåler small caps
   fint; kørekortkoder ("A2") gør ikke — de har deres egen "frase" derfor. */
function frase(facet){
  if (facet.kind === 'koerekort') return facet.frase;
  if (facet.kind === 'region') return `motorcykler i ${esc(facet.id)}`;
  if (facet.kind === 'model') return esc(facet.titel); // et modelnavn lower-cases ikke ("CB 1000 Hornet")
  return esc(facet.titel).toLowerCase();
}

/* Antal annoncer, der IKKE kan afgøres for denne facet, fordi et felt
   mangler — ikke fordi de reelt falder udenfor. "Vi gætter aldrig"
   (work/DECISIONS.md, "Kørekort er vores ene strukturelle fordel").
   Samme skel som passerKoerekort() selv laver: A1 kræver BÅDE kendt
   ccm ≤ 125 OG kendt hk ≤ 15 (js/data.js, "en lille slagvolumen er ingen
   garanti for lav effekt"), så en annonce er kun AFGJORT, når den enten
   er bekræftet på begge felter eller udelukket på ét af dem. Her stod
   tidligere kun "mangler ccm" for A1 — en kendt lille motor med ukendt
   effekt blev altså filtreret fra uden at indgå i regnskabet, og siden
   påstod at have gjort regnskabet op. For A2 tæller et manglende hk kun
   som uafgjort, hvis sælgers drosselflag ikke allerede har svaret ja. */
function uoplystAntal(facet, alle){
  if (facet.kind !== 'koerekort') return 0;
  if (facet.id === 'A1'){
    return alle.filter(l => {
      const ccm = Number(l.ccm) || 0, hk = hkEllerNull(l.power);
      if (ccm > A1_MAX_CCM) return false;             // afgjort: udelukket på ccm
      if (hk != null && hk > A1_MAX_HK) return false; // afgjort: udelukket på hk
      return !(ccm > 0 && hk != null);                // resten er uafgjort, hvis et felt mangler
    }).length;
  }
  if (facet.id === 'A2' || facet.id === 'A') return alle.filter(l => hkEllerNull(l.power) == null && !l.kanNedsaettesA2).length;
  return 0;
}

/* Del introen i "det, der staar", og "det, der ligger bag folden" — samme
   greb som maerkesiderne har haft siden runde 7 (D7-M3), og som runde 11's
   kritiker bad om for koerekortsiderne: "Behold hvert forbehold, men
   omstrukturer: én kort lead-saetning + foldbar boks."

   Delingen sker ved foerste punktum efterfulgt af et NYT saetningsbegyndende
   tegn (stort bogstav eller ciffer). Den naive /\.\s/ ville dele midt i
   "fra 4.000 kr. til 107.999 kr." og efterlade prisspaendet halvt — dansk
   skriver "kr." med punktum midt i saetningen. Smaat bogstav efter punktum
   betyder derfor: samme saetning, del ikke her. */
function delIntro(html){
  const m = /\.\s+(?=[A-ZÆØÅ0-9])/.exec(html);
  if (!m) return { foerste: html, rest: '' };
  return { foerste: html.slice(0, m.index + 1), rest: html.slice(m.index + m[0].length).trim() };
}

function introForType(facet, items){
  const priser = aggregatPriser(items);
  const aar = items.map(l => tilTal(l.year)).filter(troværdigtAar);
  const eksterne = items.filter(l => l.isExternal);
  const kilder = [...new Set(eksterne.map(l => l.source?.navn).filter(Boolean))];
  const en = items.length === 1;
  const nye = items.filter(erNyVare).length;

  /* "brugte" stod fast i skabelonen, mens 32 af 91 kort bar "Ny" (R11-F-2),
     og "til salg PÅ Bikerbasen" var den påstand, D8-M4 selv fjernede fra
     mærkesiderne: annoncerne er til salg hos kilderne — vi indekserer dem. */
  const dele = [`Der er <strong id="facet-intro-antal">${items.length}</strong> `
    + `${brugtOrd(items, `${esc(facet.label)}-motorcykel`, `${esc(facet.label)}-motorcykler`)}`
    + ` til salg hos danske forhandlere og markedspladser, indekseret på Bikerbasen`];
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
  if (nye && nye !== items.length){
    dele.push(` ${nye} af dem sælges som ${nye === 1 ? 'ny' : 'nye'}.`);
  }
  if (eksterne.length && kilder.length){
    const hvem = eksterne.length === items.length
      ? (en ? 'Annoncen er' : 'Annoncerne er')
      : `${eksterne.length} af annoncerne er`;
    dele.push(` ${hvem} indekseret fra ${listeJoin(kilder.map(esc))}, og handlen sker hos kilden.`);
  }
  return dele.join('');
}

/* Prisspaend, aargange, kilder — samme skabelon som typerne. Kun tal, der
   kan taelles efter paa siden; "vi gaetter aldrig". */
function prisOgAargang(items){
  const priser = aggregatPriser(items);
  // Aargangsspaendet ankres ikke i et modelaar, der ikke findes endnu
  // (R11-F-9: "aargange mellem 1955 og 2027" paa en side dateret 2026).
  const aar = items.map(l => tilTal(l.year)).filter(troværdigtAar);
  const dele = [];
  if (priser.length > 1 && priser[0] !== priser[priser.length - 1]) dele.push(` — fra ${dkk(priser[0])} til ${dkk(priser[priser.length - 1])}`);
  else if (priser.length) dele.push(` — til ${dkk(priser[0])}`);
  if (aar.length){ const lav = Math.min(...aar), hoej = Math.max(...aar); dele.push(lav === hoej ? `, årgang ${lav}.` : `, med årgange mellem ${lav} og ${hoej}.`); }
  else if (!priser.length) dele.push('.');
  return { tekst: dele.join(''), priser, aar };
}
function kildeSaetning(items){
  const eksterne = items.filter(l => l.isExternal);
  const kilder = [...new Set(eksterne.map(l => l.source?.navn).filter(Boolean))];
  if (!eksterne.length || !kilder.length) return '';
  const en = items.length === 1;
  const hvem = eksterne.length === items.length ? (en ? 'Annoncen er' : 'Annoncerne er') : `${eksterne.length} af annoncerne er`;
  return ` ${hvem} indekseret fra ${listeJoin(kilder.map(esc))}, og handlen sker hos kilden.`;
}
function introForRegion(facet, items, alle){
  const en = items.length === 1;
  const udenRegion = alle.filter(l => !l.region).length;
  const byer = new Map();
  for (const l of items){ const b = String(l.city || '').trim(); if (b) byer.set(b, (byer.get(b) || 0) + 1); }
  const top = [...byer.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const { tekst } = prisOgAargang(items);
  let s = `Der er <strong id="facet-intro-antal">${items.length}</strong> ${en ? 'motorcykel' : 'motorcykler'} til salg i ${esc(facet.id)}, indekseret på Bikerbasen${tekst}`;
  if (top.length){
    // Aerligt om fordelingen: 96 % af Syddanmark er én by (Roedding, MC Syd).
    // Det skal staa, ellers lover overskriften en landsdel og leverer én gade.
    const spredt = top[0][1] === 1; // ingen by har mere end én — "flest" ville lyve
    s += ` ${top.length === 1 ? 'Alle står i' : spredt ? 'De står bl.a. i' : 'Flest står i'} ${top.map(([b, n]) => spredt ? esc(b) : `${esc(b)} (${n})`).join(', ')}.`;
  }
  s += kildeSaetning(items);
  if (udenRegion) s += ` ${udenRegion} ${udenRegion === 1 ? 'annonce' : 'annoncer'} i hele lageret har intet postnummer og kan ikke placeres i en landsdel.`;
  return s;
}
function introForModel(facet, items){
  const en = items.length === 1;
  const { tekst } = prisOgAargang(items);
  const km = items.map(l => tilTal(l.km)).filter(k => k !== null && k >= 0).sort((a, b) => a - b);
  let s = `Der er <strong id="facet-intro-antal">${items.length}</strong> ${esc(facet.brand)} ${esc(facet.model)} til salg hos danske forhandlere og markedspladser, indekseret på Bikerbasen${tekst}`;
  if (km.length > 1 && km[0] !== km[km.length - 1]) s += ` Kilometertal fra ${tal(km[0])} til ${tal(km[km.length - 1])} km${km.length < items.length ? ` (${items.length - km.length} uden oplyst km)` : ''}.`;
  const nye = items.filter(l => l.condition === 'ny' || l.kildeStand === 'ny').length;
  if (nye) s += ` ${nye === items.length ? (en ? 'Den' : 'Alle') : nye} ${nye === items.length ? 'sælges som ny' : `af dem sælges som nye`}.`;
  s += kildeSaetning(items);
  return s;
}
/* FAQ med de tal, siden selv viser — en "prisguide", der er sand, fordi den
   er talt og ikke skoennet. Kun paa sider, der kvalificerer. */
function faqLdForModel(facet, items){
  const { priser } = prisOgAargang(items);
  const qa = [];
  if (priser.length >= 3){
    qa.push({ q: `Hvad koster en brugt ${facet.brand} ${facet.model}?`,
      // "N til salg" om KUN dem med pris var forkert (R11-I-7): de øvrige er
      // også til salg, de oplyser bare ikke prisen. Og dkk() slutter selv på
      // "kr." — et punktum mere gav "kr..".
      a: `${priser.length} af de ${items.length} ${facet.brand} ${facet.model}, vi har indekseret, oplyser en pris: fra ${dkk(priser[0])} til ${dkk(priser[priser.length - 1])} Prisen afhænger af årgang, kilometertal og stand — tallene opdateres, hver gang lageret indekseres.` });
  }
  const kk = [...new Set(items.map(l => koerekortForListing(l)).filter(Boolean))];
  if (kk.length === 1){
    qa.push({ q: `Hvilket kørekort kræver en ${facet.brand} ${facet.model}?`,
      a: `De ${items.length} annoncer, vi har, ligger alle inden for grænserne for kørekort ${kk[0]} ud fra den oplyste effekt og slagvolumen. Kørekortsreglerne stiller også krav, der ikke står i annoncerne — tjek altid registreringsattesten på den konkrete motorcykel.` });
  }
  if (!qa.length) return null;
  return { '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: qa.map(x => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) };
}

function introForKoerekort(facet, items, uoplyst){
  const priser = items.map(l => tilTal(l.price)).filter(p => p !== null && p > 0).sort((a, b) => a - b);
  const en = items.length === 1;
  /* "der må køres på et A2-kørekort" var den samme påstand, forsidens hero
     mistede 25.08.2026: filteret kender kun effekt og ccm (og sælgers eget
     drosselflag), men A1/A2 kræver også kW/kg — og A2 afledningsreglen.
     "Ikke udelukket ... ud fra det, annoncerne oplyser" er det, filteret
     faktisk kan stå inde for (js/data.js: "vi kan aldrig love at en mc ER
     A2 — kun at den ikke er udelukket på effekt"). */
  const dele = [`Der er <strong id="facet-intro-antal">${items.length}</strong> ${brugtOrd(items, 'motorcykel', 'motorcykler')} `
    + (facet.id === 'A' ? 'indekseret på Bikerbasen, hvis oplyste effekt ligger over A2-grænsen, så de kræver kørekort A.' : `indekseret på Bikerbasen, der ikke er udelukket til et ${esc(facet.id)}-kørekort ud fra det, annoncerne oplyser.`)];
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
      + `${facet.id === 'A1' ? 'oplyst motorstørrelse (ccm) eller effekt (hk)' : 'oplyst effekt (hk)'}, og kan derfor `
      + (facet.id === 'A' ? 'hverken bekræftes eller afvises som A-motorcykler — de vises IKKE her. Vi gætter aldrig.' : `hverken bekræftes eller afvises til ${esc(facet.id)} — de vises IKKE her. Vi gætter aldrig.`));
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
  if (facet.kind === 'type') p.set('type', facet.id);
  else if (facet.kind === 'region') p.set('regions', facet.id);
  else if (facet.kind === 'model'){ p.set('brands', facet.brand); p.set('model', facet.model); }
  else { p.set('koerekort', facet.id); if (facet.id === 'A') p.set('hkMin', String(A2_MAX_HK + 1)); }
  if (extra) p.set('brands', extra);
  return `soegning.html?${p.toString()}`;
}

/* RUNDE 12 (R12-D-13 + R11-KK-6): facetsiderne havde NUL vaerktoejer — ingen
   sortering, intet prisfilter, 24 ens kort i én ubrudt kolonne. To kritikere
   fandt det uafhaengigt.

   Designkritikeren foreslog Bilbasens greb: moerke forhandlerbannere spredt ud
   over kolonnen som rytmebryder. Det goer vi IKKE. Bilbasens bannere er BETALT
   placering; kopierer vi det visuelle uden det kommercielle, antyder kortet et
   forhold, der ikke findes — og alle 602 annoncer er indekseret paa lige vilkaar.
   Monotonien loeses med kontrol, ikke med dekoration.

   Samme fold, samme link-sortering som maerkesiderne (ingen inline-JS af hensyn
   til CSP, og en crawler kan foelge dem). Prisspring vises kun, naar de faktisk
   deler lageret — et filter, der rammer alt eller intet, er stoej. */
function facetVaerktoejer(facet, items){
  const base = facetSearchUrl(facet);
  const q = ekstra => `${base}&amp;${ekstra}`;
  const raekker = [];

  const priser = items.map(l => tilTal(l.price)).filter(p => p !== null && p > 0);
  const pris = [[30000, 'Under 30.000'], [60000, 'Under 60.000'], [100000, 'Under 100.000']]
    .map(([max, tekst]) => ({ tekst, max, n: priser.filter(p => p <= max).length }))
    .filter(x => x.n > 0 && x.n < priser.length);
  if (pris.length) raekker.push({ navn: 'Pris', links: pris.map(x => ({ tekst: `${x.tekst} kr.`, n: x.n, key: `pris:${x.max}`, href: q(`maxPrice=${x.max}`) })) });

  /* RUNDE 13: den blinde dommer holdt siden op mod AutoScout24 og kaldte deres
     filterskinne "feltets bedste" — femten filtre mod vores to. Vi bygger ikke
     en skinne (facetsiden ER allerede et filter, og soegning.html ejer den fulde
     filtrering), men aargang og km ligger i de data, vi HAR, og er de to felter
     en brugtkoeber sorterer paa efter prisen. Samme regel som prisspringene:
     vises kun, naar de faktisk deler lageret, og tallene taelles paa stedet. */
  const aar = items.map(l => tilTal(l.year)).filter(y => y !== null && y > 1900);
  if (aar.length){
    const nu = Math.max(...aar);
    const aarSpring = [[nu - 2, `${nu - 2} og nyere`], [nu - 5, `${nu - 5} og nyere`], [nu - 10, `${nu - 10} og nyere`]]
      .map(([min, tekst]) => ({ tekst, min, n: aar.filter(y => y >= min).length }))
      .filter(x => x.n > 0 && x.n < aar.length);
    if (aarSpring.length) raekker.push({ navn: 'Årgang', links: aarSpring.map(x => ({ tekst: x.tekst, n: x.n, key: `aar:${x.min}`, href: q(`yearMin=${x.min}`) })) });
  }

  const km = items.map(l => tilTal(l.km)).filter(k => k !== null && k >= 0);
  const kmSpring = [[10000, 'Under 10.000'], [30000, 'Under 30.000'], [60000, 'Under 60.000']]
    .map(([max, tekst]) => ({ tekst, max, n: km.filter(v => v <= max).length }))
    .filter(x => x.n > 0 && x.n < km.length);
  if (kmSpring.length) raekker.push({ navn: 'Km', links: kmSpring.map(x => ({ tekst: `${x.tekst} km`, n: x.n, key: `km:${x.max}`, href: q(`kmMax=${x.max}`) })) });

  raekker.push({ navn: 'Sortér i søgningen', klasse: ' brand-facet-sorter', links: [
    { tekst: 'Pris: lav → høj', href: q('sort=price-asc') },
    { tekst: 'Pris: høj → lav', href: q('sort=price-desc') },
    { tekst: 'Årgang: nyeste', href: q('sort=year-desc') },
  ] });

  if (!raekker.length) return '';
  const foldId = `facetvaerktoej-${facet.slug}`;
  return `
      <div class="brand-facet-fold">
        <!-- RUNDE 13 (R13-10): checkbox+label baerer ingen disclosure-rolle, saa
             en skaermlaeser hoerte "afkrydsningsfelt, ikke markeret" uden at
             faa at vide, at den styrer indholdet nedenfor. CSS-mekanikken
             bliver (den er grunden til, at folden ikke giver layouthop),
             men kontrollen peger nu paa sit panel med aria-controls, og
             tilstanden staar i selve navnet via to skjulte ord, CSS bytter
             om paa ved :checked. Ingen JS, ingen CSP-undtagelse. -->
        <input type="checkbox" class="brand-facet-check" id="${foldId}" aria-controls="${foldId}-panel">
        <label class="brand-facet-greb" for="${foldId}">Filtrér og sortér<span class="visually-hidden fold-vis"> — vis</span><span class="visually-hidden fold-skjul"> — skjul</span><span class="chev"></span></label>
        <div class="brand-facetter" id="${foldId}-panel">
        ${raekker.map(r => `<div class="brand-facet-raekke${r.klasse || ''}"><span class="brand-facet-navn">${r.navn}:</span> ${r.links.map(l => `<a class="popular-chip popular-chip-sm" href="${l.href}"><span>${l.tekst}${l.key ? ` · ${nSpan(l.key, l.n)}` : ''}</span></a>`).join('\n          ')}</div>`).join('\n        ')}
        </div>
      </div>`;
}

/* ---------- Facet-siden: hero + søgekort + tillidsrække + udvalgte + sektioner ----------
   Opsætning efter referencebillede 7 (kørekort) og 8 (type), se
   docs/review/gauntlet/builder-facet.md. Al side-specifik CSS ligger i
   css/p-facet.css (prefix fa-). Alle tal regnes af annoncerne i lageret. */
const UDVALGTE = 5;   // kort i rækken ved siden af CTA-panelet (5 fra 1280 px, 4 under); resten står i "flere"-gitteret
/* Ét tal pr. side: HVER tal, der er regnet af lageret, står i et element med
   data-fa-n="<nøgle>", og hydreringen i bunden regner dem alle om på de samme
   annoncer, som overskriften bruger. Nøgler: all, type:<id>, region:<navn>,
   kk:A1|A2, pris:<max>, aar:<min>, km:<max>, model:<mærke>|<model>. */
const nSpan = (noegle, n) => `<span data-fa-n="${esc(noegle)}">${tal(n)}</span>`;
const ordSpan = (n, et, fl) => `<span data-fa-ord data-fa-et="${et}" data-fa-fl="${fl}">${n === 1 ? et : fl}</span>`;
/* Ental af facettens frase ("1 sport-motorcykel", ikke "1 sport-motorcykler"). */
function fraseEt(facet){
  if (facet.kind === 'type') return `${esc(facet.titel).toLowerCase().replace(/motorcykler$/, 'motorcykel')}`;
  if (facet.kind === 'koerekort') return `motorcykel til ${esc(facet.id)}-kørekort`;
  if (facet.kind === 'region') return `motorcykel i ${esc(facet.id)}`;
  return esc(facet.titel);
}
const IKON = n => `<span class="fa-ik" aria-hidden="true">${EGNE_IKONER[n] || IkonKilde[n] || ''}</span>`;
const stort = s => s.charAt(0).toUpperCase() + s.slice(1);
const faSoeg = (facet, extra) => {
  const p = new URLSearchParams();
  if (facet.kind === 'type') p.set('type', facet.id);
  else if (facet.kind === 'region') p.set('regions', facet.id);
  else if (facet.kind === 'model'){ p.set('brands', facet.brand); p.set('model', facet.model); }
  else { p.set('koerekort', facet.id); if (facet.id === 'A') p.set('hkMin', String(A2_MAX_HK + 1)); }
  for (const [k, v] of Object.entries(extra || {})) p.set(k, v);
  return `soegning.html?${p.toString()}`.replace(/&/g, '&amp;');
};
const PRIS_TRIN = [30000, 60000, 100000, 200000];
const AAR_TRIN = [2, 5, 10, 20].map(n => I_AAR - n);

/* Mest udbudte modeller i udvalget (kun dem med mindst to annoncer — en række
   af modeller med "1 til salg" er støj). Peger på modelsiden, når den findes og
   er indekserbar, ellers på søgningen. */
function topModeller(items, n = 6){
  const m = new Map();
  for (const l of items){
    const k = modelNoegle(l);
    if (!k) continue;
    const [brand, model] = k.split('\u0000');
    const e = m.get(k) || { brand, model, n: 0, foto: null };
    e.n++;
    /* Kildernes fotos bærer ofte forhandlerens eget skilt hen over motorcyklen
       (mcsyd.dk). Vi retoucherer ikke — vi vælger bare et foto fra en anden
       kilde, når der findes et, og tager ellers det første. */
    const foto = l.photoUrls && l.photoUrls[0];
    if (foto && (!e.foto || (e.fotoLogo && l.source?.domaene !== 'mcsyd.dk'))){ e.foto = foto; e.fotoLogo = l.source?.domaene === 'mcsyd.dk'; }
    m.set(k, e);
  }
  const modelSider = new Map((global.__MODELFACETTER || []).filter(f => f.qualifies).map(f => [f.slug, f]));
  return [...m.values()].filter(e => e.n >= 2)
    .sort((a, b) => b.n - a.n || `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, 'da'))
    .slice(0, n)
    .map(e => {
      const slug = modelSlug(e.brand, e.model);
      return Object.assign(e, { href: modelSider.has(slug) ? `${slug}.html`
        : `soegning.html?${new URLSearchParams({ brands: e.brand, model: e.model }).toString().replace(/&/g, '&amp;')}` });
    });
}
function antalPrTypeOgRegion(items){
  const typer = new Map(), regioner = new Map();
  for (const l of items){
    if (l.type) typer.set(l.type, (typer.get(l.type) || 0) + 1);
    if (l.region) regioner.set(l.region, (regioner.get(l.region) || 0) + 1);
  }
  return { typer, regioner };
}

function faSelect(id, navn, label, valg, valgt){
  return `<div class="field fa-felt"><label for="${id}">${label}</label>
          <select class="input" id="${id}" name="${navn}">
            ${valg.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(valgt) ? ' selected' : ''}>${esc(t)}</option>`).join('\n            ')}
          </select></div>`;
}
function soegekort(facet, items){
  const isType = facet.kind === 'type', isKk = facet.kind === 'koerekort', isModel = facet.kind === 'model', isRegion = facet.kind === 'region';
  const f = [];
  if (!isModel){
    f.push(`<div class="field fa-felt fa-felt-q"><label for="fa-q">Mærke eller model</label>
          <input class="input" type="text" id="fa-q" name="q" placeholder="F.eks. Yamaha MT-07, Honda Rebel" autocomplete="off"></div>`);
  }
  if (isType || isKk || isRegion){
    f.push(faSelect('fa-type', 'type', 'Type', [['', 'Alle typer'], ...TYPES.map(t => [t.id, `${t.label}-motorcykler`])], isType ? facet.id : ''));
  }
  f.push(faSelect('fa-pris', 'maxPrice', 'Maks. pris', [['', 'Alle priser'], ...PRIS_TRIN.map(p => [p, `Op til ${tal(p)} kr.`])], ''));
  f.push(faSelect('fa-aar', 'yearMin', 'Årgang', [['', 'Alle årgange'], ...AAR_TRIN.map(y => [y, `${y} og nyere`])], ''));
  if (isModel) f.push(faSelect('fa-km', 'kmMax', 'Maks. km', [['', 'Alle'], ...[10000, 30000, 60000].map(k => [k, `Op til ${tal(k)} km`])], ''));
  const skjult = [];
  if (isKk){ skjult.push(['koerekort', facet.id]); if (facet.id === 'A') skjult.push(['hkMin', A2_MAX_HK + 1]); }
  if (isRegion) skjult.push(['regions', facet.id]);
  if (isModel) skjult.push(['brands', facet.brand], ['model', facet.model]);
  const titel = isKk ? `Find motorcykler til ${esc(facet.id)}-kørekort` : null;
  const knapTekst = isModel ? esc(facet.model) : isType ? frase(facet) : isRegion ? `i ${esc(facet.id)}` : `til ${esc(facet.id)}`;
  return `<form class="fa-soeg" action="soegning.html" method="get" aria-label="Søg ${frase(facet)}">
        ${titel ? `<h2 class="fa-soeg-titel">${titel}</h2>` : ''}
        <div class="fa-soeg-felter">
          ${f.join('\n          ')}
          ${skjult.map(([k, v]) => `<input type="hidden" name="${k}" value="${esc(v)}">`).join('')}
          <button type="submit" class="btn btn-primary btn-lg fa-soeg-knap">Søg ${isType || isModel ? '' : 'motorcykler '}${knapTekst} <span class="fa-pil" aria-hidden="true">${EGNE_IKONER.arrow}</span></button>
        </div>
        <p class="fa-soeg-antal">${nSpan('all', items.length)} ${ordSpan(items.length, fraseEt(facet), frase(facet))} indekseret på Bikerbasen</p>
      </form>`;
}

function infoPanel(facet, items){
  if (facet.kind === 'koerekort') return '';
  const { priser, aar } = prisOgAargang(items);
  const rk = [];
  rk.push(`<li>${IKON('bike')}<div><strong>${nSpan('all', items.length)}</strong><span>${ordSpan(items.length, fraseEt(facet), frase(facet))} indekseret</span></div></li>`);
  if (facet.kind === 'region'){
    const byer = new Map();
    for (const l of items){ const b = String(l.city || '').trim(); if (b) byer.set(b, (byer.get(b) || 0) + 1); }
    const top = [...byer.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'da')).slice(0, 3).map(([b]) => esc(b));
    if (top.length) rk.push(`<li>${IKON('pin')}<div><strong>Flest annoncer i</strong><span>${top.join(', ')}</span></div></li>`);
  } else if (facet.kind === 'model'){
    if (aar.length){
      const lav = Math.min(...aar), hoej = Math.max(...aar);
      rk.push(`<li>${IKON('calendar')}<div><strong>Årgange</strong><span>${lav === hoej ? lav : `${lav} til ${hoej}`}</span></div></li>`);
    }
  } else {
    const m = maerkeChips(facet, items).slice(0, 5).map(([b]) => esc(b));
    if (m.length) rk.push(`<li>${IKON('star')}<div><strong>Mest udbudte mærker</strong><span>${m.join(', ')}</span></div></li>`);
  }
  if (priser.length){
    const lav = priser[0], hoej = priser[priser.length - 1];
    rk.push(`<li>${IKON('tag')}<div><strong>Prisniveau</strong><span>${lav === hoej ? dkk(lav) : `fra ${dkk(lav)} til ${dkk(hoej)}`}</span></div></li>`);
  }
  return `<ul class="fa-panel" aria-label="Fakta om udvalget">${rk.join('')}</ul>`;
}

function tillidsraekke(senest){
  const r = [
    ['shieldCheck', 'Kilden står på hvert kort', 'Du kan altid se, hvor annoncen kommer fra.'],
    ['checkCircle', 'Kørekortfilter på oplyste tal', 'Vi gætter aldrig. Mangler et tal, står der "Ikke oplyst".'],
    ['heart', 'Gem dine favoritter', 'Tryk på hjertet på et kort og find dem igen senere.'],
    ['clock', senest ? `Bekræftet ${senest}` : 'Opdateres løbende', senest ? 'Senest bekræftet hos kilderne.' : 'Lageret indekseres løbende fra kilderne.'],
  ];
  return `<ul class="fa-tillid">${r.map(([i, t, s]) => `<li>${IKON(i)}<div><strong>${t}</strong><span>${s}</span></div></li>`).join('')}</ul>`;
}
function faktaRaekke(facet){
  const fakta = KK_FAKTA[facet.id] || [];
  return `<section class="fa-fakta" aria-label="Fakta om kørekort ${esc(facet.id)}">
      <ul class="fa-fakta-liste">${fakta.map(x => `<li>${IKON(x.ikon)}<div><strong>${x.titel}</strong><span>${x.tekst}</span></div></li>`).join('')}</ul>
      <a class="fa-fakta-guide" href="${GUIDE.a2}">${IKON('book')}<div><strong>Er du i tvivl om reglerne?</strong><span>Læs vores guide til kørekort med krav og gode råd.</span></div><span class="fa-pil" aria-hidden="true">${EGNE_IKONER.arrow}</span></a>
      <p class="fa-fakta-kilde">Almindelige regler. Kilde: <a href="${KILDE_URL}" rel="noopener noreferrer" target="_blank">Færdselsstyrelsen</a>. Der findes undtagelser, fx for værnepligtige og mekanikere.</p>
    </section>`;
}

function ctaFoto(facet, items){
  if (facet.kind === 'type') return facet.id;
  if (facet.kind !== 'model') return null;
  const m = new Map(); for (const l of items) if (l.type) m.set(l.type, (m.get(l.type) || 0) + 1);
  const t = [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return TYPES.some(x => x.id === t) ? t : null;
}
function ctaPanel(facet, foto){
  let titel, punkter, knap, href;
  if (facet.kind === 'type'){
    titel = `Er en ${esc(String(facet.label).toLowerCase())}-motorcykel noget for dig?`;
    punkter = ['Få overblik over typerne', 'Se hvilket kørekort du skal bruge', 'Tjek-punkter ved brugt køb', 'Tips til en tryg handel'];
    knap = 'Læs vores guide'; href = GUIDE.foerste;
  } else if (facet.kind === 'koerekort'){
    titel = `Ikke sikker på, hvilken motorcykel til ${esc(facet.id)} der passer til dig?`;
    punkter = ['Se de mest udbudte modeller', 'Få overblik over reglerne', 'Sammenlign motorcykler på pris og data'];
    knap = facet.id === 'A1' ? 'Læs vores guide' : `Læs vores ${esc(facet.id)}-guide`; href = facet.id === 'A1' ? GUIDE.foerste : GUIDE.a2;
  } else if (facet.kind === 'region'){
    titel = `Leder du efter en motorcykel i ${esc(facet.id)}?`;
    punkter = ['Se kun annoncer fra din landsdel', 'Gem en søgning og få besked om nye annoncer', 'Tjek-punkter ved brugt køb'];
    knap = 'Læs vores guide'; href = GUIDE.brugt;
  } else {
    titel = `Overvejer du en ${esc(facet.brand)} ${esc(facet.model)}?`;
    punkter = ['Sammenlign pris, årgang og km', 'Tjek-punkter ved brugt køb', 'Se kilden til hver annonce'];
    knap = 'Læs vores guide'; href = GUIDE.brugt;
  }
  return `<aside class="fa-cta${foto ? ' fa-cta-studio' : ''}" aria-label="Guide">
        ${foto ? `<img class="fa-cta-foto" src="img/type/${foto}.webp" alt="" width="456" height="342" loading="lazy" decoding="async">` : ''}
        <h2>${titel}</h2>
        <ul>${punkter.map(p => `<li><span class="fa-ok" aria-hidden="true">${IkonKilde.check}</span>${p}</li>`).join('')}</ul>
        <a class="btn btn-primary" href="${href}">${knap} <span class="fa-pil" aria-hidden="true">${EGNE_IKONER.arrow}</span></a>
      </aside>`;
}

function typeFliser(facet, typer){
  const t = TYPES.filter(x => typer.get(x.id)).sort((a, b) => typer.get(b.id) - typer.get(a.id));
  if (!t.length) return '';
  const hvad = facet.kind === 'koerekort' ? `${esc(facet.id)}-motorcykler` : `motorcykler i ${esc(facet.id)}`;
  const hvadEt = facet.kind === 'koerekort' ? `${esc(facet.id)}-motorcykel` : `motorcykel i ${esc(facet.id)}`;
  return `<section class="section fa-sektion">
      <h2 class="fa-h2">Populære typer ${hvad}</h2>
      <ul class="fa-typer">${t.map(x => `<li><a href="${faSoeg(facet, { type: x.id })}">
          <img src="img/type/${x.id}.webp" alt="" width="456" height="342" loading="lazy" decoding="async">
          <span class="fa-type-tekst"><strong>${esc(x.label)}</strong><span>${nSpan(`type:${x.id}`, typer.get(x.id))} ${ordSpan(typer.get(x.id), hvadEt, hvad)}</span></span>
          <span class="fa-pil" aria-hidden="true">${EGNE_IKONER.arrow}</span></a></li>`).join('')}</ul>
    </section>`;
}
function modelRaekke(facet, items){
  const m = facet.kind === 'model' ? [] : topModeller(items);
  if (!m.length) return '';
  const hvad = facet.kind === 'type' ? `${esc(String(facet.label).toLowerCase())}-modeller` : facet.kind === 'koerekort' ? `${esc(facet.id)}-modeller` : `modeller i ${esc(facet.id)}`;
  return `<section class="section fa-sektion">
      <h2 class="fa-h2">Populære ${hvad}</h2>
      <ul class="fa-modeller">${m.map(e => `<li><a href="${e.href}">
          ${e.foto ? `<img src="${esc(e.foto)}" alt="" width="96" height="72" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : `<span class="fa-model-ikon">${IKON('bike')}</span>`}
          <span class="fa-model-tekst"><strong>${esc(e.brand)} ${esc(e.model)}</strong><span>${nSpan(`model:${e.brand}|${e.model}`, e.n)} indekseret</span></span></a></li>`).join('')}</ul>
    </section>`;
}
/* Kørekortsidernes tre info-bokse + "næste skridt"-boks (billede 7). */
function kkBokse(facet){
  const k = KK_BOKSE[facet.id];
  const liste = (ikon, kl, titel, punkter) => `<article class="fa-boks fa-boks-liste ${kl}">${IKON(ikon)}<div><h3>${titel}</h3><ul>${punkter.map(p => `<li>${p}</li>`).join('')}</ul></div></article>`;
  const naeste = facet.id === 'A2' ? { t: 'Klar til næste skridt?', p: 'Se, hvilke motorcykler der ligger over A2-grænsen, og hvad vejen til A kræver.', l: 'koerekort-a.html', k: 'Se motorcykler til A' }
    : facet.id === 'A1' ? { t: 'Klar til næste skridt?', p: 'Se, hvad A2 giver ret til, og hvilke motorcykler der passer til kategorien.', l: 'koerekort-a2.html', k: 'Se motorcykler til A2' }
    : { t: 'Kommer du fra A2?', p: 'Se, hvad A2 giver ret til, og hvad der adskiller kategorien fra A.', l: 'koerekort-a2.html', k: 'Se motorcykler til A2' };
  return `<section class="fa-bokse fa-bokse-kk" aria-label="Om kørekort ${esc(facet.id)}">
      ${liste('checkCircle', 'fa-groen', `Hvad må du køre med ${esc(facet.id)}?`, k.maa)}
      ${liste('alertTriangle', 'fa-orange', 'Hvad kan du ikke se direkte i en annonce?', k.ikkeSe)}
      ${liste('info', 'fa-blaa', `Vores råd, når du køber motorcykel til ${esc(facet.id)}`, k.raad)}
      <article class="fa-boks fa-boks-naeste"><div><h3>${naeste.t}</h3><p>${naeste.p}</p><a class="btn btn-outline" href="${naeste.l}">${naeste.k} <span class="fa-pil" aria-hidden="true">${EGNE_IKONER.arrow}</span></a></div></article>
    </section>`;
}
/* "Det skal du vide om …" — type, landsdel og model. */
function videnBokse(facet, items){
  let liste, h;
  if (facet.kind === 'type'){ liste = TYPE_VIDEN[facet.id] || []; h = `Det skal du vide om ${esc(String(facet.label).toLowerCase())}-motorcykler`; }
  else if (facet.kind === 'region'){ liste = REGION_VIDEN; h = `Det skal du vide, når du køber i ${esc(facet.id)}`; }
  else {
    const { priser, aar } = prisOgAargang(items);
    const km = items.map(l => tilTal(l.km)).filter(k => k !== null && k >= 0).sort((a, b) => a - b);
    const kk = [...new Set(items.map(l => koerekortForListing(l)).filter(Boolean))];
    liste = [];
    if (priser.length){
      const oplyst = `${priser.length} af ${items.length} annoncer oplyser en pris`;
      liste.push({ ikon: 'tag', titel: 'Pris', tekst: priser[0] === priser[priser.length - 1]
        ? `Den oplyste pris er ${dkk(priser[0])} (${oplyst}).`
        : `Priserne ligger mellem ${dkk(priser[0])} og ${dkk(priser[priser.length - 1])} (${oplyst}).` });
    }
    const ak = [aar.length ? `Årgange fra ${Math.min(...aar)} til ${Math.max(...aar)}.` : '',
      km.length > 1 && km[0] !== km[km.length - 1] ? `Kilometertal fra ${tal(km[0])} til ${tal(km[km.length - 1])} km.` : ''].filter(Boolean).join(' ');
    if (ak) liste.push({ ikon: 'calendar', titel: 'Årgang og km', tekst: ak });
    liste.push({ ikon: 'doc', titel: 'Kørekort', tekst: kk.length === 1
      ? `Alle annoncer ligger inden for grænserne for kørekort ${kk[0]} ud fra den oplyste effekt og slagvolumen. Tjek altid registreringsattesten.`
      : 'Kørekortet afhænger af den enkelte annonce. Kortet viser kategorien, når effekt og slagvolumen er oplyst. Tjek altid registreringsattesten.' });
    liste.push({ ikon: 'shield', titel: 'Tjek før køb', tekst: 'Sammenlign stelnummer med papirerne, bed om servicehistorik og se efter stand på dæk, kæde og bremser.' });
    h = `Det skal du vide om ${esc(facet.brand)} ${esc(facet.model)}`;
  }
  const boks = b => `<article class="fa-boks">${IKON(b.ikon)}<div><h3>${b.titel}</h3><p>${b.tekst}</p></div></article>`;
  return `<section class="section fa-sektion">
      <h2 class="fa-h2">${h}</h2>
      <div class="fa-bokse fa-bokse-4">${liste.map(boks).join('')}</div>
    </section>`;
}
function relaterede(facet, items){
  const c = [];
  const n = fn => items.filter(fn).length;
  const tot = items.length;
  const frs = facet.kind === 'koerekort' ? 'motorcykler' : frase(facet);
  const add = (tekst, href, antal, noegle) => { if (antal > 0) c.push(`<a class="popular-chip popular-chip-sm fa-rel-chip" href="${href}"><span>${tekst} <span class="fa-n">${nSpan(noegle, antal)}</span></span></a>`); };
  if (facet.kind !== 'koerekort'){
    add(`A1 ${frs}`, faSoeg(facet, { koerekort: 'A1' }), n(l => passerKoerekort(l, 'A1')), 'kk:A1');
    add(`A2 ${frs}`, faSoeg(facet, { koerekort: 'A2' }), n(l => passerKoerekort(l, 'A2')), 'kk:A2');
  }
  const priser = items.map(l => tilTal(l.price)).filter(p => p !== null && p > 0);
  for (const p of PRIS_TRIN.slice(0, 3)){ const a = priser.filter(x => x <= p).length; if (a < tot) add(`${stort(frs)} under ${tal(p)} kr.`, faSoeg(facet, { maxPrice: p }), a, `pris:${p}`); }
  const aar = items.map(l => tilTal(l.year)).filter(y => y !== null && y > 1900);
  for (const y of AAR_TRIN.slice(0, 2)){ const a = aar.filter(x => x >= y).length; if (a < tot) add(`${stort(frs)} fra ${y}`, faSoeg(facet, { yearMin: y }), a, `aar:${y}`); }
  return c.length ? `<div class="fa-rel"><h2 class="fa-h3">Relaterede søgninger</h2><div class="fa-chips">${c.join('')}</div></div>` : '';
}
function regionChips(facet, regioner){
  if (facet.kind === 'region') return '';
  const r = REGIONS.filter(x => regioner.get(x));
  if (!r.length) return '';
  const hvad = facet.kind === 'type' ? `${esc(String(facet.label).toLowerCase())}-motorcykler` : facet.kind === 'koerekort' ? `${esc(facet.id)}-motorcykler` : esc(facet.titel);
  return `<div class="fa-rel"><h2 class="fa-h3">Se ${hvad} i din region</h2><div class="fa-chips">${r.map(x => `<a class="popular-chip popular-chip-sm" href="${faSoeg(facet, { regions: x })}">${IKON('pin')}<span>${esc(x)} <span class="fa-n">${nSpan(`region:${x}`, regioner.get(x))}</span></span></a>`).join('')}</div></div>`;
}
function guideRaekke(){
  const g = [
    [GUIDE.a2, 'Kørekort A2: regler, krav og gode råd', 'Hvad A2 giver ret til, og vejen videre til A.', 'img/hero-960.webp'],
    [GUIDE.foerste, 'Din første motorcykel', 'Sådan finder du type og kørekort, der passer til dig.', 'img/type/naked.webp'],
    [GUIDE.brugt, 'Sådan køber du brugt motorcykel', 'Tjekpunkter til besigtigelse og en tryg handel.', 'img/type/touring.webp'],
  ];
  return `<section class="section fa-sektion">
      <div class="fa-h2-raekke"><h2 class="fa-h2">Guides og viden</h2><a class="fa-mere" href="${GUIDE.alle}">Se alle guides <span class="fa-pil" aria-hidden="true">${EGNE_IKONER.arrow}</span></a></div>
      <ul class="fa-guides">${g.map(([h, t, b, img]) => `<li><a href="${h}"><img src="${img}" alt="" width="456" height="342" loading="lazy" decoding="async"><span class="fa-guide-tekst"><strong>${t}</strong><span>${b}</span></span></a></li>`).join('')}</ul>
    </section>`;
}

function side(facet, alle){
  const items = sorterSubstans(alle.filter(facet.match));
  const qualifies = items.length >= THRESHOLD;
  const uoplyst = uoplystAntal(facet, alle);
  const fil = `${facet.slug}.html`;
  const viste = items.slice(0, FACET_KORT);
  const kort1 = viste.slice(0, UDVALGTE).map((l, i) => listingCardHTML(l, i)).join('\n      ');
  const kort2 = viste.slice(UDVALGTE).map((l, i) => listingCardHTML(l, i + UDVALGTE)).join('\n      ');
  const senestOpdateret = senestBekraeftet(items);
  const { typer, regioner } = antalPrTypeOgRegion(items);
  const erKk = facet.kind === 'koerekort';

  const intro = facet.kind === 'type' ? introForType(facet, items)
    : facet.kind === 'region' ? introForRegion(facet, items, alle)
    : facet.kind === 'model' ? introForModel(facet, items)
    : introForKoerekort(facet, items, uoplyst);
  const introDelt = delIntro(intro);
  /* Etiketten paa folden er ikke pynt. Paa koerekortsiderne ligger BAADE
     graenserne og regnskabet over, hvad listen udelader ("161 annoncer mangler
     oplyst effekt — de vises IKKE her"), bag folden. En fold, der bare hedder
     "Mere om udvalget", skjuler at der ER noget udeladt. Etiketten siger det
     derfor selv, ogsaa mens folden er lukket. */
  const introFoldEtiket = erKk ? `Hvad kræver ${esc(facet.id)} — og hvad vises ikke her?` : 'Mere om udvalget';
  /* Titel og meta må ikke sige "brugte" om et lager med fabriksnye i (R11-F-2),
     og kørekorttitlen må ikke antyde egnethed, som sidens egen intro
     omhyggeligt undgår (R11-I-4). Begge dele skrives derfor af tallene. */
  const hvad = facet.kind === 'type' ? `${brugtOrd(items, `${esc(facet.label)}-motorcykel`, `${esc(facet.label)}-motorcykler`)} til salg i Danmark`
    : facet.kind === 'region' ? `motorcykler til salg i ${esc(facet.id)}`
    : facet.kind === 'model' ? `${esc(facet.brand)} ${esc(facet.model)} til salg i Danmark`
    : facet.id === 'A' ? 'motorcykler, hvis oplyste effekt er over A2-grænsen (kræver kørekort A)'
    : `motorcykler, der ikke er udelukket til ${esc(facet.id)}-kørekort ud fra de oplyste tal`;
  const beskrivelse = qualifies
    ? `Se ${items.length} ${hvad}. Sammenlign pris, årgang, km-stand og ccm på Bikerbasen.`
    : `${items.length} ${items.length === 1 ? 'annonce' : 'annoncer'} — se hele udvalget af `
      + `motorcykler på Bikerbasen i stedet.`;
  const sideTitel = !qualifies ? esc(facet.titel)
    : facet.kind === 'type' ? `${stort(brugtOrd(items, `${esc(facet.label)}-motorcykel`, `${esc(facet.label)}-motorcykler`))} til salg`
    : facet.kind === 'region' ? `Motorcykler til salg i ${esc(facet.id)}`
    : facet.kind === 'model' ? `${stort(brugtOrd(items, `${esc(facet.brand)} ${esc(facet.model)}`, `${esc(facet.brand)} ${esc(facet.model)}`))} til salg`
    : `Motorcykler til ${esc(facet.id)}-kørekort`; // S-001: kort title; forbeholdet står i introen
  const andreRegioner = REGIONS.filter(r => r !== facet.id)
    .map(r => `<a class="popular-chip" href="region-${slugify(r)}.html">${esc(r)}</a>`).join('\n        ');
  const brandFil = facet.kind === 'model' ? `maerke-${slugify(facet.brand)}.html` : null;
  const brandFindes = brandFil && fs.existsSync(path.join(ROOT, brandFil));
  const andreModeller = facet.kind === 'model'
    ? (global.__MODELFACETTER || []).filter(f => f.brand === facet.brand && f.slug !== facet.slug && f.qualifies)
        .map(f => `<a class="popular-chip" href="${f.slug}.html">${esc(f.model)}</a>`).join('\n        ')
    : '';

  const andreTyper = TYPES.filter(t => `type-${t.id}` !== facet.slug)
    .map(t => `<a class="popular-chip" href="type-${t.id}.html">${esc(t.label)}</a>`).join('\n        ');
  const andreKk = KOEREKORT_FACETS.filter(k => k.slug !== facet.slug)
    .map(k => `<a class="popular-chip" href="${k.slug}.html">${esc(k.titel)}</a>`).join('\n        ');

  const maerker = maerkeChips(facet, items);

  /* FAQ'en blev bygget som JSON-LD UDEN synligt indhold paa siden (R11-F-4).
     Google kraever, at svaret staar paa siden — usynlig structured data
     risikerer manual action for hele domaenet. Samme <details>-moenster som
     maerkesiden (build-brand-pages.js:884). */
  const faqData = facet.kind === 'model' && qualifies ? faqLdForModel(facet, items) : null;
  const faqHtml = faqData ? `<section class="section fa-sektion">
      <h2 class="fa-h2">Ofte stillede spørgsmål om ${esc(facet.brand)} ${esc(facet.model)}</h2>
      ${faqData.mainEntity.map(q => `<details class="brand-faq-item">
        <summary>${esc(q.name)}</summary>
        <p class="brand-intro">${esc(q.acceptedAnswer.text)}</p>
      </details>`).join('\n      ')}
    </section>` : '';

  const kicker = erKk ? `Kørekort ${esc(facet.id)}` : facet.kind === 'region' ? 'Landsdel' : facet.kind === 'model' ? esc(facet.brand) : '';
  const h1 = erKk && qualifies ? `Motorcykler til ${esc(facet.id)}-kørekort` : esc(facet.titel);
  const breadcrumb = `<nav class="breadcrumb fa-bc" aria-label="Brødkrumme">
        <a href="index.html">Forside</a><span class="bc-sep"></span>
        ${facet.kind === 'model' && brandFindes
          ? `<a href="maerker.html">Mærker</a><span class="bc-sep"></span><a href="${brandFil}">${esc(facet.brand)}</a><span class="bc-sep"></span><span>${esc(facet.model)}</span>`
          : `<a href="soegning.html">Søgning</a><span class="bc-sep"></span><span>${esc(facet.titel)}</span>`}
      </nav>`;
  const heroSrcset = 'img/hero-800.webp 800w, img/hero-960.webp 960w, img/hero-1600.webp 1600w, img/hero-2560.webp 2560w';
  const boksKk = erKk ? kkBokse(facet) : '';
  /* Hero-motiv: typesider viser deres EGEN type (img/type/<id>.webp); modelsider
     den type, flest af annoncerne har. Kørekort og landsdel har intet ærligt
     typemotiv og beholder landskabsfotoet. */
  const domType = (() => { const m = new Map(); for (const l of items) if (l.type) m.set(l.type, (m.get(l.type) || 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null; })();
  const heroFoto = facet.kind === 'type' ? facet.id : facet.kind === 'model' && TYPES.some(t => t.id === domType) ? domType : null;
  const boksViden = erKk ? '' : videnBokse(facet, items);

  return `<!doctype html>
<html lang="da">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${csp}
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>${sideTitel} — Bikerbasen</title>
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
${heroFoto ? '' : `<link rel="preload" as="image" href="img/hero-1600.webp" imagesrcset="${heroSrcset}" imagesizes="100vw" fetchpriority="high">`}
<link rel="stylesheet" href="css/styles.css">
<link rel="stylesheet" href="css/p-facet.css">
${jsonLdBlock([
  breadcrumbLd(
    facet.kind === 'model' && brandFindes
      ? [{ name: 'Forside', path: 'index.html' }, { name: 'Mærker', path: 'maerker.html' }, { name: facet.brand, path: brandFil }, { name: facet.model, path: fil }]
      : [{ name: 'Forside', path: 'index.html' },
         { name: facet.kind === 'type' ? 'Type' : facet.kind === 'region' ? 'Landsdel' : facet.kind === 'model' ? 'Modeller' : 'Kørekort', path: 'soegning.html' },
         { name: facet.titel, path: fil }]),
  itemListLd(`${facet.titel} — Bikerbasen`, items),
  faqData,
])}
</head>
<body>
${header}

<main id="main-content" class="fa-side fa-${facet.kind}">
  <section class="fa-hero">
    ${heroFoto ? `<div class="fa-hero-media fa-hero-studio" aria-hidden="true"></div>` : `<div class="fa-hero-media" aria-hidden="true">
      <img src="img/hero-1600.webp" srcset="${heroSrcset}" sizes="100vw" alt="" width="2560" height="1086" fetchpriority="high" decoding="async">
    </div>`}
    <div class="container fa-hero-inner">
      ${breadcrumb}
      <div class="fa-hero-grid">
        <div class="fa-hero-tekst">
          ${kicker ? `<p class="fa-kicker">${kicker}</p>` : ''}
          <h1>${h1}</h1>
          <p class="fa-hero-intro">${introDelt.foerste}</p>
          ${introDelt.rest ? `<details class="brand-intro-mere fa-mere-intro"><summary>${introFoldEtiket}</summary><p class="brand-intro">${introDelt.rest}</p></details>` : ''}
        </div>
        ${heroFoto ? `<div class="fa-hero-bike" aria-hidden="true"><img src="img/type/${heroFoto}.webp" alt="" width="456" height="342" fetchpriority="high" decoding="async"></div>` : ''}
        ${infoPanel(facet, items)}
      </div>
    </div>
  </section>

  <div class="container fa-krop">
    ${erKk ? faktaRaekke(facet) : ''}
    <div class="fa-soeg-vrap">
      ${soegekort(facet, items)}
      <p class="fa-agent"><a href="${facetSearchUrl(facet)}&amp;agent=1">Få besked om nye annoncer</a></p>
    </div>
    ${erKk ? '' : tillidsraekke(senestOpdateret)}

    <section class="section facet-liste-sektion fa-udvalgte">
      <div class="fa-h2-raekke"><h2 class="fa-h2">Udvalgte ${frase(facet)} på Bikerbasen</h2>${items.length ? `<a class="fa-mere" href="${facetSearchUrl(facet)}"><span>Se alle ${nSpan('all', items.length)} i søgningen</span> <span class="fa-pil" aria-hidden="true">${EGNE_IKONER.arrow}</span></a>` : ''}</div>
      ${items.length ? `<div class="fa-udvalgte-gitter">
        <div class="listings-grid fa-kortraekke" id="facet-listings" data-facet-kind="${facet.kind}" data-facet-id="${esc(facet.id)}" data-viste="${FACET_KORT}" data-udvalgte="${UDVALGTE}" data-facet-frase="${frase(facet)}"${facet.kind === 'model' ? ` data-facet-brand="${esc(facet.brand)}" data-facet-model="${esc(facet.model)}"` : ''}>${kort1}</div>
        ${ctaPanel(facet, ctaFoto(facet, items))}
      </div>` : `<div class="empty-state" id="facet-listings" data-facet-kind="${facet.kind}" data-facet-id="${esc(facet.id)}"${facet.kind === 'model' ? ` data-facet-brand="${esc(facet.brand)}" data-facet-model="${esc(facet.model)}"` : ''}>
        <h3>Ingen ${frase(facet)} til salg lige nu</h3>
        <p>Vi har ingen annoncer, der matcher denne kategori i øjeblikket. Adressen bliver stående —
           kig forbi igen, eller søg i hele udvalget.</p>
        <a href="soegning.html" class="btn btn-primary" style="margin-top:16px;">Søg alle motorcykler</a>
        <a href="${facetSearchUrl(facet)}" class="btn btn-outline" style="margin-top:16px;">Søg i alle ${frase(facet)}</a>
      </div>`}
    </section>

    ${erKk || facet.kind === 'region' ? typeFliser(facet, typer) : ''}
    ${boksKk}
    ${modelRaekke(facet, items)}

    ${maerker.length && facet.kind !== 'model' ? `<section class="section brand-maerkerow-sektion fa-maerker" aria-labelledby="fa-maerker-h">
      <!-- Samme regel som maerke-*.html's modelchips: kun maerker der reelt
           er repraesenteret her, aldrig en kurateret liste (D-010).
           Modelsider undtaget (R11-F-8): en chip ("Honda") er en tautologi. -->
      <h2 class="fa-h3" id="fa-maerker-h">Se ${frase(facet)} efter mærke</h2>
      <div class="popular-row">
        ${maerker.map(([b]) => `<a class="popular-chip" href="${facetSearchUrl(facet, b)}">${esc(b)}</a>`).join('\n        ')}
      </div>
    </section>` : ''}

    ${items.length > UDVALGTE ? `<section class="section fa-flere">
      <!-- "lige nu" er væk (R11-I-10): tallet bages ved byg og opdateres ikke
           ved visning. Datoen under siger i stedet, hvornaar lageret sidst blev
           bekraeftet — samme linje som maerkesiden (D9-M2). -->
      <div class="fa-h2-raekke"><div><h2 class="fa-h2" id="facet-antal">${items.length} ${items.length === 1 ? 'annonce' : 'annoncer'}</h2><p class="brand-facet-note" id="facet-note">${items.length > FACET_KORT ? `De første ${FACET_KORT} vises her.` : ''}</p>${senestOpdateret ? `<p class="brand-facet-note">Senest bekræftet hos kilderne ${senestOpdateret}.</p>` : ''}</div></div>
      ${facetVaerktoejer(facet, items)}
      <div class="listings-grid" id="facet-listings-flere">${kort2}</div>
      ${items.length > FACET_KORT ? `<p class="brand-mere"><a href="${facetSearchUrl(facet)}" class="btn btn-primary"><span>Se alle ${nSpan('all', items.length)} i søgningen</span></a></p>` : ''}
    </section>` : `<h2 class="visually-hidden" id="facet-antal">${items.length} ${items.length === 1 ? 'annonce' : 'annoncer'}</h2><p class="visually-hidden" id="facet-note"></p>${items.length ? `<section class="section fa-flere">${facetVaerktoejer(facet, items)}</section>` : ''}`}
    ${items.length ? `<noscript>
      <ul class="brand-noscript">
        ${items.map(l => `<li>${harEgenSide(l) ? `<a href="${esc(listingSlug(l))}">${noscriptLinje(l)}</a>` : noscriptLinje(l)}</li>`).join('\n        ')}
      </ul>
    </noscript>` : ''}

    ${faqHtml}
    ${boksViden}
    ${erKk ? guideRaekke() : ''}

    <section class="section fa-sektion fa-rel-vrap">
      <div class="fa-rel-grid">
        ${relaterede(facet, items)}
        ${regionChips(facet, regioner)}
      </div>
    </section>

    ${facet.kind === 'model' ? `${andreModeller ? `<section class="section fa-sektion">
      <h2 class="fa-h2">Andre ${esc(facet.brand)}-modeller</h2>
      <div class="popular-row">
        ${andreModeller}
        ${brandFindes ? `<a class="popular-chip" href="${brandFil}">Alle ${esc(facet.brand)}</a>` : ''}
      </div>
    </section>` : brandFindes ? `<section class="section fa-sektion">
      <div class="popular-row"><a class="popular-chip" href="${brandFil}">Alle ${esc(facet.brand)}</a></div>
    </section>` : ''}` : facet.kind === 'region' ? `<section class="section fa-sektion">
      <h2 class="fa-h2">Andre landsdele</h2>
      <div class="popular-row">
        ${andreRegioner}
        <a class="popular-chip" href="soegning.html">Hele landet</a>
      </div>
    </section>` : `<section class="section fa-sektion">
      <h2 class="fa-h2">Andre typer</h2>
      <div class="popular-row">
        ${andreTyper}
      </div>
    </section>

    <section class="section fa-sektion">
      <h2 class="fa-h2">Kørekortkategorier</h2>
      <div class="popular-row">
        ${andreKk}
        <a class="popular-chip" href="soegning.html">Alle motorcykler</a>
      </div>
    </section>`}
  </div>
</main>

${footer}

<script defer src="js/security.js"></script>
<script defer src="js/supabase-config.js"></script>
<script defer src="js/supabase-api.js"></script>
<script defer src="js/icons.js"></script>
<script defer src="js/bike-art.js"></script>
<script defer src="js/data.js"></script>
<script defer src="js/store.js"></script>
<script defer src="js/maaling.js"></script>
<script defer src="js/backend-bridge.js"></script>
<script defer src="js/sortering.js"></script>
<script defer src="js/components.js"></script>
<!-- Ingen separat js/facet.js: siden hydrerer sig selv med samme moenster som
     js/maerke.js bruger til maerke-*.html, bare filtreret paa type/koerekort/
     landsdel/model i stedet for maerke. koerekortForListing/passerKoerekort
     kommer fra js/data.js, som allerede er indlaest ovenfor. -->
<script>document.addEventListener('DOMContentLoaded', async () => {
  await backendReady();
  renderHeader(null);
  document.querySelectorAll('.bc-sep').forEach(s => s.innerHTML = Icon.chevronRight);
  const mount = document.getElementById('facet-listings');
  if (!mount) return;
  const mount2 = document.getElementById('facet-listings-flere');
  const kind = mount.dataset.facetKind, id = mount.dataset.facetId;
  const viste = Number(mount.dataset.viste) || ${FACET_KORT};
  const udvalgte = Number(mount.dataset.udvalgte) || ${UDVALGTE};
  const alle = Store.getAllListings();
  // Samme noegle som scripts/build-facet-pages.js modelNoegle(): trim + ét mellemrum.
  const norm = s => String(s || '').trim().replace(/\\s+/g, ' ');
  /* SAMME raekkefoelge og SAMME antal som byggetrinnet (R11-F-6): siden bagte
     24 kort sorteret paa substans, hvorefter det her script tegnede ALLE
     igen i createdAt-orden — foerste kort skiftede identitet efter load.
     Kategori A er "over A2-graensen paa oplyst effekt" (samme regel som
     match i buildFacetList), IKKE "alt". */
  const traef = (kind === 'type' ? alle.filter(l => l.type === id)
    : kind === 'region' ? alle.filter(l => l.region === id)
    : kind === 'model' ? alle.filter(l => norm(l.brand) === norm(mount.dataset.facetBrand) && norm(l.model) === norm(mount.dataset.facetModel))
    : id === 'A' ? alle.filter(l => { const hk = hkEllerNull(l.power); return hk != null && hk > A2_MAX_HK && !l.kanNedsaettesA2; })
    : alle.filter(l => passerKoerekort(l, id)))
    ;
  /* Samme raekkefoelge som bygget og som soegesiden: kilde-rundgang inden for
     hver oplysthedsklasse (js/sortering.js). */
  const traefSorteret = (typeof Sortering !== 'undefined')
    ? Sortering.sorter(traef.slice(), 'blandet') : traef;
  /* RUNDE 13 (R13-7): TOTALEN foer udsnittet — tallet i overskrift og intro
     bages ved bygget og skal opdateres, hvis lageret har aendret sig. */
  const alleTraef = traefSorteret.length;
  const items = traefSorteret.slice(0, viste);
  const frase = mount.dataset.facetFrase || 'motorcykler';
  if (!items.length){
    mount.className = 'empty-state';
    mount.innerHTML = '<h3>Ingen ' + frase + ' til salg lige nu</h3>'
      + '<p>Vi har ingen annoncer, der matcher denne kategori i øjeblikket. Adressen bliver stående — kig forbi igen, eller søg i hele udvalget.</p>'
      + '<a href="soegning.html" class="btn btn-primary" style="margin-top:16px;">Søg alle motorcykler</a>';
    const tom = document.getElementById('facet-antal');
    if (tom) tom.textContent = '0 annoncer';
    document.documentElement.setAttribute('data-fa-hydreret', '1');
    return;
  }
  mount.className = 'listings-grid fa-kortraekke';
  /* Roer kun DOM'en, hvis lageret HAR aendret sig siden bygget — samme
     id-sammenligning som js/maerke.js (D7-M2). */
  const nuIds = [...document.querySelectorAll('#facet-listings .card[data-listing-id], #facet-listings-flere .card[data-listing-id]')].map(c => c.dataset.listingId).join('|');
  const nyeIds = items.map(l => String(l.id)).join('|');
  if (nuIds !== nyeIds){
    mount.innerHTML = items.slice(0, udvalgte).map((l, i) => listingCardHTML(l, i)).join('');
    if (mount2) mount2.innerHTML = items.slice(udvalgte).map((l, i) => listingCardHTML(l, i + udvalgte)).join('');
  }
  const antal = document.getElementById('facet-antal');
  if (antal) antal.textContent = alleTraef + (alleTraef === 1 ? ' annonce' : ' annoncer');
  const introAntal = document.getElementById('facet-intro-antal');
  if (introAntal) introAntal.textContent = String(alleTraef);
  /* ALLE tal, der er regnet af lageret, står i [data-fa-n] og regnes her om
     paa samme annoncer som overskriften — saa siden aldrig viser to tal for
     det samme. Reglerne er de samme som i byggetrinnet (pris>0, aar>1900, km>=0). */
  const tilT = v => (v === null || v === undefined || v === '') ? null : (Number.isFinite(Number(v)) ? Number(v) : null);
  const tael = noegle => {
    const i = noegle.indexOf(':'), t = i < 0 ? noegle : noegle.slice(0, i), v = i < 0 ? '' : noegle.slice(i + 1);
    if (t === 'all') return alleTraef;
    if (t === 'type') return traef.filter(l => l.type === v).length;
    if (t === 'region') return traef.filter(l => l.region === v).length;
    if (t === 'kk') return traef.filter(l => passerKoerekort(l, v)).length;
    if (t === 'pris') return traef.filter(l => { const p = tilT(l.price); return p !== null && p > 0 && p <= Number(v); }).length;
    if (t === 'aar') return traef.filter(l => { const y = tilT(l.year); return y !== null && y > 1900 && y >= Number(v); }).length;
    if (t === 'km') return traef.filter(l => { const k = tilT(l.km); return k !== null && k >= 0 && k <= Number(v); }).length;
    if (t === 'model'){ const [b, m] = v.split('|'); return traef.filter(l => norm(l.brand) === b && norm(l.model) === m).length; }
    return null;
  };
  document.querySelectorAll('[data-fa-n]').forEach(el => {
    const n = tael(el.dataset.faN);
    if (n === null) return;
    el.textContent = n.toLocaleString('da-DK');
    const ord = el.parentElement && el.parentElement.querySelector('[data-fa-ord]');
    if (ord) ord.textContent = n === 1 ? ord.dataset.faEt : ord.dataset.faFl;
    const maal = el.closest('.fa-rel-chip, .fa-typer li, .fa-modeller li, .brand-facet-raekke a');
    if (maal) maal.hidden = n === 0;
  });
  const note = document.getElementById('facet-note');
  if (note) note.textContent = alleTraef > viste ? 'De første ' + viste + ' vises her.' : '';
  wireFavoriteButtons(mount);
  if (mount2) wireFavoriteButtons(mount2);
  document.documentElement.setAttribute('data-fa-hydreret', '1');
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
  const regioner = resultater.filter(r => r.qualifies && r.facet.kind === 'region');
  if (!typer.length && !koerekort.length && !regioner.length) return '';

  const tekst = variant === 'index'
    ? {
        typeH2: 'Se hele udvalget efter type', typeP: 'Priser, årgange og hvad du skal tjekke — for hver type for sig, ikke kun et filter.',
        kkH2: 'Se hele udvalget efter kørekort', kkP: 'Faste sider uden de motorcykler, der er udelukket på dit kørekort ud fra de oplyste tal.',
      }
    : {
        typeH2: 'Søg efter type', typeP: 'Faste sider med det aktuelle udvalg, prisniveau og hvad du skal tjekke — ikke kun et filter.',
        kkH2: 'Søg efter kørekort', kkP: 'Se udvalget uden de motorcykler, der er udelukket på dit kørekort ud fra de oplyste tal.',
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
  if (regioner.length){
    // D1: landsdelssider. Chip-teksten er landsdelens navn, ikke hele titlen.
    dele.push(`<section class="section" style="padding-top:0;">
      <div class="section-head"><div>
        <h2>${variant === 'index' ? 'Se hele udvalget efter landsdel' : 'Søg efter landsdel'}</h2>
        <p>${variant === 'index' ? 'Faste sider med det, der står til salg i din del af landet.' : 'Kun de motorcykler, der står i din landsdel.'}</p>
      </div></div>
      <div class="popular-row">
        ${regioner.map(r => `<a class="popular-chip" href="${r.facet.slug}.html">${esc(r.facet.id)}</a>`).join('\n        ')}
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

/* ---------- D1: maerkesidernes modelchips peger paa modelsiden, naar den findes ----------
   build-brand-pages.js (trin 2) skriver chips som soegning.html?brands=X&q=Y.
   Findes model-x-y.html og kvalificerer den, er DEN det bedre maal — ellers
   er modelsiden en orphan (D-010 igen). Kun kvalificerende sider; en
   noindex-side skal ikke have interne links. Maerkesiden skrives her, fordi
   trin 2 loeber FOER taersklen er regnet. */
function relinkMaerkesider(modelFacetter){
  let sider = 0, links = 0;
  const pr = new Map();
  for (const f of modelFacetter){ if (!f.qualifies) continue; if (!pr.has(f.brand)) pr.set(f.brand, []); pr.get(f.brand).push(f); }
  for (const [brand, facets] of pr){
    const fil = path.join(ROOT, `maerke-${slugify(brand)}.html`);
    if (!fs.existsSync(fil)) continue;
    let html = fs.readFileSync(fil, 'utf8'), foer = html;
    for (const f of facets){
      const gammel = `href="soegning.html?brands=${encodeURIComponent(brand)}&amp;q=${encodeURIComponent(f.model)}"`;
      const ny = `href="${f.slug}.html"`;
      html = html.split(gammel).join(ny);
      if (html !== foer){ links++; foer = html; }
    }
    if (html !== fs.readFileSync(fil, 'utf8')){ fs.writeFileSync(fil, html, 'utf8'); sider++; }
  }
  if (sider) console.log(`Maerkesider: ${links} modelchips peger nu paa modelsider (${sider} sider).`);
}

function byg(){
  const alle = global.ALLE_LISTINGS;
  const facets = buildFacetList(alle);
  // Modelfacetterne skal kende hinandens status (chips "Andre X-modeller").
  global.__MODELFACETTER = facets.filter(f => f.kind === 'model').map(f => Object.assign(f, { qualifies: alle.filter(f.match).length >= THRESHOLD }));
  const resultater = [];
  for (const facet of facets){
    const items = alle.filter(facet.match);
    const qualifies = items.length >= THRESHOLD;
    fs.writeFileSync(path.join(ROOT, `${facet.slug}.html`), side(facet, alle), 'utf8');
    resultater.push({ facet, antal: items.length, qualifies });
  }
  relinkMaerkesider(global.__MODELFACETTER);

  console.log(`Byggede ${resultater.length} facet-sider (${resultater.filter(r => r.qualifies).length} indekserbare, `
    + `${resultater.filter(r => !r.qualifies).length} noindex under tærsklen på ${THRESHOLD}).`);
  console.log('Facet-oversigt (den, en person skal kunne se uden at læse kode):');
  for (const r of resultater){
    console.log(`  ${r.qualifies ? '[INDEX] ' : '[noindex]'} ${r.facet.slug}.html — ${r.antal} annoncer`
      + (r.qualifies ? '' : ` (under tærsklen på ${THRESHOLD} — se filhovedets begrundelse)`));
  }
  console.log('  [koerekort-a.html viser kun annoncer, hvis oplyste effekt er over A2-graensen — se kraeverA() og filhovedet.]');

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
  const eksterne = markerTvaerkildeDubletter((await fetchExternalListings()).map(normalizeExternalListing)).beholdt;   // Runde 7 (D7-F2)
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

module.exports = { THRESHOLD, buildFacetList, uoplystAntal, cleanUrl, facetLinksBlock, side, facetSearchUrl, kraeverA, topModeller };
