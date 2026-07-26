function redirectAfterAuth(){
  const back = new URLSearchParams(window.location.search).get('redirect');
  window.location.href = back || 'mine-annoncer.html';
}

let pendingUser = null;

function markVerifyDone(rowId, btnId){
  const row = document.getElementById(rowId);
  row.classList.add('done');
  document.getElementById(btnId).outerHTML = `<span class="verify-status-done">${Icon.checkCircle}Bekræftet</span>`;
}

document.addEventListener('DOMContentLoaded', () => {
  renderHeader(null);
  document.getElementById('google-icon').innerHTML = Icon.google;
  document.getElementById('verify-phone-icon').innerHTML = Icon.phone;
  document.getElementById('verify-mitid-icon').innerHTML = Icon.fingerprint;
  document.getElementById('verify-cvr-icon').innerHTML = Icon.shieldCheck;

  document.querySelectorAll('[data-auth-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-auth-tab]').forEach(b => b.classList.toggle('active', b === btn));
      document.getElementById('login-form').style.display = btn.dataset.authTab === 'login' ? '' : 'none';
      document.getElementById('register-form').style.display = btn.dataset.authTab === 'register' ? '' : 'none';
      document.getElementById('verify-step').style.display = 'none';
      document.getElementById('auth-primary-extras').style.display = '';
    });
  });

  document.getElementById('reg-dealer').addEventListener('change', (e) => {
    document.getElementById('kyc-fields').classList.toggle('show', e.target.checked);
  });

  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    Store.setUser({
      name: 'Mikkel Jensen', email: document.getElementById('login-email').value, isDealer: false,
      verified: true, emailVerified: true, phoneVerified: true, mitIdVerified: true,
    });
    toast('Du er nu logget ind');
    setTimeout(redirectAfterAuth, 600);
  });

  document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const isDealer = document.getElementById('reg-dealer').checked;
    const phone = document.getElementById('reg-phone').value.trim();
    if (!phone){ toast('Udfyld venligst telefonnummer'); return; }
    let cvr = '', company = '';
    if (isDealer){
      cvr = document.getElementById('reg-cvr').value.trim();
      company = document.getElementById('reg-company').value.trim();
      if (!/^\d{8}$/.test(cvr) || !company){
        toast('Udfyld venligst virksomhedsnavn og et gyldigt 8-cifret CVR-nummer');
        return;
      }
    }
    pendingUser = {
      name: document.getElementById('reg-name').value.trim() || 'Ny bruger',
      email: document.getElementById('reg-email').value,
      phone, isDealer, cvr, company,
      emailVerified: false, phoneVerified: false, mitIdVerified: false, cvrVerified: false,
    };
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('auth-primary-extras').style.display = 'none';
    document.getElementById('verify-cvr-row').style.display = isDealer ? '' : 'none';
    document.getElementById('verify-step').style.display = '';
  });

  document.getElementById('verify-phone-btn').addEventListener('click', () => {
    document.getElementById('phone-code-area').style.display = '';
    toast('Kode sendt via SMS (demo)');
  });
  document.getElementById('confirm-phone-code').addEventListener('click', () => {
    document.getElementById('phone-code-area').style.display = 'none';
    markVerifyDone('verify-phone-row', 'verify-phone-btn');
    pendingUser.phoneVerified = true;
    toast('Telefonnummer bekræftet');
  });

  document.getElementById('verify-mitid-btn').addEventListener('click', (e) => {
    e.target.disabled = true;
    e.target.textContent = 'Bekræfter...';
    setTimeout(() => {
      markVerifyDone('verify-mitid-row', 'verify-mitid-btn');
      pendingUser.mitIdVerified = true;
      toast('Identitet bekræftet med MitID (simuleret)');
    }, 900);
  });

  document.getElementById('verify-cvr-btn').addEventListener('click', () => {
    markVerifyDone('verify-cvr-row', 'verify-cvr-btn');
    pendingUser.cvrVerified = true;
    toast('CVR-nummer bekræftet');
  });

  document.getElementById('finish-registration').addEventListener('click', () => {
    pendingUser.emailVerified = true;
    pendingUser.verified = pendingUser.isDealer
      ? (pendingUser.mitIdVerified && pendingUser.cvrVerified)
      : pendingUser.mitIdVerified;
    Store.setUser(pendingUser);
    toast('Din profil er oprettet');
    setTimeout(redirectAfterAuth, 600);
  });

  document.getElementById('google-btn').addEventListener('click', () => {
    Store.setUser({
      name: 'Mikkel Jensen', email: 'mikkel@gmail.com', isDealer: false,
      verified: false, emailVerified: true, phoneVerified: false, mitIdVerified: false,
    });
    toast('Logget ind med Google');
    setTimeout(redirectAfterAuth, 600);
  });
});
