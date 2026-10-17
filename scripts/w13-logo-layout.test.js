/* W13 logo-system: layout, CLS, fejlfald, kontrast, overflow og hurtigsøg MÅLT i rigtig headless Chromium.
   Testside + placeholder-SVG'er (ikke rigtige logoer) via en lokal server; genererede sider fra en kopi udenfor repoet.
   Playwright mangler -> springes over. */
const test = require('node:test');
const assert = require('node:assert');
const os = require('os');
const path = require('path');
const G = require('./brand-logos-gen.js');
const H = require('./__fixtures__/w13-logo-hjaelp.js');
const S = require('./__fixtures__/w13-logo-server.js');
const T = require('./__fixtures__/w13-logo-side.js');

let pw = null;
try { pw = require('./smoke-browser').findPlaywright(); } catch (e) { /* springes over */ }
const BASE = path.join(os.tmpdir(), 'w13-logo');
const VIEW = [[320, 700], [390, 844], [768, 900], [1440, 900]];

let browser, sv, svGen, svFra, dirTil, dirFra;
const skip = () => !browser;

test.before(async () => {
  if (!pw) return;
  try { browser = await pw.chromium.launch({ headless: true }); } catch (e) { return; }
  dirTil = H.bygKopi(path.join(BASE, 'lay-til'), { logoer: true });
  dirFra = H.bygKopi(path.join(BASE, 'lay-fra'), { logoer: false });
  sv = await S.start(H.ROOT, { med: () => T.side(true), uden: () => T.side(false) });
  svGen = await S.start(dirTil, {});
  svFra = await S.start(dirFra, {});
});
test.after(async () => {
  if (browser) await browser.close();
  for (const s of [sv, svGen, svFra]) if (s) await s.close();
});

async function side(url, { w = 1440, h = 900, tema = 'light' } = {}){
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: tema });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  return { page, ctx };
}
/* Vent til alle logoer, der er med i layoutet, er hentet (klar) eller fejlet. (Polling i tid, ikke pr. frame: en idle headless-side tegner ikke af sig selv.) */
async function rulOgVent(page){
  await page.waitForFunction(() => !document.querySelector('.bl--logo:not(.bl--img):not(.bl--klar):not(.bl--fejl)'), null, { timeout: 8000, polling: 50 });
}
const svgKald = sv_ => sv_.tilstand.forespoergsler.filter(p => /^\/img\/brands\/.+\.svg$/.test(p));
const taelPrFil = liste => liste.reduce((o, p) => { o[p] = (o[p] || 0) + 1; return o; }, {});
const maalSlots = page => page.evaluate(() => [...document.querySelectorAll('.bl')].map(e => {
  const r = e.getBoundingClientRect();
  return { slug: e.dataset.bl, kl: e.className, w: r.width, h: r.height, x: r.x, y: r.y, fejl: e.classList.contains('bl--fejl') };
}));
const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const kontrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const rgb = s => (/rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s) || []).slice(1, 4).map(Number);

