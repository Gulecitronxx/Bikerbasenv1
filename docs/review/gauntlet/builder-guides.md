# Builder guides (billede 10) — rapport

Branch `gauntlet/guides`, port 8718. Nye filer: `scripts/build-guides.js`, `scripts/guides-data.js` (tekst + kilder), `css/p-guides.css` (.gd-), `js/guides.js` (kun header-init, ingen inline-JS), genererede `guides.html`, `guide-foerste-motorcykel.html`, `guide-a2-koerekort.html`, `guide-brugt-motorcykel.html`.

## Bygget pr. billedelement
- Hero med foto (img/hero-*), brødkrumme Forside > Artikler & guides > titel, kicker GUIDE, stor h1, ingress, meta-række: "Af Bikerbasen" (logo, INGEN person), Opdateret 15. oktober 2026, Læsetid 5 minutter (beregnet: ord/200, op).
- Indholdsfortegnelse (nummereret, to kolonner, ankerlinks), nummererede h2'er (CSS-tæller), type-fliser med foto der linker til type-*.html (guide 1), kørekorttabel (alle guides; kort på mobil).
- Sticky sidebjælke (overlapper hero fra 1024 px, sticky når viewport >= 1000 px højt): "Kort fortalt" med grønne ✓ + primær CTA i brandfarve "Søg motorcykler på Bikerbasen"; mørk boks "Er du i tvivl om, hvad du må køre?" -> koerekort-a2.html; mini-annoncekort fra lageret.
- guides.html: oversigt med kort pr. guide (foto, titel, ingress, læsetid) + genveje.
- SEO: unik title/description, én h1, canonical (uden .html), OG/Twitter (i build-meta-markørerne), Article-JSON-LD (publisher Bikerbasen, author = Organization, ingen Person), BreadcrumbList, CollectionPage/ItemList på oversigten. Interne links til type-*, koerekort-*, maerker, soegning, sikkerhed.

## Afvigelser fra billedet (bevidste)
- Ingen forfatter/foto/titel ("Mads Christensen" er opdigtet). Sidebjælkens liste hedder "Motorcykler til A2-kørekort", ikke "Populære ... til begyndere": "populære" og "begyndere" kan ikke belægges. Udvalget: kendt effekt <= A2-grænsen, pris, foto, én pr. model; udelades helt hvis < 2 kort. Eksterne kort linker til kilden (nofollow, ny fane), egne til annonce-siden. Ingen hjerte (favorit) på mini-kortene.
- Primær CTA er kobber, ikke grøn. Headeren er sitets (billedets "Artikler & guides"/"Viden" findes ikke i nav) -> DELT-ØNSKE.
- Hero-foto er sitets eksisterende img/hero-*.webp (samme på alle tre guides); typefliser er eksisterende img/type/*.webp.

## Kilder (alle læst direkte; også listet nederst i hver guide)
- Bekendtgørelse om kørekort BEK 550 af 19/06/2026 (retsinformation.dk/eli/lta/2026/550): §11 A1 (125 cm3, 11 kW, 0,1 kW/kg), §12 A2 (35 kW, 0,2 kW/kg, ikke afledt af mc med >dobbelt effekt; ukendt køreklar vægt = egenvægt+15 kg), §13 A, §35 A1 18 år, §36 A2 20 år (+stk. 2-3 særregler 18 år), §37 A 24 år / 22 år efter 2 års A2 + prøve.
- borger.dk "Kørekort til motorcykel": 18/20/24 år, lægeattest max 6 mdr., 1.600 kr. (2026) / 520 kr. ved tillægskategori.
- Færdselsloven LBK 118 af 12/01/2026: §81 styrthjelm, §105 ansvarsforsikring.
- borger.dk "Registrering, afmelding, ejerskifte" (omregistrering 4 hverdage, 340 kr. 2026, app Ejerskifte), borger.dk "Afgifter på køretøjer" (brugt mc: afgift beregnes som ny; registreringsafgift ved indførsel).
- Bilbogen (Life in Denmark/borger.dk, tinglysning.dk): viser pant og ejendomsforbehold, ikke ejerregister.
- Syn: BEK 1685 af 16/12/2025 §63 (syn ved ejerskifte, køretøjer uden periodisk syn); §§63-64 ophæves 1/1/2027 ved BEK 259 af 06/02/2026.
- forbrug.dk: 2 års reklamationsret i forbrugerkøb, ikke ved privatkøb, gælder brugte varer.
- Udeladt fordi det ikke kunne verificeres: afgifts-/ejerafgiftsbeløb for mc, konkrete modeller, priser, statistik.
- Bemærk: borger.dk-siden om mc-kørekort nævner ikke kW/kg og 2-års-regler; de er læst i bekendtgørelsen.

## DELT-ØNSKER (Orchestrator)
1. `scripts/build.js` `trin`: indsæt `'build-guides.js'` efter `'build-facet-pages.js'` (før `build-meta.js`). Generatoren udvider selv sitemap.xml (idempotent, samme mekanisme som build-facet-pages `udvidSitemap`, fem linjer for guides + de tre guides); jeg har ikke committet sitemap.xml.
2. `scripts/udgiv.js` allowlist: `guides.html`, `guide-*.html`, `css/p-guides.css`, `js/guides.js`.
3. `scripts/build-meta.js`: overskriver min meta-blok med og:type "website"; ønske: `article` for `guide-*.html` (og evt. article:published_time).
4. Header/footer: nav-punkt "Artikler & guides" -> guides.html, og link i footer ("Sikkerhed & gode råd"-kolonnen).
5. Frivilligt: link til guides fra forsiden/kørekortsiderne (billede 7 har guides-blok).
6. `npm test`: tilføj `scripts/guides.test.js`.

## Tests og målinger
- Ny: `scripts/guides.test.js` (28 tests: én h1, canonical, title/description-længde, JSON-LD parser + ingen Person-forfatter, TOC-ankre = id'er, kilder, interne links findes, ingen inline-scripts, ord 900-1500, læsetid, sidebjælke-udvalg). `npm test`: 364 pass, 0 fail.
- Overflow: 4 sider x 320/360/390/768/1024/1440 x lys+mørk = 48 målinger, scrollWidth == clientWidth overalt. Konsol: 0 fejl.
- Iterationer: (1) 1440 lys vs billede: struktur ok; fund: typefliser clippede "Adventure/Enduro", ingen punkttegn, sidebjælke 3. kort klippet, "Se alle" brød. (2) mobil mørk: rækkefølgen var forkert (styles.css `main > .container > *{order:6}`), tabel scrollede vandret -> kort på mobil. (3) 1024/1440 mørk + oversigt: ok.
- Ordtal (artikel inkl. kilder): 990 / 1049 / 1032. Læsetid 5/5/5 min.

## Kendte rester
- Samme hero-foto på alle guides. Mini-kortenes foto er kildens thumbnail (hotlink, som resten af sitet). Sidebjælkens udvalg er bagt ved build og ældes mellem builds (datoen står under kortene).
- Kontrast kun kontrolleret visuelt + tokens (ikke automatisk axe-kørsel).
- Syn-afsnittet i guide 3 skal gennemlæses efter 1. jan. 2027 (reglen om syn ved ejerskifte ophæves).
