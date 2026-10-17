/* W14 annonce + opret: målende browsertests mod lokal mock (scripts/w9-saelger-mock.js). Ingen produktion.
   Springes tydeligt over uden Playwright/Chromium. Kriterier: docs/review/gauntlet/visual/agent3-annonce.md */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const sb = require('../scripts/smoke-browser');
const { lavBackend, lavPng } = require('../scripts/w9-saelger-mock');
const { eksterneRaekker, uuid } = require('../scripts/smoke-fixtures');

let kan, server, port, browser;
const ID = '00000000-0000-4000-8000-0000000000e1';
test.before(async () => {
  kan = await sb.playwrightTilgaengelig();
  if (!kan.ok){ console.log(`# w14-annonce.test: SKIPPER (${kan.grund})`); return; }
  ({ server, port } = await sb.startServer(path.join(__dirname, '..')));
  browser = await kan.pw.chromium.launch();
});
test.after(async () => { if (browser) await browser.close(); if (server) server.close(); });

const annonce = n => ({ id: ID, brand: 'Yamaha', model: 'MT-07', type: 'naked', year: 2023, km: 16300, ccm: 689, power: 73, price: 69900,
  description: 'Velholdt MT-07 med servicehistorik og nye dæk.', registration: 'CW 12 345',
  photos: Array.from({ length: n }, (_, i) => ({ id: 'p' + i, storage_path: `t/${i}.png`, position: i })) });

async function aabn(vp, tema, opts = {}){
  const bak = lavBackend({ loggetInd: !!opts.loggetInd, annoncer: opts.annoncer || [annonce(opts.fotos === undefined ? 5 : opts.fotos)] });
  bak.tilstand.tabeller.eksterne_annoncer.push(...eksterneRaekker());
  const ctx = await browser.newContext({ viewport: vp });
  await bak.installer(ctx, { tema });
  const page = await ctx.newPage();
  const fund = []; page.on('pageerror', e => fund.push(e.message));
  return { page, ctx, fund, bak };
}
const gaa = (s, side) => s.page.goto(`http://127.0.0.1:${port}/${side}`, { waitUntil: 'networkidle' }).then(() => s.page.waitForTimeout(300));
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test('galleri: hovedbilledet fylder hele billedboksen (ingen grå stribe under fotoet)', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ width: 1440, height: 900 }, 'light');
  try {
    await gaa(s, `annonce.html?id=${ID}`);
    const m = await s.page.evaluate(() => {
      const box = document.querySelector('.an-gallery .gallery-main').getBoundingClientRect();
      const img = document.querySelector('#gallery-main-img .card-photo').getBoundingClientRect();
      return { bh: box.height, ih: img.height, bw: box.width, iw: img.width };
    });
    assert.ok(Math.abs(m.bh - m.ih) <= 1, `billede ${m.ih} px i boks ${m.bh} px`);
    assert.ok(Math.abs(m.bw - m.iw) <= 1);
  } finally { await s.ctx.close(); }
});

test('desktop: ingen strækning — intet kort har tomt rum, kørekortkortet står i midten, lavt, med badgen til højre', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const [fotos, label] of [[5, 'egen 5 fotos'], [0, 'egen uden foto']]){
    const s = await aabn({ width: 1440, height: 900 }, 'light', { fotos });
    try {
      await gaa(s, `annonce.html?id=${ID}`);
      const m = await s.page.evaluate(() => {
        const r = e => e.getBoundingClientRect();
        const tomt = [...document.querySelectorAll('.an-kk, .an-tjek, .an-trygt-wrap .an-card, .an-fakta, .an-seller-wrap .sidebar-card')].map(k => {
          const kids = [...k.children].filter(c => c.getBoundingClientRect().height > 0 && getComputedStyle(c).position !== 'absolute');
          const sidste = Math.max(...kids.map(c => r(c).bottom));
          return [k.className.split(' ')[0], Math.round(r(k).bottom - sidste)];
        });
        const kk = document.querySelector('.an-kk'), badge = document.querySelector('.an-kk-badge'), tekst = document.querySelector('.an-kk-tekst');
        return { tomt, iB: !!document.querySelector('.an-col-b .an-kk'), kkH: Math.round(r(kk).height),
          badgeHoejre: r(badge).left >= r(tekst).right - 1, badgeLinje: r(badge).top < r(tekst).bottom };
      });
      assert.ok(m.iB, `${label}: kørekortkort i midterkolonnen`);
      assert.ok(m.badgeHoejre && m.badgeLinje, `${label}: badge til højre for teksten`);
      assert.ok(m.kkH <= 240, `${label}: kørekortkort ${m.kkH} px`);
      m.tomt.forEach(([navn, h]) => assert.ok(h <= 40, `${label}: ${navn} har ${h} px tomt rum i bunden`));
    } finally { await s.ctx.close(); }
  }
});

test('kørekortkort: grundlag og legende bruger kun oplyste tal og offentlige grænser', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ width: 1440, height: 900 }, 'light');
  try {
    await gaa(s, `annonce.html?id=${ID}`);
    const tekst = await s.page.locator('.an-kk').textContent();
    assert.match(tekst, /Oplyst effekt\s*73 hk/);
    assert.ok(await s.page.locator('.an-kk-mere:not([open])').count(), 'grundlag og legende er sammenfoldet som standard');
    assert.match(tekst, /Grænse for A2\s*højst 35 kW/);
    assert.doesNotMatch(tekst, /verificeret|garanteret/i);
    assert.match(tekst, /aldrig bekræftet/);
  } finally { await s.ctx.close(); }
});

