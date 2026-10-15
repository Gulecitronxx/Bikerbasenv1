# Builder facet (gauntlet/facet) — billede 7 (kørekort A2) + 8 (type Sport)

## Bygget pr. billedelement
- Hero med foto (img/hero-*), brødkrumme, kicker (KØREKORT A2 / LANDSDEL / MÆRKE), h1, intro (+ fold), info-panel til højre på type/region/model (antal, mest udbudte mærker / flest annoncer i byer / årgange, prisniveau fra-til: alt beregnet).
- Søgekort (Mærke/model, Type forudvalgt, Maks. pris, Årgang; modelsider: pris/årgang/km) som GET-form til soegning.html med eksisterende parametre (type, q, maxPrice, yearMin, kmMax, koerekort, hkMin, regions, brands, model). Knap "Søg … →" + "N … indekseret".
- Tillidsrække (4 ikon+tekst, sande: kilde på kort, filter på oplyste tal, favoritter, dato for seneste bekræftelse). Kørekortsider: faktarække 4–5 ikoner + guide-flise (som billede 7) i stedet.
- "Udvalgte …" (4 delte kort) + CTA-panel (guide-foerste-motorcykel / guide-a2-koerekort / guide-brugt-motorcykel); resten af de 24 kort + filter-/sorteringsfold står i "N annoncer" under.
- Kørekort/region: "Populære typer …" fliser med foto og beregnet antal. Alle: "Populære … modeller" (kun modeller med >=2 annoncer, link til modelside hvis den findes). Kørekort: 3 info-bokse + "næste skridt" + guide-række. Type/region/model: "Det skal du vide" 4 bokse (type/region redaktionelle; model beregnet). Relaterede søgninger (kun med antal>0) og "Se … i din region" (kun regioner med annoncer).
- NY side koerekort-a.html: kun annoncer med OPLYST effekt over A2-grænsen (kraeverA); ukendt effekt tælles ikke. Søg-knap bruger hkMin=48 så udsnittet er det samme.
- Alle tidligere interne links bevaret (andre typer/kørekort/landsdele/modeller, mærke-chips, noscript-liste, søgeagent).

## Kørekortfakta — kilde (verificeret 15.10.2026)
Færdselsstyrelsen: https://www.fstyr.dk/privat/koerekort/udvidelse-af-koerekort/koerekort-til-motorcykel og .../koerekortkategorier. A1: 125 cm³, 11 kW, 0,1 kW/kg, 18 år. A2: 35 kW, 0,2 kW/kg, ikke afledt af >2x effekt, 20 år (tidligere efter 2 års A1 + praktisk prøve). A: ingen grænse, 24 år, 22 år efter 2 års A2 + prøve. NB: billede 7's "fra 18 år" for A2 er FORKERT og er ikke kopieret. 35 kW = ca. 47 hk (billedets "48 hk" ikke brugt; koden bruger 47).

## Matcher IKKE billedet
- "Udforsk typer inden for Sport" (undertyper) udeladt: ingen undertype-felt i data. "Brændstoftype" udeladt (ikke i data). Guides-række med fotos udeladt (kun tekstlinks til reserverede guide-adresser). "Verificerede annoncer/Markedsindsigt/Fællesskab" erstattet af sande punkter. Hero-foto er sitets eget (ikke type-specifikt). Billedets 5 kort + panel = 4 kort + panel (containerbredde).
- Lokalt hydrerer siden mod dev-seed (Supabase CORS), så klienttal (fx 29) afviger fra de byggede (21); i drift er kilden den samme som buildet (samme dedupe).

## SEO før/efter (scripts-sammenligning af 21 sider, før = uændret generator, samme data)
title, h1 (antal+tekst), canonical, robots, description, JSON-LD: 0 afvigelser. Ingen mistede interne links (+3..+22 nye pr. side). Tærskel/noindex uændret; koerekort-a kvalificerer (383).

