# V2 Forside (Builder 1)

Mockup: Forside.png. Skærmbilleder: `docs/review/gauntlet/v2/forside-img/` (foer-*, mid-*, efter-*, *503*/*tom* for fejl/tomt lager).

## Runde 1: Critic-fund
- **P3-1 afkortede forbehold.** `.sek-note` havde `white-space:nowrap; text-overflow:ellipsis` (også `.kol-note` >=1100). Nu bryder noterne til to linjer og viser hele sætningen; pladsen (2 linjer, 4 på mobil) er reserveret på `#featured-sub`/`#types-sub`, så hydrering ikke skubber.
- **P3-3 CLS ved 503/tomt lager.** Målt med eget script (Supabase 503 / `[]`): CLS 0,358 ved 1440, 0,104 ved 768, 0,039 ved 390, alle fra `ASIDE.saelg-panel`, fordi `js/home.js` skjulte `.udvalg-hoved` og panelet sprang til fuld bredde. Overskrift og reserveret kortrække bliver nu stående; den ærlige note fylder pladsen (min-højde 290 px desktop). Efter: 0 / 0 / 0,0046 (390/768/1440).
- **Kortets visuelle kvalitet.** Foto på udvalgte kort 2:1 -> 16:10 ved >=1100 px (motorcyklen som hovedperson). 
- **Ikke gjort, med begrundelse:** rytter i hero (kun hero-*.webp findes, ingen rytterfoto; vi opfinder ikke billeder). 5-kolonne spec-række med kg: lageret har ikke vægtdata, hk/ccm vises allerede. Brandlogoer, "Sådan virker", kategorier, spacing var allerede tæt på mockuppen (se runde 2 i builder-forside.md).

## Test
`scripts/forside-v2.test.js` (ny; Orchestrator skal tilføje til npm test), `scripts/forside.test.js` grøn, smoke index 320/390/768/1024/1440 lys+mørk strikt, 0 fejl (kørt 2 gange).
