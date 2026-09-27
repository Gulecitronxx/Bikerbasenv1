# Runde 20 — Impeccable-kritik af forsiden, P0 rettet (27.09.2026)

Brugerens ordre: "kør et loop med at fikse hele siden, så den er ligeså nice
som bilbasen og moderne markedspladser. Start på forsiden." Kørt via
`impeccable critique` (dual-agent: en design-gennemgang + en detektor/
browser-evidens-agent, isoleret fra hinanden) fremfor endnu en bilbasen-
specifik sammenligningsrunde — runde 18-19 havde allerede vist, at den
metode var opbrugt for kode-alene gevinster.

**Fuld rapport:** `.impeccable/critique/2026-09-27T19-18-18Z__index-html.md`
(29/40, "Good" — Design Health Score, alle 10 Nielsen-heuristikker, 5
prioriterede findings, persona-red-flags).

## Findings (opsummeret)

| Sev | Hvad | Status |
|---|---|---|
| P0 | Fire ens sektioner (problem/løsning/tryghed/sådan) med samme skabelon druknede regelforklaringen i proza | **rettet** denne runde |
| P1 | Forhandler-vandmærker dækker 5/8 kort i "Motorcykler til salg" | åben — retning valgt (Bikerbasens egen "kilde:"-chip), ikke implementeret |
| P1 | "Mulig A2" kan læses som bekræftet ved et skim, ingen forklaring på siden | åben |
| P2 | Ubalancerede sidste rækker i type- og mærke-gitrene | åben |
| P2 | Peak-end svækket af en SEO-blok efter den afsluttende CTA | åben |

## P0 — hvad der blev rettet

`index.html` (problem-grid): "A2 er ikke en ccm-grænse" har nu sit eget kort
(`.problem-item-regel`) med tre glanceable stat-piller (35 kW · 0,2 kW/kg ·
ikke afledt af kraftigere model) i stedet for kun proza. De tre andre punkter
(`.problem-item-minor`) er nu en tættere liste med border-adskillelse, ikke
tre kort mere af samme størrelse — direkte imod skillets eget forbud mod
"same-size cards of icon plus heading plus text as the page structure".

`css/styles.css`: ny `.regel-stats`/`.regel-stat`-komponent (genbruger
`--color-primary-tint`/`--radius-pill`, samme visuelle sprog som
`.loesning-nr` — ingen ny farve, ingen ny skrifttype, jf. runde 16's
begrænsning "ingen ny palet"). Løsnings-sekvensens tre numre har nu en
forbindelseslinje mellem sig (`::after` på `.loesning-nr`, kun ≥860px) —
gør rækkefølgen synlig, ikke kun tekstlig. `.trust-section` fik samme
`--color-surface-2`-baggrund som `.problem-section`, så rytmen bliver en
rigtig A-B-A-B-veksling i stedet for ét skift efterfulgt af tre flade
sektioner.

Verificeret i browser (lys + mørk, mobil 390px + desktop 1440px via
Playwright — denne sessions indbyggede browser-rude rendrede desktop-bredde
forkert, se note i `.impeccable/critique/`-agentens rapport) før commit.

**Gate:** `node --check` (alle js/crawler/scripts), `npm test` 333/333,
`node scripts/build.js`, `node scripts/udgiv.js` — alle grønne.

## Ikke gjort denne runde, med vilje

Brugeren valgte P0 som første og eneste skridt i denne omgang. Vandmærke-
fixets retning ("kilde:"-chip, fast position) blev besluttet på forhånd,
men ikke implementeret — ligger klar til en senere runde.
