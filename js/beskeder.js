/* ============ Beskeder mellem køber og sælger (V7) ============
   HENTES KUN, når flaget BB_FLAGS.beskeder er sat (js/supabase-config.js: bbIndlaesBeskeder()). Står flaget på
   false, hentes filen aldrig — og annoncesiden viser i stedet en ærlig kontaktbeskrivelse uden formular.

   Hele skrivevejen går gennem databasefunktionerne i supabase/025_beskeder.sql (send_besked, svar_besked,
   bloker_modpart, rapporter_samtale …). Browseren har ingen direkte skriveadgang til tabellerne, og ingen funktion
   svarer med en e-mailadresse eller et telefonnummer. Rate limit, honeypot, linkgrænse og dublet-spærre ligger i
   databasen; reglerne herunder (tegngrænser, linktæller) er den samme regel som i SQL, så brugeren får en dansk
   forklaring FØR et kald, men intet her er beskyttelsen.

   Ren logik (valider, tekster, tid) står øverst og testes i js/v7-besked.test.js; de to flader (formular på
   annoncen, indbakke i Mine annoncer) står nedenunder. Al brugertekst skrives med escapeHTML eller textContent. */

const BESKED_MAX = 1000;
const BESKED_MIN = 2;
const BESKED_MAX_LINKS = 2;

/* ---------- Ren logik ---------- */

