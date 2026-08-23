/* 12 var sat, da lageret var 51 annoncer. Med 383 blev det 32 sider — og en
   køber, der skal bladre 32 gange for at se udbuddet, bladrer ikke. Bilbasen
   viser 30 pr. side. 24 halverer sidetallet til 16, passer i både tre
   spalter (8 rækker) og to (12 rækker), og listevisningen bliver en liste
   man kan skanne i stedet for et uddrag.
   Bemærk: scripts/build-srp.js forudtegner kun de første 12 i markuppen —
   det er dem, der er over folden. js/search.js maler resten. */
const PAGE_SIZE = 24;
const EMPTY_STATE = {
  q: '', types: [], brands: [], models: [], priceMin: null, priceMax: null,
  yearMin: null, yearMax: null, kmMax: null, ccmMin: null, ccmMax: null,
  hkMin: null, hkMax: null,
  /* fuels, drives og cylinders er FJERNET i runde 3 sammen med deres tre
     filtergrupper. De var personbilsformularens felter, og ingen af de 383
     annoncer i lageret oplyser dem — hverken kilden eller vores egne. Se
     kommentaren i soegning.html, hvor grupperne stod. */
  regions: [], conditions: [], equipment: [],
  service: [],
  colors: [], maxAgeDays: null, photosOnly: false,
  ejereMax: null, nysynet: false, vinterklar: false,
  dealerOnly: false, koerekort: '', kilde: '', sort: 'blandet', page: 1,
};

/* Sorteringerne, som de står i #sort-select. Listen bruges også til at
   forkaste en ?sort= fra URL'en, vi ikke kender — før faldt en ukendt værdi
   igennem til `sorters[state.sort] || …`, og så stod der en sortering i
   vælgeren, som ikke var den, resultatet var sorteret efter. */
const SORTERINGER = ['blandet', 'date-desc', 'price-asc', 'price-desc', 'year-desc', 'km-asc'];
/* Standardsorteringen hed `relevans` i runde 1. Den skrives aldrig i URL'en
   (den er standard, se currentQueryString), men et delt eller bogmærket link
   med ?sort=relevans skal ikke lande i "Nyeste først" bare fordi vi rettede
   et navn. Alias'et koster to linjer og bevarer et link, vi selv har udstedt. */
const SORT_ALIAS = { relevans: 'blandet' };
let state = { ...EMPTY_STATE };

/* Feltnavne i URL'en. Listen bruges begge veje, så et nyt filter kun skal
   tilføjes ét sted for at kunne deles, bogmærkes og gemmes som søgeagent. */
const LIST_PARAMS = {
  types: 'types', brands: 'brands', models: 'model', regions: 'regions', conditions: 'conditions',
  equipment: 'udstyr', colors: 'farve',
  service: 'service',
};
const NUM_PARAMS = {
  priceMin: 'priceMin', priceMax: 'priceMax', yearMin: 'yearMin', yearMax: 'yearMax',
  kmMax: 'kmMax', ccmMin: 'ccmMin', ccmMax: 'ccmMax', hkMin: 'hkMin', hkMax: 'hkMax',
  ejereMax: 'ejereMax',
  maxAgeDays: 'oprettet',
};

function readStateFromURL(){
  const p = new URLSearchParams(window.location.search);
  state.q = p.get('q') || '';
  for (const [key, param] of Object.entries(LIST_PARAMS)){
    state[key] = (p.get(param) || '').split(',').filter(Boolean);
  }
  // Forsiden og kategorilinkene sender ?type=sport i ental.
  if (p.get('type')) state.types = p.get('type').split(',').filter(Boolean);
  for (const [key, param] of Object.entries(NUM_PARAMS)) state[key] = numOrNull(p.get(param));
  if (p.get('maxPrice')) state.priceMax = numOrNull(p.get('maxPrice'));
  state.photosOnly = p.get('billeder') === '1';
  state.dealerOnly = p.get('dealer') === '1';
  state.nysynet = p.get('nysynet') === '1';
  state.vinterklar = p.get('vinter') === '1';
  state.koerekort = p.get('koerekort') || '';
  state.kilde = p.get('kilde') || '';
  const sort = SORT_ALIAS[p.get('sort')] || p.get('sort') || '';
  state.sort = SORTERINGER.includes(sort) ? sort : 'blandet';
  state.page = numOrNull(p.get('page')) || 1;
}
function numOrNull(v){ return (v === null || v === '' || isNaN(Number(v))) ? null : Number(v); }

/* Filtrene som query string. Uden side og sortering er det samtidig den
   nøgle en søgeagent sammenlignes på, så samme filtre altid genkendes. */
function currentQueryString(includeSort = false){
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  for (const [key, param] of Object.entries(LIST_PARAMS)){
    if (state[key].length) p.set(param, state[key].join(','));
  }
  for (const [key, param] of Object.entries(NUM_PARAMS)){
    if (state[key] != null) p.set(param, state[key]);
  }
  if (state.photosOnly) p.set('billeder', '1');
  if (state.dealerOnly) p.set('dealer', '1');
  if (state.nysynet) p.set('nysynet', '1');
  if (state.vinterklar) p.set('vinter', '1');
  if (state.koerekort) p.set('koerekort', state.koerekort);
  if (state.kilde) p.set('kilde', state.kilde);
  if (includeSort && state.sort !== 'blandet') p.set('sort', state.sort);
  return p.toString();
}

/* ============ Tilbage skal kunne fortryde ét filter ad gangen ============

   Runde 3's kritiker: hver filterændring kaldte replaceState, så et klik på
   Tilbage efter tre filterklik ikke fortrød det sidste — den sprang FORBI
   alle tre og landede der, brugeren var, FØR søgningen overhovedet startede
   (ofte forsiden). Årsagen var, at søgesiden kun nogensinde havde ÉT
   historik-punkt: hvert filter overskrev det forrige i stedet for at lægge
   sig oveni.

   Løsningen er ikke "brug altid pushState" — det blev prøvet i tanken og
   forkastet, fordi fritekstfeltet allerede (med vilje, se D-funktionen
   currentQueryString) IKKE spammer historikken ved hvert tastetryk, og det
   samme gælder tal-felterne og skyderne. Kun DISKRETE valg — en chip, en
   afkrydsning, en rullemenu, "Nulstil" — er de punkter, en bruger faktisk
   tænker på som "ét filter", og som Tilbage derfor skal kunne fortryde ét
   ad gangen. Sortering og paginering er heller ikke filtre; de er urørt.

   `pushFilterState()` sætter et éngangs-flag, som `writeStateToURL()` læser:
   sandt giver pushState (nyt punkt), usandt (standarden) giver replaceState
   som hidtil. Uden ændring i selve prædikatet — kun i hvor mange punkter
   browserens historik får at fortryde. */
let pendingHistoryPush = false;
function pushFilterState(){
  pendingHistoryPush = true;
  render();
}

// Den URL, den nuværende `state` selv ville skrive. Brugt af BÅDE
// writeStateToURL() (til at afgøre om der overhovedet er noget nyt at
// skrive) og popstate-lytteren i wirePositionHukommelse() (til at afgøre om
// en popstate er ÆGTE — se fælden dér).
function beregnURL(){
  const p = new URLSearchParams(currentQueryString(true));
  if (state.page > 1) p.set('page', state.page);
  const qs = p.toString();
  return window.location.pathname + (qs ? '?' + qs : '');
}

function writeStateToURL(){
  const url = beregnURL();
  // Skriv aldrig et punkt, der er identisk med det, vi allerede står på —
  // ellers laver et klik, der ikke ændrer noget (fx samme prisbånd valgt to
  // gange i to forskellige klik), et dødt historik-tryk.
  const uaendret = url === (window.location.pathname + window.location.search);
  if (pendingHistoryPush && !uaendret) history.pushState(null, '', url);
  else history.replaceState(null, '', url);
  pendingHistoryPush = false;
}

/* ============ Opstart: hvad skal bygges hvornår ============

   Hele filterpanelet blev tidligere bygget på hovedtråden inden første
   render: ~35 udstyrs-checkbokse, 60 mærker, regioner, farver, chips og
   options — 470 DOM-knuder, som på mobil ligger i en skuffe med
   `display:none`, indtil brugeren trykker "Filtre". Målt i Lighthouse lå det
   i den samme 254 ms-opgave som resultaterne, og var dermed direkte TBT.

   Nu bygges kun det, der er synligt med det samme (populateChrome), og
   panelet rejses første gang det skal bruges — ved tryk på "Filtre" på
   mobil, og i en idle-lomme efter første render på desktop, hvor panelet
   står åbent i sidebaren. */
let filtersBuilt = false;

/* Ikoner uden for filterpanelet: værktøjslinjen, søgefeltet, brødkrummen og
   tom-tilstanden. Billigt, og skal stå der ved første maling. */
