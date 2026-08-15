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
  updateAuthVisibility();
  injectDealerNav(current);
  updateFavCount();
  updateAuthSlot();
  wireHeader();
  initCookieConsent();
}

/* Opret annonce og Mine annoncer kræver login — begge sider sender en
   anonym bruger direkte videre til login. Derfor skjules de i toppen, når
   ingen er logget ind, så man ikke lokkes ind i et dødt link. Punkterne
   står stadig i HTML'en (crawlbare), og vises igen straks man logger ind. */
function updateAuthVisibility(){
  const loggedIn = !!Store.getUser();
  // Fuld href, så "Gemte annoncer" (mine-annoncer.html?tab=favoritter) ikke
  // rammes — favoritter virker for anonyme og skal blive stående.
  const authOnly = ['opret-annonce.html', 'mine-annoncer.html'];
  document.querySelectorAll('.main-nav a, .mobile-drawer-panel a[href], .header-cta').forEach(a => {
    if (authOnly.includes(a.getAttribute('href'))) a.hidden = !loggedIn;
  });
}

/* Dashboard is dealer-only, so the link is injected for dealer accounts
   rather than shipped in the static nav for everyone. */
function injectDealerNav(current){
  const user = Store.getUser();
  if (!user || !user.isDealer) return;
  if (document.querySelector('[data-dealer-nav]')) return;

  const nav = document.querySelector('.main-nav');
  if (nav){
    const a = document.createElement('a');
    a.href = 'dashboard.html';
    a.textContent = 'Dashboard';
    a.setAttribute('data-dealer-nav', '');
    if (current === 'dashboard.html') a.classList.add('active');
    nav.appendChild(a);
  }
  const drawer = document.querySelector('.mobile-drawer-panel .drawer-divider');
  if (drawer){
    const a = document.createElement('a');
    a.href = 'dashboard.html';
    a.innerHTML = `${Icon.chart}Dashboard`;
    a.setAttribute('data-dealer-nav', '');
    drawer.parentNode.insertBefore(a, drawer);
  }
}

function updateFavCount(){
  const n = Store.getFavorites().length;
  document.querySelectorAll('[data-fav-count]').forEach(el => { el.textContent = n; el.setAttribute('data-count', n); });
  document.querySelectorAll('[data-fav-count-mobile]').forEach(el => { el.textContent = n; });
}

function updateAuthSlot(){
  const user = Store.getUser();
  if (!user) return;
  const onLogout = async (e) => {
    e.preventDefault();
    if (typeof db !== 'undefined' && db.enabled) await db.signOut();
    Store.logout();
    window.location.href = 'index.html';
  };
  // Navnet escapes, selvom det er brugerens eget: uden det kunne et navn som
  // <img onerror> køre kode i ens egen header (self-XSS). Billig forsikring.
  const slot = document.querySelector('[data-auth-slot]');
  if (slot){
    slot.setAttribute('href', '#');
    slot.innerHTML = `${Icon.user}${escapeHTML(String(user.name || '').split(' ')[0])} · Log ud`;
    slot.addEventListener('click', onLogout);
  }
  const slotMobile = document.querySelector('[data-auth-slot-mobile]');
  if (slotMobile){
    slotMobile.setAttribute('href', '#');
    slotMobile.innerHTML = `${Icon.user}Log ud (${escapeHTML(user.name || '')})`;
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
    // overlay-open skjuler cookiebanneret, der ellers ligger oven på skuffen.
    const setDrawer = (open) => {
      drawer.classList.toggle('open', open);
      document.body.classList.toggle('overlay-open', open);
    };
    openBtn.addEventListener('click', () => setDrawer(true));
    drawer.querySelectorAll('[data-drawer-close]').forEach(el => el.addEventListener('click', () => setDrawer(false)));
  }
  const themeBtn = document.querySelector('.theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  document.addEventListener('bb:favorites-changed', updateFavCount);
}

/* opts.type: 'success' (standard) eller 'error'.

   Fejlbeskeder blev tidligere vist med det grønne flueben — "Udfyld venligst
   alle felter markeret med *" så ud som en kvittering. Og elementet havde
   hverken role eller aria-live, så en skærmlæserbruger fik intet at vide:
   fokus hoppede bare til et felt uden nogen forklaring. */
function toast(msg, opts){
  const fejl = opts && opts.type === 'error';
  let el = document.querySelector('.toast');
  if (!el){
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  // role="alert" afbryder oplæsningen ved fejl; "status" venter høfligt.
  el.setAttribute('role', fejl ? 'alert' : 'status');
  el.setAttribute('aria-live', fejl ? 'assertive' : 'polite');
  el.classList.toggle('toast-error', fejl);
  el.innerHTML = `${fejl ? Icon.alertTriangle : Icon.checkCircle}<span>${msg}</span>`;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), (opts && opts.duration) || 2600);
}

