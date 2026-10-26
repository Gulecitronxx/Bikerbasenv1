/* ============ Mine annoncer / Min profil ============
   Siden følger referencebillede 5: hero, fanelinje, statistikkort, annonceliste
   og højre sidebjælke. Alt der vises, kommer fra brugerens egne data — intet
   tal er opfundet. Annoncernes status er dem, databasen kender (listings.status:
   'active' | 'hidden' | 'sold'); der findes ingen udløbsdato, så der er hverken
   "Udløbet" eller "Forlæng". */

/* Ikoner, der ikke findes i det delte sæt (js/icons.js er låst). */
const DB_IKON = {
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4.5H6.5A2 2 0 0 0 4.5 6.5v11a2 2 0 0 0 2 2H9"/><path d="M15 8l4 4-4 4M19 12H9.5"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6v12M15 6v12"/></svg>',
  dots: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5.5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="18.5" r="1.8"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5.5v13l10-6.5-10-6.5Z"/></svg>',
};
function dbIkon(navn){ return DB_IKON[navn] || (typeof Icon !== 'undefined' && Icon[navn]) || ''; }

/* ---------- Ren logik (testes i js/mine-annoncer.test.js) ---------- */

/* Databasens status oversat til siden: 'hidden' er en annonce, ejeren har sat
   på pause. Annoncer uden status (lokale / fra den aktive liste) er aktive. */
function listingStatus(l){
  if (l && l.status === 'hidden') return 'paused';
  if (l && l.status === 'sold') return 'sold';
  return 'active';
}

const STATUS_VISNING = {
  active: { label: 'Aktiv', cls: 'is-active', ikon: 'checkCircle' },
  paused: { label: 'På pause', cls: 'is-paused', ikon: 'pause' },
  sold: { label: 'Solgt', cls: 'is-sold', ikon: 'checkCircle' },
  draft: { label: 'Kladde', cls: 'is-draft' },
};
function statusVisning(status){ return STATUS_VISNING[status] || STATUS_VISNING.active; }

/* Næste status for knappen "Sæt på pause" / "Aktivér". Kun uuid-annoncer
   (databasen) kan skifte status; lokale demo-annoncer har ingen status. */
function naesteStatus(status){
  if (status === 'active') return { status: 'hidden', knap: 'Sæt på pause', ikon: 'pause', besked: 'Annoncen er sat på pause og vises ikke i søgningen.' };
  if (status === 'paused') return { status: 'active', knap: 'Aktivér', ikon: 'play', besked: 'Annoncen er aktiv igen.' };
  return { status: 'active', knap: 'Sæt til salg igen', ikon: 'play', besked: 'Annoncen er sat til salg igen.' };
}

/* "år | km | type" som på billedet — kun de dele, der er oplyst. */
function rowMeta(l){
  const dele = [];
  if (l.year) dele.push(String(l.year));
  if (l.km != null) dele.push(formatKm(l.km));
  if (l.type) dele.push(typeLabel(l.type));
  return dele.join(' | ');
}

/* Kladden er den ene, Store.saveDraft('form', …) gemmer fra opret-flowet.
   Tom kladde (ingen af de vigtigste felter) tæller ikke. */
function draftSummary(draft){
  const f = draft && draft.form;
  if (!f) return null;
  const harIndhold = ['brand', 'model', 'year', 'km', 'price', 'description'].some(k => f[k] != null && f[k] !== '');
  if (!harIndhold) return null;
  const titel = [f.brand, f.model].filter(Boolean).join(' ').trim() || 'Ufærdig annonce';
  return { titel, meta: rowMeta(f), sted: f.city || '', pris: f.price != null && f.price !== '' ? f.price : null };
}

function initials(navn){
  const dele = String(navn || '').trim().split(/\s+/).filter(Boolean);
  if (!dele.length) return '?';
  const f = dele[0][0], l = dele.length > 1 ? dele[dele.length - 1][0] : '';
  return (f + l).toUpperCase();
}

/* Tallene i statistikkortene — beregnet af brugerens egne data. */
function oversigtTal(egne, draft, favAntal, agentAntal){
  const tael = s => egne.filter(l => listingStatus(l) === s).length;
  return {
    aktive: tael('active'), pause: tael('paused'), solgt: tael('sold'),
    kladder: draftSummary(draft) ? 1 : 0, favoritter: favAntal, agenter: agentAntal,
  };
}

/* Sorterer efter valget i værktøjslinjen. */
function sortListings(list, mode){
  const arr = list.slice();
  /* Manglende pris/år/dato må ikke give NaN i sammenligningen (så er rækkefølgen udefineret):
     manglende tal sorteres sidst. */
  const tal = v => (v == null || v === '' || isNaN(Number(v))) ? null : Number(v);
  const dato = v => { const t = new Date(v || '').getTime(); return isNaN(t) ? null : t; };
  const efter = (hent, retning) => (a, b) => {
    const x = hent(a), y = hent(b);
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return retning * (x - y);
  };
  if (mode === 'price-desc') arr.sort(efter(l => tal(l.price), -1));
  else if (mode === 'price-asc') arr.sort(efter(l => tal(l.price), 1));
  else if (mode === 'year-desc') arr.sort(efter(l => tal(l.year), -1));
  else arr.sort(efter(l => dato(l.createdAt), -1));
  return arr;
}

function setCount(id, n){
  const el = document.getElementById(id);
  if (el) el.textContent = n;
}

/* ---------- Fokus (V5) ----------
   Bekræftelsesdialogen ligger i <body>, uden for rækkens ⋮-menu. Før lukkede klik-udenfor-handleren menuen,
   når man trykkede i dialogen, så "Slet annonce"-knappen (hvor fokus skulle tilbage til) blev skjult, og
   fokus faldt til <body> — hverken efter Annuller eller efter en gennemført handling var der noget at stå på.
   Nu: Annuller lukker menuen og lander på ⋮-knappen; en gennemført handling lander på det, der er tilbage
   (næste række, rækkens egen titel eller listens overskrift). */
function lukMenuOgFokus(menu){
  if (!menu || !menu.isConnected) return;
  menu.removeAttribute('open');
  try { menu.querySelector('summary')?.focus({ preventScroll: true }); } catch (e) { /* fokus er en hjælp */ }
}
function fokusPaa(el){
  if (!el) return;
  try { el.focus(); } catch (e) { /* fokus er en hjælp */ }
}
/* Efter en ny tegning: fokus på elementet (vælger) i rækken for id, ellers listens overskrift. */
function fokusRaekke(id, vaelger){
  const raekke = [...document.querySelectorAll('#mine-grid .db-row[data-listing-id]')].find(r => r.dataset.listingId === String(id));
  fokusPaa((raekke && raekke.querySelector(vaelger)) || document.getElementById('mine-heading'));
}

/* ---------- Annoncelisten ---------- */

/* Alle egne annoncer, uanset status. Siden henter dem selv, fordi den fælles
   annonceliste kun indeholder aktive — en annonce på pause ville ellers
   forsvinde fra "Mine annoncer", så ejeren ikke kunne aktivere den igen. */
let EGNE_ALLE = null;
let EGNE_FEJL = false;

async function hentEgneAlle(){
  const bruger = Store.getUser();
  EGNE_FEJL = false;
  if (!bruger?.remote || typeof db === 'undefined' || !db.enabled){ EGNE_ALLE = null; return; }
  let svar;
  try { svar = await db.myListings(); }
  catch (err){ svar = { data: null, error: err }; }
  const { data, error } = svar || {};
  /* Fejler hentningen, falder siden tilbage til de aktive annoncer — men siger
     det højt (se #mine-error), så pausede og solgte ikke forsvinder tavst. */
  if (error || !Array.isArray(data)){ EGNE_ALLE = null; EGNE_FEJL = true; return; }
  const lokale = Store.getLocalListings();
  EGNE_ALLE = [...data.map(r => Object.assign(normalizeRemoteListing(r), { status: r.status })), ...lokale];
}

