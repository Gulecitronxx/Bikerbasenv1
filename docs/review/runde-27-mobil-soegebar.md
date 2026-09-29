# Runde 27 — mobil: søgefelt og kildelinje klippede (29.09.2026)

Bruger: "kør loopet igen". Runde 26 lovede mobil-filterskuffen og tomme
tilstande; kigget på søgesiden på 390 px afslørede to klipninger, før skuffen
blev åbnet. Begge målt på 320, 360, 375 og 390 px, lyst tema.

## 1. Søgefeltets placeholder klippede til "Mærke/n"

`#filter-q` er 160 px bredt på 390 (130 på 360). Padding på 46 px i hver side
lod 68 px til placeholderen "Mærke/model", der er 101 px. Runde 7 forkortede
allerede teksten fra "Mærke eller model" (≈165 px), men målte på et 150 px felt
og nåede ikke i mål.

Rettet i to skridt, fordi ét ikke rækker til 360:

- `#filter-q:placeholder-shown` (kun på mobil) får 42 px til ikonet og 12 px
  til højre i stedet for 46/46. Højre side er reserveret til ryd-knappen, som
  først findes, når der står noget i feltet. Det giver 103 px på 390.
- Fra 380 px og ned bliver "Gem" en ikonknap: `#save-search-kort` skjules, og
  knappen får `min-width:44px`. Label og `title` står, så det tilgængelige
  navn stadig er "Gem søgning". Feltet vinder ~36 px: 108 px plads på 360.

## 2. Kildelinjen: (i)-knappen var klippet væk

"654 annoncer · 52 annoncer på Bikerbasen · fra 4 kilder (i)" er 269 px.
`.results-mix` er `nowrap` + `overflow:hidden` (bevidst, runde 6, for at holde
højden fast ved første maling) og har 220 px på 360, 235 på 375 og 250 på 390.
Målt: linjen passede på **ingen** af dem. På 360 og 375 var (i) — den knap, der
forklarer, hvad "indekseret" betyder — helt uden for synsfeltet; på 390 sad den
halvt klippet. Runde 6's design forudsatte en kortere tekst; da der kom egne
annoncer (52), voksede linjen.

Rettet uden at bryde "én linje":

- Ordet "annoncer" i egne-leddet står i `.mix-ord`, skjult for øjet, men ikke
  for skærmlæsere (samme clip-mønster som `#save-search-label`). Det er
  overflødigt lige efter "654 annoncer": "52 på Bikerbasen".
- Halen med (i) er `flex:none`; skulle linjen stadig ikke passe, er det
  egne-leddet, der får ellipse. Målt på 320: ellipse på egne-leddet, (i) synlig.

Teksten pakkes i `.mix-tekst`, ét flex-element. Uden det ville `.mix-part`s
`gap:6px` have lagt 6 px om hvert ord i stedet for et mellemrum.

## Målt efter

| bredde | placeholder | kildelinje | (i) inde i viewport | dok.-overflow |
|---|---|---|---|---|
| 390 | hel | hel | ja | 0 |
| 375 | – | hel | ja | 0 |
| 360 | hel (108 px til 101 px) | hel | ja | 0 |
| 320 | ellipse | ellipse på egne-led | ja | 0 |

## Ikke gjort

Ingen test: begge rettelser er CSS + en tekstpakning, og repoets tests kan ikke
måle layout (ingen browser i `npm test`). Målingerne ovenfor er beviset.
Mobil-filterskuffen og tomme tilstande venter til næste runde.

## Aggregator-reglerne

Ingen berørt. Kun visning på søgesiden.

## Verifikation

**Gate:** `node --check`, `npm test` 344/344, `node scripts/build.js`,
`node scripts/udgiv.js` — alle grønne.
