/* V5 cross-browser-kørsel — Chromium, Google Chrome og Microsoft Edge (Playwright-kanaler) mod lokal build og/eller live.

   Playwright her har KUN Chromium (Firefox/WebKit er ikke installeret, og der installeres intet). Chrome og Edge er samme
   motor (Blink), men andre versioner, profiler og standardindstillinger - de fanger versionsforskelle, ikke motorforskelle.
   Motorforskelle (Safari/Firefox) dækkes af scripts/v5-kompatibilitet.js (statisk funktions-/versionsscanning) og af
   --degrader her: siden køres med det en ældre browser ville ignorere fjernet fra CSS'en (:has, @container, color-mix, dvh).

   Kør:  node scripts/v5-krydsbrowser.js                                   (lokal build, alle tilgængelige kanaler, 3 viewports)
         node scripts/v5-krydsbrowser.js --maal lokal,live --kanaler chromium,chrome,msedge
         node scripts/v5-krydsbrowser.js --maal live --sider index,soegning --viewports 390,1440
         node scripts/v5-krydsbrowser.js --degrader                         (ældre-browser-simulering, lokal build, Chromium)
         node scripts/v5-krydsbrowser.js --rod C:\sti\til\build --rapport work/v5-kryds.json --md work/v5-kryds.md --skaerm work/v5-kryds-skaerm

   Live (--maal live) er KUN læsning: sider hentes, ingen formularer sendes, cookie-valget er "Kun nødvendige" (ingen statistik),
   ingen login. Lokal: Supabase besvares af scripts/smoke-fixtures.js (intet forlader maskinen).

   Pr. kanal x mål x side x viewport: konsolfejl, sidefejl, mislykkede/4xx-forespørgsler, vandret overflow, h1-antal, brudte
   billeder, indlæste fonte og et layout-fingeraftryk (dokumenthøjde, headerhøjde, h1-størrelse/-skrifttype, første kort).
   Pr. kanal x mål: funktionsprober (CSS.supports m.m.), cookiedialog (vises, "Kun nødvendige" lukker, huskes efter genindlæsning,
   siden er klikbar), søgning (fritekst + mærkevælger giver annoncer og stemmer), annonceside (h1, pris, billede).
   Exit 0 = ingen fejl, 1 = fejl fundet, 2 = kunne ikke køre. */

const fs = require('fs');
const path = require('path');
const sb = require('./smoke-browser');
const kompat = require('./v5-kompatibilitet');
const { uuid } = require('./smoke-fixtures');

const REPO = path.join(__dirname, '..');
const KANALER = { chromium: undefined, chrome: 'chrome', msedge: 'msedge' };
const SIDER = ['index', 'soegning', 'annonce', 'maerker', 'maerke-honda', 'opret-annonce', 'login', 'guides', 'type-cruiser', 'type-classic', 'type-scooter'];
const VP = { 375: 812, 768: 1024, 1440: 900 };
const LIVE = 'https://bikerbasen.dk';
const CONSENT = { level: 'necessary' };

/* ---------- Funktionsprober (kører i siden) ---------- */

function probeFunktioner() {
  const css = (navn, v) => { try { return CSS.supports(v); } catch (e) { return false; } };
  const rx = s => { try { new RegExp(s); return true; } catch (e) { return false; } };
  return {
    ':has()': css('', 'selector(:has(*))'), '@container (container-type)': css('', 'container-type: inline-size'), 'color-mix()': css('', 'color: color-mix(in srgb, red, blue)'),
    'dvh': css('', 'height: 100dvh'), ':is()': css('', 'selector(:is(a))'), ':focus-visible': css('', 'selector(:focus-visible)'), 'aspect-ratio': css('', 'aspect-ratio: 1/1'),
    'inset': css('', 'inset: 0'), 'text-wrap: balance': css('', 'text-wrap: balance'), 'scrollbar-width': css('', 'scrollbar-width: thin'), 'content-visibility': css('', 'content-visibility: auto'),
    'accent-color': css('', 'accent-color: red'), 'backdrop-filter': css('', 'backdrop-filter: blur(2px)') || css('', '-webkit-backdrop-filter: blur(2px)'), 'mask-image': css('', 'mask-image: linear-gradient(red, blue)'),
    'regex lookbehind': rx('(?<=a)b'), 'regex \\p{L}': (() => { try { new RegExp('\\p{L}', 'u'); return true; } catch (e) { return false; } })(),
    'crypto.randomUUID': typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function', 'inert': 'inert' in HTMLElement.prototype,
    'dialog.showModal': typeof HTMLDialogElement !== 'undefined' && typeof HTMLDialogElement.prototype.showModal === 'function', 'IntersectionObserver': typeof IntersectionObserver === 'function',
    'navigator.clipboard': !!navigator.clipboard, 'Element.checkVisibility': typeof Element.prototype.checkVisibility === 'function', 'structuredClone': typeof structuredClone === 'function',
  };
}

/* ---------- Måling pr. side (kører i siden) ---------- */

