# V6 Builder: cookie-dialog uden JS-afhængighed og deterministisk QA-gate

Branch `gauntlet/v6-cookie`. Kilde: V5-Critic P2-1 (cookie) og P2-4 (flaky gate), V5-QA.

## Opgave 1 (P2-1): cookie-dialogen skal kunne besvares uden js/components.js

### Fejlen (V5)
`#cookie-banner` er en `<dialog>` åbnet med `showModal()` af et inline script. Knapperne ("Accepter alle" / "Kun nødvendige")
blev kun koblet af `initCookieConsent()` i `js/components.js`. Blev den fil blokeret, fejlede eller kom for sent (script blokeret,
netværksfejl, JS-fejl i et tidligere script), stod dialogen åben, knapperne var døde og hele siden var inert
(`elementFromPoint` rammer DIALOG). Den eksisterende failsafe dækkede kun "dialogen er skjult af CSS/blokker".

### Rettelsen (valgt: inline binding, ikke ikke-modal + timeout)
Det inline script i `scripts/inline-cookie.js` (cookie-blokken `<!--cookie:start-->`) gør nu selv det hele, ES5 uden afhængigheder:

- Åbner dialogen som før (`showModal()`), undtagen på `privatlivspolitik`, `vilkaar`, `om-indeksering` og når samtykke allerede findes.
- Kobler de to knapper og `cancel` (Escape lukker ikke). Et svar gemmer samtykket under samme nøgle og i samme format som
  `Store.setCookieConsent` (`bb_cookie_consent` = `{level, date}`; nøglen læses ved byg fra `js/store.js`), lukker og fjerner dialogen.
  "Accepter alle" kalder `window.bbStartAnalytics()` (defineret af `scripts/inline-analytics.js`) først nu; "Kun nødvendige" starter intet.
  Ingen sporing før samtykke (verificeret: ingen `googletagmanager`-script og ingen forespørgsel før svar).
- Mærker dialogen `data-bound="inline"` og sætter `data-svaret`, så et klik aldrig kan gemme to gange.
- Beholder vagten mod blokkere (`display:none` => luk dialogen, gem intet), uændret.

`js/components.js` (`initCookieConsent`): hvis `data-bound === "inline"`, kobles der ikke igen (sættes til `components` som bekræftelse),
men vagten (MutationObserver/interval) beholdes. Dermed er det idempotent: samme resultat hvad enten components.js kommer
til tiden, for sent eller aldrig. Er dialogen ikke bundet af inline (fx gammel cachet HTML), kobler components.js som før.

Resultatet af at binde inline er at ingen timeout-nødløsning (`inert` fjernes) er nødvendig: knapperne virker uanset hvad.

### Test
Ny `scripts/v6-cookie.test.js` (10 tests, Playwright):
- kilde: knapbinding, `data-bound`-vagt i components.js, nøgle udledt af store.js; bygget HTML (5 sider) har nyt script, gyldig ES5.
- `js/components.js` blokeret, og `components.js` + `data.js` blokeret: dialogen er modal, intet gemt/ingen sporing før svar;
  begge knapper: samtykke skrives præcis én gang med `{level, date}`, dialogen fjernes, et ægte klik på et link navigerer
  (siden er ikke inert), dialogen åbnes ikke på næste side; "Accepter alle" starter ét statistikscript, "Kun nødvendige" intet.
- Normal indlæsning: components.js bekræfter (`data-bound="components"`) uden at koble igen; ét klik = ét samtykke = ét `gtm`-script.
- Svar før components.js er indlæst (forsinket 2,5 s): ingen dobbeltbinding, ingen ny dialog bagefter.
- Privatlivspolitik/vilkår/om-indeksering: dialogen åbnes ikke (heller ikke uden components.js). Allerede svaret: ikke åben.

Bevaret og grønt: `scripts/v3-cookie-filter.test.js` inkl. blokker-simuleringen (display:none efter 0/300/1200/3000 ms, stylesheet og inline style).
Også grønne: `js/scroll-padding.test.js`, `scripts/tekstsider.test.js`, CSP-tests, smoke strikt (index, soegning, annonce, login, privatlivspolitik,
390/1440, lys/mørk, CLS 0,05) 2 gange: 0 fejl.

