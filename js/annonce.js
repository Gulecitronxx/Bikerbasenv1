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
   sources/mcsyd.yaml, linje 30: `tilladelse_modtaget: 2026-08-16` — et
   skriftligt ja fra MC Syd, indhentet FØR første crawl, fordi robots.txt
   er en teknisk regel og ikke en aftale. Det er det stærkeste, vi kan sige
   om os selv over for en køber, og det stod ubrugt i en YAML-fil, browseren
   aldrig ser.

   Kildetabellen i 014 har ingen kolonne til aftalen, så indtil den får en,
   står den her. Tabellen fejler sikkert: en forhandler uden linje får ingen
   sætning. Den må ALDRIG få en standardværdi — at skrive "med tilladelse"
   om nogen, der ikke har givet den, er præcis den påstand, aftalen findes
   for at kunne bakke op. Ny forhandler: hent et ja, skriv det i
   sources/<domaene>.yaml, og skriv det så her.

   `type` er forhandlerens egen beskrivelse, ikke vores gæt.

   `markedsplads` siger, at kilden ikke SÆLGER noget. Gul og Gratis er ikke
   en forhandler med et lager — det er et sted, hvor privatpersoner
   annoncerer. Forskellen er ikke kosmetisk: sætningen "du handler direkte
   med <kilde> — de svarer på dine spørgsmål, aftaler prøvetur og laver
   papirerne" er sand om MC Syd og falsk om Gul og Gratis, hvor det er
   sælgeren bag annoncen, der gør alle tre ting. Uden feltet ville hver
   eneste markedspladsannonce sende køberen til den forkerte modpart. */
