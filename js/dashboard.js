/* ============ Forhandler dashboard ============
   Visninger og henvendelser kommer fra listing_stats (migration 004) —
   dagstotaler pr. annonce, uden IP eller cookie bag sig. Gemte annoncer
   tælles via my_listing_saves(), fordi favorites-politikken kun lader en
   bruger se sine egne favoritter. */

const DASH_DAYS = 30;

/* Dagstotaler fra databasen, indekseret som listing_id -> {dag -> tal}. */
let STATS_BY_LISTING = new Map();
let SAVES_BY_LISTING = new Map();

/* Eksterne annoncer (krav-flowet, supabase/014_aggregator.sql). Adskilt fra
   STATS_BY_LISTING/SAVES_BY_LISTING med vilje: de har ingen visningstal, og
   at blande dem ind i samme kort ville lade et hul i dataen ligne et nul. */
let EKSTERN_EJET = [];   // eksterne_annoncer, ejet_af = mig (krav godkendt)
let MINE_KRAV = [];      // alle mine krav, uanset status
let KRAV_SOEG_RESULTAT = [];

/* Dagene i rækkefølge, ældst først — samme akse for alle serier. */
function dashDays(){
  const ud = [];
  const nu = new Date();
  for (let i = DASH_DAYS - 1; i >= 0; i--){
    ud.push(new Date(nu.getTime() - i * 86400000).toISOString().slice(0, 10));
  }
  return ud;
}

async function hentStatistik(){
  STATS_BY_LISTING = new Map();
  SAVES_BY_LISTING = new Map();
  if (!db.enabled) return;

  const [{ data: raekker }, { data: gemte }] = await Promise.all([
    db.myListingStats(DASH_DAYS),
    db.myListingSaves(),
  ]);

  (raekker || []).forEach(r => {
    if (!STATS_BY_LISTING.has(r.listing_id)) STATS_BY_LISTING.set(r.listing_id, new Map());
    STATS_BY_LISTING.get(r.listing_id).set(String(r.stat_day).slice(0, 10), r);
  });
  // my_listing_saves kalder udgangskolonnen "listing", ikke "listing_id".
  (gemte || []).forEach(r => SAVES_BY_LISTING.set(r.listing, Number(r.saves) || 0));
}

async function hentEkstern(){
  EKSTERN_EJET = []; MINE_KRAV = [];
  if (!db.enabled) return;
  const [{ data: ejet }, { data: krav }] = await Promise.all([
    db.myClaimedExternal(),
    db.myKrav(),
  ]);
  EKSTERN_EJET = ejet || [];
  MINE_KRAV = krav || [];
}

function statsForListing(listing){
  const perDag = STATS_BY_LISTING.get(listing.id) || new Map();
  const series = dashDays().map(d => perDag.get(d)?.views || 0);
  const views = series.reduce((s, n) => s + n, 0);
  const inquiries = dashDays().reduce((s, d) => s + (perDag.get(d)?.contacts || 0), 0);
  return { series, views, inquiries, saves: SAVES_BY_LISTING.get(listing.id) || 0 };
}

function sumSeries(all){
  const out = new Array(DASH_DAYS).fill(0);
  all.forEach(s => s.series.forEach((v, i) => { out[i] += v; }));
  return out;
}

function dayLabel(indexFromEnd){
  // Datoen var hårdkodet til demodagen. Nu hvor tallene er rigtige, skal
  // aksen følge kalenderen — ellers står "26. jul" over dagens trafik.
  const d = new Date(Date.now() - (DASH_DAYS - 1 - indexFromEnd) * 86400000);
  return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
}

function compactNumber(n){
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.', ',') + ' mio.';
  if (n >= 10000) return Math.round(n / 1000) + 'K';
  return n.toLocaleString('da-DK');
}

