/* w9-marketplace runde 2: galleri-tastatur, brødkrumme tilbage til søgningen, ærlig fejltilstand, 48 hk-tekst. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const læs = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const annonce = læs('annonce.js'), search = læs('search.js'), components = læs('components.js');

test('galleri: fokuserbar gruppe, piletaster, Home/End og aria-live-tæller', () => {
  assert.match(annonce, /id="an-galleri" role="group"/);
  assert.match(annonce, /tabindex="0"/);
  for (const k of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) assert.ok(annonce.includes(`'${k}'`), k);
  assert.match(annonce, /id="gallery-counter" role="status" aria-live="polite"/);
});

test('brødkrumme "Motorcykler" genbruger bb_srp_position og kræver samme annonce-id', () => {
  assert.match(annonce, /sessionStorage\.getItem\('bb_srp_position'\)/);
  assert.match(annonce, /String\(gemt\.id\) === String\(l\.id\)/);
  assert.match(annonce, /soegHref = 'soegning\.html'/);
});

/* W14 (bevidst ændring): strækningen af sidste kort (an-strak) gav kort med 200 px tomt rum og er fjernet. I stedet har kolonnerne en fast
   komposition (kørekort i midten; "Handl trygt" + "Det bør du tjekke" i sidekolonnen) og ender naturligt. Browsermålingen står i w14-annonce.test.js. */
test('annoncesiden balancerer kolonner uden at strække kort', () => {
  assert.match(annonce, /function anBalancerKolonner/);
  assert.ok(!annonce.includes("classList.add('an-strak')"));
  assert.ok(annonce.includes('kol[1].appendChild(kk)'));
  assert.equal(annonce.split('anBalancerKolonner();').length - 1, 2, 'kaldt i begge renderere');
});

test('lagerUaktuelt: ingen levende annoncer + fejlet/tomt svar = uaktuelt', () => {
  const m = search.match(/function lagerUaktuelt\(\)\{[\s\S]*?\n\}/);
  assert.ok(m, 'funktionen findes');
  const kør = (status, egne, eksterne) => new Function('window', m[0] + '; return lagerUaktuelt();')(
    { DATA_STATUS: status, REMOTE_LISTINGS: egne, EXTERNAL_LISTINGS: eksterne });
  assert.equal(kør({ egne: 'fejlet', eksterne: 'fejlet' }, [], []), true);
  assert.equal(kør({ egne: 'ok', eksterne: 'ok' }, [], []), true);
  assert.equal(kør({ egne: 'ok', eksterne: 'fejlet' }, [], [{}]), false, 'delvis fejl: stadig noget levende');
  assert.equal(kør({ egne: 'ok', eksterne: 'ok' }, [{}], [{}]), false);
  assert.equal(kør({ egne: 'sprunget-over', eksterne: 'sprunget-over' }, [], []), false, 'ingen backend: ikke en fejl');
});

test('48-49 hk: "kan være afrundet" og ikke en påstand om kilderne', () => {
  assert.match(components, /så et oplyst 48 kan være afrundet/);
  assert.doesNotMatch(components, /kilderne runder det op til 48/);
});

test('info-båndet samler kilder, bekræftelse og sorteringsregel og beholder id\'erne', () => {
  const html = læs('../soegning.html');
  const band = html.match(/<div class="so-infoband"[\s\S]*?<\/div>/);
  assert.ok(band);
  for (const id of ['results-mix', 'frisk-note', 'sortering-note']) assert.ok(band[0].includes(`id="${id}"`), id);
});
