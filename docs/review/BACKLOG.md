# BACKLOG — findings

Fire akser: **SEO**, **design**, **funktionalitet**, **kodefejl**.
Tre roller: `designer` (D-), `critic` (C-). `dev` retter og skriver aldrig
findings her.

## Severity

| | Betyder |
|---|---|
| **P0** | Data lækker, penge eller adgang på spil, eller siden er brækket for brugeren |
| **P1** | Funktionalitet virker ikke som lovet, en påstand på siden er falsk, eller AA brydes |
| **P2** | Mærkbar risiko eller forbedring med konkret konsekvens |
| **P3** | Kosmetisk eller teoretisk |

## Status

`åben` → `valgt` (taget med i en runde) → `rettet` (dev melder færdig) →
`verificeret` (critic har efterprøvet) eller `genåbnet` (den var ikke løst).
`afvist` kræver en begrundelse i `DECISIONS.md` — ikke bare et ord her.

---

## Runde 1 — audit

Auditeret 17.08.2026 på commit `4a33b41`. 31 findings: 0 × P0, 12 × P1, 13 × P2, 6 × P3.

**Fuld dokumentation** — reproduktion, målinger og forslag — står i
[runde-1-critic.md](runde-1-critic.md) og [runde-1-designer.md](runde-1-designer.md).
Tabellen her er indekset; beviset bliver hos findingen, fordi 34 KB
reproduktionstrin i én tabelcelle ikke kan læses af nogen.

**Verifikation af runde 1** — hvad der blev efterprøvet og hvordan — står i
[rounds/round-1.md](rounds/round-1.md). Fem findings blev behandlet: fire holder,
én er genåbnet.

