# Opret-annonce, runde 3 — SLUTDOM: efterprøvning af runde 2 mod Bilbasens "Sælg din bil" (AUDIT ONLY)

Ingen kodeændringer. Denne fil er det eneste, runden har skrevet. Dette er
sidste runde i loopet — rapporten er afsluttende: hvad står tilbage, og hvad
er dommen.

Samme rolle som runde 1 og 2: marketplace-UX-kritiker på sælg-flowet —
konvertering, friktion, tillid, ærlighed. Sæt A er uændret (bilbasen.dk
"Sælg din bil" + Vend-login efter "Fortsæt uden"). Sæt B er `work/opret/r3/`
EFTER runde 2 (commit 179389b): trin 1 er LIVE; trin 2–4 er dev, nået via
rigtig navigation (trin 1 udfyldt med hk = 47, beskrivelse med tre sætninger).
m = 390×844, d = 1366×850.

Læst som kode: `js/opret-annonce.js`, `js/mine-annoncer.js`, `js/login.js`,
`login.html`, `js/annonce.js`, `opret-annonce.html`, `js/supabase-api.js`
(`myListingStats`), `js/components.js` (`injectDealerNav`), `js/dashboard.js`
(gaten), `css/styles.css` (`.felt-fejl`, `.lr-statistik`), `index.html`
(sell-band) og `docs/review/DECISIONS.md` (Turnstile-status).

**Samme forbehold som runde 2:** trin 2–4-billederne er taget med Supabase
slået fra ("Log ind" i headeren), så login-gaten ved trin 2→3 og statistikken
på Mine annoncer er dømt fra koden; selve trinnene er dømt fra billederne.
`npm test` kørt under audit: 0 fejl.

---

## 0. Sådan er der målt

Knapper målt i pixels på helsidesbillederne (m-full skaleres med
sidehøjde/2000). Tekstpåstande efterprøvet i kode med grep og gennemlæsning
af de udpegede linjer.

