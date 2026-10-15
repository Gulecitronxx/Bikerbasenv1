const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const V = require('./opret-validering.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'opret-annonce.html'), 'utf8');

test('hvert felt med valideringsregel findes i opret-annonce.html', () => {
  Object.keys(V.REGLER).forEach(id => {
    assert.match(html, new RegExp(`id="${id}"`), `${id} mangler i HTML`);
  });
});

test('HTML hårdkoder ikke grænser, der kan være uenige med valideringen', () => {
  // min/max sættes af opret-annonce.js ud fra js/opret-validering.js
  Object.keys(V.REGLER).forEach(id => {
    const tag = (html.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`)) || [''])[0];
    assert.doesNotMatch(tag, /\b(min|max)=/, `${id} har hårdkodet min/max`);
  });
});

test('validering indlæses før opret-annonce.js, og siden har én h1', () => {
  const v = html.indexOf('src="js/opret-validering.js');
  const o = html.indexOf('src="js/opret-annonce.js');
  assert.ok(v > 0 && o > v, 'opret-validering.js skal stå før opret-annonce.js');
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
});

test('siden har trinbjælke, live-forhåndsvisning og tryghedsboks', () => {
  ['id="stepper"', 'id="op-live-card"', 'op-safe', 'Gode titler tiltrækker flere købere', 'En god beskrivelse skaber tillid', 'Felter markeret med'].forEach(s =>
    assert.ok(html.includes(s), `mangler: ${s}`));
});

test('ingen opdigtede tal eller påstande i tips og tillidsbokse', () => {
  const sektion = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  [/\b3x\b/i, /\d+\s*%/, /tusindvis/i, /svartid/i, /autoriseret/i, /verificeret/i].forEach(re =>
    assert.doesNotMatch(sektion, re, `uønsket mønster ${re}`));
});

test('inline scripts er ikke tilføjet (CSP-hashes)', () => {
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  assert.doesNotMatch(main, /<script/i);
});
