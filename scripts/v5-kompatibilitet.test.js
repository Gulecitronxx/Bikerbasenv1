/* V5 browserkompatibilitet: låser scripts/v5-kompatibilitet.js.
   - Gulvet (laveste browserversion siden virker i) stiger ikke uden at nogen har besluttet det: nye CSS-/JS-funktioner, der kræver
     nyere end Chrome 111 / Safari 16.4 / Firefox 121 (og ikke er rene forbedringer), får testen til at fejle. Bevidst hævning:
     ret BASIS her og skriv hvorfor i commit-beskeden.
   - Kendt fund: regex-lookbehind i 5 filer kræver Safari 16.4 (parse-fejl dræber filen på iOS <= 16.3). Antallet må ikke vokse.
   - degrader() (simulering af ældre browser) fjerner præcis det, den skal, og intet andet.
   - Browser: siden kører stadig i Chromium med fjernet :has/@container/color-mix/dvh (ingen konsolfejl, ingen sidefejl). */
const test = require('node:test');
const assert = require('node:assert');
const K = require('./v5-kompatibilitet.js');
const sb = require('./smoke-browser.js');

/* Baseline pr. 2026-10 (se docs/review/gauntlet/v5/qa.md). */
const BASIS = { chrome: 111, safari: 16.4, firefox: 121 };
const KENDT_LOOKBEHIND = { forekomster: 7, filer: 5 };

test('gulvet er ikke steget: ingen ny funktion kræver nyere end Chrome 111 / Safari 16.4 / Firefox 121', () => {
  const s = K.scan();
  for (const b of ['chrome', 'safari', 'firefox']) {
    const g = K.versionTal(s.gulv[b].version);
    assert.ok(g <= BASIS[b], `${b}: gulvet er nu ${s.gulv[b].version} (drevet af ${s.gulv[b].drevetAf}), baseline ${BASIS[b]}`);
  }
});

test('vagtliste: ingen brugt funktion hæver gulvet, og ingen funktion uden fallback ligger over baseline', () => {
  const s = K.scan();
  for (const v of s.vagt) {
    for (const b of ['chrome', 'safari', 'firefox']) {
      assert.ok(K.versionTal(v.min[b]) <= BASIS[b], `${v.label} (${v.antal} steder i ${v.filer.join(', ')}) kræver ${b} ${v.min[b]}, over baseline ${BASIS[b]}`);
    }
  }
  /* Alle ikke-progressive brugte funktioner skal have kendte versioner (ingen "nej"/ukendt i tabellen). */
  for (const r of s.brugt.filter(r => r.fallback !== 'progressiv')) for (const b of ['chrome', 'safari', 'firefox']) assert.ok(K.versionTal(r.min[b]) !== Infinity, `${r.label}: ${b} understøtter den slet ikke`);
});

test('kendt: regex-lookbehind (Safari 16.4) er ikke vokset - fjernes den, falder Safari-gulvet til 16.2', () => {
  const s = K.scan();
  const l = s.brugt.find(r => r.id === 'regex-lookbehind');
  const n = l ? l.antal : 0, filer = l ? l.filer.length : 0;
  assert.ok(n <= KENDT_LOOKBEHIND.forekomster && filer <= KENDT_LOOKBEHIND.filer, `lookbehind vokser: ${n} forekomster i ${filer} filer (${l && l.filer.join(', ')}). Kendt: ${KENDT_LOOKBEHIND.forekomster}/${KENDT_LOOKBEHIND.filer}.`);
  if (n === 0) assert.ok(K.versionTal(s.gulv.safari.version) <= 16.2, 'uden lookbehind skal Safari-gulvet være <= 16.2, men er ' + s.gulv.safari.version);
  else assert.ok(K.versionTal(s.gulvUdenLookbehind.safari.version) <= 16.2, 'næste Safari-flaskehals efter lookbehind: ' + s.gulvUdenLookbehind.safari.version);
});

test('scanneren kan fejle: finder funktioner i en fiktiv rod og beregner gulvet', () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const rod = fs.mkdtempSync(path.join(os.tmpdir(), 'v5-kompat-'));
  try {
    fs.mkdirSync(path.join(rod, 'css')); fs.mkdirSync(path.join(rod, 'js'));
    fs.writeFileSync(path.join(rod, 'css', 'a.css'), '.a:has(img){color:red} @scope (.x){a{color:blue}} /* :has(not-counted) */');
    fs.writeFileSync(path.join(rod, 'js', 'a.js'), "const x = [3,1].toSorted(); const re = /(?<=a)b/; // structuredClone i kommentar\n");
    fs.writeFileSync(path.join(rod, 'index.html'), '<!doctype html><div popover>x</div>');
    const s = K.scan(rod);
    const id = new Set(s.brugt.map(r => r.id));
    for (const f of ['css-has', 'css-scope', 'js-tosorted', 'regex-lookbehind', 'html-popover']) assert.ok(id.has(f), `mangler ${f}: ${[...id].join(',')}`);
    assert.ok(!id.has('js-structuredclone'), 'kommentarer skal ikke tælle');
    assert.strictEqual(s.brugt.find(r => r.id === 'css-has').antal, 1);
    assert.ok(K.versionTal(s.gulv.firefox.version) >= 146, 'Firefox-gulv fra @scope: ' + s.gulv.firefox.version);
    assert.ok(s.vagt.length >= 3);
  } finally { fs.rmSync(rod, { recursive: true, force: true }); }
});

