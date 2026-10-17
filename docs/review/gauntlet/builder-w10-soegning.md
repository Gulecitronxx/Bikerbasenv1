# Builder w10-soegning (billede 2 søgeresultater, runde 2 efter "facelift, ikke gentænkning")

Branch `gauntlet/w10-soegning` fra 15c229c. Acceptkriterier skrevet FØR koden. Test: lokal mock (egen harness udenfor repo med 24 / 44 / 140 rækker + `scripts/smoke-browser.js` med `--cls 0.05`), ingen produktion, ingen build/udgiv/generatorer.
Fiktive tal, stjerner, "svartid", "autoriseret forhandler", betaling og beskeder fra billedet bruges ikke. Brandfarve orange/kobber, grøn kun til ✓. Kørekort: MULIG vs IKKE AFGJORT (48-49 hk) via `a2Status`.

## Acceptkriterier - billede 2 (`soegning.html`), målbare

### H. Hero og søgekort (billedets topzone)
- H1 Heroens højde (fra sidetop under headeren til kortets underkant) ved 1440 px er højst 300 px (før ca. 313 px + intet overlap). Søgekortet overlapper bannerets underkant: kortets midte ligger under bannerfotoets underkant (mål: card.bottom > hero.bottom - 1 og card.top < hero.bottom).
- H2 Overskriftens størrelse højst 44 px ved 1440 (billedet: ca. 40 px), undertitlen er den beregnede "N motorcykler til salg i Danmark" (N kun fra lageret; intet tal ved tomt/fejlet lager).
- H3 Søgefelt, Type, Maks. pris, Kørekort Alle/A1/A2/A og "Søg motorcykler" står på én række ved >= 1100 px. CTA er brandfarven.

### C. Aktive filter-chips
- C1 Ét chip pr. aktivt filter med x-knap (>= 40 px tap-højde inkl. hit-felt), "Ryd alle filtre" som tekstlink til højre for chipsene, på én række direkte under søgekortet ved 1440. Intet "Ingen filtre valgt"-fyld.
- C2 Fjern ét chip fjerner kun det filter; "Ryd alle filtre" nulstiller alt inkl. URL (ingen `?`-parametre tilbage).

### S. Sidebar
- S1 Sidebar-overskrift "Filtre" + "Ryd alle", sektioner i billedets rækkefølge: Mærke og model, Type (m. antal), Pris (skyder + hurtigvalg), Årgang, Kilometer, Kørekort (m. antal, Alle/A1/A2/A), Region, Sælgertype. Mindst 5 sektioner foldbare (`<details>`), åben/lukket tilstand synlig med chevron.
- S2 Sidebaren er sticky ved scroll på >= 960 px (ingen "forsvundet sidebar" ved lange lister) og er højst viewport-højden - header, med egen scroll.
- S3 Ny blok under filtrene "Gem søgning" (søgeagent): ærlig tekst: søgningen gemmes under Mine annoncer › Søgeagenter og tæller nye annoncer; der sendes endnu ingen e-mails. Knappen trigger den eksisterende `#save-search-btn`-handling (samme gem/fjern, samme tilstandstekst "Søgning gemt"). Ingen opfundet "besked"-funktion.

### R. Resultathoved
- R1 "N motorcykler fundet" + Sortér-felt + Gitter/Liste-skift står på ÉN linje ved >= 1100 px (samme midterlinje, målt: top-forskel < 8 px), tallet er 18-22 px fed.
- R2 Gitter er markeret med brandfarve; swipe-knappen vises kun < 760 px.
- R3 Info-båndet (kildefordeling, lagerets alder, sorteringsregel) er ÉN rolig, rammeløs linje i muted tekst direkte under resultathovedet (højde <= 40 px ved 1440 når alle tre vises), indholdet og id'er uændrede.

### K. Kortgitter
- K1 Kort: foto med hjerte/sammenlign, titel og pris på samme linje (>= 1100 px, titel til venstre, pris til højre; lang titel bryder til 2 linjer, pris står stadig til højre), "År | km | type", spec-chips KUN med oplyste tal (kørekortmærkat, ccm, hk), sted til venstre, sælgertype/kilde til højre. 4 kolonner ved 1440, 3 ved 1100, 2 ved 960, 2 på mobil.
- K2 Ingen "null/undefined/NaN" og ingen tomme chips ved manglende pris/km/hk/foto (mock-rækker uden pris, km, hk, foto).
- K3 Kørekort: 48 og 49 hk viser "Ikke afgjort", 44 hk "Mulig A2", 130 hk "Kræver A"; aldrig "bekræftet".

