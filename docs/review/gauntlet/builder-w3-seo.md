# builder-w3-seo — SEO-strøm, bølge 3 (16.10.2026)

Branch `gauntlet/w3-seo` fra main c4e8b15. Alt målt mod live Supabase (læst, aldrig skrevet): 2 egne + 602 indekserede annoncer.

## Fund -> rettelse -> bevis

| Fund | Rettelse | Bevis |
|---|---|---|
| S-005 (P2) fejlet hentning sletter alle egne annoncesider + sitemap-poster | `fetchListings(fallback, {kraevDatabase:true})` kaster i stedet for at give `js/data.js`' tomme liste (shared.js); brand-generatorens egen kopi kaster. `scripts/seo-vagt.js` `tjekAntal()` afbryder ved < 50 % af det sidst kendte gode: egne annoncer mod committede `annonce-*.html`, indekserede mod `scripts/sitemap-lastmod.json` meta, mærkesider mod `maerke-*.html`, sitemap-poster mod forrige byg (brand- og facet-trin). Alt FØR noget slettes/skrives. Bevidst fald: `BB_TILLAD_FALD=1`. | `scripts/seo-vagt.test.js` (12). Kørt på kopi: simuleret netværksfejl og simuleret `200 []` stopper listing-, brand- og facet-generatoren med klar fejl; 2 annoncesider, 25 mærkesider og sitemap uændret. |
| S-011 (P2) lastmod = byggedato | lastmod = hash af sidens synlige indhold (`<main>` + title + description; ?v=, CSP, CSS, "Senest bekræftet <dato>" ændrer ikke hashet) i `scripts/sitemap-lastmod.json`; datoen rykker kun ved ændret hash. Ukendt (ledgeren lige oprettet) => lastmod udelades. Annoncer: `updated_at`/oprettet. Guides: egen dato. Genberegnes i facet-trinnet på siderne som de ligger nu. | Før: 36/37 ens. Nu: 2 annoncer med egne datoer (08.10, 23.09), forside/søgning/facetsider i dag (de er ændret i dag), øvrige uden lastmod. Andet byg gav identisk sitemap (idempotent). Tests i seo-vagt.test.js. |
| Titler > 60 | guide-a2 62 -> 49+13 (`regler og krav`, guides-data.js + html), opret-annonce 61 -> 53, lange modelnavne: suffikset udelades, derefter "til salg" (FLSTC 75 -> 53). om-bikerbasen description 165 -> 151. S-009: om-indeksering fik egen description (var kopi af vilkår). | `node scripts/seo-audit.js`: 0 fund (før 6: 4 lange titler, 1 lang beskrivelse, 1 dublet). |
| S-007 modelsider | tærskel 10 -> 5 men kun med pris + årgang på >= 3 annoncer; søgenavn "CRF 1100 L Africa Twin" i title/H1 (slug uændret). 6 -> 15 sider. | 9 nye modelsider. |
| S-015 prisintervaller | `budget-under-30000/50000/75000/100000` (55/104/166/262 annoncer). | 4 sider. |
| S-016 byer | `by-thorsoe` (74), `by-horsens` (43), `by-skive` (21), `by-noerresundby` (12), `by-farum` (10). Grupperet på postnummer (Aarhus C/N/V = Aarhus). | 5 sider. |
| S-017d mærke+type | `mc-honda-cruiser` (41), `mc-honda-naked` (36), `mc-honda-touring` (33), `mc-harley-davidson-cruiser` (31). | 4 sider. |
| Krav-test | `scripts/seo-krav.test.js` fejler ved manglende/dubleret title/description/h1, !=1 h1, title > 60, sitemap-post uden side eller på noindex-side, indekserbar side uden sitemap-post, canonical != sitemap, dubletter, ugyldig lastmod. | 9 tests grønne. |

Sitemap: 43 -> 56 URL'er efter Critic-rettelserne (se runde 2 nedenfor; var 65). Kun indekserbare sider står i sitemap og i linkbåndet.

