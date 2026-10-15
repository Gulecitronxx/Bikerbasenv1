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
