# Critic agent5 (brugere) - gauntlet/w14-brugere

Kopi: C:\Users\pasca\AppData\Local\Temp\critic5-20261017-194513 (inline-critical + csp-hashes kun paa disk). Screenshots: ...\critic5-20261017-194513\shots\ (110 filer; 1440/390/768, lys+moerk, +full).
Begraensning: Builderens dokumenter er IKKE laest (min egen vurdering er blind). Tidsbudget gjorde, at favoritter-fanen og mobil-/moerke-screenshots kun er stikproevevist gennemset.

## Dom
- Artikel: AFVIS - ligner mockuppen 6/10
- Login: AFVIS - 6,5/10
- Mine annoncer: AFVIS - 5,5/10
Funktion/gate er groen, men ejerens indtryk ("ligner stadig ikke") er berettiget: strukturen er taet paa, den visuelle udfoerelse er ikke.

## Maalinger (groenne)
- smoke-browser (19 sider x 5 viewports x lys+moerk, --cls 0.05 --strikt): 190 maalinger, 0 fejl, 0 advarsler.
- node --test (de 6 filer): 207/207 bestaaet, 0 skippet. seo-audit: 101 sider, 0 fund.
- "Laes ogsaa" findes paa om-bikerbasen (1), sikkerhed (2), vilkaar (1). BETALING_BYGGET=false-guard findes i dashboard.js/mine-annoncer.js. Ingen social login/MitID i login.html. Forfatter "Af Bikerbasen" (aerligt).

## Egen afvigelsesliste (prioriteret). N = noedvendig, R = kan rettes
Artikel (guide-mc-typer, guide-a2, guide-saelg):
1. (3 hierarki/5 billeder) Hero er et moerkt, underbelyst motorcykel-udsnit uden rytter og uden "rejse"-stemning; mockuppen er lys, varm solnedgang med rytter, og teksten er stor/fed hvid. Vores H1 er Space Grotesk i let vaegt og hero er tungere/moerkere. R: lysere hero-crop/overlay, tungere H1 (700+), stoerre.
2. (6 proportioner) Broedtekst er ca. 840 px bred mens TOC-boksen er ca. 935 px; sektionsoverskrift og broedtekst flugter ikke med boksen og sidebjaelken starter hoejt med stor tom luft under den (sidebjaelken er kort i forhold til en 1100-1500 ords side; ca. 60 % af hoejre kolonne er tom efter "Opslaaet effekt"). R: sticky sidebjaelke med mini-TOC/aktivt afsnit under Kort fortalt, eller faa flere moduler.
3. (4 kort) Informationsbokse i broedteksten: i mockuppen er hver sektion et visuelt modul (5 type-kort med foto + "Se X motorcykler" link). Hos os kun i sektion 1; sektion 2-7 er rene tekstblokke med et enkelt linje-link. Guide-a2 / saelg uden synlige faktabokse/callouts. R: callout-komponent (tip/advarsel/fakta) og foto paa mindst to sektioner.
4. (1 moduler) "Populaere motorcykler til begyndere" erstattet af "Opslaaet effekt under A2-graensen" med tre annoncer - OK/aerligt (N: ingen opdigtede annoncer). Relaterede-annoncer-blok er lille og uden foto-vaegt (R).
5. (7 typografi) Forfatterlinje: logo-avatar + "Af Bikerbasen" + dato + laesetid i hero er fint, men dato/laesetid er fed/hvid-paa-moerk lille tekst - lav kontrast mod lyse hero-omraader ved andre guides. R: sikre scrim.
6. TOC-valget (ikke-sticky bred boks): FORBEDRING for 1. skaerm og mockup-lighed (matcher billedet), men TAB for laange guides: efter 1-2 skaerme er TOC ude af syne, og aktivt-afsnit-markering (IntersectionObserver i js/guides.js) har intet synligt at markere paa desktop. Anbefaling: behold boksen, og tilfoej kompakt sticky mini-TOC i sidebjaelken (R).
7. (8 mikro) Ingen "Til toppen"-knap eller laesefremskridt paa laange sider (R, lav prioritet).
Login:
8. (2/5) Hero-baggrund er sloeret motorcykelfoto uden rytter og uden haandskrevne captions ("Samme passion. Flere muligheder.") - mockuppen har en stor rytter-vignette der baerer hoejre panel; vores hoejre panel er mest creme-flade med et fragment af en motorcykel (R: samme lysere bagom-foto, skaler motiv, tilfoej to korte aerlige captions).
9. (1 moduler) Bundstroeg med 4 tillids-punkter er pa mobil men under desktop-fold (kortet fylder 885/900 px); i mockuppen er den synlig. R: kortet 40-60 px lavere, saa stroegen er i foerste skaerm. Tallet "120.000+" maa ikke kopieres (N) - nuvaerende aerlige tekster OK.
10. (3 hierarki) H1 "Log ind paa Bikerbasen" er tyndere end mockuppens ekstra-fede; "Fortsaet uden konto" som ghost-knap er et godt aerligt alternativ til social login (N - social login forbudt). Der er ingen separat "Opret profil"-fane; oprettelse er hoejre kolonne - matcher mockuppen. Opret-knap er kun linket (ingen formular synlig) - tjek at den fører til rigtig oprettelsesformular (ikke fuldt verificeret).
Mine annoncer / dashboard:
11. (1 moduler) Stat-kort: 4 (Aktive, Kladde, Favoritter, Soegeagenter) mod 5 i mockuppen; visninger/beskeder mangler (N: beskeder findes ikke, og visninger kun maalt for forhandlere - aerligt). Men kortene er flade, smalle og uden den store tal-typografi og farvede cirkler fra mockuppen (R: stoerre tal, mere luft).
12. (4 kort) Annoncerraekke: foto, titel, pris, status-pille, tre taellere uden ikoner, Rediger/Saet paa pause/⋮. Mockuppen har tydelig "Udloeber om 18 dage", ikoner paa taellere, foto-antal-badge og en stiplet "Opret en ny annonce"-strimmel under listen. Vi mangler udloebsinfo (R hvis data findes; ellers N) og den stiplede opret-strimmel (R). Taellere viser "0" i mock - ok.
13. (5 billeder) Hero paa Mine annoncer er et motorcykel-udsnit uden rytter, 205 px hoej og tung; mockuppen er lysere og har samme hoejde. R: lys overlay.
14. (7) Header-label "Test · Log ud" (displaynavn + handling i en enkelt tekst) ser ud som en fejl; mockup: "Min profil". R: vis "Min profil" som link, Log ud i menuen. Tilsvarende den "Saelg hurtigere"-boks har svag bjerg-illustration, der ligner et ikon-placeholder (R).
15. Dashboard privat bruger: siden er en blind gyde ("Dashboardet er for forhandlere" + "Bliv forhandler") med kun en CTA og enorm tom flade; bør redirecte til mine-annoncer (R). Forhandler-dashboard: korrekt aerlig "Ubegraenset gratis", tomme grafer ved 0 data, "Telefonvisninger" forklaret. God aerlighed, men visuelt ensformigt.
16. Fane-parameter: mine-annoncer.html?tab=aktive/kladder renderer samme oversigt (kun ?tab=favoritter er brugt af dashboard) - ikke fuldt verificeret.

