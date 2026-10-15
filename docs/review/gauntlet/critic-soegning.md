# Critic — soegning (billede 2) · gauntlet/soegning @ cb4ddb1 (baseline 9fadd59)

Metode: blind test i Playwright mod worktree (:8721) og baseline-worktree (:8722), lys+mørk, 320/360/390/768/1024/1440, viewport-screenshots læst, 655 ægte annoncer. Ingen produktionskode ændret.

## DOM: ACCEPTER
Ingen P0/P1. Søgefunktion og URL-kompatibilitet intakt (alle 39 baseline-URL'er giver identisk antal i baseline og ny). Stilistiske/UX-mangler nedenfor er P2/P3 og forbedringer.

## Sektionsscores (0-5) — lys/mørk ens medmindre andet står
| Element | 1440 | 1024 | 768 | 390 | Note |
|---|---|---|---|---|---|
| Hero | 4 | 4 | 4 | 3 | Struktur/hierarki som billedet (h1 + "N motorcykler til salg" + kort i bunden). Eget motorcykelfoto, ikke rytter/bro (acceptabelt, intet opdigtet). Mobil: undertekst-kontrast og højde (se F2, F4) |
| Søgekort | 4 | 4 | 4 | 3,5 | Mærke/model, Type, Maks. pris, Kørekort-segment, orange CTA = billedet. Mangler felt-ikoner (type/pris) som i billedet. Mobil: 15 px input (F1) |
| Chip-række | 4 | 4 | 4 | 3,5 | Fjernbare chips + "Ryd alle filtre" som billedet; fylder "Ingen filtre valgt" når tom; "Gem søgning" i samme række (ikke i billedet, men nyttig) |
| Filter-sidebar | 4 | 4 | – | 3,5 | Samme gruppe-rækkefølge, Mærke/model-selects, "Tilføj flere", Type m. antal, skyder+4 hurtigknapper, kørekort. Mangler type-ikoner; kørekort tegnet som afkrydsning men er radio; sticky + indre scroll virker |
| Resultathoved/sortering/visning | 4,5 | 4,5 | 4 | 3,5 | "N motorcykler fundet", Sortér, Gitter/Liste (+Swipe) tæt på billedet. 320 px: sorteringsvalget klippes til "B" (F3) |
| Gitter + kort | 3,5 | 3,5 | 3,5 | 3,5 | 4/3/2/1 kolonner OK. Kortet er det delte (urørt): ingen kg/foto-tæller, kildetype ikke i bunden, blandede kortlayouts (første kort ikon-liste, resten chips) — afviger tydeligt fra billedets ensartede kort. Delt lag, ikke strømmens fejl |
| Tom tilstand | 4 | 4 | 4 | 4 | Venlig tekst, "Nulstil filtre"/"Sælg"/"Gem søgningen" + forklaring "301 annoncer er ikke vist, fordi motorcykeltype ikke er oplyst" |
| Mobil / bundark | – | – | 4 | 3,5 | Bundark: role=dialog aria-modal, fokusfælde (Tab ×40 forbliver inde), Esc lukker og fokus tilbage på "Filtre", sticky "Ryd alle"/"Vis N annoncer". Hero-kortet æder skærmen (F4) |

## Dom pr. krav
1. **Filtre/URL: PASS.** Testet: hero-type/pris/kørekort ⇄ URL ⇄ sidebar ⇄ chips; mærke→model, "Tilføj flere" (2 mærker = 337 = baseline), type, pris (skyder PageDown/piletaster, 4 hurtigknapper toggler), årgang/km/ccm/hk/stand via URL, kørekort A1/A2/A (17/74/655 = forsiden), region, dealer/kilde, sortering (price-asc/desc monotone, identisk med baseline), grid/liste/swipe, ?page=3 giver 24 kort + "side 3 af 28". Reload/Tilbage/Frem giver samme antal (2→7→2). Fritekst: goldwing 24, cb500 7, mt09 3, tenere 5, "harley davidson" 78, hd 78, ténéré 5, xyzzy 0 (alle = baseline). Overskrift-antal = antal kort (min(24,N)) = forsidens antal (Cruiser 95, Sport 29, Naked 68, Touring 59 …). Facetantal verificeret ved stikprøve 9/9 (A2: cruiser 5, Nordjylland 15, touring 0; Midtjylland+≤100k: cross 3, A2 15; A2+50-100k 32; 25-50k 74; ≥100k 313; ≤25k 48) + klik på hurtigknap i A2 = 32. Tom kombination → tom-tilstand + forklaring. Gamle URL'er (?type=, ?brands=, ?koerekort=, ?regions=, ?q=, ?maxPrice=, priceMin/priceMax for 30/60/100/150-båndene) identiske i baseline og ny. Forbehold: se F5/F6 (hero-prisfelt ved priceMin, boundary-overlap).
2. **Ingen opdigtede påstande / kortfelter: PASS.** Alle tal beregnet (655 = lager, 53 på Bikerbasen, 345/155/102 kilder). Kortet er urørt (components.js ikke ændret) og viser kun tilladte felter; ingen stjerner/anmeldelser/"verificeret".
3. **Overflow/CLS/kontrast/tastatur: PASS med P2-fund.**
   - Vandret overflow: scrollWidth==clientWidth på alle 6 bredder × lys+mørk (12/12).
   - CLS første render: 320 0,007 · 360 0,007 · 390 0,006 (baseline 0,023) · 768 0,013 (baseline 0,717) · 1024 0,014 · 1440 0,023 (baseline 0,043); mørk ens. Alle <0,1.
   - Kontrast (lys / mørk): CTA hvid på orange 5,02 / 6,45; kørekort inaktiv 4,92 / 6,00; aktiv 5,02 / 6,45; Ryd alle 5,96 / 7,22; uoplyst-note 4,92 / 6,00; facet-tal 5,74 / 6,43; brødtekst 15-17. Alle ≥4,5. Hero-tekst over foto: se F2 (FAIL ved ≤390).
   - Tastatur: tab-rækkefølge hero→chips→sidebar logisk, synlig fokus på alle prøvede (#filter-q har orange kant+halo i stedet for outline), piletaster i begge kørekort-radiogrupper og skyderen (1000 kr./trin, PageUp/Down, Home), details/summary-grupper, ingen duplikerede id'er, ingen ulabelede felter. 
   - 16 px mobil: **FAIL** (F1).
4. **SEO: PASS.** title, én h1, canonical (https://bikerbasen.dk/soegning), robots (index, follow / noindex, follow ved 0 træf), description og JSON-LD-antal er identiske med baseline på 8 URL'er (ingen filter, types, brands, q, page=2, koerekort, region, tom). `<head>` diff = kun ny `<link css/p-soegning.css>`. Præ-tegnet markup: h1 og kort stemmer; tællerteksten ikke (F7).
5. **Ydelse: PASS.** Input→render inkl. 250 ms debounce: 257–332 ms (honda/harley davidson/a/goldwing); chip-klik→render 15 ms. Ingen konsolfejl i nogen af ~40 sidehentninger.
6. **Tests: PASS.** `npm test` 364/364 grønt; `node --test js/soegning-priser.test.js` 6/6; `node --check` på js/ scripts/ crawler/ uden fejl.
7. **NF3-5: PASS.** #filter-q, #brand-search og .input: kant 3,78:1 lys / 3,59:1 mørk (≥3), placeholder 5,74 / 6,43 (≥4,5) — identiske værdier på alle tre.
8. **Mobil-hero: ACCEPTABELT MEN FOR HØJT** — se F4 og forslag.

## Fund
**P2**
- F1 — 16 px-regel brudt (regression). Ved 390 px er `#filter-q`, `#so-type`, `#so-price` 15 px (baseline: søgefeltet ≥16), `#so-brand`/`#so-model` i bundarket 13 px. iOS zoomer ind ved fokus. Rep: 390 px, `getComputedStyle(#filter-q).fontSize`. Fix: `font-size:16px` under 768 px for `.so-card .input`, `.so-card #filter-q`, `#so-brand`, `#so-model`.
- F2 — Hero-undertekst/titel under AA over fotoet på smal skærm. 320/390 px: "655 motorcykler til salg i Danmark" slutter på lys himmel (~2:1 ved "Danmark"; visuelt tydeligt klippet i z320-screenshot). Desktop OK. Fix: stærkere mobil-scrim (lodret gradient bag teksten eller 80 % mørk overlay <768 px) eller tekstskygge ≥.6.
- F3 — 320 px: Sortér-vælgeren viser kun "B" (Blandet klippet), og "53 på Bikerba…" afkortes i resultathovedet. Rep: viewport 320. Fix: `min-width` på select / skjul ⓘ-ikon <360 px / lad antalslinjen ombryde.
- F4 — Mobil: hero (484 px) + filterknapper + resultathoved lægger første kort på y≈769 af 844 (390 px) — reelt ét skærmbillede uden annonce. Acceptabelt for et søgekort-først-mønster, men billedets pointe er at annoncerne følger hurtigt. Forslag: se prioriteret liste #1.
- F5 — Hero-prisvælgeren modsiger state ved kun `priceMin`: `?priceMin=150000` → vælger viser "Alle priser" mens chip siger "150.000 kr. – ∞" og resultatet er filtreret (187). `?priceMin=30000&priceMax=60000` → "Op til 60.000 kr." (skjuler minimum). Fix: vis dynamisk valg "Fra 150.000 kr."/"30.000–60.000 kr." som for typer.

**P3**
- F6 — Hurtigprisbånd overlapper på grænserne (min+max begge inklusive): Midtjylland ≤100k giver 14+17+53 = 84 mod 83 resultater. Facet-antallet stemmer med klikket resultat, men summen af bånd ≠ total.
- F7 — Præ-tegnet `soegning.html` siger "604 motorcykler fundet"/build-srp skriver "annoncer fundet", JS skriver "N motorcykler fundet" → synligt tekstskift ved hydrering (intet layoutspring; builder har DELT-ØNSKE 3). Hero-undertekst har tom N i præ-tegningen og får "655 " ved JS.
- F8 — Kørekort-gruppen i sidebaren ligner afkrydsningsfelter (2×2 som billedet) men er radio (ét valg, "Alle" kan ikke fravælges) — forventningsbrud for mus-brugere.
- F9 — Med valgt model er øvrige mærker disabled (facet 0), så man ikke kan tilføje et mærke uden først at rydde modellen. Logikken er sandsynligvis arvet; kan overraskes af "Tilføj flere".
- F10 — Pris-pillen "150.000 kr. – ∞" og skyderen mangler `aria-valuetext` (kun rå tal).
- F11 — "Ingen filtre valgt" som statisk fyldtekst i chip-rækken tilfører intet; billedet har ingen tom række.

## For at komme tættere på billedet (prioriteret)
1. **Mobil-hero kompakt:** vis kun felt "Mærke eller model" + orange "Søg" på én linje; Type/Pris/Kørekort i en indfoldelig "Flere valg"-række (eller skjul undertekst og brødkrumme <480 px). Mål: første kort ≤ y 520 ved 390 px.
2. **Annoncekortet (delt lag):** ensartet kort som billedet — kørekortbadge først i chip-rækken, Privat sælger/Forhandler højrejusteret i bunden ved stedet, ens chip-række på alle kort (nu blandet ikon-liste/chips). Størst gevinst for "ligner billedet".
3. **Ikoner:** cykel-ikon i Type-felt/-rækker, kr.-ikon i pris-felt, lup i søgefelt (findes). Små SVG'er, ingen nye farver.
4. **Hero-foto:** motiv med rytter/udsigt (ægte, rettighedsfrit) i stedet for stillestående maskine; behold scrim.
5. **Sidebar:** Årgang og Kilometer lukket som standard (som billedet) og kørekort som 2×2 felter med radio-semantik tydeliggjort (F8).
6. Ret F1–F5 før merge hvis muligt (alle små CSS/JS-justeringer).
7. Er vi for tæt på det gamle site? Struktur: nej — hero, kort, chip-række, sidebar-rytme er tydeligt nyt og billedtro. Visuelt: kortgitteret ligner stadig det gamle (urørt kort); modigere ville være at lade Orchestratoren integrere punkt 2 samtidig.

Filer: scripts i `C:\Users\pasca\Desktop\rod\crit\s\` (udenfor repoet); screenshots dér (`v-*`, `f-*`, `e-*`, `m-sheet-a.png`, `z320.png`).
