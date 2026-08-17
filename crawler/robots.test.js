/* C-013: robots.txt skal EFTERPRØVES, ikke attesteres. Kør: npm test

   Findingen: "de juridiske spærrer er attestationer, ikke kontroller."
   `robots_tjekket` var en dato, nogen havde skrevet, og filen blev aldrig
   hentet i kørselsstien. Tilføjede mcsyd.dk `Disallow: /Produkter/` i
   morgen, kørte crawleren videre.

   ALT HERUNDER KØRER MOD EN ATTRAP-FETCH. Ingen af testene henter en rigtig
   robots.txt — en spærre, der kun kan afprøves ved at ringe til en
   forhandlers server, bliver ikke afprøvet. */

const test = require('node:test');
const assert = require('node:assert');

const { robotsDom, parseRobots, gruppeFor, erTilladt } = require('./robots');
const { validerKilde } = require('./config');

const svar = (status, tekst = '') => async () => ({ status, text: async () => tekst });
const doer = besked => async () => { throw new Error(besked); };

const gruppe = tekst => gruppeFor(parseRobots(tekst));

/* ---------- Parsing ---------- */

test('flere User-agent-linjer i traek hoerer til SAMME gruppe', () => {
  const g = parseRobots('User-agent: Googlebot\nUser-agent: *\nDisallow: /admin/\n');
  assert.strictEqual(g.length, 1);
  assert.deepStrictEqual(g[0].agenter, ['googlebot', '*']);
  assert.strictEqual(g[0].regler.length, 1);
});

test('"Disallow:" uden vaerdi betyder udtrykkeligt at intet er forbudt', () => {
  const g = gruppe('User-agent: *\nDisallow:\n');
  assert.strictEqual(g.regler.length, 0);
  assert.strictEqual(erTilladt(g, 'https://a.invalid/hvadsomhelst').tilladt, true);
});

test('kommentarer og tomme linjer springes over', () => {
  const g = gruppe('# en kommentar\n\nUser-agent: *   # ogsaa her\nDisallow: /privat/\n');
  assert.strictEqual(erTilladt(g, 'https://a.invalid/privat/x').tilladt, false);
});

test('vores egen gruppe vinder over *', () => {
  const g = gruppe(
    'User-agent: *\nDisallow: /\n\n' +
    'User-agent: Bikerbasen-indeksering\nAllow: /\nDisallow: /kurv/\n');
  assert.strictEqual(erTilladt(g, 'https://a.invalid/motorcykler/').tilladt, true);
  assert.strictEqual(erTilladt(g, 'https://a.invalid/kurv/').tilladt, false);
});

/* ---------- Stimatch ---------- */

test('laengste matchende regel vinder, og Allow vinder ved lige laengde', () => {
  const g = gruppe('User-agent: *\nDisallow: /produkter/\nAllow: /produkter/motorcykel/\n');
  assert.strictEqual(erTilladt(g, 'https://a.invalid/produkter/scooter/1').tilladt, false);
  assert.strictEqual(erTilladt(g, 'https://a.invalid/produkter/motorcykel/1').tilladt, true);

  const lige = gruppe('User-agent: *\nDisallow: /x/\nAllow: /x/\n');
  assert.strictEqual(erTilladt(lige, 'https://a.invalid/x/1').tilladt, true);
});

test('* og $ virker som i robots.txt', () => {
  const g = gruppe('User-agent: *\nDisallow: /*.pdf$\n');
  assert.strictEqual(erTilladt(g, 'https://a.invalid/filer/vilkaar.pdf').tilladt, false);
  assert.strictEqual(erTilladt(g, 'https://a.invalid/filer/vilkaar.pdf?v=2').tilladt, true);
});

test('regexsaerlige tegn i stien laeses bogstaveligt', () => {
  const g = gruppe('User-agent: *\nDisallow: /pris(dkk)/\n');
  assert.strictEqual(erTilladt(g, 'https://a.invalid/pris(dkk)/1').tilladt, false);
  assert.strictEqual(erTilladt(g, 'https://a.invalid/prisdkk/1').tilladt, true);
});

/* ---------- Selve findingen ---------- */

test('et Disallow, der rammer kildens produktsti, spaerrer den — det var praecis det, ingen tjekkede', () => {
  // MC Syds detaljesider ligger under /Produkter/Motorcykel/... med stort P.
  const g = gruppe('User-agent: *\nAllow: /\nDisallow: /Produkter/\n');
  const url = 'https://mcsyd.dk/Produkter/Motorcykel/Brugt/Harley-Davidson%20XL883/178201?p=178201';
  const dom = erTilladt(g, url);
  assert.strictEqual(dom.tilladt, false);
  assert.strictEqual(dom.regel, 'Disallow: /Produkter/');
});

/* ---------- Hvordan dommen fejler ---------- */

test('2xx: reglerne gaelder', async () => {
  const d = await robotsDom('a.invalid', { hent: svar(200, 'User-agent: *\nDisallow: /admin/\n') });
  assert.strictEqual(d.maaCrawle, true);
  assert.strictEqual(erTilladt(d.gruppe, 'https://a.invalid/admin/x').tilladt, false);
});