Byg: `build -> kritisk-gen -> build` (inline-scriptet er ændret => alle 102 sider + CSP-hashes). Skærmbilleder (components+data blokeret,
375/1440, lys/mørk, før/efter svar): `docs/review/gauntlet/v6/cookie-gate/uden-components-*.png` (genereres af `scripts/v6-cookie-shots.js`).
Visuelt er dialogen uændret (samme markup).

## Opgave 2 (P2-4): QA-gaten er flaky

### (a) `v5-andet-tekst-gaar-tabt` i `scripts/v4-maerke-dakning.test.js` (rod-årsag fundet og rettet)
Symptom (V5-Critic): "Fantasi Motors" findes ikke i `collectFormData()`; 2 af 3 fixtures-kørsler. Genskabt: ca. 1 af 4 kørsler (4 kørsler: 1 rød; derefter 1 af 8).
Instrumenteret (`console.error` af feltets værdi efter hver `p.fill`): værdien efter udfyldning var **"Fa"**, ikke "Fantasi Motors". Feltet var udfyldt halvt;
opret-annoncens kladde/gendannelse var uskyldig (`data-op-klar` sat, ingen kladde).

Årsag: race i runneren (`scripts/v5-maerke-krav.js`, `tjekAndetMaerke` -> `prov()`), ikke i sitet. `prov()` kører sidens `validateStep(1)` efter hver udfyldning.
Den finder altid fejl (typen er ikke valgt) og kalder så `scrollIntoView({behavior:'smooth'})` og `setTimeout(focus, 280)` på det første fejlfelt
(`js/opret-annonce.js`, validateStep). Den ventende fokusflytning fra FORRIGE prov (XSS-teksten) lå 280 ms senere og ramte midt i næste `p.fill`
(fokus + markér alt + indsæt), når runneren var hurtig nok. Resultatet var "Fa", og resten af teksten forsvandt. Det forklarer også, hvorfor fejlen kun ramte
fixtures-kørsler og ikke var manuelt genskabelig (tidsvindue på få ms).

Rettelse (`scripts/v5-maerke-krav.js`): (1) `prov()` venter 400 ms efter hvert `validateStep`, så sidens egen fokusflytning er færdig før næste tastning;
(2) ny `fylde()` aflæser feltet efter `fill` og tager det om (op til 4 gange), så et fokustyveri aldrig kan give en halv tekst.
Bevis: 16 hele kørsler i træk af `node scripts/v4-maerke-dakning.js --hurtig --data fixtures --baseline ... --kendt ... --streng-v5` (med samtidig CPU-last fra
CLS-målinger): 16/16 exit 0 (før: 1 rød af 4 og 1 af 8). Regressionstest: ny test i `scripts/v5-maerke-krav.test.js` ("sidens forsinkede fokusflytning ...").
Kontrolsiden får en `fokustyveri`-mutation, der efterligner validateStep's 280 ms-fokusflytning, og testen gentager tjekket 4 gange. Verificeret, at den FEJLER
mod den gamle runner ("gentagelse 2: v5-andet-tekst-gaar-tabt") og består mod den nye.

### (b) `scripts/facet-intro-cls.test.js`: CLS 0,051 på mc-harley-davidson-cruiser @375 mørk (ægte instabilitet, rettet ved roden)
Reproduktion: smoke gav 0,026 (idle) og `scripts/v6-cls-diagnose.js` deterministisk 0,0312. Det er ikke en font-swap (fontene er indlæst før første maling; en
forsinket font giver 0,0018), og der er ingen forskel på kritisk CSS og fuld CSS (`scripts/v6-cls-diff.js`: elementernes rects er ens de første 1,2 skærme).
Bisect: JS blokeret giver 0; kun hydreringen (`backend-bridge.js`/`data.js`/`components.js`) udløser det. Fixtures har 4 Harley-cruisere, den byggede side bagte 41. Bages
samme tal som lageret har (4), er CLS 0,0000. Altså: **hydreringens ombrydning, når tallet skifter antal cifre**. Målt med Range-rects: i den centrerede, todelte
`.fa-soeg-antal` ("41 Harley-Davidson cruiser-motorcykler indekseret på Bikerbasen") rykkede "indekseret på" op på linje 1, så linje 2 sprang 18 px. På
`type-cruiser` gik antal-linjen fra 2 til 1 linje (36 til 18 px) og trak resten af søgekortet 18 px op. Det er ikke kun en testartefakt: i produktion er det bagte
tal blot nogle dage gammelt, og et skift i cifre (eller ental/flertal) rammer samme mekanisme. Under CPU-last bliver frames adskilt og scoren stiger (0,051).
Intro-reservationen `fa-intro-lN` var ikke årsagen (introens højde er uændret). Den bevares.

