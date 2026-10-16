/* Generates static brand landing pages (one file per brand that has listings).
   Re-run with: node scripts/build-brand-pages.js
   Static HTML carries the SEO-critical parts (title, meta, h1, intro, internal
   links); the listing grid itself hydrates client-side from the same dataset. */

const fs = require('fs');
const path = require('path');
const SEO = require('./seo-vagt');

const ROOT = path.join(__dirname, '..');
const { browserModules, fetchExternalListings, listingSlug } = require('./shared');
const { listingCardHTML, normalizeRemoteListing, normalizeExternalListing, Sortering, eksternErNy, markerTvaerkildeDubletter, Filtrering, standOpgoerelse: standOpg } = browserModules();

/* Sidens egne ikoner (js/icons.js) som markup — samme SVG'er som resten af
   sitet, ikke en ny ikonpakke. Filen er et almindeligt script med en
   top-level `const Icon`, så den kan hentes ud uden at røre browser-globaler. */
const ICON = new Function(fs.readFileSync(path.join(ROOT, 'js/icons.js'), 'utf8') + '\n;return Icon;')();

/* Runde 8 (D8-M3): maerkesiden tabte blinddommen paa FUNKTION — "Honda paa A2
   under 60.000" var to klik og et sideskift; hos Bilbasen nul. Uden at bygge
   sidebjaelken om: statiske, crawlbare facetlinks med tal OVER gitteret.
   Tallene regnes med soegesidens egen filterkaede (Filtrering.anvendFiltre),
   saa tallet paa linket ER tallet paa resultatsiden. Links med 0 tegnes ikke
   (D-009/D-010: et link er en paastand om, at der er noget for enden). */
function facetLinksFor(brand, items){
  const q = (ekstra) => `soegning.html?brands=${encodeURIComponent(brand)}&amp;${ekstra}`;
  const tael = (filtre) => Filtrering.anvendFiltre(items, filtre, null, null).length;
  const raekker = [];

  const kk = ['A1', 'A2', 'A'].map(k => ({ k, n: tael({ koerekort: k }) })).filter(x => x.n > 0);
  if (kk.length > 1) raekker.push({ navn: 'Kørekort', links: kk.map(x => ({ tekst: `${x.k} · ${x.n}`, href: q(`koerekort=${x.k}`) })) });

  const pris = [[30000, 'Under 30.000 kr.'], [60000, 'Under 60.000 kr.'], [100000, 'Under 100.000 kr.']]
    .map(([max, tekst]) => ({ tekst, max, n: tael({ priceMax: max }) })).filter(x => x.n > 0);
  if (pris.length) raekker.push({ navn: 'Pris', links: pris.map(x => ({ tekst: `${x.tekst.replace(' kr.', '')} · ${x.n}`, href: q(`maxPrice=${x.max}`) })) });

  const typer = [...new Set(items.map(l => l.type).filter(Boolean))]
    .map(t => ({ t, label: ((global.__T || []).find(x => x.id === t) || {}).label || t, n: tael({ types: [t] }) }))
    .filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 6);
  if (typer.length > 1) raekker.push({ navn: 'Type', links: typer.map(x => ({ tekst: `${esc(x.label)} · ${x.n}`, href: q(`type=${x.t}`) })) });
  /* Runde 9 (D9-M3): de typeloese skal naevnes — forsiden goer det, maerkesiden
     gjorde ikke. */
  const udenType = items.filter(l => !l.type).length;
  const typeNote = (typer.length > 1 && udenType)
    ? `<p class="brand-facet-note">${udenType} uden oplyst type — dem finder du i <a href="soegning.html?brands=${encodeURIComponent(brand)}">den fulde søgning</a>.</p>` : '';

  // Sortering som links — ingen inline-JS (CSP), og en crawler kan foelge dem.
  raekker.push({ navn: 'Sortér i søgningen', klasse: ' brand-facet-sorter', links: [
    { tekst: 'Pris: lav → høj', href: q('sort=price-asc') },
    { tekst: 'Pris: høj → lav', href: q('sort=price-desc') },
    { tekst: 'Årgang: nyeste', href: q('sort=year-desc') },
  ] });

  if (!raekker.length) return '';
  /* Runde 10 (D9-M1-rest): paa mobil kostede raekkerne ≈160 px over det
     foerste kort, saa de blev lagt i en fold — funktionen ét tryk vaek (som
     Bilbasens eget filterlag), og paa desktop staar de altid aabne.

     RUNDE 11, MAALT: folden var en <details open>, som js/maerke.js lukkede
     paa mobil efter DOMContentLoaded. Foerste kort sprang 910 -> 712 px ved
     HVER mobilindlaesning: 200 px CLS paa sidens vigtigste element, betalt
     for at spare plads. At vende den om (lukket i markup, JS aabner paa
     desktop) flyttede bare regningen — maalt 124 px spring paa desktop i
     stedet.

     Derfor er folden nu ren CSS og slet ingen JS. En skjult checkbox holder
     tilstanden, en <label> er grebet:
       desktop  raekkerne staar aabne fra foerste maling, grebet og
                checkboxen er display:none (ogsaa ude af tabuloerdenen)
       mobil    lukket fra foerste maling, grebet aabner
     Nul spring paa begge skaerme, nul JS, og indholdet staar altid i DOM'en
     for crawlere og for skaermlaesere.

     FAELDE FOR DEN NAESTE: fristes man tilbage til <details>, saa laes
     ovenstaaende to maalinger foerst. Og checkboxen maa IKKE skjules med
     display:none paa mobil — saa kan man ikke laengere tabbe til grebet. */
  const foldId = `facetfold-${slugify(brand)}`;
  return `
      <div class="brand-facet-fold">
        <!-- RUNDE 13 (R13-10): checkbox+label baerer ingen disclosure-rolle, saa
             en skaermlaeser hoerte "afkrydsningsfelt, ikke markeret" uden at
             faa at vide, at den styrer indholdet nedenfor. CSS-mekanikken
             bliver (den er grunden til, at folden ikke giver layouthop),
             men kontrollen peger nu paa sit panel med aria-controls, og
             tilstanden staar i selve navnet via to skjulte ord, CSS bytter
             om paa ved :checked. Ingen JS, ingen CSP-undtagelse. -->
        <input type="checkbox" class="brand-facet-check" id="${foldId}" aria-controls="${foldId}-panel">
        <label class="brand-facet-greb" for="${foldId}">Filtrér og sortér ${esc(brand)}<span class="visually-hidden fold-vis"> — vis</span><span class="visually-hidden fold-skjul"> — skjul</span><span class="chev"></span></label>
        <div class="brand-facetter" id="${foldId}-panel">
        ${raekker.map(r => `<div class="brand-facet-raekke${r.klasse || ''}"><span class="brand-facet-navn">${r.navn}:</span> ${r.links.map(l => `<a class="popular-chip popular-chip-sm" href="${l.href}">${l.tekst}</a>`).join('\n          ')}</div>`).join('\n        ')}
        ${typeNote}</div>
      </div>`;
}

/* Runde 7 (D7-M1): "Brugte Honda" — 165 af 262 Honda er fabriksnye (sidens egen
   eksternErNy()). Ordet "brugte" bruges kun, naar ALLE annoncer er brugte;
   ellers hedder det "Honda-motorcykler til salg", og tallene skrives ud hver
   for sig ("97 brugte og 165 fabriksnye"). */
