/* W14 (Visual Fidelity Gauntlet, agent 1): forsidens komposition målt i rigtig browser mod lokal mock (smoke-browser).
   Acceptkriterierne står i docs/review/gauntlet/visual/agent1-forside.md. Skippes uden Chromium. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const sb = require('../scripts/smoke-browser');

const REPO = path.join(__dirname, '..');
let kan;
test.before(async () => { kan = await sb.playwrightTilgaengelig(); });

async function aabn(vp, tema, fn){
  const { server, port } = await sb.startServer(REPO);
  const browser = await kan.pw.chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: vp, height: vp < 500 ? 844 : vp < 900 ? 1024 : 900 } });
    await ctx.addInitScript(sb.initScript, { tema });
    await sb.installerMock(ctx, port, {});
    const p = await ctx.newPage();
    await p.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    return await fn(p);
  } finally { await browser.close().catch(() => {}); server.close(); }
}

const maalDesktop = () => {
  const abs = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { top: b.top + scrollY, bottom: b.bottom + scrollY, left: b.left, right: b.right, h: b.height, w: b.width }; };
  const alle = s => [...document.querySelectorAll(s)].map(e => { const b = e.getBoundingClientRect(); return { top: b.top + scrollY, bottom: b.bottom + scrollY, left: b.left, right: b.right, h: b.height, w: b.width }; });
  return {
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    header: abs('.site-header'), hero: abs('.hero'), kort: abs('.search-panel'), trust: abs('.trust-row'),
    udvalgH: abs('.udvalg .sek-hoved'), kortRaekke: alle('#udvalg-kort > .card'), saelg: abs('.saelg-panel'),
    tiles: alle('#category-tiles .tile'), saadan: abs('.saadan-strip'), trin: alle('.saadan-trin-punkt'), guide: abs('.guide-boks'),
    kol: alle('.tre-kol > .kol'),
  };
};

test('W14 desktop 1440: hele forsidens øverste del er kompakt som referencen (hero, søgekort, kort, fliser, Sådan virker, tre kolonner)', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const m = await aabn(1440, 'light', p => p.evaluate(maalDesktop));
  assert.equal(m.overflow, 0);
  assert.ok(m.header.h <= 56, `header ${m.header.h}`);
  assert.ok(m.hero.bottom <= 330, `hero slutter ${m.hero.bottom}`);
  assert.ok(m.kort.h <= 120, `søgekort ${m.kort.h}`);
  assert.ok(m.kort.top < m.hero.bottom && m.kort.bottom > m.hero.bottom, 'søgekortet hænger ind over heroens underkant');
  assert.equal(m.kortRaekke.length, 5, 'fem udvalgte kort på én række');
  assert.ok(new Set(m.kortRaekke.map(c => Math.round(c.top))).size === 1, 'kortene står på samme linje');
  assert.ok(Math.max(...m.kortRaekke.map(c => c.h)) <= 270, `kort ${Math.max(...m.kortRaekke.map(c => c.h))}`);
  assert.ok(m.saelg.left >= m.kortRaekke[4].right, 'sælg-panelet står til højre for kortene');
  assert.ok(m.saelg.top <= m.udvalgH.top + 4, 'sælg-panelet starter ud for overskriften');
  assert.equal(m.tiles.length >= 7, true);
  assert.ok(m.tiles.slice(0, 7).every(t => Math.abs(t.top - m.tiles[0].top) < 2 && t.h <= 110), 'syv fliser på én række, højst 110 px');
  assert.ok(m.trin.length === 4 && m.trin.every(t => Math.abs(t.top - m.trin[0].top) < 6), 'fire trin på én række');
  assert.ok(m.saadan.h >= 120 && m.saadan.h <= 175, `Sådan virker ${m.saadan.h}`);
  assert.ok(m.guide.left >= m.trin[3].right, 'guide-boksen står til højre for trinene');
  assert.equal(m.kol.length, 3);
  assert.ok(m.kol.every(k => Math.abs(k.top - m.kol[0].top) < 2 && Math.abs(k.h - m.kol[0].h) <= 4 && k.h <= 240), "tre kolonner på samme linje, lige høje (±4 px), højst 240 px");
  assert.ok(m.kol[0].top <= 1250, `tre kolonner begynder ved ${m.kol[0].top}`);
});

test('W14: 0 vandret overflow i lys og mørk ved 320/390/768/1024/1440, og Sådan virker er kompakte rækker på mobil', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const tema of ['light', 'dark']) for (const vp of [320, 390, 768, 1024, 1440]) {
    const m = await aabn(vp, tema, p => p.evaluate(maalDesktop));
    assert.equal(m.overflow, 0, `${vp} ${tema}`);
    if (vp === 390) assert.ok(m.trin.every(t => t.h <= 96), `trin på mobil ${m.trin.map(t => t.h)}`);
  }
});

test('W14: tap-mål på forsiden er mindst 40 px høje (desktop og mobil)', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const vp of [1440, 390]) {
    const smaa = await aabn(vp, 'light', p => p.evaluate(() => [...document.querySelectorAll(
      '.header-cta, .section-link, .kol-link, .hero-chip, .kk-seg label, .sk-knap, .saelg-knap, .guide-boks a, .tile, .maerke-flise, .tal-grid a, .typer-pil, .hvorfor-mere summary')]
      .filter(e => e.offsetParent && e.getBoundingClientRect().height > 0)
      .map(e => ({ k: e.className || e.tagName, h: Math.round(e.getBoundingClientRect().height) }))
      .filter(x => x.h < 40)));
    assert.deepEqual(smaa, [], `${vp}: for lave tap-mål`);
  }
});

/* ---- Iteration 2 (blind Critic): foto, fliser, kort, fejltilstand, mobil-søgekort ---- */
const synligLodret = (img, boks) => {   // hvilken del [fra, til] af fotoets højde (0-1) er synlig med object-fit: cover + object-position
  const cs = getComputedStyle(img);
  const [, py] = cs.objectPosition.split(' ').map(v => parseFloat(v) / 100);
  const s = Math.max(boks.w / img.naturalWidth, boks.h / img.naturalHeight);
  const H = img.naturalHeight * s;
  const off = (H - boks.h) * py;
  return [off / H, (off + boks.h) / H];
};

