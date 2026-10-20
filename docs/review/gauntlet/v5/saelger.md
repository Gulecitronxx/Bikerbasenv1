# V5 Builder: sælger-, konto- og guidesider

Branch `gauntlet/v5-saelger`, udgangspunkt `cbbb411f` (V4 critic-rapport). Mockups: `Opret annonce.png`, `Login eller oper profil.png`, `Mine annoncer.png`, `Artikel.png`. Kilde til udgangspunktet: V4-Critic (`docs/review/gauntlet/v4/critic-samlet.md`): login, mine annoncer, opret og guide var byte-identiske med forrige version i V4 og scorede 5,5-6,5/10 mod mockuppen.

## 1. Metode

- Lokal server på worktree + Playwright (Chromium). Backend: kun `scripts/w9-saelger-mock.js` (alle `*.supabase.co`-kald besvares lokalt, alt andet blokeres). Ingen produktion, ingen rigtige konti. Mocken er udvidet med to valgfrie hjælpere til skærmbilleder/test (`saves`, `stortFoto`); ingen ændring af eksisterende adfærd.
- Skærmbilledværktøj: `work/v5-skaerm.js` (`node work/v5-skaerm.js <mappe> --vp 375,1440 --tema lys,moerk --sider opret,login,mine-rig,mine-tom,guide,guides --jpg`). `V5_ROD=<mappe>` peger den mod en `git archive HEAD` for rigtige før-billeder.
- Før: `docs/review/gauntlet/v5/saelger/foer/` (HEAD, 375/768/1440, lys+mørk, 6 sider = 36 billeder). Efter: `.../efter/` (375/430/768/1440/1920, lys+mørk, 6 sider = 60 billeder). `mine-rig` = mock med fotos, statistik (visninger/favoritter/telefonvisninger), en pauset og en solgt annonce; `mine-tom` = tomt lager. Alle tal i billederne er syntetiske mock-data.
- Metode pr. familie: se mockup, nummereret forskelsliste, implementér det mest synlige som komponent-/layoutændring, nyt billede, funktionel test, test låst i `js/v5-saelger.test.js`. To iterationer: (1) fund fra billeder og kode, (2) fund fra den første rettelsesrunde (se afsnit 3: dashboard-rækkerne, "Læs også", mærkbarhed ved 1920).

## 2. Forskelslister mod mockuppen

Status: **GJORT** = implementeret i V5. **ASSET** = kræver foto/skrift, der ikke findes i repoet (ingen download). **IKKE ÆRLIGT** = ville kræve opdigtet indhold/funktion (CLAUDE.md og V5-FAELLES). **DESIGNLINJE** = bevidst forskel (brandfarven er orange, ikke grøn).

### 2.1 Opret annonce (`opret-annonce.html`)

| # | Mockup | Før | Status |
|---|---|---|---|
| 1 | Hero med rytter-foto, stor to-linjers H1, to-linjers lead | Hero med motorcykel (ingen rytter), H1 på én linje | ASSET |
| 2 | Tillidsboks med tre punkter i hero | Samme tre ærlige punkter (gratis for private, du styrer selv, side om side med forhandlere) | paritet |
| 3 | Fem-trins trinbjælke i kort over bannerkanten | Fire trin (ingen "Sælgeroplysninger": navn/telefon bor på profilen); trinene var kun navigation, aldrig status | **GJORT**: et trin, man ikke står ved, får flueben, når sektionen er klar (påkrævede felter; billeder: mindst ét valgt); skærmlæsertekst "færdigt" |
| 4 | Titelfelt med tæller 0/70 og tips-boks ved siden af | Ingen titelfelt (titel udledes af mærke, model, årgang) | IKKE ÆRLIGT at tilføje et felt, der ikke bruges; tips-bånd findes |
| 5 | Mærke/Model/Årgang som dropdowns | Mærke dropdown, model/årgang tekstfelter | mærkevalget ejes af mærke-agenten; rørt ikke |
| 6 | Km/ccm/effekt/vægt/pris i række med enheder | Samme, med enheder (km, ccm, hk, kr.) | paritet (vægt findes ikke i dataene) |
| 7 | "Din annonce"-kort med foto, tæller og "Vis eksempel på fuld annonce" | Live-kort (samme kort som søgningen), ærligt mærket "Eksempel"; ingen eksempel-knap | **GJORT**: fremdriftsmåler "x af 10 påkrævede felter udfyldt" i kortet (beregnet af formularen, `role=progressbar`) |
| 8 | Billedsektion: upload-flise + fire miniaturer i én række | Samme layout (upload-flise + spøgelsesfelter før første billede) | paritet |
| 9 | Beskrivelse med fed/kursiv/liste-værktøjslinje, tips-boks | Almindeligt tekstfelt + tips-boks + "Strukturér min beskrivelse" | IKKE ÆRLIGT (rig tekst findes ikke i annoncen) |
| 10 | "Sælg trygt"-kort med fire punkter (inkl. "Vi tjekker annoncer", "nå tusindvis") | Fire ærlige punkter (navn kun for indloggede, telefon efter eget valg, side om side, EXIF fjernes) | paritet, uden opdigtede løfter |
| 11 | (mobil) | Den flydende "Se forhåndsvisning"-pille kunne dække nederste valideringsfejl og "Fortsæt"-knapperne (V3-rest) | **GJORT**: pillen skjules, mens handlingsrækken er i syne og så længe et felt har fejl (`aria-invalid`/`.felt-fejl`); `scroll-margin-bottom` på felter |
| 12 | Felttilstande og eksempler | Placeholder-eksempler blandede "F.eks. 2021" og bare tal ("12500") | forsøgt ens "F.eks. …"; **rullet tilbage**: "F.eks. 12.500" klipper i km-feltet ved 375 (V3-testen fangede det) |

