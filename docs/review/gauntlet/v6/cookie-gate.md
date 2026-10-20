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
(udfyldes nedenfor)