| ID | rolle | akse | sev | fil | problem | status |
|---|---|---|---|---|---|---|
| C-011 | critic | funktionalitet | **P1** | `crawler/db.js:255 (bortemarkeringVurdering), crawler/borte.test.js:65-72` | Et selector-skift hos kilden kan tømme hele kataloget | **rettet** (2. gang) — se note nedenfor |
| C-014 | critic | seo | **P1** | `scripts/shared.js:39-64 (fetchListings)` | Produktionssitet har 7 indekserbare adresser og NUL annonce- eller mærkesider | åben |
| C-015 | critic | seo | **P1** | `js/seo.js:191-205 (seoSearchResults)` | Søgesidens struktureret data peger på 404'ere | åben |
| D-001 | designer | design | **P1** | `css/styles.css:456-462 (mobil) og :428-439 (desktop)` | Hero-scrimmens lyseste punkt ligger præcis under teksten | **rettet** — og bredere end fundet: 800px var værre end 390px (h1 1,90:1), se noten nedenfor |
| D-002 | designer | design | **P1** | `css/styles.css:815 + :795, js/components.js:439-442` | Prishierarkiet er vendt om på 87 % af lageret | **rettet** |
| D-004 | designer | design | **P1** | `js/annonce.js — videreKortHTML() / den eksterne gren; css/styles.css .listing-next` | På den eksterne annonceside konkurrerer væk-CTA'en med ingenting — den vinder ved walkover | åben |
| D-005 | designer | design | **P1** | `js/home.js:475 og :499 (gaten), index.html #newest-sub` | I drift påstår forsiden en dato, vi ikke har | åben |
| D-007 | designer | design | **P1** | `css/styles.css:1963` | .safety-banner-sep{ opacity:.4 } — samme fejl som .facet-n, et andet sted | **rettet** |
| D-013 | **ejer** | design | **P1** | `js/components.js externalCardHTML(), js/search.js externalRowHTML(), css/styles.css .card-external-cta + .row-cta` | Kortet havde stadig en genvej ud af sitet: "Se annoncen hos MC Syd" (304×24 px, ny fane, direkte til kilden) sprang vores egen annonceside over. Vejen ud skal gå IGENNEM den — ejerens ord: "inden vores side viderestiller udbyder af annoncen skal man klikke ind på min annonce, også kan man trykke på knappen til at komme videre" | **rettet** |
| C-002 | critic | sikkerhed | **P2** | `supabase/016_luk_skrivehul.sql:31-43` | Hullet er lukket, men fabrikken kører videre | åben |
| C-003 | critic | sikkerhed | **P2** | `supabase/016_luk_skrivehul.sql:155-160` | profiles har stadig INSERT og DELETE til anon | åben |
| C-004 | critic | sikkerhed | **P2** | `js/components.js:569 + reports-tabellen` | Anonym, ubegrænset skrivekanal til produktionsdatabasen | åben |
| C-005 | critic | sikkerhed | **P2** | `krav-tabellen, INSERT-politikken "krav: opret eget"` | Claim-flowet kan selvgodkendes på papiret | åben |
| C-007 | critic | kodefejl | **P2** | `js/bike-art.js:90, indlæst fra 12 HTML-sider` | 8,2 kB død JavaScript på hver side | åben |
| C-008 | critic | kodefejl | **P2** | `js/supabase-api.js:384 + js/backend-bridge.js:411-424` | En slugt fejl kan tømme brugerens gemte annoncer | **rettet** — se note nedenfor |
| C-012 | critic | funktionalitet | **P2** | `crawler/pipeline.js:103-122` | Ingen afbrydelse ved gentagne 4xx | **rettet** (`045c579`) — 332 kald → 5 |
| C-013 | critic | funktionalitet | **P2** | `crawler/config.js:130-131` | De juridiske spærrer er attestationer, ikke kontroller | **rettet** (`cd42a4b`) — se note nedenfor |
| C-016 | critic | seo | **P2** | `js/seo.js:118 og :145` | Struktureret data påstår et foto, siden selv nægter at påstå: jsonld-vehicle erklærer og-image.png som om det var motorcyklen | **rettet** (`57777f1`) |
| D-008 | designer | design | **P2** | `js/components.js:428-457 (eksternt kort, ingen .fav-btn)` | Favoritfunktionen har i drift ingenting at virke på | åben |
| D-009 | designer | design | **P2** | `maerker.html (genereres af scripts/build-brand-pages.js)` | Mærkeindekset er 73 % blindgyder, og det taber to mærker, der HAR lager | åben |
| D-010 | designer | seo | **P2** | `maerker.html, sitemap.xml` | Følger af D-009, men det er et selvstændigt forhold: mærkeindekset udstiller 44 interne links til søgeresultater med nul indhold | **rettet** (`e8f2e60`) — C-014 løste kun halvdelen, se noten nedenfor |
| D-011 | designer | design | **P2** | `css/styles.css:749-916 (.card-external), js/components.js eksternSpecs()` | De to korttyper i samme liste har to forskellige rytmer | åben |
| C-006 | critic | sikkerhed | **P3** | `unsubscribe_saved_search` | Otte af ni funktioner i public blev hærdet til search_path="" af 016 | åben |
| C-009 | critic | kodefejl | **P3** | `js/opret-annonce.js, byte-offset 7334` | En rå NUL-byte gør filen binær for git og grep | **rettet** (`381f0b8`) |
| C-017 | critic | seo | **P3** | `js/seo.js:191` | Søgesidens <title> og meta description er identiske på hver facet | **rettet** (`687e5f9`) |
| C-018 | critic | seo | **P3** | `alle 14 HTML-sider, <html lang="da">` | Specifikationen siger lang="da-DK"; sitet har lang="da" på alle fjorten sider (efterprøvet) | **afvist** — begrundelse og syv målinger i [DECISIONS.md](DECISIONS.md) |
| C-019 | critic | seo | **P3** | `js/search.js:1695-1727` | Der er ingen noindex på et søgeresultat med nul træf | åben |
| D-012 | designer | design | **P3** | `js/search.js — tomtilstandens hjælpetekst` | soegning.html?q=zzzzqqq (nul træf, ét aktivt filter = frisøgningen) skriver "Prøv at fjerne et filter eller udvide dit prisinterval" | åben |

### Udvidet i runde 2 — D-001 gjaldt flere bredder end de målte

Auditten målte 390 og 1440. Ved implementeringen blev der målt på 390, 760,
800, 1024 og 1440 i **både lys og mørk tilstand**, og 800px viste sig at være
værre end 390: `h1` **1,90:1** mod krav 3, og brødteksten **1,39:1** mod krav
4,5. Årsagen er den samme som findingen beskriver, bare mere generel: den
vandrette scrims stop stod i **procent af vinduet**, mens teksten er 720px
bred og starter ved containerens venstre kant — altså låst på 752px ved alle
bredder under 1240. 1440 er tilfældigvis den ene bredde, hvor procenten
næsten passer. Stoppene følger nu tekstspalten. Tal før/efter for alle ti
kombinationer står i commit-beskeden til `fix(design): D-001`.

Samtidig fejlede `p.lead` på desktop (4,07:1 ved 1440) uden at stå i
findingen. Den er dækket af samme rettelse.

**Ikke rettet, med vilje:** `.brand-mark` ("basen" i logoet, `--color-primary`
over hero-fotoet) måler 1,18:1 før og 2,62:1 efter. Det er et logotype, og
WCAG 1.4.3 undtager tekst, der er en del af et logo eller et varemærkenavn.
Den er nævnt her, så næste sweep ikke bruger tid på at genfinde den.

