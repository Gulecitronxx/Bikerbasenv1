/* Levende lagertal på maerker.html (V5).

   Mærkeoversigten er forrenderet statisk markup: tallene (og "Flere mærker") er dem, lageret havde, da siden blev bygget. Mellem to byg
   går de i stykker — en sælger opretter en annonce på et mærke, siden ikke har en side for (Zero), og søgningen finder den
   (?brands=Zero), mens oversigten stadig siger "ingen annoncer lige nu". V4-Critic fandt det (P2-4).

   Her hentes lageret EFTER sidens første maling (på load + tomgang), med præcis de samme scripts som de andre sider bruger
   (js/supabase-config.js, supabase-api.js, backend-bridge.js — samme normalisering, samme dubletregler, samme tal som forsiden og
   søgningen). Scriptene står ikke i maerker.html: oversigten er ellers ren statisk side uden Supabase-kald, og en besøgende, der kun
   skal bladre i mærkerne, skal ikke betale for dem før efter første maling. Gemmer brugeren data (Save-Data), hentes intet.

   Hvad der opdateres, når lageret er hentet HELT (Store.harHeleLageret() — et halvt svar ville ligne en sandhed):
   - tal på flisernes og A–Z-rækkernes mærker, hvis de afviger fra bygget
   - et mærke UDEN side, som har fået annoncer (typisk en pille under "Flere mærker"): flyttes til "Nyt siden sidste opdatering" som
     et rigtigt link til søgningen med mærket valgt
   - "Flere mærker (N)", "Søg blandt alle N annoncer"
   Fejler hentningen, står det byggede uændret. Intet gættes, intet opfindes, ingen sider oprettes: kun REGISTREREDE mærker tælles
   (BrandRegistry.erKendt) — et fritekst-mærke fra "Andet mærke" i opret-annonce kommer aldrig herind. */
