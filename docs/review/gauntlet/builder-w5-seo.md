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

## Bevis pr. kriterium

Alle tal er målt på kopier i temp (`git archive` af 3caffd2 = FØR, af HEAD = EFTER) med fixtures/mock. Ingen generator er kørt i worktreen, `build.js` er ikke kørt, intet er hentet fra produktion.

| ID | Resultat | Før -> efter |
|---|---|---|
| F2-004 + F2-005 | Opfyldt. Ét modul `scripts/seo-soeglink.js` bygger alle søgelinks af ét filterobjekt; chippens tal regnes af samme objekt. Modelchips bruger `model=` (eksakt, understøttet af js/search.js), aldrig `q=`. Mærkeside-fliser linkes først til modelside/kombi-side, når sidens antal = flisens tal. Facetter søgningen ikke kan udtrykke præcist (by, kategori A pga. `kanNedsaettesA2`, modelnavn med komma/dobbelt mellemrum) får ingen tal (`erPraecis`). | Integrationstest over fixturelager, 737 tjekkede chips FØR: 60 afviger, 5 links med dobbelt `maxPrice`. EFTER: 711 chips, 0 afviger, 0 dubletter. Tester: `facet-sider.test.js`, `maerkeside.test.js` (bruger `readStateFromURL` klippet ud af js/search.js + `Filtrering.anvendFiltre`). |
| T-001 | Opfyldt. `A2-kørekort: regler, alder og krav` i title/H1/breadcrumb/oversigtskort/Article-headline (47 tegn med suffix). koerekort-a2 uændret. | tests i `guides.test.js` + `facet-sider.test.js`. `seo-audit`: 82 sider, 57 indekserbare, 0 fund. |
| T-002 | Opfyldt. `{Brugte }{Mærke}-motorcykler til salg — Bikerbasen`, falder pænt (først suffiks) over 60 tegn. | `maerkeside.test.js` |
| T-003 | Opfyldt. Tærskel og `harIndhold` på `distinkte()` (>= 3 distinkte, >= 5 rå). Kort + noscript dedupes, også ved hydrering; linje siger "N af de M annoncer er identiske". NB: i området 5-9 rå annoncer sænkes kravet fra 5 til 3 distinkte (én regel i stedet for to; følger opgavens "under 3 distinkte -> noindex"). | 10 ens: 1 distinkt -> noindex, 1 kort. Test i `seo-sider.test.js` + `facet-sider.test.js`. |
| T-004 | DELVIST. Eget interval (lo, max] vises først i kortlisten (også efter hydrering), og introen får et datadrevet afsnit (antal, medianpris, medianårgang, typer, mærker i intervallet). Titel/H1 "under X" uændret. | 6-gram Jaccard på synlig tekst (uden noscript), pseudo-lager udledt af de committede siders lister (262 annoncer, 55/104/166/262): max 78,7 % -> 63,8 % (30k<->50k 65,2 -> 51,9; 75k<->100k 78,7 -> 63,8). Med noscript: max 54,6 -> 47,4 %. Målet <= 55 % nås med noscript, men ikke på ren synlig tekst: resten er kortenes ens boilerplate ("Ingen fotos i denne annonce", "Kørekort ukendt …" x24 pr. side, i pseudo-lageret uden ccm/hk) plus header/footer og skabelon. Rest kræver ændring af kortmarkup (js/components.js, ikke min) eller færre kort pr. side — beslutning. |
| T-005 | Ikke min strøm. | |
| T-006 | Opfyldt. Description siger `Priser fra {sidens laveste pris}` (samme `prisOgAargang`-tal som sidens tekst); "fra ca." og 5. percentil fjernet. | test i `facet-sider.test.js` |
| T-007 | Opfyldt. ItemList skrives kun, når den dækker alle annoncer (facet- og mærkesider; ellers udeladt). Breadcrumb-mellemled ("Budget", "Type", "Landsdel", "Kørekort") -> `/soegning` fjernet. | JSON-LD-test over alle facetsider parser, ItemList-antal = sidens antal, intet led peger på /soegning. |
| T-009 | `llms.txt` ikke bygget. DELT-ØNSKE (scripts/udgiv.js, delt lag): tilføj linjen `/^llms\.txt$/,` lige efter `/^sitemap\.xml$/,` (linje 63) i allowlisten. Indhold bør genereres af sitemap-trinnet (sidetyper + URL'er fra sitemap, datagrundlag, "indekseret fra danske forhandlere, handel sker hos kilden"; ingen tal). | |
| T-010 | Kun forslag: `brugte-motorcykler`-hub (type/mærke/pris-links) med samme skabelon/noindex-regler som facetterne. Kræver friskt lager — beslutning. | |

## Rendering (kopi i temp, fixtures, port 8802)
budget-under-75000, model-honda-nx-500, koerekort-a2, type-naked ved 1440 og 390, lys og mørk: 0 px horisontal overflow, 1 h1. Konsol: kun CSP-fejl for sidens inline-hydreringsscript, fordi kopien ikke har kørt `csp-hashes.js` (hashes beregnes af det rigtige byg); ingen andre fejl.

## Verifikation
`npm test`: 658 grønne (baseline 645, +13). `node --check` på berørte scripts OK. `node scripts/seo-audit.js` (read-only): 0 fund.
Ikke ændret: crawler/, sources/, supabase/, js/, css/, package.json, scripts/udgiv.js.
