# V3 Agent 2 - Marketplace og funktionel kvalitet

## Opgave 1: hero og søgekort fjernet fra soegning.html
- `<section class="so-hero">` (foto, "Find din næste motorcykel", søgekort med Type/Maks. pris/Kørekort/Søg) er fjernet helt.
- Toppen er nu brødkrumme + ét kompakt søgefelt (`form.so-q#srp-search`, `#filter-q`, ryd-knap, "Søg"). `?q=Honda` fra forsiden filtrerer stadig og vises som fjernbar pille.
- Én H1 (visually-hidden, `#so-h1-n`/`#so-h1-text` skrives af JS: "97 motorcykler til salg i Danmark"). seo-audit: 0 fund.
- Type, pris og kørekort findes uændret i sidebaren. JS: `reflectHeroCard`, type/pris/kørekort-genveje, "Flere valg" og placeholder-skift er fjernet; `.so-hero*`, `.so-card*`, `.so-field*`, `.so-submit*`, `--so-overlap` er fjernet fra css/p-soegning.css.
- CLS-fund undervejs (rod): uden hero ligger bundmodulerne ("Søg efter type") i første skærm, og de blev først skubbet ned, når kortene males portionsvis (CLS 0,09-0,19 ved 390). Løsning: `visibility:hidden` indtil `html.so-klar` (sat af `bundKlar()` når alle kort/tomtilstand er tegnet; 2 s CSS-fallback uden JS). Fejlbanneret (under 1024 px i flowet) er nu et fast bundkort på søgesiden.
- Smoke (320/390/768/1024/1440, lys+mørk, cls 0.05, strikt): 0 fejl, 3 gange i træk.

## Opgave 2: funktionelle edge-cases (browser)
Testet: `?q=`, pille-fjernelse, ryd-knap, Enter, tilbage-knap, `?q=zzzz` (tomtilstand), XSS i `?q=` (escapet), type+kørekort, sortering (pris/år/km), `?page=999` (klampes til sidste side), ugyldige parametre, favorit-toggle, gem søgning (localStorage), kørekort-valg, eksterne kort-links.
Rettet: ukendt `?type=xyz` gav fantompille + 0 resultater, ukendt `?koerekort=Z` gav tomt filter; begge ignoreres nu.
Micro-interactions: fade-in på filterpiller, farveovergange på filter-chips, tryk-feedback på "Søg" (alle slukkes under prefers-reduced-motion).

## Annonce
Ikke ændret i denne runde (se rapport: mockuppens foto-galleri, anmeldelser/svartid og forhandlerkort findes ikke i data og må ikke opdigtes).

## Screenshots
`docs/review/gauntlet/v3/marked/`: soegning-efter-{375,768,1440,1920}-lys.png, soegning-efter-q-*-moerk.png, annonce-foer-*.png.
