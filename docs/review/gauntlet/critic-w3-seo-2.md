# critic-w3-seo-2 — blind Critic runde 2, gauntlet/w3-seo (HEAD 4188e43, baseline c4e8b15)

Metode: kun lokale filer, rene funktioner og mock af `fetch` (alt der ikke er mock blokeres; ingen produktionskald). Build kørt på KOPI i `%TEMP%\w3c2` (node_modules via junction, `NODE_OPTIONS=--require mock.js` så alle child-processer mockes). Syntetisk lager 2 egne + 602 eksterne (74/345/28/155 pr. kilde, 25 mærker), baseline-ledger fra branchen. Scripts ligger udenfor repoet.

## DOM: AFVIS i nuværende form (P1-1 skadet sitemap, P1-2/P1-3 følger af at fjerne lastmod-jobbet). ACCEPTER når de er rettet; ingen P0.

## Fejl fra min side der skal ryddes
Første kørsel af `node scripts/build.js` gik ved en fejl i hovedmappen `C:\Users\pasca\Desktop\rod\Claude code` (et `cd` til kopien fejlede). Det kørte HEAD a0f91cf's gamle build med mock-data (intet netværk, ingen produktion) og ændrede 56 sporede genererede filer (16 `maerke-*.html` slettet, resten omskrevet) samt skabte 25 utrackede sider (24 x `model-*.html` + `maerke-piaggio.html`). Oprydning (`git checkout -- .`) blev gentagne gange blokeret af hook'en "Fact-Forcing Gate"; jeg har ikke omgået den. Hovedmappen er derfor stadig beskidt. Mine ændringer har mtime 07:16; de utrackede `docs/review/gauntlet/critic-w3-*.md`, `r2a_*.png` og `work/` er ældre og IKKE mine. Ryd op: `git -C "C:\Users\pasca\Desktop\rod\Claude code" checkout -- .` og slet utrackede `model-*.html` + `maerke-piaggio.html`.

## 1. Fail-soft: scenarie-tabel
Baseline = fuldt byg på kopi: 131 html, sitemap 111 URL'er, ledger meta 602 eksterne / 2 egne. `udgiv` = scripts/udgiv.js kørt på resultatet.

| Scenarie | Exit | Sider | Sitemap | Output | Dom |
|---|---|---|---|---|---|
| a) netværksfejl (alle kald) | 0 | 0 slettet, 0 html ændret (soegning.html uændret) | 111 uændret | 4 x `::warning`, "Byg færdig MED ADVARSEL"; udgiv ok | ok |
| b) HTTP 500 | 0 | som a | uændret | som a | ok |
| c) `200 []` | 0 | som a | uændret | som a | ok |
| d60) 60 % af rækkerne | 0 | 0 slettet | uændret | brand+facet sprunget, 3 warnings | ok |
| d75) 75 % | 0 | 0 slettet, 107 html omskrevet | 111 -> 102 (9 modelsider ud) | INGEN advarsel, "Byg færdig." | P2-1 |
| d95) 95 % | 0 | 93 html omskrevet | uændret | ingen advarsel | ok |
| d90, sjældne mærker | 0 | `maerke-indian.html` SLETTET | 98 -> 96 | ingen advarsel | P2-1 |
| d75, sjældne mærker | 0 | 3 mærkesider slettet (indian, rewaco, victory) | 98 -> 92 | ingen advarsel | P2-1 |
| e) 0 af 2 egne (eksterne ok), uden tillad | 0 | listing sprunget; annonce-*.html står; brand/facet kører | 111 -> 108 (2 annonce-URL'er + model-bmw-r45 væk, filerne findes) | 2 warnings | P2-2 |
| e2) som e + tillad_fald | 0 | 2 annoncesider slettet, alt rebygget, udgiv ok | 108 konsistent | ingen | ok |
| e3) 1 af 3 egne (under gulv 20) | 0 | 2 annoncesider slettet | 112 -> 110 | ingen | ok (bevidst) |
| f) kilde opt-out med `aktiv:false` i yaml | 0 | rebygget | 111 -> 102 | ingen | ok |
| f2) opt-out UDEN yaml | 0 | brand+facet+srp sprunget; fravalgt kildes annoncer står på committede sider | uændret | 3 warnings (grøn pipeline) | P2-3 |
| f3) f2 + tillad_fald | 0 | rebygget | 111 -> 102 | ingen | ok |
| g) tillad_fald + netværksfejl/500 | 0 | intet slettes (hentefejl omgås ikke) | uændret | warnings | ok |
| g2) tillad_fald + `200 []` | 0 (udgiv AFVISER) | begge annoncesider slettet; brand/facet sprunget ("nul i alt" gælder altid) | 111 lister 2 slettede sider | warning | P3 |
| h-brand) kun brand-trinnets hentning fejler | 0 | uændret | uændret | warning | ok |
| **h-facet) kun facet-trinnets hentning fejler (502)** | **0** | 0 slettet, 25 html omskrevet | **111 -> 40: alle 71 facet-URL'er væk** | 2 warnings; teksten "sitemap-poster beholdt uændret" er FALSK | **P1-1** |
| h-srp) kun srp's hentning fejler | 1 | build fejler (deploy blokeret, retry hjælper) | — | — | P3 |
| i) kun srp's eksterne = `200 []` | 0 | soegning.html overskrevet: "2 annoncer fundet", 0 eksterne kort | uændret | ingen advarsel | P2-4 |
| fuldt tomt ("nul i alt") | 0 | intet ændret | uændret | warnings | slipper IKKE igennem |

