/* w14-soegning: browsertest mod lokal mock (ingen produktion). Låser: 2:1-foto i kortgitteret, Gem søgning i resultathovedet fra 1280 px,
   tom chip-række skjult uden filtre, kompakt hero. Springes over uden Playwright. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const REPO = path.join(__dirname, '..');
const læs = f => fs.readFileSync(path.join(REPO, f), 'utf8');

let chromium = null;
try { ({ chromium } = require('playwright')); } catch (e) {
  try { ({ chromium } = require(path.join(REPO, 'node_modules', 'playwright'))); } catch (e2) { /* springes over */ }
}
const { eksterneRaekker, egneRaekker, PNG_1X1, uuid } = require(path.join(REPO, 'scripts', 'smoke-fixtures.js'));

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain' };
function server() {
  return new Promise(res => {
    const s = http.createServer((q, r) => {
      const p = decodeURIComponent(q.url.split('?')[0]);
      let f = path.join(REPO, p === '/' ? 'index.html' : p);
      if (!path.extname(f)) f += '.html';
      fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end('x'); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(b); });
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}
function raekker(n) {
  const base = eksterneRaekker();
  return Array.from({ length: n }, (_, i) => {
    const b = JSON.parse(JSON.stringify(base[i % base.length]));
    b.id = uuid(1000 + i); b.kilde_annonce_id = String(5000 + i);
    if (i >= base.length) { b.url += '?n=' + i; b.aargang -= i % 3; }
    return b;
  });
}

async function aabn({ w = 1440, dark = false, n = 44, fail = 0 } = {}) {
  const srv = await server(), port = srv.address().port;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: w, height: w > 800 ? 900 : 844 }, colorScheme: dark ? 'dark' : 'light' });
  await ctx.addInitScript(({ dark }) => {
    try { localStorage.setItem('bb_cookie_consent', JSON.stringify({ level: 'necessary', date: new Date().toISOString() })); localStorage.setItem('bb_theme', dark ? 'dark' : 'light'); } catch (e) { /* ingen lagring */ }
  }, { dark });
  const R = raekker(n);
  await ctx.route('**/*', route => {
    const req = route.request(), u = new URL(req.url());
    if (u.hostname === '127.0.0.1' && Number(u.port) === port) return route.continue();
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
    if (/supabase\.co$/.test(u.hostname)) {
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      if (u.pathname.startsWith('/rest/v1/')) {
        const t = u.pathname.slice(9);
        if (fail && (t === 'eksterne_annoncer' || t === 'listings')) return route.fulfill({ status: fail, headers: cors, body: '{}' });
        const lim = Number(u.searchParams.get('limit')), off = Number(u.searchParams.get('offset')) || 0;
        const sl = l => l.slice(off, lim ? off + lim : undefined);
        const body = t === 'eksterne_annoncer' ? sl(R) : t === 'listings' ? sl(egneRaekker()) : [];
        return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
      return route.fulfill({ status: 401, headers: { ...cors, 'Content-Type': 'application/json' }, body: '{}' });
    }
    if (req.resourceType() === 'image') return route.fulfill({ status: 200, headers: { 'Content-Type': 'image/png' }, body: PNG_1X1 });
    return route.abort('blockedbyclient');
  });
  const page = await ctx.newPage(), fejl = [];
  page.on('pageerror', e => fejl.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|Content.Security/.test(m.text())) fejl.push(m.text()); });
  return { page, fejl, base: `http://127.0.0.1:${port}`, luk: async () => { await browser.close(); srv.close(); } };
}
const gaa = async (s, url) => { await s.page.goto(`${s.base}/${url}`); await s.page.waitForSelector('#results-count'); await s.page.waitForTimeout(1800); };
const overflow = s => s.page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
const skip = chromium ? false : 'Playwright mangler';


