# Critic — samlet site-review efter parallel design-udrulning

Blind Critic, frisk kontekst. HEAD 6b80a0a (gauntlet/master = main) mod baseline 72090b0 (worktree udenfor repoet, egen port). 69 HTML-sider (baseline 64). Playwright på renderet DOM, viewport-screenshots læst. Rå data og scripts: `C:\Users\pasca\Desktop\crit\s\` (udenfor repoet). Intet i produktionskode ændret; `_site/` (gitignoreret) er genbygget af `udgiv.js`.

## Dom: IKKE KLAR til fortsat drift på main (1 x P1, flere P2)

Funktionelt, juridisk og SEO-mæssigt er udrulningen ren. Designet ligger meget tæt på billederne (forside, A2, guide). Det der holder den tilbage er det delte header-lag og at hver familie har sin egen containerbredde.

## 1. Faktatabel

| # | Krav | Resultat | Måltal |
|---|---|---|---|
| 8a | `npm test` | PASS | 490 pass / 0 fail |
| 8b | `node scripts/udgiv.js` | PASS | "Alle referencer … peger paa filer, der er med"; css 417→279 KB, js 856→489 KB minificeret |
| 8c | `node --check` js/ crawler/ scripts/ | PASS | 0 fejl |
| 8d | `node scripts/build.js` | IKKE KØRT | ville skrive produktionsfiler; Orchestrator bør køre den |
| 2a | Døde interne links (69 sider, renderet) | PASS | 0 døde, 0 absolutte egne-domæne-links |
| 2b | Mistede interne links vs baseline | PASS | ingen side mister >2 indgående; forside bytter `soegning.html?type=`/`?regions=` ud med type-/region-sider (forbedring) |
| 2c | Forældreløse sider | PASS (forventet) | kun 404, afmeld, dashboard, forhandler + 2 statiske annoncesider. Nye guides 12–66 indgående, koerekort-a 12 |
| 2d | Sitemap | PASS | 43 URL'er (baseline 38; +koerekort-a, guides, 3 guide-sider). Alle har fil, 0 noindex, canonical = URL (undtagen forside: `https://bikerbasen.dk` vs canonical `…/` — kosmetisk). Alle indekserbare sider er i sitemap. Live bekræftet: 43 `<loc>`, alle 200, robots.txt uændret |
| 2e | Redirect-kæder | PASS | `/guides` og `/guides.html` svarer begge 200 uden redirect (kendt S-003, samme som baseline) |
| 4a | Title ≤60 / unik | 2 x FAIL (P3) | `guide-a2-koerekort` 62, `opret-annonce` 61 (samme 61 i baseline). Dubletter: dashboard/login/mine-annoncer ("Log ind"), alle noindex, identisk med baseline |
| 4b | Description | PASS | alle findes; `om-bikerbasen` 165 (uændret). Dubletter: om-indeksering = vilkaar (baseline) |
| 4c | Ét h1, JSON-LD parser, OG/Twitter | PASS | 69/69 ét h1, 0 JSON-LD-fejl, OG 5/5 og Twitter 3/3 overalt. Guides: Article+BreadcrumbList, forfatter = Organization "Bikerbasen" (ingen opdigtet person) |
| 4d | Titler/descriptions/canonical/robots/h1/JSON-LD/OG ændret på eksisterende sider | PASS | 0 ændringer på de 64 baseline-sider |
| 4e | hreflang | n/a | ingen, som baseline |
| 4f | CSS render-blokerende | NOTE | 1 → 2 filer pr. side (styles.css + p-<familie>.css 16–25 KB). Forside/tekstsider 1 fil. Kilde: styles.css 255 KB (baseline 273 KB) |
| 4g | JS pr. side | NOTE | +5 til +25 KB (soegning 463→481 KB, annonce 662→667, forhandler 556→565, dashboard 511→527) |
| 4h | Billedvægt | NOTE | forside 130→269 KB (11 typefliser/foto), koerekort-a 250 KB, region 210 KB; guide 168 KB |
| 4i | LCP/CLS (lokalt, uden throttling) | PASS | CLS ≤0,015 på alle familier udover opret desktop 0,065 (baseline 0,003). LCP 0,4–1,8 s lokalt; forside LCP gentaget 4 x pr. server: 384–720 ms på begge (første kolde load 1684 ms på HEAD er outlier). Mobil 390: CLS ≤0,004 |
| 6a | Overflow 33 sider x 7 bredder x lys/mørk (462 kombinationer) | 2 intermitterende FAIL | kun `header-actions` ved 1024/1100: scrollWidth 1164 (se P1-1). Alt andet scrollWidth==clientWidth |
| 6b | Header ved 320 | PASS | scrollWidth 320 med og uden JS (efter load). De 333 px før JS ses kun midlertidigt, før CSS er parset (DCL-måling 604–2568 px uden stil); siden scroller ikke |
| 6c | WCAG AA-kontrast, 13 sider x 2 temaer, alle tekstnoder | PASS | mørk: 0 fejl. Lys: 0 fejl på flade baggrunde; 6 kombinationer = hvid tekst oven på foto (typefliser/CTA-panel på forside, mærke, type), automatisk ikke-målbart, visuelt læsbare |
| 6d | Tastatur/fokus/landmarks | PASS | skip-link "Gå til indhold" på 68/69 (kun 404 uden), målet findes overalt; fokusring synlig på alle målte Tab-trin (14 pr. side, 5 sider); mobilskuffe: aria-expanded, fokus ind, Escape lukker, fokus tilbage til knap (5 sider); ét `main` overalt |
| 1a | Header+footer identiske | PASS | header 1440x68 og footer 436 px høj på 68/68 sider (404 har hverken header eller footer); samme 8 menupunkter; tema bevares på alle 11 testede sider |
| 1b | Aktiv menu-markering | FAIL (P2) | kun 6 sider markerer (soegning, maerker, guides, koerekort-a1/a2, om-bikerbasen) |
| 1c | Containerbredde/flugt | FAIL (P2) | se sektion 3 |
| 3a | Forside-søgekort → søgning | PASS | `soegning.html?q=Honda&koerekort=A2` → 35 fund, chips "Honda", "Kørekort A2" |
| 3b | Søgning → annonce → kilde | PASS | kort → `annonce.html?id=…` → "Gå til annoncen hos MC Syd" (mcsyd.dk, ny fane) |
| 3c | Mærke/type/kørekort/region → søgning, antal | 2 FAIL (P2) | se P2-2 |
| 3d | Sammenlign/favoritter på tværs | PASS | bjælken "2 valgt" bevares på mærke/type/guide/forside; modal åbner, Escape lukker; favorit i localStorage |
| 3e | Cookiebanner | PASS | modal `<dialog>` 544x319 med "Kun nødvendige"/"Accepter alle" på alle 12 sidetyper; 404 viser ingen |
| 3f | 404 | NOTE (P3) | eneste side uden header/footer/tema/skip-link; samme som baseline (1-linjes diff) |
| 7a | Eksterne annoncer: kun tilladte felter | PASS | annoncesiden viser mærke, model, årgang, km, type, ccm, hk, kilde, sted, deeplink; "Vi gemmer ikke kildens tekst eller billeder"; 0 gallerier, 0 kontaktdata. (hk/type som i baseline) |
| 7b | Claim/crawler/robots | PASS | `crawler/`, `sources/`, `supabase/`, `robots.txt` diff mod baseline = 0. `dashboard.js` ændret kun til faner (Krav-fane), ikke til claim-logik; `supabase-api.js`/`backend-bridge.js` uændrede |
| 7c | Opdigtede tal/påstande | PASS | intet af "12.842", "120.000+", "3x", stjerner, svartid, "autoriseret", social login, beskeder, visninger i renderet tekst på alle 69 sider. Guides kilder: retsinformation (BEK nr. 550 af 19. juni 2026), borger.dk, fstyr.dk |

