# V6 Builder: annonceside, favoritter og søgekort (marked)

Branch `gauntlet/v6-marked`. Mockups: `Annonce.png`, `Motorcykler til salg.png`. Kilde: V5-Critic `docs/review/gauntlet/v5/critic-samlet.md` (P2-2, P2-3, P2-5, P3-1, P3-2, "Annonce 5,0/10").
Alt er målt mod lokal mock (ingen produktion, ingen skrivning; supabase-kaldene tælles i testene og er 0). Skærmbilleder: `docs/review/gauntlet/v6/marked/` (`foer-*` = HEAD c84fa409 / V5, `efter-*` = denne branch).
Metode (Gauntlet Loop): mål før, find rod-årsagen, ret, mål efter, lås med en test, der FEJLER mod før-versionen (`V6_ROD=<kopi af c84fa409>`), og kør den mod efter-versionen.
Måleværktøjer (nye): `scripts/v6-marked-shots.js` (skærmbilleder, også mod en anden kopi via `--v6-rod`), `scripts/v6-kort-hoejde.js` (kortenes højde på søge-lagerets mock).

## 1. P2-3: brede ordmærker æder titelbredden (annonceside)
**Rod-årsag.** Honda-ordmærket har forholdet 8,2:1; xl-slotten (`css/p-brand-logo.css`) giver `min(160 px, 64 · 8,2, 84,9 · √8,2)` = 160 px bredt og kun ca. 20 px højt. Det står højrestillet ved siden af H1 og tager 160 af kolonnens ca. 420 px, så "Honda CB 1000 R" brydes med "R" alene (1440), og i den smalle tablet-kolonne (ca. 296 px ved 768) ombrydes længere titler til tre linjer ("Royal Enfield / Interceptor / 650").
**Rettelse (`css/p-annonce.css`, `js/annonce.js`).**
- Maks.-bredde-loft på logoet i titelrækken: 120 px (>= 1180 px), 104 px under. Kun BREDDEN begrænses (`--bl-maxw` i `.an-maerkelogo .bl--xl`); højde- og arealgrænsen i logokernen er uændret, så smalle emblemer (Triumph) ikke berøres.
- Et BREDT ordmærke (forhold > 3: Honda, KTM, Royal Enfield, Husqvarna, Fantic, Rieju, Keeway ...; `an-titelraekke--bred`, sat i `anFlytH1`) står alene i en række OVER titlen under 1180 px, så H1 får hele bredden. Fra 1180 px står det til højre som før.
- `text-wrap:balance` på H1: ingen enlige ord på sidste linje.
**Måling (Honda CB 1000 R, 1440):** H1 262 px bred og to linjer med "R" alene -> 294 px og én linje. Royal Enfield 768: tre linjer med "650" alene -> logoet over, titel på to balancerede linjer. 375: logoet 120 px over titlen, H1 hele rækkens bredde.
Skærmbilleder: `foer-ann-{honda,re,husq}-{375,768,1440}-lys.png`, `efter-ann-...`.
**Test:** `js/v6-marked-annonce.test.js` (P2-3, 3 viewports x Honda/KTM/Royal Enfield/Husqvarna: logo <= 120 px, ingen enlige ord målt med Range-rektangler pr. ord, logoet over titlen under 1180, ingen overlap fra 1180). Fejler mod før-versionen.
**Ændret ældre test (begrundelse):** `js/w13-integration.test.js` (ikke min, men den låste det gamle mål): to antagelser om logoets mål (`slotMaal('xl')` uden loft, `<= 160 px`) er nu `min(slot, 120)`, og konstanten for H1-bredde er hævet fra 240 til 290 (h1 er nu ca. 294 px, før 262). Opgaven nævnte konstanten `240` i "scripts/v5-logo-officielle.test.js": den står faktisk i `js/w13-integration.test.js` (linje 121); jeg har ændret den og de to loft-antagelser, intet andet.

