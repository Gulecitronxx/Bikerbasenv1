# Critic agent 4 (w14-maerker): mærke-, type- og kørekortsider

Dom: AFVIS. Mærkeside 5/10, typeside 5/10, kørekortside 5,5/10. Familien samlet 5/10.
Metode: egen kopi `%TEMP%\critic-w14-20261017-194107\site`, syntetisk lager (308 annoncer, Builderens data.js/preload.js), generatorer kørt kun med mock-fetch. Screenshots i `...\critic-w14-20261017-194107\out\{d,s,f,m,md}`. Builderens dokument er læst efter min egen liste.

## Det man ser først (1440x900)
Mockuppernes første skærm rummer hero, søgekort, tillidsrække OG annoncerække med CTA-panel (Yamaha/type) eller annoncerækken næsten fuldt synlig (kørekort). Her står annoncerækken under folden på mærkeside (kort starter y=700, kun billede + pris ses), type (y=740) og kørekort (y=816). Heroerne er 380/380/306 px højt mod mockuppens 265/250/175 px. Det er stadig 40-70 % for højt, og det er derfor siden føles "anderledes" end billedet.

## Egen afvigelsesliste (prioriteret). N = nødvendig (manglende asset/opdigtet), R = kan rettes
1. Moduler
 - Mærkeside: "Udforsk Yamaha efter kørekort" viser kun A2 + A (mockup A1/A2/A); ok når A1=0, men blokken er tom og asymmetrisk. R (vis A1 med "0"/skjul pænt). Regionsboksen "Find Yamaha i din region" er ~500 px høj med 3 fliser og et tomt hul under (se yamaha s1/s2, y 700-1200). R: kolonnerne skal have samme indhold eller stå i grid-align start med egen højde. Dette er den mest synlige svage udførelse.
 - Typeside: mockuppens 4 undertypekort (Supersport, Sports-touring ...) er erstattet af 4 filtre ("Til A2", "Under 60.000 kr.", "Under 10.000 km", "I Syddanmark") med SAMME foto 4 gange. Ikke det samme modul; det ser ud som gentagen billedfejl. R (kan bruge fire forskellige type-fotos eller ikon i stedet for foto; undertyper kan ikke opdigtes uden data, N for navnene).
 - Typeside: hero-statskort (antal, topmærker, prisniveau) er til stede og er det tætteste modul på mockuppen. Godt.
 - Kørekort: tillidsrække 4 ikon + grøn guide-boks matcher. "Hvad må du køre / ikke se / råd" 3 bokse + grøn "Klar til næste skridt" findes. Guiderække "Guides og viden om A2" ses i mockup; vi har kun lille guide-tekst i bunden. R delvist.
 - Mærkeside: mockup "Sådan virker" + "Bliv en del af fællesskabet" er til stede (grøn boks "Køb og sælg trygt" uden illustration; mockuppen har bjerg-/vej-grafik). R/N: grafik mangler som asset.
2. Layout
 - Hero ikke fuldbleed med rytter (alle tre). N for rytterfoto (kun hero-*.webp + studiofotos findes), men R for at hero-billedet fylder højre halvdel og at den dunkle gradient ikke ser ud som et rektangel. På mærkesiden: et mørkt Ducati-naked-foto på Yamaha-siden (fejlmærke synligt i hero, også i modelfliserne "MT-07"). På typesiden: bike frit-stillet i radial glød = sticker-look. Kun det rene mærke-fotokatalog kan løse det; ellers brug neutral baggrundsfoto frem for et forkert mærke.
 - Mærkeside har ~24 annoncekort "Flere Yamaha-annoncer" (6100 px side; mockup slutter i 3 kolonner). Mobil 10.200-11.100 px. R: begræns til 8 på mærke/type/kørekort + "Se alle", eller flyt under bundens 3 kolonner.
 - Typefliser: mærke 4 fliser (mockup 7), kørekort 5 (mockup 7), flisen er ca. 330x100 uden tydelig foto-beskæring. Fliserne fylder rækken (godt), men kun 4 stk. på Yamaha lyder tomt. N (data), men R at vise de typer der er (ok).