## Beslutninger: tærskler og afvisninger (alle i `scripts/seo-sider.js`, med tests)
- **Indeksering** kræver tærskel + udvalgt + ægte indhold (pris og årgang på >= 3). Under: noindex, aldrig 404 (som typerne). Åbne familier (model, by, mc) bygges kun når de kvalificerer, plus eksisterende filer (så en indekseret adresse aldrig bliver 404).
- **By**: >= 10 annoncer, og højst 80 % af landsdelens annoncer. Afvist: Rødding 346 (= 97 % af Syddanmark, dublet), Sæby/Tylstrup 9, Herning/Roskilde 8. Aarhus/København/Odense/Aalborg har 0 annoncer i lageret (alle annoncer står hos 7-8 forhandlere) — ingen tomme sider.
- **Mærke+type**: >= 15 og højst 75 % af typesidens annoncer. Afvist: Honda adventure 53/67 = 79 % (typesiden i andet ord; modelsiden Africa Twin dækker intentionen), Honda sport 10, BMW touring 9.
- **Priser**: 30/50/75/100.000; 150/200.000 udeladt (67 %/83 % af lageret = næsten hele søgningen).
- Søgningen kan kun filtrere på landsdel, ikke by: by-sider linker til landsdelen, siger det i knap og tekst, og har ingen tal-chips/filterfold, der ville vise byens tal og lande på landsdelens. Typesætninger ("Flest er naked") udelades, når under halvdelen af udvalget har en type (gælder budget/by).
- Duplicate content (6-gram Jaccard, kun tekst): nye sider max 26-48 % mod nærmeste side (modelsider tidligere 62-67 %).

## Interne links ind
Forsidens `.seo-links` (genereret blok): grupperne Budget, Byer, Populære modeller. Soegning.html: sektionerne "Søg efter budget/by". Type-siders mærkechips -> `mc-*` når den findes. Regionssider: "Byer i <landsdel>". Alle facetsider: "Se alle motorcykler efter budget"; budgetsider: "Andre prisklasser". Mærkesidernes type-fliser pege på `mc-*` ved næste fulde byg (`relinkMaerkesider`; mærkesider er ikke regenereret/committet her for at undgå merge med w3-data).

## Test af renderet side
Playwright mod fuldt byg (`build.js` på en kopi, port 8772): budget-under-50000, by-horsens, mc-honda-cruiser, model-honda-cb-1000-hornet x 1440/390 x lys/mørk: 0 overflow, 1 h1, hydrering ok, 0 konsolfejl (ekskl. kendte Supabase-CORS), 0 kontrastfund (tekst på fotopaneler undtaget fra automatikken, set i screenshots). Forside-linkbånd 1440/390 lys/mørk: ingen overflow. SEO før/efter for alle 91 sider (HEAD vs. nu): ingen ændring i robots/canonical/h1/JSON-LD/OG, ingen tabte interne links; ændringer = de ovenfor + nye links.

## Filer
Nye: `scripts/seo-vagt.js`, `seo-sider.js`, `seo-audit.js`, `sitemap-lastmod.json`, tests `scripts/seo-vagt.test.js`, `seo-sider.test.js`, `seo-krav.test.js`. Ændret: shared.js, build-listing-pages.js, build-brand-pages.js (kun robusthed + lastmod), build-facet-pages.js, guides-data.js; genererede: type-/koerekort-/region-/model-/budget-/by-/mc-*.html, index.html + soegning.html (kun `facet-links`-blokken), sitemap.xml; tekst: om-bikerbasen, om-indeksering, opret-annonce, guide-a2-koerekort (kun title/description).
**Testfiler til `npm test`** (Orchestrator): `scripts/seo-vagt.test.js scripts/seo-sider.test.js scripts/seo-krav.test.js` (+35). `npm test` nu 525/525 uden dem; `node --check` ok.

## DELT-ØNSKER
1. `package.json`: tilføj de tre testfiler.
2. `js/home.js` + `index.html` `#seo-price` ("Genveje"): peg "Under 30/50/100.000 kr." på `budget-under-*.html` via `.seo-links a[data-facet^="budget:"]` (som typer/regioner), eller fjern dubletten med det nye Budget-bånd.
3. Footer "Kategorier": evt. link til `budget-under-50000.html`.
4. Byggerækkefølgen i `scripts/build.js` skal blive brand -> facet -> guides (facet-trinnet genberegner lastmod og rydder egne sitemap-linjer idempotent). Fulde byg skal committe `scripts/sitemap-lastmod.json` med.

