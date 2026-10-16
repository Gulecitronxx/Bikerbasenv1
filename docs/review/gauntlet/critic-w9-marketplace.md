# Critic w9-marketplace (blind)

Dom: ACCEPTER, ingen P1. Fem P2 bør rettes.

Målt i en kopi i %TEMP%\critic-w9b (node_modules via junction, mock fra scripts/smoke-fixtures.js, ingen produktion).

## Mål
- Smoke: `soegning` + `annonce`, 320/390/768/1024/1440 x lys+mørk, `--cls 0.05`: 20 målinger, 0 fejl, 0 advarsler.
- Egne målinger: 0 vandret overflow, 1 h1, ingen null/undefined/NaN, ingen konsolfejl, på 9 søgevarianter og 11 annoncetyper (lys, mørk, 390, 1440). Typerne er egen med 3/1/0 fotos, egen uden pris, ekstern med/uden foto, 48 hk, 49 hk, uden pris/km/hk og kildens pladsholderfoto.
- `node --check` på js/scripts/crawler: OK.
- `npm test`: 906 tests, 905 grønne. Den ene fejl er seo-schema "Article: datoerne" (known). Den er grøn efter merge med master.
- Merge: `git merge --no-commit gauntlet/master` ind i w9 (i en klon) giver 0 konflikter. Master er nu 22d05a8, forbi 4378bba.

## 1. Visuelt match (billede 2 og 3)
Søgning: strukturen ligger tæt på billedet. Orange hero med overlappende søgekort, chips med "Ryd alle filtre", sidebar med "Filtre" og foldbare grupper, "N motorcykler fundet", sortér, gitter/liste og 4-kolonne-grid ved 1440. Brandfarven er orange/kobber, ikke grøn. Billedets foto-tæller 1/12, "Autoriseret forhandler" og stjerner er med rette udeladt.
- Tre infolinjer under overskriften (kilde, bekræftelsesdato, blandet udbud) er stadig spredt. Billedet har ingen. Det er en designafvigelse, ikke en nødvendig tilpasning.
- Vi er ikke modige. Resultatet er et rent facelift af det gamle layout, ikke en gentænkning.

Annonce: tre kolonner ved 1440 (galleri + fakta + "Det bør du tjekke" / midte / sælger + "Handl trygt"), "Kan du køre denne?" i midten og lignende som kortstribe. Rækkefølgen er rigtig og det ligner billedet.
- Egen annonce (ZX-6R): midtkolonnen slutter ca. 340 px før venstrekolonnen. A-V1 (tomt hul < 48 px) er ikke opfyldt.
- Ekstern 48 hk: hul ca. 160 px, heller ikke opfyldt.
- Sælgerboks: ærlig ("Privat sælger", "Log ind for at se sælgeren", kildeboks). Stjerner, svartid og adresse er korrekt udeladt.
- Ekstern: ét foto + "Foto: <kilde> — flere billeder i deres annonce", ingen thumbnails.
- Mobil: korrekt rækkefølge. Sælgerboksens CTA og endnu en identisk CTA står lige efter hinanden på eksterne (dobbelt, kosmetisk).

## 2. Kørekort
Konsistent kort, filter og side via data.js `a2Status`:
- Egen annonce med 130 hk viser "KRÆVER A".
- 48 og 49 hk uden kW viser "IKKE AFGJORT — kW?" / "Kørekort ikke afgjort — tjek kW".
- 44 hk viser "Mulig A2".
- Ukendt hk viser "hk ikke oplyst".
- Ordet "bekræftet" optræder ikke, og der er ingen falsk bekræftelse.
- Filter: A2 giver 30, A1 giver 4, A giver 97 (A dækker alt).

Nuance: ved 48 hk står der "kilderne runder det op til 48". Det er en antagelse om kilderne og bør formuleres som "kan være afrundet".

## 3. Funktion
Bestået:
- fritekst (inkl. komma i modelnavn), type, kørekort, pris, årgang, km, region, kun billeder, forhandler
- sortering (URL `sort=price-asc`), liste/gitter, fjern chip, "Ryd alle filtre"
- tom tilstand ("Ingen annoncer matcher", "Nulstil filtre")
- galleri med pil og thumbnail (aktiv miniature = 1)
- kilde-link: `target=_blank`, `rel=noopener noreferrer nofollow`
- browserens tilbage-knap bevarer filter og scroll (684 → 684)
- ødelagt, tom og ukendt `?id=` og `<img>`-injektion: pæn "Annoncen findes ikke", 1 h1, ingen fejl
- backend 500 på annonce: ærlig fejltekst

Fejl:
- P2: Galleriet har ingen tastaturnavigation. ArrowLeft/Right ændrer ikke 1/3, og `annonce.js` har ingen keydown.
- P2: Brødkrumme-"Motorcykler" linker til bart `soegning.html` og mister filter og scroll. Kun browser-tilbage bevarer dem. A-F3 er kun halvt opfyldt.
- P2: Søgesiden ved backend 500 eller tomt svar viser det statiske snapshot (24 kort, "51 motorcykler fundet") uden fejlbanner. Annoncesiden viser et. Det er stille og vildledende.

## 4. Regression
- P2: CLS er 0,069 (> 0,05) ved 390 lys på `soegning.html?q=honda&type=...&koerekort=A2&maxPrice=80000`. Smoke-standardsiden er under grænsen.
- Tap-mål: sammenlign-knap 34 px og info-knapper 24 px under 40 px. Primære kontroller (Filtre, Søg, galleri 40 px) er OK. Sammenlign-knappen på kort og annonce er 34 px (P3).
- Kontrast: ikke målt numerisk. Visuelt OK i mørk tilstand.

## Screenshots
`%TEMP%\critic-w9b\shots\` (C:\Users\pasca\AppData\Local\Temp\critic-w9b\shots\):
- Søgning: `s-{1440,390}-{l,d}-default`, `s-1440-l-filter`, `s-1440-d-filter`, `s-390-l-filter`, `s-1440-l-empty`, `s-390-d-empty`
- Annonce: `a-{own3,own1,ownNoPrice,extFoto,extNoFoto,ext48,ext49,extNoPrice,extNoKm,extNoHk,extPlace}-{1440,390}-l`, `a-{own3,extNoFoto,ext48}-{1440,390}-d`

Rapporter og scripts: `critic-w9b\out\smoke.*` og `critic-w9b\h\*.js`.
