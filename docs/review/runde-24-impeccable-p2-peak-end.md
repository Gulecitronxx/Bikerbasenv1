# Runde 24 — P2 rettet: peak-end svækket af SEO-blokken efter CTA'en (28.09.2026)

Fortsættelse af runde 20's Impeccable-kritik. Bruger: "kør loopet igen". Sidste
åbne finding fra `runde-23-impeccable-p2-gitre.md`s resterende-tabel: P2 —
"Peak-end svækket af en SEO-blok efter den afsluttende CTA".

## Den egentlige spænding — to modstridende runder, ikke én fejl

Runde 16 flyttede browse-/SEO-blokken (dengang syv sektioner) fra at stå
**mellem** "Sådan fungerer det" og den afsluttende CTA (`.slut-cta`) til at
stå **efter** CTA'en — fordi blokken brød fortællingen "lige foer dens
sidste ord". Den rettelse var rigtig og rørt ikke her.

Men den flyttede bare problemet: nu står fire fuldvægts-sektioner (typefliser,
mærke-chips, SEO-spalter, facet-chips — type/kørekort/landsdel) EFTER CTA'en,
i samme skrift og baggrund som alt indhold OVER CTA'en. Målt i browseren: man
lander på en dyb, mørk, centreret CTA-boks (`.slut-cta-boks` — bevidst
`--color-dark`, samme farve som footeren, et ekko der varsler afslutningen,
jf. eksisterende CSS) — og så fortsætter siden bare med endnu ≈4 skærmhøjder
identisk-vægtet indhold, før footeren rent faktisk kommer. Peak-end-reglen
rammer den faktiske sidste oplevelse, ikke CTA'ens indhold — og den faktiske
sidste oplevelse var en flad chip-række ("Hovedstaden · Syddanmark ·
Midtjylland · Nordjylland"), ikke klimakset.

At flytte blokken tilbage foran CTA'en ville bare genindføre runde 16's
problem. Løsningen skal virke UDEN at flytte noget.

## Hvad blev IKKE gjort

Ikke fjernet eller omstruktureret facet-chip-blokken. Den bygges af
`scripts/build-facet-pages.js` (`facetLinksBlock()`/`skrivFacetLinks()`), og
kommentaren dér (linje ~997) dokumenterer allerede en tidligere runde med
nøjagtig denne bekymring: `index.html`-varianten fik EGNE overskrifter
("Se hele udvalget efter type" i stedet for "Søg efter type"), specifikt for
at undgå en ægte tekst-dublet med typefliserne længere oppe. At skære i
indholdet nu ville rive den løsning op igen for et problem, den ikke har.
Linkene er reelle, deterministiske SEO-sider — ikke fyld.

Ikke rørt ved `.seo-browse`, der allerede havde et roligere register
(mindre `h2`, 14px kolonnetekst) — det bekræfter, at retningen var rigtig,
den dækkede bare ikke hele halen.

## Hvad blev rettet

Ny fælles klasse `.section-eftertekst` (css/styles.css) lagt på de fire
sektioner/wrapper mellem CTA'en og footeren: typefliser, mærke-chips,
`.seo-browse`, og den ydre `<div class="container">`, der pakker
facet-chip-blokken. Alle fire deler nu samme `--color-surface-2`-baggrund
(samme token som `.trust-section` fra runde 20) og en mindre `h2`
(`clamp(17px,2vw,20px)` mod basens `clamp(22px,3vw,30px)`) — ingen huller
mellem dem, så de læses som ÉT sammenhængende "bladr videre"-bånd, ikke som
endnu en sektion efter den sidste.

**Facet-chip-blokken selv er urørt.** `.section-eftertekst`-klassen sidder
kun på den ydre `<div class="container">`, der ligger UDEN for
`facet-links:start`/`:end`-markørerne — de tre genererede `<section>`'er
indeni arver kun baggrund og overskriftsstørrelse via CSS-nedarvning.
`node scripts/build.js` kørt og bekræftet: klassen (4 forekomster) overlever
en fuld genkørsel af `build-facet-pages.js`.

## Verifikation

Browser (Playwright, af samme grund som runde 21-23): CTA'ens mørke boks →
det tonede bånd (typer → mærker → SEO-spalter → facet-chips, uden synlige
mellemrum) → et rigtigt mellemrum → den mørke footer. Tjekket lys og mørk
tema, 1280px og 390px. `js/home.js`s runde-23-fyld-chip ("Alle mærker") og
`.tile-trimmed`-logik urørt og fungerer stadig i det tonede bånd.

**Gate:** `node --check` (alle js/crawler/scripts), `npm test` 336/336
(uændret — ren markup/CSS, ingen JS rørt), `node scripts/build.js`,
`node scripts/udgiv.js` — alle grønne.

## Resterende findings fra runde 20's kritik

| Sev | Hvad | Status |
|---|---|---|
| — | `flat-type-hierarchy` på footer-h2 (14px) — sidefund fra runde 21, ikke fra kritikken | åben |

Alle P0/P1/P2-findings fra den oprindelige kritik (`.impeccable/critique/2026-09-27T19-18-18Z__index-html.md`) er nu lukket.