test('1440: foto ca. 2:1, ingen tom chip-række, Gem søgning i resultathovedet, ingen hero', { skip }, async () => {
  const s = await aabn({ w: 1440, n: 44 });
  try {
    await gaa(s, 'soegning.html');
    const m = await s.page.evaluate(() => {
      const R = e => document.querySelector(e).getBoundingClientRect();
      const med = R('#results-grid .card .card-media');
      const knap = document.getElementById('save-search-btn');
      return { ratio: med.width / med.height, chiprow: getComputedStyle(document.getElementById('so-chiprow')).display,
        knapI: !!knap.closest('#so-results-head'), cardBund: R('.so-q').bottom, toolbarTop: R('#so-results-head').top };
    });
    assert.ok(m.ratio > 2.2 && m.ratio < 2.4, 'foto-format ' + m.ratio);
    assert.equal(m.chiprow, 'none');
    assert.ok(m.knapI, 'Gem søgning i resultathovedet');
    assert.ok(m.cardBund <= 200, 'søgefeltets underkant ' + m.cardBund);
    assert.ok(m.toolbarTop <= 260, 'resultathovedet starter højt: ' + m.toolbarTop);
    const n = await s.page.evaluate(() => {
      const R = e => document.querySelector(e).getBoundingClientRect();
      const bk = R('.so-top .so-breadcrumb');
      return { band: R('#so-infoband').height, bkSynlig: bk.width > 2 && bk.height > 2,
        sorteringsnote: getComputedStyle(document.getElementById('sortering-note')).display,
        kortH: R('#results-grid .card').height, kortBredde: R('#results-grid .card').width,
        ingenHero: !document.querySelector('.so-hero, .so-card') };
    });
    assert.ok(n.ingenHero, 'hero og søgekort er fjernet (V3)');
    assert.ok(n.band <= 44, 'info-bånd er én linje: ' + n.band);
    assert.ok(n.bkSynlig, 'brødkrummen er synlig over søgefeltet');
    assert.equal(n.sorteringsnote, 'block', 'sorteringsreglen er synlig i info-linjen');
    assert.ok(n.kortH >= 195 && n.kortH <= 215, 'kort højde ' + n.kortH);
    const [sw, cw] = await s.page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    assert.equal(sw, cw);
    assert.deepEqual(s.fejl, []);
  } finally { await s.luk(); }
});

test('filter-URL 1440: chip-rækken vises; under 1280 bliver Gem søgning i chip-rækken', { skip }, async () => {
  const s = await aabn({ w: 1440, n: 44 });
  try {
    await gaa(s, 'soegning.html?q=honda&koerekort=A2');
    assert.notEqual(await s.page.evaluate(() => getComputedStyle(document.getElementById('so-chiprow')).display), 'none');
    await s.page.setViewportSize({ width: 1100, height: 900 });
    await s.page.waitForTimeout(400);
    assert.ok(await s.page.evaluate(() => !!document.getElementById('save-search-btn').closest('#so-chiprow')), 'knappen tilbage i chip-rækken ved 1100');
    await s.page.setViewportSize({ width: 1440, height: 900 });
    await s.page.waitForTimeout(400);
    assert.ok(await s.page.evaluate(() => !!document.getElementById('save-search-btn').closest('#so-results-head')));
  } finally { await s.luk(); }
});

