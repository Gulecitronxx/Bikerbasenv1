function initials(name){
  return name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
}

let currentSeller = null;
let pickedStars = 5;

function starsHTML(rating){
  const full = Math.round(rating);
  return `<span class="review-stars">${Array.from({length:5}, (_,i) => Icon.star).map((s,i) => `<span style="opacity:${i < full ? 1 : 0.25}">${s}</span>`).join('')}</span>`;
}

/* Databaseanmeldelser når sælgeren er en rigtig bruger; ellers de lokale
   demoanmeldelser, så profilsiderne for demodata stadig ser levende ud. */
async function loadReviews(){
  const seller = currentSeller;
  if (db.enabled && seller.id){
    const { data, error } = await db.listReviews(seller.id);
    if (!error && data){
      return data.map(r => ({
        author: r.author?.name || 'Bruger',
        rating: Number(r.rating),
        comment: r.comment,
        date: r.created_at,
      }));
    }
  }
  return Store.getReviews(seller.name);
}

async function renderReviews(){
  const reviews = await loadReviews();
  document.getElementById('reviews-list').innerHTML = reviews.length ? reviews.map(r => `
    <div class="review-item">
      <div class="review-head">
        <span class="review-author">${escapeHTML(r.author)}</span>
        <span class="review-date">${new Date(r.date).toLocaleDateString('da-DK')}</span>
      </div>
      ${starsHTML(r.rating)}
      <p class="review-comment" style="margin-top:6px;">${escapeHTML(r.comment)}</p>
    </div>`).join('') : `<p style="color:var(--color-fg-muted); font-size:14px;">Ingen anmeldelser endnu.</p>`;

  const avg = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null;
  const stats = document.querySelectorAll('.profile-stats-row .hero-stat b');
  if (stats[0]) stats[0].textContent = avg ?? '–';
  if (stats[1]) stats[1].textContent = reviews.length;
}

function renderStarPicker(){
  const mount = document.getElementById('star-picker');
  mount.innerHTML = Array.from({length:5}, (_,i) => `<button type="button" data-star="${i+1}" class="${i < pickedStars ? 'active' : ''}">${Icon.star}</button>`).join('');
  mount.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => { pickedStars = Number(btn.dataset.star); renderStarPicker(); });
  });
}

/* Viser en ærlig "findes ikke"-tilstand.

   Før faldt siden tilbage på den første sælger i listen, når id'et ikke gav
   et hit. Man kunne altså klikke ind på én sælger og få en helt anden
   persons profil, badges og annoncer serveret som om den var rigtig. */
function renderProfileNotFound(){
  document.title = 'Sælgeren findes ikke — Bikerbasen';
  Seo.setMeta('meta[name="robots"]', 'name', 'robots', 'noindex, follow');
  document.querySelectorAll('.bc-sep').forEach(s => s.innerHTML = Icon.chevronRight);
  document.getElementById('profile-top').innerHTML = `
    <div class="empty-state" style="grid-column:1/-1;">
      ${Icon.user}
      <h3>Vi kunne ikke finde sælgeren</h3>
      <p>Profilen er måske slettet, eller linket er forkert.</p>
      <a href="soegning.html" class="btn btn-primary" style="margin-top:16px;">Søg motorcykler</a>
    </div>`;
  document.getElementById('profile-stats-row').innerHTML = '';
  document.querySelector('.profile-tabs')?.remove();
  ['tab-annoncer','tab-anmeldelser','tab-om'].forEach(id => document.getElementById(id)?.remove());
}

/* Henter sælgeren ud fra seller_id.

   Tidligere blev der slået op på navn, hvilket gav to problemer: to sælgere
   med samme navn smeltede sammen til én profil, og navnet lå i URL'en.
   Annoncerne hentes direkte fra databasen frem for at filtrere den
   indlæste side, så en sælger med mange annoncer viser dem alle. */
