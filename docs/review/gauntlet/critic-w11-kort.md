# Critic w11-kort (blind) - dom: ACCEPTER (med 3 P2-bemaerkninger)

Kopi: %TEMP%\critic-w11-20261017-110500 (repo, shots, mrg). Mock via smoke-browser, port tilfaeldig fri. Ingen build/commit.

## Maalinger
- smoke-browser --cls 0.05 --strikt: soegning, annonce (id1), annonce-bmw-..., index, maerke-honda, type-sport, koerekort-a2 x 320/390/768/1024/1440 x lys/moerk = 70 maalinger, 0 fejl, 0 advarsler.
- npm test: 1049 pass, 0 fail. node --check js/*.js: ok.
- Kort (6 sider x 5 bredder x 2 temaer): 0 vandret overflow, 1 h1, 0 null/undefined/NaN, 0 konsolfejl, kortknapper min 40 px, aria-label paa alle .rk-sted i swipe. Naboraekke-hoejder ens (undtagen honda-stribe, se P3).
- Annonce (6 annoncer: ekstern, 48 hk, egen, egen uden pris/foto, komma i model, uden hk) x 5 bredder x 2 temaer: 0 overflow, 1 h1, ingen dublerede id'er, elementtal uaendret.
- Resize 1440>1024>768>390>1440>768>1024>390>1440: DOM-knudetal konstant (755/786), hver sektion praecis 1 stk, foraeldre korrekte (kk i .an-side ved 1440, .an-col ved <1180, tjek i .an-grid ved tablet). Galleri-pil + ArrowRight, favorit ("Gem annonce" -> aria-pressed true), kilde-link og tab-raekkefoelge virker efter resize.
- Mobil: sticky .listing-actionbar 69 px, knap 48 px, body padding-bottom 76 px, footer slutter 76 px over bundkant (daekker ikke indhold); ligger under cookie-modal (z 90 vs auto, modal centreret). Skjult >=760. Egen uden pris viser kun "Vis nummer".
- Merge: git merge-tree + faktisk merge i klon af gauntlet/master f62bbbb: 0 konflikter (tree 245810f). p-forside.css roerer eksplicit ikke .rk-*/.card; ingen overstyring fundet.
- Test-aendringer (annoncekort, eksternt-kort, rigt-kort, w7-visuel-kort): rimelige - erstatter "ikke oplyst"-chip med negative assertions + 40/44 px-krav; daekningen svaekkes ikke (+ ny w11-kort.test.js).

## Fund
- P2 css/styles.css (kortblok, foto-overlay): ved 320 i 2-kolonne overlapper FORHANDLER-badgen hjerte-/sammenlign-knap og "Ingen fotos i denne annonce" bliver afdaekket ("FORHANDLE", "i d"). Skot: shots/kort-soegning-320-light.png. Ved 390 er det kun taet.
- P2 K1 delvist: foden kortes stadig med ellipsis paa lange saelgernavne ("Roskilde Motorcyk...", "Hovedstadens MC Depot ApS" ved 390/1440; scrollWidth>clientWidth i 1-6 spans/side). Ikke "Ro...", og fuld tekst i title/aria, men kravet "ingen afkortning" er ikke helt opfyldt. Acceptabelt.
- P2 js/search.js listeraekke har egen fod med omvendt raekkefoelge (saelger/kilde foer sted) og uden .rk-fod/aria; swipe bruger .rk-fod. Visuelt konsistent nok (shots/vis-list-*.png), men sted-foerst er ikke ens. Builderens DELT-ØNSKE staar ved lag.
- P3 "Aargang/Km ikke oplyst" er konsistent med DNA (ikke oplyst frem for gaet) og ser ikke rodet ud i screenshots; ccm/hk-chip faldt bort uden hul. Raekker med 2 chiplinjer er ens mellem naboer.
- P3 honda-stribe (390): .rk-fod-raekke viste hoejdeforskel i min maaling; visuelt ens i shots/kort-maerke-honda-390-light.png (maaleartefakt sandsynlig).
- Billede 3: 1440 3 kolonner uaendret; kk-badge stakker i smalle kolonner (shots/an1-768-light.png, an1-1024-light.png). Tablet-layout pænt, to kolonner uden huller.

## Screenshots (C:\Users\pasca\AppData\Local\Temp\critic-w11-20261017-110500\shots)
soegning/index/maerke-honda/type-sport/koerekort-a2/annonce1 -{320,390,768,1024,1440}-{light,dark}.png; kort-*-*.png (rolleret til gitter); vis-list-*/vis-swipe-*; an{1,903,6,901}-{w}-{tema}.png (fuld side); mob-top/bottom-*; cookie-390.png.