function egneListe(){ return EGNE_ALLE || Store.getMyListings(); }

function rowThumb(l, url, brand, model){
  const antal = (l.photoUrls || []).length;
  return `
    <a class="db-thumb" href="${url}" aria-label="Se annonce: ${brand} ${model}" tabindex="-1">
      ${listingMediaHTML(l, `${brand} ${model}`)}
      ${antal ? `<span class="db-photos">${Icon.camera}${antal}</span>` : ''}
    </a>`;
}

function infoBlok(l, url, brand, model){
  return `
    <div class="db-info">
      <a class="db-title" href="${url}">${brand} ${model}</a>
      <p class="db-meta">${escapeHTML(rowMeta(l))}</p>
      ${l.city ? `<p class="db-place">${Icon.mapPin}${escapeHTML(l.city)}</p>` : ''}
      <p class="db-price">${formatPrice(l.price)}</p>
    </div>`;
}

/* Række til en egen annonce (billede 5): foto, titel, 'år | km | type', sted,
   pris, statusbadge og handlinger. */
function ownRowHTML(l){
  const brand = escapeHTML(l.brand), model = escapeHTML(l.model);
  const url = `annonce.html?id=${l.id}`;
  const status = listingStatus(l);
  const v = statusVisning(status);
  const kanSkifte = isUuid(String(l.id));
  const naeste = naesteStatus(status);
  const kanRedigere = status === 'active' || status === 'paused';   // på pause kan også rettes (opret-annonce.js henter egne rækker)
  return `
  <article class="db-row ${status !== 'active' ? 'is-' + status : ''}" data-listing-id="${l.id}" data-status="${status}">
    ${rowThumb(l, url, brand, model)}
    ${infoBlok(l, url, brand, model)}
    <div class="db-status">
      <span class="db-badge ${v.cls}">${v.ikon ? dbIkon(v.ikon) : ''}${v.label}</span>
      ${l.createdAt ? `<span class="db-when">${Icon.clock}Oprettet ${escapeHTML(timeAgoDa(l.createdAt))}</span>` : ''}
      ${status === 'paused' ? `<span class="db-when">${Icon.eye}Skjult for købere</span>` : ''}
    </div>
    <div class="db-actions">
      ${kanRedigere ? `<a class="btn btn-outline btn-sm" href="opret-annonce.html?rediger=${encodeURIComponent(l.id)}">${Icon.edit}Rediger</a>` : ''}
      ${kanSkifte ? `<button type="button" class="btn btn-outline btn-sm" data-status-skift="${l.id}">${dbIkon(naeste.ikon)}${naeste.knap}</button>` : ''}
      <details class="db-more">
        <summary class="db-icon-btn" aria-label="Flere handlinger: ${brand} ${model}">${DB_IKON.dots}</summary>
        <div class="db-more-menu">
          <a href="${url}">${Icon.eye}Se annonce</a>
          <button type="button" data-copy-link="${url}">${Icon.share}Kopiér link</button>
          ${kanSkifte && kanRedigere ? `<button type="button" data-mark-sold="${l.id}">${Icon.checkCircle}Markér som solgt</button>` : ''}
          <button type="button" class="db-danger" data-delete-listing="${l.id}">${Icon.trash}Slet annonce</button>
        </div>
      </details>
    </div>
  </article>`;
}

function draftRowHTML(k){
  return `
  <article class="db-row is-draft" data-draft-row>
    <div class="db-thumb db-thumb-draft" aria-hidden="true">${Icon.edit}</div>
    <div class="db-info">
      <a class="db-title" href="opret-annonce.html">${escapeHTML(k.titel)}</a>
      <p class="db-meta">${escapeHTML(k.meta) || 'Endnu ikke færdig'}</p>
      ${k.sted ? `<p class="db-place">${Icon.mapPin}${escapeHTML(k.sted)}</p>` : ''}
      <p class="db-price">${k.pris != null ? formatPrice(Number(k.pris)) : 'Pris ikke oplyst'}</p>
    </div>
    <div class="db-status">
      <span class="db-badge is-draft">Kladde</span>
      <span class="db-when">${Icon.info}Gemt på denne enhed</span>
    </div>
    <div class="db-actions">
      <a class="btn btn-primary btn-sm" href="opret-annonce.html">${Icon.edit}Fortsæt kladde</a>
      <button type="button" class="btn btn-outline btn-sm db-danger" data-delete-draft aria-label="Slet kladde">${Icon.trash}<span class="db-lbl">Slet</span></button>
    </div>
  </article>`;
}

/* Favoritrække: samme række, men med "Se annonce" og hjertet. */
function favRowHTML(l){
  const brand = escapeHTML(l.brand), model = escapeHTML(l.model);
  const url = `annonce.html?id=${l.id}`;
  return `
  <article class="db-row" data-listing-id="${l.id}">
    ${rowThumb(l, url, brand, model)}
    ${infoBlok(l, url, brand, model)}
    <div class="db-status"><span class="db-when">${Icon.heart}Gemt som favorit</span></div>
    <div class="db-actions">
      <a class="btn btn-outline btn-sm" href="${url}">Se annonce</a>
      <button type="button" class="db-icon-btn lr-fav active" data-fav-toggle="${l.id}" aria-pressed="true" aria-label="Fjern fra favoritter">${Icon.heart}</button>
    </div>
  </article>`;
}

/* V5 (D-008 revideret): gemt INDEKSERET annonce. Gemmes kun i denne browser (Store.getExternalFavorites). Rækken linker til vores annonceside og
   til kilden; hjertet fjerner den. Er annoncen ikke længere i indekset, står den som en ærlig række (extGoneRowHTML) i stedet for at forsvinde. */
