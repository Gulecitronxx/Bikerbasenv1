/* V2 søgning + annonce: tomtilstand mod resultater, filterkombinationer, sortering, paginering, favoritter, sammenlign, gemt søgning,
   mobilkort og annonceside (ekstern + egen). Rigtig browser mod LOKAL mock (alle *.supabase.co-kald besvares af context.route;
   ingen produktion). Uden Playwright springes testene over. Dokumentation: docs/review/gauntlet/v2/soegning.md */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const sb = require('../scripts/smoke-browser');
const fx = require('../scripts/smoke-fixtures');
const { lavPng } = require('../scripts/w9-saelger-mock');

let kan, server, port, browser;
const FOTO = lavPng(640, 480, [90, 120, 160]);
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Expose-Headers': 'content-range' };
test.before(async () => {
  kan = await sb.playwrightTilgaengelig();
  if (!kan.ok){ console.log(`# v2-soegning.test: SKIPPER (${kan.grund})`); return; }
  ({ server, port } = await sb.startServer(path.join(__dirname, '..')));
  browser = await kan.pw.chromium.launch();
});
test.after(async () => { if (browser) await browser.close(); if (server) server.close(); });

/* Vagt, der løber i siden hele tiden og noterer brud på: tomtilstand må aldrig stå sammen med synlige resultater. */
const VAGT = `(function(){
  window.__brud = [];
  const synlig = el => { if (!el) return false; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  function tjek(){
    const grid = document.getElementById('results-grid'), tom = document.getElementById('empty-state');
    if (!grid) return;
    const kort = [...grid.querySelectorAll('article')].filter(synlig);
    if (kort.length && synlig(tom)) window.__brud.push('tomtilstand synlig sammen med ' + kort.length + ' kort');
    for (const ft of grid.querySelectorAll('.foto-tom')){
      const k = ft.closest('article'); if (!k) continue;
      const rig = [...k.querySelectorAll('.card-media img, .row-media img')].filter(i => !i.closest('.typefoto') && !i.closest('.foto-tom') && synlig(i));
      if (rig.length) window.__brud.push('"Ingen fotos" i kort med rigtigt foto');
    }
    const rc = document.getElementById('results-count');
    if (kort.length && rc && /kunne ikke hentes/i.test(rc.textContent)) window.__brud.push('fejltekst i resultattal sammen med kort');
    if (kort.length){
      for (const el of document.querySelectorAll('#so-results h3, #so-results p, #so-results span')){
        if (el.children.length === 0 && /^Ingen annoncer/i.test(el.textContent.trim()) && synlig(el)){ window.__brud.push('synlig tekst: ' + el.textContent.trim().slice(0, 50)); break; }
      }
    }
  }
  new MutationObserver(tjek).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'hidden', 'class'] });
  setInterval(tjek, 30);
})();`;

async function aabn(o = {}){
  const ctx = await browser.newContext({ viewport: { width: o.w || 1440, height: o.h || 900 } });
  await ctx.addInitScript(t => { try { localStorage.setItem('bb_theme', t); localStorage.setItem('bb_cookie_consent', JSON.stringify({ level: 'necessary', date: new Date().toISOString() })); } catch (e) { /* lager blokeret */ } }, o.tema || 'light');
  if (!o.udenVagt) await ctx.addInitScript(VAGT);
  const rest = (route, t) => {
    let body, status = 200;
    if (t === 'eksterne_annoncer'){ if (o.fejlEks){ status = 500; body = { message: 'mock' }; } else body = o.eks ? o.eks() : fx.eksterneRaekker(); }
    else if (t === 'listings'){ if (o.fejlEgne){ status = 500; body = { message: 'mock' }; } else body = o.egne ? o.egne() : fx.egneRaekker(); }
    else body = [];
    const n = Array.isArray(body) ? body.length : 0;
    return route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json', 'content-range': `0-${Math.max(0, n - 1)}/${n}` }, body: JSON.stringify(body) });
  };
  await ctx.route('**/*', route => {
    const req = route.request(); let u;
    try { u = new URL(req.url()); } catch (e) { return route.abort(); }
    if (u.hostname === '127.0.0.1') return route.continue();
    if (/supabase\.co$/.test(u.hostname)){
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      if (u.pathname.startsWith('/rest/v1/')){
        const t = u.pathname.slice(9);
        return o.forsink ? new Promise(r => setTimeout(r, o.forsink)).then(() => rest(route, t)) : rest(route, t);
      }
      if (u.pathname.startsWith('/storage/')) return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'image/png' }, body: FOTO });
      return route.fulfill({ status: 401, headers: cors, body: '{}' });
    }
    if (req.resourceType() === 'image') return route.fulfill({ status: 200, headers: { 'content-type': 'image/png' }, body: FOTO });
    return route.abort('blockedbyclient');
  });
  const page = await ctx.newPage();
  const fund = [];
  page.on('pageerror', e => fund.push(e.message));
  return { page, ctx, fund, gaa: (sti, vent = 'networkidle') => page.goto(`http://127.0.0.1:${port}/${sti}`, { waitUntil: vent }), brud: () => page.evaluate(() => window.__brud) };
}
const hvil = (page, ms = 400) => page.waitForTimeout(ms);
/* Venter (højst 15 s) til resultattallet står der og antallet af synlige kort er det forventede (null: det tal, som resultattallet viser for første side, højst 24). Kaster ikke: fejler
   tilstanden alligevel, siger testens egen assert det med de rigtige tal. */
