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
  regions: [], conditions: [], equipment: [], fuels: [], drives: [],
  service: [],
  cylinders: [], colors: [], maxAgeDays: null, photosOnly: false,
  ejereMax: null, nysynet: false, vinterklar: false,
  dealerOnly: false, koerekort: '', sort: 'date-desc', page: 1,
};
let state = { ...EMPTY_STATE };

/* Feltnavne i URL'en. Listen bruges begge veje, så et nyt filter kun skal
   tilføjes ét sted for at kunne deles, bogmærkes og gemmes som søgeagent. */
const LIST_PARAMS = {
  types: 'types', brands: 'brands', models: 'model', regions: 'regions', conditions: 'conditions',
  equipment: 'udstyr', fuels: 'braendstof', drives: 'traek', colors: 'farve',
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
  state.cylinders = (p.get('cyl') || '').split(',').filter(Boolean).map(Number);
  state.photosOnly = p.get('billeder') === '1';
  state.dealerOnly = p.get('dealer') === '1';
  state.nysynet = p.get('nysynet') === '1';
  state.vinterklar = p.get('vinter') === '1';
  state.koerekort = p.get('koerekort') || '';
  state.sort = p.get('sort') || 'date-desc';
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
  if (state.cylinders.length) p.set('cyl', state.cylinders.join(','));
  if (state.photosOnly) p.set('billeder', '1');
  if (state.dealerOnly) p.set('dealer', '1');
  if (state.nysynet) p.set('nysynet', '1');
  if (state.vinterklar) p.set('vinter', '1');
  if (state.koerekort) p.set('koerekort', state.koerekort);
  if (includeSort && state.sort !== 'date-desc') p.set('sort', state.sort);
  return p.toString();
}

function writeStateToURL(){
  const p = new URLSearchParams(currentQueryString(true));
  if (state.page > 1) p.set('page', state.page);
  const qs = p.toString();
  history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''));
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

