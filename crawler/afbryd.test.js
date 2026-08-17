/* C-012: crawleren skal holde op med at banke på en dør, der siger nej.
   Kør: npm test

   ALT HERUNDER KØRER MOD EN ATTRAP. Ingen af testene rører mcsyd.dk,
   guloggratis.dk eller databasen — og det er ikke en bekvemmelighed, det er
   selve pointen: den eneste anden måde at fremkalde 332 × HTTP 403 på ville
   være at gøre præcis det, rettelsen er lavet for at undgå.

   Det, der skal holde:
     1. Fem afvisninger i træk stopper detaljetrinet. Før kørte det videre
        gennem hele kataloget — 332 kald ved 3000 ms er 16 minutters
        bankning på en kilde, der har sagt nej.
     2. 404 er noget andet end 403 og må IKKE stoppe kørslen. En annonce kan
        blive slettet mellem listesiden og detaljekaldet; det er hverdag.
     3. Men 25 forsvundne i træk er ikke hverdag — det er adresserne, der er
        forkerte, og det skal også stoppe.
     4. Et afvisningssvar på en LISTESIDE stopper med det samme. Der er 1-8
        af dem, og de er hoveddøren.
     5. En afbrudt kørsel markerer INTET som borte. Det er grænsefladen mod
        C-011, og den skal blive ved med at holde. */

const test = require('node:test');
const assert = require('node:assert');

const pipeline = require('./pipeline');
const db = require('./db');
const {
  berigMedDetaljer, indsamlAnnoncer, nyAfvisningsvagt,
  AFVISNINGER_FOER_STOP, IKKE_FUNDET_FOER_STOP,
} = pipeline;

const tavsLog = () => ({ linjer: [], skriv(b){ this.linjer.push(b); }, tekst(){ return this.linjer.join('\n'); } });

function httpFejl(status){
  const e = new Error(`HTTP ${status} på attrap`);
  e.status = status;
  return e;
}

/* En kilde er for de her funktioner ikke andet end nogle felter. Vi bygger
   den her frem for at læse sources/*.yaml, så testen ikke går i stykker den
   dag en YAML får en ny selector. */
const ATTRAP_KILDE = {
  navn: 'Attrap', domaene: 'attrap.invalid', crawl_delay_ms: 2000,
  selectors: { kort: '.kort', url: 'a', titel: 'h2', pris: '.pris' },
  detalje: { hent: true, par: 'dl', label: 'dt', vaerdi: 'dd', felter: { hk: 'Hestekræfter' } },
};

const annoncer = n => Array.from({ length: n }, (_, i) => ({
  kilde_annonce_id: String(1000 + i),
  url: `https://attrap.invalid/annonce/${1000 + i}`,
}));

/* ---------- 1. Fem afvisninger i træk stopper ---------- */

test('detaljetrinet stopper efter fem 403 i traek — ikke efter 332', async () => {
  let kald = 0;
  const log = tavsLog();
  await assert.rejects(
    () => berigMedDetaljer(null, ATTRAP_KILDE, annoncer(332), {
      log,
      hent: async () => { kald++; throw httpFejl(403); },
    }),
    e => e.afbrudt_af_kilden === true && e.status === 403,
  );
  assert.strictEqual(kald, AFVISNINGER_FOER_STOP,
    `der skal laves ${AFVISNINGER_FOER_STOP} kald, ikke 332 — det er hele findingen`);
  assert.match(log.tekst(), /STOP: 5 svar i træk med HTTP 403/);
  assert.match(log.tekst(), /327 detaljesider blev IKKE hentet/);
});

test('429 taeller som en afvisning paa lige fod med 403', async () => {
  let kald = 0;
  await assert.rejects(
    () => berigMedDetaljer(null, ATTRAP_KILDE, annoncer(100), {
      log: tavsLog(),
      hent: async () => { kald++; throw httpFejl(429); },
    }),
    e => e.status === 429,
  );
  assert.strictEqual(kald, AFVISNINGER_FOER_STOP);
});

