/* V7 beskeder: STATISK tjek af supabase/025_beskeder.sql og Edge Function besked-notifikation (node, ingen database).
   Kør: node --test js/v7-besked-sql.test.js

   Ærligt om rækkevidden: testen parser SQL-teksten. Den beviser, at reglerne STÅR i filen (RLS på alle tabeller, ingen
   bred læsepolitik, ingen skriveadgang for klientroller, rate limit, security definer med fast search_path, ingen
   e-mail/telefon i svar) — ikke at Postgres accepterer filen eller opfører sig som beskrevet. Den afprøves på et
   staging-projekt/en branch, før flaget tændes (aktiveringsguiden, docs/review/gauntlet/v7/besked.md). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const SQL = fs.readFileSync(path.join(REPO, 'supabase', '025_beskeder.sql'), 'utf8');
const EDGE = fs.readFileSync(path.join(REPO, 'supabase', 'functions', 'besked-notifikation', 'index.ts'), 'utf8');
/* SQL uden linjekommentarer, så ord i forklaringerne ikke giver falske fund. */
const KODE = SQL.replace(/^\s*--.*$/gm, '');

const TABELLER = [...KODE.matchAll(/create table if not exists public\.(\w+)/g)].map(m => m[1]);
const FUNKTIONER = [...KODE.matchAll(/create or replace function public\.(\w+)\s*\(([^)]*)\)([\s\S]*?)\$fn\$;/g)]
  .map(m => ({ navn: m[1], args: m[2], krop: m[0] }));

test('filen er ren ASCII og har de fire tabeller', () => {
  assert.ok(!/[^\x00-\x7F]/.test(SQL), 'migrationen skal være ren ASCII (som 023/024): ' + (SQL.match(/[^\x00-\x7F]/) || [''])[0]);
  assert.deepStrictEqual(TABELLER.sort(), ['besked_blokeringer', 'besked_indstillinger', 'beskeder', 'samtaler']);
});

test('RLS er slået til på ALLE tabeller', () => {
  for (const t of TABELLER){
    assert.match(KODE, new RegExp(`alter table public\\.${t}\\s+enable row level security`), `${t} mangler enable row level security`);
  }
});

test('ingen politik giver bred læseadgang eller skriveadgang: kun SELECT for deltagerne, til authenticated', () => {
  const politikker = [...KODE.matchAll(/create policy "([^"]+)" on public\.(\w+)([\s\S]*?);/g)];
  assert.strictEqual(politikker.length, 2, 'netop to politikker: samtaler og beskeder');
  for (const [, navn, tabel, krop] of politikker){
    assert.match(krop, /for select/, `${navn}: kun SELECT`);
    assert.match(krop, /to authenticated/, `${navn}: kun indloggede`);
    assert.doesNotMatch(krop, /to\s+(anon|public)\b/i, `${navn}: aldrig anon/public`);
    assert.doesNotMatch(krop, /using\s*\(\s*true\s*\)/i, `${navn}: ingen "using (true)"`);
    assert.match(krop, /auth\.uid\(\)/, `${navn}: binder til den indloggede bruger`);
    assert.match(krop, /seller_id/, `${navn}: sælger-siden`);
    assert.match(krop, /buyer_id/, `${navn}: køber-siden`);
    assert.ok(['samtaler', 'beskeder'].includes(tabel));
  }
  assert.doesNotMatch(KODE, /for\s+(insert|update|delete|all)\b/i, 'ingen politik for skrivning: alt går gennem funktionerne');
});

test('grant-gulv: klientroller mister alt og får kun SELECT på samtaler og beskeder', () => {
  assert.match(KODE, /revoke all on public\.samtaler, public\.beskeder, public\.besked_blokeringer, public\.besked_indstillinger\s+from public, anon, authenticated/);
  assert.match(KODE, /grant select on public\.samtaler, public\.beskeder to authenticated/);
  const grants = [...KODE.matchAll(/^\s*grant\s+([^;]+);/gim)].map(m => m[1]);
  for (const g of grants){
    assert.doesNotMatch(g, /\b(insert|update|delete|truncate|all)\b/i, `grant giver skriveret: ${g}`);
    assert.doesNotMatch(g, /\banon\b/i, `grant til anon: ${g}`);
  }
});