| Måling | Runde 1 (før) | Runde 2 (r2) | Runde 3 (r3) | A Bilbasen |
|---|---|---|---|---|
| Første møde, udlogget | login-mur | trin 1, åben | **trin 1, åben (uændret)** | landingsside, ét felt |
| Trin 1 sidehøjde m | 4 160 px | 3 242 px | **3 331 px** | 1 666 px |
| "Fortsæt" trin 1 m (y) | 3 163 | 2 245 | **≈2 265** | "Sælg min bil" 394–444 |
| "Fortsæt" trin 1 d (y) | 1 915 | 1 319 | **≈1 341** (side 1 831) | 220–270 |
| "Udgiv annonce" trin 4 m (y) | — | 2 428 (side 3 426) | **≈2 357** (side 3 421) | — |
| Obligatoriske felter før login | 4 profil + 2 checkbokse | 0 (10 annoncefelter) | **0 (10 annoncefelter)** | 1 (e-mail hos Vend) |
| Retur efter login-omvej | — | trin 1 (mod toastens løfte) | **trin 3** (`videreTilTrin` + tavs `trinUdfyldt`) | — |
| Usande løfter i selve flowet | ≥6 (r1's optælling) | 4 (O2-1/2/5/6) | **0** | — |
| Digtede kladde-værdier | — | year 2020 / naked / 0 km / 0 kr | **kun ccm 0 tilbage** (O3-5) | — |

Trin 1 m voksede 89 px fra r2 (3 242 → 3 331) — det er hint-/foldtekst, ikke
nye obligatoriske felter; "Fortsæt"-positionen er stabil (2 245 → ≈2 265).

---

## 1. Efterprøvning af O2-1..O2-9 og de fire delvise O1

Dom: **lukket** / **delvist** / **ikke lukket** — med bevis i kode og billeder,
ikke commit-tekst.

### O2-findings

| ID | Dom | Bevis |
|---|---|---|
| **O2-1** henvendelsestal uden flade | **lukket** | `js/mine-annoncer.js:44` `visAnnonceStatistik()` — kaldes fra `renderMine()` (`:94`), summerer `db.myListingStats(30)` (reel query mod `listing_stats` med ejer-RLS, `js/supabase-api.js:399-403`) og indsætter "X visninger · Y henvendelser (30 dage)" pr. egen annonce-række (CSS `.lr-statistik`, `css/styles.css:2787`). Ærligt fejl-design: "Fejler kaldet, staar der ingenting — aldrig et gaettet nul" (`:43`, og koden gør det: `if (error \|\| !data) return`). Trin 4-kassens li 2 ("du ser antallet under Mine annoncer") er dermed SAND, og køberens kvittering peger nu samme sted: "Sælgeren kan se antallet af henvendelser under Mine annoncer" (`js/annonce.js`, contact-receipt-body). Forbehold: fladen er dømt fra kode — r3-billederne dækker ikke mine-annoncer.html, og dev-sættet er udlogget. |
| **O2-2** assistenten digter | **lukket** | Slutlinjen "Skriv gerne …" er slettet — kun kommentaren står tilbage (`js/opret-annonce.js:702`). Verificeret i billede: trin 4 m/d viser beskrivelsen "Velholdt og nysynet i marts. Servicehaefte medfoelger. Nye daek 2024." — slutter hvor sælgerens egne ord gør. Trin 2-hintet "intet digtes med" (billede r3-trin2-m) er nu sandt. |
| **O2-3** login-retur lander på trin 1 | **lukket** | Gaten gemmer `Object.assign(collectFormData(), { videreTilTrin: 3 })` FØR redirecten (`js/opret-annonce.js:1075`). Gendannelsen (`:1061-1063`) springer kun, hvis `videre === 3 && Store.getUser()?.remote && trinUdfyldt(1) && trinUdfyldt(2)` — og `trinUdfyldt()` (`:101-107`) er den lovede TAVSE kontrol: ingen toasts, ingen røde rammer. Ellers trin 1 som før. Præcis det foreslåede fix, med vagt. |
| **O2-4** kladden opfinder værdier | **lukket** (én rest → O3-5) | `collectFormData()` (`js/opret-annonce.js:489-540`): `type … \|\| null`, `year … \|\| null`, `km: '' ? null`, `price: '' ? null` — alle fire udpegede fallbacks er væk, og kommentaren `O2-4` dokumenterer hvorfor. `fillForm()`s `set()` springer `null`/`''` over. REST: `ccm: Number(…) \|\| 0` står tilbage — en kladde gemt med tom ccm gendannes som Motorstørrelse "0" (0 er hverken null eller ''). Ét felt af fem; findingen navngav det ikke, men det er samme klasse. |
| **O2-5** råd underminerer privatlivs-løftet | **lukket** (medløber → O3-2) | Rådet er ude begge steder: `opret-annonce.html:354-357` er nu en kommentar, li 3 siger i stedet det sande "Vi videresender ikke beskeder og viser ikke dit telefonnummer …"; `login.html:230` er kortet til "Valgfrit. Vises ikke for købere." Grep `beskrivelse.*kontakt` = 0 aktive træf. MEN modpartens løfte "kontaktinfo vises kun for indloggede" står stadig i meta (opret-annonce.html:9/19/26) og forsidens sell-band (index.html:424/435) — se O3-2. |
| **O2-6** login-skærmens tre usande kontekst-løfter | **lukket** | Alle fire udpegede linjer er skrevet om (`js/login.js:15-45`): opret-konteksten siger "Din kladde er gemt på denne enhed. Gratis for private." (O1-9's linje), forhandler-konteksten "Forhandlerens profil er kun synlig for indloggede", `AUTH_ANNONCE` "Log ind for at se sælgerens navn og markere, at du vil i kontakt" — med O2-6-kommentar over. `js/annonce.js:221`: låsenoten siger nu "Sælgerens navn og profil er kun synlige …" — ordet "Kontaktoplysninger" er væk. Grep "Telefonnummer og profil" = 0. |
| **O2-7** "Gem kladde" forurener i redigering | **lukket** | Dobbelt værn: `if (editingId){ kladdeKnap.hidden = true; }` OG `if (editingId) return;` i handleren (`js/opret-annonce.js:1102-1106`). Autosaven var allerede vagtet. Dublet-vejen er lukket. |
| **O2-8** hk-manglen meldes to gange | **lukket** | `kk.forklaring` renderes kun når `!kk.kode && data.power` (`js/opret-annonce.js:744`) — dvs. aldrig samtidig med `manglerListe()`s `!data.power`-punkt (`:650`). Billede r3-trin4 (hk = 47): mærket "Kørekort A2" vises, intet hk-punkt, ingen gentagelse. |
| **O2-9** fabrikeret telefon og rating | **lukket** | `sellerFromUser()`: `phone: user.phone \|\| null, … rating: null, reviews: 0` med O2-9-kommentar (`js/opret-annonce.js:547-548`). Ingen demo-annonce kan længere kvittere en køber med et nummer, der ringer ud i ingenting. |

### De fire delvise O1

| ID | Dom nu | Bevis |
|---|---|---|
| **O1-6** "hvordan når køberen mig" | **lukket** (rest → O3-6, P3) | Kassen "Sådan når købere dig" består nu af tre SANDE linjer (billede r3-trin4-m/d): søgningen, navn+markering med tal under Mine annoncer (sand via O2-1), ingen beskeder/telefon med samme henvisning. Resten af findingen — en kvittering efter "Udgiv" — er stadig toast + redirect (`js/opret-annonce.js`, publishListing: 'Din annonce er udgivet!' + 1 000 ms → annonce.html). Sælgeren lander dog på sin egen live annonce, hvilket ER en form for kvittering; det tilbageværende er P3. |
| **O1-7** adfærdspåstande | **lukket** | Sidste rest — mine-annoncers aside — er skrevet om til det efterprøvelige: "Uden foto står din annonce som 'Ingen fotos i denne annonce' i søgningen, og hvert tomt felt bliver til 'Ikke oplyst'" (`js/mine-annoncer.js:352`). Grep "markant" i js/ = 0. Ingen udokumenteret adfærdspåstand tilbage i sælg-sporet. |
| **O1-9** kladde-løfter | **lukket** | Den udpegede linje (`js/login.js`, opret-annonce-konteksten) siger nu "Opret en profil eller log ind for at lægge billeder på og udgive. Din kladde er gemt på denne enhed. Gratis for private." — "vi gemmer din annonce" er væk; stedet, løftet stod, siger nu det sande. Toast og autosave var allerede ærlige i r2. |
| **O1-12** feltnære fejltekster | **lukket** | `markFieldError()` opretter nu `.felt-fejl` (`<p>` med tekst, `id`, `aria-describedby`-kobling) for ALLE felter, ikke kun postnr (`js/opret-annonce.js`, O1-12-kommentaren står i funktionen); grænseværdi-fejl får specifik besked via `bound(...)`; `validateStep()` rydder både klasse, aria og fejl-element ved rettelse. CSS `css/styles.css:2783-2784`. Det var præcis det, findingen bad om. |

**Facit runde 3: 9 af 9 O2 lukket, 4 af 4 delvise O1 lukket.** Samlet over
loopet: alle 15 O1- og alle 9 O2-findings er lukket i den form, de blev
stillet. To smårester er nedgraderet og genfremsat som O3-5 og O3-6 (P3).
Mønstret fra runde 2 — "teksterne uden for opret-filerne blev glemt" — er
denne gang taget alvorligt: login.js, annonce.js og mine-annoncer.js blev
fulgt til dørs. Det eneste lag, ingen runde har rørt, er meta/forside (O3-2).

---

## 2. Endelig blinddom — m og d, efter tre runder

### Mobil (390×844)

**B vinder — nu klart, ikke snævert.** Det, der holdt r2-dommen snæver, var
ærligheds-ridserne: en usand sætning i selve tillidskassen (O2-1) og en
assistent, der digtede under et "intet digtes med" (O2-2). Begge er væk og
verificeret i billederne. Tilbage står styrkeforholdet fra r2, uændret: A's
første skærm er stadig feltets bedste enkeltskærm (ét felt, knap ved y 394,
"Fortsæt uden", kontaktvej) — men A's skridt 2 er en Vend-login med
brandskifte ("Bilbasen er en del af Vend", e-mail + engangskode) efter NUL
udfyldte bilfelter. B beder først om konto efter 10 udfyldte
motorcykelfelter, husker både kladden og trinnet over omvejen (O2-3), og
hvert løfte undervejs kan nu efterprøves i koden. A's tilbageværende fordele
er reelle men mindre: kortere første skærm, "Hvorfor skal du sælge"-sektionen
og Solgt.com-alternativet (garanteret salg) — B's opret-side argumenterer
stadig ikke for sig selv (O3-3).

### Desktop (1366×850)

**B vinder klart — uændret fra r2, nu uden forbehold.** Trin 1: alle
obligatoriske felter + folden med "Fortsæt" ved ≈1 341. Trin 4 er fortsat
sammenligningens stærkeste enkeltskærm: advarselsliste beregnet af de
faktiske felter, mærker, SERP-tekst med sandt tegnantal, søgesidens EGET kort
som preview, spec-gitter, beskrivelse uden digtede linjer — og en
tillidskasse, hvis tre sætninger nu alle er sande. A har intet tilsvarende;
dens næste skridt er en generisk login-boks. R2's betingelse — "de tre-fire
steder, der stadig lover noget, der ikke findes" — er indfriet i flowet;
det tilbageværende usande lag er meta-beskrivelser og forsidens sell-band
(O3-2), som ingen ser INDE i flowet.

### Før/efter over de tre runder (5 linjer)

1. **Runde 0→1:** login-mur (4 profilfelter + 2 checkbokse før første
   MC-felt) → åbent trin 1; dokumentupload-teater og falsk captcha fjernet.
2. **Målt friktion:** "Fortsæt" trin 1 m: 3 163 → 2 245 → ≈2 265 px;
   d: 1 915 → 1 319 → ≈1 341; obligatoriske felter før login: 6 → 0.
3. **Login flyttet og gjort billig:** konto kræves efter 10 motorcykelfelter
   (A/Vend: efter 0), og omvejen taber hverken kladde eller trin (O2-3).
4. **Løfte-regnskabet:** ≥6 udokumenterede påstande (r1) → 4 (r2) → 0 i
   flowet (r3); kontakthistorien er ærlig hele vejen: kasse → kvittering →
   tal på Mine annoncer peger på samme sande flade.
5. **Dommen vandrede:** klart A (r1) → snævert B på mobil, klart B på
   desktop (r2) → **klart B på begge flader (r3)**. Flaskehalsen er ikke
   længere flowet, men leverancen bag det: køberen kan stadig ikke NÅ
   sælgeren med andet end en optælling.

---

## 3. Restliste (O3) — det, der stadig står i vejen for en rigtig privat sælger

Severity som før: **P1** = blokerer det, flowet er til for. **P2** = mærkbar
konsekvens for konvertering/tillid. **P3** = kosmetik — og det siges ærligt.

| ID | Sev. | Fil / flade | Måling | Konkret fix |
|---|---|---|---|---|
| **O3-1** | **P1** (infrastruktur) | Hele kontaktkæden: `js/annonce.js` (contact-modal), `supabase/` (grep `messages`/`beskedlevering` = 0 tabeller), `js/backend-bridge.js` (`phone: null` på alt) | **Køberen kan ikke nå sælgeren.** Beskedteksten kasseres (kun `record_listing_event`-tælling), telefon vises aldrig, og flowets ærlige slutsætning er reelt "vi leverer ingen kontakt". Flowet konverterer nu en sælger til en udgivet annonce — men annoncen kan ikke konvertere en køber til en HANDEL. Alt andet på denne liste er småt ved siden af. | Byg ÉN leveringsvej og lad det være den mindste: (a) beskedtabel + RLS + mail-relæ ("ny henvendelse på din annonce" uden køberens tekst i mailen, link til login), eller (b) telefon-RPC'en fra O1-5-langsigtet (vis nummer for indloggede efter sælgerens samtykke). (a) kræver mailudbyder, (b) kun en migration + samtykke-checkbox i opret-flowet. |
| **O3-2** | **P2** | `opret-annonce.html:9/19/26` (meta/og/twitter: "kontaktoplysninger vises kun for indloggede"); `index.html:424` ("din kontaktinfo vises kun for indloggede") og `:435` ("Din kontaktinfo er skjult for udloggede …") | **O2-6's fejlklasse, ét lag længere ude.** Der findes ingen kontaktinfo at vise for NOGEN (`phone: null` på alt fra basen), så sætningen lover indloggede købere noget, de aldrig får — og det er sælgerens salgsargument nr. 1 på forsidens sell-band. Flowet blev renset i r2/r3; markedsføringen af det blev ikke. | Samme énlinjes-gennemskrivning som O2-6: "dit navn vises kun for indloggede — vi viser aldrig telefon eller e-mail offentligt" i meta ×3 og sell-band ×2. Bortfalder/omskrives, når O3-1(b) bygges. |
| **O3-3** | **P2** | `opret-annonce.html` trin 1 (billede r3-trin1-m/d: intet salgsargument, ingen kontaktvej) | A åbner med "Hvorfor skal du sælge på Bilbasen?" (tre grunde) + hjælpelinks; B's opret-side siger kun "Gratis for private". Forsidens sell-band har argumenterne (index.html:424-435), men den udloggede, der lander direkte på /opret-annonce (og det er dem, SEO-titlen "Sælg din motorcykel" henter), ser dem aldrig. | Én linje under lead-teksten: "Din annonce står side om side med alle indekserede — og dit navn er skjult for udloggede." + link til sikkerhed.html. Ingen landingsside; to elementer. |
| **O3-4** | **P3** | `js/opret-annonce.js:651` (`manglerListe`: `/\bsyn(et)?\b/i`) | Målt i billede r3-trin4-m/d: punktet "Sidste syn er ikke oplyst — det er tit et af de første spørgsmål …" står DIREKTE under beskrivelsen "Velholdt og **nysynet** i marts". Regexen kræver ordgrænse før "syn" og misser "nysynet"/"nysynet"-sammensætninger — netop det, tekstsøgningen var til for at undgå ("så vi ikke beder om noget, hun allerede har skrevet"). | Udvid til `/(ny)?syn(et\|srapport)?/i` eller simpelt `/syn/i` (dansk: falske positiver er sjældne i denne kontekst — "usynlig" er det eneste realistiske, og prisen for et undertrykt punkt er lav). |
| **O3-5** | **P3** | `js/opret-annonce.js:505` (`ccm: Number(…) \|\| 0`) + `fillForm()`s `set()` (0 er hverken null eller '') | O2-4's sidste felt: "Gem kladde" med tom ccm gemmer `ccm: 0`, og gendannelsen skriver "0" ind i Motorstørrelse — et gæt på et site med reglen "vi gætter aldrig". De fire navngivne felter blev rettet; mønsteret blev ikke ført helt igennem. | Samme mønster som km/price: `ccm: value.trim() === '' ? null : Number(…) \|\| 0`. Én linje. |
| **O3-6** | **P3** | `js/opret-annonce.js` (`publishListing`: toast 1 000 ms + redirect til annonce.html) | O1-6-resten. Landing på egen live annonce er en acceptabel kvittering, men toasten "Din annonce er udgivet!" når ikke at blive læst, og ingen siger "dit visnings-/henvendelsestal står under Mine annoncer" i det øjeblik, sælgeren er mest modtagelig. | Redirect med `?udgivet=1`; annonce.html viser ét lukbart banner: "Annoncen er udgivet. Følg visninger og henvendelser under Mine annoncer." (~15 linjer, ingen ny side). |
| **O3-7** | **P2** (infrastruktur) | `record_listing_event` / `db.recordListingEvent` (js/annonce.js) — ubeskyttet mod scripts; `docs/review/DECISIONS.md:199-202` erkender det selv ("et curl-loop") | Henvendelses-/visningstallet er efter O2-1 flowets BÆRENDE sandhed — og det kan pumpes op af en robot uden udfordring (Turnstile er bevidst udskudt til Cloudflare-kontoen, A3). Et tal, alle løfter peger på, som en konkurrent kan gøre meningsløst med en curl-løkke, er en tikkende tillidsregning. | Kør A3: Turnstile på `record_listing_event` (og udgivelse) via edge function, som DECISIONS.md allerede har projekteret. Indtil da: server-side dedup pr. dag/IP er en migration, ikke en konto. |
| **O3-8** | **P3** (ærligt: kosmetik) | Trin 1 mobil, billede r3-trin1-m-full: 8 typefliser koster ≈1 300 px af de 2 265 til "Fortsæt" | B når aldrig A's 394 px — A's skærm 1 er en landingsside, ikke en formular, så målet er forkert at jage. Men fliserne er den ene post, der kan betales af: mindre billedhøjde eller tekst-chips på mobil ville flytte "Fortsæt" op mod ~1 500 px uden at fjerne noget. | `@media (max-width: 480px)`: flisebilleder 96→56 px høje eller `grid-template-columns: repeat(4, 1fr)` med tekstetiketter. Rent CSS. |

Ikke genfremsat: A's Solgt.com-alternativ (kræver en forretningspartner, ikke
kode) og nummerplade-opslag (kræver DMR-integration; B's felter er få nok til,
at gevinsten er lille). Begge er forretningsbeslutninger uden for loopet.

---

## 4. Anbefaling — hvis mennesket kun gør ÉN ting

**Byg kontaktleverancen (O3-1) — og vælg den billige udgave: telefon-RPC'en.**

Tre runder har gjort flowet ærligt, åbent og målbart bedre end referencens:
login-muren faldt (r1), løfterne blev sande (r2), og efterprøvningen holder
(r3). Men ærligheden har blotlagt flowets egentlige grænse: slutproduktet er
en annonce, en køber ikke kan handle på. "Vi videresender ikke beskeder og
viser ikke dit telefonnummer" er en sand sætning — og en sælger, der læser
den på trin 4, har fået sandheden serveret præcis dér, hvor konkurrenten
lover en køberkontakt. Hver dag uden leverance er de 10 udfyldte felter og
det ærlige preview en investering uden afkast.

Den mindste hele løsning er (b) fra O3-1: én migration (samtykkefelt +
RPC, der kun returnerer telefon for indloggede, når sælgeren har sagt ja),
én checkbox på trin 2 eller i profilen ("Vis mit nummer for indloggede
købere"), og genbrug af annonce-sidens eksisterende "Vis telefonnummer"-flade.
Ingen mailudbyder, ingen beskedmoderation, ingen ny tabelklasse. Den gør
samtidig O3-2 til en sand sætning i stedet for en omskrivning og giver
O2-1-tallet noget at være tal OM. Beskedlevering kan komme senere — telefonen
er den vej, DECISIONS.md's egen kvitteringstekst allerede kalder "den
hurtigste".

---

## Resumé

1. Alle 9 O2-findings og alle 4 delvise O1 er efterprøvet LUKKET i kode og
   billeder — samlet over loopet: 24 af 24 findings leveret som stillet.
2. To smårester nedgraderet til P3 og genfremsat (O3-5 ccm-0-kladde,
   O3-6 kvittering efter Udgiv); ét nyt regex-hul fundet i billederne (O3-4:
   "nysynet" udløser stadig "Sidste syn er ikke oplyst").
3. Slutdom: **B vinder klart på både mobil og desktop.** A kræver Vend-konto
   efter 0 bilfelter; B efter 10 motorcykelfelter med kladde OG trin bevaret.
   B's trin 4 er sammenligningens bedste skærm; 0 usande løfter i flowet.
4. Tilbage står 8 O3-punkter: 1×P1 (køberen kan ikke nå sælgeren — infra),
   3×P2 (meta/sell-band lover kontaktinfo, intet "hvorfor sælge her" på
   opret-siden, Turnstile-løst henvendelsestal), 4×P3-kosmetik.
5. Den ene ting: byg telefon-RPC'en (O3-1b) — én migration + én checkbox.
   Den giver flowets ærlige tal noget at handle på og gør det sidste usande
   lag (O3-2) sandt i stedet for omskrevet. Loopet kan lukkes her.
