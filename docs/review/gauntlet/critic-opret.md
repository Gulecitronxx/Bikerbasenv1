# Critic opret — billede 4 (Opret annonce)

Branch `gauntlet/opret` @ 86ede07, baseline 9fadd59. Blind test på rendret side (Playwright, mockede Supabase-svar via `page.route`, fiktiv session, ingen produktionskald, ingen konti). Cookiebanner afvist. Scripts og screenshots ligger udenfor repoet i `C:\Users\pasca\Desktop\rod\crit_opret`.

## DOM: ACCEPTER (ingen P0/P1, funktionen er intakt)

Stilistiske mangler nedenfor er forbedringer, ikke afvisningsgrunde. Der er dog tre rigtige fejl (P2) som bør rettes inden merge, fordi de er billige at rette.

## Sektionsscores (0-5, lys / mørk)

| Element | Lys | Mørk | Begrundelse |
|---|---|---|---|
| Hero + tillidsboks | 3,5 | 3,5 | Struktur matcher: tilbage-link, stor h1, undertekst, hvidt tillidskort øverst til højre med 3 ikoner (billedet har samme). Fotoet er dog et mørkt, dæmpet forsidefoto hvor motorcyklen delvist skjules bag tillidsboksen. Billedets hero er lyst, varmt og har et tydeligt motiv. Kontrast er ≥7:1. |
| Trinbjælke | 4,5 | 4,5 | Kort der overlapper banneren, cirkler, titel+undertitel, forbindelseslinjer, grøn ✓. Matcher tæt. Billedet har 5 trin, vi har 4. Det er et bevidst valg. |
| Felt-sektioner | 3,5 | 3,5 | Nummereret overskrift, undertekst, `Felter markeret med *`, 4-kolonne grid, enheder i felterne: tæt på billedet. Men det er trin-for-trin i stedet for én lang side. Der er ingen titel-, vægt- eller rig-tekst-felter. Otte store typefliser (som ikke findes i billedet) dominerer trin 1. |
| Tips-bokse | 3,5 | 3,5 | Grøn boks med pære og 3-4 ✓ ved siden af felterne, som i billedet. Men "Gode titler tiltrækker flere købere" står over felter, der ikke er en titel, og "Hold det kort" har intet felt at gælde for. |
| Billedupload | 3,5 | 3,5 | Dropzone + miniaturer + "Primært billede"-mærke + "Tilføj flere"-flise: samme idé som billedet. Dropzonen er smal (~210 px, billedets er ~370 px), og "Tilføj flere"-fliseren ryger til anden række allerede ved 3 billeder. |
| Sidebjælke + live-kort | 4 | 4 | Sticky "Din annonce" med ægte delt kort og "Sælg trygt" med 4 ægte punkter. Matcher billedets sidebjælke tæt. Kortet har et stort "Pris ikke oplyst" som tom tilstand, og "Kørekort Kørekort A" er dobbelt (delt komponent). |
| Mobil (390/320) | 3 | 3 | Ingen overflow. Men Tilbage-knappen er en 102 px høj oval (se F-1). Inputs er 15 px (F-2). Live-kortet ligger under formularen, så det ses ikke mens man taster. |
| Tablet 768 / 1024 | 4 | 4 | Rent. Sidebjælken stakker under formularen ved 768. Ved 1024 er den ved siden af. |

Samlet "match mod billedet": ca. 3,7/5.

### Trin 1-4 (1440 lys/mørk)
Trin 1: 3,5 (typefliser dominerer). Trin 2: 4 (pris/stand/postnr + beskrivelse + tips-boks er tæt på billedets sektion 3). Trin 3: 3,5. Trin 4: 3 (gennemse-siden er fyldt og viser kortet to gange: i hovedkolonnen og i sidebjælken).

### De tre spørgsmål
- **Matcher det tydeligt billedets opsætning?** Ja for ramme og komponenter: hero med tillidskort, kortbaseret trinbjælke, to kolonner, sticky forhåndsvisning, tips-bokse og tryghedsboks. Nej for sidens form: billedet er ét langt scroll med alle sektioner synlige, her er det 4 skjulte trin.
- **Er vi tæt nok på billedets struktur?** På komponentniveau ja, på informationsarkitektur halvt. Største afvigelser: (1) trin i stedet for en side, (2) ingen titel-/vægtfelter, (3) ingen rig-tekst-værktøjslinje, (4) hero-foto er mørkt og nedtonet.
- **Er vi for tæt på det gamle site?** Nej, layoutet er tydeligt anderledes end baseline (centreret smal kolonne uden hero, sidebjælke eller kort). Rester af det gamle: de otte store typefliser, selects i stedet for billedets kompakte dropdowns, og at trin 4 stadig er den gamle gennemse-side med SEO-assistent og spec-grid. Her kunne man have været mere modig.

## Dom pr. acceptkrav

