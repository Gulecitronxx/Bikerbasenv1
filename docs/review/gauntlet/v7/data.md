# V7 Agent 2 — Datakvalitet, annoncernes friskhed og markedsintelligens

Worktree `wt/v7-data`, branch `gauntlet/v7-data` (ingen push). Målt mod produktionens offentlige data (GET, som buildet gør) den 26.10.2026; intet er skrevet til produktion, ingen migration er kørt, crawleren er ikke kørt. Aggregator-reglerne 1-6 i CLAUDE.md er uændrede (se "Regel 1-6" nederst).

Screenshots før/efter: `docs/review/gauntlet/v7/data/` (`foer-*.jpg` = commit e7232df3, `efter-*.jpg` = denne branch; 375/430/768/1440/1920, lys og mørk).

---

## 0. Kort fortalt (før → efter)

| Mål | Før | Efter |
|---|---|---|
| Annoncer sidst bekræftet for over 60 dage siden | 332 af 735 (45 %), stod som "aktive" uden advarsel | uændret i databasen (kræver en crawler-kørsel, se aktivering), men **alle 332 siger nu selv "Bekræftet for 63-71 dage siden — kan være solgt, tjek hos kilden"** på kort og annonceside og er nedtonet i "Blandet" |
| Forsidens friskhedstekst | "De fleste annoncer er bekræftet senest 17. okt." (medianen skjulte, at 45 % var over 60 dage) | "403 bekræftet inden for 14 dage (senest 17. okt.), 332 kan være solgt" |
| Annoncer uden motorcykeltype | 366 af 737 (49,7 %) | **99 (13,4 %)**: 267 afledt af mærke + model, præcision 96,8 % mod kildens egne typer, håndkontrol 50/50 |
| "Lignende motorcykler": anbefalinger af en anden type (og ikke samme model) | 342 af 4.375 viste kort (7,8 %) | **0 af 4.054** |
| BMW R45 (privat, classic, 1979, 24.000 kr.) fik | Honda Café Racer, Suzuki Intruder, Kawasaki ZZR 600, Yamaha Diversion, Honda CBR 600 F, BMW K 100 | Yamaha XS 650 (classic, 1973) — og overskriften "Andre classic/veteran-motorcykler: kun én er lignende nok" |

Nye testfiler (tilføj dem til `package.json` "test" — jeg har ikke rørt listen):

- `crawler/livscyklus.test.js` (20 tests)
- `js/v7-data-livscyklus.test.js` (18)
- `scripts/type-klassificering.test.js` (17)
- `js/v7-data-lignende.test.js` (26)
- `scripts/maal-aktualitet.test.js` (3)

---

## A. Aktualitet og livscyklus

### A.1 Hvad der var galt (målt)

`scripts/maal-aktualitet.js` på snapshot 26.10.2026 (`node scripts/maal-aktualitet.js --live` gentager målingen):

```
Alder i dage:   p0=9,4  p25=9,4  p50=9,4  p75=63,1  p90=67,1  p95=67,9  max=71,4
Fordeling:      0-7 d: 0 · 7-14 d: 403 · 14-30 d: 0 · 30-60 d: 0 · 60-90 d: 332
Pr. kilde:      mcsyd.dk        413 stk, median  9,4 d, ældste 71,4 d,  17 % over 14 d
                guloggratis.dk  220 stk, median 63,1 d, ældste 67,9 d,  73 % over 14 d
                rydbergsmc.dk    74 stk, median 67,1 d,                100 % over 14 d (seneste kørsel 24.08.)
                jensensmc.dk     28 stk, median 63,1 d,                100 % over 14 d (seneste kørsel 24.08.)
```

Fordelingen er todelt (ingen annoncer mellem 14 og 60 dage): crawleren kørte 16.-24. august for alle fire kilder og igen **17. oktober kun for MC Syd og Gul og Gratis**. Rydbergs og Jensens er ikke crawlet siden august. Og af Gul og Gratis' 220 aktive blev kun 59 set 17. oktober; af MC Syds 413 blev 344 set. De resterende er enten solgt eller flyttet, men står som aktive.

**Hvorfor registreres de ikke som væk?** Jeg har gennemgået `crawler/` og migration 014/015:

