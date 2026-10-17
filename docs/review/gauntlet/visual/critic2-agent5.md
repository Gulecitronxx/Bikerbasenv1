# Critic runde 2 (blind) - Agent 5 brugere/guides (gauntlet/w14-brugere)

Kopi: C:\Users\pasca\AppData\Local\Temp\c2a5-20261017-202947 (inline-critical + csp-hashes kun på disk). Screenshots: ...\c2a5-20261017-202947\_shots\ (ca. 60 filer).

## Dom
- Artikel: **AFVIS-tendens (6,5/10)** - Login: **7,5/10** - Mine annoncer: **6,5/10**
- Samlet: **AFVIS** (funktion/tekniske krav er rene; visuel fidelity til mockuppen er ikke i mål, og ejeren har ret).

## Funktion / teknik (målt)
- Tests: 213/213 bestået (w14-brugere, w9-saelger, w7-funktion, guides, info-tekst, tekstsider). seo-audit: 101 sider, 0 fund.
- Smoke (320/390/768/1024/1440 x lys+mørk, CLS 0,05, --strikt): 190 målinger, 0 fejl, 0 advarsler - to kørsler.
- 0 vandret overflow i alle mine screenshots. Mørk tilstand er rigtig mørk (body rgb 22,20,15) på alle sider.
- TOC: 17 ankerlinks, 0 brudte; mini-TOC (gd-minitoc) findes og aktiv sektion markeres ved scroll. "Læs også" findes. Kilder-sektion findes. Guides signeret "Af Bikerbasen / Redaktionel guide med kilder" (ærligt).
- Login: forkert kode giver synlig fejl "Forkert e-mail eller adgangskode"; ingen Google/Facebook/Apple/MitID/SMS-tekst. Dashboard logget ind omdirigerer til mine-annoncer.html?tab=oversigt. Alle faner (?tab=) virker; ingen betalingstekst; "Telefonvisninger" vises; fejltilstand viser 2x "Prøv igen".
- Header logget ind: Min profil / Log ud; favoritknap åbner favoritdialog/-fane; mobilmenu åbner og viser Log ud (verificeret). I mobilmenuen stod både "Log ud" og "Log ind" i DOM-tekst (sandsynligvis skjult variant) - bør tjekkes af Builder.
- Tap-mål under 40 px: logo-link (145x30), "Sport"-link (34x40, footer/nav), tekstlinks i brødtekst (naked/cruiser 48-54x23, "Kørekort til motorcykel" 236x32), "vilkår" på login (34x44 ok). Indlejrede tekstlinks er acceptabelt, men logoet 30 px højt er under kravet.
- Mock-bemærkning: Yamaha med status 'draft' fra mock vises som Aktiv (kladder er lokale i Store, ikke i DB) - ikke fejl i produkt.

## Egen afvigelsesliste (prioriteret)