/* Samme normalisering som bb_rens_besked() i SQL: ensartede linjeskift, højst én blank linje, trim. */
function beskedRens(t){
  return String(t == null ? '' : t).replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* Samme tælling som bb_antal_links(): forekomster af "http" og "www.". */
function beskedAntalLinks(t){
  const s = String(t == null ? '' : t).toLowerCase();
  return (s.split('http').length - 1) + (s.split('www.').length - 1);
}

/* Returnerer { ok, tekst, antal, fejl }. `fejl` er en dansk forklaring, der siger hvad man skal gøre. */
function beskedValider(raa){
  const tekst = beskedRens(raa);
  const antal = tekst.length;
  if (!antal) return { ok: false, tekst, antal, fejl: 'Skriv en besked, før du sender.' };
  if (antal < BESKED_MIN) return { ok: false, tekst, antal, fejl: 'Beskeden er for kort. Skriv mindst to tegn.' };
  if (antal > BESKED_MAX) return { ok: false, tekst, antal, fejl: `Beskeden er ${antal - BESKED_MAX} tegn for lang. Der er plads til ${BESKED_MAX} tegn.` };
  if (beskedAntalLinks(tekst) > BESKED_MAX_LINKS) return { ok: false, tekst, antal, fejl: 'Beskeden indeholder for mange links. Skriv uden links, eller højst to.' };
  return { ok: true, tekst, antal, fejl: '' };
}

/* Kode fra databasen -> dansk tekst. Ukendt kode får en neutral tekst, aldrig selve koden. */
const BESKED_FEJLTEKSTER = {
  ikke_logget_ind: 'Du er ikke logget ind længere. Log ind igen for at sende beskeden.',
  ikke_verificeret: 'Bekræft din e-mailadresse for at skrive til andre. Vi sendte et bekræftelseslink, da du oprettede din profil.',
  ugyldig_tekst: 'Beskeden skal være mellem 2 og 1000 tegn.',
  for_mange_links: 'Beskeden indeholder for mange links. Skriv uden links, eller højst to.',
  annonce_findes_ikke: 'Annoncen findes ikke længere, så der kan ikke skrives til den.',
  annonce_ikke_aktiv: 'Annoncen er ikke længere til salg, så der kan ikke skrives mere i den.',
  egen_annonce: 'Det er din egen annonce. Du svarer på købernes beskeder under Mine annoncer.',
  blokeret: 'Du kan ikke sende beskeder i denne samtale.',
  for_mange: 'Du har sendt mange beskeder på kort tid. Vent lidt, og prøv igen.',
  for_mange_pr_annonce: 'Du har sendt flere beskeder om den samme annonce, end vi tillader pr. time. Vent lidt, og prøv igen.',
  for_mange_samtaler: 'Du har startet mange nye samtaler i dag. Prøv igen i morgen.',
  dublet: 'Du har lige sendt den samme besked. Afvent svar, eller skriv noget nyt.',
  findes_ikke: 'Samtalen findes ikke.',
  netvaerk: 'Beskeden blev ikke sendt. Det var os eller din forbindelse — din tekst er ikke tabt, så prøv igen.',
  ugyldig_aarsag: 'Vælg en årsag til anmeldelsen.',
  ukendt: 'Det lykkedes ikke. Din tekst er ikke tabt — prøv igen om lidt.',
};
function beskedFejlTekst(kode){
  return BESKED_FEJLTEKSTER[kode] || BESKED_FEJLTEKSTER.ukendt;
}

/* Hvad skal der stå, når en samtale er låst, fordi annoncen ikke længere er aktiv? Tom streng = ikke låst. */
function beskedLaasTekst(annonceStatus, rolle){
  if (!annonceStatus || annonceStatus === 'active') return '';
  if (annonceStatus === 'sold') return 'Annoncen er markeret som solgt. Samtalen kan læses, men der kan ikke skrives mere i den.';
  if (annonceStatus === 'hidden') {
    return rolle === 'saelger'
      ? 'Din annonce er sat på pause. Samtalen kan læses; aktivér annoncen igen for at svare.'
      : 'Sælgeren har sat annoncen på pause. Samtalen kan læses; du kan skrive igen, når annoncen er aktiv.';
  }
  return 'Annoncen er slettet. Samtalen kan stadig læses, men der kan ikke skrives mere i den.';
}

function beskedStatusMaerke(annonceStatus){
  if (annonceStatus === 'sold') return 'Solgt';
  if (annonceStatus === 'hidden') return 'På pause';
  if (annonceStatus === 'slettet') return 'Slettet';
  return '';
}

function beskedBadgeTekst(n){
  n = Number(n) || 0;
  if (n <= 0) return '';
  return n > 9 ? '9+' : String(n);
}

function beskedInitialer(navn){
  const dele = String(navn || '').trim().split(/\s+/).filter(Boolean);
  if (!dele.length) return '?';
  return (dele[0][0] + (dele.length > 1 ? dele[dele.length - 1][0] : '')).toUpperCase();
}

/* "i dag 14.32", "i går 09.10", "12. okt.", "12. okt. 2025". */
function beskedTid(iso, nu){
  const t = new Date(iso || '').getTime();
  if (!t) return '';
  const d = new Date(t), n = new Date(nu == null ? Date.now() : nu);
  const dag = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const forskel = Math.round((dag(n) - dag(d)) / 86400000);
  const ur = d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
  if (forskel === 0) return 'i dag ' + ur;
  if (forskel === 1) return 'i går ' + ur;
  return d.toLocaleDateString('da-DK', d.getFullYear() === n.getFullYear()
    ? { day: 'numeric', month: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}

function beskedModpartNavn(s){
  return (s && s.modpart_navn) || (s && s.rolle === 'saelger' ? 'Køber' : 'Sælger');
}

/* ---------- Databasekald ---------- */

/* Kalder en database-funktion. Transportfejl bliver til { ok:false, kode:'netvaerk' } — aldrig en exception. */
async function beskedKald(navn, args){
  const c = (typeof db !== 'undefined' && db.enabled) ? db.raw : null;
  if (!c) return { ok: false, kode: 'netvaerk' };
  try {
    const { data, error } = await c.rpc(navn, args || {});
    if (error) return { ok: false, kode: 'netvaerk', detalje: error.message };
    return data;
  } catch (e) {
    return { ok: false, kode: 'netvaerk' };
  }
}

const BeskedApi = {
  send: (listingId, tekst, honning) => beskedKald('send_besked', { p_listing: listingId, p_tekst: tekst, p_honning: honning || '' }),
  svar: (samtaleId, tekst) => beskedKald('svar_besked', { p_samtale: samtaleId, p_tekst: tekst }),
  mine: () => beskedKald('mine_samtaler'),
  hent: (samtaleId, markerLaest) => beskedKald('hent_samtale', { p_samtale: samtaleId, p_marker_laest: markerLaest !== false }),
  ulaeste: () => beskedKald('ulaeste_samtaler'),
  bloker: samtaleId => beskedKald('bloker_modpart', { p_samtale: samtaleId }),
  fjernBlokering: samtaleId => beskedKald('fjern_blokering', { p_samtale: samtaleId }),
  rapporter: (samtaleId, aarsag, kommentar) => beskedKald('rapporter_samtale', { p_samtale: samtaleId, p_aarsag: aarsag, p_kommentar: kommentar || '' }),
  hentMail: () => beskedKald('hent_besked_mail'),
  saetMail: til => beskedKald('saet_besked_mail', { p_til: !!til }),
};

/* Opdaterer badgen i headeren og på fanen. Fejl er stille: en badge er en hjælp, ikke en funktion. */
async function beskedOpdaterBadge(){
  const n = await BeskedApi.ulaeste();
  const antal = typeof n === 'number' ? n : 0;
  if (typeof bbSaetBeskedBadge === 'function') bbSaetBeskedBadge(antal);
  return antal;
}

/* Stilarket hentes med modulet (ikke på siderne, hvor flaget er fra). Versionen følger scriptets egen ?v=. */
const BESKED_VERSION = (() => {
  try {
    const s = typeof document !== 'undefined' && document.currentScript && document.currentScript.src;
    return (s && (s.match(/[?&]v=([a-z0-9]+)/) || [])[1]) || '';
  } catch (e) { return ''; }
})();
let _beskedCss = null;
function beskedSikrCss(){
  if (typeof document === 'undefined') return Promise.resolve();
  if (_beskedCss) return _beskedCss;
  _beskedCss = new Promise(res => {
    if (document.querySelector('link[data-besked-css]')) return res();
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'css/p-beskeder.css' + (BESKED_VERSION ? '?v=' + BESKED_VERSION : '');
    l.setAttribute('data-besked-css', '');
    l.onload = () => res();
    l.onerror = () => res();
    setTimeout(res, 2500);   // et stilark, der hænger, må ikke holde formularen tilbage
    document.head.appendChild(l);
  });
  return _beskedCss;
}

/* ============ Flade 1: formularen på annoncen ============ */

const BESKED_STARTERE = [
  'Er motorcyklen stadig til salg?',
  'Kan jeg komme forbi og se den?',
  'Hvad er den laveste pris?',
];

function beskedKladdeNoegle(listingId){ return 'bb_besked_kladde_' + listingId; }
function beskedHentKladde(listingId){ try { return sessionStorage.getItem(beskedKladdeNoegle(listingId)) || ''; } catch (e) { return ''; } }
function beskedGemKladde(listingId, tekst){
  try { if (tekst) sessionStorage.setItem(beskedKladdeNoegle(listingId), tekst); else sessionStorage.removeItem(beskedKladdeNoegle(listingId)); } catch (e) { /* privat tilstand */ }
}

function beskedFormularHTML(){
  const ikon = n => (typeof Icon !== 'undefined' && Icon[n]) || '';
  return `
    <h3 class="besked-h" id="besked-h">Send besked til sælgeren</h3>
    <p class="besked-hint" id="besked-hint">Dit navn vises for sælgeren. Din e-mail og dit telefonnummer deler vi ikke — skriv dem kun i beskeden, hvis du selv vil.</p>
    <form class="besked-form" id="besked-form" novalidate aria-labelledby="besked-h">
      <div class="besked-startere" role="group" aria-label="Forslag til første linje">
        ${BESKED_STARTERE.map(t => `<button type="button" class="besked-starter" data-starter="${escapeHTML(t)}">${escapeHTML(t)}</button>`).join('')}
      </div>
      <label class="besked-label" for="besked-tekst">Din besked</label>
      <textarea class="input besked-felt" id="besked-tekst" name="tekst" rows="4" maxlength="${BESKED_MAX + 200}" aria-describedby="besked-hint besked-taeller besked-fejl" placeholder="Skriv dit spørgsmål til sælgeren"></textarea>
      <div class="besked-honning" aria-hidden="true"><label>Lad dette felt stå tomt<input type="text" name="website" id="besked-website" tabindex="-1" autocomplete="off"></label></div>
      <div class="besked-fod"><span class="besked-taeller" id="besked-taeller">0 / ${BESKED_MAX}</span></div>
      <p class="besked-fejl" id="besked-fejl" role="alert" hidden></p>
      <button type="submit" class="btn btn-primary btn-block" id="besked-send">${ikon('mail')}Send besked</button>
    </form>`;
}

function beskedKvitteringHTML(samtaleId){
  const link = 'mine-annoncer.html?tab=beskeder' + (samtaleId ? '&samtale=' + encodeURIComponent(samtaleId) : '');
  const ikon = (typeof Icon !== 'undefined' && Icon.checkCircle) || '';
  return `
    <div class="besked-ok" role="status">${ikon}<div><b>Beskeden er sendt.</b> Svaret kommer i Mine annoncer under Beskeder.</div></div>
    <a class="btn btn-outline btn-block" href="${link}">Se samtalen</a>`;
}

/* Monterer formularen i `rod` (#besked-kort). Hvis køberen allerede har en samtale om annoncen, vises den i stedet
   for en ny formular. `listing` skal have id. Svarer et objekt med `samtaleId` (hvis kendt) til tests. */
async function beskedMonterFormular(rod, { listing }){
  if (!rod || !listing) return null;
  await beskedSikrCss();
  const findes = await BeskedApi.mine();
  const eksisterende = Array.isArray(findes) ? findes.find(s => s.listing_id === listing.id) : null;
  rod.removeAttribute('aria-busy');
  if (eksisterende){
    rod.classList.add('er-faerdig');
    rod.innerHTML = `
      <h3 class="besked-h">Du har allerede skrevet til sælgeren</h3>
      <p class="besked-hint">Samtalen om denne annonce ligger i Mine annoncer under Beskeder. Her kan du læse sælgerens svar og skrive videre.</p>
      ${eksisterende.sidste_tekst ? `<p class="besked-sidste"><span>${eksisterende.sidste_fra_mig ? 'Din seneste besked' : 'Sælgerens seneste besked'} · ${escapeHTML(beskedTid(eksisterende.sidste_tidspunkt))}</span>${escapeHTML(eksisterende.sidste_tekst)}</p>` : ''}
      <a class="btn btn-primary btn-block" id="besked-aabn" href="mine-annoncer.html?tab=beskeder&amp;samtale=${encodeURIComponent(eksisterende.samtale_id)}">Åbn samtalen</a>`;
    return { samtaleId: eksisterende.samtale_id, eksisterende: true };
  }

  rod.innerHTML = beskedFormularHTML();
  const form = rod.querySelector('#besked-form');
  const felt = rod.querySelector('#besked-tekst');
  const taeller = rod.querySelector('#besked-taeller');
  const fejl = rod.querySelector('#besked-fejl');
  const knap = rod.querySelector('#besked-send');
  const honning = rod.querySelector('#besked-website');
  let sender = false;

  const taelOp = () => {
    const n = beskedRens(felt.value).length;
    taeller.textContent = `${n} / ${BESKED_MAX}`;
    taeller.classList.toggle('er-over', n > BESKED_MAX);
    felt.setAttribute('aria-invalid', n > BESKED_MAX ? 'true' : 'false');
  };
  const visFejl = (tekst, medResend) => {
    fejl.hidden = !tekst;
    fejl.textContent = tekst || '';
    if (tekst && medResend){
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'besked-resend'; b.textContent = 'Send bekræftelseslinket igen';
      b.addEventListener('click', async () => {
        b.disabled = true;
        const email = (typeof Store !== 'undefined' && Store.getUser && Store.getUser() || {}).email;
        const svar = email && db.resend ? await db.resend({ email }) : { error: true };
        b.textContent = svar && svar.error ? 'Linket kunne ikke sendes — prøv igen senere' : 'Linket er sendt — tjek din indbakke';
      });
      fejl.appendChild(document.createTextNode(' '));
      fejl.appendChild(b);
    }
  };

  felt.value = beskedHentKladde(listing.id);
  taelOp();
  felt.addEventListener('input', () => { taelOp(); beskedGemKladde(listing.id, felt.value); if (!fejl.hidden) visFejl(''); });
  rod.querySelectorAll('[data-starter]').forEach(b => b.addEventListener('click', () => {
    felt.value = (felt.value.trim() ? felt.value.replace(/\s+$/, '') + '\n' : '') + b.dataset.starter;
    taelOp(); beskedGemKladde(listing.id, felt.value); felt.focus();
  }));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sender) return;                          // ingen dobbeltsend: ét kald ad gangen
    const v = beskedValider(felt.value);
    if (!v.ok){ visFejl(v.fejl); felt.focus(); return; }
    sender = true;
    knap.disabled = true; knap.setAttribute('aria-busy', 'true'); knap.textContent = 'Sender …';
    felt.readOnly = true;
    visFejl('');
    const svar = await BeskedApi.send(listing.id, v.tekst, honning ? honning.value : '');
    sender = false;
    if (svar && svar.ok === true){
      beskedGemKladde(listing.id, '');
      rod.classList.add('er-faerdig');
      rod.innerHTML = beskedKvitteringHTML(svar.samtale_id);
      rod.querySelector('.besked-ok')?.setAttribute('tabindex', '-1');
      rod.querySelector('.besked-ok')?.focus();
      beskedOpdaterBadge();
      return;
    }
    knap.disabled = false; knap.removeAttribute('aria-busy');
    knap.innerHTML = ((typeof Icon !== 'undefined' && Icon.mail) || '') + 'Send besked';
    felt.readOnly = false;
    const kode = svar && svar.kode;
    visFejl(beskedFejlTekst(kode), kode === 'ikke_verificeret');
    felt.focus();
  });
  return { samtaleId: null, eksisterende: false };
}

