# Critic (blind) - agent2 soegning, branch gauntlet/w14-soegning (f80347f3, f8fd95c5)

Kopi: C:\Users\pasca\AppData\Local\Temp\critic-w14-20261017-195235\site (inline-critical + csp-hashes kun paa kopien). Screenshots: ...\critic-w14-20261017-195235\shots\. Mock: 24/140 raekker (+ de 51 statiske demoannoncer, som mockes uden foto) med lokale typefotos fra img/type.
Maalt: 1440-viewport. Mockup skaleret 1672->1440 (x0,861).

## Dom: AFVIS (ikke fordi noget er i stykker, men fordi kortgitter og hero stadig er tydeligt bag mockuppen)
Ligner mockuppen: samlet 6,5/10. Hero 6,5. Filtre 7,5. Kortgitter 6. (Builderen 7,5 er for hoejt.)
Komposition (hero med soegekort, sidebar + resultat, 4 kolonner, chips, grid/liste) matcher struktur. Afvigelserne ligger i proportioner og polish.

## Maalinger (mockup ->  implementering @1440)
- Kort hoejde: ~189 px -> 261 px (+38 %). Kort bredde 233 -> 256. Foto 233x102 (2,29:1) -> 254x127 (2:1). Foto-andel af kortet 54 % -> 49 %. Gap ~10 -> 16 px.
- Sidebar: 270 px (18,8 % af canvas) -> 280 px (19,9 % af 1408 content). Matcher.
- Hero: ca. 174 px -> 213 px (+22 %). Soegekortet ligger inde i fotoet (som mockuppen), men hero-fotoet (naked-cykel, kun lygte og saede) er beskaaret saa motivet ikke laeses; mockuppen har rytter + bro.
- Kolonner 4 x 256 (matcher).

