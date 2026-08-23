/* Generates static brand landing pages (one file per brand that has listings).
   Re-run with: node scripts/build-brand-pages.js
   Static HTML carries the SEO-critical parts (title, meta, h1, intro, internal
   links); the listing grid itself hydrates client-side from the same dataset. */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { browserModules, fetchExternalListings, listingSlug } = require('./shared');
const { listingCardHTML, normalizeRemoteListing, normalizeExternalListing } = browserModules();
const BASE = require('./site-url')(ROOT);
const src = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8');
eval(src + '\nglobal.__L = LISTINGS; global.__B = BRANDS_BY_MODEL; global.__T = TYPES; global.__A2 = A2_MAX_HK;');
const BRANDS_BY_MODEL = global.__B;
const A2_MAX_HK = global.__A2; // 47 hk / 35 kW — samme tal som js/data.js' eget KOEREKORT-hint, hentet derfra i stedet for gentastet

/* Mærkesider skal afspejle de annoncer, der faktisk er til salg. Demodataene
   er slået fra, så listen hentes fra databasen. Falder tilbage på hvad data.js
   måtte indeholde, hvis databasen ikke kan nås — et build skal ikke fejle
   alene på grund af netværket. Kaldes synkront via deasync-agtig top-level await
   er ikke muligt her, så resultatet hentes før brug nedenfor.

   BEMÆRK: den her henter kun VORES EGNE annoncer (`listings`). Den tabel har
   0 rækker i drift, og det var hele grunden til at sitet havde syv
   indekserbare adresser: mærkeindekset blev bygget af et tomt datasæt, mens
   332 indekserede annoncer lå i `eksterne_annoncer`. De hentes af
   hentEksterne() nedenfor og lægges sammen med disse. */
async function hentAnnoncer(){
  const cfg = fs.readFileSync(path.join(ROOT, 'js/supabase-config.js'), 'utf8');
  const url = (cfg.match(/url:\s*'([^']+)'/) || [])[1];
  const key = (cfg.match(/anonKey:\s*'([^']+)'/) || [])[1];
  if (!url || !key){
    console.warn('Ingen Supabase-konfiguration — bruger annoncer fra js/data.js.');
    return global.__L;
  }
  try {
    // Fotos og saelger skal med: maerkesidens kort tegnes nu i byggeriet, og
    // uden dem ville de vise pladsholder-tegningen og forhandler-badget
    // ville mangle — begge dele ville hoppe, naar js/maerke.js overtog.
    const select = '*,photos:listing_photos(id,storage_path,position),seller:public_profiles!listings_seller_id_fkey(*)';
    const r = await fetch(`${url}/rest/v1/listings?select=${encodeURIComponent(select)}&status=eq.active`, { headers: { apikey: key } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const rows = await r.json();
    console.log(`Hentede ${rows.length} annoncer fra databasen.`);
    return rows.map(normalizeRemoteListing);
  } catch (e) {
    console.warn('Kunne ikke hente fra databasen (' + e.message + ') — bruger js/data.js.');
    return global.__L;
  }
}

/* De indekserede annoncer, oversat med sidens EGEN normalisering. */
async function hentEksterne(){
  return (await fetchExternalListings()).map(normalizeExternalListing);
}

let LISTINGS = [];

/* Har annoncen en forrenderet annonce-<slug>.html?

   Kun vores egne har. En indekseret annonce er `noindex, follow`
   (js/annonce.js) — vi ejer ikke indholdet, og en kopi skal ikke konkurrere
   med originalen. Derfor får den ingen genereret side, og derfor må hverken
   sitemappet, <noscript>-listen eller struktureret data pege på en
   annonce-<slug>.html for den. Det var findingen C-015: ItemList'et navngav
   adresser, der svarede 404. Én regel, ét sted. */
const harEgenSide = l => !l.isExternal;

/* Adressen, en indekseret annonce faktisk KAN nås på. Siden findes (200) og
   viser kildeoplysning, prislabel og kørekortdommen — den er bare noindex. */
const internAdresse = l => harEgenSide(l) ? listingSlug(l) : `annonce.html?id=${l.id}`;

function slugify(name){
  return name.toLowerCase()
    .replace(/ø/g,'oe').replace(/æ/g,'ae').replace(/å/g,'aa')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* Den rene adresse, en side kanonicaliserer til — samme regel som
   scripts/build-meta.js's cleanUrl(). Duplikeret med vilje i stedet for
   trukket ind i scripts/shared.js: den fil er ikke min at røre i denne runde,
   og reglen er tre linjer. GitHub Pages løser selv en udvidelsesfri sti om
   til den tilsvarende .html-fil (efterprøvet mod produktion: bikerbasen.dk/
   maerke-bmw svarer 200, samme <title> som med ".html"), så en mærkeside kan
   trygt kanonicalisere uden filendelsen — ligesom bilbasen.dk's forside
   kanonicaliserer til den bare rod, ikke en filsti. */
function cleanUrl(file){
  return file === 'index.html' ? BASE : `${BASE}/${file.replace(/\.html$/, '')}`;
}

/* De mærker, vi KENDER, men ikke har på lager lige nu.

   BRANDS_BY_MODEL i js/data.js er en redaktionel liste over 60 mærker, og
   mærkeindekset linkede hver enkelt til soegning.html?brands=X. Målt på drift:
   44 af de 60 gav nul træf (findingen D-010) — 44 tynde interne sider, en
   crawler bruger budget på, og 44 klik, der lander på "Ingen annoncer matcher
   dine filtre". C-014 lagde en grid med de 18 mærker, der HAR lager, ovenover,
   men rørte ikke de 44; de stod stadig som links.

   De nævnes stadig, men som TEKST. Løftet i indledningen holdes, sidens ord
   kan stadig findes på mærkenavnet, og en køber, der leder efter en Vespa, får
   svaret med det samme frem for efter et klik. Et link er en påstand om, at
   der er noget for enden af det.

   Sammenligningen er versalUfølsom med vilje: listen skriver "SYM", lageret
   skriver "Sym", og soegning.html?brands=SYM gav derfor nul træf på et mærke,
   vi HAR — mærkefiltret er versalfølsomt (efterprøvet i browseren: ?brands=SYM
   → 0 annoncer, ?brands=Sym → 1). Uden det her ville Sym stå både i grid'en
   over mærker MED annoncer og på listen over dem uden. */
function maerkerUdenLager(kendte, medLager){
  const harLager = new Set((medLager || []).map(b => String(b).toLowerCase()));
  return (kendte || [])
    .filter(b => !harLager.has(String(b).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'da'));
}

/* Struktureret data til mærkesiderne: BreadcrumbList så Google kan vise
   brødkrummen i søgeresultatet, og en ItemList over de annoncer der rent
   faktisk står på siden — samme opskrift som js/seo.js bruger på
   søgeresultater (seoSearchResults), bare bagt ind i den statiske markup i
   stedet for sat af JavaScript efter sidens indlæst. */
function jsonLdBlock(objs){
  return objs.filter(Boolean).map(o =>
    `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`
  ).join('\n');
}
function breadcrumbLd(items){
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, item: cleanUrl(it.path),
    })),
  };
}
/* ItemList — men KUN over de annoncer, der har en adresse, Google kan følge.

   Blokken hed tidligere hele `items` og satte url = listingSlug(l) for hver.
   På en side, hvor annoncerne er indekserede, ville hver enkelt URL svare 404
   (findingen C-015, samme fejl i js/seo.js). En ItemList er en påstand om, at
   de adresser findes, og den påstand skal kunne bakkes op.

   Er der ingen med egen side, bortfalder blokken helt. Det er med vilje: et
   ItemList med nul brugbare elementer er ikke bedre end ingen, og
   BreadcrumbList'en står stadig. Genindsæt den ikke uden også at bygge de
   sider, den peger på. */