Rettelse:
- `css/p-facet.css`: `.fa-soeg-antal{ text-wrap: balance; }` gør linjefordelingen uafhængig af ét cifres bredde (mc-harley: 0,0312 til 0,0015). Ældre browsere ignorerer reglen.
- `scripts/build-facet-pages.js` + `css/p-facet.css`: antal-linjen bærer `fa-antal-lN` (N = ceil(bagt tekstlængde / 40 tegn), 1-4). `.fa-soeg-antal.fa-antal-l2/3/4` reserverer
  `min-height` til 2/3/4 linjer (1,4 x 13 px) på smal skærm, så en linje mindre ikke trækker kortet op (type-cruiser: 0,0181 til 0,0142; resten er teksten, der skifter linje
  inde i en stabil boks). Specificiteten er bevidst `.fa-soeg-antal.fa-antal-lN`, fordi den senere mobilregel (`min-height:0`) ellers vinder.
- Måling efter: smoke på ALLE 43 facetsider (mc, type, region, koerekort, budget, by, model) ved 320/375/430/768/1440, lys+mørk, med grænsen sænket til 0,02: 430 målinger, 0 fejl
  (før: type-cruiser 0,023 og mc-harley 0,026). Største rest er 0,014 (type-cruiser @375), 3,5 gange under grænsen 0,05.
- `scripts/facet-intro-cls.test.js`: tjekker nu også, at alle facetsider har `fa-antal-lN` + CSS + balance. CLS-målingen (mc x6, type-cruiser, by-horsens @375 lys+mørk, grænse 0,05)
  gentages op til to gange ved rød (en ægte regression fejler alle tre kørsler, load-støj gør ikke) og melder, hvor mange forsøg der skulle til.
  Grænsen er uændret 0,05 (margin nu 3-30 gange). I stedet for at hæve tærsklen er den reelle ustabilitet fjernet, og genforsøget dækker kun CPU-belastning.

