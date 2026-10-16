# Critic w5-seo (bølge 5) — DELRAPPORT

Blind kritik af `gauntlet/w5-seo` (HEAD 883f64d, baseline 3caffd2). Alt målt på kopier i temp (`git archive` af begge commits), mock-fetch (ingen netværk, ingen produktionslæsning), egne fixtures (722 og 813 rå annoncer, 27 mærker). Intet kørt i hovedmappen eller worktreen.

## 1. Chips (F2-004/F2-005) — status: OK på statisk HTML, ét åbent punkt

Metode: egen fixture (CB 1000 / CB 1000 R / CBR 1000 F / Fireblade, CRF 110 F vs Africa Twin, 10 identiske NX 500, modeller med komma, `&`, `/`, `'`, dobbelt mellemrum, punktum, bindestreg). Generatorerne kørt på kopi. For hver `<a>` med tal på hver genereret side: href parset med EGEN udklipning af `readStateFromURL` fra js/search.js (vm) og evalueret med `Filtrering.anvendFiltre`. Krydstjek mod Builderens klip (`seo-chip-tjek.js`).

| Kørsel | Chips tjekket | Afviger | Dublet-nøgler | Klip-drift (mit vs. Builders) |
|---|---|---|---|---|
| BEFORE (3caffd2), fixture 1 | 2481 | 66 (budget 14, mærke 6, model 16, region 30) | 5 (`maxPrice` x2) | 0 |
| AFTER (883f64d), fixture 1 | 2466 | 0 (2 falske positiver i min parser: link uden tal) | 0 | 0 |
| AFTER, fixture 2 (+13 mærkelige modelnavne) | 2689 | 0 | 0 | 0 |

- Builderens klip er identisk med min egen i alle 2,5 k hrefs (ingen drift). Fejlene i BEFORE reproduceres uafhængigt (fx `Under 30.000 kr. · 64` -> søgningen viser 576; `CB 1000 72 annoncer` -> modelsiden har 7), så rettelsen er reel.
- De COMMITTEDE sider i worktreen har stadig 5 links med dobbelt `maxPrice` (budget-under-100000/-50000/-75000); forsvinder først ved regenerering (Orchestratoren).
- Chips uden tal (ærligt og konsistent): by (`Se hele Midtjylland i søgningen`), modelnavne med komma, kategori A pga. `kanNedsaettesA2`. `kanNedsaettesA2` findes kun på egne annoncer (`listings`, 0 rækker i drift) så A-chips beholder tal i praksis.

### Fund
- **P2-1 (dødt link, ikke forkert tal):** modelnavn med komma ("XSR 700, Legacy", "Speed Twin 1200, RS") får en indekserbar modelside, hvis `Se alle i søgningen`, årgang-/pris-/km-chips og `Få besked om nye annoncer` (agent=1) peger på `model=XSR%20700%2C%20Legacy`. Søgesiden splitter på komma -> 2 modeller -> **0 resultater**. Før brugte siden `q=`, som virkede. Anbefaling: for `kanStaaIUrl=false` udelad linket eller fald tilbage til `q=` (uden tal) i stedet for `model=`. Tæl også søgeagent-knappen med.
- **P3-1:** `Se alle N i søgningen` på modelsider har rå `&` i href (andre har `&amp;`). Gyldigt i attributter, men inkonsistent.
- **ÅBENT (kan være P1):** klient-hydreringen i `build-facet-pages.js` (linje ~1785, `tael()`) omregner ALLE `[data-fa-n]`-tal i browseren med EGNE regler (`type`, `region`, `kk`, `pris`, `aar`, `km`, `model` på `traef`, ikke via `seo-soeglink`/`anvendFiltre`). Den statiske HTML er korrekt, men efter hydrering kan chippens tal afvige fra søgelinket (fx `model:`-chips filtreres inden for sidens `traef`, mens linket går til alle typer). Måles med Playwright mod kopi (route-mock) — se opdatering nedenfor.

(Rapporten opdateres efter hvert punkt.)
