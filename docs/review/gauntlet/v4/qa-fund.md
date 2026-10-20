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
