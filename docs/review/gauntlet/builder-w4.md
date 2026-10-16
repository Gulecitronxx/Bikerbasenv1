# Builder w4-smaating — småting fra de blinde Critic'er

Branch `gauntlet/w4-smaating` (fra `3caffd2`), dev-server port 8781. Alt målt på den RENDEREDE side med Playwright (scripts udenfor repoet), Supabase fuldt mocket (`page.route`: eksterne annoncer fra `scripts/fixtures/eksterne-raekker-eksempel.json` udvidet til 24 rækker, alt andet `[]`, kildefotos serveret/afvist lokalt). Ingen produktionslæsning, ingen `build.js`, ingen crawler. Ingen sider regenereret; `package.json` uændret.

## Fund -> rettelse -> bevis

### 1. Kørekorttekst og swipe-kortets bundlinje (P2-3)
- **Før** (verificeret): gitter "Mulig A2"/"Kræver A"; liste-række rå "A2"/"A" (kun `kode`); swipe "Kørekort A2" (kun `kode` + CSS-label); swipe-kortet uden kilde og sælgertype; swipe uden badge når kategorien ikke kan afgøres.
- **Rettelse** (`js/components.js`, `js/search.js`, `css/styles.css`): ÉN funktion `kkVisTekst(kk)` (gitterkortets tekst, flyttet ud af `listingCardHTML`), `kkCelleTekst(kk)` til rækkens "Kørekort"-celle (samme tekst uden ordet "Kørekort" foran; ikke-afgjort står som dæmpet "Ikke afgjort"/"Ukendt" i stedet for "Ikke oplyst"), og `kortKildeHTML(l, f)` — gitterkortets kildedel, nu delt med swipe-kortets nye bundlinje `.swipe-card-fod` (sted til venstre, "Forhandler · mcsyd.dk" / "Privat · mcsyd.dk" / "Privat sælger" / forhandlerens navn til højre, samme markup som `.rk-kilde`). Swipe-badgen står nu også for "Kørekort ikke afgjort" (før tavs). Kun felter fra CLAUDE.md regel 2 (kilde-domæne, sælgertype, sted).
- **Bevis**: `js/annoncekort.test.js` +6 tests (10 kombinationer ccm/hk × ekstern/egen: gitter == swipe == liste; kildedelen er identisk streng i gitter og swipe; ingen gættet "Privat"; ingen kontaktdata i swipe-teksten). Gitterkortets 15 eksisterende tests uændret og grønne. Render: liste "Mulig A2"/"Kræver A", swipe-kort "Mulig A1" + "Aarhus | ↗ Privat · mcsyd.dk" (390 px, lys+mørk, 0 konsolfejl). Kontrast kilde/sted 5,74 (lys) / 6,43 (mørk), badge 17,4 / 19,4.
- Bonus (samme fund-klasse): swipe-kortets ikke-hentede kildefoto viste browserens knækkede ikon + alt-tekst, fordi `markerFotoFejl` kun kendte `.card-media`; kender nu også `.row-media` og `.swipe-card-media` (test).

### 2. Kort: titel/pris-knækpunkt og mislykket foto (P3-5, P3-6)
- **Titel/pris**: målt på renderet side (390/1440): kortbredder 212/240/254/256 = stablet, 279/289/332/358 = side om side. Ingen kort ligger i nærheden af 262 px-grænsen; det er ét klart knækpunkt på kortets EGEN bredde (container query), og alle kort i en række har samme tilstand. Et glidende alternativ (flex-wrap) ville gøre placeringen titelafhængig kort for kort og give ujævne rækker. **Besluttet: ingen adfærdsændring**, begrundelsen står nu i CSS ved reglen, og testen låser "præcis én container query styrer `.rk-top`".
- **Mislykket foto**: kameraikon bag en pille findes ikke mere (typebillede/pille blev fjernet i w3); tilbage var teksten på to linjer pga. `max-width:22ch` (254 px-kort). Nu `.foto-fejl .foto-tom-titel{ max-width:none; text-wrap:balance }`: én ærlig sætning på én linje, og brydes den i smalle kort (212 px), brydes den jævnt. Fejl-feltet er ét element (ikon + én `<p>`) i alle tre visninger. Før: `before-fejl.png` (to linjer, 254 px). Test: ét `<p>`, CSS-reglen.

