# Builder w5-visuel (bølge 5) — Bikerbasen Gauntlet

Branch `gauntlet/w5-visuel` fra 3caffd2. Kilde: `detective2-visuel.md` (V2-001..V2-014). Måling med Playwright mod egen mock (page.route; ingen produktionslæsning; fotofiler 260-330 KB for egne annoncer og 70-90 KB for eksterne), dev-server port 8803, scripts udenfor repoet (`C:\Users\pasca\Desktop\rod\w5v_tmp`).

## Acceptkriterier (skrevet FØR bygning)

| Id | Kriterium (måles før/efter) |
|---|---|
| V2-001 | Hvid label på type-/kørekort-/region-fliser (`.fa-typer a`) og forsidens `.tile`: 90. percentil af pixlerne i flisens nederste 40 % giver >= 4,5:1 mod hvid, lys og mørk, 390 og 1440, også med et ERSTATTET helt hvidt foto (worst case). Samme bundgradient som forsidens fliser. |
| V2-002 | h1, kicker og ingress i heroen på guide-a2, om-bikerbasen, 404, koerekort-a2, maerke-yamaha: 90. percentil af pixlerne bag teksten >= 4,5:1 ved 390 og 1440 (lys + mørk). Scrim kun lokalt bag tekstkolonnen; fotoet stadig tydeligt synligt (screenshot læst). |
| V2-003 | CLS <= 0,02 på statisk annonceside ved 390 og 1440 (PerformanceObserver, mock). Breadcrumb-højde reserveret i CSS. |
| V2-004/005 | CLS <= 0,03 ved 320/360/390/1440 på type-scooter, region-hovedstaden, budget-under-50000, maerke-yamaha og soegning.html?q=honda. |
| V2-006 | Kort uden for første række har loading=lazy + decoding=async; første række har fetchpriority; LCP-element (hero) ikke lazy. Billedbytes ved første load på forside 1440/390 før/efter (mock). |
| V2-007 | 12 sider x 390/1440: 0 interaktive elementer < 24 px i højde/bredde (sigt 44 px); breadcrumb og indholdsfortegnelse >= 40 px høje. |
| V2-008/009/010 | Kort i samme række har ens chip-række-y (±1 px); ingen orphan "\|" ved nogen kortbredde; én tomt-foto-tilstand (samme markup/udseende i grid, liste, swipe, Lignende). |
| V2-014 | <= 640 px: kortlister som vandret skinne med scroll-snap og peek ELLER kompakt 2-kolonne; sidehøjde ved 390 falder >= 30 % på koerekort-a2 og maerke-yamaha; kort kan nås med tastatur; ingen sideoverflow. |
| Generelt | scrollWidth == clientWidth på alle målte sider/bredder; `npm test` grøn; `node --check`; linjeskift bevares. |
