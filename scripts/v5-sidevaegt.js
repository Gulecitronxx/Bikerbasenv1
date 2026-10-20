/* V5 sidevægts- og data.js-vagt — måler gzip-størrelse af de tunge filer og sider, så vækst opdages.

   Kør:  node scripts/v5-sidevaegt.js                         (statisk: alle rod-*.html + js/css-filer, ingen browser)
         node scripts/v5-sidevaegt.js --browser               (+ målt overførsel i Chromium for de tunge sider)
         node scripts/v5-sidevaegt.js --rod C:\sti\til\build --budget scripts/v5-sidevaegt.budget.json
         node scripts/v5-sidevaegt.js --gem-budget            (skriv nyt budget = nuværende størrelser + luft; kun ved BEVIDST vækst)
         node scripts/v5-sidevaegt.js --rapport work/v5-vaegt.json

   Målinger (alle gzip niveau 6, som en almindelig CDN; billeder/fonte tæller råt, de er allerede komprimeret):
     filer    gzip af hver js/*.js og css/*.css (js/data.js er den største delte fil; den læses af ALLE sider)
     sider    pr. HTML-side: HTML + de scripts/stylesheets den selv peger på (gzip) + preloadede fonte (rå)
              = det en besøgende MINDST skal hente, før siden virker. Billeder er ikke med (de lazy-loades).
     browser  (kun --browser) faktisk overførsel pr. side i Chromium med syntetiske fixtures: first-party svar, gzip for tekst.
              Fanger det statiske tal ikke ser: dynamiske imports, billeder, fonte hentet via CSS.

   Budget (scripts/v5-sidevaegt.budget.json): maks gzip-bytes pr. fil og pr. side (+ en generel grænse for ikke-listede
   sider). Overskridelse = fejl. Budgettet sættes til nuværende størrelse + luft (filer 10 %, sider 8 %), så en ny afhængighed eller et
   udtræk af data i en delt fil bliver set i test og ikke først hos brugerne. Er væksten bevidst, så kør --gem-budget
   og forklar hvorfor i commit-beskeden.

   Exit 0 = inden for budget, 1 = overskredet, 2 = kunne ikke køre. */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const REPO = path.join(__dirname, '..');
const BUDGET_FIL = path.join(__dirname, 'v5-sidevaegt.budget.json');
const LUFT = { filer: 1.10, sider: 1.08, browser: 1.10 };
/* Sider der altid måles i browseren med --browser (de tungeste/mest besøgte familier). */
const BROWSER_SIDER = ['index.html', 'soegning.html', 'annonce.html', 'dashboard.html', 'mine-annoncer.html', 'opret-annonce.html', 'maerker.html', 'maerke-honda.html', 'login.html', 'guides.html'];

const gz = buf => zlib.gzipSync(buf, { level: 6 }).length;
const laes = (rod, rel) => { try { return fs.readFileSync(path.join(rod, rel)); } catch (e) { return null; } };
const afrund = n => Math.ceil(n / 100) * 100;

/* ---------- Statisk ---------- */

