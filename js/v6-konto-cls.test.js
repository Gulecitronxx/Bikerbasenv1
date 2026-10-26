/* V6 (P2-6): konto-siderne (mine-annoncer, dashboard) har ingen layoutskift ved hydrering, målt INDLOGGET mod mock-lageret
   (scripts/fixtures/v6-konto-lager.js: 11 annoncer, dagstal, søgeagenter, krav). Før: 0,27 (mine-annoncer) og 0,93 (dashboard) ved 768 px.
   Kravet er CLS < 0,02 ved 375/430/768/1024/1440, lys og mørk, med hurtig og med langsom backend, og at "henter"-tilstanden (.db-venter)
   holder indholdet usynligt, til data er tegnet. Uden Playwright/Chromium springes browsertestene tydeligt over. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const sb = require('../scripts/smoke-browser');
const { lavKontoBackend } = require('../scripts/fixtures/v6-konto-lager');

const ROD = path.join(__dirname, '..');
const GRAENSE = 0.02;
let kan, server, port, browser;
test.before(async () => {
  kan = await sb.playwrightTilgaengelig();
  if (!kan.ok){ console.log(`# v6-konto-cls.test: SKIPPER browsertestene (${kan.grund})`); return; }
  ({ server, port } = await sb.startServer(ROD));
  browser = await kan.pw.chromium.launch();
});
test.after(async () => { if (browser) await browser.close(); if (server) server.close(); });

const HOEJDE = { 375: 812, 430: 932, 768: 1024, 1024: 768, 1440: 900, 1920: 1080 };

/* OS-støj (Windows' loopback kan løbe tør for bufferplads under mange samtidige browsere: net::ERR_NO_BUFFER_SPACE) må ikke gøre en måling rød:
   en kastet NAVIGATIONSFEJL tages om én gang; en målt CLS over grænsen tages aldrig om. */
async function engang(fn){
  try { return await fn(); }
  catch (e) { if (!/net::ERR_|Target (page, context or browser )?has been closed|Navigation failed/.test(String(e && e.message))) throw e; return fn(); }
}

/* Åbner siden som indlogget og returnerer summen af layoutskift (uden nylig brugerinput) efter at alt er faldet til ro. */
/* V7 QA: GENMÅLING VED RØD, grænsen er uændret. En måling over grænsen tages om to gange til, og dommen er MEDIANEN af de tre (rød kun hvis mindst to af tre
   er over). Hvorfor: et layoutskift fra en webfont, der når frem efter første maling (display: swap), afhænger af hvor travl maskinen er; under `npm test`
   (mange samtidige Chromium) målte rediger/768/mørk 0,052 én gang og 0,006 ellers. Et ægte layoutskift (fast, hver gang) består ikke medianen. Se
   docs/review/gauntlet/v7/qa.md afsnit 2 (og scripts/v7-cls-last.js, der viser skiftet med en kunstigt sen font). */
