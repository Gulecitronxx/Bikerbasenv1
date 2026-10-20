# V5 QA (kritiker) - fase 1

Worktree: wt/v5-qa, branch gauntlet/v5-qa, udgangspunkt gauntlet/master cbbb411f. Kritikerens egne filer er kun scripts/tests; alt andet er meldt som verificerede fund i `qa-fund.md`.

## Hvad der er bygget (nye/ændrede filer)

| Fil | Formål |
|---|---|
| `scripts/v5-maerke-krav.js` + `.test.js` | De nye mærkekrav (A-D nedenfor) som tjek, der FEJLER indtil de andre agenter har rettet det. Kontrolsider i testen beviser, at hvert tjek både kan bestå og fejle. |
| `scripts/v4-maerke-dakning.js` (udvidet) | Kalder v5-tjekkene som gruppe "7 V5-krav". Nye flag: `--streng-v5` (v5-krav tæller som nye fejl trods kendt-listen, brug efter merge), `--uden-v5`. |
| `scripts/v4-maerke-dakning.kendt.json` | 29 v5-poster (`v5-...\|*`) = kendte fund indtil de er rettet. Testsuiten er grøn; fundene vises og tæller ikke i exit-koden. |
| `scripts/v4-maerke-dakning.test.js` (udvidet) | Låser at v5-tjekkene faktisk kører (dækningstællere). |
| `scripts/v5-sidevaegt.js` + `.budget.json` + `.test.js` | Sidevægts-/data.js-vagt (gzip-budgetter pr. fil, side og målt overførsel). |
| `scripts/v5-kompatibilitet.js` + `.test.js` | Statisk scanning af css/js for moderne funktioner + versionsgulv + simulering af ældre browser (`degrader()`). |
| `scripts/v5-krydsbrowser.js` + `.test.js` | Chromium / Google Chrome / Microsoft Edge mod lokal build og live; funktionsprober, cookie, søgning, annonce, layout-fingeraftryk, `--degrader`. |

Test-filer til `package.json` "test" (Orchestrator ejer listen): `scripts/v5-maerke-krav.test.js scripts/v5-sidevaegt.test.js scripts/v5-kompatibilitet.test.js scripts/v5-krydsbrowser.test.js` (+ `scripts/v4-maerke-dakning.test.js` er allerede på listen). Tider: 20 s, 25 s, 80 s, 130 s (browserdele springes over uden Playwright/kanal).

## 1. Cross-browser

### Hvad der kan og ikke kan måles her
Playwright har kun Chromium (Firefox/WebKit er ikke installeret, og der er ikke installeret noget). Kanaler brugt: bundlet Chromium 151, Google Chrome 155, Microsoft Edge 155. Chrome og Edge er samme motor som Chromium (Blink): de fanger versions-/profilforskelle, ikke Safari/Firefox. Derfor to erstatninger for det, motoren ikke kan vise:
1. Statisk funktionsscanning (`v5-kompatibilitet.js`): hvilke moderne funktioner koden bruger, hvor mange steder, og hvilken version de kræver (versionstabellen er fra MDN/caniuse efter bedste viden - verificér ved tvivl).
2. Ældre-browser-simulering (`--degrader`): CSS'en køres med det en ældre browser ville ignorere fjernet (regler med `:has()`, `@container`-blokke, deklarationer med `color-mix()`/`dvh`), og siden måles igen.

### Resultat: Chrome / Edge / Chromium, live (https://bikerbasen.dk) og lokal build (gauntlet/master cbbb411f)
Rapporter: `krydsbrowser-live.md`, `krydsbrowser-lokal.md`; screenshots i `krydsbrowser/`.

| Kontrol | Chromium 151 | Chrome 155 | Edge 155 |
|---|---|---|---|
| Live: konsolfejl / sidefejl / 4xx (9 sider x 375+1440 x lys+mørk) | 0 | 0 | 0 |
| Live: mislykkede forespørgsler | 1 ekstern (billede, se F7) | 1 ekstern | 1 ekstern |
| Live: vandret overflow, h1-antal, brudte billeder | 0 | 0 | 0 |
| Live: cookie-dialog (vises, `:modal`, "Kun nødvendige" lukker, huskes efter genindlæsning, siden klikbar) | ok | ok | ok |
| Live: søgning (720 annoncer; "honda" 307; mærkevælger Honda 307; nulstil 720) | ok | ok | ok |
| Live: annonceside (rigtig annonce: h1, pris, billede) | ok | ok | ok |
| Lokal: konsol/side/overflow/h1 (11 sider x 375+1440 x lys+mørk) | 0 | 0 | 0 |
| Lokal: cookie, søgning (fritekst, mærkevælger, nulstil), annonce | ok | ok | ok |
| Layout-fingeraftryk (dokumenthøjde, headerhøjde, h1-skrift, indlæste fonte) mellem kanaler | - | ingen forskel >2 % | ingen forskel >2 % |
| Funktionsprober (`:has`, `@container`, `color-mix`, `dvh`, lookbehind, `inert`, `showModal`, `randomUUID` m.fl., 23 stk.) | alle ja | alle ja | alle ja |

