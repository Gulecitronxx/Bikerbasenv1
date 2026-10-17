/* Låser scripts/a11y-tjek.js: hvert tjek skal KUNNE fejle (fixture-sider med ÉN bevidst fejl i en temp-mappe), og en
   ren side skal give 0 fund. Rører hverken netværk eller repoets egne sider.
   Kræver Playwright + Chromium; ellers SKIPPES testene med en tydelig besked. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const smoke = require('./smoke-browser');
const a11y = require('./a11y-tjek');

const SCRIPT = path.join(__dirname, 'a11y-tjek.js');

const STIL = `<style>
body{font:16px/1.5 Arial,sans-serif;color:#111;background:#fff;margin:0;padding:8px}
a{color:#0033aa} a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #0033aa;outline-offset:2px}
.skip{position:absolute;left:-999px;top:0} .skip:focus{left:8px;top:8px;background:#fff;padding:8px}
button{min-height:44px;min-width:44px;padding:8px 16px;font:inherit} input{min-height:44px;border:2px solid #555;background:#fff;font:inherit;padding:4px 8px}
</style>`;

/* Hele siden med en placeholder; "ekstra" lander i <main> efter den rene grundstamme. */
const side = (ekstra = '', { head = '' } = {}) => `<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Testside</title>${STIL}${head}</head>
<body><a class="skip" href="#main">Spring til indhold</a>
<header><nav aria-label="Hovednavigation"><a href="ren.html">Forside</a> <a href="andet.html">Andet</a></nav></header>
<main id="main"><h1>Hovedoverskrift</h1><h2>Underoverskrift</h2><p>Brødtekst med god kontrast.</p>
<form onsubmit="return false"><label for="navn">Navn</label> <input id="navn" name="navn" autocomplete="name"> <button type="submit">Send</button></form>
<div id="fejl" role="alert"></div>${ekstra}</main>
<footer><p>Sidefod</p></footer></body></html>`;

const REN_DIALOG = `<button type="button" id="aaben" aria-haspopup="dialog">Åbn dialog</button>
<dialog id="dlg" aria-label="Eksempel"><p>Indhold</p><button type="button" id="luk">Luk</button></dialog>
<script>document.getElementById('aaben').addEventListener('click',function(){document.getElementById('dlg').showModal();});document.getElementById('luk').addEventListener('click',function(){document.getElementById('dlg').close();});</script>`;

const SIDER = {
  'ren.html': side(REN_DIALOG),
  'knap.html': side('<button type="button" id="ikon"><svg width="20" height="20" viewBox="0 0 20 20"><path d="M2 2h16v16H2z"/></svg></button>'),
  'felt.html': side('<div><input id="uden" name="uden" type="text"></div>'),
  'dublet.html': side('<p id="d">En</p><p id="d">To</p>'),
  'spring.html': side('<h4>Spring fra h2 til h4</h4>'),
  'kontrast.html': side('<p style="color:#aaaaaa">Lys grå tekst på hvid</p>'),
  'faelde.html': side('<input id="fal" name="fal" aria-label="Fælde"><script>document.getElementById("fal").addEventListener("keydown",function(e){if(e.key==="Tab"){e.preventDefault();}});</script>'),
  'modal.html': side(`<button type="button" id="aaben2" aria-expanded="false" aria-controls="mod">Åbn</button>
<div id="mod" role="dialog" aria-label="Uden Escape" hidden style="position:fixed;inset:0;background:#fff;padding:20px"><button type="button" id="luk2">Luk</button></div>
<script>var b=document.getElementById('aaben2'),m=document.getElementById('mod');b.addEventListener('click',function(){m.hidden=false;b.setAttribute('aria-expanded','true');document.getElementById('luk2').focus();});document.getElementById('luk2').addEventListener('click',function(){m.hidden=true;b.setAttribute('aria-expanded','false');b.focus();});</script>`),
  'billede.html': side('<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width="40" height="40">'),
  'tap.html': side('<a href="ren.html" style="display:inline-block;width:10px;height:10px;background:#036" aria-label="lille"></a>'),
  'live.html': side('<div class="form-error" id="fejl2"></div>'),
  'fokus.html': side('<button type="button" id="nul" style="outline:none">Uden fokusring</button>', { head: '<style>#nul:focus-visible{outline:none !important}</style>' }),
};

