# DOM: Søgeside og filtre (SRP) — runde 3

Frisk dommer. Jeg har ikke læst `work/DECISIONS.md`, ingen tidligere domme og
ingen kildekode. Alt herunder er målt i en browser.

## Målebetingelser

| | |
|---|---|
| Dato | 2026-08-19 |
| Server | egen instans, `python scripts/dev-server.py` på port **8617** (ikke 8532) |
| Tilstand | **udlogget**, `localStorage`+`sessionStorage` ryddet før hver måling, cookiemur lukket med **"Kun nødvendige"** (knapteksten verificeret) |
| Viewport | `innerWidth` aflæst inde i siden: **1440** og **390**. `document.documentElement.scrollWidth` = 390 ved 390 → **ingen vandret scroll** |
| Værktøj | Playwright (Chromium), axe-core 4, Lighthouse 12.8.2 |
| Bar | `bar/desktop/02-srp.png`, `bar/mobile/02-srp.png` — geometri aflæst pixel for pixel af PNG'erne |

### Hvilken tilstand jeg målte — læs denne først

Jeg målte **lokal tilstand med demokataloget slået TIL**. Tælleren siger:

> 443 annoncer fundet — 51 annoncer på Bikerbasen · 332 indekseret hos MC Syd · 60 indekseret hos Gul og Gratis

51 + 332 + 60 = 443. De 392 indekserede svarer præcis til produktion; **de 51 egne
findes ikke i produktion**. Hvor det ændrer dommen, siger jeg det eksplicit.

---

## 1. Determinisme — den bestod uden en eneste ridse

Samme URL (`?koerekort=A2&priceMax=60000`) hentet **15 gange** i træk, fuld
genindlæsning hver gang. Sammenlignet felt for felt:

| Felt | Distinkte værdier over 15 loads |
|---|---|
| Resultattal (`31 annoncer fundet`) | **1** |
| Kildelinje (`14 på Bikerbasen · 14 MC Syd · 3 Gul og Gratis`) | **1** |
| Forklaringslinje under Sortér | **1** |
| Alle 37 facettal, samlet streng | **1** |
| Rækkefølgen af alle 24 kort på siden | **1** |
| Antal kort | **1** |

**Ankomst ved klik vs. frisk URL:** jeg satte A2 + 30–60.000 med musen, læste
URL'en, åbnede den i en ren kontekst og sammenlignede seks felter inkl. hele
kortrækkefølgen. `JSON.stringify(vedKlik) === JSON.stringify(vedUrl)` → **true**.

Det er det stærkeste enkeltresultat på siden. En markedsplads, der svarer
forskelligt på samme URL, er ikke til at stole på. Denne gør ikke.

## 2. Facettallene holder — 37 ud af 37

Jeg klikkede hver eneste facet enkeltvis fra ren tilstand og sammenlignede det
lovede tal med det, jeg faktisk fik:

| Gruppe | Antal facetter | Løfte = resultat |
|---|---|---|
| Kørekort | 3 | 3/3 |
| Type | 8 | 8/8 |
| Pris | 5 | 5/5 |
| Mærke (synlige) | 12 | 12/12 |
| Region | 5 | 5/5 |
| Stand | 4 | 4/4 |
| **I alt** | **37** | **37/37** |

Facetsummerne er også internt konsistente: Region 18+8+356+34+27 = 443 = totalen.
Type 28+55+93+65+72+8+14+3 = 338, og 443−338 = **105**, hvilket er præcis det tal
siden selv oplyser som "uden type". Stand 12+29+188+2 = 231, 443−231 = **212** —
også præcis siden's eget tal.

## 3. Linjen om skjulte annoncer — jeg tjekkede tallene selv, og de er rigtige

Siden skriver, når et filter smider annoncer ud på grund af manglende data. Jeg
gennemgik alle 19 sider (443 kort) og talte selv efter i kortteksten:

| Felt | Siden lover "ikke vist" | Jeg talte | |
|---|---|---|---|
| Pris ikke oplyst | 22 | **22** | ✔ |
| Kilometertal ikke oplyst | 202 | **202** | ✔ |
| Hestekræfter ikke oplyst | 134 | **134** | ✔ |
| Årgang ikke oplyst | 3 | **3** | ✔ |

Den **genberegner** og den **sammensætter**:

| URL | Linje |
|---|---|
| `?priceMax=60000` | "22 annoncer er ikke vist, fordi **pris** ikke er oplyst på dem." |
| `?kmMax=20000` | "202 … fordi **kilometertal** ikke er oplyst …" |
| `?koerekort=A2&priceMax=60000` | "54 … fordi **pris og kørekortkategori** ikke er oplyst … Fjern **et af filtrene**" |
| `?regions=Sjælland`, `?brands=Honda` | **ingen linje** — og korrekt, for region og mærke er kendt på alle 443 |

Sætningen ligger i en `aria-live`-region, så en skærmlæser får den. Det er den
slags ærlighed, Bilbasen slet ikke forsøger sig med — de skriver "Viser: 40.573
biler til salg" og intet andet.

### 3b. Én selvmodsigelse i netop den mekanik

| URL | Siden siger |
|---|---|
| `?koerekort=A1` | "**15** annoncer er ikke vist, fordi kørekortkategori ikke er oplyst" |
| `?koerekort=A2` | "**134** annoncer er ikke vist, fordi kørekortkategori ikke er oplyst" |

Samme felt, samme katalog. Regnestykket: A1 ⇒ 17 + 411 + 15 = 443, altså **428**
annoncer med kendt kategori. A2 ⇒ 47 + 262 + 134 = 443, altså **309** med kendt
kategori. **119 annoncer er "kendt" for A1 og "ukendt" for A2 på samme tid.**
Begge tal kan ikke være sande. Årsagen er sandsynligvis, at A1 kan afgøres på ccm
alene (kun 17 mangler ccm), mens A2 kræver hk (134 mangler hk) — men det ved
køberen ikke, og linjen påstår noget om *data*, ikke om *metode*.

## 4. Køberens opgave: "A2-kørekort, under 60.000 kr."

### Desktop 1440 — 2 handlinger, ingen modal

| # | Handling | Resultat | URL |
|---|---|---|---|
| 1 | Klik `A2 (mellem mc) 47` i den synlige skinne | 47 | `?koerekort=A2` |
| 2 | Skriv `60000` i feltet **Pris til** | **31** | `?priceMax=60000&koerekort=A2` |

Feltet debouncer og anvender **uden Enter** (målt: 1,5 s efter sidste tegn er
resultatet opdateret). Ingen modal, ingen "Anvend"-knap, ingen sideskift.
Bilbasen kræver: åbn "Alle filtre (2)" → find → sæt → luk. Vi vinder klart.

### Fælden: prisbåndene er gensidigt udelukkende, men ser ud som til- og fravalg

Den naive vej til "under 60.000" er at klikke de to indlysende bånd:

| Handling | Antal | URL |
|---|---|---|
| Klik `Under 30.000 (33)` | 7 | `?priceMax=30000&koerekort=A2` |
| Klik `30–60.000 (64)` | **24** | `?priceMin=30000&priceMax=60000&koerekort=A2` |

Det andet klik **annullerer** det første. Køberen tror han har 31 motorcykler,
men får 24, og **de 7 billigste forsvinder uden et ord**. Der findes intet
"Under 60.000"-bånd.

Det værste er, at de tre chip-grupper ser fuldstændig ens ud og opfører sig
forskelligt — samme `<button class="chip">`, samme form, samme farve:

| Gruppe | Adfærd | Målt bevis |
|---|---|---|
| **Type** | fler-valg (union) | Sport(28) + Naked(65) → `?types=sport,naked` → **93** |
| **Kørekort** | enkelt-valg | A1 så A2 → `?koerekort=A2` → **47** (A1 væk) |
| **Pris** | enkelt-valg | se tabellen ovenfor |

### Grænserne er inklusive i begge ender

`?priceMin=30000&priceMax=30000` → **1 annonce**. Den annonce tælles både i
"Under 30.000" og i "30–60.000". Tre annoncer ligger dobbelt (30.000, 60.000,
100.000), og derfor summerer båndene til 424, mens der kun er 421 annoncer med
pris. En annonce til præcis 30.000 kr. står desuden under mærkatet **"Under
30.000"**, hvilket ikke er dansk for `≤`.

## 5. Tilbage-knappen: scrollpositionen er pixelperfekt, men filtrene er ikke fortrydelige

`history.scrollRestoration` er sat til `manual`, og der er skrevet en egen
gendannelse. Den virker exceptionelt godt:

| Sag | scrollY før | scrollY efter | Kortets `y` før → efter | Samme kort |
|---|---|---|---|---|
| Desktop 1440, kort #10 | 1939 | **1939** | 217 → **217** (Δ 0 px) | ja |
| Mobil 390, kort #7 | 3422 | **3422** | 182 → **182** (Δ 0 px) | ja |
| Desktop, **side 3** af 19 | 747 | **747** | 218 → **218** (Δ 0 px) | ja, og stadig "Side 3 af 19" |

