/* V7 beskeder: hele flowet i rigtig browser mod LOKAL mock (scripts/w9-saelger-mock.js). Kør: node --test js/v7-besked-flow.test.js
   Ingen produktion, ingen rigtige konti, ingen rigtige beskeder: alle kald til *.supabase.co besvares af mocken, som
   gen-implementerer database-funktionerne fra supabase/025_beskeder.sql med samme regler (koder, grænser, låsning).
   Mocken beviser FRONTENDENS flow; SQL'en tjekkes statisk i js/v7-besked-sql.test.js og skal køres på staging før aktivering.
   Uden Playwright/Chromium springes testene over med en tydelig besked.

   Både flag-fra (standard) og flag-til: send, modtag som sælger, svar, notifikationstæller, spam-grænse, slettet/solgt annonce,
   ugyldigt input, XSS, blokér/anmeld, mobil 375/430, lys og mørk. Sæt BESKED_SKAERM=<mappe> for at gemme screenshots. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const sb = require('../scripts/smoke-browser');
const { lavBackend, BRUGER_ID, KOEBER_ID } = require('../scripts/w9-saelger-mock');

let kan, server, port, browser;
const URL = s => `http://127.0.0.1:${port}/${s}`;
const SKAERM = process.env.BESKED_SKAERM || '';

test.before(async () => {
  kan = await sb.playwrightTilgaengelig();
  if (!kan.ok){ console.log(`# v7-besked-flow.test: SKIPPER browsertestene (${kan.grund})`); return; }
  ({ server, port } = await sb.startServer(path.join(__dirname, '..')));
  browser = await kan.pw.chromium.launch();
});
test.after(async () => { if (browser) await browser.close(); if (server) server.close(); });

const ANN_ID = 'cccccccc-0000-4000-8000-0000000000c1';
const ANN = (extra) => Object.assign({ id: ANN_ID, brand: 'BMW', model: 'R45', year: 1979, km: 91350, ccm: 473, power: 27, price: 29000, type: 'classic',
  city: 'Valby', postnr: 2500, region: 'Hovedstaden', description: 'Flot veteran.' }, extra || {});

/* Åbner en side som `som` (undefined = udlogget, 'saelger' = standardbrugeren, 'koeber' | 'koeber2' | 'uverificeret').
   Flere sider kan dele ÉT backend (`bak`), så "send som køber, modtag som sælger" kan testes mod samme lager. */
async function side(bak, { som, flag = true, viewport = { width: 1280, height: 900 }, tema = 'lys', sti } = {}){
  const ctx = await browser.newContext({ viewport });
  if (som) await bak.installer(ctx, { tema, som });
  else { bak.tilstand.loggetInd = false; await bak.installer(ctx, { tema }); }
  if (flag) await ctx.addInitScript(() => { window.BB_FLAGS = { beskeder: true }; });
  const page = await ctx.newPage();
  const fund = { konsol: [], side: [], anmodninger: [] };
  page.on('pageerror', e => fund.side.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/blockedbyclient|Failed to load resource/.test(m.text())) fund.konsol.push(m.text()); });
  page.on('request', r => fund.anmodninger.push(r.url()));
  const o = { ctx, page, fund, luk: () => ctx.close() };
  if (sti) await aabnSti(o, sti);
  return o;
}
async function aabnSti(o, sti){
  await o.page.goto(URL(sti), { waitUntil: 'networkidle' });
  await o.page.waitForTimeout(250);
}
const hentetModul = o => o.fund.anmodninger.some(u => /js\/beskeder\.js|css\/p-beskeder\.css/.test(u));
const rpcLog = bak => bak.tilstand.log.filter(l => /^rpc\//.test(l.tabel)).map(l => l.tabel.slice(4));
const kortTekst = page => page.locator('.an-seller-wrap').first().innerText();
const skaerm = async (page, navn, el) => {
  if (!SKAERM) return;
  const m = el ? page.locator(el).first() : page;
  await m.screenshot({ path: path.join(SKAERM, navn + '.png') });
};
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const ingenNul = async (page, hvor) => {
  const t = await page.evaluate(() => document.body.innerText);
  const m = t.match(/\b(null|undefined|NaN)\b|\[object Object\]/);
  assert.ok(!m, `${hvor}: "${m && m[0]}" i synlig tekst`);
};
async function skrivOgSend(o, tekst){
  await o.page.fill('#besked-tekst', tekst);
  await o.page.click('#besked-send');
}
const annonceSti = id => `annonce.html?id=${id || ANN_ID}`;

/* =================== FLAG FRA (standard) =================== */

test('flag FRA, udlogget: tydelig kontaktvej, ingen formular, intet modul hentet — 1440/390, lys/mørk', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const [vp, tema] of [[{ width: 1440, height: 900 }, 'lys'], [{ width: 390, height: 844 }, 'moerk']]){
    const bak = lavBackend({ annoncer: [ANN()] });
    const o = await side(bak, { flag: false, viewport: vp, tema, sti: annonceSti() });
    const tekst = await kortTekst(o.page);
    assert.match(tekst, /Sådan kontakter du sælgeren\. Log ind gratis, og tryk på “Vis telefonnummer”, hvis sælgeren har valgt at vise sit nummer/);
    assert.match(tekst, /Beskeder via Bikerbasen er ikke åbnet endnu, så uden et vist nummer kan annoncen ikke kontaktes her/);
    assert.strictEqual(await o.page.locator('#besked-form, #besked-tekst, #besked-kort').count(), 0);
    assert.ok(!hentetModul(o), 'flag fra: js/beskeder.js og css/p-beskeder.css hentes ikke');
    assert.deepStrictEqual(rpcLog(bak).filter(n => /besked|samtale/.test(n)), [], 'flag fra: ingen beskedkald');
    assert.ok(await o.page.locator('.an-seller-wrap a[href^="login.html"]').first().isVisible(), 'der er en synlig vej videre (login)');
    assert.deepStrictEqual(o.fund.side.concat(o.fund.konsol), []);
    assert.ok(await overflow(o.page) <= 0, 'ingen vandret overflow');
    await ingenNul(o.page, 'annonce udlogget flag fra');
    await skaerm(o.page, `flagfra-udlogget-${vp.width}-${tema}`, '.an-seller-wrap');
    await o.luk();
  }
});

