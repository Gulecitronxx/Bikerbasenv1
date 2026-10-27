# V7 QA fase 2: uafhængig regression og dom

Tidspunkt: 26.10.2026 (aften) til 27.10.2026. Mål: den PUSHEDE V7-tilstand, `main` = `gauntlet/master` = 5f40cd16 (deploy success), eksporteret med `git archive gauntlet/master` til `wt/_v7-qa-arkiv` (intet byg i kopien; de byggede HTML-filer er dem, der er pushet), og live https://bikerbasen.dk (kun læsning, ingen login, ingen formularer). Min worktree `wt/v7-qa` har merget `gauntlet/master`. Intet er skrevet til produktion; crawleren er ikke kørt; ingen migration er kørt.

## Dom

**PUSH-tilstanden er i orden (ingen P0, ingen P1).** V7 løste de fund, jeg meldte som P1/P2 i fase 1 (friskhed, typemangel, Lignende, afkortet sætning, kontaktkort), og flag-FRA-tilstanden er ærlig og henter ingen beskedkode. Åbne punkter er P2/P3 og blokerer ikke (liste nederst). Hvis noget skulle rulles tilbage, er der intet i denne rapport, der kræver det.

Skelnen mellem VERIFICERET (kørt/målt af mig) og KUN LÆST er gjort eksplicit i afsnit 6.

## 1. Før/efter mod live (baseline fra fase 1 gentaget)

Script: `scripts/v7-baseline.js` (+ `scripts/v7-annonce-live.js`, `v7-flag-live.js`). Rå data: `qa/baseline-live.json` (før, 26.10. 18:11) og `qa/baseline-live-fase2.json` (efter, 26.10. 22:37 lokal tid). Billeder: `qa/baseline-live-fase2/`.

| Mål | Før (fase 1) | Efter (live nu) | Dom |
|---|---|---|---|
| Antal annoncer | 720 | 718 | -2: titler, der var en efterspørgsel ("købes"), er ude af lageret (V7 mærke). Ingen "Ukendt"-mærke, ingen efterspørgsel og ingen modelstøj (pris/km/hk/domæne i modelnavn) tilbage i lageret (målt i `Store.getAllListings()`). |
| Friskhed, forside/søgning | "De fleste annoncer er bekræftet senest 17. okt." (median, ingen advarsel) | "399 bekræftet inden for 14 dage (senest 17. okt.), 317 kan være solgt" (forside); søgesiden "399 af 716 annoncer er bekræftet inden for 14 dage (senest 17. okt.). 317 kan være solgt - tjek hos kilden." | **Løst (F-V7-01).** Samme data, nu ærligt beskrevet. |
| Alder i lageret | 400 x 9 d, 152 x 63, 151 x 67, 15 x 71; p95 67; 2 uden dato | 399 x 9 d, 317 x 61-90 d; p95 68; max 71; 2 uden dato | **Uændret som data** (som forventet: crawleren er ikke kørt, `BB_LIVSCYKLUS` er fra, migration 030 er ikke kørt). 44 % er stadig ikke set i 9 uger; det er et ejerskridt, ikke en UI-fejl. |
| Annonceside, 63-dages CB 1000 (0098fee2) | "sidst bekræftet for 63 dage siden" + samme generiske advarsel som en frisk | "Bekræftet for 64 dage siden. Den kan være solgt - tjek hos kilden." (annoncesiden og kortet i søgning, `badge-alder`) | Løst. På søgning: kort med alder > 14 d har badge, friske har ingen. Sorteringen "Senest bekræftet" findes. |
| Uden type | 349 af 720 (48 %) | 96 af 718 (13 %); 252 afledt fra model | Løst for 253 rækker. Typer nu: cruiser 172, touring 150, adventure 115, naked 100, sport 43, classic 25, cross 10, scooter 7. Forsidens note: "96 af 718 annoncer har ingen type oplyst hos kilden ...". Nøjagtighed: se afsnit 4. |
| Lignende på BMW R45 | 6 kort: Honda Café' ræser, Suzuki Intruder, Yamaha XJ 600, Kawasaki ZZR 600, Honda CBR 600 F, BMW K 100 (intet classic) | 1 kort: Yamaha XS 650 (1973, classic) under "Andre classic/veteran-motorcykler" med forklaring "Samme type (Classic/Veteran), rangeret efter pris (+/-30 %), årgang (+/-8 år) og motorstørrelse (+/-35 %). Kun én motorcykel er lignende nok - vi viser hellere få end irrelevante." | **Løst (F-V7-03).** Stikprøve på 12 andre annoncer (Honda CMX 500, BMW R 1150 RT, HD Dyna, Yamaha XV 1100, Suzuki VLR 1800, Kawasaki ZX6R, Triumph Speed Triple, KTM 1290, Royal Enfield Bear, Aprilia RST 1000, BSA Lightning, Ducati 749): alle viser samme model/type/mærke med forklaring, ingen irrelevante; Royal Enfield Bear viser 2 med teksten "Kun 2". Lille anmærkning: to identiske rækker (samme model og pris) kan stå ved siden af hinanden (CMX 500 Rebel 84.995 x2, VLR 1800 139.800 x2); det ligner dubletter hos kilden, ikke en fejl i rangeringen. |
| Kontaktkort, BMW R45 udlogget | "Beskeder til sælger kan endnu ikke sendes via Bikerbasen. Log ind for at se ..." | "Sådan kontakter du sælgeren. Log ind gratis, og tryk på "Vis telefonnummer", hvis sælgeren har valgt at vise sit nummer. Beskeder via Bikerbasen er ikke åbnet endnu, så uden et vist nummer kan annoncen ikke kontaktes her." | Ærlig og handlingsrettet (F-V7-04 forbedret). 0 formularer, 0 textarea, 0 `tel:` udlogget (uændret, som de skal være). |
| Mobil-handlingsbjælke | "Ikke alle sælgere viser et" (afkortet) | "Ikke alle sælgere viser deres nummer" | **Løst (F-V7-05).** |

