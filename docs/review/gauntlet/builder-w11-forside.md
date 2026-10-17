# Builder w11-forside — forsiden modigere (billede 1)

Branch `gauntlet/w11-forside` fra 226dbe7. Ingen nye licenserede assets. Måling: Playwright mod lokal mock (smoke-browser / visuel-regression), screenshots udenfor repoet i `C:\Users\pasca\Desktop\rod\w11-shots` (foer = før, efter = efter).

## Acceptkriterier (skrevet FØR bygning)

| Id | Billedsektion | Kriterium (bevis: js/w11-forside.test.js + smoke) |
|---|---|---|
| H1 | Hero | Ved 1440: heroens højde >= 560 px, h1-skrift >= 64 px, h1 kontrast mod baggrund >= 4,5:1 (eksisterende w7-test bevares). Ved 390: h1 >= 34 px, ingen overflow. LCP-billedet har fetchpriority=high og er preloadet. |
| H2 | Tillidsrække | Præcis 4 punkter, hvert med ikon + fed linje + forklaring; ikonet står i en tonet cirkel (>= 40 px). Ingen opdigtet påstand (ingen "svartid", "tusindvis", "fællesskab"). |
| H3 | Søgekort | Overlapper heroens underkant >= 48 px ved 1440; indeholder mærke/model, type, maks. pris, kørekort-segment (Alle/A1/A2/A) og primær CTA; CTA >= 56 px høj, brandfarve (ikke grøn); alle felter >= 44 px høje; tap-mål >= 40 px ved 320/390/768. |
| H4 | Sådan virker | 4 trin som kort med ikon i tonet cirkel (>= 48 px) og nummerbadge; ikon og badge overlapper ikke; pile mellem trin >= 1000 px; ved < 1000 px lodret/2x2 uden overflow. |
| H5 | Udvalgte annoncer | Titel med accentstreg og "Se alle"-link (>= 32 px højt); kortrække uændret (kort ejes af anden Builder); sælg-panel til højre >= 1100 px. |
| H6 | Typefliser | Fliser >= 112 px høje ved 1440, foto + antal; ingen flise uden foto. |
| H7 | Kørekort/mærker/region | Kørekortkolonnen viser pr. klasse A1/A2/A kort regel: A1 fra 18 år og op til 11 kW (15 hk); A2 fra 20 år og op til 35 kW (47 hk); A fra 24 år (22 efter 2 år på A2). Kilde: koerekort-*.html (Færdselsstyrelsen/borger.dk, verificeret i tidligere runder). Mærkeliste med monogram, regionstal fra lager. |
| H8 | Rytme | Sektionernes samlede lodrette padding >= 56 px ved 1440 (>= 32 px ved 390); sektionsoverskrifter (h2 i .sek-hoved, .saadan, .hvorfor) har accentstreg (brandfarve). |
| H9 | Tom/fejlet lager | Med tomt svar og 500: CLS < 0,05 ved 320/390/768/1440 lys+mørk (w9-testen bevares); ingen "0 annoncer". .data-afbrud er urørt. |
| Generelt | alle | scrollWidth == clientWidth ved 320/390/768/1024/1440 lys+mørk; CLS < 0,05; kontrast >= 4,5:1 på nye tekster; tap-mål >= 40 px; smoke-browser --strikt 0 fejl; node --check + npm test grønt. |

## Resultat (før/efter: `C:\Users\pasca\Desktop\rod\w11-shots\foer` / `efter`, index 390+1440 lys+mørk, diff.html i efter)
Alt opfyldt og målt i js/w11-forside.test.js (9 tests: 3 statiske + 6 browser ved 1440 lys/mørk, 1024, 768, 390, 320): H1-H8 grønne. H9: js/w9-frontend-tom.test.js uændret og grøn. smoke-browser index 320/390/768/1024/1440 x lys+mørk `--cls 0.05 --strikt`: 0 fejl, 0 advarsler (overflow 0, CLS < 0,05). npm test 1049/1049, node --check rent.

## Bygget (kun index.html indholdsdel + NY css/p-forside.css; styles.css, home.js, header/footer urørt)
Hero 600 px / h1 60-76 px / accentstreg / dybere scrim / 3 genvejs-chips (eksisterende søgelinks); søgekort 22 px radius, accentkant, 62 px CTA; tillidsrække med ikon i tonet cirkel; Sådan virker som 4 kort m. ikon-cirkel, nummerbadge, pile (>= 1000 px højre, < 600 px nedad); tonet bånd; typefliser 124-136 px fast højde (ingen CLS); kørekortkolonne som rækker med regel (A1 fra 18 år/11 kW (15 hk), A2 fra 20 år/35 kW (47 hk), A fra 24 år, 22 efter 2 år på A2 — samme tal som koerekort-*.html); regionstal 3 pr. række; accentstreg på alle h2; link "Læs om motorcykeltyper" ved typefliser.

## Ligner IKKE billede 1 (og hvorfor)
- Intet rytterfoto/solnedgang og eyebrow uden "Danmarks motorcykelmarked": ingen licenseret rytterfoto, påstand.
- Ingen "12.842 motorcykler i Danmark" under CTA (viser lagerets eget tal).
- Mærkeliste med monogram, ikke logoer (ikke licenseret); tal pr. mærke er lagerets, ikke billedets.
- Annoncekortene (.card) er en andens ejerskab; mock-fotoet er en flad farve. Kilde er domæne i stedet for "Forhandler/Privat", og hk/kg-chips kun hvor kilden oplyser dem.
- Sælg-panel: cruiser-illustration, ikke rytter; tekst "Gratis at oprette / Du styrer selv annoncen" (ingen "tusindvis af købere").
- "Bliv en del af fællesskabet" er erstattet af "Køb og sælg trygt" (sikkerhed.html); ingen fællesskab findes. Footer er mørk (billedet har ingen) — footer ikke mit område.
- Nav har ikke "Viden" (header er delt lag).
- Søgekortets A-segment og CTA er brandfarve (kobber), billedets grønne er afvist af DNA.

## DELT-ØNSKER
- Tilføj `css/p-forside.css` til forsidens `<link>` i evt. generatorer/inline-critical (index.html linker den nu efter styles.css). Ingen ændring i styles.css; w7/w9-regler (.hero, .saadan-* m.fl.) er overstyret med `body.home`-selektorer — kan konsolideres ved integration.
- Nye testfiler: `js/w11-forside.test.js` (tilføj til `npm test`; browsertests skippes uden Chromium).