### 2.2 Login / opret konto (`login.html`)

| # | Mockup | Før | Status |
|---|---|---|---|
| 1 | Log ind med Google / Facebook / Apple | Ingen sociale logins | IKKE ÆRLIGT (ikke bygget); "Fortsæt uden konto og se motorcykler" står i stedet |
| 2 | Venstre kort: H1, undertekst, e-mail, adgangskode, "Glemt", stor knap, "eller", "Har du ikke en konto?" | Samme komposition | paritet |
| 3 | Højre panel: "Gratis at oprette"-pille, H1, fire fordele med ikoncirkler, stor knap, "Allerede medlem?" | Samme, med ærlige fordele | paritet |
| 4 | Rytter-foto der løber ud af kortet, håndskrevne taglines | Motorcykel-foto, ingen taglines | ASSET (rytterfoto, håndskrift) |
| 5 | Strimmel med "120.000+ motorcykelentusiaster", "Danmarks største udvalg" | Fire ærlige punkter ("Samlet ét sted", "Kilden på hver annonce", ...) | IKKE ÆRLIGT (tal) |
| 6 | Grøn primærknap | Orange (brandfarve) | DESIGNLINJE |
| 7 | Tilstande: fejl, indlæsning, opret | Fejl som overlay nederst på kortet, langt fra feltet; "Vent…" uden signal; opret-visning gentog overskriften "Opret en konto på Bikerbasen" lige ved siden af formularens egen; felter uden ikoner i opret-formularen | **GJORT**: feltfejl står ved feltet (dansk tekst, `aria-invalid`, `aria-describedby`, fokus); knap med spinner og `aria-busy`; opret-visningen har egen overskrift/lead ("Det får du med en gratis konto"); alle opret-felter har ikon som i log ind; fejlboks med 4 px venstrekant |
| 8 | (fejl) | Tom opret-konto-formular viste **browserens engelske "Please fill out this field."-boble** (formularen manglede `novalidate`) | **GJORT**: `novalidate` + danske tjek (navn, e-mail-form, telefon, adgangskode ≥ 6) |
| 9 | Fuld-bleed foto bag kort og strimmel | Samme opbygning (foto + kort + strimmel) | paritet |

### 2.3 Mine annoncer (`mine-annoncer.html`, `dashboard.html`)