test('A6/A9 slots: fallback og logo har areal > 0, ligger inden for slotten, og den visuelle vægt er ensartet', async t => {
  if (skip()) return t.skip('Chromium mangler');
  const { page, ctx } = await side(sv.url + '/t-med.html');
  await rulOgVent(page);
  const alle = await maalSlots(page);
  assert.ok(alle.length > 60);
  for (const s of alle) assert.ok(s.w > 0 && s.h > 0, `${s.slug} ${s.kl} har intet areal`);
  const [mh, mw] = [30, 60];
  const v = await page.evaluate(() => [...document.querySelectorAll('#vaegt [data-n]')].map(e => { const r = e.querySelector('.bl').getBoundingClientRect(); return { n: e.dataset.n, w: r.width, h: r.height, logo: e.querySelector('.bl').classList.contains('bl--logo') }; }));
  const logoer = v.filter(x => x.logo);
  assert.ok(logoer.length >= 7);
  for (const x of logoer){ assert.ok(x.w <= mw + 0.5 && x.h <= mh + 0.5, `${x.n} ${x.w}x${x.h} uden for slot`); }
  // forhold ≥ 0,9: smalle, høje logoer (< 0,9) er højdebegrænset og kan ikke blive større uden at overskride slotten
  const arealer = logoer.filter(x => x.w / x.h >= 0.85).map(x => x.w * x.h);
  assert.ok(arealer.length >= 6);
  assert.ok(Math.max(...arealer) / Math.min(...arealer) <= 2.2, `visuel vægt ${arealer.map(Math.round)}`);
  // masken maler faktisk noget (logoet er ikke usynligt): mindst ét ikke-transparent område i .bl-mark
  const mal = await page.evaluate(() => [...document.querySelectorAll('.bl--logo.bl--klar .bl-mark')].map(m => ({ maske: getComputedStyle(m).webkitMaskImage || getComputedStyle(m).maskImage, synlig: getComputedStyle(m).visibility })));
  assert.ok(mal.length > 30, 'logoerne på siden er hentet og klar');
  assert.ok(mal.every(x => /url\("blob:/.test(x.maske) && x.synlig === 'visible'));
  assert.equal(await page.evaluate(() => document.querySelectorAll('.bl--fejl').length), 0, 'ingen fejl når filerne leveres');
  // ens visuel vægt i ALLE slots (ens max-højde + max-bredde + max-areal): største/mindste areal ≤ 2,2 for logoer med forhold ≥ 0,85, og ingen uden for sin slot
  const SL = { sm: [22, 56], md: [30, 60], lg: [40, 120], xl: [64, 160], hero: [72, 280] };
  const va = await page.evaluate(() => [...document.querySelectorAll('#vaegt-alle [data-n]')].map(e => { const b = e.querySelector('.bl'); const r = b.getBoundingClientRect(); return { n: e.dataset.n, s: e.dataset.s, w: r.width, h: r.height, logo: b.classList.contains('bl--logo') }; }));
  for (const [s, [smh, smw]] of Object.entries(SL)){
    const rk = va.filter(x => x.s === s && x.logo);
    assert.ok(rk.length >= 7, `${s}: logoer`);
    for (const x of rk) assert.ok(x.w <= smw + 0.5 && x.h <= smh + 0.5, `${s} ${x.n} ${x.w}x${x.h} uden for ${smw}x${smh}`);
    const a = rk.filter(x => x.w / x.h >= 0.85).map(x => x.w * x.h);
    assert.ok(Math.max(...a) / Math.min(...a) <= 2.2, `${s}: visuel vægt ${a.map(Math.round)}`);
  }
  await ctx.close();
});

test('P2-1 hver SVG hentes højst ÉN gang pr. sideindlæsning (cache slået fra: serveren sender no-store), også ved gentagne og dynamisk indsatte logoer', async t => {
  if (skip()) return t.skip('Chromium mangler');
  sv.tilstand.forespoergsler.length = 0;
  const { page, ctx } = await side(sv.url + '/t-med.html');
  await rulOgVent(page);
  // 40 ekstra slots med SAMME filer indsættes dynamisk: ingen nye hentninger
  await page.evaluate(() => {
    const b = BrandLogos.opret(JSON.parse(document.getElementById('testdata').textContent));
    document.getElementById('indsaet').innerHTML = Array.from({ length: 5 }, () => ['Honda', 'Yamaha', 'BMW', 'Kawasaki', 'KTM', 'Ducati', 'Triumph', 'Suzuki'].map(n => b.logoHTML(n, { storrelse: 'lg' })).join('')).join('');
  });
  await page.waitForFunction(() => !document.querySelector('#indsaet .bl--logo:not(.bl--img):not(.bl--klar):not(.bl--fejl)'), null, { timeout: 8000, polling: 50 });
  const pr = taelPrFil(svgKald(sv).filter(p => /\/fx-(?!multi)/.test(p)));
  const filer = Object.keys(pr);
  assert.ok(filer.length >= 8, `placeholder-filer hentet: ${filer.join(', ')}`);
  for (const [f, n] of Object.entries(pr)) assert.equal(n, 1, `${f} blev hentet ${n} gange`);
  const slots = await page.evaluate(() => document.querySelectorAll('.bl--logo.bl--klar').length);
  assert.ok(slots > filer.length * 3, `${slots} logo-slots deler ${filer.length} filer`);
  await ctx.close();
});

test('P2-1 hver unik fil hentes én gang pr. side også på de genererede sider (maerker.html: tiles + A–Z), og den statiske bl-ref henter intet', async t => {
  if (skip()) return t.skip('Chromium mangler');
  for (const url of ['/maerker.html', '/maerke-honda.html', '/maerke-kawasaki.html']){
    svGen.tilstand.forespoergsler.length = 0;
    const { page, ctx } = await side(svGen.url + url);
    await rulOgVent(page);
    const dom = await page.evaluate(() => ({
      src: [...new Set([...document.querySelectorAll('.bl--logo .bl-mark')].map(m => m.dataset.blSrc))],
      ref: [...document.querySelectorAll('img.bl-ref')].map(i => ({ lazy: i.loading, skjult: i.hidden, billede: i.complete && i.naturalWidth > 0 })),
      klar: document.querySelectorAll('.bl--logo.bl--klar').length, antal: document.querySelectorAll('.bl--logo:not(.bl--img)').length,
    }));
    // (testens ene flerfarvede placeholder, fx-multi, er et rigtigt <img> — browserens egen billedhentning; ingen godkendt logo er flerfarvet)
    const pr = taelPrFil(svgKald(svGen).filter(p => !/fx-multi/.test(p)));
    for (const [f, n] of Object.entries(pr)) assert.equal(n, 1, `${url}: ${f} blev hentet ${n} gange`);
    assert.deepEqual(Object.keys(pr).sort(), dom.src.map(s => '/' + s).sort(), `${url}: præcis de filer, siden bruger, hentes — hverken flere (probe/ref) eller færre`);
    assert.equal(dom.klar, dom.antal, `${url}: alle logoer er klar`);
    assert.ok(dom.ref.length >= dom.src.length && dom.ref.every(r => r.lazy === 'lazy' && r.skjult && !r.billede), 'statisk filreference er skjult + lazy og indlæses ikke');
    await ctx.close();
  }
});

test('P2-1 logoer i et skjult panel henter intet, før de kommer til syne (IntersectionObserver)', async t => {
  if (skip()) return t.skip('Chromium mangler');
  sv.tilstand.forespoergsler.length = 0;
  const { page, ctx } = await side(sv.url + '/t-uden.html');   // siden uden logoer: intet andet henter de to filer
  await page.evaluate(() => {
    const b = BrandLogos.opret(JSON.parse(document.getElementById('testdata').textContent));
    const d = document.createElement('div'); d.id = 'panel'; d.hidden = true;
    d.innerHTML = ['Triumph', 'Yamaha'].map(n => `<span class="bl-spalte bl-spalte--sm">${b.logoHTML(n, { storrelse: 'sm' })}</span>`).join('');
    document.body.prepend(d);
  });
  await page.waitForTimeout(400);
  const foer = taelPrFil(svgKald(sv));
  assert.deepEqual(foer, {}, 'skjult panel: intet hentet');
  await page.evaluate(() => { document.getElementById('panel').hidden = false; });
  await page.waitForFunction(() => document.querySelectorAll('#panel .bl--klar').length === 2, null, { timeout: 5000, polling: 50 });
  assert.deepEqual(taelPrFil(svgKald(sv)), { '/img/brands/fx-tall.svg': 1, '/img/brands/fx-triangle.svg': 1 }, 'hentet én gang hver, da panelet blev vist');
  await ctx.close();
});

test('A7 CLS = 0: slotmål er de samme før og efter at logofilerne er hentet, og layout-shift er 0', async t => {
  if (skip()) return t.skip('Chromium mangler');
  sv.tilstand.svg = 'langsom';
  try {
    const { page, ctx } = await side(sv.url + '/t-med.html');
    const r = await page.evaluate(async () => {
      let cls = 0;
      new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value; }).observe({ type: 'layout-shift', buffered: false });
      const data = JSON.parse(document.getElementById('testdata').textContent);
      const b = BrandLogos.opret(data);
      const mount = document.getElementById('indsaet');
      mount.innerHTML = ['Honda', 'Yamaha', 'BMW', 'Kawasaki', 'KTM', 'Ducati'].map(n => b.logoHTML(n, { storrelse: 'lg' })).join(' ');
      const maal = () => [...mount.querySelectorAll('.bl')].map(e => { const q = e.getBoundingClientRect(); return [q.x, q.y, q.width, q.height]; });
      const foer = maal();
      await new Promise(res => setTimeout(res, 1200));
      const efter = maal();
      return { foer, efter, cls };
    });
    assert.deepEqual(r.efter, r.foer, 'slotten flyttede sig, da logofilen kom');
    assert.equal(r.cls, 0);
    await ctx.close();
  } finally { sv.tilstand.svg = 'ok'; }
});

test('A8 fejlet logo (404): bl--fejl, maske skjult, fallback har areal, slotten flytter sig ikke', async t => {
  if (skip()) return t.skip('Chromium mangler');
  sv.tilstand.svg = '404';
  try {
    sv.tilstand.forespoergsler.length = 0;
    const { page, ctx } = await side(sv.url + '/t-med.html');
    await rulOgVent(page);
    const foer = await maalSlots(page);
    // også ved 404 hentes hver fil højst én gang (ingen probe ved siden af masken)
    for (const [f, n] of Object.entries(taelPrFil(svgKald(sv).filter(p => /fx-(?!multi)/.test(p))))) assert.equal(n, 1, `${f} blev hentet ${n} gange ved 404`);
    // Siden indlæser også standardmanifestet med de RIGTIGE godkendte logoer (leveres med 200). Kun testens placeholder-logoer (fx-*.svg) sættes til 404.
    const r = await page.evaluate(() => [...document.querySelectorAll('.bl--logo')].filter(e => e.innerHTML.includes('/fx-')).map(e => {
      const fb = e.querySelector('.bl-fb'); const q = fb.getBoundingClientRect();
      const mask = e.querySelector('.bl-mark, .bl-img');
      return { fejl: e.classList.contains('bl--fejl'), fbW: q.width, fbH: q.height, masketSkjult: getComputedStyle(mask).display === 'none', tekst: fb.textContent.trim() };
    }));
    assert.ok(r.length >= 20, 'logo-slots på siden');
    for (const x of r){ assert.ok(x.fejl, 'bl--fejl mangler'); assert.ok(x.fbW > 0 && x.fbH > 0 && x.tekst, 'fallback usynlig'); assert.ok(x.masketSkjult); }
    // dynamisk indsat markup får også fejl-fallback (capture-lytteren)
    const dyn = await page.evaluate(async () => {
      const b = BrandLogos.opret(JSON.parse(document.getElementById('testdata').textContent));
      const m = document.getElementById('indsaet'); m.innerHTML = b.logoHTML('Suzuki', { storrelse: 'md' }) + b.logoHTML('Honda', { storrelse: 'md' });
      await new Promise(res => setTimeout(res, 500));
      return [...m.querySelectorAll('.bl')].map(e => e.classList.contains('bl--fejl'));
    });
    assert.deepEqual(dyn, [true, true]);
    for (const [f, n] of Object.entries(taelPrFil(svgKald(sv).filter(p => /fx-(?!multi)/.test(p))))) assert.equal(n, 1, `${f} blev hentet ${n} gange (også dynamisk indsat markup)`);
    const efter = (await maalSlots(page)).slice(0, foer.length);   // de to dynamisk indsatte ligger sidst
    assert.equal(efter.length, foer.length);
    foer.forEach((s, i) => assert.ok(Math.abs(s.w - efter[i].w) < 0.5 && Math.abs(s.h - efter[i].h) < 0.5, `${s.slug} skiftede størrelse`));
    await ctx.close();
  } finally { sv.tilstand.svg = 'ok'; }
});

test('A10 lys/mørk: maskefarve følger tokens, tekstfallback har kontrast ≥ 4,5:1, hero er hvid på mørkt', async t => {
  if (skip()) return t.skip('Chromium mangler');
  const farver = {};
  for (const tema of ['light', 'dark']){
    for (const side_ of ['med', 'uden']){
      const { page, ctx } = await side(sv.url + `/t-${side_}.html`, { tema });
      await page.evaluate(tm => document.documentElement.setAttribute('data-theme', tm), tema);
      const r = await page.evaluate(() => {
        const cs = e => getComputedStyle(e);
        const bg = e => { for (let n = e; n; n = n.parentElement){ const c = cs(n).backgroundColor; if (c && !/rgba?\(\d+, \d+, \d+, 0\)/.test(c) && c !== 'transparent') return c; } return 'rgb(255,255,255)'; };
        const fg = cs(document.documentElement).getPropertyValue('--color-fg').trim();
        const ord = [...document.querySelectorAll('[data-test="alene"] .bl-wordmark')].map(e => ({ c: cs(e).color, bg: bg(e.parentElement) }));
        const mono = [...document.querySelectorAll('.maerke-flise .bl-mono, .filter-test .bl-mono')].map(e => ({ c: cs(e).color, bg: cs(e).backgroundColor }));
        const mask = document.querySelector('.bl--logo .bl-mark');
        const hero = document.querySelector('.hero-test .bl-mark, .hero-test .bl-mono');
        return { fg, ord, mono, mask: mask ? cs(mask).backgroundColor : null, hero: hero ? cs(hero.closest('.bl')).color : null, heroBg: cs(document.querySelector('.hero-test')).backgroundColor };
      });
      if (side_ === 'med') farver[tema] = r.mask;
      for (const o of r.ord) assert.ok(kontrast(rgb(o.c), rgb(o.bg)) >= 4.5, `${tema} ordmærke ${o.c} på ${o.bg} = ${kontrast(rgb(o.c), rgb(o.bg)).toFixed(2)}`);
      for (const o of r.mono) assert.ok(kontrast(rgb(o.c), rgb(o.bg)) >= 4.5, `${tema} monogram ${o.c} på ${o.bg} = ${kontrast(rgb(o.c), rgb(o.bg)).toFixed(2)}`);
      assert.ok(kontrast(rgb(r.hero), rgb(r.heroBg)) >= 4.5, 'hero: hvid på mørk');
      if (side_ === 'med') assert.notEqual(r.mask, null);
      await ctx.close();
    }
  }
  assert.notEqual(farver.light, farver.dark, 'masken skal skifte farve med temaet (currentColor)');
});

test('A11 ingen vandret overflow ved 320/390/768/1440 — testside (med/uden logo) og genererede sider', async t => {
  if (skip()) return t.skip('Chromium mangler');
  const mål = [[sv.url + '/t-med.html'], [sv.url + '/t-uden.html'],
    [svGen.url + '/maerker.html'], [svGen.url + '/maerke-honda.html'], [svGen.url + '/maerke-kawasaki.html'], [svGen.url + '/maerke-bsa.html'],
    [svFra.url + '/maerker.html'], [svFra.url + '/maerke-harley-davidson.html']];
  for (const [w, h] of VIEW) for (const [url] of mål){
    for (const tema of ['light', 'dark']){
      const { page, ctx } = await side(url, { w, h, tema });
      const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      assert.ok(o.sw <= o.cw, `${url} @${w} ${tema}: scrollWidth ${o.sw} > ${o.cw}`);
      await ctx.close();
    }
  }
});

test('A15 genereret mærkeside: logoet er i hero og CTA og har fast slot; mærker uden logo har samme struktur', async t => {
  if (skip()) return t.skip('Chromium mangler');
  const { page, ctx } = await side(svGen.url + '/maerke-honda.html', { w: 1440 });
  const r = await page.evaluate(() => {
    const q = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { w: b.width, h: b.height, top: b.top, farve: getComputedStyle(e.querySelector('.bl-mark') || e).backgroundColor }; };
    const h1 = document.querySelector('.mk-hero h1').getBoundingClientRect().top;
    return { hero: q('.mk-hero .bl--hero'), cta: q('.mk-cta .bl--lg'), h1 };
  });
  assert.ok(r.hero && r.cta);
  assert.ok(r.hero.h >= 56 && r.hero.h <= 72.5 && r.hero.w <= 280.5, `hero-logo ${r.hero.w}x${r.hero.h}px (ramme 56–72 px høj, op til 280 bred)`);
  assert.ok(r.hero.top < r.h1, 'logoet står over H1');
  assert.equal(r.hero.farve, 'rgb(255, 255, 255)', 'hvidt på hero-foto');
  assert.ok(r.cta.h <= 40.5);
  await ctx.close();
});

