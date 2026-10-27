/* V7 beskeder: ren logik, flag-gating og kontaktbeskrivelser (node, ingen browser).
   Kør: node --test js/v7-besked.test.js

   Låser tre ting:
   1. Reglerne i js/beskeder.js (validering, fejltekster, låsetekster, tid, badge) — og at de er den SAMME regel som i
      supabase/025_beskeder.sql (tegngrænser, linktæller, koder).
   2. Flaget: uden BB_FLAGS.beskeder findes ingen formular, ingen Beskeder-fane og intet kald; js/beskeder.js står ikke i
      nogen HTML-side og hentes kun af bbIndlaesBeskeder(), som kræver flaget (default FRA).
   3. Kontaktbeskrivelsen: med flaget fra siger annoncesiden ærligt, hvordan man når sælgeren (og at beskeder ikke er åbnet),
      FØR login; med flaget til er der en formular for indloggede og en tydelig vej ind for udloggede. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { indlaes, MED_ANNONCE } = require('./w5-hjaelp.js');

const REPO = path.join(__dirname, '..');
const laes = rel => fs.readFileSync(path.join(REPO, rel), 'utf8');

/* ---------- 1. Ren logik i js/beskeder.js ---------- */

const B = new Function('escapeHTML', 'Icon', laes('js/beskeder.js') + `
return { beskedRens, beskedAntalLinks, beskedValider, beskedFejlTekst, beskedLaasTekst, beskedStatusMaerke, beskedBadgeTekst,
  beskedTid, beskedInitialer, beskedModpartNavn, BESKED_FEJLTEKSTER, BESKED_MAX, BESKED_MIN, beskedFormularHTML, beskedKvitteringHTML };`)(
  s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), {});

test('validering: tom, for kort, grænsen 1000, for lang og links — med danske forklaringer', () => {
  assert.strictEqual(B.beskedValider('').ok, false);
  assert.match(B.beskedValider('   \n ').fejl, /Skriv en besked/);
  assert.match(B.beskedValider('a').fejl, /for kort/);
  assert.strictEqual(B.beskedValider('ok').ok, true, 'to tegn er nok');
  assert.strictEqual(B.beskedValider('x'.repeat(1000)).ok, true, '1000 tegn er grænsen');
  const lang = B.beskedValider('x'.repeat(1001));
  assert.strictEqual(lang.ok, false);
  assert.match(lang.fejl, /1 tegn for lang/);
  assert.match(lang.fejl, /1000/);
  assert.strictEqual(B.beskedValider('se http://a.dk og https://b.dk').ok, true, 'to links er tilladt');
  assert.strictEqual(B.beskedValider('http://a.dk http://b.dk www.c.dk').ok, false, 'tre links afvises');
  assert.match(B.beskedValider('http://a.dk http://b.dk www.c.dk').fejl, /links/);
});

test('validering: kun tabulatorer, NBSP eller nul-bredde-tegn er en tom besked (som bb_er_blank i SQL)', () => {
  const c = n => String.fromCharCode(n);
  for (const blank of [c(9) + c(9) + c(9), c(160) + c(160), c(8203) + c(8203) + c(8203), c(65279) + c(65279), c(12288) + c(12288), c(9) + c(160) + c(8203) + c(10)]){
    const r = B.beskedValider(blank);
    assert.strictEqual(r.ok, false, JSON.stringify(blank));
    assert.match(r.fejl, /Skriv en besked/);
  }
  assert.strictEqual(B.beskedValider(c(9) + 'ok' + c(9)).ok, true, 'to rigtige tegn med tabulatorer omkring er stadig en besked');
});

test('normalisering: samme regel som bb_rens_besked() i SQL (CRLF, højst én blank linje, trim)', () => {
  assert.strictEqual(B.beskedRens('  Hej\r\n\r\n\r\n\r\nDav \r\n'), 'Hej\n\nDav');
  assert.strictEqual(B.beskedRens(null), '');
  const sql = laes('supabase/025_beskeder.sql');
  assert.match(sql, /between 2 and 1000/, 'SQL har samme tegngrænser som BESKED_MIN/MAX');
  assert.strictEqual(B.BESKED_MIN, 2);
  assert.strictEqual(B.BESKED_MAX, 1000);
  assert.match(sql, /bb_antal_links\(v_tekst\) > 2/, 'SQL tillader højst to links, som klienten');
});