function nyeAf(items){ return standOpg(items).nye; }
// w3-data: ubeviste "ny" (kilden siger ny, tallene hverken bekræfter eller afviser) er hverken nye eller brugte.
function brugtOrd(items){ return standOpg(items).renBrugt ? 'brugte ' : ''; }
/* Runde 7 (D7-M4): "Gul og Gratis, Rydbergs MC, Jensens Motorcykler og MC Syd". */
function listeJoin(navne){
  const n = navne.map(esc);
  if (n.length <= 1) return n.join('');
  return n.slice(0, -1).join(', ') + ' og ' + n[n.length - 1];
}
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
  /* S-005: js/data.js har 0 annoncer. Falder vi tilbage på det efter en forbigående
     fejl, slettes alle egne annoncer fra mærkesiderne og sitemappet uden at buildet
     fejler (beskyttelsen i hentAlt() kræver, at BÅDE egne og eksterne er tomme).
     Derfor kastes fejlen, så buildet kan ses at fejle. */
  if (!url || !key){
    throw Object.assign(new Error('Ingen Supabase-konfiguration — egne annoncer kan ikke hentes. Build afbrudt (S-005).'), { code: 'SEO_HENT' });
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
    throw Object.assign(new Error('Kunne ikke hente egne annoncer fra databasen (' + e.message + '). '
      + 'Build afbrudt frem for at skrive mærkesider og sitemap uden dem (S-005).'), { code: 'SEO_HENT' });
  }
}

