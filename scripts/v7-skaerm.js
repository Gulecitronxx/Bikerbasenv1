#!/usr/bin/env node
/* V7 QA (kritiker): visuel gennemgang af de ti sidefamilier. Tager skaermbilleder (375/430/768/1440/1920, lys+moerk) og
   maaler objektive defekter pr. side: vandret overflow, braekkede billeder, forvraengede billeder, tekst under 12 px,
   tap-maal under 40 px paa mobil, kontrast under 4,5 (stikproeve), afklippet tekst, konsolfejl.
   Brug: node scripts/v7-skaerm.js [--base URL | --lokal] [--ud mappe] [--vp 375,1440] [--sider index,soegning] [--temaer lys,moerk]
   Offentlige sider bruger rigtige data (kun laesning); konto-siderne bruger scripts/fixtures/v6-konto-lager (mock, ingen produktion). */
'use strict';
const fs = require('fs');
const path = require('path');
const sb = require('./smoke-browser');
const { lavKontoBackend } = require('./fixtures/v6-konto-lager');

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const LOKAL = process.argv.includes('--lokal') || !process.argv.includes('--base');
const UD = path.resolve(arg('--ud', 'docs/review/gauntlet/v7/qa/visuel'));
const VP = arg('--vp', '375,430,768,1440,1920').split(',').map(Number);
const TEMAER = arg('--temaer', 'lys,moerk').split(',');
const HOEJDE = { 375: 812, 430: 932, 768: 1024, 1024: 768, 1440: 900, 1920: 1080 };
const ONSKET = arg('--sider', '').split(',').filter(Boolean);
const FULD = !process.argv.includes('--kun-top');

/* de ti familier (mockup -> side). `login` bruger konto-mocken. */
const FAMILIER = [
  { id: 'forside', mockup: 'Forside', side: 'index.html' },
  { id: 'soegning', mockup: 'Motorcykler til salg', side: 'soegning.html' },
  { id: 'annonce', mockup: 'Annonce', side: 'annonce-bmw-r45-1979-59d3a9a1.html' },
  { id: 'annonce-ekstern', mockup: 'Annonce', side: 'annonce-harley-davidson-flhx-2007-541ad405.html' },
  { id: 'opret', mockup: 'Opret annonce', side: 'opret-annonce.html', login: true },
  { id: 'maerker', mockup: 'Maerker', side: 'maerker.html' },
  { id: 'maerke', mockup: 'Maerker', side: 'maerke-honda.html' },
  { id: 'type-sport', mockup: 'Sport motorcykler', side: 'type-sport.html' },
  { id: 'koerekort-a2', mockup: 'Motorcykler til A2', side: 'koerekort-a2.html' },
  { id: 'artikel', mockup: 'Artikel', side: 'guide-a2-koerekort.html' },
  { id: 'login', mockup: 'Login eller opret profil', side: 'login.html', loginUd: true },
  { id: 'mine-annoncer', mockup: 'Mine annoncer', side: 'mine-annoncer.html?tab=oversigt', login: true },
  { id: 'dashboard', mockup: '(forhandler)', side: 'dashboard.html?tab=oversigt', login: true, forhandler: true },
  { id: '404', mockup: '(fejlside)', side: 'findes-ikke-v7.html', tillad404: true },
].filter(f => !ONSKET.length || ONSKET.includes(f.id));