1. `eksterne_annoncer.sidst_set` opdateres kun, når annoncen står i kildens liste (`skrivAnnoncer` i `crawler/db.js`). Det er den eneste "bekræftelse".
2. `markerBorte()` sætter først `status='borte'`, når annoncen har manglet i **tre afsluttede kørsler** efter en komplet kørsel. Med to måneders mellemrum mellem kørslerne nås tre aldrig; med tre kørsler på én time ville en annonce forsvinde på en time.
3. Værnet (`bortemarkeringVurdering`, 60 % af referencen) holder i øvrigt tilbage, når en kørsel finder markant færre end sidst. Gul og Gratis 220 → 59 er under 60 %: værnet er rigtigt, men resultatet er, at de ~161 forsvundne står der for evigt.
4. **Døde links registreres ikke.** I detaljetrinet tælles 404/410 (`tal.ikke_fundet`), men kun til loggen; ingenting skrives på annoncen. 404/410 stopper desuden kun kørslen ved 25 i træk.
5. **"Solgt" registreres ikke.** `crawler/normalize.js` trækker "SOLGT"/"RESERVERET" ud af titlen som salgsmarkør (`salgsmarkoerer`), men markøren bliver aldrig til noget andet end en chip. `status='solgt'` bruges kun af ejerens egen rettelse.
6. Frontenden kendte kun `sidst_set` som dato: annoncesiden skrev "sidst bekræftet for 63 dage siden" som en grå 12 px-linje i sælgerkortet; kort, søgning og forside sagde intet. Forside/søgning brugte **medianen** (`senesteBekraeftet`): "De fleste annoncer er bekræftet senest 17. okt." stod over et lager, hvor 45 % var over 60 dage gammelt.

Gamle annoncer påvirkede altså søgning (rangeret på lige fod, `Blandet` kendte ikke alder), antal (alle 735 tæller) og forsidetekster (medianen). Annoncen "Honda CB 1000 R 2022" hos Jensens var "sidst bekræftet for 63 dage siden", fordi Jensens ikke er crawlet siden 24. august.

### A.2 Livscyklussen

Fem tilstande, **afledt ved læsning** (aldrig gemt: alder går af sig selv, og en kolonne, der kun opdateres når crawleren kører, ville stå som "bekræftet" præcis når crawleren ikke kører):

| Tilstand | Betingelse | Hvad brugeren ser |
|---|---|---|
| `aktiv_bekraeftet` | sidst set højst 14 dage siden, ingen væk-/tekniske signaler | intet (frisk) |
| `aktiv_forsinket` | 15-90 dage siden sidst set | kort: "Bekræftet for N dage siden"; annonceside: note under prisen: 15-30 d "Tjek hos kilden, at den stadig er til salg"; over 30 d "Den kan være solgt — tjek hos kilden" |
| `midlertidigt_utilgaengelig` | har et væk-signal (endnu ikke N/T) eller en teknisk fejl på seneste forsøg (kolonner fra migration 030) | som forsinket + "Vi kunne ikke tjekke den ved seneste forsøg" |
| `ikke_laengere_aktiv` | `status='borte'` (N bekræftede væk-signaler over mindst T dage) | skjult fra søgning/antal (RLS: `status not in ('borte','udloebet')`) |
| `slettet_udloebet` | `status='udloebet'`: over 90 dage uden en eneste bekræftelse | skjult; rækken slettes aldrig, og annoncen bliver `aktiv` igen, når kilden ses næste gang |

**Reglen om tekniske fejl.** En midlertidig teknisk fejl (timeout, 5xx, netværksfejl, 401/403/429/451, robots.txt-spærring, afbrudt eller ufuldstændig kørsel, et værn der holder en markering tilbage) gør **aldrig alene** en annonce solgt eller inaktiv. Det er konstruktionen i `crawler/livscyklus.js`, ikke en tærskel: et signal er enten

- `findes` (annoncen stod i listen) — nulstiller alt,
- `vaek` — **kilden** sagde, at den er væk: HTTP 404/410 på annoncens egen side, en "SOLGT"-markør i kildens egen titel, eller at den manglede i en **komplet** kørsel, hvis fund holdt værnet,
- `teknisk` — vi kunne ikke se efter. Tæller i `teknisk_fejl_i_traek`, rører **aldrig** `vaek_i_traek`, og kun `vaek` kan føre til `borte`.

