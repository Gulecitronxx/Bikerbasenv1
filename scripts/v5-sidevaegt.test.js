/* V5 sidevægts- og data.js-vagt: låser scripts/v5-sidevaegt.js.
   - Den nuværende build ligger inden for scripts/v5-sidevaegt.budget.json (js/data.js, alle js/css-filer, alle sider).
   - Vagten KAN fejle: en opblæst js/data.js, en ny stor fil og en side, der peger på en manglende fil, opdages i en kopi.
   - Browser: målt overførsel (Chromium, fixtures) for de tunge sider ligger inden for budget (springes over uden Playwright).
   Hæves budgettet bevidst: node scripts/v5-sidevaegt.js --gem-budget (og skriv hvorfor i commit-beskeden). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const V = require('./v5-sidevaegt.js');
const sb = require('./smoke-browser.js');

const REPO = path.join(__dirname, '..');
const kopierStatisk = () => {
  const rod = fs.mkdtempSync(path.join(os.tmpdir(), 'v5-vaegt-'));
  for (const f of fs.readdirSync(REPO)) if (/\.html$/.test(f)) fs.copyFileSync(path.join(REPO, f), path.join(rod, f));
  for (const m of ['js', 'css', 'fonts']) fs.cpSync(path.join(REPO, m), path.join(rod, m), { recursive: true });
  return rod;
};
/* Tilfældige bytes kan ikke gzippes: præcis N bytes ekstra i gzip-størrelsen. */
const stoej = n => crypto.randomBytes(n).toString('base64').slice(0, n);

test('js/data.js og alle js/css-filer ligger inden for gzip-budgettet', async () => {
  const r = await V.koer({});
  const fejl = r.fund.filter(f => f.niveau === 'fejl' && /fil|budget/.test(f.tjek) && !/^side|^browser/.test(f.tjek));
  assert.deepStrictEqual(fejl, [], JSON.stringify(fejl.slice(0, 5)));
  assert.ok(r.dataJs && r.dataJs.gzip > 10000, 'js/data.js skal findes og måles');
});

test('alle sider ligger inden for sidebudgettet, og ingen side peger på en manglende lokal fil', async () => {
  const r = await V.koer({});
  const fejl = r.fund.filter(f => f.niveau === 'fejl' && /^side/.test(f.tjek));
  assert.deepStrictEqual(fejl, [], JSON.stringify(fejl.slice(0, 5)));
  assert.ok(Object.keys(r.maal.sider).length >= 60, 'mange sider måles: ' + Object.keys(r.maal.sider).length);
});

test('budgettet er ikke tomt og ikke absurd løst (højst 25 % luft over målingen for js/data.js og tunge sider)', async () => {
  const r = await V.koer({});
  const b = r.budget;
  assert.ok(b && b.filer['js/data.js'], 'budget for js/data.js');
  assert.ok(b.filer['js/data.js'] <= r.dataJs.gzip * 1.25, `data.js-budget ${b.filer['js/data.js']} er over 25 % over målingen ${r.dataJs.gzip}`);
  for (const s of r.topSider.slice(0, 5)) assert.ok(b.sider[s.side] <= s.i_alt * 1.25, `${s.side}: budget ${b.sider[s.side]} vs ${s.i_alt}`);
});

test('vagten kan fejle: opblæst js/data.js, ny stor fil og manglende lokal fil opdages', async () => {
  const rod = kopierStatisk();
  try {
    const dataSti = path.join(rod, 'js', 'data.js');
    fs.appendFileSync(dataSti, `\n/* ${stoej(40000)} */\n`);
    fs.writeFileSync(path.join(rod, 'js', 'ny-stor-afhaengighed.js'), `/* ${stoej(30000)} */`);
    const fil = path.join(rod, 'soegning.html');
    fs.writeFileSync(fil, fs.readFileSync(fil, 'utf8').replace('</body>', '<script defer src="js/findes-ikke.js"></script></body>'));
    const r = await V.koer({ rod });
    const navne = new Set(r.fund.map(f => f.tjek));
    for (const forventet of ['fil-over-budget', 'ny-fil-uden-budget', 'side-ressource-mangler'])
      assert.ok(navne.has(forventet), `mangler "${forventet}"; fik ${[...navne].join(', ')}`);
    assert.ok(r.fund.some(f => f.tjek === 'fil-over-budget' && f.hvad === 'js/data.js'), 'js/data.js skal være over budget');
    assert.ok(r.fund.some(f => f.tjek === 'side-over-budget'), 'sider, der indlæser js/data.js, skal være over budget');
  } finally { fs.rmSync(rod, { recursive: true, force: true }); }
});

test('en lille ændring (300 B, under luften) giver ikke et NYT fund i forhold til samme kopi uden ændringen', async () => {
  /* Robust mod baseline: sammenligner med kopiens egne fund, så testen hverken afhænger af budgettets alder eller af andre filers størrelse. */
  const rod = kopierStatisk();
  try {
    const nøgle = f => `${f.tjek}|${f.hvad}`;
    const foer = new Set((await V.koer({ rod })).fund.map(nøgle));
    fs.appendFileSync(path.join(rod, 'js', 'data.js'), `
/* ${stoej(300)} */
`);
    const efter = (await V.koer({ rod })).fund.filter(f => f.niveau === 'fejl').map(nøgle);
    assert.deepStrictEqual(efter.filter(k => !foer.has(k)), [], 'en ændring på 300 B må ikke udløse nye fund');
  } finally { fs.rmSync(rod, { recursive: true, force: true }); }
});

test('browser: målt overførsel for de tunge sider ligger inden for budget (dashboard/mine-annoncer omdirigeres til login, når man ikke er logget ind)', async (t) => {
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) return t.skip(kan.grund);
  const r = await V.koer({ browser: true, pw: kan.pw });
  const fejl = r.fund.filter(f => f.niveau === 'fejl');
  assert.deepStrictEqual(fejl, [], JSON.stringify(fejl.slice(0, 5)));
  const mine = r.maal.browser['mine-annoncer.html'];
  assert.ok(mine && mine.i_alt > 0, 'mine-annoncer.html måles');
  /* Ikke-logget-ind-besøg henter både mine-annoncer og login: målingen skal vise det, i stedet for at lade 2x-tallet være et mysterium. */
  assert.strictEqual(mine.omdirigeret_til, 'login.html');
  /* V6 (F4): en vagt først i <head> sender udloggede væk, FØR dashboard-pakken hentes. Målingen ender derfor på login.html og skal være LIGE SÅ LILLE som login.html
     alene (før: 1019 kB, begge pakker; nu: kun login.html + de 8 kB HTML fra den første side). Se js/v6-konto-vagt.test.js. */
  assert.ok(mine.i_alt >= r.maal.browser['login.html'].i_alt, 'omdirigeringen tæller mindst login-siden');
  assert.strictEqual(mine.kontoPakkeHentet, false, 'kontosidens egen pakke (js/dashboard.js / js/mine-annoncer.js) må ikke hentes af en udlogget besøgende');
  assert.ok(r.maal.browser['dashboard.html'].kontoPakkeHentet === false, 'samme for dashboard.html');
  assert.ok(r.budget.browser['dashboard.html'] < 700000 && r.budget.browser['mine-annoncer.html'] < 700000, 'browser-budgettet for kontosiderne afspejler login-niveauet (< 700 kB), ikke de gamle 1,1 MB');
  assert.ok(mine.i_alt < r.maal.browser['login.html'].i_alt * 1.2, `dashboard-pakken hentes ikke længere før omdirigeringen: ${mine.i_alt} mod ${r.maal.browser['login.html'].i_alt}`);
});