function maalSide() {
  const synlig = e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 2 && r.height > 2 && c.visibility !== 'hidden' && c.display !== 'none'; };
  const d = document.documentElement;
  const h1 = document.querySelector('h1');
  const header = document.querySelector('header, .site-header');
  const kort = document.querySelector('.card, [data-listing-id]');
  const rect = e => { if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), t: Math.round(r.top + scrollY) }; };
  const fonte = [...(document.fonts || [])].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '')).sort();
  const tekstNull = /(^|[^\p{L}\p{N}_])(null|undefined|NaN)(?![\p{L}\p{N}_])|\[object Object\]/u.test(document.body.innerText);
  return {
    overflow: d.scrollWidth - d.clientWidth, hoejde: d.scrollHeight, h1n: document.querySelectorAll('h1').length,
    h1: h1 ? { ...rect(h1), tekst: h1.textContent.replace(/\s+/g, ' ').trim().slice(0, 80), fs: getComputedStyle(h1).fontSize, ff: getComputedStyle(h1).fontFamily.split(',')[0].replace(/["']/g, '').trim() } : null,
    header: rect(header), kort: rect(kort), fonte, tekstNull,
    /* iOS Safari zoomer ind, når et felt med skriftstørrelse < 16px får fokus. */
    lilleFelter: [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=submit]):not([type=button]), select, textarea')]
      .filter(e => synlig(e) && parseFloat(getComputedStyle(e).fontSize) < 16)
      .map(e => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : '')} ${getComputedStyle(e).fontSize}`).slice(0, 6),
    brudteBilleder: [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.currentSrc && !/^data:/.test(i.currentSrc) && synlig(i)).map(i => i.currentSrc.slice(-60)).slice(0, 3),
    antalKort: document.querySelectorAll('.card[data-listing-id], [data-listing-id]').length,
  };
}

/* Usynlig/svag tekst: kontrast mellem tekstfarve og nærmeste ikke-gennemsigtige baggrund. Bruges til at afsløre, hvad der sker
   når color-mix()-baggrunde ikke forstås. Returnerer {antalUsynlig, antalSvag, eksempler, noegler}. */
function maalKontrast() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const cache = new Map();
  const rgba = s => {
    if (cache.has(s)) return cache.get(s);
    cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = s; cx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data; const v = [r, g, b, a / 255]; cache.set(s, v); return v;
  };
  const lum = ([r, g, b]) => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const sel = e => { let s = e.tagName.toLowerCase(); if (e.id) s += '#' + e.id; else if (typeof e.className === 'string' && e.className.trim()) s += '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.'); return s; };
  const bagved = e => {
    let lag = [];
    for (let n = e; n; n = n.parentElement) {
      const c = getComputedStyle(n);
      if (c.backgroundImage !== 'none') return null;     // gradient/billede: kan ikke vurderes
      if ([...n.children].some(k => /^(IMG|PICTURE|VIDEO|CANVAS)$/.test(k.tagName) && !k.contains(e) && getComputedStyle(k).position === 'absolute')) return null;   // tekst over et dækkende billede (fliser)
      const b = rgba(c.backgroundColor);
      if (b[3] > 0) { lag.push(b); if (b[3] >= 0.99) break; }
    }
    let [r, g, b] = lag.length && lag[lag.length - 1][3] >= 0.99 ? lag[lag.length - 1] : [255, 255, 255];
    for (let i = lag.length - (lag[lag.length - 1] && lag[lag.length - 1][3] >= 0.99 ? 2 : 1); i >= 0; i--) { const [lr, lg, lb, la] = lag[i]; r = lr * la + r * (1 - la); g = lg * la + g * (1 - la); b = lb * la + b * (1 - la); }
    return [r, g, b];
  };
  const res = { antalUsynlig: 0, antalSvag: 0, eksempler: [], noegler: [] };
  const billeder = [...document.images].map(i => ({ i, r: i.getBoundingClientRect() })).filter(b => b.r.width > 40);
  const overBillede = e => {
    const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
    return billeder.some(b => !b.i.contains(e) && !e.contains(b.i) && x >= b.r.left && x <= b.r.right && y >= b.r.top && y <= b.r.bottom);
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const set = new Set();
  for (let t; (t = walker.nextNode());) {
    const tekst = t.nodeValue.trim();
    const e = t.parentElement;
    if (!tekst || !e || set.has(e) || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(e.tagName)) continue;
    set.add(e);
    const r = e.getBoundingClientRect(); const c = getComputedStyle(e);
    if (r.width < 2 || r.height < 2 || c.visibility === 'hidden' || c.display === 'none' || +c.opacity === 0 || !e.checkVisibility || !e.checkVisibility()) continue;
    if (e.closest('dialog:not([open]), [hidden], [aria-hidden="true"]')) continue;
    if (overBillede(e)) continue;                      // tekst oven på et foto (fliser, hero): kan ikke vurderes
    const bg = bagved(e); if (!bg) continue;
    const fg = rgba(c.color); if (fg[3] < 0.05) continue;
    const m = [fg[0] * fg[3] + bg[0] * (1 - fg[3]), fg[1] * fg[3] + bg[1] * (1 - fg[3]), fg[2] * fg[3] + bg[2] * (1 - fg[3])];
    const l1 = lum(m), l2 = lum(bg); const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const key = sel(e) + '|' + tekst.slice(0, 24);
    if (ratio < 1.3) { res.antalUsynlig++; res.noegler.push(key); if (res.eksempler.length < 5) res.eksempler.push(`${key} (${ratio.toFixed(2)}:1)`); }
    else if (ratio < 3) res.antalSvag++;
  }
  return res;
}

/* ---------- Hjælpere ---------- */

async function startServer(rod) { return sb.startServer(rod); }

function sidesti(side, maal, annonceId) {
  if (side === 'annonce') return maal === 'live' ? (annonceId ? `annonce.html?id=${annonceId}` : null) : `annonce.html?id=${uuid(1)}`;
  return `${side}.html`;
}

function opsaetLytter(p, ejer, ud, erEgen) {
  p.on('console', m => {
    if (m.type() !== 'error') return;
    const loc = m.location() || {};
    if (!erEgen(loc.url || '') && /Failed to load resource/i.test(m.text())) return;      // blokeret fremmed vært (kun lokalt)
    ud.konsol.push(m.text().slice(0, 160));
  });
  p.on('pageerror', e => ud.sidefejl.push(String((e && e.message) || e).slice(0, 160)));
  p.on('requestfailed', r => {
    const u = r.url(); let h = '';
    try { h = new URL(u).hostname; } catch (e) { /* data: */ }
    const egen = erEgen(u) || /(^|\.)supabase\.co$/.test(h);
    if (!egen && ejer !== 'live') return;
    const fejl = r.failure() ? r.failure().errorText : 'fejl';
    ud.fejledeKald.push(egen ? `${fejl} ${u.replace(/^https?:\/\/[^/]+/, '').slice(0, 90)}` : `EKSTERN ${fejl} ${h}${u.replace(/^https?:\/\/[^/]+/, '').slice(0, 40)}`);
  });
  p.on('response', r => { const u = r.url(); if (erEgen(u) && r.status() >= 400 && !r.request().isNavigationRequest()) ud.http.push(`${r.status()} ${u.replace(/^https?:\/\/[^/]+/, '').slice(0, 80)}`); });
}

async function ventKlar(p) {
  await p.waitForLoadState('load').catch(() => {});
  await p.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await p.waitForFunction(() => !window.DATA_STATUS || (window.DATA_STATUS.eksterne !== 'ikke-hentet' && window.DATA_STATUS.egne !== 'ikke-hentet'), null, { timeout: 12000 }).catch(() => {});
  await p.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await p.waitForTimeout(400);
  /* Scroll hele siden igennem (som smoke-browser), så sent indlæst indhold/lazy billeder er på plads før måling. */
  await p.evaluate(async () => { const trin = Math.max(innerHeight * 0.8, 200); const max = Math.min(document.documentElement.scrollHeight, 20000); for (let y = 0; y < max; y += trin) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } scrollTo(0, 0); await new Promise(r => setTimeout(r, 250)); }).catch(() => {});
}

/* ---------- Kørsel pr. kanal x mål ---------- */

async function koerKanal(pw, kanal, maal, opt, rod) {
  const ud = { kanal, maal, version: null, probe: null, sider: [], cookie: null, soegning: null, annonce: null, fatal: null };
  let server = null, base, port = 0, browser;
  try {
    browser = await pw.chromium.launch({ channel: KANALER[kanal], headless: true });
  } catch (e) { ud.fatal = String(e.message).split('\n')[0]; return ud; }
  ud.version = browser.version();
  try {
    if (maal === 'lokal') { const s = await startServer(rod); server = s.server; port = s.port; base = `http://127.0.0.1:${port}`; } else base = LIVE;
    const erEgen = u => { try { const x = new URL(u); return maal === 'lokal' ? (x.hostname === '127.0.0.1' && Number(x.port) === port) : /(^|\.)bikerbasen\.dk$/.test(x.hostname); } catch (e) { return false; } };
    const nyKontekst = async (vp, tema, medConsent = true) => {
      const ctx = await browser.newContext({ viewport: { width: vp, height: VP[vp] || 900 }, locale: 'da-DK', colorScheme: tema === 'mørk' ? 'dark' : 'light', serviceWorkers: 'block' });
      await ctx.addInitScript(({ tema, consent }) => { try { localStorage.setItem('bb_theme', tema); if (consent) localStorage.setItem('bb_cookie_consent', JSON.stringify({ level: 'necessary', date: new Date().toISOString() })); } catch (e) { /* ingen storage */ } }, { tema: tema === 'mørk' ? 'dark' : 'light', consent: medConsent });
      if (maal === 'lokal') await sb.installerMock(ctx, port, {});
      return ctx;
    };

    /* Funktionsprober (én gang) */
    {
      const ctx = await nyKontekst(1440, 'lys'); const p = await ctx.newPage();
      await p.goto(`${base}/${maal === 'lokal' ? 'login.html' : ''}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      ud.probe = await p.evaluate(probeFunktioner); await ctx.close();
    }

    /* Live: find et rigtigt annonce-id på søgesiden */
    let annonceId = null;
    if (maal === 'live' && opt.sider.includes('annonce')) {
      const ctx = await nyKontekst(1440, 'lys'); const p = await ctx.newPage();
      await p.goto(`${base}/soegning.html`, { waitUntil: 'load', timeout: 30000 }); await ventKlar(p);
      annonceId = await p.evaluate(() => { const a = [...document.querySelectorAll('a[href*="annonce.html?id="]')].find(x => /id=[0-9a-f-]{36}/.test(x.getAttribute('href'))); return a ? (a.getAttribute('href').match(/id=([0-9a-f-]{36})/) || [])[1] : null; });
      await ctx.close();
    }

    /* Sider x viewports x temaer */
    for (const vp of opt.viewports) for (const tema of opt.temaer) {
      const ctx = await nyKontekst(vp, tema);
      for (const side of opt.sider) {
        const sti = sidesti(side, maal, annonceId);
        if (!sti) { ud.sider.push({ side, viewport: vp, tema, sprunget: 'intet annonce-id på live' }); continue; }
        const p = await ctx.newPage();
        const m = { side, viewport: vp, tema, konsol: [], sidefejl: [], fejledeKald: [], http: [] };
        opsaetLytter(p, maal, m, erEgen);
        try {
          const svar = await p.goto(`${base}/${sti}`, { waitUntil: 'load', timeout: 30000 });
          m.status = svar ? svar.status() : 0;
          await ventKlar(p);
          m.maal = await p.evaluate(maalSide);
          m.kontrast = await p.evaluate(maalKontrast);
          if (opt.skaerm && (vp === 375 || vp === 1440) && tema === 'lys' && ['index', 'soegning', 'annonce'].includes(side)) {
            fs.mkdirSync(opt.skaerm, { recursive: true });
            await p.screenshot({ path: path.join(opt.skaerm, `${maal}-${kanal}-${side}-${vp}.png`) }).catch(() => {});
          }
        } catch (e) { m.sidefejl.push('indlæsning: ' + String(e.message).split('\n')[0].slice(0, 160)); }
        await p.close();
        ud.sider.push(m);
      }
      await ctx.close();
    }

    /* Cookiedialog (frisk kontekst uden samtykke) */
    {
      const c = { vises: false, modal: false, lukker: false, huskes: false, klikbar: false, fejl: [] };
      const ctx = await nyKontekst(1440, 'lys', false); const p = await ctx.newPage();
      opsaetLytter(p, maal, { konsol: c.fejl, sidefejl: c.fejl, fejledeKald: [], http: [] }, erEgen);
      try {
        await p.goto(`${base}/index.html`, { waitUntil: 'load', timeout: 30000 }); await p.waitForTimeout(1500);
        c.vises = await p.evaluate(() => { const d = document.getElementById('cookie-banner'); return !!d && d.open && d.checkVisibility(); });
        c.modal = await p.evaluate(() => { const d = document.getElementById('cookie-banner'); return !!d && d.matches(':modal'); });
        if (c.vises) {
          await p.click('#cookie-necessary-only', { timeout: 5000 });
          await p.waitForTimeout(500);
          c.lukker = await p.evaluate(() => { const d = document.getElementById('cookie-banner'); return !d || !d.open; });
          c.gemt = await p.evaluate(() => { try { return Object.keys(localStorage).filter(k => /cookie/i.test(k)).map(k => localStorage.getItem(k)); } catch (e) { return null; } });
          c.klikbar = await p.evaluate(() => { const a = document.querySelector('header a[href], nav a[href]'); if (!a) return false; const r = a.getBoundingClientRect(); const x = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!x && (x === a || a.contains(x)); });
          await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1200);
          c.huskes = await p.evaluate(() => { const d = document.getElementById('cookie-banner'); return !d || !d.open; });
        }
      } catch (e) { c.fejl.push(String(e.message).split('\n')[0].slice(0, 160)); }
      ud.cookie = c; await ctx.close();
    }

    /* Søgning */
    {
      const s = { fritekst: null, maerke: null, nulstil: null, fejl: [] };
      const ctx = await nyKontekst(1440, 'lys'); const p = await ctx.newPage();
      opsaetLytter(p, maal, { konsol: s.fejl, sidefejl: s.fejl, fejledeKald: [], http: [] }, erEgen);
      const tal = () => p.evaluate(() => { const m = ((document.getElementById('results-count') || {}).textContent || '').match(/^\s*([\d.]+)/); return m ? Number(m[1].replace(/\./g, '')) : null; });
      try {
        await p.goto(`${base}/soegning.html`, { waitUntil: 'load', timeout: 30000 }); await ventKlar(p);
        s.alle = await tal();
        await p.fill('#filter-q', 'honda'); await p.waitForTimeout(900);
        s.fritekst = await tal();
        s.fritekstKort = await p.evaluate(() => [...document.querySelectorAll('.card[data-listing-id]')].slice(0, 12).filter(c => /honda/i.test(c.textContent)).length);
        await p.fill('#filter-q', ''); await p.waitForTimeout(700);
        await p.selectOption('#so-brand', { label: 'Honda' }).catch(async () => { await p.selectOption('#so-brand', 'Honda'); });
        await p.waitForTimeout(900); s.maerke = await tal();
        await p.selectOption('#so-brand', '').catch(() => {}); await p.waitForTimeout(900); s.nulstil = await tal();
      } catch (e) { s.fejl.push(String(e.message).split('\n')[0].slice(0, 160)); }
      ud.soegning = s; await ctx.close();
    }

    /* Annonce */
    {
      const a = { h1: null, pris: false, billede: false, fejl: [] };
      const sti = sidesti('annonce', maal, annonceId);
      if (sti) {
        const ctx = await nyKontekst(1440, 'lys'); const p = await ctx.newPage();
        opsaetLytter(p, maal, { konsol: a.fejl, sidefejl: a.fejl, fejledeKald: [], http: [] }, erEgen);
        try {
          await p.goto(`${base}/${sti}`, { waitUntil: 'load', timeout: 30000 }); await ventKlar(p);
          const r = await p.evaluate(() => ({ h1: (document.querySelector('h1') || {}).textContent, pris: /\d[\d.]*\s*kr\./i.test(document.body.innerText), billede: [...document.images].some(i => i.complete && i.naturalWidth > 0 && i.getBoundingClientRect().width > 100), tom: !!document.querySelector('.annonce-tom, [data-annonce-tom]') }));
          Object.assign(a, { h1: (r.h1 || '').trim().slice(0, 80), pris: r.pris, billede: r.billede, tom: r.tom });
        } catch (e) { a.fejl.push(String(e.message).split('\n')[0].slice(0, 160)); }
        ud.annonce = a; await ctx.close();
      }
    }
  } catch (e) { ud.fatal = String(e.message).split('\n')[0]; }
  finally {
    await Promise.race([browser.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]);
    if (server) server.close();
  }
  return ud;
}

/* ---------- Ældre-browser-simulering ---------- */

const VARIANTER = [['uaendret', []], ['kontrol (uændret igen)', []], ['uden :has()', ['has']], ['uden @container', ['container']], ['uden color-mix()', ['colormix']], ['uden dvh', ['dvh']], ['alt ovenstående', ['has', 'container', 'colormix', 'dvh']]];

async function koerDegrader(pw, opt, rod) {
  const ud = [];
  const browser = await pw.chromium.launch({ headless: true });
  const { server, port } = await startServer(rod);
  const base = `http://127.0.0.1:${port}`;
  try {
    for (const [navn, valg] of VARIANTER) {
      const r = { variant: navn, sider: [] };
      for (const vp of [375, 1440]) for (const tema of ['lys', 'mørk']) {
        const ctx = await browser.newContext({ viewport: { width: vp, height: VP[vp] || 900 }, locale: 'da-DK', colorScheme: tema === 'mørk' ? 'dark' : 'light', serviceWorkers: 'block' });
        await ctx.addInitScript(({ tema }) => { try { localStorage.setItem('bb_theme', tema); localStorage.setItem('bb_cookie_consent', JSON.stringify({ level: 'necessary', date: new Date().toISOString() })); } catch (e) { /* */ } }, { tema: tema === 'mørk' ? 'dark' : 'light' });
        await sb.installerMock(ctx, port, {});
        if (valg.length) await ctx.route(`${base}/**`, async route => {
          const u = new URL(route.request().url());
          if (!/\.css$/.test(u.pathname) && !/\.html$|\/$/.test(u.pathname)) return route.fallback();
          try {
            const resp = await route.fetch();
            let body = await resp.text();
            if (/\.css$/.test(u.pathname)) body = kompat.degrader(body, valg);
            else body = body.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (m, a, c, z) => a + kompat.degrader(c, valg) + z);
            return route.fulfill({ response: resp, body });
          } catch (e) { return route.fallback(); }
        });
        const kø = opt.sider.filter(s => s !== 'annonce' || true).map(s => [s, sidesti(s, 'lokal')]);
        await Promise.all(Array.from({ length: 3 }, async () => {
          while (kø.length) {
            const [side, sti] = kø.shift();
            const p = await ctx.newPage();
            const m = { side, viewport: vp, tema, konsol: [], sidefejl: [], fejledeKald: [], http: [] };
            opsaetLytter(p, 'lokal', m, u => u.startsWith(base));
            try {
              await p.goto(`${base}/${sti}`, { waitUntil: 'load', timeout: 30000 }); await ventKlar(p);
              m.maal = await p.evaluate(maalSide); m.kontrast = await p.evaluate(maalKontrast);
              if (opt.skaerm && navn === 'alt ovenstående' && tema === 'lys' && ['index', 'soegning', 'annonce'].includes(side)) {
                fs.mkdirSync(opt.skaerm, { recursive: true });
                await p.screenshot({ path: path.join(opt.skaerm, `degraderet-${side}-${vp}.png`) }).catch(() => {});
              }
            } catch (e) { m.sidefejl.push('indlæsning: ' + String(e.message).split('\n')[0].slice(0, 160)); }
            await p.close(); r.sider.push(m);
          }
        }));
        await ctx.close();
      }
      ud.push(r);
      process.stderr.write(`degrader: ${navn}\n`);
    }
  } finally { await Promise.race([browser.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]); server.close(); }
  /* Sammenlign med "uændret": nye overflow, nyt usynligt/svagt tekst, nye konsolfejl. */
  const basis = new Map(ud[0].sider.map(s => [`${s.side}|${s.viewport}|${s.tema}`, s]));
  for (const v of ud.slice(1)) {
    v.diff = [];
    for (const s of v.sider) {
      const b = basis.get(`${s.side}|${s.viewport}|${s.tema}`); if (!b || !b.maal || !s.maal) continue;
      const nyeUsynlige = (s.kontrast.noegler || []).filter(k => !(b.kontrast.noegler || []).includes(k));
      const d = { side: s.side, viewport: s.viewport, tema: s.tema, nyOverflow: s.maal.overflow > 0 && b.maal.overflow <= 0 ? s.maal.overflow : 0, nyeUsynlige: nyeUsynlige.length, eks: nyeUsynlige.slice(0, 3), nyeSvage: Math.max(0, s.kontrast.antalSvag - b.kontrast.antalSvag), hoejdeDiff: s.maal.hoejde - b.maal.hoejde, baseH: b.maal.hoejde, nyKonsol: s.konsol.length - b.konsol.length };
      if (d.nyOverflow || d.nyeUsynlige || d.nyeSvage > 3 || Math.abs(d.hoejdeDiff) > Math.max(40, d.baseH * 0.02) || d.nyKonsol > 0) v.diff.push(d);
    }
    v.sammenfatning = { sider: v.sider.length, medForskel: v.diff.length, nyOverflow: v.diff.filter(d => d.nyOverflow).length, nyeUsynlige: v.diff.reduce((a, d) => a + d.nyeUsynlige, 0), hoejdeAendret: v.diff.filter(d => Math.abs(d.hoejdeDiff) > Math.max(40, d.baseH * 0.02)).length };
  }
  return ud;
}

/* ---------- Vurdering + rapport ---------- */

function vurder(r) {
  const fund = [];
  const f = (niveau, tjek, hvor, detalje) => fund.push({ kanal: r.kanal, maal: r.maal, niveau, tjek, hvor, detalje });
  if (r.fatal) { f('fejl', 'kunne-ikke-koere', '*', r.fatal); return fund; }
  for (const m of r.sider) {
    if (m.sprunget) continue;
    const hvor = `${m.side}@${m.viewport}${m.tema === 'mørk' ? 'm' : ''}`;
    if (m.status >= 400) f('fejl', 'http-status', hvor, `HTTP ${m.status}`);
    for (const k of m.konsol.slice(0, 2)) f('fejl', 'konsolfejl', hvor, k);
    for (const k of m.sidefejl.slice(0, 2)) f('fejl', 'sidefejl', hvor, k);
    for (const k of m.fejledeKald.slice(0, 2)) f(/^EKSTERN /.test(k) ? 'advarsel' : 'fejl', /^EKSTERN /.test(k) ? 'ekstern-forespoergsel' : 'mislykket-forespoergsel', hvor, k.replace(/^EKSTERN /, ''));
    for (const k of m.http.slice(0, 2)) f('fejl', 'ressource-4xx', hvor, k);
    if (m.maal) {
      if (m.maal.overflow > 0) f('fejl', 'vandret-overflow', hvor, `${m.maal.overflow}px`);
      if (m.maal.h1n !== 1) f('fejl', 'h1-antal', hvor, String(m.maal.h1n));
      if (m.maal.brudteBilleder.length) f('fejl', 'brudt-billede', hvor, m.maal.brudteBilleder.join(', '));
      if (m.maal.tekstNull) f('fejl', 'tekst-null', hvor, 'null/undefined/NaN i synlig tekst');
    }
    if (m.maal && m.viewport <= 430 && m.maal.lilleFelter && m.maal.lilleFelter.length) f('advarsel', 'ios-zoom-felt', hvor, `felt under 16px (iOS Safari zoomer ind ved fokus): ${m.maal.lilleFelter.slice(0, 3).join(', ')}`);
    if (m.kontrast && m.kontrast.antalUsynlig) f('advarsel', 'usynlig-tekst', hvor, `${m.kontrast.antalUsynlig}: ${m.kontrast.eksempler.slice(0, 2).join('; ')}`);
  }
  const c = r.cookie;
  if (c) {
    if (!c.vises) f('fejl', 'cookie-vises-ikke', 'index', 'dialogen er ikke åben og synlig ved første besøg');
    else {
      if (!c.modal) f('advarsel', 'cookie-ikke-modal', 'index', ':modal matcher ikke');
      if (!c.lukker) f('fejl', 'cookie-lukker-ikke', 'index', '"Kun nødvendige" lukker ikke dialogen');
      if (!c.klikbar) f('fejl', 'cookie-siden-doed', 'index', 'siden er ikke klikbar efter svar');
      if (!c.huskes) f('fejl', 'cookie-huskes-ikke', 'index', 'dialogen kommer igen efter genindlæsning');
    }
    for (const k of c.fejl.slice(0, 2)) f('fejl', 'cookie-konsolfejl', 'index', k);
  }
  const s = r.soegning;
  if (s) {
    if (!(s.alle > 0)) f('fejl', 'soegning-tom', 'soegning', `ingen annoncer (${s.alle})`);
    if (!(s.fritekst > 0 && s.fritekst < s.alle)) f('fejl', 'soegning-fritekst', 'soegning', `"honda": ${s.fritekst} af ${s.alle}`);
    if (s.fritekstKort === 0 && s.fritekst > 0) f('fejl', 'soegning-fritekst-kort', 'soegning', 'kortene indeholder ikke "honda"');
    if (!(s.maerke > 0 && s.maerke < s.alle)) f('fejl', 'soegning-maerke', 'soegning', `Honda via vælger: ${s.maerke} af ${s.alle}`);
    if (s.nulstil !== s.alle) f('fejl', 'soegning-nulstil', 'soegning', `efter nulstil: ${s.nulstil}, forventet ${s.alle}`);
    for (const k of s.fejl.slice(0, 2)) f('fejl', 'soegning-konsolfejl', 'soegning', k);
  }
  const a = r.annonce;
  if (a) {
    if (!a.h1) f('fejl', 'annonce-h1', 'annonce', 'ingen h1'); if (!a.pris) f('advarsel', 'annonce-pris', 'annonce', 'ingen pris i teksten'); if (!a.billede) f('advarsel', 'annonce-billede', 'annonce', 'intet indlæst billede');
    for (const k of a.fejl.slice(0, 2)) f('fejl', 'annonce-konsolfejl', 'annonce', k);
  }
  return fund;
}

/* Layout-forskelle mellem kanaler for samme mål: sammenligner fingeraftryk mod første kanal. */
function sammenlignKanaler(resultater) {
  const ud = [];
  for (const maal of [...new Set(resultater.map(r => r.maal))]) {
    const rs = resultater.filter(r => r.maal === maal && !r.fatal);
    if (rs.length < 2) continue;
    const [basis, ...andre] = rs;
    const b = new Map(basis.sider.filter(s => s.maal).map(s => [`${s.side}|${s.viewport}|${s.tema}`, s]));
    for (const r of andre) for (const s of r.sider.filter(x => x.maal)) {
      const bs = b.get(`${s.side}|${s.viewport}|${s.tema}`); if (!bs) continue;
      const dh = Math.abs(s.maal.hoejde - bs.maal.hoejde), pct = bs.maal.hoejde ? dh / bs.maal.hoejde : 0;
      const hdr = s.maal.header && bs.maal.header ? Math.abs(s.maal.header.h - bs.maal.header.h) : 0;
      const h1ff = s.maal.h1 && bs.maal.h1 && s.maal.h1.ff !== bs.maal.h1.ff;
      const fonteForskel = JSON.stringify(s.maal.fonte) !== JSON.stringify(bs.maal.fonte);
      const antalForskel = bs.maal.antalKort !== s.maal.antalKort && maal === 'lokal';
      if (pct > 0.02 || hdr > 4 || h1ff || fonteForskel || antalForskel) ud.push({ maal, mod: `${r.kanal} vs ${basis.kanal}`, side: s.side, viewport: s.viewport, tema: s.tema, hoejde: `${s.maal.hoejde} vs ${bs.maal.hoejde}`, headerForskel: hdr, h1Skrift: h1ff ? `${s.maal.h1.ff} vs ${bs.maal.h1.ff}` : null, fonte: fonteForskel ? `${s.maal.fonte.join('/')} vs ${bs.maal.fonte.join('/')}` : null, antalKort: antalForskel ? `${s.maal.antalKort} vs ${bs.maal.antalKort}` : null });
    }
  }
  return ud;
}

function markdown(rapport) {
  const l = ['# Cross-browser-rapport', '', `Genereret ${rapport.genereret}. Rod: ${rapport.rod}`, ''];
  l.push('## Kanaler', '', '| Kanal | Version | Mål | Fatal |', '|---|---|---|---|');
  for (const r of rapport.resultater) l.push(`| ${r.kanal} | ${r.version || '-'} | ${r.maal} | ${r.fatal || ''} |`);
  const prober = rapport.resultater.filter(r => r.probe);
  if (prober.length) {
    l.push('', '## Funktionsprober (hvad browseren selv svarer)', '', `| Funktion | ${prober.map(r => `${r.kanal} ${r.version}`).join(' | ')} |`, `|---|${prober.map(() => '---').join('|')}|`);
    for (const k of Object.keys(prober[0].probe)) l.push(`| ${k} | ${prober.map(r => (r.probe[k] ? 'ja' : '**NEJ**')).join(' | ')} |`);
  }
  l.push('', '## Fund', '');
  if (!rapport.fund.length) l.push('Ingen fund.');
  else { l.push('| Niveau | Kanal | Mål | Tjek | Hvor | Detalje |', '|---|---|---|---|---|---|'); for (const f of rapport.fund) l.push(`| ${f.niveau} | ${f.kanal} | ${f.maal} | ${f.tjek} | ${f.hvor} | ${String(f.detalje).replace(/\|/g, '/').slice(0, 140)} |`); }
  if (rapport.kanalForskelle.length) {
    l.push('', '## Forskelle mellem kanaler (layout-fingeraftryk)', '', '| Mål | Sammenligning | Side | VP | Højde | Header Δ | Skrift | Fonte |', '|---|---|---|---|---|---|---|---|');
    for (const d of rapport.kanalForskelle.slice(0, 40)) l.push(`| ${d.maal} | ${d.mod} | ${d.side} | ${d.viewport}${d.tema === 'mørk' ? 'm' : ''} | ${d.hoejde} | ${d.headerForskel} | ${d.h1Skrift || ''} | ${d.fonte || ''} |`);
  }
  if (rapport.degrader) {
    l.push('', '## Ældre-browser-simulering (Chromium med funktionen fjernet fra CSS)', '', '| Variant | Sider med forskel | Ny overflow | Ny usynlig tekst | Højdeændring >2 % |', '|---|---|---|---|---|');
    for (const v of rapport.degrader.slice(1)) l.push(`| ${v.variant} | ${v.sammenfatning.medForskel}/${v.sammenfatning.sider} | ${v.sammenfatning.nyOverflow} | ${v.sammenfatning.nyeUsynlige} | ${v.sammenfatning.hoejdeAendret} |`);
    for (const v of rapport.degrader.slice(1)) {
      const med = v.diff.filter(d => d.nyOverflow || d.nyeUsynlige);
      if (!med.length) continue;
      l.push('', `### ${v.variant}: konkrete forskelle`, '');
      for (const d of med.slice(0, 14)) l.push(`- ${d.side}@${d.viewport}${d.tema === 'mørk' ? 'm' : ''}: ${d.nyOverflow ? `ny vandret overflow ${d.nyOverflow}px; ` : ''}${d.nyeUsynlige ? `${d.nyeUsynlige} nye usynlige tekster (${d.eks.join('; ')})` : ''}`);
    }
  }
  return l.join('\n');
}

function parseArgs(argv) {
  const o = {};
  const liste = s => String(s).split(',').map(x => x.trim()).filter(Boolean);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], n = () => argv[++i];
    if (a === '--kanaler') o.kanaler = liste(n());
    else if (a === '--maal') o.maal = liste(n());
    else if (a === '--sider') o.sider = liste(n());
    else if (a === '--viewports') o.viewports = liste(n()).map(Number);
    else if (a === '--temaer') o.temaer = liste(n());
    else if (a === '--rod') o.rod = n();
    else if (a === '--rapport') o.rapport = path.resolve(n());
    else if (a === '--md') o.md = path.resolve(n());
    else if (a === '--skaerm') o.skaerm = path.resolve(n());
    else if (a === '--degrader') o.degrader = true;
    else throw new Error('Ukendt argument: ' + a);
  }
  return o;
}

