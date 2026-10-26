# V7 Agent 4 — Forretningsmodel, monetarisering og kommerciel validering

Dato: 26.10.2026. Branch `gauntlet/v7-forretning`. Dette er ANALYSE. Intet er ændret i produktkode, priser, vilkår, publiceringsflow eller Stripe-opsætning. Alle kommercielle hovedvilkår kræver ejerens godkendelse (afsnit 8).

Datafiler: `forretning/data-aggregater.json` (GET-only udtræk, `forretning/hent-data.js`), `forretning/scenarier.json|csv`, `forretning/tornado.csv` (`forretning/model.js`). Kør scripts igen for at genskabe tallene.

Mærkning i hele dokumentet: **[V]** verificeret mod primær side 26.10.2026, **[S]** kun set i søgeresumé/sekundær kilde, **[A]** antagelse (ikke et målt tal), **[P]** proxy (indekseret marked, ikke Bikerbasens egne data).

---

## 0. Resumé og hovedanbefaling

1. **Monetarisér IKKE private annoncer nu.** Bikerbasen har 2 egne aktive annoncer og 8 offentlige profiler, hvoraf 1 forhandler [V, produktions-Supabase 26.10.2026]. 735 aktive indekserede annoncer er "lånt" udbud. Et betalingsled på et marked uden likviditet fjerner det knappeste, vi har: egne annoncer.
2. **Ejerens hypotese (gratis ≤ 100.000 kr., betaling over) er ikke urimelig i sig selv.** mobile.de har samme mekanik for motorcykler med grænse 12.499 € (ca. 93.000 kr.) [S]. Men i basisscenariet (60 nye egne annoncer/md.) giver model A kun ca. **16.000 kr./år netto** og mister ca. **16 % af udbuddet**. Break-even på ren drift (1.500 kr./md. [A]) kræver ca. 66 nye egne annoncer/md.; en solo-løn på 25.000 kr./md. kræver ca. 1.100/md., altså 123mc-størrelse.
3. **Anbefalet rækkefølge:** (a) nu: behold gratis, ret de offentlige tekster der modsiger hypotesen, mål; (b) forhandlere først, som pilot med målbar værdi (klikrapport baseret på eksisterende `kilde_klik`); (c) ærlig fake-door-test af "betalt synlighed" (model B) når der er trafik; (d) først derefter en **udløser-baseret** hybrid (model C: gratis ≤ 100k + betalt over + tilkøb). Datobaseret introduktionstilbud (model D) frarådes.
4. Fem beslutninger kræver ejeren (afsnit 8). Tre forudsætninger mangler før noget salg til forbrugere: juridisk navn/CVR/adresse (`docs/ejer-skal-levere.md` er ufyldt), opdaterede vilkår + privatlivspolitik, og en jurist-gennemgang af fortrydelsesret og fornyelse.

---

## 1. Konkurrentanalyse (aktuelle kilder)

