/* ============================================================
   Sælgerprofil (forhandler.html)

   Siden har ét formål: svare på "tør jeg overføre 80.000 kr. til ham?".
   Alt hvad der ikke hjælper med det svar, er væk.

   Baren for FORHANDLERE er Bilbasens forhandlerside (bar/04-*.png). Den
   viser adresse, åbningstider, telefonnummer, kort og hjemmeside. Vi har
   ingen af delene: `public_profiles` udstiller syv felter — id, name, city,
   is_dealer, company, member_since, verified — og ikke ét af dem er en
   kontaktoplysning. For private sælgere findes baren slet ikke; Bilbasen har
   ingen profilside for private (GAPS.md, gap 4).

   Vi kan altså ikke vinde på MÆNGDEN af oplysninger. Vi kan vinde på, at
   køberen får at vide, hvad oplysningerne er værd: hvad er kontrolleret
   (ingenting), hvad er tastet ind af sælgeren selv (resten), og hvad
   sælgertypen betyder for hans reklamationsret. Det sidste er den eneste
   oplysning på siden, der kan koste eller redde ham penge, og Bilbasens
   forhandlerside nævner det ikke med ét ord.
   ============================================================ */

let currentSeller = null;

/* Den udgave af sælgeren, siden må TEGNE. For en forhandler er den identisk
   med currentSeller. For en privat sælger set af en udlogget besøgende er
   navnet skiftet ud med "Privat sælger" — se navneblindProfil() nederst.
   currentSeller beholder det rigtige navn, fordi Store.getReviews() slår
   anmeldelser op på netop det. */
let visSaelger = null;

/* 0 = intet valgt. Stod før på 5, altså en færdigudfyldt topkarakter, som en
   bruger, der kun ville skrive en kommentar, afgav uden at vide det. Tallet
   øverst på siden er regnet af netop de karakterer — så en forudfyldt
   femmer var en stemme, siden lagde i munden på folk. */
let pickedStars = 0;

function initials(name){
  // filter(Boolean): to mellemrum i et navn gav et undefined-element, og
  // "PA" blev til "P".
  return String(name || '').split(' ').filter(Boolean).map(w => w[0]).slice(0,2).join('').toUpperCase();
}

/* Datoer i den korte danske form: 16. aug. 2026.
   Kopi af datoKort()/talDa() fra js/annonce.js med vilje — den fil indlæses
   ikke på denne side, og at hive den ind for to hjælpefunktioner ville koste
   hele annoncesidens JS på en profilside. Skrivemåden skal være den samme
   begge steder; ændres den ene, skal den anden med. */
function datoKort(iso){
  const t = new Date(iso || '').getTime();
  if (!t) return '';
  return new Date(t).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
}
function talDa(n){
  return String(n).replace('.', ',');
}

/* Stjernerækken må aldrig sige mere end tallet ved siden af den.

   Her stod `Math.round(rating)`. En anmeldelse på 4,5 blev derfor tegnet med
   FEM fyldte stjerner, mens gennemsnittet stod 4,5 — og på en profil med én
   anmeldelse så det ud, som om vi havde fundet på tallet. Det havde vi ikke:
   regnestykket var rigtigt hele tiden, det var BILLEDET, der løj. Samme
   mekanik gav "3,8 af 2 anmeldelser" på annoncernes sælgerkort, hvor de to
   anmeldelser på 4 og 3,5 begge stod med fire fyldte stjerner.

   Nu fyldes hver stjerne kun så meget, karakteren rækker til, og der rundes
   aldrig op. Halve karakterer kan ikke længere opstå (se SEED_REVIEWS i
   js/data.js), men funktionen skal ikke kunne lyve, hvis de gør. */
/* role="img" er ikke pynt — uden den findes stjernerne slet ikke for en
   skærmlæser.

   Elementet var `<span class="review-stars" aria-label="4,2 ud af 5
   stjerner">` med fem `aria-hidden`-stjerner indeni. En bar <span> har ingen
   rolle, og aria-label er FORBUDT på et element uden rolle (WAI-ARIA: kun
   roller, der tillader "naming from author"). Browseren smider derfor
   etiketten væk, og fordi indholdet samtidig var skjult, blev hele
   bedømmelsen tavs: hverken gennemsnittet i toppen eller de seks enkelte
   anmeldelser havde en karakter, en blind køber kunne høre. Målt af
   Lighthouse som `aria-prohibited-attr` på 7 elementer — tilgængelighed 97
   mod gulvet på 100 i bar/RUBRIC.md, og det var netop det tillidskritiske
   tal, der manglede.

   role="img" giver elementet en rolle, der må navngives, og gør de fem
   stjerner til ét billede med én etiket i stedet for fem ordløse ikoner. */
function starsHTML(rating){
  const v = Math.max(0, Math.min(5, Number(rating) || 0));
  return `<span class="review-stars" role="img" aria-label="${talDa(Math.round(v * 10) / 10)} ud af 5 stjerner">${
    Array.from({length:5}, (_,i) => {
      const del = Math.max(0, Math.min(1, v - i));   // 0 = tom stjerne, 1 = fyldt
      return `<span aria-hidden="true" style="opacity:${(0.25 + 0.75 * del).toFixed(2)}">${Icon.star}</span>`;
    }).join('')
  }</span>`;
}