function extFavRowHTML(l){
  const brand = escapeHTML(l.brand), model = escapeHTML(l.model);
  const url = `annonce.html?id=${l.id}`;
  const kilde = escapeHTML((l.source && l.source.navn) || (l.source && l.source.domaene) || 'kilden');
  const href = typeof sikkerUrl === 'function' ? sikkerUrl(l.externalUrl) : '';
  return `
  <article class="db-row" data-listing-id="${l.id}" data-external="1">
    ${rowThumb(l, url, brand, model)}
    ${infoBlok(l, url, brand, model)}
    <div class="db-status"><span class="db-when">${Icon.heart}Gemt i denne browser</span><span class="db-when">Hos ${kilde}</span></div>
    <div class="db-actions">
      <a class="btn btn-outline btn-sm" href="${url}">Se annonce</a>
      ${href ? `<a class="btn btn-outline btn-sm" href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer nofollow">Åbn hos ${kilde}</a>` : ''}
      <button type="button" class="db-icon-btn lr-fav active" data-fav-toggle="${l.id}" data-fav-ext="1" aria-pressed="true" aria-label="Fjern fra gemte">${Icon.heart}</button>
    </div>
  </article>`;
}

function extGoneRowHTML(id, meta, lagerHentet){
  const titel = escapeHTML((meta && meta.t) || 'Gemt annonce');
  const kilde = meta && meta.k ? ` · ${escapeHTML(meta.k)}` : '';
  const tekst = lagerHentet ? 'Annoncen er ikke længere i vores indeks' : 'Annoncen kunne ikke slås op lige nu (vi nåede ikke at hente de indekserede annoncer)';
  return `
  <article class="db-row is-gone" data-listing-id="${escapeHTML(String(id))}" data-external="1" data-gone="1">
    <span class="db-thumb" aria-hidden="true"></span>
    <div class="db-info">
      <span class="db-title">${titel}</span>
      <p class="db-meta">${tekst}${kilde}</p>
    </div>
    <div class="db-status"><span class="db-when">${Icon.heart}Gemt i denne browser</span></div>
    <div class="db-actions">
      <button type="button" class="btn btn-outline btn-sm" data-fav-toggle="${escapeHTML(String(id))}" data-fav-ext="1" aria-label="Fjern fra gemte: ${titel}">${Icon.trash}<span class="db-lbl">Fjern</span></button>
    </div>
  </article>`;
}

/* Visninger og favoritter (30 dage) som kolonner pr. aktiv annonce — kun når
   kaldene lykkes (listing_stats + my_listing_saves, ejer-RLS). Et tal uden data
   er et rigtigt nul; fejler kaldet, står der intet. */
/* V6 (P2-6): tallene hentes SAMMEN med annoncerne (se hentRaekkeStatistik, kaldt i Promise.all før første tegning) og står i RAEKKE_STAT, så
   rækken tegnes med tællerstriben i første omgang. Før hentede og indsatte siden striben EFTER første tegning: hver aktiv række voksede ~56 px,
   og alt under rykkede (og striben forsvandt og kom igen ved hver sortering). Fejler hentningen, står der intet (som før). */
let RAEKKE_STAT = null;
async function hentRaekkeStatistik(){
  RAEKKE_STAT = null;
  if (typeof db === 'undefined' || !db.enabled || !Store.getUser()?.remote) return;
  try {
    const [st, sv] = await Promise.all([db.myListingStats(30), db.myListingSaves()]);
    if (!st.error && st.data) RAEKKE_STAT = { st, sv };
  } catch (err) { RAEKKE_STAT = null; }
}

/* Uden hentede tal (kaldt før første hentning) henter den dem først; renderMine() har dem normalt allerede. */
async function visAnnonceStatistik(grid){
  if (!RAEKKE_STAT) await hentRaekkeStatistik();
  anvendRaekkeStatistik(grid);
}

function anvendRaekkeStatistik(grid){
  if (!RAEKKE_STAT) return;
  const { st, sv } = RAEKKE_STAT;
  const sum = new Map();
  for (const r of st.data){
    const s = sum.get(r.listing_id) || { views: 0, contacts: 0 };
    s.views += r.views || 0; s.contacts += r.contacts || 0;
    sum.set(r.listing_id, s);
  }
  const gemt = new Map();
  if (!sv.error && Array.isArray(sv.data)) sv.data.forEach(r => gemt.set(r.listing, Number(r.saves) || 0));
  const harGemt = !sv.error && Array.isArray(sv.data);
  grid.querySelectorAll('.db-row[data-listing-id]').forEach(row => {
    if (row.dataset.status !== 'active' || !isUuid(row.dataset.listingId)) return;
    const s = sum.get(row.dataset.listingId) || { views: 0, contacts: 0 };
    const kol = (n, t, ik) => `<span class="db-num"><span class="db-num-ic" aria-hidden="true">${Icon[ik] || ''}</span><span class="db-num-tx"><b>${n.toLocaleString('da-DK')}</b>${t}</span></span>`;
    const blok = document.createElement('div');
    blok.className = 'db-nums db-nums-row';
    blok.title = 'Seneste 30 dage';
    const gemtN = harGemt ? (gemt.get(row.dataset.listingId) || 0) : 0;
    /* W14: tre nuller i en række ser dødt ud. Er alle tre 0, står der én ærlig linje i stedet. */
    blok.innerHTML = (!s.views && !gemtN && !s.contacts)
      ? `<span class="db-num db-num-tom"><span class="db-num-ic" aria-hidden="true">${Icon.eye || ''}</span><span class="db-num-tx">Ingen visninger endnu</span></span>`
      : kol(s.views, 'Visninger', 'eye') + (harGemt ? kol(gemtN, 'Favoritter', 'heart') : '') + kol(s.contacts, 'Telefonvisninger', 'phone');
    /* Tal: stribe nederst i rækken (ikke i statuskolonnen, hvor den løb ind under knapperne).
       Ingen tal: den ene ærlige linje bliver i statuskolonnen, så rækken ikke får en tom stribe. */
    if (blok.querySelector('.db-num-tom')) row.querySelector('.db-status')?.appendChild(blok);
    else { blok.innerHTML += '<span class="db-nums-per">Seneste 30 dage</span>'; row.appendChild(blok); }
  });
}

/* Gratis-grænsen (3 aktive for private) håndhæves i databasen kun ved INSERT
   (trg_listing_limit, before insert), så en genaktivering kan snige sig forbi.
   Så længe adgangen er gratis for alle (FRI_ADGANG) gælder grænsen ikke; ellers
   stopper siden den her med en klar besked. Se DELT-ØNSKE i rapporten. */
function overGraense(egne, bruger, fri){
  if (fri) return false;
  if (bruger && (bruger.isDealer || bruger.plan === 'dealer')) return false;
  return egne.filter(l => listingStatus(l) === 'active').length >= 3;
}

async function skiftStatus(id, btn){
  const l = egneListe().find(x => String(x.id) === String(id));
  if (!l) return;
  const naeste = naesteStatus(listingStatus(l));
  if (naeste.status === 'active' && overGraense(egneListe(), Store.getUser(), typeof FRI_ADGANG !== 'undefined' && FRI_ADGANG)){
    toast('Du har allerede 3 aktive annoncer. Sæt en anden på pause, før du aktiverer denne.' + (betalingAaben() ? ' Eller bliv forhandler.' : ''), { type: 'error' });
    return;
  }
  btn.disabled = true;
  let svar;
  try { svar = await db.updateListing(id, { status: naeste.status }); }
  catch (err){ svar = { error: err }; }
  const error = svar && svar.error;
  if (error){
    btn.disabled = false;
    toast('Status kunne ikke ændres: ' + escapeHTML(fejlTekst(error)), { type: 'error' });
    return;
  }
  l.status = naeste.status;
  // Den fælles liste er kun aktive annoncer — hold den i trit.
  if (naeste.status !== 'active') window.REMOTE_LISTINGS = (window.REMOTE_LISTINGS || []).filter(x => String(x.id) !== String(id));
  toast(naeste.besked);
  renderMine();
  fokusRaekke(id, '[data-status-skift]');
}

/* V2: markér solgt. 'sold' er en gyldig listings.status; annoncen forlader søgningen, men bliver stående her
   og kan sættes til salg igen. Bekræftes først, fordi den forsvinder for købere. */
async function markerSolgt(id, btn){
  const l = egneListe().find(x => String(x.id) === String(id));
  if (!l) return;
  const menu = btn.closest('details.db-more');
  if (!(await bekraeft({ titel: `Markér ${[l.brand, l.model].filter(Boolean).join(' ') || 'annoncen'} som solgt?`, tekst: 'Annoncen fjernes fra søgningen. Du kan sætte den til salg igen under Mine annoncer.', ok: 'Markér som solgt' }))){ lukMenuOgFokus(menu); return; }
  btn.disabled = true;
  let svar;
  try { svar = await db.updateListing(id, { status: 'sold' }); }
  catch (err){ svar = { error: err }; }
  if (svar && svar.error){
    btn.disabled = false;
    toast('Annoncen kunne ikke markeres som solgt: ' + escapeHTML(fejlTekst(svar.error)), { type: 'error' });
    return;
  }
  l.status = 'sold';
  window.REMOTE_LISTINGS = (window.REMOTE_LISTINGS || []).filter(x => String(x.id) !== String(id));
  toast('Annoncen er markeret som solgt. Tillykke!');
  renderMine();
  fokusRaekke(id, '.db-title');
}

async function sletAnnonce(id, btn){
  const slet = egneListe().find(x => String(x.id) === String(id));
  const menu = btn.closest('details.db-more');
  const pos = [...document.querySelectorAll('#mine-grid .db-row')].findIndex(r => r.dataset.listingId === String(id));
  if (!(await bekraeft({ titel: `Slet ${slet ? [slet.brand, slet.model].filter(Boolean).join(' ') : 'annoncen'}?`, tekst: 'Annoncen og dens billeder fjernes helt. Det kan ikke fortrydes. Vil du bare skjule den, så sæt den på pause i stedet.', ok: 'Slet annonce', farlig: true }))){ lukMenuOgFokus(menu); return; }
  // Databaseannoncer har uuid som id. Number() på et uuid gav NaN, så sletningen
  // ramte kun localStorage og annoncen blev liggende i databasen.
  if (isUuid(id)){
    btn.disabled = true;
    let svar;
    try { svar = await db.deleteListing(id); }
    catch (err){ svar = { error: err }; }
    const error = svar && svar.error;
    if (error){
      btn.disabled = false;
      toast('Annoncen kunne ikke slettes: ' + escapeHTML(fejlTekst(error)), { type: 'error' });
      return;
    }
    window.REMOTE_LISTINGS = (window.REMOTE_LISTINGS || []).filter(l => l.id !== id);
    if (EGNE_ALLE) EGNE_ALLE = EGNE_ALLE.filter(l => String(l.id) !== String(id));
  } else {
    Store.removeMyListing(id);
    if (EGNE_ALLE) EGNE_ALLE = EGNE_ALLE.filter(l => String(l.id) !== String(id));
  }
  toast('Annonce slettet');
  renderMine();
  /* Rækken er væk: fokus til rækken, der rykkede op på pladsen (eller den forrige), ellers til overskriften. */
  const rest = [...document.querySelectorAll('#mine-grid .db-row')];
  const naesteRk = rest[Math.min(Math.max(pos, 0), rest.length - 1)];
  fokusPaa((naesteRk && naesteRk.querySelector('.db-title')) || document.getElementById('mine-heading'));
}

function visEgneFejl(){
  const el = document.getElementById('mine-error');
  if (!el) return;
  el.hidden = !EGNE_FEJL;
  if (!EGNE_FEJL){ el.innerHTML = ''; return; }
  el.innerHTML = `${Icon.alertTriangle}<span><b>Vi kunne ikke hente alle dine annoncer.</b> Pausede og solgte annoncer mangler måske her, og tallene kan være for lave.</span><button type="button" class="btn btn-outline btn-sm" id="mine-retry">Prøv igen</button>`;
  document.getElementById('mine-retry').addEventListener('click', async () => { await Promise.all([hentEgneAlle(), hentRaekkeStatistik()]); renderMine(); });
}

function renderMine(){
  visEgneFejl();
  const mine = sortListings(egneListe(), document.getElementById('mine-sort')?.value);
  const kladde = draftSummary(Store.getDraft());
  const grid = document.getElementById('mine-grid');
  const empty = document.getElementById('mine-empty');
  const tal = oversigtTal(mine, Store.getDraft(), Store.getAllFavorites().length, Store.getSavedSearches().length);
  setCount('mine-count-inline', mine.length);
  setCount('stat-aktive', tal.aktive);
  setCount('stat-kladder', tal.kladder);
  setCount('stat-pause', tal.pause);
  const kladdeLink = document.getElementById('stat-kladde-link');
  if (kladdeLink) kladdeLink.firstChild.textContent = tal.kladder ? 'Fortsæt kladde' : 'Opret annonce';

  const harIndhold = mine.length > 0 || !!kladde;
  document.getElementById('mine-toolbar').style.display = harIndhold ? '' : 'none';
  document.getElementById('mine-create').style.display = harIndhold ? '' : 'none';
  if (!harIndhold){
    grid.style.display = 'none';
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  grid.style.display = '';
  empty.style.display = 'none';
  grid.innerHTML = (kladde ? draftRowHTML(kladde) : '') + mine.map(ownRowHTML).join('');
  anvendRaekkeStatistik(grid);
  grid.querySelectorAll('[data-delete-listing]').forEach(btn => {
    btn.addEventListener('click', () => sletAnnonce(btn.dataset.deleteListing, btn));
  });
  grid.querySelectorAll('[data-mark-sold]').forEach(btn => {
    btn.addEventListener('click', () => markerSolgt(btn.dataset.markSold, btn));
  });
  grid.querySelectorAll('[data-copy-link]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const full = new URL(btn.dataset.copyLink, window.location.href).href;
      try { await navigator.clipboard.writeText(full); toast('Link kopieret'); }
      catch (e) { toast('Linket kunne ikke kopieres: ' + full); }
      btn.closest('details')?.removeAttribute('open');
    });
  });
  grid.querySelectorAll('[data-status-skift]').forEach(btn => {
    btn.addEventListener('click', () => skiftStatus(btn.dataset.statusSkift, btn));
  });
  grid.querySelector('[data-delete-draft]')?.addEventListener('click', async () => {
    if (!(await bekraeft({ titel: 'Slet kladden?', tekst: 'De oplysninger, du har gemt på denne enhed, fjernes. Det kan ikke fortrydes.', ok: 'Slet kladde', farlig: true }))){ fokusPaa(grid.querySelector('[data-delete-draft]')); return; }
    Store.clearDraft();
    toast('Kladden er slettet');
    renderMine();
    fokusPaa(document.querySelector('#mine-grid .db-title') || document.getElementById('mine-heading'));
  });
}

/* V6: "Ingen gemte annoncer" er forkert, når der ER gemte annoncer, som blot kræver login (egne uuid-favoritter af private sælgere). Teksten, ikonet og knappen
   skiftes og gendannes, så markuppen i mine-annoncer.html stadig er den tomme tilstand uden JavaScript. */
function tomTilstand(empty, krL){
  if (!empty) return;
  const h = empty.querySelector('h3'), p = empty.querySelector('p'), a = empty.querySelector('a.btn');
  if (!h || !p || !a) return;
  if (!empty.dataset.org) empty.dataset.org = JSON.stringify({ h: h.textContent, p: p.textContent, t: a.textContent, href: a.getAttribute('href') });
  const o = JSON.parse(empty.dataset.org);
  empty.classList.toggle('db-empty--login', !!krL);
  if (krL){
    h.textContent = `${krL} gemt${krL === 1 ? '' : 'e'} annonce${krL === 1 ? '' : 'r'} kræver login`;
    p.textContent = `${krL === 1 ? 'Annoncen' : 'Annoncerne'} er fra private sælgere og gemmes på din konto. Log ind for at se ${krL === 1 ? 'den' : 'dem'}.`;
    a.textContent = 'Log ind';
    a.setAttribute('href', 'login.html?redirect=' + encodeURIComponent('mine-annoncer.html?tab=favoritter'));
  } else { h.textContent = o.h; p.textContent = o.p; a.textContent = o.t; a.setAttribute('href', o.href); }
}

async function renderFavorites(){
  /* V5: anonym (ingen login) ser kun de lokale favoritter (indekserede annoncer, gemt i denne browser). Egne uuid-favoritter kræver en konto:
     de hentes ikke (intet kald til databasen) og ryddes ikke (intet skrives). Findes der alligevel nogle, siger siden det (#db-anon-egne). */
  const anonym = !Store.getUser();
  const favIds = anonym ? [] : Store.getFavorites();
  const egneAnonymt = anonym ? Store.getFavorites().length : 0;
  const egneNote = document.getElementById('db-anon-egne');
  if (egneNote){
    egneNote.hidden = !egneAnonymt;
    if (egneAnonymt) egneNote.textContent = `Du har også ${egneAnonymt} gemt${egneAnonymt === 1 ? '' : 'e'} ${egneAnonymt === 1 ? 'annonce' : 'annoncer'} fra private sælgere på Bikerbasen. De vises, når du er logget ind.`;
  }
  let favs = favIds.map(id => Store.getListingById(id)).filter(Boolean);

  // Favoritter der ikke er blandt de indlæste annoncer (fx uden for de
  // hentede 200) hentes enkeltvis. Uden dette kunne en gemt annonce mangle,
  // selvom hjertet i toppen talte den med — netop den uoverensstemmelse.
  const kendte = new Set(favs.map(l => String(l.id)));
  const manglende = favIds.filter(id => !kendte.has(String(id)));
  const forældede = [];
  if (manglende.length && typeof db !== 'undefined' && db.enabled){
    for (const id of manglende){
      if (!isUuid(String(id))){ forældede.push(id); continue; } // gamle demo-id'er
      let svar;
      try { svar = await db.getListing(id); }
      catch (err){ svar = { data: null, error: err }; }   // netværksfejl: behold favoritten
      const { data, error } = svar || {};
      if (data){ favs.push(normalizeRemoteListing(data)); }
      // Kun "findes ikke" (PGRST116) prunes — en netværksfejl må ikke slette
      // en favorit, brugeren stadig har.
      else if (error && error.code === 'PGRST116'){ forældede.push(id); }
    }
  } else if (manglende.length){
    // Uden backend kan kun lokale/demo-id'er opløses; resten er forældede.
    manglende.forEach(id => { if (!isUuid(String(id))) forældede.push(id); });
  }

  // Ryd forældede favoritter, så hjertet i toppen altid matcher listen.
  if (forældede.length){
    const rensede = favIds.filter(id => !forældede.includes(id));
    localStorage.setItem(Store.KEYS.favorites, JSON.stringify(rensede));
    updateFavCount();
  }

  /* V5: indekserede favoritter (kun denne browser). Fundne annoncer sorteres sammen med de egne; forsvundne står til sidst som ærlige rækker. */
  const extIds = Store.getExternalFavorites();
  const extMeta = Store.getExternalFavoriteMeta();
  const lagerHentet = Store.dataStatus().eksterne === 'ok';
  const extFundet = [], extVaek = [];
  for (const id of extIds){
    const l = Store.getListingById(id);
    if (l && l.isExternal) extFundet.push(l); else extVaek.push(id);
  }
  favs = sortListings(favs.concat(extFundet), document.getElementById('fav-sort')?.value);
  const grid = document.getElementById('fav-grid');
  const empty = document.getElementById('fav-empty');
  const antalFav = favs.length + extVaek.length;
  /* V6 (Critic P2-5): tælleren og listen siger det samme. Header-tælleren ("Favoritter 2") tæller også egne uuid-favoritter, som en anonym ikke kan se
     (de kræver en konto). Her står derfor det SAMME tal (vist + kræver login), og siger listen intet, står der hvor mange der kræver login i stedet for
     "Ingen gemte annoncer". Logget ind er egneAnonymt 0, og alt er som før. */
  setCount('stat-fav', antalFav + egneAnonymt);
  setCount('fav-count-inline', antalFav + egneAnonymt);
  document.querySelector('#tab-favoritter .db-list-head')?.style.setProperty('display', antalFav ? '' : 'none');
  tomTilstand(empty, antalFav ? 0 : egneAnonymt);
  if (!antalFav){
    if (egneNote) egneNote.hidden = true;   // den tomme tilstand siger det selv
    grid.style.display = 'none';
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  grid.style.display = '';
  empty.style.display = 'none';
  grid.innerHTML = favs.map(l => l.isExternal ? extFavRowHTML(l) : favRowHTML(l)).join('') + extVaek.map(id => extGoneRowHTML(id, extMeta[String(id)], lagerHentet)).join('');
  wireFavoriteButtons(grid);
}

/* Count listings matching a saved search that appeared after it was created. */
function matchesForSavedSearch(search){
  const p = new URLSearchParams(search.query);
  const num = v => (v === null || v === '' || isNaN(Number(v))) ? null : Number(v);
  const csv = k => (p.get(k) || '').split(',').filter(Boolean);
  const q = (p.get('q') || '').trim().toLowerCase();
  const types = csv('types'), brands = csv('brands'), regions = csv('regions'), conditions = csv('conditions');
  const priceMin = num(p.get('priceMin')), priceMax = num(p.get('priceMax'));
  const yearMin = num(p.get('yearMin')), yearMax = num(p.get('yearMax'));
  const kmMax = num(p.get('kmMax')), ccmMin = num(p.get('ccmMin')), ccmMax = num(p.get('ccmMax'));
  const dealerOnly = p.get('dealer') === '1';

  return Store.getAllListings().filter(l => {
    if (q && !`${l.brand} ${l.model}`.toLowerCase().includes(q)) return false;
    if (types.length && !types.includes(l.type)) return false;
    if (brands.length && !brands.includes(l.brand)) return false;
    if (priceMin != null && l.price < priceMin) return false;
    if (priceMax != null && l.price > priceMax) return false;
    if (yearMin != null && l.year < yearMin) return false;
    if (yearMax != null && l.year > yearMax) return false;
    if (kmMax != null && l.km > kmMax) return false;
    if (ccmMin != null && l.ccm < ccmMin) return false;
    if (ccmMax != null && l.ccm > ccmMax) return false;
    if (regions.length && !regions.includes(l.region)) return false;
    if (conditions.length && !conditions.includes(l.condition)) return false;
    if (dealerOnly && !l.isDealer) return false;
    return true;
  });
}

/* " · oprettet 16. aug. 2026" — eller intet, hvis datoen mangler (aldrig "Invalid Date"). */
function agentDato(iso){
  const t = new Date(iso || '').getTime();
  if (!iso || isNaN(t)) return '';
  return ' · oprettet ' + new Date(t).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderAgents(){
  const agents = Store.getSavedSearches();
  setCount('stat-agenter', agents.length);
  setCount('agent-count-inline', agents.length);
  const list = document.getElementById('agents-list');
  const empty = document.getElementById('agents-empty');
  if (!agents.length){
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  list.innerHTML = agents.map(a => {
    const matches = matchesForSavedSearch(a);
    const since = new Date(a.createdAt).getTime();
    /* Runde 8 (D8-S3): createdAt er med vilje null paa alle indekserede — saa
       taltes "nye" aldrig. Det, vi VED, er foerst_set: hvornaar VI saa
       annoncen foerste gang. Det er praecis det, en gemt soegning skal taelle
       fra. Etiketten siger det (title). */
    const setFoerste = l => new Date(l.indekseretFoerste || l.createdAt || 0).getTime();
    const fresh = matches.filter(l => setFoerste(l) > since).length;
    return `
    <div class="agent-item">
      <div class="agent-info">
        <div class="agent-label">${escapeHTML(a.label)}${fresh ? `<span class="agent-new" title="Set hos kilderne første gang, efter du gemte søgningen">${fresh} ny${fresh === 1 ? '' : 'e'}</span>` : ''}</div>
        <!-- "matches" er engelsk, og søgeagenten tæller præcis det, søgesiden
             tæller — dér hedder det "29 annoncer fundet" (js/search.js).
             Datoen stod desuden som 16.08.2026, mens annoncesiden og
             sælgerprofilen skriver 16. aug. 2026: samme dato, to
             skrivemåder, og den korte er repoets regel. -->
        <div class="agent-meta">${matches.length} ${matches.length === 1 ? 'annonce' : 'annoncer'} i alt${agentDato(a.createdAt)}</div>
      </div>
      <div class="agent-actions">
        <a href="soegning.html?${escapeHTML(a.query)}" class="btn btn-outline btn-sm">Vis</a>
        <button type="button" class="icon-btn ${a.notify ? '' : 'muted'}" data-notify="${a.id}"
                aria-label="${a.notify ? 'Slå notifikationer fra' : 'Slå notifikationer til'}"
                title="${a.notify ? 'Markeret til besked. Der sendes endnu ingen e-mails om nye indekserede annoncer.' : 'Ikke markeret til besked'}">${a.notify ? Icon.bell : Icon.bellOff}</button>
        <button type="button" class="icon-btn" data-del-agent="${a.id}" aria-label="Slet søgeagent">${Icon.trash}</button>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('[data-notify]').forEach(b => b.addEventListener('click', () => {
    Store.toggleSavedSearchNotify(Number(b.dataset.notify));
    renderAgents();
  }));
  list.querySelectorAll('[data-del-agent]').forEach(b => b.addEventListener('click', () => {
    Store.removeSavedSearch(Number(b.dataset.delAgent));
    toast('Søgeagent slettet');
    renderAgents();
  }));
}

