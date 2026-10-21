/* ============ Header hydration ============
   Header/nav/footer markup is static real HTML in every page (crawlable and
   functional with JS disabled). These functions only enhance it: active nav
   state, favorites count, and logged-in state swap. */

function renderHeader(activeOverride){
  const header = document.querySelector('.site-header');
  if (!header) return;
  const current = activeOverride || location.pathname.split('/').pop() || 'index.html';
  /* Aktiv menu = den sidefamilie man står i, ikke kun præcis den fil: mærkesider hører under
     Mærker, type-/region-/model-/annoncesider under Motorcykler, kørekortsider under Kørekort,
     guides under Artikler & guides. */
  const familie = /^maerke-|^maerker\.html$/.test(current) ? 'maerker.html'
    : /^(type-|region-|model-|annonce)/.test(current) || current === 'soegning.html' ? 'soegning.html'
    : /^koerekort-/.test(current) ? 'koerekort-a2.html'
    : /^guide/.test(current) ? 'guides.html' : current;
  document.querySelectorAll('.main-nav a, .mobile-drawer-panel a[href]').forEach(a => {
    if (a.hasAttribute('data-auth-slot-mobile')) return;
    const href = a.getAttribute('href');
    const aktiv = href === current || href === familie;
    a.classList.toggle('active', aktiv);
    if (aktiv) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  updateAuthVisibility();
  injectDealerNav(current);
  updateFavCount();
  updateAuthSlot();
  wireHeader();
  initCookieConsent();
}

/* Opret annonce og Mine annoncer kræver login — begge sider sender en
   anonym bruger direkte videre til login. Derfor skjules de i toppen, når
   ingen er logget ind, så man ikke lokkes ind i et dødt link. Punkterne
   står stadig i HTML'en (crawlbare), og vises igen straks man logger ind. */
function updateAuthVisibility(){
  const loggedIn = !!Store.getUser();
  // Fuld href, så "Gemte annoncer" (mine-annoncer.html?tab=favoritter) ikke
  // rammes. Kun den ene fane er åben for anonyme: favoritter på indekserede
  // annoncer gemmes kun i browseren (Store.getExternalFavorites) og kan ses uden
  // login (js/mine-annoncer.js, startAnonymeFavoritter). Siden viser dem og intet
  // andet; alle andre faner på Mine annoncer sender stadig en anonym til login.
  /* RUNDE 13 (R13-15): "opret-annonce.html" stod her og blev SKJULT for
     anonyme, saa ingen blev lokket ind i et doedt link. Men linket er ikke
     doedt: js/opret-annonce.js:1064 sender selv en anonym bruger til
     login.html?redirect=opret-annonce.html og tilbage igen bagefter.

     Prisen var, at saelgersidens primaere indgang var usynlig for praecis den
     gruppe, der endnu ikke HAR en konto — paa en Google-landing var
     desktop-headeren "Forside · Soeg motorcykler · Log ind", og kun footeren
     havde vejen ind. docs/forretning.md kalder privat udbud den knappe
     ressource; saa maa vejen derind ikke vaere skjult for nytilkomne. */
  const authOnly = ['mine-annoncer.html'];
  document.querySelectorAll('.main-nav a, .mobile-drawer-panel a[href], .header-cta').forEach(a => {
    if (authOnly.includes(a.getAttribute('href'))) a.hidden = !loggedIn;
  });
}

/* Dashboard is dealer-only, so the link is injected for dealer accounts
   rather than shipped in the static nav for everyone. */
function injectDealerNav(current){
  const user = Store.getUser();
  if (!user || !user.isDealer) return;
  if (document.querySelector('[data-dealer-nav]')) return;

  const nav = document.querySelector('.main-nav');
  if (nav){
    const a = document.createElement('a');
    a.href = 'dashboard.html';
    a.textContent = 'Dashboard';
    a.setAttribute('data-dealer-nav', '');
    if (current === 'dashboard.html') a.classList.add('active');
    nav.appendChild(a);
  }
  const drawer = document.querySelector('.mobile-drawer-panel .drawer-divider');
  if (drawer){
    const a = document.createElement('a');
    a.href = 'dashboard.html';
    a.innerHTML = `${Icon.chart}Dashboard`;
    a.setAttribute('data-dealer-nav', '');
    drawer.parentNode.insertBefore(a, drawer);
  }
}

/* D-008: hjertet i toppen står på alle 14 sider og viste "0" — og i drift kan
   det ALDRIG blive andet end 0.

   Regnestykket: databasen har 0 egne annoncer (`listings`) og 332 indekserede
   (`eksterne_annoncer`). Kun egne annoncer kan gemmes — `favorites.listing_id`
   er `uuid not null references public.listings(id)`, så en uuid fra
   `eksterne_annoncer` bliver afvist af fremmednøglen. Der stod altså en
   global knap i toppen af hver eneste side, som 100 % af det aktuelle lager
   var udelukket fra.

   Valget er beskrevet i docs/review/DECISIONS.md: vi opfinder ikke en
   favorit, der ikke kan gemmes. Så bliver den anden udgang tilbage —
   funktionen må ikke fremstå tilgængelig, når den ikke er det.

   Reglen er selvsandende og kræver ikke at kende lagerets sammensætning:
   indgangen til "Gemte annoncer" vises, når der ER noget gemt. Den dukker op
   i samme sekund, det første hjerte trykkes (bb:favorites-changed), og den
   forsvinder igen, når det sidste fjernes. Den dag `listings` får rækker,
   virker den af sig selv — der skal ikke huskes noget.

   Selve markuppen bliver stående i HTML'en, så siden er crawlbar og virker
   uden javascript; det er kun visningen, der styres her. Favoritfanen er
   uændret tilgængelig fra mine-annoncer.html's egne faneblade. */
function updateFavCount(){
  const n = Store.getAllFavorites().length;   // V5: egne (database/lokale) + indekserede (kun denne browser)
  /* W9: desktopheaderens "Favoritter" står altid (billede 1); kun skuffens "Gemte annoncer (0)" skjules ved 0. */
  const skjul = el => { const a = el.closest && el.closest('a'); if (a && !a.classList.contains('header-fav')) a.hidden = n === 0; };
  document.querySelectorAll('[data-fav-count]').forEach(el => {
    el.textContent = n; el.setAttribute('data-count', n); skjul(el);
  });
  document.querySelectorAll('[data-fav-count-mobile]').forEach(el => { el.textContent = n; skjul(el); });
}

function updateAuthSlot(){
  const user = Store.getUser();
  if (!user) return;
  const onLogout = async (e) => {
    e.preventDefault();
    if (typeof db !== 'undefined' && db.enabled) await db.signOut();
    Store.logout();
    window.location.href = 'index.html';
  };
  // Navnet escapes, selvom det er brugerens eget: uden det kunne et navn som
  // <img onerror> køre kode i ens egen header (self-XSS). Billig forsikring.
  const slot = document.querySelector('[data-auth-slot]');
  if (slot){
    /* W14: "Test · Log ud" læste som en fejl (navn og handling i ét link). Nu: "Min profil" (link til Mine annoncer)
       og et eget "Log ud"-link ved siden af. */
    slot.setAttribute('href', 'mine-annoncer.html');
    slot.setAttribute('title', String(user.name || '').trim() ? 'Logget ind som ' + String(user.name).trim() : 'Min profil');
    slot.innerHTML = `${Icon.user}Min profil`;
    document.querySelectorAll('.site-footer a[href="login.html"]').forEach(a => { a.textContent = 'Min profil'; a.setAttribute('href', 'mine-annoncer.html'); });
    if (!document.querySelector('[data-auth-logout]')){
      const ud = document.createElement('a');
      ud.href = '#'; ud.className = 'header-login header-logout'; ud.setAttribute('data-auth-logout', '');
      ud.textContent = 'Log ud';
      slot.insertAdjacentElement('afterend', ud);
      ud.addEventListener('click', onLogout);
    }
  }
  /* Runde 5 (D5-F7): profilikonet i mobilheaderen. Logget ind peger det paa
     "Mine annoncer" — IKKE paa log-ud: et ikon, der logger én ud ved et tryk,
     er en faelde. Log ud ligger i skuffen som foer. */
  const slotIcon = document.querySelector('[data-auth-slot-icon]');
  if (slotIcon){
    slotIcon.setAttribute('href', 'mine-annoncer.html');
    slotIcon.setAttribute('aria-label', `Min profil (${String(user.name || '').split(' ')[0] || 'logget ind'})`);
    slotIcon.classList.add('is-logged-in');
  }
  const slotMobile = document.querySelector('[data-auth-slot-mobile]');
  if (slotMobile){
    slotMobile.setAttribute('href', '#');
    slotMobile.innerHTML = `${Icon.user}Log ud (${escapeHTML(user.name || '')})`;
    slotMobile.addEventListener('click', onLogout);
  }
}

let headerWired = false;
function wireHeader(){
  if (headerWired) return;
  headerWired = true;
  const drawer = document.getElementById('mobile-drawer');
  const openBtn = document.querySelector('.mobile-menu-btn');
  if (openBtn && drawer){
    /* Menuskuffen skiftede før kun en CSS-klasse. Åben var den en dialog i
       markup (role="dialog"), men opførte sig ikke som en: knappen sagde ikke
       "udvidet", fokus blev på knappen bag skuffen, Escape lukkede ikke, Tab
       løb ud i siden bag, og baggrunden var stadig tabbar. Samme greb som
       filterskuffen (setBackgroundInert i js/search.js): inert på baggrunden,
       fokus ind og tilbage, Escape og en Tab-fælde. Lukket er skuffen
       display:none og altså ikke tabbar, så den lukkede tilstand er urørt. */
    const panel = drawer.querySelector('.mobile-drawer-panel');
    const luk = drawer.querySelector('.mobile-drawer-close');
    const erAaben = () => drawer.classList.contains('open');
    const setBaggrundInert = (on) => {
      // Alle søskende på vejen op fra skuffen: header, main og footer, uden at
      // kende dem ved navn — samme tilgang som filterskuffen.
      let node = drawer;
      while (node && node !== document.body){
        const foraeldre = node.parentElement;
        if (foraeldre) Array.from(foraeldre.children).forEach(sib => {
          if (sib === node) return;
          if (on) sib.setAttribute('inert', ''); else sib.removeAttribute('inert');
        });
        node = foraeldre;
      }
    };
    openBtn.setAttribute('aria-controls', 'mobile-drawer');
    openBtn.setAttribute('aria-expanded', 'false');
    // overlay-open skjuler cookiebanneret, der ellers ligger oven på skuffen.
    const setDrawer = (open, gendanFokus = true) => {
      drawer.classList.toggle('open', open);
      document.body.classList.toggle('overlay-open', open);
      openBtn.setAttribute('aria-expanded', String(open));
      setBaggrundInert(open);
      if (panel){
        if (open) panel.setAttribute('aria-modal', 'true'); else panel.removeAttribute('aria-modal');
      }
      if (open) (luk || panel).focus();
      else if (gendanFokus) openBtn.focus();
    };
    openBtn.addEventListener('click', () => setDrawer(true));
    drawer.querySelectorAll('[data-drawer-close]').forEach(el => el.addEventListener('click', () => setDrawer(false)));
    document.addEventListener('keydown', (e) => {
      if (!erAaben()) return;
      if (e.key === 'Escape'){ setDrawer(false); return; }
      if (e.key !== 'Tab' || !panel) return;
      const f = Array.from(panel.querySelectorAll('a[href], button:not([disabled])')).filter(n => n.offsetParent !== null);
      if (!f.length) return;
      const foerste = f[0], sidste = f[f.length - 1];
      if (e.shiftKey && document.activeElement === foerste){ e.preventDefault(); sidste.focus(); }
      else if (!e.shiftKey && document.activeElement === sidste){ e.preventDefault(); foerste.focus(); }
    });
    // Vokser vinduet forbi menuknappens breakpoint (1024 px), mens skuffen står
    // åben, er knappen væk og skuffen en tom dialog over desktopsiden — inert
    // ville blive hængende og gøre hele siden utilgængelig.
    window.matchMedia('(min-width:1024px)').addEventListener('change', (e) => {
      if (e.matches && erAaben()) setDrawer(false, false);
    });
  }
  /* Undermenuen (Kørekort → A1/A2) åbner på hover og fokus og skal kunne afvises uden at flytte musen
     eller fokus (WCAG 1.4.13): Escape sætter data-lukket, som CSS læser; hover/fokus ud af menuen
     fjerner det igen. Ligger fokus i undermenuen, flyttes det op til forældrelinket. */
  document.querySelectorAll('.nav-item').forEach(item => {
    const genåbn = () => item.removeAttribute('data-lukket');
    item.addEventListener('mouseleave', genåbn);
    item.addEventListener('focusout', (e) => { if (!item.contains(e.relatedTarget)) genåbn(); });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.nav-item:hover, .nav-item:focus-within').forEach(item => {
      if (item.hasAttribute('data-lukket')) return;
      item.setAttribute('data-lukket', '');
      const forael = item.querySelector(':scope > a');
      if (forael && item.querySelector('.nav-sub').contains(document.activeElement)) forael.focus();
    });
  });
  // Runde 5 (D5-F7): to knapper — headerens (desktop) og skuffens (mobil).
  /* Temaskifteren er en til/fra-knap, ikke en udvidelig: aria-pressed (true = mørk) følger det faktiske tema, også når
     temaet skifter via systemindstillingen eller en anden knap (header, skuffe og footer er tre knapper). */
  const temaKnapper = document.querySelectorAll('.theme-toggle');
  const syncTemaAria = () => {
    const sat = document.documentElement.getAttribute('data-theme');
    const moerkt = sat ? sat === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    temaKnapper.forEach(b => b.setAttribute('aria-pressed', String(moerkt)));
  };
  temaKnapper.forEach(b => b.addEventListener('click', toggleTheme));
  syncTemaAria();
  new MutationObserver(syncTemaAria).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncTemaAria);
  document.addEventListener('bb:favorites-changed', updateFavCount);
  /* V5: forudtegnede kort (facetsider, mærkesider, søgesidens første kort) har nu hjerte på alle kort; de skal virke, før en side-egen kode overtager.
     wireFavoriteButtons springer knapper over, der allerede er koblet. */
  wireFavoriteButtons(document);
}

