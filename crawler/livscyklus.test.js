/* Annoncens livscyklus (V7, data). Kør: node --test crawler/livscyklus.test.js

   Ingen netværk, ingen database: rene funktioner og en attrap af den ene
   forespørgselskæde, livscyklus.js bruger. Det, testene låser:

     1. En midlertidig teknisk fejl (timeout, 5xx, netværk, robots, afbrudt
        eller ufuldstændig kørsel, et værn der holder) gør ALDRIG en annonce
        'borte' — heller ikke hundrede gange i træk.
     2. Kun N=3 BEKRÆFTEDE væk-signaler (404/410/"fjernet"/mangler i komplet
        kørsel) fordelt over mindst T=7 dage gør en annonce 'borte'. Tre
        signaler samme dag gør ikke.
     3. Et "set" nulstiller. En teknisk fejl mellem to væk-signaler hverken
        nulstiller eller tæller.
     4. Fem tilstande, afledt ved læsning: frisk / forsinket / midlertidigt
        utilgængelig / ikke længere aktiv / udløbet.
     5. Uden flaget skriver skrivAnnoncer() præcis de kolonner, den altid har
        skrevet (en kolonne, der ikke findes, vælter hele kørslen). */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const lc = require('./livscyklus');
const { skrivAnnoncer } = require('./db');
const { berigMedDetaljer } = require('./pipeline');

const { TAERSKLER: T, TILSTANDE } = lc;
const DAG = 86_400_000;
const T0 = Date.parse('2026-10-01T10:00:00Z');
const dag = n => new Date(T0 + n * DAG);

/* ---------- Attrap ---------- */
function lavSb({ eksterne = [], koersler = [] } = {}){
  const tabeller = { eksterne_annoncer: eksterne.map(r => ({ status: 'aktiv', vaek_i_traek: 0, teknisk_fejl_i_traek: 0, foerste_vaek_signal: null, manuelle_felter: [], ...r })), crawl_koersler: koersler };
  const opdateringer = [];
  function from(tabel){
    const rows = tabeller[tabel];
    assert.ok(rows, `ukendt tabel ${tabel}`);
    return {
      select(_kol, opts){
        const filtre = []; let sortering = null, grense = null;
        const k = {
          eq(c, v){ filtre.push(r => r[c] === v); return k; },
          not(c, op, v){ if (op === 'is' && v === null) filtre.push(r => r[c] != null); return k; },
          order(c, { ascending } = {}){ sortering = [c, ascending !== false]; return k; },
          limit(n){ grense = n; return k; },
          then(res, rej){
            let d = rows.filter(r => filtre.every(f => f(r)));
            if (sortering) d = [...d].sort((a, b) => (a[sortering[0]] > b[sortering[0]] ? 1 : -1) * (sortering[1] ? 1 : -1));
            if (grense != null) d = d.slice(0, grense);
            const svar = opts && opts.head ? { data: null, count: d.length, error: null } : { data: d.map(r => ({ ...r })), error: null };
            return Promise.resolve(svar).then(res, rej);
          },
        };
        return k;
      },
      update(patch){
        return {
          in(c, vaerdier){
            opdateringer.push({ patch, ider: [...vaerdier] });
            for (const r of rows) if (vaerdier.includes(r[c])) Object.assign(r, patch);
            return Promise.resolve({ error: null });
          },
        };
      },
    };
  }
  return { from, raekker: () => tabeller.eksterne_annoncer, opdateringer };
}

const raekke = (id, sidstSetDage, ekstra = {}) => ({ id: `r${id}`, kilde_id: 'K', kilde_annonce_id: String(id), sidst_set: dag(sidstSetDage).toISOString(), ...ekstra });
const mange = (n, sidstSetDage, ekstra) => Array.from({ length: n }, (_, i) => raekke(i + 1, sidstSetDage, ekstra));
const koersel = (dageSiden, fundet) => ({ startet: dag(-dageSiden).toISOString(), afsluttet: dag(-dageSiden).toISOString(), fundet });
const alleIder = rs => new Set(rs.map(r => r.kilde_annonce_id));

