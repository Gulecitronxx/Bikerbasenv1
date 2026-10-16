# META-GAUNTLET 2 — skaber Gauntlet-processen faktiske forbedringer?

Reviewer: Meta-Gauntlet (kun analyse; ingen kode, build eller git-skrivning). Periode: `72090b0..3caffd2`, 15.10 20:32 til 16.10 08:18 (ca. 11,8 timer, 72 commits, 1.250 filændringer, +83.932/-57.885 linjer; `npm test` 344 -> 645).
Kilder: GAUNTLET.md, PARALLEL.md, 13 builder-, 25 critic- og 3 detective-rapporter, DECISIONS.md, BACKLOG.md, `git log`, workflows og `scripts/seo-*`.
Metode og forbehold: tal for fund er talt fra Critic-rapporternes egne severity-labels og F-/P-lister (ikke omklassificeret). Hvor en rapport ikke har en entydig liste er tallet markeret "ca.". Commit-kategorier er klassificeret på commit-emnet (grov heuristik).

## Kort dom

Processen skaber reelle forbedringer, men værdien sidder næsten udelukkende i (a) blinde Critics på regeltunge/delte områder (data, SEO/CI, juridisk indhold, delt layout) og (b) den samlede site-Critic. På de 9 designstrømme fandt Critic'erne mest P2/P3 (finish), og 1 runde var nok. Spild: tre gentagne data-runder på samme regelfamilie, ét byg-og-rul-tilbage (typebillede), og kritikere der rodede i hovedmappen/andres servere.

## 1. Værdi af uafhængig kritik (pr. Critic-runde)

Severity som Critic selv satte. "Misset" = Builderen skrev ikke fundet i sin egen rapport/test. "Rettet" = spor i commit/builder-runde efter. Mange F-lister er ca.-tal.

| Critic-rapport | Dom | P0 | P1 | P2 | P3/øvrige | Rettet efter | Bemærkning |
|---|---|---|---|---|---|---|---|
| G-001 | ACCEPT | 0 | 0 | 0 | 0 | - | 4/4 krav; ingen kantcases |
| S-001/002 | ACCEPT | 0 | 0 | 0 | 4 obs. | delvist | CRLF-støj i 13 sider (702d64c) rapporteret, aldrig forebygget |
| batch2 | ACCEPT | 0 | 0 | 1 (NF-1) | 3 (F1-F3) | NF-1 ja | |
| batch3 | 1 AFVIS | 0 | 0 | ca. 2 | ca. 6 | ja | NF3-5: søgefelt/mærkesøg faldt uden for kant-fix (1,34:1) |
| forside | ACCEPT | 0 | 0 | ca. 2 | ca. 5 | runde 2 (`fba5a70`) | ikke gen-kritiseret |
| soegning | ACCEPT | 0 | 0 | ca. 3 | ca. 2 | runde 2 (`984afd4`) | ikke gen-kritiseret |
| annonce | ACCEPT | 0 | 0 | ca. 3 | ca. 5 | `76c4144` | F-1 var en lille regression |
| facet | ACCEPT | 0 | 0 | ca. 3 | ca. 4 | `59354e8` | afhang af guides-merge-rækkefølge |
| maerke | ACCEPT | 0 | 0 | ca. 3 | ca. 7 | `8c2df2b` | generator-rækkefølge brand->facet (reelt integrationsrisiko) |
| opret | ACCEPT | 0 | 0 | 3 reelle | ca. 7 | runde 2 (`390008e`) | 49 ccm afvist (knallert) |
| opret-2 | ACCEPT betinget | 0 | 0 | 2 | ca. 6 | `626539b` | validering omgås via kladde (F-1) |
| dashboard | ACCEPT | 0 | 0 | ca. 5 | ca. 8 (F-1..F-13) | `7e614cb` | 326/367 px overflow ved 320 målt |
| login | ACCEPT | 0 | 0 | ca. 3 | ca. 6 | `f20c2d7` | |
| guides | **AFVIS** | 0 | **2** | ca. 3 | ca. 7 | `140e6c5`, `984e268` | P1: tl;dr sagde reklamationsret ikke gælder ved privatkøb (juridisk forkert); A2-sidebjælke viste trehjulet Tricity |
| guides-2 | ACCEPT | 0 | 0 | 4 | ca. 4 | `984e268` | |
| w2-bredde | ACCEPT | 0 | 1 (præ-eksisterende, live) | 2 | ca. 9 | `c4e8b15` | swipe-badge = sort ellipse over hele fotoet; typebillede afvist |
| w2-tekst | ACCEPT | 0 | 0 | ca. 3 | ca. 5 | ja | 0 omformulerede ord (godt ægthedstjek) |
| **samlet** | **IKKE KLAR** | 0 | **1** | ca. 18 | ca. 4 | `e040073` | header 73-301 px vandret overflow ved 1024-1345 px; 49/55- og 655/411-tal; containerbredder |
| w3-data (r1) | **AFVIS** | 0 | **2** | 4 | 4 | `0007d8b` | XR 80/C90 mistede ægte ccm (A1 -> A2); "købes/søges" skjulte ægte salg |
| w3-data-2 | **AFVIS** | 0 | **1** | 2 | 4 | `0540da7` | samme familier, nye formuleringer ("ny ejer søges") |
| w3-data-3 | **AFVIS** | **1** | 0 | 2-3 | ca. 5 | `8ff33f8` | `erUbevistNy` ikke importeret -> ReferenceError i begge generatorer = næste `build.js` ville knække |
| integreret-w3 | ACCEPT | 0 | 0 | 1 | 11 | `2f9a1dd` | brandtekst talte ubeviste "ny" som "brugte" |
| w3-seo (r1) | ACCEPT m. betingelser | 0 | **2** | 3 | 1 | `11243d9`, `30c9bfe` | CI-deadlock ved fail-safe; lastmod = deploy-dag |
| w3-seo-2 | **AFVIS** | 0 | **3** | ca. 4 | ca. 4 | `92819e5`, `216aef0` | facet-trin fejler -> sitemap 111 -> 40 URL'er; tekst "sitemap beholdt" var falsk |
| w3-seo-3 | ACCEPT | 0 | 0 | 4 | 4 | `8ff33f8`, `216aef0` | 20+ scenarier på kopi; stærkeste enkeltrapport |