test('resize 1440 -> 1024 -> 768 -> 390 -> 1440: ingen dubletter, intet tab, ingen overflow', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ width: 1440, height: 900 }, 'light');
  try {
    await gaa(s, `annonce.html?id=${ID}`);
    for (const w of [1440, 1024, 768, 390, 1440]){
      await s.page.setViewportSize({ width: w, height: 900 }); await s.page.waitForTimeout(250);
      const tal = await s.page.evaluate(() => ['.an-kk', '.an-tjek', '.an-trygt-wrap', '.an-fakta', '.an-desc', '.an-seller-wrap', '.an-gallery', '.an-head']
        .map(q => document.querySelectorAll(q).length));
      assert.deepStrictEqual(tal, [1, 1, 1, 1, 1, 1, 1, 1], `ved ${w}`);
      assert.ok(await overflow(s.page) <= 0, `overflow ved ${w}`);
    }
  } finally { await s.ctx.close(); }
});

test('ingen vandret overflow 320/390/768/1024/1440, lys og mørk, egen og ekstern annonce', { timeout: 240000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const tema of ['light', 'dark']) for (const w of [320, 390, 768, 1024, 1440]){
    const s = await aabn({ width: w, height: 900 }, tema);
    try {
      for (const side of [`annonce.html?id=${ID}`, `annonce.html?id=${uuid(14)}`, `annonce.html?id=${uuid(5)}`]){
        await gaa(s, side);
        assert.ok(await overflow(s.page) <= 0, `${side} ${w} ${tema}`);
      }
      assert.deepStrictEqual(s.fund, []);
    } finally { await s.ctx.close(); }
  }
});

test('opret: billedtrinnet har dropzone og miniaturer i samme række og et tipsbånd', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ width: 1440, height: 900 }, 'light', { loggetInd: true, annoncer: [] });
  try {
    await gaa(s, 'opret-annonce.html');
    await s.page.setInputFiles('#photo-input', Array.from({ length: 3 }, (_, i) => ({ name: `f${i}.png`, mimeType: 'image/png', buffer: lavPng(640, 480, [150 + i * 20, 80, 40]) })));
    await s.page.waitForSelector('.photo-thumb', { timeout: 5000 });
    const m = await s.page.evaluate(() => {
      const r = e => e.getBoundingClientRect();
      const z = r(document.getElementById('upload-zone')), th = r(document.querySelector('.photo-thumb')), tips = r(document.querySelector('.op-split-photos .op-tips'));
      return { zTop: z.top, thTop: th.top, thH: th.height, tipsTop: tips.top, zBottom: z.bottom, ov: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    assert.ok(Math.abs(m.zTop - m.thTop) <= 2, 'dropzone og første miniature i samme række');
    assert.ok(m.thH >= 100, `miniaturer er store nok (${m.thH})`);
    assert.ok(m.tipsTop >= m.zBottom - 1, 'tipsbåndet ligger under rækken');
    assert.ok(m.ov <= 0);
  } finally { await s.ctx.close(); }
});

test('opret: sektionsorden som billedet (Detaljer, Billeder, Beskrivelse og pris), 4 trin og fire kolonner i første feltrække', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ width: 1440, height: 900 }, 'light', { loggetInd: true, annoncer: [] });
  try {
    await gaa(s, 'opret-annonce.html');
    const m = await s.page.evaluate(() => {
      const h = [...document.querySelectorAll('.form-step h2')].map(e => e.textContent.split(/\s+/).join(' ').trim());
      const top = id => document.getElementById(id).getBoundingClientRect().top;
      const synlige = [...document.querySelectorAll('.form-step')].filter(e => !e.hidden).map(e => e.dataset.step);
      return { h, synlige, trin: document.querySelectorAll('#stepper .step-item').length,
        raekke: [top('f-brand'), top('f-model'), top('f-year'), top('f-km')].map(Math.round) };
    });
    assert.deepStrictEqual(m.h.slice(0, 3), ['1. Motorcyklens detaljer', '2. Billeder', '3. Beskrivelse og pris']);
    assert.deepStrictEqual(m.synlige, ['1', '2', '3']);
    assert.strictEqual(m.trin, 4);
    assert.ok(new Set(m.raekke).size === 1, 'mærke, model, årgang og km på samme række: ' + m.raekke);
  } finally { await s.ctx.close(); }
});

test('opret: udlogget ser login-port i stedet for dropzone (billeder kan ikke overleve en login-omvej)', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ width: 1440, height: 900 }, 'light', { loggetInd: false, annoncer: [] });
  try {
    await gaa(s, 'opret-annonce.html');
    assert.ok(await s.page.locator('#op-photo-gate').isVisible(), 'login-port synlig');
    assert.ok(!(await s.page.locator('#upload-zone').isVisible()), 'ingen dropzone udlogget');
    assert.match(await s.page.locator('#op-photo-gate').innerText(), /Log ind for at tilføje billeder/);
  } finally { await s.ctx.close(); }
});
