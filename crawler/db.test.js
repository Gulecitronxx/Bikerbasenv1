/* db.js — skrivAnnoncer() og genkørsel.

   BAGGRUND (runde 4, builder 2, 20.08.2026): 155 af 548 indekserede annoncer
   deler mærke+model+årgang+km. Den oplagte mistanke var en crawler-fejl:
   kører man `npm run crawl` mod samme kilde flere gange, og matcher upserten
   ikke korrekt på den eksisterende række, får hver kørsel sin egen kopi under
   et nyt id, og tallet vokser for hver kørsel.

   Den mistanke holder IKKE efter måling mod driften (se work/DECISIONS.md,
   "155 af 548 er ikke en fejl" — runde 4 builder 2). Alle 155 rækker har
   INDBYRDES FORSKELLIGE kilde_annonce_id — ingen af dem er den samme annonce
   genindsat. De to tests herunder låser netop den adfærd, så den ikke kan
   glide igen: en genkørsel med SAMME kilde_annonce_id opdaterer, den skaber
   ikke en ny række, og to ÆGTE forskellige annoncer (forskellige id'er hos
   kilden, samme mærke/model/årgang) forbliver to rækker — fordi det er
   præcis dét, en forhandler med flere ens nye motorcykler på lager er. */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { skrivAnnoncer } = require('./db');

/* En letvægts stand-in for @supabase/supabase-js's forespørgselskæde.
   Kun det, skrivAnnoncer() faktisk kalder: from().select().eq().in() til
   opslag, from().upsert(rows, {onConflict}) til frie rækker, og
   from().update(felter).eq('id', id) til beskyttede rækker. Ingen RLS, ingen
   netværk — en ren, forudsigelig model af det, unique-indekset i
   014_aggregator.sql (kilde_id, kilde_annonce_id) garanterer i produktion. */
function lavFakeSb(startRaekker = []){
  const rows = startRaekker.map(r => ({ ...r }));
  let taeller = rows.length;
  const kald = { upsert: [], update: [] };

  function from(tabel){
    assert.equal(tabel, 'eksterne_annoncer', 'testen dækker kun eksterne_annoncer');
    return {
      select(){
        const filtre = [];
        const kaede = {
          eq(kolonne, vaerdi){ filtre.push(r => r[kolonne] === vaerdi); return kaede; },
          in(kolonne, vaerdier){
            filtre.push(r => vaerdier.includes(r[kolonne]));
            const data = rows
              .filter(r => filtre.every(f => f(r)))
              .map(r => ({ id: r.id, kilde_annonce_id: r.kilde_annonce_id, manuelle_felter: r.manuelle_felter || [] }));
            return Promise.resolve({ data, error: null });
          },
        };
        return kaede;
      },
      upsert(payload, opts){
        kald.upsert.push({ payload, opts });
        const konfliktKolonner = String(opts?.onConflict || '').split(',');
        for (const p of payload){
          const eksisterende = rows.find(r => konfliktKolonner.every(k => r[k] === p[k]));
          if (eksisterende) Object.assign(eksisterende, p);
          else { taeller++; rows.push({ id: `fake-${taeller}`, foerst_set: new Date().toISOString(), ...p }); }
        }
        return Promise.resolve({ error: null });
      },
      update(felter){
        return {
          eq(kolonne, vaerdi){
            kald.update.push({ felter, kolonne, vaerdi });
            const r = rows.find(x => x[kolonne] === vaerdi);
            if (r) Object.assign(r, felter);
            return Promise.resolve({ error: null });
          },
        };
      },
    };
  }

  return { from, raekker: () => rows, kald };
}

const KILDE_ID = 'kilde-mcsyd';

