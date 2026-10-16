/* W6 (fund fra bølge 5's blinde Critic). Kør: node --test js/w6-funktion.test.js

   1. Datoer/tal uden NaN        2. Telefonnote: én tilstand ad gangen   3. Tomt backend-svar
   4. Sport Glide / typesuffiks  5. Privat sælger uden telefon            6. Ingen løfter i klienttekst

   Testene kører den kode, browseren kører (js/w5-hjaelp.js evaluerer scripts uden module.exports). */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { indlaes, broModuler, MED_ANNONCE, læs } = require('./w5-hjaelp.js');

const tekst = html => String(html).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
const ingenNul = (html, hvad) => {
  const t = tekst(html);
  const m = t.match(/\b(null|undefined|NaN|Infinity|Invalid Date)\b/);
  assert.ok(!m, `${hvad}: "${m && m[0]}" i teksten: …${m ? t.slice(Math.max(0, m.index - 40), m.index + 40) : ''}…`);
};

const S = indlaes([...MED_ANNONCE.filter(f => f !== 'annonce.js'), 'sortering.js', 'search.js'],
  ['listingRowHTML', 'listingCardHTML', 'timeAgoDa', 'formatPrice', 'formatKm', 'formatCcm', 'formatPower', 'isNewListing']);
const A = indlaes(MED_ANNONCE, ['saelgerKortHTML', 'telefonNoteHTML', 'telefonAfvist']);

const egen = extra => Object.assign({
  id: 'b3a5c3a8-0000-4000-8000-000000000001', brand: 'BMW', model: 'R45', type: 'classic', year: 1979, km: 91350,
  ccm: 473, power: 27, price: 29000, city: 'Aarhus', postnr: 8000, region: 'Midtjylland', isDealer: false, photoUrls: [],
  createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  seller: { id: 's1', name: 'Mesut Privat', isDealer: false, city: 'Aarhus' },
}, extra || {});

/* ---------- 1. Datoer og tal ---------- */

test('timeAgoDa: ingen dato giver tom streng — aldrig "NaN måneder siden" og aldrig epoch-0 ("674 måneder")', () => {
  for (const v of [undefined, null, '', 'ugyldig', 'NaN', NaN, {}, [], 'not-a-date', '0000-00-00']){
    const r = S.timeAgoDa(v);
    assert.strictEqual(r, '', `timeAgoDa(${JSON.stringify(v)}) = "${r}"`);
  }
});

test('timeAgoDa: rigtige datoer giver stadig dansk relativ tekst', () => {
  const dage = n => new Date(Date.now() - n * 86400000).toISOString();
  assert.match(S.timeAgoDa(dage(0)), /^i dag/);
  assert.strictEqual(S.timeAgoDa(dage(1)), 'i går');
  assert.strictEqual(S.timeAgoDa(dage(3)), '3 dage siden');
  assert.strictEqual(S.timeAgoDa(dage(14)), '2 uger siden');
  assert.strictEqual(S.timeAgoDa(dage(70)), '2 måneder siden');
  assert.strictEqual(S.timeAgoDa(new Date(Date.now() + 5 * 86400000).toISOString()).includes('NaN'), false);
});

test('listerække: egen annonce uden createdAt har intet row-when og ingen NaN/undefined/null', () => {
  for (const createdAt of [undefined, null, '', 'ugyldig']){
    const html = S.listingRowHTML(egen({ createdAt }), 1);
    ingenNul(html, `listingRowHTML createdAt=${JSON.stringify(createdAt)}`);
    assert.doesNotMatch(html, /row-when/, 'ingen tom dato-linje');
    assert.doesNotMatch(tekst(html), /måned|uger|dage siden/);
  }
});

test('listerække: med createdAt står datoen stadig', () => {
  const html = S.listingRowHTML(egen(), 1);
  assert.match(html, /<p class="row-when">i går<\/p>/);
});

