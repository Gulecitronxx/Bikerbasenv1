/* w12-kritisk: laaser den indlejrede kritiske CSS.
   Enhedstest (uden browser): CSS-opdeling, udsnit, nulstilling, idempotens, ikke-aktiverede familier byte-uaendrede,
   CSP-hash af loaderen. Browsertest (Playwright, skippes pent uden Chromium): kritisk + udskudt CSS giver SAMME
   beregnede stilarter og samme geometri som det fulde ark — paa en fixture-side OG paa de committede sider.
   Alt koeres i temp-kopier; repoets sider roeres ikke. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const K = require('./kritisk-css');
const { behandlSide } = require('./csp-hashes');
const { minifyCSS } = require('./shared');
const sb = require('./smoke-browser');

const REPO = path.join(__dirname, '..');
const CRLF = String.fromCharCode(13, 10);

/* ---------- Enhedstest ---------- */

const CSS = [
  '/* tokens */ :root{--a:1px;--s:"}{"}',
  'body{margin:0;font:16px/1.4 sans-serif}',
  '.hero{display:flex;gap:calc(var(--a) + 2px)}',
  '.hero::before{content:"a;b{c}"}',
  '.nede{padding:4px}',
  '@media (min-width:900px){ .hero{gap:20px} .nede{padding:8px} }',
  '@media (min-width:1200px){ .nede{margin:0} }',
  '@container (max-width:300px){ .kort{display:none} }',
  '@font-face{font-family:X;src:url(a.woff2)}',
  '@keyframes snurr{from{opacity:0}to{opacity:1}}',
  '@keyframes ubrugt{to{opacity:0}}',
  '.sp{animation:snurr 1s}',
].join('\n');

test('kritisk-css: parse + udsnit med alle noegler giver praecis det minificerede ark', () => {
  const p = K.parse(CSS);
  assert.deepStrictEqual(p.farlig, []);
  const alle = new Set(K.alleNoegler(p.traeet));
  // kun @keyframes uden brugende regel (ubrugt) udelades
  assert.strictEqual(K.udsnit([p.traeet], alle, alle), minifyCSS(CSS.replace('@keyframes ubrugt{to{opacity:0}}', '')));
});

test('kritisk-css: ukendte regler tages med, kendt ikke-kritisk udelades, tomme @media droppes', () => {
  const p = K.parse(CSS);
  const regler = K.fladRegler(p.traeet);
  const nede = regler.filter(r => r.vaelger === '.nede');
  const kendtUdenNede = new Set(K.alleNoegler(p.traeet).filter(n => !nede.some(r => r.noegle === n)));
  // manifestet kender alt andet; .nede (3 regler) er IKKE kendt -> med. Kun .hero + body + :root er kritiske.
  const krit = new Set(regler.filter(r => ['.hero', 'body', ':root'].includes(r.vaelger)).map(r => r.noegle));
  const u = K.udsnit([p.traeet], krit, kendtUdenNede);
  assert.ok(u.includes('.nede{padding:4px}'), 'ukendt regel skal med');
  assert.ok(u.includes('@media (min-width:1200px){.nede{margin:0}}'));
  // nu med .nede kendt (og ikke kritisk): ude, og @media-omslaget med den forsvinder
  const alleKendt = new Set(K.alleNoegler(p.traeet));
  const u2 = K.udsnit([p.traeet], krit, alleKendt);
  assert.ok(!u2.includes('.nede'), u2);
  assert.ok(!u2.includes('1200px'), 'tom @media droppet');
  assert.ok(u2.includes('@media (min-width:900px){.hero{gap:20px}}'), u2);
  assert.ok(u2.includes('@font-face'), '@font-face altid med');
  assert.ok(!u2.includes('@keyframes'), 'keyframes uden brugende regel udelades');
  assert.ok(!u2.includes('@container'), 'kort-reglen er ikke kritisk');
});

test('kritisk-css: @keyframes tages med naar en medtaget regel bruger den', () => {
  const p = K.parse(CSS);
  const regler = K.fladRegler(p.traeet);
  const krit = new Set(regler.filter(r => r.vaelger === '.sp').map(r => r.noegle));
  const u = K.udsnit([p.traeet], krit, new Set(K.alleNoegler(p.traeet)));
  assert.ok(u.includes('@keyframes snurr'), u);
  assert.ok(!u.includes('ubrugt'));
});

