# DECISIONS — afviste findings og de valg, der ikke er til forhandling

To slags indhold her, og de skal holdes adskilt.

**Afvisninger.** `dev` må afvise en finding, men kun skriftligt og med
begrundelse. En afvisning uden måling er ikke en afvisning, det er en udsættelse.

```
### <ID> afvist — <dato>
FINDING: <hvad der blev påstået>
HVORFOR AFVIST: <begrundelse, med tal hvor der kan måles>
BEVIS: <hvordan det blev efterprøvet>
```

**Låste valg.** Ting, en senere runde ikke må lave om uden at spørge mennesket —
fordi de er betalt for én gang og gerne skal forblive løste.

---

## Låst

### Stakken bliver som den er
Statiske HTML-sider, vanilla JS, én CSS-fil, Supabase bagved. Ingen framework,
ingen bundler, ingen TypeScript. Sitet er live på GitHub Pages fra `main`.
En migrering er ikke en forbedring, en køber kan se, og det målte gulv
(Lighthouse) er lettere at holde uden.

### Gaten er tilpasset repoet, ikke omvendt
Den oprindelige specifikation nævnte `npm run typecheck`, `npm run lint` og
`npm run build`. Ingen af dem findes: intet TypeScript, ingen eslint-config, nul
devDependencies. Gaten er derfor `node --check` på hver JS-fil, `npm test`,
`node scripts/build.js` og Lighthouse på tre sider.

**Lint-trinnet er droppet med vilje.** At indføre eslint på ~6.000 linjer
eksisterende kode er en selvstændig beslutning med sin egen oprydning, ikke et
gate-trin man tilføjer i forbifarten. Skal det ind, er det en finding for sig.

### Ærlighed slår fuldstændighed
Vi viser aldrig et felt, vi ikke har dækning for. Mangler tallet, står der "Ikke
oplyst". Et gættet felt vejer tungere imod os end et manglende — og det er målt:
tre blinde kritikere tabte uafhængigt tillidskategorien på præcis den fejl
(opdigtede fotos i galleriet, "under markedspris" på en 1968-Nimbus, og et
stjernegennemsnit der ikke kunne udledes af anmeldelserne).

### A2-grænsen er 47 hk, og den er skrevet i kilowatt
A2 er lovligt 35 kW. 35 / 0,7355 = 47,59 hk. Grænsen stod på 48, fordi nogen
rundede op — men 48 hk ER 35,30 kW, altså over loftet, og en Harley Iron 883 med
48 hk stod derfor med "Kørekort A2" til en tyveårig. Testene låser grænsen i kW,
ikke i hk, så en fremtidig "oprydning" ikke kan flytte den tilbage.

### Crawlerens juridiske spærrer røres ikke uden mennesket
`tilladelse_modtaget`, robots.txt-respekten, `crawl_delay_ms`, felt-whitelisten,
opt-out. `tilladelse_modtaget` er ikke en indstilling, der åbner en dør — det er
en nedskrivning af, at en aftale findes.

### Kilden ejer sine billeder
Vi indekserer miniaturen og linker til kilden. Vi kopierer ikke gallerier, og vi
viser ikke et pressefoto af modellen som om det var annoncens.

### Bortemarkeringens værn er en hastighedsbegrænser, ikke et gulv
Skrevet 17.08.2026 sammen med anden runde af C-011, fordi critic målte det og
bad om en stillingtagen. Det står her, så ingen senere runde læser "gradvis
udhuling er lukket" ind i koden.

`markerBorte()` kræver, at kørslen har fundet mindst **60 % af referencen**, og
referencen er det højeste af to tal: største fund i de seneste
`REFERENCE_KOERSLER` afsluttede kørsler, og kildens antal aktive rækker lige nu.

**Det stopper ikke et vilkårligt langsomt fald, og det kan det ikke.** Slipper
et fald på 39 % igennem, falder både rækketallet og historikken med, og næste
trin måles mod det nye, lavere udgangspunkt. Målt, som værste tilfælde — hver
kørsel finder det allerlaveste, værnet vil tillade:

| referencevindue | 332 → 200 → 120 → 72 → 44 → 27 tager |
|---|---|
| 3 kørsler (første udgave, `baa7add`) | **13 kørsler** |
| 12 kørsler (nu) | **49 kørsler** |

Tallene er låst i `crawler/borte.test.js` ("et referencevindue på tre kørsler…"
og "vinduet på tolv kørsler…").

**Hvorfor der ikke er sat et absolut gulv.** Et gulv ville sige "kilden må
aldrig automatisk komme under N rækker". Så snart en forhandler ærligt lukker
eller halverer sit lager, holder vi et katalog i live, kilden ikke længere står
inde for — og vi kan ikke skelne de to situationer fra hinanden i tal: et ægte
udsalg og en langsomt smuldrende parser ser ens ud herfra. Det er samme
erkendelse som resten af værnet bygger på, og bare ÉN af de to må afgøres af en
maskine.

Det, der KAN gøres, er at købe tid, og det er valget: tolv kørslers hukommelse
i stedet for tre. Prisen betales den anden vej — falder et lager ærligt med mere
end 40 %, bliver de gamle annoncer stående i op til tolv kørsler, mens loggen
skriver `VÆRN: forsvundne annoncer blev IKKE markeret` med tallene i. Det er den
rigtige vej at fejle: en forkert annonce i søgeresultatet mod et tomt katalog.

**Det, der ER lukket, er noget andet og skarpere:** et brat fald kan ikke længere
lade som om det er en ny kilde. Se `crawler/db.js`, `bortemarkeringVurdering()`.

---

## Afvist

<!-- dev skriver herunder -->

### C-004 delvist afvist — 17.08.2026
**FINDING:** "Anonym, ubegrænset skrivekanal til produktionsdatabasen." Findingen
peger på tre ting: intet størrelsesloft, ingen rate limit, ingen captcha.

**HVAD DER ER LAVET** (migration 018, afsnit 3): størrelsesloftet.
`reports_text_len_chk` (comment ≤ 2000, target_id ≤ 64), `reviews_text_len_chk`
(comment ≤ 2000) og `krav_dok_len_chk` (dokumentation ≤ 2000).

**HVAD DER ER AFVIST:** rate limiting og captcha **i databasen**.

**HVORFOR AFVIST:**

*Der er ingen identitet at tælle på.* Politikken `indberetning: alle må oprette`
tillader `reporter_id is null` — det er hele pointen med en
notice-and-action-kanal, og en tæller pr. bruger har derfor ingen nøgle for
præcis de indsendelser, findingen handler om. Det eneste, Postgres kan se, er
`current_setting('request.headers')::json->>'x-forwarded-for'`, som afsenderen
selv sætter. En rate limit på et felt, angriberen selv skriver, er ikke en
grænse; den er en indbydelse til at skrive et nyt tal.

*Den globale tæller vender våbnet om.* En trigger, der afviser INSERT når der er
mere end N anonyme indberetninger i det sidste minut, gør en flodbølge til en
afbrudt anmeldelsesfunktion. Angriberen betaler ingenting for at holde den
lukket, og den, der taber, er det menneske, der prøver at anmelde en svindler.
For en tabel, hvis hele formål er at tage imod advarsler fra fremmede, er
"afvis ved travlhed" den forkerte vej at fejle.

*Og `target_id` er fri tekst uden fremmednøgle*, så en kvote pr. mål kan omgås
ved at variere målet. Efterprøvet i `information_schema` og `pg_constraint`:
`reports.target_id` er `text` med kun et CHECK på `target_type`.

**HVAD LOFTET SÅ KØBER — målt:** Postgres' `text` tager op til 1 GB pr. værdi.
Før: én række kunne koste ~2 GB (comment + target_id). Efter: ~2 KB. Det er en
faktor på ca. **10⁶ pr. række**. Antallet af rækker er derefter bundet af
netværket, ikke af disken, og det er den samme grænse enhver anonym
API-endpoint har.

