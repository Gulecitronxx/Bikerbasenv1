# Builder w9-discovery (Agent 4: discovery, category og content experience)

Branch `gauntlet/w9-discovery` (fra 21d132b). Billeder: 7 (kørekort A2), 8 (type Sport), 9 (mærke Yamaha), 10 (guide). Test: generatorerne er kørt på en SYNTETISK, større lagerfixture (308 annoncer, scripts/smoke-fixtures-former) i en kopi udenfor repoet (%TEMP%\w9-discovery\site), siderne er set via mock-baseret Playwright (route-mock af Supabase, annoncefotos = sitets egne type-fotos). Produktions-Supabase er ikke rørt; build.js/udgiv.js ikke kørt.

## Acceptkriterier (skrevet FØR arbejdet; bevis pr. kriterium nederst)
K1  Alle ejede sider: scrollWidth==clientWidth ved 320/390/768/1440, lys+mørk; ingen null/undefined/NaN i synlig tekst; CLS < 0,05; ingen konsolfejl udover kendt lokal Supabase/CSP-hash.
K2  SEO uændret: title, meta description, canonical, robots, JSON-LD og alle eksisterende interne links er identiske før/efter på alle genererede facet-/mærke-/guide-sider (script-sammenligning); seo-schema/seo-meta-laengde/seo-linkgraf grønne; sitemap kun bevidste tilføjelser.
K3  Type (billede 8): sektionen "Udforsk <type> efter behov" mellem udvalgte og modeller: 3-4 kort med foto (ægte annoncefoto fra udvalget, ellers typefoto), titel, kort tekst, ét tal og link; tal beregnes af lageret og stemmer med søgelinket; kort uden træf udelades.
K4  Kørekort (billede 7): informationsmoduler komplette: faktarække, 3 info-bokse, næste skridt, populære typer, modeller, guide-række med fotos; plus "Kort fortalt"-linje med sande tal. Intet opdigtet (billedets "A2 fra 18 år" er forkert, brugt ikke).
K5  Mærke (billede 9): annoncerækkens kort har ingen tomme huller/strakt højde; resten af strukturen bevares.
K6  Region/budget/by/model: samme skabelon som type/kørekort; region har by-fliser (kun byer med annoncer, antal beregnet) og type-fliser.
K7  Guides-oversigt (billede 10, oversigtsside): fremhævet guide, "Begynd her"-genveje efter situation, kompakte kort med læsetid, tydelig vej til søgning.
K8  Guide-artikel (billede 10): hero, Kort fortalt, indholdsfortegnelse, rettet typeflise-layout, afsluttende "Næste skridt"-panel med søgelinks, relaterede guides som fotokort, kilder. To nye guides med verificerbart indhold (motorcykeltyper; ordliste: ccm, kW/hk, kW/kg), hver med unik title/description/canonical/JSON-LD, med i sitemap.
K9  Tests: nye `scripts/w9-discovery*.test.js` låser tal=filter, udeladelse ved tomme data, ingen tal opdigtet; `node --check` og `npm test` grønt.

