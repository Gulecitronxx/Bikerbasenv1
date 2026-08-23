# Runde 5 — søgesiden (SRP) blindt mod Bilbasen (AUDIT ONLY)

Ingen kodeændringer. Ingen produktionsfil er rørt. Denne fil er det eneste,
runden har skrevet.

Rækkerne i findingstabellen er klar til at flettes ind i `BACKLOG.md`.

---

## Sådan er der målt (læs den her først, tallene afhænger af den)

**Kilden er fire skærmbilleder i `work/runde5/`**, ikke en levende browser:
`bilbasen-srp-m.png` / `bikerbasen-srp-m.png` (390×844) og `-d.png` (1366×850),
plus `-full.png` for hele siden (Bikerbasen mobil 14.214 px høj, Bilbasen
17.647; Bilbasen desktop-fuldside er 1463 px bred, fordi deres takeover-annonce
sprænger vinduet). Pixeltallene er læst ud af PNG'erne med en kolonnescanning
(farveskift i x=195 og mørke tekstrækker i x 20–200) og er derfor præcise på
±2 px for kanter og ±4 px for tekst; hvor jeg har skønnet i stedet, står der ≈.

**Bilbasens skærmbillede er med cookievæggen klikket væk og to aktive filtre
(badgen "2", pillen "Personbil").** Vores er standardsøgningen, ingen filtre,
side 1 af 23, lageret 548 (332 MC Syd + 118 Gul og Gratis + 2 kilder). Det er
den tilstand, en køber lander i fra forsiden — altså den rigtige at måle.

**Blindt betyder:** jeg har vurderet de to sider som to fremmede SRP'er, før jeg
åbnede `soegning.html`, `js/search.js`, `js/components.js` og `css/styles.css`.
Kildehenvisningerne i tabellen er slået op bagefter, så rettelserne kan
udføres uden at spørge.