/* opts.type: 'success' (standard) eller 'error'.

   Fejlbeskeder blev tidligere vist med det grønne flueben — "Udfyld venligst
   alle felter markeret med *" så ud som en kvittering. Og elementet havde
   hverken role eller aria-live, så en skærmlæserbruger fik intet at vide:
   fokus hoppede bare til et felt uden nogen forklaring. */
function toast(msg, opts){
  const fejl = opts && opts.type === 'error';
  let el = document.querySelector('.toast');
  if (!el){
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  // role="alert" afbryder oplæsningen ved fejl; "status" venter høfligt.
  el.setAttribute('role', fejl ? 'alert' : 'status');
  el.setAttribute('aria-live', fejl ? 'assertive' : 'polite');
  el.classList.toggle('toast-error', fejl);
  el.innerHTML = `${fejl ? Icon.alertTriangle : Icon.checkCircle}<span>${msg}</span>`;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), (opts && opts.duration) || 2600);
}

/* Er annoncen brugerens egen? Fjerntliggende annoncer matches på sælger-id,
   lokale demo-/kladdeannoncer på navn. */
function isOwnListing(l){
  const user = Store.getUser();
  if (!user || !l || !l.seller) return false;
  if (user.id && l.seller.id) return user.id === l.seller.id;
  return Boolean(user.name) && user.name === l.seller.name;
}

/* Rigtigt foto hvis annoncen har et; ellers den illustrerede placeholder.
   loading="lazy" + faste proportioner holder layoutet stabilt (CLS).

   Undtagelsen er det første kort i en liste (`eager`): på søgesiden er dets
   foto sidens LCP-element, og lazy-loading udskyder hentningen til efter
   layout — det kostede ~2s LCP. Første kort hentes derfor med høj prioritet. */
/* ---------- Uden foto tegner vi INGENTING ----------

   Her stod en tegnet motorcykel af annoncens type med en lille pille "Intet
   foto" oven på. Argumentet var, at et gråt hul ligner en fejl på siden.
   Det argument holdt ikke, og det blev målt i runde 1:

     Søgningen "A2 til under 60.000 kr." gav 14 træf. Alle 14 var vores egne
     annoncer, ingen af dem har uploadet foto, og resultatet var derfor 14
     ENS grå piktogrammer, hvor det eneste, der skilte kortene ad, var
     pristeksten. Tegningen bar ingen oplysning — den kostede bare øjet et
     stop pr. kort, før det kunne komme videre til det, der faktisk var
     forskelligt.

   Og værre: annoncesiden skriver ordret "Vi viser ikke en tegning i stedet"
   (js/annonce.js, .gallery-tom). Kortet, køberen kom FRA, tegnede en
   motorcykel. To sider om den samme annonce sagde hver sit om det samme
   spørgsmål, og den, der lovede mest, var den, hvor handlen indgås.

   Feltet er nu det samme som detaljesidens `.gallery-tom`: kameraikon,
   stiplet kant, dæmpet tekst, samme sætning. Ikke et tredje udtryk — der
   fandtes to ærlige i forvejen, og et tredje ville gøre ærligheden til en
   smagssag (se work/DECISIONS.md).

   4:3-kassen bliver: højden er reserveret i .card-media, og et kort, der
   skifter højde alt efter om der er foto, ville rive gitteret skævt og koste
   CLS. Feltet er lige så højt som et foto — det siger bare, at der ikke er et.

   NB om ikonets inline-mål: den kritiske CSS i hver HTML-side indeholder
   `.card-media svg{width:100%;height:100%}`. css/styles.css hentes med
   rel=preload og lander EFTER første maling, så uden et mål på selve
   wrapperen ville kameraikonet fylde hele kortet i det øjeblik, kortene
   tegnes. Målet står derfor på elementet og ikke kun i stilarket. */
function listingMediaHTML(l, alt, eager){
  const url = l.photoUrls && l.photoUrls[0];
  /* fetchpriority="low" paa alt andet end det foerste kort.

     Builder 3 pegede paa, at fire soeskendefotos til 240 kB hentes
     samtidig med LCP-billedet: de baerer loading="lazy", men kort 2-5
     ligger inden for Chromes egen lazy-taerskel og hentes alligevel.

     AERLIGT OM VIRKNINGEN: jeg maalte den, og den er nul. Median-LCP paa
     /soegning.html (390x844, 4x CPU, 1,6 Mbit/s, 5 koersler) var 6488 ms
     foer og 6520 ms efter — inden for stoejen. Grunden staar i vandfaldet:
     LCP-billedet starter 4.865 ms inde og soeskendene 4.919-5.053 ms, altsaa
     EFTER det. Der var ingen konkurrence at fjerne. Attributten bliver
     staaende, fordi den er rigtig (et billede under folden skal ikke
     konkurrere med et over den) og gratis — men den er ikke en rettelse,
     og den skal ikke taelles som en.

     Det, der FAKTISK holder LCP nede, ligger ikke i denne fil: fotoet kan
     ikke begynde foer de 332 indekserede annoncer er hentet, og den
     hentning starter foerst 4.470 ms inde, fordi den venter paa at
     js/backend-bridge.js er hentet og fortolket. Se blokken i
     work/DECISIONS.md. */
  const loadAttrs = eager
    ? 'loading="eager" fetchpriority="high" decoding="async"'
    : 'loading="lazy" fetchpriority="low" decoding="async"';
  if (url){
    return `<img src="${escapeHTML(url)}" alt="${escapeHTML(alt || '')}" ${loadAttrs} class="card-photo">`;
  }
  /* Uden foto: et ærligt tomt felt (kameraikon, stiplet kant) — ikke en tegning eller et typebillede. Det
     samme lover annoncesiden ("Vi viser ikke en tegning i stedet"); se kommentaren ovenfor og work/DECISIONS.md. */
  return `<div class="foto-tom">`
    + `<span class="foto-tom-ikon" style="width:26px;height:26px;display:block">${Icon.camera}</span>`
    + `<p class="foto-tom-titel">Ingen fotos i denne annonce</p>`
    + fotoTomFaktaHTML(l)
    + `</div>`;
}
/* De typer, der har en illustration i img/type/<type>.webp (samme fliser som forsidens typerække). */

/* ---------- C3: klik videre til kilden måles ét sted ----------
   Det er tragtens vigtigste udgang for indekserede annoncer: handlen sker
   hos kilden. Én delegeret lytter paa document, saa annoncesidens knap, den
   faste bjælke (annonce.html) og fremtidige links alle taelles ens. Kun
   links til et ANDET vaertsnavn; annoncen findes via data-listing-id paa
   linket eller naermeste kort, ellers via ?id= paa siden. Bag samtykke. */
if (typeof document !== 'undefined' && document.addEventListener){
  document.addEventListener('click', e => {
    if (typeof Maaling === 'undefined') return;
    const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || !/^https?:/i.test(a.href)) return;
    let host = ''; try { host = new URL(a.href).hostname; } catch (err) { return; }
    if (!host || host === location.hostname) return;
    const baerer = a.dataset.listingId ? a : a.closest('[data-listing-id]');
    const id = (baerer && baerer.dataset.listingId) || new URLSearchParams(location.search).get('id');
    const l = id && typeof Store !== 'undefined' && Store.getListingById ? Store.getListingById(id) : null;
    Maaling.kildeKlik(l, a.href);
  }, true);
}

