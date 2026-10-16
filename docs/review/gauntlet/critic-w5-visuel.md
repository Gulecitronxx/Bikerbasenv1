# Blind Critic w5-visuel (delrapport 1)
Kopi: /tmp/crit_w5_141739/{repo (82f7011), base (3caffd2), mrg (merge på gauntlet/master e5eaa90)}. Mock via page.route, ingen produktion.
- node --check js/*.js: OK. npm test på branchen: 645/645 grøn (inkl. visuel-css.test.js).
- Merge af branchen ovenpå gauntlet/master (e5eaa90): ingen tekstkonflikter, npm test i merge 743/743 grøn.
- Dobbeltregel: styles.css (main) har @container(max-width:300px){.rk-top column}; branchen tilføjer ubetinget `.rk-top{flex-direction:column}` (styles.css ~l.4050) -> containerforespørgslen er død kode, og main's kommentar ("≤300 stablet, >300 side om side") er løgn. Testen 'præcis én container query' består stadig (blokken findes).
(måledata følger)

## Dom: ACCEPTER med P2-justeringer (ikke fuldt målt, se huller)
Målt (mock, Chrome 155 via Playwright, kopi i /tmp, branch 82f7011 vs base 3caffd2):
- Sidelængde 390: type-cruiser 13083->8839 px (-32 %), by-horsens 9259->6843 (-26 %), region 7283->6273 (-14 %), maerke-honda 16141->9946 (-38 %). soegning?q=honda 11712->12212 (+4 %, længere, ikke kortere), index 6212->6227.
- Forside 390: fotos med src ved load 6 -> 2 af 6 i skinnen (img-requests 18 -> 14); LCP uændret (172/132 ms mock).
- Kort: .rk-top column overalt, pris under titel (priceBelow true; base: row). Chips-top y ens (280).
- Mærkeskinne 390: kolonner 294 px, rail scrollWidth 937/client 390, sidens scrollWidth 390 (ingen sideoverflow); fokus på sidste link scroller skinnen (scrollLeft 547). Ingen tabindex/role/aria-label på .mk-cols.
- Paginering soegning 390: knapper/sidetal 40x40 (base: A 10x24 / 18x18), pæn, brugbar.
- Dark 390/1440 alle 25 sider: ingen vandret overflow, ingen null/undefined, ingen konsolfejl (kun 404/blokerede eksterne). Cls-sweep 320/360/390 på 7 sider: ingen overflow. Lys-sweep 320/390/768/1440 over 25 sider blev ikke færdig inden for tiden.
- node --check OK; npm test 645/645 (branch), 743/743 (merge på gauntlet/master e5eaa90, ingen konflikter).

Fund:
- P2 (merge) css/styles.css ~l.4049-4050 `.rk-top{flex-direction:column...}` ubetinget + `.rk-pris.pris-mangler{text-align:left}` gør main's `@container (max-width:300px){.rk-top...}` (l.827) til død kode; main's kommentar (<=300 stablet, >300 side om side, w4-Critic P2-1) er forkert efter merge, og testen 'præcis én container query styrer .rk-top' består kun fordi blokken stadig står. Ret: slet @container-blokken + omskriv kommentaren, eller flyt branchens regler ind i den og opdatér testen til 'ingen container query styrer .rk-top'. Ingen tekstkonflikt.
- P2 (a11y, krit. 7) css/p-maerke.css (~l.269) mærkeskinnen er scrollbar uden tabindex/role="region"/aria-label og uden synlig scroll-indikator (scrollbar skjult); kun linkfokus scroller den. Tilføj aria-label pr. kolonnegruppe eller role=region + tabindex=0, evt. peek-skygge.
- P2 (krit. 7) søgesiden ?q=honda er ~500 px længere ved 390 (kompakt gitter kun på .fa-flere/.brand-liste-sektion, ikke SRP).
- P3 facetside 390: hero 28 px højere (breadcrumb min-height 46), så første filterfelter (Type/Maks pris) rykker under folden.
- P3 .rk-linje margin-left:-9px + clip-path:inset(0 0 0 9px) er et hack, der kan klippe fokusring/ordfyld; test med lang linje.
- P3 hero-scrim 390: foto mærkbart mørkere (motorcykel til højre dæmpet, men synlig); mod brugerbillederne let mere generisk/mindre modigt, kort-stablingen (pris under titel) bringer dog kortene tættere på billederne.
Huller (ærligt): CLS målte 0,000 for både base og branch på alle 7 sider, også annonce, hvor builderen angiver 0,07-0,12; annoncesiden kunne ikke hydreres med min mock (tom listings), så CLS-kriteriet er IKKE verificeret af mig. Kontrastmålingen (pixel-metode) gav støj (kicker, lukket details) og er ikke konklusiv; visuelt er hero-tekst læsbar på 390. Et overflow-udslag på region-hovedstaden (sw 2568) var testartefakt (serverafbrud under parallel last, ikke reproducerbar 8/8 ved ro).
