# Builder w11-proces (Meta-Gauntlet: proces og testsundhed)

## Acceptkriterier (skrevet FOER arbejdet)
1. `node scripts/verificer-site.js --med-udgiv` kører scripts/udgiv.js og fejler (exit 1) hvis udgiv.js fejler; ellers grøn. Kun gitignored `_site/` røres.
2. `package.json` "scripts" har `gate` (= `node scripts/verificer-site.js --med-udgiv`) og `verificer`; "test"-listen er uændret.
3. `npm test` (og llms.test.js) efterlader `git status` uændret: ingen test skriver til sporede filer.
4. De 10 langsomste testfiler og rene streng-søgnings-tests er listet med forslag.
5. Forslag til deploy.yml ligger som ikke-aktiveret fil (`docs/review/gauntlet/deploy.yml.forslag`) med risiko for npm test i CI.
6. `docs/review/gauntlet/PROCES.md` findes: gate-rækkefølge, faldgruber, regler.
7. `node --check` på alle scripts + `npm test` grønt; ny test for udgiv-trinnet.

## Resultat
1. `--med-udgiv` -> `tjekUdgiv()` i scripts/verificer-site.js (kører rodens udgiv.js; udgiv.js har intet --ud-flag, men skriver KUN til gitignoreret `_site/` og rydder kun den; ingen netværk). Test (10) i verificer-site.test.js. `npm run gate` og `npm run verificer` tilføjet; "test" uændret. Lokalt: 8/8 trin grønne.
2. Målt pr. testfil (79 filer, `git status` før/efter hver): EN mutation — scripts/llms.test.js omskrev llms.txt (CRLF->LF). Rettet: kører build-llms.js i temp-kopi + ny test der beviser, at repoets llms.txt er uberørt og ens med scriptets output. Ingen andre tests muterer repoet. Efter fix: 0 mutationer, 79/79 filer grønne.
3. Langsomste (sek.): w9-saelger 99, w10-fejl 95, w10-soegning 49, smoke-browser.test 41, w10-footer 33, w9-frontend-tom 26, visuel-regression.test 20, verificer-site.test 8, seo-vagt 6, resten < 1. Total ca. 400 s; 6 Chromium-filer = ca. 330 s. Ingen flaky set i to fulde kørsler (den første blev forstyrret af min egen redigering + en forkert junction, se PROCES.md).
   Kun streng-søgning i kilde (ingen kørsel): csp-billedvaerter, scroll-padding, info-tekst, smaating, tekstsider, visuel-css, w7-visuel-kort, w7-visuel-hero, w9-marketplace-galleri, seo-billeder. Forslag: info-tekst/smaating/tekstsider er indholdstests (rimelige at beholde); CSS-filerne (scroll-padding, visuel-css, w7-visuel-*) bør erstattes/suppleres af målinger i smoke-browser/visuel-regression (computed style, bounding boxes). Ikke ændret (ville kræve browser-tests i funktionelle/visuelle strømme).
4. Deploy-forslag (ikke aktiveret): docs/review/gauntlet/deploy.yml.forslag (nyt job `verificer` før `build`, `--hurtig --med-udgiv`, klar ::error; risiko ved npm test i CI dokumenteret).
5. docs/review/gauntlet/PROCES.md.
Nye testfiler: ingen (test (10) tilføjet i eksisterende scripts/verificer-site.test.js, allerede i "test").
