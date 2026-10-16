/* W9 sælger: ende-til-ende i rigtig browser mod LOKAL mock (scripts/w9-saelger-mock.js).
   Opret annonce (alle trin, tilbage, kladde, billeder, backend-fejl), redigering, mine annoncer, favoritter, login.
   Ingen produktion, ingen rigtige konti. Uden Playwright/Chromium springes testene over med en tydelig besked.
   Acceptkriterier (K1..K10): docs/review/gauntlet/builder-w9-saelger.md */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const sb = require('../scripts/smoke-browser');
const { lavBackend, lavPng, BRUGER_ID } = require('../scripts/w9-saelger-mock');

let kan, server, port, browser;
const URL = s => `http://127.0.0.1:${port}/${s}`;
const SKAERM = process.env.W9_SKAERM || '';   // sæt til en mappe udenfor repoet for at gemme screenshots

test.before(async () => {
  kan = await sb.playwrightTilgaengelig();
  if (!kan.ok){ console.log(`# w9-saelger.test: SKIPPER browsertestene (${kan.grund})`); return; }
  ({ server, port } = await sb.startServer(path.join(__dirname, '..')));
  browser = await kan.pw.chromium.launch();
});
test.after(async () => { if (browser) await browser.close(); if (server) server.close(); });

/* Ny side med mock. opts: { loggetInd, annoncer, viewport, tema, forhandler } */
async function aabn(opts = {}, sti){
  const bak = lavBackend(opts);
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 900 }, acceptDownloads: false });
  await bak.installer(ctx, { tema: opts.tema || 'lys' });
  const page = await ctx.newPage();
  const fund = { konsol: [], side: [], dialoger: [] };
  page.on('pageerror', e => fund.side.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/blockedbyclient|Failed to load resource/.test(m.text())) fund.konsol.push(m.text()); });
  page.on('dialog', d => { fund.dialoger.push(d.message()); d.accept(); });
  if (sti) await page.goto(URL(sti), { waitUntil: 'networkidle' });
  return { bak, ctx, page, fund, t: bak.tilstand, luk: () => ctx.close() };
}
const skaerm = async (page, navn) => { if (SKAERM) await page.screenshot({ path: path.join(SKAERM, navn + '.png') }); };
const tekstPaaSiden = page => page.evaluate(() => document.body.innerText);
const ingenNul = async (page, hvor) => {
  const tekst = await tekstPaaSiden(page);
  const m = tekst.match(/\b(null|undefined|NaN)\b|\[object Object\]/);
  assert.ok(!m, `${hvor}: "${m && m[0]}" i synlig tekst`);
};
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const TESTBIL = { type: 'naked', brand: 'Yamaha', model: 'MT-07', year: '2021', km: '12500', ccm: '689', power: '74', price: '69900', postnr: '8000', desc: 'Velholdt MT-07 med servicehistorik, nye dæk og ekstra lygter. Sælges fordi jeg skal have større cykel.' };

async function udfylSide1(page, d = TESTBIL){
  await page.check(`input[name="bike-type"][value="${d.type}"]`, { force: true });
  await page.selectOption('#f-brand', d.brand);
  await page.fill('#f-model', d.model);
  await page.fill('#f-year', d.year);
  await page.fill('#f-km', d.km);
  await page.fill('#f-ccm', d.ccm);
  if (d.power) await page.fill('#f-power', d.power);
  await page.fill('#f-price', d.price);
  await page.selectOption('#f-condition', { index: 1 });
  await page.fill('#f-postnr', d.postnr);
  await page.waitForSelector('#postnr-list [role="option"], #postnr-list li, #postnr-list button', { timeout: 3000 }).catch(() => {});
  const valg = page.locator('#postnr-list [role="option"], #postnr-list li, #postnr-list button').first();
  if (await valg.count()) await valg.click();
  await page.fill('#f-desc', d.desc);
}
const trin = page => page.evaluate(() => (document.querySelector('.form-step.active, .form-step[data-active="true"]') || {}).dataset?.step || null);
const naeste = page => page.click('#step-next');
async function vaelgBilleder(page, antal, bredde = 640){
  const filer = Array.from({ length: antal }, (_, i) => ({ name: `foto-${i + 1}.png`, mimeType: 'image/png', buffer: lavPng(bredde, Math.round(bredde * 0.75), [150 + i * 20, 80, 40]) }));
  await page.setInputFiles('#photo-input', filer);
}

