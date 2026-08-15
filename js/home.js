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

/* Giver hovedtråden luft mellem to bidder arbejde.

   Forsiden byggede før alt i ét træk inde i DOMContentLoaded — og først
   EFTER `await backendReady()`, altså efter databasen havde svaret. To ting
   fulgte af det: intet blev tegnet før netværket var færdigt, og selve
   opbygningen lå som lange, uafbrydelige opgaver på hovedtråden (målt i
   trace: 131ms og 67ms alene fra home.js, oven i et par styk på 150-230ms
   fra de style/layout-opdateringer hver innerHTML udløste). I den tid kan
   browseren hverken svare på tryk eller male.

   Nu bygges siden i bidder med et yield imellem. Slutresultatet er præcis
   det samme DOM — men hvert stykke arbejde bliver sin egen korte opgave,
   som browseren kan afbryde. Og de dele, der ikke kræver data (headeren,
   hele hero-søgekortet), tegnes med det samme i stedet for at vente på
   Supabase. */
const yieldToMain = () =>
  window.scheduler?.yield?.() ?? new Promise(r => setTimeout(r, 0));

/* Sætter kort ind i portioner med et yield imellem.

   Otte line-art-kort skrevet ind med ét innerHTML blev målt som én
   sammenhængende opgave på 119ms — nok til at siden føles død, hvis man
   rammer den midt i. I portioner à tre bliver ingen af dem lange nok til at
   blokere, og det samlede resultat er det samme DOM. */
async function saetIndIPortioner(mount, dele, portion = 3){
  mount.innerHTML = '';
  for (let i = 0; i < dele.length; i += portion){
    mount.insertAdjacentHTML('beforeend', dele.slice(i, i + portion).join(''));
    if (i + portion < dele.length) await yieldToMain();
  }
}

/* Bygger et annoncegitter først, når det nærmer sig viewporten.

   Annoncekort er det dyreste på siden: et kort uden foto får en komplet
   line-art-SVG med defs og gradienter, og forsiden endte med 138 svg'er i
   dokumentet. Alle tre gitre — nyeste, udvalgte og senest sete — blev bygget
   ved sideindlæsning, selvom de ligger 4000-6000px nede. Arbejdet lå altså
   præcis oven i det øjeblik, hvor brugeren prøver at bruge søgekortet
   øverst.

   800px rootMargin: gitteret er fyldt ud længe før det kommer til syne, så
   man aldrig scroller hen til et tomt felt. Har browseren ingen
   IntersectionObserver, tegnes der med det samme — indholdet må aldrig kunne
   udeblive, kun komme lidt senere. Højden er reserveret i forvejen af
   `.listings-grid:empty{min-height}` i den kritiske CSS, så der ikke hopper
   noget, når kortene lander. */
function tegnNaerViewport(el, draw){
  if (!el) return;
  let tegnet = false;
  const tegnEnGang = () => { if (tegnet) return; tegnet = true; draw(); };

  if (!('IntersectionObserver' in window)){ tegnEnGang(); return; }
  const io = new IntersectionObserver((entries) => {
    if (!entries.some(e => e.isIntersecting)) return;
    io.disconnect();
    tegnEnGang();
  }, { rootMargin: '800px 0px' });
  io.observe(el);

  /* Sikkerhedsnet — og det er ikke teori.

     IntersectionObserver kalder kun tilbage, når siden faktisk renderes. I en
     fane, der ikke komponerer billeder (document.hidden === true), udebliver
     kaldet fuldstændigt; præcis som `loading="lazy"` heller aldrig henter et
     billede dér. Uden et net ville gitrene stå tomme for evigt i sådan en
     situation, og det er den slags fejl, ingen opdager, før en bruger gør.

     Derfor: observeren er optimeringen — den tegner tidligt, når man nærmer
     sig. Det her er garantien for, at der ALTID bliver tegnet. Den venter til
     efter `load`, så den ikke konkurrerer med det, brugeren kigger på. */
  const net = () => { io.disconnect(); tegnEnGang(); };
  const planlaeg = () => (window.requestIdleCallback
    ? requestIdleCallback(net, { timeout: 3000 })
    : setTimeout(net, 1500));
  if (document.readyState === 'complete') planlaeg();
  else window.addEventListener('load', planlaeg, { once: true });
}

document.addEventListener('DOMContentLoaded', () => { buildForside(); });

