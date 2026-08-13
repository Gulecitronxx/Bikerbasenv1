const PAGE_SIZE = 12;
const EMPTY_STATE = {
  q: '', types: [], brands: [], priceMin: null, priceMax: null,
  yearMin: null, yearMax: null, kmMax: null, ccmMin: null, ccmMax: null,
  hkMin: null, hkMax: null,
  regions: [], conditions: [], equipment: [], fuels: [], drives: [],
  service: [],
  cylinders: [], colors: [], maxAgeDays: null, photosOnly: false,
  ejereMax: null, nysynet: false,
  dealerOnly: false, koerekort: '', sort: 'date-desc', page: 1,
};
let state = { ...EMPTY_STATE };

/* Feltnavne i URL'en. Listen bruges begge veje, så et nyt filter kun skal
   tilføjes ét sted for at kunne deles, bogmærkes og gemmes som søgeagent. */
const LIST_PARAMS = {
  types: 'types', brands: 'brands', regions: 'regions', conditions: 'conditions',
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

function populateFilterUI(){
  document.getElementById('filter-types').innerHTML = TYPES.map(t =>
    `<button type="button" class="chip" data-type="${t.id}">${t.label}</button>`).join('');

  document.getElementById('filter-brands').innerHTML = Object.keys(BRANDS_BY_MODEL).sort().map(b =>
    `<label class="checkbox-row"><input type="checkbox" data-brand="${b}">${b}</label>`).join('');

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

  document.getElementById('filter-icon-mount').innerHTML = Icon.filter;
  document.getElementById('empty-icon').innerHTML = Icon.search;
  document.getElementById('bc-sep-1').innerHTML = Icon.chevronRight;
  document.querySelectorAll('.filter-group summary .chev').forEach(c => c.innerHTML = Icon.chevronDown);
  document.querySelector('.filters-close').innerHTML = Icon.close;
  document.getElementById('view-grid').innerHTML = Icon.grid;
  document.getElementById('view-list').innerHTML = Icon.list;
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
  document.getElementById('save-search-icon').innerHTML = saved ? Icon.checkCircle : Icon.bell;
  document.getElementById('save-search-label').textContent = saved ? 'Søgning gemt' : 'Gem søgning';
  btn.classList.toggle('is-saved', saved);
}

function applyViewMode(){
  const mode = Store.getViewMode();
  const grid = document.getElementById('results-grid');
  grid.classList.toggle('list-view', mode === 'list');
  document.getElementById('view-grid').classList.toggle('active', mode === 'grid');
  document.getElementById('view-list').classList.toggle('active', mode === 'list');
  document.getElementById('view-grid').setAttribute('aria-pressed', mode === 'grid');
  document.getElementById('view-list').setAttribute('aria-pressed', mode === 'list');
}

function reflectStateToUI(){
  document.querySelectorAll('#filter-types .chip').forEach(chip => {
    chip.classList.toggle('active', state.types.includes(chip.dataset.type));
  });
  document.querySelectorAll('#filter-koerekort .chip').forEach(ch => {
    ch.classList.toggle('active', state.koerekort === ch.dataset.koerekort);
  });
  document.querySelectorAll('#filter-brands input').forEach(cb => {
    cb.checked = state.brands.includes(cb.dataset.brand);
  });
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
  document.getElementById('filter-photos-only').checked = state.photosOnly;
  document.getElementById('filter-dealer-only').checked = state.dealerOnly;
  document.getElementById('filter-nysynet').checked = state.nysynet;
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

function getFilteredListings(){
  let list = Store.getAllListings();
  const q = state.q.trim().toLowerCase();
  if (q) list = list.filter(l => `${l.brand} ${l.model}`.toLowerCase().includes(q));
  if (state.types.length) list = list.filter(l => state.types.includes(l.type));
  if (state.brands.length) list = list.filter(l => state.brands.includes(l.brand));
  if (state.priceMin != null) list = list.filter(l => l.price >= state.priceMin);
  if (state.priceMax != null) list = list.filter(l => l.price <= state.priceMax);
  if (state.yearMin != null) list = list.filter(l => l.year >= state.yearMin);
  if (state.yearMax != null) list = list.filter(l => l.year <= state.yearMax);
  if (state.kmMax != null) list = list.filter(l => l.km <= state.kmMax);
  if (state.ccmMin != null) list = list.filter(l => l.ccm >= state.ccmMin);
  if (state.ccmMax != null) list = list.filter(l => l.ccm <= state.ccmMax);
  if (state.hkMin != null) list = list.filter(l => (l.power || 0) >= state.hkMin);
  if (state.hkMax != null) list = list.filter(l => (l.power || 0) <= state.hkMax);
  if (state.regions.length) list = list.filter(l => state.regions.includes(l.region));
  if (state.conditions.length) list = list.filter(l => state.conditions.includes(l.condition));
  if (state.service.length) list = list.filter(l => state.service.includes(l.serviceHistorik));

  // Udstyr er et OG-filter: vælger man ABS og varmehåndtag, vil man have
  // begge dele. Brændstof, træktype, farve og cylindre er ELLER inden for
  // hver gruppe — dér leder man efter én af flere acceptable værdier.
  if (state.equipment.length){
    list = list.filter(l => state.equipment.every(e => (l.equipment || []).includes(e)));
  }
  if (state.fuels.length) list = list.filter(l => state.fuels.includes(l.fuel));
  if (state.drives.length) list = list.filter(l => state.drives.includes(l.drive));
  if (state.colors.length) list = list.filter(l => state.colors.includes(l.color));
  if (state.cylinders.length) list = list.filter(l => state.cylinders.includes(Number(l.cylinders)));

  if (state.maxAgeDays != null){
    const cutoff = Date.now() - state.maxAgeDays * 86400000;
    list = list.filter(l => new Date(l.createdAt).getTime() >= cutoff);
  }
  if (state.photosOnly) list = list.filter(l => (l.photoUrls || []).length > 0);
  if (state.dealerOnly) list = list.filter(l => l.isDealer);
  if (state.ejereMax != null) list = list.filter(l => l.antalEjere != null && l.antalEjere <= state.ejereMax);
  if (state.nysynet) { const y = new Date().getFullYear(); list = list.filter(l => l.sidsteSyn != null && l.sidsteSyn >= y - 1); }
  if (state.koerekort) list = list.filter(l => passerKoerekort(l, state.koerekort));

  const sorters = {
    'date-desc': (a,b) => new Date(b.createdAt) - new Date(a.createdAt),
    'price-asc': (a,b) => a.price - b.price,
    'price-desc': (a,b) => b.price - a.price,
    'year-desc': (a,b) => b.year - a.year,
    'km-asc': (a,b) => a.km - b.km,
  };
  list.sort(sorters[state.sort] || sorters['date-desc']);
  return list;
}

function activeFilterPills(){
  const pills = [];
  state.types.forEach(t => pills.push({ label: typeLabel(t), clear: () => state.types = state.types.filter(x=>x!==t) }));
  state.brands.forEach(b => pills.push({ label: b, clear: () => state.brands = state.brands.filter(x=>x!==b) }));
  if (state.priceMin != null || state.priceMax != null){
    pills.push({ label: `${state.priceMin?formatPrice(state.priceMin):'0 kr.'} – ${state.priceMax?formatPrice(state.priceMax):'∞'}`, clear: () => { state.priceMin=null; state.priceMax=null; } });
  }
  if (state.yearMin != null || state.yearMax != null){
    pills.push({ label: `Årgang ${state.yearMin||''}–${state.yearMax||''}`, clear: () => { state.yearMin=null; state.yearMax=null; } });
  }
  if (state.kmMax != null) pills.push({ label: `Maks. ${formatKm(state.kmMax)}`, clear: () => state.kmMax=null });
  if (state.ccmMin != null || state.ccmMax != null){
    pills.push({ label: `${state.ccmMin||0}–${state.ccmMax||'∞'} ccm`, clear: () => { state.ccmMin=null; state.ccmMax=null; } });
  }
  if (state.hkMin != null || state.hkMax != null){
    pills.push({ label: `${state.hkMin||0}–${state.hkMax||'∞'} hk`, clear: () => { state.hkMin=null; state.hkMax=null; } });
  }
  if (state.dealerOnly) pills.push({ label: 'Kun forhandlere', clear: () => state.dealerOnly = false });
  if (state.photosOnly) pills.push({ label: 'Kun med billeder', clear: () => state.photosOnly = false });
  if (state.ejereMax != null) pills.push({ label: `Maks. ${state.ejereMax} ejer${state.ejereMax===1?'':'e'}`, clear: () => state.ejereMax = null });
  if (state.nysynet) pills.push({ label: 'Nysynet', clear: () => state.nysynet = false });
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

function render(){
  writeStateToURL();
  reflectStateToUI();

  const pills = activeFilterPills();
  // p.label kan stamme fra URL-parametre (brands, regions, conditions, farve …)
  // og er dermed angriberstyret. Escapes i BÅDE tekst- og attribut-kontekst,
  // ellers er ?brands=<img onerror=…> reflekteret XSS via et delt link.
  document.getElementById('active-filters').innerHTML = pills.map((p, i) =>
    `<span class="active-filter-pill">${escapeHTML(p.label)}<button type="button" data-pill-clear="${i}" aria-label="Fjern filter: ${escapeHTML(p.label)}">${Icon.close}</button></span>`).join('');
  document.querySelectorAll('[data-pill-clear]').forEach(btn => {
    btn.addEventListener('click', () => { pills[Number(btn.dataset.pillClear)].clear(); state.page = 1; render(); });
  });

  const badge = document.getElementById('filter-badge');
  badge.textContent = pills.length;
  badge.hidden = pills.length === 0;
  refreshSaveSearchButton();
  applyViewMode();

  const filtered = getFilteredListings();
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  state.page = Math.min(state.page, totalPages);
  const pageItems = filtered.slice((state.page-1)*PAGE_SIZE, state.page*PAGE_SIZE);

  document.getElementById('results-count').innerHTML = `${total} <span>${total===1?'annonce fundet':'annoncer fundet'}</span>`;
  seoSearchResults(pageItems, document.querySelector('.search-heading').textContent);

  const grid = document.getElementById('results-grid');
  const empty = document.getElementById('empty-state');
  if (pageItems.length){
    grid.style.display = '';
    empty.style.display = 'none';
    grid.innerHTML = pageItems.map(listingCardHTML).join('');
    wireFavoriteButtons(grid);
  } else {
    grid.style.display = 'none';
    empty.style.display = 'block';
  }

  const pag = document.getElementById('pagination');
  if (totalPages <= 1){ pag.innerHTML = ''; }
  else {
    let html = '';
    for (let i=1; i<=totalPages; i++){
      html += `<button type="button" class="${i===state.page?'active':''}" data-page="${i}">${i}</button>`;
    }
    pag.innerHTML = html;
    pag.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => { state.page = Number(btn.dataset.page); render(); window.scrollTo({top:0, behavior:'smooth'}); });
    });
  }
}