test('flag FRA, indlogget køber: ærlig note, ingen formular, ingen beskedkald, ingen badge, Beskeder-fane skjult', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const bak = lavBackend({ annoncer: [ANN()] });
  const o = await side(bak, { som: 'koeber', flag: false, sti: annonceSti() });
  const tekst = await kortTekst(o.page);
  assert.match(tekst, /Beskeder via Bikerbasen er ikke åbnet endnu\. Har sælgeren valgt at vise sit telefonnummer, kan du se det med knappen nedenfor\./);
  assert.strictEqual(await o.page.locator('#besked-form, #besked-kort').count(), 0);
  assert.strictEqual(await o.page.locator('.bb-badge').count(), 0);
  // Siger sælgeren nej til telefon, ændres noten til den ærlige "kan ikke kontaktes"-tekst (ingen blindgyde uden forklaring).
  await o.page.click('#reveal-phone-btn');
  await o.page.waitForFunction(() => /kan derfor ikke kontaktes via Bikerbasen lige nu/.test(document.getElementById('seller-telefon-note').innerText));
  assert.match(await o.page.locator('#seller-telefon-note').innerText(), /Sælgeren viser ikke sit telefonnummer, og beskeder via Bikerbasen er ikke åbnet endnu\. Annoncen kan derfor ikke kontaktes via Bikerbasen lige nu\./);
  assert.ok(!hentetModul(o));
  await aabnSti(o, 'mine-annoncer.html?tab=beskeder');
  assert.ok(await o.page.locator('#tabbtn-beskeder').isHidden(), 'fanen er skjult uden flag');
  assert.strictEqual(await o.page.locator('#tabbtn-oversigt').getAttribute('aria-selected'), 'true', '?tab=beskeder falder tilbage til Oversigt');
  assert.ok(await o.page.locator('#tab-beskeder').isHidden());
  assert.ok(!hentetModul(o), 'heller ikke i Mine annoncer hentes modulet uden flag');
  assert.deepStrictEqual(rpcLog(bak).filter(n => /besked|samtale/.test(n)), [], 'ingen beskedkald uden flag');
  await o.luk();
});

test('flag FRA: ingen beskedløfter på opret-annonce og dashboard, som før', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const bak = lavBackend({ loggetInd: true, forhandler: true });
  const o = await side(bak, { som: 'saelger', flag: false });
  await o.page.goto(URL('opret-annonce.html'), { waitUntil: 'networkidle' });
  await o.page.waitForSelector('body[data-op-klar]', { timeout: 10000 });
  assert.match(await o.page.locator('#naa-koebere-kontakt').innerText(), /Vi videresender ikke beskeder/);
  await o.luk();
});

/* =================== FLAG TIL: annoncesiden =================== */

test('flag TIL, udlogget: "Log ind for at skrive til sælgeren" er den tydelige vej ind', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const bak = lavBackend({ annoncer: [ANN()] });
  const o = await side(bak, { sti: annonceSti() });
  const tekst = await kortTekst(o.page);
  assert.match(tekst, /Skriv til sælgeren på Bikerbasen\. Log ind gratis for at sende en besked\. Sælgeren ser dit navn — ikke din e-mail eller dit telefonnummer/);
  const cta = o.page.locator('.an-seller-wrap a.btn-primary').first();
  assert.match(await cta.innerText(), /Log ind for at skrive til sælgeren/);
  assert.match(await cta.getAttribute('href'), /^login\.html\?redirect=/);
  assert.strictEqual(await o.page.locator('#besked-form').count(), 0, 'ingen formular uden login');
  assert.ok(!/ikke åbnet endnu/.test(tekst));
  await skaerm(o.page, 'flagtil-udlogget-1280-lys', '.an-seller-wrap');
  await o.luk();
});