test('404: der ER ingen robots.txt, og en manglende fil er ikke et forbud', async () => {
  const d = await robotsDom('a.invalid', { hent: svar(404) });
  assert.strictEqual(d.maaCrawle, true);
  assert.strictEqual(erTilladt(d.gruppe, 'https://a.invalid/hvadsomhelst').tilladt, true);
  assert.match(d.grund, /ingen robots\.txt/);
});

test('5xx: vi ved ikke hvad der staar i filen, og saa crawler vi ikke', async () => {
  const d = await robotsDom('a.invalid', { hent: svar(503) });
  assert.strictEqual(d.maaCrawle, false);
  assert.match(d.grund, /HTTP 503/);
});

test('netvaerksfejl: samme svar — tvivl falder ud til kildens fordel', async () => {
  const d = await robotsDom('a.invalid', { hent: doer('ENOTFOUND') });
  assert.strictEqual(d.maaCrawle, false);
  assert.match(d.grund, /kunne ikke hentes/);
});

/* ---------- Crawl-delay ---------- */

test('Crawl-delay laeses og regnes om til millisekunder', async () => {
  const d = await robotsDom('a.invalid', { hent: svar(200, 'User-agent: *\nCrawl-delay: 10\n') });
  assert.strictEqual(d.crawlDelayMs, 10_000);
});

test('ingen Crawl-delay giver null, saa kildens YAML-vaerdi staar', async () => {
  const d = await robotsDom('a.invalid', { hent: svar(200, 'User-agent: *\nAllow: /\n') });
  assert.strictEqual(d.crawlDelayMs, null);
});

/* ---------- Attestationen: en dato, ikke et flueben ---------- */

const GRUNDKILDE = {
  navn: 'Attrap', domaene: 'attrap.invalid', konfig_fil: 'sources/attrap.yaml',
  liste_urler: [{ url: 'https://attrap.invalid/liste' }],
  detalje_url_moenster: '/annonce/(\\d+)',
  selectors: { kort: '.k', url: 'a', titel: 'h2', pris: '.p', aargang: '.a', km: '.km' },
  crawl_delay_ms: 2000,
  robots_tjekket: '2026-08-16',
};

test('et bart "true" i tilladelse_modtaget er ikke laengere nok', () => {
  assert.throws(
    () => validerKilde({ ...GRUNDKILDE, tilladelse_modtaget: true }),
    /tilladelse_modtaget: mangler en DATO/,
  );
});

test('en dato i tilladelse_modtaget selv er nok (som i mcsyd.yaml)', () => {
  assert.ok(validerKilde({ ...GRUNDKILDE, tilladelse_modtaget: '2026-08-16' }));
});

test('true + tilladelse_dato er ogsaa nok (som i guloggratis.yaml)', () => {
  assert.ok(validerKilde({ ...GRUNDKILDE, tilladelse_modtaget: true, tilladelse_dato: '2026-08-16' }));
});

test('robots_tjekket skal ogsaa vaere en dato, ikke et flueben', () => {
  assert.throws(
    () => validerKilde({ ...GRUNDKILDE, tilladelse_modtaget: '2026-08-16', robots_tjekket: true }),
    /robots_tjekket: skal være en dato/,
  );
});

test('en manglende tilladelse spaerrer stadig, og det er den foerste besked', () => {
  assert.throws(
    () => validerKilde({ ...GRUNDKILDE, tilladelse_modtaget: undefined }),
    /skriftlig tilladelse mangler — kilden må ikke crawles/,
  );
});

/* ---------- Kontrollen skal ligge i KOERSELSSTIEN, ikke kun i et modul ----------
   Det var hele findingen: funktionerne kunne godt have eksisteret, uden at
   nogen kaldte dem. Testene her kalder koerKilde() og ser efter, at browseren
   aldrig bliver aabnet. */

const { koerKilde } = require('./pipeline');

test('robots.txt med Disallow: / stopper koerslen, foer browseren aabnes', async () => {
  let browserAabnet = 0;
  const r = await koerKilde('guloggratis', {
    toerloeb: true, stille: true,
    hentere: {
      hent: undefined,
      hentRobots: svar(200, 'User-agent: *\nDisallow: /\n'),
      aabnBrowser: async () => { browserAabnet++; return { context: null, luk: async () => {} }; },
    },
  });
  assert.strictEqual(r.sprunget_over, true);
  assert.strictEqual(r.robots_naegtede, true);
  assert.strictEqual(browserAabnet, 0, 'der maa ikke laves ét eneste kald til kilden');
  assert.match(r.log, /spærrer samtlige liste-URL/);
});

test('en robots.txt, der ikke kan hentes, stopper ogsaa koerslen', async () => {
  let browserAabnet = 0;
  const r = await koerKilde('guloggratis', {
    toerloeb: true, stille: true,
    hentere: {
      hentRobots: doer('ECONNREFUSED'),
      aabnBrowser: async () => { browserAabnet++; return { context: null, luk: async () => {} }; },
    },
  });
  assert.strictEqual(r.sprunget_over, true);
  assert.strictEqual(browserAabnet, 0);
  assert.match(r.log, /Tvivl falder ud til kildens fordel/);
});

