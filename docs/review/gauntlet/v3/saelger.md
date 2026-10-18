# V3 Agent 3: Sælger-oplevelse (opret, login, mine annoncer, dashboard)

Branch `gauntlet/v3-saelger`. Kun lokal mock (`scripts/w9-saelger-mock.js`). Screenshots: `docs/review/gauntlet/v3/saelger/foer|efter` (375/430/768/1440/1920, lys+mørk; opret både ind- og udlogget, login, dashboard, mine) og `flow/`.

## Rod-årsager til Critics fund
- **P2-2 flaky `w9-saelger.test.js:183`**: `#op-photos` ligger synlig i den statiske HTML, så testens `waitForSelector('#op-photos')` returnerede, før `DOMContentLoaded`-handleren havde ventet på `backendReady()` og lagt kladden tilbage. Løb mellem testen og init. Ægte brugerfejl samme rod: ved langsom backend står formularen tom, og kladden overskrev bagefter det, brugeren allerede havde skrevet. Rettet: (1) `document.body.dataset.opKlar` sættes når init er færdig; testen venter på den (deterministisk), (2) `restoreDraft` overskriver ikke felter brugeren har rørt. Låst i `v3-saelger.test.js` med 700 ms forsinket backend. Fuld testsuite kørt 2 gange uden flaky.
- **P3 dashboard-CLS 0,0385 ved 320 px**: målingen ramte login.html (dashboard sender udloggede videre). `login.js` satte overskrift/undertekst efter `await backendReady()`, så underteksten skiftede længde efter første maling. Nu sættes teksten af et lille inline-script i login.html før første maling (CSP-hash opdateret med `csp-hashes.js`), og login.js sætter den også tidligt. Under 6x CPU + 350 ms backend-forsinkelse: 0,0363 -> 0,0054.
- **Orphan på login**: `text-wrap: balance` på overskrifter/undertekst.
- **Afkortet felt ved 375/390 på opret**: placeholderen "F.eks. 12500" blev klippet af enhedssuffikset "km". Eksemplerne er nu "12500", "689", "72" (enheden står i feltet). Målt med canvas i test.

## Forbedringer (flow som rigtig bruger)
1. Deterministisk init + kladde der ikke overskriver (se ovenfor).
2. Login: ingen layoutskift ved redirect-kontekst; ingen enlige ord.
3. Valideringsbesked: tom "Fortsæt" sagde "9 felter. Først: Vælg mærke", mens siden scrollede til typevalget, og typen var ikke talt med. Nu "N felter skal rettes. Først: Vælg motorcykeltype." med korrekt antal.
4. Native `confirm()` erstattet af tilgængelig `<dialog>` (`js/bekraeft-dialog.js`, `css/p-bekraeft.css`): navngiver annoncen ("Slet Honda CB 500?"), handlingen står på knappen ("Slet annonce", "Markér som solgt", "Fjern billede", "Slet kladde"), fokus på det sikre valg, Escape/klik udenfor annullerer, fokus tilbage, nævner "sæt på pause" som alternativ, reduced-motion respekteret, 44 px knapper, fuld bredde på mobil. Bruges i mine annoncer, dashboard og opret (fjern billede).
5. Login: på mus/tastatur får første felt fokus ved indlæsning (ikke på touch, ikke ved gendannelses-token).
6. Typevalget (manglende) indgår nu i fokus/scroll og samlebesked.

## Verificeret uden fund
Login/registrering-flow, billedupload, forhåndsvisning, kladder, redigering, status, fejl-feedback (w9-suiten 60+ tests grønne).

## Tests (tilføj i package.json: `js/v3-saelger.test.js`)
`js/v3-saelger.test.js` (6 tests). Opdateret: `w9-saelger.test.js`, `v2-saelger.test.js` (bekræftelser er nu dialog; `window.__bekraeftSvar`), `w7-funktion.test.js` (stub for `bekraeft`).

## Til Orchestrator
- CSS ændret (p-login.css, ny p-bekraeft.css): `scripts/w12-kritisk.test.js` "manifestet" fejler, til `build -> node scripts/kritisk-gen.js -> build` er kørt.
- Kendt uden for mit område: de øvrige 11 fejl i `npm test` (W10/W11 fejlbanner, skip-link, cookie, "tomt/fejlet lager") er ikke berørt af mine filer; de kørte grønt på baseline for w7/w10-footer, resten ikke isoleret.
- QA-fund mc-harley-davidson-cruiser.html 375 px mørk (CLS 0,124-0,133): reproduceret; rod-årsag er skrifttypeskift: `.fa-hero-intro` går fra 109 til 87 px (én linje færre, når webfonten erstatter fallback), og `.fa-panel`/`.fa-soeg-vrap` rykker 22 px. Rettes i facet-området (`css/p-facet.css`/inline @font-face): fallback med `size-adjust`/`ascent-override`, eller `min-height` på `.fa-hero-intro` ved smal viewport.

## Selvscore (Critic dømmer)
Opret 7,8 · Login 7,3 · Mine annoncer 7,3. 7 dimensioner: visuel 7, konsistens 8, funktion 8, UX 8 (dialoger, fejlbesked, kladde), mobil 8, performance 8 (CLS fjernet), indhold 7.
