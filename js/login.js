function redirectAfterAuth(){
  const back = new URLSearchParams(window.location.search).get('redirect');
  // Kun relative stier på vores eget site. Ellers kunne et link som
  // login.html?redirect=https://... sende brugeren videre til en falsk side
  // lige efter de har logget ind — og det ville se helt legitimt ud.
  const sikker = back && /^[\w-]+\.html(\?[^#]*)?$/.test(back) ? back : null;
  window.location.href = sikker || 'mine-annoncer.html';
}

/* Login-siden ved præcis, hvad brugeren var på vej til — det står i
   ?redirect= — men sagde det ikke. Man trykkede "Opret annonce", blev
   sendt hertil, og mødte "Velkommen til Bikerbasen". Konteksten var tabt,
   og fanen stod på "Log ind", selv om den der vil sælge sin motorcykel
   lige så ofte er en ny bruger.

   Teksterne slås op i en hvidliste og sættes med textContent. Værdien i
   ?redirect= kommer fra adresselinjen og er dermed angriberstyret — den
   må hverken ende i markup eller vælge tekst frit. */
const AUTH_KONTEKST = {
  'opret-annonce.html': {
    titel: 'Sælg din motorcykel',
    tekst: 'Opret en profil eller log ind for at lægge billeder på og udgive. Din kladde er gemt på denne enhed. Gratis for private.',
    fane: 'register',
  },
  'mine-annoncer.html': {
    titel: 'Dine annoncer og favoritter',
    tekst: 'Log ind for at se de annoncer, du har gemt, og dem du selv har oprettet.',
  },
  'dashboard.html': {
    titel: 'Dit overblik',
    tekst: 'Log ind for at se visninger, henvendelser og status på dine annoncer.',
  },
  'forhandler.html': {
    titel: 'Se forhandlerens profil',
    tekst: 'Forhandlerens profil er kun synlig for indloggede brugere. Det beskytter både køber og sælger.',
  },
};
/* O2-6: "kontaktoplysninger" var et loefte, ingen indlogget nogensinde fik
   indfriet (phone er null paa alt fra databasen). Kun det, der sker. */
const AUTH_ANNONCE = {
  titel: 'Kontakt sælgeren',
  tekst: 'Log ind for at se sælgerens navn og markere, at du vil i kontakt. Det beskytter både køber og sælger.',
};

function anvendAuthKontekst(){
  const back = new URLSearchParams(window.location.search).get('redirect') || '';
  // Samme mønsterkrav som redirectAfterAuth: kun en relativ .html-sti.
  if (!/^[\w-]+\.html(\?[^#]*)?$/.test(back)) return;
  const fil = back.split('?')[0];
  const k = AUTH_KONTEKST[fil] || (/^annonce(-.+)?\.html$/.test(fil) ? AUTH_ANNONCE : null);
  if (!k) return;

  document.getElementById('auth-title').textContent = k.titel;
  document.getElementById('auth-subtitle').textContent = k.tekst;
  if (k.fane === 'register') document.querySelector('[data-auth-tab="register"]')?.click();
}

let pendingUser = null;

/* resendEmail: valgfri. Er den sat, får fejlboksen en "Send igen"-knap under
   teksten — brugt til "email not confirmed", den ene fejl her, man ikke kan
   rette ved selv at prøve igen (se resendConfirmation nedenfor). */
function authError(msg, resendEmail){
  let el = document.getElementById('auth-error');
  if (!el){
    el = document.createElement('div');
    el.id = 'auth-error';
    el.className = 'auth-error';
    el.setAttribute('role', 'alert');
    document.querySelector('.auth-tabs').insertAdjacentElement('afterend', el);
  }
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';

  if (msg && resendEmail){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'link-btn';
    btn.style.cssText = 'display:block; margin-top:8px;';
    btn.textContent = 'Send bekræftelsesmailen igen';
    btn.addEventListener('click', () => resendConfirmation(resendEmail, btn));
    el.appendChild(btn);
  }
}

/* Beskyttet mod dobbeltklik: resend() rammer den samme timelige mailgrænse
   som selve signUp(), og to kald i træk giver kun en forvirrende fejl. */
let resendUnderway = false;
async function resendConfirmation(email, btn){
  if (resendUnderway || !email) return;
  resendUnderway = true;
  btn.disabled = true;
  btn.textContent = 'Sender…';
  const { error } = await db.resend({ email });
  resendUnderway = false;
  if (error){ authError(daError(error.message)); return; }
  authError('Bekræftelsesmailen er sendt igen. Tjek indbakken — og spamfilteret, hvis den ikke er der inden et kvarter.');
}

/* Supabase-fejl er på engelsk; oversæt de almindelige. Koderne er dem
   Supabase Auth selv dokumenterer (supabase.com/docs/guides/auth/debugging/
   error-codes) — efterprøvet der i august 2026, ikke gættet. */
function daError(message){
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
  return message || 'Noget gik galt. Prøv igen.';
}

function setLoading(btn, loading, label){
  btn.disabled = loading;
  btn.textContent = loading ? 'Vent…' : label;
}

/* Viser trin 2 af "glemt kode": brugeren klikkede linket i mailen og er
   landet her igen med en midlertidig "recovery"-session. Alt andet på siden
   lukkes, så det eneste, man kan gøre, er at sætte en ny adgangskode. */
function showNewPasswordStep(){
  authError('');
  document.querySelector('.auth-tabs').style.display = 'none';
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'none';
  document.getElementById('verify-step').style.display = 'none';
  document.getElementById('forgot-step').style.display = 'none';
  document.getElementById('auth-primary-extras').style.display = 'none';
  document.getElementById('new-password-step').style.display = '';
}

document.addEventListener('DOMContentLoaded', async () => {
  /* SKAL kobles på FØR backendReady() rører klienten. Supabase læser
     recovery-tokenet fra adressen og sender PASSWORD_RECOVERY som en
     almindelig auth-hændelse, i det øjeblik klienten oprettes — en lytter,
     der kommer for sent på banen, overhører den, og brugeren lander bare på
     en helt almindelig login-side uden at ane, at trin 2 fandtes. */
  /* 23.08.2026: to huller i nulstillingen lukket.
     1) Linket fra mailen giver en RIGTIG session, naar SDK'et laeser tokenet
        fra adressen. backendReady() synkroniserer den til Store, og grenen
        "er man allerede logget ind, saa videre" nedenfor sendte brugeren
        vaek fra siden — trin 2 blev vist og forsvandt igen. Nu husker vi, at
        vi er i nulstilling (hash med type=recovery foer SDK'et fjerner den,
        hændelsen PASSWORD_RECOVERY, eller ?nulstil=1), og springer den gren
        over.
     2) Staar login.html ikke paa Supabases Redirect URLs-liste, lander
        linket paa forsiden. js/backend-bridge.js sender derfor en
        PASSWORD_RECOVERY paa enhver anden side herhen med ?nulstil=1 —
        sessionen er allerede gemt, saa trin 2 virker. */
  let nulstilling = /type=recovery/.test(location.hash)
    || new URLSearchParams(location.search).get('nulstil') === '1';
  db.raw?.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY'){ nulstilling = true; showNewPasswordStep(); }
  });

  renderHeader(null);
  document.getElementById('google-icon').innerHTML = Icon.google;
  document.getElementById('verify-info-icon').innerHTML = Icon.info;

  // Brandpanelets ikoner og illustration. Findes kun på login-siden, så
  // valgfrit hvis markup'en skulle mangle.
  const benefitIcons = { heart: Icon.heart, bell: Icon.bell, mail: Icon.mail, plus: Icon.plus };
  document.querySelectorAll('#auth-hero-benefits [data-benefit]').forEach(el => {
    el.innerHTML = benefitIcons[el.dataset.benefit] || '';
  });

  // Er man allerede logget ind, så videre med det samme. En PASSWORD_RECOVERY-
  // session rammer ikke denne gren: backend-bridge.js' globale lytter
  // synkroniserer kun Store ved SIGNED_IN/TOKEN_REFRESHED, ikke ved recovery,
  // så showNewPasswordStep() ovenfor bliver stående uden at blive omgjort her.
  await backendReady();
  if (nulstilling){
    showNewPasswordStep();
    if (!(db.enabled && Store.getUser()?.remote)){
      authError('Linket er udløbet eller allerede brugt. Bed om et nyt under "Glemt din adgangskode?".');
    }
  } else if (db.enabled && Store.getUser()?.remote) { redirectAfterAuth(); return; }

  // Uden backend er login stadig en attrap — sig det ærligt frem for at lade som om.
  if (!db.enabled){
    authError('Backend er ikke konfigureret — login gemmes kun lokalt i denne browser.');
  }

  document.querySelectorAll('[data-auth-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      authError('');
      /* login.html sætter data-authtab på <html> i første HTML-chunk, så den
         rigtige fane males med det samme (uden det hoppede kortet 0,245 i
         CLS). Reglerne bruger !important for at slå markuppens inline
         display, og de skal derfor slippe taget i det sekund brugeren selv
         vælger — ellers kan man ikke komme tilbage til login-fanen. */
      document.documentElement.removeAttribute('data-authtab');
      document.querySelectorAll('[data-auth-tab]').forEach(b => b.classList.toggle('active', b === btn));
      document.getElementById('login-form').style.display = btn.dataset.authTab === 'login' ? '' : 'none';
      document.getElementById('register-form').style.display = btn.dataset.authTab === 'register' ? '' : 'none';
      document.getElementById('verify-step').style.display = 'none';
      document.getElementById('forgot-step').style.display = 'none';
      document.getElementById('auth-primary-extras').style.display = '';
    });
  });

  /* ---------- Glemt adgangskode (trin 1: bed om linket) ---------- */
  document.getElementById('forgot-password-btn').addEventListener('click', () => {
    authError('');
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('verify-step').style.display = 'none';
    document.getElementById('auth-primary-extras').style.display = 'none';
    document.getElementById('forgot-step').style.display = '';
    // Genbrug e-mailen, hvis den allerede er skrevet i login-feltet.
    const email = document.getElementById('login-email').value.trim();
    if (email) document.getElementById('forgot-email').value = email;
    // Nulstil UI'et, hvis trinnet blev vist én gang før i denne session.
    document.getElementById('forgot-intro').textContent =
      'Skriv din e-mail, så sender vi et link til at vælge en ny adgangskode.';
    document.getElementById('forgot-fields').style.display = '';
    document.getElementById('forgot-submit').style.display = '';
  });

  document.getElementById('forgot-cancel').addEventListener('click', () => {
    document.querySelector('[data-auth-tab="login"]').click();
  });

  document.getElementById('forgot-submit').addEventListener('click', async () => {
    authError('');
    const email = document.getElementById('forgot-email').value.trim();
    if (!email){ authError('Skriv din e-mail.'); return; }
    if (!db.enabled){
      authError('Backend er ikke konfigureret — nulstilling af adgangskode kræver rigtig backend.');
      return;
    }
    const btn = document.getElementById('forgot-submit');
    setLoading(btn, true, 'Send nulstillingslink');
    // redirectTo peger tilbage på DENNE side (ikke en ny) — se markeringen i
    // login.html ved #forgot-step. Adressen skal stå i projektets
    // Auth → URL Configuration → Redirect URLs, ellers afviser Supabase linket.
    const redirectTo = location.origin + location.pathname;
    const { error } = await db.resetPasswordForEmail(email, redirectTo);
    setLoading(btn, false, 'Send nulstillingslink');
    if (error){ authError(daError(error.message)); return; }

    // Supabase svarer succes uanset om e-mailen findes i systemet — det
    // gentager vi her i stedet for at modsige det med en anden besked, for
    // ellers kunne formularen bruges til at afsløre, hvem der har en profil.
    document.getElementById('forgot-intro').textContent =
      'Har vi en profil med den e-mail, er der nu sendt et link til at vælge en ny adgangskode. '
      + 'Tjek indbakken — og spamfilteret, hvis den ikke er der inden et kvarter.';
    document.getElementById('forgot-fields').style.display = 'none';
    document.getElementById('forgot-submit').style.display = 'none';
  });

  /* ---------- Glemt adgangskode (trin 2: den nye adgangskode) ----------
     Feltet vises kun af showNewPasswordStep(), som venter på PASSWORD_
     RECOVERY-hændelsen registreret øverst i denne funktion. */
  document.getElementById('new-password-submit').addEventListener('click', async () => {
    authError('');
    const password = document.getElementById('new-password').value;
    if (!password || password.length < 6){ authError('Adgangskoden skal være mindst 6 tegn.'); return; }
    const btn = document.getElementById('new-password-submit');
    setLoading(btn, true, 'Gem ny adgangskode');
    const { error } = await db.updatePassword(password);
    setLoading(btn, false, 'Gem ny adgangskode');
    if (error){ authError(daError(error.message)); return; }

    await syncSessionToStore();
    toast('Din adgangskode er ændret');
    setTimeout(redirectAfterAuth, 400);
  });

  // Efter fanerne er koblet på — anvendAuthKontekst kan klikke på "Opret
  // profil", og det skal virke.
  anvendAuthKontekst();

  document.getElementById('reg-dealer').addEventListener('change', (e) => {
    document.getElementById('kyc-fields').classList.toggle('show', e.target.checked);
  });

  /* ---------- Log ind ---------- */
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    authError('');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = e.target.querySelector('button[type="submit"]');

    if (!db.enabled){
      Store.setUser({ name: 'Mikkel Jensen', email, isDealer: false, verified: true,
        emailVerified: true, phoneVerified: true, mitIdVerified: true });
      toast('Du er nu logget ind (lokalt)');
      setTimeout(redirectAfterAuth, 500);
      return;
    }

    setLoading(btn, true, 'Log ind');
    const { error } = await db.signIn({ email, password });
    setLoading(btn, false, 'Log ind');
    if (!error && typeof Maaling !== 'undefined') Maaling.login('email');
    if (error){
      // Den eneste af de her fejl, brugeren ikke selv kan rette ved at prøve
      // igen. Uden knappen her kunne man hverken logge ind (ubekræftet) eller
      // oprette på ny (e-mailen findes allerede) — kun sidde fast, hvis
      // linket i mailen aldrig blev klikket, eller mailen aldrig kom frem.
      const ubekraeftet = (error.message || '').toLowerCase().includes('email not confirmed');
      authError(daError(error.message), ubekraeftet ? email : null);
      return;
    }

    await syncSessionToStore();
    toast('Du er nu logget ind');
    setTimeout(redirectAfterAuth, 400);
  });

  /* ---------- Opret profil ---------- */
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    authError('');
    const isDealer = document.getElementById('reg-dealer').checked;
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value;
    const btn = e.target.querySelector('button[type="submit"]');

    // O1-5: telefonnummer er valgfrit — det vises ikke for nogen endnu.
    let cvr = '', company = '';
    if (isDealer){
      cvr = document.getElementById('reg-cvr').value.trim();
      company = document.getElementById('reg-company').value.trim();
      if (!company){ authError('Udfyld virksomhedsnavn.'); return; }
      if (!/^\d{8}$/.test(cvr)){ authError('CVR-nummeret skal være 8 cifre, uden mellemrum eller bindestreg.'); return; }
      /* cvrKontrolOK() (js/components.js) er den samme modulus-11-kontrol,
         sælgerprofilen og annoncesiden allerede bruger på det SAMME
         CVR-felt. Uden den her accepterede formularen ethvert 8-cifret tal —
         Runde 2's kritiker regnede 95854101 efter i hånden og fandt, at det
         ikke bestod. Otte cifre er ikke det samme som et gyldigt CVR-nummer. */
      if (!cvrKontrolOK(cvr)){
        authError('CVR-nummeret ser forkert ud — kontrolcifferet stemmer ikke. Tjek de otte cifre.');
        return;
      }
    }

    if (!db.enabled){
      pendingUser = { name: name || 'Ny bruger', email, phone, isDealer, cvr, company,
        emailVerified: false, phoneVerified: false, mitIdVerified: false, cvrVerified: false };
      showVerifyStep(isDealer);
      return;
    }

    setLoading(btn, true, 'Fortsæt');
    const { data, error } = await db.signUp({ email, password, name, phone, isDealer, company, cvr });
    setLoading(btn, false, 'Fortsæt');
    if (error){ authError(daError(error.message)); return; }
    if (typeof Maaling !== 'undefined') Maaling.oprettet('email', isDealer);

    // Med e-mailbekræftelse slået til findes brugeren, men har ingen session endnu.
    const needsConfirm = !data.session;
    pendingUser = { name, email, phone, isDealer, cvr, company, needsConfirm };
    showVerifyStep(isDealer, needsConfirm);
  });

  /* isDealer bruges ikke laengere: CVR-raekken er fjernet sammen med de to
     andre attrap-verificeringer. Parameteren bliver staaende, saa kaldene
     ikke skal roeres, naar rigtig verificering kommer tilbage. */
  function showVerifyStep(isDealer, needsConfirm){
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('auth-primary-extras').style.display = 'none';
    document.getElementById('verify-step').style.display = '';
    const intro = document.getElementById('verify-intro');
    const finish = document.getElementById('finish-registration');
    const resendBtn = document.getElementById('verify-resend');
    if (needsConfirm){
      intro.textContent = 'Vi har sendt dig en bekræftelsesmail. Klik på linket i mailen, og log derefter ind. '
        + 'Kommer den ikke inden for et kvarter, så tjek dit spamfilter.';
      finish.textContent = 'Gå til log ind';
      resendBtn.style.display = '';
      resendBtn.disabled = false;
      resendBtn.textContent = 'Send bekræftelsesmailen igen';
    } else {
      intro.textContent = 'Du er logget ind og klar til at bruge Bikerbasen.';
      finish.textContent = 'Fortsæt';
      resendBtn.style.display = 'none';
    }
  }

  // Ét klik virker for begge de mulige pendingUser'er (lige oprettet, ikke
  // bekræftet endnu) — den anden vej ind (login-fejlen) har sin egen knap i
  // authError(), fordi den ikke deler pendingUser med registreringen.
  document.getElementById('verify-resend').addEventListener('click', function(){
    resendConfirmation(pendingUser?.email, this);
  });

  /* ---------- Verificeringstrin ---------- */
  document.getElementById('finish-registration').addEventListener('click', async () => {
    if (db.enabled){
      if (pendingUser?.needsConfirm){
        // Ingen session før e-mailen er bekræftet — send brugeren til login.
        document.querySelector('[data-auth-tab="login"]').click();
        document.getElementById('login-email').value = pendingUser.email || '';
        authError('Bekræft din e-mail via linket, og log derefter ind.');
        return;
      }
      await syncSessionToStore();
      toast('Din profil er oprettet');
      setTimeout(redirectAfterAuth, 400);
      return;
    }
    pendingUser.emailVerified = true;
    pendingUser.verified = pendingUser.isDealer
      ? (pendingUser.mitIdVerified && pendingUser.cvrVerified)
      : pendingUser.mitIdVerified;
    Store.setUser(pendingUser);
    toast('Din profil er oprettet (lokalt)');
    setTimeout(redirectAfterAuth, 400);
  });

  document.getElementById('google-btn').addEventListener('click', () => {
    authError('Google-login kræver at OAuth aktiveres i Supabase — ikke sat op endnu.');
  });
});
