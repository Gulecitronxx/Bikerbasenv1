/* V7 QA: låser scripts/test-preload.js (genforsøg af page.goto ved OS-støj) uden browser: en falsk `playwright` i en temp-mappe. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PRELOAD = path.join(__dirname, 'test-preload.js');

function koer(scriptTekst, env = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'preload-'));
  try {
    fs.mkdirSync(path.join(dir, 'node_modules', 'playwright'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'node_modules', 'playwright', 'index.js'), `
      let kald = 0;
      const lavSide = (fejl) => ({ goto: async () => { kald++; const f = fejl[kald - 1]; if (f) throw new Error(f); return 'ok'; } });
      module.exports = { __kald: () => kald, __nulstil: () => { kald = 0; },
        chromium: { launch: async () => ({
          newPage: async () => lavSide(global.__fejl || []),
          newContext: async () => ({ newPage: async () => lavSide(global.__fejl || []) }),
        }) } };`);
    fs.writeFileSync(path.join(dir, 'k.js'), scriptTekst);
    const r = spawnSync(process.execPath, ['--require', PRELOAD, path.join(dir, 'k.js')], { cwd: dir, encoding: 'utf8', env: { ...process.env, ...env } });
    return { status: r.status, ud: (r.stdout || '') + (r.stderr || '') };
  } finally { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 }); }
}

test('goto tages om (højst 3 forsøg) ved ERR_NO_BUFFER_SPACE og lykkes ved forsøg 3', () => {
  const r = koer(`(async () => { global.__fejl = ['net::ERR_NO_BUFFER_SPACE at x', 'net::ERR_CONNECTION_RESET at x'];
    const pw = require('playwright'); const b = await pw.chromium.launch(); const p = await b.newPage();
    console.log('svar=' + await p.goto('http://x') + ' kald=' + pw.__kald()); })();`);
  assert.strictEqual(r.status, 0, r.ud);
  assert.match(r.ud, /svar=ok kald=3/);
});

test('kontekst.newPage() er også dækket', () => {
  const r = koer(`(async () => { global.__fejl = ['net::ERR_NO_BUFFER_SPACE'];
    const pw = require('playwright'); const b = await pw.chromium.launch(); const c = await b.newContext(); const p = await c.newPage();
    console.log('svar=' + await p.goto('http://x') + ' kald=' + pw.__kald()); })();`);
  assert.match(r.ud, /svar=ok kald=2/);
});

test('andre fejl (timeout, 404, scriptfejl) kastes uændret og tages IKKE om; efter 3 OS-fejl kastes den sidste', () => {
  const a = koer(`(async () => { global.__fejl = ['page.goto: Timeout 30000ms exceeded'];
    const pw = require('playwright'); const p = await (await pw.chromium.launch()).newPage();
    try { await p.goto('http://x'); } catch (e) { console.log('fejl=' + e.message + ' kald=' + pw.__kald()); } })();`);
  assert.match(a.ud, /fejl=page\.goto: Timeout 30000ms exceeded kald=1/);
  const b = koer(`(async () => { global.__fejl = ['net::ERR_NO_BUFFER_SPACE', 'net::ERR_NO_BUFFER_SPACE', 'net::ERR_NO_BUFFER_SPACE'];
    const pw = require('playwright'); const p = await (await pw.chromium.launch()).newPage();
    try { await p.goto('http://x'); } catch (e) { console.log('fejl=' + e.message + ' kald=' + pw.__kald()); } })();`);
  assert.match(b.ud, /fejl=net::ERR_NO_BUFFER_SPACE kald=3/);
});

test('BB_TEST_UDEN_GENFORSOEG=1 slår genforsøget fra', () => {
  const r = koer(`(async () => { global.__fejl = ['net::ERR_NO_BUFFER_SPACE'];
    const pw = require('playwright'); const p = await (await pw.chromium.launch()).newPage();
    try { await p.goto('http://x'); } catch (e) { console.log('fejl kald=' + pw.__kald()); } })();`, { BB_TEST_UDEN_GENFORSOEG: '1' });
  assert.match(r.ud, /fejl kald=1/);
});

test('package.json: "test" starter node med preload og begrænset samtidighed', () => {
  const t = require('../package.json').scripts.test;
  assert.match(t, /--require \.\/scripts\/test-preload\.js/);
  assert.match(t, /--test-concurrency=\d+/);
});
