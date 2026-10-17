/* w12-kort2: browsertest af kortets foto-overlay (ingen skæring), den fælles kortfod i liste/swipe, 2-linjers kildenavn og
   fejlbanneret på søgesiden (mobil). Mod lokal mock (scripts/smoke-browser.js + smoke-fixtures.js) - intet netvaerk, ingen produktion.
   Springes over uden Playwright/Chromium. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const sb = require(path.join(REPO, 'scripts', 'smoke-browser.js'));

let H = null;
const blok = {};
async function start() {
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) return null;
  const { server, port } = await sb.startServer(REPO);
  const browser = await kan.pw.chromium.launch({ headless: true });
  return { browser, server, port, base: `http://127.0.0.1:${port}` };
}
async function side(vp, tema, url, fn, opt = {}) {
  const c = await H.browser.newContext({ viewport: { width: vp, height: vp >= 1024 ? 900 : 844 }, colorScheme: tema === 'mørk' ? 'dark' : 'light', locale: 'da-DK', serviceWorkers: 'block' });
  await c.addInitScript(sb.initScript, { tema: tema === 'mørk' ? 'dark' : 'light' });
  await sb.installerMock(c, H.port, blok);
  if (opt.visning) await c.addInitScript(v => { try { localStorage.setItem('bb_view_mode', v); } catch (e) { /* ingen lager */ } }, opt.visning);
  if (opt.f503) await c.route('**/rest/v1/**', r => r.fulfill({ status: 503, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{}' }));
  const p = await c.newPage();
  try {
    await p.goto(H.base + '/' + url, { waitUntil: 'networkidle' });
    await p.waitForTimeout(opt.vent || 600);
    return await fn(p);
  } finally { await c.close(); }
}

test.before(async () => { H = await start(); });
test.after(async () => { if (H) { await H.browser.close(); H.server.close(); } });

/* Syntetiske kort (egen m/u foto, forhandler, nyt opslag, under markedspris) tegnes med sidens egen listingCardHTML i søgegitteret. */
const SYN = `(function(){
  const mk = o => Object.assign({ id: 'syn' + Math.random().toString(36).slice(2), brand: 'Honda', model: 'CB 500', type: 'naked', year: 2019, km: 12000, ccm: 471, power: 48,
    price: 60000, city: 'Roskilde', region: 'Sjælland', postnr: 4000, createdAt: new Date().toISOString(), isDealer: true,
    seller: { name: 'Roskilde Motorcykel Center ApS', isDealer: true }, photoUrls: [], status: 'active' }, o);
  const foto = ['https://images.danbase.dk/smoke/1.jpg'];
  return [mk({}), mk({ isDealer: false, createdAt: '2020-01-01' }), mk({ createdAt: '2020-01-01' }), mk({ isDealer: false, createdAt: '2020-01-01', photoUrls: foto }),
    mk({ photoUrls: foto }), mk({ photoUrls: foto, createdAt: '2020-01-01' })];
})()`;

const MAAL_OVERLAY = () => {
  const r = e => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
  const rammer = (a, b) => a.l < b.r - 0.5 && a.r > b.l + 0.5 && a.t < b.b - 0.5 && a.b > b.t + 0.5;
  const tekstRect = e => { const g = document.createRange(); g.selectNodeContents(e); const b = g.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
  const ud = { kort: 0, skaering: [], afkortet: [], udenfor: [] };
  document.querySelectorAll('.card-rich').forEach(kort => {
    const media = kort.querySelector('.card-media'); if (!media || !kort.getClientRects().length) return;
    ud.kort++;
    const m = r(media);
    const synlig = e => e.getClientRects().length > 0;
    const dele = [];
    kort.querySelectorAll('.fav-btn,.card-compare').forEach(b => dele.push({ n: b.className.split(' ')[0], r: r(b), knap: true }));
    const badges = Array.from(kort.querySelectorAll('.badge')).filter(synlig);
    badges.forEach(b => dele.push({ n: 'badge:' + b.textContent.trim(), r: r(b) }));
    const tom = Array.from(kort.querySelectorAll('.foto-tom-titel,.foto-tom-ikon')).filter(synlig);
    tom.forEach(b => dele.push({ n: 'tom:' + (b.textContent.trim() || 'ikon'), r: tekstRect(b), tom: true }));
    for (let i = 0; i < dele.length; i++) for (let j = i + 1; j < dele.length; j++) {
      if (dele[i].tom && dele[j].tom) continue;
      if (rammer(dele[i].r, dele[j].r)) ud.skaering.push(dele[i].n + ' x ' + dele[j].n);
    }
    badges.forEach(b => { if (b.scrollWidth > b.clientWidth + 1) ud.afkortet.push(b.textContent.trim()); });
    dele.filter(d => !d.knap).forEach(d => { if (d.r.l < m.l - 0.5 || d.r.r > m.r + 0.5 || d.r.t < m.t - 0.5 || d.r.b > m.b + 0.5) ud.udenfor.push(d.n); });
  });
  return ud;
};

for (const vp of [320, 360, 390, 768, 1440]) {
  test(`foto-overlay ved ${vp} px: ingen skaering mellem hjerte/sammenlign, maerkater og "Ingen fotos"-tekst (egne, syntetiske, maerke/type)`, async (t) => {
    if (!H) return t.skip('Playwright mangler');
    const sider = ['soegning.html', 'maerke-honda.html', 'type-sport.html', 'index.html'];
    const fund = [];
    for (const url of sider) {
      const r = await side(vp, 'lys', url, async p => {
        const sider1 = await p.evaluate(MAAL_OVERLAY);
        let syn = null;
        if (url === 'soegning.html') {
          await p.evaluate(`(() => { document.getElementById('results-grid').innerHTML = ${SYN}.map((l, i) => listingCardHTML(l, i + 1)).join(''); })()`);
          syn = await p.evaluate(MAAL_OVERLAY);
        }
        return { sider1, syn };
      });
      for (const [navn, m] of [['side', r.sider1], ['syn', r.syn]]) {
        if (!m) continue;
        for (const k of ['skaering', 'afkortet', 'udenfor']) if (m[k].length) fund.push(`${url} ${navn} ${k}: ${[...new Set(m[k])].slice(0, 4).join(' | ')}`);
      }
      if (url === 'soegning.html') assert.ok(r.syn.kort >= 6, 'syntetiske kort tegnet');
    }
    assert.deepStrictEqual(fund, [], fund.join('\n'));
  });
}

for (const vp of [320, 390, 768, 1440]) {
  for (const visning of ['list', 'swipe']) {
    test(`${visning}-visning ved ${vp} px: fælles kortfod (.rk-fod, sted foerst, title + aria-label), ingen overflow`, async (t) => {
      if (!H) return t.skip('Playwright mangler');
      const r = await side(vp, 'lys', 'soegning.html', p => p.evaluate(() => {
        const kort = Array.from(document.querySelectorAll('.listing-row, .swipe-card[data-stack="0"]'));
        const ok = fn => kort.filter(fn).length;
        return {
          n: kort.length,
          fod: ok(k => k.querySelector('.rk-fod')),
          stedForst: ok(k => { const a = k.querySelector('.rk-sted').getBoundingClientRect(), b = k.querySelector('.rk-kilde').getBoundingClientRect(); return a.top < b.top || a.left < b.left; }),
          aria: ok(k => /^Sted: .+/.test(k.querySelector('.rk-sted').getAttribute('aria-label') || '') && /^Kilde: .+/.test(k.querySelector('.rk-kilde').getAttribute('aria-label') || '')),
          title: ok(k => k.querySelector('.rk-sted').title && k.querySelector('.rk-kilde').title),
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          tekst: document.body.innerText,
        };
      }), { visning });
      assert.ok(r.n >= 1, 'kort/raekker tegnet');
      assert.strictEqual(r.fod, r.n, 'alle har .rk-fod');
      assert.strictEqual(r.stedForst, r.n, 'sted foerst');
      assert.strictEqual(r.aria, r.n, 'aria-label Sted/Kilde');
      assert.strictEqual(r.title, r.n, 'title');
      assert.strictEqual(r.overflow, 0, 'ingen vandret overflow');
      assert.ok(!/\b(null|undefined|NaN)\b/.test(r.tekst), 'ingen null/undefined/NaN');
    });
  }
}

test('lange kildenavne i 2-kolonne-gitteret: op til 2 linjer, ens fodhoejde og kortbredde i raekken, sted foerst', async (t) => {
  if (!H) return t.skip('Playwright mangler');
  for (const vp of [320, 390]) {
    const r = await side(vp, 'lys', 'soegning.html', async p => {
      await p.evaluate(`(() => { document.getElementById('results-grid').innerHTML = ${SYN}.map((l, i) => listingCardHTML(l, i + 1)).join(''); })()`);
      return p.evaluate(() => {
        const kort = Array.from(document.querySelectorAll('#results-grid .card-rich'));
        const kilder = kort.map(k => k.querySelector('.rk-kilde > span'));
        const lh = parseFloat(getComputedStyle(kilder[0]).lineHeight) || 16;
        return {
          fod: [...new Set(kort.map(k => Math.round(k.querySelector('.rk-fod').getBoundingClientRect().height)))],
          kort: [...new Set(kort.map(k => Math.round(k.getBoundingClientRect().height)))],
          clamp: getComputedStyle(kilder[0]).webkitLineClamp,
          maxLinjer: Math.max(...kilder.map(s => Math.round(s.getBoundingClientRect().height / lh))),
          klippet: kilder.filter(s => s.scrollHeight > s.clientHeight + 1).length,
          sted: kort.map(k => k.querySelector('.rk-sted > span').textContent),
        };
      });
    });
    assert.strictEqual(r.clamp, '2', `${vp}: line-clamp 2`);
    assert.ok(r.maxLinjer <= 2, `${vp}: hoejst 2 linjer (${r.maxLinjer})`);
    assert.strictEqual(r.fod.length, 1, `${vp}: ens fodhoejde ${JSON.stringify(r.fod)}`);
    assert.strictEqual(r.klippet, 0, `${vp}: "Roskilde Motorcykel Center ApS" staar paa hoejst 2 linjer uden at klippes`);
    assert.ok(r.sted.every(s => s === 'Roskilde'), 'sted staar fuldt');
  }
});

for (const vp of [390, 768]) {
  test(`fejlbanner paa soegning ved ${vp} px (mock 503): dækker ikke hero-overskriften, role=alert, Proev igen + Luk >= 36 px, CLS < 0,05`, async (t) => {
    if (!H) return t.skip('Playwright mangler');
    const r = await side(vp, 'lys', 'soegning.html', p => p.evaluate(() => {
      const b = document.getElementById('data-afbrud');
      const h1 = document.querySelector('h1');
      const rb = b && b.getBoundingClientRect(), rh = h1.getBoundingClientRect();
      const rammer = rb && !(rb.bottom <= rh.top + 0.5 || rb.top >= rh.bottom - 0.5 || rb.right <= rh.left + 0.5 || rb.left >= rh.right - 0.5);
      const input = document.getElementById('filter-q');
      const ri = input.getBoundingClientRect();
      const daekkerSoegefelt = rb && !(rb.bottom <= ri.top + 0.5 || rb.top >= ri.bottom - 0.5);
      return { banner: !!b, role: b && b.getAttribute('role'), rammer, daekkerSoegefelt, h: rb && rb.height,
        knapper: b ? Array.from(b.querySelectorAll('button')).map(x => ({ t: x.textContent.trim(), h: x.getBoundingClientRect().height })) : [],
        cls: (window.__smoke || {}).cls, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    }), { f503: true, vent: 1500 });
    assert.ok(r.banner, 'banner vises');
    assert.strictEqual(r.role, 'alert');
    assert.strictEqual(r.rammer, false, 'banneret skaerer ikke h1');
    assert.strictEqual(r.daekkerSoegefelt, false, 'banneret skaerer ikke soegefeltet');
    assert.ok(r.h <= 56.5, `kompakt (${r.h})`);
    assert.deepStrictEqual(r.knapper.map(k => k.t), ['Prøv igen', 'Luk']);
    for (const k of r.knapper) assert.ok(k.h >= 36, `${k.t} >= 36 px (${k.h})`);
    assert.ok(r.cls < 0.05, `CLS ${r.cls}`);
    assert.strictEqual(r.overflow, 0);
  });
}
