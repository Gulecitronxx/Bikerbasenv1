# Critic W9 sælger (blind) — branch gauntlet/w9-saelger (21deb4e, 5 commits oven på 21d132b)

**DOM: ACCEPTER med P2-rettelser (ingen P1).** Kopi i %TEMP%/critic-w9b (git archive + junction til node_modules), egen mock-kørsel, ingen build/generatorer, ingen git-skrivning.

## Tal
- Egne screenshots: 144 (opret trin 1-4 tom/fejl/udfyldt/billeder, mine-annoncer alle faner + tom, dashboard privat+forhandler, login+opret) x 320/390/768/1440 x lys/mørk. Målt pr. skærmbillede: 0 vandret overflow, 0 null/undefined/NaN, præcis 1 h1, 0 konsolfejl. Metrics: critic-w9-saelger-shots/metrics.json
- js/w9-saelger.test.js: 31/31 grøn. js/w7-funktion.test.js: 34/34 grøn. node --check js/*.js + mock: OK.
- npm test: 905 pass / 1 fail = kun kendt seo-schema Article-test (gammel base).
- Merge-risiko: `git merge --no-commit` i klon af 22d05a8 OG af nuværende gauntlet/master (fdf6084): ingen konflikter (login.html auto-merget; 7 filer, +1048/-9). Rør: login.html, opret-annonce/mine-annoncer m.fl. + scripts/w9-saelger-mock.js (ny).

## 1. Visuelt match (billede 4/5/6) — ca. 3,5-4/5
Struktur er tæt: hero med foto + fordelskort, trin-bjælke i kort, 2-kolonne formular, grønne(her kobber/grønt ✓) tips-bokse, "Din annonce"-forhåndsvisning + "Sælg trygt", mine annoncer med hero, faner, 4 statuskort, rækker med handlinger, "Min konto", "Sælg hurtigere", hjælp, opret-stribe; login som splitkort over foto + fordelsstribe. Brandfarve orange/kobber, grøn kun ✓/Aktiv. Ikke et facelift: layoutet er genopbygget.
5 største afvigelser:
1. Opret: 4 trin (Type&specs / Pris&beskrivelse / Billeder / Gennemse) mod billedets 5, og detaljer+pris+tekst på ét trin, så billeder står alene på en næsten tom side (opret-2-fotos-1440-l.png). Kan rettes uden assets: vis billeder som sektion på samme side eller flyt "Sælgeroplysninger" til eget trin. Nødvendig? Nej (P3); men trin-bjælken hopper til "2" mens overskriften er "1." (opret-1-udfyldt-1440-l.png) — se P2-1.
2. Beskrivelse mangler B/I/liste-værktøjslinjen fra billedet (erstattet af "Strukturér min beskrivelse"). Kræver sanitering; ikke nødvendig.
3. Mine annoncer: ingen "⌄" udvid-pil og ingen "Udløber om N dage" — korrekt udeladt (ingen udløb findes; ærligt). Pausede viser forklaring i stedet. OK.
4. Mine annoncer/oversigt: statuskort "Beskeder" fra billedet er erstattet af Søgeagenter; "3x flere henvendelser" er udeladt — korrekt iflg. kriterier. Statuskortenes tal er 0 i mock (ægte).
5. Login: ingen Google/Facebook/Apple-knapper, ingen håndskrevne foto-overlays/"120.000+" — korrekt (ikke bygget/opdigtet). Fotohøjre-side er mindre dramatisk (mc-foto bag frosted panel); kan tættne ved at lade panelets glasflade være mere gennemsigtig — kosmetik, P3.
Konklusion: ikke nødvendigt at ændre layoutet mere; resterende afvigelser er enten forbudt indhold eller kosmetik.

## 2. End-to-end (mock) — ingen brud fundet
De 31 tests dækker udgiv→annonce (1 række, fotos), dobbeltklik (1 POST), kladde gem/gendan, udlogget fortsæt→login→felter tilbage, 500/netværksfejl/foto-fejl, ikke-billede/for stor/ødelagt fil, redigér (PATCH), pausér/aktivér/slet (afvist confirm, fejl), hentefejl, tom bruger, favoritter, login-fejl, aria-invalid + fokus + labels, Escape i mobilark. Mine screenshots bekræfter udgivelseslås ("Udgiver…", "Uploader billeder 3/3") på mobil og at ikke-udfyldt trin giver fejl (opret-1-fejl-*.png).

## 3. Ærlighed — OK
Ingen løfter om beskeder/betaling/MitID/"henvendelser"; "Telefonvisninger" brugt; "Sælg hurtigere" uden tal; login-fordele er sande ("Dit nummer er privat", "Gratis for private"). Opret-tekst præciserer "Vi videresender ikke beskeder".

## Rettelser
- P2-1 css/p-opret.css (stepper `.step-item`, l.78/308) + js/opret-annonce.js: trin-bjælken viser aktivt trin 2 (scroll-synk) mens trin 1 stadig er det aktive formtrin; forvirrende. Hold bjælken på formtrinnet (screenshot opret-1-udfyldt-1440-l.png).
- P2-2 Tap-mål <40 px (krav ≥40): `.step-item` 36 px høj (css/p-opret.css:78); `.remove-photo` 26-28 px (css/p-opret.css:212, 323), `.photo-move`/`.photo-cover` 28 px; `.db-link` min-height 32 (css/p-dashboard.css:268), `.db-stat-link` 36 px (:100). Sæt min 40 (usynlig padding/::after). Screenshots opret-2-fotos-390-l.png, mine-390-l.png.
- P3 sidehjælpebokse kan stå under stepper på 768 (ikke fejl). Footer-links 24 px er sitewide, ikke denne branch.

## Screenshots
C:\Users\pasca\Desktop\rod\Claude code\docs\review\gauntlet\critic-w9-saelger-shots\ (opret-{1-tom,1-fejl,1-udfyldt,2-tom,2-fotos,3,4}-{320,390,768,1440}-{l,m}.png, mine-*, mine-fane1..4-*, mine-tom-*, dash-*, dash-forh-*, login-*, login-opret-*)