test('degrader() fjerner præcis det en ældre browser ville ignorere', () => {
  const css = [
    '.a{color:red}',
    '.b:has(> img){color:blue}',
    '.c:is(.x,.y):has(a){color:green}',
    '@container card (min-width:300px){.d{display:grid}}',
    '.e{background:#fff;background:color-mix(in srgb,red 20%,white);padding:4px}',
    '.f{height:100vh;height:100dvh;margin:0}',
    '@media (min-width:600px){.g:has(b){x:y}.h{background:color-mix(in srgb,red,blue);ok:1}}',
    '.i{background:url("data:image/svg+xml;utf8,<svg xmlns=\'a\'></svg>");color:color-mix(in srgb,red,blue);margin:1px}',
    '@font-face{font-family:X;src:url(a.woff2);font-display:swap}',
    '.j{content:"}:has(";color:red}',
  ].join('\n');
  const u = K.degrader(css, ['has', 'container', 'colormix', 'dvh']);
  assert.ok(/\.a\{color:red\}/.test(u), 'uberørt regel bevares');
  assert.ok(!/\.b:has/.test(u) && !/\.c:is/.test(u), ':has-regler fjernes (også i selektorliste)');
  assert.ok(!/@container/.test(u) && !/\.d\{/.test(u), '@container-blokken fjernes');
  assert.ok(/\.e\{background:#fff;[^}]*padding:4px\}/.test(u) && !/\.e\{[^}]*color-mix/.test(u), 'kun color-mix-deklarationen fjernes');
  assert.ok(/height:100vh/.test(u) && !/100dvh/.test(u) && /margin:0/.test(u), 'dvh-deklarationen fjernes, vh bevares');
  assert.ok(/@media \(min-width:600px\)\{/.test(u) && /\.h\{[^}]*ok:1/.test(u) && !/\.g:has/.test(u) && !/\.h\{[^}]*color-mix/.test(u), 'indlejret @media renses indeni');
  assert.ok(/data:image\/svg\+xml;utf8,<svg/.test(u) && /margin:1px/.test(u) && !/\.i\{[^}]*color-mix/.test(u), 'semikolon i url() ødelægger ikke deklarationsopdelingen');
  assert.ok(/@font-face\{font-family:X;src:url\(a\.woff2\);font-display:swap\}/.test(u), '@font-face røres ikke');
  assert.ok(/\.j\{content:"\}:has\(";color:red\}/.test(u), 'streng med } og :has( forvirrer ikke gennemgangen');
  const kunHas = K.degrader(css, ['has']);
  assert.ok(/color-mix/.test(kunHas) && /@container/.test(kunHas) && !/\.b:has/.test(kunHas), 'enkeltvalg virker uafhængigt');
});

test('degrader() uden valg ændrer intet (udover kommentarer) i nogen af repoets CSS-filer, og med alle valg forbliver klammerne balancerede', () => {
  const fs = require('node:fs'), path = require('node:path');
  const mappe = path.join(__dirname, '..', 'css');
  for (const n of fs.readdirSync(mappe).filter(x => x.endsWith('.css'))) {
    const css = fs.readFileSync(path.join(mappe, n), 'utf8');
    assert.strictEqual(K.degrader(css, []), K.udenKommentarer(css), `${n}: identitet brudt`);
    const alt = K.degrader(css, ['has', 'container', 'colormix', 'dvh']);
    const aaben = (alt.match(/\{/g) || []).length, lukket = (alt.match(/\}/g) || []).length;
    assert.strictEqual(aaben, lukket, `${n}: ubalancerede klammer efter degradering (${aaben} vs ${lukket})`);
    assert.ok(!/:has\(/.test(alt.replace(/"[^"]*"|'[^']*'/g, '')), `${n}: :has( er ikke fjernet`);
    assert.ok(!/color-mix\(/.test(alt) && !/\d(dvh|svh|lvh)/.test(alt) && !/@container/.test(alt), `${n}: noget er ikke fjernet`);
  }
});

test('browser: siderne kører uden konsol-/sidefejl, når :has, @container, color-mix og dvh er fjernet (simuleret ældre browser)', async (t) => {
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) return t.skip(kan.grund);
  const KB = require('./v5-krydsbrowser.js');
  const r = await KB.koerDegrader(kan.pw, { sider: ['maerker'], viewports: [375], temaer: ['lys'] }, require('node:path').join(__dirname, '..'));
  assert.strictEqual(r.length, 7);
  for (const v of r) for (const s of v.sider) {
    assert.deepStrictEqual(s.konsol.concat(s.sidefejl), [], `${v.variant}: ${s.side}`);
    assert.ok(s.maal && s.maal.h1n === 1, `${v.variant}: h1`);
  }
  assert.ok(r[6].sammenfatning, 'sammenfatning for "alt ovenstående"');
});
