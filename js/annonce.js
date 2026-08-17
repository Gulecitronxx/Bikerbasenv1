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
  document.querySelectorAll('.gallery-thumbs button').forEach((b, i) => b.classList.toggle('active', i === currentPhotoIndex));
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
function saelgerKortHTML(listing, { loggedIn, avgRating, reviewCount, telefon }){
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
  const cvrLinje = (erForhandler && s.cvr)
    ? `<p class="seller-cvr">${Icon.info}<span>CVR oplyst af sælger: ${escapeHTML(s.cvr)} —
         <a href="https://datacvr.virk.dk/soegeresultater?fritekst=${encodeURIComponent(s.cvr)}"
            target="_blank" rel="noopener noreferrer">slå det op i CVR-registret</a></span></p>`
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
        <p class="seller-locked-note">${Icon.lock}<span>Kontaktoplysninger${erForhandler ? '' : ' og sælgerens navn'} er kun synlige for indloggede brugere. Det holder telefonnumre væk fra robotter og reklamehenvendelser.</span></p>
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
          ${telefon ? `<button type="button" class="btn btn-outline btn-block" id="reveal-phone-btn">${Icon.phone}Vis telefonnummer</button>` : ''}
          <button type="button" class="btn btn-outline btn-block" id="open-payment-modal">${Icon.lock}Betal sikkert (MobilePay)</button>
          <button type="button" class="btn btn-outline btn-block" id="share-listing-btn">${Icon.share}Del annonce</button>
        </div>
        ${telefon ? '' : `<p class="seller-locked-note">${Icon.info}<span>Sælgeren har ikke oplyst et telefonnummer. Skriv i stedet — så får du svaret på skrift.</span></p>`}
        ${raad}
      </div>

      ${profilNoegle ? `<div class="sidebar-card">${profilKnapHTML}</div>` : ''}`;
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
     hos kilden. Etiketten siger derfor præcis det, og ikke "Oprettet".

     Formateringen lå før her som sin egen lille funktion med month:'long' og
     skrev "16. august 2026", mens vores egne annoncer skrev "16. aug. 2026" —
     to skrivemåder for samme dato på samme sidetype. datoKort() er det ene
     sted, begge går igennem nu. */
  const fundet = datoKort(listing.indekseretFoerste);

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
        ${hvemHandlerDuMed}
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
        ${hvemKoeberDuAf}</span>
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

/* ---------- "Søg videre" i højre spalte ----------

   Kritikeren målte højre spalte som tom fra ca. y=1000 og ned: omtrent
   halvdelen af desktopsiden var hvidt felt ved siden af beskrivelsen, mens
   sælgerkortet lå og sluttede oppe i toppen. Tomhed ved siden af sidens
   længste tekst er ikke ro — det er en spalte, der holder op med at svare.

   Kortet er den samme opskrift som `.external-detail-next` på
   kildeannoncerne længere oppe i filen: en kort liste af søgninger, der ALLE
   findes. Ingen af linjerne er gættet — mærke, type og landsdel står i
   annoncen, og kørekortlinjen kommer kun med, når koerekortForListing()
   faktisk kunne regne kategorien ud (den svarer null frem for at gætte).

   Sammen med `.listing-aside{position:sticky}` betyder det, at spalten
   følger med ned gennem specs og beskrivelse i stedet for at blive
   efterladt. */
function videreKortHTML(listing, kk){
  const brand = escapeHTML(listing.brand || '');
  const type = listing.type ? typeLabel(listing.type) : '';
  const links = [
    listing.brand && listing.brand !== 'Ukendt'
      ? [`soegning.html?brands=${encodeURIComponent(listing.brand)}`, `Alle ${brand} til salg`] : null,
    kk ? [`soegning.html?koerekort=${encodeURIComponent(kk)}`, `Motorcykler til ${escapeHTML(kk)}-kørekort`] : null,
    type ? [`soegning.html?type=${encodeURIComponent(listing.type)}`, `Alle ${escapeHTML(type)}`] : null,
    listing.region ? [`soegning.html?regions=${encodeURIComponent(listing.region)}`, `Motorcykler i ${escapeHTML(listing.region)}`] : null,
    ['soegning.html', 'Alle motorcykler'],
  ].filter(Boolean);

  return `
      <div class="sidebar-card listing-next">
        <h2>Søg videre på Bikerbasen</h2>
        <ul>
          ${links.map(([href, tekst]) => `<li><a href="${href}">${tekst}</a></li>`).join('')}
        </ul>
      </div>`;
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
  const kk = (typeof koerekortForListing === 'function') ? koerekortForListing(listing) : null;
  // Number(undefined) er NaN, ikke null — og NaN sluppet igennem blev til
  // "NaN ★" i sælgerkortet. Falder tilbage på null, som betyder "ingen".
  const raaRating = Number(listing.seller.rating);
  const avgRating = Store.getAverageRating(listing.seller.name, Number.isFinite(raaRating) ? raaRating : null);
  const reviewCount = Store.getReviews(listing.seller.name).length;
  const telefon = String(listing.seller.phone || '').trim();
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
  const favKnapHTML = isOwnListing(listing)
    ? ''
    : `<button type="button" class="fav-btn ${fav?'active':''}" aria-pressed="${fav}" aria-label="Gem annonce" data-fav-toggle="${listing.id}">${Icon.heart}</button>`;

  const galleriHTML = fotoAntal ? `
      <div class="gallery">
        <div class="gallery-main">
          <div id="gallery-main-img"></div>
          ${fotoAntal > 1 ? `
          <div class="gallery-counter" id="gallery-counter"></div>
          <button type="button" class="gallery-nav prev" aria-label="Forrige billede">${Icon.chevronLeft}</button>
          <button type="button" class="gallery-nav next" aria-label="Næste billede">${Icon.chevronRight}</button>` : ''}
        </div>
        ${favKnapHTML}
        ${fotoAntal > 1 ? `<div class="gallery-thumbs">
          ${currentPhotos.map((_, i) => `<button type="button" aria-label="Billede ${i+1} af ${fotoAntal}" data-thumb="${i}">${fotoHTML(i, { thumb:true })}</button>`).join('')}
        </div>` : ''}
      </div>` : `
      <div class="gallery-tom">
        ${favKnapHTML}
        ${Icon.camera}
        <p class="gallery-tom-titel">Ingen fotos i denne annonce</p>
        <p class="gallery-tom-tekst">Sælgeren har ikke lagt billeder op. Vi viser ikke en tegning i stedet —
          bed sælgeren om fotos af netop den her motorcykel, før du kører efter den.</p>
      </div>`;

  document.getElementById('listing-detail').innerHTML = `
    <div>
      ${suspicious ? `<div class="safety-banner" style="background:var(--color-danger-tint); color:var(--color-danger); border-color:color-mix(in srgb, var(--color-danger) 30%, transparent);">${Icon.alertTriangle}<span>Prisen er væsentligt under markedsniveau for denne type — vær ekstra opmærksom, og følg altid vores sikkerhedsråd.</span></div>` : ''}
${galleriHTML}

      <div class="listing-header">
        <div>
          <p class="listing-title">${brand} ${model}</p>
          <div class="listing-loc">${Icon.mapPin}${escapeHTML(listing.city)}, ${escapeHTML(listing.postnr)} · ${escapeHTML(listing.region)}</div>
          ${oprettet ? `<div class="listing-loc listing-alder">${Icon.clock}Annoncen er oprettet ${escapeHTML(oprettet)} · ${escapeHTML(timeAgoDa(listing.createdAt))}</div>` : ''}
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
        <!-- Stod som "Ukendt". Afgift er et OPLYST felt (sælgeren krydser af
             i opret-annonce), og mangler det, er det ikke oplyst — det er
             samme sag som resten af tabellen, hvor formatKm()/formatPrice()
             i js/data.js skriver "ikke oplyst". To ord for samme tomrum i
             den SAMME tabel. -->
        <div class="spec-item"><span class="spec-icon">${Icon.lock} Afgift</span><b>${escapeHTML(listing.afgift || 'Ikke oplyst')}</b></div>
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

    <!-- To lag med vilje: den ydre er gitterets celle og strækkes ned til
         venstre spaltes højde, den indre er den, der klæber. Sætter man
         sticky direkte på cellen, har den ingen strækning at bevæge sig i
         (se .listing-aside i css/styles.css). -->
    <div class="listing-aside">
      <div class="listing-aside-inner">
        ${saelgerKortHTML(listing, { loggedIn, avgRating, reviewCount, telefon })}
        ${videreKortHTML(listing, kk)}
      </div>
    </div>
  `;

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
      if (loggedIn && !telefon){
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
    revealBtn?.addEventListener('click', () => {
      // telefon er den trimmede værdi fra renderListing, ikke råfeltet.
      revealBtn.innerHTML = `${Icon.phone}<span class="phone-reveal">${escapeHTML(telefon)}</span>`;
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

      // Det ene, vi faktisk kan: tælle henvendelsen på annoncen.
      db.recordListingEvent?.(listing.id, 'contact');

      const krop = document.getElementById('contact-receipt-body');
      const handlinger = document.getElementById('contact-receipt-actions');

      if (krop){
        krop.textContent = telefon
          ? 'Sælgeren kan se på sin annonce, at du har henvendt dig. Vi videresender ikke selve teksten endnu, så vil du have svar i dag, er telefonen den hurtigste vej.'
          : 'Sælgeren kan se på sin annonce, at du har henvendt dig. Vi videresender ikke selve teksten endnu, og sælgeren har ikke oplyst et telefonnummer — gem annoncen, så du kan finde den igen.';
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
