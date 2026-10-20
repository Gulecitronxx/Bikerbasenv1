# V4 Agent 3 - Søgning og marketplace, forfining

Branch `gauntlet/v4-soegning`. Mockup: `Motorcykler til salg.png`. Område: `soegning.html`, `js/search.js`, `js/filtrering.js`, `css/p-soegning.css`.
Screenshots: `docs/review/gauntlet/v4/soegning/` (`foer-*` = HEAD 95df5046, `efter-*` = denne branch; 375/430/768/1440/1920, lys + mørk, samme lager: øjebliksbillede af de aktive indekserede annoncer, så før/efter er sammenlignelige).

## Udgangspunkt: de største forskelle til mockuppen
1. Hero og stort søgekort er fjernet med vilje i V3 (kompakt fritekstfelt). Ikke gjort om.
2. **Mærke/model-filteret virker ikke på lageret.** Model-rullemenuen byggede på kataloget `BRANDS_BY_MODEL`: under Honda (100 modeller til salg) stod 7 (`Africa Twin`, `CB650R`, ...), og `GL 1800 Gold Wing` (24 annoncer) og `CMX 500 Rebel` (17) kunne ikke vælges. Mockuppen viser Mærke -> Model med tal.
3. Mærkelisten viste sentinellen "Ukendt (2)" midt i rækken.
4. Infobåndet under tallet: tre finskriftssætninger (kilder, alder, sorteringsregel) på to linjer, hvor mockuppen har ingen.
5. Visningsknapper: mockuppen har Gitter/Liste; vi havde en tredje "svajpe"-knap (telefonens kortstak) også på desktop.
6. Mobil: 54 px luft mellem Filtre-knappen og "N motorcykler" (målt), 44 px reserveret til en tom kildelinje på <=380 px.
7. Kort: foto, titel+pris, spec-chips og sted/kilde er i forvejen på mockuppens form (W14). Billedtæller (1/12), vægt (kg) og "Autoriseret forhandler" findes ikke i data og er ikke tilføjet; hjertet findes kun på egne annoncer (D-008, favorit-nøglen peger på vores tabel).