/* Maaling i siden. Kun objektive defekter. */
function maal() {
  const vw = document.documentElement.clientWidth;
  const sync = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none'; };
  const sel = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : '');
  const synlig = el => {
    if (!sync(el)) return false;
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
      if (e.hasAttribute('hidden') || e.hasAttribute('inert')) return false;
      if (s.position === 'fixed' && false) return false;
    }
    return true;
  };
  const ud = { vw, sw: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, fund: [] };
  const tilfoej = (type, el, detalje) => ud.fund.push({ type, el: el ? sel(el) : '', detalje });

  if (ud.sw > vw + 1) {
    const bred = [...document.querySelectorAll('body *')].filter(e => synlig(e) && e.getBoundingClientRect().right > vw + 2 && getComputedStyle(e).position !== 'fixed').slice(0, 4);
    tilfoej('overflow-x', bred[0], `scrollWidth ${ud.sw} > ${vw}; ${bred.map(sel).join(', ')}`);
  }
  // braekkede / forvraengede billeder
  for (const im of document.images) {
    if (!synlig(im)) continue;
    const r = im.getBoundingClientRect();
    if (im.complete && im.naturalWidth === 0 && !/^data:/.test(im.src)) { tilfoej('braekket-billede', im, im.currentSrc.slice(-80)); continue; }
    if (im.naturalWidth && r.width > 30) {
      const fit = getComputedStyle(im).objectFit;
      const nat = im.naturalWidth / im.naturalHeight, vis = r.width / r.height;
      if ((fit === 'fill' || !fit) && Math.abs(nat - vis) / nat > 0.06 && !im.closest('picture source')) tilfoej('forvraengning', im, `naturlig ${nat.toFixed(2)} vist ${vis.toFixed(2)} (${Math.round(r.width)}x${Math.round(r.height)})`);
    }
  }
  // tekst under 12 px + afklippet tekst
  const smaa = new Map(), klip = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!el.childNodes.length) continue;
    const harTekst = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!harTekst || !synlig(el)) continue;
    const s = getComputedStyle(el);
    const fs_ = parseFloat(s.fontSize);
    if (fs_ < 11.5) smaa.set(sel(el), (smaa.get(sel(el)) || 0) + 1);
    if ((s.overflow === 'hidden' || s.overflowX === 'hidden') && s.textOverflow !== 'ellipsis' && !/clamp/.test(s.webkitLineClamp || '') && s.webkitLineClamp === 'none' && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && s.whiteSpace !== 'nowrap' && el.scrollHeight <= el.clientHeight + 2)
      klip.push(sel(el) + ` (${el.scrollWidth}>${el.clientWidth}) "${el.textContent.trim().slice(0, 30)}"`);
    if (s.overflow === 'hidden' && s.webkitLineClamp === 'none' && el.scrollHeight > el.clientHeight + 3 && el.clientHeight > 8 && s.maxHeight !== 'none') klip.push(sel(el) + ` (h ${el.scrollHeight}>${el.clientHeight}) "${el.textContent.trim().slice(0, 30)}"`);
  }
  [...smaa.entries()].slice(0, 6).forEach(([k, n]) => tilfoej('tekst<11.5px', null, `${k} x${n}`));
  klip.slice(0, 5).forEach(k => tilfoej('afklippet-tekst', null, k));
  // tap-maal (kun interaktive, synlige, paa smalle skaerme)
  if (vw <= 768) {
    const smal = [];
    for (const el of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, summary, [role=button]')) {
      if (!synlig(el)) continue;
      const r = el.getBoundingClientRect();
      if (el.matches('input[type=checkbox],input[type=radio]') && el.closest('label')) continue;
      if (el.closest('.skip-link, .sr-only')) continue;
      const ret = el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.closest('p, li, .prose, article'); // inline-links i broedtekst er undtaget (WCAG 2.5.8)
      if (ret) continue;
      if (r.height < 36 || r.width < 36) smal.push(sel(el) + ` ${Math.round(r.width)}x${Math.round(r.height)} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 20)}"`);
    }
    if (smal.length) tilfoej('tap-maal<36px', null, `${smal.length}: ${smal.slice(0, 5).join(' | ')}`);
  }
  // kontrast: stikproeve af tekst-blade (kun solide baggrunde)
  const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const bag = el => {
    let lag = [];
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.backgroundImage !== 'none') return null;
      const c = parse(s.backgroundColor);
      if (c && c.a > 0) { lag.push(c); if (c.a >= 0.99) break; }
    }
    let b = { r: 255, g: 255, b: 255 };
    if (!lag.length || lag[lag.length - 1].a < 0.99) b = getComputedStyle(document.documentElement).colorScheme.includes('dark') || document.documentElement.dataset.theme === 'dark' ? { r: 17, g: 17, b: 17 } : b;
    for (const c of lag.reverse()) b = { r: c.r * c.a + b.r * (1 - c.a), g: c.g * c.a + b.g * (1 - c.a), b: c.b * c.a + b.b * (1 - c.a) };
    return b;
  };
  const lave = new Map();
  let proeve = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (proeve > 700) break;
    const harTekst = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 2);
    if (!harTekst || !synlig(el) || el.closest('[disabled], .disabled, [aria-disabled=true]')) continue;
    const s = getComputedStyle(el);
    const c = parse(s.color), b = bag(el);
    if (!c || !b) continue;
    proeve++;
    const fg = { r: c.r * c.a + b.r * (1 - c.a), g: c.g * c.a + b.g * (1 - c.a), b: c.b * c.a + b.b * (1 - c.a) };
    const l1 = lum([fg.r, fg.g, fg.b]), l2 = lum([b.r, b.g, b.b]);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const stor = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && Number(s.fontWeight) >= 700);
    if (ratio < (stor ? 3 : 4.5)) lave.set(sel(el) + ' ' + s.color + ' paa ' + `rgb(${b.r | 0},${b.g | 0},${b.b | 0})`, ratio.toFixed(2));
  }
  [...lave.entries()].slice(0, 6).forEach(([k, v]) => tilfoej('kontrast<4.5', null, `${k} = ${v}`));
  return ud;
}

