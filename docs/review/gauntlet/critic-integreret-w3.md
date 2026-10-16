# Blind Critic — samlet kodebase efter w3-data + w3-seo (HEAD cbf7704, baseline c4e8b15)

Metode: alt kørt på KOPI i %TEMP%\crit-w3 (robocopy + junction til node_modules), mock af Supabase via `NODE_OPTIONS=--require mockfetch.js` (syntetisk datasæt, 602 eksterne + 2 egne rækker; ingen produktion læst). Hovedmappen er ikke ændret.

## Dom: ACCEPTER med 1 P2 (brandside-tekst tæller ubeviste "ny" som "brugte") og P3-noter. Ingen P0/P1.

## 1. Data-regler (js/data.js)

### (a) Efterspørgselsfilter — 181 salgstitler, 60 efterspørgselstitler
| Gruppe | Antal | Resultat |
|---|---|---|
| Ægte salg i mange formuleringer ("Køb min …", "Søges: kærlig ejer", "Søger ny ejer", "Vil købe? Her er min Honda", "Vil du købe …", "Købt ny …", "Efterlyses ikke …", mærke+suffiks-matrix 70 stk.) | 181 | 8 skjult, alle konstruerede (se nedenfor); 173 beholdt |
| Ægte efterspørgsel (Købes/Ønskes købt/Vil købe/Efterlyses, små/store bogstaver, citationstegn/parentes) | 60 | 60/60 skjult |
| "Vil købe? Her er min Honda", "vil købe? her er min Yamaha", "Vil købe - her er min Honda!", "Vil købe her er min Honda" | 4 | beholdt (korrekt) |

Skjulte ægte salg (alle titler der STARTER med "Købes"/"Ønskes købt"/"Efterlyses" + negation; reglen er bevidst enkel): "Købes af mig, solgt - BMW R 1200 GS", "Købes ikke - sælges: Harley Fat Boy", "Købes direkte fra mig: Aprilia RS 125", "Købes - nej tak Honda Forza", "KØBES IKKE: bare til salg Honda", "Efterlyses ikke: Honda til salg", "Ønskes købt? Nej, denne er til salg", "Købes: ikke relevant her …". Ingen af dem er en titel, en sælger realistisk skriver — **P3** (dokumenteret afvejning i koden). "Købes?"/"Efterlyses?" skjules (tvetydigt, acceptabelt).
Realistiske salgsformuleringer (Køb min …, Søges: kærlig ejer, Søger …, Køb: …, Leder efter …) skjules ikke: **0 ægte salg skjult i realistiske formuleringer (P1 = 0)**.

### (b) Ny-status — én sandhedskilde
Integrationstest (`tools/ny.js`): 11 stand-værdier × 11 km × 10 årgange × 3 sælgertyper × 7 stier = **25.410 kombinationer** (udfald: 3.384 Ny, 11.130 Brugt, 10.896 ukendt). For hver sammenlignet: `eksternErNy` ↔ kortbadge (`rk-ny` i listingCardHTML) ↔ `Filtrering conditions:['Ny']` ↔ JSON-LD-afgrening (New/Used/ingen) ↔ `fabriksnyNoteTekst` ↔ `standOpgoerelse().nye/ubeviste/renBrugt` ↔ Brugt-filter. **0 uenigheder.** Stikprøver: ny/km 0/2026 → Ny; ny/km null/2010 (ikke MC Syd-sti) → ukendt; ny/km 50/2020 → ukendt; ny/km 100/2026 → ukendt (demo); km "1.200 km" → Brugt; "30 km" → Ny.
Browser: 66 sidevisninger — kort-badges i søgning `?conditions=Ny` = 24/24 kort med "Ny".

### (c) saniterTal — 177 køretøjer (inkl. alle nævnte)
172 uændret bevaret. De 5 "ændrede" er korrekte nulstillinger af forkerte input (GPZ 500S ccm 1992, XJ 900 ccm 90, T 120 ccm 120, plus Boss Hoss 8200/6200 — bevidst afvejning). Bevaret ok: 50cc knallert, Puch Maxi S/Zündapp "årg 50", Super Cub "årg 90" (aargang null), XR 80, C90, CB 50, Monkey 125, H2R 310 hk, RS125 55 hk, Rocket 3 2458, Hayabusa 190 hk, T 100 årg 2010, CBR 600 RR årg 03, GL1800 1832, Harley 1923, 1000+ andre ægte kombinationer i `js/data-kvalitet.test.js` (spejl mod crawler). Negative kontroller (hk 300 på 500 cc, hk 500 på 125 cc, ccm 44, ccm 7000) rettes korrekt.
- **P3** Boss Hoss 6200/8200 cc (ægte tal) nulstilles (kendt, dokumenteret). Super Cub "årg 90" + aargang 1990 nulstilles (kendt).
- **P3** Streng-ccm ("1.200", "1 200", "1200cc", "998 ccm") bliver null i `saniterTal` (kun tal-typer/ren talstreng accepteres). Databasen leverer tal, så ingen reel effekt i dag.