| Aktør | Hvad der er verificeret | Kilde, dato |
|---|---|---|
| **123mc.dk** | Annonce 4 uger 139 kr., 6 uger 169, 8 uger 219, 10 uger 259. Tilkøb: forside+relevante annoncer +49, 1. side i søgning +59, fremhæv +69 (sidens egen sammendragsmodel rettede selv 89 til 69; genkontrollér visuelt), pakke "boost" +89 (inkl. Facebook/Instagram, Google-netværk, MagaCin). Moms nævnes ikke på siden. Startpris "fra kun kr. 119" på sælgsiden. Udstyr/reservedele fra 0 kr. Fornyelse er automatisk, kan afmeldes under Indstillinger; kortoplysninger kan ikke opdateres ved automatisk fornyelse. Turbosalg (auktion): salær min. 999 kr. inkl. moms eller 2 % af højeste bud over 50.000 kr., kun ved salg. **Priserne matcher de tidligere oplyste referencer.** Egen påstand: 50.000 købere/uge [S, ikke uafhængigt]. | 123mc.dk/saelg-din-motorcykel/opret-annonce.php, /saelg-din-motorcykel/, /support/, /turbosalg/turbosalg.php, 26.10.2026 [V] |
| **DBA** | Forhandler (Vend Pro): standardpris 400 kr. pr. annonce; rabat efter gennemsnitligt annonceantal de seneste 12 mdr. (eksempel 28 % giver 290 kr.). Betalte synlighedsprodukter "Bump" og "Pole Position" (pris ikke offentlig på siden). Moms ikke angivet. Privat MC-annonce: pris IKKE verificeret (hjælpesider 404). 1.259 MC-annoncer ved søgning [S]. | dba.dk/vendpro og /vendpro/priser, 26.10.2026 [V]; antal via søgeresumé [S] |
| **Gul og Gratis** | Private annoncer: bruger skal registrere sig og bekræfte identitet med MitID (kan fraviges af kundeservice). "Annoncer af erhvervsmæssig karakter optages kun mod betaling." Erhverv: månedligt abonnement, grundgebyr + pris pr. annonce pr. dag efter kategori, tilkøb af store billeder/galleri; prisændring med 30 dages varsel; løbende aftaler opsiges med 60 dages varsel; vilkår sidst opdateret juli 2020. Forbruger-"GG+" 39 kr./md. [S]. | guloggratis.dk/sider/vilkaar-for-erhverv og /brugervilkaar, 26.10.2026 [V]; GG+ pris [S] |
| **mobile.de (MC)** | Private: gratis inserering op til en salgsværdi på 12.499 € (ca. 93.000 kr. ved fast kurs ca. 7,46), derover betalt. Direkte hentning gav 403, så tallet er citeret fra sidens egen tekst via søgeresumé. Ældre sider nævner 30.000 €; modstrid. | mobile.de/verkaufen/motorrad/ [S], 26.10.2026 |
| **AutoScout24 (MC)** | "Kostenfreies Basis-Inserat, optional bessere Platzierung zubuchbar"; premium-annoncer giver højere placering. Ingen priser på siden. | autoscout24.de/motorrad-verkaufen/, 26.10.2026 [V] |
| **Bikesales (AU)** | Gratis ved pris op til 3.000 AUD, derover Standard/Premium/Ultimate efter salgspris. Artiklen er ca. 18 mdr. gammel; direkte hentning 403. | søgeresumé 26.10.2026 [S] |
| **Cycle Trader (US)** | Privat: én annonce = ét køretøj; pakker 2-26 uger; priser ikke offentlige (403). En artikel fra 2011 nævner gratis 2-ugers privatannonce og 49 USD for 12 uger. Utilstrækkeligt aktuelt til brug. | søgeresumé [S], priser IKKE verificeret |
| **eBay Motors** | Gebyrer for køretøjer ligger på separat side; hentning mislykkedes. Sekundære kilder modsiger hinanden. IKKE verificeret. | — |
| **Facebook Marketplace** | Ingen primær side kunne hentes. Sekundære kilder: ingen listingsgebyr ved lokal handel. IKKE verificeret for Danmark. | — |

Læring:
- **Ingen verificeret dansk konkurrent har prisgrænse på salgsprisen.** 123mc og DBA tager flad pris (eller forhandlerabonnement) uanset om det er en knallert eller en 250.000 kr.-Harley. Prisgrænse-gating findes i udlandet (mobile.de, Bikesales), hos store markeder med likviditet.
- Gratis ≤ 100k vil undercutte 123mc for ca. to tredjedele af annoncerne ([P] afsnit 3), men for annoncer over 100k er 169 kr. på niveau med 123mc, **uden** 123mc's trafik. Over grænsen har Bikerbasen intet trafikovertag at sælge.
- Forhandler: DBA tager 290-400 kr. pr. annonce. En forhandler med 40 annoncer ville betale 11.600-16.000 kr. pr. annoncerunde på DBA (periodens længde er ikke angivet på siden). Et flat abonnement på 199-399 kr./md. er derfor billigt i forhold, men værdien afhænger af, om Bikerbasen leverer målbare klik/leads, og det kan vi i dag kun måle delvist (afsnit 5).
- Affiliate: ingen konkurrent-/partnervilkår er verificeret her. Alle provisionssatser nedenfor er [A].

---

## 2. Bikerbasen i dag og ændringsliste

### Hvad sitet siger i dag
- **Gratis annoncering:** `opret-annonce.html` (titel, meta, OG, hero: "gratis for private" / "Du betaler ikke for at annoncere"), `index.html` (255, 415, 419), `login.html` (9 steder) og `js/login.js:22`. `om-bikerbasen.html:160` siger direkte: "alle kan oprette en annonce gratis … uanset om motorcyklen bliver solgt for 8.000 kr. eller 250.000 kr." og **"forretningsmodellen bag Bikerbasen er et fremtidigt forhandlerabonnement og affiliate-indtægter, ikke gebyrer på private handler"**. Det er en offentlig, direkte modstrid med hypotesen.
- Ordlyden "altid gratis/gratis for evigt" findes ingen steder (0 forekomster i html/js/txt), så reglen i `docs/forretning.md` §1 er overholdt, og der er ikke lovet evig gratis.
- "Ingen kommission af salget" (brandsider, `scripts/build-brand-pages.js` 525-545, 947) forbliver sand ved et opslagsgebyr, men må ikke læses som "ingen gebyrer".
- **Betaling:** `BETALING_BYGGET=false` (`js/store.js:25`) og `FRI_ADGANG=true` (`js/data.js:11`): ingen side viser betalingstekst. Dashboardets planstrimmel: "Bikerbasen er gratis for alle i øjeblikket — også forhandlere." Privatlivspolitikken (linje 187) siger: Stripe "planlagt, men ikke i brug". `js/annonce.js:802/808`: "Bikerbasen har ingen betalingsløsning og rører aldrig pengene".
- **Forhandlerabonnement (kode klar, inaktiv):** `supabase/006` (kolonner + 3-aktive-trigger, droppet af 007), `019` (is_dealer ved betaling), `020` (dev_set_plan fjernet), `functions/create-checkout` (Stripe `mode: 'subscription'`, ét `STRIPE_PRICE_ID`), `create-portal`, `stripe-webhook`, `STRIPE_OPSAETNING.md` (eksempelpris 199 kr./md.). Der er ingen annonceperiode (`listings` har kun status active/sold/hidden, ingen `expires_at`), ingen betaling pr. annonce, ingen prisafhængig regel.
- **Affiliate:** intet er bygget; kun nævnt i `om-bikerbasen.html:160` og `docs/forretning.md` §7.

