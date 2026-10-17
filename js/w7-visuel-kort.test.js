/* Vagthund for w7-visuel (W7-1, W7-2, W7-3, W7-5): CSS-aftaler bag kortgitter, kortets skillestreg, facetsidernes mobilhero
   og CLS-reservationerne på annoncesiden. Kør: node --test js/w7-visuel-kort.test.js

   Som js/visuel-css.test.js læser den stilarkene som tekst. De rigtige beviser er pixel- og layoutmålingerne i
   docs/review/gauntlet/builder-w7-visuel.md (Playwright mod lokal mock); her låses de tal, de hviler på. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const css = f => fs.readFileSync(path.join(__dirname, '..', 'css', f), 'utf8').replace(/\r\n/g, '\n');
const STYLES = css('styles.css'), SOEG = css('p-soegning.css'), FACET = css('p-facet.css'), ANNONCE = css('p-annonce.css');

/* Alle regler (selektor + krop) i en kilde, uden kommentarer. Tilstrækkeligt for de flade regler i stilarkene. */
function regler(kilde){
  const uden = kilde.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...uden.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({ sel: m[1].trim(), krop: m[2] }));
}
const KORT_INDRE = ['.rk-body', '.rk-titel', '.card-rich .card-media', '.rk-pris', '.rk-linje', '.rk-chips', '.rk-chip', '.rk-fod', '.card-badges'];