## Åbne punkter
- Ledgeren er tom for ældre sider: static/mærkesider har ingen lastmod, før deres indhold ændrer sig første gang (bevidst).
- Soegning har intet by-filter; ønskes det, kan by-siderne få samme søgekort/filtre som landsdelene.
- Forsidens `.seo-links` kan i fremtiden blive lang (8 modeller + byer); overvej tak.
- forhandler.html er indekserbar som skabelon uden title pr. profil (S-006 er klaret for annonce.html, ikke her).
- Honda-modeller dominerer; kildebredde er datakvalitetens, ikke SEO'ens, begrænsning.

---

## Runde 2 — rettelser efter blind Critic (ACCEPTER MED BETINGELSER)

**Sidetal efter runde 2:** sitemap 43 -> **56** (+13): budget 4, by 3 (thorsoe, horsens, skive), mc 4, model 2 nye (FLSTC, VLR 1800; de 6 gamle modeller uændrede). Fjernet igen (aldrig på main, derfor slettet frem for noindex): by-farum, by-noerresundby, model-cb-650-r, -cb-1000-r, -cb-1000-hornet, -cbr-650-r, -cl-500-a, -nc-750-x, -xl-750-transalp.

### P1-1 deploy-deadlock -> fail-soft (beslutning: hellere en advarsel end en låst pipeline)
- (a) **Absolut gulv 20** (`GULV` i seo-vagt.js): baseline under 20 sammenlignes ikke (0 af 2, 1 af 3, 2 af 5 giver ikke længere alarm). Undtagelse: listing-generatoren afviser 0 egne annoncer mod committede sider (`nulErFejl`) — nul er signaturen på en tom hentning, og ellers ville de to annoncesider slettes mens sitemap-posterne blev stående.
- (b) **Fail-soft i `scripts/build.js`:** de tre datatrin (listing/brand/facet) afslutter med exit 3 ved fald/hentefejl (`SEO_FALD`/`SEO_HENT`; også "nul i alt"-vagten). build.js fanger exit 3, SLETTER INTET (generatoren er stoppet før skrivning), beholder committede data-sider og sitemap, springer `build-srp` over (ville skrive et tomt gitter), kører resten og udgiver — med `::warning title=SEO-vagt::` og `[SEO_FALD-MARKØR]` i loggen, og slutlinjen "Byg færdig MED ADVARSEL". Alle andre fejl (exit != 0/3) stopper som før. Simuleret på kopi: `200 []` og netværksfejl -> exit 0, 25 mærkesider, 2 annoncesider, 60 SRP-kort og 56 sitemap-poster urørt.
- (c) **deploy.yml, præcis hvad der er ændret:** (1) `workflow_dispatch` fik ét boolean-input `tillad_fald` (default false); (2) build-trinnet fik `env: BB_TILLAD_FALD: ${{ inputs.tillad_fald && '1' || '' }}`; (3) ét `upload-artifact@v4`-trin efter `upload-pages-artifact` (ledgeren, til P1-2); (4) et nyt jobbet `lastmod` (se P1-2). Intet andet i filen er rørt.
- (d) **Opt-out:** `sources/*.yaml` med `aktiv: false` (kun læst, crawler urørt) trækkes ud af baseline (`inaktiveDomaener`). Flaget i databasen (`kilder.aktiv`) kan byggekæden ikke se: et fravalg skal derfor også stå i YAML'en, ellers startes udgivelsen med `tillad_fald = true`. Under alle omstændigheder kan opt-out ikke længere blokere noget — faldet giver kun en advarsel, og de committede sider bevares (OBS: de kan indeholde den fravalgte kildes annoncer til næste bevidste byg — start med tillad_fald, hvis opt-out skal slå igennem straks).
- (e) Fejlbeskeden nævner CI/build.js og de to udveje (`BB_TILLAD_FALD=1` lokalt, `tillad_fald` i workflowet).
- **P2-6:** hver kategori tjekkes for sig: egne og eksterne i alt skal holde 70 %, hver kilde 50 % (`tjekLager`, `meta.perKilde` i ledgeren); sitemap-gulv 70 %. 60 % delvis hentning stoppes nu.
- Tests: `seo-vagt.test.js` (gulv, nulErFejl, 70 %-kategorier, per kilde, opt-out, exit-koder, **build.js fail-soft simuleret med stub-trin**), plus kørsel på kopi (ovenfor).