function brandItemListLd(brand, items){
  const medSide = items.filter(harEgenSide);
  if (!medSide.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Brugte ${brand} motorcykler til salg`,
    numberOfItems: medSide.length,
    itemListElement: medSide.map((l, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE}/${listingSlug(l)}`,
      name: `${l.brand} ${l.model} ${l.year}`,
    })),
  };
}

// Reuse the live header/footer so brand pages never drift from the rest of the site.
// Normalise line endings first: git checks these files out as CRLF on Windows,
// and matching on "\n" silently produced pages with no header at all.
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

function slicedBetween(src, startMarker, endMarker, label){
  const a = src.indexOf(startMarker);
  const b = src.indexOf(endMarker);
  if (a === -1 || b === -1 || b <= a){
    throw new Error(`Kunne ikke udtrække ${label} fra index.html — markørerne matchede ikke. `
      + `Sider ville blive genereret uden ${label}, så build afbrydes.`);
  }
  return src.slice(a, b + endMarker.length);
}

const header = slicedBetween(index, '<a class="skip-link"', '</div>\n</div>', 'header');
const footer = slicedBetween(index, '<footer class="site-footer">', '</footer>', 'footer');

// Fail fast hvis resultatet alligevel ser tomt ud.
if (!/site-header/.test(header)) throw new Error('Udtrukket header mangler .site-header — build afbrudt.');
if (!/site-footer/.test(footer)) throw new Error('Udtrukket footer mangler .site-footer — build afbrudt.');

/* CSP'en LÆSES fra index.html i stedet for at stå skrevet her.
   Den stod hårdkodet, og kopien var kommet bagud: den manglede
   images.danbase.dk, hvor de indekserede annoncers miniaturer ligger. Da
   mærkesiderne begyndte at vise dem, ville hvert kort have stået med et
   blokeret billede — og CSP-fejl vises kun i konsollen, ikke på siden. To
   politikker at holde i sync var problemet; nu er der én.
   maerker.html beholder sin egen, strammere: den viser ingen billeder og
   henter ingen data (se scriptlisten nederst i den). */
const csp = (index.match(/<meta http-equiv="Content-Security-Policy"[^>]*>/) || [])[0];
if (!csp) throw new Error('Fandt ingen Content-Security-Policy i index.html — build afbrudt.');

const dkk = n => Number(n).toLocaleString('da-DK') + ' kr.';
const tal = n => Number(n).toLocaleString('da-DK');

/* Et tal, eller null. Og det er IKKE det samme som Number(v).

   Number(null) er 0, og 0 er et gyldigt tal. Så `Number.isFinite(Number(l.km))`
   siger sandt om en annonce uden kilometerstand, og listen skrev "0 km" — en
   påstand om en fabriksny maskine, på 163 af 332 annoncer. Samme fælde gav
   "årgang 0". null betyder uoplyst; det skal ikke kunne blive til et nul
   undervejs. Se den længere version i js/backend-bridge.js. */