function populateFilterUI(){
  document.getElementById('filter-types').innerHTML = TYPES.map(t =>
    `<button type="button" class="chip" data-type="${t.id}">${t.label}</button>`).join('');

  // Populære mærker først som chips, derefter den fulde, søgbare liste i et
  // højde-begrænset felt — 60 checkbokse på række skubbede alle andre filtre
  // under folden.
  const POPULAR_BRANDS = ['Yamaha','Honda','BMW','Suzuki','Kawasaki','Harley-Davidson','Ducati','KTM'];
  const known = new Set(Object.keys(BRANDS_BY_MODEL));
  const brandRows = Object.keys(BRANDS_BY_MODEL).sort((a,b)=>a.localeCompare(b,'da')).map(b =>
    `<label class="checkbox-row" data-brand-row="${b.toLowerCase()}"><input type="checkbox" data-brand="${b}">${b}</label>`).join('');
  document.getElementById('filter-brands').innerHTML = `
    <div class="brand-popular" id="brand-popular">${POPULAR_BRANDS.filter(b=>known.has(b)).map(b =>
      `<button type="button" class="chip" data-brand-chip="${b}">${b}</button>`).join('')}</div>
    <div class="filter-search"><input type="text" id="brand-search" placeholder="Søg mærke…" autocomplete="off" aria-label="Søg i mærker"></div>
    <div class="checkbox-scroll" id="brand-list">${brandRows}
      <p class="brand-noresult" id="brand-noresult" hidden>Ingen mærker matcher.</p>
    </div>`;

  document.getElementById('filter-koerekort').innerHTML = KOEREKORT.map(k =>
    `<button type="button" class="chip" data-koerekort="${k.id}" title="${k.hint}">${k.label}</button>`).join('');

  document.getElementById('filter-regions').innerHTML = REGIONS.map(r =>
    `<label class="checkbox-row"><input type="checkbox" data-region="${r}">${r}</label>`).join('');

  document.getElementById('filter-conditions').innerHTML = CONDITIONS.map(c =>
    `<label class="checkbox-row"><input type="checkbox" data-condition="${c}">${c}</label>`).join('');

  document.getElementById('filter-service').innerHTML = SERVICE_HISTORIK_OPTIONS.map(s =>
    `<label class="checkbox-row"><input type="checkbox" data-service="${s}">${s}</label>`).join('');

  // Udstyret er grupperet — en flad liste med 33 checkbokse er ubrugelig
  // på en telefon, og det er dér de fleste søger.
  document.getElementById('filter-equipment').innerHTML = EQUIPMENT_GROUPS.map(g => `
    <div class="filter-subgroup">
      <p class="filter-subgroup-title">${g.group}</p>
      ${g.items.map(i => `<label class="checkbox-row"><input type="checkbox" data-equipment="${i.id}">${i.label}</label>`).join('')}
    </div>`).join('');

  document.getElementById('filter-fuels').innerHTML = FUELS.map(f =>
    `<label class="checkbox-row"><input type="checkbox" data-fuel="${f}">${f}</label>`).join('');
  document.getElementById('filter-drives').innerHTML = DRIVES.map(d =>
    `<label class="checkbox-row"><input type="checkbox" data-drive="${d}">${d}</label>`).join('');
  document.getElementById('filter-colors').innerHTML = COLORS.map(c =>
    `<label class="checkbox-row"><input type="checkbox" data-color="${c}">${c}</label>`).join('');
  document.getElementById('filter-cylinders').innerHTML = CYLINDERS.map(c =>
    `<button type="button" class="chip" data-cylinder="${c}">${c}</button>`).join('');
  document.getElementById('filter-age').innerHTML =
    '<option value="">Alle annoncer</option>' +
    AGE_FILTERS.map(a => `<option value="${a.id}">${a.label}</option>`).join('');

  // Ikonerne der bor inde i panelet — hører til her, ikke i populateChrome.
  document.querySelectorAll('.filter-group summary .chev').forEach(c => c.innerHTML = Icon.chevronDown);
  document.querySelector('.filters-close').innerHTML = Icon.close;
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

/* Kørekortkategorien er listens vigtigste felt — og derfor det felt, hvor
   et gæt gør mest skade.

   koerekortForListing() i js/data.js læser manglende effekt som 0 hk. En
   1200 ccm maskine uden oplyst hk kommer derfor ud som "A2", altså som om
   en 20-årig måtte køre den. Det passer for hver eneste indekserede
   annonce, for kilden oplyser ikke effekt.

   Her vises kategorien kun, når den kan udledes:
     · effekten er kendt      → udledningen holder
     · ccm ≤ 125 og ingen hk  → A1 uanset effekt (15 hk-grænsen kan ikke
                                overskrides med den slagvolumen i praksis,
                                og A1 er den forsigtige gæt-retning)
   Ellers står der "Ikke oplyst". Et manglende felt koster et klik; et
   forkert felt kan koste en bøde og en inddraget motorcykel. */
function koerekortSikkert(l){
  const hk = Number(l.power) || 0;
  const ccm = Number(l.ccm) || 0;
  if (hk) return koerekortForListing(l);
  if (ccm && ccm <= A1_MAX_CCM) return 'A1';
  return null;
}

const UOPLYST = '<span class="row-unknown">Ikke oplyst</span>';

function rowSpecsHTML(l){
  const kk = koerekortSikkert(l);
  const motor = l.ccm == null
    ? UOPLYST
    : escapeHTML(formatCcm(l.ccm)) + (l.power ? ` <span class="row-hk">· ${escapeHTML(formatPower(l.power))}</span>` : '');
  const celle = (label, vaerdi) => `<div class="row-spec"><dt>${label}</dt><dd>${vaerdi}</dd></div>`;
  return `<dl class="row-specs">
    ${celle('Årgang', l.year == null ? UOPLYST : escapeHTML(String(l.year)))}
    ${celle('Kilometer', l.km == null ? UOPLYST : escapeHTML(formatKm(l.km)))}
    ${celle('Motor', motor)}
    ${celle('Kørekort', kk ? `<span class="row-kk">${kk}</span>` : UOPLYST)}
  </dl>`;
}

function rowMarkersHTML(markers){
  if (!markers || !markers.length) return '';
  return `<span class="row-markers">${markers.slice(0, 2).map(m =>
    `<span class="row-marker">${escapeHTML(m.toLowerCase())}</span>`).join('')}</span>`;
}

/* Indekseret annonce som listerække.

   Samme fire løfter som kortet i js/components.js, og de er ikke til
   forhandling, fordi rækken er smallere: mærket "Hos <kilde>" står først i
   rækken, kildens navn står hvor sælgeren ellers står, linket går til
   KILDEN i ny fane med rel=nofollow, og der er intet hjerte — favoritter
   peger på vores egne annoncer med en fremmednøgle. */
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
      <p class="row-cta">Se hos ${kilde}${Icon.externalLink}</p>
      <div class="row-tools">
        <button type="button" class="row-tool ${Store.isComparing(l.id)?'active':''}" data-compare-toggle="${l.id}" aria-pressed="${Store.isComparing(l.id)}" title="Sammenlign" aria-label="Tilføj til sammenligning">${Icon.chart}</button>
      </div>
    </div>
    <a href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer nofollow" class="row-link"
       aria-label="Se annonce hos ${kilde} (åbner i ny fane): ${[model, variant].filter(Boolean).join(' ')}, ${escapeHTML(formatPrice(l.price))}"></a>
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
    `${total} <span>${total === 1 ? 'annonce fundet' : 'annoncer fundet'}</span>`;

  const mix = document.getElementById('results-mix');
  if (!mix) return;
  const { egne, eksterne, kilder } = resultatSammensaetning(list);

  // Ingen indekserede i resultatet: så er der ingen sammensætning at
  // forklare, og linjen er ren støj.
  if (!eksterne){ mix.hidden = true; mix.innerHTML = ''; return; }

  const sorteret = [...kilder.entries()].sort((a, b) => b[1] - a[1]);
  const kildeTekst = sorteret.slice(0, 2)
    .map(([navn, n]) => `${n} indekseret hos ${escapeHTML(navn)}`).join(' · ');
  const flere = sorteret.length > 2 ? ` · +${sorteret.length - 2} kilder` : '';
  const egneTekst = egne
    ? `<span class="mix-part mix-egne">${egne} ${egne === 1 ? 'annonce' : 'annoncer'} på Bikerbasen</span>`
    : '';

  mix.hidden = false;
  mix.innerHTML = `${egneTekst}<span class="mix-part mix-ekstern">${kildeTekst}${flere}</span>` +
    `<button type="button" class="mix-info" id="mix-info-btn" title="Hvad betyder indekseret?" aria-label="Hvad betyder det, at en annonce er indekseret?">${Icon.info}</button>`;
  mix.querySelector('#mix-info-btn').addEventListener('click', forklarIndekseret);
}

