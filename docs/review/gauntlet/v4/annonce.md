# V4 Builder: annoncesiden (annonce.html + annonce-*.html)

Branch `gauntlet/v4-annonce`. Mockup: `Bikerbasen billeder\Annonce.png`. Baggrund: V2-Critic 3/10 ("pixel-identisk med live ved 1440"), V3-Critic 6,5/10, V3-Builder rørte ikke siden. Prioritet 1.

Alt er målt mod lokal mock (ingen produktion, ingen skrivning). Skærmbilleder: `scripts/v4-annonce-shots.js` (mocket Supabase, rigtige billeder fra `img/type`, så siden ser realistisk ud; smoke-browser bruger 1x1 px).

## 1. Udgangspunkt (før)

`docs/review/gauntlet/v4/annonce/foer/`: `{ekstern,gul,intern,intern-eet,intern-nul}-{375,430,768,1440,1920}-{lys,moerk}.png` (50 billeder).

Pointe, jeg måtte erkende først: siden var allerede **tre kolonner** (W14: galleri + faktatabel | titel + beskrivelse + kørekort | sælger + handl trygt, tjekbånd, lignende). "Pixel-identisk med live" betød derfor ikke, at strukturen manglede, men at **hierarkiet og tætheden** var anderledes end billedets: info-kolonnen var ikke et kort, sidepanelet var en lang tekstblok med én knap, eksternt foto havde en bildtekst under sig i stedet for at ligne et fotokort, kilden lå sidst på mobil, og lignende-kortene var tunge.

## 2. Forskelsliste: mockup mod nuværende side (før)

| # | Mockup | Nuværende side (før) | Handling |
|---|---|---|---|
| 1 | Midterkolonnen er ét hvidt kort: chips, titel, pris, nøgletal, beskrivelse | Blokkene flød direkte på siden; ingen visuel enhed | **Lavet**: `.an-panel` (kort ≥1180 px, `display:contents` under) |
| 2 | Sidepanel (sælger + CTA + handl trygt) klæber under headeren | Rullede væk; højre kolonne tom ved siden af beskrivelsen | **Lavet**: `.an-side` sticky (≥1180 px og ≥760 px høj) |
| 3 | Sælgerkort: navn + type, adresselinje, ÉN stor primærknap, to rolige sekundærknapper (Ring op / Send besked) | Navn, tekstmur på 5 afsnit, én knap, lille "Meld fejl" | **Lavet**: primær CTA + to sekundære ("Alle fra X" / "Kopiér link"; egen: "Se sælgerprofil" / "Kopiér link"), én sætning om hvem man handler med, resten bag "Mere om salget hos X" |
| 4 | Foto som fotokort: tæller-pille øverst til venstre, rund knap øverst til højre | Bildtekst under billedet (eksternt), ingen knap | **Lavet** (ekstern): kreditpille "Foto: MC Syd" og rund knap til kildens billeder (ny fane, `noopener nofollow`). Intet galleri (regel 2) |
| 5 | Nøgletalsrække lige fordelt over kortets bredde | Flex-række med ujævne mellemrum og kant over | **Lavet**: grid, lige fordelt, ikon + tal (4 i én række ved 1440); egne annoncer tager brændstof med, når det er oplyst |
| 6 | Faktatabel: kun køretøjsfakta | Eksternt: "Sælger" og "Sted" stod både her og i kildekortet og brækkede over to linjer | **Lavet**: fjernet dubletter, "Annonce-id" kort; ens rækkehøjde |
| 7 | Lignende motorcykler: slanke kort (billede, titel, år/km/type, pris) | Tunge kort med 3-5 chips + fod | **Lavet**: kørekort + kubik bliver, hk og markører væk i stribens kort (de står på kortets side) |
| 8 | Mobil: sælger/CTA lige efter titel og pris | Kilden kom efter faktatabellen (~1.500 px nede) | **Lavet**: ny rækkefølge på mobil (test opdateret med begrundelse) |
| 9 | Beskrivelse som rig tekst | Eksternt: to lange afsnit med fyldtekst | **Delvist**: kortere (ét afsnit + note). Rigtig tekst findes ikke (regel 2) |
| 10 | Kopiér/del med synlig bekræftelse | Kun en toast nederst | **Lavet**: knappen siger "Link kopieret" i 2 s, hak-farve, toast bevares (role=status) |
| 11 | Kørekortkort med stor A2-badge, "Læs mere" | Fandtes | Uændret (lavere end 190 px, ærlig Mulig / Kræver / Ikke afgjort) |
| 12 | Tjekbånd med motorcykelfoto | Fandtes (W14) | Uændret |
| 13 | Brødkrumme + Del / Gem som favorit | Fandtes | Favorit popper nu diskret ved tryk |
| 14 | "Se finansieringsforslag", anmeldelser, svartid, stjerner, "verificeret", 14 billeder + "+10", "Ring op", "Send besked" | — | **Bevidst ikke**: opdigtet eller forbudt (regel 2 / ingen opdigtet indhold). Findes kun for egne annoncer hvor data er ægte (galleri, lightbox, telefon-reveal) |