Filtrene overlever (`?priceMax=60000&koerekort=A2` intakt), pagineringen
overlever (`?page=3`), og siden husker at man var på side 3 efter en `F5`.
Det er bedre end de fleste markedspladser.

**Men:** filterændringer bruger `replaceState`. Målt:

| Handling | Nye history-poster |
|---|---|
| Skriv "Hornet" (6 tegn) i fritekstfeltet | **0** |
| 3 filterklik (A2, Sport, Naked) | **0** |
| → ét tryk på Tilbage herfra | lander på **`index.html`** |

Det gode: at taste i søgefeltet spammer ikke historikken. Det dyre: **Tilbage er
ikke fortryd.** Køberen, der har sat tre filtre og synes det sidste var for
snævert, ryger ud af søgningen og mister alle tre. En SRP bør kunne fortrydes ét
filter ad gangen.

## 6. Alle filtergrupper indeholder virkende kontroller

Jeg åbnede hver eneste `<details>` og talte kontrollerne. **Ingen tomme
harmonikaer** — de fire grupper uden indhold (`Model`, `Servicehistorik`,
`Udstyr`, `Farve`) er `hidden` og vises slet ikke. Det er rigtigt gjort.

| Gruppe | Synlig | Kontroller | Indhold |
|---|---|---|---|
| Kørekort | ja | 3 | A1 17 / A2 47 / A 443 |
| Type | ja | 8 | otte typer med tal |
| Pris (DKK) | ja | 9 | 5 bånd + 2 skydere + Pris fra/til |
| Mærke | ja | 29 | søgefelt + 27 mærker + "Vis alle" |
| Årgang | ja | 4 | Årgang fra/til + skydere |
| Kilometertal | ja | 1 | Kilometer højst |
| Motorstørrelse (ccm) | ja | 2 | Ccm fra/til |
| Effekt (hk) | ja | 2 | Hk fra/til |
| Region | ja | 5 | 5 regioner, summerer til 443 |
| Stand | ja | 4 | 4 stande med tal |
| Annoncen | ja | 3 | Oprettet-select + 2 afkrydsninger |
| Model, Servicehistorik, Udstyr, Farve | **nej (`hidden`)** | — | vises betinget |
| Ejere & syn | nej (`hidden`) | 3 | har kontroller, vises betinget |

Facetter med 0 træffere får klassen `facet-empty` og er **`disabled`** (opacity
0,42). Man kan ikke klikke sig ind i en blindgyde.

## 7. Sortering — alle seks gør præcis, hvad de hedder

Målt som antal brud på monotoni over de 24 kort på side 1:

| Valg | `sort=` | Brud på den lovede orden | Ser siden i stykker ud? |
|---|---|---|---|
| Blandet udbud | (ingen) | — (bevidst blandet) | nej |
| Nyeste først | `date-desc` | 0 | nej |
| Pris: Lav til høj | `price-asc` | **0** | nej |
| Pris: Høj til lav | `price-desc` | **0** | nej |
| Årgang: Nyest først | `year-desc` | **0** | nej |
| Kilometertal: Lavest først | `km-asc` | **0** | nej |

Ingen af dem producerer en tom eller brudt side. To af dem forklarer sig selv,
og forklaringen genberegnes: "Blandet udbud: de **14** annoncer uden foto er
fordelt jævnt ud over listen … — **11** af de 24 på denne side." 14 × 24/31 =
10,8 ≈ 11. Tallet er rigtigt.

### Men "Nyeste først" er død i produktion

Linjen lyder: *"kun 51 af 443 annoncer har en oprettelsesdato … de øvrige 392 er
indekseret hos en forhandler, hvor vi ikke kender datoen."* De 51 er
demokataloget. **I produktion er 0 af 392 daterede** — så det mest efterspurgte
sorteringsvalg på enhver markedsplads degenererer til "blandet rækkefølge" for
100 % af lageret.

Linjen er desuden faktuelt forkert på sine egne præmisser: den kalder alle 392
"indekseret hos **en forhandler**", men 60 af dem er fra Gul og Gratis, og siden
mærker dem selv **"Privat sælger · guloggratis.dk"** på kortene.

## 8. Mobil 390 — her taber vi til baren, målt i pixels