/* ---------------- K1 Opret annonce, hele vejen ---------------- */

test('K1a/K1c Opret: side 1+2 → billeder → gennemse → udgiv giver 1 annonce med fotos', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html');
  try {
    await udfylSide1(s.page);
    await skaerm(s.page, 'k1-side1');
    await naeste(s.page);
    await s.page.waitForSelector('#op-photos', { state: 'visible' });
    await vaelgBilleder(s.page, 3);
    await s.page.waitForFunction(() => document.querySelectorAll('#photo-grid img').length >= 3);
    await skaerm(s.page, 'k1-billeder');
    await naeste(s.page);                                  // gennemse
    await s.page.check('#f-terms');
    await skaerm(s.page, 'k1-gennemse');
    await Promise.all([s.page.waitForURL(/annonce\.html\?id=/, { timeout: 15000 }), s.page.click('#step-next')]);
    const L = s.t.tabeller.listings;
    assert.strictEqual(L.length, 1, 'præcis én annonce');
    assert.strictEqual(L[0].brand, 'Yamaha'); assert.strictEqual(L[0].model, 'MT-07');
    assert.strictEqual(L[0].price, 69900); assert.strictEqual(L[0].year, 2021);
    assert.strictEqual(String(L[0].postnr), '8000');
    assert.deepStrictEqual(L[0].photos.map(p => p.position).sort(), [0, 1, 2]);
    assert.strictEqual(s.t.uploads.length, 3, '3 filer i storage');
    assert.ok(s.t.uploads.every(u => /image\/(webp|jpeg)/.test(u.type)), 'uploadet som webp/jpeg (resize, ikke original png): ' + s.t.uploads.map(u => u.type));
    assert.deepStrictEqual(s.fund.side, []);
  } finally { await s.luk(); }
});

test('K1b Dobbeltklik på Udgiv giver ÉN annonce', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html');
  try {
    await udfylSide1(s.page); await naeste(s.page);
    await vaelgBilleder(s.page, 1); await naeste(s.page);
    await s.page.check('#f-terms');
    await s.page.dblclick('#step-next');
    await s.page.waitForFunction(() => /annonce\.html/.test(location.href), null, { timeout: 15000 }).catch(() => {});
    await s.page.waitForTimeout(1500);
    assert.strictEqual(s.t.log.filter(l => l.metode === 'POST' && l.tabel === 'listings').length, 1, 'kun ét POST');
    assert.strictEqual(s.t.tabeller.listings.length, 1);
  } finally { await s.luk(); }
});

test('K1d Live-forhåndsvisningen viser det valgte forsidebillede', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html');
  try {
    await udfylSide1(s.page); await naeste(s.page);
    await vaelgBilleder(s.page, 2);
    await s.page.waitForSelector('#op-live-card img[src^="blob:"]', { timeout: 3000 });
    const tekst = await s.page.locator('#op-live-card').innerText();
    assert.ok(!/Ingen fotos/.test(tekst), 'kortet siger "Ingen fotos" trods valgte billeder');
    assert.ok(/Yamaha MT-07/.test(tekst) && /69\.900/.test(tekst));
  } finally { await s.luk(); }
});

/* ---------------- K2 Tilbage / fortryd / kladde ---------------- */

test('K2a Tilbage fra gennemse og billeder bevarer felter og billeder; fjern + forsidebillede virker', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html');
  try {
    await udfylSide1(s.page); await naeste(s.page);
    await vaelgBilleder(s.page, 3);
    await s.page.waitForFunction(() => document.querySelectorAll('#photo-grid .photo-thumb').length === 3);
    // fjern andet billede
    await s.page.locator('#photo-grid [data-remove="1"]').click();
    assert.strictEqual(await s.page.locator('#photo-grid .photo-thumb').count(), 2);
    // sæt sidste som forside
    await s.page.locator('#photo-grid [data-cover="1"]').click();
    await naeste(s.page);                                       // gennemse
    assert.match(await s.page.locator('#preview-details').innerText(), /Velholdt MT-07/);
    await s.page.click('#step-back');                           // → billeder
    assert.strictEqual(await s.page.locator('#photo-grid .photo-thumb').count(), 2, 'billeder bevaret efter Tilbage');
    await s.page.click('#step-back');                           // → side 1
    assert.strictEqual(await s.page.inputValue('#f-model'), 'MT-07');
    assert.strictEqual(await s.page.inputValue('#f-price'), '69900');
    assert.strictEqual(await s.page.inputValue('#f-desc'), TESTBIL.desc);
    assert.strictEqual(s.t.log.filter(l => l.metode === 'POST').length, 0, 'intet skrevet til backend ved Tilbage');
    assert.deepStrictEqual(s.fund.side, []);
  } finally { await s.luk(); }
});

