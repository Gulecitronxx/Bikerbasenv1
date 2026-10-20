# V5 Builder: søgning og marked

Branch `gauntlet/v5-soegning`. Mockup: `Motorcykler til salg.png`. Kilde: V4-Critic `docs/review/gauntlet/v4/critic-samlet.md` (P2-2, P2-3, P2-6, P3-4). Screenshots: `docs/review/gauntlet/v5/soegning/`
(`foer-*` = HEAD cbbb411f, `efter-*` = denne branch; 375/430/768/1440/1920, lys og mørk; mock-lager på 735 rækker med lagerets rigtige titler, mærker, modeller og typer;
foto-pladsholdere er sidens egne typefotos fra `img/type`, fordi netværket er blokeret — de bruges kun til at bedømme beskæring).

Metoden (Gauntlet Loop): mål med før-tal, find rod-årsagen med layout-shift-kilder, ret, mål igen, lås med test. Tre runder på søgesidens layout (CLS, kort, bund), og tre
ejer-rettelser undervejs (sammenlign-knap, pris-skyder, favorit-hjerte) samt en mærke-rettelse.

## 1. CLS på dybe links (P2-2)
**Rod-årsag (målt med `PerformanceObserver` layout-shift `sources`, ikke gættet).** Smoke åbnede kun `soegning.html` uden query. På en adresse med et filter tegner `js/search.js`
filterpillerne EFTER første maling, og resten af siden hopper:
| url, bredde | pille-række | andet | CLS før |
|---|---|---|---|
| `?types=cruiser`, 768 | +41 px (20 px reserveret kun <= 620 px) | uoplyst-noten (+42..79 px) | 0,0775 |
| `?koerekort=A2`, 1440 | +56 px (rækken var `display:none` uden piller) | noten +42 px | 0,076 |
| `?q=xyzzy`, 1440 | +56 px | — | **0,2605** |
| kombination (3 filtre + sort), 375 | +109 px (tre piller i to rækker) | noten | **0,164** |
| `?q=cf+moto`, 768 | +41 px | tyndt-resultat-panelet kom en opgave EFTER kortene (+190 px, 0,041) | 0,074 |
| `?sort=…`/`?page=2`, 375 | V4's reservation gjaldt også adresser UDEN pille, og forsvandt så igen (+38 px) | | 0,031 |
Critic målte 0,076 på live-data for `?types=cruiser` ved 768; mit mock-lager reproducerer det (0,0775) og viser, at det var mere end ét link.

**Rettelser.**
- `<script id="so-pille">` i `<head>` sætter `html.so-pille` (adressen har en parameter, der giver en pille) og `html.so-note` (et filter kan fravælge uoplyste annoncer). Så står pillerækken og noten
  med deres endelige plads i FØRSTE maling. `?sort=`/`?page=` giver ingen reservation.
- Pillerne står på én række, der ruller sideværts under 1280 px (fast højde 40 px uanset antal filtre; "Ryd alle filtre" bliver stående; udtoning i højre kant, ingen rullebjælke der ændrer højden).
- `#uoplyst-note` står i markuppen som tomt element (`:empty` skjuler det; `js/search.js` genbruger det i stedet for at indsætte det). Boksen har sin LÆNGSTE højde (målt 103/83/63/42/63/42 px
  efter bredde): en gætning på 1 mod 2 linjer kostede 21 px = 0,049 ved 768 (`?priceMax=&yearMin=`).
- Tyndt-resultat-panelet tegnes i etape 1 sammen med kortene (`renderThinPanel`), ikke som etape 2.
- Sidebarens reservationer for type-, kørekort- og pris-rækkerne (`<style id="soeg-perf">`) var skrevet til 34 px-rækker; rækkerne blev 40 px i V3 (360/80/88 i stedet for 306/68/84): 0,008 ved 960+.
- `.toolbar-actions` får `min-height:44px` ved >= 1280 (Gem søgning kom med hydreringen og voksede rækken 2 px).

