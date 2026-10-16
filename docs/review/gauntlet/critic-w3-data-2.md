# Critic w3-data, runde 2 (blind): datakvalitet og ærlige mærker

Worktree wt/w3-data, HEAD 0007d8b, baseline c4e8b15. Ingen kald til produktion: alle Supabase-kald var page.route-mocks, egne datasæt (13 mock-rækker + node-batterier). Scripts i `Desktop/rod/crit2/` (udenfor repoet). Kommentarfjerner/udgiv kørt på en kopi (git archive) i scratchpad. Ingen produktionskode ændret. Mine servere (8775-8777) er stoppet på PID.

## Samlet dom: AFVIS (smal, billig at rette)

Runde-1-fundene er rettet (XR 80/C90 bevaret, "kan købes med garanti" og "søges nyt hjem" vist, Engros = kildens ord, mcsyd-sti, demo uden Ny, størrelsesbevidst hk/ccm). Men "Købes/søges"-filteret skjuler stadig ægte salgsannoncer ved almindelige danske formuleringer (P1), og årg-reglen nulstiller stadig ægte ccm, når modellens navn ikke indeholder tallet (P2). Alt andet holder; regression ren.

## Fund

| # | Sev | Fund | Reproduktion |
|---|---|---|---|
| 1 | **P1** | `erEfterspoergsel` skjuler **ægte salg**, når titlen *slutter* på "søges"/"købes" uden at ligge i Builderens tre undtagelser. "Ny ejer søges", "Nyt hjem søges", "Køber søges", "Bytte søges", "Til salg, bytte søges", "Søges køber: …", "kan også købes", "kan gerne købes", "(kan købes)", "hurtig handel købes", "kan finansieres, købes". Builderens `søges ny ejer`-undtagelse dækker kun rækkefølgen *søges + ny*, ikke den hyppigere *ny ejer + søges*. Forbeholdslisten (`kan/må/skal…`) kræver mellemrum før ordet og tager ikke "også/gerne" eller "(". De rammer lager, søgning, tal og mærkesider (ligger kun i `EXTERNAL_DUBLETTER`, direkte adresse virker). | `erEfterspoergsel('Honda CB 500 – ny ejer søges')` = true. Browser (mock-række 4, 41.000 kr): ligger i `EXTERNAL_DUBLETTER`, ikke i `EXTERNAL_LISTINGS` og ikke i søgningen. Samme for de 20 titler i tabel 3. Forslag: (a) behandl "søges/købes" som efterspørgsel kun hvis hele titlen er ≤ ca. 6 ord eller ordet er første ord; (b) undtag `(ny\|nyt)\s+(ejer\|hjem)\s+søges`, `køber\s+søges`, `bytte\s+søges`, `til salg`; (c) forbehold: `(?:^\|[\s(])(?:kan\|må\|skal\|ikke\|evt\|bør\|vil\|som\|også\|gerne)\s*$`. Hellere en falsk negativ (efterspørgsel vist) end en skjult annonce. |
| 2 | P2 | Årg-reglen nulstiller stadig **ægte ccm**, når modellens navn ikke selv indeholder tallet: Puch Maxi S "årg 50" (50 cc), Honda Super Cub "årg 90" (90 cc), Yamaha DT "årg 80" (80 cc), Kreidler Florett / Zündapp Combinette "årg 50", Puch Monza "årg. 65". Kørekort A1 -> A2 (ægte A1-knallert falder ud af A1-filteret). Reglen kan ikke skelne dem fra "xj 900 årg 90" ud fra titlen alene. Forslag: nulstil kun, hvis titlen også har et større tal, der *begynder* med ccm-cifrene (900 for 90, 500 for 50), eller hvis `aargang` selv er 19NN med samme NN. | `saniterTal({ccm:50,hk:1.5,aargang:1978,tekst:'Puch Maxi S årg 50'})` -> `{ccm:null}`; `{ccm:90,hk:6,tekst:'Honda Super Cub årg 90'}` -> ccm null (A1 -> A2). |
| 3 | P2 | "Ægte ny" lagerbil -> **Brugt**: MC Syd `/Ny/`-sti, kilde ny, km 0/null, årgang 2022 eller ældre -> `Brugt`, `UsedCondition`, "Stand Brugt" (Yamaha MT-07 2022, km 0, /Ny/: annonceside "Stand Brugt", JSON-LD UsedCondition). Årgangsreglen behandler "gammelt modelår" som bevis for *brugt*, men det modsiger ikke "ubrugt". Samme flip sker hver 1. januar for MC Syds kataloglager. Bedre: alder alene giver `null` (intet mærke), kun km > 500 giver false. | Mock-række 6 i browser; `kildeNyStatus({kildeStand:'ny',externalUrl:'…/Ny/…',km:0,year:2022})` = false. |
| 4 | P3 | Gul og Gratis privat, stand "ny", årgang >= i år−3, km ukendt -> "Ny"-mærke + JSON-LD NewCondition + noten "katalog over nye motorcykler" (Gul og Gratis har ikke et katalog, og årgangen beviser ikke ubrugt). Før var det også blind tillid, så ikke en regression; ny-bevis bør kræve km <= 50 for ikke-katalogkilder. | `normalizeExternalListing` mock-række 9-lignende (GoG, km null, 2025, ny) -> Ny. |
| 5 | P3 | `senesteBekraeftet` = max(sidst_set) i udsnittet. Ét frisk annonce skjuler et gammelt lager: 1 annonce i går + 300 annoncer 75 dage gamle -> "Senest bekræftet hos kilderne [i går]" uden advarsel (ældste står kun i tooltip, som mobil ikke har). Sandt som "nyeste bekræftelse", men "hos kilderne" læses som hele lageret. Overvej "Nyeste bekræftelse…" eller også at vise andelen ældre end 14 dage. Fremtidig dato > 1 døgn ignoreres (rigtigt); numerisk timestamp, `dd/mm/yyyy` og dansk dato ignoreres (ukendt, rigtigt); dato i besøgendes tidszone. | tabel 6 |
| 6 | P3 | `scripts/shared.js`: hele filen konverteret CRLF -> LF (850 linjer churn, 40+/2- reelt). Skjuler den rigtige ændring i diffen/blame. Ingen funktionsfejl. | `git diff c4e8b15 HEAD --stat` 850 vs `--ignore-cr-at-eol` 42 |
| 7 | P3 | Små: (a) deeplink med små bogstaver i stien giver "Mt-07" (kun første bogstav versal; `harmoniserStavning` retter det kun ved flertal); (b) `modelFraDeeplink` kører ikke `fjernMaerkeDublet` ("Honda Honda CB 500" -> model "Honda CB 500"); (c) `FB Mondial`-tie (1 stk. hver stavemåde) vælger "FB-Mondial" (bindestreg-tie-break) i stedet for kendt "FB Mondial" (ikke i `BRANDS_BY_MODEL`; slug uændret); (d) "Ténéré"/"Tenere", "HD"/"Harley" foldes ikke (konservativt, ingen forkert fold); (e) `harmoniserStavning` fletter "CB 12.5" og "CB 125" (punktum strippes; kunstigt, ingen rigtig model); (f) kort viser "engros"/"Bytter Gerne" i kildens form, annoncesiden altid "Engros"/"Bytter gerne" (ens ved versaler, som kilden leverer); (g) `/ny/`-segment i en vilkårlig URL (ikke kun MC Syd) tolkes som "ny" når stand mangler (før også). | tabeller 4, 5, 7 |

