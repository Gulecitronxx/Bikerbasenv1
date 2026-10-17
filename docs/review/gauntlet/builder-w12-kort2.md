# Builder w12-kort2 (rester fra Critic w11: kort-overlay, liste/swipe-fod, fejlbanner, kildenavn)

Branch `gauntlet/w12-kort2` fra 7ef5efa. Kun lokal mock (smoke-browser/smoke-fixtures), ingen produktion, ingen build/udgiv/generatorer.
Intet opdigtet: ingen stjerner, anmeldelser, "autoriseret", svartid, beskeder, betaling. Grøn kun ✓. Kørekort via `a2Status`/`koerekortMaerkat`.

## Acceptkriterier (målbare, skrevet før koden)

- O1 Overlay-overlap: ved 320/360/390/768/1440 px (lys) er `getBoundingClientRect`-skæringen 0 px mellem (hjerte `.fav-btn`, sammenlign `.card-compare`) og (alle `.badge` i `.card-media`, `.foto-tom-titel`, `.foto-tom-ikon`), og mellem knapperne indbyrdes og mellem badges og foto-tom-tekst. Målt på søgning (grid), mærke-, type-, annonce-"lignende", forside, sammenlign-visning samt syntetiske kort: egen m/u foto, forhandler, "Nyt opslag", "Under markedspris" og alle tre samtidig.
- O2 Ingen badge eller "Ingen fotos i denne annonce"-tekst ligger delvist uden for fotofeltet, og ingen badge er afkortet (`scrollWidth <= clientWidth`, ingen "FORHANDLE…").
- O3 Badge-teksten "Forhandler" er læsbar i fuld længde, eller badgen er ikon med `title`/tekst for skærmlæser; kortets øvrige højder er uændrede (nabokort i en række: top/bund-forskel <= 1 px).
- R1 `listingRowHTML` og `swipeCardHTML` (egne og eksterne) bruger `kortFodHTML(l, f)`: hver række/swipe-kort har `.rk-fod` med `.rk-sted` FØR `.rk-kilde`, begge med `title` og `aria-label` ("Sted: …"/"Kilde: …"). Rækkens øvrige layout uændret (grid-områder, højde +-2 px).
- F1 soegning.html ved 390 px under lagerfejl (mock 503): fejlbanneret skærer ikke hero-/sidens h1 (`getBoundingClientRect`-skæring 0), bevarer `role="alert"`, "Prøv igen" og "Luk" (begge >= 36 px høje), CLS < 0,05, kun < 1024 px; desktop uændret.
- K1 Kildenavn i kortfod ved 139 px kort: op til 2 linjer (line-clamp) i stedet for 1 linje ellipsis; alle kort i samme række har samme højde (`.rk-fod` højde ens, kort-top/bund-forskel <= 1 px); sted står stadig først og aldrig afkortet til under 4 tegn.
- T1 smoke-browser `--strikt` (soegning, index, maerke-honda, type-sport, annonce) x 320/390/768/1024/1440 x lys+mørk: 0 fejl, 0 advarsler (tap-mål >= 24 px, kontrast >= 4,5:1 for badge-/fodtekst målt med getComputedStyle).
- G node --check, `npm test` grønt, ingen ændring udenfor ejerfiler; før/efter-screenshots udenfor repoet.

## Status / bevis (mock, ingen produktion/build/udgiv)
- O1-O3: foto-overlay omlagt (css/styles.css kortblok): hjerte-/sammenlign-kolonne på 52 px er reserveret; "Ingen fotos"-teksten ligger mellem mærkaterne og bunden; under 240 px kortbredde er mærkaterne kompakte (10 px, sætningsstort, "Forhandler" som tekst når det er det eneste, ellers ikon; "Under markedspris" ikon med title), kameraikonet skjules. Aspekt 4:3 under 150 px kortbredde (og under 360 px på søgning, hvor p-soegning.css overstyrede W7-1). Målt 0 skæringer/afkortninger/udenfor-felt på 5 bredder x søgning/mærke/type/forside/annonce + 6 syntetiske kort (før: 331 fund).
- R1: `listingRowHTML`, `externalRowHTML` og `swipeCardHTML` bruger `kortFodHTML(l, f)`; 24/24 rækker og swipe-kort har `.rk-fod`, sted før kilde, title + aria-label. Rækkehøjder uændrede eller lavere (320: 340 -> 320, 390: 300 -> 298). Swipe-badgens skjold-ikon (som antydede "verificeret") er byttet til butiksikon.
- F1: søgesiden under 1024 px: banneret ligger som blok øverst i `#so-results` (`.data-afbrud-flow`), 54 px højt, knapper 36 px, role=alert, Prøv igen/Luk. Skærer hverken h1 eller søgefelt (før: 56 px overlay over h1 ved 320/390/768). CLS 0,012-0,036 (< 0,05). Desktop og andre sider uændret (fast overlay). Bevidst testændring: `js/w10-fejl.test.js` kræver ikke længere `position:fixed` for dette ene tilfælde.
- K1: kildenavn i smalle kort op til 2 linjer (line-clamp), 2 linjer reserveret på alle kort så fodhøjden er ens i rækken. Kørekortchippen ("Kørekort ikke afgjort — tjek kW") ombrydes i stedet for at blive klippet af kortets kant.
- T1: `smoke-browser --strikt` soegning/index/maerke-honda/type-sport/annonce x 5 bredder x lys+mørk: 50 målinger, 0 fejl, 0 advarsler.
- G: `node --check` ok. Nye tests: `js/w12-kort2.test.js` (19 browsertests med w10-fejl). `npm test` før banner-justeringen: 1077/1078 (kun W10-testen krævede fixed); efter: W10 + w12 grønne.
- Skærmbilleder (udenfor repo): `%TEMP%\w12\foer`, `efter`, `foer-ban`, `efter-ban`, `vr-foer`, `vr-efter` (visuel-regression: mobil er bevidst ændret, 1440 0,2-0,6 %).
