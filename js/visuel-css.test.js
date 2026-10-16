/* Vagthund for w5-visuel (V2-001..V2-014): CSS-aftaler, der ikke kan ses i en enkelt regel. Kør: node --test js/visuel-css.test.js

   Testen læser stilarkene som tekst (som js/scroll-padding.test.js). De rigtige beviser er pixelmålingerne i
   docs/review/gauntlet/builder-w5-visuel.md; her låses de tal, de hviler på, så en oprydning ikke fjerner dem uset. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROD = path.join(__dirname, '..');
const css = f => fs.readFileSync(path.join(ROD, 'css', f), 'utf8').replace(/\r\n/g, '\n');
const STYLES = css('styles.css'), FACET = css('p-facet.css'), GUIDES = css('p-guides.css'), INFO = css('p-info.css'),
  MAERKE = css('p-maerke.css'), ANNONCE = css('p-annonce.css'), SOEG = css('p-soegning.css');

/* Alle alfa-værdier i første gradient-lag af et ::after-blok, i rækkefølge. */
function alfaer(kilde, vaelger){
  const i = kilde.indexOf(vaelger);
  assert.ok(i > -1, `fandt ikke ${vaelger}`);
  const blok = kilde.slice(i, kilde.indexOf('}', i));
  const lag = blok.match(/linear-gradient\(90deg[\s\S]*?\d+px\)\),/);
  assert.ok(lag, `${vaelger} har intet vandret lag`);
  return [...lag[0].matchAll(/rgba\(\d+,\s*\d+,\s*\d+,\s*(\.\d+|\d(?:\.\d+)?)\)/g)].map(m => parseFloat(m[1]));
}

/* Hvid tekst mod et foto med lysstyrke 0,95 (kromglimt) bag en sort scrim med alfa a: kontrast >= 4,5 kræver a >= ca. 0,55
   (sRGB-gamma ~2,2). Vi kræver 0,62 bag hele tekstkolonnen. */
test('V2-002: hero-scrimmen er >= 0,62 hele vejen til tekstkolonnens kant (px-stop, ikke procent af fotoet)', () => {
  const sider = [
    [GUIDES, '.gd-hero-media::after'], [INFO, '.if-hero-media::after'], [FACET, '.fa-hero::after'], [MAERKE, '.mk-hero-media::after'],
  ];
  for (const [kilde, v] of sider){
    const a = alfaer(kilde, v);
    assert.ok(a.length >= 4, `${v}: forventer 4 stop`);
    assert.ok(a[2] >= 0.62, `${v}: tredje stop (tekstkolonnens kant) er ${a[2]}, skal være >= 0,62`);
    const i = kilde.indexOf(v), blok = kilde.slice(i, kilde.indexOf('}', i));
    assert.match(blok, /min\(100%,\s*\d+px\)/, `${v}: stoppene skal følge kolonnen i px`);
  }
});

test('V2-002: mærkesidens mobil-overlay er >= 0,72 øverst (h1/wordmark) i begge temaer', () => {
  const m = MAERKE.match(/@media \(max-width:559px\)\{[\s\S]*?\.mk-hero-media::after, :root\[data-theme="dark"\] \.mk-hero-media::after\{\s*background:\s*linear-gradient\(180deg,\s*rgba\(12,10,8,(\.\d+)\)/);
  assert.ok(m, 'mobil-overlayet skal gælde både lyst og mørkt tema');
  assert.ok(parseFloat(m[1]) >= 0.72);
});

test('V2-001: facet-flisernes bundgradient er forsidens .tile-gradient (samme stop)', () => {
  const stop = s => (s.match(/linear-gradient\(to top[^;]*\)/) || [''])[0].replace(/\s+/g, ' ').replace(/ \/\*.*$/, '');
  const tile = STYLES.slice(STYLES.indexOf('.tile::after{'), STYLES.indexOf('}', STYLES.indexOf('.tile::after{')));
  const fa = FACET.split('\n').find(l => l.startsWith('.fa-typer a::after'));
  assert.ok(fa, 'fandt ikke .fa-typer a::after');
  const norm = s => s.replace(/rgba\(10,8,6,/g, '(').replace(/\s+/g, '').replace(/\)\)/g, ')');
  assert.equal(norm(stop(fa)).replace(/\/\*.*/, '').replace(/;?\}?$/, ''), norm(stop(tile)).replace(/;?$/, ''));
});

test('V2-003/007: pilen mellem brødkrummens led er reserveret (14 px) før JS, og leddene er >= 40 px høje', () => {
  assert.match(STYLES, /\.bc-sep\{[^}]*width:14px;[^}]*height:14px;/);
  assert.match(STYLES, /\.breadcrumb a, \.breadcrumb > span:not\(\.bc-sep\)\{[^}]*min-height:40px;/);
  assert.match(STYLES, /\.breadcrumb\{[^}]*flex-wrap:nowrap;[^}]*overflow-x:auto;/, 'mobil: én række, så højden er stabil');
});

