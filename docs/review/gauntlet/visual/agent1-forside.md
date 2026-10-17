# Visual Fidelity Gauntlet, agent 1: forside, header og globale principper

Branch `gauntlet/w14-forside` (fra fefe1570). Reference: `Forside.png` (1672x941). Alle tal er målt i Chromium mod lokal mock
(smoke-browser; annoncefotos pegede på sitets egne `img/type`-fotos). Billeder: `agent1-forside/` (WebP, samlet ca. 2 MB).

## Acceptkriterier (skrevet før arbejdet; målt ved 1440x900 hvis intet andet)

| # | Kriterium | Mål |
|---|---|---|
| A1 | Samlet komposition: hele rækken hero, søgekort, tillid, udvalgte + sælg, typefliser, Sådan virker, tre kolonner skal stå tæt (referencen viser alt på ca. 810 px ved 1440) | tre kolonner begynder højst 1250 px nede (før: ca. 2150) |
| A2 | Header lav | højst 56 px på desktop (før 68) |
| A3 | Hero: foto lavt, tekst øverst til venstre, søgekortet hænger ind over fotoets underkant | hero slutter højst 320 px nede; søgekort højst 120 px højt og overlapper heroens underkant |
| A4 | Udvalgte: fem kort på én række + sælg-panel til højre, panelet starter ud for overskriften | kort højst 270 px; panel.left >= kort 5.right; panel.top <= overskrift.top+4 |
| A5 | Typefliser: syv fotofliser på én række | højde højst 80 px |
| A6 | Sådan virker (ejerens fokus): overskrift over fire trin på ÉN række med nummer, ikon, titel, tekst og pile; guide-boks til højre | trin på samme top (±6 px), stribe højst 140 px (før ca. 330) |
| A7 | Tre kolonner (mærker, kørekort, region): lige høje, region som fem fliser i en række | samme top og højde (±2 px) |
| A8 | Ingen regression: 0 vandret overflow 320/390/768/1024/1440 lys+mørk; CLS < 0,05; tap-mål >= 40 px; kontrast uændret (tokens) | smoke-browser --cls 0.05 --strikt: 0 fejl; js/w14-forside.test.js |
| A9 | Ægte data og funktion uændret (søgekort, kørekort-segment, mærke-/typefliser, favorit, cookie, tastatur, .data-afbrud, SEO) | ingen JS-/markup-ændring i index.html; kun CSS |
| A10 | Ingen opdigtede tal/påstande (12.842, anmeldelser, "tusindvis", kg, svartid) | kopieres ikke; W11-testen "ingen opdigtede påstande" grøn |

## Prioriteret afvigelsesliste (baseline mod Forside.png)

1. **Manglende moduler**: ingen. Alle moduler fandtes (hero, søg, tillid, kort + sælg, typer, Sådan virker, 3 kolonner). Mangler ift. billedet: "Bliv en del af fællesskabet"-boks (erstattet af ægte "Køb og sælg trygt"-guideboks), vægt-chip på kort (ingen vægtdata), kilde-etiket i kortfoden (findes i anden form).
2. **Forkert overordnet layout/komposition** (STØRSTE afvigelse): siden var 3860 px høj mod referencens kompakte ca. 810 px: hero 600 px (ref. ca. 245), søgekort 130 px med accentkant (ref. ca. 75), tillidsrække med ringe, kort 400 px høje (ref. ca. 175), fliser 136 px (ref. ca. 66), Sådan virker som fire store kort (ref. én smal stribe), tre kolonner med lange rækker.
3. **Informationshierarki**: store overskrifter (30 px) med accentstreg, referencen har små (ca. 18 px) overskrifter uden streg.
4. **Kort-/panelopbygning**: kort med 3:2-foto, pris under titel, to rækker chips; sælg-panel med foto i egen boks under teksten (ref.: foto bag panelet, knap forneden).
5. **Billedanvendelse**: hero-foto (studio-motorcykel uden rytter) kan ikke ombyttes (ingen ny asset); sælg-panelet bruger `img/sell-cruiser.webp` fladt.
6. **Proportioner/spacing**: sektionsluft 48-64 px (ref. ca. 12-16), 6-kolonne mærkegitter ok.
7. **Typografi**: h1 60-76 px (ref. ca. 40-44 ved 1440).
8. **Mikro**: header uden "Om Bikerbasen" før 1500 px.

