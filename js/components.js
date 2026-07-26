/* ============ Header hydration ============
   Header/nav/footer markup is static real HTML in every page (crawlable and
   functional with JS disabled). These functions only enhance it: active nav
   state, favorites count, and logged-in state swap. */

function renderHeader(activeOverride){
  const header = document.querySelector('.site-header');
  if (!header) return;
  const current = activeOverride || location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a, .mobile-drawer-panel a[href]').forEach(a => {
    if (a.hasAttribute('data-auth-slot-mobile')) return;
    a.classList.toggle('active', a.getAttribute('href') === current);
  });
  updateFavCount();
  updateAuthSlot();
  wireHeader();
  initCookieConsent();
}

function updateFavCount(){
  const n = Store.getFavorites().length;
  document.querySelectorAll('[data-fav-count]').forEach(el => { el.textContent = n; el.setAttribute('data-count', n); });
  document.querySelectorAll('[data-fav-count-mobile]').forEach(el => { el.textContent = n; });
}

function updateAuthSlot(){
  const user = Store.getUser();
  if (!user) return;
  const onLogout = (e) => { e.preventDefault(); Store.logout(); window.location.href = 'index.html'; };
  const slot = document.querySelector('[data-auth-slot]');
  if (slot){
    slot.setAttribute('href', '#');
    slot.innerHTML = `${Icon.user}${user.name.split(' ')[0]} · Log ud`;
    slot.addEventListener('click', onLogout);
  }
  const slotMobile = document.querySelector('[data-auth-slot-mobile]');
  if (slotMobile){
    slotMobile.setAttribute('href', '#');
    slotMobile.innerHTML = `${Icon.user}Log ud (${user.name})`;
    slotMobile.addEventListener('click', onLogout);
  }
}

let headerWired = false;
function wireHeader(){
  if (headerWired) return;
  headerWired = true;
  const drawer = document.getElementById('mobile-drawer');
  const openBtn = document.querySelector('.mobile-menu-btn');
  if (openBtn && drawer){
    openBtn.addEventListener('click', () => drawer.classList.add('open'));
    drawer.querySelectorAll('[data-drawer-close]').forEach(el => el.addEventListener('click', () => drawer.classList.remove('open')));
  }
  const themeBtn = document.querySelector('.theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  document.addEventListener('bb:favorites-changed', updateFavCount);
}

function toast(msg, opts){
  let el = document.querySelector('.toast');
  if (!el){
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.innerHTML = `${Icon.checkCircle}<span>${msg}</span>`;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), (opts && opts.duration) || 2600);
}

/* ============ Listing card ============ */
function listingCardHTML(l){
  const fav = Store.isFavorite(l.id);
  const brand = escapeHTML(l.brand), model = escapeHTML(l.model), city = escapeHTML(l.city);
  const suspicious = isSuspiciouslyCheap(l);
  return `
  <article class="card" data-listing-id="${l.id}">
    <div class="card-media">
      ${bikeArtSVG(l.type, { id: 'card-'+l.id })}
      <div class="card-badges">
        ${isNewListing(l.createdAt) ? `<span class="badge badge-new">Ny</span>` : ''}
        ${l.isDealer ? `<span class="badge badge-dealer">${Icon.shieldCheck}Forhandler</span>` : ''}
        ${suspicious ? `<span class="badge badge-warning" title="Prisen er væsentligt under markedsniveau for typen">${Icon.alertTriangle}Tjek prisen</span>` : ''}
      </div>
      <button type="button" class="fav-btn ${fav?'active':''}" aria-pressed="${fav}" aria-label="Gem annonce" data-fav-toggle="${l.id}">${Icon.heart}</button>
    </div>
    <div class="card-body">
      <div class="card-price">${formatPrice(l.price)}</div>
      <h3 class="card-title">${brand} ${model}</h3>
      <div class="card-meta">
        <span>${Icon.calendar}${l.year}</span>
        <span>${Icon.gauge}${formatKm(l.km)}</span>
        <span>${Icon.engine}${formatCcm(l.ccm)}</span>
      </div>
      <div class="card-footer">
        <span>${Icon.mapPin}${city}</span>
        <span>${timeAgoDa(l.createdAt)}</span>
      </div>
    </div>
    <a href="annonce.html?id=${l.id}" class="card-link" aria-label="Se annonce: ${brand} ${model}, ${formatPrice(l.price)}"></a>
  </article>`;
}

/* ============ Trust badges ============ */
function verifiedBadgeHTML(seller){
  if (!seller || !seller.verified) return '';
  const label = seller.isDealer ? 'Verificeret forhandler' : 'Verificeret sælger';
  return `<span class="badge badge-verified">${Icon.shieldCheck}${label}</span>`;
}

function sellerTypeNoteHTML(isDealer){
  return isDealer
    ? `<div class="seller-type-note"><b>Forhandlerannonce.</b> Du har som privatperson reklamationsret i op til 24 måneder efter købelovens regler for erhvervsmæssigt salg.</div>`
    : `<div class="seller-type-note"><b>Privat annonce.</b> Forbrugerkøbelovens reklamationsret gælder ikke mellem private. Aftal et grundigt eftersyn og prøvetur, før du køber.</div>`;
}

/* ============ Safety banner ============ */
function safetyBannerHTML(){
  return `
  <div class="safety-banner">
    <span>${Icon.mapPin}Mød op personligt</span>
    <span class="safety-banner-sep">·</span>
    <span>${Icon.shieldCheck}Betal aldrig forud</span>
    <span class="safety-banner-sep">·</span>
    <span>${Icon.vin}Tjek stelnummer</span>
    <a href="sikkerhed.html" class="safety-banner-link">Læs gode råd${Icon.arrowRight}</a>
  </div>`;
}