test('K2b Gem kladde + genindlæs gendanner felterne og siger at billeder skal vælges igen', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html');
  try {
    await s.page.check('input[name="bike-type"][value="cruiser"]', { force: true });
    await s.page.selectOption('#f-brand', 'Honda');
    await s.page.fill('#f-model', 'Shadow');
    await s.page.fill('#f-km', '4200');
    await s.page.click('#save-draft');
    await s.page.reload({ waitUntil: 'networkidle' });
    assert.strictEqual(await s.page.inputValue('#f-model'), 'Shadow');
    assert.strictEqual(await s.page.inputValue('#f-km'), '4200');
    assert.strictEqual(await s.page.inputValue('#f-brand'), 'Honda');
    assert.match(await tekstPaaSiden(s.page), /kladde er hentet frem — billeder skal vælges igen/);
  } finally { await s.luk(); }
});

test('K2c Udlogget: Fortsæt gemmer kladde og sender til login; efter login er felterne der igen', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: false }, 'opret-annonce.html');
  try {
    await udfylSide1(s.page);
    await naeste(s.page);
    await s.page.waitForURL(/login\.html\?redirect=opret-annonce/, { timeout: 8000 });
    await s.page.click('[data-auth-tab="login"]:visible');
    await s.page.fill('#login-email', 'test.saelger@example.test');
    await s.page.fill('#login-password', 'testkode-123');
    await s.page.click('#login-form button[type="submit"], #login-submit');
    await s.page.waitForURL(/opret-annonce\.html/, { timeout: 10000 });
    await s.page.waitForSelector('#op-photos', { state: 'visible', timeout: 5000 });   // lander direkte på billeder (trin 3)
    await s.page.click('#step-back');
    assert.strictEqual(await s.page.inputValue('#f-model'), 'MT-07');
    assert.strictEqual(s.t.tabeller.listings.length, 0, 'intet oprettet før Udgiv');
  } finally { await s.luk(); }
});

/* ---------------- K3 Fejl fra backend ---------------- */

async function tilGennemse(s, antalBilleder = 2){
  await udfylSide1(s.page); await naeste(s.page);
  if (antalBilleder) await vaelgBilleder(s.page, antalBilleder);
  await naeste(s.page);
  await s.page.check('#f-terms');
}
const synligFejl = page => page.evaluate(() => {
  const sel = '[role="alert"], [aria-live="assertive"], [aria-live="polite"], .toast, .toast-error';
  return [...document.querySelectorAll(sel)].map(e => e.innerText.trim()).filter(Boolean).join(' | ');
});

test('K3a POST listings 500: synlig fejl, knap genaktiveret, intet tabt, nyt forsøg giver præcis én annonce', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html');
  try {
    await tilGennemse(s, 2);
    s.t.fejl['POST listings'] = { status: 500, besked: 'internal error' };
    await s.page.click('#step-next');
    await s.page.waitForFunction(() => /kunne ikke gemmes/i.test(document.body.innerText), null, { timeout: 8000 });
    assert.match(await synligFejl(s.page), /kunne ikke gemmes/i, 'fejlen ligger i en aria-live-region');
    assert.strictEqual(await s.page.locator('#step-next').isDisabled(), false, 'Udgiv er aktiv igen');
    assert.strictEqual(await s.page.locator('#step-next').innerText(), 'Udgiv annonce');
    assert.strictEqual(s.t.tabeller.listings.length, 0);
    await ingenNul(s.page, 'efter 500');
    // intet tabt: tilbage til billeder, de ligger der stadig
    await s.page.click('#step-back');
    assert.strictEqual(await s.page.locator('#photo-grid .photo-thumb').count(), 2);
    await naeste(s.page); await s.page.check('#f-terms');
    await Promise.all([s.page.waitForURL(/annonce\.html\?id=/, { timeout: 15000 }), s.page.click('#step-next')]);
    assert.strictEqual(s.t.tabeller.listings.length, 1, 'præcis én annonce efter nyt forsøg');
    assert.strictEqual(s.t.tabeller.listings[0].photos.length, 2);
  } finally { await s.luk(); }
});

