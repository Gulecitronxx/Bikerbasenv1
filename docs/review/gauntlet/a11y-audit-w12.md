# Tilgængelighedsaudit W12 (WCAG 2.2 AA) — fundliste

Værktøj: `node scripts/a11y-tjek.js` (egne tjek, ingen axe-core, offline mock). Kørsel på HEAD 7ef5efa: 92 sider × 390/1440 × lys+mørk + reflow 320/720 + reduced-motion = 644 målinger, 559 s, 0 produktionskald.
Rå resultat: **P1 2 mønstre (4 sidefund) · P2 20 (32) · P3 6 (21) · kontrast kan ikke afgøres 157 (ikke talt)**. Sitet er generelt sundt: ingen manglende lang/title/h1-fejl/alt/labels/knapnavne/skip-links/landmarks, drawer + filterpanel er korrekte modaler (fokus ind, fanget, Escape, fokus retur), ingen tap-mål < 24 px, ingen tastaturfælder, ingen uendelige animationer under reduce.
Ret ikke gjort i andre strømmes filer; nedenfor står ejer og præcis ændring.

## Top 25 (prioriteret)

| # | Pri | Fund | Ejer | Præcis ændring |
|---|---|---|---|---|
| 1 | P1 | **By-sider (by-horsens/skive/thorsoe) er layout-kollapset ≥ ca. 600 px**: `<main class="fa-side fa-by">` rammes af listereglen `.fa-by{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}`; hero-grid får 0 px (h1 stakkes bogstav for bogstav, summary 0×104 px, CTA-knap bliver rund). Værktøjet ser symptomerne (fokus-usynlig, fokus-skjult, tekstafstand) | `css/p-facet.css:379-392` + `scripts/build-facet-pages.js:1720` (liste) og `:1897` (main-klasse `fa-${facet.kind}`) | Omdøb listeklassen til `.fa-by-liste` (css + `<ul class="fa-by-liste">` i generatoren), eller lad main-modifikatoren hedde `fa-kind-by`. Smoke fangede det ikke (0 overflow). Bør få en regressionstest |
| 2 | P1 | Dubleret id `mk-az-h` på maerker.html: `<h2 id="mk-az-h">` og `<section id="mk-az-h">` (bogstavet H). Brudt `aria-labelledby` og anker H | `scripts/build-brand-pages.js:1448` og `:1453` | Gruppe-id til `mk-az-gruppe-${bogstav}` (og A–Z-linksene `href`), lad `mk-az-h` høre til h2 |
| 3 | P2 | Tekstkontrast 4,30:1 (#C6420E på #F0EDE8, 15 px) på aktivt indholdsfortegnelse-link, 7 guidesider | `css/p-guides.css:108` (`.gd-toc a[aria-current="location"]`) og hover `:107` | `color: var(--color-primary-hover)` (#A8380C ≈ 5,6:1) |
| 4 | P2 | Hero-h1 klippes ved 320 px/390 px (333 px indhold i 320 px, `section.fa-hero{overflow:hidden}`), type-adventure; reflow 1.4.10 | `css/p-facet.css:48/397` (`.fa-hero h1`) | `overflow-wrap:anywhere; hyphens:auto; max-width:100%` på `.fa-hero h1`, `.fa-hero-tekst` `min-width:0` |
| 5 | P2 | `ul.fa-udforsk > li > a` klippes ved øget tekstafstand (366 px i 356 px) og ved 320 px | `css/p-facet.css` (`.fa-udforsk a`) | `min-width:0; overflow-wrap:anywhere`, fjern fast bredde/`overflow:hidden` på linket |
| 6 | P2 | Annoncekort `article.card.card-rich` klippes ved tekstafstand (maerke-udvalg 259/238 px, similar-listings, facet-flere 176/172 px) – 1.4.12 | `css/styles.css` (`.card-rich`, `.rk-body`, `.rk-chips`) | Børn `min-width:0`; chips `flex-wrap:wrap`; undgå `overflow:hidden` + fast bredde på kortets tekstzone |
| 7 | P2 | `a.gd-type-link` klippes (146/142 px) ved tekstafstand, guide-foerste-motorcykel | `css/p-guides.css` (`.gd-type-link`) | `overflow-wrap:anywhere`; fjern fast bredde |
| 8 | P2 | `input#fa-q` (by-sider) dækkes af sticky header ved fokus (2.4.11) — følge af #1, men tjek `scroll-padding-top` efter rettelsen | `css/p-facet.css` / `css/styles.css` (`html{scroll-padding-top}`) | Verificér efter #1; `scroll-padding-top` ≥ header-højde (68 px) |
| 9 | P2 | Tomtilstandens knapper (by-thorsoe `#facet-listings .empty-state a`) dækkes af `aside.fa-cta` | samme årsag som #1 | Verificér efter #1 |
| 10 | P2 | Dobbelt-tekst/overlap ved tekstafstand i `.fa-hero-tekst p`, `aside.fa-cta li` (by) | samme årsag som #1 | Verificér efter #1 (tæller 14 mønstre, de fleste kun på by) |
| 11 | P3 | `p.hero-genveje[aria-label]` er et `p` uden rolle → label ignoreres | `index.html` (genereres evt. af `scripts/build-*`; håndskrevet i index.html:148) | `<div role="group" aria-label="Genveje">` |
| 12 | P3 | `div#active-filters[aria-label]` uden rolle | `soegning.html:371` | `role="group"` (eller `role="status"` hvis ændringer skal annonceres) |
| 13 | P3 | "Søg motorcykler" er to forskellige destinationer i tomtilstand på 11 mærkesider (uklar linktekst) | `scripts/build-brand-pages.js` (empty-state) | Gør teksten unik eller `aria-label` med mærke: "Søg Benelli-motorcykler" |
| 14 | P3 | "Naked" i `popular-row` peger på to destinationer, mc-honda-*-sider | `scripts/build-facet-pages.js` (popular-chip) | Unik linktekst, fx "Honda naked" / "Alle naked-motorcykler" |
| 15 | P3 | Range-thumb fokus (`.dr-thumb:focus-visible`, `outline:none` + 3 px ring 28 % gennemsigtig) kan ikke måles automatisk; ringen er ca. 1,6:1 mod hvid (< 3:1, 1.4.11/2.4.13) | `css/styles.css:1360-1367` | Ring `0 0 0 3px var(--color-primary)` (fuld dækning) + hvid `outline-offset` |
| 16 | P3 | Sortér-select i `.so-toolbar` har `border:0`; grænsen ligger på wrapperen og fokus signaleres via `:focus-within` — OK, men `select:focus-visible{outline:none}` bør have en erstatning på selve select | `css/p-soegning.css:268-273` | Manuel bekræftelse; evt. `outline:2px solid var(--color-ring)` på `:focus-visible` |
| 17 | U | 157 kontrast-"kan ikke afgøres" (tekst over billeder/gradienter: mærke-hero h1/breadcrumb, `mk-tile-tekst`, `fa-cta-studio h2`, `lg-promo`, `hero-sok`) | hero/scrim i `css/p-maerke.css`, `css/p-facet.css`, `css/p-forside.css`, `css/p-login.css` | Kontrollér manuelt med skærmlæser/værktøj at scrim giver ≥ 4,5:1; værktøjet kan udvides med pixelmåling |
| 18 | P3 | Mobilmenu-udløser har kun aria-label "Åbn menu"; aria-expanded sættes korrekt af JS — ingen fejl, men labelen bør skifte til "Luk menu" ved åben (best practice) | `js/components.js:180-185` | Lad `aria-label` følge tilstand eller brug fast label + aria-expanded (nuværende er acceptabelt) |

Punkt 17-18 er ikke-fund-i-streng-forstand (manuel opfølgning). Der er færre end 25 reelle mønstre, fordi sitet er rent på de øvrige regler; listen er komplet for hvad værktøjet kunne påvise.

## Tjek der kørte uden fund (dækning)
sprog, titel, h1, overskrift-spring/tom, landmarks, nav-navn, skip-link, felt/knap/link-navn, ens linktekst (kun #13-14), billede-alt, svg-navn, ARIA-roller/-attributter/-referencer, aria-hidden-fokus, aria-expanded-konsistens, klik-lytter uden tastatur, tab-rækkefølge, tastaturfælder, modal/drawer (fokus ind/fanget/Escape/retur på alle sider ved 390 og 1440), tap-mål ≥ 24 (og ≥ 40 primære på mobil), reduced-motion (ingen uendelig animation), live-regioner (fejl/status-beholdere har role/aria-live).

## Værktøjets begrænsninger
Kontrast over billeder/gradienter markeres kun som "kan ikke afgøres". Pseudo-elementer uden computed style (range-thumb) giver P3 "kan ikke måles". Tekstafstand er heuristik (afklip/overlap pr. linjefragment); lav tillid på enkeltmønstre uden #1-årsag. Dynamiske tilstande efter brugerhandling (fejlbeskeder efter submit) testes ikke.
