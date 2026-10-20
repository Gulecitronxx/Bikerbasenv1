/* V5 QA (F3): regex-lookbehind er fjernet fra js/ (Safari < 16.4 kan ikke parse det). Denne test låser, at den nye kode giver
   PRÆCIS det samme som de gamle udtryk, på mange tusinde inputs (udtømmende for korte strenge + seedet tilfældig for lange),
   og at de nye udtryk står uændret i kilden. De gamle udtryk står her som reference (kan kun køre i moderne motorer).
   Kør: node --test js/v5-lookbehind-ekvivalens.test.js */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const JS = __dirname;
const kilde = f => fs.readFileSync(path.join(JS, f), 'utf8');

/* ---------- Generator ---------- */
function* alle(alfabet, maksLaengde) {
  yield '';
  let forrige = [''];
  for (let n = 1; n <= maksLaengde; n++) {
    const naeste = [];
    for (const s of forrige) for (const c of alfabet) { const t = s + c; naeste.push(t); yield t; }
    forrige = naeste;
  }
}
function tilfaeldige(alfabet, antal, maks, seed) {
  let x = seed >>> 0;
  const r = () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
  const ud = [];
  for (let i = 0; i < antal; i++) { let s = ''; const n = Math.floor(r() * maks); for (let k = 0; k < n; k++) s += alfabet[Math.floor(r() * alfabet.length)]; ud.push(s); }
  return ud;
}

/* ---------- 1. backend-bridge.js / filtrering.js: punktum bevares kun mellem to cifre ---------- */
const gammelNoegle = s => String(s == null ? '' : s).toLowerCase().replace(/[\s\-]+/g, '').replace(/(?<!\d)\.|\.(?!\d)/g, '');
const nyNoegle = s => String(s == null ? '' : s).toLowerCase().replace(/[\s\-]+/g, '').replace(/\./g, (p, i, t) => (/\d/.test(t.charAt(i - 1)) && /\d/.test(t.charAt(i + 1))) ? p : '');

test('modelNoegle/harmoniserStavning: ny punktum-regel = gammel (udtømmende op til 7 tegn + 20.000 tilfældige)', () => {
  let n = 0;
  for (const s of alle(['1', '2', '.', ' ', '-', 'a', 'B'], 7)) { assert.strictEqual(nyNoegle(s), gammelNoegle(s), JSON.stringify(s)); n++; }
  for (const s of tilfaeldige(['0', '5', '9', '.', '.', ' ', '-', 'x', 'CB', 'Æ', '\t'], 20000, 24, 7)) { assert.strictEqual(nyNoegle(s), gammelNoegle(s), JSON.stringify(s)); n++; }
  assert.ok(n > 800000, String(n));
  assert.strictEqual(nyNoegle('CB 12.5'), 'cb12.5'); assert.strictEqual(nyNoegle('XL 1.000 .'), 'xl1.000');
});

test('kilden bruger det nye punktum-udtryk i både backend-bridge.js og filtrering.js', () => {
  const nyt = ".replace(/\\./g, (p, i, s) => (/\\d/.test(s.charAt(i - 1)) && /\\d/.test(s.charAt(i + 1))) ? p : '');";
  for (const f of ['backend-bridge.js', 'filtrering.js']) assert.ok(kilde(f).includes(nyt), f);
});

/* ---------- 2. annonce.js: del efter punktum + mellemrum ---------- */
const gammelForkl = s => String(s).split(/(?<=\.)\s+/);
const nyForkl = s => (d => d.map((x, i) => i < d.length - 1 ? x + '.' : x))(String(s).split(/\.\s+/));

test('annonce.js forklDele: ny opdeling = gammel (udtømmende op til 8 tegn + 20.000 tilfældige)', () => {
  for (const s of alle(['a', '.', ' ', '\n', '\t', '1'], 8)) assert.deepStrictEqual(nyForkl(s), gammelForkl(s), JSON.stringify(s));
  for (const s of tilfaeldige(['a', 'b', '.', '. ', ' ', '  ', '\n', '48 hk', '.\n'], 20000, 30, 11)) assert.deepStrictEqual(nyForkl(s), gammelForkl(s), JSON.stringify(s));
  const tekst = 'Over 47 hk. Kræver A2-begrænsning. Tjek kW i attesten.';
  assert.deepStrictEqual(nyForkl(tekst), ['Over 47 hk.', 'Kræver A2-begrænsning.', 'Tjek kW i attesten.']);
});

test('kilden bruger den nye opdeling i annonce.js', () => {
  assert.ok(kilde('annonce.js').includes("(d => d.map((x, i) => i < d.length - 1 ? x + '.' : x))(String(kkM.forklaring || '').split(/\\.\\s+/))"));
});

/* ---------- 3. opret-annonce.js: sætninger ---------- */
const gammelSaetn = raa => raa.split(/(?<=[.!?])\s+|\n+/);
const nySaetn = raa => (txt => { const ud = []; const re = /([.!?])\s+|\n+/g; let start = 0, m; while ((m = re.exec(txt))) { ud.push(txt.slice(start, m[1] ? m.index + 1 : m.index)); start = m.index + m[0].length; } ud.push(txt.slice(start)); return ud; })(raa);

