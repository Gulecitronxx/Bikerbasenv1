# Builder w11-kort (annoncekort + annoncelayout, billede 1/2/8/9 kort og billede 3 annonce)

Branch `gauntlet/w11-kort` fra 226dbe7. Test kun mod lokal mock (smoke-browser/smoke-fixtures), ingen produktion, ingen build/udgiv/generatorer.
Intet opdigtet: ingen stjerner, anmeldelser, "autoriseret forhandler", svartid, tal, beskeder, betaling. Brandfarve til CTA, grøn kun til ✓. Kørekort via `a2Status` (48-49 hk = ikke afgjort).

## Acceptkriterier (målbare, skrevet før koden)

### K. Kortets fod og chips (delt komponent `listingCardHTML`)
- K1 Ved 320, 360 og 390 px i 2-kolonne-gitteret (soegning, mærke/type-lister, lignende) er ingen fodtekst afkortet til under 4 tegn: målt `scrollWidth <= clientWidth` på `.rk-sted > span` OG `.rk-kilde > span` for alle kort, og sted står først (venstre/øverst).
- K2 Foden har ens højde på alle kort i samme række: `.rk-fod` top-forskel mellem to nabokort i en række = 0 px, kortenes højde ens (række-top/bund-forskel <= 1 px).
- K3 Hvert `.rk-sted` og `.rk-kilde` har `aria-label` med fuld tekst (sted, sælgertype + kilde) og `title`.
- K4 Spec-chips (ccm, hk) tegnes kun når tallet er oplyst; ingen "ccm ikke oplyst"/"hk ikke oplyst"-chip, ingen "null/undefined/NaN" i kortets tekst, alle chiprækker i en kortrække har samme starthøjde (min. én reserveret række).
- K5 Samme komponent i alle varianter: egen, ekstern m/u foto, sammenlign-visning, liste, swipe, "lignende annoncer", forsidens udvalgte. Swipe-kortet bruger samme fod-klasser (`.rk-sted`/`.rk-kilde`).
- K6 Tap-mål på kortets knapper (hjerte, sammenlign) >= 40 px ved 320/390.

### A. Annoncesiden
- A1 760-1179 px: tablet-layout i to spalter. Venstre: galleri, beskrivelse, faktatabel. Højre (sidebjælke, klistret >= 900 px): titel/pris/nøgletal, kørekort-kort, kilde/sælger, "Handl trygt". Under begge: "Det bør du tjekke" og faktatabel/tjekliste i 2 kolonner. Målt: ved 768 og 1024 står galleri og pris side om side (pris.top < galleri.bottom), 2 grid-kolonner, ingen tom luft over 48 px mellem kortbunde i samme række.
- A2 < 760 px rækkefølge i DOM-visning: galleri, titel+pris, nøgletal, kørekort, beskrivelse, faktatabel, kilde/sælger, handl trygt, tjekliste, lignende (målt via `getBoundingClientRect().top`-rækkefølge).
- A3 Mobil: sticky handlingsbjælke (pris + primær handling) synlig < 760 px på egne og eksterne annoncer; skjult >= 760; dækker intet (body-padding), tap-mål >= 44 px.
- A4 Ingen vandret overflow (`scrollWidth == clientWidth`), CLS < 0,05, ingen konsolfejl ved 320/390/768/1024/1440, lys og mørk (smoke-browser `--sider annonce,soegning --cls 0.05 --strikt`).
- A5 Kontrast >= 4,5:1 for brødtekst/muted/chiptekst (getComputedStyle mod nærmeste opake baggrund), lys + mørk. Tap-mål >= 40 px på kortknapper, handlingsknapper, galleriknapper, sidebjælkens CTA.
- A6 Kørekort: 48/49 hk "ikke afgjort", 44 hk "Mulig A2", 130 hk "Kræver A" uændret.
- F Ingen regression: `node --check`, `npm test` grønt, før/efter med `scripts/visuel-regression.js` (soegning, annonce).

## Status / bevis
Harness udenfor repo: `%TEMP%\w11` (h.js, meas.js, contrast.js, shot.js, clip.js). Alt mod lokal mock, ingen produktion/build/generatorer.

