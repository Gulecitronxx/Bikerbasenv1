# V7 QA - verificerede fund (fase 1)

Kritikeren retter ikke andres filer; hvert fund har fil, viewport, bevis og forslag. Målt 26.10.2026 mod produktion (kun læsning) og lokal build (e7232df3, `scripts/v7-skaerm.js`, `scripts/v7-baseline.js`, `scripts/v7-cls-last.js`). Prioritet: P0 blokerer push, P1 skal rettes før push, P2 bør, P3 pæn-at-have. Kun rigtige defekter, ikke smag.

## A. Data og indhold (hører til data/klassificering/marked)

### F-V7-01 (P1) 44 % af lageret er 63-71 dage gammelt, men siden siger "De fleste annoncer er bekræftet senest 17. okt."
- Hvor: `js/data.js:329` `senesteBekraeftet()` (medianen) -> forside, søgning og typesider ("Bekræftet 17. okt. 2026" på `type-sport.html`); `js/annonce.js:1139` (annonceside).
- Bevis (live, 26.10.): 718 annoncer med `sidstSet`: 400 er 9 dage, **318 (44 %) er 63-71 dage** (152 x 63 d, 151 x 67 d, 15 x 71 d), ingen imellem, alle eksterne. Medianen er 9 d, så `gammel` (> 14 d) er falsk, og advarslen "Annoncerne kan være ændret siden" vises ikke. Annoncesiden for en 63-dages Honda CB 1000 (`annonce.html?id=0098fee2-be9d-49aa-8956-4a732ed50bf3`) viser "sidst bekræftet for 63 dage siden" og SAMME generiske advarsel som en 9-dages (`...2502cc23...`). Kortene og resultattallet skelner ikke.
- Hvorfor det er et problem: køberen får "771 motorcykler" og en dato, der kun beskriver den friske halvdel; en ikke-bekræftet annonce kan være solgt. Det er en ærlighedsfejl i samme klasse som F-003.
- Forslag (data-agent): (1) vis andelen: "318 af 718 er ikke set hos kilden i over 8 uger" når mere end ~10 % er > 14 d; (2) sortér/vis friske først i standardsorteringen, eller markér kortet "Sidst set for 63 dage siden - tjek hos kilden" over en tærskel (14-30 d); (3) køres crawleren igen, forsvinder tailen af sig selv - vurdér om rækker uden bekræftelse i > 30 d skal skjules som standard (ejerbeslutning, crawlerens `borte`-logik). Testforslag: lås at et lager med 40 % > 30 d giver synlig advarsel (ikke kun median).

### F-V7-02 (P2) Typemanglen (349 af 720) er næsten kun de gamle rækker
- Bevis: uden type: 243 af 318 gamle (76 %) mod 106 af 400 friske (27 %). Fordeling af de 371 med type: cruiser 112, touring 91, adventure 76, naked 60, sport 23, classic 6, cross 3, scooter 0 (filteret viser "Scooter 8" lokalt = demoannoncer; live 0 i drift, men valget står).
- Konsekvens for V7-klassificering: en bedre klassifikator løser højst ca. 106 af de 349 ud af den friske data; de resterende 243 kræver genindeksering. Mål forbedringen på de 400 friske, ikke på 720. Søgefilteret har ingen "uden type"-mulighed (forsiden henviser til "den fulde søgning").
- Forslag: tilføj "Uden type oplyst" som valg i typefilteret, så forsidens henvisning kan følges; og vis tallet i typefilteret så det summerer til resultattallet.

### F-V7-03 (P2) "Lignende motorcykler" på BMW R45 (classic, 450 ccm, 1979) er svagt
- Bevis (live): Honda Café' ræser, Suzuki VS 400 Intruder (cruiser), Yamaha XJ 600 S Diversion (touring), Kawasaki ZZR 600 (sport), Honda CBR 600 F (touring), BMW K 100 (naked, 1988). Kun ét er BMW (sidst), intet er classic. `js/annonce.js:821` `anLignende()`: pris +/- 40 % (3 point) + ccm +/- 35 % (2) = 5 >= tærsklen 4, så pris + størrelse er nok uden mærke, type eller epoke.
- Forslag: kræv mindst ét hårdt match (samme mærke, eller samme type, eller årgang +/- 6 for classic/veteran) ud over pris/ccm, og vægt årgang højere for classic; er der færre end 3, skjul striben (koden gør det allerede ved 0). Teststikprøve: BMW R45 skal ikke vise sport/touring-motorcykler fra 1993-2000 foran en BMW.

