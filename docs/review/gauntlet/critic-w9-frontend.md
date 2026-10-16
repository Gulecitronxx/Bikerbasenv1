# Critic w9-frontend (blind) — DOM: AFVIS (smal: 2 x P1 i fejl/tom-tilstand; normaltilstand er god)

Målt i temp-kopi %TEMP%\w9c (mock via smoke-fixtures; tom/fejl målt med hostnavn bb.test, så localhost-demolageret på 51 annoncer ikke maskerer tomt lager). Screenshots: %TEMP%\w9c-shots (normal/tom/fejl m. demolager — IKKE repræsentativ for tom/fejl) og %TEMP%\w9c-shots2 (tom/fejl uden demolager, 390/768/1440 lys+mørk, full-/top-*.png, cookie2-1440.png, mobmenu-390.png).

## 1. Visuelt match (billede 1)
Struktur er nu tæt på: header (logo, Motorcykler/Mærker/Kørekort/Artikler, Favoritter + Log ind + CTA), hero med overlappende søgekort (mærke/type/pris/kørekort-segment/CTA), tillidsrække, udvalgte annoncer + sælg-panel til højre, typefliser m. pil, Sådan virker (4 trin m. pile + grøn/mint sidecelle), tre kolonner (mærker / kørekort / regioner), footer. Orange/kobber, grøn kun som ✓. Ingen opdigtede tal fundet.
3 største afvigelser:
1. Hero uden rytter/solnedgang-foto og eyebrow uden "Danmarks motorcykelmarked": nødvendigt (ingen licenseret rytterfoto, påstand). Kan dog gøres modigere uden nye assets: hero-teksten er lille mod billedets store h1 og hero er ~40 px lavere/mørkere; overvej større h1 og mere foto-udsnit (P3).
2. Annoncekort/typefliser/mærkefliser: billedet har fotos, hk/kg-chips, mærkelogoer og tal pr. mærke; vi har monogramfliser og færre chips. Nødvendigt (logoer ikke licenseret, data mangler). I mock er kortfoto en 1x1-PNG (lilla flade) — mock-artefakt, ikke fejl.
3. "Bliv en del af fællesskabet"/footer: erstattet ærligt af "Køb og sælg trygt"; footer er mørk (billedet har ingen). Footer-farve er en implementeringsvalg der kan ændres, men kræver synk-header over mange sider — ikke nødvendigt nu.
Vurdering: tæt nok på og modigere end w7; resterende afstand er mest asset/indhold, ikke layout.

## 2. Funktion (alt målt, 0 konsolfejl)
- Søgekort: q=Honda CB + type=sport + maxPrice=60000 -> soegning.html?q=Honda+CB&type=sport&maxPrice=60000; kørekort A2 -> soegning.html?koerekort=A2. OK.
- Typefliser -> type-*.html, mærker -> maerke-*.html, regioner -> region-*.html (Sjælland -> soegning.html?regions=Sjælland, ingen regionsside; OK).
- Tema-skift (footer/skuffe-knap): data-theme null->dark, baggrund skifter. OK. Cookie-modal vises første besøg; ingen modal ved gemt samtykke.
- Favoritter: synlig 114 px fra 1180 px, skjult 1024–1179 (som specificeret); klik logget ud -> login.html?redirect=mine-annoncer.html?tab=favoritter (rimeligt).
- Tab-rækkefølge: skip-link, logo, menu, Favoritter, Log ind, Opret, søgefelter — alle med synlig fokus. Mobilmenu: åbner (aria-expanded true), lukker på Escape, links korrekte.
- Aktiv menu: ingen aria-current på forsiden (korrekt for index).

## 3. Tomt/fejlet lager
OK: ingen "0 annoncer", ingen tomme overskrifter, ingen tal i hero/kørekort/region, ærlig banner "Vi kunne ikke hente annoncerne fra databasen" med "Prøv igen", 0 vandret overflow, én h1, ingen null/NaN.
FEJL (P1-1): CLS i tom/fejl-tilstand er 0,246 ved 1440 (lys OG mørk), 0,146 ved 768 (lys og mørk), 0 ved 390/320. Builderen påstod kun 1440 lys; det er altså også 768 og mørk, og også tom (200 []) — ikke kun 500. Banneret og sælg-panel/sektionsomlægning flytter siden efter hydrering. Rettelse: reserver banner-plads (min-height på en `.hero-sok ~` slot, ca. 106 px ved 1440) eller gør banneret til overlay/sticky (position:absolute under tillidsrækken) — css/styles.css:3846-3849 + js/home.js:249-253 (banneret indsættes først efter hentning; opret en placeholder i index.html eller flyt `body.lager-tomt`-klassen til inline-boot så layoutet er stabilt). Mål efter: CLS < 0,05 ved 768 og 1440.
FEJL (P1-2 / P2): tom/fejl-tilstand ved 1440 og 768 viser "Sælg"-panelet i ~80 % bredde med tom højre kolonne (screenshots w9c-shots2/full-fejl-light-1440.png) — ikke "kompakt bånd" som builderen skriver; ved 1440 mørk er det et bånd, men ved 1440 lys med forkert gitter. Genmål efter rettelse 1 og lad bånd/bredde gælde i begge temaer (js/home.js:249 + styles.css:3842-3860).

## 4. Regression
- smoke-browser index (320/390/768/1440 x lys+mørk, --cls 0.05 --strikt): 0 fejl, 0 advarsler (normal CLS 0–0,023).
- node --check home.js/components.js/test: OK. npm test: 921 af 921 grønt.
- Test-ændring i js/w7-visuel-kort.test.js: rimelig og dokumenteret (Favoritter altid synlig er CLS-sikker, tæller skjult ved 0, tester stadig statisk markup og at header-fav undtages i components.js).
- Kontrast: ingen nye lavkontrast-fund i smoke; ikke målt pixel for pixel.

## 5. Merge-risiko
`git merge-tree --write-tree gauntlet/master gauntlet/w9-frontend` -> rent træ (be82e025…), 0 konflikter. w9 rører kun css/styles.css, js/home.js, js/components.js, w7-test, DESIGN_DNA.md; master (22d05a8) kom fra w8-cls (facet-sider). Efter merge bør build ikke være nødvendig for disse filer.

## Rettelser før ACCEPT
P1-1 CLS 0,246/0,146 i tom/fejl (1440/768, begge temaer) — se pkt. 3. P1-2 sælg-panel/gitter i tom/fejl ved 768/1440 lys. P3: større hero-h1 (valgfri).
Verdict: AFVIS indtil CLS i fejltilstand er < 0,05; resten kan merges uændret.