const afventKort = (page, forventet) => page.waitForFunction(f => {
  const rc = document.getElementById('results-count');
  const n = Number((((rc && rc.innerText.match(/^([\d.]+)/)) || [])[1] || '').replace(/\./g, ''));
  if (!Number.isFinite(n) || (rc.innerText.trim() === '')) return false;
  const kort = [...document.querySelectorAll('#results-grid > article')].filter(e => e.getBoundingClientRect().height > 0).length;
  return kort === (f == null ? Math.min(24, n) : f);
}, forventet, { timeout: 15000 }).catch(() => {});
const stat = page => page.evaluate(() => {
  const rc = document.getElementById('results-count').innerText;
  const n = Number(((rc.match(/^([\d.]+)/) || [])[1] || '0').replace(/\./g, ''));
  const kort = [...document.querySelectorAll('#results-grid > article')].filter(e => e.getBoundingClientRect().height > 0).length;
  return { rc, n, kort, tom: getComputedStyle(document.getElementById('empty-state')).display !== 'none' };
});

test('tomtilstand og resultater udelukker hinanden i alle URL-/hentetilstande (inkl. langsom hydrering og delvis fejl)', { timeout: 240000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const sager = [
    ['', {}], ['?q=zzzzqqq', {}], ['?q=honda', {}], ['?page=2', {}], ['?page=99', {}], ['?brands=Ducati', {}], ['?priceMax=1000', {}],
    ['', { fejlEks: true }], ['', { fejlEgne: true }], ['', { eks: () => [], egne: () => [] }], ['', { fejlEks: true, fejlEgne: true }],
    ['', { forsink: 1200 }], ['?q=ducati', { forsink: 1200 }], ['?types=naked', { w: 390, forsink: 1200 }], ['?q=zzzz', { w: 320 }], ['?koerekort=A1', { w: 390 }],
  ];
  for (const [url, o] of sager){
    const s = await aabn(o);
    try {
      await s.gaa('soegning.html' + url, 'commit');
      await hvil(s.page, o.forsink ? 3500 : 1800);
      const b = await s.brud();
      assert.deepStrictEqual(b, [], `soegning.html${url} ${JSON.stringify(o)}: ${b.join(' | ')}`);
      assert.deepStrictEqual(s.fund, [], `sidefejl ved ${url}`);
      const st = await stat(s.page);
      assert.ok(!(st.tom && st.kort), `${url}: tom + ${st.kort} kort`);
    } finally { await s.ctx.close(); }
  }
});

