# Agent 5 (w14-brugere): guides, login, mine annoncer, øvrige sider

Branch `gauntlet/w14-brugere` (fra fefe1570). Billeder: `docs/review/gauntlet/visual/agent5-brugere/` (ref-*, foer-*, efter-*, sbs-* = mockup | efter, WebP, 4,0 MB).
Mock-fotos i screenshots er peget på `img/type/*.webp` via route i skærmbillede-scriptet (udenfor repoet); intet i repoet er ændret for det.

## Acceptkriterier (skrevet først)
K1 Guide (billede 10): indholdsfortegnelsen er en bred 2-spalters boks øverst i artiklens spalte (ikke kun sticky sidebjælke); højre spalte: Kort fortalt (overlapper heroens fod), tvivl-kort, annoncekort; mobil: Kort fortalt -> sammenklappelig indholdsfortegnelse -> artikel. Hero maks. 400 px ved 1440 (før 424), h1 <= 42 px.
K2 Login (billede 6): kortet passer i første skærm ved 1440x941 (før: bunden uden for skærm), formularens h1 på én linje, højre flade fader ind i fotoet uden synlig kant, et ærligt "eller"-valg i stedet for social login (Google/Facebook/Apple findes ikke og må ikke efterlignes).
K3 Mine annoncer (billede 5): hero <= 215 px (før 244), profilindstillinger i to spalter på bred skærme (ingen halvtom kolonne), tap-mål >= 40 px.
K4 Øvrige sider (om, sikkerhed, vilkår, 404, afmeld): samme designlinje; fejl, der ses, rettes.
K5 0 overflow 320/390/768/1024/1440 lys+mørk, CLS < 0,05 (smoke strikt), seo-audit 0 fund, kritisk-test grøn, ingen opdigtede data (ingen beskeder, "+24 %", "Udløber om N dage", 120.000+, forfatter, social login).

## Afvigelsesliste (prioriteret, fra baseline) og status
1 Manglende moduler: guide-TOC som bred boks (LUKKET); login "eller"-sektion (LUKKET ærligt, ikke social login); mine annoncer "Beskeder"-kort/fane og "Udløber"/visningsgraf (BEVIDST UDELADT, findes ikke); "Opret en ny annonce"-stribe og hjælpekort fandtes allerede.
2 Forkert layout: guide-TOC i smal sticky sidebjælke (LUKKET), login-kort højere end skærm (LUKKET), halvtom konto-fane (LUKKET).
3 Hierarki: guide-hero for høj og for stor h1 (LUKKET, 424 -> ca. 337 px); mine-hero (244 -> ca. 204).
4 Kort/panelopbygning: login-panelets hårde kant ved x=1075 (LUKKET: mask-fade i stedet for boks + backdrop-filter, som ignorerer masken).
5 Billedbrug: mockuppernes rytterfotos findes ikke i repoet (TILBAGEVÆRENDE).
6 Proportioner: "Læs også"-links på info-sider havde ikon OVER teksten (rigtig fejl: styles.css-regel `main ul:not([class]) > li > a:only-child` slog `.if-links a`; LUKKET). Pop-kort "Se alle" 29 px og annoncetitel 21 px tap-mål (LUKKET, >= 40).
7 Typografi/detaljer: indholdsfortegnelsens tal i brandfarve (mockup grøn; grøn er kun til ✓).
8 Mikrointeraktion: uændret (TOC markerer aktivt afsnit via js/guides.js).

## Ændringer
- `scripts/build-guides.js`: TOC først i `.gd-main`; `.gd-side` = Kort fortalt, tvivl-kort, pop-kort (gd-extras fjernet). SEO (title/description/canonical/JSON-LD) uændret (seo-audit 0 fund).
- `css/p-guides.css`: hero, TOC-boks (2 spalter fra 700 px), orden i sidebjælken, `.gd-pop-card{position:relative}` (stabil kritisk måling), `.gd-pop-all` min-højde.
- `css/p-login.css` + `login.html`: sømløs højre flade, "eller" + "Fortsæt uden konto og se motorcykler" (kun login-visning), h1 på én linje fra 1100 px, lavere formularpolstring.
- `css/p-dashboard.css`: lavere hero, konto-fane i to spalter (>= 1100 px), annoncetitel tap-mål.
- `css/p-info.css`: Læs også-fix. Info-teksten (testlåst) er urørt.
- guide-*.html, guides.html, login.html regenereret via kopi udenfor repoet (`renderGuide/renderOversigt` + build-meta/stamp/inline/csp-hashes; ?v= sat tilbage til committet stempel; intet kørt mod produktion). `scripts/kritisk-manifest.json` gen-genereret (`kritisk-gen.js --familie guide,login,dashboard`).
- `scripts/w10-discovery.test.js`: ét assert bevidst ændret (TOC i artikel i stedet for sidebjælke; begrundelse i testen).

## Test (nye/ændrede)
NY `js/w14-brugere.test.js` (16 tests, Playwright mod lokal server + mock): TOC-placering/bredde/2 spalter, hero-højde, mobilrækkefølge + tap, ingen overflow 320..1440 lys+mørk på guides/guide/login/sikkerhed/om/404, login-eller/gæstelink skjult i opret + ingen social login/opdigtede tal, login-flade uden hård kant, mine-hero/konto-to-spalter/ingen overflow på alle faner @390/ingen opdigtede moduler, Læs også = flex. package.json er Orchestratorens: tilføj `js/w14-brugere.test.js`.
Grønt: w9-saelger 33, w7-funktion 34, login-fejl, mine-annoncer, favoritter, dashboard, info-tekst, guides/w12-guides/w10-discovery, w12-kritisk 18, smoke-browser strikt `--cls 0.05` 210 målinger (21 sider x 5 bredder x lys+mørk) 0 fejl/0 advarsler.

## Ærlig "ligner ikke endnu"
- Ingen rytterfotos/bright hero (mockup: lyst fotografi med rytter; vi har kun forsidens mørke Ducati-foto). Guide- og mine-hero er derfor mørkere end referencen.
- Forfatterfoto/"Mads Christensen"/dato, 120.000+, Google/Facebook/Apple, Beskeder, +24 %, Udløber, 3x: bevidst ikke kopieret.
- Mockuppens sidebjælke viser "Populære motorcykler til begyndere" med fotos og hjerter; vores modul er "Oplyst effekt under A2-grænsen" (kun ægte data, ingen hjerter), og i offline-test vises kortene uden fotos.
- Sticky TOC på desktop er opgivet til fordel for mockuppens brede boks (mobil: sammenklappelig). Aktivt afsnit markeres stadig.
- Brandfarve i stedet for grøn CTA/TOC-tal (DESIGN_DNA).
- Tilstande uden login (dashboard/mine-annoncer) er kun målt via mock.

## Selv-score (ikke godkendelse; Critic vurderer)
Guide ca. 4,2 · Login ca. 4,3 · Mine annoncer ca. 4,2.
