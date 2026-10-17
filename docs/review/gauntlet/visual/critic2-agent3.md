# Critic runde 2 (blind) - agent3 annonce + opret (gauntlet/w14-annonce, HEAD 7c469b16)

Metode: kopi i %TEMP%\critic2-a3-20261017-202918 (node_modules som junction, inline-critical + csp-hashes kun paa disk, ingen service-key), egen mock (smoke-fixtures + w9-saelger-mock, fotos routet til lokale img/). Tidsbudget 40 min: bredde frem for dybde, se "Ikke naaet".

## Dom: AFVIS
Annonce ligner mockuppen: **6,5/10**. Opret ligner mockuppen: **5,5/10**.
Funktionelt og aerligt er det solidt (0 fejl i smoke, galleri/lightbox/kilde-link/fejltilstande virker). Men sammensaetningen er ikke mockuppens, og to af de mest synlige moduler (kolonnebund, opret-preview) er svage.

## Maalinger
- smoke (--sider annonce*.html,opret-annonce.html, 320/390/768/1024/1440, lys+moerk, --cls 0.05 --strikt): 3 koersler, 40 maalinger hver, 0 fejl 0 advarsler (ingen overflow, CLS under 0,05, ingen tap-maal/kontrast-fund i smoke). Harley-1024-regression ikke genskabt.
- node --test w14-annonce / w9-saelger / w9-marketplace-r2: 42 test ✔, 0 ✖ ved rapportens afslutning (koerslen var ikke helt faerdig; ingen fejl set).
- Funktion (egen annonce, 5 fotos, logget ind): taeller 1/5 -> 2/5 med pil; lightbox aabner, ArrowRight, Esc lukker og fokus gaar tilbage til .gallery-expand; resize 1440->1024->768->390->1440: h1=1, ingen dubletter, overflow 0, 0 pageerrors. "Vis telefonnummer" findes (reveal ikke gennemspillet). Ekstern: kilde-link target=_blank rel="noopener noreferrer nofollow"; ingen galleri/thumbs (1 foto + "Foto: MC Syd - flere billeder i deres annonce"); "Sammenlign" -> "1 valgt til sammenligning". Ugyldigt/ukendt/manglende ?id= -> "Annoncen findes ikke"; backend 500 -> "Vi kunne ikke hente annoncen lige nu ... Proev igen" (aerligt, ikke "solgt"). 0 fotos -> aerlig "Ingen fotos i denne annonce". Kørekortkort: KRAEVER A / IKKE AFGJORT ("kW?" + "Tjek kW i registreringsattesten") - aldrig "bekraeftet". Ingen opdigtede stjerner/svartid/Ring op/beskeder.
- Opret (mock): logget ind - 3 PNG uploadet, "Fortsaet til gennemse" -> trin 4 med advarsler ("Du har 3 billeder", "Sidste syn ikke oplyst"), kort, vilkaarsboks; udgiv uden afkrydsning udgiver ikke (korrekt). Udlogget - "Fortsaet til gennemse" stopper i login-porten ("Log ind og fortsaet", toast "kladde gemt paa denne enhed - log ind, saa fortsaetter du"); valgte billeder gemmes ikke (ærligt formuleret: "3 billeder i alt (3 nye)" vises, men filer overlever ikke login-omvejen - toasten naevner kun kladde).

## Egen afvigelsesliste (prioriteret)
Kategori: N = nodvendig (data mangler/opdigtet), R = KAN RETTES.

