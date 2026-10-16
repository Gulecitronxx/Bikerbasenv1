# Builder w6-verificer — scripts/verificer-site.js

## Acceptkriterier (skrevet først)
1. `node scripts/verificer-site.js [--hurtig]` kører syv kontroltrin og udskriver én linje pr. trin + en opsummering; exit 0 kun hvis alle trin er grønne, ellers exit 1.
2. Trin: (1) `node --check` på js/, crawler/, scripts/ *.js; (2) `npm test` (springes over med `--hurtig`); (3) `scripts/synk-header.js --tjek`; (4) seo-audit (`analyser()`), fejler ved ét eneste fund; (5) sitemap.xml: hver URL findes som fil og er indekserbar (ikke noindex), ingen dubletter; (6) ingen indekserbar side har `<a href>` til en intern fil, der ikke findes; (7) alle `*.test.js` direkte i js/, scripts/, crawler/ står i package.json `scripts.test` — de manglende listes; (8) opsummering med exit-kode.
3. Kun læsning af disk. Kører aldrig build.js, udgiv.js, stamp-version.js eller noget, der rammer netværk/Supabase.
4. Hver kontrol er en ren funktion `tjek*(root)` og kan fejle i en test med fixtures i temp-mapper (`scripts/verificer-site.test.js`).
5. Ingen ændringer i andre scripts eller package.json.

## Resultat
- Bygget: `scripts/verificer-site.js` (syv kontroltrin + opsummering, `--hurtig`), `scripts/verificer-site.test.js` (15 tests, fixtures i temp-mapper; hvert trin vises både grønt og fejlende).
- Genbrug: `seo-audit.analyser()` (trin 4), `seo-vagt.sideFakta()` (noindex), `site-url.js`, `synk-header.js --tjek` (kørt som proces). Ingen andre scripts rørt.
- Dødelinks-tjek (6) er ny logik (kun `<a href>` på indekserbare sider; ressourcer/`src` dækkes fortsat af udgiv.js på `_site`).
- Netværk: ingen. `npm test` er eneste proces-trin ud over node --check/synk-header.

## Trin 7 — mangler i repoet lige nu
Ingen eksisterende test-filer mangler i `package.json "test"` (alle 38+ filer i js/, scripts/, crawler/ er listet).
Eneste mangel er den nye `scripts/verificer-site.test.js` — **Orchestratoren skal tilføje den til `npm test`**.

## Målt (worktree, e5eaa90 + w6)
`npm test` 743/743 grønt, `node --check` grønt, `verificer-site` trin 1-6 grønne.
Bemærk: worktree manglede `node_modules` (crawler-tests fejlede på `yaml`); lavet junction til hovedmappens node_modules (ikke committet).