## 2. Flag FRA er ærligt, og ingen beskedkode hentes (verificeret)

- **Live** (`scripts/v7-flag-live.js`): 9 sider x 375/1440 (forside, søgning, BMW R45, en ekstern annonce, opret-annonce, mine-annoncer, login, dashboard; de to konto-sider sender udlogget videre til login). I ALLE 18 sidehentninger: 0 forespørgsler til `js/beskeder.js`, `css/p-beskeder.css` eller noget beskeds-RPC, ingen besked-tekst i siden. `window.BB_FLAGS` er `{"beskeder":false}` på live. Ingen "Send besked"-knap, ingen formular.
- **Kode** (læst): `js/beskeder.js` hentes kun via `bbIndlaesBeskeder()` bag `bbFlag('beskeder')` (`js/supabase-config.js:38`); Beskeder-fanen i `mine-annoncer.html` er `hidden`, panelet `display:none`, indholdet hentes først når fanen åbnes.
- **Lokal mock** (kørt, arkivkopi): `js/v7-besked-flow.test.js`, `js/v7-besked.test.js`, `js/v7-besked-sql.test.js` er grønne (flag FRA: ingen formular, intet modul, ingen beskedkald, ingen badge; flag TIL: send/modtag/svar, spam-grænser, XSS, honeypot, mobil).
- **Forbehold (ærligt):** flaget er en klientside-variabel. Den rigtige spærre er, at `supabase/025_beskeder.sql` ikke er kørt i produktion; det har jeg ikke kunnet og må ikke verificere mod produktion. SQL'en er kun læst/testet statisk og mod mocken. Før aktivering skal den køres på staging, og privatlivspolitikken (forslag i `besked.md`) godkendes af ejeren.

## 3. De 140 målinger igen (`scripts/v7-skaerm.js --lokal`, merget build)

14 sider x 375/430/768/1440/1920 x lys/mørk. Rå: `qa/visuel-fase2/maalinger.json`; kun 1440 lys ligger i repoet, resten i `C:/Users/pasca/Desktop/rod/wt/_v7-qa-skaermbilleder/fase2/`.

| Mål | Fase 1 | Fase 2 |
|---|---|---|
| Vandret overflow | 0 | 0 |
| Sidefejl / fejlede indlæsninger | 0 | 0 |
| Forvrængede billeder | 0 | 0 |
| Kontrast < 4,5 (heuristik) | 10 (alle falske positive: hvid tekst på ikke-tegnet typefoto) | 10 (samme) |
| Tap-mål < 36 px | 84 | 84 (uændret; se F-V7-09) |
| Tekst < 11,5 px | 292 | 320 (+28: `span.al-kort` (alder-badge, 11 px) på eksterne annoncer, `p.foto-tom-titel` på annoncekort uden foto) |
| Konsolfejl | kun `haendelse`-CORS fra localhost | samme (localhost-artefakt; live har 0) |

