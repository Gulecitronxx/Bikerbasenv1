# Builder w8-cls — CLS ved hydrering af facet-sider

## Acceptkriterier (skrevet før arbejdet)
1. CLS < 0,05 på mindst 10 berørte sider (by-, model-, mc-, budget-, region-, type-) ved 320, 390 og 1440 px, målt med scripts/smoke-browser.js-målemetoden (layout-shift, scroll hele siden) mod fixturen, OGSÅ når backendsvaret er forsinket (800 ms), så første paint sker før hydrering.
2. Årsagen rettes i generatoren (scripts/build-facet-pages.js): containeren `#facet-listings` reserverer højde deklarativt i den statiske markup, og hydreringen erstatter indholdet in-place uden at fjerne reservationen.
3. Tom-lager-vagten bevares: tomt lager giver `data-fa-hydreret` uden at tegne en tom-tilstand, og bannerets "Prøv igen" står alene.
4. Test (scripts/facet-cls.test.js, fixture-baseret) beviser, at statisk kortrække, statisk tom-tilstand og den hydrerede tom-tilstand har samme højdereservation.
5. `node --check` på alle scripts og `npm test` er grønne. Ingen ændring i css/, package.json, build.js, udgiv.js.

## Årsag (målt, ikke gættet)
Smoketestens CLS var tids-afhængig (hydrering efter første paint; reproduceret med 800-1500 ms forsinket Supabase-svar). Bisect i browseren viste, at det IKKE var tom-tilstandens højde, men at hydreringen skiftede containerens KLASSE fra den vandrette mobil-kortscroller (`.fa-side .fa-kortraekke`: flex, overflow-x:auto, negative marginer) til `.empty-state`. Chrome tæller hele containeren som flyttet (score = højde/viewport = 0,45), selv når den ligger under folden. Samme klasseskift skete omvendt (tom -> kort).

## Rettelse (scripts/build-facet-pages.js)
- Containeren `#facet-listings` beholder ALTID `listings-grid fa-kortraekke`; tom-tilstanden er et barn (`.empty-state`, flex/grid-span 100 %). Klassen skiftes aldrig.
- Inline `min-height:340px` (FACET_RESERVE_H) på containeren i alle statiske varianter; hydreringen hæver den til den målte højde før indholdsskift (en tom-tilstand krymper aldrig rækken).
- Tom-markup fra ÉN funktion `facetTomMarkup(frase, søgeUrl)`, brugt statisk og stringificeret ind i hydreringsscriptet (begge knapper, samme højde). Script flyttet til `hydreringsScript()` (testbar).
- Tom-lager-vagten uændret (helt tomt lager: urørt indhold, `data-fa-hydreret`, ingen tom-påstand).

## Før/efter CLS (smoke-målemetode, scroll, Supabase forsinket 1500 ms, lys, 21 sider)
| side | 320 før->efter | 390 før->efter | 768 | 1440 |
|---|---|---|---|---|
| by-thorsoe | 0,438 -> 0,000 | 0,448 -> 0,000 | 0 | 0,001 |
| model-honda-crf-1100-l-africa | 0,417 -> 0,000 | 0,459 -> 0,000 | 0 | 0,001 |
| model-suzuki-vlr-1800 | 0,416 -> 0,000 | 0,425 -> 0,000 | 0 | 0,001 |
| øvrige 18 (budget, by, koerekort, mc, model, region, type) | <=0,002 (mc-harley 390: 0,017) | uændret | <=0,001 | <=0,006 |
Alle < 0,05. maerke-* (6 stikprøver, 320/390) er 0,000 og er urørt.

## Bemærk til Orchestrator
- De committede facet-sider er IKKE regenereret (generatoren henter fra produktions-Supabase). Kør `node scripts/build-facet-pages.js` i den normale byggekæde + csp-hashes (hydreringsscriptet har ændret hash). Efterfølgende kan `node scripts/smoke-browser.js --sider "by-thorsoe,model-*" --viewports 320,390 --cls` gentages.
- Måling blev gjort ved midlertidigt at patche 20 sider i worktree med generatorens nye markup/script + rehash og derefter rulle tilbage; intet af det er committet.
- `npm test`: crawler/*.test.js fejler på "Cannot find module 'playwright'" (junction-miljø) og seo-schema Article-test (guides, dato) — uafhængige af denne ændring. Test rewrote llms.txt som sideeffekt; ikke committet.
- Nye testfiler: scripts/facet-cls.test.js (6 tests, grøn).
- DELT-ØNSKE: ingen. Tom-tilstand på mobil kunne få egen CSS (`.fa-kortraekke > .empty-state`) i p-facet.css; nu inline.