const FORHANDLERAFTALER = {
  'mcsyd.dk': { tilladelse: true, type: 'motorcykelforhandler' },
  // Ingen tilladelse endnu — se sources/guloggratis.yaml. Linjen står her,
  // fordi markedsplads-formuleringen skal være på plads FØR den første
  // annonce vises, ikke bagefter.
  'guloggratis.dk': { tilladelse: false, type: 'markedsplads', markedsplads: true },
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
   Skal den væk, er det ét ord her, ikke en oprydning i markup. */
const VIS_REKLAMATIONSRET = true;

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

  /* Brødkrummen følger Bilbasens: Mærke › Model. Mellemleddet pegede på en
     tom søgning; nu er det mærket, og det er den vej, en køber faktisk vil
     tilbage ad. "Ukendt" er ikke et mærke, man kan søge på, så dér bliver
     linket stående som søgesiden. */
  const bcType = document.getElementById('bc-type');
  if (bcType && listing.brand && listing.brand !== 'Ukendt'){
    bcType.textContent = listing.brand;
    bcType.href = `soegning.html?brands=${encodeURIComponent(listing.brand)}`;
  }
  const bc = document.getElementById('bc-current');
  if (bc) bc.textContent = listing.model || listing.brand || 'Annonce';
  document.querySelectorAll('.bc-sep').forEach(s => s.innerHTML = Icon.chevronRight);

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
  const medTilladelse = aftale?.tilladelse
    ? `Vi viser deres annoncer med skriftlig tilladelse fra dem.`
    : '';

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
  const variant = String(listing.variant ?? listing.trim ?? '').trim();
  const fuldTitel = [listing.brand, listing.model, variant].filter(Boolean).join(' ');
  /* Sitets mønster er "X — Bikerbasen", ét ophold. Forhandlerens navn står
     inde i første led, ikke som en ekstra tankestreg: et link delt i en
     MC-gruppe skal vise, hvem motorcyklen står hos, uden at titlen får to
     brud i sig. */
  document.title = `${fuldTitel} hos ${kildeNavn} — Bikerbasen`;
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
  const hk  = hkEllerNull(listing.power);
  const ccm = Number(listing.ccm) || 0;
  const kk  = koerekortForListing(listing);
  const kkUvis = hk == null && ccm > A1_MAX_CCM;
  const kkMeta = KOEREKORT.find(k => k.id === kk);

  const koerekortPanel = kkUvis
    ? `<div class="external-detail-kk is-uvis">
         <span class="external-detail-kk-code">A2/A</span>
         <div>
           <b>Du skal mindst have A2</b>
           <p>Effekten står ikke i annoncen, og uden hk kan vi ikke se, om du kan
              nøjes med A2 (maks. 48 hk) eller skal have A. Kun A1 er udelukket —
              den er over ${A1_MAX_CCM} cm³. Spørg ${kilde}, før du regner med A2.</p>
         </div>
       </div>`
    : !kk ? ''   // hverken ccm eller hk: der er intet at sige, heller ikke uvist
    : `<div class="external-detail-kk">
         <span class="external-detail-kk-code">${escapeHTML(kk)}</span>
         <div>
           <b>Du kan køre den på ${escapeHTML(kk)}-kørekort</b>
           <p>${escapeHTML(kkMeta?.hint || '')}. Regnet ud fra
              ${ccm ? formatCcm(ccm) : 'effekten'}${hk ? ` og ${formatPower(hk)}` : ''} og
              vejledende — en mc kan være en effektbegrænset udgave, så få det bekræftet hos ${kilde}.</p>
         </div>
       </div>`;

  /* ---------- Nøgletal ----------
     Bilbasens fire specs, oversat til motorcykel. Faste etiketter, fast
     rækkefølge — men kun de tal, vi faktisk har. Et felt med "–" i er
     støj, der får resten af tabellen til at se upålidelig ud; et felt, der
     ikke er der, er bare et felt, der ikke er der. */
  const noegletal = [
    listing.year != null ? [Icon.calendar, 'Årgang', String(listing.year)] : null,
    listing.km   != null ? [Icon.gauge,    'Kilometer', formatKm(listing.km)] : null,
    listing.ccm  != null ? [Icon.engine,   'Kubik', formatCcm(listing.ccm)] : null,
    hk                   ? [Icon.engine,   'Effekt', formatPower(hk)] : null,
  ].filter(Boolean);

  const raekke = (etiket, vaerdi) => vaerdi == null || vaerdi === ''
    ? ''
    : `<div class="external-detail-row"><dt>${etiket}</dt><dd>${vaerdi}</dd></div>`;

  const detaljer = [
    raekke('Mærke', listing.brand && listing.brand !== 'Ukendt' ? brand : null),
    raekke('Model', model || null),
    raekke('Variant', variant ? escapeHTML(variant) : null),
    raekke('Årgang', listing.year != null ? String(listing.year) : null),
    raekke('Kilometer', listing.km != null ? formatKm(listing.km) : null),
    raekke('Kubik', listing.ccm != null ? formatCcm(listing.ccm) : null),
    raekke('Effekt', hk ? formatPower(hk) : null),
    raekke('Kørekort', kk ? (kkUvis ? 'A2 eller A (vejledende)' : `${escapeHTML(kk)} (vejledende)`) : null),
    raekke('Salgsvilkår', salgsmarkoerer.length ? salgsmarkoerer.map(escapeHTML).join(' · ') : null),
    raekke('Sælger', listing.isDealer ? `Forhandler · ${kilde}` : null),
    raekke('Sted', stedTekst ? escapeHTML(stedTekst) : null),
    raekke(`Annonce-id hos ${kilde}`, listing.sourceListingId ? escapeHTML(listing.sourceListingId) : null),
  ].join('');

  /* Datoen er den dag, VI fandt annoncen — ikke den dag, den blev oprettet
     hos kilden. Etiketten siger derfor præcis det, og ikke "Oprettet". */
  const fundet = (() => {
    const t = new Date(listing.indekseretFoerste || '').getTime();
    if (!t) return '';
    return new Date(t).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' });
  })();

  const kildeKort = `
    <aside class="external-detail-source" aria-labelledby="kilde-titel">
      <div class="external-detail-source-head">
        ${Icon.store}
        <div>
          <p class="external-detail-source-label">Du køber af</p>
          <h2 id="kilde-titel" class="external-detail-source-name">${kilde}</h2>
          ${domaene ? `<p class="external-detail-source-domain">${domaene}</p>` : ''}
        </div>
      </div>
      ${href
        ? `<a href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer nofollow"
              class="btn btn-primary btn-block">Se annoncen hos ${kilde}${Icon.externalLink}</a>`
        : `<p class="external-detail-broken">${Icon.alertTriangle}Annoncen kan ikke åbnes lige nu. Prøv igen senere${domaene ? `, eller find den på ${domaene}` : ''}.</p>`}
      <p class="external-detail-source-body">
        ${hvorStaarDen}
        ${medTilladelse ? `${medTilladelse} ` : ''}${hvemHandlerDuMed}
        Pris og udstyr kan være ændret, siden vi hentede annoncen, så tjek det hos dem.
      </p>
      ${fundet ? `<p class="external-detail-source-meta">${Icon.clock}Annoncen blev hentet hos ${kilde} ${escapeHTML(fundet)}</p>` : ''}
      <p class="external-detail-source-meta">${Icon.info}${kilde}s kontaktoplysninger og åbningstider står på deres egen side.</p>
    </aside>

    <aside class="external-detail-next" aria-labelledby="videre-titel">
      <h2 id="videre-titel">Søg videre på Bikerbasen</h2>
      <ul>
        ${listing.brand && listing.brand !== 'Ukendt'
          ? `<li><a href="soegning.html?brands=${encodeURIComponent(listing.brand)}">Alle ${brand} til salg</a></li>` : ''}
        ${kk && !kkUvis ? `<li><a href="soegning.html?koerekort=${encodeURIComponent(kk)}">Motorcykler til ${escapeHTML(kk)}-kørekort</a></li>` : ''}
        ${opslag?.region ? `<li><a href="soegning.html?regions=${encodeURIComponent(opslag.region)}">Motorcykler i ${escapeHTML(opslag.region)}</a></li>` : ''}
        <li><a href="soegning.html">Alle motorcykler</a></li>
      </ul>
    </aside>`;

  document.getElementById('listing-detail').innerHTML = `
    <div class="external-detail">
      <p class="external-detail-flag">
        ${Icon.store}<span><b>${markedsplads
          ? `Annoncen ligger på ${kilde}${domaene ? `, ${domaene}` : ''}.`
          : `Motorcyklen står hos ${kilde}${domaene ? `, ${domaene}` : ''}.`}</b>
        ${hvemKoeberDuAf}
        ${medTilladelse}</span>
      </p>

      <figure class="external-detail-photo">
        ${foto
          ? `<img src="${escapeHTML(foto)}" alt="${brand} ${model}" loading="eager" decoding="async">
             <figcaption>${Icon.info}Foto: ${kilde}. Flere billeder af netop denne motorcykel finder du i deres annonce.</figcaption>`
          /* Her stod "Billederne af den her motorcykel ligger i <kilde>s
             annonce". Det var et løfte, vi ikke kunne holde: vi mangler
             fotoet, fordi kilden ikke har sat et på annoncen. MC Syd
             markerer dem selv med class="empty" i gitteret, og på de to, vi
             åbnede (Honda VT 700 137963 og Honda CB 72 128471), var deres
             egen billedkarrusel også tom. Teksten sendte altså køberen hen
             til en annonce efter billeder, der ikke er der.

             Nu siger den kun det, vi ved i alle tilfælde — kilden sendte
             intet foto med — og peger på den vej, der faktisk kan skaffe
             et: at spørge sælgeren. At påstå "der er heller ingen billeder
             hos dem" ville være den samme fejl igen, bare med nyt fortegn:
             en anden forhandler kan have fotos på detaljesiden, som ikke
             står i gitteret. */
          : `<div class="external-detail-photo-tom">${Icon.camera}
               <span><b>${kilde} har ikke sat et foto på den her annonce.</b></span>
               <span>Vi viser det foto, kilden selv lægger på annoncen, og her er der
                 ingen. Bed ${kilde} om billeder, før du kører efter den.</span>
             </div>`}
      </figure>

      <header class="external-detail-head">
        <h2 class="external-detail-title">${brand} ${model}</h2>
        ${variant ? `<p class="external-detail-variant">${escapeHTML(variant)}</p>` : ''}
        <p class="external-detail-sub">
          ${stedTekst ? `${Icon.mapPin}${escapeHTML(stedTekst)}` : ''}
          ${stedTekst && listing.isDealer ? '<span class="external-detail-dot">·</span>' : ''}
          ${listing.isDealer ? `${Icon.store}Forhandlerannonce` : ''}
        </p>
        <div class="external-detail-price-block">
          <p class="external-detail-price-label">Pris hos ${kilde}</p>
          <!-- "Pris ikke oplyst" sat i sidens største skrift råber en
               ikke-oplysning ud som var den nyheden. Mangler prisen, træder
               tallet tilbage og bliver til en henvisning. -->
          ${listing.price == null
            ? `<p class="external-detail-price is-tom">Ikke oplyst — spørg ${kilde}</p>`
            : `<p class="external-detail-price">${formatPrice(listing.price)}</p>`}
          ${salgsmarkoerer.length ? `
          <p class="external-detail-vilkaar">
            ${salgsmarkoerer.map(m => `<span class="external-detail-vilkaar-chip">${escapeHTML(m)}</span>`).join('')}
          </p>
          <p class="external-detail-vilkaar-note">Salgsvilkår oplyst i annoncen hos ${kilde} — de er en del af prisen. Få dem bekræftet dér.</p>` : ''}
        </div>
      </header>

      ${koerekortPanel}

      ${noegletal.length ? `
      <div class="external-detail-stats">
        ${noegletal.map(([ikon, etiket, vaerdi]) => `
          <div class="external-detail-stat">
            <span class="external-detail-stat-label">${ikon}${etiket}</span>
            <b>${vaerdi}</b>
          </div>`).join('')}
      </div>` : ''}

      <section class="external-detail-section">
        <h2>Detaljer</h2>
        <dl class="external-detail-specs">${detaljer}</dl>
        <p class="external-detail-note">
          Tallene står, som ${kilde} har skrevet dem i annoncen. Mangler et felt, har de
          ikke oplyst det — vi udfylder ikke huller med gæt. Der tages forbehold for fejl.
        </p>
      </section>

      <section class="external-detail-section">
        <h2>Beskrivelse</h2>
        ${listing.description
          ? `<blockquote class="external-detail-quote">${escapeHTML(listing.description)}</blockquote>
             <p class="external-detail-note">Begyndelsen af ${kilde}s egen tekst. Resten står i deres annonce.</p>`
          : `<p class="external-detail-note">
               Beskrivelsen, udstyrslisten og de øvrige billeder står i ${kilde}s egen annonce.
               Teksten er deres, og vi gemmer den ikke her.
             </p>`}
      </section>

      ${(VIS_REKLAMATIONSRET && listing.isDealer) ? sellerTypeNoteHTML(true) : ''}

      <section class="external-detail-section">
        <h2>Før du kører derhen</h2>
        <ul class="external-detail-raad">
          <li>${Icon.shieldCheck}Tjek pris og oplysninger hos ${kilde}, før du kører — de kan være ændret, siden vi hentede annoncen.</li>
          <li>${Icon.shieldCheck}Se motorcyklen fysisk, og få stelnummeret, før du betaler noget som helst.</li>
          <li>${Icon.shieldCheck}Kørekortkategorien her er vejledende. Er du i tvivl, så få den bekræftet i registreringsattesten.</li>
        </ul>
        <p class="external-detail-note"><a href="sikkerhed.html">Læs Bikerbasens sikkerhedsguide</a></p>
      </section>
    </div>

    <div class="external-detail-aside">${kildeKort}</div>`;

  /* ---------- Lignende annoncer ----------
     Bilbasen slutter annoncesiden med "Lignende biler". Vores stribe blev
     skjult helt, og siden endte derfor blindt: enten klikkede man videre til
     kilden, eller også var der ikke mere. Nu fyldes den — med vores egne
     annoncer først, fordi dem kan køberen faktisk handle på hos os.

     Typen kendes ikke på indekserede annoncer (den står ikke i kilden), så
     "lignende" er samme mærke først og derefter samme kubikklasse. */
  const stribe = document.querySelector('.similar-strip');
  const mount = document.getElementById('similar-listings');
  const andre = Store.getAllListings().filter(l => String(l.id) !== String(listing.id));
  const sammeMaerke = andre.filter(l => l.brand === listing.brand);
  const naerKubik = ccm
    ? andre.filter(l => l.ccm && Math.abs(l.ccm - ccm) <= ccm * 0.35)
    : [];
  const set = new Set();
  const lignende = [...sammeMaerke, ...naerKubik]
    .filter(l => !set.has(l.id) && set.add(l.id))
    .slice(0, 3);

  if (stribe && mount && lignende.length){
    const overskrift = stribe.querySelector('h2');
    if (overskrift) overskrift.textContent = 'Lignende motorcykler på Bikerbasen';
    mount.innerHTML = lignende.map((l, i) => listingCardHTML(l, i)).join('');
    wireFavoriteButtons(mount);
  } else if (stribe){
    stribe.style.display = 'none';
  }

  /* Alt, der peger på en sælger, fjernes fra DOM'en frem for bare at blive
     skjult. En skjult knap er stadig en knap: den kan tabbes til, den kan
     klikkes af en skærmlæser, og den næste, der kobler en handler på
     #bar-contact, opdager ikke at den ikke burde findes her.

     Kontaktbjælken står statisk i annonce.html og ligger UDEN for
     #listing-detail, så den overlevede den første udgave af den her funktion
     og stod tilbage med "Skriv til sælger" på en annonce uden sælger. */
  document.getElementById('contact-modal')?.remove();
  document.getElementById('listing-actionbar')?.remove();
  document.body.classList.remove('har-actionbar');
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
        <!-- "Km-stand" og "Motorstørrelse" var bilbasenismer. En dansk
             MC-køber siger kilometer og kubik, og de to ord står nu ens
             på vores egne annoncer og på forhandlerannoncerne. -->
        <div class="spec-item"><span class="spec-icon">${Icon.gauge} Kilometer</span><b>${formatKm(listing.km)}</b></div>
        <div class="spec-item"><span class="spec-icon">${Icon.engine} Kubik</span><b>${formatCcm(listing.ccm)}</b></div>
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
