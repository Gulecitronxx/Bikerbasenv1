# Builder w7-visuel (bølge 7) — Bikerbasen Gauntlet

Branch `gauntlet/w7-visuel` fra 03dd9a1. Kilde: blind Critic (bølge 5+6). Måling: Playwright mod lokal mock (page.route på Supabase og fotovaerter; ingen produktion), dev-server port 8807, scripts udenfor repoet (`C:\Users\pasca\Desktop\rod\w7v_tmp`).

## Acceptkriterier (skrevet FØR bygning)

| Id | Kriterium (måles før/efter) |
|---|---|
| W7-1 | `soegning.html?q=honda` ved 390 px: dokumenthøjden falder fra ca. 12212 px mod 11712 px (mål: <= 11712, helst lavere), uden at skjule indhold (samme antal kort i DOM og synlige) og uden tap-mål < 40 px på kort-handlinger (hjerte, sammenlign, kortlink). Kortgitteret er samme kompakte 2-kolonne som `.fa-flere`/`.brand-liste-sektion`. Ingen vandret overflow. |
| W7-2 | Facetsider (type-, kørekort-, region-, budget-, by-sider) ved 390x844: første filterfelter Type og Maks pris ligger helt over folden (bund <= 844). Breadcrumb-/knap-tryk-mål >= 40 px. Hero højst så høj som før w5 (28 px lavere end nu). |
| W7-3 | `.rk-linje` bruger hverken negativ margin eller clip-path. Test: fokusring på `.card-link` og første/sidste tegn i linjen klippes ikke (getBoundingClientRect + elementFromPoint/pixel), ingen orphan `\|` (0 synlige skillestreger først på en linje) i 4 bredder. |
| W7-4 | Hero (forside, 390 + 1440, lys + mørk): motorcyklen tydeligere synlig end nu (målt som middel-luminanskontrast/fotoets lysstyrkespænd i den øverste/midterste zone, plus screenshot læst), og 90. percentil-kontrast for h1, ingress, tillidsrække >= 4,5:1 (pixelmetode i nederste tekstzone). Mindst 5 konkrete designforbedringer ift. `Bikerbasen billeder`; de mindst risikable implementeres, hver med før/efter. Orange/kobber primær, grøn kun ✓, ingen opdigtede tal. |
| W7-5 | CLS < 0,05 (PerformanceObserver layout-shift uden nylig input, hele sidens livscyklus + 2 s efter hydrering) for hydreret annonceside (mock med listings + photos), facetside og søgning ved 320/390/1440. Kontrast målt med pixelmetode i lys + mørk. |
| Generelt | scrollWidth == clientWidth på alle målte sider ved 320/390/768/1440, lys + mørk; `node --check js/*.js`; `npm test` grøn; nye testfiler `js/w7-visuel*.test.js`; CRLF/LF bevaret pr. fil. |
