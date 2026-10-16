# Critic w3-data, runde 3 (blind)

Worktree `wt/w3-data`, HEAD 0540da7, baseline c4e8b15. Ingen produktionsadgang, ingen generator-/build-kørsel. Kun rene funktioner (js/data.js + backend-bridge.js indlæst som browserModules), node:test, og Playwright mod dev-server (port 8778, stoppet igen) med alle Supabase-kald mocket.

## DOM: AFVIS (1 P0 + 3 P2 der bør rettes inden merge)

## Fund

### P0-1: generatorerne for mærke- og facetsider kaster ReferenceError
`erUbevistNy` bruges i `scripts/build-brand-pages.js:100` (`brugtOrd`) og `scripts/build-facet-pages.js:205` (`brugtOrd`), men importeres ikke. Begge filer destrukturerer kun `eksternErNy` (osv.) fra `browserModules()`. `erUbevistNy` er eksporteret fra browserModules, men aldrig destruktureret.

Reproduktion uden at køre generatorerne: de to `brugtOrd`-funktioner blev udtrukket og evalueret med kun `eksternErNy` i scope. Resultat: `ReferenceError: erUbevistNy is not defined`. Det rammer hver gang gruppen ikke har en ny annonce, dvs. næsten alle mærke-/model-/facetsider. Næste `build.js` knækker.

Testen `data-kvalitet.test.js:353` lader det slippe igennem, fordi den kun `match`er strengen `erUbevistNy` i kildeteksten.

Rettelse: tilføj `erUbevistNy` til destruktureringen i begge filer, og lav en test der kalder `brugtOrd` (eller `introForModel`) med et ubevist-ny-lager.

### P2-1: ny-badge og condition/filter er uenige (browserens stand-facet "Ny" taber ægte nye)
`normalizeExternalListing` kalder `kildeNyStatus` uden `saelgertype`. Dermed er `forhandler` altid false, og "forhandler + ung årgang + km ukendt" giver aldrig true i `condition`. Kortet kalder `eksternErNy(l)` på det normaliserede objekt (har `saelgertype`) og viser "Ny".

Reproduktion (normalizeExternalListing): stand=ny, forhandler, km=null, årgang 2023/2025/2026, URL uden /Ny/ (fx rydbergs.dk) → `eksternErNy` = true (kortet viser "Ny"), men `condition` = null. Filteret `?conditions=Ny` og facettallet udelader den. 6 af 1323 gennemgåede kombinationer. `sweep-datakvalitet.js:43` har samme hul, så ejerens tal bliver forkerte.

Rettelse: send `saelgertype: row.saelgertype` med i kaldet (og i sweep-scriptet), og lav en test "badge === (condition==='Ny')" over hele gitteret.

### P2-2: "katalog over nye motorcykler" står stadig på rækker uden /Ny/-sti
Kravet var, at formuleringen kun gælder /Ny/-stien. Rettet i annonce.js for private, men ikke for:
- annoncesidens forhandlergren (`annonce.js:818`, ubetinget "ligger i {kilde}s katalog over nye"),
- kortets tooltip (`components.js:837`, alle `f.ny`).

Reproduktion (listingCardHTML): GoG privat, stand=ny, km 0 → tooltip "Annoncen ligger i Gul og Gratiss katalog over NYE motorcykler. Den er ikke brugt" (en privat annonce er ikke et katalog). Rydbergs (forhandler, ikke /Ny/) siger det samme.

Rettelse: brug `iKatalog` også i forhandlergrenen og i tooltippen.

### P2-3: nye tests er ikke i `npm test`
`package.json` er urørt. `js/data-kvalitet.test.js`, `scripts/udgiv-kommentarer.test.js` og `scripts/sweep-datakvalitet.test.js` kører kun, hvis nogen kalder dem manuelt (npm test = 525 uden dem; de tre filer = 62 grønne). Derfor opdagede ingen P0-1.

### P2-4: "BSA / Triumph / Norton købes" (selve F-009) vises igen som til salg
Det var den oprindelige detektivfund. Reglen "kun ved titlens start" lader den stå, og builderen har besluttet det bevidst (dokumenteret). Det er en konsekvens af P1-asymmetrien (hellere ét opslag for meget end skjult salg), ikke en bug. Men den gør, at F-009 reelt er uløst for alle suffikstitler.