test('kritisk-css: strenge med } { ; og kommentarer forvirrer ikke opdelingen', () => {
  const p = K.parse('/* } */ a::after{content:"}{;"} b{color:red} /* { */');
  assert.deepStrictEqual(K.fladRegler(p.traeet).map(r => r.vaelger), ['a::after', 'b']);
});

test('kritisk-css: @layer / @import / nesting meldes som farlig (arket afkortes ikke)', () => {
  assert.ok(K.parse('@layer a{b{c:d}}').farlig.length);
  assert.ok(K.parse('@import url(x.css);').farlig.length);
  assert.ok(K.parse('a{b:c; &:hover{d:e}}').farlig.length);
});

test('kritisk-css: de rigtige ark kan afkortes (ingen farlige konstruktioner) og noeglerne er stabile', () => {
  for (const f of fs.readdirSync(path.join(REPO, 'css')).filter(x => x.endsWith('.css'))){
    const css = fs.readFileSync(path.join(REPO, 'css', f), 'utf8');
    const a = K.parse(css), b = K.parse(css.replace(/\r?\n/g, CRLF));
    assert.deepStrictEqual(a.farlig, [], f);
    assert.deepStrictEqual(K.alleNoegler(a.traeet), K.alleNoegler(b.traeet), `${f}: LF/CRLF giver samme noegler`);
  }
});

/* ---------- Byggetrin i temp-kopi ---------- */

function lavRod(filer){
  const rod = fs.mkdtempSync(path.join(os.tmpdir(), 'w12k-'));
  fs.mkdirSync(path.join(rod, 'scripts')); fs.mkdirSync(path.join(rod, 'css'));
  for (const f of ['inline-critical.js', 'kritisk-css.js', 'kritisk-familier.js', 'shared.js', 'slug.js', 'site-url.js', 'csp-hashes.js'])
    fs.copyFileSync(path.join(__dirname, f), path.join(rod, 'scripts', f));
  for (const [n, indhold] of Object.entries(filer)){
    fs.mkdirSync(path.dirname(path.join(rod, n)), { recursive: true });
    fs.writeFileSync(path.join(rod, n), indhold);
  }
  return rod;
}
const koer = (rod, script, env = {}) => spawnSync(process.execPath, [path.join(rod, 'scripts', script)], { cwd: rod, encoding: 'utf8', env: { ...process.env, BB_KRITISK_STILLE: '1', ...env } });

const SIDE = eol => [
  '<!doctype html><html><head><meta charset="UTF-8">',
  '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' \'sha256-gammel\'; style-src \'self\' \'unsafe-inline\'">',
  '<link rel="stylesheet" href="css/styles.css?v=abc">',
  '<link rel="stylesheet" href="css/p-facet.css?v=abc">',
  '</head><body><div class="hero">x</div><p class="nede">y</p></body></html>', ''].join(eol);

function fixtureRod(eol = '\n'){
  const styles = '.hero{display:flex;height:50px}\n.nede{padding:4px}\n.aldrig{color:red}\n';
  const facet = '.hero{background:#eee}\n.fa-x{margin:0}\n';
  const rod = lavRod({ 'css/styles.css': styles, 'css/p-facet.css': facet, 'koerekort-a2.html': SIDE(eol), 'login.html': SIDE(eol), 'andet.html': SIDE(eol) });
  // manifest: .hero er kritisk i familien koerekort; alt andet er kendt men ikke kritisk
  const ps = K.parse(styles), pf = K.parse(facet);
  const regler = [...new Set([...K.alleNoegler(ps.traeet), ...K.alleNoegler(pf.traeet)])].sort();
  const heroKeys = [...K.fladRegler(ps.traeet), ...K.fladRegler(pf.traeet)].filter(r => r.vaelger === '.hero').map(r => regler.indexOf(r.noegle));
  fs.writeFileSync(path.join(rod, 'scripts', 'kritisk-manifest.json'), JSON.stringify({ version: 1, regler, familier: { koerekort: { krit: heroKeys }, login: { krit: heroKeys } } }));
  return rod;
}

