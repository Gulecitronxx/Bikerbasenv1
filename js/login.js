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
    tekst: 'Log ind for at se visninger, telefonvisninger og status på dine annoncer.',
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
  tekst: 'Log ind for at se sælgerens navn og de kontaktoplysninger, sælgeren har oplyst. Det beskytter både køber og sælger.',
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

/* Telefonnummeret er valgfrit, men står det der, skal det ligne et nummer: tal, mellemrum, bindestreg og
   evt. +landekode, mindst 8 cifre (danske numre er 8 cifre; udenlandske er længere). Bogstaver og
   tomme strenge af tegnsætning afvises i stedet for at havne i profilen. */
function telefonOK(v){
  const s = String(v == null ? '' : v).trim();
  if (!s) return true;
  if (!/^\+?[\d\s-]+$/.test(s)) return false;
  const cifre = s.replace(/\D/g, '');
  return cifre.length >= 8 && cifre.length <= 15;
}

/* syncSessionToStore() kan kaste (netværket væk lige efter login). Så er brugeren stadig logget ind hos
   backend, men Store kender ikke sessionen — sig det i stedet for en uhåndteret fejl. */
async function synkSession(){
  try { await syncSessionToStore(); return true; }
  catch (err){
    authError('Du er logget ind, men vi kunne ikke hente din profil. Genindlæs siden og prøv igen.');
    return false;
  }
}

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
    document.getElementById('auth-head').insertAdjacentElement('afterend', el);
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
  const { error } = await sikkert(() => db.resend({ email }));
  resendUnderway = false;
  if (error){ authError(daError(error.message, error)); return; }
  authError('Bekræftelsesmailen er sendt igen. Tjek indbakken — og spamfilteret, hvis den ikke er der inden et kvarter.');
}

/* daError() og netværksgenkendelsen ligger i js/login-fejl.js (testet i
   js/login-fejl.test.js). */

/* Et kald mod backend kan KASTE (TypeError: Failed to fetch) i stedet for at
   returnere { error } — så fanger vi det her og giver kalderen samme form.
   F-013: brugeren skal aldrig se den rå browsertekst. */
async function sikkert(fn){
  try { return await fn(); }
  catch (err){ return { data: null, error: err || new Error('Failed to fetch') }; }
}

function setLoading(btn, loading, label){
  if (btn.dataset.pil === undefined) btn.dataset.pil = btn.querySelector('.lg-arrow') ? '1' : '';
  btn.disabled = loading;
  btn.setAttribute('aria-busy', loading ? 'true' : 'false');
  btn.textContent = loading ? 'Vent…' : label;
  if (!loading && btn.dataset.pil){
    const pil = document.createElement('span');
    pil.className = 'lg-arrow';
    pil.setAttribute('aria-hidden', 'true');
    pil.innerHTML = (typeof Icon !== 'undefined' && Icon.arrowRight) || '';
    btn.appendChild(pil);
  }
}

/* Vis/skjul adgangskode. Knappen er en rigtig <button> med aria-pressed og
   skiftende navn, så skærmlæser og tastatur får det samme som musen. */
const OEJE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
const OEJE_AF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.2A9.6 9.6 0 0 1 12 5c6 0 9.5 7 9.5 7a15.6 15.6 0 0 1-3.2 4.1M6.5 6.6A15.4 15.4 0 0 0 2.5 12s3.5 7 9.5 7a9.4 9.4 0 0 0 4-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
function koblAdgangskodeOeje(){
  document.querySelectorAll('[data-pw-toggle]').forEach(knap => {
    const felt = document.getElementById(knap.dataset.pwToggle);
    if (!felt) return;
    const tegn = (vist) => {
      felt.type = vist ? 'text' : 'password';
      knap.setAttribute('aria-pressed', vist ? 'true' : 'false');
      knap.setAttribute('aria-label', vist ? 'Skjul adgangskode' : 'Vis adgangskode');
      knap.innerHTML = vist ? OEJE_AF : OEJE;
    };
    tegn(false);
    knap.addEventListener('click', () => tegn(felt.type === 'password'));
  });
}

/* Tilstanden (log ind / opret) står som data-lgmode på <html>, så CSS kan vise
   de rigtige tekster. login.html sætter i forvejen data-authtab="register" i
   første chunk, når man kommer fra opret-annonce; den tager over indtil
   brugeren selv vælger. */
function saetTilstand(tilstand){
  document.documentElement.setAttribute('data-lgmode', tilstand);
}

/* Viser trin 2 af "glemt kode": brugeren klikkede linket i mailen og er
   landet her igen med en midlertidig "recovery"-session. Alt andet på siden
   lukkes, så det eneste, man kan gøre, er at sætte en ny adgangskode. */