test('en aaben robots.txt lader koerslen fortsaette', async () => {
  let browserAabnet = 0;
  const r = await koerKilde('guloggratis', {
    toerloeb: true, stille: true,
    hentere: {
      hentRobots: svar(200, 'User-agent: *\nAllow: /\n'),
      aabnBrowser: async () => { browserAabnet++; return { context: null, luk: async () => {} }; },
      hentListeside: async (_c, _k, url) => ({ url, kort: [], advarsel: null }),
    },
  });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(browserAabnet, 1);
});

test('robots.txt slaas op paa URL\'ens egen vaert, ikke paa kildens domaene-felt', async () => {
  /* guloggratis.yaml har `domaene: guloggratis.dk`, mens liste-URL'en staar
     paa `www.guloggratis.dk`. Et opslag paa domaene-feltet ville hente en
     fil fra en anden oprindelse end den, vi henter sider fra — og saa
     beskytter kontrollen ingenting. */
  const spurgt = [];
  await koerKilde('guloggratis', {
    toerloeb: true, stille: true,
    hentere: {
      hentRobots: async url => { spurgt.push(url); return { status: 200, text: async () => 'User-agent: *\nAllow: /\n' }; },
      aabnBrowser: async () => ({ context: null, luk: async () => {} }),
      hentListeside: async (_c, _k, url) => ({ url, kort: [], advarsel: null }),
    },
  });
  assert.deepStrictEqual(spurgt, ['https://www.guloggratis.dk/robots.txt']);
});

test('der hentes kun ÉN robots.txt pr. vaert pr. koersel', async () => {
  let kald = 0;
  await koerKilde('mcsyd', {
    toerloeb: true, stille: true,
    hentere: {
      hentRobots: async () => { kald++; return { status: 200, text: async () => 'User-agent: *\nAllow: /\n' }; },
      aabnBrowser: async () => ({ context: null, luk: async () => {} }),
      hentListeside: async (_c, _k, url) => ({ url, kort: [], advarsel: null }),
    },
  });
  assert.strictEqual(kald, 1, 'mcsyd har otte liste-URL\'er paa samme vaert — det er ét opslag, ikke otte');
});

test('en spaerret DETALJESIDE hentes ikke — og der er 332 af dem', async () => {
  const { berigMedDetaljer } = require('./pipeline');
  const { nyRobotsVagt } = require('./robots');
  const robots = nyRobotsVagt({ hent: svar(200, 'User-agent: *\nAllow: /\nDisallow: /Produkter/\n') });
  const log = { linjer: [], skriv(b){ this.linjer.push(b); }, tekst(){ return this.linjer.join('\n'); } };

  let hentet = 0;
  const annoncer = Array.from({ length: 20 }, (_, i) => ({
    kilde_annonce_id: String(i),
    url: `https://mcsyd.dk/Produkter/Motorcykel/Brugt/Model/${i}`,
  }));
  const tal = await berigMedDetaljer(null, { domaene: 'mcsyd.dk', crawl_delay_ms: 2000 }, annoncer, {
    log, robots, hent: async () => { hentet++; return { par: {}, advarsel: null }; },
  });
  assert.strictEqual(hentet, 0, 'ikke ét eneste kald maa laves mod en spaerret sti');
  assert.strictEqual(tal.spaerret, 20);
  assert.match(log.tekst(), /20 sprunget over fordi robots\.txt spærrer dem/);
});

test('robots.txt maa hoejne crawl_delay_ms, aldrig saenke den', async () => {
  // guloggratis.yaml staar paa 3000 ms.
  let brugtDelay = null;
  await koerKilde('guloggratis', {
    toerloeb: true, stille: true,
    hentere: {
      hentRobots: svar(200, 'User-agent: *\nCrawl-delay: 1\n'),
      aabnBrowser: async () => ({ context: null, luk: async () => {} }),
      hentListeside: async (_c, k, url) => { brugtDelay = k.crawl_delay_ms; return { url, kort: [], advarsel: null }; },
    },
  });
  assert.strictEqual(brugtDelay, 3000, '1 sekund fra kilden maa ikke saenke vores 3 sekunder');

  await koerKilde('guloggratis', {
    toerloeb: true, stille: true,
    hentere: {
      hentRobots: svar(200, 'User-agent: *\nCrawl-delay: 10\n'),
      aabnBrowser: async () => ({ context: null, luk: async () => {} }),
      hentListeside: async (_c, k, url) => { brugtDelay = k.crawl_delay_ms; return { url, kort: [], advarsel: null }; },
    },
  });
  assert.strictEqual(brugtDelay, 10_000, '10 sekunder fra kilden skal hoejne vores 3');
});

/* ---------- De to kilder i drift skal stadig validere ---------- */

test('mcsyd.yaml og guloggratis.yaml validerer uaendret', () => {
  const { laesKilde } = require('./config');
  for (const navn of ['mcsyd', 'guloggratis']){
    assert.ok(laesKilde(navn), `${navn} skal stadig kunne laeses`);
  }
});
