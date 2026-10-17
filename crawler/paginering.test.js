/* w12: paginering af en kilde (Gul og Gratis har 59 sider à 60 annoncer).
   Kør: npm test

   ALT HERUNDER KØRER MOD EN ATTRAP. Ingen netværk, ingen browser, ingen
   database. Hastigheden afprøves med et falsk ur (node:test mock.timers), så
   testen tager millisekunder, men måler de 2000/3000 ms, reglen kræver.

   Det, der skal holde:
     1. Side 1..N hentes i rækkefølge, serielt.
     2. Det stopper ved en tom side, ved "af N", ved manglende "næste" og
        ved max_sider — og det hårde loft kan ikke omgås af en YAML.
     3. Samme annonce på to sider tælles én gang (dedup på kilde_annonce_id).
     4. Mindst crawl_delay_ms mellem kald, aldrig to i luften (CLAUDE.md, regel 3).
     5. robots.txt gælder HVER side (CLAUDE.md, regel 1).
     6. Kun en KOMPLET gennemgang må markere annoncer som borte. En delvis,
        afbrudt eller afkortet kørsel markerer aldrig noget. */

const test = require('node:test');
const assert = require('node:assert');

const pipeline = require('./pipeline');
const db = require('./db');
const { laesKilde, validerKilde } = require('./config');
const { medHastighedsgraense, nulstil } = require('./hastighed');
const { gennemgaaSider, sideUrl, ABSOLUT_MAKS_SIDER } = require('./paginering');
const { indsamlAnnoncer } = pipeline;

const BASIS = 'https://www.guloggratis.dk/kategori/biler-og-koeretoejer/motorcykler/motorcykel';
const tavsLog = () => ({ linjer: [], skriv(b){ this.linjer.push(b); }, tekst(){ return this.linjer.join('\n'); } });

/* ---------- Attrap-kilde: sider med deterministiske annoncer ---------- */

// Id'et er et rigtigt uuid-format, så detalje_url_moenster i YAML'en matcher.
const uuid = n => `${String(n).padStart(8, '0')}-aaaa-bbbb-cccc-dddddddddddd`;
const kort = n => ({
  url: `https://www.guloggratis.dk/annonce/${uuid(n)}/mc-${n}`,
  titel: `Honda CB ${n}`, pris: '29.990 kr.', postnr: '7000', by: 'Fredericia',
});

/* En kilde med `sider` sider à `pr` annoncer. Annonce-numrene er fortløbende,
   så ingen sider overlapper — undtagen via `overlap`. Side forbi den sidste
   er tom, som hos Gul og Gratis (?page=60 svarede HTTP 200 uden kort). */
function nyKilde({ sider = 3, pr = 4, overlap = 0, antalSider = true, naeste = true } = {}){
  const kald = [];
  return {
    kald,
    hent: async (_ctx, _kilde, url) => {
      kald.push(url);
      const nr = Number(new URL(url).searchParams.get('page') || 1);
      if (nr > sider) return { url, kort: [], advarsel: 'ingen kort', ...(naeste ? { har_naeste: false } : {}) };
      const foerste = (nr - 1) * (pr - overlap) + 1;
      const k = Array.from({ length: pr }, (_, i) => kort(foerste + i));
      const side = { url, kort: k, advarsel: null };
      if (antalSider) side.antal_sider = sider;
      if (naeste) side.har_naeste = nr < sider;
      return side;
    },
  };
}

function paginerKilde(pag = {}){
  const k = laesKilde('guloggratis');
  k.paginering = { type: 'sidetal', parameter: 'page', max_sider: 10, stop_ved_tom_side: true, ...pag };
  k.liste_urler = [{ url: BASIS }];
  return k;
}

/* ---------- 1. Rækkefølge ---------- */

test('side 1..N hentes i rækkefølge, og side 1 er listens egen URL', async () => {
  const src = nyKilde({ sider: 3, pr: 4, antalSider: false, naeste: false });
  const r = await indsamlAnnoncer(null, paginerKilde(), { limit: null, log: tavsLog(), hent: src.hent });
  assert.deepStrictEqual(src.kald, [BASIS, `${BASIS}?page=2`, `${BASIS}?page=3`, `${BASIS}?page=4`]);
  assert.strictEqual(r.annoncer.length, 12);
  assert.deepStrictEqual(r.sider.map(s => s.nr), [1, 2, 3, 4]);
});