### 3. Login-strimlen (P3-4)
- **Før** (målt): `.lg-strip-list` kasse 0..1440 ved 1440 og 220..1700 ved 1920 (kort/footer 32..1408 og 252..1668). Det synlige indhold stod dog allerede på kanten, fordi kassen havde 32 px sidepadding.
- **Rettelse** (`css/p-login.css`): kassen står selv på indholdskanten: `width:calc(100% - 2*var(--gutter)); max-width:calc(var(--site-w) - 2*var(--gutter)); padding-inline:0`.
- **Efter** (x ved 1024/1440/1920; logo / kort / strip-kasse / første ikon / footer-gitter): 1440: 32 / 32..1408 / 32..1408 / 32 / 32..1408. 1920: 252 / 252..1668 / 252..1668 / 252 / 252..1668. 1024: 32 / 32..992 / 32..992 / 32 / 32..992. Test `scripts/smaating.test.js`.

### 4. afmeld.html mangler footer
- `afmeld.html`: den delte footer (identisk link-gitter) + scripts, der gør footerens lys/mørk-knap levende (`security, icons, data, store, maaling, components, info` — samme sæt som 404). Headeren er uændret (kun logoet, med vilje). Ingen nye inline-scripts, så ingen CSP-hash berøres.
- `scripts/synk-header.js`: ny liste `FOOTER_KUN = ['afmeld.html']` — kun footerens link-gitter synkroniseres, aldrig headeren; øvrige sider urørt. Verificeret: ændret et footerlink i afmeld -> `--tjek` melder afvigelse (kode 1) -> skrivende kørsel retter det byte-identisk (blandede linjeskift bevaret). `--tjek` på alle sider: "alle sider har samme header og footer som index.html".
- Render: footer synlig 1440 lys + 390 mørk, lys/mørk-knappen skifter tema, 0 vandret overflow, 0 konsolfejl. `scripts/info-tekst.test.js` og `scripts/forside.test.js` grønne.

### 5. Død klasse `mk-wide`
- Fjernet fra `scripts/build-brand-pages.js` (5 steder), fra den håndskrevne `maerker.html` (1 sted, ikke genereret) og den døde kommentar i `css/p-maerke.css`. Mærkesiderne er IKKE regenereret — de 26 mærkesider mister klassen ved Orchestratorens næste build.

### 6. `slugify` kender ikke ü
- **Før**: `model-z-ndapp-ks-50`. Der var FIRE kopier (shared.js, build-brand-pages.js, build-facet-pages.js, seo-sider.js) og to klientkopier (js/home.js, js/seo.js).
- **Rettelse**: ny `scripts/slug.js` (ø->oe, æ->ae, å->aa som før, derefter Unicode-foldning: ü->u, ä->a, ö->o, é->e, ß->ss; NFC først, så dekomponeret "å" stadig bliver "aa"). De fire serverkopier require'r den; klientkopierne har samme foldning inline.
- **Bevis** (`scripts/slug.test.js`, 6 tests): Zündapp -> `model-zundapp-ks-50`; ALLE committede `model-/maerke-/by-/mc-/budget-/region-*.html` (48 filer) regenereres fra deres egne data-attributter og er ens med filnavnet — dvs. 0 flyttede adresser; `listingSlug` for de to committede annoncesider uændret; `js/seo.js listingPageUrl` == `listingSlug` også for Zündapp (`js/seo-adresser.test.js` grøn).

### 7. forhandler.html som indekserbar skabelon
- `scripts/build-meta.js` NOINDEX + `<meta name="robots" content="noindex, follow">` i `forhandler.html` (præcis den linje, generatoren ville skrive; build-meta er ikke kørt). `scripts/seo-audit.js` (rører ingen filer): indekserbare sider 57 -> 56, 0 fund, ellers identisk output.
- Verificeret: `sitemap.xml` indeholder ikke "forhandler"; ingen statisk HTML linker til `forhandler.html` (kun JS fra annoncesiden, `noindex, follow` bevarer det); `seo-krav.test.js` grøn.
- **Bivirkning rettet**: `scripts/build-brand-pages.js` ville ved en dag med en egen forhandlerannonce have skrevet `forhandler.html?id=…` i sitemappet — et modsat signal til noindex (seo-krav afviser det). Fjernet fra sitemap-listen (nul poster i dag, så `sitemap.xml` er uændret; `dealerUrls` beregnes stadig). Test i `smaating.test.js`.