Optælling: 25 Critic-rapporter, 7 AFVIS/IKKE KLAR (28 %), 1 P0, ca. 12 P1 (heraf 1 præ-eksisterende), ca. 75-85 P2, ca. 120 P3/obs. Gange Builderen selv havde misset det: samtlige P0/P1 (ingen blev fundet af Builderens egne tests; tilfælde hvor Builderen allerede kendte fundet står som "kendt rest"/DELT-ØNSKE og er ikke talt).

Falske positiver/overdrivelser (få):
- integreret-w3: AA-kontrast 1,17 på forsidens typefliser = hvid tekst på foto, Critic markerede det selv som falsk positiv.
- w3-seo P1-2 (lastmod i CI): Critic skrev selv "hvis ikke P1, så P2"; reelt P2-niveau (dårlig friskhedssignal, ingen skade).
- w3-seo-2: tre P1 hvor P1-2/P1-3 "følger af" P1-1-valget; reelt 1 rodårsag, talt som 3.
- dashboard: acceptkriterium 4 (strengt 0 px) gav "FAIL (delvist)" ved 6-7 px overflow ved 320 px; P2 var korrekt, men FAIL-etiketten var streng.
- w3-data r1 #6/#7 (P3): meget smalle kantcases (RS125 55 hk) – lavt udbytte, men ikke direkte forkerte.
Samlet: jeg finder ingen rapport med et P0/P1 der viste sig at være falsk. Overdrivelsen ligger i P2-volumen og i at hver runde finder nye P3 i samme regelfamilie.