test('skift mellem filtre, tom tilstand, Ryd alle, visninger og sider: aldrig tomtilstand ved siden af kort; tallet svarer til kortene', { timeout: 120000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn();
  try {
    await s.gaa('soegning.html');
    let st = await stat(s.page); assert.strictEqual(st.n, 97); assert.strictEqual(st.kort, 24);
    await s.page.fill('#filter-q', 'zzzzz'); await hvil(s.page, 700);
    st = await stat(s.page); assert.ok(st.tom && st.kort === 0 && st.n === 0, JSON.stringify(st));
    await s.page.click('#empty-clear-btn'); await hvil(s.page);
    st = await stat(s.page); assert.ok(!st.tom && st.n === 97 && st.kort === 24, 'efter Nulstil: ' + JSON.stringify(st));
    await s.page.fill('#filter-q', 'ducati'); await hvil(s.page, 700);
    st = await stat(s.page); assert.ok(!st.tom && st.kort === st.n && st.n > 0, JSON.stringify(st));
    /* V4: svajpe-knappen er skjult fra 960 px (mobil-først); visningerne gitter/liste prøves her, svajpe på telefon i v4-soegning-ui.test.js. */
    for (const v of ['#view-list', '#view-grid']){ await s.page.click(v); await hvil(s.page, 300); }
    assert.equal(await s.page.evaluate(() => getComputedStyle(document.getElementById('view-swipe')).display), 'none');
    await s.page.fill('#filter-q', ''); await hvil(s.page, 700);
    await s.page.click('#pagination >> text=2'); await hvil(s.page);
    st = await stat(s.page); assert.ok(/side 2 af 5/.test(st.rc) && st.kort === 24 && !st.tom, JSON.stringify(st));
    await s.page.goBack(); await hvil(s.page);
    st = await stat(s.page); assert.ok(!/side 2/.test(st.rc) && st.kort === 24 && !st.tom, 'tilbage: ' + JSON.stringify(st));
    assert.deepStrictEqual(await s.brud(), []);
    assert.deepStrictEqual(s.fund, []);
  } finally { await s.ctx.close(); }
});

test('filterkombinationer: tal = kort summeret over alle sider, ingen dubletter; sortering er monoton; uoplyst pris står sidst', { timeout: 240000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const kombi = ['?types=naked,sport', '?brands=Honda,Yamaha&types=naked', '?priceMin=50000&priceMax=80000', '?kmMax=10000&yearMin=2020', '?dealer=1', '?kilde=mcsyd.dk', '?billeder=1&types=naked', '?hkMax=48&koerekort=A2', '?ccmMin=1000', '?sort=price-asc', '?sort=price-desc&types=cruiser', '?sort=km-asc', '?sort=year-desc'];
  const s = await aabn();
  try {
    for (const k of kombi){
      await s.gaa('soegning.html' + k); await hvil(s.page, 300);
      /* V7 QA: vent på TILSTANDEN (tallet er tegnet og kortene svarer til det), ikke på et fast antal millisekunder. Under mange samtidige
         browsere (npm test) var side 2 målt med 8 af 14 kort tegnet. */
      await afventKort(s.page, null);
      const foerste = await stat(s.page);
      const sider = Math.max(1, Math.ceil(foerste.n / 24));
      const ider = [], priser = [], km = [];
      for (let side = 1; side <= sider; side++){
        if (side > 1){ await s.gaa('soegning.html' + k + (k ? '&' : '?') + 'page=' + side); await afventKort(s.page, Math.min(24, foerste.n - (side - 1) * 24)); }
        const d = await s.page.evaluate(() => [...document.querySelectorAll('#results-grid > article')].map(a => ({
          id: (a.querySelector('a.card-link')?.getAttribute('href') || ''),
          pris: ((a.innerText.match(/(\d{1,3}(?:\.\d{3})*) kr\./) || [])[1] || '').replace(/\./g, ''),
          km: ((a.innerText.match(/(\d{1,3}(?:\.\d{3})*) km/) || [])[1] || '').replace(/\./g, '') })));
        d.forEach(x => { ider.push(x.id); priser.push(x.pris === '' ? null : Number(x.pris)); km.push(x.km === '' ? null : Number(x.km)); });
      }
      assert.strictEqual(ider.length, foerste.n, `${k}: ${ider.length} kort over ${sider} sider, tallet siger ${foerste.n}`);
      assert.strictEqual(new Set(ider).size, ider.length, `${k}: dublet på tværs af sider`);
      const monoton = (arr, retn) => {
        const kendt = arr.filter(x => x !== null);
        for (let i = 1; i < kendt.length; i++) if (retn * (kendt[i] - kendt[i - 1]) < 0) return false;
        const f = arr.indexOf(null); return f === -1 || arr.slice(f).every(x => x === null);
      };
      if (/sort=price-asc/.test(k)) assert.ok(monoton(priser, 1), 'pris stigende + uoplyst sidst');
      if (/sort=price-desc/.test(k)) assert.ok(monoton(priser, -1), 'pris faldende + uoplyst sidst');
      if (/sort=km-asc/.test(k)) assert.ok(monoton(km, 1), 'km stigende + uoplyst sidst');
      const b = await s.brud(); assert.deepStrictEqual(b, [], k + ': ' + b.join('|'));
    }
  } finally { await s.ctx.close(); }
});