Regressionsscripts på arkivkopien af den pushede tilstand:

| Script | Resultat |
|---|---|
| `v4-maerke-dakning.js --hurtig --streng-v5` (kendt-liste + baseline) | exit 0: 0 fejl (0 nye), 0 advarsler, 8 info |
| `v5-kompatibilitet.js` | exit 0 (gulv uændret: Chrome/Edge 111, Safari 16.2, Firefox 121) |
| `v5-krydsbrowser.js --maal lokal,live` chromium 151 / Chrome 155 / Edge 156 | exit 0, 0 fejl; 64 advarsler, alle samme slags: ekstern annoncebillede blokeret af ORB (`assets.guloggratis.dk/images/73865a27...`) på `soegning` og `type-classic`, live, alle tre kanaler (kilden leverer ikke et billede; ikke vores fejl). Rapport: `qa/krydsbrowser-fase2.md` |
| `v3-regression.js` (alle sider, 5 viewports, lys+mørk) | **exit 1, 2 fejl** (en første kørsel blev ødelagt af at maskinen gik i dvale: 62 `ERR_NETWORK_IO_SUSPENDED`; kørt om på ren maskine). Se P3-fundene nedenfor: `region-nordjylland.html` 1920 mørk CLS 0,088 og `afmeld.html` 375 CLS 0,051 (transient: 3 genkørsler 0 fejl). |
| V7-testfilerne (`js/v7-*.test.js`, `type-klassificering`, `maal-aktualitet`, `v7-maerke-ende-til-ende`, `crawler/livscyklus`) | 167 grønne, 0 røde, 1 sprunget over (168) |
| `type-klassificering.js --tjek` | js/data.js i trit med `data/model-typer.json` (22 mærker, 394 regler) |

## 4. NY uafhængig stikprøve på 50 af typeklassificeringen

Ikke stikprøven fra værktøjet (fast frø 20261026): jeg hentede LIVE-lageret (`typeAfledt: true`, 252 rækker), blandede med mit eget frø (mulberry32, 7311) og tog de første 50 (`scripts/v7-type-stikproeve.js`, resultat `qa/type-stikproeve-50.json`). Hver vurderet efter hvad modellen er (producentens egen kategori/almindelig viden), ikke efter hvad reglen siger.

**Resultat: 46 af 50 (92 %) entydigt rigtige; 3 diskutable (sport-touring skrevet som touring); 1 tvivlsom.** Regnet generøst (sport-touring = touring accepteret): 49 af 50 (98 %).

| Vurdering | Rækker |
|---|---|
| Rigtigt (46) | HD Sportster/FXSTB/FLHC (cruiser), KTM 990 Duke / 1290 Super Duke R, Yamaha MT-09, Honda CB 750 Hornet, Aprilia Tuono V4 R, Suzuki GSR 750 / GSX 1400, Kawasaki Z 650 S / Z 900 / Z H2 (naked); Honda GL 1800 x6, BMW K 1200 LT / K 1200 GT / K 100 RT, Honda NT 1100 D, Yamaha FJR 1300 (touring); Yamaha TT 110 R / TT-R 50 E (cross); Honda CMX 1100 DT Rebel, Suzuki VZR 1800, Yamaha XV 1100 / XV 1000 / XVS 1100 (cruiser); Honda XL 700 V, HD Pan America, Honda NC 750 XA / XRV 750 Africa Twin / XL 750 Transalp, Suzuki DL 800 DE, BMW R 1250 GS, Triumph Tiger 800 (adventure); Triumph Daytona 660 x2, Honda Vf750f, CBR 1000 RR (sport); Triumph Bonneville T120, BSA Spitfire 650 (classic); BMW C 400 GT (scooter) |
| Diskutabelt (3) | Honda CB 1000 GT 2026 (touring; sport-touring), Yamaha Tracer 700 (touring; sport-touring/crossover), Honda VFR 800 F (touring; sport-touring) |
| Tvivlsomt (1) | **Honda CBR 1100 XX** (1996) er klassificeret som touring; den kaldes almindeligvis en sportsmotorcykel (hypersport/sport-touring). |