test('formatPrice/Km/Ccm/Power: NaN, Infinity, tekst og tomt siger "ikke oplyst", aldrig "NaN kr."', () => {
  const dårlige = [NaN, Infinity, -Infinity, 'abc', '', ' ', undefined, null, {}, []];
  for (const v of dårlige){
    assert.strictEqual(S.formatPrice(v), 'Pris ikke oplyst', `formatPrice(${String(v)})`);
    assert.strictEqual(S.formatKm(v), 'Km ikke oplyst', `formatKm(${String(v)})`);
    assert.strictEqual(S.formatCcm(v), 'Ikke oplyst', `formatCcm(${String(v)})`);
    assert.strictEqual(S.formatPower(v), 'Ikke oplyst', `formatPower(${String(v)})`);
  }
  assert.strictEqual(S.formatPower(0), 'Ikke oplyst');
});

test('formatPrice/Km/Ccm/Power: gyldige tal (også 0 og tal som tekst) formateres som før', () => {
  assert.strictEqual(S.formatPrice(29000), '29.000 kr.');
  assert.strictEqual(S.formatPrice('29000'), '29.000 kr.');
  assert.strictEqual(S.formatPrice(0), '0 kr.');
  assert.strictEqual(S.formatKm(0), '0 km');
  assert.strictEqual(S.formatCcm(473), '473 ccm');
  assert.strictEqual(S.formatPower(27), '27 hk');
});

test('kort og række med NaN-tal: ingen NaN i teksten', () => {
  const l = egen({ price: NaN, km: NaN, ccm: NaN, power: NaN, year: NaN });
  ingenNul(S.listingCardHTML(l, 1), 'listingCardHTML');
  ingenNul(S.listingRowHTML(l, 1), 'listingRowHTML');
});

/* ---------- 2. + 5. Telefonnote ---------- */

const saelger = (l, opts) => A.saelgerKortHTML(l, Object.assign({ loggedIn: true, avgRating: null, reviewCount: 0, telefon: '', telefonMulig: false }, opts || {}));
const noter = html => (html.match(/class="seller-locked-note"/g) || []).length;

test('telefonNoteHTML: tre tilstande, tre forskellige ærlige tekster uden løfte om besked', () => {
  const knap = tekst(A.telefonNoteHTML('knap')), intet = tekst(A.telefonNoteHTML('intet')), afvist = tekst(A.telefonNoteHTML('afvist'));
  assert.strictEqual(new Set([knap, intet, afvist]).size, 3);
  assert.match(intet, /Sælgeren har ikke oplyst telefon\. Annoncen kan ikke kontaktes via Bikerbasen endnu\./);
  assert.match(afvist, /Sælgeren viser ikke sit telefonnummer\. Annoncen kan ikke kontaktes via Bikerbasen endnu\./);
  assert.match(knap, /kan endnu ikke sendes via Bikerbasen/);
  for (const t of [knap, intet, afvist]) assert.doesNotMatch(t, /vi sender|beskeden sendes|svar inden|skriv til sælger|send besked/i);
});

test('annoncesiden: privat sælger uden telefon får præcis den korte, sande tilstand — og ingen knap', () => {
  const html = saelger(egen());
  assert.match(tekst(html), /Sælgeren har ikke oplyst telefon\. Annoncen kan ikke kontaktes via Bikerbasen endnu\./);
  assert.doesNotMatch(html, /reveal-phone-btn/);
  assert.strictEqual(noter(html), 1, 'netop én note om telefonen');
  assert.doesNotMatch(tekst(html), /Har sælgeren valgt at vise/, 'ingen modsigelse: ikke både "ikke oplyst" og "kan se med knappen"');
});

test('annoncesiden: med mulig telefon er der knap og den ene "kan se med knappen"-note', () => {
  const html = saelger(egen(), { telefonMulig: true });
  assert.match(html, /id="reveal-phone-btn"/);
  assert.match(tekst(html), /Har sælgeren valgt at vise sit telefonnummer, kan du se det med knappen nedenfor/);
  assert.doesNotMatch(tekst(html), /ikke oplyst telefon/);
  assert.strictEqual(noter(html), 1);
});

/* Minimal DOM: nok til at køre telefonAfvist() som browseren gør efter et null-svar. */
function fakeNote(){
  const span = { innerHTML: A.telefonNoteHTML('knap') };
  return { span, querySelector: s => (s === 'span' ? span : null), innerHTML: '' };
}
const fjernbar = () => ({ fjernet: false, remove(){ this.fjernet = true; } });