/* De indekserede annoncer, oversat med sidens EGEN normalisering. */
async function hentEksterne(){
  // Runde 7 (D7-F2): samme afdublettering som klienten (js/backend-bridge.js).
  return markerTvaerkildeDubletter((await fetchExternalListings()).map(normalizeExternalListing)).beholdt;
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
   maerker.html bruger nu den samme: siden loader js/maerke.js (som kan tegne
   annoncekort) og er en kort-tegnende side for js/csp-billedvaerter.test.js.
   Den egen, strammere politik var en fordel for en side uden scripts, ikke
   for en med. */
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
  const nye = nyeAf(items);
  /* Runde 8 (D8-F2/M4): "lige nu" (friskhed, vi ikke kan love) og "til salg
     paa Bikerbasen" (de er til salg hos kilderne — vi hoster ingen) er ude. */
  const dele = nye
    ? [`Der er <strong>${items.length}</strong> ${esc(brand)} ${en ? 'motorcykel' : 'motorcykler'} til salg hos danske forhandlere og markedspladser, indekseret på Bikerbasen `
      + `— <strong>${items.length - nye}</strong> ${items.length - nye === 1 ? 'brugt' : 'brugte'} og <strong>${nye}</strong> ${nye === 1 ? 'fabriksny' : 'fabriksnye'}`]
    : [`Der er <strong>${items.length}</strong> ${en ? 'brugt' : 'brugte'} ${esc(brand)} `
      + `${en ? 'motorcykel' : 'motorcykler'} til salg hos danske forhandlere og markedspladser, indekseret på Bikerbasen`];

  if (priser.length > 1 && priser[0] !== priser[priser.length - 1]){
    dele.push(` — fra ${dkk(priser[0])} til ${dkk(priser[priser.length - 1])}`);
  } else if (priser.length){
    dele.push(` — til ${dkk(priser[0])}`);
  }
  if (aar.length){
    const lav = Math.min(...aar), hoej = Math.max(...aar);
    dele.push(lav === hoej ? `, årgang ${lav}.` : `, med årgange mellem ${lav} og ${hoej}.`);
  } else {
    // dkk() slutter selv paa "kr." — et ekstra punktum gav "27.800 kr.." (S-008).
    dele.push(dele[dele.length - 1].endsWith('kr.') ? '' : '.');
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
    dele.push(` ${hvem} indekseret fra ${listeJoin(kilder)}, og handlen sker hos kilden.`);
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
/* Runde 7 (D7-M2): antal kort i maerkesidens gitter = soegesidens sidestoerrelse. */
const MAERKE_KORT = 24;

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
function titelFor(brand, n, nye){
  return nye ? `${brand} – ${n} til salg, nye og brugte | Bikerbasen` : `${brand} brugt – ${n} til salg | Bikerbasen`;
}

/* META DESCRIPTION — 140-155 tegn, rigtigt antal, rigtigt prisspænd, én
   differentiator. "Ingen kommission af salget" er sitets eget løfte
   (index.html, sektionen "Gratis annonce — set af hele Danmark") — ikke
   opfundet her. Sætningerne vælges i prioriteret rækkefølge, indtil
   længden lander i vinduet; det holder teksten sand for både et mærke med
   ét kort prisord (Royal Enfield) og et med et langt (Harley-Davidson). */
function metaBeskrivelseFor(brand, n, stats, nye){
  // Runde 7 (D7-M1): "brugte" kun naar alle er brugte.
  const b = nye ? '' : 'brugte ';
  const prisled = stats.min == null
    ? ''
    : stats.min === stats.max
      ? ` til ${dkk(stats.min)}`
      : ` fra ${dkk(stats.min)} til ${dkk(stats.max)}`;
  const kandidater = [
    `Se ${n} ${b}${brand}${prisled} på Bikerbasen${nye ? ` — ${nye} fabriksnye og ${n - nye} brugte` : ''}. Ingen kommission af salget.`
      + ' Sammenlign pris, årgang og km i hele Danmark.',
    `Se ${n} ${b}${brand}${prisled} på Bikerbasen. Ingen kommission af salget.`
      + ' Sammenlign pris og årgang i hele Danmark.',
    `Se ${n} ${b}${brand} til salg${prisled} på Bikerbasen — ingen kommission af salget,`
      + ' sammenlign pris og årgang i hele Danmark.',
    `${n} ${b}${brand}${prisled}. Ingen kommission af salget. Sammenlign hos Bikerbasen.`,
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
  spg.push({ q: `Hvad koster en ${brugtOrd(items).trim() ? 'brugt ' : ''}${brand}-motorcykel?`, a: prisSvar });

  const kendtKK = kk.A1 + kk.A2 + kk.A;
  let kkSvar;
  if (!kendtKK){
    kkSvar = `Det kan vi ikke se ud fra dataene i dag — ingen af de ${n} ${brand}-annoncer oplyser den effekt i hk, der afgør kørekortkategorien. Kilden til de indekserede annoncer sender ikke tallet med, og Bikerbasen gætter aldrig på den slags — vi viser hellere ingen kategori end en forkert.`;
  } else if (!(kk.A1 + kk.A2)){
    kkSvar = `Ikke blandt de annoncer, vi kan afgøre — ${kk.A} af ${kendtKK} ${brand}-annoncer med kendt effekt kræver stort kørekort (kategori A), altså mere end de ${A2_MAX_HK} hk (35 kW), som A2 tillader. Har du kategori A, må du under alle omstændigheder køre dem alle.`
      + (kk.ukendt ? ` De resterende ${kk.ukendt} ${kk.ukendt === 1 ? 'annonce' : 'annoncer'} mangler effektoplysningen og vises derfor uden kategori.` : '');
  } else {
    /* "Ja, til dels" svarede bekræftende på lovlighed ud fra effekt alene —
       og dette svar ryger i FAQPage-JSON-LD'en, altså direkte i Googles rige
       resultat. A2 kræver også maks. 0,2 kW/kg og afledningsreglen, som ingen
       annonce oplyser (js/data.js ~852, docs/forretning.md §3.1). */
    kkSvar = `${kk.A1 + kk.A2} af ${kendtKK} ${brand}-annoncer med kendt effekt er ikke udelukket på effekt til A2 — de holder sig under loftet på ${A2_MAX_HK} hk (35 kW)${kk.A1 ? `, heraf ${kk.A1} også inden for A1-grænsen` : ''} — mens ${kk.A} kræver stort kørekort. A2 stiller også krav om maks. 0,2 kW pr. kg og om, at maskinen ikke er afledt af en model med over dobbelt effekt; det står ikke i annoncerne, så tjek registreringsattesten. Du kan filtrere direkte på kørekort i søgningen på Bikerbasen, så alt, der er udelukket på de oplyste tal, er sorteret fra.`
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
  spg.push({ q: `Hvilke ${brand}-modeller kan jeg finde på Bikerbasen?`, a: modelSvar });

  return spg;
}

/* Bundindholdet — 2-3 H2'er under gitteret. Alt tal-baseret er beregnet
   ovenfor; "andetBrand" er det qua-median nærmeste andet mærke MED fuld
   tekst, så krydslinket er en rigtig sammenligning, ikke et tilfældigt
   link. */
function bundIndholdFor(brand, slug, items, stats, kk, domType, andetBrand){
  const n = items.length;
  const dele = [];

  dele.push(`<h2 class="brand-sub">Prisniveau for ${brugtOrd(items)}${esc(brand)}</h2>`);
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
      /* Runde 7 (D7-M4): naermesteMedianBrand finder det NAERMESTE maerke — saa
         saetningen maa ikke love "billigere". */
      p += ` <a href="maerke-${slugify(andetBrand)}.html">${esc(andetBrand)}</a> ligger typisk i samme prisleje — se dem, hvis udvalget her er for lille.`;
    }
    dele.push(`<p>${p}</p>`);
  } else {
    dele.push(`<p>Ingen af de ${n} ${esc(brand)}-annoncer har en opgivet pris lige nu — alle sælgere skriver "ring for pris" i stedet, så du skal spørge direkte for at få et tal.</p>`);
  }

  dele.push(`<h2 class="brand-sub">Kørekort til ${esc(brand)}</h2>`);
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
      p += ` <a href="soegning.html?brands=${encodeURIComponent(brand)}&amp;koerekort=A2">Se de ${a1a2} ${esc(brand)}, der holder sig inden for A2-loftet</a>.`;
    }
    dele.push(`<p>${p}</p>`);
    /* Krydslink til de faktiske A1/A2-facetsider (koerekort-a1.html,
       koerekort-a2.html) — bygget i samme runde, men mærkesiderne linkede
       kun ind i soegning.html's søgefilter, aldrig ud til de nye statiske,
       indekserbare sider. Fundet af runde 3's SEO-kritiker. */
    const facetLinks = [];
    // "på A1-kørekort" antyder kørbarhed; målsiderne siger selv "ikke
    // udelukket". Linkteksten skal love det samme som destinationen.
    if (kk.A1) facetLinks.push('<a href="koerekort-a1.html">Se motorcykler, der ikke er udelukket til A1</a>');
    if (a1a2) facetLinks.push('<a href="koerekort-a2.html">Se motorcykler, der ikke er udelukket til A2</a>');
    if (facetLinks.length) dele.push(`<p>${facetLinks.join(' · ')}</p>`);
  }

  dele.push(`<h2 class="brand-sub">Hvad du skal tjekke, når du køber en ${brugtOrd(items).trim() ? 'brugt ' : ''}${esc(brand)}</h2>`);
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

/* NF-1: "kr. " og "m.fl. " er ikke sætningsslut. Splitter indledningen i
   "første sætning" (tallet — står synligt i hero'en) og resten (bag
   "Mere om udvalget"). Den gamle regex splittede ved første ". ", og siden
   prisspændet står FØR sætningsslut ("fra 4.000 kr. til 59.900 kr.") endte det
   synlige afsnit på "fra 4.000 kr." — midt i en sætning. */
function splitIntro(introTal){
  const i = introTal.search(/(?<!\bkr|\bm\.fl)\.\s/);
  return i > 0
    ? { foerste: introTal.slice(0, i + 1), rest: introTal.slice(i + 1).trim() }
    : { foerste: introTal, rest: '' };
}

/* ============ Mærkesidens billed-9-moduler ============
   Alle tal her regnes af SAMME `items` som sidens titel, intro og FAQ — og
   med soegesidens egen filterkæde (Filtrering.anvendFiltre) — så tallet på et
   link er tallet på resultatsiden, og siden kun har ét antal (V-012). */
const FREMHAEVEDE_ANTAL = 5;
const harFoto = l => !!(l.photoUrls && l.photoUrls.length);
/* Annoncer MED foto først (V-014: fotolose kort ser tomme ud i en
   fremhævet række), ellers soegesidens 'blandet' orden. Samme funktion står
   i js/maerke.js — holdes i sync, ellers omrokerer siden ved hydrering. */
function vaelgFremhaevede(sorteret, n){
  return sorteret.filter(harFoto).concat(sorteret.filter(l => !harFoto(l))).slice(0, n);
}

/* P2-3: en sælgertitel er ikke et modelnavn. "God velkørende custom med lav.
   KM" stod som model på Hyosung-siden. Reglen er forsigtig: et modelnavn har
   højst ét lille-bogstavs-ord (Gs katana, Xv 750 virago, Fzr 600), ingen
   sætningsskilletegn og er ikke en lang sætning. Ægte modeller som "Ténéré 700
   World Raid T7" (0 små ord) eller "Super Meteor 650 Astral" består. */
function erModelnavn(m){
  const t = String(m || '').trim();
  if (!t || t.length > 40) return false;
  if (/[.!?;:]/.test(t.replace(/\b[A-Za-z]\.(?=[A-Za-z]\b)/g, ''))) return false;   // "m.fl." o.l. er ikke modeller
  const ord = t.split(/\s+/);
  if (ord.length > 6) return false;
  const smaa = ord.filter(o => /^[a-zæøåéèü]{3,}$/.test(o));
  return smaa.length <= 1;
}

/* P2-2: tallet på en modelflise er det antal, soegesiden viser, når man
   klikker (soegning.html?brands=X&q=model): q-filteret er en
   delstrengssoegning ("K 1200" finder også K 1200 GT), så flisen taeller med
   SAMME regel — Filtrering.anvendFiltre({ q }) — og ikke "annoncer med netop
   dette modelnavn". Linket er uaendret, saa build-facet-pages kan relinke det. */
function modelTal(items){
  const navne = [...new Set(items.map(l => String(l.model || '').trim()).filter(erModelnavn))];
  return navne
    .map(m => ({ m, n: Filtrering.anvendFiltre(items, { q: m }, null, null).length }))
    .filter(x => x.n > 0)
    .sort((a, b) => b.n - a.n || a.m.localeCompare(b.m, 'da'));
}

/* Hero-baggrund efter det, mærket mest saelger: kun cruisere hører hjemme på
   hero-fotoet (det viser en cruiser); alle andre typer faar deres egen
   typeillustration (img/type/<id>.webp) i stedet for en forkert maskine. */
function heroVariant(items){
  const d = dominerendeType(items);
  const id = d && d.id;
  return { foto: id === 'cruiser', type: id && id !== 'cruiser' && TYPER_MED_BILLEDE.has(id) ? id : null };
}
const TYPER_MED_BILLEDE = new Set(['adventure', 'classic', 'cross', 'cruiser', 'naked', 'scooter', 'sport', 'touring']);

/* Panelets billede: et ÆGTE annoncethumbnail fra mærkets lager (ét pr.
   annonce, jf. CLAUDE.md regel 2), og en anden end rækkens foerste kort. */
function ctaFoto(fremhaevede){
  // Aldrig samme foto to gange side om side: med ét kort er der intet at vise.
  const l = fremhaevede.find((x, i) => i > 0 && harFoto(x));
  return l ? l.photoUrls[0] : null;
}

/* Diskret monogram i stedet for et logo: foerste bogstav i op til to ord. */
function monogram(brand){
  const ord = String(brand).split(/[\s-]+/).filter(Boolean);
  return (ord.length > 1 ? ord[0][0] + ord[1][0] : ord[0].slice(0, 1)).toLocaleUpperCase('da');
}

/* Flisens foto: mærkets egen annonce af den type, helst fra en kilde uden
   skilt på vaeggen (mcsyd.dk-billederne bærer firmaets skilt og fylder hele
   fotoet, V-015). Intet at vaelge imellem -> det foerste foto. */
function typeFoto(items, typeId){
  const kandidater = items.filter(l => l.type === typeId && harFoto(l));
  const bedst = kandidater.find(l => !/mcsyd\.dk/.test(String((l.source && l.source.domaene) || ''))) || kandidater[0];
  return bedst ? bedst.photoUrls[0] : null;
}

function maerkeFakta(brand, items){
  const tael = f => Filtrering.anvendFiltre(items, f, null, null).length;
  const typer = (global.__T || []).map(t => ({
    id: t.id, label: t.label, n: tael({ types: [t.id] }),
    foto: typeFoto(items, t.id),
  })).filter(x => x.n > 0).sort((a, b) => b.n - a.n);
  const modeller = modelTal(items).slice(0, 30);
  const kk = ['A1', 'A2', 'A'].map(k => ({ k, n: tael({ koerekort: k }) })).filter(x => x.n > 0);
  const regioner = [...new Set(items.map(l => l.region).filter(Boolean))]
    .map(r => ({ r, n: tael({ regions: [r] }) })).filter(x => x.n > 0).sort((a, b) => b.n - a.n || a.r.localeCompare(b.r, 'da'));
  const priser = [30000, 60000, 100000, 200000].filter(max => tael({ priceMax: max }) > 0);
  return { typer, modeller, kk, regioner, priser, udenRegion: items.filter(l => !l.region).length };
}

const talTekst = n => tal(n);
const antalTekst = (n, ental, flertal) => `${tal(n)} ${n === 1 ? ental : flertal}`;
const sogHref = (brand, ekstra) => `soegning.html?brands=${encodeURIComponent(brand)}${ekstra ? '&amp;' + ekstra : ''}`;

function heroSoegHTML(brand, slug, items, fakta){
  const b = esc(brand);
  const eks = fakta.modeller.length ? fakta.modeller[0].m : '';
  return `<form class="mk-search" id="mk-search" action="soegning.html" method="get" aria-label="Søg ${b} motorcykler">
        <input type="hidden" name="brands" value="${b}">
        <div class="field mk-f-q">
          <label for="mk-q">Mærke eller model</label>
          <div class="input-icon-wrap">
            ${ICON.search}
            <input class="input" type="text" id="mk-q" name="q" autocomplete="off" placeholder="${b}${eks ? ` (fx ${esc(eks)} …)` : ''}" aria-describedby="mk-q-hint">
          </div>
          <span class="visually-hidden" id="mk-q-hint">Søgningen er begrænset til ${b}. Skriv en model for at snævre ind.</span>
        </div>
        <div class="field mk-f-type">
          <label for="mk-type">Type</label>
          <select class="input" id="mk-type" name="type">
            <option value="">Alle typer</option>
            ${fakta.typer.map(t => `<option value="${t.id}">${esc(t.label)}</option>`).join('\n            ')}
          </select>
        </div>
        <div class="field mk-f-pris">
          <label for="mk-pris">Maks. pris</label>
          <select class="input" id="mk-pris" name="maxPrice">
            <option value="">Alle priser</option>
            ${fakta.priser.map(p => `<option value="${p}">Op til ${tal(p)} kr.</option>`).join('\n            ')}
          </select>
        </div>
        <fieldset class="kk-field mk-f-kk">
          <legend>Kørekort</legend>
          <div class="kk-seg">
            <input type="radio" name="koerekort" id="mk-kk-alle" value="" checked>
            <label for="mk-kk-alle">Alle</label>
            <input type="radio" name="koerekort" id="mk-kk-A1" value="A1">
            <label for="mk-kk-A1">A1</label>
            <input type="radio" name="koerekort" id="mk-kk-A2" value="A2">
            <label for="mk-kk-A2">A2</label>
            <input type="radio" name="koerekort" id="mk-kk-A" value="A">
            <label for="mk-kk-A">A</label>
          </div>
        </fieldset>
        <div class="mk-f-go">
          <button type="submit" class="btn btn-primary btn-lg">Søg ${b} motorcykler${ICON.arrowRight}</button>
          <p class="mk-count"><span data-mk-n>${tal(items.length)}</span> ${b} ${items.length === 1 ? 'motorcykel' : 'motorcykler'} i Danmark</p>
        </div>
      </form>`;
}

/* Fire løfter, der gælder HVER annonce på siden — ingen, vi ikke kan
   dokumentere ("vi fjerner svindel", "fællesskab", svartider er ude). */
function tillidsraekkeHTML(){
  const punkter = [
    [ICON.shieldCheck, 'Kilden står på hvert kort', 'Du kan altid se, hvor oplysningerne kommer fra.'],
    [ICON.filter, 'Kørekortfilter på oplyste tal', 'Vi gætter aldrig — filteret bygger kun på det, annoncen oplyser.'],
    [ICON.info, 'Ikke oplyst frem for gæt', 'Mangler et tal, står der "Ikke oplyst" i stedet for et skøn.'],
    [ICON.externalLink, 'Handlen sker hos sælger', 'Vi er et indeks og tager ingen kommission af salget.'],
  ];
  return `<ul class="mk-trust" aria-label="Det kan du regne med">
        ${punkter.map(([ik, t, u]) => `<li class="mk-trust-item"><span class="mk-trust-ik" aria-hidden="true">${ik}</span><span><strong>${t}</strong><span class="mk-trust-sub">${u}</span></span></li>`).join('\n        ')}
      </ul>`;
}

function fremhaevetHTML(brand, items, fremhaevede, kortHtml){
  const b = esc(brand);
  const foto = ctaFoto(fremhaevede);
  const faa = fremhaevede.length <= 2;
  const ctaHtml = `<aside class="mk-cta${faa ? ' mk-cta-bar' : ''}${foto ? '' : ' mk-cta-uden'}" aria-labelledby="mk-cta-h">
          <div class="mk-cta-body">
            <p class="mk-cta-navn" aria-hidden="true">${b}</p>
            <h3 id="mk-cta-h">Find din næste ${b}</h3>
            <ul class="mk-checks">
              <li><span class="mk-ok" aria-hidden="true">${ICON.check}</span>Danske forhandlere og markedspladser</li>
              <li><span class="mk-ok" aria-hidden="true">${ICON.check}</span>Kilden står på hvert kort</li>
              <li><span class="mk-ok" aria-hidden="true">${ICON.check}</span>Filtrér på dit kørekort</li>
            </ul>
            <a class="btn btn-primary" href="${sogHref(brand)}">Søg ${b} motorcykler${ICON.arrowRight}</a>
          </div>
          ${foto ? `<img class="mk-cta-img" src="${esc(foto)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}
        </aside>`;
  return `<section class="section mk-sektion mk-featured-sektion" aria-labelledby="mk-featured-h">
    <div class="container mk-wide">
      <div class="mk-sek-head">
        <h2 id="mk-featured-h">${b} motorcykler på Bikerbasen</h2>
        <a class="mk-link" href="${sogHref(brand)}">Se alle ${b} motorcykler${ICON.arrowRight}</a>
      </div>
      <div class="mk-featured" data-n="${fremhaevede.length}">
        <div class="mk-featured-kort" id="mk-featured-kort" data-fremhaevet="${FREMHAEVEDE_ANTAL}">${kortHtml}</div>
        ${ctaHtml}
      </div>
    </div>
  </section>`;
}

function typeFlisersHTML(brand, fakta){
  if (!fakta.typer.length) return '';
  const b = esc(brand);
  return `<section class="section mk-sektion" aria-labelledby="mk-typer-h">
    <div class="container mk-wide">
      <div class="mk-sek-head"><h2 id="mk-typer-h">Udforsk ${b} efter type</h2></div>
      <div class="tiles-grid mk-tiles">
        ${fakta.typer.map(t => `<a href="${sogHref(brand, 'type=' + t.id)}" class="tile">
          <span class="tile-media"><img src="${t.foto ? esc(t.foto) : `img/type/${t.id}.webp`}" alt="" width="456" height="342" loading="lazy" decoding="async"${t.foto ? ' referrerpolicy="no-referrer"' : ''}></span>
          <span class="tile-label"><span class="mk-tile-tekst"><span>${esc(t.label).replace('/', '/<wbr>')}</span><span class="mk-tile-n">${antalTekst(t.n, 'annonce', 'annoncer')}</span></span><span class="tile-go" aria-hidden="true">${ICON.arrowRight}</span></span>
        </a>`).join('\n        ')}
      </div>
    </div>
  </section>`;
}

/* De samme fire trin som forsiden (index.html #saadan-titel) — ikke nye
   løfter. Klasserne .saadan-trin* ligger i css/styles.css. */
/* "Sådan virker Bikerbasen" — samme strip som forsiden (index.html), med
   ikoner og pile mellem trinnene. Forsidens CSS lander først, når gauntlet/
   master flettes ind; derfor står den også (afgrænset til .mk-saadan) i
   css/p-maerke.css. Guide-boksen peger på en side, der findes (sikkerhed.html)
   — der er intet fællesskab at invitere til. */
const IKON_TRIN = {
  idCard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="2.3"/><circle cx="8.6" cy="11" r="1.9"/><path d="M5.8 16c.5-1.5 1.7-2.2 2.8-2.2s2.3.7 2.8 2.2M14 10h4.5M14 13.5h3.5"/></svg>',
  sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5Z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5Z"/></svg>',
};
function saadanHTML(){
  const trin = [
    ['1', IKON_TRIN.idCard, 'Vælg dit kørekort', 'A1, A2 eller A — vi skjuler det, tallene udelukker.'],
    ['2', IKON_TRIN.sliders, 'Filtrer efter dine behov', 'Mærke, model, type og maks. pris.'],
    ['3', ICON.search, 'Se, hvad der er oplyst', 'Kortet viser kilden og de tal, annoncen oplyser.'],
    ['4', ICON.externalLink, 'Gå videre til sælger', 'Annoncesiden fører dig videre til kilden.'],
  ];
  return `<section class="section mk-sektion mk-saadan saadan-section" aria-labelledby="saadan-titel">
    <div class="container mk-wide">
      <div class="saadan-strip">
        <div class="saadan-hoved">
          <h2 id="saadan-titel">Sådan virker Bikerbasen</h2>
          <ol class="saadan-trin" aria-label="Fire trin fra kørekort til annonce">
            ${trin.map(([n, ik, t, u]) => `<li class="saadan-trin-punkt">
              <span class="saadan-nr" aria-hidden="true">${n}</span>
              <span class="saadan-ico" aria-hidden="true">${ik}</span>
              <div><strong>${t}</strong><span>${u}</span></div>
            </li>`).join('\n            ')}
          </ol>
        </div>
        <aside class="guide-boks" aria-labelledby="guide-titel">
          <span class="guide-ico" aria-hidden="true">${IKON_TRIN.book}</span>
          <div>
            <h3 id="guide-titel">Køb og sælg trygt</h3>
            <p>Gode råd før du køber, sælger eller mødes med den anden part — og tegn på svindel.</p>
            <a href="sikkerhed.html">Læs gode råd<span aria-hidden="true">${ICON.arrowRight}</span></a>
          </div>
        </aside>
      </div>
    </div>
  </section>`;
}

/* "Populære" er bevidst ikke brugt: rækken er de modeller, der har flest
   annoncer, og siden måler ikke popularitet (jf. runde 8, D8-M5). */
function treKolonnerHTML(brand, fakta, items){
  const b = esc(brand);
  const modelFlise = x => `<li><a href="${sogHref(brand, 'q=' + encodeURIComponent(x.m))}"><strong>${esc(x.m)}</strong><span>${antalTekst(x.n, 'annonce', 'annoncer')}</span></a></li>`;
  const kolonner = [];
  if (fakta.modeller.length){
    kolonner.push(`<section class="mk-col" aria-labelledby="mk-mod-h">
        <div class="mk-col-head"><h2 id="mk-mod-h">${b}-modeller med flest annoncer</h2></div>
        <ul class="mk-mini">
          ${fakta.modeller.slice(0, 6).map(modelFlise).join('\n          ')}
        </ul>
        ${fakta.modeller.length > 6 ? `<details class="mk-mere"><summary>Flere ${b}-modeller (${fakta.modeller.length - 6})</summary>
          <ul class="mk-mini">
            ${fakta.modeller.slice(6).map(modelFlise).join('\n            ')}
          </ul>
        </details>` : ''}
        <p class="mk-col-foot"><a class="mk-link" href="${sogHref(brand)}">Se alle ${b}-annoncer${ICON.arrowRight}</a></p>
      </section>`);
  }
  if (fakta.kk.length){
    kolonner.push(`<section class="mk-col" aria-labelledby="mk-kk-h">
        <div class="mk-col-head"><h2 id="mk-kk-h">Udforsk ${b} efter kørekort</h2></div>
        <ul class="mk-mini mk-mini-kk">
          ${fakta.kk.map(x => `<li><a href="${sogHref(brand, 'koerekort=' + x.k)}"><strong>${x.k}</strong><span>${tal(x.n)} ${b}</span></a></li>`).join('\n          ')}
        </ul>
        <ul class="mk-links">
          <li><a href="koerekort-a2.html">Hvad må du køre på A2?${ICON.arrowRight}</a></li>
          <li><a href="koerekort-a1.html">Hvad må du køre på A1?${ICON.arrowRight}</a></li>
          <li><a href="guide-a2-koerekort.html">Guide: fra A2 til A-kørekort${ICON.arrowRight}</a></li>
        </ul>
        <p class="mk-col-note">Antal motorcykler, der ikke er udelukket på de oplyste tal — A omfatter derfor alle.</p>
      </section>`);
  }
  if (fakta.regioner.length){
    kolonner.push(`<section class="mk-col" aria-labelledby="mk-reg-h">
        <div class="mk-col-head"><h2 id="mk-reg-h">Find ${b} i din region</h2></div>
        <ul class="mk-mini mk-mini-reg">
          ${fakta.regioner.map(x => `<li><a href="${sogHref(brand, 'regions=' + encodeURIComponent(x.r))}"><strong>${esc(x.r)}</strong><span>${tal(x.n)}</span></a></li>`).join('\n          ')}
        </ul>
        ${fakta.udenRegion ? `<p class="mk-col-note">${antalTekst(fakta.udenRegion, 'annonce oplyser', 'annoncer oplyser')} ikke landsdel.</p>` : ''}
      </section>`);
  }
  if (!kolonner.length) return '';
  return `<section class="section mk-sektion">
    <div class="container mk-wide">
      <div class="mk-cols mk-cols-${kolonner.length}">
        ${kolonner.join('\n        ')}
      </div>
    </div>
  </section>`;
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
SEO.tjekAntal('Mærkesider', brands.length, SEO.taelMaerkeSider(ROOT));
const tilSletning = fs.readdirSync(ROOT).filter(f => /^maerke-.+\.html$/.test(f) && !forventede.has(f));
SEO.tjekSletninger('Mærkesider', tilSletning.length, SEO.taelMaerkeSider(ROOT));
let slettet = 0;
for (const f of tilSletning){ fs.unlinkSync(path.join(ROOT, f)); slettet++; }
if (slettet) console.log(`Fjernede ${slettet} forældede mærkesider: ${tilSletning.join(', ')}.\n::warning title=Sider fjernet::${slettet} mærkeside(r) slettet (${tilSletning.join(', ')}) — mærket findes ikke længere i lageret.`);

let built = 0;
for (const brand of brands){
  /* Runde 7 (D7-M2): soegesidens raekkefoelge (Sortering 'blandet' — samme
     funktion som soegning.html, forsiden og js/maerke.js), og kun de foerste
     MAERKE_KORT kort i markuppen. Foer stod alle 262 Honda (130 000 px paa
     390) sorteret paa createdAt, som er null paa 548 af 548. Resten er ét klik
     vaek i soegningen — med filtre, sortering og sideinddeling. <noscript>-
     listen baerer stadig alle (SEO). */
  const items = Sortering.sorter(byBrand[brand].slice(), 'blandet');
  /* Billed 9: en fremhævet række (op til 5, med foto først) og derunder resten
     — de samme annoncer vises ikke to gange. */
  const fremhaevede = vaelgFremhaevede(items, FREMHAEVEDE_ANTAL);
  const fremIds = new Set(fremhaevede.map(l => String(l.id)));
  const resten = items.filter(l => !fremIds.has(String(l.id)));
  const visteKort = resten.slice(0, MAERKE_KORT);
  const fremKort = fremhaevede.map((l, i) => listingCardHTML(l, i)).join('\n          ');
  const kort = visteKort.map((l, i) => listingCardHTML(l, i + fremhaevede.length)).join('\n      ');
  const fakta = maerkeFakta(brand, items);
  const heroV = heroVariant(items);
  /* Runde 9 (D9-M2): stoerste sidst_set = hvornaar lageret sidst er bekraeftet. */
  const senestOpdateret = (() => {
    const t = Math.max(0, ...items.map(l => l.sidstSet ? new Date(l.sidstSet).getTime() : 0));
    return t ? new Date(t).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
  })();
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
  /* Runde 8 (D8-M5): tallet med paa chippen — forsiden og "Andre maerker" har
     det, og det er forskellen paa et link og en paastand. */
  const allModels = [...modelAntal.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'da'))
    .slice(0, 12);

  const beskrivelse = `Se ${items.length} ${brugtOrd(items)}${brand} `
    + `${items.length === 1 ? 'motorcykel' : 'motorcykler'} til salg i Danmark. `
    + 'Sammenlign pris, årgang, km-stand og ccm på Bikerbasen.';

  /* ---- SEO content builder 3: den fulde tekstpakke, kun for mærker med
     mindst MIN_LISTINGS_FULD_TEKST rigtige annoncer ---- */
  const kvalificeret = items.length >= MIN_LISTINGS_FULD_TEKST;
  const stats = prisStatistik(items);
  const kk = licensOpsummering(items);
  const domType = dominerendeType(items);
  const andetBrand = kvalificeret ? naermesteMedianBrand(brand, stats.median) : null;

  const nye = nyeAf(items);
  const titelRaa = kvalificeret ? titelFor(brand, items.length, nye)
    : `${nye ? '' : 'Brugte '}${brand} motorcykler til salg — Bikerbasen`;
  const metaDescRaa = kvalificeret ? metaBeskrivelseFor(brand, items.length, stats, nye) : beskrivelse;
  const arvSaetning = kvalificeret ? BRAND_ARV[brand] : null;
  const introTekst = arvSaetning ? `${arvSaetning} ${introFor(brand, items)}` : introFor(brand, items);
  /* Runde 7 (D7-M3): tallet ("Der er lige nu …") foerst og synligt; arven og
     resten bag en fold. */
  const introTal = introFor(brand, items);
  // NF-1: se splitIntro() — "kr. " og "m.fl. " er ikke sætningsslut.
  const { foerste: introFoerste, rest: introEfter } = splitIntro(introTal);
  const introRest = [arvSaetning, introEfter].filter(Boolean).join(' ');
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
<link rel="preload" href="fonts/spacegrotesk.woff2?v=1" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/ibmplexsans.woff2?v=1" as="font" type="font/woff2" crossorigin>
<style>
@font-face{font-family:'Space Grotesk';font-style:normal;font-weight:500 700;font-display:swap;src:url(fonts/spacegrotesk.woff2?v=1) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:400 700;font-display:swap;src:url(fonts/ibmplexsans.woff2?v=1) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
</style>
<link rel="stylesheet" href="css/styles.css">
<link rel="stylesheet" href="css/p-maerke.css">
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
<body class="mk-body" data-mk-brand="${esc(brand)}">
${header}

<main id="main-content">
  <!-- Billede 9 (Yamaha): hero med foto og mærkenavn → søgekort over fotoets
       underkant → tillidsrække → fremhævet annoncerække + CTA-panel → typefliser
       → "Sådan virker Bikerbasen" → tre kolonner (modeller / kørekort / region).
       Under billedets struktur ligger det, siden altid har haft: den fulde
       liste, facetter, prisniveau, FAQ og andre mærker (SEO).
       Hero'en bruger sidens eget fotos — intet mærkelogo og ingen af mærkets
       reklameslogans: mærkenavnet står som skrift, teksten er neutral. -->
  <section class="mk-hero${heroV.foto ? '' : ' mk-hero-type'}">
    <div class="mk-hero-media" aria-hidden="true">
      ${heroV.foto ? `<img class="mk-hero-photo" src="img/hero-1600.webp"
           srcset="img/hero-800.webp 800w, img/hero-960.webp 960w, img/hero-1600.webp 1600w, img/hero-2560.webp 2560w"
           sizes="100vw" alt="" width="2560" height="1086" fetchpriority="high" decoding="async">`
        : (heroV.type ? `<img class="mk-hero-typeimg" src="img/type/${heroV.type}.webp" alt="" width="456" height="342" fetchpriority="high" decoding="async">` : '')}
    </div>
    <div class="container mk-hero-inner">
      <nav class="breadcrumb" aria-label="Brødkrumme">
        <a href="index.html">Forside</a><span class="bc-sep"></span>
        <a href="maerker.html">Mærker</a><span class="bc-sep"></span>
        <span>${esc(brand)}</span>
      </nav>
      <p class="mk-wordmark${brand.length > 11 ? ' mk-wordmark-lang' : ''}" aria-hidden="true"><span class="mk-mono">${esc(monogram(brand))}</span><span>${esc(brand)}</span></p>
      <h1>${nye ? '' : 'Brugte '}${esc(brand)}-motorcykler til salg i Danmark</h1>
      <p class="brand-intro mk-intro">${introFoerste}</p>
      ${introRest ? `<details class="brand-intro-mere mk-intro-mere"><summary>Mere om udvalget</summary><p class="brand-intro">${introRest}</p></details>` : ''}
    </div>
  </section>

  <div class="container mk-soeg-wrap">
    ${heroSoegHTML(brand, slug, items, fakta)}
    ${tillidsraekkeHTML()}
  </div>

  ${fremhaevetHTML(brand, items, fremhaevede, fremKort)}

  ${typeFlisersHTML(brand, fakta)}

  ${saadanHTML()}

  ${treKolonnerHTML(brand, fakta, items)}

  <div class="container mk-wide">
    <section class="section brand-liste-sektion mk-liste" style="padding-top:var(--space-4);" aria-labelledby="brand-antal">
      <div class="section-head">
        <!-- ÉT antal på siden (V-012): items.length, samme som titel, intro og
             FAQ. js/maerke.js opdaterer alle [data-mk-n] samlet, hvis lageret
             har ændret sig siden bygget — aldrig kun ét af dem. -->
        <div><h2 class="brand-sub" id="brand-antal">${items.length > fremhaevede.length ? `Flere ${esc(brand)}-annoncer` : `Alle ${esc(brand)}-annoncer`}</h2><p class="brand-facet-note" id="brand-note"><span data-mk-n>${tal(items.length)}</span> ${items.length === 1 ? 'annonce' : 'annoncer'} i alt. ${items.length > fremhaevede.length + MAERKE_KORT ? `De første ${MAERKE_KORT} af resten vises her. ` : ''}${senestOpdateret ? `Senest bekræftet hos kilderne ${senestOpdateret}.` : ''}</p></div>
        <a class="section-link" href="soegning.html?brands=${encodeURIComponent(brand)}">Alle <span data-mk-n>${tal(items.length)}</span> i søgningen<span aria-hidden="true"></span></a>
      </div>
      ${facetLinksFor(brand, items)}
      <div class="listings-grid" id="brand-listings" data-brand="${esc(brand)}" data-viste="${MAERKE_KORT}"${resten.length ? '' : ' hidden'}>${kort}</div>
      ${resten.length > MAERKE_KORT ? `<p class="brand-mere"><a href="soegning.html?brands=${encodeURIComponent(brand)}" class="btn btn-primary">Se alle ${items.length} ${esc(brand)} i søgningen</a></p>` : ''}
      <div class="brand-actions">
        <a href="opret-annonce.html" class="btn btn-outline">Sælg din ${esc(brand)}</a>
      </div>
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
      <h2 class="brand-sub">Ofte stillede spørgsmål om ${brugtOrd(items)}${esc(brand)}</h2>
      ${faqs.map(f => `<details class="brand-faq-item">
        <summary>${esc(f.q)}</summary>
        <p class="brand-intro">${esc(f.a)}</p>
      </details>`).join('\n      ')}
    </section>` : ''}

    <section class="section" style="padding-top:0;">
      <h2 class="brand-sub">Andre mærker</h2>
      <div class="popular-row">
        ${brands.filter(b => b !== brand && slugify(b) !== 'andet-maerke')
          .sort((a, b) => byBrand[b].length - byBrand[a].length || a.localeCompare(b, 'da')).slice(0, 10)
          .map(b => `<a class="popular-chip" href="maerke-${slugify(b)}.html">${esc(b)} · ${byBrand[b].length}</a>`).join('\n        ')}
        <a class="popular-chip" href="maerker.html">Alle mærker</a>
      </div>
    </section>
  </div>
</main>

${footer}

<script defer src="js/security.js"></script>
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
<script defer src="js/maaling.js"></script>
<script defer src="js/backend-bridge.js"></script>
<script defer src="js/components.js"></script>
<!-- Runde 7 (D7-M2): samme raekkefoelge som soegesiden (Sortering.sorter). -->
<script defer src="js/sortering.js"></script>
<script defer src="js/maerke.js"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, `maerke-${slug}.html`), html, 'utf8');
  built++;
}