/* ============ Report / notice-and-action modal ============ */
function ensureReportModal(){
  if (document.getElementById('report-modal')) return;
  const el = document.createElement('div');
  el.innerHTML = `
  <div class="modal-overlay" id="report-modal">
    <div class="modal-box">
      <div class="modal-head">
        <h2>Anmeld annonce</h2>
        <button type="button" class="icon-btn" data-report-close aria-label="Luk">${Icon.close}</button>
      </div>
      <form id="report-form">
        <p id="report-target" style="color:var(--color-fg-muted); font-size:14px; margin-bottom:16px;"></p>
        <div class="field field-full" style="margin-bottom:14px;">
          <label>Hvad er problemet? <span class="required-mark">*</span></label>
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:6px;">
            ${REPORT_REASONS.map((r,i) => `
              <label class="checkbox-row" style="min-height:auto;">
                <input type="radio" name="report-reason" value="${r.id}" ${i===0?'required':''} style="width:18px;height:18px;accent-color:var(--color-primary);">
                ${r.label}
              </label>`).join('')}
          </div>
        </div>
        <div class="field field-full">
          <label for="report-comment">Uddyb (valgfrit)</label>
          <textarea class="input" id="report-comment" placeholder="Beskriv hvad du har observeret..."></textarea>
        </div>
        <div class="form-actions" style="justify-content:flex-end;">
          <button type="submit" class="btn btn-primary">${Icon.flag}Send anmeldelse</button>
        </div>
      </form>
    </div>
  </div>`;
  document.body.appendChild(el.firstElementChild);

  const modal = document.getElementById('report-modal');
  modal.querySelectorAll('[data-report-close]').forEach(b => b.addEventListener('click', () => modal.classList.remove('open')));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
  document.getElementById('report-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const reason = (new FormData(e.target)).get('report-reason');
    Store.addReport({
      targetType: modal.dataset.targetType, targetId: modal.dataset.targetId,
      reason, comment: document.getElementById('report-comment').value,
    });
    modal.classList.remove('open');
    e.target.reset();
    toast('Tak for din anmeldelse — vi gennemgår den hurtigst muligt');
  });
}

function openReportModal(targetType, targetLabel, targetId){
  ensureReportModal();
  const modal = document.getElementById('report-modal');
  modal.dataset.targetType = targetType;
  modal.dataset.targetId = targetId;
  document.getElementById('report-target').textContent = `Du anmelder: ${targetLabel}`;
  modal.classList.add('open');
}

/* ============ Generic info modal ============ */
function ensureInfoModal(){
  if (document.getElementById('info-modal')) return;
  const el = document.createElement('div');
  el.innerHTML = `
  <div class="modal-overlay" id="info-modal">
    <div class="modal-box">
      <div class="modal-head">
        <h2 id="info-modal-title"></h2>
        <button type="button" class="icon-btn" data-info-close aria-label="Luk">${Icon.close}</button>
      </div>
      <div id="info-modal-body" style="font-size:14px; color:var(--color-fg-muted); line-height:1.7;"></div>
    </div>
  </div>`;
  document.body.appendChild(el.firstElementChild);
  const modal = document.getElementById('info-modal');
  modal.querySelectorAll('[data-info-close]').forEach(b => b.addEventListener('click', () => modal.classList.remove('open')));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
}
function openInfoModal(title, bodyHTML){
  ensureInfoModal();
  document.getElementById('info-modal-title').textContent = title;
  document.getElementById('info-modal-body').innerHTML = bodyHTML;
  document.getElementById('info-modal').classList.add('open');
}

/* ============ Cookie consent (GDPR) ============ */
function initCookieConsent(){
  if (Store.getCookieConsent() || document.getElementById('cookie-banner')) return;
  const el = document.createElement('div');
  el.innerHTML = `
  <div class="cookie-banner" id="cookie-banner" role="dialog" aria-label="Cookiesamtykke">
    <div class="cookie-banner-text">
      <strong>Vi bruger cookies</strong>
      <p>Bikerbasen bruger nødvendige cookies for at få siden til at fungere, og valgfrie cookies til statistik og forbedring af oplevelsen. Læs mere i vores <a href="privatlivspolitik.html">privatlivspolitik</a>.</p>
    </div>
    <div class="cookie-banner-actions">
      <button type="button" class="btn btn-outline btn-sm" id="cookie-necessary-only">Kun nødvendige</button>
      <button type="button" class="btn btn-primary btn-sm" id="cookie-accept-all">Accepter alle</button>
    </div>
  </div>`;
  document.body.appendChild(el.firstElementChild);
  document.getElementById('cookie-accept-all').addEventListener('click', () => {
    Store.setCookieConsent('all');
    document.getElementById('cookie-banner').remove();
  });
  document.getElementById('cookie-necessary-only').addEventListener('click', () => {
    Store.setCookieConsent('necessary');
    document.getElementById('cookie-banner').remove();
  });
}

function wireFavoriteButtons(root){
  (root || document).querySelectorAll('[data-fav-toggle]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const id = Number(btn.getAttribute('data-fav-toggle'));
      const active = Store.toggleFavorite(id);
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active);
      toast(active ? 'Tilføjet til gemte annoncer' : 'Fjernet fra gemte annoncer');
    });
  });
}

