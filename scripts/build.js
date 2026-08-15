/* Kører hele byggekæden i den rækkefølge, den skal køres i.

   Der er ingen CI her — GitHub Pages serverer filerne som de ligger commitet.
   Rækkefølgen betyder noget:

     1. build-listing-pages  laver annonce-<slug>.html for hver annonce.
                              Kan indlejre et forældet ?v= i css/js-links,
                              da den læser versionen fra index.html som den
                              ser ud NU — det retter trin 4.
     2. build-brand-pages    laver maerke-*.html, maerker.html, sitemap.xml
                              og robots.txt. Bruger samme listingSlug som
                              trin 1, så mærkesidernes links altid rammer en
                              side der faktisk findes.
     3. build-meta           lægger canonical/OG/Twitter og forsidens
                              JSON-LD ind i alle statiske sider. Springer
                              annonce-*.html over — de har allerede fået
                              deres eget i trin 1, skrevet ud fra selve
                              annoncen.
     4. stamp-version        stempler den aktuelle css/js-version på ALLE
                              HTML-filer, inklusive dem trin 1-3 lige skrev.
                              Skal være sidst.

   Kør efter enhver ændring i css/, js/, eller data i Supabase:
     node scripts/build.js */

const { execFileSync } = require('child_process');
const path = require('path');

const trin = ['build-listing-pages.js', 'build-brand-pages.js', 'build-srp.js', 'build-meta.js', 'stamp-version.js', 'inline-boot.js', 'inline-cookie.js', 'inline-analytics.js', 'inline-critical.js'];

for (const script of trin){
  console.log(`\n--- ${script} ---`);
  execFileSync('node', [path.join(__dirname, script)], { stdio: 'inherit' });
}

console.log('\nByg færdig.');
