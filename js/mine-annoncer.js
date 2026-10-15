/* ============ Mine annoncer / Min profil ============
   Siden følger referencebillede 5: hero, fanelinje, statistikkort, annonceliste
   og højre sidebjælke. Alt der vises, kommer fra brugerens egne data — intet
   tal er opfundet. Annoncernes status er dem, databasen kender (listings.status:
   'active' | 'hidden' | 'sold'); der findes ingen udløbsdato, så der er hverken
   "Udløbet" eller "Forlæng". */

/* Ikoner, der ikke findes i det delte sæt (js/icons.js er låst). */
const DB_IKON = {
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4.5H6.5A2 2 0 0 0 4.5 6.5v11a2 2 0 0 0 2 2H9"/><path d="M15 8l4 4-4 4M19 12H9.5"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6v12M15 6v12"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5.5v13l10-6.5-10-6.5Z"/></svg>',
};
function dbIkon(navn){ return DB_IKON[navn] || (typeof Icon !== 'undefined' && Icon[navn]) || ''; }

/* ---------- Ren logik (testes i js/mine-annoncer.test.js) ---------- */

/* Databasens status oversat til siden: 'hidden' er en annonce, ejeren har sat
   på pause. Annoncer uden status (lokale / fra den aktive liste) er aktive. */
function listingStatus(l){
  if (l && l.status === 'hidden') return 'paused';
  if (l && l.status === 'sold') return 'sold';
  return 'active';
}

const STATUS_VISNING = {
  active: { label: 'Aktiv', cls: 'is-active' },
  paused: { label: 'På pause', cls: 'is-paused' },
  sold: { label: 'Solgt', cls: 'is-sold' },
  draft: { label: 'Kladde', cls: 'is-draft' },
};
function statusVisning(status){ return STATUS_VISNING[status] || STATUS_VISNING.active; }

/* Næste status for knappen "Sæt på pause" / "Aktivér". Kun uuid-annoncer
   (databasen) kan skifte status; lokale demo-annoncer har ingen status. */
function naesteStatus(status){
  if (status === 'active') return { status: 'hidden', knap: 'Sæt på pause', ikon: 'pause', besked: 'Annoncen er sat på pause og vises ikke i søgningen.' };
  if (status === 'paused') return { status: 'active', knap: 'Aktivér', ikon: 'play', besked: 'Annoncen er aktiv igen.' };
  return { status: 'active', knap: 'Sæt til salg igen', ikon: 'play', besked: 'Annoncen er sat til salg igen.' };
}

/* "år | km | type" som på billedet — kun de dele, der er oplyst. */
function rowMeta(l){
  const dele = [];
  if (l.year) dele.push(String(l.year));
  if (l.km != null) dele.push(formatKm(l.km));
  if (l.type) dele.push(typeLabel(l.type));
  return dele.join(' | ');
}

/* Kladden er den ene, Store.saveDraft('form', …) gemmer fra opret-flowet.
   Tom kladde (ingen af de vigtigste felter) tæller ikke. */
function draftSummary(draft){
  const f = draft && draft.form;
  if (!f) return null;
  const harIndhold = ['brand', 'model', 'year', 'km', 'price', 'description'].some(k => f[k] != null && f[k] !== '');
  if (!harIndhold) return null;
  const titel = [f.brand, f.model].filter(Boolean).join(' ').trim() || 'Ufærdig annonce';
  return { titel, meta: rowMeta(f), sted: f.city || '', pris: f.price != null && f.price !== '' ? f.price : null };
}

function initials(navn){
  const dele = String(navn || '').trim().split(/\s+/).filter(Boolean);
  if (!dele.length) return '?';
  const f = dele[0][0], l = dele.length > 1 ? dele[dele.length - 1][0] : '';
  return (f + l).toUpperCase();
}

/* Tallene i statistikkortene — beregnet af brugerens egne data. */
function oversigtTal(egne, draft, favAntal, agentAntal){
  const tael = s => egne.filter(l => listingStatus(l) === s).length;
  return {
    aktive: tael('active'), pause: tael('paused'), solgt: tael('sold'),
    kladder: draftSummary(draft) ? 1 : 0, favoritter: favAntal, agenter: agentAntal,
  };
}

