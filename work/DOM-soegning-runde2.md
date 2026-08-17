# KRITIKER — søgeresultat + filtre (runde 2, frisk kritiker)

Målt 17.08.2026. Playwright, forrest fane på topniveau, ikke i ramme.
`innerWidth` verificeret indefra: 1440 og 390. 24 kort til stede ved hver måling
(ingen timerklemning). Dev-server startet fra `.claude/launch.json` (port 55945
var død; autoPort gav 55559). Udlogget, cookievæg klikket væk med
"Kun nødvendige". Branding beskåret på begge sider før dom, rækkefølgen blandet
(desktop: bar først; mobil: vores først).

**Forbehold:** arbejdstræet har ucommittede ændringer i `js/data.js` og
`js/backend-bridge.js`. Jeg har ikke læst dem. Alt nedenfor er hvad siden viste.

---

## Køberopgaven: A2 til under 60.000 kr.

2 handlinger: klik chippen **A2 (mellem mc)** i venstre skinne → skriv `60000` i
**Maks.** under Pris. Ingen modal, ingen "anvend"-knap, filtrene ligger i URL'en
(`?priceMax=60000&koerekort=A2`). Baren kræver "Alle filtre" → felter → "Vis
40.474 biler" = mindst 4. **Under tre klik: ja.**

Tilbage fra en annonce: klikkede kort 14 i den filtrerede liste (`annonce.html?id=1010`),
gik tilbage. Rullehøjde `y=2585` før → `y=2585` efter, samme 24 kort, samme
"39 annoncer fundet", filteret stadig sat. **Samme sted i listen: ja, præcist.**
Samme resultat ufiltreret (`y=3054` → `y=3054`). Det er bedre end de fleste.

---

## 1. SORTERINGEN

Standardvalget hedder **"Blandet udbud"**. Under vælgeren står:
> "Blandet udbud: annoncerne med flest oplyste felter står først, og de 57 uden
> foto er fordelt jævnt i stedet for at ligge samlet — 4 af de 24 på denne side,
> samme andel som i hele resultatet."

Halvdelen af påstanden holder, halvdelen kan ikke passe:

* **Jævn fordeling: sand.** De fotoløse kort ligger på plads 4, 11, 17, 24 —
  huller på 7, 6, 7. 4/24 = 16,7 % mod 57/383 = 14,9 %. Verificerbart og korrekt.
* **"Flest oplyste felter står først": tom.** Alle 20 MC Syd-kort har præcis det
  samme feltsæt, så rangeringen er usynlig. Rækkefølgen er hverken pris
  (124.800 → 99.800 → 34.800), årgang, km eller alfabet. Og kort nr. 4 er
  fotoløst og mangler hk — det kan ikke samtidig være "flest oplyste felter
  først". De to regler modsiger hinanden i samme sætning.
* **Navnet lyver om det, der faktisk sker.** "Blandet udbud" leverer en lynlås:
  plads 1,3,5,7… = MC Syd med foto; plads 2,4,6,8… i den filtrerede liste = vores
  egne, alle uden foto. Perfekt vekslen over 24 kort. Det er ikke "blandet", det
  er "MC Syds butik med vores huller drysset ind".

**Skift væk og tilbage: rent.** `Pris: Lav til høj` sorterer korrekt
(5.000 → 6.500 → 10.000 → 14.900 → 15.000 …), URL bliver `?sort=price-asc`,
forklaringsteksten forsvinder. Tilbage til `Blandet udbud` gav præcis samme
rækkefølge som før (124.800, 99.800, 34.800, 44.900 …) og URL'en tabte
sort-parameteren. Forudsigelig og reversibel. Kredit.

**Men "Nyeste først" er en fælde.** Den lægger alle 51 egne annoncer (som har
dato) over alle 332 indekserede (som ikke har). Resultat: **24 af 24 kort på side
1 er grå "Ingen fotos i denne annonce"-pladsholdere** — ikke ét foto på skærmen —
mens overskriften stadig siger "383 annoncer fundet". Det næst-mest oplagte
sorteringsvalg på en markedsplads giver en tom side.

Nyeste annonce på hele sitet: **"3 uger siden"**. Intet oprettet i 21 dage.

### Fordeling på de første 24 kort (standardsortering, ufiltreret)

| | Antal |
|---|---|
| Annoncer på Bikerbasen (denne side) | **4** |
| Indekseret hos MC Syd (anden side, `target=_blank`) | **20** |