let rod, kan, rapport;
test.before(async () => {
  rod = fs.mkdtempSync(path.join(os.tmpdir(), 'a11y-'));
  for (const [f, html] of Object.entries(SIDER)) fs.writeFileSync(path.join(rod, f), html);
  kan = await smoke.playwrightTilgaengelig();
  if (!kan.ok) { console.log(`# a11y-tjek.test: SKIPPER browsertestene (${kan.grund})`); return; }
  rapport = await a11y.koer({ rod, pw: kan.pw, viewports: [390], temaer: ['lys'], udenReflow: true, udenBevaegelse: true, stille: true, parallel: 2 });
});
test.after(() => { fs.rmSync(rod, { recursive: true, force: true }); });

const regler = s => new Set(rapport.fund.filter(f => f.side === s && f.prio !== 'U').map(f => f.regel));

test('ren side: 0 fund (inkl. native dialog med fokusfang, Escape og fokus-retur)', { timeout: 180000 }, t => {
  if (!kan.ok) return t.skip(kan.grund);
  assert.deepStrictEqual(rapport.fund.filter(f => f.side === 'ren.html'), [], 'ren side må ikke give fund');
});

const KRAV = [
  ['knap.html', 'knap-navn', 'ikon-knap uden navn'],
  ['felt.html', 'felt-navn', 'input uden label'],
  ['dublet.html', 'dublet-id', 'dubleret id'],
  ['spring.html', 'overskrift-spring', 'h2 → h4'],
  ['kontrast.html', 'kontrast', 'lav kontrast'],
  ['faelde.html', 'tastaturfaelde', 'fokusfælde'],
  ['modal.html', 'modal-escape', 'dialog uden Escape'],
  ['billede.html', 'billede-alt', 'billede uden alt'],
  ['tap.html', 'tap-maal', 'tap-mål under 24 px'],
  ['live.html', 'live-region', 'fejlbeholder uden role=alert'],
  ['fokus.html', 'fokus-usynlig', 'fjernet fokusring'],
];
for (const [fil, regel, tekst] of KRAV){
  test(`${tekst} fanges som ${regel}`, t => {
    if (!kan.ok) return t.skip(kan.grund);
    assert.ok(regler(fil).has(regel), `${fil} skulle give ${regel}; gav: ${[...regler(fil)].join(', ') || '(intet)'}`);
  });
}

test('fejlsiderne udløser kun deres egen regel (ingen krydsløb mellem fixtures)', t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const [fil, regel] of KRAV){
    const ekstra = [...regler(fil)].filter(r => r !== regel && !(fil === 'modal.html' && /^modal-|^aria-/.test(r)));
    assert.deepStrictEqual(ekstra, [], `${fil} gav uventede regler: ${ekstra.join(', ')}`);
  }
});

test('rapport: prioritet, mønstre og markdown', t => {
  if (!kan.ok) return t.skip(kan.grund);
  const f = rapport.fund.find(x => x.side === 'knap.html' && x.regel === 'knap-navn');
  assert.strictEqual(f.prio, 'P1');
  assert.strictEqual(f.familie, 'tekstside');
  assert.ok(rapport.sammenfatning.P1.moenstre >= 1);
  const md = a11y.markdown(rapport);
  assert.match(md, /## P1 · knap-navn/);
  assert.match(md, /Forslag:/);
  assert.match(a11y.tabel(rapport), /knap-navn/);
});

test('--strikt: exit 1 over tærskel, 0 på ren side', { timeout: 170000 }, t => {
  if (!kan.ok) return t.skip(kan.grund);
  const kor = args => {
    const fd = fs.openSync(path.join(rod, 'cli.log'), 'w');
    const r = spawnSync(process.execPath, [SCRIPT, '--rod', rod, '--stille', '--viewports', '390', '--temaer', 'lys', '--uden-reflow', '--uden-bevaegelse', '--uden-overlay', ...args], { stdio: ['ignore', fd, fd], timeout: 150000 });
    fs.closeSync(fd);
    return r.status;
  };
  assert.strictEqual(kor(['--strikt', '--sider', 'knap']), 1, 'P1-fund giver exit 1');
  assert.strictEqual(kor(['--strikt', '--sider', 'ren']), 0, 'ren side er grøn');
});

test('overTaerskel og familie', () => {
  const r = { sammenfatning: { P1: { moenstre: 2 }, P2: { moenstre: 0 }, P3: { moenstre: 9 } } };
  assert.deepStrictEqual(a11y.overTaerskel(r, {}), ['P1']);
  assert.deepStrictEqual(a11y.overTaerskel(r, { maksP1: 2, maksP3: 3 }), ['P3']);
  assert.strictEqual(a11y.familie('maerke-honda.html'), 'maerke');
  assert.strictEqual(a11y.familie('index.html'), 'forside');
  assert.strictEqual(a11y.familie('afmeld.html'), 'tekstside');
});