function populateChrome(){
  document.getElementById('filter-icon-mount').innerHTML = Icon.filter;
  const srpIcon = document.getElementById('srp-search-icon');
  if (srpIcon) srpIcon.innerHTML = Icon.search;
  const qClearBtn = document.getElementById('filter-q-clear');
  if (qClearBtn) qClearBtn.innerHTML = Icon.close;
  document.getElementById('empty-icon').innerHTML = Icon.search;
  document.getElementById('bc-sep-1').innerHTML = Icon.chevronRight;
  document.getElementById('view-grid').innerHTML = Icon.grid;
  document.getElementById('view-list').innerHTML = Icon.list;
  const vs = document.getElementById('view-swipe');
  if (vs) vs.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="16" rx="2" transform="rotate(-6 12 12)"/><path d="M9 20h6"/></svg>`;
}

/* Bygger panelet én gang og kobler dets kontroller på. Idempotent, så den
   kan kaldes fra både klik, idle og media-query-skift. */
function ensureFiltersBuilt(){
  if (filtersBuilt) return;
  filtersBuilt = true;
  populateFilterUI();
  wireFilterControls();
  reflectStateToUI();
}

/* Desktop viser panelet i sidebaren — dér skal det rejses af sig selv, men
   først når hovedtråden er ledig. På mobil ligger det i en lukket skuffe, så
   dér venter vi på det tryk der rent faktisk åbner den (eller på at vinduet
   bliver bredt nok til at panelet vises). */
function scheduleFilterPanel(){
  if (filtersBuilt) return;
  const mq = window.matchMedia('(min-width: 960px)');
  const build = () => ensureFiltersBuilt();
  if (mq.matches){
    (window.requestIdleCallback || ((f) => setTimeout(f, 120)))(build, { timeout: 1200 });
    return;
  }
  // Bliver vinduet bredt nok til at sidebaren vises, skal panelet være der.
  const onResize = () => {
    if (!mq.matches) return;
    window.removeEventListener('resize', onResize);
    build();
  };
  window.addEventListener('resize', onResize, { passive: true });
}

/* ============ Prisintervaller som ét klik ============

   Rubrikkens prøve er "fra 'jeg vil have en A2'er til under 60.000' til en
   liste på under tre klik". Med kun skyder og talfelter var den umulig:
   fold gruppen ud, grib den rigtige tommel, slip det rigtige sted — eller
   tast 60000 og vent på debounce. Nu er det ét klik, og facettallet ved
   siden af siger på forhånd, om der overhovedet er noget dernede.

   Grænserne er valgt efter, hvor det danske mc-marked deler sig: under
   30.000 er begynder- og projektcykler, 30-60.000 er den typiske A2'er,
   over 150.000 er tunge tourere og nye maskiner. */
const PRIS_INTERVALLER = [
  { id: 'u30',    label: 'Under 30.000',   min: null,   max: 30000  },
  { id: '30-60',  label: '30–60.000',      min: 30000,  max: 60000  },
  { id: '60-100', label: '60–100.000',     min: 60000,  max: 100000 },
  { id: '100-150',label: '100–150.000',    min: 100000, max: 150000 },
  { id: 'o150',   label: 'Over 150.000',   min: 150000, max: null   },
];

/* ============ Filtre uden dækning findes ikke ============

   Målt på lageret den 16. aug. 2026: udstyr, brændstof, træktype, farve,
   cylinderantal, servicehistorik, antal ejere, seneste syn og
   vinterklargøring er oplyst på NUL af 383 annoncer. De syv filtergrupper,
   der byggede på dem, stod alligevel i panelet. Ét klik på "ABS-bremser"
   gav nul træf og linjen "383 annoncer er ikke vist, fordi udstyr ikke er
   oplyst på dem" — teknisk sandt, men brugeren havde ikke fået et filter,
   han havde fået en blindgyde.

   Så: gruppen vises kun, hvis mindst én annonce kan svare på feltet. Prøven
   køres på det lager, der faktisk er hentet, så grupperne dukker op af sig
   selv den dag kilden begynder at levere felterne — der er ikke noget at
   huske at slå til igen.

   Samme regel gælder de enkelte valg inde i grupperne: mærkelisten kom fra
   BRANDS_BY_MODEL og viste 60 mærker, hvoraf 35 ikke fandtes i lageret —
   og manglede samtidig 7, der gjorde (Moto Guzzi, MV Agusta, Victory …).
   Den bygges nu af lageret. */
function feltDaekning(){
  const L = Store.getAllListings();
  const har = (f) => L.some(f);
  return {
    serviceHistorik: har(l => l.serviceHistorik != null),
    ejereSyn:        har(l => l.antalEjere != null || l.sidsteSyn != null || l.vinterklar != null),
    // equipment: [] betyder "spurgt, intet ekstraudstyr" — det er ikke noget
    // at filtrere på. Kun en udfyldt liste tæller som dækning.
    equipment:       har(l => Array.isArray(l.equipment) && l.equipment.length > 0),
    color:           har(l => l.color != null),
  };
}

/* Pladsen til facettallet. Den står tom i markuppen og fyldes af
   renderFacetCounts() — men den STÅR der fra første maling, og css'en giver
   den fast bredde. Ellers ville tallene dukke op en opgave senere og skubbe
   hver eneste chip i panelet en tand til højre: et layoutskred i sidebaren,
   som er synlig fra 960px og opefter. */
const FACET_SLOT = '<span class="facet-n" aria-hidden="true"></span>';

/* ---------- At skjule en filtergruppe skal VIRKE ----------

   `gruppe.hidden = true` alene er ikke nok, og det er ikke teori: en
   kritiker målte syv tomme overskrifter i panelet på en side, hvor koden
   nedenfor allerede satte hidden. Attributten hidden er browserens egen
   regel `[hidden]{display:none}`, og den kan slås af en hvilken som helst
   regel i et af de tre stilark siden har (den indlejrede kritiske blok,
   soeg-perf og styles.css), der giver .filter-group en display-værdi.
   `style.display` er den eneste, ingen af dem kan overtrumfe.

   Begge sættes: attributten er den, der fortæller skærmlæsere og
   :not([hidden])-selektorer sandheden, og inline-stilen er den, der
   garanterer, at øjet ser det samme som skærmlæseren. */
function skjulGruppe(gruppe){
  gruppe.hidden = true;
  gruppe.style.display = 'none';
  gruppe.open = false;
}
function visGruppe(gruppe){
  gruppe.hidden = false;
  gruppe.style.removeProperty('display');
}
/* Vis kun, hvis der faktisk står en kontrol i gruppen. */
function visGruppeHvisIndhold(gruppe){
  const kontroller = gruppe.querySelectorAll('input, select, .chip, button[data-cylinder]').length;
  if (kontroller) visGruppe(gruppe); else skjulGruppe(gruppe);
}

/* Indholdet i de dækningsbetingede grupper. Ligger på modulniveau og ikke
   inde i populateFilterUI(), fordi gruppen skal kunne bygges SENERE end
   panelet — se synkroniserKravGrupper(). `ejereSyn` har ingen bygger: dens
   tre felter står i den statiske markup. */
const KRAV_BYGGERE = {
  serviceHistorik: () => { document.getElementById('filter-service').innerHTML = SERVICE_HISTORIK_OPTIONS.map(s =>
    `<label class="checkbox-row"><input type="checkbox" data-service="${s}"><span>${s}</span></label>`).join(''); },
  equipment: () => { document.getElementById('filter-equipment').innerHTML = EQUIPMENT_GROUPS.map(g => `
    <div class="filter-subgroup">
      <p class="filter-subgroup-title">${g.group}</p>
      ${g.items.map(i => `<label class="checkbox-row"><input type="checkbox" data-equipment="${i.id}"><span>${i.label}</span></label>`).join('')}
    </div>`).join(''); },
  color: () => { document.getElementById('filter-colors').innerHTML = COLORS.map(c =>
    `<label class="checkbox-row"><input type="checkbox" data-color="${c}"><span>${c}</span></label>`).join(''); },
};

/* Lageret kan vokse EFTER panelet er bygget (backend-broen henter i to
   omgange, og en anden builder arbejder netop nu på at gøre resultatsættet
   deterministisk). Bygges panelet på et halvt lager, låses gaten fast på et
   svar, der var rigtigt i et halvt sekund — og en gruppe, der HAR fået
   dækning imens, ville stå tom. Den her kaldes derfor igen fra render-etape
   2; den koster tre gennemløb af lageret med tidligt stop, og den bygger
   gruppens indhold, hvis den ikke er bygget endnu.

   Sidste ord har KONTROLLERNE, ikke dækningen: en kritiker talte syv tomme
   overskrifter i panelet, mens gaten var på plads i koden. Prøven i
   visGruppeHvisIndhold() spørger DOM'en, om der faktisk står en kontrol i
   gruppen, og kan derfor ikke tage fejl af det. */
function synkroniserKravGrupper(kendtDaekning){
  if (!filtersBuilt) return;
  const daekning = kendtDaekning || feltDaekning();
  document.querySelectorAll('.filter-group[data-krav]').forEach(gruppe => {
    const felt = gruppe.dataset.krav;
    if (!daekning[felt]){ skjulGruppe(gruppe); return; }
    const bygger = KRAV_BYGGERE[felt];
    const krop = gruppe.querySelector('.filter-body');
    if (bygger && krop && !krop.children.length) bygger();
    visGruppeHvisIndhold(gruppe);
  });
}

function populateFilterUI(){
  const daekning = feltDaekning();
  const alle = Store.getAllListings();

  /* Type er FLERVALG (state.types er et array, chipsene lægger sig oveni
     hinanden) — knappen er derfor en rigtig toggle-knap, og dens tilstand
     hedder aria-pressed. Kørekort og pris er derimod ENKELTVALG (state har
     kun ét koerekort og ét pris-interval ad gangen, se wireFilterControls
     nedenfor) — samme visuelle `.chip`, men de er reelt en radioknap-gruppe,
     og WCAG 4.1.2 kræver, at det NAVN, den ROLLE og den VÆRDI stemmer med
     det. Se D-011 i work/DECISIONS.md for hele fundet: to identiske
     chip-rækker, hvoraf kun den ene var flervalg, og intet i markuppen eller
     i skærmlæseren sagde det. */
  document.getElementById('filter-types').innerHTML = TYPES.map(t =>
    `<button type="button" class="chip" data-type="${t.id}" aria-pressed="false">${t.label}${FACET_SLOT}</button>`).join('');

  document.getElementById('filter-price-quick').innerHTML = PRIS_INTERVALLER.map(p =>
    `<button type="button" class="chip" data-pris="${p.id}" role="radio" aria-checked="false" tabindex="-1">${p.label}${FACET_SLOT}</button>`).join('');

  /* ÉN liste, og hvert mærke står i den éN gang.

     Her lå først en række "populære" chips (Yamaha, Honda, BMW, Suzuki,
     Kawasaki, Harley-Davidson, Ducati, KTM) og DEREFTER hele det alfabetiske
     katalog. Seks af de otte står også i lageret, og en kritiker talte dem:
     BMW, Ducati, Harley-Davidson, Honda, Kawasaki og KTM optrådte to gange i
     samme filtergruppe, med hvert sit facettal ved siden af. To knapper, der
     gør nøjagtig det samme, er ikke en genvej — det er et spørgsmål om,
     hvorfor der er to.

     Chipsene er væk, og listen er den ene vej ind. Den koster ikke en genvej:
     hver række har sit eget facettal, søgefeltet står lige over den, og
     "Vis alle N mærker" folder resten ud med ét tryk. Det, der forsvandt, er
     dubletten. */
  const iLager = new Set(alle.map(l => l.brand).filter(Boolean));
  // Et mærke valgt via URL bliver stående, selv om det ikke er i lageret —
  // ellers kunne pillen ikke fjernes fra det sted, den blev sat.
  state.brands.forEach(b => iLager.add(b));
  const maerker = [...iLager].sort((a,b) => a.localeCompare(b,'da'));
  const brandRows = maerker.map(b =>
    `<label class="checkbox-row" data-brand-row="${escapeHTML(b.toLowerCase())}"><input type="checkbox" data-brand="${escapeHTML(b)}"><span>${escapeHTML(b)}</span>${FACET_SLOT}</label>`).join('');
  document.getElementById('filter-brands').innerHTML = `
    <div class="filter-search"><input type="text" id="brand-search" placeholder="Søg mærke…" autocomplete="off" aria-label="Søg i mærker"></div>
    <div class="checkbox-list" id="brand-list">${brandRows}
      <p class="brand-noresult" id="brand-noresult" hidden>Ingen mærker matcher.</p>
    </div>
    <button type="button" class="brand-more" id="brand-more" aria-controls="brand-list" aria-expanded="false" hidden></button>`;

  document.getElementById('filter-koerekort').innerHTML = KOEREKORT.map(k =>
    `<button type="button" class="chip" data-koerekort="${k.id}" title="${k.hint}" role="radio" aria-checked="false" tabindex="-1">${k.label}${FACET_SLOT}</button>`).join('');

  document.getElementById('filter-regions').innerHTML = REGIONS.map(r =>
    `<label class="checkbox-row"><input type="checkbox" data-region="${r}"><span>${r}</span>${FACET_SLOT}</label>`).join('');

  document.getElementById('filter-conditions').innerHTML = CONDITIONS.map(c =>
    `<label class="checkbox-row"><input type="checkbox" data-condition="${c}"><span>${c}</span>${FACET_SLOT}</label>`).join('');

  document.getElementById('filter-age').innerHTML =
    '<option value="">Alle annoncer</option>' +
    AGE_FILTERS.map(a => `<option value="${a.id}">${a.label}</option>`).join('');

  /* Grupperne med data-krav bygges KUN, hvis lageret kan svare på feltet.
     Det sparer samtidig ~470 DOM-knuder ved opstart — udstyrslisten alene er
     33 checkbokse i seks undergrupper. */
  synkroniserKravGrupper(daekning);

  // Ikonerne der bor inde i panelet — hører til her, ikke i populateChrome.
  document.querySelectorAll('.filter-group summary .chev').forEach(c => c.innerHTML = Icon.chevronDown);
  document.querySelector('.filters-close').innerHTML = Icon.close;

  // Tallene skal stå der ved FØRSTE maling, ikke en opgave senere.
  renderFacetCounts();
  // Mærkelisten foldes sammen med det samme — ellers står alle 60 rækker
  // synlige det ene øjeblik, der går, før reflectStateToUI() når frem.
  opdaterMaerkeliste();
}

/* ============ Facettællinger: hvad koster det næste klik? ============

   Bilbasens filterpanel svarer først, når man har lukket det: man vælger i
   blinde og ser bagefter, om der var noget. Her står tallet ved siden af
   hvert valg, FØR man klikker — "A2 · 11", "Yamaha · 47", "Under 30.000 ·
   112" — og et valg, der ville give nul, er nedtonet og kan ikke klikkes.

   Tallet er ægte: det er resultatet af den fulde filterkæde med netop dette
   ene valg lagt oveni og facettens eget filter slået fra (se anvendFiltre).
   Det er derfor ikke "hvor mange af den slags findes der", men "hvor mange
   får JEG, som jeg har sat resten".

   Og — vigtigt for vores linje — tallet tæller kun annoncer, der faktisk
   ville blive vist. De uoplyste er ikke med, præcis som de ikke er med i
   resultatet. Linjen over resultaterne siger stadig, hvor mange der blev
   skjult og hvorfor. */
function facetTal(){
  const alle = Store.getAllListings();
  const basis = (spring) => anvendFiltre(alle, spring, null);
  const tael = (liste, vaelg) => {
    const m = new Map();
    for (const l of liste){ const v = vaelg(l); if (v == null) continue; m.set(v, (m.get(v) || 0) + 1); }
    return m;
  };

  const kkBasis = basis('koerekort');
  const koerekort = new Map();
  for (const k of KOEREKORT){
    let n = 0;
    for (const l of kkBasis) if (koerekortSvar(l, k.id) === true) n++;
    koerekort.set(k.id, n);
  }

  const prisBasis = basis('price');
  const pris = new Map();
  for (const p of PRIS_INTERVALLER){
    let n = 0;
    for (const l of prisBasis){
      if (l.price == null) continue;                       // uoplyst tæller ikke med
      if (p.min != null && l.price < p.min) continue;
      if (p.max != null && l.price > p.max) continue;
      n++;
    }
    pris.set(p.id, n);
  }

  return {
    types:      tael(basis('types'),      l => l.type),
    brands:     tael(basis('brands'),     l => l.brand),
    regions:    tael(basis('regions'),    l => l.region),
    conditions: tael(basis('conditions'), l => l.condition),
    koerekort, pris,
  };
}

/* Skriver ét tal ind og markerer blindgyder. `aktiv` beskytter det valg,
   brugeren allerede har truffet: står man PÅ "Yamaha" og resultatet er nul
   på grund af et andet filter, skal knappen stadig kunne klikkes — ellers
   kan man ikke komme ud igen. */
function saetFacet(el, n, aktiv){
  const slot = el.querySelector('.facet-n');
  if (slot) slot.textContent = n == null ? '' : n;
  const tom = n === 0 && !aktiv;
  el.classList.toggle('facet-empty', tom);
  const styr = el.tagName === 'BUTTON' ? el : el.querySelector('input');
  if (styr) styr.disabled = tom;
}

function renderFacetCounts(){
  if (!filtersBuilt) return;
  const f = facetTal();

  document.querySelectorAll('#filter-types .chip').forEach(c =>
    saetFacet(c, f.types.get(c.dataset.type) || 0, state.types.includes(c.dataset.type)));
  document.querySelectorAll('#filter-koerekort .chip').forEach(c =>
    saetFacet(c, f.koerekort.get(c.dataset.koerekort) || 0, state.koerekort === c.dataset.koerekort));
  document.querySelectorAll('#filter-price-quick .chip').forEach(c =>
    saetFacet(c, f.pris.get(c.dataset.pris) || 0, erAktivtPrisinterval(c.dataset.pris)));
  document.querySelectorAll('#filter-brands input[data-brand]').forEach(cb =>
    saetFacet(cb.closest('.checkbox-row'), f.brands.get(cb.dataset.brand) || 0, state.brands.includes(cb.dataset.brand)));
  document.querySelectorAll('#filter-regions input[data-region]').forEach(cb =>
    saetFacet(cb.closest('.checkbox-row'), f.regions.get(cb.dataset.region) || 0, state.regions.includes(cb.dataset.region)));
  document.querySelectorAll('#filter-conditions input[data-condition]').forEach(cb =>
    saetFacet(cb.closest('.checkbox-row'), f.conditions.get(cb.dataset.condition) || 0, state.conditions.includes(cb.dataset.condition)));
}

/* ============ Mærkelisten: ét rullefelt færre ============

   Mærkelisten var en `.checkbox-scroll` med `max-height:248px; overflow-y:auto`.
   Den lå inde i filterarket, som selv ruller, som ligger inde i siden, som
   ruller. Tre indlejrede rulleområder på en telefon — målt af kritikeren til
   ca. to synlige rækker ad gangen. Det er ikke en liste, man kan overskue;
   det er et kighul, hvor fingeren tit rammer det forkerte lag og flytter
   arket i stedet for listen.

   Nu er der ingen indre rulning. Listen viser de 12 første mærker og folder
   resten ud på ét tryk. Tre grunde til 12: det er dobbelt så mange som de
   otte populære chips lige ovenover, det er stadig kortere end arkets egen
   højde på en telefon, og det er nok til at alfabetet når fra Aprilia til
   Husqvarna, så man kan se, at listen ER alfabetisk.

   Søger man, folder listen sig ud af sig selv — en søgning er et spørgsmål
   om HELE listen, og en skjult række, der matcher, ville ligne et mærke, vi
   ikke har. Og et mærke, der allerede er krydset af (fx sat fra en delt
   URL), står altid, uanset hvor i alfabetet det ligger: ellers kunne
   filteret ikke fjernes det sted, det blev sat. */
const MAERKER_FOER_UDFOLD = 12;
let maerkerUdfoldet = false;

function opdaterMaerkeliste(){
  const liste = document.getElementById('brand-list');
  if (!liste) return;
  const soeg = document.getElementById('brand-search');
  const q = (soeg?.value || '').trim().toLowerCase();

  let matchende = 0, vist = 0;
  liste.querySelectorAll('[data-brand-row]').forEach(row => {
    if (!row.dataset.brandRow.includes(q)){ row.hidden = true; return; }
    matchende++;
    const valgt = row.querySelector('input')?.checked;
    const overGraensen = !q && !maerkerUdfoldet && !valgt && matchende > MAERKER_FOER_UDFOLD;
    row.hidden = overGraensen;
    if (!overGraensen) vist++;
  });

  const nr = document.getElementById('brand-noresult');
  if (nr) nr.hidden = matchende > 0;

  const knap = document.getElementById('brand-more');
  if (!knap) return;
  // Under en søgning er der intet at folde ud — alt, der matcher, står der.
  knap.hidden = !!q || (matchende <= vist && !maerkerUdfoldet);
  knap.setAttribute('aria-expanded', String(maerkerUdfoldet));
  knap.textContent = maerkerUdfoldet
    ? 'Vis færre mærker'
    : `Vis alle ${matchende} mærker`;
}

function erAktivtPrisinterval(id){
  const p = PRIS_INTERVALLER.find(x => x.id === id);
  return !!p && state.priceMin === p.min && state.priceMax === p.max;
}

function describeCurrentSearch(pills){
  if (!pills.length && !state.q) return 'Alle motorcykler';
  const parts = [];
  if (state.q) parts.push(`"${state.q}"`);
  pills.forEach(p => parts.push(p.label));
  return parts.slice(0, 4).join(' · ') + (parts.length > 4 ? ` +${parts.length - 4}` : '');
}

function refreshSaveSearchButton(){
  const qs = currentQueryString();
  const saved = Store.getSavedSearches().some(s => s.query === qs);
  const btn = document.getElementById('save-search-btn');
  const tekst = saved ? 'Søgning gemt' : 'Gem søgning';
  document.getElementById('save-search-icon').innerHTML = saved ? Icon.checkCircle : Icon.bell;
  document.getElementById('save-search-label').textContent = tekst;
  // På mobil vises kun klokken (teksten er skjult for øjet, men ikke for
  // skærmlæsere) — title giver den seende bruger det samme svar ved tryk-hold.
  btn.title = tekst;
  btn.classList.toggle('is-saved', saved);
}

/* ============ Visningsskift ============

   Gallerivisning og listevisning er ikke det samme kort i to bredder — det
   var de før, og det er dét, der gør en listevisning ubrugelig. Et kort
   lagt ned er stadig et kort: fotoet fylder, felterne står hvor der er
   plads, og de flytter sig fra række til række.

   En listevisning er til at SKANNE 383 annoncer. Derfor har den sin egen
   markup (listingRowHTML) med faste zoner, så årgang står under årgang og
   pris under pris hele vejen ned. Øjet kan køre lodret i én kolonne i
   stedet for at lede efter det samme felt i tolv forskellige hjørner.

   Valget huskes i Store.getViewMode()/setViewMode() (localStorage,
   nøglen bb_view_mode), som resten af sitet gør det med tema og favoritter. */
function setViewMode(mode){
  Store.setViewMode(mode);
  // render() og ikke bare applyViewMode(): de to visninger er forskellig
  // markup, så gitteret skal males om — ikke bare have en ny klasse på.
  render();
}

function applyViewMode(){
  const mode = Store.getViewMode();
  const grid = document.getElementById('results-grid');
  const deck = document.getElementById('swipe-deck');
  const swipe = mode === 'swipe';
  grid.classList.toggle('list-view', mode === 'list');
  grid.hidden = swipe;
  const pag = document.getElementById('pagination'); if (pag) pag.style.display = swipe ? 'none' : '';
  if (swipe){
    document.getElementById('empty-state').style.display = 'none';
    const thin = document.getElementById('thin-result-panel'); if (thin) thin.hidden = true;
  }
  if (deck){ deck.hidden = !swipe; if (swipe) mountSwipeDeck(); }
  [['view-grid','grid'],['view-list','list'],['view-swipe','swipe']].forEach(([id, m]) => {
    const b = document.getElementById(id);
    if (b){ b.classList.toggle('active', mode === m); b.setAttribute('aria-pressed', mode === m); }
  });
}

/* Hvilken funktion tegner ét resultat? Gitteret og listen deler data,
   sortering, paginering og portionsvis maling — kun markuppen er forskellig. */
function aktivKortRenderer(){
  return Store.getViewMode() === 'list' ? listingRowHTML : listingCardHTML;
}

/* ============ Listevisning: én række pr. annonce ============

   Referencens disciplin, oversat til motorcykler:

     to-linjers titel    model fed og kort, variant dæmpet nedenunder. En
                         forhandlertitel er sjældent en titel — den er en
                         model, en variant og et par salgsmarkører klasket
                         sammen ("XV 750 Cruiser Virago ENGROS/UDEN
                         KLARGØRING"). Presset ned i én linje er den
                         uskanbar; delt op kan øjet nøjes med de første to
                         ord.
     fire faste specs    årgang · kilometer · motor · KØREKORT, altid i den
                         rækkefølge, altid i samme kolonne. Referencens
                         fjerde spec er drivmiddel; vores er den, der
                         afgør om køberen overhovedet må køre maskinen.
     intet tomt felt     mangler et tal, står der "Ikke oplyst" dæmpet.
                         Aldrig en tom kolonne, aldrig en stribe "–".

   Og dét referencen ikke gør: kolonnerne står PÅ LINJE på tværs af rækker.
   Bilbasens listevisning er kortet lagt ned, så km står tre forskellige
   steder afhængigt af hvor lang titlen var. Her kan man køre lodret ned ad
   kilometerkolonnen og sammenligne tolv motorcykler uden at læse et ord. */

/* Salgsmarkører hører ikke til i en titel. De er sælgerens vilkår, ikke
   maskinens navn, og de fylder halvdelen af linjen på en forhandlerannonce.
   Listen er de vendinger, MC Syds katalog rent faktisk bruger.

   NÅR CRAWLEREN LEVERER DEM SOM EGET FELT: sæt l.salgsmarkoerer (array) og
   l.variant, så bruger deltTitel() dem direkte og springer gætteriet over.
   Det er den ENESTE funktion, der skal ændres. */
const SALGSMARKOERER = [
  'ENGROS', 'UDEN KLARGØRING', 'MED KLARGØRING', 'UDEN GARANTI', 'MED GARANTI',
  'BYTTER GERNE', 'BYTTE MULIGT', 'FAST PRIS', 'NYSYNET', 'SOLGT', 'RESERVERET',
  'DEMO', 'DEMOCYKEL', 'KAMPAGNE', 'TILBUD', 'FINANSIERING', 'LEASING', 'INDBYTTET',
];

/* Deler "XV 750 Cruiser Virago ENGROS/UDEN KLARGØRING" i:
     model    "XV 750"            (fed, kort — det man scanner efter)
     variant  "Cruiser Virago"    (dæmpet linje 2)
     markers  ["ENGROS", "UDEN KLARGØRING"]

   Modellen ender ved det sidste tal plus et efterfølgende kort typebogstav,
   fordi det er sådan mc-modelnavne er skruet sammen: CBR 1000 F, R 1200 GS,
   XL 1200 N. Uden bogstavet ville "CBR 1000" og "CBR 1000 F" ligne det
   samme, og det er to forskellige motorcykler. */
function deltTitel(l){
  const brand = String(l.brand || '').trim();
  let rest = String(l.model || '').trim();

  // Kilden gentager tit mærket i titlen: "Yamaha Yamaha XV 750".
  if (brand && rest.toLowerCase().startsWith(brand.toLowerCase())){
    rest = rest.slice(brand.length).trim();
  }

  let markers = Array.isArray(l.salgsmarkoerer) ? l.salgsmarkoerer.slice() : [];
  if (!markers.length){
    // SALGSMARKOERER er en fast liste af almindelige ord — ingen
    // regex-tegn at undslippe. Kommer der en værdi udefra en dag, SKAL den
    // escapes her først.
    for (const m of SALGSMARKOERER){
      const re = new RegExp(`(^|[\\s/,-])${m}([\\s/,-]|$)`, 'i');
      if (re.test(rest)){ markers.push(m); rest = rest.replace(re, ' ').trim(); }
    }
  }
  rest = rest.replace(/[\s/,\-]+$/, '').replace(/^[\s/,\-]+/, '').replace(/\s{2,}/g, ' ');

  if (typeof l.variant === 'string' && l.variant.trim()){
    return { model: [brand, rest].filter(Boolean).join(' '), variant: l.variant.trim(), markers };
  }

  const ord = rest.split(/\s+/).filter(Boolean);
  let skaer = Math.min(ord.length, 2);
  const sidsteTal = ord.reduce((idx, o, i) => (/^\d{2,4}$/.test(o) && i < 4 ? i : idx), -1);
  if (sidsteTal >= 0){
    skaer = sidsteTal + 1;
    // Typebogstavet lige efter tallet hører med: GS, F, RS, R, SE.
    if (ord[skaer] && /^[A-ZÆØÅ]{1,2}$/.test(ord[skaer])) skaer++;
  }
  return {
    model: [brand, ord.slice(0, skaer).join(' ')].filter(Boolean).join(' '),
    variant: ord.slice(skaer).join(' '),
    markers,
  };
}

/* Her stod koerekortSikkert(): et værn mod at koerekortForListing() læste
   ukendt effekt som 0 hk og derfor kaldte en 1200 ccm maskine "A2".

   Fejlen er rettet i kilden (js/data.js), og værnet gentog derefter reglerne
   uden at ændre et eneste svar — begge blev kørt, og resultatet var det samme
   i alle tilfælde. Så er det ikke længere et sikkerhedsnet, det er en anden
   kopi af færdselsloven, der kan komme til at sige noget andet end den
   første. Det var præcis dét, der lod fejlen opstå: kommentaren i data.js
   advarede mod A2-gættet, mens koden lige nedenunder lavede det.

   Reglerne bor ét sted. Listen spørger direkte — kaldstederne kalder
   koerekortForListing(), og der er ingen alias tilbage at forveksle den med. */

/* VISNINGENS tomme celle. Hed tidligere UOPLYST og kolliderede med filtrenes
   UOPLYST-symbol længere nede — to agenter, samme ord, to helt forskellige
   ting. Git flettede begge uden konflikt, og resultatet var ugyldigt
   JavaScript: "Identifier 'UOPLYST' has already been declared". Hele
   js/search.js stoppede med at indlæse, og søgesiden blev en tom skal.

   Navnene siger nu hvad de er: det her er en celle, det andet er et svar.

   Fodnote til den, der undrer sig over historikken: fejlen blev fundet og
   rettet TO gange uafhængigt, på hver sin gren, med hvert sit navn
   (UOPLYST_CELLE og UOPLYST_HTML). Ved sammenfletningen vandt CELLE, fordi
   det parrer med symbolets rolle som svar. Det er samme slags kollision én
   gang til — to rettelser af samme fejl, der ikke kunne se hinanden. */
const UOPLYST_CELLE = '<span class="row-unknown">Ikke oplyst</span>';

/* Kategorien kommer fra koerekortMaerkat() og ikke fra
   koerekortForListing() direkte.

   Builder 5 fandt aarsagen til 99 forkerte maerkater: eksternKoerekort()
   i js/components.js var en ANDEN, selvstaendig udgave af koerekortreglen,
   og den skrev "mindst A2" paa annoncer, filteret afviste for A2.
   koerekortMaerkat() er nu det ene sted, et maerkat bliver til: den
   spoerger koerekortForListing() og kontrollerer DEREFTER svaret mod
   passerKoerekort(), saa listen og filteret ikke kan sige hver sit.
   Kaldene her var ikke forkerte — men de var en fjerde indpakning om
   den samme regel, og en fjerde indpakning er praecis maaden, de 99
   opstod paa. */
function rowSpecsHTML(l){
  const kk = koerekortMaerkat(l).kode;
  const motor = l.ccm == null
    ? UOPLYST_CELLE
    : escapeHTML(formatCcm(l.ccm)) + (l.power ? ` <span class="row-hk">· ${escapeHTML(formatPower(l.power))}</span>` : '');
  const celle = (label, vaerdi) => `<div class="row-spec"><dt>${label}</dt><dd>${vaerdi}</dd></div>`;
  return `<dl class="row-specs">
    ${celle('Årgang', l.year == null ? UOPLYST_CELLE : escapeHTML(String(l.year)))}
    ${celle('Kilometer', l.km == null ? UOPLYST_CELLE : escapeHTML(formatKm(l.km)))}
    ${celle('Motor', motor)}
    ${celle('Kørekort', kk ? `<span class="row-kk">${kk}</span>` : UOPLYST_CELLE)}
  </dl>`;
}

function rowMarkersHTML(markers){
  if (!markers || !markers.length) return '';
  return `<span class="row-markers">${markers.slice(0, 2).map(m =>
    `<span class="row-marker">${escapeHTML(m.toLowerCase())}</span>`).join('')}</span>`;
}

/* Indekseret annonce som listerække.

   Samme løfter som kortet i js/components.js, og de er ikke til forhandling,
   fordi rækken er smallere: mærket "Hos <kilde>" står først i rækken, kildens
   navn står hvor sælgeren ellers står, og der er intet hjerte — favoritter
   peger på vores egne annoncer med en fremmednøgle.

   Rækkefladen gik før til KILDEN. Den går nu til vores egen annonceside, af
   samme grund som kortet (se blokken over externalCardHTML i
   js/components.js): den side findes, den er god, og den var uopnåelig for
   87 % af lageret. "Se hos <kilde>" stod en overgang som sit eget lille link
   i rækkens højre ende — det var stadig en genvej uden om vores egen side, og
   den er væk. Vejen ud af sitet findes ét sted: knappen på annoncesiden. */
function externalRowHTML(l, i){
  const kilde = escapeHTML(l.source?.navn || 'ekstern kilde');
  const href = sikkerUrl(l.externalUrl);
  if (!href) return '';
  const t = deltTitel(l);
  const model = escapeHTML(t.model), variant = escapeHTML(t.variant);
  const sted = [l.city, l.postnr].filter(Boolean).map(escapeHTML).join(' ');
  return `
  <article class="listing-row is-external" data-listing-id="${l.id}" data-external="1">
    <div class="row-media">${listingMediaHTML(l, t.model, i === 0)}</div>
    <div class="row-head">
      <div class="row-flags">
        <span class="badge badge-external" title="Annoncen ligger hos ${kilde}. Bikerbasen viser den, men handlen sker hos kilden.">${Icon.externalLink}Hos ${kilde}</span>
        ${rowMarkersHTML(t.markers)}
      </div>
      <h3 class="row-title">${model}</h3>
      ${variant ? `<p class="row-variant">${variant}</p>` : ''}
      <p class="row-origin">${Icon.store}<b>${kilde}</b>${l.source?.domaene ? `<span class="row-dim">${escapeHTML(l.source.domaene)}</span>` : ''}
        <span class="row-dim">${Icon.mapPin}${sted || 'Sted ikke oplyst'}</span></p>
    </div>
    ${rowSpecsHTML(l)}
    <div class="row-end">
      <p class="row-price">${escapeHTML(formatPrice(l.price))}</p>
      <div class="row-tools">
        <button type="button" class="row-tool ${Store.isComparing(l.id)?'active':''}" data-compare-toggle="${l.id}" aria-pressed="${Store.isComparing(l.id)}" title="Sammenlign" aria-label="Tilføj til sammenligning">${Icon.chart}</button>
      </div>
    </div>
    <a href="annonce.html?id=${l.id}" class="row-link"
       aria-label="Se annonce: ${[model, variant].filter(Boolean).join(' ')}, ${escapeHTML(formatPrice(l.price))} — hos ${kilde}"></a>
  </article>`;
}

function listingRowHTML(l, i){
  if (l.isExternal) return externalRowHTML(l, i);
  const fav = Store.isFavorite(l.id);
  const t = deltTitel(l);
  const model = escapeHTML(t.model), variant = escapeHTML(t.variant);
  const dealer = l.isDealer || l.seller?.isDealer;
  const sted = [l.city, l.region].filter(Boolean).map(escapeHTML).join(', ');
  return `
  <article class="listing-row" data-listing-id="${l.id}">
    <div class="row-media">${listingMediaHTML(l, t.model, i === 0)}</div>
    <div class="row-head">
      <div class="row-flags">
        ${isNewListing(l.createdAt) ? `<span class="badge badge-new">Ny</span>` : ''}
        ${dealer ? `<span class="badge badge-dealer">${Icon.store}Forhandler</span>` : ''}
        ${isSuspiciouslyCheap(l) ? `<span class="badge badge-warning" title="Prisen ligger væsentligt under markedsniveau for den type og årgang — bed om ekstra dokumentation, og betal aldrig forud">${Icon.alertTriangle}Under markedspris</span>` : ''}
        ${l.serviceHistorik === 'Fuld' ? `<span class="badge badge-verified">${Icon.shieldCheck}Fuld servicehistorik</span>` : ''}
        ${rowMarkersHTML(t.markers)}
      </div>
      <h3 class="row-title">${model}</h3>
      ${variant || l.type ? `<p class="row-variant">${variant || escapeHTML(typeLabel(l.type))}</p>` : ''}
      <p class="row-origin">${dealer ? Icon.store : Icon.user}<b>${escapeHTML(dealer ? (l.seller?.name || 'Forhandler') : 'Privat sælger')}</b>
        <span class="row-dim">${Icon.mapPin}${sted || 'Sted ikke oplyst'}</span></p>
    </div>
    ${rowSpecsHTML(l)}
    <div class="row-end">
      <p class="row-price">${escapeHTML(formatPrice(l.price))}</p>
      <p class="row-when">${escapeHTML(timeAgoDa(l.createdAt))}</p>
      <div class="row-tools">
        ${isOwnListing(l) ? '' : `<button type="button" class="row-tool row-fav ${fav?'active':''}" aria-pressed="${fav}" aria-label="Gem annonce" data-fav-toggle="${l.id}">${Icon.heart}</button>`}
        <button type="button" class="row-tool ${Store.isComparing(l.id)?'active':''}" data-compare-toggle="${l.id}" aria-pressed="${Store.isComparing(l.id)}" title="Sammenlign" aria-label="Tilføj til sammenligning">${Icon.chart}</button>
      </div>
    </div>
    <a href="annonce.html?id=${l.id}" class="row-link" aria-label="Se annonce: ${[model, variant].filter(Boolean).join(' ')}, ${escapeHTML(formatPrice(l.price))}"></a>
  </article>`;
}

/* ============ Resultatlinjen: hvad består tallet af? ============

   "383 annoncer fundet" er sandt og alligevel misvisende. 332 af dem ligger
   ikke hos os. De er indekseret hos en forhandler, og køberen skal videre
   til kilden for at handle — der er ingen beskedknap, ingen sælgerprofil og
   ingen historik hos os. Et tal, der skjuler dét, lover et lager vi ikke har.

   Formuleringen gør ikke de indekserede små. Det ER rigtige motorcykler til
   salg, og for en køber er 332 ekstra maskiner udelukkende en fordel.
   Forskellen er HVOR handlen foregår, ikke hvor gode annoncerne er. Derfor
   "på Bikerbasen" og "indekseret hos MC Syd": to steder, ikke to klasser.
   Ingen af ordene er en undskyldning. */
function resultatSammensaetning(list){
  const kilder = new Map();
  let egne = 0;
  for (const l of list){
    if (!l.isExternal){ egne++; continue; }
    const navn = l.source?.navn || 'ekstern kilde';
    kilder.set(navn, (kilder.get(navn) || 0) + 1);
  }
  return { egne, eksterne: list.length - egne, kilder };
}

function forklarIndekseret(){
  const navne = [...resultatSammensaetning(getFilteredListings()).kilder.keys()].map(escapeHTML);
  openInfoModal('Hvor kommer annoncerne fra?', `
    <p><b>Annoncer på Bikerbasen</b> er oprettet her. Du skriver til sælgeren
    gennem os, du kan gemme dem som favorit, og hele annoncen ligger på vores side.</p>
    <p style="margin-top:12px;"><b>Indekserede annoncer</b> er rigtige motorcykler til salg,
    som ligger hos en forhandler${navne.length ? ' — lige nu ' + navne.join(' og ') : ''}.
    Vi viser dem, så du kan søge på tværs i ét felt, men annoncen hører til hos
    forhandleren: klikker du på den, åbner den hos kilden i en ny fane, og det er
    dér, du kontakter sælgeren og ser resten af billederne.</p>
    <p style="margin-top:12px;">Pris, årgang og kilometertal er læst fra forhandlerens
    egen annonce. Står der "Ikke oplyst", er det fordi feltet ikke fremgår hos kilden —
    vi gætter ikke.</p>`);
}

function renderResultsCount(list){
  const total = list.length;
  document.getElementById('results-count').innerHTML =
    `${total} <span>${total === 1 ? 'annonce' : 'annoncer'}<span class="results-count-fundet"> fundet</span></span>`;

  const mix = document.getElementById('results-mix');
  if (!mix) return;
  const { egne, eksterne, kilder } = resultatSammensaetning(list);

  // Ingen indekserede i resultatet: så er der ingen sammensætning at
  // forklare, og linjen er ren støj.
  if (!eksterne){ mix.hidden = true; mix.innerHTML = ''; return; }

  const sorteret = [...kilder.entries()].sort((a, b) => b[1] - a[1]);
  /* Runde 6 (D6-S5): "indekseret: 332 hos MC Syd · 118 hos Gul og Gratis · 98
     hos 2 andre" — ordet én gang, og resten som et tal, der kan taelles efter
     (548 − 332 − 118). Foer ombroed "+2 kilder" til sin egen linje. */
  const restN = sorteret.slice(2).reduce((a, [, n]) => a + n, 0);
  const kildeTekst = 'indekseret: ' + sorteret.slice(0, 2)
    .map(([navn, n]) => `${n} hos ${escapeHTML(navn)}`).join(' · ');
  const flere = sorteret.length > 2 ? ` · ${restN} hos ${sorteret.length - 2} ${sorteret.length - 2 === 1 ? 'anden' : 'andre'}` : '';
  const egneTekst = egne
    ? `<span class="mix-part mix-egne">${egne} ${egne === 1 ? 'annonce' : 'annoncer'} på Bikerbasen</span>`
    : '';

  /* (i)-knappen ligger i en .mix-tail SAMMEN med kildeleddet, og det er ikke
     pynt. Linjen er en flex med wrap, og på 390px målte kritikeren knappen
     som en fjerde linje HELT for sig selv: de to led fyldte præcis bredden,
     og de sidste 22px havde ingen plads. Et spørgsmålstegnsikon alene på en
     linje forklarer ingenting — man kan ikke se, hvad det spørger om.
     Bundet sammen wrapper leddet og knappen som ét, så (i) altid står ved
     "332 indekseret hos MC Syd", som er dét, den åbner forklaringen på. */
  mix.hidden = false;
  // Runde 5 (D5-S1): to udgaver i markuppen, css vaelger pr. bredde — den
  // lange ("332 indekseret hos MC Syd · 118 hos Gul og Gratis · +2 kilder")
  // paa desktop, den korte ("fra 4 kilder") paa mobil. Begge er sande og kan
  // taelles efter; (i) aabner fordelingen begge steder.
  const antalKilder = sorteret.length;
  // Runde 6 (D6-S2): paa mobil staar den korte udgave paa SAMME linje som
  // "548 annoncer" — derfor uden tallet: "· fra 4 kilder (i)".
  const kort = `fra ${antalKilder} ${antalKilder === 1 ? 'kilde' : 'kilder'}`;
  mix.innerHTML = `${egneTekst}<span class="mix-tail">` +
    `<span class="mix-part mix-ekstern"><span class="mix-lang">${kildeTekst}${flere}</span><span class="mix-kort">· ${kort}</span></span>` +
    `<button type="button" class="mix-info" id="mix-info-btn" title="Hvad betyder indekseret?" aria-label="Hvad betyder det, at en annonce er indekseret?">${Icon.info}</button>` +
    `</span>`;
  mix.querySelector('#mix-info-btn').addEventListener('click', forklarIndekseret);
}

/* ============ Swipe-visning (mobil-first, à la 123mc-appen) ============ */
let swipeItems = [];
let swipeIndex = 0;

function swipeCardHTML(l, stackPos){
  const brand = escapeHTML(l.brand), model = escapeHTML(l.model);
  const loc = escapeHTML(l.city || l.region || '');
  const k = koerekortMaerkat(l).kode;
  return `
  <article class="swipe-card" data-stack="${stackPos}" style="--stack:${stackPos}">
    <div class="swipe-card-media">
      ${listingMediaHTML(l, `${brand} ${model}`)}
      <span class="swipe-stamp swipe-stamp-fav">Gem</span>
      <span class="swipe-stamp swipe-stamp-skip">Spring over</span>
      ${l.isDealer ? `<span class="badge badge-dealer swipe-card-flag">${Icon.shieldCheck}Forhandler</span>` : ''}
      ${k ? `<span class="card-koerekort swipe-card-kk">${k}</span>` : ''}
    </div>
    <div class="swipe-card-body">
      <div class="swipe-card-price">${formatPrice(l.price)}</div>
      <h3 class="swipe-card-title">${brand} ${model}</h3>
      <div class="swipe-card-meta"><span>${Icon.calendar}${l.year}</span><span>${Icon.gauge}${formatKm(l.km)}</span><span>${Icon.engine}${formatCcm(l.ccm)}</span></div>
      <div class="swipe-card-loc">${Icon.mapPin}${loc}</div>
    </div>
  </article>`;
}

function mountSwipeDeck(){ swipeItems = getFilteredListings(); swipeIndex = 0; renderSwipeDeck(); }

function renderSwipeDeck(){
  const deck = document.getElementById('swipe-deck');
  if (!deck) return;
  if (!swipeItems.length){
    deck.innerHTML = `<div class="swipe-empty">${Icon.search}<h3>Ingen annoncer at swipe</h3><p>Justér dine filtre og prøv igen.</p></div>`;
    return;
  }
  if (swipeIndex >= swipeItems.length){
    deck.innerHTML = `<div class="swipe-empty">${Icon.checkCircle}<h3>Du har set alle ${swipeItems.length}</h3><p>Dine gemte annoncer ligger under Favoritter.</p><button type="button" class="btn btn-outline btn-sm" id="swipe-restart">Start forfra</button></div>`;
    document.getElementById('swipe-restart').addEventListener('click', () => { swipeIndex = 0; renderSwipeDeck(); });
    return;
  }
  const stack = swipeItems.slice(swipeIndex, swipeIndex + 3);
  deck.innerHTML = `
    <div class="swipe-progress" aria-live="polite">${swipeIndex + 1} / ${swipeItems.length}</div>
    <div class="swipe-stack">${stack.map((l, i) => swipeCardHTML(l, i)).join('')}</div>
    <div class="swipe-actions">
      <button type="button" class="swipe-act swipe-act-skip" aria-label="Spring over">${Icon.close}</button>
      <a class="swipe-act swipe-act-open" href="annonce.html?id=${swipeItems[swipeIndex].id}" aria-label="Åbn annonce">${Icon.arrowRight}</a>
      <button type="button" class="swipe-act swipe-act-fav" aria-label="Gem annonce">${Icon.heart}</button>
    </div>
    <p class="swipe-hint-text">Træk til højre for at gemme · til venstre for at springe over</p>`;
  wireSwipeGestures();
}

function advanceSwipe(fav){
  const cur = swipeItems[swipeIndex];
  if (fav && cur && !Store.isFavorite(cur.id)){ Store.toggleFavorite(cur.id); if (typeof updateFavCount === 'function') updateFavCount(); toast('Gemt i favoritter'); }
  swipeIndex++;
  renderSwipeDeck();
}

function flingCard(card, dir){
  if (!card) return;
  card.style.transition = 'transform .32s var(--ease-out), opacity .30s';
  card.style.transform = `translate(${dir === 'right' ? 140 : -140}%, 40px) rotate(${dir === 'right' ? 18 : -18}deg)`;
  card.style.opacity = '0';
  setTimeout(() => advanceSwipe(dir === 'right'), 190);
}

function wireSwipeGestures(){
  const deck = document.getElementById('swipe-deck');
  const top = deck.querySelector('.swipe-card[data-stack="0"]');
  deck.querySelector('.swipe-act-skip')?.addEventListener('click', () => flingCard(top, 'left'));
  deck.querySelector('.swipe-act-fav')?.addEventListener('click', () => flingCard(top, 'right'));
  if (!top) return;
  let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false;
  top.addEventListener('pointerdown', (e) => {
    dragging = true; startX = e.clientX; startY = e.clientY; dx = dy = 0;
    top.style.transition = 'none'; top.setPointerCapture?.(e.pointerId);
  });
  top.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dx = e.clientX - startX; dy = e.clientY - startY;
    top.style.transform = `translate(${dx}px, ${dy * 0.35}px) rotate(${dx / 18}deg)`;
    top.classList.toggle('show-fav', dx > 45);
    top.classList.toggle('show-skip', dx < -45);
  });
  const end = () => {
    if (!dragging) return; dragging = false;
    if (dx > 110) return flingCard(top, 'right');
    if (dx < -110) return flingCard(top, 'left');
    top.style.transition = 'transform .25s var(--ease-out)';
    top.style.transform = ''; top.classList.remove('show-fav', 'show-skip');
  };
  top.addEventListener('pointerup', end);
  top.addEventListener('pointercancel', end);
}

/* Kørekort og pris opfører sig som en radioknap-gruppe (kun én ad gangen),
   men er implementeret som knapper, der kan sættes til INTET valgt (i
   modsætning til en rigtig HTML-radioknap, der ikke selv kan slås fra) —
   se wireFilterControls: et klik på den allerede valgte rydder filteret.
   Roving tabindex følger samme regel som en rigtig radiogruppe: den valgte
   chip (eller nummer ét, hvis ingen er valgt) er den ENESTE, Tab stopper
   ved. Pil-tasterne (wireRadioGroupNavigation) flytter både fokus OG valg
   mellem resten, ligesom en browsers indbyggede radioknapper gør. */
function syncRadioChips(chips, erValgt){
  const liste = Array.from(chips);
  const nogenValgt = liste.some(erValgt);
  liste.forEach((ch, i) => {
    const valgt = erValgt(ch);
    ch.classList.toggle('active', valgt);
    ch.setAttribute('aria-checked', String(valgt));
    ch.tabIndex = valgt ? 0 : (!nogenValgt && i === 0 ? 0 : -1);
  });
}

/* Spejler state ned i de kontroller der først findes, når panelet er bygget. */
function reflectFilterPanel(){
  document.querySelectorAll('#filter-types .chip').forEach(chip => {
    const valgt = state.types.includes(chip.dataset.type);
    chip.classList.toggle('active', valgt);
    chip.setAttribute('aria-pressed', String(valgt));
  });
  // Kørekort og pris er radioknap-grupper (se kommentaren i
  // populateFilterUI): aria-checked erstatter aria-pressed, og roving
  // tabindex sikrer, at Tab kun stopper ÉT sted i hver gruppe (den valgte,
  // eller den første, hvis ingen er valgt) — pilene flytter resten, se
  // wireRadioGroupNavigation().
  syncRadioChips(document.querySelectorAll('#filter-koerekort .chip'),
    ch => state.koerekort === ch.dataset.koerekort);
  syncRadioChips(document.querySelectorAll('#filter-price-quick .chip'),
    ch => erAktivtPrisinterval(ch.dataset.pris));
  document.querySelectorAll('#filter-brands input[data-brand]').forEach(cb => {
    cb.checked = state.brands.includes(cb.dataset.brand);
  });
  // Skal stå EFTER afkrydsningen: et valgt mærke må ikke være foldet væk.
  opdaterMaerkeliste();
  renderModelFilter();
  document.querySelectorAll('#filter-regions input').forEach(cb => {
    cb.checked = state.regions.includes(cb.dataset.region);
  });
  document.querySelectorAll('#filter-conditions input').forEach(cb => {
    cb.checked = state.conditions.includes(cb.dataset.condition);
  });
  document.querySelectorAll('#filter-service input').forEach(cb => {
    cb.checked = state.service.includes(cb.dataset.service);
  });
  document.querySelectorAll('#filter-equipment input').forEach(cb => {
    cb.checked = state.equipment.includes(cb.dataset.equipment);
  });
  document.querySelectorAll('#filter-colors input').forEach(cb => {
    cb.checked = state.colors.includes(cb.dataset.color);
  });
}

function reflectStateToUI(){
  /* Panelets egne kontroller findes kun når panelet er bygget. Er det ikke,
     springes hele blokken over — ensureFiltersBuilt kalder reflectStateToUI
     igen umiddelbart efter, så et filter fra URL'en aldrig går tabt. */
  if (filtersBuilt) reflectFilterPanel();
  const qInput = document.getElementById('filter-q');
  if (qInput && qInput.value !== state.q) qInput.value = state.q;
  const qClear = document.getElementById('filter-q-clear');
  if (qClear) qClear.hidden = !state.q;
  document.querySelectorAll('.dual-range').forEach(el => el._sync && el._sync());
  document.getElementById('filter-photos-only').checked = state.photosOnly;
  document.getElementById('filter-dealer-only').checked = state.dealerOnly;
  document.getElementById('filter-nysynet').checked = state.nysynet;
  document.getElementById('filter-vinter').checked = state.vinterklar;
  document.getElementById('filter-age').value = state.maxAgeDays || '';
  document.getElementById('filter-price-min').value = state.priceMin || '';
  document.getElementById('filter-price-max').value = state.priceMax || '';
  document.getElementById('filter-year-min').value = state.yearMin || '';
  document.getElementById('filter-year-max').value = state.yearMax || '';
  document.getElementById('filter-km-max').value = state.kmMax || '';
  document.getElementById('filter-ejere-max').value = state.ejereMax || '';
  document.getElementById('filter-ccm-min').value = state.ccmMin || '';
  document.getElementById('filter-ccm-max').value = state.ccmMax || '';
  document.getElementById('filter-hk-min').value = state.hkMin || '';
  document.getElementById('filter-hk-max').value = state.hkMax || '';
  document.getElementById('sort-select').value = state.sort;
}

/* ================= Filtreringen bor i js/filtrering.js =================

   HER stod `UOPLYST`, `filtrerMedUoplyst()`, `koerekortSvar()` og
   `anvendFiltre()` — cirka 190 linjer. De er IKKE slettet: builder 1
   flyttede dem ordret ud i `js/filtrering.js`, saa forsidens soegekort og
   denne side kan stille det samme spoergsmaal til det samme lager og faa
   det samme svar. Hele begrundelsen, og de tre gange fejlen kom igen,
   staar i filens hoved og i work/DECISIONS.md under "Ét filterhus".

   Indtil nu havde de to sider hver sin kopi. De var ENIGE — builder 1
   maalte 40 filterkombinationer uden én uenighed — men to kopier, der er
   enige i dag, er ikke to sider, der ikke KAN vaere uenige. Det er samme
   sygdom som de 99 forkerte koerekortmaerkater, builder 5 lige har lukket:
   én regel, skrevet ned to steder.

   `state` er nu et ARGUMENT i stedet for en modulvariabel — det er den
   eneste forskel paa signaturen:
     Filtrering.anvendFiltre(alle, state, spring, opsamler)

   RAEKKEFOELGEN I KAEDEN ER EN DEL AF SVARET. En annonce fjernes ved det
   FOERSTE filter, der ikke kan svare for den, og taelles derfor kun én
   gang — det er dét, der goer, at tallene i `opsamler` maa laegges sammen.
   Skal et nyt filter tilfoejes, hoerer det til i js/filtrering.js, ikke
   her, og saa virker det begge steder med det samme feltnavn.

   `js/filtrering.js` loades i soegning.html EFTER js/data.js (den bruger
   passerKoerekort og hkEllerNull) og FOER js/search.js. */

/* Hvor mange annoncer det enkelte filter har skjult, fordi oplysningen
   manglede. Nulstilles ved hver koersel af getFilteredListings(). */
let uoplystSkjult = [];

/* Kaldes 8-10 gange pr. maling (facettaellingen alene koerer kaeden seks
   gange), saa den korte form er her frem for i hvert kaldested. */
function anvendFiltre(alle, spring, opsamler){
  return Filtrering.anvendFiltre(alle, state, spring, opsamler);
}
const koerekortSvar = Filtrering.koerekortSvar;
/* ============ Standardsorteringen: "Blandet udbud" ============
   Flyttet til js/sortering.js (B4, 23.08.2026), saa scripts/build-srp.js kan
   forudtegne soegesidens foerste side i PRAECIS den raekkefoelge, browseren
   selv ender med — samme funktion, samme data. Navnene beholdes her, saa
   resten af filen er uaendret. Forklaringen paa reglerne (oplysthed,
   fordeling af annoncer uden foto, midtpunktsudtagning) staar i den fil. */
const { harFoto, annonceOplysthed, blandetRaekkefoelge } = Sortering;

/* ---------- Rækkefølgen skrevet på siden ----------

   Halvdelen af rettelsen. Et navn på tre ord kan ikke bære to regler, og en
   sortering, hvis regel man ikke kan læse, er ikke forudsigelig — dét er
   et af de fire spørgsmål under Findbarhed i bar/RUBRIC.md.

   Linjen står kun, når "Blandet udbud" er valgt OG der faktisk er noget at
   blande (begge grupper har annoncer). Filtrerer man ned til 14 annoncer,
   der alle mangler foto, er der ingen fordeling at forklare — så er
   rækkefølgen ren oplysthed, og linjen ville være støj.

   Tallene er talt på det resultat, der står på skærmen. Ingen af dem er
   skrevet i hånden: skifter lageret sammensætning, skifter sætningen med. */
/* Hele reglen, med begge led og med forbeholdet. Den står i en (i) og ikke
   på linjen, fordi linjen skal kunne læses på en telefon uden at koste fire
   linjer over den første pris — men den skal FINDES, ellers er navnet på
   sorteringen igen et løfte, man ikke kan efterprøve. */
function forklarSortering(){
  openInfoModal('Sådan er rækkefølgen sat', `
    <p><b>Blandet udbud</b> deler resultatet i to: annoncer med foto og
    annoncer uden. De uden foto fordeles jævnt ud over listen, så deres andel
    af hver side svarer til deres andel af hele resultatet. Alternativet ville
    være en første side med enten kun fotos eller kun grå felter — og ingen af
    delene ligner det lager, siden påstår at vise.</p>
    <p style="margin-top:12px;">Inden for <i>hver af de to grupper</i> står de
    annoncer først, der svarer på flest af dine spørgsmål: pris, kilometertal
    og kørekortkategori vejer tungest, derefter årgang, kubik, hk, stand og en
    rigtig beskrivelse. Der gives kun point for felter, kilden faktisk har
    oplyst — aldrig for et gæt.</p>
    <p style="margin-top:12px;">Blandt annoncer med <i>lige mange</i> oplyste
    felter skiftes der mellem kilderne — én fra hver forhandler eller
    markedsplads efter tur, så længe kilden har flere i den klasse. Så ligner
    side 1 hele lageret og ikke den største kildes katalog. Inden for kildens
    egen kø afgør datoen og derefter annoncens id rækkefølgen, så det samme
    link altid giver den samme liste.</p>`);
}

/* Sætningen over resultaterne. Runde 2 skrev BEGGE regler her, og de to
   modsagde hinanden på skærmen: kort nr. 4 var uden foto og manglede hk, og
   kunne altså ikke være et af dem med "flest oplyste felter". Det var ikke
   udregningen, der var gal — det var sætningen, der udelod, at oplystheden
   kun rangerer INDEN FOR hver af de to grupper. Linjen siger nu kun det, man
   kan tælle efter på skærmen; resten står i (i). */
function renderSorteringsNote(sideItems, heleResultatet){
  const el = document.getElementById('sortering-note');
  if (!el) return;

  const udenIAlt = heleResultatet.filter(l => !harFoto(l)).length;
  const udenPaaSiden = sideItems.filter(l => !harFoto(l)).length;
  /* Runde 5 (D5-S6): (i) staar fast i .sort-felt (soegning.html) og ikke
     laengere inde i notelinjen — saa forklaringen er der, ogsaa naar linjen er
     skjult. Den vises, naar der er noget at forklare (blandet/date-desc). */
  const fastInfo = document.getElementById('sortering-info-btn');
  if (fastInfo && !fastInfo.dataset.klar){ fastInfo.dataset.klar = '1'; fastInfo.innerHTML = Icon.info; fastInfo.addEventListener('click', forklarSortering); }
  if (fastInfo) fastInfo.hidden = !(state.sort === 'blandet' || state.sort === 'date-desc');
  const infoKnap = '';

  /* "Nyeste først" er den anden sortering, der har brug for en linje — og
     det er den vigtigste af de to. 332 af 383 annoncer har ingen
     oprettelsesdato (de indekserede; vi kender ikke datoen hos kilden og
     gætter den ikke), så valget lægger de 51 med dato øverst og alle de
     andre bagefter. Uden linjen ser side 1 ud som en fejl: overskriften
     siger 383, og hvert eneste kort er en annonce uden foto. Med linjen er
     det en oplysning om lageret. */
  if (state.sort === 'date-desc'){
    const medDato = heleResultatet.filter(l => l.createdAt).length;
    if (!medDato || medDato === heleResultatet.length){ el.hidden = true; return; }
    el.hidden = false;
    /* C5 (23.08.2026): én linje paa en telefon. Maalt paa 390 px: den gamle
       sætning brugte tre linjer (ca. 55 px) mellem sorteringsvælgeren og det
       foerste kort. Tallene staar stadig — de kan taelles paa skaermen — og
       HVORFOR de udaterede staar bagest, staar i (i), hvor det hoerer til. */
    el.innerHTML = `Nyeste først: ${medDato} af ${heleResultatet.length} har en dato og står øverst — `
      + `resten uden dato bagefter.${infoKnap}`;
    return;
  }

  const blandes = state.sort === 'blandet'
    && udenIAlt > 0 && udenIAlt < heleResultatet.length;
  if (!blandes){ el.hidden = true; return; }

  /* Runde 5 (D5-S6): linjen begrunder sig selv med, at fordelingen er den ene
     regel, man kan EFTERPROEVE paa skaermen — paa en side med 0 kort uden foto
     kan den ikke. Saa skjules den dér; (i) i .sort-felt har stadig reglen. */
  if (udenPaaSiden === 0){ el.hidden = true; return; }
  el.hidden = false;
  /* C5 (23.08.2026): én linje paa en telefon (maalt 390 px: 41 px -> ~17 px
     over det foerste kort). Begge tal kan stadig taelles efter paa skaermen;
     reglen i sin helhed staar i (i) — se forklarSortering(). */
  el.innerHTML = `Blandet udbud: ${udenIAlt} uden foto fordelt jævnt — `
    + `${udenPaaSiden} på denne side.${infoKnap}`;
}

function getFilteredListings(){
  uoplystSkjult = [];
  const list = anvendFiltre(Store.getAllListings(), null, uoplystSkjult);
  /* Sorteringen ligger i js/sortering.js (samme kode, flyttet i B4) — se
     Sortering.sorter(): ukendt vaerdi bagest, "blandet" som fordeling over
     hele listen, "date-desc" med de udaterede ordnet som blandet bagefter. */
  return Sortering.sorter(list, state.sort);
}

/* ---------- "X annoncer er ikke vist" ----------

   Halvdelen af rettelsen. At udelade en annonce, vi ikke ved nok om, er
   rigtigt; at gøre det uden at sige det er præcis den fejl, vi kom fra —
   brugeren så et resultattal falde og kunne ikke skelne "der findes ikke
   flere" fra "der er flere, vi bare ikke kender standen på".

   Linjen står lige under filterpillerne og over resultattallet, altså dér
   hvor man kigger, når man lige har sat et filter og undrer sig over tallet.

   Elementet bygges her i JS frem for i soegning.html, og stilen sættes med
   designtokens inline: css/styles.css og markuppen har andre ejere lige nu,
   og en ny regel dér ville kollidere. Flyttes den til en klasse senere, er
   det bare at fjerne cssText-linjen. */
function renderUoplystNote(){
  let el = document.getElementById('uoplyst-note');
  if (!el){
    const anker = document.getElementById('active-filters');
    if (!anker) return;
    el = document.createElement('p');
    el.id = 'uoplyst-note';
    // aria-live: linjen dukker op som følge af et filterklik, uden at
    // flytte fokus. Uden den ville skærmlæserbrugere høre resultattallet
    // falde og aldrig få forklaringen.
    el.setAttribute('role', 'status');
    el.style.cssText = 'margin:0 0 var(--space-4); padding:10px 14px;'
      + 'border:1px solid var(--color-border); border-radius:var(--radius-sm);'
      + 'background:var(--color-surface-2); color:var(--color-fg-muted);'
      + 'font-size:14px; line-height:1.45;';
    anker.after(el);
  }

  /* Opgoerelsen — hvor mange, og hvilke feltnavne i hvilken opremsning —
     kommer fra js/filtrering.js, saa forsiden og denne side ikke kan naevne
     de samme fravalgte annoncer med hver sine ord. Kun slutningen paa
     saetningen er sidens egen ("Fjern filteret for at se dem"). */
  const { antal, felter, feltTekst } = Filtrering.uoplystOpgoerelse(uoplystSkjult);
  if (!antal){ el.hidden = true; el.textContent = ''; return; }

  const dem = antal === 1 ? 'den' : 'dem';
  const udvej = felter.length === 1
    ? `Fjern filteret for at se ${dem}.`
    : `Fjern et af filtrene for at se ${dem}.`;

  el.hidden = false;
  el.textContent = antal === 1
    ? `1 annonce er ikke vist, fordi ${feltTekst} ikke er oplyst på den. ${udvej}`
    : `${antal} annoncer er ikke vist, fordi ${feltTekst} ikke er oplyst på dem. ${udvej}`;
}

function activeFilterPills(){
  const pills = [];
  if (state.q) pills.push({ label: `"${state.q}"`, clear: () => state.q = '' });
  state.types.forEach(t => pills.push({ label: typeLabel(t), clear: () => state.types = state.types.filter(x=>x!==t) }));
  state.brands.forEach(b => pills.push({ label: b, clear: () => state.brands = state.brands.filter(x=>x!==b) }));
  state.models.forEach(m => pills.push({ label: m, clear: () => state.models = state.models.filter(x=>x!==m) }));
  if (state.priceMin != null || state.priceMax != null){
    pills.push({ label: `${state.priceMin?formatPrice(state.priceMin):'0 kr.'} – ${state.priceMax?formatPrice(state.priceMax):'∞'}`, clear: () => { state.priceMin=null; state.priceMax=null; } });
  }
  if (state.yearMin != null || state.yearMax != null){
    pills.push({ label: `Årgang ${state.yearMin||'…'} – ${state.yearMax||'…'}`, clear: () => { state.yearMin=null; state.yearMax=null; } });
  }
  if (state.kmMax != null) pills.push({ label: `Maks. ${formatKm(state.kmMax)}`, clear: () => state.kmMax=null });
  if (state.ccmMin != null || state.ccmMax != null){
    pills.push({ label: `${state.ccmMin||0} – ${state.ccmMax||'∞'} ccm`, clear: () => { state.ccmMin=null; state.ccmMax=null; } });
  }
  if (state.hkMin != null || state.hkMax != null){
    pills.push({ label: `${state.hkMin||0} – ${state.hkMax||'∞'} hk`, clear: () => { state.hkMin=null; state.hkMax=null; } });
  }
  if (state.dealerOnly) pills.push({ label: 'Kun forhandlere', clear: () => state.dealerOnly = false });
  if (state.kilde) pills.push({ label: `Hos ${state.kilde}`, clear: () => state.kilde = '' });
  if (state.photosOnly) pills.push({ label: 'Kun med billeder', clear: () => state.photosOnly = false });
  if (state.ejereMax != null) pills.push({ label: `Maks. ${state.ejereMax} ejer${state.ejereMax===1?'':'e'}`, clear: () => state.ejereMax = null });
  if (state.nysynet) pills.push({ label: 'Nysynet', clear: () => state.nysynet = false });
  if (state.vinterklar) pills.push({ label: 'Vinterklargjort', clear: () => state.vinterklar = false });
  if (state.maxAgeDays != null){
    const a = AGE_FILTERS.find(x => Number(x.id) === state.maxAgeDays);
    pills.push({ label: a ? a.label : `Seneste ${state.maxAgeDays} dage`, clear: () => state.maxAgeDays = null });
  }
  if (state.koerekort) pills.push({ label: 'Kørekort ' + state.koerekort, clear: () => state.koerekort = '' });
  state.regions.forEach(r => pills.push({ label: r, clear: () => state.regions = state.regions.filter(x=>x!==r) }));
  state.conditions.forEach(c => pills.push({ label: c, clear: () => state.conditions = state.conditions.filter(x=>x!==c) }));
  state.service.forEach(s => pills.push({ label: 'Service: ' + s, clear: () => state.service = state.service.filter(x=>x!==s) }));
  state.equipment.forEach(e => pills.push({ label: equipmentLabel(e), clear: () => state.equipment = state.equipment.filter(x=>x!==e) }));
  state.colors.forEach(c => pills.push({ label: c, clear: () => state.colors = state.colors.filter(x=>x!==c) }));
  return pills;
}

/* ============ Resultatgitteret males i portioner ============

   Et kort er ~80 DOM-knuder (tegningen af motorcyklen er en inline-SVG), så
   en hel side på 12 kort er ~1000 knuder. Blev de sat ind i ét hug, kostede
   det opbygning + stilberegning + layout i SAMME opgave — målt 97 ms script
   og 134 ms layout på en throttlet mobil. Alt over 50 ms i én opgave er
   blokeret tid, hvor et tryk ikke bliver besvaret.

   Nu males de tre første (dem der er over folden på en telefon) med det
   samme, og resten portionsvis i hver sin frame. Brugeren ser sit første
   resultat tidligere, og ingen enkelt opgave holder tråden i mere end et
   øjeblik. Rækkefølgen er uændret, så intet flytter sig — kortene kommer
   nedefter, hvor der ikke er noget at skubbe på. */
const FIRST_CARDS = 2;
const CARD_CHUNK = 2;
let cardChunkHandle = 0;

function paintCards(grid, pageItems, naarFaerdig){
  if (cardChunkHandle){ clearTimeout(cardChunkHandle); cardChunkHandle = 0; }
  // Renderer vælges ÉN gang pr. maling. Slås visningen om midt i en
  // portionsvis maling, ville halvdelen af siden ellers stå som kort og
  // halvdelen som rækker.
  const tegn = aktivKortRenderer();
  grid.innerHTML = pageItems.slice(0, FIRST_CARDS).map(tegn).join('');
  wireFavoriteButtons(grid);
  if (pageItems.length <= FIRST_CARDS){ naarFaerdig?.(); return; }

  let next = FIRST_CARDS;
  const step = () => {
    cardChunkHandle = 0;
    const from = next, to = Math.min(from + CARD_CHUNK, pageItems.length);
    const alreadyThere = grid.children.length;
    grid.insertAdjacentHTML('beforeend',
      pageItems.slice(from, to).map((l, k) => tegn(l, from + k)).join(''));
    // Kun de nye kort kobles på — kører wireFavoriteButtons over hele gitteret
    // igen, får de gamle hjerter to lyttere og slår sig selv fra igen.
    for (let i = alreadyThere; i < grid.children.length; i++) wireFavoriteButtons(grid.children[i]);
    next = to;
    if (next < pageItems.length) cardChunkHandle = setTimeout(step, 0);
    else naarFaerdig?.();
  };
  // setTimeout og ikke requestAnimationFrame: rAF står stille i en skjult
  // fane, og så ville resten af resultaterne aldrig blive tegnet, før
  // brugeren kiggede forbi.
  cardChunkHandle = setTimeout(step, 0);
}

/* ============ Tilbage til dit resultat ============

   Rubrikkens spørgsmål: "Kan jeg komme tilbage til mit resultat efter at
   have klikket ind?" Filtrene overlevede allerede — de står i URL'en. Men
   ALT andet gik tabt: man klikkede på annonce nummer 19, trykkede tilbage
   og landede på toppen af siden og skulle scrolle sig ned og lede efter den
   igen. På side 2 af 16 er det en reel grund til at opgive søgningen.

   To ting huskes i sessionStorage (ikke localStorage — positionen hører til
   dette faneblad og denne session, ikke til enheden):
     y   hvor langt der var scrollet
     id  hvilken annonce der blev åbnet, så den kan markeres igen

   Nøglen indeholder søgestrengen. Ændrer man et filter, mens man er væk,
   passer den gamle position ikke længere, og så bruges den ikke.

   scrollRestoration sættes til 'manual', fordi browserens egen genskabelse
   sker FØR kortene er malet: dokumentet er kun et par hundrede pixels højt
   på det tidspunkt, så den ruller til bunden af ingenting og giver op. Vi
   ruller selv, når sidste portion kort er tegnet. */
const SRP_POSITION = 'bb_srp_position';

function gemPosition(id){
  try {
    sessionStorage.setItem(SRP_POSITION, JSON.stringify({
      soeg: location.search, y: Math.round(window.scrollY), id: String(id || ''),
    }));
  } catch (e) { /* privat tilstand: så mister vi positionen, og intet andet */ }
}

let positionGenskabt = false;
function genskabPosition(){
  if (positionGenskabt) return;
  positionGenskabt = true;
  let gemt = null;
  try { gemt = JSON.parse(sessionStorage.getItem(SRP_POSITION) || 'null'); } catch (e) {}
  if (!gemt || gemt.soeg !== location.search) return;
  try { sessionStorage.removeItem(SRP_POSITION); } catch (e) {}

  if (gemt.id){
    const kort = document.querySelector(`#results-grid [data-listing-id="${CSS.escape(gemt.id)}"]`);
    // Markeringen er der, så øjet ikke skal lede efter den annonce, man lige
    // har set — den er den eneste med ramme, når man kommer tilbage.
    if (kort) kort.classList.add('is-set');
  }
  // 'auto' og ikke 'smooth': man har trykket tilbage og forventer at VÆRE
  // der, ikke at se rejsen igen.
  window.scrollTo({ top: gemt.y, behavior: 'auto' });
}

