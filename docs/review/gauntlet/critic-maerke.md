# Critic (blind) — strøm maerke (billede 9, Yamaha) — gauntlet/maerke @ 78bcd10

Testet: worktree wt/maerke (port 8727), baseline 9fadd59, Playwright (afvist cookiebanner, VIEWPORT-screenshots læst), lys+mørk, 320/360/390/768/1024/1440. Side-sæt: yamaha, honda, bmw, hyosung, kymco, sym, benelli, ktm, suzuki, royal-enfield (fx få annoncer: hyosung/kymco/sym/benelli = 1 annonce), maerker.html. Tællinger testet mod soegning.html uden demodata (host `nodemo.test`, så localhost-demodata ikke forurener).
Bemærk: ingen af de 25 mærkesider har 0 annoncer (alle der har sider har >=1; mærker uden lager findes kun som tekstliste på maerker.html, 38 stk., ikke som sider) — "side uden lager" er derfor testet via maerker.html-listen og 1-annonce-siderne.

## DOM: **ACCEPTER** (ingen P0/P1; SEO og funktion intakt under forudsætning af byggerækkefølgen i P2-1)

## Sektionsscores (0-5, lys / mørk; match mod billede 9)
| Element | Lys | Mørk | Note |
|---|---|---|---|
| Hero med mærkenavn | 3.0 | 3.0 | Stort typografisk mærkenavn + H1 + intro + brødkrumme; samme foto (sort cruiser) på ALLE mærker, også Sym/Kymco; billedets hero har mærkets egen rytter/maskine, logo og slogan (må ikke kopieres). Højere end billedets |
| Søgekort | 4.5 | 4.5 | Stærkt match (4 felter + A1/A2/A-segment + CTA + "N … i Danmark" under), overlapper fotoets underkant som billedet. Billedets Alle/A1/A2/A er kopieret præcist |
| Tillidsrække | 4.0 | 4.0 | 4 ikon+tekst som billedet; indhold sandt (ikke "vi fjerner svindel"/fællesskab). 2x2 på mobil |
| Annoncerække + CTA-panel | 3.5 | 3.5 | 4 kort + panel (billedet 5). Panelet har generisk cruiser-illustration uanset mærke (Yamaha/BMW/Hyosung/Kymco alle samme Harley-agtige bike) – misvisende; på 1-annonce-sider står ét kort alene med tom plads til højre |
| Typefliser | 4.0 | 4.0 | Kun typer mærket har, ægte antal, fotos er generiske typebilleder (ikke mærkets). Max 4-5 fliser (billedet 7) |
| Sådan virker | 4.0 | 4.0 | Genbrug af delt `.saadan-trin`; 4 trin som billedet men uden billedets "Gem og sammenlign"/fællesskabs-boks (bevidst) |
| Tre kolonner (modeller/kørekort/region) | 3.5 | 3.5 | Struktur = billedet. Svagheder: kørekort "A" = alle (49 = totalen), modelfliser kan indeholde sælgertitler ("God velkørende custom med lav. KM" på Hyosung), kolonner af ulig højde → tom plads (Yamaha midte) |
| Rest (facetfold, resten af annoncer, FAQ, andre mærker) | 4.0 | 4.0 | Intakt og ryddeligt under billedets struktur |
| maerker.html | 3.5 | 3.5 | Hero + tillidsrække + 8 topfliser + A-Z m. bogstavnav + Sådan virker + tekstliste. Pæn; billedet viser ingen separat oversigtsside, så ingen direkte reference |
| Mobil (390) | 4.0 | 4.0 | Søgekort stakket pænt, trust 2x2, annoncer scrollende, fliser scrollende; ingen overflow |
Samlet match mod billede 9: **ca. 3.8/5 — "tydeligt samme opsætning", tættere end baseline (var 1.5/5).**

Spørgsmål: *Matcher det tydeligt billedets opsætning?* Ja i rækkefølge og komponenter (hero → søgekort → trust → annoncer+panel → typer → sådan virker → 3 kolonner). *Er vi tæt nok?* På struktur ja; på stemning/rigdom nej (ensartet hero, 4 vs 5 kort, ingen mærkeidentitet, stock-illustration i panel). *For tæt på det gamle site?* Nej — layoutet er tydeligt nyt; man kunne være modigere på hero (brand-specifik art direction) og panelbillede, men lovreglerne (ingen logo/slogan) og manglende mærkefotos begrænser.