/* Er betaling reelt bygget? Flaget BETALING_BYGGET (js/store.js) er false, indtil
   der findes en aftale og privatlivspolitikken er rettet. Uanset FRI_ADGANG. */
function betalingAaben(){
  return typeof BETALING_BYGGET !== 'undefined' && BETALING_BYGGET === true
    && !(typeof FRI_ADGANG !== 'undefined' && FRI_ADGANG);
}

/* Kontokortets markup som ren funktion (testes). */
function planKortHTML(user){
  // Gratis-tilstand: ingen paywall. Alle har ubegrænset adgang lige nu.
  if (typeof FRI_ADGANG !== 'undefined' && FRI_ADGANG){
    return `
      <h3 style="margin-bottom:6px;">Adgang</h3>
      <p class="plan-badge">${Icon.checkCircle} Ubegrænset · gratis</p>
      <ul class="plan-perks" style="margin-top:12px;">
        <li>${Icon.checkCircle} Opret så mange annoncer du vil</li>
        <li>${Icon.checkCircle} Gem favoritter og søgeagenter</li>
        <li>${Icon.checkCircle} Se sælgerens telefonnummer, når sælgeren har valgt at vise det</li>
      </ul>
      <p style="font-size:13px; color:var(--color-fg-muted); margin:12px 0 0;">Bikerbasen er gratis for alle i øjeblikket — både private og forhandlere.</p>`;
  }

  // Betaling er ikke bygget: ærlig besked, ingen knapper, intet om Stripe.
  if (!betalingAaben()){
    return `
      <h3 style="margin-bottom:6px;">Abonnement</h3>
      <p class="plan-badge">${Icon.info} Betaling er ikke åben endnu</p>
      <p style="color:var(--color-fg-muted); font-size:14px; margin:10px 0 0;">
        Der kan ikke tegnes eller betales for abonnementer på Bikerbasen i øjeblikket. Du bliver ikke opkrævet noget.</p>`;
  }

  const erForhandler = user?.plan === 'dealer';

  if (erForhandler){
    return `
      <h3 style="margin-bottom:6px;">Dit abonnement</h3>
      <p class="plan-badge">${Icon.shieldCheck} Forhandler · aktivt</p>
      <p style="color:var(--color-fg-muted); font-size:14px; margin:10px 0 0;">
        Du har ubegrænsede annoncer, forhandler-shop og fremhævet placering.</p>
      <button type="button" class="btn btn-outline btn-block" id="plan-portal" style="margin-top:14px;">Administrér abonnement</button>
      <p style="font-size:12px; color:var(--color-fg-muted); margin:10px 0 0;">Opsig, skift betalingskort eller se kvitteringer via Stripes sikre kundeportal.</p>`;
  } else {
    return `
      <h3 style="margin-bottom:6px;">Bliv forhandler</h3>
      <p style="color:var(--color-fg-muted); font-size:14px; margin-bottom:12px;">
        Private konti kan have 3 aktive annoncer gratis. Som forhandler får du:</p>
      <ul class="plan-perks">
        <li>${Icon.checkCircle} Ubegrænsede annoncer</li>
        <li>${Icon.checkCircle} Egen shop-side med alle dine motorcykler</li>
        <li>${Icon.checkCircle} Forhandler-badge og fremhævet placering</li>
      </ul>
      <button type="button" class="btn btn-primary btn-block" id="plan-upgrade" style="margin-top:14px;">Bliv forhandler</button>
      <p style="font-size:12px; color:var(--color-fg-muted); margin:10px 0 0;">Betaling via Stripe. Du kan opsige når som helst.</p>`;
  }
}

