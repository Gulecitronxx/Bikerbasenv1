# Builder w2-bredde — én containerskala, ét annoncekort, ens labels/h1, menu + footer

Branch `gauntlet/w2-bredde` (fra e040073). Ejer det delte lag (`css/styles.css`, `js/components.js`, `css/p-*.css`). Rører ikke info-/tekstsiderne ud over den mekaniske header/footer-synk (se DELT-ØNSKER 3).

## Hvad er gjort
1. **Én containerskala.** `--site-w: 1480px` og `--gutter` (16 px, 32 px fra 768) i `:root`; `.container` bruger dem, og `.container--wide` er et alias. Fjernet egne bredder i `p-annonce` (1440), `p-facet` (1400 ≥1560), `p-guides` (1240), `p-login` (1240 x2), `p-maerke` (`.mk-wide` 1456), `p-soegning` (`.so-wrap` 1360). Login-kortet er `site-w − 2·gutter`. Footeren bruger `.container` og flugter dermed automatisk. Test låser, at ingen `p-*.css` sætter en sidebredde.
2. **Ét annoncekort** (`listingCardHTML` i `js/components.js`; forsidens rige opstilling): foto 3:2 · titel + pris på én linje (prisen under titlen i kort <263 px, container query) · `år | km | type` · chips med **kørekortbadge først**, så ccm og hk (kun oplyste; "ccm og hk ikke oplyst" som dæmpet chip; aldrig kg — vægt er ikke et felt, regel 2) · bunden: sted til venstre, sælgertype + kilde til højre (`Forhandler · mcsyd.dk`, sælgertypen skjules i smalle kort; egne annoncer: "Privat sælger" / forhandlernavn). Ens kant/skygge/radius; sammenlign samme sted (nederst t.h. i fotoet) på alle kort, hjerte kun på egne annoncer (D-008). `externalCardHTML`, standardkortet, forhandlerkortet og `sellerLineHTML` er slettet, og ~430 linjer død kort-CSS er fjernet fra `styles.css`. "Kørekort Kørekort A" er væk (ingen `::before`-label; A-badgen siger "Kræver A"), salgsmarkør ("ENGROS +1") er en fuldt læsbar chip i stedet for "EN…". Fabriksnye: "Ny" først i linjen (garanti-forklaringen i title), "Km ikke oplyst" vises ikke for dem.
   **Uden foto:** afdæmpet typebillede fra `img/type/<type>.webp` (klasse `.tt-<type>`, ingen inline-style) med mærkat "Typebillede · intet foto"; samme ved mislykket kildefoto; ukendt type → kameraikon + "Ingen fotos i denne annonce". Ikke annoncens motorcykel — det står i mærkaten og i aria-label.
