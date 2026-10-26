/* V7 QA: låser scripts/koer-test.js: en rød testfil køres igen alene; grøn ved genkørsel = FLAKY-blok + exit 0; rød igen = exit 1;
   BB_TEST_STRIKT=1 gør genkørsel til fejl; BB_TEST_UDEN_GENKOERSEL=1 slår den fra. Falske testfiler i en temp-mappe, ingen browser. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const KOER = path.join(__dirname, 'koer-test.js');

function opsaet(filerTekst) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'koer-test-'));
  const filer = {};
  for (const [navn, tekst] of Object.entries(filerTekst)) { filer[navn] = path.join(dir, navn); fs.writeFileSync(filer[navn], tekst.split('MARKOER').join(JSON.stringify(path.join(dir, navn + '.markoer')))); }
  return { dir, filer, ryd: () => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 }) };
}
/* NODE_TEST_CONTEXT fjernes: en indlejret `node --test` ville ellers opføre sig som barn af den ydre testkørsel (v8-serialiseret output). */
const koer = (filer, env = {}) => {
  const e = { ...process.env, ...env, BB_TEST_SAMTIDIGE: '2' };
  delete e.NODE_TEST_CONTEXT;
  return spawnSync(process.execPath, [KOER, ...filer], { encoding: 'utf8', env: e, timeout: 120000 });
};

const GRON = `require('node:test')('gron', () => {});`;
/* rød første gang (ingen markør), grøn næste gang */
const FLAKY = `const fs = require('node:fs'); const m = MARKOER;
require('node:test')('flaky-test', () => { if (!fs.existsSync(m)) { fs.writeFileSync(m, '1'); throw new Error('foerste gang'); } });`;
const AEGTE = `require('node:test')('aegte-fejl', () => { throw new Error('altid rød'); });`;

test('alt grønt: exit 0, ingen genkørsel', () => {
  const o = opsaet({ 'a.test.js': GRON });
  try {
    const r = koer([o.filer['a.test.js']]);
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.doesNotMatch(r.stderr, /FLAKY|køres nu igen/);
  } finally { o.ryd(); }
});

test('flaky fil: rød første gang, grøn ved genkørsel -> exit 0 og tydelig FLAKY-blok med testnavnet', () => {
  const o = opsaet({ 'a.test.js': GRON, 'f.test.js': FLAKY });
  try {
    const r = koer([o.filer['a.test.js'], o.filer['f.test.js']]);
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stderr, /1 testfil\(er\) var røde/);
    assert.match(r.stderr, /FLAKY/);
    assert.match(r.stderr, /flaky-test/);
  } finally { o.ryd(); }
});

test('ægte fejl: rød igen ved genkørsel -> exit 1 og filen nævnt', () => {
  const o = opsaet({ 'a.test.js': GRON, 'e.test.js': AEGTE });
  try {
    const r = koer([o.filer['a.test.js'], o.filer['e.test.js']]);
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /STADIG RØDE/);
    assert.match(r.stderr, /e\.test\.js/);
  } finally { o.ryd(); }
});

test('BB_TEST_STRIKT=1: en flaky fil er en fejl; BB_TEST_UDEN_GENKOERSEL=1: ingen genkørsel (rød bliver rød)', () => {
  const o = opsaet({ 'f.test.js': FLAKY });
  try {
    const s = koer([o.filer['f.test.js']], { BB_TEST_STRIKT: '1' });
    assert.strictEqual(s.status, 1, s.stdout + s.stderr);
    assert.match(s.stderr, /FLAKY/);
  } finally { o.ryd(); }
  const o2 = opsaet({ 'f.test.js': FLAKY });
  try {
    const u = koer([o2.filer['f.test.js']], { BB_TEST_UDEN_GENKOERSEL: '1' });
    assert.strictEqual(u.status, 1, u.stdout + u.stderr);
    assert.doesNotMatch(u.stderr, /køres nu igen/);
  } finally { o2.ryd(); }
});