### F-V7-04 (P3) Egen annonce (BMW R45) er blindgyde uden samtykket telefon, og indholdet er engelsk
- Hvor: `annonce-bmw-r45-1979-59d3a9a1.html`, `js/annonce.js:258-263, 380`. Udlogget: ingen formular, ingen `tel:`, kun "Log ind for at se sælgeren" + "Opret gratis profil". Teksten er ærlig, men en privat annonce uden telefon kan ikke kontaktes overhovedet (først indlogget kan man se det: "Sælgeren har ikke oplyst telefon. Annoncen kan ikke kontaktes via Bikerbasen endnu.").
- Indhold: beskrivelsen er på engelsk, og feltet "Registrering" viser "Registered" (rå data, `js/annonce.js:1493`; formularen tilbyder "Indregistreret"), titlen i "Lignende" "Honda Café' ræser" har en fejlplaceret apostrof (kildens titel).
- Forslag: det er netop den kløft beskeder-agenten (flag) skal lukke; indtil da bør udlogget tilstand sige det FØR login-knappen ("Sælgeren har endnu ikke åbnet for kontakt via Bikerbasen") i stedet for at love, at login afslører en vej. Ret ikke brugerdata automatisk.

## B. Sidens egne defekter (rigtige, målte)

### F-V7-05 (P2) Mobil-handlingsbjælken på annoncesiden slutter midt i en sætning: "Ikke alle sælgere viser et"
- Hvor: `js/annonce.js:1649` (`<small>Ikke alle sælgere viser et</small>`), vises på alle annoncesider udlogget ved <= 768 px (live og lokalt, 375/430/768, lys og mørk).
- Bevis: skærmbillede `qa/visuel/annonce-375-lys.png` (sticky bjælke nederst) og live DOM-tekst "Log ind for at se nummerIkke alle sælgere viser et". Ordet "nummer" mangler.
- Forslag: "Ikke alle sælgere viser nummer" (eller "Ikke alle viser deres nummer"). Ret samtidig lille-teksten til >= 12 px (den er < 11,5 px).

### F-V7-06 (P2) Sen webfont giver layoutskift; rod til de flaky CLS-tests, og rigtigt for brugere på langsom forbindelse
- Hvor: `@font-face` i `css/` / inline kritisk CSS (`font-display: swap`, ingen fallback-metrik: ingen `size-adjust`/`ascent-override`/`descent-override`), 2 woff2 (Space Grotesk, IBM Plex Sans) allerede `preload`.
- Bevis (`scripts/v7-cls-last.js` med `FONT_FORSINKELSE=700`, 3 gentagelser, identiske tal hver gang): **opret-annonce 768 px mørk 0,0439** (LABEL.radio-card 615 -> 667, 52 px; både ny og rediger), **forside 375 px 0,0332** (FORM.search-panel 180 -> 215), login 375 px 0,0196, maerker 768 px 0,0173; alt andet (soegning, annonce, maerke, type, koerekort, guide, om) <= 0,005. Med normal font er samme sider 0,001-0,007. Det er præcis årsagen til at `V6 opret-annonce: CLS < 0,02` målte 0,0518 én gang af to i `npm test` (kørsel 2): fonten nåede frem efter første maling, fordi maskinen var travl.
- Forslag (css-ejeren): definér en fallback-face med justerede metrikker (`@font-face{font-family:"Plex Fallback";src:local("Arial");size-adjust:...;ascent-override:...}`) og stak den før `sans-serif`, så swap ikke ombryder; eller `font-display: optional` for brødfonten. Mål efter med `FONT_FORSINKELSE=700 node scripts/v7-cls-last.js "opret-annonce.html" 768 moerk 1 3`.

