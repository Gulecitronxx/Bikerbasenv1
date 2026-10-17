/* Visuel regression: screenshots af nøglesider + pixel-diff mellem to mapper. Offline og deterministisk.

   Kør:  node scripts/visuel-regression.js --ud work/vr-ny                       (tag screenshots)
         node scripts/visuel-regression.js --ud work/vr-ny --mod work/vr-baseline (tag + sammenlign mod baseline)
         node scripts/visuel-regression.js --sammenlign work/vr-ny work/vr-baseline (kun sammenlign to eksisterende mapper)
         node scripts/visuel-regression.js --rod C:/temp/gammelt-site --ud work/vr-baseline   (screenshots af et andet checkout)
   Flag:  --sider index,soegning,region-*  --viewports 390,1440  --temaer lys,mørk  --graense 2  --tolerance 8
          --vis 0.1  --maks-hoejde 6000  --tid 20000

   Hvad den gør:
     1. Starter en lokal statisk server (fri port) på --rod (standard: repoets rod) og genbruger smoke-browsers
        net-mock + scripts/smoke-fixtures.js: al trafik udefra blokeres, Supabase besvares med syntetiske annoncer.
        Ingen læsning fra eller skrivning til produktion; den eneste skrivning er --ud-mappen.
     2. Fryser det, der ellers gør screenshots ustabile: Date (fast tidspunkt), Math.random + crypto.randomUUID (seedet),
        prefers-reduced-motion, CSS-transitions/animationer, caret; venter på fonts, netværksidle og lazy-billeder;
        cookiebanneren skjules via samtykke-nøglen i localStorage.
     3. Gemmer <side>__<viewport>__<tema>.png (hele siden, loft --maks-hoejde) og, med --mod / --sammenlign,
        sammenligner pixel for pixel: tabel med % ændrede pixel, diff-PNG (rød = ændret, afdæmpet = uændret) hvor
        forskellen > --vis %, og diff.html (før / efter / diff side om side) i --ud-mappen.
     En pixel tæller som ændret, når den største kanalforskel > --tolerance (standard 8 af 255; filtrerer
     anti-aliasing-støj). Størrelsesforskel tæller: ikke-overlappende areal er ændret.

   Exit 0 = ingen side over --graense (standard 2 %), 1 = mindst én over (eller en side mangler i den ene mappe),
   2 = kunne ikke køre (Playwright/Chromium mangler). PNG læses/skrives med indbygget zlib — ingen npm-afhængigheder.

   Brug som modul:  const { koer, sammenlignMapper, dekodPng, enkodPng, diffBilleder } = require('./visuel-regression'); */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const sb = require('./smoke-browser');
const { uuid } = require('./smoke-fixtures');

const REPO = path.join(__dirname, '..');
const NOEGLESIDER = ['index', 'soegning', 'annonce', 'maerke-honda', 'type-sport', 'koerekort-a2', 'region-*', 'guides',
  'guide-a2-koerekort', 'opret-annonce', 'mine-annoncer', 'login', '404'];
const VIEWPORT_HOEJDE = { 320: 640, 360: 740, 390: 844, 768: 1024, 1024: 768, 1440: 900 };
const TEMA_FIL = { 'lys': 'lys', 'mørk': 'moerk' };
const TEMA_VIS = { lys: 'lys', moerk: 'mørk' };
const FAST_TID = Date.UTC(2026, 5, 15, 10, 0, 0);
const QUERY = { 'annonce.html': `?id=${uuid(1)}` };

/* ---------- PNG (zlib) ---------- */

