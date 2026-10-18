/* V3 regressionsrunner — kører mod en LOKAL mappe, rapporterer pr. side. Ingen netværk ud af maskinen
   (Supabase besvares af smoke-browserens fixtures).

   Kør:  node scripts/v3-regression.js                              (alle sider, 375/430/768/1440/1920, lys+mørk)
         node scripts/v3-regression.js --hurtig                     (8 sider, 375+1440, lys)
         node scripts/v3-regression.js --rod C:\sti\til\mappe --sider index,soegning --rapport work/v3.json
         node scripts/v3-regression.js --uden-brave                 (spring blokker-simulationen over)

   Fase 1 — smoke-browser (konsolfejl, sidefejl, overflow, null/undefined i tekst, h1, CLS, alt, CSP, døde links,
            ressource-404) over den nye viewport-matrix.
   Fase 2 — pr. side ved 1440 og 375 (kun uden --hurtig for 375):
            * billeder: <img> der er færdige men naturalWidth = 0 (ikke-fixture-billeder tæller ikke)
            * vægt: bytes over lokal server (HTML+CSS+JS+fonte+billeder) og LCP (ms)
            * overlap: synlige knapper/links hvis rektangler skærer hinanden mere end 40 % (fixed/sticky ignoreres)
            * indholdsblokker-simulation (Brave Shields / uBlock / EasyList Cookie): cookie-dialogen skjules med
              display:none FØR siden kører — siden skal stadig kunne bruges (intet :modal-element der er skjult, og
              første link kan klikkes). Var rodårsagen til en "død side" hos brugere med cookie-filtre.
   Fase 3 — konsistens på tværs af sider: antal annoncer ("N motorcykler") i h1/hero på forside, søgning og guides
            må ikke være modstridende, når de læser samme datasæt.

   Exit 0 = ingen fejl, 1 = fejl fundet, 2 = kunne ikke køre. */

const fs = require('fs');
const path = require('path');
const smoke = require('./smoke-browser');

const VP_STANDARD = [375, 430, 768, 1440, 1920];
const VP_HOEJDE = { 375: 812, 430: 932, 768: 1024, 1440: 900, 1920: 1080 };

function maalDybt() {
  const synlig = e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 4 && r.height > 4 && c.visibility !== 'hidden' && c.display !== 'none' && c.opacity !== '0' && (!e.checkVisibility || e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })); };
  const fast = e => { for (let n = e; n && n !== document.body; n = n.parentElement) { const p = getComputedStyle(n).position; if (p === 'fixed' || p === 'sticky') return true; } return false; };
  const billeder = [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.currentSrc && !/^data:/.test(i.currentSrc) && synlig(i)).map(i => (i.currentSrc || '').slice(-60));
  const afklippet = e => { const r = e.getBoundingClientRect(); if (r.right <= 0 || r.left >= innerWidth) return true;
    for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) { const c = getComputedStyle(n); if (/(auto|scroll|hidden|clip)/.test(c.overflowX + c.overflowY)) { const a = n.getBoundingClientRect(); if (r.right > a.right + 1 || r.left < a.left - 1 || r.bottom > a.bottom + 1 || r.top < a.top - 1) return true; } }
    return false; };
  const els = [...document.querySelectorAll('a[href],button')].filter(e => synlig(e) && !fast(e) && !afklippet(e) && !e.closest('dialog,[hidden]'));
  const overlap = [];
  const rs = els.slice(0, 400).map(e => ({ e, r: e.getBoundingClientRect() }));
  for (let i = 0; i < rs.length && overlap.length < 5; i++) for (let j = i + 1; j < rs.length; j++) {
    const a = rs[i], b = rs[j];
    if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    const aa = a.r.width * a.r.height, bb = b.r.width * b.r.height;
    if (Math.max(aa, bb) > 6 * Math.min(aa, bb)) continue;   // strakt kortlink under små overlay-knapper er med vilje
    if (w > 4 && h > 4 && (w * h) / Math.min(aa, bb) > 0.4) {
      overlap.push(`${(a.e.textContent || a.e.getAttribute('aria-label') || a.e.tagName).trim().slice(0, 30)} <> ${(b.e.textContent || b.e.getAttribute('aria-label') || b.e.tagName).trim().slice(0, 30)}`); break;
    }
  }
  const lcp = window.__v3 && window.__v3.lcp;
  const h1 = (document.querySelector('h1') || {}).textContent || '';
  const tal = (document.body.innerText.match(/(\d[\d.]*)\s+motorcykler/gi) || []).slice(0, 4);
  return { billeder, overlap, lcp: lcp ? Math.round(lcp) : null, h1: h1.trim().slice(0, 100), tal };
}

function initV3() {
  window.__v3 = { lcp: 0 };
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__v3.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) { /* ingen LCP */ }
}