### Kendte flaky-kilder og hærdning
| Kilde | Symptom | Hærdning |
|---|---|---|
| Windows loopback-buffer (`net::ERR_NO_BUFFER_SPACE`), mange hurtige sideindlæsninger/parallelle testprocesser | tilfældigt `Failed to load resource` for en lokal fil, eller `page.goto` fejler | `scripts/smoke-browser.js` (V5): keep-alive 60 s + `kunBufferFejl`-genmåling (kun når ALLE fund er buffer-støj). V6: samme genforsøg (3 forsøg, 400 ms backoff, kun ERR_NO_BUFFER_SPACE / ERR_CONNECTION_RESET/REFUSED) i `goto` i `scripts/v4-maerke-dakning.js`, `scripts/v5-maerke-krav.js` og `scripts/v6-cookie.test.js` (`scripts/v5-guidekort.test.js` havde det allerede) |
| Sidens egne forsinkede handlinger (fokusflytning 280 ms efter `validateStep`, `scrollIntoView smooth`) mod en hurtig testrunner | halv tekst i felt ("Fa"), klik/fokus rammer forkert element | Runneren venter på sidens timere (400 ms) og aflæser felter efter udfyldning (v5-maerke-krav.js). Tommelfingerregel for nye tests: efter enhver handling, der kalder `validateStep`/`toast`, vent mindst 300 ms før næste tastning, eller aflæs og gentag |
| Hydrering ændrer bagte tal (fixtures: 4 annoncer mod 41 i HTML) | CLS i `facet-intro-cls`, `smoke` | rod-årsag rettet (text-wrap: balance + fa-antal-lN); CLS-testen gentages op til 2 gange mod CPU-last |
| Fast pause i stedet for betingelse (`waitForTimeout(120)` efter bekræftet sletning, fokus sættes først når mock-backendens svar er behandlet) | `js/v5-saelger.test.js` "efter bekræftet sletning/solgt/pause lander fokus ...": fokus stadig på `<body>` (1 af 3 fulde kørsler) | `klikJa()` venter nu til `document.activeElement !== body` (waitForFunction, 5 s) |
| Afrunding til spande (`Math.round(h/20)`) i en sammenligning af to målinger | `js/v5-opret-container-fallback.test.js`: 3666 mod 3671 px gav forskellige spande (183 mod 184) (1 af 3) | kolonner sammenlignes eksakt, sidehøjden med tolerance på 30 px |
| `page.goto` rammer `ERR_NO_BUFFER_SPACE` uden genforsøg | `js/w14-brugere.test.js` "ingen vandret overflow ... 1440 lys" (1 af 3) | ny `smoke-browser.js: gaaTil(page, url, opt)` (3 forsøg, kun OS-fejlene); brugt i w14-brugere, v5-opret-container-fallback og v6-cookie.test.js. Nye tests bør bruge den i stedet for `page.goto` |
| CPU-belastning (`node --test` kører filer parallelt) gør Playwright-tidsvinduer snævre | CLS-score og timere forskubbes | tærskler med margin, genforsøg kun for load-støj, ingen faste `waitForTimeout` som eneste synkronisering i nye tests (brug `waitForFunction`/`waitForSelector`, som v6-cookie.test.js) |

### Kørsler (hærdningens bevis)
- **Hele `npm test` 3 gange i træk: 3 af 3 grønne** (1692 tests, 1691 bestået, 1 sprunget over som før, ca. 6 min pr. kørsel; `git status` rent efter hver) plus
  `scripts/v6-cookie.test.js` 3 af 3 (ikke i package.json endnu). Vejen dertil: første serie med kun runner-/CLS-rettelserne gav 2 røde + 1 grøn
  (v5-opret-container-fallback, w14-brugere ERR_NO_BUFFER_SPACE, v5-saelger fokus; se tabellen), anden serie efter hærdningen 3 grønne. En enkelt rød kørsel
  skyldtes i øvrigt `scripts/w13-logo-generator.test.js`, som kræver et rent git-træ (jeg havde ikke committet endnu); den er ikke flaky.
- `node scripts/v4-maerke-dakning.js --hurtig ... --streng-v5`: 16/16 grønne (før ca. 1 af 4 røde).
- Delmængde x3 i træk (`js/w10-fejl`, `js/w10-soegning`, `js/w11-fejl2`, `js/w13-integration`, `js/v5-soegning-cls`, `js/v5-saelger`, `scripts/v4-maerke-dakning`, `scripts/facet-intro-cls`,
  `scripts/v5-maerke-krav`, `scripts/v3-cookie-filter`, `scripts/v6-cookie`): 94 tests, 94 grønne, 3 af 3 kørsler (163-183 s hver), ingen genforsøg udløst.
- Smoke strikt (16 sider x 320/390/768/1024/1440 x lys+mørk, 0,05): 0 fejl, 2 gange. Alle 43 facetsider x 5 bredder x 2 temaer med 0,02: 0 fejl.

### Nye/ændrede filer
Nye: `scripts/v6-cookie.test.js`, `scripts/v6-cookie-shots.js`, `scripts/v6-cls-diagnose.js` (layout-shift-kilder under CPU-last/font-forsinkelse), `scripts/v6-cls-diff.js`
(rect-sammenligning med/uden CSS eller JS). Ændrede tests: `scripts/facet-intro-cls.test.js`, `scripts/v5-maerke-krav.test.js`. Orchestrator: tilføj `scripts/v6-cookie.test.js` til package.json "test".