/* Den halvdel der manglede: uden det her blev gemPosition() aldrig kaldt, og
   så havde genskabPosition() aldrig noget at genskabe.

   Lytteren sidder på gitteret og ikke på hvert kort. Kortene males om ved
   hvert eneste filterklik, og 24 lyttere skulle så sættes op igen hver gang —
   og de gamle ville hænge på knuder, der var smidt væk.

   Kun kortets rigtige link tæller. Uden den betingelse gemte et tryk på
   hjertet eller sammenlign-knappen også en position, og så sprang siden ved
   næste tilbage-tryk hen til et kort, brugeren aldrig havde åbnet. */
function wirePositionHukommelse(){
  const grid = document.getElementById('results-grid');
  if (!grid) return;
  grid.addEventListener('click', (e) => {
    const link = e.target.closest('a.card-link, a.row-link');
    if (!link || !grid.contains(link)) return;
    const kort = link.closest('[data-listing-id]');
    if (kort) gemPosition(kort.dataset.listingId);
  });

  /* Kommer man tilbage fra browserens frem-og-tilbage-cache, køres boot()
     ikke igen: dokumentet er stadig malet, render() kalder ikke paintCards,
     og genskabPosition() ville derfor aldrig blive kaldt. Samtidig har vi
     selv slået browserens egen genskabelse fra (scrollRestoration nedenfor),
     så ingen ruller. Her nulstilles vagten og vi ruller selv. */
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    positionGenskabt = false;
    genskabPosition();
  });

  // Se blokkommentaren over SRP_POSITION: browserens egen genskabelse rammer
  // et dokument, der endnu ikke har nogen kort i sig, og giver op.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* Filterknappernes pushState (se pushFilterState() foroven) laver historik-
     punkter, brugeren kan bladre FREM OG TILBAGE i UDEN at forlade siden —
     det er nyt i denne runde. Uden en popstate-lytter ændrede browseren kun
     adresselinjen ved Tilbage; DOM'en (kortene, chipsenes tilstand, tallene)
     blev stående ved det SIDSTE filter, fordi intet kaldte readStateFromURL()
     igen. Renderer vi ikke her, ser Tilbage ud til at virke (URL'en skifter)
     og virker alligevel ikke (skærmen gør ikke).

     FÆLDEN, MÅLT I BROWSEREN: jeg antog først, at popstate kun fyrer ved
     SAMME dokument (vores egne pushState-punkter) — en Tilbage fra
     annonce.html og IND IGEN i soegning.html er jo et andet dokument, tænkte
     jeg, og skulle derfor kun ramme pageshow(persisted). Forkert: Chromium
     fyrer popstate OGSÅ på den vej, selv om adressen for denne side slet
     ikke har ændret sig (?page=3 begge veje). Rendrer man ubetinget her,
     kalder render() paintCards() FORFRA, og det sker EFTER at
     genskabPosition() (via pageshow ovenfor) allerede har rullet til den
     gemte position — den ny-tegnede grid nulstiller den. Målt: scrollY 1884
     før klik på et kort, 0 efter Tilbage, med sessionStorage-punktet korrekt
     forbrugt (så genskabPosition() FAKTISK havde ramt rigtigt, lige før den
     blev overskrevet).

     Rettelsen: render kun, hvis adressen rent faktisk ER en anden end den,
     vores EGEN state ville have skrevet — beregnURL() er den samme funktion,
     writeStateToURL() bruger til at afgøre det samme spørgsmål den anden
     vej. Er de ens, er intet filter ændret (det var kun et fremmed dokuments
     popstate, der susede forbi), og vi rører hverken DOM eller scroll. Er de
     forskellige, er det en ægte Tilbage/Frem mellem to af VORES egne
     historik-punkter, og så SKAL vi synkronisere. Efterprøvet: scrollY 1884
     → 1884 (Δ 0 px) efter rettelsen, se work/DECISIONS.md. */
  window.addEventListener('popstate', () => {
    if (beregnURL() === window.location.pathname + window.location.search) return;
    readStateFromURL();
    render();
  });
}

