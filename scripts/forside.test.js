/* Tests for forsiden og det fælles sidehoved (referencebillede 1).

   Ingen DOM-parser i repoet (nul devDependencies), så testene læser filerne som tekst. De låser det,
   der har været gået i stykker tidligere eller let går i stykker næste gang nogen rører headeren:

   - alle håndskrevne sider har SAMME header som index.html (scripts/synk-header.js)
   - hvert menupunkt peger på en side, der findes — og kun på sider, der findes
   - js/home.js leder kun efter id'er, der står i index.html (en omdøbt sektion giver ellers en tavs
     TypeError midt i opbygningen, og resten af forsiden forbliver tom)
   - hvert data-icon i index.html findes i js/icons.js
   - ingen hårdkodede tal i forsidens tællelinjer (CLAUDE.md/DESIGN_DNA: tal beregnes fra lageret)
   - generatorernes skrivemål i index.html (mærkelisten, facet-linkene) findes stadig */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const læs = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const index = læs('index.html');
const home = læs('js/home.js');

test('alle sider har samme header som index.html', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'synk-header.js'), '--tjek'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test('hovednavigationen peger kun på sider, der findes', () => {
  const nav = index.match(/<nav class="main-nav"[\s\S]*?<\/nav>/)[0];
  const drawer = index.match(/<div class="mobile-drawer-panel"[\s\S]*?<\/div>\n<\/div>/)[0];
  for (const html of [nav, drawer]){
    const hrefs = [...html.matchAll(/href="([^"#?]+\.html)(?:\?[^"]*)?"/g)].map(m => m[1]);
    assert.ok(hrefs.length >= 4, 'menuen skal have links');
    for (const h of hrefs) assert.ok(fs.existsSync(path.join(ROOT, h)), `${h} findes ikke`);
  }
  for (const side of ['soegning.html', 'maerker.html', 'koerekort-a2.html', 'om-bikerbasen.html']){
    assert.ok(nav.includes(`href="${side}"`), `hovednavigationen skal linke til ${side}`);
  }
  assert.ok(nav.includes('href="guides.html"'), 'guides.html findes nu og skal være i hovednavigationen');
  assert.ok(!/Viden/.test(nav), 'ingen menupunkter til sider, der ikke findes');
});

test('login-pladsen, favoritpladsen og menuknappen er stadig koblet til components.js', () => {
  for (const hook of ['data-auth-slot', 'data-auth-slot-icon', 'data-auth-slot-mobile', 'data-fav-count', 'data-fav-count-mobile', 'mobile-menu-btn', 'mobile-drawer', 'theme-toggle']){
    assert.ok(index.includes(hook), `headeren mangler ${hook}`);
  }
});

test('js/home.js leder kun efter id\'er, der findes i index.html', () => {
  const ider = new Set([...index.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  const brugt = [...home.matchAll(/getElementById\('([^']+)'\)/g)].map(m => m[1]);
  assert.ok(brugt.length > 10);
  for (const id of new Set(brugt)) assert.ok(ider.has(id), `home.js bruger #${id}, men index.html har ingen`);
  for (const id of [...home.matchAll(/\['([a-z-]+(?:','[a-z-]+)+)'\]/g)].flatMap(m => m[1].split("','"))){
    assert.ok(ider.has(id), `home.js bruger #${id}, men index.html har ingen`);
  }
});

test('hvert data-icon i index.html findes i js/icons.js', () => {
  const ikoner = new Set([...læs('js/icons.js').matchAll(/^  ([a-zA-Z0-9]+): `/gm)].map(m => m[1]));
  const brugt = [...index.matchAll(/data-icon="([^"]+)"/g)].map(m => m[1]);
  assert.ok(brugt.length > 10);
  for (const navn of brugt) assert.ok(ikoner.has(navn), `ikonet "${navn}" findes ikke`);
});

test('forsidens tal står ikke i HTML\'en — de tegnes af js/home.js fra lageret', () => {
  // Alle tælleelementer er tomme i markup; js/home.js fylder dem.
  for (const id of ['hero-count-hint', 'featured-sub', 'types-sub']){
    assert.match(index, new RegExp(`id="${id}"[^>]*></p>`), `#${id} skal være tom i markup`);
  }
  assert.match(index, /id="udvalg-kort"><\/div>/);
  assert.match(index, /id="category-tiles"><\/div>/);
  assert.ok(!/12\.842|120\.000|3x flere|svartid|autoriseret forhandler|verificerede forhandlere/i.test(index),
    'opdigtede tal og påstande fra referencebilledet må ikke stå på siden');
  assert.ok(!/<span class="tal-n" data-antal>\s*\d/.test(index));
});

test('generatorernes skrivemål i index.html findes stadig', () => {
  assert.match(index, /<div class="[a-z -]+" id="brand-cloud" data-maerkesider="[^"]*">/, 'scripts/build-brand-pages.js skriver mærkelisten hertil');
  assert.ok(index.includes('<!-- facet-links:start'), 'scripts/build-facet-pages.js skriver facet-linkene hertil');
  assert.ok(index.includes('<!-- facet-links:end -->'));
  assert.ok(index.includes('<!-- meta:start') && index.includes('<!-- jsonld:start'));
});

test('forsiden har præcis én h1 og beholder sin overskrift', () => {
  assert.equal((index.match(/<h1[ >]/g) || []).length, 1);
  assert.match(index, /<h1 id="hero-titel">Søg motorcykler efter det kørekort, du har<\/h1>/);
});

test('kun sande løfter: tillidsrækken og sælg-panelet siger ikke mere end siden kan stå inde for', () => {
  const trust = index.match(/<ul class="trust-row">[\s\S]*?<\/ul>/)[0];
  assert.match(trust, /Kilden står på hvert kort/);
  assert.match(trust, /Ikke oplyst/);
  assert.ok(!/verificer|svindel|tjekker|kontrollerer/i.test(trust), 'ingen "vi tjekker/fjerner svindel"-påstand');
  const saelg = index.match(/<aside class="saelg-panel"[\s\S]*?<\/aside>/)[0];
  assert.ok(!/tusindvis|nem og sikker/i.test(saelg));
});

test('undermenuen kan afvises med Escape (WCAG 1.4.13) — JS sætter data-lukket, CSS læser det', () => {
  assert.match(læs('js/components.js'), /e\.key !== 'Escape'[\s\S]{0,200}setAttribute\('data-lukket'/);
  assert.match(læs('css/styles.css'), /\.nav-item\[data-lukket\] \.nav-sub\{ display:none; \}/);
});

test('forsiden slutter kompakt: én "Hvorfor"-sektion, de lange forklaringer i <details>, ingen slut-CTA', () => {
  assert.equal((index.match(/class="hvorfor"/g) || []).length, 1);
  assert.match(index, /<details class="hvorfor-mere">[\s\S]*Skal du købe[\s\S]*Skal du sælge[\s\S]*<\/details>/);
  assert.ok(!/slut-cta|problem-section|loesning-section/.test(index));
});

test('søgekortet er lavt: ingen fast disclaimer-fodlinje, forbeholdet vises først ved valgt kørekort', () => {
  assert.match(index, /<p class="kk-hint" id="hs-kk-hint" role="status" hidden><\/p>/);
  assert.ok(!/sk-fod/.test(index));
});
