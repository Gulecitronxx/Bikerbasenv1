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

Sitemap: 43 -> 65 URL'er (+22, alle indekserbare). Kun indekserbare sider står i sitemap og i linkbåndet.

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
