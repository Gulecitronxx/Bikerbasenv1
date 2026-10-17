# Critic: agent1 forside (gauntlet/w14-forside, blind)

Testkopi: C:\Users\pasca\AppData\Local\Temp\crit-a1-20261017-193221 (inline-critical + csp-hashes kun på disk). Screenshots: C:\Users\pasca\AppData\Local\Temp\crit-a1-shots\ (mock/tomt/503 x 390/1440, 768, 1024; fold, full, sektioner). Mockup: Forside.png (1672x941; skala til 1440 = 0,861).
NB: mine "mørk"-screenshots blev i praksis lyse (temanøgle i mit script); mørk er kun dækket af smoke (0 fejl) og W11/W14-testene.

## Dom: AFVIS (mildt) men tæt på. Komposition ligner nu tydeligt; udførelsen (foto, fliser, tomme felter, fejltilstand) gør at det ikke "lander" som mockuppen.

Ligner mockuppen: forside 7/10, hero 6,5/10, Sådan virker 7,5/10, mellemsektion (type + Sådan virker + tre kolonner) 6,5/10.

## Målinger (1440)
- Header 54 px (mockup 41 px = 35 px skaleret; stadig 54 % højere end mockuppen). Hero 54-306 = 252 px (mockup ca. 210 px skaleret) + søgekort 104 px, overlapper fotoet midt på kortet som i mockuppen. h1 43 px (mockup ca. 37 px). Side 2518 px; 390: 6146 px (mock-lager), hero 261, søgekort 490 px = 58 % af 844-folden.
- Felter 44 px, kørekort-segment, submit 52 px: brugbart. W14 tap-test (>=40 px) grøn.
- Smoke index 320/390/768/1024/1440 lys+mørk, --cls 0.05 --strikt: 0 fejl, 0 advarsler. `node --test w14 + w11`: 12/12 grønne.

## Funktion (alt testet, ok)
Søgning Honda/naked/60.000/A2 -> soegning.html?q=Honda&type=naked&maxPrice=60000&koerekort=A2 (korrekt). Hero-chips (ved <1100 px): A2/A1/under 60.000 med korrekte parametre. Mærke-, type-, region-links gyldige; logoer vises. Header: Om Bikerbasen i nav; fokusring på alle (2 px), tab-rækkefølge logisk; Favoritter -> login med redirect (korrekt for ikke-logget). Mobilmenu og tema-skift ikke fejlfundet visuelt (768/390 viser burger). Tomt lager: ærlig tekst, ingen CLS. 
Header 54/60 på andre sider: soegning, annonce, maerke-honda, guide, opret-annonce har alle header 54 px, scroll-padding 54 px, sticky-paneler top 70 px (=54+16) via --header-h. Ingen kollision fundet; ingen hårdkodede 68 px tilbage i sticky-regler. Lavere header er ikke et problem.

## Egen afvigelsesliste (prioriteret)
1 Manglende moduler: mockup har "Bliv en del af fællesskabet"/guides-kort (impl. har "Køb og sælg trygt", ok erstatning, ægte guides). Rating/"Kilde"-linje på kort findes. Intet væsentligt mangler. Nødvendig: fællesskabs-tekst er opdigtet løfte -> korrekt udeladt.
2 Layout: matcher. Afvigelse: i fejl/503 står sælg-panelet alene til højre med ca. 170 px tomt hul til venstre (KAN RETTES: skjul sælg-panel eller fyld med skelet/ærlig tom-tilstand; i 503 ligger fejlbanneret oven på heroens foto og dækker motorcyklen).
3 Hierarki: hero-h1 ok, men heroens foto er svagt (se 5). "Sådan virker" er en lav, flad strimmel med 12-13 px brødtekst og 15 px titel; trinnumre små. Mockuppen har samme lavhed, men tydeligere store cirkler og ikoner (KAN RETTES: ikon 40 px, nummer 30 px, tekst 13 px).
4 Kortopbygning: titel og pris deler række, så 3 af 5 titler brydes/afkortes ("Harley-Davidson FLH..."), kortene får uens rytme. Sammenligningsknappen ⇄ ligger permanent på hvert foto (mockuppen har kun hjerte) og larmer; hjerte kun synligt på ét kort (hover). Kørekort-chip sort "Kræver A" mod mockuppens farvekodede badge (KAN RETTES: pris under titel eller titel 1 linje, ⇄ kun ved hover/fokus, hjerte altid synligt).
5 Billedbrug: hero-foto er et beskåret mørkt headlight-udsnit uden rytter, uden landskab/bro/solnedgang. Mockuppens hero er rytter + kyst, det er det, der giver "imponerende". Nødvendigt delvist: kræver nyt foto, men KAN RETTES med bedre object-position/crop (vis hel motorcykel + horisont) og lysere gradient. Typefliser: foto beskåret til nederste halvdel af motorcyklen (hjul), ca. 60 % dækket af næsten sort gradient -> mudret, ingen scenisk baggrund som mockuppen. Sælg-panelets foto er afbleget gråtone med CTA oven i; mockuppen viser rytter i farver ved siden af teksten (KAN RETTES: fjern grå overlay, flyt CTA).
6 Proportioner: header 54 mod 35 skaleret; hero ok. Tre kolonner: mærkefliser har tomt rum mellem logo og tal, regionsfliser 110 px høje med tekst midt i et hult felt (mockuppen ca. 55 px, tekst + tal tæt). Mobil: søgekort 490 px og side 6146 px; mobilen er meget lang (kortene staker 864 px).
7 Typografi/detaljer: tillidsrække har 2 af 4 punkter med 2-linjers tekst og uens højde; fodnote under kortene ("Fem af de 42 annoncer ...") er lang og optager rytme; kun 1 CTA-farve (kobber) iht. DNA, ok.
8 Mikrointeraktion: fliserække har pil-knap, ok; ingen synlig hover-løft verificeret.
"Matcher dette tydeligt billedets opsætning?" Ja i komposition, nej i fotografisk udtryk. "Er vi modige nok?" Næsten: heroen er blevet lav og pæn, men ikke imponerende; fotoet bærer ikke.
Hero-afvejning: sænkningen er rigtig (matcher mockuppens proportion, ingen tekst-på-foto-problem, læsbar på gradient), men faldet fra 600 til 252 uden stærkere foto gør den fladere. Løsningen er foto/crop, ikke højde.

