/* Tests for skrivevejen i js/supabase-api.js: de to anonyme skrivninger
   (indberetning og visnings-/kontakttaelling) gaar gennem Edge Functions
   FOERST og falder tilbage til den direkte SDK-vej, saa laenge funktionen
   svarer 404 (supabase/022_anonym_skrivegulv.sql, C-004). Koer: npm test

   Hvorfor lige det har tests: tilbagefaldet er det, der goer det ufarligt at
   deploye funktioner og migration i vilkaarlig raekkefoelge. Ryger det, ryger
   enten taellingen eller indberetningskanalen — begge dele tavst.

   Moenstret er det samme som js/favoritter.test.js: browserscriptet uden
   module.exports evalueres i en funktion, der giver `db` tilbage. Stubbene
   er kun til det, filen roerer ved indlaesning + de to metoder her. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KILDE = fs.readFileSync(path.join(__dirname, 'supabase-api.js'), 'utf8');
const UUID = '11111111-2222-4333-8444-555555555555';

/* Bygger db op med en mocket fetch. `supabase` er undefined med vilje:
   saa svarer init() null, praecis som paa en laeseside hvor SDK'et ikke er
   hentet endnu — og ethvert SDK-kald ville vaelte testen. */
function riggen({ fetchSvar, supabaseSdk } = {}){
  const fetchKald = [];
  const fetchMock = async (url, init) => {
    fetchKald.push({ url, init });
    if (typeof fetchSvar === 'function') return fetchSvar(url, init);
    throw new Error('ingen fetch-stub');
  };

  const miljoe = {
    SUPABASE_CONFIG: { url: 'https://x.supabase.co', anonKey: 'k' },
    isSupabaseConfigured: () => true,
    supabase: supabaseSdk,
    fetch: fetchMock,
    isUuid: v => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v),
    console: { debug: () => {}, warn: () => {}, log: () => {}, error: () => {} },
  };
  const navne = Object.keys(miljoe);
  const fabrik = new Function(...navne, `${KILDE}\nreturn db;`);
  const db = fabrik(...navne.map(n => miljoe[n]));
  return { db, fetchKald };
}

/* Et Response-agtigt svar — kun det, kaldFunktion roerer ved. */
function svar(status, body){
  const tekst = typeof body === 'string' ? body : JSON.stringify(body);
  return { status, ok: status >= 200 && status < 300, text: async () => tekst };
}

test('kaldFunktion: POST til /functions/v1/<navn> med apikey-header og JSON-krop, svaret parses', async () => {
  const { db, fetchKald } = riggen({ fetchSvar: () => svar(200, { talt: true }) });
  const r = await db._kaldFunktion('haendelse', { listing_id: UUID, kind: 'view' });

  assert.equal(fetchKald.length, 1);
  assert.equal(fetchKald[0].url, 'https://x.supabase.co/functions/v1/haendelse');
  assert.equal(fetchKald[0].init.method, 'POST');
  assert.equal(fetchKald[0].init.headers.apikey, 'k');
  assert.equal(fetchKald[0].init.headers['Content-Type'], 'application/json');
  assert.equal(fetchKald[0].init.headers.Authorization, undefined, 'ingen bruger-JWT — funktionen ser paa IP, ikke identitet');
  assert.deepEqual(JSON.parse(fetchKald[0].init.body), { listing_id: UUID, kind: 'view' });

  assert.equal(r.status, 200);
  assert.deepEqual(r.data, { talt: true });
  assert.equal(r.ikkeDeployet, false);
  assert.equal(r.error, null);
});

test('kaldFunktion: 404 med NOT_FOUND fra gatewayen = ikke deployet', async () => {
  const { db } = riggen({ fetchSvar: () => svar(404, { code: 'NOT_FOUND', message: 'Requested function was not found' }) });
  const r = await db._kaldFunktion('indberet', {});
  assert.equal(r.status, 404);
  assert.equal(r.ikkeDeployet, true);

  // En 404 fra selve funktionen (uden gatewayens tekst) er IKKE "ikke deployet"
  const anden = riggen({ fetchSvar: () => svar(404, { error: 'Annoncen findes ikke' }) });
  const r2 = await anden.db._kaldFunktion('haendelse', {});
  assert.equal(r2.ikkeDeployet, false);
  assert.equal(r2.error.message, 'Annoncen findes ikke');
});

test('kaldFunktion: en kastende fetch giver ikkeDeployet=true og kaster ikke selv', async () => {
  const { db } = riggen({ fetchSvar: () => { throw new TypeError('Failed to fetch'); } });
  const r = await db._kaldFunktion('haendelse', {});
  assert.equal(r.ikkeDeployet, true);
  assert.equal(r.status, 0);
  assert.equal(r.data, null);
  assert.match(r.error.message, /Failed to fetch/);
});

test('kaldFunktion: uden SUPABASE_CONFIG svares ikkeDeployet, saa tilbagefaldet koerer', async () => {
  const fabrik = new Function('isSupabaseConfigured', 'fetch', 'console', `${KILDE}\nreturn db;`);
  const db = fabrik(() => false, async () => { throw new Error('maa ikke kaldes'); }, { debug(){}, warn(){}, log(){}, error(){} });
  const r = await db._kaldFunktion('haendelse', {});
  assert.equal(r.ikkeDeployet, true);
});