test('efter null-svar: den EKSISTERENDE note omskrives (ikke en ekstra), knap og handlingsbjælke fjernes', () => {
  const note = fakeNote(), knap = fjernbar(), bjaelke = fjernbar();
  A.telefonAfvist(note, knap, bjaelke);
  assert.strictEqual(note.span.innerHTML, A.telefonNoteHTML('afvist'));
  assert.doesNotMatch(tekst(note.span.innerHTML), /knappen nedenfor|Har sælgeren valgt/, 'ingen rest af "kan se med knappen"');
  assert.ok(knap.fjernet, 'knappen er væk');
  assert.ok(bjaelke.fjernet, 'bjælken er væk (dens knap pegede på den fjernede knap)');
});

test('efter null-svar uden fundet note: noten oprettes ikke dobbelt, intet kaster', () => {
  assert.doesNotThrow(() => A.telefonAfvist(null, fjernbar(), null));
});

/* ---------- 3. Tomt backend-svar ---------- */

const B = broModuler(['erSideMedLagerliste', 'lagerErTomt', 'dataafbrudIndhold']);

test('erSideMedLagerliste: forside, mærke-, type-, region-, model-, kørekort-, budget- og byside — med og uden .html', () => {
  for (const n of ['index.html', 'maerke-honda.html', 'maerke-honda', 'type-adventure.html', 'region-sjaelland', 'model-honda-cb-1000-r.html',
    'koerekort-a2.html', 'budget-under-50000.html', 'by-horsens.html']) assert.ok(B.erSideMedLagerliste(n), n);
  for (const n of ['soegning.html', 'annonce.html', 'dashboard.html', 'login.html', 'forhandler.html', 'guides.html', 'om-indeksering.html', 'maerker.html', ''])
    assert.ok(!B.erSideMedLagerliste(n), n);
});

test('lagerErTomt: kun når en kilde svarede ok og der slet ingen annoncer er; en fejl er ikke "tomt"', () => {
  assert.strictEqual(B.lagerErTomt({ egne: 'ok', eksterne: 'ok' }, 0), true);
  assert.strictEqual(B.lagerErTomt({ egne: 'ok', eksterne: 'sprunget-over' }, 0), true);
  assert.strictEqual(B.lagerErTomt({ egne: 'ok', eksterne: 'ok' }, 5), false);
  assert.strictEqual(B.lagerErTomt({ egne: 'ok', eksterne: 'fejlet' }, 0), false, 'fejl har sin egen tekst');
  assert.strictEqual(B.lagerErTomt({ egne: 'sprunget-over', eksterne: 'sprunget-over' }, 0), false, 'ingen spurgte');
  assert.strictEqual(B.lagerErTomt({ egne: 'ikke-hentet', eksterne: 'ikke-hentet' }, 0), false);
});

test('dataafbrudIndhold: tomt svar siger det ærligt og påstår ikke, at der ingen motorcykler er', () => {
  const t = B.dataafbrudIndhold({ egne: 'ok', eksterne: 'ok' }, true);
  assert.match(t.hvad, /ingen annoncer fra databasen/i);
  assert.match(t.resten, /midlertidig fejl/);
  assert.match(t.resten, /betyder ikke, at der ingen motorcykler er til salg/);
  const f = B.dataafbrudIndhold({ egne: 'fejlet', eksterne: 'fejlet' }, false);
  assert.match(f.hvad, /kunne ikke hente annoncerne/);
});