**Rammerne er læst først:** CLAUDE.md's seks regler (aggregator, ét thumbnail,
hotlink, ingen kontaktoplysninger), DECISIONS.md's låste valg og alle
afvisninger (silhuet, billedproxy, `.fav-btn` på eksterne kort, ItemList på
noindex-sider, B4's RPC), samt at "Blandet udbud" og dens ene linje er
målte valg. Intet herunder foreslår noget af det. Kørekort (A1/A2/A) bliver på
kortet — det er vores ene strukturelle fordel — men dens *vægt* mod prisen er
til diskussion, og det er den, jeg diskuterer.

---

## 1. Blind dom

**Mobil (390): Bilbasen vinder, og det er ikke tæt.** Deres første kort står
284 px nede efter fire værktøjsrækker; vores står 394 px nede efter otte
(brødkrumme, h1, søgefelt, antal, kildelinje på to linjer, sortering, ikonrække,
sorteringsnote). Den ene største grund er ikke kortet — prisen står faktisk
ca. samme sted (673 mod 684) og er større hos os (≈21 mod ≈18 px) — det er de
110 px administration oven på listen, og at vores kort starter med en grå
disclaimerstribe ("Annonce fra MC Syd") i stedet for med varen. Dertil kommer,
at side 1 ligner ét forhandlerkatalog: 24 af 24 kort bærer identisk "Annonce
fra MC Syd", identisk orange "Kørekort A", identisk "Rødding, Syddanmark" og
identisk "Forhandler · mcsyd.dk" — fire ens linjer pr. kort, og den eneste
fyldte accentfarve på skærmen er den chip, der siger det samme 24 gange.

**Desktop (1366): uafgjort, med et lille forspring til Bikerbasen på
økonomi og til Bilbasen på kortet.** Vores første kort står ved ≈397 px mod
deres ≈527 (de bærer en 180 px takeover-annonce og et svævende søgekort); vores
pris ved ≈670 mod deres ≈876. Men vores sidebar bruger sine første ≈190 px på
to afsnit forklaringstekst i 12 px, så det første *filter* ud over Kørekort
(Type) først står ved ≈672 — under folden på en 850-skærm — mens Bilbasen
slet ikke har en sidebar og lader tre kort få hele bredden. Den ene største
grund til, at deres kort alligevel *ser* bedre ud, er rytmen: foto → navn →
pris → fire grå fakta-chips → sted, og intet på kortet er fyldt med farve,
så prisen er det tungeste element uden at råbe.

## 2. Pixelfakta ved 390 px

| | Bilbasen | Bikerbasen | Δ |
|---|---|---|---|
| Header (bund) | 72 | 68 | — |
| Rækker mellem header og første kort | **4** (søg+klokke+Filtre · "Viser: 40.438" · "Sortér: Standard" + visning · Køb/Leasing-faner) | **8** (brødkrumme · h1 · søgefelt · "548 annoncer fundet" · kildelinje **på 2 linjer** · "Sortér:" + select · klokke+visning+Filtre · sorteringsnote) | +4 rækker |
| Første kort begynder (y) | **284** | **394** | **+110 px** |
| Højde header→kort | 212 | 326 | +114 px |
| Foto begynder / slutter | 332 / 599 (4:3, 267 px, med 48 px forhandlerlogo over) | 428 / 652 (16:10, 222 px, med 34 px kildestribe over) | — |
| Første pris synlig (y, versalhøjde) | 684–696 (≈18 px fed) | **673–687 (≈21 px fed)** | −11 px, vores er større |
| Korthøjde (kant til kant) | ≈507 (284→791) | ≈481 (394→875) | −26 px |
| Kortafstand (top til næste top) | ≈525 | ≈498 | −27 px |
| Kort 1 slutter / kort 2 begynder i viewporten | 791 / 809 — **logo på kort 2 er synligt** | 875 / 892 — **under folden (844)** | — |
| Kortet viser | forhandlerlogo · foto (galleri-prikker, video-ikon, hjerte) · titel 2 linjer · **pris** · 4 grå chips (mdr/år · km · rækkevidde · brændstof) · sted | grå kildestribe · foto (sammenlign-ikon) · **pris** + BYTTER GERNE · titel 2 linjer · tekstlinje "2025 · 5.500 km · 1.000 ccm" · **orange "Kørekort A"** · sted + "Forhandler · mcsyd.dk" | — |
| Fyldte accentflader over folden | 1 (Filtre-knappen) | 1 (Kørekort-chippen) — og den gentages på hvert kort | — |

Desktop (1366×850), til reference: første kort 527 (Bilbasen) mod ≈397
(Bikerbasen); første pris ≈876 mod ≈670; sidebar 0 mod 280 px; tre spalter
begge steder.

## 3. Findings

| ID | rolle | akse | severity | fil | problem | forslag | status |
|---|---|---|---|---|---|---|---|
| D5-S1 | designer | design | P2 | `soegning.html:549-630` (`.results-toolbar`, `#srp-search`), `css/styles.css:2815-2845` (mobilgitteret), `:1203-1213` | **Otte rækker oven på listen ved 390 px, Bilbasen har fire.** Målt: header 68 → første kort 394 = 326 px; Bilbasen 72 → 284 = 212 px. Regnskab: brødkrumme 13 px + h1 18 px (81–116), søgefelt 48 (131–177), antal 12 (196–207), **kildelinje 2 linjer** (220–243 — kommentaren i `soegning.html:156-158` siger "passer på én linje med fire pixels til overs"; det gjaldt med ÉN kilde, nu er der to navngivne + "+2 kilder", og den bryder præcis som kommentaren advarede: +19 px), sortering 40 (257–295), ikonrække 44 (306–346), note 12 (366–377) + seks mellemrum. Bilbasen (bilbasen-srp-m.png): søg+klokke+Filtre i ÉN række (72–119), "Viser: 40.438 biler" (162–177), "Sortér: Standard ⌄" som tekstlink + visningsikoner på ÉN række (188–205), faner (242–254). | Tre indgreb, alle i mobilreglen `@media (max-width:620px)`: (1) **Søgerækken bliver værktøjsrækken.** `soegning.html`: flyt `#save-search-btn` og `#open-filters-btn` op i `#srp-search`-containeren (wrap `#srp-search` + de to knapper i `<div class="srp-bar">`); `css/styles.css` `.srp-bar{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center}` `.srp-bar .srp-search{margin:0}`; `#open-filters-btn` får `.btn-primary` (Bilbasen: den eneste fyldte knap over folden er Filtre — hos os er den en grå kontur, mens 24 kørekortchips er orange, se D5-S3). (2) **Kildelinjen ud af flowet.** `js/search.js renderResultsCount()`: på ≤620 px skrives `#results-mix` ikke som løbende tekst; `#results-count` bliver `548 annoncer fra 4 kilder` + det (i), der allerede åbner `forklarIndekseret()` — tallet `kilder.size` findes i `resultatSammensaetning()` (`js/search.js:852`), og fordelingen pr. kilde står i popover'en og på desktop. Påstanden "fra 4 kilder" er sand og kan tælles efter. `.results-headline{min-height:49px}` i `<style id="soeg-perf">` sættes til 24 px på mobil, ellers står luften der stadig. (3) **Sortér og antal på samme række.** `.results-toolbar{grid-template-columns:1fr auto}`: `.results-headline` i 1/1, `.sort-felt` i 1/2, `.view-toggle` i 2/2 med `justify-self:end`, klokken er flyttet til (1). Pladsen: "548 annoncer fra 4 kilder" ≈ 150 px + "Sortér:" 45 + select. Selecten bryder ikke, hvis option-teksterne kortes (`soegning.html:599-604`): "Pris: lav → høj", "Pris: høj → lav", "Årgang: nyeste", "Km: laveste" — den lange "Kilometertal: Lavest først" var grunden til, at runde 2 gav sorteringen sin egen række. Forventet: 326 → ≈230 px (−2 rækker, −19 px kildelinje, −8 px luft), første kort ≈300, **andet korts top over folden**. Brødkrumme og h1 bliver. | åben |
| D5-S2 | designer | design | P2 | `js/components.js:772-846 externalCardHTML()`, `css/styles.css:885-893 .card-kilde`, `:1093-1109 .card-footer` | **Afsenderen står tre gange pr. kort, og den første gang er en grå stribe på 34 px, der skubber varen ned.** Målt 390: kort 394, stribe 394–428, foto 428. Stribe + `.card-kildelinje` "Forhandler · mcsyd.dk" i bunden + kildelinjen over hele listen = samme domæne tre steder på ét kort. Bilbasen åbner kortet med forhandlerens *logo* (48 px, bilbasen-srp-m.png y 284–332): et brand-aktiv, forskelligt fra kort til kort, som køberen genkender. Vores stribe er en disclaimer i 12 px med samme tekst på 24 af 24 kort. Kommentaren i `styles.css:879-884` begrunder striben med kontrast (2,64:1 som pille på fotoet) og med "afsenderen er det første, man skal vide" — den første grund holder, den anden er et valg, ikke en måling, og den koster 34 px × 24 kort = 816 px pr. side. | Fjern `.card-kilde` fra `externalCardHTML()` og lad kilden bo ÉT sted på kortet: `.card-kildelinje` i footeren, med det eksterne-link-ikon striben havde: `${Icon.externalLink}<span>Forhandler · mcsyd.dk</span>` (ikonet siger "handlen sker hos kilden", domænet er det, køberen kan slå op — begge argumenter fra kommentaren overlever). Kontrasten er den samme som striben (kendt baggrund, `--color-fg-muted` på `--color-surface`). `title`-teksten ("Annoncen ligger hos MC Syd …") flyttes med til `.card-kildelinje`. Kortets dæmpede kant (`.card-external`, :874) bærer stadig forskellen til egne kort. Effekt: foto 34 px højere, pris fra 673 til ≈639 ved 390, kort 481 → 447 px; 24 kort = 816 px kortere side. Behold `.card-kilde`-reglen i CSS for annonce.html's `.badge-external`-slægtning, den rører ingen. **Tjek:** `.card-media`-fejlfeltet ("Fotoet kunne ikke hentes hos kilden", B3) nævner kilden i sin egen tekst, så kilden forsvinder ikke fra et billedløst kort. | åben |
| D5-S3 | designer | design | P2 | `css/styles.css:1061-1077 .card-external .card-koerekort`, `:1145-1152 .card-price`, `js/components.js:611-655 koerekortMaerkat()` | **Den ene fyldte accentfarve på siden siger det samme 24 gange, og det er ikke prisen.** Filterpanelet selv oplyser fordelingen: A1 13, A2 47, A 548 af 548 — "Kørekort A" udelukker ingen og står derfor på hvert eneste kort på side 1 (målt: 24/24 i bikerbasen-srp-m-full.png) som en 28 px orange knap på 14 px/700, mens prisen er 21 px/700 i brødfarve. Øjet går til orange; orange siger "A" hele vejen ned. Bilbasen (bilbasen-srp-m.png y 718–727) har nul fyldt farve på kortet: pris i fed sort, fakta i grå chips, og derfor ER prisen det tungeste. Chippen SKAL blive (aftalen), og den må aldrig forsvinde på et kort (`:1056-1060`), men dens vægt er ikke låst nogen steder i DECISIONS.md. | Gør vægten proportional med informationen: (1) `.card-external .card-koerekort` bliver en kontur-chip i spec-rækken (se D5-S4): `background:transparent;color:var(--color-fg);border:1.5px solid var(--color-border);font-size:12.5px;line-height:18px;padding:2px 8px` — stadig fed, stadig "Kørekort A", stadig altid synlig. (2) De kategorier, der faktisk UDELUKKER noget, får fyldet: tilføj `kk-${kode.toLowerCase()}` som klasse i `externalCardHTML()` (koden findes i `kk.kode`) og `.card-koerekort.kk-a1,.card-koerekort.kk-a2{background:var(--color-primary);color:var(--color-on-primary);border-color:transparent}`. Så lyser de 13 + 47 annoncer, en 19-årig kan købe, op i en liste af 548 — det er dén fordel, Bilbasen ikke har, brugt dér hvor den betyder noget. `.kk-ukendt` forbliver dæmpet som i dag. (3) `.card-external .card-price` hæves fra 21 til 22 px og får `letter-spacing:-0.01em` — ikke mere; resten af hierarkiet kommer af, at chippen holder op med at råbe. Egne kort (`.card-koerekort` på fotoet, :807-815) røres ikke. | åben |
| D5-S4 | designer | design | P3 | `css/styles.css:985-1054 .card-specs/.card-spec`, `js/components.js:706-716 eksternSpecs()` | **Fakta står som en prosa-linje, Bilbasen står med chips.** Vores "2025 · 5.500 km · 1.000 ccm" er 13 px/600 på én 20 px-linje (y 767–776 ved 390); Bilbasens "7/2025 │ 7.000 km │ 566 km rækkevidde │ El" er fire grå chips i én række (718–737). Chips kan skannes lodret ned gennem listen (km sidder i samme kolonne på hvert kort, fordi chipbredden er stabil), en prikke-linje kan ikke. Kommentaren ved `:974-984` (D-011) afviste chips, fordi de var et 2×2-gitter på 64 px — det var gitteret, der var galt, ikke chippen. Bilbasen viser, at én række på ≈24 px kan bære fire. | `.card-specs{display:flex;gap:6px;height:24px;overflow:hidden;align-items:center}` og `.card-spec dd{font-size:12.5px;line-height:18px;padding:2px 8px;background:var(--color-surface-2);border-radius:4px}`; fjern `::after`-prikken (`:999-1001`). Kørekort-chippen (D5-S3) flyttes ind i samme `<dl>` som fjerde led — så ligger "2025 · 36.000 km · 1.520 ccm · Kørekort A" i én 24 px-række i stedet for 20 + 8 + 28 = 56 px: **−32 px pr. kort**, som mere end betaler D5-S2's og D5-S3's ændringer tilbage. Bredde, målt på det bredeste kendte tilfælde ("1997 · 36.000 km · 1.520 ccm" = 244 px som tekst): som chips ≈ 47 + 81 + 78 + 91 (Kørekort A) + 3×6 = ≈315 px; kroppen er 324 px ved 390 (356 − 2×16) — det passer, men med 9 px til overs, så `@container (max-width:320px){.card-specs{flex-wrap:wrap;height:54px}}` erstatter den nuværende 270 px-grænse (`:1026-1028`), og den mindste krop i drift (241 px ved 320/1240) bryder til to rækker, som i dag. Det manglende led ("km ikke oplyst", `.spec-tom`) bliver en chip i `--color-surface-2` med dæmpet tekst — det er et ærligt felt, ikke et tal, og det må gerne se anderledes ud. Tilføj hk som chip, når det ER oplyst (`l.power`, findes allerede i `koerekortMaerkat()`): det er MC'ens svar på "rækkevidde/El" og grunden til kørekortdommen. `.card-specs`-højden forbliver låst (D-011's pointe). | åben |
| D5-S5 | designer | design | P2 | `soegning.html:310-326` (`#filter-koerekort` + to `.field-hint`), `css/styles.css:1859 .field-hint`, `:1215-1222 .filters-panel` | **Desktop-sidebaren åbner med ≈190 px prosa.** Målt 1366 (bikerbasen-srp-d.png): "Filtre" 208, hint 1 (3 linjer) 295–345, tre chips 360–478, hint 2 (8 linjer, 12 px) 490–630, og først ved 672 kommer "Type" — det andet filter står under folden på 850. Bilbasen har ingen sidebar overhovedet og giver tre kort 960 px; deres filtre ligger bag "Alle filtre" med tælleren på. Vores sidebar er ikke forkert (280 px for en MC-søgning med 8 grupper er fint), men den bruger sin vigtigste skærmplads på at forklare, hvorfor A = 548, før den lader nogen vælge noget. Hintene er rigtige og ærlige — de står bare på det forkerte tidspunkt: en køber, der klikker A1 og ser 13, er den, der har brug for sætningen om effekt. | (1) Hint 2 ("Vejledende: filtrerer på effekt …") flyttes ind i et `<details class="field-hint-fold"><summary>Hvorfor er A hele lageret?</summary>…</details>` lige under chipsene: `summary{font-size:12px;color:var(--color-fg-muted);cursor:pointer}` — teksten er der, ét klik væk, og den står stadig i DOM'en for skærmlæser og SEO. (2) Hint 1 ("Kun ét kørekort ad gangen …") kortes til én linje "Vælg én" som `<span class="field-hint">` i `<summary>Kørekort</summary>`-rækken; radiogroup-rollen bærer resten for skærmlæseren. Forventet: Type fra 672 til ≈500, Pris-gruppen (åben fra 960 px, jf. `soegning.html:176-180`) over folden. (3) `.filters-panel{padding:12px 16px}` i stedet for `var(--space-4)` hele vejen rundt — 8 px × 8 grupper. Mobilarket (`@media (max-width:959px)`) får de samme besparelser gratis, fordi det er samme markup. | åben |
| D5-S6 | designer | design | P3 | `js/search.js:1186-1230 renderSorteringsNote()`, `soegning.html:630`, `scripts/build-srp.js` | **Sorteringsnoten står på en side, hvor der ikke er noget at efterprøve.** Side 1 ved 390: "Blandet udbud: 7 uden foto fordelt jævnt — 0 på denne side." (y 366–377 + 10 px margen = 27 px over det første kort). Sætningen er sand, men `soegning.html:612-629` begrunder selv linjen med, at fordelingen er "den eneste af de to regler, man kan efterprøve på skærmen" — og på en side med 0 fotoløse kort kan den ikke efterprøves på skærmen. Noten skal blive (den er målt og ærlig), men dens plads er der, hvor reglen kan ses. Bilbasen har til sammenligning ingen forklaring på "Standard" — det er ikke et forbillede, det er grunden til, at vi har linjen. | Behold linjen og (i)-knappen uændret; sæt `el.hidden = (udenPaaSiden === 0)` for `state.sort==='blandet'`, og sørg for, at det ikke koster CLS: `scripts/build-srp.js` kender side 1's 12 kort og deres `harFoto()`, så den kan skrive `hidden` på `<p id="sortering-note">` ved build, når side 1 ingen fotoløse har — så står noten aldrig og forsvinder efter hydrering. (i)-knappen flyttes ind i `.sort-felt` ved siden af selecten (`#sortering-info-btn` som søskende til `<select>`), så forklaringen altid er ét klik væk, også på sider, hvor linjen er skjult. På desktop koster linjen intet og kan stå altid; reglen er kun nødvendig i `@media (max-width:620px)`, men det er enklere at lade den gælde overalt — vælg det sidste. Netto på side 1: −27 px. | åben |
| D5-S7 | designer | design | P3 | `js/components.js:441 eksternStedTekst()`, `:838-841` (footer), `css/styles.css:1093-1099` | **Bundlinjen gentager sig selv 24 gange, og regionen tilføjer ingenting, når byen er kendt.** "Rødding, Syddanmark" + "Forhandler · mcsyd.dk" er identisk på 24/24 kort på side 1 (bikerbasen-srp-m-full.png). Bilbasen skriver "Hjørring, Nordjylland" — også by + region — men kun det, og intet domæne ved siden af, så linjen er 1 led, ikke 2. På vores desktop-kort (280 px) klippes højreleddet allerede: "Forhandler · …" (bikerbasen-srp-d.png y 860) — domænet, der ifølge `components.js:785-788` er "det eneste på kortet, køberen selv kan slå op", er det, der klippes først. | Når D5-S2 flytter kilden til footeren, er der ikke plads til begge led på 280 px. Prioritér: venstre `.card-sted` = by alene, når byen er kendt ("Rødding"; regionen står i `title` og på annoncesiden), region alene når byen mangler; højre `.card-kildelinje` = "Forhandler · mcsyd.dk" med `flex:1 1 auto;min-width:0` og `.card-sted{flex:0 1 auto;max-width:45%}`, så domænet vinder pladskampen i stedet for at tabe den. Det er ikke en ny oplysning, det er en anden ombrydning. Én gevinst mere: når side 1 ikke længere er 24 × "Rødding, Syddanmark", ser den mindre ud som ét katalog. | åben |

