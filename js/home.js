/* Strdter en bikeArtSVG-illustration ned til ren line-art: fjerner kort-
   baggrund + gulvlinje og tegner kun konturerne som ét strøg. Inline styles,
   så bike-art'ens egne .ba-svg CSS-regler ikke fylder former (fx sorte hjul
   i mørk tilstand). Genbruges af både hero og kategori-fliser. */
function stripBikeToLineArt(svg, strokeWidth){
  if (!svg) return;
  svg.querySelector('rect')?.remove();
  svg.querySelector('.ba-ground')?.remove();
  svg.querySelectorAll('path, line, circle, polygon, ellipse, polyline').forEach(el => {
    el.style.setProperty('fill', 'none');
    el.style.setProperty('stroke', 'currentColor');
    el.style.setProperty('stroke-width', strokeWidth || '3');
    el.style.setProperty('stroke-linecap', 'round');
    el.style.setProperty('stroke-linejoin', 'round');
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await backendReady();
  renderHeader('index.html');

  // Gennemsigtig hero-header: massiv baggrund så snart man scroller forbi toppen.
  const siteHeader = document.querySelector('.site-header');
  if (siteHeader){
    const onScroll = () => siteHeader.classList.toggle('is-scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

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

  const ALLE = Store.getAllListings();   // databasen (+ demodata hvis slået til)
  // Hero'ens tillidslinje er nu statiske, ærlige pointer (ingen tal der afslører
  // et tyndt lager) — se .hero-trust i markup.

  // Curated entry points tailored to motorcycle buyers. Holdt kort (5) — flere
  // chips druknede søgekortet og skubbede folden ned.
  const POPULAR = [
    { label: 'Under 50.000 kr.', icon: 'medal', params: { maxPrice: 50000 } },
    { label: 'Kan køres på A2', icon: 'bike', params: { koerekort: 'A2' } },
    { label: 'Kan køres på A1', icon: 'bike', params: { koerekort: 'A1' } },
    { label: 'Adventure', icon: 'mapPin', params: { type: 'adventure' } },
    { label: 'Under 10.000 km', icon: 'gauge', params: { kmMax: 10000 } },
  ];
  // Egne seneste søgninger først (Bilbasen-mønster), derefter de kuraterede.
  const recent = Store.getRecentSearches().slice(0, 2).map(r =>
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
      // Uden filtre: vis kun totalen, når den er stærk (≥10). Et lavt tal
      // ("1 motorcykel til salg") reklamerer for en tom markedsplads — vis intet.
      countHint.innerHTML = n >= 10
        ? `Der er <b>${Math.floor(n/10)*10}+</b> motorcykler til salg lige nu.`
        : '';
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

  // category tiles — hver type får sin egen line-art-motorcykel af netop den
  // type. Mere distinkt end ét gentaget ikon, og custom pr. kategori frem for
  // Bilbasens stock-fotos.
  const tilesMount = document.getElementById('category-tiles');
  tilesMount.innerHTML = TYPES.map(t => `
    <a href="soegning.html?type=${t.id}" class="tile">
      <span class="tile-media"><img src="img/type/${t.id}.webp" alt="" width="760" height="570" loading="lazy" decoding="async"></span>
      <span class="tile-label">${t.label}<span class="tile-go" aria-hidden="true">${Icon.arrowRight}</span></span>
    </a>`).join('');

  // Populære mærker — rigtige links til filtrerede søgninger (Bilbasens
  // vigtigste scent/SEO-aktiv). Ingen opdigtede annoncetal.
  const POPULAR_BRANDS = ['Yamaha','Honda','Suzuki','Kawasaki','BMW','Ducati','KTM','Triumph','Aprilia','Husqvarna','Vespa','Indian'];
  // Kun mærker der faktisk findes i mærkeuniverset (undgå døde links).
  const KNOWN = new Set(Object.keys(BRANDS_BY_MODEL));
  const brands = POPULAR_BRANDS.filter(b => KNOWN.has(b));
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
  // Tynd lagerbeholdning: i stedet for at stable tomme dublet-kort med line-art
  // fylder vi resten af rækken med ÉT roligt, intentionelt CTA-kort, der spænder
  // over de ledige kolonner. Læses som "her lander nye annoncer" — ikke "tomt".
  const newestMount = document.getElementById('newest-listings');
  const realCardsHTML = newest.map(listingCardHTML).join('');
  const wideCtaHTML = (span) => `
    <a class="newest-cta" href="opret-annonce.html" style="grid-column: span ${span};"
       aria-label="Opret en gratis annonce">
      <span class="newest-cta-plus">${Icon.plus}</span>
      <span class="newest-cta-copy">
        <span class="newest-cta-title">Din motorcykel kunne stå her</span>
        <span class="newest-cta-text">Opret en gratis annonce og bliv set af købere i hele Danmark — på under 5 minutter.</span>
      </span>
      <span class="newest-cta-link">Opret annonce${Icon.arrowRight}</span>
    </a>`;
  const renderNewest = () => {
    const cols = getComputedStyle(newestMount).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
    // Meget tyndt lager (1-2 annoncer): vis dem som fuldbredde-liste-kort, så den
    // ene rigtige motorcykel får vægt — det slår ét lille kort ved siden af et
    // tomt bånd, der bare reklamerer "næsten intet lager". Ingen udfylder.
    if (newest.length > 0 && newest.length < 3){
      newestMount.classList.add('list-view');
      newestMount.innerHTML = realCardsHTML;
      return;
    }
    newestMount.classList.remove('list-view');
    // Fyld en delvis række ud med ÉT solidt bånd, der spænder de ledige kolonner.
    const span = (newest.length < cols) ? cols - newest.length : 0;
    newestMount.innerHTML = realCardsHTML + (span ? wideCtaHTML(span) : '');
    newestMount.querySelector('.newest-cta')?.classList.toggle('is-wide', span >= 2);
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

  // Senest sete — kun annoncer der stadig findes/er aktive; skjul sektionen
  // helt for nye brugere (og når intet er set endnu).
  const seenIds = Store.getRecentlyViewed();
  const seen = seenIds.map(id => Store.getListingById(id))
    .filter(l => l && (l.status ? l.status === 'active' : true))
    .slice(0, 8);
  const seenSection = document.getElementById('recently-viewed-section');
  const seenMount = document.getElementById('recently-viewed');
  if (seenSection && seenMount){
    if (seen.length){
      seenMount.innerHTML = seen.map(listingCardHTML).join('');
      seenSection.hidden = false;
    } else {
      seenSection.hidden = true;
    }
  }

  wireFavoriteButtons(document);

  // trust strip
  // Rækkefølge efter køberens faktiske behov på en privatsælger-markedsplads:
  // registrering/gennemsigtighed først, så skjult kontakt, så forhandler-
  // verificering. Ingen opdigtede tal/anmeldelser.
  document.getElementById('trust-strip').innerHTML = `
    <div class="trust-card">
      <span class="trust-icon">${Icon.checkCircle}</span>
      <div><h3>Registreringsstatus på hver annonce</h3><p>Se om motorcyklen er indregistreret og afgiftsberigtiget, sammen med ærlige specifikationer — så du ved, hvad du køber, før du handler.</p></div>
    </div>
    <div class="trust-card">
      <span class="trust-icon">${Icon.mail}</span>
      <div><h3>Din kontaktinfo er skjult</h3><p>Skriv til sælger direkte på Bikerbasen. Dit telefonnummer og din e-mail deles først, når du selv vælger det.</p></div>
    </div>
    <div class="trust-card">
      <span class="trust-icon">${Icon.shieldCheck}</span>
      <div><h3>Verificerede forhandlere</h3><p>Forhandlere godkendes med CVR og MitID, så du ved præcis, hvem der står bag annoncen.</p></div>
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