/* ---------- 1. Signaler ---------- */
test('klassificerSignal: kun 404/410/"fjernet" er væk; timeout, 5xx, 403, netværk og robots er tekniske', () => {
  const art = x => lc.klassificerSignal(x);
  assert.deepEqual(art({ status: 404 }), { art: 'vaek', kode: '404' });
  assert.deepEqual(art({ status: 410 }), { art: 'vaek', kode: '410' });
  assert.deepEqual(art({ solgtMarkoer: true, svarede: true }), { art: 'vaek', kode: 'fjernet_markoer' });
  for (const status of [500, 502, 503, 504]) assert.equal(art({ status }).art, 'teknisk', `HTTP ${status}`);
  for (const status of [401, 403, 429, 451]) assert.deepEqual(art({ status }), { art: 'teknisk', kode: 'blokeret' }, `HTTP ${status}`);
  assert.deepEqual(art({ fejlbesked: 'Timeout 30000ms exceeded' }), { art: 'teknisk', kode: 'timeout' });
  assert.deepEqual(art({ fejlbesked: 'net::ERR_CONNECTION_RESET' }), { art: 'teknisk', kode: 'netvaerk' });
  assert.deepEqual(art({ fejlbesked: 'getaddrinfo ENOTFOUND' }), { art: 'teknisk', kode: 'netvaerk' });
  assert.deepEqual(art({ robotsSpaerret: true }), { art: 'teknisk', kode: 'robots' });
  assert.deepEqual(art({ svarede: true, status: 200 }), { art: 'findes', kode: 'set' });
});

/* ---------- 2. Overgange ---------- */
test('en teknisk fejl rører aldrig væk-tælleren og gør ALDRIG en annonce borte — heller ikke hundrede gange over et år', () => {
  let r = { status: 'aktiv', sidst_set: dag(-70).toISOString(), vaek_i_traek: 0, teknisk_fejl_i_traek: 0 };
  for (let i = 0; i < 100; i++){
    const kode = lc.TEKNISKE_KODER.size ? [...lc.TEKNISKE_KODER][i % lc.TEKNISKE_KODER.size] : 'timeout';
    r = { ...r, ...lc.anvendSignal(r, { art: 'teknisk', kode }, dag(i * 4)) };
  }
  assert.equal(r.status, 'aktiv');
  assert.equal(r.vaek_i_traek, 0);
  assert.equal(r.teknisk_fejl_i_traek, 100);
  assert.equal(r.foerste_vaek_signal ?? null, null);
});

test('tre væk-signaler SAMME DAG gør ikke en annonce borte; tre over 7 dage gør', () => {
  let samme = { status: 'aktiv' };
  for (let i = 0; i < 5; i++) samme = { ...samme, ...lc.anvendSignal(samme, { art: 'vaek', kode: '404' }, new Date(T0 + i * 3_600_000)) };
  assert.equal(samme.vaek_i_traek, 5);
  assert.equal(samme.status, 'aktiv', 'fem signaler på fem timer er ét hikke, ikke en bekræftelse');

  let r = { status: 'aktiv' };
  r = { ...r, ...lc.anvendSignal(r, { art: 'vaek', kode: 'ikke_i_liste' }, dag(0)) };
  r = { ...r, ...lc.anvendSignal(r, { art: 'vaek', kode: 'ikke_i_liste' }, dag(3)) };
  assert.equal(r.status, 'aktiv', 'to er ikke nok');
  r = { ...r, ...lc.anvendSignal(r, { art: 'vaek', kode: 'ikke_i_liste' }, dag(6.9)) };
  assert.equal(r.status, 'aktiv', 'tre, men kun 6,9 dage siden det første');
  r = { ...r, ...lc.anvendSignal(r, { art: 'vaek', kode: '410' }, dag(7)) };
  assert.equal(r.status, 'borte', 'fire i træk og 7 dage siden det første');
});

