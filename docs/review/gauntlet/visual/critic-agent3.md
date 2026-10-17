# Critic agent3: annonce + opret-annonce (gauntlet/w14-annonce)

Metode: kopi i %TEMP%\critic3-20261017-192410, egen Playwright-harness (smoke-fixtures + w9-saelger-mock, annoncefotos routet til img/type/*.webp), uden SERVICE_ROLE_KEY. Builderens dokument er ikke laest; alt nedenfor er egne maalinger.

## Dom
- ANNONCE: AFVIS. Ligner mockuppen: 6/10.
- OPRET: AFVIS. Ligner mockuppen: 5/10.
Struktur og funktion er solide; balancen, de to baerende kort og det store billede er stadig ikke paa mockuppens niveau.

## Egen afvigelsesliste (prioriteret)
1. Manglende moduler (annonce)
   - Galleri mangler "+N"-overflow-tile og fuldskaerms-knap (0 expand-knapper). KAN RETTES.
   - Saelgerpanel: stjerner/svartid/Ring op/Send besked er opdigtet og skal IKKE med. Men panelet er svagt: egne annoncer viser "Privat saelger / 2024 Medlem siden" + to login-knapper. Delvist noedvendigt (ingen telefon uden login), men layout kan loeftes.
   - Finansiering, forhandlerlogo, "Se paa kort": ingen data, OK udeladt.
   - Beskrivelse uden groenne check-punkter: noedvendigt for eksterne (ingen data), kan rettes for egne hvis udstyrsfelt udfyldt.
2. Layout/kolonner: 3 kolonner som mockup, men thumbs er smaa (~60 px mod mockup ~100 px), faktagitteret er 2 smalle kolonner med enlig raekke ("Motorstoerrelse" alene).
   - "Det boer du tjekke" ligger nederst i venstre kolonne (mockup: hoejre, bred, under Handl trygt). Paa eksterne annoncer klemmes teksten (5 punkter braekker over 2-3 linjer) og teksten loeber OVER motorcykelfotoet ("tidligere uheld"). KAN RETTES.
3. Tomt rum i kort: SYNLIGT OG GRIMT. Egen annonce 1440: koerekortkortet er straekt til ~490 px med ca. 200 px tomt under legenden og ~100 px over indholdet; "Handl trygt" (ekstern) har ~170 px tom bund; sidst sagt ogsaa "Det boer du tjekke" paa ekstern. Direkte foelge af balanceringens align-stretch. Mockuppen har taet indhold og kort af forskellig hoejde. KAN RETTES.
4. Kortopbygning: koerekortkort er smalt og venstretungt med lille A-boks (mockup: lav, bred flade, stor A2-boks); legenden Mulig/Kraever A/Ikke afgjort fylder og traekker kortet ned. Badget er aerligt ("Kraever A / foelger af oplyst effekt", aldrig "bekraeftet") - godt. Noegletal uden separatorer; ved manglende tal staar kun "2021 Aargang" tilbage.
5. Billedbrug: egen annonce rigtigt galleri; ekstern ét thumbnail + "Foto: MC Syd" (korrekt); uden foto aerlig pladsholder.
6. Spacing: mockup har laengere lodret rytme og mere luft i midtersektioner; labels i faktabokse lav kontrast (ikke maalt fuldt).
7. Typografi/detaljer: ok; ikonsaet konsistent.
8. Mikrointeraktion: alt virker (se tests), men ingen lightbox.

## Opret-annonce (vs. mockup 5 trin)
- Vi har 4 trin (Type&specs, Pris&beskrivelse, Billeder, Gennemse). Trin 1+2 ligger paa én lang side; billeder er egen skaerm EFTER pris (mockup: sektion 2 paa samme lange side foer beskrivelse). 4 vs 5 trin er acceptabelt (Saelgeroplysninger udgaar, aerligt - telefon/synlighed er ikke bygget som valg). KAN RETTES: flyt Billeder ind som sektion 2.
- Felter i 2 kolonner + tips-boks til hoejre -> lang side; mockup har 4-kolonne grid (Maerke/Model/Aargang/Km, ccm/Effekt/Vaegt/Pris).
- Hero med foto, overlappende trinbjaelke, tre tillidskort: taet paa mockup.
- Preview: live-kort + "Saelg trygt" i hoejrekolonne som mockup. Uden foto "Ingen fotos i denne annonce" (aerligt); efter upload vises billedet. Mangler "Vis eksempel paa fuld annonce" og galleripile/prikker.
- Billedtrin: dropzone + miniaturer i én raekke + "Primaert billede" + tipsbaand: godt, naer mockup; tiles er smaa/uens.
- Ingen "3x flere henvendelser" (korrekt). Fejl: validering paa felter og toast ved postnr.

## 10-12 rettelser til Builder (stoerst foerst)
1. annonce.html / css/p-annonce.css: fjern align-stretch i de tre kolonner; align-items:start. Kriterie: intet kort har >40 px tomt rum under sidste indholdselement ved 1440 (egen+ekstern).
2. Koerekortkort (js/annonce.js + css): kompakt bred flade, ikon / tekst / stor A-boks i én raekke, legende i sammenfoldet detalje. Kriterie: kort <=200 px hoejt ved 1440 (nu ~490).
3. "Det boer du tjekke": flyt til hoejre kolonne under "Handl trygt", bred (>=380 px), foto uden overlap med tekst. Kriterie: ingen tekst over fotoflade ved 1024/1440.
4. Galleri: thumbs >=100x70 px, 5 thumbs + "+N"-tile, fuldskaerms-lightbox (Esc/piletaster). Kriterie: 14 fotos -> 5 thumbs + "+9", knap med aria-label.
5. Faktatabel: to lige kolonner over hele bredden; skjul/sorter "Ikke oplyst" til sidst.
6. Saelger/kilde-panel: staerkere kort (type-badge, by, tydelig CTA, Del/Sammenlign); ingen stjerner/svartid/telefon/beskeder.
7. Opret: Billeder som sektion 2 paa den lange side; stepper 4 trin (Detaljer, Billeder, Beskrivelse&pris, Gennemse). Kriterie: sektionsorden som mockup.
8. Opret: 4-kolonne felt-grid >=1200 px, tips-boks til hoejre for Titel. Kriterie: sektion 1 <=620 px hoej ved 1440.
9. Opret preview: "Vis eksempel paa fuld annonce" + galleripile naar >=2 billeder.
10. CLS: annonce-harley-davidson-flhx-2007-541ad405.html CLS 0.298 ved 1024 (lys+moerk); reserver gallerihoejde (aspect-ratio) og min-height paa koerekortkort. Kriterie: smoke --cls 0.05 --strikt exit 0.
11. Beskrivelse: egne annoncers udstyr/historik som groenne check-punkter (kun udfyldt).
12. Kontrast af labels i faktabokse >=4,5:1 (maal og dokumenter).

## Funktionelle tests (egne)
- Galleri: pil, piletast, thumbs, taeller 1/3->2/3->3/3: OK. Favorit: header-taeller + aria-pressed: OK. Sammenlign: gemmes, aria-pressed: OK.
- Kilde-link (ekstern): target=_blank rel="noopener noreferrer nofollow": OK.
- Koerekort: aldrig "bekraeftet" som paastand; Kraever A / Kan ikke afgoeres vist: OK. Telefon-reveal: findes ikke for gaest (log ind); ikke testet logget ind.
- Resize 1440->1024->768->390->1440: ingen dubletter (h1=1, hvert modul 1x). Backend 500, tomt svar, oedelagt ?id=: aerlig besked, ingen pageerror.
- Opret hele flowet med mock (validering, 4 billeder, udgiv): 1 annonce, 4 uploads, 0 pageerror ved 1440/768/390 og moerk.
- node --test w14-annonce + w9-saelger: ingen fejl set i log (alle viste tests OK).
- Smoke (320..1440, lys+moerk, cls 0.05, strikt): 40 maalinger, 0 overflow, 2 fejl = CLS harley-statisk ved 1024.
- Tap-maal/kontrast: ikke fuldt maalt (tid); smoke gav ingen tap-advarsler.

## Aerlighed/juridisk
Ingen opdigtede tal, ingen stjerner/svartid/beskeder/MitID/betaling. 'Mulig' != 'bekraeftet'. Eksterne: 1 thumbnail, kilde + deeplink, "vi hoster ikke annoncen". Bestaaet.

## Screenshots (scratchpad\cr3\ under ...\scratchpad)
an-{egen3,ekstern,egen0foto,ekstern48,ekstern-intetfoto,egen1foto-forh}-{1440,390,768}-{light,dark}.png (dark kun udvalgte), an-ekstern-ingental-1440-light.png, an-resize-1440.png, an-fejl-{brokenid,empty,500}.png, op-{1a-tom,1b-fejl,1c-udfyldt,2-trin2,3-billeder,4-gennemse,5-efter-udgiv}-{1440,390,768}-light.png, op-*-1440-dark.png. Side-om-side-filer er ikke lavet (tid); sammenligning gjort visuelt mod Annonce.png og Opret annonce.png.