`borte` kræver **N = 3** på hinanden følgende bekræftede væk-signaler (ét pr. kørsel) fordelt over mindst **T = 7 dage** (første signal → nu). Tre signaler samme dag er ét hikke. Et `findes` mellem to væk-signaler nulstiller; en teknisk fejl mellem dem hverken nulstiller eller tæller (samme princip som afvisningsvagten i `pipeline.js`). Annoncer, vi så for under 14 dage siden, markeres ikke "utilgængelig" af én fejlet kørsel. Udløb (90 d) har et værn: ville mere end halvdelen af de aktive udløbe på én gang, er det crawleren, der har stået stille, og der sker ingenting (loggen siger det).

Delvise kørsler med vilje (`--limit`, `--maks-sider`) sender ingen signaler. En annonces egen 404/410 tæller som væk selv i en ufuldstændig kørsel (den er et svar om netop den annonce), og den annonce skrives ikke som "set".

### A.3 Hvad der er skrevet (kildekode)

| Fil | Indhold |
|---|---|
| `crawler/livscyklus.js` (ny) | Rene funktioner `klassificerSignal`, `anvendSignal`, `vurderLivscyklus`, `fjernedeFraMarkoerer` + databaselaget `opdaterLivscyklus`, `udloebGamle` (tager en klient ind; ingen netværk). Flag `BB_LIVSCYKLUS=1`, **fra som standard**. |
| `crawler/pipeline.js` | Ved flag: 404/410 og "SOLGT" i detaljetrin/liste → `fjernede` (skrives ikke som set); teknisk/ufuldstændig/afbrudt/robots-spærring → teknisk signal; `markerBorte()` erstattes af `opdaterLivscyklus()` + `udloebGamle()`. Uden flag: præcis som før. |
| `crawler/db.js` | `skrivAnnoncer(..., { livscyklus })` nulstiller de fem nye kolonner på annoncer, crawleren ser. Uden flag skrives de ikke (en kolonne, der ikke findes, vælter hele kørslen — se KOLONNER-noten). |
| `supabase/030_livscyklus.sql` (ny, **ikke kørt**) | 5 kolonner (`sidst_forsoegt`, `vaek_i_traek`, `foerste_vaek_signal`, `teknisk_fejl_i_traek`, `sidste_signal`), status udvidet med `udloebet`, RLS-politikken udvidet, SQL-funktionen `livscyklus_tilstand()` og den interne visning `livscyklus_oversigt` (kun service_role). |
| `js/data.js` | `LIVSCYKLUS` (14/30/90), `annonceAlder()`, `livscyklusTilstand()`, `friskhedsFordeling()`, ny `senesteBekraeftet().samlet/.kort/.detalje`. |
| `js/components.js` + `css/styles.css` | Kortmærkat over fotoet ("Bekræftet for 63 dage siden"; "63 dage siden" på kort under 240 px). Flytter intet i kortets højde (ligger over fotoet). |
| `js/annonce.js` + `css/p-annonce.css` | Note under prisen på annoncesiden (ikke i sælgerkortet: den kolonne er den højeste, og kolonnebalancen kan ikke flytte noget derfra). |
| `js/sortering.js`, `js/search.js`, `soegning.html` | "Blandet": forsinkede nedtones, skjules aldrig (se A.4). Ny sortering **Senest bekræftet** (nyeste dag først, ens dage ordnet som Blandet, uden dato bagest). |
| `js/home.js`, `js/search.js`, `scripts/build-brand-pages.js`, `scripts/build-facet-pages.js` | Tekster, der ikke taler som om gamle annoncer er friske (forside, søgesidens friskhedslinje, mærke-/facetsiders "Senest bekræftet …"). Datoen står stadig i formen "Senest bekræftet hos kilderne <dato>", så `scripts/seo-vagt.js` stadig kan skære den ud af indholdshashen (sitemap-lastmod flytter ikke ved hver crawl). |
| `js/backend-bridge.js`, `js/supabase-config.js` | `SUPABASE_CONFIG.livscyklus` (default `false`): først når ejeren har kørt migrationen og sat flaget, bestiller sitet de fire kolonner. |
| `scripts/maal-aktualitet.js` (ny) | Percentiler, fordeling, pr. kilde, tilstande. |

### A.4 Søgerangering: nedtone, ikke skjul