const CRC_TABEL = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++){ let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = buf => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_TABEL[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

/* Dekoder: 8-bit, ikke-interlaced, farvetype 0 (gråtone), 2 (RGB), 3 (palet), 4 (grå+alfa), 6 (RGBA). Returnerer { w, h, data: RGBA }. */
function dekodPng(buf){
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) throw new Error('Ikke en PNG');
  let pos = 8, w = 0, h = 0, bit = 0, ct = 0, il = 0, palette = null, trns = null;
  const idat = [];
  while (pos + 8 <= buf.length){
    const len = buf.readUInt32BE(pos), type = buf.toString('latin1', pos + 4, pos + 8), d = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR'){ w = d.readUInt32BE(0); h = d.readUInt32BE(4); bit = d[8]; ct = d[9]; il = d[12]; }
    else if (type === 'PLTE') palette = d;
    else if (type === 'tRNS') trns = d;
    else if (type === 'IDAT') idat.push(d);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (bit !== 8 || il !== 0 || ![0, 2, 3, 4, 6].includes(ct)) throw new Error(`PNG-format understøttes ikke (bit ${bit}, type ${ct}, interlace ${il})`);
  const bpp = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct];
  const raa = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp, sl = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++){
    const f = raa[y * (stride + 1)], inp = y * (stride + 1) + 1, o = y * stride, p = o - stride;
    for (let x = 0; x < stride; x++){
      const v = raa[inp + x], a = x >= bpp ? sl[o + x - bpp] : 0, b = y ? sl[p + x] : 0, c = x >= bpp && y ? sl[p + x - bpp] : 0;
      let r;
      if (f === 0) r = v; else if (f === 1) r = v + a; else if (f === 2) r = v + b; else if (f === 3) r = v + ((a + b) >> 1);
      else { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      sl[o + x] = r & 255;
    }
  }
  const data = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++){
    const s = i * bpp, d = i * 4;
    if (ct === 6){ data[d] = sl[s]; data[d + 1] = sl[s + 1]; data[d + 2] = sl[s + 2]; data[d + 3] = sl[s + 3]; }
    else if (ct === 2){ data[d] = sl[s]; data[d + 1] = sl[s + 1]; data[d + 2] = sl[s + 2]; data[d + 3] = 255; }
    else if (ct === 0){ data[d] = data[d + 1] = data[d + 2] = sl[s]; data[d + 3] = 255; }
    else if (ct === 4){ data[d] = data[d + 1] = data[d + 2] = sl[s]; data[d + 3] = sl[s + 1]; }
    else { const k = sl[s]; data[d] = palette[k * 3]; data[d + 1] = palette[k * 3 + 1]; data[d + 2] = palette[k * 3 + 2]; data[d + 3] = trns && k < trns.length ? trns[k] : 255; }
  }
  return { w, h, data };
}

function enkodPng({ w, h, data }){
  const raa = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++){ raa[y * (w * 4 + 1)] = 0; data.copy(raa, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const chunk = (type, d) => {
    const b = Buffer.alloc(12 + d.length);
    b.writeUInt32BE(d.length, 0); b.write(type, 4, 'latin1'); d.copy(b, 8);
    b.writeUInt32BE(crc32(b.subarray(4, 8 + d.length)), 8 + d.length);
    return b;
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raa, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------- Pixel-diff ---------- */

/* Sammenligner to RGBA-billeder over det største fælles lærred. Returnerer { aendret, total, pct, diff (RGBA-billede), bbox }. */
function diffBilleder(a, b, { tolerance = 8 } = {}){
  const W = Math.max(a.w, b.w), H = Math.max(a.h, b.h);
  const diff = Buffer.alloc(W * H * 4);
  let aendret = 0, minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++){
    for (let x = 0; x < W; x++){
      const o = (y * W + x) * 4;
      const iA = x < a.w && y < a.h, iB = x < b.w && y < b.h;
      let andet;
      if (iA && iB){
        const pa = (y * a.w + x) * 4, pb = (y * b.w + x) * 4;
        andet = Math.max(Math.abs(a.data[pa] - b.data[pb]), Math.abs(a.data[pa + 1] - b.data[pb + 1]),
          Math.abs(a.data[pa + 2] - b.data[pb + 2]), Math.abs(a.data[pa + 3] - b.data[pb + 3])) > tolerance;
        if (!andet){
          const g = Math.round(0.3 * a.data[pa] + 0.59 * a.data[pa + 1] + 0.11 * a.data[pa + 2]);
          const l = 255 - Math.round((255 - g) * 0.25);
          diff[o] = diff[o + 1] = diff[o + 2] = l; diff[o + 3] = 255; continue;
        }
      } else andet = true;
      aendret++;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
      diff[o] = 230; diff[o + 1] = 20; diff[o + 2] = 40; diff[o + 3] = 255;
    }
  }
  const total = W * H;
  return { aendret, total, pct: total ? (aendret / total) * 100 : 0, diff: { w: W, h: H, data: diff },
    bbox: aendret ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } : null, stoerrelseA: [a.w, a.h], stoerrelseB: [b.w, b.h] };
}

/* ---------- Sammenligning af to mapper ---------- */

const navnTilNoegle = f => f.replace(/\.png$/i, '');
function listPng(dir){
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /__\d+__(lys|moerk)\.png$/.test(f)).sort() : [];
}
function beskriv(noegle){
  const m = /^(.*)__(\d+)__(lys|moerk)$/.exec(noegle);
  return m ? { side: m[1], viewport: Number(m[2]), tema: TEMA_VIS[m[3]] } : { side: noegle, viewport: 0, tema: '' };
}