## Hvad er lukket (CSS-only, `css/p-forside.css` + to linjer i `css/styles.css`)

- A1: siden er 2520 px (før 3861); de tre kolonner begynder ved ca. 1150 px (før ca. 2150). Hele flowet til og med typefliserne står inden for første viewport (900 px) minus et par fliser.
- A2/A3: header 54 px (via `--header-h`, global, 60 px under 1100); hero 232-270 px med h1 40-47 px; søgekort ca. 105 px, hvid flade uden accentkant; antal- og aktualitetslinjen ligger på én række under felterne (samme tekst).
- Tillidsrække: fire kompakte punkter, ikon uden cirkel (som billedet).
- A4: kort med 2,3:1-foto, titel + pris på samme linje (modelnavnet klippes ikke: op til to linjer), chips uden ikon, sammenlign-knappen i fotoets nederste venstre hjørne (rammer ikke hjertet); sælg-panelet står ud for overskrift + kort, med fotoet bag panelet og knappen forneden.
- A5: syv fliser på én række, 74 px høje.
- A6: Sådan virker er én stribe: overskrift øverst, derunder fire trin (nummer, ikon, tekst) med pile, guide-boks til højre; på mobil kompakte rækker (ikke store kort).
- A7: tre lige høje paneler; kørekort-celler centreret som i billedet (alderen står synligt, effekt-/kW-reglen står stadig i tooltip og på kørekortsiderne); region som fem fliser.
- Header: "Om Bikerbasen" i navigationen fra 1280 px (før 1500).
- Tests: `js/w14-forside.test.js` (nye, målende); `js/w11-forside.test.js` tærskler bevidst sænket (hero/CTA/felter/ikon/fliser/luft; accentstreg fjernet), begrundet i filens overskrift.
- `scripts/kritisk-manifest.json` regenereret (`node scripts/kritisk-gen.js`).

## Tilbageværende afvigelser (ærligt)

