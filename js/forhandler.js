function initials(name){
  return name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
}

let currentSeller = null;
let pickedStars = 5;

function starsHTML(rating){
  const full = Math.round(rating);
  return `<span class="review-stars">${Array.from({length:5}, (_,i) => Icon.star).map((s,i) => `<span style="opacity:${i < full ? 1 : 0.25}">${s}</span>`).join('')}</span>`;
}

function renderReviews(){
  const seller = currentSeller;
  const reviews = Store.getReviews(seller.name);
  document.getElementById('reviews-list').innerHTML = reviews.length ? reviews.map(r => `
    <div class="review-item">
      <div class="review-head">
        <span class="review-author">${escapeHTML(r.author)}</span>
        <span class="review-date">${new Date(r.date).toLocaleDateString('da-DK')}</span>
      </div>
      ${starsHTML(r.rating)}
      <p class="review-comment" style="margin-top:6px;">${escapeHTML(r.comment)}</p>
    </div>`).join('') : `<p style="color:var(--color-fg-muted); font-size:14px;">Ingen anmeldelser endnu.</p>`;
}

function renderStarPicker(){
  const mount = document.getElementById('star-picker');
  mount.innerHTML = Array.from({length:5}, (_,i) => `<button type="button" data-star="${i+1}" class="${i < pickedStars ? 'active' : ''}">${Icon.star}</button>`).join('');
  mount.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => { pickedStars = Number(btn.dataset.star); renderStarPicker(); });
  });
}

function renderProfile(){
  const id = new URLSearchParams(window.location.search).get('id');
  const sellerName = id ? decodeURIComponent(id) : null;
  const all = Store.getAllListings();
  const sellerListings = sellerName ? all.filter(l => l.seller.name === sellerName) : all.filter(l => l.isDealer).slice(0, 6);
  const seller = sellerListings.length ? sellerListings[0].seller : all[0].seller;
  currentSeller = seller;
  const sellerNameEsc = escapeHTML(seller.name);

  document.title = `${seller.name} — Bikerbasen`;
  document.querySelectorAll('.bc-sep').forEach(s => s.innerHTML = Icon.chevronRight);

  document.getElementById('profile-top').innerHTML = `
    <div class="avatar-lg">${initials(seller.name)}</div>
    <div class="profile-info">
      <h1>${sellerNameEsc}</h1>
      <div style="margin:6px 0 4px;">${verifiedBadgeHTML(seller)}</div>
      <div class="profile-meta">
        <span>${Icon.mapPin}${escapeHTML(seller.city)}</span>
        <span>${Icon.calendar}Medlem siden ${seller.memberSince}</span>
        <span>${seller.isDealer ? Icon.shieldCheck+'Forhandler' : Icon.user+'Privat sælger'}</span>
      </div>
    </div>
    <div class="profile-actions">
      <button type="button" class="btn btn-outline" id="reveal-phone-profile">${Icon.phone}Vis telefonnummer</button>
      <button type="button" class="btn btn-primary" id="msg-seller-btn">${Icon.mail}Skriv besked</button>
    </div>`;

  const avgRating = Store.getAverageRating(seller.name, Number(seller.rating));
  const reviewCount = Store.getReviews(seller.name).length;
  document.getElementById('profile-stats-row').innerHTML = `
    <div class="hero-stat" style="color:inherit;"><b style="color:var(--color-fg)">${avgRating ?? '–'}</b><span style="color:var(--color-fg-muted)">Bedømmelse</span></div>
    <div class="hero-stat"><b style="color:var(--color-fg)">${reviewCount}</b><span style="color:var(--color-fg-muted)">Anmeldelser</span></div>
    <div class="hero-stat"><b style="color:var(--color-fg)">${sellerListings.length}</b><span style="color:var(--color-fg-muted)">Aktive annoncer</span></div>`;

  const grid = document.getElementById('seller-listings');
  grid.innerHTML = sellerListings.length ? sellerListings.map(listingCardHTML).join('') :
    `<div class="empty-state">${Icon.search}<h3>Ingen aktive annoncer</h3><p>Denne sælger har ikke nogen annoncer i øjeblikket.</p></div>`;
  wireFavoriteButtons(grid);

  document.getElementById('seller-about').textContent = seller.isDealer
    ? `${seller.name} er en registreret forhandler på Bikerbasen med fokus på kvalitetskontrollerede motorcykler og gennemsigtig stand-vurdering.`
    : `${seller.name} er en privat sælger på Bikerbasen. Kontakt sælger direkte for spørgsmål om annoncerne.`;
  document.getElementById('seller-company-info').innerHTML = (seller.isDealer && seller.cvr)
    ? `<div class="verify-row done" style="margin-top:12px;"><div class="verify-row-info">${Icon.shieldCheck}<span>CVR-verificeret virksomhed · ${escapeHTML(seller.cvr)}</span></div></div>`
    : '';
  document.getElementById('safety-icon').innerHTML = Icon.info;
  document.getElementById('report-profile-btn').innerHTML = `${Icon.flag}Anmeld profil`;

  renderReviews();
  renderStarPicker();

  document.getElementById('reveal-phone-profile').addEventListener('click', (e) => {
    e.target.innerHTML = `${Icon.phone}<span class="phone-reveal">${seller.phone}</span>`;
    e.target.disabled = true;
  });
  document.getElementById('msg-seller-btn').addEventListener('click', () => {
    if (sellerListings[0]) window.location.href = `annonce.html?id=${sellerListings[0].id}`;
  });
  document.getElementById('report-profile-btn').addEventListener('click', () => {
    openReportModal('profile', seller.name, seller.name);
  });
  document.getElementById('review-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const author = document.getElementById('review-author').value.trim() || 'Anonym bruger';
    const comment = document.getElementById('review-comment').value.trim();
    Store.addReview(seller.name, { author, rating: pickedStars, comment, date: new Date().toISOString() });
    e.target.reset();
    pickedStars = 5;
    renderStarPicker();
    renderReviews();
    const avg = Store.getAverageRating(seller.name, Number(seller.rating));
    const count = Store.getReviews(seller.name).length;
    document.querySelector('.profile-stats-row .hero-stat b').textContent = avg ?? '–';
    document.querySelectorAll('.profile-stats-row .hero-stat b')[1].textContent = count;
    toast('Tak for din bedømmelse');
  });

  document.querySelectorAll('#profile-tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#profile-tabs button').forEach(b => b.classList.toggle('active', b === btn));
      document.getElementById('tab-annoncer').style.display = btn.dataset.tab === 'annoncer' ? '' : 'none';
      document.getElementById('tab-anmeldelser').style.display = btn.dataset.tab === 'anmeldelser' ? '' : 'none';
      document.getElementById('tab-om').style.display = btn.dataset.tab === 'om' ? '' : 'none';
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderHeader(null);
  renderProfile();
});