Bekræftet uden fund: crawlerens adfærd er uændret, `git diff c4e8b15 HEAD -- crawler` = kun `renseUrealistiskeTal` (+39 linjer, ren, ikke koblet) + eksport; ingen regel, felt eller kald rørt. Drift mellem `saniterTal` og `renseUrealistiskeTal`: 0 af 10.500 af mine egne kombinationer. `CONDITIONS` urørt; opret-annonce-dropdown = Vælg stand, Som ny, God stand, Brugt, Defekt/Projekt. Ingen HTML/CSS/package.json ændret, så SEO er uændret ud over annoncesidernes JSON-LD `itemCondition`.

## Tabel 1: tal-sanering (115 + 24 egne køretøjer)

Ægte tal nulstillet (= tab af ægte data):

| Input | Resultat | Kørekort før -> efter | Vurdering |
|---|---|---|---|
| Puch Maxi S 50 cc, "årg 50" | ccm null | A1 -> A2 | #2 |
| Honda Super Cub 90 cc, "årg 90" | ccm null | A1 -> A2 | #2 |
| Yamaha DT 80 cc, "årg 80" | ccm null | A1 -> A2 | #2 |
| Kreidler Florett 50 cc / Zündapp Combinette 50 cc, "årg 50" | ccm null | A1 -> A2 | #2 |
| Puch Monza 65 cc, "årg. 65"; "Å årg. 98" 98 cc | ccm null | A1 -> A2 | #2 |
| Indian 1890 cc med `aargang` 1890; Rocket "2000 cc" + årgang 2000 | ccm null | A -> A | kendt tvetydighed, ingen kendt serie-MC; ok |
| 125 cc med 63-65 hk (RS125R); 50 cc med 26 hk | ccm null | A1 -> A2/A | urealistisk, ok |

