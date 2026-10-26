/* V2 saelger: hero uden klipning (P2-2), konkrete danske fejltekster, markér solgt, fuldt flow mod LOKAL mock.
   Ingen produktion; alt besvares af scripts/w9-saelger-mock.js. Springes over uden Playwright. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const sb = require('../scripts/smoke-browser');
const { lavBackend, lavPng } = require('../scripts/w9-saelger-mock');

let kan, server, port, browser;
test.before(async () => {
  kan = await sb.playwrightTilgaengelig();
  if (!kan.ok){ console.log(`# v2-saelger.test: SKIPPER (${kan.grund})`); return; }
  ({ server, port } = await sb.startServer(path.join(__dirname, '..')));
  browser = await kan.pw.chromium.launch();
});
test.after(async () => { if (browser) await browser.close(); if (server) server.close(); });

async function aabn(opts = {}, sti, viewport = { width: 1280, height: 900 }, tema = 'lys'){
  const bak = lavBackend(opts);
  const ctx = await browser.newContext({ viewport });
  await bak.installer(ctx, { tema });
  /* V3: bekræftelser er en <dialog> (js/bekraeft-dialog.js), ikke window.confirm. Testen svarer automatisk: window.__bekraeftSvar = 'ja' | 'nej'. */
  await ctx.addInitScript(() => {
    window.__bekraeftSvar = 'ja';
    document.addEventListener('DOMContentLoaded', () => new MutationObserver(() => {
      const d = document.querySelector('dialog.bb-bekraeft[open]');
      if (d && !d.dataset.auto){ d.dataset.auto = '1'; setTimeout(() => d.querySelector(window.__bekraeftSvar === 'ja' ? '[data-bekraeft-ok]' : '[data-bekraeft-nej]').click(), 30); }
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] }));
  });
  const page = await ctx.newPage();
  const fund = [];
  page.on('pageerror', e => fund.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto(`http://127.0.0.1:${port}/${sti}`, { waitUntil: 'networkidle' });
  return { bak, ctx, page, fund, t: bak.tilstand };
}

/* Ikke-komprimerbart PNG (> 12 MB) til stoerrelsestesten. */
function stortPng(b, h){
  const raw = Buffer.alloc(h * (1 + b * 3)); crypto.randomFillSync(raw);
  for (let y = 0; y < h; y++) raw[y * (1 + b * 3)] = 0;
  const tabel = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = buf => { let c = 0xffffffff; for (const x of buf) c = tabel[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const kl = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(b, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), kl('IHDR', ih), kl('IDAT', zlib.deflateSync(raw, { level: 0 })), kl('IEND', Buffer.alloc(0))]);
}

test('P2-2 Opret: hero-undertekst og tillidsboks klippes ikke af trinbjaelken (1440/768/390, lys+moerk)', { timeout: 240000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) for (const tema of ['lys', 'moerk']) {
    const s = await aabn({ loggetInd: true }, 'opret-annonce.html', { width: w, height: h }, tema);
    try {
      await s.page.waitForSelector('body[data-op-klar]', { state: 'attached', timeout: 15000 });   // V7 QA: vent på at siden er klar (var: evaluate straks, element null under belastning)
      const m = await s.page.evaluate(() => {
        const bund = q => document.querySelector(q).getBoundingClientRect().bottom;
        const kort = document.querySelector('.op-stepper-card').getBoundingClientRect().top;
        return { lead: bund('.op-hero-lead'), trust: bund('.op-trust'), kort,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      assert.ok(m.lead <= m.kort - 4, `${w}/${tema}: undertekst slutter ${m.lead} men trinbjaelken starter ${m.kort}`);
      assert.ok(m.trust <= m.kort - 4, `${w}/${tema}: tillidsboks slutter ${m.trust} men trinbjaelken starter ${m.kort}`);
      assert.ok(m.overflow <= 0, `${w}: vandret overflow ${m.overflow}`);
    } finally { await s.ctx.close(); }
  }
});

test('Opret: tom Fortsaet giver konkrete danske fejl ved hvert felt, aldrig "Feltet skal udfyldes."', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html');
  try {
    await s.page.click('#step-next');
    await s.page.waitForTimeout(400);
    const fejl = await s.page.$$eval('.felt-fejl', e => e.map(x => x.textContent.trim()));
    for (const forventet of [/motorcykeltype/, /mærke/, /model/, /årgang/i, /kilometerstand/, /ccm/, /stand/, /pris/, /postnummer/, /beskrivelse/]) {
      assert.ok(fejl.some(f => forventet.test(f)), `mangler fejl ${forventet}: ${fejl.join(' | ')}`);
    }
    assert.ok(!fejl.includes('Feltet skal udfyldes.'), 'generisk tekst: ' + fejl.join(' | '));
  } finally { await s.ctx.close(); }
});

test('Opret: fil over 12 MB, ikke-billede afvises med navngiven besked; raekkefoelge og fjern virker', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html');
  try {
    const tekst = () => s.page.evaluate(() => [...document.querySelectorAll('[role=alert],[role=status],.toast')].map(e => e.innerText).join(' || '));
    await s.page.setInputFiles('#photo-input', [{ name: 'stor.png', mimeType: 'image/png', buffer: stortPng(2400, 1800) }, { name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('x') }]);
    await s.page.waitForTimeout(1200);
    assert.match(await tekst(), /"stor\.png" er for stort \(maks\. 12 MB\)/);
    assert.match(await tekst(), /1 fil er ikke et billede/);
    assert.strictEqual(await s.page.locator('#photo-grid .photo-thumb').count(), 0);
    await s.page.setInputFiles('#photo-input', [1, 2, 3].map(i => ({ name: `f${i}.png`, mimeType: 'image/png', buffer: lavPng(320, 240, [60 * i, 40, 40]) })));
    await s.page.waitForTimeout(600);
    const src = () => s.page.$$eval('#photo-grid .photo-thumb img', i => i.map(x => x.src));
    const foer = await src();
    await s.page.locator('.photo-thumb[data-idx="2"] [data-cover]').click({ force: true });
    const efter = await src();
    assert.strictEqual(efter[0], foer[2], 'valgt billede blev forsiden');
    await s.page.locator('.photo-thumb[data-idx="0"] .remove-photo').click({ force: true });
    assert.strictEqual(await s.page.locator('#photo-grid .photo-thumb').count(), 2);
  } finally { await s.ctx.close(); }
});