test('filterchips: åbne intervaller har læsbare tekster (ingen "…" eller "∞"), og ét klik fjerner dem', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn();
  try {
    await s.gaa('soegning.html?yearMin=2020&ccmMin=1000&hkMax=48&kmMax=9000');
    const piller = await s.page.evaluate(() => [...document.querySelectorAll('.active-filter-pill')].map(p => p.innerText.trim()));
    assert.deepStrictEqual(piller, ['Årgang fra 2020', 'Maks. 9.000 km', 'Fra 1000 ccm', 'Maks. 48 hk']);
    await s.gaa('soegning.html?yearMax=1990&ccmMin=500&ccmMax=900');
    const p2 = await s.page.evaluate(() => [...document.querySelectorAll('.active-filter-pill')].map(p => p.innerText.trim()));
    assert.deepStrictEqual(p2, ['Årgang til 1990', '500 – 900 ccm']);
    await s.page.click('[data-pill-clear="0"]'); await hvil(s.page);
    assert.ok(!/yearMax/.test(await s.page.evaluate(() => location.search)));
  } finally { await s.ctx.close(); }
});

test('favoritter, sammenlign og gemt søgning: hjerte huskes, sammenlignlinjen tæller, gemt søgning kan fjernes igen (kun lokal lagring)', { timeout: 120000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn();
  try {
    await s.gaa('soegning.html?types=naked'); await hvil(s.page);
    const hjerte = s.page.locator('#results-grid [data-fav-toggle]').first();
    const id = await hjerte.getAttribute('data-fav-toggle');
    await hjerte.click();
    assert.strictEqual(await hjerte.getAttribute('aria-pressed'), 'true');
    assert.ok((await s.page.evaluate(() => JSON.stringify(Object.entries(localStorage)))).includes(id), 'favorit skrevet til lager');
    await s.page.reload({ waitUntil: 'networkidle' }); await hvil(s.page);
    assert.strictEqual(await s.page.locator(`#results-grid [data-fav-toggle="${id}"]`).first().getAttribute('aria-pressed'), 'true', 'hjerte står tændt efter genindlæsning');
    const sam = s.page.locator('#results-grid [data-compare-toggle]');
    await sam.nth(0).click(); await sam.nth(1).click();
    assert.match(await s.page.locator('.compare-bar').innerText(), /2 valgt/);
    await s.page.click('[data-compare-open]');
    const tabel = await s.page.locator('.compare-modal').innerText();
    assert.ok(!/\b(null|undefined|NaN)\b/.test(tabel), 'ingen null/undefined i sammenligning');
    await s.page.keyboard.press('Escape');
    const knap = s.page.locator('#save-search-btn');
    await knap.click(); await hvil(s.page, 500);
    assert.match(await s.page.locator('#save-search-label').innerText(), /gemt/i);
    await knap.click(); await hvil(s.page, 500);
    assert.match(await s.page.locator('#save-search-label').innerText(), /Gem søgning/);
    assert.deepStrictEqual(s.fund, []);
  } finally { await s.ctx.close(); }
});

test('ekstern annonce: kilde-knap åbner kildens egen adresse i ny fane (rel noopener), forhandlerforbehold, ét foto uden opdigtet tæller', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ udenVagt: true });
  try {
    const eid = fx.eksterneRaekker()[0].id;
    await s.gaa('annonce.html?id=' + eid); await hvil(s.page);
    const cta = s.page.locator('a.an-cta').first();
    assert.match(await cta.getAttribute('href'), /^https:\/\/mcsyd\.dk\//);
    assert.strictEqual(await cta.getAttribute('target'), '_blank');
    assert.match(await cta.getAttribute('rel'), /noopener/);
    const tekst = await s.page.evaluate(() => document.body.innerText);
    assert.match(tekst, /Forhandlerannonce/, 'forhandlerforbehold');
    assert.match(tekst, /flere billeder i deres annonce/i, 'siger at flere billeder ligger hos kilden');
    assert.ok(!/\b(null|undefined|NaN)\b/.test(tekst));
    assert.strictEqual(await s.page.locator('.gallery-thumbs button').count(), 0, 'ingen opdigtede miniaturer');
    assert.ok(!(await s.page.locator('#gallery-counter').count()) || !(await s.page.locator('#gallery-counter').isVisible()), 'ingen billedtæller på ét foto');
  } finally { await s.ctx.close(); }
});

