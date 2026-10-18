# V3 Agent 4 — Indhold, mærker og SEO (branch gauntlet/v3-indhold)

Screenshots: `docs/review/gauntlet/v3/indhold/foer/` og `.../efter/` (1440 og 390, lys og mørk; type-sport, koerekort-a2, maerke-yamaha, maerker).

## Opgave 1 — mærkeaudit ("ALLE motorcykelmærker med")

Målt 18.10.2026 mod produktions-Supabase (kun læsning): 735 rå rækker i `eksterne_annoncer` (status aktiv) -> 718 efter samme normalisering og afdublettering som siden bruger, plus 2 egne annoncer (Harley-Davidson FLHX, BMW R45) = 720 annoncer.

### (a) Lager vs. mærkesider vs. oversigt vs. filter vs. logo-manifest

| Mærke i lageret | Annoncer | Mærkeside | Indekseres | I A–Z | I filter | I manifest | Logo godkendt |
|---|---|---|---|---|---|---|---|
| Honda 307, Harley-Davidson 83, Yamaha 68, Suzuki 63, BMW 47, Kawasaki 43, Triumph 35, KTM 14, Royal Enfield 14, BSA 8, Aprilia 7, Ducati 5 | >= 5 | ja | ja | ja | ja | ja | de fleste |
| Moto Guzzi 3, Husqvarna 2, Indian 2, MV Agusta 2, Lauge Jensen 2, Victory 2, Bach, Benelli, Buell, Cagiva, CFMoto, Fantic, FB Mondial, Hyosung, Kymco, Rewaco, SYM (1 hver) | 1–4 | ja | nej (noindex, follow) | ja | ja | ja | nogle |
| "Ukendt" (DKW 250, "moto cross købes") | 2 | nej (bevidst) | – | nej | ja, som "Ukendt" | – | – |

Resultater:
- 29 mærkesider = alle 29 mærker i lageret med et navn. Ingen mærke i lageret mangler side, oversigtsrække eller filterrække.
- Tallene er ens. Oversigten og siden regnes af samme byg; filteret af samme normalisering i klienten (`harmoniserStavning`, `markerTvaerkildeDubletter`). Låst af ny test: hvert mærkes A–Z-tal = sidens eget tal.
- Navngivning er allerede samlet i `MAERKE_AKRONYM` (Bsa -> BSA, Royal-enfield -> Royal Enfield, Lauge -> Lauge Jensen, Fb Mondial -> FB Mondial, Sym -> SYM, CFMOTO -> CFMoto). Slug er ens overalt (`maerke-fb-mondial`, `maerke-cfmoto`).
- Logo-manifestet har 64 mærker (godkendelsesflag urørt). 20 har godkendt logofil; resten falder tilbage til ordmærke/monogram.
- Fund i lokal browser: på localhost lægges 51 demoannoncer (js/data.js `SHOW_DEMO_DATA`) oven i lageret (771 mod 718), så filtertal lokalt afviger (Honda 313 mod 307, Vespa/MZ/Nimbus/Peugeot/Piaggio dukker op). På produktion er demo slået fra; ikke en fejl, men vær opmærksom ved sammenligning.

### (b) Hvilke mærker mangler

Alle mærker, der står i lageret, findes. De forventede mærker (Honda, Yamaha, Suzuki, Kawasaki, BMW, Harley-Davidson, Triumph, Ducati, KTM, Husqvarna, Aprilia, Moto Guzzi, MV Agusta, Royal Enfield, Indian, Benelli, CFMoto, Kymco, SYM, Fantic, Victory, Buell, BSA, Cagiva osv.) er i lageret og har side. Følgende forventede mærker har 0 annoncer i dag: Vespa, Piaggio, Zero, Zontes, Voge, Beta, GasGas, Sherco, Can-Am, Norton, Bimota, Gilera, Peugeot, Keeway m.fl. (alle 35 stod allerede i den redaktionelle liste `BRANDS_BY_MODEL`).

Tilføjet kun som tekst (ægte producenter, ingen tal): Derbi, Husaberg, Kreidler, Laverda, Maico, Montesa, Moto Morini, Ossa, Puch, Simson, Sur-Ron, Talaria, Zündapp (`YDERLIGERE_KENDTE_MAERKER` i scripts/build-brand-pages.js). De rører ikke `js/data.js` (delt med opret-annonce).

### (c) Beslutning om 0-annoncemærker

Ingen side og intet link for mærker uden annoncer. Begrundelse: en side uden annoncer er tynd, uden egen søgeværdi og en blindgyde (D-010: 44 tomme interne links); en noindex-side med tom-tilstand ville bruge crawlbudget til intet. I stedet en synlig sektion "Flere mærker (48)" nederst på maerker.html: ærlig forklaring, mærkenavne som ikke-klikbare piller, link til den fulde søgning. Når et mærke får annoncer, forsvinder det fra sektionen og får side ved næste byg (sorteres fra via slug). Mærker med 1–4 annoncer beholder siden (noindex, follow), er med i A–Z og filteret, men ikke i sitemap.

