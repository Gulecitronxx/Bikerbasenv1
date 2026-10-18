/* V3 marked: søgesiden uden hero. Browsertest mod lokal mock (ingen netværk). Springes over uden Playwright. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const REPO = path.join(__dirname, '..');
const sb = require(path.join(REPO, 'scripts', 'smoke-browser.js'));
let H = null;
test.before(async () => {
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) return;
  const { server, port } = await sb.startServer(REPO);
  H = { server, port, browser: await kan.pw.chromium.launch({ headless: true }) };
});
test.after(async () => { if (H) { await H.browser.close(); H.server.close(); } });
async function aabn(w, url) {
  const c = await H.browser.newContext({ viewport: { width: w, height: 900 }, locale: 'da-DK', serviceWorkers: 'block' });
  await c.addInitScript(sb.initScript, { tema: 'light' });
  await sb.installerMock(c, H.port, {});
  const p = await c.newPage(); const fejl = [];
  p.on('pageerror', e => fejl.push(e.message));
  await p.goto(`http://127.0.0.1:${H.port}/${url}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  return { c, p, fejl };
}
/* Venter (op til 4 s) på at søgetilstanden opfylder pred, i stedet for faste pauser (debounce 250 ms + render er tidsfølsomt under belastning). */
async function vent(p, pred) {
  for (let i = 0; i < 40; i++) { if (pred(await tilstand(p))) return; await p.waitForTimeout(100); }
}
const tilstand = p => p.evaluate(() => ({
  q: document.getElementById('filter-q').value, url: location.search,
  n: document.getElementById('results-count').textContent.trim(),
  pills: [...document.querySelectorAll('.active-filter-pill')].map(x => x.textContent.trim()),
}));

test('ingen hero, én skjult h1, ?q=Honda filtrerer og kan fjernes som pille', async (t) => {
  if (!H) return t.skip('Playwright mangler');
  const { c, p, fejl } = await aabn(1440, 'soegning.html?q=Honda');
  try {
    assert.equal(await p.evaluate(() => document.querySelectorAll('.so-hero, .so-card').length), 0);
    assert.equal(await p.evaluate(() => document.querySelectorAll('h1').length), 1);
    assert.ok(await p.evaluate(() => { const r = document.querySelector('h1').getBoundingClientRect(); return r.width <= 2 && r.height <= 2; }));
    let s = await tilstand(p);
    assert.equal(s.q, 'Honda'); assert.deepEqual(s.pills, ['"Honda"']);
    await p.click('.active-filter-pill button'); await vent(p, x => x.pills.length === 0);
    s = await tilstand(p);
    assert.equal(s.q, ''); assert.deepEqual(s.pills, []); assert.equal(s.url, '');
    await p.fill('#filter-q', 'zzzz'); await vent(p, x => /^0 /.test(x.n));
    assert.match((await tilstand(p)).n, /^0 /);
    assert.equal(await p.evaluate(() => getComputedStyle(document.getElementById('empty-state')).display), 'block');
    await p.click('#filter-q-clear'); await vent(p, x => x.q === '' && !/^0 /.test(x.n));
    assert.equal((await tilstand(p)).q, '');
    await p.fill('#filter-q', 'kawasaki'); await p.press('#filter-q', 'Enter'); await vent(p, x => x.pills.length === 1);
    assert.deepEqual((await tilstand(p)).pills, ['"kawasaki"']);
    assert.deepEqual(fejl, []);
  } finally { await c.close(); }
});

test('ukendt ?type= og ?koerekort= i URL\'en giver ingen fantompille', async (t) => {
  if (!H) return t.skip('Playwright mangler');
  const { c, p } = await aabn(1440, 'soegning.html?type=xyz&koerekort=Z');
  try {
    const s = await tilstand(p);
    assert.deepEqual(s.pills, []); assert.match(s.n, /^\d+ motorcykler/); assert.ok(!/^0 /.test(s.n));
  } finally { await c.close(); }
});

test('filterkombination type + kørekort, og sortering i URL', async (t) => {
  if (!H) return t.skip('Playwright mangler');
  const { c, p } = await aabn(1440, 'soegning.html?type=sport&koerekort=A2&sort=price-asc');
  try {
    const s = await tilstand(p);
    assert.deepEqual(s.pills, ['Sport', 'Kørekort A2']);
    const priser = await p.evaluate(() => [...document.querySelectorAll('#results-grid .rk-pris')].map(e => parseInt(e.textContent.replace(/\D/g, ''), 10)).filter(Boolean));
    assert.deepEqual(priser, [...priser].sort((a, b) => a - b));
  } finally { await c.close(); }
});

test('mobil 375: søgefeltet står øverst og ?q= virker uden hero', async (t) => {
  if (!H) return t.skip('Playwright mangler');
  const { c, p } = await aabn(375, 'soegning.html?q=Honda');
  try {
    const m = await p.evaluate(() => ({ top: document.getElementById('filter-q').getBoundingClientRect().top, ov: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
    assert.ok(m.top < 200, 'søgefelt ' + m.top); assert.equal(m.ov, 0);
    assert.deepEqual((await tilstand(p)).pills, ['"Honda"']);
  } finally { await c.close(); }
});
