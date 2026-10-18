# V3 QA — verificerede fund (Agent 5)

Mål: bikerbasen.dk live + worktree v3-qa. Browsere testet: Playwright Chromium 151, Google Chrome 155 (channel chrome), Microsoft Edge 155 (channel msedge). Firefox/WebKit er IKKE installeret (ikke downloadet — kræver tilladelse).

## A. Brugerrapport "virker i Brave" (uafklaret retning)

### A1. Live i Chrome/Edge/Chromium — ens, ingen fejl (verificeret)
Script: `work/live-browsers.js`. 6 sider (/, soegning, annonce, maerker, login, guides) i alle tre browsere ved 1440: 0 konsolfejl, 0 CSP-brud, 0 CORS-fejl mod Supabase, 0 horisontalt overflow, ingen service worker (ingen `serviceWorker` i koden). Eneste afvigelse: ét `net::ERR_BLOCKED_BY_ORB` på et assets.guloggratis.dk-billede (kildens svar er ikke et billede) — kosmetisk, identisk i alle tre.
Konklusion: ren Chrome/Edge uden udvidelser og med tom cache fejler IKKE. Forskellen må ligge i brugerens profil: udvidelser, cache/localStorage, eller at et cookie-/reklamefilter er involveret (se A2).

### A2. ROD-ÅRSAG fundet: skjult cookie-dialog gør hele siden død (HØJ) — RETTET i egne filer
Fil: `scripts/inline-cookie.js` (inline-script i alle 101 sider) + `js/components.js` `initCookieConsent()`.
Samtykket er `<dialog id="cookie-banner">.showModal()`. Hvis en indholdsblokker skjuler elementet (EasyList Cookie / Brave Shields "Block cookie notices", uBlock, "I don't care about cookies"-udvidelser — generiske regler rammer netop `#cookie-banner`, `[class*="cookie"]`), står dialogen stadig i top-laget som `:modal`, MEN er `display:none`. Resten af siden er `inert`: ingen klik, ingen tastatur, ingen scroll-interaktion — og brugeren kan hverken se eller besvare dialogen.
Bevis (Chrome 155, filter injiceret): før rettelse `dialogDisplay:none, :modal:true, elementFromPoint = HTML`, klik på "Søg"-link timeout. Efter rettelse: dialog lukkes, `klik OK -> /soegning.html`. Screenshot: `docs/review/gauntlet/v3/qa/sim-cosmetic-cookie.png`.
Rettelse: efter showModal tjekkes computed display/visibility/offsetWidth; er dialogen usynlig, lukkes den og får `hidden`. Intet samtykke gemmes (statistik forbliver slukket; dialogen forsøges igen næste sidevisning). Gentjek efter 600 ms for filtre der lægges på sent. Hash i CSP opdateres af build (`inline-cookie.js` -> `csp-hashes.js`; kørt og verificeret lokalt, 101 sider). **Orchestrator skal køre `node scripts/build.js` efter merge** (genererede html er ikke committet af mig).
Retning: hvis ejeren bruger Brave med Shields på og det er DER, det fejler, er dette sandsynligvis årsagen. Hvis det er Chrome/Edge der fejler, kan samme mekanisme ramme dem med en cookie-udvidelse.

### A3. Brave-simulation (tredjeparts-blokering + cosmetic filter)
- Alle ikke-bikerbasen-værter afbrudt (`ctx.route abort`): forsiden viser 3 kort og tekst, men Supabase-kald (`listings`, `eksterne_annoncer`) fejler -> konsol-warning "Kunne ikke hente annoncer", annoncelisten er tom/begrænset; ingen JS-undtagelse. Søgesiden: h1 mister tallet ("720 motorcykler" -> "Motorcykler til salg"), 2.7k tegn tekst mod 7.0k, annoncebilleder (danbase.dk, guloggratis.dk) blokeres. Siden er altså brugbar men halv tom. Supabase står IKKE på de almindelige filterlister, så Brave med standard-Shields blokerer den normalt ikke; kun "Block all cookies"/Aggressive third-party-blokering rammer.
- Ad-lignende class/id i markup (scannet på 9 sider): kun `lg-promo*` (login/dashboard — sidepanel), `profil-ejer-banner` (forhandler). Ingen på forside, søgekort, annoncekort. LAV risiko; anbefaling: omdøb `lg-promo*` -> `lg-fordele*` og `profil-ejer-banner` -> `profil-ejer-linje` hvis ejeren ser tomme paneler (login-siden: Brave skjuler muligvis panelet). Disse filer ejes af login-/profilagenter -> routes.
- `navigator.brave`, fingerprint-afhængige API'er (canvas/WebGL/audio): ikke brugt. localStorage: `js/store.js` har shim ved blokeret storage; `sessionStorage` (annonce.js, search.js) er verificeret pakket i try/catch; `localStorage` i store.js har shim ved blokeret storage. Ingen fund.

