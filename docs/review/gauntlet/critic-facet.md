# Critic — strøm facet (gauntlet/facet @ 1f306c7, baseline 9fadd59)

Metode: blind. Egen kopi af worktreen (`git archive`) i temp, kørt med `node scripts/build.js`. Server på port 8726. Baseline bygget i en separat kopi uden for repoet. Playwright med viewport-screenshots, læst mod billede 7 og 8. Produktionskode er ikke ændret.

## DOM: ACCEPTER (ingen P0/P1). Betingelse: guides-strømmen merges før eller sammen med facet (se F-1).

## Sektionsscores (0–5; lys / mørk; desktop 1440 / mobil 390)
| Element | Lys | Mørk | Kommentar |
|---|---|---|---|
| Hero + info-panel | 3,5 | 3,5 | Struktur, brødkrumme, kicker og H1 matcher. Info-panelet er stærkt (beregnet antal, mærker, pris). Men samme foto på alle sider, uden rytter, og mørkt overlay. Billedet har et type-specifikt rytterfoto. Headeren er den gamle (delt lag). |
| Søgekort | 4,5 | 4,5 | Næsten 1:1: 4 felter + CTA + "N indekseret". Mangler "Brændstoftype" (ingen data, ærligt udeladt). Prefill virker. |
| Tillids-/faktarække | 4 | 4 | Kørekortsider: 5 faktaikoner + guide-flise, tæt på billede 7. Typesider: 4 sande tillidspunkter (billedets "Verificerede annoncer" og "Fællesskab" er med rette ikke kopieret). |
| Udvalgte + CTA-panel | 3 | 3 | 4 kort + panel i stedet for 5/6. Panelet er mørkt generisk i stedet for rytterfoto. Mange kort uden foto eller med forhandlerlogo (data). |
| Typefliser | 4 | 4 | Foto + beregnet antal. Grammatik: "1 A2-motorcykler". Billedet har 7 fliser, vi har op til 5. |
| Info-bokse | 4 | 4 | 3 bokse + "næste skridt"-flise ligner billede 7. Typesider: 4 "Det skal du vide". |
| Populære modeller | 3 | 3 | Kun modeller med mindst 2 annoncer. Alle thumbnails er kildens logo-billede (dev-seed). Billedet har små frilagte motorcykler. |
| Relaterede / region / guides | 3 | 3 | Chips i stedet for billedets pillers. Guides er tekstlinks uden fotos (billedets guide-kort med foto mangler). "Nyeste"-rækken (billede 7) mangler. |
| Mobil | 3,5 | 3,5 | Ingen overflow. Søgekort i 2 kolonner. Kortscroller med synligt "peek" af næste kort. Fakta stakkes pænt. Ingen scroll-indikator. |

Samlet: ca. 3,6/5 — tæt på billedet i struktur, mindre tæt i foto og stemning.

**Er vi tæt nok?** Strukturelt ja: rækkefølge, komponenter og hierarki følger billedet.

**Er vi for tæt på det gamle site?** Delvist. Kort, header og chips er det gamle sites sprog. Det er rimeligt, da de er delt lag, men det er derfor siden ikke føles "som billedet".

**Burde vi være modigere?** Ja, på tre punkter:
1. Type-specifikke hero-fotos.
2. Foto-guide-kort.
3. Større frilagte modelchips.

## Faktatabel — kørekortregler
Kilde: Færdselsstyrelsen, https://www.fstyr.dk/privat/koerekort/udvidelse-af-koerekort/koerekort-til-motorcykel (hentet 15.10.2026). Alderstabellen er krydstjekket på https://www.fstyr.dk/privat/koerekort/koerekortkategorier.

Jeg har ikke hentet retsinformation.dk. borger.dk-URL'en jeg prøvede gav 404.

