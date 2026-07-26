function ownedCardWrapper(l){
  return `
  <div>
    ${listingCardHTML(l)}
    <button type="button" class="btn btn-outline btn-sm btn-block" style="margin-top:8px;" data-delete-listing="${l.id}">${Icon.trash}Slet annonce</button>
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
    btn.addEventListener('click', () => {
      if (!confirm('Er du sikker på, at du vil slette denne annonce?')) return;
      Store.removeMyListing(Number(btn.dataset.deleteListing));
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
  document.getElementById('tab-konto').style.display = tab === 'konto' ? '' : 'none';
  if (tab === 'konto') renderAccountTab();
  const p = new URLSearchParams(window.location.search);
  p.set('tab', tab);
  history.replaceState(null, '', window.location.pathname + '?' + p.toString());
}

document.addEventListener('DOMContentLoaded', () => {
  if (!Store.getUser()){
    window.location.replace('login.html?redirect=' + encodeURIComponent('mine-annoncer.html' + window.location.search));
    return;
  }

  renderHeader('mine-annoncer.html');
  document.getElementById('mine-empty-icon').innerHTML = Icon.bike;
  document.getElementById('fav-empty-icon').innerHTML = Icon.heart;

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
  if (initialTab === 'favoritter' || initialTab === 'konto') setActiveTab(initialTab);
});
