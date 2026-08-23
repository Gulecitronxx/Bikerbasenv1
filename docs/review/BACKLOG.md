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
| C-007 | critic | kodefejl | **P2** | `js/bike-art.js:90, indlæst fra 12 HTML-sider` | 8,2 kB død JavaScript på hver side | **delvist rettet** — de elleve statiske sider; filen selv kan ikke slettes, se noten |
| C-008 | critic | kodefejl | **P2** | `js/supabase-api.js:384 + js/backend-bridge.js:411-424` | En slugt fejl kan tømme brugerens gemte annoncer | **rettet** — se note nedenfor |
| C-012 | critic | funktionalitet | **P2** | `crawler/pipeline.js:103-122` | Ingen afbrydelse ved gentagne 4xx | **rettet** (`045c579`) — 332 kald → 5 |
| C-013 | critic | funktionalitet | **P2** | `crawler/config.js:130-131` | De juridiske spærrer er attestationer, ikke kontroller | **rettet** (`cd42a4b`) — se note nedenfor |
| C-016 | critic | seo | **P2** | `js/seo.js:118 og :145` | Struktureret data påstår et foto, siden selv nægter at påstå: jsonld-vehicle erklærer og-image.png som om det var motorcyklen | **rettet** (`57777f1`) |
| D-008 | designer | design | **P2** | `js/components.js:428-457 (eksternt kort, ingen .fav-btn)` | Favoritfunktionen har i drift ingenting at virke på | **delvist afvist** — DECISIONS.md; indgangen skjules, naar der intet er gemt |
| D-009 | designer | design | **P2** | `maerker.html (genereres af scripts/build-brand-pages.js)` | Mærkeindekset er 73 % blindgyder, og det taber to mærker, der HAR lager | åben |
| D-010 | designer | seo | **P2** | `maerker.html, sitemap.xml` | Følger af D-009, men det er et selvstændigt forhold: mærkeindekset udstiller 44 interne links til søgeresultater med nul indhold | **rettet** (`e8f2e60`) — C-014 løste kun halvdelen, se noten nedenfor |
| D-011 | designer | design | **P2** | `css/styles.css:749-916 (.card-external), js/components.js eksternSpecs()` | De to korttyper i samme liste har to forskellige rytmer | **rettet** — 118 px → 54 px ved 390 px, lige hoeje fra 768 px |
| C-006 | critic | sikkerhed | **P3** | `unsubscribe_saved_search` | Otte af ni funktioner i public blev hærdet til search_path="" af 016 | åben |
| C-009 | critic | kodefejl | **P3** | `js/opret-annonce.js, byte-offset 7334` | En rå NUL-byte gør filen binær for git og grep | **rettet** (`381f0b8`) |
| C-017 | critic | seo | **P3** | `js/seo.js:191` | Søgesidens <title> og meta description er identiske på hver facet | **rettet** (`687e5f9`) |
| C-018 | critic | seo | **P3** | `alle 14 HTML-sider, <html lang="da">` | Specifikationen siger lang="da-DK"; sitet har lang="da" på alle fjorten sider (efterprøvet) | **afvist** — begrundelse og syv målinger i [DECISIONS.md](DECISIONS.md) |
| C-019 | critic | seo | **P3** | `js/search.js:1695-1727` | Der er ingen noindex på et søgeresultat med nul træf | **rettet** |
| D-012 | designer | design | **P3** | `js/search.js — tomtilstandens hjælpetekst` | soegning.html?q=zzzzqqq (nul træf, ét aktivt filter = frisøgningen) skriver "Prøv at fjerne et filter eller udvide dit prisinterval" | **rettet** |

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

### Nyt i runde 2 — cookiebanneret, samme succeskriterium som D-006

Critic målte det under verifikationen af D-006 og skrev det i
[rounds/round-1.md](rounds/round-1.md) uden at give det et ID: cookiebanneret
er `position:fixed` i bunden på alle 14 sider ved første besøg, og fem af 30
Tab-stop lå bag det. `dev` har rettet det som **D-006b** i `0552436`.