| # | Mockup | Før | Status |
|---|---|---|---|
| 1 | Hero med rytter-foto | Hero med motorcykel | ASSET |
| 2 | Faner: Oversigt, Mine annoncer, Favoritter, Beskeder, Profilindstillinger | Søgeagenter i stedet for Beskeder | IKKE ÆRLIGT (ingen beskeder findes); ved 720-1023 px blev sidste fane klippet midt i et ord ("F") → **GJORT**: samme fade som på mobil |
| 3 | Fem statkort: aktive, kladde, favoritter, annoncevisninger (+24 %), beskeder | Aktive, kladde, favoritter, på pause, søgeagenter (alle beregnet af egne data) | IKKE ÆRLIGT (ingen beskeder, ingen trend); et samlet visningskort ville ændre layout efter hydrering (CLS) |
| 4 | Række: foto med antal, titel, år/km/type, sted, pris | Samme | paritet |
| 5 | Status-badge + "Udløber om 18 dage" | Status-badge + "Oprettet for 3 dage siden" | IKKE ÆRLIGT (annoncer har ingen udløbsdato i databasen) |
| 6 | Tre tællere (visninger, favoritter, beskeder) som egen kolonne | Tællerne stod **i statuskolonnen** og løb ind under "Rediger"/"Sæt på pause" ved 1440 (tredje tal skåret af) | **GJORT**: egen stribe nederst i rækken (fuld bredde, "Seneste 30 dage"); ingen tællere = den ene ærlige linje bliver i statuskolonnen; dealer-dashboardets rækker bruger samme komponent |
| 7 | Handlinger: Rediger, Sæt på pause, ⋮-menu | Samme; kolonnerne skiftede plads fra række til række (auto-bredde) | **GJORT**: fast handlingskolonne (292 px) og statuskolonne (168 px), så "Aktiv", "På pause", "Solgt" står under hinanden |
| 8 | Udløbet-række med "Forlæng" og "Slet" | "Solgt" med "Sæt til salg igen" | IKKE ÆRLIGT (ingen udløb); solgt-flowet findes |
| 9 | "Opret en ny annonce"-stribe | Samme | paritet |
| 10 | Min konto, "Sælg hurtigere", "Brug for hjælp?" | Samme (initialer, tinted tipskort) | paritet |
| 11 | (tom tilstand) | Et tomt hvidt kort med én knap | **GJORT**: tre trin (samme som opret-flowet), opret-knap og link til "Sådan sælger du din motorcykel" |
| 12 | (fokus) | Efter bekræftelsesdialog (Annuller eller gennemført) lukkede rækkemenuen, og fokus faldt til `<body>`; globalt klik-udenfor lukkede menuen, når man trykkede i dialogen | **GJORT**: dialogen er undtaget; Annuller lukker menuen og lander på ⋮-knappen; slet/solgt/pause lander på næste række, rækkens titel eller statusknap, aldrig `<body>`; Tab ud af en åben menu lukker den |
| 13 | (forhandler) | Krav-dialogens `required`-textarea viste engelsk browserboble og accepterede kun mellemrum | **GJORT**: `novalidate` + dansk fejl ved feltet |

### 2.4 Guide (`guide-*.html`, `guides.html`, `scripts/build-guides.js`)

| # | Mockup | Før | Status |
|---|---|---|---|
| 1 | Hero: rytter-foto, to-linjers H1, forfatter med foto | Hero med motorcykel, H1 på én linje, "Af Bikerbasen" med logo (ingen forfatterprofil) | ASSET / IKKE ÆRLIGT (forfatterprofil) |
| 2 | Indholdsfortegnelse i to kolonner med ikon og nummerering | Samme | paritet |
| 3 | Fem typefliser i fuld kolonnebredde med foto, tekst og "Se … motorcykler →" | Fliserne arvede brødtekstens 60ch-loft: fem fliser pressede ind på 630 px (118 px pr. flise), linket "Se adventure/enduro motorcykler" blev klippet | **GJORT**: fliserne bruger hele kolonnen (≈175 px) |
| 4 | "Kort fortalt"-kort over bannerkanten med afkrydsninger og CTA | Samme | paritet |
| 5 | Mørkt panel "Er du i tvivl om, hvad du må køre?" | Samme | paritet |
| 6 | "Populære motorcykler"-liste i højre spalte | "Oplyst effekt under A2-grænsen" (data fra lageret, ærligt forbehold) | paritet |
| 7 | Brødtekst-typografi | 60ch/17,5 px; global regel (`main p > a:only-child`) gjorde enkeltlinks til inline-block med 4 px polstring: højere linje midt i afsnit | **GJORT**: inline links i brødtekst; første afsnit er ingress (19 px); linjelængden holdes ved 60ch (≤ 80 tegn, låst af `w14-brugere.test.js`) |
| 8 | Fremgangsmåder | Grå standardtal | **GJORT**: nummererede lister som trin (cirkler i brandtint) |
| 9 | "Læs også" som fotokort | Kortene stod **uden foto**: `.gd-sources li > a:only-child{display:inline-block}` i `styles.css` vandt over `.gd-rel-card{display:flex}`, så fotoet fik højde 0 | **GJORT**: fotokort med kategori, titel, læsetid og "Læs guiden →" |
| 10 | Kilder | Lange orange links med prikker | **GJORT**: nummereret kildeliste i kort, neutral linkfarve, ekstern-pil |
| 11 | Afslutnings-CTA | Slutafsnittet "7. Klar til at finde din første motorcykel?" blev gentaget ordret som overskrift i panelet under | **GJORT**: panelet hedder "Gå videre herfra" |
| 12 | (oversigt) | 7 guides i fire kolonner efterlod et tomt felt | **GJORT**: sidste felt er et mørkt link ind i søgningen (kun når antallet er ulige) |

