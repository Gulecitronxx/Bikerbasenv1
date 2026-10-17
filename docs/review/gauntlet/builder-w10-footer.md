# Builder w10-footer — footer, tap-mål og global tilgængelighed

## Acceptkriterier (skrevet FØR arbejdet)

1. `node scripts/smoke-browser.js --strikt` (alle rod-sider, 320-1440, lys+mørk) giver 0 advarsler, især tap-mål.
   Før: `vilkår` 34x19 og `privatlivspolitik` 90x19 ved 1440 på login/dashboard/mine-annoncer (dashboard og
   mine-annoncer sender en ikke-logget-ind besøgende til login-formularen, så kilden er `.lg-legal` i login).
2. Alle links i footeren og småtekst-links (`.lg-legal`, `.cookie-modal-note`, `.footer-bottom`) har en målt boks
   >= 40 px høj (>= 24 er WCAG-minimum) uden at sidens linjehøjde/visuelle størrelse ændres nævneværdigt.
3. Footeren har kolonnerne Bikerbasen (kontakt + kilde-note) / Køb / Sælg / Guides & viden / Juridisk. Alle 7 guides
   (guide-foerste-motorcykel, guide-a2-koerekort, guide-brugt-motorcykel, guide-mc-typer, guide-mc-ordliste,
   guide-mc-forsikring, guide-mc-udstyr) + guides.html er linket. Intet opdigtet: ingen CVR/adresse/telefon/app-links.
   Kontakt = kontakt@bikerbasen.dk kun hvis adressen allerede står et sted i repoet. Kilde-note: "Annoncer samlet fra danske
   forhandlere og markedspladser — kilden står på hvert kort".
4. Footerens link- og tekstfarver har kontrast >= 4,5:1 mod footerbaggrunden i lys og mørk (målt i browser).
5. Skip-link til `#main-content` findes på alle sider med `<main id="main-content">`; synlig fokusring på alle
   fokuserbare elementer (også i footeren, mørk baggrund); landmarks header/nav/main/footer; flere `<nav>` har aria-label;
   tema-skifter og mobilmenu-knap har `aria-expanded` (og menuknappen `aria-controls`), opdateret ved klik/Escape.
6. Header/footer er identiske på alle sider efter `node scripts/synk-header.js`; `--tjek` er grøn.
7. Browser-/DOM-tests `js/w10-footer*.test.js` (Playwright, ikke kun strengsøgning) er grønne; `node --check` og `npm test` grønne.

## Resultat

- Tap-mål: kilden til `vilkår` (34x19) og `privatlivspolitik` (90x19) var `.lg-legal` i login-formularen (dashboard og
  mine-annoncer viser den samme login-formular for en anonym besøgende). `css/p-login.css` satte `padding:0 2px` på
  inline-block. Rettet globalt i `css/styles.css` (w10-blokken): `main .lg-legal a, .cookie-modal-note a` er 40+ px høje via
  padding og negativ margin (linjehøjden uændret, målt). Footerlinks: min-højde 40 px, rækkeafstand 36 px (før 34).
- Footer: Bikerbasen (kilde-note + kontakt@bikerbasen.dk + tema) / Køb / Sælg / Guides & viden (alle 7 guides + guides.html
  + sikkerhed) / Juridisk. Hver kolonne er en `<nav aria-labelledby>`. 2 kolonner på telefon, 4 fra 768, brand + 4 fra 1100.
- Nav "Viden" er IKKE tilføjet: sitet har ingen separat videnside, "Artikler & guides" (guides.html) dækker det, og en
  ekstra menupost ville pege samme sted hen. Kolonnen i footeren hedder "Guides & viden".
- Tema-skifter: `aria-pressed` (ikke aria-expanded; knappen er til/fra, ikke udvidelig) synkroniseret på alle tre knapper
  (js/components.js). Menuknappen havde allerede aria-expanded/aria-controls + Escape + inert baggrund.
- Skip-link var på alle sider; gjort `position:fixed` med tydelig ring ved fokus. Fokusring i footeren er hvid (orange var
  for svag mod #1C1A18). Landmarks verificeret på 8 sidefamilier (header/nav[aria-label]/main/footer).
- Ingen opdigtet info: ingen CVR/adresse/telefon/app-links; kontakt@bikerbasen.dk står allerede i llms.txt og om-indeksering.html.

## Målt

- `node scripts/smoke-browser.js --strikt`: 736 målinger (92 sider x 320/390/768/1440 x lys+mørk), 0 fejl, 0 advarsler (før: 6 tap-mål).
- Kontrast footerlinks/tekst/overskrifter >= 4,5:1 i lys og mørk (testet i browser). Ingen vandret overflow 320-1440.
- `npm test`: 1007/1007 grøn (llms.txt gendannet). `node --check` på alle js/crawler/scripts grøn. `synk-header --tjek` grøn.

## Nye testfiler (Orchestratoren tilføjer til npm test)

- `js/w10-footer.test.js` (15 browser-/DOM-tests, Playwright via scripts/smoke-browser.js; skippes uden Chromium).

## Commits

Footer/CSS/JS/test, rettelse af guides-label, to separate synk-header-commits (90 HTML-filer, kun delte blokke).

## Rest / DELT-ØNSKE

- `.site-footer` har stadig `--color-dark` som flade i begge temaer (mørk footer også i lys tilstand, som før). Billedernes
  lyse footer er ikke kopieret; Orchestratoren kan vælge.
- Alle sider bruger nu index.html's footer; `.footer-bottom` er stadig sidens egen.
- Før/efter-screenshots: `C:\Users\pasca\Desktop\rod\wt\_shots-w10\`.
