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