test('typefoto-label står på én linje i kortene ved 320, 360, 390 og 768, og teksten er stadig i DOM', { timeout: 120000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const w of [320, 360, 390, 768]){
    const s = await aabn({ w, udenVagt: true });
    try {
      await s.gaa('soegning.html'); await hvil(s.page, 500);
      const m = await s.page.evaluate(() => [...document.querySelectorAll('.typefoto-label')].slice(0, 8).map(l => {
        const r = l.getBoundingClientRect(), fs = parseFloat(getComputedStyle(l).fontSize), lh = parseFloat(getComputedStyle(l).lineHeight) || fs * 1.2;
        return { h: r.height, lh, w: r.width, kort: l.closest('.card-media, article').getBoundingClientRect().width, tekst: l.textContent };
      }));
      assert.ok(m.length > 0, 'typefoto-kort findes');
      for (const x of m){
        assert.ok(x.h < x.lh + 10, `${w}px: label er ${x.h}px højt (flere linjer?)`);
        assert.ok(x.w <= x.kort, `${w}px: label bredere end kortet`);
        assert.match(x.tekst, /Typefoto, ikke annoncens/, 'fuld tekst i DOM (også når halen er visuelt skjult)');
      }
      assert.strictEqual(await s.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
    } finally { await s.ctx.close(); }
  }
});

test('mobil 320/390: ingen vandret overflow på søgning (gitter, liste, filterskuffe, tom tilstand) og annonce (egen + ekstern)', { timeout: 240000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const w of [320, 390]){
    const s = await aabn({ w, h: 800, udenVagt: true });
    try {
      const of = () => s.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      await s.gaa('soegning.html'); await hvil(s.page, 400);
      assert.strictEqual(await of(), 0, 'gitter ' + w);
      await s.page.click('#open-filters-btn'); await hvil(s.page, 400);
      assert.strictEqual(await of(), 0, 'filterskuffe ' + w);
      const dlg = await s.page.evaluate(() => { const p = document.getElementById('filters-panel').getBoundingClientRect(); return { r: p.right, w: innerWidth }; });
      assert.ok(dlg.r <= dlg.w + 1, 'skuffen stikker ikke ud');
      await s.page.keyboard.press('Escape');
      await s.gaa('soegning.html?brands=Ducati'); await s.page.click('#view-list'); await hvil(s.page, 400);
      assert.strictEqual(await of(), 0, 'liste ' + w);
      await s.gaa('soegning.html?q=zzzz'); await hvil(s.page, 400);
      assert.strictEqual(await of(), 0, 'tom ' + w);
      for (const id of [fx.eksterneRaekker()[0].id, fx.eksterneRaekker()[4].id, fx.egneRaekker()[0].id, fx.egneRaekker()[2].id]){
        await s.gaa('annonce.html?id=' + id); await hvil(s.page, 400);
        assert.strictEqual(await of(), 0, 'annonce ' + id + ' ' + w);
      }
      assert.deepStrictEqual(s.fund, []);
    } finally { await s.ctx.close(); }
  }
});

test('egen annonce: galleri bladrer, lightbox åbner/bladrer/lukker med Esc, og ukendt id giver ærlig fejl uden null', { timeout: 120000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ udenVagt: true });
  try {
    const id = fx.egneRaekker()[0].id;
    await s.gaa('annonce.html?id=' + id); await hvil(s.page, 500);
    const antal = await s.page.locator('.gallery-thumbs button').count();
    assert.ok(antal >= 2, 'miniaturer ved flere fotos');
    const taeller = () => s.page.locator('#gallery-counter').innerText();
    assert.match(await taeller(), /^1 \/ \d+$/);
    await s.page.locator('.gallery-thumbs button').nth(1).click();
    assert.match(await taeller(), /^2 \/ \d+$/);
    await s.page.click('#gallery-expand'); await hvil(s.page, 300);
    assert.ok(await s.page.locator('#an-lightbox').evaluate(d => d.open), 'lightbox åben');
    assert.match(await s.page.locator('.an-lb-taeller').innerText(), /^2 \/ \d+$/);
    await s.page.keyboard.press('ArrowRight');
    assert.match(await s.page.locator('.an-lb-taeller').innerText(), /^3 \/ \d+$/);
    await s.page.keyboard.press('ArrowLeft'); await s.page.keyboard.press('ArrowLeft');
    assert.match(await s.page.locator('.an-lb-taeller').innerText(), /^1 \/ \d+$/);
    await s.page.keyboard.press('Escape'); await hvil(s.page, 200);
    assert.ok(!(await s.page.locator('#an-lightbox').evaluate(d => d.open)), 'Esc lukker');
    await s.gaa('annonce.html?id=00000000-0000-4000-8000-00000000dead'); await hvil(s.page, 500);
    const txt = await s.page.evaluate(() => document.body.innerText);
    assert.ok(!/\b(null|undefined|NaN)\b/.test(txt), 'ingen null i fejltilstand');
    assert.match(txt, /findes ikke|kunne ikke|ikke fundet/i);
    assert.deepStrictEqual(s.fund, []);
  } finally { await s.ctx.close(); }
});

