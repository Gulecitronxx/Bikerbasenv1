# V6 Builder: konto- og dashboard-siderne (sælger)

Branch `gauntlet/v6-saelger`, udgangspunkt `c84fa409` (V5 critic-rapport). Kilder: V5-Critic `docs/review/gauntlet/v5/critic-samlet.md` (P2-6) og `docs/review/gauntlet/v5/qa-fund.md` (F4). Backend: kun `scripts/w9-saelger-mock.js` (alle `*.supabase.co`-kald besvares lokalt, alt andet blokeres); aldrig produktion, ingen download.

Fire opgaver, en commit pr. opgave (plus en lille testrettelse):

| # | Opgave | Commit |
|---|---|---|
| 1 | Smoke som INDLOGGET (`--login-mock`) | `8237d9e5` |
| 2 | CLS på mine-annoncer/dashboard (rod-årsag + rettelse + test) | `5434fc5e` |
| 3 | F4: udlogget besøg henter ikke dashboard-pakken (inline-vagt) | `61a9d5be` + testrettelse |
| 4 | opret-annonce og login: CLS-gennemgang | `af4b489e` |

## 1. Smoke som indlogget (`node scripts/smoke-browser.js --login-mock`)

V5 målte aldrig de indloggede sider: smoke åbnede dem uden session og så kun omdirigeringen til login. Nu:

- `--login-mock` åbner konto-siderne mod `scripts/w9-saelger-mock.js` med et STORT lager (`scripts/fixtures/v6-konto-lager.js`): 11 egne annoncer (7 aktive, 2 på pause, 2 solgte, 0-8 fotos, lange titler), 60 dages dagstal for de aktive (tællerstriben, kortene, graferne), søgeagenter, en favorit, og for forhandleren 4 indekserede annoncer + et krav. Ét nyt lager og en egen kontekst pr. måling (siderne skriver ind i det).
- Standardsættet (uden `--sider`): `mine-annoncer.html` alle 5 faner, `dashboard.html` alle 3 faner (forhandlerprofil, ellers sender dashboardet private videre), `opret-annonce.html` (ny og `?rediger=`), `login.html` udlogget (med og uden `?redirect=`) og INDLOGGET (skal ende på `mine-annoncer.html`). 13 adresser.
- `--sider` vælger blandt dem (gerne med `?tab=…`); andre sider måles som før. Virker sammen med `--varm` (kold og varm cache), `--viewports`, `--temaer`, `--cls`, `--strikt`.
- Nyt tjek `omdirigeret` (fejl): en login-måling der ender et andet sted end forventet (fx mock-sessionen virker ikke) fanges i stedet for at måle login-siden.
- Resultatet står som `side [ind|ud]` i tabellen og i JSON (`login`-feltet).

Første kørsel afslørede, hvad V5 aldrig målte (768 px, mock-lager, lys):

| side | CLS før |
|---|---|
| mine-annoncer `?tab=oversigt` | 0,274 |
| mine-annoncer `?tab=mine` | 0,669 |
| mine-annoncer `?tab=favoritter` | 0,083 |
| mine-annoncer `?tab=konto` | 0,145 |
| dashboard `?tab=oversigt` | **0,933** |
| dashboard `?tab=annoncer` | 0,733 |
| dashboard `?tab=krav` | 0,523 |
| opret-annonce / login | 0,006-0,009 |

(Critic målte 0,094 i en tom mock; med et realistisk lager er det langt værre, fordi hver ekstra række skubber mere ud af vinduet.)

## 2. CLS: rod-årsagen og rettelsen

Layout-shift-kilderne (`layout-shift`-entries med `sources`) viste fire årsager:

1. **Tomme lister i første billede.** Siden står først med nul-tællere og en tom liste; sidebjælken ("Min konto"), "Opret"-striben og sidefoden ligger i vinduet. Når data kommer, skubber rækkerne alt under dem ud (`aside.db-aside` + `.db-create`: 0,266 af 0,274).
2. **Dashboardets fane- og indholdsblok** (`display:none` indtil data) vises først efter hentning og skubber sidebjælken ned (0,35 + 0,58).
3. **Tællerstriben** (`.db-nums`) blev hentet og indsat EFTER første tegning af hver aktiv række (~56 px pr. række; striben forsvandt og kom igen ved hver sortering).
4. **Små ting:** dashboardets hero-undertekst skrives af JS og ombryder (21 px); den tomme `<span data-icon>` i fanebjælkens knap skubbede knappen 16 px.

