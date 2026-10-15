/* Tests for ren logik i js/dashboard.js: sammenligningen med forrige periode
   må ikke gætte (ingen forrige data = ingen procent). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'dashboard.js'), 'utf8');
const D = new Function('document', 'window', 'Store', 'db', 'Icon',
  src + '\n;return { visningerAendring, compactNumber };')(
  { addEventListener(){} }, {}, {}, { enabled: false }, {});

test('visningerAendring: ingen forrige data giver null', () => {
  assert.equal(D.visningerAendring(40, 0), null);
});
test('visningerAendring: op, ned og uændret', () => {
  assert.equal(D.visningerAendring(150, 100), 50);
  assert.equal(D.visningerAendring(50, 100), -50);
  assert.equal(D.visningerAendring(100, 100), 0);
});
test('compactNumber', () => {
  assert.equal(D.compactNumber(950), '950');
  assert.equal(D.compactNumber(12000), '12K');
});
