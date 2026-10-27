# V7 Critic (blind, samlet dom) — Bikerbasen

Kandidat: `gauntlet/master` = `origin/main` 5f40cd16 (worktree `wt/v7-critic`, branch `gauntlet/v7-critic`).
Dato: 2026-10-26. Jeg læste IKKE `docs/review/gauntlet/v7/*.md` før min egen vurdering var færdig; afsnit 9 er krydstjekket bagefter.
Ingen produktionskode ændret, intet push, ingen skrivning til Supabase/produktion, ingen crawler. Mod live: kun GET (sider + læsning af `eksterne_annoncer` med den offentlige nøgle, som sitets egen frontend bruger). Alle `/functions/v1/*`-kald fra mine browsere blev afbrudt lokalt (route abort); på ét tidligt lokalt sidehit nåede et `haendelse`-kald ud og blev afvist (CORS/401), intet skrevet. **Ærlig bivirkning:** mine første 3 live-sidevisninger af den egne annonce BMW R45 (2 viewports + 1 kontrolkørsel) skete UDEN route-abort og kan have talt som visninger i sitets egen visningstæller (`haendelse`, via browseren, som enhver besøgende). Ikke gjort bevidst; ingen anden skrivning.

Mærkat: **[V]** = jeg har selv målt/kørt det. **[L]** = kun læst/ræsonneret, ikke kørt.

---

## 1. DOM: **PUSH** (flag FRA) — men flaget `beskeder` må IKKE tændes endnu

Begrundelse i tre linjer:
1. Alt nyt i beskeder ligger bag `BB_FLAGS.beskeder = false` og `SUPABASE_CONFIG.livscyklus = false`; siden opfører sig ærligt i flag-fra-tilstand [V], og ingen SQL kører mod produktion af sig selv.
2. Forretningsmodellen er urørt (ingen pris-/betalings-/vilkårskode ændret) [V], og crawler-reglerne 1–6 er ikke rørt [V].
3. Dataforbedringerne (afledt type, "Lignende", friskhedsmærkat, "købes"-filter) er målt gode på live-data [V]. Det store hul (45 % af lageret er 63-71 dage gammelt) er et crawler-/driftsproblem, som V7 *viser ærligt*, men ikke *løser*.

Hvorfor ikke bare "PUSH uden forbehold": gate-resultat og tre aktiverings-blokkere står nedenfor (P1/P2). Intet af det rammer flag-fra-tilstanden, men ejeren må ikke læse "SQL'en er testet" som "SQL'en er klar".

Gate (kun hvad jeg selv har kørt): se afsnit 7 — fuld `npm test` er IKKE bekræftet færdig-grøn af mig.

---

## 2. Fund (P0–P3)

Der er **ingen P0**.

### P1-A [V] Lageret er stadig gammelt: 332 af 735 aktive indekserede annoncer (45 %) er 63–71 dage siden sidst set
- Bevis: `node scripts/maal-aktualitet.js --live` (26.10.2026): p50 = 9,5 d, p75 = 63,2 d, max 71,5 d. mcsyd.dk 413 stk (17 % > 14 d), guloggratis.dk 220 (73 %), rydbergsmc.dk 74 (100 %, sidst set 24.08), jensensmc.dk 28 (100 %, sidst set 24.08). Egen hentning af `eksterne_annoncer` (GET) gav samme tal: 735 rækker, 403 i 7-14 d, 332 i 60-90 d, 0 over 90 d.
- Hvad V7 gør: alderen skrives ud ("Bekræftet for 67 dage siden. Den kan være solgt — tjek hos kilden.") — verificeret på live på Honda CMX 1100 D Rebel (Rydbergs MC), desktop og mobil. Det er ærligt og rigtigt.
- Hvad V7 IKKE gør: rydder op. Statussen `udloebet` kan først sættes efter migration 030 + `BB_LIVSCYKLUS=1` + en komplet crawler-kørsel. De to forhandler-kilder passerer 90 dage ca. 22.11.2026, og indtil da (og efter, hvis 030 ikke køres) står de som `aktiv` med en tekst, der siger "kan være solgt".
- Forslag (ejer): kør crawleren for rydbergsmc.dk og jensensmc.dk (ikke kørt siden august), og kør 030 på staging → produktion. Det er driften, ikke koden, der er flaskehalsen.