### P. Paginering
- P1 Under gitteret: "Viser 1-24 af N motorcykler" og nummereret paginering som runde felter (aktiv side i brandfarve, >= 40 x 40 px). Rigtige `<a href>` med filtre i adressen (uændret). Ved <= 24 resultater ingen paginering, men statuslinjen står stadig.
- P2 140 annoncer i mock -> 6 sider; side 2 viser 25-48; filtre og sortering bevares mellem sider; tilbage-knap går én side tilbage.

### T. Tilstande
- T1 Tom tilstand: ikon, "Ingen annoncer matcher", "Nulstil filtre" (primær) og "Gem søgningen"-genvej; ingen tomt gitter uden forklaring.
- T2 Fejltilstand (backend 503): ærlig besked + "Prøv igen"; intet snapshot-antal/kort; ingen konsolfejl udover blokerede kald.

### F. Funktion (ingen regression)
- F1 Fritekst, type, mærke/model, pris (skyder, hurtigvalg, felter), årgang, km, kørekort, region, sælgertype, kun billeder, sortering, gitter/liste, URL-tilstand (genindlæsning giver samme resultat), favorit (overlever reload), sammenlign.
- F2 Søgning -> annonce -> tilbage bevarer filter, sortering, visning og scroll (±10 px).

### X. Fælles
- X1 0 vandret overflow (scrollWidth == clientWidth) ved 320/390/768/1024/1440, lys + mørk, med 24 og 140 annoncer, også i tom og fejltilstand.
- X2 CLS < 0,05 (`node scripts/smoke-browser.js --sider soegning --cls 0.05 --strikt`) og på filter-URL'en `?q=honda&koerekort=A2&maxPrice=80000` ved 390 lys.
- X3 Tap-mål >= 40 px for chips, x, Ryd alle, sortering, visningsskift, paginering, Gem søgning (mobil >= 44 px beholdes).
- X4 Kontrast >= 4,5:1 for brødtekst/muted/chiptekst i lys og mørk (målt med getComputedStyle-script), fokusring synlig på chips, sort, visning, side-links, Gem søgning.
- X5 Tastatur: Tab-rækkefølge hero -> chips -> sidebar -> resultathoved -> kort -> paginering; Enter på chip-x fjerner filter; ingen fokusfælde.
- X6 `node --check` på js/scripts/crawler, `npm test` grønt (kendt: crawler-tests kræver node_modules; llms.txt omskrives af test og gendannes).

## Status / bevis
Skærmbilleder (udenfor repo): `%TEMP%w10-soegning` — `before-*` / `after-*` (1440 lys/mørk, 390 lys, tom, 503, liste). Harness `h.js`, `m.js`, `sc.js`, `f.js`, `a11y.js`, `cls.js` samme mappe. Mock-total er 98 (47 mock + 51 statisk snapshot) og 194 ved 140 rækker; 24 pr. side, så 1 -> 5 og 1 -> 9 sider; "<= 24 resultater" er målt med `?q=honda&koerekort=A2` (5 stk).

Bygget (kun p-soegning.css, soegning.html, js/search.js; ingen delte filer rørt)
- H1-H3: hero 264 -> 212 px; h1 44 px (var ca. 56); kortet hænger 52 px ned over bannerkanten (`display:flow-root` på hero, så den negative margen ikke klappes sammen; `z-index:2` så kortet ligger over chip-rækken). Én række af søgefelt/type/pris/kørekort/CTA ved >= 1100.
- C1-C2: chips + "Ryd alle filtre" lige under kortet, "Gem søgning" længst til højre; pille 40 px, x-hitfelt 44 px. Måling: ryd alle -> `location.search === ''`.
- S1-S3: sidebarens rækkefølge og foldbarhed var allerede som billedet; typerækker, Ryd alle og "Flere valg" løftet til >= 40 px. Gem søgning-panel under gitteret (`#so-agent`): ærlig tekst "Der sendes endnu ingen e-mails"; klikker på `#save-search-btn`, label følger tilstanden; skjules ved tomt/fejlet resultat og når tyndt-resultat-panelet (<= 3 træf) allerede har sin egen knap.
- R1-R3: tal, Sortér og Gitter/Liste på samme midterlinje (forskel 0 px ved 1440); info-båndet er en rammeløs muted linje (39 px ved 1440), højden reserveret pr. breakpoint (CLS).
- K1-K3: titel og pris på samme linje fra 560 px (titel max 2 linjer, pris til højre), foto 16:10, 4/3/2 kolonner. 48/49 hk "Ikke afgjort", 44 hk "Mulig A2" uændret via `a2Status`.
- P1-P2: "Viser 25–48 af N motorcykler" (kun når kortene er tegnet) + firkantede sidetal >= 40 px; "Side x af y" er nu kun for skærmlæsere. FEJL RETTET (fandtes før): sidetals-hrefs tabte `sort=` (åbn-i-ny-fane gav anden rækkefølge); nu `currentQueryString(true)`.
- T1-T2: tom og 503 målt (retry-knap, intet antal, ingen kort, ingen Viser/panel, 0 overflow, 0 konsolfejl).

