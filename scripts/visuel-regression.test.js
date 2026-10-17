/* Låser scripts/visuel-regression.js: værktøjet skal fange en bevidst ændring (farve, placering), IKKE fange to
   identiske kørsler (determinisme: Date/Math.random er frosset), og PNG-/diff-kernen skal virke uden browser.
   Browser-testene kræver Playwright + Chromium; ellers SKIPPES de med en tydelig besked. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const vr = require('./visuel-regression');
const sb = require('./smoke-browser');

const SCRIPT = path.join(__dirname, 'visuel-regression.js');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'vr-test-'));
const side = (body, extra = '') => `<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>T</title><style>body{margin:0;font:16px sans-serif}${extra}</style></head><body>${body}</body></html>`;
const BOKS = (farve, left) => side('<h1>Test</h1><div class="b"></div><p id="d"></p><script>document.getElementById("d").textContent = new Date().toISOString() + " " + Math.random();</script>',
  `.b{position:relative;left:${left}px;width:200px;height:300px;background:${farve}}`);
const site = (html) => { const d = tmp(); fs.writeFileSync(path.join(d, 'index.html'), html); return d; };
const OPT = (rod, ud) => ({ rod, ud, sider: ['index'], viewports: [390], temaer: ['lys'], stille: true, tid: 15000 });

/* ---------- uden browser ---------- */

test('PNG-rundtur: enkod → dekod giver samme pixels', () => {
  const w = 5, h = 4, data = Buffer.alloc(w * h * 4);
  for (let i = 0; i < data.length; i++) data[i] = (i * 37 + 11) & 255;
  const ud = vr.dekodPng(vr.enkodPng({ w, h, data }));
  assert.strictEqual(ud.w, w); assert.strictEqual(ud.h, h);
  assert.ok(ud.data.equals(data));
});

test('diffBilleder: identiske = 0 %, ændret firkant = præcis andel, størrelsesforskel tæller som ændret', () => {
  const lav = (w, h, rgb) => { const d = Buffer.alloc(w * h * 4); for (let i = 0; i < w * h; i++){ d[i * 4] = rgb[0]; d[i * 4 + 1] = rgb[1]; d[i * 4 + 2] = rgb[2]; d[i * 4 + 3] = 255; } return { w, h, data: d }; };
  const a = lav(10, 10, [255, 255, 255]);
  assert.strictEqual(vr.diffBilleder(a, lav(10, 10, [255, 255, 255])).pct, 0);
  const b = lav(10, 10, [255, 255, 255]);
  for (let y = 0; y < 5; y++) for (let x = 0; x < 10; x++){ b.data[(y * 10 + x) * 4] = 0; }
  assert.strictEqual(vr.diffBilleder(a, b).pct, 50);
  assert.strictEqual(vr.diffBilleder(a, lav(10, 20, [255, 255, 255])).pct, 50);
  const stoej = lav(10, 10, [250, 255, 255]);
  assert.strictEqual(vr.diffBilleder(a, stoej, { tolerance: 8 }).pct, 0, 'anti-aliasing-støj under tolerancen ignoreres');
});

test('sammenlignMapper + CLI: --sammenlign giver exit 1 over grænsen, 0 under, og skriver diff.html + diff-PNG', () => {
  const lav = (rgb, dir) => {
    fs.mkdirSync(dir, { recursive: true });
    const d = Buffer.alloc(20 * 20 * 4);
    for (let i = 0; i < 400; i++){ d[i * 4] = rgb[0]; d[i * 4 + 1] = rgb[1]; d[i * 4 + 2] = rgb[2]; d[i * 4 + 3] = 255; }
    fs.writeFileSync(path.join(dir, 'x__390__lys.png'), vr.enkodPng({ w: 20, h: 20, data: d }));
  };
  const rod = tmp(), a = path.join(rod, 'a'), b = path.join(rod, 'b'), c = path.join(rod, 'c');
  lav([255, 255, 255], a); lav([255, 255, 255], b); lav([0, 0, 0], c);
  const lig = spawnSync(process.execPath, [SCRIPT, '--sammenlign', b, a], { encoding: 'utf8' });
  assert.strictEqual(lig.status, 0, lig.stdout + lig.stderr);
  const forskel = spawnSync(process.execPath, [SCRIPT, '--sammenlign', c, a], { encoding: 'utf8' });
  assert.strictEqual(forskel.status, 1, forskel.stdout + forskel.stderr);
  assert.match(forskel.stdout, /100\.00 %.*x\s+390\s+lys.*OVER/);
  assert.ok(fs.existsSync(path.join(c, 'diff.html')) && fs.existsSync(path.join(c, 'diff', 'x__390__lys.png')));
  assert.match(fs.readFileSync(path.join(c, 'diff.html'), 'utf8'), /før \(baseline\)/);
});

/* ---------- med browser ---------- */

let klar = null;
async function browserKlar(t){
  if (klar === null) klar = await sb.playwrightTilgaengelig();
  if (!klar.ok){ t.skip(`SKIPPET: ${klar.grund}`); return false; }
  return true;
}

test('determinisme: to kørsler af samme side (Date + Math.random på siden) giver 0 % forskel', async t => {
  if (!await browserKlar(t)) return;
  const rod = site(BOKS('#c33', 0)), u = tmp();
  await vr.tagSkaermbilleder(OPT(rod, path.join(u, 'a')));
  await vr.tagSkaermbilleder(OPT(rod, path.join(u, 'b')));
  const r = vr.sammenlignMapper(path.join(u, 'b'), path.join(u, 'a'), { graense: 2 });
  assert.strictEqual(r.raekker.length, 1);
  assert.strictEqual(r.raekker[0].pct, 0, 'tid/random skal være frosset');
  assert.strictEqual(r.fejl, 0);
});

test('fanger bevidst farveændring og placeringsændring (over grænsen), og skriver diff + HTML', async t => {
  if (!await browserKlar(t)) return;
  const u = tmp();
  await vr.tagSkaermbilleder(OPT(site(BOKS('#c33', 0)), path.join(u, 'base')));
  await vr.tagSkaermbilleder(OPT(site(BOKS('#33c', 0)), path.join(u, 'farve')));
  await vr.tagSkaermbilleder(OPT(site(BOKS('#c33', 150)), path.join(u, 'flyt')));
  const farve = vr.sammenlignMapper(path.join(u, 'farve'), path.join(u, 'base'), { graense: 2 });
  assert.ok(farve.raekker[0].pct > 2, `farveændring skal være over 2 % (var ${farve.raekker[0].pct})`);
  assert.strictEqual(farve.fejl, 1);
  assert.ok(fs.existsSync(path.join(u, 'farve', 'diff', 'index__390__lys.png')));
  assert.match(fs.readFileSync(path.join(u, 'farve', 'diff.html'), 'utf8'), /index/);
  const flyt = vr.sammenlignMapper(path.join(u, 'flyt'), path.join(u, 'base'), { graense: 2 });
  assert.ok(flyt.raekker[0].pct > 2, `placeringsændring skal være over 2 % (var ${flyt.raekker[0].pct})`);
  assert.ok(flyt.raekker[0].bbox && flyt.raekker[0].bbox.w > 0);
});
