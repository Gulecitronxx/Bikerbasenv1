/* Maaler FCP/LCP/CLS foer og efter indlejret kritisk CSS. Kor:
     node scripts/w12-kritisk-maal.js --sider index,soegning,koerekort-a2 [--kor 5] [--profil mobil,desktop]
        [--aktiv alle|navn,navn] [--cookies friske] [--tmp mappe] [--json fil] [--metode ...]

   Opstilling (som builder-w11-perf.md): Chromium via Playwright, CDP: Slow 4G (150 ms RTT, 1,44 Mbit ned),
   4x CPU, 390x844 DPR2 (mobil; desktop 1440x900 uden drosling). Siderne serveres med gzip fra en
   udgiv.js-bygget _site; Supabase mockes (scripts/smoke-fixtures.js); intet forlader maskinen.

   To varianter bygges i hver sin temp-mappe fra COMMITTEDE sider (repoet roeres ikke):
     basis = siderne som de er committet (render-blokerende css) -> udgiv.js
     krit  = samme, men scripts/inline-critical.js (BB_KRITISK=<--aktiv>) + csp-hashes.js -> udgiv.js
   Varianterne maales skiftevis (A,B,A,B ...) saa drift paa maskinen rammer begge. Median af --kor (5).

   Brug som modul: const { lavSite, maal } = require('./w12-kritisk-maal'); */

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const zlib = require('zlib');
const { spawnSync } = require('child_process');
const sb = require('./smoke-browser');
const { lavBackend } = require('./w9-saelger-mock');
const { uuid } = require('./smoke-fixtures');

const REPO = path.join(__dirname, '..');
/* Sider bag login rendres med en fiktiv indlogget forhandler (scripts/w9-saelger-mock.js). */
const LOGGET_IND = new Set(['dashboard', 'mine-annoncer', 'opret-annonce']);
const MAPPER = ['css', 'js', 'fonts', 'img', 'scripts'];

/* Kopierer repoets udgivelsesrelevante filer til `maal` (overskriver; sletter intet) og koerer trinene. */
function lavSite({ maal, env = {}, trin = [] }){
  fs.mkdirSync(maal, { recursive: true });
  for (const m of MAPPER) fs.cpSync(path.join(REPO, m), path.join(maal, m), { recursive: true, force: true, filter: s => !/\.test\.js$/.test(s) });
  for (const f of fs.readdirSync(REPO)){
    const p = path.join(REPO, f);
    if (fs.statSync(p).isFile()) fs.copyFileSync(p, path.join(maal, f));
  }
  const log = [];
  for (const t of trin){
    const r = spawnSync(process.execPath, [path.join(maal, 'scripts', t)], { cwd: maal, encoding: 'utf8', env: { ...process.env, ...env } });
    if (r.status !== 0) throw new Error(`${t} fejlede i ${maal}: ${(r.stderr || r.stdout).slice(0, 600)}`);
    log.push((r.stdout || '').trim().split('\n').pop());
  }
  const u = spawnSync(process.execPath, [path.join(maal, 'scripts', 'udgiv.js')], { cwd: maal, encoding: 'utf8', env: { ...process.env, ...env } });
  if (u.status !== 0) throw new Error(`udgiv.js fejlede i ${maal}: ${(u.stderr || u.stdout).slice(0, 600)}`);
  return { site: path.join(maal, '_site'), log };
}

/* gzip-server over en mappe. Forkomprimerer tekstfiler. */
function startGzipServer(rod){
  const cache = new Map();
  const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
  const server = http.createServer((req, res) => {
    const fil = sb.opslaaFil(rod, req.url);
    if (!fil){ res.writeHead(404); return res.end('404'); }
    const ext = path.extname(fil).toLowerCase();
    let e = cache.get(fil);
    if (!e){
      const raa = fs.readFileSync(fil);
      e = { raa, gz: /\.(html|css|js|json|svg|xml|txt)$/.test(ext) ? zlib.gzipSync(raa, { level: 6 }) : null };
      cache.set(fil, e);
    }
    const gz = e.gz && /gzip/.test(req.headers['accept-encoding'] || '');
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store', ...(gz ? { 'Content-Encoding': 'gzip' } : {}), 'Content-Length': (gz ? e.gz : e.raa).length });
    res.end(gz ? e.gz : e.raa);
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => ok({ server, port: server.address().port })));
}

