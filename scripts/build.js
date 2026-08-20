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
     3. build-facet-pages    laver type-*.html og koerekort-*.html (SEO-runde
                              3, facet-builder) — statiske sider for
                              motorcykeltype og kørekortkategori, det hul
                              soegning.html?type=/?koerekort= ikke kunne lukke
                              selv (den er noindex og client-side). Kører
                              EFTER trin 2, fordi den UDVIDER det sitemap.xml,
                              trin 2 lige skrev, med de facetter der har nok
                              annoncer til at være mere end en tynd side —
                              se filens eget hoved for tærsklen og tallene
                              bag den.
     4. build-meta            lægger canonical/OG/Twitter og forsidens
                              JSON-LD ind i alle statiske sider — DERFOR skal
                              trin 2+3's filer findes FØR den kører, ellers
                              får facet-siderne aldrig deres delelistetags.
                              Springer annonce-*.html over — de har allerede
                              fået deres eget i trin 1, skrevet ud fra selve
                              annoncen.
     5. stamp-version        stempler den aktuelle css/js-version på ALLE
                              HTML-filer, inklusive dem trin 1-4 lige skrev.
                              Skal være sidst.

   Kør efter enhver ændring i css/, js/, eller data i Supabase:
     node scripts/build.js */

const { execFileSync } = require('child_process');
const path = require('path');

const trin = ['build-listing-pages.js', 'build-brand-pages.js', 'build-facet-pages.js', 'build-srp.js', 'build-meta.js', 'stamp-version.js', 'inline-boot.js', 'inline-cookie.js', 'inline-analytics.js', 'inline-critical.js'];

for (const script of trin){
  console.log(`\n--- ${script} ---`);
  execFileSync('node', [path.join(__dirname, script)], { stdio: 'inherit' });
}

console.log('\nByg færdig.');
