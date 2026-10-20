# V4 QA - verificerede fund (fase 1, pr. 95df5046, live-data 720 annoncer / 30 mærkenavne)

Bevis: `node scripts/v4-maerke-dakning.js --data live --snapshot <fil>` (viewport 1440, lys). Ejer = hvem der bør rette.

| # | Niveau | Fund | Bevis | Forslag | Ejer |
|---|---|---|---|---|---|
| F1 | fejl | opret-annonce kan ikke vælge 5 mærker, der har annoncer: Lauge Jensen, Bach, CFMoto, FB Mondial, Rewaco | `#f-brand` har 60 værdier = `Object.keys(BRANDS_BY_MODEL)` (js/opret-annonce.js:322). Øvrige 59 registermærker findes | Byg #f-brand ud fra registret (alle relevante mærker, også uden annoncer); modelfeltet er fri tekst, så tom modelliste er ikke et problem | Agent 1 (register/data.js) |
| F2 | advarsel | 10 registeraliasser virker ikke i fritekst: "bmw motorrad", "triumph motorcycles", "ktm ag", "ducati motor holding", "husqvarna motorcycles", "indian motorcycle(s)", "victory motorcycles", "sanyang" (SYM), "piaggio group" | Filtrering.anvendFiltre([{brand:'BMW',model:'Testmodel 700'}],{q:'bmw motorrad'}) = 0 træf; filtrering.js matcher kun ord i mærke+model (+ alias hd) | Lad soegeOrd udvide med registeraliasser (alias -> mærkenøgle) før ord-matchning. Kerne-aliasser (cf moto, harley, hd, zero, mv agusta) virker allerede | Agent 4 (søgning) / Agent 1 |
| F3 | advarsel | Zero: slug "zero" men navn "Zero Motorcycles" (slugify = zero-motorcycles) | register-tjek slug-afviger-fra-navn | Afgør kanonisk side-URL (maerke-zero.html eller -zero-motorcycles) FØR en side oprettes; ingen tom indekserbar side | Agent 1 |
| F4 | info | "Ukendt" er en række i mærkefilteret (2 af 720 annoncer) | filter-viser-ukendt | Bevidst valg; ikke et mærke, bør ikke ligne et | Agent 4 |
| F5 | info | Registermærker uden annoncer (fx Zero) har ingen række på maerker.html, så "zero" kan ikke findes i hurtigsøgningen dér | kernemaerke-uden-oversigtsraekke | Kun relevant hvis oversigten skal vise mærker uden lager; ellers fint | Agent 1 |

## Hvad der VIRKER (verificeret)
- Alle 29 lagermærker med side: valg i #so-brand og afkrydsning giver præcis lagerets antal; mærkeside, A-Z-række og statisk HTML har samme tal (0 drift).
- Logo/slug/fil/hash/alt: 0 fund; generated brand-logos-data i synk; ingen dublet-slugs, -sider, -stavemåder, sitemap-dubletter; alle mærkesider uden konsolfejl/404; ingen tom indekserbar side.
- Kerne-aliasser (cf moto/CFMOTO, harley/Harley-Davidson/hd, zero/Zero Motorcycles, mv agusta) virker i fritekst og i hurtigsøgningen.
- Ingen skrivning mod Supabase forsøgt (0 afviste).

## Baseline
720 annonce-id -> mærke gemt i `docs/review/gauntlet/v4/qa/maerke-baseline-live.json`. Live-lager ændres af crawleren: forsvundne/nye id'er er info; skiftet mærke er fejl.

## Note til Agent 2 (annoncesider) - mobil-CTA "Vis nummer" lover noget, der måske ikke findes
Ejer: Agent 2 (js/annonce.js, annonce.html, scripts/build-listing-pages.js). Ikke rettet af QA.

Bevis (kode, ingen browserkørsel):
- js/annonce.js:1548-1551: bjælken `#listing-actionbar` (knap `#bar-phone` "Vis nummer", annonce.html:170) fjernes kun hvis `loggedIn && !harNummer`. For en UDLOGGET besøgende vises den altid på egne (database-)annoncer.
- js/annonce.js:1355 `telefonMulig = !telefon && isUuid(id) && db.enabled`: er altså sand for HVER database-annonce, uanset om sælgeren har slået nummeret til. Nummeret ligger aldrig i payloaden (kun RPC `hent_saelger_telefon`).
- Klik som udlogget: `spring('reveal-phone-btn')` finder ingen knap og sender til `login.html?redirect=...` (js/annonce.js:1567-1572). Efter login klikker næste "Vis telefonnummer" på RPC'en; er svaret tomt (intet nummer / intet samtykke) kalder `telefonAfvist()` (linje 262) og fjerner knappen + bjælken. Resultat: CTA'en er trykket på, brugeren er tvunget gennem login, og svaret er "vises ikke".
- Hvis sælgeren har et nummer i objektet (demo/lokale) virker knappen; for produktion (kun UUID-annoncer) afhænger det helt af RPC'en.