/* ---------- Et foto, kilden ikke leverer, må ikke stå som et hul ----------

   B3 (23.08.2026). Kortets foto hentes direkte hos kilden (vi kopierer det
   ikke — "Kilden ejer sine billeder", og om-indeksering.html lover det).
   Svarer kilden ikke — blokeret hotlink, slettet annonce hos dem, nedetid —
   stod kortet med browserens knækkede ikon og alt-teksten i 4:3-kassen: det
   ligner en fejl hos OS, og det siger ikke, hvad der skete. Nu skiftes
   billedet til det samme aerlige felt som "Ingen fotos", med den sande
   saetning. Ingen tegning, ingen pressefoto — se beslutningen ovenfor.

   Målt 23.08.2026: 25 af 25 stikprøvede thumbnails svarede 200 hos kilden,
   saa i dag rammes ingen. Feltet er en forsikring mod den dag, en kilde
   begynder at afvise hotlinks — og den dag skal siden sige det, ikke gætte.

   Ingen onerror= paa <img>: CSP'en tillader ingen inline-handlere (scripts/
   csp-hashes.js). Fejl-events bobler ikke, men de kan fanges i capture-fasen
   paa document — ogsaa for kort, der tegnes af javascript senere. Billeder,
   der naaede at fejle FOER scriptet koerte, fanges af tjekFejledeFotos():
   complete=true + naturalWidth=0 + et src er praecis "hentet, men
   mislykkedes" (lazy-billeder, der ikke er begyndt, har complete=false). */
function fotoFejlHTML(typ){
  return `<div class="foto-tom foto-fejl" role="img" aria-label="Fotoet kunne ikke hentes hos kilden">`
    + `<span class="foto-tom-ikon" style="width:26px;height:26px;display:block">${Icon.camera}</span>`
    + `<p class="foto-tom-titel">Fotoet kunne ikke hentes hos kilden</p>`
    + `</div>`;
}
function markerFotoFejl(img){
  if (!img || img.tagName !== 'IMG' || !img.classList.contains('card-photo')) return false;
  if (img.dataset.fotoFejl) return false;
  /* Kortet (.card-media), listerækken (.row-media) og swipe-kortet (.swipe-card-media) bruger alle listingMediaHTML();
     før blev kun gitterkortet rettet, og de to andre viste browserens knækkede ikon + alt-tekst. */
  const media = img.closest('.card-media') || img.closest('.row-media') || img.closest('.swipe-card-media');
  if (!media) return false;
  img.dataset.fotoFejl = '1';
  const kort = media.closest ? media.closest('.card') : null;
  img.insertAdjacentHTML('afterend', fotoFejlHTML(kort && kort.dataset ? kort.dataset.type : ''));
  img.remove();
  return true;
}
function tjekFejledeFotos(rod){
  const r = rod || document;
  let n = 0;
  r.querySelectorAll('img.card-photo').forEach(img => {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) n += markerFotoFejl(img) ? 1 : 0;
  });
  return n;
}
if (typeof document !== 'undefined' && document.addEventListener){
  document.addEventListener('error', e => { markerFotoFejl(e.target); }, true);
  const klar = () => tjekFejledeFotos();
  document.readyState !== 'loading' ? klar() : document.addEventListener('DOMContentLoaded', klar);
}

/* ---------- Feltet uden foto må gerne bære oplysninger ----------

   Målt af en kritiker: 284x378 px gråt felt pr. billedløs annonce, brugt til
   ingenting — mens EFFEKT, TYPE og STAND lå klar i de samme data og blev
   vist på annoncens detaljeside ét klik senere. Det er ikke manglende data,
   det er spildt plads, og det er den plads, fotoet ellers ville have brugt.

   De tre felter er valgt, fordi de er dem, kortet IKKE viser i forvejen:
   kortet har pris, årgang, kilometer og kubik. Effekt, type og stand er
   præcis dem, en mc-køber bruger til at sortere med, og de tre er samtidig
   dem, kilden oftest udelader — så feltet siger noget forskelligt fra kort
   til kort i stedet for at være 24 ens grå felter.

   ÆRLIGHEDEN ER UÆNDRET: kun oplyste felter tegnes. Der står aldrig "Ikke
   oplyst" her, og der opfindes ingen værdi — mangler alle tre, står feltet
   som før med sætningen alene. Sætningen bliver stående uanset hvad; det er
   den, der er løftet ("Vi viser ikke en tegning i stedet", annoncesiden).

   Effekt springes over på indekserede annoncer: kortets chips viser allerede
   hk, og det samme tal to gange på ét kort ligner en fejl. (På kortet er
   fakta-linjen skjult; feltet bruges i listevisningens miniature.) */
function fotoTomFaktaHTML(l){
  const fakta = [];
  const hk = Number(l && l.power) > 0 ? Number(l.power) : null;
  if (hk && !l.isExternal) fakta.push(formatPower(hk));
  if (l && l.type) fakta.push(typeLabel(l.type));
  if (l && l.condition) fakta.push(l.condition);
  if (!fakta.length) return '';
  return `<p class="foto-tom-fakta">`
    + fakta.map(f => `<span>${escapeHTML(String(f))}</span>`).join('')
    + `</p>`;
}

/* ============ Listing card ============ */
/* `i` kommer gratis fra .map(listingCardHTML) — kortet på plads 0 er det
   eneste der er above-the-fold på mobil, og får derfor det ivrige foto.

   Selve kortet (listingCardHTML) står længere nede. Det vigtigste, der blev besluttet, da der var tre korttyper,
   og som stadig gælder for det ene kort:
   - Kortfladen går til VORES annonceside, aldrig direkte til kilden. Hele kortet VAR engang kildelinket (99 % af
     kortets areal), og det gjorde annonce.html uopnåelig for alt lager i drift. Annoncesiden er dér, kørekortdommen
     står med sit regnestykke — den ene oplysning, en køber ikke kan få hos kilden. Vejen ud af sitet findes ét sted:
     knappen på annoncesiden. Kilden NÆVNES på kortet (domæne i bunden, forklaring i title), men er ikke et link.
   - Favorithjertet står på ALLE kort (V5, D-008 revideret). Egne annoncer gemmes som før (databasen, når man er logget ind). Indekserede annoncer kan IKKE
     gemmes i databasen (`favorites.listing_id uuid not null references public.listings(id)` afviser deres uuid), så deres favoritter ligger kun i denne browser
     (Store.getExternalFavorites, nøglen bb_favorites_ext) og når aldrig backend-broens favoritsynk. Hjertet på et indekseret kort bærer data-fav-ext og en
     tooltip, der siger det, og første tryk siger det højt (Store.eksternFavoritInfo). Se docs/review/DECISIONS.md, D-008. Sammenlign er lokalt og står på alle kort.
   - Kørekortbadgen er koerekortMaerkat() — samme udregning som filteret. Se dens kommentar. */
/* ---- Hjælpere til det indekserede kort ----
   De ligger her og ikke i data.js, fordi de alle sammen findes for at rette
   op på noget, der MANGLER i en indekseret annonce. Vores egne annoncer har
   felterne fra formularen; en crawlet annonce har det, kilden gad skrive. */

/* Postnummer → landsdel, uden at hente js/postnumre.js: regionFraPostnr()
   ligger i js/data.js, som hver eneste side loader — også maerker.html og
   sikkerhed.html, der har den her fil uden js/backend-bridge.js.
   Søgesiden droppede med vilje de 40 KB (1089 rækker), fordi ingen af dens
   scripts slog et postnummer op. Nu gør ét af dem det — til én label pr.
   kort — og det er ikke 40 KB værd. Tabellen i data.js er GENERERET ud fra
   POSTNUMRE og giver præcis samme svar som findPostnr() for alle 1089
   postnumre, på 280 bytes. Funktionen stod før både dér og her; se
   kommentaren ved REGION_KNAEK i js/data.js for hvorfor der nu kun er én. */

/* "Rødding, Syddanmark" — ikke "Rødding 6630".
   Et postnummer er en sorteringsnøgle, ikke et sted. En køber i Aarhus ved
   ikke om 6630 er en køretur eller en weekend; "Syddanmark" ved han. Samme
   form som på vores egne kort, hvor region kommer fra annoncen selv. */
function eksternStedTekst(l){
  const by = String(l.city || '').trim();
  const region = l.region || regionFraPostnr(l.postnr);
  if (by && region) return `${by}, ${region}`;
  return by || region || (l.postnr ? String(l.postnr) : 'Sted ikke oplyst');
}

/* Titlen deles i to: "Yamaha XV 750" fed, "Cruiser Virago ENGROS/UDEN
   KLARGØRING" dæmpet under. Hele molevitten på én linje blev klippet midt i
   modelnavnet, og så kunne man ikke se HVAD det var — kun at der stod meget.

   Kilden leverer ingen variant; vi har kun `model` som én streng. Får
   objektet på et tidspunkt en rigtig `variant`, bruges den, og gætteriet
   herunder rører den ikke. */
/* delModelOgVariant() (klient-gaetteriet, der delte modelstrengen ved foerste
   "rigtige ord efter et tal") er FJERNET med D8-S4: undertitel-slotten er nu
   altid typen, og crawlerens rensModelStoej ejer oprydningen af modellen. */

/* Kortets anden linje SKAL være et ord fra vores eget filter.

   `variant` fra crawleren er pr. konstruktion kun karrosserityper — se
   delModelOgVariant() i crawler/normalize.js, som netop flytter de kendte
   typeord derover og lader alt andet blive i modelnavnet. Men de 332 rækker
   i basen blev crawlet med kildens ordforråd, så de bærer stadig "Street",
   "Sportstouring", "Offroader", "Klassiker" og "Klassiker Cruiser" — ord,
   der ikke findes i Type-filteret. Kritikeren målte ti af fireogtyve kort
   med sådan et ord, og et klik på "Naked 64" gav en side fuld af kort mærket
   "Street".

   Rettelsen læser ikke ordet om; den skifter det ud med `typeLabel(l.type)`,
   altså PRÆCIS den værdi, filteret sorterer på. Så kan etiket og filter ikke
   blive uenige, uanset hvad der står i basen. Kan typen ikke kortlægges
   (`l.type` er null — fx MC Syds "Motard"), falder linjen helt væk: et ord,
   ingen kan klikke på, er ikke en oplysning.

   Kun DB-varianten skiftes ud. Fallbacken nedenunder graver modelnavnets
   hale ud af en streng ("Gold Wing", "Magna", "Bandit") — det er ikke
   typeord, og de skal blive stående. */
function eksternTitel(l){
  const brand = String(l.brand || '').trim();
  let model = String(l.model || '').trim();
  const variant = typeof l.variant === 'string' ? l.variant.trim() : '';
  if (variant){
    // Hvis model stadig indeholder varianten, står den ikke to gange.
    const m = model.toLowerCase(), v = variant.toLowerCase();
    if (m === v) model = '';
    else if (m.endsWith(' ' + v)) model = model.slice(0, model.length - variant.length).trim();
  }
  /* Runde 8 (D8-S4): undertitlens slot skiftede betydning fra kort til kort —
     "Naked" (type) paa ét, "(Eurosport)" (variantrest) paa det naeste,
     "Aspencade" paa et tredje. Nu ÉN regel: slot 2 = TYPEN (eller tom), og
     hele modelstrengen bliver i titlen. delModelOgVariant()-gaetteriet paa
     klienten er vaek — crawlerens rensModelStoej har allerede fjernet
     salgsstoejen fra modellen. */
  return {
    primaer: annonceNavn({ brand, model }),   // F2-014: "Honda (model ikke oplyst)" / "Ukendt mærke MTX800"
    variant: l.type ? typeLabel(l.type) : '',
  };
}

