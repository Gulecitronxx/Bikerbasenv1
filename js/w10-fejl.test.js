/* W10-fejl: FEJLBANNERET MÅ ALDRIG FLYTTE INDHOLD.

   Når databasen svarer 503/500/tomt (eller netværket afbrydes), skriver js/backend-bridge.js en ærlig besked
   (#data-afbrud, role=alert). Den stod før i flowet øverst i <main> og skubbede hele siden (CLS 0,07-1,0).
   Nu er den et fast overlay (position:fixed, ude af flowet), så den ikke KAN skubbe noget.

   Testen kører en rigtig headless Chromium mod repoets statiske filer på et hostnavn, der ikke er localhost
   (bb.test, via --host-resolver-rules), så demolageret (js/data.js SHOW_DEMO_DATA) ikke aktiveres. ALT udefra
   besvares af page.route: Supabase-REST med den fejl, der testes. Ingen forespørgsel forlader maskinen.

   Standard: en lille matrix (hurtig). W10_FULL=1 kører hele matricen (10 sider × 4 bredder × lys/mørk × 4 fejl ×
   2 forsinkelser) og skriver tabellen. Playwright mangler → testen springes over. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const FULL = process.env.W10_FULL === '1';
const CLS_GRAENSE = 0.05;
const ANNONCE_ID = '00000000-0000-4000-8000-000000000001';

let smoke = null; let pw = null;
try { smoke = require('../scripts/smoke-browser'); pw = smoke.findPlaywright(); } catch (e) { /* springes over */ }

const SIDER = [
  ['index.html', ''], ['soegning.html', ''], ['annonce.html', `?id=${ANNONCE_ID}`], ['maerke-honda.html', ''],
  ['model-honda-nx-500.html', ''], ['by-skive.html', ''], ['region-midtjylland.html', ''], ['type-cruiser.html', ''],
  ['koerekort-a2.html', ''], ['budget-under-50000.html', ''],
];
const FEJL = {
  '503': route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"service unavailable"}' }),
  '500': route => route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"internal"}' }),
  'tom': route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  'abort': route => route.abort('connectionreset'),
};
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

