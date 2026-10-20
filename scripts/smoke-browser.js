/* Offline browser-smoketest af hele sitet — gentagelig, uden netværk og uden Supabase.

   Kør:  node scripts/smoke-browser.js                          (alle rod-*.html, 4 viewports, lys+mørk)
         node scripts/smoke-browser.js --hurtig                 (8 repræsentative sider, 390+1440, lys)
         node scripts/smoke-browser.js --sider index,soegning,maerke-*  --viewports 390,1440  --temaer lys
         node scripts/smoke-browser.js --rapport work/smoke.json --cls 0.05 --strikt
         node scripts/smoke-browser.js --sider soegning --soeg-links --varm --viewports 375,430,768,1440   (V5: søgesiden med dybe links)

   Hvad den gør:
     1. Starter en lokal statisk server (fri port) på repoets rod (--rod <mappe> for en anden).
     2. Åbner siderne i ÉN headless Chromium. ALT udefra blokeres (Playwright route): kald til Supabase
        (REST, storage, auth) besvares med syntetiske fixtures fra scripts/smoke-fixtures.js, så siderne
        hydrerer med 44 eksterne + 3 egne annoncer; billeder fra fremmede værter får et 1x1-png.
        Ingen forespørgsel forlader maskinen. Scriptet læser ikke produktion og skriver kun --rapport.
     3. Måler pr. side × viewport × tema (se TJEK nedenfor), skriver en kort tabel og en JSON-rapport.

   Exit 0 = ingen fejl, 1 = mindst ét fund på niveau "fejl" (eller "advarsel" med --strikt), 2 = kunne ikke køre
   (fx Playwright mangler).

   Brug som modul:  const { koer } = require('./smoke-browser');  await koer({ rod, sider, viewports, temaer, ... }) */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const { eksterneRaekker, restSvar, PNG_1X1, uuid } = require('./smoke-fixtures');
const { lagerRaekker } = require('./fixtures/v5-soegning-lager');

const REPO = path.join(__dirname, '..');

/* Niveau pr. tjek. "fejl" giver exit 1, "advarsel" kun med --strikt. */
const TJEK = {
  'konsolfejl':    'fejl',      // console.error (undtagen blokerede fremmede værter)
  'sidefejl':      'fejl',      // ufanget exception (pageerror)
  'overflow':      'fejl',      // documentElement.scrollWidth > clientWidth
  'tekst-null':    'fejl',      // null / undefined / NaN / [object Object] i synlig tekst
  'h1':            'fejl',      // antal h1 != 1
  'cls':           'fejl',      // sum af layout-shift > tærskel (--cls, standard 0,05)
  'tap-mål':       'advarsel',  // knap/link/felt < 24 px (WCAG 2.5.8)
  'alt-mangler':   'fejl',      // <img> uden alt-attribut
  'csp-script':    'fejl',      // CSP blokerede et script
  'csp-andet':     'advarsel',  // CSP blokerede billede/stil/forbindelse m.m.
  'dødt-link':     'fejl',      // internt href uden fil
  'anker-mangler': 'advarsel',  // #id uden mål på siden
  'ressource-404': 'fejl',      // lokal undertransport (css/js/billede) svarede >= 400
  'indlæsning':    'fejl',      // navigation fejlede / sidens HTTP-status >= 400
  'data-afbrud':   'fejl',      // siden viser "kunne ikke hente annoncer" — mock-hydreringen virkede ikke
};

const VIEWPORT_HOEJDE = { 320: 640, 360: 740, 390: 844, 768: 1024, 1024: 768, 1440: 900 };
const HURTIG_SIDER = ['index', 'soegning', 'annonce', 'maerker', 'maerke-honda', 'type-cruiser', 'login', 'guides'];
const STANDARD_QUERY = { 'annonce.html': `?id=${uuid(1)}` };   // annonce.html uden id er en tom skal

/* V5 (P2-2): søgesiden måles også på DYBE links. Smoke åbnede kun soegning.html uden query, så CLS på ?types=cruiser og ?q=cf+moto (0,076 ved 768 px)
   slap igennem. Sættet dækker hver parameterfamilie og et par kombinationer, og med vilje også adresser UDEN pille (?page=2, ?sort=) og uden træf. */
const SOEGE_LINKS = [
  '?types=cruiser', '?q=cf+moto', '?brands=Honda', '?koerekort=A2', '?sort=price-asc', '?page=2',
  '?brands=BMW&model=R+1300+RS', '?types=cruiser&koerekort=A2', '?brands=Honda&types=cruiser&koerekort=A2&sort=price-asc',
  '?priceMax=60000&yearMin=2010', '?q=xyzzy',
];