/* ============ Swipe-visning (mobil-first, à la 123mc-appen) ============ */
let swipeItems = [];
let swipeIndex = 0;

function swipeCardHTML(l, stackPos){
  const brand = escapeHTML(l.brand), model = escapeHTML(l.model);
  const loc = escapeHTML(l.city || l.region || '');
  const k = koerekortForListing(l);
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

/* Spejler state ned i de kontroller der først findes, når panelet er bygget. */
function reflectFilterPanel(){
  document.querySelectorAll('#filter-types .chip').forEach(chip => {
    chip.classList.toggle('active', state.types.includes(chip.dataset.type));
  });
  document.querySelectorAll('#filter-koerekort .chip').forEach(ch => {
    ch.classList.toggle('active', state.koerekort === ch.dataset.koerekort);
  });
  document.querySelectorAll('#filter-brands input[data-brand]').forEach(cb => {
    cb.checked = state.brands.includes(cb.dataset.brand);
  });
  document.querySelectorAll('#brand-popular .chip').forEach(ch => {
    ch.classList.toggle('active', state.brands.includes(ch.dataset.brandChip));
  });
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
  document.querySelectorAll('#filter-fuels input').forEach(cb => {
    cb.checked = state.fuels.includes(cb.dataset.fuel);
  });
  document.querySelectorAll('#filter-drives input').forEach(cb => {
    cb.checked = state.drives.includes(cb.dataset.drive);
  });
  document.querySelectorAll('#filter-colors input').forEach(cb => {
    cb.checked = state.colors.includes(cb.dataset.color);
  });
  document.querySelectorAll('#filter-cylinders .chip').forEach(ch => {
    ch.classList.toggle('active', state.cylinders.includes(Number(ch.dataset.cylinder)));
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

/* ================= Filtrering med tre svar =================

   Et filter blev før stillet et ja/nej-spørgsmål. Men en annonce kan svare
   tre ting: JA, NEJ og VED IKKE — og de 332 indekserede annoncer fra MC Syd
   svarer VED IKKE på næsten alt. Kilden fortæller mærke, model, årgang, km,
   ccm, pris, postnummer. Den fortæller ikke stand, udstyr, antal ejere, syn
   eller vinterklargøring, fordi de felter ikke findes hos den.

   Med kun ja/nej blev VED IKKE tvunget om til ét af de to, og begge udfald
   var forkerte på hver sin måde. Målt på siden før denne rettelse:

     Tvunget til NEJ  — ét klik på landsdel, type, stand, udstyr, brændstof,
       træk, farve, cylindre eller service, og alle 332 forsvandt lydløst.
       Brugeren så et resultattal falde og troede, der ikke var flere
       motorcykler. Intet sagde, at der lå 332 tilbage bag filteret.

     Tvunget til JA   — værre, og det var der ingen der havde set. `l.km <=
       10.000` med km = null blev til `null <= 10000`, altså sandt: 163
       annoncer uden kilometertal påstod at have under 10.000 km. "Maks. 50
       hk" gav alle 332, Gold Wings inklusive. Og "Kørekort A2" gav ALLE 332
       — en 20-årig med A2-kort fik en 1800 ccm Harley vist som lovlig.
       (Kørekortdelen er siden rettet ved roden i js/data.js, commit e29c381;
       de øvrige "maks."-filtre rettes her.)

   Nu svarer et prædikat UOPLYST, når annoncen ikke kender feltet.

   VALGET: uoplyst tæller som NEJ — annoncen vises ikke — men den tælles, og
   brugeren får det at vide over resultaterne.

   Begrundelse. Et filter er et løfte. Sætter man "Brugt", er løftet "alt
   herunder er brugt". En annonce uden stand kan ikke holde det løfte, så
   den hører ikke med i resultatet — at tage den med ville gøre løftet
   værdiløst for alle de andre træf, og på kørekortfilteret ville det være
   direkte farligt. Men at fjerne den UDEN at sige det er den fejl, vi kom
   fra: brugeren kan ikke se forskel på "der findes ikke flere" og "der er
   flere, vi bare ikke ved nok om". Derfor det tredje svar: udeluk, og sig
   det højt. Så kan brugeren selv slå filteret fra og se dem.

   Og vi gætter ikke. Stand kunne sættes til "Brugt", for det er et
   brugtmarked, og så ville de 332 overleve standsfilteret. Det er en
   påstand, vi selv har fundet på, som ville stå på kortet som en oplysning
   fra sælgeren. Et tal, der mangler, er bedre end et tal, der lyver. */
const UOPLYST = Symbol('uoplyst');

/* Hvor mange annoncer det enkelte filter har skjult, fordi oplysningen
   manglede. Nulstilles ved hver kørsel af getFilteredListings(). En annonce
   fjernes ved det FØRSTE filter, der skjuler den, og kan derfor kun tælles
   én gang — tallene kan lægges sammen uden dobbelttælling. */
let uoplystSkjult = [];

function filtrerMedUoplyst(list, felt, praedikat){
  const beholdt = [];
  let skjult = 0;
  for (const l of list){
    const svar = praedikat(l);
    if (svar === UOPLYST) skjult++;
    else if (svar) beholdt.push(l);
  }
  if (skjult) uoplystSkjult.push({ felt, antal: skjult });
  return beholdt;
}

/* Kørekort med tre svar — UDEN at gentage reglerne.

   passerKoerekort() i js/data.js er og bliver det ene sted, der afgør, hvad
   A1 og A2 betyder. Her spørger vi den bare to gange.

   Den kan kun svare ja eller nej, og et nej dækker over to forskellige ting:
   "motorcyklen er for kraftig" og "vi mangler den oplysning, der skulle
   afgøre det". Søgesiden har brug for at skelne — ikke for at kende
   grænserne. Så vi spørger igen med de manglende felter sat til den
   gunstigst mulige værdi. Skifter svaret fra nej til ja, afhang nejet af
   noget, vi ikke ved, og det rigtige svar er UOPLYST.

   Det er med vilje ikke en kopi af reglerne. Flyttes A2-grænsen fra 48 til
   50 hk i js/data.js, følger denne funktion med af sig selv. En førsteudgave
   herinde gentog grænserne, og så havde vi to steder, der bestemte hvad A2
   betød — præcis den slags dobbelthed, der lod den oprindelige fejl opstå,
   hvor kommentaren i js/data.js sagde ét og koden noget andet.

   Forudsætning: for A1 og A2 er både ccm og hk ØVRE grænser, så lavest
   muligt er altid det gunstigste. Kommer der en kategori med en nedre
   grænse, holder den antagelse ikke, og prøven skal skrives om. */
function koerekortSvar(l, kat){
  if (passerKoerekort(l, kat)) return true;

  const proeve = { ...l };
  let manglerNoget = false;
  if (l.power == null){ proeve.power = 0; manglerNoget = true; }
  if (l.ccm == null){ proeve.ccm = 1; manglerNoget = true; }
  if (manglerNoget && passerKoerekort(proeve, kat)) return UOPLYST;

  return false;
}

function getFilteredListings(){
  let list = Store.getAllListings();
  uoplystSkjult = [];

  const q = state.q.trim().toLowerCase();
  if (q) list = list.filter(l => `${l.brand} ${l.model}`.toLowerCase().includes(q));

  // Mærke, model og titel kender vi altid — de kommer med annoncen fra kilden.
  if (state.brands.length) list = list.filter(l => state.brands.includes(l.brand));
  if (state.models.length) list = list.filter(l => state.models.includes(l.model));

  // Kategorifiltre: værdien er enten oplyst, eller også er den det ikke.
  if (state.types.length)
    list = filtrerMedUoplyst(list, 'motorcykeltype', l => l.type == null ? UOPLYST : state.types.includes(l.type));
  if (state.regions.length)
    list = filtrerMedUoplyst(list, 'landsdel', l => l.region == null ? UOPLYST : state.regions.includes(l.region));
  if (state.conditions.length)
    list = filtrerMedUoplyst(list, 'stand', l => l.condition == null ? UOPLYST : state.conditions.includes(l.condition));
  if (state.service.length)
    list = filtrerMedUoplyst(list, 'servicehistorik', l => l.serviceHistorik == null ? UOPLYST : state.service.includes(l.serviceHistorik));

  /* Talfiltre. Bemærk at BEGGE ender skal spørge om værdien overhovedet er
     kendt. Før gjorde kun den nedre ende det — ved et tilfælde, fordi
     `null >= 5000` er falsk, mens `null <= 5000` er sandt. Den asymmetri var
     hele grunden til, at "maks."-filtrene løj, mens "min."-filtrene bare
     skjulte. */
  if (state.priceMin != null)
    list = filtrerMedUoplyst(list, 'pris', l => l.price == null ? UOPLYST : l.price >= state.priceMin);
  if (state.priceMax != null)
    list = filtrerMedUoplyst(list, 'pris', l => l.price == null ? UOPLYST : l.price <= state.priceMax);
  if (state.yearMin != null)
    list = filtrerMedUoplyst(list, 'årgang', l => l.year == null ? UOPLYST : l.year >= state.yearMin);
  if (state.yearMax != null)
    list = filtrerMedUoplyst(list, 'årgang', l => l.year == null ? UOPLYST : l.year <= state.yearMax);
  if (state.kmMax != null)
    list = filtrerMedUoplyst(list, 'kilometertal', l => l.km == null ? UOPLYST : l.km <= state.kmMax);
  if (state.ccmMin != null)
    list = filtrerMedUoplyst(list, 'ccm', l => l.ccm == null ? UOPLYST : l.ccm >= state.ccmMin);
  if (state.ccmMax != null)
    list = filtrerMedUoplyst(list, 'ccm', l => l.ccm == null ? UOPLYST : l.ccm <= state.ccmMax);
  if (state.hkMin != null)
    list = filtrerMedUoplyst(list, 'hestekræfter', l => l.power == null ? UOPLYST : l.power >= state.hkMin);
  if (state.hkMax != null)
    list = filtrerMedUoplyst(list, 'hestekræfter', l => l.power == null ? UOPLYST : l.power <= state.hkMax);

  /* Udstyr er et OG-filter: vælger man ABS og varmehåndtag, vil man have
     begge dele. Brændstof, træktype, farve og cylindre er ELLER inden for
     hver gruppe — dér leder man efter én af flere acceptable værdier.

     equipment: null betyder "ikke oplyst"; equipment: [] betyder "vi har
     spurgt sælgeren, og der er intet ekstraudstyr". De to skal ikke
     behandles ens — den tomme liste er et rigtigt nej. */
  if (state.equipment.length){
    list = filtrerMedUoplyst(list, 'udstyr', l =>
      l.equipment == null ? UOPLYST : state.equipment.every(e => l.equipment.includes(e)));
  }
  if (state.fuels.length)
    list = filtrerMedUoplyst(list, 'brændstof', l => l.fuel == null ? UOPLYST : state.fuels.includes(l.fuel));
  if (state.drives.length)
    list = filtrerMedUoplyst(list, 'træktype', l => l.drive == null ? UOPLYST : state.drives.includes(l.drive));
  if (state.colors.length)
    list = filtrerMedUoplyst(list, 'farve', l => l.color == null ? UOPLYST : state.colors.includes(l.color));
  if (state.cylinders.length)
    list = filtrerMedUoplyst(list, 'cylinderantal', l => l.cylinders == null ? UOPLYST : state.cylinders.includes(Number(l.cylinders)));

  /* "Oprettet inden for" spørger til annoncens alder. De indekserede har med
     vilje ingen createdAt (se normalizeExternalListing i js/backend-bridge.js:
     crawledatoen er ikke annoncedatoen). Det er også et uoplyst felt. */
  if (state.maxAgeDays != null){
    const cutoff = Date.now() - state.maxAgeDays * 86400000;
    list = filtrerMedUoplyst(list, 'oprettelsesdato', l => {
      if (!l.createdAt) return UOPLYST;
      const t = new Date(l.createdAt).getTime();
      return Number.isNaN(t) ? UOPLYST : t >= cutoff;
    });
  }

  /* Billeder og sælgertype er IKKE uoplyste. Vi kan selv se, om der fulgte
     et billede med, og kilden oplyser sælgertypen. Her er et nej et rigtigt
     nej, og filtrene bliver stående som de var. */
  if (state.photosOnly) list = list.filter(l => (l.photoUrls || []).length > 0);
  if (state.dealerOnly) list = list.filter(l => l.isDealer);

  if (state.ejereMax != null)
    list = filtrerMedUoplyst(list, 'antal ejere', l => l.antalEjere == null ? UOPLYST : l.antalEjere <= state.ejereMax);
  if (state.nysynet){
    const y = new Date().getFullYear();
    list = filtrerMedUoplyst(list, 'seneste syn', l => l.sidsteSyn == null ? UOPLYST : l.sidsteSyn >= y - 1);
  }
  if (state.vinterklar)
    list = filtrerMedUoplyst(list, 'vinterklargøring', l => l.vinterklar == null ? UOPLYST : !!l.vinterklar);
  if (state.koerekort)
    list = filtrerMedUoplyst(list, 'kørekortkategori', l => koerekortSvar(l, state.koerekort));

  /* Ukendt værdi sorteres ALTID bagest — også når retningen er stigende.

     Uden det her blev null til 0 i minusregningen, og så lå de 22
     indekserede annoncer uden pris øverst under "Pris: Lav til høj". En
     annonce uden pris er ikke den billigste; den er uoplyst. Samme fejl
     ramte "Kilometertal: Lavest først", hvor 163 annoncer uden kilometertal
     lagde sig foran en cykel med 500 km på uret.

     Det er samme regel som NULLS LAST i SQL, og den gælder begge retninger:
     det ukendte skal aldrig vinde en sortering, det ikke deltager i. */
  const medUkendtSidst = (vaelg, retning) => (a, b) => {
    const x = vaelg(a), y = vaelg(b);
    const xTom = x == null || Number.isNaN(x);
    const yTom = y == null || Number.isNaN(y);
    if (xTom && yTom) return 0;
    if (xTom) return 1;
    if (yTom) return -1;
    return retning === 'asc' ? x - y : y - x;
  };
  const tid = l => (l.createdAt ? new Date(l.createdAt).getTime() : null);

  const sorters = {
    'date-desc':  medUkendtSidst(tid,        'desc'),
    'price-asc':  medUkendtSidst(l => l.price, 'asc'),
    'price-desc': medUkendtSidst(l => l.price, 'desc'),
    'year-desc':  medUkendtSidst(l => l.year,  'desc'),
    'km-asc':     medUkendtSidst(l => l.km,    'asc'),
  };
  list.sort(sorters[state.sort] || sorters['date-desc']);
  return list;
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

  const antal = uoplystSkjult.reduce((sum, x) => sum + x.antal, 0);
  if (!antal){ el.hidden = true; el.textContent = ''; return; }

  // Samme felt kan skjule i to omgange (fx både pris-min og pris-maks).
  const felter = [...new Set(uoplystSkjult.map(x => x.felt))];
  const feltTekst = felter.length === 1
    ? felter[0]
    : felter.slice(0, -1).join(', ') + ' og ' + felter[felter.length - 1];

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
  state.fuels.forEach(f => pills.push({ label: f, clear: () => state.fuels = state.fuels.filter(x=>x!==f) }));
  state.drives.forEach(d => pills.push({ label: d, clear: () => state.drives = state.drives.filter(x=>x!==d) }));
  state.colors.forEach(c => pills.push({ label: c, clear: () => state.colors = state.colors.filter(x=>x!==c) }));
  state.cylinders.forEach(c => pills.push({ label: `${c} cylindre`, clear: () => state.cylinders = state.cylinders.filter(x=>x!==c) }));
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

function paintCards(grid, pageItems){
  if (cardChunkHandle){ clearTimeout(cardChunkHandle); cardChunkHandle = 0; }
  // Renderer vælges ÉN gang pr. maling. Slås visningen om midt i en
  // portionsvis maling, ville halvdelen af siden ellers stå som kort og
  // halvdelen som rækker.
  const tegn = aktivKortRenderer();
  grid.innerHTML = pageItems.slice(0, FIRST_CARDS).map(tegn).join('');
  wireFavoriteButtons(grid);
  if (pageItems.length <= FIRST_CARDS) return;

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
  };
  // setTimeout og ikke requestAnimationFrame: rAF står stille i en skjult
  // fane, og så ville resten af resultaterne aldrig blive tegnet, før
  // brugeren kiggede forbi.
  cardChunkHandle = setTimeout(step, 0);
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
    btn.addEventListener('click', () => { pills[Number(btn.dataset.pillClear)].clear(); state.page = 1; render(); });
  });
  const badge = document.getElementById('filter-badge');
  badge.textContent = pills.length;
  badge.hidden = pills.length === 0;
  refreshSaveSearchButton();

  const filtered = getFilteredListings();
  // Skal stå EFTER getFilteredListings(), som er den der tæller de skjulte.
  renderUoplystNote();
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  state.page = Math.min(state.page, totalPages);
  const pageItems = filtered.slice((state.page-1)*PAGE_SIZE, state.page*PAGE_SIZE);

  renderResultsCount(filtered);

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
    paintCards(grid, pageItems);
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
      : 'Prøv at fjerne et filter eller udvide dit prisinterval.';

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

/* Etape 2: det der står UNDER kortene (eller slet ikke kan ses) — her kan
   ingenting skubbe til noget, brugeren kigger på. */
function renderSecondary(pills, pageItems, heading, total, totalPages){
  seoSearchResults(pageItems, heading);

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
  const models = [...availableModels()].sort((a, b) => a.localeCompare(b, 'da'));
  if (!state.brands.length || !models.length){
    group.hidden = true; mount.innerHTML = ''; return;
  }
  group.hidden = false;
  mount.innerHTML = `<div class="checkbox-scroll">${models.map(m =>
    `<label class="checkbox-row"><input type="checkbox" data-model="${escapeHTML(m)}"${state.models.includes(m) ? ' checked' : ''}>${escapeHTML(m)}</label>`).join('')}</div>`;
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

/* Kontroller der lever inde i filterpanelet — kobles på når panelet bygges. */
function wireFilterControls(){
  document.querySelectorAll('#filter-types .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const id = chip.dataset.type;
      state.types = state.types.includes(id) ? state.types.filter(x=>x!==id) : [...state.types, id];
      state.page = 1; render();
    });
  });
  document.querySelectorAll('#filter-koerekort .chip').forEach(ch => {
    ch.addEventListener('click', () => {
      state.koerekort = state.koerekort === ch.dataset.koerekort ? '' : ch.dataset.koerekort;
      state.page = 1; render();
    });
  });
  // Når mærker ændres, fjern modeller der ikke længere hører til et valgt mærke.
  const pruneModels = () => { const avail = availableModels(); state.models = state.models.filter(m => avail.has(m)); };
  document.querySelectorAll('#filter-brands input[data-brand]').forEach(cb => {
    cb.addEventListener('change', () => {
      const b = cb.dataset.brand;
      state.brands = cb.checked ? [...state.brands, b] : state.brands.filter(x=>x!==b);
      pruneModels(); state.page = 1; render();
    });
  });
  // Populære mærker som hurtig-chips (samme state som checkboksene).
  document.querySelectorAll('#brand-popular .chip').forEach(ch => {
    ch.addEventListener('click', () => {
      const b = ch.dataset.brandChip;
      state.brands = state.brands.includes(b) ? state.brands.filter(x=>x!==b) : [...state.brands, b];
      pruneModels(); state.page = 1; render();
    });
  });
  // Model-checkbokse (delegeret — de gen-renderes når mærkevalget ændrer sig).
  document.getElementById('filter-models')?.addEventListener('change', (e) => {
    const cb = e.target.closest('input[data-model]'); if (!cb) return;
    const m = cb.dataset.model;
    state.models = cb.checked ? [...state.models, m] : state.models.filter(x => x !== m);
    state.page = 1; render();
  });
  // Typeahead i mærkelisten — skjuler rækker der ikke matcher.
  const brandSearch = document.getElementById('brand-search');
  if (brandSearch){
    brandSearch.addEventListener('input', () => {
      const q = brandSearch.value.trim().toLowerCase();
      let any = false;
      document.querySelectorAll('#brand-list [data-brand-row]').forEach(row => {
        const match = row.dataset.brandRow.includes(q);
        row.hidden = !match; if (match) any = true;
      });
      const nr = document.getElementById('brand-noresult');
      if (nr) nr.hidden = any;
    });
  }
  document.querySelectorAll('#filter-regions input').forEach(cb => {
    cb.addEventListener('change', () => {
      const r = cb.dataset.region;
      state.regions = cb.checked ? [...state.regions, r] : state.regions.filter(x=>x!==r);
      state.page = 1; render();
    });
  });
  document.querySelectorAll('#filter-conditions input').forEach(cb => {
    cb.addEventListener('change', () => {
      const c = cb.dataset.condition;
      state.conditions = cb.checked ? [...state.conditions, c] : state.conditions.filter(x=>x!==c);
      state.page = 1; render();
    });
  });
  document.querySelectorAll('#filter-service input').forEach(cb => {
    cb.addEventListener('change', () => {
      const s = cb.dataset.service;
      state.service = cb.checked ? [...state.service, s] : state.service.filter(x=>x!==s);
      state.page = 1; render();
    });
  });

  /* De nye checkbox-grupper opfører sig ens: slå værdien til eller fra i
     den tilsvarende liste i state. */
  const checkboxGroup = (containerId, dataKey, stateKey) => {
    document.querySelectorAll(`#${containerId} input`).forEach(cb => {
      cb.addEventListener('change', () => {
        const v = cb.dataset[dataKey];
        state[stateKey] = cb.checked ? [...state[stateKey], v] : state[stateKey].filter(x => x !== v);
        state.page = 1; render();
      });
    });
  };
  checkboxGroup('filter-equipment', 'equipment', 'equipment');
  checkboxGroup('filter-fuels', 'fuel', 'fuels');
  checkboxGroup('filter-drives', 'drive', 'drives');
  checkboxGroup('filter-colors', 'color', 'colors');

  document.querySelectorAll('#filter-cylinders .chip').forEach(ch => {
    ch.addEventListener('click', () => {
      const c = Number(ch.dataset.cylinder);
      state.cylinders = state.cylinders.includes(c) ? state.cylinders.filter(x=>x!==c) : [...state.cylinders, c];
      state.page = 1; render();
    });
  });
}

/* Kontroller der står i den statiske HTML og skal virke fra første sekund:
   søgefelt, talfelter, skydere, sortering, visningsskift, søgeagent og
   knappen der åbner filterskuffen. */
function wireCoreControls(){
  document.getElementById('filter-age').addEventListener('change', (e) => {
    state.maxAgeDays = numOrNull(e.target.value);
    state.page = 1; render();
  });
  document.getElementById('filter-photos-only').addEventListener('change', (e) => {
    state.photosOnly = e.target.checked; state.page = 1; render();
  });
  document.getElementById('filter-dealer-only').addEventListener('change', (e) => {
    state.dealerOnly = e.target.checked; state.page = 1; render();
  });
  document.getElementById('filter-nysynet').addEventListener('change', (e) => {
    state.nysynet = e.target.checked; state.page = 1; render();
  });
  document.getElementById('filter-vinter').addEventListener('change', (e) => {
    state.vinterklar = e.target.checked; state.page = 1; render();
  });

  // Fritekst-søgning på resultatsiden (Bilbasen/Idealista-standard). state.q
  // filtrerede allerede — men der var intet felt at skrive i.
  const qInput = document.getElementById('filter-q');
  if (qInput){
    let qTimer;
    qInput.addEventListener('input', () => {
      clearTimeout(qTimer);
      qTimer = setTimeout(() => { state.q = qInput.value.trim(); state.page = 1; render(); }, 250);
    });
    document.getElementById('filter-q-clear')?.addEventListener('click', () => {
      qInput.value = ''; state.q = ''; state.page = 1; render(); qInput.focus();
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

  const resetAll = () => { state = { ...EMPTY_STATE, types: [], brands: [], models: [], regions: [], conditions: [], service: [], equipment: [], fuels: [], drives: [], cylinders: [], colors: [] }; render(); };
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

  const overlay = document.getElementById('filters-overlay');
  const setOverlay = (open) => {
    overlay.classList.toggle('open', open);
    // Skjuler cookiebanneret, så det ikke dækker skuffens knapper.
    document.body.classList.toggle('overlay-open', open);
  };
  // Skuffen bygges færdig i samme klik som den åbnes — brugeren har allerede
  // ventet på sit tryk, og panelet er tegnet inden overgangen er kørt.
  document.getElementById('open-filters-btn').addEventListener('click', () => {
    ensureFiltersBuilt();
    setOverlay(true);
  });
  overlay.querySelectorAll('[data-close-filters]').forEach(el => el.addEventListener('click', () => setOverlay(false)));
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
