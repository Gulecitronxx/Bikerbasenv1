# Opret-annonce, runde 1 — blind kritik af "sælg din motorcykel"-flowet mod Bilbasens "Sælg din bil" (AUDIT ONLY)

Ingen kodeændringer. Ingen produktionsfil er rørt. Denne fil er det eneste,
runden har skrevet.

Rollen er marketplace-UX-kritiker med speciale i sælg-flows: konvertering,
friktion, tillid, ærlighed. Sæt A er bilbasen.dk "Sælg din bil"
(`work/opret/bilbasen-saelg-{m,d}.png(-full)`) plus det, der sker ved "Fortsæt
uden" (`bilbasen-saelg-trin2-*`: login hos Vend). Sæt B er bikerbasen.dk:
`bikerbasen-opret-udlogget-*` er LIVE (det, en udlogget sælger faktisk møder på
`/opret-annonce.html`), og `bikerbasen-opret-trin1..4-*` er selve formularen
fra dev-serveren med Supabase slået fra. m = 390×844, d = 1366×850.

Læst først, som regler: `CLAUDE.md` (aggregator; 541 annoncer indekseret, 0
egne; alt på siden skal være sandt), `docs/review/DECISIONS.md` ("Ærlighed
slår fuldstændighed"; D6-F2: rækkevidde- og tidspåstande uden måling er P1 og
er fjernet fra forsiden), `work/DECISIONS.md` (kontaktformularen kvitterer kun
med det, vi kan bakke op — der findes ingen beskedtabel), `docs/review/BACKLOG.md`
(D7-S1: søgeagenten må ikke love mail; `dev_set_plan` fjernet; forhandlerens
betalingslås). Læst som kode: `opret-annonce.html`, `js/opret-annonce.js`,
`login.html` + `js/login.js`, `mine-annoncer.html`, `vilkaar.html`,
`js/supabase-api.js`, `js/backend-bridge.js`, `js/annonce.js` (hvad der sker
med annoncen bagefter), `supabase/schema.sql`, `006`, `007`, `019`, `020`,
`DEPLOY.md`.

**To forbehold, der skal stå øverst.**

1. `trin2`–`trin4`-billederne er IKKE taget ved at gå gennem flowet. Stepperen
   står på "1 Type & specs" i alle fire trin, "Tilbage"-knappen mangler, knappen
   hedder "Fortsæt" også på trin 4 (koden skriver "Udgiv annonce" dér), og
   trin 4's forhåndsvisning er tom (en pink, tom `#preview-note`-bjælke og
   ≈400 px luft). Det er, hvad man får ved at fjerne `hidden` fra sektionerne i
   stedet for at kalde `goToStep()`. Trin 4 — kortforhåndsvisning, spec-gitter,
   SEO-assistent, "Før du udgiver"-listen — er derfor dømt fra koden, ikke fra
   billedet. Næste optagelse skal klikke "Fortsæt" med udfyldte felter.
2. Blinddommen handler om FØRSTE MØDE og flowets troværdighed for en privat
   sælger. Bilbasens egen annonceformular er ikke med i sættet; jeg
   sammenligner derfor landingsside + login (A) mod login-mur + formular (B),
   som opgaven beskriver.

---

## 0. Sådan er der målt

Billederne er læst som billeder (Read) og målt med PIL: brandfarvede rækker
(Bilbasen `#FF4D00`, Bikerbasen `#C6420E`) for primære knapper; resten er
aflæst på helsidesbillederne. Feltantal og påstande er talt i HTML/JS.

