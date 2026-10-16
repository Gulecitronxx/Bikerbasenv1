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

test('vurderAntal: eget minAndel (70 % for kategorier)', () => {
  assert.strictEqual(V.vurderAntal('x', 69, 100, V.MIN_ANDEL_KATEGORI).ok, false);
  assert.strictEqual(V.vurderAntal('x', 70, 100, V.MIN_ANDEL_KATEGORI).ok, true);
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
  assert.throws(() => V.tjekLager({ ...ok, eksterne: 490, perKilde: { 'a.dk': 400, 'b.dk': 90 } }), /Kilde b\.dk/);
  // b.dk er fravalgt i YAML: den mangler uden at det er et fald, og baseline for totalen mindskes
  assert.doesNotThrow(() => V.tjekLager({ ...ok, eksterne: 400, perKilde: { 'a.dk': 400 }, inaktive: new Set(['b.dk']) }));
  // egne annoncer under gulvet røres ikke
  assert.doesNotThrow(() => V.tjekLager({ ...ok, egne: 0, egneSider: 2 }));
  assert.throws(() => V.tjekLager({ ...ok, egne: 5, egneSider: 30 }), /Egne annoncer/);
});

test('erFaldFejl/afslut: fejlkoderne SEO_FALD og SEO_HENT giver exit 3 (fail-soft), alt andet 1', () => {
  assert.strictEqual(V.EXIT_FALD, 3);
  assert.strictEqual(V.erFaldFejl(Object.assign(new Error('x'), { code: 'SEO_FALD' })), true);
  assert.strictEqual(V.erFaldFejl(Object.assign(new Error('x'), { code: 'SEO_HENT' })), true);
  assert.strictEqual(V.erFaldFejl(new Error('x')), false);
  assert.strictEqual(V.erFaldFejl(null), false);
});

test('build.js: et datatrin med exit 3 beholder de committede sider og fortsætter; andre fejl stopper (simuleret)', () => {
  const { spawnSync } = require('child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'build-failsoft-'));
  try {
    fs.mkdirSync(path.join(dir, 'scripts'));
    for (const f of ['build.js', 'seo-vagt.js']) fs.copyFileSync(path.join(__dirname, f), path.join(dir, 'scripts', f));
    const trin = ['build-listing-pages.js', 'build-brand-pages.js', 'build-facet-pages.js', 'build-guides.js', 'build-srp.js', 'build-meta.js', 'stamp-version.js', 'inline-boot.js', 'inline-cookie.js', 'inline-analytics.js', 'inline-critical.js', 'csp-hashes.js'];
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
