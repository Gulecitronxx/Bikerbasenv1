const STEP_LABELS = ['Type & specs', 'Pris & beskrivelse', 'Billeder', 'Gennemse'];
let currentStep = 1;
let uploadedPhotos = []; // { url, name }
let uploadedDocs = []; // { url, name }
let formData = {};
/* Sat når siden åbnes som ?rediger=<id>. Så gemmer formularen oven i den
   eksisterende annonce i stedet for at oprette en ny. */
let editingId = null;
/* Billeder der allerede ligger på annoncen: { id, path, position, url }. De
   bevares ved redigering og fjernes kun, hvis brugeren selv trykker på
   krydset. `position` bruges til at lægge nye billeder BAGEFTER dem, der
   bliver liggende — se publishListing(). */
let existingPhotos = [];
let removedPhotoIds = [];

/* Grænsen står ÉT sted, fordi den skrives tre steder: i teksten i
   upload-feltet ("Tilføj op til 12 billeder"), i den beregning der afgør
   hvor mange filer der er plads til, og i beskeden når der ikke var plads. */
const MAX_FOTOS = 12;
const MAX_DOKUMENTER = 8;

/* Endelser vi tør forsøge, når filen ikke selv oplyser en MIME-type. */
const BILLED_ENDELSER = /\.(jpe?g|png|webp|heic|heif|avif)$/i;

/* Er filen et billede, vi i det mindste kan FORSØGE at behandle?

   `file.type` er ikke til at stole på. Et HEIC-foto fra en iPhone, der er
   lagt over på en Windows-pc eller valgt gennem en Android-filvælger, kommer
   ofte med tom type — Windows har ingen registrering for .heic. Den gamle
   test var `file.type.startsWith('image/')`, og den smed derfor præcis
   telefonfotos væk, og gjorde det TAVST: filen dukkede aldrig op i gitteret,
   og der stod ikke et ord om hvorfor. Målt: en .HEIC med tom type forsvandt
   uden besked.

   Vi afgør ikke her, om filen kan afkodes — det kan kun browseren, og den
   siger det først ved uploaden (se stripExifAndResize i js/supabase-api.js).
   Her afgør vi kun, om det er værd at vise sælgeren i gitteret. */
function erBilledfil(file){
  if (file.type) return file.type.startsWith('image/');
  return BILLED_ENDELSER.test(file.name || '');
}

function renderStepper(){
  document.getElementById('stepper').innerHTML = STEP_LABELS.map((label, i) => {
    const n = i + 1;
    const cls = n === currentStep ? 'active' : (n < currentStep ? 'done' : '');
    return `
    <div class="step-item ${cls}">
      <span class="step-dot">${n < currentStep ? '' : n}</span>
      <span class="step-label">${label}</span>
    </div>
    ${n < STEP_LABELS.length ? '<span class="step-line"></span>' : ''}`;
  }).join('');
  document.querySelectorAll('.step-item.done .step-dot').forEach(d => d.innerHTML = Icon.check);
}