### Komplet ændringsliste ved en ny prismodel (kun forslag, intet ændret)
| # | Område | Filer / steder | Ændring |
|---|---|---|---|
| 1 | Flag | `js/data.js` (FRI_ADGANG), `js/store.js` (BETALING_BYGGET), `js/w7-funktion-hjaelp.js` (testharness) | Erstat de to flag med ét konfigurerbart prisregime (fra/forhandler/pris-gate/synlighed); default fra |
| 2 | Opret-flow | `opret-annonce.html` (title/meta/OG linje 8-26, 144, 148), `js/opret-annonce.js` (1216-1233 gate-modal, 1329-1380 før-tjek og serverafvisning, prisfeltet, redigering) | Pristrin med forhåndsvisning af pris, nyt "betal for at udgive"-trin, håndtering af prisændring/krydsning af grænsen |
| 3 | Konto/abonnement | `js/mine-annoncer.js` (333-350 grænse, 669-760 plankort, 1002 retur fra Stripe), `js/dashboard.js` (286-330 planstrimmel), `mine-annoncer.html` | Kvitteringsliste, udløbsdato pr. annonce, "forny"-knap, refusion/fortryd |
| 4 | Offentlig copy | `index.html` (255, 415, 419), `login.html` (157, 161, 308, 316-343), `js/login.js:22`, `om-bikerbasen.html` (160, 192), hero/FAQ på forside og sælgerguide | Ret "gratis for private"/"ingen gebyrer på private handler" til den vedtagne model |
| 5 | Betalingsløfter | `js/annonce.js:802/808` ("ingen betalingsløsning"), `sikkerhed.html` (betalingsafsnit) | Præcisér: ingen betaling MELLEM køber og sælger; Bikerbasen opkræver evt. annoncegebyr |
| 6 | Vilkår | `vilkaar.html` (§8, §10; ny sektion "Priser, betaling, fortrydelse, fornyelse, prisændring, refusion"; ændringsvarsel) | Ejer + jurist. Her skrives fortrydelsesret og fornyelsesregler |
| 7 | Privatlivspolitik | `privatlivspolitik.html:187` (Stripe "planlagt"), nyt afsnit om betalingsoplysninger/bogføring | KUN som forslag til ejeren; Stripe som databehandler; opbevaring efter bogføringsloven |
| 8 | Database | Ny migration `supabase/0NN_*.sql` (fx `listings.betalt_til`, `udloeber`, `betalinger`-tabel, prisregel-trigger), tilpas `006`-triggeren (nu kun antal), RLS | Skrives som kildefil, aktiveres af ejeren |
| 9 | Edge-funktioner | `create-checkout` (tilføj engangsbetaling `mode: 'payment'` + `listing_id`-metadata), `stripe-webhook` (`checkout.session.completed` for engangsbetaling, `charge.refunded`, `invoice.*`), `create-portal` | Skrives som kildefil |
| 10 | Drift/guides | `supabase/STRIPE_OPSAETNING.md`, `OPSAETNING.md`, `DEPLOY.md`, `scripts/backend-deploy.js` (99-112 plan-logik), `scripts/tjek-backend.js` | Aktiveringsguide, secrets, webhook-events |
| 11 | SEO/AI | `scripts/build-llms.js` → `llms.txt` (tilføj en linje om annonceregler), `scripts/build-brand-pages.js` FAQ-JSON-LD ("ingen kommission"), JSON-LD for annoncer (Offer = motorcyklens pris, uændret) | Hold FAQ-svar og synlig tekst ens (seo-schema.test) |
| 12 | Tests der låser nuværende tekst | `js/w7-funktion.test.js` (K1a-K1c), `js/mine-annoncer.test.js`, `js/v5-saelger.test.js` (linje 246 "gratis konto"), `js/v6-konto-vagt.test.js`, `js/w14-brugere.test.js` | Opdateres sammen med teksterne |
| 13 | Interne dokumenter | `docs/forretning.md` §1, §7, §8; `docs/review/DECISIONS.md` (dokumentér beslutningen) | Efter ejerens beslutning |