/* ---------- Anmeldelser ----------
   Databaseanmeldelser når sælgeren er en rigtig bruger; ellers de lokale
   demoanmeldelser, så profilsiderne for demodata stadig ser levende ud. */
async function loadReviews(){
  const seller = currentSeller;
  if (db.enabled && seller.id){
    const { data, error } = await db.listReviews(seller.id);
    if (!error && data){
      return data.map(r => ({
        author: r.author?.name || 'Bruger',
        rating: Number(r.rating),
        comment: r.comment,
        date: r.created_at,
      }));
    }
    // Fejlede kaldet, har vi ingen anmeldelser at vise — og de LOKALE
    // demoanmeldelser hører til en anden sælger med samme navn. Før faldt
    // koden tilbage på dem og viste fremmede menneskers ros på en rigtig
    // profil.
    return [];
  }
  return Store.getReviews(seller.name);
}

/* Gennemsnittet er ikke bare summen delt med antallet.

   Under `Store.MIN_ANMELDELSER_FOR_SNIT` giver vi intet tal — begrundelsen
   står i js/store.js. Grænsen læses derfra i stedet for at blive skrevet om
   her, så profilen og sælgerkortet på annoncen ikke kan komme til at sige
   hver sit om den samme sælger. Anmeldelserne selv skjules ikke; det er kun
   sammenfatningen til ét tal, der venter, til der er noget at sammenfatte. */
function gennemsnit(reviews){
  if (reviews.length < Store.MIN_ANMELDELSER_FOR_SNIT) return null;
  return Math.round((reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length) * 10) / 10;
}

/* Hvem må skrive en anmeldelse?

   Betingelsen skal stå FØR formularen. En formular, der er dømt til at fejle,
   koster brugeren arbejdet OG siden dens troværdighed — og en formular, der
   IKKE fejler, men lader en anonym besøgende fodre stjernetallet, er værre
   endnu.

   HER SLAP DEN FORBI I RUNDE 1: gaten lå bag `if (!db.enabled || !seller.id)`
   og greb derfor aldrig i praksis. Alle 51 demosælgere kendes på NAVN og har
   intet `seller.id` (se hentSaelgerLokalt()), og databasen har nul annoncer —
   så hver eneste profil, en besøgende faktisk kan nå, faldt i den åbne gren.
   Efterprøvet udlogget på `forhandler.html?id=Motorcykel Centret ApS`:
   formularen stod der, og `Store.addReview()` skrev anmeldelsen ind uden ét
   spørgsmål. Login er nu FØRSTE betingelse, uanset hvor anmeldelsen ender. */
function anmeldelsesFormHTML(){
  const seller = currentSeller;
  const bruger = Store.getUser();

  if (!bruger){
    const her = location.pathname.split('/').pop() + location.search;
    return `
      <p class="anmeld-krav">${Icon.lock}<span>Kun indloggede brugere kan bedømme en sælger. Det er dét, der holder antallet af opdigtede anmeldelser nede — og gør de anmeldelser, der står her, noget værd.</span></p>
      <a class="btn btn-outline" href="login.html?redirect=${encodeURIComponent(her)}">${Icon.user}Log ind og bedøm</a>`;
  }
  if (bruger.id && seller.id && bruger.id === seller.id){
    return `<p class="anmeld-krav">${Icon.info}<span>Det er din egen profil. Du kan ikke bedømme dig selv.</span></p>`;
  }

  /* Demosælgeren er ikke en konto. Anmeldelsen kan derfor hverken knyttes til
     en handel eller nå længere end til denne browser, og det skal stå der —
     ikke opdages bagefter. */
  const kunLokalt = (!db.enabled || !seller.id)
    ? `<p class="anmeld-krav anmeld-krav-lokal">${Icon.info}<span>Denne sælger er ikke en Bikerbasen-konto, så din bedømmelse bliver kun gemt i din egen browser. Den tæller ikke med for andre.</span></p>`
    : '';

  return `
    ${kunLokalt}
    <form id="review-form" class="anmeld-form">
      <div class="star-picker" id="star-picker" role="group" aria-label="Vælg antal stjerner"></div>
      <div class="field" style="margin-top:12px;">
        <label for="review-comment">Kommentar</label>
        <textarea class="input" id="review-comment" rows="3" placeholder="Hvordan var din oplevelse med denne sælger?" required></textarea>
      </div>
      <button type="submit" class="btn btn-primary" style="margin-top:14px;">Send bedømmelse</button>
    </form>`;
}

function renderStarPicker(){
  const mount = document.getElementById('star-picker');
  if (!mount) return;
  mount.innerHTML = Array.from({length:5}, (_,i) =>
    `<button type="button" data-star="${i+1}" aria-pressed="${i < pickedStars}" aria-label="${i+1} ${i === 0 ? 'stjerne' : 'stjerner'}" class="${i < pickedStars ? 'active' : ''}">${Icon.star}</button>`
  ).join('');
  mount.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => { pickedStars = Number(btn.dataset.star); renderStarPicker(); });
  });
}

