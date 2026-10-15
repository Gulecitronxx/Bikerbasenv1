# Builder opret — billede 4 (Opret annonce)

Branch `gauntlet/opret` · filer: `opret-annonce.html`, `js/opret-annonce.js`, `css/p-opret.css`, `js/opret-validering.js` (+ 2 testfiler). Runde 2 (efter Critic ACCEPTER ~3,7/5) er indarbejdet.

## Bygget pr. billedelement
- **Hero**: foto (nu lysere: svagere scrim med stop efter tekstens kant, foto opjusteret), `← Tilbage til forsiden`, h1, undertekst, tillidsboks med 3 ægte punkter.
- **Trinbjælke**: overlappende kort, cirkler + titel + undertitel. Nu **sektionsnavigation**: trin 1 og 2 (Type & specs / Pris & beskrivelse) står på ÉN side; klik scroller til sektionen, scroll-spy holder `aria-current` ajour; trin 3 Billeder og 4 Gennemse er egne trin; færdige trin er knapper (tilbage).
- **Én lang side** som billedets "Detaljer + Beskrivelse på én scroll": `1. Motorcyklens detaljer` (kompakte type-piller i stedet for 8 fotofliser; mærke/model/årgang/km ved siden af tips-boks; 4-kolonne grid med enheder) → `2. Pris og beskrivelse` (pris/stand/postnr, beskrivelse + tegntæller + tips). Begge sektioner valideres samlet, fokus på første fejl i dokumentrækkefølge. Login-gaten ligger stadig før billeder; kladde-gem uændret.
- **Tips-bokse** ærlige og knyttet til felterne: "Sådan udfylder du mærke og model" (påstanden "tiltrækker flere købere" fjernet) og "En god beskrivelse skaber tillid".
- **Billeder**: dropzone ≥240 px (30 %), miniaturer + `Tilføj flere billeder` i samme række (4 + flise målt i én række), `Primært billede` som bundstribe.
- **Sidebjælke**: live-kort (delt `listingCardHTML`) med venlig tom tilstand før mærke/model, ingen "NY" ved redigering (oprindelig dato), kun én "Kørekort" i brikken, lille pristekst når pris mangler. `Sælg trygt` med 4 ægte punkter.
- **Mobil**: "Se forhåndsvisning"-knap + bundark (`<dialog>`, Escape lukker); fejl-toast øverst så den ikke dækker feltet; inputs 16 px under 768 px.
- **Trin 4 ryddet**: kortet kun i sidebjælken/arket; mangelliste maks. 4 (+ "og N mere"); "Titel og søgetekst" bag fold; gammel "giver flere henvendelser"-linje fjernet.
- **Critic-fund**: F-1 (Tilbage-oval) rettet (handlingsrække stakker ≤480 px, knap 44 px); F-2 16 px; F-3 ccm-min 1 (knallert 45 = 49 ccm); F-4 ingen fokusring på h2 ved indlæsning; F-5 tip omformuleret; F-6, F-7, F-8 rettet.

## Matcher IKKE billedet (bevidst)
Stadig 4 trin mod billedets 5 (ingen sælgeroplysninger); Billeder er trin 3 efter side 1, ikke midt på siden (login-gaten kræver det: blob-fotos overlever ikke login-omvejen). Intet titel-/vægt-felt, ingen rig-tekst-værktøjslinje (datamodel). Ingen "Hjælp hele vejen"/"Vis eksempel", ingen opdigtede tal. Heroens foto er forsidens (motorcyklen delvist bag tillidsboksen ved 1440).