---

## 3. Data (GET-only udtræk 26.10.2026)

**Egne data (produktion):** 2 aktive egne annoncer synlige for anon; 8 offentlige profiler, 1 med `is_dealer`. `profiles.plan` ligger i `profiles_private` og kan ikke læses uden login, så antal betalende kan ikke opgøres. Der er ingen egen annoncelevetid at måle.

**Indekseret marked [P] (ikke Bikerbasens egne annoncer):** 735 aktive, 687 med pris. Fordeling: MC Syd 413, Gul og Gratis 220, Rydbergs 74, Jensens 28. Sælgertype: 515 forhandler, 220 ikke oplyst (Gul og Gratis oplyser ingen type); ingen markeret "privat".

| Prisbånd (alle 687 med pris) | Antal | Andel |
|---|---|---|
| ≤ 30.000 | 77 | 11 % |
| 30-50.000 | 61 | 9 % |
| 50-75.000 | 83 | 12 % |
| 75-100.000 | 109 | 16 % |
| 100-150.000 | 145 | 21 % |
| > 150.000 | 212 | 31 % |
| Median / P25 / P75 | 105.000 / 59.999 / 169.997 | **52 % over 100.000** |

Kildeopdelt (Gul og Gratis er den bedste proxy for private sælgere, men blander også forhandlere, fx lægger MC Syd også dér):

| Kilde | Med pris | Median | Andel > 100.000 | 95-100.000 |
|---|---|---|---|---|
| Gul og Gratis [P: privat-nær] | 212 | 84.993 | **36 %** | 6,1 % (13 stk.) |
| MC Syd (forhandler) | 379 | 119.995 | 57 % | 2,4 % |
| Rydbergs (forhandler) | 69 | 149.900 | 71 % | 4,3 % |
| Jensens (forhandler) | 27 | 102.999 | 52 % | 0 % |

Pr. mærke (andel over 100k, antal ≥ 30 med pris): Harley-Davidson 96 % (n=77, median 234.800), Honda 59 % (n=294), Triumph 32 % (n=34), Yamaha 34 % (n=68), Suzuki 32 % (n=62), BMW 33 % (n=43), Kawasaki 30 % (n=40). Pr. type: Cruiser 64 %, Adventure 75 %, Touring 56 %, Street 44 %, Sportstouring 31 %, Sport 25 % (n ≥ 24; typefeltet er "ukendt" på 339 annoncer). Fuld tabel i `data-aggregater.json`.

Tolkning: grænsen på 100.000 deler et privat-nært marked i ca. 64/36 og et forhandlermarked i ca. 45/55. En gratisgrænse "rammer" altså primært forhandlerlagret og Harley/cruiser/adventure. Den rammer sjældent entry-segmentet (A2-motorcykler, kørekortsiderne), som er Bikerbasens SEO-kerne.

Grænse-gaming: der er en lille klump nær grænsen i dag (6 % af Gul og Gratis-annoncerne ligger i 95-100.000, uden at en grænse findes), så en reel grænse ville sandsynligvis forskyde priser mod 99.900. Modelleres som gaming-andel g.

**Annoncelevetid er ikke målbar.** Alle 735 rækker har `status = aktiv`; crawleren registrerer ikke forsvundne annoncer, og første crawl er 16.08.2026. Medianalder for aktive: 68 dage (censureret). Forslag (kun doku): lad crawleren sætte `status` til en afsluttet tilstand når en annonce forsvinder, så levetid kan beregnes. Eksterne referencer: 123mc's annonceperioder er 4-10 uger [V].

---

## 4. Modeller

| Model | Mekanik | Prisforslag (alle [A], 123mc som anker) | Styrke | Svaghed |
|---|---|---|---|---|
| **A freemium** | Gratis ≤ 100k; over: betaling pr. annonceperiode | 169 kr. inkl. moms / 6 uger, manuel forlængelse | Enkel, har udenlandsk præcedens | Gating af netop de værdifulde annoncer; gaming; ingen trafikfordel over for 123mc |
| **B gratis + betalt synlighed** | Alle annoncer gratis; tilkøb fremhævning | 59 kr. / periode (123mc 49-69) | Ingen udbudstab; ærligt at validere | Lille omsætning; fremhævning har kun værdi med trafik |
| **C hybrid** | A + B + tilkøb | A + 59 kr.; 10 % af betalende tager også fremhævning | Størst potentiale ved likviditet | Kompleksitet; samme risici som A |
| **D vækst-intro** | Gratis i periode, så A | — | Rammer ikke udbud i perioden | Datoen er ikke en likviditetsindikator; tidsbegrænset gratis er i praksis dagens tilstand; at annoncere en slutdato kan skubbe sælgere væk |
| **E forhandlerabonnement** | Flat pr. md., ubegrænset annoncer | 199 kr./md. ekskl. moms (testpris i STRIPE_OPSAETNING) | Stripe-kode findes; DBA-sammenligning gør prisen billig | Dealerne får allerede gratis distribution (konsentpitch); kræver bevist værdi; kun 3 forhandlerkilder i dag |
| **F affiliate** | Provision pr. kvalificeret lead (forsikring, finansiering, udstyr) | 40-120 kr. pr. lead [A, ingen partneraftale verificeret] | Ingen friktion for sælgere | Kræver trafik; ingen afhængighed af annoncer |

