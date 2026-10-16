# critic-w3-seo-3 — blind Critic runde 3, gauntlet/w3-seo (HEAD 456e5bd, baseline c4e8b15)

## DOM: ACCEPTER (ingen P0, ingen P1). 4 x P2 bør rettes/besluttes, 4 x P3.

Metode: byggene kørt på KOPI i `%TEMP%\w3c3` (kopi af worktreet uden .git/node_modules; stien verificeret under temp før hver kørsel, `drive.js` afviser stier udenfor temp/under hovedmappen). Egen mock (`NODE_OPTIONS=--require mock.js` rammer alle child-processer; fetch til andet end Supabase-URL'en og https/net er blokeret, ingen produktion). Syntetisk lager: 2 egne + 602 eksterne (74/345/28/155 pr. kilde), 26 mærker inkl. sjældne. Baselines: `b2/b3/b5/b25` = fuldt lokalt byg med 2/3/5/25 egne (ledger skrevet), derefter hvert scenarie som kopi. Worktree og hovedmappe urørt (`git status` rent). Dev-servere på 8779/8780 stoppet pr. PID.

deploy.yml-diff mod c4e8b15 verificeret: KUN `inputs.tillad_fald` (boolean, default false) + `env: BB_TILLAD_FALD: ${{ inputs.tillad_fald && '1' || '' }}` på build-trinnet. Ingen lastmod-job, ingen upload-artifact, ingen permissions-ændring. Push: `inputs` tomt -> `''`; seo-vagt tester `=== '1'`.

## 1. Scenariematrix (baseline b2: 85 sitemap-URL'er, 26 mærkesider, 2 annoncesider; CI = `GITHUB_ACTIONS=true`)

| Scenarie | Exit | Filer / sitemap | Output | Dom |
|---|---|---|---|---|
| a) netværksfejl (alle kald) | 0 | 0 ændret, sitemap 85 uændret | warning pr. trin + "Byg færdig MED ADVARSEL" | ok |
| b) HTTP 500 | 0 | som a | som a | ok |
| c) `200 []` | 0 | som a | som a | ok |
| d) delvis 40/60/75 % | 0 | 0 ændret, 85 uændret | warnings, brand+facet sprunget | ok |
| d) 85 % | 0 | 2 mærkesider slettet, 93 html omskrevet, sitemap 85->81 (3 model/mc-sider -> noindex + ud af sitemap), 0 døde links | `::warning title=Sider fjernet::` | ok (bevidst gulv 85 %) |
| d) 90 / 95 / 100 % | 0 | 90: 93 html, 85->81; 95: 90 html, 85->82; 100: kun sitemap (soegning mister lastmod) | "Byg færdig." | ok |
| e) facet-hentning: HTTP 502 / `[]` | 0 | 9 maerke-* omskrevet, sitemap 85 uændret, srp sprunget (soegning urørt) | warnings + "sitemap gendannet" | ok (se P3-1) |
| e) brand-hentning 500/`[]` | 0 | 0 ændret | warnings | ok |
| e) srp-hentning 500/`[]` | 0 | 0 ændret, soegning.html byte-identisk, sitemap gendannet | warning | ok |
| e) kun egne-hentning fejler (listing / brand / facet / srp) | 0 | 0-9 html ændret, sitemap 85 | warnings | ok |
| **e) eksternt fald som `fetch` der KASTER (ECONNRESET) i brand / facet / srp** | **1** | facet: sitemap 85->20 i træet (ikke deployet, exit 1) | "build-X fejlede (exit 1)" | **P2-2** |
| f) 0 af 2 egne | 0 | 0 ændret, alle datatrin sprunget | warnings | ok / se P2-4 |
| f) 1 af 2, 2 af 5, 1 af 3 | 0 | 1 / 3 / 2 annoncesider slettet, sitemap konsistent (0 døde), 0 døde links | `Sider fjernet`-warning | ok |
| f) 0 af 5, 12 af 25 egne | 0 | frosset, 0 ændret | warnings | ok |
| f) 22 af 25 egne | 0 | 3 slettet, 109->106 | `Sider fjernet` | ok (loft 3) |
| f) 12 af 25 + tillad | 0 | 13 annoncesider slettet | `ADVARSEL (BB_TILLAD_FALD=1)` + `Sider fjernet` | ok |
| g) guloggratis væk, UDEN yaml | 0 | brand+facet+srp sprunget, 0 ændret | warnings (grøn) | P2-4 |
| g) guloggratis væk, `aktiv:false` i yaml (CI og lokalt) | 0 | 92 html, 85->81 | ingen | ok |
| g) guloggratis væk + tillad | 0 | som yaml | ADVARSEL x2 | ok |
| g) jensensmc (28 = 4,7 %) væk, uden yaml | 0 | hele datalaget frosset (per-kilde 50 %) | warnings | P2-4 |
| h) tillad + net-fejl / 500 | 0 | intet slettet, 0 ændret | warnings | ok |
| **h) tillad + `200 []`** | 0 | 2 annoncesider slettet, sitemap gendannet MED de 2 URL'er (85->85) | `Sider fjernet` + SEO-vagt | **P2-1** |
| h) tillad + 60 % / 40 % | 0 | 6 / 10 mærkesider slettet, 85->76 / 68 | ADVARSEL + `Sider fjernet` | ok (bevidst) |
| **h) tillad + kun facet-hentning `[]`** | 0 | facet bygger med 0 eksterne: sitemap 85->24, facetter noindex, "Byg færdig." | ADVARSEL | **P2-3** |
| i) ny stor kilde (+3000) | 0 | 85->147 URL'er, 57 nye filer, 0 døde | ingen | ok, ingen spuriøs alarm |
| j) uden committet ledger (CI) | 0 | intet slettet, lastmod udeladt på ændrede, ledger ikke oprettet | ingen | ok |
| j) uden committet ledger (lokalt) | 0 | ledger oprettes, lastmod udeladt (ukendt) | ingen | ok |
| j) uden committede data-sider (med/uden ledger, CI + lokalt) | 0 | 94-95 sider genskabt, sitemap 85 | ingen | ok; med net-fejl: ingen sider, uændret |
| k) lokalt: 60 % / 85 % / 90 % / 100 % / net-fejl / facet-502 | 0 | som CI; ledger skrives kun ved fuldt byg, urørt ved sprunget trin | som CI | ok |
| loft: 3 sjældne mærker droppet / 4 / 8 | 0 | 3 slettet + `Sider fjernet`; 4 og 8: brand afbrudt, 0 slettet, sitemap gendannet | warnings | ok |
| **egne 5->2 (3 slettet) + brand / facet / srp springes over** | 0 | 3 annoncesider slettet, sitemap gendannet (88) | warnings | **P2-1** |