Bevaret korrekt (udsnit, alle 50cc-2458cc): Puch 50, CB 50, Monkey 125, Honda XR 80 "årg 80"/"årg 1980", C90 "årg 90", C 90, Dax 70 "årg 85", Dax ST50, Panigale 1299 (1285/205), R6 (599/129 og 133), H2R (998/310), RS125 40 og 55 hk, NSR50 20 hk, TZR 125 45 hk, TZ250 90 hk, RD500 88 hk, RG500 95 hk, Rocket III 2294, Rocket 3 2458/167, Indian 1890, Harley WL 1200 "årg 1950", XJ 600 "årg 1998", CB 1100 "årg 2011", CB 750 "årg 75"/"årg 1975", Moto Guzzi V50 "årg 50", Triumph T120 650 "årg 65", Jawa 350 "årg 35", KTM 1290 (1301/180), Gold Wing 1832, Boss Hoss 8200/500, Hayabusa, ZX-14R, ZX-10RR, S1000RR, RSV4, MV F4, el-motorcykler (ccm null/0, hk bevaret), hk som streng.
Nulstillet korrekt: XJ 900 "årg 90" med ccm 90, GPZ 500S "årg 1992" med ccm 1992, Bonneville T 120 med ccm 120 og hk 80, ccm 44, 125 cc med 70 hk, ccm 2000 + årgang 2000 når titlen ikke nævner det.

Urealistisk slipper igennem (ingen falsk kørekort-påstand i farlig retning): ccm 20.000 / 99.999 / 1.000.000 (ingen øvre grænse), ccm 1000 med 5 hk, 125 cc med 60 hk (A2/A, stramning), 125 cc med 200 hk (ccm nulstilles, hk 200 bevares -> "A"), ccm 600 med 250 hk, ccm 80 hvor titlen siger "årg 1980" og hk 40 (ratio 0,50), ccm 90 hk null når titlen har "90.000 km" (stdIModel læser 90 i "90.000"). Alle P3.

## Tabel 2: "Ny" (51 kombinationer, i år = 2026)

| Input (kilde / sti / årgang / km) | Udfald | Vurdering |
|---|---|---|
| MC Syd /Ny/ 2026, 2025, 2024, 2023 med km 0 eller null | Ny + badge | ok |
| MC Syd /Ny/ årgang null, km null; årgang 0 km 0; årgang 2027 km 0 | Ny | ok |
| MC Syd /Ny/ 2026, km 1, 12, 50 | Ny | ok |
| MC Syd /Ny/ 2026, km 51, 120, 500 | intet mærke (null) | ok (demo-/forevisning) |
| MC Syd /Ny/ 2026, km 501; 2025 km 3000 | Brugt | ok |
| MC Syd /Ny/ **2022** km 0; **2021** km null | **Brugt**, UsedCondition | **#3** (ægte ny -> Brugt) |
| MC Syd /Demo/ stand null, km 0 eller 300 | intet mærke | ok |
| MC Syd /Demo/ men stand "ny" (crawlerfejl) | Ny | crawler sætter Demo-stand = null, så teoretisk |
| MC Syd /Brugt/ 2026 km 0 | Brugt | ok (kilden siger brugt) |
| stand null + /Ny/ 2026 km 0 / + /Ny/ km 9000 | Ny / Brugt | ok |
| km "0", "12.000 km", "4.500" (streng) | Ny / Brugt / Brugt | ok |
| aargang "2026" (streng), 1885, 1884, 2101 | Ny / Brugt / Ny / Ny | ok (1884, 2101 = ukendt) |
| km -5, 0,5 | Ny | ok |
| GoG ny, 2026, km null (privat) | Ny + badge | **#4** |
| GoG ny, km null, årgang null | intet mærke | ok, ærligt |
| GoG ny, km 0, årgang null | Ny | ok |
| GoG ny, km 0, årgang 2015 | Brugt | acceptabelt |
| GoG ny, km 20.000, 2019 | Brugt | ok |
| stand "Ny", "NY ", "new", "used", "fabriksny" (sti /Ny/) | Ny, Ny, Ny, Brugt, Ny | ok |
| stand "som ny", "ny stand", "nyistand", "demo", "udstillingsmodel" | intet mærke | ok |
| GoG-URL med /ny/ i stien, stand null, 2015 | Brugt | P3 #7g |