function lokalSti(href) {
  if (!href || /^(https?:)?\/\//i.test(href) || /^(data|mailto|tel):/i.test(href)) return null;
  const ren = href.split('#')[0].split('?')[0];
  return ren ? ren.replace(/^\/+/, '') : null;
}

function filVaegt(rod) {
  const ud = {};
  for (const mappe of ['js', 'css']) {
    let navne = [];
    try { navne = fs.readdirSync(path.join(rod, mappe)); } catch (e) { /* ingen mappe */ }
    for (const n of navne.sort()) {
      if (!/\.(js|css)$/.test(n) || /\.test\.js$/.test(n)) continue;
      const buf = laes(rod, `${mappe}/${n}`);
      if (buf) ud[`${mappe}/${n}`] = { bytes: buf.length, gzip: gz(buf) };
    }
  }
  return ud;
}

function sideVaegt(rod, filer) {
  const ud = {};
  for (const f of fs.readdirSync(rod).filter(x => /\.html$/.test(x)).sort()) {
    const html = fs.readFileSync(path.join(rod, f));
    const h = html.toString('utf8');
    const ref = new Set();
    let fonte = 0;
    for (const m of h.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)) { const s = lokalSti(m[1]); if (s) ref.add(s); }
    for (const m of h.matchAll(/<link\b[^>]*>/g)) {
      const tag = m[0];
      const href = (tag.match(/\bhref="([^"]+)"/) || [])[1];
      const s = lokalSti(href);
      if (!s) continue;
      if (/\brel="stylesheet"/.test(tag) || /\bas="style"/.test(tag) && /\brel="preload"/.test(tag)) ref.add(s);
      else if (/\bas="font"/.test(tag)) { const b = laes(rod, s); if (b) fonte += b.length; }
    }
    let js = 0, css = 0, mangler = 0;
    const dele = [];
    for (const s of ref) {
      const e = filer[s] || (() => { const b = laes(rod, s); return b ? { gzip: gz(b) } : null; })();
      if (!e) { mangler++; continue; }
      if (/\.css$/.test(s)) css += e.gzip; else js += e.gzip;
      dele.push([s, e.gzip]);
    }
    const htmlGz = gz(html);
    ud[f] = { html: htmlGz, js, css, fonte, mangler, i_alt: htmlGz + js + css + fonte, stoerste: dele.sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s, b]) => `${s} ${b}`) };
  }
  return ud;
}

/* ---------- Browser ---------- */

async function browserVaegt(rod, sider, pw) {
  const sb = require('./smoke-browser');
  const { server, port } = await sb.startServer(rod);
  const base = `http://127.0.0.1:${port}`;
  const browser = await pw.chromium.launch({ headless: true });
  const ud = {};
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'da-DK', serviceWorkers: 'block' });
    await ctx.addInitScript(sb.initScript, { tema: 'light' });
    await sb.installerMock(ctx, port, {});
    for (const side of sider) {
      if (!fs.existsSync(path.join(rod, side))) continue;
      const p = await ctx.newPage();
      const typer = {};
      const tael = (type, n) => { typer[type] = (typer[type] || 0) + n; };
      let filer = 0;
      p.on('response', async r => {
        try {
          if (!r.url().startsWith(base)) return;
          const b = await r.body();
          const ct = r.headers()['content-type'] || '';
          const tekst = /text|javascript|json|svg|xml/.test(ct);
          const type = /html/.test(ct) ? 'html' : /javascript/.test(ct) ? 'js' : /css/.test(ct) ? 'css' : /font|woff/.test(ct) ? 'fonte' : /image/.test(ct) ? 'billeder' : 'andet';
          tael(type, tekst ? gz(b) : b.length); filer++;
        } catch (e) { /* afbrudt */ }
      });
      try {
        await p.goto(`${base}/${side}${side === 'annonce.html' ? '?id=00000000-0000-4000-8000-000000000001' : ''}`, { waitUntil: 'load', timeout: 25000 });
        await p.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
        await p.waitForTimeout(400);
        const i_alt = Object.values(typer).reduce((a, b) => a + b, 0);
        const slut = new URL(p.url()).pathname.replace(/^\/+/, '');
        ud[side] = { i_alt, filer, ...typer, ...(slut && slut !== side ? { omdirigeret_til: slut } : {}) };
      } catch (e) { ud[side] = { fejl: String(e.message).split('\n')[0] }; }
      await p.close();
    }
    await ctx.close();
  } finally {
    await Promise.race([browser.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]);
    server.close();
  }
  return ud;
}

/* ---------- Budget ---------- */