### P1-B [V, af filhash] Det, der ligger live, er IKKE den kandidat, jeg dømmer
- Live HTML bruger `styles.css?v=80839d60`; HEAD bruger `?v=e10cf306`. Live har dog allerede V7-data (afledt-fra-model-mærkat, friskhedsmærkat, `BB_FLAGS`, `livscyklus:false`). Mine live-målinger beskriver altså den udrullede build; mine lokale målinger beskriver HEAD. Hvor de afviger, står det i teksten.

### P1-C [L + V] Beskeder: privatlivspolitikken er uændret, men beskeder ER persondata
- `git diff e7232df3..HEAD -- privatlivspolitik.html vilkaar.html om-bikerbasen.html` = kun `?v=`-hashes [V]. Intet om beskeder, opbevaring (24 mdr. foreslået i `ryd_gamle_samtaler`, som ikke er planlagt), Resend som databehandler, eller at Bikerbasen kan læse anmeldte tråde.
- Ikke et push-problem (flag fra), men en **tænd-blokker**.

### P2-A [L] Rate limit i `send_besked`/`svar_besked` kan omgås med parallelle kald (check-then-insert uden lås)
- `supabase/025_beskeder.sql:227-238, 246-248, 337-347`: grænserne tæller rækker i `beskeder`/`samtaler`, men der er ingen `pg_advisory_xact_lock(hashtext(v_uid::text))` eller tilsvarende. Under READ COMMITTED ser N samtidige kald alle `count < grænse` og indsætter alle. En verificeret bruger med anon-nøglen kan dermed sende fx 100 samtidige RPC'er og ramme langt over "20/time" og "10 nye tråde/døgn".
- Jeg kunne IKKE bevise det: min Postgres-harness (PGlite) har én forbindelse. Det er logik, ikke måling.
- Forslag: `perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));` som første statement efter `auth.uid()`-tjekket i begge funktioner. Tilføj en test mod staging med 30 parallelle kald.
- Rate limit er desuden pr. konto; flere verificerede konti omgår den (ingen IP-/enhedsgrænse). Kendt egenskab ved designet, bør stå i aktiveringsguiden.

### P2-B [V] Whitespace-besked slipper igennem databasen
- `bb_rens_besked` bruger `btrim()` (kun mellemrum). Kørt i PGlite: `send_besked(listing, E'\t\t\t')` → `{"ok":true,"samtale_id":...}`. Tegngrænsen (2) tæller tabulatorer. Frontenden (`.trim()`) stopper det, men RPC'en kan kaldes direkte. Samme gælder NBSP/nul-bredde-tegn [L].
- Forslag: i SQL `btrim(x, E' \t\r\n')` + afvis hvis `x !~ '[^[:space:] ​]'`; eller `regexp_replace(x, '\s| |​', '', 'g')`-længdetjek.

### P2-C [V] Logget-ind-headeren ombryder navigationen ved 1280–1366 px (uafhængigt af flaget)
- Målt med mock-bruger (`scripts/w9-saelger-mock.js`) på `mine-annoncer.html`: højeste nav-link 84 px ved 1280 px bred, 61 px ved 1366 px, 39 px ved 1440 px (flag fra og til ens). "Artikler & guides" og "Om Bikerbasen" brydes over 2–3 linjer (se også mit screenshot af tråd-visningen). Jeg har ikke tjekket, om det er nyt i V7 eller ældre; det rammer dog først de indloggede, som beskeder skal servere.
- Forslag: skjul/ikon-isér "Mine annoncer" i nav ved < 1440 px, eller `white-space:nowrap` + overflow-menu.

### P2-D [V] "Lignende motorcykler" for en 1979-classic er stadig tynd (men ærlig)
- Live: BMW R45 får 1 lignende (Yamaha XS 650, 1973, 40.000 kr., 653 ccm: gulv 20,4 = samme type 14 + kørekort 4 + årgang ±8 år 2 + foto 0,4). Lokalt (med demoannoncer, se P3-F) kommer også MZ ETZ 251 (6.500 kr., 250 ccm) med på præcis samme tre point. Overskriften "Kun én/2 er lignende nok" er sand; ordet "nok" lover dog mere end tre svage point (type, kørekortklasse, årgang ±8) holder. Forslag: kræv enten pris ±30 % eller ccm ±35 % ud over typen for at nå gulvet (20 → 22).