/* Salgsmarkører ("ENGROS", "UDEN KLARGØRING", "BYTTER GERNE") stod før inde
   midt i titlen og åd den plads, modelnavnet skulle bruge. De er ikke støj —
   "ENGROS/UDEN KLARGØRING" forklarer, hvorfor prisen er lav, og det vil en
   køber gerne vide, før han klikker — men de er en salgsbetingelse, ikke en
   del af, hvad motorcyklen HEDDER.

   Derfor: ÉN neutral chip yderst i prislinjen — dér hvor den forklarer noget
   — og resten som "+2" i samme chip, med hele listen i title-attributten.
   Ikke to og tre chips: prislinjen har 264px, prisen tager 90, og to markører
   ("ENGROS", "UDEN KLARGØRING") fylder 172. Så bliver den ene klippet midt i
   et ord, og en klippet mærkat ser ud som en fejl frem for en oplysning. */
function eksternSalgsmarkoerer(l){
  const raa = l.salgsmarkoerer;
  const alle = (Array.isArray(raa) ? raa : (typeof raa === 'string' ? raa.split(/\s*[,/]\s*/) : []))
    .map(s => String(s || '').trim())
    .filter(Boolean);
  if (!alle.length) return { tekst: '', alle };
  /* F-010: kortet viser en neutral tekst ("Handelspris" i stedet for ENGROS);
     kildens eget ord står stadig i `kilde` og i chippens title. */
  const pene = alle.map(salgsmarkoerLabel);
  return { tekst: pene[0] + (pene.length > 1 ? ` +${pene.length - 1}` : ''), alle: pene, kilde: alle };
}

/* ============ CVR: modulus 11 ============

   Cifrene vægtes 2,7,6,5,4,3,2,1, og summen skal gå op i 11. Sidste ciffer
   ER kontrolcifferet. Det er ren aritmetik på strengen: den siger intet om,
   hvorvidt virksomheden findes, og må aldrig skrives som en verificering.
   Men den afslører et nummer, der er tastet forkert eller fundet på — og et
   opdigtet CVR-nummer er den billigste svindel, der findes på en
   markedsplads.

   Funktionen lå i js/forhandler.js alene, og annoncesidens sælgerkort tilbød
   derfor stadig at slå et nummer op, som profilsiden ét klik senere
   afviste. To sider, samme nummer, to svar. Reglen bor her, fordi det er den
   fil, begge sider indlæser. */
function cvrKontrolOK(nr){
  const s = String(nr || '').replace(/\D/g, '');
  if (s.length !== 8) return false;
  const vaegte = [2, 7, 6, 5, 4, 3, 2, 1];
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(s[i]) * vaegte[i];
  return sum % 11 === 0;
}

/* ============ Kørekortmærkatet — ÉT sted, og det samme som filteret ============

   Kørekortkategorien er det felt, der afgør om køberen overhovedet må køre
   motorcyklen. Et forkert svar her koster ham kørekortet og motorcyklen, og
   det er derfor det ene felt på sitet, hvor tavshed er billigere end en
   påstand.

   HER STOD eksternKoerekort(), OG DEN VAR UENIG MED FILTERET.
   Over 125 ccm uden oplyst effekt skrev den mærkatet "Kørekort mindst A2".
   Samtidig svarede passerKoerekort(l, 'A2') FALSE på de samme annoncer, så
   Kørekort A2-filteret sorterede dem fra. Målt på lageret: 99 kort bar
   "mindst A2", og alle 99 var filtreret ud under A2. En Honda GL 1100 Gold
   Wing på 1.100 ccm med ukendt effekt stod med mærkatet.

   "Mindst A2" er isoleret set sandt — over 125 ccm kræver mindst A2 — men
   det læses som "A2 er nok", og det ved vi ikke. A2 har INGEN
   slagvolumengrænse: uden hk kan A2 og A ikke skelnes. Så mærkatet lovede
   en tyveårig noget, filteret nægtede at love, og af de to var filteret det
   rigtige.

   Reglen nu: mærkatet nævner en kategori, KUN når koerekortForListing()
   kan udlede den, og kun når passerKoerekort() er enig. Ellers står der
   ingen kategori — men den sætning, der forklarer hvorfor, står der stadig.
   Ingen ny færdselslov i denne fil: begge funktioner bor i js/data.js. */

/* Højeste specifikke effekt på en serie-motorcykel, med luft.
   Kawasaki H2R er 998 cm³ og 310 hk = 0,31 hk/cm³ og er kompressorladet;
   en Ducati Panigale V4 ligger på 0,20. Loftet her er 0,4, altså langt over
   alt, der findes — det fanger ikke en kraftig motorcykel, det fanger et
   sammenløbet felt hos kilden (fx ccm læst ind i hk-feltet). Er parret
   umuligt, ved vi ikke hvilket af de to tal der er forkert, og så kan
   kategorien ikke udledes af nogen af dem. */
const HK_PR_CCM_LOFT = 0.4;

const KK_UAFGJORT = 'Kørekort ikke afgjort';
const KK_UKENDT   = 'Kørekort ukendt';

/* Sætningen, der bliver stående. Den siger BÅDE hvad vi ved (over 125 ccm
   kræver mindst A2) og hvad vi ikke ved (om A2 er nok) — og den siger hvor
   hullet er: hos kilden, ikke hos os. */
const KK_OVER_125_EKSTERN = 'Over 125 ccm kræver mindst A2. Effekten står ikke i annoncen hos kilden, så vi kan ikke afgøre, om den også kan køres på A2.';
const KK_OVER_125_EGEN    = 'Over 125 ccm kræver mindst A2. Effekten står ikke i annoncen, så vi kan ikke afgøre, om den også kan køres på A2.';

/* RETTET runde 4: den her sætning fandtes ikke. ccm ≤ 125 uden oplyst
   effekt faldt før ned i koerekortForListing()'s A1-gren, som læste
   "effekt ikke oplyst" som "opfylder A1-loftet" — samme fejlklasse som
   eksternKoerekort() lavede for A2 (se noten ovenfor). To Honda MSX 125
   fra MC Syd (125 ccm, hk ikke oplyst) fik mærkatet "Kørekort A1".
   A1 kræver BÅDE ≤125 ccm OG ≤15 hk; her kender vi kun det første. Det er
   samme situation som KK_OVER_125_* ovenfor — kubik uden effekt — bare med
   den anden udfaldsrække: over 125 ccm udelukker A1 og efterlader A2/A;
   her kan ccm'en ISOLERET SET stadig blive til A1, A2 eller A, alt efter
   den effekt, vi ikke har. */
const KK_UNDER_125_EKSTERN = 'Motorcyklen er højst 125 ccm, men effekten står ikke i annoncen hos kilden. A1 kræver både højst 125 ccm og højst 15 hk, så uden effekten kan vi ikke afgøre, om den kan køres på A1 — eller om den kræver A2 eller A.';
const KK_UNDER_125_EGEN    = 'Motorcyklen er højst 125 ccm, men effekten står ikke i annoncen. A1 kræver både højst 125 ccm og højst 15 hk, så uden effekten kan vi ikke afgøre, om den kan køres på A1 — eller om den kræver A2 eller A.';

function koerekortMaerkat(l){
  const hk  = hkEllerNull(l.power);
  const ccm = Number(l.ccm) || 0;

  // 1. Selvmodsigende tal. Vi retter dem ikke og vælger ikke side.
  if (hk != null && ccm > 0 && hk / ccm > HK_PR_CCM_LOFT){
    return { kode: null, tekst: KK_UAFGJORT, forklaring:
      `Annoncen oplyser ${hk} hk på ${formatCcm(ccm)}. De to tal kan ikke passe sammen på en motorcykel, så mindst det ene er læst forkert — og så kan kørekortkategorien ikke udledes af nogen af dem. Spørg sælgeren om den rigtige effekt.` };
  }

  const kode = koerekortForListing(l);

  /* 2. Vagthund. Mærkat og filter SKAL svare det samme; gør de ikke det,
        er én af de to funktioner blevet ændret uden den anden, og så er det
        mærkatet, der holder mund. Den her gren skal aldrig kunne ses — men
        det skulle "mindst A2" heller ikke. */
  if (kode && !passerKoerekort(l, kode)){
    return { kode: null, tekst: KK_UAFGJORT, forklaring:
      'Vores to udregninger af kørekortkategorien er uenige om den her annonce, og så viser vi ingen kategori. Spørg sælgeren.' };
  }

  if (kode){
    const grundlag = [ccm ? formatCcm(ccm) : null, hk != null ? formatPower(hk) : null].filter(Boolean).join(' og ');
    /* "Kørekort A2" + "Kan føres på A2-kørekort" var konklusionen først og
       forbeholdet bagefter — den påstand, resten af sitet er bygget til
       ikke at give: effekt og ccm kan aldrig BEKRÆFTE A1/A2, kun udelukke
       (kW/kg og afledningsreglen står ikke i annoncen — se blokken over
       KOEREKORT i js/data.js og docs/forretning.md §3.1: "Mulig A2" indtil
       alt er dokumenteret). A-grenen må gerne konkludere: A har ingen
       øvre grænser, så "kræver A" følger af effekten alene. */
    if (kode === 'A'){
      return { kode, tekst: 'Kørekort A', forklaring:
        `Kræver A-kørekort: ${grundlag} er over A2-grænsen på ${A2_MAX_HK} hk (35 kW).` };
    }
    return { kode, tekst: `Mulig ${kode}`, forklaring:
      `Ikke udelukket til ${kode} ud fra ${grundlag}. ${kode} kræver også en grænse for effekt pr. kilo${kode === 'A2' ? ', og at maskinen ikke er afledt af en model med over dobbelt effekt' : ''} — det står ikke i annoncen, så tjek registreringsattesten.` };
  }

  /* 2b. 48-49 hk uden kW (F2-001). 35 kW er 47,6 hk, og kilderne runder op til 48, så tallet kan
        ikke bruges til at sige "kræver A" — og heller ikke "A2". Samme begreb som "mangler tal":
        kørekortet er ikke afgjort, og vejen til svaret er kW i registreringsattesten. */
  if (!kode && koerekortTvivl(l)){
    return { kode: null, graense: true, tekst: KK_UAFGJORT + ' — tjek kW', forklaring:
      `Annoncen oplyser ${formatPower(hk)} (${formatCcm(ccm) || 'ccm ikke oplyst'}). A2-grænsen er 35 kW, og 35 kW er 47,6 hk, så et oplyst 48 kan være afrundet. ` +
      'Derfor kan vi ikke afgøre, om den kræver A eller kan køres på A2. Tjek kW i registreringsattesten, eller spørg sælgeren.' };
  }

  // 3. Ccm ≤ 125, men effekten ikke oplyst: A1 kræver begge, vi har kun det ene.
  if (ccm > 0 && ccm <= A1_MAX_CCM && hk == null){
    return { kode: null, tekst: KK_UAFGJORT,
      forklaring: l.isExternal ? KK_UNDER_125_EKSTERN : KK_UNDER_125_EGEN };
  }

  // 4. Over 125 ccm uden effekt: den ene ting vi ved, og den ene vi ikke gør.
  if (ccm > A1_MAX_CCM){
    return { kode: null, tekst: KK_UAFGJORT,
      forklaring: l.isExternal ? KK_OVER_125_EKSTERN : KK_OVER_125_EGEN };
  }

  // 5. Hverken kubik eller effekt: der er intet at sige, heller ikke uvist.
  return { kode: null, tekst: KK_UKENDT, forklaring:
    'Annoncen oplyser hverken kubik eller effekt, så kørekortkategorien kan ikke udledes.' };
}