/* ny = mappen med "efter"-billeder, gammel = baseline. Skriver diff-PNG og diff.html i udDir (standard: ny). */
function sammenlignMapper(nyDir, gammelDir, opt = {}){
  const graense = opt.graense == null ? 2 : opt.graense, vis = opt.vis == null ? 0.1 : opt.vis;
  const udDir = opt.udDir || nyDir, diffDir = path.join(udDir, 'diff');
  const ny = new Set(listPng(nyDir)), gammel = new Set(listPng(gammelDir));
  const alle = [...new Set([...ny, ...gammel])].sort();
  const raekker = [];
  for (const f of alle){
    const noegle = navnTilNoegle(f), r = { noegle, ...beskriv(noegle), fil: f };
    if (!ny.has(f) || !gammel.has(f)){
      r.mangler = !ny.has(f) ? 'ny' : 'baseline'; r.pct = 100; r.over = true;
    } else {
      const d = diffBilleder(dekodPng(fs.readFileSync(path.join(gammelDir, f))), dekodPng(fs.readFileSync(path.join(nyDir, f))), { tolerance: opt.tolerance });
      r.pct = d.pct; r.aendret = d.aendret; r.total = d.total; r.bbox = d.bbox; r.stoerrelseBaseline = d.stoerrelseA; r.stoerrelseNy = d.stoerrelseB;
      r.over = d.pct > graense;
      if (d.pct > vis){
        fs.mkdirSync(diffDir, { recursive: true });
        fs.writeFileSync(path.join(diffDir, f), enkodPng(d.diff)); r.diffFil = `diff/${f}`;
      }
    }
    raekker.push(r);
  }
  fs.mkdirSync(udDir, { recursive: true });
  fs.writeFileSync(path.join(udDir, 'diff.html'), lavHtml(raekker, nyDir, gammelDir, udDir, graense));
  return { raekker, graense, fejl: raekker.filter(r => r.over).length };
}

function lavHtml(raekker, nyDir, gammelDir, udDir, graense){
  const rel = (dir, f) => path.relative(udDir, path.join(dir, f)).split(path.sep).join('/');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sorteret = raekker.slice().sort((a, b) => b.pct - a.pct);
  const tabel = sorteret.map(r => `<tr class="${r.over ? 'over' : r.pct > 0 ? 'lidt' : ''}"><td>${esc(r.side)}</td><td>${r.viewport}</td><td>${r.tema}</td><td>${r.mangler ? 'mangler i ' + r.mangler : r.pct.toFixed(2) + ' %'}</td></tr>`).join('\n');
  const kort = sorteret.filter(r => r.pct > 0).map(r => `<section id="${esc(r.noegle)}"><h2>${esc(r.side)} · ${r.viewport}px · ${r.tema} · ${r.mangler ? 'mangler i ' + r.mangler : r.pct.toFixed(2) + ' %'}</h2>` +
    (r.mangler ? '' : `<div class="tre"><figure><figcaption>før (baseline)</figcaption><img loading="lazy" src="${esc(rel(gammelDir, r.fil))}"></figure><figure><figcaption>efter</figcaption><img loading="lazy" src="${esc(rel(nyDir, r.fil))}"></figure>` +
      (r.diffFil ? `<figure><figcaption>diff</figcaption><img loading="lazy" src="${esc(r.diffFil)}"></figure>` : '<figure><figcaption>diff</figcaption><p>under visningsgrænsen</p></figure>') + '</div>') + '</section>').join('\n');
  return `<!doctype html><html lang="da"><head><meta charset="utf-8"><title>Visuel regression</title><style>
body{font:14px system-ui,sans-serif;margin:16px;background:#fafafa;color:#111}table{border-collapse:collapse;margin-bottom:24px}td,th{border:1px solid #ccc;padding:3px 8px;text-align:left}
tr.over{background:#fdd}tr.lidt{background:#ffd}.tre{display:flex;gap:8px;align-items:flex-start}figure{margin:0;flex:1;min-width:0}figure img{width:100%;border:1px solid #888}
figcaption{font-weight:600}section{margin-bottom:32px}</style></head><body><h1>Visuel regression</h1>
<p>Grænse ${graense} % ændrede pixel. ${raekker.filter(r => r.over).length} af ${raekker.length} over grænsen.</p>
<table><tr><th>side</th><th>viewport</th><th>tema</th><th>ændret</th></tr>${tabel}</table>${kort}</body></html>
`;
}