async function renderAnmeldelser(){
  const reviews = await loadReviews();
  const avg = gennemsnit(reviews);
  const mount = document.getElementById('profil-anmeldelser');

  /* Overskriften siger antallet. "Anmeldelser" alene tvinger køberen til at
     tælle selv for at finde ud af, om der står noget bag stjernerne.

     Tre tilstande, ikke to. Den midterste — anmeldelser findes, men for få
     til et gennemsnit — er den, der før blev pyntet med et tal. Nu siger
     linjen, hvor mange der er, og hvorfor der ikke står et snit. Antallet
     står altså tydeligt, uanset om tallet gør. */
  const antalOrd = `${reviews.length} ${reviews.length === 1 ? 'anmeldelse' : 'anmeldelser'}`;
  const hoved = !reviews.length
    ? `<h2>Anmeldelser</h2>
       <p class="profil-anmeld-snit"><span>Ingen har bedømt denne sælger endnu. En profil uden anmeldelser er ikke en advarsel — den er bare ubeskrevet. Bed om at se motorcyklen, som du ville gøre uanset hvad.</span></p>`
    : avg != null
      ? `<h2>Anmeldelser <span class="profil-tal">${reviews.length}</span></h2>
         <p class="profil-anmeld-snit">${starsHTML(avg)}<span>${talDa(avg)} i gennemsnit af ${antalOrd}</span></p>`
      : `<h2>Anmeldelser <span class="profil-tal">${reviews.length}</span></h2>
         <p class="profil-anmeld-snit"><span>Der er ${antalOrd} af denne sælger, og vi regner først et gennemsnit fra ${Store.MIN_ANMELDELSER_FOR_SNIT}. Et snit af ${reviews.length === 1 ? 'én mening' : 'to meninger'} ser ud som en karakter, men er det ikke. Læs ${reviews.length === 1 ? 'den' : 'dem'} i stedet — ${reviews.length === 1 ? 'den' : 'de'} står her.</span></p>`;

  mount.innerHTML = `
    ${hoved}
    <div class="anmeld-liste">${reviews.map(r => `
      <div class="review-item">
        <div class="review-head">
          <span class="review-author">${escapeHTML(r.author)}</span>
          <span class="review-date">${datoKort(r.date)}</span>
        </div>
        ${starsHTML(r.rating)}
        <p class="review-comment" style="margin-top:6px;">${escapeHTML(r.comment)}</p>
      </div>`).join('')}</div>
    <div class="anmeld-skriv">
      <h3>Har du handlet med sælgeren?</h3>
      ${anmeldelsesFormHTML()}
    </div>`;

  renderStarPicker();
  wireAnmeldelsesForm();

  // Tallet i toppen skal matche det, der står længere nede på siden.
  opdaterBedoemmelse({ reviews: reviews.length, avg });
}

function wireAnmeldelsesForm(){
  const form = document.getElementById('review-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const seller = currentSeller;
    const comment = document.getElementById('review-comment').value.trim();

    // Ingen stjerner valgt = ingen karakter at lægge til gennemsnittet.
    if (!pickedStars){ toast('Vælg et antal stjerner først'); return; }

    if (db.enabled && seller.id){
      const { error } = await db.addReview(seller.id, pickedStars, comment);
      if (error){
        // Databasen håndhæver selv "én anmeldelse pr. sælger" og "ikke dig selv".
        const m = error.message || '';
        if (m.includes('no_self_review') || m.includes('duplicate key')) toast('Du har allerede bedømt denne sælger');
        else if (m.includes('not_own_profile')) toast('Du kan ikke bedømme dig selv');
        else toast(error.message, { type: 'error' });
        return;
      }
    } else {
      /* Navnet kommer fra kontoen, ikke fra et frit tekstfelt. Feltet "Dit
         navn" gjorde enhver anmeldelse anonym i praksis — man kunne skrive
         hvad som helst, og gjorde man ingenting, stod der "Anonym bruger"
         under en femstjernet karakter. */
      const author = Store.getUser()?.name || 'Bruger';
      Store.addReview(seller.name, { author, rating: pickedStars, comment, date: new Date().toISOString() });
    }

    pickedStars = 0;
    await renderAnmeldelser();
    toast('Tak for din bedømmelse');
  });
}

/* ---------- Bedømmelsen i toppen ----------

   Her stod før en hel række nøgletal: "– Bedømmelse / 0 Anmeldelser /
   0 Aktive annoncer". To ting var galt med den.

   Bindestregen: et "–" i feltet Bedømmelse ligner en dårlig karakter. Ingen
   af de rigtige profiler har en anmeldelse endnu, så alle tre profiler bar
   en tom karakter rundt. Annoncesiden løste det for længst ved at UDELADE
   tallet (saelgerKortHTML i js/annonce.js) — samme regel her.

   Annoncetallet: det stod tre steder på samme skærm (overskriften
   "5 motorcykler til salg", faktalisten og nøgletallet). Det står nu ét sted.

   Tilbage er bedømmelsen, og den er flyttet ind i linjen under navnet som en
   lille chip. Den er sidst i rækken, så den kan komme til efter
   anmeldelseskaldet uden at flytte noget, der allerede er tegnet. */
