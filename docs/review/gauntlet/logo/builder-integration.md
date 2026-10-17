# Builder — logo-integration (W13, strøm 3+4)

Branch `gauntlet/logo-integration` (fra 464e9168). Kun integration i sidefamilierne; systemet (manifest, `BrandLogos`, `p-brand-logo.css`) er uændret,
og godkendelserne i manifestet er urørt (17 godkendt af ejer; Harley-Davidson, Indian, Benelli og øvrige bevidst ikke).

## Acceptkriterier (skrevet FØR bevis; målt i headless Chromium, ikke ved strengsøgning)

| # | Sidetype | Kriterium | Test |
|---|---|---|---|
| F1 | Forside | de 6 fliser har logo (`.bl--logo`) for Honda, Yamaha, Suzuki, BMW, Kawasaki og monogram for Harley-Davidson; navn + antal står stadig i flisen | w13-integration |
| F2 | Forside | hver flise linker til en eksisterende `maerke-<slug>.html`; logoet er dekorativt (`aria-hidden`), flisen har stadig `aria-label` med navn+antal | w13-integration |
| F3 | Forside 1440 | seks fliser i ÉN række; logo-slot 36-45 % af flisehøjden (målt 38-40 px af 111 px); navne og antal står på samme linje i alle fliser (logo-slot fast 40 px; række-højde 92 px, 111 px når et navn bryder); intet overløb i flisen. 1024: 3 x 2 | w13-integration |
| A1 | Annonce | logoet findes KUN for godkendt mærke (Honda, Yamaha, BMW …); intet (ingen række, ingen `.bl`) for Harley-Davidson og Indian; Benelli er ikke godkendt (`harLogo=false`) | w13-integration |
| A2 | Annonce ≥ 1180 | logoet er højrejusteret i titelrækken (højrekant = rækkens højrekant ±1 px), står ved h1, overlapper ikke h1, ligger over prisen; `aria-label="<Mærke>-logo"`, `role="img"`; 1 h1 | w13-integration |
| A3 | Annonce | tablet/mobil: logoet ved siden af h1 (30 px højt, maks. 84 px bredt), ingen vandret scroll; ingen dubleret/mistet logo efter resize 1440→768→390→1440→1024→1440 | w13-integration |
| A4 | Statisk skabelon | `build-listing-pages.js side()`: logo-markup, stilark og scripts KUN når mærket er godkendt; logo-scriptet før `annonce.js`; 1 h1 | w13-integration |
| S1 | Søgefilter | lille mark (sm, 16-18 px) i fast 28 px kolonne foran navnet; monogram i samme kolonne uden logo; navnenes venstrekant ens (1 unik x-værdi) ved 1440 lys/mørk og 390 | w13-integration |
| S2 | Søgefilter | filteret er ikke tungere: 0 SVG-kald før panelet åbnes; efter åbning kun de synlige rækkers SVG (≤ 8); ingen logo i aktive chips og resultatkort | w13-integration |
| X1 | Alle | CLS < 0,05 med SVG forsinket 900 ms (forside, annonce, søgning); fliserne/slots flytter sig ikke, når filen lander (mål før/efter) | w13-integration |
| X2 | Alle | 404 på SVG: fliserne får fallback (areal > 0), ingen tom blok | w13-integration |
| X3 | Lys/mørk | maske = tekstfarven; logo ≥ 4,5:1 mod flisen/siden (lys og mørk, forskellig farve), monogram ≥ 3:1, antal ≥ 4,5:1 | w13-integration |
| X4 | Alle | `scrollWidth ≤ clientWidth` ved 320/390/768/1024/1440: forside, annonce (Honda, Yamaha), søgning med åbent mærkefilter | w13-integration |
| X5 | Kritisk CSS | `kritisk-gen.js` kørt; `w12-kritisk.test.js` grøn | w12-kritisk |
| X6 | Gate | `node --check`, `npm run gate`, `npm test` grønne (kendte undtagelser, se nederst) | gate |

## Hvad der er lavet

- **Forside** (`index.html`, `js/home.js`, `css/p-forside.css`): `p-brand-logo.css` før `p-forside.css`, `brand-logos-data.js` + `brand-logos.js` før `home.js`.
  Fliserne bruger `BrandLogos.logoHTML(navn, {storrelse:'lg', decorative:true})` i en fast 40 px logo-slot (`.maerke-logo`), så navn og antal flugter,
  også når et navn bryder over to linjer (Harley-Davidson). Mangler `BrandLogos`, falder koden tilbage til den gamle monogram-cirkel.
  Fra 1280 px får mærke-kolonnen mest plads (`1.5fr 1fr 1.1fr`) og de seks fliser står i én række (som Forside.png); under 1280 px 3 x 2.
  `css/styles.css` er IKKE rørt (den gamle `.maerke-mono` bliver som fallback).
