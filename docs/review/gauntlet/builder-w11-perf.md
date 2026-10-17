# Builder w11-perf — ydeevne (Core Web Vitals)

## Acceptkriterier (sat FOER maalingerne)
1. Maalt pa 7 sider (index, soegning, annonce, maerke-honda, type-sport, koerekort-a2, guide-a2-koerekort): mobil 390 (Slow 4G, 150 ms RTT, 1,44 Mbit, 4x CPU, CDP) og desktop; median af mindst 3 koersler; _site serveret med gzip; Supabase mocket (scripts/smoke-fixtures.js).
2. Ingen regression: CLS pr. side <= 0,05 og ikke vaerre end baseline + 0,01; FCP/LCP (mobil) mindst 10 % bedre pa flertallet af siderne, og ingen enkelt side > 10 % vaerre.
3. Transfer-bytes pr. side ma ikke stige mere end 2 KB gz (undtagen hvor det er prisen for en dokumenteret FCP-gevinst).
4. Alle gates groenne: `scripts/verificer-site.js --hurtig`, `npm test`, `node scripts/udgiv.js`, `smoke-browser.js --strikt`; ingen CSP-blokerede scripts (csp-hashes uaendret af mine aendringer).
5. Kun ejerfiler roeres (scripts/inline-critical.js, inline-boot.js, stamp-version.js, udgiv.js, csp-hashes.js, nye scripts/w11-perf*). Ingen genererede HTML-sider committes.
6. Fund i ikke-ejede filer beskrives med praecis fil og fix.
