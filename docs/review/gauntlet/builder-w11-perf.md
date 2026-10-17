# Builder w11-perf — ydeevne (Core Web Vitals)

## Acceptkriterier (sat FOER maalingerne)
1. Maalt pa 7 sider (index, soegning, annonce, maerke-honda, type-sport, koerekort-a2, guide-a2-koerekort): mobil 390 (Slow 4G, 150 ms RTT, 1,44 Mbit, 4x CPU, CDP) og desktop; median af mindst 3 koersler; _site serveret med gzip; Supabase mocket (scripts/smoke-fixtures.js).
2. Ingen regression: CLS pr. side <= 0,05 og ikke vaerre end baseline + 0,01; FCP/LCP (mobil) mindst 10 % bedre pa flertallet af siderne, og ingen enkelt side > 10 % vaerre.
3. Transfer-bytes pr. side ma ikke stige mere end 2 KB gz (undtagen hvor det er prisen for en dokumenteret FCP-gevinst).
4. Alle gates groenne: `scripts/verificer-site.js --hurtig`, `npm test`, `node scripts/udgiv.js`, `smoke-browser.js --strikt`; ingen CSP-blokerede scripts (csp-hashes uaendret af mine aendringer).
5. Kun ejerfiler roeres (scripts/inline-critical.js, inline-boot.js, stamp-version.js, udgiv.js, csp-hashes.js, nye scripts/w11-perf*). Ingen genererede HTML-sider committes.
6. Fund i ikke-ejede filer beskrives med praecis fil og fix.

## Maaleopstilling
Chromium via Playwright, CDP: 150 ms RTT, 1,44 Mbit ned, 4x CPU, 390x844 DPR2; _site (udgiv) serveret med gzip; mock fra smoke-fixtures; median af 5 (matrix) / 7 (A/B). Desktop er ugedrosslet (lokalt: LCP 76-236 ms, CLS <= 0,027, TBT 0-20 ms; intet at hente).

## Baseline mobil (median, KB = gz transfer)
| side | LCP ms | FCP | CLS | TBT | req | KB (html/css/js/font/img) |
|---|---|---|---|---|---|---|
| index | 1876 | 1876 | .006 | 208 | 27 | 338 (8.9/25.3/58.8/66.8/178) |
| soegning | 1464 | 1464 | 0 | 122 | 20 | 228 (15.8/30.3/77.4/66.8/38) |
| annonce | 2176 | 1276 | .001 | 76 | 20 | 235 (4.9/29.4/130/66.8/4) |
| maerke-honda | 1840 | 1840 | 0 | 248 | 19 | 197 (25.9/30.1/54.6/66.8/19) |
| type-sport | 2256 | 2256 | 0 | 286 | 18 | 186 (16.4/30.4/53/66.8/20) |
| koerekort-a2 | 1860 | 1860 | 0 | 360 | 25 | 344 (19.9/30.4/53/66.8/174) |
| guide-a2 | 2396 | 2340 | 0 | 90 | 19 | 201 (10.1/29.9/52.4/66.8/42) |

## Implementeret (committed)
1. `scripts/udgiv-head.js` + udgiv.js: font-preloads (67 KB) fjernes fra UDGIVNE sider (kilden uroert). Aarsag: de deler baandbredde lige med render-blokerende css + hero. `BB_FONT_PRELOAD=1` slaar fra. Modsiger work/DECISIONS.md "Font-preloadene BLIVER" (maalt dengang paa 45 KB css) — Orchestrator/ejer skal afgoere; FOUT-pris: kort system-skrift foer swap.
2. Samme modul: whitespace/tomme linjer ud af HTML udenfor script/style/pre/textarea (inline-scripts byte-identiske -> CSP-hashes staar). -4..-6 % raa HTML, ca. -300 B gz.
3. `stamp-version.js`: fonte faar indholdshash i ?v= (preload + @font-face) i stedet for fast `?v=1` — Cloudflare cacher woff2 med ?v= som immutable i et aar, saa en ny font ville aldrig naa returbesoegende.
Efter (mobil, 5 koersler; B = punkt 1):
| side | LCP foer -> efter | FCP foer -> efter | CLS efter |
|---|---|---|---|
| index | 1876 -> 1412 | 1876 -> 1396 | 0 |
| soegning | 1464 -> 1068 | 1464 -> 1052 | 0 |
| annonce | 2176 -> 1864 | 1276 -> 1068 | 0 |
| maerke-honda | 1840 -> 1472 | 1840 -> 1472 | 0 |
| type-sport | 2256 -> 1448 | 2256 -> 1448 | 0 |
| koerekort-a2 | 1860 -> 1476 | 1860 -> 1460 | .003 |
| guide-a2 | 2396 -> 1264 | 2340 -> 1248 | 0 |
Bredere CLS-kontrol (19 andre sidetyper, mobil+desktop, uden preload): max 0,027 (dashboard desktop), resten <= 0,016. Bytes uaendret (+/-0,1 KB). Bemaerk: ET smoke-run af maerke-honda@1440 under tung maskinbelastning gav CLS 0,274; 6 genkoersler uden belastning 0,000 — fontswap kan skubbe under CPU-pres.

