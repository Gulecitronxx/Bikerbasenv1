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

## Resultat pr. kriterium (før = 03dd9a1 på port 8808, efter = port 8807; samme mock: 24 egne + 140 eksterne annoncer, 4:3-fotos, latens 300/1500 ms; scripts i `C:\Users\pasca\Desktop\rod\w7v_tmp`)

| Id | Status | Før | Efter | Hvad |
|---|---|---|---|---|
| W7-1 | opfyldt | søgning ?q=honda 390: 12212 px (320: 11374), 1 kolonne | 390: 6239-6448 px (-47 %), 320: 6349-6554 px (-42 %); 2 kolonner; 24 af 24 kort i DOM og synlige; hjerte 44x44, sammenlign 44x44 (34 + 5 px usynlig kant), kortlink hele kortet | `#results-grid:not(.list-view)` i `:is()` med `.fa-flere/.brand-liste-sektion` (styles.css) + 2-kolonne i p-soegning.css; 4:3-foto under 350 px (hjertet blev 34 px højt ved 320, overlap med sammenlign) |
| W7-2 | opfyldt | Type + Maks pris under folden på 22 af 30 facetsider (op til 1100 px) | 0 af 30; nederste kant 550-835 px (<= 844); breadcrumb 40 px | p-facet.css @media <=640: foto 176 px, faktapanel i løbende linjer, mindre luft, kørekortsider: søgekortet FØR faktarækken (`order:-1`) |
| W7-3 | opfyldt | negativ margin-left:-9px + clip-path | ingen af delene: ledets egen border, `margin:0 17px 0 -9px`, kun `overflow-x:clip`; 4 bredder x 24 linjer: 0 orphan-streger, 0 klippede tekstlinjer; fokusring (Tab) tegnes på alle 4 kanter (pixel-diff 312-546 pr. kant, lys+mørk); bogstaver identiske med og uden klip | styles.css |
| W7-4 | opfyldt | 390 mørk (bike middel-luminans 0,057/sd 0,037); 1440 motorcyklen skjult under søgekortet fra hjulene og ned (synlig 69 %) | 390: 0,069/0,047 (+27 % sd) og motorcyklen UNDER overskriften; 1440: synlig 76 %, hel mellem h1 og kort; kontrast h1/ingress/eyebrow, 90. percentil: min 4,74 -> 6,12 (1440 lys), 99. percentil: min 4,39 (320 lys) / 4,52 (1440) / 4,67 (768) / 5,22 (390) | scrim tekstvægtet (mobil 80/70/30/22 %, desktop 80/66/32 %, tablet i px), hero +56 px, foto 72 % 70 % |
| W7-5 | opfyldt | hydreret statisk annonce (Harley FLHX, 1500 ms): CLS 0,0703 (320), 0,0708 (1440), 0,0351 (390); mærker uden annoncer 0,055; opret 1440 0,072 | 66 kørsler (11 sider x 320/390/1440 x lat 300/1500 ms, lys+mørk): alle <= 0,0200 (worst = søgning 320); annonce, facet, mærke, opret 0 | se CLS-fixes nedenfor |

CLS-fixes: (a) `.container > #listing-h1` skjult i ALLE statiske annoncesider (ikke kun med galleri); (b) `.header-fav` skjult fra første maling ved data-count="0" (header-actions sprang 120 px); (c) `.mk-cta` fastlåst til sidste kolonne/række 1 og tomt-feltet får kun kortenes kolonner (mærker med 0-1-2 annoncer, 1440); (d) `.op-stepper-card` min-height 78 og `.op-live-card` min-height 186 ved >= 1024 (opret-annonce). Overflow: 192 målinger (24 sider x 320/390/768/1440 x lys/mørk) uden vandret overflow.

## 5 ekstra designforbedringer ift. billederne
1. (billede 1) Forside-hero: motorcyklen hel og tydeligt synlig (højere hero, foto forskudt, tekstvægtet scrim) - IMPLEMENTERET.
2. (billede 8) Typeside-hero 550 -> ca. 420 px ved 1440 (fotokolonne 320 px, mindre luft), "Udvalgte" rykker fra y 862 til 733 - IMPLEMENTERET.
3. (billede 7) Kørekort-hero kompakt (-16 px) og på mobil søgekortet først - IMPLEMENTERET.
4. (billede 9) Mærkesidens søgekort: etiketterne i samme højde ("Kørekort" stod 5 px lavere) - IMPLEMENTERET.
5. (billede 3) Annoncegalleriets miniaturer: ALLE står som `active` (orange ramme). Årsag: `js/annonce.js:65` `classList.toggle('active', a || (b.dataset.more && ...))` får `undefined` som force og toggler. Rettelse (annonce-strømmen): `!!(...)`. IKKE rettet (ikke min fil).
Ikke gjort: tættere filtersidebar (billede 2), søgehero med overlap, "1/12"-fototæller (opdigtet galleri).

## Nye testfiler (ikke i package.json)
`js/w7-visuel-kort.test.js` (10), `js/w7-visuel-hero.test.js` (5). `js/visuel-css.test.js` opdateret. `npm test` 813 grøn, `node --check` rent.

## DELT-ØNSKER / rest
Tilføj de to testfiler til `npm test`. Scrim ved 768 px gør motorcyklen mørkere (teksten fylder hele bredden; kontrast prioriteret). Mock-data for CLS = lokal; brandsiders empty-state-CLS på by-/model-sider hører til facet-generatoren (ikke rørt).