**Test og smoke.** `scripts/smoke-browser.js` kan nu måle søgesiden på et sæt dybe links: `--soeg-links` (12 adresser: types, q, brands, koerekort, sort, page, mærke+model, kombinationer, tal-filtre, ingen træf),
adresser med query direkte i `--sider soegning.html?types=cruiser`, `--stort-lager` (735 rækker i stedet for 44) og `--varm` (hver adresse måles med KOLD og derefter VARM cache; serveren svarer
`max-age=600` som GitHub Pages). `js/v5-soegning-cls.test.js` kører hele matricen: 12 adresser x 375/430/768/1440 x lys/mørk x kold/varm = 192 målinger.
| | før | efter |
|---|---|---|
| værste CLS, matrix 375-1440 | 0,2605 (`?q=xyzzy` 1440) | **0,0095** |
| `?types=cruiser` 768 / `?q=cf+moto` 768 / kombination 375 / `?koerekort=A2` 1440 | 0,0775 / 0,074 / 0,164 / 0,076 | 0,0017 / 0,0017 / 0,000 / 0,0089 |
Smoke strikt (`node scripts/smoke-browser.js --sider soegning --soeg-links --varm --viewports 320,375,390,430,768,1024,1440,1920 --temaer lys,mørk --cls 0.05 --strikt`): 384 målinger (12 adresser x 8 bredder x lys+mørk x kold+varm),
to kørsler: begge 0 fejl, 0 advarsler, værste CLS 0,0095. Første kørsel fangede en ægte `ERR_NO_BUFFER_SPACE` (`?koerekort=A2`, 768 mørk) og målte den igen: gemt som `transient`, ikke talt som fejl — præcis det, genforsøget er til.

## 2. Chip-rækken i søgekortene (P2-3)
Ved 768 px (3 spalter, kort på 226 px) lå "Kræver A | 1.300 ccm 145 hk Bytter gerne" oven i hinanden. Årsag: `flex-wrap:nowrap; overflow:hidden; text-overflow:ellipsis` fra W14 for at holde alle kort lige høje, hvilket skjulte info.
Nu ombrydes rækken: kørekort, ccm og hk står sammen, salgsmærkatet ("Bytter gerne") får sin egen linje, intet klippes. Kort i en række er stadig lige høje (grid), fodlinjerne står i bunden af alle kort.
Test: `kortene ved 375/430/768/1024/1440/1920 px` (ingen chip-overflow, ingen klippet chip, ingen overlap, ingen overflow) — fejler mod før-versionen (`V5_ROD=<før-kopi>`).

## 3. Kortets kvalitet mod mockuppen
Største forskelle før (screenshots `foer-*`): (1) fotoet 2,3:1 skar hjul og forgaffel; (2) titler klippet til én linje med ellipse ("Harley-Davidson FL…", "Honda CMX 1100 DT…", og "Suzuki (model ikke oplyst)");
(3) chip-række klippet (afsnit 2); (4) en lodret streg foran "De fleste annoncer er bekræftet…" på linjen under kildefordelingen under 1100 px (to regler i V4 overstyrede hinanden); (5) stakket fod
centreret i de smalle kort, og sted klippet til 42 % midt i en tom linje; (6) sammenlign-knappen dækkede chip-rækkens højre ende; (7) hero og stort søgekort (fravalgt med vilje i V3, uændret: intet rytterfoto findes).
**Gjort:** foto 16:10 (`object-position:50% 60%`) fra 760 px; titel op til to linjer — kort titel har prisen på samme linje som billedet, lang titel får hele linjen og prisen falder ned under den; fod mindst 36 px (se afsnit 4);
stakket fod venstrestillet og sted 58 %; infobåndet på to rene linjer; listevisningens knapper 40 px.
**Prøvet og kasseret:** sortering og visning på samme linje ved 360-380 px (sparer 58 px) — valgteksten blev klippet til "Bland".
Test: `titler` (korte titler og "Mærke (model ikke oplyst)" klippes ikke, højst to linjer, ved 768/1440/1920), `fotoet er 16:10`, `infobåndet`.