/* Er annoncen brugerens egen? Fjerntliggende annoncer matches på sælger-id,
   lokale demo-/kladdeannoncer på navn. */
function isOwnListing(l){
  const user = Store.getUser();
  if (!user || !l || !l.seller) return false;
  if (user.id && l.seller.id) return user.id === l.seller.id;
  return Boolean(user.name) && user.name === l.seller.name;
}

/* Rigtigt foto hvis annoncen har et; ellers den illustrerede placeholder.
   loading="lazy" + faste proportioner holder layoutet stabilt (CLS).

   Undtagelsen er det første kort i en liste (`eager`): på søgesiden er dets
   foto sidens LCP-element, og lazy-loading udskyder hentningen til efter
   layout — det kostede ~2s LCP. Første kort hentes derfor med høj prioritet. */
function listingMediaHTML(l, alt, eager){
  const url = l.photoUrls && l.photoUrls[0];
  const loadAttrs = eager
    ? 'loading="eager" fetchpriority="high" decoding="async"'
    : 'loading="lazy" decoding="async"';
  return url
    ? `<img src="${escapeHTML(url)}" alt="${escapeHTML(alt || '')}" ${loadAttrs} class="card-photo">`
    : bikeArtSVG(l.type, { id: 'card-' + l.id });
}

/* ============ Listing card ============ */
/* `i` kommer gratis fra .map(listingCardHTML) — kortet på plads 0 er det
   eneste der er above-the-fold på mobil, og får derfor det ivrige foto. */
function listingCardHTML(l, i){
  const fav = Store.isFavorite(l.id);
  const brand = escapeHTML(l.brand), model = escapeHTML(l.model), city = escapeHTML(l.city);
  const suspicious = isSuspiciouslyCheap(l);
  return `
  <article class="card" data-listing-id="${l.id}">
    <div class="card-media">
      ${listingMediaHTML(l, `${brand} ${model}`, i === 0)}
      <div class="card-badges">
        ${isNewListing(l.createdAt) ? `<span class="badge badge-new">Ny</span>` : ''}
        ${l.isDealer ? `<span class="badge badge-dealer">${Icon.shieldCheck}Forhandler</span>` : ''}
        ${suspicious ? `<span class="badge badge-warning" title="Prisen er væsentligt under markedsniveau for typen">${Icon.alertTriangle}Tjek prisen</span>` : ''}
      </div>
      ${isOwnListing(l) ? '' : `<button type="button" class="fav-btn ${fav?'active':''}" aria-pressed="${fav}" aria-label="Gem annonce" data-fav-toggle="${l.id}">${Icon.heart}</button>`}
      ${(() => { const k = koerekortForListing(l); return k ? `<span class="card-koerekort" title="Kan føres på ${k}-kørekort" aria-label="Kan føres på ${k}-kørekort">${k}</span>` : ''; })()}
      <button type="button" class="card-compare ${Store.isComparing(l.id)?'active':''}" data-compare-toggle="${l.id}" aria-pressed="${Store.isComparing(l.id)}" title="Sammenlign" aria-label="Tilføj til sammenligning">${Icon.chart}</button>
    </div>
    <div class="card-body">
      <div class="card-price">${formatPrice(l.price)}</div>
      <h3 class="card-title">${brand} ${model}</h3>
      <div class="card-meta">
        <span>${Icon.calendar}${l.year}</span>
        <span>${Icon.gauge}${formatKm(l.km)}</span>
        <span>${Icon.engine}${formatCcm(l.ccm)}</span>
      </div>
      ${l.serviceHistorik === 'Fuld' ? `<div class="card-trust"><span class="badge badge-verified">${Icon.shieldCheck}Fuld servicehistorik</span></div>` : ''}
      <div class="card-footer">
        <span>${Icon.mapPin}${city}</span>
        <span>${timeAgoDa(l.createdAt)}</span>
      </div>
    </div>
    <a href="annonce.html?id=${l.id}" class="card-link" aria-label="Se annonce: ${brand} ${model}, ${formatPrice(l.price)}"></a>
  </article>`;
}