### F-V7-07 (P2) Kortets titel klippes med "..." i 4-5-kolonne-rækker, så modelnavnet går tabt
- Hvor: "Udvalgte"-rækken med pris ved siden af titlen: `koerekort-a2.html` ("Honda CMX 500 Re...", "Royal Enfield Class..."), `type-sport.html` ("Kawasaki ZZR 1400..."), 1440 px lys. På `maerke-honda.html`/`soegning.html` ombrydes den samme slags titel til to linjer ("Honda CX 650 E (Eurosport)"), så kortvarianterne opfører sig forskelligt.
- Bevis: `qa/visuel/koerekort-a2-1440-lys.png`, `type-sport-1440-lys.png`. Brugeren kan ikke se hvilken Royal Enfield det er.
- Forslag: lad titlen ombryde (2 linjer, `-webkit-line-clamp: 2`) og lad prisen stå på egen linje under titlen, som i søgning/mærke; mockuppen (Annonce.png "Lignende") viser fuldt modelnavn.

### F-V7-08 (P3) Opret-annonce: placeholders ligner indtastede værdier
- Hvor: `opret-annonce.html:219,226,230`: `placeholder="12500"`, `"689"`, `"72"` uden "F.eks." (mockuppen: "F.eks. 12.500"). I 1440 px lys og mørk ligner Km-stand/Motorstørrelse/Effekt udfyldte felter (fx "12500 km") ved siden af "F.eks. MT-07".
- Forslag: "F.eks. 12.500", "F.eks. 689", "F.eks. 72".

### F-V7-09 (P3) Mobil tap-mål 32-33 px på sammenfoldelige overskrifter
- Hvor: `opret-annonce.html` ("Sikkerhed og elektronik", "Komfort", "Instrumenter og forbrug", "Bagage og beskyttelse": `summary` 32 px høje ved 375/430/768), `maerke-honda.html` ("Flere Honda-modeller" 33 px). Projektets egen norm er 40 px (tests for topnav/footer); WCAG 2.5.8 (24 px) er opfyldt.
- Forslag: `summary { min-height: 40px }`.

### F-V7-10 (P3) Populære mærker: "Harley-D..." afkortet, de andre viser kun logo + tal
- Hvor: forside 1440 lys, kolonnen "Populære mærker": Harley-Davidsons emblem har ikke navnet i logoet, så etiketten står i 4 tegn + "..." mens ordmærker (Honda, Yamaha, Suzuki, BMW, Kawasaki) står uden etiket. Mærkesiden (`maerker.html`) viser "Harley-Davidson" fuldt.
- Forslag: tillad to linjer eller brug "H-D" kun i tilfælde hvor logoet mangler navn; mindst `title`/`aria-label` fuldt.

### Målt og IKKE fundet (til baseline)
 vandret overflow (0 af 140 målinger), brudte billeder (de 4 "brudte" på forsiden ved 375/430 er `loading="lazy"`-billeder uden for karrusellens synlige del og er ikke defekte), forvrængede billeder (0), usynlig tekst i mørk tilstand (0), konsolfejl fra sidens egen kode på 375-1920 (de to `haendelse`-CORS-meddelelser er kun localhost; live har 0 konsol- og HTTP-fejl på BMW R45).

## C. Test og gate (se qa.md afsnit 2)

### F-V7-12 (P2) `scripts/udgiv.js:87` sletter `_site` med `fs.rmSync(dir, { recursive: true, force: true })` uden genforsøg
- Bevis: `npm test` kørsel 2: `ENOTEMPTY ... \Temp\w13-logo\gen-til\_site` (A14-testen). Årsagen i testen er rettet (egen mappe pr. kørsel), men samme kald i produktionsscriptet er udsat på Windows (virusscanner/indeksering, to byg i samme mappe).
- Forslag (Orchestrator ejer scripts/udgiv.js): `fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })`.

### F-V7-13 (P3) `node --test` kører 15 filer samtidigt som standard
- Bevis: 16 kerner -> 15 samtidige test-filer, hvoraf ca. 40 starter egen Chromium. Mål: 677 s og 562 s (to kørsler, ingen ændring), og de røde tests var forskellige hver gang (se qa.md). Rettet med `--test-concurrency=8` i `package.json` "test" (kun flaget; filllisten er urørt, så merge-konflikter begrænses).