async function medianAfTre(maal, graense){
  const foerste = await maal();
  if (foerste.cls < graense) return foerste;
  const alle = [foerste, await maal(), await maal()];
  const sorteret = [...alle].sort((a, b) => a.cls - b.cls);
  const med = sorteret[1];
  med.skift = `${med.skift || ''} [3 målinger: ${alle.map(x => x.cls.toFixed(4)).join(' / ')}]`;
  return med;
}
const maalCls = (side, bredde, opt) => medianAfTre(() => engang(() => maalClsEn(side, bredde, opt)), GRAENSE);
async function maalClsEn(side, bredde, { tema = 'lys', forsinkelse = 0, forhandler = false } = {}){
  const bak = lavKontoBackend({ forhandler });
  const ctx = await browser.newContext({ viewport: { width: bredde, height: HOEJDE[bredde] }, colorScheme: tema === 'moerk' ? 'dark' : 'light' });
  await ctx.addInitScript(sb.initScript, { tema: tema === 'moerk' ? 'dark' : 'light' });
  /* Kilderne til hvert skift (til fejlbeskeden): hvilket element rykkede, hvornår, og hvor meget. */
  await ctx.addInitScript(() => {
    window.__skift = [];
    try {
      new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__skift.push(`${Math.round(e.startTime)}ms ${e.value.toFixed(4)} ${e.sources.map(s => (s.node && (s.node.tagName + (s.node.id ? '#' + s.node.id : '') + (typeof s.node.className === 'string' ? '.' + s.node.className.split(' ')[0] : ''))) + ' ' + Math.round(s.previousRect.y) + '->' + Math.round(s.currentRect.y)).join(', ')}`); }).observe({ type: 'layout-shift', buffered: true });
    } catch (e) { /* ingen support */ }
  });
  await bak.installer(ctx, { tema: tema === 'moerk' ? 'dark' : 'light' });
  if (forsinkelse) await ctx.route(/\.supabase\.co/, async r => { await new Promise(x => setTimeout(x, forsinkelse)); await r.fallback(); });
  const page = await ctx.newPage();
  const fejl = [];
  page.on('pageerror', e => fejl.push(e.message));
  try {
    await page.goto(`http://127.0.0.1:${port}/${side}`, { waitUntil: 'load' });
    await page.waitForSelector(/^opret-annonce/.test(side) ? 'body[data-op-klar]' : 'main.db-page:not(.db-venter)', { state: 'attached', timeout: 15000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(500);
    const cls = await page.evaluate(() => window.__smoke.cls);
    const slut = new URL(page.url()).pathname.replace(/^\//, '');
    return { cls, fejl, slut, skift: await page.evaluate(() => (window.__skift || []).join(' | ')), rækker: await page.locator('.db-row[data-listing-id]').count() };
  } finally { await ctx.close(); }
}

const SIDER = [
  ['mine-annoncer.html?tab=oversigt', false], ['mine-annoncer.html?tab=mine', false], ['mine-annoncer.html?tab=favoritter', false],
  ['mine-annoncer.html?tab=agenter', false], ['mine-annoncer.html?tab=konto', false],
  ['dashboard.html?tab=oversigt', true], ['dashboard.html?tab=annoncer', true], ['dashboard.html?tab=krav', true],
];

for (const bredde of [375, 430, 768, 1024, 1440]){
  test(`V6 konto: CLS < ${GRAENSE} indlogget ved ${bredde} px (lys, alle faner på mine-annoncer og dashboard)`, { timeout: 240000 }, async t => {
    if (!kan.ok) return t.skip(kan.grund);
    for (const [side, forhandler] of SIDER){
      const m = await maalCls(side, bredde, { forhandler });
      assert.strictEqual(m.slut, side.split('?')[0], `${side}: endte på ${m.slut}`);
      assert.deepStrictEqual(m.fejl, [], `${side}: sidefejl`);
      assert.ok(m.cls < GRAENSE, `${side} ved ${bredde}: CLS ${m.cls.toFixed(4)}`);
    }
  });
}

test('V6 konto: CLS < 0,02 i mørkt tema og ved 1920 px (mine-annoncer og dashboard, oversigten)', { timeout: 180000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const [bredde, tema] of [[768, 'moerk'], [1440, 'moerk'], [1920, 'lys']]){
    for (const [side, forhandler] of [['mine-annoncer.html', false], ['dashboard.html', true]]){
      const m = await maalCls(side, bredde, { tema, forhandler });
      assert.ok(m.cls < GRAENSE, `${side} ${bredde} ${tema}: CLS ${m.cls.toFixed(4)}`);
    }
  }
});

test('V6 konto: CLS < 0,02 også med LANGSOM backend (hvert kald 700 ms) ved 768 og 375 px', { timeout: 240000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const bredde of [768, 375]){
    for (const [side, forhandler] of [['mine-annoncer.html', false], ['mine-annoncer.html?tab=favoritter', false], ['dashboard.html', true]]){
      const m = await maalCls(side, bredde, { forsinkelse: 700, forhandler });
      assert.ok(m.cls < GRAENSE, `${side} ${bredde} langsom: CLS ${m.cls.toFixed(4)}`);
    }
  }
});

