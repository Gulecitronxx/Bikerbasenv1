# Builder W10 — visuelt regressionsværktøj

## Acceptkriterier (skrevet FØR koden)
1. `scripts/visuel-regression.js --ud <mappe>` tager fuldside-screenshots af nøglesiderne (index, soegning, annonce?id=<mock>, maerke-honda, type-sport, koerekort-a2, region-*, guides, guide-a2-koerekort, opret-annonce, mine-annoncer, login, 404) ved 390 og 1440, lys+mørk, via samme lokale server + net-mock + fixtures som `smoke-browser.js` (al trafik udefra blokeres, ingen produktion).
2. Deterministisk: Date, Math.random, crypto.randomUUID frosset/seedet; reduced-motion; transitions/animationer slået fra; ventetid på fonts, netværksidle og lazy-billeder; cookiebanner skjult via samtykke-nøgle i localStorage. To kørsler af samme side giver 0 % forskel.
3. `--mod <baseline-mappe>` (eller `--sammenlign <ny> <baseline>`) sammenligner pixel for pixel uden nye npm-afhængigheder (pixelmatch/pngjs/sharp findes ikke → indbygget PNG-dekoder/-koder på zlib). Output: tabel pr. side/viewport/tema med % ændrede pixel, diff-PNG hvor forskel > `--vis`, og `diff.html` (før/efter/diff side om side).
4. Exit 1 hvis en side overstiger `--graense` (standard 2 %) eller mangler i den ene mappe; exit 2 hvis Playwright/Chromium mangler.
5. `scripts/visuel-regression.test.js` (node:test): fanger en bevidst ændring (farve/placering), fanger ikke to identiske kørsler, PNG-rundtur; skipper tydeligt uden Chromium.
6. `scripts/verificer-site.js --med-visuel <baseline>` = valgfrit trin 9; standardadfærd uændret (+ test).
7. Brugt i praksis: baseline 15c229c mod 7c47a19, de seks største forskelle beskrevet nedenfor.
8. `node --check` og `npm test` grønt.

## Brug
```
node scripts/visuel-regression.js --ud work/vr-ny                          # 17 sider x 390+1440 x lys+mørk = 68 PNG (~4 min)
node scripts/visuel-regression.js --ud work/vr-ny --mod work/vr-baseline   # tag + sammenlign mod baseline
node scripts/visuel-regression.js --sammenlign work/vr-ny work/vr-baseline --ud work/rapport   # kun sammenlign
node scripts/visuel-regression.js --rod C:/temp/gammelt-checkout --ud work/vr-baseline         # baseline af et andet checkout
  flag: --sider index,region-*  --viewports 390,1440  --temaer lys,mørk  --graense 2  --tolerance 8  --vis 0.1  --maks-hoejde 6000  --tid 20000
node scripts/verificer-site.js --hurtig --med-visuel work/vr-baseline      # valgfrit trin 9 (390+1440, lys); standard uændret (7 trin)
```
Baseline af en commit uden at røre arbejdskopien: `git archive <sha> | tar -x -C <temp>/src` og `--rod <temp>/src --ud <baseline>`.
Filnavn: `<side>__<viewport>__<lys|moerk>.png` (hele siden, loft 6000 px). Output: tabel (størst forskel først), `diff/<fil>.png` (rød = ændret, afdæmpet = uændret) for forskel > `--vis` %, og `diff.html` i ny-mappen (før/efter/diff side om side, sorteret efter forskel).
Exit 0 grønt · 1 en side > `--graense` (eller mangler i den ene mappe, eller et screenshot fejlede) · 2 Playwright/Chromium mangler.
Pixel tæller som ændret når største kanalforskel > `--tolerance` (8/255). Ikke-overlappende areal ved højdeforskel tæller som ændret.
Determinisme: Date fastsat (2026-06-15 10:00 UTC), Math.random + crypto.randomUUID seedet, reduced-motion, transitions/animationer slået fra, fonts + networkidle + lazy-billeder afventet, cookiesamtykke i localStorage, mock-net fra smoke-browser (al trafik udefra blokeret). Målt: to fulde kørsler (68 billeder) = 0 af 68 med forskel.
**Begrænsning (vigtig ved læsning):** en lodret forskydning (fx 26 px højere hero) flytter alt nedenunder og giver høje % uden at hver sektion er "ændret". Brug diff.html og læs før/efter; % er en alarm, ikke et mål for omfang. Sider bag login (mine-annoncer, opret-annonce) viser i mock-kørslen login-/gate-tilstanden. Lilla blokke i annoncekort = fixturens 1x1-billede strukket (ens i før/efter).

## Eksempel: 7c47a19 (baseline) mod 15c229c (44 commits senere), 68 billeder, 66 med forskel, 54 over 2 %
De seks største (lys, 1440 hvor ikke andet):
1. **guides** (390: 76,5 %, 1440: 74,9 %): fem store kort i en kolonne -> ni kompakte guide-kort (flere guides) + ny sektion "Fra guide til søgning" (kørekort/type/mærke); siden er så lang at den klippes ved 6000 px.
2. **type-sport** (57 % / 390: 49 %): ny sektion "Udforsk sport-motorcykler efter behov" (4 kort: A2, pris, årgang, km), "Guides og viden" med tre guidekort erstatter tekstteaseren, "Favoriter" i headeren; alt nedenunder skubbet ~100 px.
3. **region-syddanmark / -midtjylland / -hovedstaden / -nordjylland** (44-56 % ved 1440, 36-47 % ved 390): samme facetside-skabelon som type (nye behov-kort, guide-sektion, flere interne links).
4. **annonce** (1440: 44,5 %; 390: 19 %): "Kan du køre denne motorcykel?" flyttet fra bred bundrække til sidepanel under sælgerkortet, "Handl trygt" flyttet fra højre til under faktaboksen, tjekliste-kortet er nu ved siden af i midterkolonnen; "Favoriter" i headeren.
5. **soegning** (390: 40 %; mørk 32 %): stor forskel, årsag IKKE inspiceret af Builder (åbn diff.html) — sandsynligvis samme mønster som facetsiderne.
6. **index** (1440: 30,6 %, mørk 27,6 %): næsten kun lodret forskydning: hero ~26 px højere (større h1) + "Favoriter" i headeren; sektionerne nedenunder er ellers de samme (eksempel på begrænsningen ovenfor). Også maerke-honda (27 % / 23 %) og koerekort-a2 (28 % / 25 % ved 390) ændret.
Rapportér/regenerér med: `--ud work/ny --mod work/baseline` efter at have lavet begge mapper som ovenfor.

## Nye filer og tests
`scripts/visuel-regression.js`, `scripts/visuel-regression.test.js` (5 tests, ~20 s; 3 kører uden browser; resten skipper tydeligt uden Chromium), ændret: `scripts/verificer-site.js` (+ test (9) i `scripts/verificer-site.test.js`).
**DELT-ØNSKE til Orchestratoren:** tilføj `scripts/visuel-regression.test.js` til `npm test` i package.json (verificer-site trin 7 melder den ellers som manglende; `smoke-browser.test.js` gælder fortsat).
`npm test` (med NODE_PATH til hovedmappens node_modules): 1008/1008 grønt; uden den fejler crawler-testene som kendt. llms.txt gendannet efter testen. `node --check` grønt på alle js/, scripts/, crawler/.
