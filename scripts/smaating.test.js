/* Tests for w4-smaating (småting fra de blinde Critic'er). Kør: node --test scripts/smaating.test.js

   Det meste her er målt på den RENDEREDE side (se docs/review/gauntlet/builder-w4.md); testene låser det, der kan
   læses ud af kilderne uden browser, så en senere oprydning ikke sætter det tilbage. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROD = path.join(__dirname, '..');
const læs = f => fs.readFileSync(path.join(ROD, f), 'utf8').replace(/\r\n/g, '\n');

/* ---- 3. login-strimlen står på indholdskanten ---- */
test('login: .lg-strip-list har ingen sidepadding og er kanten minus gutters (252..1668 ved 1920)', () => {
  const css = læs('css/p-login.css');
  const regel = css.match(/\.lg-strip-list\{([^}]*)\}/)[1];
  assert.match(regel, /width:calc\(100% - 2 \* var\(--gutter\)\)/);
  assert.match(regel, /max-width:calc\(var\(--site-w\) - 2 \* var\(--gutter\)\)/);
  assert.ok(!/padding:[^;]*var\(--gutter\)/.test(regel), 'ingen sidepadding på kassen: den skubbede kanten 32 px ud');
  for (const m of css.matchAll(/\.lg-strip-list\{[^}]*padding:\s*([^;}]*)/g))
    assert.match(m[1].trim(), /^var\(--space-\d\) 0$/, `strimlens padding må kun være lodret: "${m[1].trim()}"`);
});

/* ---- 4. afmeld har footer ---- */
test('afmeld: har den delte footer (samme link-gitter som index.html) og de scripts, der gør lys/mørk-knappen levende', () => {
  const grid = h => { const a = h.indexOf('<div class="footer-grid">'); const b = h.indexOf('<div class="footer-bottom">', a); return a < 0 || b < 0 ? null : h.slice(a, b); };
  const afmeld = læs('afmeld.html');
  assert.ok(grid(afmeld), 'afmeld.html har en footer med link-gitter');
  assert.equal(grid(afmeld), grid(læs('index.html')));
  assert.match(afmeld, /<footer class="site-footer">/);
  for (const s of ['js/security.js', 'js/icons.js', 'js/data.js', 'js/store.js', 'js/maaling.js', 'js/components.js', 'js/info.js'])
    assert.ok(afmeld.includes(`<script defer src="${s}?v=`), `${s} er med`);
  // header: kun logoet — med vilje (man lander her fra en mail)
  assert.ok(!/class="main-nav"/.test(afmeld));
  assert.match(afmeld, /<header class="site-header">\s*<div class="container">\s*<a href="index\.html" class="brand">/);
});

test('synk-header.js synkroniserer afmeld.html kun på footerens link-gitter', () => {
  const kilde = læs('scripts/synk-header.js');
  assert.match(kilde, /const FOOTER_KUN = \['afmeld\.html'\];/);
  assert.match(kilde, /FOOTER_KUN\.includes\(fil\)/);
});

/* ---- 5. død klasse ---- */
test('mk-wide: den døde klasse genereres ikke mere og er ikke i CSS eller i håndskrevne sider', () => {
  assert.ok(!/mk-wide/.test(læs('scripts/build-brand-pages.js')));
  assert.ok(!/mk-wide/.test(læs('css/p-maerke.css')));
  assert.ok(!/mk-wide/.test(læs('maerker.html')));
});

/* ---- 7. forhandler.html er en skabelon ---- */
test('forhandler.html er noindex (som annonce.html), står ikke i sitemappet, og intet statisk link afhænger af den', () => {
  assert.match(læs('scripts/build-meta.js'), /const NOINDEX = new Set\(\[[^\]]*'forhandler\.html'[^\]]*\]\)/);
  const f = læs('forhandler.html');
  assert.match(f, /<link rel="canonical" href="https:\/\/bikerbasen\.dk\/forhandler">\n<meta name="robots" content="noindex, follow">\n/);
  assert.equal((f.match(/name="robots"/g) || []).length, 1);
  assert.ok(!/forhandler/.test(læs('sitemap.xml')), 'forhandler står ikke i sitemap.xml');
  assert.ok(!/\.\.\.dealerUrls\.map/.test(læs('scripts/build-brand-pages.js')), 'generatoren skriver ikke forhandler-adresser i sitemappet');
  const hrefs = fs.readdirSync(ROD).filter(n => n.endsWith('.html') && n !== 'forhandler.html')
    .filter(n => /href="\/?forhandler(\.html)?[?"#]/.test(læs(n)));
  assert.deepEqual(hrefs, [], 'ingen statisk side linker til forhandler.html (profilerne nås kun via JS fra annoncesiden)');
});

