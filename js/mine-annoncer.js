/* Listerække i Bilbasen-stil: foto til venstre, titel + pris øverst, en
   kolonnerække med nøgletal, og handlinger nederst. Bruges til både mine
   annoncer og favoritter. */
function listingRowHTML(l, { owned } = {}){
  const brand = escapeHTML(l.brand), model = escapeHTML(l.model);
  const url = `annonce.html?id=${l.id}`;
  const spec = (label, value) => `<div class="lr-spec"><span>${label}</span><b>${value}</b></div>`;
  return `
  <article class="listing-row" data-listing-id="${l.id}">
    <a class="lr-media" href="${url}" aria-label="Se annonce: ${brand} ${model}">
      ${listingMediaHTML(l, `${brand} ${model}`)}
      ${isNewListing(l.createdAt) ? '<span class="badge badge-new lr-badge">Ny</span>' : ''}
    </a>
    <div class="lr-body">
      <div class="lr-head">
        <a class="lr-title" href="${url}">${brand} ${model}</a>
        <div class="lr-price">${formatPrice(l.price)}</div>
      </div>
      <div class="lr-specs">
        ${spec('Årgang', l.year)}
        ${spec('Km-stand', formatKm(l.km))}
        ${spec('Motor', formatCcm(l.ccm))}
        ${spec('Sælger', l.isDealer ? 'Forhandler' : 'Privat')}
      </div>
      <div class="lr-actions">
        <a class="lr-similar" href="soegning.html?type=${encodeURIComponent(l.type)}">${Icon.search}Se lignende motorcykler</a>
        <div class="lr-buttons">
          ${owned
            ? `<a class="btn btn-outline btn-sm" href="opret-annonce.html?rediger=${encodeURIComponent(l.id)}">${Icon.edit}Rediger</a>
               <button type="button" class="lr-trash" data-delete-listing="${l.id}" aria-label="Slet annonce">${Icon.trash}</button>`
            : `<button type="button" class="lr-fav active" data-fav-toggle="${l.id}" aria-pressed="true" aria-label="Fjern fra favoritter">${Icon.heart}</button>`}
        </div>
      </div>
    </div>
  </article>`;
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

function renderMine(){
  const mine = sortListings(Store.getMyListings(), document.getElementById('mine-sort')?.value);
  const grid = document.getElementById('mine-grid');
  const empty = document.getElementById('mine-empty');
  setCount('count-mine', mine.length);
  setCount('mine-count-inline', mine.length);
  document.querySelector('.list-toolbar')?.style.setProperty('display', mine.length ? '' : 'none');
  if (!mine.length){
    grid.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  grid.style.display = '';
  empty.style.display = 'none';
  grid.innerHTML = mine.map(l => listingRowHTML(l, { owned: true })).join('');
  grid.querySelectorAll('[data-delete-listing]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Er du sikker på, at du vil slette denne annonce? Det kan ikke fortrydes.')) return;
      const id = btn.dataset.deleteListing;

      // Databaseannoncer har uuid som id. Tidligere blev id'et kørt gennem
      // Number() og endte som NaN, så sletningen ramte kun localStorage og
      // annoncen blev liggende i databasen.
      if (isUuid(id)){
        btn.disabled = true;
        const { error } = await db.deleteListing(id);
        if (error){
          btn.disabled = false;
          toast('Annoncen kunne ikke slettes: ' + error.message);
          return;
        }
        window.REMOTE_LISTINGS = (window.REMOTE_LISTINGS || []).filter(l => l.id !== id);
      } else {
        Store.removeMyListing(id);
      }
      toast('Annonce slettet');
      renderMine();
    });
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
  setCount('count-fav', favs.length);
  setCount('fav-count-inline', favs.length);
  document.querySelector('#tab-favoritter .list-toolbar')?.style.setProperty('display', favs.length ? '' : 'none');
  if (!favs.length){
    grid.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  grid.style.display = '';
  empty.style.display = 'none';
  grid.innerHTML = favs.map(l => listingRowHTML(l, { owned: false })).join('');
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
  setCount('count-agenter', agents.length);
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
    const fresh = matches.filter(l => new Date(l.createdAt).getTime() > since).length;
    return `
    <div class="agent-item">
      <div class="agent-info">
        <div class="agent-label">${escapeHTML(a.label)}${fresh ? `<span class="agent-new">${fresh} ny${fresh === 1 ? '' : 'e'}</span>` : ''}</div>
        <div class="agent-meta">${matches.length} ${matches.length === 1 ? 'match' : 'matches'} i alt · oprettet ${new Date(a.createdAt).toLocaleDateString('da-DK')}</div>
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
  const erForhandler = user?.plan === 'dealer';

  if (erForhandler){
    card.innerHTML = `
      <h3 style="margin-bottom:6px;">Dit abonnement</h3>
      <p class="plan-badge">${Icon.shieldCheck} Forhandler · aktivt</p>
      <p style="color:var(--color-fg-muted); font-size:14px; margin:10px 0 0;">
        Du har ubegrænsede annoncer, forhandler-shop og fremhævet placering.</p>
      <button type="button" class="btn btn-outline btn-sm" id="plan-downgrade" style="margin-top:14px;">Skift til privat (test)</button>`;
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
      <p style="font-size:12px; color:var(--color-fg-muted); margin:10px 0 0;">Betaling er ikke koblet på endnu — knappen aktiverer et testabonnement.</p>`;
  }

  const skift = async (plan) => {
    const { error } = await db.devSetPlan(plan);
    if (error){ toast('Kunne ikke skifte plan: ' + error.message); return; }
    await syncSessionToStore();
    renderPlanCard();
    toast(plan === 'dealer' ? 'Du er nu forhandler (test)' : 'Skiftet til privat konto');
  };
  document.getElementById('plan-upgrade')?.addEventListener('click', () => skift('dealer'));
  document.getElementById('plan-downgrade')?.addEventListener('click', () => skift('free'));
}