### A4. Statisk browser-kompatibilitet (Safari/Firefox/ældre Chrome)
CSS i `css/styles.css`: `:has()` (7), `@container` (3), `color-mix` (25), `text-wrap` (4), `dvh` (3), `aspect-ratio`, `inset`, `line-clamp`, `:is()`. Ikke brugt: subgrid, @layer, nesting, light-dark, oklch, @property. Minimumskrav: Safari 16.2 (color-mix), Chrome 111+, Firefox 113+ (:has). Ældre end ca. 2023 får ikke color-mix/container queries -> kontrollér at de har fallback-værdier (stikprøve ikke udført for alle 25 color-mix).
JS: ingen `structuredClone`, `.at()`, `replaceAll`, top-level await, import maps, moduler, serviceWorker. `crypto.randomUUID` (supabase-api.js; kræver sikker kontekst og Safari 15.4+), `navigator.clipboard` (annonce.js, mine-annoncer.js), `IntersectionObserver`, `<dialog>.showModal` (Safari 15.4+; fallback findes). Optional chaining/`??` bruges bredt (Safari 13.1/14+).
Cache: HTML `max-age=600`, CSS/JS `max-age=14400`, alle ressourcer med `?v=<hash>` -> blandet gammel/ny kun i op til 10 min; ikke et reelt problem.
CSP: `script-src 'self'` + 3 sha256 for inline; hash beregnes på tegn-for-tegn tekst — kompatibelt på tværs af browsere (inline-scripts-syntaks.test.js + csp-hashes.test.js dækker).

### A5. Hvad ejeren bør oplyse/teste (kan ikke afgøres uden)
1. Hvilken browser + version, og hvad "virker ikke" betyder (blank side? kan ikke klikke? ingen annoncer? cookie-boks?).
2. Skærmbillede af konsollen (F12 -> Console) og Network.
3. Test i Chrome/Edge InPrivate/Inkognito uden udvidelser: virker det? Så er det en udvidelse (se A2).
4. Test samme browser med Brave Shields slået fra for siden (løve-ikonet) — ændrer det noget?
5. Tving genindlæsning (Ctrl+Shift+R) og ryd site-data for bikerbasen.dk (localStorage `bb_*`).
6. Hvis iPhone/Safari: iOS-version (skal være >= 16.2).
Anbefaling: giv tilladelse til `npx playwright install firefox webkit` (ca. 150-250 MB) så Firefox/WebKit kan køres automatisk.

## B. Øvrige fund (regression) — se bunden for runner-resultater

Kørsel: `node scripts/v3-regression.js` (101 sider × 375/430/768/1440/1920 × lys+mørk = 1010 smoke-målinger + 202 dybe målinger + 6 blokker-simulationer) på worktree.

| # | Sværhed | Fund | Bevis | Forslag / ejer |
|---|---|---|---|---|
| B1 | MELLEM | CLS 0.124 på `mc-harley-davidson-cruiser.html` ved 375 (lys og mørk), grænse 0.05 — eneste side af 101 | smoke `cls`, reproducerbart | Facet-side (`scripts/build-facet-pages.js` / facet-CSS): reservér højde til annoncegitter/billeder (aspect-ratio + min-height). Route til facet-/søge-agent |
| B2 | LAV | `dashboard.html` og `mine-annoncer.html` ca. 2.2 MB (38 filer) lokalt mod ca. 1.0 MB på øvrige sider | v3-regression `vægt` | Tjek hvilke js/css der indlæses på kontosiderne; lazy-load. Route til brugere/dashboard-agent |
| B3 | INFO | Overlap-heuristik (>40 % overlap mellem knap/link-rektangler): `guide-mc-udstyr.html`, `maerke-honda.html@375`, `privatlivspolitik.html@375` | Ikke visuelt bekræftet; sandsynligvis udvidede klikflader (`padding:11px; margin:-11px`) | Ingen handling medmindre screenshot viser tekstkollision; kun advarsel i runneren |
| B4 | INFO | Én billed-URL på assets.guloggratis.dk blokeres af ORB (kildens svar er ikke et billede) | live, alle Chromium-varianter | Kilde-data; verificér at kortet har billed-fallback |
| B5 | OK | 0 konsolfejl/sidefejl, 0 horisontalt overflow ved 375/430/768/1440/1920, 0 døde links, 0 ressource-404, 0 CSP-script-brud, 0 brudte billeder, h1=1 | smoke på 1010 målinger | — |
| B6 | OK | Ingen modstridende annoncetal mellem forside/søgning/guides (lokalt datasæt) | fase 3 | — |
| B7 | OK | Vægt median ca. 1.0 MB, LCP 170-330 ms lokalt (uden netværk; kun relativt) | fase 2 | Mål LCP på live med Lighthouse efter Orchestrators build |

## Filer ændret af mig
- `scripts/inline-cookie.js`, `js/components.js` (`initCookieConsent`) — cookie-dialog-failsafe (A2). components.js er en fælles fil; ændringen er ca. 10 linjer isoleret i `initCookieConsent`. Orchestrator: kør `node scripts/build.js` efter merge (genererede html er ikke committet af mig).
- Ny: `scripts/v3-regression.js` (runner), `scripts/v3-cookie-filter.test.js` (tilføj til package.json "test"), docs.
- `work/*.js` er engangsprobes og ikke committet.