## 2. Fund

### P1
**P1-1. Headeren løber vandret over (72–301 px) ved 1024–~1345 px, når der findes en favorit eller man er logget ind. Regression.**
Delt lag (`css/styles.css` / `components.js`), alle sider.
Repro: sæt `localStorage.bb_favorites='[1032]'`, åbn en side ved 1024 px: scrollWidth 1096 mod 1024 (`.header-actions` højre kant 1096, "Favoritter"-linket 114 px). Baseline 72090b0 samme setup: 1024 = 1024.
Med logget-ind forhandler (`bb_user` isDealer + 1 favorit): 1024 → 1325 (+301), 1280 → 1345 (+65). Uden favorit ses det intermitterende (1 af 24 loads ved 1024, +140 px, "Favoritter" vises kortvarigt). Det er iPad-vandret og små laptops.
Anbefaling: skjul "Favoritter"-teksten (kun ikon+tæller) under ~1360 px, eller kollaps nav-items til skuffen under 1360 i stedet for 960.

### P2
**P2-1. Header og indhold flugter ikke (px, 1440 viewport, venstrekant af indhold; header-logo 132 / højrekant 1308 på alle undtagen forside).**
| Side | Header | Indhold | Forskel |
|---|---|---|---|
| Forside | 32–1408 (container--wide 1480) | 32–1408 | flugter, men headeren hopper 100 px bredere end ALLE andre sider ved navigation |
| Søgning | 132–1308 | hero 132–1308; filter-sidebar 72, resultater til 1368 (so-wrap 1360) | 60 px ud på hver side |
| Annonce | 132–1308 | 32–1408 (container 1440) | 100 px |
| Mærke (Yamaha) | 132–1308 | rækken "Yamaha motorcykler…" starter x=24, kort til 1416 (mk-wide 1456) | 108 px, kort stikker længere ud end søgekortet |
| Kørekort/type/region/model | 132–1308 | hero 132; ved ≥1560 px 292–1703 (fa-krop 1400) mod header 372–1548 ved 1920 | op til 80–120 px ved 1920 |
| Guides | 132–1308 | 132–1308 | flugter |
| Login | 132–1308 | kort 100–1340 | 32 px |
| Tekstsider (om/vilkår/sikkerhed) | 132–1308 | smal midterkolonne 310–1130 / 360–1080 / 380–1130 | tre forskellige kolonnebredder (820/720/820) og h1 venstre 380/360/400 |
Ved 1920: header 372–1548, forside 252–1668, annonce 272–1648, facet 292–1703.
Anbefaling: én `--container`-token (1240 inkl. padding) overalt, header og indhold samme; brug 1480 kun til fuldbleed baggrunde.

