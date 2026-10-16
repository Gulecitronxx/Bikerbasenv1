# Critic w4-smaating (blind, uafhængig)

Branch `gauntlet/w4-smaating` (HEAD 9b8869e) mod baseline 3caffd2. Alt kørt på `git archive`-kopier i temp (`...\Temp\critic-w4b\new|base`, node_modules via junction), mock-fetch via `page.route` (ingen produktionslæsning), dev-servere 8783 (ny) / 8784 (baseline). Worktree og hovedmappe er ikke rørt. Scripts ligger udenfor repoet (scratchpad).

## Dom: ACCEPTER (ingen P0/P1). Ét P2 anbefales rettet (knækpunktet), ét P2 er kendt og uløst ("null"-årgang).

## Samlet bevis
| Krav | Resultat |
|---|---|
| `npm test` | 651 pass / 0 fail |
| `node --test scripts/slug.test.js scripts/smaating.test.js` | 15 pass (ikke i `npm test`, `package.json` er uændret) |
| `node --check` alle js/crawler/scripts | rent |
| `seo-audit` | 82 sider, 56 indekserbare, 0 fund |
| `synk-header.js --tjek` (kopi) | "alle sider har samme header og footer som index.html", kode 0 |
| Overflow (`documentElement`) 21 sider x 8 bredder (320-1920) x lys+mørk = 336 målinger, ny og baseline | 0 / 0 |
| Konsol | 0 fejl udover CSP-img for min egen mock-vært `mcsyd.dk/foto` (mit mock-valg, ikke koden) |
| Ændrede rod-HTML ift. baseline | kun `afmeld.html`, `forhandler.html`, `maerker.html` |
| SEO-signatur (title/h1/canonical/robots/description/JSON-LD) alle 82 rod-HTML | kun `forhandler.html`: robots `null` -> `noindex, follow` (tilsigtet). `sitemap.xml`, `robots.txt` byte-ens |

## 1. Kørekorttekst / swipe
213 annoncer (12 ccm x 16 hk x egen/ekstern + kantcases) renderet i gitter, liste og swipe i både ny og baseline.

| Måling | Udfald |
|---|---|
| `koerekortMaerkat` (kode, tekst) ny vs baseline | 213/213 ens; `components.js` diff rører ikke funktionen. Logik uændret |
| Gitter-tekst ny vs baseline | 213/213 ens |
| Liste-celle (sidste `dd`) og swipe-badge vs gitter | 0 afvigelser (liste = gitter uden ordet "Kørekort"; swipe = gitter ordret) |
| Fordeling | Mulig A1 16, Mulig A2 90, Kræver A 33, ikke afgjort 68, ukendt 6 |
| Kanter | 125cc/15hk Mulig A1; 125/16 A2; 126/15 A2; 124/- og 125/- ikke afgjort; 600/47 A2; 600/47,5 og 600/48 Kræver A; -/- ukendt; -/47 A2 |

Bemærkninger: koden kender kun ccm og hk (A1_MAX_HK 15, A2_MAX_HK 47). kW/kg og "afledt >2x" er ikke modelleret nogen steder, så de kan ikke afvige. Baseline viste ingen swipe-badge ved "ikke afgjort"; nu vises den (ærligt, ikke logikændring).

- Swipe-bundlinje: sted + sælgertype/kilde (`Roskilde | Roskilde Motorcykler ApS`, `Aarhus | guloggratis.dk`, `Roskilde | Privat sælger`). Kun regel-2-felter. Ingen overflow, `fod` 32 px, kk-badge og Forhandler-flag overlapper ikke ved 320/360 (også "Kørekort ikke afgjort", 150 px, 1 linje).
- **"null" ved manglende årgang bekræftet**: `swipeCardHTML` giver `meta = "nullKm ikke oplyst..."` ved `year:null` og `"undefined5 km..."` ved `year:undefined` (se P2-2).
- `markerFotoFejl` i liste/swipe: virker. Mislykket foto, 3 visninger, kortbredde 104-418 px (gitter 219-356): ét `<p>` ("Fotoet kunne ikke hentes hos kilden"), ingen ikon bag teksten (0 overlap), ingen klipning, ingen knækket ikon. 1 linje (219 px kort: 2 linjer balanceret).