test('K3b Foto-upload fejler: annoncen oprettes, og sælgeren får at vide hvilket billede og hvad der kan gøres', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html');
  try {
    await tilGennemse(s, 2);
    s.t.fejl['POST storage'] = { status: 500, besked: 'storage nede', gentag: true };
    await s.page.click('#step-next');
    await s.page.waitForFunction(() => /kunne ikke uploades/i.test(document.body.innerText), null, { timeout: 10000 });
    const txt = await synligFejl(s.page);
    assert.match(txt, /2 af 2 billeder kunne ikke uploades/);
    assert.match(txt, /Rediger annonce/);
    assert.ok(!/udgivet!/i.test(txt), 'ingen ren succesmelding');
    assert.strictEqual(s.t.tabeller.listings.length, 1);
    assert.strictEqual(s.t.tabeller.listings[0].photos.length, 0);
  } finally { await s.luk(); }
});

test('K3c Netværket forsvinder midt i udgivelsen: fejl vises, ingen hængende "Udgiver…"', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html');
  try {
    await tilGennemse(s, 0);
    await s.ctx.route('**/rest/v1/listings**', r => r.request().method() === 'POST' ? r.abort('connectionfailed') : r.fallback());
    await s.page.click('#step-next');
    await s.page.waitForFunction(() => /kunne ikke gemmes/i.test(document.body.innerText), null, { timeout: 8000 });
    assert.strictEqual(await s.page.locator('#step-next').innerText(), 'Udgiv annonce');
    assert.ok(!/Failed to fetch|TypeError|undefined/.test(await tekstPaaSiden(s.page)), 'ingen rå teknisk fejltekst');
    assert.deepStrictEqual(s.fund.side, []);
  } finally { await s.luk(); }
});

/* ---------------- K4 Billedhåndtering ---------------- */

test('K4a Ikke-billede, for stor fil og for mange filer afvises med besked om hvad og hvor mange', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html');
  try {
    await udfylSide1(s.page); await naeste(s.page);
    const filer = [
      { name: 'regnskab.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') },
      { name: 'kaempe.png', mimeType: 'image/png', buffer: Buffer.concat([lavPng(8, 8), Buffer.alloc(13 * 1024 * 1024)]) },
      ...Array.from({ length: 13 }, (_, i) => ({ name: `f${i}.png`, mimeType: 'image/png', buffer: lavPng(32, 24, [100 + i * 5, 60, 30]) })),
    ];
    await s.page.setInputFiles('#photo-input', filer);
    await s.page.waitForFunction(() => document.querySelectorAll('#photo-grid .photo-thumb').length >= 12);
    const txt = await tekstPaaSiden(s.page);
    assert.strictEqual(await s.page.locator('#photo-grid .photo-thumb').count(), 12, 'højst 12 billeder');
    assert.match(txt, /1 billede kom ikke med/);
    assert.match(txt, /kaempe\.png.*for stor/);
    assert.match(txt, /1 fil er ikke et billede/);
  } finally { await s.luk(); }
});

