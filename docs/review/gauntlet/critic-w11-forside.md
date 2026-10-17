# Critic w11-forside (gauntlet/w11-forside, ce9f9b4 paa 226dbe7) - DOM: ACCEPTER

Blind: egne screenshots foer builder-konklusioner. Arbejdskopi: %TEMP%\critic-w11-20261017-105451\r (node_modules via junction). Ingen build/generator, ingen git-skrivning.

## 2. Koerekortindhold (P1-tjek) - ingen afvigelser
Kilder laest: borger.dk "Koerekort til motorcykel" (A1 18 / A2 20 / A 24) og Faerdselsstyrelsen fstyr.dk "Koerekort til motorcykel" (A1: 11 kW, 0,1 kW/kg, 125 cm3; A2: 35 kW, 0,2 kW/kg, normalt 20 aar, 18 kun vaernepligtige/mekanikere med begraenset gyldighed; A: normalt 24, "22-aarig efter to aars erfaring paa A2" + praktisk proeve). retsinformation.dk/BEK 550 er JS-renderet og kunne ikke hentes som tekst - bekendtgoerelsen er altsaa IKKE laest direkte, men officielle sider + tidligere kritikers §36-bekraeftelse stemmer overens.
- A1 fra 18 aar og 11 kW (15 hk): OK. A2 fra 20 aar og 35 kW (47 hk): OK. A fra 24 aar (22 efter 2 aar paa A2): OK.
- Konsistent med koerekort-a1/-a2/-a.html, guide-a2-koerekort.html (naevner 18-aars-undtagelsen korrekt), js/data.js A2_MAX_HK=47.
- P2: forsiden naevner ikke effekt/vaegt-graenserne (0,1 / 0,2 kW/kg); kun kW. Foreslaas ikke noedvendigt, "Om koerekort"-link daekker. P3: 35 kW = 47,6 hk; sitet bruger 47 konsekvent (afrundet ned) - fint, men ikke 48 som flere kilder.

## 1. Visuelt match + modighed
Screenshots 320/390/768/1024/1440 x lys+moerk x mock/tom/503 (se liste). Hero med stort foto (h1 72px/1440, 48/768, 34-35/mobil), soegekort overlapper heroens underkant (kort 580-737, hero slutter 668 ved 1440x900; kortet helt over folden; ved 390x844 kort 301-791, CTA-bund 720, ogsaa over folden), tillidsraekke med 4 ikoncirkler, "Udvalgte" + saelg-panel, typefliser med foto, Saadan virker som 4 kort med pile (2x2 ved 768), 3-kolonne maerker/koerekort/region, "Hvorfor Bikerbasen", footer.
- Modig nok? Klart over facelift: stor hero, flydende kort, orange accent-streger, rytme. Staar stadig under billede 1 paa: (1) ingen rytter-foto/solnedgang-foto (kraever licenseret/ny asset - noedvendig); (2) typefliser/udvalgte i mock viser lilla 1x1-placeholder (mock-artefakt, ikke fejl); (3) maerker som monogram i stedet for logoer (noedvendig) og ingen opdigtede tal (billedets 12.842/tusindvis) - korrekt udeladt. Ingen FAQ/saelg-panel-afvigelse der kan rettes uden assets.
- Forbud: 0 forekomster af "Danmarks motorcykelmarked", 12.842, autoriserede, tusindvis, svartid. Groen kun paa vaerdi-checks i saelg-panel. Brandfarve orange.
- Nye visuelle fejl: ingen tekst-oven-paa-billede-problemer (kontrast ok via overlay), 0 overflow. P3 moerk: heroens underkant (y=668) anes bag soegekortet (kortet halvtransparent) ved 1440 moerk. P3: 503-fejlbanner (fixed, role=alert) ligger over h1 paa mobil, men daekker aldrig soegekortet og kan lukkes.

## 3. Funktion
- Soegekort: "Honda CB" + type Touring + Op til 60.000 + A2 -> soegning.html?q=Honda+CB&types=touring&priceMax=60000&koerekort=A2 (soegesiden normaliserer; 97 motorcykler i mock). Uden JS giver formularen maxPrice/type, som search.js ogsaa laeser.
- Hero-chips: koerekort=A2, koerekort=A1, maxPrice=60000 -> soegning viser A2-filter. Genvejsliste (A2 under 60.000 m.m.) parser korrekt. Koerekortkolonne: A1 4 / A2 30 / A 97 annoncer fra lager; regioner 16/21/36/10/13; type- og maerkelinks peger paa eksisterende filer.
- Tastatur: skip-link foerst, synligt fokus (outline 2-3px) paa alle tabbede elementer. Mobilmenu aabner. Cookie-banner (frisk kontekst, 390): 407 px hoej, daekker soegekortet indtil valg - forventet, men tung (P3).
- Tap-maal: header-nav 39 px, card-compare 34 px (kortblok, anden Builder), "Laes gode raad" 24 px og .kol-link ("Se alle maerker", "Om koerekort") 24 px < 40 (P2, css/p-forside.css kol-link/saadan-link; goer min-height:40px/padding).

## 4. Tomt/fejlet lager
Tom + 503: ingen "0 annoncer"/"0 motorcykler", ingen tomme overskrifter, CLS max 0,025 (768), 0,006 (1440); alert fixed og daekker ikke kortet. 0 konsolfejl, 0 pageerror.

## 5. Regression
0 overflow (alle 30 kombinationer), én h1, ingen null/undefined/NaN, CLS < 0,05 overalt, hero-LCP preload (fetchpriority=high, srcset) + img fetchpriority=high. node --check alle js/ og scripts/ rent. npm test 1049/1049 groen (i kopien). css/p-forside.css er scopet til body.home; ingen selektorer paa .rk-*, .card eller .data-afbrud (kun kommentar) -> ingen kollision med w11-kort/w11-fejl2. git merge-tree --write-tree mod gauntlet/master (226dbe7, uaendret) i klon: rent (tree 961d4e7).

## Dom: ACCEPTER
Ingen P1. Anbefalede opfoelgere (ikke blokerende): P2 tap-maal 24 px paa .kol-link/Laes gode raad (css/p-forside.css); P2 tilfoej kW/kg-note ved A1/A2 (index.html:346-347); P3 moerk soegekort-gennemsigtighed, tungt cookie-banner paa mobil.

## Screenshots
%TEMP%\critic-w11-20261017-105451\shots\{mock,tom,503}-{light,dark}-{320,390,768,1024,1440}-fold.png (+ -full.png for lys og 1440), menu-390.png, cookie-390.png.