/* ---- Brand index ---- */
const udenLager = maerkerUdenLager(Object.keys(BRANDS_BY_MODEL), brands);
const topMaerker = brands.filter(b => slugify(b) !== 'andet-maerke')
  .sort((a, b) => byBrand[b].length - byBrand[a].length || a.localeCompare(b, 'da')).slice(0, 8);
/* A–Z: første bogstav, dansk sortering (Æ Ø Å sidst). */
const bogstaver = (() => {
  const grupper = new Map();
  for (const b of brands){
    const k = b.trim().charAt(0).toLocaleUpperCase('da');
    if (!grupper.has(k)) grupper.set(k, []);
    grupper.get(k).push(b);
  }
  return [...grupper.entries()].sort((x, y) => x[0].localeCompare(y[0], 'da'));
})();

const indexHtml = `<!doctype html>
<html lang="da">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${csp}
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
<link rel="stylesheet" href="css/p-maerke.css">
${jsonLdBlock([
  breadcrumbLd([
    { name: 'Forside', path: 'index.html' },
    { name: 'Mærker', path: 'maerker.html' },
  ]),
])}
</head>
<body class="mk-body">
${header}

<main id="main-content">
  <section class="mk-hero mk-hero-lav">
    <div class="mk-hero-media" aria-hidden="true">
      <img class="mk-hero-photo" src="img/hero-1600.webp"
           srcset="img/hero-800.webp 800w, img/hero-960.webp 960w, img/hero-1600.webp 1600w, img/hero-2560.webp 2560w"
           sizes="100vw" alt="" width="2560" height="1086" fetchpriority="high" decoding="async">
    </div>
    <div class="container mk-hero-inner">
      <nav class="breadcrumb" aria-label="Brødkrumme">
        <a href="index.html">Forside</a><span class="bc-sep"></span><span>Mærker</span>
      </nav>
      <h1>Motorcykler efter mærke</h1>
      <p class="brand-intro mk-intro">Gennemse brugte motorcykler efter mærke. Øverst dem, der er til salg lige nu — nederst dem, vi kender, men ikke har på lager i øjeblikket.</p>
    </div>
  </section>

  <div class="container mk-soeg-wrap mk-soeg-wrap-lav">
    ${tillidsraekkeHTML()}
  </div>

  ${brands.length ? `<section class="section mk-sektion" aria-labelledby="mk-top-h">
    <div class="container">
      <div class="mk-sek-head">
        <h2 id="mk-top-h">Mærker med flest annoncer</h2>
        <a class="mk-link" href="soegning.html">Søg blandt alle ${tal(LISTINGS.length)} annoncer${ICON.arrowRight}</a>
      </div>
      <div class="mk-brandtiles">
        ${topMaerker.map(b => `<a class="mk-brandtile" href="maerke-${slugify(b)}.html">
          <span class="mk-brandtile-navn">${esc(b)}</span>
          <span class="mk-brandtile-n">${antalTekst(byBrand[b].length, 'annonce', 'annoncer')}</span>
          <span class="mk-brandtile-go" aria-hidden="true">${ICON.arrowRight}</span>
        </a>`).join('\n        ')}
      </div>
    </div>
  </section>

  <section class="section mk-sektion" aria-labelledby="mk-az-h">
    <div class="container">
      <div class="mk-sek-head"><h2 id="mk-az-h">Alle mærker A–Z</h2></div>
      <nav class="mk-bogstaver" aria-label="Spring til bogstav">
        ${bogstaver.map(([bogstav]) => `<a href="#mk-az-${bogstav.toLowerCase()}">${bogstav}</a>`).join('\n        ')}
      </nav>
      <div class="mk-az">
        ${bogstaver.map(([bogstav, liste]) => `<section class="mk-az-gruppe" id="mk-az-${bogstav.toLowerCase()}" aria-label="Mærker med ${bogstav}">
          <h3>${bogstav}</h3>
          <ul>
            ${liste.map(b => `<li><a href="maerke-${slugify(b)}.html"><span>${esc(b)}</span><span class="mk-az-n">${byBrand[b].length}</span></a></li>`).join('\n            ')}
          </ul>
        </section>`).join('\n        ')}
      </div>
    </div>
  </section>` : ''}

  ${saadanHTML()}

  ${udenLager.length ? `<section class="section mk-sektion">
    <div class="container">
      <div class="mk-sek-head"><h2>Mærker uden annoncer lige nu (${udenLager.length})</h2></div>
      <p class="brand-intro">Dem kender vi godt — der er bare ingen til salg i øjeblikket. Vi linker dem, når der er noget at vise.</p>
      <p class="brand-intro">${udenLager.map(esc).join(', ')}.</p>
      <div class="brand-actions">
        <a href="soegning.html" class="btn btn-outline">Søg blandt alle ${tal(LISTINGS.length)} annoncer</a>
      </div>
    </div>
  </section>` : ''}
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
<script defer src="js/maerke.js"></script>
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
  /* Annoncens ægte ændringsdato (updated_at, ellers oprettelsen) — aldrig byggedatoen. */
  lastmod: SEO.renDato(l.updated_at || l.createdAt),
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
  const dato = SEO.renDato(l.updated_at || l.createdAt) || '';
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
/* S-011: lastmod er sidens ÆGTE ændringsdato, ikke byggedatoen. Hashet af sidens
   synlige indhold ligger i scripts/sitemap-lastmod.json; datoen rykkes kun, når
   hashet ændrer sig (se scripts/seo-vagt.js). Ukendt => ingen lastmod. */
const today = new Date().toISOString().slice(0,10);
const ledger = SEO.laesLedger(ROOT);
const sideLastmod = file => {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) return null;
  return SEO.lastmodFor(ledger, file.replace(/\.html$/, ''), SEO.indholdsHash(fs.readFileSync(p, 'utf8')), today);
};
const entries = [
  ...staticPages.map(u => ({ loc: cleanUrl(u), lastmod: sideLastmod(u) })),
  /* Kun mærkesider, der faktisk er indekserbare. En noindex-side i sitemappet
     er et modsat signal (se noten linje ~1029) — og præcis den regel, facet-
     scriptet allerede følger med sit `qualifies`-filter. Tærsklen er den
     samme, der afgør noindex på selve siden. */
  ...brands.filter(b => (byBrand[b] || []).length >= MIN_LISTINGS_FULD_TEKST)
    .map(b => ({ loc: cleanUrl(`maerke-${slugify(b)}.html`), lastmod: sideLastmod(`maerke-${slugify(b)}.html`) })),
  ...listingUrls.map(e => ({ loc: `${base}/${e.loc}`, lastmod: e.lastmod })),
  ...dealerUrls.map(e => ({ loc: `${base}/${e.loc}`, lastmod: e.lastmod })),
];
const urls = entries;
/* S-005: et sitemap, der skrumper drastisk, er næsten altid en fejlet hentning. */
SEO.tjekAntal('Sitemap-poster (mærketrinnet)', entries.length, ledger.meta.brandUrls, { minAndel: SEO.MIN_ANDEL_KATEGORI });
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(e => SEO.urlLinje(e.loc, e.lastmod, esc)).join('\n')}
</urlset>
`, 'utf8');
ledger.meta.brandUrls = entries.length;
ledger.meta.egne = LISTINGS.filter(harEgenSide).length;
ledger.meta.eksterne = LISTINGS.length - ledger.meta.egne;
ledger.meta.maerkesider = brands.length;
ledger.meta.perKilde = SEO.taelPrKilde(LISTINGS.filter(l => !harEgenSide(l)));
SEO.skrivLedger(ROOT, ledger);