function goToStep(n){
  currentStep = n;
  document.querySelectorAll('.form-step').forEach(s => s.hidden = Number(s.dataset.step) !== n);
  renderStepper();
  document.getElementById('step-back').style.visibility = n === 1 ? 'hidden' : 'visible';
  document.getElementById('step-next').textContent =
    n === STEP_LABELS.length ? (editingId ? 'Gem ændringer' : 'Udgiv annonce') : 'Fortsæt';
  if (n === STEP_LABELS.length) renderPreview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateEqCounts(){
  if (typeof EQUIPMENT_GROUPS === 'undefined') return;
  EQUIPMENT_GROUPS.forEach((g, gi) => {
    const n = document.querySelectorAll(`#equipment-groups input[data-eq-group="${gi}"]:checked`).length;
    const badge = document.querySelector(`[data-eq-count="${gi}"]`);
    if (badge){ badge.textContent = n ? ` · ${n} valgt` : ''; badge.hidden = !n; }
  });
}

/* aria-invalid saettes ogsaa: den roede ramme er farve alene, og farve alene
   er ikke et signal for alle. Uden den ved en skaermlaeserbruger ikke, at
   det felt fokus lige hoppede til, er dét der mangler. */
function markFieldError(el, refs){
  const field = el.closest('.field') || el.closest('.checkbox-inline');
  if (field) field.classList.add('has-error');
  if (el && el.style) el.style.borderColor = 'var(--color-danger)';
  if (el && el.setAttribute) el.setAttribute('aria-invalid', 'true');
  if (refs && !refs.first) refs.first = el;
}

function validateStep(n){
  const section = document.querySelector(`.form-step[data-step="${n}"]`);
  let valid = true;
  const refs = { first: null };
  let msg = '';
  section.querySelectorAll('[required]').forEach(el => {
    const field = el.closest('.field') || el.closest('.checkbox-inline');
    const ok = el.type === 'checkbox' ? el.checked : String(el.value).trim() !== '';
    if (!ok){ valid = false; markFieldError(el, refs); }
    else { if (field) field.classList.remove('has-error'); el.style.borderColor = ''; el.removeAttribute('aria-invalid'); }
  });
  // Grænseværdier — feltet er tomt-tjekket ovenfor; her fanger vi urealistiske tal
  // (formularen er novalidate, så min/max i HTML håndhæves ikke af sig selv).
  const bound = (id, ok, m) => {
    const el = document.getElementById(id);
    if (!el || el.value.trim() === '') return;
    if (!ok(Number(el.value))){ valid = false; markFieldError(el, refs); msg = m; }
  };
  if (n === 1){
    if (!document.querySelector('input[name="bike-type"]:checked')){ valid = false; msg = msg || 'Vælg venligst en motorcykeltype'; }
    const nowY = new Date().getFullYear();
    bound('f-year', v => v >= 1900 && v <= nowY + 1, `Årgang skal være mellem 1900 og ${nowY + 1}`);
    bound('f-km', v => v >= 0 && v <= 500000, 'Kilometerstanden virker urealistisk (0–500.000)');
    bound('f-ccm', v => v >= 50 && v <= 3000, 'Motorstørrelsen skal være mellem 50 og 3.000 ccm');
  }
  /* Trin 4 er to afkrydsningsfelter, ikke felter man udfylder. Den generelle
     besked ("Udfyld venligst alle felter markeret med *") gav ingen mening
     dér: man havde lige skrevet hele annoncen færdig og fik at vide, at man
     skulle udfylde noget. Sig hvad der mangler. */
  if (n === 4){
    const vilkaar = document.getElementById('f-terms');
    const robot = document.getElementById('f-captcha');
    if (!vilkaar.checked && !robot.checked) msg = 'Accepter vilkårene og bekræft, at du ikke er en robot';
    else if (!vilkaar.checked) msg = 'Du skal acceptere vilkårene for annoncering';
    else if (!robot.checked) msg = 'Bekræft, at du ikke er en robot';
  }
  if (n === 2){
    bound('f-price', v => v > 0 && v <= 2000000, 'Angiv en realistisk pris');
    // Frit indtastet postnummer uden bekræftet valg = annonce uden by/region.
    if (!acceptExactPostnr()){ valid = false; markFieldError(document.getElementById('f-postnr'), refs); msg = 'Vælg et postnummer fra listen'; }
  }
  if (!valid){
    if (refs.first){
      refs.first.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(() => { try { refs.first.focus({ preventScroll: true }); } catch(e){} }, 280);
    }
    toast(msg || 'Udfyld venligst alle felter markeret med *', { type: 'error' });
  }
  return valid;
}

/* Typefliserne står nu statisk i opret-annonce.html, så de er der ved første
   maling i stedet for at skubbe hele formularen 714px ned, når JS'en er klar.
   Her tegnes de kun, hvis den statiske liste ikke længere svarer til TYPES —
   så er data.js stadig kilden, og HTML'en kan ikke drive stille fra den. */
function renderTypeTilesIfStale(){
  const group = document.getElementById('type-radio-group');
  const nuvaerende = [...group.querySelectorAll('input[name="bike-type"]')].map(i => i.value);
  if (nuvaerende.join('\0') === TYPES.map(t => t.id).join('\0')) return;

  group.innerHTML = TYPES.map((t, i) => `
    <label class="radio-card">
      <input type="radio" name="bike-type" value="${t.id}">
      <span class="radio-card-inner">
        <span class="radio-card-media"><img src="img/type/${t.id}.webp" alt="" width="760" height="570"${i < 4 ? '' : ' loading="lazy"'} decoding="async"></span>
        <span class="radio-card-label">${t.label}</span>
      </span>
    </label>`).join('');
}

function populateStaticFields(){
  renderTypeTilesIfStale();

  const brandSelect = document.getElementById('f-brand');
  brandSelect.innerHTML = `<option value="">Vælg mærke</option>` + Object.keys(BRANDS_BY_MODEL).sort().map(b => `<option value="${b}">${b}</option>`).join('');
  brandSelect.addEventListener('change', () => {
    const models = BRANDS_BY_MODEL[brandSelect.value] || [];
    document.getElementById('model-suggestions').innerHTML = models.map(m => `<option value="${m}">`).join('');
  });

  /* Tom førstemulighed med vilje. Feltet er påkrævet, men stod som standard
     på "Som ny" — det mest flatterende af de fire. Sælgeren kunne altså
     udgive en 20 år gammel motorcykel som "Som ny" uden nogensinde at have
     truffet et valg, på en side der to felter længere nede beder om ærlighed
     om stand og mangler. Nu skal standen vælges bevidst. */
  document.getElementById('f-condition').innerHTML =
    `<option value="">Vælg stand</option>`
    + CONDITIONS.map(c => `<option value="${c}">${c}</option>`).join('');
  document.getElementById('f-afgift').innerHTML = AFGIFT_STATUSES.map(a => `<option value="${a}">${a}</option>`).join('');

  // Teknikfelterne er valgfrie — en tom værdi betyder "ikke oplyst" og
  // udelukker ikke annoncen fra søgninger uden det filter.
  const blank = '<option value="">Ikke oplyst</option>';
  document.getElementById('f-fuel').innerHTML = blank + FUELS.map(f => `<option value="${f}">${f}</option>`).join('');
  document.getElementById('f-drive').innerHTML = blank + DRIVES.map(d => `<option value="${d}">${d}</option>`).join('');
  document.getElementById('f-cylinders').innerHTML = blank + CYLINDERS.map(c => `<option value="${c}">${c}</option>`).join('');
  document.getElementById('f-color').innerHTML = blank + COLORS.map(c => `<option value="${c}">${c}</option>`).join('');

  // Kollapset som standard — 6 åbne grupper = ~34 checkbokse på skærmen på én
  // gang. Gruppenavn + live "X valgt" gør det scanbart uden at åbne alt.
  document.getElementById('equipment-groups').innerHTML = EQUIPMENT_GROUPS.map((g, gi) => `
    <details class="filter-group" data-eq-details="${gi}">
      <summary>${g.group}<span class="eq-count" data-eq-count="${gi}" hidden></span><span class="chev">${Icon.chevronDown}</span></summary>
      <div class="filter-body equipment-grid">
        ${g.items.map(i => `<label class="checkbox-row"><input type="checkbox" data-equipment="${i.id}" data-eq-group="${gi}">${i.label}</label>`).join('')}
      </div>
    </details>`).join('');

  wirePostnrCombo();

  // Live "X valgt" på udstyrsgrupperne.
  document.getElementById('equipment-groups').addEventListener('change', updateEqCounts);

  // Ryd fejlmarkeringen mens brugeren retter feltet (rød kant hang før ved).
  document.querySelectorAll('.form-step .input, .form-step input, .form-step select, .form-step textarea').forEach(el => {
    el.addEventListener('input', () => {
      const f = el.closest('.field'); if (f) f.classList.remove('has-error');
      if (el.style) el.style.borderColor = '';
    });
  });

  document.getElementById('upload-icon-mount').innerHTML = Icon.upload;
  document.getElementById('doc-upload-icon-mount').innerHTML = Icon.upload;
  document.getElementById('back-icon').innerHTML = Icon.chevronLeft;
}

/* Søgbar postnummervælger.
   En dropdown duer ikke: der er 1089 postnumre, og "København K" alene fylder
   232 af dem. Man skriver i stedet postnummer eller bynavn og vælger et træf.
   By og region gemmes i skjulte felter, så de altid følger et rigtigt valg. */
/* Accepterer et præcist indtastet postnummer uden at kræve et klik i listen.

   Ét sted, fordi to steder skal bruge den: comboens blur-handler, og
   valideringen. Blur-handleren venter 120ms (den skal lade et klik i listen
   nå frem først), og det var 120ms for sent — trykkede man "Næste" efter at
   have skrevet "2100", blev man afvist med "Vælg et postnummer fra listen",
   hvorefter feltet udfyldte sig selv med "2100 København Ø" et øjeblik
   senere. Man fik altså en fejl for noget, der rettede sig selv. */
function acceptExactPostnr(){
  if (document.getElementById('f-city').value) return true;
  const input = document.getElementById('f-postnr');
  const m = findPostnr(input.value.trim().split(' ')[0]);
  if (!m) return false;
  input.value = `${m.postnr} ${m.city}`;
  document.getElementById('f-city').value = m.city;
  document.getElementById('f-region').value = m.region;
  document.getElementById('postnr-hint').textContent = `${m.city} · Region ${m.region}`;
  input.closest('.field')?.classList.remove('has-error');
  return true;
}

function wirePostnrCombo(){
  const input = document.getElementById('f-postnr');
  const list  = document.getElementById('postnr-list');
  const field = input.closest('.field');
  let matches = [], active = -1;

  const close = () => {
    list.hidden = true; active = -1;
    input.setAttribute('aria-expanded', 'false');
  };

  const commit = (m) => {
    input.value = `${m.postnr} ${m.city}`;
    document.getElementById('f-city').value = m.city;
    document.getElementById('f-region').value = m.region;
    field.classList.remove('has-error');
    document.getElementById('postnr-hint').textContent = `${m.city} · Region ${m.region}`;
    close();
  };

  const render = () => {
    if (!matches.length){ close(); return; }
    list.innerHTML = matches.map((m, i) => `
      <li role="option" id="postnr-opt-${i}" aria-selected="${i === active}"
          class="${i === active ? 'active' : ''}" data-i="${i}">
        <strong>${escapeHTML(m.postnr)}</strong> ${escapeHTML(m.city)}
        <span class="combo-region">${escapeHTML(m.region)}</span>
      </li>`).join('');
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    list.querySelectorAll('li').forEach(li => {
      // mousedown frem for click: blur ville lukke listen først
      li.addEventListener('mousedown', (e) => { e.preventDefault(); commit(matches[Number(li.dataset.i)]); });
    });
  };

  input.addEventListener('input', () => {
    // Et frit indtastet felt må ikke efterlade en gammel by/region hængende.
    document.getElementById('f-city').value = '';
    document.getElementById('f-region').value = '';
    document.getElementById('postnr-hint').textContent = 'Søg blandt alle 1.089 danske postnumre.';
    matches = searchPostnr(input.value, 8);
    active = -1;
    render();
  });

  input.addEventListener('keydown', (e) => {
    if (list.hidden || !matches.length) return;
    if (e.key === 'ArrowDown'){ e.preventDefault(); active = (active + 1) % matches.length; render(); }
    else if (e.key === 'ArrowUp'){ e.preventDefault(); active = (active - 1 + matches.length) % matches.length; render(); }
    else if (e.key === 'Enter' && active >= 0){ e.preventDefault(); commit(matches[active]); }
    else if (e.key === 'Escape'){ close(); }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      close();
      // Præcis ét træf på det indtastede? Så accepterer vi det uden klik.
      acceptExactPostnr();
    }, 120);
  });
}

