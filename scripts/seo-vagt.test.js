/* Tests for scripts/seo-vagt.js og fail-safe-hentningen i scripts/shared.js.
   Kør: node --test scripts/seo-vagt.test.js

   Låser to findings:
   S-005: en tom eller fejlet hentning må aldrig kunne slette annoncesider og sitemap-poster.
   S-011: sitemap-lastmod følger sidens ægte indhold, ikke byggedatoen. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const V = require('./seo-vagt');
const shared = require('./shared');

/* ---------- S-005: antal-vagten ---------- */

test('vurderAntal: faldet under halvdelen af det sidst kendte gode er ikke ok', () => {
  assert.strictEqual(V.vurderAntal('Egne', 100, 100).ok, true);
  assert.strictEqual(V.vurderAntal('Egne', 50, 100).ok, true, 'præcis 50 % er stadig ok');
  assert.strictEqual(V.vurderAntal('Egne', 49, 100).ok, false);
  assert.match(V.vurderAntal('Egne', 0, 300).besked, /Egne: kun 0 nu mod 300/);
  assert.match(V.vurderAntal('Egne', 0, 300).besked, /CI/, 'beskeden nævner CI');
  assert.match(V.vurderAntal('Egne', 0, 300).besked, /BB_TILLAD_FALD=1/);
  assert.match(V.vurderAntal('Egne', 0, 300).besked, /tillad_fald/, 'og workflow-inputtet');
});

test('vurderAntal: absolut gulv — små tal sammenlignes ikke (P1-1: to annoncer må ikke låse en deploy)', () => {
  assert.strictEqual(V.GULV, 20);
  for (const [nu, f] of [[0, 1], [0, 2], [1, 3], [2, 5], [0, 19]]) assert.strictEqual(V.vurderAntal('x', nu, f).ok, true, `${nu} af ${f}`);
  assert.strictEqual(V.vurderAntal('x', 9, 20).ok, false, 'fra gulvet og op gælder reglen');
  assert.strictEqual(V.vurderAntal('x', 10, 20).ok, true);
});

test('vurderAntal: nulErFejl — 0 med committede sider er en tom hentning, uanset gulvet', () => {
  assert.strictEqual(V.vurderAntal('Egne', 0, 2, 0.5, true).ok, false);
  assert.strictEqual(V.vurderAntal('Egne', 1, 2, 0.5, true).ok, true);
  assert.strictEqual(V.vurderAntal('Egne', 0, 0, 0.5, true).ok, true, 'intet at miste');
  assert.match(V.vurderAntal('Egne', 0, 2, 0.5, true).besked, /tillad_fald/);
});

test('vurderAntal: eget minAndel (85 % for kategorier)', () => {
  assert.strictEqual(V.MIN_ANDEL_KATEGORI, 0.85);
  assert.strictEqual(V.vurderAntal('x', 84, 100, V.MIN_ANDEL_KATEGORI).ok, false);
  assert.strictEqual(V.vurderAntal('x', 85, 100, V.MIN_ANDEL_KATEGORI).ok, true);
  assert.strictEqual(V.vurderAntal('x', 60, 100).ok, true, 'standarden er stadig 50 %');
});

test('inaktiveDomaener: kilder med aktiv: false i YAML er opt-out og læses kun', () => {
  const y1 = "navn: A\ndomaene: guloggratis.dk\naktiv: false   # fravalgt\n";
  const y2 = "navn: B\ndomaene: 'mcsyd.dk'\naktiv: true\n";
  const y3 = "navn: C\ndomaene: x.dk\n";
  const s = V.inaktiveDomaener([y1, y2, y3]);
  assert.deepStrictEqual([...s], ['guloggratis.dk']);
  assert.strictEqual(V.laesInaktiveDomaener(path.join(os.tmpdir(), 'findes-ikke-' + Date.now())).size, 0);
  assert.ok(V.laesInaktiveDomaener(path.join(__dirname, '..')) instanceof Set, 'kan læse repoets egne sources/');
});

