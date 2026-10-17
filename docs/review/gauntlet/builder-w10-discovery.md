# Builder w10-discovery (runde 2: kategori- og indholdssider)

Branch `gauntlet/w10-discovery` (fra 15c229c). Billeder: 7 (kørekort A2), 8 (type), 9 (mærke), 10 (guide).
Test: generatorerne køres på SYNTETISK lager (308 annoncer, som w9) i en byggekopi udenfor repoet (%TEMP%\w10-discovery\site); produktions-Supabase er ikke rørt; build.js/udgiv.js ikke kørt mod produktion.

## Acceptkriterier (skrevet FØR arbejdet; bevis pr. kriterium nederst)
K1  "Kort fortalt" på kørekort-, type-, mærke-, model-, region- (og kombi/budget/by-) sider: 3-4 punkter, hvert udledt af ægte data (tal fra lageret; regler fra facet-indhold/data.js-konstanter) og udeladt, hvis dataen mangler. Tal, der kan hydreres, står i `data-fa-n`/`data-mk-n` og genberegnes af klienten. Ingen opdigtede tal. Låst af test.
K2  Region: by-fliser med antal. Tallet regnes ved byg af samme filter som by-siden (postnumre) og genberegnes i klienten af samme postnumre; kun byer med egen indekserbar side (så hver flise har et ærligt link); 0 skjuler fliserne. Hrefs til by-siderne bevares.
K3  Guides: (a) indholdsfortegnelse sticky i højre spalte på desktop, sammenklappelig (details) på mobil; (b) "Kort fortalt" øverst (på mobil før artiklen); (c) læsetid beregnet af tekstlængde; (d) "Opdateret"-dato fra guides-data; (e) fotokort (læs også / oversigt) gentager aldrig samme billede ved siden af hinanden; (f) "Læs også" peger på guide-mc-typer/guide-mc-ordliste, hvor det er relevant.
K4  Hero på kategorisider (kørekort/type/region/model/mærke): modigere typografi og kontrast uden nye assets (større h1, kicker, tillidsrække i heroens fod); AA-kontrast lys+mørk.
K5  SEO uændret: title, description, canonical, robots, JSON-LD og alle eksisterende interne links identiske før/efter (scripts-sammenligning); seo-audit 0 fund.
K6  udgiv.js: `node scripts/udgiv.js` i byggekopien melder ingen ugyldige/dynamiske referencer fra mine sider (ingen href="…" i inline-scripts/kommentarer).
K7  smoke-browser: 320/390/768/1440 lys+mørk: 0 overflow, 0 NaN/null/undefined, CLS < 0,05, 0 konsolfejl (bortset fra kendt Supabase/CSP lokalt).
K8  Tests: nye `scripts/w10-discovery*.test.js`; `node --check` alt og `npm test` grønt (kendt: crawler-tests kræver node_modules; llms.txt gendannes).
