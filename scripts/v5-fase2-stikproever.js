/* V5 QA fase 2 - uafhængige stikprøver af de nye ting på en bygget rod (typisk en git archive-kopi).
   Kør:  node scripts/v5-fase2-stikproever.js --rod <mappe> [--rapport fil.json]
   Alt kører mod lokal mock (scripts/smoke-browser.js + smoke-fixtures.js); intet forlader maskinen.

   A  favorit-hjerte på eksterne kort: tryk, reload (huskes i bb_favorites_ext), "Gemte annoncer" viser den, fjern igen
   B  sammenlign-knappen overlapper ikke andet i kortet (gitter + liste, 375/768/1440, lys/mørk)
   C  pris-skyderens håndtag er lodret centreret på sporet (<= 1,5 px)
   D  officielle logoer: ingen e-mail/metadata/script/ekstern reference i SVG; alle logobilleder indlæses; synlige i lys og mørk
   E  guidekort: billedbeskæring (object-fit: cover) under 35 % af billedet på guides.html og en guide
   F  søgning med dybe links: CLS <= 0,05 (375/1440) og ingen konsolfejl
   G  cookie-failsafe: en blokker, der skjuler dialogen efter 0,3/1,5/4 s, efterlader ikke en død (inert) side */
const fs = require('fs');
const path = require('path');
const sb = require('./smoke-browser');

function parseArgs(argv) { const o = {}; for (let i = 0; i < argv.length; i++) { if (argv[i] === '--rod') o.rod = argv[++i]; else if (argv[i] === '--rapport') o.rapport = argv[++i]; } return o; }

