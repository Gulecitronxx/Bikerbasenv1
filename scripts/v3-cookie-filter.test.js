/* V3 QA: en indholdsblokker der skjuler cookie-dialogen må ikke gøre siden død (skjult :modal => inert side). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const smoke = require('./smoke-browser');
const rod = path.join(__dirname, '..');

test('kilden tjekker at dialogen er synlig efter showModal (inline + components.js)', () => {
  const inl = fs.readFileSync(path.join(rod, 'scripts/inline-cookie.js'), 'utf8');
  assert.match(inl, /getComputedStyle\(d\)/);
  assert.match(inl, /offsetWidth/);
  const comp = fs.readFileSync(path.join(rod, 'js/components.js'), 'utf8');
  assert.match(comp, /slipSiden/);
});

test('skjult cookie-dialog lukkes, så forsiden kan klikkes (browser)', async t => {
  const kan = await smoke.playwrightTilgaengelig();
  if (!kan.ok) return t.skip(kan.grund);
  if (!/getComputedStyle\(d\)/.test(fs.readFileSync(path.join(rod, 'index.html'), 'utf8'))) return t.skip('index.html er ikke bygget efter rettelsen (kør node scripts/build.js)');
  const { server, port } = await smoke.startServer(rod);
  const b = await kan.pw.chromium.launch({ headless: true });
  try {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
    await smoke.installerMock(ctx, port, {});
    await ctx.addInitScript(() => {
      new MutationObserver((m, o) => { if (document.head) { const s = document.createElement('style'); s.textContent = '#cookie-banner,[class*="cookie" i]{display:none!important}'; document.head.appendChild(s); o.disconnect(); } }).observe(document, { childList: true, subtree: true });
    });
    const p = await ctx.newPage();
    await p.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
    await p.waitForTimeout(1000);
    const modal = await p.evaluate(() => { const d = document.getElementById('cookie-banner'); return !!(d && d.matches(':modal')); });
    assert.equal(modal, false, 'skjult dialog må ikke forblive :modal');
    await p.locator('a[href*="soegning"]').first().click({ timeout: 4000 });
  } finally { await b.close(); server.close(); }
});