test('hver funktion er security definer med fast search_path (eller en ren, uden adgang udefra)', () => {
  assert.ok(FUNKTIONER.length >= 14, 'funktionerne findes: ' + FUNKTIONER.map(f => f.navn).join(', '));
  for (const f of FUNKTIONER){
    assert.match(f.krop, /set search_path = ''/, `${f.navn}: search_path skal være tom (ingen kapring via schema)`);
    if (!/^bb_/.test(f.navn)) assert.match(f.krop, /security definer/, `${f.navn}: security definer`);
  }
});

test('kun indloggede kan kalde de ti klientfunktioner; hjælpere, trigger og oprydning kan ingen kalde', () => {
  const liste = KODE.match(/array\[([\s\S]*?)\]/)[1];
  const klient = [...liste.matchAll(/'public\.(\w+)\(/g)].map(m => m[1]);
  assert.deepStrictEqual(klient.sort(), ['bloker_modpart', 'fjern_blokering', 'hent_besked_mail', 'hent_samtale', 'mine_samtaler',
    'rapporter_samtale', 'saet_besked_mail', 'send_besked', 'svar_besked', 'ulaeste_samtaler']);
  assert.match(KODE, /revoke execute on function %s from public, anon/);
  assert.match(KODE, /grant execute on function %s to authenticated/);
  for (const n of ['bb_rens_besked', 'bb_antal_links', 'besked_notifikation', 'ryd_gamle_samtaler']){
    assert.match(KODE, new RegExp(`revoke execute on function public\\.${n}\\([^)]*\\) from public, anon, authenticated`), `${n} skal være lukket for klientroller`);
  }
  for (const f of FUNKTIONER) assert.ok(klient.includes(f.navn) || /^bb_|besked_notifikation|ryd_gamle/.test(f.navn), `${f.navn} mangler adgangsregel`);
});

test('ingen funktion eller tabel udstiller e-mail eller telefon', () => {
  assert.doesNotMatch(KODE, /\bphone\b|\btelefon\b/i, 'ingen telefon i beskedmodellen');
  const emailBrug = [...KODE.matchAll(/\b\w*email\w*\b/gi)].map(m => m[0].toLowerCase());
  for (const e of emailBrug) assert.strictEqual(e, 'email_confirmed_at', `e-mail-kolonne i brug: ${e} (kun verificeringsflaget må læses)`);
  /* Svar-objekterne indeholder kun disse nøgler om modparten: navn og roller. */
  const hent = FUNKTIONER.find(f => f.navn === 'hent_samtale').krop;
  assert.match(hent, /'modpart_navn'/);
  assert.doesNotMatch(hent, /auth\.users/, 'hent_samtale rører ikke auth.users');
});

test('rate limit sker i databasen: timegrænse, døgngrænse, pr. annonce, nye samtaler, dublet, links, honeypot', () => {
  const send = FUNKTIONER.find(f => f.navn === 'send_besked').krop;
  assert.match(send, /interval '1 hour'\) >= 20/, 'højst 20 beskeder pr. time pr. bruger');
  assert.match(send, /interval '24 hours'\) >= 100/, 'højst 100 pr. døgn');
  assert.match(send, /interval '1 hour'\) >= 5/, 'højst 5 pr. annonce pr. time');
  assert.match(send, /interval '24 hours'\) >= 10/, 'højst 10 nye samtaler pr. døgn');
  assert.match(send, /interval '10 minutes'/, 'dublet-spærre');
  assert.match(send, /bb_antal_links\(v_tekst\) > 2/);
  assert.match(send, /p_honning/, 'honeypot-parameter');
  assert.match(send, /email_confirmed_at is not null/, 'kun verificeret e-mail');
  assert.match(send, /egen_annonce/);
  assert.match(send, /annonce_ikke_aktiv/);
  const svar = FUNKTIONER.find(f => f.navn === 'svar_besked').krop;
  assert.match(svar, /interval '1 hour'\) >= 30/);
  assert.match(svar, /annonce_ikke_aktiv/, 'svar er låst, når annoncen ikke er aktiv');
  assert.match(svar, /blokeret/);
  assert.match(svar, /email_confirmed_at is not null/);
});

