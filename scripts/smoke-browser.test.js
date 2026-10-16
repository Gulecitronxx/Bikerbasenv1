/* Låser scripts/smoke-browser.js: hvert tjek skal KUNNE fejle (fixture-sider med et bevidst problem i en
   temp-mappe) og en ren side skal være grøn. Rører hverken netværk eller repoets egne sider.
   Kræver Playwright + Chromium; ellers SKIPPES testene med en tydelig besked (ikke en grøn løgn om dækning). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const sb = require('./smoke-browser');

const SCRIPT = path.join(__dirname, 'smoke-browser.js');
const side = (body, { head = '', titel = 'Test' } = {}) =>
  `<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titel}</title>${head}</head><body><main>${body}</main></body></html>`;
const H1 = '<h1>Overskrift</h1>';
const GIF = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

/* Siderne hedder som hurtig-udvalget (index, soegning, annonce, maerker, maerke-honda, type-cruiser, login, guides),
   så --hurtig rammer præcis dem; resten køres med --sider. */
const SIDER = {
  'index.html': side(H1 + `<p>Pris: 12.000 kr.</p><p hidden>NaN</p><img src="${GIF}" alt=""><a href="index.html">selv</a>`),
  'soegning.html': side(H1 + '<div style="width:2000px;height:20px;background:#ccc">bred</div>'),
  'annonce.html': side(H1 + '<p id="pris"></p><script>document.getElementById("pris").textContent = "Pris: " + (Number("abc") / 2) + " kr";</script>'),
  'maerker.html': side(H1 + '<script>console.error("bevidst konsolfejl");</script>'),
  'maerke-honda.html': side(H1 + '<script>setTimeout(function(){ throw new Error("bevidst sidefejl"); }, 10);</script>'),
  'type-cruiser.html': side(H1 + '<h1>Nummer to</h1>'),
  'login.html': side(H1 + `<img src="${GIF}">`),
  'guides.html': side(H1 + '<a href="findes-ikke.html">dødt</a>'),
  // kun med --sider:
  'cls.html': side(H1 + '<div id="indhold" style="height:600px;background:#eee">Indhold</div><script>setTimeout(function(){ var d=document.createElement("div"); d.style.height="300px"; d.textContent="indsat"; document.querySelector("main").insertBefore(d, document.getElementById("indhold")); }, 600);</script>'),
  'csp.html': side(H1 + '<script>window.x = 1;</script>', { head: '<meta http-equiv="Content-Security-Policy" content="script-src \'self\'">' }),
  'tap.html': side(H1 + '<button style="width:10px;height:10px;padding:0;border:0" aria-label="lille"></button>'),
  'ressource.html': side(H1 + '<img src="mangler.png" alt="x">'),
  'anker.html': side(H1 + '<a href="#findes-ikke">anker</a>'),
};

let rod, kan;
test.before(async () => {
  rod = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-'));
  for (const [f, html] of Object.entries(SIDER)) fs.writeFileSync(path.join(rod, f), html);
  kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) console.log(`# smoke-browser.test: SKIPPER browsertestene (${kan.grund})`);
});
test.after(() => { fs.rmSync(rod, { recursive: true, force: true }); });

function koerCli(args){
  const rapportFil = path.join(rod, `rapport-${Math.random().toString(36).slice(2)}.json`);
  const udFil = rapportFil + '.log';
  const fd = fs.openSync(udFil, 'w');   // fil i stedet for pipe: en forældreløs Chromium kan ikke holde spawnSync fanget
  const r = spawnSync(process.execPath, [SCRIPT, '--rod', rod, '--rapport', rapportFil, '--stille', ...args], { stdio: ['ignore', fd, fd], timeout: 170000 });
  fs.closeSync(fd);
  r.stdout = fs.readFileSync(udFil, 'utf8'); r.stderr = '';
  const rapport = fs.existsSync(rapportFil) ? JSON.parse(fs.readFileSync(rapportFil, 'utf8')) : null;
  return { status: r.status, ud: r.stdout + r.stderr, rapport };
}
const tjekPaa = (rapport, s) => new Set(rapport.fund.filter(f => f.side === s).map(f => f.tjek));