## 3. Hvad der er ændret (filer)

- Mine annoncer: `css/p-dashboard.css`, `js/mine-annoncer.js`, `mine-annoncer.html`, `js/dashboard.js` (rækkens tællerstribe, krav-dialog), `dashboard.html`.
- Opret: `js/opret-annonce.js` (kun `renderStepper`, ny `sektionKlar`/`opdaterFremdrift`, `wireForhaandsvisningsark`; MÆRKEVALG-delen er urørt), `css/p-opret.css`, `opret-annonce.html`.
- Login: `js/login.js`, `login.html`, `css/p-login.css`.
- Guides: `scripts/build-guides.js`, `css/p-guides.css`, genererede `guides.html` + `guide-*.html`.
- Test/værktøj: `js/v5-saelger.test.js` (ny), `js/v2-saelger.test.js` (én vælger: feltfejl i stedet for overlay), `scripts/w9-saelger-mock.js`, `work/v5-skaerm.js`.
- Bygget med `node scripts/build.js` -> `node scripts/kritisk-gen.js` -> `node scripts/build.js`. Kun mine sider committet; øvrige genererede filer (annonce-*, mærke-*, sitemap, kritisk-manifest m.fl.) er ikke committet (Orchestrator bygger efter merge).

Fund under iteration 2 (alle rettet): dealer-dashboardets rækker havde samme tællerfælde, når statuskolonnen blev smallere (flyttet til samme stribe); første forsøg på ens placeholders knækkede km-feltet ved 375 (rullet tilbage); en CSS-regel (`.lg-promo h2 > span{display:inline}`) viste begge versioner af overskriften i login-visningen (fjernet, fanget af egen test og V3/W14-testene); en guide-regel `li > a:only-child` ramte typefliser og "Gå videre"-links (begrænset til links uden klasse).

## 4. Tests

Ny: `js/v5-saelger.test.js` (15 tests, Playwright mod mock; 3 statiske): række-layout og tællerstribe ved 1440/1024/768/375; fast statuskolonne; fokus efter Annuller (slet og solgt); fokus efter gennemført slet/solgt/pause; tom tilstand; trinbjælkens flueben og "x af 10"; mobilpillen (synlig midt i formularen, væk ved handlingsrække og ved fejl); dansk feltfejl uden browserboble på opret konto; egen overskrift og ikoner i opret-visningen; spinner; guidens typefliser/fotokort/linjelængde; overflow på guides ved 375/430/768 i mørk; novalidate på alle formularer; oversigtens link-felt; ingen dubleret h2. Verificeret rød mod HEAD-versionen af `js/mine-annoncer.js` (stribe, fokus efter Annuller, fokus efter pause fejler dér).

Eksisterende, kørt grønne: `js/v2-saelger.test.js`, `js/v3-saelger.test.js`, `js/w14-brugere.test.js`, `js/w9-saelger.test.js`, `scripts/guides.test.js`, `scripts/w12-guides.test.js`, `js/mine-annoncer.test.js`, `js/dashboard.test.js`, `js/opret-annonce-markup.test.js`, `js/opret-validering.test.js`, `js/login-fejl.test.js`, `scripts/w9-discovery.test.js`, `scripts/v2-indhold-cls.test.js`, `js/visuel-css.test.js`, `scripts/smoke-browser.test.js`, `scripts/a11y-tjek.test.js`, `scripts/csp-hashes.test.js`, `scripts/inline-scripts-syntaks.test.js`.