function lavBudget(maal) {
  const b = { version: 1, beskrivelse: 'Maks gzip-bytes (niveau 6). Nuværende størrelse + luft (filer 10 %, sider 8 %, browser 10 %), rundet op til 100 B. Hæves kun bevidst (node scripts/v5-sidevaegt.js --gem-budget).', filer: {}, sider: {}, browser: {} };
  /* Kun delte kerne-filer får individuelt budget (alle js/css; nye filer uden budget fanges af "ny-fil-uden-budget"). */
  for (const [f, e] of Object.entries(maal.filer)) b.filer[f] = afrund(e.gzip * LUFT.filer);
  for (const [s, e] of Object.entries(maal.sider)) b.sider[s] = afrund(e.i_alt * LUFT.sider);
  for (const [s, e] of Object.entries(maal.browser || {})) if (e.i_alt) b.browser[s] = afrund(e.i_alt * LUFT.browser);
  b.sider_standard = Math.max(...Object.values(maal.sider).map(e => e.i_alt)) > 0 ? afrund(Math.max(...Object.values(maal.sider).map(e => e.i_alt)) * LUFT.sider) : 0;
  return b;
}

function vurder(maal, budget) {
  const fund = [];
  const f = (niveau, tjek, hvad, detalje) => fund.push({ niveau, tjek, hvad, detalje });
  for (const [fil, e] of Object.entries(maal.filer)) {
    const maks = budget.filer && budget.filer[fil];
    if (maks == null) { f('fejl', 'ny-fil-uden-budget', fil, `${fil} er ny (${e.gzip} B gzip) og har intet budget — kør --gem-budget, når den er bevidst`); continue; }
    if (e.gzip > maks) f('fejl', 'fil-over-budget', fil, `${e.gzip} B gzip > budget ${maks} B (+${e.gzip - maks} B)`);
  }
  for (const [fil, maks] of Object.entries(budget.filer || {})) if (!maal.filer[fil]) f('info', 'budget-uden-fil', fil, 'budgettet har en fil, der ikke findes mere (fjern den fra budgettet)');
  for (const [side, e] of Object.entries(maal.sider)) {
    const maks = (budget.sider && budget.sider[side]) != null ? budget.sider[side] : budget.sider_standard;
    if (e.mangler) f('fejl', 'side-ressource-mangler', side, `${e.mangler} lokale script/css-referencer findes ikke`);
    if (maks != null && e.i_alt > maks) f('fejl', 'side-over-budget', side, `${e.i_alt} B (html ${e.html} + js ${e.js} + css ${e.css} + fonte ${e.fonte}) > budget ${maks} B (+${e.i_alt - maks} B); største: ${e.stoerste.join(', ')}`);
  }
  for (const [side, e] of Object.entries(maal.browser || {})) {
    if (e.fejl) { f('fejl', 'browser-indlaesning', side, e.fejl); continue; }
    const maks = budget.browser && budget.browser[side];
    if (maks != null && e.i_alt > maks) f('fejl', 'browser-over-budget', side, `målt overførsel ${e.i_alt} B > budget ${maks} B (+${e.i_alt - maks} B)`);
  }
  return fund;
}

async function koer(opt = {}) {
  const rod = path.resolve(opt.rod || REPO);
  const filer = filVaegt(rod);
  const sider = sideVaegt(rod, filer);
  let browser = null;
  if (opt.browser) {
    const pw = opt.pw || (require('./smoke-browser').findPlaywright());
    if (!pw) throw new Error('Playwright mangler (--browser kræver det).');
    browser = await browserVaegt(rod, opt.browserSider || BROWSER_SIDER, pw);
  }
  const maal = { filer, sider, browser };
  let budget = null;
  try { budget = JSON.parse(fs.readFileSync(opt.budget || BUDGET_FIL, 'utf8')); } catch (e) { /* ingen budgetfil */ }
  const fund = budget ? vurder(maal, budget) : [{ niveau: 'fejl', tjek: 'budget-mangler', hvad: '*', detalje: `${opt.budget || BUDGET_FIL} findes ikke — kør --gem-budget` }];
  const topFiler = Object.entries(filer).sort((a, b) => b[1].gzip - a[1].gzip).slice(0, 8).map(([n, e]) => ({ fil: n, bytes: e.bytes, gzip: e.gzip, budget: budget && budget.filer ? budget.filer[n] : null }));
  const topSider = Object.entries(sider).sort((a, b) => b[1].i_alt - a[1].i_alt).slice(0, 8).map(([n, e]) => ({ side: n, ...e }));
  return { rod, maal, budget, fund, topFiler, topSider, dataJs: filer['js/data.js'] || null };
}

