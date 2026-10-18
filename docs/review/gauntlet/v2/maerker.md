# V2 Mærker, type- og kørekortsider (Builder 3)

## Metode
Udgangspunkt: screenshots i `docs/review/gauntlet/v2/maerker-shots/` (type-sport, koerekort-a2, maerke-yamaha, maerker; 1440/390; lys/mørk).
Sammenlignet med mockups Mærker.png, Sport motorcykler.png, Motorcykler til A 2.png.

## Fund og rettelser
- P3-2 CTA-panel ("Er en sport-motorcykel noget for dig?" m.fl.): motorcykelfotoet lå absolut placeret henover sidste punkt og knap. Rettet i `css/p-facet.css` (sidste `.fa-cta-foto`-regel): fotoet er nu `position:static; order:9` i egen række under knappen, højrestillet, maks 130 px. Verificeret ved bounding-box: foto starter efter knappens bund ved 1440, 1024 og 390 (lys + mørk). Billeder: `cta-*.png`.
- Konsistens: Yamaha 68 annoncer på oversigt og mærkeside; "bekræftet 17. okt. 2026" ens på mærke, type, kørekort, region.
- Kørekortfakta kontrolleret i kode/tekst: A1 0,1 kW/kg; A2 35 kW (ca. 47 hk), 0,2 kW/kg; A 24 år / 22 efter 2 år A2; 48-49 hk = "ikke afgjort" (`A_MIN_HK=50`); "Mulig A2" ≠ bekræftet.
- Logo: Yamaha-logo vises i hero og CTA i lys og mørk; mærker uden logo (Bach) falder tilbage til genereret ordmærke/monogram.

## Restpunkter
- Generatorerne er ikke kørt (rammer Supabase); CSS-rettelsen virker uden regenerering, men kritisk inline CSS skal genbygges af Orchestrator (build -> kritisk-gen -> build).
- Mockuppens fotohero med rytter og slogan ("Revs Your Next Ride") er ikke efterlignet (opdigtet slogan / intet ærligt rytterfoto).
- "Kort fortalt" står bevidst nederst på mærkesiden.

## Tests
`scripts/v2-maerker.test.js` (ikke tilføjet til package.json).

## Iteration 2
Før: `maerker-shots/foer/`, efter: `maerker-shots/efter/` (1440 og 390, lys og mørk, 3 sider).

### Forskelsliste (mockup vs. vores)
**Mærke (Yamaha)**: (1) mockuppens hero har rytterfoto og slogan, vores kun logo + overskrift (ikke efterlignet: intet ærligt foto/slogan); (2) tre kolonner (modeller/kørekort/region) havde tre forskellige højder; (3) annoncepanelet var halvt tomt i bunden; (4) region-fliserne stod som lille klump over tomt rum; (5) tillidsrækken er boksformet, mockuppens er en flad række; (6) modelfliserne i mockuppen har ikon + antal i fast række.
**Type (Sport)**: (1) hero uden rytter; (2) "Populære modeller" var ujævne fliser med hul til højre; (3) etiketter i filterrækkerne havde forskellig bredde, så chips startede forskudt; (4) kortfoto fra forhandlere (MC Syd-skilt) dominerer; (5) mockuppens "typer"-række findes kun på A2-siden; (6) CTA-foto overlappede tekst (rettet i iteration 1).
**Kørekort (A2)**: samme som type, plus (7) modelfliser 4+2 med halvtom række.

### Rettet (kun CSS i p-facet.css / p-maerke.css)
- Modelfliser: fylder rækken, lige høje, titel max 2 linjer; 5-6 modeller i 3 kolonner (A2-siden: 3x2 i stedet for 4+2).
- Filter-/sorteringsrækker: ens etiketbredde (chips justeret).
- Udforsk-efter-behov: lige høje kort.
- Mærke: tre kolonner samme højde, regionsfliser jævnt fordelt, modelfotos lavere (21:9), kørekortlinks forankret i bunden.
- Mærke-annoncepanel: mærketonet baggrund, knap forankret i bunden (intet tomt hvidt felt).
- Mørk tilstand set for mærke og type; mobil (390) uændret layout, smoke 0 fejl.

### Ikke gjort
`node scripts/build.js` / `kritisk-gen.js` blev afvist af værktøjets tilladelsesspærre (produktionslæsning), så generatorer er ikke kørt og kritisk inline CSS er ikke regenereret. Ændringerne er kun i de linkede CSS-filer og virker på de eksisterende byggede sider; Orchestrator skal køre build -> kritisk-gen -> build. Ingen generator-ændringer.
Tests: `scripts/v2-maerker.test.js` (3 tests).