/* ============ Render i to etaper ============

   Alt hvad render() rørte lå i én opgave: resultaterne OG alt rundt om dem
   (filterpiller, tælle-badge, søgeagent-knap, tyndt-resultat-panel, JSON-LD,
   paginering). Målt på throttlet mobil blev det til 103 ms script + 59 ms
   layout i én blok — langt over de 50 ms, hvor et tryk begynder at føles
   dødt.

   Etape 1 (render) er dét brugeren venter på: overskrift, antal og kortene.
   Etape 2 (renderSecondary) er rammen om dem, og kan lige så godt komme en
   opgave senere — det er millisekunder for øjet, men det halverer den
   længste blokering. Kommer der en ny render inden da, kasseres den gamle
   etape 2, så der aldrig tegnes noget forældet. */
let secondaryHandle = 0;

/* C3 (23.08.2026): én 'search'-hændelse pr. FÆRDIGT filtersæt — ikke pr.
   tastetryk og ikke pr. maling. 800 ms ro efter sidste ændring, og kun hvis
   forespørgslen faktisk er en anden end den sidst målte. Bag samtykke;
   Maaling smider den væk uden gtag. */
let sidsteMaaltSoegning = null;
let maalSoegningTimer = null;
function maalSoegning(antal){
  if (typeof Maaling === 'undefined') return;
  clearTimeout(maalSoegningTimer);
  maalSoegningTimer = setTimeout(() => {
    const qs = currentQueryString(true);
    if (qs === sidsteMaaltSoegning) return;
    sidsteMaaltSoegning = qs;
    Maaling.soegning(state, antal);
  }, 800);
}

