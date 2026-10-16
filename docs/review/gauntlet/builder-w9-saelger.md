# Builder W9 sælger (billede 4/5/6) — acceptkriterier (skrevet FØR koden)

Bevis pr. kriterium = `js/w9-saelger.test.js` (Playwright mod lokal mock `scripts/w9-saelger-mock.js`; ingen produktion,
ingen rigtige konti) + screenshots i `%TEMP%\w9-saelger\{foer,efter}`. Test springes tydeligt over uden Playwright/Chromium.

## K1 Opret annonce, hele vejen (logget ind)
- K1a Side 1+2 udfyldt → Billeder → Gennemse → Udgiv: ét POST på `listings` med de indtastede værdier; hvert valgt billede uploades og får en `listing_photos`-række (position 0..n-1, forsidebillede = første); videresendes til annoncen.
- K1b Dobbeltklik på Udgiv giver ÉN annonce (ingen dublet).
- K1c Efter udgivelse er kladden væk; `beforeunload`-advarslen udløses ikke.

## K2 Tilbage / fortryd / kladde
- K2a Gennemse → Tilbage → Billeder → Tilbage → felter og valgte billeder er bevaret; fjern et billede og flyt forsidebillede virker.
- K2b "Gem kladde" + genindlæs gendanner felterne (billeder skal vælges igen, og det siges).
- K2c Udlogget: Fortsæt fra side 1 gemmer kladde og sender til login med redirect; efter login kommer man tilbage med felterne udfyldt.

## K3 Fejl fra backend (aldrig tavs, intet tab)
- K3a POST `listings` 500: synlig fejl (`role=alert`/aria-live), Udgiv-knap genaktiveret, felter og billeder intakte; nyt forsøg lykkes og giver præcis én annonce.
- K3b Foto-upload fejler (storage 500): annoncen oprettes, sælgeren får at vide HVILKE billeder og hvad der kan gøres; ingen "udgivet!" uden forbehold.
- K3c Rediger: PATCH-fejl viser fejl og efterlader annoncen uændret.

## K4 Billedhåndtering
- K4a Fil der ikke er billede, for stor fil (>12 MB) og for mange filer (>12) afvises med besked, der siger hvad og hvor mange.
- K4b Upload sendes som webp/jpeg uden EXIF (resize), ikke originalfilen.

## K5 Redigering
- K5a `?rediger=<id>` på aktiv annonce: forudfyldt, PATCH ikke POST, ingen dublet.
- K5b **Pausede (hidden) annoncer kan redigeres** (mangel fra dashboard-runden: `startEditing` fandt kun aktive). Annonce, der ikke er din, afvises venligt.

## K6 Mine annoncer
- K6a Statuskort (aktive/kladde/favoritter/søgeagenter) beregnes af mock-data; tomt lager viser tom tilstand med CTA, ikke 0-rækker uden forklaring.
- K6b Pause → PATCH `status=hidden` og rækken viser "På pause"; Aktivér → `active`. PATCH-fejl lader status være og viser fejl.
- K6c Slet: afvist confirm = intet kald; godkendt = række væk, DELETE `listings`, filer slettet i storage.
- K6d Hentefejl (GET listings 500) viser `role=alert`-banner med "Prøv igen", som virker.

## K7 Gemte annoncer (favoritter) og kladder
- K7a Tom tilstand forklarer hvordan man gemmer; fjern-favorit sender DELETE; fejl vises og række bliver stående.
- K7b Kladde vises som egen række (Fortsæt / Slet) og Slet fjerner den.

## K8 Login / opret konto
- K8a Login ok → redirect til `?redirect=`; forkert kode → dansk fejl (ikke rå engelsk), felt beholder e-mail; netværksfejl → "kunne ikke få forbindelse".
- K8b Ingen tekst lover noget produktet ikke har (beskeder/"vil i kontakt", social login, tal).

## K9 Tværgående
- K9a Ingen vandret overflow (`documentElement.scrollWidth <= clientWidth`) ved 320 og 390 på opret (alle trin), mine-annoncer (alle faner), login, dashboard.
- K9b Ingen `null/undefined/NaN/[object Object]` i synlig tekst på de sider, også med tomme/manglende data.
- K9c Tastatur: fejl flytter fokus til første ugyldige felt med `aria-invalid`; dialoger lukker med Escape; alle felter har label.
- K9d Konsol: ingen fejl udover kendte (blokerede fremmede værter).

## K10 Billedlighed (se rapportens bund for ærlig afvigelsesliste)
- Opret: trin-bjælke, felt-sektion + tips-boks, billedrække, live-forhåndsvisning, "Sælg trygt". Mine annoncer: hero, faner, statkort, rækker med handlinger, Min konto, "Sælg hurtigere", Hjælp. Login: to-kolonne. Ingen beskeder/betaling/avanceret statistik/opdigtede tal.

---
# Resultat

