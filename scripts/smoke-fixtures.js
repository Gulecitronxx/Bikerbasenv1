/* Fixtures til scripts/smoke-browser.js — syntetiske annoncer, INGEN læsning fra produktion.

   Formerne er dem, js/backend-bridge.js forventer fra PostgREST:
     - eksterne_annoncer-rækker (se EKSTERNE_KOLONNER dér; eksempelformat i
       scripts/fixtures/eksterne-raekker-eksempel.json)
     - listings-rækker med sælger og fotos (EGNE_KOLONNER)
   Data er opdigtet, men realistisk nok til at kortene, filtrene og facetterne hydrerer: flere kilder, alle
   typer, 48/49 hk (A2-grænsen), manglende pris, manglende foto, komma og specialtegn i modelnavn, udledt ccm. */

const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/* [mærke, model, type, årgang, km, ccm, hk, pris, by, postnr, kilde, stand] */
const BASE = [
  ['Honda', 'CB 1000 R', 'Naked', 2021, 12400, 998, 145, 119900, 'Rødding', 6630, 'mcsyd', 'brugt'],
  ['Honda', 'CMX 500 Rebel', 'Cruiser', 2022, 5200, 471, 46, 54900, 'Rødding', 6630, 'mcsyd', 'brugt'],
  ['Honda', 'CMX 1100 D Rebel', 'Cruiser', 2023, 0, 1084, 87, 109900, 'Rødding', 6630, 'mcsyd', 'ny'],
  ['Honda', 'NT 1100 A', 'Touring', 2022, 8300, 1084, 102, 129900, 'Rødding', 6630, 'mcsyd', 'brugt'],
  ['Honda', 'XL 750 Transalp', 'Adventure', 2024, 1900, 755, 91, 94900, 'Rødding', 6630, 'mcsyd', 'brugt'],
  ['Honda', 'NX 500', 'Adventure', 2024, 0, 471, 48, 79900, 'Rødding', 6630, 'mcsyd', 'ny'],
  ['Honda', 'GL 1800 Gold Wing', 'Touring', 2019, 41000, 1833, 126, 189000, 'Rødding', 6630, 'mcsyd', 'brugt'],
  ['Honda', 'CL 500 A', 'Classic', 2023, 2100, 471, 48, 69900, 'Rødding', 6630, 'mcsyd', 'brugt'],
  ['Honda', 'CB 1000 Hornet', 'Naked', 2025, 0, 1000, 152, 124900, 'Rødding', 6630, 'mcsyd', 'ny'],
  ['Harley-Davidson', 'FLHX Street Glide', 'Touring', 2018, 28900, 1745, 84, 199000, 'Aarhus', 8000, 'guloggratis', null],
  ['Harley-Davidson', 'FLSTC Heritage Softail Classic', 'Cruiser', 2007, 61000, 1584, 63, 89500, 'Odense', 5000, 'guloggratis', null],
  ['Harley-Davidson', 'XL 883 Sportster, Iron', 'Cruiser', 2014, 33500, 883, 52, 62500, 'Horsens', 8700, '123mc', null],
  ['Yamaha', 'MT-07', 'Naked', 2019, 18700, 689, 74, 54900, 'Skive', 7800, 'guloggratis', null],
  ['Yamaha', 'MT-07 A2', 'Naked', 2020, 14200, 689, 48, 58900, 'Thisted', 7700, 'guloggratis', null],
  ['Yamaha', 'XV 750 Virago', 'Cruiser', 1994, 27000, 749, 49, 24500, 'Esbjerg', 6700, '123mc', null],
  ['Yamaha', 'Ténéré 700', 'Adventure', 2022, 9400, 689, 73, 89000, 'Vejle', 7100, 'guloggratis', null],
  ['Yamaha', 'YZF-R6', 'Sport', 2016, 22000, 599, 118, 62000, 'Kolding', 6000, '123mc', null],
  ['Kawasaki', 'Z 650', 'Naked', 2020, 11000, 649, 68, 59900, 'Roskilde', 4000, 'guloggratis', null],
  ['Kawasaki', 'Z 650, ABS', 'Naked', 2021, 7600, 649, 49, 62900, 'Næstved', 4700, 'guloggratis', null],
  ['Kawasaki', 'Ninja 400', 'Sport', 2019, 15200, 399, 49, 44900, 'Herning', 7400, '123mc', null],
  ['Kawasaki', 'Versys 650', 'Touring', 2017, 38900, 649, 69, 49900, 'Viborg', 8800, 'guloggratis', null],
  ['Suzuki', 'VZR 1800', 'Cruiser', 2007, 53000, 1783, 125, 89000, 'Aarhus', 8000, 'guloggratis', null],
  ['Suzuki', 'V-Strom 650', 'Adventure', 2018, 29900, 645, 71, 52900, 'Randers', 8900, '123mc', null],
  ['Suzuki', 'GSX-S 750', 'Naked', 2019, 17800, 749, 114, 64900, 'Silkeborg', 8600, 'guloggratis', null],
  ['BMW', 'R 1250 GS', 'Adventure', 2020, 24800, 1254, 136, 134900, 'Hillerød', 3400, 'mcsyd', 'brugt'],
  ['BMW', 'K 100 RT', 'Touring', 1985, 122000, 987, 90, 22000, 'Aalborg', 9000, 'guloggratis', null],
  ['BMW', 'R 45', 'Classic', 1979, 41000, 473, 35, 34500, 'Slagelse', 4200, '123mc', null],
  ['BMW', 'G 310 R', 'Naked', 2021, 6100, 313, 34, 34900, 'Holbæk', 4300, 'guloggratis', null],
  ['Triumph', 'Street Triple RS', 'Naked', 2019, 16400, 765, 123, 84900, 'København', 1000, 'mcsyd', 'brugt'],
  ['Triumph', 'Bonneville T120', 'Classic', 2020, 8800, 1200, 79, 94900, 'Frederiksberg', 2000, 'guloggratis', null],
  ['Ducati', 'Monster 821', 'Naked', 2018, 19300, 821, 109, 74900, 'Taastrup', 2630, 'guloggratis', null],
  ['Ducati', 'Multistrada 950', 'Adventure', 2019, 21000, 937, 113, 89900, 'Svendborg', 5700, '123mc', null],
  ['KTM', '390 Duke', 'Naked', 2020, 9900, 373, 44, 42900, 'Nykøbing F', 4800, 'guloggratis', null],
  ['KTM', '690 SMC R', 'Cross', 2016, 12800, 690, 74, 56900, 'Haderslev', 6100, '123mc', null],
  ['Royal Enfield', 'Interceptor 650', 'Classic', 2022, 4200, 648, 47, 54900, 'Sønderborg', 6400, 'guloggratis', null],
  ['Vespa', 'GTS 300', 'Scooter', 2019, 8100, 278, 23, 39900, 'København', 2100, 'guloggratis', null],
  ['Piaggio', 'MP3 500', 'Scooter', 2015, 26000, 493, 40, 34900, 'Odense', 5200, '123mc', null],
  ['Husqvarna', 'Svartpilen 401', 'Naked', 2021, 5400, 373, 44, 44900, 'Ringsted', 4100, 'guloggratis', null],
  ['Aprilia', 'RS 660', 'Sport', 2022, 3100, 659, 100, 74900, 'Gentofte', 2820, 'guloggratis', null],
  ['MV Agusta', 'Brutale 800', 'Naked', 2017, 14500, 798, 115, 69900, 'Hjørring', 9800, '123mc', null],
  ['Moto Guzzi', 'V7 III Stone', 'Classic', 2019, 7300, 744, 52, 64900, 'Fredericia', 7000, 'guloggratis', null],
  ['Lauge Jensen', 'Great Dane', 'Cruiser', 2012, 18000, 2000, 95, 159000, 'Ikast', 7430, '123mc', null],
  ['Indian', 'Scout Bobber', 'Cruiser', 2019, 11700, 1133, 100, 99900, 'Kalundborg', 4400, 'guloggratis', null],
];

