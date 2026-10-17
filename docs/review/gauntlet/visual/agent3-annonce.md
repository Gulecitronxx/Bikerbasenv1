# Agent 3 — Annoncedetaljer og opret-flow (Visual Fidelity Gauntlet) — iteration 3

Branch `gauntlet/w14-annonce` (fra fefe1570). Mål: `Annonce.png` (Yamaha MT-07) og `Opret annonce.png`. Billeder i `agent3-annonce/` (JPEG, samlet ca. 5,3 MB).
Testfotos i målingerne er udsnit af mockuppens eget motorcykelfoto (kun lokalt, aldrig i repoet), fordi mockens fotos ellers er flade farver. De indeholder
mockuppens indbagte "1/14"-mærke og pile i hjørnerne, og det andet foto (brugt i tjekbåndet) er et lavopløseligt udsnit; det er testartefakter, ikke fejl i siden.
Historik: runde 1 AFVIS 6/10 + 5/10, runde 2 AFVIS 6,5/10 + 5,5/10 (se `critic-agent3.md`, `critic2-agent3.md`). Denne fil beskriver status efter iteration 3.

## Acceptkriterier (målbare; A13–A20 er tilføjet i iteration 3 efter Critic runde 2)
- A1 Galleriets hovedbillede fylder hele sin boks (±1 px). A9 Fuldskærmsknap + lightbox (Esc/pile/fokus tilbage); "+N"-flise ved > 6 fotos (14 fotos → 5 miniaturer + "+9"); 0/1 foto: ingen pile eller miniaturer.
- A2 Intet kort har > 40 px tomt rum under sit sidste indholdselement ved 1440 (ingen strækning).
- A13 KOLONNEBUND: ved 1440 er forskellen mellem venstre, midterste og højre kolonnes bund højst 100 px (egen med 5/1/0 fotos, ekstern med foto/48 hk/uden foto/uden pris). Mål: bund venstre/midt/side + spredning pr. fixture (se Målinger).
- A14 "Det bør du tjekke" er et FULDBREDT bånd (≥ 98 % af gridbredden) under alle tre kolonner, med foto ved siden af tjeklisten (egen: annoncens eget foto; ekstern: kildens thumbnail eller typefoto med ærligt label "Typefoto … — ikke annoncens eget").
- A15 "Kan du køre denne motorcykel?": bred, lav flade (højst 190 px ved 1440), titel på én linje, stor badge (≥ 110 px) til højre, grundlag på én linje med kun oplyste tal + offentlig A2-grænse; "Mulig" aldrig "bekræftet".
- A4/A16 Faktatabel uden "Ikke oplyst"-rækker: uoplyste felter samles i én linje "Ikke oplyst: Afgift, …"; ulige antal → sidste række i fuld bredde.
- A5/A17 Opret: sektionsrækkefølge 1 Detaljer, 2 Billeder, 3 Beskrivelse og pris på én side; 4 trin i bjælken; første feltrække = 4 felter.
- A18 Opret: hero ≤ 200 px ved 1440; forhåndsvisningen viser et fuldt kort FRA START, mærket "Eksempel" til mærke og model er valgt; kompakt upload-flise ≤ 140 px med miniaturefelter i samme række (spøgelsesfelter før første upload, "Primært billede").
- A11/A19 Login-gate uden tab: udlogget ser en login-port i stedet for dropzonen; port og toast siger eksplicit, at billeder ikke kan gemmes i kladden og skal vælges efter login (test).
- A6 Ingen dubletter/tab ved resize 1440→1024→768→390→1440; 0 vandret overflow 320/390/768/1024/1440 lys+mørk. A7 CLS < 0,05 (strikt). A12 Tap-mål ≥ 40 px og kontrast ≥ 4,5:1.
- A20 Telefon-reveal logget ind (mock): nummer via RPC; uden samtykke ærlig afvisning.