## 2. Titel/pris-knækpunktet (P2-1)
Sweep: viewport 320-1920 i trin á 8 px (ændring uden reload), soegning/forside/mærkeside, alle kolonneantal, på de rigtige kort.

| Side | Kortbredde -> tilstand | Viewports ved knækket |
|---|---|---|
| soegning | 264 stablet, 266 side om side (2 linjers titel) | 576->584, 888->896, 1192->1200, **1472->1480** |
| soegning | **alle viewports 1480-1920: kort = 266 px**, dvs. 4 px over grænsen | 1440 (254-256) er stablet, 1920 side om side |
| forside | 264 / 266 | 352->360, 880->888, 1176->1184 |
| mærkeside | 264 / 266 | 576->584, 888->896, 1168->1176 |

- Ingen kort har *samme* bredde i begge tilstande, intet overlap, ingen afskåret titel. Tilstanden er konsistent pr. række.
- **Builderens begrundelse holder ikke**: "ingen kort ligger nær grænsen" er målt kun ved 390 og 1440. Hele desktopintervallet 1480-1920 på søgesiden ligger 4 px over grænsen; med en lodret scrollbar eller sidebjælkeændring på få px flipper hele siden. Layoutet springer mellem 1472 og 1480 (screenshots k1472/k1480: priser flytter fra under til ved siden af titlen, "Royal Enfield Himalayan" bryder til 2 linjer, rækkehøjder bliver ujævne).
- Side om side lige over grænsen er *dårligere* end stablet: titlen får kun ca. 85 px (søgning) / 46 px (mærkeside, mindste) og bryder på 2 linjer i 266-286 px kort.
- Forslag (simpelt, ét knækpunkt bevares): hæv grænsen til ca. 300 px, så 266-290 px kort stabler som 254-256 gør; eller sæt kolonnebredden så den aldrig lander på 264-268.

## 3. Login-strimlen (x-koordinater, lys og mørk identiske)
| Bredde | logo | kort | strimmel-kasse | første ikon | footer-gitter |
|---|---|---|---|---|---|
| 1024 | 32 | 32..992 | 32..992 | 32 | 32..992 |
| 1280 | 32 | 32..1248 | 32..1248 | 32 | 32..1248 |
| 1440 | 32 | 32..1408 | 32..1408 | 32 | 32..1408 |
| 1920 | 252 | 252..1668 | 252..1668 | 252 | 252..1668 |
| 2560 | 572 | 572..1988 | 572..1988 | 572 | 572..1988 |

Ensrettet. 0 overflow 320-1920 lys+mørk.

## 4. afmeld.html
- Footer: identisk link-gitter, tema-knap virker (tema `null` -> `dark` ved klik), 0 overflow, 0 konsolfejl, 390 px.
- `synk-header.js`: ændret footerlink i afmeld -> `--tjek` melder afvigelse (kode 1) -> skrivende kørsel retter filen byte-identisk med original (blandede linjeskift bevaret). Alle andre HTML urørt.
- `scripts/info-tekst.test.js` og `forside.test.js` grønne (indgår i npm test).
- Flow mod mock:

| Case | Kald | Overskrift |
|---|---|---|
| token ok (`true`) | 1 (`{"p_token":"GOOD"}`) | Du er afmeldt |
| token ugyldig (`false`) | 1 | Der kommer ikke flere mails |
| netværksfejl (abort) | 1 | Vi kunne ikke afmelde dig lige nu |
| HTTP 500 | 1 | Vi kunne ikke afmelde dig lige nu |
| uden token | **0** | Linket mangler en kode |
| tom `?token=` | **0** | Linket mangler en kode |