test('genkørsel med samme kilde_annonce_id opdaterer raekken — opretter ikke en ny', async () => {
  const sb = lavFakeSb();
  const annonce = {
    kilde_annonce_id: '102674', url: 'https://mcsyd.dk/x/102674', titel: 'Honda CMX 500 Rebel',
    maerke: 'Honda', model: 'CMX 500 Rebel', aargang: 2024, km: null, pris_dkk: 84995,
  };

  const foerste = await skrivAnnoncer(sb, KILDE_ID, [annonce]);
  assert.equal(foerste.nye, 1);
  assert.equal(foerste.opdaterede, 0);
  assert.equal(sb.raekker().length, 1, 'første kørsel: én række');

  // Anden "kørsel" af samme kilde: samme kilde_annonce_id, prisen er ændret
  // hos kilden. Det er dét, en ægte genkørsel ser ud som.
  const anden = await skrivAnnoncer(sb, KILDE_ID, [{ ...annonce, pris_dkk: 79995 }]);
  assert.equal(anden.nye, 0, 'samme kilde_annonce_id må ikke tælle som ny');
  assert.equal(anden.opdaterede, 1);
  assert.equal(sb.raekker().length, 1, 'to kørsler af SAMME annonce skal stadig give én række, ikke to');
  assert.equal(sb.raekker()[0].pris_dkk, 79995, 'den eksisterende række skal være opdateret, ikke ladt urørt');
});

test('to forskellige kilde_annonce_id med samme mærke/model/årgang giver to rækker — det er ægte lager, ikke en dublet', async () => {
  const sb = lavFakeSb();
  const base = { url: null, titel: 'Honda CMX 500 Rebel', maerke: 'Honda', model: 'CMX 500 Rebel', aargang: 2024, km: null, pris_dkk: 84995 };

  await skrivAnnoncer(sb, KILDE_ID, [
    { ...base, kilde_annonce_id: '102674', url: 'https://mcsyd.dk/x/102674' },
    { ...base, kilde_annonce_id: '101727', url: 'https://mcsyd.dk/x/101727' },
  ]);

  assert.equal(sb.raekker().length, 2, 'to forskellige lagernumre hos kilden skal blive to rækker');
  const ider = sb.raekker().map(r => r.kilde_annonce_id).sort();
  assert.deepEqual(ider, ['101727', '102674']);

  // Kør igen — stadig kun to rækker, ingen af dem dubleret af genkørslen.
  await skrivAnnoncer(sb, KILDE_ID, [
    { ...base, kilde_annonce_id: '102674', url: 'https://mcsyd.dk/x/102674' },
    { ...base, kilde_annonce_id: '101727', url: 'https://mcsyd.dk/x/101727' },
  ]);
  assert.equal(sb.raekker().length, 2, 'en tredje kørsel af de samme to id\'er må ikke lave flere rækker');
});

test('upsert bruger (kilde_id, kilde_annonce_id) som konfliktnøgle — den nøgle, det unikke indeks i 014 håndhæver', async () => {
  const sb = lavFakeSb();
  await skrivAnnoncer(sb, KILDE_ID, [{
    kilde_annonce_id: '1', url: 'https://mcsyd.dk/x/1', titel: 'X', maerke: 'Honda', model: 'X', aargang: 2024, km: null, pris_dkk: 1000,
  }]);
  assert.equal(sb.kald.upsert.length, 1);
  assert.equal(sb.kald.upsert[0].opts.onConflict, 'kilde_id,kilde_annonce_id');
});

test('manuelt rettet felt overlever en genkørsel — crawleren skriver ikke prisen over en forhandlers egen rettelse', async () => {
  const sb = lavFakeSb([{
    id: 'r1', kilde_id: KILDE_ID, kilde_annonce_id: '102674',
    url: 'https://mcsyd.dk/x/102674', titel: 'Honda CMX 500 Rebel',
    maerke: 'Honda', model: 'CMX 500 Rebel', aargang: 2024, km: null,
    pris_dkk: 79995, manuelle_felter: ['pris_dkk'],
  }]);

  await skrivAnnoncer(sb, KILDE_ID, [{
    kilde_annonce_id: '102674', url: 'https://mcsyd.dk/x/102674', titel: 'Honda CMX 500 Rebel',
    maerke: 'Honda', model: 'CMX 500 Rebel', aargang: 2024, km: null, pris_dkk: 84995,
  }]);

  assert.equal(sb.raekker().length, 1, 'stadig kun én række');
  assert.equal(sb.raekker()[0].pris_dkk, 79995, 'prisen er forhandlerens egen og må ikke overskrives af crawleren');
});
