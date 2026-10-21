/* V6: mock-lager til de indloggede konto-sider (mine-annoncer, dashboard, opret-annonce, login) i scripts/smoke-browser.js --login-mock
   og i js/v6-konto-cls.test.js. Bygger oven på scripts/w9-saelger-mock.js (ingen forespørgsel forlader maskinen, ingen rigtige konti).

   Lageret er med vilje STORT NOK til at vise alt det, der kan flytte layoutet efter første maling: flere annoncerækker i hver status (aktiv,
   pause, solgt), tællerstriben (visninger, favoritter, telefonvisninger pr. aktiv række), statistikkortene på oversigten, søgeagenter,
   gemte annoncer og — for forhandleren — indekserede annoncer og krav.

   const { lavKontoBackend } = require('./fixtures/v6-konto-lager');
   const bak = lavKontoBackend({ forhandler: true });         // forhandler => dashboard.html bliver på siden
   await bak.installer(context, { tema: 'lys' });

   Alle tal er syntetiske; id'erne er faste, så to kørsler giver samme side. */

const { lavBackend, BRUGER_ID } = require('../w9-saelger-mock');

const ID = n => `bbbbbbbb-0000-4000-8000-${String(n).padStart(12, '0')}`;
const FOTO_ID = (n, k) => `cccccccc-0000-4000-8000-${String(n * 100 + k).padStart(12, '0')}`;
const foto = (n, antal) => Array.from({ length: antal }, (_, i) => ({ id: FOTO_ID(n, i), storage_path: `${BRUGER_ID}/${n}-${i}.png`, position: i }));
const dagSt = tilbage => new Date(Date.now() - tilbage * 86400000).toISOString().slice(0, 10);

/* 11 egne annoncer: 7 aktive, 2 på pause, 2 solgte. Titlerne varierer i længde (lang titel = ombrydning = højere række). */
const ANNONCER = [
  { n: 1, brand: 'Honda', model: 'CBR650R', type: 'sport', year: 2022, km: 12834, price: 99900, city: 'Aarhus', dage: 3, fotos: 8 },
  { n: 2, brand: 'BMW', model: 'R 1250 GS Adventure Rallye Edition', type: 'adventure', year: 2021, km: 18460, price: 189900, city: 'Odense', dage: 9, fotos: 5 },
  { n: 3, brand: 'KTM', model: '390 Adventure', type: 'adventure', year: 2023, km: 4820, price: 59900, city: 'Esbjerg', dage: 20, fotos: 3, status: 'hidden' },
  { n: 4, brand: 'Yamaha', model: 'MT-07', type: 'naked', year: 2020, km: 21500, price: 64900, city: 'Aalborg', dage: 1, fotos: 4 },
  { n: 5, brand: 'Harley-Davidson', model: 'Street Glide Special', type: 'touring', year: 2019, km: 31200, price: 219900, city: 'Kolding', dage: 14, fotos: 6 },
  { n: 6, brand: 'Triumph', model: 'Speed Twin 900', type: 'naked', year: 2022, km: 7400, price: 109900, city: 'Roskilde', dage: 5, fotos: 0 },
  { n: 7, brand: 'Kawasaki', model: 'Z900', type: 'naked', year: 2021, km: 15300, price: 84900, city: 'Randers', dage: 30, fotos: 2, status: 'sold' },
  { n: 8, brand: 'Ducati', model: 'Monster 937', type: 'naked', year: 2023, km: 2900, price: 129900, city: 'Herning', dage: 2, fotos: 5 },
  { n: 9, brand: 'Suzuki', model: 'V-Strom 650 XT', type: 'adventure', year: 2018, km: 38900, price: 54900, city: 'Vejle', dage: 40, fotos: 3, status: 'hidden' },
  { n: 10, brand: 'Royal Enfield', model: 'Himalayan 450', type: 'adventure', year: 2024, km: 1200, price: 52900, city: 'Svendborg', dage: 6, fotos: 4 },
  { n: 11, brand: 'Honda', model: 'CB 1000 Hornet SP', type: 'naked', year: 2025, km: 800, price: 139900, city: 'Horsens', dage: 11, fotos: 7, status: 'sold' },
];