83 % af side 1 fører **væk** fra sitet til mcsyd.dk. Og 7 af de 20 ligger under
`/Produkter/Motorcykel/**Ny**/` — forhandlerens nybil…nymc-katalog, med
"Kilometer: Ikke oplyst" og årgang 2023–2026 — under en H1 der siger
"**Brugte** motorcykler til salg". Intet "Ny"-mærke på kortet.

---

## 2. SCANBARHED

| | Antal af 24 |
|---|---|
| Kort med rigtigt foto | **20** (alle indekserede) |
| Kort uden foto | **4** (alle vores egne) |

Alle vores egne annoncer på side 1 er fotoløse. Alle med foto er andres.

**Et kort uden foto viser:** grå flade med kameraikon + "Ingen fotos i denne
annonce", dertil `FORHANDLER`-mærke, `Kørekort A2`-mærke, pris i stor skrift,
model, årgang / km / ccm med ikoner, forhandlernavn, by+region, alder.
Informationstæt og ærligt — men tre identiske grå felter side om side er
ulæselige som liste, og i "Nyeste først" bliver det 24 identiske grå felter.

**Siger annoncesiden det samme?** Ja — og bedre. `annonce.html?id=1003`
(Yamaha Ténéré 700) bruger *samme* formulering "Ingen fotos i denne annonce" og
tilføjer:
> "Sælgeren har ikke lagt billeder op. Vi viser ikke en tegning i stedet — bed
> sælgeren om fotos af netop den her motorcykel, før du kører efter den."

Det er den rigtige beslutning, sagt på rigtigt dansk. Ingen genereret tegning,
ingen udfyldning af huller. Stærkeste enkeltsætning på hele sitet.

**Men annoncesiden har felter, kortet gemte:** EFFEKT 73 hk, TYPE
Adventure/Enduro, STAND Som ny. Det fotoløse kort har en tom grå firkant på
284×378 px og bruger den til ingenting, mens de tre felter der kunne gøre kortet
klikbart ligger klar i data. Det er spildt plads, ikke manglende data.

---

## 3. ÆRLIGHED

**Skjulte annoncer: ja, og det er gjort ordentligt.** Med kørekort A2:
> "121 annoncer er ikke vist, fordi kørekortkategori ikke er oplyst på dem.
> Fjern filteret for at se dem."

**Tallet følger med.** Tilføjer man Maks. 60.000 kr. skifter sætningen til:
> "47 annoncer er ikke vist, fordi pris og kørekortkategori ikke er oplyst på
> dem. Fjern et af filtrene for at se dem."

Feltnavnene opdateres, flertalsformen opdateres, tallet regnes om (og falder
korrekt, fordi annoncer der alligevel ryger ud på pris ikke længere tælles som
"skjult"). Baren har intet tilsvarende — den skriver "Viser: 40.476 biler til
salg" med et infoikon og lader det ligge. Dette er vores stærkeste kort.

Sidebjælken advarer selv: *"Vejledende: filtrerer på effekt. Tjek altid
registreringsattesten — A2 kræver også maks. 0,2 kW/kg, og nogle mc'er sælges i
begrænset udgave."* Juridisk korrekt og selvkritisk.

### Det, der vælter det hele

**Samme URL giver 383 eller 51 annoncer, uden varsel.**

| Indlæsning | "annoncer fundet" | Kildelinjen | A2 giver |
|---|---|---|---|
| Nogle indlæsninger | **383** | "51 annoncer på Bikerbasen · 332 indekseret hos MC Syd" | 39 fundet / 121 skjult |
| Andre indlæsninger | **51** | **forsvundet helt** | 15 fundet / 8 skjult |

Målt gentagne gange på `/soegning.html` uden parametre og på
`?priceMax=60000&koerekort=A2` (28 fundet ved klik, **14** ved indlæsning af
samme URL). Stabilt i op til 30 s pr. indlæsning — det er ikke en langsom
efterindlæsning, det er to forskellige svar. Alle tal i filterskinnen flytter
med: "A2 (mellem mc)" står som 39 i den ene tilstand og 15 i den anden.

Konsekvensen er værre end tallet: **gennemsigtighedslinjen om kilderne — sitets
bedste tillidsfunktion — findes kun i den ene tilstand.** I den anden er der
ingen antydning af, at 332 af annoncerne bor på en anden virksomheds website.

Yderligere: "A (stor mc) 383" påstår at alle 383 annoncer er A-kørekort, mens
A2-filteret samtidig oplyser at 121 af dem mangler kørekortoplysning. De to tal
kan ikke være rigtige samtidig.

Andre tillidsobservationer:
* Sælgertype uden klik: **ja** — `FORHANDLER`-mærke eller "Privat sælger" på
  hvert kort. Bedre end baren, der viser forhandlerens logo men intet om private.