Rettet undervejs:
- `maerkerUdenLager` sammenligner nu på logo-manifestets slug (navn + aliaser): "Zero Motorcycles" (redaktionel liste) og "Zero" (lager) og "CFMOTO"/"CFMoto" kan ikke længere stå som to mærker. Visningsnavn følger manifestet.
- A–Z-rækken på maerker.html var brudt (navn og antal klistret sammen, kort understregning, "Honda307"): `main ul:not([class]) > li > a:only-child{display:inline-block}` i styles.css slog `.mk-az-gruppe a`. Rettet med ID-specificitet i p-maerke.css. Ny rolig række: navn venstre, tal højre.
- Oversigten oplyser nu ærligt, at 2 annoncer ikke oplyser mærke (720 = 718 på mærker + 2 uden), og introen lover ikke længere "lige nu".
- "Udforsk X efter type" på mærkesider bruger typens egen illustration (som facetsiderne) i stedet for en tilfældig annonces foto, der bar forhandlerens skilt.

## Opgave 2 — Critic-fund

- P2-1 CTA-panel: fotoet ligger nu i knaprækken (`.fa-cta-fod`, max 60 px højt) i stedet for en ekstra række under knappen. Kortrækken ved 1440 gik fra 348 til 264 px (type-sport og koerekort-a2); de ca. 100 px tomrum i kortene er væk. Mærkesiderne (maerke-yamaha) bruger `.mk-cta`, hvor fotoet allerede er skjult på desktop; rækken er uændret og kortene fylder den.
- P2-3 "Se 0 …"-fliser: klienttallet (hydrering) skjuler nu også `.fa-udforsk li` ved 0 (før kun typefliser, chips m.fl.); CSS `li[hidden]` sikrer, at den skjules.
- P3 guide-dateModified: løftet til 2026-10-18 for alle 10 guides (fælles visning udvidet 18.10 med kategori, kilder og "opdateret"); test læser nu standarddatoer fra guides-data i stedet for hårdkodet 15.10.
- P3 afkortet Type-felt @390: Type-feltet fylder hele rækken på <= 640 px; "Sport-motorcykler" står nu fuldt.

## Selvvurdering pr. mockup (ærlig, 1–10; Critic dømmer)

| Dimension | Mærker (maerke-yamaha / maerker) | Type (type-sport) | A2 (koerekort-a2) |
|---|---|---|---|
| Visuel kvalitet | 5 | 5 | 5 |
| Designkonsistens | 6 | 6 | 6 |
| Funktionalitet | 7 | 7 | 7 |
| Brugeroplevelse | 6 | 6 | 6 |
| Mobil | 6 | 6 | 6 |
| Performance | 7 | 7 | 7 |
| Indholdskvalitet | 7 | 6 | 6 |

Den store rest til mockuppen er fotografi og tekst, der ikke kan opfindes: mockuppens ryttermotiver i hero og CTA, slogan ("Revs Your Next Ride"), de påstande vi ikke kan dokumentere (svindelkontrol, fællesskab, 1.248 annoncer), og undertyper som "Supersport/Trackday" uden data. Typefliserne er illustrationer med lav tæthed.

## Tests
`scripts/maerke-audit.test.js` (ny, 6 tests; tilføj til package.json "test"). Opdateret: `scripts/guides.test.js`, `scripts/v2-maerker.test.js`. Grønne efter fuldt byg (build -> kritisk-gen -> build): maerke-audit, maerkeside, v2-maerker, w14-maerker, facet-sider, facet-cls, guides, seo-sider, seo-krav, seo-schema, seo-linkgraf, seo-meta-laengde, seo-vagt, seo-soeglink, csp-hashes, llms, info-tekst, a11y-tjek. Smoke-browser (6 sider x 320/390/768/1024/1440 x lys+mørk, cls 0.05, strikt) kørt 2 gange: 0 fejl, 0 advarsler.

## Restpunkter til Orchestrator
1. `DKW` (annonce "DKW 250") bliver "Ukendt", fordi mærket ikke findes i `BRANDS_BY_MODEL`/`MAERKE_AKRONYM` (js/data.js, js/backend-bridge.js). Tilføj DKW (og evt. de 13 ovenfor) dér, så titel-opslaget kan genkende dem; så får DKW automatisk side (noindex ved 1 annonce).
2. Mærkefilteret på soegning.html viser en række "Ukendt (2)" (js/search.js). Oversigten udelader den med forklaring; filteret bør kalde den "Uoplyst mærke" eller skjule den. Ikke mit område.
3. Billeder: 375/430/1920 er ikke screenshottet separat (kun 1440 og 390); smoke dækker 320–1440.
