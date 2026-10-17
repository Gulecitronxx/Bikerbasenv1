# Builder w12-forside2 (åbne rester fra Critic w11 forside + samlet)

Branch `gauntlet/w12-forside2` fra 46f107a. Test mod lokal mock (smoke-browser + fixtures); ingen build/generator mod produktion (kun `scripts/inline-cookie.js`, der kun læser `js/store.js` og skriver cookie-blokken i HTML). Forbudt og ikke brugt: opdigtede tal, anmeldelser, beskeder, betaling. Samtykkelogikken (js/components.js `initCookieConsent`) er uændret; kun layout og tekstlængde.

## Acceptkriterier (målbare, skrevet før målingen)

### 1. Cookie-banner
- C1 Højde <= 30 % af viewporten ved 320x568, 390x844, 768x1024 og 1440x900 (lys og mørk). Før: 407 px ved 390x844 (48 %), 495 px ved 320x568 (87 %).
- C2 Arkets top ligger under 65 % af viewporten (hero, søgekort og fold er synlige ovenover); bundplaceret (mobil: kant mod kant, >= 700 px: fritsvævende kort 16 px fra bunden).
- C3 To ligeværdige knapper: samme klasse, samme bredde (px), højde >= 40 px (målt 44), ingen primærfarve på nogen af dem; "Læs mere"-link til privatlivspolitik med tap-højde >= 40 px.
- C4 Tilgængelighed: `<dialog>` + `showModal()` (role dialog, fokusfælde, inert baggrund), navn (`aria-labelledby`) og beskrivelse (`aria-describedby`), startfokus på "Kun nødvendige", Tab/Shift+Tab forlader aldrig arket til siden bagved. Escape gemmer aldrig et valg og starter aldrig statistik.
- C5 Efter et valg er arket væk, valget er gemt (`necessary`/`all`), og søgefeltet og "Søg motorcykler" rammes af `elementFromPoint` på 320x568 (intet dækket permanent).
- C6 CLS < 0,05 og 0 vandret overflow; arket er `position:fixed` (påvirker ikke layout).
- C7 Samtykketeksten bevarer begge budskaber: nødvendige cookies kan ikke fravælges/følger dig ikke; statistik starter kun ved ja.

### 2. kW/kg
- K1 Kørekortkolonnen på forsiden viser "højst 0,1 kW/kg" (A1) og "højst 0,2 kW/kg" (A2) ud for 11 kW/35 kW, med kilde i `title`. Kun hvis tallet kan bekræftes mod en officiel kilde (se Bevis).

### 3. Mørkt tema, 1440
- M1 Heroens underkant er ikke en synlig kant: største lodrette pixelspring i kolonnerne uden for søgekortet, +-12 px omkring heroens underkant, er <= 6 (af 255). Før: 18-21 (15,13,9 -> 33,30,22).
- M2 Søgekortets kant er opak og kortet løftet over båndet (kortet læses ikke som halvgennemsigtigt).

### 4. Pladsholdere/fotos
- P1 Alle lokale `img/…`-billeder på forsiden (hero + 7-8 typefliser) indlæses (naturalWidth > 0), har `alt` og `width`/`height`.
- P2 Alle synlige typefliser har samme størrelse (fast højde), alle `.card-media` samme billedformat (3:2).
- P3 Afvist kildefoto (abort) efterlader ingen knækkede billeder og ændrer ikke kortets format.

### 5. Header-nav
- N1 Sammenligning med billede 1 og forslag til det delte lag (ikke implementeret). Se rapport.

### 6. Facetsidebar ved lagerfejl
- F1 Under `html[data-lager-fejl]` viser hvert synligt `.facet-n` i søgesidens sidebar "?" (ciffer transparent, `::after`), ingen kontrol markeres/spærres som blindgyde (`.facet-empty`/disabled), også aktive chips. Gælder 1440 og 390 (drawer åbnet). CLS < 0,05.
- F2 Uden fejl er tallene uændrede og synlige.

### Fælles
- X1 smoke-browser `--strikt` på forside + søgning ved 320/390/768/1024/1440, lys+mørk: 0 fejl, 0 advarsler (overflow, CLS, tap-mål, kontrast via strikt-tjek).
- X2 Kontrast >= 4,5:1 for cookie-tekst (#C9C3B8 på --color-dark) og "?"-tal.
- X3 `node --check` og `npm test` grønt (kendt: crawler-tests kræver node_modules).

Ejerfiler rørt: `index.html` (kørekortkolonne + cookie-blok), `css/p-forside.css`, `css/p-soegning.css`, `css/styles.css` (kun cookie-blokken), `scripts/inline-cookie.js` (+ regenereret cookie-blok i 92 sider), `js/search.js` (kun `saetFacet`), ny `js/w12-forside2.test.js`. `js/components.js` er IKKE rørt (cookie-funktionen havde ikke brug for ændring).

## Resultater

(udfyldes nedenfor)