* Annoncesiden: "Forhandlerannonce. Du har som privatperson reklamationsret i op
  til 24 måneder efter købelovens regler for erhvervsmæssigt salg." + "Mød op
  personligt · Betal aldrig forud · Skriv via Bikerbasen · Læs gode råd". Rigtigt
  og relevant. Kredit.
* 293 KiB kortfotos hentes direkte fra **images.danbase.dk** — tredjeparts
  billedhost, varmlinket. Plus Supabase-biblioteket fra `cdn.jsdelivr.net`, som
  fejlede i konsollen under målingen ("Supabase-biblioteket blev ikke indlæst").
* Baren viser den *sælgende* forhandlers eget logo øverst på kortet (NBC Biler,
  STARMARK, JAN NYGAARD). Vi viser "Annonce fra MC Syd ↗". Samme plads,
  modsat budskab.

---

## 4. MOBIL 390

`innerWidth = 390` verificeret indefra. Ingen vandret rulning.

**Resultatlinjen fylder 3 linjer:**
1. `383 annoncer fundet` (y=231)
2. `● 51 annoncer på Bikerbasen` (y=258)
3. `✳ 332 indekseret hos MC Syd` (y=279)

På 1440 står linje 2 og 3 side om side; på 390 brydes de i to.

**Informationsikonet hænger sammen med teksten: ja.** Knappen ligger x=183–205,
y=276–298, umiddelbart til højre for "…MC Syd" (x=16–177, y=279–296), og den
brydes ned sammen med sin egen linje. `aria-label="Hvad betyder det, at en
annonce er indekseret?"`, `title="Hvad betyder indekseret?"`. Semantisk fint.

**Men rammen er 22×22 px.** Under WCAG-minimum på 24×24 og langt under 44×44.
Sitets vigtigste oplysning — hvad "indekseret" betyder — sidder bag det mindste
trykmål på siden.

**Det afgørende mobiltal:** første kort begynder ved **y=492** af 844 px, og den
første **pris står ved y=854 — under kanten.** På en dansk motorcykelkøbers
telefon kan man ikke se én pris på første skærm. Kortet er 595 px højt, så der er
plads til to ad gangen.

Hvad de 492 px går til: brødkrumme, stor H1, høj søgeboks, 3-linjers
resultatblok, sortering i sin egen fuldbredde-række, en værktøjsrække med 5
knapper (klokke uden tekst + tre visningstilstande + Filtre) og til sidst **4
linjer grå forklaring af sorteringsalgoritmen**. Tre listetætheder og en
algoritmeforklaring på en 390 px skærm, før første pris.

Baren i samme lodrette rum: søgning + klokke + Filtre på **én** række, "Viser:
40.474 biler til salg ⓘ" på én linje, "Sortér: Standard", Køb/Leasing-faner — og
derefter et **helt** kort: forhandlerlogo, stort foto, model, variant,
`299.900 kr.`, fem specifikationschips og starten på bynavnet. Én købbar annonce
over kanten mod vores nul.

Bemærk også: baren skriver "**Sortér:** Standard". Vores vælger står bar og siger
kun "Blandet udbud" — en dansk køber kan ikke se om det er en sortering eller et
filter.

**Mobilfilterarket er derimod bedre end barens.** Kørekort først med tal på hver
chip (A1 15 / A2 39 / A 383), MC-typerne med tal, prisintervaller med tal, klæbet
fodrække "Nulstil" / "Vis 383 annoncer". Baren har nul tal på nogen mulighed og
åbner på "Kategori: Personbil". Eneste anke: arket dækker ikke hele skærmen —
vores farvede topbjælke bliver stående.

---

## Filtrene: er de MC-felter eller bilfelter i forklædning?

Ægte MC-felter, som baren strukturelt ikke kan have: **Kørekort (A1/A2/A)**,
Motorstørrelse (ccm), Effekt (hk), Kun nysynet, Kun vinterklargjorte, Maks. antal
ejere, Stand, Kun annoncer med billeder, Kun forhandlere. Typerne er præcis de
otte danskere bruger.

Men **7 af 19 filtergrupper er tomme overskrifter med nul kontroller** — både
ufiltreret og filtreret:

`Model` · `Servicehistorik` · `Udstyr` · `Brændstof` · `Træktype` · `Cylindre` · `Farve`

De klapper op og viser ingenting. Tre af dem er bilfelter: **Træktype** er
meningsløs på en motorcykel, **Brændstof** og **Cylindre** er
personbilsformularen der skinner igennem. Og **Udstyr** — ABS, quickshifter,
varmehåndtag, det der afgør et MC-køb — er netop den, der er tom.