---

## 5. Økonomi

### Faste antagelser
Moms 25 % (priser vist inkl. moms til forbrugere; forhandler ekskl. moms). Stripe i Danmark [V, stripe.com/en-dk/pricing 26.10.2026]: EEA-standardkort 1,5 % + 1,80 kr., premiumkort 2,8 % + 1,80, UK 2,5 %, international 3,15 % + 1,80, dispute 200 kr.; modelleret med 1,9 % + 1,80 kr. (kortmix [A]). Support 4 kr. pr. betaling [A]. Drift 1.500 kr./md. [A, ikke verificeret mod fakturaer; ejerens tid er ikke medregnet]. Netto pr. betalende annonce (169 kr.): ca. 119 kr. (moms 33,8, Stripe 5,0, support 4, refusion 5 %).

### Scenarier (måned 12, steady state; alle input [A])
| Input | Pessimistisk | Base | Optimistisk |
|---|---|---|---|
| Nye egne annoncer/md. (N) | 15 | 60 | 250 |
| Andel over 100k (s) [P: 36 % Gul og Gratis] | 25 % | 36 % | 45 % |
| Konvertering ved grænsen (c) | 25 % | 50 % | 70 % |
| Grænse-gaming (g) | 20 % | 12 % | 6 % |
| Betalte perioder pr. annonce | 1,0 | 1,2 | 1,4 |
| Refusion | 8 % | 5 % | 3 % |
| Betalende forhandlere (md. 12) | 1 | 6 | 20 |
| Besøg/md. / affiliate-CTR / lead-konv. / provision | 2k / 0,5 % / 10 % / 40 kr. | 10k / 1 % / 15 % / 75 kr. | 40k / 2 % / 20 % / 120 kr. |

Resultat, netto i kr. Kolonnen "År 1" antager lineær optrapning (6,5/12 af steady state), D antager 6 gratis måneder:

| Model | Pess. md. / år 1 | Base md. / år 1 | Opt. md. / år 1 | Tabte egne annoncer/md. (pess/base/opt) |
|---|---|---|---|---|
| A freemium | 87 / 562 | 1.362 / 8.853 | 12.657 / 82.272 | 2,3 / 9,5 / 31,7 |
| B synlighed | 5 / 36 | 91 / 592 | 777 / 5.052 | 0 |
| C hybrid | 94 / 610 | 1.475 / 9.586 | 13.624 / 88.553 | 2,3 / 9,5 / 31,7 |
| D intro 6 md. | 87 / 411 | 1.362 / 6.470 | 12.657 / 60.122 | 2,3 / 9,5 / 31,7 (fra md. 7) |
| E forhandler | 187 / 1.215 | 1.122 / 7.292 | 3.740 / 24.308 | 0 |
| F affiliate | 16 / 104 | 450 / 2.925 | 7.680 / 49.920 | 0 |

Basis, A+E+F samlet: ca. 2.900 kr./md. steady state (ca. 35.000 kr./år), dvs. omtrent dobbelt drift. Optimistisk: ca. 24.000 kr./md. (289.000 kr./år).

### Følsomhed (model A, base, årlig steady-state netto 16.345 kr.)
| Parameter (lav-høj) | Årlig netto | Spænd |
|---|---|---|
| Nye egne annoncer/md. (15-250) | 4.086 - 68.103 | 64.017 |
| Konvertering ved grænsen (25-70 %) | 8.172 - 22.883 | 14.710 |
| Pris (129-219 kr.) | 12.288 - 21.415 | 9.127 |
| Andel over 100k (25-45 %) | 11.351 - 20.431 | 9.080 |
| Betalte perioder (1,0-1,4) | 13.621 - 19.069 | 5.448 |
| Grænse-gaming (20-6 %) | 14.859 - 17.459 | 2.600 |
| Refusion (8-3 %) | 15.790 - 16.715 | 925 |

