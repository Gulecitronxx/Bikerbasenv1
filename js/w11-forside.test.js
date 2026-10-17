/* W14: taerskler for hero, CTA, felter, trinikon, fliser og sektionsluft er bevidst saenket (Visual Fidelity Gauntlet:
   forsiden skal vaere lige saa kompakt som Forside.png); accentstregen over overskrifterne er fjernet. Se agent1-forside.md.
   W11: forsiden modigere (billede 1). Målt i rigtig browser mod lokal mock (smoke-browser). Skippes uden Chromium.
   Dækker acceptkriterierne H1-H8 i docs/review/gauntlet/builder-w11-forside.md. Statiske tests kræver ikke browser. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const sb = require('../scripts/smoke-browser');

const REPO = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');

test('W11 statisk: p-forside.css er linket efter styles.css, og LCP-billedet er preloadet med høj prioritet', () => {
  assert.ok(html.indexOf('css/p-forside.css') > html.indexOf('css/styles.css'));
  assert.match(html, /<link rel="preload" as="image"[^>]*fetchpriority="high"/);
  assert.match(html, /<img class="hero-photo"[^>]*fetchpriority="high"/);
});

test('W11 statisk: kørekortreglerne på forsiden er de verificerede (A1 18 år/11 kW, A2 20 år/35 kW/47 hk, A 24/22 år)', () => {
  assert.match(html, /<strong>A1<\/strong>[^]*?Fra 18 år<\/b> · op til 11 kW \(15 hk\)/);
  assert.match(html, /<strong>A2<\/strong>[^]*?Fra 20 år<\/b> · op til 35 kW \(47 hk\)/);
  assert.match(html, /<strong>A<\/strong>[^]*?Fra 24 år<\/b> \(22 efter 2 år på A2\)/);
});

test('W11 statisk: ingen opdigtede påstande på forsiden', () => {
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>')).replace(/<!--[^]*?-->/g, '');
  for (const forbudt of [/12\.842/, /Danmarks motorcykelmarked/i, /anmeldelse/i, /autoriser/i, /svartid/i, /tusindvis/i, /fællesskab/i])
    assert.ok(!forbudt.test(main), String(forbudt));
  assert.equal((main.match(/<ul class="trust-row">[^]*?<\/ul>/)[0].match(/<li>/g) || []).length, 4);
});

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

const maal = () => {
  const r = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
  const cs = (s, k) => { const e = document.querySelector(s); return e ? getComputedStyle(e)[k] : null; };
  const hero = r('.hero'), kort = r('.search-panel'), cta = r('.sk-knap');
  const nr = [...document.querySelectorAll('.saadan-nr')].map(e => e.getBoundingClientRect());
  const ik = [...document.querySelectorAll('.saadan-ico')].map(e => e.getBoundingClientRect());
  const skaerer = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const smaa = [...document.querySelectorAll('.sk-knap, .kk-seg label, .hero-chip, .section-link, .hvorfor-mere summary, .tile, .tal-grid a')]
    .filter(e => e.offsetParent).map(e => e.getBoundingClientRect()).filter(b => b.height > 0 && b.height < 40 && b.width < 40).length;
  return {
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    heroH: hero.height, h1: parseFloat(cs('.hero h1', 'fontSize')),
    overlap: hero.bottom - kort.top, ctaH: cta.height, ctaBg: cs('.sk-knap', 'backgroundColor'),
    felter: [...document.querySelectorAll('.search-panel .input')].map(e => e.getBoundingClientRect().height),
    trinOverlap: nr.some((n, i) => skaerer(n, ik[i])), ikonH: ik.map(b => b.height),
    tileH: [...document.querySelectorAll('.tile')].map(e => e.getBoundingClientRect().height),
    sektionLuft: ['.udvalg', '.typer', '.saadan', '.tre-kol-sektion'].map(s => parseFloat(cs(s, 'paddingTop')) + parseFloat(cs(s, 'paddingBottom'))),
    streg: ['.sek-hoved h2', '.saadan-hoved h2', '.hvorfor h2'].map(s => { const e = document.querySelector(s); return e ? getComputedStyle(e, '::before').backgroundColor : null; }),
    pil: getComputedStyle(document.querySelector('.saadan-trin-punkt'), '::after').content,
    chips: smaa,
  };
};

for (const [vp, tema] of [[1440, 'light'], [1440, 'dark'], [1024, 'light'], [768, 'dark'], [390, 'light'], [320, 'dark']]){
  test(`W11 ${vp} px ${tema}: hero, søgekort, sådan virker, fliser, rytme`, async t => {
    if (!kan.ok) return t.skip(kan.grund);
    const m = await aabn(vp, tema, p => p.evaluate(maal));
    assert.equal(m.overflow, 0, 'vandret overflow');
    assert.ok(m.ctaH >= 44, 'CTA-højde ' + m.ctaH);
    assert.notStrictEqual(m.ctaBg, 'rgb(30, 142, 90)', 'CTA må ikke være grøn');
    m.felter.forEach(h => assert.ok(h >= 40, 'felthøjde ' + h));
    assert.equal(m.trinOverlap, false, 'trinnummer overlapper ikon');
    m.ikonH.forEach(h => assert.ok(h >= 32, 'trinikon ' + h));
    m.tileH.forEach(h => assert.ok(h >= 72, 'flisehøjde ' + h));
    assert.equal(m.chips, 0, 'tap-mål under 40 px');
    if (vp >= 1100){
      assert.ok(m.heroH >= 232, 'hero ' + m.heroH);
      assert.ok(m.h1 >= 38, 'h1 ' + m.h1);
      assert.ok(m.overlap >= 40, 'overlap ' + m.overlap);
      m.sektionLuft.forEach(v => assert.ok(v >= 12, 'sektionsluft ' + v));
    }
    if (vp >= 1000) assert.notEqual(m.pil, 'none', 'pil mellem trin');
    if (vp <= 390) assert.ok(m.h1 >= 34, 'mobil-h1 ' + m.h1);
  });
}
