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

const eksterne = [[uuid(14), 'ekstern med foto'], [uuid(13), 'ekstern 48 hk'], [uuid(5), 'ekstern uden foto'], [uuid(12), 'ekstern uden pris']];

async function maalKolonner(s){
  return s.page.evaluate(() => {
    const r = e => e.getBoundingClientRect();
    const bund = ['.an-col-a', '.an-col-b', '.an-side'].map(q => Math.round(r(document.querySelector(q)).bottom));
    const grid = r(document.querySelector('.an-grid')), tjek = r(document.querySelector('.an-tjek'));
    const tomt = [...document.querySelectorAll('.an-kk, .an-trygt-wrap .an-card, .an-fakta, .an-seller-wrap .sidebar-card')].map(k => {
      const kids = [...k.children].filter(c => c.getBoundingClientRect().height > 0 && getComputedStyle(c).position !== 'absolute');
      return [k.className.split(' ')[0], Math.round(r(k).bottom - Math.max(...kids.map(c => r(c).bottom)))];
    });
    return { bund, spred: Math.max(...bund) - Math.min(...bund), tjekBredde: tjek.width / grid.width, tjekTop: tjek.top, tomt,
      kolBund: Math.max(...bund), fig: !!document.querySelector('.an-tjek-foto img'), figLabel: (document.querySelector('.an-tjek-foto figcaption') || {}).textContent || '' };
  });
}

test('desktop 1440: kolonnebunde højst 100 px fra hinanden, "Det bør du tjekke" er et fuldbredt bånd under dem, intet kort har tomt rum', { timeout: 180000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ width: 1440, height: 900 }, 'light', { fotos: 5 });
  try {
    const sider = [[`annonce.html?id=${ID}`, 'egen 5 fotos'], ...eksterne.map(([id, n]) => [`annonce.html?id=${id}`, n])];
    for (const [side, label] of sider){
      await gaa(s, side);
      const m = await maalKolonner(s);
      assert.ok(m.spred <= 100, `${label}: kolonnebunde ${m.bund} (forskel ${m.spred} px)`);
      assert.ok(m.tjekBredde >= 0.98, `${label}: tjekbåndet er ${Math.round(m.tjekBredde * 100)} % af gridbredden`);
      assert.ok(m.tjekTop >= m.kolBund - 1, `${label}: tjekbåndet ligger under alle kolonner`);
      assert.ok(m.fig, `${label}: foto ved siden af tjeklisten`);
      m.tomt.forEach(([navn, h]) => assert.ok(h <= 40, `${label}: ${navn} har ${h} px tomt rum i bunden`));
    }
    for (const fotos of [0, 1]){
      const s2 = await aabn({ width: 1440, height: 900 }, 'light', { fotos });
      try {
        await gaa(s2, `annonce.html?id=${ID}`);
        const m = await maalKolonner(s2);
        assert.ok(m.spred <= 100, `egen ${fotos} fotos: kolonnebunde ${m.bund}`);
        assert.match(m.figLabel + (fotos ? 'x' : ''), fotos ? /x/ : /Typefoto/, 'uden egne fotos: ærligt typefoto-label');
      } finally { await s2.ctx.close(); }
    }
  } finally { await s.ctx.close(); }
});

test('kørekortflade: lav (højst 190 px), titel på én linje, stor badge til højre, grundlag på én linje med kun oplyste tal', { timeout: 120000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ width: 1440, height: 900 }, 'light');
  try {
    for (const side of [`annonce.html?id=${ID}`, `annonce.html?id=${uuid(14)}`, `annonce.html?id=${uuid(13)}`]){
      await gaa(s, side);
      const m = await s.page.evaluate(() => {
        const r = e => e.getBoundingClientRect();
        const kk = document.querySelector('.an-kk'), badge = document.querySelector('.an-kk-badge'), tekst = document.querySelector('.an-kk-tekst');
        return { h: Math.round(r(kk).height), h2: Math.round(r(document.querySelector('.an-kk h2')).height), badgeB: Math.round(r(badge).width),
          badgeHoejre: r(badge).left >= r(tekst).right - 1, kolonne: !!kk.closest('.an-col-a, .an-col-b'), tekst: kk.textContent };
      });
      assert.ok(m.h <= 190, `${side}: kortet er ${m.h} px højt`);
      assert.ok(m.h2 < 30, `${side}: titlen brydes (${m.h2} px)`);
      assert.ok(m.badgeHoejre && m.badgeB >= 110, `${side}: stor badge til højre (${m.badgeB} px)`);
      assert.match(m.tekst, /Grundlag:.*A2-grænse højst 35 kW \(ca\. 47 hk\)/);
      assert.doesNotMatch(m.tekst, /verificeret|garanteret/i);
    }
    await gaa(s, `annonce.html?id=${ID}`);
    assert.match(await s.page.locator('.an-kk').textContent(), /oplyst effekt 73 hk/);
  } finally { await s.ctx.close(); }
});