function udskriv(r) {
  const kb = n => (n / 1024).toFixed(1).replace('.', ',') + ' kB';
  const ud = [`V5 sidevægt — rod ${r.rod}`];
  if (r.dataJs) ud.push(`js/data.js: ${kb(r.dataJs.bytes)} rå, ${kb(r.dataJs.gzip)} gzip (budget ${r.budget && r.budget.filer && r.budget.filer['js/data.js'] ? kb(r.budget.filer['js/data.js']) : '-'})`);
  ud.push('', 'Tungeste filer (gzip):');
  for (const f of r.topFiler) ud.push(`  ${f.fil.padEnd(30)} ${kb(f.gzip).padStart(10)}  budget ${f.budget != null ? kb(f.budget) : '-'}`);
  ud.push('', 'Tungeste sider (HTML + egne js/css gzip + preloadede fonte):');
  for (const s of r.topSider) ud.push(`  ${s.side.padEnd(30)} ${kb(s.i_alt).padStart(10)}  (html ${kb(s.html)}, js ${kb(s.js)}, css ${kb(s.css)}, fonte ${kb(s.fonte)})`);
  if (r.maal.browser) {
    ud.push('', 'Målt i Chromium (gzip for tekst, råt for billeder/fonte):');
    for (const [s, e] of Object.entries(r.maal.browser)) ud.push(`  ${s.padEnd(22)} ${e.fejl ? 'FEJL ' + e.fejl : `${kb(e.i_alt).padStart(10)}  ${e.filer} filer${e.omdirigeret_til ? ' (OMDIRIGERET til ' + e.omdirigeret_til + ': ikke logget ind, så begge sider hentes)' : ''}: ${['html', 'js', 'css', 'fonte', 'billeder', 'andet'].filter(k => e[k]).map(k => `${k} ${kb(e[k])}`).join(', ')}`}`);
  }
  ud.push('');
  if (!r.fund.length) ud.push('Alt inden for budget.');
  for (const f of r.fund) ud.push(`${f.niveau.toUpperCase().padEnd(6)} ${f.tjek.padEnd(22)} ${f.hvad}: ${f.detalje}`);
  return ud.join('\n');
}

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], n = () => argv[++i];
    if (a === '--rod') o.rod = n();
    else if (a === '--budget') o.budget = path.resolve(n());
    else if (a === '--browser') o.browser = true;
    else if (a === '--gem-budget') o.gemBudget = true;
    else if (a === '--rapport') o.rapport = path.resolve(n());
    else throw new Error('Ukendt argument: ' + a);
  }
  return o;
}

async function main() {
  let o;
  try { o = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(2); }
  let r;
  try { r = await koer({ ...o, browser: o.browser || o.gemBudget }); } catch (e) { console.error('v5-sidevaegt: ' + e.message); process.exit(2); }
  if (o.gemBudget) {
    const sti = o.budget || BUDGET_FIL;
    fs.writeFileSync(sti, JSON.stringify(lavBudget(r.maal), null, 1) + '\n');
    console.log('Budget skrevet: ' + sti);
    return;
  }
  console.log(udskriv(r));
  if (o.rapport) { fs.mkdirSync(path.dirname(o.rapport), { recursive: true }); fs.writeFileSync(o.rapport, JSON.stringify({ genereret: new Date().toISOString(), ...r }, null, 1)); }
  process.exit(r.fund.some(f => f.niveau === 'fejl') ? 1 : 0);
}

module.exports = { koer, udskriv, filVaegt, sideVaegt, browserVaegt, vurder, lavBudget, gz, BUDGET_FIL, BROWSER_SIDER };

if (require.main === module) main();