Smoke: `node scripts/smoke-browser.js --sider opret-annonce,login,mine-annoncer,dashboard,guides + 10 guide-* --viewports 320,390,768,1024,1440 --temaer lys,mørk --cls 0.05 --strikt`: 150 målinger, 0 fejl, 0 advarsler, to gange (to rækkefølger). Bemærk: smoke åbner mine-annoncer uden session (omdirigeres til login); det udloggede flow er dækket af smoke, det indloggede af `v5-saelger.test.js` (overflow, layout) og `w9-saelger.test.js`.

## 5. Syv dimensioner pr. sidefamilie (1-10, mod den tidligere version og mockuppen)

| Dimension | Opret | Login | Mine annoncer | Guide |
|---|---|---|---|---|
| Visuel kvalitet | 6,5. Struktur som mockup, men uden rytter-foto og med bar baggrund i kortene; fremdriftsmåler og flueben er nye, rolige signaler | 6,0. Komposition og dybde som mockup; foto uden rytter, ingen social login | 7,0. Tællerstriben løser den værste synlige fejl; statuskolonnerne står nu lodret ens; rækker uden fotos er stadig grå felter | 7,0. Fulde typefliser, fotokort, trin, kilder; hero uden rytter |
| Designkonsistens | 7,5. Samme komponentsprog (tips-bånd, kort, pille) | 7,5. Opret-feltene har nu samme ikon-felt som log ind | 7,5. Dealer-dashboard og mine annoncer deler nu tællerstribe; tomme tilstande i samme tone | 7,5. Callouts, trin, kilder, "Læs også" følger kortsproget |
| Funktionalitet | 8,0. Fremdrift og flueben beregnes af faktiske felter; pille/valideringskonflikt rettet | 8,0. Ingen browserboble; fejl ved feltet; spinner | 8,0. Fokus efter bekræftelse rettet, menu lukker ved Tab | 7,5. Intet nyt funktionelt udover rettede links |
| Brugeroplevelse | 7,5. Man kan se, hvor langt man er | 7,5. Fejl står, hvor man kigger (også på telefon) | 7,5. Tom tilstand giver vej fremad; tællere læses som en række | 7,0. Bedre skanning (trin, kilder), men brødteksten er stadig 60ch |
| Mobil | 7,5. Pillen dækker ikke længere handlinger/fejl | 7,5. Feltfejl ved feltet i stedet for skærmhøjder væk | 7,5. Tællerstribe ombrydes pænt; "Seneste 30 dage" får egen linje under 520 px | 7,5. Fotokort og trin fungerer ved 375 |
| Performance | 8,0. Ingen ny afhængighed; `opdaterFremdrift` tegner kun trinbjælken igen ved statusskifte; CLS (smoke) 0 | 8,0 | 7,5. Tællerne indsættes efter hydrering (som før); målt CLS indlogget ved 1440 med mock-statistik: 0,029 mod 0,023 før (begge under 0,05; 375: 0,0002). Striben kunne reserveres, men så ville konti uden tal få en tom stribe | 8,0. "Læs også" bruger lazy-billeder med højde fra CSS |
| Indholdskvalitet | 8,0. Intet opdigtet; måleren siger "x af 10" | 8,0. Overskriften i opret-visningen siger kun, hvad kontoen kan (gratis for private, telefon valgfrit) | 8,0. Tom tilstand beskriver det faktiske flow | 8,0. Kilder uændret; "Gå videre herfra" fjerner dublet |

## 6. Ærlig selvscore mod mockuppen (Critic dømmer bagefter)

| Mockup | V4-Critic | Min score nu | Begrundelse |
|---|---|---|---|
| Opret annonce | 6,0 | 6,5 | Samme layout og tips; nu en rigtig fremdriftsbjælke. Mangler rytter-hero, titelfelt, rig tekst, "vis eksempel" |
| Login | 5,5 | 6,0 | Bedre tilstande og konsistens; uden social login, rytterfoto og håndskrift har den et loft |
| Mine annoncer | 6,0 | 6,8 | Tællerstribe, faste kolonner, tom tilstand; mangler beskeder, udløb, samlet visningskort (data findes ikke) |
| Artikel | 6,5 | 6,9 | Fulde typefliser og fotokort som mockuppen; hero og forfatter-foto kan ikke leveres |

## 7. Restpunkter og DELT-ØNSKER (ikke mine filer)