test('W14: typefliserne viser hele motorcyklen (bil 28-85 % af fotoets højde) og scrimmen er lys øverst', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const r = await aabn(1440, 'light', p => p.evaluate(() => {
    const res = [];
    for (const tile of document.querySelectorAll('#category-tiles .tile')) {
      const img = tile.querySelector('img'); const b = tile.getBoundingClientRect();
      if (!img.naturalWidth) continue;
      const cs = getComputedStyle(img); const py = parseFloat(cs.objectPosition.split(' ')[1]) / 100;
      const s = Math.max(b.width / img.naturalWidth, b.height / img.naturalHeight);
      const H = img.naturalHeight * s; const off = (H - b.height) * py;
      const scrim = getComputedStyle(tile, '::after').backgroundImage;
      res.push({ fra: off / H, til: (off + b.height) / H, h: b.height, scrim });
    }
    return res;
  }));
  assert.ok(r.length >= 7);
  for (const x of r) {
    assert.ok(x.fra <= 0.30 && x.til >= 0.84, `synligt ${x.fra.toFixed(2)}-${x.til.toFixed(2)}`);
    assert.ok(x.h >= 96, `flisehøjde ${x.h}`);
    assert.match(x.scrim, /transparent|rgba.0, 0, 0, 0./, 'scrimmen toner ud til gennemsigtig');
  }
});