test('inline-critical: kun aktive familier aendres; ikke-aktive og ukendte sider er byte-identiske', () => {
  const rod = fixtureRod();
  const foer = Object.fromEntries(['koerekort-a2.html', 'login.html', 'andet.html'].map(f => [f, fs.readFileSync(path.join(rod, f), 'utf8')]));
  const r = koer(rod, 'inline-critical.js', { BB_KRITISK: 'koerekort' });
  assert.strictEqual(r.status, 0, r.stderr);
  const efter = Object.fromEntries(Object.keys(foer).map(f => [f, fs.readFileSync(path.join(rod, f), 'utf8')]));
  assert.strictEqual(efter['login.html'], foer['login.html'], 'login er ikke slaaet til');
  assert.strictEqual(efter['andet.html'], foer['andet.html'], 'ukendt familie');
  const h = efter['koerekort-a2.html'];
  assert.ok(h.includes('<style id="critical">.hero{display:flex;height:50px}.hero{background:#eee}</style>'), h);
  assert.ok(!h.includes('.aldrig') && !h.includes('.nede{padding'), 'ikke-kritiske regler er ikke indlejret');
  const preloads = h.match(/<link rel="preload" as="style" href="css\/[^"]+" data-kritisk>/g) || [];
  assert.strictEqual(preloads.length, 2, 'begge ark preloades i head');
  const nederst = h.slice(h.indexOf('<body'));
  assert.strictEqual((nederst.match(/<link rel="stylesheet" href="css\/[^"]+" data-kritisk>/g) || []).length, 2, 'begge ark er rigtige links sidst i body');
  assert.ok(nederst.indexOf('data-kritisk') < nederst.indexOf('</body>'));
  assert.ok(!/<script\b/.test(h), 'intet nyt inline-script');
  assert.ok(!/\sonload\s*=/i.test(h), 'ingen inline event-handlere (CSP)');
  assert.ok(h.indexOf('<style id="critical">') < h.indexOf('rel="preload"'), 'kritisk blok foer arkene');
  assert.ok(!/media=/.test(h), 'ingen media-trick');
});

test('inline-critical: links staar FOER sidens egen <style> i body, saa kaskaden er som foer', () => {
  const rod = fixtureRod();
  const side = SIDE('\n').replace('<p class="nede">', '<style id="egen">.x{y:z}</style><p class="nede">');
  fs.writeFileSync(path.join(rod, 'koerekort-a2.html'), side);
  koer(rod, 'inline-critical.js', { BB_KRITISK: 'koerekort' });
  const h = fs.readFileSync(path.join(rod, 'koerekort-a2.html'), 'utf8');
  assert.ok(h.indexOf('rel="stylesheet" href="css/p-facet.css?v=abc" data-kritisk') < h.indexOf('<style id="egen">'));
  koer(rod, 'inline-critical.js', { BB_KRITISK: 'ingen' });
  assert.strictEqual(fs.readFileSync(path.join(rod, 'koerekort-a2.html'), 'utf8'), side);
});

test('inline-critical: idempotent, og nulstilling giver originalen tilbage byte for byte (LF og CRLF)', () => {
  for (const eol of ['\n', CRLF]){
    const rod = fixtureRod(eol);
    const orig = fs.readFileSync(path.join(rod, 'koerekort-a2.html'), 'utf8');
    koer(rod, 'inline-critical.js', { BB_KRITISK: 'koerekort' });
    const en = fs.readFileSync(path.join(rod, 'koerekort-a2.html'), 'utf8');
    koer(rod, 'inline-critical.js', { BB_KRITISK: 'koerekort' });
    assert.strictEqual(fs.readFileSync(path.join(rod, 'koerekort-a2.html'), 'utf8'), en, 'anden koersel aendrer intet');
    koer(rod, 'inline-critical.js', { BB_KRITISK: 'ingen' });
    assert.strictEqual(fs.readFileSync(path.join(rod, 'koerekort-a2.html'), 'utf8'), orig, 'nulstillet = original');
  }
});

test('inline-critical: gammel preload/onload-form nulstilles til almindelige links', () => {
  const rod = fixtureRod();
  const gammel = fs.readFileSync(path.join(rod, 'login.html'), 'utf8')
    .replace('<link rel="stylesheet" href="css/styles.css?v=abc">', '<style id="critical">a{b:c}</style>\n<link rel="preload" as="style" href="css/styles.css?v=abc" onload="this.onload=null;this.rel=\'stylesheet\'">\n<noscript><link rel="stylesheet" href="css/styles.css?v=abc"></noscript>');
  fs.writeFileSync(path.join(rod, 'login.html'), gammel);
  koer(rod, 'inline-critical.js', { BB_KRITISK: 'ingen' });
  assert.strictEqual(fs.readFileSync(path.join(rod, 'login.html'), 'utf8'), SIDE('\n'));
});

test('inline-critical: uden manifest er alt render-blokerende (ingen blok)', () => {
  const rod = fixtureRod();
  fs.unlinkSync(path.join(rod, 'scripts', 'kritisk-manifest.json'));
  const r = koer(rod, 'inline-critical.js', { BB_KRITISK: 'alle' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(fs.readFileSync(path.join(rod, 'koerekort-a2.html'), 'utf8'), SIDE('\n'));
});

test('csp-hashes: ingen nyt inline-script, saa script-src er uaendret, og style-src (unsafe-inline) roeres ikke', () => {
  const rod = fixtureRod();
  const foer = behandlSide(fs.readFileSync(path.join(rod, 'koerekort-a2.html'), 'utf8'), 'foer');
  koer(rod, 'inline-critical.js', { BB_KRITISK: 'koerekort' });
  const h = fs.readFileSync(path.join(rod, 'koerekort-a2.html'), 'utf8');
  const efter = behandlSide(h, 'efter');   // kaster, hvis der er en inline event-handler
  assert.deepStrictEqual(efter.hashes, foer.hashes, 'samme inline-scripts, samme hashes');
  const csp = x => x.match(/Content-Security-Policy" content="([^"]+)"/)[1];
  assert.strictEqual(csp(efter.html), csp(foer.html), 'CSP er ordret den samme');
  assert.ok(/style-src 'self' 'unsafe-inline'/.test(csp(efter.html)), 'indlejret <style> kraever unsafe-inline, som siderne har');
});

test('manifestet: alle sidefamilier har kritiske regler, og alle committede ark-regler er kendt', () => {
  const m = JSON.parse(fs.readFileSync(path.join(__dirname, 'kritisk-manifest.json'), 'utf8'));
  const { FAMILIER } = require('./kritisk-familier');
  for (const f of FAMILIER) assert.ok(m.familier[f.navn] && m.familier[f.navn].krit.length > 100, `${f.navn} mangler i manifestet`);
  const kendt = new Set(m.regler);
  for (const f of fs.readdirSync(path.join(REPO, 'css')).filter(x => x.endsWith('.css'))){
    const nye = K.alleNoegler(K.parse(fs.readFileSync(path.join(REPO, 'css', f), 'utf8')).traeet).filter(n => !kendt.has(n));
    assert.strictEqual(nye.length, 0, `${f}: ${nye.length} regler er aendret siden manifestet (koer: node scripts/kritisk-gen.js). Det er ikke forkert — de tages med i udsnittet — men udsnittet bliver stoerre.`);
  }
});

/* ---------- Browsertest ---------- */

async function browserKlar(){
  const k = await sb.playwrightTilgaengelig();
  return k.ok ? k.pw : null;
}

/* Beregnede stilarter + boks for alle elementer i zonen (top < 1,5 x viewport), i dokumentraekkefoelge. */
function snapshot(zoneFaktor){
  const vh = innerHeight * zoneFaktor;
  const ud = [];
  const sti = e => { const s = []; for (let n = e; n && n.nodeType === 1; n = n.parentElement) s.push(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + ':' + (Array.prototype.filter.call(n.parentElement ? n.parentElement.children : [], c => !/^(LINK|SCRIPT|STYLE|NOSCRIPT)$/.test(c.tagName)).indexOf(n))); return s.reverse().join('>'); };
  for (const e of document.body.querySelectorAll('*')){
    if (e.closest('script,style,noscript,template') || e.tagName === 'LINK') continue;
    const r = e.getBoundingClientRect();
    if (!e.getClientRects().length || r.top + scrollY > vh) continue;   // boksloese (display:none) er ikke 'over folden'; et element der ER skjult i det fulde ark men ikke i udsnittet dukker op som ekstra element
    const cs = getComputedStyle(e);
    const par = [];
    // Et element der raekker ned under zonen faar sin hoejde af indhold, udsnittet med vilje ikke styler: hoejde-afledte egenskaber springes over.
    const nedUnder = r.bottom + scrollY > vh;
    for (let i = 0; i < cs.length; i++){
      const p = cs[i];
      if (nedUnder && /^(height|block-size|perspective-origin|transform-origin|grid-template-rows)$/.test(p)) continue;
      par.push(p + ':' + cs.getPropertyValue(p) + ';');
    }
    const tekst = par.sort().join('');   // egendefinerede egenskaber kommer i deklarationsraekkefoelge; sorter
    ud.push({ sti: sti(e), r: [Math.round(r.x * 10) / 10, Math.round((r.y + scrollY) * 10) / 10, Math.round(r.width * 10) / 10, (r.bottom + scrollY > vh ? '*' : Math.round(r.height * 10) / 10)].join(','), css: tekst });
  }
  return ud;
}

async function tagSnapshot(pw, { rod, side, vp, blokerSenere, tema }){
  const { server, port } = await sb.startServer(rod);
  const browser = await pw.chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, locale: 'da-DK', serviceWorkers: 'block', colorScheme: tema || 'light', reducedMotion: 'reduce' });
    await context.addInitScript(({ tema }) => { try { localStorage.setItem('bb_cookie_consent', JSON.stringify({ level: 'necessary', date: '2026-01-01T00:00:00Z' })); if (tema) localStorage.setItem('bb_theme', tema); } catch (e) {} }, { tema: tema || null });
    await sb.installerMock(context, port, {});
    // Udskudte ark afvises, saa siden staar med KUN det indlejrede udsnit (foerste maling).
    if (blokerSenere) await context.route('**/css/*.css*', route => route.abort('blockedbyclient'));
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/${side}`, { waitUntil: 'load', timeout: 20000 });
    await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    await page.addStyleTag({ content: 'html *,html *::before,html *::after{transition:none!important;animation:none!important;caret-color:transparent!important}'   /* hoejere specificitet end sidens *{...!important} i reduced-motion, saa raekkefoelgen i dokumentet ikke afgoer */ });
    await page.waitForTimeout(300);
    return await page.evaluate(snapshot, 1.5);
  } finally {
    await browser.close().catch(() => {});
    server.close();
  }
}

function sammenlign(a, b, { streng = false } = {}){
  const fejl = [];
  /* Elementer, der kun findes i den ene visning, er JS-genereret indhold (annoncekort, ikoner, typefliser): når det senere stilark er blokeret,
     venter de udskudte scripts på det og kører aldrig, så hydreringen udebliver — det er en testartefakt, ikke en stilfejl. Vi sammenligner derfor
     stil og geometri for de elementer, der findes i BEGGE (streng = false). 'Efter load = fuldt ark' bruger streng = true (alt skal være der). */
  if (!streng){
    const sb = new Set(b.map(x => x.sti)), sa = new Set(a.map(x => x.sti));
    a = a.filter(x => sb.has(x.sti)); b = b.filter(x => sa.has(x.sti));
  }
  if (a.length !== b.length){
    const sa = new Set(a.map(x => x.sti)), sb2 = new Set(b.map(x => x.sti));
    const kun = (x, y) => [...x].filter(s => !y.has(s)).slice(0, 4).join(' ; ');
    fejl.push(`antal elementer ${a.length} != ${b.length}; kun i fuld: [${kun(sa, sb2)}]; kun i kritisk: [${kun(sb2, sa)}]`);
  }
  // Egendefinerede egenskaber (--x) gemmer tokens ordret; det fulde ark er uminificeret i kilden, udsnittet minificeret.
  const norm = t => t.replace(/127[.]0[.]0[.]1:\d+/g, 'vaert').replace(/\s*,\s*/g, ',').replace(/\s*([(){}:;])\s*/g, '$1');
  a = a.map(x => ({ ...x, css: norm(x.css) })); b = b.map(x => ({ ...x, css: norm(x.css) }));
  for (let i = 0; i < Math.min(a.length, b.length); i++){
    if (a[i].sti !== b[i].sti){ fejl.push(`raekkefoelge ${a[i].sti} != ${b[i].sti}`); break; }
    if (a[i].r !== b[i].r) fejl.push(`${a[i].sti}: boks ${a[i].r} != ${b[i].r}`);
    else if (a[i].css !== b[i].css){
      const pa = Object.fromEntries(a[i].css.split(';').filter(Boolean).map(x => [x.slice(0, x.indexOf(':')), x.slice(x.indexOf(':') + 1)]));
      const pb = Object.fromEntries(b[i].css.split(';').filter(Boolean).map(x => [x.slice(0, x.indexOf(':')), x.slice(x.indexOf(':') + 1)]));
      const d = [...new Set([...Object.keys(pa), ...Object.keys(pb)])].filter(k => pa[k] !== pb[k]).slice(0, 4).map(k => `${k}: ${pa[k]} != ${pb[k]}`);
      let o = 0; while (o < a[i].css.length && a[i].css[o] === b[i].css[o]) o++;
      fejl.push(`${a[i].sti}: ${d.join(' | ')} [forskel ved tegn ${o}: «${a[i].css.slice(Math.max(0, o - 40), o + 60)}» != «${b[i].css.slice(Math.max(0, o - 40), o + 60)}»]`);
    }
    if (fejl.length > 6) break;
  }
  return fejl;
}

/* Kopi af rod, hvor de angivne sider faar kritisk blok. Fuld = den uaendrede kopi. */
function medKritisk(rod, aktiv){
  const kopi = fs.mkdtempSync(path.join(os.tmpdir(), 'w12kk-'));
  fs.cpSync(rod, kopi, { recursive: true, filter: s => !/node_modules|[\\/]\.git([\\/]|$)|[\\/]_site/.test(s) });
  const r = koer(kopi, 'inline-critical.js', { BB_KRITISK: aktiv });
  assert.strictEqual(r.status, 0, r.stderr);
  return kopi;
}

/* Fixture med en lang side: .hero + .nede i zonen, .langt langt under folden. Manifestet laves af den rigtige generator. */
async function lavFixtureMedManifest(){
  const styles = ['.hero{display:flex;height:50px}', '.nede{padding:4px;height:30px}', '.langt{height:40px;color:red}', '.skjult{display:none}',
    '.fyld{height:3000px}', '@media (min-width:700px){.hero{height:70px}.langt{height:60px}}', ''].join('\n');
  const facet = ['.hero{background:#eee}', '.fa-x{margin:0}', ''].join('\n');
  const html = '<!doctype html><html><head><meta charset="UTF-8"><link rel="stylesheet" href="css/styles.css?v=abc"><link rel="stylesheet" href="css/p-facet.css?v=abc"></head><body><div class="hero">x</div><p class="nede">y</p><div class="skjult">s</div><div class="fyld"></div><p class="langt">z</p></body></html>';
  const rod = lavRod({ 'css/styles.css': styles, 'css/p-facet.css': facet, 'koerekort-a2.html': html });
  const gen = require('./kritisk-gen');
  const m = await gen.koer({ rod, familie: ['koerekort'], stille: true, ud: path.join(rod, 'findes-ikke.json') });
  fs.writeFileSync(path.join(rod, 'scripts', 'kritisk-manifest.json'), JSON.stringify(m));
  return { rod, m };
}

test('generator: zonen tager det synlige + skjulte skjul-regler med, og lader det langt nede ude', async t => {
  if (!(await browserKlar())) return t.skip('Playwright/Chromium mangler');
  const { rod, m } = await lavFixtureMedManifest();
  const kopi = medKritisk(rod, 'koerekort');
  const h = fs.readFileSync(path.join(kopi, 'koerekort-a2.html'), 'utf8');
  const krit = h.match(/<style id="critical">([\s\S]*?)<\/style>/)[1];
  assert.ok(krit.includes('.hero{display:flex;height:50px}') && krit.includes('.hero{background:#eee}'), krit);
  assert.ok(krit.includes('.nede{'), 'element i zonen');
  assert.ok(krit.includes('.skjult{display:none}'), 'skjul-regel tages med');
  assert.ok(krit.includes('@media (min-width:700px){.hero{height:70px}}'), 'media-omslag bevaret for kritisk del: ' + krit);
  assert.ok(!krit.includes('.langt'), '3000px under folden hoerer ikke til udsnittet: ' + krit);
  assert.ok(m.familier.koerekort.krit.length >= 5);
});

test('browser: kritisk udsnit alene giver samme stilarter og geometri over folden som det fulde ark (fixture)', async t => {
  const pw = await browserKlar();
  if (!pw) return t.skip('Playwright/Chromium mangler');
  const { rod } = await lavFixtureMedManifest();
  const kopi = medKritisk(rod, 'koerekort');
  for (const vp of [[390, 844], [1440, 900]]){
    const fuld = await tagSnapshot(pw, { rod, side: 'koerekort-a2.html', vp });
    const kritAlene = await tagSnapshot(pw, { rod: kopi, side: 'koerekort-a2.html', vp, blokerSenere: true });
    assert.deepStrictEqual(sammenlign(fuld, kritAlene), [], 'kritisk alene = fuldt ark over folden @' + vp[0]);
    const efterLoad = await tagSnapshot(pw, { rod: kopi, side: 'koerekort-a2.html', vp });
    assert.deepStrictEqual(sammenlign(fuld, efterLoad, { streng: true }), [], 'efter load = fuldt ark @' + vp[0]);
  }
});

const COMMITTET = [
  // maerke er bevidst IKKE aktiveret (ikon-svg i fremhævet kort ustylet @1440, se scripts/kritisk-familier.js) og testes derfor ikke her.
  ['koerekort-a2.html', 'koerekort'], ['type-sport.html', 'type'], ['guide-a2-koerekort.html', 'guide'],
  ['login.html', 'login'], // index.html (forside) og soegning.html: ikke aktiveret (se scripts/kritisk-familier.js)
];

for (const vp of [[390, 844], [1440, 900]]){
  test(`browser: kritisk alene = fuldt ark over folden paa committede sider (${vp[0]}px)`, async t => {
    const pw = await browserKlar();
    if (!pw) return t.skip('Playwright/Chromium mangler');
    const m = JSON.parse(fs.readFileSync(path.join(__dirname, 'kritisk-manifest.json'), 'utf8'));
    const rod = fs.mkdtempSync(path.join(os.tmpdir(), 'w12kc-'));
    for (const d of ['css', 'js', 'fonts', 'img', 'scripts']) fs.cpSync(path.join(REPO, d), path.join(rod, d), { recursive: true, filter: s => !/\.test\.js$/.test(s) });
    for (const [f] of COMMITTET) fs.copyFileSync(path.join(REPO, f), path.join(rod, f));
    for (const f of fs.readdirSync(REPO)) if (/^(package\.json|CNAME|robots\.txt|404\.html)$/.test(f)) fs.copyFileSync(path.join(REPO, f), path.join(rod, f));
    const kopi = medKritisk(rod, COMMITTET.map(x => x[1]).join(','));
    const afvigelser = [];
    for (const [f, fam] of COMMITTET){
      assert.ok(m.familier[fam], fam);
      assert.ok(fs.readFileSync(path.join(kopi, f), 'utf8').includes('<style id="critical">'), `${f} fik ingen blok`);
      const fuld = await tagSnapshot(pw, { rod, side: f, vp });
      const kritAlene = await tagSnapshot(pw, { rod: kopi, side: f, vp, blokerSenere: true });
      const d1 = sammenlign(fuld, kritAlene);
      if (d1.length) afvigelser.push(`${f}@${vp[0]}: kritisk alene afviger fra fuldt ark: ${d1.slice(0, 2).join(' | ')}`);
      const efter = await tagSnapshot(pw, { rod: kopi, side: f, vp });
      const d2 = sammenlign(fuld, efter, { streng: true });
      if (d2.length) afvigelser.push(`${f}@${vp[0]}: efter load afviger fra fuldt ark: ${d2.slice(0, 2).join(' | ')}`);
    }
    assert.deepStrictEqual(afvigelser, [], 'afvigelser (samlet)');
  });
}

test('browser: moerkt tema giver samme stilarter med kritisk alene (committede sider)', async t => {
  const pw = await browserKlar();
  if (!pw) return t.skip('Playwright/Chromium mangler');
  const rod = fs.mkdtempSync(path.join(os.tmpdir(), 'w12kd-'));
  for (const d of ['css', 'js', 'fonts', 'img', 'scripts']) fs.cpSync(path.join(REPO, d), path.join(rod, d), { recursive: true, filter: s => !/\.test\.js$/.test(s) });
  for (const f of ['koerekort-a2.html', 'maerke-honda.html']) fs.copyFileSync(path.join(REPO, f), path.join(rod, f));
  fs.copyFileSync(path.join(REPO, 'package.json'), path.join(rod, 'package.json'));
  const kopi = medKritisk(rod, 'koerekort,maerke');
  for (const f of ['koerekort-a2.html', 'maerke-honda.html']){
    const fuld = await tagSnapshot(pw, { rod, side: f, vp: [390, 844], tema: 'dark' });
    const kritAlene = await tagSnapshot(pw, { rod: kopi, side: f, vp: [390, 844], blokerSenere: true, tema: 'dark' });
    assert.deepStrictEqual(sammenlign(fuld, kritAlene), [], `${f}: moerkt tema`);
  }
});
