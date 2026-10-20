/* V5 QA (F5/F6): højder i dvh/vh. Safari < 15.4 / Firefox < 101 ignorerer dvh (deklarationen falder bort), og iOS Safaris vh er den STORE viewport
   (panelet bliver højere end det synlige). Derfor skal hver dvh-deklaration have en vh-deklaration lige foran (fallback), og
   mobil-filterpanelerne skal bruge dvh: vh først, dvh sidst (browsere med dvh bruger dvh, andre vh). Ren tekstanalyse af css/. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const CSS = path.join(__dirname, '..', 'css');
const filer = fs.readdirSync(CSS).filter(f => f.endsWith('.css'));

/* Deklarationsblokke (indeni { }) uden kommentarer; returnerer [{ fil, vaelger, decl:[ 'prop:value' ] }]. */
function blokke(fil) {
  const t = fs.readFileSync(path.join(CSS, fil), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const ud = [];
  const re = /([^{}]*)\{([^{}]*)\}/g;
  for (let m; (m = re.exec(t));) ud.push({ fil, vaelger: m[1].trim().split('\n').pop().trim().slice(0, 80), decl: m[2].split(/;(?![^(]*\))/).map(d => d.trim()).filter(Boolean) });
  return ud;
}
const alle = filer.flatMap(blokke);
const harDvh = d => /\d(dvh|svh|lvh)\b/.test(d);
const prop = d => d.slice(0, d.indexOf(':')).trim();

test('F6: hver dvh-deklaration har en vh-fallback af samme egenskab lige foran', () => {
  const mangler = [];
  let antal = 0;
  for (const b of alle) b.decl.forEach((d, i) => {
    if (!/\ddvh\b/.test(d)) return;
    antal++;
    const foer = b.decl[i - 1] || '';
    const forventet = d.replace(/(\d)dvh\b/g, '$1vh');
    if (prop(foer) !== prop(d) || foer.replace(/\s+/g, '') !== forventet.replace(/\s+/g, '')) mangler.push(`${b.fil}: ${b.vaelger} { ${d} }`);
  });
  assert.deepStrictEqual(mangler, []);
  assert.ok(antal >= 9, 'der er dvh-deklarationer at tjekke: ' + antal);
});

test('F5: mobil-filterpanelerne (.filters-panel, .filter-drawer-panel) har max-height: 88vh efterfulgt af 88dvh', () => {
  for (const v of ['.filters-panel', '.filter-drawer-panel']) {
    const b = alle.find(x => x.fil === 'styles.css' && x.vaelger.endsWith(v) && x.decl.some(d => /^max-height:s*88d?vh$/.test(d)));
    assert.ok(b, v);
    const i = b.decl.findIndex(d => /^max-height:\s*88vh$/.test(d));
    assert.ok(i >= 0 && /^max-height:\s*88dvh$/.test(b.decl[i + 1] || ''), `${v}: ${b.decl.filter(d => /max-height/.test(d)).join(' | ')}`);
  }
  /* Ingen anden 88vh uden dvh-modstykke i fixed/absolute bundpaneler. */
  for (const b of alle) b.decl.forEach((d, i) => { if (/\b\d+vh\b/.test(d) && /^max-height/.test(d) && /88vh/.test(d)) assert.ok(/88dvh/.test(b.decl[i + 1] || ''), `${b.fil}: ${b.vaelger} har 88vh uden dvh efter`); });
});