| Påstand på siderne | Status | Kilde |
|---|---|---|
| A1: højst 125 cm³, 11 kW | BEKRÆFTET | fstyr (koerekort-til-motorcykel) |
| A1: højst 0,1 kW/kg | BEKRÆFTET | fstyr |
| A1: 18 år | BEKRÆFTET | fstyr (alderstabel, begge sider) |
| 11 kW ≈ 15 hk | BEKRÆFTET (14,96 hk) | beregning |
| A2: højst 35 kW | BEKRÆFTET | fstyr |
| A2: højst 0,2 kW/kg | BEKRÆFTET | fstyr |
| A2: ikke afledt af motorcykel med mere end dobbelt effekt | BEKRÆFTET | fstyr |
| A2: 20 år | BEKRÆFTET | fstyr |
| A2 tidligere: 2 års A1 + praktisk prøve | BEKRÆFTET | fstyr |
| A: ingen effektgrænse (hverken kW eller kW/kg) | BEKRÆFTET | fstyr |
| A: 24 år, eller 22 år efter 2 års A2 + prøve | BEKRÆFTET | fstyr |
| "35 kW ≈ 47 hk"; A2_MAX_HK = 47 | BEKRÆFTET, konservativ | 35 kW = 47,6 hk, så 47 er den sikre afrunding nedad. 48 hk = 35,3 kW og er altså over grænsen. |
| Billedets A2 "fra 18 år" er forkert | BEKRÆFTET, ikke kopieret | fstyr: 20 år |
| Billedets "48 hk" | Ikke brugt, korrekt | se ovenfor |

Ingen FORKERT og ingen FORÆLDET.

Undtagelserne (værnepligtige, mekanikere) er kun omtalt som "undtagelser findes". Det er ærligt og dækkende.

## Dom pr. krav
1. **Faktatjek: PASS.** 12 af 12 sider-påstande BEKRÆFTET, se tabellen.
2. **Tal og data: PASS.**
   - 19 sider sammenlignet. Hydreret facet-tal og soegning.html for samme filter er identikt på alle, fx A1 17/17, A2 74/74, A 411/411, sport 29/29, Midtjylland 175/175, Nordjylland 56/56, GL 1800 20/20.
   - Hydrering matcher soegning. Det byggede tal afviger fra det hydrerede: 59 mod 74, 383 mod 411, 21 mod 29. Baseline har samme afvigelse (21 og 59), så det er ikke en regression. Årsag: bygget læser en anden datamængde end browserens dev-seed.
   - koerekort-a: 411 annoncer, 0 uden oplyst effekt, laveste effekt 48 hk. De 170 uden oplyst effekt tæller ikke. Søgeknappen bruger `koerekort=A&hkMin=48` og giver 411, samme udsnit.
   - Kort viser kun tilladte felter (regel 2).
   - Ingen opdigtede påstande fundet.
3. **SEO: PASS.** Script-sammenligning af 21 sider mod baseline: title, description, canonical, robots, h1 og JSON-LD (inkl. FAQ) er 0 afvigelser.
   - Ingen mistede interne links. +1 til +23 nye pr. side.
   - Præcis én H1 på alle.
   - Sitemap: koerekort-a er med. De 4 noindex-sider (classic, cross, scooter, region-sjaelland) er ikke med.
4. **Søgekort-prefill og links: DELVIST (PASS i funktion, FAIL strengt på "alle links 200").**
   - Prefill `q`, `type`→`types`, `maxPrice`→`priceMax` og `yearMin` kommer korrekt til soegning.html. Modelsiden sender `brands=Honda&model=NX+500` og giver 10.
   - 37 af 41 interne links giver 200. De 4 fejl er `guides.html`, `guide-a2-koerekort.html`, `guide-foerste-motorcykel.html` og `guide-brugt-motorcykel.html` (404). Det er de reserverede adresser, som guides-strømmen opretter. Se F-1.
5. **Layout, tilgængelighed og konsol: PASS.**
   - Overflow: 14 sider × 320/360/390/768/1024/1440 × lys/mørk = 168 målinger, 0 overflow.
   - Konsol: ingen fejl.
   - Kontrast: alle synlige tekster i main (ca. 2.100 målte elementer på 6 sider × lys/mørk) er over AA. Hero-tekst over foto: p5-kontrast ≥ 5,2 på mørk.
   - Tastatur: skip-link først, derefter header, brødkrumme, fold, søgefelter, knap og kort. Alle har synlig 2 px outline.
   - Kortscroller <520 px: alle 4 kort er i DOM og kan scrolles (kantet "peek"). Fra 520 px er det et grid. UX er acceptabel. En lille scroll-indikator ville hjælpe (F-5).