## Hvad der er ændret
### Mærker og modeller (`js/filtrering.js`, `js/search.js`)
- **ÉN nøgle for "samme mærke"**: registrets `sammenlignNoegle` (CFMOTO = CFMoto = CF Moto, Zero = Zero Motorcycles, "Andet mærke"/tom = uoplyst). Mærkefilter, facettal, URL-valg og pille bruger den, så mærkesidernes og søgningens tal kan ikke være uenige. Uden registret (side uden `data.js`) falder den tilbage til slug-foldningen (`scripts/slug.js`, låst i testen).
- `Filtrering.maerkeListe()`: ét mærke pr. nøgle, registrets stavemåde, flest annoncer først, **"Uoplyst mærke" altid sidst** (registrets label; værdien i URL'en er stadig sentinellen `Ukendt`, så `?brands=Ukendt` virker). Rækken får en tom logokolonne (ikke monogrammet "U").
- `Filtrering.modelListe()`: modellerne under de valgte mærker **fra lageret**, én række pr. model uanset stavemåde (`CB 650 R` + `CB650R` = 8, samme nøgle som `harmoniserStavning`; egne annoncer løber ikke gennem den), med antal: "GL 1800 Gold Wing (24)". Rullemenuen er alfabetisk, afkrydsningslisten flest først og foldet efter otte ("Vis alle 100 modeller").
- Delte links med anden stavemåde (`?brands=honda&model=gl1800goldwing`) sættes til lagerets stavemåde ved indlæsning, så afkrydsning, pille og URL siger det samme og kan fjernes.
- **Fritekst med alias**: ord, der er et helt mærkenavn/alias (også over 2-3 ord: "cf moto", "royal enfield", "bmw motorrad", "ducati motor holding", "h d"), bliver et mærkekrav; resten er delstrengs-ord som før. "harley road king" = Harley-Davidson og "road king" i modellen; "honda yamaha" = begge. Aliasserne kommer fra `BrandRegistry` (`alle()`), oven på en lille grundtabel med kortformer registret ikke har (`mv`, `agusta`, `guzzi`, `enfield`). Delstrengssøgning ("harl") er uændret. Sentinellen kan ikke findes ved at skrive "ukendt".
- Målt på lageret (735 aktive), gammel kæde mod ny: "h d" 437 -> 82 (matchede enhver model med h og d), "triumph" 36 -> 35 (BSA-annoncen med "Triumph" i modelnavnet), "ktm" 15 -> 14, "bmw motorrad" 0 -> 46, "ukendt" 2 -> 0. Alle andre aliasser gav allerede samme tal.
- QA-fund F2 (10 registeraliasser virkede ikke i fritekst) er lukket og låst i testen.

### Rester (`css/p-soegning.css`, `js/search.js`)
- Mobil: luft over resultatet 54 -> 16 px uden filter. Pillerækken reserveres kun, når siden åbnes med et filter i adressen (samme signal som det inline-script, der skjuler de forudtegnede kort: `#results-grid[style*="hidden"]`). <=380 px: resultathoved 44 -> 24 px.
- Infobånd: sorteringsreglen bor i (i) ved Sortér ("Sådan er rækkefølgen sat"), ikke som tredje linje; kildelinje + alder står tilbage. Reserveret højde er målt igen (76/56/58/38 px) og CLS er under 0,05 overalt. Én linje ved siden af hinanden blev prøvet og kasseret: alderslinjen er 493 px, når lageret er over 14 dage gammelt, og ombrydningen gav CLS 0,117 ved 1440 mørk.
- Svajpe-knappen skjules fra 960 px; en gemt svajpe-visning vises som gitter på bred skærm.
- H1 følger resultatet ("12 motorcykler til salg i Danmark", "1 motorcykel ...", "Ingen motorcykler ..."; med mærke: "Honda til salg - 313 annoncer"). Før stod hele lagerets tal. H1 er visually-hidden og ikke selv live-region; `#results-count` (role=status) siger tallet højt, så der er ingen dobbelt oplæsning.
- Ugyldige tal i adressen ignoreres (`?maxPrice=-5` gav 0 resultater): negative, tekst og uendelig for pris, årgang, km, ccm, hk, ejere, alder og side.
- Fejlbanner (503/tomt lager) på 320-430 px: titlen står fuldt på op til to linjer i stedet for "Lageret kunne ikke hen...".
- `js/search.js` normaliseret til LF som egen commit (V3 havde gjort den CRLF; kun whitespace).

### Micro-interactions og loading
- Loading: åbnes siden med filter i adressen, står de forudtegnede kort som rolige skeletter (shimmer fra `bb-shimmer`) i stedet for et blankt hul, **kun** før `html.so-klar`. (Første version stod også ved tomtilstanden; fanget af browsertesten og rettet.)
- Hjerte-pop, tryk-feedback på sammenlign/favorit/kort/links, hover på filterrækker, fokusring omkring Sortér, tabulære tal i facettal. Alt slukkes af den globale `prefers-reduced-motion`-regel.

## Tests (skal tilføjes til `package.json` "test" af Orchestrator)
- `js/v4-soegning-maerker.test.js` (node, 57 tests): nøgle = slug-foldning, uoplyst, mærkeliste (ingen dubletter, summer = lager, = filter, = mærkesidens gruppering), 40 aliasser mod lageret, alle registermærker og aliasser, QA-aliasserne, modelliste (antal = filter, ingen dubletter), registret. Prøver mod `scripts/fixtures/v4-lager-maerker.json` (735 rækker, kun mærke/model/titel/type/deeplink).
- `js/v4-soegning-ui.test.js` (Playwright, springes over uden): mærke/model/Uoplyst, alias i søgefeltet, kombinerede filtre + sortering, tomtilstand, mobil 375/430 (ingen sidescroll, luft), svajpe, infobånd, antal søgning = mærkeside, H1, ugyldige tal, 503 på 320/375/430.
- Opdateret: `js/w14-soegning.test.js` (sorteringsreglen står i (i)), `js/v2-soegning.test.js` (svajpe-knappen er skjult på desktop).
- Kørt: `node --test` over alle `js/*.test.js scripts/*.test.js crawler/*.test.js`, se rapporten. Smoke strikt (320/390/768/1024/1440 + 375/430/1920, lys+mørk, cls 0,05) 0 fejl, tre kørsler; index/mærkeside/oversigt/model 0 fejl.

## Fund uden for mit område (rapporteres, ikke rettet)
- Lageret har to "købes"-annoncer (`Moto købes` med mærket Ukendt, `Triumph Norton købes` under BSA), der står som annoncer til salg (F-009 gælder kun nye rækker). Hører til crawler/normalisering.
- Modelnavne med støj kommer videre fra kilden og står nu i modelfilteret, fordi det er lagerets modeller: `CBF125 2009 Projekt mekaniker`, `VT600 'NY pris'`, `Café' ræser`, `x town 300 rabatpris`, `God velkørende custom med lav. KM` (Hyosung). Bør renses i `rensModelStoej` (backend-bridge/crawler), ikke her.
- Egne annoncer harmoniseres ikke i stavemåde (`CB650R` vs `CB 650 R`); søgningen slår dem sammen, men kortet viser kildens stavemåde.
- `Vespa/Piaggio/Nimbus/MZ/Peugeot` (egne annoncer) står i mærkelisten med 1-2 annoncer; det er ægte lagerindhold.
- Ønske til registret: ingen. Registerets `UKENDT_LABEL` bruges direkte.

## Selvvurdering (7 dimensioner, 1-10; Critic dømmer)
| | Søgeside desktop | Søgeside mobil | Filter/mærke/model | Kort |
|---|---|---|---|---|
| Visuel kvalitet | 8 (infobånd roligere, to linjer endnu) | 8 | 8 | 8 (foto 2,3:1 beskærer ofte hjul/forgaffel; billedtæller/vægt findes ikke) |
| Designkonsistens | 8 | 8 | 8 | 9 |
| Funktionalitet | 9 | 9 | 9 (model fra lager, alias, canonical URL) | 8 |
| Brugeroplevelse | 8 | 8 (filter i skuffe, 16 px luft) | 9 | 8 |
| Mobil | - | 8 (375/430 uden sidescroll, svajpe bevaret) | 8 | 8 |
| Performance | 8 (CLS < 0,05, nøgle memoiseret) | 8 | 8 | 8 |
| Indholdskvalitet | 7 (kilderne har støj i modelnavne) | 7 | 7 (samme) | 8 |

Mockup "Motorcykler til salg": 7,5/10 (hero og kort over filtre fravalgt; billedtæller/vægt/hjerte på eksterne kort er ikke mulige uden opdigtet indhold).

## Restpunkter
- Titler som "Suzuki (model ikke oplyst)" klippes på ét linje i smalle kort; fuld tekst står i title.
- Kortets fotoformat (2,3:1) er et valg for tæthed; 16:10 ville vise mere af motorcyklen.
- Modelstøj (se ovenfor) kræver rensning i datalaget.