function renderPlanCard(){
  const card = document.getElementById('plan-card');
  if (!card) return;
  card.innerHTML = planKortHTML(Store.getUser());
  if (!betalingAaben()) return;

  // Rigtig betaling: send brugeren til Stripes checkout. Webhooken saetter
  // planen, naar betalingen er gaaet igennem.
  const opgrader = async (btn) => {
    btn.disabled = true; btn.textContent = 'Åbner betaling…';
    const { data, error } = await db.startCheckout();
    if (error || !data?.url){
      btn.disabled = false; btn.textContent = 'Bliv forhandler';
      toast('Betaling kunne ikke startes. Prøv igen om lidt.', { type: 'error' });
      return;
    }
    window.location.href = data.url;
  };

  // Opsigelse haandteres i Stripes kundeportal, ikke her — for nu vises kun
  // status.
  // Åbn Stripes kundeportal, hvor forhandleren selv styrer abonnementet.
  const åbnPortal = async (btn) => {
    btn.disabled = true; btn.textContent = 'Åbner…';
    const { data, error } = await db.openBillingPortal();
    if (error || !data?.url){
      btn.disabled = false; btn.textContent = 'Administrér abonnement';
      toast('Kunne ikke åbne kundeportalen. Prøv igen om lidt.');
      return;
    }
    window.location.href = data.url;
  };

  document.getElementById('plan-upgrade')?.addEventListener('click', (e) => opgrader(e.currentTarget));
  document.getElementById('plan-portal')?.addEventListener('click', (e) => åbnPortal(e.currentTarget));
}