const INIT = ({ friske }) => {
  if (!friske){
    try { localStorage.setItem('bb_cookie_consent', JSON.stringify({ level: 'necessary', date: new Date().toISOString() })); } catch (e) { /* ingen */ }
  }
  const m = window.__m = { fcp: null, lcp: null, cls: 0, skift: [] };
  try {
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') m.fcp = e.startTime; }).observe({ type: 'paint', buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) m.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) if (!e.hadRecentInput){
        m.cls += e.value;
        m.skift.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4), n: (e.sources || []).slice(0, 2).map(s => s.node && s.node.nodeName ? s.node.nodeName.toLowerCase() + (s.node.className && typeof s.node.className === 'string' ? '.' + s.node.className.split(' ')[0] : '') : '?').join(',') });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (e) { /* ingen support */ }
};

const median = a => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2) + (s.length % 2 ? 0 : 0)] : null; };

async function maalEn({ browser, base, port, side, profil, friske, blokeret }){
  const mobil = profil === 'mobil';
  const context = await browser.newContext({
    viewport: mobil ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: mobil ? 2 : 1, isMobile: mobil, hasTouch: mobil, locale: 'da-DK', serviceWorkers: 'block', colorScheme: 'light',
  });
  await context.addInitScript(INIT, { friske });
  if (LOGGET_IND.has(side)) await lavBackend({ loggetInd: true, forhandler: true, annoncer: [{}, {}, {}] }).installer(context, { tema: null, cookie: !friske });
  else await sb.installerMock(context, port, blokeret);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const bytes = { html: 0, css: 0, js: 0, font: 0, img: 0, andet: 0 };
  const reqs = new Map();
  await cdp.send('Network.enable');
  cdp.on('Network.responseReceived', e => reqs.set(e.requestId, e.response.url));
  cdp.on('Network.loadingFinished', e => {
    const u = reqs.get(e.requestId) || '';
    if (!u.startsWith(base)) return;
    const k = /\.html($|\?)|\/$/.test(u) ? 'html' : /\.css/.test(u) ? 'css' : /\.js/.test(u) ? 'js' : /\.woff2/.test(u) ? 'font' : /\.(webp|png|jpe?g|svg)/.test(u) ? 'img' : 'andet';
    bytes[k] += e.encodedDataLength;
  });
  if (mobil){
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: Math.round(1.44 * 1024 * 1024 / 8), uploadThroughput: Math.round(675 * 1024 / 8) });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  const query = side === 'annonce' ? `?id=${uuid(1)}` : '';
  let m = null;
  try {
    await page.goto(`${base}/${side}.html${query}`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(mobil ? 3000 : 1500);
    m = await page.evaluate(() => ({ fcp: window.__m.fcp, lcp: window.__m.lcp, cls: window.__m.cls, skift: window.__m.skift,
      fuldt: [...document.styleSheets].filter(s => s.href).map(s => s.href.split('/').pop().split('?')[0] + (s.media && s.media.mediaText ? '[' + s.media.mediaText + ']' : '')).join(',') }));
  } finally {
    await context.close().catch(() => {});
  }
  return { ...m, bytes };
}