### P1-2 lastmod -> ledger committes tilbage fra CI
Valgt: workflowet committer. Nyt job `lastmod` (`needs: deploy`, kun `main`, `permissions: contents: write` på jobbet): henter ledger-artefakten, `git pull --rebase`, kopierer filen, committer **kun** `scripts/sitemap-lastmod.json` og **kun hvis den er ændret**, besked `chore: sitemap-lastmod [skip ci]` (github-actions[bot]); GITHUB_TOKEN-push + skip ci => ingen løkke. Bemærk: crawl.yml har *ikke* en commit-præcedens (den har `contents: read` og skriver til databasen), så mønstret er standard bot-commit. Kræver at main tillader github-actions[bot] at pushe (branch protection). Kan ikke afprøves lokalt; YAML gennemlæst, ikke kørt. Fallback hvis det ikke ønskes: fjern jobbet, så vil sider uden committet hash få byggedagen — da bør lastmod fjernes helt.

### P2 indhold
1. **Modeller:** i det sænkede område (5-9 annoncer) tæller kun DISTINKTE annoncer (pris+årgang+km+kilde); fra 10 gælder den gamle regel uændret (de 6 eksisterende sider er urørte). CB 650 R/CB 1000 R m.fl. falder væk. FAQ "Hvad koster en brugt X" er nu neutral "Hvad koster en X" (kildeNyStatus findes ikke i denne gren).
2. **Byer:** ny side kræver 20 annoncer, eller 15 fra >= 2 kilder; hysterese: en allerede indekseret by-side (committet uden noindex) bliver, til lageret er under 8 (`beholdt`). Farum (10) og Nørresundby (12) har ingen side. Skive (21, én kilde) består på 20-reglen.
3. **Budget-description:** "Priser fra ca. X" = 5. percentil rundet til tusinde, kun ved >= 20 priser (var laveste pris 1.900 kr.).
4. **ItemList:** `numberOfItems` udelades, når listen ikke dækker alle viste annoncer (budget/by/mc: nu ingen tal der strider mod siden).
5. **Chips til noindex-sider:** "Andre typer/kørekort/landsdele"-chips peger på søgefilter, når målsiden er noindex (scooter/classic/cross, Sjælland). Eneste resterende links til dem er fra guide-foerste-motorcykel (ikke min fil).
6. se P1-1.
7. **Indlink:** modelsider har nu sektionen "Se også" med lignende modeller af samme hovedtype fra andre mærker og mærkets mærke+type-sider. mc-harley-davidson-cruiser: 2 indlink (model-FLSTC, type-cruiser); model-suzuki-vlr-1800: 5 (forside, 3 modelsider, type-cruiser).

**Måling runde 2:** `npm test` 525/525; nye testfiler 45/45 (seo-vagt 19, seo-sider 17, seo-krav 9) — Orchestrator tilføjer dem til package.json; `seo-audit`: 82 sider, 57 indekserbare, 0 fund; render (budget-under-30000, by-skive, mc-harley, model-suzuki x 1440/390 x lys/mørk) 0 overflow/konsolfejl/kontrastfund; SEO før/efter mod main: ingen ændring i robots/canonical/h1/JSON-LD/OG, eneste tabte links er de bevidst udskiftede links til noindex-sider.

---

## Runde 3 — rettelser efter anden blind Critic (AFVIST runde 2)

**deploy.yml er nu KUN `tillad_fald`-inputtet + `BB_TILLAD_FALD`-env på build-trinnet** (diff mod main: 7 linjer). `lastmod`-jobbet og `upload-artifact`-trinnet fra runde 2 er fjernet (ingen bot-commit til main). Runde 2-afsnittet om dem er hermed erstattet af nedenstående.