### Annonce
1. (2 layout, R, hoej) **Kolonnebund / tomt rum.** Egen annonce 1440: midt+hoejre kolonne slutter ca. 380-430 px over venstre kolonnes bund (venstre fortsaetter med "Det boer du tjekke" til ca. y=1300; midt/hoejre stopper ca. y=950) -> hvid flade ca. 350-420 px under "Kan du koere"/"Handl trygt". Ekstern annonce 1440: omvendt, venstre+midt slutter ca. y=910 mens hoejre kolonne med "Det boer du tjekke" gaar til ca. y=1330 -> ca. 420 px tomt under faktatabel/beskrivelse. Meget synligt i fuld-side (og 1920, hvor containeren kun er ca. 1150 px bred med store gutters - siden fylder ikke 1920-canvas som mockuppen). Mockuppen loeser det med "Det boer du tjekke" som bredt baand (spænder over midt+hoejre, y~595-790) og "Kan du koere" som bred lav flade ved siden af faktatabel. Her er begge smalle kasser.
2. (4 kort-opbygning, R, hoej) **"Kan du koere denne?"** er en smal, hoej kasse (titel brudt over 2 linjer, badge i lille hvid flise med "KRAEVER"-pille); mockuppen er en bred, lav, blaa flade (ikon-venstre, tekst, stor A2-badge hoejre, link under) - ca. 130 px hoej mod her ca. 220 px. Sektionen "Det bygger vurderingen paa" er et lukket tomt felt - virker halvfaerdigt. Data findes: ret layout.
3. (5 billedbrug, R, mellem) **"Det boer du tjekke"**: foto-baandet over teksten er et utydeligt, blegnet stockfoto-udsnit (kun top af en cruiser, gradient til gron) - mockuppen har motorcykel i fuld hoejde til hoejre for tjeklisten (side-om-side). Her ser baandet ud som en fejl-crop og bruger samme foto uanset annonce.
4. (1 manglende moduler, mix) Mockup har titelraekke med logo OG tagrække over; vi har det. Mangler: kontaktkort med stor groen CTA (vi: kun "Log ind for at se saelgeren" - N for Ring op/besked/svartid/stjerner; men CTA-hierarkiet er svagere: saelgerkortets primaer knap er 'Log ind', ikke noget man vil klikke; for udlogget bruger er hoejre kolonne ca. 70 % tekst "Beskeder kan endnu ikke sendes" - R: kortere, mere handlingsrettet). "Se finansieringsforslag" N (opdigtet). Kort-link ("Se paa kort") R (postnr/by findes) - mangler.
5. (3 hierarki, R) Prisen er stor og staerk (godt, tættere paa mockup end foer). Men faktaraekken (km/aargang/ccm/hk) og faktatabellen gentager samme data (4 af 6 felter dobbelt) - mockup har ogsaa det, men tabellen har 12 felter, vi 6-8 med "Ikke oplyst" x2 (Registrering, Afgift): visuelt 'tomme' raekker i hvert annonce-tilfaelde - R: skjul 'Ikke oplyst'-raekker eller saml dem i en linje.
6. (5 billedbrug, N/R) Galleri: stor foto + thumbnails (5) matcher mockuppen godt; mangler "+N"-flise (R, kun hvor >5 fotos - 6-fotos case ikke set). Eksterne: kun 1 foto + kilde-note (korrekt jf. CLAUDE.md, N).
7. (6 proportioner) Galleri 1440: 568x355 mod mockup 562x306 - ok. Titel 40 px vs mockup ~34 px; bredden af midtkolonne smal (430 px) saa "Beskrivelse" bryder tidligt; mockup har midtkolonne ca. 560 px. Mellem 1024-1440 er kolonnebredderne ok (ingen overflow).
8. (7 detaljer) Moerk tilstand fungerer (kontrast ok i smoke), men kortbaggrunde i moerk (#2a1f1a) og groen "Det boer du tjekke" er tungere end lys - acceptabelt. Logo (Yamaha/Honda) i titelraekken: virker, Harley ikke visuelt kontrolleret i dybden.
9. (8 mikro) Fokus tilbage fra lightbox OK. Ingen tydelig hover/favorit-feedback verificeret; favorit-knap findes ikke i header paa ekstern annonce (kun Del + Sammenlign) - uens med egen annonce og mockup (Gem som favorit) - R.
10. Mobil 390: galleri, titel, pris, sticky bund-CTA "Vis nummer" (69.900 kr.) - flot og tæt paa en app-mockup; bedre end desktop.

### Opret annonce
1. (2 layout, R, hoej) Mockup: 5 trin (Detaljer/Billeder/Beskrivelse/Saelgeroplysninger/Gennemse) som tydelig trinbjaelke OG sektioner "1. 2. 3." paa en side. Her: 4 trin, trin 1-3 samlet paa en side, trin 4 = gennemse; stepper-bjaelken virker som sticky navigation. Strukturen er tæt paa mockupen (en side med nummererede sektioner), men "Saelgeroplysninger/kontakt og synlighed" er presset ind i gennemse-trinnet (tlf-afkrydsning), og trinbjaelken er et lidt tomt stort hvidt kort med tynde streger.
2. (4 kort, R, hoej) **Preview-kortet "Din annonce"** er tomt ("Dit annoncekort vises her", stiplet ramme) indtil mærke+model er valgt; mockup viser fra start et fuldt kort med foto, pile, prikker, specs og knappen "Vis eksempel paa fuld annonce". Efter udfyldning vises et standard-annoncekort (foto, spec-chips) - ok men uden karrusel/pile. Kan forbedres: vis altid et eksempelkort (aerligt maerket "Eksempel").
3. (5 billeder, R, hoej) **Billeder-sektionen**: stor dashed upload-flade (ca. 615x115 px) over hele bredden; mockup: kompakt upload-flise + raekke af 4-5 thumbs (primaer-badge, +Tilfoej flere) paa samme linje. Efter upload viser vi thumbnails lavere paa siden - ikke samme "kontaktark"-fornemmelse. Tipsboksen under er en bred groen flade (ok), men fire smaa tekstlinjer under den ("Ingen billeder valgt endnu...", "Tip: Undgaa...") er tæt-pakket, lille graa tekst - ser ud som fodnoter, ikke modul.
4. (3 hierarki, R) Hero: moerk overlay paa motorcykel-foto med groent/hvidt tipskort til hoejre - ligner mockuppens struktur, men titel+undertekst er 3 linjer, hero er hoejere (ca. 275 px) end mockupens ca. 175 px, og foto er 'kold' (moerk gradient) fremfor mockupens varme solnedgang. Tipskortets hoejde overlapper stepperen (kortet rager ned i hero-kant) - acceptabelt.
5. (6 proportioner) Formularen er en smal 4-kolonne grid uden den store titel+tip-sidebox ved titel (mockup har "Titel paa annoncen" med taeller 0/70 + "Gode titler"-boks). Vi har ingen titelfelt (titel auto fra maerke/model/aargang - N/design-valg), saa tipsboksen er flyttet til toppen og fylder en hel linje.
6. (1 manglende) Rich-text-vaerktoejslinje (B/I/lister) mangler; vi har "Struktuer min beskrivelse". N/R (valgfrit). "Sælg trygt"-panel er ok og aerligt (ingen 'tusindvis af koebere').
7. Login-port: virker, men filer overlever ikke login-omvejen og toasten siger kun "kladde" - se "Testaendringer" nedenfor.
8. Gennemse-trin (opret-review): tekstlistevisning med advarsler (triangel i groen = forvirrende: advarsler boer ikke have groen farve), brødtekst i kort + vilkaarsboks - funktionelt godt, visuelt dokumentagtigt og lidt langt. Moerke 'Sådan når købere dig'-boks i beige med orange venstre-streg - fin.

## Kerne-svar paa Builderens egen oplevelse
- "Sidekolonnen ender 150-300 px under" - for den udloggede visning er det snarere 350-420 px og i begge retninger (egne: hoejre/midt kortere, ekstern: venstre/midt kortere). Ved 1440 er det tydeligt i fuld-side og ved scroll til ca. y=900-1300; ved 1920 forstaerkes det af at siden ikke skalerer (gutters ~385 px hver side). Det er det mest synlige ikke-mockup-lignende element efter "Kan du koere"-formen.
- "Er vi modige nok?" Nej. Kolonnestrukturen (tre kolonner, galleri venstre) er mockuppens, men mockuppens bredde baand (koerekort + tjek) og stoerre galleri-thumb-raekke mangler, og detaljer er flade/hvide kort uden mockuppens farvede flader (blaa koerekort, gron tjek-panel med foto).

## Prioriterede rettelser (8-12)
1. css/p-annonce.css: lav "Kan du koere denne" til bred, lav flade (max-height ca. 140 px ved >=1100 px, badge til hoejre, tekst enkelt linje + link); grid-area spaender midt+hoejre ved siden af/under faktatabel. Kriterie: kortets hoejde <= 150 px ved 1440, titel paa 1 linje.
2. css/p-annonce.css + annonce.js: ret kolonnebalance - flyt "Det boer du tjekke" som bredt baand over midt+hoejre (grid-column 2/4) saa sluthoejderne er indenfor 80 px i alle fixtures (egen 5 fotos, 0 fotos, ekstern med/uden foto), 1440 og 1920. Maal: |bund(venstre)-bund(hoejre)| <= 80 px.
3. "Det boer du tjekke": motorcykelfoto til hoejre for tjeklisten (side-om-side >=900 px), annoncens egen foto eller varm motivbillede; ikke afskaaret baand. Kriterie: foto synligt >= 40 % af kortets hoejde, ikke gradient-blegnet.
4. annonce: skjul "Ikke oplyst"-raekker i faktatabel (Registrering, Afgift) eller saml i en linje "Ikke oplyst: ...". Kriterie: ingen 'Ikke oplyst' i hoved-tabel naar andre data mangler ikke.
5. annonce: tilfoej "Se paa kort"-link (postnr/by) i saelgerkort + favorit-knap paa eksterne annoncer. Kriterie: begge til stede, ingen opdigtet data.
6. annonce: container-max-bredde ved >=1600 px til >= 1400 px (som mockup, der fylder canvas) eller flyt indhold saa 1920 ikke har 385 px tomme side-margener. Kriterie: gutter <= 120 px ved 1920 for annoncesiden.
7. css/p-opret.css + opret-annonce.js: preview-kort viser altid et eksempelkort (maerket "Eksempel") fra start med foto-pladsholder, pile og specs; efter upload karrusel/pile. Kriterie: preview-kort vises uden brugerinput og med billede efter 1. upload.
8. opret: billedsektion som kompakt upload-flise + thumbnail-raekke (primaer-badge, "+ Tilfoej flere") i en linje; flyt tip-fodnoterne ind i tipsboksen. Kriterie: upload-flade <= 140 px hoej, thumbs i samme raekke ved >=1100 px.
9. opret: hero lavere (<= 200 px) og varmere motiv; trin "Saelgeroplysninger" som egen sektion (telefon-synlighed) frem for kun i gennemse. Kriterie: hero hoejde <= 200 px ved 1440.
10. opret login-port: toast og knap skal sige at valgte billeder skal vaelges igen efter login (eller gem dem i IndexedDB), og "N nye"-taeller maa ikke antyde at de bevares. Kriterie: tekst naevner billeder eksplicit; test der verificerer.
11. opret gennemse: advarselsikon i amber/gul, ikke groen.
12. Tilfoej 1 test med 6+ fotos der kontrollerer "+N"-flise og med 0/1 foto ingen karrusel-pile.

## Testaendringer (5 w9-saelger-tests)
Jeg har ikke kunnet gennemgaa diff i dybden. Observation: flowet er aerligt i skabelon (login-port; ingen datatab for felter; billedfiler overlever ikke login-omvejen - teksten i login-porten siger ikke dette tydeligt), og testene er groenne (42 ✔ ved afslutning, 0 ✖). Risiko: tests der nu forventer ét tilbage-trin og login-port kan dække mindre af trin 2/3 hvis siderne er slaaet sammen; saml-sider reducerer antallet af trin-naviationstests, men ikke ærlighedsdækningen. Anbefaling: tilfoej test for 'billeder overlever IKKE login' (eller loes det) saa det er et eksplicit kriterie.

## Aerlighed
Ingen opdigtede tal/stjerner/svartid/'Ring op'/beskeder fundet. Kørekort: MULIG/KRAEVER A/IKKE AFGJORT/KAN IKKE AFGOERES; ikke 'bekraeftet'. Ekstern: ét foto + "Foto: kilde". Kilde-link i ny fane med noopener.

## Ikke naaet (tidsbudget)
Telefon-reveal logget ind, favorit-toggle logget ind, upload stor fil/ikke-billede/12 max, kladde-gendan, redigering, opret fejl/500 efter publish, Harley-logo-detalje, tap-maal/kontrast udover smoke, ?id= mod beskadiget data udover viste tilfaelde, 6+ foto "+N"-flise.

## Screenshots
%TEMP%\critic2-a3-shots\ (fold/full): own1-{1440 l/m,390,768,1024,1920}, own0-1440, own1ph-1440, own4_48hk-1440, own5nodata-1440, own6long-{1440,390}, ext1-{1440,390}, ext5nophoto-1440, ext10harley-1440, ext12noprice-1440, opret-{1440,390}-{l,m}, opretlogged-{1440,390}, opret-filled-{in,out}, opret-review-{in,out}, opret-publish-in, func-lightbox, func-logged-1440, func-500, func-bad-*.
