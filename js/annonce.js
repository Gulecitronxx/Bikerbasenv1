let currentListing = null;
let currentPhotoIndex = 0;
let currentPhotos = [];

/* De forrenderede annoncesider har ingen ?id= i adressen — id'et staar i et
   meta-tag skrevet ved build. Sidens indhold er allerede korrekt naar den
   loades; herfra overtager vi og goer den interaktiv. */
function getIdFromURL(){
  return new URLSearchParams(window.location.search).get('id')
    || document.querySelector('meta[name="listing-id"]')?.content
    || null;
}

/* Rigtige uploadede fotos når annoncen har dem; ellers de illustrerede
   placeholders, så demoannoncerne stadig ser hele ud. */
function buildPhotoSet(listing){
  const urls = listing.photoUrls || [];
  if (urls.length){
    return urls.map((u, i) =>
      `<img src="${escapeHTML(u)}" alt="${escapeHTML(listing.brand + ' ' + listing.model)} — billede ${i + 1}"
            class="card-photo" decoding="async">`);
  }
  const count = Math.max(3, listing.photos || 4);
  return Array.from({ length: count }, (_, i) =>
    bikeArtSVG(listing.type, { id: `detail-${listing.id}-${i}`, flip: i % 2 === 1 }));
}

function renderGallery(){
  const main = document.getElementById('gallery-main-img');
  main.innerHTML = currentPhotos[currentPhotoIndex];
  document.getElementById('gallery-counter').textContent = `${currentPhotoIndex+1} / ${currentPhotos.length}`;
  document.querySelectorAll('.gallery-thumbs button').forEach((b, i) => b.classList.toggle('active', i === currentPhotoIndex));
}

function shiftPhoto(dir){
  currentPhotoIndex = (currentPhotoIndex + dir + currentPhotos.length) % currentPhotos.length;
  renderGallery();
}

function initials(name){
  return name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
}

/* Sælgerens identitet og kontaktoplysninger er kun synlige for indloggede
   brugere — det beskytter både køber og sælger mod skrabning og uønsket
   henvendelse. Er man ikke logget ind, vises et login-kort i stedet. */
function sellerSidebarHTML(listing, { loggedIn, sellerName, avgRating, reviewCount }){
  if (!loggedIn){
    const her = location.pathname.split('/').pop() + location.search;
    const redirect = encodeURIComponent(her);
    return `
      <div class="sidebar-card seller-locked">
        <div class="seller-locked-icon">${Icon.lock}</div>
        <h2 class="seller-locked-title">Log ind for at se sælger</h2>
        <p>Sælgerens navn, profil og kontaktoplysninger er kun synlige for indloggede brugere. Det beskytter både købere og sælgere.</p>
        <a href="login.html?redirect=${redirect}" class="btn btn-primary btn-block">${Icon.user}Log ind</a>
        <a href="login.html?redirect=${redirect}" class="btn btn-outline btn-block">Opret gratis profil</a>
        <div class="safety-tip">${Icon.info}<span>Mød altid sælger et sikkert sted, og betal aldrig depositum uden at have set motorcyklen fysisk.</span></div>
      </div>`;
  }
  return `
      <div class="sidebar-card">
        <div class="seller-row">
          <div class="avatar">${escapeHTML(initials(listing.seller.name))}</div>
          <div>
            <div class="seller-name">${sellerName}</div>
            <div class="seller-sub">${listing.seller.isDealer ? 'Forhandler' : 'Privat sælger'} · ${escapeHTML(listing.seller.city)}</div>
          </div>
        </div>
        <div style="margin-top:10px;">${verifiedBadgeHTML(listing.seller)}</div>
        <div class="seller-stats">
          <div class="seller-stat"><b>${avgRating ?? '–'}</b><span>Bedømmelse</span></div>
          <div class="seller-stat"><b>${reviewCount}</b><span>Anmeldelser</span></div>
          <div class="seller-stat"><b>${listing.seller.memberSince}</b><span>Medlem siden</span></div>
        </div>
        <div class="contact-actions">
          <button type="button" class="btn btn-primary btn-block" id="open-contact-modal">${Icon.mail}Skriv til sælger</button>
          <button type="button" class="btn btn-outline btn-block" id="reveal-phone-btn">${Icon.phone}Vis telefonnummer</button>
          <button type="button" class="btn btn-outline btn-block" id="open-payment-modal">${Icon.lock}Betal sikkert (MobilePay)</button>
          <button type="button" class="btn btn-outline btn-block" id="share-listing-btn">${Icon.share}Del annonce</button>
        </div>
        <div class="safety-tip">${Icon.info}<span>Mød altid sælger et sikkert sted, og betal aldrig depositum uden at have set motorcyklen fysisk.</span></div>
      </div>

      <div class="sidebar-card">
        <a href="forhandler.html?id=${encodeURIComponent(listing.seller.id || "")}" class="btn btn-outline btn-block">${Icon.user}Se sælgerprofil</a>
      </div>`;
}

