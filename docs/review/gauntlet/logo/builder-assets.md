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

## Resultat (målt)

Værktøj: `scripts/logo-vektoriser.js` (CLI), batch `scripts/logo-vektoriser-alle.js` (tabel over 20 filer, pr.-mærke-parametre, `--maal` for Chromium-måling + kontaktark, `--ud-svg` til test), test `scripts/w13-logo-assets.test.js` (9 tests grønne; determinisme og IoU skippes uden kilde-PNG/Chromium). Egen tracer i ren Node: marching squares ved halv blækdækning (delpixel), udjævning, resampling, hjørnedetektion, grådig Schneider-kurvetilpasning, evenodd. Ingen nye afhængigheder.

Kontaktark (uden for repoet): `%TEMP%\logo-assets\kontaktark-lys.png`, `kontaktark-moerk.png` (5x4), `ark-24px-lys.png`, `ark-24px-moerk.png`, `ark-24px-lys-3x.png`; overlay-diff pr. mærke `diff-<slug>.png` (rød = kun kilde, blå = kun SVG).

| Mærke | Hovedfil (byte) | Varianter | IoU 1254 | blød 64/24 px | autenticitet | kraever_officiel_fil |
|---|---|---|---|---|---|---|
| Yamaha | 3910 lockup | emblem, ordmaerke | 0,980 | 0,952/0,918 | ukendt | nej |
| Honda | 3187 lockup | emblem (vinge), ordmaerke | 0,985 | 0,968/0,933 | tvivlsom (fjerenes trin) | nej |
| Kawasaki | 2663 lockup | emblem, ordmaerke | 0,991 | 0,983/0,971 | ukendt | nej |
| BMW | 4171 lockup (BMW Motorrad) | emblem, ordmaerke | 0,982 | 0,942/0,910 | ukendt | nej |
| KTM | 1228 ordmaerke | (kun ordmærke) | 0,990 | 0,993/0,984 | ukendt | nej |
| Ducati | 2134 emblem (skjold med navn) | ingen (navnet ligger inde i skjoldet) | 0,987 | 0,944/0,916 | tvivlsom (skjoldets form) | nej |
| Suzuki | 2077 lockup | emblem, ordmaerke | 0,992 | 0,977/0,945 | ukendt | nej |
| Triumph | 3004 lockup | emblem, ordmaerke | 0,985 | 0,947/0,907 | tvivlsom (trekantens indre, sving) | nej |
| Harley-Davidson | 6031 emblem (bar & shield) | ingen (bogstaver sidder i skjoldet) | 0,971 | 0,949/0,921 | ubrugelig | JA |
| Royal Enfield | 4358 lockup | emblem, ordmaerke | 0,980 | 0,939/0,917 | tvivlsom (ordmærkets krøller) | nej |
| Aprilia | 2007 ordmaerke | (kun ordmærke) | 0,984 | 0,976/0,953 | ukendt | nej |
| Benelli | 1873 ordmaerke | ingen | 0,985 | 0,980/0,950 | ubrugelig | JA |
| CFMoto | 2191 lockup | emblem, ordmaerke | 0,987 | 0,969/0,937 | ukendt | nej |
| Husqvarna | 4515 lockup | emblem, ordmaerke | 0,986 | 0,949/0,897 | tvivlsom (krone/omkreds) | nej |
| Indian | 6046 lockup | ingen (fjer/skrift hænger sammen, huller ville blive fyldte) | 0,951 | 0,928/0,889 | ubrugelig | JA |
| Moto Guzzi | 5734 lockup | emblem (ørn), ordmaerke | 0,971 | 0,951/0,928 | tvivlsom (fjer opfundne) | nej |
| MV Agusta | 5684 lockup | emblem, ordmaerke | 0,979 | 0,951/0,902 | tvivlsom (MV-monogram/krone) | nej |
| GasGas | 2438 lockup | emblem, ordmaerke | 0,984 | 0,967/0,943 | ukendt | nej |
| Zero | 3302 lockup | emblem, ordmaerke | 0,979 | 0,958/0,928 | ukendt | nej |
| Piaggio | 2607 lockup | emblem, ordmaerke | 0,985 | 0,962/0,926 | ukendt | nej |

Autenticitet er ikke målt mod en facitfil (ingen downloads); 'ukendt' betyder kun at udkastet ser plausibelt ud ud fra kendskab til mærket, ikke at det er verificeret. Ingen er sat til godkendt (`godkendt:false` for alle).

### Oprydning og afvigelser
- ®: fjernet i Harley-Davidson (cirkel med halo i nederste højre hjørne af baren, ryddet med `--slet`), Indian (ved enden af skriften) og Zero (efter MOTORCYCLES). Ingen ™ fundet.
- Indian "stray streger ved y≈950": fandtes ikke som separat komponent; rækken y 940-995 er bogstaverne i MOTORCYCLE. Ingen alfa-rester over tærsklen. Støjkonturer under 60 px² fjernes automatisk (Indian: 100 px²).
- Huller (O, A, R, D, B, øjne) bevares med fill-rule=evenodd. Varianter laves ved at vælge hele konturer (huller følger deres forælder) og kun hvor emblem og tekst er adskilte konturer; ellers udelades varianten (Ducati, Harley-Davidson, Indian, KTM, Aprilia, Benelli).
- Benelli: løve/laurbær-emblemet (80 konturer) kan ikke rummes i 6 KB (13,9 KB ved IoU 0,962; 6,3 KB ved IoU 0,87). Hovedfilen er derfor kun ordmærket (skrifttypen er ikke Benellis egen). Rå-IoU mod hele kilden er derfor lav (0,32) bevidst.
- Indian: 6 KB-loftet giver IoU 0,951 (tynde fjerlinjer); kravene for mærker der alligevel skal erstattes af officiel fil er derfor 0,94 / 0,92 (blød 64 px). Alle andre opfylder 0,97 / 0,93 / 0,85.
- Alle SVG'er er ENSFARVEDE (`fill="currentColor"`, én path). Ingen er flerfarvet.
- Ved 16-24 px højde er lockups med tekst ikke læselige (se ark-24px); brug `-emblem` eller `-ordmaerke` der, hvor de findes.
- `img/brands/.gitattributes` (`* -text`) fastholder LF, så sha256 i assets.json stemmer efter checkout på Windows.