test('hver kode, SQL kan svare, har en dansk tekst — og ingen tekst er en rå kode', () => {
  const sql = laes('supabase/025_beskeder.sql');
  const koder = new Set([...sql.matchAll(/'kode',\s*'([a-z_]+)'/g)].map(m => m[1]));
  assert.ok(koder.size >= 14, 'koderne findes i SQL: ' + [...koder].join(', '));
  for (const k of koder) assert.ok(B.BESKED_FEJLTEKSTER[k], `kode "${k}" mangler en dansk tekst i js/beskeder.js`);
  for (const [k, t] of Object.entries(B.BESKED_FEJLTEKSTER)){
    assert.doesNotMatch(t, /[a-z]+_[a-z_]+/, `tekst for ${k} ligner en rå kode`);
    assert.ok(t.length > 15, `tekst for ${k} er for kort til at forklare noget`);
    assert.match(t, /[.!?]$/, `tekst for ${k} er ikke en hel sætning`);
  }
  assert.strictEqual(B.beskedFejlTekst('noget_ukendt'), B.BESKED_FEJLTEKSTER.ukendt);
  assert.match(B.BESKED_FEJLTEKSTER.netvaerk, /ikke tabt/, 'netfejl siger, at teksten er bevaret');
});

test('låsetekster: aktiv er ikke låst; solgt, pause og slettet siger det ærligt', () => {
  assert.strictEqual(B.beskedLaasTekst('active', 'koeber'), '');
  assert.strictEqual(B.beskedLaasTekst(undefined, 'koeber'), '');
  assert.match(B.beskedLaasTekst('sold', 'koeber'), /solgt.*kan læses.*ikke skrives mere/);
  assert.match(B.beskedLaasTekst('slettet', 'saelger'), /slettet.*kan stadig læses/);
  assert.match(B.beskedLaasTekst('hidden', 'saelger'), /Din annonce er sat på pause/);
  assert.match(B.beskedLaasTekst('hidden', 'koeber'), /Sælgeren har sat annoncen på pause/);
  assert.strictEqual(B.beskedStatusMaerke('slettet'), 'Slettet');
  assert.strictEqual(B.beskedStatusMaerke('active'), '');
});

test('badge, initialer, navnefald og tid', () => {
  assert.strictEqual(B.beskedBadgeTekst(0), '');
  assert.strictEqual(B.beskedBadgeTekst(3), '3');
  assert.strictEqual(B.beskedBadgeTekst(12), '9+');
  assert.strictEqual(B.beskedInitialer('Anders Hansen'), 'AH');
  assert.strictEqual(B.beskedInitialer(''), '?');
  assert.strictEqual(B.beskedModpartNavn({ modpart_navn: 'Mette', rolle: 'koeber' }), 'Mette');
  assert.strictEqual(B.beskedModpartNavn({ modpart_navn: null, rolle: 'saelger' }), 'Køber');
  assert.strictEqual(B.beskedModpartNavn({ modpart_navn: null, rolle: 'koeber' }), 'Sælger');
  const nu = new Date(2026, 9, 26, 15, 30).getTime();
  assert.match(B.beskedTid(new Date(2026, 9, 26, 9, 5).toISOString(), nu), /^i dag 0?9[.:]05$/);
  assert.match(B.beskedTid(new Date(2026, 9, 25, 22, 0).toISOString(), nu), /^i går /);
  assert.match(B.beskedTid(new Date(2026, 8, 3, 12, 0).toISOString(), nu), /3\. sep/);
  assert.match(B.beskedTid(new Date(2025, 8, 3, 12, 0).toISOString(), nu), /2025/);
  assert.strictEqual(B.beskedTid('', nu), '');
});

test('formularen: label, tællere, honeypot uden tab-stop, ingen e-mail/telefon-felter', () => {
  const html = B.beskedFormularHTML();
  assert.match(html, /<label class="besked-label" for="besked-tekst">Din besked<\/label>/);
  assert.match(html, /id="besked-taeller"/);
  assert.match(html, /name="website"[^>]*tabindex="-1"[^>]*autocomplete="off"/, 'honeypot kan ikke tabbes til og udfyldes ikke af autofyld');
  assert.match(html, /aria-hidden="true"/);
  assert.doesNotMatch(html, /type="(email|tel)"|name="(email|phone|telefon|navn)"/i, 'formularen indsamler hverken e-mail, telefon eller navn');
  assert.match(html, /deler vi ikke/, 'siger FØR afsendelse, hvad der ikke deles');
  assert.match(B.beskedKvitteringHTML('abc-123'), /mine-annoncer\.html\?tab=beskeder&samtale=abc-123/);
});

/* ---------- 2. Flaget ---------- */