function lavKontoBackend(opts = {}){
  const bak = lavBackend({
    loggetInd: opts.loggetInd !== false,
    forhandler: !!opts.forhandler,
    stortFoto: opts.stortFoto,
    annoncer: ANNONCER.map(a => ({ id: ID(a.n), brand: a.brand, model: a.model, type: a.type, year: a.year, km: a.km, price: a.price, city: a.city,
      status: a.status || 'active', dageGammel: a.dage, photos: foto(a.n, a.fotos) })),
    saves: ANNONCER.filter(a => !a.status).map((a, i) => ({ listing: ID(a.n), saves: [18, 4, 0, 9, 2, 31, 7][i % 7] })),
    login: opts.login,
  });
  const t = bak.tilstand.tabeller;
  /* Dagstal (60 dage) for de aktive annoncer; en enkelt aktiv annonce uden trafik (viser "Ingen visninger endnu"). */
  ANNONCER.filter(a => !a.status && a.n !== 6).forEach((a, i) => {
    for (let d = 0; d < 60; d++){
      const views = ((a.n * 7 + d * 3 + i) % 23) + (d < 30 ? 4 : 1);
      t.listing_stats.push({ listing_id: ID(a.n), stat_day: dagSt(d), views, contacts: (a.n + d) % 11 === 0 ? 1 + (d % 3) : 0 });
    }
  });
  t.saved_searches.push(
    { id: 'dddddddd-0000-4000-8000-000000000001', user_id: BRUGER_ID, label: 'Naked under 90.000 kr.', query: 'types=naked&priceMax=90000', notify: true, created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
    { id: 'dddddddd-0000-4000-8000-000000000002', user_id: BRUGER_ID, label: 'A2-motorcykler i Jylland', query: 'koerekort=A2&region=Midtjylland', notify: false, created_at: new Date(Date.now() - 9 * 86400000).toISOString() },
    { id: 'dddddddd-0000-4000-8000-000000000003', user_id: BRUGER_ID, label: 'Honda CB 650', query: 'q=cb+650', notify: true, created_at: new Date(Date.now() - 20 * 86400000).toISOString() },
  );
  /* Favoritter på andres annoncer (id'er der ikke findes i listings): siden skal klare "forsvundne" rækker ærligt. */
  t.favorites.push({ id: 'eeeeeeee-0000-4000-8000-000000000001', user_id: BRUGER_ID, listing_id: ID(1), created_at: new Date().toISOString() });
  if (opts.forhandler){
    for (let k = 1; k <= 4; k++){
      t.eksterne_annoncer.push({ id: `ffffffff-0000-4000-8000-00000000000${k}`, titel: `Suzuki GSX-S 750 – eksempel ${k}`, maerke: 'Suzuki', model: 'GSX-S 750',
        aargang: 2017 + k, km: 9000 * k, pris_dkk: 59900 + k * 3000, by: 'Aarhus', thumbnail_url: null, url: 'https://eksempel.test/annonce/' + k, status: 'aktiv',
        sidst_set: new Date().toISOString(), ejet_af: BRUGER_ID, kilde: { navn: 'Eksempel MC', domaene: 'eksempel.test' } });
    }
    t.krav.push({ id: 'abababab-0000-4000-8000-000000000001', annonce_id: 'ffffffff-0000-4000-8000-000000000001', status: 'afventer', dokumentation: 'Vi er forhandler.',
      oprettet: new Date(Date.now() - 2 * 86400000).toISOString(), behandlet: null, bruger_id: BRUGER_ID,
      annonce: { titel: 'Suzuki GSX-S 750 – eksempel 1', maerke: 'Suzuki', model: 'GSX-S 750', url: 'https://eksempel.test/annonce/1', thumbnail_url: null } });
  }
  return bak;
}

module.exports = { lavKontoBackend, ANNONCER, ID };
