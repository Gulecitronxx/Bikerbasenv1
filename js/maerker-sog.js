/* Hurtigsøg på maerker.html: filtrerer A–Z-listen mens man skriver. Feltet er skjult i HTML'en og vises først her,
   så en bruger uden JavaScript ikke ser et dødt felt (A–Z-listen er statiske links og virker uden). Aliaser ("harley",
   "bmw motorrad") ligger i hver rækkes data-mk-soeg, skrevet af generatoren fra samme manifest som logoerne. */
(function () {
  'use strict';
  var boks = document.querySelector('[data-mk-hurtigsoeg]');
  var liste = document.getElementById('mk-az-liste');
  if (!boks || !liste) return;
  var input = boks.querySelector('input');
  var status = boks.querySelector('.mk-hurtigsoeg-status');
  if (!input) return;
  var raekker = Array.prototype.slice.call(liste.querySelectorAll('li[data-mk-soeg]'));
  var grupper = Array.prototype.slice.call(liste.querySelectorAll('.mk-az-gruppe'));

  /* Samme foldning som scripts/slug.js: æ->ae, ø->oe, å->aa, accenter væk; derefter kun bogstaver og tal. */
  function fold(s) {
    return String(s).normalize('NFC').toLowerCase()
      .replace(/ø/g, 'oe').replace(/æ/g, 'ae').replace(/å/g, 'aa')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '');
  }
  var heynd = raekker.map(function (li) {
    return li.getAttribute('data-mk-soeg').split('|').map(fold).filter(Boolean);
  });

  function filtrer() {
    var q = fold(input.value);
    var synlige = 0, sidste = null;
    raekker.forEach(function (li, i) {
      var ok = !q || heynd[i].some(function (h) { return h.indexOf(q) !== -1; });
      li.hidden = !ok;
      if (ok) { synlige++; sidste = li; }
    });
    grupper.forEach(function (g) {
      g.hidden = !g.querySelector('li:not([hidden])');
    });
    if (status) {
      status.textContent = !q ? '' : synlige === 0 ? 'Ingen mærker matcher.' : synlige === 1 ? '1 mærke matcher.' : synlige + ' mærker matcher.';
    }
    return sidste;
  }

  input.addEventListener('input', filtrer);
  input.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter') return;
    var q = fold(input.value);
    if (!q) return;
    var kandidater = raekker.filter(function (li) { return !li.hidden; });
    var a = kandidater.length === 1 ? kandidater[0].querySelector('a') : null;
    if (a) { ev.preventDefault(); window.location.href = a.getAttribute('href'); }
  });
  boks.hidden = false;
})();
