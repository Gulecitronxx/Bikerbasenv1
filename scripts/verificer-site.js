/* Samlet verifikation af sitet — ét kald i stedet for at huske gaten.

   Kør:  node scripts/verificer-site.js            (alle trin)
         node scripts/verificer-site.js --hurtig   (springer npm test over)
         node scripts/verificer-site.js --med-browser   (tilvalg: trin 8, offline browser-smoketest --hurtig)

   Exit 0 = alt grønt, exit 1 = mindst ét trin fejlede. Scriptet verificerer KUN det, der ligger
   på disken: det kører hverken build.js, udgiv.js, stamp-version.js eller andet, der rammer netværk
   eller Supabase, og det skriver ingen filer.

   Hvert trin er en funktion `tjek…(root)`, der returnerer { navn, ok, fund[] } — så
   scripts/verificer-site.test.js kan få hvert trin til at fejle med fixtures i en temp-mappe. */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { analyser } = require('./seo-audit');
const { sideFakta } = require('./seo-vagt');

const REPO = path.join(__dirname, '..');
const KODEMAPPER = ['js', 'crawler', 'scripts'];

const filer = (dir, ende) => fs.existsSync(dir)
  ? fs.readdirSync(dir).filter(f => f.endsWith(ende) && fs.statSync(path.join(dir, f)).isFile()).sort()
  : [];
const uddrag = tekst => String(tekst || '').trim().split(/\r?\n/).slice(-12).join('\n');

/* (1) */
function tjekSyntaks(root){
  const fund = [];
  for (const mappe of KODEMAPPER){
    for (const f of filer(path.join(root, mappe), '.js')){
      const r = spawnSync(process.execPath, ['--check', path.join(root, mappe, f)], { encoding: 'utf8' });
      if (r.status !== 0) fund.push(`${mappe}/${f}: ${uddrag(r.stderr).split('\n').find(l => /Error/.test(l)) || 'syntaksfejl'}`);
    }
  }
  return { navn: 'node --check (js, crawler, scripts)', ok: !fund.length, fund };
}

/* (2) */
function tjekTests(root){
  const r = spawnSync('npm test', { cwd: root, encoding: 'utf8', shell: true, maxBuffer: 64 * 1024 * 1024 });
  const ok = r.status === 0;
  return { navn: 'npm test', ok, fund: ok ? [] : [`exit ${r.status}`, uddrag(r.stdout + '\n' + r.stderr)] };
}

/* (3) Kører rodens EGEN scripts/synk-header.js, som arbejder på den rod, scriptet ligger i. */
function tjekHeader(root){
  const script = path.join(root, 'scripts', 'synk-header.js');
  if (!fs.existsSync(script)) return { navn: 'synk-header --tjek', ok: false, fund: ['scripts/synk-header.js findes ikke'] };
  const r = spawnSync(process.execPath, [script, '--tjek'], { encoding: 'utf8' });
  return { navn: 'synk-header --tjek', ok: r.status === 0, fund: r.status === 0 ? [] : [uddrag(r.stderr || r.stdout)] };
}

/* (4) */
function tjekSeoAudit(root){
  const { fund: f } = analyser(root);
  const fund = [];
  for (const [k, v] of Object.entries(f)) if (v.length) fund.push(`${k}: ${JSON.stringify(v)}`);
  return { navn: 'seo-audit (title/description/h1)', ok: !fund.length, fund };
}

/* Sitemap → liste af { loc, fil }. loc uden for sidens domæne giver fil = null. */
function sitemapPoster(root){
  const xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(m => m[1].replace(/&amp;/g, '&').trim());
  const base = require('./site-url')(root);
  return locs.map(loc => {
    if (loc !== base && !loc.startsWith(base + '/')) return { loc, fil: null };
    if (loc === base) return { loc, fil: 'index.html' };
    const sti = loc.slice(base.length + 1).split('?')[0];
    return { loc, fil: sti.endsWith('.html') ? sti : `${sti}.html` };
  });
}

/* (5) */
function tjekSitemap(root){
  const navn = "sitemap: URL'er findes og er indekserbare";
  if (!fs.existsSync(path.join(root, 'sitemap.xml'))) return { navn, ok: false, fund: ['sitemap.xml findes ikke'] };
  const fund = [];
  const poster = sitemapPoster(root);
  if (!poster.length) fund.push('sitemap.xml har ingen <loc>');
  const set = new Set();
  for (const { loc, fil } of poster){
    if (set.has(loc)) fund.push(`${loc}: står to gange`);
    set.add(loc);
    if (!fil){ fund.push(`${loc}: uden for sidens domæne`); continue; }
    const sti = path.join(root, fil);
    if (!fs.existsSync(sti)){ fund.push(`${loc}: ${fil} findes ikke`); continue; }
    if (sideFakta(fs.readFileSync(sti, 'utf8')).noindex) fund.push(`${loc}: ${fil} er noindex`);
  }
  return { navn, ok: !fund.length, fund };
}