### P3 (kosmetik / kanttilfælde)
- Ens "Engros" er ikke ens overalt: kort "Engros", annoncesidens chips "Engros" (egen lower/upper-logik i annonce.js:770, ikke `salgsmarkoerLabel`), men listerækken (`search.js:781`, `rowMarkersHTML`) lowercaser: "engros". Mixed-case-kilder ("Bytter Gerne") bliver "Bytter gerne" på siden og "Bytter Gerne" på kortet.
- "Honda Super Cub årg 90" med ccm 90 og aargang 1990 nulstilles (aargangEns og intet bevis). Kommentaren og testen siger "bevares", men det gælder kun med `aargang: null`. Samme for "Puch Maxi S årg 50" med aargang 1950. Det er indbygget tvetydighed (identisk med XJ 900 årg 90 uden modeltal), der nulstilles til ukendt, ikke opfundet.
- ccm > 6000 nulstilles: Boss Hoss 6200 / 8300 (ægte). Marginalt.
- hk uden ccm sanitiseres ikke: `{ccm:null, hk:9999}` bevarer 9999.
- ccm som streng "1.200" → `Number("1.200")` = 1,2 → nulstilles (<45). Crawleren leverer tal, så kun teoretisk.
- `senesteBekraeftet`: `Date.parse("0000")` accepteres som år 0 → "1. jan. 0" (junk-datoer bør afvises < 2000). Median er ikke "de fleste": med 2 annoncer (gammel + frisk) står den gamle dato (konservativt, men "de fleste" er forkert ved 50 %).
- Tie-break i `harmoniserStavning` favoriserer versaler/længde: 1/1/1-lighed giver "YZF-R 6" frem for "YZF-R6" og "TÉNÉRÉ 700" frem for "Ténéré 700". Kun uden flertal.
- Ny-reglen er ikke alderstabil: dealer-ny uden /Ny/-sti og km ukendt mister "Ny" (→ intet mærke) når årgang < i år − 3, dvs. hver 1. januar for årgang nu−3. Builderens påstand "flipper intet 1. januar" gælder kun for Brugt, ikke for tab af mærke. Og /Ny/-sti + km 0 + årgang 2010 giver null, men /Ny/-sti + km null + årgang 2010 giver true (uensartet).
- `deeplink` med mærke-alias "HD Fat Boy" → model null (mærket udledes, modellen ikke). Stien kan indeholde reklametekst ("CB 500 - nypris fra 99.999"), som bliver model, når titlen kun er mærket.
- soegning.html: hele filen er LF/CR-normaliseret til CRLF (714 linjer støj). Indhold i alle inline scripts/styles er identisk efter CRLF→LF (CSP-hash uændret; ga4-script byte-forskelligt, men browseren normaliserer), kun `soeg-perf`-style er ændret (intenderet).

## Regeltabeller (uddrag, alle 600+ kørt)

### 1. Efterspørgsel (113 salg + 64 efterspørgsel)
Falske positiver (salg skjult, P1-klassen), de relevante:

| Titel | Udfald |
|---|---|
| Køb: Honda CB 500 til salg | skjult |
| Køb: din næste Harley her | skjult |
| Søges: kærlig ejer til Honda | skjult (undtagelsen kræver mellemrum lige efter ordet, ikke kolon) |
| Søges: ny ejer / Søger: køber til Honda / Søges: Ny ejer til Suzuki | skjult |
| Søger du en pæn CB 500? Her er den / Søger du en A2 MC? Her | skjult |
| Søges kun seriøse købere / Søger seriøs køber/ejer til Honda | skjult |
| Søger efter ny ejer / Leder efter ny ejer til min Yamaha | skjult |
| Søger et kærligt hjem / et godt hjem / gode hænder / ægte entusiast | skjult |
| Søger bytte: Suzuki mod Yamaha / Søger evt. bytte med Honda | skjult |
| Søger snarest/gerne/hurtigst muligt ny ejer | skjult |
| Vil købe? Her er min Honda / Ønskes købt? Nej - Honda til salg | skjult |
| Efterlyses ikke - Honda til salg / Købes af mig, solgt | skjult |