/* Ét ord for "det ved vi ikke", ét sted.
   Kortet nåede at have seks: "Pris ikke oplyst", "Km ikke oplyst", "— ccm",
   "–", "Ikke oplyst" og "—". Seks måder at sige det samme på læses som seks
   forskellige ting — og "Km" med stort er desuden en retskrivningsfejl.
   Specfelterne har feltnavnet i et skjult <dt>, så værdien skal ikke gentage
   det: chippen siger "Ikke oplyst", skærmlæseren "Kilometer: Ikke oplyst".

   Ordet var "Ukendt" indtil konsistensgennemgangen. Det var ét ord på ÉT
   kort, ikke på sitet: søgesidens listerækker (UOPLYST_CELLE i js/search.js),
   sælgerprofilens faktaliste og annoncesidens pris skrev alle "Ikke oplyst"
   om det samme, og "Ikke oplyst" er dét, den låste regel i work/DECISIONS.md
   ("Ærlighed slår fuldstændighed") navngiver. Argumentet i noten ovenfor
   holder uændret: det gjaldt "Km ikke oplyst", der gentager feltnavnet —
   "Kilometer: Ikke oplyst" gør ikke. */
const EKSTERN_UKENDT = 'Ikke oplyst';

/* "km", "km og hk", "km, kubik og hk" — dansk opremsning med "og" til sidst. */
function opremsDa(ord){
  if (ord.length <= 1) return ord[0] || '';
  return ord.slice(0, -1).join(', ') + ' og ' + ord[ord.length - 1];
}

/* De 22 uden pris mangler ikke en pris. normalize.js returnerer null, når
   kilden skriver "Ring for pris", "efter aftale" eller "byd" — prisen ER
   oplyst, den er oplyst som "spørg". "Pris ikke oplyst" ville påstå, at
   forhandleren har glemt noget. */
function eksternPrisTekst(price){
  return price == null ? 'Pris ved henvendelse' : formatPrice(price);
}

/* ---------- Ny eller brugt ----------

   162 af de 332 indekserede annoncer er FABRIKSNYE motorcykler. De ligger
   under mcsyd.dk/Produkter/Motorcykel/Ny/, har "Kilometer: Ikke oplyst" og
   årgange 2023-2026 — og de stod uden ét ord om det, under overskrifter der
   siger "brugte motorcykler til salg". Forskellen er ikke kosmetisk: den
   afgør garanti, reklamationsret og hvad et bud overhovedet er værd.

   VI MARKERER DEM I STEDET FOR AT SORTERE DEM FRA. En fabriksny motorcykel
   hos en forhandler er en rigtig motorcykel til salg, og en køber, der leder
   efter en MT-07, vil gerne se begge dele — at skjule halvdelen af lageret
   for at få overskriften til at passe ville koste ham udbuddet. Det er
   overskriften, der er for snæver, ikke annoncerne, der er forkerte.

   FELTET ER NU BAARET MED (D-015): js/backend-bridge.js bærer kildens eget
   ord videre som `kildeStand`, og DET vinder nu. Adressen er tilbage som
   nødudgang for rækker, der endnu ikke er crawlet igen — samme mønster som
   `type` i broen: kildens eget felt slår altid en aflæsning. Bliver
   nødudgangen aldrig brugt, kan den fjernes.

   HVAD DER VAR GALT, og som ikke skal genopstå: crawleren læser præcis den
   her sti-oplysning (stand_url_moenster i sources/mcsyd.yaml) og gemmer den
   i kolonnen `stand`. Broen OVERSATTE den kun til `condition`, og "ny" har
   ingen plads i CONDITIONS — så oplysningen blev til null og forsvandt i
   mellemregningen, selv om den lå i databasen hele tiden. En oversættelse
   må ikke være den eneste kopi: behold originalen ved siden af.

   Vi opfinder ingenting. Kan hverken feltet eller adressen læses, svarer
   funktionen null, og der står ingenting. Se work/DECISIONS.md. */
function eksternErNy(l){
  /* F-002 (w3-data): kildens ord er IKKE længere nok. "ny" gælder kun, når km og
     årgang ikke modsiger det; en modsagt "ny" er false (brugt), en ubevist er null.
     Reglen og tærsklerne bor i kildeNyStatus() i js/data.js — ét sted for kort,
     annonceside, SEO og alle generatorer. */
  return kildeNyStatus(l);
}

/* ============ Annoncekortet — ÉT kort på alle flader ============

   Forsiden, søgningen, mærke-, type-, kørekort-, region- og modelsiderne,
   "lignende" på annoncesiden, noscript-listerne og forhåndsvisningen i opret-
   annonce tegner det samme kort. Før fandtes tre former (forsidens rige kort,
   standardkortet og det interne forhandlerkort uden foto) med hver sin
   labelstil, og en side med blandede kilder viste dem side om side (samlet
   Critic P2-5). Nu er der én opstilling:

     foto (3:2)          — ægte foto fra kilden, ellers en neutral typeillustration
     titel + pris        — på samme linje
     år | km | type      — et manglende tal siges højt ("Km ikke oplyst")
     chips               — kørekortbadge FØRST, så ccm og hk (KUN de tal annoncen oplyser)
     sted + sælger/kilde — i bunden

   Reglerne fra de gamle kort gælder uændret:
   - Kørekortchippen kommer fra koerekortMaerkat(), altså samme udregning som
     filteret. "Mulig A2", aldrig "A2 godkendt".
   - Et tal, annoncen ikke oplyser, tegnes ikke som chip. I stedet siger ÉN
     dæmpet chip, hvilke der mangler ("ccm og hk ikke oplyst").
   - Der står ingen vægt (kg): ingen annonce i lageret bærer et vægttal (og vægt
     er ikke et felt, CLAUDE.md regel 2 tillader os at gemme), så chippen ville
     være et gæt.
   - Kun de felter, CLAUDE.md regel 2 tillader: titel, mærke, model, årgang,
     km, ccm, pris, postnr, sælgertype, ét thumbnail, kilde-domæne, deeplink.
   - Det indekserede kort har intet gem-hjerte (D-008: favorit-nøglen peger på
     vores egen tabel). Sammenlign-knappen står samme sted på ALLE kort (nederst
     til højre i fotoet); hjertet (kun egne annoncer) øverst til højre.
   - Kortfladen peger på VORES annonceside; ingen vej ud af sitet herfra.
   - Salgsmarkører ("ENGROS", "UDEN KLARGØRING") forklarer prisen og står som
     fuldt læsbar chip — aldrig klippet til "EN…". */
function kortFakta(l){
  const ext = !!l.isExternal;
  const titel = ext
    ? eksternTitel(l).primaer
    : annonceNavn(l);
  const hk = hkEllerNull(l.power);
  const ccm = Number(l.ccm) > 0 ? Number(l.ccm) : null;
  const by = String(l.city || '').trim();
  const region = l.region || (ext ? regionFraPostnr(l.postnr) : '');
  const sted = by || region || (l.postnr ? String(l.postnr) : 'Sted ikke oplyst');
  const stedTitle = by && region && by !== region ? `${by}, ${region}` : sted;
  const domaene = ext && l.source && l.source.domaene ? String(l.source.domaene) : '';
  /* Kun det kilden har oplyst (D7-F1): null = Gul og Gratis oplyser ingen sælgertype, og så står
     domænet alene — ingen "Privat", der var et gæt. */
  const saelgerType = !ext ? null
    : (l.saelgertype === 'forhandler' || (l.saelgertype === undefined && l.isDealer)) ? 'Forhandler'
    : l.saelgertype === 'privat' ? 'Privat' : null;
  const kilde = ext
    ? (domaene || (l.source && l.source.navn) || 'ekstern kilde')
    : (l.isDealer ? ((l.seller && l.seller.name) || 'Forhandler') : 'Privat sælger');
  return {
    ext, titel, hk, ccm, sted, stedTitle, kilde, domaene, saelgerType,
    aar: erTal(l.year) ? Number(l.year) : null,   // W6: NaN/tekst er "ikke oplyst", ikke "NaN"
    km: erTal(l.km) ? Number(l.km) : null,
    type: l.type ? typeLabel(l.type).split('/')[0] : '',   // "Classic/Veteran" -> "Classic": kortet er smalt
    kk: koerekortMaerkat(l),
    ny: ext ? eksternErNy(l) : null,
    mark: ext ? eksternSalgsmarkoerer(l) : { tekst: '', alle: [] },
  };
}

/* Kørekortmærkatets synlige tekst — ÉN funktion til gitterkort, listerække og swipe-kort, så samme annonce
   aldrig siger "Mulig A2" det ene sted og rå "A2" det andet (w4-smaating, Critic P2-3). "Kørekort A" er den
   eneste tekst, der skrives om: kortet er smalt, og "Kørekort Kørekort A" var en dobbelt label. */
function kkVisTekst(kk){
  return kk.kode === 'A' ? 'Kræver A' : kk.tekst;
}
/* Samme tekst som kkVisTekst, men til en celle under overskriften "Kørekort" (listerækken): ordet foran
   droppes, resten er ens ("Mulig A2", "Kræver A", "Ikke afgjort", "Ukendt"). */
