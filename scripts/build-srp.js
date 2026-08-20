/* Skriver søgesidens FØRSTE resultatside direkte ind i soegning.html.

   Hvorfor: søgesiden var tom indtil javascriptet havde hentet annoncerne.
   Målt (mobil-throttle) betød det LCP 5.6s og CLS 0.67 — gitteret voksede
   fra 0 til fuld højde længe efter første maling, og kortets foto blev først
   opdaget dér. En crawler så et tomt <div id="results-grid">.

   Nu står den ufiltrerede første side (12 nyeste) i markuppen. js/search.js
   tegner nøjagtig det samme oven i, når data er hentet — samme funktion,
   samme data, samme rækkefølge — så der er ingen omrokering at se.

   Kortene bygges med SIDENS EGEN listingCardHTML fra js/components.js, som
   evalueres her med små stubbe for browser-globalerne. Duplikeres markuppen
   i stedet, driver de to fra hinanden ved første ændring.

   Kør:  node scripts/build-srp.js  (eller hele kæden: node scripts/build.js) */

const fs = require('fs');
const path = require('path');
const { ROOT, fetchListings, browserModules } = require('./shared');

/* Hvor mange kort der forudtegnes i markuppen — IKKE sidestørrelsen.
   js/search.js viser 24 pr. side; de første 12 er dem, der kan nå at være
   over folden, og de eneste der betaler sig at have i HTML'en. Resten males
   af search.js i samme rækkefølge, så der ikke opstår en omrokering.
   Forudtegner man hele siden, fordobles markuppen for kort, ingen ser før
   de har scrollet. */
const PRERENDER_COUNT = 12;

(async () => {
  const { listingCardHTML, normalizeRemoteListing } = browserModules();

  // Rækkerne skal gennem sidens egen oversætter, ellers mangler kortene
  // forhandler-badge og servicehistorik i forhold til det, klienten tegner.
  const listings = (await fetchListings([]))
    .map(l => l.created_at ? normalizeRemoteListing(l) : l);
  // Samme rækkefølge som search.js' standard: 'date-desc'.
  const sorted = listings.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const page = sorted.slice(0, PRERENDER_COUNT);
  const cards = page.map((l, i) => listingCardHTML(l, i)).join('\n');

  const total = sorted.length;
  const count = `${total} <span>${total === 1 ? 'annonce fundet' : 'annoncer fundet'}</span>`;

  const htmlPath = path.join(ROOT, 'soegning.html');
  let html = fs.readFileSync(htmlPath, 'utf8');

  // De forudtegnede kort gælder KUN den ufiltrerede standardsøgning. Kommer
  // brugeren ind på ?brands=Yamaha (Google, delt link), ville de forkerte
  // annoncer stå og lyse, indtil js/search.js filtrerede. Gitteret skjules
  // derfor med visibility — pladsen bevares, så der ikke opstår et hop.
  const guard = '<script>if(location.search)document.getElementById("results-grid")'
    + '.style.visibility="hidden";<\/script>';
  const grid = `<div id="results-grid" class="listings-grid"><!--srp:start-->${cards}<!--srp:end--></div>\n${guard}`;
  const gridRe = /<div id="results-grid" class="listings-grid">[\s\S]*?<\/div>(\s*<script>if\(location\.search\)[\s\S]*?<\/script>)?(?=\s*<div id="swipe-deck")/;
  if (!gridRe.test(html)) throw new Error('build-srp: fandt ikke #results-grid i soegning.html');
  html = html.replace(gridRe, grid);

  html = html.replace(
    /(<div class="results-count" id="results-count"[^>]*>)[\s\S]*?(<\/div>)/,
    `$1${count}$2`
  );

  // Første korts foto er sidens LCP — bed browseren hente det med det samme,
  // i stedet for at vente på at billedet opdages nede i markuppen.
  const firstPhoto = (page[0] && page[0].photoUrls && page[0].photoUrls[0]) || null;
  const preload = firstPhoto
    ? `<link rel="preload" as="image" href="${firstPhoto}" fetchpriority="high" id="srp-lcp-preload">`
    : '<!-- id="srp-lcp-preload" (ingen foto at preloade) -->';
  const preloadRe = /<link[^>]*id="srp-lcp-preload">|<!-- id="srp-lcp-preload"[^>]*-->/;
  html = preloadRe.test(html)
    ? html.replace(preloadRe, preload)
    : html.replace('</head>', preload + '\n</head>');

  fs.writeFileSync(htmlPath, html);
  console.log(`build-srp: ${page.length} kort (af ${total}) skrevet ind i soegning.html.`);
})();