async function fase2(pw, rod, sider, viewports, tid, stille) {
  const { server, port } = await smoke.startServer(rod);
  const base = `http://127.0.0.1:${port}`;
  const browser = await pw.chromium.launch({ headless: true });
  const ud = [];
  const blok = {};
  try {
    for (const vp of viewports) {
      const ctx = await browser.newContext({ viewport: { width: vp, height: VP_HOEJDE[vp] || 900 }, locale: 'da-DK', serviceWorkers: 'block' });
      await ctx.addInitScript(smoke.initScript, { tema: 'light' });
      await ctx.addInitScript(initV3);
      await smoke.installerMock(ctx, port, blok);
      for (const side of sider) {
        const sti = side + (side === 'annonce.html' ? '?id=00000000-0000-4000-8000-000000000001' : '');
        const bytes = { n: 0, b: 0 };
        const p = await ctx.newPage();
        p.on('response', async r => { try { if (r.url().startsWith(base)) { const b = await r.body(); bytes.n++; bytes.b += b.length; } } catch (e) { /* afbrudt */ } });
        const fund = [];
        try {
          await p.goto(`${base}/${sti}`, { waitUntil: 'load', timeout: tid });
          await p.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
          await p.waitForTimeout(400);
          const d = await p.evaluate(maalDybt);
          if (d.billeder.length) fund.push({ tjek: 'billede-brudt', niveau: 'fejl', detalje: d.billeder.slice(0, 3).join(', ') });
          if (d.overlap.length) fund.push({ tjek: 'overlap', niveau: 'advarsel', detalje: d.overlap.slice(0, 2).join(' | ') });
          if (d.lcp && d.lcp > 2500) fund.push({ tjek: 'lcp', niveau: 'advarsel', detalje: `LCP ${d.lcp} ms (lokalt, uden netværk)` });
          if (bytes.b > 1500 * 1024) fund.push({ tjek: 'vægt', niveau: 'advarsel', detalje: `${Math.round(bytes.b / 1024)} kB over ${bytes.n} filer` });
          ud.push({ side, viewport: vp, kb: Math.round(bytes.b / 1024), filer: bytes.n, lcp: d.lcp, h1: d.h1, tal: d.tal, fund });
        } catch (e) {
          ud.push({ side, viewport: vp, fund: [{ tjek: 'indlæsning', niveau: 'fejl', detalje: String(e.message).split('\n')[0] }] });
        }
        await p.close();
        if (!stille) process.stderr.write('.');
      }
      await ctx.close();
    }
    /* Indholdsblokker-simulation: ingen forhåndssvaret samtykke, cookie-dialogen skjules som af EasyList Cookie. */
    for (const side of sider.filter(s => /^(index|soegning|annonce|maerker|login|guides)\.html$/.test(s))) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'da-DK', serviceWorkers: 'block' });
      await smoke.installerMock(ctx, port, blok);
      await ctx.addInitScript(() => {
        const css = '#cookie-banner,[id*="cookie" i],[class*="cookie" i]{display:none!important}';
        const stil = () => { const s = document.createElement('style'); s.textContent = css; (document.head || document.documentElement).appendChild(s); };
        new MutationObserver((m, o) => { if (document.head) { stil(); o.disconnect(); } }).observe(document, { childList: true, subtree: true });
      });
      const p = await ctx.newPage();
      const fund = [];
      try {
        await p.goto(`${base}/${side}${side === 'annonce.html' ? '?id=00000000-0000-4000-8000-000000000001' : ''}`, { waitUntil: 'load', timeout: tid });
        await p.waitForTimeout(1200);
        const doed = await p.evaluate(() => { const d = document.getElementById('cookie-banner'); return !!(d && d.matches(':modal') && getComputedStyle(d).display === 'none'); });
        if (doed) fund.push({ tjek: 'blokker-doed-side', niveau: 'fejl', detalje: 'skjult cookie-dialog er stadig :modal — resten af siden er inert' });
      } catch (e) { fund.push({ tjek: 'indlæsning', niveau: 'fejl', detalje: String(e.message).split('\n')[0] }); }
      ud.push({ side, viewport: 1440, variant: 'cookie-filter', fund });
      await ctx.close();
    }
  } finally {
    await Promise.race([browser.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]);
    server.close();
  }
  return ud;
}

function fase3(maalinger) {
  const fund = [];
  const tallene = {};
  for (const m of maalinger) {
    if (m.viewport !== 1440 || !m.tal) continue;
    const m1 = (m.h1 + ' ' + m.tal.join(' ')).match(/(\d[\d.]*)\s+motorcykler/i);
    if (m1 && /^(index|soegning|guides)\.html$/.test(m.side)) tallene[m.side] = m1[1];
  }
  const unikke = new Set(Object.values(tallene));
  if (unikke.size > 1) fund.push({ side: '(på tværs)', tjek: 'inkonsistent-tal', niveau: 'advarsel', detalje: JSON.stringify(tallene) });
  return { fund, tallene };
}