/* meldDataafbrud() på en rigtig (minimal) DOM-attrap: banner med "Prøv igen" på forsiden/mærkesiden/typesiden. */
function meldPaaSide(sidenavn, status, antal){
  const src = ['data.js', 'icons.js', 'bike-art.js', 'components.js', 'sortering.js', 'filtrering.js', 'backend-bridge.js'].map(læs).join('\n;\n');
  const prependet = [];
  const main = { prepend: el => prependet.push(el) };
  const mkEl = () => {
    const knap = { addEventListener(){} };
    return { id: '', className: '', attrs: {}, setAttribute(k, v){ this.attrs[k] = v; }, innerHTML: '', querySelector: () => knap, remove(){} };
  };
  const doc = { readyState: 'loading', addEventListener(){}, querySelector: () => main, getElementById: id => (id === 'main-content' ? main : null), createElement: mkEl };
  const store = { getUser: () => null, isFavorite: () => false, isComparing: () => false, getCompare: () => [], getAllListings: () => new Array(antal).fill({}) };
  const win = {};
  const lok = { pathname: '/' + sidenavn, search: '', reload(){} };
  const f = new Function('document', 'Store', 'window', 'db', 'location', src + '\n;return meldDataafbrud;');
  const meld = f(doc, store, win, { enabled: false, photoUrl: p => p || null }, lok);
  win.DATA_STATUS = status;   // broen nulstiller statussen ved indlæsning; sæt den bagefter
  meld();
  return prependet;
}

test('meldDataafbrud: tomt svar på forside, mærkeside og typeside viser banneren med "Prøv igen"', () => {
  for (const side of ['', 'index.html', 'maerke-honda.html', 'type-adventure.html', 'model-honda-cb-1000-r.html']){
    const b = meldPaaSide(side, { egne: 'ok', eksterne: 'ok' }, 0);
    assert.strictEqual(b.length, 1, `banner på "${side}"`);
    assert.match(b[0].innerHTML, /Vi fik ingen annoncer fra databasen/);
    assert.match(b[0].innerHTML, /Prøv igen/);
    assert.strictEqual(b[0].attrs.role, 'status');
  }
});

test('meldDataafbrud: søgning og annonce (egen fejltilstand) og sider med annoncer får INGEN dobbelt banner', () => {
  assert.strictEqual(meldPaaSide('soegning.html', { egne: 'ok', eksterne: 'ok' }, 0).length, 0);
  assert.strictEqual(meldPaaSide('annonce.html', { egne: 'ok', eksterne: 'ok' }, 0).length, 0);
  assert.strictEqual(meldPaaSide('maerke-honda.html', { egne: 'ok', eksterne: 'ok' }, 12).length, 0);
});

test('meldDataafbrud: en egentlig fejl bevarer sin gamle tekst', () => {
  const b = meldPaaSide('maerke-honda.html', { egne: 'fejlet', eksterne: 'ok' }, 3);
  assert.strictEqual(b.length, 1);
  assert.match(b[0].innerHTML, /Vi kunne ikke hente de annoncer, Bikerbasen selv hoster/);
});

test('maerke.js: tomt HELE lager overskrives ikke med "Ingen X til salg lige nu"', () => {
  const kilde = læs('maerke.js');
  assert.match(kilde, /lagerTomt/);
  assert.match(kilde, /!alle\.length && !lagerTomt && fremMount/);
});

/* ---------- 4. Sport Glide og typesuffiks ---------- */

const M = broModuler(['byggEksternAnnonce', 'kildetypeErModelnavn', 'fjernTypeSuffiks']);
const hd = (extra) => Object.assign({ id: 'x', maerke: 'Harley-Davidson', model: 'FLSB Sport Glide', titel: 'Harley-Davidson FLSB Sport Glide', type: null, url: 'https://x.dk/a' }, extra);
const bygg = row => { const l = M.byggEksternAnnonce(row); return [l.model, l.type]; };

test('Sport Glide med DB-type "Sport": modelnavnets "Sport" er ikke en kategori → cruiser (modeltabellen)', () => {
  assert.deepStrictEqual(bygg(hd({ type: 'Sport' })), ['FLSB Sport Glide', 'cruiser']);
  assert.deepStrictEqual(bygg(hd({ type: 'sport' })), ['FLSB Sport Glide', 'cruiser']);
  assert.strictEqual(M.kildetypeErModelnavn(hd({ type: 'Sport' })), true);
});

test('Street Glide med DB-type "Street" er uændret (cruiser/touring fra modeltabellen, ikke naked)', () => {
  const [model, type] = bygg(hd({ model: 'FLHX Street Glide', titel: 'Harley-Davidson FLHX Street Glide', type: 'Street' }));
  assert.strictEqual(model, 'FLHX Street Glide');
  assert.strictEqual(type, 'touring');
});

