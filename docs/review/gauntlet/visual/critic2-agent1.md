# Critic runde 2 - Agent 1 (Forside, gauntlet/w14-forside)

Kopi: C:\Users\pasca\AppData\Local\Temp\critic2-a1-20261017-201725\site (inline-critical + csp-hashes kørt kun der). Screenshots: ...\critic2-a1-20261017-201725\shots\ (mock/empty/503 x 1440/1024/768/390, lys+mørk, fold+full; mockup-hero/sadan/tre, impl-sadan/tre).
Builderens dokument er IKKE læst (tidsbudget); egen liste nedenfor er uafhængig.

## Måling (funktion)
- smoke index 320/390/768/1024/1440 lys+mørk, --cls 0.05 --strikt, 3 kørsler: 0 fejl/0 advarsler hver gang.
- node --test w14/w11/w12: 28/28 pass.
- Søgekort: q=Honda CB + Sport + Op til 60.000 + A2 -> soegning.html?q=Honda+CB&types=sport&priceMax=60000&koerekort=A2 (soegning viser A2 afkrydset). A1/A -> ?koerekort=A1 / =A. OK.
- 503: html[data-lager-fejl] sat, ingen tal på fliser/kolonner, banner (hjørne, ca. 50 px) dækker ikke søgekortet (elementFromPoint: 0 blokerede kontroller, 1440 og 390). Tomt lager: fungerer, sælg-panel fylder rækken.
- Header sticky, 54 px desktop / 60 px mobil, scroll-padding-top matcher på soegning, annonce, maerke-honda, guide. Mørk tema er reelt mørk (body rgb(22,20,15)).
- Mock-fund: A1/A2-flisen linker til koerekort-a1/a2.html, men A linker til soegning.html?koerekort=A selvom koerekort-a.html findes (inkonsistent; "Om kørekort" peger kun på A2). Typefliser: Naked/Adventure/Sport/Cruiser/Touring -> type-*.html, men Scooter/Classic/Cross -> soegning?type= (type-scooter.html findes; fliser og målsider er ikke ens opbygget).
- Tap-mål <40 px: topnav-links 33 px, alle linklisterne i bunden (typer/kørekort/budget/modeller) 28 px; mærke-/region-/kørekortfliser OK.

## Afvigelser mod Forside.png (prioriteret)
1. Manglende/anderledes moduler
   - "Sådan virker": mockup har blå-tonet bånd, 4 trin med store ikoner, trin 4 = "Gem og sammenlign" (favoritter), og et grønt fællesskabspanel med bjerg-/vej-illustration ("Bliv en del af fællesskabet"). Her: hvidt kort, små ikoner, trin 4 = "Gå videre til sælger", panelet er et fladt mintkort "Køb og sælg trygt" uden illustration. KAN RETTES (trin 4 kan være Gem/favoritter - funktionen findes; illustration kan laves som SVG; ikke nødvendig afvigelse).
   - Hero: mockuppen har rytter i action på motorcykel + bro/vand i solnedgang. Her: tom, mørk motorcykel på bakke, ingen rytter. Delvis NØDVENDIG (rytterfoto er et manglende asset), men beskæring/tonegrading kan rettes.
   - Ekstra moduler ikke i mockuppen: "Hvorfor Bikerbasen" (3 tekstkolonner), "Mere om kørekortet", stort link-blob (TYPER/KØREKORT/LANDSDELE/BUDGET/BYER/MODELLER/GENVEJE) og tomt bånd før footer. Siden ender i et SEO-tekstlag, mockuppen ender på tre kolonner. KAN RETTES (fold sammen/flyt under footerlinjer, mindre luft).
2. Layout
   - Hero for høj (330 px vs mockup ca. 245 px skaleret) og søgekortet ligger ved 332-436; i mockup ligger kortet højere og hero-foto er tydeligt bredere/dybere. Tillidsrækken er svag: små ikoner (ca. 20 px) mod store 44 px linjeikoner i mockup; ingen grå bånd-afgrænsning med luft.
   - Tre kolonner: ujævn højde (mærker ca. 168, kørekort ca. 214, region ca. 120) og kørekortkolonnen har overskydende bundnote; mockup har tre lige høje kort. Mærkefliser duplikerer navn (wordmark + tekst "Honda Honda"; Harley-Davidson bryder i to linjer). KAN RETTES.
