/* W12-forside2: åbne rester fra Critic w11 på forsiden.
   (1) Cookie-banneret er et kompakt bundark (<= 30 % af viewporten), samme to ligeværdige knapper, samme samtykkelogik.
   (2) Kørekortkolonnen nævner kW/kg-grænserne (A1 0,1 / A2 0,2) med kilde i title.
   (3) Mørkt tema: heroens underkant ses ikke som en kant bag søgekortet.
   (4) Forsidens fotos: ingen brudte lokale billeder, alt-attribut, fast billedformat; fejlet kildefoto giver ærligt felt.
   (6) Søgesidens sidebar-tal vises som '?' under lagerfejl (data-lager-fejl), ikke som 0 eller et snapshot-tal.
   Rigtig headless Chromium mod repoets filer på bb.test; al trafik udefra besvares af page.route. Playwright mangler -> springes over. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let smoke = null; let pw = null;
try { smoke = require('../scripts/smoke-browser'); pw = smoke.findPlaywright(); } catch (e) { /* springes over */ }

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

/* ---------- Statiske tests (kræver ikke browser) ---------- */

test('W12 statisk: cookie-markup er et dialog med navn og beskrivelse, og knapperne er ligeværdige', () => {
  const g = read('scripts/inline-cookie.js');
  assert.match(g, /<dialog[^>]*id="cookie-banner"[^>]*aria-labelledby="cookie-modal-titel"[^>]*aria-describedby="cookie-modal-tekst"/);
  assert.match(g, /showModal\(\)/);
  const knapper = [...g.matchAll(/<button[^>]*id="cookie-(accept-all|necessary-only)"[^>]*>/g)].map(m => m[0]);
  assert.equal(knapper.length, 2);
  knapper.forEach(k => assert.match(k, /class="btn btn-lg cookie-modal-knap"/));
  assert.match(g, /Kun nødvendige/);
  assert.match(g, /Accepter alle/);
  assert.match(g, /href="privatlivspolitik\.html">Læs mere</);
});

test('W12 statisk: samtykkelogikken er uændret (Escape lukker ikke, to svar, statistik kun ved "all")', () => {
  const c = read('js/components.js');
  assert.match(c, /dialog\.addEventListener\('cancel', e => e\.preventDefault\(\)\)/);
  assert.match(c, /svar\('all'\)/);
  assert.match(c, /svar\('necessary'\)/);
  assert.match(c, /if \(level === 'all' && typeof window\.bbStartAnalytics === 'function'\) window\.bbStartAnalytics\(\)/);
});

