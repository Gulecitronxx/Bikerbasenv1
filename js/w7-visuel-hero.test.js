/* Vagthund for w7-visuel W7-4: forsidens hero-scrim og højde. Kør: node --test js/w7-visuel-hero.test.js

   Pixelmålingerne (90./99. percentil af luminansen bag hver tekstlinje, kortet og teksten skjult) står i
   docs/review/gauntlet/builder-w7-visuel.md. Her låses (a) målemetodens regnestykke og (b) scrimmens tal, så en oprydning
   ikke gør heroen mørkere (motorcyklen skjult) eller lysere (kontrast under 4,5:1) uset. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const STYLES = fs.readFileSync(path.join(__dirname, '..', 'css', 'styles.css'), 'utf8').replace(/\r\n/g, '\n');

const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const kontrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const pct = (arr, p) => arr.slice().sort((x, y) => x - y)[Math.min(arr.length - 1, Math.floor(p * arr.length))];

test('målemetode: hvid på sort er 21:1 og 90. percentil ignorerer de 10 % lyseste pixels', () => {
  assert.equal(Math.round(kontrast(lum(255, 255, 255), lum(0, 0, 0))), 21);
  const pixels = [...Array(91).fill(lum(20, 20, 20)), ...Array(9).fill(lum(250, 250, 250))];
  const p90 = pct(pixels, 0.9), p99 = pct(pixels, 0.99);
  assert.ok(kontrast(1, p90) > 15, 'p90 er stadig de mørke pixels');
  assert.ok(kontrast(1, p99) < 1.2, 'p99 fanger de lyse (kromglimt/skyer)');
});

/* Alle alfa-værdier (color-mix ... N%) i det første lag af den ::after-blok, der følger efter `start`. */
function stop(start, lagIndex = 0){
  const i = STYLES.indexOf(start);
  assert.ok(i > -1, `fandt ikke ${start}`);
  const blok = STYLES.slice(i, STYLES.indexOf('}', STYLES.indexOf('::after', i) > -1 ? STYLES.indexOf(';\n}', i) : i));
  const lag = blok.split('linear-gradient(').slice(1)[lagIndex];
  return [...lag.matchAll(/var\(--color-dark\) (\d+)%/g)].map(m => +m[1]);
}

test('W7-4 desktop: tekstzonens scrim holder (80/66 % bag h1 og ingress) og fotoet står frit længere ude', () => {
  const a = stop('.hero::after{\n  content:""');
  assert.ok(a[0] >= 80 && a[1] >= 66, `venstre stop ${a}`);
  assert.ok(a[2] <= 32, `ved tekstkolonnens kant højst 32 %, er ${a[2]}`);
  const bund = stop('.hero::after{\n  content:""', 1);
  assert.ok(bund[0] <= 16, `bundgradienten over motorcyklen er svag (${bund[0]} %)`);
});

test('W7-4 mobil: scrimmen er tekstvægtet — tæt øverst (eyebrow + h1), tynd ned over motorcyklen', () => {
  const m = STYLES.slice(STYLES.indexOf('@media (max-width: 760px){\n  /* W7-4'));
  const g = m.indexOf('linear-gradient(180deg');
  const a = [...m.slice(g, m.indexOf(';', g)).matchAll(/var\(--color-dark\) (\d+)%/g)].map(x => +x[1]);
  assert.deepEqual(a.length, 4);
  assert.ok(a[0] >= 80 && a[1] >= 70, `øverste to stop ${a}`);
  assert.ok(a[2] <= 30 && a[3] <= 22, `nederste to stop ${a}`);
});

test('W7-4 tablet: scrimmen følger tekstkolonnen i px (>= 78 % til 480 px, >= 52 % til 680 px)', () => {
  const i = STYLES.indexOf('@media (min-width:761px) and (max-width:1100px)');
  const blok = STYLES.slice(i, STYLES.indexOf('\n}', i));
  assert.match(blok, /var\(--color-dark\) 84%, transparent\) 0%/);
  assert.match(blok, /var\(--color-dark\) 78%, transparent\) 480px/);
  assert.match(blok, /var\(--color-dark\) 52%, transparent\) 680px/);
});

test('W7-4: heroen er 56 px højere og fotoet forskudt, så motorcyklen står hel (desktop 72 % 70 %)', () => {
  assert.match(STYLES, /@media \(min-width:768px\)\{ \.hero\{ padding: var\(--space-6\) 0 calc\(var\(--space-8\) \+ 24px \+ 56px\); \} \.hero-photo\{ object-position: 72% 70%; \} \}/);
  assert.match(STYLES, /\.hero\{ padding-bottom: calc\(var\(--space-8\) \+ 16px \+ 56px\); \}/);
  assert.match(STYLES, /\.hero-sok\{\s*position:relative; z-index:3; margin-top:-72px;/, 'søgekortets overlap er uændret');
});
