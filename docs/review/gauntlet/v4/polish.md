# V4 Agent 4 – Visual polish og designfidelitet

Branch `gauntlet/v4-polish` (fra 95df5046, derefter `gauntlet/master` 2b5d2f29 med mærkeregistret merget). Område: forside, mærkeoversigt, mærkesider, type-/kørekort-/regionsider.
Metode: screenshots før/efter med `scripts/visuel-regression.js` (375/430/768/1440/1920, lys+mørk) i `polish/foer/` og `polish/efter/`, plus segmentskud ved 1440/768/390 (egen hjælper, ikke committet). Alle tal i screenshots er syntetisk lager (smoke-fixtures); annoncefotos er fixtureblå.

## Sammenligning mod mockuppen (største hul pr. side før arbejdet)
- **Forside.png** (8/10 før): tillidsrække/hero/kort tæt på. Resthuller: "Sådan virker"-titler står i forskellig højde (lodret centreret), guide-banneret havde et udtværet landskabsfoto under teksten.
- **Mærker.png** (5-6/10 i V3): hero er stadig flad uden rytter (asset-hul, ikke rettet), men: "Sådan virker" med 110 px brede trintekster (6 linjer), regionskolonne med ca. 170 px tomt, kørekortkolonne med 80 px hul over noten, enligt orange "Mere om udvalget"-link, enlig "Se alle"-/"Sælg din"-række under kortene.
- **Sport motorcykler.png** / **Motorcykler til A 2.png**: foto-løse kort havde tekst oven i "Typefoto"-etiketten, tom overskrift ("Populære sport-modeller" uden indhold), søgekortets titel klistret til feltetiketten på kørekortsider.
- **maerker.html** (ingen mockup): 8 topmærker stod 6 + 2, mobil 8 × 125 px = 1.100 px; A–Z havde tomme huller i logokolonnen og "Harley-Davidson" brød over to linjer.

## Rettelser (15 konkrete forskelle; fil i parentes)
1. "Sådan virker" på mærkesider: nummer + ikon på én række over teksten, så trintekst får ≥ 150 px (før ca. 110 px, 6 linjer). (`css/p-maerke.css` V4-1)
2. Regionskolonnen: rækker med andel-bjælke (`--andel` = n / største n, beregnet i generatoren) i stedet for tre små fliser med ca. 170 px tomt; navne brydes ikke ("Syddanmar|k" ved 1920 væk). (`scripts/build-brand-pages.js` `treKolonnerHTML`, V4-2)
3. Kørekortkolonnen: links følger tallene i stedet for at blive skubbet til bunden. (V4-3)
4. "Mere om udvalget": stille foldelink med chevron (mærke- og facetsider), ikke et enligt orange understreget link. (V4-4, `css/p-facet.css` V4-F3)
5. Bunden af mærkesiden: "Sælg din X" og "Se alle N X i søgningen" på én række; linket brydes ikke. (V4-5)
6. Foto-løse kort: teksten overlapper ikke længere "Typefoto (illustration)"-etiketten på kort med "Forhandler"-mærke. (`css/p-facet.css` V4-F2; også mærkesider)
7. Tom overskrift: hydreringen skjuler en liste og dens overskrift, når alle punkter er 0 (fx "Populære sport-modeller"). (`scripts/build-facet-pages.js`, hydreringsscript)
8. Søgekortets titel på kørekortsider har luft til første feltetiket (4 px -> 8 px). (V4-F1)
9. maerker.html topmærker: fire kolonner ved 7-8 mærker (4 + 4 i stedet for 6 + 2), to kolonner på mobil (1.100 px -> ca. 560 px). (V4-M1)
10. A–Z: ensartet logokolonne – mærker uden godkendt logo får det samme neutrale BrandLogos-monogram (før et tomt hul); navnet på én linje, bredere kolonner. (V4-M2)
11. Mærkeheroens fallback-monogram (`.mk-mono`) i samme formsprog som `.bl-mono` (fyldt cirkel, ikke orange ring). (V4-M3)
12. A–Z-bogstavrækken er én rulbar række på mobil (før tre rækker med enligt "Y"). (V4-M4)
13. "Flere mærker": historiske mærker (registret) har stiplet kant, så grupperne kan skelnes uden farve. (V4-M5)
14. Smalle skærme: ulige sidste typeflise fylder rækken; modelfliser tre og tre mellem 560 og 1099 px. (V4-M6)
15. Forside: guide-banneret har en dekorativ bjerg-og-vej-tegning (CSS data-URI) i stedet for et foto under teksten; "Sådan virker"-titlerne står i samme højde. (`css/p-forside.css` V4-H1/H2)

