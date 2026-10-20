/* V4 Agent 4 (visuel finish). Kør: node --test scripts/v4-polish.test.js
   Måler i en rigtig browser (Playwright, syntetisk lager via smoke-browser): ingen netværk, ingen produktion.
   Låser de rettelser, der er lette at tabe igen:
   1. maerker.html: topmærkerne står i fire kolonner ved 1440 (8 fliser = 4 + 4, ikke 6 + 2) og to ved 390; A–Z har et logo ELLER et monogram på alle rækker.
   2. Mærkesiden: regionerne er rækker med andel-bjælke (--andel), navnene brydes ikke midt i ordet (1440 og 1920), "Sådan virker"-tekst >= 150 px.
   3. Typesiden: ingen enlig overskrift over en skjult liste; teksten i et foto-løst kort overlapper ikke "Typefoto"-etiketten.
   4. Forsiden: de fire "Sådan virker"-titler står i samme højde ved 1440. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const sb = require('./smoke-browser');

const REPO = path.join(__dirname, '..');
const pw = sb.findPlaywright();

async function medSide(vp, side, tema, fn){
  const { server, port } = await sb.startServer(REPO);
  const browser = await pw.chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: vp, height: 900 }, colorScheme: tema === 'moerk' ? 'dark' : 'light', locale: 'da-DK', serviceWorkers: 'block', reducedMotion: 'reduce' });
    await ctx.addInitScript(({ t }) => { try { localStorage.setItem('bb_theme', t); localStorage.setItem('bb_cookie_consent', JSON.stringify({ level: 'necessary', date: new Date().toISOString() })); } catch (e) {} }, { t: tema === 'moerk' ? 'dark' : 'light' });
    await sb.installerMock(ctx, port, {});
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${port}/${side}.html`, { waitUntil: 'load' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(700);
    return await fn(page);
  } finally { await browser.close(); server.close(); }
}

test('maerker.html: 4 kolonner ved 1440 (2 ved 390); alle A–Z-rækker har logo eller monogram', { skip: !pw && 'Playwright mangler' }, async () => {
  const k1440 = await medSide(1440, 'maerker', 'lys', p => p.evaluate(() => {
    const t = [...document.querySelectorAll('.mk-brandtile')];
    const az = [...document.querySelectorAll('.mk-az-gruppe li')];
    return {
      n: t.length, kol: new Set(t.map(e => Math.round(e.getBoundingClientRect().left))).size,
      azUden: az.filter(li => { const l = li.querySelector('.mk-az-logo .bl'); return !l || l.getBoundingClientRect().width < 8; }).length, az: az.length,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  }));
  assert.ok(k1440.n >= 7, 'mindst 7 topmærker i stikprøven');
  assert.equal(k1440.kol, 4, 'topmærkerne står i fire kolonner ved 1440');
  assert.equal(k1440.azUden, 0, 'A–Z: alle rækker har logo eller monogram i den faste kolonne');
  assert.equal(k1440.overflow, false);
  const k390 = await medSide(390, 'maerker', 'moerk', p => p.evaluate(() => ({
    kol: new Set([...document.querySelectorAll('.mk-brandtile')].map(e => Math.round(e.getBoundingClientRect().left))).size,
    overflow: document.documentElement.scrollWidth > innerWidth,
  })));
  assert.equal(k390.kol, 2, 'topmærkerne står i to kolonner ved 390');
  assert.equal(k390.overflow, false);
});

for (const vp of [1440, 1920]){
  test(`mærkeside ${vp}: regionsrækker med andel, ingen ordbrud, Sådan virker-tekst >= 150 px`, { skip: !pw && 'Playwright mangler' }, async () => {
    const r = await medSide(vp, 'maerke-yamaha', 'moerk', p => p.evaluate(() => {
      const reg = [...document.querySelectorAll('.mk-mini-reg a')];
      const tekst = [...document.querySelectorAll('.mk-saadan .saadan-trin-punkt > div')];
      return {
        n: reg.length,
        andel: reg.filter(a => /%$/.test(a.style.getPropertyValue('--andel'))).length,
        brudt: reg.filter(a => a.querySelector('strong').getBoundingClientRect().height > 26).length,
        bredde: Math.min(...tekst.map(d => d.getBoundingClientRect().width)),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    }));
    assert.ok(r.n >= 2, 'siden har regionsrækker');
    assert.equal(r.andel, r.n, 'alle regionsrækker har en andel');
    assert.equal(r.brudt, 0, 'regionsnavne brydes ikke');
    assert.ok(r.bredde >= 150, `Sådan virker-teksten er ${r.bredde} px bred`);
    assert.equal(r.overflow, false);
  });
}

test('typeside: ingen enlig overskrift, og foto-løst korts tekst overlapper ikke etiketten', { skip: !pw && 'Playwright mangler' }, async () => {
  const r = await medSide(1440, 'type-sport', 'lys', p => p.evaluate(() => {
    const enlige = [...document.querySelectorAll('h2.fa-h2, h3.fa-h2')].filter(h => {
      if (h.hidden || !h.getClientRects().length) return false;
      const n = h.nextElementSibling;
      return n && (n.hidden || !n.getClientRects().length);
    }).length;
    const kort = [...document.querySelectorAll('.card-rich')].filter(c => c.querySelector('.foto-tom') && c.querySelector('.card-media').getBoundingClientRect().height > 0);
    const overlap = kort.filter(c => {
      const m = c.querySelector('.card-media').getBoundingClientRect(), t = c.querySelector('.foto-tom-titel').getBoundingClientRect();
      return t.bottom > m.bottom - 26;
    }).length;
    return { enlige, kort: kort.length, overlap };
  }));
  assert.equal(r.enlige, 0, 'ingen overskrift uden synligt indhold');
  assert.equal(r.overlap, 0, `${r.kort} foto-løse kort: teksten holder afstand til etiketten`);
});

test('forside 1440: de fire Sådan virker-titler står i samme højde', { skip: !pw && 'Playwright mangler' }, async () => {
  const y = await medSide(1440, 'index', 'lys', p => p.evaluate(() => [...document.querySelectorAll('body.home .saadan-trin-punkt strong')].map(s => Math.round(s.getBoundingClientRect().top))));
  assert.equal(y.length, 4);
  assert.ok(Math.max(...y) - Math.min(...y) <= 2, `titelhøjder ${y.join(', ')}`);
});