function tabel(raekker, graense, maks = 40){
  const s = raekker.slice().sort((a, b) => b.pct - a.pct).filter(r => r.pct > 0);
  const linjer = [`visuel-regression: ${raekker.length} sammenlignet, ${s.length} med forskel, ${raekker.filter(r => r.over).length} over ${graense} %`];
  s.slice(0, maks).forEach(r => linjer.push(`  ${r.mangler ? 'MANGLER (' + r.mangler + ')' : r.pct.toFixed(2).padStart(6) + ' %'}  ${r.side}  ${r.viewport}  ${r.tema}${r.over ? '  <-- OVER' : ''}`));
  if (s.length > maks) linjer.push(`  … og ${s.length - maks} flere (se diff.html)`);
  return linjer.join('\n');
}

/* ---------- Screenshots ---------- */

function frysScript({ fastTid }){
  const RD = Date;
  class FastDate extends RD {
    constructor(...a){ if (a.length) super(...a); else super(fastTid); }
    static now(){ return fastTid; }
  }
  window.Date = FastDate;
  let s = 123456789;
  const rnd = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  Math.random = rnd;
  try { if (window.crypto) window.crypto.randomUUID = () => 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(rnd() * 16).toString(16)); } catch (e) { /* skrivebeskyttet */ }
  try {
    localStorage.setItem('bb_theme', window.__vrTema);
    localStorage.setItem('bb_cookie_consent', JSON.stringify({ level: 'necessary', date: new RD(fastTid).toISOString() }));
  } catch (e) { /* ingen storage */ }
}
const FRYS_CSS = '*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important;caret-color:transparent!important}'
  + '#cookie-banner,.cookie-banner,[data-cookie-banner]{display:none!important}';

function vaelgSider(rod, onsket){
  const alle = fs.readdirSync(rod).filter(f => f.endsWith('.html')).map(f => f.replace(/\.html$/, ''));
  const ud = [];
  for (const m of onsket){
    const re = new RegExp('^' + m.replace(/\.html$/, '').split('*').map(x => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
    const hit = alle.filter(f => re.test(f)).sort();
    (hit.length ? hit : (m.includes('*') ? [] : [m.replace(/\.html$/, '')])).forEach(h => { if (!ud.includes(h)) ud.push(h); });
  }
  return ud;
}

async function tagSkaerm(page, { base, side, viewport, tid, maksHoejde, udFil }){
  const query = QUERY[`${side}.html`] || '';
  let status = 0;
  try {
    const resp = await page.goto(`${base}/${side}.html${query}`, { waitUntil: 'load', timeout: tid });
    status = resp ? resp.status() : 0;
    /* sider bag login omdirigerer klientside; ved navigation midt i måling tages det hele om på den nye side */
    for (let forsoeg = 0; ; forsoeg++){
      try { await settleOgTag(page, { tid, maksHoejde, viewport, udFil }); break; }
      catch (e) {
        if (forsoeg >= 3 || !/context was destroyed|navigat/i.test(String(e.message))) throw e;
        await page.waitForLoadState('load', { timeout: tid }).catch(() => {});
      }
    }
    return { ok: true, status };
  } catch (e) {
    return { ok: false, status, fejl: String((e && e.message) || e).split(String.fromCharCode(10))[0] };
  }
}

async function settleOgTag(page, { tid, maksHoejde, viewport, udFil }){
  {
    await page.addStyleTag({ content: FRYS_CSS });
    await page.waitForLoadState('networkidle', { timeout: tid }).catch(() => {});
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    /* scroll-sweep udløser lazy-billeder og scroll-reveal; tilbage til toppen bagefter */
    await page.evaluate(async () => {
      const h = Math.min(document.documentElement.scrollHeight, 12000), step = Math.max(300, innerHeight - 100);
      for (let y = 0; y < h; y += step){ scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
      scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle', { timeout: tid }).catch(() => {});
    await page.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 3000); })))).catch(() => {});
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    await page.waitForTimeout(500);
    const hoejde = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
    await page.screenshot({ path: udFil, fullPage: true, animations: 'disabled', caret: 'hide', scale: 'css',
      ...(hoejde > maksHoejde ? { clip: { x: 0, y: 0, width: viewport, height: maksHoejde } } : {}) });
  }
}

