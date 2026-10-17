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

## Resultat pr. kriterium (bevis)
Setup: syntetisk lager (308 annoncer) i byggekopi; før/efter-screenshots i `%TEMP%\w10-discovery\outefore` (15c229c), `fter1`, `fter2`, `inal`, `inal2` (1440/390/320, lys+mørk).
- K1 OK: `kortFortalt()` (facet) og `kortFortaltHTML()` (mærke). Punkter: antal (data-fa-n/data-mk-n), kategoriens oplysning (kørekortregel fra facet-indhold = Færdselsstyrelsen; mest udbudte mærker/typer/byer; årgangsspænd), oplyste priser (ingen dobbeltpunktum efter "kr."), A2-antal (data-fa-n="kk:A2") eller sidens faste løfte. Punkt uden data udelades; 3-4 punkter. Låst af 13 tests.
- K2 OK: SANDT tal, ikke udeladt. Fliserne ("Find motorcykler i byer i <landsdel>") kun for byer med egen indekserbar side; tallet = `alle.filter(by.match)` ved byg; nøgle `data-fa-n="by:<postnumre>"`; klienten tæller `alle` på samme postnumre (ny gren `t === 'by'` i hydreringsscriptet; 0 skjuler fliserne). Bevist i browser: statisk 5 i HTML -> hydreret 108 (Rødding). Erstatter de talløse "Byer i ..."-chips (samme hrefs).
- K3 OK: indholdsfortegnelsen er ét element: desktop sticky i højre spalte under Kort fortalt (højre spalte stretcher; tvivl-boks og populære-kort ligger nu efter artiklen), mobil `<details>` lukket lige efter Kort fortalt. CSS tvinger den åben på desktop (`::details-content`), js/guides.js åbner den i ældre browsere og markerer aktivt afsnit (aria-current). Kort fortalt står først på mobil. Læsetid (200 ord/min, af tekstlængden) og Opdateret (guides-data) fandtes og er bevaret. Ordlisteguiden fik eget kortbillede (var ens med brugt-guiden; test: ingen to guides deler billede); facet-guideraekke samme billede.
- K4 OK: h1 op til 64 px med accentstreg, kicker som brandfarvet pille (også "Motorcykeltype" på typesider), kraftigere scrim (.95/.86/.7), intro i hvid, tillidsrækken som bånd med ikoner i brandfarve; mærkesider: wordmark op til 88 px og h1 til 34 px. Ingen nye assets.
- K5 OK: SEO-sammenligning før/efter på 86 genererede sider: 0 afvigelser i title/description/canonical/robots/h1/JSON-LD, 0 mistede links, 1 nyt (brugt-guide -> ordliste). (seo-audit køres af Orchestrator i fuld build.)
- K6 OK: udgiv.js i byggekopien: de eneste "manglende" referencer er de 19 annonce-*.html, som kun mangler i den syntetiske fixture (identisk før/efter mine ændringer); med stubs for dem: "Alle referencer ... er med". Test låser, at hydreringsscriptet kun indeholder den ene statiske `soegning.html`.
- K7 OK: smoke-browser 248 målinger (31 sider x 320/390/768/1440 x lys+mørk): 0 CLS, 0 NaN/null, 0 konsolfejl. Fundet: 4 px overflow ved 320 px på mærkesiderne (mit nye tillidsbånd) -> rettet (én kolonne under 400 px), re-smoke 12 målinger 0 fejl.
- K8 OK: `node --check` alt grønt; `npm test` 1007/1007 i worktree (incl. w9); `scripts/w10-discovery.test.js` 13/13. llms.txt gendannet (blob = HEAD).

## Nye testfiler (Orchestrator tilføjer til npm test)
`scripts/w10-discovery.test.js` (13 tests). Ingen ændring i package.json.

## DELT-ØNSKER
1. package.json: tilføj `scripts/w10-discovery.test.js`.
2. Kør build.js/udgiv.js som sædvanligt (regenererer de committede guide-/facet-/mærkesider med nye skabeloner; jeg har bevidst IKKE committet regenererede html-sider, da de ville miste GA4-snippet/`?v=`-stempler/CSP-hashes fra CI-bygget).
3. Footer-links til guide-mc-typer/guide-mc-ordliste ejes af anden strøm; "Læs også" peger allerede på dem (brugt-guide -> ordliste, første mc -> typer, A2 -> ordliste, typer <-> ordliste).
4. Filer uden for ejerlisten rørt: `js/guides.js` (guide-eksklusiv; sticky/toc-script). Merge-risiko: `css/p-guides.css` layout/TOC-blok er erstattet (midt i filen), de øvrige css-filer kun appended.

## Hvad ligner IKKE billederne, og hvorfor
- Billede 10 har indholdsfortegnelsen som bred 2-kolonne-boks øverst i artiklen; vi har den sticky i højre spalte (opgavens krav) under Kort fortalt, og kun på mobil som sammenklappelig boks før artiklen. Forfatterfoto/"Af Mads Christensen"/dato 12. marts 2024 er opdigtet og ikke brugt (vi skriver "Af Bikerbasen").
- Billede 7/8/9: ingen licenserede fotos (rytter-hero, frilagte modelbilleder), mærkelogo/slogan (Yamaha "Revs Your Next Ride") og 3.842/1.827-tal er ikke kopieret. "Udforsk undertyper" (Supersport, Sports-touring) har vi ingen data til; kortene deles efter målbare behov (w9).
- "Kort fortalt" findes ikke i billede 7/8/9 (kun i 10); den er lagt som bånd under tillidsrækken, og på kørekortsider efter søgekortet. Den er grøn-tonet som i billede 10 (grøn kun til ✓/tint).
- Billedernes grønne CTA er brandfarven. "A2 fra 18 år" (billede 7) er forkert (DK: 20 år) og ikke brugt.
- By-fliser findes kun for byer med egen side (få i drift): søgningen kan ikke filtrere på by, og en flise uden side ville være et løfte uden mål. Regioner uden by-sider viser derfor ingen by-sektion.
- Tal i Kort fortalt udover antal/A2-antal (priser, årgange, "flest i <by>") er bagt ved byg, som sidens intro, og ældes til næste build.
- Kort ved siden af CTA, populære-modeller-fotos og mærkelogoer: uændret fra w9 (ingen assets).

## Commits (gauntlet/w10-discovery)
a0bd2bf acceptkriterier · 2d56c7c Kort fortalt facet + by-fliser · 80ce91f Kort fortalt mærke · d112ccc guides (toc/fotokort/læs også) · 212af68 hero · a5c38f6 tests · 7b9460f 320-overflow · + dette dokument og fjernet ubrugt byChips.