**Uden for tabellen, fordi det ikke er et kort-problem:** side 1's monotoni (24/24 MC Syd)
kommer fra rækkefølgen i `Sortering.blandetRaekkefoelge`, og den er målt og
låst. Jeg foreslår IKKE at røre den her. Men den dag den alligevel åbnes, er
det værd at måle, om en kilde-rundgang *inden for* fotogruppen (MC Syd, Gul og
Gratis, MC Syd, …) giver en side 1 med tre afsendere som Bilbasens, uden at
ændre fordelingen af fotoløse. Det kræver menneskets ja, og det kræver en test.

## 4. Kopiér IKKE fra Bilbasen

1. **Takeover-annoncen og "Se mere"-kasserne** (bilbasen-srp-d.png: Polestar
   på begge sider, 1463 px bredt fuldsidebillede). Den koster dem 130 px over
   det første kort på desktop og er grunden til, at vi slår dem på
   tid-til-første-kort. Vi har ingen annoncører, og vi har heller ikke brug for
   at *ligne* nogen, der har.
2. **Køb/Leasing-fanerne.** 42 px på mobil (y 242–254 + luft) for en
   opdeling, der ikke findes i MC-lageret: ingen af vores kilder sælger leasing
   af brugte motorcykler, og en tom fane er en løgn. Vores to dimensioner er
   kilde (egne/indekserede) og kørekort — de står allerede i filtrene.
