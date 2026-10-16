# Builder w5-seo (bølge 5) — SEO og chip-tal

Branch `gauntlet/w5-seo` fra `3caffd2`. Baseline `npm test`: 645 grønne.
Kilder: `detective2-seo.md` (T-001..T-019), `detective2-funktion.md` (F2-004, F2-005), `meta-gauntlet-2.md`.
Proces (meta-gauntlet 2): acceptkriterier skrevet FØR bygning, tests først, forenkling frem for undtagelser.
Alle generator-kørsler er sket på en kopi i temp med fixtures/mock; ingen produktionslæsning, ingen `build.js`.

## Acceptkriterier (skrevet før kode)

| ID | Kriterium (målbart) | Bevis |
|---|---|---|
| F2-004 + F2-005 | ALLE chips med et tal på alle genererede sider (budget, type, region, kørekort, mærke, by, mc, model) linker til en destination, hvis resultat har PRÆCIS chippens tal. Ingen link har en gentaget query-parameter. Rod rettes ét sted: ét modul bygger søge-href fra ét filterobjekt (hver nøgle højst én gang), og chippens tal regnes af SAMME filterobjekt med `Filtrering.anvendFiltre`. | Integrationstest: fixtures -> `side()` for alle facetter + mærkesidens chips; hver `<a href>` med tal parses, href'ens filtre læses med søgesidens EGEN `readStateFromURL` (klippet ud af js/search.js) og evalueres med `Filtrering.anvendFiltre` (`browserModules()`); antal == chippens tal. Hrefs til statiske sider (`slug.html`) regnes med sidens egen `facet.match`. |
| T-001 | Guiden `guide-a2-koerekort` har informationsintention: title/H1/breadcrumb/kort/Article-headline/OG = én tekst `A2-kørekort: regler, alder og krav` (title inkl. suffix <= 60). `koerekort-a2` beholder `Motorcykler til A2-kørekort`. Guidens indhold/fakta uændret. `guides.test.js` tilpasset. `seo-audit` 0 fund. | test + diff |
| T-002 | Én titelformel for alle kvalificerede mærkesider: `{Brugte }{Mærke}-motorcykler til salg — Bikerbasen`, "Brugte" kun når `standOpgoerelse.renBrugt`; <= 60 tegn (lange navne afkortes pænt, aldrig midt i et ord); antal/pris står i description. | `maerkeside.test.js` |
| T-003 | Kortlisten på modelsider dedupes med `distinkte()`; `harIndhold` og tærskel tæller distinkte; < 3 distinkte -> noindex og ikke i sitemap. 10 identiske dealerenheder = 1 distinkt = noindex. Siden siger selv, at identiske enheder er samlet. | test med fixtures |
| T-004 | Budgetsidernes indbyrdes 6-gram-Jaccard på synlig tekst (før/efter, samme datagrundlag) <= 55 %. Intentionen "under X kr." bevares. Kun ægte tal fra data. | måling i rapporten |
| T-005/6/7 | (T-005 er i en anden strøm.) Description og side siger samme "fra"-tal. JSON-LD: ItemList kun hvis den dækker alle viste annoncer, ellers udeladt; breadcrumb-mellemled uden indekserbar side fjernes. Alle JSON-LD blokke parser. | test |
| T-009/10 | `llms.txt`: kun hvis den kan genereres uden at ændre udgiv-allowlisten, ellers DELT-ØNSKE med præcis linje. Hub-forslaget kun som forslag. | rapport |