test('sideUrl bevarer øvrige parametre og bruger YAML\'ens parameternavn', () => {
  assert.strictEqual(sideUrl('https://a.dk/liste?sort=pris', 'side', 3), 'https://a.dk/liste?sort=pris&side=3');
  assert.strictEqual(sideUrl('https://a.dk/liste', 'page', 2), 'https://a.dk/liste?page=2');
});

/* ---------- 2. Stop-betingelser ---------- */

test('stopper ved en tom side — og er da KOMPLET', async () => {
  const src = nyKilde({ sider: 2, pr: 3, antalSider: false, naeste: false });
  const r = await indsamlAnnoncer(null, paginerKilde(), { limit: null, log: tavsLog(), hent: src.hent });
  assert.strictEqual(src.kald.length, 3, 'side 1, 2 og den tomme side 3 — ikke flere');
  assert.strictEqual(r.komplet, true);
  assert.strictEqual(r.annoncer.length, 6);
});

test('stopper ved max_sider — og er da IKKE komplet', async () => {
  const src = nyKilde({ sider: 50, pr: 3, antalSider: false, naeste: false });
  const log = tavsLog();
  const r = await indsamlAnnoncer(null, paginerKilde({ max_sider: 4 }), { limit: null, log, hent: src.hent });
  assert.strictEqual(src.kald.length, 4, 'ikke ét kald over loftet');
  assert.strictEqual(r.komplet, false);
  assert.match(log.tekst(), /loftet på 4 sider er nået/);
  assert.match(r.stopgrunde.join(' '), /loftet på 4 sider/);
});

test('"af N" stopper efter side N uden at hente en tom ekstra side — og er komplet', async () => {
  const src = nyKilde({ sider: 3, pr: 3, antalSider: true, naeste: false });
  const r = await indsamlAnnoncer(null, paginerKilde(), { limit: null, log: tavsLog(), hent: src.hent });
  assert.strictEqual(src.kald.length, 3);
  assert.strictEqual(r.komplet, true);
});

test('en side uden "næste" er den sidste — komplet', async () => {
  const src = nyKilde({ sider: 3, pr: 3, antalSider: false, naeste: true });
  const r = await indsamlAnnoncer(null, paginerKilde(), { limit: null, log: tavsLog(), hent: src.hent });
  assert.strictEqual(src.kald.length, 3);
  assert.strictEqual(r.komplet, true);
});

test('en tom FØRSTE side er ikke "komplet" — det er en brækket selector', async () => {
  const src = nyKilde({ sider: 0, antalSider: false, naeste: false });
  const r = await indsamlAnnoncer(null, paginerKilde(), { limit: null, log: tavsLog(), hent: src.hent });
  assert.strictEqual(src.kald.length, 1);
  assert.strictEqual(r.komplet, false);
});

test('en kilde, der gentager sig (ingen nye annoncer), stopper og er ikke komplet', async () => {
  const kald = [];
  const hent = async (_c, _k, url) => { kald.push(url); return { url, kort: [kort(1), kort(2)], advarsel: null }; };
  const r = await indsamlAnnoncer(null, paginerKilde({ max_sider: 50 }), { limit: null, log: tavsLog(), hent });
  assert.strictEqual(kald.length, 2, 'side 2 gav intet nyt — så holder vi op');
  assert.strictEqual(r.komplet, false);
  assert.strictEqual(r.annoncer.length, 2);
});

