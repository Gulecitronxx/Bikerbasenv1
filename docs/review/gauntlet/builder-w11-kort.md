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
(udfyldes nedenfor)
