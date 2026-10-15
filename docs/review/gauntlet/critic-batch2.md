# Critic batch 2 — blind verifikation (HEAD ad13786 + docs-commits vs b3bc846)

Metode: Playwright mod lokal server (HEAD, port 8700) og et git-worktree af b3bc846 (port 8703). Lager: 655 annoncer.
`npm test` 364/364 grønne; `node --check` på alle js/crawler/scripts OK; `node scripts/build.js` efterlader ingen tracked-diff; `node scripts/udgiv.js` OK ("Alle referencer ... _site er klar"). Ingen produktionskode ændret af Critic.

## Samlet dom pr. krav

| Krav | Dom | Kort |
|---|---|---|
| 1 Fritekstsøgning | **ACCEPTER** (med 3 mindre fund F1-F3) | alle påkrævede søgninger giver træf; nonsens 0 + venlig tom-tilstand; tom = 655; forside = søgeside (samme `Filtrering.anvendFiltre`) |
| 2 noindex på annonce.html | **ACCEPTER** | kun annonce.html er tilføjet; sitemap uden annonce.html |
| 3 "kr.." | **ACCEPTER** på kravet som formuleret; **NF-1 åbent (middel)** | 0 forekomster; men mærkesidernes "Mere om udvalget"-split er semantisk brudt |
| 4 Vandret overflow | **ACCEPTER** | 0 px overflow på alle bredder/temaer; desktop-grid identisk |
| 5 Regression | **ACCEPTER** | tests, udgiv, ingen JS-fejl (kun lokal CORS/ekstern billedfejl) |

## 1. Fritekstsøgning

Antal (brand+model, `Filtrering.anvendFiltre`), identisk på forsidens hint ("Din søgning matcher N annoncer") og soegning.html `#results-count` (målt via UI: forside -> submit -> søgeside):

goldwing 24 (GL1800 20 + GL1500 3 + GL1100 1) · gl1800 20 · cb500 7 · cb 500 9 · cbr650r 7 · r1250gs 1 · bmw gs 5 (R1250GS, F850GS, R1300GS x2, G310GS) · harley davidson 78 · hd 78 · tenere 5 · mt09 3 · mt 09 3 · honda rebel 43 · nc750x 14 · asdfgh 0 (tom-tilstand: "Der er ingen match på "asdfgh". Prøv et kortere søgeord") · tom 655 · "  goldwing  " / GOLDWING / "GoLd   WiNg" / gold-wing / Ténéré / tenère = samme tal som grundformen · æ 2, ø 4.

- Specialtegn/regex-injektion: `.*`, `[`, `(`, backslash, `a+`, `<script>`, `a&b=c`, `%` kaster ingen fejl (ingen RegExp på brugerinput; kun `includes`). `<script>` står escapet i tom-tilstanden. 3000 x'er: 0 træf, ingen crash. Ydelse 0,3 ms pr. kald.
- Kombination med filtre: q=honda + koerekort=A2 -> 35; q=goldwing + A2 -> 0 (Gold Wing er >A2, korrekt udelukkelse; tom-tilstand "Ingen annoncer matcher dine filtre"); q=cb500 + A1 -> 0; q=honda+rebel + type=cruiser -> 35; q=harley davidson + maxPrice=100000 -> 5.
- URL/tilbage: forside -> ?q=goldwing; skrivning i søgefeltet opdaterer ?q= (replaceState); filterrydning pusher; tilbage/frem gendanner URL, tal og feltværdi; tilbage fra søgesiden lander på forsiden.
- Ingen JS-fejl.

### Fund (alle lave, ingen blokerer)
- **F1 (lav) Cross-ord falske positive.** Haystack er `brand model` med alle mellemrum fjernet, så en forespørgsel kan matche hen over ordgrænsen. `gs` matcher "Harley-Davidson FLHRXS Road Kin**g S**pecial" (33 træf; 32 reelle ord-træf); `dg` -> Road Glide x2 + Goan Classic ("Roa**d G**lide"); `dd` -> Dyna Super Glide; `ks` -> "Phantom Blac**k S**torm Grey"; `ox` -> "Kymco **x** town" (Kymco+x). Gammel `includes` på tekst med mellemrum kunne ikke det. Rettelse: match hvert søgeord mod hvert enkelt ord, og kun mod den sammenskrevne streng når søgeordet er >=4 tegn eller indeholder et ciffer.
- **F2 (lav) Rene symbol-søgninger.** `-`, `[`, `(`, backslash, `&`, `%`, `_` giver 655 (alt) *med* en søgechip der siger fx "-" — før var `-` 102 (substring), nu "alt". Chip og resultat er i uoverensstemmelse. Foreslået: behandl ord-løs q som tom (ingen chip) eller som 0 træf.
- **F3 (lav) Rangordning og korte søgeord.** Ingen relevansrangering; resultater følger den valgte sortering. `a` 539/655, `r` 435, `h` 472, `d` 440, `5` 195, `1` 263 — 1-tegns søgning er i praksis "alt". `cb 500` (9) tager CBR 500 R med, men `cb500` (7) gør ikke; `c b 5 0 0` giver 58. Forslag: min. 2 tegn, eller rangér ord-start-træf øverst.
- Note: søgning dækker kun brand+model (ikke titel); 7 annoncer med tom model (fx "Honda ") findes kun via mærke. Uændret fra før.
- Note: Chromium-siden crashede to gange tilfældigt ("Page crashed") under tunge testkørsler; ikke reproducerbart ved 3 gentagelser pr. URL på HEAD og base — vurderet som miljø-flake.

