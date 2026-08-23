# Runde 5 — aim-loop mod bilbasen.dk (23.08.2026)

Metode: tre blinde designer-kritikere (forside, søgeside, annonceside) fik
otte screenshots pr. side (bilbasen/bikerbasen × mobil 390×844/desktop
1366×850 × fold/fuld side) og målte med pixelscanning. Rapporterne står i
`docs/review/runde-5-*.md`. Dev rettede, og tallene nedenfor er målt igen på
dev-serveren (srp.test:8532, demodata slået fra, produktionslageret 548).

## Forside

| | før (mobil 390) | efter | før (desktop 1366) | efter |
|---|---|---|---|---|
| Første annoncekort (y) | ≈4 340 | **1 154** | ≈2 840 | **1 017** |
| Annoncekort på forsiden | 2 | **4** | 3 | **8** |
| Sidehøjde | 9 754 | **8 114** | 6 843 | **6 029** |
| Typefliser (sektion) | ≈800 px, 8 fliser (Scooter 0) | **121 px**, 7 fliser, flest først | 2 rækker | 2 rækker, 7 fliser |
| "Populære mærker" | fast liste (Vespa 0, ingen Harley) | **Honda 262 … Ducati 3**, tal på chippen, → mærkesider | | |
| Hero-linje (mobil) | "548 motorcykler til salg" | "… hos 4 danske forhandlere og markedspladser" | | |
| "Nyeste annoncer" | 670 px tomtilstand | **skjult** (ingen dato i lageret) | 600 px | skjult |
| Header (mobil) | måne + burger | **profil + burger**, tema i skuffen | | |
| Sidefejl i konsollen | 0 | 0 | 0 | 0 |

Sektionsrækkefølge efter: hero → Til salg lige nu → Søg efter type → Mærker
med flest annoncer → (Nyeste, skjult) → (Senest sete) → Tryghed → SEO-bånd →
facet-chips → Sælg din motorcykel → footer.

Ikke bygget (bevidst): Mærke→Model-selects i hero'en (Bilbasens cascade).
Kræver en modelliste bygget af lagerets `model`-strenge med tal i option-
teksten for ikke at skabe nul-træf-kombinationer; `<datalist>` dækker
behovet uden at gøre hero'en højere. Tages op, hvis lageret runder ~2 000.

## Søgeside

| | før (390) | efter | før (1366) | efter |
|---|---|---|---|---|
| Første kort (y) | 394 | **303** | 398 | **335** |
| Første pris (y) | 673 | **542** | | |
| Korthøjde | 481 | **417** | | |
| Rækker oven på listen | 8 | 5 | | |
| Type-filter i sidebar (y) | | | 672 | **511** |
| Specs | 3 linjer + kørekortchip | **én chip-række (24 px)** | | wrapper til 2 rækker (54 px) i 280 px spalte |

## Annonceside (ekstern annonce, id 1021-typen)

| | før (390) | efter | før (1366) | efter |
|---|---|---|---|---|
| Pris (y) | 722 | **615** | 835 | **662** |
| Nøgletal (y) | — | 724 (kørekort først) | | 772 |
| "Annonce hos kilde"-flag | 112 px | **38 px** (skjult ≥960) | | |
| Sticky bar | altid | skjult, mens prisblokken er i view | | |
| "Lignende" | tilfældig | rangeret (model/mærke/pris/ccm/år/type), dedupleret | | |

Gate før commit: `node --check` på alle js, `npm test` (324), `node
scripts/build.js`, `node scripts/udgiv.js` — grønt.