(async () => {
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) { console.error(kan.grund); process.exit(2); }
  fs.mkdirSync(UD, { recursive: true });
  let srv = null, base;
  if (LOKAL) { srv = await sb.startServer(process.cwd()); base = `http://127.0.0.1:${srv.port}`; } else base = arg('--base').replace(/\/$/, '');
  const browser = await kan.pw.chromium.launch();
  const rapport = [];
  for (const f of FAMILIER) {
    for (const vp of VP) {
      for (const tema of TEMAER) {
        const farve = tema === 'moerk' ? 'dark' : 'light';
        const bak = (f.login || f.loginUd) ? lavKontoBackend({ forhandler: !!f.forhandler, loggetInd: !!f.login }) : null;
        const ctx = await browser.newContext({ viewport: { width: vp, height: HOEJDE[vp] || 900 }, colorScheme: farve, locale: 'da-DK', serviceWorkers: 'block' });
        await ctx.addInitScript(sb.initScript, { tema: farve });
        if (bak) await bak.installer(ctx, { tema: farve, cookie: true });
        const page = await ctx.newPage();
        const konsol = [];
        page.on('pageerror', e => konsol.push('pageerror: ' + e.message.slice(0, 160)));
        page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) konsol.push('console: ' + m.text().slice(0, 160)); });
        const sidste404 = [];
        page.on('response', r => { if (r.status() >= 400 && !/favicon|fonts\.g/.test(r.url())) sidste404.push(r.status() + ' ' + r.url().slice(-70)); });
        let fund = null, fejl = null;
        try {
          await sb.gaaTil(page, `${base}/${f.side}`, { waitUntil: 'load', timeout: 45000 });
          await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
          // trig lazy-load: rul igennem siden og tilbage
          await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } window.scrollTo(0, 0); });
          await page.waitForTimeout(700);
          fund = await page.evaluate(maal);
          const navn = `${f.id}-${vp}-${tema === 'moerk' ? 'moerk' : 'lys'}.png`;
          await page.screenshot({ path: path.join(UD, navn), fullPage: FULD });
        } catch (e) { fejl = String(e.message).slice(0, 200); }
        rapport.push({ familie: f.id, mockup: f.mockup, vp, tema, fejl, fund, konsol, http: sidste404.filter(x => !(f.tillad404)).slice(0, 4) });
        await ctx.close();
      }
    }
    process.stderr.write(`ok ${f.id}\n`);
  }
  fs.writeFileSync(path.join(UD, 'maalinger.json'), JSON.stringify(rapport, null, 1));
  // kort tabel
  const rows = [];
  for (const r of rapport) {
    const typer = {};
    (r.fund ? r.fund.fund : []).forEach(x => { typer[x.type] = (typer[x.type] || 0) + 1; });
    rows.push(`${r.familie.padEnd(16)} ${String(r.vp).padStart(4)} ${r.tema.padEnd(5)} ${r.fejl ? 'FEJL ' + r.fejl : Object.entries(typer).map(([k, v]) => `${k}:${v}`).join(' ') || '-'}${r.konsol.length ? ' KONSOL:' + r.konsol.length : ''}${r.http.length ? ' HTTP:' + r.http.join(',') : ''}`);
  }
  console.log(rows.join('\n'));
  await browser.close();
  if (srv) srv.server.close();
})().catch(e => { console.error(e); process.exit(1); });