/* Rækkerne i "Bekræftelser". MitID er ikke sat op (login.html siger det), så identitetsrækken
   viser aldrig "Bekræftet" og aldrig "Ikke bekræftet", som om brugeren kunne gøre noget ved det —
   uanset hvad en gammel lokal session måtte have i user.mitIdVerified. */
function kontoRaekker(user){
  const rows = [
    { label: 'E-mail', done: !!user?.emailVerified, icon: 'mail' },
    { label: 'Telefonnummer', done: !!user?.phoneVerified, icon: 'phone' },
    { label: 'Identitetsbekræftelse', done: false, icon: 'fingerprint', note: 'Ikke åben endnu' },
  ];
  if (user?.isDealer) rows.push({ label: `Virksomhed (CVR${user.cvr ? ' · ' + user.cvr : ''})`, done: !!user.cvrVerified, icon: 'shieldCheck' });
  return rows;
}

function kontoRaekkerHTML(user){
  return kontoRaekker(user).map(r => `
    <div class="verify-row ${r.done ? 'done' : ''}">
      <div class="verify-row-info">${Icon[r.icon]}<span>${escapeHTML(r.label)}</span></div>
      ${r.done ? `<span class="verify-status-done">${Icon.checkCircle}Bekræftet</span>` : `<span style="font-size:13px; color:var(--color-fg-muted);">${r.note || 'Ikke bekræftet'}</span>`}
    </div>`).join('');
}

