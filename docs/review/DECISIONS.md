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

### Crawleren fejler LUKKET, når den ikke kan læse robots.txt
Skrevet 17.08.2026 sammen med C-013, hvor robots.txt gik fra at være en dato
i en YAML-fil til at være en kontrol, der køres ved hver kørsel
(`crawler/robots.js`).

Retningen, tvivl falder i, er valgt og skal ikke laves om uden at spørge:

| svar | hvad vi gør | hvorfor |
|---|---|---|
| 2xx | reglerne gælder | |
| 4xx | alt tilladt | der ER ingen robots.txt. En manglende fil siger ikke nej |
| 5xx | **vi crawler ikke** | vi ved ikke hvad der står. En server, der svarer 503, skal heller ikke have 332 kald oveni |
| netværksfejl | **vi crawler ikke** | samme |

Prisen betales den anden vej: er kildens server nede en nat, springer
kørslen over, og kataloget står urørt en dag længere. Det er den rigtige vej
at fejle — en dags gammelt katalog mod at hente sider, vi måske ikke må.

`Crawl-delay` respekteres, når den er **længere** end vores egen, aldrig når
den er kortere. 2000 ms er databasens minimum (`014_aggregator.sql`), og en
kilde skal kunne bede om mere høflighed, ikke om mindre.

Opslaget sker på **URL'ens vært**, ikke på kildens `domaene`-felt. De to er
ikke det samme: `sources/guloggratis.yaml` har `domaene: guloggratis.dk`,
mens dens liste-URL står på `www.guloggratis.dk`. robots.txt gælder pr.
oprindelse, så et opslag på domæne-feltet ville have hentet reglerne fra et
andet sted, end vi henter sider fra — og så beskytter kontrollen ingenting.

### ÅBENT SPØRGSMÅL til mennesket: en delvist spærret kilde
Samme rettelse. En liste-URL, robots.txt spærrer, **springes over**; resten
af kørslen fortsætter, og kilden afvises først, når ALLE liste-URL'er er
spærrede. En spærret detaljeside hentes ikke og tælles i loggen.

Det andet valg er strengere: ÉT `Disallow`, der rammer noget af vores, og
hele kilden lægges død, indtil et menneske har set på det. Argumentet for
det er, at det er sådan resten af spærrerne opfører sig — de er alle
alt-eller-intet. Argumentet imod er, at et `Disallow: /motorcykler/print/`
ikke handler om os, og at reglen dermed ville lukke en kilde, vi har et
skriftligt ja fra, på en regel, der ikke siger nej til os.

`dev` har valgt den mildeste af de to, fordi den ikke kan gøre skade i sig
selv — vi henter aldrig noget, vi ikke må. Men det er en juridisk afvejning
og ikke en teknisk, og derfor står den her frem for kun i koden.

### Vagten mod gentagne 4xx er asymmetrisk med vilje
Skrevet 17.08.2026 sammen med C-012.

**Listesider: ét afvisningssvar stopper kørslen.** Der er 1-8 af dem, og de
er hoveddøren. Er den lukket, er der ingen mening i at gå videre til de 332
detaljesider bagved.

**Detaljesider: fem i træk stopper.** Der er hundredvis af døre, og én af
dem kan være låst, uden at huset er det.

**404 er ikke et nej til os.** En annonce kan blive slettet mellem
listesiden og detaljekaldet; det er hverdag på en markedsplads, og kørslen
fortsætter. Men 25 forsvundne i træk er ikke hverdag — så er det ikke
annoncerne, der er væk, det er detalje-URL'erne, vi bygger, og det stopper
med en anden diagnose i loggen.

**Tællerne nulstilles kun af et svar, der kom igennem.** En timeout hverken
bekræfter eller afkræfter et nej. Nulstillede den, kunne en kilde, der
svarer 403, timeout, 403, timeout, holde vagten i skak for evigt. Det er
låst i `crawler/afbryd.test.js`.

En afbrudt kørsel markerer **intet** som borte: kastet forlader det `try`,
`db.markerBorte()` står inde i. Værnet fra C-011 ville også blokere
markeringen, men den skal aldrig nå derhen. To spærrer om det samme, med
vilje — og hvis en senere runde flytter `markerBorte()` ud af det `try`,
falder den ene af dem.

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

