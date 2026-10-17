# Builder — logo-fix (runde 2 efter blind Critic)

Branch `gauntlet/logo-fix` (fra f37bdcd = det der er live). Kun de fire P2 fra Critic'en (docs/review/gauntlet/logo/critic.md) + P3 (flise/vægt).
Godkendelserne i `img/brands/manifest.json` er urørt (20 godkendt af ejer, inkl. Harley-Davidson, Indian, Benelli). Kun tekniske felter er føjet til manifestet
(`varianter.emblem` pr. mærke) og `variant` er rettet til `lockup` for de to mærker, hvis fil allerede bærer navnet (Harley-Davidson, Ducati).

## Acceptkriterier (skrevet FØR bevis; målt i headless Chromium, cache slået fra, ikke ved strengsøgning)

| # | Punkt | Kriterium | Bevis |
|---|---|---|---|
| P2-1a | Dobbeltkald | Hver SVG-fil hentes **højst én gang** pr. sideindlæsning (Playwright, `cacheEnabled:false`, serveren sender `no-store`): forside, maerker.html (genereret kopi), mærkeside, annonce, søgning med åbent filter. Ingen `bl-probe`-`<img>` med samme URL som maskeelementet | w13-logo-layout (tæller requests pr. URL) + w13-integration |
| P2-1b | Antal | maerker.html: ≤ 1 request pr. unik logofil (før 26 SVG til 13 logoer); forside = 1 pr. unikt logo (før 12 til 6). Måles og indsættes nedenfor (før/efter) | måling nedenfor |
| P2-1c | Fejl-fallback bevaret | SVG svarer 404 (eller 200 med HTML i stedet for SVG): `.bl` får `bl--fejl`, masken er `display:none`, fallback har areal > 0, slottens mål flytter sig ikke; også dynamisk indsat markup (A8 uændret grøn, skærpet med request-tælling) | w13-logo-layout A8 |
| P2-1d | Ingen tom plads / CLS | CLS 0 med SVG forsinket 900 ms; ensfarvet logo er usynligt (`visibility:hidden`) til det er hentet, aldrig en massiv blok | w13-logo-layout A7 |
| P2-1e | udgiv-vagten | statiske sider (generatorerne) har stadig en statisk logoreference, så en manglende logofil afbryder udgiv.js (A14) — uden at referencen henter noget | w13-logo-generator A14 + request-tælling |
| P2-2a | Alle 20 i A–Z | maerker.html (syntetisk lager, alle 20 godkendte) viser `.bl--logo` (ikke `.bl--mono`) i A–Z-rækken for alle 20 godkendte mærker; mærker uden logo viser monogram i samme slot | w13-logo-generator + browser-måling |
| P2-2b | Ens slot | alle rækker i A–Z og i søgefilteret har ens venstrekant (1 unik x for logo-kolonnen og 1 for navnene) og ens kolonnebredde (56 px) | w13-integration S1 + generator-måling |
| P2-2c | Variant pr. størrelse | `logoFor` giver `emblem`; `logoHTML` vælger emblem-varianten i `sm` når den findes og forholdet ≤ 3,0, ellers hovedfilen skaleret til den brede slot; ingen mærke-hårdkodning (data i manifestet) | w13-logo-kerne |
| P2-2d | Læsbarhed | intet logo i `sm` bliver lavere end 12 px (ellers monogram) | w13-logo-kerne |
| P2-3a | Hero-ramme | `.mk-hero .bl--hero` er 56-72 px høj på desktop (≥ 700 px), op til 280 px bred; ens areal-regel; ≥ 70 px højde for Indian; skaleret ned på mobil (≤ 48 px) | genereret kopi + måling |
| P2-3b | Én lockup | Harley-Davidson og Ducati (logoet bærer navnet) viser kun logoet, ingen ekstra tekstlinje; Benelli (ordmærke) uændret; kun emblem-only logoer får navnet ved siden af | w13-logo-generator |
| P2-3c | CLS | `smoke-browser --cls 0.05 --strikt` på de berørte sider; egen layout-shift-måling med SVG forsinket = 0 | smoke + måling |
| P2-4a | Annonce desktop | ≥ 1180 px: logo 56-64 px højt (emblem-only får samme højde), op til 160 px bred; titelrækken ≤ 72 px (+ H1 ombryder pænt, ingen H1-overlap) | w13-integration A2 |
| P2-4b | Tablet/mobil | logoet ved siden af H1 i fast slot (≥ 34 px højt), ingen vandret scroll | w13-integration A3 |
| P2-4c | Resize | 1440→768→390→1440: logoantal konstant (1), ingen dubletter/tab, ingen CLS | w13-integration A3 |
| P3 | Vægt/flise | ens max-højde + ens max-areal-regel i alle slots (A9: areal-forhold ≤ 2,2 også for sm, lg, xl, hero); forsidens flise: navnet bryder ikke over to linjer ved 1440 | w13-logo-layout A9 + integration F3 |
| G | Gate | `node --check`, `npm run gate` (uden build), `npm test`, `node scripts/brand-logos-gen.js --tjek`, `kritisk-gen.js` + `w12-kritisk.test.js` grønne | gate-linje nedenfor |

