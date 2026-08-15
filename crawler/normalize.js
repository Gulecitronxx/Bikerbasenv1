/* Normalisering af danske annoncedata.

   Det her er stedet, hvor en crawler i praksis går i stykker. Kilderne
   skriver det samme på et dusin måder, og en enkelt forkert parsning giver
   en motorcykel til 125 kr. eller en årgang på 20 i søgeresultatet.

   Alle funktioner returnerer null frem for at gætte. En manglende værdi kan
   vises som "ikke oplyst"; en forkert værdi bliver til en løgn på et kort.
*/

/* ---------- Pris ----------
   Danske kilder skriver: "125.000 kr.", "125.000,-", "kr. 125.000",
   "125000", "Pris: 125.000 DKK", "Ring for pris".

   Punktum er tusindtalsseparator på dansk, komma er decimaltegn — omvendt af
   engelsk. "125.000" er hundredetusinde, ikke hundrede og femogtyve. Den
   fejl er 1000x og fanges ikke af en gennemsnitsberegning. */
function parsePris(raa){
  if (raa == null) return null;
  const s = String(raa).toLowerCase();
  if (/ring|forhandling|efter aftale|byd|tilbud/.test(s)) return null;

  // Fjern alt der ikke er cifre, punktum eller komma. Trim derefter
  // separatorer i enderne: "125.000,50 kr." efterlader et punktum fra "kr.",
  // og så rammer decimal-mønstret nedenfor ikke — hele beløbet blev læst som
  // 12.500.050 og afvist som urealistisk.
  const tal = s.replace(/[^\d.,]/g, '').replace(/^[.,]+|[.,]+$/g, '');
  if (!tal) return null;

  // Sidste komma med præcis to cifre efter er decimaler; alt andet er støj.
  let n = tal;
  const dec = n.match(/,(\d{2})$/);
  n = dec ? n.slice(0, -3) : n;
  n = n.replace(/[.,]/g, '');
  if (!n) return null;

  const v = Number(n);
  // En brugt motorcykel under 1.000 kr. er en fejlparsning, ikke et fund.
  // Over 2 mio. er det også — dyreste nye i DK ligger langt under.
  if (!Number.isFinite(v) || v < 1000 || v > 2_000_000) return null;
  return v;
}

/* ---------- Kilometer ----------
   "12.500 km", "12500", "12.500 kilometer", "ca. 12.500 km", "12,500 km"
   (nogle skriver engelsk-style). Nul km er gyldigt for en fabriksny. */
function parseKm(raa){
  if (raa == null) return null;
  const s = String(raa).toLowerCase();
  if (/ukendt|ikke oplyst|n\/a/.test(s)) return null;
  const tal = s.replace(/[^\d.,]/g, '').replace(/[.,]/g, '');
  if (!tal) return null;
  const v = Number(tal);
  // Over 500.000 km på en motorcykel er en fejlparsning (fx sammenløbet
  // pris og km), ikke en veteran med mange ture.
  if (!Number.isFinite(v) || v < 0 || v > 500_000) return null;
  return v;
}

/* ---------- Årgang ----------
   "2019", "Årg. 2019", "årgang 2019", "2019-model", "1. reg. 03/2019".
   Ved måned/år tager vi året. */
function parseAargang(raa){
  if (raa == null) return null;
  const s = String(raa);
  // Find et firecifret år i et realistisk interval
  const m = s.match(/\b(18[89]\d|19\d{2}|20[0-4]\d)\b/);
  if (!m) return null;
  const v = Number(m[1]);
  const naeste = new Date().getFullYear() + 1;
  if (v < 1885 || v > naeste) return null;   // 1885 = verdens første MC
  return v;
}

/* ---------- Kubik ----------
   "649 ccm", "649cc", "0,6 l", "649 cm³". */
function parseCcm(raa){
  if (raa == null) return null;
  const s = String(raa).toLowerCase();

  // Liter-angivelse: "0,6 l" eller "1.2 liter"
  const liter = s.match(/(\d+[.,]\d+)\s*l(?:iter)?\b/);
  if (liter){
    const v = Math.round(Number(liter[1].replace(',', '.')) * 1000);
    return v >= 25 && v <= 2500 ? v : null;
  }
  const tal = s.replace(/[^\d]/g, '');
  if (!tal) return null;
  const v = Number(tal);
  // Under 25 ccm findes ikke; over 2500 er en bilmotor eller en fejl.
  if (!Number.isFinite(v) || v < 25 || v > 2500) return null;
  return v;
}

/* ---------- Postnummer ----------
   Danske postnumre er 1000-9999. "8000 Aarhus C", "DK-8000", "8000". */