## 2. P2-2: "Andet mærke"-brødkrumme (blindgyde)
**Rod-årsag.** Brødkrummen linkede altid `soegning.html?brands=<mærke>`. `?brands=` kender kun registrerede mærker (med vilje, mod SEO-spam), så en sælgers fritekst ("Fantasi Motors") gav "Ingen motorcykler", mens `?q=` finder annoncen. (Indekserede annoncer får "Ukendt" i backend-broen; kun EGNE annoncer bærer fritekst-mærket.)
**Rettelse.** `anMaerkeKendt()` (`BrandRegistry.erKendt`) i `js/annonce.js`: ukendt mærke = ren tekst (`<span class="bc-plain">`), intet mærke- og modellink i brødkrummen, ingen led i `BreadcrumbList` (strukturerede data), og "Se alle lignende" peger på `soegning.html` i stedet for `?brands=`. Samme regel i den statiske forrendering (`scripts/build-listing-pages.js`: markup og JSON-LD, 3 led i stedet for 5). Registrerede mærker er uændrede (5 led, links). Stil: `.bc-plain` (dæmpet farve, ingen hover).
**Test:** `js/v6-marked-annonce.test.js` (P2-2: 375 og 1440 med en egen annonce med mærket "Fantasi Motors": ingen `?brands=`, ren tekst, "Søg videre" uden fritekst-link; `?q=fantasi` finder stadig annoncen; registreret mærke har sine links; statisk markup og JSON-LD). 2 af 5 fejler mod før-versionen (den statiske kører altid mod ny kode).

## 3. P2-5: anonym "Gemte annoncer" mod header-tæller
**Rod-årsag.** Header-tælleren (`Store.getAllFavorites()`) tæller også egne uuid-favoritter af private sælgere, som en anonym ikke kan hente (de kræver en konto); fanen viste "Ingen gemte annoncer" over en note om det samme.
**Rettelse (`js/mine-annoncer.js`, kun favoritfanen).** Tallene på siden (`stat-fav`, `fav-count-inline`) er nu SAMME tal som headerens (viste + dem der kræver login). Er der intet at vise, men N gemte kræver login, står der "N gemte annoncer kræver login" / "Annoncerne er fra private sælgere og gemmes på din konto. Log ind for at se dem." og knappen "Log ind" (med redirect tilbage) i stedet for "Ingen gemte annoncer" + "Søg motorcykler"; noten gentager ikke det. Er der også viste kort (1 indekseret + 1 egen), viser fanen kortet, tallet 2 og noten "1 gemt annonce fra private sælgere ... De vises, når du er logget ind". Intet hentes eller skrives til databasen, intet ryddes. Uden favoritter, og logget ind, er alt som før.
**Test:** `js/v6-marked-favoritter.test.js` (375 og 1440: 1 ekstern + 1 uuid: header 2, 1 kort, tal 2, note; kun uuid: 1 og 2 "gemt/gemte annonce(r) kræver login" + login-knap; ingen favoritter: uændret tomtilstand; fjern den sidste indekserede: skifter til "1 gemt annonce kræver login"; 0 skrivende kald). 4 af 5 fejler mod før-versionen.
**Ændret ældre test:** `js/v5-saelger.test.js` ("anonym med egne (uuid) favoritter") låste den gamle note-over-tom-tilstand; ser nu på `#fav-empty h3`. Resten af testen (ikke ryddet, ingen skrivning) uændret.

