# V7 Agent 3: mærker, søgning og markedspladsens fuldstændighed

Branch `gauntlet/v7-maerke` (udgangspunkt `e7232df3`). Screenshots før/efter: `docs/review/gauntlet/v7/maerke/` (`foer-*` = `e7232df3`, `efter-*` = denne branch; 375/430/768/1440/1920, lys og mørk).
Ingen filer hentet fra nettet, intet skrevet til produktion. Lageret er læst fra produktions-Supabase med GET (som build gør) og lagt som fixture: `scripts/fixtures/v7-lager-maerke.json` (735 aktive rækker, 26.10.2026).
Ejeren vil ikke have flere mærker uden grund: **der er ikke tilføjet et eneste mærke.** Arbejdet er korrekthed og datakvalitet.

## 1. Metode og udgangspunkt (Gauntlet-metoden)

1. Frisk lagerkopi + dækningsrunneren `scripts/v4-maerke-dakning.js --data live --streng-v5` (alle 7 grupper, mod byggede sider) FØR og EFTER.
2. Systematisk ende-til-ende-kontrol af hvert led (se afsnit 2) i Node (rigtig kode via `browserModules()`) og i browser (Playwright, værten `bb-qa.test` så demoannoncer ikke er med).
3. Hvert fund: reproduceret på det rigtige lager, målt, rettet konservativt, låst med en regressionstest, målt igen.

**Dækningsrunneren, hele lageret, før -> efter** (rapporterne ligger i `docs/review/gauntlet/v7/maerke/dakning-foer.txt` / `dakning-efter.txt`):

| | FØR (`e7232df3`) | EFTER |
|---|---|---|
| Fejl / advarsler (strikt, nye) | 0 / 0 | 0 / 0 |
| Registermærker / valg i opret-annonce | 105 / 105 (+ "Andet mærke" = 106) | 105 / 105 (+ 1) |
| Lager (annoncer) / mærkenavne | 720 / 31 | 718 / 30 |
| Info | 5 (heraf `lager-ukendt-maerke`, `filter-viser-ukendt`) | 3 (de to er væk: ingen annonce uden mærke) |
| Supabase-skrivninger afvist | 0 | 0 |

Runneren var altså grøn fra start: registret, siderne, oversigten, logoerne og opret-annonce hænger sammen. Fundene nedenfor ligger i LAGERETS INDHOLD og i søgningen, ikke i registrets struktur.

## 2. Kontrolmatrix (hvad er prøvet, hvad blev resultatet)

| Led | Kontrol | Resultat |
|---|---|---|
| Registret (105) | dubletter, aliaser, slugs, belæg, periode; `normalise()` på navn, VERSALER, slug, hvert alias | 0 fejl (`scripts/maerke-register.test.js`, runneren, `scripts/v7-maerke-ende-til-ende.test.js` test 2) |
| Mærkevælger i opret-annonce | 105 registrerede + "Andet mærke" = 106; alle valgbare også uden annoncer og historiske | OK i DOM (runneren gruppe 4) og i kode |
| Søgefiltre | mærkeliste (en række pr. mærke, antal = filter = fritekst), modelliste, "Uoplyst mærke" | OK; antal pr. mærke i liste = filter = fritekst for alle 30 (`js/v7-maerke-soegning.test.js`) |
| Mærkesider (30) / oversigt | `[data-mk-n]` = lager, ingen tom side, noindex < 5, URL'er bevares, Flere mærker | OK (runneren); efter V7-rettelsen: BSA 8 -> 7 |
| Annoncedetaljer | brødkrumme, H1, `<title>`, logo, rensede modeller, direkte adresse til en efterspørgsel | OK; **restpunkt F6** (efterspørgsel vises som almindelig annonce) |
| Logoer | manifest <-> registret, fil/hash, `BrandLogos` for alle 105 | OK (0 fejl); **Honda er monogram i filteret** (afsnit 5) |
| Mærke-/modelaliasser | 383 syntetiske alias-annoncer + 11 UI-alias + 57 hurtigsøg | 0 fejl |
| Importerede annoncer | rå `maerke` i lageret: 32 forskellige skrivemåder -> 28 registrerede + "uoplyst" | se F5 |
| Historiske mærker | valgbare, ingen tom side, hver sit sted i Flere mærker | OK (`v7-maerke-ende-til-ende.test.js` test 5) |
| Ukendte mærker | rå brand = modelnavn/fritekst giver titlens mærke eller "Uoplyst mærke", aldrig en ny række | OK (test 4) |