Rettelse (kun `css/p-dashboard.css`, `js/mine-annoncer.js`, `js/dashboard.js`, de to HTML-sider):

- **"Henter"-tilstand.** `<main class="db-page db-venter" aria-busy="true">`: mens den står, er alt indhold under fanebjælken `visibility:hidden` (layoutet er stadig der, så kode der måler virker), og et skelet (3 kort med diskret skimmer, `prefers-reduced-motion` respekteret) står i stedet. `visSiden()` fjerner klassen, når data er tegnet. Usynlige elementer tæller ikke som layoutskift, og et element der bliver synligt flytter sig ikke. Et css-ur (12 s) viser siden alligevel, hvis scriptet fejler.
- `.db-page{min-height:100dvh}`: sidefoden står aldrig i første billede, så den heller ikke rykker.
- **Tællerstriben hentes sammen med annoncerne** (`Promise.all([hentEgneAlle(), hentRaekkeStatistik()])`) og tegnes i samme billede som rækkerne. `visAnnonceStatistik(grid)` er stadig der (henter, hvis tallene mangler), så eksisterende test (`js/w7-funktion.test.js`) er uændret. Bivirkning til det bedre: stribe-tallene blinker ikke længere ved sortering.
- Dashboardets fanebjælke står i layoutet fra første billede (usynlig til data); hero-undertekstens to linjer er reserveret (`#dash-subtitle{min-height:2.9em}`); tomme ikonpladser i knapper har deres endelige størrelse.
- Samme regel som sidens egen: de sider er stadig kun én `db-venter`-klasse; ingen ny afhængighed.

**Efter** (mock-lager; 375/430/768/1024/1440, lys+mørk, kold og varm cache, 2 kørsler): mine-annoncer alle faner 0,0014 og dashboard alle faner 0,0026 som værste måling (grænse 0,02). Med 700-1200 ms forsinkelse på hvert backend-kald: 0,0000.

Test: `js/v6-konto-cls.test.js` (CLS < 0,02 for alle faner ved 375/430/768/1024/1440, mørk, 1920, langsom backend; striben i samme billede som rækkerne; "henter"-tilstandens synlighed; smoke `--login-mock` uden fund; statisk kobling mellem HTML, js og css).

## 3. F4: udlogget besøg henter ikke dashboard-pakken

QA-fund F4: udloggede på `dashboard.html`/`mine-annoncer.html` hentede 13 deferrede scripts + 3 stylesheets (196 kB JS + 66 kB CSS gzip), og først `js/dashboard.js`/`js/mine-annoncer.js` omdirigerede til `login.html`. Målt her: 40 egne forespørgsler for to sider.

Implementeret som QA foreslog: `<script id="konto-vagt">` FØRST i `<head>` (efter CSP-meta, før tema-scriptet, annonce-prefetchen, alle `<link>`/`<script>`), hashet af `node scripts/csp-hashes.js`. Samme session-detektion som sidens egen (`backend-bridge.js sessionGemt` + `Store.getUser()`):

- en nøgle `sb-<ref>-auth-token` i localStorage = logget ind (kun nøglen tælles; `…-code-verifier` og andre navne tæller ikke);
- ellers en lokal demo-bruger i `bb_user` (uden `remote`) = logget ind (siden afgør);
- ellers (inkl. en forældet `remote`-bruger uden session, som siden selv ville logge ud) -> `location.replace('login.html?redirect=…')`; redirect-værdien er den samme som sidens egen (`dashboard.html`; `mine-annoncer.html` + query) og opfylder `login.js`' mønster;
- `?tab=favoritter` og `?tab=gemte` på mine-annoncer er åbne for anonyme (V5) og omdirigeres ikke; dashboardet har ingen åben fane;
- blokeret lager (privat tilstand) kaster ikke og omdirigerer ikke: siden afgør selv. Vagten er kun en hurtig afvisning; siden og RLS tjekker stadig rigtigt.