test('Opret: udfyldt flow, gennemse, vilkaar kraeves, udgiv giver en annonce med 3 fotos og sender til annoncen', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    const s = await aabn({ loggetInd: true }, 'opret-annonce.html', vp);
    try {
      const p = s.page;
      await p.locator('label.radio-card', { has: p.locator('input[value=naked]') }).click();
      await p.selectOption('#f-brand', 'Yamaha'); await p.fill('#f-model', 'MT-07');
      await p.fill('#f-year', '2021'); await p.fill('#f-km', '12500'); await p.fill('#f-ccm', '689'); await p.fill('#f-price', '69900');
      await p.selectOption('#f-condition', { index: 1 });
      await p.fill('#f-postnr', '8000'); await p.fill('#f-desc', 'Velholdt MT-07 med servicehistorik.');
      await p.setInputFiles('#photo-input', [1, 2, 3].map(i => ({ name: `f${i}.png`, mimeType: 'image/png', buffer: lavPng(320, 240, [60 * i, 40, 40]) })));
      await p.click('#step-next');
      await p.waitForFunction(() => /Udgiv annonce/.test(document.getElementById('step-next').textContent));
      await p.click('#step-next');
      await p.waitForTimeout(300);
      assert.strictEqual(s.t.tabeller.listings.length, 0, 'uden vilkaar udgives intet');
      await p.check('#f-terms'); await p.click('#step-next');
      await p.waitForURL(/\/annonce\.html\?id=/, { timeout: 10000 });
      assert.strictEqual(s.t.tabeller.listings.length, 1);
      assert.strictEqual(s.t.uploads.length, 3);
      assert.deepStrictEqual(s.fund, []);
    } finally { await s.ctx.close(); }
  }
});

test('Mine annoncer: markér solgt, afvist = intet kald; godkendt = status sold; PATCH-fejl lader status staa', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true, annoncer: [{ brand: 'Yamaha', model: 'MT-07' }, { brand: 'Honda', model: 'CB500F' }] }, 'mine-annoncer.html');
  try {
    const p = s.page;
    await p.waitForSelector('.db-row');
    const id = s.t.tabeller.listings[0].id;
    const raekke = p.locator(`.db-row[data-listing-id="${id}"]`);
    await p.evaluate(() => { window.__bekraeftSvar = 'nej'; });
    await raekke.locator('summary').click();
    await raekke.locator('[data-mark-sold]').click();
    await p.waitForTimeout(300);
    assert.strictEqual(s.t.log.filter(l => l.metode === 'PATCH').length, 0);
    await p.evaluate(() => { window.__bekraeftSvar = 'ja'; });
    if (!await raekke.locator('[data-mark-sold]').isVisible()) await raekke.locator('summary').click();   // menuen lukker, når dialogen tager fokus
    await raekke.locator('[data-mark-sold]').click();
    await p.waitForFunction(i => document.querySelector(`.db-row[data-listing-id="${i}"]`)?.dataset.status === 'sold', id);
    assert.strictEqual(s.t.tabeller.listings[0].status, 'sold');
    assert.match(await p.locator(`.db-row[data-listing-id="${id}"] .db-badge`).innerText(), /Solgt/);
    assert.match(await p.locator(`.db-row[data-listing-id="${id}"] [data-status-skift]`).innerText(), /Sæt til salg igen/);
    s.t.fejl['PATCH listings'] = { status: 500, besked: 'mock' };
    const andet = s.t.tabeller.listings[1].id;
    const r2 = p.locator(`.db-row[data-listing-id="${andet}"]`);
    await r2.locator('summary').click(); await r2.locator('[data-mark-sold]').click();
    await p.waitForFunction(() => /kunne ikke markeres som solgt/.test(document.body.innerText));
    assert.strictEqual(s.t.tabeller.listings[1].status, 'active');
    assert.deepStrictEqual(s.fund, []);
  } finally { await s.ctx.close(); }
});