1. `css/styles.css` linje ~2978: `main p > a:only-child, ... .gd-sources li > a:only-child{ display:inline-block; padding-block:4px }` har for høj specificitet for guidernes egne kort. Løst lokalt i `css/p-guides.css`; reglen bør gøres smallere (`:not([class])`).
2. Delt header (`js/components.js` / `css/styles.css`): for forhandlere (med menupunktet "Dashboard") ombrydes "Artikler & guides", "Om Bikerbasen" og "Mine annoncer" til to linjer ved 1440 px (se `docs/review/gauntlet/v5/saelger/` ved at åbne `dashboard.html` som forhandler). Forslag: `.main-nav a{white-space:nowrap}` og skjul `.nav-sek` tidligere.
3. `package.json`: tilføj `js/v5-saelger.test.js` til `npm test` (Orchestrator ejer listen; kræver Playwright, springer tydeligt over uden; ca. 50 s).
4. Hele `*.html` for mine sider er bygget; Orchestrator bygger igen efter merge (`build` -> `kritisk-gen` -> `build`). Version-stempler i mine sider stemmer overens med min worktrees CSS/JS og skiftes af næste byg.
5. `js/store.js` `toggleFavorite` (fra W9, uændret): databasefejl ved favorit gemmes kun som `console.warn`.
6. Rytter-foto, håndskrevne taglines og et ægte autor-foto kræver assets; intet er downloadet.
7. Guidesiderne er stadig statisk genereret: `build-guides.js` skriver rå HTML, og `inline-critical`/`csp-hashes` tilføjer resten (derfor skal hele byggekæden køres, ikke kun `build-guides.js`).

## 8. Opfølgning: guidekort og hero-billeder (ejerens fund, separat commit)

Fund (ejeren, `guides.html` ved ca. 1440): motorcykelbillederne i guidekortene var zoomet for meget ind (for-/baghjul og tank skåret af i siden), og kortets tekst stod med ca. 100 px tom plads mellem uddrag og "Læsetid".

Årsag (målt): kortbillederne er studiofotos i 4:3 (456x342), hvor motorcyklen fylder hele bredden og står i bunden. Side-kortene (A2 og Køb brugt) lod billedfeltet strække sig til kortets højde (220 px bredt x ca. 300 px højt, `object-fit:cover`): 43 % af bredden røg af. Gitterkortene brugte 16:9 (hjul i bunden skåret), og tekstkolonnen var strakt med `margin-top:auto` til gitterets højeste kort. `guides-data.js` forankrede billederne i midten, og sidste guide (`hero-800`, `15% center`) viste vejen uden motorcykel.

Rettet (`css/p-guides.css`, `scripts/guides-data.js`, `scripts/build-guides.js`):
- Faste billedformater uden stor beskæring: gitterkort 3:2, side-kort 4:3 (vandret kort, billedet 44 % af bredden), det store kort 2:1 / fylder højden som et bredt bånd (fotoet er 2,4:1); små skærme (< 700 px) lodret med 3:2. Billederne forankres i bunden (`object-position: center 100%`); heltefotoet forankres til højre (82 %/90 %), hvor motorcyklen står.
- Tekstblokken følger billedet: side-kortets tekst står midt for billedet, uden `margin-top:auto`; måling: højst 48 px luft mellem uddrag og "Læsetid" ved 768/1024/1440/1920 (før 85 px).
- 1024-1199 px bruger tabletopstillingen (det store kort øverst, to vandrette kort under), fordi to kolonner dér gav stående strimler.
- "Læs også": 3:2-miniature i fast format, midt i kortet (før: stående strimmel ved 375).
- Hero-banner: motorcyklen står til højre i fotoet; x-forankringen er sat til 90 % på alle guides, og båndet vokser med skærmen fra 1440 px (18,5 vw / 15,5 vw på oversigten), så fotoet ikke skæres til en strimmel ved 1920 (motorcyklens synlige højde: 41 % -> 61 % på oversigten, 77 % på guiderne).

Test: `scripts/v5-guidekort.test.js` (5 tests, Playwright mod mock, lys og mørk). Den regner ud, hvilket udsnit af originalbilledet `object-fit`/`object-position` viser, og kræver mindst 85 % af motivets bredde og højde i alle 10 kortbilleder ved 375/430/768/1024/1440/1920 (motiver målt ud fra billederne: studiofotos x 0-1, y 0,06-1; heltefotos x 0,59-0,94, y 0,27-0,87), mindst 90 % af bredden og 70 % af højden i hero-bannerne (50 % på den slanke oversigtsbjælke) på alle 11 sider ved 375/768/1440/1920, samme 85 % for "Læs også"-miniaturerne, højst 48 px luft i kortene, samt statisk at `cardPos` i `guides-data.js` er forankret. Verificeret rød mod versionen før rettelsen (kort: "100 % bredde, 80 % højde" ved 375; 85 px luft ved 1440).