/* Det store lager (søge-lagerets 735 rækker, se scripts/fixtures/v5-soegning-lager.js) i stedet for fixture-sættets 44: sidens CLS afhænger af hvor
   mange kort der hydreres, hvor mange der fravælges som uoplyste, og hvor lange titlerne er. */
function lagerSvar(sti, soegeparametre){
  const tabel = String(sti).split('?')[0];
  if (tabel !== 'eksterne_annoncer') return restSvar(sti, soegeparametre);
  const p = soegeparametre || new URLSearchParams(String(sti).split('?')[1] || '');
  const grense = Number(p.get('limit')) || undefined, fra = Number(p.get('offset')) || 0;
  return { status: 200, body: lagerRaekker().slice(fra, grense ? fra + grense : undefined) };
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

/* ---------- Statisk server ---------- */

/* Opløser en URL-sti til en fil under rod: eksakt fil, mappe/index.html eller udvidelsesfri → .html. */
function opslaaFil(rod, urlSti){
  let sti;
  try { sti = decodeURIComponent(String(urlSti).split('?')[0].split('#')[0]); } catch (e) { return null; }
  const rel = sti.replace(/^\/+/, '');
  const abs = path.resolve(rod, rel);
  if (abs !== path.resolve(rod) && !abs.startsWith(path.resolve(rod) + path.sep)) return null;
  const kandidater = [abs];
  if (!rel || rel.endsWith('/')) kandidater.unshift(path.join(abs, 'index.html'));
  if (!path.extname(rel)) kandidater.push(`${abs}.html`, path.join(abs, 'index.html'));
  for (const k of kandidater){
    try { if (fs.statSync(k).isFile()) return k; } catch (e) { /* næste */ }
  }
  return null;
}

/* V5 (P2-6): keep-alive. Chromium åbner mange samtidige forbindelser til loopback; Windows kan løbe tør for bufferplads
   (net::ERR_NO_BUFFER_SPACE, målt 1 af 59 enkeltkørsler og 1 af 336 med 14 processer). Længere keep-alive genbruger forbindelserne i stedet for at
   åbne nye pr. fil. `cache: true` svarer som GitHub Pages (max-age=600) i stedet for no-store, så en anden indlæsning er en VARM cache. */
function startServer(rod, { cache = false } = {}){
  const server = http.createServer((req, res) => {
    const fil = opslaaFil(rod, req.url);
    const send = (status, sti) => {
      res.writeHead(status, {
        'Content-Type': MIME[path.extname(sti).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': cache && status === 200 ? 'public, max-age=600' : 'no-store',
        'Connection': 'keep-alive', 'Keep-Alive': 'timeout=60',
      });
      fs.createReadStream(sti).pipe(res);
    };
    if (fil) return send(200, fil);
    const nf = path.join(rod, '404.html');
    if (fs.existsSync(nf)) return send(404, nf);
    res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('404');
  });
  return new Promise((ok, fejl) => {
    server.keepAliveTimeout = 60000;
    server.headersTimeout = 65000;
    server.once('error', fejl);
    server.listen(0, '127.0.0.1', () => ok({ server, port: server.address().port }));
  });
}

/* ---------- Playwright ---------- */

/* Finder Playwright: almindelig require, PLAYWRIGHT_PATH, repoets node_modules, og hovedmappens node_modules
   (worktrees deler `git rev-parse --git-common-dir`). */
function findPlaywright(){
  const kandidater = ['playwright'];
  if (process.env.PLAYWRIGHT_PATH) kandidater.push(process.env.PLAYWRIGHT_PATH);
  kandidater.push(path.join(REPO, 'node_modules', 'playwright'));
  try {
    const r = spawnSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: REPO, encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) kandidater.push(path.join(path.dirname(r.stdout.trim()), 'node_modules', 'playwright'));
  } catch (e) { /* ingen git */ }
  for (const k of kandidater){
    try { return require(k); } catch (e) { /* næste */ }
  }
  return null;
}

/* Kan en headless Chromium faktisk starte? Svar { ok, grund }. Bruges af testen til at skippe pænt. */
async function playwrightTilgaengelig(){
  const pw = findPlaywright();
  if (!pw) return { ok: false, grund: 'Playwright er ikke installeret (npm i playwright, eller sæt PLAYWRIGHT_PATH).' };
  try {
    const b = await pw.chromium.launch({ headless: true });
    await b.close();
    return { ok: true, pw };
  } catch (e) {
    return { ok: false, grund: `Chromium kunne ikke starte: ${String(e.message).split('\n')[0]} (kør: npx playwright install chromium).` };
  }
}

/* ---------- Måling i siden ---------- */

/* Kører i sidens kontekst efter indlæsning + scroll. Returnerer rene data; vurderingen sker i Node. */
function maalISiden(){
  const doc = document.documentElement;
  const vw = doc.clientWidth;
  const sel = el => {
    if (!el || !el.tagName) return '';
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    else if (typeof el.className === 'string' && el.className.trim()) s += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.');
    return s;
  };
  const synlig = el => {
    try { return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }); }
    catch (e) { return !!(el.getClientRects && el.getClientRects().length); }
  };

  /* Synlig tekst: null / undefined / NaN. */
  const tekstFund = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TITLE', 'TEXTAREA']);
  const RE = /(^|[^\p{L}\p{N}_])(null|undefined|NaN)(?![\p{L}\p{N}_])|\[object Object\]/u;
  for (let n = w.nextNode(); n; n = w.nextNode()){
    const p = n.parentElement;
    if (!p || SKIP.has(p.tagName)) continue;
    const t = n.nodeValue;
    if (!t || !RE.test(t) || !synlig(p)) continue;
    tekstFund.push(`${sel(p)}: "${t.trim().replace(/\s+/g, ' ').slice(0, 80)}"`);
    if (tekstFund.length >= 8) break;
  }

  /* Vandret overflow + de bredeste syndere. */
  const overflow = Math.max(doc.scrollWidth - vw, 0);
  const syndere = [];
  if (doc.scrollWidth > vw){
    const klipper = el => {
      for (let a = el.parentElement; a && a !== document.body && a !== doc; a = a.parentElement){
        const o = getComputedStyle(a).overflowX;
        if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true;
      }
      return false;
    };
    for (const el of document.body.querySelectorAll('*')){
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || r.right <= vw + 1) continue;
      if (!synlig(el) || klipper(el)) continue;
      const pos = getComputedStyle(el).position;
      if (pos === 'fixed') continue;
      syndere.push({ s: sel(el), right: Math.round(r.right), w: Math.round(r.width) });
      if (syndere.length >= 40) break;
    }
    syndere.sort((a, b) => b.right - a.right);
  }

  /* Tap-mål < 24 px. */
  const taplinjer = [];
  const set = new Set();
  const INLINE_OK = el => {
    if (el.tagName !== 'A') return false;
    if (getComputedStyle(el).display !== 'inline') return false;
    const p = el.parentElement;
    return !!p && p.textContent.trim().length > el.textContent.trim().length + 3;   // WCAG 2.5.8: link midt i tekst
  };
  for (const el of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=menuitem]')){
    if (!synlig(el)) continue;
    let mal = el;
    if (el.tagName === 'INPUT' && /^(checkbox|radio)$/.test(el.type)){
      const l = el.closest('label') || (el.id && document.querySelector('label[for="' + CSS.escape(el.id) + '"]'));
      if (l) mal = l;
    }
    const r = mal.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) continue;                 // skjult skip-link / sr-only
    if (r.width >= 24 && r.height >= 24) continue;
    if (INLINE_OK(el)) continue;
    const navn = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    const k = sel(el) + '|' + navn;
    if (set.has(k)) continue;
    set.add(k);
    taplinjer.push(`${sel(el)} "${navn}" ${Math.round(r.width)}x${Math.round(r.height)}`);
  }

  /* Billeder uden alt-attribut. */
  const altMangler = [...document.querySelectorAll('img:not([alt]), input[type=image]:not([alt])')]
    .map(el => (el.getAttribute('src') || '').slice(0, 80) || sel(el));

  /* Interne links (klik-uafhængigt) + anker uden mål. */
  const stier = new Set();
  const ankre = [];
  for (const a of document.querySelectorAll('a[href]')){
    const h = a.getAttribute('href').trim();
    if (!h || h === '#' || /^(mailto|tel|sms|javascript|data|blob):/i.test(h)) continue;
    let u;
    try { u = new URL(h, location.href); } catch (e) { continue; }
    if (u.origin !== location.origin) continue;
    if (u.pathname === location.pathname && u.hash){
      const id = decodeURIComponent(u.hash.slice(1));
      if (id && id !== 'top' && !document.getElementById(id) && !document.getElementsByName(id).length) ankre.push(u.hash);
    } else if (u.pathname !== location.pathname) {
      stier.add(u.pathname);
    }
  }

  return {
    cls: (window.__smoke && window.__smoke.cls) || 0,
    csp: (window.__smoke && window.__smoke.csp) || [],
    h1: document.querySelectorAll('h1').length,
    overflow, syndere: syndere.slice(0, 3),
    tekstFund, taplinjer, altMangler,
    stier: [...stier], ankre: [...new Set(ankre)],
    afbrud: !!document.getElementById('data-afbrud'),
    kort: document.querySelectorAll('[class*="listing-card"], [class*="annoncekort"], article.card').length,
  };
}

