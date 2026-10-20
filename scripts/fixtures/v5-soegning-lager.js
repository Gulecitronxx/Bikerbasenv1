/* Lager-fixture til søgesidens CLS-/layouttest (js/v5-soegning-cls.test.js).

   Bygger ~735 rækker i formen fra tabellen eksterne_annoncer ud fra scripts/fixtures/v4-lager-maerker.json (de rigtige
   mærker, modeller, titler, typer og kilder fra produktions-lageret, læst 2026-10-19). Tallene (årgang, km, ccm, hk, pris,
   by) findes ikke i øjebliksbilledet og er derfor SYNTETISKE og deterministiske (samme række -> samme tal) — de er kun til
   at give kortene realistisk bredde (flere chips, lange titler). Ingen skrivning, intet netværk. */
const path = require('path');
const raa = require(path.join(__dirname, 'v4-lager-maerker.json'));

const uuid = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/* Deterministisk pseudo-tilfældighed (mulberry32), seedet pr. række. */
function tilf(seed){
  let t = seed + 0x6D2B79F5;
  return () => {
    t = (t + 0x6D2B79F5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const BYER = [['Rødding', 6630], ['Aarhus', 8000], ['Odense', 5000], ['Aalborg', 9000], ['København', 1000], ['Esbjerg', 6700], ['Herning', 7400],
  ['Kolding', 6000], ['Roskilde', 4000], ['Viborg', 8800], ['Næstved', 4700], ['Sønderborg', 6400], ['Hjørring', 9800], ['Nykøbing Falster', 4800]];

const KILDE = {
  'MC Syd': { navn: 'MC Syd', domaene: 'mcsyd.dk', forhandler: true },
  'Gul og Gratis': { navn: 'Gul og Gratis', domaene: 'guloggratis.dk', forhandler: false },
  'Rydbergs MC': { navn: 'Rydbergs MC', domaene: 'rydbergsmc.dk', forhandler: true },
  'Jensens Motorcykler': { navn: 'Jensens Motorcykler', domaene: 'jensensmotorcykler.dk', forhandler: true },
};

function lagerRaekker(maks){
  const liste = maks ? raa.raekker.slice(0, maks) : raa.raekker;
  return liste.map(([maerke, model, titel, type, url, kilde], i) => {
    const r = tilf(i + 1);
    const k = KILDE[kilde] || { navn: kilde, domaene: 'eksempel.dk', forhandler: false };
    const ny = /\/Ny\//.test(url);
    const aar = ny ? 2024 + Math.floor(r() * 2) : 1978 + Math.floor(r() * 47);
    const ccm = [125, 300, 400, 471, 650, 689, 750, 900, 1000, 1084, 1254, 1300, 1600, 1800][Math.floor(r() * 14)];
    const hk = Math.round(ccm * (0.05 + r() * 0.1));
    const by = BYER[Math.floor(r() * BYER.length)];
    return {
      id: uuid(i + 1),
      kilde_annonce_id: String(5000 + i),
      url,
      titel,
      maerke, model, variant: null, type,
      aargang: aar,
      km: ny ? 0 : Math.round((200 + r() * 60000) / 100) * 100,
      ccm: r() < 0.9 ? ccm : null,
      hk: r() < 0.85 ? hk : null,
      pris_dkk: r() < 0.94 ? Math.round((20000 + r() * 160000) / 100) * 100 : null,
      stand: ny ? 'ny' : (k.forhandler ? 'brugt' : null),
      salgsmarkoerer: /BYTTER GERNE/i.test(titel) ? ['BYTTER GERNE'] : [],
      udledte_felter: [],
      by: by[0], postnr: by[1],
      saelgertype: k.forhandler ? 'forhandler' : (i % 3 === 0 ? 'privat' : null),
      thumbnail_url: r() < 0.92 ? `https://images.danbase.dk/smoke/${i + 1}.jpg` : null,
      uddrag: null, status: 'aktiv',
      foerst_set: '2026-10-01', sidst_set: '2026-10-19T10:00:00Z',
      kilde: { navn: k.navn, domaene: k.domaene },
    };
  });
}

module.exports = { lagerRaekker, uuid };
