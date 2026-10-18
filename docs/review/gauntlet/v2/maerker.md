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