I "Blandet" trækkes fra oplystheden: inden for 14 dage 0, op til 30 dage −2, over 30 dage −4 (en fuldt oplyst 11-pointer over 30 dage står som en 7-pointer). Alderen regnes **mod listens egen nyeste bekræftelse, ikke mod "nu"**: `scripts/build-srp.js` forudtegner første side ved build, og browseren sorterer igen ved indlæsning; havde begge regnet mod nu, ville en annonce, der passerer en grænse mellem de to, hoppe (den CLS, B4 flyttede sorteringen for at undgå). Test: samme data, alle datoer rykket 30 dage frem → samme rækkefølge. Antal og filtre er uændrede (testet: intet falder ud).

### A.5 Aktivering (ejerskridt — jeg har ikke gjort noget af dette)

1. **Frontend-delen virker allerede uden noget**: alder regnes af `sidst_set`, som findes i dag.
2. **Migration**: kør `supabase/030_livscyklus.sql` (Supabase SQL editor eller MCP). Den er idempotent (`if not exists`/`drop … if exists`). Tjek bagefter: `select * from public.livscyklus_oversigt order by domaene, tilstand;`
3. **Slå frontendens kolonner til**: sæt `livscyklus: true` i `js/supabase-config.js` (først EFTER trin 2, ellers 42703 og alle annoncer forsvinder). Byg og deploy.
4. **Crawler**: sæt `BB_LIVSCYKLUS=1` i den shell, kørslen startes fra (sammen med `SUPABASE_SERVICE_ROLE_KEY`), og kør `node crawler/run.js --alle` — **også Rydbergs og Jensens, der ikke er crawlet siden august**. Første kørsel nulstiller alt, der ses; usete annoncer får første væk-signal; ingen bliver `borte` før tredje kørsel mindst syv dage senere. Kør derefter fx ugentligt.
5. Mål før/efter: `node scripts/maal-aktualitet.js --live`.
6. Migrationsnummer: jeg har valgt 030, fordi andre V7-agenter kan tage 025+. Omdøb ved merge, hvis det passer bedre — filen refererer ikke til sit eget nummer.

### A.6 Test

`crawler/livscyklus.test.js`: tekniske fejl (alle koder, hundrede gange over et år) giver aldrig `borte`; tre væk-signaler samme dag giver ikke, tre over 7 dage gør; `findes` nulstiller; en timeout mellem to 404 hverken nulstiller eller tæller; tre komplette kørsler over en uge → `borte`, ti tekniske kørsler → ingen `borte`; værnet (10 fund af 100) og nul fund giver ingen væk-signal; ejerens manuelle status røres ikke; udløb + værn; 404/410 fra detaljesiden er `fjernet`, 503/timeout er det ikke; `skrivAnnoncer` skriver ingen af de nye kolonner uden flag; tærsklerne er ens i crawler, SQL og `js/data.js`.

---

## B. Klassificering af motorcykeltype

### B.1 Målt

366 af 737 annoncer (49,7 %) havde ingen type (ejerens tal: 349 af 720). Kilderne oplyser ikke typen, og titlen har intet kategoriord ("Honda GL 1800 Gold Wing", "Honda CB 1000 R"). Det er sitets hyppigste tomme felt og betyder, at typefilteret og type-siderne tæller under halvdelen af lageret.

### B.2 Regeltabellen

`data/model-typer.json` (kilden, 393 regler, hver med en begrundelse) → `node scripts/type-klassificering.js --generer` kopierer den ind i `js/data.js` mellem `@@TYPETABEL-START/-END` (samme mønster som mærkeregistret; `--tjek` og en test fanger en kopi, der er ude af trit). Motoren `afledtTypeFor(mærke, model, titel, årgang)` er den eneste implementering — scriptet og testene bruger samme kode.

Principper (stå i filen):

- Normaliseret modelnavn (a-z0-9, accenter væk); et mønster er et præfiks (`gl1800`), `~` foran betyder "indeholder" (`~africatwin`); slutter mønstret på et ciffer, må næste tegn ikke være et ciffer (`cb500` rammer ikke `cb5000`).
- Det længste mønster vinder (`cb500x` adventure slår `cb500` naked); `type null` **blokerer** (`fxlrst` Low Rider ST mellem cruiserne).
- **Tvivl er ikke med.** Modeller, forhandler og fabrik klassificerer forskelligt, står ikke i tabellen: CBR 650 R, Hayabusa, Bandit, Versys, Diversion, ZZR, Road King, Thruxton, GL 1100, CL 500, CBF, XV 1000 TR1, XVZ. De forbliver Ukendt.
- Årsafhængige modeller har årgangsgrænser (Z650 fra 2017: en 1979-Z650 er en klassiker; Trident fra 1991; Gold Wing fra 1984). Ukendt årgang springer en regel med grænse over.
- "Sportstouring" er touring (som i kildens eget ordforråd i `MCSYD_KATEGORI`).

