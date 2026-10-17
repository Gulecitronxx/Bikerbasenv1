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
(udfyldes nedenfor efter bygning)
