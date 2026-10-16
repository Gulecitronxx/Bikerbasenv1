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
     6. inline-*             lægger bootstrap/cookie/analytics/kritisk CSS ind
                              som inline-scripts og -styles.
     7. csp-hashes           SIDST: hasher hver sides inline-scripts ind i
                              script-src i stedet for 'unsafe-inline'. Alt,
                              der rører et inline-script, skal køre FØR.

   Kør efter enhver ændring i css/, js/, eller data i Supabase:
     node scripts/build.js */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { EXIT_FALD } = require('./seo-vagt');

const trin = ['build-listing-pages.js', 'build-brand-pages.js', 'build-facet-pages.js', 'build-guides.js', 'build-srp.js', 'build-meta.js', 'stamp-version.js', 'inline-boot.js', 'inline-cookie.js', 'inline-analytics.js', 'inline-critical.js', 'csp-hashes.js'];

/* FAIL-SOFT for datatrinnene (S-005, blind Critic P1-1).
   De tre generatorer, der HENTER annoncer og kan slette sider, afslutter med EXIT_FALD (3), hvis
   hentningen fejler eller lageret er faldet drastisk (scripts/seo-vagt.js). Det må ikke låse hele
   udgivelsen: så kunne ingen rettelse komme ud, så længe faldet består. I stedet beholdes de
   COMMITTEDE sider og sitemap-poster uændret (generatoren har intet slettet), og resten bygges og
   udgives — med en tydelig advarsel i loggen og som GitHub Actions-annotation. Et bevidst fald
   (fx en fravalgt kilde) slippes igennem med BB_TILLAD_FALD=1 / workflow-inputtet tillad_fald. */
const DATATRIN = new Set(['build-listing-pages.js', 'build-brand-pages.js', 'build-facet-pages.js', 'build-srp.js']);

/* Sitemap og lastmod-ledger skrives af FLERE trin (brand skriver, facet og guides udvider). Fejler kun ét
   af dem, ville et halvt sitemap blive udgivet (sitemap.xml uden facet-poster). Derfor snapshot før
   løkken og gendannelse af begge filer, hvis et datatrin er sprunget: sitemappet er alt-eller-intet,
   hele det committede sitemap fra før buildet. */
const SNAP = ['sitemap.xml', 'scripts/sitemap-lastmod.json'].map(f => path.join(__dirname, '..', f))
  .map(p => [p, fs.existsSync(p) ? fs.readFileSync(p) : null]);

/* EFTER et bevidst fald / en opt-out (P1-3): CI skriver aldrig ledgeren, så baseline er den, der er committet.
   Kør lokalt `BB_TILLAD_FALD=1 node scripts/build.js` og commit scripts/sitemap-lastmod.json + de berørte sider.
   Uden den commit springer næste almindelige push brand/facet/srp over igen. */
/* Trin, der ogsaa henter lageret og ville skrive et TOMT resultat ind, hvis hentningen er fejlet:
   soegesidens foerste resultatside (build-srp). Springes over, naar et datatrin er afbrudt, saa den
   committede side med sine kort bliver staaende frem for et tomt gitter. */
const AFHAENGIGE = new Set(['build-srp.js']);
const faldTrin = [];

for (const script of trin){
  console.log(`\n--- ${script} ---`);
  if (faldTrin.length && AFHAENGIGE.has(script)){
    console.log(`[SEO_FALD-MARKØR] ${script} sprunget over — lageret kunne ikke hentes; den committede side bevares.`);
    continue;
  }
  const r = spawnSync('node', [path.join(__dirname, script)], { stdio: 'inherit' });
  if (r.status === EXIT_FALD && DATATRIN.has(script)){
    faldTrin.push(script);
    console.log(`::warning title=SEO-vagt::${script} afbrudt af fail-safe (tomt/drastisk faldet lager). De committede sider er beholdt, og HELE det committede sitemap gendannes; resten udgives. Er faldet bevidst (opt-out/solgt lager): kør lokalt 'BB_TILLAD_FALD=1 node scripts/build.js' og commit scripts/sitemap-lastmod.json + de berørte sider (ellers springes trinnet over igen), eller start 'Byg og udgiv' med tillad_fald = true.`);
    console.log(`[SEO_FALD-MARKØR] ${script} sprunget over — committede data-sider bevaret.`);
    continue;
  }
  if (r.status !== 0){
    console.error(`\n${script} fejlede (exit ${r.status === null ? 'signal ' + r.signal : r.status}).`);
    process.exit(r.status || 1);
  }
}

if (faldTrin.length){
  for (const [p, b] of SNAP) if (b) fs.writeFileSync(p, b);   // sitemap + ledger: alt eller intet
  console.log('[SEO_FALD-MARKØR] sitemap.xml og scripts/sitemap-lastmod.json gendannet fra før buildet.');
  console.log(`\n::warning title=SEO-vagt::Byg færdig MED ADVARSEL — sprunget over: ${faldTrin.join(', ')}. Data-sider og sitemap er IKKE opdateret fra databasen.`);
  console.log('[SEO_FALD-MARKØR] Byg færdig med advarsel (se ovenfor).');
} else {
  console.log('\nByg færdig.');
}