Konklusion: **volumen (antal egne annoncer) dominerer alt**; priser, konvertering og grænse betyder en størrelsesorden mindre. Modellen siger altså: først likviditet, så pris.

### Break-even (model A, base-parametre ellers)
- Netto ca. 22,7 kr. pr. ny egen annonce (alle annoncer, også de gratis).
- Dække 1.500 kr./md. drift: ca. **66 nye egne annoncer/md.** (forhandlere: ca. 8 betalende ved 199 kr.).
- Dække 25.000 kr./md.: ca. **1.100 nye egne annoncer/md.** (forhandlere: ca. 134). Til sammenligning har 123mc ca. 2.800-6.700 aktive annoncer i søgeresuméer [S] med 4-10 ugers løbetid; det giver groft 1.500-3.000 nye pr. måned [A, udledt]. Solo-løn via private annoncer kræver altså en markedsandel af 123mc-størrelse. Det er ikke realistisk i den nærmeste fremtid.

### Cold start og risiko for tabte annoncer
- 2 egne annoncer i dag. Et betalingsled for annoncer over 100k fjerner (base) 16 % af det tænkte udbud, og det er de dyreste, mest SEO-værdifulde annoncer. En sælger, der siger nej, lægger annoncen på 123mc/DBA, hvor vi ikke indekserer den (kun Gul og Gratis er en kilde, og kun med samtykke).
- Netværkseffekt: købernes værdi stiger med udbud; udbud stiger med købere. Betaling lægges bedst på siden med MEST magt (forhandlere med lager, som vil have synlighed), ikke på den side, der mangler (private).
- Prisfølsomhed over for 123mc: ved 169 kr. er vi 123mc-pris med en brøkdel af trafikken. For at blive valgt ville prisen skulle være under 123mc, men så er omsætningen endnu mindre.
- Ærlig vurdering: **private annoncer er for tidlige at monetarisere**; forhandlerabonnement/affiliate er sundere i rækkefølge, men også de er små tal, og forhandlerne får i dag gratis distribution via indekseringen. Pitchen skal derfor være en målbar ekstra (profil, feed, rapport), ikke "betal for det, du har gratis".

---

## 6. Prismekanik og regler

| Emne | Anbefaling | Begrundelse / kilde |
|---|---|---|
| Engangsbetaling vs. automatisk fornyelse | **Forudbetalt periode, manuel forlængelse** med påmindelse pr. mail (Resend findes). Ingen automatisk fornyelse for private. Forhandlerabonnement: månedlig, kan opsiges når som helst (som i `docs/forretning.md` §7) | Forbrugerombudsmanden: fornyelse skal fremgå tydeligt i hver præsentation; en aftale kan ikke automatisk forlænges med ny bindingsperiode [S, forbrugerombudsmanden.dk]. 123mc bruger automatisk fornyelse og kan ikke opdatere kort: ikke efterlignes |
| Fortrydelsesret | Privat betaler = forbruger, 14 dages fortrydelse. For at publicere straks skal brugeren udtrykkeligt anmode om det og anerkende, at retten bortfalder ved fuld opfyldelse; ved fortrydelse betales forholdsmæssigt for leveret periode | Forbrugeraftaleloven, lovkompas/e-handelsjura via søgning [S]; verificér mod retsinformation |
| Fortrydelsesfunktion | Fra 19.06.2026 kræves en digital fortrydelsesfunktion ved fjernsalg via online-grænseflade (to-trins, uden login) | Sekundære kilder (Bech-Bruun m.fl.) [S]; paragrafnummer uenigt (§ 20 a / art. 11a); jurist |
| Annonceperioder | 4/6/8 uger, fast pris pr. periode; udløbet annonce kan genopstå | 123mc: 4-10 uger [V]. Kræver `udloeber`-felt (findes ikke) |
| Tilkøb | Fremhæv 49-69, 1. side 59, forside 49; kun hvis de reelt ændrer rangering. Vi må ikke love trafik, vi ikke måler | 123mc [V] |
| Prisændring efter oprettelse | Gratisniveau fastlåses ved oprettelse. Hævelse over grænsen = skal betale før ændringen vises. Sænkelse efter betaling = ingen refusion; skrives i vilkår | Undgår gaming begge veje |
| Annoncer der krydser 100.000 kr. / gaming | Sælger sætter 99.900 og nævner højere pris i beskeder: kan ikke håndhæves teknisk. Tiltag: vilkår der forbyder afvigende pris i titel/beskrivelse, rapportér-knap, og **synlig prisændringshistorik** (findes som roadmapidé i `docs/forretning.md`). Ingen politi-regler uden volumen | "Vi gætter aldrig"; en offentlig historik afskrækker mere end kontrol |
| Gratis genoprettelse | Gratis forlængelse/genoprettelse for ≤ 100k. Betalt annonce solgt tidligt: ingen refusion; fejlbetaling/dobbeltbetaling refunderes | Enkelt og forklarligt |
| Refusion | Kun fortrydelsesret og fejl. Stripes gebyr antages ikke returneret ved refusion [A, ikke verificeret]; refusionsandel modelleret 3-8 % | stripe.com/en-dk/pricing [V]: dispute 200 kr. |
| Forhandlerpriser | Ekskl. moms, månedlig faktura/kvittering via Stripe, 60 dages opsigelse er Gul og Gratis' løsning for aftaler; vi anbefaler "opsig når som helst" | GoG vilkår [V]; DBA rabat efter volumen [V] |
| Moms | 25 %. Registreringsgrænse 50.000 kr. afgiftspligtig omsætning [A, verificér hos Skattestyrelsen]; kræver CVR | Ejerens CVR er ikke afgjort (`docs/ejer-skal-levere.md`) |
| Betalingsudbyder | Stripe (kode findes; kun `subscription`-mode). MobilePay: Stripe-siden angav ingen sats; MobilePay direkte ca. 0,99 % [S, 2023, uverificeret]. Vælg først efter ejerens tilbud fra begge | Se afsnit 5 |
| Kvittering/faktura | Stripe-kvittering + faktura med CVR, moms, periode. Bogføring efter bogføringsloven | Behov for opbevaringstid i privatlivspolitik |