### 8. h1-skala
Målt (computed `font-size` for synlig h1, 1440 / 390):
| familie | før | efter |
|---|---|---|
| forside, mærker, kørekort, type, region, model, by, mc, budget, guides, guide, login, opret, dashboard, mine, forhandler, søgning (`.so-h1-title`) | 50 / 28 | uændret (`--h1-hero`) |
| om-bikerbasen, vilkår, sikkerhed, privatliv, om-indeksering, 404 | **56** / 32 | 50 / 28 (`--h1-hero`, `css/p-info.css`) |
| afmeld | **44** / 30 | 50 / 28 (`--h1-hero`, `css/p-login.css`) |
**Dokumenterede undtagelser** (bevidst anderledes): annonce-h1 (40/28, midterkolonnen ved siden af galleri/pris, ikke et hero), statisk annonce (32), mærkeside (26/18: h1 er undertitel under det 68 px store wordmark, som er sidens hero), `.page-title-bar h1` (arbejdssider, 24–32), login-h1 i kortet bruger tokenet men står i et 5/12-kort. Test låser tokenet og undtagelserne.

### 9. Små rester
- **Forsidefliser** (`.tile::after`): pixelvis målt (screenshot med teksten gjort gennemsigtig, lyseste pixel under navn/antal, helt hvidt foto = værste tilfælde): navn **3,45:1** (fejl, 16 px/700 er ikke "stor tekst"), antal 13,7:1. Scrimmen var nede på ~.46 dér, hvor øverste tekstlinje starter. Ny gradient (.8+ til 60 %, fade derefter): navn **12,6:1**, antal 15,1:1 (1440 lys/mørk, 390). Fotoet er stadig synligt i flisens øverste ~40 %. Test regner kontrasten ud af selve CSS'en for alle positioner op til tekstens top (flisen er mindst 74 px høj).
- **maerker.html og kategorisider uden konsolfejl**: se overflow-/konsolkørslen nedenfor (maerker, type, kørekort, mærke, 0 fejl).

## Verifikation
- `npm test`: **651 pass / 0 fail** (645 + 6 nye i `js/annoncekort.test.js`).
- Nye testfiler, som Orchestratoren skal tilføje til `npm test` (package.json er ikke rørt): `scripts/slug.test.js` (6 tests), `scripts/smaating.test.js` (9 tests). Kør: `node --test scripts/slug.test.js scripts/smaating.test.js`.
- `node --check` på alle `js/ crawler/ scripts/*.js`: rent. `node scripts/synk-header.js --tjek`: rent. `node scripts/seo-audit.js`: 0 fund.
- Vandret overflow (`documentElement.scrollWidth > clientWidth`) og konsol: **0 afvigelser i 240 målinger** (15 sider/visninger × 8 bredder 320/360/390/768/1024/1280/1440/1920 × lys+mørk; forside, søgning gitter/liste/swipe, login, afmeld, mærke, mærker, type, kørekort, annonce ekstern + statisk, om, 404, forhandler; to uafhængige kørsler), **0 konsolfejl**. AA-kontrast målt for swipe-kortets nye elementer (kilde/sted 5,74 lys / 6,43 mørk, badge og kørekortpille 17,4 / 19,4, fotofejl-tekst 4,92 / 6,00).

## Åbne punkter
- Mærkesidens kort strækkes i højden (P3-5, "425 px med luft før bunden"): ikke rettet, hører til mærkesidens gitter, ikke til kortet.
- De 26 mærkesider og forhandler.html får `mk-wide`-fjernelsen/noindex-meta i deres build-output først ved Orchestratorens build (forhandler.html og maerker.html er ændret i hånden med den linje, generatoren ville skrive).
- `?v=`-/CSP-hash-stempling er ikke rørt (ingen inline-scripts ændret).
- Typebillede-fund (P2-2) er allerede løst i w3 (tomt felt med kameraikon); intet gjort her.
- Swipe-kortets `${l.year}` kan skrive "null" for en indekseret annonce uden årgang (findes i dag); ikke i opgaven, ikke rettet.