### P1-1 skadet sitemap
`scripts/build.js` tager snapshot af `sitemap.xml` og `scripts/sitemap-lastmod.json` FØR trinløkken og gendanner begge, hvis et datatrin er sprunget (alt eller intet — hele det committede sitemap, ikke et halvt). Advarslen er rettet: "De committede sider er beholdt, og HELE det committede sitemap gendannes". Test (seo-vagt.test.js): stub-brand skriver et halvt sitemap + ny ledger, stub-facet exit 3 -> begge filer er byte-identiske med før. Kørt på kopi med kun facet-hentningen fejlende: sitemap 56 urørt, srp sprunget over.

### P1-2 lastmod uden bot-commit
`lastmodFor` i CI (`GITHUB_ACTIONS`): er hashet lig det committede, bruges den committede dato; ellers UDELADES lastmod (byggedagen opfindes aldrig). `skrivLedger` returnerer tidligt i CI (CI ændrer aldrig ledgeren). Lokalt uændret. Arbejdsgang: kør `node scripts/build.js` lokalt og commit `scripts/sitemap-lastmod.json` sammen med siderne før push. Bivirkning: efter en crawl står datadrevne sider uden lastmod, til en lokal build committes (sandt og harmløst); `soegning` står oftest uden (hash skifter med blandet sortering). Tests: uændret data beholder datoen (også dagen efter), ændret/ny side -> ingen lastmod, ledger urørt, lokalt som før.

### P1-3 "sticky" efter bevidst fald/opt-out
Præcist: CI skriver aldrig ledgeren, så baseline er den committede. Efter `tillad_fald` (engangsudgivelse) eller en opt-out SKAL du køre lokalt `BB_TILLAD_FALD=1 node scripts/build.js` og committe `scripts/sitemap-lastmod.json` + de berørte sider; ellers springes brand/facet/srp over igen ved næste almindelige push (grøn pipeline, frosne data). Står i alle fejlbeskeder (`UDVEJE` i seo-vagt.js), i build.js-advarslen, i en kommentar i build.js og i inputbeskrivelsen. (Opt-out med `aktiv:false` i YAML trækkes ud af baseline automatisk, men ledgeren skal stadig committes efter første lokale build.)

### P2
- **P2-1:** (a) loft på slettede sider pr. byg (`tjekSletninger`): max 3 eller 5 % af sidemængden pr. familie (mærke-/annoncesider); derover SEO_FALD (fail-soft, siderne bevares) medmindre BB_TILLAD_FALD=1; (b) enhver sletning logges som `::warning title=Sider fjernet::` med filnavnene; (c) kategorigulv egne/eksterne hævet til 85 % (per kilde 50 %, sitemap 70 %). Kørt på kopi: 3 sjældne mærker droppet -> 3 sider slettet med warning; 8 droppet -> brand afbrudt, 25 mærkesider bevaret.
- **P2-2:** 0 egne annoncer med committede annoncesider er nu fejl i alle datatrin (`nulErFejl` også i brand/facet/srp), så annoncesider og sitemap-poster bevares sammen; hele sitemappet gendannes hvis ét trin springes. Når den sidste egne annonce bevidst fjernes: BB_TILLAD_FALD (se P1-3).
- **P2-4:** `build-srp.js` har egen vagt (`tjekLager` mod ledgerens tal; bruger nu `kraevDatabase`; exit 3 ved fald/hentefejl, også transiente fejl -> fail-soft i stedet for exit 1). Kørt: kun 100 eksterne rækker -> soegning.html bevares. build.js behandler srp som datatrin.
- **P2-3 (ÅBENT BESLUTNINGSOPLÆG, ikke implementeret):** fail-soft er "grøn" — kun en annotation. Forslag: et job efter `deploy` i deploy.yml, der fejler (rødt, mail) hvis build-loggen indeholder `[SEO_FALD-MARKØR]`, evt. plus skriv til `$GITHUB_STEP_SUMMARY`. Kræver at build-trinnet gemmer loggen (`tee`) og et lille grep-job; det er en CI-konfigurationsændring og ejerens beslutning.
- **P3:** model-tærsklen ≥10 tæller RÅT (kun området 5-9 tæller distinkte) — bevaret bevidst, så de seks eksisterende indekserede modelsider ikke ændrer status; ≥10 identiske lagerenheder kunne give en tynd side (notér). De tre testfiler (49 tests) tilføjes af Orchestrator til `npm test`. By-hysterese hviler på de committede sider: i CI uden commit er den et simpelt snit ved 8. Committede facetsider kan have forældede CSP-hashes; CI kører csp-hashes, men kør en fuld lokal build før merge.