### P3-A [V] Typeafledning: ER-6 og beslægtede er stadig uden type; to afledninger er diskutable
- 96 af 716 indekserede (13 %) har stadig ingen type (før V7 359 af 737 = 49 % ifølge tallet i koden). Blandt de 96: Kawasaki ER6, Suzuki GSX 750 F, Gsf 650 Bandit, Honda CBF/NC 700 m.fl.; plus et skrald-opslag "Yamaha / MC. cervice" uden pris.
- "Lignende" til en Kawasaki ER6 (type ukendt) er derfor "samme mærke + kørekort + pris/årgang" og indeholder bl.a. Kawasaki VN 2000 (2053 ccm, cruiser) og GTR 1400 (touring). Se 4.2 for præcisionsmåling.

### P3-B [V] "Købes"-reglen har falske positiver på konstruerede salgstitler, men 0 på live-data
- Live: af 735 titler flagges præcis de 2 rigtige ("moto cross købes", "BSA / Triumph / Norton købes"); 0 falske positiver, 0 oplagte misser. Konstrueret: "Harley Sportster 1200 klar til at købes" og "Kawasaki Z900 skal ses og købes" flagges fejlagtigt (slut-"købes" uden "kan"). Hverken "Honda CB 750 søges" eller "Honda Monkey købes kontant" fanges (første er bevidst: test siger "søges" ikke flagges). Lavt realistisk risiko.

### P3-C [L] Honeypot-feltet hedder `website` og returnerer ok uden at gemme
- `js/beskeder.js:195` + SQL:187-189. Et password-/formularfylder-plugin, der udfylder `website`, giver en ægte bruger "Beskeden er sendt", uden at noget er gemt (og uden `samtale_id` i kvitteringen). Forslag: et mindre autofyld-venligt navn og en kvittering, der ikke lover mere end den ved.

### P3-D [V+L] `send_besked` afslører blokering
- Svar-koden `blokeret` (kørt i PGlite) lader en spammer opdage, at en sælger har blokeret ham, på tværs af annoncer. Frontendens tekst er neutral ("Du kan ikke sende beskeder i denne samtale"), men koden er synlig i RPC-svaret. Lav alvor.

### P3-E [L] Notifikationsfunktion: hemmelighed i funktionstekst, ikke-konstant-tids-sammenligning
- `025:655-656` (`<<HEMMELIGHED>>` skrives ind i funktionskroppen; samme mønster som 013) og `besked-notifikation/index.ts:75` (`!==`). Acceptabelt for dette trusselsbillede; notér til ejeren.

### P3-F [V] Lokalt viser sitet 53 "egne" annoncer (51 demo-annoncer) mod 2 på live
- På `localhost` indlæses demoannoncer (id 1001…): lokal søgning "769 motorcykler", live "718". Ikke en fejl, men det gør lokale tal (forside/søgning/Lignende for egne annoncer) forskellige fra live. Mine Lignende-/type-målinger nedenfor er derfor kørt på LIVE-lageret (716 eksterne + 2 egne = 718).

### P3-G [V] Statisk annonce-HTML lover kontaktoplysninger, JS siger sandheden
- `annonce-bmw-r45-1979-59d3a9a1.html:202`: "Log ind for at se sælger og kontaktoplysninger." (før JS/for crawlere), hvor den hydrerede side siger "Beskeder via Bikerbasen er ikke åbnet endnu …". Små uoverensstemmelser mellem første maling og færdig side.

### P3-H [L] Indbakken genopfrisker tråden hvert 30. sekund
- `js/beskeder.js:588-595`: `aabnSamtale(..., behold:true)` → `tegn()` → `log.scrollTop = scrollHeight`. Et sælger, der scroller op i en lang tråd, rykkes ned igen hvert halve minut (kun når svarfeltet ikke har fokus).

---

## 3. Mål 1 — Køber-sælger-kontakt