Gennemsyn af ALLE afledte grupper (classic 19, cross 8, scooter 7, sport 20) viste ingen åbenlyse fejl. Systematisk anmærkning: reglerne sender **Honda CBR 1100 XX (4 annoncer) og CBR 1000 F (2)** til touring (sport-touring). Det er forsvarligt som "touring" kun hvis man definerer typen som sport-touring; ellers hører de under sport. Forslag (data-agent, P3): flyt CBR 1100 XX til sport eller lad regelnoten sige "sport-touring"; lav ellers ingen ændring.

## 5. Åbne fund fra fase 1: status og hvad jeg gjorde

| Fund | Status | Handling |
|---|---|---|
| F-V7-01 friskhed | Løst (afsnit 1) | - |
| F-V7-02 typemangel | Løst for 253 rækker; 96 mangler stadig; **søgefilteret har stadig ikke "uden type"-valg** (forsiden henviser til "den fulde søgning") | Ingen (P3, ejerens valg) |
| F-V7-03 Lignende | Løst | - |
| F-V7-04 blindgyde | Forbedret (ærlig tekst, vej: telefon); privat annonce uden vist nummer kan stadig ikke kontaktes, før beskeder aktiveres | Ejerens aktivering |
| F-V7-05 afkortet sætning | Løst | - |
| **F-V7-06 sen webfont/CLS** | **ÅBEN (P2)** | Ikke rettet: `@font-face` er skrevet af fem generatorer (`build-brand-pages`, `build-facet-pages`, `build-guides`, `build-listing-pages`, `udgiv-head`) og ligger inline i ca. 105 HTML-filer; en ændring kræver nyt byg, ny kritisk CSS og CSP-hashes: ikke en lille, sikker rettelse. I stedet **bevist, hvilken rettelse der virker** (`scripts/v7-cls-last.js`, 700 ms forsinket font, 2 gentagelser, identiske tal): (a) fallback-face med `size-adjust`/`ascent-override`/`descent-override` målt i Chromium (`FALLBACK_FIX=1`) hjælper IKKE (opret 768 0,0437, forside 375 0,0332: tekstombrydningen ændres alligevel); (b) **`font-display: optional` fjerner skiftet helt** (`FALLBACK_FIX=optional`): opret 768 0,0439 -> 0,0062 (resten er det uvedkommende `.op-layout`-skift), forside 375 0,0332 -> 0,000, login 375 0,0196 -> 0,000, maerker 768 0,0173 -> 0,000; uden forsinkelse er forsiden uændret 0,000. Pris: på en meget langsom første indlæsning vises siden i systemskrift, indtil fonten er cachet (fonten er forudindlæst og same-origin, så det rammer kun reelt langsomme forbindelser). Anbefaling til Orchestrator: skift `swap` -> `optional` i de fem generatorer, kør build -> kritisk-gen -> build + csp-hashes og mål igen med kommandoen herover. CLS-testenes flagrer er håndteret af testhærdningen, så dette er en rigtig brugerforbedring, ikke et gate-problem. |
| **F-V7-07 titel klippes** | **Delvist løst, nu P3** | A2-siden og søgningen har 0 klippede titler (live 375-1920). Tilbage: i række-kort med titel + pris på samme linje (container >= 250 px, `css/p-facet.css:690`, `css/p-maerke.css:806`) afkortes en meget lang titel med "..." (1 af 13 på `maerke-honda.html`: "Honda CRF 1000 L Africa Twin DCT"; på `type-sport.html` 1440 "Kawasaki ZZR 1400 ABS" er kun et afrundingsfalsk-positivt, 38 mod 37,5 px, to linjer). Det er et bevidst designvalg (kortets højde holdes for CLS-testene), og en 2-linjers titel ændrer højden på alle fem sidefamilier + facet-CLS-testene: ikke en lille rettelse. Dokumenteret, ikke rettet. Mildnende forslag: `title`/`aria-label` med hele navnet. |
| F-V7-08 placeholders | **Rettet af mig** | `opret-annonce.html`: "12500", "689", "72" -> "F.eks. 12500", "F.eks. 689", "F.eks. 72" (3 attributter, byte-for-byte uden ændring af linjeskift). Opret-/validerings-/w9-/w14-/v2-saelger-/sidevægt-/kritisk-/inline-script-tests grønne (85), gate hurtig 7/7. Ikke bygget om (siden er ikke genereret); live viser den gamle tekst, til Orchestrator genudgiver. |
| F-V7-09 tap-mål 32-33 px | Åben (P3) | Ingen |
| F-V7-10 "Harley-D..." | Ikke genmålt (P3) | Ingen |
| F-V7-12 `rmSync` | **Løst** (`maxRetries: 5, retryDelay: 200`, `scripts/udgiv.js:87`) | - |