/* Init-script: tema, cookiesamtykke, layout-shift-måler, CSP-lytter. Kører før sidens egne scripts. */
function initScript({ tema }){
  try {
    localStorage.setItem('bb_theme', tema);
    localStorage.setItem('bb_cookie_consent', JSON.stringify({ level: 'necessary', date: new Date().toISOString() }));
  } catch (e) { /* ingen storage */ }
  window.__smoke = { cls: 0, csp: [] };
  try {
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__smoke.cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (e) { /* ingen layout-shift-support */ }
  document.addEventListener('securitypolicyviolation', e => {
    window.__smoke.csp.push({ d: e.effectiveDirective || e.violatedDirective, u: String(e.blockedURI || '').slice(0, 120) });
  });
}

/* ---------- Net-mock ---------- */

/* `opt.restSvar` kan erstatte fixture-svaret (V5: det store søge-lager, se lagerSvar()). */
function installerMock(context, port, blokeret, opt = {}){
  const svarFn = opt.restSvar || restSvar;
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
  return context.route('**/*', route => {
    const req = route.request();
    let u;
    try { u = new URL(req.url()); } catch (e) { return route.abort('blockedbyclient'); }
    if (u.hostname === '127.0.0.1' && Number(u.port) === port) return route.continue();

    if (/(^|\.)supabase\.co$/.test(u.hostname)){
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      if (u.pathname.startsWith('/rest/v1/')){
        const { status, body } = svarFn(u.pathname.slice('/rest/v1/'.length) + u.search, u.searchParams);
        return route.fulfill({ status, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
      if (u.pathname.startsWith('/storage/v1/'))
        return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'image/png' }, body: PNG_1X1 });
      return route.fulfill({ status: 401, headers: { ...cors, 'Content-Type': 'application/json' }, body: '{"message":"smoke: ingen session"}' });
    }
    if (req.resourceType() === 'image')
      return route.fulfill({ status: 200, headers: { 'Content-Type': 'image/png' }, body: PNG_1X1 });

    blokeret[u.hostname] = (blokeret[u.hostname] || 0) + 1;
    return route.abort('blockedbyclient');
  });
}

/* ---------- Én måling ---------- */

async function maalSide({ context, base, port, side, query, viewport, tema, tid, clsGraense, cache }){
  const fund = [];
  const tilfoej = (tjek, detalje) => fund.push({ tjek, niveau: TJEK[tjek], detalje });
  const page = await context.newPage();
  const fremmede = new Set();
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const loc = m.location() || {};
    let fremmed = false;
    try { const u = new URL(loc.url); fremmed = !(u.hostname === '127.0.0.1' && Number(u.port) === port) && /^https?:/.test(u.protocol); } catch (e) { /* ingen url */ }
    if (fremmed && /Failed to load resource/i.test(m.text())) return;      // vores egen blokering
    if (/Content[- ]Security[- ]Policy/i.test(m.text())) return;           // tælles som csp-*
    tilfoej('konsolfejl', m.text().slice(0, 200));
  });
  page.on('pageerror', e => tilfoej('sidefejl', String((e && e.message) || e).slice(0, 200)));
  page.on('response', r => {
    const req = r.request();
    if (req.isNavigationRequest() && req.frame() === page.mainFrame()) return;
    try {
      const u = new URL(r.url());
      if (u.hostname === '127.0.0.1' && Number(u.port) === port && r.status() >= 400)
        tilfoej('ressource-404', `${r.status()} ${u.pathname}`);
    } catch (e) { /* data: */ }
  });
  let data = null;
  try {
    const svar = await page.goto(`${base}/${side}${query || ''}`, { waitUntil: 'load', timeout: tid });
    if (svar && svar.status() >= 400 && side !== '404.html') tilfoej('indlæsning', `HTTP ${svar.status()}`);
    await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    await page.waitForTimeout(350);
    /* Scroll hele siden igennem, så sent indlæst indhold (lazy, hydrering) når at flytte layoutet. */
    await page.evaluate(async () => {
      const trin = Math.max(window.innerHeight * 0.8, 200);
      const max = Math.min(document.documentElement.scrollHeight, 30000);
      for (let y = 0; y < max; y += trin){ window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); }
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 250));
    });
    data = await page.evaluate(maalISiden);
  } catch (e) {
    tilfoej('indlæsning', String((e && e.message) || e).split('\n')[0].slice(0, 200));
  }
  await page.close().catch(() => {});

  if (data){
    if (data.overflow > 0)
      tilfoej('overflow', `scrollWidth overstiger clientWidth med ${data.overflow} px` + (data.syndere.length ? ` — ${data.syndere.map(s => `${s.s} (højre kant ${s.right}, bredde ${s.w})`).join('; ')}` : ''));
    for (const t of data.tekstFund) tilfoej('tekst-null', t);
    if (data.afbrud) tilfoej('data-afbrud', 'siden viser #data-afbrud');
    if (data.h1 !== 1) tilfoej('h1', `${data.h1} h1-elementer`);
    if (data.cls > clsGraense) tilfoej('cls', `CLS ${data.cls.toFixed(3)} > ${clsGraense}`);
    if (data.taplinjer.length) tilfoej('tap-mål', `${data.taplinjer.length} under 24 px, fx ${data.taplinjer.slice(0, 3).join('; ')}`);
    if (data.altMangler.length) tilfoej('alt-mangler', `${data.altMangler.length} billede(r): ${data.altMangler.slice(0, 3).join(', ')}`);
    const script = data.csp.filter(c => /^script/.test(c.d));
    const andet = data.csp.filter(c => !/^script/.test(c.d));
    for (const c of script) tilfoej('csp-script', `${c.d} blokerede ${c.u || 'inline'}`);
    if (andet.length) tilfoej('csp-andet', [...new Set(andet.map(c => `${c.d}: ${c.u}`))].slice(0, 3).join('; '));
    for (const a of data.ankre) tilfoej('anker-mangler', a);
  }
  return { side, query: query || '', cache: cache || 'kold', viewport, tema, cls: data ? Number(data.cls.toFixed(4)) : null, h1: data ? data.h1 : null,
           annoncekort: data ? data.kort : null, stier: data ? data.stier : [], fund };
}