function kkCelleTekst(kk){
  const t = kkVisTekst(kk).replace(/^Kørekort\s+/, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}
/* Bundlinjens kildedel (ikon + "Forhandler · mcsyd.dk" / "Privat sælger" / forhandlerens navn). Delt mellem
   gitterkortets .rk-fod og swipe-kortets .swipe-card-fod, så de to ikke kan skilles ad. */
function kortKildeHTML(l, f){
  const ikon = f.ext ? Icon.externalLink : (l.isDealer ? Icon.store : Icon.user);
  const tekst = f.ext
    ? `${f.saelgerType ? `<span class="rk-saelgertype">${f.saelgerType} · </span>` : ''}${escapeHTML(f.kilde)}`
    : escapeHTML(f.kilde);
  /* Fuld tekst til tooltip/aria-label (kortet er smalt og kan klippe synlig tekst). */
  const lang = f.ext
    ? `${f.saelgerType ? f.saelgerType + ' · ' : ''}${f.kilde}`
    : f.kilde;
  return { ikon, tekst, lang };
}

/* Kortets fod — ÉN funktion til gitter-, sammenlign-, lignende- og forsidekort. Sted står først, kilden som ikon + kort navn
   (domæne / forhandlernavn). Synlig tekst kan klippes i smalle kort; den fulde tekst står i title og aria-label. */
function kortFodHTML(l, f){
  const { ikon, tekst, lang } = kortKildeHTML(l, f);
  const kildenavn = f.ext ? ((l.source && l.source.navn) || f.kilde) : '';
  const kildeTitel = f.ext
    ? `Annoncen ligger hos ${kildenavn}${f.domaene ? ' (' + f.domaene + ')' : ''}. Bikerbasen viser den, men handlen sker hos kilden.`
    : 'Annoncen ligger på Bikerbasen.';
  return `<div class="rk-fod">
        <span class="rk-sted" title="${escapeHTML(f.stedTitle)}" role="group" aria-label="Sted: ${escapeHTML(f.stedTitle)}">${Icon.mapPin}<span>${escapeHTML(f.sted)}</span></span>
        <span class="rk-kilde" title="${escapeHTML(kildeTitel)}" role="group" aria-label="Kilde: ${escapeHTML(lang)}">${ikon}<span>${tekst}</span></span>
      </div>`;
}

function listingCardHTML(l, i){
  const f = kortFakta(l);
  if (f.ext && !sikkerUrl(l.externalUrl)) return '';   // en annonce uden brugbar kilde-URL vises ikke
  const titel = escapeHTML(f.titel);
  const pris = f.ext ? eksternPrisTekst(l.price) : formatPrice(l.price);
  const fav = !isOwnListing(l);   // V5: også indekserede annoncer (kun lokalt), se blokken over "Listing card"
  const erFav = fav && Store.isFavorite(l.id);
  const kildenavn = f.ext ? ((l.source && l.source.navn) || f.kilde) : '';

  /* Fabriksnye motorcykler hos forhandleren (kildens eget ord eller adressen). "Ny" står først i
     linjen: det er også et juridisk vilkår (garanti frem for reklamationsret). */
  /* "Katalog over nye motorcykler" kun ved MC Syds /Ny/-sti (erKatalogSti); ellers siger tooltippen kun, at kilden markerer den som ny. */
  const nyTitel = !f.ny ? ''
    : erKatalogSti(l)
      ? `Annoncen ligger i ${kildenavn}s katalog over NYE motorcykler. Den er ikke brugt${f.saelgerType === 'Forhandler' ? ': du køber med garanti frem for reklamationsret' + (f.km == null ? ', og kilometerstanden er derfor ikke oplyst' : '') : ' — spørg sælgeren om garanti- og reklamationsvilkår'}.`
      : `Kilden markerer annoncen som ny${f.km == null ? '' : ', og kilometertallet passer til det'}. Spørg sælgeren om garanti- og reklamationsvilkår.`;
  const linje = [];
  if (f.ny) linje.push(`<span class="rk-ny" title="${escapeHTML(nyTitel)}">Ny</span>`);
  linje.push(f.aar != null ? `<span>${escapeHTML(String(f.aar))}</span>` : '<span class="rk-mangler">Årgang ikke oplyst</span>');
  if (f.km != null) linje.push(`<span>${escapeHTML(formatKm(f.km))}</span>`);
  else if (!f.ny) linje.push('<span class="rk-mangler">Km ikke oplyst</span>');
  if (f.type) linje.push(`<span>${escapeHTML(f.type)}</span>`);

  const kk = f.kk;
  const kkKlasse = kk.kode ? ` kk-${String(kk.kode).toLowerCase()}` : ' kk-ukendt';
  const kkTekst = kkVisTekst(kk);
  const chips = [
    `<li class="rk-chip rk-kk${kkKlasse}" title="${escapeHTML(kk.forklaring)}">${Icon.idCard}<span>${escapeHTML(kkTekst)}</span><span class="visually-hidden">. ${kk.kode === 'A' ? 'Kørekort A. ' : ''}${escapeHTML(kk.forklaring)}</span></li>`,
  ];
  if (f.ccm) chips.push(`<li class="rk-chip">${escapeHTML(formatCcm(f.ccm))}</li>`);
  if (f.hk) chips.push(`<li class="rk-chip">${escapeHTML(formatPower(f.hk))}</li>`);
  /* W11: ingen "ccm/hk ikke oplyst"-chip — chips vises kun for oplyste tal (kørekortchippen siger selv, når hk mangler). */
  if (!f.ext && l.serviceHistorik === 'Fuld') chips.push(`<li class="rk-chip rk-chip-ok">${Icon.shieldCheck}<span>Fuld service</span></li>`);
  if (f.mark.tekst) chips.push(`<li class="rk-chip rk-chip-note" title="${escapeHTML(f.mark.alle.join(' · '))}">${escapeHTML(f.mark.tekst)}</li>`);

  const altTekst = escapeHTML([l.brand, l.model].filter(Boolean).join(' '));
  /* Mærkater på fotoet gælder kun egne annoncer (kilden har sit eget). Prismærkatet fik sin forklaring
     med tal, køberen selv kan efterprøve — se prisSammenligning() i js/data.js. */
  let badges = '';
  if (!f.ext){
    const mistaenkt = isSuspiciouslyCheap(l);
    const prisBasis = mistaenkt ? prisSammenligning(l) : null;
    const prisTitel = prisBasis
      ? `Prisen er under 45 % af medianen for ${prisBasis.antal} andre ${l.brand} ${l.model} fra ${prisBasis.aarFra}-${prisBasis.aarTil} på Bikerbasen (median ${formatPrice(prisBasis.median)}). Bed om ekstra dokumentation, og betal aldrig forud.`
      : '';
    const dele = [
      isNewListing(l.createdAt) ? nytOpslagBadgeHTML() : '',
      l.isDealer ? `<span class="badge badge-dealer" title="Forhandler">${Icon.store}Forhandler</span>` : '',
      mistaenkt ? `<span class="badge badge-warning" title="${escapeHTML(prisTitel)}">${Icon.alertTriangle}Under markedspris</span>` : '',
    ].filter(Boolean);
    if (dele.length) badges = `<div class="card-badges">${dele.join('')}</div>`;
  }
  const hjerte = fav
    ? `<button type="button" class="fav-btn ${erFav ? 'active' : ''}" aria-pressed="${erFav}" aria-label="${erFav ? 'Fjern fra gemte' : 'Gem annonce'}" data-fav-toggle="${l.id}"${f.ext ? ' data-fav-ext="1" title="Gemmes i denne browser"' : ''}>${Icon.heart}</button>`
    : '';
  /* Bunden: sted til venstre, sælgertype + kilde til højre. Sælgertypen ligger i eget span, som smalle
     kort skjuler (container query) — domænet er det eneste, køberen selv kan slå op, og det vinder pladsen. */

  return `
  <article class="card card-rich${f.ext ? '' : ' rk-egen'}" data-listing-id="${l.id}"${f.ext ? ' data-external="1"' : ''}${l.type ? ` data-type="${escapeHTML(l.type)}"` : ''}>
    <div class="card-media">
      ${listingMediaHTML(l, altTekst, i === 0)}
      ${badges}
      ${hjerte}
      <button type="button" class="card-compare ${Store.isComparing(l.id) ? 'active' : ''}" data-compare-toggle="${l.id}" aria-pressed="${Store.isComparing(l.id)}" title="Sammenlign" aria-label="Tilføj til sammenligning">${Icon.compare}</button>
    </div>
    <div class="rk-body">
      <div class="rk-top">
        <h3 class="rk-titel" title="${titel}">${titel}</h3>
        <span class="rk-pris${l.price == null ? ' pris-mangler' : ''}">${escapeHTML(pris)}</span>
      </div>
      <p class="rk-linje">${linje.join('')}</p>
      <ul class="rk-chips">${chips.join('')}</ul>
      ${kortFodHTML(l, f)}
    </div>
    <a href="annonce.html?id=${l.id}" class="card-link" aria-label="Se annonce: ${titel}, ${escapeHTML(pris)}${f.ext ? ' — hos ' + escapeHTML(kildenavn) : ''}"></a>
  </article>`;
}

/* ============ Trust badges ============ */
/* Slaaet fra med vilje.

   "Verificeret saelger" er en paastand over for en koeber om, at nogen har
   kontrolleret personen. Det har ingen. MitID kraever en godkendt broker
   (Criipto, Signaturgruppen, Nets) og er ikke sat op, SMS-bekraeftelse
   sender ingen sms, og CVR bliver ikke slaaet op. Indtil en af delene er
   rigtig, viser vi ingenting frem for at vise noget usandt.

   Naar verificering findes: fjern spaerren herunder. Flagene kan kun saettes
   af en betroet serverproces (se supabase/VERIFICERING.md og migration
   005_beskyt_verificering.sql) — aldrig af klienten. */
function verifiedBadgeHTML(seller){
  return '';
}

/* Runde 7 (D7-A1): tre grene. null = kilden har ikke oplyst saelgertypen — saa
   skriver vi hverken "forhandler" eller "privat", for begge er en
   retsoplysning, og et gaet er dyrt lige dér. */
function sellerTypeNoteHTML(isDealer){
  if (isDealer == null){
    return `<div class="seller-type-note"><b>Kilden oplyser ikke, om sælgeren er forhandler eller privat.</b> Spørg, før du handler: er det en forhandler, har du som privatperson reklamationsret i op til 24 måneder — er det en privat sælger, gælder den ikke.</div>`;
  }
  return isDealer
    ? `<div class="seller-type-note"><b>Forhandlerannonce.</b> Du har som privatperson reklamationsret i op til 24 måneder efter købelovens regler for erhvervsmæssigt salg.</div>`
    : `<div class="seller-type-note"><b>Privat annonce.</b> Forbrugerkøbelovens reklamationsret gælder ikke mellem private. Aftal et grundigt eftersyn og prøvetur, før du køber.</div>`;
}

/* ============ Safety banner ============ */
function safetyBannerHTML(){
  return `
  <div class="safety-banner">
    <span>${Icon.mapPin}Mød op personligt</span>
    <span class="safety-banner-sep">·</span>
    <span>${Icon.shieldCheck}Betal aldrig forud</span>
    <span class="safety-banner-sep">·</span>
    <span>${Icon.mail}Skriv via Bikerbasen</span>
    <a href="sikkerhed.html" class="safety-banner-link">Læs gode råd${Icon.arrowRight}</a>
  </div>`;
}

/* ============ Overlays: dialog-opførsel ============
   info-modalen, rapport-modalen og sammenligningen var overlays i udseende og
   ikke i opførsel: ingen rolle eller navn (bortset fra sammenligningen), fokus
   blev på knappen bag dem, Escape lukkede ikke (bortset fra sammenligningen),
   Tab løb ud i siden bag, og baggrunden var tabbar. Målt på "Hvor kommer
   annoncerne fra?": fokus på (i)-knappen, Escape uden virkning.

   Alle tre åbnes og lukkes af, at en klasse eller `hidden` skiftes fra flere
   steder (info-modalen lukkes tre forskellige steder, rapporten også ved
   indsendelse). I stedet for at røre hvert sted følger en MutationObserver
   overlayets tilstand, og resten — inert baggrund, fokus ind, fokus tilbage,
   Escape og Tab-fælde — hænger på den. Samme greb som menu- og filterskuffen
   (setBackgroundInert i js/search.js), her samlet i én funktion.

   erAaben(overlay) og luk(overlay) er de eneste, der kender overlayets måde at
   være åbent på. `boks` er selektoren for panelet, der får role="dialog". */
function goerOverlayTilgaengelig(overlay, { erAaben, luk, boks, titelId }){
  const panel = boks ? overlay.querySelector(boks) : null;
  if (panel){
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    if (titelId) panel.setAttribute('aria-labelledby', titelId);
  }
  let aaben = false, opener = null;
  const fokuserbare = () => Array.from(overlay.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
  )).filter(n => n.offsetParent !== null);
  const setBaggrundInert = (on) => {
    // Alle søskende på vejen op fra overlayet, uden at kende dem ved navn.
    let node = overlay;
    while (node && node !== document.body){
      const foraeldre = node.parentElement;
      if (foraeldre) Array.from(foraeldre.children).forEach(sib => {
        if (sib === node) return;
        if (on) sib.setAttribute('inert', ''); else sib.removeAttribute('inert');
      });
      node = foraeldre;
    }
  };
  const synk = () => {
    const nu = !!erAaben(overlay);
    if (nu === aaben) return;
    aaben = nu;
    setBaggrundInert(nu);
    if (nu){
      opener = document.activeElement;
      const f = fokuserbare();
      if (f.length) f[0].focus();
    } else if (opener && document.contains(opener)){
      opener.focus();
      opener = null;
    }
  };
  new MutationObserver(synk).observe(overlay, { attributes: true, attributeFilter: ['class', 'hidden'] });
  document.addEventListener('keydown', (e) => {
    if (!aaben) return;
    if (e.key === 'Escape'){ luk(overlay); return; }
    if (e.key !== 'Tab') return;
    const f = fokuserbare();
    if (!f.length) return;
    const foerste = f[0], sidste = f[f.length - 1];
    if (e.shiftKey && document.activeElement === foerste){ e.preventDefault(); sidste.focus(); }
    else if (!e.shiftKey && document.activeElement === sidste){ e.preventDefault(); foerste.focus(); }
  });
}
const lukModalOverlay = (o) => o.classList.remove('open');
const modalOverlayAaben = (o) => o.classList.contains('open');