## 4. P3-1: søgekortene (ca. 18 % højere end før V5)
**Fund, målt** (`scripts/v6-kort-hoejde.js`, mock-lager, gennemsnit af 24 gitterkort; V4 = `cbbb411f`, V5 = `c84fa409`):
| bredde | V4 | V5 (før V6) | V6 |
|---|---|---|---|
| 1440 (4 spalter) | 210,2 | 309,5 | **294,7** (-4,8 % mod V5) |
| 768 (3 spalter) | 230,5 | 303,2 | 303,2 (uændret) |
| 375 (2 spalter) | 325,4 | 325,4 | **318,4** (-2,2 %) |
Hvor kom højden fra (1440, 209 -> 310 px): fotoet 111 -> 161 px (+50: 16:10 i stedet for 2,3:1; Criticen bad om det i V4, og `v5-soegning-cls`/`w14-soegning` låser forholdet 1,6 +/- 0,03, så **3:2 er ikke valgt**); kroppen 96 -> 147 px (+50), heraf foden 17 -> 36 px (+19; en 40 px slot, så sammenlign-knappen kunne bo i bunden) og resten titel to linjer (21 % af kortene), chip-række der ombrydes og luft.
**Rettelser (`css/p-soegning.css`, `js/search.js`).**
- Sammenlign-knappen står PÅ fotoet (nederst til højre, 40 x 40) fra alle bredder, som på telefon. Før lå den i en 40 px fodslot fra 760 px, og `js/search.js` flyttede den dertil ved indtegningen (`appendChild`), så et resize 1440 -> 375 efterlod den i foden. Foden er igen kun tekstlinjen (17 px), og `padding-right:34px` til knappen er væk, så kildenavne kan stå uden ellipse. Typefoto-label og "Ingen fotos" holder allerede 52 px fri i højre side.
- Skilletegnene i spec-linjen ("1978 | 17.100 km | Touring") er tættere i de smalle kort (5 px luft på hver side af stregen, i alt 11 px mod 17): flere linjer står på én linje.
- **Prøvet og kasseret:** at fjerne den reserverede to-linjers plads til kildenavnet i den stakkede fod (-15 px ved 375/768): `w11-kort`/`w12-kort2` låser "ens fodhøjde" i alle kort (et bevidst valg: Criticen klagede over tekst, der starter i forskellig højde). Titel + pris på samme linje også for lange titler: afvist, `v5-soegning-cls` "titler" kræver op til 40 tegn uden klip.
**Ærligt:** de 18 % kommer overvejende fra det højere foto (+50 px), som er et bevidst valg; kroppen kunne strammes ca. 5 %. Det er ikke "som før V5".
**Test:** `js/v6-marked-kort.test.js` (gennemsnitshøjde pr. bredde; knappen i fotoet, >= 40 x 40, rammer ikke hjerte/mærkat/label ved 375/430/768/1024/1440/1920 lys+mørk; resize-test). **Alle V5-testene bestået:** `v5-kort-bund` (knappen dækker intet, >= 40 px, 25 tests), `v5-favoritter`, `v5-skyder`, `v5-soegning-cls` (192 CLS-målinger). `js/w14-soegning.test.js` ("sammenlign i kortets fod", `samIFoto == 0`) er ændret til "på fotoet": den låste netop den placering, der blev flyttet.

## 5. P3-2: monogram og logo i filteret
Før: en lille orange-tonet cirkel (22 px) mellem tegnede/farvede logoer (og i mørk tilstand mellem LYSE fliser). Nu (`css/p-soegning.css`, kun `.so-layout .bl-spalte .bl-mono`): neutral flade (`--color-surface-2`, mørk tekst, 1 px kant) i lys tilstand; i mørk tilstand samme lyse flise (`--color-fg`, 3 px luft) som de officielle logoer, med mørk tekst. 22 px som før, kontrast >= 4,5:1 (målt). Test i `js/v6-marked-kort.test.js` (lys/mørk: ikke den orange tone, 22 px, kontrast, mørk: samme flisefarve som logoerne). Skærmbilleder: `foer-filter-{light,dark}.png`, `efter-filter-{light,dark}.png`.
**Ønsker til logo-agenten (BrandLogos-kernen, ikke rørt af mig):** (a) Honda står som monogram i filterets `sm`-slot (22 x 56), selvom en officiel fil findes (8:1 giver ca. 7 px højde, ulæseligt): kernen bør beholde monogrammet dér, men give det samme neutrale stil som ovenfor som standard (`--bl-mono-bg`/`--bl-mono-fg`), så alle lister (A-Z på mærkesiden, forsidens fliser) blander ens; (b) en `bl--mono`-variant i mørk tilstand med samme lyse flise som `.bl--img`, så fliserne er ens uanset logo/monogram; (c) en `sm`-størrelse for brede ordmærker (min. 11 px højde), så Honda/Husqvarna/Fantic ikke falder til monogram.

