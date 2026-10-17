# Builder logo-assets — Logo Gauntlet

Branch `gauntlet/logo-assets` (fra 70badc24). Ejer: `img/brands/**`, `scripts/logo-vektoriser*.js`, `scripts/w13-logo-assets.test.js`, denne fil.
Rører ikke `js/`, `css/`, generatorer, `index.html`, `package.json`.

## Acceptkriterier (målbare, skrevet før implementering)

| # | Krav | Måling |
|---|---|---|
| A1 | 20 hoved-SVG'er `img/brands/<slug>.svg` (yamaha, honda, kawasaki, bmw, ktm, ducati, suzuki, triumph, harley-davidson, royal-enfield, aprilia, benelli, cfmoto, husqvarna, indian, moto-guzzi, mv-agusta, gasgas, zero, piaggio) | filer findes |
| A2 | Hver SVG (også varianter) er under 6144 byte | `fs.statSync` |
| A3 | Præcis ét `<path>` med `fill="currentColor"` og `fill-rule="evenodd"`, ét `<title>` med mærkenavn, rod har `viewBox`, ingen `width`/`height` på roden | parse + regex |
| A4 | Ingen `script`, `on*=`, `href`/`xlink:href`, `style`, `foreignObject`, `image`, `metadata`, kommentarer, ingen slogans | regex |
| A5 | Gyldigt XML (egen mini-parser i test), viewBox-bredde og -højde > 0, tæt beskåret: polstring 2-4 % af længste side | beregnet |
| A6 | IoU mellem rasteriseret SVG (Chromium, hvid baggrund, 1254 px lærred, 1 enhed = 1 kildepixel) og kilde-PNG'ens alfa-maske (>= 128), efter bevidst fjernede dele er maskeret ud: >= 0,97 for alle 20 | `scripts/logo-vektoriser-alle.js --maal` |
| A7 | Blød IoU (sum min / sum max af dækning) ved 64 px højde >= 0,93 og ved 24 px højde >= 0,85; måles og rapporteres pr. mærke | samme |
| A8 | ®/™-tegn og stray streger er fjernet (Harley-Davidson, Indian, Zero; Indian y≈950); komponenter under areal-tærsklen er fjernet; huller (O, A, R, D, B) bevares | komponentliste i rapport + visuel kontrol |
| A9 | Varianter (`-emblem`, `-ordmaerke`) findes kun hvor komponenter kan skilles rent; union af varianternes maske ≈ lockup | rapporteres |
| A10 | `img/brands/assets.json` med felterne: fil, varianter, forhold, stoerrelse_bytes, sha256, kildefil, proces, licens, autenticitet, kraever_officiel_fil, godkendt (alle false) | test |
| A11 | Harley-Davidson, Benelli, Indian: `kraever_officiel_fil: true`; alle: `autenticitet` ∈ ukendt/tvivlsom/ubrugelig | test |
| A12 | Deterministisk: to kørsler giver byte-identiske filer | test |
| A13 | `scripts/w13-logo-assets.test.js` grøn (IoU-test skippes uden Chromium/kildefiler), `node --check` på nye scripts, `npm test` uændret grøn | kørsel |
| A14 | Kontaktark (PNG, uden for repoet i `%TEMP%\logo-assets`): 5x4 lys + mørk + 24 px-ark | filer findes |
| A15 | Ingen nye npm-afhængigheder, ingen filer uden for ejerlisten ændret | `git diff --stat` |

Noter: Kildefilerne (1254x1254 RGBA, gennemsigtig) ligger uden for repoet og læses kun. Autenticitet kan ikke måles mod en facitfil (ingen downloads) — vurderes ærligt pr. mærke i afsnittet "Dom" nedenfor.
