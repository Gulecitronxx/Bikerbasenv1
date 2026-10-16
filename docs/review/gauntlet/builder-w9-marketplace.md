# Builder w9-marketplace (billede 2 søgeresultater + billede 3 annoncedetalje)

Branch `gauntlet/w9-marketplace` fra 21d132b. Skrevet FØR koden; beviser og status står nederst.
Test: lokal mock (scripts/smoke-fixtures.js via scripts/smoke-browser.js' server + route), ingen produktion. Fiktive tal fra billederne er ikke brugt.

## Acceptkriterier - billede 2 (søgeresultater), `soegning.html`
Visuelle
- S-V1 Hero med foto, h1, "N motorcykler til salg" (N beregnet) og overlappende søgekort (mærke/model, type, maks. pris, kørekort Alle/A1/A2/A, "Søg motorcykler"). Primær CTA = brandfarve, ikke grøn.
- S-V2 Aktive filter-chips under hero: ét chip pr. aktivt filter med x, "Ryd alle filtre". Prischippen læser "Maks. X kr." / "Fra X kr." / "X - Y kr." (aldrig "0 kr. - X").
- S-V3 Sidebar "Filtre" + "Ryd alle", foldbare grupper i billedets rækkefølge (Mærke og model, Type m. antal, Pris m. skyder + hurtigknapper, Årgang, Kilometer, Kørekort m. antal, Region, Sælgertype).
- S-V4 Resultathoved: "N motorcykler fundet", Sortér-select, Gitter/Liste-skift. Hjælpetekster under overskriften samles i ÉN rolig informationslinje (ikke tre spredte linjer), med samme indhold (kildefordeling, bekræftelsesdato, "uden foto").
- S-V5 Kort: foto (eller ærlig tom-foto-flade), pris, År | km | type, spec-chips KUN med oplyste tal (kørekortmærkat, ccm, hk), sted + sælgertype/kilde. Ingen "null/undefined/NaN" ved manglende pris/km/hk/foto.
- S-V6 Mobil 320/390: ét kort pr. række, filtre i bundark, ingen vandret overflow.
Funktionelle
- S-F1 Alle filtre virker og påvirker antallet: fritekst, type, mærke/model, pris (skyder, hurtigknapper, tal), kørekort A1/A2/A, region, sælgertype, kun billeder, sortering, gitter/liste.
- S-F2 Fjern chip fjerner kun det filter; "Ryd alle filtre" nulstiller alt; URL afspejler filtrene.
- S-F3 Tomme resultater: tydelig besked + vej ud (ryd filtre), ingen tomt gitter uden forklaring.
- S-F4 Navigation søgning -> annonce -> tilbage bevarer filtre, sortering, visning og scrollposition.
- S-F5 Favorit-hjerte virker på kortet og tilstanden overlever en genindlæsning.
- S-F6 Eksterne kort peger på annoncesiden hos os (ikke direkte ud), med kilde synlig.

## Acceptkriterier - billede 3 (annoncedetalje), `annonce.html` + statiske `annonce-*.html`
Visuelle
- A-V1 Brødkrumme + Del/Sammenlign/Favorit-række. Tre kolonner >=1180 px: venstre galleri + faktatabel, midt chips/titel/pris/nøgletal/beskrivelse/"Kan du køre denne?", højre sælger/kilde + "Handl trygt". "Det bør du tjekke" i bunden over midt+højre. Ingen store tomme huller mellem sektionerne (målt: tomt hul mellem kolonnebunde < 48 px ved 1440).
- A-V2 Galleri: hovedfoto, thumbnails + "+N" når egen annonce har flere fotos, tæller 1/N, pile; ekstern annonce viser kun kildens ét foto + ærlig tekst; tom-foto-tilstand uden gæt.
- A-V3 Faktatabel i to kolonner med ikoner; manglende felter vises som "Ikke oplyst" eller udelades - aldrig tomt/NaN.
- A-V4 "Kan du køre denne?": statuspille der tydeligt skelner MULIG A1/A2 (ikke udelukket, IKKE bekræftet), KRÆVER A, IKKE AFGJORT (48-49 hk uden kW), KAN IKKE AFGØRES; sætning om hvad der ikke står i annoncen (kW/kg, afledningsregel). Aldrig "bekræftet" - ingen annonce kan bekræfte A1/A2.
- A-V5 "Det bør du tjekke" med 5 punkter + link til guide. "Lignende motorcykler" som kortstribe med "Se alle lignende".
- A-V6 Ekstern: kilde-badge/navn, hovedknap "Gå til annoncen hos <kilde>" på MAX to linjer og uden klippet tekst; ærlig tekst om at Bikerbasen ikke er sælger/handelssted; ingen opdigtet sælgeradresse, anmeldelser, svartid.
- A-V7 Mobil 320/390: enkelt kolonne i rækkefølgen galleri, titel/pris, sælger, beskrivelse, fakta, kørekort, tjek, lignende; fast handlingsbjælke; ingen vandret overflow.
Funktionelle
- A-F1 Alle tre typer (egen m. fotos, egen uden foto/pris, ekstern m./u. foto, 48 hk, manglende km/hk/pris) renderer uden null/undefined/NaN og uden konsolfejl.
- A-F2 Galleripile/thumbnails skifter foto; favorit-knap toggler; "Se hos kilden" åbner kildens URL i ny fane med rel=noopener.
- A-F3 Tilbage til søgningen bevarer filter og scroll (jf. S-F4).

## Fælles
- X-1 `node --check` på js/crawler/scripts, `npm test` grønt, nye tests `js/w9-marketplace*.test.js`.
- X-2 scrollWidth == clientWidth ved 320/390/768/1024/1440, lys + mørk.
- X-3 Lys tilstand ligner billederne mest; mørk virker. AA-kontrast på nye elementer.

## Status / bevis
(udfyldes løbende nedenfor)
