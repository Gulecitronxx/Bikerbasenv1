/* w10-footer: footerens opbygning, tap-mål, kontrast, skip-link, landmarks og aria-state på menu/tema.
   Målt i en rigtig browser (Playwright via scripts/smoke-browser.js: lokal server, alt udefra blokeret/mocket) — ikke
   kun strengsøgning i HTML. Skippes uden Playwright/Chromium. synk-header --tjek køres som underproces. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const sb = require('../scripts/smoke-browser');

const REPO = path.join(__dirname, '..');
let kan, browser, server, port;

test.before(async () => {
  kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) return;
  ({ server, port } = await sb.startServer(REPO));
  browser = await kan.pw.chromium.launch();
});
test.after(async () => {
  if (browser) await Promise.race([browser.close().catch(() => {}), new Promise(r => setTimeout(r, 5000))]);
  if (server) server.close();
});

async function aabn(side, { vp = 1440, tema = 'light', coarse = false } = {}){
  const ctx = await browser.newContext({
    viewport: { width: vp, height: vp < 500 ? 844 : 900 }, hasTouch: coarse, isMobile: coarse && vp < 500,
    serviceWorkers: 'block', colorScheme: tema,
  });
  await ctx.addInitScript(sb.initScript, { tema });
  await sb.installerMock(ctx, port, {});
  const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${port}/${side}`, { waitUntil: 'load' });
  await p.waitForTimeout(400);
  return { p, ctx };
}

const GUIDES = ['guide-foerste-motorcykel', 'guide-a2-koerekort', 'guide-brugt-motorcykel', 'guide-mc-typer',
  'guide-mc-ordliste', 'guide-mc-forsikring', 'guide-mc-udstyr', 'guide-saelg-motorcykel', 'guide-mc-vinteropbevaring',
  'guide-mc-foraar-tjekliste'];

test('footer: kolonnerne fra billedet, alle guides, kontakt og kilde-note — intet opdigtet', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const { p, ctx } = await aabn('index.html');
  try {
    const f = await p.evaluate(() => {
      const foot = document.querySelector('footer.site-footer');
      return {
        titler: [...foot.querySelectorAll('.footer-col-title')].map(h => h.textContent.trim()),
        hrefs: [...foot.querySelectorAll('a[href]')].map(a => a.getAttribute('href')),
        tekst: foot.innerText,
        navMedNavn: [...foot.querySelectorAll('nav')].every(n => n.getAttribute('aria-labelledby') || n.getAttribute('aria-label')),
        antalNav: foot.querySelectorAll('nav').length,
      };
    });
    assert.deepStrictEqual(f.titler, ['Køb', 'Sælg', 'Guides & viden', 'Juridisk']);
    assert.match(f.tekst, /Bikerbasen/);
    assert.match(f.tekst, /Annoncer samlet fra danske forhandlere og markedspladser — kilden står på hvert kort/);
    assert.ok(f.hrefs.includes('mailto:kontakt@bikerbasen.dk'));
    assert.ok(f.hrefs.includes('guides.html'));
    for (const g of GUIDES) assert.ok(f.hrefs.includes(g + '.html'), `footeren mangler ${g}`);
    for (const h of ['vilkaar.html', 'privatlivspolitik.html', 'om-indeksering.html', 'opret-annonce.html', 'soegning.html'])
      assert.ok(f.hrefs.includes(h), `footeren mangler ${h}`);
    assert.ok(f.antalNav >= 4 && f.navMedNavn, 'hver link-kolonne er en navngiven nav');
    assert.doesNotMatch(f.tekst, /CVR|\+45|tlf|telefon|App Store|Google Play|vej \d|gade \d/i, 'ingen opdigtet adresse/telefon/app');
    for (const h of f.hrefs) if (!/^(mailto:|https?:|#)/.test(h)) assert.ok(fs.existsSync(path.join(REPO, h.split(/[?#]/)[0])), `dødt link ${h}`);
  } finally { await ctx.close(); }
});

for (const side of ['index.html', 'login.html', 'guides.html', 'maerke-honda.html']){
  test(`tap-mål: footerlinks og småtekst-links >= 40 px høje på ${side} (1440, lys + mørk)`, async t => {
    if (!kan.ok) return t.skip(kan.grund);
    for (const tema of ['light', 'dark']){
      const { p, ctx } = await aabn(side, { tema });
      try {
        const m = await p.evaluate(() => [...document.querySelectorAll('.site-footer a[href], .site-footer button, .lg-legal a, .cookie-modal-note a')]
          .filter(e => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; })
          .map(e => ({ t: e.textContent.trim().slice(0, 25), h: Math.round(e.getBoundingClientRect().height) })));
        assert.ok(m.length > 10, 'footeren skal have links');
        const smaa = m.filter(x => x.h < 40);
        assert.deepStrictEqual(smaa, [], `${side} ${tema}: links under 40 px`);
      } finally { await ctx.close(); }
    }
  });
}

test('login: vilkår/privatlivspolitik er >= 40 px høje uden at flytte tekstlinjen', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const { p, ctx } = await aabn('login.html');
  try {
    const r = await p.evaluate(() => {
      const par = document.querySelector('.lg-legal');
      const links = [...par.querySelectorAll('a')].map(a => Math.round(a.getBoundingClientRect().height));
      return { links, afsnit: par.getBoundingClientRect().height, linjehoejde: parseFloat(getComputedStyle(par).lineHeight) || 20 };
    });
    assert.strictEqual(r.links.length, 2);
    assert.ok(r.links.every(h => h >= 40), JSON.stringify(r));
    assert.ok(r.afsnit < r.linjehoejde * 1.6, `afsnittet blev for højt: ${r.afsnit} px (linje ${r.linjehoejde})`);
  } finally { await ctx.close(); }
});

/* Kontrast mod den faktisk malede footerbaggrund (sammensat med forældrenes baggrund). */
function kontrastJs(){
  const parse = c => { const m = c.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const bag = el => { for (let n = el; n; n = n.parentElement){ const c = parse(getComputedStyle(n).backgroundColor); if (c.a > .9) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  return el => { const fg = parse(getComputedStyle(el).color), bg = bag(el); const a = lum(fg), b = lum(bg); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
}

for (const tema of ['light', 'dark']){
  test(`kontrast >= 4,5:1 for footerens links og tekst i ${tema} tilstand`, async t => {
    if (!kan.ok) return t.skip(kan.grund);
    const { p, ctx } = await aabn('index.html', { tema });
    try {
      await p.evaluate(tm => document.documentElement.setAttribute('data-theme', tm), tema);
      const r = await p.evaluate(`(() => { const k = (${kontrastJs.toString()})(); return [...document.querySelectorAll('.site-footer a, .site-footer p, .site-footer .footer-col-title, .site-footer .footer-theme, .footer-bottom span')].filter(e => e.getBoundingClientRect().width > 0 && e.textContent.trim()).map(e => ({ t: e.textContent.trim().slice(0, 28), k: +k(e).toFixed(2) })); })()`);
      assert.ok(r.length > 15);
      assert.deepStrictEqual(r.filter(x => x.k < 4.5), [], `kontrast under 4,5 i ${tema}`);
    } finally { await ctx.close(); }
  });
}

test('skip-link: første Tab rammer den, den er synlig med fokusring, og Enter springer til hovedindholdet', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const side of ['index.html', 'login.html', 'guide-mc-typer.html', 'om-bikerbasen.html']){
    const { p, ctx } = await aabn(side);
    try {
      await p.keyboard.press('Tab');
      const s = await p.evaluate(() => {
        const a = document.activeElement; const r = a.getBoundingClientRect(); const cs = getComputedStyle(a);
        return { klasse: a.className, href: a.getAttribute('href'), left: r.left, top: r.top, w: r.width, h: r.height, outline: cs.outlineStyle, outlineW: parseFloat(cs.outlineWidth) };
      });
      assert.match(s.klasse, /skip-link/, `${side}: første Tab er ikke skip-linket`);
      assert.strictEqual(s.href, '#main-content');
      assert.ok(s.left >= 0 && s.top >= 0 && s.w > 40 && s.h > 20, `${side}: skip-link er ikke synlig ${JSON.stringify(s)}`);
      assert.ok(s.outline !== 'none' && s.outlineW >= 2, `${side}: skip-link uden fokusring`);
      await p.keyboard.press('Enter');
      assert.match(p.url(), /#main-content$/);
      assert.strictEqual(await p.evaluate(() => !!document.getElementById('main-content')), true);
    } finally { await ctx.close(); }
  }
});

test('synlig fokusring på links, knapper og footerlinks (lys og mørk)', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const tema of ['light', 'dark']){
    const { p, ctx } = await aabn('index.html', { tema });
    try {
      await p.evaluate(tm => document.documentElement.setAttribute('data-theme', tm), tema);
      for (const sel of ['.main-nav a', '.header-cta', '.site-footer .footer-col a', '.footer-kontakt a', '.footer-theme']){
        await p.locator(sel).first().focus();
        const o = await p.evaluate(sel2 => { const cs = getComputedStyle(document.querySelector(sel2)); return { s: cs.outlineStyle, w: parseFloat(cs.outlineWidth) }; }, sel);
        assert.ok(o.s !== 'none' && o.w >= 2, `${tema} ${sel}: ingen fokusring ${JSON.stringify(o)}`);
      }
    } finally { await ctx.close(); }
  }
});

test('landmarks: header, hovednavigation, main, footer — og alle nav har et navn', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const side of ['index.html', 'soegning.html', 'login.html', 'guides.html', 'guide-mc-typer.html', 'maerke-honda.html', 'opret-annonce.html', 'om-bikerbasen.html']){
    const { p, ctx } = await aabn(side);
    try {
      const l = await p.evaluate(() => ({
        header: document.querySelectorAll('body > header, header.site-header').length,
        main: document.querySelectorAll('main#main-content').length,
        footer: document.querySelectorAll('footer.site-footer').length,
        hoved: !!document.querySelector('nav[aria-label="Hovednavigation"]'),
        unavngivne: [...document.querySelectorAll('nav')].filter(n => {
          if (n.hasAttribute('hidden')) return false;
          const lb = n.getAttribute('aria-labelledby');
          return !(n.getAttribute('aria-label') || (lb && document.getElementById(lb)));
        }).map(n => n.className),
      }));
      assert.strictEqual(l.header, 1, side); assert.strictEqual(l.main, 1, side); assert.strictEqual(l.footer, 1, side);
      assert.ok(l.hoved, side);
      assert.deepStrictEqual(l.unavngivne, [], `${side}: nav uden navn`);
    } finally { await ctx.close(); }
  }
});