### B.3 Resultat

| Type | Kilde-oplyst + titel (før) | Afledt (nyt) | Efter |
|---|---:|---:|---:|
| touring | 90 | +62 | 152 |
| cruiser | 112 | +66 | 178 |
| naked | 60 | +40 | 100 |
| adventure | 76 | +44 | 120 |
| sport | 23 | +20 | 43 |
| classic | 5 | +20 | 25 |
| cross | 3 | +8 | 11 |
| scooter | 0 | +7 | 7 |
| **Ukendt** | **366** | | **99** |

(Tallene er fra de 735 indekserede; to egne annoncer har allerede type.)

**Præcision, to uafhængige mål:**

1. **Mod kildens egne typer** (`node scripts/type-klassificering.js --maal <snapshot>`): reglerne køres på de annoncer, kilden selv har typet, uden at se kildens type. De rammer 279; 270 er enige = **96,8 %**. De 9 uenige er forklaret: 8× Harley Electra Glide (MC Syds titler siger "… Cruiser"; Harley og `TYPE_FOR_MODELNAVN` i `js/data.js` siger Touring) og 1× KTM 1290 Super Duke GT, som forhandleren kalder "Offroader". Uden de to forklarede grupper: 270 af 270. Fixturen (`scripts/fixtures/type-kilde-typede.json`, 369 rækker) gør målingen til en test uden netværk (krav: ≥ 95 %).
2. **Håndkontrol af 50 tilfældige afledte** (fast frø 20261026, `scripts/fixtures/type-stikproeve.json`): **50/50 korrekte** ud fra producentens egen modelserie. CBR 1000 F og CBR 1100 XX er grænsetilfælde (sportstourere → touring, som forhandlerens eget "Sportstouring"). Vurderingen er min som builder; Critic bør efterkontrollere en ny stikprøve (`--stikproeve <snapshot> 50`).

### B.4 Visning og tal

Kildens egen type vinder altid. Er typen afledt, bærer annoncen `typeAfledt: true` og `typeRegel`; annoncesidens faktatabel skriver "Naked (afledt fra model)" med forklaring i tooltip, og kortets typeord har samme tooltip. Intet skrives til databasen (CLAUDE.md regel 2 uberørt).

Filter, kort, mærke-/type-/region-sider og forside bruger alle `l.type` fra `normalizeExternalListing`, så tallene følger med af sig selv; testen låser, at hver typetælling = filterets træf, og at typerne + uoplyste = hele lageret. **Bemærk til Orchestrator:** typeafledningen flytter byggeoutput. Efter build har bl.a. `type-sport` 43 (før 23), `type-touring` 150, `type-cruiser` 172, `type-naked` 100, `type-adventure` 115, `type-classic` 26, `type-cross` 11 (nu over tærsklen 10), og tre nye indekserbare brand+type-sider opstår (`mc-honda-sport`, `mc-suzuki-cruiser`, `mc-yamaha-cruiser`) — de bygges af generatoren, jeg har ikke committet genereret HTML.

---

## C. Lignende motorcykler

### C.1 Hvad der var galt

`anLignende()` gav point for mærke (2), model (3), pris ±40 % (3), kubik ±35 % (2), årgang ±6 (1) og type (2), og alt fra **4 point** kom med. Mærke + pris + kubik gav 8 point uden at typen eller modellen havde noget med hinanden at gøre. BMW R45 (classic, 1979, 450 ccm, 24.000 kr.) fik Honda Café Racer 1979, Suzuki Intruder 1994, Yamaha Diversion 2000, Kawasaki ZZR 600 1993, Honda CBR 600 F 1993 og BMW K 100 1988: alle i samme pris- og kubikklasse, ingen en klassiker. 726 af 737 annoncer fik altid seks kort, uanset om de var lignende.

### C.2 Score-tabel (`LIGNENDE.VAEGTE` i `js/annonce.js`)

