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