Forslag (vælg én, Agent 2 beslutter): (a) vis bjælken kun, når man ved, at et nummer findes (fx lad RPC'en/public_profiles udstille et boolsk felt `telefon_vises`, aldrig selve nummeret); (b) ellers omdøb CTA'en til noget, der er sandt uden login ("Se sælger" / "Kontakt via annoncen") og lad nummer-forespørgslen vente til efter login; (c) som minimum: udlogget tryk skal sige hvad der sker ("Log ind for at se, om sælgeren viser nummer"), ikke love et nummer. Tilføj en test: udlogget annonce uden nummer må ikke have en primær "Vis nummer"-knap.

## Opdatering efter Agent 1's register (gauntlet/master 7602a258) - runner mod frisk build
Runneren læser nu `js/brands-registry.js` (`alle()` 93 mærker, `valgbare()`), logofil/hash fra manifestet via registrets logo-nøgle. Kørt mod en KOPI af roden bygget frisk med `node scripts/build.js` (kopi i scratch, repoets HTML urørt), live-data (720 annoncer, 31 mærkenavne, 30 mærkesider), baseline = 95df5046. 0 Supabase-skrivninger afvist. ~90 s.

Regler i runneren er opdateret: mærker uden side kræver ikke link (piller i "Flere mærker" må IKKE være links og ikke have side); alle 93 registermærker skal kunne vælges i opret-annonce (også uden annoncer); ALLE registeraliasser (ikke kun kerne) skal virke i fritekst; hvert registermærke står præcis ét sted på maerker.html (A-Z-række eller pille; 30 + 63 = 93); sidens filnavn følger registrets slug.

| Fund fra før | Status |
|---|---|
| F1 opret-annonce mangler 5 mærker | LØST: #f-brand = valgbare() = 93, alle valgbare, 0 mangler |
| F3 Zero slug | LØST: slug = zero (= slugify(Zero)) |
| F2 aliasser i fritekst | ÅBEN, forværret af de nye aliasser: 33 af registrets aliasser finder ikke deres mærke (se nedenfor) |
| F4 "Ukendt" i filteret | Uændret (1 annonce); info |

### Nye/åbne fund
| # | Niveau | Fund | Bevis | Forslag | Ejer |
|---|---|---|---|---|---|
| G1 | fejl | 33 registeraliasser virker ikke i fritekst: honda motor, bmw motorrad, ducati motor holding, ktm ag, triumph motorcycles, husqvarna motorcycles, piaggio group, fantic motor, peugeot motocycles/scooters, montesa honda, jawa moto, brixton motorcycles, imz-ural, imz ural, harley-davidson motor company, indian motorcycle(s), zero motorcycles/motorcycle, brp can-am, victory motorcycles, royal enfield motors, norton motorcycles, vincent hrd, cfmotor, sanyang, mash motorcycles, loncin voge, kove moto, tvs motor, daelim motor, zuendapp | `Filtrering.anvendFiltre([{brand:'Zero',model:'Testmodel 700'}],{q:'zero motorcycles'})` = 0. js/filtrering.js:171-182 matcher hvert ord i mærke+model; kun `hd` er alias (SOEGE_ALIAS). Kerne-aliasser (cf moto, harley, hd, mv agusta, zero) virker, fordi ordene tilfældigvis står i navnet | Før ord-matchning: find længste ord-præfiks (3,2,1 ord) i q med `BrandRegistry.find()` og erstat præfikset med det kanoniske navn; ellers behold ordene | Agent 4 (js/filtrering.js) |
| G2 | advarsel | 25 registeraliasser er ukendte for BrandLogos (`normaliser("honda motor")` = honda-motor, ikke honda); logoet findes via kanonisk navn, så kun synligt hvis et rå navn når logo-laget uden `BrandRegistry.kanonisk()` først | scripts/v4-maerke-dakning.js logo-alias; js/brand-logos-data.js (genereret af scripts/brand-logos-gen.js fra manifestet) kender kun manifestets aliasser | Lad brand-logos-gen tage aliasser fra registret, eller kald `kanonisk()` før `logoFor()` overalt | Agent 1 |
| G3 | advarsel | 6 registeraliasser mangler i `data-mk-soeg` på maerker.html (hurtigsøgningen finder dem ikke): cfmotor (CFMoto), fantic motor, mondial (FB Mondial), harley-davidson motor company, honda motor, royal enfield motors | oversigt-alias-mangler; række-aliaser skrives fra manifestet, ikke registret | Skriv `data-mk-soeg` fra `BrandRegistry.alle()[].aliaser` | Agent 1 |
| G4 | advarsel | 1 annonce (92279869-cd00-49db-83c9-3aa22e0e8443) er gået fra "Ukendt" til DKW (ny registerpost, ny noindex-side) | baseline-sammenligning, annonce-fik-maerke | Ikke en regression (mærket er bevidst oprettet), men skal valideres: stammer DKW fra titel/deeplink eller kilde-felt? Mærker må ikke oprettes ud fra modelnavn/parserfejl | Agent 1 |
| G5 | info | Regressionstjek: 719 af 720 annoncer har samme mærke som før V4; 0 skiftet, 0 mistet til Ukendt, 0 stavningsændringer | maerke-baseline-live.json | - | - |

### Hvad der virker (verificeret mod frisk build)
- 30 mærkesider: valg i #so-brand og afkrydsning giver præcis lagerets antal; mærkeside, A-Z-række og statisk HTML har samme tal (0 drift); 0 konsolfejl/404; ingen tom indekserbar side; ingen dubletter (slug/navn/alias/stavning/sider/sitemap).
- 63 "Flere mærker"-piller: ingen links, ingen sider, ingen annoncer, korrekte tal (63/22 historiske), hver registermærke står præcis ét sted, sum 93.
- 93/93 mærker valgbare i opret-annonce; ingen ekstra mærker i #f-brand; valg uden fejl.
- Logo/slug/fil/hash/navn: 0 fejl (Zero logo-nøgle zero, QJMotor -> qj-motor osv.).

### Test
`scripts/v4-maerke-dakning.test.js` (7 tests, grønne): tilføj til package.json "test". Kendte åbne fund står i `scripts/v4-maerke-dakning.kendt.json` (G1-G3); retter Agent 1/4 dem, skrumper listen (kør `--skriv-kendt` kun til at tilføje; slet nøgler manuelt, når de er løst).