test('opret-annonce.js sætninger: ny opdeling = gammel (udtømmende op til 8 tegn + 30.000 tilfældige)', () => {
  for (const s of alle(['a', '.', '!', '?', ' ', '\n', '\t'], 8)) assert.deepStrictEqual(nySaetn(s), gammelSaetn(s), JSON.stringify(s));
  for (const s of tilfaeldige(['a', 'b', '.', '!', '?', '. ', '?! ', ' ', '  ', '\n', '\n\n', '\r\n', '.\n'], 30000, 30, 13)) assert.deepStrictEqual(nySaetn(s), gammelSaetn(s), JSON.stringify(s));
  /* Efter trim+filter (som koden gør) er resultatet det samme for realistiske tekster. */
  const rens = l => l.map(x => x.trim()).filter(Boolean);
  const t = 'Flot MT-07. Nye dæk!  Servicebog?\nKan prøvekøres.\n\nPris fast.';
  assert.deepStrictEqual(rens(nySaetn(t)), ['Flot MT-07.', 'Nye dæk!', 'Servicebog?', 'Kan prøvekøres.', 'Pris fast.']);
});

test('kilden bruger den nye sætningsopdeling i opret-annonce.js', () => {
  assert.ok(kilde('opret-annonce.js').includes('const re = /([.!?])\\s+|\\n+/g; let start = 0, m; while ((m = re.exec(txt)))'));
});

/* ---------- 4. data.js: "årg NN" og ccm i titlen ---------- */
const gammelAarg = t => { const am = t.match(/(?<![\p{L}\d])[aå]rg\.?\s*(\d{2,4})(?!\d)/iu); return am ? { m: am[0], tal: am[1], uden: t.replace(am[0], ' ') } : null; };
const nyAarg = t => { const amR = t.match(/(^|[^\p{L}\d])([aå]rg\.?\s*(\d{2,4}))(?!\d)/iu); const am = amR ? [amR[2], amR[3]] : null; return am ? { m: am[0], tal: am[1], uden: t.replace(am[0], ' ') } : null; };

test('data.js saniterTal "årg NN": ny regex = gammel (udtømmende op til 7 tegn + 40.000 tilfældige)', () => {
  for (const s of alle(['a', 'å', 'r', 'g', '.', ' ', '9', 'x'], 7)) assert.deepStrictEqual(nyAarg(s), gammelAarg(s), JSON.stringify(s));
  for (const s of tilfaeldige(['årg', 'ARG', 'Årg.', ' ', ' ', '9', '90', '1990', '5', 'x', 'é', 'ø', '-', '.'], 40000, 14, 17)) assert.deepStrictEqual(nyAarg(s), gammelAarg(s), JSON.stringify(s));
  assert.deepStrictEqual(nyAarg('XJ 900 årg 90'), { m: 'årg 90', tal: '90', uden: 'XJ 900  ' });
  assert.strictEqual(nyAarg('Størrg 90'), null, 'foranstillet bogstav: ingen match');
});

test('data.js saniterTal ccm-udtryk: (^|\\D)ccm = (?<!\\d)ccm (test over 40.000 tekster)', () => {
  for (const ccm of [50, 125, 500, 689, 900, 1000, 1200]) {
    const g1 = new RegExp('(?<!\\d)' + ccm + '(?!\\d)'), n1 = new RegExp('(^|\\D)' + ccm + '(?!\\d)');
    const g2 = new RegExp('(?<!\\d)' + ccm + '\\d+(?!\\d)'), n2 = new RegExp('(^|\\D)' + ccm + '\\d+(?!\\d)');
    for (const s of tilfaeldige(['0', '1', '2', '5', '9', String(ccm), ' ', 'x', '-', '\n'], 6000, 12, ccm)) {
      assert.strictEqual(n1.test(s), g1.test(s), `${ccm} ${JSON.stringify(s)}`);
      assert.strictEqual(n2.test(s), g2.test(s), `${ccm}+ ${JSON.stringify(s)}`);
    }
  }
});

test('kilden bruger de nye udtryk i data.js', () => {
  const k = kilde('data.js');
  assert.ok(k.includes("/(^|[^\\p{L}\\d])([aå]rg\\.?\\s*(\\d{2,4}))(?!\\d)/iu"));
  assert.ok(k.includes("new RegExp('(^|\\\\D)' + ccm + '(?!\\\\d)')"));
  assert.ok(k.includes("new RegExp('(^|\\\\D)' + ccm + '\\\\d+(?!\\\\d)')"));
});

test('ingen js-fil (undtagen tests) indeholder regex-lookbehind', () => {
  for (const f of fs.readdirSync(JS).filter(n => n.endsWith('.js') && !/\.test\.js$/.test(n))) assert.ok(!/\(\?<[=!]/.test(kilde(f)), `${f} har lookbehind`);
});