## Hvad der er lavet (kort)

- **P2-1 én hentning pr. fil.** Det skjulte `bl-probe`-`<img>` er fjernet. `js/brand-logos.js` henter nu hver unik logofil **én gang** (`fetch`, HTTP-cachen gælder), lægger SVG'en som data-URI i én CSS-regel pr. fil (`--bl-u`) og bruger den som maske på alle elementer med samme fil. Svarer filen ikke 200 med en `<svg>` (404, 500, HTML-fejlside), får alle elementer `bl--fejl`, og ordmærke/monogram tager over (A8 grøn, nu også med request-tælling og en `200 + HTML`-variant). Før filen er hentet er masken en tom SVG: intet tegnes, ingen massiv blok, slottens mål er fast (CLS 0).
  Valgt fremfor to billigere-ser-det-ud-løsninger: (a) *probe + maske med delt cache* giver stadig 2 kald med `no-store`/koldt cache (kan ikke bevises som ≤ 1), (b) *inline SVG-sprite* i data-filen = 20 × op til 4 KB på alle sider (forsiden skal kun bruge 6). `<img>` + tonet maske virker ikke (currentColor).
  Logoer uden for layoutet (foldet filterpanel) hentes først, når de vises (IntersectionObserver); alle andre, også under folden, hentes straks som en CSS-mask altid gjorde (så fuld-side-screenshots viser dem). Statiske sider har en skjult, `loading=lazy` `<img class="bl-ref">` (`logoHTML(..., { statisk: true })`) — udgiv.js ser stadig filen (A14 grøn), og den henter intet (bevist: præcis de filer, siden bruger, hentes, hver én gang). Uden JS viser en `<noscript>`-regel ordmærke/monogram. Ældre, allerede genererede sider (før `build.js` kører igen) oversættes af klienten (test «overgang»).