test('hårdt loft: validering afviser max_sider over ABSOLUT_MAKS_SIDER og manglende max_sider', () => {
  const grundlag = () => {
    const k = laesKilde('guloggratis');
    return k;
  };
  for (const [pag, moenster] of [
    [{ type: 'sidetal', max_sider: ABSOLUT_MAKS_SIDER + 1 }, /max_sider/],
    [{ type: 'sidetal' }, /max_sider/],
    [{ type: 'sidetal', max_sider: 0 }, /max_sider/],
    [{ type: 'sidetal', max_sider: 1.5 }, /max_sider/],
    [{ type: 'uendelig', max_sider: 5 }, /paginering\.type/],
    [{ type: 'knap', max_sider: 5 }, /paginering\.naeste/],
    [{ type: 'sidetal', max_sider: 5, parameter: 'a b&c' }, /paginering\.parameter/],
    [{ type: 'sidetal', max_sider: 5, antal_sider: { css: 'x', udtraek: 'ingen gruppe' } }, /fangstgruppe/],
  ]){
    const k = grundlag();
    k.paginering = pag;
    assert.throws(() => validerKilde(k), moenster, JSON.stringify(pag));
  }
  const ok = grundlag();
  ok.paginering = { type: 'knap', max_sider: ABSOLUT_MAKS_SIDER, naeste: 'button[aria-label="Næste"]' };
  assert.doesNotThrow(() => validerKilde(ok));
});

test('--maks-sider kan sænke loftet men aldrig hæve det over YAML\'ens', async () => {
  const src = nyKilde({ sider: 50, pr: 2, antalSider: false, naeste: false });
  await indsamlAnnoncer(null, paginerKilde({ max_sider: 3 }), { limit: null, log: tavsLog(), hent: src.hent, maksSider: 9 });
  assert.strictEqual(src.kald.length, 3);
  const src2 = nyKilde({ sider: 50, pr: 2, antalSider: false, naeste: false });
  await indsamlAnnoncer(null, paginerKilde({ max_sider: 30 }), { limit: null, log: tavsLog(), hent: src2.hent, maksSider: 2 });
  assert.strictEqual(src2.kald.length, 2);
});

test('gul og gratis\' egen YAML har paginering med et hårdt loft', () => {
  const k = laesKilde('guloggratis');
  assert.strictEqual(k.paginering.type, 'sidetal');
  // Standarden er bevidst forsigtig (15 sider pr. kørsel); hele kataloget (59) kræver ejerens bekræftelse og et højere tal.
  assert.ok(k.paginering.max_sider >= 1 && k.paginering.max_sider <= ABSOLUT_MAKS_SIDER);
});

/* ---------- 3. Dedup ---------- */

test('samme annonce på to sider tælles én gang (kilden skubber listen under crawlet)', async () => {
  // overlap: 2 -> side 2 starter med de to sidste fra side 1.
  const src = nyKilde({ sider: 3, pr: 5, overlap: 2, antalSider: false, naeste: false });
  const log = tavsLog();
  const r = await indsamlAnnoncer(null, paginerKilde(), { limit: null, log, hent: src.hent });
  const ids = r.annoncer.map(a => a.kilde_annonce_id);
  assert.strictEqual(new Set(ids).size, ids.length, 'dubletter slap igennem');
  assert.strictEqual(ids.length, 5 + 3 + 3);
  assert.deepStrictEqual(r.sider.map(s => s.nye), [5, 3, 3, 0].slice(0, r.sider.length));
});

/* ---------- 4. Hastighed: falsk ur ---------- */

/* Kører en promise til ende på et falsk ur. Date og setTimeout er falske;
   setImmediate er ægte og giver mikrotasks plads mellem hvert tik. */
async function kloerMedFalskUr(mock, fn){
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
  try {
    const p = fn();
    let faerdig = false;
    p.then(() => { faerdig = true; }, () => { faerdig = true; });
    for (let i = 0; i < 100_000 && !faerdig; i++){
      await new Promise(r => setImmediate(r));
      mock.timers.tick(100);
    }
    assert.ok(faerdig, 'kørslen blev aldrig færdig på det falske ur');
    return await p;
  } finally {
    mock.timers.reset();
  }
}