Resultat: udlogget besøg = **20 forespørgsler (før 40)**; ingen af `js/dashboard.js`, `js/mine-annoncer.js`, `js/postnumre.js`, `js/bekraeft-dialog.js`, `css/p-dashboard.css`, `css/p-bekraeft.css` hentes. `node scripts/v5-sidevaegt.js --browser`: dashboard/mine-annoncer ender på 554,7 kB (samme tal som login.html alene) mod 1019 kB før; fonte 66,4 kB, JS 185,8 kB, CSS 59,2 kB, billeder 228 kB er login-sidens egne.

Test: `js/v6-konto-vagt.test.js` (12 tests: vagtens logik i alle tilstande via `vm`; i Chromium: udlogget -> login med korrekt redirect for alle faner og ingen af sidens egne filer + ingen CSP-fejl; åbne favoritfaner; indlogget bliver på siden i alle faner; stale/lokal bruger; markup først i `<head>` og CSP-hash).

Følge: `scripts/v5-sidevaegt.test.js` forventede, at målingen af en omdirigering var STØRRE end login.html alene ("begge sider hentes"). Den er rettet til `>=` og `< 1,2 x` (én linje + kommentar); det er QA's fil, men uden rettelsen fejler `npm test`. `scripts/v5-sidevaegt.budget.json` kan sænkes for de to sider (kun hvis QA/Orchestrator vil: `--gem-budget`).

## 4. opret-annonce og login (768 indlogget og de andre bredder)

- **login.html** udlogget: CLS 0,000 ved 375/768/1440 lys og 768 mørk (med og uden `?redirect=`); indlogget sendes man straks videre (mock: ender på mine-annoncer, nu 0,000-0,001). Ingen rettelse nødvendig; låst i test.
- **opret-annonce.html** ny annonce: 0,006 ved 375-768 (alt dette er skriftskiftet fra reserveskrift til Space Grotesk/IBM Plex: hero-undertekstens ombrydning, ~12 px; sidebredt, se restpunkter) og op til 0,009 ved 1440. To rigtige fund:
  1. **Forhåndsvisningen i sidekolonnen** (≥ 1024 px) havde `min-height:186px`, men er 349-353 px efter hydrering: "Sikker handel" og "Påkrævede felter udfyldt" sprang 163 px (0,009 ved 1440). Reserveret højde er nu 353 px (`css/p-opret.css`).
  2. **`?rediger=`**: overskrift og undertekst skiftede først efter at annoncen var hentet; den længere tekst ombrød hero'en (0,019 ved 375, i uheldige kørsler 0,029). Nu sættes de FØR første maling af et lille hashet inline-script lige efter lead-elementet (`#op-rediger-hero`), med samme tekst som `REDIGER_LEAD` i `js/opret-annonce.js` (som stadig sætter dem, idempotent). `js/opret-annonce-markup.test.js` tillod ingen inline-scripts i `<main>`; den tillader nu netop dette ene og kræver, at CSP har dets hash.
- Efter: opret-annonce ny og rediger 0,000-0,0062 ved 375/430/768/1024/1440/1920, lys og mørk.

Test: `js/v6-konto-cls.test.js` (opret ny/rediger ved 375/768/1440/1920 + mørk, forhåndsvisningens reserverede højde ≥ endelig højde ved 1024/1440, statisk kobling af rediger-hero, login udlogget).

## 5. Skærmbilleder

`docs/review/gauntlet/v6/saelger/foer/` og `.../efter/` (375/768/1440, lys+mørk; mine-annoncer oversigt, dashboard oversigt, mine-annoncer favoritter, opret-annonce rediger; indlogget mod mock-lageret) og `tidligt-*.jpg` i begge mapper (500 ms inde med 1,2 s forsinket backend: det gamle layout med sidebjælken i første billede mod "henter"-tilstandens skelet). Værktøj: `work/v6/skaerm.js`.

## 6. Verifikation

Kørsler på bygget output (`node scripts/build.js` -> `node scripts/kritisk-gen.js` -> `node scripts/build.js`, alle exit 0; det genererede er ikke committet):