### 3.1 Flag FRA (produktion i dag) — **ærlig, men leverer ingen kontakt** [V]
- Kørt: `js/v7-besked-flow.test.js` 23/23 grønne (flag fra: ingen formular, modul `js/beskeder.js` hentes ikke, ingen RPC-kald, ingen badge, Beskeder-fanen skjult), og mine egne screenshots/tekster af lokal `annonce-bmw-r45-…html` 1440 + 390 og live Honda-annonce.
- Egen annonce (BMW R45): sælgerkortet siger ærligt "Beskeder via Bikerbasen er ikke åbnet endnu, så uden et vist nummer kan annoncen ikke kontaktes her." Hovedknap: "Log ind for at se sælgeren". Mobilbjælken: "Log ind for at se nummer / Ikke alle sælgere viser deres nummer" (sætningen er ikke længere afkortet).
- Indekseret annonce: "Gå til annoncen hos Rydbergs MC", "Kopiér link", "Du handler direkte med Rydbergs MC" — klart og sandt (afsender til kilden).
- Dom: Ærligt. Men **ejerens mål "køber-sælger-kontakt" er ikke leveret i produktion**: for de 2 egne annoncer er eneste vej et telefonnummer, sælgeren selv har samtykket til at vise (P3 i QA-spor: R45 er en blindgyde). Kontakten findes kun som kode bag et flag.

### 3.2 Flag TIL — frontend er solid, SQL er rigtig, men har to huller [V + L]
- Frontend mod mock: 23/23 (send, svar, ulæst-badge, deep-link, spam-grænser, låst tråd ved solgt/pause/slettet, bloker/anmeld, XSS, 375/430/768/1440/1920, lys/mørk, kontrast ≥ 4,5, CLS).
- **Rigtig SQL, kørt:** jeg kørte `025_beskeder.sql` uændret (kun `create extension pg_net` fjernet) i PGlite (WASM-PostgreSQL) mod stubbe af `auth.users/auth.uid()`, `profiles`, `listings`, `reports` og et stub af `net.http_post`. Resultater:
  - Filen kan køres, og kan køres igen uden fejl (idempotent) [V].
  - `anon` kan hverken kalde RPC'erne ("permission denied for function …") eller læse/ændre tabellerne [V].
  - Tredjepart: `select count(*) from samtaler/beskeder` = 0, `hent_samtale`/`svar_besked` → `findes_ikke` [V].
  - Deltagere (køber): direkte `insert` i `beskeder` og `update` på `samtaler` → "permission denied" [V]; direkte `select` giver kun egne rækker [V].
  - Interne funktioner (`bb_rens_besked`, `besked_notifikation`, `ryd_gamle_samtaler`) kan ikke kaldes af `authenticated` [V].
  - Uverificeret e-mail → `ikke_verificeret`; egen annonce → `egen_annonce`; dublet → `dublet`; 3 links → `for_mange_links`; honeypot → `ok` uden gemt række; bloker → begge veje `blokeret`; rapportering skriver til `reports` uden at bryde dens CHECK-regler [V].
  - Pr.-tråd-grænsen: efter 20 svar fra samme afsender i timen → `for_mange_pr_annonce` (kørt serielt) [V].
  - **Ingen e-mail/telefon-læk:** returnerede kolonner/felter i `mine_samtaler()`, `hent_samtale()` og direkte `select * from samtaler` indeholder kun UUID'er, annoncetitel, tidsstempler, tekst og modpartens `profiles.name`. `profiles.phone`/`auth.users.email` optræder ikke noget sted [V]. Mailen fra Edge Function indeholder hverken beskedtekst, afsendernavn eller e-mail (kun annoncetitel, escapet) [L, `besked-notifikation/index.ts:51-70`].
- **Hvad harnessen IKKE dækker:** rigtig Supabase (default-privileges for nye funktioner simuleret, men ikke identisk), `pg_net`/Resend, én forbindelse (ingen samtidighed), PostgREST-laget. SQL er stadig ikke prøvet på staging.
- Huller: P2-A (rate limit-race, [L]), P2-B (whitespace, [V]), P1-C (privatliv), P3-C/D/E/H.
- **Krav før flaget tændes:** (1) advisory lock + whitespace-fix, (2) kør 025 på en Supabase-branch og gentag mit script + 30 parallelle `send_besked`, (3) opdatér privatlivspolitik (opbevaring, Resend, anmeldt tråd læsbar for Bikerbasen), (4) planlæg `ryd_gamle_samtaler`, (5) deploy `besked-notifikation` med `NOTIFY_SECRET`/`RESEND_API_KEY`, verificér afsenderdomænet.

---

## 4. Mål 2 — Datakvalitet og friskhed