Sitemap + ledger er alt-eller-intet ved sprunget trin (verificeret byte-for-byte i alle e-/k-scenarier). Sletteloft (max(3, 5 %)) og `::warning title=Sider fjernet::` virker. build-srp-vagten bevarer soegning.html i alle srp-scenarier. Kategorigulv 85 % / 50 % pr. kilde virker.

## 2. lastmod i CI
- To CI-byg i træk, uændret data, datoer 20.10 og 05.11: sitemap byte-identisk. CI-byg oven på CI-output (dato 01.12): identisk, ledger uændret.
- CI-byg med 90 % data, to forskellige datoer: sitemap identisk; 0 lastmod nyere end committet, 0 afvigende fra committet, 67 URL'er mister lastmod (hash ændret) i stedet for at få en falsk dato. Ingen falsk friskhed.
- Lokalt: 67 af 81 URL'er får dagens dato ved ændret data; ved uændret data kun `soegning` (kendt: blandet sortering).
- Committet sitemap (worktree): XML-hoved og `</urlset>` ok, 56 åbne/lukkede `<url>`, 0 dubletter, 39 med gyldig lastmod, alle filer findes, canonical = loc, 0 noindex, 1 h1 (kun `soegning` har 2, identisk med baseline), alle JSON-LD parser, OG komplet. 13 nye URL'er (budget 4, by 3, mc 4, model 2), 0 væk.

## 3. Sidetærskler (rene funktioner, fixtures)
- By: 0/1/7/8/9/14/15/19/20/21 x 1/2 kilder x findes/findes ikke -> 0 afvigelser fra reglen (ny side ved >=20 eller >=15 fra >=2 kilder; eksisterende beholdes ved >=8). 20 uden pris eller uden årgang -> `tyndt-indhold`. Sekvens (1 kilde) `21 14 9 8 7 8 14 15 19 20 12 9 8 7 20 9` -> `I I I I - - - - - I I I I - I I`; ingen skift uden at tærsklen er krydset.
- Mærke+type: 14 -> for-faa, 15 -> INDEX; type-dublet (>75 % af typen) afvist.
- Budget: `underGraense` korrekt (null/0/streng); under 10 annoncer -> noindex og ud af sitemap (set i d-scenarierne, ingen 404, ingen døde links).
- Model: 5-9 tæller distinkte (5 rå/3 distinkte -> noidx). **P3-2:** fra 10 rå tæller identiske lagerenheder: 10 identiske -> INDEX, 9 identiske -> noindex.
- Ingen tom side i sitemap (alle 56 har kort/indhold; sider under tærskel er noindex og udeladt).

## 4. SEO-regression (committede HTML i worktree)
- `seo-audit`: 82 sider, 57 indekserbare, 0 fund.
- 0 døde interne links. Nye sider har >=2 indlink hver. Kun type-classic/cross/scooter (noindex) linkes fra indekserbar side, og kun fra `guide-foerste-motorcykel` (kendt). maerke-*->maerke-bsa (noindex) findes også i baseline.
- Unikhed (4-ords shingling, `<main>`): by-sider Jaccard 0,16-0,36 mod nærmeste, mc 0,24-0,33 (mod type-sider), model 0,38, budget 0,44-0,54. Kun brødtekst uden kort: by 0,44-0,47, mc 0,33, model 0,44, budget 0,41-0,45 (til sammenligning eksisterende type-sider 0,37, mærkesider 0,37-0,39). Alle nye sider har egen titel/description/h1 og eget prisspænd/årgange; skabelonlighed er på niveau med de eksisterende sider. **P3-3:** budget-trin er indlejrede mængder (75.000-siden gentages 78 % i 100.000-siden); acceptabelt, men svagest.