Bygget
- K1-K3/K5: ny `kortFodHTML` i js/components.js (delt af alle `listingCardHTML`-kort: forside, soegning, mærke/type/region/kørekort, lignende, forhåndsvisning, forhandler, noscript). Under 240 px kortbredde (container query) stakkes foden: sted først, kilde som ikon + kort navn (domæne/forhandlernavn) på linje 2; sælgertypen ("Forhandler ·") skjules under 300 px. Over 240 px: sted får sin naturlige bredde (maks 60 %), kilden ellipser med resten (før: "Sønderbor…" ved 1440). `role=group` + `aria-label` ("Sted: …", "Kilde: Forhandler · mcsyd.dk") + `title` med fuld tekst. Alle kort i en række har samme bredde og dermed samme fodhøjde.
- K4: "ccm/hk ikke oplyst"-chippen er fjernet (chips kun for oplyste tal). Linjen "år | km | type" siger stadig "Årgang/Km ikke oplyst" (DNA: "Ikke oplyst frem for gæt"; eksisterende tests låser det) - bevidst valg, se nedenfor.
- K6: sammenlign-knappen 34 -> 40 px synligt (+2 px kant = 44 px trykflade).
- A1: tablet 760-1179: `anTabletKolonner` (js/annonce.js) lægger galleri + beskrivelse + faktatabel til venstre og titel/pris/nøgletal + kørekort + kilde til højre; "Det bør du tjekke" og "Handl trygt" i række 2 side om side. Den kortere kolonne strækker sit sidste kort (ingen hul). Elementerne sættes tilbage ved andre bredder (`anGenopretOprindelig`); lytteren slår nu grid'en op ved hvert skift (før: den fangede den første).
- A2: mobilrækkefølge: galleri, titel+pris+nøgletal, kørekort, beskrivelse, faktatabel, kilde/sælger, handl trygt, tjekliste, lignende (før: sælger lå lige efter titlen).
- A3: sticky bjælke < 760 px viser nu pris + primær handling også på egne annoncer; skjult >= 760 (sælgerboksen står synligt i sidebjælken).
- Kontrastfejl rettet: mørk "KRÆVER"-pille på annoncesiden var 2,5:1 (orange på lys), nu mørk tekst.

Målt (mock)
- Smoke `--sider annonce,soegning,index --viewports 320,390,768,1024,1440 --cls 0.05 --strikt`: 30 målinger, 0 fejl, 0 advarsler.
- Overflow 0 ved 320/390/768/1024/1440 x lys/mørk på index, soegning, mærke, type, kørekort og 3 annoncer. Afkortede fodtekster < 60 px: 0 (før: "R…", "Ro…", "Sønderbor…"). Kortknapper >= 40 px overalt.
- Kontrast (getComputedStyle mod nærmeste opake baggrund, kort + annonceside, 4 sider x 5 bredder x lys/mørk = 40 målinger): 0 under 4,5:1 efter rettelsen.
- Før/efter `visuel-regression.js` (soegning, annonce x 390/768/1440 lys): 1440 søgning 0,1 %, annonce 1440 5,6 % (kortfod/knap), mobil/tablet er bevidst ændret (soegning 390 50 %, annonce 768 62 %, annonce 390 27 %).
- Nye tests: `js/w11-kort.test.js` (8 browsertests, springes over uden Playwright). Ændrede eksisterende tests (bevidst): `js/annoncekort.test.js` (chips: ingen "ikke oplyst"-chip), `js/w7-visuel-kort.test.js` (sammenlign 40 px + 2 px kant = samme 44 px trykflade), `js/eksternt-kort.test.js` og `js/rigt-kort.test.js` (ingen "ikke oplyst"-chip). `node --check` OK, `npm test` 1049/1049 grønt (llms.txt gendannet).

Hvad ligner IKKE billederne (ærligt)
- Billede 3 har 3 kolonner ved 1440 og galleri med "1/14", "+10"-miniature, forhandlerlogo (Yamaha), "Se finansieringsforslag", "Ring op/Send besked", "Typisk svartid", stjerner, "Autoriseret": udeladt (opdigtet/forbudt eller ingen data/ingen billedgalleri fra kilder).
- Tablet er vores egen to-kolonne-komposition (billedet har ingen tablet); faktatabellen er én kolonne i venstre spalte (385 px er for smalt til 2), to kolonner ses fra 1024 px.
- Kortets stakkede fod i 2-kolonne-gitteret er to linjer; billedet har kun desktop-kort med sted og type på én linje. Billedets kg-chip og foto-tæller findes ikke (ingen data).
- Sælgerboksen er en ærlig "Privat sælger/Forhandler + kilde"-boks uden stjerner, ring op og besked.

DELT-ØNSKE: `listingRowHTML` og `swipeCardHTML` (js/search.js, ikke min fil) bør kalde `kortFodHTML(l, f)` i stedet for egen fod-markup, så liste- og swipekort også får aria-label/tooltip; de er brede, så de klipper ikke i dag. `.similar-strip .card-compare` (p-annonce.css) og `.so-results .card-compare` (p-soegning.css) er nu overflødige (40 px er standard).