### 2.1 Rå brand-felt i lageret (735 rækker, 32 skrivemåder)
`Honda 320, Harley-Davidson 82, Yamaha 70, Suzuki 65, BMW 46, Kawasaki 43, Triumph 35, KTM 14, Royal Enfield 13 + "Royal-enfield" 1, BSA 5 + "Bsa" 3, ...` plus **"Andet Mærke" 4, "Ukendt" 1**, "Fb Mondial", "Sym", "Lauge" (+ "Lauge Jensen"). Det er kun FEM rå skrivemåder, der afviger fra registrets navn (Bsa, Fb Mondial, Royal-enfield, Sym, Lauge); de foldes alle af registret ved læsning (ét filter, ét logo, én mærkeside). "Harley Davidson", "Moto-Guzzi", "Mv Agusta", "GAS GAS", "Cf moto" står IKKE i lageret i dag, men er prøvet direkte i det rå felt med 45 skrivemåder (`v7-maerke-ende-til-ende.test.js` test 1: kanonisk brand, samme logo, samme slug, ét filter, én mærkeliste-række).
De fire "Andet Mærke"-rækker får deres rigtige mærke fra titlen (CFMOTO MTX800 -> CFMoto, DKW 250 -> DKW, Victory V 92 -> Victory, Fantic moto cross -> Fantic): **ingen annonce står under et forkert mærke** (0 af 735 skiftede mærke i V7-ændringerne).

## 3. Fund og rettelser

### F1. To "købes"-annoncer stod som til-salg (JS: `js/data.js`)
Mærkeoversigten sagde "N annoncer uden mærke". Lageret har i dag én (`Ukendt`, "moto cross købes", 9.998 kr.) — og "BSA / Triumph / Norton købes" stod som BSA-annonce (model "Triumph Norton købes", ingen pris). **Begge er efterspørgsel, ikke salg**, begge fra Gul og Gratis. Den gamle regel (kun titlens START) beholdt dem bevidst som accepteret falsk negativ.
Rettelse: `erEfterspoergsel()` har fået en SMAL slut-regel (se `docs/review/DECISIONS.md`, "F-009 REVIDERET — V7"): titlen ender på "købes"/"ønskes købt", 1-7 ord foran, ordet foran er ikke kan/også/hurtig/handel ..., ingen "?" og ingen salgsord. Samme funktion bruges af klient OG byg (mærkesider, facetsider, guides, SRP), så tallene er ens overalt.
Måling: hele lageret har præcis 2 titler med "købes"; 0 salg ramt. Lager 718 -> 716, BSA 8 -> 7, "Uoplyst mærke" 1 -> 0, oversigten 720 -> 718 (ved byg), 0 mærkeskift. Direkte adresse virker stadig. Alle de gamle falske positiver er negative tests.
Test: `js/v7-maerke-efterspoergsel.test.js` (6), `js/data-kvalitet.test.js` (opdateret: "BSA / Triumph / Norton købes" er nu efterspørgsel).