(function () {
  'use strict';
  if (!document.getElementById('mk-az-liste') && !document.querySelector('.mk-flere-sektion')) return;
  var egetScript = document.currentScript;
  var version = '';
  try { var m = String((egetScript && egetScript.src) || '').match(/[?&](v=[^&#]+)/); if (m) version = '?' + m[1]; } catch (e) { /* ingen version */ }

  var SCRIPTS = ['js/supabase-config.js', 'js/supabase-api.js', 'js/maaling.js', 'js/backend-bridge.js'];

  function indlaes(src) {
    return new Promise(function (ok, fejl) {
      var s = document.createElement('script');
      s.src = src + version;
      s.async = false;
      s.onload = ok;
      s.onerror = function () { fejl(new Error('kunne ikke hente ' + src)); };
      document.head.appendChild(s);
    });
  }

  function antalTekst(n) { return n.toLocaleString('da-DK') + (n === 1 ? ' annonce' : ' annoncer'); }

  /* Ren: { slug: antal } for REGISTREREDE mærker. Slug-nøglen er den samme som generatorens (to stavemåder = ét mærke). */
  function taelPrMaerke(alle) {
    var tal = {};
    (alle || []).forEach(function (l) {
      if (!l || !BrandRegistry.erKendt(l.brand)) return;
      var s = BrandRegistry.slug(l.brand);
      tal[s] = (tal[s] || 0) + 1;
    });
    return tal;
  }

  function slugFraHref(a) {
    var m = /^maerke-([a-z0-9-]+)\.html/.exec(a.getAttribute('href') || '');
    return m ? m[1] : null;
  }

  /* Opdaterer siden ud fra { slug: antal } og samlet antal. Returnerer antal ændringer (testes i browseren). */
  function opdater(tal, samlet) {
    var aendret = 0;
    var findes = {};

    document.querySelectorAll('a.mk-brandtile').forEach(function (a) {
      var s = slugFraHref(a); if (!s) return;
      findes[s] = true;
      var n = tal[s] || 0;
      var el = a.querySelector('.mk-brandtile-n'); if (!el) return;
      var ny = n ? antalTekst(n) : 'Ingen annoncer lige nu';
      if (el.textContent !== ny) { el.textContent = ny; aendret++; }
    });
    document.querySelectorAll('#mk-az-liste li a').forEach(function (a) {
      var s = slugFraHref(a); if (!s) return;
      findes[s] = true;
      var n = tal[s] || 0;
      var el = a.querySelector('.mk-az-n'); if (!el) return;
      var ny = String(n);
      if (el.textContent !== ny) { el.textContent = ny; aendret++; }
      if (!n) a.title = 'Ingen annoncer lige nu'; else a.removeAttribute('title');
    });

    /* Mærker uden side, som nu har annoncer. */
    var nyListe = document.querySelector('[data-mk-nye-liste]');
    var nyBoks = document.querySelector('[data-mk-nye]');
    if (nyListe && nyBoks) {
      Object.keys(tal).forEach(function (s) {
        if (!tal[s] || findes[s]) return;
        if (nyListe.querySelector('[data-mk-pille="' + s + '"]')) return;
        var post = BrandRegistry.fraSlug(s); if (!post) return;
        var pille = document.querySelector('.mk-flere:not(.mk-flere-links) li[data-mk-pille="' + s + '"]');
        var li = document.createElement('li');
        li.setAttribute('data-mk-pille', s);
        li.setAttribute('data-mk-navn', post.navn);
        li.setAttribute('data-mk-soeg', pille ? pille.getAttribute('data-mk-soeg') : [post.navn, post.slug].concat(post.aliaser).join('|'));
        var a = document.createElement('a');
        a.href = 'soegning.html?brands=' + encodeURIComponent(post.navn);
        a.textContent = post.navn + ' · ' + antalTekst(tal[s]);
        li.appendChild(a);
        nyListe.appendChild(li);
        if (pille) pille.remove();
        aendret++;
      });
      nyBoks.hidden = !nyListe.querySelector('li');
      document.querySelectorAll('.mk-flere:not(.mk-flere-links)').forEach(function (ul) { ul.hidden = !ul.querySelector('li:not([hidden])'); });
    }
    var flere = document.querySelectorAll('.mk-flere:not(.mk-flere-links) li').length;
    document.querySelectorAll('[data-mk-flere-n]').forEach(function (el) {
      var ny = String(flere);
      if (el.textContent !== ny) { el.textContent = ny; aendret++; }
    });
    if (samlet != null) {
      document.querySelectorAll('[data-mk-alle]').forEach(function (el) {
        var ny = samlet.toLocaleString('da-DK');
        if (el.textContent !== ny) { el.textContent = ny; aendret++; }
      });
    }
    if (aendret) { try { window.dispatchEvent(new Event('mk-lager-opdateret')); } catch (e) { /* ældre browser */ } }
    return aendret;
  }

  window.MaerkerLager = { taelPrMaerke: taelPrMaerke, opdater: opdater };

  function kor() {
    var kaede = SCRIPTS.reduce(function (p, src) { return p.then(function () { return indlaes(src); }); }, Promise.resolve());
    return kaede.then(function () {
      /* Broen tegner et "Lageret kunne ikke hentes"-banner, når hentningen fejler. Det passer til sider, der VISER annoncer. Her er hentningen
         kun en opdatering af tal, der allerede står i HTML'en, så en fejl må ikke blive til et banner: det byggede står uændret. */
      window.meldDataafbrud = function () {};
      return backendReady();
    }).then(function () {
      if (typeof Store.harHeleLageret === 'function' && !Store.harHeleLageret()) return;
      /* Lokalt ligger der demoannoncer i lageret (SHOW_DEMO_DATA); de findes ikke i drift og tæller ikke med — som i js/maerke.js. */
      var demoIder = {};
      (typeof LISTINGS !== 'undefined' ? LISTINGS : []).forEach(function (l) { demoIder[String(l.id)] = true; });
      var alle = Store.getAllListings().filter(function (l) { return !demoIder[String(l.id)]; });
      if (!alle.length) return;   // et tomt svar er ikke et lager: lad det byggede stå
      opdater(taelPrMaerke(alle), alle.length);
    }).catch(function (e) { try { console.warn('Mærketal blev ikke opdateret:', e && e.message); } catch (x) { /* intet */ } });
  }

  function planlaeg() {
    var c = navigator.connection;
    if (c && c.saveData) return;
    var start = function () { kor(); };
    if (window.requestIdleCallback) requestIdleCallback(start, { timeout: 3000 }); else setTimeout(start, 800);
  }
  if (document.readyState === 'complete') planlaeg(); else window.addEventListener('load', planlaeg);
})();