### D-010 — hvad C-014 løste, og hvad den ikke gjorde

Efterprøvet før noget blev rettet, fordi C-014 kunne have lukket findingen.
**Halvdelen var lukket:** grid'en "Mærker med annoncer nu" er ny, de 18 mærker
med lager har hver sin side, alle 18 er i sitemappet, og `Sym` og `Rewaco` —
de to, findingen sagde manglede en indgang — står der nu.

**Den anden halvdel stod urørt.** Sektionen "Alle mærker" nedenunder linkede
stadig alle 60 kendte mærker til `soegning.html?brands=X`, og målt mod drift
(332 indekserede, 0 egne) gav **44 af de 60 nul træf** — nøjagtig det tal,
findingen navngav. C-014 lagde noget nyt ovenpå; den fjernede ikke blindgyderne.
Det er værd at holde fast i som mønster: en finding kan se løst ud, fordi det,
den bad om, er kommet til — uden at det, den klagede over, er gået væk.

De 43 (ikke 44 — `SYM` faldt bort, fordi den er samme mærke som lagerets `Sym`)
nævnes stadig på siden, som tekst. Tallene står i commit-beskeden til
`fix(seo): D-010`.

### Note til C-008 — hvad der IKKE er med

Rettet i `js/supabase-api.js` (`listFavorites()` returnerer nu `{ ids, error }`)
og `js/backend-bridge.js` (`syncFavorites()` skriver ikke ved en fejlet
læsning, og sammenfletningen er en union). Målt mod HEAD-versionen med en
attrap: tre favoritter ind, **én** ud. Efter: tre ud. Låst i
`js/favoritter.test.js`.

Findingen beder også om en **toast, når et hjerte ikke kunne gemmes** —
`Store.toggleFavorite()`, `js/store.js:72`, hvor DB-fejlen ender i
`console.warn`. Den del er **ikke lavet**: `js/store.js` lå uden for denne
agents flade i runden. Den er stadig åben og hører til findingen.

### Note til C-013 — hvad der er et valg og ikke en rettelse

Robots-kontrollen **springer en spærret liste-URL over** og kører videre på
resten; først når ALLE er spærrede, afvises kilden. Alternativet — at ét
`Disallow` på én mærkeside stopper hele kilden — er strengere, men kan
lukke en kilde ned på en regel, der ikke handler om os. Valget står i
[DECISIONS.md](DECISIONS.md) og bør bekræftes af mennesket.

### Genåbnet i runde 1 — C-011

Værnet fra `baa7add` gør det, dev siger: fundet=0 og fundet=100 sender ikke et
UPDATE, grænsen er 60 % af maksimum, og den ligger i `db.js`. Findingen er
alligevel ikke løst, fordi værnet har en omvej, det selv laver:

`crawler/pipeline.js:216` afslutter også en kørsel, hvor markeringen blev
sprunget over, så den lander i `crawl_koersler` med `fundet: 0`. Efter tre
nul-kørsler er historikken `[0,0,0]`, og `bortemarkeringVurdering()`
(`crawler/db.js:255`) filtrerer med `.filter(n => n > 0)` — nullerne ryger ud,
`kendte` er tom, og den tomme mængde læses som "ny kilde, intet at sammenligne
med" → `tilladt: true`. Fjerde kørsel behøver at finde ÉN annonce, og så sendes
`update {status:'borte'}` på 327 af 332 rækker. Efterprøvet mod den rigtige
`db.markerBorte()` med en attrap-klient, ingen database rørt:

```
fundet=0  historik=[332,332,332]  -> BLOKERER
fundet=0  historik=[0,332,332]    -> BLOKERER
fundet=0  historik=[0,0,332]      -> BLOKERER
fundet=1  historik=[0,0,0]        -> UPDATE SENDT, 327 raekker
```

`crawler/borte.test.js:65-72` asserterer netop den omvej som ønsket adfærd, så
testen låser hullet fast. Koden kan ikke skelne "ny kilde uden fund" fra "kendt
kilde med 332 rækker, hvis parser brækkede for tre kørsler siden" — de to giver
samme historik. Det tal, der kan skelne dem, er antallet af aktive rækker for
`kilde_id`: nul for den nye kilde, 332 for MC Syd.

Fuld reproduktion, tallene for den gradvise udhuling (332 → 27 over fjorten
kørsler) og resten står i [rounds/round-1.md](rounds/round-1.md).

#### dev, 2. rettelse — status `rettet`