/* Tæller én visning pr. annonce pr. browsersession.

   Uden spærren ville et par tryk på tilbage-knappen puste tallet op, og
   dashboardet ville vise trafik der ikke findes. sessionStorage frem for
   localStorage: en ny dag eller et nyt vindue er et nyt reelt besøg. */
function tælVisning(listingId){
  if (!isUuid(String(listingId))) return;
  const nøgle = 'bb_set_' + listingId;
  try {
    if (sessionStorage.getItem(nøgle)) return;
    sessionStorage.setItem(nøgle, '1');
  } catch (e) { /* privat tilstand: tæl hellere for meget end slet ikke */ }
  db.recordListingEvent?.(listingId, 'view');
}

/* Detaljevisning af en annonce, vi ikke hoster.

   Bevidst mager. Vi gemmer kun de felter, der skal til for at finde og
   videresende — der ER ingen fuld beskrivelse, intet galleri og ingen
   kontaktoplysninger at vise, og et layout, der lader som om, ville bare
   have tomme felter. Køberen skal videre til kilden, og det er hele siden. */
function renderExternalListing(listing){
  const kilde = escapeHTML(listing.source?.navn || 'kilden');
  const domaene = escapeHTML(listing.source?.domaene || '');
  const brand = escapeHTML(listing.brand), model = escapeHTML(listing.model);
  const href = sikkerUrl(listing.externalUrl);
  const foto = sikkerUrl(listing.photoUrls?.[0]);

  document.title = `${brand} ${model} — hos ${kilde} — Bikerbasen`;
  // Vi ejer ikke indholdet, og en kopi af forhandlerens annonce skal ikke
  // konkurrere med originalen i Google.
  Seo.setMeta('meta[name="robots"]', 'name', 'robots', 'noindex, follow');

  const h1 = document.getElementById('listing-h1');
  if (h1) h1.textContent = `${listing.brand} ${listing.model}`;
  const bc = document.getElementById('bc-current');
  if (bc) bc.textContent = `${listing.brand} ${listing.model}`;
  document.querySelectorAll('.bc-sep').forEach(s => s.innerHTML = Icon.chevronRight);

  const raekke = (etiket, vaerdi) =>
    `<div class="spec-row"><dt>${etiket}</dt><dd>${vaerdi}</dd></div>`;

  document.getElementById('listing-detail').innerHTML = `
    <div class="external-detail" style="grid-column:1/-1;">
      <div class="badge badge-external" style="margin-bottom:var(--space-3);">
        ${Icon.externalLink}Hos ${kilde}
      </div>
      <h2 style="margin:0 0 var(--space-2);">${brand} ${model}</h2>
      <p class="external-detail-price" style="font-size:1.5rem;font-weight:700;margin:0 0 var(--space-4);">
        ${formatPrice(listing.price)}
      </p>

      ${foto
        ? `<img src="${escapeHTML(foto)}" alt="${brand} ${model}"
               style="max-width:100%;border-radius:var(--radius-md);margin-bottom:var(--space-4);">`
        : ''}

      <dl class="spec-list">
        ${raekke('Årgang', listing.year ?? 'Ikke oplyst')}
        ${raekke('Kilometer', listing.km == null ? 'Ikke oplyst' : formatKm(listing.km))}
        ${raekke('Kubik', listing.ccm == null ? 'Ikke oplyst' : formatCcm(listing.ccm))}
        ${raekke('Sted', escapeHTML([listing.city, listing.postnr].filter(Boolean).join(' ')) || 'Ikke oplyst')}
        ${raekke('Sælger', listing.isDealer ? 'Forhandler' : 'Ikke oplyst')}
      </dl>

      <p style="margin:var(--space-5) 0 var(--space-3);color:var(--color-fg-muted);">
        Denne annonce ligger hos <strong>${kilde}</strong>${domaene ? ` (${domaene})` : ''}.
        Bikerbasen viser den, men handlen og al kontakt sker hos ${kilde} —
        vi er ikke en del af den.
      </p>

      ${href
        ? `<a href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer nofollow"
              class="btn btn-primary">Se annoncen hos ${kilde}${Icon.externalLink}</a>`
        : `<p style="color:var(--color-fg-muted);">Linket til kilden mangler eller er ugyldigt.</p>`}
      <a href="soegning.html" class="btn btn-outline" style="margin-left:8px;">Tilbage til søgningen</a>
    </div>`;

  /* Alt, der peger på en sælger, fjernes fra DOM'en frem for bare at blive
     skjult. En skjult knap er stadig en knap: den kan tabbes til, den kan
     klikkes af en skærmlæser, og den næste, der kobler en handler på
     #bar-contact, opdager ikke at den ikke burde findes her.

     Kontaktbjælken står statisk i annonce.html og ligger UDEN for
     #listing-detail, så den overlevede den første udgave af den her funktion
     og stod tilbage med "Skriv til sælger" på en annonce uden sælger. */
  document.getElementById('contact-modal')?.remove();
  document.getElementById('listing-actionbar')?.remove();
  const similar = document.querySelector('.similar-strip');
  if (similar) similar.style.display = 'none';
}