/* varianter: [{navn, site}] — maales skiftevis. Returnerer {side: {profil: {variant: {...medianer}}}}. */
async function maal({ varianter, sider, kor = 5, profiler = ['mobil'], friske = false, stille = false }){
  const pw = (await sb.playwrightTilgaengelig()).pw;
  const browser = await pw.chromium.launch({ headless: true });
  const servere = [];
  for (const v of varianter){ const s = await startGzipServer(v.site); servere.push(s); v.base = `http://127.0.0.1:${s.port}`; v.port = s.port; }
  const blokeret = {};
  const raa = {};
  try {
    for (const side of sider){
      for (const profil of profiler){
        const celler = Object.fromEntries(varianter.map(v => [v.navn, []]));
        for (const v of varianter) await maalEn({ browser, base: v.base, port: v.port, side, profil, friske, blokeret });   // opvarmning (kasseret): gzip-cache + kold JIT
        for (let i = 0; i < kor; i++){
          for (const v of (i % 2 ? varianter.slice().reverse() : varianter)){
            celler[v.navn].push(await maalEn({ browser, base: v.base, port: v.port, side, profil, friske, blokeret }));
            if (!stille) process.stderr.write('.');
          }
        }
        (raa[side] = raa[side] || {})[profil] = celler;
      }
    }
  } finally {
    await Promise.race([browser.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]);
    servere.forEach(s => s.server.close());
  }
  const sam = {};
  for (const [side, pr] of Object.entries(raa)){
    for (const [profil, celler] of Object.entries(pr)){
      for (const [navn, runs] of Object.entries(celler)){
        const kb = k => median(runs.map(r => r.bytes[k])) / 1024;
        ((sam[side] = sam[side] || {})[profil] = sam[side][profil] || {})[navn] = {
          fcp: Math.round(median(runs.map(r => r.fcp))), lcp: Math.round(median(runs.map(r => r.lcp))),
          cls: +median(runs.map(r => r.cls)).toFixed(4), clsMax: +Math.max(...runs.map(r => r.cls)).toFixed(4),
          kbHtml: +kb('html').toFixed(1), kbCss: +kb('css').toFixed(1), kbJs: +kb('js').toFixed(1),
          kbAlt: +(['html', 'css', 'js', 'font', 'img', 'andet'].reduce((s, k) => s + median(runs.map(r => r.bytes[k])), 0) / 1024).toFixed(1),
          skift: runs.map(r => r.skift).find(s => s.length) || [], fuldt: runs[0].fuldt, runs: runs.map(r => ({ fcp: Math.round(r.fcp), lcp: Math.round(r.lcp), cls: +r.cls.toFixed(4) })),
        };
      }
    }
  }
  return sam;
}

function tabel(sam, basis = 'basis', ny = 'krit'){
  const l = ['side | profil | FCP basis -> krit (%) | LCP basis -> krit (%) | CLS basis -> krit (maks) | KB gz'];
  const pct = (a, b) => a ? `${b > a ? '+' : ''}${Math.round((b - a) / a * 100)}%` : '';
  for (const [side, pr] of Object.entries(sam)){
    for (const [profil, v] of Object.entries(pr)){
      const a = v[basis], b = v[ny];
      if (!a || !b) continue;
      l.push(`${side} | ${profil} | ${a.fcp} -> ${b.fcp} (${pct(a.fcp, b.fcp)}) | ${a.lcp} -> ${b.lcp} (${pct(a.lcp, b.lcp)}) | ${a.cls} -> ${b.cls} (${b.clsMax}) | ${a.kbAlt} -> ${b.kbAlt}`);
    }
  }
  return l.join('\n');
}

module.exports = { lavSite, maal, tabel, startGzipServer };

if (require.main === module){
  (async () => {
    const a = process.argv.slice(2);
    const o = {};
    for (let i = 0; i < a.length; i++){
      const k = a[i];
      if (k === '--sider') o.sider = a[++i].split(',');
      else if (k === '--kor') o.kor = Number(a[++i]);
      else if (k === '--profil') o.profiler = a[++i].split(',');
      else if (k === '--aktiv') o.aktiv = a[++i];
      else if (k === '--cookies') o.friske = a[++i] === 'friske';
      else if (k === '--tmp') o.tmp = path.resolve(a[++i]);
      else if (k === '--json') o.json = path.resolve(a[++i]);
      else throw new Error('Ukendt argument ' + k);
    }
    const tmp = o.tmp || path.join(os.tmpdir(), 'w12-kritisk');
    const basis = lavSite({ maal: path.join(tmp, 'basis') });
    const krit = lavSite({ maal: path.join(tmp, 'krit'), env: { BB_KRITISK: o.aktiv || 'alle', BB_KRITISK_STILLE: '1' }, trin: ['inline-critical.js', 'csp-hashes.js'] });
    console.error('krit:', krit.log.join(' | '));
    const sam = await maal({ varianter: [{ navn: 'basis', site: basis.site }, { navn: 'krit', site: krit.site }], sider: o.sider || ['index'], kor: o.kor || 5, profiler: o.profiler || ['mobil'], friske: !!o.friske });
    console.error('');
    console.log(tabel(sam));
    if (o.json) fs.writeFileSync(o.json, JSON.stringify(sam, null, 1));
  })().catch(e => { console.error('w12-kritisk-maal: ' + e.stack); process.exit(1); });
}