test('et "set" nulstiller; en teknisk fejl mellem to væk-signaler hverken nulstiller eller tæller', () => {
  let r = { status: 'aktiv' };
  r = { ...r, ...lc.anvendSignal(r, { art: 'vaek', kode: '404' }, dag(0)) };
  r = { ...r, ...lc.anvendSignal(r, { art: 'teknisk', kode: 'timeout' }, dag(2)) };
  assert.equal(r.vaek_i_traek, 1, 'timeout tæller ikke');
  assert.ok(r.foerste_vaek_signal, 'og nulstiller ikke det første signal');
  r = { ...r, ...lc.anvendSignal(r, { art: 'vaek', kode: '404' }, dag(4)) };
  assert.equal(r.vaek_i_traek, 2);
  r = { ...r, ...lc.anvendSignal(r, { art: 'findes', kode: 'set' }, dag(5)) };
  assert.equal(r.vaek_i_traek, 0);
  assert.equal(r.foerste_vaek_signal, null);
  assert.equal(r.teknisk_fejl_i_traek, 0);
  assert.equal(r.sidste_signal, 'set');
  // og begynder forfra: to nye signaler efter et set er stadig ikke borte
  r = { ...r, ...lc.anvendSignal(r, { art: 'vaek', kode: '404' }, dag(30)) };
  r = { ...r, ...lc.anvendSignal(r, { art: 'vaek', kode: '404' }, dag(40)) };
  assert.equal(r.status, 'aktiv');
});

/* ---------- 3. Tilstande ---------- */
test('de fem tilstande — og 63 dage uden bekræftelse er IKKE "bekræftet"', () => {
  const nu = dag(0);
  const v = r => lc.vurderLivscyklus({ status: 'aktiv', ...r }, nu);
  assert.equal(v({ sidst_set: dag(-1).toISOString() }), TILSTANDE.FRISK);
  assert.equal(v({ sidst_set: dag(-14).toISOString() }), TILSTANDE.FRISK, 'præcis 14 dage er stadig frisk');
  assert.equal(v({ sidst_set: dag(-15).toISOString() }), TILSTANDE.FORSINKET);
  assert.equal(v({ sidst_set: dag(-63).toISOString() }), TILSTANDE.FORSINKET, 'de 63 dage fra ejerens gennemgang: forsinket, ikke frisk, ikke skjult');
  assert.equal(v({ sidst_set: dag(-30).toISOString(), teknisk_fejl_i_traek: 1 }), TILSTANDE.UTILGAENGELIG);
  assert.equal(v({ sidst_set: dag(-30).toISOString(), vaek_i_traek: 1 }), TILSTANDE.UTILGAENGELIG);
  assert.equal(v({ sidst_set: dag(-91).toISOString() }), TILSTANDE.UDLOEBET, 'over 90 dage: udløbet selv før en crawler har sat status');
  assert.equal(lc.vurderLivscyklus({ status: 'borte', sidst_set: dag(-1).toISOString() }, nu), TILSTANDE.IKKE_AKTIV);
  assert.equal(lc.vurderLivscyklus({ status: 'solgt', sidst_set: dag(-1).toISOString() }, nu), TILSTANDE.IKKE_AKTIV);
  assert.equal(lc.vurderLivscyklus({ status: 'udloebet', sidst_set: dag(-1).toISOString() }, nu), TILSTANDE.UDLOEBET);
});

/* ---------- 4. Databaselaget, kørsel for kørsel ---------- */
test('en annonce, der mangler i tre KOMPLETTE kørsler over en uge, bliver borte — ikke før', async () => {
  const lager = [...mange(100, -1), raekke(101, -1)];   // 101 er den, der forsvinder
  const sb = lavSb({ eksterne: lager, koersler: [koersel(1, 100), koersel(2, 100), koersel(3, 100)] });
  const fundet = alleIder(lager.filter(r => r.kilde_annonce_id !== '101'));
  const kor = async (d) => lc.opdaterLivscyklus(sb, 'K', { fundet, komplet: true, nu: dag(d) });
  const aktiv = () => sb.raekker().find(r => r.kilde_annonce_id === '101');

  await kor(0); assert.equal(aktiv().status, 'aktiv'); assert.equal(aktiv().vaek_i_traek, 1);
  await kor(3); assert.equal(aktiv().status, 'aktiv'); assert.equal(aktiv().vaek_i_traek, 2);
  await kor(5); assert.equal(aktiv().status, 'aktiv', 'tredje signal, men kun 5 dage');
  const u = await kor(8);
  assert.equal(aktiv().status, 'borte');
  assert.equal(u.borte, 1);
  assert.equal(sb.raekker().filter(r => r.status === 'borte').length, 1, 'de 100 fundne rørtes ikke');
});