function renderAccountTab(){
  renderProfileCard();
  renderPlanCard();
  const user = Store.getUser();
  document.getElementById('account-verify-rows').innerHTML = kontoRaekkerHTML(user);
}

/* Oplysningerne fra sessionen. Der er ingen redigeringsformular — det, der
   står her, er kun det, kontoen faktisk indeholder. */
function renderProfileCard(){
  const card = document.getElementById('profile-card');
  const user = Store.getUser();
  if (!card || !user) return;
  const raekke = (label, vaerdi) => vaerdi
    ? `<div class="verify-row"><div class="verify-row-info"><span>${label}</span></div><span class="db-profile-val">${escapeHTML(String(vaerdi))}</span></div>`
    : '';
  const kanSamtykke = !!user.remote && typeof db !== 'undefined' && db.enabled;
  card.innerHTML = `
    <h3 style="margin-bottom:14px;">Dine oplysninger</h3>
    ${raekke('Navn', user.name)}
    ${raekke('E-mail', user.email)}
    ${raekke('Telefon', user.phone)}
    ${raekke('Kontotype', user.isDealer ? 'Forhandler' : 'Privat sælger')}
    ${raekke('Virksomhed', user.company)}
    ${raekke('CVR', user.cvr)}
    ${kanSamtykke ? `
    <form class="db-profile-form" id="vis-telefon-form">
      <label class="db-check"><input type="checkbox" id="pf-vis-telefon" disabled><span>Vis mit telefonnummer for indloggede købere på mine annoncer</span></label>
      <p class="field-hint" id="pf-hint" aria-live="polite">Henter dit valg…</p>
      <button type="submit" class="btn btn-outline btn-sm" id="pf-gem" disabled>Gem valg</button>
    </form>` : ''}
    <p style="font-size:13px; color:var(--color-fg-muted); margin:12px 0 0;">Vil du rette navn eller e-mail, så skriv til <a href="mailto:kontakt@bikerbasen.dk" style="color:var(--color-primary);">kontakt@bikerbasen.dk</a>.</p>`;
  if (!kanSamtykke) return;
  const boks = document.getElementById('pf-vis-telefon'), hint = document.getElementById('pf-hint'), gem = document.getElementById('pf-gem');
  db.currentProfile().then(p => {
    boks.checked = !!p?.vis_telefon; boks.disabled = false; gem.disabled = false;
    hint.textContent = String(p?.phone || '').trim() ? 'Kun for indloggede — aldrig for søgemaskiner eller udloggede.' : 'Du har ikke oplyst et nummer, så der er intet at vise endnu.';
  }).catch(() => { hint.textContent = 'Dit valg kunne ikke hentes lige nu.'; });
  document.getElementById('vis-telefon-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    gem.disabled = true;
    let svar;
    try { svar = await db.saetVisTelefon(boks.checked); }
    catch (err){ svar = { error: err }; }
    gem.disabled = false;
    if (svar && svar.error) toast('Valget kunne ikke gemmes: ' + escapeHTML(fejlTekst(svar.error)), { type: 'error' });
    else toast('Dit valg er gemt');
  });
}

/* Kontokortet i sidebjælken: initialer, navn og e-mail fra sessionen. */
function fyldKontoKort(user){
  const set = (id, tekst) => { const el = document.getElementById(id); if (el) el.textContent = tekst; };
  set('db-avatar', initials(user.name || user.email));
  set('db-user-name', user.name || 'Din profil');
  set('db-user-mail', user.email || '');
}

/* ---------- "Henter"-tilstand (V6, P2-6) ----------
   <main class="db-venter"> holder alt indhold under fanebjælken usynligt (css/p-dashboard.css), til data er tegnet. visSiden() fjerner klassen. */
function visSiden(){
  const m = document.querySelector('main.db-page');
  if (!m) return;
  m.classList.remove('db-venter');
  m.removeAttribute('aria-busy');
}

/* ---------- Faner ---------- */
const DB_FANER = ['oversigt', 'mine', 'beskeder', 'favoritter', 'agenter', 'konto'];
let AKTIV_FANE = 'oversigt';

/* V7: Beskeder-fanen findes kun med flaget og en profil i databasen (lokale demoprofiler kan ikke sende eller modtage). */
function beskederTilgaengelig(){
  const b = Store.getUser();
  return typeof bbFlag === 'function' && bbFlag('beskeder') && !!(b && b.remote) && typeof db !== 'undefined' && !!db.enabled;
}
let BESKED_INDBAKKE = null;
async function startBeskeder(){
  const rod = document.getElementById('beskeder-rod');
  if (!rod || BESKED_INDBAKKE) return;
  BESKED_INDBAKKE = 'henter';
  const B = await bbIndlaesBeskeder();
  if (!B){
    BESKED_INDBAKKE = null;
    rod.innerHTML = '<div class="db-empty" role="alert"><h3>Beskeder kunne ikke hentes</h3><p>Tjek din forbindelse, og prøv igen.</p><button type="button" class="btn btn-primary" id="beskeder-proev">Prøv igen</button></div>';
    document.getElementById('beskeder-proev')?.addEventListener('click', () => { rod.innerHTML = '<p role="status">Henter dine beskeder …</p>'; startBeskeder(); });
    return;
  }
  BESKED_INDBAKKE = B.indbakke(rod, { startSamtale: new URLSearchParams(window.location.search).get('samtale') });
}

function setActiveTab(tab, { fokus = false, scroll = false } = {}){
  if (!DB_FANER.includes(tab) || (tab === 'beskeder' && !beskederTilgaengelig())) tab = 'oversigt';
  AKTIV_FANE = tab;
  document.querySelectorAll('.db-tab').forEach(b => {
    const aktiv = b.dataset.tab === tab;
    b.classList.toggle('active', aktiv);
    b.setAttribute('aria-selected', String(aktiv));
    b.tabIndex = aktiv ? 0 : -1;
    if (aktiv && fokus) b.focus();
  });
  document.querySelectorAll('.db-menu-item[data-tab-go]').forEach(b => b.classList.toggle('active', b.dataset.tabGo === tab));
  const visAnnoncer = tab === 'oversigt' || tab === 'mine';
  document.getElementById('db-stats').style.display = tab === 'oversigt' ? '' : 'none';
  document.getElementById('db-panel-annoncer').style.display = visAnnoncer ? '' : 'none';
  document.getElementById('db-panel-annoncer').setAttribute('aria-labelledby', 'tabbtn-' + (visAnnoncer ? tab : 'oversigt'));
  document.getElementById('tab-favoritter').style.display = tab === 'favoritter' ? '' : 'none';
  const beskedPanel = document.getElementById('tab-beskeder');
  if (beskedPanel) beskedPanel.style.display = tab === 'beskeder' ? '' : 'none';
  document.getElementById('tab-agenter').style.display = tab === 'agenter' ? '' : 'none';
  document.getElementById('tab-konto').style.display = tab === 'konto' ? '' : 'none';
  if (tab === 'beskeder') startBeskeder();
  if (tab === 'konto') renderAccountTab();
  if (tab === 'agenter') renderAgents();
  const p = new URLSearchParams(window.location.search);
  p.set('tab', tab);
  if (tab !== 'beskeder') p.delete('samtale');
  history.replaceState(null, '', window.location.pathname + '?' + p.toString());
  if (scroll) document.querySelector('.db-tabbar')?.scrollIntoView({ block: 'start' });
}

function wireTabFade(){
  const rk = document.querySelector('.db-tabs');
  if (!rk) return;
  const opd = () => rk.classList.toggle('at-end', rk.scrollLeft + rk.clientWidth >= rk.scrollWidth - 4);
  rk.addEventListener('scroll', opd, { passive: true });
  window.addEventListener('resize', opd);
  opd();
}

