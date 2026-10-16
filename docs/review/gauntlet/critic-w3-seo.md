# critic-w3-seo — blind Critic, branch gauntlet/w3-seo (HEAD 3a76803, baseline c4e8b15)

Metode: kun lokale filer + rene funktioner + mock af fetch (ingen kald til produktion; Playwright blokerede *.supabase.co og bikerbasen.dk). Build-scripts kørt på kopi i temp med mock (`err`, `200 []`, `500`). Post-data-trin (meta/stamp/inline/csp) kørt på kopi for realistisk rendering.

## Dom: ACCEPTER MED BETINGELSER (ingen P0; 2 x P1 i fail-safe/CI, 3 x P2 indhold). Tag BB_TILLAD_FALD/CI-deadlock og model-dubletter før merge til main.

## Verificeret grønt
| Check | Resultat |
|---|---|
| `npm test` | 525/525 |
| `node --test seo-vagt/seo-sider/seo-krav` | 35/35 |
| `node --check js/crawler/scripts` | ok |
| `node scripts/seo-audit.js` | 91 sider, 66 indekserbare, 0 fund |
| Egen sweep (alle 91 html): title ≤60, desc ≤160, 1 h1, ingen dubletter blandt indekserbare, canonical+OG, JSON-LD parser | 0 fund (kun noindex-sider har desc <70 tegn) |
| Sitemap: 65 URL, ingen dubletter, alle filer findes, ingen noindex, canonical = loc, 1 h1 | ok. robots.txt uændret (`Allow: /` + Sitemap) |
| lastmod idempotent: `genberegnLastmod` to gange (anden gang med anden "dato") = identisk med committed sitemap; ledger uændret | ok |
| Fail-safe mock: netværksfejl, HTTP 500, `200 []` stopper listing-, brand- og facet-generatoren med klar fejl før noget slettes; 2 annoncesider/25 mærkesider/65 URL urørt | ok |
| Links: 0 døde `.html`-links; alle 22 nye sider har indlinks (budget 45, by 7, model 13-22, mc 1-3); ingen nye sider er noindex | ok |
| Render 92 (23 sider x 1440/390 x lys/mørk) + 24 med blokeret net: 0 vandret overflow, 1 h1, 0 konsolfejl, 0 AA-fund (egen kontrastmåler, foto-paneler undtaget) | ok |
| Juridik: ingen ændring i crawler/robots/felter. om-indeksering description ("hvilke felter vi gemmer, hvor ofte vi henter, … får os til at holde op") er sand mod sidens tekst og ikke i strid med CLAUDE.md. om-bikerbasen: "udelukkende" fjernet (rigtigt, der er nye mc) | ok |
| Titel/desc på ikke-genererede sider | guide-a2: "gode valg"→"regler og krav" (60 tegn, søgeord "regler"/"krav" bevaret); opret-annonce mister "annonce" i titlen men beholder "Opret en annonce" i desc — neutralt. Ingen forværring |

## Fund

### P1-1: Fail-safe kan blokere hele CI-deploy (deadlock) — ingen vej uden commit
`deploy.yml` kører `node scripts/build.js` ved push til main, uden `BB_TILLAD_FALD`, og `workflow_dispatch` har ingen input. Et `SEO_FALD` får jobbet til at fejle -> `deploy` (needs: build) springes over -> INGEN ændring (tekst, guides, rettelser) kan udgives, så længe faldet består. Siden er sikker (live urørt), men blokeringen er permanent, ikke forbigående.
Reproduktion (funktionstest, mock): `tjekAntal(n, f)`: 0 af 1 THROW, 0 af 2 THROW, 1 af 3 THROW, 2 af 5 THROW, 1 af 2 ok, 300 af 602 THROW, 301 ok.
Legitime udløsere:
- Egne annoncer er i dag 2 (baseline = antal committede `annonce-*.html`). Slettes/sælges begge, eller den sidste af 1: 0 < 50 % -> permanent blok. Små tal gør 50 %-reglen skrøbelig.
- Kilde-opt-out (regel 5 i CLAUDE.md): deaktiveres en stor kilde (f.eks. Gul og Gratis eller MC Syd, som alene står for størstedelen af lageret), kan lageret falde >50 %. Så kan opt-out ikke nå sitet via deploy uden manuel overstyring — det er et juridisk relevant sidespor (annoncer fra en fravalgt kilde bliver stående på de committede/seneste sider).
- Baseline i CI er den COMMITTEDE ledger (`meta.eksterne`=602) og committede `annonce-*`; CI committer ikke ledgeren. En langsom legitim nedgang under 50 % af det sidst committede tal blokerer derfor, selv om hvert enkelt fald er lille.
Fejlbeskeden er klar (dansk, tal, "kør igen med BB_TILLAD_FALD=1"), men nævner ikke CI.
Forslag: (a) tilføj `workflow_dispatch` input `tillad_fald` -> `env: BB_TILLAD_FALD` i build-trinnet; (b) bedre: `build.js` fanger `SEO_FALD`, springer data-trinnene (listing/brand/facet) over, bruger de committede sider og deployer resten med en tydelig annotation/warning (fail-soft, ikke fail-stop); (c) absolut gulv for små tal (fx tillad fald hvis forrige < 10, eller `abs(forrige-nu) <= 3`), (d) opt-out af en kilde skal kunne markeres som bevidst (flag eller kildeliste) så regel 5 aldrig er afhængig af manuel env.