/* ---- 8. h1-skala ---- */
test('h1: hero-h1 på tekstsider, 404 og afmeld bruger --h1-hero; undtagelserne er de dokumenterede', () => {
  const css = læs('css/styles.css');
  assert.match(css, /--h1-hero: clamp\(28px, 3\.6vw, 50px\);/);
  assert.match(læs('css/p-info.css'), /\.if-hero h1\{\s*color:#fff; font-size: var\(--h1-hero\);/);
  assert.match(læs('css/p-login.css'), /\.lg-solo h1\{ font-size: var\(--h1-hero\);/);
  assert.ok(!/clamp\(32px, 5\.4vw, 56px\)|clamp\(30px, 7vw, 44px\)/.test(læs('css/p-info.css') + læs('css/p-login.css')));
  // Bevidste undtagelser (dokumenteret i docs/review/gauntlet/builder-w4.md):
  assert.match(css, /\.page-title-bar h1\{ font-size: clamp\(24px,3\.4vw,32px\); \}/);   // arbejdssider (titellinje, ikke hero)
  assert.match(læs('css/p-maerke.css'), /\.mk-hero h1\{\s*font-size: clamp\(18px, 2\.3vw, 26px\);/);   // mærkesiden: wordmarket er heroen
});

/* ---- 9. forsidefliserne: hvid tekst over foto ---- */
test('forsidefliser: scrimmen under navn og antal er mørk nok til 4,5:1 selv over et helt hvidt foto', () => {
  const css = læs('css/styles.css');
  const grad = css.match(/\.tile::after\{[\s\S]*?background:\s*linear-gradient\(to top,([^;]*)\);/)[1];
  const stop = [...grad.matchAll(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)\s*(\d+)%|transparent\s*(\d+)%/g)]
    .map(m => m[6] !== undefined ? { p: +m[6], a: 0, rgb: [10, 8, 6] } : { p: +m[5], a: +m[4], rgb: [+m[1], +m[2], +m[3]] });
  assert.ok(stop.length >= 4);
  const alfa = p => {
    for (let i = 1; i < stop.length; i++) if (p <= stop[i].p){ const a = stop[i - 1], b = stop[i]; return a.a + (b.a - a.a) * (p - a.p) / (b.p - a.p); }
    return 0;
  };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  // Højeste tekstlinje: label 9 px fra bunden + 16*1.2 + 1 + 12.5*1.3 = 45,5 px; laveste flise er 74 px høj (320 px bredde, 1.9:1) => 61,5 %.
  const tekstTop = 100 * 45.5 / 74;
  for (let p = 0; p <= tekstTop; p += 1){
    const a = alfa(p);
    const bg = [0, 1, 2].map(i => a * [10, 8, 6][i] + (1 - a) * 255);   // over et helt hvidt foto
    const kontrast = 1.05 / (lum(bg) + 0.05);
    assert.ok(kontrast >= 4.5, `${p} % fra bunden: kontrast ${kontrast.toFixed(2)}:1`);
  }
});

/* ---- 1/2. kortet ---- */
test('swipe-kortet: ingen ekstra "Kørekort"-label foran teksten, og en bundlinje med sted og kilde', () => {
  const css = læs('css/styles.css');
  assert.match(css, /\.swipe-card-kk::before\{ content:none; \}/);
  assert.match(css, /\.swipe-card-fod\{[^}]*display:flex;[^}]*justify-content:space-between;/);
});

test('kortets titel/pris: ingen container query styrer .rk-top; pris står under titlen i alle bredder', () => {
  const css = læs('css/styles.css');
  const blokke = [...css.matchAll(/@container \(max-width: (\d+)px\)\{([^}]*\{[^}]*\}[^}]*)\}/g)].filter(m => /\.rk-top\{/.test(m[2]));
  assert.equal(blokke.length, 0, 'ingen container query styrer .rk-top');
  assert.match(css, /\n\.rk-top\{ flex-direction:column; align-items:flex-start;/);
});

test('swipe-stakken: kun det forreste kort viser bundlinjen', () => {
  assert.match(læs('css/styles.css'), /\.swipe-card:not\(\[data-stack="0"\]\) \.swipe-card-fod\{ visibility:hidden; \}/);
});
