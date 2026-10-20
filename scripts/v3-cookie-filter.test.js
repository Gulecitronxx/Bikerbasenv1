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

/* ---------- V4 QA: failsafen skal vare ved (blokker, der skjuler dialogen EFTER 0/300/1200/3000 ms) ----------
   V3-Critic: failsafen kørte kun ved 0 og 600 ms; ved 1200 ms fejlede klik. Testen bygger en kopi af forsiden med
   DEN NUVÆRENDE inline-cookie.js + csp-hashes.js (uafhængig af, om repoets HTML er bygget) og lader en blokker
   skjule dialogen efter en forsinkelse — som stylesheet og som inline style. Dialogen må ikke forblive :modal,
   siden skal kunne klikkes, og der må ikke gemmes samtykke. En synlig dialog må IKKE lukkes. */
const fsx = require('fs');
const os = require('os');

function byggForsideKopi() {
  const tmp = fsx.mkdtempSync(path.join(os.tmpdir(), 'v4-cookie-'));
  const kopi = rel => { const t = path.join(tmp, rel); fsx.mkdirSync(path.dirname(t), { recursive: true }); fsx.cpSync(path.join(rod, rel), t, { recursive: true }); };
  ['js', 'css', 'fonts', 'index.html', 'soegning.html', 'scripts/inline-cookie.js', 'scripts/csp-hashes.js', 'logo-mark.png'].forEach(kopi);
  const { spawnSync } = require('child_process');
  for (const s of ['inline-cookie.js', 'csp-hashes.js']) {
    const r = spawnSync(process.execPath, [path.join(tmp, 'scripts', s)], { cwd: tmp, encoding: 'utf8' });
    assert.equal(r.status, 0, `${s}: ${r.stderr || r.stdout}`);
  }
  return tmp;
}

test('inline-scriptet i cookie-blokken har vedvarende vagt (interval + visibilitychange) og er gyldig JS', () => {
  const tmp = byggForsideKopi();
  try {
    const html = fsx.readFileSync(path.join(tmp, 'index.html'), 'utf8');
    const blok = html.match(/<!--cookie:start-->[\s\S]*?<!--cookie:end-->/)[0];
    const kode = blok.match(/<script>([\s\S]*?)<\/script>/)[1];
    new Function(kode);   // kaster ved syntaksfejl
    assert.match(kode, /setInterval/);
    assert.match(kode, /visibilitychange/);
    const comp = fsx.readFileSync(path.join(rod, 'js/components.js'), 'utf8');
    assert.match(comp, /new MutationObserver\(planlaeg\)/);
    assert.match(comp, /setInterval\(\(\) => \{ vagt\(\)/);
  } finally { fsx.rmSync(tmp, { recursive: true, force: true }); }
});

test('blokker skjuler dialogen efter 0/300/1200/3000 ms (stylesheet og inline style): siden forbliver brugbar, intet samtykke gemmes', { timeout: 120000 }, async t => {
  const kan = await smoke.playwrightTilgaengelig();
  if (!kan.ok) return t.skip(kan.grund);
  const tmp = byggForsideKopi();
  const { server, port } = await smoke.startServer(tmp);
  const b = await kan.pw.chromium.launch({ headless: true });
  try {
    const tilfaelde = [];
    for (const ms of [0, 300, 1200, 3000]) tilfaelde.push({ ms, via: 'stylesheet' });
    tilfaelde.push({ ms: 1200, via: 'inline-style' }, { ms: 3000, via: 'inline-style' });
    for (const { ms, via } of tilfaelde) {
      const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
      await smoke.installerMock(ctx, port, {});
      await ctx.addInitScript(({ ms, via }) => {
        // ingen forhåndssvaret samtykke: dialogen skal åbne
        const gor = () => {
          const rod = document.head || document.documentElement;
          if (!rod) return setTimeout(gor, 2);   // dokumentet findes ikke endnu ved forsinkelse 0
          if (via === 'stylesheet') { const s = document.createElement('style'); s.textContent = '#cookie-banner,[class*="cookie" i]{display:none!important}'; rod.appendChild(s); }
          else { const d = document.getElementById('cookie-banner'); if (d) d.style.setProperty('display', 'none', 'important'); else setTimeout(gor, 5); }
        };
        setTimeout(gor, ms);
      }, { ms, via });
      const p = await ctx.newPage();
      try {
        await p.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
        await p.waitForTimeout(ms + 1600);
        const s = await p.evaluate(() => { const d = document.getElementById('cookie-banner'); return { modal: !!(d && d.matches(':modal')), samtykke: Object.keys(localStorage).filter(k => /cookie/i.test(k)) }; });
        assert.equal(s.modal, false, `${via} @${ms} ms: skjult dialog er stadig :modal (siden er inert)`);
        assert.deepEqual(s.samtykke, [], `${via} @${ms} ms: der må ikke gemmes samtykke`);
        await p.locator('a[href*="soegning"]').first().click({ timeout: 4000 });   // kaster, hvis siden er inert
      } finally { await ctx.close(); }
    }
    /* Falsk positiv: en SYNLIG dialog må ikke lukkes af vagten, og et svar gemmer samtykke og lukker den. */
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
    await smoke.installerMock(ctx, port, {});
    const p = await ctx.newPage();
    await p.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
    await p.waitForTimeout(3500);
    assert.equal(await p.evaluate(() => { const d = document.getElementById('cookie-banner'); return !!(d && d.matches(':modal')); }), true, 'synlig dialog skal forblive åben');
    await p.click('#cookie-necessary-only');
    await p.waitForTimeout(300);
    assert.equal(await p.evaluate(() => !document.getElementById('cookie-banner')), true, 'dialogen skal være fjernet efter svar');
    await ctx.close();
  } finally { await b.close(); server.close(); fsx.rmSync(tmp, { recursive: true, force: true }); }
});
