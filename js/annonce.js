let currentListing = null;
let currentPhotoIndex = 0;
let currentPhotos = [];

function getIdFromURL(){
  return new URLSearchParams(window.location.search).get('id');
}

/* Rigtige uploadede fotos når annoncen har dem; ellers de illustrerede
   placeholders, så demoannoncerne stadig ser hele ud. */
function buildPhotoSet(listing){
  const urls = listing.photoUrls || [];
  if (urls.length){
    return urls.map((u, i) =>
      `<img src="${escapeHTML(u)}" alt="${escapeHTML(listing.brand + ' ' + listing.model)} — billede ${i + 1}"
            class="card-photo" decoding="async">`);
  }
  const count = Math.max(3, listing.photos || 4);
  return Array.from({ length: count }, (_, i) =>
    bikeArtSVG(listing.type, { id: `detail-${listing.id}-${i}`, flip: i % 2 === 1 }));
}

function renderGallery(){
  const main = document.getElementById('gallery-main-img');
  main.innerHTML = currentPhotos[currentPhotoIndex];
  document.getElementById('gallery-counter').textContent = `${currentPhotoIndex+1} / ${currentPhotos.length}`;
  document.querySelectorAll('.gallery-thumbs button').forEach((b, i) => b.classList.toggle('active', i === currentPhotoIndex));
}

function shiftPhoto(dir){
  currentPhotoIndex = (currentPhotoIndex + dir + currentPhotos.length) % currentPhotos.length;
  renderGallery();
}

function initials(name){
  return name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
}