## Ærlighed
Ingen opdigtede tal: "97 annoncer", tilstand og fliseantal kommer fra data. Sådan virker trin 4 "Gå videre til sælger / Annoncesiden fører dig videre til kilden" er korrekt (ingen beskeder/betaling). Fund: under backend-503 viser fliser og mærker alligevel tal (typer 9/9/8, mærker 6/6/5) mens kortene er tomme og banneret siger databasen ikke kunne hentes. Kilde til tallene ikke afklaret (sandsynligvis seed i js/data.js) -> inkonsistent/upålidelig; verificér og skjul tal ved fejlet lager.
Link: kørekortkolonnens "A" peger på soegning.html?koerekort=A, men koerekort-a.html findes (A1/A2 peger på sider). Kontrast: ikke målt systematisk; smoke fandt ingen fejl, tap-mål ok.

## Rettelser til Builder (største først)
1 css/p-forside.css (+ img): hero-foto: nyt crop/foto med hel motorcykel og horisont/rytter synlig til højre; måls: motorcyklens forlygte + tank + forhjul inde i foto-rammen ved 1440 og 390; gradient maks. 55 % bredde.
2 css/p-forside.css typefliser: foto så hele motorcyklen vises (object-position top/center), gradient kun nederste 40 %; kriterie: forlygte og styr synlige i alle 7 fliser.
3 css/p-forside.css annoncekort: titel 1 linje (pris under, eller titel clamp med hele navn i title); mål: 0 afklippede titler for mock-lagerets 5 kort ved 1440.
4 Kort: skjul ⇄ til hover/focus-within; vis hjerte altid; kriterie: kun 1 ikon pr. foto i hvile.
5 Fejl/503 (css + js/home.js): banner ikke oven på heroens motiv (placér under søgekortet); sælg-panel uden tomt hul (skjul eller fuld række); kriterie: ingen tomt område > 80 px.
6 js/home.js 503: skjul/undlad tal på fliser og mærker når DATA_STATUS er 'fejlet'; kriterie: ingen annoncetal synlige ved 503.
7 css/p-forside.css region- og mærkefliser: højde ca. 60-70 px, logo + navn + tal tæt; kriterie: regionsflise <= 72 px, tre-kolonne-sektion <= 170 px højde ved 1440.
8 css/p-forside.css Sådan virker: ikon 36-40 px, trinnumre 28-30 px, tekst 13 px, evt. fællesskabs-kort med billede; kriterie: ikon+tal tydeligt læsbare ved 1440, uden at sektionen vokser > 160 px.
9 css/styles.css header: 54 -> 48 px på >=1100 (mockup 35 skaleret) og nav-tekst 14 px; kriterie: --header-h opdateres, sticky-offsets følger (testet ok i dag).
10 Mobil: søgekort kompakt (felter i 2 kolonner for type/pris, A1/A2/A-segment ét trin), kriterie: søgeknap synlig inden 700 px, side < 5000 px ved 390.
11 Sælg-panel: fjern grå overlay på foto, placér foto til højre og CTA venstre som mockuppen.
12 koerekort-kolonne: A -> koerekort-a.html; fodnote under kort forkortes til 1 linje.

## Screenshots
mock-1440-lys-{fold,full,sec-hero,sec-udvalg,sec-typer,sec-saadan,sec-tre,sec-hvorfor,sec-footer}.png, mock-1440-moerk (lys i praksis), tomt-1440, 503-1440 (fold+full), mock/tomt/503-390 (fold+full), mock-768-lys, mock-1024-lys, mock-390-mørk (mappen crit-a1-shots).