async function ctxFor(browser, port, { vp = 1440, tema = 'lys', consent = true, vis } = {}) {
  const c = await browser.newContext({ viewport: { width: vp, height: vp < 500 ? 812 : 900 }, colorScheme: tema === 'mørk' ? 'dark' : 'light', locale: 'da-DK', serviceWorkers: 'block' });
  await c.addInitScript(({ tema, consent, vis }) => {
    try { localStorage.setItem('bb_theme', tema === 'mørk' ? 'dark' : 'light'); if (consent) localStorage.setItem('bb_cookie_consent', JSON.stringify({ level: 'necessary', date: new Date().toISOString() })); if (vis) localStorage.setItem('bb_view_mode', vis); } catch (e) { /* ingen */ }
    window.__q = { cls: 0 };
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__q.cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch (e) { /* ingen */ }
  }, { tema, consent, vis });
  await sb.installerMock(c, port, {});
  return c;
}
async function aabn(c, base, sti, vent = 1500) {
  const p = await c.newPage();
  p.fejl = [];
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|Content[- ]Security/i.test(m.text())) p.fejl.push(m.text().slice(0, 140)); });
  p.on('pageerror', e => p.fejl.push('pageerror: ' + String((e && e.message) || e).slice(0, 140)));
  await p.goto(`${base}/${sti}`, { waitUntil: 'load', timeout: 30000 });
  await p.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await p.waitForFunction(() => !window.DATA_STATUS || (window.DATA_STATUS.eksterne !== 'ikke-hentet' && window.DATA_STATUS.egne !== 'ikke-hentet'), null, { timeout: 12000 }).catch(() => {});
  await p.waitForTimeout(vent);
  return p;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const rod = path.resolve(o.rod || path.join(__dirname, '..'));
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) { console.error(kan.grund); process.exit(2); }
  const { server, port } = await sb.startServer(rod);
  const base = `http://127.0.0.1:${port}`;
  const browser = await kan.pw.chromium.launch({ headless: true });
  const res = [];
  const R = (id, ok, detalje, niveau) => { res.push({ id, ok, detalje, niveau: ok ? 'ok' : (niveau || 'fejl') }); process.stderr.write(`${ok ? 'ok ' : 'FEJL'} ${id}: ${detalje}\n`); };
  try {
    /* A: favorit-hjerte på eksterne kort */
    {
      const c = await ctxFor(browser, port);
      let p = await aabn(c, base, 'soegning.html');
      const info = await p.evaluate(() => { const k = document.querySelector('.card[data-external="1"]'); if (!k) return null; const h = k.querySelector('[data-fav-toggle]'); return { id: k.dataset.listingId, harHjerte: !!h, pressed: h && h.getAttribute('aria-pressed'), titel: (k.querySelector('.rk-titel') || {}).textContent }; });
      if (!info || !info.harHjerte) R('A1 hjerte på eksternt kort', false, 'intet hjerte på første eksterne kort: ' + JSON.stringify(info));
      else {
        await p.click(`.card[data-listing-id="${info.id}"] [data-fav-toggle]`);
        await p.waitForTimeout(500);
        const trykket = await p.evaluate(id => document.querySelector(`.card[data-listing-id="${id}"] [data-fav-toggle]`).getAttribute('aria-pressed'), info.id);
        R('A1 hjerte på eksternt kort: tryk', trykket === 'true', `aria-pressed ${info.pressed} -> ${trykket}`);
        const lager = await p.evaluate(() => Object.keys(localStorage).filter(k => /favorit/i.test(k)).map(k => k + '=' + String(localStorage.getItem(k)).slice(0, 60)));
        await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1800);
        const efter = await p.evaluate(id => { const h = document.querySelector(`.card[data-listing-id="${id}"] [data-fav-toggle]`); return h ? h.getAttribute('aria-pressed') : 'findes ikke'; }, info.id);
        R('A2 hjerte huskes efter reload', efter === 'true', `aria-pressed ${efter}; lager: ${lager.join(' | ')}`);
        /* Anonym: "Gemte annoncer" i headeren sender til login (Mine annoncer kræver en bruger). Kun-lokale favoritter kan altså ikke ses uden login. */
        await p.goto(`${base}/mine-annoncer.html?tab=favoritter`, { waitUntil: 'load' }); await p.waitForTimeout(2000);
        const anon = new URL(p.url()).pathname;
        R('A3a "Gemte annoncer" for ANONYM: kan ses uden login', /mine-annoncer/.test(anon), `ender på ${anon} (header-hjertet "Gemte annoncer" linker til mine-annoncer.html?tab=favoritter)`, 'advarsel');
        /* Med en lokal session (som efter login) skal favoritten stå der. */
        await p.evaluate(() => localStorage.setItem('bb_user', JSON.stringify({ id: 'aaaaaaaa-0000-4000-8000-000000000001', name: 'Test', email: 't@example.test', plan: 'private', remote: false })));
        await p.goto(`${base}/mine-annoncer.html?tab=favoritter`, { waitUntil: 'load' }); await p.waitForTimeout(2500);
        const gemte = await p.evaluate(id => ({ url: location.pathname, har: !!document.querySelector(`#tab-favoritter [data-fav-toggle="${id}"]`), tekst: (document.querySelector('#tab-favoritter') || document.body).innerText.slice(0, 160).replace(/s+/g, ' ') }), info.id);
        R('A3b "Gemte annoncer" (lokal session) viser den', /mine-annoncer/.test(gemte.url) && gemte.har, `${gemte.url}; fundet=${gemte.har}; ${gemte.tekst.slice(0, 90)}`);
        const fjern = await p.evaluate(id => { const b = document.querySelector(`#tab-favoritter [data-fav-toggle="${id}"]`); if (b) b.click(); return !!b; }, info.id);
        await p.waitForTimeout(900);
        const vaek = await p.evaluate(id => !document.querySelector(`#tab-favoritter [data-fav-toggle="${id}"]`), info.id);
        const lagerEfter = await p.evaluate(id => (localStorage.getItem('bb_favorites_ext') || '').includes(id), info.id);
        R('A4 fjern fra "Gemte annoncer" (og fra lageret)', fjern && vaek && !lagerEfter, `klikket=${fjern}, væk=${vaek}, stadig i bb_favorites_ext=${lagerEfter}`);
      }
      R('A konsolfejl', p.fejl.length === 0, p.fejl.join(' | ') || 'ingen');
      await c.close();
    }
    /* B: sammenlign-knap uden overlap */
    for (const [vp, vis, tema] of [[1440, 'grid', 'lys'], [1440, 'list', 'lys'], [768, 'grid', 'lys'], [375, 'grid', 'lys'], [375, 'list', 'mørk'], [1440, 'grid', 'mørk']]) {
      const c = await ctxFor(browser, port, { vp, tema, vis });
      const p = await aabn(c, base, 'soegning.html');
      const r = await p.evaluate(() => {
        const ud = [];
        const sn = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2;
        const synlig = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
        const knapper = [...document.querySelectorAll('#results-grid [data-compare-toggle]')].filter(synlig).slice(0, 24);
        for (const b of knapper) {
          const k = b.closest('article, .card, .row, li') || b.parentElement;
          const br = b.getBoundingClientRect(); const ba = br.width * br.height;
          const bund = [...k.querySelectorAll('a, button, .rk-pris, .rk-titel, .rk-sted, .rk-fod *, [class*="kk-"], .chip, .pill, .row-tool')];
          for (const e of bund) {
            if (e === b || b.contains(e) || e.contains(b) || !synlig(e) || e.matches('a.card-link, .card-link *')) continue;
            const er = e.getBoundingClientRect();
            if (er.width * er.height > 6 * ba) continue;   // stort dækkende link/element: bevidst under knapperne
            if (e.children.length && !e.matches('a,button,.rk-pris,.rk-titel,.row-tool')) continue;
            if (sn(br, er)) { ud.push(`${(e.className || e.tagName).toString().slice(0, 30)} "${(e.textContent || '').trim().slice(0, 18)}"`); break; }
          }
          if (br.width < 36 || br.height < 36) ud.push(`tap-mål ${Math.round(br.width)}x${Math.round(br.height)}`);
        }
        return { antal: knapper.length, ud };
      });
      R(`B sammenlign uden overlap ${vp} ${vis} ${tema}`, r.antal > 0 && r.ud.length === 0, `${r.antal} sammenlign-knapper; ${r.ud.slice(0, 3).join('; ') || 'ingen overlap'}`);
      await c.close();
    }
    /* C: pris-skyder centreret */
    for (const [vp, tema] of [[1440, 'lys'], [1440, 'mørk'], [375, 'lys']]) {
      const c = await ctxFor(browser, port, { vp, tema });
      const p = await aabn(c, base, 'soegning.html');
      if (vp < 500) { await p.evaluate(() => { const b = document.querySelector('#mobile-filter-btn, [data-open-filters], .so-filter-btn'); if (b) b.click(); }); await p.waitForTimeout(600); }
      const r = await p.evaluate(() => {
        const d = document.querySelector('#range-price'); if (!d) return null;
        const rail = d.querySelector('.dual-range-rail').getBoundingClientRect();
        const ud = [];
        for (const inp of d.querySelectorAll('input.dr-thumb')) {
          const ir = inp.getBoundingClientRect();
          const th = getComputedStyle(inp, '::-webkit-slider-thumb'), tr = getComputedStyle(inp, '::-webkit-slider-runnable-track');
          const trH = parseFloat(tr.height) || 0, thH = parseFloat(th.height) || 0, mt = parseFloat(th.marginTop) || 0;
          const trackTop = ir.top + (ir.height - trH) / 2;
          const thumbCy = trackTop + mt + thH / 2;
          ud.push({ cls: inp.className, thumbCy, railCy: rail.top + rail.height / 2, thH, trH, mt, inputH: ir.height, synlig: ir.width > 0 });
        }
        return ud;
      });
      const ok = r && r.length === 2 && r.every(x => !x.synlig || Math.abs(x.thumbCy - x.railCy) <= 1.5);
      R(`C pris-skyder centreret ${vp} ${tema}`, !!ok, r ? r.map(x => `${x.cls.split(' ').pop()} Δ${(x.thumbCy - x.railCy).toFixed(2)}px (håndtag ${x.thH}px, margin-top ${x.mt})`).join('; ') : 'skyder ikke fundet');
      await c.close();
    }
    /* D: officielle logoer */
    {
      const dir = path.join(rod, 'img', 'brands');
      const svgs = fs.readdirSync(dir).filter(f => /\.svg$/.test(f));
      const problem = [], editor = [];
      for (const f of svgs) {
        const t = fs.readFileSync(path.join(dir, f), 'utf8');
        if (/<metadata\b/i.test(t)) problem.push(`${f}: <metadata>`);
        if (/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(t)) problem.push(`${f}: e-mailadresse (${(t.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i) || [])[0]})`);
        if (/mailto:/i.test(t)) problem.push(`${f}: mailto`);
        if (/<script\b|\son[a-z]+\s*=|javascript:/i.test(t)) problem.push(`${f}: script/handler`);
        if (/<!ENTITY|<!DOCTYPE[^>]*\[/i.test(t)) problem.push(`${f}: entity/doctype`);
        if (/<foreignObject|xlink:href\s*=\s*["']https?:|href\s*=\s*["']https?:|url\(\s*["']?https?:/i.test(t)) problem.push(`${f}: ekstern reference/foreignObject`);
        if (/<(dc|cc|rdf):|<sodipodi/i.test(t)) problem.push(`${f}: licens-/editormetadata (rdf/cc/dc/sodipodi)`);
        if (/inkscape:|sodipodi:/i.test(t)) editor.push(f);
        if (/<text\b/i.test(t) && !/<path\b/i.test(t)) problem.push(`${f}: kun <text> (afhænger af skrifttype)`);
        if (t.length > 80000) problem.push(`${f}: ${t.length} B`);
      }
      R('D1 SVG-logoer: ingen e-mail/metadata/script/ekstern reference', problem.length === 0, `${svgs.length} filer; ${problem.slice(0, 4).join(' | ') || 'rene'}`);
      R('D1b SVG-logoer: rester af redigeringsprogram (inkscape-attributter)', editor.length === 0, editor.length ? `${editor.join(', ')} har inkscape:/sodipodi:-attributter (harmløse, men overflødige)` : 'ingen', 'advarsel');
      for (const tema of ['lys', 'mørk']) {
        const c = await ctxFor(browser, port, { vp: 1440, tema });
        const p = await aabn(c, base, 'maerker.html', 2200);
        await p.evaluate(async () => { const t = Math.min(document.documentElement.scrollHeight, 20000); for (let y = 0; y < t; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } scrollTo(0, 0); });
        await p.waitForTimeout(600);
        const r = await p.evaluate(() => {
          const cv = document.createElement('canvas'); cv.width = cv.height = 48; const cx = cv.getContext('2d', { willReadFrequently: true });
          const lum = ([r, g, b]) => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
          const rgba = s => { const c2 = document.createElement('canvas'); c2.width = c2.height = 1; const x2 = c2.getContext('2d', { willReadFrequently: true }); x2.fillStyle = '#fff'; x2.fillStyle = s; x2.fillRect(0, 0, 1, 1); return [...x2.getImageData(0, 0, 1, 1).data]; };
          const imgs = [...document.querySelectorAll('img[src*="img/brands/"]')];
          const brudte = imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src'));
          const usynlige = [];
          for (const i of imgs) {
            if (!i.complete || !i.naturalWidth || i.getBoundingClientRect().width < 8) continue;
            let bg = [255, 255, 255];
            for (let n = i.parentElement; n; n = n.parentElement) { const b = rgba(getComputedStyle(n).backgroundColor); if (b[3] > 250) { bg = b; break; } }
            try {
              cx.clearRect(0, 0, 48, 48); cx.drawImage(i, 0, 0, 48, 48);
              const d = cx.getImageData(0, 0, 48, 48).data; let r = 0, g = 0, b = 0, n = 0;
              for (let k = 0; k < d.length; k += 4) if (d[k + 3] > 128) { r += d[k]; g += d[k + 1]; b += d[k + 2]; n++; }
              if (n < 20) { usynlige.push(i.getAttribute('src') + ' (tom)'); continue; }
              const l1 = lum([r / n, g / n, b / n]), l2 = lum(bg); const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
              if (ratio < 1.3) usynlige.push(`${i.getAttribute('src').split('/').pop()} ${ratio.toFixed(2)}:1`);
            } catch (e) { /* tainted */ }
          }
          return { antal: imgs.length, brudte, usynlige };
        });
        R(`D2 logoer på maerker.html (${tema}): indlæst og synlige`, r.antal > 10 && r.brudte.length === 0 && r.usynlige.length === 0, `${r.antal} logobilleder; brudte ${r.brudte.length}; usynlige/lav kontrast ${r.usynlige.slice(0, 4).join(', ') || 'ingen'}`);
        if (tema === 'mørk') { fs.mkdirSync(path.join(__dirname, '..', 'work'), { recursive: true }); }
        await c.close();
      }
    }
    /* E: guidekort */
    for (const [sti, vp] of [['guides.html', 1440], ['guides.html', 375], ['guide-a2-koerekort.html', 1440], ['guide-a2-koerekort.html', 375], ['guide-brugt-motorcykel.html', 768]]) {
      const c = await ctxFor(browser, port, { vp });
      const p = await aabn(c, base, sti, 1200);
      await p.evaluate(async () => { const t = Math.min(document.documentElement.scrollHeight, 20000); for (let y = 0; y < t; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } scrollTo(0, 0); });
      await p.waitForTimeout(600);
      const r = await p.evaluate(() => {
        const ud = [];
        for (const i of document.querySelectorAll('main img')) {
          if (!i.complete || !i.naturalWidth) continue;
          const r = i.getBoundingClientRect(); if (r.width < 60 || r.height < 40) continue;
          const fit = getComputedStyle(i).objectFit; if (fit !== 'cover') continue;
          const nat = i.naturalWidth / i.naturalHeight, box = r.width / r.height;
          ud.push({ sti: (() => { const par = []; for (let n = i.parentElement; n && par.length < 3; n = n.parentElement) par.push(String(n.className).split(' ')[0]); return par.join('<'); })(), kilde: i.getAttribute('src').split('/').pop().slice(-28), beskaering: 1 - Math.min(nat / box, box / nat), box: `${Math.round(r.width)}x${Math.round(r.height)}`, nat: `${i.naturalWidth}x${i.naturalHeight}` });
        }
        const klippet = [...document.querySelectorAll('main a, main article, main li')].filter(e => { const cs = getComputedStyle(e); return /hidden|clip/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 3 && e.querySelector('h2,h3,strong'); }).slice(0, 3).map(e => (e.className || e.tagName).toString().slice(0, 30));
        return { ud, klippet };
      });
      /* Sidens hero-banner (gd-hero) er en bevidst bred udsnitsbaggrund og tæller ikke; kort/figurer må højst beskæres 40 % (figurer i brødtekst 35 %). */
      const kort = r.ud.filter(x => !/gd-hero/.test(x.kilde + x.sti));
      const vaerste = kort.sort((a, b) => b.beskaering - a.beskaering)[0];
      R(`E guidekort ${sti} ${vp}`, kort.length > 0 && vaerste.beskaering <= (/gd-fig/.test(vaerste.sti) ? 0.35 : 0.40) && r.klippet.length === 0, kort.length ? `${kort.length} billeder; størst beskæring ${(vaerste.beskaering * 100).toFixed(0)} % (${vaerste.box} af ${vaerste.nat}, ${vaerste.kilde}, i ${vaerste.sti}); klippet tekst: ${r.klippet.join(', ') || 'ingen'}` : 'ingen object-fit:cover-billeder fundet (billederne er mock-pixels)', kort.length ? 'fejl' : 'info');
      await c.close();
    }
    /* F: dybe søgelinks, CLS */
    {
      const links = ['soegning.html?brands=Honda', 'soegning.html?brands=Honda&brands=Yamaha&types=Cruiser&q=rebel', 'soegning.html?koerekort=A2&maxPrice=60000&sort=price-asc', 'soegning.html?brands=Zero', 'soegning.html?brands=xyz', 'soegning.html?q=honda&regions=Syddanmark&conditions=Brugt', 'soegning.html?brands=Harley-Davidson&models=XL%20883%20Sportster%2C%20Iron'];
      for (const vp of [375, 1440]) for (const l of links) {
        const c = await ctxFor(browser, port, { vp });
        const p = await aabn(c, base, l, 1800);
        await p.evaluate(async () => { const t = Math.min(document.documentElement.scrollHeight, 9000); for (let y = 0; y < t; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); } scrollTo(0, 0); await new Promise(r => setTimeout(r, 300)); });
        const cls = await p.evaluate(() => window.__q.cls);
        R(`F CLS ${l.replace('soegning.html', '')} @${vp}`, cls <= 0.05 && p.fejl.length === 0, `CLS ${cls.toFixed(3)}${p.fejl.length ? '; fejl: ' + p.fejl.join(' | ') : ''}`);
        await c.close();
      }
    }
    /* G: cookie-failsafe */
    for (const forsinkelse of [300, 1500, 4000]) {
      const c = await ctxFor(browser, port, { consent: false });
      const p = await c.newPage();
      await p.goto(`${base}/index.html`, { waitUntil: 'load' });
      await p.waitForTimeout(forsinkelse);
      await p.evaluate(() => { const s = document.createElement('style'); s.textContent = '#cookie-banner,[id*="cookie" i],[class*="cookie" i]{display:none!important}'; document.head.appendChild(s); });
      await p.waitForTimeout(2500);
      const r = await p.evaluate(() => { const d = document.getElementById('cookie-banner'); const a = document.querySelector('header a[href]'); const rc = a.getBoundingClientRect(); const x = document.elementFromPoint(rc.left + rc.width / 2, rc.top + rc.height / 2); return { modalSkjult: !!(d && d.matches(':modal') && getComputedStyle(d).display === 'none'), aaben: !!(d && d.open), klikbar: !!x && (x === a || a.contains(x)), inertBody: document.body.inert || !!document.querySelector('[inert]:not(dialog)') }; });
      R(`G cookie-failsafe efter ${forsinkelse} ms`, !r.modalSkjult && r.klikbar, JSON.stringify(r));
      await c.close();
    }
  } finally { await Promise.race([browser.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]); server.close(); }
  const fejl = res.filter(r => r.niveau === 'fejl');
  console.log(res.map(r => `${r.niveau.toUpperCase().padEnd(5)} ${r.id}: ${r.detalje}`).join('\n'));
  console.log(`\nv5-fase2-stikproever: ${res.length} kontroller, ${fejl.length} fejl`);
  if (o.rapport) fs.writeFileSync(o.rapport, JSON.stringify(res, null, 1));
  process.exit(fejl.length ? 1 : 0);
}
main().catch(e => { console.error('v5-fase2-stikproever: ' + e.message); process.exit(2); });