function renderListing(){
  const id = getIdFromURL();
  const listing = Store.getListingById(id);

  // Slettet annonce, forkert id eller tom database: vis en ærlig tom tilstand
  // frem for at falde tilbage på en tilfældig anden annonce.
  if (!listing){
    document.title = 'Annoncen findes ikke — Bikerbasen';
    // Solgte og slettede annoncer skal ikke ligge tilbage i Googles indeks.
    Seo.setMeta('meta[name="robots"]', 'name', 'robots', 'noindex, follow');
    document.getElementById('bc-current').textContent = 'Ikke fundet';
    document.querySelectorAll('.bc-sep').forEach(s => s.innerHTML = Icon.chevronRight);
    document.getElementById('listing-detail').innerHTML = `
      <div class="empty-state" style="grid-column:1/-1; padding-top:var(--space-8);">
        ${Icon.search}
        <!-- h2, ikke h3: siden har kun sin (tomme) h1 her, og et spring fra
             h1 til h3 er et brud på overskriftsrækken (Lighthouse a11y). -->
        <h2>Annoncen findes ikke</h2>
        <p>Den er måske solgt og fjernet, eller linket er forkert.</p>
        <a href="soegning.html" class="btn btn-primary" style="margin-top:16px;">Søg motorcykler</a>
      </div>`;
    const similar = document.querySelector('.similar-strip');
    if (similar) similar.style.display = 'none';
    return;
  }

  /* Indekseret annonce fra en anden side.

     Uden den her gren rendrede detaljesiden den som vores egen: "Skriv til
     sælger" og "Ring op" stod på en annonce, vi hverken hoster eller kender
     sælgeren til — og siden kastede på listing.seller.name, fordi der ikke
     ER nogen sælger. Det er præcis den sammenblanding, 014_aggregator.sql
     blev delt i to tabeller for at undgå.

     Vi viser stadig annoncen — et delt link skal ikke ende i en blindgyde —
     men uden kontaktflade og med kilden som eneste vej videre. */
  if (listing.isExternal){
    renderExternalListing(listing);
    return;
  }

  currentListing = listing;
  currentPhotos = buildPhotoSet(listing);
  currentPhotoIndex = 0;
  Store.addRecentlyViewed(listing.id);

  // Titel, delingsbillede og struktureret data følger annoncen, så et link
  // delt i en MC-gruppe viser mærke, årgang og pris frem for bare "Annonce".
  seoListingPage(listing, listing.photoUrls || []);
  tælVisning(listing.id);
  // Én h1 pr. side: den statiske i markup opdateres, så også crawlere
  // uden JavaScript ser en overskrift.
  const h1 = document.getElementById('listing-h1');
  if (h1){ h1.textContent = `${listing.brand} ${listing.model}`; }
  document.getElementById('bc-type').textContent = typeLabel(listing.type);
  document.getElementById('bc-type').href = `soegning.html?type=${listing.type}`;
  document.getElementById('bc-current').textContent = `${listing.brand} ${listing.model}`;
  document.querySelectorAll('.bc-sep').forEach(s => s.innerHTML = Icon.chevronRight);

  const fav = Store.isFavorite(listing.id);
  const loggedIn = !!Store.getUser();
  const brand = escapeHTML(listing.brand), model = escapeHTML(listing.model);
  const sellerName = escapeHTML(listing.seller.name);
  const kk = (typeof koerekortForListing === 'function') ? koerekortForListing(listing) : null;
  const avgRating = Store.getAverageRating(listing.seller.name, Number(listing.seller.rating));
  const reviewCount = Store.getReviews(listing.seller.name).length;
  const suspicious = isSuspiciouslyCheap(listing);

  document.getElementById('listing-detail').innerHTML = `
    <div>
      ${suspicious ? `<div class="safety-banner" style="background:var(--color-danger-tint); color:var(--color-danger); border-color:color-mix(in srgb, var(--color-danger) 30%, transparent);">${Icon.alertTriangle}<span>Prisen er væsentligt under markedsniveau for denne type — vær ekstra opmærksom, og følg altid vores sikkerhedsråd.</span></div>` : ''}

      <div class="gallery">
        <div class="gallery-main">
          <div id="gallery-main-img"></div>
          <div class="gallery-counter" id="gallery-counter"></div>
          <button type="button" class="gallery-nav prev" aria-label="Forrige billede">${Icon.chevronLeft}</button>
          <button type="button" class="gallery-nav next" aria-label="Næste billede">${Icon.chevronRight}</button>
        </div>
        ${isOwnListing(listing) ? '' : `<button type="button" class="fav-btn ${fav?'active':''}" aria-pressed="${fav}" aria-label="Gem annonce" data-fav-toggle="${listing.id}">${Icon.heart}</button>`}
        <div class="gallery-thumbs">
          ${currentPhotos.map((_, i) => `<button type="button" aria-label="Billede ${i+1}" data-thumb="${i}">${currentPhotos[i]}</button>`).join('')}
        </div>
      </div>

      <div class="listing-header">
        <div>
          <p class="listing-title">${brand} ${model}</p>
          <div class="listing-loc">${Icon.mapPin}${escapeHTML(listing.city)}, ${escapeHTML(listing.postnr)} · ${escapeHTML(listing.region)}</div>
        </div>
        <div class="listing-price-block">
          <div class="listing-price-label">Pris</div>
          <div class="listing-price">${formatPrice(listing.price)}</div>
          ${isOwnListing(listing)
            ? `<a class="own-listing-tag" href="opret-annonce.html?rediger=${encodeURIComponent(listing.id)}" style="margin-top:8px;">${Icon.edit}Din annonce</a>`
            : ''}
        </div>
      </div>

      <!-- Tillidsstriben laa over galleriet og skubbede fotoet 90px ned.
           Fotoet er det foerste koeberen vil se; raadene er relevante i det
           oejeblik man kigger paa pris og saelger — altsaa her. -->
      ${safetyBannerHTML()}
      ${sellerTypeNoteHTML(listing.isDealer)}

      ${(kk || listing.serviceHistorik === 'Fuld' || listing.kanNedsaettesA2) ? `<div class="detail-chip-row">
        ${kk ? `<span class="badge badge-koerekort" title="Kan føres på ${kk}-kørekort">${Icon.shieldCheck}Kørekort ${kk}</span>` : ''}
        ${(listing.kanNedsaettesA2 && kk === 'A') ? `<span class="badge badge-koerekort" title="Kan effektbegrænses til A2-kørekort">${Icon.shieldCheck}Kan nedsættes til A2</span>` : ''}
        ${listing.serviceHistorik === 'Fuld' ? `<span class="badge badge-verified">${Icon.shieldCheck}Fuld servicehistorik</span>` : ''}
      </div>` : ''}

      <div class="spec-grid" style="margin-top:var(--space-4);">
        <div class="spec-item"><span class="spec-icon">${Icon.bike} Mærke</span><b>${brand}</b></div>
        <div class="spec-item"><span class="spec-icon">${Icon.info} Model</span><b>${model}</b></div>
        <div class="spec-item"><span class="spec-icon">${Icon.calendar} Årgang</span><b>${listing.year}</b></div>
        <div class="spec-item"><span class="spec-icon">${Icon.gauge} Km-stand</span><b>${formatKm(listing.km)}</b></div>
        <div class="spec-item"><span class="spec-icon">${Icon.engine} Motorstørrelse</span><b>${formatCcm(listing.ccm)}</b></div>
        <div class="spec-item"><span class="spec-icon">${Icon.engine} Effekt</span><b>${formatPower(listing.power)}</b></div>
        <div class="spec-item"><span class="spec-icon">${Icon.info} Type</span><b>${typeLabel(listing.type)}</b></div>
        <div class="spec-item"><span class="spec-icon">${Icon.checkCircle} Stand</span><b>${escapeHTML(listing.condition)}</b></div>
        <div class="spec-item"><span class="spec-icon">${Icon.shieldCheck} Registrering</span><b>${escapeHTML(listing.registration)}</b></div>
        <div class="spec-item"><span class="spec-icon">${Icon.lock} Afgift</span><b>${escapeHTML(listing.afgift || 'Ukendt')}</b></div>
        ${listing.fuel ? `<div class="spec-item"><span class="spec-icon">${Icon.engine} Brændstof</span><b>${escapeHTML(listing.fuel)}</b></div>` : ''}
        ${listing.drive ? `<div class="spec-item"><span class="spec-icon">${Icon.engine} Træktype</span><b>${escapeHTML(listing.drive)}</b></div>` : ''}
        ${listing.cylinders ? `<div class="spec-item"><span class="spec-icon">${Icon.engine} Cylindre</span><b>${Number(listing.cylinders)}</b></div>` : ''}
        ${listing.color ? `<div class="spec-item"><span class="spec-icon">${Icon.info} Farve</span><b>${escapeHTML(listing.color)}</b></div>` : ''}
        ${listing.serviceHistorik ? `<div class="spec-item"><span class="spec-icon">${Icon.shieldCheck} Servicehistorik</span><b>${escapeHTML(listing.serviceHistorik)}</b></div>` : ''}
        ${listing.antalEjere ? `<div class="spec-item"><span class="spec-icon">${Icon.user} Antal ejere</span><b>${Number(listing.antalEjere)}</b></div>` : ''}
        ${listing.sidsteSyn ? `<div class="spec-item"><span class="spec-icon">${Icon.checkCircle} Sidste syn</span><b>${Number(listing.sidsteSyn)}</b></div>` : ''}
        ${listing.daekAar ? `<div class="spec-item"><span class="spec-icon">${Icon.gauge} Dæk skiftet</span><b>${Number(listing.daekAar)}</b></div>` : ''}
        ${listing.vinterklar ? `<div class="spec-item"><span class="spec-icon">${Icon.shieldCheck} Vinterklargjort</span><b>Ja</b></div>` : ''}
      </div>

      ${(listing.equipment || []).length ? `
      <div class="detail-section" style="margin-top:var(--space-5);">
        <h2>Udstyr</h2>
        <ul class="equipment-list">
          ${listing.equipment.map(e => `<li>${Icon.checkCircle}${escapeHTML(equipmentLabel(e))}</li>`).join('')}
        </ul>
      </div>` : ''}

      <div class="detail-section">
        <h2>Beskrivelse</h2>
        <p class="desc">${escapeHTML(listing.description)}</p>
      </div>

      <div class="detail-section" style="margin-top:var(--space-5);">
        <button type="button" class="report-link" id="report-listing-btn">${Icon.flag}Anmeld annonce</button>
      </div>
    </div>

    <div>
      ${sellerSidebarHTML(listing, { loggedIn, sellerName, avgRating, reviewCount })}
    </div>
  `;

  document.getElementById('gallery-main-img').innerHTML = currentPhotos[0];
  document.querySelector('.gallery-nav.prev').addEventListener('click', () => shiftPhoto(-1));
  document.querySelector('.gallery-nav.next').addEventListener('click', () => shiftPhoto(1));
  document.querySelectorAll('.gallery-thumbs [data-thumb]').forEach(btn => {
    btn.addEventListener('click', () => { currentPhotoIndex = Number(btn.dataset.thumb); renderGallery(); });
  });
  renderGallery();

  wireFavoriteButtons(document);

  // Anmeld hører til annoncen, ikke til sælgeren, og er tilgængelig uanset login.
  document.getElementById('report-listing-btn').addEventListener('click', () => {
    openReportModal('listing', `${listing.brand} ${listing.model}`, listing.id);
  });

  /* Kontaktbjælken i bunden (mobil). Den vises for alle andre end sælgeren
     selv — også når man ikke er logget ind, for dér er handlingen "log ind
     for at skrive", ikke "ingenting". Bilbasen lægger de samme knapper
     øverst, hvor de ruller væk; vores følger med ned gennem specs og
     beskrivelse, hvor beslutningen faktisk træffes. */
  const bar = document.getElementById('listing-actionbar');
  if (bar && !isOwnListing(listing)){
    bar.hidden = false;
    document.body.classList.add('har-actionbar');
    const spring = (id, rulHen) => {
      const mål = document.getElementById(id);
      if (!mål){
        // Ikke logget ind: send til login og tilbage hertil bagefter.
        // js/login.js læser ?redirect= (og afviser fremmede adresser).
        location.href = `login.html?redirect=${encodeURIComponent(location.pathname + location.search)}`;
        return;
      }
      mål.click();
      // Telefonnummeret afsløres nede i sælgerkortet — flyt øjnene derhen,
      // ellers trykker man på en knap og ser tilsyneladende ingenting ske.
      // (Beskeden åbner en modal og skal ikke rulle noget.)
      if (rulHen) mål.closest('.sidebar-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    document.getElementById('bar-contact').addEventListener('click', () => spring('open-contact-modal', false));
    document.getElementById('bar-phone').addEventListener('click', () => spring('reveal-phone-btn', true));
  }

  // Kontaktknapperne findes kun i markup'en, når man er logget ind — al
  // wiring nedenfor forudsætter derfor login.
  if (loggedIn){
    const revealBtn = document.getElementById('reveal-phone-btn');
    revealBtn.addEventListener('click', () => {
      revealBtn.innerHTML = `${Icon.phone}<span class="phone-reveal">${escapeHTML(listing.seller.phone)}</span>`;
      revealBtn.disabled = true;
      // Tælles som en henvendelse i sælgerens dashboard.
      db.recordListingEvent?.(listing.id, 'contact');
    });

    document.getElementById('share-listing-btn').addEventListener('click', async () => {
      const url = location.href;
      const title = `${listing.brand} ${listing.model} — ${formatPrice(listing.price)}`;
      // Web Share hvor det findes (mobil); ellers kopiér linket.
      if (navigator.share){
        try { await navigator.share({ title, url }); return; }
        catch (e) { if (e.name === 'AbortError') return; /* ellers: fald til kopiering */ }
      }
      try {
        await navigator.clipboard.writeText(url);
        toast('Link kopieret til udklipsholderen');
      } catch (e) {
        prompt('Kopiér linket:', url);
      }
    });

    document.getElementById('open-payment-modal').addEventListener('click', () => {
      openInfoModal('Betal sikkert via MobilePay', `
        <p>Ved almindelige køb betaler du direkte til sælger via MobilePay, når I mødes og du har godkendt motorcyklen.</p>
        <p>Ved dyrere motorcykler kan du bede sælger om at bruge Bikerbasens <strong>sikker betaling</strong>: en ekstern, PCI-certificeret betalingspartner holder pengene, indtil du har bekræftet, at du har modtaget motorcyklen som beskrevet — så du ikke sender penge direkte til en fremmed på forhånd.</p>
        <p style="margin-bottom:0;">Bikerbasen håndterer eller opbevarer aldrig dine kortoplysninger.</p>
      `);
    });

    const modal = document.getElementById('contact-modal');
    // Sælgers navn i titlen, så man kan se, hvem beskeden går til —
    // "Skriv til sælger" føles anonymt, når navnet står lige ved siden af.
    document.getElementById('contact-modal-title').textContent = `Skriv til ${listing.seller.name}`;
    document.getElementById('open-contact-modal').addEventListener('click', () => modal.classList.add('open'));
    modal.querySelectorAll('[data-modal-close]').forEach(el => el.addEventListener('click', () => modal.classList.remove('open')));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });

    const besked = document.getElementById('cf-message');
    const taeller = document.getElementById('cf-counter');
    besked.value = `Hej, jeg er interesseret i din ${listing.brand} ${listing.model} fra ${listing.year}. Er den stadig til salg?`;
    const opdaterTaeller = () => { taeller.textContent = `${besked.value.length}/500`; };
    besked.addEventListener('input', opdaterTaeller);
    opdaterTaeller();

    // Navn og e-mail er kendt fra profilen — spar indtastningen.
    const bruger = Store.getUser();
    if (bruger){
      const [fornavn, ...rest] = String(bruger.name || '').split(' ');
      if (fornavn) document.getElementById('cf-firstname').value = fornavn;
      if (rest.length) document.getElementById('cf-lastname').value = rest.join(' ');
      if (bruger.email) document.getElementById('cf-email').value = bruger.email;
      if (bruger.phone) document.getElementById('cf-phone').value = bruger.phone;
    }

    document.getElementById('contact-form').addEventListener('submit', (e) => {
      e.preventDefault();
      // Hensigterne føjes til beskeden, så sælger ser dem uanset hvordan
      // beskeden senere leveres.
      const hensigter = [...modal.querySelectorAll('.contact-intents input:checked')].map(cb => cb.value);
      void hensigter; // klar til rigtig beskedlevering
      modal.classList.remove('open');
      toast('Din besked er sendt til sælgeren');
      e.target.reset();
      besked.value = '';
      opdaterTaeller();
    });
  }

  const similarMount = document.getElementById('similar-listings');
  const similar = Store.getAllListings().filter(l => l.type === listing.type && l.id !== listing.id).slice(0, 3);
  // Skjul hele "Lignende annoncer"-sektionen, når der ingen er — en overskrift
  // over et tomt gitter ser i stykker ud (samme mønster som forsidens sektioner).
  const similarStrip = similarMount.closest('.similar-strip');
  if (similar.length === 0){
    if (similarStrip) similarStrip.hidden = true;
  } else {
    if (similarStrip) similarStrip.hidden = false;
    similarMount.innerHTML = similar.map(listingCardHTML).join('');
    wireFavoriteButtons(similarMount);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await backendReady();
  renderHeader(null);
  renderListing();
});
