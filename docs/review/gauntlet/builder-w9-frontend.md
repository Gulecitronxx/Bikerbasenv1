# Builder w9-frontend (Agent 1: frontend og designsystem) — Bikerbasen Gauntlet

Branch `gauntlet/w9-frontend` fra 4378bba. Mål: billede 1 (forside) + header/footer/fælles lag. Måling: Playwright mod lokal mock (smoke-fixtures; `data.js` neutraliseret i tom/fejl-tilstand), scripts og screenshots udenfor repoet i `%TEMP%\w9-frontend` (fore-* = før, efter-* = efter).

## Acceptkriterier (skrevet FØR bygning)

| Id | Billedsektion | Kriterium (bevis) |
|---|---|---|
| F1 | Header (billede 1 topbar) | Favoritter (hjerte + tekst) står synligt i headeren på >= 1100 px også med 0 favoritter (som billedet); tælleren tegnes kun > 0 og uden at flytte siden (CLS = 0 fra headeren). Skærmbillede 1440 lys+mørk. |
| F2 | Hero + søgekort | Søgekortet har ingen død luft under antalslinjen: friskhedsteksten er sekundær (lille, egen linje) og kortets nederste luft <= øverste luft + 8 px ved 1440. Hero uændret stærk (h1/ingress kontrast >= 4,5:1 fra w7 bevares). |
| F3 | Sådan virker (4 trin m. pile) | Trinnummer og ikon overlapper ikke (bounding boxes skærer ikke hinanden) ved 320/390/768/1440; pile mellem trin >= 1000 px bevares. |
| F4 | Tom/fejlet lager (forside) | Med 0 annoncer (tomt svar) og med backend-fejl (500): hero viser intet tal; ingen "0 annoncer" i kørekort-/region-/typefliser; ingen tom "Udforsk efter type"-overskrift; sælg-panelet er en kompakt bånd (ikke 1000 px bredt foto); tre kolonner uden sammenpresset region-kolonne; fejlbanneret står under tillidsrækken og giver CLS < 0,05 ved 390 og 1440. |
| F5 | Fælles lag | Komponentkatalog i DESIGN_DNA.md, kun klasser der findes (verificeret med grep). |
| Generelt | alle | scrollWidth == clientWidth ved 320/390/768/1440 lys+mørk; CLS < 0,05 (smoke-browser --cls 0.05 på index); kontrast >= 4,5:1 på nye tekster; tastatur-fokus synligt; `node --check` og `npm test` grønt; CRLF/LF bevaret pr. fil. |