Målt
- X1 overflow: 0 ved 320/390/768/1024/1440 x lys/mørk x {standard, side 2 af 140, tom, filter-URL}: 40 kombinationer + 503 ved 390/1440.
- X2 CLS: `smoke-browser --sider soegning --cls 0.05 --strikt`, 10 målinger, 0 fejl, 0 advarsler (største CLS 0,017; basislinjen 15c229c: 0,03; min første version gav op til 0,07 under parallel belastning, derfor reservationen af info-linjen og sen visning af Viser/panel). Filter-URL ved 390 lys: 0,0000.
- X3 tap-mål: alle målte kontroller >= 40 px (chips, x, Ryd alle, sortér, Gitter/Liste, Gem søgning, panelknap, sidetal, typerækker, Flere valg) ved 1440 og 390, lys og mørk.
- X4 kontrast: 0 tekstklasser under 4,5:1 (getComputedStyle mod nærmeste opake baggrund, lys + mørk, 1440/390).
- X5 tastatur: Tab-orden skip-link, header, søgekort, chips, Ryd alle, Gem søgning, sidebar; fokusring på alle undtagen de to skyderhåndtag (`dr-thumb`, eksisterende komponent); Enter på chip-x fjerner filtret.
- F: sortering (URL), liste/gitter, side 2 m. sort bevaret, favorit (overlever reload), sammenlign, søgning -> annonce -> tilbage (scroll 1400 -> 1400, filter bevaret).
- `node --check` OK. `npm test`: 1007/1007 grønt (llms.txt gendannet).

Nye testfiler (Orchestrator tilføjer til `npm test`): `js/w10-soegning.test.js` (5 tests, browser mod lokal mock, springes over uden Playwright). Eksisterende tests er ikke ændret.

Hvad ligner IKKE billedet endnu
- Foto-tæller (1/12), "Autoriseret forhandler", stjerner, tal i hero ("12.842"), antal pr. kørekort/type fra billedet: opdigtet eller forbudt (ét thumbnail pr. annonce).
- Kortenes A2-chip er orange/kobber (mulig) og sort (kræver A), ikke grøn; kg-chip findes ikke (vi har ikke vægten).
- Billedet har aldrig en tom chip-række; hos os står "Gem søgning" alene til højre, når ingen filtre er valgt (ca. 44 px). Knappen er sidens eneste vej til søgeagenten øverst.
- Ingen "Vis flere"-knap: pagineringen er rigtige links med filtre i adressen (SEO/tilbage-knap), og billedet viser ingen paginering.
- Mobil: kortets sted/kilde-linje afkortes i 2-kolonne-gitteret ("Ro...") — kortlayoutet er delt (styles.css/components.js, DELT-ØNSKE nedenfor).
- Sidebar-facettal i 503-tilstand viser stadig snapshot-tal (f.eks. 51).
- Info-linjen er stadig tre ærlige oplysninger (kilde, bekræftelsesdato, blandet udbud) men nu i én rolig linje; billedet har ingen.
- Swipe-knappen findes stadig ved siden af Gitter/Liste (ikon-kun); billedet har kun to. Skjules den på desktop, kan en gemt swipe-visning låse brugeren.

DELT-ØNSKE: (1) kortets sted/kilde-fod på 320-390 px i 2 kolonner (stak sted og kilde, eller kortere kildetekst) — css/styles.css / js/components.js; (2) hvis Orchestratoren vil have titel+pris på én linje på alle landingssidernes kort: reglen er i css/p-soegning.css (`#results-grid:not(.list-view) .rk-top`) og kan flyttes til styles.css.
Commits: se `git log gauntlet/w10-soegning` (d28b7f8 kriterier, 2390e1c, a731194, 22381cc, c5cbde5 + rapport).

