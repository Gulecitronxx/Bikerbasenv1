document.addEventListener('DOMContentLoaded', () => {
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
  document.getElementById('stat-listings').textContent = LISTINGS.length + '+';

  // category tiles
  const tilesMount = document.getElementById('category-tiles');
  tilesMount.innerHTML = TYPES.map(t => `
    <a href="soegning.html?type=${t.id}" class="tile">
      <span class="tile-icon">${Icon.bike}</span>
      <span>${t.label}</span>
    </a>`).join('');

  // newest listings (by date)
  const newest = [...LISTINGS].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);
  document.getElementById('newest-listings').innerHTML = newest.map(listingCardHTML).join('');

  // featured (curated mid-high price selection)
  const featuredPool = [...LISTINGS].filter(l => l.price > 60000);
  const rnd = seededRandom(7);
  const featured = featuredPool
    .map(l => ({ l, k: rnd() }))
    .sort((a,b) => a.k - b.k)
    .slice(0, 4)
    .map(x => x.l);
  document.getElementById('featured-listings').innerHTML = featured.map(listingCardHTML).join('');

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
