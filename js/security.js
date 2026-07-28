/* ============ Klientside-sikkerhed ============
   GitHub Pages tillader ikke egne HTTP-headers, så de beskyttelser der KAN
   udtrykkes i markup/JS ligger her og i <meta>-tags i hver side.

   Klikjacking: X-Frame-Options kan ikke sættes uden server, og CSP'ens
   frame-ancestors ignoreres i meta-tags. Derfor denne framebuster: opdager
   siden at den kører i en fremmed iframe, bryder den ud. Det stopper de
   gængse overlay-angreb, hvor et usynligt Bikerbasen lægges over en falsk
   "klik her"-side. */
(function () {
  try {
    if (window.top !== window.self) {
      // Kør kun ud af rammen hvis den ligger på et andet domæne.
      let fremmed = true;
      try { fremmed = window.top.location.origin !== window.location.origin; }
      catch (e) { /* cross-origin: adgang nægtet = fremmed ramme */ }
      if (fremmed) window.top.location = window.self.location.href;
    }
  } catch (e) { /* aldrig lad beskyttelsen selv vælte siden */ }
})();