test('tjekLager: kategorier og kilder tjekkes hver for sig, opt-out-kilder trækkes ud af baseline', () => {
  const baseline = { eksterne: 600, perKilde: { 'a.dk': 400, 'b.dk': 200 } };
  const ok = { egne: 30, eksterne: 600, perKilde: { 'a.dk': 400, 'b.dk': 200 }, baseline, egneSider: 30 };
  assert.doesNotThrow(() => V.tjekLager(ok));
  // 60 % delvis hentning: passerede før, fanges nu (70 % pr. kategori)
  assert.throws(() => V.tjekLager({ ...ok, eksterne: 360, perKilde: { 'a.dk': 240, 'b.dk': 120 } }), e => e.code === 'SEO_FALD');
  // én kilde mangler helt, selvom totalen holder 70 %
  assert.throws(() => V.tjekLager({ ...ok, eksterne: 520, perKilde: { 'a.dk': 430, 'b.dk': 90 } }), /Kilde b\.dk/);
  // 75 % og 90 % delvis hentning: 75 % stoppes nu (kategorigulv 85 %)
  assert.throws(() => V.tjekLager({ ...ok, eksterne: 450, perKilde: { 'a.dk': 300, 'b.dk': 150 } }), /Indekserede annoncer/);
  // b.dk er fravalgt i YAML: den mangler uden at det er et fald, og baseline for totalen mindskes
  assert.doesNotThrow(() => V.tjekLager({ ...ok, eksterne: 400, perKilde: { 'a.dk': 400 }, inaktive: new Set(['b.dk']) }));
  // 0 egne med committede annoncesider er en tom hentning (sitemap og sider skal blive konsistente) ...
  assert.throws(() => V.tjekLager({ ...ok, egne: 0, egneSider: 2 }), /Egne annoncer: 0 nu mod 2/);
  // ... men er der slet ingen committede sider, er der intet at miste
  assert.doesNotThrow(() => V.tjekLager({ ...ok, egne: 0, egneSider: 0 }));
  // 1 af 3 egne (under gulvet) er stadig ikke en alarm
  assert.doesNotThrow(() => V.tjekLager({ ...ok, egne: 1, egneSider: 3 }));
  assert.throws(() => V.tjekLager({ ...ok, egne: 5, egneSider: 30 }), /Egne annoncer/);
});

test('besked er handlingsorienteret: de to udveje med kommandoer, og at ledgeren skal committes', () => {
  const b = V.vurderAntal('x', 0, 100).besked;
  assert.match(b, /BB_TILLAD_FALD=1 node scripts\/build\.js/);
  assert.match(b, /commit scripts\/sitemap-lastmod\.json/);
  assert.match(b, /tillad_fald = true/);
  assert.match(b, /springes trinnet over igen ved næste push/);
  assert.strictEqual(b.includes(V.UDVEJE), true);
});

test('tjekSletninger: loft på 3 sider eller 5 % af sidemængden (P2-1)', () => {
  assert.doesNotThrow(() => V.tjekSletninger('Mærkesider', 3, 25, { tillad: false }));
  assert.throws(() => V.tjekSletninger('Mærkesider', 4, 25, { tillad: false }), e => e.code === 'SEO_FALD' && /loft 3/.test(e.message) && /BB_TILLAD_FALD=1/.test(e.message));
  assert.doesNotThrow(() => V.tjekSletninger('Annoncesider', 30, 600, { tillad: false }), '5 % af 600 = 30');
  assert.throws(() => V.tjekSletninger('Annoncesider', 31, 600, { tillad: false }), /loft 30/);
  assert.strictEqual(V.tjekSletninger('x', 0, 0, { tillad: false }).ok, true);
  const orig = console.warn; console.warn = () => {};
  try { assert.strictEqual(V.tjekSletninger('x', 99, 25, { tillad: true }).tilladt, true); } finally { console.warn = orig; }
});

