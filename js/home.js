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
  // Adaptiv hero-stat: et lille tal ("1") svækker førstehåndsindtrykket, så
  // under 10 annoncer viser vi en ærlig værdi-pointe i stedet. Fra 10 og op
  // bliver antallet en styrke og vises som "X+ Aktive annoncer".
  const statValue = document.getElementById('stat-listings');
  const statLabel = document.getElementById('stat-listings-label');
  if (ALLE.length >= 10){
    statValue.textContent = (Math.floor(ALLE.length / 10) * 10) + '+';
    if (statLabel) statLabel.textContent = 'Aktive annoncer';
  } else {
    statValue.textContent = 'Gratis';
    if (statLabel) statLabel.textContent = 'for private sælgere';
  }

  // Curated entry points tailored to motorcycle buyers
  const POPULAR = [
    { label: 'Under 50.000 kr.', icon: 'medal', params: { maxPrice: 50000 } },
    { label: 'Kan køres på A2', icon: 'bike', params: { koerekort: 'A2' } },
    { label: 'Kan køres på A1', icon: 'bike', params: { koerekort: 'A1' } },
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
    const mc = n === 1 ? 'motorcykel' : 'motorcykler';
    // "Din søgning" giver kun mening, når man faktisk har indtastet noget.
    // Uden filtre viser vi bare totalen af, hvad der er til salg.
    const harSøgt = q || type || maxPrice;
    if (harSøgt){
      countHint.innerHTML = n
        ? `Din søgning matcher <b>${n}</b> ${mc} lige nu.`
        : `Ingen motorcykler matcher lige nu — prøv at udvide søgningen.`;
    } else {
      countHint.innerHTML = n
        ? `Der er <b>${n}</b> ${mc} til salg lige nu.`
        : `Der er ingen motorcykler til salg lige nu.`;
    }
    // Vis kun antallet på knappen, når brugeren faktisk har filtreret — ellers
    // ville standard-CTA'en fremhæve et spinkelt "Vis 1 motorcykel". Uden
    // filtre er "Søg motorcykler" et stærkere og renere kald til handling.
    document.getElementById('hs-submit').textContent =
      (harSøgt && n) ? `Vis ${n} ${n === 1 ? 'motorcykel' : 'motorcykler'}` : 'Søg motorcykler';
  };
  ['hs-query','hs-type','hs-price'].forEach(id =>
    document.getElementById(id).addEventListener('input', updateHeroCount));
  updateHeroCount();

  // category tiles — hver type får sit nærmeste ikon, så rækken ikke er otte
  // ens cirkler (Bilbasen bruger forskellige billeder pr. kategori).
  const TYPE_ICONS = {
    sport: 'gauge', touring: 'mapPin', cruiser: 'bike', naked: 'engine',
    adventure: 'flag', scooter: 'bike', classic: 'clock', cross: 'medal',
  };
  const tilesMount = document.getElementById('category-tiles');
  tilesMount.innerHTML = TYPES.map(t => `
    <a href="soegning.html?type=${t.id}" class="tile">
      <span class="tile-icon">${Icon[TYPE_ICONS[t.id]] || Icon.bike}</span>
      <span>${t.label}</span>
    </a>`).join('');

  // Populære mærker — rigtige links til filtrerede søgninger (Bilbasens
  // vigtigste scent/SEO-aktiv). Ingen opdigtede annoncetal.
  const POPULAR_BRANDS = ['Yamaha','Honda','Suzuki','Kawasaki','BMW','Ducati','KTM','Triumph','Aprilia','Husqvarna','Vespa','Indian'];
  // Kun mærker der faktisk findes i mærkeuniverset (undgå døde links).
  const KNOWN = new Set(Object.keys(BRANDS_BY_MODEL));
  const brands = POPULAR_BRANDS.filter(b => KNOWN.has(b));
  // Stor, svag bike-silhuet som vandmærke i hero'ens højre side, så det
  // mørke felt ved siden af overskriften får brand-relevant dybde i stedet
  // for tom gradient (Bilbasen fylder sit hero med billeder).
  const heroShape = document.getElementById('hero-bg-shape');
  if (heroShape && typeof bikeArtSVG === 'function'){
    // bikeArtSVG er en kort-illustration med egen baggrund + fyldt krop. Til
    // hero'en strdter vi den ned til ren line-art: fjern kort-baggrund og
    // gulvlinje, og tegn kun konturerne som ét varmt, glødende strøg.
    heroShape.innerHTML = bikeArtSVG('sport', { flip: true, id: 'hero' });
    const svg = heroShape.querySelector('svg');
    if (svg){
      svg.querySelector('rect')?.remove();
      svg.querySelector('.ba-ground')?.remove();
      // Inline style vinder over bike-art'ens egne .ba-svg CSS-regler
      // (attributter gør ikke — derfor fyldte hjulene i mørk tilstand).
      svg.querySelectorAll('path, line, circle, polygon, ellipse, polyline').forEach(el => {
        el.style.setProperty('fill', 'none');
        el.style.setProperty('stroke', 'currentColor');
        el.style.setProperty('stroke-width', '3');
        el.style.setProperty('stroke-linecap', 'round');
        el.style.setProperty('stroke-linejoin', 'round');
      });
    }
  }

  // Bike-silhuet i sælg-båndets mini-annonce (ren SVG, ingen billeder krævet).
  const sellBike = document.getElementById('sell-band-bike');
  if (sellBike && typeof bikeArtSVG === 'function') sellBike.insertAdjacentHTML('afterbegin', bikeArtSVG('cruiser', {}));

  const brandCloud = document.getElementById('brand-cloud');
  if (brandCloud){
    brandCloud.innerHTML = brands.map(b =>
      `<a class="brand-chip" href="soegning.html?brands=${encodeURIComponent(b)}">
         <span class="brand-chip-name">${b}</span>
         <span class="brand-chip-go" aria-hidden="true">${Icon.arrowRight}</span>
       </a>`).join('');
  }

  // SEO-browse-bånd over footeren — rigtige søge-URL'er, ligesom Bilbasens
  // linkfarm. God for organisk trafik og udfylder siden meningsfuldt.
  const fillSeoCol = (id, links) => {
    const ul = document.querySelector('#' + id + ' ul');
    if (ul) ul.innerHTML = links.map(l => `<li><a href="${l.href}">${l.label}</a></li>`).join('');
  };
  fillSeoCol('seo-brands', brands.slice(0, 8).map(b => ({ label: b, href: `soegning.html?brands=${encodeURIComponent(b)}` })));
  fillSeoCol('seo-types', TYPES.map(t => ({ label: t.label, href: `soegning.html?type=${t.id}` })));
  fillSeoCol('seo-regions', (typeof REGIONS !== 'undefined' ? REGIONS : []).map(r => ({ label: r, href: `soegning.html?regions=${encodeURIComponent(r)}` })));
  fillSeoCol('seo-price', [
    { label: 'Under 30.000 kr.', href: 'soegning.html?maxPrice=30000' },
    { label: 'Under 60.000 kr.', href: 'soegning.html?maxPrice=60000' },
    { label: 'Under 100.000 kr.', href: 'soegning.html?maxPrice=100000' },
    { label: 'Kan køres på A1', href: 'soegning.html?koerekort=A1' },
    { label: 'Kan køres på A2', href: 'soegning.html?koerekort=A2' },
    { label: 'Kun forhandlere', href: 'soegning.html?dealer=1' },
  ]);

  // newest listings (by date)
  const newest = [...ALLE].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);
  // Mens databasen er ny, kan en enkelt annonce stå alene i et 4-kolonners
  // gitter med tre tomme felter ved siden af. I stedet for at opdigte
  // annoncer fylder vi rækken ud med ærlige "opret din annonce"-kort, så
  // forsiden ser levende og intentionel ud — og skubber samtidig udbud.
  const bikeSilhouettes = ['sport','cruiser','adventure','classic'];
  // Varieret tekst, så tre udfylderkort ved siden af hinanden ikke gentager
  // sig, men rammer hver sin vinkel (købers plads, sælgers genvej, "vær først").
  const FILLER_COPY = [
    { title: 'Din motorcykel her', text: 'Opret en gratis annonce og bliv set af købere i hele Danmark.' },
    { title: 'Sælger du snart?', text: 'Sæt din motorcykel til salg på under 5 minutter — helt gratis.' },
    { title: 'Vær blandt de første', text: 'Nye annoncer lander her. Kom med, mens der er god plads i toppen.' },
  ];
  const fillerCardHTML = (i) => {
    const c = FILLER_COPY[i % FILLER_COPY.length];
    return `
    <a class="card card-cta" href="opret-annonce.html" aria-label="${c.title} — opret gratis annonce">
      <div class="card-media card-cta-media">
        ${typeof bikeArtSVG === 'function' ? bikeArtSVG(bikeSilhouettes[i % bikeSilhouettes.length], {}) : ''}
      </div>
      <div class="card-body card-cta-body">
        <span class="card-cta-plus">${Icon.plus}</span>
        <h3 class="card-cta-title">${c.title}</h3>
        <p class="card-cta-text">${c.text}</p>
        <span class="card-cta-link">Opret annonce${Icon.arrowRight}</span>
      </div>
    </a>`;
  };
  // Fyld kun den igangværende række ud — antal kolonner måles på layoutet,
  // så en enkelt annonce på mobil (1 kolonne) ikke får tre udfylderkort
  // stablet under sig, mens desktop (4 kolonner) fylder rækken pænt ud.
  const newestMount = document.getElementById('newest-listings');
  const realCardsHTML = newest.map(listingCardHTML).join('');
  const renderNewest = () => {
    const cols = getComputedStyle(newestMount).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
    const need = (newest.length > 0 && newest.length < cols) ? cols - newest.length : 0;
    const fillers = Array.from({ length: need }, (_, i) => fillerCardHTML(i));
    newestMount.innerHTML = realCardsHTML + fillers.join('');
  };
  // Første render wires af den globale wireFavoriteButtons(document) nedenfor.
  renderNewest();
  // Tilpas udfylderkort, når man krydser et brudpunkt (fx rotation), og
  // gen-wire de nye kort — den globale wiring kører kun ved sideindlæsning.
  let _newestRAF;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(_newestRAF);
    _newestRAF = requestAnimationFrame(() => { renderNewest(); wireFavoriteButtons(newestMount); });
  });

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
