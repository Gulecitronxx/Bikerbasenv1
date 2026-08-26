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
