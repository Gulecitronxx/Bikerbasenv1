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
