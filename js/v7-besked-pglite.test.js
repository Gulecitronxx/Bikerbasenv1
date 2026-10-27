/* V7 beskeder: kører supabase/025_beskeder.sql i PGlite (WASM-Postgres) mod et STUBBET Supabase-skema. Kør:
     PGLITE_DIR=<mappe med node_modules/@electric-sql/pglite> node --test js/v7-besked-pglite.test.js
   PGlite er ikke en afhængighed i repoet (og må ikke blive det uden Orchestrators ok); uden pakken springes testen over med en
   tydelig besked. Ingen rigtig Supabase, ingen netværk, ingen produktionsdata.

   Hvad den BEVISER: filen kan køres (og igen), whitespace-only afvises i send_besked/svar_besked og af tabellens CHECK (Critic P2-B),
   hver skrivende RPC tager transaktions-advisory-låsen pr. bruger og holder den til commit (Critic P2-A), rækkegrænserne virker,
   rettighederne er som beskrevet.
   Hvad den IKKE beviser: ægte samtidighed. PGlite har én forbindelse, så to parallelle kald kan ikke modelleres; at låsen tages og
   holdes er målt i pg_locks, selve udelukkelsen er Postgres' egen garanti. Gentag derfor "30 parallelle send_besked" på en Supabase-branch. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
let PGlite = null;
try { PGlite = require(require.resolve('@electric-sql/pglite', { paths: [process.env.PGLITE_DIR || REPO] })).PGlite; } catch (e) { /* springes over */ }

const U = i => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
const SELLER = U(1), KOEB = U(2), UVER = U(4), LISTING = U(100);
const c = n => String.fromCharCode(n);
const TAB = c(9), LF = c(10), NBSP = c(160), ZW = c(8203), EM = c(8195), BOM = c(65279), IDEO = c(12288);

async function opsaet(){
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
    create schema net;
    create function net.http_post(url text, body jsonb default null, params jsonb default null, headers jsonb default null, timeout_milliseconds int default 1000) returns bigint language sql as $$ select 1::bigint $$;
    create table public.profiles (id uuid primary key, name text not null default '');
    create table public.listings (id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.profiles(id), brand text, model text, year int, status text not null default 'active');
    create table public.reports (id uuid primary key default gen_random_uuid(), reporter_id uuid, target_type text, target_id text, reason text, comment text, created_at timestamptz not null default now());
    grant usage on schema public to anon, authenticated;
    insert into public.profiles values ('${SELLER}','Saelger'),('${KOEB}','Koeber'),('${UVER}','Uver');
    insert into auth.users values ('${SELLER}','s@x.test',now()),('${KOEB}','k@x.test',now()),('${UVER}','u@x.test',null);
    insert into public.listings (id, seller_id, brand, model, year) values ('${LISTING}','${SELLER}','BMW','R45',1979);
  `);
  const sql = fs.readFileSync(path.join(REPO, 'supabase', '025_beskeder.sql'), 'utf8').replace('create extension if not exists pg_net;', '');
  await db.exec(sql);
  const som = async uid => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid || ''}', false); set role authenticated;`); };
  const rpc = async (navn, ...args) => (await db.query(`select public.${navn}(${args.map((_, i) => '$' + (i + 1)).join(',')}) as r`, args)).rows[0].r;
  return { db, som, rpc, sql };
}

test('025 kan køres, og kan køres igen uden fejl', { skip: !PGlite && 'PGlite ikke installeret (sæt PGLITE_DIR)' }, async () => {
  const { db, sql } = await opsaet();
  await db.exec(sql);
  await db.close();
});

test('P2-B: whitespace-/usynlig-tegn-only afvises af send_besked, svar_besked og tabellens CHECK', { skip: !PGlite && 'PGlite ikke installeret (sæt PGLITE_DIR)' }, async () => {
  const { db, som, rpc } = await opsaet();
  await som(KOEB);
  const blanke = { tab: TAB + TAB + TAB, linjeskift: LF + LF, 'mellemrum+tab': ' ' + TAB + ' ', nbsp: NBSP + NBSP, nulbredde: ZW + ZW + ZW, emspace: EM + EM, bom: BOM + BOM, ideografisk: IDEO + IDEO,
    blandet: TAB + NBSP + ZW + LF + EM };
  for (const [navn, t] of Object.entries(blanke)){
    assert.deepStrictEqual(await rpc('send_besked', LISTING, t, ''), { ok: false, kode: 'ugyldig_tekst' }, navn);
  }
  assert.strictEqual((await rpc('send_besked', LISTING, TAB + 'a' + TAB, '')).kode, 'ugyldig_tekst', 'ét tegn omgivet af tabulatorer = 1 tegn');
  const g = await rpc('send_besked', LISTING, 'Hej, er den til salg?', '');
  assert.strictEqual(g.ok, true);
  for (const t of [TAB + TAB, NBSP + NBSP, ZW + ZW]) assert.strictEqual((await rpc('svar_besked', g.samtale_id, t)).kode, 'ugyldig_tekst');
  await db.exec('reset role');
  assert.strictEqual((await db.query('select count(*)::int n from public.beskeder')).rows[0].n, 1, 'kun den rigtige besked er gemt');
  for (const t of [TAB + TAB, ZW + ZW + ZW]){
    await assert.rejects(db.query('insert into public.beskeder (samtale_id, afsender_id, tekst) values ($1,$2,$3)', [g.samtale_id, KOEB, t]), /beskeder_ikke_blank/);
  }
  assert.strictEqual((await db.query('select public.bb_rens_besked($1) t', [TAB + ' Hej ' + NBSP + LF])).rows[0].t, 'Hej');
  await db.close();
});

