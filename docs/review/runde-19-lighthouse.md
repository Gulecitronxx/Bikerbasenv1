# Runde 19 — kvantitativt opgør mod bilbasen.dk (aim-loop, 27.09.2026)

Efter runde 18 konkluderede, at endnu en skærmbillede-sammenligning af de
samme fem sider ville gentage "aftagende udbytte", skiftede denne runde
metode: rigtige Lighthouse-audits og en performance-trace mod begge sites,
kørt live i browseren — målt, ikke gættet.

## Lighthouse (Chrome DevTools MCP, desktop + mobil, 27.09.2026)

| | Bikerbasen | Bilbasen |
|---|---|---|
| Accessibility | **100** | 80 |
| Best Practices | **100** | 77 |
| SEO | 100 | 100 |
| Agentic Browsing | **100** | 50 |
| Passed / Failed | 43 / 0 | 51 / 9 |

Identisk på desktop og mobil for begge sites. Bikerbasen vinder tre ud af
fire kategorier klart og deler den fjerde. Ingen gættearbejde her — det er
samme audit, samme værktøj, samme dag.

## Performance-trace (lab, ingen throttling)

| | Bikerbasen | Bilbasen |
|---|---|---|
| LCP (lab) | 482–565 ms | 576 ms |
| CLS (lab) | 0.00 | 0.05 |
| LCP (felt, CrUX) | ingen data (for lidt trafik) | **1 588 ms** (p75) |
| INP (felt, CrUX) | ingen data | 76 ms |
| CLS (felt, CrUX) | ingen data | 0.09 |

Bikerbasen vinder på lab-tal alene. Bilbasens egne RIGTIGE brugere oplever
desuden en markant værre LCP (1 588 ms) end lab-målingen viser (576 ms) —
"Load delay" alene er 1 519 ms af det, sandsynligvis tredjeparts
annonce-/samtykke-scripts (siden har et separat `ThirdParties`-insight,
og cookiemodalen findes for hver session).

## Den ene reelle finding — allerede kendt, allerede kodet

Bikerbasens `Cache`-insight viste: **alt** eget statisk indhold — hver
`.js`-fil, `styles.css`, begge `.woff2`-fonte, `logo-mark.png`,
`img/hero-800.webp` — cachelagres kun **600 sekunder**, selvom hver fil er
navngivet med et indholds-hash i query-strengen (`?v=2610a332`). Det er
netop den slags filer, der trygt kan cachelagres for evigt: ændrer
indholdet sig, ændrer hashet sig, og URL'en er en ny fil.

Dette er **ikke en ny finding**. `scripts/cloudflare-setup.js:1-9`
dokumenterer det ordret, dateret 23.08.2026: "Cache-Control: max-age=600
paa alt, ogsaa de ?v=-stemplede filer" — sammen med manglende HSTS,
X-Content-Type-Options og en rigtig frame-ancestors-header, som GitHub
Pages ikke kan sætte selv. Scriptet, der retter alle fire i ét hug via en
Cloudflare-proxy foran GitHub Pages, **findes allerede og er klar til at
køre** — det venter kun på `CLOUDFLARE_API_TOKEN` i miljøet og den
énmalige DNS-omlægning hos one.com (`docs/CLOUDFLARE.md`).

Det, denne runde tilføjer, er ikke koden — det er **frisk, uafhængig
måling der bekræfter, at gabet stadig er der og stadig koster noget**:
1 588 ms LCP for Bilbasens rigtige brugere, mens Bikerbasens egen lab-tal
(hvor gabet ikke findes endnu) allerede ligger under 600 ms.

## Konklusion for aim-loopet

To uafhængige metoder — blind skærmbillede-sammenligning (runde 1-18) og nu
kvantitativ Lighthouse/trace-måling — lander på samme sted: **det, kode
alene kan vinde ved at kigge på bilbasen.dk, er vundet.** De resterende
gab er præcis de fire, runde 9's kritiker navngav, og det bekræftes igen
her på den femte (cache/headere — kræver Cloudflare-nøglen). En tredje
aim-loop-cyklus mod de samme to sites, uden en af nøglerne i hånden,
forventes at finde det samme igen.