## 2. noindex
- `annonce.html` og `_site/annonce.html`: `<meta name="robots" content="noindex, follow">` (1 stk.).
- Sammenlignet alle rod-html mod b3bc846: nøjagtigt ét tillæg (annonce.html). Øvrige noindex-sider er identiske med før (404, afmeld, dashboard, login, mine-annoncer + 13 tynde mærkesider, region-sjaelland, type-classic/cross/scooter) — alle pre-eksisterende.
- index, soegning, maerke-honda/bmw/..., type-adventure/..., koerekort-a1/a2, region-hovedstaden/..., model-*.html og begge statiske annonce-*.html har ingen robots-meta (indekserbare, som før).
- sitemap.xml: 38 `<loc>`, 0 forekomster af `annonce.html` (og ingen noindex-sider); `_site/sitemap.xml` ligeså.

## 3. "kr.."
- `grep "kr\.\." *.html` -> 0 i roden og i `_site`. Ingen andre `..`-forekomster i brødtekst, ingen `m.fl..`.
- Alle `<p class="brand-intro">` på alle maerke-/model-/type-/region-/koerekort-sider slutter på ét punktum; FAQ-JSON-LD ("... til 94.995 kr. Prisen afhænger ...") har ét punktum og stort bogstav efter. Tjekket: hyosung ("... til 27.800 kr."), kymco ("... til 47.900 kr."), model-honda-nx-500, honda, bmw, ktm, aprilia, sym, victory, model-honda-gl-1800-gold-wing m.fl. Årgangsled: "til 5.000 kr., årgang 2010." OK.

### NF-1 (middel; pre-eksisterende, men synlig i netop de sætninger S-008 rørte) — mærkesidens intro deles midt i en sætning
`scripts/build-brand-pages.js` ca. linje 807: `introTal.search(/\.\s/)` splitter ved *første* ". " — som er forkortelsen "kr. " i "fra 4.000 kr. til 609.995 kr.". Resultat på maerke-honda, bmw, ktm, aprilia, harley-davidson, kawasaki, royal-enfield, suzuki, triumph, yamaha: det synlige afsnit ender "…fra 4.000 kr." og det foldede "Mere om udvalget" begynder "Honda er verdens største … Gold Wing-tourere. til 609.995 kr., med årgange mellem 1963 og 2026. …" (mærketekst indsat midt i prisintervallet). Identisk på b3bc846, så ikke indført nu, men "sætninger skal stadig ende korrekt" er ikke opfyldt i substansen; Builder tjekkede kun slut-punktummet. Rettelse: splitt ikke på "kr. ", eller læg `arvSaetning` EFTER hele intro-sætningen (inkl. "til Y kr.").

## 4. Vandret overflow (V-001)
Målt `documentElement.scrollWidth` vs `clientWidth` ved 320/360/375/390/414/768/1024/1440, lyst og mørkt:

| Side | Resultat |
|---|---|
| annonce-bmw-r45-1979-59d3a9a1.html | 16/16 kombinationer sw==cw (0 px overflow) |
| annonce-harley-davidson-flhx-2007-541ad405.html (ingen fotos) | 16/16 ok |
| annonce.html?id=59d3a9a1-9e64-4ad3-a6c8-6f17554c7707 (samme BMW, JS-renderet) | 16/16 ok |
| annonce.html?id=1001 (intern demo) | 16/16 ok |

- Før (b3bc846) ved 390: `.listing-detail` spor 404 px, galleri 436 px bredt, sidebar 404 px. Nu: spor 358, galleri 390, sidebar 358.
- Galleriets kontroller (hjerte, prev/next, tæller) ligger inden for både galleri og viewport på alle bredder (320: tæller 257-308, next 268-308, hjerte 264-308, prev 12-52; ingen klip).
- Thumbnail-striben: `overflow-x:auto`, scrollWidth 436 > clientWidth 320-414, og programmatisk `scrollLeft=50` virker; >=768 passer alle 5 thumbs.
- Desktop uændret: galleri-, detalje-, sidebar- og h1-rektangler HEAD vs b3bc846 ved 1024 og 1440 for alle tre sider er identiske; kolonner `571.062px 356.938px` / `704px 440px` uændret. Eneste forskel er dokumenthøjde +67-68 px, som ligger i footeren (to ekstra typelinks fra commit 702d64c), ikke i V-001.
- Screenshots HEAD vs base ligger i Critics scratchpad; visuelt tjekket 390 og 1440.

Pre-eksisterende, ikke V-001: en meget lang uafbrudt q-streng (3000 tegn) giver 24 924 px scrollWidth i søgesidens tom-tilstand — identisk på b3bc846. Lav; `overflow-wrap:anywhere` på den linje løser det.

## 5. Regression
- `npm test`: 364 tests, 364 pass, 0 fail (inkl. ny `js/soegeord.test.js`).
- `node scripts/udgiv.js`: OK. `_site/js/filtrering.js` indeholder det nye alias; `_site/annonce.html` har noindex.
- Konsol (forside, søgning, søgning?q=goldwing, mærkeside, statisk annonce, annonce.html?id=): ingen `pageerror`. Støj: `requestfailed` på et eksternt Gul og Gratis-billede; på annonce-sider CORS/401 mod Supabase `functions/v1/haendelse` fra localhost (målehændelse; kun lokalt miljø, ikke ændret af batchen).

## Anbefalede opfølgninger (ingen blokerer ACCEPT)
1. NF-1 (brand-intro split) — middel.
2. F1 + F2 i `js/filtrering.js` (`soegeNoegle`/ord-match) — lav, billig.
3. F3 min. søgelængde/rangering — lav.