3. Hierarki: Kort fortalt-boksen (grøn, to kolonner) er flot, men overdøver annoncerne på type/kørekort fordi den står lige efter rækken i fuld bredde. Mockup har den ikke i samme vægt. Lav R: smallere eller rykkes under modeller.
4. Kort/panelopbygning
 - CTA-panelet er mørkt/sort (mockup: lyst gradient med rytterfoto i højre halvdel; fotoet er her et klippet, blurret bike-udsnit). Mørk panel + hvid tekst skærer sig mod den lyse side; billede sidder kun nederst som skygge. R.
 - Annoncekort: 5 i række med chips på én række er fint. "Kilde: Forhandler" og kørekort-chip matcher. På mærkesiden kort-footer "guloggratis.dk" i stedet for "Kilde: Forhandler" er ærligt og ok.
 - Kort uden foto ("Fotoet kunne ikke hentes", "Ingen fotos i denne annonce") er to tomme stiplede kasser i hero-nære udvalg (type-sport, koerekort-a2, a1). N (data), men R: prioritér annoncer med foto i "Udvalgte".
5. Billedbrug: samme fire studiofotos gentages overalt (R-flaske: Sport-fotoet står i 4 undertype-kort + 3 modelfliser + hero). Intet rytterfoto. Delvis N.
6. Proportioner: søgekort på mærkeside overlapper hero (godt), på type overlapper kun delvist; på kørekort står det mellem tillidsrække og annoncer uden overlap (mockup gør det sådan på A2, så OK). Rubrikker "Udvalgte ..." 28 px mod mockup 20 px; sektionsafstande 40 px vs 24 px: hele siden er ~25 % luftigere end billedet.
7. Typografi/detaljer: "Se alle 61 Yamaha i søgningen" er en stor orange pille, venstrejusteret under rækken og tom luft ved siden af (mockup: lille link øverst til højre). R. Chip-grupper "Pris/Type/Sortér i søgningen" er funktionelle men ikke i mockup og skaber fire rækker pille-støj.
8. Mikrointeraktion: ikke testet dybt; hover og fokus findes på kort og knapper.

"Matcher dette tydeligt billedets opsætning?" Kørekortsiden strukturelt ja (tillidsrække, søgekort, Udvalgte + CTA, typefliser, 3 info + CTA, modeller), men ikke visuelt. Mærke- og typeside nej: for højt hero, forkert foto, sticker-hero, tomme huller, gentagne fotos. "Er vi modige nok?" Nej: heroen er en mørk bjælke med et lille objekt, billedets energi (fotografi, rytter, logo-lockup 70 px) mangler; alt andet er pænt og forsigtigt.

## 10 prioriterede rettelser
1. `css/*maerke*`/`scripts/build-brand-pages.js` (regions/kørekortkolonner): fjern 500 px tomt hul; tre kolonner samme højde, ingen boks >220 px højere end indholdet. Mål: ingen kolonne med >60 px tom bund ved 1440.
2. Hero (alle tre): max 300 px (mærke/type), 240 px (kørekort) ved 1440, så annoncekortenes foto og pris ses over folden (kort starter y<=620). Mål: `Udvalgte`-række y-top <=600.
3. Hero-foto: fyld højre 55 % med fuldbleed foto + venstre gradient; drop radial-glød-cutout på type; brug aldrig et andet mærkes bike i mærkehero (brug neutral hero-fil eller mærkets egne type-fotos). Mål: ingen synlig brand-mismatch, ingen synlig billedkant.
4. `scripts/build-facet-pages.js` "Udforsk ... efter behov": fire kort med forskellige fotos/ikoner i stedet for samme foto 4 gange. Mål: ingen to naboer med samme src.
5. CTA-panel: lyst gradient-panel med foto i højre halvdel (som mockup), grøn/orange knap, ikke sort. Mål: panelbaggrund lys, foto >=40 % bredde.
6. Begræns "Flere ... annoncer" til 8 (2 rækker) + link; mobil sidehøjde mærke/type/kørekort <= 7000 px.
7. Udvalgte: sortér annoncer med foto først, fald aldrig til 2 tomme stiplede kort i 5 ("Fotoet kunne ikke hentes" = 0 i første række når der findes fotos).
8. Kort fortalt: komprimér til ét bånd (halv højde) eller flyt under modelfliser. Mål: boks <=90 px høj.
9. Sektionsrytme: h2 22 px, afstand 28 px; "Se alle" som lille link i højre hjørne (ikke orange pille). Mål: mærkeside <=5200 px ved 1440.
10. Mærkeside typefliser: vis alle typer i 7 ens fliser med 1 række, og A1/A2/A fliser altid 3 (0 vises "0 annoncer" eller skjul række). Mål: ens format 3 fliser.
(11 CTA-grafik: bjerg/vej-illustration til grøn boks kræver nyt asset.)