Alle tal er absolutte y-koordinater. Bilbasens er aflæst pixel for pixel i
`bar/mobile/02-srp.png`.

| | Os | Bilbasen | Forskel |
|---|---|---|---|
| Første kort begynder | **425 px** | **283 px** | **+142 px chrome** |
| Første pris (bund) | 726 | 697 | +29 |
| Kort 1 slutter | 972 | 807 | +165 |
| **Kort 2 synligt over folden (844)?** | **nej** (begynder 992) | **ja** (begynder 808) | — |
| Sidste spec-chip over folden? | **nej** (bund 858) | ja | — |
| Vandret scroll (`scrollWidth`) | **390 ✔** | 390 | — |

Bilbasen leverer et **helt kort** over folden — foto, model, variant, pris og
fire spec-chips plus lokation — og lader kort 2 titte frem. Vi leverer foto,
pris, titel og halvdelen af chip-gitteret.

De 425 px går til: brødkrumme (78), H1 (95), søgefelt (130), tæller (192),
kildelinje (op til ~260), **Sortér-dropdown (~280)**, ikonrække + Filtre (323),
og forklaringslinjen om blandet udbud (~380).

To ting er direkte forkert prioriteret her:

1. **Sortér står over Filtre.** Sorteringen får en fuldbredde-select på 308 px;
   "Filtre" er en lille lys knap (103×45) nede i en ikonrække. Ingen sorterer,
   før de har filtreret. Bilbasen har det omvendt: en massiv orange **"Filtre 2"**
   øverst til højre med antallet af aktive filtre *på* knappen.
2. **Forklaringslinjen om sorteringen står før det første produkt.** Den er god,
   men den hører til under listen — ikke foran den.

### Filterarket på mobil: fungerer, men er ikke en dialog

Det gode: bundbjælken har **"Nulstil"** (172×45) og **"Vis 443 annoncer"**
(172×45), og tallet er live — jeg klikkede A2 og knappen skiftede til
**"Vis 47"**. Det er nøjagtigt den rigtige mekanik.

Det dårlige, målt på det åbne ark (390×743 af en 844 px høj skærm):

| Kontrol | Målt |
|---|---|
| `role="dialog"` | **mangler** (det er en `div.filters-overlay.open` + `aside.filters-panel`) |
| `aria-modal` | **mangler** |
| `aria-label` på arket | **mangler** |
| `aria-expanded` på "Filtre"-knappen | **mangler** |
| `aria-controls` på "Filtre"-knappen | **mangler** |
| Fokus flyttet ind i arket ved åbning | **nej** — fokus bliver på "Filtre"-knappen |
| `body` scroll-låst | **nej** (`overflow: visible`) |
| Indhold bagved gjort inert | **nej** — pagineringsknapperne under arket er stadig i tabrækkefølgen |

Visuelt er det en modal. For en skærmlæser og for en tastaturbruger er det bare
indhold, der dukkede op.

## 9. Trykflader

Målt på hele siden ved 390 px, og igen med filterarket åbent og alle grupper
foldet ud (netop for at fange det, der gemmer sig i lukkede `<details>`).

| Kategori | Antal | Dom |
|---|---|---|
| Under 24×24 px | **1** — brødkrumme-linket "Forside" (42×19) | Grænsetilfælde: SC 2.5.8 undtager tekstlinks i løbende tekst. Jeg lader den passere. |
| Afkrydsningsfelter (mærke/region/stand) | 23 stk. `<input>` på **18×18** | **Ikke en fejl.** Den reelle trykflade er hele etiketten: **356×32**. Jeg klikkede 8 px fra etikettens højre kant, 356 px fra selve boksen — `?brands=Aprilia` blev sat. Med 10 px lodret luft mellem naborækker (32+10 = 42 ≥ 24) er afstandsundtagelsen i SC 2.5.8 opfyldt. |
| 24–43 px (under 44×44-målet) | filterchips 36 px høj · etiketrækker 32 px · paginering 40×40 · sammenlign-knap på kortet 34×34 · sorterings-select 40 px | Ingen WCAG-fejl, men under den reelle tommelfinger-standard. |
| ≥ 44×44 | 38 | |

**Ingen egentlig WCAG-overtrædelse på trykflader.** Men fem forskellige højder
(32, 34, 36, 40, 45) på kontroller, der ligger side om side, er ikke et system.

## 10. axe — rent i seks konfigurationer