**P2-2. Tal der ikke stemmer på tværs.**
- `maerke-yamaha`: "49 brugte Yamaha … Se alle 49 Yamaha i søgningen" → `soegning.html?brands=Yamaha` viser 55 (49 indekseret + 6 andre). Honda 276 → 282. (V-012 fra detective, ikke løst på de nye sider.)
- Forside "Udforsk efter kørekort": "A — Alle mc — 655 annoncer" → `koerekort-a.html` siger 411 ("hkMin=48"); `soegning.html?koerekort=A` giver 655, siden bruger `hkMin=48`.
- Søgning med 0 fund: hero siger stadig "655 motorcykler til salg i Danmark" lige over "0 motorcykler fundet".

**P2-3. Logget-ind header ser ødelagt ud ved 1440.** Menupunkterne "Artikler & guides", "Om Bikerbasen", "Mine annoncer" (og "Dashboard" for forhandlere) brydes over to linjer ved siden af brugerchippen "Test · Log ud" (screenshots mock-mine-annoncer/mock-dashboard). Baseline havde 4 korte punkter. Samme container (1240) ved alle bredder, så det rammer alle logged-in brugere. Header-højden er stadig 68.

**P2-4. Aktiv menu mangler på størstedelen af siderne.** `renderHeader` matcher kun eksakt href. Ingen markering på maerke-* (26), type-* (8), region-* (5), model-* (6), guide-* (3), koerekort-a, annonce. Ingen `aria-current` nogen steder. Mærker/Kørekort/Guides-sektionen bør markeres på undersiderne.

