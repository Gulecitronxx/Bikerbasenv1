function ownedCardWrapper(l){
  return `
  <div>
    ${listingCardHTML(l)}
    <div class="owned-actions">
      <a class="btn btn-outline btn-sm" href="opret-annonce.html?rediger=${encodeURIComponent(l.id)}">${Icon.edit}Rediger</a>
      <button type="button" class="btn btn-outline btn-sm" data-delete-listing="${l.id}">${Icon.trash}Slet</button>
    </div>
  </div>`;
}

function renderMine(){
  const mine = Store.getMyListings();
  const grid = document.getElementById('mine-grid');
  const empty = document.getElementById('mine-empty');
  if (!mine.length){
    grid.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  grid.style.display = '';
  empty.style.display = 'none';
  grid.innerHTML = mine.map(ownedCardWrapper).join('');
  wireFavoriteButtons(grid);
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

function renderFavorites(){
  const favIds = Store.getFavorites();
  const favs = favIds.map(id => Store.getListingById(id)).filter(Boolean);
  const grid = document.getElementById('fav-grid');
  const empty = document.getElementById('fav-empty');
  if (!favs.length){
    grid.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  grid.style.display = '';
  empty.style.display = 'none';
  grid.innerHTML = favs.map(listingCardHTML).join('');
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
        <a href="soegning.html?${a.query}" class="btn btn-outline btn-sm">Vis</a>
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

function renderAccountTab(){
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

function setActiveTab(tab){
  document.querySelectorAll('#tabs-row button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('tab-mine').style.display = tab === 'mine' ? '' : 'none';
  document.getElementById('tab-favoritter').style.display = tab === 'favoritter' ? '' : 'none';
  document.getElementById('tab-agenter').style.display = tab === 'agenter' ? '' : 'none';
  document.getElementById('tab-konto').style.display = tab === 'konto' ? '' : 'none';
  if (tab === 'konto') renderAccountTab();
  if (tab === 'agenter') renderAgents();
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

  renderMine();
  renderFavorites();

  document.querySelectorAll('#tabs-row button').forEach(btn => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
  });
  document.addEventListener('bb:favorites-changed', renderFavorites);

  document.getElementById('delete-account-btn').addEventListener('click', () => {
    if (!confirm('Er du sikker? Din konto, dine annoncer, favoritter og bedømmelser bliver slettet permanent og kan ikke gendannes.')) return;
    Store.deleteAllData();
    window.location.href = 'index.html';
  });

  const initialTab = new URLSearchParams(window.location.search).get('tab');
  if (['favoritter','konto','agenter'].includes(initialTab)) setActiveTab(initialTab);
});