/* Tager screenshots. Returnerer { filer, fejl[], port }. Kaster ikke ved manglende Playwright — se playwrightTilgaengelig. */
async function tagSkaermbilleder(opt){
  const rod = opt.rod || REPO, udDir = opt.ud;
  const pw = sb.findPlaywright();
  if (!pw) throw Object.assign(new Error('Playwright er ikke installeret (npm i playwright, eller sæt PLAYWRIGHT_PATH).'), { kode: 2 });
  const viewports = (opt.viewports || [390, 1440]).map(Number);
  const temaer = (opt.temaer || ['lys', 'mørk']).map(t => (t === 'moerk' || t === 'mørk') ? 'moerk' : 'lys');
  const sider = vaelgSider(rod, opt.sider || NOEGLESIDER);
  const tid = opt.tid || 20000, maksHoejde = opt.maksHoejde || 6000;
  fs.mkdirSync(udDir, { recursive: true });
  const { server, port } = await sb.startServer(rod);
  let browser;
  try {
    browser = await pw.chromium.launch({ headless: true });
  } catch (e) {
    server.close();
    throw Object.assign(new Error(`Chromium kunne ikke starte: ${String(e.message).split('\n')[0]}`), { kode: 2 });
  }
  const filer = [], fejl = [], blokeret = {};
  try {
    for (const vp of viewports){
      for (const tema of temaer){
        const context = await browser.newContext({
          viewport: { width: vp, height: VIEWPORT_HOEJDE[vp] || 900 }, colorScheme: tema === 'moerk' ? 'dark' : 'light', locale: 'da-DK',
          timezoneId: 'Europe/Copenhagen', serviceWorkers: 'block', reducedMotion: 'reduce', deviceScaleFactor: 1,
        });
        await context.addInitScript(`window.__vrTema = ${JSON.stringify(tema === 'moerk' ? 'dark' : 'light')};`);
        await context.addInitScript(frysScript, { fastTid: FAST_TID });
        await sb.installerMock(context, port, blokeret);
        for (const side of sider){
          const page = await context.newPage();
          const fil = `${side}__${vp}__${tema}.png`;
          let vagt;
          const r = await Promise.race([
            tagSkaerm(page, { base: `http://127.0.0.1:${port}`, side, viewport: vp, tid, maksHoejde, udFil: path.join(udDir, fil) }),
            new Promise(ok => { vagt = setTimeout(() => ok({ ok: false, fejl: `vagt: siden brugte over ${Math.round(tid * 3 / 1000)} s` }), tid * 3); }),
          ]);
          clearTimeout(vagt);
          await Promise.race([page.close().catch(() => {}), new Promise(ok => setTimeout(ok, 5000))]);
          if (r.ok) filer.push(fil); else fejl.push(`${fil}: ${r.fejl}`);
          if (!opt.stille) process.stderr.write(r.ok ? '.' : 'x');
        }
        await context.close();
      }
    }
  } finally {
    await Promise.race([browser.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]);
    try { const pr = browser.process && browser.process(); if (pr && !pr.killed) pr.kill('SIGKILL'); } catch (e) { /* væk */ }
    server.close();
  }
  if (!opt.stille) process.stderr.write('\n');
  return { filer, fejl, port, sider };
}