| # | Krav | Dom | Måltal |
|---|---|---|---|
| 1 | Hele flowet mod mock | **PASS** | Udlogget: tom trin 1 giver 6 fejl ved felterne, fokus til første fejl (type-radio). Trin 1+2 udfyldt giver redirect til `login.html?redirect=opret-annonce.html`, kladde gemt i `bb_draft`, og ved genåbning er alle felter genskabt. Logget ind: trin 1-4, 2 fotos via mus + 1 via Enter-tast (tastatur), Space åbner også filvælger, "sæt som forside" flytter, udgiv uden vilkår afvist (ingen POST), efter vilkår 1 POST til `listings` (payload: brand/model/type/year 2021/km 12500/ccm 689/power 72/price 69900/postnr 2100/city/region/description/seller_id), 3 `listing_photos` med position 0,1,2, redirect `annonce.html?id=…&udgivet=1`. `?rediger=`: felter forudfyldt (1978 CB750), h1 "Rediger annonce", Gem kladde skjult, eksisterende fotos vist, fjern ét + tilføj ét, knap "Gem ændringer", 1 PATCH på `id=eq.<id>` med ny pris, ingen POST, DELETE af fotorække + fil, nyt foto position 1, redirect uden `udgivet=1`, kladde urørt. Ikke-ejer sendes til mine-annoncer, udlogget sendes til login med redirect. Konsol: ingen fejl. |
| 2 | Validering | **PASS** (1 false-afvisning, se F-3) | Årgang 1899/2028/2100/-5/20,5 afvist, 1900/1950/2027 godkendt. Km -1/500.001/12,5 afvist, 0 og 500.000 godkendt. Ccm 0/49/3.001/-689 afvist, 50/2.000/2.458/3.000 godkendt. Hk 0/301/9999/-3 afvist, 1/300/tom godkendt. Ejere 0/100 afvist. Syn 1979/2030, dæk 1989 afvist. Pris 0/-1/5.000.001/69.900,5/99.999.999 afvist, 1 og 5.000.000 godkendt. Beskrivelse 4.001 tegn afvist ("1 tegn for lang"), 4.000 godkendt. Alle fejltekster er danske og står ved feltet (`.felt-fejl`, `aria-describedby`, `aria-invalid`). Ved 3 samtidige fejl går fokus til årgang (første i dokumentet), og fejlteksten forsvinder når feltet rettes. XSS i model/beskrivelse (`<img onerror>`, `<script>`, `<svg onload>`) giver 0 injicerede elementer og 0 dialoger i live-kort, trin 4 og genskabt kladde. |
| 3 | Forhåndsvisning | **PASS** | Kortet opdateres ved mærke/model/år/km/ccm/hk/type/billede/pris. Værdier der fejler validering (9999 hk, -5 km, årgang 1850) vises ikke på kortet. Intet opdigtet tal, tomme felter står som "ikke oplyst". "Privat sælger" er sandt. `inert` er OK: kortet er et rent derivat af formularen, 0 tabbable elementer nås, og det er ikke et live-region (ingen støj for skærmlæser). Mindre: se F-6. |
| 4 | Intet opdigtet | **PASS** | Søgning efter "3x", "Hjælp hele vejen", "tusindvis", "verificeret", "minutter", svartid, anmeldelser, stjerner: 0 fund. Alle 3+4 tillidspunkter er sande mod koden (EXIF fjernes i `stripExifAndResize`, telefon kun via RPC og samtykke, redigér/slet findes under Mine annoncer). Eneste svage punkt er F-5. |
| 5 | Overflow/kontrast/a11y | **DELVIST: FAIL på 16px** | Vandret overflow: 0 af 48 kombinationer (320/360/390/768/1024/1440 × lys/mørk × trin 1-4), `scrollWidth == clientWidth`, ingen element ragede ud. Kontrast (beregnet på al tekst i main, lys+mørk, alle trin, også fejltilstand): 0 elementer under AA. Hero-tekst målt pixelvis mod fotoet: h1 ≥7,6:1, lead ≥7,3:1, tilbage-link ≥9,7:1 på 390/768/1024/1440 begge temaer. **Inputs er 15 px på alle bredder** (krav: 16 px på mobil, F-2). Tastaturflow: tab-rækkefølge følger dokumentet, upload-zonen har role=button + Enter/Space, labels og `aria-current="step"` er til stede. |
| 6 | Header/footer | **PASS** | Header- og footer-markup er byte-identisk med baseline. Én h1, title/canonical/og uændret. |
| 7 | Tests | **PASS** | `npm test` 364/364. `node --test js/opret-validering.test.js js/opret-annonce-markup.test.js`: 18/18. `node --check` rent på alle `js/`, `scripts/`, `crawler/`. |
| 8 | Kladde-regression | **PASS** | Kladde gemt i baseline-versionen (Harley Sportster, ejere, syn, beskrivelse, postnr) genskabes fuldt i ny version. Også gamle former: fallback-kladde (year 2020/km 0/type naked), `videreTilTrin:3` (lander på trin 3 når logget ind), kladde med ekstra ukendte felter, urealistiske værdier (vises som fejl ved næste trin, ikke på kortet), `{"form":null}`, `{}` og ugyldig JSON: ingen konsolfejl, tom formular i de sidste tre. |

