# Runde 23 — P2 rettet: ubalancerede sidste rækker i type- og mærke-gitrene (28.09.2026)

Fortsættelse af runde 20's Impeccable-kritik. Bruger: "kør loopet igen". Næste
finding fra `runde-22-impeccable-p1-badge.md`s resterende-tabel: P2 —
"Ubalancerede sidste rækker i type- og mærke-gitrene".

## Målt først, ikke gættet

`.brand-cloud` er `repeat(auto-fill, minmax(…))` — 2 spalter på mobil, 4 fra
640px, 5 fra 1024px (målt: containeren topper ud ved 1176px, så 1024–1920px
giver alle 5 spalter). 12 kuraterede mærker (`tegnMaerker()`, "de 12 største
med mindst 2 annoncer") går kun lige op ved 2, 3, 4, 6 og 12 spalter — **ikke**
5. Målt i browseren (Playwright, 1440×900): sidste række stod med 2 chips og
tre tomme gitterfelter, på alle bredder ≥1024px — ikke et sjældent
datauheld, men en strukturel uoverensstemmelse mellem et fast antal (12) og
et variabelt spalteantal, reproducerbar hver gang.

`#category-tiles` (typefliserne) er derimod et fast `repeat(4,1fr)` fra
640px — ikke auto-fill. Med de nuværende otte typer og dagens lager er alle
otte altid synlige (to hele rækker, `8 % 4 === 0`), så findingen er her ikke
reproducerbar i dag. Den bliver det, hvis én af de otte typer falder til 0
annoncer (D5-F3 skjuler den flise) og resten ikke går op i fire — fx 7, 6
eller 5 synlige.

## Hvad blev IKKE gjort

Ikke ændret spaltebredderne (`minmax(205px,1fr)` ved ≥1200px). Den er sat med
vilje i runde 8 (D8-F4), så "Harley-Da…" ikke ombrydes med ellipse ved 1366px
— at gøre spalterne smallere for at ramme et andet spaltetal ville gen-åbne
den lukkede fejl.

Ikke skåret i de 12 kuraterede mærker for at ramme et rundt tal. Comment i
`tegnMaerker()` (runde 5, D5-F2) er eksplicit: det er "de 12 største" — at
fjerne to reelle, populære mærker (nr. 11-12) for gitterets skyld ville
skjule rigtigt indhold for et layout-problem, der har en billigere løsning.

## Hvad blev rettet

**`js/home.js` — `balancerMaerkeraekke()`:** efter `tegnMaerker()` har tegnet
chipsene, måles `.brand-cloud`s faktiske `gridTemplateColumns` (samme greb
som `tegnFeatured`/`renderNewest` allerede bruger til at måle frem for at
gætte breakpoints). Går chip-antallet ikke op i spalteantallet, tilføjes én
chip mere — "Alle mærker" → `maerker.html`, den samme destination som
sektionshovedets link — der spænder (`grid-column: span N`) præcis det
resterende antal spalter. Ingen tomme felter, intet kuraret mærke fjernet.
Kører igen på `resize` (rAF-dæmpet, samme mønster som `tegnFeatured`s
`_featuredRAF`), fordi spalteantallet rent faktisk skifter ved almindelige
bredder (2/4/5).

**`js/home.js` — `balancerFliseraekke()`:** samme måle-først-greb for
`#category-tiles`, men modsat løsning: der er ingen naturlig "se alle
typer"-destination at fylde med, så i stedet for at tilføje noget skjules
den mindst populære af de *resterende* fliser (allerede sorteret efter antal
annoncer, D5-F3) ned til nærmeste hele række — samme afvejning som
`tegnFeatured` (D8-F1) allerede gør for "Udvalgte": vis hele rækker, den
droppede type findes stadig via fuld søgning. Rører intet, når otte fliser
går op i fire (dagens tilstand); defensiv kode for en fremtidig
lagerændring, ikke en synlig ændring i dag.

**`css/styles.css`:**
- `.tile-trimmed{ display:none; }` — sat af `balancerFliseraekke()`.
- `.brand-chip-fyld` — stiplet kant (samme sprog som `.newest-cta`, der
  allerede løser præcis dette for "Nyeste annoncer": en fyld-chip skal læses
  som en gennemgang, ikke som et 13. mærke), ellers samme `.brand-chip`-form.

## Verifikation

Browser (Playwright, da denne sessions egen browser-rude ikke rendrer
brugerdefinerede desktop-bredder korrekt — kendt fra tidligere runder):

- 1440×900 (5 spalter): 12 mærker + "Alle mærker"-chip spændt over 3 spalter,
  sidste række fyldt kant-til-kant. Lys og mørk tema.
- 768×900 (4 spalter): 12 mærker, `12 % 4 === 0`, ingen fyld-chip tilføjet.
- 390×844 (2 spalter): 12 mærker, `12 % 2 === 0`, ingen fyld-chip tilføjet.
- `#category-tiles`: 0 `.tile-trimmed` på alle tre bredder — otte fliser går
  op i fire, ingen ændring i dagens visning (bekræftet, ikke kun antaget).

**Gate:** `node --check` (alle js/crawler/scripts), `npm test` 336/336
(uændret — `js/home.js` er ikke på testlisten i `package.json`, ligesom
`tegnFeatured`/`renderNewest` heller ikke er det; verificeret i browseren i
stedet, som runde 21/22 også gjorde), `node scripts/build.js`,
`node scripts/udgiv.js` — alle grønne.

## Resterende findings fra runde 20's kritik

| Sev | Hvad | Status |
|---|---|---|
| P2 | Peak-end svækket af en SEO-blok efter den afsluttende CTA | åben |
| — | `flat-type-hierarchy` på footer-h2 (14px) — sidefund fra runde 21, ikke fra kritikken | åben |
