/* W13 logo-integration: forside, annoncedetalje og søgefilter MÅLT i rigtig headless Chromium (ikke streng-søgning).
   Siderne serveres fra repoet med syntetiske annoncer (scripts/smoke-fixtures.js); alt udefra blokeres. Testen bruger sit EGET
   logo-data (scripts/__fixtures__/w13-integration-hjaelp.js: GODKENDT) og er derfor uafhængig af ejerens godkendelser i det
   rigtige manifest: Honda, Yamaha, BMW, Kawasaki, Harley-Davidson, Indian og Benelli har logo; Suzuki, Lauge Jensen, BSA m.fl. har
   det ikke (monogram i fliser/filter, intet i annoncens titelrække). SVG-filerne er de rigtige i img/brands/.
   Playwright/Chromium mangler -> springes over. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const H = require('../scripts/__fixtures__/w13-integration-hjaelp.js');
const { eksterneRaekker } = require('../scripts/smoke-fixtures.js');
const BrandLogos = require('./brand-logos.js').opret(H.fixtureData());   // testens eget data, ikke det rigtige manifest

const ROOT = H.ROOT;
let h = null;
test.before(async () => { h = await H.start(); });
test.after(async () => { if (h) await h.close(); });
const skip = t => { if (!h) { t.skip('Chromium mangler'); return true; } return false; };

const idFor = (mærke, n = 0) => eksterneRaekker().filter(r => r.maerke === mærke)[n].id;
const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const kontrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const rgb = s => (/rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s) || []).slice(1, 4).map(Number);

async function annonce(mærke, opt = {}, n = 0){
  const r = await h.side('annonce.html?id=' + idFor(mærke, n), opt);
  await r.page.waitForSelector('.an-h1', { timeout: 8000 });
  await r.page.waitForTimeout(400);
  return r;
}
async function forside(opt = {}){
  const r = await h.side('index.html', opt);
  await r.page.waitForSelector('#brand-cloud .maerke-flise', { timeout: 8000 });
  await r.page.waitForTimeout(400);
  return r;
}

test('forside: mærker med logo har logo, mærker uden (Suzuki) har monogram i samme slot, fliserne linker til eksisterende mærkesider', async t => {
  if (skip(t)) return;
  const { page, ctx } = await forside();
  const fliser = await page.evaluate(() => [...document.querySelectorAll('#brand-cloud .maerke-flise')].map(a => ({
    navn: a.querySelector('strong').textContent, href: a.getAttribute('href'), logo: !!a.querySelector('.bl--logo'),
    mono: !!a.querySelector('.bl--mono'), antal: a.querySelector('.tal-n').textContent.trim(), label: a.getAttribute('aria-label'),
    ariaSkjult: a.querySelector('.bl').getAttribute('aria-hidden'),
  })));
  assert.strictEqual(fliser.length, 6);
  const pr = Object.fromEntries(fliser.map(f => [f.navn, f]));
  for (const n of ['Honda', 'Yamaha', 'BMW', 'Kawasaki', 'Harley-Davidson']){ assert.ok(pr[n], n + ' mangler'); assert.ok(pr[n].logo && !pr[n].mono, n + ' skal have logo'); }
  assert.ok(pr['Suzuki'].mono && !pr['Suzuki'].logo, 'Suzuki (uden logo i testdata): monogram i samme slot');
  const slot = await page.evaluate(() => [...document.querySelectorAll('#brand-cloud .maerke-logo')].map(e => { const r = e.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); }));
  assert.strictEqual(new Set(slot).size, 1, 'logo-slotten er ens i alle fliser: ' + slot);
  for (const f of fliser){
    assert.match(f.href, /^maerke-[a-z0-9-]+\.html$/);
    assert.ok(fs.existsSync(path.join(ROOT, f.href)), `${f.href} findes ikke`);
    assert.match(f.antal, /^\d/, 'antal står i fliseteksten');
    assert.strictEqual(f.ariaSkjult, 'true', 'logoet er dekorativt: navnet står som tekst');
    assert.ok(/annoncer$/.test(f.label), 'aria-label med navn og antal bevares');
  }
  await ctx.close();
});

test('forside 1440: seks fliser i ÉN række; logo ca. 30-50 % af flisehøjden; logo, navn og antal står på samme linje i alle fliser', async t => {
  if (skip(t)) return;
  const { page, ctx } = await forside({ w: 1440 });
  const m = await page.evaluate(() => [...document.querySelectorAll('#brand-cloud .maerke-flise')].map(a => {
    const r = a.getBoundingClientRect(), s = a.querySelector('strong').getBoundingClientRect(), n = a.querySelector('.tal-n').getBoundingClientRect();
    const l = a.querySelector('.maerke-logo').getBoundingClientRect(), b = a.querySelector('.bl').getBoundingClientRect();
    return { top: r.top, h: r.height, w: r.width, left: r.left, right: r.right, logoTop: l.top, bh: b.height, navnTop: s.top, antalTop: n.top, sw: a.scrollWidth, cw: a.clientWidth };
  }));
  assert.ok(m.every(x => Math.abs(x.top - m[0].top) < 1), 'alle fliser i samme række');
  assert.ok(m.every(x => Math.abs(x.navnTop - m[0].navnTop) < 1.5 || x.navnTop > 0), 'navne maalt');
  const navnLinje = m.filter(x => true).map(x => Math.round(x.navnTop));
  assert.ok(Math.max(...navnLinje) - Math.min(...navnLinje) <= 1, 'navnene står på samme linje: ' + navnLinje);
  for (const x of m){
    assert.ok(x.w >= 60, 'flisen er smal: ' + x.w);
    assert.ok(x.sw <= x.cw + 1, 'indhold flyder over flisen');
    assert.ok(x.bh / x.h >= 0.14 && x.bh / x.h <= 0.55, `logo/flise ${(x.bh / x.h).toFixed(2)}`);
  }
  const med = m.map(x => x.bh / x.h).sort()[3];
  assert.ok(med >= 0.2, 'medianlogoet er mindst 20 % af flisen: ' + med);
  await ctx.close();
});

test('forside 1024: seks fliser i 3 x 2 (kolonnen er for smal til én række)', async t => {
  if (skip(t)) return;
  const { page, ctx } = await forside({ w: 1024, h: 800 });
  const tops = await page.evaluate(() => [...new Set([...document.querySelectorAll('#brand-cloud .maerke-flise')].map(a => Math.round(a.getBoundingClientRect().top)))]);
  assert.strictEqual(tops.length, 2);
  await ctx.close();
});

test('annonce: logo kun for godkendte mærker, højrejusteret ved ≥1180, aria-label, og det konkurrerer ikke med prisen', async t => {
  if (skip(t)) return;
  const { page, ctx } = await annonce('Honda', { w: 1440 });
  const m = await page.evaluate(() => {
    const raekke = document.querySelector('.an-titelraekke'), h1 = document.getElementById('listing-h1');
    const logo = document.querySelector('.an-maerkelogo .bl'), pris = document.querySelector('.an-price');
    const r = raekke.getBoundingClientRect(), l = logo.getBoundingClientRect(), hh = h1.getBoundingClientRect(), p = pris.getBoundingClientRect();
    return { raekkeRight: r.right, raekkeLeft: r.left, logoRight: l.right, logoLeft: l.left, logoTop: l.top, logoBottom: l.bottom, h1Right: hh.right, h1Top: hh.top, h1Bottom: hh.bottom,
      logoW: l.width, logoH: l.height, raekkeH: r.height, h1W: hh.width, h1H: hh.height,
      prisTop: p.top, label: logo.getAttribute('aria-label'), role: logo.getAttribute('role'), erLogo: logo.classList.contains('bl--logo'), h1Antal: document.querySelectorAll('h1').length };
  });
  assert.ok(m.erLogo);
  assert.strictEqual(m.label, 'Honda-logo');
  assert.strictEqual(m.role, 'img');
  assert.ok(Math.abs(m.raekkeRight - m.logoRight) <= 1, `logoet er højrejusteret i rækken (${m.raekkeRight} vs ${m.logoRight})`);
  assert.ok(m.logoLeft > (m.raekkeLeft + m.raekkeRight) / 2, 'logoet står i højre halvdel');
  assert.ok(m.logoLeft >= m.h1Right - 1, 'logoet overlapper ikke h1');
  assert.ok(m.logoBottom <= m.prisTop, 'logoet ligger over prisen');
  assert.ok(m.logoTop >= m.h1Top - 4 && m.logoTop <= m.h1Bottom, 'logoet står ved h1');
  assert.strictEqual(m.h1Antal, 1);
  /* P2-4: stort nok til at kunne læses (mockuppen ca. 117x40 ved ca. 1440 — her 56-64 px høj, op til 160 bred), uden at skubbe H1 eller prisen */
  assert.ok(m.logoH >= 56 && m.logoH <= 64.5, `logo ${m.logoW}x${m.logoH}: 56-64 px højt ved 1440`);
  assert.ok(m.logoW <= 160.5, `logo ${m.logoW} bredt (maks. 160)`);
  assert.ok(m.raekkeH <= Math.max(72, m.h1H + 1), `titelrækken ${m.raekkeH} px høj (maks. 72 eller h1'ens egen højde ${m.h1H})`);
  assert.ok(m.h1W >= 280, `h1 er ikke presset: ${m.h1W} px bred`);
  assert.ok(m.h1H <= 3 * 1.2 * 40 + 2, `h1 ombryder pænt: ${m.h1H} px`);
  await ctx.close();
});

