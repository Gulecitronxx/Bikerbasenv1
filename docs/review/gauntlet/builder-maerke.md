# Builder: strøm maerke (billede 9, Yamaha) — gauntlet/maerke

Filer: `scripts/build-brand-pages.js` (generator), `css/p-maerke.css` (ny, prefix `.mk-`), `js/maerke.js`, `scripts/maerkeside.test.js`, genererede `maerke-*.html` (25) + `maerker.html`.

## Bygget pr. billedelement (kun ægte data, regnet af samme `items` som titel/intro/FAQ)
- **Hero**: sidens eget foto (`img/hero-*.webp`) + stort typografisk mærkenavn (intet logo findes i `img/`; mærkets slogans er IKKE kopieret). H1, NF-1-rettet intro (`splitIntro()`), "Mere om udvalget", brødkrumme. Hero er mørk i begge temaer.
- **Søgekort** over fotoets underkant: mærke forudvalgt (skjult `brands`), model-felt, Type (kun mærkets typer), Maks. pris (kun trin med træf), kørekort A1/A2/A, "Søg <mærke> motorcykler →" + "N <mærke> motorcykler i Danmark". Tomme felter fjernes ved submit (JS).
- **Tillidsrække** 4 ikon+tekst (kilde / kørekortfilter på oplyste tal / ikke oplyst frem for gæt / handlen sker hos sælger, ingen kommission). 2x2 på mobil.
- **Annoncerække** op til 5 kort (delt `listingCardHTML`, foto først) + CTA-panel "Find din næste <mærke>" med ✓-punkter (kun sande). Få annoncer: alle vises, panelet lander lige efter sidste kort, ingen tomme felter. Mobil: vandret scroller.
- **Typefliser** (`.tile`, kun typer mærket har, antal). **Sådan virker Bikerbasen**: `.saadan-trin*`, samme 4 trin som forsiden.
- **Tre kolonner**: modeller med antal (6 + `<details>` med resten, op til 12), kørekort A1/A2/A (antal = søgesidens "ikke udelukket"), regioner med antal. Kolonner uden data udelades.
- **Bevaret under billedets struktur**: facetfold (kørekort/pris/type/sortér), resten af annoncerne (de 5 fremhævede vises ikke igen), noscript-liste, prisniveau, FAQ, andre mærker.
- **maerker.html**: hero + tillidsrække, "Mærker med flest annoncer" (8 fliser m. antal), A–Z med bogstavnav og antal, Sådan virker, mærker uden lager (tekst). Inline script fjernet (nu `js/maerke.js`); bruger nu sidens fulde CSP (ellers fejlede `csp-billedvaerter.test.js`).

## V-012 (49 vs 55)
Årsag: lokalt (`SHOW_DEMO_DATA`) ligger 6 demo-Yamaha (id 1001-1006) i `Store.getAllListings()`; klienten overskrev byggets 49 med 55, og "Alle 49" stod ved siden af. Nu: ét tal = byggets `items.length`; alle `[data-mk-n]` (hero-tæller, noter, "Alle N i søgningen") skrives samlet, demo ekskluderes, og siden rører kun DOM hvis hele lageret er hentet og id'erne afviger. Søgesiden viser stadig 55 LOKALT (demo) — ikke i drift (0 demo).

## Hvad matcher IKKE billedet
- Max 4 kort + panel ved 1280+ (billedet 5 kort); 5. kort kun i mobil-scrolleren. Panelet har sell-cruiser.webp, ikke mærkets rytter.
- Intet mærkelogo/slogan, ingen "fællesskab"-bokse, ingen "Vi fjerner svindel", intet "Populære" (rækken hedder "…-modeller med flest annoncer" fordi siden ikke måler popularitet, jf. D8-M5).
- Hero er højere end billedets (breadcrumb + H1 + intro bevares af SEO-hensyn). Kørekortkolonnens "A" = alle ikke udelukket (søgningens definition).