### F2. Støj i modelfilteret (JS: `rensModelStoej` i `js/backend-bridge.js`)
Målt på lageret: **24 modelnavne i modelfilteret var ikke modeller** (411 modeller i alt):
`VT600 ‘NY pris’`, `x town 300 rabatpris`, `XSR 900 GP DEMOPRIS`, `CBF125 2009 Projekt mekaniker`, `Cb500 1996 a2`, `ZL600 lav sædehøjde`, `Xj 900 årg 90`, `GSX-8T 776 83HK 6g` (+ 8R), `Nye Kawasaki kx 450`, `Classic 350cc classic-bike.dk`, `God velkørende custom med lav. KM`, `Moto yamaha`, `moto maskine`, `motorcykel V 92 Prototype`, `Triumph Norton købes`, `Moto købes`, 6 x `... Classic Bike` (BSA/Triumph), `Daytona 955i bike`.
Rettelse, TOKEN-baseret og konservativ (klipper kun ved et helt ord, aldrig midt i et navn): pris-ord (`*pris`, rabat), projekt/mekaniker/reservedele/defekt, "lav"/sædehøjde/velkørende, `<tal> km` og `<tal>HK` (inkl. "776 83HK"), "årg NN", et enkelt A2 i halen, et årstal i halen KUN hvis det ligger inden for ét år af annoncens årgang, et domænenavn i halen, kildens "Classic Bike", ledende "Nye/Ny" (kun med mindst to ord bagefter), hele sætninger uden tal, og kategoriord (`moto`/`motorcykel`/`maskine`) efter at mærket er fjernet. **Det, der aldrig røres:** store ccm, der ligner årstal (XV 1900, VN 2000), "Custom Bike", "Motocompo", "CL 500 A", tal i navne (GSX-8R), ord inde i navne.
Måling før -> efter: støjmodeller **24 -> 0**; modeller 411 -> 402 (fire dubletter smelter sammen: `Cb500 1996 a2` bliver `CB 500`, `CBF125`, `VT600`, `Daytona 955i`); **100 rigtige modelnavne fra lageret røres ikke** (0 af 100 ændret); rensningen er idempotent på hele lageret; kun tre annoncer mister sin model (to kategoriord og én sætning), de står nu som "Mærke (model ikke oplyst)".
Test: `js/v7-maerke-model.test.js` (6) mod `scripts/fixtures/v7-modelnavne-rigtige.json` (100 modelnavne) og `v7-lager-maerke.json` (hele lageret).
Bevidst IKKE gjort: farver efter modelnavnet ("Tiger 800 XCX Lucerne Blue", Royal Enfields "Apex Grey/Sheet Metal Grey/Golden Shadow") og brand-stavefejl i modellen ("Zusuki V-STROM 650 dl"): en farveordliste kan klippe halve modelnavne; hører til crawleren (afsnit 7).

### F3. Søgning: "cb 650 r" fandt en BSA (JS: `js/filtrering.js`)
Hvert ord i fritekstfeltet skulle findes i mærke+model hver for sig, og "r" og "cb" står i næsten alt: `cb 650 r` gav **17** træf, heriblandt BSA Spitfire 650 Classic Bike ("cb" i *classic bike*, "r" i *classic*), mens `cb650r` gav 9. Rettelse: **frase først** — står ordene sammen i rækkefølge ("cb650r"), og findes mindst ét sådant træf i lageret, gælder frasen; ellers falder vi tilbage til ordene hver for sig (OG) som før. Valget afhænger kun af lager og søgeord, så facettællingen er enig med resultatet. Typeord ("cruiser touring") er undtaget.
Måling: `cb 650 r` 17 -> **9** (= `cb650r` = `CB-650-R`); `gl 1800` = `gl1800` = `GL-1800` = 24 før og efter; "gold wing 1800", "650 cb" virker som før (reserven).
Test: `js/v7-maerke-soegning.test.js` (7).

### F4. Søgesiden havde ingen søgeforslag (JS: `js/search.js`, CSS: `css/p-soegning.css`)
Forsiden har en `<datalist>` (`#hs-suggest`); selve søgesiden (`#filter-q`) havde ingen. Vurdering: simpelt og ærligt kan det bygges med samme regel som forsiden: kun mærker og mærke + model, der FINDES i lageret, og kun registrerede mærker. `byggSoegeforslag()` (23 linjer) bygger en native `<datalist id="so-suggest">` efter første maling (etape 4: ingen ekstra script, ingen ny dropdown, ingen CLS). 432 forslag; **hvert forslag giver mindst ét træf** (testet for alle). Browserens egen pil lå klods op ad ryd-knappen, så den er skjult (`::-webkit-calendar-picker-indicator`); forslagene kommer, når man skriver.
Test: `js/v7-maerke-browser.test.js` (forslag, ingen dubletter, ingen støj/uoplyst, 0 forslag uden træf).