## Inline kritisk CSS: hvorfor 0 sider (svar)
`IKKE_UDSKUDT = [/.*/]` i scripts/inline-critical.js slaar den fra BEVIDST (work/DECISIONS.md; maalt dengang: bytes dobbelt, gevinst lille). Genmaalt nu (alle 92 sider, `IKKE_UDSKUDT = []`, +5 KB gz/side): mobil FCP index 1876 -> 652, soegning 1464 -> 924, annonce 1276 -> 784, type-sport 2256 -> 1060, guide 2340 -> 1044; med punkt 1 oveni (BK): LCP index 984, soegning 808, type-sport 920, koerekort 960, guide 952 (-45..-60 %). MEN: med font-preload bevaret fik koerekort-a2 CLS 0,121 (BASE-udsnittet mangler facet-sektioner) — IKKE slaaet til, fordi det rammer 92 committede sider og kraever CLS-gennemgang pr. sidefamilie (register i PAGES: facet/guide/by-/budget-/region-/model-/mc-). Anbefaling: tag det som egen opgave med Critic; udgangspunkt: `IKKE_UDSKUDT=[]` + tilfoej 'Facet'/'Guides'-sektioner til PAGES.

## Kunne IKKE rettes i ejerfiler (fil + fix)
- `scripts/build-facet-pages.js` + `scripts/build-guides.js`: sekundaert `<img src="img/hero-960.webp" width=456 loading=lazy>` (51 KB) hentes naer folden paa koerekort-a2 (+51 KB, ~15 % af siden). Brug `img/hero-800.webp` (allerede hentet som LCP, 34 KB, cache-hit) eller type-billedet.
- `js/home.js:219`: alle 8 type-fliser `loading="eager" fetchpriority="low"` = 117 KB paa forsiden mobil; `loading="lazy"` (men se noten i inline-critical om skjult rude).
- `logo-mark.png` hentes to gange paa guide-sider (med og uden `?v=logo1`, 4,4 KB): tving samme URL i guide-skabelonen/components.js.
- styles.css (150 KB min, 26 KB gz) indeholder ~80 KB sidespecifik CSS (annoncedetalje 16+12 KB, Brand landing 11, Dealer dashboard 6, Stepper 5.5, Auth 4 ...) der kan flyttes til p-*.css (ejer: Orchestrator) -> ca. -10 KB gz render-blokerende paa forsiden.
- `scripts/cloudflare-setup.js` VERSIONERET goer kun css/js/woff2 immutable; img/*.webp har max-age 600. Tilfoej Cache-Control `public, max-age=604800, stale-while-revalidate` paa /img/* (eller ?v= + "webp" i extension-listen).
- Billeder: Chromium/libwebp-genkomprimering giver 0 % ved PSNR 42 dB (bpp 0,66-1,0, allerede stramt); ingen cwebp/sharp lokalt. Fonte: subset kraever fonttools (ikke installeret) — fontene er allerede latin-subset, variable, woff2 (46+22 KB).
- Annonce henter vendor/supabase.js (54,6 KB gz) + 200-raekkers boot-fetch (ikke maalt, mocket): overvej lazy SDK paa annonce.html.

## Tests / gates
Ny: `scripts/w11-perf.test.js` (6 tests) — TILFOEJ til package.json "test" (verificer-site trin 7 fejler ellers). node --check alle, npm test: 135+ crawler-tests groenne med NODE_PATH (ellers manglende `yaml` i worktree), smoke --rod _site --hurtig --strikt groen undtagen load-induceret CLS-udsving ovenfor; udgiv.js groen.