Advarsler (ingen fejl): `ios-zoom-felt` (se F2), `usynlig-tekst` (se F1, kun lokal build), `ekstern-forespoergsel` (F7).

### Funktionsmatrix (hvad koden bruger og hvad det kræver)
Fra `node scripts/v5-kompatibilitet.js` (antal = forekomster i css/js/inline). "Uden støtte": nej = fejl/død funktion, delvist = layout/pynt forringes, progressiv = ren forbedring.

| Funktion | Brugt | Chrome/Edge | Safari/iOS | Firefox | Uden støtte |
|---|---|---|---|---|---|
| Regex lookbehind `(?<=` `(?<!` | 7 (5 filer) | 62 | **16.4** | 78 | **nej - parse-fejl dræber filen** |
| `color-mix()` | 363 | **111** | 16.2 | 113 | delvist |
| `:has()` | 299 | 105 | 15.4 | **121** | delvist |
| `@container` / `container-type` | 311 | 105 | 16 | 110 | delvist |
| `dvh`/`svh`/`lvh` | 62 | 108 | 15.4 | 101 | delvist |
| `inert` | 6 | 102 | 15.5 | 112 | delvist |
| `<dialog>.showModal()` | 106 | 37 | 15.4 | 98 | delvist (confirm()-fallback) |
| `crypto.randomUUID()` | 1 | 92 | 15.4 | 95 | nej (kun billedupload, kræver HTTPS) |
| `:focus-visible` | 503 | 86 | 15.4 | 85 | delvist |
| `aspect-ratio` | 411 | 88 | 15 | 89 | delvist |
| `gap` (flex/grid), `inset`, `:is()/:where()`, logiske egenskaber, `clamp()/min()/max()` | 500-4700 | 79-88 | 13.1-14.1 | 63-78 | delvist |
| `?.` `??`, private felter `#x`, BigInt, `\p{L}` | 191/1/1/9 | 64-80 | 11.1-14.1 | 68-90 | nej |
| `text-wrap: balance`, `scrollbar-width`, `content-visibility`, `backdrop-filter`, `accent-color`, `::backdrop`, `overscroll-behavior`, `mask` (både `-webkit-` og uprefixet) | 1-225 | 63-121 | 15.4-18.2 | 53-125 | progressiv |

**Gulv** (laveste version hvor siden virker uden at noget går i stykker): Chrome/Edge 111 (color-mix), Safari/iOS **16.4** (lookbehind; 16.2 uden den), Firefox 121 (`:has`). Vagtlisten (nesting, `@scope`, anchor, popover, `toSorted`, `groupBy`, `structuredClone` m.fl.) er tom; testen fejler hvis en ny funktion hæver gulvet over denne baseline.

### Ældre-browser-simulering (Chromium, 11 sider x 375+1440 x lys+mørk = 44 målinger/variant)
Kontrol (uændret kørt igen) = 0 forskelle, så forskellene er reelle.

| Browser uden... | Ny overflow | Ny usynlig tekst | Sider med forskel >2 % højde | Hvad man ser |
|---|---|---|---|---|
| `:has()` (Safari <15.4, FF <121) | 0 | 0 | 4/44 (annonce, søgning @1440) | Facet-/filterrækker mister kompakt afstand (+520-620 px højde), alt kan bruges |
| `@container` (Safari <16, FF <110, Chrome <105) | 0 | 0 | 8/44 | **opret-annonce@1440: 4-kolonne-formularen falder til 1 kolonne (+1162 px, +623 px @375)**; annonce +142; søgning @375 -379 |
| `color-mix()` (Safari <16.2, FF <113, Chrome <111) | 0 | 0 | 0/44 | Ingen målbar forskel i højde/overflow og ingen usynlig tekst; om baggrunde/skygger bliver fladere er ikke vurderet visuelt |
| `dvh` (Safari <15.4, FF <101) | 0 | 0 | 2/44 | søgning +76 px (min-højde falder tilbage) |
| alt ovenstående | 0 | 0 | 10/44 | Fuldt brugbart, men opret-annonce og søgning ser tydeligt anderledes ud |