test('A16 hurtigsøg på maerker.html: filtrerer, siger «Ingen mærker matcher.», Enter navigerer; skjult uden JS', async t => {
  if (skip()) return t.skip('Chromium mangler');
  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const p0 = await noJs.newPage(); await p0.goto(svFra.url + '/maerker.html');
  assert.equal(await p0.locator('[data-mk-hurtigsoeg]').isVisible(), false, 'skjult uden JS');
  assert.ok(await p0.locator('.mk-az a').count() >= 29, 'A-Z virker uden JS');
  await noJs.close();

  const { page, ctx } = await side(svFra.url + '/maerker.html');
  const input = page.locator('#mk-hurtigsoeg-input');
  assert.equal(await input.isVisible(), true);
  const total = await page.locator('.mk-az li:visible').count();
  assert.ok(total >= 29);
  await input.fill('harley');
  assert.deepEqual(await page.locator('.mk-az li:visible a').evaluateAll(a => a.map(x => x.getAttribute('href'))), ['maerke-harley-davidson.html']);
  assert.match(await page.locator('.mk-hurtigsoeg-status').textContent(), /1 mærke matcher/);
  await input.fill('bmw motorrad');
  assert.equal(await page.locator('.mk-az li:visible').count(), 1);
  await input.fill('zzzz');
  assert.equal(await page.locator('.mk-az li:visible').count(), 0);
  assert.equal((await page.locator('.mk-hurtigsoeg-status').textContent()).trim(), 'Ingen mærker matcher.');
  assert.equal(await page.locator('.mk-az-gruppe:visible').count(), 0);
  await input.fill('');
  assert.equal(await page.locator('.mk-az li:visible').count(), total);
  await input.fill('moto gu');
  await Promise.all([page.waitForURL(/maerke-moto-guzzi\.html/), input.press('Enter')]);
  await ctx.close();
});