function showNewPasswordStep(){
  authError('');
  document.getElementById('auth-head').style.display = 'none';
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
  document.getElementById('verify-info-icon').innerHTML = Icon.info;

  // Brandpanelets ikoner og illustration. Findes kun på login-siden, så
  // valgfrit hvis markup'en skulle mangle.
  document.querySelectorAll('#auth-hero-benefits [data-benefit]').forEach(el => {
    el.innerHTML = Icon[el.dataset.benefit] || '';
  });
  document.querySelectorAll('[data-strip]').forEach(el => {
    el.innerHTML = Icon[el.dataset.strip] || '';
  });
  document.querySelectorAll('.lg-arrow').forEach(el => { el.innerHTML = Icon.arrowRight || ''; });
  koblAdgangskodeOeje();
  saetTilstand(document.documentElement.getAttribute('data-authtab') === 'register' ? 'register' : 'login');

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
    btn.addEventListener('click', (e) => {
      authError('');
      /* login.html sætter data-authtab på <html> i første HTML-chunk, så den
         rigtige fane males med det samme (uden det hoppede kortet 0,245 i
         CLS). Reglerne bruger !important for at slå markuppens inline
         display, og de skal derfor slippe taget i det sekund brugeren selv
         vælger — ellers kan man ikke komme tilbage til login-fanen. */
      document.documentElement.removeAttribute('data-authtab');
      saetTilstand(btn.dataset.authTab === 'register' ? 'register' : 'login');
      document.getElementById('login-form').style.display = btn.dataset.authTab === 'login' ? '' : 'none';
      document.getElementById('register-form').style.display = btn.dataset.authTab === 'register' ? '' : 'none';
      document.getElementById('verify-step').style.display = 'none';
      document.getElementById('forgot-step').style.display = 'none';
      document.getElementById('auth-head').style.display = '';
      document.getElementById('auth-primary-extras').style.display = '';
      // Kun når brugeren selv klikker: flyt fokus til det første felt, så
      // tastatur og skærmlæser lander i den formular, der netop blev vist.
      if (e.isTrusted){
        const foerste = document.querySelector(btn.dataset.authTab === 'register' ? '#reg-name' : '#login-email');
        foerste?.focus({ preventScroll: false });
      }
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

  /* Udløbet/brugt link fra mailen: Supabase sender #error=access_denied&error_code=otp_expired.
     Vis en venlig besked og åbn "glemt kode", så man kan bede om et nyt link. */
  if (/error_code=otp_expired|error=access_denied/.test(location.hash + location.search)){
    document.getElementById('forgot-password-btn').click();
    authError('Linket er udløbet eller allerede brugt. Skriv din e-mail, så sender vi et nyt.');
  }

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
    const { error } = await sikkert(() => db.resetPasswordForEmail(email, redirectTo));
    setLoading(btn, false, 'Send nulstillingslink');
    if (error){ authError(daError(error.message, error, 'nulstil')); return; }

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
    const { error } = await sikkert(() => db.updatePassword(password));
    setLoading(btn, false, 'Gem ny adgangskode');
    if (error){ authError(daError(error.message, error)); return; }

    if (!(await synkSession())) return;
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
      /* Ingen opdigtet identitet og ingen opdigtede bekræftelser: en lokal session har kun den e-mail,
         brugeren selv skrev. */
      Store.setUser({ name: email.split('@')[0] || 'Bruger', email, isDealer: false, verified: false,
        emailVerified: false, phoneVerified: false, mitIdVerified: false });
      toast('Du er nu logget ind (lokalt)');
      setTimeout(redirectAfterAuth, 500);
      return;
    }

    setLoading(btn, true, 'Log ind');
    const { error } = await sikkert(() => db.signIn({ email, password }));
    setLoading(btn, false, 'Log ind');
    if (!error && typeof Maaling !== 'undefined') Maaling.login('email');
    if (error){
      // Den eneste af de her fejl, brugeren ikke selv kan rette ved at prøve
      // igen. Uden knappen her kunne man hverken logge ind (ubekræftet) eller
      // oprette på ny (e-mailen findes allerede) — kun sidde fast, hvis
      // linket i mailen aldrig blev klikket, eller mailen aldrig kom frem.
      const ubekraeftet = (error.message || '').toLowerCase().includes('email not confirmed');
      authError(daError(error.message, error), ubekraeftet ? email : null);
      return;
    }

    if (!(await synkSession())) return;
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
    if (!telefonOK(phone)){ authError('Telefonnummeret ser forkert ud. Skriv kun tal (mindst 8 cifre), eller lad feltet stå tomt.'); return; }
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
    const { data, error } = await sikkert(() => db.signUp({ email, password, name, phone, isDealer, company, cvr }));
    setLoading(btn, false, 'Fortsæt');
    if (error){ authError(daError(error.message, error)); return; }
    /* Med e-mailbekræftelse slået til svarer Supabase 200 med identities:[]
       for en e-mail, der allerede har en profil (mod opremsning af brugere).
       Så er der IKKE sendt nogen bekræftelsesmail — sig det ærligt. */
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0){
      authError('E-mailen findes måske allerede. Prøv at logge ind, eller nulstil din adgangskode under "Glemt din adgangskode?".');
      return;
    }
    if (typeof Maaling !== 'undefined') Maaling.oprettet('email', isDealer);

    // Med e-mailbekræftelse slået til findes brugeren, men har ingen session endnu.
    const needsConfirm = !data?.session;
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
      if (!(await synkSession())) return;
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
});
