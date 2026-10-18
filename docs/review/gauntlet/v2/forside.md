# V2 Forside (Builder 1)

Mockup: Forside.png. Skærmbilleder: `docs/review/gauntlet/v2/forside-img/` (foer-*, mid-*, efter-*, *503*/*tom* for fejl/tomt lager).

## Runde 1: Critic-fund
- **P3-1 afkortede forbehold.** `.sek-note` havde `white-space:nowrap; text-overflow:ellipsis` (også `.kol-note` >=1100). Nu bryder noterne til to linjer og viser hele sætningen; pladsen (2 linjer, 4 på mobil) er reserveret på `#featured-sub`/`#types-sub`, så hydrering ikke skubber.
- **P3-3 CLS ved 503/tomt lager.** Målt med eget script (Supabase 503 / `[]`): CLS 0,358 ved 1440, 0,104 ved 768, 0,039 ved 390, alle fra `ASIDE.saelg-panel`, fordi `js/home.js` skjulte `.udvalg-hoved` og panelet sprang til fuld bredde. Overskrift og reserveret kortrække bliver nu stående; den ærlige note fylder pladsen (min-højde 290 px desktop). Efter: 0 / 0 / 0,0046 (390/768/1440).
- **Kortets visuelle kvalitet.** Foto på udvalgte kort 2:1 -> 16:10 ved >=1100 px (motorcyklen som hovedperson). 
- **Ikke gjort, med begrundelse:** rytter i hero (kun hero-*.webp findes, ingen rytterfoto; vi opfinder ikke billeder). 5-kolonne spec-række med kg: lageret har ikke vægtdata, hk/ccm vises allerede. Brandlogoer, "Sådan virker", kategorier, spacing var allerede tæt på mockuppen (se runde 2 i builder-forside.md).

## Test
`scripts/forside-v2.test.js` (ny; Orchestrator skal tilføje til npm test), `scripts/forside.test.js` grøn, smoke index 320/390/768/1024/1440 lys+mørk strikt, 0 fejl (kørt 2 gange).

## Efter merge med gauntlet/master: W14-tests (valg a: CSS tilbage inden for testgrænserne)
Måling af Forside.png (1672x941, skaleret til 1440: faktor 0,861): header ca. 35 px, hero (inkl. header) slutter ca. 245 px = 27 % af et 900 px viewport, mod 366 med min iteration-2 hero (312 px) og 315 med den oprindelige. Typefliser ca. 66 px høje, overskrift ca. 40 px (min iteration 2: 54 px). Mockuppen er altså LAVERE end både testgrænsen og min hero; iteration 2's højere hero gik mod billedet og er derfor rullet tilbage til 262 px / 36-41 px overskrift. Sådan virker er i billedet et let tonet bånd, så hvidt kort er rullet tilbage til tonet bånd med ikon-cirkler >= 56 px. Typefliser tilbage til 104 px (grænse 110). Kortet strammet (padding/gap/fod) til 268,6 px (grænse 270) i stedet for højere foto (2:1 igen). Bevaret: lysere hero-scrim og tekstskygge, større søgekort-felter, kontur-tillidsikoner 40 px, større overskrifter/fliseskrift, kort- og kolonneskygge, hover-løft, hele forbeholdsnoter og CLS-fix. Ingen assertions ændret. Grøn: js/w14-forside.test.js (14/14), scripts/forside.test.js, scripts/forside-v2.test.js, js/w13-integration.test.js, js/visuel-css.test.js; smoke index 0 fejl x2; CLS tomt/503 <= 0,004.