test('flag TIL, køber: valideringen siger hvad der er galt — og der sendes intet kald, før teksten er gyldig', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const bak = lavBackend({ annoncer: [ANN()] });
  const o = await side(bak, { som: 'koeber', sti: annonceSti() });
  await o.page.waitForSelector('#besked-form');
  const faerdigeKald = () => rpcLog(bak).filter(n => n === 'send_besked').length;
  // tom
  await o.page.click('#besked-send');
  assert.match(await o.page.locator('#besked-fejl').innerText(), /Skriv en besked, før du sender/);
  // for kort
  await skrivOgSend(o, 'a');
  assert.match(await o.page.locator('#besked-fejl').innerText(), /for kort/);
  // for lang
  await o.page.fill('#besked-tekst', 'x'.repeat(1040));
  assert.strictEqual(await o.page.locator('#besked-taeller').innerText(), '1040 / 1000');
  assert.ok(await o.page.locator('#besked-taeller.er-over').count(), 'tælleren advarer');
  await o.page.click('#besked-send');
  assert.match(await o.page.locator('#besked-fejl').innerText(), /40 tegn for lang/);
  // for mange links
  await skrivOgSend(o, 'se http://a.dk http://b.dk http://c.dk');
  assert.match(await o.page.locator('#besked-fejl').innerText(), /for mange links/);
  assert.strictEqual(faerdigeKald(), 0, 'ugyldig tekst når aldrig serveren');
  // fejlen forsvinder, når man skriver igen
  await o.page.fill('#besked-tekst', 'Hej, er den til salg?');
  assert.ok(await o.page.locator('#besked-fejl').isHidden());
  assert.strictEqual(bak.tilstand.tabeller.beskeder.length, 0);
  await skaerm(o.page, 'flagtil-valideringsfejl-1280-lys', '.an-seller-wrap');
  await o.luk();
});

test('flag TIL, køber sender: kvittering, gemt i databasen, notifikation uden tekst, ingen dobbeltsend, kladde bevares ved fejl', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const bak = lavBackend({ annoncer: [ANN()] });
  const o = await side(bak, { som: 'koeber', sti: annonceSti() });
  await o.page.waitForSelector('#besked-form');
  // Netfejl: teksten er ikke tabt, knappen er klar igen, intet er gemt.
  bak.tilstand.fejl['POST rpc/send_besked'] = { status: 500, besked: 'mock-fejl' };
  await skrivOgSend(o, 'Hej, er motorcyklen stadig til salg?');
  await o.page.waitForFunction(() => !document.querySelector('#besked-fejl').hidden);
  assert.match(await o.page.locator('#besked-fejl').innerText(), /Beskeden blev ikke sendt.*din tekst er ikke tabt/);
  assert.strictEqual(await o.page.inputValue('#besked-tekst'), 'Hej, er motorcyklen stadig til salg?');
  assert.ok(await o.page.locator('#besked-send').isEnabled());
  assert.strictEqual(bak.tilstand.tabeller.beskeder.length, 0);
  // Dobbeltklik: kun ÉN besked bliver sendt.
  await o.page.dblclick('#besked-send');
  await o.page.waitForSelector('.besked-ok', { timeout: 5000 });
  assert.strictEqual(bak.tilstand.tabeller.beskeder.length, 1, 'dobbeltklik giver én besked');
  assert.strictEqual(bak.tilstand.tabeller.samtaler.length, 1);
  assert.match(await o.page.locator('.besked-ok').innerText(), /Beskeden er sendt\. Svaret kommer i Mine annoncer under Beskeder/);
  assert.match(await o.page.locator('.an-seller-wrap a[href*="tab=beskeder"]').first().getAttribute('href'), /samtale=/);
  // Notifikation: bedt om, men uden tekst; ingen e-mail/telefon i noget af det, afsenderen gemmer.
  assert.strictEqual(bak.tilstand.notifikationer.length, 1);
  assert.deepStrictEqual(Object.keys(bak.tilstand.notifikationer[0]).sort(), ['besked_id', 'modtager', 'samtale_id']);
  const lager = JSON.stringify(bak.tilstand.tabeller.samtaler) + JSON.stringify(bak.tilstand.tabeller.beskeder);
  assert.doesNotMatch(lager, /example\.test|phone|telefon/, 'hverken e-mail eller telefon i beskedtabellerne');
  assert.deepStrictEqual(o.fund.side.concat(o.fund.konsol), []);
  await skaerm(o.page, 'flagtil-sendt-1280-lys', '.an-seller-wrap');
  // Genindlæs: køberen ser "du har allerede skrevet" i stedet for en ny formular.
  await aabnSti(o, annonceSti());
  await o.page.waitForSelector('#besked-aabn');
  assert.match(await kortTekst(o.page), /Du har allerede skrevet til sælgeren/);
  assert.match(await o.page.locator('.besked-sidste').innerText(), /Din seneste besked · i dag[\s\S]*Hej, er motorcyklen stadig til salg\?/, 'seneste besked vises direkte på annoncen');
  assert.strictEqual(await o.page.locator('#besked-form').count(), 0);
  await o.luk();
});

test('flag TIL: honeypot — en bot, der udfylder skjult felt, får ok, men intet gemmes', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const bak = lavBackend({ annoncer: [ANN()] });
  const o = await side(bak, { som: 'koeber', sti: annonceSti() });
  await o.page.waitForSelector('#besked-form');
  await o.page.evaluate(() => { document.getElementById('besked-website').value = 'http://spam.example'; });
  await skrivOgSend(o, 'Køb billige ure her');
  await o.page.waitForSelector('.besked-ok');
  assert.strictEqual(bak.tilstand.tabeller.beskeder.length, 0);
  assert.strictEqual(bak.tilstand.tabeller.samtaler.length, 0);
  assert.strictEqual(bak.tilstand.notifikationer.length, 0);
  await o.luk();
});