Ikke skjult (korrekt): Køb min MT-07, Køb denne Honda, Køb Honda CB 500 - 2019, Køb en Triumph, KØB min Ducati, Købes og sælges, Leder du efter en A2? Her er den, Søgeord, Søgeren, Søger nyt hjem, Søger ny ejer, Søger køber til min Kawasaki, Søges: nyt hjem.

Falske negativer (efterspørgsel vist): "BSA / Triumph / Norton købes" (P2-4); "Søger ny Triumph til sommeren"; "Søger nyt tilbehør/nye dæk til min MT-07"; "Søger god brugt Yamaha"; "Søger god A2 maskine"; "Søger passende A2-motorcykel"; "Søger ny motorcykel til min kone". Det er prisen for undtagelseslisten ny/god/passende, som er ordbaseret og ikke skelner "søger ny ejer" fra "søger ny Triumph".

Samlet: 42 af 113 skabte salgstitler skjules (mange er konstruerede, men ~12 er realistiske). Med P1-asymmetrien er regelsættet stadig for aggressivt på "Køb:", "Søges/Søger + kolon", "Søger du", "Søger efter/bytte/seriøs" og "Leder efter ny ejer".

### 2. saniterTal (293 køretøjer/kantværdier)
Kun disse ændres. Alle andre ægte tal bevares: knallert 45 (49 cc), Puch Maxi, Zündapp, Kreidler (uden aargang eller med anden aargang), DT 80, CB 50, XR 80, C90, Dax, Monkey 125, Ducati 1299, R6, H2R 310 hk, RS125 55 hk, NSR50, Rocket 3 2458, Indian 1890, CBR 600 RR årg 03 (600 bevares), XJ 600 årg. 98, GSX-R 1000 2005, Bonneville T 100 (100 er modelnavn; ccm 865/900/1200 bevares), ER-6n 650, Husqvarna 701, KTM 1290, GL1800, Hayabusa, ccm "1200cc"/"600 ccm"-strenge giver NaN→null (kun streng).

| Input | Udfald | Vurdering |
|---|---|---|
| Honda Super Cub årg 90, ccm 90, aargang 1990 | ccm null | ægte ccm tabt (tvetydig), P3 |
| Puch Maxi S årg 50, ccm 50, aargang 1950 | ccm null | som ovenfor |
| Bonneville T 120, ccm 120, hk 80 | ccm null, hk 80 | tilsigtet |
| GPZ 500S årg 1992, ccm 1992 | ccm null | tilsigtet |
| XJ 900 årg 90, ccm 90 | ccm null | tilsigtet |
| ccm 44 / 8000 / 6001 / 1.2 ("1.200") | null | Boss Hoss-fald, P3 |
| {ccm:null, hk:9999} | hk 9999 | slipper igennem |
| ccm 125, hk 125 / ccm 50, hk 35 / ccm 49, hk 40 | ccm null | tilsigtet |

Kørekort: ccm null men hk kendt giver A2/A ud fra hk alene. Ingen A1-påstand uden ccm. Ingen falsk A1 observeret. Crawler-spejlet `renseUrealistiskeTal` = 0 afvigelser over 200.000 kombinationer; `git diff c4e8b15 HEAD -- crawler` viser kun +47 linjer i normalize.js (ren, ikke koblet).

### 3. Ny-reglen (1323 kombinationer via normalizeExternalListing)
Konsistent med kommentaren: km ≤ 50 ny, 51–500 ingen mærke (erUbevistNy true), > 500 Brugt, alder alene aldrig Brugt, /Ny/-sti uden km → ny, privat uden km → ingen mærke, "Brugt" fra kilden respekteres (selv med km 0). Afvigelser: P2-1, P2-2 og P3 (alder). `-1` km tolkes som 0 (ny) for privat uden bevis. `km:'0'` og årgang som streng virker. JSON-LD (`seo.js:434–439`) følger eksternErNy: NewCondition/UsedCondition/udeladt. Det er korrekt.