Konsekvens (mock, browser): annonceside Stand, JSON-LD `itemCondition` (Offer og Product), kortets Ny-mærke og "Mulig A1"/"Kørekort A" følger samme resultat; null giver ingen Stand-række og ingen `itemCondition`. Garanti-noten ("katalog over nye motorcykler… derfor ikke oplyst") står kun ved Ny, og "kilometerstanden er derfor ikke oplyst" kun når km er null (Sym Jet 4 km null: står; Africa Twin km 0: står ikke). `?conditions=Ny` = præcis de to bekræftede (Africa Twin, Sym). `erUbevistNy` gør, at mærke-/facetsider ikke skriver "brugte" over lager med ubeviste "ny" (kræver genbygning af genererede sider).

## Tabel 3: "Købes/søges" (91 + 46 titler)

Falske positiver (ægte salg skjult, 22 af mine): "Honda CB 500 – ny ejer søges" (+ med punktum, "nyt hjem søges", "ejer søges", "kærlig/god ejer søges"), "– køber søges", "passende køber søges", "Søges køber: Honda", "– bytte søges", "Honda CBR til salg, bytte søges", "– bud søges", "Kan købes uden at søges", "kan også købes", "kan gerne købes", "(kan købes)", "nem at købes", "hurtig handel købes", "pæn og velholdt, "Købes"", "kan finansieres, købes". Plus tvetydige: "Købes og sælges motorcykler" (skjult; forretningsannonce).
Falske negativer (efterspørgsel vist, 9; konservativt, designvalg): "Søger MT-07", "Søger Yamaha MT-07 i god stand", "Søger MC til A1", "Vil købe Honda Hornet", "Ønsker at købe en Ducati", "Leder efter Yamaha XJ 600", "Køber MC kontant", "Honda Transalp købes (kun seriøse)", "Honda CB 500 ønskes købt af mig". "Honda købes af forhandler?" vises (tvetydig; ok).
Rigtigt: Købes:/Søges:/ønskes købt/køb ønskes/"BSA / Triumph / Norton købes"/"KØBES KONTANT"/"Søges" (alle filtreret); "kan købes med 12 mdr garanti", "søges nyt hjem/ny ejer", "Søger ny ejer/nyt hjem", "Skal sælges – kan købes", "Til salg eller bytte", "Købt ny, kan evt. byttes", "købesum", "søgesæt", "Søger køber til…", "Søger et nyt hjem til min Honda", "Kawasaki ZX-6R SØGES NYT HJEM", "Søges nyt liv" (alle vist).

## Tabel 4: deeplink (37 stier, kun mcsyd.dk/Produkter/*/(Ny|Brugt|Demo)/<titel>/<id>)

Rigtige modeller: Brugt/Ny/Demo, `www.`, http, store/små bogstaver i `produkter/motorcykel/brugt`, æøå ("Shælv øå"), anden kategori (`45-Scooter-knallert`), Harley Davidson/Harley-Davidson, Can-Am/Can Am, SYM/Sym, FB Mondial/FB-Mondial, støj ("SÆLGES" klippes), trailing slash, hash. Ingen afledning (null, korrekt): `+` som mellemrum, dobbeltencoded, manglende/ekstra segment, "Brugte", andre værter (`mcsyd.example.com`, `evilmcsyd.dk`, `mcsyd.dk.evil.com`), Gul og Gratis, Suzuki-sti under mærket Honda, "Hondaline X", titel kun mærket, id ikke-tal, ugyldig %-kodning, tom titel. Ingen forkert model fundet; kun #7a/#7b (P3).

## Tabel 5: fold (30 grupper, 20 permutationer hver)

Deterministisk uafhængigt af rækkefølge: 30/30. Korrekte folder: SYM/Sym/sym/S.Y.M., MZ/M-Z/Mz, Moto Guzzi/Moto-Guzzi/MotoGuzzi, Can-Am/Can Am/CanAm, Harley-Davidson/Harley Davidson/harley-davidson/Harleydavidson, MT-07/MT 07/MT07/Mt-07, GSX-R 750/GSX R750/GSXR750, Z650 -> Z 650 (Z650 RS adskilt), CB 500/CB500 (CB 500 F adskilt), XJ6/XJ 6 (N adskilt), V-Strom 650/V Strom 650/VStrom650, R 80 G/S og R80 GS adskilt, GSX-R 750 og GSX-R 7500 adskilt, R1200GS og R1200GSA adskilt, forskellige mærker (Honda CB 500/Hyosung CB500) adskilt. Forkert/uønsket: kun "FB-Mondial" (tie), "MT 07" slår "MT-07" ved 2 mod 1, "CB 12.5"+"CB 125", "HD" og "Harley" foldes ikke.