Dertil: `Mærke` viser BMW, Ducati, Harley-Davidson, Honda, Kawasaki og KTM **to
gange** (populær-chips + alfabetisk liste), og nul-tals-mærker (Suzuki 0,
Kawasaki 0) står stadig som klikbare afkrydsningsfelter.

---

## Dansk følelse

Rigtigt: `124.800 kr.` · `5.500 km` · `1.000 ccm` · `152 hk` ·
`Annoncen er oprettet 25. jul. 2026 · 3 uger siden` · `Se annoncen hos MC Syd`
(ikke "Vis notering") · A1/A2/A · Touring, Cruiser, Naked, Sport,
Adventure/Enduro, Classic/Veteran, Cross/MX, Scooter — præcis de otte.
Ingen engelske ord i sidens egen tekst.

Fejlen sidder i **dataene**: 10 af de 24 kort viser en type, der ikke findes i
vores eget filter — `Street` (5), `Sportstouring` (2), `Adventure`, `Offroader`,
`Adventure Offroader`, og andetsteds `Klassiker`. Et kort (Harley-Davidson FXBR
Breakout) har slet ingen type. Filtrerer man på "Naked 64", får man kort der
siger "Street". Ordforrådet fra den skrabede kilde er ikke oversat til vores.

---

## Lighthouse (kun os — GAPS 5: gulvet er absolut)

Chrome 12.8.2, `/soegning.html`.

| | Mobil (4× CPU, mellemklasse) | Desktop |
|---|---|---|
| Ydelse | **67** (gulv 95) ✗ | **72** ✗ |
| Tilgængelighed | **100** ✓ | **100** ✓ |
| Bedste praksis / SEO | 100 / 100 | — |
| FCP | 3,6 s | 1,6 s |
| **LCP** | **8,0 s** (gulv ≤2,5 s) ✗ | 4,2 s ✗ |
| TBT | 0 ms ✓ | 0 ms ✓ |
| CLS | **0** ✓ | 0,027 ✓ |

CLS 0 og TBT 0 ms er fremragende — **intet flytter sig efter det er tegnet**, og
de 11 setTimeout-ticks giver ikke ét layoutskift. Hele tabet ligger i ét sted:
LCP-elementet er `div#results-grid > article.card > div.card-media > img.card-photo`
— en **lazy-loaded tredjeparts-JPEG fra images.danbase.dk, 490 px nede på
siden**. Lighthouse: `lcp-lazy-loaded` fejler, `prioritize-lcp-image` est. 340 ms,
`modern-image-formats` est. 419 KiB, `unused-css-rules` 191 KiB,
`unminified-javascript` 146 KiB, `unminified-css` 71 KiB.

Advarsel om de 100 i tilgængelighed: 10 talfelter i filterskinnen har **intet
tilgængeligt navn** — kun pladsholder (`filter-price-min` "Min.",
`filter-price-max` "Maks.", `filter-year-min/max`, `filter-km-max`,
`filter-ccm-min/max`, `filter-hk-min/max`, `filter-ejere-max`). Axe ser dem ikke,
fordi de ligger i lukkede `<details>`. Åbner brugeren gruppen, er navnet væk.
De 100 er delvis vundet ved at skjule kontrollerne.

---

## DOM

```
VINDER: findbarhed=os tillid=Bilbasen hastighed=Bilbasen dansk=os
LIGHTHOUSE: ydelse=67 a11y=100 LCP=8.0s CLS=0.00   (mobil; desktop: ydelse=72 a11y=100 LCP=4.2s CLS=0.03)
STØRSTE HUL: Samme søge-URL svarer "383 annoncer fundet" med kildelinjen
"51 på Bikerbasen · 332 indekseret hos MC Syd" på nogle indlæsninger og
"51 annoncer fundet" helt uden kildelinje på andre (og ?priceMax=60000&koerekort=A2
giver 28 ved klik mod 14 ved genindlæsning) — lås resultatsættet til én sandhed
pr. URL og lad kildelinjen altid stå, ellers er hver enkelt af sidens ærlige
tællinger værdiløs.
```

### Runner-up, hvis den første lukkes
På 390 px står den første pris ved y=854 af 844 — under kanten — fordi 492 px går
til H1, 3-linjers resultatblok, sortering i egen række, fem værktøjsknapper og
fire linjer grå algoritmeforklaring; baren viser et helt kort med pris og fem
specifikationschips i samme rum.
