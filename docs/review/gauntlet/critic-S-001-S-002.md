# Critic S-001 + S-002 (blind) — commit 702d64c mod b3bc846

Samlet dom: **ACCEPTER** (ingen blokerende fund; 4 ikke-blokerende observationer nederst).

Metode: statisk gennemlæsning af diff, `git archive` af b3bc846 til sammenligning, Playwright (Chromium) mod http://localhost:8700 på alle 64 rod-.html-sider, 360/390/768/1440 px x lys/mørk (tema sat via `bb_theme`, cookie-banner afvist via localStorage). Scripts ligger udenfor repoet. Ingen produktionskode ændret. En simulering af qualifies=false er kørt på en kopi i temp (THRESHOLD=100), ikke i repoet.

## A. SEO-kvalitet kørekortsider — ACCEPTER

| Måling | A1 | A2 |
|---|---|---|
| `<title>` | "Motorcykler til A1-kørekort — Bikerbasen" (40 tegn) | "Motorcykler til A2-kørekort — Bikerbasen" (40 tegn) |
| Søgeord i title | ja | ja |
| Antal h1 (efter JS) | 1: "Motorcykler til A1-kørekort" | 1: "Motorcykler til A2-kørekort" |
| og:title / twitter:title | identiske med title | identiske med title |
| canonical | `https://bikerbasen.dk/koerekort-a1` (uændret) | `.../koerekort-a2` (uændret) |
| sitemap.xml | diff mod b3bc846 tom; begge URL'er med, extensionløse = canonical | samme |
| meta description | uændret, bærer "ikke udelukket ... ud fra de oplyste tal" | samme |
| JSON-LD | BreadcrumbList ("Kørekort A1"), ingen ItemList (som før) | BreadcrumbList ("Kørekort A2") + ItemList (som før) |

Forbeholdet ("gætter aldrig"):
- Det står stadig synligt. På 390 px ligger sætningen "...der ikke er udelukket til et A2-kørekort ud fra det, annoncerne oplyser" lige under h1, over folden (screenshot læst). Titlen er kortere, men h1 + første intro-linje samlet siger stadig "ikke udelukket, ud fra oplyste tal".
- Tallene om uoplyste annoncer og "de vises IKKE her. Vi gætter aldrig." ligger i `<details>` ("Hvad kræver A2 — og hvad vises ikke her?"). Det er uændret fra b3bc846, så ikke en regression. Ordlyden er intakt (A1: 27 mangler, A2: 162 mangler).
- Restrisiko (ikke blokerende): selve h1 og title er nu en ubetinget påstand ("Motorcykler til A2-kørekort"); kun den umiddelbart følgende linje kvalificerer. Acceptabelt, fordi den linje er synlig uden klik og meta description bevarer kvalifikationen. Hvis nogen senere folder introens første afsnit ind, bliver h1 for stærk.
- Breadcrumb-navn ("Kørekort A2") og ItemList-navnet ("Kørekort A2 — Bikerbasen") matcher ikke ordret den nye h1. Det er ikke en regression (ItemList-navnet var det samme i b3bc846) og skader ikke.

Variant under tærsklen (qualifies=false), simuleret med THRESHOLD=100 på kopi: title "Kørekort A1 — Bikerbasen", h1 "Kørekort A1", `noindex, follow`, ingen lov om antal i beskrivelsen, ingen sitemap-tilføjelse. Koden (build-facet-pages.js linje 704 og 788) giver den tynde variant samme titel og h1, så den er sammenhængende. Ændringen gælder kun `qualifies && kind==='koerekort'`; typesider er uberørte.

## B. Footer — ACCEPTER

- 64 rod-.html. 62 har footer. 404.html og afmeld.html har ingen footer (samme i b3bc846).
- Alle 16 unikke footer-hrefs: 16/16 giver 200 lokalt.
- Footer-linkmængden er identisk på 61 sider. To afvigelser, begge fra før: `om-bikerbasen.html` har et ekstra "Om Bikerbasen"-link (selvlink, duplikat; der er også 2 i b3bc846), `dashboard.html` har ekstra tekst "Tallene dækker de seneste 30 dage." (bevidst).
- Intet mistet eller duplikeret ved denne ændring. Alle 61+ har de 5 type-links -> type-*.html og to nye "Kørekort A2"/"Kørekort A1" (sat ind før "Alle mærker").
- Genererede familier (type-, koerekort-, maerke-, model-, region-) henter footer via `siteParts()`. Ved genbyg i en kopi af HEAD kom de nye footerlinks med, så de overlever næste build.
- Layout: 0 footer-elementer uden for viewport på alle sider/bredder/temaer; ingen vandret sidescroll forårsaget af footeren. Footer-screenshots (index, koerekort-a2, type-sport x 4 bredder x 2 temaer) er læst: de to nye punkter står pænt i kolonnen "Kategorier", ingen ombrydning af dem, 1 kolonne på 360/390, 4 kolonner ved 768/1440. På 768 ombrydes "Lys / mørk tilstand" til to linjer (ikke ny; ikke jævnført med b3bc846).
- Siderne dashboard.html og mine-annoncer.html redirecter til login uden session; deres footer er kun statisk verificeret (identisk markup).