| Konfiguration | Overtrædelser |
|---|---|
| Desktop 1440, standard | **0** |
| Desktop 1440, **alle grupper tvangsåbnet** (inkl. de `hidden`) | **0** |
| Desktop 1440, filtre sat + alle grupper åbne | **0** |
| Desktop 1440, tom tilstand | **0** |
| Mobil 390, standard | **0** |
| Mobil 390, **filterarket åbent, alle grupper udfoldet** | **0** |

Kørt mod `wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice`. Lighthouse giver
a11y **100** på både mobil og desktop.

### Det axe ikke kan se, og som jeg fandt ved at åbne alt selv

Filterchippen markerer sin valgte tilstand **udelukkende med en CSS-klasse**:

    A2 (mellem mc) 47   →   class="chip active"
                            aria-pressed  = null
                            aria-checked  = null
                            role          = null

Alle 16 chips, alle tre grupper, både til- og fravalgte. En skærmlæserbruger kan
navigere hele filterskinnen igennem uden at få at vide, hvilke filtre der er
slået til. Det er WCAG 4.1.2 (Navn, rolle, værdi). axe fanger det ikke, fordi
axe ikke kan vide, at en `<button>` er ment som en kontakt. Det er derfor
opgaven bad om at åbne alle grupper — og det var det, der lå gemt.

## 11. Lighthouse — og her falder siden igennem sit eget gulv

**Mobil, 4× CPU-throttling, 3 kørsler:**

| Kørsel | Ydelse | A11y | Best practices | SEO | FCP | **LCP** | TBT | **CLS** |
|---|---|---|---|---|---|---|---|---|
| 1 | 74 | 100 | 100 | 100 | 2,0 s | 6,7 s | 140 ms | 0,004 |
| 2 | 72 | 100 | 100 | 100 | 2,0 s | 6,9 s | 160 ms | 0,004 |
| 3 | 74 | 100 | 100 | 100 | 2,0 s | 6,4 s | 140 ms | 0,004 |
| **Median** | **74** | **100** | 100 | 100 | 2,0 s | **6,7 s** | 140 ms | **0,004** |

**Desktop:** ydelse **97**, a11y **100**, FCP 0,4 s, LCP **1,3 s**, TBT 0 ms, CLS 0,022.

Gulvet i `bar/GAPS.md` er ydelse ≥ 95 og LCP < 2,5 s. Desktop klarer det.
**Mobil er 21 point og 4,2 sekunder under.**

### Årsagen, målt

LCP-elementet er det første kortfoto (`div#results-grid > article.card >
div.card-media > img.card-photo`, 378×236). Fasefordelingen:

| Fase | ms |
|---|---|
| TTFB | 452 |
| **Load Delay** | **4.733** |
| Load Time | 1.178 |
| Render Delay | 319 |

**4,7 sekunder, før billedet overhovedet får lov at begynde.** Kæden er:

1. `css/styles.css` er **213 KB og render-blokerende i 1.202 ms**.
2. `supabase-js` hentes fra **cdn.jsdelivr.net** i den kritiske sti.
3. Først derefter kaldes Supabase REST (2 kald), først derefter render JS
   kortene, og først derefter findes der en `<img>` at hente.
4. Og billedet ligger **ikke hos os**: alle seks kortfotos hotlinkes fra
   **`images.danbase.dk`** (MC Syds billed-CDN), 365 KB JPEG i alt, uden
   `srcset`, uden WebP (Lighthouse: 142 KiB at spare på format alene).

Holdet har gjort det, man kan gøre inden for den arkitektur: der er
`preconnect` til `images.danbase.dk`, `assets.guloggratis.dk`, Supabase og
jsdelivr, og det første kortbillede har `loading="eager"` + `fetchpriority="high"`
mens resten er `lazy`/`low`. **Det hjælper ikke,** for prioritetshint kan ikke
fremskynde en URL, browseren ikke kender endnu.

Dette er **ikke** en localhost-artefakt. Vores egen HTML/CSS/JS serveres
lokalt og er dermed *hurtigere* end i produktion; Supabase og danbase.dk er
fjerne i begge tilfælde. Og da produktion består af **392 indekserede annoncer
og 0 egne**, er 100 % af produktionens kortfotos hotlinkede fra tredjepart.
**Produktion vil være det samme eller værre.**

CLS på 0,004 er derimod fremragende, og ingen billeder er ustørrede.

## 12. Kortene: to grammatikker i samme gitter

Alle kort er 280×533 på desktop — gitteret er stramt. Men indholdet følger to
forskellige skabeloner:

| | Indekseret kort (`card card-external`) | Eget kort (`card`) |
|---|---|---|
| Kilde-bånd | "Annonce fra MC Syd" øverst | — |
| Sælger | "Forhandler · mcsyd.dk" i foden | badge **"FORHANDLER"** |
| Spec-etiketter | Årgang / Kilometer / **Kubik** / Effekt | ingen |
| Chips | 4 (år, km, ccm, hk) | 3 (år, km, ccm) |
| Kørekort | badge "Kørekort A2" i kroppen | badge "A2" øverst |
| Friskhed | ingen | "3 uger siden" |
| Foto | ja | "Ingen fotos i denne annonce" |

Konsekvensen er målbar. I rækker, der blander de to, står prisen **ikke** på
linje:

| Række (y) | Prisernes y | Spredning |
|---|---|---|
| 417 | E:675 E:675 E:675 | **0 px** |
| 965 | **O:1191** E:1224 E:1224 | **33 px** |
| 1514 | E:1772 E:1772 E:1772 | 0 px |
| 2062 | E:2321 E:2321 **O:2288** | **33 px** |

To ud af seks rækker på side 1 har en pris, der ligger 33 px ude af takt. På en
søgeside er priskolonnen det, øjet kører ned ad.

**Vigtigt forbehold:** i produktion er der 0 egne annoncer, så dette ses ikke i
dag. Men det rammer i samme sekund, den første rigtige bruger opretter en annonce.

### Sammenligning med barens kort