## DELT-ØNSKER / åbne punkter
1. `scripts/stamp-version.js`: stempl `css/p-opret.css` og `js/opret-validering.js`. 2. Tilføj de to testfiler til `npm test`.
3. `css/styles.css`: `.input` er 15 px — sæt 16 px under 768 px globalt (her overstyret i p-opret).
4. Delt kort: `.card-koerekort::before` ("Kørekort ") dublerer teksten fra `koerekortMaerkat` — ret i `styles.css` (her skjult i live-kortet).
5. **Åbent (el-motorcykler)**: ccm er påkrævet og kørekortlogikken bygger på ccm/hk, så el-motorcykler uden ccm kan ikke oprettes. Kræver beslutning + datamodelændring (valgfri ccm når brændstof = El, kW i stedet for hk) — ikke gjort her.

## Tests
`js/opret-validering.test.js` (12) og `js/opret-annonce-markup.test.js` (6): 18/18. `npm test` 364/364, `node --check` rent.
Playwright mod mockede Supabase-svar (ingen produktionskald), 60 checks grønne, konsol ren: udlogget validering/kladde/login-redirect/gendannelse; logget ind side 1 → billeder → gennemse → udgiv (payload + 4 fotos); `?rediger=` (forudfyldt, uden NY, 1 PATCH, ingen POST); mobil (16 px, bundark, toast øverst, Tilbage normal højde); trinbjælke-anker + scroll-spy; kladde gendannes.
Overflow: 0 af 48 kombinationer (320–1440, lys/mørk, trin 1–4). Kontrast AA på al tekst (min 4,68; inputkant 3,59–3,78). Hero-tekst målt pixelvis: h1 ≥5,6:1, lead ≥7,2:1 (1024/1440), ≥6,7:1 på mobil.
3 nye iterationer (1440+390, lys+mørk): (1) samlet side/piller/bundark → tips-boks gav tomt hul; (2) årgang/km flyttet ind ved tips, piller smallere, hero-kontrast målt og strammet (h1 var 2,88:1); (3) slutkontrol.

## Selv-score mod billede 4 (0-5)
Hero 4 · Trinbjælke 4,5 · Felt-sektioner 4,3 · Tips 4 · Billedupload 4,2 · Sidebjælke 4,3 · Mobil 4 · Trin 4 3,8 → **samlet ≈ 4,2** (Critic før: 3,7).

Rest: live-kortet er `inert` (ikke tilgængeligt for AT; formularen er kilden).

## Runde 3 (Critic runde 2: ACCEPTER, F-1..F-8)
- **F-1 (P2)**: `OpretValidering.validerData` (hele tabellen + "mangler"-tjek) bruges ved gendannelse af kladde (ugyldige tal blokerer `videreTilTrin:3`, fejl vises ved felterne) og som SIDSTE gate i `publishListing` (ingen POST; brugeren sendes til side 1 med fejl). Testet incl. redigeret localStorage og DOM-tampering på gennemse-trinnet.
- **F-2 (P2)**: fejl i den lukkede fold åbner den automatisk; fokus + `aria-invalid` + `aria-describedby` på feltet.
- **F-3** filstørrelse (>12 MB) afvises ved valg med besked. **F-4** trinbjælken er `<nav aria-label="Trin i annoncen">`, skjult "Trin n af 4"-tekst + `aria-current`. **F-5** `beforeunload`-advarsel ved uudgivne ændringer/valgte fotos (programmatiske skift via `forlad()` udløser den ikke; kladde gemt nulstiller). **F-6** scroll-lås bag bundarket. **F-7** pillen skjules ved fokus i felt og når kortet/footeren er i syne; handlingsknapper stakker helt ≤420 px; trin 4's infoboks er neutral (ikke rød); "Pris ikke oplyst" i arket nedtonet. **F-8** "de indekserede" → "forhandlere og markedspladser"; "tit et af de første spørgsmål…" fjernet; hero siger ikke længere "fire trin".
- Tests: `js/opret-validering.test.js` 16 + `js/opret-annonce-markup.test.js` 6 = 22/22; `npm test` 364/364; flowtest 79 checks grønne (60 gamle + 19 nye: F-1..F-8), konsol ren; overflow 0 af 48; kontrast AA; hero h1 ≥5,6:1.
