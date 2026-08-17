/* Tests for favoritsynkroniseringen. Kør: npm test

   Hvorfor lige den har tests: fordi fejlen var tavs og ramte brugerens egne
   data. `listFavorites()` slugte sin `error` og svarede `[]`. En tom liste
   fra en fejlet læsning kan ikke skelnes fra "brugeren har ingen
   favoritter", og syncFavorites() skrev den tomme liste tilbage i
   localStorage som om den var sandheden. Hjerterne slukkede, "Gemte" stod
   tom, og der stod ikke et ord nogen steder. Rækkerne var stadig i basen —
   det er visningen, der forsvandt, og det er værre end en fejlbesked.

   Mønstret er det samme som js/koerekort.test.js og js/eksternt-kort.test.js:
   browserscripts uden module.exports evalueres i en funktion, der giver
   navnene tilbage. Stubbene er kun til det, filen rører ved INDLÆSNING. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const KILDE = fs.readFileSync(path.join(__dirname, 'backend-bridge.js'), 'utf8');

const UUID_A = '11111111-2222-4333-8444-555555555555';
const UUID_B = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

/* Bygger et miljø op omkring backend-bridge.js og giver syncFavorites samt
   den localStorage, den skriver i, tilbage. */
function riggen({ listSvar, addSvar = () => ({ error: null }), lokale = [], bruger = { remote: true } }){
  const gemt = { favorites: JSON.stringify(lokale) };
  const advarsler = [];
  const skrevneKald = [];

  const noop = () => {};
  const elStub = () => ({
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, style: {},
    appendChild: noop, setAttribute: noop, getAttribute: () => null, addEventListener: noop,
    querySelector: () => null, querySelectorAll: () => [], dataset: {}, hidden: true,
    textContent: '', innerHTML: '',
  });

  const miljoe = {
    document: {
      addEventListener: noop, querySelector: () => null, querySelectorAll: () => [],
      getElementById: () => null, createElement: elStub, documentElement: elStub(),
      body: { classList: { add: noop, remove: noop }, appendChild: noop, style: {} },
      readyState: 'loading', title: '',
    },
    window: { location: { href: '', search: '', pathname: '/soegning.html' }, addEventListener: noop },
    location: { href: '', search: '', pathname: '/soegning.html', origin: 'http://localhost' },
    localStorage: {
      getItem: k => (k in gemt ? gemt[k] : null),
      setItem: (k, v) => { gemt[k] = v; },
      removeItem: k => { delete gemt[k]; },
    },
    console: { warn: (...a) => advarsler.push(a.join(' ')), log: noop, error: noop },
    isUuid: v => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v)),
    Store: {
      KEYS: { favorites: 'favorites' },
      getUser: () => bruger,
      getFavorites(){ try { return JSON.parse(gemt.favorites) || []; } catch { return []; } },
    },
    db: {
      enabled: true,
      listFavorites: async () => listSvar(),
      addFavorite: async id => { skrevneKald.push(id); return addSvar(id); },
    },
  };

  const navne = Object.keys(miljoe);
  const fabrik = new Function(...navne, `${KILDE}\nreturn { syncFavorites };`);
  const { syncFavorites } = fabrik(...navne.map(n => miljoe[n]));

  return {
    syncFavorites,
    advarsler,
    skrevneKald,
    favoritter: () => JSON.parse(gemt.favorites),
    raa: () => gemt.favorites,
  };
}

test('en fejlet laesning skriver IKKE til localStorage — de gemte annoncer bliver staaende', async () => {
  const r = riggen({
    listSvar: () => ({ ids: [], error: { message: 'network error' } }),
    lokale: [UUID_A, UUID_B, 1021],
  });
  const foer = r.raa();
  await r.syncFavorites();
  assert.strictEqual(r.raa(), foer, 'localStorage maa ikke roeres, naar databasen ikke kunne laeses');
  assert.deepStrictEqual(r.favoritter(), [UUID_A, UUID_B, 1021]);
  assert.strictEqual(r.skrevneKald.length, 0, 'der maa ikke skubbes op, naar vi ikke ved hvad der staar i basen');
  assert.match(r.advarsler.join('\n'), /ikke synkroniseret/i);
});

test('ingen aktiv session er ogsaa en fejl — ikke et tomt svar', async () => {
  // Praecis den vej fejlen gik i drift: listFavorites() svarede [] uden
  // grund, fordi auth ikke havde en bruger, og [] blev laest som sandhed.
  const r = riggen({
    listSvar: () => ({ ids: [], error: { message: 'Ingen aktiv session — favoritterne kunne ikke læses.' } }),
    lokale: [UUID_A],
  });
  await r.syncFavorites();
  assert.deepStrictEqual(r.favoritter(), [UUID_A]);
});

test('en favorit, der ikke kunne skrives op, bliver liggende lokalt', async () => {
  // Dubletfejlen fra favorites_pkey er den samme, der toemte listen foer:
  // skrivningen fejler, og id'et faldt ud af sammenfletningen.
  const r = riggen({
    listSvar: () => ({ ids: [], error: null }),
    addSvar: () => ({ error: { message: 'duplicate key value violates unique constraint "favorites_pkey"' } }),
    lokale: [UUID_A, UUID_B],
  });
  await r.syncFavorites();
  assert.deepStrictEqual(r.favoritter(), [UUID_A, UUID_B]);
  assert.match(r.advarsler.join('\n'), /kunne ikke gemmes/i);
});

test('en lykket synkronisering fletter database og lokalt sammen uden dubletter', async () => {
  const r = riggen({
    listSvar: () => ({ ids: [UUID_A], error: null }),
    lokale: [UUID_A, UUID_B, 1021],
  });
  await r.syncFavorites();
  assert.deepStrictEqual(r.favoritter(), [UUID_A, UUID_B, 1021]);
  assert.deepStrictEqual(r.skrevneKald, [UUID_B], 'kun det, basen ikke havde, skubbes op');
});

test('demo-favoritter med taltype overlever sammenfletningen', async () => {
  const r = riggen({
    listSvar: () => ({ ids: [UUID_A], error: null }),
    lokale: [1021, 1022],
  });
  await r.syncFavorites();
  assert.deepStrictEqual(r.favoritter(), [UUID_A, 1021, 1022]);
  assert.deepStrictEqual(r.skrevneKald, [], 'numeriske demo-id\'er hoerer ikke til i databasen');
});

test('kun i databasen: en favorit gemt paa en anden enhed kommer med ned', async () => {
  const r = riggen({
    listSvar: () => ({ ids: [UUID_A, UUID_B], error: null }),
    lokale: [],
  });
  await r.syncFavorites();
  assert.deepStrictEqual(r.favoritter(), [UUID_A, UUID_B]);
});
