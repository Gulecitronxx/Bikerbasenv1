/* w9-marketplace: galleriets aktive miniature. classList.toggle med en undefined force FLIPPER klassen,
   så alle miniaturer blev .active (orange ramme). Udtrykket skal altid være en ægte boolean. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const kilde = fs.readFileSync(path.join(__dirname, 'annonce.js'), 'utf8');

test('renderGallery giver toggle en boolean (!!) som force', () => {
  const linje = kilde.split(/\r?\n/).find(l => l.includes(".gallery-thumbs button').forEach"));
  assert.ok(linje, 'linjen findes');
  assert.match(linje, /classList\.toggle\('active', !!\(/);
});

test('toggle med !!(undefined) fjerner klassen i stedet for at flippe den', () => {
  const sat = new Set(['active']);
  const toggle = (k, force) => { if (force === undefined) { sat.has(k) ? sat.delete(k) : sat.add(k); } else if (force) sat.add(k); else sat.delete(k); };
  const dataset = {};            // en almindelig miniature uden data-more og med anden indeks
  const idx = 0;
  toggle('active', !!(Number(dataset.thumb) === idx + 1 || (dataset.more && idx >= 5)));
  assert.equal(sat.has('active'), false);
});
