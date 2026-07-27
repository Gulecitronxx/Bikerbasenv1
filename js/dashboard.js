/* ============ Forhandler dashboard ============
   Views/inquiries are deterministic synthetic demo data (seeded per listing id)
   so numbers stay stable across reloads. There is no backend collecting real
   traffic — the UI states this explicitly. */

const DASH_DAYS = 30;

function statsForListing(listing){
  const seed = Number(String(listing.id).slice(-6)) || 1;
  const rnd = seededRandom(seed * 31 + 7);
  const popularity = 0.5 + rnd();
  const series = [];
  let base = 6 + Math.floor(rnd() * 14 * popularity);
  for (let i = 0; i < DASH_DAYS; i++){
    const weekday = (i % 7);
    const weekendLift = (weekday === 5 || weekday === 6) ? 1.35 : 1;
    const drift = 1 + (rnd() - 0.45) * 0.5;
    base = Math.max(1, Math.round(base * drift));
    series.push(Math.max(0, Math.round(base * weekendLift * popularity)));
  }
  const views = series.reduce((s, n) => s + n, 0);
  const inquiries = Math.max(0, Math.round(views * (0.012 + rnd() * 0.02)));
  const saves = Math.max(0, Math.round(views * (0.02 + rnd() * 0.03)));
  return { series, views, inquiries, saves };
}

function sumSeries(all){
  const out = new Array(DASH_DAYS).fill(0);
  all.forEach(s => s.series.forEach((v, i) => { out[i] += v; }));
  return out;
}

function dayLabel(indexFromEnd){
  const now = new Date('2026-07-26T09:00:00');
  const d = new Date(now.getTime() - (DASH_DAYS - 1 - indexFromEnd) * 86400000);
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

  document.getElementById('dash-subtitle').textContent =
    `${user.company || user.name} · ${mine.length} ${mine.length === 1 ? 'aktiv annonce' : 'aktive annoncer'}`;

  document.getElementById('kpi-row').innerHTML = [
    kpiTile('Aktive annoncer', mine.length),
    kpiTile('Visninger (30 dage)', compactNumber(totalViews), { delta: viewsDelta, spark: totalSeries }),
    kpiTile('Henvendelser (30 dage)', compactNumber(totalInquiries)),
    kpiTile('Gemt af købere', compactNumber(totalSaves)),
    kpiTile('Bedømmelse', avgRating != null ? `${avgRating} ★` : '–', { sub: `${reviewCount} ${reviewCount === 1 ? 'anmeldelse' : 'anmeldelser'}` }),
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
      btn.addEventListener('click', () => {
        if (!confirm('Er du sikker på, at du vil slette denne annonce?')) return;
        Store.removeMyListing(Number(btn.dataset.del));
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
  renderDashboard(user);
});