test('flag TIL: uverificeret e-mail får en forklaring og et "send linket igen"; egen annonce og demoannonce får ingen formular', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const bak = lavBackend({ annoncer: [ANN()] });
  const o = await side(bak, { som: 'uverificeret', sti: annonceSti() });
  await o.page.waitForSelector('#besked-form');
  await skrivOgSend(o, 'Hej, er den til salg?');
  await o.page.waitForFunction(() => !document.querySelector('#besked-fejl').hidden);
  assert.match(await o.page.locator('#besked-fejl').innerText(), /Bekræft din e-mailadresse/);
  await o.page.click('.besked-resend');
  await o.page.waitForFunction(() => /Linket er sendt/.test(document.querySelector('#besked-fejl').innerText));
  assert.strictEqual(bak.tilstand.tabeller.beskeder.length, 0);
  assert.ok(bak.tilstand.auth.some(a => a.gren === 'resend'), 'bekræftelseslinket sendes (mock)');
  await o.luk();

  const s = await side(bak, { som: 'saelger', sti: annonceSti() });
  assert.strictEqual(await s.page.locator('#besked-form').count(), 0, 'sælgerens egen annonce har ingen formular');
  assert.match(await kortTekst(s.page), /Henvendelser til din annonce/);
  assert.ok(await s.page.locator('a[href="mine-annoncer.html?tab=beskeder"]').first().isVisible());
  await s.luk();

  const d = await side(bak, { som: 'koeber', sti: 'annonce.html?id=1021' });
  assert.strictEqual(await d.page.locator('#besked-form, #besked-kort').count(), 0, 'demoannoncer har ingen beskedflade');
  assert.ok(!hentetModul(d));
  await d.luk();
});

test('flag TIL: mobilbjælken siger "Send besked" og ruller til formularen; udlogget "Log ind for at skrive"', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const bak = lavBackend({ annoncer: [ANN()] });
  const o = await side(bak, { som: 'koeber', viewport: { width: 390, height: 844 }, sti: annonceSti() });
  await o.page.waitForSelector('#besked-form');
  assert.match(await o.page.locator('#bar-phone').innerText(), /Send besked/);
  await o.page.click('#bar-phone');
  await o.page.waitForFunction(() => document.activeElement && document.activeElement.id === 'besked-tekst', null, { timeout: 4000 });
  await o.luk();
  const u = await side(bak, { viewport: { width: 390, height: 844 }, sti: annonceSti() });
  assert.match(await u.page.locator('#bar-phone').innerText(), /Log ind for at skrive/);
  await u.luk();
});

/* =================== FLAG TIL: sælger og indbakke =================== */

async function koeberSender(bak, tekst = 'Hej, er motorcyklen stadig til salg?', id){
  const k = await side(bak, { som: 'koeber', sti: annonceSti(id) });
  await k.page.waitForSelector('#besked-form');
  await skrivOgSend(k, tekst);
  await k.page.waitForSelector('.besked-ok');
  await k.luk();
}

test('flag TIL: sælger ser ulæst-badge i header og fane, åbner tråden (badge væk), svarer; køber ser svaret med eget badge', { timeout: 120000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const bak = lavBackend({ annoncer: [ANN()] });
  await koeberSender(bak);

  const s = await side(bak, { som: 'saelger', sti: 'mine-annoncer.html' });
  await s.page.waitForSelector('#tabbtn-beskeder .bb-badge');
  assert.strictEqual(await s.page.locator('#tabbtn-beskeder .bb-badge').innerText(), '1');
  assert.strictEqual(await s.page.locator('[data-auth-slot] .bb-badge').innerText(), '1', 'badge i headeren');
  assert.match(await s.page.locator('[data-auth-slot]').getAttribute('href'), /tab=beskeder/, 'profillinket peger direkte på Beskeder');
  assert.match(await s.page.locator('[data-auth-slot] .bb-badge').getAttribute('aria-label'), /1 ulæst besked/);
  await s.page.click('#tabbtn-beskeder');
  await s.page.waitForSelector('.bsk-raekke');
  const raekke = s.page.locator('.bsk-raekke').first();
  assert.ok(await raekke.evaluate(e => e.classList.contains('er-ulaest')));
  const raekkeTekst = await raekke.innerText();
  assert.match(raekkeTekst, /Test Køber/);
  assert.match(raekkeTekst, /BMW R45 \(1979\)/);
  assert.match(raekkeTekst, /er motorcyklen stadig til salg/i);
  assert.doesNotMatch(raekkeTekst, /example\.test/, 'ingen e-mail i indbakken');
  await skaerm(s.page, 'flagtil-indbakke-1280-lys');
  await raekke.click();
  await s.page.waitForSelector('.bsk-boble');
  assert.match(await s.page.locator('.bsk-boble.fra-modpart').first().innerText(), /Hej, er motorcyklen stadig til salg\?/);
  await s.page.waitForFunction(() => !document.querySelector('#tabbtn-beskeder .bb-badge'), null, { timeout: 4000 });
  assert.strictEqual(await s.page.locator('[data-auth-slot] .bb-badge').count(), 0, 'badgen forsvinder, når tråden er læst');
  // Svar
  await s.page.fill('#bsk-svar-tekst', 'Ja, den er stadig til salg. Kom gerne forbi i weekenden.');
  await s.page.click('#bsk-svar-send');
  await s.page.waitForFunction(() => document.querySelectorAll('.bsk-boble').length === 2, null, { timeout: 5000 });
  assert.strictEqual(await s.page.inputValue('#bsk-svar-tekst'), '', 'svarfeltet er tomt efter afsendelse');
  assert.strictEqual(bak.tilstand.tabeller.beskeder.length, 2);
  assert.strictEqual(bak.tilstand.notifikationer.length, 2, 'svaret udløser en notifikation til køberen (første til hver modtager)');
  await skaerm(s.page, 'flagtil-traad-1280-lys');
  assert.deepStrictEqual(s.fund.side.concat(s.fund.konsol), []);
  await s.luk();

  const k = await side(bak, { som: 'koeber', sti: 'mine-annoncer.html?tab=beskeder' });
  await k.page.waitForSelector('.bsk-raekke.er-ulaest');
  assert.strictEqual(await k.page.locator('#tabbtn-beskeder .bb-badge').innerText(), '1');
  assert.match(await k.page.locator('.bsk-raekke').first().innerText(), /Test Sælger/);
  await k.page.locator('.bsk-raekke').first().click();
  await k.page.waitForSelector('.bsk-boble.fra-modpart');
  assert.match(await k.page.locator('.bsk-boble.fra-modpart').innerText(), /Kom gerne forbi i weekenden/);
  assert.strictEqual(await k.page.locator('.bsk-boble').count(), 2);
  await k.luk();
});