/* ---------- Area + line chart (single series) ---------- */
function renderViewsChart(series){
  const mount = document.getElementById('views-chart');
  const W = 760, H = 240, padL = 44, padR = 16, padT = 16, padB = 28;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const max = Math.max(...series, 1);
  const niceMax = Math.ceil(max / 10) * 10 || 10;
  const x = i => padL + (i / (series.length - 1)) * innerW;
  const y = v => padT + innerH - (v / niceMax) * innerH;

  const ticks = [0, niceMax / 2, niceMax];
  const grid = ticks.map(t =>
    `<line x1="${padL}" y1="${y(t).toFixed(1)}" x2="${W - padR}" y2="${y(t).toFixed(1)}" class="viz-grid"/>
     <text x="${padL - 10}" y="${(y(t) + 4).toFixed(1)}" class="viz-axis-text" text-anchor="end">${Math.round(t).toLocaleString('da-DK')}</text>`
  ).join('');

  const linePts = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const areaPts = `${padL},${(padT + innerH).toFixed(1)} ${linePts} ${(W - padR).toFixed(1)},${(padT + innerH).toFixed(1)}`;

  const xTickIdx = [0, Math.floor((series.length - 1) / 2), series.length - 1];
  const xLabels = xTickIdx.map(i =>
    `<text x="${x(i).toFixed(1)}" y="${H - 8}" class="viz-axis-text" text-anchor="${i === 0 ? 'start' : (i === series.length - 1 ? 'end' : 'middle')}">${dayLabel(i)}</text>`
  ).join('');

  const lastI = series.length - 1;

  mount.innerHTML = `
  <svg viewBox="0 0 ${W} ${H}" class="viz-svg" role="img"
       aria-label="Linjediagram over daglige visninger de seneste 30 dage. I alt ${series.reduce((s,n)=>s+n,0).toLocaleString('da-DK')} visninger.">
    ${grid}
    <polygon points="${areaPts}" class="viz-area"/>
    <polyline points="${linePts}" class="viz-line"/>
    <circle cx="${x(lastI).toFixed(1)}" cy="${y(series[lastI]).toFixed(1)}" r="5" class="viz-dot"/>
    ${xLabels}
    <g class="viz-hover-layer">
      <line class="viz-crosshair" y1="${padT}" y2="${padT + innerH}" style="display:none"/>
      <circle class="viz-hover-dot" r="5" style="display:none"/>
      ${series.map((v, i) => `<rect x="${(x(i) - innerW / (series.length - 1) / 2).toFixed(1)}" y="${padT}" width="${(innerW / (series.length - 1)).toFixed(1)}" height="${innerH}" fill="transparent" data-i="${i}" data-v="${v}" data-x="${x(i).toFixed(1)}" data-y="${y(v).toFixed(1)}"/>`).join('')}
    </g>
  </svg>
  <div class="viz-tooltip" id="views-tooltip" hidden></div>`;

  wireLineHover(mount, series);
}

function wireLineHover(mount, series){
  const svg = mount.querySelector('svg');
  const tip = mount.querySelector('#views-tooltip');
  const cross = mount.querySelector('.viz-crosshair');
  const dot = mount.querySelector('.viz-hover-dot');

  mount.querySelectorAll('.viz-hover-layer rect').forEach(r => {
    const show = () => {
      const i = Number(r.dataset.i), v = Number(r.dataset.v);
      const px = Number(r.dataset.x), py = Number(r.dataset.y);
      cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.style.display = '';
      dot.setAttribute('cx', px); dot.setAttribute('cy', py); dot.style.display = '';
      tip.hidden = false;
      tip.innerHTML = `<strong>${v.toLocaleString('da-DK')} visninger</strong><span>${dayLabel(i)}</span>`;
      const box = svg.getBoundingClientRect();
      const scale = box.width / 760;
      tip.style.left = Math.min(Math.max(px * scale, 60), box.width - 60) + 'px';
      tip.style.top = (py * scale - 12) + 'px';
    };
    const hide = () => { cross.style.display = 'none'; dot.style.display = 'none'; tip.hidden = true; };
    r.addEventListener('mouseenter', show);
    r.addEventListener('focus', show);
    r.addEventListener('mouseleave', hide);
    r.addEventListener('blur', hide);
  });
  svg.addEventListener('mouseleave', () => {
    cross.style.display = 'none'; dot.style.display = 'none'; tip.hidden = true;
  });
}