## Resultat pr. kriterium (bevis)
Test-setup: generatorerne kørt på syntetisk lager (308 annoncer) i kopi udenfor repoet; screenshots `%TEMP%\w9-discovery\out\before` (21d132b) og `\out\after` (1440/390 lys, 1440/320 mørk, viewport-segmenter).
- K1 OK: `smoke-browser` 320 målinger (40 sider x 320/390/768/1440 x lys+mørk): 0 CLS-, overflow-, null/NaN-, h1-, konsolfejl; 8 fund = ét ægte dødt link (`soegning.html&agent=1` på by-sider, fandtes før mig) som er rettet (re-smoke 0 fejl). Egne overflow-målinger 1440/390/320 lys+mørk: 0.
- K2 OK: SEO-sammenligning før/efter på 84 genererede sider: title/description/canonical/robots/h1 identiske, JSON-LD identisk undtagen `guides.html` (ItemList 5->7 guides, bevidst). Ingen mistede links (agent-linket er rettet, ikke mistet). `seo-audit` 0 fund; seo-schema/meta-laengde/linkgraf/krav grønne. Sitemap: kun `guide-mc-typer` og `guide-mc-ordliste` (2026-10-16) tilføjet.
- K3 OK: "Udforsk <type> efter behov" (type, region, mærke+type): fotokort fra annonce i udsnittet, tal = søgelinkets antal (test), udelades hvis <2 kort.
- K4 DELVIST: kørekortsidens moduler var allerede komplette; guide-række er udvidet (A2-guide, første mc, ordliste, brugt). "Kort fortalt" på facetsider er IKKE bygget (info-panel/faktarække dækker det).
- K5 OK: 4.-5. mærkekort mistede flex-kolonnen (display:block) -> tomt hul; rettet, CTA-foto lavere.
- K6 DELVIST: modelsider/mærke+type har ny faktatabel (spænd for ccm/hk/årgang/pris/km, kilder, kørekortfordeling summerer til N). Region-by-fliser med antal er IKKE bygget (hydreringen kan ikke tælle by; chips uden tal bevaret).
- K7 OK: guides-oversigt = magasinopsætning (stor + to + fire kompakte), "Fra guide til søgning" (kørekort/type/mærke fra lageret), fotokort, læsetid.
- K8 OK: guide-slutning "Klar til næste skridt" (3 veje), "Læs også" som fotokort, typeflise-pil fikset, 2 nye guides (typer, ordliste; kilder = BEK 550/2026, borger.dk, Bilbogen, forbrug.dk; ingen beløb/mærker; 35 kW ~ 47 hk = sitets A2_MAX_HK, testet).
- K9 OK: `npm test` 785/791 (de 6 røde er crawler/*.test.js: mangler @supabase/supabase-js i junction, uafhængigt af mig); `node --check` alt grønt.

## Nye/ændrede tests
Ny: `scripts/w9-discovery.test.js` (12 tests; Orchestrator tilføjer til npm test). Ændret: `scripts/guides.test.js` (7 guide-adresser, 4 guides dateret 2026-10-16).

## DELT-ØNSKER
1. Kør `build.js` (regenererer facet/mærke-sider med de nye moduler, CSP-hash for inline hydrering, sitemap-lastmod). Jeg har kun committet de 8 guide-sider (genereret uden fixturedata; sidebjælke og mærkeliste genbrugt fra committede sider) fordi seo-linkgraf kræver indlink til de nye guides; øvrige genererede sider er uberørte.
2. `package.json`: tilføj `scripts/w9-discovery.test.js`.
3. Header-nav "Artikler & guides" findes allerede; ønske: footer-link til guide-mc-typer/ordliste.
4. Merge-risiko: `css/p-facet.css`, `css/p-maerke.css`, `css/p-guides.css`, `scripts/build-facet-pages.js` er ændret i separate blokke (midt i filerne, ikke i bunden).

## Hvad ligner IKKE billederne endnu
- Fotografier: hero med rytter, mærkelogoer/slogans (Yamaha), AI-forfatterfoto i guide, frilagte modelbilleder i "Populære modeller"/"Nyeste" (ingen licenserede billeder; sitet har kun ét landskabshero + 8 typefotos).
- "Udforsk undertyper" (Supersport, Sports-touring ...) og brændstoftype: ingen data; erstattet af målbare intentioner.
- "Nyeste A2"-række, "Verificerede annoncer/fællesskab/svindelkontrol"-bokse, forfatter/"Af Mads Christensen", "Populære til begyndere": opdigtet/ikke belægges.
- Kort ved siden af CTA: 4 (5 fra 1560 px) mod billedets 5-6 af hensyn til læsbare kort.
- Billedernes grønne CTA er brandfarve; billedets "A2 fra 18 år" er forkert (20 år) og ikke kopieret.