## 8-12 prioriterede rettelser (fil / hvad / kriterium)
1. css guide-hero (css/p-guide*.css el. styles.css): lysere hero-scrim + H1 vaegt 700, 48-56 px. Kriterie: H1 hvid kontrast >=7:1, ingen dunkle "huller" i foto; sammenligning side om side viser samme lyse stemning.
2. js/guides.js + guide-sidebjaelke: sticky mini-TOC under Kort fortalt (position:sticky; top header+16). Kriterie: aktivt afsnit markeres ved scroll paa 1100+ ords guides; ingen overflow 320-1440.
3. guide-skabelon (scripts/build-guides*.js KUN i kopi/ved Builder): callout-komponent (Tip / Husk / Fakta) mindst 2 pr. guide; foto-kort for 2+ sektioner. Kriterie: >=2 callouts + >=2 billeder pr. guide.
4. guide broedtekst: samme max-bredde som TOC-boks eller 72ch fastholdt med boksen smallere. Kriterie: venstre/hoejre kanter flugter, laeselinje 60-80 tegn.
5. login.html/css: kort 50 px lavere + tillids-stroeg synlig paa 1440x900; tungere H1; stoerre rytter-agtigt motiv i hoejre panel. Kriterie: stroeg i foerste skaerm.
6. js/mine-annoncer.js: "Opret ny annonce"-stiplet strimmel nederst; ikoner paa taellere; udloebsdato hvis felt findes. Kriterie: strimmel synlig under listen, taellere har ikon.
7. css stat-kort: tal 32-36 px/700, ikon-cirkel 48 px. Kriterie: tal-hoejde >=32 px.
8. components.js header: "Min profil" i stedet for "Test · Log ud". Kriterie: ingen sammensat label.
9. dashboard.js: ikke-forhandler redirect til mine-annoncer. Kriterie: ingen "er for forhandlere"-blindgyde.
10. Hero-billeder (Mine annoncer/guide): lysere overlay, kun egne fotos. Kriterie: gennemsnitslysstyrke hero >= mockup-niveau.
11. js/mine-annoncer.js: ?tab=aktive|kladder|udloebet understoettes. Kriterie: URL aabner tilsvarende fane.
12. "Saelg hurtigere"-illustration: erstat med ordentligt SVG eller fjern. Kriterie: ingen placeholder-agtig form.

## Aerlighed
Ingen opdigtede tal, forfatter "Af Bikerbasen", ingen social login/MitID/beskeder/betaling fundet. Juridisk testlaast tekst: tests groenne (info-tekst/tekstsider).

## Screenshots
Mappe: C:\Users\pasca\AppData\Local\Temp\critic5-20261017-194513\shots\ - fx guide-mc-typer-d-lys(.png/-full), guide-a2-koerekort-*, guide-saelg-motorcykel-*, guides-*, login-*, login-opret-*, dash-privat/forh-*, mine-privat/forh-*, mine-tab-*, mine-tom-*, om-bikerbasen-*, sikkerhed-*, 404-*, afmeld-* (d=1440, m=390, t=768; lys/moerk).