/* Hele flowet: screenshots (hvis ud) og evt. sammenligning. */
async function koer(opt){
  const res = { filer: [], fejl: [] };
  if (opt.ud && !opt.kunSammenlign){
    const t = await tagSkaermbilleder(opt);
    Object.assign(res, t);
  }
  const nyDir = opt.kunSammenlign ? opt.kunSammenlign[0] : opt.ud;
  const gammelDir = opt.kunSammenlign ? opt.kunSammenlign[1] : opt.mod;
  if (gammelDir){
    const c = sammenlignMapper(nyDir, gammelDir, { graense: opt.graense, tolerance: opt.tolerance, vis: opt.vis, udDir: opt.kunSammenlign ? (opt.ud || nyDir) : nyDir });
    res.sammenligning = c;
  }
  return res;
}

/* ---------- CLI ---------- */

function parseArgs(argv){
  const o = {};
  const liste = v => String(v).split(',').map(s => s.trim()).filter(Boolean);
  for (let i = 0; i < argv.length; i++){
    const a = argv[i], naeste = () => { if (i + 1 >= argv.length) throw new Error(`Mangler værdi til ${a}`); return argv[++i]; };
    if (a === '--ud') o.ud = path.resolve(naeste());
    else if (a === '--mod') o.mod = path.resolve(naeste());
    else if (a === '--sammenlign'){ o.kunSammenlign = [path.resolve(naeste()), path.resolve(naeste())]; }
    else if (a === '--rod') o.rod = path.resolve(naeste());
    else if (a === '--sider') o.sider = liste(naeste());
    else if (a === '--viewports') o.viewports = liste(naeste()).map(Number);
    else if (a === '--temaer') o.temaer = liste(naeste());
    else if (a === '--graense') o.graense = Number(String(naeste()).replace(',', '.'));
    else if (a === '--tolerance') o.tolerance = Number(naeste());
    else if (a === '--vis') o.vis = Number(String(naeste()).replace(',', '.'));
    else if (a === '--maks-hoejde') o.maksHoejde = Number(naeste());
    else if (a === '--tid') o.tid = Number(naeste());
    else if (a === '--stille') o.stille = true;
    else if (a === '-h' || a === '--hjaelp' || a === '--help') o.hjaelp = true;
    else throw new Error(`Ukendt flag: ${a}`);
  }
  return o;
}

const HJAELP = `node scripts/visuel-regression.js --ud <mappe> [--mod <baseline-mappe>] [--rod <sitemappe>] [--sider a,b,region-*]
  [--viewports 390,1440] [--temaer lys,mørk] [--graense 2] [--tolerance 8] [--vis 0.1] [--maks-hoejde 6000]
node scripts/visuel-regression.js --sammenlign <ny-mappe> <baseline-mappe> [--ud <rapportmappe>]`;

async function main(){
  let opt;
  try { opt = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); console.error(HJAELP); process.exit(2); }
  if (opt.hjaelp || (!opt.ud && !opt.kunSammenlign)){ console.log(HJAELP); process.exit(opt.hjaelp ? 0 : 2); }
  let res;
  try { res = await koer(opt); } catch (e) { console.error(`visuel-regression: ${e.message}`); process.exit(e.kode === 2 ? 2 : 1); }
  if (res.filer && res.filer.length) console.log(`visuel-regression: ${res.filer.length} screenshots i ${opt.ud}`);
  (res.fejl || []).forEach(f => console.log(`  FEJL ${f}`));
  let exit = res.fejl && res.fejl.length ? 1 : 0;
  if (res.sammenligning){
    console.log(tabel(res.sammenligning.raekker, res.sammenligning.graense));
    console.log(`diff.html: ${path.join(opt.kunSammenlign ? (opt.ud || opt.kunSammenlign[0]) : opt.ud, 'diff.html')}`);
    if (res.sammenligning.fejl) exit = 1;
  }
  process.exit(exit);
}

if (require.main === module) main();

module.exports = { koer, tagSkaermbilleder, sammenlignMapper, diffBilleder, dekodPng, enkodPng, parseArgs, vaelgSider, tabel, NOEGLESIDER };
