/* Skriver søgesidens FØRSTE resultatside direkte ind i soegning.html.

   Hvorfor: søgesiden var tom indtil javascriptet havde hentet annoncerne.
   Målt (mobil-throttle) betød det LCP 5.6s og CLS 0.67 — gitteret voksede
   fra 0 til fuld højde længe efter første maling, og kortets foto blev først
   opdaget dér. En crawler så et tomt <div id="results-grid">.

   Nu står den ufiltrerede første side i markuppen. js/search.js tegner
   nøjagtig det samme oven i, når data er hentet — samme funktion, samme
   data, samme rækkefølge — så der er ingen omrokering at se.

   B4 (23.08.2026): før hentede trinnet KUN vores egne annoncer (0 i drift)
   og sorterede dem "nyeste først" — altså den rækkefølge, søgesiden IKKE
   længere bruger som standard. Resultat i produktion: "build-srp: 0 kort",
   et tomt gitter i HTML'en, og LCP'en var et hotlinket foto, der først
   kunne opdages efter REST-kald + javascript (Lighthouse: 4,9 s, heraf
   2,2 s ren "load delay"). Nu:
     - hele lageret: egne annoncer (listings) + indekserede (eksterne_annoncer),
       gennem de SAMME oversættere som browseren (normalizeRemoteListing /
       normalizeExternalListing i js/backend-bridge.js);
     - sidens faktiske standardsortering, "blandet", fra js/sortering.js —
       flyttet derud fra js/search.js netop for at kunne køre her;
     - første korts foto preloades med fetchpriority=high, så LCP-billedet
       hentes, før et eneste script er kørt.

   Kortene bygges med SIDENS EGEN listingCardHTML fra js/components.js, som
   evalueres her med små stubbe for browser-globalerne. Duplikeres markuppen
   i stedet, driver de to fra hinanden ved første ændring.

   Kør:  node scripts/build-srp.js  (eller hele kæden: node scripts/build.js) */

const fs = require('fs');
const path = require('path');
const { ROOT, fetchListings, fetchExternalListings, browserModules } = require('./shared');

/* Hvor mange kort der forudtegnes i markuppen — IKKE sidestørrelsen.
   js/search.js viser 24 pr. side; de første 12 er dem, der kan nå at være
   over folden, og de eneste der betaler sig at have i HTML'en. Resten males
   af search.js i samme rækkefølge, så der ikke opstår en omrokering.
   Forudtegner man hele siden, fordobles markuppen for kort, ingen ser før
   de har scrollet. */
const PRERENDER_COUNT = 12;

(async () => {
  const { listingCardHTML, normalizeRemoteListing, normalizeExternalListing, Sortering } = browserModules();

  // Rækkerne skal gennem sidens egne oversættere, ellers mangler kortene
  // forhandler-badge, variant, kilde osv. i forhold til det, klienten tegner.
  const egne = (await fetchListings([]))
    .map(l => l.created_at ? normalizeRemoteListing(l) : l);
  const eksterne = (await fetchExternalListings()).map(normalizeExternalListing);
  const alle = egne.concat(eksterne);

  // Samme rækkefølge som search.js' standard ('blandet'): js/sortering.js,
  // som også er den, browseren kører. Determinismen er låst af
  // js/lager-determinisme.test.js og af brydeleddet ,id.asc i hentningen.
  const sorted = Sortering.sorter(alle.slice(), 'blandet');
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
  // i stedet for at vente på at billedet opdages nede i markuppen. For en
  // indekseret annonce er det kildens eget miniaturebillede (img-src i
  // CSP'en tillader kildernes billedværter); for en egen annonce er det
  // Supabase Storage. Begge er lige rigtige at preloade.
  const firstPhoto = (page[0] && page[0].photoUrls && page[0].photoUrls[0]) || null;
  const preload = firstPhoto
    ? `<link rel="preload" as="image" href="${firstPhoto}" fetchpriority="high" id="srp-lcp-preload">`
    : '<!-- id="srp-lcp-preload" (ingen foto at preloade) -->';
  const preloadRe = /<link[^>]*id="srp-lcp-preload">|<!-- id="srp-lcp-preload"[^>]*-->/;
  html = preloadRe.test(html)
    ? html.replace(preloadRe, preload)
    : html.replace('</head>', preload + '\n</head>');

  fs.writeFileSync(htmlPath, html);
  const udenFoto = page.filter(l => !Sortering.harFoto(l)).length;
  console.log(`build-srp: ${page.length} kort (af ${total}: ${egne.length} egne + ${eksterne.length} indekserede) `
    + `skrevet ind i soegning.html i blandet rækkefølge — ${udenFoto} af dem uden foto`
    + (firstPhoto ? `, LCP-foto preloadet.` : `, intet foto at preloade.`));
})().catch(e => { console.error('build-srp AFBRUDT:', e.message); process.exit(1); });