### (d) Øvrigt
| Punkt | Resultat |
|---|---|
| "Engros" ens | `salgsmarkoerLabel` bruges af kort, listerække og annonceside; 0 "ENGROS" i byggede HTML-sider. (P3: forældet kommentar i components.js:557 nævner "Handelspris") |
| "katalog over nye motorcykler" | kun `erKatalogSti` (mcsyd.dk /ny/). Test på 8 urls (gog/ryd/evil.com/mcsyd.dk.evil.com/Brugt/…) → kun de 2 ægte MC Syd-stier; note og kort-tooltip enige |
| senesteBekraeftet | 15 cases: median ved ≥3, ældste ved 1–2, fremtid/ugyldig/0001/1999 ignoreres, <24 t frem accepteret, kun fremtid → null. Korrekt |
| Deeplink | kun mcsyd.dk/www.mcsyd.dk og formen /Produkter/x/(Ny\|Brugt\|Demo)/titel/id; gog/evil.com/mcsyd.dk.evil.com/mismatchende mærke → null |
| Folding | `harmoniserStavning` deterministisk; CB 500/cb500/CB500 → CB-500, MT07/MT 07 → MT-07, R1250GS → R 1250 GS, Z900 → Z 900; CB 500 F/X, R 1250 RT/GS Adventure, Z 900 RS, XR 80/800, CBR 600/RR/F, T100/T120 holdes adskilt. Ingen forkert sammenfoldning |