---

## 7. Anbefaling

**Model:** staged-C — en udløser-baseret hybrid, der indføres i faser og aldrig starter med gating. Rækkefølge: **E (forhandlere, pilot) + måling → B (betalt synlighed, fake door) → C (gratis ≤ 100k + betalt over + tilkøb) kun ved likviditetsudløser. D afvises.**

Prisforslag [A, til test, ikke til beslutning nu]:
- Private: ≤ 100.000 kr. gratis. Over: 169 kr./6 uger (spejler 123mc). Fremhæv: 49-69 kr.
- Forhandler: 0 kr. i pilot (3 forhandlerkilder), derefter 199-399 kr./md. ekskl. moms eller pris pr. kvalificeret klik. Aldrig opkrævning før `kilde_klik`-rapporter kan vise værdien.
- Affiliate: først når der er trafik og en reel partneraftale.

Hvorfor: likviditeten er den dominerende faktor (følsomhed), ca. 1/6 af udbuddet tabes ved gating (base), og de mest realistiske penge ligger (a) hos forhandlere, der får målbar værdi, og (b) i tilkøb på et marked med trafik. Omsætningen er lille i alle modeller indtil volumen er mange gange højere end i dag.

### Risici
Supplytab ved gating; gaming (95-100k-klump); 123mc-parity uden trafik; forhandlerne betaler ikke for noget, de har gratis (konsent); juridiske krav (fortrydelse, vilkår) uafklarede; support-byrde for en solo-ejer; moms/CVR ikke afklaret.

### Validering uden betaling (ærlig fake door, ingen tvang)
Principper: vis kun det, der er sandt; ingen opdigtede tal; ingen nedtælling/knaphedsmeldinger; ingen betaling taget.
1. **Knap efter udgivelse** (bag flag, default fra): "Vil du have din annonce fremhævet? Det kan ikke købes endnu. Vis interesse, så skriver vi, når det findes. Ingen betaling, ingen binding." Måling via eksisterende GA4-mekanisme (`js/maaling.js`), bag cookiesamtykke: `synlighed_interesse`. Ventelisten bruger kun kontoens e-mail og kræver samtykke og privatlivstekst (se `Personoplysninger`-reglen i V7-FAELLES).
2. **Prisinterval i stedet for fast pris:** "Hvad ville du anse for rimeligt? 0 / 49 / 99 / 149 kr." (en enkelt valgfri spørgsmål, ikke tvunget).
3. **Forhandler:** månedlig klikrapport (`kilde_klik` pr. kilde; findes i `docs/MAALING.md`) sendt gratis til 3 forhandlerkilder; spørg efter 3 måneder, hvad de ville betale for den. Interviews (5-10) er mere sigende end A/B ved få sælgere.
4. **A/B først meningsfuldt ved volumen.** Med 2 egne annoncer er der ingen statistisk styrke; kun kvalitative interviews og klik-/venteliste-tal giver mening.

Foreslåede likviditetsudløsere (forslag, ikke data): ≥ 150 aktive egne annoncer; ≥ 30 nye pr. md. tre måneder i træk; ventelisten viser interesse (fx ≥ 20 tilmeldte og ≥ 5 % klik); stabil søgetrafik målt i Search Console (ikke tilgængelig endnu). Ejeren fastsætter selv tallene.