test('flag TIL: deep-link ?tab=beskeder&samtale=<id> åbner tråden direkte (som fra mailen)', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const bak = lavBackend({ annoncer: [ANN()] });
  await koeberSender(bak);
  const id = bak.tilstand.tabeller.samtaler[0].id;
  const s = await side(bak, { som: 'saelger', sti: `mine-annoncer.html?tab=beskeder&samtale=${id}` });
  await s.page.waitForSelector('.bsk-boble');
  assert.strictEqual(await s.page.locator('#tabbtn-beskeder').getAttribute('aria-selected'), 'true');
  assert.match(await s.page.locator('.bsk-traadtitel h3').innerText(), /BMW R45 \(1979\)/);
  assert.ok(await s.page.locator('.bsk-traadtitel h3 a[href*="annonce.html?id="]').count(), 'tråden linker til annoncen, mens den findes');
  await s.luk();
});

test('flag TIL, spam-grænser (som databasen): 5 pr. annonce pr. time, dublet, 10 nye samtaler pr. døgn', { timeout: 120000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const ekstraAnn = Array.from({ length: 11 }, (_, i) => ANN({ id: `dddddddd-0000-4000-8000-${String(i).padStart(12, '0')}`, model: 'R' + (50 + i) }));
  const bak = lavBackend({ annoncer: [ANN(), ...ekstraAnn] });
  const o = await side(bak, { som: 'koeber', sti: annonceSti() });
  await o.page.waitForSelector('#besked-form');
  const send = (id, tekst) => o.page.evaluate(([i, x]) => window.Beskeder.Api.send(i, x, ''), [id, tekst]);
  for (let i = 1; i <= 5; i++) assert.strictEqual((await send(ANN_ID, 'Besked nummer ' + i)).ok, true);
  assert.strictEqual((await send(ANN_ID, 'Besked nummer 6')).kode, 'for_mange_pr_annonce');
  assert.strictEqual((await send(ekstraAnn[0].id, 'Samme tekst')).ok, true);
  assert.strictEqual((await send(ekstraAnn[0].id, 'Samme tekst')).kode, 'dublet');
  for (let i = 1; i < 9; i++) assert.strictEqual((await send(ekstraAnn[i].id, 'Hej ' + i)).ok, true, 'ny samtale ' + (i + 2));
  assert.strictEqual(bak.tilstand.tabeller.samtaler.length, 10);
  assert.strictEqual((await send(ekstraAnn[9].id, 'Hej 10')).kode, 'for_mange_samtaler');
  // Og UI'et oversætter koden til en forklaring i stedet for at vise koden.
  await aabnSti(o, annonceSti(ekstraAnn[10].id));
  await o.page.waitForSelector('#besked-form');
  await skrivOgSend(o, 'En ellevte samtale');
  await o.page.waitForFunction(() => !document.querySelector('#besked-fejl').hidden);
  assert.match(await o.page.locator('#besked-fejl').innerText(), /Du har startet mange nye samtaler i dag\. Prøv igen i morgen\./);
  assert.doesNotMatch(await o.page.locator('#besked-fejl').innerText(), /for_mange/);
  await o.luk();
});

