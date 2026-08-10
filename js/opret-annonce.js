const STEP_LABELS = ['Type & specs', 'Pris & beskrivelse', 'Billeder', 'Gennemse'];
let currentStep = 1;
let uploadedPhotos = []; // { url, name }
let uploadedDocs = []; // { url, name }
let formData = {};
/* Sat når siden åbnes som ?rediger=<id>. Så gemmer formularen oven i den
   eksisterende annonce i stedet for at oprette en ny. */
let editingId = null;
/* Billeder der allerede ligger på annoncen: { id, path, url }. De bevares
   ved redigering og fjernes kun, hvis brugeren selv trykker på krydset. */
let existingPhotos = [];
let removedPhotoIds = [];

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

function validateStep(n){
  const section = document.querySelector(`.form-step[data-step="${n}"]`);
  let valid = true;
  section.querySelectorAll('[required]').forEach(el => {
    const field = el.closest('.field') || el.closest('.checkbox-inline');
    const ok = el.type === 'checkbox' ? el.checked : String(el.value).trim() !== '';
    if (!ok){
      valid = false;
      if (field) field.classList.add('has-error');
      el.style.borderColor = 'var(--color-danger)';
    } else {
      if (field) field.classList.remove('has-error');
      el.style.borderColor = '';
    }
  });
  if (n === 1){
    const typeChecked = document.querySelector('input[name="bike-type"]:checked');
    if (!typeChecked){ valid = false; toast('Vælg venligst en motorcykeltype'); }
    const vin = document.getElementById('f-vin').value.trim();
    if (vin && !isValidVIN(vin)){
      valid = false;
      document.getElementById('f-vin-field').classList.add('has-error');
      toast('Stelnummeret har et ugyldigt format');
    }
  }
  if (n === 2){
    // Et frit indtastet postnummer uden bekræftet valg ville give en annonce
    // uden by/region — og dermed usynlig i regionsfiltret.
    if (!document.getElementById('f-city').value){
      valid = false;
      document.getElementById('f-postnr').closest('.field').classList.add('has-error');
      toast('Vælg et postnummer fra listen');
    }
  }
  if (!valid) toast('Udfyld venligst alle felter markeret med *');
  return valid;
}

function populateStaticFields(){
  document.getElementById('type-radio-group').innerHTML = TYPES.map(t => `
    <label class="radio-card">
      <input type="radio" name="bike-type" value="${t.id}">
      <span class="radio-card-inner">${Icon.bike}<span>${t.label}</span></span>
    </label>`).join('');

  const brandSelect = document.getElementById('f-brand');
  brandSelect.innerHTML = `<option value="">Vælg mærke</option>` + Object.keys(BRANDS_BY_MODEL).sort().map(b => `<option value="${b}">${b}</option>`).join('');
  brandSelect.addEventListener('change', () => {
    const models = BRANDS_BY_MODEL[brandSelect.value] || [];
    document.getElementById('model-suggestions').innerHTML = models.map(m => `<option value="${m}">`).join('');
  });

  document.getElementById('f-condition').innerHTML = CONDITIONS.map(c => `<option value="${c}">${c}</option>`).join('');
  document.getElementById('f-afgift').innerHTML = AFGIFT_STATUSES.map(a => `<option value="${a}">${a}</option>`).join('');

  // Teknikfelterne er valgfrie — en tom værdi betyder "ikke oplyst" og
  // udelukker ikke annoncen fra søgninger uden det filter.
  const blank = '<option value="">Ikke oplyst</option>';
  document.getElementById('f-fuel').innerHTML = blank + FUELS.map(f => `<option value="${f}">${f}</option>`).join('');
  document.getElementById('f-drive').innerHTML = blank + DRIVES.map(d => `<option value="${d}">${d}</option>`).join('');
  document.getElementById('f-cylinders').innerHTML = blank + CYLINDERS.map(c => `<option value="${c}">${c}</option>`).join('');
  document.getElementById('f-color').innerHTML = blank + COLORS.map(c => `<option value="${c}">${c}</option>`).join('');

  document.getElementById('equipment-groups').innerHTML = EQUIPMENT_GROUPS.map(g => `
    <details class="filter-group" open>
      <summary>${g.group}<span class="chev">${Icon.chevronDown}</span></summary>
      <div class="filter-body equipment-grid">
        ${g.items.map(i => `<label class="checkbox-row"><input type="checkbox" data-equipment="${i.id}">${i.label}</label>`).join('')}
      </div>
    </details>`).join('');

  wirePostnrCombo();

  document.getElementById('f-vin').addEventListener('input', (e) => {
    const vin = e.target.value.trim();
    document.getElementById('f-vin-field').classList.toggle('has-error', vin.length > 0 && !isValidVIN(vin));
  });

  document.getElementById('upload-icon-mount').innerHTML = Icon.upload;
  document.getElementById('doc-upload-icon-mount').innerHTML = Icon.upload;
  document.getElementById('back-icon').innerHTML = Icon.chevronLeft;
}