function render(){
  writeStateToURL();
  reflectStateToUI();
  applyViewMode();

  const pills = activeFilterPills();

  /* Piller, badge og søgeagent-knap står ALLE over resultaterne. Udskydes de
     til etape 2, dukker de op en opgave senere og skubber værktøjslinjen og
     kortene nedad — målt som layoutskred. De er billige (under et
     millisekund), så de hører hjemme her. */
  const filterBar = document.getElementById('active-filters');
  // p.label kan stamme fra URL-parametre (brands, regions, conditions, farve …)
  // og er dermed angriberstyret. Escapes i BÅDE tekst- og attribut-kontekst,
  // ellers er ?brands=<img onerror=…> reflekteret XSS via et delt link.
  filterBar.innerHTML = pills.map((p, i) =>
    `<span class="active-filter-pill">${escapeHTML(p.label)}<button type="button" data-pill-clear="${i}" aria-label="Fjern filter: ${escapeHTML(p.label)}">${Icon.close}</button></span>`).join('');
  filterBar.querySelectorAll('[data-pill-clear]').forEach(btn => {
    btn.addEventListener('click', () => { pills[Number(btn.dataset.pillClear)].clear(); state.page = 1; pushFilterState(); });
  });
  const badge = document.getElementById('filter-badge');
  badge.textContent = pills.length;
  badge.hidden = pills.length === 0;
  refreshSaveSearchButton();

  const filtered = getFilteredListings();
  maalSoegning(filtered.length);
  // Skal stå EFTER getFilteredListings(), som er den der tæller de skjulte.
  renderUoplystNote();
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  state.page = Math.min(state.page, totalPages);
  const pageItems = filtered.slice((state.page-1)*PAGE_SIZE, state.page*PAGE_SIZE);

  renderResultsCount(filtered);
  /* Sorteringslinjen tæller på DENNE side og på hele resultatet, så den
     skal stå efter udsnittet — og i etape 1, fordi den ligger over kortene.
     Elementet FINDES i soegning.html fra første maling med den samme
     sætning uden tal; her byttes kun teksten. */
  renderSorteringsNote(pageItems, filtered);

  /* Skuffens knap er det eneste sted på mobil, hvor man kan se resultatet af
     et filter uden at lukke skuffen. Baren skriver "Vis 40.474 biler"; vi
     skriver også, når svaret er nul — så slipper man for at lukke skuffen,
     opdage den tomme skærm og åbne den igen for at fortryde. */
  const anvend = document.getElementById('apply-filters-btn');
  if (anvend){
    anvend.textContent = total === 0 ? 'Ingen annoncer matcher'
      : total === 1 ? 'Vis 1 annonce'
      : `Vis ${total.toLocaleString('da-DK')} annoncer`;
  }

  // Dynamisk H1 fra aktive mærker/regioner — scannability + SEO (konkurrenter
  // scorer på "Brugte Yamaha til salg i København").
  let heading = state.brands.length
    ? `Brugte ${state.brands.slice(0,3).join(', ')} til salg`
    : 'Brugte motorcykler til salg';
  if (state.regions.length === 1) heading += ` i ${state.regions[0]}`;
  const headingEl = document.querySelector('.search-heading');
  if (headingEl.textContent !== heading) headingEl.textContent = heading;

  const grid = document.getElementById('results-grid');
  const empty = document.getElementById('empty-state');
  if (pageItems.length){
    grid.style.display = '';
    // scripts/build-srp.js skjuler de forudtegnede kort på filtrerede
    // adresser, indtil vi har tegnet de rigtige. Nu er de rigtige.
    grid.style.visibility = '';
    empty.style.display = 'none';
    paintCards(grid, pageItems, genskabPosition);
  } else {
    grid.style.display = 'none';
    empty.style.display = 'block';

    /* To vidt forskellige situationer havde samme tomme skærm — og samme
       orange knap: "Nulstil filtre". Sætter man ingen filtre, og der bare
       ikke er nogen annoncer endnu, var sidens primære handling altså en
       knap, der ikke gjorde noget som helst. Præcis den tilstand er den, et
       nyt site møder brugerne med hver eneste dag, indtil lageret vokser. */
    const intetLager = Store.getAllListings().length === 0;
    document.getElementById('empty-title').textContent = intetLager
      ? 'Der er ingen annoncer endnu'
      : 'Ingen annoncer matcher dine filtre';
    document.getElementById('empty-text').textContent = intetLager
      ? 'Bikerbasen er helt nyt. Bliv den første til at sætte en motorcykel til salg — eller få besked, så snart der kommer en.'
      : tomtilstandsRaad(pills);

    // Nulstil-knappen giver kun mening, når der ER noget at nulstille.
    const nulstil = document.getElementById('empty-clear-btn');
    const saelg = document.getElementById('empty-sell-btn');
    nulstil.hidden = intetLager || !pills.length;
    // Den synlige hovedhandling skal være den, der rent faktisk hjælper.
    nulstil.classList.toggle('btn-primary', !nulstil.hidden);
    saelg.classList.toggle('btn-primary', nulstil.hidden);
    saelg.classList.toggle('btn-outline', !nulstil.hidden);
  }

  clearTimeout(secondaryHandle);
  secondaryHandle = setTimeout(() => renderSecondary(pills, pageItems, heading, total, totalPages), 0);
}

