/* F2-002, F2-003, F2-006: annoncesidens løfter. Kør: node --test js/w5-annonce.test.js

   - F2-002: ingen betalingsknap/-løfte (sikkerhed.html kalder "Bikerbasens sikre betaling" et svindeltegn).
   - F2-003: "Nyt opslag" (alder < 4 dage) er ikke "Ny" (fabriksny).
   - F2-006: ingen formular, der indsamler navn/e-mail/telefon til en besked, der ikke leveres; ærlig tekst
     FØR enhver handling. (Netværksdelen — ingen POST — måles i browseren mod en mock, se builder-w5-funktion.md.) */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { indlaes, MED_ANNONCE } = require('./w5-hjaelp.js');

const F = indlaes(MED_ANNONCE, ['saelgerKortHTML', 'listingCardHTML', 'kildeNyStatus', 'isNewListing', 'nytOpslagBadgeHTML']);

const egen = extra => Object.assign({
  id: 'b3a5c3a8-0000-4000-8000-000000000001', brand: 'BMW', model: 'R45', type: 'classic', year: 1979, km: 91350,
  ccm: 473, power: 27, price: 29000, city: 'Aarhus', isDealer: false, photoUrls: ['https://images.example/r45.jpg'],
  createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  seller: { id: 's1', name: 'Mesut Privat', isDealer: false, city: 'Aarhus' },
}, extra || {});

const saelger = (l, opts) => F.saelgerKortHTML(l, Object.assign({ loggedIn: true, avgRating: null, reviewCount: 0, telefon: '', telefonMulig: false }, opts || {}));

/* ---------- F2-003 ---------- */

test('1979 BMW R45 oprettet i går: "Nyt opslag", ikke "Ny"', () => {
  const html = F.listingCardHTML(egen(), 1);
  assert.match(html, /Nyt opslag/);
  assert.doesNotMatch(html, /badge-new/, 'den grønne Ny-stil er forbeholdt standen');
  assert.doesNotMatch(html, />Ny</, 'ingen pille/span med teksten "Ny"');
  assert.doesNotMatch(html, /rk-ny/);
});

test('et opslag på 5 dage har intet opslagsmærke', () => {
  const html = F.listingCardHTML(egen({ createdAt: new Date(Date.now() - 5 * 86400000).toISOString() }), 1);
  assert.doesNotMatch(html, /Nyt opslag/);
});

test('"Ny" kommer kun via standen (kildeNyStatus): fabriksny hos kilde ja, nyt opslag nej', () => {
  const ny = {
    id: 'e1', isExternal: true, brand: 'Honda', model: 'CB 500', type: 'naked', year: new Date().getFullYear(), km: 0,
    ccm: 471, power: 47, price: 70000, city: 'Rødding', postnr: 6630, isDealer: true, saelgertype: 'forhandler',
    kildeStand: 'ny', externalUrl: 'https://mcsyd.dk/Produkter/Motorcykel/Ny/Honda?p=1',
    source: { navn: 'MC Syd', domaene: 'mcsyd.dk' },
  };
  assert.equal(F.kildeNyStatus(ny), true);
  const html = F.listingCardHTML(ny, 1);
  assert.match(html, /<span class="rk-ny"[^>]*>Ny<\/span>/);
  assert.doesNotMatch(html, /Nyt opslag/, 'ekstern annonce uden createdAt har intet opslagsmærke');
  // En egen annonce har ingen kilde-stand og får aldrig "Ny", uanset alder.
  assert.equal(F.kildeNyStatus(egen()), null);
});

test('opslagsmærket har anden stil end Ny-standen', () => {
  assert.doesNotMatch(F.nytOpslagBadgeHTML(), /badge-new/);
  assert.match(F.nytOpslagBadgeHTML(), /badge-neutral/);
});

/* ---------- F2-002 + F2-006 ---------- */

const FORBUDT = [/Betal sikkert/i, /MobilePay/i, /id="open-payment-modal"/, /id="open-contact-modal"/, /Skriv til sælger/i,
  /Send besked/i, /cf-email|cf-phone|cf-firstname/];

test('indlogget sælgerkort: ingen betalingsknap, ingen kontaktformular, ærlig tekst før handling', () => {
  for (const opts of [{}, { telefon: '12345678' }, { telefonMulig: true }]){
    const html = saelger(egen(), opts);
    for (const re of FORBUDT) assert.doesNotMatch(html, re, `${re} i sælgerkortet (${JSON.stringify(opts)})`);
    // W6: ÉN ærlig tekst pr. tilstand — med knap: ingen besked kan sendes; uden telefon: ikke oplyst, ingen kontaktvej.
    assert.match(html, opts.telefon || opts.telefonMulig ? /Beskeder til sælger kan endnu ikke sendes via Bikerbasen/ : /Annoncen kan ikke kontaktes via Bikerbasen endnu/);
    // Teksten står FØR første knap/link (handlingerne).
    assert.ok(html.indexOf('Beskeder til sælger kan endnu ikke') < html.indexOf('contact-actions'), 'teksten skal stå før handlingerne');
  }
});

test('telefonknap kun når sælgeren har et nummer / kan have valgt at vise det', () => {
  assert.doesNotMatch(saelger(egen()), /reveal-phone-btn/);
  assert.match(saelger(egen(), { telefon: '12345678' }), /id="reveal-phone-btn"/);
  assert.match(saelger(egen(), { telefonMulig: true }), /id="reveal-phone-btn"/);
  // Uden nummer siges det ærligt, og der lokkes ikke med "skriv i stedet".
  const uden = saelger(egen());
  assert.match(uden, /Sælgeren har ikke oplyst telefon\.<\/b> Annoncen kan ikke kontaktes via Bikerbasen endnu\./);
  assert.doesNotMatch(uden, /Skriv i stedet/i);
});

test('udlogget sælgerkort: heller ikke her lokkes der til "skriv"', () => {
  const html = saelger(egen(), { loggedIn: false });
  for (const re of FORBUDT) assert.doesNotMatch(html, re);
  assert.match(html, /Beskeder til sælger kan endnu ikke sendes via Bikerbasen/);
  assert.match(html, /login\.html\?redirect=/);
});

test('annonce.html har ingen kontaktformular og ingen "Skriv til sælger"-bjælkeknap', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'annonce.html'), 'utf8');
  assert.doesNotMatch(html, /<form[^>]*id="contact-form"/);
  assert.doesNotMatch(html, /id="cf-(email|phone|firstname|lastname|message)"/);
  assert.doesNotMatch(html, /id="bar-contact"/);
  assert.match(html, /id="bar-phone"/, 'telefonknappen i bjælken bliver');
});

test('ingen brugerrettet betalingstekst i js/ (legitime juridiske omtaler står i html og er uændrede)', () => {
  // Betalingsflow til Stripe-abonnement (forhandlere) er en anden ting; MobilePay/"Betal sikkert" må ikke stå som UI-tekst.
  const dir = __dirname;
  for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.js') && !n.endsWith('.test.js') && n !== 'w5-hjaelp.js')){
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    const udenKommentarer = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(udenKommentarer, /Betal sikkert|MobilePay/, `${f} lover en betaling`);
  }
});
