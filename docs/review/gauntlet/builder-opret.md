# Builder opret — billede 4 (Opret annonce)

Branch `gauntlet/opret` · filer: `opret-annonce.html`, `js/opret-annonce.js`, nye `css/p-opret.css`, `js/opret-validering.js`.

## Bygget pr. billedelement
- **Hero med foto** (forsidens hero-foto + scrim), `← Tilbage til forsiden`, h1, undertekst, **tillidsboks** med 3 ægte punkter (gratis for private · du styrer selv annoncen · side om side med de indekserede).
- **Trinbjælke** som kort der overlapper banneren: nummererede cirkler, titel + undertitel, grøn ✓ på afsluttede trin, `aria-current="step"`. Samme 4 trin, validering og kladde-gem som før.
- **To kolonner**: venstre formularkort med nummereret overskrift + undertekst + `Felter markeret med * skal udfyldes`; labels i sætningsskrift, enheder i felterne (km, ccm, hk, kr.), 4-kolonne grid (container query), `.input` med token `--color-input-border`.
- **Sidebjælke** (sticky): `Din annonce — sådan vil din annonce se ud for købere` med **live-forhåndsvisning** (delt `listingCardHTML`, opdateres ved hvert input, billedvalg og trinskift; værdier der ikke består validering vises ikke på kortet) og `Sælg trygt på Bikerbasen` med 4 ægte punkter (navn kun for indloggede · telefon kun hvis slået til · side om side med indekserede · EXIF fjernes ved upload `stripExifAndResize`).
- **Tips-bokse**: `Gode titler tiltrækker flere købere` (ved mærke/model) og `En god beskrivelse skaber tillid` (ved beskrivelse) — ingen tal.
- **Beskrivelse** med tegntæller `n/4.000`. **Billeder**: stor dropzone + miniaturer i samme række, `Primært billede`-mærke, `Tilføj flere billeder`-flise; upload-logik, HEIC-forsøg, 12-grænse, 12 MB, Enter/mellemrum og flytte/forside-knapper uændret.
- **Valideringsfejl rettet** (F-014): ny `js/opret-validering.js` er eneste kilde. Årgang 1900–næste år (min/max på feltet sættes fra samme tabel, så hjælpetekst/felt/kode ikke kan være uenige), km 0–500.000, ccm 50–3.000 (heltal), effekt 1–300 hk, pris 1–5.000.000, ejere 1–99, syn/dæk-årstal, beskrivelse ≤4.000 (DB tillader 5.000). Klar dansk fejltekst ved feltet (`.felt-fejl`, `aria-describedby`, `aria-invalid`), fokus på første fejl **i dokumentrækkefølge**, fejlen forsvinder når feltet rettes.

## Matcher IKKE billedet (bevidst)
- Billedet viser alle sektioner på én side; vi beholder 4 trin (opgaven: behold trinlogik). Billedets 5 trin (Sælgeroplysninger) findes ikke — ingen sælgerdata at indsamle her.
- Ingen titelfelt (titel = mærke + model + årgang; DB har ingen titelkolonne) → ingen 0/70-tæller; tæller sidder på beskrivelsen. Ingen vægt-felt (ikke i datamodel). Ingen rig-tekst-værktøjslinje (beskrivelsen gemmes som ren tekst). Ingen "Hjælp hele vejen" og ingen "Vis eksempel på fuld annonce" (ingen ægte funktion/support). Billedets AI-fotos/«3x flere»/«tusindvis af købere» udeladt. Primær CTA er brandfarven, ikke grøn. Heroens foto er forsidens motorcykelfoto, ikke billedets bro-motiv.

## DELT-ØNSKER
1. `scripts/stamp-version.js` skal stemple `css/p-opret.css` og `js/opret-validering.js` (linket uden `?v=`).
2. Tilføj testfilerne herunder til `npm test`. 3. Gamle trin-/upload-regler i `styles.css` (`.stepper`, `.step-*`, `.upload-zone`, `.photo-*`, `.page-title-bar` på denne side) kan senere ryddes; p-opret overstyrer dem.

## Tests (`node --test`)
`js/opret-validering.test.js` (12 tests: grænser, negative/urealistiske tal, decimaler, år-afhængighed, rækkefølge) og `js/opret-annonce-markup.test.js` (6: felt-id'er, ingen hårdkodet min/max, scriptrækkefølge, én h1, ingen opdigtede påstande, ingen inline script). `npm test` 364/364 grønne (før de to nye filer blev medtaget i pakken), `node --check` rent.

## Målt (Playwright, mockede Supabase-svar; ingen produktionskald)
- Fuldt flow gennemført lokalt: udlogget validering → kladde → login-redirect → kladde gendannet; mock-logget ind: trin 1–4, 3 fotos via tastatur (Enter åbner filvælger), udgiv afvist uden vilkår, POST-payload korrekt (mærke/pris/år/hk/postnr), 3 foto-poster, redirect til `annonce.html?id=`. 36/36 checks; konsol uden fejl.
- Vandret overflow: 0 af 48 kombinationer (320/360/390/768/1024/1440 × lys/mørk × trin 1–4).
- Kontrast (computed): alle tekster ≥ 4,5:1 (mindste 4,68 for `*`, 4,92 valgfri-tag), inputkant 3,59–3,78 (≥3). Hero-tekst målt pixelvis mod fotoet: worst-case ≥ 6,5:1 (h1/lead) på alle bredder, lys+mørk.
- 3 iterationer mod billedet: (1) første render → moderat type-fliser, hero-scrim på smal skærm, 2-kolonne felter på mobil, "kortet til højre" ændret; (2) hero-scrim målt og strammet (h1 var 2,86:1 ved 1024), fejlede værdier ud af live-kortet; (3) dropzone + miniaturer i række, Primært-mærke afklippet → bredere fliser.

## Rest
- Preview-kortet viser delte kortets "Pris ikke oplyst"/"Km ikke oplyst" som tomme felter (ærligt, men stort pris-felt). Live-kort er `inert` (ikke tilgængeligt for AT); formularen er kilden.
- Gammel `Forside`-tag på redigering ændret til `Primært billede`. `?rediger=` kun kodegennemgået (selectorer opdateret), ikke kørt visuelt.

Commits: se `git log gauntlet/opret`.