test('K4b Ødelagt billedfil (ikke afkodbar) fjernes igen med besked, før Udgiv', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html');
  try {
    await udfylSide1(s.page); await naeste(s.page);
    await s.page.setInputFiles('#photo-input', [{ name: 'skadet.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('ikke et billede') }]);
    await s.page.waitForFunction(() => /kan ikke læses/.test(document.body.innerText), null, { timeout: 5000 });
    assert.strictEqual(await s.page.locator('#photo-grid .photo-thumb').count(), 0);
  } finally { await s.luk(); }
});

/* ---------------- K5 Redigering ---------------- */

const FOTO = (id, pos) => ({ id, storage_path: `${BRUGER_ID}/x/${id}.webp`, position: pos });

test('K5a Rediger aktiv annonce: forudfyldt, PATCH ikke POST, gammelt billede bevaret, ét fjernet', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const ann = { id: '11111111-1111-4111-8111-111111111111', photos: [FOTO('f1', 0), FOTO('f2', 1)] };
  const s = await aabn({ loggetInd: true, annoncer: [ann] }, `opret-annonce.html?rediger=${ann.id}`);
  try {
    assert.strictEqual(await s.page.inputValue('#f-model'), 'MT-07');
    assert.strictEqual(await s.page.inputValue('#f-price'), '69900');
    assert.strictEqual(await s.page.locator('#photo-grid .photo-thumb').count(), 2);
    await s.page.fill('#f-price', '64900');
    await naeste(s.page);                                            // → billeder
    await s.page.locator('[data-remove-existing="f2"]').click();     // confirm accepteres af dialog-handler
    await naeste(s.page);
    await s.page.check('#f-terms');
    await Promise.all([s.page.waitForURL(/annonce\.html\?id=/, { timeout: 15000 }), s.page.click('#step-next')]);
    assert.strictEqual(s.t.tabeller.listings.length, 1, 'ingen dublet');
    assert.strictEqual(s.t.tabeller.listings[0].price, 64900);
    assert.deepStrictEqual(s.t.tabeller.listings[0].photos.map(p => p.id), ['f1']);
    assert.strictEqual(s.t.log.filter(l => l.metode === 'POST' && l.tabel === 'listings').length, 0, 'ingen POST ved redigering');
    assert.strictEqual(s.t.log.filter(l => l.metode === 'PATCH' && l.tabel === 'listings').length, 1);
  } finally { await s.luk(); }
});

test('K5b En annonce på pause (hidden) kan redigeres', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const ann = { id: '22222222-2222-4222-8222-222222222222', status: 'hidden', photos: [FOTO('g1', 0)] };
  const s = await aabn({ loggetInd: true, annoncer: [ann] }, `opret-annonce.html?rediger=${ann.id}`);
  try {
    await s.page.waitForFunction(() => /Rediger annonce/.test(document.querySelector('.op-hero h1')?.textContent || '') || /mine-annoncer/.test(location.href), null, { timeout: 6000 });
    assert.match(await s.page.locator('.op-hero h1').innerText(), /Rediger annonce/, 'pausede annoncer åbner i redigering');
    assert.strictEqual(await s.page.inputValue('#f-model'), 'MT-07');
    await s.page.fill('#f-price', '59900');
    await naeste(s.page); await naeste(s.page); await s.page.check('#f-terms');
    await Promise.all([s.page.waitForURL(/mine-annoncer\.html/, { timeout: 15000 }), s.page.click('#step-next')]);   // ikke til en offentlig side, annoncen ikke har
    assert.strictEqual(s.t.tabeller.listings[0].price, 59900);
    assert.strictEqual(s.t.tabeller.listings[0].status, 'hidden', 'redigering ændrer ikke status');
  } finally { await s.luk(); }
});

test('K5c Fremmed/ukendt annonce afvises venligt og sender til Mine annoncer; PATCH-fejl efterlader annoncen uændret', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html?rediger=33333333-3333-4333-8333-333333333333');
  try {
    await s.page.waitForFunction(() => /mine-annoncer/.test(location.href), null, { timeout: 8000 });
  } finally { await s.luk(); }
  const ann = { id: '44444444-4444-4444-8444-444444444444' };
  const s2 = await aabn({ loggetInd: true, annoncer: [ann] }, `opret-annonce.html?rediger=${ann.id}`);
  try {
    await s2.page.fill('#f-price', '1000');
    await naeste(s2.page); await naeste(s2.page); await s2.page.check('#f-terms');
    s2.t.fejl['PATCH listings'] = { status: 500, besked: 'nede' };
    await s2.page.click('#step-next');
    await s2.page.waitForFunction(() => /kunne ikke gemmes/i.test(document.body.innerText), null, { timeout: 8000 });
    assert.strictEqual(s2.t.tabeller.listings[0].price, 69900, 'uændret');
    assert.strictEqual(await s2.page.locator('#step-next').innerText(), 'Gem ændringer');
  } finally { await s2.luk(); }
});