- **P2-2 A–Z/filter.** `sm` er nu en bred, lav slot (22 × 56 px, kolonne 56 px, logoer venstrestillet). Manifestet har `varianter.emblem` (tekniske felter; 14 mærker; fil, hash, mål valideres af gen-scriptet) og `logoHTML` vælger emblemet i `sm`, når det findes og forholdet er ≤ 3; ellers hovedfilen skaleret ned. Alle 20 godkendte viser logo i A–Z (målt i browser); mærker uden logo har monogram i samme kolonne. Intet er hårdkodet pr. mærke (test: ingen mærkenavne i kernen). Et logo, der ville blive < 12 px højt, bliver monogram (ingen af de 20 rammer det: laveste 14 px = Aprilia/Benelli).
- **Ens visuel vægt (også P3).** Slot = `[maks. højde, maks. bredde, k]`, bredde = `min(bredde, højde · forhold, k · √forhold)`: ens max-højde + max-bredde + **max-areal**. Målt over de 20 godkendte: største/mindste areal sm 1,69 · md 1,38 · lg 1,36 · xl 1,83 · hero 1,90 (krav ≤ 2,2; før lg ≈ 2,9). BMW-lockuppen bliver ikke større (den indeholder «MOTORRAD»-teksten), men Kawasaki/KTM/Aprilia/Benelli er ikke længere 2–3 × så store.
- **P2-3 hero.** Hero-slot 72 × 280 px (48 × 200 på mobil), `.mk-wordmark--logo` har fast min-højde 72/48 px, så H1 står ens uanset logoform. Harley-Davidson og Ducati er `variant:'lockup'` i manifestet (tegningen bærer navnet) → kun logoet, ingen ekstra tekstlinje. Benelli (ordmærke) 190 × 50, Indian 117 × 72 (≥ 70 px).
- **P2-4 annonce.** Ny slot `xl`: 64 px høj / op til 160 bred fra 1180 px; 44 × 110 under 1180; 34 × 88 under 700. CSS-overstyringerne af maks-mål er fjernet. H1 er ikke presset (≥ 280 px bred, ≤ 3 linjer ved 1440), rækken ≤ 72 px (eller H1'ens egen højde).
- **P3.** Forsidens antal står nu i bunden af alle fliser (`margin-top:auto`), så Harley-Davidson, der bryder over to linjer, ikke løfter/sænker tallet; navnet kan ikke stå på én linje i en 77 px bred flise uden at blive ulæseligt (12 px bold).

## Måling (2026-10-17, lokal mock, Chromium, ingen cache, serveren sender `no-store`; kopi udenfor repoet med syntetisk lager, ikke produktion)

Request-tælling, 1440 px — `kald (SVG-kald / unikke SVG / dubletter)`; før = f37bdcd, efter = denne gren:

| side | før | efter |
|---|---|---|
| maerker.html | 46 (28 / 14 / **14**) | 41 (23 / 23 / **0**) |
| maerke-honda.html | 24 (2 / 1 / 1) | 23 (1 / 1 / 0) |
| maerke-harley-davidson.html | 24 (2 / 1 / 1) | 23 (1 / 1 / 0) |
| index.html | 43 (12 / 6 / 6) | 37 (6 / 6 / 0) |
| annonce (Honda) | 26 (2 / 1 / 1) | 25 (1 / 1 / 0) |
| søgning, filter lukket | 23 (0) | 23 (0) |
| søgning, filter åbnet | 28 (5 / 5 / 0) | 29 (6 / 6 / 0) |

maerker.html har 9 flere *unikke* filer end før (23 mod 14), fordi A–Z nu viser logo for alle 20 mærker, og emblem-varianterne er andre filer end flisernes fulde logo — hver fil hentes dog højst én gang. Forsiden er 1 pr. unikt logo (6 → 6, før 12). Bytes: SVG-delen er uændret pr. fil; total pr. side ±3 KB.

Slot-mål (de 20 godkendte, desktop): hero 50–72 px højt (Benelli 50 · Aprilia 53 · KTM 56 · Moto Guzzi 58, resten 71–72), sm 14–22 px, lg 23–40 px, xl 42–64 px. Annonce 1440: Honda 80 × 64, Harley-Davidson 80 × 64; 768: 44 px; 390: 34 px.

`smoke-browser --cls 0.05 --strikt` (genereret kopi: index, maerker, maerke-honda/harley-davidson/indian/benelli/kawasaki, annonce, soegning × 320/390/768/1024/1440 × lys/mørk): 90 målinger, 0 fejl, 0 advarsler. Egen CLS-måling med SVG forsinket 900 ms: hero, annonce, forside, søgning = 0 (layout-mål identiske før/efter filen lander).

## Skærpede/ændrede tests (ingen nye testfiler — `package.json` er urørt)

- `scripts/w13-logo-kerne.test.js` — A6 (markup uden probe, `statisk`-reference), A12 (slot k, ens areal, tom maske), A3/A17 (render-laget uden fetch/DOM; klient-laget: netop ét `fetch`, kun `img/brands/*.svg`) + nye: sm-emblem/bred slot, 12 px-grænsen, alle godkendte viser logo i sm og areal ≤ 2,2 i alle slots, varianter i gen-scriptet, Harley-Davidson/Ducati ikke «emblem».
- `scripts/w13-logo-layout.test.js` — A6/A9 (areal i alle 5 slots), A8 (request-tælling), nye: ét kald pr. fil (testside, genererede sider, dynamisk indsat), skjult panel henter intet, HTML-svar giver fallback, A–Z ens kolonne/venstrekant (1440 lys, 390 mørk), hero-ramme + CLS, overgangsmarkup.
- `scripts/w13-logo-generator.test.js` — maske + `bl-ref` + `noscript`, Ducati-lockup uden dobbelt navn, A–Z: logo (emblem) for alle mærker med logo, monogram for resten.
- `js/w13-integration.test.js` — annonce 56–64 px / ≤ 160 bred / række ≤ 72 / H1 ikke presset; mål pr. bredde ved resize (64/44/34); søgefilter 56 px kolonne og logo-hvis-godkendt; request-tælling på forside, annonce og filter.
- Fixtures: `scripts/__fixtures__/w13-logo-hjaelp.js` (emblem-varianter til Honda/Kawasaki; `renManifest` fjerner varianter), `…-server.js` (tilstand `html`), `…-side.js` (xl, areal-sektion, A–Z), `brands/fx-mark.svg`, `brands/fx-bar-k.svg`.
- `scripts/w12-kritisk.test.js` er uændret og grøn (18/18) efter `node scripts/kritisk-gen.js`.

## Gate (2026-10-17, worktree uden build, efter `node scripts/kritisk-gen.js`)

`npm run gate`: `verificer-site: alle 8 trin grønne` — (1) node --check, (2) `npm test` (inkl. de fire w13-filer og w12-kritisk), (3) synk-header, (4) seo-audit, (5) sitemap, (6) døde links, (7) testliste, (8) udgiv. `node scripts/brand-logos-gen.js --tjek`: ok (64 mærker, 20 godkendt; godkendelserne er uændrede). `_site` (minificeret, bygget af udgiv.js) er kørt i browser: forsiden har 6 `.bl--klar`, 6 SVG-kald, 0 fejl.

Screenshots (udenfor repoet): `C:\Users\pasca\AppData\Local\Temp\w13-fix\foer\` (f37bdcd) og `…\efter\` — samme navne i begge mapper: `forside-{1440-light,1440-dark,390-light}`, `annonce-{honda,harley-davidson,indian,yamaha,bmw}-{1440,768,390}`, `filter-1440-{light,dark}`, `maerker-top-*`, `maerker-az-*`, `maerke-{yamaha,harley-davidson,indian,benelli,honda,kawasaki,ktm,bmw}-{1440-light,390-dark}`. Scripts: `…\w13-fix\shots.js` (`node shots.js foer|efter`) og `taelling.js`.

## «Ligner ikke endnu» (ærlig)

- **Ensfarvet, ikke farvet.** Alle logoer er i tekstfarven (nødvendigt for lys/mørk); mockuppens Yamaha er rød, Honda rød, KTM orange.
- **Hero er højt, ikke bredt.** Mockuppens hero-lockup er et vandret «emblem + rødt ordmærke» (ca. 235 × 54). Vores logoer er de stablede/lodrette originaler (Yamaha 73 × 72, Honda 90 × 72, Harley-Davidson 90 × 72). Et vandret emblem + ordmærke kunne sammensættes af `-emblem.svg` + `-ordmaerke.svg`, men det ville være en ny, ikke-officiel lockup — ikke gjort.
- **Annonce:** 80 × 64 for Honda/Harley mod ca. 117–120 × 40 i mockuppen: højere, men smallere (varemærkernes egne proportioner), og stadig ensfarvet. Mærker uden godkendt logo (ingen nu blandt de 20, men ukendte mærker) har ingen plads ved titlen.
- **Indian-scriptet** er ved 72 px stadig kun en silhuet af hoved + skrift; «Motorcycle»-linjen er under 5 px høj. Benelli er et generisk serif-ordmærke uden løve (Critic: «forkert logo er værre end tekst» — ejeren har godkendt det; ikke ændret). Vektoriseringsstøj (bølgede Honda-/HD-bogstaver, Triumph-«H» der smelter) er uændret: det kræver nye kildefiler (assets-strømmen), ikke layout.
- **Filter/A–Z:** logoerne står venstrestillet i en 56 px kolonne, så kvadratiske emblemer får et hul på ca. 30 px før navnet — ens venstrekant, men luftigere end mockuppens rene tekst. Aprilia/Benelli/KTM er i A–Z 14–15 px høje (læsbare som ordmærke, ikke som detaljer).
- **Forsidens flise:** «Harley-Davidson» bryder stadig over to linjer i en 77 px flise (kun tallet står nu i bunden); BMW-lockuppen er stadig mindre end Kawasaki fordi «MOTORRAD»-teksten er med i tegningen.
- **maerker.html henter 23 SVG'er** (hver én gang) — flere unikke filer end før (14), fordi alle 20 mærker nu har logo i A–Z, og emblemerne er egne filer.
- **Generede sider i repoet** (`maerker.html`, `maerke-*.html`, `annonce-*.html`) er IKKE genbygget af mig (kun `build.js` må det): de har stadig det gamle markup og virker via klientens overgangsoversættelse (testet), men får først xl-slot, `bl-ref` og `noscript` ved Orchestratorens `node scripts/build.js`.
