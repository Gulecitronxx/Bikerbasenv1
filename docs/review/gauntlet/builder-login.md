# Builder: login (billede 6) — gauntlet/login

## Bygget pr. billedelement
- **Fuldbredde foto + scrim**: `img/hero-*.webp` (srcset) som `.lg-bg`; motorcyklen skubbes ud i kortets højre side (foto 130 % bredt, `right:-30 %`). Mørk tilstand: kraftigere scrim.
- **Ét stort kort i to halvdele** (`.lg-card`, 5fr/7fr på >=960 px): venstre hvid flade, højre flade der fader ud mod fotoet, så motorcyklen står frit (som i billedet).
- **Venstre**: h1 "Log ind på Bikerbasen" + undertekst, E-mail og Adgangskode med ikon (`.lg-input`, `.input` med --color-input-border), vis/skjul-øje (rigtig `<button>`, `aria-pressed`, skiftende `aria-label`), "Glemt din adgangskode?", stor primær "Log ind →" i brandfarven, bundlinje "Har du ikke en konto? Opret en gratis konto →".
- **Højre**: pille "GRATIS AT OPRETTE", h2 "Opret en konto på Bikerbasen", 4 ægte fordele (favoritter, gem søgning, administrer egne annoncer = opret/rediger/slet findes, se sælgerens navn), CTA "Opret en gratis konto →", "Allerede medlem? Log ind her". "Forlæng/pause" udeladt (findes ikke).
- **Bundstrimmel**: 4 ægte punkter (samlet ét sted, kilden på hver annonce, gratis for private, telefonnummer valgfrit/ikke vist for købere). Ingen tal.
- **Opret-tilstand**: klik på CTA bytter venstre halvdel til registreringsformularen (titel/tekst skifter; `data-lgmode` på `<html>`, `data-authtab` fra `?redirect=opret-annonce.html` virker stadig uden layoutspring). Alle trin bevaret: opret, bekræft-mail/send igen, forhandler+CVR, glemt, nulstil (trin 2), fejlbokse, redirect (hvidliste), kontekst fra `?redirect=`.
- **Mobil (<960)**: login først, fordelene under; felter 16 px; knapper >=44 px.
- **afmeld.html**: samme scene med ét kort (`.lg-solo`); inline-scriptet urørt.

## Rettelser
- **F-013**: `js/login-fejl.js` (ny, testet) genkender netværksfejl (Chrome/Safari/Firefox/AuthRetryableFetchError/status 0) -> "Vi kunne ikke få forbindelse. Tjek din internetforbindelse, og prøv igen om lidt." Alle kald (login, signup, resend, glemt, ny kode) kører via `sikkert()`, så kastede fejl også fanges. Ukendt engelsk vises aldrig rå.
- **F-020**: øjeknap er tilføjet (også på opret/ny kode).
- **F-012**: mine filer rører ikke storage. Den resterende uncaught `blocked` kommer fra **js/store.js** (delt lag) — se DELT-ØNSKE. Siden tegner og virker uden localStorage.

## Matcher IKKE billedet (bevidst)
- Ingen Google/Facebook/Apple-login (findes ikke; Google-knappen er fjernet), ingen "120.000+", ingen håndskrevne taglines/ikoner på fotoet (opdigtet reklametekst), CTA er brandfarve, ikke grøn. Pillen er brandtonet (grøn kun til ✓). Header er sitets egen (delt lag), ikke billedets menu.
- Fotoet er sitets hero (sportscykel, ingen rytter) — motorcyklen i højre side erstatter rytteren.

## DELT-ØNSKE
- `js/store.js`: `safeStorage`-lag (try/catch + hukommelsesfallback). Bisect på login.html: kun store.js kaster ved blokeret localStorage (`PAGEERROR blocked`, F-012). `js/backend-bridge.js:112` læser også `localStorage.getItem` uden try.
- Evt. `.site-footer{margin-top}` påvirker alle fuldbleed-sider; jeg udligner lokalt med negativ `margin-bottom` på `.lg-main`.

## Tests
- Ny: `js/login-fejl.test.js` (5 tests, node:test; tilføj til `npm test`). `npm test`: 364/364 grønne. `node --check` alle js/scripts/crawler OK.
- Playwright mod mocks (page.route på supabase.co, ingen rigtige kald/konti): 26/26 flows PASS — login ok + redirect (også `?redirect=dashboard.html`), forkert kode, netværksfejl (login/glemt/opret), glemt success, opret (bekræft-mail), allerede oprettet, opret-annonce-kontekst, nulstil trin 2 (for kort/gemt->redirect/udløbet), øje (tastatur), blokeret localStorage (siden tegner; 1 kendt fejl fra store.js).

## Målt
- Vandret overflow: 0 på 36/36 kombinationer (login, login-opret, afmeld x 320/360/390/768/1024/1440 x lys/mørk).
- Kontrast (worst-case pixel bag tekst, lys+mørk, 1440/1024/390): alle tekster >=4.5:1 (lav var 3.5 på 1024 før gradientrettelse); CTA 5.02 (lys) / 6.45 (mørk). Input-kant via token (>=3:1). Én h1, title/canonical/noindex uændret.
- Konsol: ingen fejl (kun store.js-`blocked` i blokeret-storage-testen).
- 5 visuelle iterationer (1440/390, lys/mørk): motorcykel bag tekst -> fotoforskydning; foto under strimmel/footer-hul -> negativ margin; kontrast på 1024 -> solid flade.

## Filer / commits
`login.html`, `js/login.js`, `afmeld.html`, nye `css/p-login.css`, `js/login-fejl.js`, `js/login-fejl.test.js`, denne rapport. Commit på gauntlet/login, ikke pushet. Kendt rest: login.html bruger `<link href="css/p-login.css">` uden `?v=` (stampes af build); forhandler-opret-tilstand er høj på desktop (højre halvdel strækker sig).