/* Interne <a href>-mål i en side (uden kommentarer og scripts). */
function interneLinks(html){
  const h = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '');
  const ud = new Set();
  for (const m of h.matchAll(/<a\b[^>]*?\shref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)){
    const ref = (m[1] ?? m[2] ?? '').trim();
    if (!ref || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref)) continue;   // http:, mailto:, tel:, //cdn, #anker
    const sti = ref.split('#')[0].split('?')[0];
    if (sti) ud.add(sti);
  }
  return ud;
}

/* (6) En ref er dækket, når filen findes — eller den er udvidelsesfri og <ref>.html findes (rene adresser). */
function tjekDoedeLinks(root){
  const fund = [];
  const daekket = sti => {
    const rel = sti.replace(/^\/+/, '');
    if (!rel) return true;                                         // "/" = forsiden
    const abs = path.join(root, rel);
    if (fs.existsSync(abs)) return true;
    return !path.extname(rel) && fs.existsSync(`${abs}.html`);
  };
  for (const fil of filer(root, '.html')){
    const html = fs.readFileSync(path.join(root, fil), 'utf8');
    if (sideFakta(html).noindex) continue;
    for (const sti of interneLinks(html)) if (!daekket(sti)) fund.push(`${fil} → ${sti}`);
  }
  return { navn: 'ingen døde interne links på indekserbare sider', ok: !fund.length, fund };
}

/* (7) Test-filer direkte i js/, scripts/, crawler/ der ikke står i package.json "test". */
function manglendeTests(root){
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const kommando = (pkg.scripts && pkg.scripts.test) || '';
  const naevnt = new Set(kommando.split(/\s+/).map(t => t.replace(/^\.\//, '').replace(/\\/g, '/')));
  const mangler = [];
  for (const mappe of KODEMAPPER)
    for (const f of filer(path.join(root, mappe), '.test.js'))
      if (!naevnt.has(`${mappe}/${f}`)) mangler.push(`${mappe}/${f}`);
  return mangler;
}
function tjekTestListe(root){
  const fund = manglendeTests(root).map(f => `${f} står ikke i package.json "test"`);
  return { navn: 'package.json "test" indeholder alle *.test.js', ok: !fund.length, fund };
}

/* (8) VALGFRIT (--med-browser): scripts/smoke-browser.js --hurtig mod roden. Offline (al trafik blokeres, Supabase
   mockes), men starter en headless Chromium, så den er ikke med som standard. Exit 2 = Playwright mangler → FEJL. */
function tjekBrowserSmoke(root){
  const navn = 'smoke (valgfrit, --med-browser)';
  const script = path.join(__dirname, 'smoke-browser.js');
  const r = spawnSync(process.execPath, [script, '--hurtig', '--stille', '--rod', root], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 600000 });
  const ok = r.status === 0;
  return { navn, ok, fund: ok ? [] : [`exit ${r.status}`, ...uddrag((r.stdout || '') + String.fromCharCode(10) + (r.stderr || '')).split(String.fromCharCode(10))] };
}

function koer(root, { hurtig = false, medBrowser = false } = {}){
  const trin = [
    () => tjekSyntaks(root),
    () => hurtig ? { navn: 'npm test', ok: true, sprunget: true, fund: [] } : tjekTests(root),
    () => tjekHeader(root),
    () => tjekSeoAudit(root),
    () => tjekSitemap(root),
    () => tjekDoedeLinks(root),
    () => tjekTestListe(root),
    ...(medBrowser ? [() => tjekBrowserSmoke(root)] : []),
  ];
  return trin.map(t => {
    try { return t(); } catch (e) { return { navn: 'trin kastede fejl', ok: false, fund: [String((e && e.message) || e)] }; }
  });
}

function rapport(resultater){
  const linjer = [];
  resultater.forEach((r, i) => {
    linjer.push(`${r.sprunget ? 'SPRUNGET' : r.ok ? 'OK      ' : 'FEJL    '} (${i + 1}) ${r.navn}`);
    for (const f of r.fund.slice(0, 40)) linjer.push(`           - ${f}`);
    if (r.fund.length > 40) linjer.push(`           ... og ${r.fund.length - 40} til`);
  });
  const fejl = resultater.filter(r => !r.ok).length;
  linjer.push('', fejl ? `verificer-site: ${fejl} af ${resultater.length} trin FEJLEDE.` : `verificer-site: alle ${resultater.length} trin grønne.`);
  return { tekst: linjer.join('\n'), fejl };
}

if (require.main === module){
  const { tekst, fejl } = rapport(koer(REPO, { hurtig: process.argv.includes('--hurtig'), medBrowser: process.argv.includes('--med-browser') }));
  console.log(tekst);
  process.exit(fejl ? 1 : 0);
}

module.exports = { tjekSyntaks, tjekTests, tjekHeader, tjekSeoAudit, tjekSitemap, tjekDoedeLinks, tjekTestListe, tjekBrowserSmoke, manglendeTests, interneLinks, koer, rapport };
