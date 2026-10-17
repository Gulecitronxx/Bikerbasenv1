# Visual Fidelity Gauntlet, agent 1: forside, header og globale principper

Branch `gauntlet/w14-forside` (fra fefe1570). Reference: `Forside.png` (1672x941). Alle tal er målt i Chromium mod lokal mock
(smoke-browser; annoncefotos pegede på sitets egne `img/type`-fotos). Billeder: `agent1-forside/` (WebP, samlet ca. 2 MB).

## Acceptkriterier (skrevet før arbejdet; målt ved 1440x900 hvis intet andet)

| # | Kriterium | Mål |
|---|---|---|
| A1 | Samlet komposition: hele rækken hero, søgekort, tillid, udvalgte + sælg, typefliser, Sådan virker, tre kolonner skal stå tæt (referencen viser alt på ca. 810 px ved 1440) | tre kolonner begynder højst 1250 px nede (før: ca. 2150) |
| A2 | Header lav | højst 56 px på desktop (før 68) |
| A3 | Hero: foto lavt, tekst øverst til venstre, søgekortet hænger ind over fotoets underkant | hero slutter højst 320 px nede; søgekort højst 120 px højt og overlapper heroens underkant |
| A4 | Udvalgte: fem kort på én række + sælg-panel til højre, panelet starter ud for overskriften | kort højst 270 px; panel.left >= kort 5.right; panel.top <= overskrift.top+4 |
| A5 | Typefliser: syv fotofliser på én række | højde højst 80 px |
| A6 | Sådan virker (ejerens fokus): overskrift over fire trin på ÉN række med nummer, ikon, titel, tekst og pile; guide-boks til højre | trin på samme top (±6 px), stribe højst 140 px (før ca. 330) |
| A7 | Tre kolonner (mærker, kørekort, region): lige høje, region som fem fliser i en række | samme top og højde (±2 px) |
| A8 | Ingen regression: 0 vandret overflow 320/390/768/1024/1440 lys+mørk; CLS < 0,05; tap-mål >= 40 px; kontrast uændret (tokens) | smoke-browser --cls 0.05 --strikt: 0 fejl; js/w14-forside.test.js |
| A9 | Ægte data og funktion uændret (søgekort, kørekort-segment, mærke-/typefliser, favorit, cookie, tastatur, .data-afbrud, SEO) | ingen JS-/markup-ændring i index.html; kun CSS |
| A10 | Ingen opdigtede tal/påstande (12.842, anmeldelser, "tusindvis", kg, svartid) | kopieres ikke; W11-testen "ingen opdigtede påstande" grøn |

## Prioriteret afvigelsesliste (baseline mod Forside.png)

1. **Manglende moduler**: ingen. Alle moduler fandtes (hero, søg, tillid, kort + sælg, typer, Sådan virker, 3 kolonner). Mangler ift. billedet: "Bliv en del af fællesskabet"-boks (erstattet af ægte "Køb og sælg trygt"-guideboks), vægt-chip på kort (ingen vægtdata), kilde-etiket i kortfoden (findes i anden form).
2. **Forkert overordnet layout/komposition** (STØRSTE afvigelse): siden var 3860 px høj mod referencens kompakte ca. 810 px: hero 600 px (ref. ca. 245), søgekort 130 px med accentkant (ref. ca. 75), tillidsrække med ringe, kort 400 px høje (ref. ca. 175), fliser 136 px (ref. ca. 66), Sådan virker som fire store kort (ref. én smal stribe), tre kolonner med lange rækker.
3. **Informationshierarki**: store overskrifter (30 px) med accentstreg, referencen har små (ca. 18 px) overskrifter uden streg.
4. **Kort-/panelopbygning**: kort med 3:2-foto, pris under titel, to rækker chips; sælg-panel med foto i egen boks under teksten (ref.: foto bag panelet, knap forneden).
5. **Billedanvendelse**: hero-foto (studio-motorcykel uden rytter) kan ikke ombyttes (ingen ny asset); sælg-panelet bruger `img/sell-cruiser.webp` fladt.
6. **Proportioner/spacing**: sektionsluft 48-64 px (ref. ca. 12-16), 6-kolonne mærkegitter ok.
7. **Typografi**: h1 60-76 px (ref. ca. 40-44 ved 1440).
8. **Mikro**: header uden "Om Bikerbasen" før 1500 px.

## Hvad er lukket (CSS-only, `css/p-forside.css` + to linjer i `css/styles.css`)