test('iteration 2: listevisning bruger samme ærlige typefoto som gitteret, tomtilstand skjuler sortering/visning, ?page=99 normaliseres', { timeout: 120000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn();
  try {
    await s.gaa('soegning.html?brands=Ducati'); await s.page.click('#view-list'); await hvil(s.page, 500);
    const r = await s.page.evaluate(() => ({
      tf: document.querySelectorAll('#results-grid .row-media .typefoto').length,
      ingen: document.querySelectorAll('#results-grid .row-media .foto-tom').length,
      label: document.querySelector('#results-grid .row-media .typefoto-label')?.textContent }));
    assert.ok(r.tf > 0, 'typefoto i listen');
    assert.strictEqual(r.ingen, 0, 'ingen "Ingen fotos"-felt i listen, når typen har et typefoto');
    assert.match(r.label, /Typefoto/);
    await s.page.click('#view-grid');
    assert.ok(await s.page.locator('.sort-felt').isVisible() && await s.page.locator('.view-toggle').isVisible());
    await s.page.fill('#filter-q', 'zzzzz'); await hvil(s.page, 700);
    assert.ok(!(await s.page.locator('.sort-felt').isVisible()) && !(await s.page.locator('.view-toggle').isVisible()), 'ingen sortering/visning uden resultater');
    await s.page.fill('#filter-q', ''); await hvil(s.page, 700);
    assert.ok(await s.page.locator('.sort-felt').isVisible() && await s.page.locator('.view-toggle').isVisible(), 'tilbage med resultater');
    await s.gaa('soegning.html?page=99'); await hvil(s.page);
    assert.strictEqual(await s.page.evaluate(() => location.search), '?page=5');
    assert.deepStrictEqual(await s.brud(), []);
  } finally { await s.ctx.close(); }
});

test('iteration 2 mobil 390: kørekortchip på egen række, nøgletal 2x2, lav kørekortbadge, brødkrumme uden aktuel side', { timeout: 120000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ w: 390, h: 844, udenVagt: true });
  try {
    await s.gaa('soegning.html'); await hvil(s.page, 500);
    const rk = await s.page.evaluate(() => [...document.querySelectorAll('#results-grid > article')].slice(0, 6).map(a => {
      const kk = a.querySelector('.rk-kk'), ccm = [...a.querySelectorAll(".rk-chip")].find(c => /^\s*[\d.]+ ccm\s*$/.test(c.textContent));
      return kk && ccm ? ccm.getBoundingClientRect().top - kk.getBoundingClientRect().top : null; }).filter(x => x !== null));
    assert.ok(rk.length > 0 && rk.every(d => d > 10), 'ccm står under kørekortchippen: ' + rk);
    await s.gaa('annonce.html?id=' + fx.egneRaekker()[0].id); await hvil(s.page, 500);
    const m = await s.page.evaluate(() => ({
      raekker: new Set([...document.querySelectorAll('.an-stats li')].map(l => Math.round(l.getBoundingClientRect().top))).size,
      antal: document.querySelectorAll('.an-stats li').length,
      badge: document.querySelector('.an-kk-badge').getBoundingClientRect().height,
      bc: document.querySelector('#bc-current').getBoundingClientRect().width }));
    assert.strictEqual(m.raekker, Math.ceil(m.antal / 2), `nøgletal i 2 kolonner (${m.antal} stk, ${m.raekker} rækker)`);
    assert.ok(m.badge < 90, 'kørekortbadge er lav: ' + m.badge);
    assert.ok(m.bc <= 1, 'aktuel side skjult visuelt i brødkrummen');
  } finally { await s.ctx.close(); }
});