function parsePostnr(raa){
  if (raa == null) return null;
  const m = String(raa).match(/\b([1-9]\d{3})\b/);
  if (!m) return null;
  const v = Number(m[1]);
  return v >= 1000 && v <= 9999 ? m[1] : null;
}

/* ---------- Mærke ----------
   Samme mærke skrives på mange måder. Uden det her bliver "Harley Davidson"
   og "Harley-Davidson" til to mærker i filteret, og begge ser tomme ud. */
const MAERKE_ALIAS = {
  'harley davidson': 'Harley-Davidson', 'harley': 'Harley-Davidson', 'hd': 'Harley-Davidson',
  'harley-davidson': 'Harley-Davidson', 'h-d': 'Harley-Davidson',
  'bmw motorrad': 'BMW', 'bmw': 'BMW',
  'moto guzzi': 'Moto Guzzi', 'motoguzzi': 'Moto Guzzi',
  'royal enfield': 'Royal Enfield', 'royalenfield': 'Royal Enfield',
  'ktm': 'KTM', 'mv agusta': 'MV Agusta', 'mvagusta': 'MV Agusta',
  'can am': 'Can-Am', 'can-am': 'Can-Am',
  'yamaha': 'Yamaha', 'honda': 'Honda', 'suzuki': 'Suzuki', 'kawasaki': 'Kawasaki',
  'ducati': 'Ducati', 'triumph': 'Triumph', 'aprilia': 'Aprilia', 'husqvarna': 'Husqvarna',
  'vespa': 'Vespa', 'piaggio': 'Piaggio', 'indian': 'Indian', 'benelli': 'Benelli',
  'nimbus': 'Nimbus', 'mz': 'MZ', 'jawa': 'Jawa', 'cf moto': 'CFMoto', 'cfmoto': 'CFMoto',
};

function normaliserMaerke(raa){
  if (!raa) return null;
  const n = String(raa).trim().toLowerCase().replace(/\s+/g, ' ');
  if (MAERKE_ALIAS[n]) return MAERKE_ALIAS[n];
  // Ukendt mærke: behold det, men med stort begyndelsesbogstav.
  return n.split(' ').map(o => o.charAt(0).toUpperCase() + o.slice(1)).join(' ');
}

/* ---------- Sælgertype ---------- */
function normaliserSaelgertype(raa){
  if (!raa) return null;
  const s = String(raa).toLowerCase();
  if (/forhandler|dealer|erhverv|firma|aps|a\/s/.test(s)) return 'forhandler';
  if (/privat|private/.test(s)) return 'privat';
  return null;
}

/* ---------- Uddrag ----------
   Vi gemmer aldrig den fulde annoncetekst. 200 tegn, klippet ved et
   ordskel, så det ikke stopper midt i et ord. */
function uddrag(raa, maks = 200){
  if (!raa) return null;
  const t = String(raa).replace(/\s+/g, ' ').trim();
  if (!t) return null;
  if (t.length <= maks) return t;
  const skaaret = t.slice(0, maks);
  const sidsteMellemrum = skaaret.lastIndexOf(' ');
  return (sidsteMellemrum > maks * 0.6 ? skaaret.slice(0, sidsteMellemrum) : skaaret).trim() + '…';
}

/* ---------- Fingerprint ----------
   Samme motorcykel annonceret tre steder skal være ÉN annonce hos os med tre
   kilde-links. Nøglen er de felter, der ikke ændrer sig mellem kilder.

   Prisen er bevidst afrundet til nærmeste 1.000: samme cykel annonceres tit
   til 124.900 ét sted og 125.000 et andet, og uden afrunding ville de aldrig
   mødes. */
const crypto = require('crypto');

function fingerprint({ maerke, model, aargang, km, pris_dkk, postnr }){
  /* Km indgår IKKE. Afrunding kan ikke samle to tal på hver side af en
     grænse — 12.400 bliver 12, 12.600 bliver 13, og så er samme cykel to
     annoncer. Og kilometerstanden er alligevel målt på hvert sit tidspunkt,
     når den samme motorcykel står to steder. Mærke, model, årgang, prisniveau
     og postnummer er nok til at kende den igen. */
  const dele = [
    (maerke || '').toLowerCase(),
    (model || '').toLowerCase().replace(/[\s-]+/g, ''),
    aargang || '',
    pris_dkk != null ? Math.round(pris_dkk / 1000) : '',
    postnr || '',
  ];
  return crypto.createHash('sha1').update(dele.join('|')).digest('hex');
}

module.exports = {
  parsePris, parseKm, parseAargang, parseCcm, parsePostnr,
  normaliserMaerke, normaliserSaelgertype, uddrag, fingerprint,
};