## 6. Nye fund i fase 2

| ID | Prioritet | Fund | Bevis og forslag |
|---|---|---|---|
| F-V7-14 | P3 | `v3-regression.js` giver rød på `region-nordjylland.html` 1920 mørk: CLS 0,088 > 0,05 (deterministisk; før V7 (`e7232df3`) 0,018, passerer). **Kun med smoke-fixture-lageret, ikke med rigtige data:** skiftet (330 ms) er `DETAILS.brand-intro-mere` 890 -> 922 og en liste 689 -> 705, dvs. klienten hydrerer et andet udvalg end det bagte (44 fixture-rækker mod det rigtige lager). Med rigtige data (`MOCK=live scripts/v7-cls-last.js`, 1920/1440/375 mørk, regioner, type, mærke) er CLS 0,0000 både før og efter. Brugerne er altså ikke ramt, men regressionsrunneren er rød. | Forslag: tilføj posten til den kendte liste i `v3-regression.js`/gaten, eller gør de bagte tal på regionssiderne uafhængige af klientens fixture-lager. Gaten (8/8) dækker ikke 1920 mørk på regioner, derfor blev det ikke set. |
| F-V7-15 | P3 | `afmeld.html` 375: CLS 0,051 én gang i v3-regression (grænse 0,05); tre genkørsler 0 fejl. Transient (belastning). | Ingen. |
| F-V7-16 | P3 | Klassificering: CBR 1100 XX / CBR 1000 F som touring (6 annoncer). | Se afsnit 4. |
| F-V7-17 | P3 | `span.al-kort` (alder-badge) er 11 px, under projektets 11,5 px-grænse for læsbar tekst (kun på eksterne annoncer, 375/430). | Hæv til 12 px. |
| F-V7-18 | info | 317 af 716 annoncer er stadig ikke set i 9 uger; V7 beskriver det ærligt, men data ændres først, når ejeren kører crawleren (evt. med `BB_LIVSCYKLUS=1` og migration 030). Flaget `BB_LIVSCYKLUS` er fra som standard, og koden er læst: den ændrer ikke robots/Crawl-delay/rate limit/User-Agent/feltlisten (CLAUDE.md regel 1-6 uberørt; de fem nye kolonner er tællere, ikke annoncetekst). | Ejerskridt. |

## 7. Verificeret vs. kun læst

| Område | Verificeret (kørt/målt) | Kun læst / ikke muligt |
|---|---|---|
| Friskhed, type, Lignende, kontaktkort, mobilbjælke | Live, 26.10. og 27.10. | - |
| Flag FRA | Live: 18 sidehentninger uden beskedkode; lokal mock-tests grønne | Produktionsbackend (migration 025 er ikke kørt; må ikke verificeres mod produktion) |
| Flag TIL | Kun mod lokal mock (besked-agentens 3 testfiler kørt af mig) | Alt mod rigtig backend, e-mail-notifikation (`besked-notifikation` er ikke deployet) |
| Livscyklus | Testfiler kørt (`crawler/livscyklus.test.js`, `js/v7-data-livscyklus.test.js` grønne); koden læst for regel 1-6 | Ingen crawler-kørsel mod produktion (forbudt); migration 030 ikke kørt |
| Typeklassificering | 50 stikprøve + gennemsyn af alle 252 afledte gruppelister, `--tjek` | Nøjagtigheden mod kildens egne typer (`--maal`) er værktøjets, ikke gentaget af mig |
| Regression | v3, v4-mærke, v5-kompat, v5-kryds (Chromium/Chrome/Edge, lokal + live) kørt | Safari/Firefox findes ikke i miljøet |
| 140 målinger | Kørt på merget build | Live-versionen af login/opret/mine-annoncer (kræver konto; kun mock) |
| Fix af F-V7-08 | Tests grønne lokalt | Ikke udgivet/genbygget; live viser stadig gammel tekst |
