# Opret-annonce, runde 2 — blind efterprøvning af runde 1 mod Bilbasens "Sælg din bil" (AUDIT ONLY)

Ingen kodeændringer. Denne fil er det eneste, runden har skrevet.

Samme rolle som runde 1: marketplace-UX-kritiker på sælg-flowet — konvertering,
friktion, tillid, ærlighed. Sæt A er uændret (bilbasen.dk "Sælg din bil" +
Vend-login efter "Fortsæt uden"). Sæt B er `work/opret/r2/`: trin 1 er LIVE og
nu åben uden login; trin 2–4 er dev, nået via rigtig navigation (udfyldt trin 1
og 2; trin 4 viser den rigtige forhåndsvisning). m = 390×844, d = 1366×850.

Læst som kode: `opret-annonce.html`, `js/opret-annonce.js`, `login.html`,
`js/login.js`, `vilkaar.html`, samt `js/annonce.js`, `js/mine-annoncer.js`,
`js/dashboard.js`, `js/components.js` (`listingCardHTML`), `js/seo.js`,
`scripts/build-listing-pages.js`, `js/store.js`, `js/postnumre.js` og
`supabase/004*`-migrationerne, hvor en påstand i flowet skulle efterprøves.
Regler: `CLAUDE.md`, `docs/review/DECISIONS.md` ("Ærlighed slår
fuldstændighed"; intet uden måling).

**Ét forbehold.** Trin 3–4-billederne viser "Log ind" i headeren — de er taget
med Supabase slået fra, så login-gaten ved trin 2→3 (`js/opret-annonce.js:1045`,
`kraeverLogin()` kræver `db.enabled`) udløses ikke i dev. Gaten er derfor dømt
fra koden; selve trinnene er dømt fra billederne, og de er denne gang nået ved
at gå gennem flowet (stepperen viser flueben på tilbagelagte trin, "Tilbage"
findes, knappen hedder "Udgiv annonce" på trin 4).

---

## 0. Sådan er der målt

PIL på helsidesbillederne: rækker i brandfarven `#C6420E` = primær knap.
Tekstpåstande er talt/afprøvet i kode (bl.a. `strukturerBeskrivelse()` kørt
isoleret i node, `POSTNUMRE.length` talt, SERP-formlerne sammenlignet tegn for
tegn med `js/seo.js:208` og `scripts/build-listing-pages.js:126-127`).

| Måling | Runde 1 (før) | Runde 2 (r2) | A Bilbasen |
|---|---|---|---|
| Første møde, udlogget | login-mur (profilformular) | **trin 1, åben** | landingsside, ét felt |
| Trin 1 sidehøjde m | 4 160 px | **3 242 px** | 1 666 px (hele landingssiden) |
| "Fortsæt" trin 1 m (y) | 3 163–3 205 | **2 245–2 289** | "Sælg min bil" 394–444 |
| "Fortsæt" trin 1 d (y) | 1 915–1 959 | **1 319–1 363** | 220–270 |
| "Fortsæt" trin 2 m (y) | — | 967–1 011 (side 1 965) | — |
| "Udgiv annonce" trin 4 m (y) | — | 2 428–2 472 (side 3 426) | — |
| Login kræves | før første motorcykelfelt | **efter trin 2** (billeder) | før første bilfelt ("Fortsæt uden" → Vend) |
| Obligatoriske felter før login | 4 profil + 2 checkbokse | **0** (10 annoncefelter, ingen profilfelter) | 1 (e-mail hos Vend) |
| Postnr-påstand "1.089 danske postnumre" | — | **sand** (`POSTNUMRE.length` = 1089) | — |
| SERP-preview "Titel: 45 tegn" | — | **sand** (formlen matcher `js/seo.js:208` og build-scriptet i dag) | — |

---

## 1. Efterprøvning af O1-1..O1-15

Dom: **lukket** / **delvist** / **ikke lukket** — med bevis, ikke commit-tekst.

| ID | Dom | Bevis |
|---|---|---|
| **O1-1** login-mur | **lukket** | LIVE: `r2/bikerbasen-opret-trin1-{m,d}` viser formularen med "Log ind" i headeren — ingen mur. Kode: ingen redirect ved indlæsning (kun `?rediger=`, `js/opret-annonce.js:1018`); gaten ligger i step-next ved trin 2→3 (`:1045-1049`) med `Store.saveDraft()` FØR redirecten; autosave ved hvert trinskift (`goToStep`, `:62-66`). Indledningen over stepperen er sand: "Fire trin … Gratis for private — og du kan gemme en kladde undervejs." |
| **O1-2** "under 5 minutter" | **lukket** | `grep "minut"` i opret/login-filerne rammer kun kommentaren og en rate-limit-besked. Title: "Sælg din motorcykel — gratis annonce for private — Bikerbasen"; meta-description beskriver de fire trin. |
| **O1-3** login-asidens løfter | **lukket** | `login.html:147-149`: "Gem en søgning, og se hvor mange nye annoncer der er kommet" / "Se sælgerens navn, og markér at du vil i kontakt". `#auth-subtitle`-standard: "Log ind for at gemme annoncer og oprette dine egne annoncer." Begge de udpegede selektorer er rettet. (Søster-løfter andre steder på SAMME login-skærm holder stadig ikke — se O2-6.) |
| **O1-4** dokumentupload | **lukket** | `grep "doc-upload\|uploadedDocs\|hasDocumentation"` = 0 træf i HTML og JS. Erstattet af den foreslåede ærlige sætning i trin 3 (`opret-annonce.html:330`), synlig på `r2/…trin3-*`. |
| **O1-5** obligatorisk telefon | **lukket** (kortsigtet) | `login.html:228-230`: intet `required`, hint "Valgfrit. Vises ikke for købere endnu…". `js/login.js:344-349`: ingen telefon-validering. `vilkaar.html:145`: "telefonnummer er valgfrit". Den langsigtede telefon-RPC er fortsat en åben menneskebeslutning — og derfor lover flowet stadig ingen telefonvisning, hvilket er konsistent. Men hintets råd om at skrive nummeret i beskrivelsen er et nyt problem (O2-5). |
| **O1-6** "hvordan når køberen mig" | **delvist** | Kassen "Sådan når købere dig" findes i trin 4 (`opret-annonce.html:349-355`, synlig på `r2/…trin4-{m,d}`) — men dens midterste punkt er FALSK (O2-1: tallet findes ikke under Mine annoncer). Kvitteringssiden efter "Udgiv" er ikke bygget: stadig 1 s toast + redirect (`js/opret-annonce.js:935-937`). Halvdelen af fixet, og den leverede halvdel har en usand sætning i sig. |
| **O1-7** adfærdspåstande | **delvist** | I opret-flowet: væk. `#photo-hint` og `manglerListe()` siger nu kun det efterprøvelige ("dit kort står som 'Ingen fotos i denne annonce'", "der er plads til 12"). MEN den ordret flagede påstand lever videre uden data på `js/mine-annoncer.js:325`: "Annoncer med billeder og fuldt udfyldt udstyr bliver set markant oftere" — siden, sælgeren lander på EFTER udgivelse. |
| **O1-8** falsk captcha | **lukket** | Checkboxen er væk begge steder (kun kommentarer tilbage, `opret-annonce.html:361`, `login.html:252`); `validateStep(4)` tjekker kun `#f-terms`. |
| **O1-9** kladde-løfter | **delvist** | Autosave ved trinskift ✓, gemt før login-redirect ✓, ærlig toast "Kladde gemt på denne enhed (uden billeder)…" ✓ (`js/opret-annonce.js:1057-1060`). MEN den linje, findingen udpegede — `js/login.js:22` — står UÆNDRET: "Opret en profil eller log ind, så gemmer vi din annonce undervejs." Det er teksten, sælgeren ser i selve login-omvejen, og "vi gemmer" lyder stadig som konto-synk for en lokal kladde uden billeder. Committen påstår O1-9 lukket; den er det ikke dér, hvor løftet stod. |
| **O1-10** trin 1's længde | **lukket** | `<details class="valgfri-fold">` om historik+udstyr (`opret-annonce.html:225-227`), foldet på `r2/…trin1-*`. Målt: "Fortsæt" m 3 163 → **2 245**, sidehøjde 4 160 → 3 242; d 1 915 → 1 319. Det var findingens alternativ B, og det er leveret som lovet. |
| **O1-11** HEIC fejler for sent | **lukket** | `handleFiles()` kører `createImageBitmap(file)` pr. fil ved VALGET; fejl fjerner billedet fra gitteret og siger navnet + JPEG-rådet (`js/opret-annonce.js:344-353`). Fejlen sker nu på trin 3, ikke efter udgivelse. |
| **O1-12** fokus og feltfejl | **delvist** | Fokus på trinnets `<h2>` ved trinskift ✓ (`goToStep`, `:74-76`). Feltnære fejltekster og `aria-describedby` er IKKE lavet: kun `#postnr` har en `.field-error`; alle andre felter får fortsat kun rød kant + `aria-invalid` + en toast, der forsvinder (`markFieldError`, `:95-101`). |
| **O1-13** små checkbokse | **lukket** | `css/styles.css:2790-2791`: `.checkbox-inline input{20px}` + label 14 px i `--color-fg`. |
| **O1-14** stum stepper | **lukket** | `renderStepper()` sætter `title` og `aria-label` "Trin N: …" pr. step-item (`js/opret-annonce.js:48-49`) — findingens foreslåede fix. (Seende mobilbrugere ser fortsat kun tal for kommende trin; acceptabelt, fixet var selv formuleret sådan.) |
| **O1-15** indeksering | **lukket** | `login.html:12`: `noindex, follow`. Opret-siden er nu en reel side med sand title/description og canonical `/opret-annonce`. |

**Facit: 11 lukket, 4 delvist (O1-6, O1-7, O1-9, O1-12), 0 ikke lukket.**
Fællesnævneren for de fire delvise: koden blev ærlig, men teksterne UDEN FOR
`opret-annonce.*` — login-konteksten, mine-annoncer-asiden, kvitteringen — blev
ikke fulgt til dørs.

---

## 2. Blinddom — m og d, efter runde 1

### Mobil (390×844)

**B vinder nu — snævert, og af en anden grund end A taber.** A's første skærm
er stadig den bedste enkeltskærm i feltet: ét felt, én knap ved y 394, en udvej
og en kontaktvej. Men A's flow knækker ved næste skridt: "Fortsæt uden" fører
til en Vend-login (e-mail + engangskode, nyt brand, "Bilbasen er en del af
Vend" forklaret i småt) — FØR man har set ét bilfelt. B viser nu hele varen
først: otte typefliser over folden, de fem obligatoriske felter, valgfrit
foldet væk, pris/beskrivelse på trin 2 — og beder først om en konto, når der
skal billeder på, med kladden gemt. Målt: A kræver konto efter 0 udfyldte
felter; B efter 10 — og alle 10 handler om motorcyklen. Det er den rækkefølge,
runde 1 bad om, og den er reelt bedre end A's for en privat sælger, der vil
VIDERE.

Det, der holder dommen snæver: B's trin 1 er stadig 2 245 px til "Fortsæt"
(A: 394), der står fortsat intet om "hvorfor sælge her" eller nogen kontaktvej
på opret-siden (A har begge), og B's ærligheds-forspring har fået ridser:
kassen "Sådan når købere dig" indeholder en påstand, der ikke passer (O2-1),
og beskrivelses-assistenten digter en linje trods "intet digtes med" (O2-2).

### Desktop (1366×850)

**B vinder klart.** Trin 1 viser type, alle obligatoriske felter og folden på
én-to skærme ("Fortsæt" ved 1 319); trin 4 er nu et rigtigt gennemse-trin:
advarselsliste, mærker, SERP-tekst med sandt tegnantal, et kort der ER
søgesidens kort (`listingCardHTML` — samme funktion, ikke en kopi), spec-gitter
og beskrivelse. A har intet tilsvarende i sættet — dens næste skridt er en
generisk sort-hvid login-boks med brandskifte. B's trin 4 er det stærkeste
enkeltskærmbillede i hele sammenligningen; intet hos A viser sælgeren, hvad
køberen kommer til at se.

**Dommen på flowets troværdighed er dog betinget:** B lover nu mindre og
holder mere end i runde 1 — men de tre-fire steder, der stadig lover noget,
der ikke findes (O2-1, O2-2, O2-6, `js/login.js:22`), er præcis de steder, en
sælger tjekker, når den første henvendelse udebliver.

---

## 3. Nye findings (O2)

Severity som runde 1: **P1** = falsk/udokumenteret påstand, funktion virker
ikke som lovet, AA-brud eller blokerende friktion. **P2** = mærkbar forskel
med konsekvens for konvertering. **P3** = kosmetisk.

### P1

| ID | Sev. | Fil / selector | Måling | Konkret fix |
|---|---|---|---|---|
| **O2-1** | **P1** | `opret-annonce.html:353` (`.naa-koebere` li 2: "du ser antallet under Mine annoncer"); `js/annonce.js:1400-1401` ("Sælgeren kan se på sin annonce, at du har henvendt dig") | **Henvendelses-tallet har INGEN flade for private sælgere — to sider peger på hver sin, og begge er tomme.** `js/mine-annoncer.js` viser ingen tælling (renderMine: kun pris/år-sortering og slet-knap; `grep henvend` = 0). Egen annonceside viser kun "Din annonce"-redigeringslink (`js/annonce.js:1136-1138`). Tallene findes kun i `dashboard.html`, som er lukket for ikke-forhandlere (`js/dashboard.js:648`: `if (!user.isDealer)` → gate). Kassen, der blev bygget for at gøre O1-6 ærlig, indeholder altså selv en usand sætning — og køberens kvittering lover sælgeren noget, sælgeren aldrig ser. | Byg fladen: én række "X visninger · Y henvendelser (30 dage)" pr. annonce på mine-annoncer.html — dataene ligger allerede i `listing_stats` med ejer-RLS ("statistik: kun egen annonce", `supabase/004a_tabel.sql:18`), og `db.myListingStats()` findes (`js/supabase-api.js:399`). Indtil da: ret li 2 til "…markere, at de vil i kontakt" (punktum) og kvitteringen i annonce.js til det, der er sandt ("Vi registrerer din henvendelse på annoncen"). |
| **O2-2** | **P1** | `js/opret-annonce.js:686` (`strukturerBeskrivelse`: `dele.push('Skriv gerne, hvis du har spørgsmål eller vil aftale en fremvisning.')`); `opret-annonce.html:292` (hint: "intet digtes med") | **Assistenten digter — og digter en opfordring, sitet ikke kan indfri.** Kørt isoleret i node: output slutter altid med "Skriv gerne, hvis du har spørgsmål eller vil aftale en fremvisning." — en sætning, sælgeren aldrig har skrevet, under en knap der lover "Laver to linjer og en punktliste ud fra det, du selv har skrevet … intet digtes med" og en kodekommentar, der sværger "tilføjer aldrig et ord, hun ikke selv har skrevet". Værre: "Skriv gerne" inviterer køberen til at skrive — og trin 4's egen kasse fastslår to trin senere, at beskeder ikke videresendes. Assistentens ærlighed var flowets stærkeste kort i runde 1; den her linje sælger det kort. | Slet `:686`. Resten af funktionen holder sit løfte (efterprøvet: linje 1 = felter, linje 2 + punkter = sælgerens egne sætninger ordret, fakta = formularfelter). Vil man have en afslutning, skal den være sælgerens: lad feltet stå tomt og foreslå i hintet, at hun selv skriver, hvordan hun vil kontaktes. |

### P2

| ID | Sev. | Fil / selector | Måling | Konkret fix |
|---|---|---|---|---|
| **O2-3** | **P2** | `js/opret-annonce.js:1047` (gate-toast: "log ind, så fortsætter du med billederne") vs `:1030-1039` (`restoreDraft()` → `goToStep(1)`) | **Efter login-omvejen lander sælgeren på trin 1 — toasten lovede trin 3.** Kladden gemmer ikke, hvilket trin man var nået til; DOMContentLoaded gendanner felterne og går altid til trin 1. Sælgeren, der netop har udfyldt trin 1+2 og loggede ind for at "fortsætte med billederne", skal klikke sig gennem to allerede udfyldte trin (inkl. re-validering) for at komme tilbage. Mikroløftet i toasten er målbart brudt. | Gem trinnet med: `Store.saveDraft('form', …)` suppleres med `draft.trin = 3` før redirecten (`:1046`); ved gendannelse: hvis `draft.trin` findes og `validateStep(1) && validateStep(2)` består på de gendannede felter, `goToStep(draft.trin)` — ellers trin 1 som i dag. |
| **O2-4** | **P2** | `js/opret-annonce.js:487` (`year: … \|\| 2020`), `:484` (`type … \|\| 'naked'`), `:488` (`km … \|\| 0`), `:509` (`price … \|\| 0`) + `fillForm()` `:947-975` | **Kladden opfinder værdier, sælgeren aldrig har tastet.** "Gem kladde" på en tom/halv formular gemmer `year: 2020`, `type: 'naked'`, `km: 0`, `price: 0` — og `fillForm()` skriver dem TILBAGE i felterne ved gendannelse (set: `0` er hverken `null` eller `''`, så det sættes; typeradioen krydses af). En sælger, der gemte en kladde på trin 1 uden årgang, åbner siden og finder Årgang 2020, Km-stand 0 og Naked valgt — gættede felter på et site, hvis låste regel er "vi gætter aldrig" (DECISIONS.md). Autosave ved "Tilbage"-klik rammer samme vej. | Fjern fallbacks i `collectFormData()` (returnér `null`/`''` for det utastede; `Number('')`-vagterne kan blive). Standardværdierne var kun nødvendige for demo-udgivelsen — flyt dem ind i `publishListing()`s `!db.enabled`-gren, hvor de hører til, eller drop dem: valideringen kræver alligevel felterne før Udgiv. |
| **O2-5** | **P2** | `opret-annonce.html:354` (naa-koebere li 3: "skriv derfor gerne i beskrivelsen, hvordan du vil kontaktes"); `login.html:230` ("vil du kontaktes på telefon, så skriv det i annoncens beskrivelse"); mod `opret-annonce.html:9` meta ("kontaktoplysninger vises kun for indloggede") og `index.html:424` (sell-band: samme løfte) | **Flowet råder sælgeren til at underminere sit eget privatlivs-løfte.** To steder anbefales det at lægge kontaktvejen i beskrivelsen — men beskrivelsen vises OFFENTLIGT for udloggede på annoncesiden (kun sælgerkortet er bag login, `js/annonce.js:221`). Følger sælgeren rådet med et telefonnummer, står nummeret præcis dér, hvor meta-beskrivelsen og forsidens sælgerbånd lover, at det ikke står ("kun for indloggede" / "skjult for udloggede besøgende, søgemaskiner og robotter" `index.html:435`). Vi fjerner telefonnumre fra INDEKSEREDE titler (`fjernPersonoplysninger()`), og beder samtidig egne sælgere selv taste dem ind i en offentlig fritekst. | Beslut én linje og hold den: enten (a) byg telefon-RPC'en fra O1-5-langsigtet, så nummeret vises kontrolleret for indloggede, og fjern beskrivelses-rådet begge steder; eller (b) behold rådet, men ærligt: "Bemærk: beskrivelsen er offentlig — skriv træffetid, ikke telefonnummer" + ret meta/sell-band til det, der så er sandt. Ingen mellemting. |
| **O2-6** | **P2** | `js/login.js:34-36` ("Telefonnummer og profil er kun synlige for indloggede"), `:39-41` (`AUTH_ANNONCE`: "Log ind for at se sælgerens navn og kontaktoplysninger"), `:22` ("så gemmer vi din annonce undervejs" — O1-9's linje); `js/annonce.js:221` ("Kontaktoplysninger … er kun synlige for indloggede brugere") | **Login-skærmen holder stadig tre usande kontekst-løfter.** O1-3 rettede asiden og standard-underteksten, men de kontekstafhængige tekster blev glemt: kommer man fra en annonce eller en forhandlerside, loves "kontaktoplysninger"/"telefonnummer" bag login — og `js/backend-bridge.js` sætter `phone: null` på ALT fra databasen, så ingen indlogget har nogensinde set et nummer. Det er ordret samme fejlklasse som O1-3 (P1 dér), ét selector-lag dybere. | `AUTH_ANNONCE.tekst` → "Log ind for at se sælgerens navn og markere, at du vil i kontakt." `forhandler.html`-konteksten → "Forhandlerens profil er kun synlig for indloggede." `:22` → "…så kan du gemme en kladde på denne enhed undervejs." `js/annonce.js:221` → "Sælgerens navn er kun synligt for indloggede brugere." Én gennemskrivning, fire linjer. |
| **O2-7** | **P2** | `js/opret-annonce.js:1057-1060` (`#save-draft`-handler uden `editingId`-vagt) vs `:62-66` (autosave er korrekt vagtet med `!editingId`) | **"Gem kladde" i redigeringstilstand forurener ny-annonce-kladden.** Autosaven springer redigering over, men knappen gør ikke: åbn `?rediger=<id>`, tryk "Gem kladde" — den eksisterende annonces data skrives til den fælles kladde. Næste gang sælgeren åbner opret-siden for en NY annonce, gendannes den gamle annonces mærke, pris og beskrivelse med toasten "Din kladde er hentet frem" — og et "Udgiv" derfra opretter en dublet-annonce. Knappen står synlig på alle fire trin i redigeringstilstand (`r2`-billederne er ikke-redigering; koden viser den altid). | I redigeringstilstand: skjul "Gem kladde" (ændringer gemmes først ved "Gem ændringer", og det siger lead-teksten allerede) — eller vagt handleren med `if (editingId) return;` + toast "Ændringer gemmes, når du trykker Gem ændringer." |

### P3

| ID | Sev. | Fil / selector | Måling | Konkret fix |
|---|---|---|---|---|
| **O2-8** | **P3** | `js/opret-annonce.js:611` (`manglerListe`: "Effekt (hk) er ikke udfyldt — uden den kan vi ikke vise, om…A2") og `renderSeoAssistent`-blokken "Sådan bliver annoncen mærket" (`kk.forklaring`: "Effekten står ikke i annoncen, så vi kan ikke afgøre, om den også kan køres på A2") | Samme mangel meldes to gange på trin 4 med to formuleringer, 300 px fra hinanden (`r2/…trin4-m-full` y ≈ 300 og ≈ 520). Begge er sande; gentagelsen udvander listen "Før du udgiver". | Når `!data.power` allerede giver et punkt i `manglerListe`, så undertryk `kk.forklaring`-linjen under mærkerne (eller omvendt). Én kilde, én visning. |
| **O2-9** | **P3** | `js/opret-annonce.js:518` (`sellerFromUser`: `phone: user.phone \|\| '+45 00 00 00 00'`) | Fabrikeret telefonnummer i sælgerobjektet. Rammer kun demo-tilstand (`!db.enabled` — udgivelsen `:823-833` gemmer objektet lokalt) og preview-kortet; men annoncesiden bygger "Vis telefonnummer" af netop `seller.phone` (`js/annonce.js`), så en demo-annonce kan kvittere en køber med et nummer, der ringer ud i ingenting. `rating: '5.0'` uden anmeldelser er samme slægt. | `phone: user.phone \|\| null` og `rating: null` — visningslaget håndterer allerede manglende telefon (O1-5-arbejdet beviste det). |

---

## 4. Den ene ændring, der flytter mest i runde 3

**Giv den private sælger ÉN sand flade for henvendelser — og lad alle løfter
pege på den (O2-1).** Én række pr. annonce på `mine-annoncer.html`: "X
visninger · Y henvendelser (30 dage)". Alt ligger klar: `listing_stats` har
ejer-RLS (`004a_tabel.sql`), `db.myListingStats()` findes, og dashboardets
`statsForListing()` viser regnestykket. Det er én query og ~30 linjer DOM.

Hvorfor netop den: runde 1's "ene ændring" (login-muren) er leveret, og flowet
er nu bedre end A's for en privat sælger — frem til det øjeblik, hun har
udgivet. Dér står tre løfter i dag og peger på tomme flader: trin 4-kassen
("du ser antallet under Mine annoncer"), køberens kvittering ("Sælgeren kan se
på sin annonce…") og assistentens digtede "Skriv gerne…". Med tallet på
mine-annoncer bliver det første løfte sandt, det andet kan rettes til at pege
samme sted, og sammen med sletningen af én linje (O2-2, `:686`) er hele
kontakthistorien pludselig ærlig hele vejen rundt. Det er forskellen på et
flow, der udgiver en annonce, og et flow, sælgeren kommer tilbage til med
motorcykel nummer to.

---

## Resumé

1. 11 af 15 runde 1-findings er reelt lukket, 4 delvist (O1-6, O1-7, O1-9,
   O1-12) — mønstret i de delvise: teksterne uden for opret-filerne blev glemt.
2. Login-muren er væk, målt: trin 1 åben live, gate ved trin 2→3, kladde gemt.
   Trin 1 m: Fortsæt 3 163 → 2 245, side 4 160 → 3 242.
3. Blinddom: B vinder nu på begge flader — A kræver konto efter 0 bilfelter
   (Vend), B efter 10 motorcykelfelter; B's trin 4-preview (søgesidens eget
   kort + sandt SERP-tegnantal) har intet modstykke hos A. Snævert på mobil.
4. 9 nye findings: 2×P1, 5×P2, 2×P3. Tyngdepunkt: kontakt-løfter uden flade
   (O2-1), assistenten digter trods "intet digtes med" (O2-2, én linje),
   login-retur lander på trin 1 mod toastens løfte (O2-3), kladden opfinder
   2020/Naked/0 km (O2-4), redigering forurener kladden (O2-7).
5. Runde 3's ene ændring: henvendelses-/visningstal på mine-annoncer.html —
   dataene findes allerede; det gør tre usande løfter sande med ét indgreb.