test('flag TIL: slettet, solgt og pauset annonce — tråden kan læses, men er låst med ærlig tekst', { timeout: 120000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const bak = lavBackend({ annoncer: [ANN()] });
  await koeberSender(bak);
  const id = bak.tilstand.tabeller.samtaler[0].id;
  const aaben = async som => {
    const o = await side(bak, { som, sti: `mine-annoncer.html?tab=beskeder&samtale=${id}` });
    await o.page.waitForSelector('.bsk-boble');
    return o;
  };
  const forventLaast = async (o, mønster) => {
    const laas = await o.page.locator('.bsk-laas').first().innerText();
    assert.match(laas, mønster);
    assert.strictEqual(await o.page.locator('#bsk-svar').count(), 0, 'ingen svarformular i en låst tråd');
    assert.ok(await o.page.locator('.bsk-boble').count() >= 1, 'beskederne kan stadig læses');
  };
  const l = bak.tilstand.tabeller.listings[0];
  l.status = 'sold';
  let o = await aaben('saelger'); await forventLaast(o, /solgt.*kan læses.*ikke skrives mere/); assert.match(await o.page.locator('.bsk-maerke').first().innerText(), /Solgt/); await o.luk();
  l.status = 'hidden';
  o = await aaben('koeber'); await forventLaast(o, /Sælgeren har sat annoncen på pause/); await o.luk();
  o = await aaben('saelger'); await forventLaast(o, /Din annonce er sat på pause/); await o.luk();
  bak.tilstand.tabeller.listings.length = 0;   // annoncen slettes
  o = await aaben('koeber');
  await forventLaast(o, /Annoncen er slettet\. Samtalen kan stadig læses/);
  assert.strictEqual(await o.page.locator('.bsk-traadtitel h3 a').count(), 0, 'slettet annonce: titlen er ikke et dødt link');
  assert.match(await o.page.locator('.bsk-traadtitel h3').innerText(), /BMW R45 \(1979\) Slettet/);
  await skaerm(o.page, 'flagtil-slettet-1280-lys');
  await o.luk();
  // Og databasen nægter også, hvis nogen forsøger at svare alligevel.
  const p = await side(bak, { som: 'koeber', sti: 'mine-annoncer.html?tab=beskeder' });
  await p.page.waitForSelector('.bsk-raekke');
  assert.strictEqual((await p.page.evaluate(i => window.Beskeder.Api.svar(i, 'Kan jeg stadig skrive?'), id)).kode, 'annonce_ikke_aktiv');
  await p.luk();
});

test('flag TIL: blokér (begge veje, kan fortrydes) og anmeld (genbruger DSA-kanalen)', { timeout: 120000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const bak = lavBackend({ annoncer: [ANN(), ANN({ id: 'dddddddd-0000-4000-8000-000000000001', model: 'R60' })] });
  await koeberSender(bak);
  const id = bak.tilstand.tabeller.samtaler[0].id;
  const s = await side(bak, { som: 'saelger', sti: `mine-annoncer.html?tab=beskeder&samtale=${id}` });
  await s.page.waitForSelector('.bsk-boble');
  // Anmeld
  await s.page.click('.bsk-menu summary');
  await s.page.click('[data-handling="anmeld"]');
  await s.page.selectOption('#bsk-anmeld-aarsag', 'svindel');
  await s.page.fill('#bsk-anmeld-tekst', 'Mistænkelig henvendelse');
  await s.page.click('#bsk-anmeld button[type="submit"]');
  await s.page.waitForFunction(() => !document.getElementById('bsk-anmeld'));
  const rapport = bak.tilstand.tabeller.reports[0];
  assert.strictEqual(rapport.target_type, 'profile');
  assert.strictEqual(rapport.target_id, KOEBER_ID);
  assert.strictEqual(rapport.reason, 'svindel');
  assert.match(rapport.comment, new RegExp(id), 'kommentaren peger på tråden');
  // Bloker (med bekræftelsesdialog)
  await s.page.click('.bsk-menu summary');
  await s.page.click('[data-handling="bloker"]');
  await s.page.waitForSelector('dialog.bb-bekraeft[open]');
  await skaerm(s.page, 'flagtil-bloker-dialog-1280-lys');
  await s.page.click('[data-bekraeft-ok]');
  await s.page.waitForSelector('.bsk-laas');
  assert.match(await s.page.locator('.bsk-laas').innerText(), /Du har blokeret Test Køber/);
  assert.strictEqual(await s.page.locator('#bsk-svar').count(), 0);
  assert.strictEqual(bak.tilstand.tabeller.besked_blokeringer.length, 1);
  // Køberen kan hverken svare eller skrive om en ANDEN annonce hos samme sælger.
  const k = await side(bak, { som: 'koeber', sti: 'mine-annoncer.html?tab=beskeder' });
  await k.page.waitForSelector('.bsk-raekke');
  assert.strictEqual((await k.page.evaluate(i => window.Beskeder.Api.svar(i, 'Hallo?'), id)).kode, 'blokeret');
  assert.strictEqual((await k.page.evaluate(() => window.Beskeder.Api.send('dddddddd-0000-4000-8000-000000000001', 'Og denne?', ''))).kode, 'blokeret');
  await k.page.locator('.bsk-raekke').first().click();
  await k.page.waitForSelector('.bsk-laas');
  assert.match(await k.page.locator('.bsk-laas').innerText(), /lukket for nye beskeder/, 'køberen får ikke at vide, hvem der blokerede');
  await k.luk();
  // Fortryd
  await s.page.click('.bsk-menu summary');
  await s.page.click('[data-handling="fjern-blok"]');
  await s.page.waitForSelector('#bsk-svar');
  assert.strictEqual(bak.tilstand.tabeller.besked_blokeringer.length, 0);
  await s.luk();
});

