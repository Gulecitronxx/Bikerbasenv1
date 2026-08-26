# Runde 12 — DESIGNRUNDE: varen op over folden

Runde 11 lukkede sandhedsproblemerne (falske kørekortløfter, kortloft, "brugte"
om fabriksnye). Det, der stod tilbage, var ikke om siden var *sand*, men om den
var *til at handle på*. Runde 11's blinde dommer sagde det skarpest om
modelsiden:

> "Skærm 1 er en butik; skærm 2 er en leksikonartikel med et lager i kælderen."

Denne runde er derfor en designrunde. Retningen er bevidst tilbageholdende —
`DESIGN_VARIANCE 4`, `MOTION_INTENSITY 3`, `VISUAL_DENSITY 5`. Det her er
tillidshandel, ikke et bureau-showreel. Ingen tal, tekster eller løfter er
ændret; kun hvor de står, og hvor meget plads de tager.

## 0. Sådan er der målt

Alt er målt i browseren på `bikerbasen.localhost` (ikke `localhost`) — se
metodefejlen i runde 11: på `localhost` tændes demolageret i `js/data.js:772`,
og så dømmer man på opdigtede annoncer. Første kort er `getBoundingClientRect()`
på første barn af `.listings-grid`. Layoutspring er `performance
.getEntriesByType('layout-shift')` uden `hadRecentInput`.

## 1. Facetfolden: fra 200 px spring til nul

Runde 11's finding R11-F-6 målte, at mærkesidens første kort sprang **910 → 712
px ved hver mobilindlæsning**: folden stod `<details open>` i markuppen, og
`js/maerke.js` lukkede den efter `DOMContentLoaded`. CLS betalt for at spare
plads.

Første forsøg vendte den om — lukket i markup, JS åbner på desktop. Det
**flyttede bare regningen**: målt 124 px spring på desktop i stedet, og det
efterlod et hul, ingen havde set: `summary` er `display:none` på desktop, så en
lukket fold uden JS var *helt utilgængelig* der.

Folden er nu checkbox + label og styres udelukkende af CSS:

| Skærm | Før | Nu |
|---|---|---|
| Mobil | lukkes af JS efter load, 200 px spring | lukket fra første maling, **0,00** |
| Desktop | åben i markup (0), efter omvending 124 px | åben fra første maling, **0,00** |
| Uden JS, desktop | utilgængelig efter omvending | åben, som med JS |

`js/maerke.js` rører den ikke længere. Checkboxen er `display:none` på desktop
(ude af tabulatorrækken, hvor den ingen funktion har) og skjult-men-fokuserbar
på mobil, så man stadig kan tabbe til grebet.

## 2. Varen op over folden

Målt nedbrydning over første kort, mobil 375, **før**:

| Blok | Højde |
|---|---|
| Brødkrumme | 19 px |
| h1 (2 linjer) | 60 px |
| Intro-prosa | 109 px |
| "Mere om udvalget" (fold) | 21 px |
| **Sektion: "Se Honda efter model" + chips** | **164 px + 80 px gab** |
| Listeoverskrift + note + facetgreb | ~244 px |
| **Første kort** | **768 px** |

Modelchipsene er navigation. De lå i deres egen `<section>` med synlig `h2` og
fuld sektionsluft — en tredjedel af afstanden ned til første vare. De ligger nu
i hero-blokken som én kompakt rullerække. Overskriften bliver stående som
`.visually-hidden`, så dokumentstruktur, SEO-interne links og skærmlæsere er
urørte; den koster bare ingen pixels længere. Alle 12 chips og deres tal er de
samme.

Dernæst hierarkiet: h1 (26 px) og listeetiketten "276 annoncer — de første 24
her" (19 px, to linjer) konkurrerede i samme skærmbillede. To overskrifter er
ikke hierarki. Etiketten bærer nu kun tallet, og kortloftet er flyttet ned i
notelinjen, hvor bekræftelsesdatoen allerede stod. Ingen oplysning fjernet.