test('lastmod i CI: kun en committet dato kan bevidnes, ellers ingen lastmod, og ledgeren skrives ikke (P1-2)', () => {
  const gammel = process.env.GITHUB_ACTIONS;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-ci-'));
  fs.mkdirSync(path.join(dir, 'scripts'));
  try {
    process.env.GITHUB_ACTIONS = 'true';
    const led = { ny: false, meta: {}, sider: { a: { h: 'H1', d: '2026-09-20' }, b: { h: 'H2', d: null } } };
    assert.strictEqual(V.lastmodFor(led, 'a', 'H1', '2026-10-17'), '2026-09-20', 'uændret data beholder den committede dato');
    assert.strictEqual(V.lastmodFor(led, 'a', 'H1', '2026-12-24'), '2026-09-20', 'også dagen efter — datoen er ændringens, ikke deployets');
    assert.strictEqual(V.lastmodFor(led, 'a', 'ANDET', '2026-10-17'), null, 'ændret data: lastmod udelades, aldrig byggedagen');
    assert.strictEqual(V.lastmodFor(led, 'b', 'H2', '2026-10-17'), null, 'ukendt dato forbliver ukendt');
    assert.strictEqual(V.lastmodFor(led, 'ny-side', 'X', '2026-10-17'), null, 'ny side i CI: udelades');
    assert.deepStrictEqual(led.sider.a, { h: 'H1', d: '2026-09-20' }, 'CI rører ikke ledger-posten');
    assert.ok(!('ny-side' in led.sider));
    V.skrivLedger(dir, { meta: { x: 1 }, sider: { a: { h: 'H', d: null } } });
    assert.ok(!fs.existsSync(path.join(dir, 'scripts', V.LEDGER_FIL)), 'CI skriver ikke ledgeren');
    delete process.env.GITHUB_ACTIONS;
    assert.strictEqual(V.lastmodFor({ ny: false, meta: {}, sider: { a: { h: 'H1', d: '2026-09-20' } } }, 'a', 'ANDET', '2026-10-17'), '2026-10-17', 'lokalt: som før');
    V.skrivLedger(dir, { meta: { x: 1 }, sider: { a: { h: 'H', d: null } } });
    assert.ok(fs.existsSync(path.join(dir, 'scripts', V.LEDGER_FIL)), 'lokalt skrives ledgeren');
  } finally {
    if (gammel === undefined) delete process.env.GITHUB_ACTIONS; else process.env.GITHUB_ACTIONS = gammel;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('erFaldFejl/afslut: fejlkoderne SEO_FALD og SEO_HENT giver exit 3 (fail-soft), alt andet 1', () => {
  assert.strictEqual(V.EXIT_FALD, 3);
  assert.strictEqual(V.erFaldFejl(Object.assign(new Error('x'), { code: 'SEO_FALD' })), true);
  assert.strictEqual(V.erFaldFejl(Object.assign(new Error('x'), { code: 'SEO_HENT' })), true);
  assert.strictEqual(V.erFaldFejl(new Error('x')), false);
  assert.strictEqual(V.erFaldFejl(null), false);
});

test('build.js: faldet i ÉT datatrin gendanner hele sitemappet og ledgeren fra før buildet (P1-1)', () => {
  const { spawnSync } = require('child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'build-snap-'));
  try {
    fs.mkdirSync(path.join(dir, 'scripts'));
    for (const f of ['build.js', 'seo-vagt.js']) fs.copyFileSync(path.join(__dirname, f), path.join(dir, 'scripts', f));
    fs.writeFileSync(path.join(dir, 'sitemap.xml'), 'FULDT-SITEMAP-FRA-FOER');
    fs.writeFileSync(path.join(dir, 'scripts', 'sitemap-lastmod.json'), 'LEDGER-FRA-FOER');
    const trin = ['build-listing-pages.js', 'build-brand-pages.js', 'build-facet-pages.js', 'build-guides.js', 'build-srp.js', 'build-meta.js', 'build-llms.js', 'stamp-version.js', 'inline-boot.js', 'inline-cookie.js', 'inline-analytics.js', 'inline-critical.js', 'csp-hashes.js'];
    const sm = JSON.stringify(path.join(dir, 'sitemap.xml')), le = JSON.stringify(path.join(dir, 'scripts', 'sitemap-lastmod.json'));
    for (const t of trin){
      // brand skriver et sitemap UDEN facet-poster og en ny ledger; facet fejler derefter (exit 3)
      const krop = t === 'build-brand-pages.js' ? `require('fs').writeFileSync(${sm}, 'HALVT-SITEMAP'); require('fs').writeFileSync(${le}, 'NY-LEDGER');`
        : t === 'build-facet-pages.js' ? 'process.exit(3);' : '';
      fs.writeFileSync(path.join(dir, 'scripts', t), krop);
    }
    const r = spawnSync('node', [path.join(dir, 'scripts', 'build.js')], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0);
    assert.strictEqual(fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8'), 'FULDT-SITEMAP-FRA-FOER', 'hele sitemappet er gendannet, ikke det halve');
    assert.strictEqual(fs.readFileSync(path.join(dir, 'scripts', 'sitemap-lastmod.json'), 'utf8'), 'LEDGER-FRA-FOER');
    assert.match(r.stdout, /sitemap\.xml og scripts\/sitemap-lastmod\.json gendannet/);
    assert.match(r.stdout, /HELE det committede sitemap gendannes/, 'advarselsteksten er sand');
    assert.match(r.stdout, /BB_TILLAD_FALD=1 node scripts\/build\.js/);
    // uden fald: intet gendannes
    for (const t of trin) fs.writeFileSync(path.join(dir, 'scripts', t), t === 'build-brand-pages.js' ? `require('fs').writeFileSync(${sm}, 'NYT-SITEMAP');` : '');
    const ok = spawnSync('node', [path.join(dir, 'scripts', 'build.js')], { encoding: 'utf8' });
    assert.strictEqual(ok.status, 0);
    assert.strictEqual(fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8'), 'NYT-SITEMAP');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('build.js: annoncesider slettes først sidst — og slet ikke hvis et trin er sprunget (P2-1)', () => {
  const { spawnSync } = require('child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'build-slet-'));
  try {
    fs.mkdirSync(path.join(dir, 'scripts'));
    for (const f of ['build.js', 'seo-vagt.js']) fs.copyFileSync(path.join(__dirname, f), path.join(dir, 'scripts', f));
    const trin = ['build-listing-pages.js', 'build-brand-pages.js', 'build-facet-pages.js', 'build-guides.js', 'build-srp.js', 'build-meta.js', 'build-llms.js', 'stamp-version.js', 'inline-boot.js', 'inline-cookie.js', 'inline-analytics.js', 'inline-critical.js', 'csp-hashes.js'];
    const opsaet = (brandKode) => {
      for (const f of ['annonce-a-1.html', 'annonce-b-2.html', 'annonce-c-3.html']) fs.writeFileSync(path.join(dir, f), 'side');
      for (const t of trin){
        // listing "sletter" to sider: den skriver listen til BB_SLETTELISTE (som den rigtige gør), sletter intet selv
        const krop = t === 'build-listing-pages.js' ? `require('fs').writeFileSync(process.env.BB_SLETTELISTE, JSON.stringify(['annonce-a-1.html', 'annonce-b-2.html']));`
          : t === 'build-brand-pages.js' ? `process.exit(${brandKode});` : '';
        fs.writeFileSync(path.join(dir, 'scripts', t), krop);
      }
    };
    opsaet(3);   // brand springes over
    let r = spawnSync('node', [path.join(dir, 'scripts', 'build.js')], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0);
    assert.deepStrictEqual(fs.readdirSync(dir).filter(f => /^annonce-/.test(f)).sort(), ['annonce-a-1.html', 'annonce-b-2.html', 'annonce-c-3.html'], 'ingen annoncesider slettet, når et trin er sprunget');
    assert.match(r.stdout, /UDSKUDT/);
    assert.strictEqual(fs.readdirSync(os.tmpdir()).filter(f => /^bb-slet-.*\.json$/.test(f) && fs.readFileSync(path.join(os.tmpdir(), f), 'utf8').includes('annonce-a-1.html')).length, 0, 'ingen efterladt sletteliste');
    for (const f of fs.readdirSync(dir).filter(f => /^annonce-/.test(f))) fs.unlinkSync(path.join(dir, f));
    opsaet(0);   // alle trin lykkes
    r = spawnSync('node', [path.join(dir, 'scripts', 'build.js')], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0);
    assert.deepStrictEqual(fs.readdirSync(dir).filter(f => /^annonce-/.test(f)), ['annonce-c-3.html'], 'sletningen sker, når alle trin er lykkedes');
    assert.match(r.stdout, /::warning title=Sider fjernet::2 annonceside\(r\) slettet/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('build.js: et datatrin med exit 3 beholder de committede sider og fortsætter; andre fejl stopper (simuleret)', () => {
  const { spawnSync } = require('child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'build-failsoft-'));
  try {
    fs.mkdirSync(path.join(dir, 'scripts'));
    for (const f of ['build.js', 'seo-vagt.js']) fs.copyFileSync(path.join(__dirname, f), path.join(dir, 'scripts', f));
    const trin = ['build-listing-pages.js', 'build-brand-pages.js', 'build-facet-pages.js', 'build-guides.js', 'build-srp.js', 'build-meta.js', 'build-llms.js', 'stamp-version.js', 'inline-boot.js', 'inline-cookie.js', 'inline-analytics.js', 'inline-critical.js', 'csp-hashes.js'];
    const lav = (kode) => { for (const t of trin) fs.writeFileSync(path.join(dir, 'scripts', t), `require('fs').appendFileSync(${JSON.stringify(path.join(dir, 'log.txt'))}, ${JSON.stringify(t)} + '\\n'); process.exit(${t === 'build-brand-pages.js' ? kode : 0});`); };
    lav(3);
    let r = spawnSync('node', [path.join(dir, 'scripts', 'build.js')], { encoding: 'utf8', env: { ...process.env, BB_TILLAD_FALD: '' } });
    assert.strictEqual(r.status, 0, 'fail-soft: buildet fuldføres');
    assert.deepStrictEqual(fs.readFileSync(path.join(dir, 'log.txt'), 'utf8').trim().split('\n'), trin.filter(t => t !== 'build-srp.js'),
      'alle trin kører efter faldet — på nær build-srp, som ville skrive et tomt gitter ind');
    assert.match(r.stdout, /build-srp\.js sprunget over/);
    assert.match(r.stdout, /::warning title=SEO-vagt::build-brand-pages\.js afbrudt/);
    assert.match(r.stdout, /SEO_FALD-MARKØR/);
    assert.match(r.stdout, /tillad_fald/);
    assert.ok(!/Byg færdig\.\n/.test(r.stdout), 'ikke en ren "Byg færdig"');
    fs.unlinkSync(path.join(dir, 'log.txt'));
    lav(1);
    r = spawnSync('node', [path.join(dir, 'scripts', 'build.js')], { encoding: 'utf8' });
    assert.strictEqual(r.status, 1, 'en almindelig fejl stopper stadig');
    assert.deepStrictEqual(fs.readFileSync(path.join(dir, 'log.txt'), 'utf8').trim().split('\n'), trin.slice(0, 2));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('vurderAntal: første byg og vækst giver aldrig falsk alarm', () => {
  assert.strictEqual(V.vurderAntal('x', 0, 0).ok, true, 'intet at miste');
  assert.strictEqual(V.vurderAntal('x', 0, undefined).ok, true);
  assert.strictEqual(V.vurderAntal('x', 5, null).ok, true);
  assert.strictEqual(V.vurderAntal('x', 700, 300).ok, true);
  assert.strictEqual(V.vurderAntal('x', -1, 300).ok, false, 'ugyldigt antal');
  assert.strictEqual(V.vurderAntal('x', NaN, 300).ok, false);
});

test('tjekAntal: kaster med klar besked, og BB_TILLAD_FALD er den eneste vej udenom', () => {
  assert.throws(() => V.tjekAntal('Mærkesider', 3, 25, { tillad: false }), e => e.code === 'SEO_FALD' && /afbrudt/.test(e.message) && /BB_TILLAD_FALD=1/.test(e.message));
  assert.doesNotThrow(() => V.tjekAntal('Mærkesider', 20, 25, { tillad: false }));
  const advarsler = [];
  const orig = console.warn; console.warn = m => advarsler.push(m);
  try { assert.strictEqual(V.tjekAntal('Mærkesider', 3, 25, { tillad: true }).tilladt, true); } finally { console.warn = orig; }
  assert.strictEqual(advarsler.length, 1, 'et bevidst fald logges stadig');
});

test('en fejlet hentning bliver en fejl, ikke et tomt array (shared.fetchListings)', async () => {
  const origFetch = global.fetch, origWarn = console.warn;
  console.warn = () => {};
  try {
    global.fetch = async () => { throw new Error('ECONNRESET'); };
    assert.deepStrictEqual(await shared.fetchListings(['fallback']), ['fallback'], 'gammel adfærd uden flag');
    await assert.rejects(() => shared.fetchListings([], { kraevDatabase: true }), /Build afbrudt.*S-005/s);
    global.fetch = async () => ({ ok: false, status: 503, json: async () => [] });
    await assert.rejects(() => shared.fetchListings([], { kraevDatabase: true }), /HTTP 503/);
  } finally { global.fetch = origFetch; console.warn = origWarn; }
});

test('en kastet netværksfejl på eksterne_annoncer er fail-soft (SEO_HENT), som en HTTP-fejl (P2-2)', async () => {
  const origFetch = global.fetch;
  try {
    global.fetch = async () => { const e = new Error('ECONNRESET'); e.code = 'ECONNRESET'; throw e; };
    await assert.rejects(() => shared.fetchExternalListings(), e => V.erFaldFejl(e) && /netværk: ECONNRESET/.test(e.message));
    global.fetch = async () => ({ ok: false, status: 502, text: async () => 'Bad gateway' });
    await assert.rejects(() => shared.fetchExternalListings(), e => V.erFaldFejl(e) && /HTTP 502/.test(e.message));
  } finally { global.fetch = origFetch; }
});

test('nul eksterne er en fejl, selv under tillad_fald (P2-3); procentgulvene omgås', () => {
  const baseline = { eksterne: 600, perKilde: { 'a.dk': 600 } };
  const orig = console.warn; console.warn = () => {};
  const gammel = process.env.BB_TILLAD_FALD;
  process.env.BB_TILLAD_FALD = '1';
  try {
    assert.throws(() => V.tjekLager({ egne: 30, eksterne: 0, perKilde: {}, baseline, egneSider: 30 }), e => e.code === 'SEO_FALD' && /Indekserede annoncer: 0 nu mod 600/.test(e.message));
    assert.doesNotThrow(() => V.tjekLager({ egne: 30, eksterne: 100, perKilde: { 'a.dk': 100 }, baseline, egneSider: 30 }), 'et bevidst stort fald (men ikke nul) omgås');
    assert.doesNotThrow(() => V.tjekLager({ egne: 0, eksterne: 600, perKilde: { 'a.dk': 600 }, baseline, egneSider: 2 }), 'sidste egne annonce solgt omgås stadig');
    assert.throws(() => V.tjekAntal('x', 0, 100, { nulErFejl: true, nulAltidFejl: true }), /0 nu mod 100/);
  } finally { console.warn = orig; if (gammel === undefined) delete process.env.BB_TILLAD_FALD; else process.env.BB_TILLAD_FALD = gammel; }
});

test('taelAnnonceSider og taelMaerkeSider tæller kun de rigtige filer', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-vagt-'));
  try {
    for (const f of ['annonce-a-1.html', 'annonce-b-2.html', 'annonce.html', 'maerke-honda.html', 'maerker.html', 'model-x.html']) fs.writeFileSync(path.join(dir, f), '');
    assert.strictEqual(V.taelAnnonceSider(dir), 2, 'annonce.html er skabelonen, ikke en annoncesiden');
    assert.strictEqual(V.taelMaerkeSider(dir), 1, 'maerker.html er indekset');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  assert.strictEqual(V.taelAnnonceSider(path.join(os.tmpdir(), 'findes-ikke-' + Date.now())), 0);
});

test('taelSitemapUrls', () => {
  assert.strictEqual(V.taelSitemapUrls('<urlset><url><loc>a</loc></url><url><loc>b</loc></url></urlset>'), 2);
  assert.strictEqual(V.taelSitemapUrls(''), 0);
});

/* ---------- S-011: lastmod ---------- */

const side = (tekst, ekstra = '') => `<!doctype html><html><head><title>T</title><meta name="description" content="D">
<link rel="stylesheet" href="css/styles.css?v=${ekstra || 'aaa'}"><style>.x{color:red}</style></head><body>
<header>Menu</header><main><h1>Honda</h1><p>${tekst}</p><script>var x=1</script></main><footer>F</footer></body></html>`;

test('indholdsHash: ?v=, CSS, scripts og "Senest bekræftet" flytter ikke hashet, indhold gør', () => {
  const a = V.indholdsHash(side('Der er 41 til salg.'));
  assert.strictEqual(a, V.indholdsHash(side('Der er 41 til salg.', 'bbb')), '?v=-stempel');
  assert.strictEqual(a, V.indholdsHash(side('Der er 41 til salg. Senest bekræftet hos kilderne 24. aug. 2026.')), 'crawl-dato');
  assert.strictEqual(V.indholdsHash(side('Der er 41 til salg. Bekræftet 24. aug. 2026')), a, 'tillidsrækken');
  assert.notStrictEqual(a, V.indholdsHash(side('Der er 42 til salg.')), 'antal');
  assert.notStrictEqual(a, V.indholdsHash(side('Der er 41 til salg.').replace('<title>T', '<title>U')), 'titel');
  assert.notStrictEqual(a, V.indholdsHash(side('Der er 41 til salg.').replace('content="D"', 'content="E"')), 'beskrivelse');
  assert.strictEqual(a, V.indholdsHash(side('Der er 41 til salg.').replace('<header>Menu', '<header>Anden menu')), 'header/footer uden for <main> tæller ikke');
});

test('lastmodFor: ny ledger udelader datoen, ændring flytter den, uændret beholder den', () => {
  const led = { ny: true, meta: {}, sider: {} };
  assert.strictEqual(V.lastmodFor(led, 'vilkaar', 'h1', '2026-10-16'), null, 'første gang ledgeren oprettes: vi ved det ikke');
  assert.deepStrictEqual(led.sider.vilkaar, { h: 'h1', d: null });
  assert.strictEqual(V.lastmodFor(led, 'vilkaar', 'h1', '2026-10-20'), null, 'uændret => stadig ukendt, ikke byggedatoen');
  assert.strictEqual(V.lastmodFor(led, 'vilkaar', 'h2', '2026-10-21'), '2026-10-21', 'ændret => datoen rykker');
  assert.strictEqual(V.lastmodFor(led, 'vilkaar', 'h2', '2026-11-01'), '2026-10-21', 'uændret => samme dato');
  const eksisterende = { ny: false, meta: {}, sider: {} };
  assert.strictEqual(V.lastmodFor(eksisterende, 'budget-under-50000', 'x', '2026-10-16'), '2026-10-16', 'en ny side i en kendt ledger er ny i dag');
});

test('urlLinje udelader lastmod hvor den ikke er ægte', () => {
  assert.strictEqual(V.urlLinje('https://x.dk/a', null), '  <url><loc>https://x.dk/a</loc></url>');
  assert.strictEqual(V.urlLinje('https://x.dk/a', '2026-10-16'), '  <url><loc>https://x.dk/a</loc><lastmod>2026-10-16</lastmod></url>');
  assert.strictEqual(V.urlLinje('https://x.dk/a?x=1&y=2', null, s => s.replace(/&/g, '&amp;')), '  <url><loc>https://x.dk/a?x=1&amp;y=2</loc></url>');
});

test('renDato: kun gyldige W3C-datoer', () => {
  assert.strictEqual(V.renDato('2026-10-08T12:00:00Z'), '2026-10-08');
  assert.strictEqual(V.renDato('2026-10-08'), '2026-10-08');
  assert.strictEqual(V.renDato(''), null);
  assert.strictEqual(V.renDato(null), null);
  assert.strictEqual(V.renDato('2026-13-45'), null);
  assert.strictEqual(V.renDato('I går'), null);
});

test('genberegnLastmod: kun sider i roden regnes om, annoncer/guides/forhandlere røres ikke', () => {
  const base = 'https://bikerbasen.dk';
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>', '<urlset>',
    `  <url><loc>${base}</loc><lastmod>2026-10-15</lastmod></url>`,
    `  <url><loc>${base}/vilkaar</loc><lastmod>2026-10-15</lastmod></url>`,
    `  <url><loc>${base}/annonce-bmw-r45-1979-59d3a9a1.html</loc><lastmod>2026-10-08</lastmod></url>`,
    `  <url><loc>${base}/forhandler.html?id=1</loc><lastmod>2026-09-01</lastmod></url>`,
    `  <url><loc>${base}/guide-a2-koerekort</loc><lastmod>2026-10-10</lastmod></url>`,
    `  <url><loc>${base}/guides</loc><lastmod>2026-10-10</lastmod></url>`,
    `  <url><loc>${base}/findes-ikke</loc><lastmod>2026-10-01</lastmod></url>`,
    '</urlset>', '',
  ].join('\n');
  const sider = { 'index.html': side('forside'), 'vilkaar.html': side('vilkaar') };
  const led = { ny: false, meta: {}, sider: { vilkaar: { h: V.indholdsHash(sider['vilkaar.html']), d: '2026-09-20' } } };
  const ud = V.genberegnLastmod(xml, base, f => sider[f] ?? null, led, '2026-10-16');
  assert.match(ud, /<loc>https:\/\/bikerbasen\.dk\/vilkaar<\/loc><lastmod>2026-09-20<\/lastmod>/, 'uændret side beholder sin ægte dato');
  assert.match(ud, /<loc>https:\/\/bikerbasen\.dk<\/loc><lastmod>2026-10-16<\/lastmod>/, 'ny side i kendt ledger: i dag');
  assert.match(ud, /annonce-bmw-r45-1979-59d3a9a1\.html<\/loc><lastmod>2026-10-08</);
  assert.match(ud, /forhandler\.html\?id=1<\/loc><lastmod>2026-09-01</);
  assert.match(ud, /guide-a2-koerekort<\/loc><lastmod>2026-10-10</);
  assert.match(ud, /<loc>https:\/\/bikerbasen\.dk\/guides<\/loc><lastmod>2026-10-10</);
  assert.match(ud, /findes-ikke<\/loc><lastmod>2026-10-01</, 'fil mangler => linjen uændret');
  assert.ok(ud.startsWith('<?xml') && ud.endsWith('</urlset>\n'));
  // Idempotent: kører vi igen på samme sider, rykker intet.
  assert.strictEqual(V.genberegnLastmod(ud, base, f => sider[f] ?? null, led, '2026-12-24'), ud);
});

/* ---------- html-fakta (bruges af audit og seo-krav) ---------- */

test('sideFakta: h1 i kommentarer og scripts tæller ikke', () => {
  const html = '<title>A &amp; B</title><meta name="description" content="Se &quot;x&quot;"><meta name="robots" content="noindex, follow"><!-- <h1>skjult</h1> --><h1 class="a">Én</h1><script>"<h1>"</script>';
  const f = V.sideFakta(html);
  assert.strictEqual(f.h1, 1);
  assert.strictEqual(f.titel, 'A & B');
  assert.strictEqual(f.beskrivelse, 'Se "x"');
  assert.strictEqual(f.noindex, true);
});
