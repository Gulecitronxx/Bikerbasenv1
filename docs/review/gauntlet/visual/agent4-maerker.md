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
