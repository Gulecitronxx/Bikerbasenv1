# Builder w12-guides (tre nye guides)

Branch `gauntlet/w12-guides` (fra 7ef5efa). Produktions-Supabase er ikke rørt; `build.js`, `udgiv.js` og `build-guides.js` som kommando er ikke kørt (kommandoen henter lageret fra produktion). Siderne er bygget ved at kalde `renderGuide`/`renderOversigt` direkte i en kopi udenfor repoet, med sidebjælkens annoncekort og mærkelisten genbrugt fra de committede sider.

## Acceptkriterier (skrevet FØR arbejdet; bevis pr. kriterium nederst)
K1  Tre nye guides i `scripts/guides-data.js` i det eksisterende format: (1) Sådan sælger du din motorcykel, (2) Vinteropbevaring og vedligehold, (3) Første tur efter vinteren: tjekliste (valgt frem for "læs en annonce", fordi annoncelæsning allerede dækkes af ordlisten og brugt-guiden). Hver med unik title (højst 60 tegn), description (120-160), h1, ingress, Kort fortalt, kilder (mindst 3), 900-1500 ord, Læs også (højst 3, kun eksisterende), datePublished/dateModified = 2026-10-17.
K2  Intet opdigtet: ingen beløb, procenter, priser, selskabsnavne, statistik; ingen juridiske tal, der ikke er læst i en kilde. Hver faktisk/juridisk påstand har en kilde under Kilder, og hvor loven er usikker henvises til myndigheden. Ærlig tone; Bikerbasen er et indeks, ikke et handelssted. Sælg-guiden henviser til sikkerhed.html, Forbrugerombudsmanden og opret-annonce.html.
K3  Unikt kortbillede pr. guide (ingen deling med de otte eksisterende), alle `id`'er unikke, indholdsfortegnelsens ankre = sektioner.
K4  Kannibalisering: ingen ny guide deler title-stamme/primært søgeord med guide-brugt-motorcykel, guide-foerste-motorcykel eller hinanden; "vinter" og "forår" holdes i hver sin guide med gensidigt link. seo-meta-laengde (ingen dubletter af title/description/h1) og seo-schema grønne.
K5  Linkgraf: hver ny guide har mindst 3 kontekstuelle indlink (oversigten, Læs også/brødtekst fra andre guides) og er højst 3 klik fra forsiden; ingen "Se også"-blok over 3 links.
K6  Oversigt, sitemap, llms.txt: nye guides på guides.html (kort + ItemList), sitemap.xml med egen lastmod, `scripts/build-llms.js` (guide-listen; også de to W9-guides, der manglede). Footerens guide-kolonne i index.html er Orchestratorens (se DELT-ØNSKER).
K7  Tests: `scripts/guides.test.js` opdateret (guide-adresser, antal guides dateret), ny `scripts/w12-guides.test.js` låser: tre nye guides findes, kilder, ingen beløb/selskaber/mærker, dato 2026-10-17, unikke billeder, dokumenttyper nævnes uden juridiske tal, linkmål findes. `node --check`, `npm test` og `node scripts/seo-audit.js` grønt.
K8  udgiv.js-faldgruben: ingen attributlignende strenge med dobbelte anførselstegn i kommentarer/inline-scripts i de genererede sider.

## Resultat pr. kriterium (bevis)
K1 OK: tre guides i guides-data.js (guide-saelg-motorcykel, guide-mc-vinteropbevaring, guide-mc-foraar-tjekliste). Titler 45/44/47 tegn (65-tegns-fejlen på forårsguiden er rettet: seo-audit tæller "| Bikerbasen" med), descriptions 133/145/141. Ordtal i artiklen 1463/1318/1111 (grænse 900-1500; salgsguiden er tæt på loftet), læsetid 7/6/5 min. Dato 2026-10-17.
K2 OK: test låser ingen beløb/procenter/selskaber/mærker/overdrevne løfter og ingen tekniske tal (bar, mm, km, år ...) i vinter-/forårsguiden. Alt teknisk henviser til betjeningsvejledningen.
K3 OK: kortbilleder img/sell-cruiser.webp, img/type/cross.webp, img/hero-800.webp (cardPos 15%): unikke mod alle 10 guides (test). NB: ingen af de to sidste billeder passer tematisk (cross-foto til vinter, genbrugt hero til forår). Der findes ingen bedre egne billeder; udskift ved lejlighed.
K4 OK: forårsguiden valgt frem for "læs en annonce" (ordlisten har "Sådan læser du et annoncekort", brugt-guiden "Læs annoncen kritisk"). Titelstammer unikke; vinter/forår krydslinker.
K5 OK: seo-linkgraf grøn i npm test. Indlink: oversigten, Læs også (forsikring peger nu på salg i stedet for første-mc; brugt/forsikring/udstyr/ordliste har brødtekstlinks).
K6 OK: guides.html, sitemap.xml (lastmod 2026-10-17), llms.txt (+5 linjer: de tre nye samt W9-guiderne typer og ordliste, som manglede). Footer: se DELT-ØNSKER.
K7 OK: `node --check` alle js/scripts/crawler; `npm test` 1099/1099 grønt (uden w12-test); `node --test scripts/w12-guides.test.js` 10/10; `node scripts/seo-audit.js` 95 sider, 66 indekserbare, 0 fund.
K8 OK: test på de genererede sider (ingen href/srcset/src-attribut i kommentarer eller inline-scripts, ud over de eksisterende GA4-linjer).