async function koer(o = {}) {
  const pw = o.pw || sb.findPlaywright();
  if (!pw) throw new Error('Playwright mangler.');
  const rod = path.resolve(o.rod || REPO);
  const opt = { sider: o.sider || SIDER, viewports: o.viewports || [375, 768, 1440], temaer: o.temaer || ['lys', 'mørk'], skaerm: o.skaerm };
  const kanaler = o.kanaler || Object.keys(KANALER);
  const maal = o.maal || ['lokal'];
  const resultater = [];
  for (const m of maal) for (const k of kanaler) {
    process.stderr.write(`${m}/${k}\n`);
    resultater.push(await koerKanal(pw, k, m, opt, rod));
  }
  const fund = resultater.flatMap(vurder);
  let degrader = null;
  if (o.degrader) degrader = await koerDegrader(pw, opt, rod);
  return { genereret: new Date().toISOString(), rod, resultater, fund, kanalForskelle: sammenlignKanaler(resultater), degrader };
}

async function main() {
  let o;
  try { o = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(2); }
  let r;
  try { r = await koer(o); } catch (e) { console.error('v5-krydsbrowser: ' + e.message); process.exit(2); }
  const md = markdown(r);
  console.log(md);
  if (o.rapport) { fs.mkdirSync(path.dirname(o.rapport), { recursive: true }); fs.writeFileSync(o.rapport, JSON.stringify(r, null, 1)); }
  if (o.md) { fs.mkdirSync(path.dirname(o.md), { recursive: true }); fs.writeFileSync(o.md, md); }
  process.exit(r.fund.some(f => f.niveau === 'fejl') ? 1 : 0);
}

module.exports = { koer, koerKanal, koerDegrader, vurder, sammenlignKanaler, markdown, KANALER, SIDER, probeFunktioner };

if (require.main === module) main();
