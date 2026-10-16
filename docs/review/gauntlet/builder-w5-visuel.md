# Builder w5-visuel (bølge 5) — Bikerbasen Gauntlet

Branch `gauntlet/w5-visuel` fra 3caffd2. Kilde: `detective2-visuel.md` (V2-001..V2-014). Måling med Playwright mod egen mock (page.route; ingen produktionslæsning; fotofiler 260-330 KB for egne annoncer og 70-90 KB for eksterne), dev-server port 8803, scripts udenfor repoet (`C:\Users\pasca\Desktop\rod\w5v_tmp`).

## Acceptkriterier (skrevet FØR bygning)

| Id | Kriterium (måles før/efter) |
|---|---|
| V2-001 | Hvid label på type-/kørekort-/region-fliser (`.fa-typer a`) og forsidens `.tile`: 90. percentil af pixlerne i flisens nederste 40 % giver >= 4,5:1 mod hvid, lys og mørk, 390 og 1440, også med et ERSTATTET helt hvidt foto (worst case). Samme bundgradient som forsidens fliser. |
| V2-002 | h1, kicker og ingress i heroen på guide-a2, om-bikerbasen, 404, koerekort-a2, maerke-yamaha: 90. percentil af pixlerne bag teksten >= 4,5:1 ved 390 og 1440 (lys + mørk). Scrim kun lokalt bag tekstkolonnen; fotoet stadig tydeligt synligt (screenshot læst). |
| V2-003 | CLS <= 0,02 på statisk annonceside ved 390 og 1440 (PerformanceObserver, mock). Breadcrumb-højde reserveret i CSS. |
| V2-004/005 | CLS <= 0,03 ved 320/360/390/1440 på type-scooter, region-hovedstaden, budget-under-50000, maerke-yamaha og soegning.html?q=honda. |
| V2-006 | Kort uden for første række har loading=lazy + decoding=async; første række har fetchpriority; LCP-element (hero) ikke lazy. Billedbytes ved første load på forside 1440/390 før/efter (mock). |
| V2-007 | 12 sider x 390/1440: 0 interaktive elementer < 24 px i højde/bredde (sigt 44 px); breadcrumb og indholdsfortegnelse >= 40 px høje. |
| V2-008/009/010 | Kort i samme række har ens chip-række-y (±1 px); ingen orphan "\|" ved nogen kortbredde; én tomt-foto-tilstand (samme markup/udseende i grid, liste, swipe, Lignende). |
| V2-014 | <= 640 px: kortlister som vandret skinne med scroll-snap og peek ELLER kompakt 2-kolonne; sidehøjde ved 390 falder >= 30 % på koerekort-a2 og maerke-yamaha; kort kan nås med tastatur; ingen sideoverflow. |
| Generelt | scrollWidth == clientWidth på alle målte sider/bredder; `npm test` grøn; `node --check`; linjeskift bevares. |

## Resultat pr. kriterium (før -> efter; mock med 1,5 s Supabase-latens, Playwright; scripts udenfor repoet i C:/Users/pasca/Desktop/rod/w5v_tmp)

