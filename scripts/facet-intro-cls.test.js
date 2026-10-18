/* V3: introens højde reserveres på smal skærm (CLS 0,124 på mc-harley-davidson-cruiser @375). */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const sider = fs.readdirSync(ROOT).filter(f => /^(mc|type|region|koerekort|budget|by|model)-.+\.html$/.test(f));
const css = fs.readFileSync(path.join(ROOT, 'css/p-facet.css'), 'utf8');

assert.ok(sider.length > 30);
for (const f of sider){
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const m = h.match(/<p class="fa-hero-intro fa-intro-l(\d)">/);
  assert.ok(m, `${f}: intro uden reserveret højde`);
  assert.ok(new RegExp(`\.fa-intro-l${m[1]}\{ min-height:`).test(css) || m[1] === '2', `${f}: ingen CSS for l${m[1]}`);
}
console.log('ok - alle facetsider reserverer introens højde');

/* Varm cache: flere mc-sider efter hinanden ved 375 (smoke-browserens runner genbruger konteksten), lys og mørk. */
const r = spawnSync('node', [path.join(__dirname, 'smoke-browser.js'), '--sider', 'mc-bmw-touring,mc-harley-davidson-cruiser,mc-honda-adventure,mc-honda-cruiser,mc-honda-naked,mc-honda-touring',
  '--viewports', '375', '--temaer', 'lys,mørk', '--cls', '0.05', '--strikt'], { cwd: ROOT, encoding: 'utf8' });
assert.strictEqual(r.status, 0, 'smoke CLS-fejl:\n' + (r.stdout || '').slice(-600));
console.log('ok - mc-sider ved 375 (lys+mørk) har CLS under 0,05');