## 5. Regression
- `npm test` 525/525. `node --test seo-vagt seo-sider seo-krav` 49/49. `node --check` scripts/js/crawler ok.
- Render af 6 sider (budget-under-75000, by-horsens, mc-honda-touring, model-suzuki-vlr-1800, model-honda-nx-500, index) x 1440/390 x lys/mørk på efterbehandlet kopi, plus 6 andre direkte på worktree-HTML: 0 vandret overflow, 1 h1, ingen scriptfejl. Konsol: kun CSP-hash-fejl på de RÅ committede sider (se P3-4) og mock-artefakter (syntetiske billedhoste/blokeret netværk); ingen på builder-kode.

## Fund

**P2-1 Sitemap-gendannelse efter sletning giver døde URL'er + døde links (exit 0).** Listing-trinnet sletter annoncesider (<= loft 3) FØR brand/facet/srp; springes et senere trin over, gendannes snapshot-sitemappet — som stadig nævner de slettede sider — og de ikke-opdaterede mærke-/budgetsider peger stadig på dem. Reproduktion: base b5 (5 egne), `EGNE=2`, `FLAKY_STEP=build-brand-pages.js FLAKY_MODE=500` (eller facet/srp): 3 annoncesider slettet, sitemap 88 URL'er hvoraf 3 giver 404; `maerke-suzuki/-kawasaki/-harley-davidson` (brand) eller `budget-under-*` (facet) linker til de slettede. Samme med tillad + `200 []`. Udløser: egen annonce sælges i samme byg som en forbigående ekstern fejl; selvhelende næste byg, men advarslen nævner ikke det. Rettelse: efter gendannelse, filtrér `<url>` hvis fil mangler (og udeluk annonce-sletning når et datatrin springes: slet først sidst i kæden, eller lad listing kun slette når alle trin kører).

**P2-2 En kastet netværksfejl på `eksterne_annoncer` er ikke fail-soft (exit 1).** `fetchExternalListings` har ingen try/catch om `fetch`; kun HTTP-status og egne-hentning er pakket ind (SEO_HENT). Reproduktion: egne ok, `fetch` til `eksterne_annoncer` kaster ECONNRESET -> brand/facet/srp afslutter med exit 1 (`build-X fejlede (exit 1)`), deploy blokeres til genkørsel. Builderens påstand "også transiente fejl -> fail-soft" (srp) gælder kun HTTP-fejl. Samme som baseline (ingen regression), men ikke den lovede fail-soft. Rettelse: `try { r = await fetch(...) } catch(e){ throw hentFejl(...) }` i shared.js.

**P2-3 `tillad_fald` er for bredt ved delvis tom hentning.** Med `BB_TILLAD_FALD=1` og et enkelt trin der får `[]` på eksterne (egne ok) slipper facet-trinnet igennem med 0 eksterne: sitemap 85->24, facetsider noindex, "Byg færdig.", ingen gendannelse (reproduktion: h_t_facetflaky). "Nul i alt" fanger kun egne+eksterne begge 0. Rettelse: behold `nulErFejl` for eksterne også under tillad (kun procent-/kildegulv omgås).

**P2-4 Fail-soft er "grøn" og fryser hele datalaget (kendt åbent punkt P2-3).** Realistiske udløsere: sidste egne annonce(r) sælges (0 af 2 — der er kun 2 i dag), opt-out uden YAML, eller én lille kilde (jensensmc 28 = 4,7 %) falder til 0: brand+facet+srp+sitemap står frosne, kun en annotation, indtil `tillad_fald` + lokalt committet build. Ikke deadlock (pipeline deployer), men "falsk friskhed" i form af forældede sider. Anbefaling: rød afsluttende job/`$GITHUB_STEP_SUMMARY` på `[SEO_FALD-MARKØR]`, eller mindst en mail-venlig fejl efter N dage.

**P3-1** Springes kun facet-trinnet over, har brand-trinnet allerede skrevet 9 `maerke-*` om, og deres modelkort peger på `soegning.html?q=...` i stedet for modelsiderne (modelsiderne mister mærkelinks, sitemap uændret).
**P3-2** Model-tærskel: 10 identiske lagerenheder -> indekseret tynd side (kendt, bevidst; klippekant 9/10). Tæl distinkte også fra 10, hvis de seks gamle sider holder 5 distinkte.
**P3-3** Budget-trin delvist overlappende indhold (se 4).
**P3-4** De tre nye testfiler (49 tests) er endnu ikke i `npm test`. Committede HTML har forældede CSP-hashes (69 af 82 sider uhashede inline-scripts; baseline 56 af 69) — repo-konvention, CI kører csp-hashes; byg lokalt før merge for ren preview.

## Anbefalet før merge
Ingen blokering. Tag P2-1 (lille ændring i build.js) og P2-2 (to linjer i shared.js) med nu; P2-3/P2-4 er beslutninger (ejeren).