/* ---------- Horizontal bar chart (single hue) ---------- */
function renderTopChart(rows){
  const mount = document.getElementById('top-chart');
  if (!rows.length){ mount.innerHTML = `<p class="chart-empty">Ingen data endnu.</p>`; return; }
  const max = Math.max(...rows.map(r => r.views), 1);
  mount.innerHTML = `
    <div class="hbar-list" role="img" aria-label="Vandret søjlediagram over visninger pr. annonce.">
      ${rows.map(r => `
        <div class="hbar-row">
          <span class="hbar-label" title="${escapeHTML(r.title)}">${escapeHTML(r.title)}</span>
          <span class="hbar-track">
            <span class="hbar-fill" style="width:${Math.max(2, (r.views / max) * 100).toFixed(1)}%"></span>
          </span>
          <span class="hbar-value">${r.views.toLocaleString('da-DK')}</span>
        </div>`).join('')}
    </div>`;
}

/* ---------- Table views (accessibility fallback) ---------- */
function renderViewsTable(series){
  document.getElementById('views-table').innerHTML = `
    <div class="table-scroll" style="max-height:240px;">
      <table class="data-table">
        <thead><tr><th scope="col">Dato</th><th scope="col" class="num">Visninger</th></tr></thead>
        <tbody>${series.map((v, i) => `<tr><td>${dayLabel(i)}</td><td class="num">${v.toLocaleString('da-DK')}</td></tr>`).join('')}</tbody>
      </table>
    </div>`;
}

function renderTopTable(rows){
  document.getElementById('top-table').innerHTML = `
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr><th scope="col">Annonce</th><th scope="col" class="num">Visninger</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td>${escapeHTML(r.title)}</td><td class="num">${r.views.toLocaleString('da-DK')}</td></tr>`).join('')}</tbody>
      </table>
    </div>`;
}

/* ---------- KPI tiles ---------- */
function sparklineSVG(series){
  const w = 96, h = 28, max = Math.max(...series, 1);
  const pts = series.map((v, i) => `${(i / (series.length - 1) * w).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" class="sparkline" aria-hidden="true"><polyline points="${pts}"/></svg>`;
}

function kpiTile(label, value, opts){
  opts = opts || {};
  const delta = opts.delta;
  const deltaHTML = (delta == null) ? '' : `
    <span class="kpi-delta ${delta >= 0 ? 'up' : 'down'}">
      ${delta >= 0 ? Icon.arrowUp : Icon.arrowDown}${Math.abs(delta)}%<span class="kpi-delta-period">vs. forrige 30 dage</span>
    </span>`;
  const subHTML = opts.sub ? `<span class="kpi-sub">${opts.sub}</span>` : '';
  return `
  <div class="kpi-tile">
    <span class="kpi-label">${label}</span>
    <span class="kpi-value">${value}</span>
    ${deltaHTML}${subHTML}
    ${opts.spark ? sparklineSVG(opts.spark) : ''}
  </div>`;
}

/* ---------- Kontostatus-strimlen ----------

   Stripe- og Shopify-dashboards viser altid kontoens plan/status øverst,
   uden at man skal grave i en indstillingsside for at finde ud af, om man
   betaler for noget. Vi genbruger samme kort som "Mine annoncer -> Konto",
   men kompakt og med ét link derhen — ikke to steder, der kan sige hver sit
   om samme abonnement. */
function renderPlanStrip(user){
  const mount = document.getElementById('dash-plan-strip');
  if (!mount) return;

  if (typeof FRI_ADGANG !== 'undefined' && FRI_ADGANG){
    mount.innerHTML = `
      <div class="plan-strip">
        <span class="plan-strip-badge">${Icon.checkCircle}Ubegrænset · gratis</span>
        <span class="plan-strip-note">Bikerbasen er gratis for alle i øjeblikket — også forhandlere.</span>
      </div>`;
    return;
  }

  const erAktiv = user.plan === 'dealer';
  mount.innerHTML = `
    <div class="plan-strip">
      <span class="plan-strip-badge ${erAktiv ? '' : 'is-free'}">${erAktiv ? Icon.shieldCheck : Icon.info}${erAktiv ? 'Forhandler · aktivt' : 'Gratis konto'}</span>
      <span class="plan-strip-note">${erAktiv ? 'Ubegrænsede annoncer og forhandler-shop.' : 'Opgradér for ubegrænsede annoncer.'}</span>
      <a href="mine-annoncer.html?tab=konto" class="plan-strip-link">${erAktiv ? 'Administrér abonnement' : 'Bliv forhandler'}${Icon.arrowRight}</a>
    </div>`;
}