for (const delay of [2000, 3000]){
  test(`mindst ${delay} ms mellem to sidekald, og aldrig to i luften (falsk ur)`, async (t) => {
    nulstil();
    const tider = [];
    let iLuften = 0, maks = 0;
    const kilde = paginerKilde({ max_sider: 6 });
    kilde.crawl_delay_ms = delay;
    const src = nyKilde({ sider: 5, pr: 3, antalSider: false, naeste: false });

    // Den rigtige hastighedskø, som hent.js bruger — attrappen er kun selve siden.
    const hent = (ctx, k, url) => medHastighedsgraense(k.domaene, k.crawl_delay_ms, async () => {
      tider.push(Date.now());
      maks = Math.max(maks, ++iLuften);
      try { return await src.hent(ctx, k, url); } finally { iLuften--; }
    });

    const r = await kloerMedFalskUr(t.mock, () => indsamlAnnoncer(null, kilde, { limit: null, log: tavsLog(), hent }));
    assert.strictEqual(tider.length, 6, 'side 1-5 og den tomme side 6');
    for (let i = 1; i < tider.length; i++){
      assert.ok(tider[i] - tider[i - 1] >= delay, `kun ${tider[i] - tider[i - 1]} ms mellem kald ${i - 1} og ${i}`);
    }
    assert.strictEqual(maks, 1, 'to sidekald i luften samtidig');
    assert.strictEqual(r.annoncer.length, 15);
    nulstil();
  });
}

test('pagineringen springer ikke køen over: et fejlet sidekald tæller også som et kald', async (t) => {
  nulstil();
  const tider = [];
  const kilde = paginerKilde();
  kilde.crawl_delay_ms = 3000;
  let n = 0;
  const hent = (_c, k, url) => medHastighedsgraense(k.domaene, k.crawl_delay_ms, async () => {
    tider.push(Date.now());
    if (++n === 2) throw new Error('Timeout 45000ms exceeded');
    return { url, kort: [kort(n)], advarsel: null };
  });
  await kloerMedFalskUr(t.mock, () => indsamlAnnoncer(null, kilde, { limit: null, log: tavsLog(), hent }));
  assert.strictEqual(tider.length, 2, 'efter en fejlet side holder pagineringen op i stedet for at gætte');
  assert.ok(tider[1] - tider[0] >= 3000);
  nulstil();
});

/* ---------- 5. robots.txt gælder hver side ---------- */

test('robots.txt spærrer side 3: den hentes ikke, og kørslen er ikke komplet', async () => {
  const src = nyKilde({ sider: 10, pr: 3 });
  const robots = {
    maaHente: async url => (/page=3/.test(url)
      ? { tilladt: false, regel: 'Disallow: /*?page=3', grund: '' }
      : { tilladt: true, regel: null, grund: '' }),
  };
  const log = tavsLog();
  const r = await indsamlAnnoncer(null, paginerKilde(), { limit: null, log, hent: src.hent, robots });
  assert.deepStrictEqual(src.kald, [BASIS, `${BASIS}?page=2`]);
  assert.strictEqual(r.komplet, false);
  assert.match(r.stopgrunde.join(' '), /robots\.txt spærrer side 3/);
});

/* ---------- 6. --limit og kildens nej ---------- */

test('--limit stopper pagineringen uden --maks-sider (færrest mulige kald) og er ikke komplet', async () => {
  const src = nyKilde({ sider: 10, pr: 5, antalSider: false, naeste: false });
  const r = await indsamlAnnoncer(null, paginerKilde(), { limit: 7, log: tavsLog(), hent: src.hent });
  assert.strictEqual(src.kald.length, 2, 'side 1 gav 5, side 2 nåede 7 — side 3 må ikke hentes');
  assert.strictEqual(r.annoncer.length, 7);
  assert.strictEqual(r.komplet, false);
});

test('--maks-sider undersøger pagineringen, og --limit beskærer først bagefter', async () => {
  const src = nyKilde({ sider: 10, pr: 5, antalSider: false, naeste: false });
  const r = await indsamlAnnoncer(null, paginerKilde(), { limit: 3, log: tavsLog(), hent: src.hent, maksSider: 3 });
  assert.strictEqual(src.kald.length, 3, 'tre sider hentes trods limit på 3');
  assert.strictEqual(r.fundet_i_alt, 15);
  assert.strictEqual(r.annoncer.length, 3);
  assert.strictEqual(r.komplet, false);
});

test('et 403 på side 2 stopper hele kørslen (kildens nej), ikke kun pagineringen', async () => {
  let n = 0;
  const hent = async (_c, _k, url) => {
    if (++n === 2){ const e = new Error('HTTP 403'); e.status = 403; throw e; }
    return { url, kort: [kort(1)], advarsel: null };
  };
  await assert.rejects(
    () => indsamlAnnoncer(null, paginerKilde(), { limit: null, log: tavsLog(), hent }),
    e => e.afbrudt_af_kilden === true && e.status === 403 && /side 2|page=2/.test(e.message),
  );
  assert.strictEqual(n, 2);
});