async function maal(browser, vaert, port, { side, query, vw, tema, fejl, forsinkelse }){
  const ctx = await browser.newContext({ viewport: { width: vw, height: vw >= 1024 ? 900 : 844 }, colorScheme: tema });
  await ctx.addInitScript(({ tema }) => {
    try {
      localStorage.setItem('bb_theme', tema);
      localStorage.setItem('bb_cookie_consent', JSON.stringify({ level: 'necessary', date: new Date().toISOString() }));
    } catch (e) { /* ingen storage */ }
    window.__w10 = { cls: 0, kilder: [] };
    try {
      new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__w10.cls += e.value; window.__w10.kilder.push(e.value.toFixed(3) + ' ' + (e.sources || []).map(s => s.node && (s.node.id || s.node.className || s.node.nodeName)).join(',')); } })
        .observe({ type: 'layout-shift', buffered: true });
    } catch (e) { /* ingen support */ }
  }, { tema });
  await ctx.route('**/*', async route => {
    const req = route.request(); let u;
    try { u = new URL(req.url()); } catch (e) { return route.abort('blockedbyclient'); }
    if (u.hostname === vaert) return route.continue();
    if (/(^|\.)supabase\.co$/.test(u.hostname)){
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      if (u.pathname.startsWith('/rest/v1/')){
        if (forsinkelse) await new Promise(r => setTimeout(r, forsinkelse));
        if (fejl === 'delvis' && u.pathname.endsWith('/eksterne_annoncer')){
          const { restSvar } = require('../scripts/smoke-fixtures');
          const { body } = restSvar(u.pathname.slice('/rest/v1/'.length) + u.search, u.searchParams);
          return route.fulfill({ status: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        }
        const f = FEJL[fejl === 'delvis' ? '503' : fejl];
        return f({ fulfill: o => route.fulfill({ ...o, headers: { ...CORS, 'Content-Type': o.contentType } }), abort: c => route.abort(c) });
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
  await page.waitForTimeout(forsinkelse + 1300);
  const r = await page.evaluate(() => {
    const a = document.getElementById('data-afbrud');
    const cs = a ? getComputedStyle(a) : null;
    const rect = a ? a.getBoundingClientRect() : null;
    const synlig = !!a && cs.display !== 'none' && cs.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    return {
      cls: window.__w10.cls, kilder: window.__w10.kilder,
      banner: !!a, position: cs && cs.position, synlig,
      rolle: a && a.getAttribute('role'), liveAttr: a && a.getAttribute('aria-live'),
      iViewport: !!rect && rect.top >= -1 && rect.bottom <= innerHeight + 1 && rect.left >= -1 && rect.right <= innerWidth + 1,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      body: document.body.innerText,
      facetAntal: (document.getElementById('facet-antal') || {}).textContent || '',
      knap: !!(a && a.querySelector('button.data-afbrud-igen')),
    };
  });
  await ctx.close();
  return { ...r, fejlLog };
}

const MATRIX = FULL
  ? { sider: SIDER.filter(([s]) => !process.env.W10_KUN || s.includes(process.env.W10_KUN)), bredder: (process.env.W10_BREDDER || '320,390,768,1440').split(',').map(Number), temaer: ['light', 'dark'], fejl: Object.keys(FEJL), forsinkelser: [0, 1200] }
  : { sider: SIDER, bredder: [390, 1440], temaer: ['light'], fejl: ['503', 'tom'], forsinkelser: [0] };

test('W10-fejl: fejlbanneret flytter aldrig indhold (CLS < 0,05) og er et tilgængeligt overlay', async t => {
  if (!pw){ t.skip('Playwright mangler'); return; }
  const { startServer } = smoke;
  const { server, port } = await startServer(ROOT);
  let browser;
  try {
    browser = await pw.chromium.launch({ headless: true, args: [`--host-resolver-rules=MAP bb.test 127.0.0.1`] });
  } catch (e) { server.close(); t.skip('Chromium kan ikke starte: ' + e.message); return; }
  const rader = []; const fund = [];
  try {
    for (const [side, query] of MATRIX.sider)
      for (const vw of MATRIX.bredder)
        for (const tema of MATRIX.temaer)
          for (const fejl of MATRIX.fejl)
            for (const forsinkelse of MATRIX.forsinkelser){
              const r = await maal(browser, 'bb.test', port, { side, query, vw, tema, fejl, forsinkelse });
              const id = `${side} ${vw} ${tema} ${fejl} ${forsinkelse}ms`;
              rader.push({ id, cls: r.cls, banner: r.banner });
              if (r.cls >= CLS_GRAENSE) fund.push(`${id}: CLS ${r.cls.toFixed(3)} ${r.kilder.join(' | ')}`);
              if (r.fejlLog.length) fund.push(`${id}: sidefejl ${r.fejlLog[0]}`);
              if (r.overflow) fund.push(`${id}: vandret overflow`);
              if (r.banner){
                if (r.position !== 'fixed') fund.push(`${id}: banneret er ${r.position}, ikke fixed`);
                if (r.rolle !== 'alert') fund.push(`${id}: role=${r.rolle}, forventet alert`);
                if (r.liveAttr) fund.push(`${id}: aria-live sat oven i role=alert (dobbelt oplæsning)`);
                if (!r.knap) fund.push(`${id}: 'Prøv igen' mangler`);
                if (!r.iViewport) fund.push(`${id}: banneret ligger uden for viewport`);
              }
              if (r.banner && /(^|\s)0 annoncer/.test(r.body)) fund.push(`${id}: '0 annoncer' i bodytekst under fejlbanner`);
              if (side === 'index.html' && r.banner && /\d[\d.]* annoncer i Danmark/.test(r.body))
                fund.push(`${id}: forsiden påstår et tal ('annoncer i Danmark') under fejlbanneret`);
            }
  } finally { await browser.close(); server.close(); }
  if (process.env.W10_TABEL) console.log(rader.map(r => `${r.cls.toFixed(3)}\t${r.banner ? 'B' : '-'}\t${r.id}`).join('\n'));
  assert.deepStrictEqual(fund, [], fund.join('\n'));
});

test('W10-fejl: delvis fejl (kun én kilde svarer) og demolager: ingen tal siden ikke kender', async t => {
  if (!pw){ t.skip('Playwright mangler'); return; }
  const { server, port } = await smoke.startServer(ROOT);
  let browser;
  try { browser = await pw.chromium.launch({ headless: true, args: ['--host-resolver-rules=MAP bb.test 127.0.0.1'] }); }
  catch (e) { server.close(); t.skip('Chromium kan ikke starte: ' + e.message); return; }
  const fund = [];
  try {
    for (const vw of [390, 1440]){
      // Model, som fixturerne ikke har: egne = 503, eksterne = svar uden træf -> facet-scriptet vil skrive "0 annoncer".
      const m = await maal(browser, 'bb.test', port, { side: 'model-honda-crf-1100-l-africa.html', query: '', vw, tema: 'light', fejl: 'delvis', forsinkelse: 0 });
      if (!m.banner) fund.push(`delvis ${vw}: intet fejlbanner`);
      if (/^\s*0\s+annonce/.test(m.facetAntal)) fund.push(`delvis ${vw}: #facet-antal siger '${m.facetAntal}'`);
      if (m.cls >= CLS_GRAENSE) fund.push(`delvis ${vw}: CLS ${m.cls.toFixed(3)}`);
      // Forsiden på localhost (demolager aktivt, 51 annoncer) med 503: hero-tallet må ikke stå under banneret.
      const h = await maal(browser, '127.0.0.1', port, { side: 'index.html', query: '', vw, tema: 'light', fejl: '503', forsinkelse: 0 });
      if (h.banner && /\d[\d.]* annoncer i Danmark/.test(h.body)) fund.push(`demo-forside ${vw}: 'annoncer i Danmark' under fejlbanner`);
      /* CLS måles ikke her: demolageret (kun localhost) har ingen fotos, så forsidens "udvalgte"-række er tom og sælg-panelet skifter bredde. Det er demodata, ikke fejlbanneret. */
    }
  } finally { await browser.close(); server.close(); }
  assert.deepStrictEqual(fund, [], fund.join('\n'));
});

test('W10-fejl: banneret er tastaturtilgængeligt, "Prøv igen" genindlæser og "Luk" fjerner det uden at flytte noget', async t => {
  if (!pw){ t.skip('Playwright mangler'); return; }
  const { server, port } = await smoke.startServer(ROOT);
  let browser;
  try { browser = await pw.chromium.launch({ headless: true, args: ['--host-resolver-rules=MAP bb.test 127.0.0.1'] }); }
  catch (e) { server.close(); t.skip('Chromium kan ikke starte: ' + e.message); return; }
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => { localStorage.setItem('bb_cookie_consent', JSON.stringify({ level: 'necessary', date: new Date().toISOString() })); });
    let fejler = true;
    await ctx.route('**/*', route => {
      const u = new URL(route.request().url());
      if (u.hostname === 'bb.test') return route.continue();
      if (/supabase\.co$/.test(u.hostname)){
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
        if (u.pathname.startsWith('/rest/')){
          if (fejler) return route.fulfill({ status: 503, headers: { ...CORS, 'Content-Type': 'application/json' }, body: '{}' });
          const { body } = require('../scripts/smoke-fixtures').restSvar(u.pathname.slice('/rest/v1/'.length) + u.search, u.searchParams);
          return route.fulfill({ status: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        }
        return route.fulfill({ status: 401, headers: CORS, body: '{}' });
      }
      return route.abort('blockedbyclient');
    });
    const page = await ctx.newPage();
    await page.goto(`http://bb.test:${port}/maerke-honda.html`);
    await page.waitForSelector('#data-afbrud');
    // Tab fra sidens top når "Prøv igen" før noget andet i <main>, og begge knapper kan nås med tastaturet.
    const raekkefoelge = [];
    for (let i = 0; i < 40 && !raekkefoelge.includes('data-afbrud-luk'); i++){
      await page.keyboard.press('Tab');
      const k = await page.evaluate(() => (document.activeElement && document.activeElement.className) || '');
      if (/data-afbrud/.test(k)) raekkefoelge.push(k.trim());
    }
    assert.deepStrictEqual(raekkefoelge, ['data-afbrud-igen', 'data-afbrud-luk']);
    // Luk (tastatur): banneret væk, siden uændret.
    const foer = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#data-afbrud').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollHeight), foer);
    // Prøv igen: databasen er kommet sig -> ny indlæsning, og banneret er væk uden at have flyttet noget.
    await page.reload();
    await page.waitForSelector('#data-afbrud');
    fejler = false;
    await Promise.all([page.waitForNavigation(), page.focus('.data-afbrud-igen').then(() => page.keyboard.press('Enter'))]);
    await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
    assert.equal(await page.locator('#data-afbrud').count(), 0);
    await ctx.close();
  } finally { await browser.close(); server.close(); }
});