Konklusion: designet degraderer pænt for alle fire CSS-funktioner (intet vandret overflow, ingen usynlig tekst, ingen konsolfejl). Det eneste, der IKKE degraderer, er JavaScript-syntaksen: lookbehind giver en parse-fejl i Safari < 16.4, og så er `Store`/annoncer/søgning døde på de iPhones (se F3).

## 2. Mærkekrav (fase 1) - tjek der fejler indtil de andre har rettet det
`node scripts/v4-maerke-dakning.js --hurtig --kendt scripts/v4-maerke-dakning.kendt.json --baseline docs/review/gauntlet/v4/qa/maerke-baseline-fixtures.json` -> gruppen "7 V5-krav". Pr. cbbb411f giver gruppen 5 fund (fejl), alle på kendt-listen:

| Krav | Tjek | Status pr. cbbb411f |
|---|---|---|
| A. "Andet mærke" i opret-annonce (valgmulighed, tekstfelt, validering tom/blank/for lang/HTML, ingen automatisk offentligt mærke, teksten gemmes, forsvinder ved skift) | `v5-andet-*` (15 tjek) | FEJLER: `v5-andet-mangler` (#f-brand har 94 valg, ingen "Andet mærke") - resten kører først når valgmuligheden findes |
| B. Levende hydrering af "Flere mærker" (mocket Zero-annonce): pillen bliver række/link, tal og sum stemmer | `v5-flere-*`, `v5-oversigt-sum-efter-hydrering` | FEJLER: `v5-flere-ikke-hydreret` (maerker.html henter slet ikke lageret; Vespa og Piaggio har annoncer i fixtures men står som inerte piller) |
| C. Hurtigsøgningen finder piller i "Flere mærker" | `v5-hurtigsoeg-*` | FEJLER: `v5-hurtigsoeg-pille-filter` (alle 63 piller forbliver synlige uanset søgning), `v5-hurtigsoeg-status` ("Ingen mærker matcher" selvom en pille matcher) |
| D. Ukendt `?brands=xyz` spejles ikke i H1 | `v5-ukendt-maerke-i-h1` | FEJLER: H1 er "xyz til salg - ingen annoncer lige nu" |

Kontrakten (DOM-valg) står øverst i `scripts/v5-maerke-krav.js` og er bevidst løs: Andet-feltet findes som "nyt synligt tekstfelt efter valg"; piller = `ul.mk-flere > li`; hydreret mærke = A-Z-række eller link til `maerke-<slug>.html` / `soegning.html?brands=<mærke>`. Er kontrakten forkert, skal den rettes - ikke koden presses til den.

Efter merge (fase 2): kør `node scripts/v4-maerke-dakning.js --data live --baseline docs/review/gauntlet/v4/qa/maerke-baseline-live.json --kendt scripts/v4-maerke-dakning.kendt.json --streng-v5` på en kopi af master (`git archive cbbb411f` + build i kopien) og tøm v5-linjerne i kendt-listen.

## 3. Sidevægt og data.js
`node scripts/v5-sidevaegt.js [--browser]`; budget i `scripts/v5-sidevaegt.budget.json` (nuværende + 10 % pr. fil, +8 % pr. side, +10 % målt). Hæves bevidst med `--gem-budget`.

| Mål | Nu (gzip) | Budget |
|---|---|---|
| `js/data.js` | 44,8 kB (123,8 kB rå) | 49,3 kB |
| `css/styles.css` / `js/search.js` | 51,8 / 49,4 kB | 57,0 / 54,4 kB |
| annonce.html (HTML + egne js/css + fonte) | 390 kB | 421 kB |
| soegning.html / opret-annonce.html | 357 / 350 kB | 386 / 378 kB |
| dashboard.html / mine-annoncer.html (statisk) | 335 / 336 kB | 361 / 363 kB |
| Målt i Chromium (inkl. billeder): index / soegning / annonce | 578 / 459 / 410 kB | +10 % |

**Dashboard/mine-annoncer "2,2 MB mod 1,0 MB ellers" er en målingsartefakt, men peger på noget ægte.** Uden login omdirigerer begge sider til `login.html?redirect=...`; v3-regression måler derfor to sider (40 filer, 1019 kB gzip: dashboard 335 + login 554 + ekstra fonte/billeder) i stedet for én. Den virkelige regning for en udlogget besøgende er, at hele dashboard-pakken (196 kB JS + 66 kB CSS gzip) hentes, parses og først derefter smides væk (F4).

## 4. Ejer-tjekliste: iPhone/Safari og Firefox
Jeg kan ikke køre Safari eller Firefox. Gulvet står i matrixen ovenfor; nedenfor det, du skal se efter med egne øjne. Alt er sorteret efter risiko.

### iPhone / Safari (kræver iOS 16.4 eller nyere; test helst på 16.x og seneste)
1. Version: Indstillinger > Generelt > Info. **iOS under 16.4 = siden kan være helt død** (lookbehind, F3). Er det en mulig målgruppe (iPhone 6s/7/8 på iOS 15/16.0-16.3), skal koden rettes - ellers skal det accepteres bevidst.
2. Åbn bikerbasen.dk i en privat fane. Cookie-dialogen skal vises; "Kun nødvendige" lukker den; siden kan derefter scrolles og klikkes (dialogen bruger `<dialog>.showModal()`, Safari 15.4+).
3. Forside: tryk i "Mærke eller model". **Zoomer siden ind?** Forventet: ja (felterne er 15 px; iOS zoomer ved <16 px) - samme på typesider, mærkesider, mærkeoversigtens hurtigsøgning (F2).
4. Søgning: skriv "honda" -> 307 hits (live). Åbn filter-panelet (bottom sheet): kan det scrolles, og ligger nederste knap tydeligt over Safaris værktøjslinje? (`max-height:88vh` i stedet for `dvh`, F5.)
5. Annonce: swipe i galleriet, åbn lightbox (skal fylde hele skærmen, `100dvh`, ingen hvidt bånd under), "Vis nummer"-knappen (mobil-CTA).
6. Opret annonce: vælg mærke (hjul-vælger), (efter V5) "Andet mærke", tilføj billede fra kamerarulle (HEIC), tastatur må ikke skjule feltet; kontrollér at formularens kolonner ser rigtige ud på telefon og tablet.
7. Mørk tilstand (iOS Udseende), liggende format (notch/safe area; siden bruger ikke `viewport-fit=cover`, så den holder sig inden for sikkert område).
8. Fejlfinding på Mac: Safari > Udvikler > [din iPhone] > Web Inspector; konsollen skal være tom. På iOS < 16.4 ser man "SyntaxError: Invalid regular expression: invalid group specifier name".

### Firefox (desktop >= 121, Android Firefox; ESR 115 og ældre mangler `:has()`)
1. Version: `about:support`. Under 121: `:has()`-regler ignoreres (facetter/filter mister afstand; annonce/søgning ser anderledes ud, intet går i stykker - se simulering).
2. Cookie-dialog og søgning som ovenfor; åbn Udviklerværktøjer (F12) > Konsol: skal være tom.
3. Filtre i venstre side på søgning: afkrydsningsfelter, "Tilføj flere mærker", prisområde, kortraekke; ingen vandret scrollbar.
4. `scrollbar-width: thin` (Firefox har den længst): tjek at filtre-/mærkelister ser pæne ud. `text-wrap: balance` er ren pynt.
5. Fokusringe med tastatur (Tab): synlige på knapper/links (`:focus-visible`).
6. Strengt sporingsværn (Indstillinger > Anonymitet): ekstern billedkilde (`assets.guloggratis.dk`) skal ikke give hullede kort.
7. Opret annonce: `<input type=number>` (årgang, km, ccm) med pile og komma/punktum; datalist til model (`#model-suggestions`); billedvalg.

### Hvis noget afviger
Skriv enhed + iOS/Firefox-version + side + skærmbillede. Chrome/Edge-resultaterne ovenfor er identiske, så en forskel i Safari/Firefox er en motorforskel, ikke et datafund.

## Fase 2 (når Orchestrator beder om det)
1. `git archive cbbb411f` (eller master efter merge) til en tom mappe; kør `node scripts/build.js` i kopien (aldrig i repoet).
2. `node scripts/v3-regression.js --rod <kopi>` og `node scripts/v4-maerke-dakning.js --rod <kopi> --data live --baseline ... --streng-v5`.
3. `node scripts/v5-sidevaegt.js --rod <kopi> --browser`, `node scripts/v5-krydsbrowser.js --rod <kopi> --maal lokal,live --degrader`.
4. Uafhængig dom i dette dokument.