test('P2-1 en logofil, der svarer 200 men er en HTML-side i stedet for SVG, giver fallback — aldrig tom plads', async t => {
  if (skip()) return t.skip('Chromium mangler');
  sv.tilstand.svg = 'html';
  try {
    sv.tilstand.forespoergsler.length = 0;
    const { page, ctx } = await side(sv.url + '/t-med.html');
    await rulOgVent(page);
    const r = await page.evaluate(() => [...document.querySelectorAll('.bl--logo:not(.bl--img)')].filter(e => e.innerHTML.includes('/fx-')).map(e => {
      const fb = e.querySelector('.bl-fb').getBoundingClientRect();
      return { fejl: e.classList.contains('bl--fejl'), klar: e.classList.contains('bl--klar'), fbH: fb.height, maske: getComputedStyle(e.querySelector('.bl-mark')).display };
    }));
    assert.ok(r.length > 20);
    for (const x of r){ assert.ok(x.fejl && !x.klar && x.fbH > 0 && x.maske === 'none'); }
    for (const [f, n] of Object.entries(taelPrFil(svgKald(sv).filter(p => /fx-(?!multi)/.test(p))))) assert.equal(n, 1, f);
    await ctx.close();
  } finally { sv.tilstand.svg = 'ok'; }
});

test('P2-2 A–Z-liste og filter: alle rækker har ens kolonnebredde (56 px) og ens venstrekant; brede logoer (Kawasaki, KTM) er logoer, ikke monogram; mærker uden logo har monogram i samme kolonne', async t => {
  if (skip()) return t.skip('Chromium mangler');
  for (const [w, tema] of [[1440, 'light'], [390, 'dark']]){
    const { page, ctx } = await side(sv.url + '/t-med.html', { w, tema });
    await rulOgVent(page);
    const rk = await page.evaluate(() => [...document.querySelectorAll('[data-test="az"] .az-rad')].map(l => {
      const sp = l.querySelector('.bl-spalte').getBoundingClientRect(); const bl = l.querySelector('.bl'); const b = bl.getBoundingClientRect(); const nv = l.querySelector('.az-navn').getBoundingClientRect();
      return { navn: l.querySelector('.az-navn').textContent, spW: sp.width, spX: sp.x, blX: b.x, blW: b.width, blH: b.height, navnX: nv.x, logo: bl.classList.contains('bl--logo'), emblem: bl.classList.contains('bl--emblem'), mono: bl.classList.contains('bl--mono') };
    }));
    assert.ok(rk.length >= 14);
    assert.deepEqual([...new Set(rk.map(x => x.spW))], [56], 'ens kolonnebredde');
    assert.equal(new Set(rk.map(x => Math.round(x.spX))).size, 1, `ens venstrekant for kolonnen @${w}`);
    assert.equal(new Set(rk.map(x => Math.round(x.navnX))).size, 1, `ens venstrekant for navnene @${w}`);
    assert.equal(new Set(rk.map(x => Math.round(x.blX))).size, 1, `logo/monogram står venstrestillet i kolonnen @${w}`);
    for (const n of ['Honda', 'Yamaha', 'BMW', 'Kawasaki', 'KTM', 'Ducati', 'Suzuki', 'Triumph']){
      const x = rk.find(r => r.navn === n);
      assert.ok(x.logo && !x.mono, `${n} skal vise logo i A–Z`);
      assert.ok(x.blH >= 12 && x.blW <= 56.5 && x.blH <= 22.5, `${n}: ${x.blW}x${x.blH}`);
    }
    assert.ok(rk.find(r => r.navn === 'Kawasaki').emblem && rk.find(r => r.navn === 'Honda').emblem, 'emblem-varianten bruges i sm hvor den findes');
    assert.ok(!rk.find(r => r.navn === 'KTM').emblem, 'KTM har ingen emblem-fil: hovedfilen skaleres ned');
    for (const n of ['BSA', 'FB Mondial', 'Lauge Jensen']) assert.ok(rk.find(r => r.navn === n).mono, `${n}: monogram i samme kolonne`);
    await ctx.close();
  }
});