function tilTal(v){
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* Mærkesidens indledning. Den er sidens ENESTE egne ord, og derfor det sted,
   hvor en manglende værdi bliver en påstand.

   Hvert led er betinget, og det er ikke pedanteri: målt på lageret har 22 af
   332 annoncer ingen pris (kilden skriver "ring for pris" — prisen ER oplyst,
   som "spørg"), og 163 af 332 har ingen kilometerstand. Den gamle udgave
   skrev prisspændet ubetinget og ville have sat "null kr." på siden, og
   Math.min over et felt med huller giver NaN.

   Sætningen om kilden står med, når annoncerne er indekserede. En side, der
   siger "til salg på Bikerbasen" om 204 motorcykler, der står hos MC Syd og
   handles dér, ville påstå at være markedsplads for dem. Kortene siger det
   allerede ("Annonce fra MC Syd"); indledningen skal sige det samme. */
function introFor(brand, items){
  const priser = items.map(l => tilTal(l.price)).filter(p => p !== null && p > 0)
    .sort((a, b) => a - b);
  const aar = items.map(l => tilTal(l.year)).filter(y => y !== null && y > 0);
  const types = [...new Set(items.map(l => l.type))]
    .map(t => ((global.__T || []).find(x => x.id === t) || {}).label).filter(Boolean);
  const eksterne = items.filter(l => l.isExternal);
  const kilder = [...new Set(eksterne.map(l => l.source?.navn).filter(Boolean))];

  const en = items.length === 1;
  const dele = [`Der er lige nu <strong>${items.length}</strong> ${en ? 'brugt' : 'brugte'} ${esc(brand)} `
    + `${en ? 'motorcykel' : 'motorcykler'} til salg på Bikerbasen`];

  if (priser.length > 1 && priser[0] !== priser[priser.length - 1]){
    dele.push(` — fra ${dkk(priser[0])} til ${dkk(priser[priser.length - 1])}`);
  } else if (priser.length){
    dele.push(` — til ${dkk(priser[0])}`);
  }
  if (aar.length){
    const lav = Math.min(...aar), hoej = Math.max(...aar);
    dele.push(lav === hoej ? `, årgang ${lav}.` : `, med årgange mellem ${lav} og ${hoej}.`);
  } else {
    dele.push('.');
  }
  if (types.length){
    // "m.fl." har sit eget punktum. Uden det her tjek stod der "m.fl..".
    dele.push(` Udvalget dækker ${types.slice(0, 3).map(esc).join(', ')}${types.length > 3 ? ' m.fl.' : '.'}`);
  }
  if (priser.length && priser.length < items.length){
    const uden = items.length - priser.length;
    dele.push(` ${uden} ${uden === 1 ? 'annonce oplyser' : 'annoncer oplyser'} pris ved henvendelse.`);
  }
  if (eksterne.length && kilder.length){
    const hvem = eksterne.length === items.length
      ? (en ? 'Annoncen er' : 'Annoncerne er')
      : `${eksterne.length} af annoncerne er`;
    dele.push(` ${hvem} indekseret fra ${kilder.map(esc).join(' og ')}, og handlen sker hos kilden.`);
  }
  if (eksterne.length < items.length){
    dele.push(' Alle annoncer er mærket som enten privat sælger eller forhandler,'
      + ' så du kan se dine rettigheder før du køber.');
  }
  return dele.join('');
}

/* ============ SEO content builder 3 — mærkesidens tekstpakke ============

   Alt herunder er ekstra tekst OVEN PÅ den eksisterende introFor() —
   introFor() selv er urørt (den er testet i scripts/maerkeside.test.js, og
   den fil hører ikke til denne runde). Reglen er: et mærke skal have mindst
   MIN_LISTINGS_FULD_TEKST rigtige annoncer, før det får den fulde pakke
   (titel-mønster, FAQ, bundindhold). Under grænsen bliver siden stående —
   den bærer rigtigt lager, og at slette den ville slette et rigtigt fund —
   men den påstår ikke at være en landingsside for mærket: den får ingen
   arvesætning, ingen FAQ, intet bundindhold, og bliver noindex. */
const MIN_LISTINGS_FULD_TEKST = 5;

/* Almindeligt kendt, IKKE tal-baseret viden om hvert mærke — hvad det er
   kendt for. Ingen tal her: hvert tal i sidens tekst kommer fra den rigtige
   forespørgsel nedenfor, aldrig herfra. Kun de mærker, der rent faktisk KAN
   nå MIN_LISTINGS_FULD_TEKST i dag, er med. Vokser et mærke, der IKKE står
   her, over grænsen i en senere crawl, får det den datadrevne tekst UDEN
   arvesætningen — se heritageFor() — i stedet for en opfundet påstand. */
const BRAND_ARV = {
  'Honda': 'Honda er verdens største motorcykelproducent og kendt for driftssikkerhed og et usædvanligt bredt program — fra små citymodeller til CBR-sportscykler, Africa Twin-adventure og Gold Wing-tourere.',
  'Harley-Davidson': 'Harley-Davidson er den amerikanske cruisertradition: tunge V-twin-motorer, lav sadelhøjde og en udbredt custom-kultur, hvor mange ejere bygger om undervejs.',
  'Yamaha': 'Yamaha spænder fra MT-seriens nakede gadecykler og R-seriens sportscykler til klassiske cruisere og tourere — et bredt japansk program med et solidt ry for holdbarhed.',
  'Suzuki': 'Suzuki er kendt for GSX-R-sportscyklerne og alsidige mellemklassemodeller som Bandit og V-Strom — japansk teknik med et langt ry for at holde.',
  'Triumph': 'Triumph bærer den britiske motorcykeltradition videre: Bonneville- og Speed Twin-linjen holder den klassiske stil i live, mens Tiger og Speed Triple dækker adventure og naked.',
  'Kawasaki': 'Kawasaki er kendt for Ninja-sportscyklerne og de kraftfulde Z-nakede modeller — et mærke med et udpræget performance-ry.',
  'BMW': 'BMW er tæt knyttet til GS-seriens adventure-touring og den karakteristiske boxermotor — historisk et mærke for lange distancer og solidt udstyr.',
  'KTM': 'KTM har rødder i offroad- og enduroracing, og det mærkes på gadecyklerne: lette, aggressive chassiser i den karakteristiske orange farve.',
  'Royal Enfield': 'Royal Enfield bygger enkle, klassisk stilede motorcykler med lav vægt og moderat effekt — ofte valgt som en overkommelig førstemotorcykel eller til A2-kørekortet.',
  'Aprilia': 'Aprilia er det italienske racingmærke: RSV-sportscyklerne bygger på Grand Prix-teknologi, og Tuono er den nakede udgave af samme arv.',
};

/* Hvad der er værd at tjekke på en brugt mc, sat efter hvilken TYPE der rent
   faktisk dominerer mærkets udvalg lige nu — ikke en påstand om mærket, men
   almindelig, mærkeuafhængig købsviden knyttet til den kategori, tallene
   viser mest af. Typer uden en dominerende kategori (eller en type, der ikke
   findes her) får TYPE_TJEK_STANDARD i stedet for at stå uden noget. */
const TYPE_TJEK = {
  cruiser: 'Tjek krom og udstødning for rust, slitage på primærkæde eller -rem, og om sadelhøjden passer dig — en tung cruiser er svær at rejse op alene, hvis den vælter på stativet.',
  adventure: 'Tjek styrtbøjler og fodhviler for tegn på et tidligere fald, kæde- og dækslitage (mange har kørt offroad), og om det oprindelige udstyr — bagagesystem, styrtsikring — følger med.',
  touring: 'Tjek elektronik og komfortudstyr (varme greb, kabine, lydanlæg) grundigt, og spørg ind til servicehistorikken — tourere har typisk kørt langt, og det er der, sliddet gemmer sig.',
  sport: 'Tjek for styrtskader — revnet kåbe, ridser på bremseskiver og styr — samt dæk- og kædeslitage, og spørg om den har kørt på bane. Det siger mere om standen end kilometertallet.',
  naked: 'Tjek dæk og kæde eller rem for slitage, og se grundigt efter buler og ridser — uden kåbe er der intet, der skjuler sporene efter et tidligere fald.',
  classic: 'Tjek for rust, om de elektriske dele stadig er originale, og om reservedele overhovedet kan skaffes — en ældre årgang kræver typisk mere kærlighed end en nyere.',
  scooter: 'Tjek rem eller variator for slitage, og om den har kørt kort i by eller langt på landevej — en scooter med mange bykilometer har sluppet lettere end en med motorvejskørsel.',
  cross: 'Tjek stel og fjedring for spor efter styrt, og spørg om den har kørt konkurrence — en crosser bliver typisk brugt hårdere end en gademotorcykel.',
};
const TYPE_TJEK_STANDARD = 'Tjek altid synsrapport, servicehistorik og antal ejere, uanset mærke og model — det siger mere om den faktiske stand end kilometertallet alene.';

/* Kørekortkategorien pr. annonce, talt op ét sted — samme funktion
   (koerekortForListing, fra js/data.js, indlæst for neden via eval) som
   resten af sitet bruger til det samme spørgsmål. Intet gættes: en annonce
   uden hk tælles som "ukendt", aldrig som en kategori. */
function licensOpsummering(items){
  const ud = { A1: 0, A2: 0, A: 0, ukendt: 0 };
  for (const l of items){
    const k = koerekortForListing(l);
    if (k === 'A1') ud.A1++;
    else if (k === 'A2') ud.A2++;
    else if (k === 'A') ud.A++;
    else ud.ukendt++;
  }
  return ud;
}

function median(sortedNums){
  if (!sortedNums.length) return null;
  const mid = Math.floor(sortedNums.length / 2);
  return sortedNums.length % 2
    ? sortedNums[mid]
    : Math.round((sortedNums[mid - 1] + sortedNums[mid]) / 2);
}

/* Prisbilledet for mærkets annoncer — én forespørgsel, genbrugt af titel,
   meta description, bundindhold og FAQ, så de fire aldrig kan komme i
   modstrid med hinanden om det samme tal. */
function prisStatistik(items){
  const priser = items.map(l => tilTal(l.price)).filter(p => p !== null && p > 0).sort((a, b) => a - b);
  return {
    antal: priser.length,
    min: priser.length ? priser[0] : null,
    max: priser.length ? priser[priser.length - 1] : null,
    median: median(priser),
    udenPris: items.length - priser.length,
  };
}

function dominerendeType(items){
  const antal = new Map();
  for (const l of items){ if (l.type) antal.set(l.type, (antal.get(l.type) || 0) + 1); }
  if (!antal.size) return null;
  const sorteret = [...antal.entries()].sort((a, b) => b[1] - a[1]);
  const [id, count] = sorteret[0];
  const label = ((global.__T || []).find(t => t.id === id) || {}).label || id;
  return { id, label, count };
}

function topModeller(items, n){
  const antal = new Map();
  for (const l of items){
    const m = String(l.model || '').trim();
    if (m) antal.set(m, (antal.get(m) || 0) + 1);
  }
  return [...antal.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'da')).slice(0, n);
}

/* TITLE — "{Brand} brugt – X til salg | Bikerbasen", maks 60 tegn. Kun
   kaldt for mærker med fuld tekst; se MIN_LISTINGS_FULD_TEKST. */
function titelFor(brand, n){
  return `${brand} brugt – ${n} til salg | Bikerbasen`;
}