### 4.1 Friskhed [V]
- Se P1-A. Mærkaten ("Bekræftet for N dage siden", rød/gul advarsel, "Den kan være solgt — tjek hos kilden") virker på live-annoncen jeg åbnede. Forsiden/søgningen skriver: "399 bekræftet inden for 14 dage (senest 17. okt.), 317 kan være solgt". (Mine tal direkte fra databasen: 403/332 af 735; siden viser 716 efter at have frasorteret 19 rækker, bl.a. de 2 efterspørgsels-annoncer — resten har jeg ikke undersøgt.)
- Tallene "718 annoncer" (forside/søgning/mærker) er konsistente på live. Lokalt 769 pga. demoannoncer (P3-F).

### 4.2 Typeafledning — min egen NYE stikprøve [V]
Metode: Playwright mod lokal side med live-lagerdata. Tilfældigt frø 20261026 (ikke builderens). Population: 716 eksterne = 368 med kildens egen type + 252 med afledt type + 96 uden.
- **Præcision mod kildens egen type:** 50 tilfældige kilde-typede annoncer, reglerne kørt uden at se kildens type: **38 enige, 1 uenig, 11 hvor reglen tier** (= 78 % dækning). Præcision hvor reglen svarer: 38/39 = **97,4 %** — men n = 39, så et 95 %-interval er groft 87–99,9 %, ikke "97,4 ±0". Den ene uenighed: Harley FLHTP Electra Glide Police (2023): kilde "cruiser", regel "touring" — reglen har efter min vurdering ret.
- **Håndkontrol af 50 tilfældige AFLEDTE typer** (ingen kildetype at måle mod; jeg bedømte hver selv): 47 klart rigtige, 3 diskutable: Honda CBR 1100 XX (afledt "touring", normalt sport/sport-touring), Honda VFR 800 F ("touring", ofte "sport"), Honda CB 1000 GT / Yamaha Tracer 900 / FJ1200 ("touring" for sports-touring; taksonomien har ikke "sporttouring"). Ingen oplagt fejl i denne stikprøve; ærligt interval ≈ 94–96 % rigtige, 100 % hvis sports-touring tæller som touring.
- Dækning: uden type fra 49 % til 13 % (96/716) [V]. Reglen er konservativ (hellere "Ukendt" end gæt); typen vises som "(afledt fra model)" på annoncen [V, live-skærmbillede af Honda Rebel].
- Skrald: 1 række "MC. cervice" (Yamaha, ingen pris, ingen model); 2 rækker uden model (Honda). 48 af 735 (6,5 %) uden pris.

### 4.3 "Lignende motorcykler" [V, målt på LIVE-lageret]
Kørte `lignendeRangering()` fra sitets egen kode mod alle 718 live-annoncer:
- Antal lignende pr. annonce: 6 for 607, 5 for 22, 4 for 16, 3 for 20, 2 for 31, 1 for 12, 0 for 10.
- "Svage" par (andet mærke, pris afviger > 50 % OG ccm afviger > 35 %, ikke samme model): **2 ud af ca. 3.900 viste par** (BMW R45 ↔ Yamaha XS 650; Kawasaki ZR-7 ↔ Yamaha XJR 1300).
- Fem annoncer i detaljer (live-lager):
  - **BMW R45 (egen, 1979, classic):** 1 lignende — Yamaha XS 650 (score 20,4: type + A2 + årgang ±8). Tynd, men ærlig overskrift ("Kun én motorcykel er lignende nok").
  - **Harley FLHX 2007:** 6, alle HD-touring på nær en Honda Gold Wing (samme type, pris, årgang, ccm). Rigtigt.
  - **Kawasaki ER6 (type ukendt):** 6 Kawasaki, men VN 2000 (cruiser, 2053 ccm) og GTR 1400 (touring) kun på "samme mærke + A + årgang". Svagt, følge af manglende type (P3-A).
  - **Ducati 749:** 6 sport (Aprilia RSV 1000 ×2, CBR 1000 RR, GSX-8R, ZX9R, YZF R7) — gode.
  - **Honda F6 Valkyrie:** nr. 1-2 er Valkyrie (korrekt), nr. 5-6 er Honda Rebel 2024 trods "over 20 års forskel på årgang" i begrundelsen (score 25,4 holder gulvet) — diskutabelt.
- Dom: den store rettelse (BMW R45 → Café Racer/Intruder/ZZR er væk) holder [V]; resten er solid, men gulvet kunne være strammere (P2-D).

---

## 5. Mål 3 — Mærker og søgning