## Logo-korrekthed
Hero-lockup (emblem 72 px + ordmærke 44 px) ses på Yamaha: emblem hvid stemmegaffel og hvidt YAMAHA-ordmærke: korrekt form, men ensfarvet hvid; mockup har rød YAMAHA + rødt cirkelemblem. Ejerens ensfarvede valg er godkendt; afvigelsen er farven. Små logoer i maerker.html: Honda "vinge" og H-D bar-and-shield er læselige; KTM, Kawasaki, BMW, Suzuki ok. A-Z: Vespa/Lauge Jensen/Piaggio viser initial/forenklet i bobler (mindre ens vægt, Lauge Jensen "LJ" er placeholder). H-D-emblem i A-Z er så lille at skriften er ulæselig. CTA-logoet på Yamaha (lille emblem + ordmærke over "Find din næste Yamaha") er 40 px og svagt; ingen rettelse påkrævet.

## Funktion, SEO og ærlighed
- Link: 4.477 interne links i de 33 sider; eneste "døde" er `annonce-*-00000000.html` (syntetiske egne fixtureannoncer, ikke fejl).
- Smoke (`--cls 0.05 --strikt`, 90 målinger, 9 sider x 5 vp x 2 temaer): 2 fejl første kørsel (honda 768 mørk CLS 0,277; cruiser 768 lys CLS 0,143); ved genkørsel 0 fejl. Flaky CLS ved belastning; Builderens "0 fejl" holder kun ved ro. Anbefal at give hero/søgekort/annoncerække fast min-højde så CLS ikke afhænger af timing.
- `seo-audit.js`: 109 sider, 81 indekserbare, 0 fund. title/H1/JSON-LD-antal uændret på yamaha, maerker, region-syddanmark, koerekort-a2. Afvigelser kun på type-sport ("Brugte Sport-motorcykler til salg") og koerekort-a1 ("Kørekort A1" / H1 "Kørekort A1"), men generatordiffen rører ikke title-logik; skyldes tynd syntetisk data (4 A1-annoncer). Tjek ved ægte byg at A1-titel ikke tipper. De committede html-filer i worktreen er IKKE regenereret: "ligner mockuppen" kræver byg efter merge.
- Tests: `node --test` (w14-maerker, w13-logo, facet-sider, maerkeside) nåede ikke at levere resultat inden min tidsfrist (gemt i baggrund uden output); ikke verificeret af mig. Builderen oplyser grøn.
- Kørekortregler: A1 18 år/11 kW/0,1 kW/kg og A2 35 kW (ca. 47 hk)/0,2 kW/kg/fra 20 år ses korrekt på siden; A: "24 år, eller 22 efter 2 år" korrekt.
- Ærlighed: ingen "3.842" eller opdigtede tal; alle tal fra lager. Søgekortets tal = antal i søgningen (116/31/61).
- Ikke afprøvet i tiden: tomt lager/fejlbanner, hydrering mod mock, hurtigsøg A-Z interaktion, tap-mål og kontrast programmatisk.

## Screenshots
`...\critic-w14-20261017-194107\out\d\` (viewport 1440 lys, alle 11 sider), `out\f\` (fuld side 1440), `out\s\` (6 segmenter yamaha/type-sport/koerekort-a2), `out\m\` (390 lys, 11 sider), `out\md\` (1440 mørk, 3 sider), `out\m2\` (768 lys, 3 sider), `out\mf\` (390 fuld side, 4 sider), mørk 390/768 for alle 11 i `out\m\`.