/* ---------- Kom-godt-i-gang ----------

   Vises KUN når kontoen reelt er tom — hverken egne annoncer eller
   godkendte krav på eksterne. En forhandler, der lige er blevet oprettet,
   ser ellers et dashboard fyldt med nuller og grafer uden en linje, uden at
   vide hvad næste skridt er. Stripe og Shopify løser det samme problem med
   en tjekliste med konkrete handlinger — ikke bare en tom tabel. */
function renderKickoff(harAndetEndTomt){
  const mount = document.getElementById('dash-kickoff');
  if (!mount) return;
  if (harAndetEndTomt){ mount.style.display = 'none'; mount.innerHTML = ''; return; }

  mount.style.display = '';
  mount.innerHTML = `
    <div class="kickoff-card">
      <h2>Kom godt i gang</h2>
      <p>Din konto er klar, men der er ikke noget at vise endnu. To veje til at få gang i butikken:</p>
      <div class="kickoff-steps">
        <div class="kickoff-step">
          <span class="kickoff-step-num">1</span>
          <div>
            <h3>Gør krav på annoncer, der allerede findes</h3>
            <p>Bikerbasen har indekseret hundredvis af annoncer fra andre danske MC-sider. Er nogle af dem dine, kan du overtage dem i stedet for at oprette dem forfra.</p>
            <a href="#krav-panel" class="btn btn-outline btn-sm">Søg dine annoncer</a>
          </div>
        </div>
        <div class="kickoff-step">
          <span class="kickoff-step-num">2</span>
          <div>
            <h3>Opret en ny annonce</h3>
            <p>Har du en motorcykel, der ikke findes på nogen anden side endnu, opretter du den direkte.</p>
            <a href="opret-annonce.html" class="btn btn-outline btn-sm">Opret annonce</a>
          </div>
        </div>
      </div>
    </div>`;
}

/* ---------- Eksterne annoncer, du ejer via et godkendt krav ---------- */
function eksternKildeNavn(row){
  return row.kilde?.navn || row.kilde?.domaene || 'ekstern kilde';
}

function renderEksternTable(){
  const tableEl = document.getElementById('ekstern-table');
  const emptyEl = document.getElementById('ekstern-empty');
  const summaryEl = document.getElementById('ekstern-summary');
  const tbody = document.getElementById('ekstern-tbody');

  if (!EKSTERN_EJET.length){
    tableEl.style.display = 'none';
    emptyEl.style.display = 'block';
    summaryEl.textContent = 'Ingen endnu.';
    return;
  }
  tableEl.style.display = '';
  emptyEl.style.display = 'none';
  summaryEl.textContent = `${EKSTERN_EJET.length} ${EKSTERN_EJET.length === 1 ? 'annonce' : 'annoncer'} · felter du retter her, overskrives ikke af næste indeksering`;

  tbody.innerHTML = EKSTERN_EJET.map(row => `
    <tr data-ekstern-row="${row.id}">
      <td>
        <a href="${escapeHTML(row.url)}" class="table-title" target="_blank" rel="noopener noreferrer">${escapeHTML(row.titel)}</a>
        <span class="table-sub">${row.aargang ? row.aargang + ' · ' : ''}${row.km != null ? formatKm(row.km) : ''}</span>
      </td>
      <td class="num" data-ekstern-pris>${row.pris_dkk != null ? formatPrice(row.pris_dkk) : 'Ikke oplyst'}</td>
      <td><span class="ekstern-kilde-badge">${escapeHTML(eksternKildeNavn(row))}</span></td>
      <td data-ekstern-status><span class="status-pill ${row.status === 'solgt' ? 'is-active' : 'is-new'}">${row.status === 'solgt' ? 'Solgt' : 'Aktiv'}</span></td>
      <td class="row-actions"><button type="button" class="btn btn-outline btn-sm" data-ekstern-rediger="${row.id}">Rediger</button></td>
    </tr>`).join('');

  tbody.querySelectorAll('[data-ekstern-rediger]').forEach(btn => {
    btn.addEventListener('click', () => aabnEksternRedigering(btn.dataset.eksternRediger));
  });
}