const KILDER = {
  mcsyd: { navn: 'MC Syd', domaene: 'mcsyd.dk', url: (n, m, id) => `https://mcsyd.dk/Produkter/Motorcykel/Brugt/${encodeURIComponent(m)}/${100000 + id}` },
  guloggratis: { navn: 'Gul og Gratis', domaene: 'guloggratis.dk', url: (n, m, id) => `https://www.guloggratis.dk/annonce/${200000 + id}` },
  '123mc': { navn: '123mc', domaene: '123mc.dk', url: (n, m, id) => `https://www.123mc.dk/annonce/${300000 + id}` },
};

/* Rækker i formen fra tabellen eksterne_annoncer (med indlejret kilde). */
function eksterneRaekker(){
  const raekker = BASE.map((b, i) => {
    const [maerke, model, type, aargang, km, ccm, hk, pris, by, postnr, kilde, stand] = b;
    const k = KILDER[kilde];
    return {
      id: uuid(i + 1),
      kilde_annonce_id: String(1000 + i),
      url: k.url(maerke, model, i + 1),
      titel: `${maerke} ${model}${type && kilde === 'mcsyd' ? ' ' + type : ''}`,
      maerke, model, variant: null, type,
      aargang, km, ccm, hk, pris_dkk: pris, stand,
      salgsmarkoerer: i % 11 === 3 ? ['BYTTER GERNE'] : [],
      udledte_felter: i % 9 === 4 ? ['ccm'] : [],
      by, postnr, saelgertype: kilde === 'mcsyd' ? 'forhandler' : (i % 4 === 0 ? 'privat' : null),
      thumbnail_url: `https://images.danbase.dk/smoke/${i + 1}.jpg`,
      uddrag: null, status: 'aktiv',
      foerst_set: '2026-08-01', sidst_set: `2026-08-${String(10 + (i % 15)).padStart(2, '0')}T10:00:00Z`,
      kilde: { navn: k.navn, domaene: k.domaene },
    };
  });
  /* Kanttilfælde, der skal klare sig uden NaN/null i teksten. */
  raekker[4].thumbnail_url = null;            // manglende foto
  raekker[11].pris_dkk = null;                // manglende pris
  raekker[17].pris_dkk = null;
  raekker[17].thumbnail_url = null;
  raekker[23].km = null;                      // manglende km
  raekker[30].hk = null;                      // manglende effekt
  raekker[7].thumbnail_url = 'https://assets.guloggratis.dk/assets/files/default-listing.abc123.svg'; // kildens pladsholder
  return raekker;
}