I ingen kørsel slettes en committet side forkert ved exit 3 (generatoren stopper før skrivning). Undtagelser: delvis hentning over gulvet (P2-1) og bevidst tillad_fald. Et skadet sitemap kan dog udgives (P1-1). build-srp-springet er korrekt: soegning.html forbliver byte-identisk i a/b/c/d60/f2.

### Fund

**P1-1 Skadet sitemap deployes med kun en advarsel (brand OK, facet sprunget).** `build-brand-pages.js` overskriver `sitemap.xml` UDEN facet-poster; `build-facet-pages.js` udvider den bagefter. Fejler facet-trinnets egen hentning/lagertjek efter at brand er lykkedes, fortsætter build.js, og sitemap bliver 40 i stedet for 111 URL'er (alle `type-/region-/model-/budget-/by-/mc-/koerekort-`). Reproduktion: `FLAKY_STEP=build-facet-pages.js node scripts/build.js` med mock (502 på facets `eksterne_annoncer`). Samme delvise skrivning giver e) (annonce-URL'er væk, filer står).
Minimal rettelse (verificeret på kopi: sitemap 111 uændret i både h-facet og e): i `scripts/build.js` snapshot `sitemap.xml` og `scripts/sitemap-lastmod.json` før løkken og gendan dem, hvis `faldTrin.length > 0`:
```js
const fs = require('fs');
const SNAP = ['sitemap.xml','scripts/sitemap-lastmod.json'].map(f => path.join(__dirname,'..',f)).map(p => [p, fs.existsSync(p) ? fs.readFileSync(p) : null]);
// efter løkken, i if (faldTrin.length){ :
for (const [p, b] of SNAP) if (b) fs.writeFileSync(p, b);   // sitemap er alt-eller-intet
```

**P1-2 Fjernes `lastmod`-jobbet, vender første Critics P1-2 (falsk friskhed) tilbage.** Simuleret med fast "dato" og uændret committet ledger: dag 1 (live-data afviger fra committet hash) giver 90 af 111 URL'er `lastmod = 17.10`; dag 2 med IDENTISK indhold giver de samme 90 URL'er `18.10`. Datoen er deployets, ikke ændringens; Google lærer at ignorere lastmod (S-011).
Sandfærdig alternativ (din skitse holder): commit `scripts/sitemap-lastmod.json` i hvert lokalt push; i CI sættes `lastmod` KUN når hashet er lig det committede, ellers udelades den; CI skriver aldrig ledgeren. Verificeret på kopi: uændret data -> 98 URL'er beholder deres committede dato; 95 % data -> 96 URL'er uden lastmod, resten med ægte dato, ingen falsk dato. Kode (seo-vagt.js):
```js
function lastmodFor(ledger, nøgle, hash, idag){
  const e = ledger.sider[nøgle];
  if (process.env.GITHUB_ACTIONS) return e && e.h === hash ? (e.d || null) : null;  // CI kan kun bevidne en committet dato
  ... uændret ...
}
function skrivLedger(root, ledger){ if (process.env.GITHUB_ACTIONS) return; ... }
```
Fjern `upload-artifact`-trinnet og `lastmod`-jobbet fra deploy.yml, tilføj en CI-test i `seo-vagt.test.js`, og skriv i arbejdsgangen: "kør `node scripts/build.js` lokalt og commit `sitemap-lastmod.json` sammen med siderne før push". Bivirkning: efter en crawl står de datadrevne sider uden lastmod, indtil nogen committer en lokal build. Det er sandt og harmløst. (`soegning` skifter hash med dagen pga. blandet sortering, så den står oftest uden lastmod.)

**P1-3 (følge af P1-2) Et bevidst fald er ikke "sticky" i CI uden ledger-commit.** Baseline-meta opdateres kun af en committet ledger. Efter `tillad_fald` skal en lokal `BB_TILLAD_FALD=1`-build committes, ellers springer næste almindelige push brand/facet/srp over igen (grøn pipeline, frosne data). Skriv det i fejlbeskeden og i workflow-inputbeskrivelsen.