**Bevis:** `js/w9-saelger.test.js` — 31 tests (K1a–K9e), alle grønne, kører rigtig Chromium mod lokal mock (`scripts/w9-saelger-mock.js`, ingen produktionskald; lys OG mørk, 320/390). Screenshots udenfor repoet: `%TEMP%\w9-saelger\foer` (før), `\efter` (efter, 1440+390, lys+mørk), `\it1` (rediger/dashboard), `\tst` (testskærme).

## Fundet og rettet (reelle fejl, alle først påvist af en rød test)
1. **Dobbeltklik/Enter to gange på Udgiv oprettede to annoncer** (tjek før `disabled` er asynkrone). Lås i `publishListing` (`js/opret-annonce.js`), slippes ved fejl.
2. **Pausede annoncer kunne ikke redigeres** (kendt mangel fra dashboard-runden): `startEditing` fandt kun aktive. Henter nu egne rækker via `db.myListings()`; Rediger-knap vises på pausede (`js/mine-annoncer.js`); efter gem går man til Mine annoncer (en pauset annonce har ingen offentlig side); hero-teksten siger at den er skjult.
3. **Pausede annoncer uden foto**: det delte "Ingen fotos"-felt (titel + chips) bristede i 96 px-miniaturen — nu kun kameraikon (`css/p-dashboard.css`). Pauserække siger "Skjult for købere, indtil du aktiverer den".
4. **Login-tekst**: "Se sælgerens navn — Markér, at du vil i kontakt" (beskeder findes ikke) → "Se, hvem der sælger — indloggede ser navnet og kan få vist telefonnummeret, hvis sælgeren har slået det til".
5. Mock/test-hygiejne: temaet blev først sat forkert (mørk-testene kørte lyst) — rettet, og 320/390 × lys/mørk er kørt igen på ægte mørk.

## Verificeret OK uden ændring (w7/opret/dashboard-arbejdet holdt)
Alle trin inkl. Tilbage, billedupload (resize til webp/jpeg, 12-grænse, ikke-billede/for stor/ødelagt), POST 500 / netværksafbrud / storage-fejl (præcis besked, ingen dublet, intet tab), redigering (PATCH, ingen POST), slet (confirm, storage ryddet), hentefejl-banner + Prøv igen, tomme tilstande, kladder, favoritter, login-fejl, ingen vandret overflow 320/390, ingen null/undefined/NaN, aria-invalid/fokus, mobil-ark med Escape, konsol ren.

## Matcher IKKE billederne endnu (og hvorfor)
- **Opret**: 4 trin mod billedets 5 (ingen "Sælgeroplysninger"; navn/telefon bor på profilen). Billeder er trin 3 efter side 1+2, ikke midt på siden (login-gaten: blob-fotos overlever ikke en login-omvej). Intet titelfelt (titel udledes af mærke/model/årgang), ingen rig-tekst-værktøjslinje, ingen "Vælg model"-dropdown (frit felt + forslag), ingen "Vis eksempel på fuld annonce"/"Hjælp hele vejen"; ingen "3x flere henvendelser". Hero er mørk/forsidens foto uden rytter; motorcyklen delvist bag tillidsboksen ved 1440.
- **Mine annoncer**: ingen beskeder-fane/-tal, ingen "+24 %"/visningsgraf, ingen "Udløber om N dage"/"Udløbet"/"Forlæng" (annoncer har ingen udløbsdato i databasen), kun ægte kolonner (visninger, favoritter, telefonvisninger). CTA er brandfarven, ikke grøn. "Sælg hurtigere"-boksen er varm tint, ingen "3x"-tal. Rytterfoto i hero findes ikke i repoet.
- **Login**: ingen Google/Facebook/Apple, ingen "120.000+", ingen håndskrevne tagline-ikoner; header er sitets egen; fotoet er sportscykel uden rytter.

## DELT-ØNSKER / åbne punkter (ikke mine filer)
1. `js/store.js` `toggleFavorite`: databasefejl ved gem/fjern favorit logges kun (`console.warn`); sælgeren får ingen besked og UI ender uenigt med databasen indtil næste synk.
2. `package.json`: tilføj `js/w9-saelger.test.js` til `npm test` (kræver Playwright+Chromium; springer tydeligt over ellers; ~100 s). `scripts/w9-saelger-mock.js` er hjælpefil, ikke test.
3. `css/p-dashboard.css` skal stemples/allowlistes som før. (Intet nyt stempel/CSP-hash rørt af mig.)
4. Bestående før mig: `npm test` har 1 rød test (`scripts/guides.test.js` "Article: datoerne stammer fra guides-data…") på denne dato (2026-10-17) — urelateret til sælger-filerne.
5. `K9d` springer mobil-ark-delen over, hvis pillen bevidst er skjult ved siden af kortet (kun label-/Escape-tjek garanteret).

## Selv-score (0–5, mod billederne)
Opret ≈ 4,2 · Mine annoncer ≈ 4,4 · Login ≈ 4,0 · Gemte/kladder ≈ 4,3 (uændret visuelt; fokus var funktion/robusthed).
