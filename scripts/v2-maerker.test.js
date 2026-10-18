'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'p-facet.css'), 'utf8');

test('V2: CTA-panelets foto ligger i egen række og overlapper ikke punkter/knap', () => {
  const last = css.lastIndexOf('.fa-cta-foto{ position:static');
  const regel = css.slice(last, css.indexOf('}', last));
  assert.match(regel, /position:\s*static/);
  assert.match(regel, /order:\s*9/);
  assert.doesNotMatch(regel, /position:\s*absolute/);
});

test('V2: kørekortfakta på kørekortsiderne', () => {
  const rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const a2 = rd('koerekort-a2.html'), a = rd('koerekort-a.html');
  assert.match(a2, /35 kW[^<]{0,12}47 hk/);
  assert.match(a2, /0,2 kW pr\. kg/);
  assert.match(a, /24 år/); assert.match(a, /22 år/);
  assert.match(rd('koerekort-a1.html'), /0,1 kW pr\. kg/);
});