**Måling:** `npm test` 525/525; `node --test` seo-vagt+seo-sider+seo-krav 49/49; `node --check` ok; `seo-audit` 82 sider/57 indekserbare/0 fund. Alle simuleringer kørt på kopier i scratch (`cd` + `pwd` kontrolleret), aldrig i hovedmappen.

---

## Runde 4 — Critic 3 (ACCEPTERET; P2-1..P2-3 taget før merge)

- **P2-1 (døde annonce-URL'er):** listing-generatoren sletter ikke længere selv, når den kaldes fra `build.js`: den skriver listen til `BB_SLETTELISTE`, og `build.js` sletter først SIDST og kun hvis intet datatrin er sprunget. Ved et sprunget trin udskydes sletningen (`[SEO_FALD-MARKØR] ... UDSKUDT`), så siderne, det gendannede sitemap og de ikke-opdaterede mærke-/budgetsider er konsistente; næste vellykkede byg sletter. Kørt direkte (`node scripts/listing...`) sletter den som før. Test: stub-kæde med 3 annoncesider og 2 på sletteliste — brand springes over: 3 står; alle lykkes: 1 står + warning. Kopi-simulering (3 sider, 2 hentet, facet/brand fejler): 3 står; uden fald: den solgte slettes.
- **P2-2 (netværksfejl):** `fetchExternalListings` fanger en kastet `fetch`-fejl og kaster `SEO_HENT` (netværk: ...) som ved HTTP-fejl -> exit 3, fail-soft. Test for både ECONNRESET og HTTP 502; kopi-simulering med ECONNRESET kun i brand: exit 0, committede sider bevaret. Dertil: `afslut()` udsætter `process.exit` 50 ms — ellers gav en afbrudt fetch en libuv-assertion på Windows (exit 3221226505) i stedet for exit 3. build-srp bruger nu samme `afslut`.
- **P2-3 (tillad_fald for bredt):** nul eksterne mod en kendt baseline er altid fejl, også under `BB_TILLAD_FALD` (`nulAltidFejl`; kun procent- og kildegulvene omgås). Bevidst fald uden nul og "sidste egne annonce solgt" omgås som før. Test.

### Åbne beslutningspunkter (IKKE implementeret)
1. **Frosset datalag er "grønt"** (P2-4 / P2-3 fra runde 3): sidste egne annonce(r) sælges (kun 2 i dag), opt-out uden YAML eller en lille kilde der falder til 0 fryser brand/facet/srp/sitemap, kun med en annotation, til `tillad_fald` + lokal committet build. Forslag: rødt afsluttende job på `[SEO_FALD-MARKØR]` eller `$GITHUB_STEP_SUMMARY` — ejerens beslutning.
2. **Modelsider uden mærkelinks, når kun facet springes over:** mærkesidernes modelchips/type-fliser relinkes i facet-trinnet; springes det over, står de committede mærkesider uden de nye links til næste fulde byg.
3. **Tynd modelside ved 10 identiske enheder:** tærsklen fra 10 tæller rå antal (bevaret for de seks eksisterende sider); distinkte tæller kun i 5-9-området.
4. **Budget-overlap:** 30k ⊂ 50k ⊂ 75k ⊂ 100k har lav unik tekst (6-13 %); intentionerne er forskellige, så de er beholdt; 75k kan droppes, hvis indeksbloat bliver et problem.

**Måling:** `npm test` 525/525; seo-vagt+seo-sider+seo-krav 52/52; `node --check` ok; `seo-audit` 0 fund. Alle build-simuleringer kørt på kopier i scratch.