test('fire afvisninger i traek er ikke nok — graensen er fem', async () => {
  const vagt = nyAfvisningsvagt();
  for (let i = 0; i < AFVISNINGER_FOER_STOP - 1; i++){
    assert.strictEqual(vagt.tael(httpFejl(403)), null, `${i + 1} afvisning(er) maa ikke stoppe`);
  }
  assert.ok(vagt.tael(httpFejl(403)), 'den femte skal stoppe');
});

/* ---------- 2. og 3. 404 er noget andet ---------- */

test('404 stopper IKKE — en annonce kan blive slettet mellem listeside og detaljekald', async () => {
  let kald = 0;
  const log = tavsLog();
  const tal = await berigMedDetaljer(null, ATTRAP_KILDE, annoncer(20), {
    log,
    hent: async () => { kald++; throw httpFejl(404); },
  });
  assert.strictEqual(kald, 20, 'alle tyve skal proeves — 404 er ikke et nej til os');
  assert.strictEqual(tal.fejlede, 20);
  assert.strictEqual(tal.ikke_fundet, 20);
  assert.match(log.tekst(), /heraf 20 annoncer der ikke findes længere/);
});

test('25 forsvundne i traek stopper alligevel — saa er det adresserne, der er forkerte', async () => {
  let kald = 0;
  await assert.rejects(
    () => berigMedDetaljer(null, ATTRAP_KILDE, annoncer(332), {
      log: tavsLog(),
      hent: async () => { kald++; throw httpFejl(404); },
    }),
    e => e.afbrudt_af_kilden === true && e.status === 404
      && /detalje-URL'erne bør efterses/.test(e.message),
  );
  assert.strictEqual(kald, IKKE_FUNDET_FOER_STOP);
});

test('403 og 404 nulstiller hinandens taellere — de er to forskellige diagnoser', async () => {
  const vagt = nyAfvisningsvagt();
  vagt.tael(httpFejl(403));
  vagt.tael(httpFejl(403));
  vagt.tael(httpFejl(403));
  vagt.tael(httpFejl(403));      // fire afvisninger
  assert.strictEqual(vagt.tael(httpFejl(404)), null);
  assert.strictEqual(vagt.tael(httpFejl(403)), null, 'et 404 imellem nulstiller afvisningstaelleren');
});

/* ---------- Taellerne nulstilles kun af et svar, der kom igennem ---------- */

test('et svar, der lykkes, renser tavlen', async () => {
  let kald = 0;
  const svar = { par: { 'Hestekræfter': '95 HK' }, advarsel: null };
  const tal = await berigMedDetaljer(null, ATTRAP_KILDE, annoncer(40), {
    log: tavsLog(),
    // Fire afvisninger, ét godt svar, fire afvisninger, ... i det uendelige.
    hent: async () => { kald++; if (kald % 5 === 0) return svar; throw httpFejl(403); },
  });
  assert.strictEqual(kald, 40, 'moenstret naar aldrig fem i traek, saa koerslen skal loebe faerdig');
  assert.strictEqual(tal.hentet, 8);
});

test('en timeout nulstiller IKKE — ellers kan en kilde holde vagten i skak for evigt', () => {
  const vagt = nyAfvisningsvagt();
  const timeout = new Error('Timeout 45000ms exceeded');   // ingen .status
  let stop = null;
  for (let i = 0; i < AFVISNINGER_FOER_STOP && !stop; i++){
    stop = vagt.tael(httpFejl(403)) || vagt.tael(timeout);
  }
  assert.ok(stop, '403, timeout, 403, timeout ... skal stadig ramme graensen');
  assert.strictEqual(stop.status, 403);
});

/* ---------- 4. Listesiden er hoveddøren ---------- */

test('et 403 paa en listeside stopper med det samme — resten hentes ikke', async () => {
  let kald = 0;
  const kilde = {
    ...ATTRAP_KILDE,
    liste_urler: Array.from({ length: 8 }, (_, i) => ({ url: `https://attrap.invalid/liste/${i}`, maerke: null })),
  };
  await assert.rejects(
    () => indsamlAnnoncer(null, kilde, {
      limit: null, log: tavsLog(),
      hent: async () => { kald++; throw httpFejl(403); },
    }),
    e => e.afbrudt_af_kilden === true && e.status === 403 && /hoveddøren/.test(e.message),
  );
  assert.strictEqual(kald, 1, 'der er otte listesider — kun den foerste maa proeves');
});