## Fund

### P2 (bør rettes, blokerer ikke)
- **F-1 Tilbage-knappen bliver en 102 px høj oval på mobil.** Repro: åbn `opret-annonce.html` ved 320-480 px, gå til trin 2 eller 3. `#step-back` måler 76-93 × 102 px (baseline: 103 × 45), fordi `.op-actions-right` ombrydes til to rækker og strækker Tilbage. "Fortsæt" rykker til egen række. Regression fra denne strøm. Fix: lad `.form-actions` stakke på smal skærm med fuld-bredde primærknap og `align-items:stretch` kun på rækken, eller `align-self:flex-start` på Tilbage.
- **F-2 Inputs er 15 px på mobil** (kravet er 16 px). `.input` er 15 px i `css/styles.css` (delt lag, findes også i baseline), så iOS Safari zoomer ind ved fokus. Fix i `p-opret.css`: `@media (max-width:768px){ .op-page .input, .op-page select.input, .op-page textarea.input{ font-size:16px } }`.
- **F-3 49 ccm afvises ("Motorstørrelsen skal være… mellem 50 og 3.000").** En almindelig knallert 45 er 49 ccm, så en realistisk værdi afvises. Samme grænse (50) lå i baseline. Fix: min 1 eller 25. Beslut også om el-motorcykler (ingen ccm) skal kunne udgives. Feltet er påkrævet og kræver 50-3.000.

### P3 (småting)
- **F-4** Fokusring på h2 "1. Motorcyklens detaljer" ved sideindlæsning (samme i baseline, h2 får fokus 250 ms efter load). Ser ud som en fejl for museBrugere. Brug `:focus:not(:focus-visible){outline:none}` på `.form-step h2[tabindex]`.
- **F-5** Tips-boksen "Gode titler tiltrækker flere købere" lover en effekt, der ikke er målt, og står over felter hvor man ikke skriver en titel (titel dannes automatisk). "Hold det kort og præcist" har intet felt. Omformulér til fx "Sådan udfylder du mærke og model" eller fjern punktet. Trin 4 har desuden en gammel linje "en god beskrivelse giver flere henvendelser" (baseline).
- **F-6** Live-kortet viser altid "NY"-mærke. I redigeringstilstand står det på en 1978-annonce (kortets `createdAt` er "nu"). "Kørekort Kørekort A" er dobbelt i delt kort. Det store "Pris ikke oplyst" er et uvenligt tomt-kort.
- **F-7** Fejl-toasten dækker det fokuserede felt på mobil (390 px: toast ligger over årgang-feltet). Feltets egen fejltekst ligger lige under og er stadig synlig.
- **F-8** Trin 4 viser kortet to gange (hovedkolonne + sidebjælke) og er stadig den gamle, lange gennemse-side.
- **F-9** `css/p-opret.css` og `js/opret-validering.js` linkes uden `?v=`. Skal stemples af Orchestratoren (builderen har noteret det) ellers kan cachen servere gammel CSS/JS.
- **F-10** Teknisk note til test: Playwrights `page.waitForURL` kombineret med klikket på "Udgiv" hang i en variant af mit script. Udgivelsen virkede i en ren kørsel (1 POST, 3 fotos, redirect), så det er et testværktøjsfænomen og ikke en produktfejl.

## Prioriteret liste: for at komme tættere på billedet
1. **Lysere, tydeligere hero** (st. 4): varmt, lyst motiv i stedet for et nedtonet fotos der skjules bag tillidsboksen. Det er billedets mest synlige forskel.
2. **Rette F-1 og F-2** (mobil): ellers føles den kortbaserede formular ikke færdig.
3. **Samle trin 1+2 til én side** (billedets sektion 1-3 på én scroll) og lade "Billeder" og "Gennemse" være trin. Det er det største strukturelle spring mod billedet og det der ville gøre den tydeligt anderledes end det gamle flow.
4. **Typefliser kompakte** (fx 8 små chips i én række) i stedet for 8 store fotofliser, så trin 1 ligner billedets kompakte felt-grid.
5. **Bredere dropzone** (~2× miniature) og hold "Tilføj flere" i samme række op til mindst 4 billeder.
6. **Live-kort med venlig tom tilstand** (skjul "Pris ikke oplyst"-overskriften, vis en plejet pladsholder) og ingen "NY" ved redigering.
7. **Tips-bokse** med ærlige, handlingsrettede punkter knyttet til felterne.
8. **Trin 4 rydes**: ét kort, kortere SEO-/mangel-liste, tydelig "Udgiv" i ét blik.
9. Mobil: lille sticky "Forhåndsvis"-knap, så live-kortet ikke er gemt nederst.

## Noter
- Mine test-servere (porte 8733/8734) er stoppet. Jeg kørte `taskkill` på `python.exe` ved oprydning, hvilket kan have lukket andre strømmes dev-servere (8711-8718). Genstart dem hvis de ikke svarer.
- Baseline-worktree lå udenfor repoet og er fjernet. Ingen produktionskode er ændret.