## C. Brugerflow — vurdering: OK, ingen funktionstab

- Hver af de 5 footer-type-sider (sport 21, touring 57, cruiser 91, naked 59, adventure 68 annoncer) og begge kørekortsider har: primærknap "Søg i alle ..." til `soegning.html?type=X` / `?koerekort=A1|A2`, "Få besked om nye annoncer" (`&agent=1`), mærkechips, pris- og årgangschips med forudfiltreret søgning samt brødkrumme "Søgning". Brugeren er altid ét klik fra den filtrerede søgning, som footerlinket tidligere gik direkte til.
- Pris: ét ekstra klik for den, der ville have det fulde filter-UI. Til gengæld får brugeren en landing med varer, hvilket er bedre end en filter-skal.
- Alle 5 footer-sider er indekserbare (ingen robots-meta). Kun classic/cross/scooter og region-sjaelland er noindex, og de er ikke footerlinket. Ingen footerlink peger altså på en tynd noindex-side i dag. Skulle en af de 5 falde under tærsklen på 10, bliver den noindex men har stadig CTA, så den er ikke en blindgyde; en noindex-landing er dog et svagt mål for et sitewide footerlink, fordi footeren så pumper link-værdi ind i en side, der ikke må indekseres. Der er ingen test eller build-vagt, der sikrer, at footerens mål forbliver indekserbare. Anbefaling (ikke blokerende): lad build-scriptet advare, hvis en footerlinket facet bliver noindex.
- Type-siderne viser kun de første 24 med "Se alle N i søgningen". Der er ingen funktionalitet, der er forsvundet.

## D. Nye fejl / kvalitetsporte — ACCEPTER

- `npm test`: 344 tests, 344 pass, 0 fail.
- `node scripts/udgiv.js`: består ("_site: 113 filer, 64 HTML-sider", alle referencer peger på filer, der er med).
- CSP: egen sha256-kontrol af alle inline `<script>` mod hver sides CSP (efter CRLF->LF som browseren): kun 404.html afviger, identisk i b3bc846 (404 har ikke CSP-meta). 0 nye.
- Konsol: kun `annonce.html` og `annonce-*.html` giver CORS/401-fejl mod Supabase `haendelse` fra localhost (miljø, ikke footer, samme i b3bc846). En enkelt fejl "Executing inline script violates CSP" på maerke-ktm/maerke-lauge-jensen i batchkørslen kunne ikke reproduceres ved genkørsler (lys/mørk, 360/390) og er sandsynligvis artefakt fra afbrudt navigation efter login-redirect.

## Nye fund (ikke blokerende)

1. **Linjeskift-støj**: commit 702d64c konverterer 13 håndskrevne sider fra CRLF til LF (`git diff --stat` viser 4.753 +/- mod 459/335 med `--ignore-cr-at-eol`; fx soegning.html 1.504 linjer, index.html 1.142). Funktionelt harmløst (hashes passer), men gør diff/blame ubrugeligt for de filer. Repro: `git diff --stat b3bc846 702d64c` vs `... --ignore-cr-at-eol`. 404.html og afmeld.html fik en ren whitespace-ændring ved `<!-- meta:end -->`.
2. **Bagt tal vs. live tal**: title/meta/JSON-LD siger "59" (A2) og "13" (A1) og "162 annoncer mangler", mens JS på siden viser 74 og 17 ved indlæsning (runtime-opdatering af `#facet-intro-antal`/`#facet-antal`), og de foldede "162 mangler"-tal bliver ikke opdateret. Eksisterede før (ikke forårsaget af denne ændring), men gør "vi gætter aldrig"-teksten tilsvarende forældet mellem builds.
3. **Eksisterende vandret overflow**: `om-indeksering.html` har scrollWidth 641 på 390 px (`.legal-content` bliver bredere end viewport), identisk i b3bc846. Siden er footerlinket ("Om indekseringen"), så den nu får mere trafik. `annonce-bmw-r45-...html` svinger mellem 390 og 436 px (også før).
4. **Ingen paritetstest**: footeren er copy-paste i ~60 filer; ingen test låser, at den er ens eller at nye links rammer mål, som findes/er indekserbare. Dette arbejde havde ingen drift, men der er heller ingen vagt.

## Domme

| Krav | Dom |
|---|---|
| A. SEO-kvalitet/titel/h1/forbehold/konsistens | ACCEPTER |
| B. Footer (200, ingen drift, layout, overflow) | ACCEPTER |
| C. Brugerflow/landing | ACCEPTER (anbefaling om noindex-vagt) |
| D. Tests/udgiv/konsol | ACCEPTER |
| **Samlet** | **ACCEPTER** |