### 4. Deeplink og foldning
- `modelFraDeeplink`: 40+ URL'er. Kun mcsyd.dk (inkl. www), 5 stisegmenter, Ny/Brugt/Demo, numerisk id, mærke skal matche. Afviser evil.mcsyd.dk, mcsyd.dk.evil.com, forkert mærke, 4 segmenter, ikke-numerisk id. OK. Se P3 for HD og reklametekst.
- `harmoniserStavning` (40 grupper + 120 permutationer af MT-07-varianter): rækkefølgeuafhængig, "CB 12.5" ≠ "CB 125", "Z 650" ≠ "Z650 RS", MT-07/MT 07/Mt-07/MT07 → ét navn, SYM/Sym, FB Mondial, BMW. Ingen to ægte forskellige modeller smeltede sammen i de testede par. 'HD'→Harley-Davidson sker i `maerkeAkronym` (normalisering), ikke i harmoniseren.

### 5. Friskhed
Tom/ugyldig/fremtidig → ingen note (fremtid > nu+1 døgn ignoreres). 14 dage → ingen advarsel, 15 dage → advarsel. Tidszone: ISO med offset og dato uden tid OK. Indkodede grænsetilfælde OK. P3: år 0.
Layout (320/390/1440, lys+mørk, 5 sider): 0 overflow (documentElement), `#frisk-note` er tom `<p>` i HTML med CSS-reserveret min-height (1,4em; 2,8em < 640 px), målt 18 px / 36 px, 2 linjer ved 320 px, ingen skjult-spring i de testede tilfælde (kun hvis alle viste annoncer mangler dato, så skjules pladsen). SEO uændret (title og h1 identiske; ny `<p>` er tom i statisk HTML). `?conditions=Ny` viser 2 fixtures-nye. FILTER_CONDITIONS har "Ny" først; `CONDITIONS` (opret-annonce) er uændret, 4 værdier. Konsol: kun mine egne afbrudte eksterne ressourcer (fonts/GA), ingen sidefejl.

### 6. Kommentarfjerner
`fjernHtmlKommentarer` på kopier af alle 69 rod-HTML'er: idempotent, 773 kommentarer fjernet, 0 tilbage, alle `<script>/<style>/<pre>/<textarea>`-blokke byte-ens (inkl. JSON-LD), synlig tekst uændret, ingen nye bare LF. Nogen runtime bruger ikke kommentarmarkørerne (`srp:`/`cookie:` bruges kun af build). `git diff c4e8b15 HEAD -- scripts/shared.js`: +40/−2, kun reelle linjer (CRLF bevaret). OK.

### 7. Regression
`npm test` 525/525. De tre filer 62/62. `node --check` ok. Ingen filændringer i worktree efter kørsel.

## Er reglerne selv en risiko?
Ja, moderat. Hver regel er sammensat af 4–8 betingelser, spredt over data.js, backend-bridge.js, components.js, annonce.js og to generatorer, og to af dem (P0-1, P2-1) er opstået netop af den spredning: en lokal kopi af forudsætningen (`saelgertype`, import) blev glemt. Forslag:
1. Efterspørgsel: skjul kun tre entydige starter (`købes`, `ønskes købt`, `vil købe`/`efterlyses` uden spørgetegn); drop `køb:`, `søges/søger` og `leder efter` helt. Ét ekstra efterspørgselsopslag er billigere end ét skjult salg, og undtagelseslisten kan så slettes.
2. Ny: lad `kildeNyStatus(l)` være eneste indgang, og lad `normalizeExternalListing` bruge `eksternErNy` på det færdige objekt (ikke et halvt objekt). Én test: badge ≡ condition-filter ≡ SEO ≡ tællere over et fuldt gitter.
3. Tal: behold `saniterTal`, men fjern "årg NN"-beviskæden (3 variable) til fordel for "ccm == årgang → null, ellers behold". Det mister Super Cub-kanttilfældet, men kommentarerne beskriver ikke længere noget, koden ikke gør.
4. Tilføj en rigtig test af generatorernes rene hjælpefunktioner (eksporter `brugtOrd` o.l.), og kobl de tre testfiler på `npm test`.

## Filer
- Rapport: `C:\Users\pasca\Desktop\rod\Claude code\docs\review\gauntlet\critic-w3-data-3.md`
- Fundne fejl: `scripts/build-brand-pages.js:100`, `scripts/build-facet-pages.js:205`, `js/backend-bridge.js:752`, `js/annonce.js:818`, `js/components.js:837`, `js/search.js:781`, `package.json` (testliste)