### F5. Rå brand i databasen vandrer mod Title Case (FORSLAG, crawler)
Crawlerens `MAERKE_ALIAS` (`crawler/normalize.js`) kender ca. 20 stavemåder; registret 105 mærker + aliaser. Målt: **46 af 105 registermærker har mindst ét alias, som crawleren gemmer som Title Case** ("Honda Motor", "Ktm Ag", "Triumph Motorcycles", "Fb Mondial", "Swm", "Ajp", "Royal Enfield Motors" ...). Det er præcis dét, der gav de fem afvigende rå skrivemåder i lageret (Bsa, Fb Mondial, Royal-enfield, Sym, Lauge). Klienten retter det ved læsning, så ingen bruger ser det; men DB-feltet er ikke kanonisk (se afsnit 7).

### F6. Direkte adresse til en efterspørgsel vises som almindelig annonce (RESTPUNKT, `js/annonce.js` er ikke mit)
`annonce.html?id=<moto cross købes>` virker (ingen fejl), men står som "Ukendt mærke Moto købes" med pris 9.998 kr. og `<title>` "Ukendt Moto købes hos Gul og Gratis". Forslag til annonce-agenten: `Store`-opslaget via `EXTERNAL_DUBLETTER` kan kende en efterspørgsel (`erEfterspoergsel`), og siden bør dér vise en rolig note ("Denne annonce er en efterspørgsel — nogen vil købe. Den er ikke til salg og vises ikke i søgningen.") og `noindex`. Det rammer kun gamle links.

### F7. Toast overlapper sammenlign-bjælken på mobil (RESTPUNKT, fælles CSS)
På 430 px lægger "Søgningen er gemt her på enheden"-toasten sig oven på "2 valgt til sammenligning"-bjælken (se `efter-gemt-toast-430.png`). Midlertidig (toast), men dækker "Sammenlign (2)". Forslag: toastens `bottom` + højden af `.compare-bar` når den er synlig. Fælles fil, ikke rørt.

### F8. Øvrige datakvalitetsrester i lageret (ikke rettet, rapporteret)
`MC. cervice` (Yamaha, ingen pris/årgang/km/model — sandsynligvis værkstedsannonce, ikke et salg), `Café’ ræser` (Honda, en stil, ikke en model), `Custom Bike` (Harley), `Sporster` (stavefejl), `Zusuki V-STROM 650 dl` (stavefejl i brand-ordet), 17 modelnavne med farvenavne efter modellen (Triumph, Royal Enfield). Ingen er sikre nok til en klientregel; se afsnit 7.

## 4. "Kan nye mærker tilføjes med én registerpost?" — bevist
`scripts/v7-maerke-ende-til-ende.test.js` test 3 injicerer **én** post i en kopi af `js/brands-registry.js` (`['Testmaerke X','SE','aktuel',['tmx','test maerke'],['wp']]`) og viser, uden anden kodeændring: `normalise` (alias og slug), valgbar i opret-annonce, `fraSlug`, `fraTekst`, `validerFriMaerke` = registreret, nævnt under "Flere mærker" (`opgoer`), **ingen side uden annoncer** (`sideRegel(0).side = false`), side men noindex ved 1 annonce, indekserbar ved 5, filter (`maerkeListe`, `brands`, fritekst på alias), logo-fallback (monogram, `harLogo=false`). Og: uden posten bliver samme navn IKKE et mærke (`Ukendt`) — mærker oprettes aldrig automatisk. (Efter en ny post: `node scripts/maerke-register-gen.js` kopierer registret ind i `js/data.js`; gaten fanger en glemt kopi.)
Alle 105 registrerede mærker kan bruges overalt (test 2: bro-annonce, mærkefilter, fritekst på navn og HVERT alias, mærkeliste, slug, logomarkup, valgbar i opret-annonce). Mærker uden annoncer: valgbare, nævnt under Flere mærker (aktuelle/historiske hver for sig), ingen tom side; mærker uden belæg (Daelim, Super Soco, TM Racing) er gyldige men ikke offentligt nævnt.