**P2-5. To forskellige annoncekort.** Forside: "card-rich" 212x263, pris 14,5 px på titellinjen. Søgning/mærke/type/kørekort/annonce-lignende: 204–453 px brede, pris 22 px over titel, chips for årgang/km/ccm, kilde nederst. Interne forhandlerkort ("FORHANDLER", "Ingen fotos i denne annonce") har en tredje anatomi med ikonrækker. Mærkesiden blander 215 og 453 px brede kort i samme side.

**P2-6. Login: dobbelt panel.** Højre cremefarvede kort (617–1087) ligger inde i et halvgennemsigtigt panel der fortsætter til 1340; ser ud som to lag der ikke passer. Venstre kort starter x=100, header-logo x=132.

### P3
- Kørekort-dropdownen i headeren har kun A1 og A2; `koerekort-a` (ny) mangler i menu og i footer. Footer har heller ikke "Artikler & guides" (kun hovednav).
- Label-stil: forside/søgning bruger fed sentence-case ("Mærke eller model"), mærke/type/kørekort bruger små VERSALER og "Kørekort" står i almindelig stil i samme kort.
- h1 findes i 7 størrelser: 26 (søgning, mærke), 32 (tekstsider), 40 (annonce), 42, 48, 50, 56 px.
- Typesidens hero (`type-sport`): fritlagt cykel i hvid vignet-skive; i mørk tilstand en lys disk på sort (mobil især). Mærke/kørekort/guide bruger det delte foto.
- Intern forhandlerkort: "Kørekort Kørekort A" (label dubleret).
- Forside hero: ét og samme foto bruges på forside, søgning, mærke, kørekort, guides, dashboard (billedernes rytter-foto findes ikke).
- 404 og afmeld.html mangler header/footer (404 uden tema); tekstsiderne (om, vilkår, sikkerhed, privatliv) ligner stadig det gamle site.
- Guide "Udvalg pr. 24. august 2026" i en guide opdateret 15. oktober (ærligt, men gammelt).
- Forside: 7 annoncelinks mod 16 i baseline (5 kort); intet SEO-tab pga. type-/mærke-links.
- Title 62 tegn på `guide-a2-koerekort`; description 165 på `om-bikerbasen` (uændret).

## 3. "Sammenklistret"-listen
1. Headeren er 1176 px bred (indhold) på alle sider undtagen forsiden, hvor den er 1376: logoet og knapperne hopper 100 px ved klik Forside ↔ resten.
2. Søgning: hero/søgekort 132–1308, men filtre fra 72 og resultater til 1368.
3. Annonceside: breadcrumb og indhold 32–1408 under en header der er 132–1308.
4. Mærkeside: søgekort 132–1308, kortrækken lige under 24–1416.
5. Kørekort/type ved 1920: hero lige med headeren, resten 80 px bredere ud.
6. Tekstsider: smal 720/820-kolonne med h1 32 px, ingen hero — ser ud som en anden hjemmeside.
7. Login: to paneler oven på hinanden i forskellig bredde.
8. Header når man er logget ind: tekst brydes i to linjer.
9. Tre annoncekortsformer og tre labelstile i samme hero/søgekort-komponent.