### B4 delvist afvist — 23.08.2026
FINDING (audit 23.08.2026, B4): "Server-side filtering + pagination (PostgREST
range/RPC over a search view), card-only columns, pre-render first 24 cards +
ItemList into soegning.html at build." Begrundelsen var LCP 4,9 s på søgesiden
(2,2 s "load delay": billedet kunne først opdages efter REST-kald + javascript)
og skalering: alt filtreres i browseren over HELE lageret.

GENNEMFØRT:
- Forudtegning af første side fra HELE lageret (egne + indekserede) i sidens
  faktiske standardrækkefølge. Sorteringen er flyttet til `js/sortering.js`,
  så `scripts/build-srp.js` og `js/search.js` kører samme funktion. Første
  korts foto preloades med fetchpriority=high. Før: "build-srp: 0 kort" i
  produktion (trinnet hentede kun egne annoncer, 0 i drift, og sorterede
  "nyeste først", som ikke er standard). Efterprøvet under produktionsvilkår
  (hostnavn ≠ localhost, demolager slået fra): de 12 forudtegnede kort er
  identiske med de 12 første efter hydrering; `?brands=Honda` skjuler
  gitteret indtil filtreret, som før.
- Titel og beskrivelse i soegning.html er nu standardsøgningens (samme strenge
  som js/seo.js sætter), så HTML uden javascript siger det samme som browseren.
- Loftet på 500 rækker er væk: `loadExternalListings()` hentede med `limit=500`,
  databasen havde 548 aktive. 48 annoncer fandtes derfor ingen steder i
  browseren — søgning, facettal, "500 motorcykler til salg" — mens byggekæden
  hentede alle 548 til sitemap og mærkesider. Nu henter begge sider 1000 ad
  gangen (PostgREST Range) til listen er tom, med `order=sidst_set.desc,id.asc`
  som stabilt brydeled BEGGE steder (noten i js/backend-bridge.js efterlyste
  netop det). Første indlæsning viser nu 548.
- ItemList: IKKE bagt ind. js/seo.js udelader med vilje ItemList, når ingen af
  annoncerne har en adresse, Google kan følge (C-015: 332 af 332 URL'er svarede
  404). I drift er 548 af 548 indekserede → intet ItemList at bage. Det ændrer
  sig den dag egne annoncer får sider (build-listing-pages.js).

IKKE GENNEMFØRT — server-side filtrering/paginering (RPC over et søgeindeks):
HVORFOR: (1) Den kræver en migration (view + RPC med facettælling og "blandet"
som positionel fordeling) mod produktionsdatabasen, og migrationer køres ikke
herfra — hele backend-deployet (006–020, fem Edge Functions) venter på et
access token (supabase/DEPLOY.md). En RPC, der er skrevet men hverken kørt
eller målt, og en klientsti, der slår til, den dag nogen kører den, er præcis
den slags "ser rigtig ud, er ikke efterprøvet", der ikke må i main.
(2) Tallene bærer det ikke endnu: 548 rækker = 388 KB rå / 53 KB gzip /
0,20–0,25 s for hele lageret (målt mod produktion). Det giver ~106 B/række
gzip; først ved ~2.000 rækker (≈210 KB, ≈1 s på 4G) er hentningen dyrere end
et filtreret kald. (3) Filterlogikken (js/filtrering.js, passerKoerekort i
js/data.js, Sortering.blandetRaekkefoelge) er testlåst i Node; en SQL-kopi af
den kan kun holdes ærlig med en test, der kører begge og sammenligner — og den
test kræver en database at køre mod.
HVORNÅR: når (a) backend-deployet virker (A1), og (b) lageret nærmer sig 2.000
rækker, eller forsidens/søgesidens hentning måles over 0,5 s. Så: migration
`soegeindeks` (union af listings + eksterne_annoncer i kortform) + RPC
`soeg_annoncer(filtre jsonb, side, pr_side, sortering)` der svarer {total,
kort[], facetter}; klienten beholder js/filtrering.js som sandhed og
sammenligner i en test mod RPC'en på samme datasæt, før den kobles til.
BEVIS: målingerne ovenfor er curl mod produktions-REST 23.08.2026; hydrerings-
testen er playwright mod dev-serveren under hostnavnet srp.test; "500 mod 548"
er Content-Range fra PostgREST mod klientens egen `limit=500`.

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