function parse(argv) {
  const o = {};
  const liste = s => String(s).split(',').map(x => x.trim()).filter(Boolean);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], n = () => argv[++i];
    if (a === '--hurtig') o.hurtig = true;
    else if (a === '--uden-brave') o.udenBrave = true;
    else if (a === '--sider') o.sider = liste(n());
    else if (a === '--viewports') o.viewports = liste(n()).map(Number);
    else if (a === '--temaer') o.temaer = liste(n());
    else if (a === '--rod') o.rod = n();
    else if (a === '--rapport') o.rapport = n();
    else if (a === '--cls') o.cls = n();
    else throw new Error('Ukendt argument: ' + a);
  }
  return o;
}

async function main() {
  let o;
  try { o = parse(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(2); }
  const rod = path.resolve(o.rod || path.join(__dirname, '..'));
  const kan = await smoke.playwrightTilgaengelig();
  if (!kan.ok) { console.error('v3-regression: ' + kan.grund); process.exit(2); }
  const viewports = o.viewports || (o.hurtig ? [375, 1440] : VP_STANDARD);
  const temaer = o.temaer || (o.hurtig ? ['lys'] : ['lys', 'mørk']);
  const sider = smoke.vaelgSider(rod, { sider: o.sider, hurtig: o.hurtig });

  console.error(`Fase 1: smoke (${sider.length} sider × ${viewports.join('/')} × ${temaer.join('+')})`);
  const s1 = await smoke.koer({ rod, sider: o.sider, hurtig: o.hurtig, viewports, temaer, cls: o.cls, pw: kan.pw });
  console.error('Fase 2: billeder, vægt, LCP, overlap' + (o.udenBrave ? '' : ', blokker-simulation'));
  const d2 = await fase2(kan.pw, rod, sider, o.hurtig ? [1440] : [1440, 375], 20000, false);
  console.error('');
  const k3 = fase3(d2.filter(m => !m.variant));
  if (o.udenBrave) d2.splice(0, d2.length, ...d2.filter(m => !m.variant));

  const pr = {};
  const tilf = (side, f, hvor) => { (pr[side] = pr[side] || []).push({ ...f, hvor }); };
  for (const f of s1.fund) tilf(f.side, f, `${f.viewport}${f.tema === 'mørk' ? 'm' : ''}`);
  for (const m of d2) for (const f of m.fund) tilf(m.side, f, `${m.viewport}${m.variant ? ' ' + m.variant : ''}`);
  for (const f of k3.fund) tilf(f.side, f, '1440');

  let fejl = 0, adv = 0;
  const linjer = [];
  for (const side of Object.keys(pr).sort()) {
    const grp = new Map();
    for (const f of pr[side]) { const k = f.tjek + '|' + f.niveau; if (!grp.has(k)) grp.set(k, { f, hvor: new Set() }); grp.get(k).hvor.add(f.hvor); }
    for (const { f, hvor } of grp.values()) {
      f.niveau === 'fejl' ? fejl++ : adv++;
      linjer.push(`${f.niveau.toUpperCase().padEnd(8)} ${side.padEnd(34)} ${f.tjek.padEnd(18)} [${[...hvor].join(', ')}] ${String(f.detalje).slice(0, 110)}`);
    }
  }
  const lcpListe = d2.filter(m => m.lcp && !m.variant && m.viewport === 1440).map(m => m.lcp);
  const kb = d2.filter(m => m.kb && !m.variant && m.viewport === 1440).map(m => m.kb);
  console.log(`v3-regression: ${s1.antalMaalinger} smoke-målinger + ${d2.length} dybe målinger — ${fejl} fejl, ${adv} advarsler`);
  if (kb.length) console.log(`Vægt@1440 (kB, lokalt): median ${kb.sort((a, b) => a - b)[kb.length >> 1]}, max ${kb[kb.length - 1]}; LCP-median ${lcpListe.sort((a, b) => a - b)[lcpListe.length >> 1] || '-'} ms`);
  console.log(linjer.join('\n') || 'Ingen fund.');
  if (o.rapport) {
    fs.mkdirSync(path.dirname(path.resolve(o.rapport)), { recursive: true });
    fs.writeFileSync(o.rapport, JSON.stringify({ genereret: new Date().toISOString(), rod, smoke: s1.sammenfatning, dybt: d2, konsistens: k3, perSide: pr }, null, 2));
    console.log('JSON-rapport: ' + o.rapport);
  }
  process.exit(fejl ? 1 : 0);
}

if (require.main === module) main().catch(e => { console.error('v3-regression: ' + e.message); process.exit(2); });

module.exports = { VP_STANDARD, parse, fase3, maalDybt };