**HVOR DEN RIGTIGE GRÆNSE HØRER TIL:** i kanten — Supabase' API-gateway eller
Cloudflare foran den — hvor afsenderens IP er observeret og ikke oplyst. Det er
ikke SQL, og det er derfor ikke i denne migration. Det står her, så næste runde
ikke genfinder det som "dev glemte rate limiting".

**IKKE MIN FIL, MEN HØRER TIL FINDINGEN:** `<textarea id="report-comment">` i
`js/components.js:569` har ingen `maxlength`. Databasen afviser nu ved 2000
tegn, men brugeren får det at vide som en API-fejl i stedet for som en
tællekant i feltet. `js/` ejes af en anden agent i denne runde.

**BEVIS:** `pg_constraint` før ændringen: `reports` havde CHECK på `reason`,
`status`, `target_type` og intet på `comment`/`target_id`. Data målt før
migrationen: 1 række i `reports` (længste comment 17 tegn, længste target_id
8 tegn), 0 rækker i `reviews`, 0 i `krav` — nul rækker bryder de nye CHECKs, så
valideringen går igennem.

### C-002 delvist gennemført — 17.08.2026
Ikke en afvisning, men en grænse, der skal stå skrevet: `pg_default_acl` har
**to** grantors for skema `public` — `postgres` og `supabase_admin`. Migration
018 lukker postgres-posten. Supabase_admin-posten kan vi ikke nå: efterprøvet i
produktion er `current_user` = `postgres`, `rolsuper` = **false**, og
`pg_has_role('postgres','supabase_admin','MEMBER')` = **false**. Postgres må kun
ændre default privileges for roller, den er medlem af, så sætningen giver 42501.
Den står derfor i en `do`-blok, der fanger fejlen og siger den højt.

Det betyder i praksis ingenting i dag: en default-ACL fyrer kun, når **den
grantor selv** opretter objektet, og alle 15 tabeller og views i `public` er
ejet af `postgres` — vores migrationer kører som `postgres`. Restrisikoen
gælder objekter, Supabase' egen platform måtte oprette i `public`. Skal den
lukkes, kræver det superuser, altså Supabase-support.

### C-014 delvist afvist — 17.08.2026
**FINDING:** "Produktionssitet har 7 indekserbare adresser og NUL annonce-
eller mærkesider." Findingen peger på to slags manglende sider: mærkesider og
annoncesider.

**HVAD DER ER LAVET:** mærkesiderne. Byggekæden læser nu også
`eksterne_annoncer`, og `maerke-*.html` bygges af egne og indekserede annoncer
tilsammen. Målt: **7 → 25** indekserbare adresser, 0 → 18 mærkesider, og
`maerker.html` gik fra 0 til 18 links til sider, der findes.

**HVAD DER ER AFVIST:** en forrenderet `annonce-<slug>.html` pr. indekseret
annonce — de 332.

**HVORFOR AFVIST — målt:**

| | |
|---|---|
| egne annoncer i `listings` (status active) | **0** |
| indekserede i `eksterne_annoncer` (status aktiv) | **332** |
| af de 332, der ville blive indekseret af Google | **0** |

Den sidste linje er hele begrundelsen. `js/annonce.js:334` sætter
`noindex, follow` på hver enkelt indekseret annonce, og det er en truffet
beslutning, ikke en forglemmelse: *"Vi ejer ikke indholdet, og en kopi af
forhandlerens annonce skal ikke konkurrere med originalen i Google."* Den står
sammen med "Kilden ejer sine billeder" ovenfor. Forrendering findes for at give
en crawler noget at læse. På 332 sider, en crawler har fået besked på ikke at
indeksere, køber den ingenting — og prisen er 332 filer med MC Syds annoncetekst
liggende på handelsdomænet.