function wirePhotoUpload(){
  const zone = document.getElementById('upload-zone');
  const input = document.getElementById('photo-input');
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault(); zone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });
  input.addEventListener('change', () => handleFiles(input.files));
}

/* Tager imod de valgte filer og SIGER hvad der ikke kom med.

   Tre fejl var samlet i fire linjer, og alle tre var tavse:
   1. `slice()` skar FØR ikke-billeder blev sorteret fra, så en PDF blandt de
      første 12 filer spiste en billedplads.
   2. Filer ud over grænsen forsvandt uden besked. Målt: 15 fotos ind, 12 i
      gitteret, sælgeren fik aldrig at vide, at tre manglede.
   3. Grænsen talte kun NYE billeder, så en annonce med 12 billeder på kunne
      få 12 mere — modsat det, feltet selv lover.
   En annonce uden billeder er dyrere for os end noget andet felt på siden
   (bar/GAPS.md, tillidsspørgsmålet), så et foto, der falder på gulvet uden
   en lyd, er den værste af de tavse fejl. */
function handleFiles(files){
  const valgte = Array.from(files);
  const billeder = valgte.filter(erBilledfil);
  const ikkeBilleder = valgte.length - billeder.length;

  const plads = Math.max(0, MAX_FOTOS - existingPhotos.length - uploadedPhotos.length);
  const medtaget = billeder.slice(0, plads);
  const forMange = billeder.length - medtaget.length;

  medtaget.forEach(file => {
    // Selve File-objektet gemmes, så det kan uploades ved udgivelse.
    uploadedPhotos.push({ url: URL.createObjectURL(file), name: file.name, file });
  });
  renderPhotoGrid();

  const dele = [];
  if (forMange) dele.push(`${forMange} billede${forMange === 1 ? '' : 'r'} kom ikke med — der er plads til ${MAX_FOTOS} i alt`);
  if (ikkeBilleder) dele.push(`${ikkeBilleder} ${ikkeBilleder === 1 ? 'fil er ikke et billede' : 'filer er ikke billeder'}`);
  if (dele.length) toast(dele.join('. ') + '.', { type: 'error' });
}

function wireDocUpload(){
  const zone = document.getElementById('doc-upload-zone');
  const input = document.getElementById('doc-input');
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault(); zone.classList.remove('dragover');
    handleDocFiles(e.dataTransfer.files);
  });
  input.addEventListener('change', () => handleDocFiles(input.files));
}

/* Samme regel som for billederne: det, der ikke kom med, skal siges.
   Her afvises ingen filtyper — feltet tager både billeder og PDF — så det
   eneste, der kan falde på gulvet, er antallet. */
function handleDocFiles(files){
  const valgte = Array.from(files);
  const plads = Math.max(0, MAX_DOKUMENTER - uploadedDocs.length);
  const medtaget = valgte.slice(0, plads);
  const forMange = valgte.length - medtaget.length;

  medtaget.forEach(file => {
    uploadedDocs.push({ url: erBilledfil(file) ? URL.createObjectURL(file) : null, name: file.name });
  });
  renderDocGrid();

  if (forMange){
    toast(`${forMange} fil${forMange === 1 ? '' : 'er'} kom ikke med — der er plads til ${MAX_DOKUMENTER} dokumenter i alt.`, { type: 'error' });
  }
}

function renderDocGrid(){
  const grid = document.getElementById('doc-grid');
  grid.innerHTML = uploadedDocs.map((d, i) => `
    <div class="photo-thumb" style="${d.url ? '' : 'display:flex; align-items:center; justify-content:center; flex-direction:column; gap:6px; padding:8px;'}">
      ${d.url ? `<img src="${d.url}" alt="${escapeHTML(d.name)}">` : `${Icon.info}<span style="font-size:11px; text-align:center; word-break:break-all; color:var(--color-fg-muted);">${escapeHTML(d.name)}</span>`}
      <button type="button" class="remove-photo" data-remove-doc="${i}" aria-label="Fjern dokument">${Icon.close}</button>
    </div>`).join('');
  grid.querySelectorAll('[data-remove-doc]').forEach(btn => {
    btn.addEventListener('click', () => { uploadedDocs.splice(Number(btn.dataset.removeDoc), 1); renderDocGrid(); });
  });
}

/* Flyt et uploadet billede i rækkefølgen (bestemmer forsidebilledet). */
function movePhoto(from, to){
  if (to < 0 || to >= uploadedPhotos.length || from === to) return;
  const [item] = uploadedPhotos.splice(from, 1);
  uploadedPhotos.splice(to, 0, item);
  renderPhotoGrid();
}

let _photoDragIdx = null;

/* Rigtig, beskrivende alt-tekst — bygget af de felter, sælgeren FAKTISK har
   udfyldt i trin 1, ikke "billede af motorcykel". Ingen vinkel gættes:
   formularen fanger ikke, om billedet er taget forfra eller bagfra, så det
   feltet findes ikke her — jf. "vi gætter aldrig" (DECISIONS.md).

   Gælder kun gitteret i DENNE formular. Den udgivne annonces eget galleri
   (js/annonce.js) og listing_photos-tabellen har intet alt-tekst-felt at
   sende den videre til — se DECISIONS.md-noten for builder 4 om den
   udestående ledning. */
function fotoAltTekst(indeksBlandtAlle){
  const brand = document.getElementById('f-brand')?.value || '';
  const model = document.getElementById('f-model')?.value || '';
  const year  = document.getElementById('f-year')?.value || '';
  const navn = [brand, model, year].filter(Boolean).join(' ') || 'Motorcyklen';
  return indeksBlandtAlle === 0 ? `${navn} — forsidebillede` : `${navn} — billede ${indeksBlandtAlle + 1}`;
}

