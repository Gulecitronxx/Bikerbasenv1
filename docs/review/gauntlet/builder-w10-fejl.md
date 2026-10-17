# Builder w10-fejl: fejlbanneret må aldrig flytte indhold

## Acceptkriterier (skrevet FØR koden)
1. CLS < 0,05 på forside, søgning, annonce, mærke-, model-, by-, region-, type-, kørekort- og budgetside ved 320/390/768/1440, lys og mørk, svarforsinkelse 0 og 1200 ms, og fejlene 503, 500, tom `[]` og netværksabort. Målt i rigtig Chromium (browsertest), ikke ved streng-søgning.
2. Fejlbanneret (`#data-afbrud`) er ude af flowet (`position:fixed`), ligger inden for viewport, giver ikke vandret overflow og er ens i lys/mørk.
3. Forsiden siger intet tal under et fejlbanner ('N annoncer i Danmark' væk); ingen synlig '0 annoncer' i bodytekst under banner; facet-scriptets '0 annoncer' erstattes ved delvis fejl.
4. 'Prøv igen' virker og kan nås med tastatur (første fokus i `<main>`); banneret har `role=alert` og INGEN ekstra `aria-live` (ingen dobbelt-oplæsning); 'Luk' fjerner det uden at flytte noget.
5. `node --check` og `npm test` grønt.

## Valgt princip: (a) fast overlay
`.data-afbrud` er `position:fixed` lige under headeren (`top: header-h + space-2`; fuld bredde minus gutter på mobil, 440 px kort til højre fra 768 px). Et element uden for flowet kan ikke give layout-shift, uanset hvornår svaret kommer, og ingen side behøver pladsreservation eller særbehandling. Det var simplere end (b): in-place erstatning kræver en indholdsblok pr. sidetype (forside, facet, mærke, annonce, søgning), og generatorerne/HTML er ikke mine.

## Ændringer
- `css/styles.css` (kun `.data-afbrud`-blokken + den gamle forsideflytte-kommentar): overlay, `Luk`-knap, fokusring, `[hidden]`. Reglerne `body.home .data-afbrud…` er fjernet.
- `js/backend-bridge.js` `meldDataafbrud()`: `role=alert` (var `status`), knapper `Prøv igen` + `Luk`; `skjulNulTalVedFejl()` (MutationObserver) erstatter facet-scriptets '0 annoncer' med 'Antal ukendt lige nu', så længe en kilde har fejlet.
- `js/home.js`: banneret flyttes ikke længere; `lagerFejlet` (DATA_STATUS egne/eksterne = fejlet) skjuler hero-antallet og 'ikke talt med'-linjen.
- Opdaterede eksisterende tests til det nye design: `js/w6-funktion.test.js` (role alert), `js/w9-frontend-tom.test.js` (fast overlay i stedet for 'i pladsholderen').
- `js/maerke.js`, `js/search.js`, `js/annonce.js` behøvede ingen ændring (de skriver ikke selv banneret; mærkesiden rører intet ved delvist lager).

## Ny testfil (Orchestratoren tilføjer til `npm test`)
`js/w10-fejl.test.js` (3 browsertests; springes over uden Playwright). Standard: 10 sider × 390/1440 × lys × 503/tom (hurtig, ca. 80 s). `W10_FULL=1` kører hele matricen (10 × 4 bredder × 2 temaer × 4 fejl × 2 forsinkelser = 640 målinger); `W10_TABEL=1` skriver CLS-tabel.

## Før/efter CLS (sum af layout-shift, headless Chromium, bb.test, 503/tom, forsinkelse 0)
| side | bredde | før | efter |
|---|---|---|---|
| søgning/annonce (503) | 390 / 1440 | 0,161 / 0,069 | 0,000 |
| mærke/model/by/region/type/kørekort/budget (503) | 390 / 1440 | 0,161 / 0,068 | 0,000 |
| samme (tom `[]`) | 390 / 1440 | 0,184 / 0,068 | 0,000 |
| forside | 390 / 1440 | 0,000 (home.js flyttede banneret) | 0,000 |

Fuld matrix (`W10_FULL=1`, 640 målinger: 10 sider × 320/390/768/1440 × lys/mørk × 503/500/tom/abort × 0/1200 ms): 639 under 0,05 (max på de øvrige 0,00x); én engangsmåling `model-honda-nx-500` 768 lys abort 0 ms gav 0,145 og kunne ikke gentages i 3 genkørsler af samme kombination (alle grønne). Banneret er fixed og ikke kilden. Hurtig-matrix og de to øvrige browsertests: grønne. `npm test`: 1007/1007 grønne, `node --check` på alle js-filer ok (llms.txt gendannet).

Forside i tomt/fejlet lager: den tomme annoncerække (reserveret højde fra W9-CSS) viser nu én ærlig linje ('Der er ingen annoncer at vise lige nu. Prøv igen om lidt.') i stedet for at stå tom, nu hvor banneret ikke længere fylder pladsen.

## Kendte rester / ikke ændret
- 'Prøv igen' er en ny indlæsning (`location.reload()`): hver side tegner sig selv ved opstart ud fra Store, og der findes ingen fælles 'tegn om'. Genhentning uden sideskift kræver en refaktorering af alle sideboots (ikke i scope).
- Forudtegnede, daterede tal i SEO-indholdet på mærke-/facetsider ('276 annoncer', 'Oplyst i 10 annoncer') står, også under fejl: de er sidens indekserbare, byggede indhold ('ved sidste opdatering'), og HTML/generatorer er ikke mine filer. Banneret siger, at tallene ikke dækker det aktuelle lager.
- Forside med lokalt demolager (kun localhost) + databasefejl har CLS ca. 0,19, fordi demodata ingen fotos har og 'udvalgte'-rækken er tom (sælg-panelet skifter bredde). Det er demodata, ikke banneret; findes ikke i drift (intet demolager på rigtigt hostnavn).
- DELT-ØNSKE: ingen.