Bilbasens kort bærer: forhandlerbanner + logo, **karruselprikker** (jeg kan se,
der er 5 fotos), **"Ny annonce"**, videomærke, **favorithjerte**, og model og
variant på hver sin linje ("MG ZS" / "50 Comfort 5d"). Vores kort har ét foto
uden antydning af, om der er flere, ingen favoritkontrol jeg kan aflæse — den
eneste kortknap er et umærket søjlediagram-ikon (34×34, `aria-label` "Tilføj til
sammenligning") — og en underrubrik, der kun gentager typen ("Naked"), altså
samme oplysning som Type-filtret.

## 13. Dansk

Sproget er ægte dansk. Jeg søgte efter 26 engelske UI-gloser i den synlige tekst
og efter engelsk i alle `aria-label`, `title`, `placeholder` og `alt`
(**0 engelske forekomster**; det eneste "hit" var "Sortér", som min regex
fejlmatchede). Formuleringerne er ikke oversat, de er skrevet:

- *"Søgeagent gemt her på enheden. Log ind for at få besked på mail."* — udlogget
  virker "Gem søgning" faktisk, og siden lyver ikke om hvad den kan.
- *"22 annoncer er ikke vist, fordi pris ikke er oplyst på dem."*
- *"Kan føres på A2-kørekort. Udledt af 373 ccm og 44 hk — vejledende, for en
  motorcykel kan være en effektbegrænset udgave …"*
- Tom tilstand: *"Ingen annoncer matcher dine filtre — prøv at fjerne et filter
  eller udvide dit prisinterval"* + **Nulstil filtre** + tilbud om søgeagent.

### Ordforråd importeret fra kilden i stedet for vores eget filter

| Begreb | Filtrets ord | Kortets ord | Chippen |
|---|---|---|---|
| Slagvolumen | **Motorstørrelse (ccm)** | **Kubik** | ccm |
| Distance | **Kilometertal** | **Kilometer** | km |

"Kubik" er godt dansk mc-sprog, men det er **feedets** ord, ikke vores. Tre
gloser for ét felt på samme skærm.

### Data fra kilden, der ikke er blevet vasket

Talt over alle 443 kort:

| Problem | Antal | Eksempler |
|---|---|---|
| Titel = **kun mærkenavn, ingen model** | **6** | "Honda" (609.995 kr.), "BMW" |
| Uvasket, småt/sammenskrevet | 2 | "Honda vf750f", "Suzuki ls650" |
| Fritekst-overskrift brugt som model | ≥1 | "Suzuki Motorcykel med meget udstyr" |
| Mærket gentaget i titlen | 1 | "Fb Mondial FB Mondial HPS 125 Hipster" |
| "Ny " klistret på modelnavnet i kortkroppen | mange | "Ny Honda MSX 125", "Ny Honda Monkey" |
| Samme titel ≥ 5 gange i kataloget | 12 titler | 17× "Honda CRF 1100 L Africa", 14× "Honda CMX 1100 D Rebel", 12× "Honda GL 1800" |

Seks kort til over en halv million kroner, hvor der bare står **"Honda"**.
Bilbasen skriver aldrig et kort uden model.

### Adressestrengen blander sprog

`?koerekort=A2` (dansk) står side om side med `?priceMin`, `?priceMax`, `?page`,
`?sort`, `?types`, `?brands`, `?conditions`, `?regions` (engelsk). URL'en er
synlig, når man deler en søgning.

## 14. Blind A/B

Jeg beskar branding væk af begge sider, blandede rækkefølgen med en tilfældig
nøgle, skrev nøglen til en fil jeg først åbnede bagefter, og dømte på billedet.

### Mobil 390 — **jeg valgte baren**

Min begrundelse, skrevet før afsløringen:

> HØJRE er det bedre sted at handle. Den bruger sin højde på varer: ved bunden af
> folden har jeg set et **helt** kort — foto, mærke/model, variant, pris, fire
> spec-chips og lokation — plus toppen af det næste. VENSTRE bruger den samme
> højde på en brødkrumme, en H1 der gentager det åbenlyse, en tæller, en
> to-linjers kildelinje, en sorteringsdropdown, en ikonrække og et afsnit der
> forklarer sorteringen — og når så kun halvvejs ned i ét kort. Jeg tæller seks
> stykker inventar før det første produkt.
> HØJRE's filterknap er umulig at overse: massiv orange "Filtre" med antallet af
> aktive filtre *på* knappen. VENSTRE's "Filtre" er en bleg omridsknap som nummer
> fem i en række, **under** en sorteringsdropdown — sortering får mere vægt end
> filtrering, hvilket er bagvendt.
> HØJRE's kort er et bedre produktkort: model og variant på hver sin linje,
> karruselprikker der viser at der er fem fotos, et favorithjerte til at gemme
> med. VENSTRE har ingen af delene — dens eneste kortknap er et umærket
> søjlediagram-ikon, jeg ikke kan gætte formålet med.
> VENSTRE vinder på ærlighed: den fortæller hvor hver annonce kommer fra og
> forklarer sin egen rækkefølge. Og dens søgefelt er bredere og bedre mærket
> ("Søg efter mærke eller model" mod "Søg på bil"). Men på et førstebesøg vil jeg
> se motorcykler, ikke læse tre linjers forklaring.

**Nøgle: venstre = OS, højre = Bilbasen. Jeg valgte Bilbasen på mobil.**

### Desktop 1440 — **jeg valgte os**

Begge beskåret fra deres søgefelt og ned, så hverken logo eller Bilbasens
180 px reklamebanner røbede kilden. (Det stiller baren *bedre*, end den er.)

> NEDERST er bedre, og det er ikke tæt løb. Den lægger alle facetter på skærmen
> uden et klik: Kørekort med tal (17/47/443), otte typer med tal, og der er
> tydeligvis mere nedenunder. ØVERST gemmer **alt** bag "Alle filtre (2)" — ved
> 1440 px lader den ~300 px grå margen stå tom i hver side og nægter stadig at
> vise mig en eneste facet. Det er en modal jeg skal åbne, sætte, lukke og åbne
> igen for hver justering; NEDERST lader mig justere og se listen ændre sig.
> NEDERST's tal sælger for mig: "A2 (mellem mc) 47" fortæller mig **før** klikket,
> at der er 47 motorcykler jeg må køre. ØVERST fortæller mig intet før jeg
> forpligter mig. NEDERST bruger sin bredde — søgefeltet fylder hele
> indholdskolonnen; ØVERST's er 250 px i et 1440 px vindue.
> ØVERST vinder på kortene: model og variant hver for sig, karruselprikker,
> favorithjerte, "Ny annonce", videomærke. Og NEDERST spilder 144 px af sin
> filterskinne på et ni-linjers gråt afsnit om kørekortklasser — det første man
> læser på en side man kom til for at se motorcykler.
> Alligevel: facetter med levende tal på skærmen slår et smukt kort bag en modal.

**Nøgle: øverst = Bilbasen, nederst = OS. Jeg valgte os på desktop.**

Én ting i min blinde desktop-dom skal jeg trække tilbage: jeg skrev, at det
tredje kort stod 4 px højt og var fejljusteret. Efterprøvet er det et
indlæsningsfænomen — når fotoet er landet, står alle tre kort på `top: 417`,
`transform: none`. CLS er 0,004, så rystelsen er lille. Påstanden var forkert.

### Målt geometri bag de to domme

| | Os | Bilbasen |
|---|---|---|
| Desktop: første kort begynder | **417 px** | 524 px |
| Desktop: første pris | **675 px** | ~875 px |
| Desktop: facetter synlige uden klik | **11 grupper, 37 tal** | **0** |
| Desktop: søgefeltets bredde | **872 px** | 368 px |
| Mobil: første kort begynder | 425 px | **283 px** |
| Mobil: helt kort over folden | **nej** | **ja** |

---

## Det, jeg vil forsvare som fremragende

1. **Determinisme.** 15 identiske loads, 6 felter, 1 distinkt værdi hver. Klik og
   URL giver bit-identisk resultat.
2. **Facettallene er sande.** 37/37. Summerne stemmer med totalen på tre
   uafhængige akser.
3. **Udelukkelseslinjen.** 4/4 tal efterprøvet ved at tælle 443 kort i hånden —
   alle præcis rigtige. Den genberegner, den sammensætter to felter i én sætning,
   og den ligger i en `aria-live`-region. Baren gør intet tilsvarende.
4. **Scrollgendannelse.** 0 px afvigelse på desktop, mobil og fra side 3 af 19,
   med filtre og paginering intakt.
5. **axe 0 overtrædelser i seks konfigurationer**, inkl. med hver eneste
   filtergruppe tvangsåbnet. A11y 100 i Lighthouse. Ingen vandret scroll ved 390.
6. **Alle seks sorteringer gør, hvad de hedder** — 0 brud på monotoni.
7. **Ingen tomme harmonikaer.** Tomme grupper er `hidden`; 0-facetter er
   `disabled`. Den reelle trykflade er hele etiketten (356×32), ikke boksen (18×18).
8. **Dansk uden en eneste engelsk streng** i synlig tekst eller i aria/title/alt.
9. **Live "Vis 47 annoncer"** i mobilarkets bundbjælke.

## Det, der skal rettes, i rækkefølge

1. **Mobilydelse.** LCP 6,7 s / ydelse 74. Server det første korts foto fra vores
   eget domæne i WebP i den rigtige størrelse (spejl feedets billeder ved
   indeksering), og få enten første skærmfuld kort ind i HTML'en eller
   `<link rel="preload">` det første billede. Halvér det 213 KB
   render-blokerende stilark.
2. **Prisbåndene.** Enten gør dem additive, eller giv dem `role="radio"` +
   `aria-checked`, så det er synligt og hørbart, at kun ét bånd kan være valgt.
   Tilføj et "Under 60.000"-bånd, og gør "Under 30.000" eksklusiv i sin øvre ende.
3. **`aria-pressed` på alle 16 chips.** Uden det er filterskinnen usynlig for en
   skærmlæser, uanset at axe siger 0.
4. **Gør mobilarket til en rigtig dialog:** `role="dialog"`, `aria-modal`,
   `aria-label`, fokus ind, `body` låst, baggrunden inert, og
   `aria-expanded`/`aria-controls` på "Filtre"-knappen.
5. **Byt om på Sortér og Filtre på mobil**, flyt sorteringsforklaringen ned under
   listen, og skær de 142 px ekstra chrome ned mod barens 283.
6. **Ret A1/A2-selvmodsigelsen** (15 vs. 134 "ukendt kategori").
7. **Vask feedets titler:** 6 kort uden model, "Kubik" mod "Motorstørrelse",
   "Ny " på modelnavne, "Fb Mondial FB Mondial".
8. **Lad Tilbage fortryde ét filter** (`pushState`) — uden at genindføre
   historik-spam fra fritekstfeltet.
9. **Ét kortsprog.** 33 px prisforskydning i blandede rækker rammer den dag, den
   første rigtige annonce oprettes.
10. **Sæt karruselprikker, favorithjerte og et friskhedsmærke på kortet**, og giv
    sammenlign-ikonet en synlig betydning.

---

VINDER: findbarhed=os tillid=os hastighed=Bilbasen dansk=os
LIGHTHOUSE: ydelse=74 a11y=100 LCP=6.7s CLS=0.004
STØRSTE HUL: På mobil er LCP 6,7 s og ydelse 74 — 4,2 sekunder under gulvet — fordi det første kortfoto hotlinkes fra images.danbase.dk og først kan begynde at hente efter 213 KB render-blokerende CSS, et CDN-script og to Supabase-kald (Load Delay alene 4.733 ms); spejl feedets billeder til vores eget domæne som WebP i kortstørrelse og preload/inline det første kort.
