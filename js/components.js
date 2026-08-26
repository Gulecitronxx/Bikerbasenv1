/* ============ Header hydration ============
   Header/nav/footer markup is static real HTML in every page (crawlable and
   functional with JS disabled). These functions only enhance it: active nav
   state, favorites count, and logged-in state swap. */

function renderHeader(activeOverride){
  const header = document.querySelector('.site-header');
  if (!header) return;
  const current = activeOverride || location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a, .mobile-drawer-panel a[href]').forEach(a => {
    if (a.hasAttribute('data-auth-slot-mobile')) return;
    a.classList.toggle('active', a.getAttribute('href') === current);
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
  // rammes — favoritter virker for anonyme og skal blive stående.
  const authOnly = ['opret-annonce.html', 'mine-annoncer.html'];
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
  const n = Store.getFavorites().length;
  const skjul = el => { const a = el.closest && el.closest('a'); if (a) a.hidden = n === 0; };
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
    slot.setAttribute('href', '#');
    slot.innerHTML = `${Icon.user}${escapeHTML(String(user.name || '').split(' ')[0])} · Log ud`;
    slot.addEventListener('click', onLogout);
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
    // overlay-open skjuler cookiebanneret, der ellers ligger oven på skuffen.
    const setDrawer = (open) => {
      drawer.classList.toggle('open', open);
      document.body.classList.toggle('overlay-open', open);
    };
    openBtn.addEventListener('click', () => setDrawer(true));
    drawer.querySelectorAll('[data-drawer-close]').forEach(el => el.addEventListener('click', () => setDrawer(false)));
  }
  // Runde 5 (D5-F7): to knapper — headerens (desktop) og skuffens (mobil).
  document.querySelectorAll('.theme-toggle').forEach(b => b.addEventListener('click', toggleTheme));
  document.addEventListener('bb:favorites-changed', updateFavCount);
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
  return `<div class="foto-tom">`
    + `<span class="foto-tom-ikon" style="width:26px;height:26px;display:block">${Icon.camera}</span>`
    + `<p class="foto-tom-titel">Ingen fotos i denne annonce</p>`
    + fotoTomFaktaHTML(l)
    + `</div>`;
}

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
function fotoFejlHTML(){
  return `<div class="foto-tom foto-fejl" role="img" aria-label="Fotoet kunne ikke hentes hos kilden">`
    + `<span class="foto-tom-ikon" style="width:26px;height:26px;display:block">${Icon.camera}</span>`
    + `<p class="foto-tom-titel">Fotoet kunne ikke hentes hos kilden</p>`
    + `</div>`;
}
function markerFotoFejl(img){
  if (!img || img.tagName !== 'IMG' || !img.classList.contains('card-photo')) return false;
  if (img.dataset.fotoFejl) return false;
  const media = img.closest('.card-media');
  if (!media) return false;
  img.dataset.fotoFejl = '1';
  img.insertAdjacentHTML('afterend', fotoFejlHTML());
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

   Effekt springes over på indekserede annoncer: externalCardHTML() viser
   allerede "Effekt" i sin spec-liste, og det samme tal to gange på ét kort
   ligner en fejl. */
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

/* Hvem sælger den?

   Kortet sagde det ikke. Forhandlere fik en lille "Forhandler"-mærkat oven
   på fotoet; private fik INGENTING — og det er over halvdelen af annoncerne.
   En køber, der skal skille seriøse forhandlerannoncer fra tilfældige
   privatopslag i scrollet, kunne altså ikke, uden at klikke ind på hver
   enkelt. Det er dét, der afgør om en handel til 80.000 kr. føles sikker.

   Forhandleren nævnes ved navn — det er navnet, man genkender og googler.
   Privatsælgere står som "Privat sælger": ikke ringere, men en anden handel
   (ingen reklamationsret), og det skal køberen kunne se med det samme. */
function sellerLineHTML(l){
  const dealer = l.isDealer || l.seller?.isDealer;
  const navn = escapeHTML(l.seller?.name || '');
  if (dealer && navn){
    return `<div class="card-seller is-dealer">${Icon.store}<span>${navn}</span></div>`;
  }
  return `<div class="card-seller">${Icon.user}<span>${dealer ? 'Forhandler' : 'Privat sælger'}</span></div>`;
}

/* ============ Listing card ============ */
/* `i` kommer gratis fra .map(listingCardHTML) — kortet på plads 0 er det
   eneste der er above-the-fold på mobil, og får derfor det ivrige foto. */
/* Indekseret annonce fra en anden side.

   Egen funktion frem for en håndfuld if'er inde i det almindelige kort. De to
   korttyper ligner hinanden i dag, men de skal have lov at skille sig fra
   hinanden — og et delt kort med syv betingelser er dét, der på et tidspunkt
   får en ekstern annonce til at se ud som vores egen, fordi nogen tilføjede
   en knap uden at tænke over grenen.

   Fire ting adskiller den, og alle fire er bevidste:
     1. Mærket "Hos <kilde>" øverst på billedet, ikke nede i teksten.
     2. Linjen hvor sælgeren står, siger kildens navn og domæne.
     3. Kortet har ÉT mål: vores egen annonceside. Der er ingen vej ud af
        sitet herfra.

        Sådan var det ikke før. Hele kortet VAR kildelinket — ét <a> på
        357×605 px, 99,3 % af kortets areal, direkte til mcsyd.dk. Det gjorde
        annonce.html uopnåelig for 332 af 383 annoncer, altså for alt lager i
        drift: rejsen "søg → kort → annonce → se hos kilde" fandtes kun for de
        egne. Og annoncesiden er dér, kørekortdommen står med sit regnestykke
        ("Regnet ud fra 124 ccm og 11 hk") — den ene oplysning, en køber ikke
        kan få hos kilden.

        Første rettelse skrumpede kildelinket fra hele kortet til én række på
        304×24 px i bunden. Det var stadig en genvej uden om vores egen side,
        og ejerens krav er, at vejen ud går IGENNEM den: "inden vores side
        viderestiller udbyder af annoncen skal man klikke ind på min annonce,
        også kan man trykke på knappen til at komme videre". Rækken er derfor
        væk. Knappen findes ét sted — på annoncesiden — og dér er den stadig
        den primære handling.

        Ærligheden om afsenderen bliver: kildestriben "Annonce fra <kilde>"
        øverst og "Forhandler · mcsyd.dk" i bunden står uændret. De er ikke
        genvejen; de er grunden til, at køberen ikke bliver overrasket over,
        hvor annoncesiden sender ham videre hen.
     4. Ingen favoritknap. Favoritter peger på listings med en
        fremmednøgle — `favorites.listing_id uuid not null references
        public.listings(id)` — så en uuid herfra bliver afvist af databasen,
        og hjertet ville se ud som om det virkede.

        D-008 spurgte, om det var et valg eller en forglemmelse. Det er et
        valg, og det er nu skrevet ned med tallene i docs/review/DECISIONS.md.
        Følgen — at hjertet i toppen aldrig kan blive andet end 0, så længe
        `listings` har 0 rækker — er håndteret dér, hvor den hører hjemme:
        updateFavCount() viser først indgangen, når der ER noget gemt.
     5. Kildemærket ligger som en stribe ØVER fotoet, ikke som en pille
        oven på det. Over et vilkårligt forhandlerfoto målte mærket 2,64:1
        i kontrast — under AA's 4,5:1 — og det er kortets vigtigste tekst.
        På en flade med kendt baggrund er den læsbar hver gang.
     6. Kørekortpillen er flyttet ned i kroppen, hvor den kan bære en
        tekst: uden hk kan A2 og A ikke skelnes, og en pille over fotoet
        havde kun plads til ét bogstav — det forkerte. Se eksternKoerekort(). */
/* ---- Hjælpere til det eksterne kort ----
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
    primaer: [brand, model].filter(Boolean).join(' ').trim() || 'Motorcykel',
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
  return { tekst: alle[0] + (alle.length > 1 ? ` +${alle.length - 1}` : ''), alle };
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

/* Tre specfelter på ÉN linje: årgang, kilometer, kubik — nøjagtig de samme
   tre, i samme rækkefølge, som vores eget kort skriver i .card-meta
   ("2021 · 9.100 km · 373 ccm").

   D-011. Felterne stod som fire chips i et 2×2-gitter: to rækker á 28px plus
   8px imellem = 64px, mod det egne korts ene 20px-linje. Det var den enkelte
   største grund til, at de to korttyper i den samme liste stod 118px fra
   hinanden (målt 390px: 579 mod 461).

   HVORFOR TRE OG IKKE FIRE. Effekt (hk) var det fjerde felt, og fire værdier
   kan ikke være på én linje. Målt: den bredeste af de 20 linjer på side 1
   krævede 341px, hvor kortets krop har 310px ved 390px vindue — og på
   desktop, hvor filterpanelet står ved siden af, er spalten kun ~218px.
   Enten fire værdier på to linjer (og så er vi tilbage ved to rytmer), eller
   tre på én. Tre er valgt, fordi det er præcis det sæt, det egne kort har,
   og fordi hk ikke forsvinder: kørekortchippen lige nedenunder ER udledt af
   ccm og hk og siger konklusionen, listevisningen skriver "1.084 ccm · 87
   hk" i sin Motor-celle, og annoncesiden viser tallet med sit regnestykke.

   HULLERNE I DATA. Chipsene blev valgt, fordi et ikon uden tal ser ud som en
   fejl, og fordi der ER huller. Målt på hele lageret, 332 annoncer:

       årgang mangler        0
       kilometer mangler   163  (49 %)
       kubik mangler        12  (3,6 %)
       annoncer med 0 / 1 / 2 manglende af de tre: 168 / 152 / 12

   Den indvending gjaldt ikon+tekst, og der er ingen ikoner her. Men den
   naive sammenlægning ("2024 · Ikke oplyst · Ikke oplyst") ville sætte to
   tomme felter i samme linje, som ikke engang siger HVAD der mangler.

   Derfor: de kendte værdier står som linjen, og de manglende samles i ÉT led
   til sidst, der siger hvilke ("km og kubik ikke oplyst"). Ingen bar
   tankestreg, intet tomt felt, intet tal vi ikke har — og det manglende
   navngives nu også visuelt, hvor chippen kun sagde det til skærmlæseren. */
function eksternSpecs(l){
  const felter = [
    // `kort` er ordet, der bruges i "… ikke oplyst" — derfor små bogstaver
    // og den korte form, så linjen kan være der.
    { navn: 'Årgang',    kort: 'årgang', vaerdi: l.year == null ? '' : String(l.year) },
    { navn: 'Kilometer', kort: 'km',     vaerdi: l.km == null ? '' : formatKm(l.km) },
    { navn: 'Kubik',     kort: 'kubik',  vaerdi: l.ccm == null ? '' : formatCcm(l.ccm) },
  ];
  return { kendte: felter.filter(f => f.vaerdi), mangler: felter.filter(f => !f.vaerdi).map(f => f.kort) };
}

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
  const kildensOrd = String(l.kildeStand || '').toLowerCase().trim();
  if (kildensOrd === 'ny' || kildensOrd === 'new') return true;
  if (kildensOrd === 'brugt' || kildensOrd === 'used') return false;

  const url = String(l.externalUrl || '');
  if (!url) return null;
  const m = url.match(/\/(ny|brugt)\//i);
  if (!m) return null;
  return m[1].toLowerCase() === 'ny';
}

function externalCardHTML(l, i){
  const kilde = escapeHTML(l.source?.navn || 'ekstern kilde');
  /* Uden en brugbar URL er kortet et blindt link. Så vises annoncen ikke.
     Kortfladen peger nu på vores egen side og ville teknisk kunne stå uden
     kildens URL — men en indekseret annonce, man ikke kan komme videre til
     og handle på, er en blindgyde med et prisskilt. Så den bliver ude. */
  const href = sikkerUrl(l.externalUrl);
  if (!href) return '';

  const { primaer, variant } = eksternTitel(l);
  const titel = escapeHTML(primaer), undertitel = escapeHTML(variant);
  const altTekst = escapeHTML([l.brand, l.model].filter(Boolean).join(' '));
  const pris = eksternPrisTekst(l.price);
  const domaene = l.source?.domaene ? escapeHTML(l.source.domaene) : '';
  // "Forhandler · mcsyd.dk": kildens navn står allerede i mærkatet og i
  // linket. Her siger vi i stedet, hvad slags sælger det er, og domænet —
  // det eneste på kortet, køberen selv kan slå op, før han klikker.
  /* Runde 6 (D6-S3): "Privat sælger · guloggratis.dk" (31 tegn) klippede BEGGE
     led i 280 px-spalten. "Privat" er ikke mindre aerligt ved siden af et
     domaene; i smalle spalter skjuler css saelgertypen og lader domaenet —
     det eneste, koeberen kan slaa op — staa helt. Typen bliver i title. */
  /* Runde 7 (D7-F1): kun det, kilden har oplyst. Ved null (Gul og Gratis) staar
     domaenet alene — ingen "Privat", der var et gaet. */
  const saelgerType = l.saelgertype === 'forhandler' || (l.saelgertype === undefined && l.isDealer) ? 'Forhandler'
    : l.saelgertype === 'privat' ? 'Privat' : null;
  const saelger = [saelgerType, domaene].filter(Boolean).join(' · ') || (l.source && l.source.navn) || 'ekstern kilde';
  const saelgerHTML = domaene
    ? `${saelgerType ? `<span class="card-saelgertype">${saelgerType} · </span>` : ''}${escapeHTML(domaene)}`
    : (saelgerType || kilde);
  /* "Ny" står FØRST i prislinjen, foran forhandlerens salgsmarkører: den
     forklarer prisen på samme måde som "UDEN KLARGØRING" gør, men den er
     også et juridisk vilkår (garanti frem for reklamationsret), og den skal
     læses før tallet giver mening. */
  const erNy = eksternErNy(l);
  /* Garanti-sætningen er et løfte om TREDJEPARTS vilkår og må kun stå, hvor
     sælgertypen faktisk er oplyst som forhandler — samme regel, detaljesiden
     fik i D7-A1. En Gul og Gratis-annonce uden sælgertype får spørgsmålet i
     stedet for påstanden. */
  const nyHTML = erNy
    ? `<span class="card-ny" title="Annoncen ligger i ${escapeHTML(l.source?.navn || 'kilden')}s katalog over NYE motorcykler. Den er ikke brugt${saelgerType === 'Forhandler' ? ': du køber med garanti frem for reklamationsret, og kilometerstanden er derfor ikke oplyst' : ' — spørg sælgeren om garanti- og reklamationsvilkår'}.">Ny</span>`
    : '';
  const mark = eksternSalgsmarkoerer(l);
  const markHTML = mark.tekst
    ? `<span class="card-salgsmarkoerer" title="${escapeHTML(mark.alle.join(' · '))}">${escapeHTML(mark.tekst)}</span>`
    : '';
  /* <dl> med skjult <dt>: linjen viser kun værdien ("2003"), men
     skærmlæseren hører "Årgang: 2003". Det manglende led får sit eget par,
     så det læses som "Ikke oplyst af kilden: km og hk" og ikke som en løs
     hale på det foregående tal. Ordet "ikke oplyst" står visuelt i CSS
     (`.spec-tom dd::after`), fordi <dt> allerede bærer det for skærmlæseren
     — ellers ville det blive læst to gange. */
  const { kendte, mangler } = eksternSpecs(l);
  const specs = kendte.map(s => `
          <div class="card-spec"><dt>${s.navn}</dt><dd>${escapeHTML(s.vaerdi)}</dd></div>`).join('')
    + (mangler.length ? `
          <div class="card-spec spec-tom"><dt>${EKSTERN_UKENDT} af kilden</dt><dd>${escapeHTML(opremsDa(mangler))}</dd></div>` : '');

  const kk = koerekortMaerkat(l);
  /* Runde 5 (D5-S2/S3/S4/S7, maalt mod Bilbasens kort):
     - Kildestriben oeverst (34 px, identisk tekst paa 24 af 24 kort) er vaek;
       kilden bor ÉT sted paa kortet — fodlinjen, med det eksterne-link-ikon
       striben havde, domaenet og striben's forklaring som title. Fotoet
       rykker 34 px op, 24 kort = 816 px kortere side.
     - Koerekortet er en chip i SAMME raekke som aar/km/ccm (én 24 px-raekke
       som Bilbasens fire graa fakta-chips), kontur som standard og fyldt kun
       for A1/A2 — de kategorier, der faktisk udelukker noget (13 + 47 af 548)
       — saa prisen igen er kortets tungeste element. Chippen staar ALTID.
     - Fodlinjen: byen alene, naar den er kendt (regionen i title); domaenet
       vinder pladskampen i stedet for at blive klippet foerst. */
  const kkKlasse = kk.kode ? ` kk-${String(kk.kode).toLowerCase()}` : ' kk-ukendt';
  const by = String(l.city || '').trim();
  const region = l.region || regionFraPostnr(l.postnr);
  const sted = by || region || (l.postnr ? String(l.postnr) : 'Sted ikke oplyst');
  const stedTitle = by && region ? `${by}, ${region}` : sted;
  return `
  <article class="card card-external" data-listing-id="${l.id}" data-external="1">
    <div class="card-media">
      ${listingMediaHTML(l, altTekst, i === 0)}
      <button type="button" class="card-compare ${Store.isComparing(l.id)?'active':''}" data-compare-toggle="${l.id}" aria-pressed="${Store.isComparing(l.id)}" title="Sammenlign" aria-label="Tilføj til sammenligning">${Icon.compare}</button>
    </div>
    <div class="card-body">
      <div class="card-prisrække">
        <span class="card-price${l.price == null ? ' pris-mangler' : ''}">${pris}</span>
        ${nyHTML}
        ${markHTML}
      </div>
      <h3 class="card-title">
        <span class="card-title-main">${titel}</span>
        <span class="card-title-variant"${undertitel ? ` title="${undertitel}"` : ''}>${undertitel}</span>
      </h3>
      <div class="card-specblok">
        <dl class="card-specs">${specs}
          <div class="card-spec card-spec-kk"><dt>Kørekort</dt><dd><span class="card-koerekort${kkKlasse}" title="${escapeHTML(kk.forklaring)}" aria-label="${escapeHTML(kk.forklaring)}">${escapeHTML(kk.tekst)}</span></dd></div>
        </dl>
      </div>
      <div class="card-footer">
        <span class="card-sted" title="${escapeHTML(stedTitle)}">${Icon.mapPin}<span>${escapeHTML(sted)}</span></span>
        <span class="card-kildelinje" title="Annoncen ligger hos ${kilde} (${escapeHTML(saelger)}). Bikerbasen viser den, men handlen sker hos kilden.">${Icon.externalLink}<span>${saelgerHTML}</span></span>
      </div>
    </div>
    <a href="annonce.html?id=${l.id}"
       class="card-link"
       aria-label="Se annonce: ${titel}${undertitel ? ' ' + undertitel : ''}, ${pris} — hos ${kilde}"></a>
  </article>`;
}

function listingCardHTML(l, i){
  if (l.isExternal) return externalCardHTML(l, i);
  const fav = Store.isFavorite(l.id);
  const brand = escapeHTML(l.brand), model = escapeHTML(l.model), city = escapeHTML(l.city);
  /* Mærkatet skal kunne bakkes op med tal, køberen selv kan efterprøve.
     Før stod der "markedsniveau for den type og årgang" — årgang indgik
     slet ikke i udregningen, og "markedet" var medianen for en hel type,
     fra 125 til 1800 cm³. Nu siger forklaringen præcis hvad der er
     sammenlignet med og hvor mange. Se prisSammenligning() i js/data.js.
     Grundlaget hentes kun for de kort, der faktisk får mærkatet. */
  const suspicious = isSuspiciouslyCheap(l);
  const prisBasis = suspicious ? prisSammenligning(l) : null;
  // Rå mærke/model her — hele strengen escapes én gang nedenfor. Bruges de
  // allerede escapede `brand`/`model`, bliver et "&" til "&amp;amp;" i tippet.
  const prisTitel = prisBasis
    ? `Prisen er under 45 % af medianen for ${prisBasis.antal} andre ${l.brand} ${l.model} fra ${prisBasis.aarFra}-${prisBasis.aarTil} på Bikerbasen (median ${formatPrice(prisBasis.median)}). Bed om ekstra dokumentation, og betal aldrig forud.`
    : '';
  return `
  <article class="card" data-listing-id="${l.id}">
    <div class="card-media">
      ${listingMediaHTML(l, `${brand} ${model}`, i === 0)}
      <div class="card-badges">
        ${isNewListing(l.createdAt) ? `<span class="badge badge-new">Ny</span>` : ''}
        ${l.isDealer ? `<span class="badge badge-dealer">${Icon.store}Forhandler</span>` : ''}
        ${suspicious ? `<span class="badge badge-warning" title="${escapeHTML(prisTitel)}">${Icon.alertTriangle}Under markedspris</span>` : ''}
      </div>
      ${isOwnListing(l) ? '' : `<button type="button" class="fav-btn ${fav?'active':''}" aria-pressed="${fav}" aria-label="Gem annonce" data-fav-toggle="${l.id}">${Icon.heart}</button>`}
      ${(() => {
        /* Samme udregning som på det indekserede kort og som i filteret —
           koerekortMaerkat() er det ene sted, mærkatet bliver til. Kortet
           her er en lille brik oven på fotoet, så den viser kun koden; kan
           kategorien ikke afgøres, står der ingenting frem for en lang
           sætning hen over billedet. Forklaringen følger med som titel. */
        const k = koerekortMaerkat(l);
        return k.kode ? `<span class="card-koerekort" title="${escapeHTML(k.forklaring)}" aria-label="${escapeHTML(k.forklaring)}">${k.kode}</span>` : '';
      })()}
      <button type="button" class="card-compare ${Store.isComparing(l.id)?'active':''}" data-compare-toggle="${l.id}" aria-pressed="${Store.isComparing(l.id)}" title="Sammenlign" aria-label="Tilføj til sammenligning">${Icon.compare}</button>
    </div>
    <div class="card-body">
      <div class="card-price">${formatPrice(l.price)}</div>
      <h3 class="card-title">${brand} ${model}</h3>
      <div class="card-meta">
        <span>${Icon.calendar}${l.year}</span>
        <span>${Icon.gauge}${formatKm(l.km)}</span>
        <span>${Icon.engine}${formatCcm(l.ccm)}</span>
      </div>
      ${l.serviceHistorik === 'Fuld' ? `<div class="card-trust"><span class="badge badge-verified">${Icon.shieldCheck}Fuld servicehistorik</span></div>` : ''}
      ${sellerLineHTML(l)}
      <div class="card-footer">
        <span>${Icon.mapPin}${city}${l.region ? ', ' + escapeHTML(l.region) : ''}</span>
        <span>${timeAgoDa(l.createdAt)}</span>
      </div>
    </div>
    <a href="annonce.html?id=${l.id}" class="card-link" aria-label="Se annonce: ${brand} ${model}, ${formatPrice(l.price)}"></a>
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

/* ============ Report / notice-and-action modal ============ */
function ensureReportModal(){
  if (document.getElementById('report-modal')) return;
  const el = document.createElement('div');
  el.innerHTML = `
  <div class="modal-overlay" id="report-modal">
    <div class="modal-box">
      <div class="modal-head">
        <h2>Anmeld annonce</h2>
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
function ryddCookieHoejde(){
  document.documentElement.style.removeProperty('--cookie-h');
}

function initCookieConsent(){
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;
  if (Store.getCookieConsent()){ banner.remove(); document.body.classList.remove('cookie-banner-vises'); ryddCookieHoejde(); return; }

  /* Fortæl siden at banneret står der, og hvor højt det er. Annoncesidens
     handlingsbjælke skubbes op oven over det — før lå banneret oven på
     "Skriv til sælger", så sidens primære handling ikke kunne trykkes,
     før man havde svaret på cookies.

     Tallet skrives på documentElement og IKKE på body. Det er ikke kosmetik:
     WCAG 2.2 SC 2.4.11 kræver, at rulningen holder fokus fri af banneret, og
     den regel skal stå på html (scroll-padding-bottom). Et html-regelsæt kan
     ikke læse en variabel, der er sat på body — det var netop derfor
     cookiebanneret stod tilbage, da resten af 2.4.11 blev lukket. body arver
     stadig værdien, så .listing-actionbar's calc() er uændret. */
  document.body.classList.add('cookie-banner-vises');
  const maalHoejde = () => document.documentElement.style.setProperty('--cookie-h', banner.offsetHeight + 'px');
  maalHoejde();
  if (window.ResizeObserver) new ResizeObserver(maalHoejde).observe(banner);
  /* Runde 7 (D7-F6): indlaeses siden i en skjult fane, maales 226 px ved foerste
     maling mod bannerets 80 — og tallet fryser, fordi intet aendrer stoerrelse.
     Maal igen, naar fanen bliver synlig, og efter load. */
  document.addEventListener('visibilitychange', maalHoejde);
  window.addEventListener('load', () => requestAnimationFrame(maalHoejde), { once: true });

  const svar = level => () => {
    Store.setCookieConsent(level);
    banner.remove();
    document.body.classList.remove('cookie-banner-vises');
    ryddCookieHoejde();
    // Statistik er valgfri og starter foerst her — aldrig ved sideindlaesning.
    // "Kun noedvendige" starter den altsaa aldrig.
    if (level === 'all' && typeof window.bbStartAnalytics === 'function') window.bbStartAnalytics();
  };
  document.getElementById('cookie-accept-all').addEventListener('click', svar('all'));
  document.getElementById('cookie-necessary-only').addEventListener('click', svar('necessary'));
}

function wireFavoriteButtons(root){
  (root || document).querySelectorAll('[data-fav-toggle]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      // Ikke Number(): database-annoncer har uuid som id, og Number('4f2..')
      // er NaN — så et hjerteklik ramte forbi og kunne hverken like eller
      // unlike en rigtig annonce. Behold id'et som det er.
      const raw = btn.getAttribute('data-fav-toggle');
      const id = /^\d+$/.test(raw) ? Number(raw) : raw;
      const active = Store.toggleFavorite(id);
      if (typeof Maaling !== 'undefined') Maaling.favorit(Store.getListingById ? Store.getListingById(id) : null, active);
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active);
      toast(active ? 'Tilføjet til gemte annoncer' : 'Fjernet fra gemte annoncer');
    });
  });
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
    function specRows(bikes){
      const rows = [
        ['Pris', b => formatPrice(b.price)],
        ['Årgang', b => b.year],
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
        ['Kørekort', b => koerekortMaerkat(b).kode || 'Kan ikke afgøres'],
        ['Type', b => typeLabel(b.type)],
        ['Drivlinje', b => b.drive || 'Ikke oplyst'],
        ['Stand', b => b.condition || 'Ikke oplyst'],
        ['Servicehistorik', b => b.serviceHistorik || 'Ikke oplyst'],
        ['Antal ejere', b => b.antalEjere || 'Ikke oplyst'],
        ['Sidste syn', b => b.sidsteSyn || 'Ikke oplyst'],
      ];
      /* Runde 7 (D7-S6): Drivlinje, Stand, Servicehistorik, Antal ejere og
         Sidste syn indekserer vi ikke (CLAUDE.md regel 2). "Ikke oplyst" ville
         vaere en paastand om saelgeren; kilden KAN have oplyst dem. Er alle
         annoncer indekserede, falder raekkerne vaek og én linje siger hvorfor;
         i blandede saet staar "Se hos kilden" i de eksterne celler. */
      const alleEksterne = bikes.every(b => b.isExternal);
      const kunEgne = new Set(['Drivlinje', 'Stand', 'Servicehistorik', 'Antal ejere', 'Sidste syn']);
      const synlige = alleEksterne ? rows.filter(([label]) => !kunEgne.has(label)) : rows;
      return synlige.map(([label, fn]) =>
        `<tr><th scope="row">${label}</th>${bikes.map(b => `<td>${(b.isExternal && kunEgne.has(label)) ? 'Se hos kilden' : escapeHTML(String(fn(b)))}</td>`).join('')}</tr>`).join('')
        + (alleEksterne ? `<tr><td colspan="${bikes.length + 1}" class="compare-note">Udstyr, stand, ejere og syn står i annoncen hos kilden — Bikerbasen indekserer dem ikke.</td></tr>` : '');
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
              <thead><tr><th></th>${bikes.map(b => `<th scope="col"><a href="annonce.html?id=${encodeURIComponent(b.id)}">${escapeHTML(b.brand + ' ' + b.model)}</a></th>`).join('')}</tr></thead>
              <tbody>${specRows(bikes)}</tbody>
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