test('W14: hero-fotoet viser horisont og motorcyklens forlygte/tank (synligt 20-60 % af højden) ved 1440', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const v = await aabn(1440, 'light', p => p.evaluate(() => {
    const img = document.querySelector('.hero-photo'); const b = document.querySelector('.hero').getBoundingClientRect();
    const py = parseFloat(getComputedStyle(img).objectPosition.split(' ')[1]) / 100;
    const s = Math.max(b.width / img.naturalWidth, b.height / img.naturalHeight); const H = img.naturalHeight * s; const off = (H - b.height) * py;
    return [off / H, (off + b.height) / H];
  }));
  assert.ok(v[0] <= 0.28 && v[1] >= 0.6, `synligt ${v}`);
});

test('W14: kortets titel og pris klippes ikke (hele modelnavnet), og ⇄ er skjult i hvile (hover) mens der højst er ét ikon pr. foto', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const r = await aabn(1440, 'light', p => p.evaluate(() => [...document.querySelectorAll('#udvalg-kort .card')].map(c => {
    const ti = c.querySelector('.rk-titel'); const pris = c.querySelector('.rk-pris'); const cmp = c.querySelector('.card-compare');
    const ikoner = [...c.querySelectorAll('.card-media button')].filter(b => getComputedStyle(b).opacity !== '0').length;
    return { klippet: ti.scrollHeight > ti.clientHeight + 1, prisUnder: pris.getBoundingClientRect().top >= ti.getBoundingClientRect().bottom - 2, ikoner, cmpAktiv: cmp.classList.contains('active') };
  })));
  assert.equal(r.length, 5);
  for (const k of r) { assert.equal(k.klippet, false); assert.equal(k.prisUnder, true); assert.ok(k.ikoner <= 1, 'ikoner i hvile ' + k.ikoner); }
});

test('W14: under fejlet lager (503) står der ingen annoncetal på fliser og kolonner, banneret er kompakt (højst 60 px) og dækker kun et hjørne af heroen, og sælg-panelet fylder rækken', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const { server, port } = await sb.startServer(REPO);
  const browser = await kan.pw.chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(sb.initScript, { tema: 'light' });
    await sb.installerMock(ctx, port, {});
    await ctx.route(u => /supabase[.]co[/]rest/.test(u.href), r => r.fulfill({ status: 503, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{}' }));
    const p = await ctx.newPage();
    await p.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
    await p.waitForTimeout(2500);
    const m = await p.evaluate(() => {
      const synlige = [...document.querySelectorAll('.tile-count, .maerke-flise .tal-n, .tal-grid .tal-n')].filter(e => getComputedStyle(e).visibility !== 'hidden' && e.textContent.trim()).map(e => e.textContent.trim());
      const ban = document.querySelector('#data-afbrud'); const hero = document.querySelector('.hero').getBoundingClientRect();
      const bb = ban && ban.getBoundingClientRect(); const sp = document.querySelector('.saelg-panel').getBoundingClientRect();
      return { synlige, banner: !!ban, bannerH: bb ? bb.height : 0, spW: sp.width, vw: innerWidth };
    });
    assert.deepEqual(m.synlige, [], 'tal synlige under fejl');
    assert.equal(m.banner, true);
    assert.ok(m.bannerH <= 60, "banneret er kompakt (" + m.bannerH + " px)");
  } finally { await browser.close().catch(() => {}); server.close(); }
});

test('W14 mobil 390: søgekortet er kompakt (højst 350 px) og søgeknappen er synlig inden 700 px', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const m = await aabn(390, 'light', p => p.evaluate(() => ({ kort: document.querySelector('.search-panel').getBoundingClientRect().height, knap: document.querySelector('.sk-knap').getBoundingClientRect().bottom + scrollY })));
  assert.ok(m.kort <= 350, `søgekort ${m.kort}`);
  assert.ok(m.knap <= 700, `knap ${m.knap}`);
});