| Signal | Point | Bemærkning |
|---|---:|---|
| Samme model | 40 | mærke + modelnøgle ens (eller præfiks ≥ 6 tegn og samme type); gælder ikke på tværs af >20 års forskel |
| Samme mærke **og** type | 26 | |
| Samme type (andet mærke) | 14 | |
| Samme mærke (anden type) | 2 | er **målets** type ukendt: 12 i stedet |
| Samme modelserie | 6 | bogstaverne før første ciffer: R 45 → R 1200 R, CB 500 → CB 1000 R (boxer-/CB-/Gold Wing-slægtskab), kun med samme mærke |
| Samme kørekortklasse | 4 | begge kendte |
| Prisniveau ±30 % | 5 | |
| Årgang ±3 / ±8 år | 4 / 2 | |
| Motorstørrelse ±35 % | 3 | |
| Mere end 20 års forskel på årgang | −8 | en 1979'er og en 2025'er hører ikke sammen |
| Samme region | 1 | tie-break |
| Har foto | 0,4 | tie-break efter region |

Hierarkiet er testet: model > mærke+type > type > mærke; mærke+type (26) slår type+kørekort+pris (23). **Gulv: 20.** Type alene (14) rækker ikke; alle støttepoint tilsammen er 17,4, og samme mærke med anden type lægger 2 til = 19,4 — **intet kan nå gulvet uden en model- eller typeforbindelse** (undtagen ukendt måltype). Det er hele rettelsen. **Mangfoldighed:** højst 2 af samme model, højst 2 pr. kilde/annoncør (kildens domæne; egne annoncer = sælgeren), højst 6, identiske dubletter (mærke, model, årgang, pris, km) kun én gang. Ved lige score: annonce-id (deterministisk).

(Jeg har tolket "maks. 2 fra samme kilde/annoncør-sammenfald" som højst 2 fra samme kilde. Det gør stribens længde afhængig af, hvor mange kilder der har noget relevant; det er bevidst "hellere færre".)

### C.3 Ærlig overskrift

Alle samme model: "Flere Honda CMX 500 Rebel". Model + type: "Honda CB 1000 R og andre naked-motorcykler". Kun type: "Andre classic/veteran-motorcykler" (scooter hedder "scootere"). Ellers "Lignende motorcykler". Under linjen står grundlaget ("Samme type (Classic/Veteran), rangeret efter pris (±30 %), årgang (±8 år) og motorstørrelse (±35 %)") og, hvis der er under seks, "Kun N er lignende nok — vi viser hellere få end irrelevante." "Se alle …"-linket peger på typen, ikke på mærket.

### C.4 Eksempler (produktionsdata 26.10.2026, `scripts/` harness)

```
Honda CB 1000 R 2024 (naked, 199.995 kr.)  → "Honda CB 1000 R og andre naked-motorcykler"
   83,4 Honda CB 1000 2025         samme model, mærke+type, kørekort A, pris ±30 %, årgang ±3, ccm ±35 %, samme region
   79,4 Honda CB 1000 R 2024       samme model, …
   77,4 Honda CB 1000 R 2022       samme model, …                         (Jensens: 2 pr. kilde)
   43,4 Honda CB 750 Hornet …      samme mærke og type, samme modelserie, kørekort A, årgang ±3, ccm ±35 %
   43,4 Honda CB 650 RC … / CB 1000 Hornet …
Yamaha YZF R7 → "Andre sport-motorcykler": YZF R3 (serie), YZF R9, R3 2015, Kawasaki ZX6R (26,4), CBR 500 R, Fireblade
Honda GL 1800 Gold Wing → 2 samme model (83,4) + NT 1100 A/D (samme mærke og type) + Street Glide (samme type, pris, ccm)
Yamaha Tricity 300 → Tricity 300 (2020, 80,4) + Suzuki AN 400 Burgman (28,4) — "Kun 2 er lignende nok"
Triumph Bonneville T120 (1967) → T120 1964 (70,4), Tiger 750 (37,4), T120 2027 (28,4: ikke samme model, 60 års forskel), Yamaha XS 650
BMW R45 1979 → Yamaha XS 650 1973 (20,4) — "Kun én er lignende nok"
```

Fixture-testen (`js/v7-data-lignende.test.js`) har otte typer (naked, sport, touring, cruiser, adventure, scooter, classic/R45, cross) og et lager med BMW R 60/5 og R 80 (boxere), hvor R45 får boxerne og classic-cyklerne og **aldrig** ZZR, Intruder, Café Racer, CBR 600 F, Diversion eller K 100 — og selv de tre, R45 fik før, scorer under gulvet.

Stribens fordeling over alle 737 mål: 624 får seks, 11 får ingen (før: 3), 12 får én (før: 3). Andel af viste kort med anden type og ikke samme model: 7,8 % → 0.