## 3. Implementeret (efter)

Filer: `js/annonce.js`, `css/p-annonce.css`, `js/v4-annonce.test.js` (ny), `js/w11-kort.test.js` (én rækkefølge-assert, se nedenfor), `scripts/v4-annonce-shots.js` (ny), `annonce.html` / `annonce-*.html` (genereret).

* Info-panel (1), sticky side (2), kildekort (3), fotokort (4), nøgletalsrække (5), faktatabel (6), slank lignende-stribe (7), mobilrækkefølge (8), kortere ekstern beskrivelse (9), kopiér-link-kvittering (10).
* Eksternt foto er 4:3 på brede skærme, så kolonnen med foto og faktatabel ikke ender 150 px over de to andre (balancen er målt: se afsnit 4).
* Micro-interactions (alle slukkes under `prefers-reduced-motion`): hover på knapper og miniaturer, pil-skub på CTA og links, pop på favorit-hjertet, tryk-feedback, kopier-link-kvittering, synlig fokusring på de nye elementer, chevron på "Mere om salget".

### Bevidst ændret test (med begrundelse)
`js/w11-kort.test.js` "annonce paa mobil: raekkefoelge": kilden/sælgeren flyttet fra efter faktatabellen til lige efter titel/pris/nøgletal. Det er mål (8), ikke en regression; testen låste den gamle rækkefølge. Alle andre eksisterende tests er uændrede.

### Nye tests
`js/v4-annonce.test.js` (11 tests): panelkort, `display:contents` under 1180, sticky, eksternt foto uden galleri/tæller/kontaktdata, kildekortets handlinger og tekster (forhandler/markedsplads), kopiér-link-kvittering, favorit-pop, reduced motion, faktatabel uden dubletter, mobilrækkefølge, slank lignende-stribe. Skal tilføjes til `package.json` "test" af Orchestrator: **`js/v4-annonce.test.js`**.

## 4. Verifikation

* `node --check` på alle js/crawler/scripts: OK.
* Relevante tests (32 filer, 390 tests inkl. ny `js/v4-annonce.test.js`, `js/w14-annonce.test.js`, `js/w11-kort.test.js`, `js/v2-soegning.test.js`, `scripts/annonce-statisk.test.js`, `scripts/w12-kritisk.test.js`): **390/390 grønne tre gange i træk (efter merge af gauntlet/master)** (efter build -> kritisk-gen -> build).
* `node scripts/smoke-browser.js --sider "annonce,annonce-*" --viewports 320,390,768,1024,1440 --temaer lys,mørk --cls 0.05 --strikt`: **0 fejl, 0 advarsler, to gange** (30 målinger pr. kørsel).
* `node scripts/v4-annonce-smoke.js` (ny): 8 annoncevarianter x 8 viewports (320-1920) x lys/mørk = 128 målinger, strikt, CLS 0,05: 0 fejl (se afsnit 9 om den ene sjældne konsolfejl, som er forklaret).
* Kolonnebund-spredning ved 1440 (mål i browser; testkrav højst 100 px for eksterne og egen med kort beskrivelse): eksterne 12-93 px, egen med 1 foto 37 px, egen uden foto 30 px. Egen med meget lang tekst 163 px (før: 165 px). Ved 1280/1180 er spredningen uændret til lidt bedre end før. Panelkortet ændrede altså ikke balancen.
* Byggekæde kørt: `build.js` -> `kritisk-gen.js` -> `build.js`. Anden byg blev afbrudt af SEO-vagtens fail-safe for facet-sider (produktions-Supabase svarede tyndere end første gang); det rører ikke annoncesiderne, og de committede facet-sider/sitemap er ikke ændret af mig.

