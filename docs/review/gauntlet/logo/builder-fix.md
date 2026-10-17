# Builder — logo-fix (runde 2 efter blind Critic)

Branch `gauntlet/logo-fix` (fra f37bdcd = det der er live). Kun de fire P2 fra Critic'en (docs/review/gauntlet/logo/critic.md) + P3 (flise/vægt).
Godkendelserne i `img/brands/manifest.json` er urørt (20 godkendt af ejer, inkl. Harley-Davidson, Indian, Benelli). Kun tekniske felter er føjet til manifestet
(`varianter.emblem` pr. mærke) og `variant` er rettet til `lockup` for de to mærker, hvis fil allerede bærer navnet (Harley-Davidson, Ducati).

## Acceptkriterier (skrevet FØR bevis; målt i headless Chromium, cache slået fra, ikke ved strengsøgning)

| # | Punkt | Kriterium | Bevis |
|---|---|---|---|
| P2-1a | Dobbeltkald | Hver SVG-fil hentes **højst én gang** pr. sideindlæsning (Playwright, `cacheEnabled:false`, serveren sender `no-store`): forside, maerker.html (genereret kopi), mærkeside, annonce, søgning med åbent filter. Ingen `bl-probe`-`<img>` med samme URL som maskeelementet | w13-logo-layout (tæller requests pr. URL) + w13-integration |
| P2-1b | Antal | maerker.html: ≤ 1 request pr. unik logofil (før 26 SVG til 13 logoer); forside = 1 pr. unikt logo (før 12 til 6). Måles og indsættes nedenfor (før/efter) | måling nedenfor |
| P2-1c | Fejl-fallback bevaret | SVG svarer 404 (eller 200 med HTML i stedet for SVG): `.bl` får `bl--fejl`, masken er `display:none`, fallback har areal > 0, slottens mål flytter sig ikke; også dynamisk indsat markup (A8 uændret grøn, skærpet med request-tælling) | w13-logo-layout A8 |
| P2-1d | Ingen tom plads / CLS | CLS 0 med SVG forsinket 900 ms; ensfarvet logo er usynligt (`visibility:hidden`) til det er hentet, aldrig en massiv blok | w13-logo-layout A7 |
| P2-1e | udgiv-vagten | statiske sider (generatorerne) har stadig en statisk logoreference, så en manglende logofil afbryder udgiv.js (A14) — uden at referencen henter noget | w13-logo-generator A14 + request-tælling |
| P2-2a | Alle 20 i A–Z | maerker.html (syntetisk lager, alle 20 godkendte) viser `.bl--logo` (ikke `.bl--mono`) i A–Z-rækken for alle 20 godkendte mærker; mærker uden logo viser monogram i samme slot | w13-logo-generator + browser-måling |
| P2-2b | Ens slot | alle rækker i A–Z og i søgefilteret har ens venstrekant (1 unik x for logo-kolonnen og 1 for navnene) og ens kolonnebredde (56 px) | w13-integration S1 + generator-måling |
| P2-2c | Variant pr. størrelse | `logoFor` giver `emblem`; `logoHTML` vælger emblem-varianten i `sm` når den findes og forholdet ≤ 3,0, ellers hovedfilen skaleret til den brede slot; ingen mærke-hårdkodning (data i manifestet) | w13-logo-kerne |
| P2-2d | Læsbarhed | intet logo i `sm` bliver lavere end 12 px (ellers monogram) | w13-logo-kerne |
| P2-3a | Hero-ramme | `.mk-hero .bl--hero` er 56-72 px høj på desktop (≥ 700 px), op til 280 px bred; ens areal-regel; ≥ 70 px højde for Indian; skaleret ned på mobil (≤ 48 px) | genereret kopi + måling |
| P2-3b | Én lockup | Harley-Davidson og Ducati (logoet bærer navnet) viser kun logoet, ingen ekstra tekstlinje; Benelli (ordmærke) uændret; kun emblem-only logoer får navnet ved siden af | w13-logo-generator |
| P2-3c | CLS | `smoke-browser --cls 0.05 --strikt` på de berørte sider; egen layout-shift-måling med SVG forsinket = 0 | smoke + måling |
| P2-4a | Annonce desktop | ≥ 1180 px: logo 56-64 px højt (emblem-only får samme højde), op til 160 px bred; titelrækken ≤ 72 px (+ H1 ombryder pænt, ingen H1-overlap) | w13-integration A2 |
| P2-4b | Tablet/mobil | logoet ved siden af H1 i fast slot (≥ 34 px højt), ingen vandret scroll | w13-integration A3 |
| P2-4c | Resize | 1440→768→390→1440: logoantal konstant (1), ingen dubletter/tab, ingen CLS | w13-integration A3 |
| P3 | Vægt/flise | ens max-højde + ens max-areal-regel i alle slots (A9: areal-forhold ≤ 2,2 også for sm, lg, xl, hero); forsidens flise: navnet bryder ikke over to linjer ved 1440 | w13-logo-layout A9 + integration F3 |
| G | Gate | `node --check`, `npm run gate` (uden build), `npm test`, `node scripts/brand-logos-gen.js --tjek`, `kritisk-gen.js` + `w12-kritisk.test.js` grønne | gate-linje nedenfor |