---

## Kørsler

- `node --check` på alle ændrede js: grøn.
- Mine fem testfiler + alle `crawler/*.test.js` + `js/data-kvalitet`, `js/sortering`, `js/annonce-skal`: **373 tests, 372 grønne, 1 sprunget over (præcisionsmålingen mod et snapshot, kræver `V7_SNAPSHOT`), 3 kørsler i træk, 0 fejl**.
- Browser-tests 3 gange (w14-annonce, v6-marked-annonce, w12-kritisk, v5-sidevaegt, v5-soegning-cls, w10-soegning, w14-soegning, w14-forside, v4-annonce, w5-annonce, eksternt-kort, w11-kort, w12-kort2, seo-vagt, facet-sider, smoke-browser): fire fejl, alle fundet og rettet (nedenfor, "Ændringer i fælles tests/budgetter").
- `node scripts/build.js` → `node scripts/kritisk-gen.js` → `node scripts/build.js`; `scripts/kritisk-manifest.json` committet (genereret HTML ikke; arbejdskopien er stillet tilbage til HEAD).
- **Smoke strikt** (`--sider "annonce,annonce-*,soegning,index,maerke-*,type-*" --viewports 375,430,768,1440,1920 --temaer lys,mørk --cls 0.05 --strikt`): **2 kørsler efter sidste byg, hver 430 målinger (43 adresser × 5 bredder × lys+mørk): 0 fejl, 0 advarsler** (305-325 s).
- Hele `npm test` (1785 tests, listen i package.json): se "Fuld suite" nederst.

### Ændringer i fælles tests/budgetter (data-afhængige, forklaret)

Typeafledningen (B) og de nye tekster flytter byggeoutput og tre fælles vagter. Jeg har rettet dem med begrundelse i selve filen, ikke slukket dem:

| Fil | Ændring | Hvorfor |
|---|---|---|
| `scripts/v5-sidevaegt.budget.json` | `js/sortering.js` 6200→6400, `js/data.js` 47700→48800, `js/annonce.js` 37700→38100, begrundelser under `begrundelser_v7_data` | typetabel (+3,2 kB gzip), livscyklus (+1,8 kB), relevansscore |
| `js/v5-maerke.test.js` | V5-ratchetten for data.js måler nu UDEN typetabellen og med 2.000 B luft | hele filens vægt holdes af budgettet ovenfor; registerets egen vægt (slank kopi < 4 kB) er uændret |
| `js/w14-forside.test.js` | kun Scooter forventes at pege på søgningen (7 annoncer, noindex); Classic (5→25) og Cross (3→11) peger nu på deres egne indekserbare sider (dækket af løkken lige over) | classic/cross er over tærsklen på 10 |
| `js/w14-soegning.test.js` | bundmoduler ≤ 430 px (før 350) | facetlinkblokken har 7 i stedet for 5 type-chips og ombryder en række mere ved 1440 px (ca. +78 px) |
| `scripts/seo-linkgraf.test.js` | `mc-*`-sider må have 2 indgående (som `maerke-*`) | `mc-yamaha-cruiser` (18 annoncer) opstår og har kun mærkesiden og typesiden som indgående; Honda-siderne har søskende. En "samme type, andre mærker"-blok i generatoren ville give den tredje (ikke bygget) |

## Skema (7 dimensioner, 1-10)

| Sidefamilie | Visuel | Konsistens | Funktion | Oplevelse | Mobil | Performance | Indhold | Observationer |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Annonceside (ekstern) | 8 | 8 | 9 | 8 | 8 | 9 | 9 | Alder står lige under prisen, hvor den kan være forkert; kolonnebalancen (w14-annonce) holder, fordi noten ligger i midterkolonnen. "Afledt fra model" er ærlig, men tooltip-baseret på touch. |
| Kort (søg/mærke/type) | 8 | 8 | 9 | 8 | 7 | 9 | 9 | Mærkat over fotoet flytter intet; på 164 px-kort kun "77 dage siden" (resten i title/skærmlæser). Ingen mærkat på friske kort. |
| Søgning (sortering/tekst) | 7 | 8 | 9 | 8 | 8 | 9 | 9 | "Senest bekræftet" er en ny sortering, ikke et filter. Friskhedslinjen er to linjer på mobil (pladsen er reserveret). |
| Forside | 7 | 8 | 8 | 8 | 8 | 9 | 9 | Hero-linjen siger nu "403 bekræftet inden for 14 dage …, 332 kan være solgt". |
| Lignende-stribe | 8 | 8 | 9 | 9 | 8 | 9 | 9 | Ærlig overskrift + grundlag; stribe kan være tom eller kort ved få relevante (bevidst). |