## Hvordan siderne er genereret
build-guides.js som kommando henter lageret fra produktion (hentAlt), så den er IKKE kørt. I en kopi udenfor repoet (%TEMP%\w12g\copy) er renderGuide/renderOversigt kaldt direkte med sidebjælkens annoncekort og mærkelisten udtrukket fra de committede sider, derefter build-meta, stamp-version, inline-boot/cookie/analytics og csp-hashes (alle uden netværk). Versionsstemplet er sat tilbage til det committede (7eecf26f), og uændrede guides blev reproduceret byte-identisk (bevis for at metoden er tro). Kun guide-*.html og guides.html er kopieret ind. sitemap.xml er udvidet med udvidSitemap() og llms.txt med build-llms.js (begge uden netværk). Ændrede eksisterende sider: brugt, forsikring, udstyr, ordliste (nye brødtekstlinks; dateModified 2026-10-17) og guides.html.

## Nye/ændrede tests
Ny: `scripts/w12-guides.test.js` (10 tests). Ændret: `scripts/guides.test.js` (guide-adresselisten har 10 guides).

## DELT-ØNSKER (Orchestrator)
1. `package.json` "test": tilføj `scripts/w12-guides.test.js`.
2. Footer i `index.html` (kolonnen "Guides & viden", efter linjen med guide-mc-ordliste.html), tilføj tre linjer og kør derefter `node scripts/synk-header.js`:
   `<li><a href="guide-saelg-motorcykel.html">Sælg din motorcykel</a></li>`
   `<li><a href="guide-mc-vinteropbevaring.html">Vinteropbevaring</a></li>`
   `<li><a href="guide-mc-foraar-tjekliste.html">Første tur efter vinteren</a></li>`
   Husk `js/w10-footer.test.js` (liste GUIDES, linje 38-39) skal have de tre slugs, ellers fanger den ikke footeren.
3. Merge: build.js regenererer alle guides; mine tekster ligger kun i guides-data.js og NAESTE i build-guides.js. build-guides.js-ændringen er kun tre poster i NAESTE.
4. Billeder: de to svage kortbilleder (se K3).

## Kilder pr. guide
Guide 1 (salg): borger.dk Registrering/afmelding/ejerskifte (ejerskifte; 4 hverdage; originale attest = fuldmagt; sælger kan bede Motorstyrelsen afmelde; politiet kan inddrage plader ved ophørt forsikring; læst i dag), Bilbogen (Life in Denmark/tinglysning.dk), Motorstyrelsen (motorst.dk, læst: Motorregistret, "Skift ejer"), købeloven LBK 1853/2021 og Forbrugerstyrelsen brugt bil + brugte varer (privat sælger, som beset, svig; som i brugt-guiden), Forbrugerombudsmanden, Skatteforvaltningen (skat.dk, kun henvisning), politi.dk (kun henvisning til anmeldelse), syn BEK 1685/2025 § 63 og BEK 259/2026 (som i brugt-guiden).
Guide 2 (vinter): Rådet for Sikker Trafik, Færdselsstyrelsen, færdselsloven § 105, borger.dk (afmelding via nummerpladeoperatør; privat kan ikke selv afmelde; læst i dag), Motorstyrelsen.
Guide 3 (forår): Rådet for Sikker Trafik, Færdselsstyrelsen, færdselsloven § 81 og § 105, Motorstyrelsen.

## Usikkert (til ejerens/Criticens verifikation)
- De tekniske råd i vinter-/forårsguiden (batteri, brændstof, olie, dæk, kæde, DOT-kode = sidste fire cifre uge/år, "start ikke motoren blot for at lade den køre", dæk med lufthul-åbninger, åndbar dækken) er almindelig værkstedsviden, IKKE belagt i en kilde på siden; "kilderne" er brede henvisninger (Sikker Trafik, Færdselsstyrelsen). Sikre generelt, men Critic bør vurdere om de tåler at stå uden præcis kilde. Rådet om at lade være med at lade motoren køre i tomgang er det mest holdningspræget.
- Rådet om at afklare forsikringens ophør før salg bygger på borger.dk: politiet kan inddrage plader, hvis forsikringen ophører. Selve rådet ("afklar tidspunktet") er vores slutning; hvad selskaber og Motorstyrelsen faktisk gør ved et salg er ikke verificeret.
- "Der er ikke noget, der hedder et skøde på en motorcykel": skøde bruges om fast ejendom; ikke fundet som krav for køretøjer, men ikke afprøvet mod en kilde. Kan blødes op til "handlen dokumenteres med en købsaftale".
- Privat sælgers ansvar (købeloven, "som beset", svig) er genbrugt fra brugt-guiden (som er læst i loven); ingen nye paragraffer føjet til.
- Skatteforhold (gevinst/tab) er med vilje kun en henvisning til Skatteforvaltningen; ikke læst.
- borger.dk-siden siger ikke, om afmelding stopper afgift/forsikring; guiderne påstår det ikke.
- Syn ved ejerskifte (til og med 2026-12-31) er genbrugt fra brugt-guiden; i dag 2026-10-17 er reglen stadig gældende, men guiden dateres derfor kun til denne periode.