test('flag TIL: ugyldigt input og XSS — brugertekst vises som tekst, aldrig som markup', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const bak = lavBackend({ annoncer: [ANN({ model: 'R45 <u>fed</u>' })] });
  const farlig = '<img src=x onerror="window.__xss=1"> <script>window.__xss=2</script> **hej**';
  await koeberSender(bak, farlig);
  const s = await side(bak, { som: 'saelger', sti: 'mine-annoncer.html?tab=beskeder' });
  await s.page.waitForSelector('.bsk-raekke');
  await s.page.locator('.bsk-raekke').first().click();
  await s.page.waitForSelector('.bsk-boble');
  assert.strictEqual(await s.page.locator('.bsk-boble img, .bsk-boble script, .bsk-raekke img, .bsk-traadtitel u, .bsk-raekke u').count(), 0, 'intet markup i beskeder eller titler');
  assert.match(await s.page.locator('.bsk-boble p').first().innerText(), /<img src=x onerror="window.__xss=1">/);
  assert.match(await s.page.locator('.bsk-traadtitel h3').innerText(), /R45 <u>fed<\/u>/);
  assert.strictEqual(await s.page.evaluate(() => window.__xss), undefined);
  await ingenNul(s.page, 'indbakke med farlig tekst');
  // Svar med linjeskift og tegn bevares
  await s.page.fill('#bsk-svar-tekst', 'Linje 1\n\n\n\nLinje 2 — æøå');
  await s.page.click('#bsk-svar-send');
  await s.page.waitForFunction(() => document.querySelectorAll('.bsk-boble').length === 2);
  assert.strictEqual(bak.tilstand.tabeller.beskeder[1].tekst, 'Linje 1\n\nLinje 2 — æøå', 'tekst normaliseres som i databasen');
  await s.luk();
});

test('flag TIL: tom indbakke, fejltilstand med "Prøv igen", loading-tilstand og mailvalg', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const bak = lavBackend({ annoncer: [ANN()] });
  const o = await side(bak, { som: 'koeber2', sti: 'mine-annoncer.html?tab=beskeder' });
  await o.page.waitForSelector('.bsk-tom');
  assert.match(await o.page.locator('.bsk-tom').innerText(), /Ingen beskeder endnu[\s\S]*Søg motorcykler/);
  assert.match(await o.page.locator('.bsk-valg').innerText(), /Vælg en samtale/);
  await skaerm(o.page, 'flagtil-tom-1280-lys');
  // Mailvalg
  assert.strictEqual(await o.page.locator('#bsk-mail').isChecked(), true, 'mail er til som standard');
  await o.page.uncheck('#bsk-mail');
  await o.page.waitForFunction(() => document.querySelector('#bsk-mail') && !document.querySelector('#bsk-mail').disabled);
  assert.strictEqual(bak.tilstand.tabeller.besked_indstillinger[0].mail_ved_ny_besked, false);
  await o.luk();
  // Fejl ved hentning af indbakken
  bak.tilstand.fejl['POST rpc/mine_samtaler'] = { status: 500, besked: 'mock-fejl' };
  const f = await side(bak, { som: 'koeber', sti: 'mine-annoncer.html?tab=beskeder' });
  await f.page.waitForSelector('.bsk-tom[role="alert"]');
  assert.match(await f.page.locator('.bsk-tom').innerText(), /Vi kunne ikke hente dine beskeder\. Det er ikke ensbetydende med, at du ingen har/);
  await skaerm(f.page, 'flagtil-fejl-1280-lys');
  await f.page.click('[data-handling="proev-liste"]');
  await f.page.waitForSelector('.bsk-tom h3');
  assert.match(await f.page.locator('.bsk-tom h3').innerText(), /Ingen beskeder endnu/);
  await f.luk();
});

/* =================== Mobil, lys og mørk =================== */