### Implementeringsplan i faser
| Fase | Indhold | Berørte filer (afsnit 2) | Gate |
|---|---|---|---|
| 0 (nu) | Ret `om-bikerbasen.html:160` så teksten ikke afviser fremtidige gebyrer på private; opdater `docs/forretning.md`; udfyld CVR/navn (`ejer-skal-levere.md`); mål | række 4, 13 | Ejer |
| 1 | Jurist: vilkår, fortrydelse, privatlivspolitik, moms | række 6, 7 | Ejer + jurist |
| 2 | Forhandlerpilot: gratis klikrapport, profil; derefter Stripe live (kun `subscription`, 019/020 allerede kørt) | række 3, 9, 10 | Ejer godkender pris |
| 3 | Fake door `synlighed_interesse` bag flag | række 1, 3 | Ejer |
| 4 | Engangsbetaling + annonceperiode + udløb + kvittering (kun hvis udløsere er nået) | række 2, 8, 9, 12 | Ejer |
| 5 | Grænse 100.000 med prisændringsregler, evt. prishistorik | række 2, 6 | Ejer |

### Beslutninger der kræver ejerens godkendelse
1. **Skal private annoncer overhovedet blive betalte, og med hvilken udløser?** (eller kun betalt synlighed). Hypotesen 100.000 kr. er ikke testet på egne data.
2. **Er "ingen gebyrer på private handler" et løfte?** `om-bikerbasen.html:160` siger det i dag.
3. **Forhandlerpris, pilotperiode og om forhandlere fra de 3 konsentkilder skal betale** (konsentpitchen er "gratis distribution").
4. **Juridisk enhed, CVR, moms og betalingsudbyder** (Stripe vs. MobilePay), plus vilkårstekster og fortrydelsesret.
5. **Prisregler:** fornyelse (anbefalet: manuel), prisændring efter oprettelse, refusion, grænse-gaming.

---

## 8. Teknisk forberedelse (KUN forslag, intet implementeret)

Uafhængigt af modellen og uden at ændre rettigheder, priser eller publicering:
1. **Crawler-levetid:** log når en kildeannonce forsvinder (status/`forsvundet_set`), så levetid og prisfald kan måles. (Ændring i `crawler/` og `supabase/` kræver ejerens tilladelse.)
2. **GA4-rapport:** definér rapportering af `kilde_klik`/`view_item` pr. kilde (findes allerede) som grundlag for forhandlerrapport.
3. **Flag-design:** ét `PRIS_REGIME`-flag (fra som default) i stedet for to booleans; testharness i `js/w7-funktion-hjaelp.js` følger.
4. **Datamodel-skitse (kildefil, ikke aktiveret):** `listings.udloeber`, `betalinger(id, listing_id/user_id, beloeb_ore, moms_ore, stripe_id, status)`, `ventelisteinteresse` (kun med samtykke). Aktiveringsguide skrives når ejeren godkender.
5. **Webhook-test med Stripe-fixtures** for `checkout.session.completed` (payment), `charge.refunded` mod lokal mock.
6. **Testlåsning:** tests der forhindrer, at UI nogensinde viser en pris eller købsknap, så længe regimet er fra (findes delvis i K1a-K1c).

---

## Kilder og usikkerheder
- 123mc: priser, tilkøb, fornyelse, turbosalg: 123mc.dk/saelg-din-motorcykel/opret-annonce.php, /support/, /turbosalg/turbosalg.php (26.10.2026).
- DBA Vend Pro: dba.dk/vendpro, dba.dk/vendpro/priser (26.10.2026). Privatpriser ikke fundet.
- Gul og Gratis: guloggratis.dk/sider/vilkaar-for-erhverv (opdateret juli 2020), /sider/brugervilkaar (26.10.2026). GG+ 39 kr./md.: søgeresumé.
- AutoScout24: autoscout24.de/motorrad-verkaufen/ (26.10.2026). mobile.de 12.499 € og Bikesales 3.000 AUD: kun søgeresuméer; direkte hentning 403.
- Stripe: stripe.com/en-dk/pricing (26.10.2026). MobilePay-sats: [S] 2023, ikke verificeret.
- Forbrugerombudsmanden (fornyelse, oplysningskrav): søgeresumé; forbrugeraftaleloven fortrydelsesregler via lovkompas/e-handelsjura; fortrydelsesknap 19.06.2026 via sekundære kilder. Alle skal bekræftes af jurist før brug.
- Facebook Marketplace, eBay Motors, Cycle Trader: IKKE verificeret.
- Data: produktions-Supabase GET 26.10.2026 via `forretning/hent-data.js` (anon-nøgle, ingen skrivninger, kun aggregater gemt).
- Tilgængeligt men ikke brugt: GA4/Search Console (ingen adgang), Bikerbasens egne betalingstal (ingen).
- Alle [A]-tal er antagelser. De er valgt til at vise følsomhed, ikke til at forudsige indtjening.