test('1440 uden thumbnails: ærligt typefoto med label (ingen stiplede tomme felter), sammenlign i kortets fod, titel på én linje', { skip }, async () => {
  const s = await aabn({ w: 1440, n: 44 });
  try {
    await gaa(s, 'soegning.html');
    const m = await s.page.evaluate(() => {
      const kort = [...document.querySelectorAll('#results-grid .card-rich')];
      return {
        n: kort.length,
        stiplet: kort.filter(k => k.querySelector('.card-media > .foto-tom:not(.foto-fejl)')).length,
        typefoto: kort.filter(k => k.querySelector('.typefoto .typefoto-label')).length,
        labelTekst: [...new Set([...document.querySelectorAll('.typefoto-label')].map(e => e.textContent))],
        samIFoto: kort.filter(k => k.querySelector('.card-media .card-compare')).length,
        titelLinjer: Math.max(...kort.map(k => { const t = k.querySelector('.rk-titel'); return Math.round(t.getBoundingClientRect().height / parseFloat(getComputedStyle(t).lineHeight)); })),
        hoejder: [...new Set(kort.map(k => Math.round(k.getBoundingClientRect().height)))],
        brodkrumme: document.querySelector('.so-top .so-breadcrumb').getBoundingClientRect().width,
        bundH: (() => { const c = document.querySelector('main > .container:last-of-type'); return c.getBoundingClientRect().height; })(),
        info: (() => { const b = document.getElementById('so-infoband'); return [...b.querySelectorAll('*')].filter(e => e.offsetParent && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible' && getComputedStyle(e).textOverflow === 'ellipsis').length; })(),
      };
    });
    assert.ok(m.typefoto > 0 && m.labelTekst.every(t => /ikke annoncens/i.test(t)), 'typefoto med ærligt label');
    assert.equal(m.stiplet, 0, 'ingen stiplede tomme fotofelter');
    assert.equal(m.samIFoto, 0, 'sammenlign ligger ikke i fotoet');
    assert.equal(m.titelLinjer, 1, 'titel på én linje');
    assert.ok(Math.max(...m.hoejder) - Math.min(...m.hoejder) <= 4 && Math.max(...m.hoejder) <= 215, 'ens kort: ' + m.hoejder);
    assert.ok(m.bundH <= 350, 'bundmoduler ' + m.bundH);
    assert.equal(m.info, 0, 'info-linjen er ikke afkortet med ellipsis');
  } finally { await s.luk(); }
});

test('503 ved 1440: fejlbanneret dækker ingen af søgefeltets kontroller (elementFromPoint)', { skip }, async () => {
  const s = await aabn({ w: 1440, n: 44, fail: 503 });
  try {
    await gaa(s, 'soegning.html');
    await s.page.waitForSelector('.data-afbrud', { timeout: 8000 });
    const r = await s.page.evaluate(() => {
      const fejl = [];
      for (const e of document.querySelectorAll('#srp-search input:not([type=hidden]), #srp-search select, #srp-search button, #srp-search label')) {
        const b = e.getBoundingClientRect(); if (!b.width) continue;
        const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        if (top && top.closest('.data-afbrud')) fejl.push(e.id || e.textContent.trim().slice(0, 12));
      }
      const ban = document.querySelector('.data-afbrud').getBoundingClientRect(), kort = document.getElementById('srp-search').getBoundingClientRect();
      return { fejl, overlap: !(ban.right <= kort.left || ban.left >= kort.right || ban.bottom <= kort.top || ban.top >= kort.bottom) };
    });
    assert.deepEqual(r.fejl, []);
    assert.equal(r.overlap, false, 'banneret overlapper ikke søgefeltet');
  } finally { await s.luk(); }
});

test('paginering scroller til resultathovedet og bevarer sortering; tilbage bevarer filter', { skip }, async () => {
  const s = await aabn({ w: 1440, n: 140 });
  try {
    await gaa(s, 'soegning.html?sort=price-asc');
    await s.page.evaluate(() => window.scrollTo(0, 2500));
    await s.page.click('#pagination a[data-page="2"]');
    await s.page.waitForTimeout(1500);
    const y = await s.page.evaluate(() => document.getElementById('so-results-head').getBoundingClientRect().top);
    assert.ok(y >= -20 && y <= 140, 'resultathovedet er øverst i billedet: ' + y);
    assert.match(await s.page.evaluate(() => location.search), /sort=price-asc.*page=2|page=2.*sort=price-asc/);
    await s.page.goBack();
    await s.page.waitForTimeout(1200);
    assert.doesNotMatch(await s.page.evaluate(() => location.search), /page=2/);
    assert.match(await s.page.evaluate(() => location.search), /sort=price-asc/);
  } finally { await s.luk(); }
});
