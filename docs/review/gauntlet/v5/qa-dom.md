# V5 QA - uafhængig dom (fase 2)

Grundlag: `git archive` af integreret HEAD (gauntlet/master 625ec7f5 + QA-commits), bygget KUN i en kopi (`build -> kritisk-gen -> build`), lokal mock (intet netværk; live-data kun GET via snapshot). Kontrolkommandoer står nederst.

## Dom: IKKE PUSH endnu - ét blokerende punkt (P1), 2 min at rette. PUSH når `npm test` er grøn.

`npm run gate` kører `npm test` (scripts/verificer-site.js:44), og testen `K2b: Mine annoncer - statistikkolonnen pr. annonce hedder Telefonvisninger` (js/w7-funktion.test.js:136) er rød i den integrerede build. Alt andet består, eller er P2/P3 uden blokering.

| Niveau | # | Fund | Bevis | Forslag | Ejer |
|---|---|---|---|---|---|
| **P1** | 1 | `npm test` RØD (1 af 1686): K2b. Produktionskoden er ikke ødelagt; testens falske DOM (`js/w7-funktion-hjaelp.js`) har `insertAdjacentElement` men ikke `insertAdjacentHTML`, som V5-saelger-commit 79853259 tog i brug i `js/mine-annoncer.js:311` ("Seneste 30 dage"). `TypeError: blok.insertAdjacentHTML is not a function` | `node --test js/w7-funktion.test.js` på master; gate `verificer-site` kører npm test | Tilføj `insertAdjacentHTML(pos, html){ el.innerHTML += html; }` til det falske element (w7-funktion-hjaelp.js l. 29, ved siden af insertAdjacentElement) eller lad koden bruge `document.createElement('span')` + appendChild | saelger-ejer (js/w7-funktion-hjaelp.js) |
| P2 | 2 | Kun-lokale favoritter (indekserede kort) kan ikke ses uden login: header-hjertet "Gemte annoncer" linker til `mine-annoncer.html?tab=favoritter`, og siden sender anonyme til `login.html?redirect=...` (js/mine-annoncer.js:862). En anonym besøgende kan trykke hjerte på 30 kort, men aldrig se dem igen uden at oprette en konto. Kommentaren i js/components.js:38 siger stadig "favoritter virker for anonyme" | `v5-fase2-stikproever.js` A3a: ender på /login.html. Med lokal session (A3b) vises favoritten, og fjernes den igen, forsvinder den også fra `bb_favorites_ext` | Lad `?tab=favoritter` være åben for anonyme (kun den fane; resten kræver stadig login), eller giv hjertet i headeren en lille "gemmes kun i denne browser"-side uden login. Opdater kommentaren | saelger/favorit-ejer |
| P2 | 3 | Guide-figur beskæres hårdt: `guide-brugt-motorcykel.html` viser classic.webp (456x342) som en 704x180-strimmel ved 768 px (66 % beskåret, kun hjulene synlige) og opskaleret til 936 px ved 1440 (uskarp) | `v5-fase2-stikproever.js` E; skærmbilleder `qa/guide-fig-375/768/1440.png` | `.gd-fig img`: fast billedformat 3:2 (som kortene) eller `object-fit: contain` på lys flade, og `max-width` ved billedets egen bredde. Guidekortene selv er i orden (se nedenfor) | guides (css/p-guides.css) |
| P3 | 4 | CLS ved søgning med få resultater: i fixtures (2 hits) flytter `#thin-result-panel` gitteret 58 px ved 1440 (CLS 0,248; 375: 0,061). Med de 720 rigtige live-annoncer (snapshot) er 8 dybe links højst 0,061 (375) og 0,025 (1440), så fundet er kun synligt, når få annoncer matcher | `v5-fase2-stikproever.js` F + replay mod live-snapshot (`work`-script i scratch) | Reservér pladsen til `#thin-result-panel` før hydrering (som øvrige reservationer), så få-resultater-tilstanden ikke skubber | søgning |
| P3 | 5 | `maerker.html` henter nu hele data-stakken efter første maling (+44 kB JS gzip, heraf `js/vendor/supabase.js` 54 kB): målt 454,8 kB mod 402,9 kB. Bevidst (V5-krav B, sker først efter load og ikke ved Save-Data), men dyr for en side, der kun skal vide antal pr. mærke | `v5-sidevaegt.js --browser`, budgetbegrundelse for js/maerker-lager.js | Hent REST-endepunktet med `fetch` og tæl i maerker-lager.js i stedet for hele Supabase-klienten (-54 kB) | maerker |
| P3 | 6 | `img/brands/triumph.svg` har 20 resterende `inkscape:connector-curvature`-attributter (harmløse; ingen e-mail, metadata-blok, script eller ekstern reference i nogen af de 47 SVG'er) | `v5-fase2-stikproever.js` D1/D1b | Fjern attributterne i `scripts/v5-logo-import.js renMetadata` | logoer |
| P3 | 7 | v3-regressionens 3 overlap-advarsler (guide-mc-udstyr @1440+375, maerke-honda/yamaha @375, privatlivspolitik @375) er FALSKE: sammenstødet er inline-links, der ombrydes over flere linjer (inline bokse har stort fælles rektangel). Verificeret på geometri, ingen visuelt overlap | `ov.js`-måling i scratch; v3-regression.js tæller inline-links som knapper | Ingen kodeændring i sitet; v3-regression.js bør springe `display:inline` over i overlaptjekket | QA |

## Hvad der er kontrolleret og består

- **v3-regression (hele matrixen):** 102 sider x 375/430/768/1440/1920 x lys+mørk = 1020 smoke-målinger + 210 dybe målinger: **0 fejl**, 6 advarsler: dashboard/mine-annoncer "vægt" er omdirigeringen til login (to sider hentes, jf. F4, uændret); de tre øvrige er de falske overlap (P3-7). LCP-median 168 ms lokalt.
- **v4-maerke-dakning --streng-v5:** fixtures: 0 fejl, alle V5-krav (Andet mærke, hydrering af "Flere mærker", hurtigsøgning af piller, ukendt ?brands i H1) opfyldt. Live-data (720 annoncer, 31 mærkenavne, GET-kun, 0 afviste skrivninger): **0 fejl**; baseline 719/720 uændret, 1 annonce skiftet fra Ukendt til DKW ("DKW 250", kildens mærke "Andet Mærke"): korrekt og belagt af titlen. QA's egne tjek er tilpasset det integrerede design (links-liste for hydrerede mærker, "Andet mærke (skriv selv)", offentlige registermærker); de v5-poster er tømt af kendt-listen og testen kræver nu, at de forbliver tomme.
- **Browserkompatibilitet:** gulv Chrome 111 / Safari 16.2 / Firefox 121; vagtlisten tom; lookbehind 0 (F3 holder). Chrome 155 og Edge 155, lokal build, 375/768/1440 x lys+mørk: **ingen fund** (hverken konsolfejl, overflow, usynlig tekst eller felter under 16 px). Cookie-dialog og søgning virker.
- **Stikprøver af de nye ting** (`scripts/v5-fase2-stikproever.js`, 41 kontroller):
  - Favorit-hjerte på eksterne kort: tryk, reload (huskes i `bb_favorites_ext`), vises i "Gemte annoncer" med lokal session, fjernes igen fra liste og lager; ingen konsolfejl. (Anonym: se P2-2.)
  - Sammenlign-knap: ingen overlap og tap-mål på mindst 36 px i gitter og liste ved 375/768/1440, lys og mørk.
  - Pris-skyder: håndtagene lodret centreret på sporet (afvigelse 0,00 px) ved 1440 lys/mørk og 375.
  - "Andet mærke" i opret-annonce (mock): valgmulighed, felt, validering (tom/blank/for lang/HTML), teksten gemmes, bliver ikke offentligt mærke (søgningen grupperer det som uoplyst), felt og tekst forsvinder ved skift.
  - Officielle logoer: 47 SVG'er uden e-mail, metadata-blok, script, entity eller ekstern reference; alle logobilleder på maerker.html indlæses og er synlige i lys og mørk (kontrast >= 1,3:1 mod fladen).
  - Guidekort: kort/relaterede/typefliser højst 36 % beskåret (de fleste 0-11 %, typefotos viser hele motorcyklen); ingen klippet tekst. Undtagelse: P2-3.
  - Søgning med dybe links: se P3-4 (rigtige data fine).
  - Cookie-failsafe: en blokker der skjuler dialogen efter 0,3 / 1,5 / 4 s efterlader hverken åben :modal-dialog eller død side.
- **Sidevægt:** budget sat bevidst efter integreret V5, begrundelse pr. voksende fil i `scripts/v5-sidevaegt.budget.json` (største relative vækst: p-guides.css +35 %, rimelig; js/data.js er blevet 2,4 kB mindre). Ingen vækst vurderet som spild.
- **verificer-site --hurtig:** alle 7 trin grønne (node --check, synk-header, seo-audit, sitemap, døde links, package.json-testliste).
- **npm test (kopi):** 1686 tests, 1684 grønne, 1 sprunget, **1 rød (P1-1)**.

## Kommandoer (gentagelse)
```
git archive HEAD | tar -x -C <kopi>; junction node_modules; cd <kopi>; node scripts/build.js; node scripts/kritisk-gen.js; node scripts/build.js
node scripts/v3-regression.js --rod <kopi> --rapport v3.json
node scripts/v4-maerke-dakning.js --rod <kopi> --streng-v5 --kendt scripts/v4-maerke-dakning.kendt.json --baseline docs/review/gauntlet/v4/qa/maerke-baseline-fixtures.json
node scripts/v4-maerke-dakning.js --rod <kopi> --data live --snapshot s.json --streng-v5 --baseline docs/review/gauntlet/v4/qa/maerke-baseline-live.json
node scripts/v5-krydsbrowser.js --rod <kopi> --maal lokal --kanaler chrome,msedge
node scripts/v5-fase2-stikproever.js --rod <kopi>
node scripts/v5-sidevaegt.js --browser ; (i kopien) npm test ; node scripts/verificer-site.js --hurtig
```
