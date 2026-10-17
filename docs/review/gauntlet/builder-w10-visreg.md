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