function wireControls(){
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
  document.querySelectorAll('#filter-brands input').forEach(cb => {
    cb.addEventListener('change', () => {
      const b = cb.dataset.brand;
      state.brands = cb.checked ? [...state.brands, b] : state.brands.filter(x=>x!==b);
      state.page = 1; render();
    });
  });
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

  const numField = (id, key) => {
    document.getElementById(id).addEventListener('input', (e) => {
      state[key] = numOrNull(e.target.value);
      state.page = 1; render();
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

  document.getElementById('sort-select').addEventListener('change', (e) => { state.sort = e.target.value; render(); });

  const resetAll = () => { state = { ...EMPTY_STATE, types: [], brands: [], regions: [], conditions: [], service: [], equipment: [], fuels: [], drives: [], cylinders: [], colors: [] }; render(); };
  document.getElementById('clear-filters').addEventListener('click', resetAll);
  document.getElementById('clear-filters-mobile').addEventListener('click', resetAll);
  document.getElementById('empty-clear-btn').addEventListener('click', resetAll);

  document.getElementById('view-grid').addEventListener('click', () => { Store.setViewMode('grid'); applyViewMode(); });
  document.getElementById('view-list').addEventListener('click', () => { Store.setViewMode('list'); applyViewMode(); });

  document.getElementById('save-search-btn').addEventListener('click', () => {
    const qs = currentQueryString();
    const existing = Store.getSavedSearches().find(s => s.query === qs);
    if (existing){
      Store.removeSavedSearch(existing.id);
      toast('Søgeagent fjernet');
    } else {
      Store.addSavedSearch({
        query: qs,
        label: describeCurrentSearch(activeFilterPills()),
        count: getFilteredListings().length,
      });
      toast('Søgeagent oprettet — se den under Mine annoncer');
    }
    refreshSaveSearchButton();
  });

  const overlay = document.getElementById('filters-overlay');
  const setOverlay = (open) => {
    overlay.classList.toggle('open', open);
    // Skjuler cookiebanneret, så det ikke dækker skuffens knapper.
    document.body.classList.toggle('overlay-open', open);
  };
  document.getElementById('open-filters-btn').addEventListener('click', () => setOverlay(true));
  overlay.querySelectorAll('[data-close-filters]').forEach(el => el.addEventListener('click', () => setOverlay(false)));
}

document.addEventListener('DOMContentLoaded', async () => {
  await backendReady();
  renderHeader('soegning.html');
  populateFilterUI();
  readStateFromURL();
  wireControls();
  render();

  // Husk søgningen som genvej på forsiden — kun når der faktisk filtreres.
  const qs = currentQueryString();
  if (qs) Store.addRecentSearch(qs, describeCurrentSearch(activeFilterPills()));
});
