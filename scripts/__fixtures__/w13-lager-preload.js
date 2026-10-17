/* Preload til generatorer UDEN netværk og uden produktion: node -r scripts/__fixtures__/w13-lager-preload.js scripts/build-brand-pages.js
   Svarer på PostgREST-kaldene med syntetiske rækker (scripts/smoke-fixtures.js) og sørger for, at ALLE 29 mærker med
   mærkeside har mindst to annoncer — så maerker.html og alle maerke-*.html bygges med fuldt udvalg.
   Må kun bruges i en KOPI af repoet (generatoren skriver sine sider i repoets rod). */
const F = require('../smoke-fixtures.js');

const MAERKER = ['Honda', 'Harley-Davidson', 'Yamaha', 'Suzuki', 'BMW', 'Kawasaki', 'Triumph', 'KTM', 'Royal Enfield', 'BSA', 'Aprilia',
  'Ducati', 'Moto Guzzi', 'Husqvarna', 'Indian', 'Lauge Jensen', 'MV Agusta', 'Victory', 'Bach', 'Benelli', 'Buell', 'Cagiva', 'CFMoto',
  'Fantic', 'FB Mondial', 'Hyosung', 'Kymco', 'Rewaco', 'SYM'];

function raekker(){
  const base = F.eksterneRaekker();
  const ud = base.slice();
  let n = 5000;
  for (const m of MAERKER){
    const har = base.filter(r => r.maerke === m).length;
    for (let i = har; i < 2; i++){
      const r = JSON.parse(JSON.stringify(base[(n + i) % base.length]));
      n++;
      r.maerke = m; r.id = F.uuid(n); r.kilde_annonce_id = 'w13-' + n; r.url = `https://example.test/w13/${n}`;
      r.model = `${m} Testmodel ${i + 1}`;
      ud.push(r);
    }
  }
  return ud;
}
const DATA = raekker();
const orig = global.fetch;
global.fetch = async (url, opts) => {
  const u = new URL(String(url));
  if (/supabase\.co$/.test(u.hostname) && u.pathname.startsWith('/rest/v1/')){
    const tabel = u.pathname.replace('/rest/v1/', '');
    const lim = Number(u.searchParams.get('limit')) || undefined, off = Number(u.searchParams.get('offset')) || 0;
    const body = tabel === 'eksterne_annoncer' ? DATA.slice(off, lim ? off + lim : undefined)
      : tabel === 'listings' ? F.egneRaekker().slice(off, lim ? off + lim : undefined) : [];
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json', 'content-range': `0-${body.length}/${body.length}` } });
  }
  return orig(url, opts);
};
module.exports = { DATA, MAERKER };
