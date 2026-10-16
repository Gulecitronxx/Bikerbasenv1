const test = require('node:test');
const assert = require('node:assert');
const { soegHref } = require('./seo-soeglink.js');

test('modelnavn med komma bliver til q=, ikke model= (søgesiden deler på komma)', () => {
  const h = soegHref({ brands: ['Yamaha'], models: ['XSR 700, Legacy'] }, { html: false });
  assert.doesNotMatch(h, /model=/);
  assert.match(h, /q=XSR%20700%2C%20Legacy/);
  assert.match(h, /brands=Yamaha/);
});

test('almindeligt modelnavn står uændret i model=', () => {
  const h = soegHref({ brands: ['Honda'], models: ['CB 500'] }, { html: false });
  assert.match(h, /model=CB%20500/);
  assert.doesNotMatch(h, /q=/);
});