function opdaterBedoemmelse({ reviews, avg }){
  const mount = document.getElementById('profil-bedoemmelse');
  if (!mount) return;
  if (!reviews){ mount.innerHTML = ''; return; }
  const antal = `${reviews} ${reviews === 1 ? 'anmeldelse' : 'anmeldelser'}`;
  /* Tallet må aldrig stå uden sit antal — "4,5" alene lyder som en karakter,
     nogen har regnet på et grundlag. Og er der for få anmeldelser til et
     snit, står ANTALLET alene: det er en oplysning, vi har fuld dækning for,
     og chippen fører derned, hvor køberen selv kan læse dem. */
  mount.innerHTML = avg != null
    ? `<a class="profil-karakter" href="#profil-anmeldelser">${Icon.star}<b>${talDa(avg)}</b>
       <span>${antal}</span></a>`
    : `<a class="profil-karakter profil-karakter-uden-snit" href="#profil-anmeldelser">${Icon.star}
       <span>${antal}</span></a>`;
}

/* ---------- "Findes ikke" ----------

   Før faldt siden tilbage på den første sælger i listen, når id'et ikke gav
   et hit. Man kunne altså klikke ind på én sælger og få en helt anden
   persons profil, badges og annoncer serveret som om den var rigtig. */
function renderProfileNotFound(){
  document.title = 'Sælgeren findes ikke — Bikerbasen';
  Seo.setMeta('meta[name="robots"]', 'name', 'robots', 'noindex, follow');
  document.querySelectorAll('.bc-sep').forEach(s => s.innerHTML = Icon.chevronRight);
  document.getElementById('profile-top').innerHTML = `
    <div class="empty-state" style="width:100%;">
      ${Icon.user}
      <!-- h2, ikke h3: samme grund som i annonce.js — siden har kun sin
           tomme h1, så h3 springer et niveau over. -->
      <h2>Vi kunne ikke finde sælgeren</h2>
      <p>Profilen er måske slettet, eller linket er forkert.</p>
      <a href="soegning.html" class="btn btn-primary" style="margin-top:16px;">Søg motorcykler</a>
    </div>`;
  document.getElementById('profil-krop')?.remove();
  document.getElementById('profil-anmeldelser')?.remove();
}

/* ---------- Henter sælgeren ud fra seller_id ----------

   Tidligere blev der slået op på navn, hvilket gav to problemer: to sælgere
   med samme navn smeltede sammen til én profil, og navnet lå i URL'en.
   Annoncerne hentes direkte fra databasen frem for at filtrere den
   indlæste side, så en sælger med mange annoncer viser dem alle. */
/* ---------- Nøglen i adresselinjen ----------

   Profilen slås op på `?id=`. Hvad der står i den nøgle, er en
   tillidsbeslutning, ikke et teknisk detaljespørgsmål:

     databasesælger   → uuid. Afslører intet.
     forhandler       → firmanavnet. Det er en offentlig oplysning, står på
                        annoncekortene i forvejen og ER sidens overskrift.
     privat sælger    → hverken uuid eller navn findes at bruge på
                        demodataene, og navnet MÅ ikke i adresselinjen: hele
                        grunden til, at kortet på annoncen skriver "Privat
                        sælger" udlogget, er at navnet er en personoplysning.
                        Han får derfor et pseudonym udledt af navnet.

   Pseudonymet er stabilt (samme navn giver samme nøgle hver gang), kort nok
   til en URL, og kan ikke regnes tilbage til et navn af den, der ser det.
   Det er ikke kryptografi og skal ikke være det — den, der allerede kender
   navnet, kan naturligvis regne nøglen ud. Pointen er alene, at nøglen ikke
   RØBER navnet for den, der ser linket, deler det, eller ser det i historikken.

   ADVARSEL: den samme funktion står i js/annonce.js (saelgerKortHTML), fordi
   den fil bygger linket og denne fil læser det. De to skal være ordret ens —
   ændres den ene, skal den anden med. Samme aftale som datoKort()/talDa()
   længere oppe. */