## 5. Hvad er committet, og hvad Orchestrator skal gøre

Committet: `js/annonce.js`, `css/p-annonce.css`, `js/v4-annonce.test.js`, `js/w11-kort.test.js`, `scripts/v4-annonce-shots.js`, `scripts/v4-annonce-smoke.js`, `annonce.html`, `annonce-*.html` (kun `?v=`-stempel ændret), denne fil og skærmbillederne.
**Ikke** committet (fælles/genererede): `scripts/kritisk-manifest.json`, `sitemap.xml`, `llms.txt`, `robots.txt`, `scripts/sitemap-lastmod.json` og de øvrige ~98 genererede html-sider. `scripts/w12-kritisk.test.js` fejler uden en ny `node scripts/kritisk-gen.js` efter merge (65 ændrede regler i `p-annonce.css`) — det er den forventede rækkefølge build -> kritisk-gen -> build.
Tilføj til `package.json` "test": `js/v4-annonce.test.js`.

## 6. Før/efter-screenshots

* Før: `docs/review/gauntlet/v4/annonce/foer/{ekstern,intern}-{375,430,768,1440,1920}-{lys,moerk}.png`
* Efter: `docs/review/gauntlet/v4/annonce/efter/` (samme navne)
* Alt andet (markedsplads, egen med ét/ingen foto) lå i `work/v4/extra` og er ikke committet.

## 7. Ærlig vurdering (7 dimensioner, 1-10)

| Dimension | Før | Efter | Begrundelse |
|---|---|---|---|
| Visuel kvalitet | 6,5 | 7,5 | Panelkort, fotokort med pille og knap, rolig nøgletalsrække, slankere kildekort. Stadig ikke billedets niveau: orange i stedet for grøn, ingen rytterfoto, kun ét foto på eksterne annoncer |
| Designkonsistens | 7,5 | 8 | Samme sekundærknapper på egne og eksterne annoncer; tokens og eksisterende komponenter genbrugt |
| Funktionalitet | 8 | 8 | Alle eksisterende flows uændrede (384 tests). Ny: kopiér link med kvittering, vej til kildens billeder fra fotoet |
| Brugeroplevelse | 6,5 | 8 | Kilde/CTA med det samme på mobil (før ~1.500 px nede), sticky sidepanel på desktop, én sætning om hvem man handler med, resten bag "Mere om salget" |
| Mobil | 7 | 8 | Ny rækkefølge, 2x2 nøgletal bevaret, sticky bjælke uændret og testet; kildekortet står før kørekortet |
| Performance | 8 | 8 | Ingen nye requests eller scripts; CLS 0,000-0,0x i smoke strikt; ingen ændring af kritisk sti |
| Indholdskvalitet | 7 | 7 | Eksterne annoncer er tynde med vilje (regel 2). Beskrivelsesblokken er kortere, men ikke rigere. Intet opdigtet tilføjet |

Ligner mockuppen: **ca. 6/10** (før ca. 5/10 efter Criticens 3-6,5 på tidligere runder). Det, der stadig skiller: grøn primærfarve, gallerirække med "+10", anmeldelser/svartid/finansiering/"Ring op"/"Send besked" (opdigtet eller forbudt), motorcykelfoto i sidepanelet. Det er ikke dem, der kan lukkes uden at bryde reglerne.