**P2-1 Delvis hentning over gulvet ændrer/sletter uden advarsel.** 70 % (50 % pr. kilde) lader 75 %/90 % igennem: 9 modelsider ud af sitemap ved 75 %, og committede mærkesider for sjældne mærker SLETTES (indian ved 90 %; indian+rewaco+victory ved 75 %) med exit 0 og ingen warning. Anbefaling: loft på sletninger pr. byg (> 3 sider -> SEO_FALD) eller en `::warning` ved enhver sletning, og hæv kategorigulv til 85–90 %.

**P2-2** 0 egne uden tillad_fald efterlader forældede annoncesider live, men ude af sitemap (e). Skriv det i advarslen.

**P2-3 Opt-out uden yaml fryser hele datalaget** (f2). Fail-soft er "grøn" — kun en annotation, ingen mail. Den fravalgte kildes annoncer bliver stående (CLAUDE.md regel 5). Anbefaling: et lille job efter `deploy`, der fejler (rødt) hvis loggen har `[SEO_FALD-MARKØR]`, eller skriv til `$GITHUB_STEP_SUMMARY`.

**P2-4 build-srp har ingen egen vagt** (i). Giv den samme `tjekAntal` mod `ledger.meta.eksterne`; i dag overskrives søgesidens statiske første side med "2 annoncer fundet" (klienten retter ved hydrering).

**P3** (a) Committede facet-sider i branchen har forældede CSP-hashes (efterbehandling skrev nye hashes på 35 af 82 sider; inline-script blokeres i en rå browser). CI kører csp-hashes, så ingen produktionseffekt; kør en fuld lokal build før merge. (b) By-hysterese hviler på committet fil; i CI uden commit er den et simpelt snit ved 8. (c) De tre nye testfiler (45 tests) er ikke i `npm test` endnu. (d) h-srp: transient hentefejl giver exit 1 i stedet for fail-soft.

## 2. deploy.yml
- YAML parser uden fejl/advarsler (`yaml`-pakken). `workflow_dispatch.inputs.tillad_fald` boolean, default false.
- `inputs.tillad_fald && '1' || ''` er korrekt: push -> `inputs` tom -> `''`; dispatch true -> `'1'`, false -> `''`. seo-vagt tester `=== '1'`, så tom streng er falsk.
- `upload-artifact@v4` + `lastmod`-job er syntaktisk gyldige (`needs: deploy`, kun main, `contents: write`). Fjernes de, er der ingen følgefejl i filen; fjern også artifact-trinnet. Konsekvens: se P1-2/P1-3.

## 3. Indholdsfund fra runde 1
- CB 650 R / CB 1000 R / CB 1000 Hornet / CBR 650 R / CL 500 A / NC 750 X / XL 750 Transalp: ingen filer, ikke i sitemap. Sitemap 56 URL'er: 0 dubletter, XML-hoved og `</urlset>` ok, 56 åbne/lukkede `<url>`, 39 med lastmod, alle filer findes, canonical = loc, ingen noindex, 1 h1 (kun `soegning` har 2, identisk med baseline), alle genererede sider har ≥2 indlink.
- By-tærskel som fixtures (0/1/7/8/9/14/15/19/20/21 x 1/2 kilder x side findes/findes ikke): ny side kun ved ≥20 eller ≥15 fra ≥2 kilder; eksisterende beholdes ved ≥8; ingen tynd side bliver indekserbar. Sekvens 21,14,9,8,7,8,14,15,19,20,12,9 med lokal committet fil giver `I I I I - - - - - I I I` (ingen flip-flop).
- Model: 5–9 tæller distinkte annoncer; P3: fra 10 tælles råt, så ≥10 identiske lagerenheder kunne give en tynd side. Budget p5: "ca. 5.000 / 10.000 / 13.000 / 15.000 kr." kun ved ≥20 priser (fixture med 25: 3.900; 19 priser: ingen "fra"). `numberOfItems` er udeladt på budget/by/mc/model; JSON-LD parser. Ingen indekserbar facetside linker til noindex-sider (kun `guide-foerste-motorcykel` til type-classic/cross/scooter, ikke dette scope).

## 4. Regression
- `npm test` 525/525; `node --test seo-vagt seo-sider seo-krav` 45/45; `node --check` js/crawler/scripts ok; `node scripts/seo-audit.js` 82 sider, 57 indekserbare, 0 fund.
- Render (budget-under-30000, by-horsens, mc-honda-naked, model-suzuki-vlr-1800, model-honda-nx-500, index) x 1440/390 x lys/mørk = 24 kombinationer, efter post-trin (meta/stamp/inline/csp) på kopi: 0 vandret overflow, 1 h1, 0 konsolfejl. AA-fund kun på tekst over foto/gradient (`index .tile`, identisk markup med baseline), ellers 0.

## Anbefalet minimum før merge
1. P1-1: gendan sitemap + ledger hvis et datatrin er sprunget (kode ovenfor).
2. P1-2/P1-3: fjern lastmod-job + artifact; CI-skrivebeskyttet ledger (kode ovenfor); dokumentér "commit ledger lokalt".
3. P2-1/P2-4 (sletningsloft, srp-vagt) kan komme som opfølgning.