- Relevante tests (23 filer, 265 tests: v6-konto-cls, v6-konto-vagt, mine-annoncer, dashboard, v5/w9/v3/v2-saelger, w7-funktion, opret-annonce-markup, opret-validering, login-fejl, favoritter, v5-favoritter, w14-brugere, v5-opret-container-fallback, smoke-browser, v5-sidevaegt, w12-kritisk, csp-hashes, a11y-tjek, inline-scripts-syntaks): 3 kørsler, 265/265 grønne i to, én kørsel havde én rød (login-CLS-testen, en kastet navigationsfejl på 1,5 s under mange samtidige browsere, ikke en CLS-måling); testen tager nu en navigationsfejl (`net::ERR_…`) om én gang og 6 efterfølgende kørsler var grønne. `scripts/w12-kritisk.test.js` grøn.
- `node scripts/smoke-browser.js --sider mine-annoncer,dashboard,opret-annonce,login --viewports 320,390,768,1024,1440 --temaer lys,mørk --cls 0.05 --strikt` (udlogget, som før): 2 kørsler, 40 målinger hver, 0 fejl, 0 advarsler (værste CLS 0,0117 / 0,0062).
- `node scripts/smoke-browser.js --login-mock --varm --viewports 375,430,768,1024,1440 --temaer lys,mørk --cls 0.05 --strikt` (indlogget, 13 adresser, kold og varm cache): 2 kørsler, 260 målinger hver, 0 fejl, 0 advarsler. Værste CLS 0,0498 (kørsel 1; opret-annonce `?rediger=` 768 lys kold) og 0,0062 (kørsel 2). Kørsel 1 havde desuden to målinger på login.html udlogget på 0,012 og 0,020. Intet af det lod sig gentage i 144 ekstra målinger (3 x 48, tærskel 0,012: 0 fund) eller i 6 samtidige kørsler; det ligner det sidebrede skriftskifts timing under belastning (restpunkt 1), men er ikke bevist. Alle under smoke-grænsen 0,05.
- Før/efter-tal for CLS ved 768 er målt med `layout-shift`-observer på samme mock-lager (afsnit 1 og 2).

7 dimensioner pr. sidefamilie:

| Dimension | mine-annoncer + dashboard | opret-annonce | login |
|---|---|---|---|
| Visuel kvalitet | 7: uændret design; skelet i stedet for en side med nuller; stribe i første billede | 7: uændret | 7: uændret |
| Designkonsistens | 8: samme `.db-*`-komponenter; skelettet bruger sidens egne tokens (lys/mørk) | 8 | 8 |
| Funktionalitet | 8: faner, sortering, handlinger uændret (alle eksisterende tests grønne); stribe-tal blinker ikke ved sortering | 8: rediger-tekst sat før maling | 8 |
| Brugeroplevelse | 8: ingen hop; "henter"-tilstand med `aria-busy`; udlogget sendes til login straks | 8 | 8 |
| Mobil | 8: 375/430 CLS 0,000-0,003; tap-mål i krav-tabellen hævet til 24 px | 8 | 8 |
| Performance | 9: CLS 0,27/0,93 -> ≤ 0,003; udlogget 40 -> 20 forespørgsler, 1019 -> 555 kB | 8: 0,006 (skriftskift) | 8 |
| Indholdskvalitet | 7: intet nyt indhold; alt beregnet af data | 7 | 7 |

## 7. Restpunkter (ikke rettet, eller andres fil)

- **Skriftskift (sidebredt, 0,005-0,006 ved 375-768 på opret-annonce):** `font-display:swap` med reserveskrift uden metrik-tilpasning (`size-adjust`/`ascent-override`) gør, at hero-tekster ombrydes en linje, når Space Grotesk/IBM Plex lander (~200 ms lokalt). Rettelsen hører til de fælles `@font-face`-blokke (`scripts/build*.js`/`styles.css`), ikke til sælgerfilerne.
- **`scripts/v5-sidevaegt.budget.json`:** dashboard/mine-annoncer kan sænkes til login-niveau (`node scripts/v5-sidevaegt.js --gem-budget`).
- Orchestrator: nye testfiler skal i `package.json` "test": `js/v6-konto-cls.test.js`, `js/v6-konto-vagt.test.js`.
- Efter merge skal der bygges (`build -> kritisk-gen -> build`): `?v=`-stempler og CSP-hashes er ikke committet (kun de håndskrevne ændringer og de to hashede inline-scripts, som `csp-hashes.js` skrev ind i de fire sider ved commit).