- A1: siden er 2520 px (før 3861); de tre kolonner begynder ved ca. 1150 px (før ca. 2150). Hele flowet til og med typefliserne står inden for første viewport (900 px) minus et par fliser.
- A2/A3: header 54 px (via `--header-h`, global, 60 px under 1100); hero 232-270 px med h1 40-47 px; søgekort ca. 105 px, hvid flade uden accentkant; antal- og aktualitetslinjen ligger på én række under felterne (samme tekst).
- Tillidsrække: fire kompakte punkter, ikon uden cirkel (som billedet).
- A4: kort med 2,3:1-foto, titel + pris på samme linje (modelnavnet klippes ikke: op til to linjer), chips uden ikon, sammenlign-knappen i fotoets nederste venstre hjørne (rammer ikke hjertet); sælg-panelet står ud for overskrift + kort, med fotoet bag panelet og knappen forneden.
- A5: syv fliser på én række, 74 px høje.
- A6: Sådan virker er én stribe: overskrift øverst, derunder fire trin (nummer, ikon, tekst) med pile, guide-boks til højre; på mobil kompakte rækker (ikke store kort).
- A7: tre lige høje paneler; kørekort-celler centreret som i billedet (alderen står synligt, effekt-/kW-reglen står stadig i tooltip og på kørekortsiderne); region som fem fliser.
- Header: "Om Bikerbasen" i navigationen fra 1280 px (før 1500).
- Tests: `js/w14-forside.test.js` (nye, målende); `js/w11-forside.test.js` tærskler bevidst sænket (hero/CTA/felter/ikon/fliser/luft; accentstreg fjernet), begrundet i filens overskrift.
- `scripts/kritisk-manifest.json` regenereret (`node scripts/kritisk-gen.js`).

## Tilbageværende afvigelser (ærligt)

- Hero-motivet: referencens rytter-foto findes ikke som asset; heroen bruger det eksisterende motorcykelfoto. Komposition, højde og tekstplacering matcher, billedet ikke.
- Siden er stadig ca. 15-20 % højere end referencens proportioner ved samme bredde (mærkeplader og lange tillidstekster af juridiske/ærlige grunde; sektionsnoter under kort og fliser findes ikke i billedet; 40 px tap-mål gør sektionsoverskrifterne højere).
- Sådan virker: overskriften står over trin 1 (billedet: i trin 1's celle); fjerde trin er "Gå videre til sælger" (billedet: "Gem og sammenlign" - ingen sammenligning/gem-flow at love); "Bliv en del af fællesskabet" (ingen fællesskabsfunktion) er "Køb og sælg trygt".
- Kort: ingen vægtchip og ingen "Kilde: Forhandler"-tekst i præcis billedets form (kilde står som domæne + sælgertype nederst).
- Sælg-panelet: studiobillede af cruiser i stedet for rytterfoto.
- Region- og mærkefliser strækkes til panelhøjden (kørekortpanelet er højest) og har lidt tom luft.
- Accentfarve er orange (brand), ikke billedets grønne CTA (DESIGN_DNA: grøn kun til ✓).
- Mellem 768 og 1099 px (tablet) er layoutet den mildere, ældre variant (3 kort pr. række).

## Delte ændringer (bagudkompatible, skal flettes af Orchestratoren)

- `css/styles.css`: `--header-h` 68 -> 60 px, og 54 px fra 1100 px (global; alle sticky-offset bruger variablen); `.main-nav .nav-sek` vises fra 1280 px (før 1500). Alle genererede sider har indlejret kritisk CSS fra et tidligere build: **kør build (inline-critical) efter merge**, ellers fejler `scripts/w12-kritisk.test.js` (browser, 1440) på nav-boksen. Bekræftet: i en kopi udenfor repoet med `inline-critical.js` + `csp-hashes.js` kørt er alle 18 tests grønne.
- `css/p-forside.css`: kun `body.home`-scoped; ingen ændringer i kortkomponenten uden for forsiden.

## Verifikation

- `node --test js/w14-forside.test.js js/w11-forside.test.js`: grøn. Smoke: `node scripts/smoke-browser.js --sider index --viewports 320,390,768,1024,1440 --cls 0.05 --strikt`: 0 fejl, 0 advarsler.
- Kopi udenfor repoet med genkørt inline-critical: w10-fejl, w11-fejl2, w12-kritisk, w14, w11 grønne.
- Gate-resultat: se rapport (kørt til sidst).

## Billeder (docs/review/gauntlet/visual/agent1-forside/)

`reference.webp` (mockup), `foer-1440.webp`, `foer-390.webp`, `efter-1440.webp`, `efter-390.webp`, `efter-1440-moerk.webp`, `efter-390-moerk.webp`,
`sammenligning-1-hero-soegning.webp` (mockup | efter, øverst), `sammenligning-2-midtsektion-saadan.webp` (mockup | efter, kort/typer/Sådan virker/kolonner).
Billederne er WebP (ikke PNG) for at holde samlet størrelse nede.