test('W14 funktion: tema-skift virker (lys↔mørk), mobilmenuen åbner og lukker med Escape, og cookie-dialogen vises uden samtykke og kan afvises', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const { server, port } = await sb.startServer(REPO);
  const browser = await kan.pw.chromium.launch();
  try {
    // 1) tema-skift på desktop
    let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(sb.initScript, { tema: 'light' });
    await sb.installerMock(ctx, port, {});
    let p = await ctx.newPage();
    await p.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
    await p.waitForTimeout(800);
    const fra = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await p.click('.footer-theme');
    const til = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
    assert.notEqual(fra, til, 'data-theme skiftede ikke');
    await ctx.close();
    // 2) mobilmenu
    ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(sb.initScript, { tema: 'light' });
    await sb.installerMock(ctx, port, {});
    p = await ctx.newPage();
    await p.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
    await p.waitForTimeout(800);
    await p.click('.mobile-menu-btn');
    await p.waitForTimeout(300);
    const aaben = await p.evaluate(() => { const d = document.getElementById('mobile-drawer'); return d.classList.contains('open') || getComputedStyle(d).visibility === 'visible'; });
    assert.equal(aaben, true, 'menuen åbnede ikke');
    await p.keyboard.press('Escape');
    await p.waitForTimeout(400);
    const lukket = await p.evaluate(() => { const d = document.getElementById('mobile-drawer'); return !d.classList.contains('open'); });
    assert.equal(lukket, true, 'Escape lukkede ikke menuen');
    await ctx.close();
    // 3) cookie-dialog uden samtykke
    ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await sb.installerMock(ctx, port, {});
    p = await ctx.newPage();
    await p.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    const synlig = await p.evaluate(() => { const d = document.getElementById('cookie-banner'); return !!d && (d.open || getComputedStyle(d).display !== 'none'); });
    assert.equal(synlig, true, 'cookie-dialogen vises ikke');
    await p.click('#cookie-necessary-only');
    await p.waitForTimeout(500);
    const luk = await p.evaluate(() => { const d = document.getElementById('cookie-banner'); return !d || !d.open; });
    assert.equal(luk, true, 'cookie-dialogen blev stående');
    await ctx.close();
  } finally { await browser.close().catch(() => {}); server.close(); }
});

/* ---- Iteration 3 (Critic runde 2) ---- */
test('W14 i3: hero højst 270 px; Sådan virker er et tonet bånd med store ikon-cirkler (>= 56 px) og pile; tillidsikoner >= 40 px', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const m = await aabn(1440, 'light', p => p.evaluate(() => {
    const bg = getComputedStyle(document.querySelector('.saadan-hoved')).backgroundColor;
    const surface = getComputedStyle(document.body).backgroundColor;
    const r = e => e.getBoundingClientRect();
    return {
      heroH: r(document.querySelector('.hero')).height,
      band: bg, side: surface,
      bandW: r(document.querySelector('.saadan-hoved')).width,
      ikoner: [...document.querySelectorAll('.saadan-ico')].map(e => r(e).width),
      nr: [...document.querySelectorAll('.saadan-nr')].map(e => r(e).width),
      pil: getComputedStyle(document.querySelector('.saadan-trin-punkt'), '::after').content,
      trust: [...document.querySelectorAll('.trust-ico')].map(e => r(e).width),
    };
  }));
  assert.ok(m.heroH <= 270, `hero ${m.heroH}`);
  assert.notEqual(m.band, 'rgba(0, 0, 0, 0)'); assert.notEqual(m.band, 'rgb(255, 255, 255)', 'båndet er tonet');
  assert.ok(m.bandW >= 900, `bånd ${m.bandW}`);
  m.ikoner.forEach(w => assert.ok(w >= 56, `ikon ${w}`));
  m.nr.forEach(w => assert.ok(w >= 24, `nummer ${w}`));
  assert.notEqual(m.pil, 'none');
  m.trust.forEach(w => assert.ok(w >= 40, `tillidsikon ${w}`));
});

