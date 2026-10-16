# Critic w5-seo (bølge 5) — DELRAPPORT

Blind kritik af `gauntlet/w5-seo` (HEAD 883f64d, baseline 3caffd2). Alt målt på kopier i temp (`git archive` af begge commits), mock-fetch (ingen netværk, ingen produktionslæsning), egne fixtures (722 og 813 rå annoncer, 27 mærker). Intet kørt i hovedmappen eller worktreen.

## 1. Chips (F2-004/F2-005) — status: OK på statisk HTML, ét åbent punkt

Metode: egen fixture (CB 1000 / CB 1000 R / CBR 1000 F / Fireblade, CRF 110 F vs Africa Twin, 10 identiske NX 500, modeller med komma, `&`, `/`, `'`, dobbelt mellemrum, punktum, bindestreg). Generatorerne kørt på kopi. For hver `<a>` med tal på hver genereret side: href parset med EGEN udklipning af `readStateFromURL` fra js/search.js (vm) og evalueret med `Filtrering.anvendFiltre`. Krydstjek mod Builderens klip (`seo-chip-tjek.js`).

| Kørsel | Chips tjekket | Afviger | Dublet-nøgler | Klip-drift (mit vs. Builders) |
|---|---|---|---|---|
| BEFORE (3caffd2), fixture 1 | 2481 | 66 (budget 14, mærke 6, model 16, region 30) | 5 (`maxPrice` x2) | 0 |
| AFTER (883f64d), fixture 1 | 2466 | 0 (2 falske positiver i min parser: link uden tal) | 0 | 0 |
| AFTER, fixture 2 (+13 mærkelige modelnavne) | 2689 | 0 | 0 | 0 |

- Builderens klip er identisk med min egen i alle 2,5 k hrefs (ingen drift). Fejlene i BEFORE reproduceres uafhængigt (fx `Under 30.000 kr. · 64` -> søgningen viser 576; `CB 1000 72 annoncer` -> modelsiden har 7), så rettelsen er reel.
- De COMMITTEDE sider i worktreen har stadig 5 links med dobbelt `maxPrice` (budget-under-100000/-50000/-75000); forsvinder først ved regenerering (Orchestratoren).
- Chips uden tal (ærligt og konsistent): by (`Se hele Midtjylland i søgningen`), modelnavne med komma, kategori A pga. `kanNedsaettesA2`. `kanNedsaettesA2` findes kun på egne annoncer (`listings`, 0 rækker i drift) så A-chips beholder tal i praksis.

### Fund
- **P2-1 (dødt link, ikke forkert tal):** modelnavn med komma ("XSR 700, Legacy", "Speed Twin 1200, RS") får en indekserbar modelside, hvis `Se alle i søgningen`, årgang-/pris-/km-chips og `Få besked om nye annoncer` (agent=1) peger på `model=XSR%20700%2C%20Legacy`. Søgesiden splitter på komma -> 2 modeller -> **0 resultater**. Før brugte siden `q=`, som virkede. Anbefaling: for `kanStaaIUrl=false` udelad linket eller fald tilbage til `q=` (uden tal) i stedet for `model=`. Tæl også søgeagent-knappen med.
- **P3-1:** `Se alle N i søgningen` på modelsider har rå `&` i href (andre har `&amp;`). Gyldigt i attributter, men inkonsistent.
- **ÅBENT (kan være P1):** klient-hydreringen i `build-facet-pages.js` (linje ~1785, `tael()`) omregner ALLE `[data-fa-n]`-tal i browseren med EGNE regler (`type`, `region`, `kk`, `pris`, `aar`, `km`, `model` på `traef`, ikke via `seo-soeglink`/`anvendFiltre`). Den statiske HTML er korrekt, men efter hydrering kan chippens tal afvige fra søgelinket (fx `model:`-chips filtreres inden for sidens `traef`, mens linket går til alle typer). Måles med Playwright mod kopi (route-mock) — se opdatering nedenfor.

(Rapporten opdateres efter hvert punkt.)

---
# FULD RAPPORT (erstatter delrapporten ovenfor, pkt. 1-7)

## Samlet dom: ACCEPTER (betingelse: ret P2-1 før/ved integration, tag bevidst stilling til P2-2)
Ingen P0/P1. Ingen chip lover et forkert tal i de genererede sider; alle 658 tests er grønne.

## 1. Chips: tal = linkets resultat (bevist uafhængigt)
Uændret fra delrapporten, plus hydrering (browser-kørsel mod kopi, Playwright med route-mock, ingen ekstern trafik).