3. **Forhandlerlogoet på kortet.** 48 px pr. kort. Vi har ikke logoerne
   (regel 2: vi gemmer ét thumbnail, intet andet), og at hente dem ville være
   at kopiere kildens aktiver. Kildens NAVN i tekst er det ærlige ækvivalent
   (D5-S2 siger hvor).
4. **Galleri-prikkerne, video-ikonet og hjertet på fotoet.** Prikkerne lover
   fem billeder — vi har ét (regel 2, låst "Kilden ejer sine billeder");
   video har vi ikke; hjertet på eksterne kort er afvist med fremmednøglen som
   bevis (D-008) og kommer først, når `favorites` kan pege på
   `eksterne_annoncer`. Et hjerte, der ikke gemmer, er værre end intet hjerte.
5. **"Viser: 40.438 biler til salg" som eneste overskrift.** Deres side har
   ingen h1 og ingen brødkrumme; det har råd til det, når man er Bilbasen. Vores
   h1 "Brugte motorcykler til salg" er SEO og orientering på én gang og koster
   18 px. Den bliver — men dens margener er allerede strammet, og der er ikke
   mere at hente dér end i D5-S1.
6. **Grå chips for "rækkevidde" og "El".** Formen ja (D5-S4), felterne nej —
   en MC's svar på de to er ccm og hk, og hk må kun stå, når kilden oplyser den.
   "Ikke oplyst" som chip er fint; et gættet tal er ikke.

## 5. Den ene ændring

**Fjern kildestriben fra kortet og sæt kilden i bundlinjen (D5-S2), og lad
kørekortchippen gå fra fyldt orange til kontur i spec-rækken, med fyld kun på
A1/A2 (D5-S3 + D5-S4).** Tilsammen: foto 34 px højere, pris ≈34 px højere
(673 → ≈639), kort ≈66 px lavere (481 → ≈415), prisen bliver det tungeste
element på kortet — og side 1 holder op med at være 24 ens grå striber over 24
ens orange knapper. Det er den ændring, en blind dommer ville se først, fordi
det er den, der ændrer kortets rytme fra *disclaimer → foto → pris → chip* til
*foto → pris → navn → fakta* — Bilbasens rytme, uden at kopiere ét element af
deres.
