/* BrandRegistry — ÉT centralt, normaliseret mærkeregister for hele Bikerbasen (V4, Agent 1).

   Kilden er DENNE fil. Den bruges direkte i Node (tests, generatorer: require('./js/brands-registry.js')) og er
   KOPIERET ind i js/data.js mellem markørerne @@BRANDREG-START/-END af scripts/maerke-register-gen.js, så hver side, der
   allerede henter js/data.js, har registret uden en ekstra <script>-tag (ca. 100 sider). `--tjek` i gaten fanger en
   data.js, der er ude af trit. Rediger KUN her og kør: node scripts/maerke-register-gen.js

   TILFØJ ET MÆRKE = ÉN POST i MAERKER nedenfor. Resten (filter, søgning, opret-annonce, bro, mærkeoversigt, mærkesider,
   forside, logofallback) følger af posten. Se docs/review/gauntlet/v4/maerker.md.

   En post: [navn, land, periode, aliaser, kilder, ekstra?]
     navn     kanonisk visningsnavn (det, der står i lager, filtre, titler og på siden)
     land     ISO-landekode for mærkets oprindelse (informativ)
     periode  'aktuel' | 'historisk' | 'ukendt'  (er mærket i produktion i dag? — styrer kun gruppering, aldrig synlighed)
     aliaser  andre stavemåder/historiske betegnelser, der skal ende på navn. Store/små bogstaver, mellemrum, bindestreger,
              punktummer og accenter er ligegyldige ("CF Moto" = "cf-moto" = "CFMOTO"), så de skal ikke skrives hver for sig.
     kilder   mindst ét nøgleord fra KILDER — hvorfor mærket tæller som et ÆGTE mærke (ingen post uden belæg)
     ekstra   { slug, logo, note }  slug: kun hvis siden skal have en anden adresse end slugify(navn) (eksisterende URL'er!);
              logo: nøglen i img/brands/manifest.json, hvis den er en anden end slug; note: fri tekst.

   REGLER (alle låst i scripts/maerke-register.test.js):
   - Et mærke bliver ALDRIG oprettet automatisk ud fra en annonce. Ukendte mærkenavne fra kilderne bliver til 'Ukendt'
     (vises som "Uoplyst mærke") og logges af scripts/maerke-kandidater.js; først en menneskelig post her gør dem til mærker.
   - Et mærke har kun en mærkeside, hvis der er mindst 1 annonce (ingen tom side); siden er kun indekserbar ved
     mindst MIN_ANNONCER_INDEKS annoncer (ellers noindex). Eksisterende sider fjernes aldrig.
   - Manglende logo giver aldrig manglende mærke: BrandLogos falder tilbage til monogram/ordmærke for ethvert navn.
   - Ingen dubletter: to mærker må ikke dele navn, alias eller slug. */

