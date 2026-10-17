# Builder w12-kritisk — indlejret kritisk CSS uden CLS

## Acceptkriterier (sat FOER implementering og maaling)
1. Kritisk CSS genereres AUTOMATISK ud fra rigtig rendering (Playwright, 390x844 og 1440x900, lys+moerk, friske cookies, mock-data), ikke fra haandlavede sektionslister. Udsnittet daekker (a) alle elementer der har en boks i foerste 1,5-2 viewporthoejder, (b) deres forfaedre, (c) skjulte elementer foer sidste zone-element i dokumentraekkefoelge, (d) alle skjul/position-regler paa hele siden, (e) @font-face, :root/html/body.
2. Udsnittet er en TEGNET delmaengde af det fulde ark i oprindelig raekkefoelge (styles.css-regler foer p-*.css-regler), saa kaskaden er uaendret. Ukendte/nye regler (ikke i manifestet) tages ALTID med: et gammelt manifest kan give et stoerre udsnit, aldrig et forkert.
3. Fuld CSS udskydes UDEN inline event-handlers (csp-hashes.js afbryder paa on*=). Indlaesningen sker med et hashbart inline-script + noscript-fallback.
4. Aktiveres KUN for sidefamilier hvor maalingen (Slow 4G 150 ms RTT / 1,44 Mbit, 4x CPU, CDP, median af 5, mock, gzip-server) viser CLS < 0,05 OG FCP-forbedring >= 10 % mobil. Alle andre familier er byte-identiske med i dag (render-blokerende link, ingen indlejret blok).
5. 0 % pixelforskel (visuel-regression, tolerance 8) efter load mellem foer og efter, 390 og 1440, lys og moerk, for alle aktiverede familier; ingen FOUC (computed styles paa noeglelementer er ens med kritisk+udskudt og med fuld CSS).
6. CSP: sidernes style-src tillader 'unsafe-inline' (tjekkes); der aendres intet i CSP uden at det beskrives. csp-hashes.js koert paa temp-kopien: script-src indeholder hashen af det nye inline-script, og ingen side afbrydes.
7. Test `scripts/w12-kritisk.test.js` (fixture-baseret, Playwright; skipper pent uden Chromium): kritisk+udskudt = samme computed styles som fuld CSS; ikke-aktiverede familier uaendrede; idempotens; staerkt manifest-fallback.
8. Kun ejerfiler: scripts/inline-critical.js, scripts/inline-boot.js, scripts/csp-hashes.js (kun hvis noedvendigt), scripts/udgiv*.js (kun hooks), docs/, egne nye scripts/w12-*/kritisk-*. Ingen aendring i css/, js/, sidegeneratorer. Ingen build.js/generator-koersel. Ingen genererede HTML-sider committet af mig (aktivering sker ved naeste build.js, som Orchestrator kører).
9. `npm run gate` groen i worktree (udgiv uden build).
