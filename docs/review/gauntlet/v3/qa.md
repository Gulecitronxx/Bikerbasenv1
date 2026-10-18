# V3 Agent 5 — Independent Quality & Regression

Metode: Gauntlet-loop i undersøgerrolle. Se `qa-fund.md` for alle verificerede fund med bevis og routing.

1. Udgangspunkt: live bikerbasen.dk målt i Playwright Chromium 151, Chrome 155 og Edge 155 (normal + alle tredjeparter blokeret).
2. Hypoteser for "virker i Brave": (a) ikke-Brave fejler — ikke reproducerbar i rene Chromium-browsere; (b) Brave fejler — cookie-filtre skjuler `<dialog id="cookie-banner">` der er `showModal()`, hvilket gør siden inert og usynligt blokeret. Reproduceret og rettet.
3. Rettelse + test (`scripts/v3-cookie-filter.test.js`): grøn. Efter: skjult dialog lukkes, link kan klikkes (`qa/sim-cosmetic-cookie.png`).
4. Regressionsrunner `scripts/v3-regression.js` (101 sider × 5 viewports × 2 temaer): 0 fejl på alt undtagen CLS-fund B1.

Dimensioner (1-10, observationer): funktionalitet 8 (cookie-failsafe fundet; resten rent), mobil 9 (0 overflow 375/430), performance 8 (CLS-fund B1, kontosider tunge), visuel/designkonsistens/indhold: ikke vurderet af QA-agenten (uden for scope; Critic dømmer).
Restpunkter: Firefox/WebKit ikke testet (kræver installation); ejerens præcise symptom ukendt (se A5 i qa-fund.md).
