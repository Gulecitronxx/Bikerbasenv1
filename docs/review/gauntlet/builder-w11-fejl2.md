# Builder w11-fejl2: rester fra samlet Critic w10

## Acceptkriterier (skrevet FØR koden)
1. Fejlbanneret (`#data-afbrud`) er på mobil (<768 px) kompakt: én linje + 'Prøv igen' + 'Luk', højde <= 56 px. role=alert bevares og den fulde tekst er stadig læsbar for skærmlæser; første Tab-fokus i `<main>` er stadig 'Prøv igen'.
2. Banneret auto-skjules ved scroll nedad og vises igen ved scroll opad / øverst; aldrig skjult mens fokus er inde i det.
3. Intet primært interaktivt element (søgefelt #filter-q, Søg-knap, filter-/sorteringsknapper, header-links, hoved-CTA'er) er dækket af banneret ved scroll 0: `elementFromPoint` i elementets midte rammer elementet selv ved 320/390/768/1440 på soegning, forside, mærke-, by-, region-, type-, kørekort-, budget-, model- og annoncesiden under 503.
4. Under lagerfejl/tomt lager sættes `data-lager-fejl` på `<html>`; byggede tal (`[data-fa-n]`, `[data-mk-n]`, `#facet-intro-antal`, mærkesidens intro-tal) vises som 'ukendt antal' og 'Kort fortalt'/faktapaneler dæmpes (muted farve, AA bevares). Kildens HTML er uændret (SEO). CLS < 0,05.
5. Sortering/filter-skift på søgning nulstiller `page` til 1; sidetals-links bevarer `sort`.
6. 503 på søgning giver ét 'Prøv igen' (banneret) i stedet for to; lukkes banneret, vises kortets knap igen.
7. `node --check` og `npm test` grønt.

## Ændringer
- `js/backend-bridge.js` `meldDataafbrud()`: kort aria-hidden linje + fuld tekst (`.data-afbrud-lang`, i role=alert) ; `data-lager-fejl` på `<html>` under fejl/tomt; `skjulBannerVedScroll()` (ned = skjul, op/øverst/fokus = vis); på <1024 lægges banneret under brødkrummen, hvis den ligger højt.
- `css/styles.css` (kun `.data-afbrud`-blokken + nye regler under den): kompakt række <=1023 px (højde 52 px), kort-kort-kort fra 1024; `body:has(#data-afbrud) #empty-retry-btn{display:none}`; dæmpning: `[data-fa-n]/[data-mk-n]/#facet-intro-antal/.mk-intro>strong` har transparente cifre (samme bredde = CLS 0) med '?' ovenpå (alt-tekst 'ukendt antal'); fakta-lister/intro i muted farve.
- `js/search.js`: sorteringsvælgeren nulstiller `page` (1 linje). Sidetals-links bevarede allerede `sort` (låst af test).
- `js/maerke.js`, `js/home.js`: ingen ændring nødvendig (de skriver ikke banneret; CSS tager sig af tallene).

## Før/efter (soegning, 390 px, 503)
| | før | efter |
|---|---|---|
| banner | 153 px (18 % af viewport), dækker #filter-q + Søg | 52 px, top 76-128; søgefelt starter y 193 |
| 'Prøv igen' synlige | 2 | 1 (kortets vises igen efter Luk) |
| `?sort=price-asc&page=2` -> skift sortering | page=2 bevares | page fjernet |
| CLS (alle sider, 503/tom) | 0 | 0 (<0,05 målt, fuld matrix grøn) |
Fuld matrix `W11_FULL=1`: 10 sider x 320/390/768/1440 x 503/tom, elementFromPoint på alle interaktive elementer ved scroll 0: ingen dækket (se undtagelse).

## Ny testfil (Orchestratoren tilføjer til `npm test`)
`js/w11-fejl2.test.js` (4 browsertests; standard ca. 110 s, `W11_FULL=1` ca. 210 s).

## Rest / bevidste valg
- 768-1023 px: på by-/region-sider ombrydes brødkrummen til flere linjer (eksisterende facet-layout); der vinder filterkortet, så brødkrummens links kan ligge bag banneret indtil scroll/Luk (testen undtager dem). Under 768 lægges banneret under brødkrummen.
- Cifrene i dæmpede tal står stadig i tilgængelighedstræet (kun visuelt '?'); banneret (role=alert) siger, at tallene ikke er pålidelige. Byggede tal i løbende tekst uden markup ('Oplyste priser fra ...', '162 af annoncerne') dæmpes kun til muted farve, ikke erstattet (kræver generator-markup, ikke mine filer).
- Skjult banner (visibility) kan ikke tabbes til; det vises ved scroll op/øverst.
- DELT-ØNSKE: ingen.