3. **Ens-gørelser.** Ét labelsæt i alle søgekort (13 px/600, sentence-case: forside, søgning, mærke, type/kørekort/region). `--h1-hero: clamp(28px,3.6vw,50px)` på forside, søgning, kategori, guide (56 → 50 px, 3 → 2 linjer), opret, login (48 → 50), dashboard (52 → 50), mærke-lav. Menu: Kørekort-undermenu A1/A2/A (+ mobilskuffen). Footer: "Artikler & guides" og "Kørekort A". **Footeren** distribueres sådan: `index.html` er kilden, generatorerne (`shared.js`) trækker den derfra, de håndskrevne sider har kopier → `scripts/synk-header.js` synkroniserer nu også `.footer-grid` (ikke `.footer-bottom`, dashboard har egen tekst) og skriver kun de udskiftede stykker (mange sider har blandede CRLF/LF; den gamle version omskrev hele filen: 1400 linjers støj).
4. **Fundet undervejs:** `.mk-tiles` på alle mærkesider var `display:block` (forsidens refaktor fjernede `.tiles-grid`'s grid) → én 1376 px bred flise; rettet i `p-maerke.css`, inkl. labelrækken. Typerækken på kørekort/type/region fylder nu bredden (4/5 spalter ≥1100).

## Før/efter (x for venstrekant: logo / h1 / søgekort / første kort / footer; 1440-viewport: indholdet skal stå på 32..1408)
| side | 1440 før | 1440 efter | 1920 før | 1920 efter |
|---|---|---|---|---|
| forside | 32/32/32/32/**132** | 32/32/32/32/32 | 252/252/252/252/**372** | 252/252/252/252/252 |
| søgning | 32/**132**/**132**/376/**132** | 32/32/32/336/32 | 252/**372**/**372**/616/**372** | 252/252/252/556/252 |
| annonce | 32/600/–/**32**/**132** | 32/600/–/32/32 | 252/840/–/**272**/**372** | 252/836/–/252/252 |
| mærke | 32/**132**/**132**/**24**/**132** | 32/32/32/32/32 | 252/**372**/**372**/**256**/**372** | 252/252/252/252/252 |
| kørekort A2 | 32/**132**/**132**/**132**/**132** | 32/32/32/32/32 | 252/**292**/**292**/**292**/**372** | 252/252/252/252/252 |
| type sport | som kørekort | 32/32/32/32/32 | som kørekort | 252/252/252/252/252 |
| region | som kørekort | 32/32/32/32/32 | som kørekort | 252/252/252/252/252 |
| guides | 32/132/–/132/132 | 32/32/–/32/32 | 252/372/–/372/372 | 252/252/–/252/252 |
| guide | 32/132/132/132/132 | 32/32/32/32/32 | 252/372/372/372/372 | 252/252/252/252/252 |
| login | 32/164/**100**/–/132 | 32/96/32/–/32 | 252/404/**340**/–/372 | 252/316/252/–/252 |
| opret | 32/132/–/–/132 | 32/32/–/–/32 | 252/372/–/–/372 | 252/252/–/–/252 |
| dashboard | 32/132/132/132/132 | 32/32/32/32/32 | 252/372/372/372/372 | 252/252/252/252/252 |
| mine annoncer | 32/132/132/132/132 | 32/32/32/32/32 | 252/372/372/372/372 | 252/252/252/252/252 |
Før: header 32..1408 men indhold på 4 forskellige kanter (24/32/100/132) og footer 132. Efter: **alle 13 sider har indhold, header og footer på samme kant** ved 1024 (32), 1280 (32), 1440 (32) og 1920 (252); højrekant 1408 / 1668. (Annonce-h1 600 og login-h1 96/316 ligger bevidst inde i kolonne/kort. 1280 før: footer 52, mærke-rækken 24; nu 32.) Målt: `C:\Users\pasca\Desktop\rod\scratch-w2\measure.js` (udenfor repoet).

## Verificeret
- Overflow: 16 sider × 8 bredder (320/360/390/768/1024/1280/1440/1920) × lys/mørk = **256 målinger, 0 afvigelser** (`scrollWidth==clientWidth`), og igen efter sidste CSS-ret (dødt CSS prunet, typerække, login) 9 sider × 8 bredder × lys/mørk = **144 målinger, 0 afvigelser**; 0 konsolfejl (på kopi med regenererede sider; dashboard/mine-annoncer med mock-bruger, Supabase-skrivninger afvist). 
- AA: alle tekstnoder i kort, søgekort-labels og footer på søgning, forside, mærke, type, kørekort, region, lys+mørk: **0 under 4,5:1** (flader med kendt baggrund; foto-overlays udeladt).
- Funktion (Playwright): kørekortfilter 655 → 74, sammenlign-bjælke efter 2 valg, hjerte gemmer favorit, listevisning, kort → annonceside, "lignende" (6 kort), kilde-knap, forside 5 kort, opret live-forhåndsvisning tegner kortet, dashboard/mine-annoncer/login indlæses.
- Iterationer (screenshots 1440/1920/390, lys+mørk, 4 runder): 1) container → mærke-fliser gigantiske + tile-label højrejusteret (fundet, rettet); 2) kort: titel/pris brød i smalle kort → prisen under titlen <263 px; 3) typerække og login-kort 1480 vs 1416 → rettet; 4) dødt CSS prunet og alt målt igen.
- `npm test`: **489 pass / 0 fail** (490 før: −2 badge-tests, +1). Ny testfil, ikke i `package.json`: **`js/annoncekort.test.js` (16 tests)** → 505 når den tilføjes. Omskrevet: `js/eksternt-kort.test.js`, `js/rigt-kort.test.js`. `node --check` rent.
- Generatorer (`build-srp/brand/facet/listing`) uændrede og testet på KOPI (`scratch-w2\copy`): producerer det nye kort (soegning 12, mærke 29, type 21, kørekort 24, region 21, model 10 kort; 0 `card-external`). Intet regenereret i worktreen.

## Afviger stadig
- Login (P2-6): højre promo-kort ligger stadig i et halvgennemsigtigt panel over fotoet (designet af login-builderen; ikke rørt, kun bredde).
- Annonce: h1 ligger i midterkolonnen (tre kolonner), mærkesidens "kortrække + CTA-panel" strækker kortene, så der er luft mellem chips og bund.
- 404/afmeld har stadig ingen header/footer (w2-tekst). Tekstsiderne (om, vilkår, sikkerhed) har egne kolonnebredder (w2-tekst/`p-info.css`).
- Mærke-h1 er stadig 26 px under wordmarket (bevidst: wordmarket er den visuelle overskrift); søgningens synlige hero-titel er 50 px (critic målte den skjulte 26 px-linje).
- Aktiv-menu, tal-uoverensstemmelser (49/55, 655/411) og "655 over 0 fundet" er ikke i denne opgave.

## DELT-ØNSKER / til Orchestratoren
1. Tilføj `js/annoncekort.test.js` til `npm test`.
2. Efter merge: kør `build-srp`, `build-brand-pages`, `build-facet-pages`, `build-listing-pages`, `node scripts/synk-header.js --tjek` og `build.js` (CSP-hashes/stempler). De genererede sider i denne branch har stadig det gamle kort-markup og virker først fuldt efter regenerering (gammelt kort-CSS er fjernet).
3. `synk-header.js` har rørt header/footer i alle 66 sider, **også** w2-tekst's (om-bikerbasen, vilkaar, privatlivspolitik, sikkerhed, om-indeksering) — kun header/footer-linjer, så merge bør være rent; ellers kør `synk-header.js` efter merge. (`scripts/forside.test.js` kører `--tjek`.)
4. **Beslutning:** typebilledet på kort uden foto (bestilt i opgaven) modsiger ikke annonceside-løftet "Vi viser ikke en tegning" (gælder galleriet, urørt), men kort og galleri siger nu forskelligt. Bekræft, eller slå det fra med at fjerne `TYPEBILLEDER`-grenen i `listingMediaHTML`.
5. `js/home.js`: `{ rich: true }` fjernet (ingen effekt mere).

## Commits
57ef101 delt kort + tokens · 7bc0767 p-*.css på skalaen + mærke-fliser · c86eda7 menu/footer/synk · (denne rapport + login-bredde).