test('Login: tomt og ugyldigt skema faas fanget med konkret besked og fokus; intet auth-kald', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: false }, 'login.html', { width: 1440, height: 900 });
  try {
    const p = s.page, send = () => p.click('#login-form button[type=submit]');
    const fejl = () => p.locator('.lg-card .felt-fejl').innerText();   // V5: feltfejl står ved feltet (ikke i overlayet)
    await send();
    assert.match(await fejl(), /Skriv din e-mail/);
    assert.strictEqual(await p.evaluate(() => document.activeElement.id), 'login-email');
    assert.strictEqual(await p.getAttribute('#login-email', 'aria-invalid'), 'true');
    await p.fill('#login-email', 'ikke-en-mail'); await send();
    assert.match(await fejl(), /navn@eksempel\.dk/);
    await p.fill('#login-email', 'a@b.dk'); await send();
    assert.match(await fejl(), /Skriv din adgangskode/);
    assert.strictEqual(await p.evaluate(() => document.activeElement.id), 'login-password');
    assert.strictEqual(s.t.auth.filter(a => a.grant === 'password').length, 0, 'intet kald til auth');
  } finally { await s.ctx.close(); }
});

test('Login: fejlboksen overlapper ikke "Fortsaet uden konto"; fokusring paa felt og knap (lys+moerk)', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const tema of ['lys', 'moerk']) {
    const s = await aabn({ loggetInd: false, login: () => ({ status: 400 }) }, 'login.html', { width: 1440, height: 900 }, tema);
    try {
      const p = s.page;
      await p.fill('#login-email', 'a@b.dk'); await p.fill('#login-password', 'forkert');
      await p.click('#login-form button[type=submit]');
      await p.waitForFunction(() => /Forkert/.test(document.getElementById('auth-error')?.textContent || ''));
      const m = await p.evaluate(() => {
        const e = document.getElementById('auth-error').getBoundingClientRect();
        const k = [...document.querySelectorAll('.lg-extras a, .lg-extras button')].find(x => /uden konto/i.test(x.textContent)).getBoundingClientRect();
        return { eBund: e.bottom, kTop: k.top };
      });
      assert.ok(m.kTop - m.eBund >= 4, `${tema}: fejl ${m.eBund} mod knap ${m.kTop}`);
      await p.focus('#login-email'); await p.waitForTimeout(350);
      const ring = await p.$eval('#login-email', el => getComputedStyle(el).boxShadow);
      assert.notStrictEqual(ring, 'none');
      assert.ok(/rgb/.test(ring) && /4px/.test(ring), 'fokusring: ' + ring);
    } finally { await s.ctx.close(); }
  }
});

test('Mine annoncer: statuskolonnen flugter paa tvaers af raekker, badge har ikon, 5. statistikkort fylder bredden paa mobil', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const annoncer = [{ brand: 'Yamaha', model: 'MT-07' }, { brand: 'Honda', model: 'CB500F', status: 'hidden' }, { brand: 'BMW', model: 'R 1250 GS' }];
  const s = await aabn({ loggetInd: true, annoncer }, 'mine-annoncer.html', { width: 1440, height: 900 });
  try {
    await s.page.waitForSelector('.db-row');
    const m = await s.page.evaluate(() => ({
      x: [...document.querySelectorAll('.db-row .db-badge')].map(b => Math.round(b.getBoundingClientRect().left)),
      ikon: [...document.querySelectorAll('.db-row .db-badge')].every(b => b.querySelector('svg')),
    }));
    assert.strictEqual(new Set(m.x).size, 1, 'badge-x: ' + m.x);
    assert.ok(m.ikon, 'alle statusmaerker har ikon');
  } finally { await s.ctx.close(); }
  const mob = await aabn({ loggetInd: true, annoncer }, 'mine-annoncer.html', { width: 390, height: 844 });
  try {
    await mob.page.waitForSelector('.db-stat');
    const m = await mob.page.evaluate(() => {
      const k = [...document.querySelectorAll('.db-stat')];
      const sidste = k[k.length - 1].getBoundingClientRect(), forste = k[0].getBoundingClientRect();
      return { n: k.length, sidste: sidste.width, forste: forste.width, flade: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    assert.strictEqual(m.n, 5);
    assert.ok(m.sidste > m.forste * 1.8, `sidste kort ${m.sidste} vs ${m.forste}`);
    assert.ok(m.flade <= 0);
  } finally { await mob.ctx.close(); }
});