## 5. Honda som monogram i filteret: vurderet, bevidst ikke ændret
Filterets mærkekolonne (`sm`) er 64 px; Honda-ordmærket er 8,2:1 og bliver 7,8 px højt, under kernens læsbarhedsgrænse 9,5 px, så det er monogram (som Royal Enfield, Rieju og Fantic). Prototype (kun i browseren, ikke committet): panel 300 px og kolonne 80 px (= `az`-slotten) giver et læsbart Honda-ordmærke OG plads til "Harley-Davidson" (`efter-honda-forslag-300px-1440-lys.png`). Ved uændret panel (280 px, 246 px indre) med kolonne 80 px brydes "Harley-Davidson" til to linjer (`efter-honda-forslag-280px-brydning-1440-lys.png`). Der findes intet Honda-emblem i `img/brands` (og der hentes intet).
**Hvorfor ikke gennemført:** opgaven kræver "uden layoutskift og uden at bryde V5/V6-tests". 300 px flytter hele resultatgitteret (cirka 20 px smallere kort fra 960 px), og `scripts/v6-logo-officielle.test.js`, `scripts/w13-logo-kerne.test.js` og `scripts/w13-logo-layout.test.js` låser udtrykkeligt `SLOT.sm = 64`, `.bl-spalte--sm{width:64px}`, `MIN_HOEJDE = 9.5` og "præcis fantic, honda, rieju, royal-enfield er monogram i sm". **Anbefaling til ejeren (kræver et valg):** filterpanel 300 px + `sm` 80 px; ændringen er tre CSS-/kernetal og fire testtal (de nævnte), ingen markup. Alternativ uden layoutskift: lad Honda fortsat være monogram (nu en ærlig, kendt begrænsning).

## 6. Filer og tests

**Ændrede produktionsfiler:** `js/data.js` (slut-regel i `erEfterspoergsel`), `js/backend-bridge.js` (`rensModelStoej`, `efterStoej`, `fjernKategoriOrd`), `js/filtrering.js` (frase først), `js/search.js` (`byggSoegeforslag`), `css/p-soegning.css` (1 regel), `scripts/kritisk-manifest.json` (regenereret).
**Nye tests (Orchestrator skal tilføje til `package.json` "test"):**
- `js/v7-maerke-model.test.js` (6)
- `js/v7-maerke-efterspoergsel.test.js` (6)
- `js/v7-maerke-soegning.test.js` (7)
- `scripts/v7-maerke-ende-til-ende.test.js` (5)
- `js/v7-maerke-browser.test.js` (8, Playwright; springes over uden)
**Fixtures:** `scripts/fixtures/v7-lager-maerke.json` (hele lageret, 735 rækker), `scripts/fixtures/v7-modelnavne-rigtige.json` (100 modelnavne).
**Ændrede tests/fixtures:** `js/data-kvalitet.test.js` (F-009: "BSA / Triumph / Norton købes" flyttet fra salg til efterspørgsel; de gamle falske positiver er stadig negative); `scripts/fixtures/v4-lager-maerker.json` + `js/v4-soegning-maerker.test.js` (fixturens eneste "Uoplyst mærke"-række var "moto cross købes", som nu med rette er ude af lageret; rækken er nu et salg uden mærke, "crosser"; `js/v4-soegning-ui.test.js` og de øvrige v4/v5-søgetests er uændrede og grønne).

**Kørsel (alle på branchen, mod hele lageret):**
- Byg: `node scripts/build.js` -> `node scripts/kritisk-gen.js` -> `node scripts/build.js` (exit 0; kritisk-manifest regenereret og committet; genererede sider er IKKE committet, Orchestrator bygger efter merge; målt effekt i byg: BSA 8 -> 7, oversigten 720 -> 718, noten "1 annonce har intet mærke" er væk).
- `npm test` 3 gange (1785 tests inkl. de nye 32 uden for listen kørt for sig): 1782-1783 grønne; de eneste røde var (a) `scripts/w13-logo-generator.test.js` "A11/A15 kopien rørte ikke repoet" fordi mit byg lod genererede sider stå i træet (grøn på ren træ, kørt bagefter: 8/8) og (b) ét enkelt CLS-flake i `V6 login` (run 1, grøn i run 2 og 3).
- Smoke strikt (`--sider soegning,maerker,opret-annonce,index,maerke-honda,maerke-bsa --viewports 320,390,768,1024,1440 --temaer lys,mørk --cls 0.05`): 0 fejl i 4 af 7 fulde kørsler; de øvrige 3 havde præcis ÉN fejl, `maerke-honda.html` 320 px CLS 0,053 (> 0,05). **Samme fejl, samme tal, optræder på baseline `e7232df3`** (2 af 7 fulde kørsler, urørt repo): en belastningsafhængig, allerede eksisterende flake, ikke en regression (maerke-honda alene: 12/12 rene på både baseline og branch).

