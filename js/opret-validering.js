/* Valideringsregler for opret-annonce — ÉT sted for grænserne.

   Før stod grænserne tre steder, og de var uenige: hjælpeteksten sagde
   "1900–2027", feltet havde min=1950 max=2026, og koden tillod 1900–2027 men
   intet loft på effekt (9999 og -3 slap igennem og indgår i kørekortvurderingen).
   Nu er tabellen herunder den eneste kilde: opret-annonce.js bruger den både
   til at afvise værdier og til at sætte min/max/step på felterne.

   Ren logik uden DOM, så den kan testes i node (js/opret-validering.test.js). */
(function (root) {
  'use strict';

  var MAX_BESKRIVELSE = 4000; // databasen tillader 5000 (supabase/008_haerdning.sql)

  /* id: feltets id i opret-annonce.html. nr: true = heltal skal gives.
     min/max kan være en funktion af indeværende år (modelår = næste år). */
  var REGLER = {
    'f-year':     { navn: 'Årgang', enhed: '', min: 1900, max: function (aar) { return aar + 1; }, tekst: function (r) { return 'Årgang skal være et helt år mellem ' + r.min + ' og ' + r.max + '.'; } },
    'f-km':       { navn: 'Km-stand', enhed: 'km', min: 0, max: function () { return 500000; }, tekst: function () { return 'Kilometerstanden skal være et helt tal mellem 0 og 500.000 km.'; } },
    'f-ccm':      { navn: 'Motorstørrelse', enhed: 'ccm', min: 1, max: function () { return 3000; }, tekst: function () { return 'Motorstørrelsen skal være et helt tal mellem 1 og 3.000 ccm.'; } },
    'f-power':    { navn: 'Effekt', enhed: 'hk', min: 1, max: function () { return 300; }, tekst: function () { return 'Effekten skal være et helt tal mellem 1 og 300 hk — eller lad feltet stå tomt.'; } },
    'f-price':    { navn: 'Pris', enhed: 'kr.', min: 1, max: function () { return 5000000; }, tekst: function () { return 'Prisen skal være et helt beløb mellem 1 og 5.000.000 kr.'; } },
    'f-ejere':    { navn: 'Antal ejere', enhed: '', min: 1, max: function () { return 99; }, tekst: function () { return 'Antal ejere skal være et helt tal mellem 1 og 99 — eller lad feltet stå tomt.'; } },
    'f-synsaar':  { navn: 'Sidste syn', enhed: '', min: 1980, max: function (aar) { return aar; }, tekst: function (r) { return 'Sidste syn skal være et årstal mellem ' + r.min + ' og ' + r.max + ' — eller lad feltet stå tomt.'; } },
    'f-daek':     { navn: 'Dæk skiftet', enhed: '', min: 1990, max: function (aar) { return aar; }, tekst: function (r) { return 'Dæk skiftet skal være et årstal mellem ' + r.min + ' og ' + r.max + ' — eller lad feltet stå tomt.'; } }
  };

  /* Grænser for ét felt i et givent år: { min, max }. */
  function graenser(id, aar) {
    var r = REGLER[id];
    if (!r) return null;
    return { min: r.min, max: r.max(aar) };
  }

  /* Returnerer null hvis værdien er i orden (eller tom — tomt tjekkes af
     "påkrævet", ikke her), ellers en dansk fejltekst. */
  function validerTal(id, raa, aar) {
    var r = REGLER[id];
    if (!r) return null;
    var tekst = raa == null ? '' : String(raa).trim();
    if (tekst === '') return null;
    // Danske tal: "12.500" og "12 500" accepteres ikke som bare "12" — sæt dem selv.
    if (!/^-?\d+(\.\d+)?$/.test(tekst)) return r.tekst({ min: r.min, max: r.max(aar) });
    var v = Number(tekst);
    if (!isFinite(v) || Math.floor(v) !== v) return r.tekst({ min: r.min, max: r.max(aar) });
    var g = { min: r.min, max: r.max(aar) };
    if (v < g.min || v > g.max) return r.tekst(g);
    return null;
  }

  function validerBeskrivelse(raa) {
    var n = String(raa == null ? '' : raa).length;
    if (n > MAX_BESKRIVELSE) {
      return 'Beskrivelsen er ' + (n - MAX_BESKRIVELSE).toLocaleString('da-DK') + ' tegn for lang — der er plads til ' + MAX_BESKRIVELSE.toLocaleString('da-DK') + '.';
    }
    return null;
  }

  /* Hvilke felter hører til hvilket trin (kun dem, der har talregler). */
  var TRIN_FELTER = {
    1: ['f-year', 'f-km', 'f-ccm', 'f-power', 'f-ejere', 'f-synsaar', 'f-daek'],
    2: ['f-price']
  };

  /* Validerer et helt trin ud fra en funktion hent(id) -> rå tekst.
     Returnerer en liste af { id, besked } i feltrækkefølge. */
  function validerTrin(trin, hent, aar) {
    var fejl = [];
    (TRIN_FELTER[trin] || []).forEach(function (id) {
      var besked = validerTal(id, hent(id), aar);
      if (besked) fejl.push({ id: id, besked: besked });
    });
    if (trin === 2) {
      var b = validerBeskrivelse(hent('f-desc'));
      if (b) fejl.push({ id: 'f-desc', besked: b });
    }
    return fejl;
  }

  var api = {
    REGLER: REGLER, TRIN_FELTER: TRIN_FELTER, MAX_BESKRIVELSE: MAX_BESKRIVELSE,
    graenser: graenser, validerTal: validerTal, validerBeskrivelse: validerBeskrivelse, validerTrin: validerTrin
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OpretValidering = api;
})(typeof window !== 'undefined' ? window : globalThis);
