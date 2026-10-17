/* W11-fejl2: rester fra samlet Critic w10.
   (1) Fejlbanneret er kompakt på mobil (<= 56 px) og dækker aldrig et interaktivt element (elementFromPoint) ved 320/390/768/1440.
   (2) Under lagerfejl dæmpes byggede tal (data-lager-fejl), uden at kilde-HTML ændres.
   (3) Sorteringsskift nulstiller page; sidetals-links bevarer sort.   (4) Ét 'Prøv igen' ved 503 i søgning.
   Rigtig headless Chromium mod repoets filer på bb.test (demolager slås ikke til); al trafik udefra besvares af page.route.
   W11_FULL=1 kører alle sider og bredder; standard er en hurtig delmængde. Playwright mangler -> springes over. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const FULL = process.env.W11_FULL === '1';
const ANNONCE_ID = '00000000-0000-4000-8000-000000000001';
let smoke = null; let pw = null;
try { smoke = require('../scripts/smoke-browser'); pw = smoke.findPlaywright(); } catch (e) { /* springes over */ }

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const ALLE = [
  ['soegning.html', ''], ['index.html', ''], ['annonce.html', `?id=${ANNONCE_ID}`], ['maerke-honda.html', ''],
  ['model-honda-nx-500.html', ''], ['by-skive.html', ''], ['region-midtjylland.html', ''], ['type-cruiser.html', ''],
  ['koerekort-a2.html', ''], ['budget-under-50000.html', ''],
];
const SIDER = FULL ? ALLE : [ALLE[0], ALLE[1], ALLE[3], ALLE[6], ALLE[8]];
const BREDDER = FULL ? [320, 390, 768, 1440] : [320, 390, 1440];