test('en timeout paa en listeside tager ikke de oevrige med sig', async () => {
  let kald = 0;
  const kilde = {
    ...ATTRAP_KILDE,
    liste_urler: Array.from({ length: 4 }, (_, i) => ({ url: `https://attrap.invalid/liste/${i}`, maerke: null })),
  };
  const log = tavsLog();
  const r = await indsamlAnnoncer(null, kilde, {
    limit: null, log,
    hent: async () => { kald++; throw new Error('Timeout 45000ms exceeded'); },
  });
  assert.strictEqual(kald, 4);
  assert.deepStrictEqual(r.annoncer, []);
  assert.match(log.tekst(), /FEJL på https:\/\/attrap\.invalid\/liste\/3/);
});

/* ---------- 5. Graensefladen mod C-011 ---------- */

test('en afbrudt koersel markerer INTET som borte og skriver ingen annoncer', async () => {
  const oprindelige = {
    klient: db.klient, sikrKilde: db.sikrKilde, startKoersel: db.startKoersel,
    afslutKoersel: db.afslutKoersel, skrivAnnoncer: db.skrivAnnoncer, markerBorte: db.markerBorte,
  };
  const kaldt = { markerBorte: 0, skrivAnnoncer: 0, afslutKoersel: 0 };
  let gemtLog = '';
  db.klient = () => ({ attrap: true });
  db.sikrKilde = async () => ({ id: 'attrap-kilde', aktiv: true });
  db.startKoersel = async () => ({ id: 'attrap-koersel', startet: new Date().toISOString() });
  db.skrivAnnoncer = async () => { kaldt.skrivAnnoncer++; return { nye: 0, opdaterede: 0, ukendte_felter: [] }; };
  db.markerBorte = async () => { kaldt.markerBorte++; return { antal: 0, sprunget_over: false, grund: 'attrap' }; };
  db.afslutKoersel = async (_sb, _id, _tal, log) => { kaldt.afslutKoersel++; gemtLog = log; };

  try {
    const r = await pipeline.koerKilde('guloggratis', {
      stille: true,
      hentere: {
        // robots.txt hentes ved hver koersel (C-013). Den skal ogsaa vaere en
        // attrap her — en test maa ikke ringe til guloggratis.dk.
        hentRobots: async () => ({ status: 200, text: async () => 'User-agent: *\nAllow: /\n' }),
        aabnBrowser: async () => ({ context: null, luk: async () => {} }),
        /* Listesiden svarer normalt med ti kort, saa detaljetrinet naas og
           naar at ramme graensen paa fem afvisninger. */
        hentListeside: async (_c, _k, url) => ({
          url, advarsel: null,
          kort: Array.from({ length: 10 }, (_, i) => ({
            url: `https://www.guloggratis.dk/annonce/1111111${i}-2222-3333-4444-555555555555/bmw`,
            titel: 'BMW R 1150 GS', pris: '29.990 kr.', postnr: '7000', by: 'Fredericia',
          })),
        }),
        hentDetaljeside: async () => { throw httpFejl(403); },
      },
    });

    assert.strictEqual(r.ok, false, 'koerslen skal melde sig fejlet');
    assert.strictEqual(kaldt.markerBorte, 0, 'markerBorte maa ALDRIG naas paa en afbrudt koersel (C-011)');
    assert.strictEqual(kaldt.skrivAnnoncer, 0, 'der maa ikke skrives annoncer fra en afbrudt koersel');
    assert.strictEqual(kaldt.afslutKoersel, 1, 'koerslen skal stadig lukkes — en raekke uden afsluttet er umulig at laese');
    assert.match(gemtLog, /AFBRUDT/);
    assert.match(gemtLog, /stoppet MED VILJE efter kildens svar \(HTTP 403\)/);
    assert.match(gemtLog, /hverken skrevet annoncer eller markeret noget som borte/);
  } finally {
    Object.assign(db, oprindelige);
  }
});