## 4. Ejer-rettelse: sammenlign-knappen (prioriteret)
Knappen (40 x 40, nederst til højre) havde toppen ca. 17 px over fodlinjen og dækkede "30 hk", "152 hk", "64 hk" og kildelinket. Foden er nu mindst 40 px med knappen i sin egen slot
(`.rk-body` bund 4 px + `.rk-fod` min-height 36 px, fra 760 px; under det ligger knappen på fotoet). Listevisningens hjerte/sammenlign var 36 px og er nu 40 px. Fokusring på begge.
`js/v5-kort-bund.test.js` (25 tests): knappens boks overlapper ingen chip, sted, kilde, pris, titel, hjerte eller badge i gitter og liste, ved 375/430/768/1024/1440/1920, lys og mørk, på 5 søgninger
(med/uden "Bytter gerne", "Kræver A"/"Mulig A2", lange kildenavne, privat sælger, egne annoncer med hjerte); mindst 40 x 40; hover og tastaturfokus; kortets højde uændret. Testen fandt fejlen i før-versionen.
Skærmbilleder: `kort-bund-foer-1440-*.png`, `kort-bund-efter-1440-*.png`.

## 5. Ejer-rettelse: pris-skyderen
Håndtagene sad ca. 6 px for højt (`::-webkit-slider-thumb` har ingen `margin-top` i et 34 px højt spor; Firefox centrerer selv). Nu 24 x 24 px (border-box), `margin-top:5px`, samme mål i `::-moz-range-thumb`,
fokusring som 4 px skygge. Sporets streg og udfyldning er begge 4 px og står på `top:50%`. Pixel-test (`js/v5-skyder.test.js`: skærmbillede afkodet på canvas, håndtagets ring mod sporets midte, <= 1 px)
ved 375/430/768/1440, lys og mørk; piletaster og labels ("0 kr.", "300.000+ kr.") bevaret. Kun Chromium er installeret her; WebKit og Firefox er ikke kørt (Firefox-reglen er skrevet ud fra, at motoren centrerer).
`skyder-foer.png`, `skyder-efter.png`.

## 6. Ejer-rettelse: favorit-hjerte på alle kort (D-008 revideret)
Hjertet står på ALLE kort (gitter, liste, forside, mærke-/facetsider, lignende, annoncesiden). Indekserede annoncer kan ikke gemmes i databasen (fremmednøgle til `listings`, ingen migration), så de
gemmes KUN i browseren (`bb_favorites_ext`, id = `eksterne_annoncer.id`, stabilt fordi crawleren upserter på `(kilde_id, kilde_annonce_id)`), aldrig i databasen og aldrig i backend-broens favoritsynk
(`Store.getFavorites()` er stadig kun egne; `getAllFavorites()` er begge til tæller og "Gemte annoncer"). Tooltip "Gemmes i denne browser", og første tryk siger det højt (indloggede: følger ikke med til andre enheder).
"Gemte annoncer" viser egne og indekserede; indekserede linker til annoncesiden og til kilden; en annonce, der ikke længere er i indekset, står som ærlig række med Fjern. Fire ting jeg fandt undervejs:
dobbeltkobling af hjerter (nu en `data-fav-bound`-vagt), forudtegnede hjerter på facet- og mærkesider havde ingen kobling, den indekserede annoncesides hjerte var ikke koblet, og privatlivssiden skulle nævne de nye nøgler.
Tests: `js/v5-favoritter.test.js` (7); ændret fordi de låste det gamle valg: `js/annoncekort.test.js`, `js/eksternt-kort.test.js`, `js/rigt-kort.test.js`, `js/v4-annonce.test.js`. Begrundelse og måling: `docs/review/DECISIONS.md`, D-008 revideret.
Screenshots: `fav-foer-*`, `fav-efter-*`, `fav-gemte-efter.png`.

## 7. Mærke-rettelse (fra mærke-agenten)
`git merge gauntlet/v5-maerke`; konflikt kun i det genererede `kritisk-manifest.json` (regenereret). Et mærke, registret ikke kender (fx "Hanway" fra "Andet mærke"), grupperes under "Uoplyst mærke"
i mærkelisten, filteret og facettallene (`Filtrering.lagerMaerkeNoegle`, kun annoncesiden af nøglen; den VALGTE side er uændret, så `?brands=Ukendt` virker). `q` finder stadig annoncen på navnet.
`js/v5-soegning-maerke.test.js` (6): 0 rækker "Hanway", 1 række "Uoplyst mærke" (2 med sentinellen). H1-ændringen fra mærke-agenten er bevaret. `scripts/v4-maerke-dakning.test.js` mutationsmål omdøbt.

