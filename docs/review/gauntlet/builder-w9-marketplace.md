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

Skærmbilleder (udenfor repo): `%TEMP%\w9-marketplace` - `before-*.png` / `after-*.png` (søgning 1440/390/320 mørk, annonce egen/ekstern/48 hk).
Harness: `h.js`, `f-srp.js`, `f-ann.js` samme mappe (Playwright, lokal mock, ingen produktion).

Bygget (kun w9-ændringer; søgesiden var allerede tæt på billedet fra tidligere runder)
- A-V1 annonce: kørekortkort flyttet ind i midterkolonnen, "Det bør du tjekke" ind i venstre kolonne under faktatabellen: kolonnebundene ligger nu ca. 165 px fra hinanden (før ca. 450 px tomt hul under faktatabellen). Tjek-kortets foto er et pseudo-element, så teksten aldrig overlapper.
- A-V4: statuspille MULIG / KRÆVER / IKKE AFGJORT / KAN IKKE AFGØRES; 48-49 hk viser "kW?" + "Tjek kW i registreringsattesten"; "Ikke bekræftet" på MULIG. Aldrig "bekræftet".
- A-V6: "Gå til annoncen hos X" på højst to linjer, også i mobilbjælken (var tre, klippet).
- Bug (fra Orchestrator): galleriets `toggle('active', undefined)` flippede alle miniaturer; nu `!!(...)`.
- S-V2: prischip "Maks. 60.000 kr." / "Fra X" i stedet for "0 kr. - X".

Måling (Playwright, 5 bredder 320-1440 x lys/mørk x 10 annoncetyper)
- Ingen vandret overflow, ingen null/undefined/NaN, 1 h1, kørekort + tjek + fakta altid til stede, højst én aktiv miniature, ingen konsolfejl (bortset fra mock-401).
- Søgning: type, pris, kørekort, fritekst, sortering, gitter/liste, ryd alle, tom-tilstand, favorit (overlever reload), søgning->annonce->tilbage (filter og scroll 1400->1400) bestået.
- node --check OK. `npm test`: 6 crawler-tests fejler fordi `@supabase/supabase-js` ikke kan findes via junction, og 1 guides-datotest (seo-schema) fejler; begge fejler identisk uden mine ændringer.

Hvad ligner IKKE billederne endnu
- Foto-tæller (1/12), galleri med flere thumbnails og "+10" på eksterne: forbudt (CLAUDE.md: ét thumbnail). Egne annoncer har dem.
- Sælgerboks med stjerner/anmeldelser/svartid/adresse/ring op/besked, finansieringsforslag, "Autoriseret forhandler": opdigtet eller ikke bygget.
- Søgesiden: tre små hjælpelinjer (kildefordeling, bekræftelsesdato, blandet udbud) er stadig tre linjer under overskriften; de bærer ærlige data og er pinned af tests, så de er kun tonet, ikke slået sammen.
- Mobil 320: w7-visuels 2-kolonne-gitter afkorter sted/kildelinje på kortene ("R...") - hører under kort/w7.
- Kort viser ikke grønne A2-chips (brand: mulig A2 = orange, kræver A = sort).

DELT-ØNSKE: ingen (components.js urørt). Nye tests: js/w9-marketplace-galleri.test.js, js/w9-marketplace-kk.test.js.
Commits: se `git log gauntlet/w9-marketplace`; master (w7-visuel) er merget ind uden konflikter.

## Runde 2 (efter Critic: ACCEPTER, 5 P2)
- A-V1 kolonner: kort-placeringen søges (27 kombinationer af "Kan du køre", "Det bør du tjekke", "Handl trygt" i den rigtige DOM), og sidste kort i hver kortere kolonne strækkes: de tre kolonners bundkanter flugter (forskel 0 px, målt på egen 3/1/0 fotos og ekstern 48 hk/uden foto ved 1440). Pris: det sidste kort kan have luft indeni.
- Galleri: fokuserbar gruppe, ArrowLeft/Right, Home/End, aria-live-tæller; test i js/w9-marketplace-r2.test.js; Playwright: 1/3 -> 3/3 -> 1/3 -> 2/3.
- Brødkrumme "Motorcykler": genbruger eksisterende nøgle `bb_srp_position` (ingen ny nøgle, privatlivspolitikken uændret), kun hvis gemt id = denne annonce. Målt: sport + sort=price-desc + scroll 500 bevaret; direkte besøg giver `soegning.html`.
- Søgning ved backend 500/tomt: ingen levende annoncer + fejlet/ok-tomt => ærlig fejltilstand ("Vi kunne ikke hente annoncerne lige nu", "Prøv igen"), "Lageret kunne ikke hentes" i stedet for "51 motorcykler fundet", intet tal i hero, ingen snapshot-kort. Rest: facettallene i sidebaren viser stadig snapshot-tal i den tilstand.
- Info-bånd: kildefordeling, lagerets alder og sorteringsregel i ÉT bånd (id'er uændrede; skjules, hvis alt er skjult).
- CLS efter merge med master: 0,0000 på 9 søgevarianter (390 lys/mørk, 1440, med filter-URL); smoke --cls 0.05 --strikt: 20 målinger, 0 fejl/advarsler.
- P3: sammenlign- og info-knapper 40x40; 48-49 hk-tekst "kan være afrundet" (DELT: js/components.js koerekortMaerkat, én streng); dobbelt "Gå til annoncen": ikke reproducerbar - 0 af alle scrollpositioner (60 px-trin, 390 px) har to synlige CTA'er; formodet fuldside-screenshot-artefakt.
- npm test: 798 tests, 6 røde = crawler-tests (`@supabase/supabase-js` mangler i junction), uændret. Ny test: js/w9-marketplace-r2.test.js.
- Ikke gjort: større omlægning af søgesidens komposition ud over info-båndet (sidebar, hero, chips, resultathoved lå allerede i billedets rækkefølge).