// @@REGISTER-START
const BrandRegistry = (function () {
  'use strict';

  const UKENDT = 'Ukendt';                 // sentinellen, resten af koden (annonce.js, seo.js, generatorer) allerede kender
  const UKENDT_LABEL = 'Uoplyst mærke';    // det, en BRUGER ser
  const UKENDT_ALIASER = ['ukendt', 'andet mærke', 'andre mærker', 'ikke oplyst', 'uoplyst', 'uoplyst mærke', 'ingen', 'unknown', 'andet', 'other'];
  const MIN_ANNONCER_INDEKS = 5;           // under: siden findes (hvis >=1 annonce) men er noindex og uden tekstpakke
  const MIN_FOREKOMSTER_KANDIDAT = 3;      // under: et ukendt mærkenavn er blot "afventer"

  /* Hvorfor et mærke tæller som ægte. 'ejer' og 'eks' er IKKE selvstændigt belæg: de siger kun, hvem der har nævnt det. */
  const KILDER = {
    wp:        'https://en.wikipedia.org/wiki/List_of_motorcycle_manufacturers',
    lager:     'Ses i Bikerbasens indekserede lager (MC Syd, Gul og Gratis, Jensens Motorcykler), snapshot 2026-10-19',
    ejer:      'Ejerens mærkeliste (V4-opgaven, 2026-10-19)',
    eks:       'Eksisterende V3-liste (BRANDS_BY_MODEL/YDERLIGERE_KENDTE_MAERKER) — ikke selvstændigt belagt',
    mash:      'https://www.mash-motors.fr/',
    brixton:   'https://www.brixton-motorcycles.com/',
    rewaco:    'https://www.rewaco.com/',
    lexmoto:   'https://www.lexmoto.com/',
    kove:      'https://www.kovemoto.com/',
    jawayezdi: 'https://www.jawayezdimotorcycles.com/',
    zontes:    'https://www.zontes.com/',
    visordown: 'https://www.visordown.com/features/cfmoto-zongshen-chinese-motorcycle-brands-explained',
    ingdk:     'https://ing.dk/artikel/motorcykler-i-oeksnehallen',
    motoit:    'https://www.moto.it/concessionari/hyosung',
    surron:    'https://surron.com/',
    talaria:   'https://www.talariaeu.com/',
  };
  const IKKE_BELAEG = new Set(['ejer', 'eks']);

  /* [navn, land, periode, aliaser, kilder, ekstra]. Rækkefølgen er uden betydning (alle visninger sorteres). */
  const MAERKER = [
    // ---- De store japanske ----
    ['Yamaha', 'JP', 'aktuel', [], ['wp', 'lager', 'ejer']],
    ['Honda', 'JP', 'aktuel', ['honda motor'], ['wp', 'lager', 'ejer']],
    ['Kawasaki', 'JP', 'aktuel', [], ['wp', 'lager', 'ejer']],
    ['Suzuki', 'JP', 'aktuel', [], ['wp', 'lager', 'ejer']],
    // ---- Europa, nuværende ----
    ['BMW', 'DE', 'aktuel', ['bmw motorrad'], ['wp', 'lager', 'ejer']],
    ['Ducati', 'IT', 'aktuel', ['ducati motor holding'], ['wp', 'lager', 'ejer']],
    ['KTM', 'AT', 'aktuel', ['ktm ag'], ['wp', 'lager', 'ejer']],
    ['Triumph', 'GB', 'aktuel', ['triumph motorcycles'], ['wp', 'lager', 'ejer']],
    ['Aprilia', 'IT', 'aktuel', [], ['wp', 'lager', 'ejer']],
    ['Benelli', 'IT', 'aktuel', [], ['wp', 'lager', 'ejer']],
    ['Husqvarna', 'SE', 'aktuel', ['husqvarna motorcycles'], ['wp', 'lager', 'ejer']],
    ['Moto Guzzi', 'IT', 'aktuel', [], ['wp', 'lager', 'ejer']],
    ['MV Agusta', 'IT', 'aktuel', [], ['wp', 'lager', 'ejer']],
    ['GasGas', 'ES', 'aktuel', ['gas gas'], ['wp', 'ejer'], { note: 'Officielt skrevet GASGAS; Bikerbasen staver GasGas (som crawleren og logoet).' }],
    ['Piaggio', 'IT', 'aktuel', ['piaggio group'], ['wp', 'ejer']],
    ['Vespa', 'IT', 'aktuel', [], ['wp', 'ejer']],
    ['Bimota', 'IT', 'aktuel', [], ['wp', 'ejer']],
    ['Beta', 'IT', 'aktuel', [], ['wp', 'ejer']],
    ['Sherco', 'FR', 'aktuel', [], ['wp', 'ejer']],
    ['Fantic', 'IT', 'aktuel', ['fantic motor'], ['wp', 'lager', 'ejer']],
    ['Rieju', 'ES', 'aktuel', [], ['wp', 'ejer']],
    ['Derbi', 'ES', 'aktuel', [], ['wp', 'ejer']],
    ['Gilera', 'IT', 'aktuel', [], ['wp', 'ejer']],
    ['Peugeot', 'FR', 'aktuel', ['peugeot motocycles', 'peugeot scooters'], ['wp', 'ejer']],
    ['Moto Morini', 'IT', 'aktuel', ['morini'], ['wp', 'ejer']],
    ['SWM', 'IT', 'aktuel', [], ['wp', 'ejer']],
    ['AJP', 'PT', 'aktuel', [], ['wp', 'ejer']],
    ['FB Mondial', 'IT', 'aktuel', ['mondial', 'f.b. mondial'], ['wp', 'lager', 'ejer']],
    ['Lambretta', 'IT', 'aktuel', [], ['wp', 'eks']],
    ['Energica', 'IT', 'aktuel', [], ['wp', 'eks']],
    ['Italjet', 'IT', 'aktuel', [], ['wp']],
    ['Tomos', 'SI', 'aktuel', [], ['wp']],
    ['Montesa', 'ES', 'aktuel', ['montesa honda'], ['wp', 'ejer']],
    ['Sachs', 'DE', 'aktuel', [], ['wp', 'eks']],
    ['Jawa', 'CZ', 'aktuel', ['jawa moto'], ['wp', 'jawayezdi', 'ejer']],
    ['Brixton', 'AT', 'aktuel', ['brixton motorcycles'], ['brixton', 'ejer']],
    ['Rewaco', 'DE', 'aktuel', [], ['rewaco', 'lager']],
    ['Ural', 'RU', 'aktuel', ['imz-ural', 'imz ural'], ['wp', 'ejer']],
    // ---- USA/Canada ----
    ['Harley-Davidson', 'US', 'aktuel', ['harley', 'hd', 'h-d', 'harley davidson', 'harley-davidson motor company'], ['wp', 'lager', 'ejer']],
    ['Indian', 'US', 'aktuel', ['indian motorcycle', 'indian motorcycles'], ['wp', 'lager', 'ejer']],
    ['Zero', 'US', 'aktuel', ['zero motorcycles', 'zero motorcycle'], ['wp', 'ejer'], { logo: 'zero', note: 'Officielt Zero Motorcycles; kort navn bruges overalt.' }],
    ['Can-Am', 'CA', 'aktuel', ['can am', 'canam', 'brp can-am'], ['wp', 'ejer']],
    ['Buell', 'US', 'historisk', [], ['wp', 'lager', 'ejer'], { note: 'Buell Motorcycle Company 1983-2009; Erik Buell Racing til 2015.' }],
    ['Victory', 'US', 'historisk', ['victory motorcycles'], ['wp', 'lager', 'ejer'], { note: 'Polaris stoppede Victory i 2017; brugte maskiner handles stadig.' }],
    // ---- Britiske ----
    ['Royal Enfield', 'IN', 'aktuel', ['royalenfield', 'royal enfield motors'], ['wp', 'lager', 'ejer'], { note: 'Oprindeligt britisk (1901-1968); i dag indisk-ejet.' }],
    ['BSA', 'GB', 'aktuel', [], ['wp', 'lager', 'ejer'], { note: 'Genlanceret 2021; det oprindelige BSA ophørte 1972 (og 2003 i anden form).' }],
    ['Norton', 'GB', 'aktuel', ['norton motorcycles'], ['wp', 'ejer'], { note: 'Genstartet 2008.' }],
    ['AJS', 'GB', 'historisk', [], ['wp', 'eks']],
    ['Ariel', 'GB', 'historisk', [], ['wp']],
    ['Matchless', 'GB', 'historisk', [], ['wp']],
    ['Velocette', 'GB', 'historisk', [], ['wp']],
    ['Vincent', 'GB', 'historisk', ['vincent hrd'], ['wp']],
    ['Brough Superior', 'GB', 'historisk', ['brough'], ['wp']],
    ['Greeves', 'GB', 'historisk', [], ['wp']],
    // ---- Kina/Taiwan/Korea/Indien ----
    ['CFMoto', 'CN', 'aktuel', ['cfmoto', 'cf moto', 'cf-moto', 'cfmotor'], ['wp', 'lager', 'ejer'], { note: 'Officielt skrevet CFMOTO; Bikerbasen staver CFMoto (crawleren og logoet).' }],
    ['SYM', 'TW', 'aktuel', ['sanyang'], ['wp', 'lager', 'ejer']],
    ['Kymco', 'TW', 'aktuel', [], ['wp', 'lager', 'ejer']],
    ['Keeway', 'CN', 'aktuel', [], ['wp', 'ejer']],
    ['Hyosung', 'KR', 'aktuel', [], ['ingdk', 'motoit', 'lager', 'ejer']],
    ['Mash', 'FR', 'aktuel', ['mash motorcycles'], ['mash', 'ejer'], { note: 'Fransk mærke, bygget i Kina.' }],
    ['Voge', 'CN', 'aktuel', ['loncin voge'], ['visordown', 'ejer']],
    ['Zontes', 'CN', 'aktuel', [], ['zontes', 'ejer']],
    ['QJMotor', 'CN', 'aktuel', ['qj motor', 'qj', 'qjmotor'], ['wp', 'ejer'], { logo: 'qj-motor' }],
    ['Lexmoto', 'GB', 'aktuel', [], ['lexmoto', 'eks']],
    ['Kove', 'CN', 'aktuel', ['kove moto'], ['kove', 'eks']],
    ['Yezdi', 'IN', 'aktuel', [], ['jawayezdi', 'eks']],
    ['Bajaj', 'IN', 'aktuel', [], ['wp', 'eks']],
    ['TVS', 'IN', 'aktuel', ['tvs motor'], ['wp', 'eks']],
    ['Hero MotoCorp', 'IN', 'aktuel', ['hero', 'hero moto corp'], ['wp', 'eks'], { logo: 'hero-motocorp' }],
    ['Sur-Ron', 'CN', 'aktuel', ['surron', 'sur ron'], ['wp', 'surron']],
    ['Talaria', 'CN', 'aktuel', [], ['talaria', 'eks']],
    ['Super Soco', 'CN', 'aktuel', ['supersoco'], ['eks'], { note: 'Mangler selvstændigt belæg — kræver ejerens bekræftelse.' }],
    ['Daelim', 'KR', 'aktuel', ['daelim motor'], ['eks'], { note: 'Mangler selvstændigt belæg — kræver ejerens bekræftelse.' }],
    ['TM Racing', 'IT', 'aktuel', ['tm'], ['eks'], { logo: 'tm-racing', note: 'Mangler selvstændigt belæg — kræver ejerens bekræftelse.' }],
    // ---- Historiske kontinentale ----
    ['Cagiva', 'IT', 'historisk', [], ['wp', 'lager', 'eks']],
    ['Husaberg', 'SE', 'historisk', [], ['wp', 'ejer']],
    ['DKW', 'DE', 'historisk', [], ['wp', 'lager', 'ejer'], { note: 'Fundet i lageret som "DKW 250" (Gul og Gratis).' }],
    ['Laverda', 'IT', 'historisk', [], ['wp', 'eks']],
    ['Puch', 'AT', 'historisk', [], ['wp', 'eks']],
    ['Simson', 'DE', 'historisk', [], ['wp', 'eks']],
    ['Zündapp', 'DE', 'historisk', ['zundapp', 'zuendapp'], ['wp', 'eks']],
    ['Maico', 'DE', 'historisk', [], ['wp', 'eks']],
    ['Ossa', 'ES', 'historisk', [], ['wp', 'eks']],
    ['Kreidler', 'DE', 'historisk', [], ['wp', 'eks']],
    ['Bultaco', 'ES', 'historisk', [], ['wp']],
    ['Hercules', 'DE', 'historisk', [], ['wp']],
    ['NSU', 'DE', 'historisk', [], ['wp']],
    ['Horex', 'DE', 'historisk', [], ['wp']],
    ['Morbidelli', 'IT', 'historisk', [], ['wp']],
    ['MZ', 'DE', 'historisk', [], ['wp', 'eks'], { note: 'Østtyske MZ (1906-2009).' }],
    ['Nimbus', 'DK', 'historisk', [], ['wp', 'eks'], { note: 'Dansk (1919-1959).' }],
    // ---- Danske/lokale mærker, kun belagt via lageret ----
    ['Lauge Jensen', 'DK', 'ukendt', ['lauge'], ['lager'], { note: 'Aliaset "lauge" findes, fordi én kilde skriver kun fornavnet.' }],
    ['Bach', 'DK', 'ukendt', [], ['lager'], { note: 'Fundet som "Bach Delux 26 Kabinescooter" (Gul og Gratis). Siden bevares (URL).' }],
  ];

  /* ---------- Normalisering ---------- */
  function fold(s) {
    return String(s).normalize('NFC').toLowerCase()
      .replace(/ø/g, 'oe').replace(/æ/g, 'ae').replace(/å/g, 'aa')
      .replace(/ß/g, 'ss').replace(/ł/g, 'l').replace(/þ/g, 'th').replace(/œ/g, 'oe').replace(/ı/g, 'i')
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  /* Opslagsnøglen: kun bogstaver og tal. "CF Moto", "cf-moto" og "CFMOTO" -> "cfmoto". */
  function noegle(s) { return fold(s).replace(/&/g, '').replace(/[^a-z0-9]+/g, ''); }
  function slugFold(s) { return fold(s).replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

  const liste = [];
  const nogleTilPost = new Map();
  const slugTilPost = new Map();
  const dubletter = [];      // fyldes, hvis to poster deler nøgle/slug — testen kræver en tom liste
  const ukendtNoegler = new Set(UKENDT_ALIASER.map(noegle));
  ukendtNoegler.add(noegle(UKENDT));

  for (const r of MAERKER) {
    const ekstra = r[5] || {};
    const post = Object.freeze({
      navn: r[0], slug: ekstra.slug || slugFold(r[0]), land: r[1], periode: r[2],
      aliaser: Object.freeze(r[3].slice()), kilder: Object.freeze(r[4].slice()),
      logo: ekstra.logo || null, note: ekstra.note || '',
      verificeret: r[4].some(k => !IKKE_BELAEG.has(k)),
    });
    liste.push(post);
    for (const n of [post.navn, ...post.aliaser, post.slug]) {
      const k = noegle(n);
      if (!k) continue;
      const fund = nogleTilPost.get(k);
      if (fund && fund !== post) dubletter.push(`${k}: ${fund.navn} / ${post.navn}`);
      else nogleTilPost.set(k, post);
    }
    if (slugTilPost.has(post.slug)) dubletter.push(`slug ${post.slug}: ${slugTilPost.get(post.slug).navn} / ${post.navn}`);
    slugTilPost.set(post.slug, post);
  }
  for (const k of ukendtNoegler) if (nogleTilPost.has(k)) dubletter.push(`${k}: er både "uoplyst" og ${nogleTilPost.get(k).navn}`);

  const sortDa = (a, b) => a.localeCompare(b, 'da');

  /* Det kanoniske navn, UKENDT for "uoplyst"-betegnelser, ellers null (ikke i registret). */
  function normalise(navn) {
    if (typeof navn !== 'string' && typeof navn !== 'number') return null;
    const k = noegle(navn);
    if (!k) return null;
    if (ukendtNoegler.has(k)) return UKENDT;
    const p = nogleTilPost.get(k);
    return p ? p.navn : null;
  }
  function find(navn) { const n = normalise(navn); return n && n !== UKENDT ? nogleTilPost.get(noegle(n)) : null; }
  /* Som maerkeAkronym(): kanonisk navn, "Ukendt" for uoplyst, ellers uændret (ingen gæt, ingen oprettelse). */
  function kanonisk(m) { if (!m) return m; const n = normalise(m); return n || m; }
  function erKendt(navn) { const n = normalise(navn); return !!n && n !== UKENDT; }
  function erUkendt(b) { return !b || normalise(b) === UKENDT; }
  /* Det, en bruger ser: uoplyst -> "Uoplyst mærke"; kendt -> kanonisk navn; ellers navnet som det står. */
  function visNavn(b) { if (erUkendt(b)) return UKENDT_LABEL; return kanonisk(String(b).trim()); }
  /* Nøgle til sammenligning uden hensyn til stavemåde/versaler (filtre, URL-parametre, tællinger). */
  function sammenlignNoegle(b) { return noegle(kanonisk(b) || ''); }

  function slug(navn) {
    if (erUkendt(navn)) return null;
    const p = find(navn);
    return p ? p.slug : slugFold(navn);
  }
  function fraSlug(s) { return slugTilPost.get(String(s || '')) || null; }
  function logoNoegle(navn) { const p = find(navn); return p ? (p.logo || p.slug) : null; }
  function alle() { return liste.slice(); }
  /* Alle registrerede mærker, til "Opret annonce": uanset om der er annoncer (sælgeren skal kunne vælge dem). */
  function valgbare() { return liste.map(p => p.navn).sort(sortDa); }

  /* Mærket, når en tekst STARTER med et registreret mærke efterfulgt af mindst ét ord mere (F2-014: ingen gæt). */
  function fraTekst(tekst) {
    if (!tekst) return null;
    const ord = fold(tekst).split(/[^a-z0-9]+/).filter(Boolean);
    for (const n of [3, 2, 1]) {
      if (ord.length < n + 1) continue;
      const k = ord.slice(0, n).join('');
      if (ukendtNoegler.has(k)) continue;
      const p = nogleTilPost.get(k);
      if (p) return p.navn;
    }
    return null;
  }

  /* ---------- Status og sideregler ---------- */
  /* 'aktiv' = har annoncer nu; 'uden-annoncer' = aktuelt/ukendt mærke uden annoncer; 'historisk' = historisk mærke uden annoncer. */
  function status(navn, antal) {
    const p = find(navn);
    if (antal > 0) return 'aktiv';
    return p && p.periode === 'historisk' ? 'historisk' : 'uden-annoncer';
  }
  /* Hvad et mærke må få: en tom side er en blindgyde; en tynd side er noindex; kun en rigtig side må indekseres. */
  function sideRegel(antal) {
    const n = Number(antal) || 0;
    return { side: n > 0, indekserbar: n >= MIN_ANNONCER_INDEKS, tekstpakke: n >= MIN_ANNONCER_INDEKS };
  }
  /* Delt opgørelse: hvilke registrerede mærker har annoncer, hvilke ikke, og hvad står uregistreret/uoplyst?
     `maerker` er listen af brand-felter fra lageret (en pr. annonce). */
  function opgoer(maerker) {
    const pr = new Map(), ukendt = { antal: 0 }, uregistreret = new Map();
    for (const b of maerker || []) {
      if (erUkendt(b)) { ukendt.antal++; continue; }
      const p = find(b);
      if (!p) { const k = String(b).trim(); uregistreret.set(k, (uregistreret.get(k) || 0) + 1); continue; }
      pr.set(p.navn, (pr.get(p.navn) || 0) + 1);
    }
    const iLager = liste.filter(p => pr.has(p.navn)).map(p => ({ navn: p.navn, slug: p.slug, antal: pr.get(p.navn) }));
    const udenAnnoncer = liste.filter(p => !pr.has(p.navn));
    return {
      iLager,
      udenAnnoncer: { aktuelle: udenAnnoncer.filter(p => p.periode !== 'historisk').map(p => p.navn).sort(sortDa),
                      historiske: udenAnnoncer.filter(p => p.periode === 'historisk').map(p => p.navn).sort(sortDa) },
      uoplyst: ukendt.antal,
      uregistreret: [...uregistreret].map(([navn, antal]) => ({ navn, antal })),
    };
  }

  /* ---------- Kandidater (nye mærker fra annoncekilder) ----------
     Et mærkenavn, kilden bruger, men som ikke står i registret, bliver ALDRIG et mærke af sig selv. Det vurderes her og
     logges af scripts/maerke-kandidater.js. Tilstande:
       registreret  findes (eller er "uoplyst")
       afvist       ser ikke ud som et mærke: generisk ord, tal/lang tekst (modelnavn/titel), kendt modelnavn, eller en
                    sandsynlig stavefejl af et registreret mærke (så er løsningen et alias, ikke et nyt mærke)
       afventer     ser ud som et mærke, men er set under MIN_FOREKOMSTER_KANDIDAT gange
       kandidat     ser ud som et mærke og er set mindst så mange gange: skal slås op (kilde) og evt. gives en post i MAERKER */
  const GENERISKE = new Set(['motorcykel', 'motorcykler', 'scooter', 'scootere', 'cykel', 'moped', 'knallert', 'trike', 'cruiser', 'naked', 'sport', 'touring',
    'adventure', 'enduro', 'cross', 'crosser', 'racer', 'custom', 'special', 'veteran', 'klassisk', 'el', 'elscooter', 'kabinescooter', 'kabine', 'koebes',
    'soeges', 'saelges', 'bytte', 'ny', 'brugt', 'mc', 'diverse', 'blandet', 'ukendt', 'uoplyst', 'x', 'test', 'null', 'undefined', 'nan']);
  function afstand(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  function vurderKandidat(raaNavn, antal, valg) {
    const o = valg || {};
    const min = o.min == null ? MIN_FOREKOMSTER_KANDIDAT : o.min;
    const navn = String(raaNavn == null ? '' : raaNavn).trim();
    const ud = (tilstand, aarsag, ekstra) => Object.assign({ navn, antal: antal || 0, tilstand, aarsag }, ekstra || {});
    const k = noegle(navn);
    const kendt = normalise(navn);
    if (kendt === UKENDT) return ud('registreret', 'uoplyst-betegnelse');
    if (kendt) return ud('registreret', 'findes', { maerke: kendt });
    if (!k || k.length < 2) return ud('afvist', 'tomt eller for kort');
    if (GENERISKE.has(k)) return ud('afvist', 'generisk ord, ikke et mærke');
    const ord = navn.split(/\s+/).filter(Boolean);
    if (/\d/.test(navn) || ord.length > 3 || navn.length > 30) return ud('afvist', 'ligner et modelnavn eller en titel (tal, mange ord eller lang tekst)');
    if (o.modelNoegler && o.modelNoegler.has(k)) return ud('afvist', 'er et kendt modelnavn');
    let naermest = null, bedst = 99;
    for (const p of liste) {
      for (const n of [p.navn, ...p.aliaser]) {
        const nk = noegle(n);
        const d = afstand(k, nk);
        if (d < bedst) { bedst = d; naermest = p.navn; }
      }
    }
    const graense = k.length >= 8 ? 2 : (k.length >= 4 ? 1 : 0);
    if (naermest && bedst <= graense) return ud('afvist', `sandsynlig stavefejl af ${naermest} (tilføj evt. som alias)`, { naermeste: naermest });
    if ((antal || 0) < min) return ud('afventer', `set ${antal || 0} gang(e); kræver mindst ${min}`);
    return ud('kandidat', `set ${antal} gange og ikke i registret — slå mærket op, tilføj kilde og en post i MAERKER`, { naermeste: naermest });
  }

  return {
    UKENDT, UKENDT_LABEL, UKENDT_ALIASER, MIN_ANNONCER_INDEKS, MIN_FOREKOMSTER_KANDIDAT, KILDER, MAERKER_ANTAL: liste.length,
    alle, valgbare, normalise, find, kanonisk, erKendt, erUkendt, visNavn, sammenlignNoegle, noegle, slug, fraSlug, slugFold, logoNoegle, fraTekst,
    status, sideRegel, opgoer, vurderKandidat, dubletter: dubletter.slice(),
  };
})();
// @@REGISTER-END
if (typeof module === 'object' && module.exports) module.exports = BrandRegistry;