### D-008 delvist afvist — 17.08.2026
**FINDING:** "Favoritfunktionen har i drift ingenting at virke på." 0 af 20
eksterne kort har en "Gem annonce"-knap, 4 af 4 egne har den, og da drift har
0 egne annoncer kan hjertet i toppen — som står på alle 14 sider — aldrig
blive andet end 0. Findingen foreslår at sætte `.fav-btn` på det eksterne kort
og skriver: *"Findes der en grund til, at eksterne ikke må gemmes, skal den
skrives i work/DECISIONS.md — for lige nu ligner det en forglemmelse, ikke et
valg."*

**HVAD DER ER AFVIST:** `.fav-btn` på det eksterne kort.
**HVAD DER ER LAVET:** indgangen til "Gemte annoncer" i headeren og i
mobilskuffen vises først, når der ER noget gemt. En global knap, hele lageret
er udelukket fra, står ikke og lover noget.

**HVORFOR AFVIST — det er databasen, ikke smag:**

`supabase/002_favorites_reviews.sql:11-16`

    create table if not exists public.favorites (
      user_id    uuid not null references public.profiles(id) on delete cascade,
      listing_id uuid not null references public.listings(id) on delete cascade,
      ...

Indekserede annoncer ligger i `eksterne_annoncer`, ikke i `listings`. En
favorit på en ekstern annonce kan altså ikke skrives — fremmednøglen afviser
den. Det er ikke en antagelse om koden; det er tabellens definition.

| | |
|---|---|
| egne annoncer i drift (`listings`, status active) | **0** |
| indekserede i drift (`eksterne_annoncer`, status aktiv) | **332** |
| af de 332, der kan gemmes i `favorites` | **0** — fremmednøglen |
| sider hjerteikonet står på | **14 af 14** |

**HVAD DET VILLE KOSTE AT GØRE DET "RIGTIGT" I DAG.** `Store.toggleFavorite()`
skriver altid til localStorage og synkroniserer kun, når id'et er en uuid og
brugeren er logget ind. En ekstern uuid opfylder præcis den betingelse, så
knappen ville:

1. gemme lokalt og se ud som om den virkede,
2. sende et `insert` mod `favorites`, som fremmednøglen afviser,
3. give en advarsel pr. synkronisering ("N af M favoritter kunne ikke gemmes"
   — teksten kom med C-008's rettelse samme dag),
4. og for en LOGGET IND bruger aldrig nå hans konto. Siden hedder "Mine
   annoncer › Gemte annoncer". Det ord er et løfte om, at det følger med til
   næste enhed. Det ville det ikke.

Punkt 4 er hele afvisningen. Et hjerte, der gemmer forskelligt afhængigt af
om man er logget ind, uden at sige det, er den samme fejl som et gættet felt:
*"Ærlighed slår fuldstændighed"*. C-008's rettelse gør i øvrigt fejlen
u-destruktiv — favoritten bliver liggende lokalt — men u-destruktiv er ikke
det samme som ærlig.

**AT SAMMENLIGN VIRKER PÅ EKSTERNE ER IKKE EN MODSÆTNING.** `.card-compare`
bruger det samme `l.id` på de samme kort, og den knap ER der. Forskellen er,
at sammenligning ikke har nogen database bag sig overhovedet — den er ærligt
og udelukkende lokal, og der er ingen konto, den kunne have fulgt med til.

**HVAD DER SKULLE TIL:** enten en `favorites`-tabel, der kan pege på begge
kilder (fx `kilde` + `annonce_id` uden fremmednøgle, eller en separat
`eksterne_favoritter`), eller at eksterne annoncer får en række i `listings`.
Begge dele er en migration mod produktionsdatabasen, og migrationer køres
ikke uden mennesket. Den dag den findes, er `.fav-btn` på det eksterne kort
den rigtige rettelse — findingens forslag er ikke forkert, det er for tidligt.

**BEVIS:** tabeldefinitionen ovenfor er læst i `supabase/002_favorites_reviews.sql`
og bekræftet uændret i `supabase/017_ydelse.sql` (indekset
`favorites_listing_idx on public.favorites (listing_id)`). Antallene 0/332 er
dem, C-014's afvisning målte samme dag mod drift. Efter rettelsen målt i
browseren på 55559: med tom favoritliste er hjertet i headeren og "Gemte
annoncer" i mobilskuffen `hidden` på alle prøvede sider; efter ét klik på et
hjerte på et EGET kort dukker begge op med tallet 1 uden genindlæsning, og de
forsvinder igen, når favoritten fjernes.