test('P2-A: hver skrivende RPC tager advisory-låsen pr. bruger og holder den til commit (målt i pg_locks)', { skip: !PGlite && 'PGlite ikke installeret (sæt PGLITE_DIR)' }, async () => {
  const { db, som, rpc } = await opsaet();
  await som(KOEB);
  const g = await rpc('send_besked', LISTING, 'Første besked her', '');
  const nogle = `((classid::bigint << 32) | objid::bigint) = hashtextextended('${KOEB}', 0)`;
  const taget = async fn => {
    await db.exec('reset role; begin;'); await som(KOEB);
    await fn();
    await db.exec('reset role');
    const under = (await db.query(`select count(*)::int n from pg_locks where locktype = 'advisory' and granted and ${nogle}`)).rows[0].n;
    await db.exec('commit');
    const efter = (await db.query(`select count(*)::int n from pg_locks where locktype = 'advisory'`)).rows[0].n;
    return [under, efter];
  };
  const kald = {
    send_besked: () => rpc('send_besked', LISTING, 'Endnu en besked her', ''),
    svar_besked: () => rpc('svar_besked', g.samtale_id, 'Et svar til sælgeren'),
    rapporter_samtale: () => rpc('rapporter_samtale', g.samtale_id, 'andet', 'x'),
    bloker_modpart: () => rpc('bloker_modpart', g.samtale_id),
    fjern_blokering: () => rpc('fjern_blokering', g.samtale_id),
    saet_besked_mail: () => rpc('saet_besked_mail', false),
  };
  for (const [navn, fn] of Object.entries(kald)) assert.deepStrictEqual(await taget(fn), [1, 0], `${navn}: låsen holdes under transaktionen og er væk efter commit`);
  assert.deepStrictEqual(await taget(() => rpc('send_besked', LISTING, TAB, '')), [0, 0], 'afviste kald (blank tekst) tager ingen lås');
  await db.close();
});

test('rækkegrænser: 5 pr. annonce pr. time; kald i samme transaktion tæller hinandens rækker', { skip: !PGlite && 'PGlite ikke installeret (sæt PGLITE_DIR)' }, async () => {
  const { db, som, rpc } = await opsaet();
  await som(KOEB);
  const kodeFor = async i => (await rpc('send_besked', LISTING, 'Besked nummer ' + i, '')).kode || 'ok';
  const serielt = []; for (let i = 1; i <= 6; i++) serielt.push(await kodeFor(i));
  assert.deepStrictEqual(serielt, ['ok', 'ok', 'ok', 'ok', 'ok', 'for_mange_pr_annonce']);
  await db.exec('reset role; delete from public.beskeder; delete from public.samtaler; begin;'); await som(KOEB);
  const iTx = []; for (let i = 1; i <= 6; i++) iTx.push(await kodeFor(i));
  await db.exec('reset role; commit;');
  assert.deepStrictEqual(iTx, ['ok', 'ok', 'ok', 'ok', 'ok', 'for_mange_pr_annonce']);
  await db.close();
});

test('rettigheder: anon og authenticated kan ikke kalde interne funktioner; anon kan ikke kalde RPC\'erne; uverificeret kan ikke skrive', { skip: !PGlite && 'PGlite ikke installeret (sæt PGLITE_DIR)' }, async () => {
  const { db, som, rpc } = await opsaet();
  await som(KOEB);
  await assert.rejects(db.query('select public.bb_er_blank($1)', ['x']), /permission denied/);
  await assert.rejects(db.query('select public.bb_rens_besked($1)', ['x']), /permission denied/);
  await assert.rejects(db.query('insert into public.beskeder (samtale_id, afsender_id, tekst) values ($1,$2,$3)', [U(5), KOEB, 'hej hej']), /permission denied/);
  await som(UVER);
  assert.strictEqual((await rpc('send_besked', LISTING, 'Hej, er den til salg?', '')).kode, 'ikke_verificeret');
  await db.exec('reset role; set role anon;');
  await assert.rejects(db.query('select public.send_besked($1,$2,$3)', [LISTING, 'hej hej', '']), /permission denied/);
  await db.close();
});
