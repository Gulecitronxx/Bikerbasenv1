/* V6 marked (Critic P2-5): anonym "Gemte annoncer" må ikke sige "Ingen gemte annoncer", mens headeren siger "Favoritter 2".
   Egne uuid-favoritter (private sælgere) kræver login og kan ikke vises for en anonym; indekserede favoritter (kun denne browser) vises.
   Tælleren i headeren, tallene på siden og listen skal passe sammen. Browsertest mod lagerfixturen, intet netværk, springes over uden Playwright.
   Kør: node --test js/v6-marked-favoritter.test.js — V6_ROD=<mappe> måler en anden kopi (fx før-versionen). */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const REPO = path.join(__dirname, '..');
const sb = require(path.join(REPO, 'scripts', 'smoke-browser.js'));
const { lagerRaekker } = require(path.join(REPO, 'scripts', 'fixtures', 'v5-soegning-lager.js'));
const EXT = lagerRaekker()[1].id;                         // en indekseret annonce
const EGEN = 'aaaaaaaa-1111-4222-8333-444444444444';      // en privat sælgers annonce (uuid), kræver login
const EGEN2 = 'bbbbbbbb-1111-4222-8333-444444444444';

let H = null;
test.before(async () => {
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) { console.log(`# v6-marked-favoritter.test: SKIPPER (${kan.grund})`); return; }
  const { server, port } = await sb.startServer(process.env.V6_ROD || REPO);
  H = { server, port, browser: await kan.pw.chromium.launch({ headless: true }) };
});
test.after(async () => { if (H) { await H.browser.close(); H.server.close(); } });