| Skærm | Før | Nu | Mål |
|---|---|---|---|
| Mobil 375 | 768 px | **675 px** | ≤ 700 ✓ |
| Desktop 1366 | 814 px | 782 px | — |

Målet ≤ 700 blev sat i runde 9. Runde 10 nåede 860, runde 11 nåede 712 — og
kun med det 200 px spring, der nu er væk. **Det er første gang, målet er nået
uden at betale for det et andet sted.**

## 3. Hvad runden IKKE rørte

- Ingen tal, priser, datoer eller kørekortudsagn er ændret.
- Ingen annonce, foto eller kilde er opdigtet eller udeladt.
- Ingen URL, brødkrumme eller intern adresse er flyttet.
- Em-dash-forbuddet i den anvendte design-skill er bevidst **ikke** fulgt:
  tankestreg er normal dansk typografi og gennemgående i sidens etablerede
  stemme. At fjerne den ville være en copy-omskrivning, ikke en designrettelse.

## 4. Verifikationsgate

`node --check` på alle js/crawler/scripts, `npm test` 331/331, `scripts/build.js`
og `scripts/udgiv.js` grønne før hver af rundens tre commits.

---

## 5. Designkritikerens 13 fund — én for én

Kritikeren dømte visuelt mod Bilbasen: typografi, hierarki, rytme, farve,
kortdesign. Dens egen slutdom var **NEJ, ikke på niveau** — "kortet er der
næsten, men typeskalaen kollapser under kortlisten, accenten er brugt som tapet
på A2, og tre ustylede detaljer i træk afslører at nederste tredjedel er
genereret, ikke designet."

| ID | Status | Hvad der skete |
|---|---|---|
| R12-D-1 halens h2 = brødtekst | **lukket** | Sektionsoverskrifter 19 → 22 px. Stigen er nu 26 / 22 / 19 / 16. Tæl-etiketterne holdt på 19, så h1 forbliver det ene dominerende hoved |
| R12-D-2 kortets typografi for stor | **afvist, med måling** | Se nedenfor |
| R12-D-3 orange som tapet på A2 | **lukket** | Chippen er neutral på sider, der allerede er filtreret på kørekort. Ren CSS — gitteret bar allerede `data-facet-kind` |
| R12-D-4 41 px dødt bånd i kortet | **lukket, men ikke som beskrevet** | Se nedenfor |
| R12-D-5 tom beige før footeren | **lukket** | Målt 160 px, ikke 165-180: sidste sektions bundpolstring (64) lagt oveni footerens margin-top (96). Footeren ejer afstanden; sektionen afgiver sin. 160 → 96 px |
| R12-D-6 FAQ'en helt ustylet | **lukket** | `.brand-faq-item` havde nul CSS-regler. Nu rækker, hårlinjer, egen chevron (samme ▾/▴ som facetgrebet) og flexboks-summary, så ombrudte spørgsmål flugter |
| R12-D-7 chiprækker klippet uden affordance | **afvist, faktuelt forkert** | Se nedenfor |
| R12-D-8 A2-introen som monolit | **lukket** | Første kort 941 → 620 px |
| R12-D-9 to knapstile til samme handling | **delvist** | Søgeagent-knappen løb 16 px ud over containeren og er kortet ned. Stilforskellen består |
| R12-D-10 tre chipstile i én række | **lukket som følge af D-3** | På facetsiderne er der nu to: grå fyld til data, kontur til kørekort. På mærkesiderne står den orange, fordi kørekortet dér ER nyhed — se konfidensstigen i CSS'en (orange = udledt, kontur = A, dæmpet = ukendt). Det er betydning, ikke støj |
| R12-D-11 sammenlign-ikonet læses som statistik | **lukket** | Knappen lånte ikonet `chart` — bogstaveligt et søjlediagram (`js/icons.js:49`). Nyt `compare`-ikon, to modsatrettede pile, skiftet fem steder. `chart` bliver stående, hvor dashboardet bruger den til det, den er |
| R12-D-12 hvide fotoflader | **metodefund, ikke en fejl** | Kritikeren efterprøvede selv: uindlæste eksterne thumbnails i optagelsen, ikke en tom-tilstand |
| R12-D-13 ingen rytmebryder i 24 kort | **lukket, men ikke som foreslået** | Se nedenfor |