| Id | Status | Før | Efter | Hvad |
|---|---|---|---|---|
| V2-001 | opfyldt (var allerede; gradient styrket) | Detectivens 2,1-3,3 er et måleartefakt: han klippede de øverste 60 px af flisen (uden gradient). Rigtig måling i nederste 40 %: 8,7-15,5 på fotos; 4,53-4,66 med erstattet HVIDT foto (worst case) | 32 rækker (lys/mørk, 390/1440, foto + hvidt foto, 4 sider): 0 under 4,5, min 10,52 | `.fa-typer a::after` = samme gradient som `.tile::after` |
| V2-002 | opfyldt | 108 tekstmålinger (h1, kicker, ingress, brødkrumme; 6 sider; lys/mørk; 390/1440; tæt tekstboks, 90. percentil): 5 under 4,5 (guide-h1 390 2,58; 404-h1 3,21; mærke-h1 390 mørk 3,36) | 0 under 4,5, min 7,61 | scrim med px-stop bag tekstkolonnen (>= .62-.64), mobil-overlay på mærkesider >= .72 i begge temaer; fotoet stadig synligt (screenshots læst: guide 390 lys, mærke 390 mørk) |
| V2-003 | opfyldt | CLS 0,1043 (390) / 0,0736 (1440) | 0,0008 / 0,0011 (320-1024 også <= 0,0024) | `.bc-sep` reserverer 14 px (årsag: tom span fik SVG ved hydrering); `.an-crumbrow` min-height efter hydreret tilstand; knaprække én række; statisk øverste h1 skjult (`:has(.prerender-gallery)`), så `.listing-detail` starter samme y |
| V2-004/005 | opfyldt | region 360 0,1167; budget 320 0,121; søgning ?q 0,0388/0,0286/0,0293/0,0134 | alle 0-0,0016; søgning ?q max 0,0201 (320), 0,0106/0,0114/0,013; mærke-yamaha max 0,0011 | årsagen på facetsiderne var den samme brødkrumme-separator (ikke tallene); søgning: chip-række min-height 28 px på mobil |
| V2-006 | delvist | forside 390: 6 fotohentninger, 1037 KB (1213 KB billeder i alt); 1440: 967 KB | forside 390: 2 fotos, 575 KB (752 KB i alt, -38 %); 1440 uændret (alle 5 kort i første skærm) | `js/home.js`: kort 3-6 i mobilskinnen får src først ved nærhed (IntersectionObserver; Chromes lazy-tærskel hentede dem alligevel). Kort uden for første række har loading=lazy + decoding=async i forvejen; hero er ikke lazy. Søgning/kørekort/region uændret (Chromes tærskel 1250 px). Resizing/Supabase image transform er KUN forslag (backend): originalfotos er 260-330 KB pr. kort |
| V2-007 | delvist | 210 elementer < 24 px (12 sider x 390/1440; breadcrumb/TOC 19-20 px) | 52 (49 er søgesidens 18 px filter-checkboxes ved 1440 i klikbare label-rækker; 3 inline-links adskilt af "·"). Breadcrumb og TOC 40 px | brødkrumme 40, TOC 40, "Få besked" 44, sidetal/pile (var 10 px brede: `<a>` var ikke stylet efter D8-S2), info-ikon, footer-tema, section-link, summary, selvstændige links >= 24 |
| V2-008 | opfyldt for ét layout; delvist for chip-y | to layouts (253/330 px); 14 af 27 flerkortsrækker forskudt | ét layout (pris under titel overalt; overstyring sidst i styles.css); 8 af 105 rækker (4 bredder x 6 sider) forskudt | chips+fod i bunden. Rest: naboer med 1 vs 2 chip-rækker, og mærkesidens fremhævet-gitter blandet med panel |
| V2-009 | opfyldt | orphan "\|" i Lignende | 0 synlige orphans (105 rækker) | streg til venstre på hvert led; linjen klippet 9 px ind |
| V2-010 | opfyldt (var allerede) | grid, liste, swipe, Lignende bruger samme `.foto-tom` (kun teksten adskiller sig; begge tilstande set på screenshot) | uændret; låst af test | `js/visuel-css.test.js` |
| V2-014 | opfyldt | kørekort-a2 14136 px, mærke-yamaha 11356 px (390) | 9700 px (-31,4 %), 7726 px (-32,0 %); ingen overflow | 2-kolonne kompakt gitter (`.fa-flere`, `.brand-liste-sektion` under 560 px; 16:10-foto, 2-linjers titel, mindre chips) frem for skinne, fordi 19-24 kort er en liste man skal kunne skimme; mærkesidens tre kolonner er en skinne med scroll-snap og 82 % bredde (peek). "Udvalgte" var allerede en skinne. Tastatur: grid er almindelige links; links i skinnen scroller ind ved fokus |

Verifikation: `npm test` 645 grøn (+10 nye i `js/visuel-css.test.js`, endnu IKKE i package.json), `node --check` rent, vandret overflow 0 på alle målte sider/bredder, CRLF bevaret.

## DELT-ØNSKER
1. `package.json`: tilføj `js/visuel-css.test.js` til `npm test` (Orchestrator ejer filen).
2. `scripts/build-listing-pages.js` (w5-seo): server-render brødkrummens `.bc-sep`-pile og den hydrerede knaprække/titelplacering i statiske annoncesider, så CSS-reservationen (`.an-crumbrow`, skjult statisk h1) kan fjernes.
3. Merge med w4: `@container (max-width:262px)` står urørt; `.rk-top` overstyres sidst i styles.css (ét layout). w4's 300 px og dens test "præcis én container query styrer .rk-top" skal justeres ved merge.
4. Backend (forslag, ikke lavet): thumbnails ved upload (ca. 480 px) eller Supabase image transform.

## Restpunkter
Søgesidens 18 px checkboxes (label-klikbare), 3 "·"-adskilte inline-links, 8 rækker med chip-wrap-forskel. V2-011..013 og V2-015+ ikke i opgaven.