/* Sorterer efter valget i værktøjslinjen. */
function sortListings(list, mode){
  const arr = list.slice();
  if (mode === 'price-desc') arr.sort((a, b) => b.price - a.price);
  else if (mode === 'price-asc') arr.sort((a, b) => a.price - b.price);
  else if (mode === 'year-desc') arr.sort((a, b) => b.year - a.year);
  else arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return arr;
}

function setCount(id, n){
  const el = document.getElementById(id);
  if (el) el.textContent = n;
}

/* ---------- Annoncelisten ---------- */

/* Alle egne annoncer, uanset status. Siden henter dem selv, fordi den fælles
   annonceliste kun indeholder aktive — en annonce på pause ville ellers
   forsvinde fra "Mine annoncer", så ejeren ikke kunne aktivere den igen. */
let EGNE_ALLE = null;

async function hentEgneAlle(){
  const bruger = Store.getUser();
  if (!bruger?.remote || typeof db === 'undefined' || !db.enabled){ EGNE_ALLE = null; return; }
  const { data, error } = await db.myListings();
  if (error || !Array.isArray(data)){ EGNE_ALLE = null; return; }
  const lokale = Store.getLocalListings();
  EGNE_ALLE = [...data.map(r => Object.assign(normalizeRemoteListing(r), { status: r.status })), ...lokale];
}

function egneListe(){ return EGNE_ALLE || Store.getMyListings(); }

function rowThumb(l, url, brand, model){
  const antal = (l.photoUrls || []).length;
  return `
    <a class="db-thumb" href="${url}" aria-label="Se annonce: ${brand} ${model}" tabindex="-1">
      ${listingMediaHTML(l, `${brand} ${model}`)}
      ${antal ? `<span class="db-photos">${Icon.camera}${antal}</span>` : ''}
    </a>`;
}

function infoBlok(l, url, brand, model){
  return `
    <div class="db-info">
      <a class="db-title" href="${url}">${brand} ${model}</a>
      <p class="db-meta">${escapeHTML(rowMeta(l))}</p>
      ${l.city ? `<p class="db-place">${Icon.mapPin}${escapeHTML(l.city)}</p>` : ''}
      <p class="db-price">${formatPrice(l.price)}</p>
    </div>`;
}

/* Række til en egen annonce (billede 5): foto, titel, 'år | km | type', sted,
   pris, statusbadge og handlinger. */
function ownRowHTML(l){
  const brand = escapeHTML(l.brand), model = escapeHTML(l.model);
  const url = `annonce.html?id=${l.id}`;
  const status = listingStatus(l);
  const v = statusVisning(status);
  const kanSkifte = isUuid(String(l.id));
  const naeste = naesteStatus(status);
  const kanRedigere = status === 'active';
  return `
  <article class="db-row ${status !== 'active' ? 'is-' + status : ''}" data-listing-id="${l.id}" data-status="${status}">
    ${rowThumb(l, url, brand, model)}
    ${infoBlok(l, url, brand, model)}
    <div class="db-status">
      <span class="db-badge ${v.cls}">${v.label}</span>
      ${l.createdAt ? `<span class="db-when">${Icon.clock}Oprettet ${escapeHTML(timeAgoDa(l.createdAt))}</span>` : ''}
    </div>
    <div class="db-actions">
      ${kanRedigere ? `<a class="btn btn-outline btn-sm" href="opret-annonce.html?rediger=${encodeURIComponent(l.id)}">${Icon.edit}Rediger</a>` : ''}
      ${kanSkifte ? `<button type="button" class="btn btn-outline btn-sm" data-status-skift="${l.id}">${dbIkon(naeste.ikon)}${naeste.knap}</button>` : ''}
      <button type="button" class="btn btn-outline btn-sm db-danger" data-delete-listing="${l.id}" aria-label="Slet annonce: ${brand} ${model}">${Icon.trash}<span class="db-lbl">Slet</span></button>
    </div>
  </article>`;
}