- Hero-motivet: referencens rytter-foto findes ikke som asset; heroen bruger det eksisterende motorcykelfoto. Komposition, højde og tekstplacering matcher, billedet ikke.
- Siden er stadig ca. 15-20 % højere end referencens proportioner ved samme bredde (mærkeplader og lange tillidstekster af juridiske/ærlige grunde; sektionsnoter under kort og fliser findes ikke i billedet; 40 px tap-mål gør sektionsoverskrifterne højere).
- Sådan virker: overskriften står over trin 1 (billedet: i trin 1's celle); fjerde trin er "Gå videre til sælger" (billedet: "Gem og sammenlign" - ingen sammenligning/gem-flow at love); "Bliv en del af fællesskabet" (ingen fællesskabsfunktion) er "Køb og sælg trygt".
- Kort: ingen vægtchip og ingen "Kilde: Forhandler"-tekst i præcis billedets form (kilde står som domæne + sælgertype nederst).
- Sælg-panelet: studiobillede af cruiser i stedet for rytterfoto.
- Region- og mærkefliser strækkes til panelhøjden (kørekortpanelet er højest) og har lidt tom luft.
- Accentfarve er orange (brand), ikke billedets grønne CTA (DESIGN_DNA: grøn kun til ✓).
- Mellem 768 og 1099 px (tablet) er layoutet den mildere, ældre variant (3 kort pr. række).

## Delte ændringer (bagudkompatible, skal flettes af Orchestratoren)

- `css/styles.css`: `--header-h` 68 -> 60 px, og 54 px fra 1100 px (global; alle sticky-offset bruger variablen); `.main-nav .nav-sek` vises fra 1280 px (før 1500). Alle genererede sider har indlejret kritisk CSS fra et tidligere build: **kør build (inline-critical) efter merge**, ellers fejler `scripts/w12-kritisk.test.js` (browser, 1440) på nav-boksen. Bekræftet: i en kopi udenfor repoet med `inline-critical.js` + `csp-hashes.js` kørt er alle 18 tests grønne.
- `css/p-forside.css`: kun `body.home`-scoped; ingen ændringer i kortkomponenten uden for forsiden.

## Verifikation

- `node --test js/w14-forside.test.js js/w11-forside.test.js`: grøn. Smoke: `node scripts/smoke-browser.js --sider index --viewports 320,390,768,1024,1440 --cls 0.05 --strikt`: 0 fejl, 0 advarsler.
- Kopi udenfor repoet med genkørt inline-critical: w10-fejl, w11-fejl2, w12-kritisk, w14, w11 grønne.
- Gate-resultat: se rapport (kørt til sidst).

## Billeder (docs/review/gauntlet/visual/agent1-forside/)

`reference.webp` (mockup), `foer-1440.webp`, `foer-390.webp`, `efter-1440.webp`, `efter-390.webp`, `efter-1440-moerk.webp`, `efter-390-moerk.webp`,
`sammenligning-1-hero-soegning.webp` (mockup | efter, øverst), `sammenligning-2-midtsektion-saadan.webp` (mockup | efter, kort/typer/Sådan virker/kolonner).
Billederne er WebP (ikke PNG) for at holde samlet størrelse nede.

---

# Iteration 2 (efter blind Critic: AFVIS mildt, forside 7/10, hero 6,5, Sådan virker 7,5, mellemsektion 6,5)

Kilde: `docs/review/gauntlet/visual/critic-agent1.md` (12 rettelser). Ny loop: render, side om side mod Forside.png, liste, implementér, render.
Nye billeder (alle i `agent1-forside/`, WebP, samlet ca. 2,3 MB): `sammenligning-1-hero-soegning` (mockup | efter, øverst), `sammenligning-2-kort-og-typer`,
`sammenligning-3-saadan-virker-og-kolonner`, `sammenligning-4-moerk-top`, `efter-1440`, `efter-1440-moerk`, `efter-390`, `efter-390-moerk`, `efter-1440-503`.
Mørk tema er målt med `data-theme=dark` sat via initScript (bb_theme), og de mørke billeder er faktisk mørke.

## Acceptkriterier for iteration 2 (målbare; testet i `js/w14-forside.test.js`)

| # | Kriterium | Test |
|---|---|---|
| B1 | Hero-foto viser horisont + motorcyklens forlygte/tank: synligt fotoudsnit starter højst 28 % nede og når mindst 60 % | `hero-fotoet viser horisont ...` |
| B2 | Typefliser viser hele motorcyklen (28-85 % af fotoets højde synlig), flise højst 110 px, scrim toner ud til gennemsigtig | `typefliserne viser hele motorcyklen` |
| B3 | Kort: modelnavn og pris klippes ikke (pris under titel); ⇄ skjult i hvile på hover-enheder, højst ét ikon pr. foto i hvile | `kortets titel og pris klippes ikke` |
| B4 | 503: ingen annoncetal synlige på fliser/mærker/kolonner, banneret ligger under heroen, sælg-panelet fylder rækken | `under fejlet lager (503) ...` |
| B5 | Mobil 390: søgekort højst 350 px (før 490), søgeknap synlig inden 700 px | `W14 mobil 390` |
| B6 | Tema-skift, mobilmenu (åbn/Escape) og cookie-dialog (vis/afvis) virker | `W14 funktion` |
| B7 | Regionsflise højst ca. 62 px, tre kolonner på samme linje og højst 240 px | `W14 desktop 1440` |

## Hvad er gjort (CSS i `css/p-forside.css`; én lille tilføjelse i `js/home.js`)

1. **Hero-foto**: `object-position` 50 % 50 % og hero 330 px (desktop): horisont, klitter, hel overkrop af motorcyklen med forlygte, styr, tank og forhjul er synlige; søgekortet dækker kun nederste del af forhjulet (som i mockuppen, hvor kortet dækker rytterens underkrop). Scrimmen er kun bag tekstblokken (74 % til 0 % over de første 56 % af bredden); nederste gradient halveret.
2. **Typefliser**: 104 px høje, `object-position` 50 % 68 %, så hele motorcyklen står i billedet; scrim kun nederst (0,84 til gennemsigtig ved 70 %). Over et helt hvidt foto er det yderste af navnelinjen ca. 4:1; over de faktiske beige studiofotos mindst 5:1 (se "Tilbageværende").
3. **Kort (kun `body.home .kort-raekke`)**: pris står under titlen, titlen er højst to linjer uden klip; ⇄ vises kun ved hover/fokus på hover-enheder (touch: synlig, som før); aktiv sammenligning forbliver synlig. Eksterne annoncer har ikke favorit-hjerte i hvile — det er en eksisterende produktregel (`fav = !f.ext && !isOwnListing`), uændret.
4. **Fejl/tomt lager**: tal på fliser, mærker, kørekort- og regionsceller og noter skjules via `html[data-lager-fejl]` (kilden til tallene er lageret selv — `js/home.js` fyldte dem fra `Store.getAllListings()`, som under delvis fejl indeholder en del af lageret; tallene vises nu ikke, mens fejlbanneret står). Banneret ligger nederst til højre på forsiden (ikke over heroens foto); funktion og tekst er uændret. En reserveret, tom kortplads får en ærlig tekst; er der slet ingen kandidater, fylder sælg-panelet hele rækken.
5. **Tre kolonner**: paneler højst ca. 190-240 px, regionsfliser 62 px (før 110), mærkefliser 78 px med logo + navn + antal tæt; panelerne er ikke længere strakt til lige højde (ingen hule felter).
6. **Sådan virker**: ikon 36 px, nummer 28 px med let skygge, pile i accentfarve, trintitel 14 px fed, tekst 12,5 px; stribe ca. 135 px. Overskriften står stadig over trinene (ikke i trin 1's celle).
7. **Mobil**: søgekort 2 kolonner (type|pris), kørekort-segment, én knap: ca. 340 px (før 490); tillidsrække 2 kolonner; lavere sælg-foto; side 5800 px (før 6146).
8. **Sælg-panel**: farvefoto i egen boks (ingen grå overlay), tekst over, knap under.
9. **Header**: uændret 54/60 px (koordinator: ret ikke yderligere).
10. **Kørekort "A"**: `A` peger bevidst på `soegning.html?koerekort=A`: tallet på fliserne er "ikke udelukket for A" (alle), mens `koerekort-a.html` kun viser annoncer med OPLYST effekt over A2-grænsen (to forskellige tal bag samme flise; det står i `js/home.js`). A1 og A2 peger på deres sider, og tallene stemmer med siderne. Ændres ikke uden en produktbeslutning.
11. Fodnoten under kortene er uændret (den er den ærlige forklaring på udvalget); den fylder to linjer.

## Tilbageværende afvigelser efter iteration 2 (ærligt)

- **Rytterfoto mangler**: heroen og sælg-panelet viser studio-/kystfoto af en motorcykel uden rytter. Mockuppens "imponerende" udtryk bæres af rytter + bro + solnedgang; det kræver et nyt foto (asset), som ikke findes.
- Typeflisernes navnelinje står på en mørk scrim nederst over hjulene; mockuppens fliser er brede landskabsbilleder med navnet i hjørnet. Vores studiofotos er næsten kvadratiske, så motorcyklens underkant ligger i scrimmen.
- Mobil: siden er 5800 px (mål var under 5000). Resten er footeren (ca. 1270 px), SEO-linkbåndet over footeren (ca. 800 px) og tre-kolonne-sektionen; de er ikke skåret væk (SEO-linkgraf, juridisk og ærlig tekst).
- Sådan virker: overskriften står over trin 1; "Bliv en del af fællesskabet" findes ikke (ingen fællesskabsfunktion).
- Kortene har ingen vægtchip og ikke mockuppens "Kilde: Forhandler" i identisk form.
- Hero er 330 px mod mockuppens ca. 245 px ved samme bredde, fordi motorcyklen skal kunne ses; header 54 px mod mockuppens ca. 35 px.
- Tre kolonner har ujævn underkant (højeste panel = kørekort).

## Ærlig vurdering "ligner mockuppen": 7,5/10 (komposition 8,5, fotografisk udtryk 5,5 pga. manglende rytterfoto, detaljegrad 7,5).

---

# Iteration 3 (efter Critic runde 2: AFVIS, forside 6,5, hero 5,5, Sådan virker 5, mellemsektion 6,5)

Kilde: `docs/review/gauntlet/visual/critic2-agent1.md`. Nye billeder (WebP, samlet ca. 2,1 MB, alle i `agent1-forside/`): `sammenligning-1-hero-soegning`, `-2-kort-og-typer`,
`-3-saadan-virker-og-kolonner` (mockup | efter), `-4-moerk-top`, `efter-1440`, `efter-1440-moerk`, `efter-390`, `efter-390-moerk`, `efter-1440-503`.

## Acceptkriterier (testet i `js/w14-forside.test.js`)

| # | Kriterium | Test |
|---|---|---|
| C1 | Sådan virker er et TONET bånd (primary-tint, ikke hvidt), bredde >= 900 px, ikon-cirkler >= 56 px, nummer-mærker >= 24 px, pile mellem trinene, stribe 120-175 px | `W14 i3: hero ... Sådan virker ...` |
| C2 | Hero højst 270 px; tillidsikoner >= 40 px i tonet cirkel | samme |
| C3 | Tre kolonner på samme linje, lige høje (±4 px), højst 240 px | `W14 desktop 1440` |
| C4 | Ingen mærkeflise dublerer navnet (synligt navn kun under emblem uden ordmærke) | `mærkefliserne dublerer ikke navnet ...` |
| C5 | Kørekortfliserne A1/A2/A peger på `koerekort-a1/a2/a.html`; alle fliser, der peger på en side, peger på en fil der findes og ikke er noindex | samme |
| C6 | Tap-mål >= 40 px på topnav, footer-links og genvejslisterne | `tap-mål >= 40 px på topnav ...` |
| C7 | Link-båndet og "Hvorfor Bikerbasen" er sammenfoldet (`<details id="mere-om">`), men står i DOM, og afstanden tre kolonner til footer er højst 160 px | `"Mere om"-laget ...` |

## Hvad er gjort

1. **Sådan virker (ejerens favorit):** tonet bånd (varm primary-tint; mørkt tema: 10 % accent på flade), overskrift i båndet, ikon-cirkler på 56 px (hvid/mørk flade, kant), nummer som orange hjørnemærke på cirklen, pile i accentfarve, fed trintitel. Trin 4 er stadig "Gå videre til sælger": "Gem og sammenlign" er IKKE en sandhed for alle annoncer, fordi indekserede annoncer ikke kan gemmes (`fav = !f.ext && !isOwnListing` i `js/components.js`); sammenlign findes, men er ikke et selvstændigt trin. Guide-boksen "Køb og sælg trygt" har nu et ægte landskabsfoto (crop af `img/hero-800.webp`) bag en grøn scrim fra venstre (ingen opdigtet fællesskabsfunktion).
2. **Hero:** 262 px (var 330); foto-crop uændret (horisont + forlygte/tank); h1 ca. 41 px. Tillidsrækken har 40 px ikoner i tonet cirkel og mere luft.
3. **Tre kolonner:** `align-items: stretch`, lige høje paneler; fliserne fylder og centreres. Mærkefliser bruger nu logoets EMBLEM-variant (`BrandLogos.logoHTML(..., { form: 'emblem' })`) med navnet som tekst under; mærker uden emblem (fx Harley-Davidson) viser kun logoet, som selv bærer ordmærket (navnet skjules med `visibility:hidden`, pladsen bevares, linket har aria-label). Ingen "Honda Honda" og ingen to-linjers Harley-Davidson. De godkendte logoer er ikke ændret.
4. **Konsistente links:** kørekortflisen A peger nu på `koerekort-a.html`, og tallet beregnes som målsiden gør det (kræver A og kan ikke effektbegrænses til A2): flisen hedder "Kræver A", og noten siger "A1/A2: ikke udelukket. A: kræver A." Scooter/Classic/Cross-fliserne peger bevidst stadig på søgningen: `type-scooter.html`, `type-classic.html` og `type-cross.html` findes som filer, men er `noindex, follow` (for få annoncer) og er ikke med i facet-linkene, så de linkes ikke fra forsiden (testen låser det).
5. **Ekstra lag fjernet fra første blik:** "Hvorfor Bikerbasen", "Mere om kørekortet" og det store link-bånd ligger nu i ÉN sammenfoldet `<details id="mere-om">` lige over footeren ("Mere om Bikerbasen, kørekortet og alle genveje"). Al tekst og alle links står stadig i DOM (SEO). Siden er 2055 px lang på desktop (før 2650) og ca. 4470 px på 390 (før 5800).
6. **Noter:** noten under Udvalgte og Typer er én linje (hele teksten i `title` og i DOM).
7. **Tap-mål:** topnav >= 40 px, genvejslisternes links og overskrifter >= 40 px (footer-links var allerede 40).

## Tilbageværende afvigelser (ærligt)

- **Rytterfoto mangler** (asset): hero og sælg-panel er studio-/kystfoto uden rytter. Største resterende afvigelse; ikke løst med CSS.
- Hero 262 px mod mockuppens ca. 245 px; header 54 px mod ca. 35 px.
- Mockuppens fællesskabspanel med bjerg/vej er erstattet af "Køb og sælg trygt" med et ægte landskabscrop (ingen SVG-illustration; ingen fællesskabsfunktion at love).
- Sådan virker trin 4 er "Gå videre til sælger" (se ovenfor); overskriften står i båndet over trin 1, ikke i trin 1's celle.
- Hjertet vises ikke i hvile på indekserede kort (ikke gemmebare, produktregel); ⇄ vises ved hover.
- Typeflisernes scrim: navnelinjen står over hjulene (studiofotos er næsten kvadratiske).
- Region-/mærkefliser er høje (ca. 100 px) fordi de fylder panelet til lige højde; mærke- og kørekortpaneler er mere indholdsrige end regionspanelet.
- Kortene har ingen vægtchip; kilden står som domæne + sælgertype.

## Gate

`npm run gate` (uden build): node --check, synk-header, seo-audit, sitemap, døde links og udgiv er OK. To røde trin er kendte: (2) `npm test`: kun `scripts/w12-kritisk.test.js` (committede sider har ældre indlejret kritisk CSS; grøn i en kopi efter `inline-critical.js` + `csp-hashes.js`); (7) `package.json` "test" mangler `js/w14-forside.test.js` (Orchestratorens fil).
Smoke `index` 320/390/768/1024/1440 lys+mørk `--cls 0.05 --strikt`: 0 fejl, 0 advarsler (kørt to gange).

## Ærlig vurdering "ligner mockuppen"

Forside som helhed 7/10 | hero 6/10 (struktur og tekst rigtigt; motivet uden rytter trækker ned) | Sådan virker 7,5/10 | mellemsektion (typer + kolonner + panel) 7,5/10.