- **Ingen nye mærker** [V]: `git diff e7232df3..HEAD -- js/brands-registry.js` er tom; registret har 105 mærker før og efter.
- **Alle registrerede mærker brugbare** [V, med nuance]: kørte `BrandRegistry.alle()` (105) mod mærkesidens hurtigsøg i browser: 102 findes og kan vælges; **3 (Super Soco, Daelim, TM Racing) viser "Ingen mærker matcher."** — de er `offentlig:false` ("Mangler selvstændigt belæg — kræver ejerens bekræftelse"), altså bevidst skjult. Men `valgbare()` giver 105, så de kan vælges i Opret annonce. Konsekvens: en sælger kan oprette en Daelim-annonce, som mærkesiden ikke kan finde. Beslutning til ejeren: bekræft mærkerne eller fjern dem fra "valgbare".
- 70 af 105 mærker har ingen annonce lige nu; 35 har. Mærkesider findes kun for mærker med annoncer (30 filer `maerke-*.html`), som regelsættet siger.
- **Søgeforslag** [L + V]: `byggSoegeforslag()` bygger en `<datalist>` kun af kendte mærker og mærke+model, der findes i lageret (hvert forslag giver ≥ 1 træf). Jeg har ikke kørt forslagene en ad gangen; testsuiten gør (148 V7-tests, 147 grønne, 1 sprunget over fordi snapshot-filen mangler).
- **"Slut-købes"-reglen** [V]: se P3-B. 0 falske positiver, 2 sande på live-lageret.

---

## 6. Mål 4 — Forretningsmodel (analyse uden aktivering) [V]

- `git diff e7232df3..HEAD -- supabase/functions/create-checkout supabase/functions/stripe-webhook supabase/functions/create-portal` = **tomt**.
- `vilkaar.html`, `privatlivspolitik.html`, `om-bikerbasen.html`: 18 linjer ændret hver, og når `?v=<hash>`-ændringer filtreres fra, er der **0 indholdslinjer** tilbage. Ingen tekst-, pris-, betalings- eller vilkårsændring.
- `git diff e7232df3..HEAD --stat -- supabase/functions` viser kun én ny funktion: `besked-notifikation` (ingen betaling). Nye migrationer: `025_beskeder.sql`, `030_livscyklus.sql` — ingen prisbærende kolonner.
- Grep i tilføjet ikke-test/ikke-HTML-kode efter stripe/checkout/betal/abonnement/price_id/premium: eneste hit er en sikkerhedstekst i indbakken ("Betal aldrig depositum …").
- Dom: analysen har ikke aktiveret noget. Jeg har ikke vurderet selve analysens kvalitet (forretningsmodellens indhold) ud over at tjekke, at den ikke er kodet ind.

### Crawler-reglerne 1–6 (CLAUDE.md) [V]
- `crawler/robots.js`, `crawler/hastighed.js`, `crawler/hent.js`, `crawler/config.js`: **ingen ændringer** (git numstat tom) → regel 1, 3, 4, 5 uberørt.
- `crawler/db.js` (+15/−3) og `crawler/pipeline.js` (+66): kun livscyklus-kolonner (`sidst_forsoegt`, `vaek_i_traek` …), bag `BB_LIVSCYKLUS`, og de bruger de detaljesider, crawleren i forvejen henter (ingen ekstra anmodninger). Felt-whitelist (regel 2) uændret; `uddrag` stadig `null`.
- Regel 6 (claim): ikke berørt.
- Beskeder: ingen tabel gemmer kontaktoplysninger; modparten får kun profilnavn [V, se 3.2]. Beskedtekst er brugerens egen tekst på egne annoncer, ikke scrapet annoncetekst.

---

## 7. Gate [V — kun det jeg selv har kørt]

- V7-specifikke testfiler (12 filer): **148 tests, 147 grønne, 0 røde, 1 sprunget over** (snapshot kræves).
- `js/v7-besked-flow.test.js` alene: **23/23 grønne**.
- `node scripts/build.js` og `node scripts/udgiv.js` kørte jeg IKKE (ville ændre worktree/`_site`).

- `node --check` på alle `js/*.js crawler/*.js scripts/*.js`: **ingen fejl** [V].
- Hele `npm test` startede jeg i worktree-en, men den var ikke færdig, da jeg afleverede: **1087 tests grønne, 0 røde på det tidspunkt** (af ca. 1.520 — builderne rapporterer 1521). Jeg kan altså IKKE bekræfte et fuldt grønt gate; det skal ejeren/QA køre til ende. (Builderne dokumenterer selv, at suiten er sårbar over for belastning: `node --test` med mange samtidige Chromium giver skiftende røde tests, rettet med `--test-concurrency=8`.)