## Afvigelsesliste (prioriteret) og status
1. KOLONNEBUND (hvidt hul under kolonner): LUKKET. "Det bør du tjekke" er nu et fuldbredt bånd under kolonnerne; "Handl trygt" og "Kan du køre" placeres af en optimerer (kørekort venstre/midt, trygt venstre/midt/side, beskrivelsens klip 12/9/7/5 linjer), og en tættere sidekolonne (kortere sælger-/tryghedskort uden "Medlem siden"-blok udlogget) samt pladsholder i foto-format (16:10) uden foto trækker bunde sammen. Før: 280–420 px forskel; nu 12–93 px (se Målinger).
2. KØREKORTKORT smalt/højt, lille badge: LUKKET (158–170 px, titel på én linje, badge 140 px; legende og detalje-boks fjernet; lang 48–49 hk-forklaring: første sætning + "Hvorfor ikke afgjort?" som detalje).
3. TJEKKORT blegnet afskåret fotobånd: LUKKET (figur ved siden af tjeklisten, 220 px høj; egen annonce bruger annoncens eget foto, ellers typefoto med label).
4. FAKTATABEL flere "Ikke oplyst": LUKKET (samlet linje). Favorit på eksterne: HOLDT UDE (produktregel); "Se på kort": ikke lavet (ville sende by/postnr til en tredjepart; ingen kortfunktion i mine filer — Agent 2).
5. OPRET-PREVIEW tomt indtil mærke+model: LUKKET (eksempelkort fra start, mærket "Eksempel"). Karrusel/galleripile i selve kortet: IKKE LUKKET (delt kortkomponent, Agent 2's regler).
6. OPRET-BILLEDSEKTION stor stiplet flade: LUKKET (flise ≤ 140 px + miniaturefelter i samme række; fodnoter flyttet ind i tipsboksen).
7. OPRET-HERO høj/kold: LUKKET (186 px, varm brun overlay, kortere tekst); advarsler i gennemse nu i brandfarve (ikke grøn/rød); "Sælgeroplysninger" er titlen på kortet "Sælgeroplysninger — sådan når købere dig" (navn/telefon-valg), ikke et selvstændigt trin (4 trin).
8. LOGIN-PORT-TEKST: LUKKET (port + toast: "Billeder kan ikke gemmes i kladden, så dem vælger du først, når du er logget ind"; test).
9. 1920: containeren er allerede `--site-w` = 1480 px (indhold 1416 px, gutters ~250 px ved 1920). Ikke ændret (header/tokens er Agent 1's); Critics "1150 px" er ikke gengivet.

## Tilbageværende — ligner ikke endnu (ærligt)
- Sælgerpanel udlogget: ingen avatar/stjerner/svartid/"Ring op"/"Send besked"/"autoriseret" (opdigtet eller ikke bygget). Panelet er kompaktere end før, men ikke mockuppens grønne kontaktkort.
- Eksempelkortet i opret har ingen karrusel/prikker/"Vis eksempel på fuld annonce" (delt kortkomponent).
- Opret: ingen titelfelt (titlen udledes), ingen B/I-værktøjslinje, ingen model-dropdown, intet rytterfoto i hero (findes ikke i repoet), 4 mod 5 trin, "Sælgeroplysninger" ikke som eget trin, udlogget kan ikke vælge billeder før login.
- Kolonnebunde: spredning op til 93 px (egen 5 fotos 83, ekstern 48 hk 93) — over mockuppens næsten-nul, men under 100 px.
- Ingen finansieringsforslag, "+10 billeder", forhandlerlogo, "Se på kort".
- Tjekbåndets foto for eksterne uden thumbnail er et typefoto (ærligt mærket), ikke motorcyklen selv.

## Målinger (iteration 3)
- Kolonnebunde ved 1440 (venstre/midt/side → forskel): egen 5 fotos 874/909/826 → 83; egen uden foto 759/787/826 → 67; egen 1 foto 802/777/826 → 49; ekstern med foto 854/893/925 → 71; ekstern 48 hk 859/862/952 → 93; ekstern uden foto 870/882/879 → 12; ekstern uden pris 854/873/832 → 41.
- Kørekortflade 158–170 px, titel 18 px høj (én linje). Hero 186 px. Upload-flise 132 px.
- `js/w14-annonce.test.js`: 13 tests (kolonnebunde, fuldbredt tjek, kørekortflade, uoplyst-linje, preview/upload/hero, login-port-tekst, "+N"-flise, telefon-reveal, resize, overflow m.m.). `js/w9-saelger.test.js` 33, `js/annonce-skal.test.js` opdateret bevidst (uoplyste felter samlet i én linje), `js/w9-marketplace-r2.test.js` opdateret bevidst (ingen strækning).
- `smoke-browser --sider "annonce*.html,opret-annonce" --viewports 320,390,768,1024,1440 --cls 0.05 --strikt`: 40 målinger, 0 fejl, 0 advarsler. Kontrast/tap (egen+ekstern × 320–1440 × lys/mørk): 0 fund efter at "Hvorfor ikke afgjort?" fik 40 px højde.
- `kritisk-gen` + `scripts/w12-kritisk.test.js` 18/18. `npm run gate` (uden build): se rapport; trin 7 rød indtil Orchestratoren tilføjer `js/w14-annonce.test.js` til package.json "test".

## Billeder (agent3-annonce/)
reference-annonce/opret; foer-annonce 1440/390 og foer-opret; efter-annonce 1440/1920/768/390 lys, 1440/768/390 mørk, uden foto; efter-ekstern 48 hk (lys) og med foto (mørk); efter-opret 1440 (tom), udfyldt, mørk, 1920, 768, 390, gennemse, fejl; side-om-side (mockup | efter) pr. nøglesektion: sbs-annonce-oeverst/nederst, sbs-opret-oeverst/nederst.

## Ærlig score mod mockuppen (selvvurdering, ikke godkendelse)
Annonce ca. 7,5/10, opret ca. 7/10.

## Nye testfiler (package.json er Orchestratorens)
`js/w14-annonce.test.js`.