async function hentSaelger(sellerId){
  if (!db.enabled){
    const alle = Store.getAllListings().filter(l => String(l.seller?.id ?? l.seller?.name) === String(sellerId));
    return { seller: alle[0]?.seller || null, listings: alle };
  }
  const [{ data: profil }, { data: annoncer }] = await Promise.all([
    db.getPublicProfile(sellerId),
    db.listingsBySeller(sellerId),
  ]);
  if (!profil) return { seller: null, listings: [] };
  return {
    seller: {
      id: profil.id, name: profil.name || 'Ukendt sælger', city: profil.city || '',
      isDealer: !!profil.is_dealer, company: profil.company || null,
      verified: !!profil.verified, memberSince: profil.member_since,
      rating: null, reviews: 0, phone: null,
    },
    listings: (annoncer || []).map(normalizeRemoteListing),
  };
}

async function renderProfile(){
  const sellerId = new URLSearchParams(window.location.search).get('id');
  if (!sellerId){ renderProfileNotFound(); return; }

  // Med backend er sellerId en uuid. Sender vi noget andet (et navn, en tom
  // værdi, et manipuleret link) videre til databasen, afviser Postgres det med
  // en 400 — og det er profil-id-kolonnen der er uuid. Stop før kaldet.
  const decoded = decodeURIComponent(sellerId);
  if (db.enabled && !isUuid(decoded)){ renderProfileNotFound(); return; }

  const { seller, listings: sellerListings } = await hentSaelger(decoded);
  if (!seller){ renderProfileNotFound(); return; }

  currentSeller = seller;
  const sellerNameEsc = escapeHTML(seller.name);

  seoDealerPage(seller, sellerListings.length);
  const ph1 = document.getElementById('profile-h1');
  if (ph1) ph1.textContent = seller.name;
  document.querySelectorAll('.bc-sep').forEach(s => s.innerHTML = Icon.chevronRight);

  document.getElementById('profile-top').innerHTML = `
    <div class="avatar-lg">${initials(seller.name)}</div>
    <div class="profile-info">
      <p class="profile-name">${sellerNameEsc}</p>
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

  await renderReviews();
  renderStarPicker();

  // Med rigtig backend kommer navnet fra profilen, så feltet ville være vildledende.
  const authorField = document.getElementById('review-author')?.closest('.field');
  if (authorField && db.enabled && seller.id) authorField.style.display = 'none';

  document.getElementById('reveal-phone-profile').addEventListener('click', (e) => {
    e.target.innerHTML = `${Icon.phone}<span class="phone-reveal">${escapeHTML(seller.phone)}</span>`;
    e.target.disabled = true;
  });
  document.getElementById('msg-seller-btn').addEventListener('click', () => {
    if (sellerListings[0]) window.location.href = `annonce.html?id=${sellerListings[0].id}`;
  });
  document.getElementById('report-profile-btn').addEventListener('click', () => {
    openReportModal('profile', seller.name, seller.name);
  });
  document.getElementById('review-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const comment = document.getElementById('review-comment').value.trim();

    if (db.enabled && seller.id){
      const { error } = await db.addReview(seller.id, pickedStars, comment);
      if (error){
        // Databasen håndhæver selv "én anmeldelse pr. sælger" og "ikke dig selv".
        const m = error.message || '';
        if (m.includes('no_self_review') || m.includes('duplicate key')) toast('Du har allerede bedømt denne sælger');
        else if (m.includes('not_own_profile')) toast('Du kan ikke bedømme dig selv');
        else toast(error.message);
        return;
      }
    } else {
      const author = document.getElementById('review-author').value.trim() || 'Anonym bruger';
      Store.addReview(seller.name, { author, rating: pickedStars, comment, date: new Date().toISOString() });
    }

    e.target.reset();
    pickedStars = 5;
    renderStarPicker();
    await renderReviews();
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

document.addEventListener('DOMContentLoaded', async () => {
  await backendReady();
  renderHeader(null);
  await renderProfile();
});