| Måling | A Bilbasen | B Bikerbasen (live, udlogget) | B trin 1 (formular) |
|---|---|---|---|
| Sidehøjde m | 1 666 px | 1 974 px (login) | **4 160 px** |
| Primær CTA m (y) | "Sælg min bil" **394–444** | "Fortsæt" (opret profil) 759–803 | "Fortsæt" **3 163–3 205** |
| Primær CTA d (y) | 220–270 | 771–815 | 1 915–1 959 (side 2 427) |
| Felter før CTA m | **1** (nummerplade) — eller 0 ("Fortsæt uden") | 4 obligatoriske + 2 afkrydsninger | 6 obligatoriske + 13 valgfri + 6 udstyrsgrupper |
| Hvad man ser først | Overskrift, ét felt, CTA, "hvorfor", hjælp/kontakt | Profilformular med titel "Sælg din motorcykel" | Otte typefliser |
| Login | Vend, e-mail + engangskode, "Husk mig" | e-mail + adgangskode; opret kræver navn, e-mail, **telefon**, kode, 2 checkbokse, mailbekræftelse | — |
| Trin i alt til udgivet annonce | ukendt (formularen er ikke i sættet) | login/opret (+ mail) → 4 trin → "Udgiv" | |
| Obligatoriske felter i hele formularen | — | **10** (type, mærke, model, årgang, km, ccm, pris, stand, postnr, beskrivelse) + 2 afkrydsninger | |

---

## 1. Blinddom — før jeg vidste hvilken der var hvilken

### Mobil (390×844)

**A vinder klart.** Skærmen siger én ting: "Sælg din bil", ét felt, én orange
knap ved y 394, og en udvej for den, der ikke har pladen ved hånden. Under
folden står tre grunde til at vælge dem og en kontaktvej med åbningstid. Det
er en landingsside, der har besluttet sig for, hvad den vil have mig til — og
den beder om noget, jeg kan give med det samme.

B's første skærm er en registreringsformular. Overskriften "Sælg din
motorcykel" er rigtig, underteksten ("så gemmer vi din annonce undervejs. Det
er gratis for private") er den eneste salgstale, og så følger Navn, E-mail,
Telefonnummer, Adgangskode, to afkrydsninger og "Fortsæt" ved y 759. Jeg har
ikke set ét felt om min motorcykel endnu, og jeg er allerede bedt om mit
telefonnummer. Hintet "Ikke SMS-bekræftet (den funktion er ikke sat op endnu)"
er ærligt — men ærligt om, at noget ikke er færdigt, på det første skærmbillede.
Det er ikke det, en privat sælger vil vide først. Ingen "hvorfor her", ingen
"hvad sker der bagefter", ingen kontaktvej.

Formularen bag muren (trin 1) er et andet produkt: fotofliser, fornuftige
felter, en stepper. Men på 390 px er trin 1 alene 4 160 px, og "Fortsæt"
ligger ved 3 163 — tre-fire skærmlængder nede — fordi historik og seks
udstyrsgrupper står på samme trin som typen. A kræver ét felt for at komme i
gang; B kræver seks og viser 25.

### Desktop (1366×850)

**A vinder, men snævrere.** A: alt over folden — overskrift, felt, knap,
sammenligning Bilbasen/Solgt.com, tre grunde. B: login-siden har en mørk
aside med fire løfter og den samme profilformular, "Fortsæt" ved 771.
Layoutet er pænere end A's (A's Vend-login er en generisk sort-hvid boks,
der skifter brand midt i flowet: "Bilbasen er en del af Vend" skal forklares
i småt). Men to af B's fire løfter i asiden holder ikke (se O1-3), og
formularen er stadig det første, man ser — ikke motorcyklen.

**Hvorfor A er mest troværdig for en privat sælger:** den beder om det
mindste først, siger hvad der sker bagefter ("så hjælper vi med resten",
"Prøv 4 uger"), og tilbyder en menneskelig kontaktvej. B's formular er mere
ærlig i detaljen (stand SKAL vælges; "Vær ærlig om stand og mangler";
SEO-assistenten digter ikke) — men man når aldrig til detaljen, før man har
givet navn, mail, telefon og kode til en side, der ikke har sagt, hvad den
gør for én.

---

## 2. Findings (prioriteret)

Severity: **P1** = falsk/udokumenteret påstand, funktion virker ikke som
lovet, AA-brud eller blokerende friktion. **P2** = mærkbar forskel til
Bilbasen med konsekvens for konvertering. **P3** = kosmetisk.

### P1