for (const [bredde, hoejde] of [[375, 812], [430, 932]]){
  for (const tema of ['lys', 'moerk']){
    test(`flag TIL ${bredde} px ${tema}: formular og indbakke uden overflow; liste -> tråd -> tilbage; tryk-mål og skriftstørrelse`, { timeout: 120000 }, async t => {
      if (!kan.ok) return t.skip(kan.grund);
      const bak = lavBackend({ annoncer: [ANN()] });
      const vp = { width: bredde, height: hoejde };
      const k = await side(bak, { som: 'koeber', viewport: vp, tema, sti: annonceSti() });
      await k.page.waitForSelector('#besked-form');
      assert.ok(await overflow(k.page) <= 0, 'ingen vandret overflow på annoncen');
      const felt = await k.page.locator('#besked-tekst').evaluate(e => ({ fs: parseFloat(getComputedStyle(e).fontSize), h: e.getBoundingClientRect().height }));
      assert.ok(felt.fs >= 16, `tekstfeltet er mindst 16 px (ellers zoomer iOS ind): ${felt.fs}`);
      for (const sel of ['#besked-send', '.besked-starter']){
        const hh = await k.page.locator(sel).first().evaluate(e => e.getBoundingClientRect().height);
        assert.ok(hh >= 36, `${sel} er mindst 36 px højt: ${hh}`);
      }
      assert.ok((await k.page.locator('#besked-send').evaluate(e => e.getBoundingClientRect().height)) >= 44, 'Send-knappen er mindst 44 px');
      await skrivOgSend(k, 'Hej, kan jeg komme forbi og se den i weekenden?');
      await k.page.waitForSelector('.besked-ok');
      await k.page.locator('.an-seller-wrap').first().scrollIntoViewIfNeeded();
      await skaerm(k.page, `flagtil-formular-${bredde}-${tema}`, '.an-seller-wrap');
      await k.luk();

      const s = await side(bak, { som: 'saelger', viewport: vp, tema, sti: 'mine-annoncer.html?tab=beskeder' });
      await s.page.waitForSelector('.bsk-raekke');
      assert.ok(await s.page.locator('.bsk-traad').isHidden(), 'på mobil vises listen alene');
      assert.ok(await overflow(s.page) <= 0, 'ingen vandret overflow i indbakken');
      assert.ok(await s.page.locator('.mobile-profile .bb-badge').isVisible(), 'badgen sidder på mobilprofilen');
      await skaerm(s.page, `flagtil-indbakke-${bredde}-${tema}`);
      await s.page.locator('.bsk-raekke').first().click();
      await s.page.waitForSelector('.bsk-boble');
      assert.ok(await s.page.locator('.bsk-lister').isHidden(), 'på mobil vises tråden alene');
      assert.ok(await s.page.locator('.bsk-tilbage').isVisible());
      assert.ok((await s.page.locator('.bsk-tilbage').evaluate(e => e.getBoundingClientRect().width)) >= 44);
      const svar = await s.page.locator('#bsk-svar-tekst').evaluate(e => parseFloat(getComputedStyle(e).fontSize));
      assert.ok(svar >= 16, `svarfeltet er mindst 16 px: ${svar}`);
      assert.ok(await overflow(s.page) <= 0, 'ingen vandret overflow i tråden');
      await skaerm(s.page, `flagtil-traad-${bredde}-${tema}`);
      await s.page.click('.bsk-tilbage');
      await s.page.waitForSelector('.bsk-lister', { state: 'visible' });
      assert.ok(await s.page.locator('.bsk-traad').isHidden());
      assert.strictEqual(await s.page.evaluate(() => document.activeElement.className), 'bsk-raekke', 'fokus lander på listen');
      await ingenNul(s.page, 'indbakke mobil');
      assert.deepStrictEqual(s.fund.side.concat(s.fund.konsol), []);
      await s.luk();
    });
  }
}

test('flag TIL, mørk 1440 og 1920: formular og tråd (kontrast og layout)', { timeout: 120000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const bak = lavBackend({ annoncer: [ANN()] });
  for (const bredde of [1440, 1920]){
    const k = await side(bak, { som: 'koeber', viewport: { width: bredde, height: 1000 }, tema: 'moerk', sti: annonceSti() });
    await k.page.waitForSelector('#besked-form, #besked-aabn');
    assert.ok(await overflow(k.page) <= 0);
    await skaerm(k.page, `flagtil-annonce-${bredde}-moerk`, '.an-seller-wrap');
    if (bredde === 1440 && await k.page.locator('#besked-form').count()){ await skrivOgSend(k, 'Hej, hvad er laveste pris?'); await k.page.waitForSelector('.besked-ok'); }
    await k.luk();
    const s = await side(bak, { som: 'saelger', viewport: { width: bredde, height: 1000 }, tema: 'moerk', sti: 'mine-annoncer.html?tab=beskeder' });
    await s.page.waitForSelector('.bsk-raekke');
    await s.page.locator('.bsk-raekke').first().click();
    await s.page.waitForSelector('.bsk-boble');
    assert.ok(await overflow(s.page) <= 0);
    await skaerm(s.page, `flagtil-traad-${bredde}-moerk`);
    await s.luk();
  }
});

test('flag TIL: annoncesidens CLS bliver lille, når formularen lander (pladsen er reserveret)', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const bak = lavBackend({ annoncer: [ANN()] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await bak.installer(ctx, { tema: 'lys', som: 'koeber' });
  await ctx.addInitScript(() => {
    window.BB_FLAGS = { beskeder: true };
    window.__cls = 0;
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  const page = await ctx.newPage();
  await page.goto(URL(annonceSti()), { waitUntil: 'networkidle' });
  await page.waitForSelector('#besked-form');
  await page.waitForTimeout(800);
  const cls = await page.evaluate(() => window.__cls);
  console.log('# CLS annonce flag TIL (ny køber, formular):', cls.toFixed(4));
  assert.ok(cls < 0.05, `CLS ${cls}`);
  // Og for en køber, der allerede har skrevet ("du har allerede skrevet" er lavere end formularen).
  await page.fill('#besked-tekst', 'Hej, er den til salg?');
  await page.click('#besked-send');
  await page.waitForSelector('.besked-ok');
  await page.evaluate(() => { window.__cls = 0; });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#besked-aabn');
  await page.waitForTimeout(600);
  const cls2 = await page.evaluate(() => window.__cls);
  console.log('# CLS annonce flag TIL (har allerede skrevet):', cls2.toFixed(4));
  assert.ok(cls2 < 0.1, `CLS ${cls2}`);
  await ctx.close();
});