### 1 Manglende moduler (mod Artikel.png)
1. **Artikel: ingen forfatterfoto/navn** - nødvendig (ingen opdigtet forfatter). Men "Af Bikerbasen" med logo-cirkel er svag; mockuppen har en tydelig byline. Delvis nødvendig.
2. **Artikel: ingen inline-fotofliser pr. sektion.** Mockuppens sektion 1 har 5 typefliser med foto og "Se naked motorcykler ->". Vores A2-guide har tabel + tekst + 2 gentagne store Ducati-fotos midt i teksten (samme billede 3 gange på siden inkl. hero). KAN RETTES: brug img/type/*.webp (findes: sport, naked, adventure, touring, cruiser) som 5-fliser i guide-mc-typer / guide-foerste-motorcykel, og i A2-guiden fliser med reelle søgelinks.
3. **Artikel: "Populære motorcykler til begyndere"-liste i sidebjælken** mangler på A2/sælg-guiden (der er "Oplyst effekt under A2-grænsen"-liste på A2 med rigtige annoncer - godt). På sælg-guiden savnes en tilsvarende annonceliste/relevant modul. KAN RETTES (data findes).
4. **Login: billedet er ikke et rytterbillede** - Ducati uden rytter, og bunden af motoren falmer til grå gradient. Rytterfoto er nødvendigt (intet ægte). Men håndskrevne claims "Samme passion"/3 ikon-tekster mangler - kan udelades med rette.
5. **Mine annoncer: ingen "Beskeder"** - nødvendig (findes ikke). Fem kort er rimeligt valg, men "0 Kladde / 0 Favoritter / 0 Søgeagenter" i demo gør rækken død; de to nederste sidebar-bokse er fine.
6. **Mine annoncer: rækken mangler "Udløber om X dage"-spalte og meter-opdelte kolonner** (Visninger/Favoritter/Beskeder med ikoner i lodrette separatorer). Vi viser 0/0/0 for Visninger/Favoritter/Telefonvisninger - 0'er i alle annoncer ser tomt ud, men er ærligt. Dropdown-chevron ("v") på rækken mangler, "Slet"/"Forlæng" kun i kebab. KAN RETTES delvist (vis kun målte tal; skjul tal-række hvis alle 0 og i stedet vis "Ingen visninger endnu").

### 2 Forkert layout
7. **Artikel-hero**: mockup har rytter + foto tværs hele 1672 px bredde med H1 i to linjer, byline med avatar; vores hero er højere (ca. 375 px mod 310 px) fordi H1 bliver 3-4 linjer ("Motorcykeltyper: hvilken passer til dig?" = 4 linjer på 1440). Lede-teksten er 4 linjer ved 600 px. KAN RETTES: H1 max-width 760-820 px, clamp ned, lede-tekst 3 linjer.
8. **Kort fortalt-kortet** overlapper heroens bund i højre side som i mockuppen (godt, tæt på). Men det er højt (4 punkter med 3 linjer hver) og skubber "Er du i tvivl"-kortet under foldlinjen. OK.
9. **Mine annoncer-hero**: mockuppens hero viser rytter+motor tydeligt (190 px høj); vores crop viser kun motorens bagparti/halve forgaffel; billedet virker klippet. KAN RETTES: object-position så tank/forlygte vises, eller lavere/anden crop.
10. Mine annoncer: **ca. 160 px tom flade** mellem "Opret en ny annonce"-boksen og footeren (sidebar længere end liste i oversigt) - ser uafsluttet ud. KAN RETTES (min-height fjernes / sidebar sticky).

### 3 Hierarki
11. **Callouts "Vigtigt"/"Tip" er dubletter**: A2-guiden "Vigtigt: En motorcykel afledt af en model med over 70 kW opfylder ikke A2" = punkt 2 i Kort fortalt; "Tip: Normalt 20 år for A2..." = punkt 4. Sælg-guiden: "Vigtigt: Saml papirerne først" = Kort fortalt #1; "Tip: Mød køberen..." = #3. Teksten er ordret gentaget på samme side, så de virker som pynt. Afvis: skriv unikke callouts (fx advarsel om svindel/konkret regel) eller fjern. KAN RETTES.
12. **Brede indholdsfortegnelse + sticky mini-TOC (≥1024)**: mockup har kun bred boks. Mini-TOC er en funktionel plus men fylder højre kolonnen under Kort fortalt + CTA + annonceliste; på 1440 skal man scrolle før den ses. Acceptabelt, ikke et minus.
13. Tabel i A2 sektion 1 er pæn, men "KATEGORI/MINDSTEALDER/DU KAN FØRE" tabellen er flad uden ikoner/fotos (mockup har visuelle fliser).

### 4 Kort-/panelopbygning
14. Login: venstre kort/højre foto - **meget tæt på mockup** (to kolonner, 4 fordele, tillidsrække i bund, "GRATIS AT OPRETTE"-pille). Forskelle: motorcykelbilledet dækker 4 fordele-tekster (læsbarhed på "Se, hvem der sælger"-linjen svækkes af gradienten til motorens kromdele) og hvid/grå overgang er mere uklar end mockup. Opret-fanen: formularen er høj og højre side tom/halvtom (CTA "Opret en gratis konto" forsvinder, kun "Allerede medlem?"): højre kolonne i opret-tilstand ser reduceret ud. KAN RETTES.
15. Mine annoncer-rækker: statuspille + ikon-sektion er mindre tydelige end mockuppens separerede kolonner; kebab "..." gemmer de sekundære handlinger (ok).

### 5 Billedbrug
16. **Samme Ducati-foto på alle guide-heroer, login og mine annoncer.** Mockupperne bruger forskellige rytterfotos. Nødvendig delvis (kun ét ægte foto + typefotos); men guiderne kunne bruge img/type/*.webp og img/brands pr. emne (KAN RETTES: pr.-guide hero fra type-fotos: sport til A2, adventure til sælg etc.). Mørk-variant: hero ens.
17. Guide hero-tekst: hvid (255) på mørk gradient; visuelt kontrast ok på venstre halvdel (ca. >7:1). Ikke målt pixelvis; foto lysere i midten, men tekst-kolonne er < 600 px.

### 6 Proportioner/spacing
18. Overskrifter sektionsniveau (H2 ca. 32 px) er proportionelle med mockuppen; brødtekst ca. 17-18 px er læsbar. Linjelængde 130+ tegn på "Korte" afsnit i bredden 900 px (ca. 120 tegn) lidt for lang. KAN RETTES: max-width 70ch.
19. Mine annoncer række-højde ca. 125 px ok. Stat-kort (200x135) er lidt tomme (stort ikon + "0").

### 7 Typografi/detaljer
20. Brødtekst-links i orange/kobber ensartet; "Sport"-nav-link 34 px bred. Fejlboks login (pink med lille tekst) har lav styrke/kontrast, og fejlen skubber hele formularen 40 px ned (layout shift - ingen rolig feedbackplads reserveret).
21. Favoritikon i header: "Favoritter0" i DOM-tekst (badge "0") - skjul badge ved 0.

### 8 Mikrointeraktion
22. Mini-TOC scroll-spy virker. Ingen hover/lift på typefliser (findes ikke). Fanerne i Mine annoncer ok. Ingen skeleton-visning observeret under indlæsning.

## Builderens designvalg - vurdering
- Bred indholdsfortegnelse + sticky mini-TOC: godt, bevar.
- Callouts hentet ordret fra "Kort fortalt": **dubletter**, svækker snarere end hjælper -> ændr (rettelse 1).
- Fem statuskort med "På pause" i stedet for "Beskeder": ærligt og meningsfuldt; "Søgeagenter 0" tilfører lidt. OK.

## Prioriterede rettelser (8-12)
1. Guides: erstat dublet-callouts med unikke eller fjern (kriterium: ingen callout-tekst er substring af Kort fortalt-punkt; testet af scripts/guides.test.js).
2. guide-mc-typer + guide-foerste-motorcykel: 5 typefliser med foto (img/type/*.webp), titel, beskrivelse og "Se X motorcykler ->" i sektion 1 (kriterium: 5 fliser >=170x200 px på 1440, links til type-*.html).
3. Hero pr. guide: H1 max 3 linjer og hero-højde <=330 px @1440 (kriterium: målt .guide-hero height; lede-tekst <=3 linjer).
4. Gentagelse af samme Ducati-foto 3x pr. guide: erstat inline-fotos med type-/mærkefotos eller fjern (kriterium: ingen to identiske src på samme guide).
5. Mine annoncer hero: crop med synlig tank+forlygte (kriterium: skærmbillede viser hele forlygten; object-position justeret).
6. Mine annoncer oversigt: fjern ~160 px blank flade over footer; vis "Ingen visninger endnu" i stedet for 0/0/0 (kriterium: afstand liste-bund->footer <=64 px).
7. Login opret-tilstand: højre kolonne med samme 4 fordele + CTA-erstatning/tillidsrække; sikre tekst-kontrast >=4,5:1 over gradienten på "Se, hvem der sælger" (kriterium: kontrastmåling >=4,5 ved 1440 og 1024).
8. Login-fejlboks: reservér plads eller position absolut, så formularen ikke hopper (kriterium: CLS=0 ved fejl; fejltekst-kontrast >=4,5:1).
9. Logo-link i header 30 px højt: udvid klikflade til >=40 px (kriterium: tap-mål >=40 på 390).
10. Skjul favorit-badge ved 0 og mobilmenuens ikke-aktive Log ind/Log ud (kriterium: DOM-tekst indeholder kun relevant variant).
11. Sælg-guide: tilføj sidebar-modul "Se aktuelle annoncer"/"Opret annonce" CTA-kort i stedet for tom plads (kriterium: ≥2 moduler i sidebar >=1024).
12. Linjelængde max-width 70ch i guidetekst (kriterium: <=75 tegn pr. linje @1440).

## Screenshots (mappe _shots)
guides-{d-fold,d-full,m-full,dark-fold}, guide-a2-koerekort-{d-fold,d-full,m-full,dark-fold}, guide-a2-{t768,t1024,dark-full}, guide-saelg-motorcykel-{...4}, guide-mc-typer-{...4}, login-{d,m,t768,t1024,dark,fejl,tom-submit,forkert}, opret-{d,m,dark}, mine-{d,d-full,m,t768,t1024,dark,tom,forhandler}, mine-tab-{mine,favoritter,agenter,konto}, mine-fejl, dash-{privat,forhandler,loggetud}, om-bikerbasen-{d,m}, sikkerhed-{d,m,dark}, vilkaar-{d,m}, 404-{d,m}, afmeld-{d,m}, mobilmenu-logged.
Ikke set/vurderet visuelt i detalje (tidsbudget): om-bikerbasen, vilkaar, 404, afmeld, dashboard-forhandler; kun overflow-målt og smoke-testet (0 fejl). Side-om-side-billeder er ikke genereret som sammensatte filer; sammenligning er gjort visuelt mod de tre mockups.
