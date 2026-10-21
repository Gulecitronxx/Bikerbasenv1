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

/* V6 (P2-4): antal-linjen under søgekortet ("N ... indekseret på Bikerbasen") reserverer sine linjer (fa-antal-lN), så et skift i antal cifre
   mellem det bagte tal og lagerets tal ikke trækker resten af kortet op. */
for (const f of sider){
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const m = h.match(/<p class="fa-soeg-antal fa-antal-l(\d)">/);
  assert.ok(m, `${f}: antal-linjen uden reserveret højde (fa-antal-lN)`);
  assert.ok(m[1] === '1' || css.includes(`.fa-soeg-antal.fa-antal-l${m[1]}{ min-height:`), `${f}: ingen CSS for fa-antal-l${m[1]}`);
}
assert.ok(css.includes('.fa-soeg-antal{ text-wrap: balance; }'), 'text-wrap: balance på antal-linjen');
console.log('ok - alle facetsider reserverer antal-linjens højde');

/* Varm cache: flere mc-sider efter hinanden ved 375 (smoke-browserens runner genbruger konteksten), lys og mørk.
   V6 (P2-4): målt 0,0015-0,014 efter rettelsen (0,031 før; 0,051 under CPU-last), grænsen 0,05 har altså stor margin. CLS er stadig tidsfølsom under
   kraftig CPU-last (parallelle testprocesser), så en rød kørsel gentages op til to gange; en ægte regression fejler alle tre kørsler. */
const args = [path.join(__dirname, 'smoke-browser.js'), '--sider', 'mc-bmw-touring,mc-harley-davidson-cruiser,mc-honda-adventure,mc-honda-cruiser,mc-honda-naked,mc-honda-touring,type-cruiser,by-horsens',
  '--viewports', '375', '--temaer', 'lys,mørk', '--cls', '0.05', '--strikt'];
let r, forsoeg = 0;
do { r = spawnSync('node', args, { cwd: ROOT, encoding: 'utf8' }); forsoeg++; if (r.status !== 0) console.log(`forsøg ${forsoeg} rød:\n` + (r.stdout || '').slice(-400)); } while (r.status !== 0 && forsoeg < 3);
assert.strictEqual(r.status, 0, `smoke CLS-fejl i ${forsoeg} forsøg:\n` + (r.stdout || '').slice(-600));
console.log('ok - mc-sider ved 375 (lys+mørk) har CLS under 0,05' + (forsoeg > 1 ? ` (efter ${forsoeg} forsøg)` : ''));