Selvvurdering; den uafhængige Critic dømmer bagefter.

## Restpunkter

- **Frisk-filter** ("bekræftet inden for 14/30 dage") er ikke bygget; sorteringen "Senest bekræftet" dækker behovet uden at røre URL-parametre, facettællere og konsistenstests. Kan bygges som `maxConfirmedDays` på `Filtrering.anvendFiltre`.
- Selve livscyklussen får først effekt, når migration 030 er kørt og crawleren er kørt med `BB_LIVSCYKLUS=1` (A.5). Indtil da er alder det, sitet ved.
- Rydbergs og Jensens skal crawles; ellers udløber de 102 annoncer 22. november (24. august + 90 dage), når en anden kilde crawles med flaget slået til.
- `scripts/shared.js`: eksportlisten i `browserModules()` fik fire navne (`afledtTypeFor`, `annonceAlder`, `livscyklusTilstand`, `friskhedsFordeling`).
- `scripts/v5-sidevaegt.budget.json`: `js/sortering.js` 6200 → 6400 (begrundelse i filen).
- Regeltabellen kan udvides med flere modeller, når nye kilder kommer; hver ny regel skal have en begrundelse, og `--maal` skal vise præcision ≥ 95 %.

## Regel 1-6 (CLAUDE.md) — uændret

| Regel | Berørt? |
|---|---|
| 1 robots.txt / Crawl-delay | Nej. `crawler/robots.js` og kontrollen i `koerKilde()` er uændret og kører før noget andet. En robots-spærring registreres nu som *teknisk* signal på annoncerne (kun databaseskrivning; intet kald til kilden) og kan aldrig gøre en annonce `borte`. |
| 2 feltliste, ingen annoncetekst/kontaktoplysninger | Nej. Ingen nye felter hentes eller gemmes fra kilden. De fem nye kolonner (migration 030) er crawlerens egne tilstandsfelter (tidsstempler, tællere, en signalkode), ikke annonceindhold. Den afledte type gemmes ikke. |
| 3 rate limit 1 req/2 sek., ingen parallelle | Nej. Ingen nye requests; livscyklussen bruger kun det, kørslen alligevel har set. `crawler/hastighed.js` og `check (crawl_delay_ms >= 2000)` er uændret. |
| 4 User-Agent | Nej. |
| 5 opt-out med ét flag | Nej. `aktiv: false` / `kilder.aktiv` virker som før; livscyklussen skriver aldrig `aktiv` og rører ikke inaktive kilder (RLS-politikken kræver stadig `k.aktiv`). |
| 6 claim kræver verificeret ejerskab | Nej. Ejerens manuelle `status` (`manuelle_felter`) respekteres: livscyklussen springer rækken over, ligesom `markerBorte()`. |

Livscyklussen *svækker* ikke værnene: `bortemarkeringVurdering()` (60 %-værnet) genbruges som betingelse for "ikke i komplet liste"-signalet, og `borte` er strengere end før (tre signaler over mindst syv dage mod tre kørsler uanset tid).

## Fuld suite (`npm test`, 1785 tests — mine fem nye filer står ikke i listen, se øverst)

- 1. kørsel (arbejdskopi med genereret HTML): fire fejl, alle forklaret og rettet — de tre budget-/data-afhængige i tabellen ovenfor og "A11/A15 kopien rørte ikke repoet" (fejlede kun fordi arbejdskopien var beskidt af byggeoutput; arbejdskopien er nu stillet tilbage til HEAD).
- Sidste kørsel (kildekode alene, HEAD): **1782 grønne, 1 sprunget over, 2 røde** — "P2-3 mærkesidens hero: fast ramme" og "V6 opret-annonce: CLS < 0,02 indlogget". Begge er timingfølsomme browsertests (SVG-forsinkelse, CLS) i filer, jeg ikke har rørt (`scripts/w13-logo-layout.test.js`, `js/v6-konto-cls.test.js`); de er **grønne begge gange (2 af 2), når de køres alene** (30 af 30), og fejlede kun under fuld belastning (flere worktrees kører samtidig). Ikke relateret til V7 data.