| ID | Sev. | Fil / selector | Måling (os vs Bilbasen) | Konkret fix |
|---|---|---|---|---|
| **O1-1** | **P1** | `js/opret-annonce.js:1032-1037` (DOMContentLoaded: `window.location.replace('login.html?redirect=…')`), `login.html` | **Login-mur som første møde.** Live sender `/opret-annonce.html` en udlogget bruger direkte til login. Der findes ingen offentlig "sælg"-side: intet om hvad det koster (0 kr.), hvad man skal bruge, hvordan købere når én, eller hvad der sker efter "Udgiv". Bilbasen: landingsside med ét felt og CTA ved 394 (m)/220 (d), login først ved "Sælg min bil"/"Fortsæt uden". Vi: 4 obligatoriske felter + 2 afkrydsninger + mailbekræftelse FØR første motorcykelfelt. Det er blokerende friktion for præcis den bruger, sælgerbåndet på forsiden inviterer. | Fjern redirecten ved indlæsning. Lad trin 1–2 være åbne for alle (ingen data skrives før "Udgiv"); gem kladden i `localStorage` automatisk ved hvert trinskift (ikke kun ved "Gem kladde"); kræv login ved overgangen til trin 3 (billeder kan ikke overleve en redirect som blob-URL'er — se O1-9) eller senest ved "Udgiv", med `?redirect=opret-annonce.html` som i dag, og `restoreDraft()` lægger tallene tilbage bagefter. Sæt en kort, sand indledning over stepperen: "Gratis for private · ingen kommission · kontaktoplysninger kun for indloggede · du kan redigere og afmelde når som helst" (alt sammen det, forsidens `.sell-band` allerede siger). Se "Den ene ændring". |
| **O1-2** | **P1** | `opret-annonce.html:125` `.page-title-bar p` ("det tager under 5 minutter"), `:9` + `og:description` (`meta name="description"`: "på under 5 minutter") | **Tidspåstand uden måling.** D6-F2 fjernede "Opret på under 5 minutter" fra forsiden af netop denne grund; sætningen lever videre på selve opret-siden og i dens søgebeskrivelse — altså dér, Google viser den. Formularen har 10 obligatoriske felter, 13 valgfri, 6 udstyrsgrupper, billedupload og et gennemse-trin; der er ingen måling af, hvad det tager. | Skriv det, der er sandt og efterprøveligt: "Fire trin: type og specifikationer, pris og beskrivelse, billeder, gennemse. Du kan gemme en kladde undervejs." Meta-description: "Opret en annonce for din motorcykel på Bikerbasen — gratis for private. Fire trin, kladde undervejs, kontaktoplysninger kun for indloggede." Tilføj en måling i `js/maaling.js` (tid fra trin 1 til "Udgiv") — så kan tallet komme tilbage, når det findes. |
| **O1-3** | **P1** | `login.html:143-148` `#auth-hero-benefits` (li 2-3) (li 2 "Få besked når nye annoncer matcher din søgning", li 3 "Skriv direkte til sælgere"); `login.html:154` `#auth-subtitle`-standardtekst ("sende beskeder") | **To løfter på flowets første skærm holder ikke.** (a) Mail ved nye annoncer: D7-S1 fastslog, at udløseren kun sidder på `listings` (0 egne) og at søgeagenten ikke må love mail — den lover det stadig her, på desktop-asiden, synlig for enhver udlogget sælger på `bikerbasen-opret-udlogget-d.png` y 416. (b) "Skriv direkte til sælgere": der er ingen beskedtabel; kontaktformularen registrerer kun en hændelse og siger selv "Vi videresender ikke selve teksten endnu" (`js/annonce.js:1400`). Bilbasen lover "Gem favoritter, få besked … eller sælg din bil" — og har funktionerne. | Punkt 2 → "Gem en søgning og se, hvor mange nye annoncer der er kommet" (det, D7-S1 satte på søgesiden). Punkt 3 → "Se sælgerens navn og kontakt sælgeren fra annoncen" — eller udelad punktet, til beskeder kan leveres. `#auth-subtitle`-standardteksten: "Log ind for at gemme annoncer, gemme søgninger og oprette dine egne annoncer." |
| **O1-4** | **P1** | `opret-annonce.html:320-327` (`#doc-upload-zone`, "Upload servicehæfte, fakturaer eller synsrapport — giver købere mere tillid til annoncen"); `js/opret-annonce.js:364-390` (`handleDocFiles`, `uploadedDocs`), `:828-950` (`publishListing`) | **Dokumentupload gør ingenting.** `uploadedDocs` lægges i et gitter og bliver der. `publishListing()` uploader kun `uploadedPhotos`; `kolonner` har intet dokumentfelt; `hasDocumentation` fra `collectFormData()` sendes ikke til databasen, og `listings` har ingen kolonne til det (`supabase/schema.sql:42-65`). Sælgeren vælger sit servicehæfte, får det vist, trykker "Udgiv" — og det forsvinder uden ét ord. Det er en funktion, der lover tillid og leverer et hul. | Fjern hele `#doc-upload-zone`-blokken og `handleDocFiles`/`renderDocGrid`/`uploadedDocs`, indtil der findes en bucket + tabel + visning på annoncesiden for dokumenter. Erstat med én sætning under beskrivelsen: "Har du servicehæfte eller synsrapport, så skriv det i beskrivelsen — købere spørger efter det." (`manglerListe()` minder allerede om service og syn.) Fjern `hasDocumentation` fra `collectFormData()`, så demolageret ikke får et felt, ingen kan se. |
| **O1-5** | **P1** | `login.html:223-225` (`#reg-phone` `required`, hint "bruges til at kontakte dig om dine annoncer"); `vilkaar.html` §2 ("gyldig e-mail og telefonnummer"); `js/backend-bridge.js:256` (`phone: null` på alle annoncer fra databasen); `js/annonce.js:236` (telefonknappen bygges kun når `telefon` findes) | **Telefonnummer er obligatorisk — og bruges ikke til noget.** `public_profiles` udstiller ikke `phone` (schema.sql:128, 016), så `listing.seller.phone` er `null` for enhver rigtig annonce: køberen får aldrig nummeret, "Vis telefonnummer" tegnes ikke, og ingen support ringer. Kravet blokerer registreringen (4. felt på første skærm, y 517 m) og indsamler en personoplysning uden et formål, den opfylder. Bilbasen beder om e-mail alene. Bemærk også forsidens `.sell-band`: "din kontaktinfo vises kun for indloggede" — den vises for ingen. | Kortsigtet (klient): gør `#reg-phone` valgfrit, fjern `required` og `if (!phone)` i `js/login.js:348`, og skriv hintet som det er: "Valgfrit. Vises ikke for købere endnu." Ret `vilkaar.html` §2 til "gyldig e-mail (telefonnummer valgfrit)". Langsigtet (migration, kræver deploy): en `security definer`-RPC `saelger_telefon(listing_id)` kun for `authenticated`, der returnerer nummeret og tæller en `contact`-hændelse — så bliver "Vis telefonnummer" på annoncen sand, og forsidens løfte også. |
| **O1-6** | **P1** | `js/opret-annonce.js:947-949` (efter "Udgiv": toast "Din annonce er udgivet!" + redirect til `annonce.html?id=…` efter 1 s); trin 4 `#preview-note` ("Sådan vil din annonce se ud i søgeresultater") | **Flowet siger aldrig, hvordan en køber når sælgeren — og i dag kan køberen ikke.** Hele vejen fra login til "Udgiv" står der intet om kontakt. Efter udgivelse lander sælgeren på sin annonce med et 1-sekunds toast og en "Din annonce"-etiket. Kombineret med O1-5 og den manglende beskedlevering (`work/DECISIONS.md`: "Kontaktformularen kvitterer med det, vi kan bakke op") er resultatet: en privat sælger udgiver en annonce, som købere kun kan "markere interesse" på; sælgeren ser et tal i "Henvendelser" (`js/dashboard.js:537`) uden navn, mail eller besked. Det er ikke et flow, der "sælger din motorcykel" — og sælgeren får det ikke at vide, før en køber skriver, at han ikke kunne komme igennem. Bilbasen: "Du modtager flere konkrete bud fra både private og forhandlere." | I trin 4, over afkrydsningerne, én kasse "Sådan når købere dig" med den SANDE tilstand, hentet fra samme kilde som annoncesiden (fx `KONTAKTVEJ` i `js/data.js`): i dag "Købere kan registrere interesse på din annonce; vi videresender ikke beskeder endnu, og dit telefonnummer vises ikke." Så ved sælgeren det, før hun trykker. Efter "Udgiv": en kvitteringsside/-boks på `annonce.html?id=…&ny=1` med "Annoncen er udgivet · Del-link · Rediger · Sådan når købere dig" i stedet for et toast, der forsvinder. Den rigtige rettelse er telefon-RPC'en i O1-5 (eller beskedlevering) — og teksten skal skifte automatisk, når den findes. |

### P2

| ID | Sev. | Fil / selector | Måling (os vs Bilbasen) | Konkret fix |
|---|---|---|---|---|
| **O1-7** | **P2** | `opret-annonce.html:317` `#photo-hint` ("annoncer med billeder bliver set markant oftere"); `js/opret-annonce.js:489-490`, `:639-640` (`manglerListe`: "bliver næsten aldrig klikket på", "mindst 5 billeder får typisk flere henvendelser"), `:644` ("mange købere lægger vægt på") | **Adfærdspåstande uden egne data.** Der er 0 egne annoncer i drift og ingen måling af klik pr. billedantal. Samme slægt som D6-F2 (P1 dér), her P2 fordi de står inde i formularen og ikke lover rækkevidde — men de er stadig gæt skrevet som fakta, på en side der beder sælgeren om at være ærlig. | Skriv det, koden gør, og som sælgeren kan efterprøve: "Uden foto står dit kort med 'Ingen fotos i denne annonce' i søgningen." / "Du har 2 billeder — der er plads til 12." / "Effekt (hk) mangler — så kan vi ikke vise kørekortkategorien." Behold kun udsagn om OS. |
| **O1-8** | **P2** | `opret-annonce.html:346-349` `#f-captcha` ("Jeg er ikke en robot"); `login.html:248` `#reg-captcha`; `js/opret-annonce.js:117-123`, `:829` | **"Jeg er ikke en robot" er en almindelig checkbox.** Ingen udfordring, intet token, intet serverkald — den stopper ingen robot og koster hver sælger ét ekstra klik og én ekstra fejlbesked ("Bekræft, at du ikke er en robot"). Den ser ud som en kontrol (reCAPTCHA-ordlyd) og er det ikke; det er den samme fejl som et badge uden verificering. Bilbasen: ingen synlig robotkontrol i flowet; login via engangskode. | Fjern checkboxen begge steder og valideringen i `validateStep(4)`/`publishListing()`; `#f-terms` er den reelle bekræftelse. Den dag Turnstile/Cloudflare er sat op (A3 i BACKLOG), kommer en RIGTIG kontrol ind samme sted — usynlig, uden checkbox. |
| **O1-9** | **P2** | `js/opret-annonce.js:1066-1069` (`#save-draft`: manuel), `Store.saveDraft('form', collectFormData())` (kun felter, ingen billeder); `js/login.js:22` ("så gemmer vi din annonce undervejs") | **Kladden er manuel, lokal og uden billeder — løftet siger noget andet.** "Gem kladde" skriver kun formularfelterne til `localStorage`, når man selv trykker; trinskift, "Udgiv"-fejl og sidelukning gemmer intet; billeder er blob-URL'er og er væk ved genindlæsning uden besked. Login-teksten lover "vi gemmer din annonce undervejs" — det lyder som konto-synk. | Autosave: kald `Store.saveDraft('form', collectFormData())` i `goToStep()` og debounced på `input` i `#listing-form`; vis "Kladde gemt på denne enhed kl. 14:02" ved "Gem kladde"-knappen i stedet for et toast; ved `restoreDraft()` sig "Din kladde fra i går er hentet frem — billeder skal vælges igen". Ret login-teksten til "Du kan gemme en kladde undervejs på denne enhed." |
| **O1-10** | **P2** | `opret-annonce.html:133-246` (trin 1: `#type-radio-group` 8 fliser + 12 felter + Historik 6 + Udstyr 6 `<details>`), `.form-actions` ved y 3 163 (m) | **Trin 1 er tre formularer på ét trin.** 4 160 px på mobil før første "Fortsæt"; obligatoriske felter (mærke, model, årgang, km, ccm) ligger ved ≈1 030–1 330, og derefter 1 800 px valgfri felter, man skal rulle forbi for at komme videre. Bilbasen starter med ét felt. Stepperen lover fire trin, men trin 1 bærer halvdelen af alt. | Del trin 1: "Motorcyklen" (type + de 5 obligatoriske + effekt) og "Historik & udstyr" (resten, tydeligt mærket valgfrit — "Spring over" som sekundær knap). Fem trin i stepperen er billigere end 4 160 px på ét. Alternativ uden nyt trin: læg Historik og Udstyr i én sammenklappet `<details open=false>` "Flere oplysninger (valgfrit)" under de obligatoriske felter — så står "Fortsæt" ved ≈1 500 i stedet for 3 163. |
| **O1-11** | **P2** | `js/opret-annonce.js:38-41` (`erBilledfil` accepterer HEIC), `:327-346` (`handleFiles` viser blob i `<img>` uden at prøve at afkode), `js/supabase-api.js:491-500` (fejlen opdages først i `uploadListingPhoto`) | **HEIC fejler for sent.** På Android/Windows (Chrome, Firefox) kan `createImageBitmap` ikke afkode HEIC. Filen tages imod i trin 3, miniaturen er et knækket billede-ikon uden besked, og fejlen kommer først EFTER "Udgiv", efter at annoncen er oprettet: "Annoncen er gemt, men 3 af 3 billeder kunne ikke uploades … HEIC-billeder fra iPhone virker ikke i alle browsere" — og man sendes videre til en annonce uden foto. Annoncen er altså udgivet og fotoløs, før sælgeren ved, at noget var galt. | Afkod ved valg: i `handleFiles()` kør `createImageBitmap(file).then(b=>b.close()).catch(...)` pr. fil; den, der fejler, vises IKKE i gitteret men nævnes i toasten med den eksisterende HEIC-sætning. Så sker fejlen på trin 3, hvor den kan rettes, ikke efter udgivelse. |
| **O1-12** | **P2** | `js/opret-annonce.js:57-66` (`goToStep`: kun `scrollTo`), `:129-135` (`validateStep`: toast + `aria-invalid`, ingen feltnær fejltekst undtagen `#postnr`) | **Fokus og fejl er ikke bundet til felterne.** Ved trinskift flyttes fokus ikke til trinnets `<h2>` — en skærmlæser står stadig på "Fortsæt" uden at få at vide, at siden skiftede. Fejl annonceres som toast ("Udfyld venligst alle felter markeret med *") og feltet får `aria-invalid`, men ingen `aria-describedby` peger på en tekst, der siger hvad der er galt ved netop dette felt; kun postnummer har `.field-error`. Toasten forsvinder. | I `goToStep()`: sæt `tabindex="-1"` på trinnets `<h2>` og `focus()` den efter `scrollTo`. I `markFieldError()`: indsæt/vis en `.field-error` under feltet med den konkrete tekst (genbrug `bound()`s besked) og sæt `aria-describedby` på inputtet; fjern den i `input`-lytteren. Toasten bliver som opsummering. |

### P3

| ID | Sev. | Fil / selector | Måling | Konkret fix |
|---|---|---|---|---|
| **O1-13** | **P3** | `css/styles.css:2195-2196` `.checkbox-inline input` (16×16), `.checkbox-row input` (18×18) | Afkrydsningsfelterne i trin 4 og på registreringen er 16 px; selve labelen er klikbar, så målet er OK, men den visuelle kasse er lille til en tommelfinger, og vilkårsteksten er 13 px muted. | `width:20px;height:20px`, `font-size:14px; color:var(--color-fg)` på `.checkbox-inline` i trin 4 — det er en bekræftelse, ikke en fodnote. |
| **O1-14** | **P3** | `opret-annonce.html:128` `#stepper` på mobil (`css/styles.css:2075-2086`: inaktive trin uden tekst) | På 390 px viser stepperen "1 Type & specs — 2 — 3 — 4". Man ved ikke, hvad 2–4 er, før man er der; Bilbasen har ingen stepper at måle mod, men den siger "så hjælper vi med resten". | `aria-label="Trin 2: Pris & beskrivelse"` på `.step-item` findes ikke i dag — tilføj det, og vis trinnets navn som `title`. Eller en linje under stepperen: "Næste: Pris & beskrivelse". |
| **O1-15** | **P3** | `opret-annonce.html:9-24` (`<title>`, `canonical` → `/opret-annonce`, ingen `noindex`); live: JS-redirect til `login.html` | Opret-siden er indekserbar med title "Opret annonce — Bikerbasen" og en beskrivelse, der lover "under 5 minutter" (O1-2), men en Google-bruger, der klikker, lander på login. `login.html` har samme header-navigation og ingen `noindex`. | Når O1-1 er lavet, er siden reel og må indekseres. Indtil da: `noindex` på `login.html` og lad `opret-annonce.html`s description beskrive det, der faktisk vises. Title → "Sælg din motorcykel — gratis annonce for private — Bikerbasen" (sandt og søgbart). |

---

## 3. Hvad der IKKE skal kopieres fra Bilbasen

| Bilbasen gør | Hvorfor ikke os |
|---|---|
| Nummerplade → "så hjælper vi med resten" | Kræver DMR-integration. Vi har den ikke, og et felt, der ikke slår op, er værre end intet felt. Vores ækvivalent er typefliserne + `<datalist>` på model — de er allerede der. |
| Solgt.com-partner / "garantipris indenfor 24 timer" | Ingen partner, ingen opkøber. Ville være en påstand. |
| "Danmarks største bilmarked", "Stor efterspørgsel", "Du modtager flere konkrete bud" | Størrelses- og adfærdspåstande uden måling; D6-F2 har allerede fjernet vores egen udgave. Det eneste tal, vi kan skrive, er "541 annoncer i søgningen, side om side med din". |
| Telefonsupport "Mandag–fredag kl. 08–16" | Ingen support-linje findes. En kontaktvej, der findes (mail/`om-indeksering`), er bedre end en åbningstid, der ikke er det. |
| Login hos tredjepart (Vend) | Ikke relevant — men A's engangskode pr. mail (ingen adgangskode) er friktionsmæssigt bedre end vores navn+mail+telefon+kode. Det er en form, ikke en påstand, og MÅ gerne tages: Supabase har magic link. |

---

## 4. Den ene ændring, der flytter dommen mest

**Fjern login-muren som første møde (O1-1), og lad `/opret-annonce.html` være
landingssiden.** Trin 1 og 2 åbne for alle, kladde gemt automatisk ved hvert
trinskift, login først når der skal billeder på eller trykkes "Udgiv" — med den
sande indledning over stepperen ("Gratis for private · ingen kommission ·
kontaktoplysninger kun for indloggede") og O1-10's deling af trin 1, så
"Fortsæt" står ved ≈1 500 px i stedet for 3 163.

Det flytter dommen, fordi det er hele forskellen på A og B: A beder om det
mindste først og viser varen (formularen) før regningen (kontoen). Vores
formular er på flere punkter mere ærlig end noget, A viser — obligatorisk
stand, "vær ærlig om mangler", SEO-assistent der ikke digter, forhåndsvisning
af kortet — men ingen ser den, før de har givet navn, mail, telefon og kode
til en side, der ikke har sagt, hvad den gør for dem. O1-2, O1-3, O1-4 og O1-5
er P1 og skal rettes uanset; de flytter, om vi må kalde os ærlige. O1-6 er
den, der afgør, om en privat sælger nogensinde kommer tilbage — og den kræver,
at et menneske beslutter telefon-RPC'en eller beskedlevering.
