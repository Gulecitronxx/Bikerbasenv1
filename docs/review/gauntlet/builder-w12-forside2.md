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

Skærmbilleder (udenfor repoet): `C:\Users\pasca\Desktop\rod\shots-w12\` — `before-*` / `after-*` (cookie 320 og 390, mørk forside 1440 + zoom, søgning 503).

- C1 målt: 320x568 = 159 px (28,0 %; før 495 px/87 %), 390x844 = 140 px (16,6 %; før 407 px/48 %), 768x1024 = 148 px (14,5 %), 1440x900 = 148 px (16,5 %), lys+mørk. C2 top >= 65 % overalt. C3 knapper 138x44 (320), 173x44 (390), 306x44 (>= 768), Læs mere 41 px højt. C4 fokus på "Kun nødvendige", Tab/Shift+Tab bliver i arket. C5 efter begge valg: søgefelt og CTA rammes af elementFromPoint (320x568). C6 CLS 0,004 (390), 0,014 (768), 0,005 (1440) — samme værdier som forsiden uden banner (sidens egen hydrering; arket er position:fixed), 0 overflow.
- K1 verificeret (se Bevis): A1 0,1 kW/kg, A2 0,2 kW/kg tilføjet; A uden effektgrænse uændret.
- M1 målt: lodret spring ved heroens kant 18-21 før, højst 6 efter (kolonne x=10: 15,13,9 til 33,30,22 før; 32,29,21 til 33,30,22 efter). M2 kortet løftet (92 % surface + hvid-blanding), opak kant.
- P1-P3 kræver ingen kodeændring: hero + 7 typefliser (8. skjult uden annoncer) indlæses, alle `img` har alt, lokale har width/height, fliser 172x124 (390) / 186x136 (1440), kortfoto 3:2; afvist kildefoto giver `.foto-fejl` uden formatskift. Kortfotos er lazy via `data-src` (ikke brudte, blot ikke hentet før de nærmer sig).
- F1/F2 målt 1440 og 390 (drawer åbnet): alle synlige tal er "?" under 503 (også aktive chips, hvor `.chip.active .facet-n{color:inherit}` ellers viste 0), ingen `.facet-empty`/disabled; uden fejl uændret.
- X1 `node scripts/smoke-browser.js --sider index,soegning --viewports 320,390,768,1024,1440 --strikt`: 20 målinger, 0 fejl, 0 advarsler. X3 `node --check` på alle js/scripts/crawler ok; `npm test`: 1078/1078 grønt.

## Bevis kW/kg
- Retsinformation (kørekortbekendtgørelsen, hentet via websøgning 17.10.2026): A1 "forholdet mellem effekt og køreklar vægt må ikke overstige 0,1 kW/kg", A2 højst 0,2 kW/kg; samme grænser som direktiv 2006/126/EF. Critic w11 læste desuden fstyr.dk "Kørekort til motorcykel" (A1: 11 kW, 0,1 kW/kg; A2: 35 kW, 0,2 kW/kg). fstyr.dk/borger.dk kunne ikke hentes direkte i dag (404 på de URL'er jeg prøvede), så kilden i tooltip er "Færdselsstyrelsen (fstyr.dk), Kørekort til motorcykel, og kørekortbekendtgørelsen på retsinformation.dk" uden dybe links.

## Fund undervejs
- Chromium: en ANDEN Escape uden brugeraktivering imellem er ikke annullerbar (`cancel` har cancelable=false), så dialogen lukkes uden valg, selvom `components.js` kalder preventDefault. Eksisterende adfærd, uændret; resultatet er privatlivssikkert (intet gemmes, statistik starter ikke — testet), og banneret vises igen på næste side.
- `index.html` har blandede linjeskift (498 CRLF / 613 LF i HEAD); redigeret uden normalisering.
- Cookie-markup er regenereret med `scripts/inline-cookie.js` i 92 sider (6 linjer pr. side); commit c6bdc7a indeholder derfor også forsidens kW/kg-linjer i index.html.

## Forslag til delt lag (header, billede 1 — ikke implementeret)
Billede 1: Motorcykler, Mærker, Kørekort, Artikler & guides, Viden, Om Bikerbasen | Favoritter, Log ind, Opret annonce. Vores header har de samme led undtagen "Viden" (bevidst: guides.html er "Artikler & guides"; to led ville pege samme sted) og "Om Bikerbasen", som først vises ved >= 1500 px (`.nav-sek`, styles.css:500). Forslag:
1. Vis "Om Bikerbasen" fra >= 1280 px (flyt `.nav-sek`-grænsen); der er plads ved 1440.
2. Header-højde 68 til ca. 56-60 px på desktop (billedets header er tyndere); `--header-h` styrer også scroll-padding og hero-overlap, så det er en delt ændring.
3. Chevron ved "Kørekort" fjernes eller vises kun ved hover (billedet har ingen); undermenuen A1/A2/A bevares som SEO-/funktionsvej.
4. Større, federe ordmærke (billedet), fx logo 34 px / tekst 22 px mod nu 30 / 20.
5. Brandfarven orange er allerede korrekt som primær CTA i stedet for billedets grønne.
