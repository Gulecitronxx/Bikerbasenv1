/* W14 (Visual Fidelity Gauntlet, agent 1): forsidens komposition målt i rigtig browser mod lokal mock (smoke-browser).
   Acceptkriterierne står i docs/review/gauntlet/visual/agent1-forside.md. Skippes uden Chromium. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const sb = require('../scripts/smoke-browser');

const REPO = path.join(__dirname, '..');
let kan;
test.before(async () => { kan = await sb.playwrightTilgaengelig(); });

async function aabn(vp, tema, fn){
  const { server, port } = await sb.startServer(REPO);
  const browser = await kan.pw.chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: vp, height: vp < 500 ? 844 : vp < 900 ? 1024 : 900 } });
    await ctx.addInitScript(sb.initScript, { tema });
    await sb.installerMock(ctx, port, {});
    const p = await ctx.newPage();
    await p.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    return await fn(p);
  } finally { await browser.close().catch(() => {}); server.close(); }
}

const maalDesktop = () => {
  const abs = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { top: b.top + scrollY, bottom: b.bottom + scrollY, left: b.left, right: b.right, h: b.height, w: b.width }; };
  const alle = s => [...document.querySelectorAll(s)].map(e => { const b = e.getBoundingClientRect(); return { top: b.top + scrollY, bottom: b.bottom + scrollY, left: b.left, right: b.right, h: b.height, w: b.width }; });
  return {
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    header: abs('.site-header'), hero: abs('.hero'), kort: abs('.search-panel'), trust: abs('.trust-row'),
    udvalgH: abs('.udvalg .sek-hoved'), kortRaekke: alle('#udvalg-kort > .card'), saelg: abs('.saelg-panel'),
    tiles: alle('#category-tiles .tile'), saadan: abs('.saadan-strip'), trin: alle('.saadan-trin-punkt'), guide: abs('.guide-boks'),
    kol: alle('.tre-kol > .kol'),
  };
};

test('W14 desktop 1440: hele forsidens øverste del er kompakt som referencen (hero, søgekort, kort, fliser, Sådan virker, tre kolonner)', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const m = await aabn(1440, 'light', p => p.evaluate(maalDesktop));
  assert.equal(m.overflow, 0);
  assert.ok(m.header.h <= 56, `header ${m.header.h}`);
  assert.ok(m.hero.bottom <= 320, `hero slutter ${m.hero.bottom}`);
  assert.ok(m.kort.h <= 120, `søgekort ${m.kort.h}`);
  assert.ok(m.kort.top < m.hero.bottom && m.kort.bottom > m.hero.bottom, 'søgekortet hænger ind over heroens underkant');
  assert.equal(m.kortRaekke.length, 5, 'fem udvalgte kort på én række');
  assert.ok(new Set(m.kortRaekke.map(c => Math.round(c.top))).size === 1, 'kortene står på samme linje');
  assert.ok(Math.max(...m.kortRaekke.map(c => c.h)) <= 270, `kort ${Math.max(...m.kortRaekke.map(c => c.h))}`);
  assert.ok(m.saelg.left >= m.kortRaekke[4].right, 'sælg-panelet står til højre for kortene');
  assert.ok(m.saelg.top <= m.udvalgH.top + 4, 'sælg-panelet starter ud for overskriften');
  assert.equal(m.tiles.length >= 7, true);
  assert.ok(m.tiles.slice(0, 7).every(t => Math.abs(t.top - m.tiles[0].top) < 2 && t.h <= 80), 'syv fliser på én række, højst 80 px');
  assert.ok(m.trin.length === 4 && m.trin.every(t => Math.abs(t.top - m.trin[0].top) < 6), 'fire trin på én række');
  assert.ok(m.saadan.h <= 140, `Sådan virker ${m.saadan.h}`);
  assert.ok(m.guide.left >= m.trin[3].right, 'guide-boksen står til højre for trinene');
  assert.equal(m.kol.length, 3);
  assert.ok(m.kol.every(k => Math.abs(k.top - m.kol[0].top) < 2 && Math.abs(k.h - m.kol[0].h) < 2), 'tre lige høje kolonner');
  assert.ok(m.kol[0].top <= 1250, `tre kolonner begynder ved ${m.kol[0].top}`);
});

test('W14: 0 vandret overflow i lys og mørk ved 320/390/768/1024/1440, og Sådan virker er kompakte rækker på mobil', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const tema of ['light', 'dark']) for (const vp of [320, 390, 768, 1024, 1440]) {
    const m = await aabn(vp, tema, p => p.evaluate(maalDesktop));
    assert.equal(m.overflow, 0, `${vp} ${tema}`);
    if (vp === 390) assert.ok(m.trin.every(t => t.h <= 96), `trin på mobil ${m.trin.map(t => t.h)}`);
  }
});

test('W14: tap-mål på forsiden er mindst 40 px høje (desktop og mobil)', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const vp of [1440, 390]) {
    const smaa = await aabn(vp, 'light', p => p.evaluate(() => [...document.querySelectorAll(
      '.header-cta, .section-link, .kol-link, .hero-chip, .kk-seg label, .sk-knap, .saelg-knap, .guide-boks a, .tile, .maerke-flise, .tal-grid a, .typer-pil, .hvorfor-mere summary')]
      .filter(e => e.offsetParent && e.getBoundingClientRect().height > 0)
      .map(e => ({ k: e.className || e.tagName, h: Math.round(e.getBoundingClientRect().height) }))
      .filter(x => x.h < 40)));
    assert.deepEqual(smaa, [], `${vp}: for lave tap-mål`);
  }
});