function renderAccountTab(){
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

/* Hjælpe-sidebar i Bilbasen-stil — indholdet følger den aktive fane. */
function renderAside(tab){
  const aside = document.getElementById('account-aside');
  if (!aside) return;
  const kort = (titel, tekst, linkTekst, href) => `
    <div class="aside-card">
      <h3>${titel}</h3>
      <p>${tekst}</p>
      <a href="${href}" class="btn btn-outline btn-block">${linkTekst}</a>
    </div>`;
  const map = {
    mine: kort('Sælg hurtigere', 'Annoncer med billeder og fuldt udfyldt udstyr bliver set markant oftere. Gennemgå dine annoncer og gør dem færdige.', 'Opret ny annonce', 'opret-annonce.html'),
    favoritter: kort('Bikerbasen hjælper dig', 'Vil du finde flere favoritter? Søg blandt alle motorcykler og gem dem, du er interesseret i, med hjertet.', 'Søg motorcykler', 'soegning.html'),
    agenter: kort('Gå aldrig glip af en handel', 'En søgeagent holder øje for dig. Sæt dine filtre på søgesiden og gem søgningen, så tæller vi de nye annoncer der dukker op.', 'Opret en søgeagent', 'soegning.html'),
    konto: kort('Byg tillid', 'Verificerede profiler får et badge, som købere kan se. Det gør det trygt at handle med dig.', 'Se sikkerhedsråd', 'sikkerhed.html'),
  };
  aside.innerHTML = map[tab] || '';
}

function setActiveTab(tab){
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('tab-mine').style.display = tab === 'mine' ? '' : 'none';
  document.getElementById('tab-favoritter').style.display = tab === 'favoritter' ? '' : 'none';
  document.getElementById('tab-agenter').style.display = tab === 'agenter' ? '' : 'none';
  document.getElementById('tab-konto').style.display = tab === 'konto' ? '' : 'none';
  if (tab === 'konto') renderAccountTab();
  if (tab === 'agenter') renderAgents();
  renderAside(tab);
  const p = new URLSearchParams(window.location.search);
  p.set('tab', tab);
  history.replaceState(null, '', window.location.pathname + '?' + p.toString());
}

document.addEventListener('DOMContentLoaded', async () => {
  await backendReady();
  if (!Store.getUser()){
    window.location.replace('login.html?redirect=' + encodeURIComponent('mine-annoncer.html' + window.location.search));
    return;
  }

  renderHeader('mine-annoncer.html');
  document.getElementById('mine-empty-icon').innerHTML = Icon.bike;
  document.getElementById('fav-empty-icon').innerHTML = Icon.heart;
  document.getElementById('agents-empty-icon').innerHTML = Icon.bell;
  document.getElementById('agent-note-icon').innerHTML = Icon.info;

  // Fane-ikoner.
  const tabIcons = { bike: Icon.bike, heart: Icon.heart, search: Icon.bell, user: Icon.user };
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = tabIcons[el.dataset.icon] || ''; });

  renderMine();
  renderFavorites();
  renderAgents();
  renderAside('mine');

  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
  });
  document.getElementById('mine-sort').addEventListener('change', renderMine);
  document.getElementById('fav-sort').addEventListener('change', renderFavorites);
  document.addEventListener('bb:favorites-changed', renderFavorites);

  document.getElementById('delete-account-btn').addEventListener('click', () => {
    if (!confirm('Er du sikker? Din konto, dine annoncer, favoritter og bedømmelser bliver slettet permanent og kan ikke gendannes.')) return;
    Store.deleteAllData();
    window.location.href = 'index.html';
  });

  const initialTab = new URLSearchParams(window.location.search).get('tab');
  if (['favoritter','konto','agenter'].includes(initialTab)) setActiveTab(initialTab);
});