/* ============ Report / notice-and-action modal ============ */
function ensureReportModal(){
  if (document.getElementById('report-modal')) return;
  const el = document.createElement('div');
  el.innerHTML = `
  <div class="modal-overlay" id="report-modal">
    <div class="modal-box">
      <div class="modal-head">
        <h2 id="report-modal-title">Anmeld annonce</h2>
        <button type="button" class="icon-btn" data-report-close aria-label="Luk">${Icon.close}</button>
      </div>
      <form id="report-form">
        <p id="report-target" style="color:var(--color-fg-muted); font-size:14px; margin-bottom:16px;"></p>
        <div class="field field-full" style="margin-bottom:14px;">
          <label>Hvad er problemet? <span class="required-mark">*</span></label>
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:6px;">
            ${REPORT_REASONS.map((r,i) => `
              <label class="checkbox-row" style="min-height:auto;">
                <input type="radio" name="report-reason" value="${r.id}" ${i===0?'required':''} style="width:18px;height:18px;accent-color:var(--color-primary);">
                ${r.label}
              </label>`).join('')}
          </div>
        </div>
        <div class="field field-full">
          <label for="report-comment">Uddyb (valgfrit)</label>
          <textarea class="input" id="report-comment" placeholder="Beskriv hvad du har observeret..."></textarea>
        </div>
        <div class="form-actions" style="justify-content:flex-end;">
          <button type="submit" class="btn btn-primary">${Icon.flag}Send anmeldelse</button>
        </div>
      </form>
    </div>
  </div>`;
  document.body.appendChild(el.firstElementChild);

  const modal = document.getElementById('report-modal');
  goerOverlayTilgaengelig(modal, { erAaben: modalOverlayAaben, luk: lukModalOverlay, boks: '.modal-box', titelId: 'report-modal-title' });
  modal.querySelectorAll('[data-report-close]').forEach(b => b.addEventListener('click', () => modal.classList.remove('open')));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
  document.getElementById('report-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const reason = (new FormData(e.target)).get('report-reason');
    const payload = {
      targetType: modal.dataset.targetType, targetId: modal.dataset.targetId,
      reason, comment: document.getElementById('report-comment').value,
    };
    modal.classList.remove('open');
    e.target.reset();

    // Altid en lokal kopi, så anmeldelsen ikke går tabt hvis nettet fejler.
    Store.addReport(payload);
    if (typeof db !== 'undefined' && db.enabled){
      const { error } = await db.addReport(payload);
      if (error){
        toast('Anmeldelsen blev gemt lokalt, men kunne ikke sendes', { type: 'error' });
        return;
      }
    }
    toast('Tak for din anmeldelse — vi gennemgår den hurtigst muligt');
  });
}

function openReportModal(targetType, targetLabel, targetId){
  ensureReportModal();
  const modal = document.getElementById('report-modal');
  modal.dataset.targetType = targetType;
  modal.dataset.targetId = targetId;
  document.getElementById('report-target').textContent = `Du anmelder: ${targetLabel}`;
  modal.classList.add('open');
}

/* ============ Generic info modal ============ */
function ensureInfoModal(){
  if (document.getElementById('info-modal')) return;
  const el = document.createElement('div');
  el.innerHTML = `
  <div class="modal-overlay" id="info-modal">
    <div class="modal-box">
      <div class="modal-head">
        <h2 id="info-modal-title"></h2>
        <button type="button" class="icon-btn" data-info-close aria-label="Luk">${Icon.close}</button>
      </div>
      <div id="info-modal-body" style="font-size:14px; color:var(--color-fg-muted); line-height:1.7;"></div>
    </div>
  </div>`;
  document.body.appendChild(el.firstElementChild);
  const modal = document.getElementById('info-modal');
  goerOverlayTilgaengelig(modal, { erAaben: modalOverlayAaben, luk: lukModalOverlay, boks: '.modal-box', titelId: 'info-modal-title' });
  modal.querySelectorAll('[data-info-close]').forEach(b => b.addEventListener('click', () => modal.classList.remove('open')));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
}
function openInfoModal(title, bodyHTML){
  ensureInfoModal();
  document.getElementById('info-modal-title').textContent = title;
  document.getElementById('info-modal-body').innerHTML = bodyHTML;
  document.getElementById('info-modal').classList.add('open');
}

/* ============ Cookie consent (GDPR) ============ */
/* Banneret står i markuppen (scripts/inline-cookie.js) og vises af en
   inline-linje i samme sekund som siden males — det var ellers det største
   element der blev malet på de js-tunge sider, og dermed deres LCP ~4s inde.
   Her kobles kun knapperne på. */
/* Højden skal væk igen, når banneret er væk — ellers ville
   scroll-padding-bottom blive stående og holde 187px fri af ingenting resten
   af sessionen. Reglen i stilarket hænger på #cookie-banner:not([hidden]),
   så den slipper af sig selv; det her rydder variablen med. */

function initCookieConsent(){
  const dialog = document.getElementById('cookie-banner');
  if (!dialog) return;
  if (Store.getCookieConsent()){
    if (dialog.open && dialog.close) dialog.close();
    dialog.remove();
    return;
  }

  /* RUNDE 14, EFTER MENNESKETS BESLUTNING: samtykket var en bundbjaelke, man
     kunne rulle forbi og bruge siden udenom. Nu er det en modal, der spaerrer,
     til man har valgt.

     Bygget paa <dialog>.showModal() frem for en haandrullet overlay, fordi
     browseren saa selv leverer det, der plejer at gaa galt: fokus flyttes ind i
     dialogen, fokus kan ikke tabbe ud, baggrunden bliver inert (ikke bare
     visuelt daempet — den kan hverken klikkes eller naas med tastatur), og
     dialogen ligger i top-laget, saa ingen z-index kan komme foran den.

     JURIDISK, og derfor ikke til forhandling: begge svar skal vaere lige lette.
     De to knapper har SAMME stoerrelse, samme vaegt og samme fremtoning — der er
     ingen primaerfarve paa "Accepter alle", som ville goere fravalget til det
     svaere valg. Det er kravet bag "frivilligt samtykke", og en vaeg, hvor
     accept er eneste vej videre, ville vaere ulovlig.

     Escape lukker den ikke: et valg er paakraevet, og BEGGE valg staar aabne.
     Uden det ville dialogen kunne afvises uden svar, og saa ville statistikken
     staa i et uafklaret limbo. */
  /* Privatlivspolitikken (og vilkår/om-indeksering) skal kunne læses, FØR man vælger — ellers fører 'Læs mere' i samtykket til en side
     bag selve samtykket. Her åbnes dialogen ikke; statistik forbliver slukket (intet samtykke givet) og dialogen kommer på næste side. */
  const laesSideFri = /\/(privatlivspolitik|vilkaar|om-indeksering)(\.html)?$/.test(location.pathname);
  if (!dialog.open && !laesSideFri){
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute('open', '');   // aeldre browser: dialogen vises, men uden top-lag
  }
  /* V3 QA: en indholdsblokker (Brave Shields' "Block cookie notices", uBlock/EasyList Cookie, udvidelser)
     kan skjule #cookie-banner med display:none. En skjult showModal()-dialog gør stadig resten af siden
     inert (hverken klik eller tastatur) — brugeren ser en død side uden at kunne svare. Er dialogen ikke
     synlig, lukkes den, så siden kan bruges; der gemmes intet samtykke (statistik forbliver slukket)
     og dialogen kommer igen næste gang. */
  const synlig = () => { const c = getComputedStyle(dialog); return c.display !== 'none' && c.visibility !== 'hidden' && dialog.offsetWidth > 0 && dialog.offsetHeight > 0; };
  const slipSiden = () => { if (dialog.isConnected && dialog.open && !synlig()){ if (dialog.close) dialog.close(); dialog.removeAttribute('open'); dialog.setAttribute('hidden', ''); } };
  slipSiden();
  /* V4 QA: failsafen skal vare ved. Før kørte den kun nu og efter 600 ms; en blokker, der skjuler dialogen senere
     (1200 ms+, målt), efterlod en inert, død side. Nu overvåges dialogen vedvarende: ændringer i style/class/hidden
     og nye stylesheets i dokumentet (MutationObserver), et tjek hver 250 ms de første ~12 s, og ved
     visibilitychange/focus/pageshow. Alt er idempotent og ophører, når dialogen er besvaret/fjernet. */
  let vagtPlanlagt = false;
  const vagt = () => {
    if (!dialog.isConnected || !dialog.open){ ophoer(); return; }
    slipSiden();
    if (!dialog.open) ophoer();
  };
  const planlaeg = () => { if (vagtPlanlagt) return; vagtPlanlagt = true; requestAnimationFrame(() => { vagtPlanlagt = false; vagt(); }); };
  let observer = null, interval = null;
  function ophoer(){
    if (observer){ observer.disconnect(); observer = null; }
    if (interval){ clearInterval(interval); interval = null; }
    document.removeEventListener('visibilitychange', planlaeg);
    window.removeEventListener('focus', planlaeg);
    window.removeEventListener('pageshow', planlaeg);
  }
  if (dialog.open){
    if (typeof MutationObserver !== 'undefined'){
      observer = new MutationObserver(planlaeg);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class', 'hidden'], childList: true, subtree: true });
    }
    let kald = 0;
    interval = setInterval(() => { vagt(); if (++kald >= 48) { clearInterval(interval); interval = null; } }, 250);
    document.addEventListener('visibilitychange', planlaeg);
    window.addEventListener('focus', planlaeg);
    window.addEventListener('pageshow', planlaeg);
  }
  dialog.addEventListener('cancel', e => e.preventDefault());

  const svar = level => () => {
    Store.setCookieConsent(level);
    ophoer();
    if (dialog.open && dialog.close) dialog.close();
    dialog.remove();
    // Statistik er valgfri og starter foerst her — aldrig ved sideindlaesning.
    // "Kun noedvendige" starter den altsaa aldrig.
    if (level === 'all' && typeof window.bbStartAnalytics === 'function') window.bbStartAnalytics();
  };
  /* V6: det inline script (scripts/inline-cookie.js) kobler selv knapperne og gemmer samtykket, så dialogen kan besvares,
     også når denne fil er blokeret eller kommer for sent. Er den allerede koblet (data-bound="inline"), kobles der IKKE igen:
     ét klik må kun gemme ét samtykke og kun starte statistik én gang. Vagten ovenfor beholdes. */
  if (dialog.getAttribute('data-bound') === 'inline'){ dialog.setAttribute('data-bound', 'components'); return; }
  document.getElementById('cookie-accept-all').addEventListener('click', svar('all'));
  document.getElementById('cookie-necessary-only').addEventListener('click', svar('necessary'));
  dialog.setAttribute('data-bound', 'components');
}