test('ti kørsler, der fejler teknisk (afbrudt, ufuldstændig, robots), gør INGEN annonce borte', async () => {
  const lager = mange(50, -40);   // alle forsinkede, men aldrig væk
  const sb = lavSb({ eksterne: lager });
  const koder = ['afbrudt', 'ufuldstaendig', 'robots', 'timeout', '5xx'];
  for (let i = 0; i < 10; i++){
    await lc.opdaterLivscyklus(sb, 'K', { fundet: new Set(), komplet: false, teknisk: { kode: koder[i % koder.length] }, nu: dag(i * 10) });
  }
  assert.equal(sb.raekker().filter(r => r.status !== 'aktiv').length, 0);
  assert.ok(sb.raekker().every(r => r.vaek_i_traek === 0), 'og ingen væk-tæller er rørt');
  assert.ok(sb.raekker().every(r => r.teknisk_fejl_i_traek === 10));
  assert.equal(lc.vurderLivscyklus(sb.raekker()[0], dag(30)), TILSTANDE.UTILGAENGELIG, 'ses som utilgængelig (alder 70 dage), ikke som borte');
});

test('en annonce, vi så for en uge siden, melder ikke "utilgængelig" fordi én kørsel fejlede', async () => {
  const sb = lavSb({ eksterne: [raekke(1, -7), raekke(2, -40)] });
  const u = await lc.opdaterLivscyklus(sb, 'K', { fundet: new Set(), komplet: false, teknisk: { kode: 'timeout' }, nu: dag(0) });
  assert.equal(u.teknisk, 1);
  assert.equal(sb.raekker().find(r => r.id === 'r1').teknisk_fejl_i_traek, 0);
  assert.equal(sb.raekker().find(r => r.id === 'r2').teknisk_fejl_i_traek, 1);
});

test('værnet holder: en komplet kørsel med 10 fund af 100 giver INGEN væk-signaler (teknisk "vaern")', async () => {
  const lager = mange(100, -40);
  const sb = lavSb({ eksterne: lager, koersler: [koersel(1, 100), koersel(2, 100), koersel(3, 100)] });
  const fundet = alleIder(lager.slice(0, 10));
  const u = await lc.opdaterLivscyklus(sb, 'K', { fundet, komplet: true, nu: dag(0) });
  assert.equal(u.vaern_holdt, true);
  assert.equal(u.vaek, 0);
  assert.equal(u.teknisk, 90);
  assert.ok(sb.raekker().every(r => r.vaek_i_traek === 0));
});

test('nul fundet i en komplet kørsel (brækket parser) giver ingen væk-signaler', async () => {
  const lager = mange(40, -20);
  const sb = lavSb({ eksterne: lager, koersler: [koersel(1, 40), koersel(2, 40), koersel(3, 40)] });
  const u = await lc.opdaterLivscyklus(sb, 'K', { fundet: new Set(), komplet: true, nu: dag(0) });
  assert.equal(u.vaek, 0);
  assert.ok(sb.raekker().every(r => r.status === 'aktiv' && r.vaek_i_traek === 0));
});

test('en annonces EGEN 404/410 tæller som væk selv i en ufuldstændig kørsel; en 503 gør ikke', async () => {
  const sb = lavSb({ eksterne: mange(3, -20) });
  const fjernede = new Map([['1', '404'], ['2', '410']]);
  await lc.opdaterLivscyklus(sb, 'K', { fundet: new Set(['3']), fjernede, komplet: false, nu: dag(0) });
  const p = id => sb.raekker().find(r => r.kilde_annonce_id === id);
  assert.equal(p('1').vaek_i_traek, 1); assert.equal(p('1').sidste_signal, '404');
  assert.equal(p('2').vaek_i_traek, 1); assert.equal(p('2').sidste_signal, '410');
  assert.equal(p('3').vaek_i_traek, 0);
});