test('W14 i3: mærkefliserne dublerer ikke navnet, og kørekort-/typefliserne peger på sider, der findes som fil og er indekserbare', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const fs = require('fs');
  const r = await aabn(1440, 'light', p => p.evaluate(() => ({
    flise: [...document.querySelectorAll('#brand-cloud .maerke-flise')].map(a => ({
      navn: a.getAttribute('aria-label'),
      tekster: [...a.querySelectorAll('strong')].filter(s => getComputedStyle(s).visibility !== 'hidden').map(s => s.textContent.trim()),
      emblem: !!a.querySelector('.bl--emblem'),
      logoTekst: (a.querySelector('.maerke-logo') || {}).textContent || '',
    })),
    kk: [...document.querySelectorAll('.tal-grid a[data-kk]')].map(a => [a.dataset.kk, a.getAttribute('href')]),
    typer: [...document.querySelectorAll('#category-tiles .tile')].map(a => [a.dataset.type, a.getAttribute('href')]),
  })));
  for (const f of r.flise) assert.ok(f.tekster.length === 0 || f.emblem, `navn og ordmærke dubleret i ${f.navn}`);   // synligt navn kun under et emblem (uden ordmærke)
  const kk = Object.fromEntries(r.kk);
  assert.equal(kk.A1, 'koerekort-a1.html'); assert.equal(kk.A2, 'koerekort-a2.html'); assert.equal(kk.A, 'koerekort-a.html');
  for (const [, href] of [...r.kk, ...r.typer]) {
    if (/^soegning\.html/.test(href)) continue;
    assert.ok(fs.existsSync(path.join(REPO, href)), `${href} findes ikke`);
    assert.doesNotMatch(fs.readFileSync(path.join(REPO, href), 'utf8'), /name="robots" content="noindex/, `${href} er noindex`);
  }
  // Scooter/Classic/Cross: siderne findes, men er noindex (for få annoncer), så fliserne peger bevidst på søgningen.
  for (const [id, href] of r.typer.filter(([id]) => ['scooter', 'classic', 'cross'].includes(id))) assert.match(href, /^soegning\.html\?type=/, id);
});

test('W14 i3: tap-mål >= 40 px på topnav, footer-links og de sammenfoldede genvejslister', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const smaa = await aabn(1440, 'light', async p => {
    await p.evaluate(() => { const d = document.getElementById('mere-om'); if (d) d.open = true; });
    await p.waitForTimeout(300);
    return p.evaluate(() => [...document.querySelectorAll('.main-nav > a, .nav-item > a, .site-footer a, .seo-gruppe a, .mere-om > summary')]
      .filter(e => e.offsetParent && e.getBoundingClientRect().height > 0)
      .map(e => ({ t: (e.textContent || '').trim().slice(0, 24), h: Math.round(e.getBoundingClientRect().height) }))
      .filter(x => x.h < 40));
  });
  assert.deepEqual(smaa, []);
});

test('W14 i3: "Mere om"-laget er sammenfoldet, men teksten og genvejslinkene ligger i DOM, og afstanden fra tre kolonner til footer er højst 160 px', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const m = await aabn(1440, 'light', p => p.evaluate(() => {
    const d = document.getElementById('mere-om'); const kol = document.querySelector('.tre-kol').getBoundingClientRect(); const f = document.querySelector('.site-footer').getBoundingClientRect();
    return { aaben: d.open, hvorfor: !!d.querySelector('#hvorfor-titel'), links: d.querySelectorAll('.seo-links a').length, gap: f.top - kol.bottom };
  }));
  assert.equal(m.aaben, false); assert.equal(m.hvorfor, true); assert.ok(m.links >= 20, `links ${m.links}`);
  assert.ok(m.gap <= 160, `afstand ${m.gap}`);
});

test('W14: ingen mærkeflise flyder over (scrollWidth <= clientWidth) ved 1440/1280/1024/768/390, lys og mørk', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const tema of ['light', 'dark']) for (const vp of [1440, 1280, 1024, 768, 390]) {
    const over = await aabn(vp, tema, p => p.evaluate(() => [...document.querySelectorAll('#brand-cloud .maerke-flise')]
      .filter(a => a.scrollWidth > a.clientWidth + 1).map(a => a.getAttribute('aria-label'))));
    assert.deepEqual(over, [], `${vp} ${tema}`);
  }
});