Målt på `annonce.html?id=1021`, 390×844, tømt storage, rigtige Tab-tryk:
**18 af 40** Tab-stop lå helt eller delvis bag en fast flade før, **0 af 44**
efter. Også 0 af 45 på `index.html` og `soegning.html`. Tallet var højere end
critic's fem, fordi banneret skubber `.listing-actionbar` 195 px op — bjælkens
top gik fra y 775 til y 580, mens `scroll-padding-bottom` stod på 76 px, så
banneret gjorde bjælken til en fejl igen.

To ting gjorde det til et valg: `--cookie-h` stod på `document.body` (flyttet
til `documentElement`, så `html`-reglen kan læse den), og den frie zone er
summen af begge faste flader, ikke den højeste. Dertil `padding-bottom` på
`body`, fordi `scroll-padding` ikke kan hjælpe det sidste element på siden.
Reglerne hænger på `#cookie-banner:not([hidden])`, så de gælder fra første
maling uden at røre `scripts/inline-cookie.js`. Fire vagthunde i
`js/scroll-padding.test.js`.

### C-007 er ikke lukket — fire linjer i `scripts/` holder filen i live

Script-tagget er fjernet fra de elleve statiske sider, og den døde
`.ba-*`-CSS er væk. Selve `js/bike-art.js` kan ikke slettes af `dev` i denne
runde: `scripts/shared.js:189` LÆSER filen med `readFileSync`, så en sletning
uden den linje får hele byggekæden til at kaste. Dertil
`scripts/build-listing-pages.js:253` og `scripts/build-brand-pages.js:401` og
`:503`, der skriver tagget ind i de genererede sider — som derfor stadig
henter den. Rækkefølgen er: først de fire linjer, så filen. Det står også
øverst i `js/bike-art.js` selv.
### Efterslæb efter D-010 — den døde CSS er væk (`bd7b877`)

Markuppen forsvandt i `e8f2e60`, stilen i `bd7b877`. Der lå et merge imellem,
og det var ikke en formalitet: så længe `e8f2e60` kun fandtes på
`claude/vigorous-cohen-dc1032`, havde `maerker.html` på designgrenen stadig 60
levende `.brand-index-link`-ankre. En sletning på det tidspunkt ville have
kostet dem deres gitter og pillestyling. Oprydningen ventede derfor på, at
begge grene stod på `main`.

Slettet: kommentaren "Komplet mærke-indeks", `.brand-index` + de tre
`@media`-varianter, `.brand-index-link`, `::before`, `:hover` og
`:hover::before` — 20 linjer.

**Fælden, for næste gang noget lignende ryddes:** blokken var ikke
sammenhængende. `.brand-noscript ul` lå lige før den og `.brand-noscript li`
**inde i** det interval, en linjebaseret sletning ville have taget. Begge er i
brug af mærkesidernes noscript-liste. De står nu samlet.

Efterprøvet i browseren på `maerker.html` og `maerke-honda.html`, 1265 px, lys
og mørk:

```
                        lys        mørk
.brand-index i DOM        0          0
CSS-regler m. brand-index 0          0
.brand-noscript-regler    4          4     (beholdt)
.brand-card-regler        8          8     (beholdt)
main-højde, maerker    1120px     1120px   (intet layoutskift)
kontrast, tekstlisten  5,28:1     6,97:1   (krav 4,5)
vandret scroll          nej        nej
```

`main`-højden er den samme i de to tilstande, og de 18 kort står 4 pr. række
som før. `maerker.html` har 20 interne links i `<main>`, nul af dem til
`soegning.html?brands=`. Ingen konsolfejl på nogen af de to sider.

Bygget skal køres efter en sådan sletning: `scripts/inline-critical.js` klipper
den kritiske CSS efter sektionsoverskrifter, ikke efter selektorer, så de
indlejrede kopier i de 32 sider følger med af sig selv — men kun hvis bygget
kører. Gate: `node --check` 60 filer, `npm test` 243/243, `node
scripts/build.js`, `node scripts/udgiv.js` (78 filer, 32 HTML).