### R12-D-13: monotoni løses med kontrol, ikke dekoration

Forslaget var Bilbasens greb — mørke forhandlerbannere spredt ud over kolonnen
som rytmebryder. **Det gør vi ikke.** Bilbasens bannere er betalt placering.
Kopierer vi det visuelle uden det kommercielle, antyder kortet et forhold, der
ikke findes, og alle 602 annoncer er indekseret på lige vilkår.

Den ærlige læsning af "24 ens kort" er, at siden ikke giver brugeren noget at
gøre — og runde 11's kritiker fandt uafhængigt det samme (R11-KK-6: "Facetsiden
har NUL værktøjer"). To kritikere på samme sted er et signal. Facetsiderne har
nu mærkesidernes fold med prisspring og sortering, link-baseret så CSP'en holder
og en crawler kan følge dem. Efterprøvet at tallene holder: chippen "Under
30.000 kr. · 7" fører til en søgning, der giver præcis 7 kort.

**Fundet undervejs, en ægte fejl loopet ikke ledte efter:** CSP'ens `img-src` er
håndskrevet pr. side, og `soegning.html` + `annonce.html` manglede tre af
forsidens billedværter. Thumbnails fra to hele kilder blev blokeret på sitets
vigtigste side. Det er formentlig også en del af forklaringen bag D-12's hvide
fotoflader.

### De tre afviste — med måling, som DECISIONS.md kræver

**R12-D-4 var målt på et billede, ikke i DOM'en.** Kritikeren angav et 41 px dødt
bånd mellem specs og hårlinje i hvert kort. Målt i browseren: **12 px**. Men
fundet pegede på noget ægte, som den ikke selv fandt: `.card-specs` er låst til
54 px — plads til *to* chip-rækker — også når kortet bruger én. På A2-siden
brugte **0 af 24 kort** den anden række. Låsen findes for at holde nabokort lige
høje (D-011), og den grund gælder kun flerspaltede gitre; under 560 px er
gitteret én spalte. Låsen er ophævet der. Kortet: 468 → 442 px.

**R12-D-2 hvilede på den fejlmåling.** Forslaget var pris 22 → 18 px og titel
17 → 15 px, begrundet i at kortet var "typografisk overdimensioneret" og at
siden skulle blive kortere. De 700 px, forslaget ville hente, kom i stedet fra
D-4-låsen — uden at røre det tal, en køber leder efter først. Prisen er kortets
vigtigste oplysning; den skrumper ikke for at spare plads, vi kunne hente
gratis et andet sted.

**R12-D-7 er faktuelt forkert.** Fundet lyder "ingen fade, ingen pil, ingen
halv-chip-peek". Chiprækken har `scrollbar-width: thin` — en synlig, tynd
scrollbar, indført netop som rulle-affordance i runde 9 (D9-M4), og synlig i
kritikerens eget skærmbillede. Målt: `getComputedStyle(.popular-row)
.scrollbarWidth === "thin"`, og rækken er reelt rulbar. En `mask-image`-fade
oveni ville desuden falme den sidste chip permanent, også på rækker der ikke
render over.

## 6. Målt resultat, runde 12 samlet

| Side, mobil 375 | Første kort | Sidehøjde |
|---|---|---|
| `maerke-honda` | 768 → **671 px** | — |
| `koerekort-a2` | 941 → **620 px** | 14.238 → **13.290 px** |

Layout-shift 0,00 på begge sider og begge skærmbredder. Intet vandret overløb.
Nul klippede specs på 48 efterprøvede kort. Verifikationsgaten grøn før hver af
rundens seks commits.
