/* V3 sælger: deterministisk init af opret-siden (P2-2), login uden layout-skift og enlige ord, samlet valideringsbesked,
   uafkortede enhedsfelter, bekræftelsesdialog i stedet for window.confirm. Kun LOKAL mock; springes over uden Playwright. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const sb = require('../scripts/smoke-browser');
const { lavBackend } = require('../scripts/w9-saelger-mock');

const rod = path.join(__dirname, '..');
let kan, server, port, browser;
test.before(async () => {
  kan = await sb.playwrightTilgaengelig();
  if (!kan.ok){ console.log(`# v3-saelger.test: SKIPPER browsertestene (${kan.grund})`); return; }
  ({ server, port } = await sb.startServer(rod));
  browser = await kan.pw.chromium.launch();
});
test.after(async () => { if (browser) await browser.close(); if (server) server.close(); });

async function aabn(opts, sti, { viewport = { width: 1280, height: 900 }, tema = 'lys', foerGoto } = {}){
  const bak = lavBackend(opts);
  const ctx = await browser.newContext({ viewport });
  await bak.installer(ctx, { tema });
  const page = await ctx.newPage();
  const fund = [];
  page.on('pageerror', e => fund.push(e.message));
  if (foerGoto) await foerGoto(ctx, page);
  await page.goto(`http://127.0.0.1:${port}/${sti}`, { waitUntil: 'domcontentloaded' });
  return { bak, ctx, page, fund, t: bak.tilstand };
}

test('statisk: login.html og js/login.js har samme redirect-tekster (tekst sættes før første maling)', () => {
  const html = fs.readFileSync(path.join(rod, 'login.html'), 'utf8');
  const js = fs.readFileSync(path.join(rod, 'js/login.js'), 'utf8');
  const bloek = html.match(/var T=(\{[^;]*\});/);
  assert.ok(bloek, 'inline tekst-script findes i login.html');
  const T = JSON.parse(bloek[1]);
  for (const [fil, [titel, tekst]] of Object.entries(T)){
    assert.ok(js.includes(`'${fil}': {`), `${fil} findes i login.js`);
    assert.ok(js.includes(titel), `titel for ${fil} står i login.js`);
    assert.ok(js.includes(tekst), `tekst for ${fil} står i login.js`);
  }
  assert.ok(html.includes('Kontakt sælgeren') && js.includes('Kontakt sælgeren'));
});

test('login: overskrift/undertekst efter ?redirect= står der FØR scripts kører, og siden skifter ikke layout', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: false }, 'login.html?redirect=dashboard.html', { viewport: { width: 320, height: 800 },
    foerGoto: async ctx => {
      await ctx.route('**/js/*.js*', r => new Promise(z => setTimeout(z, 400)).then(() => r.fallback()));
      await ctx.addInitScript(() => {
        window.__cls = 0;
        new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      });
    } });
  try {
    await s.page.waitForSelector('#auth-subtitle');
    // scripts er forsinket 400 ms: teksten kommer fra login.html selv
    assert.match(await s.page.locator('#auth-subtitle').innerText(), /visninger, telefonvisninger og status/);
    assert.strictEqual((await s.page.locator('#auth-title').innerText()).trim(), 'Dit overblik');
    await s.page.waitForLoadState('networkidle'); await s.page.waitForTimeout(600);
    const cls = await s.page.evaluate(() => window.__cls);
    assert.ok(cls < 0.02, 'CLS ' + cls);
    assert.deepStrictEqual(s.fund, []);
  } finally { await s.ctx.close(); }
});

test('login: ingen enkeltord på sidste linje i overskrifter (text-wrap: balance) og skip-linket er stadig første Tab-stop', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: false }, 'login.html', { viewport: { width: 375, height: 800 } });
  try {
    await s.page.waitForLoadState('networkidle');
    const wrap = await s.page.evaluate(() => ['.lg-head h1', '.lg-promo h2'].map(q => getComputedStyle(document.querySelector(q)).textWrap));
    assert.deepStrictEqual(wrap, ['balance', 'balance']);
    await s.page.keyboard.press('Tab');
    assert.ok(await s.page.evaluate(() => /skip|spring/i.test((document.activeElement.className || '') + (document.activeElement.textContent || ''))), 'første Tab rammer skip-linket');
  } finally { await s.ctx.close(); }
});

test('opret: langsom backend — kladden kommer tilbage, nyindtastet overskrives ikke, og body[data-op-klar] siger hvornår formen er klar', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html', {
    foerGoto: async ctx => { await ctx.route('**/*.supabase.co/**', async r => { await new Promise(z => setTimeout(z, 700)); r.fallback(); }); } });
  try {
    await s.page.waitForSelector('body[data-op-klar]', { timeout: 15000 });
    await s.page.selectOption('#f-brand', 'Honda'); await s.page.fill('#f-model', 'Shadow'); await s.page.fill('#f-km', '4200');
    await s.page.click('#save-draft');
    await s.page.reload({ waitUntil: 'domcontentloaded' });
    await s.page.waitForSelector('body[data-op-klar]', { timeout: 15000 });
    assert.strictEqual(await s.page.inputValue('#f-model'), 'Shadow');
    assert.strictEqual(await s.page.inputValue('#f-km'), '4200');
    // bruger skriver, mens opstarten stadig venter på backend: det skrevne må ikke overskrives af kladden
    await s.page.reload({ waitUntil: 'domcontentloaded' });
    await s.page.waitForSelector('#f-model');
    await s.page.fill('#f-model', 'Nyt');
    await s.page.waitForSelector('body[data-op-klar]', { timeout: 15000 });
    assert.strictEqual(await s.page.inputValue('#f-model'), 'Nyt', 'det brugeren selv har skrevet bevares');
    assert.strictEqual(await s.page.inputValue('#f-km'), '4200', 'resten af kladden kommer tilbage');
  } finally { await s.ctx.close(); }
});

test('opret: tom "Fortsæt" tæller typevalget med og nævner det først; enhedsfelter har uafkortede eksempler ved 375 px', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html', { viewport: { width: 375, height: 800 } });
  try {
    await s.page.waitForSelector('body[data-op-klar]');
    const afkortet = await s.page.evaluate(() => ['f-km', 'f-ccm', 'f-power', 'f-year'].map(id => {
      const el = document.getElementById(id); const cs = getComputedStyle(el);
      const c = document.createElement('canvas').getContext('2d'); c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const plads = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      return { id, bredde: Math.ceil(c.measureText(el.placeholder).width), plads };
    }).filter(x => x.bredde > x.plads));
    assert.deepStrictEqual(afkortet, [], 'placeholder passer i feltet');
    await s.page.click('#step-next');
    await s.page.waitForSelector('.toast');
    const tekst = await s.page.locator('.toast').first().innerText();
    assert.match(tekst, /^\d+ felter skal rettes\. Først: Vælg motorcykeltype\./);
    assert.ok(Number(tekst.match(/^(\d+)/)[1]) >= 8, tekst);
  } finally { await s.ctx.close(); }
});

test('mine annoncer: slet åbner en navngiven dialog (ikke window.confirm) — fokus på Annuller, Escape annullerer, Slet sletter', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true, annoncer: [{ brand: 'Honda', model: 'CB 500' }] }, 'mine-annoncer.html');
  try {
    let nativ = 0; s.page.on('dialog', d => { nativ++; d.dismiss(); });
    await s.page.waitForSelector('.db-row');
    const r = s.page.locator('.db-row').first();
    await r.locator('summary').click();
    await r.locator('[data-delete-listing]').click();
    const d = s.page.locator('dialog.bb-bekraeft[open]');
    await d.waitFor();
    assert.match(await d.locator('h2').innerText(), /Slet Honda CB 500\?/);
    assert.strictEqual(await d.locator('[data-bekraeft-ok]').innerText(), 'Slet annonce');
    assert.strictEqual(await s.page.evaluate(() => document.activeElement.hasAttribute('data-bekraeft-nej')), true, 'fokus på det sikre valg');
    await s.page.keyboard.press('Escape');
    await s.page.waitForFunction(() => !document.querySelector('dialog.bb-bekraeft'));
    assert.strictEqual(s.t.tabeller.listings.length, 1, 'Escape sletter ikke');
    if (!await r.locator('[data-delete-listing]').isVisible()) await r.locator('summary').click();
    await r.locator('[data-delete-listing]').click();
    await s.page.locator('dialog.bb-bekraeft[open] [data-bekraeft-ok]').click();
    await s.page.waitForFunction(() => !document.querySelector('.db-row'));
    assert.strictEqual(s.t.tabeller.listings.length, 0);
    assert.strictEqual(nativ, 0, 'ingen native dialoger');
    assert.deepStrictEqual(s.fund, []);
  } finally { await s.ctx.close(); }
});

test('mine annoncer: "Ryd mine data i denne browser" bruger bekræftelsesdialogen (ikke window.confirm) — Escape annullerer, bekræft rydder og går til forsiden', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true, annoncer: [{ brand: 'Honda', model: 'CB 500' }] }, 'mine-annoncer.html?tab=konto');
  try {
    let nativ = 0; s.page.on('dialog', d => { nativ++; d.dismiss(); });
    await s.page.waitForSelector('#delete-account-btn', { state: 'visible' });
    await s.page.click('#delete-account-btn');
    const d = s.page.locator('dialog.bb-bekraeft[open]');
    await d.waitFor();
    assert.match(await d.locator('h2').innerText(), /Ryd data i denne browser\?/);
    assert.match(await d.locator('p').innerText(), /Din konto og dine annoncer i databasen bliver stående/);
    assert.strictEqual(await d.locator('[data-bekraeft-ok]').innerText(), 'Ryd data i browseren');
    assert.strictEqual(await s.page.evaluate(() => document.activeElement.hasAttribute('data-bekraeft-nej')), true, 'fokus på det sikre valg');
    await s.page.keyboard.press('Escape');
    await s.page.waitForFunction(() => !document.querySelector('dialog.bb-bekraeft'));
    assert.match(s.page.url(), /mine-annoncer\.html/, 'Escape rydder ikke og forlader ikke siden');
    await s.page.click('#delete-account-btn');
    await s.page.locator('dialog.bb-bekraeft[open] [data-bekraeft-ok]').click();
    await s.page.waitForURL(/index\.html/, { timeout: 8000 });
    assert.strictEqual(nativ, 0, 'ingen native dialoger');
    assert.deepStrictEqual(s.fund, []);
  } finally { await s.ctx.close(); }
});