- **Annonce** (`js/annonce.js`, `css/p-annonce.css`, `annonce.html`, `scripts/build-listing-pages.js`): `anFlytH1(tekst, maerke)` bygger kun en `.an-titelraekke`
  (h1 + logo) når mærket har et godkendt logo; ellers sættes h1 ind som før. Slottens størrelse kendes fra manifestet, før filen er hentet
  (`BrandLogos` giver fast slot) — der reserveres altså ikke plads efter hydrering. Logoet ligger inde i `.an-head`, som ikke flyttes af
  `anTabletKolonner`/`anBalancerKolonner`, så det hverken dubleres eller mistes ved resize (målt). Den statiske skabelon viser samme logo i
  titelrækken af forhåndsvisningen (h1 forbliver visuelt skjult dér, som før) og linker stilark/scripts kun for godkendte mærker.
- **Søgning** (`js/search.js`, `soegning.html`): `<span class="bl-spalte bl-spalte--sm">` mellem afkrydsningsfelt og navn. Fejl-proben i filteret er `loading="lazy"`,
  så foldede rækker intet henter (mærkelisten ligger desuden bag «Tilføj flere mærker»). Aktive chips, resultatkort og dropdown er uændrede (ren tekst).
- **Kritisk CSS**: `node scripts/kritisk-gen.js` kørt (3714 → 3764 regler: +52, −2); familierne forside/soegning/annonce er ikke i `AKTIV`, så ingen side får
  nyt indlejret CSS af den grund. `scripts/w12-kritisk.test.js`: 18/18 grøn.
- **Bevidst IKKE gjort** (ingen støtte i mockuppen, delt/ejet af andre, ikke bevist værdi):
  - type-/kørekort-/regionssiders mærkerække: de har kun tekst-chips (`popular-chip`), ingen `.maerke-flise`-række at genbruge; mockupsene viser ingen logoer dér. Ingen ændring i `build-facet-pages.js`.
  - modelsider (`model-*.html`, 24 px ved h1): h1'en indeholder mærkenavnet; et logo ville være redundant, og siderne genereres af discovery-strømmens skabelon, som jeg ikke kan bygge uden produktions-lager.
  - guides: intet logo (som aftalt).

## Måling (2026-10-17; lokal mock, Chromium)

- Ny test: `js/w13-integration.test.js` (15 tests, alle grønne, ca. 70 s). Hjælper: `scripts/__fixtures__/w13-integration-hjaelp.js` (server + mock + valgfri forsinket/blokeret SVG).
- **Requests (1440, mock uden cache — serveren sender `no-store`, så maske og fejl-probe tæller hver for sig):**
  | side | før | efter | forskel |
  |---|---|---|---|
  | forside | 28 | 41 | +3 filer (`p-brand-logo.css`, `brand-logos-data.js`, `brand-logos.js`) + 10 SVG-kald = 5 logoer x 2 (maske + probe; i en rigtig browser med cache ca. 5) |
  | søgning ved indlæsning | 20 | 23 | +3 filer, 0 SVG |
  | søgning efter åbning af mærkefilter | 0 | +4 SVG | kun de synlige rækkers logoer (Honda, Yamaha, BMW, Suzuki) |
- **Vægt:** logo-data + CSS + SVG'er på forsiden ca. 54 kB (dobbelt-talt pga. `no-store`), søgning 22 kB efter åbning; hvert SVG < 6 KB (gen-scriptet håndhæver).
- **CLS:** forside 0, annonce (Honda/Yamaha) 0 med SVG forsinket 900 ms; søgning 0. (Annonce ved 768/390 viser 0,0006–0,0016, helt uden for logoet — samme tal for Harley uden logo = eksisterende adfærd.)
- **Overflow:** 0 ved 320/390/768/1024/1440. `smoke-browser --strikt` på index, annonce, soegning × 320/390/768/1440 × lys/mørk: 24 målinger, 0 fejl, 0 advarsler.
- **Kontrast:** logo/flise ≥ 4,5:1 i begge temaer (mask i `--color-fg`), målt i test.
- **Gate:** `npm run gate`: trin 1, 3, 4, 5, 6, 8 (udgiv) OK. Trin 2 (`npm test`): kun `A8 fejlet logo (404)` i `scripts/w13-logo-layout.test.js` rød — IDENTISK rød på basis 464e9168 uden mine ændringer
  (udtrukket med `git archive`, kørt isoleret), altså ikke fra denne strøm; testen forventer `bl--fejl` på alle `.bl--logo` på testsiden. Trin 7 (package.json) rød, indtil Orchestrator tilføjer `js/w13-integration.test.js`.
  `node scripts/brand-logos-gen.js --tjek` grøn.

## Screenshots (udenfor repoet: `%TEMP%\w13-integration`, dvs. `C:\Users\pasca\AppData\Local\Temp\w13-integration`)