---

## Runde 5 — aim-loop mod bilbasen.dk (23.08.2026)

Tre blinde designer-kritikere sammenlignede forside, søgeside og annonceside
side om side med bilbasen.dk (screenshots i `work/runde5/`, rapporter i
[runde-5-forside.md](runde-5-forside.md), [runde-5-soegning.md](runde-5-soegning.md),
[runde-5-annonce.md](runde-5-annonce.md)). Målingerne før/efter står i
[rounds/round-5.md](rounds/round-5.md).

| ID | rolle | akse | sev | fil | problem | status |
|---|---|---|---|---|---|---|
| D5-F1 | designer | design | **P1** | `index.html`, `js/home.js` bid 6+7 | Forsiden viste 2 (mobil)/3 (desktop) annoncer af 548, første kort y≈4 340/≈2 840; "Nyeste" brugte 670 px på en tomtilstand | **rettet** — "Til salg lige nu" lige under hero'en (4/6/8 kort i søgningens rækkefølge), tom "Nyeste" skjult. Første kort 1 154 / 1 017 |
| D5-F2 | designer | funktionalitet | **P1** | `js/home.js` bid 3→5 | "Populære mærker" bygget mod BRANDS_BY_MODEL: Vespa 0, Harley-Davidson (72) manglede, "søger mest" uden data | **rettet** — bygget af lageret (top 12 med ≥2, tal på chippen, link til mærkesiden hvor den findes) |
| D5-F3 | designer | design | **P1** | `js/home.js` fyldTypeAntal, `css/styles.css` .tiles-grid | 8 fliser ≈800 px på mobil; "Scooter 0" klikbar blindgyde | **rettet** — 0-fliser skjules, orden efter antal, én vandret rulle-række på mobil (121 px) |
| D5-F4 | designer | funktionalitet | **P2** | `index.html` hero, `js/home.js` opdaterHero | Sandheden om kilderne (.lead) skjult på mobil; hero-trust var sælgertale | **rettet** — "548 motorcykler til salg hos 4 danske forhandlere og markedspladser" + tre køberfakta |
| D5-F5 | designer | design | **P2** | `index.html` | ≈2 100 px prosa (trin, sælgerbånd, CTA-bånd); trin 1 lovede "Gem favoritter" | **rettet** — trin flyttet til sikkerhed.html, ét sælgerbånd nederst, priskort skjult <820 px. Side 9 754 → 8 114 px (mobil), 6 843 → 6 029 (desktop) |
| D5-F6 | designer | funktionalitet | **P2** | `index.html`, `js/home.js` | Fritekst uden forslag; ingen "Nulstil" | **delvist rettet** — `<datalist>` fra lageret (340 forslag) + Nulstil. Mærke→Model-selects ≥700 px ikke bygget (se DECISIONS) |
| D5-F7 | designer | design | **P3** | alle sider, `css/styles.css`, `js/components.js` | Temaskift optog en af to mobilpladser; ingen kontoindgang i mobilheaderen | **rettet** — profilikon i mobilheader (logget ind → Mine annoncer), temaskift i skuffen på mobil |
| D5-S1 | designer | design | **P1** | `soegning.html`, `css/styles.css` | Otte rækker oven på listen på mobil; Filtre grå kontur | **rettet** — .srp-bar (søg+gem+Filtre), toolbar 2 rækker mobil / 1 desktop. Første kort 394 → 303 (mobil), 398 → 335 (desktop) |
| D5-S2–S4, S7 | designer | design | **P2** | `js/components.js`, `css/styles.css` | Kort: kildestribe, specs som linjer, kørekort-chip tung, pris lille | **rettet** — chips (24 px), kørekort i specs, kildelinje i foden, pris 22 px. Korthøjde 481 → 417 |
| D5-S5/S6 | designer | design | **P2** | `soegning.html`, `js/search.js`, `scripts/build-srp.js` | Sidebar-hints ≈190 px; sorteringsnote uden noget at efterprøve | **rettet** — `<details>`, note skjult ved 0 uden foto, (i) fast i .sort-felt. Type-filter 672 → 511 |
| D5-A1–A7 | designer | design | **P1/P2** | `js/annonce.js`, `annonce.html`, `css/styles.css` | Pris/nøgletal under folden, flag 112 px, "Lignende" tilfældig | **rettet** — kørekort først, flag 38 px, foto maks 400 px desktop, handlinger i header, sticky bar skjult ved prisblok, "Lignende" rangeret. Pris 722 → 615 (mobil), 835 → 662 (desktop) |

