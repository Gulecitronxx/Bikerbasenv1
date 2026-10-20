/* Hurtigsøg på maerker.html: filtrerer A–Z-listen mens man skriver. Feltet er skjult i HTML'en og vises først her,
   så en bruger uden JavaScript ikke ser et dødt felt (A–Z-listen er statiske links og virker uden). Aliaser ("harley",
   "bmw motorrad") ligger i hver rækkes data-mk-soeg, skrevet af generatoren fra samme manifest som logoerne.

   V5: søgningen finder også mærkerne under "Flere mærker" (kendte mærker uden annoncer lige nu) og mærker, der har fået annoncer
   siden sidste byg (js/maerker-lager.js). Før sagde den "Ingen mærker matcher." for Zero og Vespa, som siden selv kalder kendte. Nu
   står der fx "Zero kender vi, men der er ingen annoncer lige nu", og de matchende mærker vises filtreret under "Flere mærker". */
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
  var flereSektion = document.querySelector('.mk-flere-sektion');

  /* Samme foldning som scripts/slug.js: æ->ae, ø->oe, å->aa, accenter væk; derefter kun bogstaver og tal. */
  function fold(s) {
    return String(s).normalize('NFC').toLowerCase()
      .replace(/ø/g, 'oe').replace(/æ/g, 'ae').replace(/å/g, 'aa')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '');
  }
  function heynd(li) {
    return (li.getAttribute('data-mk-soeg') || '').split('|').map(fold).filter(Boolean);
  }
  function rammer(h, q) { return !q || h.some(function (x) { return x.indexOf(q) !== -1; }); }
  var azHeynd = raekker.map(heynd);

  /* Mærkerne uden annoncer (statiske) og dem, der har fået annoncer siden byg (tilføjes af maerker-lager.js), læses ved hvert tryk,
     så de også virker, hvis de dukker op efter at siden er indlæst. */
  function flereLister() {
    return {
      uden: Array.prototype.slice.call(document.querySelectorAll('.mk-flere:not(.mk-flere-links) li[data-mk-soeg]')),
      nye: Array.prototype.slice.call(document.querySelectorAll('[data-mk-nye-liste] li[data-mk-soeg]')),
    };
  }
  function navn(li) { return li.getAttribute('data-mk-navn') || (li.textContent || '').trim(); }
  function opremsning(navne) {
    if (navne.length === 1) return navne[0];
    return navne.slice(0, -1).join(', ') + ' og ' + navne[navne.length - 1];
  }
  function tilfoejLink(tekst) {
    var a = document.createElement('a');
    a.href = '#mk-flere-h';
    a.textContent = tekst;
    status.appendChild(a);
    status.appendChild(document.createTextNode('.'));
  }

  function filtrer() {
    var q = fold(input.value);
    var azSynlige = 0, sidste = null;
    raekker.forEach(function (li, i) {
      var ok = rammer(azHeynd[i], q);
      li.hidden = !ok;
      if (ok) { azSynlige++; sidste = li; }
    });
    grupper.forEach(function (g) {
      g.hidden = !g.querySelector('li:not([hidden])');
    });

    var f = flereLister();
    var uden = f.uden.filter(function (li) { var ok = rammer(heynd(li), q); li.hidden = !ok; return ok; });
    var nye = f.nye.filter(function (li) { var ok = rammer(heynd(li), q); li.hidden = !ok; return ok; });
    /* En tom liste (alle piller skjult) skal ikke stå som et tomt hul. */
    Array.prototype.forEach.call(document.querySelectorAll('.mk-flere'), function (ul) {
      ul.hidden = !ul.querySelector('li:not([hidden])');
    });
    var medAnnoncer = azSynlige + nye.length;

    if (status) {
      status.textContent = '';
      if (!q) { /* tom */ }
      else if (medAnnoncer === 0 && uden.length === 0) status.textContent = 'Ingen mærker matcher.';
      else if (medAnnoncer === 0) {
        var navne = uden.map(navn);
        status.appendChild(document.createTextNode((navne.length <= 3 ? opremsning(navne) : navne.length + ' mærker') +
          ' kender vi, men der er ingen annoncer lige nu. '));
        if (flereSektion) tilfoejLink('Se under Flere mærker');
      } else if (uden.length === 0) {
        status.textContent = medAnnoncer === 1 ? '1 mærke matcher.' : medAnnoncer + ' mærker matcher.';
      } else {
        status.appendChild(document.createTextNode(medAnnoncer + (medAnnoncer === 1 ? ' mærke' : ' mærker') + ' med annoncer og ' +
          uden.length + ' uden annoncer lige nu. '));
        if (flereSektion) tilfoejLink('Se dem under Flere mærker');
      }
    }
    return medAnnoncer === 1 && azSynlige === 1 ? sidste : null;
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
  /* maerker-lager.js kalder denne, når der er kommet nye mærker med annoncer, så et igangværende søgeord stadig passer. */
  window.addEventListener('mk-lager-opdateret', function () { if (input.value) filtrer(); });
  boks.hidden = false;
})();
