/* V6 marked / søgekort: (P3) kortene var ca. 18 % højere efter V5 (40 px fodslot til sammenlign-knappen, to linjer reserveret til kilden, skilletegn der ombrød spec-linjen),
   og (P3) monogram-fallbacken i mærkefilteret havde ikke samme visuelle vægt som de officielle logoer.
   Måler mod søge-lagerets mock (735 rækker), intet netværk; springes over uden Playwright.
   Kør: node --test js/v6-marked-kort.test.js — V6_ROD=<mappe> måler en anden kopi (fx før-versionen). */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const REPO = path.join(__dirname, '..');
const sb = require(path.join(REPO, 'scripts', 'smoke-browser.js'));

let H = null;
test.before(async () => {
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) { console.log(`# v6-marked-kort.test: SKIPPER (${kan.grund})`); return; }
  const { server, port } = await sb.startServer(process.env.V6_ROD || REPO);
  H = { server, port, browser: await kan.pw.chromium.launch({ headless: true }) };
});
test.after(async () => { if (H) { await H.browser.close(); H.server.close(); } });

async function aabn(w, url = 'soegning.html', tema = 'light'){
  const c = await H.browser.newContext({ viewport: { width: w, height: 1300 }, locale: 'da-DK', colorScheme: tema, serviceWorkers: 'block' });
  await c.addInitScript(sb.initScript, { tema });
  await sb.installerMock(c, H.port, {}, { restSvar: sb.lagerSvar });
  const p = await c.newPage();
  const fejl = []; p.on('pageerror', e => fejl.push(e.message));
  await p.goto(`http://127.0.0.1:${H.port}/${url}`, { waitUntil: 'load' });
  await p.waitForFunction(() => document.documentElement.classList.contains('so-klar'), null, { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(700);
  return { c, p, fejl };
}

/* gennemsnitlig kortHØJDE (gitter, de første 24 kort) */
const HOEJDE = () => {
  const k = [...document.querySelectorAll('#results-grid > .card')];
  return { n: k.length, snit: k.reduce((s, e) => s + e.getBoundingClientRect().height, 0) / (k.length || 1) };
};
/* V5-målingerne (mock-lager, 24 kort): 375 px 325,4; 768 px 303,2; 1440 px 309,5. V6 skal ligge under (grænserne har ca. 1 % luft). */
const GRAENSE = { 375: 322, 768: 305, 1440: 300 };
for (const w of [375, 768, 1440]) {
  test(`${w} px: gennemsnitlig kort-højde er ikke højere end efter V5 (1440 og 375 lavere; højst ${GRAENSE[w]} px; V5 ${({ 375: '325,4', 768: '303,2', 1440: '309,5' })[w]})`, { timeout: 60000 }, async t => {
    if (!H) return t.skip('Playwright mangler');
    const { c, p } = await aabn(w);
    try {
      const m = await p.evaluate(HOEJDE);
      assert.ok(m.n >= 12, `kort ${m.n}`);
      assert.ok(m.snit <= GRAENSE[w], `${w}: gennemsnit ${m.snit.toFixed(1)} px (grænse ${GRAENSE[w]})`);
    } finally { await c.close(); }
  });
}

/* sammenlign-knappen står PÅ fotoet (nederst til højre) ved alle bredder, uden at ramme hjerte, mærkater eller typefoto-labelen */
const SAM = () => {
  const skaer = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
  const ud = { kort: 0, udenForFoto: [], dobbelt: [], smaa: [], kollision: [], iFod: 0 };
  for (const k of document.querySelectorAll('#results-grid > .card')) {
    const sam = k.querySelector('.card-compare'), med = k.querySelector('.card-media');
    if (!sam || !med) continue;
    ud.kort++;
    const navn = (k.querySelector('.rk-titel') || {}).textContent;
    const s = sam.getBoundingClientRect(), m = med.getBoundingClientRect();
    if (sam.parentElement !== med) ud.iFod++;
    if (s.left < m.left - 0.5 || s.right > m.right + 0.5 || s.top < m.top - 0.5 || s.bottom > m.bottom + 0.5) ud.udenForFoto.push(navn);
    if (s.width < 39.5 || s.height < 39.5) ud.smaa.push(`${navn}: ${Math.round(s.width)}x${Math.round(s.height)}`);
    if (s.right < m.right - 12 || s.bottom < m.bottom - 12) ud.dobbelt.push(`${navn}: knappen står ikke i fotoets nederste højre hjørne`);
    for (const e of med.querySelectorAll('.fav-btn, .card-badges .badge, .typefoto-label, .foto-tom > *')) {
      const b = e.getBoundingClientRect();
      if (b.width && skaer(s, b)) ud.kollision.push(`${navn}: ${e.className.toString().split(' ')[0]}`);
    }
  }
  return ud;
};
for (const tema of ['light', 'dark']) {
  for (const w of [375, 430, 768, 1024, 1440, 1920]) {
    test(`${w} px ${tema === 'dark' ? 'mørk' : 'lys'}: sammenlign-knappen er i fotoet nederst til højre (mindst 40 x 40), og rammer hverken hjerte, mærkat eller typefoto-label`, { timeout: 60000 }, async t => {
      if (!H) return t.skip('Playwright mangler');
      const { c, p, fejl } = await aabn(w, 'soegning.html', tema);
      try {
        const m = await p.evaluate(SAM);
        assert.ok(m.kort >= 12, `kort ${m.kort}`);
        assert.strictEqual(m.iFod, 0, 'knappen ligger i .card-media');
        assert.deepStrictEqual(m.udenForFoto, [], 'knappen er inden for fotoet');
        assert.deepStrictEqual(m.smaa, [], 'mindst 40 x 40');
        assert.deepStrictEqual(m.dobbelt, []);
        assert.deepStrictEqual(m.kollision, [], 'ingen kollision på fotoet');
        assert.deepStrictEqual(fejl, []);
      } finally { await c.close(); }
    });
  }
}

test('resize 1440 -> 375 -> 1440: knappen bliver i fotoet (før V6 flyttede js/search.js den ned i kortet ved indtegning fra 760 px)', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const { c, p } = await aabn(1440);
  try {
    for (const w of [375, 1440, 768]) {
      await p.setViewportSize({ width: w, height: 1300 });
      await p.waitForTimeout(400);
      const m = await p.evaluate(SAM);
      assert.strictEqual(m.iFod, 0, `${w}`);
      assert.deepStrictEqual(m.udenForFoto, [], `${w}`);
    }
    /* en ny sortering tegner kortene igen: stadig i fotoet */
    await p.selectOption('#sort-select', { index: 1 }).catch(() => {});
    await p.waitForTimeout(500);
    assert.strictEqual((await p.evaluate(SAM)).iFod, 0);
  } finally { await c.close(); }
});

/* monogram i filteret: samme vægt som de officielle logoer */
const MONO = () => {
  const rgb = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const monos = [...document.querySelectorAll('#brand-list .bl-spalte .bl-mono')].filter(e => e.getBoundingClientRect().width > 0);
  const logoer = [...document.querySelectorAll('#brand-list .bl-spalte .bl--img')].filter(e => e.getBoundingClientRect().width > 0);
  const m = monos[0], cs = m && getComputedStyle(m);
  const cp = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
  const tint = getComputedStyle(document.documentElement).getPropertyValue('--color-primary-tint').trim();
  return {
    antalMono: monos.length, antalLogo: logoer.length,
    mono: m ? { w: Math.round(m.getBoundingClientRect().width), h: Math.round(m.getBoundingClientRect().height), bg: cs.backgroundColor, fg: cs.color, skygge: cs.boxShadow, lumBg: lum(rgb(cs.backgroundColor)), lumFg: lum(rgb(cs.color)) } : null,
    logoFlise: logoer[0] ? getComputedStyle(logoer[0]).boxShadow : null,
    logoH: logoer.slice(0, 5).map(e => Math.round(e.getBoundingClientRect().height)),
    tint, primary: cp,
  };
};
for (const tema of ['light', 'dark']) {
  test(`${tema === 'dark' ? 'mørk' : 'lys'}: monogram-fallbacken i mærkefilteret er neutral (ikke den orange tone), 22 px, og${tema === 'dark' ? ' står på samme lyse flise som de officielle logoer' : ' har tydelig tekst på neutral flade'}`, { timeout: 60000 }, async t => {
    if (!H) return t.skip('Playwright mangler');
    const { c, p } = await aabn(1440, 'soegning.html', tema);
    try {
      await p.click('.so-more-btn').catch(() => {});
      await p.waitForTimeout(300);
      await p.click('.brand-more').catch(() => {});
      await p.waitForTimeout(500);
      const m = await p.evaluate(MONO);
      assert.ok(m.antalMono >= 3 && m.antalLogo >= 3, `monogrammer ${m.antalMono}, logoer ${m.antalLogo}`);
      assert.strictEqual(m.mono.w, 22); assert.strictEqual(m.mono.h, 22);
      /* ikke brandfarvens tone: hverken baggrunden eller teksten er primærfarven/tonen */
      const hex = h => { const x = h.replace('#', ''); return x.length === 3 ? x.split('').map(a => parseInt(a + a, 16)) : [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16)); };
      const naer = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 30;
      const rgb = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      if (/^#/.test(m.tint)) assert.ok(!naer(rgb(m.mono.bg), hex(m.tint)), `baggrunden er ikke den orange tone (${m.mono.bg})`);
      /* kontrast mellem tekst og flade: mindst 4,5:1 */
      const [l1, l2] = [m.mono.lumBg, m.mono.lumFg].sort((a, b) => b - a);
      assert.ok((l1 + .05) / (l2 + .05) >= 4.5, `kontrast ${((l1 + .05) / (l2 + .05)).toFixed(2)}`);
      if (tema === 'dark') {
        assert.ok(m.mono.lumBg > .6, `lys flise i mørk tilstand (lum ${m.mono.lumBg.toFixed(2)})`);
        assert.strictEqual(rgb(m.mono.skygge).join(','), rgb(m.logoFlise).join(','), `samme flisefarve som logoerne (${m.mono.skygge} / ${m.logoFlise})`);
      }
    } finally { await c.close(); }
  });
}