function wireTabs(){
  wireTabFade();
  /* V7: Beskeder-fanen vises kun, når den er tilgængelig (flag + login i databasen). Piletaster springer skjulte faner over. */
  if (beskederTilgaengelig()) document.getElementById('tabbtn-beskeder')?.removeAttribute('hidden');
  const faner = [...document.querySelectorAll('.db-tab:not([hidden])')];
  faner.forEach((btn, i) => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
    // Piletaster flytter mellem faner, som i et rigtigt tablist.
    btn.addEventListener('keydown', (e) => {
      const retning = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (e.key === 'Home' || e.key === 'End'){
        e.preventDefault();
        setActiveTab(faner[e.key === 'Home' ? 0 : faner.length - 1].dataset.tab, { fokus: true });
      } else if (retning){
        e.preventDefault();
        setActiveTab(faner[(i + retning + faner.length) % faner.length].dataset.tab, { fokus: true });
      }
    });
  });
  // Genveje i statistikkort og sidebjælke.
  document.querySelectorAll('[data-tab-go]').forEach(el => {
    el.addEventListener('click', () => setActiveTab(el.dataset.tabGo, { scroll: true }));
  });
  // Log ud: samme handler som headerens knap (sletter sessionen og navigerer).
  document.getElementById('db-logout')?.addEventListener('click', () => {
    const slot = document.querySelector('[data-auth-slot]');
    if (slot) slot.click(); else { Store.logout(); window.location.href = 'index.html'; }
  });
}

/* V5: ÉN fane er åben for anonyme: ?tab=favoritter ("Gemte annoncer" i headeren). Favoritter på indekserede annoncer gemmes kun i browseren (D-008), så de
   skal kunne ses uden login. Alle andre faner, handlinger og sidens øvrige dele kræver stadig login (omdirigering som før). */
function erAabenFaneForAnonyme(){
  const t = new URLSearchParams(window.location.search).get('tab');
  return t === 'favoritter' || t === 'gemte';
}

async function startAnonymeFavoritter(){
  document.body.classList.add('db-anonym');
  renderHeader('mine-annoncer.html');
  document.querySelectorAll('.bc-sep').forEach(s => { s.innerHTML = Icon.chevronRight; });
  document.getElementById('fav-empty-icon').innerHTML = Icon.heart;
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = dbIkon(el.dataset.icon); });
  document.title = 'Gemte annoncer | Bikerbasen';
  const h1 = document.getElementById('db-h1'); if (h1) h1.textContent = 'Gemte annoncer';
  const lead = document.querySelector('.db-hero-lead'); if (lead) lead.textContent = 'De annoncer, du har gemt med hjertet.';
  const aktuel = document.querySelector('.db-crumb [aria-current="page"]'); if (aktuel) aktuel.textContent = 'Gemte annoncer';
  const fane = document.getElementById('tabbtn-favoritter');
  if (fane){ fane.classList.add('active'); fane.setAttribute('aria-selected', 'true'); fane.tabIndex = 0; }
  document.getElementById('tab-favoritter').style.display = '';
  document.getElementById('db-anon-note').hidden = false;
  document.getElementById('fav-sort').addEventListener('change', renderFavorites);
  document.addEventListener('bb:favorites-changed', renderFavorites);
  try { await renderFavorites(); } finally { visSiden(); }
}

document.addEventListener('DOMContentLoaded', async () => {
  await backendReady();
  if (!Store.getUser()){
    if (erAabenFaneForAnonyme()){ await startAnonymeFavoritter(); return; }
    window.location.replace('login.html?redirect=' + encodeURIComponent('mine-annoncer.html' + window.location.search));
    return;
  }

  renderHeader('mine-annoncer.html');
  const bruger = Store.getUser();
  fyldKontoKort(bruger);
  document.querySelectorAll('.bc-sep').forEach(s => { s.innerHTML = Icon.chevronRight; });
  document.getElementById('mine-empty-icon').innerHTML = Icon.bike;
  document.getElementById('fav-empty-icon').innerHTML = Icon.heart;
  document.getElementById('agents-empty-icon').innerHTML = Icon.bell;
  document.getElementById('agent-note-icon').innerHTML = Icon.info;
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = dbIkon(el.dataset.icon); });

  await Promise.all([hentEgneAlle(), hentRaekkeStatistik()]);
  renderMine();
  /* Favoritter kan kræve enkeltopslag (en gemt annonce uden for de hentede 200): vent på dem, men højst 2,5 s, så siden aldrig hænger på dem. */
  const favKlar = renderFavorites();
  renderAgents();
  wireTabs();

  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('dialog.bb-bekraeft')) return;   // dialogen hører til menuens handling
    document.querySelectorAll('.db-more[open]').forEach(d => { if (!d.contains(e.target)) d.removeAttribute('open'); });
  });
  /* Tab ud af en åben ⋮-menu lukker den (ellers står den åben over næste række). Ikke når fokus går til bekræftelsesdialogen. */
  document.addEventListener('focusout', (e) => {
    const d = e.target.closest && e.target.closest('.db-more[open]');
    const hen = e.relatedTarget;
    if (!d || !hen || d.contains(hen) || (hen.closest && hen.closest('dialog.bb-bekraeft'))) return;
    d.removeAttribute('open');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.db-more[open]').forEach(d => { d.removeAttribute('open'); d.querySelector('summary')?.focus(); });
  });
  document.getElementById('mine-sort').addEventListener('change', renderMine);
  document.getElementById('fav-sort').addEventListener('change', renderFavorites);
  document.addEventListener('bb:favorites-changed', renderFavorites);

  document.getElementById('delete-account-btn').addEventListener('click', async () => {
    // C4 (23.08.2026): teksten lovede 'din konto og dine annoncer slettes permanent',
    // men Store.deleteAllData() rydder kun localStorage. Nu siger den, hvad der sker.
    if (!(await bekraeft({ titel: 'Ryd data i denne browser?', tekst: 'Rydder favoritter, søgeagenter, senest sete og din login-session fra denne browser. Din konto og dine annoncer i databasen bliver stående — skriv til kontakt@bikerbasen.dk for at få dem slettet.', ok: 'Ryd data i browseren', farlig: true }))) return;
    Store.deleteAllData();
    window.location.href = 'index.html';
  });

  const params = new URLSearchParams(window.location.search);
  /* ?tab=aktive|kladder|annoncer er gamle/oplagte adresser til listen; ?tab=profil til kontofanen. */
  const FANE_ALIAS = { aktive: 'mine', kladder: 'mine', annoncer: 'mine', gemte: 'favoritter', soegeagenter: 'agenter', profil: 'konto' };
  const oensket = params.get('tab') || 'oversigt';
  setActiveTab(FANE_ALIAS[oensket] || oensket);
  await Promise.race([favKlar, new Promise(r => setTimeout(r, 2500))]).catch(() => {});
  visSiden();

  // Retur fra Stripe efter gennemført betaling. Webhooken sætter planen, men
  // kan være et øjeblik undervejs — hent sessionen igen og opdater kortet.
  if (params.get('abonnement') === 'ok' && betalingAaben()){
    toast('Tak! Din betaling er modtaget.');
    for (let i = 0; i < 5; i++){
      await syncSessionToStore();
      renderPlanCard();
      if (Store.getUser()?.plan === 'dealer') break;
      await new Promise(r => setTimeout(r, 1500));
    }
    // Ryd parameteren, så en genindlæsning ikke gentager beskeden.
    history.replaceState(null, '', 'mine-annoncer.html?tab=konto');
  }
});