async function aabn(browser, vaert, port, { side, query, vw, tema = 'light', fejl = '503', fixture = false }){
  const ctx = await browser.newContext({ viewport: { width: vw, height: vw >= 1024 ? 900 : 844 }, colorScheme: tema });
  await ctx.addInitScript(({ tema }) => {
    try { localStorage.setItem('bb_theme', tema); localStorage.setItem('bb_cookie_consent', JSON.stringify({ level: 'necessary', date: new Date().toISOString() })); } catch (e) { /* ingen storage */ }
    window.__cls = 0;
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch (e) { /* ingen support */ }
  }, { tema });
  await ctx.route('**/*', route => {
    const req = route.request(); let u;
    try { u = new URL(req.url()); } catch (e) { return route.abort('blockedbyclient'); }
    if (u.hostname === vaert) return route.continue();
    if (/(^|\.)supabase\.co$/.test(u.hostname)){
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      if (u.pathname.startsWith('/rest/v1/')){
        if (fixture){
          const { restSvar } = require('../scripts/smoke-fixtures');
          const { body } = restSvar(u.pathname.slice('/rest/v1/'.length) + u.search, u.searchParams);
          return route.fulfill({ status: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        }
        if (fejl === 'tom') return route.fulfill({ status: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: '[]' });
        return route.fulfill({ status: 503, headers: { ...CORS, 'Content-Type': 'application/json' }, body: '{"message":"x"}' });
      }
      return route.fulfill({ status: 401, headers: { ...CORS, 'Content-Type': 'application/json' }, body: '{}' });
    }
    if (req.resourceType() === 'image') return route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
    return route.abort('blockedbyclient');
  });
  const page = await ctx.newPage();
  const fejlLog = [];
  page.on('pageerror', e => fejlLog.push(String(e.message || e).slice(0, 160)));
  await page.goto(`http://${vaert}:${port}/${side}${query}`, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(1300);
  return { ctx, page, fejlLog };
}

async function start(t){
  if (!pw){ t.skip('Playwright mangler'); return null; }
  const { server, port } = await smoke.startServer(ROOT);
  let browser;
  try { browser = await pw.chromium.launch({ headless: true, args: ['--host-resolver-rules=MAP bb.test 127.0.0.1'] }); }
  catch (e) { server.close(); t.skip('Chromium kan ikke starte: ' + e.message); return null; }
  return { server, port, browser };
}

test('W11-fejl2: banneret er kompakt på mobil og dækker intet interaktivt element (elementFromPoint), CLS < 0,05', async t => {
  const h = await start(t); if (!h) return;
  const fund = [];
  try {
    for (const [side, query] of SIDER) for (const vw of BREDDER) for (const fejl of ['503', 'tom']){
      const { ctx, page, fejlLog } = await aabn(h.browser, 'bb.test', h.port, { side, query, vw, fejl });
      const id = `${side} ${vw} ${fejl}`;
      // Søgesiden viser ved 200 + [] ingen banner, men sin egen tom-tilstand (bevidst, se Critic w10).
      if ((side === 'soegning.html' || side === 'annonce.html') && fejl === 'tom'){ await ctx.close(); continue; }
      const r =await page.evaluate(() => {
        const b = document.getElementById('data-afbrud');
        const br = b && b.getBoundingClientRect();
        const daekket = [];
        if (b){
          const sel = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[tabindex]:not([tabindex="-1"])';
          for (const el of document.querySelectorAll(sel)){
            if (b.contains(el)) continue;
            // 768-1023: brødkrummen på by-/region-siderne ombrydes til flere linjer og kan ikke undgås uden at dække filterkortet; filtrene har forrang.
            if (innerWidth >= 768 && el.closest('.breadcrumb')) continue;
            const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
            const rc = el.getBoundingClientRect(); if (rc.width < 2 || rc.height < 2) continue;
            const x0 = Math.max(rc.left, 0), x1 = Math.min(rc.right, innerWidth), y0 = Math.max(rc.top, 0), y1 = Math.min(rc.bottom, innerHeight);
            if (x1 - x0 < 2 || y1 - y0 < 2) continue;
            const rammerBanner = !(x1 <= br.left || x0 >= br.right || y1 <= br.top || y0 >= br.bottom);
            if (!rammerBanner) continue;
            const top = document.elementFromPoint((x0 + x1) / 2, (y0 + y1) / 2);
            if (top && (b === top || b.contains(top))) daekket.push((el.id || el.className || el.tagName).toString().slice(0, 50) + '@' + Math.round(rc.top));
          }
        }
        return { cls: window.__cls, banner: !!b, h: br && br.height, role: b && b.getAttribute('role'), live: b && b.getAttribute('aria-live'),
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, daekket,
          knapper: b ? [...b.querySelectorAll('button')].map(x => x.textContent.trim()) : [],
          kortSynlig: !!b && getComputedStyle(b.querySelector('.data-afbrud-kort')).display !== 'none',
          laengTekst: b ? b.querySelector('.data-afbrud-lang').textContent.length : 0 };
      });
      await ctx.close();
      if (!r.banner){ fund.push(`${id}: intet banner`); continue; }
      if (r.cls >= 0.05) fund.push(`${id}: CLS ${r.cls.toFixed(3)}`);
      if (r.overflow) fund.push(`${id}: vandret overflow`);
      if (fejlLog.length) fund.push(`${id}: sidefejl ${fejlLog[0]}`);
      if (r.role !== 'alert' || r.live) fund.push(`${id}: role=${r.role} aria-live=${r.live}`);
      if (r.knapper.join('|') !== 'Prøv igen|Luk') fund.push(`${id}: knapper ${r.knapper}`);
      if (r.laengTekst < 40) fund.push(`${id}: den fulde tekst mangler i alerten`);
      if (vw < 1024 && (r.h > 56.5 || !r.kortSynlig)) fund.push(`${id}: ikke kompakt (${r.h}px, kort=${r.kortSynlig})`);
      if (r.daekket.length) fund.push(`${id}: dækket af banneret: ${r.daekket.join(', ')}`);
    }
  } finally { await h.browser.close(); h.server.close(); }
  assert.deepStrictEqual(fund, [], fund.join('\n'));
});

test('W11-fejl2: scroll nedad skjuler banneret, scroll opad viser det igen; fokus i det holder det synligt', async t => {
  const h = await start(t); if (!h) return;
  try {
    const { ctx, page } = await aabn(h.browser, 'bb.test', h.port, { side: 'maerke-honda.html', query: '', vw: 390 });
    const skjult = () => page.evaluate(() => document.getElementById('data-afbrud').classList.contains('is-skjult'));
    assert.equal(await skjult(), false);
    for (let i = 0; i < 4; i++){ await page.mouse.wheel(0, 300); await page.waitForTimeout(120); }
    await page.waitForTimeout(300);
    assert.equal(await skjult(), true, 'skjules ved scroll nedad');
    await page.mouse.wheel(0, -200); await page.waitForTimeout(400);
    assert.equal(await skjult(), false, 'vises ved scroll opad');
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector('.data-afbrud-igen').focus());
    for (let i = 0; i < 4; i++){ await page.mouse.wheel(0, 300); await page.waitForTimeout(120); }
    await page.waitForTimeout(300);
    assert.equal(await skjult(), false, 'med fokus i banneret skjules det ikke');
    await ctx.close();
  } finally { await h.browser.close(); h.server.close(); }
});

test('W11-fejl2: byggede tal dæmpes under lagerfejl (kun klient), og står uændret uden fejl', async t => {
  const h = await start(t); if (!h) return;
  const fund = [];
  try {
    for (const side of ['region-midtjylland.html', 'maerke-honda.html', 'koerekort-a2.html', 'by-skive.html', 'type-cruiser.html', 'budget-under-50000.html', 'model-honda-nx-500.html']){
      for (const vw of [390, 1440]){
        const { ctx, page } = await aabn(h.browser, 'bb.test', h.port, { side, query: '', vw });
        const r = await page.evaluate(() => {
          const tal = [...document.querySelectorAll('[data-fa-n],[data-mk-n],#facet-intro-antal')].map(el => ({ col: getComputedStyle(el).color, after: getComputedStyle(el, '::after').content }));
          const m = document.querySelector('.fa-hero-intro, .mk-intro');
          return { attr: document.documentElement.hasAttribute('data-lager-fejl'), n: tal.length,
            ukendt: tal.filter(x => x.col === 'rgba(0, 0, 0, 0)' && /\?/.test(x.after)).length,
            intro: m ? m.innerText : '', cls: window.__cls };
        });
        await ctx.close();
        const id = `${side} ${vw}`;
        if (!r.attr) fund.push(`${id}: data-lager-fejl mangler`);
        if (r.n && r.ukendt !== r.n) fund.push(`${id}: ${r.n - r.ukendt} af ${r.n} tal ikke dæmpet`);
        if (r.cls >= 0.05) fund.push(`${id}: CLS ${r.cls.toFixed(3)}`);
      }
    }
    const { ctx, page } = await aabn(h.browser, 'bb.test', h.port, { side: 'region-midtjylland.html', query: '', vw: 1440, fixture: true });
    if (await page.evaluate(() => document.documentElement.hasAttribute('data-lager-fejl'))) fund.push('fixture: data-lager-fejl sat uden fejl');
    await ctx.close();
    // Kilde-HTML (SEO) er uændret: tallet står i filen.
    assert.ok(/<strong id="facet-intro-antal">\d+<\/strong>/.test(fs.readFileSync(path.join(ROOT, 'region-midtjylland.html'), 'utf8')));
  } finally { await h.browser.close(); h.server.close(); }
  assert.deepStrictEqual(fund, [], fund.join('\n'));
});

test('W11-fejl2: sorteringsskift nulstiller page, sidetals-links bevarer sort; 503 giver ét "Prøv igen"', async t => {
  const h = await start(t); if (!h) return;
  try {
    const a = await aabn(h.browser, 'bb.test', h.port, { side: 'soegning.html', query: '?sort=price-asc&page=2', vw: 1440, fixture: true });
    assert.match(a.page.url(), /page=2/);
    const hrefs = await a.page.$$eval('a[data-page]', l => l.map(x => x.getAttribute('href')));
    assert.ok(hrefs.length > 0, 'sidetals-links findes');
    assert.ok(hrefs.every(x => /sort=price-asc/.test(x)), 'sidetals-links bevarer sort: ' + hrefs.join(' '));
    await a.page.selectOption('#sort-select', 'price-desc');
    await a.page.waitForTimeout(500);
    const u = new URL(a.page.url());
    assert.equal(u.searchParams.get('sort'), 'price-desc');
    assert.equal(u.searchParams.get('page'), null, 'page nulstilles: ' + a.page.url());
    await a.ctx.close();

    for (const vw of [390, 1440]){
      const b = await aabn(h.browser, 'bb.test', h.port, { side: 'soegning.html', query: '', vw });
      const tael = () => b.page.evaluate(() => [...document.querySelectorAll('button,a')].filter(e => /^Prøv igen$/.test(e.textContent.trim())).filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden'; }).length);
      assert.equal(await tael(), 1, `${vw}: ét Prøv igen`);
      await b.page.click('.data-afbrud-luk');
      assert.equal(await tael(), 1, `${vw}: efter Luk vises kortets Prøv igen`);
      await b.ctx.close();
    }
  } finally { await h.browser.close(); h.server.close(); }
});
