# Agent 3 — Annoncedetaljer og opret-flow (Visual Fidelity Gauntlet)

Branch `gauntlet/w14-annonce` (fra fefe1570). Mål: `Annonce.png` (Yamaha MT-07) og `Opret annonce.png`. Billeder i `agent3-annonce/`.
Testfotos i målingerne er udsnit af mockuppens eget motorcykelfoto (kun lokalt, aldrig i repoet), fordi mockens fotos ellers er flade farver. De indeholder
mockuppens indbagte "1/14"-mærke og pile i hjørnerne; det er et testartefakt, ikke et fejl i siden.

## Acceptkriterier (skrevet før koden)
- A1 Galleriets hovedbillede fylder hele sin boks (ingen grå stribe under fotoet): billedhøjde = boxhøjde ±1 px ved 1440.
- A2 Tre kolonner (galleri+fakta | titel/pris/beskrivelse/kørekort | sælger/tryghed) har bundkanter, der flugter (≤ 2 px) for egen annonce med 5 og 0 fotos.
- A3 Kørekortkortet står i midterkolonnen (som i billedet) med badgen til højre for teksten ved ≥ 1180 px, og viser kun oplyste tal og offentlige grænser (A2: 35 kW ≈ 47 hk). "Mulig" aldrig "bekræftet".
- A4 Faktatabellen er to-kolonne ved kolonnebredden i billedet (≈ 510 px).
- A5 Opret, billedtrin: dropzone og miniaturer i samme række (som billedet), miniaturer ≥ 100 px, tips som bånd, ingen overflow.
- A6 Ingen dubletter/tab af elementer ved resize 1440→1024→768→390→1440; 0 vandret overflow ved 320/390/768/1024/1440 lys+mørk.
- A7 CLS < 0,05 (`smoke-browser --cls 0.05 --strikt`), SEO uændret (meta/JSON-LD/canonical ikke rørt), ingen opdigtet data.
Bevis: `js/w14-annonce.test.js` (6 browsertests mod lokal mock), `smoke-browser`, `w9-saelger.test.js` (33 grønne).

## Afvigelsesliste (prioriteret, set selv i billederne)
1. Manglende moduler: kørekortmodulet var tyndt (kun tekst + badge). Billedet har ikon, forklaring, A2-boks. — LUKKET: grundlag (oplyst effekt/motor/A2-grænse) og læsevejledning til badgen.
2. Forkert layout: kørekortkortet landede tilfældigt i en smal kolonne med badge under teksten; midterkolonnen smallere end billedets. — LUKKET: kortet fast i midten, badge til højre, kolonneforhold 1,55/1,5/1.
3. Billedbrug: galleriets billede dækkede kun ca. 87 % af boksen (grå stribe, fejl i `#gallery-main-img`). — LUKKET.
4. Panelopbygning: faktatabellen faldt til én kolonne ved 510 px (container-grænse 460 px). — LUKKET (400 px).
5. Opret: billedtrinnet var en tom side med små miniaturer i en klemt række og tre løse hint-linjer; billedet har dropzone + miniaturer i én række og grøn tips-boks. — LUKKET (række + tipsbånd).
6. Opret: 4 trin og billeder som eget trin (billedet: 5 trin, billeder midt på siden). — IKKE LUKKET, se nedenfor.
7. Typografi/detaljer: forhåndsvisning af "Din annonce" har ikke ikonrække/karrusel som billedet. — IKKE LUKKET (delt kortkomponent er Agent 2's).

## Lukket i denne runde
Se punkt 1–5. Commits: `annonce: galleriets billede fylder boksen …`, `opret: billedtrin …`, `annonce: legende skjult på mobil …`.

## Tilbageværende — ligner ikke endnu (ærligt, med begrundelse)
- Sælgerpanelet viser logget-ud-tilstand (login-gate, "Beskeder leveres ikke") i stedet for billedets avatar/stjerner/Ring op/Send besked: bevidst, intet af det findes eller må opdigtes. Panelet er derfor højere end i billedet, og søjlebalancen strækker det sidste kort i de kortere kolonner (tomt rum i bunden af ét kort).
- Ingen "+10 billeder", finansieringsforslag, svartid, "autoriseret forhandler". Eksterne annoncer har ét thumbnail (CLAUDE.md regel 2).
- "Det bør du tjekke" står ikke altid nederst til højre som i billedet; balanceringen placerer den, hvor søjlerne bliver ens høje.
- Opret: billeder er stadig et selvstændigt trin efter "Oplysninger + pris/tekst" (login-gaten: valgte filer overlever ikke en omvej via login), 4 trin mod billedets 5, ingen titelfelt (titlen udledes), ingen B/I-værktøjslinje, ingen "Vælg model"-dropdown, intet rytterfoto i hero (findes ikke i repoet), ingen "Vis eksempel på fuld annonce".
- Billedtrinnets hovedkort er kort sammenlignet med sidekolonnen (forhåndsvisning + Sælg trygt).

## Målinger
- `node --test js/w14-annonce.test.js`: 6/6. `js/w9-saelger.test.js`: 33/33. `scripts/w12-kritisk.test.js`: 18/18 efter `kritisk-gen`.
- `smoke-browser --sider annonce,opret-annonce --viewports 390,768,1440 --cls 0.05 --strikt`: 12 målinger, 0 fejl, 0 advarsler.

## Nye testfiler (package.json er Orchestratorens)
`js/w14-annonce.test.js`.

## Gate
`npm run gate` (uden build): node --check OK, seo-audit OK, sitemap OK, døde links OK, udgiv OK. `npm test`: én rød i en kørsel (`js/w10-fejl.test.js`, CLS 0,084 på `model-honda-nx-500.html` 390 — en mærke/modelside udenfor mine filer, opstod mens jeg kørte Chromium parallelt; grøn 3/3 ved isoleret genkørsel = flaky). Trin 7 er rød, til Orchestratoren tilføjer `js/w14-annonce.test.js` til package.json "test".

## Billeder (agent3-annonce/, JPEG q62, samlet ca. 3 MB)
reference-annonce/opret, foer-/efter-annonce 1440 og 390, efter lys/mørk, ekstern 48 hk, foer-/efter-opret (trin 1, billedtrin 1440, billedtrin 390), sbs-annonce og sbs-opret (mockup | efter, øverste del).