test('P2-3 mærkesidens hero: fast ramme — logoet flytter ikke H1, CTA-logoet eller hero-logoet, når filen lander (SVG forsinket 900 ms), og H1 står på samme sted for alle logoformer', async t => {
  if (skip(t)) return;
  const h1Top = {};
  for (const [url, w] of [['/maerke-honda.html', 1440], ['/maerke-kawasaki.html', 1440], ['/maerke-ducati.html', 1440], ['/maerke-bsa.html', 1440], ['/maerke-honda.html', 390]]){
    const ctx = await browser.newContext({ viewport: { width: w, height: w > 700 ? 900 : 844 } });
    await ctx.route('**/img/brands/*.svg', async route => { await new Promise(r => setTimeout(r, 900)); return route.continue(); });
    await ctx.addInitScript(() => { window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
    const page = await ctx.newPage();
    await page.goto(svGen.url + url, { waitUntil: 'load' });
    const maal = () => page.evaluate(() => { const g = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.x * 10), Math.round(r.y * 10), Math.round(r.width * 10), Math.round(r.height * 10)]; }; return { h1: g('.mk-hero h1'), ctaLogo: (g('.mk-cta .bl') || []).slice(2), logo: g('.mk-hero .bl'), ord: g('.mk-wordmark') }; });
    const foer = await maal();
    await page.waitForFunction(() => !document.querySelector('.bl--logo:not(.bl--img):not(.bl--klar):not(.bl--fejl)'), null, { timeout: 8000, polling: 50 });
    await page.waitForTimeout(300);
    assert.deepEqual(await maal(), foer, `${url} @${w}: layoutet flyttede sig, da logofilen kom`);
    assert.ok(await page.evaluate(() => window.__cls) < 0.001, `${url} @${w}: CLS (sidens egen skrifttype-flytning er < 0,001; logoet bidrager 0 — målene ovenfor er identiske)`);
    if (w > 700) h1Top[url] = foer.h1[1];
    await ctx.close();
  }
  // Honda (emblem + navn), Kawasaki (bredt ordmærke), Ducati (lockup) og BSA uden logo: H1 står samme sted ±1 px — kun mærker med logo har den faste 72 px-ramme
  const med = ['/maerke-honda.html', '/maerke-kawasaki.html', '/maerke-ducati.html'].map(u => h1Top[u]);
  assert.ok(Math.max(...med) - Math.min(...med) <= 10, `H1-top med logo: ${med}`);
});