---

## Runde 6 — blind kritik af runde 5's resultat (23.08.2026)

Kritikerens rapport: [runde-6-kritik.md](runde-6-kritik.md) (blinddom pr.
side/skærm, runde 5's findings efterprøvet: 15 lukket, 4 delvist, 1 ikke
lukket). Målinger efter rettelserne: [rounds/round-6.md](rounds/round-6.md).

| ID | rolle | akse | sev | fil | problem | status |
|---|---|---|---|---|---|---|
| D6-A1 | critic | funktionalitet | **P1** | `js/annonce.js`, `annonce.html`, `css/styles.css` | Ingen primær knap på første skærm (390): bjælken skjult, mens prisblokken var i view; kildekortets knap ved ≈2 770 | **rettet** — "Se annoncen hos X" under prisen (<960), bjælken følger den knap. CTA 739 px |
| D6-F2 | critic | funktionalitet | **P1** | `index.html` `.sell-band` | "Set af hele Danmark", "købere i hele landet", "under 5 minutter", "entusiaster …" — påstande uden måling | **rettet** — "Gratis annonce for private" + kun det, koden gør |
| D6-F3 | critic | funktionalitet | **P1** | `js/home.js` | SEO-kolonnen listede Scooter (0) som link | **rettet** — bygget af tællingen, kun n > 0, tal i parentes |
| D6-F1 | critic | design | **P2** | `js/home.js` tegnFeatured | Første række grå (lazy) i optagelser | **rettet** — første række `loading=eager` |
| D6-F4 | critic | design | **P2** | `css/styles.css`, `js/home.js` | 4 fuldbredde-kort = 1 880 px; Bilbasen 14 i to spalter | **rettet** — 2-spaltet kompakt gitter, 8 kort, sektion 2 185 → 1 583 px |
| D6-S1 | critic | design | **P2** | `soegning.html`, `css/styles.css` | "Søg efter mæ…" og "Blandet udb" klippet på 390 | **rettet** — "Mærke eller model", "Blandet", gulv 96 px |
| D6-S2 | critic | design | **P2** | `js/search.js`, `soegning.html`, `scripts/build-srp.js` | Overskrift to linjer på mobil | **rettet** — "548 annoncer · fra 4 kilder (i)", første kort 303 → 279 (Bilbasen 284) |
| D6-S3 | critic | design | **P2** | `js/components.js`, `css/styles.css` | Fodlinje klippede begge led i 280 px | **rettet** — "Privat · domæne", sælgertype skjult < 300 px container |
| D6-S4 | critic | design | **P2** | `js/sortering.js` | Side 1 = 21–24 × MC Syd (kilde-rundgang foreslået) | **rettet** (godkendt af mennesket) — rundgang mellem kilder inden for hver oplysthedsklasse; side 1 nu MC Syd 12 · Gul og Gratis 12, billedløse pladser uændrede. Måling i DECISIONS.md |
| D6-A2 | critic | design | **P2** | `js/annonce.js`, `js/filtrering.js`, `js/search.js` | "Søg videre" uden tal; højre spalte tom | **rettet** — links med tal (samme filterkæde som søgesiden), "Alle annoncer fra MC Syd · 332" via nyt `?kilde=` filter, "Hentet … — for 7 dage siden" |
| D6-A3 | critic | design | **P2** | `css/styles.css` | Nøgletal under folden på desktop | **rettet** — handlinger på titlens linje, stats 868 → 824 (værdier ved 892) |
| D6-A4 | critic | design | **P3** | `css/styles.css` | 5 celler i 4 spalter, tre grå felter | **rettet** — `minmax(120px)`, 5 spalter |
| D6-A6 | critic | design | **P3** | `js/annonce.js` | "650 ccm–1.350 ccm"; to ens modeller i striben | **rettet** |
| D6-F5 | critic | design | **P3** | alle sider, css | Måne-ikon i desktop-header | **rettet** — temaskift i footer ("Om Bikerbasen") + skuffe, ude af headeren |
| D6-F6 | critic | design | **P3** | css | Hero-bund + sektionsluft på desktop | **rettet** — første kort 1 017 → 891 |
| D6-F7 | critic | kodefejl | **P3** | `js/backend-bridge.js`, `crawler/normalize.js` | "Bsa" | **rettet** — akronymopslag (BSA, AJS, GasGas …) |
| D6-F9 | critic | design | **P3** | `js/home.js` | Fem chips ombrød på desktop | **rettet** — fire chips ("Under 10.000 km" ud) |
| D6-S5 | critic | design | **P3** | `js/search.js` | "+2 kilder" alene på linje 2 | **rettet** — "indekseret: 332 hos MC Syd · 118 hos Gul og Gratis · 98 hos 2 andre" |
| D6-S6 / D6-A5 | critic | design | **P3** | css | "km i…" klippet ved spec-tom + kk-ukendt | **rettet** — to rækker (54 px) for den kortklasse |
| D6-S7 | critic | design | **P3** | `soegning.html` | Pris-gruppen på folden | **rettet** — Pris før Type (511 px) |
| D6-F8 | critic | — | **P3** | — | 494 px under footeren i optagelsen | **måleartefakt** — fuldsidebilledet tages før `hidden` sættes; ikke reproduceret i browseren |