/* Retter pris og status inline i tabellen — de to felter, en forhandler
   oftest skal ajourføre, uden at bygge en hel redigeringsside for et felt-
   sæt, klienten allerede kun har uddrag af (uddrag er hårdt begrænset til
   200 tegn i databasen, jf. 014_aggregator.sql — det er ikke en fuld
   annoncetekst, vi kan lade forhandleren redigere som var det vores egen). */
function aabnEksternRedigering(id){
  const row = document.querySelector(`tr[data-ekstern-row="${id}"]`);
  const data = EKSTERN_EJET.find(r => r.id === id);
  if (!row || !data) return;

  const prisCelle = row.querySelector('[data-ekstern-pris]');
  const statusCelle = row.querySelector('[data-ekstern-status]');
  const actionsCelle = row.querySelector('.row-actions');

  prisCelle.innerHTML = `<input class="input input-sm" type="number" min="0" step="1000" value="${data.pris_dkk ?? ''}" id="ekstern-edit-pris-${id}" aria-label="Pris i kr.">`;
  statusCelle.innerHTML = `
    <select class="input input-sm" id="ekstern-edit-status-${id}" aria-label="Status">
      <option value="aktiv" ${data.status !== 'solgt' ? 'selected' : ''}>Aktiv</option>
      <option value="solgt" ${data.status === 'solgt' ? 'selected' : ''}>Solgt</option>
    </select>`;
  actionsCelle.innerHTML = `
    <button type="button" class="btn btn-primary btn-sm" data-ekstern-gem="${id}">Gem</button>
    <button type="button" class="btn btn-outline btn-sm" data-ekstern-fortryd="${id}">Annullér</button>`;

  actionsCelle.querySelector('[data-ekstern-fortryd]').addEventListener('click', () => renderEksternTable());
  actionsCelle.querySelector('[data-ekstern-gem]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = 'Gemmer…';
    const nyPris = document.getElementById(`ekstern-edit-pris-${id}`).value;
    const nyStatus = document.getElementById(`ekstern-edit-status-${id}`).value;

    const kald = [];
    if (String(nyPris) !== String(data.pris_dkk ?? '')) kald.push(db.retExternalField(id, 'pris_dkk', nyPris));
    if (nyStatus !== data.status) kald.push(db.retExternalField(id, 'status', nyStatus));

    const svar = await Promise.all(kald);
    const fejl = svar.find(s => s?.error);
    if (fejl){
      toast('Kunne ikke gemme ændringen: ' + fejl.error.message, { type: 'error' });
      btn.disabled = false; btn.textContent = 'Gem';
      return;
    }
    data.pris_dkk = nyPris === '' ? null : Number(nyPris);
    data.status = nyStatus;
    toast('Annoncen er opdateret');
    renderEksternTable();
  });
}

/* ---------- Gør krav ---------- */
function kravStatusLabel(status){
  if (status === 'godkendt') return { tekst: 'Godkendt', klasse: 'is-new' };
  if (status === 'afvist') return { tekst: 'Afvist', klasse: 'is-afvist' };
  return { tekst: 'Afventer godkendelse', klasse: 'is-afventer' };
}