function renderListing(){
  const id = getIdFromURL();
  const listing = Store.getListingById(id);

  // Slettet annonce, forkert id eller tom database: vis en ærlig tom tilstand
  // frem for at falde tilbage på en tilfældig anden annonce.
  if (!listing){
    document.title = 'Annoncen findes ikke — Bikerbasen';
    document.getElementById('bc-current').textContent = 'Ikke fundet';
    document.querySelectorAll('.bc-sep').forEach(s => s.innerHTML = Icon.chevronRight);
    document.getElementById('listing-detail').innerHTML = `
      <div class="empty-state" style="grid-column:1/-1; padding-top:var(--space-8);">
        ${Icon.search}
        <h3>Annoncen findes ikke</h3>
        <p>Den er måske solgt og fjernet, eller linket er forkert.</p>
        <a href="soegning.html" class="btn btn-primary" style="margin-top:16px;">Søg motorcykler</a>
      </div>`;
    const similar = document.querySelector('.similar-strip');
    if (similar) similar.style.display = 'none';
    return;
  }

  currentListing = listing;
  currentPhotos = buildPhotoSet(listing);
  currentPhotoIndex = 0;

  document.title = `${listing.brand} ${listing.model} — Bikerbasen`;
  // Én h1 pr. side: den statiske i markup opdateres, så også crawlere
  // uden JavaScript ser en overskrift.
  const h1 = document.getElementById('listing-h1');
  if (h1){ h1.textContent = `${listing.brand} ${listing.model}`; }
  document.getElementById('bc-type').textContent = typeLabel(listing.type);
  document.getElementById('bc-type').href = `soegning.html?type=${listing.type}`;
  document.getElementById('bc-current').textContent = `${listing.brand} ${listing.model}`;
  document.querySelectorAll('.bc-sep').forEach(s => s.innerHTML = Icon.chevronRight);

  const fav = Store.isFavorite(listing.id);
  const brand = escapeHTML(listing.brand), model = escapeHTML(listing.model);
  const sellerName = escapeHTML(listing.seller.name);
  const avgRating = Store.getAverageRating(listing.seller.name, Number(listing.seller.rating));
  const reviewCount = Store.getReviews(listing.seller.name).length;
  const vinLooksValid = isValidVIN(listing.vin);
  const suspicious = isSuspiciouslyCheap(listing);

  document.getElementById('listing-detail').innerHTML = `
    <div>
      ${safetyBannerHTML()}
      ${suspicious ? `<div class="safety-banner" style="background:var(--color-danger-tint); color:var(--color-danger); border-color:color-mix(in srgb, var(--color-danger) 30%, transparent);">${Icon.alertTriangle}<span>Prisen er væsentligt under markedsniveau for denne type — vær ekstra opmærksom, og følg altid vores sikkerhedsråd.</span></div>` : ''}

      <div class="gallery">
        <div class="gallery-main">
          <div id="gallery-main-img"></div>
          <div class="gallery-counter" id="gallery-counter"></div>
          <button type="button" class="gallery-nav prev" aria-label="Forrige billede">${Icon.chevronLeft}</button>
          <button type="button" class="gallery-nav next" aria-label="Næste billede">${Icon.chevronRight}</button>
        </div>
        <div class="gallery-thumbs">
          ${currentPhotos.map((_, i) => `<button type="button" aria-label="Billede ${i+1}" data-thumb="${i}">${currentPhotos[i]}</button>`).join('')}
        </div>
      </div>

      <div class="listing-header">
        <div>
          <p class="listing-title">${brand} ${model}</p>
          <div class="listing-loc">${Icon.mapPin}${escapeHTML(listing.city)}, ${listing.postnr} · ${escapeHTML(listing.region)}</div>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          ${isOwnListing(listing) ? '' : `<button type="button" class="fav-btn ${fav?'active':''}" style="position:static;" aria-pressed="${fav}" aria-label="Gem annonce" data-fav-toggle="${listing.id}">${Icon.heart}</button>`}
          <div class="listing-price">${formatPrice(listing.price)}</div>
        </div>
      </div>

      ${sellerTypeNoteHTML(listing.isDealer)}

      <div class="spec-grid" style="margin-top:var(--space-4);">
        <div class="spec-item"><span class="spec-icon">${Icon.bike} Mærke</span><b>${brand}</b></div>
        <div class="spec-item"><span class="spec-icon">${Icon.info} Model</span><b>${model}</b></div>
        <div class="spec-item"><span class="spec-icon">${Icon.calendar} Årgang</span><b>${listing.year}</b></div>
        <div class="spec-item"><span class="spec-icon">${Icon.gauge} Km-stand</span><b>${formatKm(listing.km)}</b></div>
        <div class="spec-item"><span class="spec-icon">${Icon.engine} Motorstørrelse</span><b>${formatCcm(listing.ccm)}</b></div>
        <div class="spec-item"><span class="spec-icon">${Icon.engine} Effekt</span><b>${formatPower(listing.power)}</b></div>
        <div class="spec-item"><span class="spec-icon">${Icon.info} Type</span><b>${typeLabel(listing.type)}</b></div>
        <div class="spec-item"><span class="spec-icon">${Icon.checkCircle} Stand</span><b>${listing.condition}</b></div>
        <div class="spec-item"><span class="spec-icon">${Icon.shieldCheck} Registrering</span><b>${listing.registration}</b></div>
        <div class="spec-item"><span class="spec-icon">${Icon.lock} Afgift</span><b>${listing.afgift || 'Ukendt'}</b></div>
      </div>

      <div class="vin-box">
        ${Icon.vin}Stelnummer (VIN): <code>${escapeHTML(listing.vin)}</code>
        ${vinLooksValid ? `<span style="color:var(--color-success); font-weight:600; margin-left:4px;">${Icon.checkCircle} Format OK</span>` : ''}
        <button type="button" class="report-link" id="check-vin-btn" style="margin-left:auto;">${Icon.info}Tjek stelnummer</button>
      </div>

      <div class="detail-section">
        <h2>Beskrivelse</h2>
        <p class="desc">${escapeHTML(listing.description)}</p>
      </div>

      <div class="detail-section" style="margin-top:var(--space-5);">
        <button type="button" class="report-link" id="report-listing-btn">${Icon.flag}Anmeld annonce</button>
      </div>
    </div>

    <div>
      <div class="sidebar-card">
        <div class="seller-row">
          <div class="avatar">${initials(listing.seller.name)}</div>
          <div>
            <div class="seller-name">${sellerName}</div>
            <div class="seller-sub">${listing.seller.isDealer ? 'Forhandler' : 'Privat sælger'} · ${escapeHTML(listing.seller.city)}</div>
          </div>
        </div>
        <div style="margin-top:10px;">${verifiedBadgeHTML(listing.seller)}</div>
        <div class="seller-stats">
          <div class="seller-stat"><b>${avgRating ?? '–'}</b><span>Bedømmelse</span></div>
          <div class="seller-stat"><b>${reviewCount}</b><span>Anmeldelser</span></div>
          <div class="seller-stat"><b>${listing.seller.memberSince}</b><span>Medlem siden</span></div>
        </div>
        <div class="contact-actions">
          <button type="button" class="btn btn-primary btn-block" id="open-contact-modal">${Icon.mail}Skriv til sælger</button>
          <button type="button" class="btn btn-outline btn-block" id="reveal-phone-btn">${Icon.phone}Vis telefonnummer</button>
          <button type="button" class="btn btn-outline btn-block" id="open-payment-modal">${Icon.lock}Betal sikkert (MobilePay)</button>
          <button type="button" class="btn btn-outline btn-block" id="share-listing-btn">${Icon.share}Del annonce</button>
        </div>
        <div class="safety-tip">${Icon.info}<span>Mød altid sælger et sikkert sted, og betal aldrig depositum uden at have set motorcyklen fysisk.</span></div>
      </div>

      <div class="sidebar-card">
        <a href="forhandler.html?id=${encodeURIComponent(listing.seller.name)}" class="btn btn-outline btn-block">${Icon.user}Se sælgerprofil</a>
      </div>
    </div>
  `;

  document.getElementById('gallery-main-img').innerHTML = currentPhotos[0];
  document.querySelector('.gallery-nav.prev').addEventListener('click', () => shiftPhoto(-1));
  document.querySelector('.gallery-nav.next').addEventListener('click', () => shiftPhoto(1));
  document.querySelectorAll('.gallery-thumbs [data-thumb]').forEach(btn => {
    btn.addEventListener('click', () => { currentPhotoIndex = Number(btn.dataset.thumb); renderGallery(); });
  });
  renderGallery();

  wireFavoriteButtons(document);

  const revealBtn = document.getElementById('reveal-phone-btn');
  revealBtn.addEventListener('click', () => {
    revealBtn.innerHTML = `${Icon.phone}<span class="phone-reveal">${listing.seller.phone}</span>`;
    revealBtn.disabled = true;
  });

  document.getElementById('share-listing-btn').addEventListener('click', async () => {
    const url = location.href;
    const title = `${listing.brand} ${listing.model} — ${formatPrice(listing.price)}`;
    // Web Share hvor det findes (mobil); ellers kopiér linket.
    if (navigator.share){
      try { await navigator.share({ title, url }); return; }
      catch (e) { if (e.name === 'AbortError') return; /* ellers: fald til kopiering */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast('Link kopieret til udklipsholderen');
    } catch (e) {
      prompt('Kopiér linket:', url);
    }
  });

  document.getElementById('report-listing-btn').addEventListener('click', () => {
    openReportModal('listing', `${listing.brand} ${listing.model}`, listing.id);
  });

  document.getElementById('check-vin-btn').addEventListener('click', () => {
    openInfoModal('Tjek stelnummer (VIN)', `
      <p>Stelnummeret på denne annonce er <code>${escapeHTML(listing.vin)}</code>.</p>
      <p>${vinLooksValid ? 'Formatet ser gyldigt ud (11–17 tegn, kun tilladte bogstaver/cifre).' : 'Formatet kunne ikke bekræftes automatisk — vær ekstra opmærksom, og sammenlign nøje med registreringsattesten.'}</p>
      <p>Ved fremvisning bør du altid sammenligne stelnummeret på selve motorcyklen med både annoncen og registreringsattesten. Et rigtigt opslag i Motorregistret/DMR kræver en integration, som denne demo ikke har adgang til.</p>
    `);
  });

  document.getElementById('open-payment-modal').addEventListener('click', () => {
    openInfoModal('Betal sikkert via MobilePay', `
      <p>Ved almindelige køb betaler du direkte til sælger via MobilePay, når I mødes og du har godkendt motorcyklen.</p>
      <p>Ved dyrere motorcykler kan du bede sælger om at bruge Bikerbasens <strong>sikker betaling</strong>: en ekstern, PCI-certificeret betalingspartner holder pengene, indtil du har bekræftet, at du har modtaget motorcyklen som beskrevet — så du ikke sender penge direkte til en fremmed på forhånd.</p>
      <p style="margin-bottom:0;">Bikerbasen håndterer eller opbevarer aldrig dine kortoplysninger.</p>
    `);
  });

  const modal = document.getElementById('contact-modal');
  document.getElementById('open-contact-modal').addEventListener('click', () => modal.classList.add('open'));
  modal.querySelectorAll('[data-modal-close]').forEach(el => el.addEventListener('click', () => modal.classList.remove('open')));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
  document.getElementById('cf-message').value = `Hej, jeg er interesseret i din ${listing.brand} ${listing.model} fra ${listing.year}. Er den stadig til salg?`;
  document.getElementById('contact-form').addEventListener('submit', (e) => {
    e.preventDefault();
    modal.classList.remove('open');
    toast('Din besked er sendt til sælgeren');
    e.target.reset();
    document.getElementById('cf-message').value = '';
  });

  const similarMount = document.getElementById('similar-listings');
  const similar = Store.getAllListings().filter(l => l.type === listing.type && l.id !== listing.id).slice(0, 3);
  similarMount.innerHTML = similar.map(listingCardHTML).join('');
  wireFavoriteButtons(similarMount);
}

document.addEventListener('DOMContentLoaded', async () => {
  await backendReady();
  renderHeader(null);
  renderListing();
});