function wireFavoriteButtons(root){
  (root || document).querySelectorAll('[data-fav-toggle]').forEach(btn => {
    if (btn.dataset.favBound) return;   // V5: aldrig to lyttere på samme knap (et klik slog ellers favoritten til og straks fra igen)
    btn.dataset.favBound = '1';
    /* Forudtegnede knapper kender ikke browserens favoritter: tilstanden sættes fra Store, så et gemt hjerte står tændt fra første maling efter koblingen. */
    try {
      const gemt = Store.isFavorite(/^\d+$/.test(btn.getAttribute('data-fav-toggle')) ? Number(btn.getAttribute('data-fav-toggle')) : btn.getAttribute('data-fav-toggle'));
      if (gemt !== btn.classList.contains('active')){
        btn.classList.toggle('active', gemt); btn.setAttribute('aria-pressed', String(gemt));
        if (/(fav-btn|row-fav|lr-fav)/.test(btn.className)) btn.setAttribute('aria-label', gemt ? 'Fjern fra gemte' : 'Gem annonce');
      }
    } catch (err) { /* Store mangler på en side uden store.js */ }
    btn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      // Ikke Number(): database-annoncer har uuid som id, og Number('4f2..')
      // er NaN — så et hjerteklik ramte forbi og kunne hverken like eller
      // unlike en rigtig annonce. Behold id'et som det er.
      const raw = btn.getAttribute('data-fav-toggle');
      const id = /^\d+$/.test(raw) ? Number(raw) : raw;
      /* V5: et hjerte på en indekseret annonce siger det selv (data-fav-ext): favoritten gemmes kun i denne browser og rører aldrig databasen. */
      const ekstern = btn.hasAttribute('data-fav-ext');
      const active = Store.toggleFavorite(id, ekstern ? { ext: true } : undefined);
      if (typeof Maaling !== 'undefined') Maaling.favorit(Store.getListingById ? Store.getListingById(id) : null, active);
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active);
      if (btn.classList.contains('fav-btn') || btn.classList.contains('row-fav') || btn.classList.contains('lr-fav')) btn.setAttribute('aria-label', active ? 'Fjern fra gemte' : 'Gem annonce');
      const info = ekstern && active && Store.eksternFavoritInfo ? Store.eksternFavoritInfo() : '';
      toast(info || (active ? 'Tilføjet til gemte annoncer' : 'Fjernet fra gemte annoncer'));
    });
  });
}


/* ============ Sammenlign-tabellens indhold (rene funktioner, testbare uden DOM) ============

   Står uden for initCompare() i stedet for inde i den, så en test kan rendere hoved og rækker for annoncer,
   hvor alle felter er null (js/w5-null.test.js). Reglen (F2-009/F2-011): aldrig "null"/"undefined" i en celle —
   et felt uden værdi hedder "Ikke oplyst". */
function sammenlignHoved(bikes){
  return `<tr><th></th>${bikes.map(b => `<th scope="col"><a href="annonce.html?id=${encodeURIComponent(b.id)}">${escapeHTML(annonceNavn(b))}</a></th>`).join('')}</tr>`;
}

function sammenlignRaekker(bikes){
  const ikkeOplyst = 'Ikke oplyst';
  const rows = [
    ['Pris', b => formatPrice(b.price)],
    ['Årgang', b => b.year == null ? ikkeOplyst : b.year],
    ['Kilometer', b => formatKm(b.km)],
    ['Motorstørrelse', b => formatCcm(b.ccm)],
    ['Effekt', b => formatPower(b.power)],
    /* Fem tankestreger stod her, i den samme tabel hvor rækkerne over
       sagde "Pris ikke oplyst" og "Km ikke oplyst". Sammenligningen er
       lige præcis det sted, hvor to annoncer stilles op ved siden af
       hinanden — og et "—" over for en udfyldt celle læses som en
       dårligere motorcykel, ikke som en oplysning, kilden ikke har.
       Kørekort er dog UDLEDT, ikke oplyst: kan reglen ikke afgøre
       kategorien, er svaret "Kan ikke afgøres", ikke "Ikke oplyst" —
       samme skel som kørekortmærkatet på kortene i js/components.js. */
    // Samme ene udregning som kortene og filteret, jf. koerekortMaerkat().
    ['Kørekort', b => { const k = koerekortMaerkat(b); return k.kode || (k.graense ? 'Ikke afgjort — tjek kW' : 'Kan ikke afgøres'); }],
    ['Type', b => typeLabel(b.type)],
    ['Drivlinje', b => b.drive || ikkeOplyst],
    // Stand er indekseret (migration 015 + kildeNyStatus), så den står også for kilde-annoncer (F2-011).
    ['Stand', b => b.condition || ikkeOplyst],
    ['Servicehistorik', b => b.serviceHistorik || ikkeOplyst],
    ['Antal ejere', b => b.antalEjere || ikkeOplyst],
    ['Sidste syn', b => b.sidsteSyn || ikkeOplyst],
  ];
  /* Runde 7 (D7-S6): Drivlinje, Servicehistorik, Antal ejere og Sidste syn indekserer vi ikke (CLAUDE.md
     regel 2). "Ikke oplyst" ville vaere en paastand om saelgeren; kilden KAN have oplyst dem. Er alle
     annoncer indekserede, falder raekkerne vaek og én linje siger hvorfor; i blandede saet staar "Se hos
     kilden" i de eksterne celler. */
  const alleEksterne = bikes.every(b => b.isExternal);
  const kunEgne = new Set(['Drivlinje', 'Servicehistorik', 'Antal ejere', 'Sidste syn']);
  const synlige = alleEksterne ? rows.filter(([label]) => !kunEgne.has(label)) : rows;
  return synlige.map(([label, fn]) =>
    `<tr><th scope="row">${label}</th>${bikes.map(b => `<td>${(b.isExternal && kunEgne.has(label)) ? 'Se hos kilden' : escapeHTML(String(fn(b)))}</td>`).join('')}</tr>`).join('')
    + (alleEksterne ? `<tr><td colspan="${bikes.length + 1}" class="compare-note">Udstyr, ejere og syn står i annoncen hos kilden — Bikerbasen indekserer dem ikke.</td></tr>` : '');
}

/* ============ Sammenlign-system (bjælke + modal) ============
   Global og selvstændig: virker på alle sider via event-delegation, så de
   enkelte siders JS ikke skal røres. Op til 3 annoncer, tilstand i localStorage. */
(function initCompare(){
  function ready(fn){ document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn); }
  ready(() => {
    if (typeof Store === 'undefined') return;
    const bar = document.createElement('div');
    bar.className = 'compare-bar'; bar.hidden = true; bar.setAttribute('aria-live', 'polite');
    document.body.appendChild(bar);
    const modal = document.createElement('div');
    modal.className = 'compare-modal'; modal.hidden = true;
    document.body.appendChild(modal);
    // Panelet (role="dialog", aria-modal) tegnes ved hver åbning, så `boks`
    // udelades; helperen står kun for fokus, inert baggrund, Escape og Tab.
    goerOverlayTilgaengelig(modal, { erAaben: () => !modal.hidden, luk: () => closeModal() });

    function renderBar(){
      const ids = Store.getCompare();
      bar.hidden = ids.length === 0;
      if (!ids.length) return;
      bar.innerHTML = `
        <span class="compare-bar-count">${ids.length} valgt til sammenligning</span>
        <div class="compare-bar-actions">
          <button type="button" class="btn btn-outline btn-sm" data-compare-clear>Ryd</button>
          <button type="button" class="btn btn-primary btn-sm" data-compare-open ${ids.length < 2 ? 'disabled' : ''}>Sammenlign${ids.length >= 2 ? ` (${ids.length})` : ''}</button>
        </div>`;
    }
    function openModal(){
      const bikes = Store.getCompare().map(id => Store.getListingById(id)).filter(Boolean);
      if (bikes.length < 2) return;
      modal.innerHTML = `
        <div class="compare-modal-scrim" data-compare-close></div>
        <div class="compare-modal-panel" role="dialog" aria-label="Sammenlign motorcykler" aria-modal="true">
          <div class="compare-modal-head">
            <h2>Sammenlign</h2>
            <button type="button" class="icon-btn" data-compare-close aria-label="Luk sammenligning">${Icon.close}</button>
          </div>
          <div class="compare-table-wrap">
            <table class="compare-table">
              <thead>${sammenlignHoved(bikes)}</thead>
              <tbody>${sammenlignRaekker(bikes)}</tbody>
            </table>
          </div>
        </div>`;
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
    }
    function closeModal(){ modal.hidden = true; document.body.style.overflow = ''; }

    document.addEventListener('click', (e) => {
      const toggle = e.target.closest('[data-compare-toggle]');
      if (toggle){
        e.preventDefault(); e.stopPropagation();
        const on = Store.toggleCompare(toggle.getAttribute('data-compare-toggle'));
        toggle.classList.toggle('active', on); toggle.setAttribute('aria-pressed', String(on));
        return;
      }
      if (e.target.closest('[data-compare-open]')) return openModal();
      if (e.target.closest('[data-compare-clear]')) return Store.clearCompare();
      if (e.target.closest('[data-compare-close]')) return closeModal();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
    document.addEventListener('bb:compare-changed', () => {
      renderBar();
      document.querySelectorAll('[data-compare-toggle]').forEach(b => {
        const on = Store.isComparing(b.getAttribute('data-compare-toggle'));
        b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));
      });
    });
    renderBar();
  });
})();