test('V2-003: annonceside reserverer rækken efter den hydrerede højde og skjuler den øverste h1 kun i den statiske tilstand', () => {
  assert.match(ANNONCE, /\.an-crumbrow\{[^}]*min-height:96px;/);
  assert.match(ANNONCE, /@media \(min-width:621px\)\{ \.an-crumbrow\{ min-height:102px; \} \}/);
  assert.match(ANNONCE, /@media \(min-width:900px\)\{ \.an-crumbrow\{ min-height:46px; \} \}/);
  assert.match(ANNONCE, /\.container > #listing-h1\{[^}]*clip-path:inset\(50%\)/);
  /* én række af handlinger på mobil */
  assert.match(ANNONCE, /\.an-actions\{[^}]*flex-wrap:nowrap;/);
});

test('V2-005: søgesidens chip-række reserverer højde på mobil', () => {
  assert.match(SOEG, /@media \(max-width:620px\)\{[^}]*\.so-chips-area\{ min-height:28px; \}/);
});

test('V2-007: indholdsfortegnelse og "Få besked" er trykflader på >= 40 px', () => {
  assert.match(GUIDES, /\.gd-toc a\{[^}]*min-height:40px;/);
  assert.match(INFO, /\.if-toc a\{[^}]*min-height:40px;/);
  assert.match(FACET, /\.fa-agent a\{[^}]*min-height:44px;/);
});

test('V2-008/009: ét kortlayout, chips i bunden, og ingen enlig | først på en linje', () => {
  const sidst = STYLES.slice(STYLES.indexOf('w5-visuel: ét kortlayout'));
  assert.match(sidst, /\.rk-top\{ flex-direction:column;/);
  assert.match(sidst, /\.rk-chips\{ margin-top:auto; \}/);
  assert.match(sidst, /\.rk-chips \+ \.rk-fod\{ margin-top:0; \}/);
  /* W7-3: skillestregen er hvert leds egen border, ikke en negativ margin + clip-path på linjen (se js/w7-visuel-kort.test.js). */
  assert.ok(!/\.rk-linje\{[^}]*clip-path/.test(STYLES), '.rk-linje må ikke bruge clip-path');
  assert.match(STYLES, /\.rk-linje > span\{[^}]*border-left:1px solid/);
});

test('V2-014: kortlister på landingssider er kompakt 2-kolonne og mærkesidens kolonner en skinne med peek under 560 px', () => {
  assert.match(STYLES, /@media \(max-width:559px\)\{\s*:is\(\.fa-flere, \.brand-liste-sektion\) \.listings-grid\{ grid-template-columns:repeat\(2, minmax\(0,1fr\)\);/);
  assert.match(MAERKE, /\.mk-cols > \.mk-col\{ flex:0 0 82%; scroll-snap-align:start; \}/);
  assert.match(MAERKE, /scroll-snap-type:x mandatory/);
});

test('V2-010: ét tomt-foto-felt: "ingen foto" og "foto kunne ikke hentes" deler markup og stilark', () => {
  const komp = fs.readFileSync(path.join(__dirname, 'components.js'), 'utf8');
  const tom = komp.match(/return `<div class="foto-tom">`([\s\S]*?)`<\/div>`;/);
  const fejl = komp.match(/return `<div class="foto-tom foto-fejl"[^`]*`([\s\S]*?)`<\/div>`;/);
  assert.ok(tom && fejl, 'begge felter findes');
  for (const k of ['foto-tom-ikon', 'foto-tom-titel']){
    assert.ok(tom[1].includes(k) && fejl[1].includes(k), `${k} i begge`);
  }
  /* kun teksten adskiller sig: ingen egen ramme/baggrund til .foto-fejl */
  assert.ok(!/\.foto-fejl\s*\{[^}]*(border|background)/.test(STYLES), '.foto-fejl må ikke have sin egen ramme eller flade');
});