test('W7-1: søgeresultatets gitter er kompakt 2-kolonne under 560 px og urørt i listevisning', () => {
  assert.match(SOEG, /@media \(max-width:559px\)\{ #results-grid:not\(\.list-view\)\{ grid-template-columns: repeat\(2, minmax\(0,1fr\)\); gap:10px; \} \}/);
});

test('W7-1: kortets indre mobilregler gælder både landingssiderne og #results-grid (samme udtryk, samme tal)', () => {
  for (const sel of KORT_INDRE){
    const fuld = `:is(.fa-flere, .brand-liste-sektion, #results-grid:not(.list-view)) ${sel}{`;
    assert.ok(STYLES.includes(fuld), `mangler ${fuld}`);
  }
  /* 320 px: højere foto, så hjerte (44) og sammenlign (34 + 5 kant) ikke overlapper */
  assert.match(STYLES, /@media \(max-width:349px\)\{\s*:is\(\.fa-flere, \.brand-liste-sektion, #results-grid:not\(\.list-view\)\) \.card-rich \.card-media\{ aspect-ratio:4\/3; \}/);
});

test('W7-1: trykfladerne på kortet er ikke skåret ned (hjerte 44 px, sammenlign >= 44 px med usynlig kant)', () => {
  /* W11: knappen er nu 40 px synligt + 2 px usynlig kant pr. side = 44 px trykflade (var 34 + 5). Samme krav, anden fordeling. */
  assert.match(STYLES, /\.card-compare\{[^}]*width:40px; height:40px;/);
  assert.match(STYLES, /\.card-compare::before\{ content:''; position:absolute; inset:-2px;/);
  const mobil = STYLES.slice(STYLES.indexOf('W7-1: ved 320 px'));
  assert.ok(!/\.fav-btn\s*\{[^}]*(width|height):\s*(?:[0-3]\d|4[0-3])px/.test(mobil), 'ingen fav-knap under 44 px i de nye regler');
});

test('W7-3: .rk-linje har hverken negativ margin eller clip-path; stregen er hvert leds egen border', () => {
  const alle = regler(STYLES);
  const linje = alle.filter(r => /^\.rk-linje(\s|$)/.test(r.sel) && !r.sel.includes('>'));
  assert.ok(linje.length >= 1);
  for (const r of linje){
    assert.ok(!/clip-path/.test(r.krop), `${r.sel}: clip-path`);
    assert.ok(!/margin(-left)?\s*:\s*[^;]*-\d/.test(r.krop), `${r.sel}: negativ margin på selve linjen`);
    assert.ok(!/overflow\s*:\s*hidden/.test(r.krop), `${r.sel}: overflow:hidden skærer lodret`);
  }
  assert.ok(linje.some(r => /overflow-x:\s*clip/.test(r.krop)), 'linjen skærer kun vandret');
  const led = alle.find(r => r.sel === '.rk-linje > span');
  assert.ok(led, 'fandt .rk-linje > span');
  assert.match(led.krop, /border-left:\s*1px solid/);
});

test('W7-3: ledets regnestykke går op (streg 1 + luft 8 = 9 ud til venstre; 8 + 9 = 17 til højre)', () => {
  const led = regler(STYLES).find(r => r.sel === '.rk-linje > span').krop;
  const margin = led.match(/margin:\s*0\s+(\d+)px\s+0\s+-(\d+)px/);
  const pad = led.match(/padding-left:\s*(\d+)px/);
  assert.ok(margin && pad, 'margin og padding findes');
  const [hoejre, venstre, luft] = [+margin[1], +margin[2], +pad[1]];
  assert.equal(venstre, luft + 1, 'ledet trækkes præcis streg + luft ud, så teksten står i linjens kant');
  assert.equal(hoejre, 8 + venstre, '8 px luft før næste streg + kompensationen for næste leds træk');
  assert.match(STYLES, /\.rk-linje > span:last-child\{ margin-right:0; \}/);
});

test('W7-2: facetsider på mobil: kompakt hero, panel i løbende linjer, søgekortet først på kørekortsider', () => {
  const m = FACET.slice(FACET.indexOf('w7-visuel (W7-2)'));
  assert.match(m, /@media \(max-width:640px\)\{/);
  assert.match(m, /\.fa-hero-bike\{ max-width:176px; \}/);
  assert.match(m, /\.fa-panel strong, \.fa-panel span:not\(\.fa-ik\)\{ display:inline;/);
  assert.match(m, /main\.fa-side\.fa-koerekort > \.container\.fa-krop > \.fa-soeg-vrap\{ order:-1 !important; \}/);
  /* trykfladerne: brødkrumme-led, felter og knapper er ikke blevet mindre */
  assert.match(STYLES, /\.breadcrumb a, \.breadcrumb > span:not\(\.bc-sep\)\{[^}]*min-height:40px;/);
  assert.match(FACET, /\.fa-agent a\{[^}]*min-height:44px;/);
  assert.ok(!/\.fa-felt[^{]*\{[^}]*min-height:\s*(?:[0-3]\d)px/.test(m));
});

test('W7-2: desktop-heroerne på typesider er kompakte (billede 8): 320 px fotokolonne, 16 px luft, 40 px bundpolstring', () => {
  const m = FACET.slice(FACET.indexOf('w7-visuel: kompaktere heroer'));
  assert.match(m, /@media \(min-width:1100px\)\{/);
  assert.match(m, /grid-template-columns: minmax\(0,1fr\) 320px 300px; padding-top: var\(--space-4\);/);
  assert.match(m, /padding-bottom: calc\(var\(--space-8\) \+ var\(--space-2\)\)/);
});

test('W7-5: statisk annonceside — øverste h1 hverken fylder eller flytter noget, uanset om der er forhåndsvist galleri', () => {
  assert.match(ANNONCE, /\.container > #listing-h1\{[^}]*position:absolute;[^}]*clip-path:inset\(50%\)/);
  assert.ok(!/:has\(\.prerender-gallery\) > #listing-h1/.test(ANNONCE), 'reglen må ikke kræve galleri');
});

test('W9 (afløser W7-5-reglen): Favoritter står altid i desktopheaderen, så der intet er at skjule/vise ved hydrering (ingen CLS), og kun tælleren er skjult ved 0', () => {
  /* Bevidst ændring: billede 1 viser Favoritter i headeren uanset antal. W7 løste CLS ved at skjule linjen; W9 løser det ved at vise den fra første maling. */
  assert.ok(!/\.header-fav:has\(\.fav-count\[data-count="0"\]\)\{ display:none; \}/.test(STYLES), 'linjen må ikke skjules ved 0');
  assert.match(STYLES, /\.fav-count\[data-count="0"\]\{ display:none; \}/);
  const komp = fs.readFileSync(path.join(__dirname, 'components.js'), 'utf8');
  assert.match(komp, /classList\.contains\('header-fav'\)/);
  const side = fs.readFileSync(path.join(__dirname, '..', 'annonce-harley-davidson-flhx-2007-541ad405.html'), 'utf8');
  assert.match(side, /class="fav-count" data-fav-count data-count="0"/);
});

test('W7-1: lige-ved-grænsen — gitterets 2 kolonner begynder først under 560 px (560 er stadig 2-kolonne fra styles.css)', () => {
  assert.match(SOEG, /@media \(min-width:560px\)\{ #results-grid:not\(\.list-view\)\{ grid-template-columns: repeat\(2, minmax\(0,1fr\)\); \} \}/);
});
