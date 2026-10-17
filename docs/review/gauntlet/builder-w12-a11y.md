# Builder W12 — automatisk tilgængelighedsaudit (WCAG 2.2 AA)

## Acceptkriterier (skrevet FØR koden)
1. `node scripts/a11y-tjek.js` genbruger smoke-browser.js' server, net-mock og fixtures (al trafik udefra blokeres, ingen produktion) og gennemgår alle rod-`*.html` (eller `--sider`, `--hurtig`) ved 390 og 1440 px, lys og mørk. axe-core er IKKE installeret og tilføjes ikke; alle tjek er egne.
2. Tjek (regel-id i parentes): a) html lang=da, title, én h1, overskriftsspring (`sprog`, `titel`, `h1`, `overskrift-spring`); b) landmarks, unikke nav-labels, skip-link (`landmark-*`, `nav-navn`, `skip-link`); c) navne på felter/knapper/links, ens linktekst til forskellig destination (`felt-navn`, `knap-navn`, `link-navn`, `link-tvetydig`); d) billed-alt (`billede-alt`); e) kontrast 4,5/3:1 med gradient/billede som separat `kontrast-uafgjort`; f) fokus: synlig indikator, ikke skjult, tastaturfælder, klikbare ikke-fokuserbare, modal/drawer: fokus ind, fanget, Escape, fokus retur; g) ARIA: roller, referencer, dublerede id, expanded/pressed, aria-hidden på fokuserbart; h) tap-mål ≥24 (≥40 primære); i) prefers-reduced-motion; j) reflow 320 px og 200 % zoom (720 px) uden vandret scroll; k) tekstafstand 1.4.12 (afklipning/overlap); l) live-regioner for fejl/status.
3. Output: konsol-tabel, `--rapport fil.json`, `--md fil.md` (prioriteret, grupperet pr. regel og sidefamilie med selector og forslag). Fund dedupliceres på tværs af viewport/tema med "hvor".
4. Prioritet P1 (blokerer tastatur/skærmlæser), P2, P3; `kontrast-uafgjort` rapporteres separat og tæller ikke. Exit 0 normalt; `--strikt` giver exit 1 over tærskel (`--maks-p1 0 --maks-p2 0 --maks-p3 uendelig`); exit 2 hvis Chromium ikke kan starte.
5. `scripts/a11y-tjek.test.js` (node:test): bevidste fejl (knap uden navn, input uden label, dubleret id, overskriftsspring, lav kontrast, fokusfælde, modal uden Escape) fanges af hvert sit tjek, og en ren side giver 0 fund. Skipper tydeligt uden Chromium.
6. Fundlisten ligger i `docs/review/gauntlet/a11y-audit-w12.md`: top 25 prioriteret, med ejer-fil/generator og præcis ændring.
7. `node --check` på alle scripts og `npm test` grønt. Ingen ændring af andre strømmes filer (kun `scripts/a11y-tjek.js`, `.test.js`, `docs/`). `git status` rent for genererede filer (ingen build/generatorer kørt).

## Brug
```
node scripts/a11y-tjek.js --hurtig                          # 8 sider ≈ minutter
node scripts/a11y-tjek.js --rapport work/a11y.json --md work/a11y.md
node scripts/a11y-tjek.js --sider index,login --strikt
```
Se resten (resultater, nye testfiler, DELT-ØNSKE) nederst efter kørsel.

## Resultat
- Fuld kørsel (92 sider, 644 målinger, 559 s): P1 2 mønstre, P2 20, P3 6, kontrast uafgjort 157. Fundliste: `a11y-audit-w12.md`.
- Nye filer: `scripts/a11y-tjek.js`, `scripts/a11y-tjek.test.js` (16 tests, ca. 35 s, skipper uden Chromium).
- **DELT-ØNSKE til Orchestratoren:** tilføj `scripts/a11y-tjek.test.js` til `npm test` i package.json.
- Ingen build/generatorer kørt; ingen andre filer ændret.