/* ============ Trust badges ============ */
/* Slaaet fra med vilje.

   "Verificeret saelger" er en paastand over for en koeber om, at nogen har
   kontrolleret personen. Det har ingen. MitID kraever en godkendt broker
   (Criipto, Signaturgruppen, Nets) og er ikke sat op, SMS-bekraeftelse
   sender ingen sms, og CVR bliver ikke slaaet op. Indtil en af delene er
   rigtig, viser vi ingenting frem for at vise noget usandt.

   Naar verificering findes: fjern spaerren herunder. Flagene kan kun saettes
   af en betroet serverproces (se supabase/VERIFICERING.md og migration
   005_beskyt_verificering.sql) — aldrig af klienten. */
function verifiedBadgeHTML(seller){
  return '';
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
    <span>${Icon.mail}Skriv via Bikerbasen</span>
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
  document.getElementById('report-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const reason = (new FormData(e.target)).get('report-reason');
    const payload = {
      targetType: modal.dataset.targetType, targetId: modal.dataset.targetId,
      reason, comment: document.getElementById('report-comment').value,
    };
    modal.classList.remove('open');
    e.target.reset();

    // Altid en lokal kopi, så anmeldelsen ikke går tabt hvis nettet fejler.
    Store.addReport(payload);
    if (typeof db !== 'undefined' && db.enabled){
      const { error } = await db.addReport(payload);
      if (error){
        toast('Anmeldelsen blev gemt lokalt, men kunne ikke sendes', { type: 'error' });
        return;
      }
    }
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
/* Banneret står i markuppen (scripts/inline-cookie.js) og vises af en
   inline-linje i samme sekund som siden males — det var ellers det største
   element der blev malet på de js-tunge sider, og dermed deres LCP ~4s inde.
   Her kobles kun knapperne på. */
function initCookieConsent(){
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;
  if (Store.getCookieConsent()){ banner.remove(); return; }

  const svar = level => () => { Store.setCookieConsent(level); banner.remove(); };
  document.getElementById('cookie-accept-all').addEventListener('click', svar('all'));
  document.getElementById('cookie-necessary-only').addEventListener('click', svar('necessary'));
}

function wireFavoriteButtons(root){
  (root || document).querySelectorAll('[data-fav-toggle]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      // Ikke Number(): database-annoncer har uuid som id, og Number('4f2..')
      // er NaN — så et hjerteklik ramte forbi og kunne hverken like eller
      // unlike en rigtig annonce. Behold id'et som det er.
      const raw = btn.getAttribute('data-fav-toggle');
      const id = /^\d+$/.test(raw) ? Number(raw) : raw;
      const active = Store.toggleFavorite(id);
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active);
      toast(active ? 'Tilføjet til gemte annoncer' : 'Fjernet fra gemte annoncer');
    });
  });
}


/* ============ Sammenlign-system (bjælke + modal) ============
   Global og selvstændig: virker på alle sider via event-delegation, så de
   enkelte siders JS ikke skal røres. Op til 3 annoncer, tilstand i localStorage. */