/* META DESCRIPTION — 140-155 tegn, rigtigt antal, rigtigt prisspænd, én
   differentiator. "Ingen kommission af salget" er sitets eget løfte
   (index.html, sektionen "Gratis annonce — set af hele Danmark") — ikke
   opfundet her. Sætningerne vælges i prioriteret rækkefølge, indtil
   længden lander i vinduet; det holder teksten sand for både et mærke med
   ét kort prisord (Royal Enfield) og et med et langt (Harley-Davidson). */
function metaBeskrivelseFor(brand, n, stats){
  const prisled = stats.min == null
    ? ''
    : stats.min === stats.max
      ? ` til ${dkk(stats.min)}`
      : ` fra ${dkk(stats.min)} til ${dkk(stats.max)}`;
  const kandidater = [
    `Se ${n} brugte ${brand}${prisled} på Bikerbasen. Ingen kommission af salget.`
      + ' Sammenlign pris, årgang og km i hele Danmark.',
    `Se ${n} brugte ${brand}${prisled} på Bikerbasen. Ingen kommission af salget.`
      + ' Sammenlign pris og årgang i hele Danmark.',
    `Se ${n} brugte ${brand} til salg${prisled} på Bikerbasen — ingen kommission af salget,`
      + ' sammenlign pris og årgang i hele Danmark.',
    `${n} brugte ${brand}${prisled}. Ingen kommission af salget. Sammenlign hos Bikerbasen.`,
  ];
  // Den første, der lander i [140,155], vinder. Rammer ingen af dem
  // vinduet (meget korte eller meget lange mærkenavne), bruges den, der
  // ligger tættest på — aldrig en tekst, der er skåret midt i et ord.
  let bedst = kandidater[0], bedstAfstand = Infinity;
  for (const k of kandidater){
    if (k.length >= 140 && k.length <= 155) return k;
    const afstand = k.length < 140 ? 140 - k.length : k.length - 155;
    if (afstand < bedstAfstand){ bedst = k; bedstAfstand = afstand; }
  }
  return bedst;
}