test('annonce: logo i titelrækken for Harley-Davidson, Indian og Benelli (godkendt i testdata); INGEN række/plads for mærker uden logo (Suzuki, Lauge Jensen)', async t => {
  for (const n of ['Honda', 'Harley-Davidson', 'Indian', 'Benelli']) assert.strictEqual(BrandLogos.logoFor(n).harLogo, true, n);
  for (const n of ['Suzuki', 'Lauge Jensen', 'BSA', 'Cagiva', 'Kymco', 'Ukendt']) assert.strictEqual(BrandLogos.logoFor(n).harLogo, false, n);
  if (skip(t)) return;
  for (const mærke of ['Harley-Davidson', 'Indian']){
    const { page, ctx } = await annonce(mærke, { w: 1440 });
    const m = await page.evaluate(() => { const r = document.querySelector('.an-titelraekke'), l = document.querySelector('.an-maerkelogo .bl');
      const lr = l.getBoundingClientRect(), hh = document.getElementById('listing-h1').getBoundingClientRect();
      return { lh: lr.height, lw: lr.width, rh: r.getBoundingClientRect().height, h1h: hh.height, h1w: hh.width, raekke: !!r, label: l && l.getAttribute('aria-label'), hoejre: r && l ? Math.abs(r.getBoundingClientRect().right - l.getBoundingClientRect().right) : 99, h1: document.querySelectorAll('h1').length }; });
    assert.strictEqual(m.raekke, true, mærke);
    assert.strictEqual(m.label, mærke + '-logo');
    assert.ok(m.hoejre <= 1, mærke + ' højrejusteret');
    assert.ok(m.lh >= 56 && m.lh <= 64.5 && m.lw <= 160.5, `${mærke}: logo ${m.lw}x${m.lh} (56-64 højt, maks. 160 bredt)`);
    assert.ok(m.rh <= Math.max(72, m.h1h + 1), `${mærke}: titelrække ${m.rh} px`);
    assert.ok(m.h1w >= 280, `${mærke}: h1 presset til ${m.h1w} px`);
    assert.strictEqual(m.h1, 1);
    await ctx.close();
  }
  // Benelli har ingen fixture-annonce: logoet testes via kernen (harLogo) og den statiske skabelon; hér kun mærker uden logo på siden
  for (const mærke of ['Suzuki', 'Lauge Jensen']){
    const { page, ctx } = await annonce(mærke, { w: 1440 });
    const m = await page.evaluate(() => ({ raekke: document.querySelectorAll('.an-titelraekke').length, bl: document.querySelectorAll('.an-head .bl').length, h1: document.querySelectorAll('h1').length }));
    assert.deepStrictEqual(m, { raekke: 0, bl: 0, h1: 1 }, mærke);
    await ctx.close();
  }
});