6. **Idempotens og build: PASS.**
   - Generatoren på kopien giver output byte-identisk med committed filer og med anden kørsel.
   - `build.js` kørt på kopien: alle 22 facet-sider har OG-tags, cookie-dialog ("Kun nødvendige") og CSP, og 0 inline-scripts har manglende hash. Ingen `'unsafe-inline'` i script-src. Sitemap uden dubletter.
   - Kørt for sig (uden build.js) tilføjer generatoren sitemap-poster igen ved gentagelse. Det er uændret fra baseline og dækket af build.js (brand-trinnet skriver sitemappet forfra).
7. **Tests: PASS.** `npm test` 364/364, `node --test scripts/facet-sider.test.js` 6/6, `node --check` på js/ scripts/ crawler/ uden fejl.

## Fund
- **F-1 (P2, integrationsbetingelse)** — alle sider linker til de 4 guide-adresser (404 i denne branch): guides.html og guide-a2-koerekort, -foerste-motorcykel og -brugt-motorcykel. CTA-panelets primære knap ("Læs vores guide") peger på dem. Reproduktion: `curl -I localhost:8726/guide-a2-koerekort.html` giver 404. Facet må ikke gå live uden guides-strømmen i samme udgivelse.
- **F-2 (P2)** — "Se alle N i søgningen" og tallene i "Relaterede søgninger"/"i din region" opdateres ikke ved hydrering. Overskrift og intro viser fx 74, mens linket stadig viser 59 (type-sport: 29 mod 21 og "Hovedstaden 1, Syddanmark 20"). I produktion er bygget og lager samme kilde, så afvigelsen er kun mellem builds. Løsning: lad hydreringsscriptet også sætte `a.fa-mere`-teksten.
- **F-3 (P3)** — Hydreringen er tidsfølsom: ved en enkelt første indlæsning viste region-nordjylland 49 i stedet for 56. Gentaget 3 gange gav konstant 56. Mulig race mod backendReady; gem den som observation.
- **F-4 (P3)** — "1 A2-motorcykler" (flertalsform ved antal 1) på typefliser.
- **F-5 (P3)** — Kortscrolleren på <520 px har ingen scroll-indikator (prikker eller kant-gradient). 4. kort ligger skjult bag scroll (peek), men er ikke synligt.
- **F-6 (P3)** — Sitemap-udvidelsen er ikke idempotent, hvis generatoren køres alene (arvet fra baseline).
- **F-7 (P3, kosmetik)** — "Harley-Davidson" og "Alle motorcykler"-chips står fremhævede uden åbenlys aktiv-tilstand på type-sport, hvilket kan forveksles med valgt filter.

## For at komme tættere på billedet (prioriteret)
1. Type-specifikke hero-fotos med rytter (sport/naked/touring/adventure/cruiser) og et lysere, billedlignende hero. Størst effekt. (DELT-ØNSKE 1 hos builderen.)
2. Foto-guide-række (3 kort med billede) i stedet for tekstlinks. Kræver guides-strømmens billeder.
3. Frilagte modelbilleder i "Populære modeller" i stedet for kildens logobilleder. Kræver ægte modelbilleder.
4. 5 kort + CTA-panel med rytterfoto (kræver bredere container) og type-specifikt CTA-foto.
5. "Nyeste A2-motorcykler"-række og undertyper (supersport, sports-touring …). Kræver data, som ikke findes.
6. Ret F-2 og F-4, scroll-indikator på mobil (F-5).
7. Header: delt lag. Billedernes header har "Motorcykler / Mærker / Kørekort / Artikler & guides …" mod nuværende "Forside / Søg motorcykler". Hører under Orchestratoren (V-016).