function renderKravStatusList(){
  const wrap = document.getElementById('krav-status-wrap');
  const list = document.getElementById('krav-status-list');
  if (!MINE_KRAV.length){ wrap.style.display = 'none'; return; }
  wrap.style.display = '';
  list.innerHTML = MINE_KRAV.map(k => {
    const s = kravStatusLabel(k.status);
    const titel = k.annonce ? `${k.annonce.maerke || ''} ${k.annonce.model || ''}`.trim() || k.annonce.titel : 'Annoncen findes ikke længere';
    return `
      <div class="krav-status-row">
        <div>
          <p class="krav-status-titel">${escapeHTML(titel || 'Ukendt annonce')}</p>
          <p class="krav-status-dato">Indsendt ${datoKortDash(k.oprettet)}${k.behandlet ? ' · behandlet ' + datoKortDash(k.behandlet) : ''}</p>
        </div>
        <span class="status-pill ${s.klasse}">${s.tekst}</span>
      </div>`;
  }).join('');
}

function datoKortDash(iso){
  const t = new Date(iso || '').getTime();
  if (!t) return '';
  return new Date(t).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderKravResults(rows, soegt){
  const mount = document.getElementById('krav-results');
  const hint = document.getElementById('krav-search-hint');

  if (!soegt){
    hint.textContent = '';
    mount.innerHTML = '';
    return;
  }
  if (!rows.length){
    hint.textContent = '';
    mount.innerHTML = `<p class="chart-empty">Ingen ledige annoncer matcher søgningen. Prøv et andet mærke, en model eller en by.</p>`;
    return;
  }

  const kravAlleredeSat = new Set(MINE_KRAV.map(k => k.annonce_id));
  hint.textContent = `${rows.length} ${rows.length === 1 ? 'annonce fundet' : 'annoncer fundet'}, ingen har gjort krav på dem endnu.`;
  mount.innerHTML = rows.map(row => {
    const harKrav = kravAlleredeSat.has(row.id);
    return `
    <div class="krav-result-row">
      <div class="krav-result-thumb">${row.thumbnail_url ? `<img src="${escapeHTML(row.thumbnail_url)}" alt="" loading="lazy" width="64" height="48">` : `<span class="krav-result-nophoto">${Icon.camera}</span>`}</div>
      <div class="krav-result-info">
        <p class="krav-result-titel">${escapeHTML(row.titel)}</p>
        <p class="krav-result-sub">${row.aargang ? row.aargang + ' · ' : ''}${row.pris_dkk != null ? formatPrice(row.pris_dkk) : 'Pris ikke oplyst'}${row.by ? ' · ' + escapeHTML(row.by) : ''} · ${escapeHTML(eksternKildeNavn(row))}</p>
      </div>
      ${harKrav
        ? `<span class="status-pill is-afventer">Krav indsendt</span>`
        : `<button type="button" class="btn btn-primary btn-sm" data-krav-aabn="${row.id}">Gør krav</button>`}
    </div>`;
  }).join('');

  mount.querySelectorAll('[data-krav-aabn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = rows.find(r => r.id === btn.dataset.kravAabn);
      if (row) aabnKravDialog(row);
    });
  });
}

let AKTUEL_KRAV_ANNONCE = null;

function aabnKravDialog(row){
  AKTUEL_KRAV_ANNONCE = row;
  document.getElementById('krav-dialog-annonce').textContent =
    `${row.titel}${row.by ? ' · ' + row.by : ''} · ${eksternKildeNavn(row)}`;
  document.getElementById('krav-dialog-doku').value = '';
  document.getElementById('krav-dialog').classList.add('open');
  document.getElementById('krav-dialog-doku').focus();
}

function lukKravDialog(){
  document.getElementById('krav-dialog').classList.remove('open');
  AKTUEL_KRAV_ANNONCE = null;
}