### P1-2: lastmod slår aldrig sig til ro i CI (falsk friskhed)
CI bygger på levende data men committer ikke `sitemap-lastmod.json`. Hver side hvis indhold afviger fra committed hash får `lastmod = byggedag` ved hvert deploy, til nogen committer ledgeren — altså = seneste deploy, ikke seneste ændring (præcis S-011's fejlklasse, nu snævrere: kun sider hvor lageret har flyttet sig). Lokalt/idempotent er det korrekt (testet). Forslag: persistér ledgeren (actions/cache eller commit-trin fra CI) eller accepter og dokumentér. Klassificeret P1 fordi Builderens påstand "datoen rykker kun ved ændret hash" kun holder, når ledgeren committes efter hvert byg. Hvis ikke vurderet P1 af Orchestrator: P2.
Sagligt OK: sider uden historik får ingen lastmod (17 af 65), annoncer bruger `updated_at`/oprettet, guides egen dato. 42 af 65 står som 16.10 — det er sandt (nye/ændrede i dag).

### P2-1: To modelsider er næsten identiske (tynd/dublet)
6-gram Jaccard (kun synlig tekst i `<main>`, uden noscript): CB 650 R vs CB 1000 R = 0,79-0,80, containment 0,95; unikke 6-grams 0-3 %. CB 1000 Hornet vs CB 1000 R 0,59-0,63. CB 650 R har 7 annoncer, hvoraf 4 er identiske (samme dealer-lagerenheder: "114.995 kr. Ny 2023 …"), alle fra MC Syd, FAQ siger "Hvad koster en BRUGT Honda CB 650 R" om fabriksnye (titel "Fabriksnye" er rigtig; FAQ er forkert). Øvrige modelsider 0,44-0,60, 15-24 % unikt.
Builderens påstand (≤26-48 %) holder IKKE med min måling (66-80 % for budget, op til 80 % for model; by 27-46 %, mc 30-40 %); forskellen er sandsynligvis at deres tal er mod "nærmeste side" uden listekort. Tæller man kun kortene med, er ligheden endnu højere.
Anbefaling: model-siderne til noindex hvis <3 distinkte annoncer eller ens priser/årgange (CB 650 R: 114.995-119.995, ens enheder); sæt model-tærskel til ≥5 DISTINKTE annoncer (dedup på pris+årgang+km+kilde). Ret FAQ-ordet "brugt" når alle er nye.

### P2-2: Budget-siderne kannibaliserer hinanden
30k ⊂ 50k ⊂ 75k ⊂ 100k (55/104/166/262). Containment i den næste: 0,78-0,87, unikke 6-grams 6-13 %. Intentionerne er forskellige ("under 30.000" vs "under 50.000"), så behold, men unik tekst er lav; kortene er ens delmængder. Kantcase: fra "højst X" medtages priser helt ned til 1.900 kr. ("Priser fra 1.900 kr." står i meta description på budget-30000/50000) — sandsynlig outlier/fejlpris i kilden som bliver sidens salgsløfte. Anbefaling: behold; udeluk priser <~5.000 kr. fra "fra"-tallet i description eller brug median; evt. kun 30k/50k/100k (4 nested sider på 604 annoncer er i overkanten).

### P2-3: By-sider — svage fam. og tærskel uden hysterese
- by-farum (10), by-skive (21), by-noerresundby (12): 100 % fra én privatannonce-kilde (Gul og Gratis), 995-1.520 ord, 20 % unikke 6-grams. Private annoncer er flygtige: farum står præcis på tærsklen 10 -> siden vil flippe index/noindex og ind/ud af sitemap hver crawl. by-thorsoe (74) er ét forhandlerlager (Rydbergs MC); by-horsens (43) to kilder.
- Ærlighed: siderne siger det selv ("Søgningen filtrerer på landsdelen Midtjylland", knap "Se hele Midtjylland i søgningen", ingen by-filtre/chips der lover mere). Ikke vildledende. Intentionen "motorcykel Horsens/Thorsø" opfyldes af listen; "Skive/Farum/Nørresundby" er marginale.
- Anbefaling: behold Thorsø + Horsens; sæt by-tærskel til ≥20 og/eller ≥2 kilder, og indfør hysterese (opret ved ≥15, nedlæg først ved <8) så sitemap ikke flapper. Farum og Nørresundby -> noindex (følger/bevarer fil).

### P3
- ItemList på budget-sider har `numberOfItems:1` (kun egne annoncesider, BMW R45) mens siden viser 55-262 -> inkonsistens mod synligt indhold; typesider har ingen ItemList. Overvej at udelade eller liste de viste kort.
- Chips fra budget-/type-/regionssider peger på noindex-sider (type-scooter/classic/cross, region-sjaelland) — eksisterende mønster, `noindex, follow`; ikke ny regression. `data-maerkesider`/mærke-chips til noindex mærker kun fra maerker.html.
- Fail-soft: 60 % delvis hentning passerer garden og flytter model/by/mc-sider nær tærsklen til noindex og dropper op til 40 % af sitemap midlertidigt (sitemap-gulv 50 %). Acceptabelt; kunne tage et mere stramt gulv (70-80 %) til sitemap.
- Mærkesidernes type-fliser -> `mc-*` sker først ved fuldt byg (relinkMaerkesider). Rækkefølgen i build.js er listing -> brand -> facet -> guides -> srp -> meta -> stamp -> inline -> csp: korrekt og konsistent (ønske 4 allerede opfyldt). Committede mærkesider peger derfor endnu ikke på mc-* (kun 1-3 indlinks pr. mc, via typesider) — løses af CI-byggets fulde kørsel; mc-harley-davidson-cruiser og model-suzuki-vlr-1800 har kun ét indlink (type-cruiser). Tilføj gerne link fra mærkesiderne.
- Forsidens linkbånd: 4 budget + 5 byer + 8 modeller, ingen tak; fint nu.
- Datakilde-koncentration: alle mc-*/budget/model-sider er overvejende MC Syd-lager; sidernes `Annoncerne er indekseret fra …` er ærlig om det.

## Indeksbloat-vurdering
43 -> 65 URL (+51 %) på 604 annoncer. Proportionalt kun hvis siderne har egen intention og egen tekst. Familierne:
| Familie | Sider | Unik tekst | Intention opfyldt | Anbefaling |
|---|---|---|---|---|
| budget-under-* | 4 | 6-13 % (nested), 1.300-1.700 ord | ja ("motorcykler under 50.000 kr.") | BEHOLD (evt. drop 75k hvis bloat er et problem) |
| by-thorsoe, by-horsens | 2 | 18-28 % | ja | BEHOLD |
| by-skive | 1 | 21 %, én privatkilde | delvis | BEHOLD VILKÅRLIGT / hellere noindex indtil ≥20 |
| by-farum, by-noerresundby | 2 | 20 %, ét kilde, 10-12 annoncer, flygtig | svag | NOINDEX (flapper) |
| model (9 nye) | 9 | 0-24 % | CB 650 R/CB 1000 R dublet; resten ok | BEHOLD 7; CB 650 R + CB 1000 R -> noindex eller sammenlæg, indtil de har distinkt indhold |
| mc-honda-cruiser/naked/touring, mc-harley-davidson-cruiser | 4 | 20-30 % (vs type/mærke 30-40 % Jaccard) | ja, men tredje vej ind til samme lager | BEHOLD (kun 15+ og ≤75 % andel er en god spærre) |

## Tærskel-kantcaser (kørt som egne fixtures)
0/1/3/9 annoncer -> ingen side eller "for-faa" (noindex). 10/11 alle i samme by -> "region-dublet" (≥80 % af landsdelen) -> ikke indekserbar. Ingen priser -> `harIndhold` falsk -> afvist ("tyndt-indhold"). 2 priser -> falsk. Pris=0/"abc" tæller ikke i budget. Åbne familier bygges kun når kvalificerede, eksisterende filer går til noindex, aldrig 404. Ingen kant giver tom indekserbar side; rest-risiko er flapping ved grænsen (se P2-3).

## Artefakter
Scripts og målinger ligger udenfor repoet i `%TEMP%\w3crit_mock` (shingle.js, sm.js, links.js, sweep.js, render2.js, mock.js). Worktree urørt; dev-servere på 8774/8775 stoppet pr. port.
