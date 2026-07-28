document.addEventListener('DOMContentLoaded', async () => {
  await backendReady();
  renderHeader('index.html');

  document.querySelectorAll('.section-link').forEach(a => {
    const span = a.querySelector('span[aria-hidden]');
    if (span) span.innerHTML = Icon.arrowRight;
  });

  // search icon into hero input
  const wrap = document.getElementById('hs-query-wrap');
  if (wrap) wrap.insertAdjacentHTML('afterbegin', Icon.search);

  // populate type select
  const typeSelect = document.getElementById('hs-type');
  TYPES.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id; opt.textContent = t.label;
    typeSelect.appendChild(opt);
  });

  // hero stats
  const ALLE = Store.getAllListings();   // databasen (+ demodata hvis slået til)
  // "+" giver kun mening ved et rundt tal man runder ned til.
  document.getElementById('stat-listings').textContent =
    ALLE.length >= 10 ? (Math.floor(ALLE.length / 10) * 10) + '+' : String(ALLE.length);

  // Curated entry points tailored to motorcycle buyers
  const POPULAR = [
    { label: 'Under 50.000 kr.', icon: 'medal', params: { maxPrice: 50000 } },
    { label: 'A2-venlig (≤ 500 ccm)', icon: 'bike', params: { ccmMax: 500 } },
    { label: 'Adventure', icon: 'mapPin', params: { type: 'adventure' } },
    { label: 'Veteran & klassisk', icon: 'clock', params: { type: 'classic' } },
    { label: 'Under 10.000 km', icon: 'gauge', params: { kmMax: 10000 } },
    { label: 'Kun forhandlere', icon: 'shieldCheck', params: { dealer: '1' } },
  ];
  // Egne seneste søgninger først (Bilbasen-mønster), derefter de kuraterede.
  const recent = Store.getRecentSearches().slice(0, 3).map(r =>
    `<a class="popular-chip" href="soegning.html?${r.query}">${Icon.clock}${escapeHTML(r.label)}</a>`);
  document.getElementById('popular-searches').innerHTML = recent.join('') + POPULAR.map(p => {
    const qs = new URLSearchParams(p.params).toString();
    return `<a class="popular-chip" href="soegning.html?${qs}">${Icon[p.icon]}${p.label}</a>`;
  }).join('');

  // Live result count that reacts to the hero filters before submitting
  const countHint = document.getElementById('hero-count-hint');
  const updateHeroCount = () => {
    const q = document.getElementById('hs-query').value.trim().toLowerCase();
    const type = document.getElementById('hs-type').value;
    const maxPrice = Number(document.getElementById('hs-price').value) || null;
    let list = Store.getAllListings();
    if (q) list = list.filter(l => `${l.brand} ${l.model}`.toLowerCase().includes(q));
    if (type) list = list.filter(l => l.type === type);
    if (maxPrice) list = list.filter(l => l.price <= maxPrice);
    const n = list.length;
    countHint.innerHTML = n
      ? `Din søgning matcher <b>${n}</b> ${n === 1 ? 'motorcykel' : 'motorcykler'} lige nu.`
      : `Ingen motorcykler matcher lige nu — prøv at udvide søgningen.`;
    document.getElementById('hs-submit').textContent = n ? `Vis ${n} ${n === 1 ? 'motorcykel' : 'motorcykler'}` : 'Søg motorcykler';
  };
  ['hs-query','hs-type','hs-price'].forEach(id =>
    document.getElementById(id).addEventListener('input', updateHeroCount));
  updateHeroCount();

  // category tiles
  const tilesMount = document.getElementById('category-tiles');
  tilesMount.innerHTML = TYPES.map(t => `
    <a href="soegning.html?type=${t.id}" class="tile">
      <span class="tile-icon">${Icon.bike}</span>
      <span>${t.label}</span>
    </a>`).join('');

  // newest listings (by date)
  const newest = [...ALLE].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);
  document.getElementById('newest-listings').innerHTML = newest.map(listingCardHTML).join('');

  // featured (curated mid-high price selection)
  const featuredPool = [...ALLE].filter(l => l.price > 60000);
  const rnd = seededRandom(7);
  const featured = featuredPool
    .map(l => ({ l, k: rnd() }))
    .sort((a,b) => a.k - b.k)
    .slice(0, 4)
    .map(x => x.l);
  // En overskrift uden indhold under ser i stykker ud — skjul hele sektionen.
  const featuredMount = document.getElementById('featured-listings');
  featuredMount.innerHTML = featured.map(listingCardHTML).join('');
  const featuredSection = featuredMount.closest('section');
  if (featuredSection) featuredSection.hidden = featured.length === 0;

  // Samme for "nyeste", hvis databasen er helt tom.
  const newestSection = document.getElementById('newest-listings').closest('section');
  if (newestSection && newest.length === 0){
    document.getElementById('newest-listings').innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        ${Icon.bike}
        <h3>Der er ingen annoncer endnu</h3>
        <p>Bliv den første til at sætte en motorcykel til salg.</p>
        <a href="opret-annonce.html" class="btn btn-primary" style="margin-top:16px;">Opret annonce</a>
      </div>`;
  }

  wireFavoriteButtons(document);

  // trust strip
  document.getElementById('trust-strip').innerHTML = `
    <div class="trust-card">
      <span class="trust-icon">${Icon.shieldCheck}</span>
      <div><h3>Verificerede forhandlere</h3><p>Forhandlere gennemgår en godkendelsesproces, så du altid ved, hvem du handler med.</p></div>
    </div>
    <div class="trust-card">
      <span class="trust-icon">${Icon.vin}</span>
      <div><h3>Fuld gennemsigtighed</h3><p>Stelnummer, registreringsstatus og ærlige specifikationer på hver annonce.</p></div>
    </div>
    <div class="trust-card">
      <span class="trust-icon">${Icon.mail}</span>
      <div><h3>Sikker kontakt</h3><p>Skriv til sælger direkte i appen, uden at dele dine oplysninger før du er klar.</p></div>
    </div>`;

  // hero search submit
  document.getElementById('hero-search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = document.getElementById('hs-query').value.trim();
    const type = document.getElementById('hs-type').value;
    const maxPrice = document.getElementById('hs-price').value;
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (type) params.set('type', type);
    if (maxPrice) params.set('maxPrice', maxPrice);
    window.location.href = 'soegning.html' + (params.toString() ? '?' + params.toString() : '');
  });
});
