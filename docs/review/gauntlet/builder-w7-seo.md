# Builder W7 SEO (branch gauntlet/w7-seo, fra 03dd9a1)

## Acceptkriterier (skrevet først) og bevis

| # | Kriterium | Bevis |
|---|---|---|
| 1a | Rapport over intern linkstruktur: forældreløse, <3 indgående, >3 klik | `node scripts/seo-linkgraf.js`; låst af `scripts/seo-linkgraf.test.js` |
| 1b | Forbedringer kun hvor sande/nyttige, ingen linkfarme (maks. 6 links/blok) | Nyt "Læs også" i guides: højst 3 links, testet |
| 2 | Alle indekserbare sider har korrekt, minimal JSON-LD | `scripts/seo-schema.test.js` (9 tests) |
| 3 | 2 nye guides, sikre fakta, i oversigt, sitemap og interne links | `scripts/guides.test.js` (+4 tests), sitemap.xml, guides.html |
| 4 | title ≤60, description 120-160, ingen dubletter | `scripts/seo-meta-laengde.test.js` |
| 5 | Ingen img uden alt; dekorative alt=""; lazy-regler | `scripts/seo-billeder.test.js` |
| 6 | `node --check` på alle scripts, `npm test` grøn | 831/831 grønne; 4 nye testfiler + guides.test.js: 74/74 |

## 1. Intern linkstruktur (90 sider, 61 indekserbare, måling på committede sider)
- Forældreløse indekserbare: 0. Sider med <3 kontekstuelle indgående: 0 (lavest: mc-harley-davidson-cruiser 3, annonce-harley 4, nye guides 3-4). Dybere end 3 klik: 0 (maks. 2 for indekserbare; 3 kun for noindex type-classic/-cross/-scooter).
- Header/footer tælles ikke som signal; kun links i `<main>`.
- Sandt hul fundet: guides havde ingen indlink til hinanden. Rettet med "Læs også" (maks. 3, kun eksisterende guides, aldrig siden selv) i alle 5 guides. Ingen nye blokke på facet/mærkesider (de har allerede Se også/relaterede; "Se også" på modelsider kan blive lang for mærker med mange modeller — ikke rørt, se rest).
- Observation: noindex-sider (region-sjaelland, model-honda-nx-500) får bevidst 0 indlink.

## 2. Struktureret data
- Alle blokke parser; kun forventede typer pr. familie; én BreadcrumbList pr. side (positioner 1..n, Forside først, canonical sidst, ingen noindex-led); FAQ-spørgsmål og -svar står synligt (alle sider); ItemList kun når den dækker alle (ingen på committede sider, generator testet); ingen aggregateRating/review.
- FUND og RETTET: `article:published_time/modified_time` forsvandt, fordi `scripts/build-meta.js` overskriver metablokken efter build-guides. build-meta læser nu datoerne fra sidens egen Article-JSON-LD (ingen dato opfindes). Tags indsat i de 3 committede guides.
- Bevidst uændret: facet-breadcrumb-JSON-LD udelader mellemleddet "Søgning" (T-007, facet-sider.test.js), mens synlig brødkrumme har det. Testen kræver delmængde i samme rækkefølge med samme første/sidste led.
- Rest: annonce-JSON-LD breadcrumb peger på søge-URL'er med parametre (mellemled), og `description` er sælgers fritekst (T-014, annonce-strømmens fil).

## 3. Nye guides (datoer 2026-10-16, egne `published/modified`; de tre gamle uændret 2026-10-15)
- `guide-brugt-motorcykel` dækker allerede "tjek brugt MC" fuldt (papirer, Bilbog, stand, syn, handel) => ingen ny dublet (kannibalisering undgået).
- NY `guide-mc-forsikring.html` ("MC-forsikring: det skal du vide som ny motorcyklist"): kun § 105 (ansvarsforsikring er lovkrav), ansvar vs. kasko som begreber, spørgsmål til tilbud, klageveje (Ankenævnet for Forsikring, Forbrugerombudsmanden, Finanstilsynet). Ingen priser, ingen selskaber, ingen procenter (testet).
- NY `guide-mc-udstyr.html` ("MC-udstyr til ny motorcyklist: hjelm og tøj"): § 81 (ordlyd genbrugt fra eksisterende guide), pasform, EN 17092 nævnt kun som mærkning at spørge til, brugt udstyr. Spørg Færdselsstyrelsen om hjelmgodkendelse (loven er ikke citeret, hvor jeg ikke kunne verificere den).
- Kilder (nye): finanstilsynet.dk, ankeforsikring.dk (verificeret ved opslag), forbrugerombudsmanden.dk, fstyr.dk (verificeret), sikkertrafik.dk. Genbrugt: retsinformation (færdselsloven), borger.dk.
- Integration: guides.html (kort + CollectionPage ItemList = 5), sitemap.xml (egen lastmod pr. guide, oversigt = seneste), "Læs også", gd-data `related`.
- Vigtigt: eksisterende guides/guides.html er kun kirurgisk ændret (build-stempler, GA4 og CSP-hash bevaret). De to NYE filer er rå generator-output uden `?v=`/GA4/CSP-hash; Orchestratorens `build.js` skal give dem dem.

## 4. Title/description
- Titler: alle ≤60. Descriptions: 50 sider lå på 96-116 tegn; formler forlænget (`medSlut` i build-facet-pages.js vælger lang slutning kun hvis ≤160; mærkeindeks og annoncesider tilsvarende). Nu 120-160 overalt undtagen `vilkaar.html` (108, tekstside, ikke min fil). Ingen dubletter (title/description/h1). Intention: model-titler med meget lange navne mister "til salg" men beholder mærke+model (eksisterende regel).

## 5. Billeder
- 0 img uden alt. Annoncefotos: "MÆRKE MODEL — billede n af N"; hero/typefoto/logo: alt="". Listekort-fotos har navn som alt; miniaturer i links med tekst har alt="". Ingen lazy+fetchpriority=high; 1. kort/hero eager.
- Rest: eksterne kortfotos (`.card-photo`) og `.mk-cta-img` har ikke width/height (størrelse via CSS; kort-HTML er delt lag).

## DELT-ØNSKER
- `package.json` testliste: tilføj `scripts/seo-linkgraf.test.js scripts/seo-schema.test.js scripts/seo-meta-laengde.test.js scripts/seo-billeder.test.js`.
- Kør `build.js` så de nye guides får stempler/CSP; `?v=` og GA4 mangler på de 2 nye filer indtil da.
- Evt.: width/height på `.card-photo` i js/components.js.

## Nye filer
scripts/seo-linkgraf.js (+ .test.js), scripts/seo-schema.test.js, scripts/seo-meta-laengde.test.js, scripts/seo-billeder.test.js, guide-mc-forsikring.html, guide-mc-udstyr.html.

## Rest-problemer
- "Se også" på modelsider (samme mærke + 4 andre + kombi) kan nå ~16 chips for Honda; ikke ændret for ikke at fjerne ægte indlink.
- Fakta i de nye guides er ikke juridisk gennemgået; de er bevidst generelle med henvisninger.