Logoer (opgave 3): alle fliser, A–Z, hero og CTA går fortsat gennem `BrandLogos.logoHTML` (ens slot-areal, mask i currentColor -> lys/mørk uden filskift). Nyt i V4: samme fallback-monogram i A–Z, tile og hero; dark mode verificeret ved 1440/1920 (`efter/*__moerk.png`). Ingen nye logoer, intet hentet.

Bevidst ikke ændret: hero uden rytterfoto (intet ærligt asset), annoncekortets titel/pris-layout (delt komponent), farvede logoer (ejerens ensfarvede valg), indhold/tal (alle beregnet).

## Tests
- **Ny:** `scripts/v4-polish.test.js` (5 tests, browsermåling: 4 kolonner/2 kolonner, A–Z-rækker har logo/monogram, regionsrækker + ingen ordbrud + trintekst ≥ 150 px ved 1440/1920, ingen enlig overskrift og ingen overlap i foto-løse kort, forsidens trintitler i samme højde). Orchestrator tilføjer filen til `package.json` "test".
- 3 kørsler grønne: `js/w14-forside.test.js` (14/14; hero ≤ 270 holder), `scripts/forside.test.js`, `forside-v2`, `v3-forside-cls` (CLS < 0,02), `maerkeside` (32), `facet-sider` (15), `facet-cls`, `facet-intro-cls` (kræver `build.js` efter ændret hydreringsscript pga. CSP-hash), `v2-maerker`, `js/visuel-css.test.js`, `maerke-register` (23), `maerke-audit`.
- Smoke: `node scripts/smoke-browser.js --sider index,maerker,maerke-yamaha,maerke-honda,maerke-harley-davidson,type-sport,koerekort-a2,region-hovedstaden --viewports 320,390,768,1024,1440 --temaer lys,mørk --cls 0.05 --strikt` x2: 80 målinger, 0 fejl, 0 advarsler hver gang.
- Kendte røde, ikke min ændring: `scripts/w13-logo-kerne.test.js` A1 ("mærkeside dkw mangler i manifestet": live-lageret bygger `maerke-dkw.html`, som manifestet ikke har – Agent 1/registret) og `scripts/w13-logo-generator.test.js` A11/A15 ("kopien rørte ikke repoet": fejler, når genererede sider står uncommitted i arbejdstræet; grøn på rent træ).

## Skema (1-10, selvvurdering – Critic dømmer)
| Dimension | Forside | Mærkeoversigt | Mærkesider | Type/kørekort/region |
|---|---|---|---|---|
| Visuel kvalitet | 8 | 8 | 7 – region/trin ryddet; flad hero uden rytterfoto | 7 |
| Designkonsistens | 8 | 8 – ens logo-/monogramkolonne | 7 | 7 |
| Funktionalitet | 8 | 8 | 8 | 8 |
| Brugeroplevelse | 8 | 8 – mobil 560 px kortere | 7 | 7 |
| Mobil | 8 | 8 | 7 | 7 |
| Performance | 8 (CLS < 0,02) | 8 | 8 | 8 |
| Indholdskvalitet | 7 | 8 | 7 | 7 |

Mockup-fidelitet (ærligt): Forside 8/10, Mærker (Yamaha) 6/10, Sport 6,5/10, A2 7/10. Resten er assets (rytterfoto, farvede logoer, frilagte modelbilleder) og data (undertyper, popularitet, oprettelsesdato).

## Restpunkter
- Annoncekort i rækker med ét "Kørekort ikke afgjort"-kort bliver højere, så kortene har luft over chip-rækken (delt komponent, ikke rørt).
- Kørekortkolonnen på mærkesider har stadig ca. 60-80 px luft over noten ved lav modeldækning.
- Genererede HTML-sider er IKKE committet (Agent 1 og Orchestrator bygger efter merge); lokalt kørt `build -> kritisk-gen -> build`. `build-facet-pages.js` skriver også ind i `soegning.html` (Agent 3's fil) – ikke committet.
- `scripts/kritisk-manifest.json` er regenereret lokalt men ikke committet.
