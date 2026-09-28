# Runde 22 — P1 rettet: badge-utydelighed (28.09.2026)

Fortsættelse af runde 20's kritik. Bruger: "kør loopet igen". Næste finding:
P1 — "Mulig A2" kan læses som bekræftet ved et skim; den eneste forklaring
lå i `title`-attributten (kun synlig ved hover — usynlig på mobil) og en
`.visually-hidden`-tekst (kun for skærmlæser).

## Hvad blev IKKE ændret

`koerekortMaerkat()` i `js/components.js` og dens `forklaring`-tekster er
allerede præcise og efterprøvede — de blev ikke omskrevet. Runde 12's
(R12-D-3) beslutning om fill/outline på `[data-facet-kind="koerekort"]`
blev heller ikke rørt. Reglen "Accentfarven er et udsagn" fra runde 5/12
står ved magt.

## Hvad blev rettet

Et `Icon.info`-ikon (eksisterende SVG fra `js/icons.js`, ikke et nyt
unicode-tegn) står nu synligt inde i selve "Mulig A1"/"Mulig A2"-pillen —
kun når `kk.kode` er sat og ikke er `'A'`. Den bekræftede "Kørekort A"
(ingen øvre grænse, derfor en reel udelukkelse) får ikke ikonet. Reglen
håndhæves ét sted (JS), ikke gentaget i CSS.

`css/styles.css`: ikon-størrelse (`.card-external .card-koerekort svg`,
12px) og `display:inline-flex` på pillen, så ikon og tekst linjer op.

`js/eksternt-kort.test.js`: ny test låser, at "Mulig A2" (300 ccm/28 hk)
får `<svg>` i pillen, mens standardfixturens "Kørekort A" (150 hk) ikke gør.

## Verifikation

Browser (Playwright): `soegning.html?koerekort=A2` — "ⓘ Mulig A2" synlig og
læsbar uden hover, lys + mørk tema.

**Gate:** `node --check`, `npm test` 336/336 (335 + 1 ny), build, udgiv —
alle grønne.

## Resterende findings fra runde 20's kritik

| Sev | Hvad | Status |
|---|---|---|
| P2 | Ubalancerede sidste rækker i type- og mærke-gitrene | åben |
| P2 | Peak-end svækket af en SEO-blok efter den afsluttende CTA | åben |
| — | `flat-type-hierarchy` på footer-h2 (14px) — sidefund fra runde 21, ikke fra kritikken | åben |