## 2. Samspil i generatorerne
- `node --check`: alle js/, crawler/, scripts/*.js OK.
- Fri-identifikator-analyse (babel traverse, `tools/free.js`) af scripts/*.js: eneste frie navne i build-brand-pages/build-facet-pages/build-listing-pages/build-guides er funktioner fra js/data.js indlæst via `eval` (koerekortForListing, hkEllerNull, passerKoerekort, formatKm/Ccm/Price/Power, typeLabel, equipmentLabel, sikkerUrl) — dækket af eval-mønstret. Alle symboler fra `browserModules()` (standOpgoerelse, kildeNyStatus, fabriksnyNoteTekst, erKatalogSti, saniterTal, erEfterspoergsel, harmoniserStavning, modelFraDeeplink, senesteBekraeftet …) returneres og importeres; ingen manglende import, ingen ReferenceError (P0 fra critic-w3-data-3 er lukket). build-srp.js, build-meta.js, shared.js: ingen frie navne.
- Fuldt `node scripts/build.js` på kopi med mock: **exit 0**, 0 ReferenceError/TypeError. Nye familier genereres (budget 4, by 6, mc 15, model 49 på syntetisk data). Sitemap på det committede HEAD: 56 URL'er (verificeret). Stand-tal: Honda 139 = 92 brugte + 47 fabriksnye; BMW 68 = 49 + 19; by-skive "18 brugte" — summer korrekt (undtagen punkt P2 nedenfor).
- Fail-soft (kopi af en vellykket build; sammenligning før/efter):

| Scenarie | Exit | Slettede filer | sitemap.xml + ledger | Sprunget over |
|---|---|---|---|---|
| netværksfejl (ECONNRESET) | 0 | 0 | uændret | listing, brand, facet, srp |
| HTTP 500 | 0 | 0 | uændret | listing, brand, facet, srp |
| `[]` | 0 | 0 | uændret | listing, brand, facet, srp |
| delvis 60 % | 0 | 0 | uændret | brand, facet, srp |
| delvis 75 % (451/602) | 0 | 0 | uændret | brand, facet, srp |
| delvis 90 %, jævnt fordelt | 0 | 0 | opdateret (108 URL'er, loft på sletninger ikke overskredet) | ingen |
| delvis 90 %, én kilde (jensensmc) næsten tom | 0 | 0 | uændret | brand, facet, srp (kildegulv 50 %) |
| første build på data der mister 14 mærker (loft 3) | 0 | 0 | uændret, `BB_TILLAD_FALD=1` slipper igennem (14 slettet) | brand |

Ingen sletning af sider i nogen fail-scenarie (ingen P1). Sletning udskydes konsistent, når et datatrin springes over.

## 3. Regression
- `npm test`: **643 pass, 0 fail**.
- `node scripts/seo-audit.js` på HEAD-kopi: 82 sider, 57 indekserbare, **0 fund**. `node scripts/udgiv.js` på kopi: exit 0, "Alle referencer … peger paa filer, der er med".
- Browser (Playwright, 11 sider × 1440/390/320 × lys/mørk = 66 visninger, Supabase mocket, eksterne kald afvist): 0 horisontal overflow (documentElement), 1 h1 på alle, 0 konsolfejl/pageerror. AA-kontrast: kun forsidens type-fliser flaget (1,17) — falsk positiv (hvid tekst over fotobaggrund med gradient; visuelt læsbar). Sider: forside, soegning ?conditions=Ny og ?q=honda, annonce (egen, ekstern Ny/MC Syd, ekstern GoG), maerke, budget, by, mc, model.
- SEO vs baseline (59 eksisterende HTML-sider uændret i title/description/canonical/robots/h1, 10 ændret): maerke-bmw/suzuki/triumph "X – N til salg, nye og brugte" → "X brugt – N til salg" (+ "Brugte X-motorcykler" i h1; følge af ny ny-regel), FB Mondial/SYM akronymer, model-honda-crf-1100-l-africa → "… Africa Twin", om-indeksering description rettet (var kopi af vilkår), om-bikerbasen/opret-annonce/guide-a2 tekst. Alle bevidste; canonical og robots uændrede. **P3**: titelskiftet på tre mærkesider er et bevidst SEO-ændring der giver kortvarig volatilitet.
- `git diff c4e8b15 HEAD -- crawler sources supabase`: kun `crawler/normalize.js` (+48 linjer, ren `renseUrealistiskeTal`, eksporteret, ikke kaldt nogen steder). `sources/` og `supabase/` uændret.

## 4. deploy.yml
`git diff c4e8b15 HEAD -- .github`: kun `workflow_dispatch.inputs.tillad_fald` (boolean, default false) og step-env `BB_TILLAD_FALD: ${{ inputs.tillad_fald && '1' || '' }}`. YAML parser (yaml-pakken) ok; på push er env tom streng (vagten tester `=== '1'`). Ingen andre ændringer.

## Fund

**P2-1 — Brandsiden skriver ubeviste "ny" som "brugte" (brand-pages ignorerer `standOpgoerelse().ubeviste` i tekst, titel, h1 og meta).**
`scripts/build-brand-pages.js` l. 345 (`items.length - nye` brugte), l. 510 (meta: `n - nye` brugte), l. 346 + l. 1128 + l. 1212 (titel/h1/"Der er N brugte …" vælges med `nye ? … : 'Brugte '`), selvom `brugtOrd()` (l. 99-101) allerede kender `renBrugt`. Facet-generatorens `brugtOrd` er korrekt; brand-generatoren kun delvist.
Repro (kopi, mock `MOCK_UBEVIST=1`: Kawasaki-rækker fra GoG/Rydbergs med stand "ny", km null, årgang 2010; MC Syd-rækker brugt): `standOpgoerelse` = {antal 51, nye 0, ubeviste 28, renBrugt false}, men maerke-kawasaki.html får title "Kawasaki brugt – 51 til salg", h1 "Brugte Kawasaki-motorcykler …", intro "Der er 51 brugte Kawasaki motorcykler" og meta "51 brugte Kawasaki". Med nye>0 (Aprilia): "14 brugte og 7 fabriksnye", hvor de 14 inkluderer ubeviste. Det er den mis-klassifikation, F-002 skulle fjerne ("kilden siger ny, tallene bekræfter ikke"). Ingen data skjules, men tallene er ikke ærlige. Rettelse: brug `standOpg(items)` (`ubeviste`/`renBrugt`) i l. 340-346, 510, 1128, 1212 (fx "N annoncer, heraf X fabriksnye" og kun "brugt/Brugte" når `renBrugt`). Reel eksponering i drift: 3 committede HEAD-mærkesider (BMW/Suzuki/Triumph) er skiftet til "brugt"; om de indeholder ubeviste kan kun ses mod produktionsdata (ikke læst her).

**P3-1** Efterspørgselsfilteret skjuler titler der starter med "Købes/Efterlyses/Ønskes købt" + negation (8 konstruerede af 181) — dokumenteret afvejning.
**P3-2** `kildeNyStatus` bruger indeværende årstal (`new Date().getFullYear()`): ved årsskifte ændres "ung"-grænsen, og sidehashes/ledger-lastmod kan rykke uden dataændring (kun for forhandler uden km og ikke MC Syd-sti).
**P3-3** `slugify` kender ikke ü: model-/mærkeside hedder `model-z-ndapp-ks-50` (Zündapp). Eksisterende adfærd, men ny model-familie viser det.
**P3-4** Latent dublet-H1: en egen annonce `BMW R45` og en modelside `BMW R45` får samme h1 (`seo-audit` dubletH1) hvis modellen når modelsidens tærskel. Ikke aktuelt i HEAD (0 fund), men kan udløses af data.
**P3-5** Boss Hoss 6200/8200 cc og streng-ccm nulstilles (se 1c). Kommentar components.js:557 nævner "Handelspris".

## Samlet dom: **ACCEPTER** (anbefal at P2-1 rettes i brand-generatoren før næste build mod produktion; ingen P0/P1, ingen fjernelse af ægte data, ingen manglende import, ingen uenighed badge/filter/JSON-LD/note/tællere, ingen sletning af sider under fail-scenarier).
