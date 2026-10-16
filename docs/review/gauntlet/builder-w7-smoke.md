# Builder W7 — offline browser-smoketest

## Acceptkriterier (skrevet FØR koden)
1. `node scripts/smoke-browser.js` starter egen statisk server på fri port og gennemgår ALLE rod-`*.html`; `--sider`, `--viewports` (standard 320,390,768,1440), `--temaer` (lys,mørk), `--rapport fil.json`, `--cls`, `--hurtig` (8 sider, 390+1440, lys).
2. Al trafik udefra blokeres; Supabase REST/storage/auth besvares af fixtures (`scripts/smoke-fixtures.js`, mindst 40 annoncer: ekstern kilde, 48–49 hk, manglende pris/foto, komma i model). Ingen læsning fra eller skrivning til produktion.
3. Pr. side/viewport/tema: konsolfejl, sidefejl, vandret overflow, `null|undefined|NaN` i synlig tekst, antal h1 (=1), CLS (fail > 0,05), tap-mål < 24 px (advarsel), manglende alt, CSP-blokerede scripts, døde interne links (href-tjek mod filsystemet).
4. Kort tabel + JSON; exit 1 ved fund på niveau fejl (`--strikt`: også advarsler); exit 2 hvis Playwright ikke kan køre.
5. `scripts/smoke-browser.test.js` (node:test) viser at hvert tjek KAN fejle (overflow, NaN, konsolfejl, m.fl.) og at en ren side er grøn; skipper tydeligt uden Playwright.
6. `scripts/verificer-site.js` får valgfrit trin 8 bag `--med-browser`; standardadfærd uændret.
7. `node --check` og `npm test` grønt. Ingen ændring af andre strømmes filer.

## Brug
```
node scripts/smoke-browser.js                      # alle rod-*.html × 320,390,768,1440 × lys+mørk (88 sider ≈ 7 min)
node scripts/smoke-browser.js --hurtig             # 8 sider (index, soegning, annonce, maerker, maerke-honda, type-cruiser, login, guides) × 390+1440 × lys ≈ 15 s
node scripts/smoke-browser.js --sider soegning,maerke-* --viewports 390 --temaer mørk --rapport work/smoke.json
  flag: --cls 0.05 (fail-tærskel)  --strikt (advarsler giver også exit 1)  --parallel 3  --tid 20000  --rod <mappe>  --maks-linjer 80
node scripts/verificer-site.js --hurtig --med-browser    # valgfrit trin 8; standardadfærden er uændret (7 trin)
```
Exit 0 grønt · 1 fund på fejlniveau · 2 kunne ikke køre (Playwright/Chromium mangler: `npm i playwright`, `PLAYWRIGHT_PATH`, eller hovedmappens node_modules via git-common-dir).
Netværk: al trafik uden for den lokale server afbrydes; Supabase REST/storage/auth besvares af `scripts/smoke-fixtures.js` (44 eksterne + 3 egne annoncer; 3 kilder; 48 og 49 hk; 2 uden pris, 3 uden foto, 1 med kildens pladsholder-svg, komma i model, manglende km/hk). `annonce.html` åbnes med `?id=<ekstern uuid>`. Cookiesamtykke og tema sættes i localStorage før sidens scripts.
Tjek og niveau (`TJEK` i scriptet): fejl = konsolfejl, sidefejl, overflow, tekst-null (synlig tekst; skjulte elementer ignoreres), h1≠1, cls>tærskel, alt-mangler, csp-script, dødt-link (href mod filsystemet, også JS-genererede), ressource-404 (lokal), data-afbrud (siden viser "kunne ikke hente annoncer"), indlæsning; advarsel = tap-mål<24 px (inline links i løbende tekst undtaget, WCAG 2.5.8), csp-andet, anker-mangler.
CLS tæller også indhold, der kommer under scroll-sweepet (sidens fulde længde scrolles igennem) og kun efter første paint.

## Nye filer og tests
`scripts/smoke-browser.js`, `scripts/smoke-fixtures.js`, `scripts/smoke-browser.test.js` (5 tests, ~45 s, skipper med tydelig besked uden Chromium), ændret: `scripts/verificer-site.js` (+ test (8) i `scripts/verificer-site.test.js`).
**DELT-ØNSKE til Orchestratoren:** tilføj `scripts/smoke-browser.test.js` til `npm test` i package.json (verificer-site trin 7 melder den ellers som manglende). `npm test`: 814/814 grønt uden den; de 5 nye grønne separat.
Bemærk: den eksisterende llms-test ændrer `llms.txt` (kun linjeskift) ved hver `npm test` — ikke mit; jeg har rullet den tilbage før commit.

## Fund på den rigtige sitemappe (HEAD 03dd9a1, 704 målinger, 0 blokerede fremmede værter)
Ingen konsolfejl, sidefejl, overflow, null/NaN, h1-fejl, manglende alt, CSP-blokeringer, døde links eller 404'er på nogen side/viewport/tema. Fund (identiske i lys og mørk):
- CLS (fejl, > 0,05):
  - `by-thorsoe.html` 320: 0,578 · 390: 0,448 — `DIV.empty-state` (tom-tilstanden skubber indhold; fixturen har ingen Thorsø-annoncer).
  - `model-honda-crf-1100-l-africa.html` 320: 0,550 · 390: 0,459 og `model-suzuki-vlr-1800.html` 320: 0,548 · 390: 0,425 — samme mønster.
  - 1440 px: `maerke-aprilia` 0,060 · `-benelli` 0,055 · `-cagiva` 0,055 · `-cfmoto` 0,055 · `-hyosung` 0,053 · `-kymco` 0,054 · `-rewaco` 0,055 · `-royal-enfield` 0,066 · `-sym` 0,055 · `-victory` 0,065 (`ASIDE.mk-cta` hopper fra x≈1171 til x≈257 ved ~150 ms, plus `DIV.header-actions` 1042→1162).
  - `opret-annonce.html` 1440: 0,074 (`DIV.op-layout`/`.op-card.op-safe` 569→767 + header-actions) · `annonce-bmw-r45-1979-59d3a9a1.html` 1440: 0,070 (`DIV.listing-detail` y 114→151, header-actions).
  - `DIV.header-actions` skifter bredde ved ~100–150 ms på alle 1440-sider (delt lag) og er den fælles bidragyder.
- tap-mål (advarsel, 1440): `login.html`, `dashboard.html`, `mine-annoncer.html` — footerlinks "vilkår" 34×19 og "privatlivspolitik" 90×19.