## Egen afvigelsesliste (N = noedvendig/opdigtet, R = kan rettes)
1 Manglende moduler: foto-taeller 1/12 (N, opdigtet/ingen data), kg-chip (N), "Autoriseret forhandler" (N). Intet reelt modul mangler ellers. Bund: fem stablede "Soeg efter type/koerekort/landsdel/budget/by"-blokke med 3-5 chips hver paa tom flade er uden kortkomposition og fylder 600+ px (R; mockuppen/Sport-mock bruger flerkolonne-moduler).
2 Layout: ingen afgoerende fejl. Filter-brandlisten foldes ud ved valg og skubber Type under folden (mockuppen holder to kompakte selects) (R).
3 Hierarki: kortene er for hoeje; titel + pris deler linje, saa to-linjers titler (Honda CMX 500 Rebel) giver ujaevne kort og tomrum (R). Kilde/adresse-raekken staar alene nederst. "Kraever A" er sort fuldfed pille som overdoever pris (R: dæmp).
4 Kort-opbygning: sammenlign-knappen ligger oven i fotoets nederste hoejre hjoerne og daekker motivet (R: flyt til footer eller goer mindre). Chips wrapper paa 390 (hk alene paa linje 2) (R). Titel+meta+chips+sted bruger ~135 px mod mockuppens ~100.
5 Billedbrug: de 51 statiske demoannoncer (og alle kilde-annoncer uden thumbnail) viser stiplet "Ingen fotos i denne annonce". I 140-visningen er ~40 % af kortene tomme flader mod mockuppens 100 % foto. Dette er den vaerste visuelle afstand til mockuppen (R, designvalg: typefoto med aerligt label "Typefoto, ikke annoncens"; img/type/*.webp findes). Hero-beskaering (se ovenfor).
6 Proportioner: kort-/hero-hoejde ovenfor. Foto boer vaere ca. 2,3:1.
7 Typografi/detaljer: oplysningslinjen ved >=1100 px (kilde/alder + sorteringsnote) er afkortet med ellipsis ("...Annoncerne kan vaere aendret s..."): aerlighedsteksten bliver afskaaret (R: lad den wrappe). 503-banneren (overlay) daekker hero-soegekortets Koerekort-label/segment ved 1440; testen tjekker kun at h1 er fri (R).
8 Mikrointeraktion: efter paginering staar scrollY = 0 (top af siden, ikke resultathovedet) (R, lille). Tilbage bevarer filter-URL; scroll 0 i min test (mock, ikke afgjort).

## Builderens designvalg
- Soegekort inde i foto, ingen overlap: matcher mockuppen faktisk (kortet ligger i fotoets nedre del). OK.
- Chip-raekke skjult uden filtre: rimeligt (tom raekke er stoej). OK.
- Gem soegning i resultathovedet >=1280: opdageligt, tydeligt, tekst aerlig (ingen e-mail-loefte: "Der sendes endnu ingen e-mails"). OK.
- Sorteringsnote bag (i) ved >=1100: ER en let skjult aerlighedsoplysning. Noten findes (display:none paa #sortering-note), men den vises kun i tooltip og som afkortet tekst i infolinjen. "Blandet" som default forklares dermed ikke synligt. Kilde/alder-linjen er afkortet. Vurdering: delvist problem; vis linjen i fuld laengde (wrap) eller goer (i)-knappen >=40 px og tydelig. Ikke et lovbrud, men svagere end foer.

## Funktion (alle OK i min test)
- node --test (w14/w10/w12/w11): 31/31 groenne.
- smoke-browser soegning 320/390/768/1024/1440 lys+moerk --cls 0.05 --strikt: 10 maalinger, 0 fejl, 0 advarsler (0 overflow, CLS<0,05).
- Visuel regression mod fefe1570 (index, maerke-honda, type-sport, koerekort-a2, annonce @390/1440 lys): 0 % forskel paa alle undtagen soegning (53,9 % / 51,1 %, forventet). Builderens "0 forskel paa andre sider" bekraeftet.
- Filtre via URL (types, brands, koerekort, priceMax) giver korrekte chips og talt antal; tom tilstand ("Kun 1 match"/"Ingen annoncer matcher") og 503 viser rigtig tekst og "Proev igen"; sortering price-asc/date-desc virker og bevares i URL ved side 2 (?koerekort=A2&sort=date-desc&page=2); favorit aabner login/toast; sammenlign-bar vises; liste/swipe/mobil-drawer virker; moerk tilstand OK.
- Tap-maal 390: et mærke-element 145x30 og koerekort-segment "A" 34x40 under 40 px (R).
- Aerlighed: ingen opdigtede tal/stjerner. Koerekort via a2Status: 48/49 hk vises som "Koerekort ikke afgjort - tjek kW", "Mulig A2" ikke "bekraeftet". OK.
- Ikke verificeret: sort fuldsides-screenshots viser sort bund (~300 px) - sandsynligvis content-visibility/screenshot-artefakt, ikke undersoegt.

## Prioriterede rettelser
1. css/p-soegning.css (kort): kortets samlede hoejde <=210 px @1440; foto 2,3:1; titel 1 linje med ellipsis, pris i egen linje hoejre; maal: 4-kols kort 205-215 px hoeje, ingen 2-linjers titelspring.
2. js/search.js + css: typefoto-fallback (img/type/<type>.webp) med aerligt label for kort uden thumbnail; maal: 0 stiplede tomme fotoflader i 140-visningen, label synligt.
3. css/p-soegning.css: hero-hoejde <=180 px @1440 og object-position der viser rytter/cykelmotiv (eller andet foto); maal: hero 170-185 px, motiv laeseligt.
4. Infolinje (#so-infoband): tillad wrap, vis kilde/alder + sorteringsnote i fuld laengde ved 1440; maal: scrollWidth==clientWidth, ingen ellipsis, noten synlig uden hover.
5. 503-overlay-banner: placer under hero/soegekort (ikke over koerekort-segmentet); maal: banner overlapper 0 px af #srp-search.
6. Sammenlign-knap: flyt fra fotoets hjoerne til kortets footer; maal: 0 px overlap med foto.
7. Koerekort-badge ("Kraever A"): dæmp fra sort fuldfed til lys outline-pille, saa pris er stoerst; chips holdes paa 1 linje ved 390 (tre chips smaller).
8. Filter-sidebar: brandliste bag "Vis alle" kollapset som standard ved valg, saa Type forbliver synlig uden scroll ved 1440x900; maal: Type-overskrift y < 700 px med filtre aktive.
9. Bundmoduler (soegning.html): gør de fem soegesektioner til 3-kolonne kort/chips-moduler (type/koerekort/landsdel) i stedet for fuldbredde-stak; maal: <=350 px samlet hoejde.
10. Tap-maal: mærke-element og koerekort-"A" >=40x40 ved 390.
11. Paginering: scroll til #so-results-head ved sideskift; maal: scrollY ved titel inden for 100 px.

## Screenshots (...\critic-w14-20261017-195235\shots\)
d1440-24, d1440-24-full, d1440-24-moerk, d1440-140-full, d1440-140-p2, d1440-filtre, d1440-filtre-full, d1440-tall, d1440-moerk, d1440-liste, d1440-swipe, d1440-tom, d1440-503, m390-140, m390-140-full, m390-filtre, m390-moerk, m390-drawer, m390-liste, m390-swipe, m390-tom, t768-140, t1024-140, t1024-140-full. Diff: ...\vr-new\diff.html.
Bemaerk: sammenligning mockup/implementering er sket i mine egne noter (maal ovenfor), ikke som genererede side-om-side-PNG'er.
