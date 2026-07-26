const PAGE_SIZE = 12;
let state = {
  q: '', types: [], brands: [], priceMin: null, priceMax: null,
  yearMin: null, yearMax: null, kmMax: null, ccmMin: null, ccmMax: null,
  regions: [], conditions: [], sort: 'date-desc', page: 1,
};

function readStateFromURL(){
  const p = new URLSearchParams(window.location.search);
  state.q = p.get('q') || '';
  state.types = (p.get('type') || p.get('types') || '').split(',').filter(Boolean);
  state.brands = (p.get('brands') || '').split(',').filter(Boolean);
  state.priceMin = numOrNull(p.get('priceMin'));
  state.priceMax = numOrNull(p.get('maxPrice') || p.get('priceMax'));
  state.yearMin = numOrNull(p.get('yearMin'));
  state.yearMax = numOrNull(p.get('yearMax'));
  state.kmMax = numOrNull(p.get('kmMax'));
  state.ccmMin = numOrNull(p.get('ccmMin'));
  state.ccmMax = numOrNull(p.get('ccmMax'));
  state.regions = (p.get('regions') || '').split(',').filter(Boolean);
  state.conditions = (p.get('conditions') || '').split(',').filter(Boolean);
  state.sort = p.get('sort') || 'date-desc';
  state.page = numOrNull(p.get('page')) || 1;
}
function numOrNull(v){ return (v === null || v === '' || isNaN(Number(v))) ? null : Number(v); }

function writeStateToURL(){
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  if (state.types.length) p.set('types', state.types.join(','));
  if (state.brands.length) p.set('brands', state.brands.join(','));
  if (state.priceMin) p.set('priceMin', state.priceMin);
  if (state.priceMax) p.set('priceMax', state.priceMax);
  if (state.yearMin) p.set('yearMin', state.yearMin);
  if (state.yearMax) p.set('yearMax', state.yearMax);
  if (state.kmMax) p.set('kmMax', state.kmMax);
  if (state.ccmMin) p.set('ccmMin', state.ccmMin);
  if (state.ccmMax) p.set('ccmMax', state.ccmMax);
  if (state.regions.length) p.set('regions', state.regions.join(','));
  if (state.conditions.length) p.set('conditions', state.conditions.join(','));
  if (state.sort !== 'date-desc') p.set('sort', state.sort);
  if (state.page > 1) p.set('page', state.page);
  const qs = p.toString();
  history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''));
}

function populateFilterUI(){
  document.getElementById('filter-types').innerHTML = TYPES.map(t =>
    `<button type="button" class="chip" data-type="${t.id}">${t.label}</button>`).join('');

  document.getElementById('filter-brands').innerHTML = Object.keys(BRANDS_BY_MODEL).sort().map(b =>
    `<label class="checkbox-row"><input type="checkbox" data-brand="${b}">${b}</label>`).join('');

  document.getElementById('filter-regions').innerHTML = REGIONS.map(r =>
    `<label class="checkbox-row"><input type="checkbox" data-region="${r}">${r}</label>`).join('');

  document.getElementById('filter-conditions').innerHTML = CONDITIONS.map(c =>
    `<label class="checkbox-row"><input type="checkbox" data-condition="${c}">${c}</label>`).join('');

  document.getElementById('filter-icon-mount').innerHTML = Icon.filter;
  document.getElementById('empty-icon').innerHTML = Icon.search;
  document.getElementById('bc-sep-1').innerHTML = Icon.chevronRight;
  document.querySelectorAll('.filter-group summary .chev').forEach(c => c.innerHTML = Icon.chevronDown);
  document.querySelector('.filters-close').innerHTML = Icon.close;
}

function reflectStateToUI(){
  document.querySelectorAll('#filter-types .chip').forEach(chip => {
    chip.classList.toggle('active', state.types.includes(chip.dataset.type));
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
  document.getElementById('filter-price-min').value = state.priceMin || '';
  document.getElementById('filter-price-max').value = state.priceMax || '';
  document.getElementById('filter-year-min').value = state.yearMin || '';
  document.getElementById('filter-year-max').value = state.yearMax || '';
  document.getElementById('filter-km-max').value = state.kmMax || '';
  document.getElementById('filter-ccm-min').value = state.ccmMin || '';
  document.getElementById('filter-ccm-max').value = state.ccmMax || '';
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
  if (state.regions.length) list = list.filter(l => state.regions.includes(l.region));
  if (state.conditions.length) list = list.filter(l => state.conditions.includes(l.condition));

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
  state.regions.forEach(r => pills.push({ label: r, clear: () => state.regions = state.regions.filter(x=>x!==r) }));
  state.conditions.forEach(c => pills.push({ label: c, clear: () => state.conditions = state.conditions.filter(x=>x!==c) }));
  return pills;
}

function render(){
  writeStateToURL();
  reflectStateToUI();

  const pills = activeFilterPills();
  document.getElementById('active-filters').innerHTML = pills.map((p, i) =>
    `<span class="active-filter-pill">${p.label}<button type="button" data-pill-clear="${i}" aria-label="Fjern filter: ${p.label}">${Icon.close}</button></span>`).join('');
  document.querySelectorAll('[data-pill-clear]').forEach(btn => {
    btn.addEventListener('click', () => { pills[Number(btn.dataset.pillClear)].clear(); state.page = 1; render(); });
  });

  const filtered = getFilteredListings();
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  state.page = Math.min(state.page, totalPages);
  const pageItems = filtered.slice((state.page-1)*PAGE_SIZE, state.page*PAGE_SIZE);

  document.getElementById('results-count').innerHTML = `${total} <span>${total===1?'annonce fundet':'annoncer fundet'}</span>`;

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

  document.getElementById('sort-select').addEventListener('change', (e) => { state.sort = e.target.value; render(); });

  const resetAll = () => { state = { q:'', types:[], brands:[], priceMin:null, priceMax:null, yearMin:null, yearMax:null, kmMax:null, ccmMin:null, ccmMax:null, regions:[], conditions:[], sort:'date-desc', page:1 }; render(); };
  document.getElementById('clear-filters').addEventListener('click', resetAll);
  document.getElementById('clear-filters-mobile').addEventListener('click', resetAll);
  document.getElementById('empty-clear-btn').addEventListener('click', resetAll);

  const overlay = document.getElementById('filters-overlay');
  document.getElementById('open-filters-btn').addEventListener('click', () => overlay.classList.add('open'));
  overlay.querySelectorAll('[data-close-filters]').forEach(el => el.addEventListener('click', () => overlay.classList.remove('open')));
}

document.addEventListener('DOMContentLoaded', () => {
  renderHeader('soegning.html');
  populateFilterUI();
  readStateFromURL();
  wireControls();
  render();
});
