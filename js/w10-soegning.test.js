/* w10-soegning: browsertest af søgesiden (billede 2) mod lokal mock — ingen produktion, intet netværk.
   Kører kun hvis Playwright findes (ellers springes den over, som de øvrige browsertests).
   Tre ting låses: hero/resultathoved/kort/paginering ligger som billedet (målt), Gem søgning-panelet er ærligt,
   og tilstandene (filter, tom, 503) bryder ikke layoutet. */
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

test('markup: Viser-linje og Gem søgning-panel findes, panelet er ærligt (ingen e-mail-løfte)', () => {
  const html = læs('soegning.html'), css = læs('css/p-soegning.css'), js = læs('js/search.js');
  assert.match(html, /id="so-viser"/);
  assert.match(html, /<section class="so-agent" id="so-agent"[^>]*hidden>/);
  assert.match(html, /Der sendes endnu ingen e-mails/);
  assert.doesNotMatch(html.match(/<section class="so-agent"[\s\S]*?<\/section>/)[0], /vi sender|du får en e-mail|besked når/i);
  assert.doesNotMatch(css, /\.so-hero|\.so-card\b/, 'V3: død hero-/søgekort-CSS er fjernet');
  assert.match(js, /function renderViser\(/);
  assert.match(js, /getElementById\('so-agent-btn'\)\?\.addEventListener\('click', \(\) => document\.getElementById\('save-search-btn'\)\.click\(\)\)/);
});

test('desktop 1440: ingen hero (resultathoved højt oppe), kompakt søgefelt, resultathoved på én linje, 4 kolonner, titel og pris på samme linje', { skip }, async () => {
  const s = await aabn({ w: 1440, n: 44 });
  try {
    await gaa(s, 'soegning.html');
    const m = await s.page.evaluate(() => {
      const R = e => document.querySelector(e).getBoundingClientRect();
      const q = R('.so-q'), c0 = document.querySelector('#results-grid .card');
      const t = c0.querySelector('.rk-titel').getBoundingClientRect(), pr = c0.querySelector('.rk-pris').getBoundingClientRect();
      const mid = e => { const r = R(e); return r.top + r.height / 2; };
      return {
        qBund: q.bottom, qH: q.height, hero: !!document.querySelector('.so-hero'),
        h1Skjult: (() => { const r = R('h1'); return r.width <= 2 && r.height <= 2; })(),
        toolbarTop: R('#so-results-head').top,
        linje: [mid('#results-count'), mid('.sort-felt'), mid('.view-toggle')], infoH: R('#so-infoband').height,
        titelPris: Math.abs(t.top - pr.top) < 8, kolonner: getComputedStyle(document.querySelector('#results-grid')).gridTemplateColumns.split(' ').length,
        viser: document.getElementById('so-viser').textContent, agentSynlig: !document.getElementById('so-agent').hidden,
        pagLinks: [...document.querySelectorAll('#pagination a[data-page]')].map(a => { const r = a.getBoundingClientRect(); return [r.width, r.height]; }),
      };
    });
    /* V3: ingen hero — søgefeltet er en kompakt linje og resultathovedet starter højt. */
    assert.equal(m.hero, false, 'ingen .so-hero');
    assert.ok(m.qH <= 50, `søgefelt ${m.qH}`);
    assert.ok(m.h1Skjult, 'h1 er kun for skærmlæsere');
    assert.ok(m.toolbarTop <= 260, `resultathovedet starter højt: ${m.toolbarTop}`);
    assert.ok(Math.max(...m.linje) - Math.min(...m.linje) < 8, 'tal, sortér og gitter/liste på samme linje ' + m.linje);
    /* W14: ærlighedsteksten ombrydes i stedet for at blive afkortet (to rolige linjer, sorteringsnoten synlig). */
    assert.ok(m.infoH <= 60, `info-linje ${m.infoH}`);
    assert.ok(m.titelPris, 'titel og pris på samme linje');
    assert.equal(m.kolonner, 4);
    assert.match(m.viser, /^Viser 1–24 af [\d.]+ motorcykler$/);
    assert.ok(m.agentSynlig, 'Gem søgning-panelet står under gitteret');
    assert.ok(m.pagLinks.length >= 3 && m.pagLinks.every(([b, h]) => b >= 40 && h >= 40), 'sidetal >= 40 px');
    const [sw, cw] = await overflow(s);
    assert.equal(sw, cw);
    assert.deepEqual(s.fejl, []);
  } finally { await s.luk(); }
});

test('Gem søgning-panelet skifter tilstand med topknappen, og side 2 viser 25–48 med filtrene bevaret', { skip }, async () => {
  const s = await aabn({ w: 1440, n: 140 });
  try {
    await gaa(s, 'soegning.html?sort=price-asc&page=2');
    const v = await s.page.evaluate(() => document.getElementById('so-viser').textContent);
    assert.match(v, /^Viser 25–48 af /);
    assert.match(await s.page.evaluate(() => document.querySelector('#pagination a[data-page="3"]').getAttribute('href')), /sort=price-asc/);
    await s.page.click('#so-agent-btn');
    await s.page.waitForTimeout(400);
    assert.match(await s.page.textContent('#save-search-label'), /Søgning gemt/);
    assert.match(await s.page.textContent('#so-agent-label'), /Søgning gemt/);
    await s.page.click('#so-agent-btn');
    await s.page.waitForTimeout(300);
    assert.equal((await s.page.textContent('#so-agent-label')).trim(), 'Gem søgning');
    assert.deepEqual(s.fejl, []);
  } finally { await s.luk(); }
});

test('chips: ét pr. filter, Ryd alle nulstiller URL; tom tilstand uden Viser-linje/panel; ingen overflow 320-1440 lys og mørk', { skip }, async () => {
  for (const [w, dark] of [[320, false], [390, true], [768, false], [1024, true], [1440, false], [1440, true]]) {
    const s = await aabn({ w, dark });
    try {
      await gaa(s, 'soegning.html?q=honda&koerekort=A2');
      const chips = await s.page.evaluate(() => [...document.querySelectorAll('#active-filters .active-filter-pill')].map(e => e.textContent.trim()));
      assert.ok(chips.length >= 2, `${w}: chips ${chips}`);
      assert.deepEqual(await overflow(s).then(([a, b]) => a === b), true, `${w}${dark ? 'm' : 'l'} overflow med filter`);
      await s.page.click('#so-clear-all');
      await s.page.waitForTimeout(500);
      assert.equal(await s.page.evaluate(() => location.search), '');
      await gaa(s, 'soegning.html?q=zzzzqqq');
      const t = await s.page.evaluate(() => ({ tom: getComputedStyle(document.getElementById('empty-state')).display !== 'none', viser: document.getElementById('so-viser').textContent, agent: !document.getElementById('so-agent').hidden }));
      assert.ok(t.tom && t.viser === '' && !t.agent, JSON.stringify(t));
      assert.ok(await overflow(s).then(([a, b]) => a === b), `${w}${dark ? 'm' : 'l'} overflow tom`);
      assert.deepEqual(s.fejl, []);
    } finally { await s.luk(); }
  }
});

test('backend 503: ærlig fejltilstand med "Prøv igen", ingen kort, ingen Viser-linje, ingen overflow', { skip }, async () => {
  for (const w of [390, 1440]) {
    const s = await aabn({ w, fail: 503 });
    try {
      await s.page.goto(`${s.base}/soegning.html`);
      await s.page.waitForTimeout(3500);
      const i = await s.page.evaluate(() => ({
        retry: !!document.getElementById('empty-retry-btn') && !document.getElementById('empty-retry-btn').hidden,
        viser: document.getElementById('so-viser').textContent, agent: !document.getElementById('so-agent').hidden,
        gitterSkjult: getComputedStyle(document.getElementById('results-grid')).display === 'none',
      }));
      assert.ok(i.retry && i.viser === '' && !i.agent && i.gitterSkjult, JSON.stringify(i));
      assert.ok(await overflow(s).then(([a, b]) => a === b), `${w} overflow`);
    } finally { await s.luk(); }
  }
});