## 6. Annoncesiden mod Annonce.png (Critic 5,0/10)
Udgangspunkt: `foer/ekstern-{375,1440}-lys.png`, `foer/intern-...` (V4-skærmbillederne er gentaget mod V5-HEAD). Strukturen (tre kolonner, panelkort, sticky sidepanel) er allerede tæt på billedet (V4); forskellen er hierarki, tæthed og indhold, som ikke findes.
**Forskelsliste (nummereret; 1440 og 375).**
| # | Mockup | Nu (før V6) | Handling |
|---|---|---|---|
| 1 | 1440: fotokort med tæller "1 / 14", pile, 6 miniaturer og "+10" | Ét foto, pille "Foto: MC Syd - flere billeder i deres annonce" (ca. 330 px) | **Ikke gjort (kan ikke):** eksterne annoncer har ét thumbnail (regel 2: ingen billedgallerier). Intet opdigtet tællerbånd |
| 2 | 1440: kompakt tæller-pille øverst til venstre | 330 px lang tekstpille over fotoet | **Gjort:** "Foto: MC Syd"; resten står for skærmlæsere og i knappens titel/aria-label ("Flere billeder hos MC Syd") |
| 3 | 1440: H1 + logo i én række, titlen på 1-2 rene linjer | Honda-ordmærket (160 px) æder titlen, "R" alene | **Gjort (P2-3)**, se afsnit 1 |
| 4 | 375: logo/titel | Samme problem; ordmærket klemte H1 til 3 linjer | **Gjort:** ordmærket over titlen |
| 5 | 1440: "Se finansieringsforslag", "Se på kort", stjerner/anmeldelser, "Typisk svartid", "Ring op"/"Send besked", grøn "Kontakt forhandler" | "Gå til annonce hos X" + "Alle fra X"/"Kopiér link" | **Bevidst ikke:** opdigtet eller forbudt (ingen anmeldelser, svartid, telefon, finansiering på eksterne annoncer). "Se på kort" ville kræve valg af korttjeneste (privatliv): ikke bygget |
| 6 | 1440: "Det bør du tjekke" som grønt kort med motorcykel i ca. 40 % af bredden | Fuldbredt bånd, foto halvdelen (220 px højt) | **Delvist:** foto ca. 36 % og 190 px (test: <= 40 % og <= 200 px). Kortets placering (højre kolonne ved siden af kørekortkortet) ikke flyttet: ville bryde kolonnebalancen (`w14-annonce`, højst 100 px) |
| 7 | 1440: "Lignende" som slanke kort (foto, titel, år/km/type, pris) | 340 px høje: kørekort + kubik-chips og to fodlinjer (sted, kilde) | **Delvist:** sted fjernet i stribens kort (billedets række har det ikke), kilden bliver (ærlighed: "kilde står på hvert kort") uden reserveret to-linjers plads: ca. 340 -> 305 px. Kørekortchippen bevaret bevidst |
| 8 | 1440: beskrivelse som rig tekst + grøn ✓-liste (udstyr) | Ærlig note: kildens tekst gemmes ikke | **Ikke gjort (kan ikke):** regel 2 (ingen annoncetekst). Egne annoncer har udstyrslisten allerede |
| 9 | 1440: nøgletalsrække med 5 (km, årgang, motor, gear, brændstof) | 4 (km, årgang, motor, effekt); gear/brændstof findes ikke i kildedata | **Uændret** (egne annoncer viser brændstof, V4) |
| 10 | 1440: faktatabel i to kolonner med større ikoner | To kolonner, grå rækkeblokke | **Uændret på desktop** (rækkehøjden bestemmer kolonnebalancen) |
| 11 | 375: kompakt faktaliste | 10 rækker x 36,8 px = 427 px | **Gjort:** 10 x 32,8 px = 367 px (-60 px) |
| 12 | 375: kørekortkortets A-badge til højre for teksten | Badgen står under teksten (smal kolonne) | Uændret (teksten bryder ellers) |
| 13 | Primærfarve grøn, blå kørekortflade, hvid baggrund | Orange/varm | **Ikke rørt** (identitet, hører til designsystemet, ikke til annoncesiden alene) |
| 14 | Header: "Viden", grøn "Opret annonce" | Sitets egen | Global fil, ikke min |
**Resultat:** de synlige ting, der kan gøres uden opdigtet indhold, er lavet (2, 3, 4, 6, 7, 11). Det, der afgør "ligner mockuppen" (grøn identitet, rytter-/motorcykelfotos, galleri, anmeldelser, telefon), er enten forbudt af reglerne eller en designsystembeslutning. Min ærlige score for annoncesiden mod billedet: **5,5/10** (før 5,0; Critic dømmer).
Tests: `js/v6-marked-annonce.test.js` (pille, tjekbånd, stribe, faktarækker).