| Måling | Resultat |
|---|---|
| Statisk HTML, AFTER, 2 fixtures (2466 + 2689 chips) | 0 afvigelser, 0 dublerede query-nøgler, 0 klip-drift |
| BEFORE med samme fixture | 66 afvigelser, 5 `maxPrice` x2 (rettelsen er reel) |
| Hydreret (60 sider, `tael()`-omregning i browseren) | 366 søgelink-chips: 27 afvigelser, alle på mærkesider og alle forklaret af mockens 51 demo-annoncer fra js/data.js (mærkesidens hydrering tæller dem ikke, søgningen gør). Facet-sider (type, region, kørekort, budget, by, mc, model): 0 afvigelser. Model-chips (82): 4 afvigelser, samme demo-årsag |

Det åbne spørgsmål fra delrapporten er lukket: klient-hydreringens egne regler giver de samme tal som søgelinket på alle målte sider. `tael()` er dog en ANDEN implementering end `seo-soeglink.js`; de stemmer i dag, men intet test låser det i browseren.

Builderens `readStateFromURL`-klip er udklippet direkte fra js/search.js og giver identisk state som mit eget klip for alle ca. 5.000 hrefs.

### Fund
- **P2-1 (dødt link):** modelnavne med komma ("XSR 700, Legacy", "Speed Twin 1200, RS") får indekserbar modelside, hvis "Se alle i søgningen", år/pris/km-chips og "Få besked" (agent=1) peger på `model=…%2C…`. Søgesiden splitter på komma, så resultatet er 0. BEFORE brugte `q=` og virkede. Ret: ved `kanStaaIUrl=false` udelad linket eller brug `q=` uden tal.
- **P2-2 (SEO, regressionsrisiko):** baseline-sitemappet har 8 modelsider (bl.a. model-honda-nx-500). Med den nye regel (mindst 3 distinkte) kan sider som NX 500 (identiske dealerenheder) blive noindex og forlade sitemappet uden redirect og uden hysterese (byer har "beholdt til under 8"). Sandsynligvis rigtigt for tynde sider, men beslut bevidst. Intet i min fixture ændrede indekserbarhed (58 indekserbare, 5 noindex både før og efter).
- **P3-1:** `distinkte()` nøgle = pris, årgang, km, kildedomæne. 5 annoncer helt uden pris/årgang/km fra samme kilde tæller som 1 distinkt og vises som ét kort med teksten "identiske lagerenheder", selv om de blot mangler data. Konservativt, men teksten er upræcis.
- **P3-2:** "Se alle N i søgningen" på modelsider har rå `&` i href (resten `&amp;`). Gyldigt i attributter.
- **P3-3:** `titelFor` falder til 65 tegn for et opdigtet meget langt mærkenavn (sidste kandidat har ingen længdetjek). Ingen rigtige mærker berørt.
- **P3-4:** medianårgang rundes op (2015,5 til 2016) i budgetafsnittet.
- Committede sider i worktreen har stadig de 5 dobbelte `maxPrice`-links; forsvinder først ved regenerering.

Chips uden tal: by, modelnavne med komma og kategori A når `kanNedsaettesA2` er sat. Konsistent og ærligt; `kanNedsaettesA2` findes kun på egne annoncer (0 i drift), så A-chips beholder tal i praksis.

## 2. T-001/T-002 titler
| Input | Udfald |
|---|---|
| guide-a2-koerekort | title "A2-kørekort: regler, alder og krav | Bikerbasen" (47), H1, breadcrumb, oversigtskort, Article-headline og og:title identiske. Brødtekst-diff mod baseline: kun disse strenge ændret, fakta uændrede |
| koerekort-a2 | uændret "Motorcykler til A2-kørekort" |
| 27 mærker (fixture), alle ≤ 56 tegn | Harley-Davidson 56, Royal Enfield 54, Lauge Jensen 53, FB Mondial 51, Moto Guzzi 51. "Brugte" udelades når der er nye enheder (Honda, Kymco) |
| Dubletter, JSON-LD, og:title | 0 dublerede titler på 130 indekserbare sider, alle 255 JSON-LD blokke parser, og:title = title |
| `seo-audit` (kopi) | 82 sider, 57 indekserbare, 0 fund |

Kannibalisering: "a2 kørekort regler/alder" til guiden, "motorcykler til A2" til koerekort-a2 og søgesider. Ingen ny overlapning fundet.