Fund der reelt reddede brugere/SEO/drift:
| Fund | Hvad ville være sket | Kilde |
|---|---|---|
| Forkert juridisk tl;dr (reklamationsret ved privatkøb) | Læser træffer dårlig købsbeslutning på vores guide | critic-guides P1 |
| Tricity (trehjulet) i "A2-motorcykler" | Forkert vejledning til A2-kørekort | critic-guides F-2 |
| `saniterTal` nulstillede ægte ccm (Honda XR 80/C90, Puch/Super Cub) | Ægte knallerter forsvinder fra A1-filteret for 16-årige | critic-w3-data r1 + r2 |
| `erEfterspoergsel` skjulte ægte salgsannoncer i to runder ("kan købes med garanti", "ny ejer søges") | Ægte annoncer væk fra søgning, tal og mærkesider | critic-w3-data r1, r2 |
| `erUbevistNy` ikke importeret (P0) | `build.js` kaster ReferenceError; ingen deploy af noget som helst; testen kun `match`ede strengen | critic-w3-data-3 |
| Fail-safe uden udgang (CI-deadlock) | Ingen ændring kan udgives så længe SEO-fald består | critic-w3-seo P1-1 |
| Skadet sitemap deployes (111 -> 40 URL'er) | 71 facetsider forsvinder fra sitemap ved delvis API-fejl | critic-w3-seo-2 P1-1 |
| Header-overflow 73-301 px ved 1024-1345 px (delt lag, alle sider) | Vandret scroll på iPad/små laptops på hele sitet | critic-samlet P1-1 |
| Swipe-kørekortbadge = ellipse over fotoet (live) | Ødelagt kortvisning i produktion | critic-w2-bredde |
| 49 ccm afvist i opret-annonce | Almindelig knallert 45 kan ikke oprettes | critic-opret F-3 |
| Tal der ikke stemte (49/55, 655/411, "655" over "0 fundet") | Troværdighedsbrud | critic-samlet P2-2 |

## 2. Gentagelser og spildt arbejde

| Mønster | Evidens |
|---|---|
| Data-strømmen: 4 runder (3 AFVIS i træk + integreret ACCEPT) | critic-w3-data, -2, -3 -> builder-w3-data runde 2, 3, 4. Samme to regelfamilier ("købes/søges", "årg NN") fundet igen i r2 med nye formuleringer. |
| SEO-strømmen: 3 Critic-runder + integreret | critic-w3-seo, -2, -3. Fail-soft blev omskrevet to gange (exit 3 -> sletteloft -> udskudt sletning, `11243d9`, `92819e5`, `216aef0`). |
| Byg -> afvis -> rul tilbage: typebillede på kort uden foto | Bestilt i opgaven til w2-bredde, Builderen noterede selv modstriden med annoncesidens løfte (builder-w2-bredde:49), Critic P2-1, tilbagerullet i `c4e8b15` ("Typebilledet modsagde ... tidligere beslutning (DECISIONS)"). Rodårsag: opgaven stred mod DECISIONS; ingen kontrol af opgaver mod beslutningslogget FØR bygning. |
| CRLF/LF-støj rapporteret 4 gange | S-001/002 (13 sider, 4.753 linjer), critic-dashboard F-10 (114 vs 14), critic-w3-data-2 #6 (850 vs 42), critic-w3-data-3 (714 vs 8). PARALLEL.md regel 6 sagde det allerede; ingen automatisk kontrol. |
| Samme "ikke oplyst"/"katalog over nye"-ordlyd rettet flere steder, aldrig alle | data-r1 #3 (annonce.js), data-r3 P2-2 (annonce.js:818 + components.js:837) |
| Dobbeltarbejde i test | Alle Critics byggede egne Playwright-mocks (lib.js/mock.js) pr. strøm; ingen delt harness |
| Agenter der overskrev hinandens scripts i scratchpad | Ikke dokumenteret i filerne. Rapporterne viser separate scratch-mapper pr. Critic (crit, crit2, crit_mk, crit_opret ...), så jeg kan ikke bekræfte kollisioner. Jeg kan ikke afvise det; kun sporet i commits/rapporter. |
| Samme fund i flere runder | Ja: erEfterspoergsel (r1+r2), årg-reglen (r1+r2), "ny" vs alder (r1 P3 #6, r2 #3, r3 P2-1), fail-soft slettelogik (seo r1, r2) |

Rodårsager til mange runder (data 4, seo 3):
1. Regelkompleksitet: tekstheuristikker (regex på titler) har uendelig kantcase-hale; hver rettelse åbner nye formuleringer. Løsningen der virkede var at forenkle (`8ff33f8`: fælles `standOpgoerelse`, katalog kun /Ny/, efterspørgsel kun ved fire startfraser) – dvs. skære regler væk, ikke tilføje undtagelser.
2. Uklare acceptkriterier: opgaven "fjern falsk Ny" og "fjern efterspørgsel" havde ingen falsk-positiv-grænse; Critic og Builder fandt den først ved test.
3. Manglende integrationstest: P0 `erUbevistNy` slap igennem fordi testen matchede en streng i kilden; generatorerne blev ikke kørt i test. P1 sitemap-skade kunne kun ses ved at køre hele byggekæden på kopi.
4. Datastrømmen manglede ægte data: alt bevist på 22 fixture-rækker; ejerens `sweep-datakvalitet.js` på rigtigt snapshot er stadig ikke kørt.

## 3. Overfladiske reviews og modbeviste Builder-påstande

Overfladiske/svage Critic-rapporter (ud fra metode og dybde):
- `critic-G-001` (3 KB): 4 krav, ingen kantcases, ingen mørk/afvigende viewports ud over de målte; passer til en lille ændring, men kan ikke fange regression i andre sider.
- `critic-batch2` / `critic-batch3`: tabeller med PASS; batch3 afviste dog selv NF3-5 (så ikke ren kopi).
- Design-Critics (forside, soegning, login, facet): vurderer mod billede med subjektive scores (fx 3,5/4,0) og mocks; ingen af dem rørte rigtige data eller andre strømme. De er gode til layout, svage til data/SEO/tal.
- `critic-samlet` kørte ikke `build.js` (8d "IKKE KØRT") – bevidst, men betyder at ingen Critic nogensinde verificerede selve produktionsbyggekæden før w3-seo.
- Ingen rapport virker som kopieret Builder-konklusion; alle navngiver baseline og egne scripts. Det er processens stærkeste punkt (blind kontekst virker).

Builder-påstande senere modbevist:
| Påstand | Modbevis |
|---|---|
| "Duplicate content nye sider max 26-48 %" (builder-w3-seo:26) | Critic målte 66-80 % budget, op til 80 % model (critic-w3-seo:41) |
| "Sitemap-poster beholdt uændret" (fail-soft besked) | Faktisk 111 -> 40 URL'er (critic-w3-seo-2, h-facet) |
| "Fail-safe sletter aldrig side forkert" | d75/d90 med sjældne mærker slettede `maerke-indian`, rewaco, victory uden advarsel (seo-2 P2-1) |
| Test "generatorerne bruger erUbevistNy" | Kun strengmatch; generatorerne kastede ReferenceError (data-3 P0) |
| "Ny" kun for kataloget (/Ny/-sti) | Stadig "katalog over nye" i annonce.js:818 og components.js:837 (data-3) |
| Overflow 0 ved dashboard (acceptkrav 4) | 326/367 px ved 320/360 (critic-dashboard) |
| "Handelspris" som neutralt ord for ENGROS | Ny uverificeret påstand (strider mod PARALLEL regel 4); Critic afviste, omskrivning fjernet |
| "Sikker på alle 61 sider" | Ordlyden findes ikke i filerne; nærmeste er "Footer-linkmængde identisk på 61 sider" (critic-S-001) og 66-siders `synk-header`. Kan ikke bekræftes som Builder-påstand. |

## 4. Fokus

Commit-fordeling (72 commits, grov klassificering): design/UI 27 (38 %), integration/build 16 (22 %), docs 13 (18 %), data 8 (11 %), SEO/CI 7 (10 %), andet 1.
Tid (omtrent): 15.10 21:10-22:50 design-bølge 1 (9 strømme), 16.10 00:00-01:20 bølge 2 (bredde/tekst/footer), 01:20-07:58 bølge 3 (data + SEO/CI, ca. 6,6 timer = 56 % af vagten, men kun 21 % af commits).

Vurdering:
- Starten fulgte ejerens prioritet (Detective-køen: G-001, S-001/002, F-001 fritekstsøgning 17/46 uden træf, F-12) – de første "verificeret"-fund er funktion/SEO.
- DESIGN PRIORITY OVERRIDE (9fadd59, 21:10) flyttede bevidst design foran data/funktion. Det er ejerens egen beslutning og er legitimt. Men: effekten var 9 parallelle designstrømme før data/SEO-fund med P1 (F-002 falsk Ny, F-003 lager 51-60 dage, S-005 sitemap-skade) blev rørt – de lå åbne ca. 10 timer, mens der var live brugerrelevante data-fejl.
- Bølge 3 rettede derefter de rigtige prioriteter, og 56 % af tiden gik dertil, så fokus drev tilbage. Konklusion: design-først er okay som engangsundtagelse; fremover bør data/funktion/SEO-P1 aldrig vente på design.

Højt prioriterede ting der stadig er uløst (GAUNTLET.md STATUS 16.10):
- Favorit-hjerte på indekserede kort (D-008; oplæg i builder-w3-data.md) – åben P1 F-005.
- Lagerets alder (51-60+ dage) og at crawl ikke udløser deploy (S-004); ejer-beslutning om aldersgrænse.
- Fail-soft betyder datalaget kan fryse uden rød status (egen "læring" 3).
- El-motorcykler kan ikke oprettes (DB: ccm>0); `trg_listing_limit` kun before insert.
- Cloudflare-regel for to URL'er pr. side (S-003).
- `renseUrealistiskeTal` ikke koblet ind i crawleren (ændrer gemte felter).
- Sweep på rigtigt snapshot ikke kørt; SEO-cloud-routinen ikke oprettet.
- Kendte rester P2/P3: "A2" vs "Mulig A2", login-strip 32 px for bred ved 1920, afmeld uden footer, smalle tekstkolonner.

## 5. Proces-risici der opstod

| Risiko | Hændelse | Ændring i PARALLEL.md/prompts |
|---|---|---|
| Critic ændrede hovedmappen | critic-w3-seo-2: `cd` fejlede, mock-`build.js` kørte i hovedmappen, ændrede 56 filer + 25 nye; oprydning blokeret af "Fact-Forcing Gate" hook; stash "mock-build-artefakter" + `Desktop\rod\mock-build-rester` | Critic-prompt: alle byggekørsler via ét script `drive.js` der afviser stier uden for temp (w3-seo-3 gjorde præcis dette og lykkedes). Gør det til standard; forbyd `cd X && node scripts/build.js` kæder. |
| taskkill lukkede andres servere | critic-opret: `taskkill` på `python.exe` kan have lukket porte 8711-8718 | Forbud mod `taskkill /IM`; kun `taskkill /PID` fra egne starter. Hver strøm skriver PID i en fil. |
| Builders blokeret af klassificering (produktionslæsning) | Ikke direkte dokumenteret i rapporterne; builder-w3-data skriver "ingen læsning fra produktion" og brugte fixtures, hvilket gjorde data-reglerne uprøvet mod ægte data | Giv en godkendt, skrivebeskyttet snapshot-fil (`work/snapshot.json`) som fælles testinput i stedet for at spørge igen og igen. |
| CRLF/LF-støj | 4 rapporter | `scripts/tjek-linjeskift.js` i `npm test`: diff mod baseline med `--ignore-cr-at-eol` må ikke afvige mere end 3x. Commit-hook eller pre-merge check. |
| Merge-konflikter i genererede filer | Orchestrator-regel "kun Orchestrator bygger" virkede (6 integrationscommits uden konfliktmeldinger i loggen) | Behold; tilføj "genererede filer ligger i .gitattributes merge=ours + regenereres". |
| Test-låste adfærdsbeslutninger (D-008) | Favorit-hjerte blokeret af D-008 + test; Builder kunne kun skrive oplæg | Hver D-nummer får `ejer-ændrer: ja/nej` og testen får en kommentar med D-id, så Builder ved at den må stille beslutning til ejeren i stedet for at omgå. |
| Test svækket af strengmatch | `data-kvalitet.test.js:353` | Regel: test må ikke `match`e kildekode for adfærdskrav; generatorer skal røres af en røgtest på fixture. |
| ACCEPT + senere rettelser uden gen-kritik | forside, soegning, login, annonce: ACCEPT, rettet i runde 2 uden ny Critic | For P2-rettelser OK; for alt delt lag: kort "re-verify"-Critic (30 min), ellers samlet Critic til sidst fanger det (gjorde den, P1 header). |

## 6. Næste handlinger (maks. 8, rangeret)

| # | Handling | Effekt | Indsats | Kræver ejer? |
|---|---|---|---|---|
| 1 | Kør `node scripts/sweep-datakvalitet.js` på et rigtigt, skrivebeskyttet snapshot og læs resultatet; beslut tærsklerne (`NY_MAX_KM`, `GAMMEL_EFTER_DAGE`) | Høj (data-reglerne er kun bevist på 22 fixtures) | XS | Ja (snapshot-adgang) |
| 2 | Gør frosset datalag synligt: rød deploy eller GitHub-issue hvis fail-soft i > N dage / lager > X dage; crawl udløser deploy (S-004) | Høj (SEO + funktion, tavs fejl i dag) | S | Ja (CI-ændring) |
| 3 | Kontrollér lagerets alder (50+ dage) og crawl-/deploy-kæde i `crawl.yml`/`deploy.yml` | Høj (viser forældede annoncer) | S | Delvist |
| 4 | Cloudflare-regel for ét URL pr. side (S-003, .html vs udvidelsesfri) | Middel-høj SEO | S | Ja (Cloudflare) |
| 5 | `scripts/verificer-site.js`: ét script der kører overflow (320-1440), kontrast, døde links, SEO-krav (title/h1/canonical/JSON-LD), tal-konsistens (mærke 49 vs søgning), linjeskift-diff og sitemap-diff mod baseline | Høj (erstatter 60 % af Critic-arbejdet) | M | Nej |
| 6 | El-motorcykler: tillad `ccm null` ved oprettelse + DB-constraint | Middel (funktion) | M | Ja (DB-migration) |
| 7 | D-008: favorit-hjerte på indekserede kort via `bb_favorites_ext` (oplæg findes) | Middel (funktion/retention) | M | Ja (D-008) |
| 8 | Opret cloud-SEO-routinen (`docs/seo-routine.md`) og koble `renseUrealistiskeTal` ind i crawleren | Middel (løbende SEO/data) | S + S | Ja (adgang, gemte felter) |

## 7. Anbefalet proces næste bølge (max 1 side)

1. Acceptkriterier skrives FØR bygning af Orchestrator i `docs/review/gauntlet/krav-<id>.md` (max 10 linjer): målbare krav, falsk-positiv-grænse for regler ("ingen ægte annonce må fjernes: 20 positive/20 negative fixtures"), og henvisning til gældende D-nummer. Kræver opgaven noget der strider mod DECISIONS, stopper Orchestrator og spørger ejeren (undgår typebillede-spild).
2. Automatiseret verifikation først: `scripts/verificer-site.js` (se #5) og en byggekæde-røgtest på fixture kører i Builder-loopet og i CI. Critic'en får scriptet som input og bruger tiden på det automatikken ikke kan (indhold, juridik, rendering mod billede, edge-cases).
3. Max 2 Critic-runder pr. strøm. Efter AFVIS 1: Orchestrator skal forenkle reglen (færre stier), ikke tilføje undtagelser. Efter AFVIS 2: stop og eskalér til ejeren/skift tilgang. (Data kostede 4 runder; forenkling i runde 4 løste det.)
4. Én samlet Critic efter hver bølge på det integrerede site på kopi (samlet fandt P1 som strømmene misssede). Stream-Critics begrænses til strømmens egne filer; delt lag + tal-konsistens hører til samlet.
5. Critic-checkliste (fast): overflow 320-1440 lys/mørk, AA-kontrast, tastatur, én h1/title/canonical/JSON-LD, kantcase-fixtures for hver regel, mørk tilstand, tal-konsistens mellem sider, kørt byggekæde på kopi via `drive.js` (aldrig hovedmappen), ingen `taskkill /IM`.
6. Prioritetsvagt: P1-fund i funktion/data/SEO må ikke vente på design; Orchestrator kører først data/SEO-detektiver, så design, medmindre ejeren eksplicit overstyrer (som 15.10 21:10).
7. Meta-Gauntlet kører efter hver bølge (ikke efter 5. fund) med tre målinger: andel AFVIS, gentagne fund-klasser, og antal rettelser rullet tilbage.

## Hvad virkede / hvad var spild (ærlig dom)

Virkede: blind Critic på delt lag og regelområder (1 P0, ca. 11 P1, heraf juridisk tekst, sitemap, CI, A1-filter); samlet Critic; forenkling frem for undtagelser; kopi-baserede byggekørsler (w3-seo-3); ejerens sandhedsregler (PARALLEL regel 4) – ingen opdigtede tal fundet i samlet 7c; tests 344 -> 645.
Spild: 3 data-runder på samme regelfamilie; typebillede bygget og rullet tilbage; 4 gange CRLF-støj; hovedmappe-forurening og taskkill; P2/P3-volumen (ca. 200 fund) uden prioritering efter brugerværdi; design-Critics der gav subjektive scores på 9 strømme hvor 1 runde var nok.