## 5. `scripts/slug.js` (VIGTIGST)
- **Regenerering fra egne data**: 45 committede `model-/maerke-/by-/mc-/budget-/region-`-filer (de data-attribut-baserede; budget/type/koerekort/region er faste navne, region verificeret manuelt) regenereret med både NY og GAMMEL slugify: 0 afvigelser, 0 flyttede adresser. `listingSlug` for de to committede annoncesider uændret (`annonce-harley-davidson-flhx-2007-541ad405.html`).
- **Server vs klient**: 92 mærke/model-kombinationer (inkl. NFD, ü/Å/ß/ǅ/Ł/İ) giver identisk slug i `shared.listingSlug`, `js/seo.js listingPageUrl` og `js/home.js` (ny ≡ klient). Ingen glemt kopi: ingen anden `ø->oe`-kode i js/crawler/scripts (grep). `maerke-*`-links i forsiden bruger samme regel som generatoren.
- **245 input mod GAMMEL slugify** (Harley-Davidson, Moto Guzzi, Royal Enfield, FB Mondial, Zündapp, Kreidler, Laverda, Husqvarna, 'Ducati Monster 821', 'BMW R 1250 GS', 'Yamaha XSR 700', æ/ø/å, apostrof, punktum, skråstreg, tal, NFD-former m.m.). **Alle input hvor ny != gammel indeholder et tegn, som før blev til bindestreg** (accent/ß/NFD). Ingen ASCII/æ/ø/å-navn ændrer sig:

| Input | gammel | ny |
|---|---|---|
| Zündapp KS 50 | z-ndapp-ks-50 | zundapp-ks-50 |
| Citroën 2CV | citro-n-2cv | citroen-2cv |
| Peugeot Métropolis | peugeot-m-tropolis | peugeot-metropolis |
| Škoda Motor | koda-motor | skoda-motor |
| MV Agusta Brütale 800 | mv-agusta-br-tale-800 | mv-agusta-brutale-800 |
| Yamaha Ténéré | yamaha-t-n-r | yamaha-tenere |
| Straße / Weiß | stra-e / wei | strasse / weiss |
| Bär (a+ring/umlaut i NFD), Å i NFD | ba-r / a | bar / aa |
| Ł, ł, Þ, œ, ı (ikke foldet af NFD) | tabes (bogstav forsvinder) | uændret forsvinder (samme som før) |

Ingen af de berørte adresser findes committet i dag, så ingen eksisterende URL flytter sig (kun sider genereret *fremover*). Fald i `Zündapp`/`Zundapp` slås sammen i én slug (samme mekanisme som "Royal Enfield"/"Royal-enfield").

## 6. forhandler.html noindex
- Kørt `build-meta.js` på en kopi: `forhandler.html` **byte-identisk** med den håndskrevne fil (ingen diff). (De øvrige genererede sider afviger i kopien af ældre, ikke-w4-grunde.)
- Ikke i sitemap (0 forekomster, uændret fil), `js/forhandler.js:309` sætter allerede `noindex, follow` i JS, så skabelon+JS er nu konsistente.
- Fjernelsen af `dealerUrls` fra sitemap er en korrekt retning: de brød noindex-signalet. Egne annoncers statiske sider (`listingUrls`) er stadig i listen (kun `harEgenSide`), så den indvending er ikke gyldig. Intet andet bruger `dealerUrls`.
- Stale kommentar (P3-1): `build-brand-pages.js` ca. 1465-1473 siger stadig "…så den hører til i sitemappet".

## 7. h1 / scrim
- h1 ny vs baseline (alle 21 sider x 8 bredder): kun tekstsider/404/afmeld ændrer sig (56/44 -> 50 ved 1440, 28 ved ≤768); mærkeside/annonce/login uændret. Linjer ved 320: om/vilkår/sikkerhed/privatliv/om-indeksering/404 = 1 linje, afmeld 2 linjer; ingen overflow, ingen h1-klipning, aldrig ≥3 linjer på de ændrede sider (forsiden 3L ved 320 er baseline og uændret).
- Bemærk (P3-2): ved 768 går tekstside-h1 fra 41 -> 28 px og ved 1024 fra 55 -> 37 px (token-kurven; 28 px er småt for et hero på tablet).
- Forsidefliser, pixelvis (tekst gjort gennemsigtig, lyseste pixel i label-boksen, første 5 synlige fliser; 6.-8. dækkes af rullepilen/udtoningen ved 1440):