function renderPhotoGrid(){
  const grid = document.getElementById('photo-grid');

  // Ved redigering vises annoncens nuværende billeder først. De blev slet
  // ikke vist før, så det lignede at redigeringen havde slettet dem — og
  // der var ingen måde at fjerne ét enkelt på.
  const eksisterende = existingPhotos.map((p, i) => `
    <div class="photo-thumb">
      <img src="${p.url}" alt="${escapeHTML(fotoAltTekst(i))}">
      ${i === 0 ? '<span class="cover-tag">Forside</span>' : ''}
      <button type="button" class="remove-photo" data-remove-existing="${p.id}" aria-label="Fjern dette billede fra annoncen">${Icon.close}</button>
    </div>`).join('');

  const isCover = (i) => !existingPhotos.length && i === 0;
  const chevL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>`;
  const chevR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>`;
  const star  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/></svg>`;
  const nye = uploadedPhotos.map((p, i) => `
    <div class="photo-thumb" draggable="true" data-idx="${i}">
      <img src="${p.url}" alt="${escapeHTML(fotoAltTekst(existingPhotos.length + i))}" draggable="false">
      ${isCover(i) ? '<span class="cover-tag">Forside</span>' : '<span class="cover-tag new">Ny</span>'}
      <div class="photo-actions">
        <button type="button" class="photo-move" data-move="${i}" data-dir="-1" aria-label="Flyt tidligere"${i === 0 ? ' disabled' : ''}>${chevL}</button>
        ${(!existingPhotos.length && i > 0) ? `<button type="button" class="photo-cover" data-cover="${i}" aria-label="Sæt som forsidebillede" title="Sæt som forside">${star}</button>` : ''}
        <button type="button" class="photo-move" data-move="${i}" data-dir="1" aria-label="Flyt senere"${i === uploadedPhotos.length - 1 ? ' disabled' : ''}>${chevR}</button>
      </div>
      <button type="button" class="remove-photo" data-remove="${i}" aria-label="Fjern billede">${Icon.close}</button>
    </div>`).join('');

  grid.innerHTML = eksisterende + nye;

  grid.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => { uploadedPhotos.splice(Number(btn.dataset.remove), 1); renderPhotoGrid(); });
  });
  grid.querySelectorAll('[data-move]').forEach(btn => {
    btn.addEventListener('click', () => { const i = Number(btn.dataset.move); movePhoto(i, i + Number(btn.dataset.dir)); });
  });
  grid.querySelectorAll('[data-cover]').forEach(btn => {
    btn.addEventListener('click', () => { movePhoto(Number(btn.dataset.cover), 0); toast('Forsidebillede opdateret'); });
  });
  // Træk-og-slip omrokering (desktop) — knapperne er den tilgængelige fallback.
  grid.querySelectorAll('.photo-thumb[data-idx]').forEach(thumb => {
    thumb.addEventListener('dragstart', () => { _photoDragIdx = Number(thumb.dataset.idx); thumb.classList.add('dragging'); });
    thumb.addEventListener('dragend', () => { thumb.classList.remove('dragging'); grid.querySelectorAll('.drag-over').forEach(t => t.classList.remove('drag-over')); });
    thumb.addEventListener('dragover', (e) => { e.preventDefault(); thumb.classList.add('drag-over'); });
    thumb.addEventListener('dragleave', () => thumb.classList.remove('drag-over'));
    thumb.addEventListener('drop', (e) => {
      e.preventDefault(); thumb.classList.remove('drag-over');
      const to = Number(thumb.dataset.idx);
      if (_photoDragIdx !== null && _photoDragIdx !== to) movePhoto(_photoDragIdx, to);
      _photoDragIdx = null;
    });
  });
  grid.querySelectorAll('[data-remove-existing]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.removeExisting;
      const foto = existingPhotos.find(p => String(p.id) === String(id));
      if (!foto) return;
      if (!confirm('Fjern dette billede fra annoncen? Det sker først når du gemmer.')) return;
      // Slettes først når annoncen gemmes, så man kan fortryde ved at gå væk.
      removedPhotoIds.push(foto);
      existingPhotos = existingPhotos.filter(p => String(p.id) !== String(id));
      renderPhotoGrid();
    });
  });

  const ialt = existingPhotos.length + uploadedPhotos.length;
  const hint = document.getElementById('photo-hint');
  if (!ialt){
    hint.textContent = editingId
      ? 'Annoncen har ingen billeder. Annoncer med billeder bliver set markant oftere.'
      : 'Ingen billeder valgt endnu — annoncer med billeder bliver set markant oftere.';
  } else {
    const dele = [];
    if (existingPhotos.length) dele.push(`${existingPhotos.length} på annoncen`);
    if (uploadedPhotos.length) dele.push(`${uploadedPhotos.length} ny${uploadedPhotos.length === 1 ? 't' : 'e'}`);
    const fjernet = removedPhotoIds.length ? ` ${removedPhotoIds.length} bliver fjernet når du gemmer.` : '';
    hint.textContent = `${ialt} billede${ialt === 1 ? '' : 'r'} i alt (${dele.join(', ')}).${fjernet}`;
  }
}

function collectFormData(){
  const type = (document.querySelector('input[name="bike-type"]:checked') || {}).value || 'naked';
  // By/region kommer fra det bekræftede valg i vælgeren, ikke fra rå indtastning.
  const postnr = (document.getElementById('f-postnr').value.trim().split(' ')[0]) || '';
  return {
    type,
    brand: document.getElementById('f-brand').value,
    model: document.getElementById('f-model').value,
    year: Number(document.getElementById('f-year').value) || 2020,
    km: Number(document.getElementById('f-km').value) || 0,
    ccm: Number(document.getElementById('f-ccm').value) || 0,
    power: Number(document.getElementById('f-power').value) || null,
    registration: document.getElementById('f-registration').value,
    afgift: document.getElementById('f-afgift').value,
    fuel: document.getElementById('f-fuel').value || null,
    drive: document.getElementById('f-drive').value || null,
    cylinders: Number(document.getElementById('f-cylinders').value) || null,
    color: document.getElementById('f-color').value || null,
    serviceHistorik: document.getElementById('f-service').value || null,
    antalEjere: Number(document.getElementById('f-ejere').value) || null,
    sidsteSyn: Number(document.getElementById('f-synsaar').value) || null,
    daekAar: Number(document.getElementById('f-daek').value) || null,
    vinterklar: document.getElementById('f-vinter').checked,
    kanNedsaettesA2: document.getElementById('f-a2nedsat').checked,
    equipment: [...document.querySelectorAll('#equipment-groups input:checked')].map(cb => cb.dataset.equipment),
    price: Number(document.getElementById('f-price').value) || 0,
    condition: document.getElementById('f-condition').value,
    postnr,
    city: document.getElementById('f-city').value,
    region: document.getElementById('f-region').value,
    description: document.getElementById('f-desc').value,
    hasDocumentation: uploadedDocs.length > 0,
  };
}

function sellerFromUser(user){
  return {
    name: user.name || 'Dig', isDealer: !!user.isDealer,
    verified: !!user.verified, emailVerified: !!user.emailVerified, phoneVerified: !!user.phoneVerified,
    mitIdVerified: !!user.mitIdVerified, cvr: user.cvr || null,
    phone: user.phone || '+45 00 00 00 00', memberSince: 2026, rating: '5.0', reviews: 0, city: formData.city,
  };
}

/* ============ SEO- og udgivelsesassistent (builder 4, 20.08.2026) ============

   Gælder UDELUKKENDE sælgerens EGEN annonce, mens den skrives her — ikke de
   392 indekserede annoncer fra MC Syd/Gul og Gratis, som js/annonce.js viser
   med kildeangivelse og aldrig omskriver (se DECISIONS.md, "vi gætter
   aldrig" — en fremmed annonces tekst er ikke vores at redigere).

   Ingen funktion herunder opfinder et ord. Hver linje kommer enten fra et
   formularfelt, sælgeren selv har tastet eller sat kryds ved, fra en liste
   sitet allerede har (TYPES, EQUIPMENT_LABELS, koerekortMaerkat), eller er
   hendes egen frie tekst gengivet ORDRET. Et opdigtet felt på en annonce er
   et retligt problem, ikke kun et SEO-problem — samme linje som
   licensbadge-arbejdet i DECISIONS.md.

   Stakken har ingen backend at kalde et sprogmodel på (se "Stakken er den,
   der er" i DECISIONS.md — statisk HTML + vanilla JS, ingen server, ingen
   build). "Strukturér min beskrivelse" er derfor IKKE en AI-omskrivning:
   det er en deterministisk skabelon, der flytter sælgerens egne ord og tal
   rundt. Det er en ærlig grænse for hvad stakken kan i dag, ikke noget der
   er forsøgt skjult. */

/* Samme prisintervaller som #filter-price-quick i js/search.js
   (PRIS_INTERVALLER). js/search.js loades ikke på denne side, så tallene er
   duplikeret her i stedet for delt — ret begge steder, hvis grænserne
   ændres, eller flyt dem til js/data.js, som begge sider allerede loader. */
const SEO_PRISBAAND = [
  { max: 30000,    label: 'Under 30.000 kr.' },
  { max: 60000,    label: '30–60.000 kr.' },
  { max: 100000,   label: '60–100.000 kr.' },
  { max: 150000,   label: '100–150.000 kr.' },
  { max: Infinity, label: 'Over 150.000 kr.' },
];
function prisbaandForPris(pris){
  if (!pris) return null;
  return (SEO_PRISBAAND.find(b => pris <= b.max) || {}).label || null;
}

/* Genskaber (BEVIDST — se noten nedenfor) samme opskrift som js/seo.js'
   seoListingPage() og scripts/build-listing-pages.js' jsonLd()-nabofunktion:
   "{mærke model} {år} — {pris} — Bikerbasen" og "{mærke model}, Årgang X,
   Y km, Z ccm, stand. Til salg i by på Bikerbasen." De to filer ejes af en
   anden builder denne runde og må ikke røres herfra (se opgavens filliste).
   Formålet her er IKKE at generere de rigtige meta-tags — det gør de filer,
   uden om denne formular — men at vise sælgeren, hvad hendes EGNE tal
   bliver til, mens hun stadig kan rette dem (fx skrive et kortere
   modelnavn, så titlen ikke bliver skåret af).
   FÆLDE FOR DEN NÆSTE: ændres formlen i js/seo.js, driver forhåndsvisningen
   her fra virkeligheden. Samme risiko som er dokumenteret andre steder i
   DECISIONS.md ved duplikeret logik ("Bedømmelsen regnes ét sted..."). Bedre
   løsning: flyt formlen til en delt funktion i js/data.js. Ikke gjort her,
   fordi js/data.js er en delt fil og ikke min at omlægge midt i en runde. */
function serpTitel(data){
  const navn = [data.brand, data.model].filter(Boolean).join(' ');
  if (!navn) return null;
  const pris = data.price ? formatPrice(data.price) : null;
  return [navn, data.year, pris ? `— ${pris}` : null, '— Bikerbasen'].filter(Boolean).join(' ');
}
function serpBeskrivelse(data){
  const navn = [data.brand, data.model].filter(Boolean).join(' ');
  if (!navn) return null;
  const dele = [
    data.year ? `Årgang ${data.year}` : null,
    data.km ? formatKm(data.km) : null,
    data.ccm ? formatCcm(data.ccm) : null,
    data.condition || null,
  ].filter(Boolean);
  const hale = data.city ? ` Til salg i ${data.city} på Bikerbasen.` : ' Til salg på Bikerbasen.';
  return `${navn}${dele.length ? ', ' + dele.join(', ') : ''}.${hale}`;
}

/* Det virkeligt oplyste, der typisk giver mest tillid FØRST — men kun når
   feltet rent faktisk er udfyldt. Bruges ikke til at skrive noget selv; kun
   til at pege sælgeren mod, hvad hun med fordel selv kan nævne i
   beskrivelsen, hvis det ikke allerede står der (se manglerListe()). */
function staerkesteFaktum(data){
  const nu = new Date().getFullYear();
  if (data.antalEjere === 1) return '1 ejer';
  if (data.serviceHistorik === 'Fuld') return 'fuld servicehistorik';
  if (data.sidsteSyn && data.sidsteSyn >= nu - 1) return `synet ${data.sidsteSyn}`;
  if (data.daekAar && data.daekAar >= nu - 1) return 'nye dæk';
  if (data.vinterklar) return 'vinterklargjort';
  if ((data.equipment || []).length) return equipmentLabel(data.equipment[0]);
  return null;
}

/* Det, der reelt mangler lige nu — beregnet af det, formularen FAKTISK
   indeholder, ikke af en fast skabelon. Hvert punkt tjekker ét felt eller en
   nøgtern tekstsøgning i sælgerens egen beskrivelse, så vi ikke beder om
   noget, hun allerede har skrevet et andet sted. Vist i trin 4 ("Gennemse &
   udgiv") — FØR udgivelse, ikke som en fejlbesked bagefter. */
function manglerListe(data){
  const antalFotos = existingPhotos.length + uploadedPhotos.length;
  const beskrivelse = (data.description || '').trim();
  const punkter = [];

  if (antalFotos === 0) punkter.push('Du har ingen billeder endnu — annoncer uden billeder bliver næsten aldrig klikket på.');
  else if (antalFotos < 5) punkter.push(`Du har ${antalFotos} billede${antalFotos === 1 ? '' : 'r'} — annoncer med mindst 5 billeder får typisk flere henvendelser.`);

  if (!data.power) punkter.push('Effekt (hk) er ikke udfyldt — uden den kan vi ikke vise, om motorcyklen kan køres på et A2-kørekort.');
  if (!data.sidsteSyn && !/\bsyn(et)?\b/i.test(beskrivelse)) punkter.push('Sidste syn er ikke oplyst — det er tit et af de første spørgsmål, en køber stiller.');
  if (!data.antalEjere && !/\bejer/i.test(beskrivelse)) punkter.push('Antal ejere er ikke udfyldt — mange købere lægger vægt på ejerhistorik.');
  if (!data.serviceHistorik && !/service/i.test(beskrivelse)) punkter.push('Servicehistorik er ikke valgt.');
  if (beskrivelse.length < 40) punkter.push('Beskrivelsen er meget kort — uddyb gerne stand, historik og evt. hvorfor du sælger.');
  if (!(data.equipment || []).length) punkter.push('Du har ikke sat kryds ved noget udstyr — selv basalt som ABS er noget mange filtrerer på.');

  const faktum = staerkesteFaktum(data);
  if (faktum && !beskrivelse.toLowerCase().includes(faktum.toLowerCase())){
    punkter.push(`"${faktum}" står i oplysningerne, men ikke i selve beskrivelsen — nævn den gerne der, det er noget mange købere leder efter.`);
  }

  return punkter;
}

/* Trin 4: mærkater sælgeren kan forvente at annoncen får. Bruger det, sitet
   allerede regner med — IKKE en ny udregning. koerekortMaerkat() (i
   js/components.js) er den ene kilde til kørekortkategorien på hele sitet
   (se "Kørekortmærkatet regnes ÉT sted" i DECISIONS.md); den kalder selv
   koerekortForListing() og passerKoerekort() fra js/data.js og håndterer
   både selvmodsigende tal og vagthunden. At kalde den her frem for at
   genopfinde A1/A2/A-logikken er præcis den regel, opgaven bad om at følge. */
function foreslaaedeMaerkater(data){
  const kk = koerekortMaerkat({ ...data, isExternal: false });
  return {
    kk,
    chips: [typeLabel(data.type), kk.kode ? `Kørekort ${kk.kode}` : null, prisbaandForPris(data.price)].filter(Boolean),
  };
}

/* Strukturerer sælgerens EGEN beskrivelse — tilføjer aldrig et ord, hun ikke
   selv har skrevet eller tastet ind et andet sted i formularen.

   1. Fakta-linjen kommer UDELUKKENDE fra formularfelter (årgang, km,
      service, ejere, syn, dæk, udstyr) — tal og valg, hun selv har tastet
      eller sat kryds ved.
   2. Sætningerne under "Fra din egen beskrivelse" er hendes rå tekst,
      splittet ved punktum/linjeskift og trimmet — ORDRET, ingen
      omskrivning. Et ord som "velholdt" optræder her, kun hvis hun selv
      skrev det — for så er det jo netop hendes egen sætning, ikke en
      påstand vi har lagt oveni. Ingen backend-sprogmodel findes i denne
      stak (se sektionsheaderen ovenfor) — det her er en skabelon, ikke en
      omskrivning, og den kaldes aldrig af sig selv. */
function strukturerBeskrivelse(data){
  const navn = [data.brand, data.model].filter(Boolean).join(' ') || 'Motorcyklen';
  const linje1 = data.year ? `${navn} årgang ${data.year}, ${formatKm(data.km)}.` : `${navn}, ${formatKm(data.km)}.`;

  const raa = (data.description || '').trim();
  const saetninger = raa.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  const linje2 = saetninger[0] || '';
  const resten = saetninger.slice(1);

  const fakta = [];
  if (data.serviceHistorik) fakta.push(`Servicehistorik: ${data.serviceHistorik}`);
  if (data.antalEjere) fakta.push(`Antal ejere: ${data.antalEjere}`);
  if (data.sidsteSyn) fakta.push(`Sidst synet: ${data.sidsteSyn}`);
  if (data.daekAar) fakta.push(`Dæk skiftet: ${data.daekAar}`);
  if (data.vinterklar) fakta.push('Vinterklargjort');
  if (data.kanNedsaettesA2) fakta.push('Kan nedsættes til A2');
  const udstyr = (data.equipment || []).map(equipmentLabel);
  if (udstyr.length) fakta.push(`Udstyr: ${udstyr.join(', ')}`);

  const dele = [linje1];
  if (linje2) dele.push(linje2);
  if (fakta.length) dele.push(fakta.map(f => `• ${f}`).join('\n'));
  if (resten.length) dele.push('Fra din egen beskrivelse:\n' + resten.map(s => `• ${s}`).join('\n'));
  dele.push('Skriv gerne, hvis du har spørgsmål eller vil aftale en fremvisning.');
  return dele.join('\n\n');
}

/* Tegner hele assistentpanelet i trin 4. Kaldes fra renderPreview(), som
   allerede sætter `formData` og kører hver gang sælgeren når "Gennemse". */
function renderSeoAssistent(data){
  const mount = document.getElementById('seo-assist-panel');
  if (!mount) return;

  const gaps = manglerListe(data);
  const gapsHTML = gaps.length
    ? `<div class="detail-section" style="margin-top:20px;">
         <h2 style="font-size:16px;">Før du udgiver</h2>
         <ul class="equipment-list" style="grid-template-columns:1fr;">
           ${gaps.map(g => `<li><span style="color:var(--color-danger); display:inline-flex;">${Icon.alertTriangle}</span>${escapeHTML(g)}</li>`).join('')}
         </ul>
       </div>`
    : `<div class="preview-note" style="margin-top:20px;">${Icon.checkCircle}<span>Ingen flere forslag herfra — annoncen dækker det, købere typisk spørger om.</span></div>`;

  const { kk, chips } = foreslaaedeMaerkater(data);
  const chipsHTML = chips.length
    ? `<div class="detail-section" style="margin-top:20px;">
         <h2 style="font-size:16px;">Sådan bliver annoncen mærket</h2>
         <div class="chip-group">${chips.map(c => `<span class="chip active" style="cursor:default;">${escapeHTML(c)}</span>`).join('')}</div>
         ${!kk.kode ? `<p class="field-hint" style="margin-top:8px;">${escapeHTML(kk.forklaring)}</p>` : ''}
       </div>`
    : '';

  const titel = serpTitel(data);
  const besk = serpBeskrivelse(data);
  const serpHTML = titel
    ? `<div class="detail-section" style="margin-top:20px;">
         <h2 style="font-size:16px;">Titel og søgetekst</h2>
         <p class="field-hint" style="margin-bottom:10px;">Bikerbasen sammensætter automatisk titel og søgetekst af dine egne tal (mærke, model, årgang, pris, km, ccm, stand, by). Her er de, som de bliver ud fra det, du har udfyldt nu.</p>
         <div style="border:1px solid var(--color-border); border-radius:var(--radius-sm); padding:12px 14px;">
           <p style="font-weight:600; margin:0 0 4px;">${escapeHTML(titel)}</p>
           <p class="field-hint" style="margin:0;">${escapeHTML(besk)}</p>
         </div>
         <p class="field-hint" style="margin-top:6px;">Titel: ${titel.length} tegn${titel.length > 65 ? ' (Google forkorter typisk over ca. 65)' : ''}. Søgetekst: ${besk.length} tegn.</p>
       </div>`
    : '';

  mount.innerHTML = gapsHTML + chipsHTML + serpHTML;
}

/* Knapperne omkring "Strukturér min beskrivelse" (opret-annonce.html trin 2).
   Forslaget skriver ALDRIG ind i #f-desc af sig selv — kun når sælgeren selv
   trykker "Brug denne tekst". */
function wireSeoAssist(){
  document.getElementById('btn-strukturer')?.addEventListener('click', () => {
    const data = collectFormData();
    document.getElementById('beskrivelse-forslag-tekst').textContent = strukturerBeskrivelse(data);
    document.getElementById('beskrivelse-forslag-boks').hidden = false;
  });
  document.getElementById('btn-brug-forslag')?.addEventListener('click', () => {
    document.getElementById('f-desc').value = document.getElementById('beskrivelse-forslag-tekst').textContent;
    document.getElementById('beskrivelse-forslag-boks').hidden = true;
    toast('Beskrivelsen er opdateret — læs den gerne igennem, før du fortsætter.');
  });
  document.getElementById('btn-luk-forslag')?.addEventListener('click', () => {
    document.getElementById('beskrivelse-forslag-boks').hidden = true;
  });
}

function renderPreview(){
  formData = collectFormData();
  const user = Store.getUser() || { name: 'Dig', isDealer: false };
  // Vis det RIGTIGE forsidebillede og antal — ikke en pladsholder. Rækkefølgen
  // matcher billed-gitteret (eksisterende først, så nye), så forsiden stemmer.
  const photoUrls = [...existingPhotos.map(p => p.url), ...uploadedPhotos.map(p => p.url)];
  const previewListing = { id: 'preview', ...formData, isDealer: !!user.isDealer, createdAt: new Date().toISOString(), photoUrls, photos: photoUrls.length || 1, seller: sellerFromUser(user) };
  document.getElementById('preview-note').innerHTML = `${Icon.info}<span>Sådan vil din annonce se ud i søgeresultater. Tjek at alt er korrekt, før du udgiver.</span>`;
  document.getElementById('preview-card-mount').innerHTML = listingCardHTML(previewListing).replace('card-link" aria-label', 'card-link" tabindex="-1" style="pointer-events:none;" aria-label');
  const eqLabels = (formData.equipment || []).map(e => equipmentLabel(e));
  document.getElementById('preview-details').innerHTML = `
    <div class="spec-grid" style="margin-top:24px;">
      <div class="spec-item"><span class="spec-icon">${Icon.calendar} Årgang</span><b>${formData.year}</b></div>
      <div class="spec-item"><span class="spec-icon">${Icon.gauge} Km-stand</span><b>${formatKm(formData.km)}</b></div>
      <div class="spec-item"><span class="spec-icon">${Icon.engine} Motor</span><b>${formatCcm(formData.ccm)}</b></div>
      <div class="spec-item"><span class="spec-icon">${Icon.mapPin} Lokation</span><b>${escapeHTML(formData.city || '—')}</b></div>
      <div class="spec-item"><span class="spec-icon">${Icon.checkCircle} Stand</span><b>${escapeHTML(formData.condition)}</b></div>
      <div class="spec-item"><span class="spec-icon">${Icon.checkCircle} Registrering</span><b>${escapeHTML(formData.registration)}</b></div>
      <div class="spec-item"><span class="spec-icon">${Icon.lock} Afgift</span><b>${escapeHTML(formData.afgift)}</b></div>
      ${formData.serviceHistorik ? `<div class="spec-item"><span class="spec-icon">${Icon.shieldCheck} Servicehistorik</span><b>${escapeHTML(formData.serviceHistorik)}</b></div>` : ''}
      ${formData.antalEjere ? `<div class="spec-item"><span class="spec-icon">${Icon.user} Antal ejere</span><b>${Number(formData.antalEjere)}</b></div>` : ''}
      ${formData.sidsteSyn ? `<div class="spec-item"><span class="spec-icon">${Icon.checkCircle} Sidste syn</span><b>${Number(formData.sidsteSyn)}</b></div>` : ''}
      ${formData.daekAar ? `<div class="spec-item"><span class="spec-icon">${Icon.gauge} Dæk skiftet</span><b>${Number(formData.daekAar)}</b></div>` : ''}
      ${formData.vinterklar ? `<div class="spec-item"><span class="spec-icon">${Icon.shieldCheck} Vinterklargjort</span><b>Ja</b></div>` : ''}
      ${formData.kanNedsaettesA2 ? `<div class="spec-item"><span class="spec-icon">${Icon.shieldCheck} Kan nedsættes til A2</span><b>Ja</b></div>` : ''}
    </div>
    ${formData.description ? `<div class="detail-section" style="margin-top:24px;"><h2>Beskrivelse</h2><p style="white-space:pre-wrap;">${escapeHTML(formData.description)}</p></div>` : '<div class="detail-section" style="margin-top:24px;"><h2>Beskrivelse</h2><p style="color:var(--color-fg-muted);">Du har ikke skrevet en beskrivelse endnu — en god beskrivelse giver flere henvendelser.</p></div>'}
    ${eqLabels.length ? `<div class="detail-section" style="margin-top:24px;"><h2>Udstyr (${eqLabels.length})</h2><ul class="equipment-list">${eqLabels.map(l => `<li>${Icon.checkCircle}${escapeHTML(l)}</li>`).join('')}</ul></div>` : ''}`;
  renderSeoAssistent(formData);
}

function showUploadProgress(done, total){
  let el = document.getElementById('upload-progress');
  if (!el){
    el = document.createElement('div');
    el.id = 'upload-progress';
    el.className = 'upload-progress';
    document.querySelector('.form-actions').insertAdjacentElement('beforebegin', el);
  }
  const pct = total ? Math.round((done / total) * 100) : 100;
  el.innerHTML = `<span>Uploader billeder ${done}/${total}</span><span class="bar"><span style="width:${pct}%"></span></span>`;
}

/* Vises når en privat konto rammer gratis-grænsen på 3 aktive annoncer. */
function visForhandlerGraense(antal){
  const nextBtn = document.getElementById('step-next');
  nextBtn.disabled = false;
  nextBtn.textContent = 'Udgiv annonce';
  openInfoModal('Du har nået gratis-grænsen', `
    <p>Private konti kan have <strong>3 aktive annoncer</strong> gratis, og du har allerede ${antal}.</p>
    <p>Vil du sælge flere motorcykler, kan du blive <strong>forhandler</strong> og få ubegrænsede annoncer, en shop-side og et forhandler-badge.</p>
    <p style="margin-bottom:0;"><a href="mine-annoncer.html?tab=konto" class="btn btn-primary btn-block" style="margin-top:8px;">Se forhandler-abonnement</a></p>
  `);
}

async function publishListing(){
  if (!document.getElementById('f-terms').checked || !document.getElementById('f-captcha').checked){
    toast('Bekræft venligst vilkår og robot-tjek for at udgive annoncen');
    return;
  }
  const nextBtn = document.getElementById('step-next');

  /* ---- Uden backend: som før, gemt lokalt ---- */
  if (!db.enabled){
    const user = Store.getUser() || { name: 'Dig', isDealer: false };
    const newListing = {
      id: Date.now(), ...formData, isDealer: !!user.isDealer,
      createdAt: new Date().toISOString(),
      photos: Math.max(3, uploadedPhotos.length || 4),
      seller: sellerFromUser(user),
    };
    Store.addMyListing(newListing);
    Store.clearDraft();
    toast('Din annonce er udgivet (gemt lokalt)');
    setTimeout(() => { window.location.href = `annonce.html?id=${newListing.id}`; }, 900);
    return;
  }

  /* ---- Med backend: skriv til databasen ---- */
  const user = await db.currentUser();
  if (!user){
    toast('Du skal være logget ind for at udgive en annonce');
    setTimeout(() => { window.location.href = 'login.html?redirect=opret-annonce.html'; }, 1200);
    return;
  }

  // Gratis-grænse: 3 aktive annoncer for private. Serveren håndhæver den
  // (trigger), men vi tjekker først for at give en venlig besked frem for en
  // rå databasefejl. Gælder kun nye annoncer, ikke redigering.
  // Springes over, mens FRI_ADGANG er slået til.
  if (!FRI_ADGANG && !editingId && (Store.getUser()?.plan || 'free') !== 'dealer'){
    const antal = await db.myActiveListingCount();
    if (antal >= 3){
      visForhandlerGraense(antal);
      return;
    }
  }

  nextBtn.disabled = true;
  nextBtn.textContent = editingId ? 'Gemmer…' : 'Udgiver…';

  const kolonner = {
    brand: formData.brand, model: formData.model, type: formData.type,
    year: formData.year, km: formData.km, ccm: formData.ccm, power: formData.power,
    price: formData.price, condition: formData.condition,
    registration: formData.registration, afgift: formData.afgift,
    fuel: formData.fuel, drive: formData.drive,
    cylinders: formData.cylinders, color: formData.color,
    service_historik: formData.serviceHistorik,
    antal_ejere: formData.antalEjere,
    sidste_syn: formData.sidsteSyn,
    daek_aar: formData.daekAar,
    vinterklar: formData.vinterklar,
    kan_nedsaettes_a2: formData.kanNedsaettesA2,
    equipment: formData.equipment,
    postnr: formData.postnr, city: formData.city, region: formData.region,
    description: formData.description,
  };

  const { data: created, error } = editingId
    ? await db.updateListing(editingId, kolonner)
    : await db.createListing(kolonner);

  if (error){
    nextBtn.disabled = false;
    nextBtn.textContent = editingId ? 'Gem ændringer' : 'Udgiv annonce';
    // Serveren afviste pga. gratis-grænsen (fallback hvis for-tjekket blev
    // omgået, fx to faner åbne samtidig).
    if (/GRAENSE/.test(error.message || '')){ visForhandlerGraense(3); return; }
    toast('Annoncen kunne ikke gemmes: ' + error.message, { type: 'error' });
    return;
  }

  // Kun de billeder brugeren udtrykkeligt har fjernet, slettes.
  for (const foto of removedPhotoIds){
    const res = await db.deleteListingPhoto(foto.id, foto.path);
    if (res.error) console.warn('Billedet kunne ikke slettes:', res.error.message);
  }

  // Billeder uploades efter annoncen, så de kan knyttes til dens id. Nye
  // lægges efter dem der bliver liggende, så forsidebilledet ikke skifter.
  //
  // Positionen regnes ud fra den HØJESTE position, der bliver liggende — ikke
  // ud fra antallet. `existingPhotos.length + i` kolliderede, så snart et
  // billede var fjernet midt i rækken: tre billeder på position 0, 1, 2, fjern
  // det i midten, og det næste nye billede fik position 2 — samme position som
  // det, der stadig lå der. Rækkefølgen mellem to lige positioner er
  // udefineret, og position 0 er forsidebilledet. Altså: den ene ting på hele
  // kortet, køberen ser først, var overladt til tilfældet.
  const withFiles = uploadedPhotos.filter(p => p.file);
  const naestePosition = existingPhotos.reduce(
    (max, p) => Math.max(max, Number(p.position) || 0), -1) + 1;
  const failed = [];
  for (let i = 0; i < withFiles.length; i++){
    showUploadProgress(i, withFiles.length);
    const res = await db.uploadListingPhoto(created.id, withFiles[i].file, naestePosition + i);
    if (res.error){
      failed.push({ navn: withFiles[i].name, grund: res.error.message });
      console.warn('Billedet kunne ikke uploades:', withFiles[i].name, '—', res.error.message);
    }
  }
  if (withFiles.length) showUploadProgress(withFiles.length, withFiles.length);

  Store.clearDraft();
  if (failed.length){
    // Sig HVILKET billede og HVORFOR. Før stod der kun et antal, og så blev
    // sælgeren sendt videre efter ét sekund til en annonce uden billeder —
    // uden at vide hvad der gik galt, eller at billederne kan lægges på igen.
    // Beskeden får længere tid på skærmen, netop fordi den skal læses.
    toast(`Annoncen er gemt, men ${failed.length} af ${withFiles.length} billeder kunne ikke uploades: `
      + `${failed[0].grund} Du kan prøve igen under "Rediger annonce".`, { type: 'error' });
    setTimeout(() => { window.location.href = `annonce.html?id=${created.id}`; }, 4500);
    return;
  }
  toast(editingId ? 'Ændringerne er gemt!' : 'Din annonce er udgivet!');
  setTimeout(() => { window.location.href = `annonce.html?id=${created.id}`; }, 1000);
}

/* Fylder formularen med data i samme form som collectFormData returnerer.
   Bruges både af den gemte kladde og af redigering af en eksisterende annonce. */
function fillForm(data){
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el && value != null && value !== '') el.value = value;
  };
  const typeRadio = document.querySelector(`input[name="bike-type"][value="${data.type}"]`);
  if (typeRadio){ typeRadio.checked = true; typeRadio.dispatchEvent(new Event('change', { bubbles: true })); }

  set('f-brand', data.brand);
  // Modelforslagene afhænger af mærket, så det skal opdateres først.
  document.getElementById('f-brand')?.dispatchEvent(new Event('change', { bubbles: true }));
  set('f-model', data.model);
  ['year','km','ccm','power','registration','afgift','fuel','drive',
   'cylinders','color','price','condition','city','region'].forEach(k => set('f-' + k, data[k]));
  set('f-desc', data.description);
  set('f-service', data.serviceHistorik);
  set('f-ejere', data.antalEjere);
  set('f-synsaar', data.sidsteSyn);
  set('f-daek', data.daekAar);
  const vinterCb = document.getElementById('f-vinter'); if (vinterCb) vinterCb.checked = !!data.vinterklar;
  const a2Cb = document.getElementById('f-a2nedsat'); if (a2Cb) a2Cb.checked = !!data.kanNedsaettesA2;
  // Postnummerfeltet viser "1620 København V"; kun tallet gemmes videre.
  set('f-postnr', data.postnr ? `${data.postnr}${data.city ? ' ' + data.city : ''}` : '');

  document.querySelectorAll('#equipment-groups input[data-equipment]').forEach(cb => {
    cb.checked = (data.equipment || []).includes(cb.dataset.equipment);
  });
  updateEqCounts();
}

/* Lægger en gemt kladde tilbage i formularen.

   "Gem kladde" skrev til localStorage, men ingen læste det igen — knappen
   kvitterede med "Kladde gemt" og smed så indtastningen væk. Her hentes den
   tilbage, så en afbrudt annonce kan gøres færdig senere. */
function restoreDraft(){
  const draft = Store.getDraft()?.form;
  if (!draft) return false;
  fillForm(draft);
  return true;
}

/* Åbner en eksisterende annonce til redigering. Returnerer false hvis id'et
   ikke findes eller ikke tilhører den bruger, der er logget ind — RLS ville
   alligevel afvise gemmet, og det er bedre at sige det med det samme. */
function startEditing(id){
  const listing = Store.getAllListings().find(l => String(l.id) === String(id));
  if (!listing){
    toast('Annoncen blev ikke fundet');
    return false;
  }
  const user = Store.getUser();
  const ejer = user && (listing.seller?.id === user.id || !isUuid(String(listing.id)));
  if (!ejer){
    toast('Du kan kun redigere dine egne annoncer');
    return false;
  }

  editingId = listing.id;
  fillForm(listing);

  // Annoncens nuværende billeder lægges i gitteret, så de kan ses og
  // fjernes enkeltvis. Røres de ikke, bliver de på annoncen.
  existingPhotos = (listing.photoRows || []).slice();
  removedPhotoIds = [];
  renderPhotoGrid();

  document.title = 'Rediger annonce — Bikerbasen';
  document.querySelector('.page-title-bar h1').textContent = 'Rediger annonce';
  const lead = document.querySelector('.page-title-bar p');
  if (lead) lead.textContent = 'Ret oplysningerne og gem. Billederne bliver på annoncen, medmindre du selv fjerner dem.';
  return true;
}

document.addEventListener('DOMContentLoaded', async () => {
  await backendReady();

  // Med rigtig backend skal annoncen knyttes til en bruger.
  if (db.enabled && !Store.getUser()?.remote){
    // Tag ?rediger= med over login, ellers lander man på en tom ny annonce.
    const tilbage = 'opret-annonce.html' + window.location.search;
    window.location.replace('login.html?redirect=' + encodeURIComponent(tilbage));
    return;
  }

  renderHeader('opret-annonce.html');
  populateStaticFields();
  wirePhotoUpload();
  renderPhotoGrid();
  wireDocUpload();
  renderDocGrid();
  wireSeoAssist();

  const redigerId = new URLSearchParams(window.location.search).get('rediger');
  if (redigerId){
    if (!startEditing(redigerId)){
      setTimeout(() => { window.location.href = 'mine-annoncer.html'; }, 1500);
      return;
    }
  } else if (restoreDraft()){
    toast('Din gemte kladde er hentet frem');
  }
  goToStep(1);

  document.getElementById('step-next').addEventListener('click', () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < STEP_LABELS.length) goToStep(currentStep + 1);
    else publishListing();
  });
  document.getElementById('step-back').addEventListener('click', () => {
    if (currentStep > 1) goToStep(currentStep - 1);
  });
  document.getElementById('save-draft').addEventListener('click', () => {
    Store.saveDraft('form', collectFormData());
    toast('Kladde gemt');
  });
});