test('mobilmenu: aria-expanded/aria-controls følger åben/lukket, Escape lukker og fokus går tilbage', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const { p, ctx } = await aabn('index.html', { vp: 390 });
  try {
    const knap = p.locator('.mobile-menu-btn');
    assert.strictEqual(await knap.getAttribute('aria-expanded'), 'false');
    assert.strictEqual(await knap.getAttribute('aria-controls'), 'mobile-drawer');
    await knap.click();
    assert.strictEqual(await knap.getAttribute('aria-expanded'), 'true');
    await p.keyboard.press('Escape');
    assert.strictEqual(await knap.getAttribute('aria-expanded'), 'false');
    assert.strictEqual(await p.evaluate(() => document.activeElement.classList.contains('mobile-menu-btn')), true);
  } finally { await ctx.close(); }
});

test('temaskifter: aria-pressed følger det faktiske tema (alle tre knapper), og skiftet virker', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const { p, ctx } = await aabn('index.html', { vp: 1440, tema: 'light' });
  try {
    const tilstand = () => p.evaluate(() => ({
      tema: document.documentElement.getAttribute('data-theme'),
      pressed: [...document.querySelectorAll('.theme-toggle')].map(b => b.getAttribute('aria-pressed')),
    }));
    let s = await tilstand();
    assert.ok(s.pressed.length >= 2);
    assert.ok(s.pressed.every(v => v === 'false'), JSON.stringify(s));
    await p.locator('.footer-theme').click();
    s = await tilstand();
    assert.strictEqual(s.tema, 'dark');
    assert.ok(s.pressed.every(v => v === 'true'), JSON.stringify(s));
    await p.locator('.footer-theme').click();
    s = await tilstand();
    assert.ok(s.pressed.every(v => v === 'false'), JSON.stringify(s));
  } finally { await ctx.close(); }
});

test('ingen vandret overflow og footeren fylder ikke mere end nødvendigt ved 320-1440 px', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const vp of [320, 360, 390, 768, 1024, 1100, 1440]){
    const { p, ctx } = await aabn('index.html', { vp });
    try {
      const m = await p.evaluate(() => ({ over: document.documentElement.scrollWidth - document.documentElement.clientWidth, kolonner: new Set([...document.querySelectorAll('.footer-grid > *')].map(e => Math.round(e.getBoundingClientRect().left))).size }));
      assert.strictEqual(m.over, 0, `overflow ved ${vp}`);
      assert.ok(m.kolonner >= 2, `footeren skal have flere kolonner ved ${vp}`);
    } finally { await ctx.close(); }
  }
});

test('header/footer er synkroniseret til alle sider (synk-header --tjek)', () => {
  const r = spawnSync(process.execPath, [path.join(REPO, 'scripts', 'synk-header.js'), '--tjek'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
});
