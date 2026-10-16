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

/* ---------- Fotos ----------

   Galleriet viser KUN de billeder, annoncen faktisk har. Tom liste er et
   gyldigt svar, og kaldstedet siger det så højt.

   Her stod før `Math.max(3, listing.photos || 4)` tegnede pladsholdere, når
   der ingen fotos var. `listing.photos` er ikke et antal billeder: i
   demodata er det et tilfældigt tal (`4 + rnd()*4`, js/data.js), og i
   js/backend-bridge.js er det `Math.max(3, photos.length || 4)` — altså
   mindst tre, også når der er nul. Tælleren, pilene, miniaturerne og
   aria-etiketterne byggede alle videre på det tal.

   Resultatet: en annonce uden ét eneste billede stod med "1 / 4", pil frem,
   fire miniaturer og knapper mærket "Billede 1"–"Billede 4" — alle den samme
   tegnede motorcykel. Hele siden havde to <img>-elementer, og begge var
   logoet. Samtidig sagde annoncens eget kort i søgeresultatet ærligt "Intet
   foto". Vi løj altså præcis dér, hvor beslutningen om 80.000 kr. træffes,
   og fortalte sandheden ét klik tidligere.

   Feltet `photos` læses derfor ikke længere her — kun `photoUrls`, som er de
   billeder, der rent faktisk findes. */
function buildPhotoSet(listing){
  return (listing.photoUrls || []).filter(Boolean);
}

/* Ét billede, enten som hovedbillede eller som miniature.
   Miniaturen får alt="": den sidder inde i en knap, der allerede hedder
   "Billede 2 af 5", og den samme tekst to gange er støj i en skærmlæser. */
function fotoHTML(i, { thumb = false } = {}){
  const url = currentPhotos[i];
  if (!url) return '';
  const navn = `${currentListing?.brand || ''} ${currentListing?.model || ''}`.trim();
  // "billede 1 af 1" er en nummerering af noget, der ikke er nummereret.
  const alt = thumb ? ''
    : (currentPhotos.length > 1 ? `${navn} — billede ${i + 1} af ${currentPhotos.length}` : navn);
  /* Det første billede er sidens største element og dermed den, browseren
     skal hente først; resten hentes, når de skal bruges. (Ingen ændring af
     den kritiske sti — kun en prioritet på et billede, der hentes alligevel.) */
  const prio = (i === 0 && !thumb) ? ' fetchpriority="high"' : ' loading="lazy"';
  return `<img src="${escapeHTML(url)}" alt="${escapeHTML(alt)}" class="card-photo" decoding="async"${prio}>`;
}

/* Tåler at galleriet slet ikke findes: uden fotos bygger renderListing et
   ærligt felt i stedet, og så er hverken tæller, pile eller miniaturer i
   DOM'en. Før kastede den her funktion på `null.textContent`. */
function renderGallery(){
  const main = document.getElementById('gallery-main-img');
  if (!main || !currentPhotos.length) return;
  main.innerHTML = fotoHTML(currentPhotoIndex);
  const taeller = document.getElementById('gallery-counter');
  if (taeller) taeller.textContent = `${currentPhotoIndex + 1} / ${currentPhotos.length}`;
  document.querySelectorAll('.gallery-thumbs button').forEach(b => b.classList.toggle('active', Number(b.dataset.thumb) === currentPhotoIndex || (b.dataset.more && currentPhotoIndex >= 5)));
}

function shiftPhoto(dir){
  // Ét billede er ikke en karrusel — så findes pilene heller ikke.
  if (currentPhotos.length < 2) return;
  currentPhotoIndex = (currentPhotoIndex + dir + currentPhotos.length) % currentPhotos.length;
  renderGallery();
}

function initials(name){
  return name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
}

/* Datoer i den korte danske form: 16. aug. 2026.
   Ét sted, så vores egne annoncer og de indekserede ikke ender med hver sin
   skrivemåde på den samme side. Tom streng når datoen mangler — så kan
   kaldstedet lade linjen falde helt væk i stedet for at skrive "Invalid Date". */