function navneHash(navn){
  // FNV-1a, 32 bit. Valgt fordi den er fem linjer og deterministisk.
  let h = 0x811c9dc5;
  for (let i = 0; i < navn.length; i++){
    h ^= navn.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}
function profilNoegleFor(s){
  if (!s) return '';
  if (s.id) return String(s.id);
  if (!s.name) return '';
  return s.isDealer ? String(s.name) : 'p' + navneHash(String(s.name));
}

function hentSaelgerLokalt(noegle){
  /* Eksterne annoncer har `seller: null` (se normalizeExternalListing i
     js/backend-bridge.js). Uden vagten i profilNoegleFor() blev de til
     strengen "undefined", og en URL med ?id=undefined ville samle dem alle
     sammen til én opdigtet sælgerprofil. */
  const alle = Store.getAllListings().filter(l => {
    const k = profilNoegleFor(l.seller);
    return k !== '' && k === String(noegle);
  });
  return { seller: alle[0]?.seller || null, listings: alle };
}

async function hentSaelger(sellerId){
  if (!db.enabled) return hentSaelgerLokalt(sellerId);

  /* Nøglen er ikke en uuid. Så hører den ikke til i databasen — men den kan
     godt høre til demodataene i js/data.js, hvis sælgeren er en, der kun
     findes i browseren. Dem har annoncesiden ingen uuid at linke på
     (demosælgere har navn, ikke id), så nøglen ER navnet.

     Før stod der `renderProfileNotFound()` her, og det ramte alle 51
     demoannoncer: hver eneste "Se sælgerprofil" endte på "Sælgeren findes
     ikke", fordi db.enabled er sand på localhost. Opslaget her sker kun i
     hukommelsen; der går aldrig en ikke-uuid videre til Postgres. I drift
     er LISTINGS tom (SHOW_DEMO_DATA er false uden for localhost), så en
     opdigtet nøgle giver stadig "findes ikke" — som den skal. */
  if (!isUuid(sellerId)) return hentSaelgerLokalt(sellerId);

  const [{ data: profil }, { data: annoncer }] = await Promise.all([
    db.getPublicProfile(sellerId),
    db.listingsBySeller(sellerId),
  ]);
  if (!profil) return { seller: null, listings: [] };
  return {
    /* Præcis de syv kolonner public_profiles har. Der stod før `phone: null`
       og `rating: null` her, og de to felter fik siden til at tegne en
       telefonknap og et bedømmelsestal, der aldrig kunne blive til noget.
       Findes feltet ikke, skal det heller ikke opfindes som null. */
    seller: {
      id: profil.id,
      name: profil.name || 'Ukendt sælger',
      city: profil.city || '',
      isDealer: !!profil.is_dealer,
      company: profil.company || null,
      memberSince: profil.member_since,
    },
    listings: (annoncer || []).map(normalizeRemoteListing),
  };
}

/* ---------- Identiteten øverst ----------

   Hvem står der på skiltet? For en forhandler er det FIRMAET — det er det
   navn, en køber genkender, googler og slår op i CVR-registret, og det er
   sådan Bilbasens forhandlerside gør det ("NBC Biler ApS"). Personens navn
   forsvinder ikke; det står som en linje i oplysningerne nedenunder, hvor
   det ikke bliver forvekslet med virksomheden.

   Sælgertypen står som en mærkat, ikke som en grå metalinje. "Er det tydeligt
   HVEM der sælger — forhandler eller privat — uden at klikke?" er første
   spørgsmål i tillidskategorien, og svaret skal kunne læses på afstand.

   Er sælgeren privat og den besøgende udlogget, er `seller` her den
   navneblinde udgave: overskriften er "Privat sælger i Næstved", og byen
   står derfor ikke som sin egen chip bagefter. Se navneblindProfil(). */
function renderIdentitet(seller, listings, skjultNavn){
  const erForhandler = !!seller.isDealer;
  const titel = erForhandler && seller.company ? seller.company : seller.name;
  const nyeste = listings.map(l => l.createdAt).filter(Boolean).sort().pop();

  const kontakt = listings.length
    ? `<a class="btn btn-primary" href="annonce.html?id=${encodeURIComponent(listings[0].id)}">${Icon.mail}Skriv om en annonce</a>
       <p class="profil-kontakt-note">${Icon.info}<span>Kontakt går gennem annoncen, så sælgeren kan se, hvilken motorcykel du spørger til.</span></p>`
    /* Ingen annoncer = ingen kontaktvej. Før stod knappen "Skriv besked" her
       alligevel og gjorde bogstavelig talt ingenting ved klik, fordi den
       pegede på listings[0]. En knap, der ikke virker, er værre end ingen
       knap — og værst på den side, hvor køberen prøver at afgøre, om nogen
       er til at få fat i. */
    : `<p class="profil-kontakt-note">${Icon.info}<span>Sælgeren har ingen aktive annoncer, og kontakt på Bikerbasen går gennem en annonce. Der er derfor ingen vej til sælgeren herfra lige nu.</span></p>`;

  document.getElementById('profile-top').innerHTML = `
    <div class="avatar-lg">${erForhandler || skjultNavn ? (erForhandler ? Icon.store : Icon.user) : escapeHTML(initials(seller.name))}</div>
    <div class="profile-info">
      <p class="profile-name">${escapeHTML(titel)}</p>
      <p class="profil-type">
        <span class="badge ${erForhandler ? 'badge-dealer' : 'badge-neutral'}">${erForhandler ? Icon.store+'Forhandler' : Icon.user+'Privat sælger'}</span>
        ${(seller.city && !skjultNavn) ? `<span class="profil-type-sted">${Icon.mapPin}${escapeHTML(seller.city)}</span>` : ''}
        <span class="profil-type-sted">${Icon.calendar}Medlem siden ${escapeHTML(String(seller.memberSince ?? 'ukendt år'))}</span>
        <span id="profil-bedoemmelse"></span>
      </p>
    </div>
    <div class="profile-actions">${kontakt}</div>`;

  return nyeste;
}

/* ---------- Oplysningerne, og hvad de er værd ----------

   Det her er sidens egentlige svar på "kan jeg stole på ham?".

   Bilbasens forhandlerside viser adresse, åbningstider, telefonnummer og
   hjemmeside, og lader køberen selv slutte, at nogen har tjekket det. Vi kan
   ikke vise de felter — public_profiles har dem ikke — men vi kan gøre det,
   ingen af siderne gør: sige lige ud, hvor oplysningerne kommer fra.

   Hver linje er enten et felt fra public_profiles eller et tal, der er talt
   op på siden. Der er ingen linje, vi ikke har dækning for, og felter uden
   værdi skriver "Ikke oplyst" i stedet for at falde væk — for på en
   forhandlerprofil er en manglende by faktisk en oplysning. */
/* Modulus 11 — den kontrol, ethvert dansk CVR-nummer selv bærer med sig.

   Cifrene vægtes 2,7,6,5,4,3,2,1, og summen skal gå op i 11. Sidste ciffer
   ER kontrolcifferet. Det er ren aritmetik på strengen: den siger intet om,
   hvorvidt virksomheden findes, og må derfor aldrig skrives som en
   verificering. Men den kan afsløre et nummer, der er tastet forkert eller
   fundet på — og et opdigtet CVR-nummer er den billigste svindel, der findes
   på en markedsplads.

   Runde 2's kritiker regnede kontrollen efter i hånden på demoforhandlerens
   nummer og fandt, at den fejlede, mens siden roligt tilbød at slå det op.
   Vi lader ikke længere køberen om at opdage det.

   FLYTTET: selve regnestykket bor nu i js/components.js, som BEGGE sider
   indlæser. Annoncesidens sælgerkort tilbød stadig at slå et nummer op, som
   den her side ét klik senere afviste — samme nummer, to svar. En regel, der
   kun findes på den ene af to sider, er ikke en regel. */


/* ---------- "Efterprøv ham selv" ----------

   Det navngivne hul efter runde 2: Bilbasens forhandlerside giver gadeadresse,
   åbningstider, to telefonnumre, hjemmeside og et kort på første skærm. Vi har
   ingen af felterne — `public_profiles` udstiller syv kolonner, og ikke én af
   dem er en kontaktoplysning — og vi opfinder dem ikke.

   Men vi kan gøre noget, baren ikke gør. Bilbasens adresse er en påstand,
   forhandleren selv har tastet ind, og siden lader køberen slutte, at nogen
   har tjekket den. Vi har CVR-nummeret, og CVR-nummeret er nøglen til
   Erhvervsstyrelsens eget register, hvor adressen, branchen, stiftelsesåret og
   antallet af ansatte står — statens oplysninger, ikke sælgerens og ikke
   vores. Ét klik giver altså køberen den fysiske identitet fra en kilde, der
   er bedre end den, baren viser.

   Og så siger vi HVORFOR de felter, vi ikke har, ikke står der. En profil,
   der bare mangler dem, ligner en forhandler, der har undladt at udfylde sin
   side. En profil, der siger "vi spørger ikke om det", flytter manglen
   derhen, hvor den hører hjemme: hos os. */
function efterproevHTML(seller, erForhandler){
  const felterVi = `<p class="profil-mangler">${Icon.info}<span>Bikerbasen spørger ikke forhandlere om gadeadresse, åbningstider, telefonnummer eller hjemmeside, så de står ikke på profilen. At de mangler her, er ikke noget, forhandleren har undladt.</span></p>`;

  if (!erForhandler){
    return `
      <div class="sidebar-card profil-efterproev">
        <h2 class="profil-side-titel">Hvad kan du efterprøve?</h2>
        <p class="profil-efterproev-tekst">En privat sælger har hverken CVR-nummer, butik eller åbningstider — der findes ingen registrering af ham at slå op. Det, du kan gå efter, er anmeldelserne længere nede, hvor mange annoncer han har haft, og hvor ny den nyeste er. Resten afgøres, når du står ved motorcyklen.</p>
      </div>`;
  }

  if (!seller.cvr){
    return `
      <div class="sidebar-card profil-efterproev">
        <h2 class="profil-side-titel">Efterprøv forhandleren selv</h2>
        <p class="profil-efterproev-tekst">Der står ikke noget CVR-nummer på denne profil, så der er ikke noget at slå op herfra. Spørg sælgeren om nummeret, før du betaler — en dansk forhandler har altid ét, og med det kan du selv finde adressen i CVR-registret.</p>
        ${felterVi}
      </div>`;
  }

  const nr = String(seller.cvr);
  const ok = cvrKontrolOK(nr);
  /* To udsagn, og de skal holdes skarpt adskilt. Kontrolcifferet er noget, vi
     KAN regne efter og derfor tør sige. Om virksomheden findes, kan vi ikke
     sige — det skal køberen selv hente i registret. */
  const kontrolLinje = ok
    ? `<p class="profil-cvr-ok">${Icon.checkCircle}<span>Nummerets eget kontrolciffer passer. Det er en regnekontrol af de otte cifre — ikke et bevis for, at virksomheden findes. Det svar ligger i registret.</span></p>`
    : `<p class="profil-cvr-fejl">${Icon.alertTriangle || Icon.info}<span><b>Nummeret består ikke kontrollen.</b> Et dansk CVR-nummer skal gå op i modulus 11, og dette gør ikke. Så er det enten tastet forkert eller fundet på. Bed om nummeret igen, før du betaler noget.</span></p>`;

  return `
    <div class="sidebar-card profil-efterproev">
      <h2 class="profil-side-titel">Efterprøv forhandleren selv</h2>
      <p class="profil-efterproev-tekst">Vi har ikke tjekket noget — men det kan du. I CVR-registret står virksomhedens adresse, branche, stiftelsesår og antal ansatte. Det er Erhvervsstyrelsens oplysninger, ikke sælgerens.</p>
      ${kontrolLinje}
      <a class="btn btn-outline btn-block" href="https://datacvr.virk.dk/soegeresultater?fritekst=${encodeURIComponent(nr)}" target="_blank" rel="noopener noreferrer">${Icon.externalLink || Icon.search}Slå CVR ${escapeHTML(nr)} op</a>
      ${felterVi}
    </div>`;
}

function renderOplysninger(seller, listings, nyesteAnnonce, skjultNavn){
  const erForhandler = !!seller.isDealer;
  const titel = erForhandler && seller.company ? seller.company : seller.name;
  const her = location.pathname.split('/').pop() + location.search;
  const raekker = [
    ['Sælgertype', erForhandler ? 'Forhandler' : 'Privat sælger'],
    /* Navnet er ikke MANGLENDE her — det er tilbageholdt, og de to ting skal
       ikke se ens ud. Et felt, vi ikke har, får ingen række ("Ærlighed slår
       fuldstændighed"); et felt, vi har og med vilje ikke viser, skylder
       køberen en forklaring og en vej videre. Uden linjen ville profilen se
       ud, som om vi ikke ved, hvem han er. */
    skjultNavn
      ? ['Navn', `<a href="login.html?redirect=${encodeURIComponent(her)}">Kun synligt når du er logget ind</a>`]
      : null,
    /* Firmanavn og profilnavn står KUN, når de tilføjer noget.

       Her stod før "Firmanavn: Ikke oplyst" på enhver forhandler uden et
       `company`-felt — direkte under en overskrift, hvor der stod
       "Motorcykel Centret ApS". To ting var galt: linjen modsagde
       overskriften, og "Ikke oplyst" var et gæt. Vi ved ikke, om en
       forhandler mangler et firmanavn, eller om navnet ER firmanavnet;
       `public_profiles` skelner ikke. Ved vi det ikke, siger vi ingenting —
       i modsætning til `city`, hvor en tom værdi ER en manglende oplysning.

       Samme regel for profilnavnet: er det identisk med overskriften, er
       rækken bare den samme streng en gang til. */
    (erForhandler && seller.company) ? ['Firmanavn', escapeHTML(seller.company)] : null,
    seller.name !== titel ? ['Navn på profilen', escapeHTML(seller.name)] : null,
    ['By', seller.city ? escapeHTML(seller.city) : 'Ikke oplyst'],
    /* CVR står på annoncesidens sælgerkort (cvrLinje i js/annonce.js) med et
       link til registret. Her stod det ikke, så den samme forhandler havde et
       CVR-nummer ét klik tidligere og intet her — og profilen er netop den
       side, køberen går til for at slå ham op. Samme betingelse som på
       annoncen: kun når nummeret FAKTISK er der. `public_profiles` har ingen
       cvr-kolonne, så på databaseannoncer falder rækken helt væk; den må
       aldrig få en standardværdi (jf. "Firmanavn: Ikke oplyst"-fejlen). */
    (erForhandler && seller.cvr)
      ? ['CVR oplyst af sælger', escapeHTML(String(seller.cvr))]
      : null,
    ['Medlem siden', seller.memberSince ? escapeHTML(String(seller.memberSince)) : 'Ikke oplyst'],
    ['Aktive annoncer', String(listings.length)],
    /* "Ser siden ud til at være vedligeholdt i år, eller ser den forladt ud?"
       Datoen er ikke et skøn: den er den nyeste createdAt blandt sælgerens
       egne annoncer. Har han ingen, står der hvad det er — ikke en dato. */
    ['Seneste annonce', nyesteAnnonce ? datoKort(nyesteAnnonce) : 'Ingen aktive annoncer'],
  ].filter(Boolean);

  document.getElementById('profil-side').innerHTML = `
    <div class="sidebar-card">
      <h2 class="profil-side-titel">Om sælgeren</h2>
      <dl class="profil-fakta">
        ${raekker.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}
      </dl>
      <!-- Samme linje som verifiedBadgeHTML() i js/components.js er slået fra
           for: MitID kræver en godkendt broker, der ikke er sat op, og CVR
           bliver ikke slået op. Her siger vi det højt i stedet for at lade
           køberen tro, at et pænt profilkort betyder, at nogen har tjekket. -->
      <p class="profil-kilde">${Icon.info}<span><b>Ingen af oplysningerne er kontrolleret af Bikerbasen.</b> De er tastet ind af sælgeren selv. Vi slår ikke op i CVR- eller MitID-registret, så læs dem som en oplysning — ikke som en godkendelse.</span></p>
    </div>

    ${efterproevHTML(seller, erForhandler)}

    <!-- Den ene oplysning på siden, der kan koste køberen penge. Teksten er
         den samme som på annoncesiden (sellerTypeNoteHTML i js/components.js),
         så forhandler/privat betyder det samme begge steder. -->
    <div class="profil-jura">${sellerTypeNoteHTML(erForhandler)}</div>

    <div class="sidebar-card profil-anmeld-kort">
      <button type="button" class="report-link" id="report-profile-btn">${Icon.flag}Anmeld profil</button>
    </div>`;

  document.getElementById('report-profile-btn').addEventListener('click', () => {
    openReportModal('profile', seller.name, seller.id || seller.name);
  });
}

/* ---------- Annoncerne ----------

   Listevisning, ikke gallerikort. Vores egne annoncer har ingen uploadede
   fotos, så hvert kort ville tegne den illustrerede pladsholder — og tolv
   ens tegninger i et gitter ligner en side, der er fyldt op med attrapper.
   I en liste er tegningen lille, mærkaten "Intet foto" står tydeligt, og
   pris, årgang og km — dét køberen sammenligner på — kommer først.
   Bilbasens forhandlerside bruger i øvrigt også en tabel, ikke et gitter. */
function renderAnnoncer(seller, listings){
  const grid = document.getElementById('seller-listings');
  const overskrift = document.getElementById('annoncer-overskrift');
  // Ingen dobbelt-overskrift: står der ingenting, siger den tomme tilstand
  // hvorfor, og h2 holder sig til at være sidens strukturelle overskrift.
  overskrift.textContent = listings.length
    ? `${listings.length} ${listings.length === 1 ? 'motorcykel' : 'motorcykler'} til salg`
    : 'Annoncer';

  if (!listings.length){
    document.getElementById('seller-safety').innerHTML = '';
    // grid-column: gitteret er fire spalter fra 1240px, og uden den her
    // stod den tomme tilstand klemt sammen i en fjerdedels bredde med
    // fire ord pr. linje.
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        ${Icon.search}
        <h3>Der er ikke noget til salg lige nu</h3>
        <p>${escapeHTML(seller.isDealer && seller.company ? seller.company : seller.name)} har ingen aktive annoncer på Bikerbasen. Profilen bliver stående, så tidligere links ikke ender blindt.</p>
        <a href="soegning.html" class="btn btn-primary" style="margin-top:16px;">Se alle motorcykler</a>
      </div>`;
    return;
  }

  document.getElementById('seller-safety').innerHTML = safetyBannerHTML();
  grid.innerHTML = listings.map(listingCardHTML).join('');
  wireFavoriteButtons(grid);
}

/* ---------- Ejerens egen visning ----------

   Før var forhandler.html udelukkende den offentlige profil, en køber ser —
   ingen gren nogen steder tjekkede, om den besøgende VAR sælgeren selv.
   Loggede en forhandler ind og klikkede "Se din profil", fik han nøjagtig
   den samme side som en fremmed køber, uden en vej til det værktøj (dashboard,
   redigering af annoncer, statistik), han faktisk har brug for her.

   Banneret ændrer IKKE noget af den offentlige visning under det — det
   ligger oven på, kun for forhandleren selv, og linker videre til de
   redskaber, dashboard.html allerede har (statistik, krav-flow, annoncer).
   Det er additivt med vilje: den offentlige sælgerprofil er lige
   færdigredesignet af en anden builder og skal ikke røres. */
function renderEjerBanner(seller){
  const mount = document.getElementById('profil-ejer-banner');
  if (!mount) return;
  mount.innerHTML = '';
  const bruger = Store.getUser();
  if (!bruger || !bruger.id || !seller.id || bruger.id !== seller.id) return;

  mount.innerHTML = `
    <div class="profil-ejer-banner">
      <p><strong>Dette er sådan købere ser din profil.</strong>Rediger dine annoncer, se statistik og gør krav på indekserede annoncer i dit dashboard.</p>
      <a href="dashboard.html" class="btn btn-primary btn-sm">${Icon.gauge || Icon.chart}Gå til dashboard</a>
    </div>`;
}

async function renderProfile(){
  const sellerId = new URLSearchParams(window.location.search).get('id');
  if (!sellerId){ renderProfileNotFound(); return; }

  // Med backend er sellerId en uuid. Sender vi noget andet (et navn, en tom
  // værdi, et manipuleret link) videre til databasen, afviser Postgres det med
  // en 400 — og det er profil-id-kolonnen der er uuid. hentSaelger() holder
  // den vagt: er nøglen ikke en uuid, slår den kun op lokalt.
  const decoded = decodeURIComponent(sellerId);
  const { seller, listings } = await hentSaelger(decoded);
  if (!seller){ renderProfileNotFound(); return; }

  currentSeller = seller;
  renderEjerBanner(seller);

  // Tredje argument giver en rigtig ItemList i strukturerede data i stedet
  // for en tom stub. Se seoDealerPage() i js/seo.js.
  seoDealerPage(seller, listings.length, listings);
  const ph1 = document.getElementById('profile-h1');
  if (ph1) ph1.textContent = (seller.isDealer && seller.company) ? seller.company : seller.name;
  document.querySelectorAll('.bc-sep').forEach(s => s.innerHTML = Icon.chevronRight);

  const nyeste = renderIdentitet(seller, listings);
  renderOplysninger(seller, listings, nyeste);
  renderAnnoncer(seller, listings);
  await renderAnmeldelser();
}

document.addEventListener('DOMContentLoaded', async () => {
  await backendReady();
  renderHeader(null);
  await renderProfile();
});