## 7. Verifikation
- `node --check` på alle ændrede js (annonce, search, mine-annoncer, build-listing-pages, de nye scripts og tests): OK.
- Byggekæde `node scripts/build.js` -> `node scripts/kritisk-gen.js` -> `node scripts/build.js`: kørt (kritisk-manifest regenereret: 5255 regler). **De genererede filer (html, sitemap, llms.txt, kritisk-manifest) er IKKE committet** (fælles/genereret; Orchestrator bygger efter merge). `scripts/w12-kritisk.test.js` kræver den samme kæde efter merge, fordi `css/p-annonce.css` og `css/p-soegning.css` er ændret.
- Relevante tests, tre kørsler i træk (38 testfiler, 436 tests: alle mine nye + `v5-kort-bund`, `v5-favoritter`, `v5-skyder`, `v5-soegning-cls`, `v5-saelger`, `w14-soegning`, `w12-kort2`, `w11-kort`, `w14-annonce`, `v4-annonce`, `w13-integration`, `annonce-statisk`, `w12-kritisk`, `rigt-kort`, `annoncekort`, `eksternt-kort`, `v2-soegning`, `mine-annoncer`, `dashboard`, `w9-saelger`, `w5-annonce`, `favoritter`, `w13-logo-layout`, `v5-logo-officielle`, `facet-intro-cls` m.fl.): **434/436, 435/436 (0 fejl), 434/436**. Den ene fejl i kørsel 1 og 3 er den kendte `scripts/facet-intro-cls.test.js` (V5-Critic P2-4b: CLS-grænsen 0,05 rammes under CPU-last; maskinen kørte samtidig en anden builders test-suite). Alene bestod den 4 af 5 gange (en fejl "smoke CLS-fejl" under last) og rammer facetsiderne, som mine ændringer ikke berører (stilene er afgrænset til `#results-grid` og annoncesiden).
- `node scripts/smoke-browser.js --sider "annonce,annonce-*,soegning,mine-annoncer" --viewports 320,390,768,1024,1440 --temaer lys,mørk --cls 0.05 --strikt`: **0 fejl, 0 advarsler, to gange** (50 målinger pr. kørsel). Søgesidens 192-målings-matrix (12 dybe links x 4 bredder x lys/mørk x kold/varm) ligger i `js/v5-soegning-cls.test.js` og var grøn i alle tre kørsler.
- Nye tests bevist mod før-versionen (`V6_ROD` = `git archive c84fa409`): P2-2 (2 af 5), P2-3 (3 af 3), P2-5 (4 af 5), kortene (13 af 18: højde 375/1440, sammenlign i foto ved 768/1024/1440/1920, resize, monogram lys/mørk), annonce (pille, tjekbånd, stribe: 3 af 4) fejler før og består efter.

## 8. Skærmbilleder
`docs/review/gauntlet/v6/marked/shots/{foer,efter}-{ann-honda,ann-bmw,soeg}-{375,430,768,1440,1920}-{lys,moerk}.jpg` (de første 1500 px; 375/430/768/1440/1920, lys og mørk) og `{foer,efter}-fav-anon[-egen]-{375,1440}-lys.jpg` (anonym favoritfane: 1 indekseret + 1 egen / kun egen). Top-level PNG: `foer-ann-{honda,re,husq}-{375,768,1440}-lys.png` (P2-3 før), `foer-/efter-filter-{light,dark}.png` (monogram), `foer-soeg-{375,1440}-lys.png`. Genskab: `node scripts/v6-marked-shots.js --ud <mappe> --navn efter --jpg --klip 1500 --sider ann-honda,soeg --viewports 375,1440 [--v6-rod <kopi af før-versionen>]`.

## 9. Selvvurdering (7 dimensioner, 1-10; Critic dømmer)
| | Annonce (desktop) | Annonce (mobil) | Søgekort/-side | Favoritfane |
|---|---|---|---|---|
| Visuel kvalitet | 6,5 (ren titelrække, kompakt pille; stadig orange, ét foto, ingen galleri) | 6,5 | 7 (sammenlign på fotoet som på telefon, foden luftig) | 7 |
| Designkonsistens | 7 | 7 | 8 (sammenlign samme sted ved alle bredder, monogram ens med logoer) | 7 |
| Funktionalitet | 8 (ingen blindgyde i brødkrummen) | 8 | 9 (resize-fejlen med flyttet knap er væk) | 8 |
| Brugeroplevelse | 7 | 7 (ordmærket over titlen, faktaliste 60 px kortere) | 7 (kortene kun 2-5 % lavere, ikke "som før V5") | 8 (tal og tekst siger det samme) |
| Mobil | – | 7 | 7 | 8 |
| Performance | 9 (ingen nye kald; smoke CLS 0) | 9 | 9 | 9 |
| Indholdskvalitet | 7 (ærlig, tynd: regel 2) | 7 | 8 | 8 |
Mockup "Annonce": **5,5/10** (Critic V5: 5,0). Mockup "Motorcykler til salg": uændret ca. 6,5 (kortene lidt lavere, men hero/rytterfoto findes ikke).