/* Rådet i tomtilstanden skal passe til den tilstand, brugeren står i (D-012).

   Linjen sagde ét og det samme uanset hvad: "Prøv at fjerne et filter eller
   udvide dit prisinterval." På `soegning.html?q=zzzzqqq` er der nul træf, ét
   aktivt filter — frisøgningen — og INTET prisinterval. Rådet pegede altså på
   en indstilling, der ikke var i spil, i den ene situation hvor rådet er det
   eneste, siden har at give.

   Grundlaget er `pills`, den samme liste som chipsene ved siden af tegnes
   af, så rådet og det, skærmen viser, ikke kan komme fra hinanden.
   `state.q` fylder altid præcis én chip (activeFilterPills(), øverst), så
   "kun frisøgningen" er `state.q` sat OG nøjagtig én chip. */
function tomtilstandsRaad(pills){
  const kunSoegeord = !!state.q && pills.length === 1;
  const harPris = state.priceMin != null || state.priceMax != null;
  if (kunSoegeord) return `Der er ingen match på "${state.q}". Prøv et kortere søgeord — fx kun mærket.`;
  // Prisen nævnes KUN, når der faktisk er sat et prisfilter.
  if (harPris) return 'Prøv at fjerne et filter eller udvide dit prisinterval.';
  if (pills.length > 1) return 'Prøv at fjerne et af filtrene.';
  if (pills.length === 1) return 'Prøv at fjerne filteret.';
  // Nul filtre og nul træf med lager på hylden kan i dag ikke ske — det ville
  // være intetLager-grenen. Linjen står der, så tilstanden ikke er tom, hvis
  // en fremtidig filtrering ligger uden for pillerne.
  return 'Prøv en anden søgning.';
}

