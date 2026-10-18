# V2 Indhold, SEO og tværgående kvalitet (Builder 5)

## Opgave 1: CLS 0,116 på mc-honda-adventure @768 (varm kontekst)

**Reproduceret** med `scripts/smoke-browser.js` (mc-*, type-*, region-*, model-*, koerekort-*, budget-* @768/1024 lys+mørk): kun mc-honda-adventure @768 (lys og mørk) fejlede, CLS 0,116.

**Rod-årsag (målt med layout-shift-kilder, work/diag-cls.js):** shiftet sker ~167 ms efter navigation, når webfonten erstatter fallback-fonten. `.fa-h2-raekke` er `display:flex; flex-wrap:wrap`. Med fallback-font var overskrift (532 px) + "Se alle 13 ..." (167,6 px) + gap bredere end containeren (704 px), så linket brød ned under overskriften. Med webfonten blev linket 158,9 px bredt, rækken passede, og linket sprang op til højre: `.fa-mere` flyttede sig, `.fa-h2` 9 px, og `.fa-udvalgte-gitter` voksede 119 til 152 px. Det er altså en wrap-beslutning, der afhænger af tekstbredden i to fonte, ikke (kun) manglende kritisk CSS. Derfor sås det også uden kritisk CSS, og kun når fonten nåede at komme efter første layout (varm cache).

**Rettelse ved roden (css/p-facet.css):** under 1100 px står rækken altid som kolonne (`flex-direction:column; flex-wrap:nowrap; align-items:flex-start`), så der ikke længere er nogen wrap-beslutning at ændre sig. Fra 1100 px er der rigelig plads til begge på én linje. Reglen ligger i det kritiske udsnit via `scripts/kritisk-gen.js` (768 var allerede med); manifestet er regenereret.

**Før/efter:** mc-honda-adventure @768 lys og mørk: 0,116 til 0,000 (varm kontekst, 3 sider i rækkefølge).

**Test:** `scripts/v2-indhold-cls.test.js` (statisk regel-test + browsertest, 5 sider i samme kontekst @768 lys+mørk, CLS < 0,05; skippes uden Chromium). Skal tilføjes til package.json "test" af Orchestrator.

## Opgave 2: gennemgang af guides, regioner, øvrige sider

Mekanisk audit (work/audit.js) over alle rod-HTML-filer:
- Døde interne links: 0 (404.html bruger rodstier med /, bevidst; serveren løser dem).
- `<img>` uden alt: 0. Guides har 14-16 billeder hver, regioner 14-33.
- Tynde sider: ingen guide under 1390 ord; info-sider 685-1569 ord (om-bikerbasen 685, sikkerhed 806, vilkaar 990). Afmeld og forhandler er bevidst korte funktionssider.
- Opdateringsdatoer: guides har egen published/modified (15.-17. okt. 2026), afledt af build-data, ikke opdigtet. Ingen forfatter er opdigtet ("Af Bikerbasen / redaktionel guide").
- Regionssider: ordantal varierer med data (sjælland 964, syddanmark 5740), fordi byliste og udvalgte følger det indekserede lager. Ikke ændret, ingen opdigtet fyld.
- Ikke ændret (rest): "Opdateret"-dato kunne vises på kortene i guides.html (kræver ændring i scripts/build-guides.js, ikke i mit område).

## Iteration 2: Artikel.png mod guide-mc-forsikring og guide-foerste-motorcykel

Screenshots: `work/shots-v2/` (guide-1440-light, forsikring-{1440,390}-{light,dark}, guides-{1440,390}-light = før; guides2-1440-light, region-1440, forsikring2-390 = efter).

### Forskelsliste (mockup mod os, før arbejdet)
1. Hero: mockuppen har et stort, lyst rytterfoto, kategori-chip ("GUIDE") og H1 i ca. 46 px over to linjer. Vores hero har samme Ducati-foto på alle guides og kun et ens "GUIDE". **Rettet delvist:** chip med emne ("GUIDE · FORSIKRING"). Foto-variation kræver nye hero-fotos (ingen ægte foto at bruge, ikke opdigtet).
2. Meta-række: mockup har forfatter med foto, dato, læsetid. Vi har "Af Bikerbasen" (ingen opdigtet forfatter), opdateret, læsetid. **Rettet:** tilføjet "Kilder: N" (tal fra guidens kildeliste).
3. Indholdsfortegnelse i to kolonner med grøn nummerering: ens.
4. Brødtekst og H2-rytme: nummererede H2 og tæt tekst som mockup; ikke ændret.
5. "Kort fortalt" grøn sidebar med flueben og CTA: ens. Mockuppens "Populære motorcykler til begyndere" er hos os en liste med annoncer under A2-grænsen (kun reelle data); uændret.
6. Mørkt CTA-panel "Er du i tvivl om, hvad du må køre?": ens.
7. Faktabokse: mockup har ingen callout-bokse; vi har "Tip" og "Vigtigt" uden dubletter mod Kort fortalt (testet i guides.test.js).
8. Typefliser med foto og "Se X motorcykler": findes i første-motorcykel i brødteksten, i de øvrige under artiklen. **Rettet:** regionchips under fliserne og i første-motorcykel.
9. Relaterede guides: "Læs også" med foto; ens med mockup-niveau. "Næste skridt"-blok findes.
10. Oversigtsside (ikke i mockup, men "moderne artikeloversigt"): kort havde kun "Guide", læsetid. **Rettet:** emne-kategori på kort, "Opdateret" dato på alle kort, læsetid, billede.
11. Footer: ens.

### Implementeret (uden opdigtet indhold)
1. Emne-chip i hero og på kort (KATEGORI-tabel i `scripts/build-guides.js`).
2. "Opdateret"-dato på alle guidekort i guides.html (fra guidens egen `aendret`).
3. Kilder-antal i hero-metaraden (beregnet).
4. Fjerde kolonne "Efter region" i "Fra guide til søgning", regionchips i alle guides (guide -> region var 0 links, nu 5 pr. guide).
5. Regionsider: guides-række (brugt, første motorcykel, A2) plus genveje til kørekort A1/A2/A og typerne (region -> kørekort/type var 0 links). Mindst muligt i `scripts/build-facet-pages.js` (`guideRaekke`) og i bunden af css/p-facet.css (`.fa-region-genveje`).

### Krydslink-tabel (antal sider med mindst ét link, før -> efter)
- guides -> region: 0 -> 11 af 11 sider; region -> kørekort: 0 -> 5 af 5; region -> type: 0 -> 5 af 5; region -> guide: 5 -> 5.
- Stadig tynd: indgående links til guide-saelg/vinteropbevaring/foraar-tjekliste (4 hver). Kandidat til menu/footer (fælles fil, ikke rørt).
- Annoncetal: guides og regioner viser tal beregnet ved build fra samme datasæt; guides.html viser ingen tal. Datoer: guide-datoer er egne published/modified-felter (15.-17. okt.), regionssider har ingen datoer.