test('suffiks: "FLSB Sport Glide Touring" + kildetype Touring → modellen uden "Touring", typen touring', () => {
  const r = hd({ model: 'FLSB Sport Glide Touring', titel: 'Harley-Davidson FLSB Sport Glide Touring', type: 'Touring' });
  assert.deepStrictEqual(bygg(r), ['FLSB Sport Glide', 'touring']);
});

test('suffiks: titel-afledt model ("FLHX Street Glide Touring") mister suffikset; titlens eget kategoriord bestemmer typen', () => {
  const r = hd({ model: null, titel: 'Harley-Davidson FLHX Street Glide Touring', type: 'Street' });
  assert.deepStrictEqual(bygg(r), ['FLHX Street Glide', 'touring']);
});

test('Sport som rigtigt sidste kategoriord og ægte modelord røres ikke', () => {
  // Titlen har "Sport" som kategori uden for et beskyttet modelnavn: typen er sport.
  assert.deepStrictEqual(bygg({ id: 'y', maerke: 'Yamaha', model: 'YZF-R6', titel: 'Yamaha YZF-R6 Sport', type: 'Sport', url: 'https://x.dk/b' })[1], 'sport');
  assert.strictEqual(M.fjernTypeSuffiks('ZR-7 Street', 'naked'), 'ZR-7 Street');
  assert.strictEqual(M.fjernTypeSuffiks('MSX 125 Street', 'naked'), 'MSX 125 Street');
  assert.strictEqual(M.fjernTypeSuffiks('Monster Sport', 'sport'), 'Monster Sport');
  assert.strictEqual(M.fjernTypeSuffiks('Gold Wing', 'touring'), 'Gold Wing');
  assert.strictEqual(M.fjernTypeSuffiks('Touring', 'touring'), 'Touring', 'et enkelt ord er modellen');
  assert.strictEqual(M.fjernTypeSuffiks('Tracer 9 GT', 'touring'), 'Tracer 9 GT');
  assert.strictEqual(M.fjernTypeSuffiks('K 1600 Cruiser', 'touring'), 'K 1600 Cruiser', 'kun hvis ordet svarer til rækkens type');
  assert.strictEqual(M.fjernTypeSuffiks('Rebel 500 Cruiser', 'cruiser'), 'Rebel 500');
  assert.strictEqual(M.fjernTypeSuffiks('Virago', null), 'Virago');
});

/* ---------- 6. Ingen løfter i klienttekst ---------- */

const JS_FILER = fs.readdirSync(__dirname).filter(f => f.endsWith('.js') && !f.endsWith('.test.js') && f !== 'w5-hjaelp.js');
/* Streng-litteraler og skabelontekst — ikke kommentarer — er det, brugeren læser. */
const udenKommentarer = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');

test('ingen brugerrettet tekst i js/ lover betaling, beskedlevering, "helt nyt" eller sikker betaling', () => {
  const FORBUDT = [
    /Betal sikkert/i, /sikker betaling/i, /Skriv direkte til sælgere/i, /MobilePay/i, /Bikerbasens betaling/i,
    /vi sender (?:din|dine|beskeden)/i, /beskeden er sendt/i, /din besked er sendt/i, /vi videresender/i, /svar inden/i,
    /Bikerbasen er helt nyt/i, /helt nyt (?:site|sted|marked|marketplace)/i, /Send besked til sælger/i,
  ];
  const fund = [];
  for (const f of JS_FILER){
    const kode = udenKommentarer(læs(f));
    for (const re of FORBUDT){
      const m = kode.match(re);
      if (m) fund.push(`${f}: ${m[0]}`);
    }
  }
  assert.deepStrictEqual(fund, []);
});

test('betaling: ingen betalingsknap eller -modal i annoncesidens kode, og beskedformular er ikke koblet på', () => {
  const kode = udenKommentarer(læs('annonce.js'));
  assert.doesNotMatch(kode, /open-payment-modal|open-contact-modal|cf-email|cf-phone|payment-modal/);
});