/* En facet uden træf skal ikke indekseres (C-019).

   Det er livrem og seler, og det skal siges ærligt: canonical peger allerede
   på bare `soegning.html` på hver eneste facet, så en tom kombination
   indekseres i praksis ikke som sin egen adresse, og `jsonld-results` falder
   korrekt bort, når listen er tom. Der er altså ikke målt en skade. Det, der
   ER tilbage, er tilfældet hvor Google vælger at ignorere canonical'en — det
   sker, og så er "Ingen annoncer matcher dine filtre" den side, en søgende
   lander på.

   Begge retninger sættes med vilje. Siden skifter tilstand uden en ny
   indlæsning: sætter man kun `noindex` ved nul træf, bliver den hængende,
   når brugeren fjerner filteret igen — og så ville et fuldt resultat stå
   med `noindex`. `index, follow` er standardadfærden skrevet ud, ikke en ny
   påstand. */
function seoRobots(total){
  Seo.setMeta('meta[name="robots"]', 'name', 'robots',
    total === 0 ? 'noindex, follow' : 'index, follow');
}

/* Etape 2: det der står UNDER kortene (eller slet ikke kan ses) — her kan
   ingenting skubbe til noget, brugeren kigger på. */
function renderSecondary(pills, pageItems, heading, total, totalPages){
  seoSearchResults(pageItems, heading);
  seoRobots(total);

  /* Facettallene hører til etape 2: de koster seks gennemløb af filterkæden,
     og ingen venter på dem — panelet står allerede med de foregående tal, og
     de skifter kun med et ciffer i en boks med fast bredde. */
  renderFacetCounts();
  /* Samme etape, samme grund: dækningen kan have ændret sig, siden panelet
     blev bygget, fordi lageret hentes i to omgange. */
  synkroniserKravGrupper();

  // Få-resultater-panel: gør et tyndt resultat til en konvertering i stedet for
  // et dødt hjørne (kun når brugeren faktisk har filtreret).
  const thin = document.getElementById('thin-result-panel');
  if (thin){
    const hasFilters = pills.length > 0 || !!state.q;
    if (total > 0 && total < 4 && hasFilters){
      thin.hidden = false;
      thin.innerHTML = `
        <div class="thin-panel-inner">
          <div class="thin-panel-copy">
            <p class="thin-panel-title">${total === 1 ? 'Kun 1 match' : 'Kun ' + total + ' resultater'} — udvid din søgning</p>
            <p class="thin-panel-text">Bikerbasen er nyt, og lageret vokser hver uge. Fjern et filter, eller få besked når der lander flere.</p>
          </div>
          <div class="thin-panel-actions">
            <button type="button" class="btn btn-outline btn-sm" data-thin-reset>Nulstil filtre</button>
            <button type="button" class="btn btn-primary btn-sm" data-thin-agent>Få besked når der kommer flere</button>
          </div>
        </div>`;
      thin.querySelector('[data-thin-reset]').addEventListener('click', () => document.getElementById('clear-filters').click());
      thin.querySelector('[data-thin-agent]').addEventListener('click', () => document.getElementById('save-search-btn').click());
    } else {
      thin.hidden = true; thin.innerHTML = '';
    }
  }

  renderPagination(totalPages);
}

/* ============ Paginering: kun et vindue om den aktuelle side ============

   Den tegnede ALLE sider som knapper. Med 51 annoncer var det fem knapper,
   og det så pænt ud. Med 383 blev det 32 knapper à 40px på én række =
   1466px min-content i en spalte, der havde 872px. Sporet i .search-layout
   var dengang "1fr" (= minmax(auto,1fr)), så det gav efter for indholdet,
   og HELE søgesiden blev 1815px bred i et 1280px vindue. Vandret scroll på
   den side, sitet lever af.

   To rettelser, fordi én ikke er nok: sporet er nu minmax(0,1fr), så en
   bred komponent ikke KAN sprænge layoutet igen — og pagineringen viser
   højst ni elementer i alt:

     ‹  1  …  14 [15] 16  …  32  ›

   Første og sidste side er altid med (man skal kunne komme til enden af
   listen i ét klik), og der er altid en nabo på hver side af den aktuelle.
   Syv pladser til tal og ellipser plus de to pile = ni. */
const PAGINATION_MAX = 7;

function sideNumre(current, total){
  if (total <= PAGINATION_MAX) return Array.from({ length: total }, (_, i) => i + 1);
  const sider = new Set([1, total, current, current - 1, current + 1]);
  // Nær enderne mangler der naboer på den ene side — fyld op indad, så
  // rækken ikke skifter bredde, hver gang man bladrer.
  if (current <= 3) [2, 3, 4].forEach(n => sider.add(n));
  if (current >= total - 2) [total - 1, total - 2, total - 3].forEach(n => sider.add(n));
  const liste = [...sider].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);

  const ud = [];
  liste.forEach((n, i) => {
    if (i && n - liste[i - 1] > 1) ud.push('…');
    ud.push(n);
  });
  return ud;
}

function renderPagination(totalPages){
  const pag = document.getElementById('pagination');
  if (!pag) return;
  if (totalPages <= 1){ pag.innerHTML = ''; return; }

  const pil = (side, label, tegn) => side < 1 || side > totalPages
    ? `<button type="button" class="pag-arrow" disabled aria-label="${label}">${tegn}</button>`
    : `<button type="button" class="pag-arrow" data-page="${side}" aria-label="${label}">${tegn}</button>`;

  const midt = sideNumre(state.page, totalPages).map(n => n === '…'
    ? `<span class="pag-gap" aria-hidden="true">…</span>`
    : `<button type="button" class="${n === state.page ? 'active' : ''}" data-page="${n}"` +
      `${n === state.page ? ' aria-current="page"' : ''} aria-label="Side ${n}${n === state.page ? ' (nuværende)' : ''}">${n}</button>`
  ).join('');

  pag.innerHTML = pil(state.page - 1, 'Forrige side', Icon.chevronLeft) + midt +
    pil(state.page + 1, 'Næste side', Icon.chevronRight) +
    `<span class="pag-status">Side ${state.page} af ${totalPages}</span>`;

  pag.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => { state.page = Number(btn.dataset.page); render(); window.scrollTo({top:0, behavior:'smooth'}); });
  });
}

/* Modeller der findes under de valgte mærker (union). */
function availableModels(){
  const set = new Set();
  state.brands.forEach(b => (BRANDS_BY_MODEL[b] || []).forEach(m => set.add(m)));
  return set;
}

/* Mærke → Model-kaskade: Model-facetten vises kun når et mærke er valgt, og
   fyldes med netop det mærkes modeller (Bilbasens kerne-indsnævring). */
function renderModelFilter(){
  const group = document.getElementById('model-group');
  const mount = document.getElementById('filter-models');
  if (!group || !mount) return;
  /* Modelkataloget er større end lageret. Uden tælling stod der 40 modeller
     under Yamaha, hvoraf 6 fandtes til salg — resten var knapper, der kun
     kunne give nul. Modellerne tælles med den SAMME prædikat, filteret selv
     bruger (eksakt match på l.model), så tallet ved siden af er det, klikket
     rent faktisk giver. Modeller med nul vises ikke. */
  const basis = anvendFiltre(Store.getAllListings(), 'models', null);
  const antal = new Map();
  for (const l of basis){ if (l.model) antal.set(l.model, (antal.get(l.model) || 0) + 1); }

  const models = [...availableModels()]
    .filter(m => (antal.get(m) || 0) > 0 || state.models.includes(m))
    .sort((a, b) => a.localeCompare(b, 'da'));
  /* skjulGruppe/visGruppe og ikke `group.hidden` alene: se kommentaren over
     skjulGruppe(). Model-gruppen var en af de syv tomme overskrifter, en
     kritiker talte i panelet. */
  if (!state.brands.length || !models.length){
    skjulGruppe(group); mount.innerHTML = ''; return;
  }
  // Kommer gruppen frem efter at have været skjult, skal den være foldet ud
  // — den dukkede op, fordi brugeren lige valgte et mærke.
  const varSkjult = group.hidden;
  visGruppe(group);
  if (varSkjult) group.open = true;
  // .checkbox-list og ikke .checkbox-scroll: samme grund som mærkelisten —
  // et rullefelt inde i arket inde i siden. Modellisten er kort (kun modeller,
  // der findes i lageret), så den kan bare flyde.
  mount.innerHTML = `<div class="checkbox-list">${models.map(m =>
    `<label class="checkbox-row"><input type="checkbox" data-model="${escapeHTML(m)}"${state.models.includes(m) ? ' checked' : ''}><span>${escapeHTML(m)}</span><span class="facet-n" aria-hidden="true">${antal.get(m) || 0}</span></label>`).join('')}</div>`;
}

/* Dobbelt-tommel skyder bygget på to native range-inputs (tilgængelige,
   tastaturvenlige). Synkroniseres begge veje med talfelterne + state. */
function wireDualRange(rangeId, minFieldId, maxFieldId, minKey, maxKey){
  const el = document.getElementById(rangeId);
  if (!el) return;
  const floor = Number(el.dataset.floor), ceil = Number(el.dataset.ceil), step = Number(el.dataset.step);
  const drMin = el.querySelector('.dr-min'), drMax = el.querySelector('.dr-max');
  const fill = el.querySelector('[data-fill]');
  const minField = document.getElementById(minFieldId), maxField = document.getElementById(maxFieldId);
  const pct = v => (v - floor) / (ceil - floor) * 100;
  const paint = () => {
    const lo = Number(drMin.value), hi = Number(drMax.value);
    fill.style.left = pct(lo) + '%';
    fill.style.right = (100 - pct(hi)) + '%';
    // Når begge tomler står i bunden, skal min-tomlen kunne gribes ovenpå.
    drMin.style.zIndex = lo >= ceil - step ? 5 : 4;
  };
  // Kaldes fra reflectStateToUI, så URL/talfelt-ændringer flytter tomlerne.
  el._sync = () => {
    let lo = state[minKey] == null ? floor : Math.max(floor, Math.min(ceil, state[minKey]));
    let hi = state[maxKey] == null ? ceil : Math.max(floor, Math.min(ceil, state[maxKey]));
    if (lo > hi) lo = hi;
    drMin.value = lo; drMax.value = hi; paint();
  };
  let t;
  const onInput = (which) => {
    let lo = Number(drMin.value), hi = Number(drMax.value);
    if (lo > hi){ if (which === 'min') { lo = hi; drMin.value = lo; } else { hi = lo; drMax.value = hi; } }
    paint();
    minField.value = lo <= floor ? '' : lo;      // yderpunkt = ingen grænse
    maxField.value = hi >= ceil ? '' : hi;
    clearTimeout(t);
    t = setTimeout(() => {
      state[minKey] = lo <= floor ? null : lo;
      state[maxKey] = hi >= ceil ? null : hi;
      state.page = 1; render();
    }, 200);
  };
  drMin.addEventListener('input', () => onInput('min'));
  drMax.addEventListener('input', () => onInput('max'));
  el._sync();
}

/* Vælger ÉN kørekortkategori — aldrig et toggle. Pil-tasterne i en
   radiogruppe SKIFTER valget, de rydder det ikke (en rigtig radioknap kan
   heller ikke slås fra ved at pile hen over den igen); kun et KLIK på den
   allerede valgte rydder filteret (se klik-lytteren nedenfor). To adskilte
   funktioner, fordi mus og tastatur forventer hver sin opførsel her. */
function vaelgKoerekort(id){
  state.koerekort = id; state.page = 1; pushFilterState();
}
function vaelgPrisinterval(id){
  const p = PRIS_INTERVALLER.find(x => x.id === id);
  if (!p) return;
  state.priceMin = p.min; state.priceMax = p.max; state.page = 1; pushFilterState();
}

/* Radioknap-gruppens tastatur: venstre/højre (og op/ned, for chips der
   ombryder i flere rækker) flytter fokus OG vælger med det samme — det er
   sådan native <input type="radio"> opfører sig, og det er derfor
   syncRadioChips() sætter roving tabindex frem for aria-pressed. Klik
   bruger sin egen håndtering (se ovenfor), fordi klik SKAL kunne rydde
   valget igen, og det skal piletasterne ikke. */
function wireRadioGroupNavigation(containerId, vaelg){
  const box = document.getElementById(containerId);
  if (!box) return;
  box.addEventListener('keydown', (e) => {
    const RETNING = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(e.key in RETNING) && e.key !== 'Home' && e.key !== 'End') return;
    const chips = Array.from(box.querySelectorAll('.chip'));
    const i = chips.indexOf(document.activeElement);
    if (i === -1) return;
    e.preventDefault();
    const naeste = e.key === 'Home' ? chips[0]
      : e.key === 'End' ? chips[chips.length - 1]
      : chips[(i + RETNING[e.key] + chips.length) % chips.length];
    naeste.focus();
    vaelg(naeste.dataset.koerekort ?? naeste.dataset.pris);
  });
}

/* Kontroller der lever inde i filterpanelet — kobles på når panelet bygges. */
function wireFilterControls(){
  document.querySelectorAll('#filter-types .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const id = chip.dataset.type;
      state.types = state.types.includes(id) ? state.types.filter(x=>x!==id) : [...state.types, id];
      state.page = 1; pushFilterState();
    });
  });
  document.querySelectorAll('#filter-koerekort .chip').forEach(ch => {
    ch.addEventListener('click', () => {
      vaelgKoerekort(state.koerekort === ch.dataset.koerekort ? '' : ch.dataset.koerekort);
    });
  });
  wireRadioGroupNavigation('filter-koerekort', vaelgKoerekort);
  // Prisintervallerne sætter begge ender på én gang og rydder dem igen ved
  // andet klik. Skyderen og talfelterne følger med gennem reflectStateToUI.
  document.querySelectorAll('#filter-price-quick .chip').forEach(ch => {
    ch.addEventListener('click', () => {
      const alleredeValgt = erAktivtPrisinterval(ch.dataset.pris);
      if (alleredeValgt){ state.priceMin = null; state.priceMax = null; state.page = 1; pushFilterState(); }
      else vaelgPrisinterval(ch.dataset.pris);
    });
  });
  wireRadioGroupNavigation('filter-price-quick', vaelgPrisinterval);
  // Når mærker ændres, fjern modeller der ikke længere hører til et valgt mærke.
  const pruneModels = () => { const avail = availableModels(); state.models = state.models.filter(m => avail.has(m)); };
  document.querySelectorAll('#filter-brands input[data-brand]').forEach(cb => {
    cb.addEventListener('change', () => {
      const b = cb.dataset.brand;
      state.brands = cb.checked ? [...state.brands, b] : state.brands.filter(x=>x!==b);
      pruneModels(); state.page = 1; pushFilterState();
    });
  });
  // Model-checkbokse (delegeret — de gen-renderes når mærkevalget ændrer sig).
  document.getElementById('filter-models')?.addEventListener('change', (e) => {
    const cb = e.target.closest('input[data-model]'); if (!cb) return;
    const m = cb.dataset.model;
    state.models = cb.checked ? [...state.models, m] : state.models.filter(x => x !== m);
    state.page = 1; pushFilterState();
  });
  const brandSearch = document.getElementById('brand-search');
  if (brandSearch) brandSearch.addEventListener('input', opdaterMaerkeliste);
  const brandMore = document.getElementById('brand-more');
  if (brandMore) brandMore.addEventListener('click', () => {
    maerkerUdfoldet = !maerkerUdfoldet;
    opdaterMaerkeliste();
    // Foldes listen sammen igen, skal fokus blive på knappen og ikke ryge
    // med de rækker, der lige forsvandt.
    brandMore.focus();
  });
  document.querySelectorAll('#filter-regions input').forEach(cb => {
    cb.addEventListener('change', () => {
      const r = cb.dataset.region;
      state.regions = cb.checked ? [...state.regions, r] : state.regions.filter(x=>x!==r);
      state.page = 1; pushFilterState();
    });
  });
  document.querySelectorAll('#filter-conditions input').forEach(cb => {
    cb.addEventListener('change', () => {
      const c = cb.dataset.condition;
      state.conditions = cb.checked ? [...state.conditions, c] : state.conditions.filter(x=>x!==c);
      state.page = 1; pushFilterState();
    });
  });
  /* Service, udstyr og farve lyttes DELEGERET på beholderen, ikke på hver
     checkboks. Grunden er ny i runde 3: de tre grupper bygges først, når
     lageret oplyser feltet, og det kan ske EFTER panelet er koblet op (se
     synkroniserKravGrupper). En lytter sat på en checkboks, der ikke fandtes
     endnu, findes heller ikke — gruppen ville stå der og se ud til at virke.
     Beholderen står i markuppen fra første maling og forsvinder aldrig. */
  const checkboxGroup = (containerId, dataKey, stateKey) => {
    const boks = document.getElementById(containerId);
    if (!boks) return;
    boks.addEventListener('change', (e) => {
      const cb = e.target.closest(`input[data-${dataKey}]`);
      if (!cb) return;
      const v = cb.dataset[dataKey];
      state[stateKey] = cb.checked ? [...state[stateKey], v] : state[stateKey].filter(x => x !== v);
      state.page = 1; pushFilterState();
    });
  };
  checkboxGroup('filter-service', 'service', 'service');
  checkboxGroup('filter-equipment', 'equipment', 'equipment');
  checkboxGroup('filter-colors', 'color', 'colors');
}