(function initCompare(){
  function ready(fn){ document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn); }
  ready(() => {
    if (typeof Store === 'undefined') return;
    const bar = document.createElement('div');
    bar.className = 'compare-bar'; bar.hidden = true; bar.setAttribute('aria-live', 'polite');
    document.body.appendChild(bar);
    const modal = document.createElement('div');
    modal.className = 'compare-modal'; modal.hidden = true;
    document.body.appendChild(modal);

    function renderBar(){
      const ids = Store.getCompare();
      bar.hidden = ids.length === 0;
      if (!ids.length) return;
      bar.innerHTML = `
        <span class="compare-bar-count">${ids.length} valgt til sammenligning</span>
        <div class="compare-bar-actions">
          <button type="button" class="btn btn-outline btn-sm" data-compare-clear>Ryd</button>
          <button type="button" class="btn btn-primary btn-sm" data-compare-open ${ids.length < 2 ? 'disabled' : ''}>Sammenlign${ids.length >= 2 ? ` (${ids.length})` : ''}</button>
        </div>`;
    }
    function specRows(bikes){
      const rows = [
        ['Pris', b => formatPrice(b.price)],
        ['Årgang', b => b.year],
        ['Kilometer', b => formatKm(b.km)],
        ['Motorstørrelse', b => formatCcm(b.ccm)],
        ['Effekt', b => formatPower(b.power)],
        ['Kørekort', b => koerekortForListing(b) || '—'],
        ['Type', b => typeLabel(b.type)],
        ['Drivlinje', b => b.drive || '—'],
        ['Stand', b => b.condition || '—'],
        ['Servicehistorik', b => b.serviceHistorik || '—'],
        ['Antal ejere', b => b.antalEjere || '—'],
        ['Sidste syn', b => b.sidsteSyn || '—'],
      ];
      return rows.map(([label, fn]) =>
        `<tr><th scope="row">${label}</th>${bikes.map(b => `<td>${escapeHTML(String(fn(b)))}</td>`).join('')}</tr>`).join('');
    }
    function openModal(){
      const bikes = Store.getCompare().map(id => Store.getListingById(id)).filter(Boolean);
      if (bikes.length < 2) return;
      modal.innerHTML = `
        <div class="compare-modal-scrim" data-compare-close></div>
        <div class="compare-modal-panel" role="dialog" aria-label="Sammenlign motorcykler" aria-modal="true">
          <div class="compare-modal-head">
            <h2>Sammenlign</h2>
            <button type="button" class="icon-btn" data-compare-close aria-label="Luk sammenligning">${Icon.close}</button>
          </div>
          <div class="compare-table-wrap">
            <table class="compare-table">
              <thead><tr><th></th>${bikes.map(b => `<th scope="col"><a href="annonce.html?id=${encodeURIComponent(b.id)}">${escapeHTML(b.brand + ' ' + b.model)}</a></th>`).join('')}</tr></thead>
              <tbody>${specRows(bikes)}</tbody>
            </table>
          </div>
        </div>`;
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
    }
    function closeModal(){ modal.hidden = true; document.body.style.overflow = ''; }

    document.addEventListener('click', (e) => {
      const toggle = e.target.closest('[data-compare-toggle]');
      if (toggle){
        e.preventDefault(); e.stopPropagation();
        const on = Store.toggleCompare(toggle.getAttribute('data-compare-toggle'));
        toggle.classList.toggle('active', on); toggle.setAttribute('aria-pressed', String(on));
        return;
      }
      if (e.target.closest('[data-compare-open]')) return openModal();
      if (e.target.closest('[data-compare-clear]')) return Store.clearCompare();
      if (e.target.closest('[data-compare-close]')) return closeModal();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
    document.addEventListener('bb:compare-changed', () => {
      renderBar();
      document.querySelectorAll('[data-compare-toggle]').forEach(b => {
        const on = Store.isComparing(b.getAttribute('data-compare-toggle'));
        b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));
      });
    });
    renderBar();
  });
})();