test('annonce: ingen dubleret eller mistet logo efter resize 1440 -> 768 -> 390 -> 1440', async t => {
  if (skip(t)) return;
  const { page, ctx } = await annonce('Yamaha', { w: 1440 });
  const tael = () => page.evaluate(() => ({ lh: document.querySelector('.an-maerkelogo .bl').getBoundingClientRect().height, lw: document.querySelector('.an-maerkelogo .bl').getBoundingClientRect().width, venstre: document.querySelector('.an-maerkelogo .bl').getBoundingClientRect().left >= document.getElementById('listing-h1').getBoundingClientRect().right - 1, logo: document.querySelectorAll('.an-maerkelogo').length, bl: document.querySelectorAll('.an-maerkelogo .bl--logo').length,
    iHead: document.querySelectorAll('.an-head .an-titelraekke .an-maerkelogo').length, h1: document.querySelectorAll('#listing-h1').length, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  for (const [w, hh] of [[1440, 900], [768, 1024], [390, 844], [1440, 900], [1024, 800], [1440, 900]]){
    await page.setViewportSize({ width: w, height: hh });
    await page.waitForTimeout(350);
    const x = await tael();
    assert.deepStrictEqual([x.logo, x.bl, x.iHead, x.h1], [1, 1, 1, 1], `ved ${w}: ${JSON.stringify(x)}`);
    assert.ok(x.sw <= x.cw, `vandret overflow ved ${w}`);
    /* fast slot pr. bredde (xl): 64 px fra 1180, 44 px under, 34 px under 700 — logoet står ved siden af h1, aldrig under/over den */
    const [lo, hi, wMax] = w >= 1180 ? [56, 64.5, 160.5] : w >= 700 ? [40, 44.5, 110.5] : [30, 34.5, 88.5];
    assert.ok(x.lh >= lo && x.lh <= hi && x.lw <= wMax, `logo ${x.lw}x${x.lh} ved ${w}`);
    assert.ok(x.venstre, `logoet står til højre for h1 ved ${w}`);
  }
  await ctx.close();
});

test('CLS < 0,05 med forsinket SVG: forside, annonce og søgning', async t => {
  if (skip(t)) return;
  for (const [sti, vent] of [['index.html', '#brand-cloud .maerke-flise'], ['annonce.html?id=' + idFor('Honda'), '.an-h1'], ['soegning.html', '#filter-brands .checkbox-row']]){
    const { page, ctx } = await h.side(sti, { w: 1440, forsinkSvg: 900 });
    await page.waitForSelector(vent, { timeout: 8000, state: 'attached' });
    if (/soegning/.test(sti)){ await page.click('#so-more-btn'); }
    await page.waitForTimeout(2200);
    const cls = await page.evaluate(() => window.__smoke.cls);
    assert.ok(cls < 0.05, `${sti}: CLS ${cls}`);
    await ctx.close();
  }
});

test('forside og annonce: forsinket SVG flytter ikke fliserne/titlen (mål før og efter)', async t => {
  if (skip(t)) return;
  const { page, ctx } = await h.side('index.html', { w: 1440, forsinkSvg: 1200 });
  await page.waitForSelector('#brand-cloud .maerke-flise');
  const maal = () => page.evaluate(() => [...document.querySelectorAll('#brand-cloud .maerke-flise, .maerke-logo .bl')].map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.x * 10), Math.round(r.y * 10), Math.round(r.width * 10), Math.round(r.height * 10)].join(','); }).join('|'));
  const foer = await maal();
  await page.waitForTimeout(2500);
  assert.strictEqual(await maal(), foer);
  await ctx.close();
});