/* Kontroller der står i den statiske HTML og skal virke fra første sekund:
   søgefelt, talfelter, skydere, sortering, visningsskift, søgeagent og
   knappen der åbner filterskuffen. */
function wireCoreControls(){
  document.getElementById('filter-age').addEventListener('change', (e) => {
    state.maxAgeDays = numOrNull(e.target.value);
    state.page = 1; pushFilterState();
  });
  document.getElementById('filter-photos-only').addEventListener('change', (e) => {
    state.photosOnly = e.target.checked; state.page = 1; pushFilterState();
  });
  document.getElementById('filter-dealer-only').addEventListener('change', (e) => {
    state.dealerOnly = e.target.checked; state.page = 1; pushFilterState();
  });
  document.getElementById('filter-nysynet').addEventListener('change', (e) => {
    state.nysynet = e.target.checked; state.page = 1; pushFilterState();
  });
  document.getElementById('filter-vinter').addEventListener('change', (e) => {
    state.vinterklar = e.target.checked; state.page = 1; pushFilterState();
  });

  // Fritekst-søgning på resultatsiden (Bilbasen/Idealista-standard). state.q
  // filtrerede allerede — men der var intet felt at skrive i.
  //
  // BEVIDST replaceState (render(), ikke pushFilterState()) her: at skrive
  // "Hornet" er seks-syv separate ændringer af state.q, og hver af dem ville
  // være ét historik-punkt, hvis feltet fulgte samme regel som en chip.
  // Runde 3's kritiker MÅLTE netop, at fritekstfeltet IKKE spammer historikken
  // ("Det gode: at taste i søgefeltet spammer ikke historikken"), og det er en
  // ros, ikke en fejl der skal rettes. Ryd-knappen ER et diskret klik og får
  // derfor sit eget historik-punkt, ligesom "Nulstil".
  const qInput = document.getElementById('filter-q');
  if (qInput){
    let qTimer;
    qInput.addEventListener('input', () => {
      clearTimeout(qTimer);
      qTimer = setTimeout(() => { state.q = qInput.value.trim(); state.page = 1; render(); }, 250);
    });
    document.getElementById('filter-q-clear')?.addEventListener('click', () => {
      qInput.value = ''; state.q = ''; state.page = 1; pushFilterState(); qInput.focus();
    });
  }

  // Talfelter debounces, så "150000" ikke udløser seks fulde re-renders + seks
  // URL-skrivninger undervejs.
  const numField = (id, key) => {
    let t;
    document.getElementById(id).addEventListener('input', (e) => {
      const v = e.target.value;
      clearTimeout(t);
      t = setTimeout(() => { state[key] = numOrNull(v); state.page = 1; render(); }, 300);
    });
  };
  numField('filter-price-min', 'priceMin');
  numField('filter-price-max', 'priceMax');
  numField('filter-year-min', 'yearMin');
  numField('filter-year-max', 'yearMax');
  numField('filter-km-max', 'kmMax');
  numField('filter-ccm-min', 'ccmMin');
  numField('filter-ccm-max', 'ccmMax');
  numField('filter-hk-min', 'hkMin');
  numField('filter-hk-max', 'hkMax');
  numField('filter-ejere-max', 'ejereMax');

  // Dual-range skydere for pris og årgang — top-tier SRP-affordance. De rigtige
  // talfelter beholdes nedenunder til præcis indtastning. Yderpunkt = "ingen
  // grænse" (null), så en tommel trukket helt ud rydder filteret.
  wireDualRange('range-price', 'filter-price-min', 'filter-price-max', 'priceMin', 'priceMax');
  wireDualRange('range-year', 'filter-year-min', 'filter-year-max', 'yearMin', 'yearMax');

  document.getElementById('sort-select').addEventListener('change', (e) => { state.sort = e.target.value; render(); });

  const resetAll = () => { state = { ...EMPTY_STATE, types: [], brands: [], models: [], regions: [], conditions: [], service: [], equipment: [], colors: [] }; pushFilterState(); };
  document.getElementById('clear-filters').addEventListener('click', resetAll);
  document.getElementById('clear-filters-mobile').addEventListener('click', resetAll);
  document.getElementById('empty-clear-btn').addEventListener('click', resetAll);

  document.getElementById('view-grid').addEventListener('click', () => setViewMode('grid'));
  document.getElementById('view-list').addEventListener('click', () => setViewMode('list'));
  document.getElementById('view-swipe')?.addEventListener('click', () => setViewMode('swipe'));

  // Søgeagent-genvej i tom-tilstanden peger på samme handling som topknappen.
  document.getElementById('empty-agent-btn')?.addEventListener('click', () => {
    document.getElementById('save-search-btn').click();
  });

  document.getElementById('save-search-btn').addEventListener('click', async () => {
    const qs = currentQueryString();
    const existing = Store.getSavedSearches().find(s => s.query === qs);
    const label = describeCurrentSearch(activeFilterPills());

    /* Søgeagenten blev tidligere KUN gemt i localStorage. Tabellen
       saved_searches fandtes, metoderne i supabase-api.js fandtes — de blev
       bare aldrig kaldt. Så vidste serveren ikke, at agenten eksisterede, og
       kunne aldrig sende den mail, knappen lovede. Nu skrives den begge
       steder: databasen er den, der udløser mails (migration 013 +
       notify-saved-searches), og localStorage holder listen synlig med det
       samme og for brugere der ikke er logget ind. */
    if (existing){
      Store.removeSavedSearch(existing.id);
      if (existing.remoteId) db.deleteSavedSearch(existing.remoteId);
      toast('Søgeagent fjernet');
    } else {
      const { all } = Store.addSavedSearch({ query: qs, label, count: getFilteredListings().length });
      if (typeof Maaling !== 'undefined') Maaling.gemSoegning(state, getFilteredListings().length);

      if (db.enabled && Store.getUser()?.remote){
        const { data, error } = await db.addSavedSearch(qs, label);
        if (error){
          toast('Søgeagenten er gemt her på enheden, men vi kunne ikke slå beskeder til. Prøv igen senere.', { type: 'error' });
        } else {
          // Bind den lokale post til rækken i databasen, så en senere
          // fjernelse rammer begge steder.
          Store.setSavedSearchRemoteId(all[0].id, data.id);
          toast('Søgeagent oprettet — du får en mail, når der kommer en der matcher');
        }
      } else {
        toast('Søgeagent gemt her på enheden. Log ind for at få besked på mail.');
      }
    }
    refreshSaveSearchButton();
  });

  wireMobileFilterDialog();
}

/* ============ Filterskuffen på mobil er en RIGTIG dialog ============

   Runde 3's kritiker: `#filters-panel` er den SAMME DOM-knude på
   desktop (fast sidebar, altid synlig, aria-label="Filtrer annoncer") og på
   mobil (skuffe, der lægger sig over resten af skærmen). Den kan derfor
   ikke have role="dialog"/aria-modal statisk i markuppen — på desktop ville
   det være løgn (intet er "modalt", sidebaren ligger side om side med
   resultaterne, og skærmlæseren ville fortælle brugeren, at resten af siden
   er blokeret, når den ikke er det). Attributterne sættes derfor kun, når
   skuffen RENT FAKTISK åbnes som en skuffe (< 960px, samme grænse som CSS'
   `@media (max-width:959px)`), og fjernes igen ved lukning.

   Fem ting manglede, alle mål af kritikeren:
     1. role="dialog" + aria-modal="true"          — kun i skuffe-tilstand
     2. fokus flyttes IND i skuffen ved åbning       — til luk-knappen
     3. Tab/Shift+Tab fanges i skuffen, mens den er åben (fælde nedenfor)
     4. baggrunden bliver util-tabbar (inert)        — se setBackgroundInert
     5. "Filtre"-knappen bærer aria-expanded          — reflekterer den reelle
        tilstand, ikke en gættet
   Escape lukker også — det stod ikke på kritikerens liste, men enhver, der
   kan tabbe sig ind i en dialog, forventer at kunne Escape sig ud igen. */
function wireMobileFilterDialog(){
  const overlay = document.getElementById('filters-overlay');
  const panel = document.getElementById('filters-panel');
  const openBtn = document.getElementById('open-filters-btn');
  const erSkuffeBredde = () => window.matchMedia('(max-width:959px)').matches;

  /* Gør alt, der IKKE er på vejen til overlay'et, util-tabbart. Går ÉN
     forælder op ad gangen fra overlay til <body> og lægger `inert` på hver
     søskende undervejs — dermed rammes header, brødkrumme, H1,
     resultatkolonnen (med pagineringen, som kritikeren netop fandt stadig
     kunne tabbes til under det åbne ark) og footeren, uden at nogen af dem
     skal kendes ved navn her. Strukturen i soegning.html kan ændre sig; denne
     funktion behøver ikke vide hvordan. */
  function setBackgroundInert(on){
    let node = overlay;
    while (node && node !== document.body){
      const forael = node.parentElement;
      if (forael){
        Array.from(forael.children).forEach(sib => {
          if (sib === node) return;
          if (on) sib.setAttribute('inert', ''); else sib.removeAttribute('inert');
        });
      }
      node = forael;
    }
  }

  function fokuserbareI(el){
    return Array.from(el.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(n => n.offsetParent !== null);
  }

  const setOverlay = (open) => {
    overlay.classList.toggle('open', open);
    // Skjuler cookiebanneret, så det ikke dækker skuffens knapper.
    document.body.classList.toggle('overlay-open', open);
    openBtn.setAttribute('aria-expanded', String(open));
    if (!erSkuffeBredde()) return; // ≥960px: det er sidebaren, ikke en dialog
    if (open){
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      setBackgroundInert(true);
      (panel.querySelector('.filters-close') || panel).focus();
    } else {
      // 'complementary', ikke fjernet: panelet er et <div>, uden rollen
      // ville det stå uden noget landemærke som desktop-sidebar (se
      // blokkommentaren — <aside> kunne ikke skifte TIL dialog, men et
      // rolleløst <div> ville heller ikke give landemærket TILBAGE).
      panel.setAttribute('role', 'complementary');
      panel.removeAttribute('aria-modal');
      setBackgroundInert(false);
      openBtn.focus(); // fokus tilbage der, hvor brugeren åbnede fra
    }
  };

  // Skuffen bygges færdig i samme klik som den åbnes — brugeren har allerede
  // ventet på sit tryk, og panelet er tegnet inden overgangen er kørt.
  openBtn.addEventListener('click', () => {
    ensureFiltersBuilt();
    setOverlay(true);
  });
  overlay.querySelectorAll('[data-close-filters]').forEach(el => el.addEventListener('click', () => setOverlay(false)));

  // Tab-fælde + Escape. ÉN permanent lytter frem for at sætte/fjerne en ved
  // hvert åbn/luk — den tjekker selv, om skuffen rent faktisk er åben som
  // dialog lige nu, så den koster intet, når den ikke er.
  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('open') || !erSkuffeBredde()) return;
    if (e.key === 'Escape'){ setOverlay(false); return; }
    if (e.key !== 'Tab') return;
    const f = fokuserbareI(panel);
    if (!f.length) return;
    const foerste = f[0], sidste = f[f.length - 1];
    if (e.shiftKey && document.activeElement === foerste){ e.preventDefault(); sidste.focus(); }
    else if (!e.shiftKey && document.activeElement === sidste){ e.preventDefault(); foerste.focus(); }
  });

  // Sikkerhedsnet: vokser vinduet forbi 960px, MENS skuffen står åben (en
  // bruger, der drejer en foldbar telefon, eller en, der zoomer ud), bliver
  // panelet til sidebaren uden et klik på nogen luk-knap. Uden oprydningen
  // her ville role="dialog", aria-modal og inert på resten af siden hænge
  // fast på en desktopvisning, der ikke er en dialog — og så kunne INGEN
  // taste sig til pagineringen, heller ikke på desktop.
  window.matchMedia('(min-width:960px)').addEventListener('change', (e) => {
    if (e.matches && overlay.classList.contains('open')){
      panel.setAttribute('role', 'complementary'); panel.removeAttribute('aria-modal');
      setBackgroundInert(false);
      document.body.classList.remove('overlay-open');
      openBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

/* Giver hovedtråden en pause, så browseren kan male og reagere på input
   imellem opstartens etaper. Uden den lå hele opstarten i én 254 ms-opgave —
   alt over 50 ms tæller direkte som blokeret tid. */
const nextTask = () => new Promise(r => setTimeout(r, 0));

async function boot(){
  await backendReady();

  // Etape 1: værktøjslinjens ikoner og de kontroller der står i HTML'en.
  // Ligger i sin egen opgave, så den ikke klæber til evalueringen af
  // search.js selv.
  await nextTask();
  readStateFromURL();
  populateChrome();
  wireCoreControls();
  // Skal stå FØR render(): paintCards kalder genskabPosition, når sidste
  // portion kort er tegnet, og scrollRestoration skal være slået om inden da.
  wirePositionHukommelse();

  /* Fra 960px står filterpanelet åbent i sidebaren. Dér SKAL det bygges før
     første maling — bygges det bagefter, folder de sytten filtergrupper sig
     ud og skubber hinanden nedad, mens man kigger på dem (målt CLS 0,08).
     Under 960px ligger det i en lukket skuffe, og så koster det ingenting at
     vente på det tryk der åbner den. */
  if (window.matchMedia('(min-width: 960px)').matches) ensureFiltersBuilt();

  // Etape 2: det brugeren er kommet efter — resultaterne.
  await nextTask();
  render();

  // Etape 3: headeren er allerede tegnet som statisk HTML; hydreringen
  // (login-slot, favorittal, menu, cookiebanner) kan vente en opgave.
  await nextTask();
  renderHeader('soegning.html');

  // Etape 4: filterpanelet og bogføringen af søgningen.
  await nextTask();
  scheduleFilterPanel();
  const qs = currentQueryString();
  if (qs) Store.addRecentSearch(qs, describeCurrentSearch(activeFilterPills()));
}

/* Scriptet er `defer`, så DOM'en står færdig når vi når hertil — vi behøver
   ikke vente på DOMContentLoaded. Det er ikke bare tidligere: begivenheden
   samler alle sidens lyttere i ÉN opgave, så backend-broens arbejde og vores
   opstart lagde sig oven i hinanden. Nu kører de hver for sig. */
if (document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