/* ============ Flade 2: indbakken i Mine annoncer ============ */

function beskedIndbakke(rod, opts){
  opts = opts || {};
  const ikon = n => (typeof Icon !== 'undefined' && Icon[n]) || '';
  const tilst = { liste: null, fejl: false, aktiv: null, traad: null, traadFejl: false, mail: null, poll: null, sender: false, visAnmeld: false };
  const esc = escapeHTML;

  const setVisning = v => { const b = rod.querySelector('.bsk'); if (b) b.dataset.visning = v; };

  function listeHTML(){
    if (tilst.fejl){
      return `<div class="bsk-tom" role="alert"><p><b>Vi kunne ikke hente dine beskeder.</b> Det er ikke ensbetydende med, at du ingen har. Prøv igen om lidt.</p><button type="button" class="btn btn-outline btn-sm" data-handling="proev-liste">Prøv igen</button></div>`;
    }
    if (tilst.liste === null){
      return `<div class="bsk-skelet" aria-hidden="true"><i></i><i></i><i></i></div><p class="sr-only" role="status">Henter dine beskeder</p>`;
    }
    if (!tilst.liste.length){
      return `<div class="bsk-tom">
        <span class="bsk-tom-ikon" aria-hidden="true">${ikon('mail')}</span>
        <h3>Ingen beskeder endnu</h3>
        <p>Når en køber skriver til en af dine annoncer, ligger samtalen her. Skriver du selv til en sælger fra en annonce, finder du den her.</p>
        <a class="btn btn-primary btn-sm" href="soegning.html">Søg motorcykler</a>
      </div>`;
    }
    return `<ul class="bsk-liste">${tilst.liste.map(s => {
      const navn = beskedModpartNavn(s);
      const maerke = beskedStatusMaerke(s.annonce_status);
      const aktiv = s.samtale_id === tilst.aktiv;
      return `<li><button type="button" class="bsk-raekke${aktiv ? ' er-aktiv' : ''}${s.ulaest ? ' er-ulaest' : ''}" data-samtale="${esc(s.samtale_id)}"${aktiv ? ' aria-current="true"' : ''}>
        <span class="bsk-avatar" aria-hidden="true">${esc(beskedInitialer(navn))}</span>
        <span class="bsk-raekke-tekst">
          <span class="bsk-raekke-top"><b>${esc(navn)}</b><time datetime="${esc(s.sidste_tidspunkt)}">${esc(beskedTid(s.sidste_tidspunkt))}</time></span>
          <span class="bsk-raekke-annonce">${esc(s.annonce_titel)}${maerke ? ` <span class="bsk-maerke">${esc(maerke)}</span>` : ''}</span>
          <span class="bsk-raekke-udsnit">${s.sidste_fra_mig ? 'Dig: ' : ''}${esc(s.sidste_tekst || '')}</span>
        </span>
        ${s.ulaest ? '<span class="bsk-prik" role="img" aria-label="Ulæst"></span>' : ''}
      </button></li>`;
    }).join('')}</ul>`;
  }

  function traadHTML(){
    if (!tilst.aktiv){
      return `<div class="bsk-valg"><span class="bsk-tom-ikon" aria-hidden="true">${ikon('mail')}</span><p>Vælg en samtale til venstre for at læse og svare.</p></div>`;
    }
    if (tilst.traadFejl){
      return `<div class="bsk-tom" role="alert"><button type="button" class="bsk-tilbage" data-handling="tilbage" aria-label="Tilbage til samtalerne">${ikon('chevronLeft')}</button><p><b>Samtalen kunne ikke hentes.</b> Prøv igen om lidt.</p><button type="button" class="btn btn-outline btn-sm" data-handling="proev-traad">Prøv igen</button></div>`;
    }
    if (!tilst.traad){
      return `<div class="bsk-skelet" aria-hidden="true"><i></i><i></i></div><p class="sr-only" role="status">Henter samtalen</p>`;
    }
    const s = tilst.traad.samtale, bs = tilst.traad.beskeder;
    const navn = beskedModpartNavn(s);
    const laas = beskedLaasTekst(s.annonce_status, s.rolle);
    const kanSkrive = !laas && !s.blokeret;
    const titelHTML = (s.listing_id && s.annonce_status !== 'slettet')
      ? `<a href="annonce.html?id=${encodeURIComponent(s.listing_id)}">${esc(s.annonce_titel)}</a>` : esc(s.annonce_titel);
    const maerke = beskedStatusMaerke(s.annonce_status);
    const blokTekst = s.blokeret
      ? (s.jeg_har_blokeret ? `Du har blokeret ${esc(navn)}. Ingen af jer kan skrive i samtalen, før du fortryder.` : 'Samtalen er lukket for nye beskeder.')
      : '';
    return `
      <header class="bsk-traadhoved">
        <button type="button" class="bsk-tilbage" data-handling="tilbage" aria-label="Tilbage til samtalerne">${ikon('chevronLeft')}</button>
        <div class="bsk-traadtitel">
          <h3>${titelHTML}${maerke ? ` <span class="bsk-maerke">${esc(maerke)}</span>` : ''}</h3>
          <p>Samtale med <b>${esc(navn)}</b> · du er ${s.rolle === 'saelger' ? 'sælger' : 'køber'}</p>
        </div>
        <details class="bsk-menu">
          <summary aria-label="Flere handlinger"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5.5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="18.5" r="1.8"/></svg></summary>
          <div class="bsk-menu-liste">
            ${s.jeg_har_blokeret
              ? `<button type="button" data-handling="fjern-blok">Fortryd blokering</button>`
              : `<button type="button" data-handling="bloker">Bloker ${esc(navn)}</button>`}
            <button type="button" data-handling="anmeld">Anmeld samtalen</button>
          </div>
        </details>
      </header>
      <p class="bsk-sikkerhed">${ikon('info')}<span>Betal aldrig depositum, før du har set motorcyklen, og del aldrig koder fra MitID eller banken. Virker en besked mistænkelig, så anmeld samtalen.</span></p>
      ${laas ? `<p class="bsk-laas" role="note">${ikon('lock')}<span>${esc(laas)}</span></p>` : ''}
      ${blokTekst ? `<p class="bsk-laas" role="note">${ikon('lock')}<span>${blokTekst}</span></p>` : ''}
      ${tilst.visAnmeld ? anmeldHTML() : ''}
      <div class="bsk-beskeder" role="log" aria-live="polite" aria-label="Beskeder i samtalen" tabindex="0">
        ${bs.map(b => `<div class="bsk-boble ${b.fra_mig ? 'fra-mig' : 'fra-modpart'}"><p>${esc(b.tekst)}</p><time datetime="${esc(b.oprettet)}">${b.fra_mig ? 'Dig' : esc(navn)} · ${esc(beskedTid(b.oprettet))}</time></div>`).join('')}
      </div>
      ${kanSkrive ? `
      <form class="bsk-svar" id="bsk-svar" novalidate>
        <label class="sr-only" for="bsk-svar-tekst">Dit svar</label>
        <textarea class="input besked-felt" id="bsk-svar-tekst" rows="3" maxlength="${BESKED_MAX + 200}" placeholder="Skriv dit svar" aria-describedby="bsk-svar-taeller bsk-svar-fejl"></textarea>
        <div class="besked-fod"><span class="besked-taeller" id="bsk-svar-taeller">0 / ${BESKED_MAX}</span></div>
        <p class="besked-fejl" id="bsk-svar-fejl" role="alert" hidden></p>
        <button type="submit" class="btn btn-primary" id="bsk-svar-send">Send svar</button>
      </form>` : ''}`;
  }

  function anmeldHTML(){
    return `<form class="bsk-anmeld" id="bsk-anmeld" novalidate>
      <h4>Anmeld samtalen</h4>
      <p>Bikerbasen kan læse samtalen, når den er anmeldt. Brug det til svindel eller upassende beskeder.</p>
      <label for="bsk-anmeld-aarsag" class="besked-label">Årsag</label>
      <select class="input" id="bsk-anmeld-aarsag"><option value="svindel">Svindel eller mistænkelig henvendelse</option><option value="upassende">Upassende eller truende indhold</option><option value="andet">Andet</option></select>
      <label for="bsk-anmeld-tekst" class="besked-label">Kommentar (valgfri)</label>
      <textarea class="input besked-felt" id="bsk-anmeld-tekst" rows="2" maxlength="500"></textarea>
      <p class="besked-fejl" id="bsk-anmeld-fejl" role="alert" hidden></p>
      <div class="bsk-anmeld-knapper"><button type="button" class="btn btn-outline btn-sm" data-handling="anmeld-annuller">Annuller</button><button type="submit" class="btn btn-primary btn-sm">Send anmeldelse</button></div>
    </form>`;
  }

  function tegnListe(){
    const liste = rod.querySelector('.bsk-lister-indhold');
    if (liste) liste.innerHTML = listeHTML();
    const antal = rod.querySelector('#bsk-antal');
    if (antal) antal.textContent = tilst.liste ? tilst.liste.length : 0;
  }

  function tegnTraad(){
    const traad = rod.querySelector('.bsk-traad');
    if (!traad) return;
    const aabenMenu = rod.querySelector('.bsk-menu[open]');
    const svarFelt = rod.querySelector('#bsk-svar-tekst');
    const bevar = svarFelt ? svarFelt.value : '';
    const harFokusISvar = svarFelt && document.activeElement === svarFelt;
    traad.innerHTML = traadHTML();
    const nyFelt = rod.querySelector('#bsk-svar-tekst');
    if (nyFelt && bevar){ nyFelt.value = bevar; tellSvar(); if (harFokusISvar) nyFelt.focus(); }
    const log = rod.querySelector('.bsk-beskeder');
    if (log) log.scrollTop = log.scrollHeight;
    if (aabenMenu) rod.querySelector('.bsk-menu')?.setAttribute('open', '');
  }

  function tegn(){ tegnListe(); tegnTraad(); }

  function tellSvar(){
    const f = rod.querySelector('#bsk-svar-tekst'), t = rod.querySelector('#bsk-svar-taeller');
    if (!f || !t) return;
    const n = beskedRens(f.value).length;
    t.textContent = `${n} / ${BESKED_MAX}`;
    t.classList.toggle('er-over', n > BESKED_MAX);
  }

  async function hentListe(){
    const r = await BeskedApi.mine();
    if (Array.isArray(r)){ tilst.liste = r; tilst.fejl = false; }
    else if (tilst.liste === null){ tilst.fejl = true; }
    const ulaeste = Array.isArray(r) ? r.filter(s => s.ulaest).length : null;
    if (ulaeste !== null && typeof bbSaetBeskedBadge === 'function') bbSaetBeskedBadge(ulaeste);
    tegnListe();
  }

  async function aabnSamtale(id, { markerLaest = true, behold = false } = {}){
    tilst.aktiv = id;
    if (!behold){ tilst.traad = null; tilst.traadFejl = false; tilst.visAnmeld = false; }
    tegn();
    setVisning('traad');
    try {
      const p = new URLSearchParams(window.location.search);
      p.set('tab', 'beskeder'); p.set('samtale', id);
      history.replaceState(null, '', window.location.pathname + '?' + p.toString());
    } catch (e) { /* adressen er en hjælp */ }
    const r = await BeskedApi.hent(id, markerLaest);
    if (tilst.aktiv !== id) return;                       // brugeren nåede at vælge en anden
    if (r && r.ok === true){
      tilst.traad = r; tilst.traadFejl = false;
      const raekke = (tilst.liste || []).find(s => s.samtale_id === id);
      if (raekke && markerLaest) raekke.ulaest = false;
      if (markerLaest) beskedOpdaterBadge();
    } else {
      tilst.traadFejl = true;
    }
    tegn();
    const overskrift = !behold && rod.querySelector('.bsk-traadtitel h3');
    if (overskrift){ overskrift.tabIndex = -1; overskrift.focus({ preventScroll: true }); }
  }

  function lukSamtale(){
    tilst.aktiv = null; tilst.traad = null; tilst.visAnmeld = false;
    try {
      const p = new URLSearchParams(window.location.search); p.delete('samtale');
      history.replaceState(null, '', window.location.pathname + '?' + p.toString());
    } catch (e) { /* adressen er en hjælp */ }
    tegn(); setVisning('liste');
    rod.querySelector('.bsk-raekke')?.focus();
  }

  async function sendSvar(e){
    e.preventDefault();
    if (tilst.sender) return;
    const felt = rod.querySelector('#bsk-svar-tekst'), fejl = rod.querySelector('#bsk-svar-fejl'), knap = rod.querySelector('#bsk-svar-send');
    const v = beskedValider(felt.value);
    const visFejl = t => { fejl.hidden = !t; fejl.textContent = t || ''; };
    if (!v.ok){ visFejl(v.fejl); felt.focus(); return; }
    tilst.sender = true; knap.disabled = true; knap.textContent = 'Sender …'; felt.readOnly = true; visFejl('');
    const r = await BeskedApi.svar(tilst.aktiv, v.tekst);
    tilst.sender = false;
    if (r && r.ok === true){
      felt.value = '';                                    // sendt: ellers gen-indsætter tegnTraad() den gamle tekst
      await Promise.all([aabnSamtale(tilst.aktiv, { behold: true }), hentListe()]);
      rod.querySelector('#bsk-svar-tekst')?.focus();
      return;
    }
    knap.disabled = false; knap.textContent = 'Send svar'; felt.readOnly = false;
    visFejl(beskedFejlTekst(r && r.kode)); felt.focus();
  }

  async function handling(navn, el){
    if (navn === 'tilbage') return lukSamtale();
    if (navn === 'proev-liste'){ tilst.fejl = false; tilst.liste = null; tegn(); return hentListe(); }
    if (navn === 'proev-traad') return aabnSamtale(tilst.aktiv);
    if (navn === 'bloker'){
      const s = tilst.traad.samtale, navnTekst = beskedModpartNavn(s);
      const ok = typeof bekraeft === 'function'
        ? await bekraeft({ titel: `Bloker ${navnTekst}?`, tekst: 'Ingen af jer kan skrive i samtalen bagefter, og personen kan ikke skrive til dig om andre annoncer. Du kan fortryde i samtalens menu.', ok: 'Bloker', farlig: true })
        : window.confirm(`Bloker ${navnTekst}?`);
      if (!ok) return;
      const r = await BeskedApi.bloker(tilst.aktiv);
      if (r && r.ok === true){ if (typeof toast === 'function') toast(`${esc(navnTekst)} er blokeret.`); await Promise.all([aabnSamtale(tilst.aktiv, { behold: true, markerLaest: false }), hentListe()]); }
      else if (typeof toast === 'function') toast(esc(beskedFejlTekst(r && r.kode)), { type: 'error' });
      return;
    }
    if (navn === 'fjern-blok'){
      const r = await BeskedApi.fjernBlokering(tilst.aktiv);
      if (r && r.ok === true){ if (typeof toast === 'function') toast('Blokeringen er fjernet.'); await Promise.all([aabnSamtale(tilst.aktiv, { behold: true, markerLaest: false }), hentListe()]); }
      else if (typeof toast === 'function') toast(esc(beskedFejlTekst(r && r.kode)), { type: 'error' });
      return;
    }
    if (navn === 'anmeld'){ tilst.visAnmeld = true; tegn(); rod.querySelector('#bsk-anmeld-aarsag')?.focus(); return; }
    if (navn === 'anmeld-annuller'){ tilst.visAnmeld = false; tegn(); return; }
  }

  async function sendAnmeld(e){
    e.preventDefault();
    const fejl = rod.querySelector('#bsk-anmeld-fejl');
    const r = await BeskedApi.rapporter(tilst.aktiv, rod.querySelector('#bsk-anmeld-aarsag').value, rod.querySelector('#bsk-anmeld-tekst').value.trim());
    if (r && r.ok === true){
      tilst.visAnmeld = false; tegn();
      if (typeof toast === 'function') toast('Tak. Samtalen er anmeldt, og vi kigger på den.');
      return;
    }
    fejl.hidden = false; fejl.textContent = beskedFejlTekst(r && r.kode);
  }

  /* ---- Opbygning ---- */
  rod.innerHTML = `
    <div class="bsk" data-visning="liste">
      <section class="bsk-lister" aria-labelledby="bsk-h">
        <div class="db-list-head"><h2 class="db-list-title" id="bsk-h">Beskeder <span id="bsk-antal">0</span></h2></div>
        <label class="bsk-mail"><input type="checkbox" id="bsk-mail" disabled> <span>Send mig en e-mail, når jeg får en ny besked</span></label>
        <div class="bsk-lister-indhold" aria-live="polite"></div>
      </section>
      <section class="bsk-traad" aria-label="Valgt samtale"></section>
    </div>`;

  rod.addEventListener('click', e => {
    const raekke = e.target.closest && e.target.closest('[data-samtale]');
    if (raekke){ aabnSamtale(raekke.dataset.samtale); return; }
    const h = e.target.closest && e.target.closest('[data-handling]');
    if (h){ h.closest('details')?.removeAttribute('open'); handling(h.dataset.handling, h); }
  });
  rod.addEventListener('submit', e => {
    if (e.target.id === 'bsk-svar') sendSvar(e);
    else if (e.target.id === 'bsk-anmeld') sendAnmeld(e);
  });
  rod.addEventListener('input', e => { if (e.target.id === 'bsk-svar-tekst') tellSvar(); });
  rod.addEventListener('change', async e => {
    if (e.target.id !== 'bsk-mail') return;
    const boks = e.target, ny = boks.checked;
    boks.disabled = true;
    const r = await BeskedApi.saetMail(ny);
    boks.disabled = false;
    if (r === true){ tilst.mail = ny; if (typeof toast === 'function') toast(ny ? 'Du får e-mail om nye beskeder.' : 'Du får ikke længere e-mail om nye beskeder.'); }
    else { boks.checked = !ny; if (typeof toast === 'function') toast('Valget kunne ikke gemmes. Prøv igen.', { type: 'error' }); }
  });
  /* Escape i en åben menu lukker den (og giver fokus tilbage), ellers lukker den ikke i dialog-løs side. */
  rod.addEventListener('keydown', e => {
    if (e.key === 'Escape'){ const m = rod.querySelector('.bsk-menu[open]'); if (m){ m.removeAttribute('open'); m.querySelector('summary')?.focus(); } }
  });

  tegn();
  const start = (async () => {
    await beskedSikrCss();
    BeskedApi.hentMail().then(v => {
      const boks = rod.querySelector('#bsk-mail');
      if (boks && typeof v === 'boolean'){ boks.checked = v; boks.disabled = false; tilst.mail = v; }
    });
    await hentListe();
    const onsket = opts.startSamtale;
    if (onsket && (tilst.liste || []).some(s => s.samtale_id === onsket)) await aabnSamtale(onsket);
  })();

  /* Let genhentning, mens fanen er åben og synlig: nye beskeder dukker op uden at siden skal genindlæses. */
  const opfrisk = () => {
    if (document.hidden || !rod.isConnected || rod.offsetParent === null || tilst.sender) return;
    hentListe();
    const felt = rod.querySelector('#bsk-svar-tekst');
    if (felt && document.activeElement === felt) return;   // rør ikke tråden, mens der skrives
    if (tilst.aktiv) aabnSamtale(tilst.aktiv, { behold: true, markerLaest: true });
  };
  tilst.poll = setInterval(opfrisk, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) opfrisk(); });

  return { start, hentListe, aabnSamtale, tilstand: tilst, stop(){ clearInterval(tilst.poll); } };
}

const Beskeder = {
  BESKED_MAX, BESKED_MIN, beskedRens, beskedAntalLinks, beskedValider, beskedFejlTekst, beskedLaasTekst, beskedStatusMaerke,
  beskedBadgeTekst, beskedTid, beskedInitialer, beskedModpartNavn, beskedFormularHTML, beskedKvitteringHTML,
  Api: BeskedApi, monterFormular: beskedMonterFormular, indbakke: beskedIndbakke, opdaterBadge: beskedOpdaterBadge, sikrCss: beskedSikrCss,
};
if (typeof window !== 'undefined') window.Beskeder = Beskeder;
