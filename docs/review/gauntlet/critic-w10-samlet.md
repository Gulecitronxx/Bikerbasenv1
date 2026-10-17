# Critic w10 samlet (blind) — fc8cf79 mod origin/main 15c229c

Dom: PUSH. Ingen P0/P1.

## Kørt i temp-kopi (git archive, junction til node_modules)
- `npm test`: 1049/1049 grønne.
- `verificer-site.js --hurtig`: 7/7 trin grønne. `seo-audit.js`: 92 sider, 63 indekserbare, 0 fund.
- `udgiv.js`: GRØN ("Alle referencer ... peger paa filer, der er med"; 157 filer, 92 HTML).
- `smoke-browser.js --strikt`, 57 sider (forside, søgning, annonce, mærker, alle maerke-*, model, by, region, type-*, koerekort-*, budget, guides, guide-*, login, om) x 320/390/768/1440 x lys+mørk = 456 målinger: 0 fejl, 0 advarsler (CLS, overflow, tap-mål, døde links, CSP).
- Egne Playwright-scripts (banner.js, search.js i temp): fejlbanner 10 sider x 390 (mørk)/1440 (lys) x 503/tom/abort; søgeside 24/140/tom/503 x 390/1440 x lys/mørk.

## Fejlbanner
- Overlay: position fixed, under headeren (hdr 68 px, banner top 76), dækker aldrig headeren. Alle sider med banner: role=alert, "Prøv igen" + "Luk". Tastaturrækkefølge og Luk/Prøv igen dækkes af forfatterens test (grøn).
- CLS 0 / <0,02 på søgesiden i alle 16 søgeside-kombinationer; ingen overflow, ingen sidefejl.
- Forsiden viser ingen tal under banner (ingen "N annoncer i Danmark").

## Fund
- P2 js/backend-bridge.js + css/styles.css `.data-afbrud` (soegning.html @390, 503/abort): overlayet (153 px, 18 % af viewport) dækker søgefeltet `#filter-q` og "Søg"-knappen i første skærmbillede, og følger med ved scroll. Brugeren er ikke spærret ("Luk"), men det første man vil trykke på er skjult, indtil man lukker. Overvej kun at vise banneret kompakt på mobil (en linje + Prøv igen/Luk) eller auto-skjul ved scroll.
- P2 maerke-/by-/region-/type-/koerekort-/budget-/model-sider under 503/tom/abort: indbagte byggetal står stadig synligt under banneret ("163 motorcykler til salg i Midtjylland", "88 motorcykler til A2-kørekort er indekseret", "Kort fortalt" med antal og pris-spænd, by-fliser med antal). Samme mønster som før (data-fa-n bages ved build, hydreres kun ved svar), og "indekseret" er ikke "aktuelt til salg", men banneret siger "tallene ... dækker det, der faktisk er til salg" lige over. Kun #facet-antal "0 annoncer" er håndteret (skjulNulTalVedFejl). Ikke blokerende; overvej at dæmpe/skjule `[data-fa-n]` under fejl.
- P3 soegning.html tom (200 + []): intet banner, men tom-tilstand med "Vi kunne ikke hente"-tekst; acceptabel og konsistent (503/abort giver banner + tom-tilstand med dobbelt "Prøv igen" på mobil, kosmetisk).
- P3 js/search.js:2359 sorteringsskift nulstiller ikke `page` (URL bliver `?sort=price-asc&page=2`). Uændret ift. 15c229c, altså ikke en regression.
- P3 koerekort-a "354 motorcykler ... oplyste effekt ligger over A2-grænsen" næste linje "162 annoncer ... mangler en oplyst værdi ... vises ikke her": korrekt og ærligt (fixturetal), blot tæt formuleret.

## Søgesiden (billede 2)
- Screenshots 390/1440 lys+mørk med 24 og 140 annoncer (grid, filter-sidebar, "Viser 1–24 af 140 motorcykler", paginering, "Gem søgningen"-panel) renderer rent, ingen overflow. "Viser alle 24", panelet skjules ved tom/503. Gem søgning er ærlig: "Der sendes endnu ingen e-mails"; efter klik "Søgning gemt — fjern" + toast "gemt her på enheden". Scroll uændret efter Gem søgning og efter sortering (1200 -> 1200); side 2-link `?page=2`. Sammenlign-/favorit-scrollmåling var upålidelig i mit script (mine selectors), derfor ikke afgjort her; ingen regression set i de 456 smoke-målinger. Tilbage-knap gav forventet URL.

## Kategorisider
- Kort fortalt kun oplyste tal; ingen opdigtede (kk-tal "ikke udelukket til A2 ud fra den oplyste effekt"; priser "ikke alle annoncer oplyser en pris"). A2 = 20 år; "Kørekort ikke afgjort — tjek kW" findes på koerekort-a2 (48–49 hk ikke afgjort bevaret). Ingen løfter om beskeder/betaling/MitID.
- By-fliser: data-fa-n="by:<postnr>", skjules ved 0. byChips fjernet fra region-sider, men by-sider linkes via fliser (verificer-site: ingen døde links; seo-linkgraf-test grøn).
- Guides: indholdsfortegnelse som details (åben på desktop, lukket mobil); smoke grøn på alle 7 guides.

## Footer
- Ét fælles footer-mønster (3 varianter i alt på 92 sider, uden fund), guides-kolonnen har alle 7 guides + oversigt + sikkerhed, ingen døde links, skip-link `#main-content` på alle sider, `nav` med aria-labelledby, aria-pressed synkroniseres via JS (kode gennemgået; test grøn). Tap-mål og kontrast: ingen smoke-advarsler.

## Ikke dækket
- visuel-regression mod baseline (tidsbegrænsning; smoke + screenshots dækker). Mørk/lys-sammenligning af de 10 nøglesider er kun stikprøve (søgning, region, forside).