function faqLd(faqs){
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/* De tre spørgsmål — samme tre emner (pris, kørekort, modeller), men
   svarene er beregnet af DETTE mærkes tal, aldrig en skabelon med
   mærkenavnet skiftet ud. */
function faqFor(brand, items, stats, kk){
  const n = items.length;
  const spg = [];

  let prisSvar;
  if (!stats.antal){
    prisSvar = `Ingen af de ${n} ${brand}-annoncer på Bikerbasen har en opgivet pris lige nu — alle sælgere skriver "ring for pris" i stedet. Kontakt sælgeren gennem annoncen for at høre prisen, eller søg videre blandt andre mærker, mens du venter på svar.`;
  } else {
    const enkelt = stats.antal === n;
    // BEMÆRK: dkk() slutter selv på "kr." — der må ALDRIG stå et ekstra
    // punktum lige efter et dkk()-kald ("kr..", fundet og rettet under
    // efterprøvning). Sætningen fortsætter derfor altid med et mellemrum,
    // aldrig med et punktum, umiddelbart efter et dkk()-udtryk.
    prisSvar = (enkelt
      ? `Alle ${n} ${brand}-annoncer på Bikerbasen har opgivet en pris. `
      : `${stats.antal} af de ${n} ${brand}-annoncer på Bikerbasen har opgivet en pris. `)
      + `Den spænder fra ${dkk(stats.min)} til ${dkk(stats.max)}, og medianen — det midterste beløb, hvis alle priserne blev stillet på række — ligger på ${dkk(stats.median)}`
      + (stats.udenPris
        ? ` De resterende ${stats.udenPris} ${stats.udenPris === 1 ? 'annonce' : 'annoncer'} oplyser i stedet pris ved henvendelse.`
        : ', hvilket giver et hurtigt billede af, hvad der er normalt at betale for mærket lige nu.');
  }
  spg.push({ q: `Hvad koster en brugt ${brand}-motorcykel?`, a: prisSvar });

  const kendtKK = kk.A1 + kk.A2 + kk.A;
  let kkSvar;
  if (!kendtKK){
    kkSvar = `Det kan vi ikke se ud fra dataene i dag — ingen af de ${n} ${brand}-annoncer oplyser den effekt i hk, der afgør kørekortkategorien. Kilden til de indekserede annoncer sender ikke tallet med, og Bikerbasen gætter aldrig på den slags — vi viser hellere ingen kategori end en forkert.`;
  } else if (!(kk.A1 + kk.A2)){
    kkSvar = `Nej, ikke blandt de annoncer, vi kan afgøre — ${kk.A} af ${kendtKK} ${brand}-annoncer med kendt effekt kræver stort kørekort (kategori A), altså mere end de ${A2_MAX_HK} hk (35 kW), som A2 tillader. Har du kategori A, må du under alle omstændigheder køre dem alle.`
      + (kk.ukendt ? ` De resterende ${kk.ukendt} ${kk.ukendt === 1 ? 'annonce' : 'annoncer'} mangler effektoplysningen og vises derfor uden kategori.` : '');
  } else {
    kkSvar = `Ja, til dels — ${kk.A1 + kk.A2} af ${kendtKK} ${brand}-annoncer med kendt effekt holder sig under A2-loftet på ${A2_MAX_HK} hk${kk.A1 ? ` (heraf ${kk.A1} også inden for A1-grænsen)` : ''}, mens ${kk.A} kræver stort kørekort. Du kan filtrere direkte på kørekort i søgningen på Bikerbasen, så du kun ser dem, du faktisk må køre.`
      + (kk.ukendt ? ` De resterende ${kk.ukendt} ${kk.ukendt === 1 ? 'annonce' : 'annoncer'} mangler effektoplysningen hos kilden.` : '');
  }
  spg.push({ q: `Kan man køre ${brand} på A2-kørekort?`, a: kkSvar });

  const top = topModeller(items, 3);
  let modelSvar;
  if (!top.length){
    modelSvar = `Lige nu er der ${n} ${brand}-annoncer på Bikerbasen, men ingen af dem har et modelnavn, vi kan liste her. Søg i hele udvalget for at se dem alle, eller brug prisfiltret til at snævre det ind selv.`;
  } else {
    const navne = top.map(([m, c]) => `${m} (${c} stk.)`);
    modelSvar = `Blandt de ${n} ${brand}-annoncer går ${navne.join(', ')} igen flest gange lige nu. Udvalget skifter løbende i takt med nye annoncer, så søg i alle ${brand}-annoncer for at se præcis, hvad der er til salg i dag.`;
  }
  spg.push({ q: `Hvilke ${brand}-modeller kan jeg finde brugt på Bikerbasen?`, a: modelSvar });

  return spg;
}

/* Bundindholdet — 2-3 H2'er under gitteret. Alt tal-baseret er beregnet
   ovenfor; "andetBrand" er det qua-median nærmeste andet mærke MED fuld
   tekst, så krydslinket er en rigtig sammenligning, ikke et tilfældigt
   link. */
function bundIndholdFor(brand, slug, items, stats, kk, domType, andetBrand){
  const n = items.length;
  const dele = [];

  dele.push(`<h2 class="brand-sub">Prisniveau for brugte ${esc(brand)}</h2>`);
  if (stats.antal){
    const spaend = stats.max / stats.min;
    let p = `De ${stats.antal} ${esc(brand)}-annoncer med opgivet pris ligger mellem ${dkk(stats.min)} og ${dkk(stats.max)}, med en median på ${dkk(stats.median)}`;
    if (spaend >= 3){
      const gange = spaend >= 10 ? String(Math.round(spaend)) : spaend.toFixed(1).replace('.', ',');
      p += ` — den dyreste annonce koster ${gange} gange så meget som den billigste, så udvalget dækker både billige startmotorcykler og dyrere modeller.`;
    } else {
      p += ' — udvalget ligger forholdsvis samlet i pris, uden langt fra den billigste til den dyreste annonce lige nu.';
    }
    if (stats.udenPris){
      p += ` ${stats.udenPris} ${stats.udenPris === 1 ? 'annonce' : 'annoncer'} har ingen opgivet pris og skal kontaktes for at få den.`;
    }
    if (andetBrand){
      p += ` Ligger prisniveauet uden for budgettet, ligger <a href="maerke-${slugify(andetBrand)}.html">brugte ${esc(andetBrand)}</a> typisk i samme leje.`;
    }
    dele.push(`<p>${p}</p>`);
  } else {
    dele.push(`<p>Ingen af de ${n} ${esc(brand)}-annoncer har en opgivet pris lige nu — alle sælgere skriver "ring for pris" i stedet, så du skal spørge direkte for at få et tal.</p>`);
  }

  dele.push(`<h2 class="brand-sub">Kørekort til brugt ${esc(brand)}</h2>`);
  const kendtKK = kk.A1 + kk.A2 + kk.A;
  if (!kendtKK){
    dele.push(`<p>Ingen af de ${n} ${esc(brand)}-annoncer oplyser den effekt (hk), der afgør kørekortkategorien — kilderne til de indekserede annoncer sender ikke tallet med. Vi viser derfor ingen kategori i stedet for at gætte.</p>`);
  } else {
    const a1a2 = kk.A1 + kk.A2;
    let p = `Ud af ${n} annoncer kan vi afgøre kørekortkategorien på ${kendtKK}: ${kk.A} kræver stort kørekort (kategori A), altså over de ${A2_MAX_HK} hk (35 kW), A2 tillader`
      + (a1a2 ? `, og ${a1a2} holder sig inden for A2-loftet${kk.A1 ? ` (heraf ${kk.A1} også inden for det lille A1-kørekort)` : ''}.` : '.');
    if (kk.ukendt){
      p += ` De resterende ${kk.ukendt} ${kk.ukendt === 1 ? 'annonce' : 'annoncer'} mangler effektoplysningen hos kilden og vises uden kategori.`;
    }
    if (a1a2){
      p += ` <a href="soegning.html?brands=${encodeURIComponent(brand)}&amp;koerekort=A2">Se de ${a1a2} ${esc(brand)}, der kan køres på A1 eller A2</a>.`;
    }
    dele.push(`<p>${p}</p>`);
    /* Krydslink til de faktiske A1/A2-facetsider (koerekort-a1.html,
       koerekort-a2.html) — bygget i samme runde, men mærkesiderne linkede
       kun ind i soegning.html's søgefilter, aldrig ud til de nye statiske,
       indekserbare sider. Fundet af runde 3's SEO-kritiker. */
    const facetLinks = [];
    if (kk.A1) facetLinks.push('<a href="koerekort-a1.html">Se alle motorcykler på A1-kørekort</a>');
    if (a1a2) facetLinks.push('<a href="koerekort-a2.html">Se alle motorcykler på A2-kørekort</a>');
    if (facetLinks.length) dele.push(`<p>${facetLinks.join(' · ')}</p>`);
  }

  dele.push(`<h2 class="brand-sub">Hvad du skal tjekke, når du køber en brugt ${esc(brand)}</h2>`);
  const tjek = TYPE_TJEK[domType?.id] || TYPE_TJEK_STANDARD;
  let checkP = tjek;
  if (domType && domType.count < n){
    checkP += ` (Rådet gælder mest for ${domType.label.toLowerCase()}, som ${domType.count} af de ${n} annoncer er — se selve annoncen for resten.)`;
  }
  checkP += ` Bikerbasen har ikke selv efterset motorcyklerne — se <a href="sikkerhed.html">rådene om tryg handel</a> før du kører af sted for at se en.`;
  dele.push(`<p>${checkP}</p>`);

  return dele.join('\n      ');
}

/* Linjen i <noscript>-listen. Hvert led er betinget af samme grund som i
   introFor(): 163 af 332 annoncer har ingen kilometerstand, og den gamle
   udgave kaldte l.km.toLocaleString() ubetinget. Det ville ikke have givet et
   grimt tal — det ville have kastet en TypeError midt i byggeriet af siden.
   Manglende felter nævnes ikke; en liste er ikke stedet for "Ikke oplyst". */
function noscriptLinje(l){
  const navn = [l.brand, l.model].filter(Boolean).map(esc).join(' ');
  const aar = tilTal(l.year), pris = tilTal(l.price), km = tilTal(l.km);
  const fakta = [
    aar && aar > 0 ? String(aar) : null,
    pris !== null && pris > 0 ? dkk(pris) : 'pris ved henvendelse',
    km !== null ? `${tal(km)} km` : null,
  ].filter(Boolean);
  const sted = String(l.city || '').trim();
  return `${navn}${fakta.length ? ' — ' + fakta.map(esc).join(', ') : ''}${sted ? ` (${esc(sted)})` : ''}`;
}

function byg(){
/* "Ukendt" er ikke et mærke, man søger på — normalizeExternalListing sætter
   det, når kilden ikke oplyser mærket. En maerke-ukendt.html ville være en
   side uden søgeord og uden mening. I dag er der 0 af dem; spærren er der,
   fordi den næste kilde kan have nogle. */
const byBrandRaw = {};
LISTINGS.filter(l => l.brand && l.brand !== 'Ukendt')
  .forEach(l => { (byBrandRaw[l.brand] = byBrandRaw[l.brand] || []).push(l); });

/* To mærkenavne kan give SAMME slug uden at være det samme tegn for tegn —
   "Royal Enfield" og "Royal-enfield" bliver begge maerke-royal-enfield.html.
   To kilder (MC Syd, den nye Gul og Gratis-crawler) skriver mærket lidt
   forskelligt, og slugify() ser kun bogstaver og tal.

   Ubemærket overskrev den ene byggeriets fil, den andens 9 annoncer forsvandt
   tavst fra siden og grid'en, OG sitemappet fik den samme adresse to gange —
   efterprøvet på HEAD: "Built 21 brand pages" men kun 20 filer på disk, samme
   URL to gange i sitemap.xml, og maerker.html's beskrivelse påstod "21
   mærker" hvor der reelt kun er 20 sider. Samme fejlklasse som D-010's
   versalfælde (maerkerUdenLager ovenfor), bare på filnavnet i stedet for på
   søgefiltret.

   Løsningen er at slå navnene sammen PÅ SLUG, før noget bygges eller tælles.
   Det navn med flest annoncer bliver sidens overskrift; ingen annoncer
   forsvinder, de lægges sammen i én liste. */
const slugGrupper = {};
for (const navn of Object.keys(byBrandRaw)){
  const slug = slugify(navn);
  (slugGrupper[slug] = slugGrupper[slug] || []).push(navn);
}
const byBrand = {};
for (const slug in slugGrupper){
  const navne = slugGrupper[slug].sort((a, b) => byBrandRaw[b].length - byBrandRaw[a].length);
  byBrand[navne[0]] = navne.flatMap(n => byBrandRaw[n]);
}

const brands = Object.keys(byBrand)
  .filter(b => byBrand[b].length > 0)   // en tom mærkeside er en blindgyde, ikke en landingsside
  .sort((a, b) => a.localeCompare(b, 'da'));

/* Medianprisen for hvert mærke, der FÅR den fulde tekstpakke — beregnet én
   gang før løkken, så "sammenlign med"-linket i bundIndholdFor() kan finde
   det qua-median nærmeste andet mærke uden at gense hele lageret pr. mærke. */
const medianOversigt = {};
for (const b of brands){
  if (byBrand[b].length < MIN_LISTINGS_FULD_TEKST) continue;
  const m = prisStatistik(byBrand[b]).median;
  if (m != null) medianOversigt[b] = m;
}
function naermesteMedianBrand(brand, brandMedian){
  if (brandMedian == null) return null;
  let bedst = null, bedstAfstand = Infinity;
  for (const [b, m] of Object.entries(medianOversigt)){
    if (b === brand) continue;
    const afstand = Math.abs(m - brandMedian);
    if (afstand < bedstAfstand){ bedst = b; bedstAfstand = afstand; }
  }
  return bedst;
}

/* Ryd forældede mærkesider. Uden dette bliver en side liggende med gammelt
   indhold, når det sidste eksemplar af et mærke er solgt — og den ville
   stadig kunne findes via Google. */
const forventede = new Set(brands.map(b => `maerke-${slugify(b)}.html`));
let slettet = 0;
for (const f of fs.readdirSync(ROOT)){
  if (/^maerke-.+\.html$/.test(f) && !forventede.has(f)){
    fs.unlinkSync(path.join(ROOT, f));
    slettet++;
  }
}
if (slettet) console.log(`Fjernede ${slettet} forældede mærkesider.`);

let built = 0;
for (const brand of brands){
  // Samme raekkefoelge som js/maerke.js: nyeste foerst.
  const items = byBrand[brand].slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const kort = items.map((l, i) => listingCardHTML(l, i)).join('\n      ');
  const foersteFoto = (items[0] && items[0].photoUrls && items[0].photoUrls[0]) || null;
  const slug = slugify(brand);

  /* Modelchips: de modeller, der ER på lager, ikke en kurateret liste.

     BRANDS_BY_MODEL i js/data.js er en redaktionel liste over kendte modeller,
     og hvert chip er et link til soegning.html?brands=X&q=model. Er modellen
     ikke på lager, er linket en blindgyde — samme fejl som mærkeindekset blev
     kritiseret for (D-010: 44 links til søgeresultater med nul indhold). Vi
     bruger derfor de modeller, annoncerne faktisk har. De rammer altid noget,
     og listen holder sig selv opdateret.

     Sorteret efter antal, så det største udvalg står først. */
  const modelAntal = new Map();
  for (const l of items){
    const m = String(l.model || '').trim();
    if (m) modelAntal.set(m, (modelAntal.get(m) || 0) + 1);
  }
  const allModels = [...modelAntal.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'da'))
    .slice(0, 12).map(([m]) => m);

  const beskrivelse = `Se ${items.length} brugte ${brand} `
    + `${items.length === 1 ? 'motorcykel' : 'motorcykler'} til salg i Danmark. `
    + 'Sammenlign pris, årgang, km-stand og ccm på Bikerbasen.';

  /* ---- SEO content builder 3: den fulde tekstpakke, kun for mærker med
     mindst MIN_LISTINGS_FULD_TEKST rigtige annoncer ---- */
  const kvalificeret = items.length >= MIN_LISTINGS_FULD_TEKST;
  const stats = prisStatistik(items);
  const kk = licensOpsummering(items);
  const domType = dominerendeType(items);
  const andetBrand = kvalificeret ? naermesteMedianBrand(brand, stats.median) : null;

  const titelRaa = kvalificeret ? titelFor(brand, items.length)
    : `Brugte ${brand} motorcykler til salg — Bikerbasen`;
  const metaDescRaa = kvalificeret ? metaBeskrivelseFor(brand, items.length, stats) : beskrivelse;
  const arvSaetning = kvalificeret ? BRAND_ARV[brand] : null;
  const introTekst = arvSaetning ? `${arvSaetning} ${introFor(brand, items)}` : introFor(brand, items);
  const faqs = kvalificeret ? faqFor(brand, items, stats, kk) : null;
  const bundHtml = kvalificeret ? bundIndholdFor(brand, slug, items, stats, kk, domType, andetBrand) : '';

  /* Under grænsen bliver siden IKKE slettet (den bærer rigtigt lager — se
     MIN_LISTINGS_FULD_TEKST ovenfor), men den skal ikke konkurrere om at
     blive indekseret som en landingsside for mærket, når den kun har 1-4
     annoncer og ingen af den fulde teksts afsnit. Samme mønster som
     login.html (build-meta.js) og de indekserede annoncer (js/seo.js). */
  const noindexMeta = kvalificeret ? '' : '<meta name="robots" content="noindex, follow">\n';

  const html = `<!doctype html>
<html lang="da">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${csp}
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>${esc(titelRaa)}</title>
<meta name="description" content="${esc(metaDescRaa)}">
${noindexMeta}<!-- Canonical staar HER, ikke kun i det blok scripts/build-meta.js skriver
     bagefter. En ny side skal aldrig kunne naa produktionen uden: soegesidens
     facetter samler sig allerede paa soegning.html, og en maerkeside uden
     canonical ville vaere den naeste kilde til duplicate content.
     Uden filendelse (cleanUrl) — SEO-runde 3, builder B: GitHub Pages loeser
     "maerke-${slug}" om til "maerke-${slug}.html" af sig selv, saa den rene
     adresse er den, en bruger og Google rent faktisk lander paa. -->
<link rel="canonical" href="${cleanUrl(`maerke-${slug}.html`)}">
<link rel="icon" href="favicon.png?v=logo1" type="image/png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<script>try{var t=localStorage.getItem("bb_theme");if(t)document.documentElement.setAttribute("data-theme",t);}catch(e){}</script>
<link rel="preconnect" href="https://hkcjrwglwurdjnobewzb.supabase.co" crossorigin>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="preload" href="fonts/spacegrotesk.woff2?v=1" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/ibmplexsans.woff2?v=1" as="font" type="font/woff2" crossorigin>
<style>
@font-face{font-family:'Space Grotesk';font-style:normal;font-weight:500 700;font-display:swap;src:url(fonts/spacegrotesk.woff2?v=1) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:400 700;font-display:swap;src:url(fonts/ibmplexsans.woff2?v=1) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
</style>
${foersteFoto ? `<link rel="preload" as="image" href="${foersteFoto}" fetchpriority="high">
` : ''}<link rel="stylesheet" href="css/styles.css">
${jsonLdBlock([
  breadcrumbLd([
    { name: 'Forside', path: 'index.html' },
    { name: 'Mærker', path: 'maerker.html' },
    { name: brand, path: `maerke-${slug}.html` },
  ]),
  brandItemListLd(brand, items),
  faqs ? faqLd(faqs) : null,
])}
</head>
<body>
${header}

<main id="main-content">
  <div class="container">
    <nav class="breadcrumb" aria-label="Brødkrumme">
      <a href="index.html">Forside</a><span class="bc-sep"></span>
      <a href="maerker.html">Mærker</a><span class="bc-sep"></span>
      <span>${esc(brand)}</span>
    </nav>

    <div class="brand-hero">
      <h1>Brugte ${esc(brand)}-motorcykler i Danmark</h1>
      <p class="brand-intro">${introTekst}</p>
      <div class="brand-actions">
        <a href="soegning.html?brands=${encodeURIComponent(brand)}" class="btn btn-primary">Søg i alle ${esc(brand)}</a>
        <a href="opret-annonce.html" class="btn btn-outline">Sælg din ${esc(brand)}</a>
      </div>
    </div>

    ${allModels.length ? `<section class="section" style="padding-top:0;">
      <!-- "Se X efter model", ikke "Populaere X-modeller" og ikke "alle
           modeller til salg": raekken er de 12 med flest annoncer, og
           overskriften maa hverken paastaa popularitet, vi ikke maaler, eller
           fuldstaendighed, den ikke har. Den er en navigationsetiket. -->
      <h2 class="brand-sub">Se ${esc(brand)} efter model</h2>
      <div class="popular-row">
        ${allModels.map(m => `<a class="popular-chip" href="soegning.html?brands=${encodeURIComponent(brand)}&amp;q=${encodeURIComponent(m)}">${esc(m)}</a>`).join('\n        ')}
      </div>
    </section>` : ''}

    <section class="section" style="padding-top:var(--space-6);">
      <h2 class="brand-sub">${items.length} ${items.length === 1 ? 'annonce' : 'annoncer'} til salg nu</h2>
      <div class="listings-grid" id="brand-listings" data-brand="${esc(brand)}">${kort}</div>
      <noscript>
        <ul class="brand-noscript">
          ${items.map(l => `<li><a href="${esc(internAdresse(l))}">${noscriptLinje(l)}</a></li>`).join('\n          ')}
        </ul>
      </noscript>
    </section>

    ${kvalificeret ? `<section class="section" style="padding-top:0;">
      ${bundHtml}
    </section>

    <section class="section" style="padding-top:0;">
      <h2 class="brand-sub">Ofte stillede spørgsmål om brugte ${esc(brand)}</h2>
      ${faqs.map(f => `<details class="brand-faq-item">
        <summary>${esc(f.q)}</summary>
        <p class="brand-intro">${esc(f.a)}</p>
      </details>`).join('\n      ')}
    </section>` : ''}

    <section class="section" style="padding-top:0;">
      <h2 class="brand-sub">Andre mærker</h2>
      <div class="popular-row">
        ${brands.filter(b => b !== brand).slice(0, 10).map(b => `<a class="popular-chip" href="maerke-${slugify(b)}.html">${esc(b)}</a>`).join('\n        ')}
        <a class="popular-chip" href="maerker.html">Alle mærker</a>
      </div>
    </section>
  </div>
</main>

${footer}

<script defer src="js/security.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script defer src="js/supabase-config.js"></script>
<script defer src="js/supabase-api.js"></script>
<script defer src="js/icons.js"></script>
<script defer src="js/bike-art.js"></script>
<!-- js/postnumre.js (40.050 B rå / 7.482 B gzip) er væk: findPostnr() kaldes
     kun fra js/annonce.js og js/opret-annonce.js, og en mærkeside har nul
     formularfelter. Den lå i den samme kø som fonte og css og forsinkede
     første maling uden at nogen på siden spurgte efter den. -->
<script defer src="js/data.js"></script>
<script defer src="js/store.js"></script>
<script defer src="js/backend-bridge.js"></script>
<script defer src="js/components.js"></script>
<script defer src="js/maerke.js"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, `maerke-${slug}.html`), html, 'utf8');
  built++;
}

/* ---- Brand index ---- */
const udenLager = maerkerUdenLager(Object.keys(BRANDS_BY_MODEL), brands);

const indexHtml = `<!doctype html>
<html lang="da">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: https://hkcjrwglwurdjnobewzb.supabase.co; connect-src 'self' https://hkcjrwglwurdjnobewzb.supabase.co; object-src 'none'; base-uri 'self'; form-action 'self'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>Alle motorcykelmærker — Bikerbasen</title>
<meta name="description" content="Find brugte motorcykler efter mærke. Se udvalget fra ${brands.length} mærker med annoncer til salg i Danmark på Bikerbasen.">
<link rel="icon" href="favicon.png?v=logo1" type="image/png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<script>try{var t=localStorage.getItem("bb_theme");if(t)document.documentElement.setAttribute("data-theme",t);}catch(e){}</script>
<!-- Ingen preconnect: maerkeoversigten viser ingen annoncer og henter
     hverken data fra Supabase eller supabase-js fra jsDelivr (se
     scriptlisten nederst). En preconnect til en vaert, der aldrig
     kontaktes, koster DNS + TLS for ingenting — og de to haandtryk laa
     paa den kritiske sti foran fontene. -->
<link rel="preload" href="fonts/spacegrotesk.woff2?v=1" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/ibmplexsans.woff2?v=1" as="font" type="font/woff2" crossorigin>
<style>
@font-face{font-family:'Space Grotesk';font-style:normal;font-weight:500 700;font-display:swap;src:url(fonts/spacegrotesk.woff2?v=1) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:400 700;font-display:swap;src:url(fonts/ibmplexsans.woff2?v=1) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
</style>
<link rel="stylesheet" href="css/styles.css">
${jsonLdBlock([
  breadcrumbLd([
    { name: 'Forside', path: 'index.html' },
    { name: 'Mærker', path: 'maerker.html' },
  ]),
])}
</head>
<body>
${header}

<main id="main-content">
  <div class="container">
    <nav class="breadcrumb" aria-label="Brødkrumme">
      <a href="index.html">Forside</a><span class="bc-sep"></span><span>Mærker</span>
    </nav>

    <div class="brand-hero">
      <h1>Motorcykler efter mærke</h1>
      <p class="brand-intro">Gennemse brugte motorcykler efter mærke. Øverst dem, der er til salg lige nu — nederst dem, vi kender, men ikke har på lager i øjeblikket.</p>
    </div>

    ${brands.length ? `<section class="section" style="padding-top:0;">
      <div class="section-head"><div>
        <h2>Mærker med annoncer nu</h2>
        <p>Spring direkte til udvalget hos de mærker, der er til salg lige nu.</p>
      </div></div>
      <div class="brand-grid">
        ${brands.map(b => `<a class="brand-card" href="maerke-${slugify(b)}.html">
          <span class="brand-card-name">${esc(b)}</span>
          <span class="brand-card-count">${byBrand[b].length} ${byBrand[b].length === 1 ? 'annonce' : 'annoncer'}</span>
        </a>`).join('\n        ')}
      </div>
    </section>` : ''}

    ${udenLager.length ? `<section class="section" style="padding-top:0;">
      <div class="section-head"><div>
        <h2>Mærker uden annoncer lige nu (${udenLager.length})</h2>
        <p>Dem kender vi godt — der er bare ingen til salg i øjeblikket. Vi linker dem, når der er noget at vise.</p>
      </div></div>
      <p class="brand-intro">${udenLager.map(esc).join(', ')}.</p>
      <div class="brand-actions">
        <a href="soegning.html" class="btn btn-outline">Søg blandt alle ${tal(LISTINGS.length)} annoncer</a>
      </div>
    </section>` : ''}
  </div>
</main>

${footer}

<!-- Mærkeoversigten er ren statisk markup: alle mærkelinks står i HTML'en,
     og sidens JS er renderHeader() plus brødkrummepilen. Der er intet kald
     til backendReady(), ingen annoncekort og nul formularfelter — derfor er
     hele Supabase-stakken (supabase-js fra jsDelivr 55.453 B, config, api,
     backend-bridge) og js/postnumre.js (40.050 B rå) taget ud. Se den
     længere begrundelse i sikkerhed.html; det er samme rettelse.
     RØR IKKE listen uden at rette den tilsvarende i maerker.html — den her
     er kilden, siden genereres af scripts/build-brand-pages.js. -->
<script defer src="js/security.js"></script>
<script defer src="js/icons.js"></script>
<script defer src="js/bike-art.js"></script>
<script defer src="js/data.js"></script>
<script defer src="js/store.js"></script>
<script defer src="js/components.js"></script>
<script>document.addEventListener('DOMContentLoaded', () => {
  renderHeader('maerker.html');
  document.querySelectorAll('.bc-sep').forEach(s => s.innerHTML = Icon.chevronRight);
});</script>
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, 'maerker.html'), indexHtml, 'utf8');

/* ---- sitemap.xml so crawlers actually find the new pages ---- */
const base = BASE;
/* login.html er sat til noindex af build-meta.js. En noindex-side i
   sitemappet er et modsat signal, så den hører ikke med her. */
const staticPages = ['index.html','soegning.html','maerker.html','opret-annonce.html','sikkerhed.html','vilkaar.html','privatlivspolitik.html','om-bikerbasen.html','om-indeksering.html'];

/* Annoncerne er sidens egentlige long-tail — uden dem i sitemappet skal
   Google selv gætte sig frem via søgesiden, og den er JavaScript-drevet.
   lastmod følger annoncens updated_at, så en redigeret annonce genbesøges.

   KUN egne annoncer. De indekserede har ingen annonce-<slug>.html (den fil
   findes ikke, og deres side er noindex) — de ville have været 332 URL'er,
   der alle svarede 404. Et sitemap må kun indeholde adresser, der svarer 200,
   ellers er hele filen mistænkelig for Google, ikke bare den ene linje.
   harEgenSide() er den samme regel, som holder dem ude af ItemList'et. */
const listingUrls = LISTINGS.filter(harEgenSide).map(l => ({
  loc: listingSlug(l),
  lastmod: String(l.updated_at || l.createdAt || '').slice(0, 10),
}));

/* Forhandlerprofiler har ingen statisk side som annoncerne — forhandler.html?id=
   ER den kanoniske adresse. Uden et link herind udefra kan den kun findes ved
   at klikke gennem en af forhandlerens annoncer, så den hører til i sitemappet.
   Kun forhandlere (offentlig virksomhed), aldrig private sælgere — samme grænse
   som i JSON-LD'et, hvor en privat sælgers navn heller aldrig eksponeres.

   En indekseret annonce har ingen seller (normalizeExternalListing sætter den
   til null med vilje: vi kender kilden, ikke sælgeren), så MC Syd får ingen
   forhandlerprofil her. Det er rigtigt — vi har ingen side om dem at vise. */
const dealerLastmod = new Map();
for (const l of LISTINGS){
  if (!harEgenSide(l)) continue;
  if (!l.seller?.isDealer || !l.seller?.id) continue;
  const dato = String(l.updated_at || l.createdAt || '').slice(0, 10);
  const gammel = dealerLastmod.get(l.seller.id);
  if (!gammel || dato > gammel) dealerLastmod.set(l.seller.id, dato);
}
const dealerUrls = [...dealerLastmod.entries()].map(([id, lastmod]) => ({
  loc: `forhandler.html?id=${id}`,
  lastmod,
}));

/* Sitemappets adresser skal matche siden EGEN canonical, ellers peger vi
   Google mod en URL, siden selv siger ikke er den rigtige — SEO-runde 3,
   builder B.

   Statiske sider og mærkesider bruger cleanUrl(): deres canonical (denne fil
   og scripts/build-meta.js) er nu den udvidelsesfri adresse.
   Annonce- og forhandlerlinks beholder ".html" (+ evt. "?id="): deres
   canonical sættes af js/seo.js, som ikke røres i denne runde, og som stadig
   skriver filstien. At "rense" dem her uden at rense kilden ville give et
   sitemap, der er PÆNERE end den side, det peger på — samme fejlklasse som
   findingen C-015 (en påstand sitemappet ikke kan bakke op). */
const today = new Date().toISOString().slice(0,10);
const entries = [
  ...staticPages.map(u => ({ loc: cleanUrl(u), lastmod: today })),
  ...brands.map(b => ({ loc: cleanUrl(`maerke-${slugify(b)}.html`), lastmod: today })),
  ...listingUrls.map(e => ({ loc: `${base}/${e.loc}`, lastmod: e.lastmod })),
  ...dealerUrls.map(e => ({ loc: `${base}/${e.loc}`, lastmod: e.lastmod })),
];
const urls = entries;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(e => `  <url><loc>${esc(e.loc)}</loc><lastmod>${e.lastmod || today}</lastmod></url>`).join('\n')}
</urlset>
`, 'utf8');

fs.writeFileSync(path.join(ROOT, 'robots.txt'),
`User-agent: *
Allow: /
Sitemap: ${base}/sitemap.xml
`, 'utf8');

console.log(`Built ${built} brand pages + maerker.html + sitemap.xml (${urls.length} urls) + robots.txt`);
console.log(`  heraf ${listingUrls.length} annoncesider og ${brands.length} maerkesider. `
  + `${LISTINGS.length - LISTINGS.filter(harEgenSide).length} indekserede annoncer er MED VILJE ude af sitemappet (noindex).`);
}

/* Rækkefølgen skal være den SAMME som js/maerke.js ser den, ellers omrokerer
   mærkesiden, når javascriptet overtager. Klienten læser
   Store.getAllListings() = [egne fra db, lokale, demo, eksterne] og sorterer
   derefter på createdAt faldende. Eksterne har createdAt: null med vilje
   (foerst_set er crawldatoen, ikke annoncedatoen), så de falder bagest og
   holder deres indbyrdes orden fra databasen — sidst_set faldende. Den orden
   laves her ved at lægge listerne sammen i samme rækkefølge og bruge samme
   sammenligning; Array.prototype.sort er stabil. */
async function hentAlt(){
  const egne = await hentAnnoncer();
  const eksterne = await hentEksterne();
  if (!egne.length && !eksterne.length){
    throw new Error('Nul annoncer i alt — hverken egne eller indekserede. Build afbrudt: '
      + 'byg videre ville slette alle maerkesider og skrive et sitemap uden long-tail. '
      + 'Det er praecis den tilstand, findingen C-014 beskriver.');
  }
  return [...egne, ...eksterne]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

if (require.main === module){
  (async () => {
    LISTINGS = await hentAlt();
    byg();
  })().catch(e => { console.error(e.message); process.exit(1); });
}

/* Kun til tests (scripts/maerkeside.test.js). Sidens egne ord er det ene
   sted, hvor et manglende felt bliver en påstand, og de er derfor det ene
   sted her, det betaler sig at låse. require.main-gaten ovenfor er det, der
   gør en require() fra en test til noget andet end et helt byg. */
module.exports = { introFor, noscriptLinje, brandItemListLd, harEgenSide, internAdresse, maerkerUdenLager };