/* ---------- 7. knap-type (attrap-session) ---------- */

test('type knap: siden holdes åben og gennemgås med klik til knappen forsvinder', async () => {
  const kilde = paginerKilde({ type: 'knap', naeste: 'button.naeste' });
  delete kilde.paginering.parameter;
  const klik = [];
  let lukket = 0;
  const aabnKnap = () => ({
    side: async nr => {
      klik.push(nr);
      return { url: BASIS, kort: [kort(nr * 10), kort(nr * 10 + 1)], advarsel: null, har_naeste: nr < 3 };
    },
    luk: async () => { lukket++; },
  });
  const r = await indsamlAnnoncer(null, kilde, { limit: null, log: tavsLog(), hent: async () => { throw new Error('skal ikke kaldes'); }, aabnKnap });
  assert.deepStrictEqual(klik, [1, 2, 3]);
  assert.strictEqual(r.komplet, true);
  assert.strictEqual(r.annoncer.length, 6);
  assert.strictEqual(lukket, 1, 'siden skal lukkes igen');
});

/* ---------- 8. Værnet mod forsvundne annoncer, gennem koerKilde ---------- */

/* Kører koerKilde('guloggratis') med attrap-database og attrap-hentere og
   returnerer, hvad der blev kaldt. Intet rører netværk eller Supabase. */
async function koerMedAttrap({ src, pag = {}, muligheder = {}, robotsTekst = 'User-agent: *\nAllow: /\n' }){
  const oprindelige = {
    klient: db.klient, sikrKilde: db.sikrKilde, startKoersel: db.startKoersel,
    afslutKoersel: db.afslutKoersel, skrivAnnoncer: db.skrivAnnoncer, markerBorte: db.markerBorte,
  };
  const kaldt = { markerBorte: [], skrivAnnoncer: 0, log: '' };
  db.klient = () => ({ attrap: true });
  db.sikrKilde = async () => ({ id: 'attrap', aktiv: true });
  db.startKoersel = async () => ({ id: 'k1', startet: new Date().toISOString() });
  db.skrivAnnoncer = async () => { kaldt.skrivAnnoncer++; return { nye: 0, opdaterede: 0, ukendte_felter: [] }; };
  db.markerBorte = async (_sb, _id, fundet) => { kaldt.markerBorte.push(fundet); return { antal: 0, sprunget_over: false, grund: 'attrap' }; };
  db.afslutKoersel = async (_sb, _id, _tal, log) => { kaldt.log = log; };

  try {
    const r = await pipeline.koerKilde('guloggratis', {
      stille: true,
      ...muligheder,
      hentere: {
        hentRobots: async () => ({ status: 200, text: async () => robotsTekst }),
        aabnBrowser: async () => ({ context: null, luk: async () => {} }),
        hentListeside: src.hent,
        hentDetaljeside: async (_c, _k, url) => ({ url, par: {}, advarsel: null }),
      },
    });
    return { r, kaldt };
  } finally {
    Object.assign(db, oprindelige);
  }
}

/* koerKilde læser YAML'en selv, så testene bruger dens egen paginering
   (max_sider 60) og styrer kun, hvad kilden svarer. */

test('FULD kørsel (sidste side nået) kalder markerBorte, med det fundne antal', async () => {
  const src = nyKilde({ sider: 5, pr: 4, antalSider: true, naeste: true });
  const { r, kaldt } = await koerMedAttrap({ src });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(src.kald.length, 5);
  assert.deepStrictEqual(kaldt.markerBorte, [20], 'markerBorte skal kaldes præcis én gang med 20 fundne');
  assert.strictEqual(kaldt.skrivAnnoncer, 1);
});

test('DELVIS kørsel (--maks-sider) markerer aldrig noget som borte', async () => {
  const src = nyKilde({ sider: 5, pr: 4, antalSider: true, naeste: true });
  const { r, kaldt } = await koerMedAttrap({ src, muligheder: { maksSider: 2 } });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(src.kald.length, 2);
  assert.deepStrictEqual(kaldt.markerBorte, []);
  assert.match(kaldt.log, /ufuldstændig kørsel|DELVIS/);
});

