# Agent 4 (w14): mærker, kategorier og kørekort — Visual Fidelity Gauntlet

Branch `gauntlet/w14-maerker` (fra fefe1570). Mål: Mærker.png (Yamaha), Sport motorcykler.png (type), Motorcykler til A 2.png (kørekort).
Test: generatorerne er kørt på SYNTETISK lager (308 annoncer) i en kopi udenfor repoet (`%TEMP%\w14\site`); annoncefotos peger via route i testen på sitets egne type-fotos. Produktions-Supabase er ikke rørt; build.js er ikke kørt.

## Acceptkriterier (skrevet FØR arbejdet; målt ved 1440x900 lys, medmindre andet er angivet)
K1  Hero-højde: type-/kørekort-/region-/model-hero (fra headerbund til heroens underkant) højst 360 px; mærkehero højst 380 px (baseline 430-465 px). H1 højst 48 px og på én linje ved 1440, hvor titlen er under 30 tegn.
K2  "Udvalgte ..." overskriften starter højst 760 px fra sidens top på type-, kørekort- og mærkesider (baseline 840-930 px): "Kort fortalt" flyttes ned under annoncerækken.
K3  Annoncekort i "Udvalgte"/mærkerækken: kørekort-, ccm- og hk-chip står på ÉN række (0 kort med to chiprækker, undtagen den lange "Kørekort ikke afgjort"-chip); alle kort i rækken har samme højde.
K4  Typefliser (kørekort, region, budget, mærke): fotofliser i samme format som forsidens (2,1:1, højst 120 px høje), mindst 5 fliser pr. række ved 1440, når der er 5 typer eller flere.
K5  Bundens linkgrupper (relaterede søgninger, region, budget, andre typer, kørekort) står i en 3-kolonne-grid ved 1440 i stedet for 5-6 stablede sektioner; højde under 60 % af baseline.
K6  Søgemodulerne har ikoner i felterne (søg, type, pris, årgang) som billederne, og tallet under knappen = antallet i søgningen (seo-chip-tjek uændret).
K7  Mærkehero: logo-lockup (logo + ordmærke) tydeligt (logo >= 56 px højt), ens opsætning på alle mærker; overskriften står som understreg under lockuppen, ikke som anden stor titel.
K8  Region-/kørekortkolonner på mærkesiden som fliser med tal (som billedets 5 regionsfliser) i stedet for tekstliste.
K9  Ingen regression: 0 vandret overflow (320/390/768/1024/1440, lys+mørk), CLS < 0,05, 0 konsolfejl, tap-mål >= 40 px, kontrast >= 4,5:1, SEO uændret (title/description/canonical/JSON-LD/links), kritisk-CSS-ækvivalens, alle eksisterende tests grønne.
K10 Mobil 390: hero højst 520 px, søgekortets knap synlig over folden på type- og kørekortsider (som før), ingen overlappende elementer.

Beskyttet af ejerens brandvalg (ikke en afvigelse): orange/kobber CTA i stedet for billedernes grønne, ensfarvede logoer, ingen opdigtede tal/forfattere/anmeldelser.

## Måling mod kriterierne (1440x900 lys, syntetisk lager 308 annoncer; før = fefe1570)
| K | Mål | Før | Efter | Dom |
|---|---|---|---|---|
| K1 | hero-højde type/kørekort/region/mærke | 430 / 420 / 430 / 520 px | 377 / 306 / 361 / 382 px | kørekort OK; type, region og mærke 1-17 px over målet (ikke opfyldt, se "tilbage") |
| K1 | h1 | 64 px (mærke 34) | 48 px (mærke 30) | OK |
| K2 | "Udvalgte" fra sidetop | 840-930 px | type 694, region 679, mærke 652, kørekort 770 | OK, kørekort 10 px over (faktarække + søgekort kommer før annoncerne, som på billede 7) |
| K3 | chips på én række | 2 rækker på 4-5. kort | 1 række på alle kort i Udvalgte/mærkerække | OK |
| K4 | typefliser | 4-5 høje fliser (155 px) | fyldte række, 96-100 px høje | OK (7 på række kun med 7+ typer; færre fylder rækken) |
| K5 | linkgrupper | 5-6 stablede sektioner (ca. 640 px) | ét 3-kolonne-gitter (174-349 px) | OK |
| K6 | ikoner i søgefelter | ingen | søg, type, pris, årgang, km | OK |
| K7 | mærkehero-lockup | stablet logo 55-72 px | emblem 72 px + ordmærke 44 px side om side på 14 mærker | OK |
| K8 | region som fliser | tekstliste | fliser med tal, modelfliser med foto | OK |
| K9 | smoke-browser --cls 0.05 --strikt | | 170 målinger (17 sider x 320/390/768/1024/1440 x lys+mørk): 0 fejl, 0 advarsler | OK |
| K10 | mobil 390 | | hero og søgekort som før (set på skærmbillede); 0 overflow | OK |