async function aabn({ ext = [], egne = [], w = 1440, tema = 'light' }){
  const c = await H.browser.newContext({ viewport: { width: w, height: 1100 }, locale: 'da-DK', colorScheme: tema, serviceWorkers: 'block' });
  await c.addInitScript(sb.initScript, { tema });
  await c.addInitScript(([e, g]) => {
    try {
      if (sessionStorage.getItem('__seed')) return;
      sessionStorage.setItem('__seed', '1');
      if (e.length) localStorage.setItem('bb_favorites_ext', JSON.stringify(e));
      if (g.length) localStorage.setItem('bb_favorites', JSON.stringify(g));
    } catch (x) { /* ingen lagring */ }
  }, [ext, egne]);
  await sb.installerMock(c, H.port, {}, { restSvar: sb.lagerSvar });
  const skriv = [];
  c.on('request', r => { try { const u = new URL(r.url()); if (/supabase\.co$/.test(u.hostname) && !/^(GET|OPTIONS|HEAD)$/.test(r.method())) skriv.push(`${r.method()} ${u.pathname}`); } catch (e) { /* url */ } });
  const p = await c.newPage();
  const fejl = []; p.on('pageerror', e => fejl.push(e.message));
  await p.goto(`http://127.0.0.1:${H.port}/mine-annoncer.html?tab=favoritter`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  return { c, p, fejl, skriv };
}
const MAAL = () => {
  const syn = e => !!e && getComputedStyle(e).display !== 'none' && !e.hidden && e.getBoundingClientRect().height > 0;
  const tom = document.getElementById('fav-empty'), note = document.getElementById('db-anon-egne');
  return {
    header: [...document.querySelectorAll('[data-fav-count]')].map(e => e.textContent.trim()),
    stat: document.getElementById('stat-fav').textContent.trim(), inline: document.getElementById('fav-count-inline').textContent.trim(),
    kort: document.querySelectorAll('#fav-grid > *').length,
    tomVist: syn(tom), tomH: tom.querySelector('h3').textContent.trim(), tomP: tom.querySelector('p').textContent.trim(),
    tomKnap: tom.querySelector('a.btn').textContent.trim(), tomHref: tom.querySelector('a.btn').getAttribute('href'),
    noteVist: syn(note), note: note.textContent.trim(), over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};

for (const w of [375, 1440]) {
  test(`${w}: anonym med 1 indekseret + 1 egen (uuid) favorit: headeren siger 2, listen viser 1 kort, resten kræver login`, { timeout: 60000 }, async t => {
    if (!H) return t.skip('Playwright mangler');
    const { c, p, fejl, skriv } = await aabn({ ext: [EXT], egne: [EGEN], w });
    try {
      const m = await p.evaluate(MAAL);
      assert.ok(m.header.length >= 1 && m.header.every(x => x === '2'), `headeren: ${m.header}`);
      assert.strictEqual(m.kort, 1, 'ét kort kan vises');
      assert.strictEqual(m.stat, '2');
      assert.strictEqual(m.inline, '2');
      assert.strictEqual(m.tomVist, false, 'ingen tom tilstand, når der er et kort');
      assert.strictEqual(m.noteVist, true);
      assert.match(m.note, /1 gemt annonce fra private sælgere/);
      assert.strictEqual(m.over, 0);
      assert.deepStrictEqual(fejl, []);
      assert.deepStrictEqual(skriv, [], 'intet skrives til databasen');
    } finally { await c.close(); }
  });
}

test('anonym med KUN egne (uuid) favoritter: "N gemte annoncer kræver login" + login-knap, ikke "Ingen gemte annoncer"; headeren og siden har samme tal', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  for (const [egne, h3] of [[[EGEN], '1 gemt annonce kræver login'], [[EGEN, EGEN2], '2 gemte annoncer kræver login']]) {
    const { c, p, skriv } = await aabn({ egne });
    try {
      const m = await p.evaluate(MAAL);
      assert.strictEqual(m.tomVist, true);
      assert.strictEqual(m.tomH, h3);
      assert.ok(!/Ingen gemte annoncer/.test(m.tomH));
      assert.match(m.tomP, /private sælgere/);
      assert.strictEqual(m.tomKnap, 'Log ind');
      assert.match(m.tomHref, /^login\.html\?redirect=/);
      assert.strictEqual(m.noteVist, false, 'noten gentager ikke det, den tomme tilstand siger');
      assert.ok(m.header.every(x => x === String(egne.length)), `headeren: ${m.header}`);
      assert.strictEqual(m.stat, String(egne.length));
      assert.strictEqual(m.inline, String(egne.length));
      assert.strictEqual(m.kort, 0);
      assert.deepStrictEqual(await p.evaluate(() => JSON.parse(localStorage.getItem('bb_favorites'))), egne, 'ikke ryddet');
      assert.deepStrictEqual(skriv, []);
    } finally { await c.close(); }
  }
});

test('anonym uden favoritter: uændret "Ingen gemte annoncer" med søgeknap; kun indekserede: viser dem uden login-tekst', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  let { c, p } = await aabn({});
  try {
    const m = await p.evaluate(MAAL);
    assert.strictEqual(m.tomVist, true);
    assert.strictEqual(m.tomH, 'Ingen gemte annoncer');
    assert.strictEqual(m.tomKnap, 'Søg motorcykler');
    assert.strictEqual(m.tomHref, 'soegning.html');
    assert.strictEqual(m.noteVist, false);
    assert.ok(m.header.every(x => x === '0'), `${m.header}`);
    assert.strictEqual(m.stat, '0');
  } finally { await c.close(); }
  ({ c, p } = await aabn({ ext: [EXT] }));
  try {
    const m = await p.evaluate(MAAL);
    assert.strictEqual(m.tomVist, false);
    assert.strictEqual(m.kort, 1);
    assert.strictEqual(m.noteVist, false);
    assert.ok(m.header.every(x => x === '1'));
    assert.strictEqual(m.stat, '1');
    assert.strictEqual(m.inline, '1');
  } finally { await c.close(); }
});

test('fjernes den sidste indekserede favorit, mens en egen kræver login, skifter siden til "1 gemt annonce kræver login", og tallene følger med', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const { c, p } = await aabn({ ext: [EXT], egne: [EGEN] });
  try {
    await p.click('#fav-grid [data-fav-toggle], #fav-grid .fav-btn, #fav-grid [data-remove-fav], #fav-grid button');
    await p.waitForTimeout(500);
    const m = await p.evaluate(MAAL);
    assert.strictEqual(m.kort, 0);
    assert.strictEqual(m.tomH, '1 gemt annonce kræver login');
    assert.ok(m.header.every(x => x === '1'), `${m.header}`);
    assert.strictEqual(m.stat, '1');
  } finally { await c.close(); }
});