test('ejerens egen status røres ikke (manuelle_felter indeholder "status")', async () => {
  const sb = lavSb({
    eksterne: [raekke(1, -20, { manuelle_felter: ['status'] }), ...mange(60, -1).map(r => ({ ...r, id: 'x' + r.id, kilde_annonce_id: 'x' + r.kilde_annonce_id })), raekke(2, -20)],
    koersler: [koersel(1, 60), koersel(2, 60), koersel(3, 60)],
  });
  const fundet = new Set(Array.from({ length: 60 }, (_, i) => 'x' + (i + 1)));
  const u = await lc.opdaterLivscyklus(sb, 'K', { fundet, komplet: true, nu: dag(0) });
  assert.equal(u.vaek, 1, 'kun annonce 2 fik et signal');
  assert.equal(sb.raekker().find(r => r.id === 'r1').vaek_i_traek, 0);
});

test('en bevidst delvis kørsel (--limit) har intet signal at sende', () => {
  assert.equal(lc.signalForUset('1', { fjernede: new Map(), teknisk: null, komplet: false, vaern: null }), null);
});

test('en annonce, der ses igen efter at være "utilgængelig", nulstilles af skrivAnnoncer (flag til)', async () => {
  const r0 = raekke(1, -50, { vaek_i_traek: 2, foerste_vaek_signal: dag(-20).toISOString(), teknisk_fejl_i_traek: 3, sidste_signal: 'timeout' });
  const rows = [{ ...r0, manuelle_felter: [] }];
  const sb = lavSkriveSb(rows);
  await skrivAnnoncer(sb, 'K', [{ kilde_annonce_id: '1', url: 'https://x/1', titel: 'T' }], { livscyklus: true });
  const r = rows[0];
  assert.equal(r.vaek_i_traek, 0); assert.equal(r.foerste_vaek_signal, null); assert.equal(r.teknisk_fejl_i_traek, 0);
  assert.equal(r.sidste_signal, 'set'); assert.equal(r.status, 'aktiv');
  assert.ok(Date.parse(r.sidst_set) > T0);
});

test('UDEN flaget skriver skrivAnnoncer ingen af de nye kolonner (migration 030 er ikke kørt)', async () => {
  const rows = [];
  const sb = lavSkriveSb(rows);
  await skrivAnnoncer(sb, 'K', [{ kilde_annonce_id: '9', url: 'https://x/9', titel: 'T' }]);
  const ny = ['sidst_forsoegt', 'vaek_i_traek', 'foerste_vaek_signal', 'teknisk_fejl_i_traek', 'sidste_signal'];
  for (const k of ny) assert.ok(!(k in rows[0]), `${k} må ikke skrives uden flag`);
  assert.equal(lc.livscyklusAktiv({}), false);
  assert.equal(lc.livscyklusAktiv({ BB_LIVSCYKLUS: '1' }), true);
});

/* attrap til skrivAnnoncer (select().eq().in(), upsert, update().eq()) */
function lavSkriveSb(rows){
  return {
    from(){
      return {
        select(){
          const f = [];
          const k = { eq(c, v){ f.push(r => r[c] === v); return k; }, in(c, v){ f.push(r => v.includes(r[c])); return Promise.resolve({ data: rows.filter(r => f.every(x => x(r))), error: null }); } };
          return k;
        },
        upsert(payload){
          for (const p of payload){
            const e = rows.find(r => r.kilde_annonce_id === p.kilde_annonce_id);
            if (e) Object.assign(e, p); else rows.push({ id: 'n' + rows.length, manuelle_felter: [], ...p });
          }
          return Promise.resolve({ error: null });
        },
        update(felter){ return { eq(c, v){ Object.assign(rows.find(r => r[c] === v), felter); return Promise.resolve({ error: null }); } }; },
      };
    },
  };
}

