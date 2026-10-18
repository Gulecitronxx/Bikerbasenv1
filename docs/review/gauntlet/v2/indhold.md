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
