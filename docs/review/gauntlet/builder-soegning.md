# Builder soegning (billede 2) — branch gauntlet/soegning

Filer: `soegning.html`, `js/search.js`, `css/p-soegning.css` (ny), `js/soegning-priser.test.js` (ny). `js/sortering.js` er uændret (ingen ny sortering). Delt lag urørt.

## Bygget pr. billedelement (alt med ægte data)
- **Hero + søgekort**: foto-banner (`img/hero-*.webp`), h1 "Find din næste motorcykel" + "N motorcykler til salg i Danmark" (N = hele lageret, beregnet; ved mærke/region-filter står den dynamiske overskrift uden tal, fx "Honda til salg"). Søgekort: Mærke eller model (`#filter-q`) | Type | Maks. pris | Kørekort Alle/A1/A2/A (forsidens `.kk-seg`) | "Søg motorcykler →". Felterne spejler/skriver til samme `state` som sidebaren; knappen flusher fritekst og scroller til resultaterne.
- **Aktive filter-chips** (fjernbare ×) + "Ryd alle filtre" i fuldbredde række med reserveret højde (ellers "Ingen filtre valgt"); "Gem søgning" (og "Filtre" på mobil) står i samme række.
- **Sidebar "Filtre" / "Ryd alle"**, sticky (sidebaren sad før fast i flowet), foldbare grupper i billedets rækkefølge: Mærke og model (to selects + "Tilføj flere" folder den gamle afkrydsningsliste ud, så multi-mærke/-model virker), Type (afkrydsning + antal + "Alle typer"), Pris (skyder + hurtigknapper Under 25.000 / 25–50.000 / 50–100.000 / Over 100.000 + talfelter), Årgang, Kilometer, Kørekort (Alle/A1/A2/A + antal), Region, Sælgertype (kun forhandlere); derefter ccm, hk, stand, annoncen, og data-gatede grupper som før. Antal fra lageret via eksisterende facetTal(). Ingen nye filterfelter. Mobil: samme bundark/skuffe, nyt sprog.
- **Resultathoved**: "N motorcykler fundet", Sortér-select (kun eksisterende sorteringer), Gitter/Liste (+ Swipe) med tekst.
- **Gitter**: 4 kol. fra 1280, 3 fra 1100, 2 (960–1099), 3 uden sidebar fra 760, 2 fra 560, 1 under. Annoncekortet uændret.
- **NF3-5**: `#filter-q` og `#brand-search` bruger `.input`/tokenet. Målt: kant 3,78:1 lys / 3,59:1 mørk; placeholder 5,74 / 6,43:1.

## Matcher IKKE billedet (og hvorfor)
- Hero-foto er sitets eget motorcykelfoto (ikke rytter/bro). Primær CTA/aktive felter er brandfarven, ikke grøn.
- "Mest relevante" findes ikke (ingen relevansmodel): sorteringen hedder "Blandet". Ingen billedtæller "1/12" (vi gemmer ingen gallerier), ingen kg-chip og ingen "Privat sælger/Forhandler" i kortets fod (ikke i kortet; se DELT-ØNSKE). Typerækker uden cykelikoner. Kørekort-rækker er radio-semantik (ét ad gangen) tegnet som felter; "(lille mc)"-tekst kun for skærmlæsere/title.
- Resultatspalten har desuden "N annoncer er ikke vist…"-forklaringerne og "Blandet udbud"-noten (bevaret, ikke i billedet).
- Sidebar/resultater bruger bredere container (1360) end header (1240) fra 1280 px — som billedet, hvor sidebaren står uden for header-linjen.

## DELT-ØNSKE (Orchestrator)
1. Annoncekort: kildetypen ("Privat sælger"/"Forhandler") som højrejusteret tekst i bundlinjen ved siden af stedet (data findes: `isDealer`); kørekortbadget først i chip-rækken som i billedet; ingen kg/foto-tæller.
2. Pipeline: `css/p-soegning.css` skal med i `udgiv.js`-allowlist, `stamp-version.js` og kritisk-CSS/preload-håndteringen (styles.css hentes sent i prod — p-soegning.css er render-blokerende `<link>` i dev; målt CLS under er fra dev).
3. `scripts/build-srp.js` skriver stadig "annoncer fundet" i det forudtegnede antal; JS skriver nu "motorcykler fundet" (ét linjes tekstbytte, intet skred). Skabelonen bør følge.
4. `.chip[aria-pressed]::before / [role=radio]::before` i styles.css (små prikker) tilsidesættes i p-soegning.css med højere specificitet; kan fjernes fra delt lag, når alle sider har fået deres chip-stil.

## Målinger (Playwright, lys+mørk, 320/360/390/768/1024/1440)
- Vandret overflow: ingen (scrollWidth==clientWidth) på alle 12 kombinationer. Konsol: ren.
- CLS (første render, 2,5 s): 0,005–0,016 uden filter, ≤0,045 med filtre i URL (320 px); V-002 768 px: 0,717 → 0,011/0,013.
- Funktion (func.js, 34 checks): hero-type/pris/kørekort ⇄ URL ⇄ sidebar, hurtigpris, pille-fjern, Ryd alle, mærke→model, flere mærker, liste/gitter/swipe, sortering, fritekst+Enter, Tilbage-knap, tom tilstand, uoplyst-note, paginering, deep link: alle bestået. Ingen duplikerede id'er, alle felter har label.
- Tests: `npm test` 364/364 grønt; ny `js/soegning-priser.test.js` (6 tests, kør `node --test js/soegning-priser.test.js`) — tilføj til `npm test`.
- Iterationer mod billedet: (1) struktur + første sidestilling → fandt sticky-fejl, afklippede hurtigpris-knapper, radio-prikker på felter, 3-linjers resultathoved; (2) rettet, mobil + 768 + mørk → toolbar-wrap <1100, 2-kol. søgekort på mobil; (3) kontrast, CLS, funktionstest, listevisning.

## Kendte rest-problemer
- Fotos på kortene er kildens (vandmærker "MC SYD") — ikke ændret. Hero-kortet fylder en hel mobilskærm (390 px) før første resultat.
- Prisbånd ændret fra 5 til billedets 4 (30/60/100/150 → 25/50/100): bevidst ejer-beslutning; skyder + felter dækker alt derimellem.
