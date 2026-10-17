# Builder w11-proces (Meta-Gauntlet: proces og testsundhed)

## Acceptkriterier (skrevet FOER arbejdet)
1. `node scripts/verificer-site.js --med-udgiv` kører scripts/udgiv.js og fejler (exit 1) hvis udgiv.js fejler; ellers grøn. Kun gitignored `_site/` røres.
2. `package.json` "scripts" har `gate` (= `node scripts/verificer-site.js --med-udgiv`) og `verificer`; "test"-listen er uændret.
3. `npm test` (og llms.test.js) efterlader `git status` uændret: ingen test skriver til sporede filer.
4. De 10 langsomste testfiler og rene streng-søgnings-tests er listet med forslag.
5. Forslag til deploy.yml ligger som ikke-aktiveret fil (`docs/review/gauntlet/deploy.yml.forslag`) med risiko for npm test i CI.
6. `docs/review/gauntlet/PROCES.md` findes: gate-rækkefølge, faldgruber, regler.
7. `node --check` på alle scripts + `npm test` grønt; ny test for udgiv-trinnet.