test('V6 konto: tællerstriben sættes ind i SAMME billede som rækkerne (ingen strib-indsættelse efter første tegning)', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const bak = lavKontoBackend({});
  const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  await bak.installer(ctx, { tema: 'light' });
  const page = await ctx.newPage();
  try {
    await page.addInitScript(() => {
      window.__skridt = []; window.__f = 0;
      const tik = () => { window.__f++; requestAnimationFrame(tik); }; requestAnimationFrame(tik);
      new MutationObserver(ms => {
        for (const m of ms) for (const n of m.addedNodes){
          if (n.nodeType !== 1) continue;
          if (n.classList.contains('db-nums')) window.__skridt.push({ k: 'nums', f: window.__f });
          if (n.classList.contains('db-row')) window.__skridt.push({ k: 'raekke', f: window.__f });
        }
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto(`http://127.0.0.1:${port}/mine-annoncer.html?tab=mine`, { waitUntil: 'networkidle' });
    await page.waitForSelector('main.db-page:not(.db-venter)', { state: 'attached' });
    const skridt = await page.evaluate(() => window.__skridt);
    const nums = skridt.filter(s => s.k === 'nums'), raekker = skridt.filter(s => s.k === 'raekke');
    assert.ok(nums.length >= 6 && raekker.length >= 11, JSON.stringify(skridt));
    const forste = Math.min(...raekker.map(r => r.f));
    assert.ok(nums.every(n => n.f === forste), 'striben kom i et senere billede end rækkerne: ' + JSON.stringify(skridt));
  } finally { await ctx.close(); }
});

test('V6 konto: "henter"-tilstanden holder indholdet usynligt, skelettet står, og klassen fjernes når data er tegnet', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const bak = lavKontoBackend({});
  const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  await bak.installer(ctx, { tema: 'light' });
  await ctx.route(/\.supabase\.co/, async r => { await new Promise(x => setTimeout(x, 900)); await r.fallback(); });
  const page = await ctx.newPage();
  try {
    await page.goto(`http://127.0.0.1:${port}/mine-annoncer.html`, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    const tidligt = await page.evaluate(() => {
      const vis = s => getComputedStyle(document.querySelector(s)).visibility;
      return { main: document.querySelector('main.db-page').classList.contains('db-venter'), busy: document.querySelector('main.db-page').getAttribute('aria-busy'),
        stats: vis('#db-stats'), aside: vis('.db-aside'), skelet: vis('.db-skel'), skeletVises: getComputedStyle(document.querySelector('.db-skel')).display };
    });
    assert.deepStrictEqual(tidligt, { main: true, busy: 'true', stats: 'hidden', aside: 'hidden', skelet: 'visible', skeletVises: 'grid' });
    await page.waitForSelector('main.db-page:not(.db-venter)', { state: 'attached', timeout: 15000 });
    const sent = await page.evaluate(() => ({ busy: document.querySelector('main.db-page').getAttribute('aria-busy'), stats: getComputedStyle(document.querySelector('#db-stats')).visibility,
      aside: getComputedStyle(document.querySelector('.db-aside')).visibility, skelet: getComputedStyle(document.querySelector('.db-skel')).display }));
    assert.deepStrictEqual(sent, { busy: null, stats: 'visible', aside: 'visible', skelet: 'none' });
  } finally { await ctx.close(); }
});

test('V6 konto: smoke --login-mock åbner konto-siderne som indlogget uden fund (768, lys)', { timeout: 240000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const r = await sb.koer({ pw: kan.pw, loginMock: true, viewports: [768], temaer: ['lys'], cls: GRAENSE, stille: true });
  assert.strictEqual(r.antalMaalinger, sb.LOGIN_JOBS.length);
  assert.deepStrictEqual(r.fund.map(f => `${f.side}${f.query} ${f.tjek}: ${f.detalje}`), []);
  assert.ok(r.maalinger.some(m => m.side === 'login.html' && m.login === 'ind'), 'login indlogget er med');
  assert.ok(r.maalinger.filter(m => m.side === 'mine-annoncer.html').length >= 5, 'alle faner på mine-annoncer');
});

/* ---------- Statisk: markup, css og js hænger sammen ---------- */

const laes = f => fs.readFileSync(path.join(ROD, f), 'utf8');

test('V6 konto: begge sider har db-venter, skelet og aria-busy; js og css har det de skal bruge', () => {
  for (const f of ['mine-annoncer.html', 'dashboard.html']){
    const h = laes(f);
    assert.match(h, /<main id="main-content" class="db-page db-venter" aria-busy="true">/, f);
    assert.match(h, /<div class="db-skel" aria-hidden="true"><i><\/i><i><\/i><i><\/i><\/div>/, f);
  }
  assert.ok(!/id="dash-tabbar" style="display:none/.test(laes('dashboard.html')), 'dashboardets fanebjælke står i layoutet fra første billede');
  for (const f of ['js/mine-annoncer.js', 'js/dashboard.js']) assert.match(laes(f), /function visSiden\(\)\{[\s\S]*?remove\('db-venter'\)/, f);
  const css = laes('css/p-dashboard.css');
  assert.match(css, /\.db-venter \.db-main, \.db-venter \.db-aside[^{]*\{ visibility: hidden;/);
  assert.match(css, /animation: db-frigiv 0s linear 12s forwards/, 'css-ur der viser siden hvis scriptet fejler');
  assert.match(css, /\.db-page\{ min-height: 100vh; min-height: 100dvh; \}/);
  assert.match(css, /#dash-subtitle\{ min-height: calc\(2 \* 1\.45em\); \}/);
  assert.match(css, /prefers-reduced-motion: reduce\)\{ \.db-skel > i\{ animation: none; \} \}/);
});

/* ---------- opret-annonce og login (opgave 4) ---------- */

const REDIGER = `opret-annonce.html?rediger=${require('../scripts/fixtures/v6-konto-lager').ID(1)}`;

test('V6 opret-annonce: CLS < 0,02 indlogget — ny annonce og rediger, ved 375/768/1440/1920 (lys) og 768/1440 (mørk)', { timeout: 240000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const [bredde, tema] of [[375, 'lys'], [768, 'lys'], [1440, 'lys'], [1920, 'lys'], [768, 'moerk'], [1440, 'moerk']]){
    for (const side of ['opret-annonce.html', REDIGER]){
      const m = await maalCls(side, bredde, { tema });
      assert.strictEqual(m.slut, 'opret-annonce.html', `${side}: endte på ${m.slut}`);
      assert.deepStrictEqual(m.fejl, [], side);
      assert.ok(m.cls < GRAENSE, `${side.slice(0, 40)} ved ${bredde} ${tema}: CLS ${m.cls.toFixed(4)} — ${m.skift}`);
    }
  }
});

test('V6 opret-annonce: forhåndsvisningen i sidekolonnen (>= 1024 px) har sin endelige højde fra første billede', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const bredde of [1024, 1440]){
    const bak = lavKontoBackend({});
    const ctx = await browser.newContext({ viewport: { width: bredde, height: 900 } });
    await bak.installer(ctx, { tema: 'light' });
    const page = await ctx.newPage();
    try {
      await page.goto(`http://127.0.0.1:${port}/opret-annonce.html`, { waitUntil: 'networkidle' });
      await page.waitForSelector('body[data-op-klar]', { timeout: 10000 });
      const h = await page.evaluate(() => ({ kort: document.getElementById('op-live-card').getBoundingClientRect().height, min: parseFloat(getComputedStyle(document.getElementById('op-live-card')).minHeight) }));
      assert.ok(h.min >= h.kort - 0.5, `${bredde}: reserveret ${h.min} px < endelig højde ${h.kort} px (sidekolonnen under kortet vil hoppe)`);
    } finally { await ctx.close(); }
  }
});

test('V6 opret-annonce: ?rediger= sætter hero-overskrift og -undertekst før første await (ingen ombrydning efter hentning)', () => {
  const js = fs.readFileSync(path.join(ROD, 'js/opret-annonce.js'), 'utf8');
  const i = js.indexOf("document.addEventListener('DOMContentLoaded', async () => {");
  assert.ok(i > 0);
  const krop = js.slice(i, i + 200);
  assert.ok(krop.indexOf('saetRedigerHero();') > 0 && krop.indexOf('saetRedigerHero();') < krop.indexOf('await backendReady()'));
  assert.match(js, /lead\.textContent = REDIGER_LEAD \+ \(editingStatus === 'hidden' \? REDIGER_PAUSE : ''\)/);
});

/* Login udlogget: samme genmåling ved rød som maalCls (median af tre). */
async function loginClsEn(side, bredde, tema){
  const bak = lavKontoBackend({ loggetInd: false });
  const ctx = await browser.newContext({ viewport: { width: bredde, height: HOEJDE[bredde] }, colorScheme: tema === 'moerk' ? 'dark' : 'light' });
  await ctx.addInitScript(sb.initScript, { tema: tema === 'moerk' ? 'dark' : 'light' });
  await bak.installer(ctx, { tema: tema === 'moerk' ? 'dark' : 'light' });
  const page = await ctx.newPage();
  try {
    await engang(() => page.goto(`http://127.0.0.1:${port}/${side}`, { waitUntil: 'load' }));
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(500);
    const cls = await page.evaluate(() => window.__smoke.cls);
    return { cls, slut: new URL(page.url()).pathname };
  } finally { await ctx.close(); }
}

test('V6 login: CLS < 0,02 udlogget (også med ?redirect=) ved 375/768/1440 lys og 768 mørk', { timeout: 180000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const [bredde, tema] of [[375, 'lys'], [768, 'lys'], [1440, 'lys'], [768, 'moerk']]){
    for (const side of ['login.html', 'login.html?redirect=opret-annonce.html', 'login.html?redirect=mine-annoncer.html']){
      const m = await medianAfTre(() => loginClsEn(side, bredde, tema), GRAENSE);
      assert.ok(m.slut.endsWith('login.html'), `${side}: udlogget skal blive på login`);
      assert.ok(m.cls < GRAENSE, `${side} ved ${bredde} ${tema}: CLS ${m.cls.toFixed(4)} ${m.skift || ''}`);
    }
  }
});

test('V6 opret-annonce: den indlejrede rediger-hero (#op-rediger-hero) bruger samme tekst som js/opret-annonce.js', () => {
  const html = fs.readFileSync(path.join(ROD, 'opret-annonce.html'), 'utf8');
  const js = fs.readFileSync(path.join(ROD, 'js/opret-annonce.js'), 'utf8');
  const s = /<script id="op-rediger-hero">[\s\S]*?textContent="Rediger annonce";document\.querySelector\("\.op-hero-lead"\)\.textContent="([^"]+)"/.exec(html);
  assert.ok(s, 'script mangler');
  assert.strictEqual(s[1], /const REDIGER_LEAD = '([^']+)'/.exec(js)[1]);
  assert.ok(html.indexOf('id="op-rediger-hero"') > html.indexOf('class="op-hero-lead"'), 'efter lead-elementet, før første maling');
  assert.match(html, /<h1 id="op-h1">Opret annonce<\/h1>/, 'den statiske h1 er uændret (SEO/udlogget)');
});