test('DELVIS kørsel (--limit) markerer aldrig noget som borte', async () => {
  const src = nyKilde({ sider: 5, pr: 4, antalSider: true, naeste: true });
  const { kaldt } = await koerMedAttrap({ src, muligheder: { limit: 6 } });
  assert.deepStrictEqual(kaldt.markerBorte, []);
});

test('en side, der fejler midt i, gør kørslen ufuldstændig — intet markeres borte', async () => {
  const fuld = nyKilde({ sider: 5, pr: 4, antalSider: true, naeste: true });
  const src = {
    kald: fuld.kald,
    hent: async (c, k, url) => {
      if (/page=3/.test(url)){ fuld.kald.push(url); throw new Error('Timeout 45000ms exceeded'); }
      return fuld.hent(c, k, url);
    },
  };
  const { r, kaldt } = await koerMedAttrap({ src });
  assert.strictEqual(r.ok, true, 'en timeout er ikke en afbrudt kørsel — annoncerne fra side 1-2 gemmes');
  assert.strictEqual(fuld.kald.length, 3, 'side 4 og 5 hentes ikke efter hullet');
  assert.deepStrictEqual(kaldt.markerBorte, [], 'med et hul i midten må intet markeres borte');
  assert.match(kaldt.log, /ufuldstændig kørsel/);
});

test('robots.txt spærrer ?page=3: kørslen er ufuldstændig og markerer intet', async () => {
  const src = nyKilde({ sider: 5, pr: 4 });
  const { kaldt } = await koerMedAttrap({
    src, robotsTekst: 'User-agent: *\nAllow: /\nDisallow: /*page=3\n',
  });
  assert.ok(!src.kald.some(u => /page=3/.test(u)), 'side 3 blev hentet trods Disallow');
  assert.deepStrictEqual(kaldt.markerBorte, []);
});

test('en afbrudt kørsel (403 på side 2) markerer intet og skriver intet', async () => {
  let n = 0;
  const src = { kald: [], hent: async (_c, _k, url) => {
    if (++n === 2){ const e = new Error('HTTP 403'); e.status = 403; throw e; }
    return { url, kort: [kort(1), kort(2)], advarsel: null };
  } };
  const { r, kaldt } = await koerMedAttrap({ src });
  assert.strictEqual(r.ok, false);
  assert.deepStrictEqual(kaldt.markerBorte, []);
  assert.strictEqual(kaldt.skrivAnnoncer, 0);
});

test('tørløb skriver aldrig og kalder aldrig markerBorte, heller ikke ved fuld gennemgang', async () => {
  const src = nyKilde({ sider: 3, pr: 4, antalSider: true, naeste: true });
  const { r, kaldt } = await koerMedAttrap({ src, muligheder: { toerloeb: true } });
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(kaldt.markerBorte, []);
  assert.strictEqual(kaldt.skrivAnnoncer, 0);
});

test('uden paginering i YAML opfører en kilde sig som før (MC Syd: én liste, komplet)', async () => {
  const kilde = laesKilde('mcsyd');
  assert.strictEqual(kilde.paginering, undefined);
  const kald = [];
  const r = await indsamlAnnoncer(null, kilde, {
    limit: null, log: tavsLog(),
    hent: async (_c, _k, url) => { kald.push(url); return { url, kort: [], advarsel: null }; },
  });
  assert.strictEqual(kald.length, kilde.liste_urler.length, 'ingen ekstra sidekald uden paginering');
  assert.strictEqual(r.komplet, true);
});

test('gennemgaaSider uden pipeline: rækkefølge og stopgrund', async () => {
  const log = tavsLog();
  const kaldt = [];
  const r = await gennemgaaSider({
    pag: { max_sider: 5, stop_ved_tom_side: true }, url: BASIS, log,
    hentSide: async nr => { kaldt.push(nr); return { kort: nr < 3 ? [kort(nr)] : [] }; },
    urlFor: nr => sideUrl(BASIS, 'page', nr),
  });
  assert.deepStrictEqual(kaldt, [1, 2, 3]);
  assert.strictEqual(r.komplet, true);
  assert.match(r.grund, /side 3 er tom/);
});