## Tal
Overflow: 108 sidevisninger (9 sider x 320/360/390/768/1024/1440 x lys+mørk) = 0 (fandt og rettede 320 px-overflow fra lange chips). Konsol: ingen fejl udover lokal CSP-hash (inline-scriptets hash opdateres af build.js/csp-hashes). `npm test` 364/364 grøn. Iterationer: 3 (desktop/mobil skud mod billede 7/8 -> mobil-søgekort 2 kolonner + kortscroller, listemarkører, faktarække; -> 320-overflow, tomme/små facetter mistede links).

## DELT-ØNSKER
1. Lys/mørk-hero-foto pr. sidefamilie (nu img/hero-1600.webp for alle). 2. Header-links "Kørekort/Mærker" (V-016). 3. Tilføj scripts/facet-sider.test.js til npm test. 4. Kør build.js: csp-hashes (inline-script ændret), sitemap (koerekort-a.html tilføjes af generatoren), meta/cookie/GA indsættes (committede facet-filer er RÅ generatoroutput uden ?v=, OG-meta og cookie-dialog indtil build.js kører).

## Filer / commits
scripts/build-facet-pages.js, scripts/facet-indhold.js (ny), css/p-facet.css (ny), 22 genererede *.html (type/koerekort/region/model + ny koerekort-a.html). Ny test: scripts/facet-sider.test.js (6 tests). index.html/soegning.html/sitemap.xml/maerke-* IKKE committet (generatoren rører dem; nulstillet).
## Kendte rester
Kortscroller på <520 px kan skjule 4. kort bag scroll; mørk-hero på lys side er bevidst; modelsider kun for Honda (tærskel 10).

## Runde 2 (efter Critic, 3,6/5) — rettelser og nye selv-scores
- F-2/F-4 (tal): ALLE lagertal står nu i `data-fa-n`-elementer og regnes om af hydreringen på samme annoncer som overskriften (Se alle N, søgekortets og panelets antal, typefliser, modelrække, relaterede, region-chips, pris/årgang/km-fold). Målt: ét tal pr. side på 6 sider. F-3 (49 mod 56) var ikke en race, men det BYGGEDE tal set før hydreringen er færdig (reproduceret: `html[data-fa-hydreret]` sættes nu når alt er opdateret). Flertal rettet ("1 A2-motorcykel"). Mobil-kortscroller har kantfade + "Stryg for at se flere". Chip-hover er ikke længere tinted (ligner ikke valgt filter).
- Tættere på billedet: type-hero viser typens EGET studiefoto (img/type/<type>.webp; modelsider den dominerende type) som spot i eget kolonnefelt; CTA-panelet har typens motorcykel; guide-række med 3 fotokort (hero-960, naked, touring); modelminiaturer større og foretrækker foto uden mcsyd-skilt; 5 kort + panel fra 1560 px (container 1400 px, ellers 4 kort, 5. skjult, da 1240 px er for smalt til 5).
- Ikke muligt med egne img-filer: rytterfoto pr. type, frilagte modelbilleder, "Nyeste"-række. Landsdel/kørekort beholder landskabsfoto.
- Kendt: før JS kører, er det delte header 333 px bredt ved 320 px (på ALLE sider, også soegning/maerke); det rettes af renderHeader() efter ~200 ms. DELT-ØNSKE: header skal passe 320 px i den statiske markup.
- Målt: 132 visninger (11 sider x 6 bredder x lys/mørk) 0 vedvarende overflow; AA-kontrast 16 sidevisninger (4 sider x lys/mørk x 1440/390): 0 tekster under AA (hero/CTA/fliser på foto målt separat visuelt, hvid på mørk gradient); SEO-sammenligning 21 sider: 0 afvigelser, 0 mistede links; npm test 364/364, facet-sider.test.js 9/9.
- Selv-scores (lys/mørk, vs. Critic): hero 4,0 (3,5), søgekort 4,5, tillids-/faktarække 4,0, udvalgte+CTA 3,5 (3), typefliser 4,0, info-bokse 4,0, modeller 3,5 (3), relaterede/guides 3,5 (3), mobil 4,0 (3,5). Samlet ca. 3,9/5.