`forside-kol-1440-lys/moerk`, `forside-kol-390-lys`, `forside-1440-*`, `forside-390-lys`, `an-honda-1440`, `an-{harley,yamaha,bmw,indian}-{1440,768,390}-*`, `so-filter-{1440-light,1440-dark,390-light}`.
Mærkesiderne i den GENEREREDE kopi (`site\`, bygget med `build-brand-pages.js` på syntetisk lager, ikke produktion): `maerker-1440-lys/moerk`, `maerker-390-mork`,
`maerke-yamaha-1440-lys`, `maerke-yamaha-390-mork`, `maerke-honda-1440-lys`, `maerke-honda-390-lys`.
(`maerker.html`/`maerke-*.html` i repoet er ikke genbygget af mig — det er Orchestratorens `build.js`.)

## «Ligner ikke endnu» — ærlig sammenligning med Forside.png, Mærker.png, Annonce.png

**Forside.png (Populære mærker)**
- Logoerne er ensfarvede (tekstfarve), mockuppens er farvede (Yamaha rød, Honda rød, Kawasaki grøn, KTM orange …). Bevidst: ét farvet logo ville bryde «grøn kun til ✓» og lys/mørk-reglen.
- Mockuppen har KTM og Ducati i rækken; vores seks er de største i lageret (Honda, Yamaha, Kawasaki, BMW, Suzuki, Harley-Davidson). Harley-Davidson viser en «HD»-monogramcirkel, ikke et logo (ikke godkendt) — fliserne ser derfor ikke ens ud.
- Fliserne er højere (111 px i rækken, fordi «Harley-Davidson» bryder over to linjer; mockuppens er ca. 56) og logo-slotten er ca. 36 % af flisen (mockup 40–45 %). Slotten er 38–40 px høj for alle, men selve logotegningerne har forskellig vægt (Kawasaki-ordmærket er bredt og lavt, emblemerne kvadratiske) — lidt mere uens end mockuppen.
- Tallene er ægte (16, 12 …), ikke «12.842»; ingen tusindtalspunktum før 1.000. Kolonnebredden er 1.5fr (mockuppens kolonne er smallere i forhold til de to andre).
- Under 1280 px står fliserne 3 x 2, ikke i én række.

**Mærker.png (Yamaha-mærkesiden)**
- Heroens logo er ét ensfarvet hvidt emblem med «YAMAHA» under (stablet, ca. 54 px), ikke emblem + rødt ordmærke ved siden af (ca. 235 x 54). Ingen farve, og logoet er mindre og mere afdæmpet end mockuppens.
- Ingen slogan (mockuppens «Revs Your Next Ride» er opdigtet og ikke kopieret). H1 er sidens egen tekst.
- Hero-fotoet er sitets eget, ikke en motorcyklist i solnedgang. CTA-panelet «Find din næste Yamaha» med lille logo findes ikke på den genererede mærkeside (ikke min strøm).
- Honda-logoet (lockup) er lavere end Yamaha-emblemet i samme slot.

**Annonce.png**
- Logoet står rigtigt (højrejusteret i titelrækken ved h1, ikke i konkurrence med pris/billeder), men det er ensfarvet sort/hvidt, ca. 40 x 40 px for Yamaha-emblemet og ca. 50 x 40 for Honda — mockuppens er 117 x 40 med ordmærke og farve. Slotten (lg = 40 x 120) bruges ikke fuldt af kvadratiske emblemer, så det ser mindre ud end mockuppen.
- Ingen tagline («Revs Your Heart») — bevidst.
- Mærker uden godkendt logo (Harley-Davidson, Indian, Benelli) har ingen logo ved titlen, så annoncer for dem ser anderledes ud end mockuppen.
- Tablet/mobil: logoet er 30 px højt ved siden af h1 (mockuppen har kun desktop).

**Søgning** (ingen mockup-logoer): filterets mark er 16–18 px i monogram-/logo-kolonne; mærker uden logo viser en lille monogramcirkel (ikke ren tekst som mockuppen) for at holde venstrekanten ens — det er et bevidst valg efter opgaven, men gør filteret lidt mere «prikket» end mockuppens rene tekst.

## DELT-ØNSKE / til Orchestrator

1. Tilføj `js/w13-integration.test.js` til `package.json` "test" (gate trin 7 er rød ellers).
2. Kør `node scripts/build.js` (Orchestrator): genererer `maerker.html`/`maerke-*.html` med logoer, genererer `annonce-*.html` (statiske) med logo, stempler `?v=` og CSP-hashes. `index.html`, `annonce.html`, `soegning.html` har fået `?v=bdba0d22` på de nye tags for at matche de øvrige; build.js kan stemple dem om.
3. `A8 fejlet logo (404)` i `scripts/w13-logo-layout.test.js` er rød på basis (ikke fra denne strøm) og hører til logo-system-strømmen.
4. «Patch-forslagene sidst i builder-system.md (punkt 1–5)» fandtes ikke i filen i denne gren (filen slutter ved «Bevis»); jeg har arbejdet ud fra detective.md og opgaveteksten.
