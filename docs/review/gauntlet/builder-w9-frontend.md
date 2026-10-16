# Builder w9-frontend (Agent 1: frontend og designsystem) — Bikerbasen Gauntlet

Branch `gauntlet/w9-frontend` fra 4378bba. Mål: billede 1 (forside) + header/footer/fælles lag. Måling: Playwright mod lokal mock (smoke-fixtures; `data.js` neutraliseret i tom/fejl-tilstand), scripts og screenshots udenfor repoet i `%TEMP%\w9-frontend` (fore-* = før, efter-* = efter).

## Acceptkriterier (skrevet FØR bygning)

| Id | Billedsektion | Kriterium (bevis) |
|---|---|---|
| F1 | Header (billede 1 topbar) | Favoritter (hjerte + tekst) står synligt i headeren på >= 1100 px også med 0 favoritter (som billedet); tælleren tegnes kun > 0 og uden at flytte siden (CLS = 0 fra headeren). Skærmbillede 1440 lys+mørk. |
| F2 | Hero + søgekort | Søgekortet har ingen død luft under antalslinjen: friskhedsteksten er sekundær (lille, egen linje) og kortets nederste luft <= øverste luft + 8 px ved 1440. Hero uændret stærk (h1/ingress kontrast >= 4,5:1 fra w7 bevares). |
| F3 | Sådan virker (4 trin m. pile) | Trinnummer og ikon overlapper ikke (bounding boxes skærer ikke hinanden) ved 320/390/768/1440; pile mellem trin >= 1000 px bevares. |
| F4 | Tom/fejlet lager (forside) | Med 0 annoncer (tomt svar) og med backend-fejl (500): hero viser intet tal; ingen "0 annoncer" i kørekort-/region-/typefliser; ingen tom "Udforsk efter type"-overskrift; sælg-panelet er en kompakt bånd (ikke 1000 px bredt foto); tre kolonner uden sammenpresset region-kolonne; fejlbanneret står under tillidsrækken og giver CLS < 0,05 ved 390 og 1440. |
| F5 | Fælles lag | Komponentkatalog i DESIGN_DNA.md, kun klasser der findes (verificeret med grep). |
| Generelt | alle | scrollWidth == clientWidth ved 320/390/768/1440 lys+mørk; CLS < 0,05 (smoke-browser --cls 0.05 på index); kontrast >= 4,5:1 på nye tekster; tastatur-fokus synligt; `node --check` og `npm test` grønt; CRLF/LF bevaret pr. fil. |

## Resultat (før = 4378bba, efter = HEAD; screenshots i %TEMP%w9-frontend (fore-* før, efter-* efter), 1440+390, lys+mørk, normal/tom/fejl)

| Id | Status | Før | Efter |
|---|---|---|---|
| F1 | opfyldt | Favoritter skjult ved 0 (w7 CLS-fix) | synlig fra første maling >= 1180 px; tæller kun ved > 0; CLS index normal 0-0,015 |
| F2 | delvist | friskhedstekst 3 linjer i smal kolonne efter ·-tegn | sekundær 11 px-linje uden ·; kortet er stadig ca. 25 px højere end billedets, fordi friskhedsangivelsen er ægte data og bevares |
| F3 | opfyldt | nummercirkel oven på ikon | stablet; 0 overlap ved 320/390/768/1440 lys+mørk (boundingbox-test) |
| F4 | delvist | tom/fejl: "0 annoncer"-tal i kolonner, tom typeoverskrift, 1000 px bredt sælg-panel, sammenpresset region-kolonne, banner øverst: CLS 0,16-0,18 på 390 | ingen tal/typesektion, kompakt sælg-bånd, 2 kolonner; CLS 0 på 390 (lys+mørk) og 1440 mørk. 1440 lys flakker 0-0,246: banneret skubber "Udvalgte" 106 px, fordi der med vilje ikke reserveres plads til en fejltilstand (CSS-kommentar ved .data-afbrud) |
| F5 | opfyldt | – | Komponentkatalog i DESIGN_DNA.md |
| Generelt | opfyldt | – | smoke-browser (6 sider x 320/390/768/1440 x lys+mørk, --cls 0.05 --strikt): 0 fejl; scrollWidth==clientWidth; Tab-rækkefølge/fokusring i header OK; npm test 921 grøn; node --check rent. Header/footer-HTML uændret, så synk-header.js er IKKE kørt |

## Ændret
`css/styles.css` (Favoritter-regel fjernet, .saadan-*, .sk-frisk, body.lager-tomt, .tre-kol:has, #data-afbrud på forsiden), `js/home.js` (tomtLager), `js/components.js` (updateFavCount rører ikke .header-fav), `js/w7-visuel-kort.test.js` (W7-5-testen af skjult Favoritter erstattet bevidst: billede 1 viser linjen altid), `DESIGN_DNA.md`.

## DELT-ØNSKER / påvirker andre strømme
- Favoritter vises nu altid i desktopheaderen på ALLE sider (css + components.js); skuffens "Gemte annoncer" skjules stadig ved 0. Ingen annoncekort-funktioner rørt.
- Nye testfiler: ingen.

## Ligner IKKE billede 1 endnu (og hvorfor)
- Hero har ikke rytterfoto/solnedgang (vores foto er motorcykel uden rytter; AI-foto af rytter må ikke opdigtes som annoncebillede, hero-foto kunne skiftes af ejeren). Eyebrow siger ikke "Danmarks motorcykelmarked" (påstand).
- Ingen "12.842 motorcykler i Danmark", ingen mærke-logoer (monogramfliser i stedet; logoer er ikke licenseret), annoncekort uden hk/kg-chips hvor kilden ikke oplyser dem, kilde-label er domæne i stedet for "Forhandler/Privat".
- Sælg-panelets foto er en cruiser-illustration, ikke rytter på vej. "Bliv en del af fællesskabet" er ærligt erstattet af "Køb og sælg trygt" (intet fællesskab findes).
- Footer er mørk (billede 1 viser ingen footer) og indeholder hårdkodet inline-farve i alle sider; ændring kræver synk-header over mange filer og er ikke gjort. Nav har ikke "Viden".
- Mobil-hero og kortets tomhøjde er ikke målt mod billedet pixel for pixel (kun billede 1 desktop).

## Runde 2 (efter Critic AFVIS)
- P1-1: banneret ligger nu i .kort-raekke-pladsholderen (min-height 330/360 px fra første maling), så svaret ikke flytter noget. CLS tom+fejl, 320/390/768/1440, lys+mørk, svarforsinkelse 0 og 1200 ms: alle 0,000. Overflow 0.
- P1-2: det kompakte sælg-bånd er fjernet; sælg-panelet står som i normaltilstand (ingen tom højre kolonne).
- P3: forside-h1 clamp(54px,4.3vw,62px) fra 1100 px (kun forsiden). Normal CLS 0-0,010.
- Ny testfil: js/w9-frontend-tom.test.js (6 browsertests, skippes uden Chromium). npm test 927 grøn; smoke index 320-1440 lys+mørk 0 fejl.
- Rettelse af tidligere påstand: F4 var ikke kun 1440 lys; også 768 og mørk. Nu løst.