## 8. Smoke og test-infrastruktur (P2-6)
(Verifikation i øvrigt: `npm test` 1521 tests; de to fejl i sidste kørsel var `privatlivspolitik` (bevidst tekst-hash opdateret i `scripts/info-tekst.test.js`) og en `facet-intro-cls`, der består alene og i gentagelse — timing under last. Kør `npm test` igen efter merge.)
`scripts/smoke-browser.js`: (a) en måling, hvis ENESTE fund er `ERR_NO_BUFFER_SPACE` (konsolfejl eller navigation), måles igen én gang; fundet gemmes i rapportens `transient` og tæller hverken som fejl eller advarsel
(vises som `TRANSIENT …` i tabellen; kommer fejlen igen, er den ægte, og et andet fund ved siden af skjules aldrig); (b) keep-alive (`keepAliveTimeout` 60 s, `Connection: keep-alive`) på den statiske server;
(c) de nye søge-flag ovenfor. Test: `js/v5-soegning-cls.test.js` (to browsertests af genforsøget, en af keep-alive/cache-headere).

## 9. Meld til koordinatoren: P3, mobil-CTA udlogget på annonce
Kræver `js/annonce.js` (teksten bygges linje 1632: `<span class="bar-l">Log ind for at se nummer</span><small>Ikke alle sælgere viser et</small>`) og/eller `css/p-annonce.css` (linje 1250, `.listing-actionbar .btn .bar-l`). Jeg har ikke rørt dem.
Forslag: giv `<small>` en egen linje med min. 12 px og fast højde, eller flyt "Ikke alle sælgere viser et" ud af knappen som sekundær tekst over knappen, så knappen kun bærer "Log ind for at se nummer".

## 10. Selvvurdering (7 dimensioner, 1-10; Critic dømmer)
| | Søgeside desktop | Søgeside mobil | Kort | Filter/sidebar |
|---|---|---|---|---|
| Visuel kvalitet | 7 (hjul og forgaffel vises nu; foto er stadig sidens egen pladsholder i mock, ikke målt på rigtige fotos) | 7 | 8 | 8 |
| Designkonsistens | 8 | 8 | 8 (hjerte og sammenlign ens på alle kort) | 8 |
| Funktionalitet | 9 | 9 | 9 (favorit lokalt, mærke "Uoplyst") | 9 |
| Brugeroplevelse | 8 | 7 (værktøjslinjen er stadig høj: søg, filtre, tal, sortér, visning, info før første kort ved 375 px) | 8 | 8 |
| Mobil | – | 8 | 8 | 8 |
| Performance | 9 (CLS <= 0,01 på 192 målinger) | 9 | 9 | 8 |
| Indholdskvalitet | 7 (kildernes modelnavne har støj) | 7 | 8 (ingen opdigtet tal) | 8 |
Mockup "Motorcykler til salg": **6,5/10** (V4 Critic 5,5; Builder V4 7,5). Hero og rytterfoto findes ikke og er fravalgt; billedtæller, kg og "Autoriseret forhandler" findes ikke i data og er ikke tilføjet.

## 11. Restpunkter
- Sorter/visning på samme linje ved 375 px kræver kortere valgtekst eller skjult etiket (prøvet, kasseret).
- Kortene i en række er ikke altid lige tætte i indhold (en lang titel giver luft over fodlinjen i naboerne). Ærlig pris for lige høje kort.
- Den forudtegnede første side i `soegning.html` er bygget fra produktions-lageret (build-srp); facet- og mærkesiders forudtegnede kort får hjerter ved næste byg (Orchestrator).
- WebKit/Firefox er ikke kørt (kun Chromium installeret).
- `package.json` "test": Orchestrator skal tilføje `js/v5-soegning-cls.test.js js/v5-kort-bund.test.js js/v5-skyder.test.js js/v5-favoritter.test.js js/v5-soegning-maerke.test.js`.