| Foto | Tema | Bredde | navn ny (baseline) | antal ny (baseline) |
|---|---|---|---|---|
| helt hvidt | lys | 390 / 1440 / 1920 | 13,0 / 13,0 / 13,2 (3,95 / 3,81 / 4,11) | 15,4 (14,3) |
| helt hvidt | mørk | 390 / 1440 / 1920 | 16,4 / 16,4 / 16,6 (8,5) | 17,7 |
| normalt | lys | 390 / 1440 / 1920 | 13,7 / 14,3 / 14,5 (4,47 / 5,10 / 5,41) | 16,2 |
| normalt | mørk | 390 / 1440 / 1920 | 13,7 / 14,3 / 14,5 | 16,2 |
Alle >= 4,5:1; baseline-fejlen (3,8-4,1 på hvidt foto) er reelt rettet.

## 8. `mk-wide`
Ingen CSS-regel (kun en kommentar i baseline) og intet JS refererer klassen. maerker.html fuld-side pixel-diff base vs ny: 0 pixels (390/1440, lys/mørk). Mærkeside (`maerke-honda`): 0 pixels afviger når kun den bevidst ændrede `.tile::after`-scrim sættes tilbage til baseline (altså ingen anden layoutændring). De 26 genererede mærkesider bærer klassen indtil næste build (harmløst).

## Fund
| # | Sev | Fund | Reproduktion |
|---|---|---|---|
| P2-1 | P2 | Titel/pris-knækpunktet ligger 4 px under desktopkortbredden på søgesiden (266 px ved ALLE viewports 1480-1920) og springer synligt mellem 1472 og 1480 (og 576/584, 888/896, 1192/1200). Side om side lige over grænsen giver kun ~85 px til titlen (2 linjer, ujævne rækker). Builderens "ingen kort nær grænsen" er målt på to bredder og er forkert. | `soegning.html` (mock 24 rækker), viewport 1472 vs 1480; `.card-rich` bredde 264 vs 266, `.rk-top` `column` vs `row` |
| P2-2 | P2 | Swipe-kortet skriver "null"/"undefined" for manglende årgang (`${l.year}`), kendt af Builderen, uløst. Gitter/liste siger ærligt "Ikke oplyst". | `swipeCardHTML({year:null,...})` -> meta `nullKm ikke oplyst...` |
| P3-1 | P3 | Stale kommentar om forhandlerprofiler i sitemappet | `scripts/build-brand-pages.js` ~1465-1473 |
| P3-2 | P3 | `maerke.js mkNorm` folder ikke accenter, men generator/hjemmeside nu gør: "Zündapp" og "Zundapp" slås sammen server-side, ikke i klientens mærkefilter (`mkNorm('Zündapp')`='zndapp') | `js/maerke.js:22` vs `scripts/slug.js` |
| P3-3 | P3 | Nye testfiler `slug.test.js` og `smaating.test.js` er ikke i `npm test` (package.json uændret) - Orchestrator skal tilføje dem | `package.json` |
| P3-4 | P3 | Swipe-stakken viser næste korts bundlinje (sted/kilde) som en kant under det forreste kort | screenshot `swipe-320-light.png` |
| P3-5 | P3 | Tekstside-h1 krymper til 28 px ved 768 (var 41) | se pkt 7 |
| P3-6 | P3 | Før-eksisterende, ikke w4: `A2_MAX_HK=47` (35 kW = 47,6 hk): 47,5 hk vises "Kræver A" | `js/data.js:1133` |
| P3-7 | P3 | Ł/ł/Þ/œ/ı foldes ikke (bogstavet forsvinder, uændret ift. før, ingen flyttet URL) | `scripts/slug.js` |

Ingen P0/P1: ingen flyttet/ødelagt URL, ingen ændret kørekortlogik, intet regel-2-brud, ingen regression i 651 tests, 336 overflow-målinger, SEO-signaturer.

Efterlod to dev-servere (porte 8783/8784, python) kørende fra min temp-kopi; ingen generel taskkill kørt.