---

## Runde 7 — blind kritik efter runde 6 (+ mærkeside) (23.08.2026)

Rapport: [runde-7-kritik.md](runde-7-kritik.md). Blinddom før rettelserne:
forside m/d → Bikerbasen; SRP m/d → Bikerbasen; VDP m snævert / d klart →
Bikerbasen; mærkeside m+d → Bilbasen klart. Målinger efter:
[rounds/round-7.md](rounds/round-7.md).

| ID | rolle | akse | sev | fil | problem | status |
|---|---|---|---|---|---|---|
| D7-F1 / D7-A1 | critic | funktionalitet | **P1** | `js/backend-bridge.js`, `js/components.js`, `js/annonce.js` | "Privat" var et gæt på 118/118 Gul og Gratis-annoncer (kilden oplyser ingen sælgertype); annoncesiden skrev "reklamationsret gælder ikke mellem private" om forhandlerbiler | **rettet** — tri-state `saelgertype` (forhandler/privat/null); null → kun domænet på kortet og en neutral retsnote ("Kilden oplyser ikke …"). Crawler-selector for GG's "Erhverv"-badge er fortsat ikke læsbar robust (sources/guloggratis.yaml) — feltet forbliver null |
| D7-S1 | critic | funktionalitet | **P1** | `js/search.js`, `soegning.html` | Søgeagenten lovede mail; udløseren sidder kun på `listings` (0 egne) | **rettet (tekst)** — ingen mail loves; "Søgningen er gemt … tæller nye annoncer". Mail for indekserede = egen opgave (trigger på `eksterne_annoncer` + funktion) — **åben** |
| D7-M1 | critic | funktionalitet | **P1** | `scripts/build-brand-pages.js` | "Brugte Honda … 262 brugte" — 165 af 262 er fabriksnye | **rettet** — h1 "Honda-motorcykler til salg i Danmark", "262 … 97 brugte og 165 fabriksnye", title/meta/FAQ/overskrifter uden "brugte", når lageret er blandet |
| D7-F2 | critic | funktionalitet | **P2** | `js/home.js` | "548 motorcykler" — samme mc hos to kilder (≥7 dubletter) | **delvist** — "548 annoncer med motorcykler til salg" / "Vis 548 annoncer". Tværkilde-afdublettering: **åben** (kræver måling og DECISIONS) |
| D7-F3 | critic | design | **P2** | `js/home.js` vaelgFeatured | "Til salg lige nu" = 8/8 MC Syd | **rettet** — højst halvdelen fra samme kilde (mcsyd, GG, mcsyd, mcsyd, mcsyd, GG, GG, rydbergs); underrubrik skrevet om |
| D7-F4 / F5 / F6 | critic | design | **P3** | css, `js/components.js` | Titel klippet i kompakte kort; chips ombrød; `--cookie-h` frøs i baggrundsfane | **rettet** — to linjer titel, auto-fill-gitter + nowrap ≥640, måles igen ved visibilitychange/load |
| D7-S2 | critic | design | **P2** | `js/search.js`, css | Placeholder "Mærke eller m" klippet på 390 | **rettet** — "Mærke/model" ≤420 px + `::placeholder{text-overflow:ellipsis}` |
| D7-S3 | critic | design | **P2** | `soegning.html`, `js/search.js`, css | Mærke-filteret ved 1 105 px i et 748 px panel | **rettet** — Mærke først (60 px), sorteret efter antal, folder efter 6; Kørekort 476, Pris 741; pris-hint én linje, prischips i to kolonner |
| D7-S4 | critic | kodefejl | **P2** | `crawler/normalize.js`, `js/backend-bridge.js` | Modelfelt med salgsstøj ("CBR 650 R MC-SYD", "sælges bud modtages", "Motorcykel med meget udstyr") | **rettet** — `rensModelStoej()` i begge lag, test `crawler/model-stoej.test.js` (6 eksempler + 7 rigtige modelnavne urørt) |
| D7-S5 | critic | design | **P2** | css | D6-S6 var en media-query; kortet er en container | **rettet** — `@container (max-width:420px)` |
| D7-S6 | critic | funktionalitet | **P3** | `js/components.js` specRows | Sammenlign skrev "Ikke oplyst" i fem felter, vi ikke indekserer | **rettet** — rækkerne væk for rent eksterne sæt + forklaring; "Se hos kilden" i blandede sæt |
| D7-A2 | critic | design | **P2** | `js/annonce.js`, css | Nøgletal under folden på mobil (863) og desktop (878) | **rettet** — handlingsrække flyttet under gitteret på <960, vilkårsnote skjult på mobil, foto 360 px på desktop. Mobil: CTA 695, gitter 768–836 (<844); desktop: værdier 852 |
| D7-A3 | critic | funktionalitet | **P2** | `js/annonce.js` | "Hentet … for 7 dage siden" brugte foerst_set | **rettet** — "Set hos MC Syd første gang 16. aug. · sidst bekræftet …" (sidst_set) |
| D7-A4 | critic | design | **P2** | css | Højre spalte fulgte ikke med (sticky uden align-self) | **rettet** — `align-self:start` |
| D7-A5 | critic | design | **P3** | `js/components.js` KK_UAFGJORT | "Kørekort ikke afgjort" vs. A-boksen | **afvist** — `js/koerekort.test.js` låser, at mærkatet ikke må nævne en kategori (heller ikke A/A2), når effekten mangler; se DECISIONS.md |
| D7-M2 | critic | design | **P2** | `scripts/build-brand-pages.js`, `js/maerke.js` | 262 kort, ingen sideinddeling, ikke søgningens rækkefølge; tegnet to gange | **rettet** — 24 kort i 'blandet'-orden, "Se alle 262 i søgningen", DOM røres kun ved ændring. Side 130 358 → 14 717 px (390) |
| D7-M3 | critic | design | **P2** | `scripts/build-brand-pages.js`, css | Første kort ved 873/728 | **rettet** — første sætning synlig, resten i `<details>`; første kort 630 (390) / 589 (1 366) |
| D7-M4 / M5 | critic | design | **P3** | `scripts/build-brand-pages.js` | "samme leje"-sætning, "og … og", "Andre mærker" alfabetisk med Andet Mærke | **rettet** — listeJoin, sætning uden løfte, andre mærker efter antal med tal, Andet Mærke udeladt |

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
