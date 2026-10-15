/* Fejltekster til login/opret-konto. Ren funktion uden DOM, så den kan testes
   i node (js/login-fejl.test.js) og bruges som global i browseren.

   Supabase-fejl er på engelsk; de almindelige oversættes. Koderne er dem
   Supabase Auth selv dokumenterer (supabase.com/docs/guides/auth/debugging/
   error-codes) — efterprøvet der i august 2026, ikke gættet.

   F-013: en afbrudt forbindelse gav den rå browser-tekst "Failed to fetch"
   (Safari: "Load failed", Firefox: "NetworkError when attempting to fetch
   resource"). Brugeren kan intet bruge den til. Vi genkender den og siger,
   hvad der er galt, og hvad man kan gøre. */
(function (global) {
  const NETVAERK_TEKST = 'Vi kunne ikke få forbindelse. Tjek din internetforbindelse, og prøv igen om lidt.';

  /* Accepterer enten en Error/AuthError eller en ren tekst. */
  function erNetvaerksfejl(fejl) {
    if (!fejl) return false;
    const navn = String(fejl.name || '');
    const m = String(typeof fejl === 'string' ? fejl : (fejl.message || '')).toLowerCase();
    if (navn === 'AuthRetryableFetchError') return true;
    if (fejl.status === 0) return true;
    return m.includes('failed to fetch')
      || m.includes('load failed')
      || m.includes('networkerror')
      || m.includes('network request failed')
      || m.includes('fetch failed')
      || m.includes('network error')
      || m.includes('err_internet_disconnected')
      || m.includes('timeout') || m.includes('timed out');
  }

  /* fejl: valgfrit hele fejlobjektet (giver navn/status), message: teksten. */
  function daError(message, fejl, kontekst) {
    const raa = (fejl && typeof fejl === 'object') ? fejl : { message };
    if (erNetvaerksfejl(raa) || erNetvaerksfejl(message)) return NETVAERK_TEKST;
    const m = (message || '').toLowerCase();
    if (m.includes('invalid login credentials')) return 'Forkert e-mail eller adgangskode.';
    if (m.includes('email not confirmed')) return 'Din e-mail er ikke bekræftet endnu. Tjek din indbakke for bekræftelseslinket.';
    if (m.includes('user already registered') || m.includes('already registered') || m.includes('already exists'))
      return 'Der findes allerede en profil med den e-mail. Prøv at logge ind i stedet.';
    if (m.includes('password should be at least')) return 'Adgangskoden skal være mindst 6 tegn.';
    if (m.includes('unable to validate email') || m.includes('test domains') || (m.includes('invalid') && m.includes('email')))
      return 'E-mailadressen ser ikke gyldig ud.';
    /* Mailgrænsen og forsøgsgrænsen er ikke det samme, og forskellen betyder
       noget for brugeren. Supabases indbyggede mailtjeneste sender som
       standard kun 2 bekræftelsesmails i timen; bliver man bedt om at "vente
       et øjeblik", prøver man igen efter et halvt minut, fejler igen og tror
       sitet er i stykker. Sig hvor længe det drejer sig om — og at profilen
       sandsynligvis allerede ER oprettet, så man skal logge ind, ikke oprette
       en ny. */
    if (kontekst === 'nulstil' && (m.includes('rate limit') || m.includes('for security purposes') || m.includes('too many')))
      return 'Vi kan ikke sende flere mails lige nu (der er en grænse). Vent lidt, og prøv igen.';
    if (m.includes('email rate limit') || m.includes('over_email_send_rate_limit'))
      return 'Vi kan ikke sende flere bekræftelsesmails lige nu (der er en grænse pr. time). '
           + 'Er din profil allerede oprettet, så prøv at logge ind i stedet — ellers vent op til en time.';
    if (m.includes('for security purposes') || m.includes('rate limit') || m.includes('too many'))
      return 'For mange forsøg på kort tid. Vent et par minutter, og prøv igen.';
    /* Supabases indbyggede mailtjeneste sender KUN til adresser i projektets
       Team-liste, når der ikke er sat en rigtig SMTP-udbyder op (se
       dashboardtjeklisten i work/DECISIONS.md). signUp()/resend() fejler ikke
       nødvendigvis her — kontoen kan sagtens være oprettet — men mailen
       forsvinder tavst. Sig det, i stedet for at lade brugeren tro fejlen er hans. */
    if (m.includes('not authorized') || m.includes('error sending') || m.includes('sending confirmation') || m.includes('sending recovery'))
      return 'Mailen kunne ikke sendes lige nu. Prøv "Send igen" om lidt, eller skriv til os, hvis det gentager sig.';
    if (m.includes('sign') && (m.includes('disabled') || m.includes('not allowed')))
      return 'Den funktion er lukket for nye brugere lige nu. Prøv igen senere.';
    /* Fanger fx et styrkekrav ("weak_password"), som ikke nævner "at least" og
       derfor springer reglen ovenfor over. */
    if (m.includes('password')) return 'Adgangskoden blev afvist. Prøv en længere eller mere sammensat adgangskode.';
    /* Resten er stadig engelsk fra serveren. Vis aldrig en rå, ikke-dansk
       tekst som den er — sig i stedet, at noget gik galt. */
    return 'Noget gik galt. Prøv igen om lidt.';
  }

  const api = { daError, erNetvaerksfejl, NETVAERK_TEKST };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.LoginFejl = api;
  global.daError = daError;
})(typeof window !== 'undefined' ? window : globalThis);
