/* w12-perf2: laaser ydelsesaendringerne uden netvaerk.
   - Cloudflare-reglen for /img/* verificeres med en lille evaluator af Cloudflares udtryksproget (kun den delmaengde, reglerne bruger).
     scripts/cloudflare-setup.js koeres ALDRIG her: filen require()s, og fetch er stubbet til at kaste. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');
const les = f => fs.readFileSync(path.join(REPO, f), 'utf8');

/* ---------- Mini-evaluator: (A) and (B), starts_with(x, "..."), x contains "...", x.extension in {"a" "b"} ---------- */
function evalUdtryk(udtryk, url){
  const u = new URL(url, 'https://bikerbasen.dk');
  const felt = {
    'http.request.uri.path': u.pathname,
    'http.request.uri.query': u.search.replace(/^\?/, ''),
    'http.request.uri.path.extension': (u.pathname.match(/\.([A-Za-z0-9]+)$/) || [, ''])[1],
  };
  const del = udtryk.split(/\)\s+and\s+\(/).map(d => d.replace(/^\s*\(/, '').replace(/\)\s*$/, ''));
  return del.every(d => {
    let m;
    if ((m = d.match(/^starts_with\(([\w.]+),\s*"([^"]*)"\)$/))) return felt[m[1]].startsWith(m[2]);
    if ((m = d.match(/^([\w.]+) contains "([^"]*)"$/))) return felt[m[1]].includes(m[2]);
    if ((m = d.match(/^([\w.]+) in \{([^}]*)\}$/))) return [...m[2].matchAll(/"([^"]*)"/g)].map(x => x[1]).includes(felt[m[1]]);
    throw new Error('udtryk uden for evaluatorens delmaengde: ' + d);
  });
}

function indlaesCloudflare(){
  const foer = global.fetch;
  global.fetch = () => { throw new Error('netvaerk i test: cloudflare-setup.js maa ikke kalde fetch ved require'); };
  try {
    const sti = require.resolve('./cloudflare-setup.js');
    delete require.cache[sti];
    return require(sti);
  } finally { global.fetch = foer; }
}

test('cloudflare-setup: kan require()s uden token og uden netvaerk', () => {
  const gammel = process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CLOUDFLARE_API_TOKEN;
  try {
    const m = indlaesCloudflare();
    assert.ok(Array.isArray(m.HEADER_RULES) && Array.isArray(m.CACHE_RULES));
  } finally { if (gammel !== undefined) process.env.CLOUDFLARE_API_TOKEN = gammel; }
});

test('cloudflare-setup: direkte koersel uden token stopper (exit 2) foer noget netvaerk', () => {
  const { spawnSync } = require('child_process');
  const env = { ...process.env }; delete env.CLOUDFLARE_API_TOKEN;
  const r = spawnSync(process.execPath, [path.join(__dirname, 'cloudflare-setup.js')], { encoding: 'utf8', env });
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /CLOUDFLARE_API_TOKEN mangler/);
});

test('cloudflare-setup: /img/* faar public, max-age=604800, stale-while-revalidate - og ikke immutable', () => {
  const { HEADER_RULES, BILLEDER } = indlaesCloudflare();
  const regel = HEADER_RULES.find(r => r.expression === BILLEDER);
  assert.ok(regel, 'regel for billeder mangler');
  assert.strictEqual(regel.action, 'rewrite');
  const cc = regel.action_parameters.headers['Cache-Control'];
  assert.strictEqual(cc.operation, 'set');
  assert.match(cc.value, /^public, max-age=604800, stale-while-revalidate=\d+$/);
  assert.ok(!/immutable/.test(cc.value), 'billeder har ingen ?v=, saa de maa ikke vaere immutable');
});

test('cloudflare-setup: udtrykket rammer billeder og kun billeder', () => {
  const { BILLEDER } = indlaesCloudflare();
  for (const u of ['/img/hero-800.webp', '/img/hero-800.webp?v=abc', '/img/type/naked.webp', '/img/sell-cruiser.webp', '/img/x.avif', '/img/']){
    assert.ok(evalUdtryk(BILLEDER, u), 'skal ramme ' + u);
  }
  for (const u of ['/', '/index.html', '/css/styles.css?v=1', '/js/home.js?v=1', '/fonts/a.woff2?v=1', '/logo-mark.png', '/imgs/x.webp', '/x/img/a.webp', '/favicon.png']){
    assert.ok(!evalUdtryk(BILLEDER, u), 'maa ikke ramme ' + u);
  }
});

test('cloudflare-setup: billedreglen overlapper ikke den uforanderlige regel for css/js/woff2', () => {
  const { VERSIONERET, BILLEDER } = indlaesCloudflare();
  // ingen fil under img/ har en udvidelse, som ?v=-reglen (immutable) fanger
  const ekstra = [];
  (function gaa(d){ for (const e of fs.readdirSync(d, { withFileTypes: true })){
    if (e.isDirectory()) gaa(path.join(d, e.name)); else if (/.(css|js|woff2)$/.test(e.name)) ekstra.push(e.name);
  } })(path.join(REPO, 'img'));
  assert.deepStrictEqual(ekstra, []);
  for (const u of ['/img/hero-800.webp', '/img/type/naked.webp?v=1', '/logo-mark.png?v=logo1', '/index.html'])
    assert.ok(!evalUdtryk(VERSIONERET, u), 'versioneret-reglen maa ikke ramme ' + u);
  for (const u of ['/css/styles.css?v=7', '/js/home.js?v=7', '/fonts/inter.woff2?v=ab12cd34'])
    assert.ok(evalUdtryk(VERSIONERET, u) && !evalUdtryk(BILLEDER, u), u);
});

test('cloudflare-setup: alle regler er idempotens-sikre (beskrivelse starter med Bikerbasen: - ellers erstattes de)', () => {
  const { HEADER_RULES, CACHE_RULES } = indlaesCloudflare();
  for (const r of [...HEADER_RULES, ...CACHE_RULES]){
    assert.match(r.description, /^Bikerbasen:/);
    assert.ok(r.expression && r.action && r.action_parameters);
  }
});

/* ---------- Kildeaendringer (praecise, smaa) ---------- */

test('facet-sider: A2-guidekortet bruger hero-800 (allerede hentet som LCP), ikke hero-960', () => {
  const kilde = les('scripts/build-facet-pages.js');
  const linje = kilde.split(/\r?\n/).find(l => /const a2 = \[GUIDE\.a2/.test(l));
  assert.ok(linje, 'a2-linjen findes');
  assert.ok(linje.includes("'img/hero-800.webp'"), linje);
  assert.ok(!linje.includes('hero-960'));
});

test('guides: logo-mark i metalinjen har samme URL (?v=logo1) som headerens', () => {
  const kilde = les('scripts/build-guides.js');
  const m = kilde.match(/<img src="(logo-mark\.png[^"]*)"[^>]*>(?=<span><strong>Af Bikerbasen)/);
  assert.ok(m, 'gd-meta-by-billedet findes');
  assert.strictEqual(m[1], 'logo-mark.png?v=logo1');
});

test('forside: typefliserne er lazy med width/height (ingen CLS) og uden fetchpriority=low', () => {
  const kilde = les('js/home.js');
  const linje = kilde.split(/\r?\n/).find(l => l.includes('<span class="tile-media"><img'));
  assert.ok(linje, 'tile-media-linjen findes');
  assert.ok(linje.includes('loading="lazy"'), linje);
  assert.ok(/width="456" height="342"/.test(linje));
  assert.ok(!/eager|fetchpriority/.test(linje));
});