/* ---------- 5. Udløb ---------- */
test('udløb: 91 dage uden bekræftelse -> udloebet (rækken slettes ikke); 89 dage røres ikke', async () => {
  const lager = [raekke(1, -91), raekke(2, -89), ...mange(8, -3).map(r => ({ ...r, id: 'f' + r.id, kilde_annonce_id: 'f' + r.kilde_annonce_id }))];
  const sb = lavSb({ eksterne: lager });
  const u = await lc.udloebGamle(sb, dag(0));
  assert.equal(u.antal, 1);
  assert.equal(sb.raekker().find(r => r.id === 'r1').status, 'udloebet');
  assert.equal(sb.raekker().find(r => r.id === 'r2').status, 'aktiv');
  assert.equal(sb.raekker().length, 10, 'intet slettet');
});

test('udløb: værnet holder, hvis mere end halvdelen ville udløbe på én gang (crawleren har stået stille)', async () => {
  const sb = lavSb({ eksterne: [...mange(30, -95), ...mange(10, -2).map(r => ({ ...r, id: 'f' + r.id, kilde_annonce_id: 'f' + r.kilde_annonce_id }))] });
  const u = await lc.udloebGamle(sb, dag(0));
  assert.equal(u.sprunget_over, true);
  assert.equal(u.antal, 0);
  assert.ok(sb.raekker().every(r => r.status === 'aktiv'));
  assert.match(u.grund, /30 af 40/);
});

/* ---------- 6. Pipeline: hvad en detaljeside siger ---------- */
test('berigMedDetaljer registrerer KUN 404/410 som fjernet — ikke timeout, 5xx, 403 eller robots', async () => {
  const annoncer = ['a', 'b', 'c', 'd', 'e'].map(id => ({ kilde_annonce_id: id, url: `https://attrap.invalid/${id}` }));
  const status = { a: 404, b: 410, c: 503, d: 'timeout', e: 200 };
  const hent = async (_c, _k, url) => {
    const id = url.split('/').pop();
    const s = status[id];
    if (s === 200) return { par: { x: 'y' } };
    const e = new Error(s === 'timeout' ? 'Timeout 30000ms exceeded' : `HTTP ${s}`);
    if (typeof s === 'number') e.status = s;
    throw e;
  };
  const kilde = { navn: 'A', domaene: 'attrap.invalid', crawl_delay_ms: 2000, detalje: { hent: true, felter: {} } };
  const log = { skriv(){}, tekst(){ return ''; } };
  const tal = await berigMedDetaljer(null, kilde, annoncer, { log, hent });
  assert.deepEqual([...tal.fjernede.entries()].sort(), [['a', '404'], ['b', '410']]);
});

/* ---------- 7. Tre sprog, én regel ---------- */
test('tærsklerne er ens i crawleren, i SQL-funktionen og i frontenden', () => {
  const rod = path.join(__dirname, '..');
  const sql = fs.readFileSync(path.join(rod, 'supabase/030_livscyklus.sql'), 'utf8');
  assert.ok(sql.includes(`interval '${T.UDLOEB_DAGE} days'`), 'UDLOEB_DAGE i SQL');
  assert.ok(sql.includes(`interval '${T.FRISK_DAGE} days'`), 'FRISK_DAGE i SQL');
  const data = fs.readFileSync(path.join(rod, 'js/data.js'), 'utf8').replace(/\r\n/g, '\n');
  const m = data.match(/const LIVSCYKLUS = Object\.freeze\(\{([^}]*)\}\)/);
  assert.ok(m, 'js/data.js skal have LIVSCYKLUS');
  const taerskel = n => Number((m[1].match(new RegExp(`${n}:\\s*(\\d+)`)) || [])[1]);
  assert.equal(taerskel('FRISK_DAGE'), T.FRISK_DAGE);
  assert.equal(taerskel('LANG_TID_DAGE'), T.LANG_TID_DAGE);
  assert.equal(taerskel('UDLOEB_DAGE'), T.UDLOEB_DAGE);
});