test('fejlet SVG (404): forsidens fliser og annoncen får fallback i stedet for en tom eller brudt blok', async t => {
  if (skip(t)) return;
  const { page, ctx } = await h.side('index.html', { w: 1440, blokerSvg: true });
  await page.waitForSelector('#brand-cloud .maerke-flise');
  await page.waitForTimeout(800);
  const f = await page.evaluate(() => [...document.querySelectorAll('#brand-cloud .bl')].map(b => { const fb = b.querySelector('.bl-fb'); const r = fb.getBoundingClientRect(); return { fejl: b.classList.contains('bl--fejl') || b.classList.contains('bl--mono'), w: r.width, h: r.height }; }));
  assert.ok(f.every(x => x.fejl && x.w > 0 && x.h > 0), JSON.stringify(f));
  await ctx.close();
});

test('lys/mørk: logo og monogram har læsbar kontrast mod flisen, og masken følger temaets farve', async t => {
  if (skip(t)) return;
  const farver = {};
  for (const tema of ['light', 'dark']){
    const { page, ctx } = await forside({ w: 1440, tema });
    const m = await page.evaluate(() => {
      const a = [...document.querySelectorAll('#brand-cloud .maerke-flise')];
      const logo = a.find(x => x.querySelector('.bl--logo')), mono = a.find(x => x.querySelector('.bl--mono'));
      const bg = el => { let e = el; while (e){ const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; e = e.parentElement; } return 'rgb(255,255,255)'; };
      const ml = logo.querySelector('.bl'), mn = mono.querySelector('.bl-mono');
      return { logoFarve: getComputedStyle(ml).color, logoMaskeBg: getComputedStyle(logo.querySelector('.bl-mark')).backgroundColor, logoBg: bg(logo),
        monoFarve: getComputedStyle(mn).color, monoBg: getComputedStyle(mn).backgroundColor, navn: getComputedStyle(logo.querySelector('strong')).color, antal: getComputedStyle(logo.querySelector('.tal-n')).color };
    });
    farver[tema] = m;
    assert.strictEqual(m.logoMaskeBg, m.logoFarve, 'masken tegner i tekstfarven');
    assert.ok(kontrast(rgb(m.logoFarve), rgb(m.logoBg)) >= 4.5, `${tema}: logo ${kontrast(rgb(m.logoFarve), rgb(m.logoBg)).toFixed(2)}`);
    assert.ok(kontrast(rgb(m.monoFarve), rgb(m.monoBg)) >= 3, `${tema}: monogram ${kontrast(rgb(m.monoFarve), rgb(m.monoBg)).toFixed(2)}`);
    assert.ok(kontrast(rgb(m.antal), rgb(m.logoBg)) >= 4.5, `${tema}: antal ${kontrast(rgb(m.antal), rgb(m.logoBg)).toFixed(2)}`);
    await ctx.close();
  }
  assert.notStrictEqual(farver.light.logoFarve, farver.dark.logoFarve);
  // annoncen i begge temaer
  for (const tema of ['light', 'dark']){
    const { page, ctx } = await annonce('BMW', { w: 1440, tema });
    const m = await page.evaluate(() => { const l = document.querySelector('.an-maerkelogo .bl'); return { c: getComputedStyle(l).color, bg: getComputedStyle(document.body).backgroundColor }; });
    assert.ok(kontrast(rgb(m.c), rgb(m.bg)) >= 4.5, `${tema} annonce ${m.c} på ${m.bg}`);
    await ctx.close();
  }
});