function wireKravUI(){
  document.getElementById('krav-search-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = document.getElementById('krav-search-input').value;
    const hint = document.getElementById('krav-search-hint');
    hint.textContent = 'Søger…';
    const { data, error } = await db.searchUnclaimedExternal({ q });
    if (error){ hint.textContent = 'Søgningen fejlede. Prøv igen.'; return; }
    KRAV_SOEG_RESULTAT = data || [];
    renderKravResults(KRAV_SOEG_RESULTAT, true);
  });

  const dialog = document.getElementById('krav-dialog');
  document.getElementById('krav-dialog-close').addEventListener('click', lukKravDialog);
  document.getElementById('krav-dialog-cancel').addEventListener('click', lukKravDialog);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) lukKravDialog(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dialog.classList.contains('open')) lukKravDialog();
  });

  document.getElementById('krav-dialog-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!AKTUEL_KRAV_ANNONCE) return;
    const btn = document.getElementById('krav-dialog-submit');
    const doku = document.getElementById('krav-dialog-doku').value.trim();
    btn.disabled = true; btn.textContent = 'Sender…';

    const { error } = await db.submitKrav(AKTUEL_KRAV_ANNONCE.id, doku);
    btn.disabled = false; btn.textContent = 'Send krav';

    if (error){
      const m = error.message || '';
      if (m.includes('duplicate key')) toast('Du har allerede sendt et krav på denne annonce.');
      else toast('Kravet kunne ikke sendes: ' + m, { type: 'error' });
      return;
    }

    lukKravDialog();
    toast('Krav sendt. Vi godkender det manuelt og opdaterer status her.');
    await hentEkstern();
    renderKravResults(KRAV_SOEG_RESULTAT, true);
    renderKravStatusList();
  });
}