test('recordListingEvent: funktionen svarer 200 — SDK roeres ikke, og intet kastes', async () => {
  let rpcKald = 0;
  const sdk = { createClient: () => ({ rpc: async () => { rpcKald++; return { error: null }; } }) };
  const { db, fetchKald } = riggen({ fetchSvar: () => svar(200, { talt: false }), supabaseSdk: sdk });
  await db.recordListingEvent(UUID, 'view');
  assert.equal(fetchKald.length, 1);
  assert.equal(rpcKald, 0, 'naar funktionen svarer, bruges RPC ikke');

  // Ugyldigt id: hverken fetch eller RPC
  await db.recordListingEvent(1021, 'view');
  assert.equal(fetchKald.length, 1);
});

test('recordListingEvent: 404 fra gatewayen → tilbagefald til RPC naar SDK findes; uden SDK sker intet — og intet kastes', async () => {
  const rpcKald = [];
  const sdk = { createClient: () => ({ rpc: async (fn, args) => { rpcKald.push([fn, args]); return { error: null }; } }) };
  const med = riggen({ fetchSvar: () => svar(404, 'NOT_FOUND'), supabaseSdk: sdk });
  await med.db.recordListingEvent(UUID, 'contact');
  assert.deepEqual(rpcKald, [['record_listing_event', { p_listing: UUID, p_kind: 'contact' }]]);

  const uden = riggen({ fetchSvar: () => svar(404, 'NOT_FOUND') });
  await assert.doesNotReject(() => uden.db.recordListingEvent(UUID, 'view'));

  const netfejl = riggen({ fetchSvar: () => { throw new Error('offline'); } });
  await assert.doesNotReject(() => netfejl.db.recordListingEvent(UUID, 'view'));
});

test('addReport anonym: 429 → error.throttled; 201 → data.ok; 404 uden SDK → "Backend mangler."', async () => {
  const payload = { targetType: 'listing', targetId: UUID, reason: 'spam', comment: 'x' };

  const t = riggen({ fetchSvar: () => svar(429, { error: 'For mange indberetninger i dag.' }) });
  const r429 = await t.db.addReport(payload);
  assert.equal(r429.error.throttled, true);
  assert.equal(r429.error.message, 'For mange indberetninger i dag.');

  const ok = riggen({ fetchSvar: () => svar(201, { ok: true }) });
  const r201 = await ok.db.addReport(payload);
  assert.equal(r201.error, null);
  assert.equal(r201.data.ok, true);
  assert.equal(ok.fetchKald[0].url, 'https://x.supabase.co/functions/v1/indberet');
  assert.deepEqual(JSON.parse(ok.fetchKald[0].init.body), { target_type: 'listing', target_id: UUID, reason: 'spam', comment: 'x' });

  const mangler = riggen({ fetchSvar: () => svar(404, { code: 'NOT_FOUND' }) });
  const r404 = await mangler.db.addReport(payload);
  assert.equal(r404.error.message, 'Backend mangler.');

  const fejl = riggen({ fetchSvar: () => svar(400, { error: 'Ugyldig aarsag' }) });
  const r400 = await fejl.db.addReport(payload);
  assert.equal(r400.error.message, 'Ugyldig aarsag');
  assert.equal(r400.error.throttled, undefined);
});

test('addReport: 404 + SDK uden bruger → direkte insert med reporter_id null; indlogget → direkte insert, funktionen kaldes ikke', async () => {
  const inserts = [];
  function sdkMed(bruger){
    return { createClient: () => ({
      auth: { getUser: async () => ({ data: { user: bruger } }) },
      from: tabel => ({ insert: async række => { inserts.push([tabel, række]); return { data: null, error: null }; } }),
    }) };
  }
  const payload = { targetType: 'listing', targetId: 42, reason: 'spam', comment: '' };

  const anonym = riggen({ fetchSvar: () => svar(404, 'Requested function was not found'), supabaseSdk: sdkMed(null) });
  const r1 = await anonym.db.addReport(payload);
  assert.equal(r1.error, null);
  assert.equal(anonym.fetchKald.length, 1, 'funktionen proeves foerst');
  assert.deepEqual(inserts.pop(), ['reports', { reporter_id: null, target_type: 'listing', target_id: '42', reason: 'spam', comment: '' }]);

  const indlogget = riggen({ fetchSvar: () => { throw new Error('maa ikke kaldes'); }, supabaseSdk: sdkMed({ id: 'u-1' }) });
  const r2 = await indlogget.db.addReport(payload);
  assert.equal(r2.error, null);
  assert.equal(indlogget.fetchKald.length, 0, 'indloggede gaar direkte — RLS binder reporter_id til auth.uid()');
  assert.deepEqual(inserts.pop(), ['reports', { reporter_id: 'u-1', target_type: 'listing', target_id: '42', reason: 'spam', comment: '' }]);
});