---

## 8. Mål 5 — Visuel kvalitet mod mockups (score 1–10, min egen)

Skærmbilleder: lokale + live, 1440 og 390 px, forside, søgning, mærkeside (Yamaha), annonce (egen R45 og live Honda fra Rydbergs). Sammenlignet med `Forside.png`, `Motorcykler til salg.png`, `Mærker.png`, `Annonce.png`. Jeg har set toppen af hver side og helsider af forside, annonce og mærkeside; søgesidens nederste halvdel har jeg ikke set.

| Side | Score | Hvorfor |
|---|---|---|
| Forside | **6,5** | Samme skelet som mockuppen (hero + søg + typefliser + kort + "sådan virker" + mærker/kørekort/regioner). Mangler hero-rytter, ensartet fotografi og mockuppens grønne CTA-tone; kortene bærer kildernes billeder (mange med "MC SYD"-banner), så rækken ser rodet ud. Nyt: ærlig friskhedslinje under søgefeltet, men den er lille og lang. |
| Søgning | **6,5** | Filtre, grid/liste, sortering og tællere som i mockuppen; ingen hero-banner (mockup har). To tæt-pakkede noter over resultaterne ("53 annoncer på Bikerbasen · indekseret: 413 hos MC Syd …" + friskhedsnote) er tekst-tunge. |
| Annonce | **6,0** | Flag fra: ingen "Kontakt/Ring/Send besked"-blok som mockuppen; én billedkilde pr. indekseret annonce (regel 2, ikke et designvalg); beskrivelsen er en forklaring på, at vi ikke gemmer annoncetekst. Friskhedsbanneret, kørekortboks, "Det bør du tjekke" og seller-kort er pæne og tydelige. Egne R45: engelsk beskrivelse og kun ét tomt kontaktkort. |
| Mærkeside | **7,0** | Tættest på mockuppen: logo-hero, søg i mærke, kort-række, typefliser, modeller, kørekort, regioner, FAQ, prisniveau. Typeflisernes billeder er mørke/uigennemsigtige; "Brugte Yamaha …" og kortrækken gentager MC-Syd-bannere. |

**Gennemsnit: 6,5** mod V5-Critics 6,2 → **+0,3**. Det er inden for det, to forskellige kritikere kan afvige på subjektive score; jeg påstår ikke et løft, kun at niveauet ikke er faldet. Hovedkløften til mockuppen er strukturel og ligger i data (kildernes billeder, ingen galleri), ikke i V7.

---

## 9. Krydstjek mod builderne (efter min egen vurdering)

Jeg læste `docs/review/gauntlet/v7/{qa,qa-fund,besked}.md`: kun overskrifter/greps, ikke en fuld gennemlæsning.
- Builderne fandt allerede 45 %-halen (F-V7-01), tynd Lignende (F-V7-03), R45-blindgyden (F-V7-04), den afkortede mobilbjælke (F-V7-05, siden rettet), og at hele testen er flaky ved 15 samtidige Chromium (rettet med `--test-concurrency=8`).
- **Ikke nævnt hos builderne (efter mine greps):** rate limit-racen (P2-A), whitespace-slip (P2-B), logget-ind-headerens ombrydning (P2-C), honeypot-navnet (P3-C), blokeringslækket (P3-D), de 3 uoffentlige mærker i `valgbare` (afsnit 5), og at live-build ≠ HEAD (P1-B).
- Hvor jeg adskiller mig: jeg dømmer `PUSH` (flag fra), men gør det eksplicit, at "SQL-testet" kun betyder "kører i en Postgres-stub", og at flaget har fire konkrete tænd-blokkere.

---

## 10. Forbehold

- PGlite er WASM-PostgreSQL med stubbe af Supabase-skemaet. Det beviser SQL'ens syntaks, grants, RLS og funktionslogik; det beviser ikke Supabase-specifik opførsel, `pg_net`, PostgREST eller samtidighed.
- Mine visuelle scores er subjektive og baseret på toppen af siderne + enkelte helsider.
- Live-målinger (`maal-aktualitet`, `eksterne_annoncer`) er et øjebliksbillede 2026-10-26; tallene flytter sig, så snart crawleren kører.
- Brugte scratch-filer (harnesses, screenshots) ligger i scratchpad, ikke i repoet.