Før/efter: `docs/review/gauntlet/v5/saelger/guidekort/foer/guides-{375,430,768,1440,1920}-{lys,moerk}.jpg` og `.../guidekort/efter/` (samme sæt). Forsidens guide-banner (`index.html`) bruger ikke disse billeder (tegning, ikke foto) og er urørt.

Kørt grønt efter rettelsen: `scripts/guides.test.js`, `scripts/w12-guides.test.js`, `js/w14-brugere.test.js`, `scripts/v2-indhold-cls.test.js`, `js/v5-saelger.test.js`, `scripts/v5-guidekort.test.js`, smoke strikt (11 guidesider x 320/390/768/1024/1440 x lys/mørk) 0 fejl og 0 advarsler, to gange.

## 9. Opfølgning på QA-dommen (to P2'er)

**P2-2: gemte annoncer uden login.** Header-hjertet "Gemte annoncer" sendte anonyme til `login.html`, selvom favoritter på indekserede annoncer kun gemmes i browseren (D-008) og kommentaren i `js/components.js` påstod, at de virker for anonyme. Nu er netop én fane åben for anonyme: `mine-annoncer.html?tab=favoritter` (og aliasset `?tab=gemte`).
- Anonym ser kun favoritlisten (lokale favoritter på indekserede annoncer) med den diskrete tekst "Gemt i denne browser — log ind for at gemme egne annoncer" (log ind linker til login med retur til favoritfanen). Siden hedder "Gemte annoncer"; statistikkort, egne annoncer, søgeagenter, profil og kontokort er skjult.
- Alle andre faner (`aktive`, `mine`, `kladder`, `agenter`, `konto`) og kald uden `tab` sender stadig en anonym til login med `redirect`.
- Egne uuid-favoritter kræver konto: de hentes ikke fra databasen og ryddes ikke. Har en anonym alligevel nogle, står der en ærlig linje ("Du har også 1 gemt annonce fra private sælgere på Bikerbasen. De vises, når du er logget ind."), så headerens tæller og listen ikke modsiger hinanden.
- Ingen skrivning til Supabase i anonym tilstand. Kommentaren i `js/components.js` er rettet, så den siger, hvad der faktisk gælder.
- Rækker for gemte indekserede annoncer har tre handlinger; i den faste handlingskolonne ombrydes de nu til to linjer i stedet for at løbe ind over statuskolonnen.
- Test (`js/v5-saelger.test.js`, 3 nye): anonym trykker hjerte på ekstern annonce i søgningen, åbner header-hjertet, ser annoncen på listen uden login-omdirigering, fjerner den igen (liste og lager), og `log` har kun GET/HEAD; anonym på seks andre adresser sendes til login; anonym med egen uuid-favorit får beskeden og intet ryddes.

**P2-3: guide-figur.** `guide-brugt-motorcykel.html` viste `classic.webp` (456x342) som en 704x180-strimmel ved 768 px (66 % beskåret, kun hjulene) og skaleret op til 936 px ved 1440 (uskarp). Årsag: `.gd-fig img{ height:clamp(180px,22vw,280px); object-fit:cover }` og `width="960" height="540"` fra generatoren. Der findes ingen større udgaver af typefotoerne i `img/` (kun 456x342; `sell-cruiser.webp` er 640x400), og der er ikke opfundet nogen.
- Generatoren læser nu billedets egne mål (WebP-hoved) og skriver rigtige `width`/`height` samt `--gd-fig-w`; figuren vises i billedets eget format (`height:auto`, ingen beskæring) og højst i billedets egen bredde (456 / 640 px), så den aldrig skaleres op. Tre guides har en figur: brugt (classic, 456 px), sælg (sell-cruiser, 640 px) og vinteropbevaring (cross, 456 px).
- `scripts/v5-guidekort.test.js` måler nu også artikel-figurer ved 375/430/768/1024/1440/1920: mindst 85 % af motivets bredde og højde synlig og vist bredde højst lig billedets egen bredde (ingen opskalering). Verificeret rød mod gammel CSS.
- Billedet er skarpt ved 1x. På retina-skærme (2x) er 456 px stadig et lille kildebillede; det kan kun løses med nye, større billeder (asset, ikke kode).