## 8. Restpunkter

1. Længste egne annoncer (lang beskrivelse): midterkolonnen er 160 px længere end de andre; kan bruge en lavere klipning end 5 linjer eller flytte "Oprettet ... siden" ind i nøgletalsrækken.
2. Statiske `annonce-*.html` (prerender til crawlere) har stadig den gamle markup for sælger/titel; den erstattes ved hydrering, men en crawler uden JS ser ikke de nye kort. Ikke ændret her (SEO-indhold uændret, bevidst).
3. "Gå til annoncen hos Gul og Gratis" brækker med pilen på anden linje i den smalle sidekolonne (uændret fra før).
4. Brødkrumme-aktionsrækken har ingen favorit på eksterne annoncer (D-008).
5. Flaky konsolfejl (se afsnit 4) bør kigges på af Criticen med `scripts/v4-annonce-smoke.js` i en løkke.


## 9. Opfølgning efter V4-QA

### 9a. Mobil-CTA "Vis nummer" lovede noget, der måske ikke findes (QA-note)
Fundet var rigtigt: bjælken  stod som "Vis nummer" for **alle udloggede** på alle database-annoncer ( er sand for hver uuid), et tryk sendte til login, og efter login kunne RPC'en  svare tomt (intet nummer eller intet samtykke), så knappen og bjælken forsvandt. Serveren kan ikke fortælle, om et nummer findes, uden at nummeret eller et flag udstilles (supabase/ er uden for min opgave og ville bryde "telefon vises aldrig offentligt"), så løsningen er ærlig tekst frem for et skjult løfte:
* Udlogget, database-annonce: knappen hedder **"Log ind for at se nummer"** med linjen **"Ikke alle sælgere viser et"** under. Tryk sender til login med redirect tilbage (testet).
* Logget ind, nummer ukendt: **"Vis nummer"** + **"hvis sælgeren viser det"**. Er svaret tomt, fjernes bjælken, og sælgerkortet siger "Sælgeren viser ikke sit telefonnummer" (som før, men nu uden at have lovet andet).
* Kendt nummer (demoannoncer): blot "Vis nummer". Eksterne annoncer har aldrig telefonknap, bjælke eller  (testet).
* Bjælken er stadig højst  (76 px); to-linjers knap med 11 px underlinje. CSS: sidste blok i .
Tests (5 nye i ): udlogget tekst + højde, udlogget tryk til login med redirect, logget ind med tomt svar, logget ind med nummer, ekstern uden telefon.

### 9b. Den sjældne konsolfejl på "ekstern med foto" — årsag fundet
Instrumenteret med  (gemmer konsoltekst, kilde-URL, mislykkede forespørgsler og svar >= 400 pr. indlæsning) og  (gemmer nu alle fund med fuld tekst; , ).
* 10 x 16 indlæsninger (alle viewports, lys/mørk) alene: 0 fejl. Gentaget via smoke-stien 10 x 16: 0 fejl. Seks parallelle processer (288 indlæsninger): 0 fejl.
* Med **14 parallelle processer** (336 indlæsninger) kom fejlen frem én gang:  på ****, forespørgselstype image, ingen HTTP-svar (docs/review/gauntlet/v4/annonce/konsol-ERR_NO_BUFFER_SPACE.json).
* **Årsag: Windows' loopback løb tør for bufferplads under belastning (OS/lokal testserver), ikke siden, ikke mocken og ikke billedet.** App-koden har ingen -kald overhovedet; smoke-browser tæller "Failed to load resource" fra den lokale server som konsolfejl, fordi kun fremmede værter filtreres. Det passer til den oprindelige observation: ét , ingen .
* Tiltag:  måler en variant igen én gang, hvis det ENESTE fund er , og gemmer fundet som  i rapporten. Forslag til Orchestrator (fælles fil, ikke rørt): lad  genforsøge én gang på netop den fejl, eller sætte keep-alive på dens statiske server.