Nul annoncesider er derfor det RIGTIGE tal i dag, ikke en mangel: der er nul
annoncer, vi ejer. Får `listings` rækker, bygger `build-listing-pages.js` dem
automatisk, og den kode er urørt.

Adressen på en indekseret annonce er `annonce.html?id=<uuid>`. Den findes (200)
og viser kildeoplysning, prislabel og kørekortdommen. Det er den, mærkesidernes
`<noscript>`-liste og kortenes `.card-link` peger på — aldrig en
`annonce-<slug>.html`, som ikke findes. `harEgenSide()` i
`scripts/build-brand-pages.js` er den ene regel, der holder sitemap, ItemList og
interne links enige om det.

**BEVIS:** `node scripts/build.js` → 18 mærkesider, sitemap 25 URL'er; hver af
de 25 hentet lokalt: **25 × HTTP 200, 0 × ikke-200**. `node scripts/udgiv.js`:
alle referencer opløst. `grep 'href="annonce-'` i alle 18 mærkesider: 0 træf.

### C-010 delvist afvist — 17.08.2026
**FINDING:** "`fingerprint`-reglen er skrevet ned, men ikke implementeret.
Kommentaren i `crawler/normalize.js:485` lover: *Samme motorcykel annonceret tre
steder skal være ÉN annonce hos os med tre kilde-links.* Hashen beregnes, gemmes
og indekseres — og læses aldrig." Findingen tilbyder selv to udgange: gruppér på
`fingerprint` i læsestien, eller skriv kommentaren om, så den beskriver det,
koden gør.

**HVAD DER ER AFVIST:** sammenlægningen. **Hvad der er lavet:** kommentaren er
skrevet om, med målingen i sig, og målingen er låst i en test
(`crawler/normalize.test.js`, "fingerprint kan IKKE skelne ens nyt lager").
Kolonnen og indekset bliver liggende, og der står nu hvorfor.

**HVORFOR AFVIST — målt på drift 17.08.2026, 332 aktive annoncer fra ÉN kilde:**

| | |
|---|---|
| unikke `fingerprint` | **238** af 332 |
| grupper der deler nøgle | **41** |
| rækker involveret | **135 = 40,7 %** af lageret |
| største gruppe | **13** rækker |
| af de 135 med `stand: 'ny'` | **128** |
| grupper hvor alle `kilde_annonce_id` er forskellige | **41 af 41** |
| samme måling med `km` i nøglen | 37 grupper, **126** rækker (38 %) |

De 41 grupper er ikke samme motorcykel annonceret flere steder. Der er kun én
kilde i drift, så de er alle *inden for* MC Syd — syv ens Honda CMX 500 Rebel
2024 til 84.995 kr., seks ens Honda NX 500 2024 til 89.995 kr., og så videre.
Syv forskellige motorcykler med hver sit lagernummer hos kilden og hvert sit
stelnummer. Kilden holder dem adskilt; nøglen kan ikke.

En sammenlægning på `fingerprint` ville altså gøre 332 annoncer til 238 og
**skjule 94 motorcykler, en forhandler faktisk har til salg** — og vise et kort,
der påstod "13 kilde-links" til 13 forskellige maskiner. Det er præcis den
slags påstand, "Ærlighed slår fuldstændighed" blev skrevet imod: at skjule en
rigtig annonce vejer tungere imod os end at vise to.

At tage `km` med i nøglen retter det ikke. 128 af de 135 kolliderende rækker er
nye maskiner uden kilometerstand; kun 7 af 135 har en km at skelne på. Med km i
nøglen er der stadig 37 grupper og 126 rækker.

**HVAD DER SKULLE TIL:** et felt, der adskiller to ens maskiner fra den samme
maskine to steder — stelnummer, registreringsnummer eller et billedmatch. Ingen
af dem står i felt-whitelisten i `crawler/db.js`, og ingen kilde giver os dem i
dag. Findes et sådant felt en dag, er sammenlægningen den rigtige rettelse, og
`fingerprint` er den halve nøgle, den skal bygge på. Indtil da er den en
kandidatnøgle, og det er nu det, kommentaren siger.