## 4. Slutscore pr. familie (lys, 0–5, mod billedet)
| Familie (billede) | Score | Begrundelse | 3 vigtigste skridt |
|---|---|---|---|
| Forside (1) | 4,5 | Hero, overlappende søgekort, tillidsrække, 5 kort + CTA, typefliser, Sådan virker, tre kolonner: næsten 1:1. Ingen opdigtede tal | 1) ens header-bredde med resten; 2) A=655 vs 411; 3) rytter-foto/typefliser med bedre kontrast |
| Søgning (2) | 4,0 | Chips, filter-sidebar, sortering, grid/liste, 4 kolonner | 1) flugt sidebar/resultater med header; 2) h1 er 26 px (billedet ~40); 3) fjern "655" over "0 fundet" |
| Annonce (3) | 3,5 | Galleri, faktatabel, sælgerboks, tjekliste. Kun toppen vurderet visuelt | 1) containerbredde 1376 → header; 2) "Kan du køre denne?" og "Det bør du tjekke" tæt på billedets placering; 3) ens lignende-kort |
| Opret (4) | 4,0 | Trinbar, live-forhåndsvisning, tips-bokse | 1) CLS 0,065 desktop; 2) 4 trin mod billedets 5 er ok men tjek rækkefølge; 3) tips-boks tættere på feltet |
| Mine annoncer/dashboard (5) | 3,5 | Hero, faner, KPI-kort, Min konto-panel, Sælg hurtigere | 1) logget-ind header brudt; 2) annonce-rækker med billede/handlinger; 3) tomme KPI'er vises som "0" |
| Login (6) | 3,5 | To kolonner, foto, ingen social login (korrekt) | 1) enkelt-panel i header-bredde; 2) cyklen/fotoet må ikke dække kortet; 3) h1-størrelse ens |
| Kørekort A2 (7) | 4,0 | Hero, ikonrække, søgning, udvalg, guide-CTA, region | 1) 292/372-forskel ved 1920; 2) manglende "Populære modeller"-række; 3) A i menuen |
| Type Sport (8) | 3,5 | Struktur, stat-panel, søgning, kort, tillidsrække | 1) hvid vignette-disk; 2) hero uden rytterfoto = anden stil end resten; 3) blandede kortvarianter (forhandlerkort uden foto) |
| Mærke Yamaha (9) | 3,5 | Hero, søgekort, tillid, kortrække, CTA-panel | 1) flugt 24–1416 mod 132–1308; 2) 49 vs 55; 3) label-stil + 215/453-kort |
| Guide (10) | 4,0 | Indholdsfortegnelse, Kort fortalt, kilder, CTA | 1) h1 56 px bryder i 3 linjer; 2) populære motorcykler i sidepanel; 3) "Udvalg pr. 24. aug." |

Familier der stadig ligner det gamle site: tekstsider (om-bikerbasen, vilkaar, sikkerhed, privatlivspolitik, om-indeksering), 404 og afmeld.

## 5. Prioriteret handlingsliste
1. P1-1: ret header-overløb 1024–1345 (favorit/logget ind) i delt lag; test igen med `bb_favorites` og `bb_user`.
2. P2-1: indfør én containerbredde; ret forside-header, so-wrap, p-annonce, mk-wide, fa-krop, p-login.
3. P2-3 + P2-4: logget-ind header og aktiv-markering med prefix-match (maerke-, type-, guide-, region-, model-, annonce) + `aria-current="page"`.
4. P2-2: samme tal på mærkeside og søgning (tæl samme mængde eller ændr tekst); forside A-tile = koerekort-a.
5. P2-5/P2-6: ét annoncekort-komponent, login-panel.
6. P3: menu med "Kørekort A", footer med guides, titler >60, labelstil, 404/afmeld med header og tema.
7. `node scripts/build.js` skal køres af Orchestrator før næste deploy (ikke kørt her).

## Kilder/begrænsninger
Alle målinger lokalt (8700, HEAD) og 8741 (baseline). Live (maks. 1 req/s): sitemap, robots.txt, 43 URL'er = 200, canonical til stede. Login-sider mocket med localStorage og `page.route` (Supabase blokeret); ingen konti oprettet, intet skrevet til produktion. Annonceside og opret kun set i toppen; `build.js` ikke kørt.