/* ---------- Main ---------- */
function renderDashboard(user){
  const mine = Store.getMyListings().filter(l => l.isDealer);
  const stats = mine.map(l => ({ listing: l, ...statsForListing(l) }));
  const totalSeries = sumSeries(stats);
  const totalViews = totalSeries.reduce((s, n) => s + n, 0);
  const totalInquiries = stats.reduce((s, x) => s + x.inquiries, 0);
  const totalSaves = stats.reduce((s, x) => s + x.saves, 0);

  const firstHalf = totalSeries.slice(0, 15).reduce((s, n) => s + n, 0);
  const secondHalf = totalSeries.slice(15).reduce((s, n) => s + n, 0);
  const viewsDelta = firstHalf ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : 0;

  const avgRating = Store.getAverageRating(user.name, null);
  const reviewCount = Store.getReviews(user.name).length;

  const kravAktive = EKSTERN_EJET.filter(r => r.status !== 'solgt').length;
  const totalAktive = mine.length + kravAktive;

  document.getElementById('dash-subtitle').textContent =
    `${user.company || user.name} · ${totalAktive} ${totalAktive === 1 ? 'aktiv annonce' : 'aktive annoncer'}` +
    (kravAktive ? ` (${mine.length} oprettet her, ${kravAktive} via krav)` : '');

  document.getElementById('kpi-row').innerHTML = [
    kpiTile('Aktive annoncer', totalAktive, kravAktive ? { sub: `${mine.length} oprettet · ${kravAktive} via krav` } : undefined),
    kpiTile('Visninger (30 dage)', compactNumber(totalViews), { delta: viewsDelta, spark: totalSeries }),
    kpiTile('Henvendelser (30 dage)', compactNumber(totalInquiries)),
    kpiTile('Gemt af købere', compactNumber(totalSaves)),
    /* Stregen er væk. En sælgerprofil-builder efterlod netop den her linje
       som en note i work/DECISIONS.md ("den, der ejer dashboardet, bør
       fjerne stregen som på profilen") — et "–" i feltet Bedømmelse ligner
       en dårlig karakter, ikke et manglende tal. Under tre anmeldelser er
       der intet snit at vise (Store.MIN_ANMELDELSER_FOR_SNIT), og så siger
       feltet hvorfor i stedet for at tegne en streg. */
    kpiTile('Bedømmelse', avgRating != null ? `${avgRating} ★` : 'Ikke nok endnu', { sub: `${reviewCount} ${reviewCount === 1 ? 'anmeldelse' : 'anmeldelser'}` }),
  ].join('');

  document.getElementById('views-summary').textContent =
    `${totalViews.toLocaleString('da-DK')} visninger i alt · ${Math.round(totalViews / DASH_DAYS).toLocaleString('da-DK')} i gennemsnit pr. dag`;

  renderViewsChart(totalSeries);
  renderViewsTable(totalSeries);

  const topRows = [...stats]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
    .map(x => ({ title: `${x.listing.brand} ${x.listing.model}`, views: x.views }));
  renderTopChart(topRows);
  renderTopTable(topRows);

  // Listings table
  const tbody = document.getElementById('listings-tbody');
  const tableEl = document.getElementById('listings-table');
  const emptyEl = document.getElementById('listings-empty');
  if (!stats.length){
    tableEl.style.display = 'none';
    emptyEl.style.display = 'block';
  } else {
    tableEl.style.display = '';
    emptyEl.style.display = 'none';
    tbody.innerHTML = stats.map(x => {
      const l = x.listing;
      return `
      <tr>
        <td>
          <a href="annonce.html?id=${l.id}" class="table-title">${escapeHTML(l.brand)} ${escapeHTML(l.model)}</a>
          <span class="table-sub">${l.year} · ${formatKm(l.km)}</span>
        </td>
        <td class="num">${formatPrice(l.price)}</td>
        <td class="num">${x.views.toLocaleString('da-DK')}</td>
        <td class="num">${x.inquiries.toLocaleString('da-DK')}</td>
        <td class="num">${x.saves.toLocaleString('da-DK')}</td>
        <td><span class="status-pill ${isNewListing(l.createdAt) ? 'is-new' : 'is-active'}">${isNewListing(l.createdAt) ? 'Ny' : 'Aktiv'}</span></td>
        <td class="row-actions">
          <a href="annonce.html?id=${l.id}" class="btn btn-outline btn-sm">Se</a>
          <button type="button" class="btn btn-outline btn-sm" data-del="${l.id}">Slet</button>
        </td>
      </tr>`;
    }).join('');
    tbody.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Er du sikker på, at du vil slette denne annonce? Det kan ikke fortrydes.')) return;
        const id = btn.dataset.del;
        // Samme fælde som i "Mine annoncer": Number() på et uuid giver NaN,
        // så sletningen ramte kun localStorage og annoncen blev i databasen.
        if (isUuid(id)){
          btn.disabled = true;
          const { error } = await db.deleteListing(id);
          if (error){
            btn.disabled = false;
            toast('Annoncen kunne ikke slettes: ' + error.message, { type: 'error' });
            return;
          }
          window.REMOTE_LISTINGS = (window.REMOTE_LISTINGS || []).filter(l => l.id !== id);
        } else {
          Store.removeMyListing(id);
        }
        toast('Annonce slettet');
        renderDashboard(user);
      });
    });
  }

  document.getElementById('listings-summary').textContent =
    `${stats.length} ${stats.length === 1 ? 'annonce' : 'annoncer'} · sorteret efter oprettelsesdato`;

  // Chart/table toggles
  document.querySelectorAll('[data-toggle-table]').forEach(btn => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      const key = btn.dataset.toggleTable;
      const chart = document.getElementById(key === 'views' ? 'views-chart' : 'top-chart');
      const table = document.getElementById(key === 'views' ? 'views-table' : 'top-table');
      const showTable = table.hidden;
      table.hidden = !showTable;
      chart.style.display = showTable ? 'none' : '';
      btn.textContent = showTable ? 'Vis graf' : 'Vis tabel';
    });
  });

  renderPlanStrip(user);
  renderKickoff(mine.length > 0 || EKSTERN_EJET.length > 0);
  renderEksternTable();
  renderKravStatusList();
}

document.addEventListener('DOMContentLoaded', async () => {
  await backendReady();
  const user = Store.getUser();
  if (!user){
    window.location.replace('login.html?redirect=' + encodeURIComponent('dashboard.html'));
    return;
  }
  renderHeader('dashboard.html');
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = Icon[el.dataset.icon] || ''; });

  if (!user.isDealer){
    document.getElementById('gate-icon').innerHTML = Icon.shieldCheck;
    document.getElementById('dash-gate').style.display = '';
    return;
  }
  document.getElementById('dash-content').style.display = '';
  await hentStatistik();
  await hentEkstern();
  wireKravUI();
  renderDashboard(user);
});
