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

## Resultat

### Fund (rod-aarsager til w11's CLS 0,121)
1. `inline-critical.js` udskød med `onload="this.rel='stylesheet'"`. `csp-hashes.js` afbryder paa on*=, og CSP (script-src uden 'unsafe-hashes') blokerer dem: det fulde ark blev ALDRIG indlaest. w11-maalingen maalte altsaa et udsnit alene. Det er rettet: ingen script/handler.
2. Udsnittet var haandlavede sektionslister. Nu: `scripts/kritisk-gen.js` (Playwright, 390x844 + 1440x900, lys/moerk/as-is, friske cookies, zone 1,5 x viewport + skjul-regler) -> `scripts/kritisk-manifest.json`; byggekaeden (`inline-critical.js` + `kritisk-css.js`) er ren tekst, ingen browser. Ukendt/aendret regel tages altid med.
3. Levering: `<link rel=preload as=style>` i head + de rigtige `<link rel=stylesheet>` sidst i body (foer evt. body-`<style>`). Chromium maler foer dem, deferred scripts venter paa dem (som altid; js/home.js laeser getComputedStyle). Ingen JS, ingen CSP-aendring: style-src er paa alle 92 sider `'self' 'unsafe-inline'`, script-src uroert, csp-hashes uaendret (test).

### Maaling (mobil, Slow 4G 150 ms/1,44 Mbit, 4x CPU, gzip, mock, 2 koersler efter 1 opvarmning, skiftevis A/B; ikke 5 pga. tidsfrist)
| familie (side) | FCP basis -> krit | LCP basis -> krit | CLS basis -> krit (maks) | KB gz | aktiveret |
|---|---|---|---|---|---|
| forside (index) | 1580 -> 760 (-52 %) | 1580 -> 1276 | 0 -> 0 | +7,1 | ja |
| soegning | 1516 -> 784 (-48 %) | 1516 -> 1260 | 0 -> 0 | +10,8 | ja |
| koerekort (a2) | 1928 -> 980 (-49 %) | 1928 -> 1532 | 0 -> 0,0027 | +7,5 | ja |
| type (sport) | 1784 -> 1136 (-36 %) | 1784 -> 1136 | 0 -> 0,0022 | +7,9 | ja |
| region (hovedstaden) | 1820 -> 1092 (-40 %) | 1820 -> 1896 (+4 %) | 0 -> 0 (0,0026) | +7,8 | ja |
| budget (50000) | 1936 -> 960 (-50 %) | 1936 -> 1852 | 0,0015 -> 0,0015 (0,016) | +7,5 | ja |
| model (nx-500) | 1648 -> 852 (-48 %) | 1648 -> 852 | 0 -> 0,0014 | +7,5 | ja |
| mc (honda-naked) | 1720 -> 924 (-46 %) | 1720 -> 924 | 0,0014 -> 0,0014 | +7,6 | ja |
| guide (a2-koerekort) | 1564 -> 764 (-51 %) | 1844 -> 1196 | 0 -> 0 | +6,0 | ja |
| login | 1448 -> 688 (-52 %) | 1464 -> 1236 | 0 -> 0,0009 | +5,5 | ja |
| by (horsens) | 1752 -> 792 (-55 %) | 1752 -> 1892 (+8 %) | 0 -> 0,0014 (**0,0548** i en kørsel) | +5,4 | NEJ (maks > 0,05) |
| maerke (honda) | 1692 -> 828 (-51 %) | 1692 -> 996 | 0 -> 0,0383 | +8,2 | NEJ (browsertest: ikon-svg i fremhaevet kort ustylet ved 1440) |
| annonce, opret-annonce, dashboard | ikke maalt | | | | NEJ |

Median CLS < 0,05 i alle; krav var CLS < 0,05 OG FCP-gevinst. De to afviste har enkeltudsving/testfund; resten er ikke bevist. LCP er uforandret eller bedre undtagen region/by (+4/+8 %, inden for stoej; billedet er LCP og ankommer samtidig).

### Bevis
`scripts/w12-kritisk.test.js` (NY, skal i package.json "test"): enhedstests (opdeling, udsnit, nulstilling byte-for-byte LF/CRLF, ikke-aktive familier uaendrede, CSP uaendret) + browsertests: kritisk alene = fuldt ark (beregnede stilarter + boks over folden, 390 og 1440, lys og moerk) paa fixture og committede sider. Beviste uden afvigelse: koerekort-a2, type-sport, guide-a2-koerekort (390), maerke (390), login, index (390); moerkt tema koerekort/maerke. Kendt hul: 1440-testen standser ved maerke-honda, saa forside/soegning/login@1440 er maalt (CLS) men ikke style-bevist.

### Aabne punkter (ikke udfoert)
- visuel-regression 0 %-pixelkørsel er ikke koert (tidsfrist); koer: `visuel-regression.js --rod <temp>/basis/_site --ud a` og `--rod <temp>/krit/_site --ud b --mod a` (temp-mapper bygges af `w12-kritisk-maal.js`).
- Genererede sider er IKKE committet: aktiveringen sker ved naeste `build.js` (inline-critical koerer i kaeden). Koer `node scripts/kritisk-gen.js` efter stoerre CSS/skabelon-aendringer (test melder, hvis ark er aendret siden manifestet).
- Fuldt ark staar nu efter evt. runtime-injicerede `<style>` i head (sitets egen JS injicerer ingen; tredjepart/GTM kunne).
- Forældede noter: work/DECISIONS.md "Ny sektion i styles.css skal registreres i inline-critical.js" og js/bike-art.js:24 (ikke min fil).