test('flaget er FRA som standard, og js/beskeder.js står ikke i nogen HTML-side eller byggescript', () => {
  const cfg = laes('js/supabase-config.js');
  assert.match(cfg, /Object\.assign\(\{ beskeder: false \}/, 'default er false');
  const fund = [];
  for (const f of fs.readdirSync(REPO).filter(n => n.endsWith('.html'))){
    const h = laes(f);
    if (/(?:src|href)="[^"]*(?:js\/beskeder\.js|p-beskeder\.css)/.test(h)) fund.push(f);
  }
  for (const f of fs.readdirSync(path.join(REPO, 'scripts')).filter(n => n.endsWith('.js') && !n.endsWith('.test.js'))){
    const h = laes('scripts/' + f);
    if (/js\/beskeder\.js|p-beskeder\.css/.test(h) && !/udgiv|sidevaegt|kritisk/.test(f)) fund.push('scripts/' + f);
  }
  assert.deepStrictEqual(fund, [], 'beskeder.js må kun hentes lazy bag flaget');
  /* Kun to steder nævner filen: loaderen og modulet selv (stilarket). */
  const steder = fs.readdirSync(path.join(REPO, 'js')).filter(n => n.endsWith('.js') && !n.endsWith('.test.js'))
    .filter(n => n !== 'beskeder.js' && /beskeder\.js|p-beskeder\.css/.test(laes('js/' + n).replace(/\/\*[\s\S]*?\*\//g, '')));
  assert.deepStrictEqual(steder, ['supabase-config.js'], 'kun loaderen i supabase-config.js må hente modulet: ' + steder);
});

test('bbIndlaesBeskeder() henter intet, når flaget er fra', async () => {
  let indsat = 0;
  const ctx = vm.createContext({
    window: {}, document: { currentScript: { src: 'js/supabase-config.js?v=abc123' }, createElement: () => { indsat++; return {}; }, head: { appendChild(){ indsat++; } } },
    Promise, Object, Boolean,
  });
  vm.runInContext(laes('js/supabase-config.js') + '\nthis.__t = { bbFlag, bbIndlaesBeskeder };', ctx);
  assert.strictEqual(ctx.window.BB_FLAGS.beskeder, false);
  assert.strictEqual(ctx.__t.bbFlag('beskeder'), false);
  assert.strictEqual(await ctx.__t.bbIndlaesBeskeder(), null);
  assert.strictEqual(indsat, 0, 'ingen script-tag må indsættes');
  /* og med flaget til forsøger den (her: uden at kunne indlæse) at indsætte præcis ét script med versionen. */
  const ctx2 = vm.createContext({
    window: { BB_FLAGS: { beskeder: true } },
    document: { currentScript: { src: 'js/supabase-config.js?v=abc123' }, createElement: () => ({}), head: { appendChild(el){ indsat++; this.sidste = el; el.onerror(); } } },
    Promise, Object, Boolean,
  });
  vm.runInContext(laes('js/supabase-config.js') + '\nthis.__t = { bbIndlaesBeskeder };', ctx2);
  assert.strictEqual(await ctx2.__t.bbIndlaesBeskeder(), null, 'fejlet hentning giver null, ikke en exception');
  assert.strictEqual(indsat, 1);
  assert.strictEqual(ctx2.document.head.sidste.src, 'js/beskeder.js?v=abc123');
});

test('annonce.js og mine-annoncer.js når kun modulet via bbIndlaesBeskeder()', () => {
  for (const f of ['js/annonce.js', 'js/mine-annoncer.js']){
    const kode = laes(f).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(kode, /beskeder\.js/, `${f} må ikke selv nævne filen`);
    assert.match(kode, /bbIndlaesBeskeder\(\)/, `${f} bruger loaderen`);
  }
  const html = laes('mine-annoncer.html');
  assert.match(html, /id="tabbtn-beskeder"[^>]*\shidden>/, 'fanen er skjult i markup, til flaget viser den');
  assert.match(html, /id="tab-beskeder"[^>]*display:none/, 'panelet er skjult i markup');
});

/* ---------- 3. Kontaktbeskrivelsen (sælgerkortet) ---------- */

const KORT = (flag, extra) => indlaes(MED_ANNONCE, ['saelgerKortHTML', 'telefonNoteHTML', 'kanSkriveTilSaelger'], extra,
  `const bbFlag = n => ${flag ? 'true' : 'false'}; const db = { enabled: true };\n`);
const UUID = 'b3a5c3a8-0000-4000-8000-000000000001';
const egen = extra => Object.assign({
  id: UUID, brand: 'BMW', model: 'R45', type: 'classic', year: 1979, km: 91350, ccm: 473, power: 27, price: 29000, city: 'Aarhus',
  isDealer: false, createdAt: new Date().toISOString(), seller: { id: 's1', name: 'Mesut Privat', isDealer: false, city: 'Aarhus' },
}, extra || {});
const kort = (F, l, opts) => udenKomm(F.saelgerKortHTML(l, Object.assign({ loggedIn: true, avgRating: null, reviewCount: 0, telefon: '', telefonMulig: false }, opts || {})));
const udenKomm = h => h.replace(/<!--[\s\S]*?-->/g, '');
const tekst = h => udenKomm(h).replace(/<\/?(?:b|strong|em)\b[^>]*>/g, '').replace(/<[^>]+>/g, ' ').replace(/&ldquo;|&rdquo;/g, '"').replace(/\s+/g, ' ').trim();

test('flag FRA, udlogget: tydelig kontaktvej FØR login — og ingen formular eller løfte om beskeder', () => {
  const F = KORT(false);
  const h = kort(F, egen(), { loggedIn: false });
  const t = tekst(h);
  assert.match(t, /Sådan kontakter du sælgeren\. Log ind gratis, og tryk på "Vis telefonnummer", hvis sælgeren har valgt at vise sit nummer/);
  assert.match(t, /Beskeder via Bikerbasen er ikke åbnet endnu, så uden et vist nummer kan annoncen ikke kontaktes her/);
  assert.doesNotMatch(h, /besked-kort|besked-form|besked-tekst/);
  assert.ok(h.indexOf('Sådan kontakter du sælgeren') < h.indexOf('contact-actions'), 'forklaringen står før knapperne');
  assert.match(h, /Log ind for at se sælgeren/);
});

test('flag FRA, indlogget: ærlig note pr. tilstand, ingen formular, ingen "skriv"-opfordring', () => {
  const F = KORT(false);
  for (const opts of [{}, { telefon: '12345678' }, { telefonMulig: true }]){
    const h = kort(F, egen(), opts);
    assert.doesNotMatch(h, /besked-kort|besked-form/);
    assert.doesNotMatch(tekst(h), /Send besked|Skriv til sælger|Skriv til sælgeren/i);
    assert.match(tekst(h), /ikke åbnet endnu/);
  }
});

test('flag TIL, udlogget: vejen ind er "Log ind for at skrive til sælgeren"', () => {
  const F = KORT(true);
  const h = kort(F, egen(), { loggedIn: false });
  assert.match(h, /Log ind for at skrive til sælgeren/);
  assert.match(tekst(h), /Sælgeren ser dit navn — ikke din e-mail eller dit telefonnummer/);
  assert.doesNotMatch(h, /besked-form|besked-tekst/, 'formularen vises først, når man er logget ind');
  assert.doesNotMatch(tekst(h), /ikke åbnet endnu/, 'ingen modsigelse: beskeder ER åbnet');
});

test('flag TIL, indlogget køber: pladsholder til formularen; telefonen er et valgfrit alternativ', () => {
  const F = KORT(true);
  const h = kort(F, egen(), { telefonMulig: true });
  assert.match(h, /id="besked-kort"/);
  assert.match(h, /aria-busy="true"/);
  assert.match(tekst(h), /Foretrækker du at ringe\?/);
  assert.doesNotMatch(tekst(h), /ikke åbnet endnu/);
  const uden = tekst(kort(F, egen()));
  assert.match(uden, /Sælgeren har ikke oplyst telefon\. Brug beskedformularen ovenfor/);
});

test('flag TIL: egen annonce får vejen til indbakken, ikke en formular; demoannoncer får ingen formular', () => {
  const F = KORT(true);
  const eget = kort(F, egen(), { eget: true });
  assert.match(eget, /besked-kort-egen/);
  assert.match(eget, /mine-annoncer\.html\?tab=beskeder/);
  assert.doesNotMatch(eget, /id="besked-kort"/);
  const demo = kort(F, egen({ id: '1021' }));
  assert.doesNotMatch(demo, /besked-kort/, 'kun annoncer i databasen (uuid) har en beskedflade');
  assert.match(tekst(demo), /ikke åbnet endnu/, 'demoannoncen er ærlig om, at der ikke kan skrives');
  assert.strictEqual(F.kanSkriveTilSaelger(egen({ id: '1021' })), false);
  assert.strictEqual(F.kanSkriveTilSaelger(egen()), true);
});

test('statisk annonce.html har ingen beskedformular (flaget styrer alt i JS)', () => {
  const html = laes('annonce.html');
  assert.doesNotMatch(html, /besked-form|besked-kort|besked-tekst/);
  const bmw = fs.readdirSync(REPO).find(n => /^annonce-bmw-r45/.test(n));
  if (bmw) assert.doesNotMatch(laes(bmw), /besked-form|besked-kort|besked-tekst/);
});

test('flag TIL ændrer også de to steder, der sagde "vi videresender ikke beskeder"', () => {
  assert.match(laes('js/opret-annonce.js'), /bbFlag\('beskeder'\)[\s\S]{0,200}naa-koebere-kontakt/);
  assert.match(laes('js/dashboard.js'), /bbFlag\('beskeder'\)[\s\S]{0,200}dash-visning-note/);
  assert.match(laes('opret-annonce.html'), /id="naa-koebere-kontakt"/);
  assert.match(laes('dashboard.html'), /id="dash-visning-note"/);
});