test('W12 statisk: forsiden nævner kW/kg-grænserne (A1 0,1, A2 0,2) med kilde i title; A har ingen effektgrænse', () => {
  const h = read('index.html');
  const a1 = h.match(/<strong>A1<\/strong>[^]*?<\/span><span class="tal-n"/)[0];
  const a2 = h.match(/<strong>A2<\/strong>[^]*?<\/span><span class="tal-n"/)[0];
  assert.match(a1, /op til 11 kW \(15 hk\) · højst 0,1 kW\/kg/);
  assert.match(a2, /op til 35 kW \(47 hk\) · højst 0,2 kW\/kg/);
  assert.match(a1, /title="Kilde: Færdselsstyrelsen \(fstyr\.dk\)/);
  assert.match(a2, /title="Kilde: Færdselsstyrelsen \(fstyr\.dk\)/);
  assert.match(h, /Fra 24 år<\/b> \(22 efter 2 år på A2\) · ingen effektgrænse/);
});

test('W12 statisk: alle sider med cookie-blok bruger det nye kompakte markup', () => {
  const g = read('scripts/inline-cookie.js');
  const blok = g.slice(g.indexOf("const blok = `"));
  const tekst = blok.match(/<p class="cookie-modal-note"[^]*?<\/p>/)[0];
  for (const f of fs.readdirSync(ROOT).filter(n => n.endsWith('.html'))){
    const s = read(f);
    if (!/js\/components\.js/.test(s)) continue;
    assert.ok(s.includes('id="cookie-modal-tekst"'), f + ' mangler det kompakte cookie-markup (kør scripts/inline-cookie.js)');
    assert.ok(s.includes(f === '404.html' ? tekst.replace('href="privatlivspolitik.html"', 'href="/privatlivspolitik.html"') : tekst), f + ' har afvigende cookie-tekst');
  }
});

/* ---------- Browsertests ---------- */

async function start(t){
  if (!pw){ t.skip('Playwright mangler'); return null; }
  const { server, port } = await smoke.startServer(ROOT);
  let browser;
  try { browser = await pw.chromium.launch({ headless: true, args: ['--host-resolver-rules=MAP bb.test 127.0.0.1'] }); }
  catch (e) { server.close(); t.skip('Chromium kan ikke starte: ' + e.message); return null; }
  return { server, port, browser };
}

async function aabn(h, { side = 'index.html', vw = 390, vh = 844, tema = 'light', fejl = false, samtykke = true, afvisKildefoto = false }){
  const ctx = await h.browser.newContext({ viewport: { width: vw, height: vh }, colorScheme: tema });
  await ctx.addInitScript(({ tema, samtykke }) => {
    try {
      localStorage.setItem('bb_theme', tema);
      if (samtykke) localStorage.setItem('bb_cookie_consent', JSON.stringify({ level: 'necessary', date: new Date().toISOString() }));
    } catch (e) { /* ingen storage */ }
    window.__cls = 0;
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch (e) { /* ingen support */ }
  }, { tema, samtykke });
  await ctx.route('**/*', route => {
    const req = route.request(); let u;
    try { u = new URL(req.url()); } catch (e) { return route.abort('blockedbyclient'); }
    if (u.hostname === 'bb.test') return route.continue();
    if (/(^|\.)supabase\.co$/.test(u.hostname)){
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      if (u.pathname.startsWith('/rest/v1/')){
        if (fejl) return route.fulfill({ status: 503, headers: { ...CORS, 'Content-Type': 'application/json' }, body: '{"message":"x"}' });
        const { restSvar } = require('../scripts/smoke-fixtures');
        const { body } = restSvar(u.pathname.slice('/rest/v1/'.length) + u.search, u.searchParams);
        return route.fulfill({ status: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
      return route.fulfill({ status: 401, headers: { ...CORS, 'Content-Type': 'application/json' }, body: '{}' });
    }
    if (req.resourceType() === 'image'){
      if (afvisKildefoto) return route.abort('failed');
      return route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
    }
    return route.abort('blockedbyclient');
  });
  const page = await ctx.newPage();
  await page.goto(`http://bb.test:${h.port}/${side}`, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(1300);
  return { ctx, page };
}

const LUK = h => { h.server.close(); return h.browser.close().catch(() => {}); };

test('W12 cookie: bundark <= 30 % af viewporten, to ens knapper >= 40 px, intet vandret overflow, CLS 0 (320x568 til 1440x900, lys+mørk)', async t => {
  const h = await start(t); if (!h) return;
  const fund = [];
  try {
    for (const [vw, vh] of [[320, 568], [390, 844], [768, 1024], [1440, 900]]) for (const tema of ['light', 'dark']){
      const { ctx, page } = await aabn(h, { vw, vh, tema, samtykke: false });
      const m = await page.evaluate(() => {
        const d = document.getElementById('cookie-banner'); const r = d.getBoundingClientRect();
        const b = [...d.querySelectorAll('button')].map(x => { const q = x.getBoundingClientRect(); return { w: Math.round(q.width), h: q.height }; });
        const a = d.querySelector('a').getBoundingClientRect();
        return { open: d.open, modal: d.matches(':modal'), pct: r.height / innerHeight, bottom: Math.round(innerHeight - r.bottom), top: r.top, left: r.left, right: innerWidth - r.right,
          b, a: a.height, fokus: document.activeElement && document.activeElement.id, cls: window.__cls,
          ov: document.documentElement.scrollWidth - document.documentElement.clientWidth, pos: getComputedStyle(d).position, titel: document.getElementById('cookie-modal-titel').textContent };
      });
      const id = `${vw}x${vh} ${tema}`;
      if (!m.open || !m.modal) fund.push(`${id}: ikke åben som modal`);
      if (m.pct > 0.3) fund.push(`${id}: højde ${(m.pct * 100).toFixed(1)} % af viewporten`);
      if (m.top < vh * 0.65) fund.push(`${id}: toppen ${m.top} dækker for meget`);
      if (m.b.length !== 2 || m.b[0].w !== m.b[1].w || m.b.some(x => x.h < 40)) fund.push(`${id}: knapper ${JSON.stringify(m.b)}`);
      if (m.a < 40) fund.push(`${id}: Læs mere-link ${m.a} px`);
      if (m.fokus !== 'cookie-necessary-only') fund.push(`${id}: startfokus ${m.fokus}`);
      if (m.ov !== 0) fund.push(`${id}: overflow ${m.ov}`);
      if (m.cls >= 0.05 || m.pos !== 'fixed') fund.push(`${id}: CLS ${m.cls}, position ${m.pos}`);
      if (m.left < -0.5 || m.right < -0.5) fund.push(`${id}: ark uden for skærmen`);
      await ctx.close();
    }
  } finally { await LUK(h); }
  assert.deepStrictEqual(fund, [], fund.join('\n'));
});

test('W12 cookie: tastatur — Tab/Shift+Tab bliver i arket, begge knapper gemmer samtykke, intet dækket bagefter (320x568)', async t => {
  const h = await start(t); if (!h) return;
  const fund = [];
  try {
    for (const valg of ['cookie-necessary-only', 'cookie-accept-all']){
      const { ctx, page } = await aabn(h, { vw: 320, vh: 568, samtykke: false });
      // Tab/Shift+Tab: fokus kan gå til browserens adressefelt (BODY) men aldrig til siden bag det modale ark.
      for (let i = 0; i < 8; i++){
        await page.keyboard.press(i % 2 ? 'Tab' : 'Shift+Tab');
        const bagved = await page.evaluate(() => { const a = document.activeElement; return a && a !== document.body && !a.closest('#cookie-banner'); });
        if (bagved) fund.push(valg + ': fokus nåede siden bag arket');
      }
      await page.click('#' + valg);
      await page.waitForTimeout(200);
      const efter = await page.evaluate(() => {
        const d = document.getElementById('cookie-banner');
        const k = JSON.parse(localStorage.getItem('bb_cookie_consent') || 'null');
        const el = document.getElementById('hs-query'); el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        const midt = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        const sk = document.querySelector('.sk-knap'); sk.scrollIntoView({ block: 'center' });
        const q = sk.getBoundingClientRect();
        const knap = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
        return { vaek: !d || !d.isConnected, niveau: k && k.level, felt: midt === el, knap: !!knap && (knap === sk || sk.contains(knap)) };
      });
      if (!efter.vaek) fund.push(`${valg}: arket står stadig`);
      if (efter.niveau !== (valg === 'cookie-accept-all' ? 'all' : 'necessary')) fund.push(`${valg}: samtykkeniveau ${efter.niveau}`);
      if (!efter.felt || !efter.knap) fund.push(`${valg}: søgekortet dækket efter valg (felt ${efter.felt}, knap ${efter.knap})`);
      await ctx.close();
    }
  } finally { await LUK(h); }
  assert.deepStrictEqual(fund, [], fund.join('\n'));
});

test('W12 cookie: Escape gemmer aldrig et samtykke og starter ikke statistik (Chromium lader en anden Escape lukke dialogen; det er privatlivssikkert)', async t => {
  const h = await start(t); if (!h) return;
  try {
    const { ctx, page } = await aabn(h, { vw: 390, vh: 844, samtykke: false });
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    const r = await page.evaluate(() => ({ gemt: localStorage.getItem('bb_cookie_consent'), ga: !!window.__ga4Startet, gtm: !!document.querySelector('script[src*="googletagmanager"]') }));
    assert.equal(r.gemt, null, 'Escape må ikke gemme et valg');
    assert.equal(r.ga || r.gtm, false, 'Escape må ikke starte statistik');
    await ctx.close();
  } finally { await LUK(h); }
});

test('W12 mørkt tema 1440: heroens underkant er en blød overgang, ikke en kant bag søgekortet', async t => {
  const h = await start(t); if (!h) return;
  try {
    for (const tema of ['dark', 'light']){
      const { ctx, page } = await aabn(h, { vw: 1440, vh: 900, tema });
      const buf = (await page.screenshot()).toString('base64');
      const r = await page.evaluate(async b64 => {
        const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        const x = c.getContext('2d'); x.drawImage(im, 0, 0);
        const hb = Math.round(document.querySelector('.hero').getBoundingClientRect().bottom);
        const px = (X, Y) => Array.from(x.getImageData(X, Y, 1, 1).data.slice(0, 3));
        // største spring mellem to nabopixel (lodret) i kolonnerne uden for kortet, ±12 px omkring heroens kant
        let maks = 0;
        for (const X of [6, 14, 1426, 1434]) for (let Y = hb - 12; Y < hb + 12; Y++){
          const a = px(X, Y), b = px(X, Y + 1); maks = Math.max(maks, Math.max(...a.map((v, i) => Math.abs(v - b[i]))));
        }
        const kort = getComputedStyle(document.querySelector('.search-panel'));
        return { maks, hb, kantAlfa: kort.borderTopColor };
      }, buf);
      if (tema === 'dark') assert.ok(r.maks <= 6, `mørk: lodret spring ${r.maks} ved heroens kant (y=${r.hb})`);
      assert.ok(!/rgba\(.*, 0\.\d+\)/.test(r.kantAlfa) || tema === 'light', 'mørk: kortets kant er gennemsigtig: ' + r.kantAlfa);
      await ctx.close();
    }
  } finally { await LUK(h); }
});

test('W12 søgning: sidebarens tal er "?" under lagerfejl (503), ingen blindgyder, CLS < 0,05; tal uændrede uden fejl', async t => {
  const h = await start(t); if (!h) return;
  const fund = [];
  try {
    for (const vw of [1440, 390]){
      const e = await aabn(h, { side: 'soegning.html', vw, vh: vw > 1000 ? 1100 : 844, fejl: true });
      // På mobil bygges filterpanelet først, når skuffen åbnes.
      if (vw < 960){ await e.page.click('#open-filters-btn'); await e.page.waitForTimeout(500); }
      const r = await e.page.evaluate(() => {
        if (document.querySelector('#filter-toggle, [data-filter-open], .filter-open-btn')) { /* mobilknap findes, arket tæller stadig i DOM */ }
        const els = [...document.querySelectorAll('.facet-n')].filter(x => getComputedStyle(x.closest('.chip, .checkbox-row') || x).display !== 'none' && getComputedStyle(x).display !== 'none');
        const ukendt = els.filter(x => getComputedStyle(x).color === 'rgba(0, 0, 0, 0)' && /\?/.test(getComputedStyle(x, '::after').content));
        return { n: els.length, ukendt: ukendt.length, attr: document.documentElement.hasAttribute('data-lager-fejl'),
          tom: document.querySelectorAll('.facet-empty').length, spaerret: document.querySelectorAll('.chip.facet-empty, .checkbox-row.facet-empty, #filter-types .chip:disabled').length, cls: window.__cls };
      });
      if (!r.attr) fund.push(`${vw}: data-lager-fejl mangler`);
      if (!r.n) fund.push(`${vw}: ingen facet-tal fundet`);
      if (r.ukendt !== r.n) fund.push(`${vw}: ${r.n - r.ukendt} af ${r.n} tal ikke dæmpet til '?'`);
      if (r.tom || r.spaerret) fund.push(`${vw}: blindgyde-markering under fejl (${r.tom}/${r.spaerret})`);
      if (r.cls >= 0.05) fund.push(`${vw}: CLS ${r.cls.toFixed(3)}`);
      await e.ctx.close();
    }
    const ok = await aabn(h, { side: 'soegning.html', vw: 1440, vh: 1100 });
    const r2 = await ok.page.evaluate(() => {
      const els = [...document.querySelectorAll('.facet-n')].filter(x => x.textContent.trim() !== '');
      return { attr: document.documentElement.hasAttribute('data-lager-fejl'), n: els.length, synlige: els.filter(x => getComputedStyle(x).color !== 'rgba(0, 0, 0, 0)').length };
    });
    if (r2.attr) fund.push('uden fejl: data-lager-fejl sat');
    if (!r2.n || r2.synlige !== r2.n) fund.push(`uden fejl: tal skjult (${r2.synlige}/${r2.n})`);
    await ok.ctx.close();
  } finally { await LUK(h); }
  assert.deepStrictEqual(fund, [], fund.join('\n'));
});

test('W12 forside: lokale fotos indlæses, har alt, fast format; fejlet kildefoto giver ærligt felt uden formatskift', async t => {
  const h = await start(t); if (!h) return;
  const fund = [];
  try {
    for (const vw of [390, 1440]){
      const { ctx, page } = await aabn(h, { vw, vh: 900 });
      const r = await page.evaluate(() => {
        const lok = [...document.querySelectorAll('img')].filter(i => /^img\//.test(i.getAttribute('src') || ''));
        const alle = [...document.querySelectorAll('img')];
        const fliser = [...document.querySelectorAll('.tile')].filter(x => x.offsetParent).map(x => { const q = x.getBoundingClientRect(); return `${Math.round(q.width)}x${Math.round(q.height)}`; });
        const medier = [...document.querySelectorAll('.card-media')].map(m => { const q = m.getBoundingClientRect(); return +(q.width / q.height).toFixed(2); });
        return { lok: lok.length, brudt: lok.filter(i => i.complete && i.naturalWidth === 0 && !(i.loading === 'lazy' && !i.currentSrc)).map(i => i.getAttribute('src')),
          utenAlt: alle.filter(i => i.getAttribute('alt') === null).length, utenMaal: lok.filter(i => !i.getAttribute('width') || !i.getAttribute('height')).length,
          fliser: [...new Set(fliser)], medier: [...new Set(medier)] };
      });
      if (r.lok < 9) fund.push(`${vw}: kun ${r.lok} lokale billeder (forventet hero + 8 typefliser)`);
      if (r.brudt.length) fund.push(`${vw}: brudte billeder ${r.brudt}`);
      if (r.utenAlt) fund.push(`${vw}: ${r.utenAlt} img uden alt-attribut`);
      if (r.utenMaal) fund.push(`${vw}: ${r.utenMaal} lokale img uden width/height`);
      if (r.fliser.length !== 1) fund.push(`${vw}: flisestørrelser ${r.fliser}`);
      if (r.medier.length > 1) fund.push(`${vw}: kortfoto-format varierer ${r.medier}`);
      await ctx.close();
    }
    // Kilden svarer ikke på fotoet: browserens knækkede ikon må ikke stå — samme format, ærligt felt.
    const m = await aabn(h, { vw: 1440, vh: 900, afvisKildefoto: true });
    await m.page.waitForTimeout(800);
    const r = await m.page.evaluate(() => ({
      knaekket: [...document.querySelectorAll('img.card-photo')].filter(i => i.complete && i.naturalWidth === 0).length,
      felter: document.querySelectorAll('.card-media .foto-fejl, .card-media .foto-tom').length,
      medier: [...new Set([...document.querySelectorAll('.card-media')].map(x => { const q = x.getBoundingClientRect(); return +(q.width / q.height).toFixed(2); }))] }));
    if (r.knaekket) fund.push(`kildefoto afvist: ${r.knaekket} knækkede billeder står tilbage`);
    if (r.medier.length > 1) fund.push(`kildefoto afvist: format varierer ${r.medier}`);
    await m.ctx.close();
  } finally { await LUK(h); }
  assert.deepStrictEqual(fund, [], fund.join('\n'));
});