function draftRowHTML(k){
  return `
  <article class="db-row is-draft" data-draft-row>
    <div class="db-thumb db-thumb-draft" aria-hidden="true">${Icon.edit}</div>
    <div class="db-info">
      <a class="db-title" href="opret-annonce.html">${escapeHTML(k.titel)}</a>
      <p class="db-meta">${escapeHTML(k.meta) || 'Endnu ikke færdig'}</p>
      ${k.sted ? `<p class="db-place">${Icon.mapPin}${escapeHTML(k.sted)}</p>` : ''}
      <p class="db-price">${k.pris != null ? formatPrice(Number(k.pris)) : 'Pris ikke oplyst'}</p>
    </div>
    <div class="db-status">
      <span class="db-badge is-draft">Kladde</span>
      <span class="db-when">${Icon.info}Gemt på denne enhed</span>
    </div>
    <div class="db-actions">
      <a class="btn btn-primary btn-sm" href="opret-annonce.html">${Icon.edit}Fortsæt kladde</a>
      <button type="button" class="btn btn-outline btn-sm db-danger" data-delete-draft aria-label="Slet kladde">${Icon.trash}<span class="db-lbl">Slet</span></button>
    </div>
  </article>`;
}

/* Favoritrække: samme række, men med "Se annonce" og hjertet. */
function favRowHTML(l){
  const brand = escapeHTML(l.brand), model = escapeHTML(l.model);
  const url = `annonce.html?id=${l.id}`;
  return `
  <article class="db-row" data-listing-id="${l.id}">
    ${rowThumb(l, url, brand, model)}
    ${infoBlok(l, url, brand, model)}
    <div class="db-status"><span class="db-when">${Icon.heart}Gemt som favorit</span></div>
    <div class="db-actions">
      <a class="btn btn-outline btn-sm" href="${url}">Se annonce</a>
      <button type="button" class="db-icon-btn lr-fav active" data-fav-toggle="${l.id}" aria-pressed="true" aria-label="Fjern fra favoritter">${Icon.heart}</button>
    </div>
  </article>`;
}

/* "X visninger · Y henvendelser (30 dage)" — ægte tal fra listing_stats (ejer-RLS).
   Fejler kaldet, står der ingenting; aldrig et gættet nul. */
async function visAnnonceStatistik(grid){
  if (typeof db === 'undefined' || !db.enabled || !Store.getUser()?.remote) return;
  const { data, error } = await db.myListingStats(30);
  if (error || !data) return;
  const sum = new Map();
  for (const r of data){
    const s = sum.get(r.listing_id) || { views: 0, contacts: 0 };
    s.views += r.views || 0; s.contacts += r.contacts || 0;
    sum.set(r.listing_id, s);
  }
  grid.querySelectorAll('.db-row[data-listing-id]').forEach(row => {
    const s = sum.get(row.dataset.listingId);
    if (!s) return;
    const linje = document.createElement('span');
    linje.className = 'db-when db-stats-line';
    linje.innerHTML = `${Icon.eye}<span>${s.views} ${s.views === 1 ? 'visning' : 'visninger'} · ${s.contacts} ${s.contacts === 1 ? 'henvendelse' : 'henvendelser'}<small>seneste 30 dage</small></span>`;
    row.querySelector('.db-status')?.appendChild(linje);
  });
}

async function skiftStatus(id, btn){
  const l = egneListe().find(x => String(x.id) === String(id));
  if (!l) return;
  const naeste = naesteStatus(listingStatus(l));
  btn.disabled = true;
  const { error } = await db.updateListing(id, { status: naeste.status });
  if (error){
    btn.disabled = false;
    toast('Status kunne ikke ændres: ' + error.message, { type: 'error' });
    return;
  }
  l.status = naeste.status;
  // Den fælles liste er kun aktive annoncer — hold den i trit.
  if (naeste.status !== 'active') window.REMOTE_LISTINGS = (window.REMOTE_LISTINGS || []).filter(x => String(x.id) !== String(id));
  toast(naeste.besked);
  renderMine();
}

async function sletAnnonce(id, btn){
  if (!confirm('Er du sikker på, at du vil slette denne annonce? Det kan ikke fortrydes.')) return;
  // Databaseannoncer har uuid som id. Number() på et uuid gav NaN, så sletningen
  // ramte kun localStorage og annoncen blev liggende i databasen.
  if (isUuid(id)){
    btn.disabled = true;
    const { error } = await db.deleteListing(id);
    if (error){
      btn.disabled = false;
      toast('Annoncen kunne ikke slettes: ' + error.message, { type: 'error' });
      return;
    }
    window.REMOTE_LISTINGS = (window.REMOTE_LISTINGS || []).filter(l => l.id !== id);
    if (EGNE_ALLE) EGNE_ALLE = EGNE_ALLE.filter(l => String(l.id) !== String(id));
  } else {
    Store.removeMyListing(id);
    if (EGNE_ALLE) EGNE_ALLE = EGNE_ALLE.filter(l => String(l.id) !== String(id));
  }
  toast('Annonce slettet');
  renderMine();
}