/* Egne annoncer (tabellen listings) med sælger og fotos. */
function egneRaekker(){
  const saelger = (navn, forhandler) => ({
    id: 'aaaaaaaa-0000-4000-8000-000000000001', name: navn, is_dealer: forhandler, verified: false,
    city: 'Odense', company: forhandler ? 'Fynsk Motor ApS' : null, member_since: 2024,
  });
  const foto = (id, n) => Array.from({ length: n }, (_, p) => ({ id: `${id}-p${p}`, storage_path: `smoke/${id}/${p}.jpg`, position: p }));
  return [
    { id: uuid(901), seller_id: 'aaaaaaaa-0000-4000-8000-000000000001', brand: 'Kawasaki', model: 'ZX-6R', type: 'sport', year: 2013, km: 31000, ccm: 636, power: 130, price: 54900, condition: 'God stand', registration: null, afgift: null, postnr: 5000, city: 'Odense', region: 'Syddanmark', description: 'Velholdt, nye dæk.', created_at: '2026-08-20T09:00:00Z', status: 'active', seller: saelger('Mads', false), photos: foto(uuid(901), 3) },
    { id: uuid(902), seller_id: 'aaaaaaaa-0000-4000-8000-000000000001', brand: 'Honda', model: 'VFR 800', type: 'touring', year: 2010, km: 58000, ccm: 782, power: 106, price: 42000, condition: 'Brugt', registration: null, afgift: null, postnr: 5000, city: 'Odense', region: 'Syddanmark', description: 'Servicebog haves.', created_at: '2026-08-18T09:00:00Z', status: 'active', seller: saelger('Fynsk Motor', true), photos: foto(uuid(902), 1) },
    { id: uuid(903), seller_id: 'aaaaaaaa-0000-4000-8000-000000000001', brand: 'Yamaha', model: 'XJ6', type: 'naked', year: 2012, km: 40000, ccm: 600, power: 48, price: null, condition: 'Brugt', registration: null, afgift: null, postnr: 5000, city: 'Odense', region: 'Syddanmark', description: '', created_at: '2026-08-12T09:00:00Z', status: 'active', seller: saelger('Mads', false), photos: [] },
  ];
}

/* 1x1 PNG, bruges som svar på alle billedkald (kortenes billedboks har selv fast billedformat). */
const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

/* Svar på et PostgREST-kald. `sti` er alt efter /rest/v1/. Returnerer { status, body } (body = JS-værdi). */
function restSvar(sti, soegeparametre){
  const tabel = String(sti).split('?')[0];
  const p = soegeparametre || new URLSearchParams(String(sti).split('?')[1] || '');
  const sideStr = Number(p.get('limit'));
  const fra = Number(p.get('offset')) || 0;
  const udsnit = liste => {
    const til = sideStr ? fra + sideStr : undefined;
    return liste.slice(fra, til);
  };
  if (tabel === 'eksterne_annoncer') return { status: 200, body: udsnit(eksterneRaekker()) };
  if (tabel === 'listings') return { status: 200, body: udsnit(egneRaekker()) };
  return { status: 200, body: [] };   // favorites, public_profiles, krav, søgeagenter …
}

module.exports = { uuid, eksterneRaekker, egneRaekker, restSvar, PNG_1X1, ANTAL_EKSTERNE: BASE.length };