## 7. Forslag til crawler/DB (må ikke ændres af mig; ikke implementeret)
1. **Skip efterspørgsel i crawleren** (`crawler/parse.js`/`run.js`): kald den samme regel som klienten (`erEfterspoergsel`, flyt til en delt fil) og gem ikke rækken som `status = 'aktiv'`. Enten ikke upsert, eller `status = 'efterspoergsel'` (samme tilstand som "borte"-tjek bruger, så rækken ikke tæller i lageret, men id'et består). Fordel: ingen klient-filter nødvendig og færre rækker hentet (2 af 735).
2. **Generér `MAERKE_ALIAS` ud fra registret** i stedet for den håndskrevne tabel i `crawler/normalize.js`: et lille script `scripts/maerke-register-gen.js --crawler` kan skrive `crawler/maerke-alias.generated.js` (navn + aliaser, noegle()-nøgler). Så gemmer crawleren kanonisk `maerke` (Bsa -> BSA, "Honda Motor" -> Honda ...). 46 af 105 registermærker har i dag mindst ét alias, crawleren Title-Caser.
3. **Spejl `rensModelStoej`-udvidelserne i `crawler/normalize.js`** (samme funktion, samme tests, `crawler/model-stoej.test.js`), så støjen ikke engang når databasen. Tilføj også: farver efter modelnummeret pr. mærke (Triumph/Royal Enfield) som en kuraterer liste, og brand-stavefejl som første ord i modellen (afstand 1 til mærket, mærke >= 6 bogstaver: "Zusuki").
4. **DB (valgfrit):** en kolonne `eksterne_annoncer.er_efterspoergsel boolean default false` (eller status-værdien ovenfor) + `check` så klienten kan stole på den; ingen dataændring nødvendig.
5. **Opret-annonce, "Andet mærke":** hvis teksten er et kendt modelnavn ("CB 500", "Rebel"), vis en rolig hjælpetekst ("Det ligner modellen: vælg mærket Honda og skriv modellen i feltet Model"). Ikke gjort her: `js/opret-annonce.js` ejes af opret-sporet.

## 8. Dimensionsskema (ærligt; en uafhængig Critic dømmer)

| Dimension | Søgning / filter | Mærkesider / oversigt | Annonce | Opret annonce (mærkevalg) |
|---|---|---|---|---|
| Visuel kvalitet | 7: uændret layout; ingen pil ved ryd-knappen; Honda stadig monogram | 7: uændret | 7: uændret | 7: uændret |
| Designkonsistens | 7: forslag er native datalist som forsiden | 7 | 7 | 7 |
| Funktionalitet | 8: ingen støjmodeller (24 -> 0), `cb 650 r` finder kun CB 650 R, forslag uden blindgyder, ingen efterspørgsel i lageret | 8: BSA 7, ingen "uden mærke"-note, 0 mærkeskift, 0 runner-fejl | 7: efterspørgsel via direkte link vises som almindelig annonce (F6) | 8: 105 mærker + Andet mærke, ingen blokering |
| Brugeroplevelse | 8: søgeforslag, stavemåder (gl1800, cb650r) giver samme træf | 8 | 7 | 7: model-som-mærke giver ingen hjælpetekst endnu |
| Mobil | 8: 375/430 uden sidescroll; filterskuffen; toast dækker sammenlign-bjælke (F7) | 8: 375/430 uden sidescroll | 8 | uændret |
| Performance | 8: `byggSoegeforslag` efter første maling (432 `<option>`, ingen CLS, ingen netværk); `search.js` +0,7 KB gzip | 8: uændret | 8 | 8 |
| Indholdskvalitet | 8: modelfilteret er rent; 17 farvenavne + enkelte stavefejl tilbage (F8) | 8: tallene følger lageret, ingen forkert mærke | 7 | 8 |

Mockup-fidelitet: ikke berørt (ingen visuelle ændringer ud over en skjult browserpil); mærkeoversigten og søgesiden står som i V6.