fs.writeFileSync(path.join(ROOT, 'robots.txt'),
`User-agent: *
Allow: /
Sitemap: ${base}/sitemap.xml
`, 'utf8');

/* Runde 5 (D5-F2): forsidens maerkesky linker til maerke-<slug>.html, men kun
   hvor siden FINDES. Lageret kan have faaet et nyt maerke siden sidste byg —
   saa listen over byggede slugs skrives ind i index.html, og js/home.js falder
   tilbage til soegning.html?brands= for alt andet. Ingen 404 bag en chip. */
{
  const indexPath = path.join(ROOT, 'index.html');
  let ih = fs.readFileSync(indexPath, 'utf8');
  const attr = `<div class="maerke-grid" id="brand-cloud" data-maerkesider="${brands.map(slugify).join(',')}">`;
  const re = /<div class="[a-z -]*" id="brand-cloud"[^>]*>/;
  if (re.test(ih)){ fs.writeFileSync(indexPath, ih.replace(re, attr)); }
  else console.warn('build-brand-pages: fandt ikke #brand-cloud i index.html — maerkeskyen falder tilbage til soegning.html?brands=');
}

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
  /* S-005: tomt eller drastisk faldet i forhold til det sidst kendte gode — de
     committede annonce-*.html og tallet fra forrige vellykkede byg. */
  const baseline = SEO.laesLedger(ROOT).meta;
  SEO.tjekLager({ egne: egne.length, eksterne: eksterne.length, perKilde: SEO.taelPrKilde(eksterne), baseline,
    inaktive: SEO.laesInaktiveDomaener(ROOT), egneSider: SEO.taelAnnonceSider(ROOT) });
  if (!egne.length && !eksterne.length){
    throw Object.assign(new Error('Nul annoncer i alt — hverken egne eller indekserede. Build afbrudt: '
      + 'byg videre ville slette alle maerkesider og skrive et sitemap uden long-tail. '
      + 'Det er praecis den tilstand, findingen C-014 beskriver.'), { code: 'SEO_FALD' });
  }
  return [...egne, ...eksterne]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

if (require.main === module){
  (async () => {
    LISTINGS = await hentAlt();
    byg();
  })().catch(e => SEO.afslut(e));
}

/* Kun til tests (scripts/maerkeside.test.js). Sidens egne ord er det ene
   sted, hvor et manglende felt bliver en påstand, og de er derfor det ene
   sted her, det betaler sig at låse. require.main-gaten ovenfor er det, der
   gør en require() fra en test til noget andet end et helt byg. */
module.exports = { typeFoto, erModelnavn, modelTal, heroVariant, ctaFoto, monogram, maerkeFakta, introFor, noscriptLinje, brandItemListLd, harEgenSide, internAdresse, maerkerUdenLager, splitIntro, vaelgFremhaevede, nyeAf, brugtOrd };