test('samtaler overlever en slettet annonce (set null + titel-snapshot), og tekstlængden er låst i tabellen', () => {
  assert.match(KODE, /listing_id\s+uuid references public\.listings\(id\) on delete set null/);
  assert.match(KODE, /annonce_titel\s+text not null/);
  assert.match(KODE, /constraint beskeder_tekst_laengde check \(char_length\(tekst\) between 2 and 1000\)/);
  assert.match(KODE, /constraint samtaler_ikke_dig_selv check \(seller_id <> buyer_id\)/);
  assert.match(KODE, /constraint samtaler_en_pr_koeber unique \(listing_id, buyer_id\)/);
  const mine = FUNKTIONER.find(f => f.navn === 'mine_samtaler').krop;
  assert.match(mine, /'slettet'/, 'indbakken kender status "slettet"');
});

test('notifikation: vagt mod uudfyldte placeholders, throttle, aldrig teksten, fejl vælter ikke beskeden', () => {
  const t = FUNKTIONER.find(f => f.navn === 'besked_notifikation').krop;
  assert.match(t, /'<<PROJEKT_URL>>'/);
  assert.match(t, /'<<HEMMELIGHED>>'/);
  assert.match(t, /like '%<<%'/, 'uudfyldt placeholder = intet kald');
  assert.match(t, /interval '30 minutes'/, 'højst én mail pr. modtager pr. samtale pr. 30 min');
  assert.match(t, /exception when others then/, 'fejl i pg_net må ikke vælte INSERT af beskeden');
  assert.match(t, /jsonb_build_object\('besked_id', new\.id\)/, 'kun id sendes, ikke teksten');
  assert.doesNotMatch(t, /new\.tekst/, 'beskedteksten forlader aldrig databasen via notifikationen');
  assert.match(KODE, /create trigger on_besked_oprettet after insert on public\.beskeder/);
});

test('opbevaring: ryd_gamle_samtaler findes, men er ikke planlagt (ejerens valg)', () => {
  assert.match(KODE, /delete from public\.samtaler where last_message_at < now\(\) - interval '24 months'/);
  assert.doesNotMatch(KODE, /cron\.schedule/, 'ingen automatisk planlægning uden ejerens beslutning');
});

test('Edge Function: hemmelighed, intet brugerindhold i mailen, escapet titel, kan slås fra', () => {
  assert.match(EDGE, /req\.headers\.get\('x-bb-secret'\) !== NOTIFY_SECRET/);
  assert.match(EDGE, /if \(!NOTIFY_SECRET/, 'uden hemmelighed afvises alt');
  assert.match(EDGE, /\.select\('id, afsender_id, samtale_id'\)/, 'funktionen læser ikke beskedteksten');
  assert.doesNotMatch(EDGE, /\.tekst\b|tekst\s*:/, 'ingen beskedtekst i funktionen');
  assert.match(EDGE, /esc\(titel\)/, 'annoncens titel escapes i HTML');
  assert.match(EDGE, /replace\(\/\[\\r\\n\]\+\/g/, 'linjeskift fjernes fra emnelinjen');
  assert.match(EDGE, /mail_ved_ny_besked === false/, 'modtageren kan have slået mails fra');
  assert.match(EDGE, /UUID_RE\.test\(besked_id\)/, 'besked_id valideres');
  assert.match(EDGE, /Vi sender ikke selve teksten i mailen/);
});

test('mock og SQL deler regler: alle SQL-koder kendes af mocken og af frontendens tekster', () => {
  const mock = fs.readFileSync(path.join(REPO, 'scripts', 'w9-saelger-mock.js'), 'utf8');
  const koder = new Set([...KODE.matchAll(/'kode',\s*'([a-z_]+)'/g)].map(m => m[1]));
  /* findes_ikke/ikke_logget_ind/ugyldig_aarsag/for_mange m.fl. skal være implementeret i mocken, ellers beviser flow-testene intet om dem. */
  for (const k of koder) assert.match(mock, new RegExp(`'${k}'`), `mocken kender ikke koden "${k}"`);
  const modul = fs.readFileSync(path.join(REPO, 'js', 'beskeder.js'), 'utf8');
  for (const k of koder) assert.match(modul, new RegExp(`\\b${k}\\b`), `js/beskeder.js har ingen tekst for "${k}"`);
});