## Afvigelsesliste (prioriteret: 1 moduler, 2 layout, 3 hierarki, 4 kort, 5 billeder, 6 proportioner, 7 detaljer, 8 interaktion)
Lukket i denne runde:
- (2) Heroer 430-520 px mod billedernes 175-265 px: lavere, h1 48/30 px, kicker mindre, tillidsrække tættere. Udvalgte starter 150-250 px højere op.
- (2) "Kort fortalt" stod mellem søgekort og annoncer (billederne har annoncerne lige efter): flyttet under annoncer/typefliser.
- (4) Annoncekortene havde to chiprækker og tom luft: ét chiprække; kørekort-ikonet udgår kun på smalle kort (container query).
- (4) CTA-panelet bestemte rækkens højde på mærkesider (394 px mod 350 px).
- (4) Søgekort uden ikoner: ikoner i alle felter (mobil: kun i søgefeltet, så "Sport-motorcykler" ikke klippes).
- (5) Typefliser: slanke fotofliser som forsidens/billedets; modelfliser på mærkesiden med annoncefoto.
- (5/7) Mærkehero: logo-lockup emblem + ordmærke (som billedets Yamaha-lockup) i stedet for lille stablet logo.
- (1/2) Bundens 5-6 linksektioner i ét 3-kolonne-gitter (billede 8's "Relaterede søgninger | region"-række).
- (7) Guidekort som miniature + tekst (billedets guiderække); faktatabel på modelsider halveret i højde; "Se alle ...→" faldt ned på næste linje (inline-block fra `main p > a:only-child`); "Harley-Davidson" brød over to linjer på mærkeoversigten.

Tilbage ("ligner ikke endnu", med begrundelse):
- Fuldbleed hero med rytter/landskab (alle tre billeder): sitet har kun ét landskabsfoto og otte studiefotos; ingen licenserede rytterfotos. Typesider viser typens studiefoto frilagt på mørkt spot.
- Mærkelogoer i farver og slogan ("Revs Your Next Ride"): logoerne er ensfarvede (tema/kontrast, ejerens valg), producentslogans kopieres ikke.
- Billedernes tal (3.842 annoncer, 1.248 Yamaha), "Populære" (ingen popularitetsmåling), "Nyeste A2-motorcykler" (ingen oprettelsesdato fra kilderne at sortere ærligt på), kg-chip (vægt ikke i data), undertyper Supersport/Sports-touring (ingen data; erstattet af målbare behov).
- Grøn CTA er brandfarven (bevidst).
- Type-/region-/mærkehero 1-17 px over K1-målet; kørekort "Udvalgte" 10 px over K2-målet.
- Annoncekortets højde (ca. 250-330 px) er stadig højere end billedets (ca. 205 px): kortet er den delte komponent (Agent 2) og er ikke ændret.
- Fotos i testen er de samme otte typefotos, så rækker virker mere ensartede end med rigtige annoncefotos.

## Logo-korrekthed (opslag i min viden om de officielle logoer; ingen filer hentet; ejerens godkendelser og manifestets godkendt-felter er uændrede)
Alle 20 er AI-udkast vektoriseret til ét flade; ingen er officielle filer.
- Passer i hovedtræk: Honda (vinge + versalt serif-ordmærke), Yamaha (stemmegaffel i ring, kondenseret ordmærke), Suzuki (S + ordmærke), BMW (roundel, kun monokrom - de blå/hvide felter vises som aftegning), Kawasaki (K + ordmærke), KTM (kursivt ordmærke), Husqvarna (krone-H), Moto Guzzi (ørn), CFMoto, GasGas, Piaggio, Zero.
- Afviger synligt: Harley-Davidson (bar & shield: tekst og udfyldning forenklet/bølget), Triumph ("H" smelter sammen med understregning), Royal Enfield (kanon-emblemet forenklet), Ducati (skjoldets skrift og svirp tilnærmet), MV Agusta (vinger forenklet), Aprilia (ordmærkets "a" tilnærmet), Indian (indianerhoved/script ulæseligt under ca. 70 px).
- Benelli: hovedfilen er kun et generisk serif-ordmærke; det rigtige logo er løve + eget ordmærke. Det ligner ikke, og et forkert logo er værre end tekst: anbefalet slukket (ejeren har godkendt; ikke ændret af mig).
- Ordmærke-variantsplit (nyt i w14): emblem- og ordmærkefilerne er samme tegning delt i to; ingen ny tegning er tilføjet. Juridisk: gentegnede varemærker bør udskiftes med officielle filer, når de kan skaffes (HD, Honda, Ducati håndhæver aktivt).

## Tests og gate
Ny: `scripts/w14-maerker.test.js` (8 tests, orchestrator føjer til `npm test`). Ændret bevidst: `scripts/w13-logo-kerne.test.js` (areal-reglen for hovedfiler udelader den nye størrelse `wm`, som kun bruges til ordmærke-varianten i hero-lockup). w9/w10-discovery, facet-sider, maerkeside, w13-logo-*, seo-* grønne. `scripts/kritisk-manifest.json` er regenereret fra den syntetiske kopi (familier koerekort/type/region/budget/model/mc); `scripts/w12-kritisk.test.js` kører med fejl på to browsertests, indtil Orchestrator har regenereret de committede sider (inline kritisk CSS i dem er fra før) — også med den gamle manifest fejlede de.

## DELT-ØNSKER (Orchestrator)
1. `scripts/build.js` (regenerér mærke/facet/model-sider med nye skabeloner, CSP-hashes, inline kritisk CSS) og derefter `node --test scripts/w12-kritisk.test.js`.
2. package.json: tilføj `scripts/w14-maerker.test.js`.
3. Nye filer: ingen billeder i repoet ud over dokumentationens; manifestet har nye `varianter.ordmaerke` på 14 mærker (`node scripts/brand-logos-gen.js --tjek` er grøn).

## Gate (npm run gate i worktree uden build)
node --check, synk-header, seo-audit (0 fund), sitemap, døde links og udgiv-tørkørsel: OK. To trin FEJLER af kendte grunde: (7) package.json "test" mangler w14-maerker.test.js (Orchestratorens fil); (2) npm test: kun `w12-kritisk.test.js` browsertests på de committede (ikke regenererede) sider - alt andet grønt.

---
# Iteration 2-3 (efter blind Critic: AFVIS, Yamaha 5/10, Sport 5/10, A2 5,5/10)
Billeder i `agent4-maerker/`: `sbs-y1..y3` (Yamaha), `sbs-t1..t3` (Sport), `sbs-k1..k3` (A2) = mockup | efter, `efter-*-1440`, `efter-*-390` (mobil), `efter-*-moerk` (mørk). `foer-*` er baseline fefe1570.

## Acceptkriterier (iteration 2, skrevet efter Criticens dom, FØR rettelserne)
I1 "Udvalgte"-overskrift højst y=600 ved 1440x900 og første kortrække helt synlig (kort-bund højst ca. 900) på mærke-, type- og regionsider.
I2 Ingen frit stillet motorcykel (sticker) i hero og aldrig et fremmed mærkes motorcykel i et mærkes/models hero.
I3 Ingen to "Udforsk efter behov"-kort med samme foto: ikon i stedet for foto.
I4 CTA-panel lyst. I5 5 + 8 kort (mærke: 5 + 8), "Se alle" som lille link; foto-først i udsnittet. I6 Mobil 390 højst ca. 7.000 px.
I7 Region-/kørekortkolonner uden stort tomt hul; A1/A2/A altid tre fliser. I8 Kort fortalt som bånd (ca. 90 px). I9 CLS < 0,05 ved 3 gentagelser; ingen flaky CLS. I10 Tap-mål >= 40 px, kontrast >= 4,5:1 programmatisk.

## Måling (1440x900 lys, syntetisk lager; før iteration 2 -> nu)
| | Mærke (Yamaha) | Type (Sport) | Kørekort (A2) | Region |
|---|---|---|---|---|
| hero-højde | 382 -> 272 px | 377 -> 254 | 306 -> 214 | 361 -> 242 |
| "Udvalgte" fra top | 652 -> 543 | 694 -> 528 | 770 -> 599 | 679 -> 521 |
| første kortrække helt synlig (kort-bund) | nej -> 873 | nej -> 839 | nej -> 910 | nej -> 832 |
| sidehøjde 1440 | 6104 -> 4179 | 5327 -> 3348 | 5584 -> 3820 | 5766 -> 3479 |
| sidehøjde 390 | 10208 -> 7086 | 10521 -> 6193 | 11147 -> 6915 | |
Kørekort-kortbunden (910 px) er 10 px under folden: faktarække og søgekort kommer før annoncerne (som på billede 7).

## Critic-punkter og status
1. Region-/kørekortboks 500 px med tomt hul: lukket (kolonner `align-items:start`, region-fliser kompakte, A1/A2/A altid tre fliser; A1 uden annoncer er en rolig 0-flise uden link). 2. Hero 380 -> 214-272 px: lukket (overskrift + 2 linjers intro; foldens tekst flyttet under annoncerne; søgekort overlapper mere; "Få besked" i kortets bundlinje). 3. Hero-foto: lukket på det rettelige - mærke-/model-hero er flad med faktapanel (ægte tal) og ingen motorcykel; typesider/kørekort/region bruger landskabsfotoet; cutout/sticker er fjernet. Rytterfoto og en rigtig mærkehero-fotobank er et ASSET-problem (se tilbage). 4. "Udforsk efter behov": ikonkort, intet foto: lukket. 5. CTA-panel lyst: lukket (uden foto - der er intet ærligt rytterfoto). 6. 24 kort -> 5 + 8 (mærke 5 + 8; mobil 5 + 4), "Se alle" lille link: lukket. 7. Fotoløse kort: foto-først i udsnittet (byg og klient samme rækkefølge), kompakt tomt-foto-kort: lukket; ingen annonce skjules i søgning eller noscript. 8. A-Z: placeholder-initialer skjult (kun godkendte logoer i den faste kolonne); H-D-emblemet er stadig lille (sm-slot 22 px): delvist. 9. CLS: se nedenfor. 10. title/H1: bekræftet, se nedenfor.
Desuden: kort i rækkerne har bredere foto og titel + pris på én linje (billedets kortopbygning); `FACET_RESERVE_H` 340 -> 264 (CLS-reservationen strakte kortene); Kort fortalt er et bånd (4 punkter side om side, ca. 90 px); tap-mål >= 40 px; mobil: info-bokse, guides og behovskort som vandrette skinner.

## Verificeret programmatisk (ikke kun set)
- CLS: smoke-browser `--cls 0.05 --strikt` x 3 kørsler, 19 sider x 320/390/768/1024/1440 x lys+mørk = 3 x 180 målinger, 0 fejl, 0 advarsler. Criticens flaky CLS (honda 768 mørk 0,277; cruiser 768 lys 0,143) kunne ikke genskabes (CDP CPU-throttling 4x og 14x, 2-3 gentagelser: 0,000-0,005; største kilde var et felt i søgekortet, der flyttede sig vandret ved skrifttypeskift; rettet med fast knapbredde). Årsagen er sandsynligvis, at hero-fotoet med cutout og højere indhold under hydrering er væk; jeg kan ikke bevise Criticens eksakte årsag.
- Tap-mål: alle synlige a/button/select/summary/kk-labels >= 40 px højt på mærke-, type- og kørekortsider ved 390 og 1440, undtagen header/footer/lagerbanner (andre strømme) og to inline-tekstlinks i brødtekst.
- Kontrast: alle tekstelementer med ensfarvet baggrund >= 4,5:1 (3:1 for stor tekst) på mærke, type, kørekort og oversigt, lys og mørk (tekst på hero-foto/gradient springes over og er hvid på scrim >= .7).
- Tomt lager / lagerfejl (Supabase 500 og `[]`): ved 500 sættes banneret og `data-lager-fejl`, antal dæmpes til "?", panelets pris-/typelinjer skjules (ny regel i p-facet.css/p-maerke.css), 0 overflow, ingen undefined/NaN/null, ingen JS-fejl. Ved 200 med tom liste beholder siden de byggede kort uden banner - uændret adfærd fra tidligere runder (hydreringen rører ikke DOM, når hele lageret er tomt); ikke ændret.
- Hydrering mod mock (308 annoncer): antal 31/116/61 matcher søgekort og søgeresultat; 13 kort bages og hydreres; 0 overflow.
- A-Z-hurtigsøg: "harley" -> 1 (Harley-Davidson), "kawa" -> 1, "xyz" -> 0 + "Ingen mærker matcher", tom -> alle 18, Enter -> maerke-harley-davidson.html; ingen JS-fejl.
- title/description/canonical/JSON-LD/h1: ingen linje i generatordiffen (fefe1570..HEAD) rører titel-, beskrivelse-, canonical-, JSON-LD- eller h1-logik (grep på diffen). Criticens afvigelser på type-sport/koerekort-a1 skyldes tynde syntetiske data (title følger antal), ikke diffen. NB: den syntetiske kopi gav 23 (byg) mod 31 (hydreret) sport-annoncer - byggets fixtures og klient-mocken er ikke ens.

## "Ligner mockuppen": ærlig vurdering (x/10)
- Mærkeside (Yamaha): **6,5/10**. Struktur, sektionsrækkefølge, lockup (emblem + ordmærke), kort-row med CTA, typefliser, Sådan virker og tre kolonner er tæt på; første skærm rummer nu hero, søgekort, tillidsrække og hele kortrækken. Mangler: fuldbleed foto med rytter, farvet logo, kortenes foto/egen mærkefarve, modelfliser med frilagte billeder.
- Typeside (Sport): **6,5/10**. Struktur og densitet matcher billedet; hero med statspanel; "Udforsk efter behov" er ikoner/tal i stedet for undertypefotos (ingen undertypedata). Mangler rytterfoto, billedets frilagte modelbilleder og at kortene er kortere (kortkomponenten er delt).
- Kørekortside (A2): **7/10**. Tættest: faktarække, søgekort, Udvalgte + CTA, typefliser, 3 info-bokse + næste skridt, modeller, guides. Mangler hero-rytter, "Nyeste A2" (ingen oprettelsesdato), 1 af 4 søgefelter (brændstof), og kortrækken er 10 px under folden.
- Samlet: **6,5/10**. De resterende point er assets (rytterfotos, farvede logoer, frilagte modelbilleder, bjerg/vej-illustration) og data (undertyper, popularitet, oprettelsesdato), ikke layout.

## Tilbage (ny liste)
- Asset: rytter-/landskabsfotos til fuldbleed hero, mærkespecifikke heroer uden fremmed motorcykel (nu flad flade), frilagte modelbilleder, bjerg/vej-illustration til den grønne boks, farvede logoer (ejerens ensfarvede valg).
- Data: undertyper (Supersport ...), popularitet, "Nyeste", vægt (kg-chip), brændstoffelt i kørekortsøgningen.
- Mærkebrugerflade: H-D-emblemet i A-Z er 22 px (sm-slot er ejerens logo-system; ikke ændret).
- Mobil: mærkesiderne ligger på ca. 7.100-7.200 px (mål 7.000).
- Ved tomt lager (200 + []) beholdes de byggede kort uden banner - uændret fra før, bør afgøres af ejeren af backend-bridge.

---
# Iteration 3b (efter Critic runde 2: AFVIS, Yamaha 5,0 / Sport 5,5 / A2 6,5)
Lukket: hero igen et foto (mærke/model: landskabsfoto højre ca. 68 %, aldrig fremmed mærke; typesider: typens EGET foto som fuldbleed baggrund, så sport != cruiser; øvrige: landskabsfoto) | CTA-panel med typefoto på typesider og ingen foto-sliver på mærkesider | "Udforsk efter behov" har forskellige dekorative typefotos igen | søgeknap på én linje (kort label, nowrap; placeholder kortere) | ingen 0-fliser (A1 0 Yamaha udgår) | "Kort fortalt" flyttet til bunden | nummercirkel i "Sådan virker" ikke over ikonet | fotoløse kort: typens foto + "Typefoto (illustration)" i stedet for stiplet ramme | Vespa/Lauge Jensen-ordmærke i samme ramme som logoerne (H1 y=202 på alle 18 mærker).
CLS: rækkens skabelon er ens uanset antal bagte kort (årsagen til 0,053-0,059 på små mærkesider: panelet skiftede fra bred bjælke til højre kolonne, når klienten hydrerede 5 kort mod 1-2 bagte). smoke-browser `--cls 0.05 --strikt` på ALLE 18 maerke-*.html + maerker, 5 viewports x lys+mørk, 3 kørsler: 3 x 190 målinger, 0 fejl.
Tal = søgeresultat: årsagen til 61 mod 67 er demo-lageret (`SHOW_DEMO_DATA`, kun på 127.0.0.1/localhost); med det slået fra (som i drift) er mærkeside = søgning for Yamaha 61, Honda 109, Harley 24, Kawasaki 33.
Tomt lager (200 + []): med demo-lageret slået fra som i drift sættes banner og `data-lager-fejl` også her (målt på mærke/type/kørekort; antal dæmpet). Criticens "intet banner" skyldtes demo-lageret på localhost.
Panelrækker skjules nu med `visibility:hidden` (ikke display:none) under lagerfejl, så de ikke flytter layoutet.

IKKE lukket (ærligt):
- CLS på 4 sider i sekventiel smoke (samme browserkontekst, cachet CSS): model-honda-cb-1000-hornet, model-honda-xl-750-transalp, by-roedding ved 320 mørk (0,105-0,126) og mc-honda-adventure ved 768 mørk (0,113). Deterministisk i fuld kørsel (3 af 3), men 0,000 når siden måles alene/koldt, og med 6 parallelle kontekster. Skiftet sker før første rAF (hero ca. 23 px lavere/højere og søgekort ca. 22 px højere); årsagen er ikke fundet. Mærke-, type-, kørekort- og regionsider er rene. Kan være en regression fra min hero-ændring på model-/by-/mc-sider; skal undersøges af den, der kan måle på de rigtige sider efter build.
- Guides og viden på A2, "Det skal du vide" findes i markup under annoncerne (ikke under folden på første skærm); "Nyeste A2" er udeladt (ingen oprettelsesdato).
- Rytterfoto, farvede logoer, frilagte modelbilleder: assets.
- Typesidens "Udforsk typer" med Supersport o.l.: ingen undertypedata; erstattet af behovskort med foto.
- Tomt-lager-banner kun med demo-lager slået fra; ændret ikke i backend-bridge.

Ligner mockuppen (ærligt): Yamaha 6/10, Sport 6,5/10, A2 7/10, samlet 6,5/10 (Critic: 5,0 / 5,5 / 6,5).
