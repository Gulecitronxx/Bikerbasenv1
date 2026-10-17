# Builder w11-fejl2: rester fra samlet Critic w10

## Acceptkriterier (skrevet FØR koden)
1. Fejlbanneret (`#data-afbrud`) er på mobil (<768 px) kompakt: én linje + 'Prøv igen' + 'Luk', højde <= 56 px. role=alert bevares og den fulde tekst er stadig læsbar for skærmlæser; første Tab-fokus i `<main>` er stadig 'Prøv igen'.
2. Banneret auto-skjules ved scroll nedad og vises igen ved scroll opad / øverst; aldrig skjult mens fokus er inde i det.
3. Intet primært interaktivt element (søgefelt #filter-q, Søg-knap, filter-/sorteringsknapper, header-links, hoved-CTA'er) er dækket af banneret ved scroll 0: `elementFromPoint` i elementets midte rammer elementet selv ved 320/390/768/1440 på soegning, forside, mærke-, by-, region-, type-, kørekort-, budget-, model- og annoncesiden under 503.
4. Under lagerfejl/tomt lager sættes `data-lager-fejl` på `<html>`; byggede tal (`[data-fa-n]`, `[data-mk-n]`, `#facet-intro-antal`, mærkesidens intro-tal) vises som 'ukendt antal' og 'Kort fortalt'/faktapaneler dæmpes (muted farve, AA bevares). Kildens HTML er uændret (SEO). CLS < 0,05.
5. Sortering/filter-skift på søgning nulstiller `page` til 1; sidetals-links bevarer `sort`.
6. 503 på søgning giver ét 'Prøv igen' (banneret) i stedet for to; lukkes banneret, vises kortets knap igen.
7. `node --check` og `npm test` grønt.