test('--hurtig: 8 sider, 390+1440, lys; hvert tjek fanger sin side, og den rene side er grøn', { timeout: 180000 }, t => {
  if (!kan.ok) return t.skip(kan.grund);
  const { status, rapport, ud } = koerCli(['--hurtig']);
  assert.ok(rapport, ud);
  assert.strictEqual(status, 1, 'fund på fejlniveau giver exit 1');
  assert.strictEqual(rapport.antalMaalinger, 16, '8 sider × 2 viewports × 1 tema');
  assert.deepStrictEqual(rapport.indstillinger.viewports, [390, 1440]);
  assert.deepStrictEqual(rapport.indstillinger.temaer, ['lys']);

  assert.deepStrictEqual([...tjekPaa(rapport, 'index.html')], [], 'ren side (skjult NaN, alt="", selv-link) giver ingen fund');
  assert.ok(tjekPaa(rapport, 'soegning.html').has('overflow'), 'overflow');
  assert.ok(tjekPaa(rapport, 'annonce.html').has('tekst-null'), 'NaN i synlig tekst');
  assert.ok(tjekPaa(rapport, 'maerker.html').has('konsolfejl'), 'konsolfejl');
  assert.ok(tjekPaa(rapport, 'maerke-honda.html').has('sidefejl'), 'sidefejl');
  assert.ok(tjekPaa(rapport, 'type-cruiser.html').has('h1'), 'to h1');
  assert.ok(tjekPaa(rapport, 'login.html').has('alt-mangler'), 'billede uden alt');
  assert.ok(tjekPaa(rapport, 'guides.html').has('dødt-link'), 'dødt internt link');
  const overflow = rapport.fund.find(f => f.tjek === 'overflow');
  assert.match(overflow.detalje, /scrollWidth/);
  assert.deepStrictEqual(rapport.fund.filter(f => f.tjek === 'overflow').map(f => f.viewport).sort((a, b) => a - b), [390, 1440], 'målt pr. viewport');
  assert.ok(Object.keys(rapport.sammenfatning.perTjek).length >= 7);
});

test('CLS, CSP-script, ressource-404, tap-mål og anker fanges med --sider', { timeout: 180000 }, t => {
  if (!kan.ok) return t.skip(kan.grund);
  const { rapport, ud } = koerCli(['--sider', 'cls,csp,tap,ressource,anker', '--viewports', '390', '--temaer', 'lys,mørk']);
  assert.ok(rapport, ud);
  assert.strictEqual(rapport.antalMaalinger, 10);
  assert.ok(tjekPaa(rapport, 'cls.html').has('cls'), 'layout-shift over tærsklen');
  assert.ok(tjekPaa(rapport, 'csp.html').has('csp-script'), 'CSP blokerer inline-script');
  assert.ok(tjekPaa(rapport, 'ressource.html').has('ressource-404'), 'lokal 404 på billede');
  assert.ok(tjekPaa(rapport, 'tap.html').has('tap-mål'), 'tap-mål under 24 px');
  assert.ok(tjekPaa(rapport, 'anker.html').has('anker-mangler'), 'anker uden mål');
  assert.ok(rapport.fund.some(f => f.side === 'cls.html' && f.tema === 'mørk'), 'mørkt tema måles også');
});

test('CLS-tærsklen er konfigurerbar; advarsler fejler kun med --strikt; ren side giver exit 0', { timeout: 180000 }, t => {
  if (!kan.ok) return t.skip(kan.grund);
  const slap = koerCli(['--sider', 'cls', '--viewports', '390', '--cls', '5']);
  assert.strictEqual(slap.status, 0, 'CLS under en høj tærskel er ikke et fund');
  assert.ok(slap.rapport.maalinger[0].cls > 0.05, 'CLS er målt, bare under tærsklen');

  const adv = koerCli(['--sider', 'tap', '--viewports', '390', '--temaer', 'lys']);
  assert.strictEqual(adv.status, 0, 'tap-mål er kun en advarsel');
  assert.strictEqual(adv.rapport.sammenfatning.advarsler, 1);
  assert.strictEqual(koerCli(['--sider', 'tap', '--viewports', '390', '--temaer', 'lys', '--strikt']).status, 1);

  const ren = koerCli(['--sider', 'index', '--viewports', '320,1440']);
  assert.strictEqual(ren.status, 0, ren.ud);
  assert.strictEqual(ren.rapport.sammenfatning.fejl, 0);
  assert.strictEqual(ren.rapport.antalMaalinger, 4, '1 side × 2 viewports × lys+mørk');
});

test('sidevalg: mønster med * og .html; ukendt tema giver exit 2', t => {
  assert.deepStrictEqual(sb.vaelgSider(rod, { sider: ['ma*', 'login.html'] }).sort(), ['login.html', 'maerke-honda.html', 'maerker.html']);
  assert.strictEqual(sb.vaelgSider(rod, { hurtig: true }).length, 8);
  if (!kan.ok) return t.skip(kan.grund);
  const r = spawnSync(process.execPath, [SCRIPT, '--rod', rod, '--hurtig', '--temaer', 'pink'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 2);
});

test('fixtures: mindst 40 annoncer med ekstern kilde, 48-49 hk, manglende pris/foto og komma i model', () => {
  const r = require('./smoke-fixtures').eksterneRaekker();
  assert.ok(r.length >= 40);
  assert.ok(new Set(r.map(x => x.kilde.domaene)).size >= 3);
  assert.ok(r.some(x => x.hk === 48) && r.some(x => x.hk === 49));
  assert.ok(r.some(x => x.pris_dkk == null) && r.some(x => x.thumbnail_url == null));
  assert.ok(r.some(x => /,/.test(x.model)));
  assert.strictEqual(new Set(r.map(x => x.id)).size, r.length, 'unikke id');
});