3. Hierarki: sælg-panel og kort fungerer; men "Udvalgte motorcykler" har en forklarende note under kortene (lang, teknisk) der bryder rytmen; mockuppen har ingen. Typer: tilfredsstillende (hele motorcyklen synlig, scrim), men kontrast på navnelinje er ikke målt formelt - visuelt OK.
4. Kortopbygning: annoncekort mangler hjerte på de fleste i hvile (kun synligt ved hover/den ene), kilde-linje vises som domæne (mcsyd.dk) mod "Kilde: Forhandler" - tilladt/ærligt. Kortene mangler fotografisk ensartethed (mock-fotos fra mig, ikke et fund). Sælg-panelet har lille foto inde i kortet i stedet for mockuppens fuld-højde rytterfoto med tekst oven på (NØDVENDIG delvist: asset).
5. Billedbrug: kun én statisk hero og samme cruiser-foto i sælg-panel; fotografisk udtryk er det svageste punkt (Builderens egen 5,5 er rimelig).
6. Spacing: god på desktop; 390: hero/søgekort OK, men Sådan virker/kolonner bliver lange lister (side 5.800 px).
7. Typografi: Space Grotesk-agtig display OK; brødtekst i tillidsrækken og noter 12-13 px er småt.
8. Mikrointeraktion: favoritskuffe/tema/mobilmenu/cookie OK i W14-test; ikke fundet fejl.

## Prioriterede rettelser til Builderen
1. index.html + css/p-forside.css: gør "Sådan virker" til tonet bånd (primary-tint) med 40-48 px ikoner, titel i række med trin 1, trin 4 = "Gem og sammenlign" (favorit-hjerte). Kriterium: bånd-højde >= 150 px, ikonstørrelse >= 40 px, 4 trin + panel på samme række ved 1440.
2. Fællesskabspanel: SVG-illustration (bjerg/vej) + titel "Bliv en del af fællesskabet"-lignende ærlig tekst; kriterium: illustration >= 120x80 px i panelet.
3. css/p-forside.css hero: højde 250-280 px ved 1440 og søgekort overlap 40-60 px; kriterium: hero-foto top-til-søgekort <= 280 px.
4. Hero-foto: gradér/beskær så motivet fylder højre 45 % og horisont/lys matcher mockuppen; hvis ægte rytterfoto kan skaffes, brug det (ellers NØDVENDIG afvigelse noteres).
5. Tillidsrække: ikoner 40-44 px, grå bånd med lodret padding >= 24 px; kriterium: ikon >= 40 px.
6. Tre kolonner: align-items:stretch, lige høje (+/- 4 px); fjern dublerede mærketekster under wordmark-logoer og lad HD stå på én linje.
7. Link A-flisen til koerekort-a.html (som A1/A2) og lad Scooter/Classic/Cross pege på type-*.html når de findes; kriterium: alle 8 flisers href findes som fil og tallet stemmer med målsidens h1/tal.
8. Flyt/komprimér "Hvorfor Bikerbasen", "Mere om kørekortet" og link-bloben til en sammenfoldet sektion lige over footer; kriterium: afstand mellem tre kolonner og footer <= 160 px.
9. Fjern/kort ned forklaringsnoten under Udvalgte (til én linje) eller flyt til title/tooltip.
10. Hjerte-ikon synligt i hvile på alle annoncekort (som mockup), tap-mål >= 40 px; footerlinks/nav-links til >= 40 px højde (padding).
11. Mobil 390: hold Sådan virker som 2x2 eller vandret skinne for at nedbringe sidehøjde (mål <= 4.800 px).

## Dom: AFVIS
Ligner mockuppen: forside som helhed 6,5/10 | hero 5,5/10 (struktur ok, motiv/rytter og komposition svag) | Sådan virker 5/10 (rigtige elementer, forkert tone, trin 4, manglende illustrationspanel) | mellemsektion (typer + kolonner + panel) 6,5/10.
Ærlighed: ingen opdigtede tal fundet; "Sådan virker" stemmer med funktionen (kildelink, kørekortfilter), men afviger fra mockuppens favorit-trin.