**BEVIS:** tolv anonyme GET mod `/rest/v1/eksterne_annoncer` med den offentlige
nøgle (`select=id,kilde_annonce_id,titel,maerke,model,aargang,km,pris_dkk,postnr,fingerprint,stand`,
`status=eq.aktiv`), hashen genberegnet lokalt med `crawler/normalize.js`s egen
`fingerprint()` og holdt op mod den gemte kolonne: **0 af 332 er uenige**, så
grupperingen er kildens tal og ikke min omregning. Ingen skrivning til
databasen. `npm run crawl:tjek` bagefter: MC Syd, 332 aktive annoncer, urørt.

### C-018 afvist — 17.08.2026
**FINDING:** "Specifikationen siger `lang="da-DK"`; sitet har `lang="da"` på alle
fjorten sider." Findingen tilbyder selv to udgange — ret attributterne, eller ret
specifikationen — og siger ligeud: *"Jeg vil ikke påstå, at `da` koster noget."*

**HVORFOR AFVIST — målt, i browseren på `maerker.html` og i node:**

| spørgsmål | svar |
|---|---|
| er `da` gyldig BCP-47? | `Intl.getCanonicalLocales('da')` → `["da"]` — ja, uændret |
| ved en klient så, at det er Danmark? | `new Intl.Locale('da').maximize()` → **`da-Latn-DK`**. Regionen udledes; den skal ikke skrives |
| formaterer sproget tal og datoer anderledes? | `(1234.5).toLocaleString('da')` = `(1234.5).toLocaleString('da-DK')` = **1.234,5**. Dato: **17.8.2026** i begge |
| læser vores egen kode attributten? | **nul** forekomster af `documentElement.lang` i `js/`, `crawler/`, `scripts/`. Alle formateringer er hårdkodet `'da-DK'` og rører ikke `<html>` |
| ændrer siden sig, hvis man skifter den? | Sat til `da-DK` i browseren og målt igen: samme font, samme `font-size`, samme `hyphens: manual`, og **dokumenthøjde 2982 → 2982 px** |
| er der noget i CSS eller markup, der kan reagere? | nul `:lang()`, nul `hyphens: auto`, nul `quotes:` i `css/styles.css`, og **nul `<q>`-elementer** på nogen side. Der er ikke en regel at aktivere |
| står regionen så ingen steder? | Jo — `<meta property="og:locale" content="da_DK">` på **32 af 32 sider**. Dér forventer Facebook en region, og dér står den |

Der er altså ingen målbar modtager af forskellen: ikke browseren, ikke `Intl`,
ikke vores egen kode, ikke stilarket og ikke delingskortet.

**HVAD DET VILLE KOSTE:** 32 HTML-filer (ikke 14 — C-014 byggede 18 mærkesider
til) plus fire generatorskabeloner (`build-brand-pages.js` ×2,
`build-listing-pages.js`, `build-progress.js`). Alle 32 filer skulle røres i en
runde, hvor tre andre agenter arbejder i de samme filer. En ændring uden
modtager, betalt i konflikter.

**HVOR UENIGHEDEN SÅ LIGGER:** i `.claude/agents/critic.md:50`, hvor `lang="da-DK"`
står på tjeklisten. Den fil er en rollebeskrivelse, ikke en produktionsfil, og
den redigerer `dev` ikke. Afvisningen står her, så næste runde kan se, at
punktet ER behandlet og med hvilke tal — ikke sprunget over. Skal linjen rettes,
er det menneskets beslutning, ikke min.

**BEVIS:** målingerne ovenfor er kørt i Browser-panelet mod dev-serveren på
55559 (`maerker.html`, forrest fane) og med `grep` over `js/`, `crawler/`,
`scripts/`, `css/` og alle 32 HTML-sider. Ingen fil er ændret.
