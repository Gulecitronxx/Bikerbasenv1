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

---

# Iteration 2-3 (efter blind Critic: AFVIS 6 / 6,5 / 5,5)

Critic-rapport: `docs/review/gauntlet/visual/critic-agent5.md` (i hovedrepoet). Billeder: `sbs-guide/mine/login.webp` (mockup | efter, 1440), `efter-guide-saelg-1440-{l,m}`, `efter-guide-saelg-390-m`, `efter-login-{1440-l,1440-m,390-l,390-m}`, `efter-mine-{1440-l,1440-m,390-l,390-m}`.

## Acceptkriterier (iteration 2-3)
K6 Guide-hero lysere/varmere (foto løftet, scrim kun bag tekst), fed H1, hvid tekst >= 4,5:1; hero <= 340 px ved 1440.
K7 Brødtekst og indholdsfortegnelse flugter (samme højre kant); sticky mini-TOC i højre spalte (>= 1024 px) med aktivt afsnit (scroll-spy); mobil uændret sammenklappelig; >= 2 callouts og >= 2 fotos pr. guide; callouts kun fra guidens eget Kort fortalt.
K8 Login 1440x900: hele kortet OG fordelsstrimlen i første skærm, skarpt foto (ingen opskalering af 1600 px-filen), fed H1; stadig ingen social login/120.000+/beskeder.
K9 Mine annoncer: 5 statistikkort (kun ægte: aktive, kladde, favoritter, på pause, søgeagenter) med tal >= 32 px; tællere med ikon; ægte tip-liste i stedet for pynteform; header "Min profil" + "Log ud" (ikke "Navn · Log ud"); privat dashboard uden blindgyde; `?tab=aktive|kladder|annoncer|gemte|soegeagenter|profil` åbner den rette fane.
K10 0 overflow 320-1440 lys+mørk, tap-mål >= 40, smoke strikt CLS < 0,05.

## Afvigelser fundet (iteration 2) og status
1 Hero mørk og underbelyst (guide, mine): foto `brightness(1.2) saturate(1.1)` + lysere scrim på desktop; mobil bevarer kraftigere scrim (kontrast) — LUKKET (mockuppens lyse stemning nås ikke fuldt: mangler rytterfoto).
2 Brødtekst 840 vs TOC 935 / tom højre kolonne: artikel nu fuld kolonnebredde (afsnit 72-76 tegn), sticky mini-TOC som sidste modul i højre spalte — LUKKET.
3 Kun sektion 1 havde moduler: 2 callouts ("Vigtigt", "Tip", hentet ordret fra guidens Kort fortalt, placeret i den sektion med størst ordoverlap) + 2 fotos pr. guide (guidens kortbillede og forsidefotoet) — LUKKET.
4 Login: sløret foto (1600 px-filen blev opskaleret ca. 1,9x): `sizes="(min-width:960px) 200vw"` vælger 2560-filen, mindre zoom, hele motorcyklen i højre panel; kortet 753 -> 655 px; strimlen slutter ved 900 px ved 1440x900 — LUKKET.
5 Mine annoncer: flade kort, tællere uden ikoner, "Test · Log ud", pladsholder-illustration, blindgyde i dashboard, `?tab=` — LUKKET (5. kort "På pause" i stedet for "Beskeder"; "Udløber om N dage" findes ikke i data og er IKKE opdigtet).
6 Fund i egen test: 15 px overflow ved 320 px fra de nye tællere (w9-test fangede det) — rettet (tællere ombrydes under 520 px).

## Ændrede/nye filer (iteration 2-3)
`scripts/build-guides.js` (`guideTillaeg`, mini-TOC), `css/p-guides.css`, `js/guides.js` (scroll-spy også i mini-TOC), `css/p-login.css`, `login.html` (srcset sizes), `css/p-dashboard.css`, `mine-annoncer.html`, `js/mine-annoncer.js`, `js/dashboard.js` (privat -> mine-annoncer), `js/components.js` (header: "Min profil" + eget "Log ud"; fil ejes af Agent 1, minimal ændring i `updateAuthSlot`), `js/w14-brugere.test.js` (22 tests), kritisk-manifest, regenererede sider.

## Måling
`js/w14-brugere.test.js` 22/22, `js/w9-saelger.test.js` 33/33, w7-funktion 34, guides 85, w12-guides, w10-discovery, w12-kritisk 18, info-tekst 21, smoke-browser strikt `--cls 0.05` 190 målinger (19 sider x 320/390/768/1024/1440 x lys+mørk) 0 fejl/0 advarsler. `npm run gate`: trin 1, 3-6, 8 grønne. Trin 2 rødt KUN pga. `js/w10-fejl.test.js` (CLS 0,076-0,087 på model-honda-nx-500 og type-cruiser, 390 lys, `fa-soeg-vrap`/`fa-panel` = facet-sidernes søgepanel; filer jeg ikke har rørt og som ikke indlæser mine CSS-filer). Trin 7: `js/w14-brugere.test.js` mangler i package.json (Orchestratoren).

## Ærlig "ligner mockuppen: x/10"
- Artikel 7,3/10: komposition (hero + overlappende Kort fortalt, bred TOC, sektioner med moduler, tvivl-kort, sticky sidebjælke) er tæt; mangler lys rytterhero, forfatterfoto og type-kort på alle sektioner (fotos er guidens kortbillede + forsidefoto).
- Login 8/10: kort + strimmel i første skærm, fade til foto, hel motorcykel, tillidsstrimmel; mangler rytter og håndskrevne captions, social login og 120.000+ (bevidst).
- Mine annoncer 7,3/10: rigere kort med ikon og store tal, tællere med ikoner, opret-strimmel, hjælpekort, lavere lys hero; mangler Beskeder/visningsgraf/Udløber (findes ikke) og grøn farve (brand).