## Tabel 6: senest bekræftet (24 inputs, nu = 16.10.2026 09:00 CEST)

| Input | Tekst |
|---|---|
| sidstSet 15.10 23:30Z / 22:30Z | "16. okt." (lokal dag) |
| kun dato "2026-10-15" | "15. okt." |
| 13 dage / 14 dage | "2. okt." / "1. okt." uden advarsel |
| 31 dage | "15. sep. Annoncerne kan være ændret siden." |
| 2025-12-31T23:30Z | "1. jan." (uden år, lokal dag) |
| 2025-06-10 | "10. jun. 2025" + advarsel |
| +12 timer / +25 timer / +1 mdr fremtid | "16. okt." / ignoreret / ignoreret |
| blandet fremtid + gyldig | den gyldige |
| "junk", null, tom liste, `dd/mm/yyyy`, "15. oktober 2026", numerisk ms, 0 | intet vist |
| "1970-01-01" | "1. jan. 1970" + advarsel (ærlig) |
| blandet nyeste/ældste | nyeste; ældste i tooltip |

Tidszone: `getDate()` i besøgendes zone (ikke testet på tværs i Node/Windows; samme som runde 1, P3). Layout (mock, 1440/390/320, lys+mørk): forside, søgning, `?conditions=Ny` og mærkeside 0 px overflow på `documentElement`, 0 konsolfejl udover mine blokerede billedvært-kald (`images.danbase.dk`, `assets.guloggratis.dk`). CLS på søgning 0,017-0,025 (baseline 0,000-0,009): lille spring fra `#frisk-note`, godt under 0,1. Forsidens hero-CLS (0,26-0,40 ved 1440) måles også på baseline (0,26), altså eksisterende og ikke fra denne gren.

## Tabel 7: Engros og kommentarfjerner

- Kort og annonceside viser kildens ord overalt ("Engros +1" med titel "Engros · Uden klargøring"; annonceside "Salgsvilkår Engros · Uden klargøring"); ingen "Handelspris". Ingen Engros-tekst i SEO (JSON-LD, titler). Kort `engros`/`Bytter Gerne` i kildens form vs annonceside normaliseret: P3 #7f.
- `fjernHtmlKommentarer` på kopi af alle 69 rod-HTML: inline script/style byte-ens 69/69, JSON-LD (parset) ens 69/69, idempotent 69/69, 140.891 bytes fjernet, ingen betingede kommentarer, ingen kommentar i attributværdi. `node scripts/udgiv.js` på kopien: "_site er klar", alle 261 inline-scripts har deres sha256 i sidens CSP (sammenlignet efter newline-normalisering, som browserens parser gør; filerne har CRLF, hashene er over LF, uændret fra baseline). DOM (kommentarnoder fjernet, whitespace normaliseret) identisk på 12 sider (index, søgning, annonce, mærke, model, type, region, guide, kørekort, om-indeksering, opret-annonce, statisk annonce), 0 konsolfejl. Syntetiske: script/style/pre/textarea/noscript-indhold, ld+json, template, CDATA, versale tags urørt (uafsluttet `<!--`, `<!-- x --!>`, `<!-->`, IE-conditional urørt, sikkert); `<title>A<!-- x -->B</title>` og `<meta content="<!-- x -->">` ændres (findes ikke i nogen rodside).

## Tabel 8: regression

`npm test`: 525/525. `node --test js/data-kvalitet.test.js scripts/udgiv-kommentarer.test.js scripts/sweep-datakvalitet.test.js`: 50/50. `node --check` på alle js/, scripts/, crawler/: ingen fejl. Render forside, søgning, `?conditions=Ny`, mærke, 6 annoncesider: 0 overflow, ren konsol, JSON-LD på annoncer ændres kun i `itemCondition`; static HTML urørt.

## Rettelsesliste for ACCEPTER (rækkefølge)

1. #1 (P1): udvid undtagelser i `erEfterspoergsel` (ny ejer/nyt hjem/køber/bytte + "søges", `også/gerne`, `(` foran "kan"). Tilføj mine 20 titler fra tabel 3 som test.
2. #2 (P2): "årg NN" nulstiller kun med bevis for en anden, større ccm i titlen (900 for 90) eller konsistent `aargang`.
3. #3 (P2): årgang alene giver null (intet mærke), ikke false; kun km > 500 modsiger "ny".