/* Søgbar postnummervælger.
   En dropdown duer ikke: der er 1089 postnumre, og "København K" alene fylder
   232 af dem. Man skriver i stedet postnummer eller bynavn og vælger et træf.
   By og region gemmes i skjulte felter, så de altid følger et rigtigt valg. */
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
      if (!document.getElementById('f-city').value){
        const exact = findPostnr(input.value.trim().split(' ')[0]);
        if (exact) commit(exact);
      }
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

function handleFiles(files){
  Array.from(files).slice(0, 12 - uploadedPhotos.length).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    // Selve File-objektet gemmes, så det kan uploades ved udgivelse.
    uploadedPhotos.push({ url: URL.createObjectURL(file), name: file.name, file });
  });
  renderPhotoGrid();
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

function handleDocFiles(files){
  Array.from(files).slice(0, 8 - uploadedDocs.length).forEach(file => {
    uploadedDocs.push({ url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null, name: file.name });
  });
  renderDocGrid();
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

function renderPhotoGrid(){
  const grid = document.getElementById('photo-grid');

  // Ved redigering vises annoncens nuværende billeder først. De blev slet
  // ikke vist før, så det lignede at redigeringen havde slettet dem — og
  // der var ingen måde at fjerne ét enkelt på.
  const eksisterende = existingPhotos.map((p, i) => `
    <div class="photo-thumb">
      <img src="${p.url}" alt="Billede ${i + 1} på annoncen">
      ${i === 0 ? '<span class="cover-tag">Forside</span>' : ''}
      <button type="button" class="remove-photo" data-remove-existing="${p.id}" aria-label="Fjern dette billede fra annoncen">${Icon.close}</button>
    </div>`).join('');

  const nye = uploadedPhotos.map((p, i) => `
    <div class="photo-thumb">
      <img src="${p.url}" alt="${escapeHTML(p.name)}">
      ${!existingPhotos.length && i === 0 ? '<span class="cover-tag">Forside</span>' : '<span class="cover-tag new">Ny</span>'}
      <button type="button" class="remove-photo" data-remove="${i}" aria-label="Fjern billede">${Icon.close}</button>
    </div>`).join('');

  grid.innerHTML = eksisterende + nye;

  grid.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => { uploadedPhotos.splice(Number(btn.dataset.remove), 1); renderPhotoGrid(); });
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
    power: Number(document.getElementById('f-power').value) || Math.round((Number(document.getElementById('f-ccm').value)||0) * 0.07),
    vin: document.getElementById('f-vin').value || `VIN${Date.now()}`,
    registration: document.getElementById('f-registration').value,
    afgift: document.getElementById('f-afgift').value,
    fuel: document.getElementById('f-fuel').value || null,
    drive: document.getElementById('f-drive').value || null,
    cylinders: Number(document.getElementById('f-cylinders').value) || null,
    color: document.getElementById('f-color').value || null,
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

function renderPreview(){
  formData = collectFormData();
  const user = Store.getUser() || { name: 'Dig', isDealer: false };
  const previewListing = { id: 'preview', ...formData, isDealer: !!user.isDealer, createdAt: new Date('2026-07-26T09:00:00').toISOString(), photos: 4, seller: sellerFromUser(user) };
  document.getElementById('preview-note').innerHTML = `${Icon.info}<span>Sådan vil din annonce se ud i søgeresultater. Tjek at alt er korrekt, før du udgiver.</span>`;
  document.getElementById('preview-card-mount').innerHTML = listingCardHTML(previewListing).replace('card-link" aria-label', 'card-link" tabindex="-1" style="pointer-events:none;" aria-label');
  document.getElementById('preview-details').innerHTML = `
    <div class="spec-grid" style="margin-top:24px;">
      <div class="spec-item"><span class="spec-icon">${Icon.calendar} Årgang</span><b>${formData.year}</b></div>
      <div class="spec-item"><span class="spec-icon">${Icon.gauge} Km-stand</span><b>${formatKm(formData.km)}</b></div>
      <div class="spec-item"><span class="spec-icon">${Icon.engine} Motor</span><b>${formatCcm(formData.ccm)}</b></div>
      <div class="spec-item"><span class="spec-icon">${Icon.mapPin} Lokation</span><b>${formData.city || '—'}</b></div>
      <div class="spec-item"><span class="spec-icon">${Icon.checkCircle} Stand</span><b>${formData.condition}</b></div>
      <div class="spec-item"><span class="spec-icon">${Icon.vin} Registrering</span><b>${formData.registration}</b></div>
      <div class="spec-item"><span class="spec-icon">${Icon.lock} Afgift</span><b>${formData.afgift}</b></div>
    </div>`;
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
    vin: formData.vin && isValidVIN(formData.vin) ? formData.vin.toUpperCase() : null,
    registration: formData.registration, afgift: formData.afgift,
    fuel: formData.fuel, drive: formData.drive,
    cylinders: formData.cylinders, color: formData.color,
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
    toast('Annoncen kunne ikke gemmes: ' + error.message);
    return;
  }

  // Kun de billeder brugeren udtrykkeligt har fjernet, slettes.
  for (const foto of removedPhotoIds){
    const res = await db.deleteListingPhoto(foto.id, foto.path);
    if (res.error) console.warn('Billedet kunne ikke slettes:', res.error.message);
  }

  // Billeder uploades efter annoncen, så de kan knyttes til dens id. Nye
  // lægges efter dem der bliver liggende, så forsidebilledet ikke skifter.
  const withFiles = uploadedPhotos.filter(p => p.file);
  const failed = [];
  for (let i = 0; i < withFiles.length; i++){
    showUploadProgress(i, withFiles.length);
    const res = await db.uploadListingPhoto(created.id, withFiles[i].file, existingPhotos.length + i);
    if (res.error) failed.push(withFiles[i].name);
  }
  if (withFiles.length) showUploadProgress(withFiles.length, withFiles.length);

  Store.clearDraft();
  if (failed.length){
    toast(`Annoncen er gemt, men ${failed.length} billede(r) kunne ikke uploades`);
  } else {
    toast(editingId ? 'Ændringerne er gemt!' : 'Din annonce er udgivet!');
  }
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
  ['year','km','ccm','power','vin','registration','afgift','fuel','drive',
   'cylinders','color','price','condition','city','region'].forEach(k => set('f-' + k, data[k]));
  set('f-desc', data.description);
  // Postnummerfeltet viser "1620 København V"; kun tallet gemmes videre.
  set('f-postnr', data.postnr ? `${data.postnr}${data.city ? ' ' + data.city : ''}` : '');

  document.querySelectorAll('#equipment-groups input[data-equipment]').forEach(cb => {
    cb.checked = (data.equipment || []).includes(cb.dataset.equipment);
  });
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