test('faktatabel: uoplyste felter er samlet i én linje, ingen "Ikke oplyst"-rækker i tabellen', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ width: 1440, height: 900 }, 'light');
  try {
    await gaa(s, `annonce.html?id=${ID}`);
    assert.strictEqual(await s.page.locator('.an-facts dd.an-na').count(), 0);
    assert.match(await s.page.locator('.an-fakta-io').innerText(), /^Ikke oplyst: .*Afgift/);
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

test('telefon-reveal (logget ind, andens annonce): knappen henter nummeret via RPC; uden samtykke vises en ærlig afvisning', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const [svar, forventet] of [['"12345678"', /12345678/], ['null', /ikke|vises|kan ikke/i]]){
    const fremmed = 'cccccccc-0000-4000-8000-0000000000c1';
    const ann = Object.assign(annonce(2), { seller_id: fremmed, seller: { id: fremmed, name: 'Anders', is_dealer: false, city: 'Odense', member_since: 2024 } });
    const s = await aabn({ width: 1440, height: 900 }, 'light', { loggetInd: true, annoncer: [ann] });
    try {
      await s.ctx.route(/rpc\/hent_saelger_telefon/, r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: svar }));
      await gaa(s, `annonce.html?id=${ID}`);
      await s.page.click('#reveal-phone-btn');
      await s.page.waitForFunction(() => !/Henter/.test(document.querySelector('.an-seller-wrap').textContent), null, { timeout: 5000 });
      const tekst = await s.page.locator('.an-seller-wrap').innerText();
      assert.match(tekst, forventet);
      assert.deepStrictEqual(s.fund, []);
    } finally { await s.ctx.close(); }
  }
});

test('opret: lav hero (højst 200 px), eksempelkort i forhåndsvisningen fra start og kompakt upload-flise med miniaturefelter', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ width: 1440, height: 900 }, 'light', { loggetInd: true, annoncer: [] });
  try {
    await gaa(s, 'opret-annonce.html');
    const m = await s.page.evaluate(() => {
      const r = q => document.querySelector(q).getBoundingClientRect();
      const z = r('#upload-zone');
      const ghost = document.querySelector('.photo-ghosts > span');
      return { hero: r('.op-hero').height, uploadH: z.height, ghostRække: ghost ? Math.abs(ghost.getBoundingClientRect().top - z.top) : 999,
        kort: !!document.querySelector('#op-live-card .card'), eksempel: document.getElementById('op-live-card').classList.contains('op-live-eksempel'),
        etiket: getComputedStyle(document.getElementById('op-live-card'), '::before').content };
    });
    assert.ok(m.hero <= 200, `hero ${m.hero} px`);
    assert.ok(m.uploadH <= 140, `upload-flise ${m.uploadH} px`);
    assert.ok(m.ghostRække <= 2, 'miniaturefelter står i samme række som upload-fliserne');
    assert.ok(m.kort && m.eksempel, 'kortet vises uden input og er mærket som eksempel');
    assert.match(m.etiket, /Eksempel/);
    // efter valg af mærke og model er det ikke længere et eksempel
    await s.page.selectOption('#f-brand', 'Yamaha'); await s.page.fill('#f-model', 'MT-07');
    await s.page.waitForTimeout(200);
    assert.ok(!(await s.page.evaluate(() => document.getElementById('op-live-card').classList.contains('op-live-eksempel'))));
  } finally { await s.ctx.close(); }
});

test('opret login-port: teksten og toasten siger eksplicit, at billeder skal vælges efter login', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ width: 1440, height: 900 }, 'light', { loggetInd: false, annoncer: [] });
  try {
    await gaa(s, 'opret-annonce.html');
    assert.match(await s.page.locator('#op-photo-gate').innerText(), /Billeder kan ikke gemmes i en kladde/);
    await s.page.click('#op-photo-gate-btn');
    await s.page.waitForFunction(() => /Billeder kan ikke gemmes i kladden/.test(document.body.innerText), null, { timeout: 4000 });
    assert.match(await s.page.evaluate(() => document.body.innerText), /dem vælger du først, når du er logget ind/);
    assert.strictEqual(s.bak.tilstand.tabeller.listings.length, 0, 'intet oprettet');
  } finally { await s.ctx.close(); }
});

test('galleri: 6+ fotos giver 5 miniaturer og "+N"-flise; 0/1 foto har ingen pile', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ width: 1440, height: 900 }, 'light', { fotos: 14 });
  try {
    await gaa(s, `annonce.html?id=${ID}`);
    assert.strictEqual(await s.page.locator('.gallery-thumbs button:not(.gallery-more)').count(), 5);
    assert.match(await s.page.locator('.gallery-more span').innerText(), /^\+9$/);
    assert.ok(await s.page.locator('#gallery-expand').count(), 'fuldskærmsknap');
  } finally { await s.ctx.close(); }
  for (const fotos of [0, 1]){
    const s2 = await aabn({ width: 1440, height: 900 }, 'light', { fotos });
    try {
      await gaa(s2, `annonce.html?id=${ID}`);
      assert.strictEqual(await s2.page.locator('.gallery-nav').count(), 0, `${fotos} foto: ingen pile`);
      assert.strictEqual(await s2.page.locator('.gallery-thumbs').count(), 0, `${fotos} foto: ingen miniaturer`);
    } finally { await s2.ctx.close(); }
  }
});