function datoKort(iso){
  const t = new Date(iso || '').getTime();
  if (!t) return '';
  return new Date(t).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* Danske decimaltal: 4,6 — ikke 4.6. En bedømmelse med punktum i afslører
   en oversat side hurtigere end noget andet tal på siden. */
function talDa(n){
  return String(n).replace('.', ',');
}

/* ---------- Hvem sælger ----------
   Spørgsmålet "hvem handler jeg med?" skal kunne besvares uden at klikke og
   uden at logge ind. Her stod før en lukket kasse: udlogget fik man
   udelukkende "Log ind for at se sælger" — ikke engang om det var en
   forhandler eller en privatperson. Søgeresultatets kort sagde det på det
   tidspunkt allerede ("Privat sælger", "MC Specialisten Fyn"), så vi skjulte
   noget, vi selv viste to klik tidligere, og annoncesiden — den ene side,
   hvor beslutningen om 80.000 kr. træffes — vidste mindst af alle.

   Skellet går nu ét sted, og det er personoplysningen:
     forhandler   = en virksomhed. Navn, by og et evt. oplyst CVR-nummer er
                    offentlige oplysninger og står på kortene i forvejen.
     privat       = en person. Typen og byen står (byen står alligevel i
                    annoncen), navnet gør ikke.
   Telefonnummer og kontaktflade er stadig bag login for begge — det er DÉR
   skrabning og uønskede henvendelser kommer fra, ikke fra sælgertypen. */
function saelgerKortHTML(listing, { loggedIn, avgRating, reviewCount, telefon, telefonMulig }){
  const s = listing.seller || {};
  const erForhandler = !!s.isDealer;
  const visNavn = erForhandler || loggedIn;
  const navn = visNavn && s.name ? escapeHTML(s.name) : (erForhandler ? 'Forhandler' : 'Privat sælger');
  const type = erForhandler ? 'Forhandler' : 'Privat sælger';
  const undertekst = [visNavn && s.name ? type : '', s.city ? escapeHTML(s.city) : '']
    .filter(Boolean).join(' · ');

  const her = location.pathname.split('/').pop() + location.search;
  const redirect = encodeURIComponent(her);

  /* CVR står som en påstand med afsender, ikke som en verificering. Vi slår
     ikke op i registret (se verifiedBadgeHTML i js/components.js), så vi
     skriver hvem der har oplyst nummeret og lader køberen tjekke det selv.
     Feltet findes ikke i public_profiles, så på rigtige annoncer falder
     linjen bare væk — den må aldrig få en standardværdi. */
  /* OG NUMMERET SKAL BESTÅ SIN EGEN KONTROL, FØR VI TILBYDER OPSLAGET.
     Runde 2's kritiker regnede modulus 11 efter i hånden på demoforhandlerens
     nummer (95854101 → sum 146, 146 mod 11 = 3) og fandt, at det ikke kunne
     findes i registret. Sælgerprofilen fik kontrollen i runde 3; den her side
     havde den ikke, og det var HER nummeret stod. Køberen fik altså tilbudt
     et opslagslink, der aldrig kunne give et resultat, på den ene side hvor
     han beslutter sig — og profilen sagde det modsatte ét klik senere.
     Kontrollen bor nu i cvrKontrolOK() i js/components.js, som begge sider
     indlæser. Består nummeret ikke, står det der stadig (vi skjuler ikke,
     hvad sælgeren har skrevet), men uden linket og med grunden. */
  const cvrOK = (erForhandler && s.cvr) ? cvrKontrolOK(s.cvr) : false;
  const cvrLinje = (erForhandler && s.cvr)
    ? (cvrOK
      ? `<p class="seller-cvr">${Icon.info}<span>CVR oplyst af sælger: ${escapeHTML(s.cvr)} —
           <a href="https://datacvr.virk.dk/soegeresultater?fritekst=${encodeURIComponent(s.cvr)}"
              target="_blank" rel="noopener noreferrer">slå det op i CVR-registret</a></span></p>`
      : `<p class="seller-cvr seller-cvr-fejl">${Icon.alertTriangle}<span>CVR oplyst af sælger: ${escapeHTML(s.cvr)} —
           <b>nummeret består ikke sin egen kontrol.</b> Et dansk CVR-nummer skal gå op i
           modulus 11, og dette gør ikke, så det er enten tastet forkert eller fundet på.
           Bed om nummeret igen, før du betaler noget.</span></p>`)
    : '';

  /* Kun de tal, vi har. Et "–" i feltet Bedømmelse ligner en dårlig karakter;
     et felt, der ikke er der, ligner et felt, der ikke er der. */
  const tal = [
    avgRating != null ? [`${talDa(avgRating)} ★`, 'Bedømmelse'] : null,
    reviewCount ? [String(reviewCount), reviewCount === 1 ? 'Anmeldelse' : 'Anmeldelser'] : null,
    s.memberSince ? [String(s.memberSince), 'Medlem siden'] : null,
  ].filter(Boolean);

  /* ---------- Vejen til sælgerprofilen ----------

     Linket stod før som `forhandler.html?id=${s.id}` uden fallback, og
     `s.id` findes KUN på annoncer fra databasen (normalizeRemoteListing i
     js/backend-bridge.js sætter `id: row.seller_id`). Demoannoncerne i
     js/data.js har en sælger med navn, men uden id — så på alle 51 blev
     linket bogstaveligt `forhandler.html?id=` og profilsiden svarede
     "Sælgeren findes ikke". Målt: nul annoncer på sitet førte til en
     udfyldt profil.

     Nøglen er derfor `id` når den findes, ellers navnet. Navnet er nok til
     demodata (som kun findes på localhost) og bliver aldrig sendt til
     databasen — js/forhandler.js slår kun op i Postgres, når nøglen er en
     uuid. Har sælgeren hverken id eller navn, falder knappen væk i stedet
     for at pege ingen steder hen. */
  const profilNoegle = s.id || s.name || '';
  const profilHref = profilNoegle ? `forhandler.html?id=${encodeURIComponent(profilNoegle)}` : '';
  const profilKnapHTML = profilHref
    ? `<a href="${profilHref}" class="btn btn-outline btn-block">${Icon.user}Se sælgerprofil</a>`
    : '';

  /* Navnet ER vejen videre.
     Kritikeren fandt det som en blindgyde: forhandlerens navn stod som ren
     tekst, og Bilbasens tilsvarende navn er et link til hele forhandlerens
     lager. Knappen "Se sælgerprofil" længere nede fører samme sted hen, men
     et navn i fed skrift er dét, øjet og musen prøver først.
     Kun når navnet FAKTISK står der: er sælgeren en privatperson, og er man
     ikke logget ind, står der "Privat sælger", og det må ikke være et link,
     der afslører navnet i adressen. */
  const navnHTML = (visNavn && s.name && profilHref)
    ? `<a class="seller-name-link" href="${profilHref}">${navn}</a>`
    : navn;

  const identitet = `
        <div class="seller-row">
          <div class="avatar">${visNavn && s.name ? escapeHTML(initials(s.name)) : (erForhandler ? Icon.store : Icon.user)}</div>
          <div>
            <div class="seller-name">${navnHTML}</div>
            ${undertekst ? `<div class="seller-sub">${undertekst}</div>` : ''}
          </div>
        </div>
        ${verifiedBadgeHTML(s)}
        ${cvrLinje}
        ${tal.length ? `<div class="seller-stats">
          ${tal.map(([v, etiket]) => `<div class="seller-stat"><b>${v}</b><span>${etiket}</span></div>`).join('')}
        </div>` : ''}`;

  const raad = `<div class="safety-tip">${Icon.info}<span>Mød altid sælger et sikkert sted, og betal aldrig depositum uden at have set motorcyklen fysisk.</span></div>`;

  if (!loggedIn){
    /* Forhandlerens profil er åben udlogget; privatsælgerens er ikke.
       Det er præcis samme skel som ovenfor: forhandleren er en virksomhed,
       hvis navn og by allerede står på kortet, mens privatsælgerens navn er
       skjult indtil login — og et link til "Anders Hansen" ville afsløre
       det, kortet lige har holdt tilbage. */
    return `
      <div class="sidebar-card">
        ${identitet}
        <div class="contact-actions">
          <a href="login.html?redirect=${redirect}" class="btn btn-primary btn-block">${Icon.mail}Log ind og skriv til sælger</a>
          ${erForhandler ? profilKnapHTML : `<a href="login.html?redirect=${redirect}" class="btn btn-outline btn-block">${Icon.user}Opret gratis profil</a>`}
        </div>
        <!-- Siger hvad login giver, og hvorfor — ikke bare at der er en mur. -->
        <p class="seller-locked-note">${Icon.lock}<span>${erForhandler ? 'Forhandlerens profil er' : 'Sælgerens navn og profil er'} kun synlige for indloggede brugere. Det holder sælgerne fri af robotter og reklamehenvendelser.</span></p>
        ${raad}
      </div>`;
  }

  /* Telefonknappen vises kun, når der ER et nummer.
     public_profiles udstiller ikke telefon (se supabase/schema.sql), så på
     rigtige annoncer er feltet null. Knappen stod der alligevel og skrev
     "null" ud i sidens største kontaktskrift, når man trykkede. Ingen knap
     er et bedre svar end et forkert nummer. */
  return `
      <div class="sidebar-card">
        ${identitet}
        <div class="contact-actions">
          <button type="button" class="btn btn-primary btn-block" id="open-contact-modal">${Icon.mail}Skriv til sælger</button>
          ${telefon || telefonMulig ? `<button type="button" class="btn btn-outline btn-block" id="reveal-phone-btn">${Icon.phone}Vis telefonnummer</button>` : ''}
          <button type="button" class="btn btn-outline btn-block" id="open-payment-modal">${Icon.lock}Betal sikkert (MobilePay)</button>
          ${profilKnapHTML}
        </div>
        ${telefon || telefonMulig ? '' : `<p class="seller-locked-note">${Icon.info}<span>Sælgeren har ikke oplyst et telefonnummer. Skriv i stedet — så får du svaret på skrift.</span></p>`}
        ${raad}
      </div>

`;
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

   Datagrundlaget er magert med vilje (014_aggregator.sql): ingen fuld
   annoncetekst, intet galleri, ingen kontaktoplysninger. Men "magert
   datagrundlag" er ikke det samme som "mager side". Bilbasens annonceside
   er ikke god, fordi den har mange felter — den er god, fordi den er
   disciplineret: én tydelig pris med etiket over, specs i fast rækkefølge i
   en læsbar tabel, hver sektion under sin egen overskrift med en streg
   imellem, og forhandleren i et kort for sig, hvor der ikke er tvivl om,
   hvem man handler med.

   Dét er, hvad vi tager herfra. Ikke deres felter: rækkevidde, km/l,
   gearkasse og karrosseri betyder ingenting på en motorcykel. Vores fire
   nøgletal er årgang, kilometer, kubik og hk.

   Og ét felt, Bilbasen ikke har brug for, men som afgør, om køberen
   overhovedet må køre motorcyklen: kørekortkategorien. Den står højt oppe,
   lige under prisen — før specs, før beskrivelse. Er den forkert, er alt
   andet på siden ligegyldigt, så den vises kun, når vi faktisk kan regne
   den ud (se nedenfor).

   Der er stadig ingen kontaktflade og kun én vej videre: til forhandleren.

   Om ordene på siden: køberen møder aldrig "kilde", "ekstern" eller
   "indekseret". Det er vores ord for vores maskineri. For ham findes der
   én ting — MC Syd — og teksten skal fortælle ham, HVEM det er, ikke hvad
   vi kalder dem internt. */

/* Aftalerne med de forhandlere, vi viser annoncer fra.
   ------------------------------------------------------------------
   HER STOD ET `tilladelse`-FLAG, OG SÆTNINGEN "Vi viser deres annoncer med
   skriftlig tilladelse fra dem." Begge er fjernet på ejerens anmodning.

   Skriv den ikke tilbage. Aftalen med en kilde er ikke noget, køberen skal
   bruge til at afgøre sit køb — den er vores forhold til kilden, og at
   trykke den på en annonceside gør en tredjeparts samtykke til
   markedsføringsmateriale. Køberen har brug for at vide, HVEM han handler
   med, og hvor motorcyklen står. Det siger de øvrige sætninger her.

   Selve optegnelsen af aftalen bliver hvor den hører til:
   `tilladelse_modtaget` og `tilladelse_dato` i sources/<domaene>.yaml, hvor
   crawler/config.js linje 130 nægter at køre uden den. Det er en spærre i
   pipelinen, ikke en påstand på en side — og det er den rigtige placering,
   fordi den skal stoppe en kørsel, ikke overbevise en køber.

   `type` er forhandlerens egen beskrivelse, ikke vores gæt.

   `markedsplads` siger, at kilden ikke SÆLGER noget. Gul og Gratis er ikke
   en forhandler med et lager — det er et sted, hvor privatpersoner
   annoncerer. Forskellen er ikke kosmetisk: sætningen "du handler direkte
   med <kilde> — de svarer på dine spørgsmål, aftaler prøvetur og laver
   papirerne" er sand om MC Syd og falsk om Gul og Gratis, hvor det er
   sælgeren bag annoncen, der gør alle tre ting. Uden feltet ville hver
   eneste markedspladsannonce sende køberen til den forkerte modpart. */
const FORHANDLERAFTALER = {
  'mcsyd.dk': { type: 'motorcykelforhandler' },
  'guloggratis.dk': { type: 'markedsplads', markedsplads: true },
};

/* Reklamationsretten på forhandlerannoncer — slås fra ved at sætte false.
   ------------------------------------------------------------------
   24 måneders reklamationsret efter købeloven er det stærkeste enkelte
   argument for at handle med en forhandler frem for en privat sælger, og
   sellerTypeNoteHTML() har teksten i forvejen.

   Men det er en juridisk oplysning om en TREDJEPART. Vi ved kun, at MC Syd
   er forhandler, fordi crawleren læste det ud af deres eget site — der er
   ikke slået et CVR-nummer op nogen steder. Er saelgertype forkert på bare
   én annonce, står der en forkert juridisk oplysning på vores side om en
   virksomhed, vi ikke har kontrolleret.

   Vurderingen bag `true`: teksten siger, hvad loven siger om
   erhvervsmæssigt salg — den lover ikke noget PÅ MC Syds vegne, og den
   vises kun, når kilden selv har markeret annoncen som forhandlersalg.
   Skal den væk, er det ét ord her, ikke en oprydning i markup.

   RUNDE 4: flaget gælder KUN denne ene påstand (og den tilsvarende
   "garanti"-sætning i fabriksnyNote ovenfor) — begge er en påstand om MC
   Syd som tredjepart. Privat-advarslen (sellerTypeNoteHTML(false)) er ikke
   en påstand om en tredjepart, den er dansk rets almindelige regel, og den
   vises derfor altid for en annonce, hvor kilden IKKE har markeret
   forhandlersalg — uafhængigt af dette flag. Se sellerkort-blokken i
   renderExternalListing(). */
const VIS_REKLAMATIONSRET = true;

/* ============ Annonceside i tre kolonner (referencebillede 3) ============

   Både vores egne og de indekserede annoncer bygges nu i samme skal, så siden
   har ÉN komposition: galleri · titelblok med nøgletal · sælgerboks, og under
   dem faktatabel, kørekortkort og tjekliste. Hvert felt kommer fra annoncen;
   mangler det, står der "Ikke oplyst" (grundfelterne) eller også er rækken der
   ikke (valgfri felter). Ingen tal, anmeldelser eller svartider er opdigtet.

   Klasserne har præfikset .an- og bor i css/p-annonce.css. */
const anSvg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const AN_IKON = {
  bolt:    anSvg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  fuel:    anSvg('<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M14 9h2.5a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 0 3 0V8l-3-3M6 8h6"/>'),
  palette: anSvg('<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10.5" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16" cy="10.5" r="1"/>'),
  cog:     anSvg('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'),
  wrench:  anSvg('<path d="M14.5 6a4 4 0 0 0 5 5L10 20.5a2.1 2.1 0 0 1-3-3z"/>'),
  users:   anSvg('<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14a5 5 0 0 1 4.5 6"/>'),
  plate:   anSvg('<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 12h2m3 0h5"/>'),
  idcard:  anSvg('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M5.8 16.5a3.3 3.3 0 0 1 6.4 0M14 10h4M14 13h4"/>'),
  clipboard: anSvg('<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>'),
  doc:     anSvg('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>'),
  snow:    anSvg('<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>'),
  tag:     anSvg('<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1"/>'),
};

const anEnc = (s) => encodeURIComponent(s);

/* Brødkrumme: Forside › Motorcykler › Mærke › Model › Mærke Model (årgang).
   Mærket og modellen peger på den søgning, der viser præcis dem. "Ukendt" er
   ikke et mærke man kan søge på, så leddet udelades. */
function anBrodkrumme(l){
  const nav = document.getElementById('bc-nav');
  if (!nav) return;
  const maerkeOK = l.brand && l.brand !== 'Ukendt';
  const led = [['index.html', 'Forside'], ['soegning.html', 'Motorcykler']];
  if (maerkeOK) led.push([`soegning.html?brands=${anEnc(l.brand)}`, l.brand]);
  if (maerkeOK && l.model) led.push([`soegning.html?brands=${anEnc(l.brand)}&model=${anEnc(l.model)}`, l.model]);
  const sidste = [maerkeOK ? l.brand : '', l.model].filter(Boolean).join(' ') || 'Annonce';
  nav.innerHTML = led.map(([h, t]) => `<a href="${h}">${escapeHTML(t)}</a><span class="bc-sep">${Icon.chevronRight}</span>`).join('')
    + `<span id="bc-current" aria-current="page">${escapeHTML(sidste)}${l.year ? ` (${escapeHTML(String(l.year))})` : ''}</span>`;
}

/* "Del annonce", "Sammenlign" og "Gem som favorit" øverst til højre — kun de
   handlinger, der findes. Indekserede annoncer har ingen favorit (D-008). */
function anAktioner(l, eget){
  const mount = document.getElementById('an-actions');
  if (!mount) return;
  const id = escapeHTML(String(l.id));
  const fav = Store.isFavorite(l.id);
  const sammenlign = Store.isComparing && Store.isComparing(l.id);
  mount.innerHTML = `
    <button type="button" class="an-act" id="share-listing-btn">${Icon.share}<span>Del annonce</span></button>
    <button type="button" class="an-act" data-compare-toggle="${id}" aria-pressed="${sammenlign ? 'true' : 'false'}">${Icon.compare}<span>Sammenlign</span></button>
    ${(l.isExternal || eget) ? '' : `<button type="button" class="an-act an-fav ${fav ? 'active' : ''}" aria-pressed="${fav}" data-fav-toggle="${id}">${Icon.heart}<span class="an-fav-off">Gem som favorit</span><span class="an-fav-on">Gemt som favorit</span></button>`}`;
}

/* Strukturerede data skal følge den synlige brødkrumme (5 led). seo.js
   (delt lag) skriver kun 3; her skrives den om, så de to er ens, og det
   sidste leds adresse bevares som seo.js satte den. */
function anSeoBrodkrumme(l){
  if (typeof Seo === 'undefined') return;
  const el = document.getElementById('jsonld-breadcrumb');
  let sidste = '';
  try { sidste = JSON.parse(el.textContent).itemListElement.slice(-1)[0].item; } catch (e) { return; }
  const maerkeOK = l.brand && l.brand !== 'Ukendt';
  const led = [{ name: 'Forside', path: '' }, { name: 'Motorcykler', path: 'soegning' }];
  if (maerkeOK) led.push({ name: l.brand, path: `soegning?brands=${anEnc(l.brand)}` });
  if (maerkeOK && l.model) led.push({ name: l.model, path: `soegning?brands=${anEnc(l.brand)}&model=${anEnc(l.model)}` });
  led.push({ name: `${maerkeOK ? l.brand + ' ' : ''}${l.model || 'Annonce'}${l.year ? ` (${l.year})` : ''}`, path: sidste.replace(SITE_URL + '/', '') });
  Seo.setJsonLd('breadcrumb', Seo.breadcrumb(led));
}

function anVirkDel(l){
  document.getElementById('share-listing-btn')?.addEventListener('click', async () => {
    const url = location.href;
    const title = `${l.brand} ${l.model}${l.price ? ` — ${formatPrice(l.price)}` : ''}`;
    if (navigator.share){
      try { await navigator.share({ title, url }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); toast('Link kopieret til udklipsholderen'); }
    catch (e) { prompt('Kopiér linket:', url); }
  });
}

/* H1'en står i markup uden for #listing-detail (én h1 pr. side, også uden
   JavaScript). Her flyttes den ind i titelblokken, så den sidder, hvor
   billedet har den. */
function anFlytH1(tekst){
  const h1 = document.getElementById('listing-h1');
  const plads = document.getElementById('an-h1-slot');
  if (!h1 || !plads) return;
  if (tekst) h1.textContent = tekst;
  h1.classList.remove('visually-hidden');
  h1.classList.add('an-h1');
  plads.replaceWith(h1);
}

const anChips = (liste) => liste.filter(Boolean).map(c => `<span class="an-chip">${escapeHTML(c)}</span>`).join('');

/* Ikon-rækken med nøgletal: kun de tal annoncen oplyser. */
function anNoegletal(l, hk){
  const felter = [
    l.km != null   ? [Icon.gauge,    formatKm(l.km), 'Kørt'] : null,
    l.year != null ? [Icon.calendar, String(l.year), 'Årgang'] : null,
    Number(l.ccm) > 0 ? [Icon.engine, formatCcm(l.ccm), 'Motor'] : null,
    hk ? [AN_IKON.bolt, formatPower(hk), 'Effekt'] : null,
  ].filter(Boolean);
  if (!felter.length) return '';
  return `<ul class="an-stats">${felter.map(([ikon, v, e]) => `<li>${ikon}<span><b>${escapeHTML(v)}</b><small>${e}</small></span></li>`).join('')}</ul>`;
}

/* "Fakta om motorcyklen": to kolonner, ikon + etiket + værdi. Rækker med
   værdi null/'' udelades; grundfelterne får 'Ikke oplyst' af kaldstedet. */
function anFakta(rader){
  const synlige = rader.filter(r => r && r[2] != null && r[2] !== '');
  return `
    <section class="an-card an-fakta" aria-labelledby="an-fakta-h">
      <h2 id="an-fakta-h">Fakta om motorcyklen</h2>
      <dl class="an-facts">
        ${synlige.map(([ikon, etiket, v]) => `<div class="an-fact"><span class="an-fact-ico">${ikon}</span><dt>${etiket}</dt><dd${v === 'Ikke oplyst' ? ' class="an-na"' : ''}>${String(v).includes('<') ? v : String(v).replace(/\//g, '/<wbr>')}</dd></div>`).join('')}
      </dl>
    </section>`;
}

/* "Kan du køre denne motorcykel?" — svaret kommer fra koerekortMaerkat(), det
   samme sted som kortene og filteret. Oplysninger kan kun UDELUKKE A1/A2,
   aldrig bekræfte dem; derfor "ikke udelukket ud fra de oplyste tal".
   Reglerne (A1: højst 125 cm³ / 11 kW / 0,1 kW/kg · A2: højst 35 kW / 0,2 kW/kg
   og ikke afledt af en model med over dobbelt effekt) er læst på
   fstyr.dk/privat/koerekort/udvidelse-af-koerekort/koerekort-til-motorcykel. */
function anKoerekortKort(l, kkM, uvisA2A){
  const kk = kkM.kode;
  const badge = kk ? kk : (uvisA2A ? 'A2/A' : '?');
  const badgeTekst = kk === 'A' ? 'Kræver A-kørekort'
    : kk ? `Ikke udelukket ud fra de oplyste tal` : 'Kan ikke afgøres';
  const ekstra = (kk === 'A' && l.kanNedsaettesA2) ? ' Sælgeren oplyser, at den kan effektbegrænses til A2.' : '';
  const side = kk === 'A1' ? 'koerekort-a1.html' : 'koerekort-a2.html';
  return `
    <section class="an-card an-kk" aria-labelledby="an-kk-h">
      <span class="an-kk-ico" aria-hidden="true">${AN_IKON.idcard}</span>
      <div class="an-kk-tekst">
        <h2 id="an-kk-h">Kan du køre denne motorcykel?</h2>
        <p>${escapeHTML(kkM.forklaring)}${ekstra}</p>
        <a class="an-link" href="${side}">Læs mere om kørekort og regler${Icon.arrowRight}</a>
      </div>
      <div class="an-kk-badge" role="img" aria-label="${escapeHTML(badge)}: ${escapeHTML(badgeTekst)}"><b>${escapeHTML(badge)}</b><small>${escapeHTML(badgeTekst)}</small></div>
    </section>`;
}

/* Generelle, sande råd — ingen påstande om netop denne motorcykel. */
function anTjekKort(){
  const punkter = [
    'Tjek servicehistorik og dokumentation',
    'Undersøg slidtage (dæk, kæde, bremser)',
    'Lyt til motoren og prøvekør',
    'Kontrollér for skader og tidligere uheld',
    'Tjek, at stelnummeret matcher papirerne',
  ];
  return `
    <section class="an-card an-tjek" aria-labelledby="an-tjek-h">
      <span class="an-tjek-ico" aria-hidden="true">${AN_IKON.clipboard}</span>
      <div>
        <h2 id="an-tjek-h">Det bør du tjekke, inden du køber</h2>
        <p class="an-tjek-sub">Gå motorcyklen grundigt igennem, inden du køber. Her er de vigtigste punkter:</p>
        <ol class="an-tjek-liste">${punkter.map(p => `<li>${p}</li>`).join('')}</ol>
        <a class="an-link" href="guide-brugt-motorcykel.html">Se vores guide til brugt motorcykel${Icon.arrowRight}</a>
      </div>
    </section>`;
}

/* "Handl trygt på Bikerbasen" — kun punkter, siden faktisk lever op til. */
function anTrygtKort(ekstern, kilde){
  const punkter = ekstern
    ? [
        [Icon.shieldCheck, `Kilden står på hvert kort — her: ${kilde}`],
        [Icon.externalLink, 'Vi hoster ikke annoncen — du går videre til sælger'],
        [Icon.checkCircle, 'Kørekortvurderingen bygger kun på oplyste tal'],
        [Icon.lock, 'Bikerbasen har ingen betalingsløsning og rører aldrig pengene'],
      ]
    : [
        [Icon.shieldCheck, 'Sælgerens type og by står åbent på annoncen'],
        [Icon.phone, 'Telefonnummer vises kun, hvis sælgeren selv har slået det til'],
        [Icon.checkCircle, 'Kørekortvurderingen bygger kun på oplyste tal'],
        [Icon.lock, 'Bikerbasen har ingen betalingsløsning og rører aldrig pengene'],
      ];
  return `
    <section class="an-card an-trygt" aria-labelledby="an-trygt-h">
      <h2 id="an-trygt-h">Handl trygt på Bikerbasen</h2>
      <ul class="an-trygt-liste">${punkter.map(([i, t]) => `<li><span class="an-trygt-ico">${i}</span><span>${t}</span></li>`).join('')}</ul>
      <a class="an-link" href="sikkerhed.html">Læs mere om sikker handel${Icon.arrowRight}</a>
    </section>`;
}

/* "Lignende motorcykler": samme pointsystem for begge slags annoncer. Mærke,
   model, pris, kubik, årgang og type — kun felter vi har. Kræver minimumsscore
   (tom stribe er ærligere end 1983 mod 2023), og fotos vinder ved lige point. */
function anLignende(listing){
  const ccm = Number(listing.ccm) || 0;
  const score = (l) => {
    let s = 0;
    if (listing.model && l.model && String(l.model).toLowerCase() === String(listing.model).toLowerCase()) s += 3;
    if (l.brand === listing.brand) s += 2;
    if (listing.price > 0 && l.price > 0 && Math.abs(l.price - listing.price) / listing.price <= 0.4) s += 3;
    if (ccm > 0 && Number(l.ccm) > 0 && Math.abs(Number(l.ccm) - ccm) / ccm <= 0.35) s += 2;
    if (listing.year && l.year && Math.abs(Number(l.year) - Number(listing.year)) <= 6) s += 1;
    if (listing.type && l.type === listing.type) s += 2;
    return s;
  };
  const andre = Store.getAllListings().filter(l => String(l.id) !== String(listing.id));
  const rangeret = andre
    .map(l => [score(l) + ((l.photoUrls && l.photoUrls[0]) ? 0.5 : 0), l])
    .filter(([s]) => s >= 4)
    .sort((a, b) => b[0] - a[0]);
  const set = new Set(); const valgt = [];
  for (const [, l] of rangeret){
    const n = `${l.brand}|${l.model}|${l.price}`;
    if (set.has(n)) continue;
    set.add(n); valgt.push(l);
    if (valgt.length === 6) break;
  }
  return valgt;
}

function anFyldLignende(listing){
  const stribe = document.querySelector('.similar-strip');
  const mount = document.getElementById('similar-listings');
  if (!stribe || !mount) return;
  const lignende = anLignende(listing);
  if (!lignende.length){ stribe.hidden = true; return; }
  stribe.hidden = false;
  mount.innerHTML = lignende.map((l, i) => listingCardHTML(l, i)).join('');
  wireFavoriteButtons(mount);
  const alle = document.getElementById('similar-all');
  if (alle){
    const maerke = listing.brand && listing.brand !== 'Ukendt';
    alle.href = maerke ? `soegning.html?brands=${anEnc(listing.brand)}` : 'soegning.html';
    alle.hidden = false;
  }
}

/* "Søg videre": interne links med tal, regnet med søgesidens egen filterkæde,
   så tallet på linket er tallet på resultatsiden. Et link uden træf tegnes ikke. */
function anFyldVidere(l, kk){
  const mount = document.getElementById('an-videre');
  if (!mount) return;
  const alle = (typeof Store !== 'undefined' && Store.getAllListings) ? Store.getAllListings() : [];
  const tael = (f) => (typeof Filtrering !== 'undefined' && Filtrering.anvendFiltre) ? Filtrering.anvendFiltre(alle, f, null, null).length : null;
  const links = [];
  const dom = l.source?.domaene;
  if (dom){
    const n = alle.filter(x => x.source?.domaene === dom).length;
    if (n > 1) links.push([`soegning.html?kilde=${anEnc(dom)}`, `Alle annoncer fra ${l.source.navn || dom}`, n]);
  }
  if (l.brand && l.brand !== 'Ukendt'){
    const n = tael({ brands: [l.brand] });
    if (n == null || n > 0) links.push([`soegning.html?brands=${anEnc(l.brand)}`, `Alle ${l.brand} til salg`, n]);
  }
  if (kk){
    const n = tael({ koerekort: kk });
    if (n == null || n > 0) links.push([`soegning.html?koerekort=${anEnc(kk)}`, `Motorcykler til ${kk}-kørekort`, n]);
  }
  if (!l.isExternal && l.type){
    const n = tael({ types: [l.type] });
    if (n == null || n > 0) links.push([`soegning.html?type=${anEnc(l.type)}`, `Alle ${typeLabel(l.type)}`, n]);
  }
  const region = l.region || (l.postnr && typeof findPostnr === 'function' ? findPostnr(l.postnr)?.region : '');
  if (region){
    const n = tael({ regions: [region] });
    if (n == null || n > 0) links.push([`soegning.html?regions=${anEnc(region)}`, `Motorcykler i ${region}`, n]);
  }
  links.push(['soegning.html', 'Alle motorcykler', alle.length || null]);
  mount.innerHTML = `<h2>Søg videre på Bikerbasen</h2><ul>${links.map(([h, t, n]) =>
    `<li><a href="${h}"><span>${escapeHTML(t)}</span>${n != null ? `<span class="an-videre-n">${n.toLocaleString('da-DK')}</span>` : ''}</a></li>`).join('')}</ul>`;
  mount.hidden = false;
}

/* Fast bjælke på mobil for indekserede annoncer: pris + den ene handling.
   Lå før som inline-script i annonce.html (CSP-hash); flyttet hertil. Bjælken
   viser sig først, når knappen i sælgerboksen er rullet ud af synsfeltet, så
   der altid er præcis én synlig "Gå til annoncen". */
function anEksternBjaelke(href, listing, kilde, prisTekst){
  if (!href) return;
  const bar = document.createElement('div');
  bar.className = 'listing-actionbar';
  bar.id = 'ekstern-actionbar';
  if (prisTekst){
    const pris = document.createElement('span');
    pris.className = 'listing-actionbar-pris';
    pris.textContent = prisTekst;
    bar.appendChild(pris);
  }
  const knap = document.createElement('a');
  knap.href = href;
  knap.target = '_blank';
  knap.rel = 'noopener noreferrer nofollow';
  knap.className = 'btn btn-primary';
  knap.dataset.listingId = String(listing.id);
  knap.innerHTML = `Gå til annoncen hos&nbsp;<span class="an-nb">${kilde}</span>${Icon.externalLink}`;
  bar.appendChild(knap);
  document.body.appendChild(bar);
  document.body.classList.add('har-actionbar');
  const blok = document.querySelector('.an-cta');
  if (blok && 'IntersectionObserver' in window){
    bar.hidden = true;
    new IntersectionObserver(es => es.forEach(e => {
      bar.hidden = e.isIntersecting || (e.boundingClientRect.top > 0 && e.boundingClientRect.top < window.innerHeight);
    }), { threshold: 0 }).observe(blok);
  }
}

function renderExternalListing(listing){
  const kildeNavn = listing.source?.navn || 'forhandleren';
  const kilde   = escapeHTML(kildeNavn);
  const domaene = escapeHTML(listing.source?.domaene || '');
  const aftale  = FORHANDLERAFTALER[listing.source?.domaene] || null;
  const brand = escapeHTML(listing.brand), model = escapeHTML(listing.model);
  const href = sikkerUrl(listing.externalUrl);
  const foto = sikkerUrl(listing.photoUrls?.[0]);

  // Vi ejer ikke indholdet, og en kopi af forhandlerens annonce skal ikke
  // konkurrere med originalen i Google.
  Seo.setMeta('meta[name="robots"]', 'name', 'robots', 'noindex, follow');

  /* Titel, description, og:-billede, canonical (til KILDEN — se
     work/DECISIONS.md) og struktureret data i ét kald. Fotos sanitizeres
     med sikkerUrl(), samme funktion som fotoet i galleriet nedenfor bruger
     — de kommer fra en forhandlers DOM, ikke fra os selv. */
  seoExternalListingPage(listing, (listing.photoUrls || []).map(sikkerUrl).filter(Boolean));

  anBrodkrumme(listing);
  anSeoBrodkrumme(listing);

  /* ---------- Sted: by + landsdel, ikke by + postnummer ----------
     Bilbasen skriver "Odder, Østjylland". Vi skrev "Rødding 6630". Et
     postnummer er en sorteringsnøgle, ikke en stedsangivelse — landsdelen
     er det, en køber regner afstand i. Opslaget er lokalt (postnumre.js,
     DAWA) og koster ingenting. */
  const opslag = listing.postnr ? findPostnr(listing.postnr) : null;
  const byNavn = listing.city || opslag?.city || '';
  const stedTekst = [byNavn, opslag?.region].filter(Boolean).join(', ');

  /* Hvem MC Syd ER. Siden nævnte dem fem gange og fortalte aldrig, om det
     var en forretning eller en hjemmeside — og sluttede på "vi er ikke en
     del af handlen", et forbehold, køberen ikke havde spurgt om, og som
     derfor plantede bekymringen frem for at fjerne den.

     Byen kommer fra annoncen selv, ikke fra en formodning: på en
     forhandlerannonce ER motorcyklens sted forhandlerens adresse.

     Men KUN på en forhandlerannonce. På en markedsplads er byen sælgerens,
     ikke kildens, og "Gul og Gratis er markedsplads i Hedensted" ville være
     opdigtet geografi om en landsdækkende hjemmeside. */
  const markedsplads = Boolean(aftale?.markedsplads);
  const hvemErDe = markedsplads
    ? `${kilde} er en ${escapeHTML(aftale.type)}`
    : (aftale?.type
      ? `${kilde} er ${escapeHTML(aftale.type)}${byNavn ? ` i ${escapeHTML(byNavn)}` : ''}`
      : '');

  /* "Motorcyklen står hos dem" og "det er dem, du køber af" er sande om en
     forhandler og falske om en markedsplads: annoncestedet har hverken
     motorcyklen eller handlen. */
  const hvorStaarDen = markedsplads
    ? `${hvemErDe}, og motorcyklen står hos sælgeren. `
    : (hvemErDe ? `${hvemErDe}, og motorcyklen står hos dem. ` : `Motorcyklen står hos ${kilde}. `);
  const hvemKoeberDuAf = markedsplads
    ? `${hvemErDe}, og du køber af sælgeren bag annoncen.`
    : (hvemErDe ? `${hvemErDe}, og det er dem, du køber af.` : `Det er dem, du køber af.`);

  /* Hvem køberen faktisk skal tale med.
     Hos en forhandler er kilden og sælgeren den samme. På en markedsplads er
     de det ikke: Gul og Gratis svarer ikke på spørgsmål om motorcyklen,
     aftaler ikke prøvetur og laver ikke papirerne — det gør den
     privatperson, der har indrykket annoncen. Og netop dér gælder
     købelovens regler om privatsalg, altså ingen reklamationsret. Den
     forskel skal stå på siden, ikke opdages ved fremmødet. */
  const hvemHandlerDuMed = markedsplads
    ? `Du handler med sælgeren bag annoncen, ikke med ${kilde} — det er sælgeren,
       der svarer på dine spørgsmål, aftaler prøvetur og laver papirerne.
       ${kilde} er annoncestedet.`
    : `Du handler direkte med ${kilde} —
       de svarer på dine spørgsmål, aftaler prøvetur og laver papirerne.`;

  /* ---------- Titlens anden linje, og salgsvilkårene ----------
     Bilbasen sætter model på linje 1 og variant dæmpet på linje 2 ("Jeep
     Avenger" / "54 Altitude 5d"). Normaliseringen deler nu titlen på samme
     måde, og trækker samtidig salgsmarkører som ENGROS og UDEN KLARGØRING
     ud i deres eget felt.

     De markører er ikke støj, man skjuler. "Uden klargøring" er en
     prisforklaring: motorcyklen sælges billigere, fordi forhandleren ikke
     har gjort den klar. Køberen skal se den ved siden af prisen — det er
     samme rolle som Bilbasens "(Uden afgift)" — ikke opdage den, når han
     står i butikken.

     Felterne kommer fra normaliseringen, som en anden hånd ejer. Vi læser
     dem defensivt: er de der, vises de; er de der ikke, ser siden ud
     præcis som før. Ingen tomme rammer i mellemtiden. */
  /* `variant` fra basen ER kildens kategoriord — se delModelOgVariant() i
     crawler/normalize.js, der netop flytter typeordene derover. De 332
     indekserede rækker blev crawlet med kildens ordforråd, så feltet siger
     stadig "Street", "Sportstouring", "Offroader", "Klassiker". Ingen af de
     ord findes i vores Type-filter, og de stod i sidens H1 og <title>.
     Vi skriver derfor VORES type, den samme værdi filteret sorterer på —
     og intet, når typen ikke kan kortlægges. Samme regel som eksternTitel()
     i js/components.js, så kortet og siden siger det samme. */
  const variant = listing.type ? typeLabel(listing.type) : '';
  /* Typen er IKKE længere en del af overskriften. Den stod før i både h1 og
     <title> ("Honda GL 1100 Gold Wing Klassiker"), hvor den læses som en del
     af modelnavnet — og et delt link i en MC-gruppe bar altså et ord, kilden
     havde fundet på. En kategori hører i en kategorilinje. */
  const fuldTitel = [listing.brand, listing.model].filter(Boolean).join(' ');
  /* <title> sættes nu af seoExternalListingPage() ovenfor — mærke, model,
     kilde OG pris ("X hos Y — 45.000 kr. — Bikerbasen"), hvor det før kun
     var mærke og model uden pris. h1'en er en separat, kortere ting: den
     skal ikke bære prisen, som allerede står sit eget sted på siden. */
  const h1 = document.getElementById('listing-h1');
  if (h1) h1.textContent = fuldTitel;

  const salgsmarkoerer = (() => {
    const raa = listing.salgsmarkoerer ?? listing.salgsmarkører ?? listing.markoerer ?? null;
    const liste = Array.isArray(raa) ? raa : (raa ? String(raa).split(/\s*[\/,;]\s*/) : []);
    // "ENGROS" råbt med versaler er kildens formatering, ikke en oplysning.
    return liste.map(m => String(m).trim())
      .filter(Boolean)
      .map(m => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase())
      .slice(0, 4);
  })();

  /* ---------- Kørekort ----------
     Over 125 cm³ uden oplyst effekt kan kategorien ikke udledes: A2 har
     ingen slagvolumengrænse, så maskinen kan være både A2 og A.
     koerekortForListing() svarer derfor null — at gætte på A2 kunne få en
     20-årig til at tro, at han lovligt måtte køre en 1200-kubiks maskine.

     Men null må ikke blive til et tomt felt her. På detaljesiden har vi
     plads til at sige, hvad vi så faktisk ved: at A1 er udelukket, og at
     køberen skal spørge kilden om resten. Derfor kommer det uvisse tilfælde
     før tomhedstjekket — ellers forsvandt netop den forklaring, der er
     grunden til at vi ikke gætter. */
  const erNy = (typeof eksternErNy === 'function') ? eksternErNy(listing) : null;

  /* "GARANTI FREM FOR REKLAMATIONSRET" GJALDT FOR FABRIKSNY — IKKE FOR PRIVAT.
     Sætningen stod her uden at spørge, hvem sælgeren var: enhver annonce med
     erNy === true fik "Du køber med garanti frem for forbrugerkøbelovens
     reklamationsret", uanset om aftalen (`FORHANDLERAFTALER`) sagde
     markedsplads eller forhandler. Runde 3-kritikeren fandt den på 6 af 16
     stikprøvede Gul og Gratis-annoncer (≈37 %, fx `328dc95d…`, Royal Enfield
     Classic 650, Terndrup) — og Gul og Gratis er en markedsplads for
     PRIVATPERSONER. Mellem to private findes hverken reklamationsret eller
     en lovbestemt garanti, uanset hvor ny motorcyklen er; skellet ligger i
     SÆLGERTYPEN, ikke i om varen er fabriksny. Den samme kritiker fandt
     forhandlerens sætning (MC Syd, 10/10) korrekt.
     Garanti-linjen kræver derfor nu BÅDE erNy===true OG listing.isDealer
     (og respekterer VIS_REKLAMATIONSRET, samme kill switch som
     sellerTypeNoteHTML(true) nedenfor bruger, fordi det er samme juridiske
     påstand om samme tredjepart). Er sælgeren privat, forklarer teksten i
     stedet at motorcyklen er fabriksny AF DEN GRUND km ikke er oplyst, og
     henviser til privatsalgs-noten længere nede — den var før slet ikke
     med for eksterne annoncer (se noten ved sellerTypeNoteHTML nedenfor). */
  /* Noten siger kun "kilometerstanden er ikke oplyst", når den faktisk ikke er det (w3-data). */
  const kmIkkeOplyst = listing.km == null;
  /* "Katalog over nye motorcykler" er kun sandt for en forhandlers katalogsti (MC Syds /Ny/). En privat
     annonce er ikke et katalog: der siger noten kun, hvad kilden selv markerer. */
  const iKatalog = /\/ny\//i.test(String(listing.externalUrl || ''));
  const nyKilde = iKatalog
    ? `Annoncen ligger i ${kilde}s katalog over nye motorcykler, ikke blandt de brugte${kmIkkeOplyst ? ', og kilometerstanden er derfor ikke oplyst' : ''}.`
    : `Kilden markerer annoncen som ny${kmIkkeOplyst ? '' : ', og kilometertallet passer til det'}.`;
  const fabriksnyNote = erNy === true
    ? (listing.isDealer
        ? `<b>Det her er en fabriksny motorcykel.</b> Annoncen ligger i ${kilde}s katalog `
          + `over nye motorcykler, ikke blandt de brugte.`
          + (kmIkkeOplyst
              ? `${VIS_REKLAMATIONSRET ? ' Du køber med garanti frem for forbrugerkøbelovens reklamationsret,' : ','}`
                + ` og kilometerstanden er derfor ikke oplyst.`
              : (VIS_REKLAMATIONSRET ? ' Du køber med garanti frem for forbrugerkøbelovens reklamationsret.' : ''))
        : listing.saelgertype === 'privat'
          ? `<b>Kilden markerer den som ny.</b> ${nyKilde} `
            + `Sælgeren er privat — reklamationsret gælder ikke mellem private, `
            + `heller ikke når motorcyklen er ny (se nedenfor).`
          /* Runde 7 (D7-A1): saelgertypen er ikke oplyst af kilden — ingen paastand
             om reklamationsret den ene eller anden vej. */
          : `<b>Kilden markerer den som ny.</b> ${nyKilde} `
            + `Spørg sælgeren om garanti- og reklamationsvilkår (se nedenfor).`)
    : null;

  const hk  = hkEllerNull(listing.power);
  const ccm = Number(listing.ccm) || 0;
  const kkM = koerekortMaerkat(listing);   // ét sted for hele sitet, se js/components.js
  const kk  = kkM.kode;
  const kkUvis = !kk && ccm > A1_MAX_CCM;
  /* ---------- Fakta om motorcyklen ----------
     Grundfelterne står altid (med "Ikke oplyst", når kilden ikke har dem);
     resten kun, når kilden har oplyst dem. Kørekort står som vurdering, ikke
     som løfte — se koerekortMaerkat() i js/components.js. */
  const IO = 'Ikke oplyst';
  const faktaRader = [
    [Icon.bike, 'Mærke', listing.brand && listing.brand !== 'Ukendt' ? brand : IO],
    [Icon.info, 'Model', model || IO],
    [Icon.calendar, 'Årgang', listing.year != null ? String(listing.year) : IO],
    [Icon.gauge, 'Kilometer', listing.km != null ? formatKm(listing.km) : IO],
    [Icon.bike, 'Type', listing.type ? escapeHTML(typeLabel(listing.type)) : IO],
    [Icon.engine, 'Motorstørrelse', ccm > 0 ? formatCcm(ccm) : IO],
    [AN_IKON.bolt, 'Ydelse', hk ? formatPower(hk) : IO],
    [Icon.shieldCheck, 'Kørekort', kk ? escapeHTML(kkM.tekst) : (kkUvis ? 'A2 eller A — kan ikke afgøres' : 'Kan ikke afgøres')],
    erNy === true ? [Icon.checkCircle, 'Stand', 'Fabriksny'] : (erNy === false ? [Icon.checkCircle, 'Stand', 'Brugt'] : null),
    salgsmarkoerer.length ? [AN_IKON.tag, 'Salgsvilkår', salgsmarkoerer.map(escapeHTML).join(' · ')] : null,
    listing.isDealer ? [Icon.store, 'Sælger', `Forhandler · ${kilde}`] : (listing.saelgertype === 'privat' ? [Icon.user, 'Sælger', 'Privat sælger'] : null),
    stedTekst ? [Icon.mapPin, 'Sted', escapeHTML(stedTekst)] : null,
    /* Kun korte id'er (MC Syds "137963") er noget, en køber kan citere i
       telefonen; et uuid ombrød til flere linjer på mobil. */
    listing.sourceListingId && String(listing.sourceListingId).length <= 12 ? [AN_IKON.doc, `Annonce-id hos ${kilde}`, escapeHTML(listing.sourceListingId)] : null,
  ];

  /* Datoen er den dag, VI fandt annoncen — ikke den dag, den blev oprettet
     hos kilden. Etiketten siger derfor præcis det, og ikke "Oprettet".

     Formateringen lå før her som sin egen lille funktion med month:'long' og
     skrev "16. august 2026", mens vores egne annoncer skrev "16. aug. 2026" —
     to skrivemåder for samme dato på samme sidetype. datoKort() er det ene
     sted, begge går igennem nu. */
  const fundet = datoKort(listing.indekseretFoerste);
  /* Runde 6 (D6-A2): "Hentet 16. aug. — for 7 dage siden". Alderen er
     regnet af indekseretFoerste (hvornaar VI saa den foerste gang — ikke
     annoncens alder hos kilden, og det staar der heller ikke). */
  /* Runde 7 (D7-A3): to tal, begge sande — hvornaar VI saa annoncen foerste
     gang (foerst_set), og hvornaar den sidst stod aktiv hos kilden
     (sidst_set). Foer stod kun den foerste, og "for 7 dage siden" laestes som
     oplysningernes alder, mens de (typisk) var bekraeftet i gaar. */
  const relativ = (iso) => {
    const t = iso ? new Date(iso).getTime() : NaN;
    if (Number.isNaN(t)) return '';
    const dage = Math.max(0, Math.floor((Date.now() - t) / 86400000));
    return dage === 0 ? 'i dag' : dage === 1 ? 'i går' : `for ${dage} dage siden`;
  };
  let hentetLinje = '';
  if (fundet){
    const bekraeftet = listing.sidstSet ? relativ(listing.sidstSet) : '';
    hentetLinje = `Set hos ${kilde} første gang ${escapeHTML(fundet)}`
      + (bekraeftet ? ` · sidst bekræftet ${bekraeftet}` : ` — ${relativ(listing.indekseretFoerste)}`);
  }

  const saelgerTypeTekst = listing.isDealer ? 'Forhandler' : (listing.saelgertype === 'privat' ? 'Privat sælger' : '');
  const prisTekst = listing.price == null ? '' : formatPrice(listing.price);

  const saelgerKort = `
      <section class="an-card an-seller" aria-labelledby="kilde-titel">
        <div class="an-seller-head">
          <span class="an-avatar">${Icon.store}</span>
          <div>
            <h2 id="kilde-titel" class="an-seller-name">${kilde}</h2>
            ${domaene ? `<p class="an-seller-sub">${domaene}</p>` : ''}
            ${saelgerTypeTekst ? `<span class="an-chip an-chip-soft">${saelgerTypeTekst}</span>` : ''}
          </div>
        </div>
        ${stedTekst ? `<p class="an-seller-loc">${Icon.mapPin}<span>${escapeHTML(stedTekst)}</span></p>` : ''}
        ${href
          ? `<a href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer nofollow"
                data-listing-id="${escapeHTML(String(listing.id))}"
                class="btn btn-primary btn-block an-cta">Gå til annoncen hos&nbsp;<span class="an-nb">${kilde}</span>${Icon.externalLink}</a>`
          : `<p class="external-detail-broken">${Icon.alertTriangle}Annoncen kan ikke åbnes lige nu. Prøv igen senere${domaene ? `, eller find den på ${domaene}` : ''}.</p>`}
        ${hentetLinje ? `<p class="an-meta">${Icon.clock}<span>${hentetLinje}</span></p>` : ''}
        ${(listing.ogsaaHos || []).length ? `<p class="an-meta">${Icon.externalLink}<span>Samme annonce ligger også hos ${listing.ogsaaHos.map(o => o.url ? `<a href="${escapeHTML(o.url)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHTML(o.navn || o.domaene || 'en anden kilde')}</a>` : escapeHTML(o.navn || o.domaene || 'en anden kilde')).join(' og ')} — vi viser den én gang.</span></p>` : ''}
        <p class="an-seller-body">${hvorStaarDen}${hvemHandlerDuMed}</p>
        <p class="an-meta">${Icon.info}<span>${kilde}s kontaktoplysninger og åbningstider står på deres egen side.</span></p>
        <button type="button" class="an-report" id="report-listing-btn">${Icon.flag}Meld fejl i annoncen</button>
      </section>`;

  /* Eksterne annoncer har ingen tekst hos os (CLAUDE.md regel 2): kun et
     evt. kort uddrag. Uden uddrag siger blokken ærligt, hvor teksten står. */
  const beskrivelseHTML = listing.description
    ? `<section class="an-desc-sec">
         <h2>Beskrivelse</h2>
         <blockquote class="an-quote">${escapeHTML(String(listing.description).slice(0, 200))}${String(listing.description).length > 200 ? '…' : ''}</blockquote>
         <p class="an-note">Begyndelsen af ${kilde}s egen tekst. Resten står i deres annonce.</p>
       </section>`
    : `<section class="an-desc-sec">
         <h2>Beskrivelse og flere billeder</h2>
         <p>Beskrivelse, udstyr og flere billeder står i annoncen hos ${kilde}. Vi gemmer ikke kildens tekst eller billeder — vi viser de oplyste nøgletal og sender dig videre.</p>
         <p>Pris og oplysninger kan være ændret, siden vi hentede annoncen. Tjek dem hos ${kilde}, før du kører derhen.</p>
       </section>`;

  /* Tre grene — kildens svar, ikke vores gæt (se sellerTypeNoteHTML). */
  const saelgerNote = listing.isDealer
    ? (VIS_REKLAMATIONSRET ? sellerTypeNoteHTML(true) : '')
    : (listing.saelgertype === 'privat' ? sellerTypeNoteHTML(false) : sellerTypeNoteHTML(null));

  const chips = anChips([
    erNy === true ? 'Ny motorcykel' : (erNy === false ? 'Brugt motorcykel' : ''),
    variant,
    kk ? kkM.tekst : '',
  ]);
  const delVaerdier = [listing.year != null ? String(listing.year) : '', listing.km != null ? formatKm(listing.km) : '', variant].filter(Boolean);

  const fotoHTMLext = foto
    ? `<figure class="an-photo">
         <img src="${escapeHTML(foto)}" alt="${brand} ${model}" loading="eager" decoding="async">
         <figcaption>${Icon.info}<span>Foto: ${kilde} — flere billeder i deres annonce</span></figcaption>
       </figure>`
    /* Kilden har ikke sat et foto på annoncen. Vi tegner ingenting og lover
       ikke, at der er billeder andetsteds. */
    : `<div class="an-photo-tom">${Icon.camera}
         <p><b>${kilde} har ikke sat et foto på den her annonce.</b></p>
         <p>Vi viser det foto, kilden selv lægger på annoncen, og her er der ingen. Bed ${kilde} om billeder, før du kører efter den.</p>
       </div>`;

  document.getElementById('listing-detail').innerHTML = `
    <div class="an-grid">
      <div class="an-col an-col-a">
      <div class="an-gallery">${fotoHTMLext}</div>

      ${anFakta(faktaRader)}

      </div>
      <div class="an-col an-col-b">
      <section class="an-head" aria-label="Om motorcyklen">
        <div class="an-chips">${chips}</div>
        <div id="an-h1-slot"></div>
        ${delVaerdier.length ? `<p class="an-sub">${delVaerdier.map(v => `<span>${escapeHTML(v)}</span>`).join('')}</p>` : ''}
        <div class="an-price-block">
          ${listing.price == null
            ? `<p class="an-price is-tom">Ikke oplyst — spørg ${kilde}</p>`
            : `<p class="an-price">${formatPrice(listing.price)}<span class="an-price-label">hos ${kilde}</span></p>`}
          ${salgsmarkoerer.length ? `
          <p class="an-vilkaar">${salgsmarkoerer.map(m => `<span class="an-chip an-chip-soft">${escapeHTML(m)}</span>`).join('')}</p>
          <p class="an-note">Salgsvilkår oplyst i annoncen hos ${kilde} — de er en del af prisen. Få dem bekræftet dér.</p>` : ''}
        </div>
        ${anNoegletal(listing, hk)}
        ${fabriksnyNote ? `<p class="an-note an-ny">${Icon.info}<span>${fabriksnyNote}</span></p>` : ''}
      </section>

      <div class="an-desc">
        ${beskrivelseHTML}
        ${saelgerNote}
      </div>

      </div>
      <div class="an-side">
        <div class="an-seller-wrap">${saelgerKort}</div>
        <div class="an-trygt-wrap">${anTrygtKort(true, kilde)}</div>
      </div>
      ${anKoerekortKort(listing, kkM, kkUvis)}
      ${anTjekKort()}
    </div>`;

  anFlytH1(fuldTitel);
  anAktioner(listing, false);
  anVirkDel(listing);
  anFyldLignende(listing);
  anFyldVidere(listing, kk);
  anEksternBjaelke(href, listing, kilde, prisTekst);


  /* Alt, der peger på en sælger, fjernes fra DOM'en frem for bare at blive
     skjult. En skjult knap er stadig en knap: den kan tabbes til, den kan
     klikkes af en skærmlæser, og den næste, der kobler en handler på
     #bar-contact, opdager ikke at den ikke burde findes her.

     Kontaktbjælken står statisk i annonce.html og ligger UDEN for
     #listing-detail, så den overlevede den første udgave af den her funktion
     og stod tilbage med "Skriv til sælger" på en annonce uden sælger. */
  document.getElementById('contact-modal')?.remove();
  document.getElementById('listing-actionbar')?.remove();
  // Runde 5 (D5-A4): del + meld fejl — samme adfærd som på egne annoncer.
  document.getElementById('report-listing-btn')?.addEventListener('click', () => {
    openReportModal('listing', fuldTitel, listing.id);
  });
}

/* O3-6: kvitteringsbanner efter udgivelse — kun paa egen annonce, kun med
   ?udgivet=1, og lukbart. Siger dét, saelgeren skal vide i det oejeblik:
   hvor tallene kommer til at staa. */
function visUdgivetBanner(listing){
  if (new URLSearchParams(window.location.search).get('udgivet') !== '1') return;
  if (!isOwnListing(listing)) return;
  const mount = document.getElementById('listing-detail');
  if (!mount || document.getElementById('udgivet-banner')) return;
  const el = document.createElement('div');
  el.className = 'udgivet-banner';
  el.id = 'udgivet-banner';
  el.innerHTML = `${Icon.checkCircle}<span><b>Annoncen er udgivet.</b> Følg visninger og henvendelser under <a href="mine-annoncer.html">Mine annoncer</a>.</span><button type="button" class="icon-btn" aria-label="Luk">${Icon.close}</button>`;
  el.querySelector('button').addEventListener('click', () => el.remove());
  mount.prepend(el);
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
  // C3: view_item for begge slags annoncer — målt FØR grenen, én gang.
  if (typeof Maaling !== 'undefined') Maaling.visAnnonce(listing);

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
  // C2: visningen taelles via Edge Function haendelse (service_role), saa
  // record_listing_event's 'ikke saelgerens egne visninger'-regel (auth.uid())
  // kan ikke laengere ses derinde — derfor springes egne annoncer over HER.
  if (!(typeof isOwnListing === 'function' && isOwnListing(listing))) tælVisning(listing.id);
  // Én h1 pr. side: den statiske i markup opdateres, så også crawlere
  // uden JavaScript ser en overskrift.
  const h1 = document.getElementById('listing-h1');
  if (h1){ h1.textContent = `${listing.brand} ${listing.model}`; }
  anBrodkrumme(listing);
  anSeoBrodkrumme(listing);

  const fav = Store.isFavorite(listing.id);
  const loggedIn = !!Store.getUser();
  const brand = escapeHTML(listing.brand), model = escapeHTML(listing.model);
  /* Kørekortmærkatet kommer fra koerekortMaerkat() i js/components.js — det
     ene sted på sitet, hvor mærkatet bliver til, og det samme svar som
     Kørekort-filteret giver. Før stod der `koerekortForListing()` her, i
     js/components.js og i js/search.js, hver med sin egen indpakning: det
     var netop tre indpakninger om den samme regel, der lod kortet sige
     "Kørekort mindst A2" om annoncer, filteret sorterede fra. */
  const kkM = (typeof koerekortMaerkat === 'function')
    ? koerekortMaerkat(listing)
    : { kode: null, tekst: 'Kørekort ukendt', forklaring: '' };
  const kk = kkM.kode;
  // Number(undefined) er NaN, ikke null — og NaN sluppet igennem blev til
  // "NaN ★" i sælgerkortet. Falder tilbage på null, som betyder "ingen".
  const raaRating = Number(listing.seller.rating);
  const avgRating = Store.getAverageRating(listing.seller.name, Number.isFinite(raaRating) ? raaRating : null);
  const reviewCount = Store.getReviews(listing.seller.name).length;
  const telefon = String(listing.seller.phone || '').trim();
  /* O3-1b: for databaseannoncer ligger nummeret ALDRIG i payloaden
     (public_profiles udstiller det ikke). Om det findes og maa vises, ved kun
     RPC'en hent_saelger_telefon — saa knappen tegnes, og svaret hentes ved
     klik. For demoannoncer er `telefon` stadig vaerdien i objektet. */
  const telefonMulig = !telefon && isUuid(String(listing.id)) && typeof db !== 'undefined' && db.enabled;
  const suspicious = isSuspiciouslyCheap(listing);
  // "Er annoncen fra i år, eller har den ligget her siden 2023?" Bilbasen
  // svarer slet ikke på det på annoncesiden. Vi har datoen — den skal stå,
  // hvor prisen og stedet står, ikke kun på kortet i søgeresultatet.
  const oprettet = datoKort(listing.createdAt);

  /* ---------- Galleriet, eller sandheden om at der ikke er noget ----------

     Tre tilstande, og hver af dem viser kun det, annoncen kan bakke op:
       flere fotos → karrusel med tæller, pile og miniaturer
       ét foto     → billedet alene. En tæller der siger "1 / 1" og en pil,
                     der fører tilbage til det samme billede, foregiver et
                     galleri, der ikke findes.
       nul fotos   → ét felt, der siger det. Ingen tæller, ingen pile, ingen
                     miniaturer — ikke skjulte, men fjernet: en skjult pil
                     kan stadig tabbes til og læses op.

     Formen på det tomme felt er den samme som .external-detail-photo-tom
     længere nede i den her fil (kildeannoncen uden foto): kameraikon,
     stiplet kant, lav kasse. Med vilje samme udtryk — ikke et tredje. */
  const fotoAntal = currentPhotos.length;

  /* Tre tilstande, og hver af dem viser kun det, annoncen kan bakke op:
       flere fotos → stort foto med tæller, pile og en miniaturerække
                     (maks. fem + "+N", så rækken aldrig vokser ud af siden)
       ét foto     → billedet alene, uden tæller og pile
       nul fotos   → ét felt, der siger det. Ingen tegning i stedet. */
  const synligeThumbs = fotoAntal > 6 ? 5 : fotoAntal;
  const galleriHTML = fotoAntal ? `
      <div class="gallery">
        <div class="gallery-main">
          <div id="gallery-main-img"></div>
          ${fotoAntal > 1 ? `
          <div class="gallery-counter" id="gallery-counter"></div>
          <button type="button" class="gallery-nav prev" aria-label="Forrige billede">${Icon.chevronLeft}</button>
          <button type="button" class="gallery-nav next" aria-label="Næste billede">${Icon.chevronRight}</button>` : ''}
        </div>
        ${fotoAntal > 1 ? `<div class="gallery-thumbs">
          ${currentPhotos.slice(0, synligeThumbs).map((_, i) => `<button type="button" aria-label="Billede ${i+1} af ${fotoAntal}" data-thumb="${i}">${fotoHTML(i, { thumb:true })}</button>`).join('')}
          ${fotoAntal > 6 ? `<button type="button" class="gallery-more" aria-label="Flere billeder: vis billede 6 af ${fotoAntal}" data-thumb="5" data-more="1">${fotoHTML(5, { thumb:true })}<span>+${fotoAntal - 5}</span></button>` : ''}
        </div>` : ''}
      </div>` : `
      <div class="gallery-tom">
        ${Icon.camera}
        <p class="gallery-tom-titel">Ingen fotos i denne annonce</p>
        <p class="gallery-tom-tekst">Sælgeren har ikke lagt billeder op. Vi viser ikke en tegning i stedet —
          bed sælgeren om fotos af netop den her motorcykel, før du kører efter den.</p>
      </div>`;

  const IO = 'Ikke oplyst';
  const ejere = Number(listing.antalEjere) || 0;
  const hkEgen = hkEllerNull(listing.power);
  const standTekst = listing.condition
    ? (/^(brugt|ny)$/i.test(String(listing.condition).trim()) ? `${String(listing.condition).trim()} motorcykel` : String(listing.condition))
    : '';
  const chips = anChips([
    standTekst,
    listing.type ? typeLabel(listing.type) : '',
    kk ? kkM.tekst : '',
    ejere ? `${ejere} ${ejere === 1 ? 'ejer' : 'ejere'}` : '',
  ]) + (isOwnListing(listing)
    ? `<a class="own-listing-tag" href="opret-annonce.html?rediger=${encodeURIComponent(listing.id)}">${Icon.edit}Din annonce</a>` : '');
  const delVaerdier = [listing.year != null ? String(listing.year) : '', listing.km != null ? formatKm(listing.km) : '', listing.type ? typeLabel(listing.type) : ''].filter(Boolean);

  const faktaRader = [
    [Icon.bike, 'Mærke', listing.brand ? brand : IO],
    [Icon.info, 'Model', listing.model ? model : IO],
    [Icon.calendar, 'Årgang', listing.year != null ? String(listing.year) : IO],
    [Icon.gauge, 'Kilometer', listing.km != null ? formatKm(listing.km) : IO],
    [Icon.bike, 'Type', listing.type ? escapeHTML(typeLabel(listing.type)) : IO],
    [Icon.engine, 'Motorstørrelse', Number(listing.ccm) > 0 ? formatCcm(listing.ccm) : IO],
    [AN_IKON.bolt, 'Ydelse', hkEgen ? formatPower(hkEgen) : IO],
    [Icon.shieldCheck, 'Kørekort', kk ? escapeHTML(kkM.tekst) : 'Kan ikke afgøres'],
    listing.condition ? [Icon.checkCircle, 'Stand', escapeHTML(listing.condition)] : null,
    [AN_IKON.plate, 'Registrering', listing.registration ? escapeHTML(listing.registration) : IO],
    [Icon.lock, 'Afgift', escapeHTML(listing.afgift || IO)],
    listing.fuel ? [AN_IKON.fuel, 'Brændstof', escapeHTML(listing.fuel)] : null,
    listing.drive ? [AN_IKON.cog, 'Træktype', escapeHTML(listing.drive)] : null,
    listing.cylinders ? [Icon.engine, 'Cylindre', String(Number(listing.cylinders))] : null,
    listing.color ? [AN_IKON.palette, 'Farve', escapeHTML(listing.color)] : null,
    listing.serviceHistorik ? [AN_IKON.wrench, 'Servicehistorik', escapeHTML(listing.serviceHistorik)] : null,
    ejere ? [AN_IKON.users, 'Antal ejere', String(ejere)] : null,
    listing.sidsteSyn ? [Icon.checkCircle, 'Sidste syn', String(Number(listing.sidsteSyn))] : null,
    listing.daekAar ? [Icon.gauge, 'Dæk skiftet', String(Number(listing.daekAar))] : null,
    listing.vinterklar ? [AN_IKON.snow, 'Vinterklargjort', 'Ja'] : null,
  ];

  /* ✓-listen under beskrivelsen: kun det, sælgeren faktisk har oplyst. */
  const punkterOK = [
    listing.serviceHistorik === 'Fuld' ? 'Fuld servicehistorik' : '',
    ejere === 1 ? '1 ejer' : '',
    listing.vinterklar ? 'Vinterklargjort' : '',
    ...(listing.equipment || []).map(e => equipmentLabel(e)),
  ].filter(Boolean);

  const beskrivelseHTML = `
      <section class="an-desc-sec">
        <h2>Beskrivelse</h2>
        ${listing.description ? `<p class="desc an-clamp" id="an-desc-tekst">${escapeHTML(listing.description)}</p><button type="button" class="an-link an-mere" id="an-desc-mere" hidden aria-expanded="false">Vis hele beskrivelsen</button>` : `<p class="desc an-na">Sælgeren har ikke skrevet en beskrivelse.</p>`}
        ${punkterOK.length ? `<ul class="an-ok">${punkterOK.map(p => `<li>${Icon.check}<span>${escapeHTML(p)}</span></li>`).join('')}</ul>` : ''}
      </section>`;

  document.getElementById('listing-detail').innerHTML = `
    <div class="an-grid">
      <div class="an-col an-col-a">
      <div class="an-gallery">${galleriHTML}</div>

      ${anFakta(faktaRader)}

      </div>
      <div class="an-col an-col-b">
      <section class="an-head" aria-label="Om motorcyklen">
        <div class="an-chips">${chips}</div>
        <div id="an-h1-slot"></div>
        ${delVaerdier.length ? `<p class="an-sub">${delVaerdier.map(v => `<span>${escapeHTML(v)}</span>`).join('')}</p>` : ''}
        <div class="an-price-block">
          <p class="an-price">${formatPrice(listing.price)}</p>
        </div>
        <div class="an-loc">
          <span>${Icon.mapPin}${escapeHTML(listing.city)}, ${escapeHTML(listing.postnr)} · ${escapeHTML(listing.region)}</span>
          ${oprettet ? `<span>${Icon.clock}Oprettet ${escapeHTML(oprettet)} · ${escapeHTML(timeAgoDa(listing.createdAt))}</span>` : ''}
        </div>
        ${anNoegletal(listing, hkEgen)}
      </section>

      <div class="an-desc">
        ${suspicious ? `<div class="safety-banner an-advarsel">${Icon.alertTriangle}<span>Prisen er væsentligt under markedsniveau for denne type — vær ekstra opmærksom, og følg altid vores sikkerhedsråd.</span></div>` : ''}
        ${beskrivelseHTML}
        ${sellerTypeNoteHTML(listing.isDealer)}
      </div>

      </div>
      <div class="an-side">
        <div class="an-seller-wrap">
          ${saelgerKortHTML(listing, { loggedIn, avgRating, reviewCount, telefon, telefonMulig })}
          <button type="button" class="an-report" id="report-listing-btn">${Icon.flag}Anmeld annonce</button>
        </div>
        <div class="an-trygt-wrap">${anTrygtKort(false)}</div>
      </div>
      ${anKoerekortKort(listing, kkM, false)}
      ${anTjekKort()}
    </div>
  `;

  /* Lange beskrivelser klippes til 12 linjer med en knap, så midterkolonnen
     ikke bliver meget længere end de andre. Knappen findes kun, når teksten
     faktisk er klippet. */
  const dTekst = document.getElementById('an-desc-tekst'), dMere = document.getElementById('an-desc-mere');
  if (dTekst && dMere && dTekst.scrollHeight > dTekst.clientHeight + 2){
    dMere.hidden = false;
    dMere.addEventListener('click', () => {
      const aaben = dTekst.classList.toggle('an-clamp') === false;
      dMere.textContent = aaben ? 'Vis mindre' : 'Vis hele beskrivelsen';
      dMere.setAttribute('aria-expanded', String(aaben));
    });
  }
  anFlytH1(`${listing.brand} ${listing.model}`);
  anAktioner(listing, isOwnListing(listing));
  anVirkDel(listing);
  anFyldVidere(listing, kk);

  /* Galleriets knapper findes kun, når der ER mere end ét foto — og
     gallery-main-img findes kun, når der er mindst ét. `?.` frem for et
     hop over hele blokken, så rækkefølgen står ét sted. */
  document.querySelector('.gallery-nav.prev')?.addEventListener('click', () => shiftPhoto(-1));
  document.querySelector('.gallery-nav.next')?.addEventListener('click', () => shiftPhoto(1));
  document.querySelectorAll('.gallery-thumbs [data-thumb]').forEach(btn => {
    btn.addEventListener('click', () => { currentPhotoIndex = Number(btn.dataset.thumb); renderGallery(); });
  });
  renderGallery();

  wireFavoriteButtons(document);
  visUdgivetBanner(listing);   // O3-6: kvittering paa EGEN annonce efter Udgiv

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

    /* "Ring op" må kun stå der, når der ER et nummer at ringe til.
       spring() sender til login, når målknappen mangler — rigtigt for en
       udlogget bruger, men for en indlogget uden sælgertelefon betød det, at
       et tryk på "Ring op" smed ham ud på login-siden fra en side, han
       allerede var logget ind på. Nu forsvinder knappen i stedet, og
       "Skriv til sælger" fylder bjælken alene.
       Bemærk: [hidden] alene er ikke nok — .btn sætter display, og en
       klasseregel slår browserens hidden-regel. Se .listing-actionbar
       [hidden] i css/styles.css. */
    const barPhone = document.getElementById('bar-phone');
    if (barPhone){
      if (loggedIn && !telefon && !telefonMulig){
        barPhone.hidden = true;
      } else {
        barPhone.addEventListener('click', () => spring('reveal-phone-btn', true));
      }
    }
  }

  // Kontaktknapperne findes kun i markup'en, når man er logget ind — al
  // wiring nedenfor forudsætter derfor login.
  if (loggedIn){
    /* Knappen bygges kun, når telefon er sat (se saelgerKortHTML), så den kan
       mangle her. Uden ?-tjekket kastede wiringen en TypeError midt i
       opsætningen, og alt nedenfor — deling, betaling, kontaktformular —
       blev aldrig koblet på. */
    const revealBtn = document.getElementById('reveal-phone-btn');
    const visNummer = (nr) => {
      revealBtn.innerHTML = `${Icon.phone}<span class="phone-reveal">${escapeHTML(nr)}</span>`;
      revealBtn.disabled = true;
      // Tælles som en henvendelse i sælgerens dashboard.
      db.recordListingEvent?.(listing.id, 'contact');
    };
    revealBtn?.addEventListener('click', async () => {
      if (telefon){ visNummer(telefon); return; }
      /* O3-1b: svaret findes kun hos RPC'en. null betyder "vises ikke" —
         uanset om det er manglende samtykke eller manglende nummer, og det
         er med vilje: forskellen er saelgerens privatsag. */
      revealBtn.disabled = true;
      revealBtn.innerHTML = `${Icon.phone}Henter…`;
      const { data, error } = await db.hentSaelgerTelefon(listing.id);
      const nr = String(data || '').trim();
      if (!error && nr){ visNummer(nr); return; }
      const note = document.createElement('p');
      note.className = 'seller-locked-note';
      note.innerHTML = `${Icon.info}<span>Sælgeren viser ikke sit telefonnummer her. Skriv i stedet — så får du svaret på skrift.</span>`;
      revealBtn.replaceWith(note);
    });

    document.getElementById('open-payment-modal').addEventListener('click', () => {
      /* HER STOD DEN TJENESTE, VORES EGEN SIKKERHEDSSIDE KALDER ET
         SVINDELTEGN.

         Teksten tilbod "Bikerbasens sikker betaling: en ekstern,
         PCI-certificeret betalingspartner holder pengene". Den findes ikke.
         sikkerhed.html siger ordret: "Bikerbasen tilbyder i dag intet 'sikker
         betaling'- eller escrowflow ... Henviser en saelger til 'Bikerbasens
         sikre betaling' eller lignende, er det et advarselstegn: den tjeneste
         findes ikke."

         Det var altsaa ikke bare en opdigtet funktion — det var en, der
         gjorde koeberen MODTAGELIG for praecis det nummer, sitet advarer mod.
         En svindler kunne skrive "lad os bruge Bikerbasens sikre betaling",
         og koeberen ville have laest det paa annoncesiden selv.

         Modalen siger nu det samme som sikkerhed.html. Hvis der en dag
         kommer et escrowflow, skal BEGGE steder rettes samtidig. */
      openInfoModal('Sådan betaler I hinanden', `
        <p>Du betaler direkte til sælger — typisk via MobilePay eller bankoverførsel — når I mødes, og du har set motorcyklen og godkendt den.</p>
        <p><strong>Bikerbasen har ingen betalingsløsning og rører aldrig pengene.</strong> Henviser nogen til &ldquo;Bikerbasens sikre betaling&rdquo; eller et depositum via os, er det et advarselstegn: den tjeneste findes ikke.</p>
        <p style="margin-bottom:0;">Se <a href="sikkerhed.html">rådene om tryg handel</a>, før du kører af sted.</p>
      `);
    });

    const modal = document.getElementById('contact-modal');
    // Sælgers navn i titlen, så man kan se, hvem beskeden går til —
    // "Skriv til sælger" føles anonymt, når navnet står lige ved siden af.
    document.getElementById('contact-modal-title').textContent = `Skriv til ${listing.seller.name}`;
    /* Tilgængelig dialog: fokus ind ved åbning, tilbage til udløseren ved
       lukning, Escape lukker, Tab bliver inde i dialogen. Modalen bor i
       annonce.html og styres kun her, så løsningen er lokal. */
    let udloeser = null;
    const aabnKontakt = () => { udloeser = document.activeElement; modal.classList.add('open'); };
    const lukKontakt = () => modal.classList.remove('open');
    new MutationObserver(() => {
      if (modal.classList.contains('open')){
        modal.querySelector('[role="dialog"]') || modal.querySelector('.modal-box')?.setAttribute('role', 'dialog');
        modal.querySelector('.modal-box')?.setAttribute('aria-modal', 'true');
        modal.querySelector('.modal-box')?.setAttribute('aria-labelledby', 'contact-modal-title');
        const mal = modal.querySelector('#cf-message:not([hidden])') || modal.querySelector('#contact-receipt:not([hidden])') || modal.querySelector('.modal-box');
        if (mal) mal.focus();
      } else if (udloeser && document.contains(udloeser)){
        udloeser.focus(); udloeser = null;
      }
    }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('open')) return;
      if (e.key === 'Escape'){ e.preventDefault(); lukKontakt(); return; }
      if (e.key !== 'Tab') return;
      const fokus = [...modal.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled && el.offsetParent !== null);
      if (!fokus.length) return;
      const foerste = fokus[0], sidste = fokus[fokus.length - 1];
      if (e.shiftKey && (document.activeElement === foerste || !modal.contains(document.activeElement))){ e.preventDefault(); sidste.focus(); }
      else if (!e.shiftKey && document.activeElement === sidste){ e.preventDefault(); foerste.focus(); }
    });
    document.getElementById('open-contact-modal').addEventListener('click', aabnKontakt);
    modal.querySelectorAll('[data-modal-close]').forEach(el => el.addEventListener('click', lukKontakt));
    modal.addEventListener('click', (e) => { if (e.target === modal) lukKontakt(); });

    const besked = document.getElementById('cf-message');
    const taeller = document.getElementById('cf-counter');
    // Oplægget står som en konstant, fordi formularen nulstilles efter
    // afsendelse: uden den mødte man et tomt felt anden gang, man åbnede
    // modalen, og skulle selv finde på begyndelsen igen.
    const standardBesked = `Hej, jeg er interesseret i din ${listing.brand} ${listing.model} fra ${listing.year}. Er den stadig til salg?`;
    besked.value = standardBesked;
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

    /* ---------- Afsendelse og kvittering ----------
       Modalen skifter fra formular til kvittering i stedet for at lukke sig
       selv med en toast. To grunde:

       1. Toasten sagde "Din besked er sendt til sælgeren". Den blev ikke
          sendt nogen steder — der er ingen beskedtabel i basen (se
          supabase/). Det er den slags påstand, tillidskategorien straffer
          hårdest: køberen sidder og venter på et svar, der aldrig kan komme.
       2. En toast forsvinder efter et par sekunder. Det, der faktisk virker i
          dag — telefonnummeret — skal blive stående, til køberen har brugt
          det.

       Det, vi KAN bakke op, er tællingen: record_listing_event registrerer
       henvendelsen på annoncen, og det tal ser sælgeren i sit dashboard.
       Kvitteringen siger præcis så meget og ikke mere. */
    const kvittering = document.getElementById('contact-receipt');
    const formular = document.getElementById('contact-form');

    // Formularen skal tilbage, næste gang modalen åbnes — ellers møder man
    // sin egen kvittering fra sidste gang i stedet for et skrivefelt.
    const nulstilKontakt = () => {
      if (!kvittering || !formular) return;
      kvittering.hidden = true;
      formular.hidden = false;
    };
    modal.querySelectorAll('[data-modal-close]').forEach(el => el.addEventListener('click', nulstilKontakt));
    modal.addEventListener('click', (e) => { if (e.target === modal) nulstilKontakt(); });

    formular.addEventListener('submit', (e) => {
      e.preventDefault();

      /* Hensigterne blev før plukket ud og smidt væk igen (`void hensigter`).
         Så stod der tre afkrydsningsfelter, der ikke gjorde noget som helst —
         og når beskeden alligevel ikke leveres, var de rent teater.
         Nu gentages de i kvitteringen: køberen kan se, hvad han bad om, og
         har det med, når han ringer. Det er det eneste sted, de kan gøre
         gavn, før der findes en beskedlevering at sende dem med. */
      const hensigter = [...modal.querySelectorAll('.contact-intents input:checked')].map(cb => cb.value);
      // C3: generate_lead — kun at det skete, aldrig hvad der stod i beskeden.
      if (typeof Maaling !== 'undefined') Maaling.kontakt(currentListing);

      // Det ene, vi faktisk kan: tælle henvendelsen på annoncen.
      db.recordListingEvent?.(listing.id, 'contact');

      const krop = document.getElementById('contact-receipt-body');
      const handlinger = document.getElementById('contact-receipt-actions');

      if (krop){
        krop.textContent = telefon
          ? 'Sælgeren kan se antallet af henvendelser under Mine annoncer. Vi videresender ikke selve teksten endnu, så vil du have svar i dag, er telefonen den hurtigste vej.'
          : 'Sælgeren kan se antallet af henvendelser under Mine annoncer. Vi videresender ikke selve teksten endnu — gem annoncen, så du kan finde den igen.';
      }

      /* Det, køberen krydsede af, skrevet tilbage til ham. Listen bygges kun,
         når der ER krydset noget af — en tom overskrift ser i stykker ud. */
      const kvitHensigter = document.getElementById('contact-receipt-intents');
      if (kvitHensigter){
        kvitHensigter.innerHTML = hensigter.length
          ? `<p class="contact-receipt-intents-title">Du har bedt om:</p>
             <ul>${hensigter.map(h => `<li>${escapeHTML(h)}</li>`).join('')}</ul>`
          : '';
        kvitHensigter.hidden = !hensigter.length;
      }

      /* Telefonlinket er den vej, der virker. tel: fordi kvitteringen oftest
         læses på en telefon; på desktop er nummeret stadig læsbart som tekst. */
      if (handlinger){
        handlinger.innerHTML = telefon
          ? `<a href="tel:${escapeHTML(telefon.replace(/\s+/g, ''))}" class="btn btn-primary btn-block">${Icon.phone}Ring til sælger på ${escapeHTML(telefon)}</a>
             <button type="button" class="btn btn-outline btn-block" data-modal-close>Luk</button>`
          : `<button type="button" class="btn btn-primary btn-block" data-modal-close>Luk</button>`;
        handlinger.querySelectorAll('[data-modal-close]').forEach(el => el.addEventListener('click', () => {
          modal.classList.remove('open');
          nulstilKontakt();
        }));
      }

      if (kvittering){
        formular.hidden = true;
        kvittering.hidden = false;
        // Skærmlæseren skal have at vide, at der skete noget — modalen ser
        // ellers bare ud til at være blevet tom.
        kvittering.setAttribute('tabindex', '-1');
        kvittering.focus();
      } else {
        modal.classList.remove('open');
      }

      formular.reset();
      besked.value = standardBesked;
      opdaterTaeller();
    });
  }

  anFyldLignende(listing);
}

document.addEventListener('DOMContentLoaded', async () => {
  await backendReady();
  renderHeader(null);
  renderListing();
});
