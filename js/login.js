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
    tekst: 'Opret en profil eller log ind, så gemmer vi din annonce undervejs. Det er gratis for private.',
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
    titel: 'Se sælgerens kontaktoplysninger',
    tekst: 'Telefonnummer og profil er kun synlige for indloggede brugere. Det beskytter både køber og sælger.',
  },
};
const AUTH_ANNONCE = {
  titel: 'Kontakt sælgeren',
  tekst: 'Log ind for at se sælgerens navn og kontaktoplysninger. Det beskytter både køber og sælger.',
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

function authError(msg){
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
}

/* Supabase-fejl er på engelsk; oversæt de almindelige. */
function daError(message){
  const m = (message || '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'Forkert e-mail eller adgangskode.';
  if (m.includes('email not confirmed')) return 'Din e-mail er ikke bekræftet endnu. Tjek din indbakke for bekræftelseslinket.';
  if (m.includes('user already registered')) return 'Der findes allerede en profil med den e-mail. Prøv at logge ind i stedet.';
  if (m.includes('password should be at least')) return 'Adgangskoden skal være mindst 6 tegn.';
  if (m.includes('unable to validate email')) return 'E-mailadressen ser ikke gyldig ud.';
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
  return message || 'Noget gik galt. Prøv igen.';
}

function setLoading(btn, loading, label){
  btn.disabled = loading;
  btn.textContent = loading ? 'Vent…' : label;
}

document.addEventListener('DOMContentLoaded', async () => {
  renderHeader(null);
  document.getElementById('google-icon').innerHTML = Icon.google;
  document.getElementById('verify-info-icon').innerHTML = Icon.info;

  // Brandpanelets ikoner og illustration. Findes kun på login-siden, så
  // valgfrit hvis markup'en skulle mangle.
  const benefitIcons = { heart: Icon.heart, bell: Icon.bell, mail: Icon.mail, plus: Icon.plus };
  document.querySelectorAll('#auth-hero-benefits [data-benefit]').forEach(el => {
    el.innerHTML = benefitIcons[el.dataset.benefit] || '';
  });

  // Er man allerede logget ind, så videre med det samme.
  await backendReady();
  if (db.enabled && Store.getUser()?.remote) { redirectAfterAuth(); return; }

  // Uden backend er login stadig en attrap — sig det ærligt frem for at lade som om.
  if (!db.enabled){
    authError('Backend er ikke konfigureret — login gemmes kun lokalt i denne browser.');
  }

  document.querySelectorAll('[data-auth-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      authError('');
      document.querySelectorAll('[data-auth-tab]').forEach(b => b.classList.toggle('active', b === btn));
      document.getElementById('login-form').style.display = btn.dataset.authTab === 'login' ? '' : 'none';
      document.getElementById('register-form').style.display = btn.dataset.authTab === 'register' ? '' : 'none';
      document.getElementById('verify-step').style.display = 'none';
      document.getElementById('auth-primary-extras').style.display = '';
    });
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
    if (error){ authError(daError(error.message)); return; }

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

    if (!phone){ authError('Udfyld venligst telefonnummer.'); return; }
    let cvr = '', company = '';
    if (isDealer){
      cvr = document.getElementById('reg-cvr').value.trim();
      company = document.getElementById('reg-company').value.trim();
      if (!/^\d{8}$/.test(cvr) || !company){
        authError('Udfyld virksomhedsnavn og et gyldigt 8-cifret CVR-nummer.');
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
    if (needsConfirm){
      intro.textContent = 'Vi har sendt dig en bekræftelsesmail. Klik på linket i mailen, og log derefter ind. '
        + 'Kommer den ikke inden for et kvarter, så tjek dit spamfilter.';
      finish.textContent = 'Gå til log ind';
    } else {
      intro.textContent = 'Du er logget ind og klar til at bruge Bikerbasen.';
      finish.textContent = 'Fortsæt';
    }
  }

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