/* ---------- Samlet kørsel ---------- */

const TEMA_NAVN = { lys: 'light', light: 'light', mørk: 'dark', moerk: 'dark', dark: 'dark' };
const TEMA_VIS = { light: 'lys', dark: 'mørk' };

function vaelgSider(rod, { sider, hurtig }){
  const alle = fs.readdirSync(rod).filter(f => f.endsWith('.html') && fs.statSync(path.join(rod, f)).isFile()).sort();
  const navn = s => s.endsWith('.html') ? s : `${s}.html`;
  const match = (maal) => {
    const re = new RegExp('^' + maal.split('*').map(x => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
    return alle.filter(f => re.test(navn(f).replace(/\.html$/, '')) || re.test(f));
  };
  if (sider && sider.length) return [...new Set(sider.flatMap(s => match(s.replace(/\.html$/, ''))))];
  if (hurtig){
    const dem = HURTIG_SIDER.map(s => navn(s)).filter(f => alle.includes(f));
    return dem.length ? dem : alle.slice(0, 8);
  }
  return alle;
}

/* V5 (P2-6): kendt OS-støj. Under belastning kan Windows' loopback løbe tør for bufferplads; Chromium logger så
   'Failed to load resource: net::ERR_NO_BUFFER_SPACE' for en LOKAL fil (eller lader navigationen fejle). Er det det ENESTE fund på en måling,
   måles den igen én gang; fundet gemmes som 'transient' i rapporten og tæller hverken som fejl eller advarsel. Kommer fejlen igen, er den ægte. */
const erBufferFejl = f => (f.tjek === 'konsolfejl' || f.tjek === 'indlæsning') && /ERR_NO_BUFFER_SPACE/.test(f.detalje || '');
const kunBufferFejl = m => m.fund.length > 0 && m.fund.every(erBufferFejl);

async function maalMedGenforsoeg(arg, transient){
  const m = await maalSide(arg);
  if (!kunBufferFejl(m)) return m;
  for (const f of m.fund) transient.push({ side: arg.side, query: arg.query || '', viewport: arg.viewport, tema: TEMA_VIS[arg.tema], cache: arg.cache || 'kold', ...f, transient: true });
  const igen = await maalSide(arg);
  igen.genmaalt = true;
  return igen;
}

/* En måling = { side, query }. `sider` kan indeholde en adresse med query ('soegning.html?types=cruiser'). */
function laegJobs(rod, opt, hurtig){
  const jobs = [];
  const tilfoej = (side, query) => { if (!jobs.some(j => j.side === side && j.query === query)) jobs.push({ side, query }); };
  const rene = (opt.sider || []).map(s => String(s).split('?')[0]);
  const filer = vaelgSider(rod, { sider: opt.sider ? rene : null, hurtig });
  const medQuery = new Map();
  for (const s of opt.sider || []){
    const [navn, ...q] = String(s).split('?');
    if (!q.length) continue;
    const k = navn.replace(/\.html$/, '');
    medQuery.set(k, (medQuery.get(k) || []).concat('?' + q.join('?')));
  }
  for (const f of filer){
    const k = f.replace(/\.html$/, '');
    const egne = medQuery.get(k);
    if (egne) egne.forEach(q => tilfoej(f, q));
    else tilfoej(f, (opt.query && opt.query[f]) || STANDARD_QUERY[f] || '');
  }
  if (opt.soegLinks && fs.existsSync(path.join(rod, 'soegning.html'))){
    tilfoej('soegning.html', '');
    SOEGE_LINKS.forEach(q => tilfoej('soegning.html', q));
  }
  return jobs;
}

async function koer(opt = {}){
  const rod = path.resolve(opt.rod || REPO);
  const hurtig = !!opt.hurtig;
  const viewports = (opt.viewports || (hurtig ? [390, 1440] : [320, 390, 768, 1440])).map(Number);
  const temaer = (opt.temaer || (hurtig ? ['lys'] : ['lys', 'mørk'])).map(t => {
    const n = TEMA_NAVN[String(t).toLowerCase()];
    if (!n) throw new Error(`Ukendt tema: ${t} (brug lys eller mørk)`);
    return n;
  });
  const clsGraense = opt.cls != null ? Number(opt.cls) : 0.05;
  const parallel = Math.max(1, Number(opt.parallel) || 3);
  const tid = Number(opt.tid) || 20000;
  const jobs = laegJobs(rod, opt, hurtig);
  if (!jobs.length) throw new Error('Ingen sider matcher.');
  const sider = [...new Set(jobs.map(j => j.side))];
  const stortLager = !!(opt.stortLager || opt.soegLinks);
  const varm = !!opt.varm;

  const pw = opt.pw || (await playwrightTilgaengelig()).pw;
  if (!pw) throw new Error((await playwrightTilgaengelig()).grund);
  const { server, port } = await startServer(rod, { cache: varm });
  const base = `http://127.0.0.1:${port}`;
  const blokeret = {};
  const maalinger = [];
  const transient = [];
  const browser = await pw.chromium.launch({ headless: true });
  const start = Date.now();
  const nyKontekst = async (vp, tema) => {
    const context = await browser.newContext({
      viewport: { width: vp, height: VIEWPORT_HOEJDE[vp] || 900 }, colorScheme: tema, locale: 'da-DK',
      serviceWorkers: 'block', reducedMotion: 'no-preference',
    });
    await context.addInitScript(initScript, { tema });
    await installerMock(context, port, blokeret, stortLager ? { restSvar: lagerSvar } : {});
    return context;
  };
  try {
    for (const vp of viewports){
      for (const tema of temaer){
        const kø = jobs.slice();
        await Promise.all(Array.from({ length: Math.min(parallel, kø.length) }, async () => {
          if (!varm){
            /* Kold cache: serveren siger no-store, så hver indlæsning henter alt, også inden for samme kontekst. */
            const context = await nyKontekst(vp, tema);
            while (kø.length){
              const j = kø.shift();
              const m = await maalMedGenforsoeg({ context, base, port, side: j.side, query: j.query, viewport: vp, tema, tid, clsGraense, cache: 'kold' }, transient);
              maalinger.push(m);
              if (!opt.stille) process.stderr.write('.');
            }
            await context.close();
          } else {
            /* Kold OG varm: en frisk kontekst pr. adresse (tom cache) måles først; samme kontekst indlæser adressen igen med cachen fyldt
               (serveren svarer max-age=600 som GitHub Pages). */
            while (kø.length){
              const j = kø.shift();
              const context = await nyKontekst(vp, tema);
              for (const cache of ['kold', 'varm']){
                const m = await maalMedGenforsoeg({ context, base, port, side: j.side, query: j.query, viewport: vp, tema, tid, clsGraense, cache }, transient);
                maalinger.push(m);
                if (!opt.stille) process.stderr.write('.');
              }
              await context.close();
            }
          }
        }));
      }
    }
  } finally {
    /* close() kan hænge, hvis en side er låst; så dræbes Chromium i stedet for at holde kørslen fanget. */
    await Promise.race([browser.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]);
    try { const pr = browser.process && browser.process(); if (pr && !pr.killed) pr.kill('SIGKILL'); } catch (e) { /* allerede væk */ }
    server.close();
  }
  if (!opt.stille) process.stderr.write('\n');

  /* Døde interne links: samme opløsning som den statiske server, én gang pr. sti. */
  const findes = new Map();
  const dod = sti => { if (!findes.has(sti)) findes.set(sti, !!opslaaFil(rod, sti)); return !findes.get(sti); };
  for (const m of maalinger){
    for (const s of m.stier) if (dod(s)) m.fund.push({ tjek: 'dødt-link', niveau: TJEK['dødt-link'], detalje: s });
    delete m.stier;
  }
  maalinger.sort((a, b) => a.side.localeCompare(b.side) || a.query.localeCompare(b.query) || a.viewport - b.viewport || a.tema.localeCompare(b.tema) || a.cache.localeCompare(b.cache));

  const fund = maalinger.flatMap(m => m.fund.map(f => ({ side: m.side, query: m.query, cache: m.cache, viewport: m.viewport, tema: TEMA_VIS[m.tema], ...f })));
  const perTjek = {};
  for (const f of fund){ const k = (perTjek[f.tjek] = perTjek[f.tjek] || { niveau: f.niveau, antal: 0 }); k.antal++; }
  return {
    genereret: new Date().toISOString(),
    indstillinger: { rod, sider, adresser: jobs.length, viewports, temaer: temaer.map(t => TEMA_VIS[t]), clsGraense, hurtig, stortLager, varm },
    antalMaalinger: maalinger.length,
    varighedSek: Math.round((Date.now() - start) / 1000),
    blokeredeVaerter: blokeret,
    sammenfatning: {
      fejl: fund.filter(f => f.niveau === 'fejl').length,
      advarsler: fund.filter(f => f.niveau === 'advarsel').length,
      transient: transient.length,
      perTjek,
    },
    transient,
    maalinger: maalinger.map(m => ({ ...m, tema: TEMA_VIS[m.tema] })),
    fund,
  };
}

/* Kort tabel: fund grupperet pr. side × tjek, med hvor de blev set. */
function tabel(rapport, { maksLinjer = 80 } = {}){
  const grupper = new Map();
  for (const f of rapport.fund){
    const navn = f.side + (f.query || '');
    const k = `${navn}|${f.tjek}`;
    if (!grupper.has(k)) grupper.set(k, { side: navn, tjek: f.tjek, niveau: f.niveau, hvor: new Set(), detalje: f.detalje });
    grupper.get(k).hvor.add(`${f.viewport}${f.tema === 'mørk' ? 'm' : ''}${f.cache === 'varm' ? 'v' : ''}`);
  }
  const rk = { fejl: 0, advarsel: 1 };
  const rækker = [...grupper.values()].sort((a, b) => rk[a.niveau] - rk[b.niveau] || a.side.localeCompare(b.side) || a.tjek.localeCompare(b.tjek));
  const s = rapport.sammenfatning;
  const adr = rapport.indstillinger.adresser || rapport.indstillinger.sider.length;
  const ud = [`smoke-browser: ${rapport.antalMaalinger} målinger (${adr} adresser × ${rapport.indstillinger.viewports.join('/')} × ${rapport.indstillinger.temaer.join('+')}${rapport.indstillinger.varm ? ' × kold+varm cache' : ''}) på ${rapport.varighedSek}s — ${s.fejl} fejl, ${s.advarsler} advarsler${s.transient ? `, ${s.transient} transient (OS-støj, målt igen)` : ''}`];
  if (rækker.length){
    ud.push('', 'NIVEAU    SIDE                              TJEK           HVOR (m = mørk, v = varm cache)   DETALJE');
    for (const r of rækker.slice(0, maksLinjer))
      ud.push(`${r.niveau.toUpperCase().padEnd(9)} ${r.side.padEnd(33)} ${r.tjek.padEnd(14)} ${[...r.hvor].join(',').padEnd(17)} ${String(r.detalje).slice(0, 110)}`);
    if (rækker.length > maksLinjer) ud.push(`... og ${rækker.length - maksLinjer} grupper til (se JSON-rapporten)`);
    ud.push('', 'Pr. tjek: ' + Object.entries(s.perTjek).map(([k, v]) => `${k}=${v.antal}${v.niveau === 'advarsel' ? '(adv)' : ''}`).join('  '));
  }
  for (const t of (rapport.transient || []).slice(0, 10))
    ud.push(`TRANSIENT ${t.side}${t.query || ''} ${t.viewport}${t.tema === 'mørk' ? 'm' : ''}: ${String(t.detalje).slice(0, 100)} — målt igen`);
  const v = Object.keys(rapport.blokeredeVaerter);
  if (v.length) ud.push('Blokerede fremmede værter (som forventet): ' + v.map(h => `${h}×${rapport.blokeredeVaerter[h]}`).join(', '));
  return ud.join('\n');
}

/* ---------- CLI ---------- */

function parseArgs(argv){
  const o = {};
  const liste = v => String(v).split(',').map(s => s.trim()).filter(Boolean);
  for (let i = 0; i < argv.length; i++){
    const a = argv[i];
    const naeste = () => argv[++i];
    if (a === '--hurtig') o.hurtig = true;
    else if (a === '--strikt') o.strikt = true;
    else if (a === '--stille') o.stille = true;
    else if (a === '--sider') o.sider = liste(naeste());
    else if (a === '--soeg-links') o.soegLinks = true;
    else if (a === '--stort-lager') o.stortLager = true;
    else if (a === '--varm') o.varm = true;
    else if (a === '--viewports') o.viewports = liste(naeste());
    else if (a === '--temaer') o.temaer = liste(naeste());
    else if (a === '--rapport') o.rapport = naeste();
    else if (a === '--cls') o.cls = naeste();
    else if (a === '--rod') o.rod = naeste();
    else if (a === '--parallel') o.parallel = naeste();
    else if (a === '--tid') o.tid = naeste();
    else if (a === '--maks-linjer') o.maksLinjer = Number(naeste());
    else if (a === '--hjælp' || a === '--hjaelp' || a === '-h') o.hjaelp = true;
    else throw new Error(`Ukendt argument: ${a}`);
  }
  return o;
}

const HJAELP = `node scripts/smoke-browser.js [--hurtig] [--sider a,b,maerke-*,soegning.html?types=cruiser] [--viewports 320,390,768,1440] [--temaer lys,mørk]
  [--rapport fil.json] [--cls 0.05] [--strikt] [--rod mappe] [--parallel 3] [--tid 20000] [--maks-linjer 80] [--stille]
  [--soeg-links]   måler også søgesiden på et sæt dybe links (?types, ?q, ?brands, ?koerekort, ?sort, ?page, kombinationer); bruger det store lager
  [--stort-lager]  lager på ~735 annoncer i stedet for 44 (mere som produktion)
  [--varm]         måler hver adresse både med kold og varm cache (serveren svarer max-age=600)`;

async function main(){
  let o;
  try { o = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message + '\n' + HJAELP); process.exit(2); }
  if (o.hjaelp){ console.log(HJAELP); return; }
  const kan = await playwrightTilgaengelig();
  if (!kan.ok){ console.error('smoke-browser: kan ikke køre. ' + kan.grund); process.exit(2); }
  let rapport;
  try { rapport = await koer({ ...o, pw: kan.pw }); } catch (e) { console.error('smoke-browser: ' + e.message); process.exit(2); }
  if (o.rapport){
    fs.mkdirSync(path.dirname(path.resolve(o.rapport)), { recursive: true });
    fs.writeFileSync(o.rapport, JSON.stringify(rapport, null, 2));
  }
  console.log(tabel(rapport, { maksLinjer: o.maksLinjer || 80 }));
  if (o.rapport) console.log(`JSON-rapport: ${o.rapport}`);
  const s = rapport.sammenfatning;
  process.exit(s.fejl || (o.strikt && s.advarsler) ? 1 : 0);
}

if (require.main === module) main();

module.exports = { startServer, installerMock, initScript, koer, tabel, parseArgs, playwrightTilgaengelig, findPlaywright, opslaaFil, vaelgSider, laegJobs, lagerSvar, kunBufferFejl, SOEGE_LINKS, TJEK, HURTIG_SIDER, eksterneRaekker };