## 3. T-003 modelsider (egen matrix, `modelKvalificerer`)
| Rå / distinkte | Indekserbar |
|---|---|
| 0–10 identiske (1 distinkt) | nej |
| 5 rå, kun km forskellig (5 distinkte) | ja |
| 5 rå, kun kilde forskellig | ja |
| 5 rå, 2 distinkte | nej |
| 5 rå, 3 distinkte | ja |
| 10 rå, 3 distinkte + 7 dubletter | ja |
| 4 rå, 4 distinkte | nej (under 5 rå) |
| 5 rå uden pris/år/km, samme kilde | nej (P3-1) |

Definitionen er rimelig. NX 500-siden i fixture: kort og noscript dedupes, forklarende linje til stede. Noindex-sider er ikke i sitemap og ikke linket fra indekserbare sider (pkt. 5).

## 4. T-004 budgetsider (egen måling, 6-gram Jaccard)
| Variant | Max overlap før | Max overlap efter |
|---|---|---|
| Synlig tekst, min fixture (722 annoncer) | 39,8 % | 26,1 % |
| Med noscript | 44,6 % | 40,7 % |

Builders pseudo-lager (kort fyldt med ens boilerplate) gav 78,7 til 63,8 % og 54,6 til 47,4 %; mit lager har varierende data og når målet ≤ 55 %. Forbedringen er reel, men det absolutte niveau afhænger af, hvor ens kortene er. Afsnittene er sande: antal, medianpris, medianårgang, typer og mærker matcher min uafhængige beregning (30.001–50.000: 181 annoncer, 41.000 kr., 2013, naked 67 + adventure 40, Honda 54, Yamaha 35, BMW 15); grænser (lo, max] korrekte; 10 uden pris nævnes ærligt. Anbefaling: behold alle 4 sider; 100.000-siden dækker ca. 98 % af lageret og er den svageste kandidat til konsolidering hvis overlap senere stiger.

## 5. T-006/T-007
- Description "Priser fra X" = sidens egen "fra X": 0 uoverensstemmelser.
- ItemList: 0 forekomster i fixture (ingen side viser alle annoncer), i tråd med reglen; breadcrumbs har 0 led til /soegning.
- Interne links: 8.778 links fra genererede sider, 0 døde. Eneste indekserbar til noindex er header-linkene mine-annoncer og login (kendte).
- SEO-diff mod baseline over alle rod-HTML (samme fixture): kun budget (description, LD), by og mc (description), mærke (title), type/region/kørekort (LD) er ændret; ingen andre sider.

## 6. T-009 / T-010
Forslaget `/^llms\.txt$/,` efter `/^sitemap\.xml$/,` i RODMOENSTRE i scripts/udgiv.js er sikkert (eksakt rod-match). Indhold genereres i byggetrinnet, kun sandt: hvad sitet er (aggregator, vi linker til kilden), sidetyper med URL'er fra sitemap, datagrundlag, "handel sker hos kilden"; ingen tal. Hub (T-010) er kun et forslag.

## 7. Regression
- `npm test` på ren kopi: 658 pass, 0 fail. `node --check` på alle js/crawler/scripts OK. seo-vagt-tests grønne.
- Render (mock-genererede sider, hydreret) af budget-under-75000, type-naked, koerekort-a2, maerke-honda, model-honda-nx-500, by-aarhus, region-midtjylland ved 1440 og 390, lys og mørk: 0 px overflow, 1 h1, ingen konsolfejl (efter csp-hashes på kopien).

## Til Orchestratoren ved integration
1. Byg alt på ny (sitemap, facet-, mærke- og guide-sider); verificér at de 5 dobbelte `maxPrice`-links er væk.
2. Ret P2-1 (komma-modeller) og beslut P2-2 (hysterese for eksisterende indekserede modelsider).
3. Udgiv-allowlist: tilføj `/^llms\.txt$/,` først når et byggetrin skriver filen.
4. a2Status fra w5-funktion skal erstatte "kræver A" her: `build-facet-pages.js` linje 348 (`kraeverA`), 515 (`soeg` koerekort A + hkMin), 1068 (skjult hkMin), 1721 (inline kopi af A-reglen), 1778 (hydrering `passerKoerekort`), `facetSearchUrl`; `build-brand-pages.js` ca. linje 590, 597, 652 (A-tekster) og `koerekort=A`-fliserne i `facetLinksFor`/`treKolonnerHTML`; `seo-soeglink.js` `erPraecis` for A. Chip-tal og hydrering skal skifte regel samtidig; kør `facet-sider.test.js` og `maerkeside.test.js` efter skiftet.
5. Overvej en test, der låser klientens `tael()` mod `seo-soeglink`.