function renderMine(){
  const mine = sortListings(egneListe(), document.getElementById('mine-sort')?.value);
  const kladde = draftSummary(Store.getDraft());
  const grid = document.getElementById('mine-grid');
  const empty = document.getElementById('mine-empty');
  const tal = oversigtTal(mine, Store.getDraft(), Store.getFavorites().length, Store.getSavedSearches().length);
  setCount('mine-count-inline', mine.length);
  setCount('stat-aktive', tal.aktive);
  setCount('stat-kladder', tal.kladder);
  const kladdeLink = document.getElementById('stat-kladde-link');
  if (kladdeLink) kladdeLink.firstChild.textContent = tal.kladder ? 'Fortsæt kladde' : 'Opret annonce';

  const harIndhold = mine.length > 0 || !!kladde;
  document.getElementById('mine-toolbar').style.display = harIndhold ? '' : 'none';
  document.getElementById('mine-create').style.display = harIndhold ? '' : 'none';
  if (!harIndhold){
    grid.style.display = 'none';
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  grid.style.display = '';
  empty.style.display = 'none';
  grid.innerHTML = (kladde ? draftRowHTML(kladde) : '') + mine.map(ownRowHTML).join('');
  visAnnonceStatistik(grid);
  grid.querySelectorAll('[data-delete-listing]').forEach(btn => {
    btn.addEventListener('click', () => sletAnnonce(btn.dataset.deleteListing, btn));
  });
  grid.querySelectorAll('[data-status-skift]').forEach(btn => {
    btn.addEventListener('click', () => skiftStatus(btn.dataset.statusSkift, btn));
  });
  grid.querySelector('[data-delete-draft]')?.addEventListener('click', () => {
    if (!confirm('Vil du slette kladden? Det kan ikke fortrydes.')) return;
    Store.clearDraft();
    toast('Kladden er slettet');
    renderMine();
  });
}

async function renderFavorites(){
  const favIds = Store.getFavorites();
  let favs = favIds.map(id => Store.getListingById(id)).filter(Boolean);

  // Favoritter der ikke er blandt de indlæste annoncer (fx uden for de
  // hentede 200) hentes enkeltvis. Uden dette kunne en gemt annonce mangle,
  // selvom hjertet i toppen talte den med — netop den uoverensstemmelse.
  const kendte = new Set(favs.map(l => String(l.id)));
  const manglende = favIds.filter(id => !kendte.has(String(id)));
  const forældede = [];
  if (manglende.length && typeof db !== 'undefined' && db.enabled){
    for (const id of manglende){
      if (!isUuid(String(id))){ forældede.push(id); continue; } // gamle demo-id'er
      const { data, error } = await db.getListing(id);
      if (data){ favs.push(normalizeRemoteListing(data)); }
      // Kun "findes ikke" (PGRST116) prunes — en netværksfejl må ikke slette
      // en favorit, brugeren stadig har.
      else if (error && error.code === 'PGRST116'){ forældede.push(id); }
    }
  } else if (manglende.length){
    // Uden backend kan kun lokale/demo-id'er opløses; resten er forældede.
    manglende.forEach(id => { if (!isUuid(String(id))) forældede.push(id); });
  }

  // Ryd forældede favoritter, så hjertet i toppen altid matcher listen.
  if (forældede.length){
    const rensede = favIds.filter(id => !forældede.includes(id));
    localStorage.setItem(Store.KEYS.favorites, JSON.stringify(rensede));
    updateFavCount();
  }

  favs = sortListings(favs, document.getElementById('fav-sort')?.value);
  const grid = document.getElementById('fav-grid');
  const empty = document.getElementById('fav-empty');
  setCount('stat-fav', favs.length);
  setCount('fav-count-inline', favs.length);
  document.querySelector('#tab-favoritter .db-list-head')?.style.setProperty('display', favs.length ? '' : 'none');
  if (!favs.length){
    grid.style.display = 'none';
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  grid.style.display = '';
  empty.style.display = 'none';
  grid.innerHTML = favs.map(favRowHTML).join('');
  wireFavoriteButtons(grid);
}

/* Count listings matching a saved search that appeared after it was created. */
function matchesForSavedSearch(search){
  const p = new URLSearchParams(search.query);
  const num = v => (v === null || v === '' || isNaN(Number(v))) ? null : Number(v);
  const csv = k => (p.get(k) || '').split(',').filter(Boolean);
  const q = (p.get('q') || '').trim().toLowerCase();
  const types = csv('types'), brands = csv('brands'), regions = csv('regions'), conditions = csv('conditions');
  const priceMin = num(p.get('priceMin')), priceMax = num(p.get('priceMax'));
  const yearMin = num(p.get('yearMin')), yearMax = num(p.get('yearMax'));
  const kmMax = num(p.get('kmMax')), ccmMin = num(p.get('ccmMin')), ccmMax = num(p.get('ccmMax'));
  const dealerOnly = p.get('dealer') === '1';

  return Store.getAllListings().filter(l => {
    if (q && !`${l.brand} ${l.model}`.toLowerCase().includes(q)) return false;
    if (types.length && !types.includes(l.type)) return false;
    if (brands.length && !brands.includes(l.brand)) return false;
    if (priceMin != null && l.price < priceMin) return false;
    if (priceMax != null && l.price > priceMax) return false;
    if (yearMin != null && l.year < yearMin) return false;
    if (yearMax != null && l.year > yearMax) return false;
    if (kmMax != null && l.km > kmMax) return false;
    if (ccmMin != null && l.ccm < ccmMin) return false;
    if (ccmMax != null && l.ccm > ccmMax) return false;
    if (regions.length && !regions.includes(l.region)) return false;
    if (conditions.length && !conditions.includes(l.condition)) return false;
    if (dealerOnly && !l.isDealer) return false;
    return true;
  });
}

function renderAgents(){
  const agents = Store.getSavedSearches();
  setCount('stat-agenter', agents.length);
  setCount('agent-count-inline', agents.length);
  const list = document.getElementById('agents-list');
  const empty = document.getElementById('agents-empty');
  if (!agents.length){
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  list.innerHTML = agents.map(a => {
    const matches = matchesForSavedSearch(a);
    const since = new Date(a.createdAt).getTime();
    /* Runde 8 (D8-S3): createdAt er med vilje null paa alle indekserede — saa
       taltes "nye" aldrig. Det, vi VED, er foerst_set: hvornaar VI saa
       annoncen foerste gang. Det er praecis det, en gemt soegning skal taelle
       fra. Etiketten siger det (title). */
    const setFoerste = l => new Date(l.indekseretFoerste || l.createdAt || 0).getTime();
    const fresh = matches.filter(l => setFoerste(l) > since).length;
    return `
    <div class="agent-item">
      <div class="agent-info">
        <div class="agent-label">${escapeHTML(a.label)}${fresh ? `<span class="agent-new" title="Set hos kilderne første gang, efter du gemte søgningen">${fresh} ny${fresh === 1 ? '' : 'e'}</span>` : ''}</div>
        <!-- "matches" er engelsk, og søgeagenten tæller præcis det, søgesiden
             tæller — dér hedder det "29 annoncer fundet" (js/search.js).
             Datoen stod desuden som 16.08.2026, mens annoncesiden og
             sælgerprofilen skriver 16. aug. 2026: samme dato, to
             skrivemåder, og den korte er repoets regel. -->
        <div class="agent-meta">${matches.length} ${matches.length === 1 ? 'annonce' : 'annoncer'} i alt · oprettet ${new Date(a.createdAt).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      </div>
      <div class="agent-actions">
        <a href="soegning.html?${escapeHTML(a.query)}" class="btn btn-outline btn-sm">Vis</a>
        <button type="button" class="icon-btn ${a.notify ? '' : 'muted'}" data-notify="${a.id}"
                aria-label="${a.notify ? 'Slå notifikationer fra' : 'Slå notifikationer til'}"
                title="${a.notify ? 'Notifikationer slået til' : 'Notifikationer slået fra'}">${a.notify ? Icon.bell : Icon.bellOff}</button>
        <button type="button" class="icon-btn" data-del-agent="${a.id}" aria-label="Slet søgeagent">${Icon.trash}</button>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('[data-notify]').forEach(b => b.addEventListener('click', () => {
    Store.toggleSavedSearchNotify(Number(b.dataset.notify));
    renderAgents();
  }));
  list.querySelectorAll('[data-del-agent]').forEach(b => b.addEventListener('click', () => {
    Store.removeSavedSearch(Number(b.dataset.delAgent));
    toast('Søgeagent slettet');
    renderAgents();
  }));
}

function renderPlanCard(){
  const card = document.getElementById('plan-card');
  if (!card) return;
  const user = Store.getUser();

  // Gratis-tilstand: ingen paywall. Alle har ubegrænset adgang lige nu.
  if (typeof FRI_ADGANG !== 'undefined' && FRI_ADGANG){
    card.innerHTML = `
      <h3 style="margin-bottom:6px;">Adgang</h3>
      <p class="plan-badge">${Icon.checkCircle} Ubegrænset · gratis</p>
      <ul class="plan-perks" style="margin-top:12px;">
        <li>${Icon.checkCircle} Opret så mange annoncer du vil</li>
        <li>${Icon.checkCircle} Gem favoritter og søgeagenter</li>
        <li>${Icon.checkCircle} Skriv direkte til sælgere</li>
      </ul>
      <p style="font-size:13px; color:var(--color-fg-muted); margin:12px 0 0;">Bikerbasen er gratis for alle i øjeblikket — både private og forhandlere.</p>`;
    return;
  }

  const erForhandler = user?.plan === 'dealer';

  if (erForhandler){
    card.innerHTML = `
      <h3 style="margin-bottom:6px;">Dit abonnement</h3>
      <p class="plan-badge">${Icon.shieldCheck} Forhandler · aktivt</p>
      <p style="color:var(--color-fg-muted); font-size:14px; margin:10px 0 0;">
        Du har ubegrænsede annoncer, forhandler-shop og fremhævet placering.</p>
      <button type="button" class="btn btn-outline btn-block" id="plan-portal" style="margin-top:14px;">Administrér abonnement</button>
      <p style="font-size:12px; color:var(--color-fg-muted); margin:10px 0 0;">Opsig, skift betalingskort eller se kvitteringer via Stripes sikre kundeportal.</p>`;
  } else {
    card.innerHTML = `
      <h3 style="margin-bottom:6px;">Bliv forhandler</h3>
      <p style="color:var(--color-fg-muted); font-size:14px; margin-bottom:12px;">
        Private konti kan have 3 aktive annoncer gratis. Som forhandler får du:</p>
      <ul class="plan-perks">
        <li>${Icon.checkCircle} Ubegrænsede annoncer</li>
        <li>${Icon.checkCircle} Egen shop-side med alle dine motorcykler</li>
        <li>${Icon.checkCircle} Forhandler-badge og fremhævet placering</li>
      </ul>
      <button type="button" class="btn btn-primary btn-block" id="plan-upgrade" style="margin-top:14px;">Bliv forhandler</button>
      <p style="font-size:12px; color:var(--color-fg-muted); margin:10px 0 0;">Sikker betaling via Stripe. Du kan opsige når som helst.</p>`;
  }

  // Rigtig betaling: send brugeren til Stripes checkout. Webhooken saetter
  // planen, naar betalingen er gaaet igennem.
  const opgrader = async (btn) => {
    btn.disabled = true; btn.textContent = 'Åbner betaling…';
    const { data, error } = await db.startCheckout();
    if (error || !data?.url){
      btn.disabled = false; btn.textContent = 'Bliv forhandler';
      toast('Betaling kunne ikke startes. Prøv igen om lidt.', { type: 'error' });
      return;
    }
    window.location.href = data.url;
  };

  // Opsigelse haandteres i Stripes kundeportal, ikke her — for nu vises kun
  // status.
  // Åbn Stripes kundeportal, hvor forhandleren selv styrer abonnementet.
  const åbnPortal = async (btn) => {
    btn.disabled = true; btn.textContent = 'Åbner…';
    const { data, error } = await db.openBillingPortal();
    if (error || !data?.url){
      btn.disabled = false; btn.textContent = 'Administrér abonnement';
      toast('Kunne ikke åbne kundeportalen. Prøv igen om lidt.');
      return;
    }
    window.location.href = data.url;
  };

  document.getElementById('plan-upgrade')?.addEventListener('click', (e) => opgrader(e.currentTarget));
  document.getElementById('plan-portal')?.addEventListener('click', (e) => åbnPortal(e.currentTarget));
}

function renderAccountTab(){
  renderProfileCard();
  renderPlanCard();
  const user = Store.getUser();
  const rows = [
    { label: 'E-mail', done: !!user.emailVerified, icon: 'mail' },
    { label: 'Telefonnummer', done: !!user.phoneVerified, icon: 'phone' },
    { label: 'Identitet (MitID)', done: !!user.mitIdVerified, icon: 'fingerprint' },
  ];
  if (user.isDealer) rows.push({ label: `Virksomhed (CVR${user.cvr ? ' · ' + user.cvr : ''})`, done: !!user.cvrVerified, icon: 'shieldCheck' });
  document.getElementById('account-verify-rows').innerHTML = rows.map(r => `
    <div class="verify-row ${r.done ? 'done' : ''}">
      <div class="verify-row-info">${Icon[r.icon]}<span>${r.label}</span></div>
      ${r.done ? `<span class="verify-status-done">${Icon.checkCircle}Bekræftet</span>` : `<span style="font-size:13px; color:var(--color-fg-muted);">Ikke bekræftet</span>`}
    </div>`).join('');
}

/* Oplysningerne fra sessionen. Der er ingen redigeringsformular — det, der
   står her, er kun det, kontoen faktisk indeholder. */
function renderProfileCard(){
  const card = document.getElementById('profile-card');
  const user = Store.getUser();
  if (!card || !user) return;
  const raekke = (label, vaerdi) => vaerdi
    ? `<div class="verify-row"><div class="verify-row-info"><span>${label}</span></div><span class="db-profile-val">${escapeHTML(String(vaerdi))}</span></div>`
    : '';
  card.innerHTML = `
    <h3 style="margin-bottom:14px;">Dine oplysninger</h3>
    ${raekke('Navn', user.name)}
    ${raekke('E-mail', user.email)}
    ${raekke('Telefon', user.phone)}
    ${raekke('Kontotype', user.isDealer ? 'Forhandler' : 'Privat sælger')}
    ${raekke('Virksomhed', user.company)}
    ${raekke('CVR', user.cvr)}
    <p style="font-size:13px; color:var(--color-fg-muted); margin:12px 0 0;">Vil du rette oplysningerne, så skriv til <a href="mailto:kontakt@bikerbasen.dk" style="color:var(--color-primary);">kontakt@bikerbasen.dk</a>.</p>`;
}

/* Kontokortet i sidebjælken: initialer, navn og e-mail fra sessionen. */
function fyldKontoKort(user){
  const set = (id, tekst) => { const el = document.getElementById(id); if (el) el.textContent = tekst; };
  set('db-avatar', initials(user.name || user.email));
  set('db-user-name', user.name || 'Din profil');
  set('db-user-mail', user.email || '');
}

/* ---------- Faner ---------- */
const DB_FANER = ['oversigt', 'mine', 'favoritter', 'agenter', 'konto'];
let AKTIV_FANE = 'oversigt';

function setActiveTab(tab, { fokus = false, scroll = false } = {}){
  if (!DB_FANER.includes(tab)) tab = 'oversigt';
  AKTIV_FANE = tab;
  document.querySelectorAll('.db-tab').forEach(b => {
    const aktiv = b.dataset.tab === tab;
    b.classList.toggle('active', aktiv);
    b.setAttribute('aria-selected', String(aktiv));
    b.tabIndex = aktiv ? 0 : -1;
    if (aktiv && fokus) b.focus();
  });
  document.querySelectorAll('.db-menu-item[data-tab-go]').forEach(b => b.classList.toggle('active', b.dataset.tabGo === tab));
  const visAnnoncer = tab === 'oversigt' || tab === 'mine';
  document.getElementById('db-stats').style.display = tab === 'oversigt' ? '' : 'none';
  document.getElementById('db-panel-annoncer').style.display = visAnnoncer ? '' : 'none';
  document.getElementById('db-panel-annoncer').setAttribute('aria-labelledby', 'tabbtn-' + (visAnnoncer ? tab : 'oversigt'));
  document.getElementById('tab-favoritter').style.display = tab === 'favoritter' ? '' : 'none';
  document.getElementById('tab-agenter').style.display = tab === 'agenter' ? '' : 'none';
  document.getElementById('tab-konto').style.display = tab === 'konto' ? '' : 'none';
  if (tab === 'konto') renderAccountTab();
  if (tab === 'agenter') renderAgents();
  const p = new URLSearchParams(window.location.search);
  p.set('tab', tab);
  history.replaceState(null, '', window.location.pathname + '?' + p.toString());
  if (scroll) document.querySelector('.db-tabbar')?.scrollIntoView({ block: 'start' });
}

function wireTabs(){
  const faner = [...document.querySelectorAll('.db-tab')];
  faner.forEach((btn, i) => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
    // Piletaster flytter mellem faner, som i et rigtigt tablist.
    btn.addEventListener('keydown', (e) => {
      const retning = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (e.key === 'Home' || e.key === 'End'){
        e.preventDefault();
        setActiveTab(faner[e.key === 'Home' ? 0 : faner.length - 1].dataset.tab, { fokus: true });
      } else if (retning){
        e.preventDefault();
        setActiveTab(faner[(i + retning + faner.length) % faner.length].dataset.tab, { fokus: true });
      }
    });
  });
  // Genveje i statistikkort og sidebjælke.
  document.querySelectorAll('[data-tab-go]').forEach(el => {
    el.addEventListener('click', () => setActiveTab(el.dataset.tabGo, { scroll: true }));
  });
  // Log ud: samme handler som headerens knap (sletter sessionen og navigerer).
  document.getElementById('db-logout')?.addEventListener('click', () => {
    const slot = document.querySelector('[data-auth-slot]');
    if (slot) slot.click(); else { Store.logout(); window.location.href = 'index.html'; }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await backendReady();
  if (!Store.getUser()){
    window.location.replace('login.html?redirect=' + encodeURIComponent('mine-annoncer.html' + window.location.search));
    return;
  }

  renderHeader('mine-annoncer.html');
  const bruger = Store.getUser();
  fyldKontoKort(bruger);
  document.querySelectorAll('.bc-sep').forEach(s => { s.innerHTML = Icon.chevronRight; });
  document.getElementById('mine-empty-icon').innerHTML = Icon.bike;
  document.getElementById('fav-empty-icon').innerHTML = Icon.heart;
  document.getElementById('agents-empty-icon').innerHTML = Icon.bell;
  document.getElementById('agent-note-icon').innerHTML = Icon.info;
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = dbIkon(el.dataset.icon); });

  await hentEgneAlle();
  renderMine();
  renderFavorites();
  renderAgents();
  wireTabs();

  document.getElementById('mine-sort').addEventListener('change', renderMine);
  document.getElementById('fav-sort').addEventListener('change', renderFavorites);
  document.addEventListener('bb:favorites-changed', renderFavorites);

  document.getElementById('delete-account-btn').addEventListener('click', () => {
    // C4 (23.08.2026): teksten lovede 'din konto og dine annoncer slettes permanent',
    // men Store.deleteAllData() rydder kun localStorage. Nu siger den, hvad der sker.
    if (!confirm('Rydder favoritter, søgeagenter, senest sete og din login-session fra denne browser. Din konto og dine annoncer i databasen bliver stående — skriv til kontakt@bikerbasen.dk for at få dem slettet. Fortsæt?')) return;
    Store.deleteAllData();
    window.location.href = 'index.html';
  });

  const params = new URLSearchParams(window.location.search);
  setActiveTab(params.get('tab') || 'oversigt');

  // Retur fra Stripe efter gennemført betaling. Webhooken sætter planen, men
  // kan være et øjeblik undervejs — hent sessionen igen og opdater kortet.
  if (params.get('abonnement') === 'ok'){
    toast('Tak! Din betaling er modtaget.');
    for (let i = 0; i < 5; i++){
      await syncSessionToStore();
      renderPlanCard();
      if (Store.getUser()?.plan === 'dealer') break;
      await new Promise(r => setTimeout(r, 1500));
    }
    // Ryd parameteren, så en genindlæsning ikke gentager beskeden.
    history.replaceState(null, '', 'mine-annoncer.html?tab=konto');
  }
});