`bortemarkeringVurdering()` dømmer nu mod **det højeste af to tal**: største fund
i de sammenlignede kørsler OG kildens antal aktive rækker, hentet i
`markerBorte()` med samme filter som opdateringen selv bruger. "Der er intet at
falde fra" er dermed ikke længere udledt af kørselshistorikken, men af rækkerne
— nul for en ægte ny kilde, 332 for MC Syd. Argumentet er obligatorisk;
funktionen kaster, hvis det udelades, så værnet ikke kan slås fra ved en
forglemmelse. Kan rækkerne ikke tælles, markeres der ikke.

Nullerne skrives stadig til `crawl_koersler` — en kørsel, der er sket, skal
kunne ses — men de kan ikke længere læses som "ny kilde".

`crawler/borte.test.js:65-72` er skrevet OM, ikke udvidet: testen, der
asserterede omvejen, er erstattet af to, der holder de to tilfælde op mod
hinanden (`[0,0,0]` + 0 rækker → tilladt; `[0,0,0]` + 332 rækker → nægtet).
Filen kører desuden den rigtige `markerBorte()` mod en attrap-klient og
asserterer, om der overhovedet sendes et UPDATE.

Den gradvise udhuling: referencevinduet er udvidet fra 3 til 12 kørsler, så de
fem 40 %-trin koster 49 kørsler i stedet for 13. Det er stadig en
hastighedsbegrænser og ikke et gulv — begrundelsen for, at der ikke sættes et
absolut gulv, står i [DECISIONS.md](DECISIONS.md) og tallene er låst i testen.

---

## Lukket

<!-- Verificerede findings flyttes herned med rundenummer, så tabellen ovenfor
     kun viser det, der stadig er i spil. -->

Verifikationen af hver af dem står i [rounds/round-1.md](rounds/round-1.md).

| ID | rolle | akse | sev | rettet i | status | verificeret |
|---|---|---|---|---|---|---|
| D-003 | designer | design | **P1** | `6ab87fe` | **verificeret** (runde 1) | Rigtigt museklik midt på kortet → `annonce.html?id=<uuid>`, vores side tegner den eksterne annonce med kørekortdommens regnestykke. Klik på CTA-linjen → ny fane til mcsyd.dk. Kilde-CTA'en måler 310×24 px = 3,60 % af kortet; ordlyd, `target="_blank"` og `rel="noopener noreferrer nofollow"` uændret. Samme i listevisning (`row-link` intern, `row-cta` 101×24 ekstern) og i swipe-visningen |
| C-001 | critic | sikkerhed | **P1** | `6d150fb` | **verificeret** (runde 1) | `_site` = 60 filer, 14 HTML-sider. `supabase/`, `crawler/`, `sources/`, `work/`, `docs/`, `.claude/`, `.github/`, `scripts/` alle fraværende; nul `*.test.js`; alt siderne refererer er med. Værnet afprøvet på en `git archive`-kopi: exit 1 med navn på den manglende fil i fire ud af fire prøver. DRIFT målt 19:07:51 (4½ min efter push 19:03:27): alle fem læk **404**, sitets egne filer 200, og drift-md5 = `4e518a0` |
| D-006 | designer | design | **P1** | `5ca02d8` | **verificeret** (runde 1) | Rigtige tastetryk på `annonce.html?id=1021`, 390×844: 35 × Tab og 42 × Shift+Tab, **nul** fokusringe dækket af header eller bjælke. "Alle BMW til salg" lander y 399-437, overlap 0 begge veje. Scopet holder: `scroll-padding-top: 68px` på alle 15 sider i to viewports, `scroll-padding-bottom: 76px` KUN på annoncesiden med synlig bjælke — `auto` på de øvrige, på den eksterne annonceside og ved 1280px. Separat, dev's egen disclosure: cookiebanneret (187 px, fixed, alle sider ved første besøg) skjuler 5 af 30 Tab-stop — noteret i rounds/round-1.md, ikke en del af D-006 |
| C-010 | critic | funktionalitet | **P1** | `f7dbe76` | **afvist — accepteret** (runde 1) | Sammenlægningen er afvist, kommentaren skrevet om. Alle elleve tal i DECISIONS.md genmålt uafhængigt og reproducerer præcist: 332 aktive, 0 uden `fingerprint`, 0 af 332 uenige med lokal genberegning, 238 unikke, 41 grupper / 135 rækker / 40,7 %, største gruppe 13, 128 med `stand: 'ny'`, 41 af 41 med forskellige `kilde_annonce_id`, med `km` 37/126. `kilder` har én række (MC Syd), alle 332 samme `kilde_id`. Konklusionen følger: 13 × Honda CMX 1100 D Rebel 2024 med 13 lagernumre er 13 maskiner. Findingens kerne — et løfte uden logik — er lukket af den omskrevne kommentar plus test |