## 10. Restpunkter
- Kortene er stadig 15-50 px højere end V4: fotoet (16:10, låst af to V5-tests) er det meste; at gå til 3:2 kræver, at testene `v5-soegning-cls` og `w14-soegning` ændres (min anbefaling: nej).
- Logo-agenten: se afsnit 5 (a)-(c).
- `package.json` "test": tilføj `js/v6-marked-annonce.test.js js/v6-marked-favoritter.test.js js/v6-marked-kort.test.js`.
- "Se på kort" (mockup) kræver et valg af korttjeneste (privatliv/CSP): ikke bygget.
- WebKit/Firefox er ikke kørt (kun Chromium).

## 11. Nye og ændrede testfiler
Nye (Orchestrator føjer dem til `package.json` "test"): `js/v6-marked-annonce.test.js`, `js/v6-marked-favoritter.test.js`, `js/v6-marked-kort.test.js`. Ændrede eksisterende, med begrundelse ovenfor: `js/w13-integration.test.js` (loft 120 px + konstant 240 -> 290), `js/v5-saelger.test.js` (anonym tomtilstand), `js/w14-soegning.test.js` (sammenlign på fotoet). Nye scripts: `scripts/v6-marked-shots.js`, `scripts/v6-kort-hoejde.js`.

## 12. Efter merge af gauntlet/master (logo-agentens officielle logoer, konto-agentens smoke)
Seks røde tests i fuld `npm test`; rod-årsager:
1. `js/v5-soegning-cls.test.js` (CLS på dybe links): består 3 af 3 kørsler alene og 3 af 3 under fuld last (192 målinger, værste CLS 0,0095, 0 fejl, 0 transient). Fejlen i den store kørsel er belastningsafhængig (testen tager ca. 118 s alene, grænsen er 420 s, og suiten kører mange Chromium samtidig), ikke et layoutskifte: ingen adresse/bredde ligger over 0,0095 efter logo-ændringerne. Ikke ændret.
2-3. `P2-3 375/768` (`js/v6-marked-annonce.test.js`): KTM har nu forholdet 2,55 (var 3,06) og regelen "bred = forhold > 3" placerer det korrekt ved siden af titlen; testen krævede fejlagtigt, at alle fire mærker stod over titlen. Testen følger nu `BrandLogos` (kun brede mærker stables) og dækker otte mærker: Honda, KTM, Royal Enfield, Husqvarna og de nu officielle Yamaha (4,35), BMW (4,69), Suzuki (5,14), Kawasaki (5,61). Ingen enlige ord og loft 120 px ved 375/768/1440 for alle otte.
4. `annonce: ingen dubleret eller mistet logo efter resize` (`js/w13-integration.test.js`): Yamaha er nu et bredt logo (min(120 px, arealgrænsen k) bredt, over titlen under 1180 px). Testens forventning er regnet fra `BrandLogos` og loftet (120 px; 93,8 px på mobil, hvor arealgrænsen bider), og "til højre for h1" gælder kun fra 1180 px.
5. `w14-annonce` kolonnebunde: det lave Kawasaki-ordmærke (21 px) gjorde titelrækken ca. 20 px lavere end det tidligere emblem, og midterkolonnen tilsvarende kortere (spredning 124 px). Rettelse i roden: `.an-titelraekke{min-height:64px; align-items:center}` fra 1180 px (xl-slottens højde), så rytmen ikke afhænger af logoets form. Spredning nu 97 px (grænse 100, før merge 95), alle eksterne 16-90 px.
6. Filter-monogram: logo-agentens `.bl-spalte .bl-mono` (css/p-brand-logo.css) er nu ENESTE kilde til lys tilstand (grå flade, dæmpet bogstav, kant, 22 px). Min regel i `css/p-soegning.css` er skåret ned til det, kernen ikke har: den lyse flise med mørk tekst i mørk tilstand (samme flise som de officielle logoer). Testen kræver stadig neutral, 22 px og lys flise i mørk.
Verifikation: 38 testfiler + `v6-konto-*`, `v6-cookie`, `v6-logo-officielle`, `w13-integration` (494 tests) tre gange: 492/494 (kun logo-agentens "afgrænsning"-test, fordi `css/p-annonce.css` endnu ikke var committet i den kørsel; borte efter commit), 493/494 og 493/494 (1 skippet). Smoke strikt (`annonce`, `annonce-*`, `soegning`, `maerker`; 375/430/768/1440/1920, lys og mørk): 0 fejl, 0 advarsler, to gange. Byggekæden er kørt (genererede filer ikke committet).
