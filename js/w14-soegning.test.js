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


test('1440: foto ca. 2:1, ingen tom chip-række, Gem søgning i resultathovedet, kompakt hero', { skip }, async () => {
  const s = await aabn({ w: 1440, n: 44 });
  try {
    await gaa(s, 'soegning.html');
    const m = await s.page.evaluate(() => {
      const R = e => document.querySelector(e).getBoundingClientRect();
      const med = R('#results-grid .card .card-media');
      const knap = document.getElementById('save-search-btn');
      return { ratio: med.width / med.height, chiprow: getComputedStyle(document.getElementById('so-chiprow')).display,
        knapI: !!knap.closest('#so-results-head'), cardBund: R('.so-card').bottom, toolbarTop: R('#so-results-head').top };
    });
    assert.ok(m.ratio > 1.9 && m.ratio < 2.1, 'foto-format ' + m.ratio);
    assert.equal(m.chiprow, 'none');
    assert.ok(m.knapI, 'Gem søgning i resultathovedet');
    assert.ok(m.cardBund <= 330, 'søgekortets underkant ' + m.cardBund);
    assert.ok(m.toolbarTop <= 360, 'resultathovedet starter højt: ' + m.toolbarTop);
    const n = await s.page.evaluate(() => {
      const R = e => document.querySelector(e).getBoundingClientRect();
      const bk = R('.so-hero .so-breadcrumb');
      return { heroH: R('.so-hero').height, band: R('#so-infoband').height, bkSynlig: bk.width > 2 && bk.height > 2,
        sorteringsnote: getComputedStyle(document.getElementById('sortering-note')).display,
        kortH: R('#results-grid .card').height, kortBredde: R('#results-grid .card').width,
        kortIHero: R('.so-card').bottom <= R('.so-hero').bottom + 1 };
    });
    assert.ok(n.heroH <= 225, 'hero ' + n.heroH);
    assert.ok(n.kortIHero, 'søgekortet ligger i bannerfotoet');
    assert.ok(n.band <= 44, 'info-bånd er én linje: ' + n.band);
    assert.ok(!n.bkSynlig, 'brødkrumme er kun for skærmlæsere i hero');
    assert.equal(n.sorteringsnote, 'none', 'sorteringsreglen bor i (i) ved Sortér');
    assert.ok(n.kortH <= 290, 'kort højde ' + n.kortH);
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