## Dom pr. krav
1. **Søgekort + links: PASS.** Tom submit -> `soegning.html?brands=Yamaha` = "49 annoncer fundet". Udfyldt (q=MT-09, type=naked, pris<=200.000, A2) -> `?q=MT-09&types=naked&brands=Yamaha&priceMax=200000&koerekort=A2` (alle parametre læses af search.js; 0 træf er korrekt — MT-09 er ikke A2). Enter i tekstfelt virker. Pris-trin vises kun hvis de har træf. Tab-rækkefølge logisk (breadcrumb -> Mere om udvalget -> q -> type -> pris -> kørekort -> Søg). Alle ~60 links pr. side (modeller, kørekort, regioner, typer, priser, sortering, andre mærker): 0 stk. ikke-200 på yamaha/honda/bmw/hyosung/kymco/sym/benelli/suzuki; filtre korrekte. Tal pr. link: type-fliser, kørekort A1/A2/A, regioner, pris-chips, "Alle N" matcher soegning.html 1:1 (stikprøve ca. 250 links). Afvigelser: se P2-2.
2. **Tal/påstande/kort: PASS.** Ét tal pr. side: Yamaha 49 i hero-tæller, søgekort, "Alle 49 i søgningen", noter (3 `data-mk-n`, alle ens); gælder alle 25 sider (tæller = bygget items.length). Honda 276 = 109 brugte + 167 fabriksnye (stemmer). V-012 løst (localhost viser stadig 55 pga. demodata — ikke i drift; på `nodemo.test` 49=49). maerker.html: brandfliser summerer til 600, "alle 604" = søgesidens total (4 uden mærkenavn) — konsistent. Ingen opdigtede påstande fundet (ingen stjerner/anmeldelser/svartid/"verificeret"); trust-tekster er sande for et indeks; ingen logoer/slogans. Kort viser kun tilladte felter (pris, titel, år, km, ccm, kørekort, sted, kilde-domæne, ét thumbnail).
3. **SEO: PASS med forbehold.** Scriptsammenligning (statisk HTML, alle 25 mærkesider + maerker.html vs baseline 9fadd59): title, description, canonical (mærkesider), robots, JSON-LD (parser, identisk JSON), én H1 (= 1 på alle 26), noscript-links, FAQ-JSON-LD identiske. Forskelle er KUN build-artefakter fra rå generatoroutput: OG/Twitter-tags (10 -> 0), inline-scripts 4 -> 1, `?v=`-stempler, preconnect-links, og canonical på maerker.html (kommer fra build-meta). Tabte interne links: ingen reelle — undtagen at maerke-honda.html mister 6 links til `model-honda-*.html` i det rå output (se P2-1). `<details>` FAQ-tal falder, men FAQ-JSON-LD og synligt FAQ-indhold identiske (baseline talte intro-details og Hyosung/Kymco-"mere"-blok).
4. **Layout/a11y: PASS.** 9 sider x 6 bredder (320/360/390/768/1024/1440) x lys+mørk = 108 kombinationer: 0 vandret overflow, ingen afskårne elementer uden for bevidste scrollere. Konsol rent (Supabase-CORS/401 filtreret) i begge temaer. Kontrast målt (tekstnoder, computed color vs effektiv baggrund; tekst over foto målt som 98.-percentil af pixels bag teksten): H1, intro, "Mere om udvalget", breadcrumb, fliser (hvid på gradient) alle >=4.5:1; mørk tilstand 0 fund. Eneste lave værdier: dekorativt `.mk-wordmark` (aria-hidden, stor skrift, kun 2.0-2.5 i 98.-percentilen men visuelt hvid på mørk venstre side) og delt header (grå "Forside"/"Søg motorcykler" ~3.2:1 målt i lys — delt lag, ikke strømmens; P3). Fokus: delt `:focus-visible` i styles.css gælder; p-maerke.css har ingen egen (ok).
5. **NF-1: PASS.** Alle 25 intro-afsnit: synligt afsnit ender på hel sætning, resten i "Mere om udvalget"; "kr." deles ikke (BSA "1 annonce oplyser pris…" er ny sætning, ikke "kr."-split). Tests dækker det.
6. **Generator: PASS (kørbar, idempotent).** `node scripts/build-brand-pages.js` på kopi: alle 25 mærkesider + maerker.html byte-identiske med committet (data uændret); eneste ændring er `sitemap.xml` (38 -> 21 URL'er, genererer kun mærke-/annoncesider). Vurdering af rå output: det er ikke et problem hvis Orchestratoren kører den normale pipeline (`build.js`: brand -> facet -> build-meta -> CSP-hashes -> stamp). Verificeret: `build-facet-pages.js` (kørt på kopien) relinker Honda-chips tilbage til 6 `model-honda-*.html` ("relinkMaerkesider" matcher præcis det `href`-format den nye generator udsender) og tilføjer 17 facet-URL'er til sitemap. **Orchestrator skal: (a) aldrig committe generatorens egen sitemap/robots alene (mister 18 facet-URL'er) — kør hele build.js; (b) køre brand-generatoren FØR facet-generatoren; (c) acceptere at CSP-hashes/OG/`?v=` først fremkommer efter build.js; (d) lade build-meta tilføje canonical + OG til maerker.html; (e) gen-hashe CSP (maerker.html har nu ét inline script = tema-scriptet, hash findes).**
7. **Tests: PASS.** `npm test` 369/369 grønne, 0 fejl. `node --check` over js/, scripts/, crawler/ rent.
8. **maerker.html/maerke.js/CSP: PASS.** Inline-script flyttet til js/maerke.js; siden fungerer (A-Z, bogstavnav, tal, ingen konsolfejl). CSP er nu den fulde mærkeside-CSP (img-src for kildedomæner + Supabase connect-src) i stedet for den minimale — lidt bredere end nødvendigt for en side uden annoncer/Supabase (P3), men identisk med øvrige sider og har ikke-`unsafe-inline` for scripts; acceptabelt.

## Fund
**P0/P1: ingen.**

**P2**
- P2-1 *Integrationsrækkefølge (SEO):* rå output for maerke-honda.html mangler 6 interne links til model-honda-*.html (modelsiderne bliver orphans, indtil facet-generatoren relinker). Verificeret at pipeline brand->facet genopretter dem. Repro: `grep -c 'href="model-honda' maerke-honda.html` = 0 i worktreen, 6 efter `node scripts/build-facet-pages.js` på en kopi. Krav til Orchestratoren (se krav 6).
- P2-2 *Modelflisers antal != søgeresultat:* flisen siger N, men linket (`q=<model>` er substring-søgning) lander på flere. Yamaha "FJR 1300 A · 2" -> 4; "Ténéré 700 · 2" -> 4; Honda CMX 500 Rebel 17 -> 20, CMX 1100 D Rebel 15 -> 22, CRF 1100 L Africa 15 -> 20, NT 1100 A 13 -> 16; BMW "K 1200 · 4" -> 10, "R 1200 · 2" -> 5; Suzuki DL 650 V-Strom 2 -> 3. Findes også i baseline (chips), men nu mere synligt som tal i fliserne. Fix: skriv "mindst N"/skjul tal, eller tæl med samme substring-regel som søgningen (Honda-modeller med egen side er ok: der er antallet siden egen).
- P2-3 *Dårlig modeldata som flise:* Hyosung-siden viser "God velkørende custom med lav. KM" som model (sælgertitel). Filtrér modelnavne ved >N tegn/flere ord/tegnsætning eller kræv >=2 annoncer.
- P2-4 *Misvisende illustration:* CTA-panelet bruger samme cruiser-illustration (Harley-agtig) på BMW, Yamaha, Hyosung, Kymco; hero er samme sort-cruiser på ALLE mærker (Sym-scooter-side viser Ducati-lignende motorcykel). Ikke opdigtet påstand, men uden brand-fidelity; modsiger billedets "Find din næste Yamaha"-rytter.

**P3**
- 1-annonce-sider: kortet står alene i en bred række (tom plads til højre), panel under — luk gabet (centrér/flex 2-kolonne).
- Tre kolonner har ulig højde (Yamaha: tom midterkolonne under kørekort); billedet har ens højder.
- Kørekort "A" = alle ikke-udelukkede (49 = total) kan læses som "49 A-motorcykler"; overvej label "A (alle)" eller note (note findes under).
- maerker.html bruger bred CSP (img-src/connect-src ubrugte).
- Delt header: grå navigationslinks ~3.2:1 i lys (delt lag).
- Fotos i typefliser er generiske illustrationer, ikke mærkets biler (ærlig, men ikke mærkespecifik).
- Genereret `robots.txt`/`sitemap.xml` ligger som EOL-ændringer i worktreen (ikke committet) — ingen indholdsændring.

## Prioriteret liste "for at komme tættere på billedet"
1. Mærkespecifik hero: fotos pr. mærke (egne/licenserede), ikke én fælles cruiser; lavere hero (dropper H1-afsnitslængde i 2 linjer) så søgekort kommer højere op (billedet: kort ved y~260 af 940).
2. 5. annoncekort ved >=1280 (billedets 5+panel) — smallere kort eller panel-bredde 18 %; fyld 1-annonce-rækken ("Se alle"-kort).
3. CTA-panel med ægte, ensartet billede af RIGTIGE modeller fra lageret (annoncens thumbnail beskåret) i stedet for stock-cruiser; ellers neutral gradient.
4. Typefliser: op til 7 med mærkets egne annoncefotos pr. type (ét ægte thumbnail fra lageret) i stedet for generiske illustrationer.
5. Tre kolonner: lige højde, modelfliser med små ikoner/billede som billedets MT-07/R7-ikoner; fix P2-2/P2-3 først.
6. Sådan virker: tilføj billedets pil-forbundne enkeltrække i ét kort + (kun hvis ægte) guides-modul "Bliv klogere" til guides-strømmens sider.
7. Mærkeidentitet uden logo/slogan: typografisk wordmark i brandfarve (kopper) + lille mærke-fakta-linje (grundlagt/land) fra verificeret kilde, hvis ønsket.

Scratch-scripts (udenfor repo): C:\Users\pasca\crit_mk\*.js. Kopi brugt til generator-test: C:\Users\pasca\crit_copy (ingen skrivning til produktion; generatoren læste kun Supabase). Ingen produktionskode ændret.