## Målt (renderet, Playwright, lys+mørk, 320/360/390/768/1024/1440; Yamaha, Benelli(1), Aprilia(7), Harley, Royal Enfield, Honda, maerker)
- Vandret overflow: 0 af 84 kombinationer (scrollWidth==clientWidth). Konsol: ren (kun kendte Supabase-CORS filtreret). Ét H1, ét antal pr. side.
- Kontrast hvid tekst på hero/fliser: ≥5,5:1 (98. percentil af baggrundsluminans under teksten); resten bruger tokens.
- SEO før/efter (script, samme data): title, description, canonical, robots, JSON-LD, FAQ, noscript-liste, H1 identiske på alle 26 sider; ingen tabte interne links (+1-6 nye pr. side). Søgeformularen testet (tom → `?brands=Yamaha`, udfyldt → alle felter).
- Iterationer: 4 (hero/CTA-højde, fliser, kolonner, få-annoncer-layout, mobil søgekort/trust, kontrast).

## Tests / commits
`node --test scripts/maerkeside.test.js` (19 grønne; nye: NF-1 x3, `splitIntro`, `vaelgFremhaevede`). `npm test`: 369/369 grønne. Syntakskontrol ren. Ny testfil: ingen (udvidet eksisterende `scripts/maerkeside.test.js`).

## DELT-ØNSKE
- `.tile`/`.saadan-trin*`/`.kk-seg` genbruges uændret. Ønske: gør hero + søgekort + tillidsrække (`.mk-hero`, `.mk-search`, `.mk-trust`) til delt komponent, så facet-strømmen (type/kørekort/region) og forsiden kan bruge samme markup.
- Annoncekortets prislinje viser et afkortet badge ("EN…") på kort uden pris (delt `listingCardHTML`).

## Kendte rester
- Genereret output er RÅT (uden build-meta/OG, GA-inline, CSP-hashes, `?v=`); Orchestrator kører `build.js`. `sitemap.xml`/`robots.txt` fra generatoren er IKKE committet (de mangler facet-siderne, som build-facet-pages tilføjer).
- Generatoren henter live fra Supabase; antal kan afvige fra tidligere committet output (data, ikke design).

## Runde 2 (Critic 3,8/5 → mere modig)
- **P2-2 modeltal:** årsag: flisen talte annoncer med netop modelnavnet, men linket (`q=`) er en delstrengssøgning ("K 1200" finder også K 1200 GT). Nu tæller flisen med søgningens egen regel (`Filtrering.anvendFiltre({q})`), linket er uændret (så `build-facet-pages` stadig kan relinke til modelsider). Test: flise-tal = filterantal.
- **P2-3:** `erModelnavn()` kasserer sælgertitler (≥2 små ord, tegnsætning, >40 tegn); ægte modeller ("Ténéré 700 World Raid T7", "Gs katana", "Xv 750 virago") består. Kun linkene til de to titel-"modeller" (Hyosung, Kymco) er væk; modellisten er nu op til 30 (6 fliser + åbn-felt), så ingen ægte model-links tabes (SEO-script: 0 tabte uden de 2 titler).
- **P2-4 mærkeidentitet:** hero = foto kun for cruiser-mærker; alle andre får deres mest solgte type som illustration (`img/type`), mærker uden kendt type får neutral mørk flade. Panelbillede = ægte annoncethumbnail fra mærkets lager (aldrig samme foto som første kort; ingen ved ét kort). Typefliser = mærkets egne annoncefotos (helst ikke mcsyd-skilt), ellers typeillustration. Stort typografisk navn + monogram-cirkel (ingen logo/slogan).
- **Layout:** 5 kort + panel ved ≥1280 (bredere sektioner som billedet), 1-2 annoncer: panelet som bjælke ved siden af kortet, tre kolonner lige høje og fyldt (kørekortlinks + guide-link), "Sådan virker" som forsidens strip (ikoner, pile, "Køb og sælg trygt"-boks → `sikkerhed.html`; CSS afgrænset til `.mk-saadan`, identisk med forsidens).
- Målt: overflow 0 (sweep 6 sider x 12), konsol ren, `npm test` 375/375. 3 nye render-iterationer (1440/1280/900/390, lys+mørk).
- **Selv-score mod billede 9 (0-5):** hero 3,8 · søgekort 4,5 · tillid 4,0 · annoncerække+panel 4,3 · typefliser 4,0 · sådan virker 4,5 · tre kolonner 4,2 · samlet ca. 4,2.
- Rest: hero kan ikke få rigtige mærkefotos/ryttere (ingen licenserede); typefliser fra mcsyd bærer firmaskilt; `guide-a2-koerekort.html` oprettes af guides-strømmen. Nye tests i `scripts/maerkeside.test.js` (25 grønne).