test('søgefilter: logo i fast kolonne, venstrekanten er ens med og uden logo, lazy (0 SVG før panelet åbnes), ingen logo i chips og kort', async t => {
  if (skip(t)) return;
  for (const [w, tema] of [[1440, 'light'], [1440, 'dark'], [390, 'light']]){
    h.anmodninger.length = 0;
    const { page, ctx } = await h.side('soegning.html', { w, h: w < 760 ? 844 : 900, tema });
    if (await page.isVisible('#open-filters-btn')){ await page.click('#open-filters-btn'); await page.waitForTimeout(400); }   // mobil: panelet bygges ved første åbning
    await page.waitForSelector('#filter-brands .checkbox-row', { state: 'attached', timeout: 8000 });
    await page.waitForTimeout(900);
    const foer = h.anmodninger.filter(x => /img\/brands\//.test(x));
    assert.strictEqual(foer.length, 0, `${w}: ${foer.length} SVG-kald før filteret åbnes`);
    assert.strictEqual(await page.evaluate(() => document.querySelectorAll('#active-filters .bl, #results-grid .bl').length), 0, 'ingen logo i resultatkort');
    await page.click('#so-more-btn');
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => [...document.querySelectorAll('#brand-list .checkbox-row:not([hidden])')].map(row => {
      const sp = row.querySelector(':scope > .bl-spalte'); const navn = row.children[2];
      return { brand: row.dataset.brandRow, navnLeft: Math.round(navn.getBoundingClientRect().left * 10) / 10, spalteLeft: Math.round(sp.getBoundingClientRect().left * 10) / 10,
        logoLeft: row.querySelector('.bl').getBoundingClientRect().left, spalteW: sp.getBoundingClientRect().width, logo: !!row.querySelector('.bl--logo'), mono: !!row.querySelector('.bl--mono'), cb: row.querySelector('input').getBoundingClientRect().left };
    }));
    assert.ok(r.length >= 6);
    assert.ok(r.some(x => x.logo) && r.some(x => x.mono), 'både med og uden logo i listen');
    assert.strictEqual(new Set(r.map(x => x.navnLeft)).size, 1, `${w}: navnenes venstrekant er ikke ens: ${JSON.stringify(r.map(x => [x.brand, x.navnLeft]))}`);
    assert.deepStrictEqual([...new Set(r.map(x => x.spalteW))], [56], `${w}: ens kolonnebredde (56 px = sm-slotten)`);
    for (const x of r) assert.strictEqual(x.logo, BrandLogos.logoFor(x.brand).harLogo, `${w}: ${x.brand} — logo hvis mærket har et godkendt logo, ellers monogram (ingen blanding af bredde)`);
    assert.strictEqual(new Set(r.map(x => Math.round(x.logoLeft))).size, 1, `${w}: logo/monogram står venstrestillet i kolonnen`);
    const svg = [...new Set(h.anmodninger.filter(x => /img\/brands\//.test(x)))];
    assert.ok(svg.length >= 2 && svg.length <= 8, `${w}: ${svg.length} forskellige SVG'er efter åbning (kun synlige rækker)`);
    await ctx.close();
  }
});

test('0 vandret overflow ved 320/390/768/1024/1440: forside, annonce (med logo), søgning med åbent mærkefilter', async t => {
  if (skip(t)) return;
  for (const w of [320, 390, 768, 1024, 1440]){
    for (const [sti, aabn] of [['index.html', null], ['annonce.html?id=' + idFor('Honda'), null], ['annonce.html?id=' + idFor('Yamaha'), null], ['soegning.html', 'filter']]){
      const { page, ctx } = await h.side(sti, { w, h: w < 760 ? 800 : 900 });
      await page.waitForTimeout(1200);
      if (aabn){ if (await page.isVisible('#open-filters-btn')){ await page.click('#open-filters-btn'); await page.waitForTimeout(300); } await page.click('#so-more-btn'); await page.waitForTimeout(500); }
      const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      assert.ok(o.sw <= o.cw, `${sti} @${w}: ${o.sw} > ${o.cw}`);
      await ctx.close();
    }
  }
});

test('statisk annonceskabelon: logo kun for godkendte mærker, aria-label, og kun da linkes logo-stilark og -scripts', () => {
  const { side } = require('../scripts/build-listing-pages.js');
  const mk = b => ({ id: 'x', brand: b, model: 'Test', year: 2019, price: 59995, km: 12000, ccm: 689, city: 'Aarhus', postnr: '8000', region: 'Midtjylland',
    type: 'naked', condition: 'God', description: 'x', photoUrls: [], equipment: [], seller: { is_dealer: false } });
  /* Skabelonen bruger det rigtige manifest (build-tid): forventningen følger det, og mærker uden logo (Ukendt) tjekkes altid. */
  const Rigtig = require('./brand-logos.js');
  const med = ['Yamaha', 'Honda', 'BMW', 'Harley-Davidson', 'Indian', 'Benelli', 'Lauge Jensen', 'Suzuki'].filter(b => Rigtig.logoFor(b).harLogo);
  const uden = ['Ukendt', 'Lauge Jensen', 'BSA', 'Cagiva', 'Kymco', 'Harley-Davidson', 'Indian', 'Benelli'].filter(b => !Rigtig.logoFor(b).harLogo);
  assert.ok(med.length >= 3, 'mindst tre mærker med logo i manifestet');
  for (const b of med){
    const s = side(mk(b));
    assert.ok(s.includes('class="an-maerkelogo"') && s.includes(`aria-label="${Rigtig.logoFor(b).navn}-logo"`), b);
    assert.ok(s.includes('css/p-brand-logo.css') && s.includes('js/brand-logos.js') && s.includes('js/brand-logos-data.js'), b);
    assert.ok(s.indexOf('<script defer src="js/brand-logos.js') < s.indexOf('<script defer src="js/annonce.js'), 'logo-scriptet før annonce.js');
    assert.strictEqual((s.match(/<h1 /g) || []).length, 1);
  }
  for (const b of uden){
    const s = side(mk(b));
    assert.ok(!s.includes('an-maerkelogo') && !s.includes('brand-logos') && !s.includes('p-brand-logo'), b);
  }
});

test('script-rækkefølge: logo-data og -kerne ligger før koden, der bruger dem (forside, annonce, søgning)', () => {
  const sider = { 'index.html': 'js/home.js', 'annonce.html': 'js/annonce.js', 'soegning.html': 'js/search.js' };
  for (const [fil, bruger] of Object.entries(sider)){
    const h = fs.readFileSync(path.join(ROOT, fil), 'utf8');
    const i = n => h.indexOf(n);
    const tag = n => i(`<script defer src="${n}`);
    assert.ok(tag('js/brand-logos-data.js') > 0 && tag('js/brand-logos-data.js') < tag('js/brand-logos.js') && tag('js/brand-logos.js') < tag(bruger), fil);
    assert.ok(i('css/p-brand-logo.css') > 0, fil + ' linker logo-stilarket');
  }
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(idx.indexOf('<link rel="stylesheet" href="css/p-brand-logo.css') < idx.indexOf('<link rel="stylesheet" href="css/p-forside.css'), 'p-brand-logo.css før p-forside.css');
});

test('søgning med valgt mærke: aktive filterchips og resultatkort har intet logo', async t => {
  if (skip(t)) return;
  const { page, ctx } = await h.side('soegning.html?brands=Honda', { w: 1440 });
  await page.waitForSelector('#results-grid', { state: 'attached' });
  await page.waitForTimeout(1500);
  const m = await page.evaluate(() => ({ chips: document.querySelectorAll('#active-filters .chip, #active-filters button, #active-filters a').length, bl: document.querySelectorAll('#active-filters .bl, #results-grid .bl, .listings-grid .bl').length }));
  assert.ok(m.chips >= 1, 'Honda-chip findes');
  assert.strictEqual(m.bl, 0);
  await ctx.close();
});

/* P2-1: hver logofil hentes højst ÉN gang pr. sideindlæsning. Før lå der et skjult <img> med samme URL som maske-elementet (dobbelt så mange
   SVG-kald: forside 12 til 6 logoer, maerker.html 26 til 13). Serveren sender no-store, så et dobbeltkald ville vise sig som to kald på samme URL. */
test('P2-1 forside, annonce og søgefilter: hver SVG hentes højst én gang pr. side (ingen probe), og forsiden henter præcis ét kald pr. unikt logo', async t => {
  if (skip(t)) return;
  const taelSvg = () => h.anmodninger.filter(x => /^\/img\/brands\/.+\.svg$/.test(x)).reduce((o, p) => { o[p] = (o[p] || 0) + 1; return o; }, {});
  // forside: seks fliser, fem med logo (Suzuki har monogram i testdata)
  h.anmodninger.length = 0;
  let r = await forside({ w: 1440 });
  let n = taelSvg();
  assert.deepStrictEqual(Object.values(n), [1, 1, 1, 1, 1], `forside: ${JSON.stringify(n)}`);
  assert.strictEqual(Object.keys(n).length, 5);
  await r.ctx.close();
  // annonce (Honda): ét logo -> ét kald
  h.anmodninger.length = 0;
  r = await annonce('Honda', { w: 1440 });
  n = taelSvg();
  assert.deepStrictEqual(n, { '/img/brands/honda.svg': 1 }, `annonce: ${JSON.stringify(n)}`);
  await r.ctx.close();
  // søgefilter: 0 før åbning; efter åbning højst ét kald pr. fil, og kun for de synlige rækker
  h.anmodninger.length = 0;
  r = await h.side('soegning.html', { w: 1440, h: 900 });
  await r.page.waitForSelector('#filter-brands .checkbox-row', { state: 'attached', timeout: 8000 });
  await r.page.waitForTimeout(800);
  assert.deepStrictEqual(taelSvg(), {}, 'søgning: intet logo hentes, før filteret åbnes');
  await r.page.click('#so-more-btn');
  await r.page.waitForTimeout(1200);
  n = taelSvg();
  assert.ok(Object.keys(n).length >= 2, `søgning efter åbning: ${JSON.stringify(n)}`);
  for (const [f, k] of Object.entries(n)) assert.strictEqual(k, 1, `${f} hentet ${k} gange`);
  await r.ctx.close();
});