async function buildForside(){
  /* ============ Bid 1: alt over folden — kræver ingen data ============
     renderHeader læser Store.getUser(), som allerede ligger i localStorage
     fra sidste besøg. backendReady() opdaterer den bagefter, hvis sessionen
     er udløbet — derfor køres de tre auth-afhængige opdateringer igen
     nedenfor (men ikke hele renderHeader: wireHeader ville binde
     lytterne to gange). */
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

  // hero search submit — bundet her, i første bid, så søgekortet virker
  // fra det øjeblik det kan ses (før lå det til allersidst).
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

  await yieldToMain();

  /* ============ Bid 2: kategorifliserne ============ */
  // category tiles — hver type får sin egen line-art-motorcykel af netop den
  // type. Mere distinkt end ét gentaget ikon, og custom pr. kategori frem for
  // Bilbasens stock-fotos.
  const tilesMount = document.getElementById('category-tiles');
  tilesMount.innerHTML = TYPES.map(t => `
    <a href="soegning.html?type=${t.id}" class="tile">
      <span class="tile-media"><img src="img/type/${t.id}.webp" alt="" width="760" height="570" loading="lazy" decoding="async"></span>
      <span class="tile-label">${t.label}<span class="tile-go" aria-hidden="true">${Icon.arrowRight}</span></span>
    </a>`).join('');

  await yieldToMain();

  /* ============ Bid 3: mærkeskyen + SEO-linkbåndet ============ */
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

  await yieldToMain();

  /* ============ Bid 4: tryghedsbåndet ============
     Rækkefølge efter køberens faktiske behov på en privatsælger-markedsplads:
     registrering/gennemsigtighed først, så skjult kontakt, så forhandler-
     verificering. Ingen opdigtede tal/anmeldelser. */
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

  /* ============ Bid 5: annoncerne — først HER venter vi på databasen ============
     Alt ovenfor er tegnet uden at røre netværket. */
  await backendReady();

  // Sessionen kan være udløbet, siden localStorage sidst blev skrevet.
  // Kun de rene opdateringer køres igen — wireHeader/initCookieConsent ville
  // binde deres lyttere en gang til.
  if (typeof updateAuthVisibility === 'function') updateAuthVisibility();
  if (typeof updateAuthSlot === 'function') updateAuthSlot();
  if (typeof updateFavCount === 'function') updateFavCount();

  const ALLE = Store.getAllListings();   // databasen (+ demodata hvis slået til)
  updateHeroCount();                     // nu med de rigtige tal fra databasen

  await yieldToMain();

  /* ============ Bid 6: nyeste annoncer ============ */
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
  const realCards = newest.map(listingCardHTML);
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
  const renderNewest = async () => {
    const cols = getComputedStyle(newestMount).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
    // Meget tyndt lager (1-2 annoncer): vis dem som fuldbredde-liste-kort, så den
    // ene rigtige motorcykel får vægt — det slår ét lille kort ved siden af et
    // tomt bånd, der bare reklamerer "næsten intet lager". Ingen udfylder.
    if (newest.length > 0 && newest.length < 3){
      newestMount.classList.add('list-view');
      await saetIndIPortioner(newestMount, realCards);
      return;
    }
    newestMount.classList.remove('list-view');
    // Fyld en delvis række ud med ÉT solidt bånd, der spænder de ledige kolonner.
    const span = (newest.length < cols) ? cols - newest.length : 0;
    await saetIndIPortioner(newestMount, span ? realCards.concat(wideCtaHTML(span)) : realCards);
    newestMount.querySelector('.newest-cta')?.classList.toggle('is-wide', span >= 2);
  };
  const tegnNyeste = () => renderNewest().then(() => wireFavoriteButtons(newestMount));
  // Er databasen helt tom, tegnes tom-tilstanden med det samme: den er
  // billig, og den bestemmer sektionens højde.
  if (newest.length === 0){
    newestMount.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        ${Icon.bike}
        <h3>Der er ingen annoncer endnu</h3>
        <p>Bliv den første til at sætte en motorcykel til salg.</p>
        <a href="opret-annonce.html" class="btn btn-primary" style="margin-top:16px;">Opret annonce</a>
      </div>`;
  } else {
    tegnNaerViewport(newestMount, tegnNyeste);
  }
  // Tilpas udfylderkort, når man krydser et brudpunkt (fx rotation), og
  // gen-wire de nye kort. Kun hvis gitteret allerede er tegnet — ellers ville
  // en rotation nå at bygge det, før man er i nærheden af det.
  let _newestRAF;
  window.addEventListener('resize', () => {
    if (!newestMount.querySelector('.card, .newest-cta')) return;
    cancelAnimationFrame(_newestRAF);
    _newestRAF = requestAnimationFrame(tegnNyeste);
  });

  /* ============ Bid 7: udvalgte + senest sete ============ */
  // featured (curated mid-high price selection)
  const featuredPool = [...ALLE].filter(l => l.price > 60000);
  const rnd = seededRandom(7);
  const featured = featuredPool
    .map(l => ({ l, k: rnd() }))
    .sort((a,b) => a.k - b.k)
    .slice(0, 4)
    .map(x => x.l);
  // En overskrift uden indhold under ser i stykker ud — skjul hele sektionen.
  // Beslutningen tages NU (den er gratis), så sektionen ikke først står som et
  // tomt bånd og forsvinder, når man scroller ned til den.
  const featuredMount = document.getElementById('featured-listings');
  const featuredSection = featuredMount.closest('section');
  if (featuredSection) featuredSection.hidden = featured.length === 0;
  if (featured.length){
    tegnNaerViewport(featuredMount, () =>
      saetIndIPortioner(featuredMount, featured.map(listingCardHTML))
        .then(() => wireFavoriteButtons(featuredMount)));
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
    seenSection.hidden = !seen.length;
    if (seen.length){
      tegnNaerViewport(seenMount, () =>
        saetIndIPortioner(seenMount, seen.map(listingCardHTML))
          .then(() => wireFavoriteButtons(seenMount)));
    }
  }

  // Kort, der allerede står i dokumentet (fx tom-tilstandens knap), samt alt
  // andet klikbart uden for gitrene. Gitrene wirer sig selv, når de tegnes.
  wireFavoriteButtons(document);
}
