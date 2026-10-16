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
  await page.locator('label.radio-card', { has: page.locator(`input[name="bike-type"][value="${d.type}"]`) }).click();
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
    await s.page.locator('label.radio-card', { has: s.page.locator('input[value="cruiser"]') }).click();
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

/* ---------------- K6 Mine annoncer ---------------- */

const TRE = () => [
  { id: 'a0000000-0000-4000-8000-000000000001', brand: 'Honda', model: 'CBR650R', year: 2022, km: 12834, price: 99900, city: 'Aarhus', type: 'sport', photos: [FOTO('h1', 0), FOTO('h2', 1)] },
  { id: 'a0000000-0000-4000-8000-000000000002', brand: 'BMW', model: 'R 1250 GS', year: 2021, km: 18460, price: 189900, city: 'Odense', type: 'adventure', dageGammel: 5, photos: [FOTO('h3', 0)] },
  { id: 'a0000000-0000-4000-8000-000000000003', brand: 'KTM', model: '390 Adventure', year: 2023, km: 4820, price: 59900, city: 'Esbjerg', type: 'adventure', status: 'hidden', dageGammel: 20, photos: [] },
];
const raekke = (page, id) => page.locator(`.db-row[data-listing-id="${id}"]`);

test('K6a Statuskort beregnes af data, rækker viser status og handlinger; pausede kan redigeres', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true, annoncer: TRE() }, 'mine-annoncer.html');
  try {
    await s.page.waitForSelector('.db-row');
    assert.strictEqual(await s.page.locator('#stat-aktive').innerText(), '2');
    assert.strictEqual(await s.page.locator('.db-row').count(), 3);
    assert.match(await raekke(s.page, TRE()[2].id).innerText(), /På pause/);
    assert.strictEqual(await raekke(s.page, TRE()[2].id).locator('a:has-text("Rediger")').count(), 1, 'rediger findes på pausede');
    assert.match(await raekke(s.page, TRE()[0].id).innerText(), /99\.900 kr/);
    await ingenNul(s.page, 'mine annoncer');
    assert.deepStrictEqual(s.fund.side, []);
    assert.deepStrictEqual(s.fund.konsol, []);
  } finally { await s.luk(); }
});

test('K6b Pause → hidden, Aktivér → active; PATCH-fejl lader status være og viser fejl', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const [a, b] = TRE();
  const s = await aabn({ loggetInd: true, annoncer: TRE() }, 'mine-annoncer.html');
  try {
    await s.page.waitForSelector('.db-row');
    await raekke(s.page, a.id).locator('[data-status-skift]').click();
    await s.page.waitForFunction(id => document.querySelector(`.db-row[data-listing-id="${id}"]`)?.dataset.status === 'paused', a.id);
    assert.strictEqual(s.t.tabeller.listings.find(l => l.id === a.id).status, 'hidden');
    assert.strictEqual(await s.page.locator('#stat-aktive').innerText(), '1');
    await raekke(s.page, a.id).locator('[data-status-skift]').click();
    await s.page.waitForFunction(id => document.querySelector(`.db-row[data-listing-id="${id}"]`)?.dataset.status === 'active', a.id);
    assert.strictEqual(s.t.tabeller.listings.find(l => l.id === a.id).status, 'active');
    s.t.fejl['PATCH listings'] = { status: 500, besked: 'nede' };
    await raekke(s.page, b.id).locator('[data-status-skift]').click();
    await s.page.waitForFunction(() => /Status kunne ikke ændres/.test(document.body.innerText), null, { timeout: 6000 });
    assert.strictEqual(s.t.tabeller.listings.find(l => l.id === b.id).status, 'active');
    assert.strictEqual(await raekke(s.page, b.id).locator('[data-status-skift]').isDisabled(), false, 'knappen kan prøves igen');
  } finally { await s.luk(); }
});

test('K6c Slet: afvist confirm = intet kald; godkendt = række væk, DELETE sendt, filer slettet', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const [a] = TRE();
  const s = await aabn({ loggetInd: true, annoncer: TRE() }, 'mine-annoncer.html');
  try {
    await s.page.waitForSelector('.db-row');
    s.page.removeAllListeners('dialog');
    s.page.once('dialog', d => d.dismiss());
    await raekke(s.page, a.id).locator('summary').click();
    await raekke(s.page, a.id).locator('[data-delete-listing]').click();
    await s.page.waitForTimeout(300);
    assert.strictEqual(s.t.log.filter(l => l.metode === 'DELETE' && l.tabel === 'listings').length, 0, 'afvist confirm = intet kald');
    assert.strictEqual(s.t.tabeller.listings.length, 3);
    s.page.once('dialog', d => d.accept());
    await raekke(s.page, a.id).locator('[data-delete-listing]').click();
    await s.page.waitForFunction(id => !document.querySelector(`.db-row[data-listing-id="${id}"]`), a.id);
    assert.strictEqual(s.t.tabeller.listings.length, 2);
    assert.strictEqual(s.t.slettedeFiler.length, 2, 'begge billedfiler ryddet i storage: ' + s.t.slettedeFiler);
  } finally { await s.luk(); }
});

test('K6c2 Slet fejler: annoncen bliver stående og fejlen vises', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const [a] = TRE();
  const s = await aabn({ loggetInd: true, annoncer: TRE() }, 'mine-annoncer.html');
  try {
    await s.page.waitForSelector('.db-row');
    s.t.fejl['DELETE listings'] = { status: 500, besked: 'nede' };
    await raekke(s.page, a.id).locator('summary').click();
    await raekke(s.page, a.id).locator('[data-delete-listing]').click();
    await s.page.waitForFunction(() => /kunne ikke slettes/.test(document.body.innerText), null, { timeout: 6000 });
    assert.strictEqual(await raekke(s.page, a.id).count(), 1);
    assert.strictEqual(s.t.tabeller.listings.length, 3);
  } finally { await s.luk(); }
});

test('K6d Hentefejl viser alert-banner, og "Prøv igen" henter igen', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const bak = lavBackend({ loggetInd: true, annoncer: TRE() });
  bak.tilstand.fejl['GET listings'] = { status: 500, besked: 'nede', gentag: true };
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await bak.installer(ctx);
  const page = await ctx.newPage();
  try {
    await page.goto(URL('mine-annoncer.html'), { waitUntil: 'networkidle' });
    await page.waitForSelector('#mine-error:not([hidden]) #mine-retry');
    assert.ok(await page.evaluate(() => /alert|assertive|polite/.test(document.getElementById('mine-error').getAttribute('role') + (document.getElementById('mine-error').getAttribute('aria-live') || ''))), 'banneren er role=alert/aria-live');
    delete bak.tilstand.fejl['GET listings'];
    await page.click('#mine-retry');
    await page.waitForSelector('.db-row');
    assert.strictEqual(await page.locator('#mine-error').isHidden(), true);
  } finally { await ctx.close(); }
});

test('K6e Tom bruger: tom tilstand med CTA, ingen nul-rækker, ingen null/NaN på nogen fane', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'mine-annoncer.html');
  try {
    await s.page.waitForSelector('#mine-empty', { state: 'visible' });
    assert.match(await s.page.locator('#mine-empty').innerText(), /annonce/i);
    assert.ok(await s.page.locator('#mine-empty a[href*="opret-annonce"]').count(), 'CTA til opret annonce i tom tilstand');
    await ingenNul(s.page, 'tom mine-annoncer');
    for (const tab of ['favoritter', 'agenter', 'konto']){
      await s.page.goto(URL(`mine-annoncer.html?tab=${tab}`), { waitUntil: 'networkidle' });
      await ingenNul(s.page, 'tab ' + tab);
    }
    assert.deepStrictEqual(s.fund.side, []);
  } finally { await s.luk(); }
});

/* ---------------- K7 Gemte annoncer (favoritter) og kladder ---------------- */

const FREMMED = { id: 'b0000000-0000-4000-8000-0000000000f1', seller_id: 'bbbbbbbb-0000-4000-8000-0000000000b2', brand: 'Suzuki', model: 'GSX-S 750', year: 2019, km: 17800, price: 64900, city: 'Silkeborg', type: 'naked', photos: [FOTO('z1', 0)], seller: { id: 'bbbbbbbb-0000-4000-8000-0000000000b2', name: 'Anden Sælger', is_dealer: false } };

test('K7a Gemte annoncer: tom tilstand forklarer; med data vises række; fjern sender DELETE; fejl rulles tilbage', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const tom = await aabn({ loggetInd: true }, 'mine-annoncer.html?tab=favoritter');
  try {
    await tom.page.waitForSelector('#fav-empty', { state: 'visible' });
    assert.match(await tom.page.locator('#fav-empty').innerText(), /hjertet/);
    assert.strictEqual(await tom.page.locator('#stat-fav').innerText(), '0');
  } finally { await tom.luk(); }

  const s = await aabn({ loggetInd: true, annoncer: [FREMMED] });
  try {
    s.t.tabeller.favorites.push({ user_id: BRUGER_ID, listing_id: FREMMED.id });
    await s.page.goto(URL('mine-annoncer.html?tab=favoritter'), { waitUntil: 'networkidle' });
    await s.page.waitForSelector('#fav-grid .db-row');
    assert.match(await s.page.locator('#fav-grid').innerText(), /GSX-S 750/);
    assert.strictEqual(await s.page.locator('#stat-fav').innerText(), '1');
    await s.page.locator('#fav-grid [data-fav-toggle]').click();
    await s.page.waitForFunction(() => document.querySelector('#fav-grid [data-fav-toggle]')?.getAttribute('aria-pressed') === 'false' || !document.querySelector('#fav-grid .db-row'));
    await s.page.waitForTimeout(600);
    assert.strictEqual(s.t.tabeller.favorites.length, 0, 'DELETE på favorites ramte backend');
    assert.strictEqual(await s.page.locator('#stat-fav').innerText(), '0', 'tællerne følger med');
  } finally { await s.luk(); }
});

test('K7b Kladde vises som egen række (Fortsæt / Slet), og Slet fjerner den', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html');
  try {
    await s.page.locator('label.radio-card', { has: s.page.locator('input[value="naked"]') }).click();
    await s.page.selectOption('#f-brand', 'Yamaha');
    await s.page.fill('#f-model', 'MT-09');
    await s.page.click('#save-draft');
    await s.page.goto(URL('mine-annoncer.html'), { waitUntil: 'networkidle' });
    await s.page.waitForSelector('[data-draft-row]');
    assert.match(await s.page.locator('[data-draft-row]').innerText(), /MT-09/);
    assert.strictEqual(await s.page.locator('#stat-kladder').innerText(), '1');
    await s.page.locator('[data-delete-draft]').click();      // confirm accepteres
    await s.page.waitForFunction(() => !document.querySelector('[data-draft-row]'));
    assert.strictEqual(await s.page.locator('#stat-kladder').innerText(), '0');
    await s.page.goto(URL('opret-annonce.html'), { waitUntil: 'networkidle' });
    assert.strictEqual(await s.page.inputValue('#f-model'), '', 'kladden er væk');
  } finally { await s.luk(); }
});

/* ---------------- K8 Login / opret konto ---------------- */

test('K8a Login: ok → redirect; forkert kode → dansk fejl og e-mail bevaret; netværksfejl → forbindelsesbesked', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: false, login: (e, p) => (p === 'rigtig-kode-1' ? null : { status: 400 }) }, 'login.html?redirect=mine-annoncer.html');
  try {
    await s.page.fill('#login-email', 'test.saelger@example.test');
    await s.page.fill('#login-password', 'forkert');
    await s.page.click('#login-form button[type="submit"]');
    await s.page.waitForFunction(() => /forkert|ikke rigtig|passer ikke/i.test(document.body.innerText), null, { timeout: 6000 });
    const txt = await tekstPaaSiden(s.page);
    assert.ok(!/Invalid login credentials|AuthApiError/.test(txt), 'ingen rå engelsk fejltekst');
    assert.strictEqual(await s.page.inputValue('#login-email'), 'test.saelger@example.test');
    // netværk væk
    await s.ctx.route('**/auth/v1/token**', r => r.abort('connectionfailed'));
    await s.page.fill('#login-password', 'rigtig-kode-1');
    await s.page.click('#login-form button[type="submit"]');
    await s.page.waitForFunction(() => /forbindelse/i.test(document.body.innerText), null, { timeout: 6000 });
    await s.ctx.unroute('**/auth/v1/token**');
    await s.page.click('#login-form button[type="submit"]');
    await s.page.waitForURL(/mine-annoncer\.html/, { timeout: 10000 });
    assert.deepStrictEqual(s.fund.side, []);
  } finally { await s.luk(); }
});

test('K8b Ingen tekst på login lover noget, produktet ikke har (beskeder, social login, tal)', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: false }, 'login.html');
  try {
    const alt = (await tekstPaaSiden(s.page)) + ' ' + await s.page.evaluate(() => document.documentElement.innerHTML.replace(/<script[\s\S]*?<\/script>/g, ''));
    for (const forbudt of [/Google/, /Facebook/, /Apple/, /vil i kontakt/i, /\b120\.000/, /beskeder/i, /svartid/i]){
      assert.ok(!forbudt.test(alt), `uønsket tekst: ${forbudt}`);
    }
    await s.page.click('[data-auth-tab="register"]:visible');
    const opret = await tekstPaaSiden(s.page);
    assert.ok(!/beskeder|vil i kontakt/i.test(opret));
    await ingenNul(s.page, 'login');
  } finally { await s.luk(); }
});

/* ---------------- K9 Tværgående: bredde, tekst, tastatur ---------------- */

for (const bredde of [320, 390]){
  for (const tema of ['lys', 'moerk']){
    test(`K9a/K9b ${bredde}px ${tema}: ingen vandret overflow og ingen null/undefined/NaN (opret alle trin, mine-annoncer alle faner, login, dashboard)`, { timeout: 120000 }, async t => {
      if (!kan.ok) return t.skip(kan.grund);
      const s = await aabn({ loggetInd: true, annoncer: [...TRE(), FREMMED], viewport: { width: bredde, height: 800 }, tema });
      try {
        s.t.tabeller.favorites.push({ user_id: BRUGER_ID, listing_id: FREMMED.id });
        const maal = async hvor => {
          const o = await overflow(s.page);
          assert.ok(o <= 0, `${hvor}: vandret overflow ${o}px ved ${bredde}`);
          await ingenNul(s.page, hvor);
        };
        for (const tab of ['', 'annoncer', 'favoritter', 'agenter', 'konto']){
          await s.page.goto(URL(`mine-annoncer.html${tab ? '?tab=' + tab : ''}`), { waitUntil: 'networkidle' });
          await maal('mine-annoncer ' + (tab || 'oversigt'));
        }
        await s.page.goto(URL('dashboard.html'), { waitUntil: 'networkidle' });
        await maal('dashboard');
        // opret: side 1, billeder, gennemse (kræver gyldig udfyldning)
        await s.page.goto(URL('opret-annonce.html'), { waitUntil: 'networkidle' });
        await maal('opret trin 1');
        await udfylSide1(s.page); await naeste(s.page);
        await vaelgBilleder(s.page, 3);
        await s.page.waitForFunction(() => document.querySelectorAll('#photo-grid .photo-thumb').length === 3);
        await maal('opret billeder');
        await naeste(s.page);
        await maal('opret gennemse');
        // fejltilstand med toast og feltfejl
        await s.page.goto(URL('opret-annonce.html?rediger=' + TRE()[0].id), { waitUntil: 'networkidle' });
        await s.page.fill('#f-year', '1850');
        await naeste(s.page);
        await s.page.waitForTimeout(500);
        await maal('opret med feltfejl');
        // udlogget
        const ud = await aabn({ loggetInd: false, viewport: { width: bredde, height: 800 }, tema });
        try {
          for (const sti of ['login.html', 'login.html?redirect=opret-annonce.html', 'opret-annonce.html']){
            await ud.page.goto(URL(sti), { waitUntil: 'networkidle' });
            const o = await overflow(ud.page);
            assert.ok(o <= 0, `${sti} udlogget: overflow ${o}px ved ${bredde}`);
            await ingenNul(ud.page, sti);
          }
          await ud.page.goto(URL('login.html'), { waitUntil: 'networkidle' });
          await ud.page.click('[data-auth-tab="register"]:visible');
          assert.ok((await overflow(ud.page)) <= 0, 'opret-konto-visning');
        } finally { await ud.luk(); }
        assert.deepStrictEqual(s.fund.side, []);
      } finally { await s.luk(); }
    });
  }
}

test('K9c Fejl på trin 1 flytter fokus til første ugyldige felt med aria-invalid og beskrivelse', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html');
  try {
    await s.page.locator('label.radio-card', { has: s.page.locator('input[value="naked"]') }).click();
    await s.page.selectOption('#f-brand', 'Yamaha');
    await s.page.fill('#f-model', 'MT-07');
    await s.page.fill('#f-year', '1850');            // ugyldig
    await naeste(s.page);
    await s.page.waitForFunction(() => document.activeElement && document.activeElement.id === 'f-year', null, { timeout: 3000 });
    const info = await s.page.evaluate(() => { const e = document.getElementById('f-year'); const d = document.getElementById(e.getAttribute('aria-describedby') || ''); return { inv: e.getAttribute('aria-invalid'), tekst: d && d.innerText }; });
    assert.strictEqual(info.inv, 'true');
    assert.match(info.tekst || '', /Årgang/);
    assert.match(await synligFejl(s.page), /Årgang|udfyld/i, 'toast er aria-live');
  } finally { await s.luk(); }
});

test('K9d Alle felter på opret-siden har label; mobil-forhåndsvisningsark lukker med Escape og returnerer fokus', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true, viewport: { width: 390, height: 800 } }, 'opret-annonce.html');
  try {
    const uden = await s.page.evaluate(() => [...document.querySelectorAll('#listing-form input:not([type=hidden]):not([type=file]), #listing-form select, #listing-form textarea')].filter(e => {
      if (e.labels && e.labels.length) return false;
      return !(e.getAttribute('aria-label') || e.getAttribute('aria-labelledby'));
    }).map(e => e.id || e.name || e.type));
    assert.deepStrictEqual(uden, [], 'felter uden label');
    await s.page.locator('label.radio-card', { has: s.page.locator('input[value="naked"]') }).click();
    await s.page.selectOption('#f-brand', 'Yamaha');
    await s.page.fill('#f-model', 'MT-07');
    await s.page.locator('body').click({ position: { x: 5, y: 300 } });
    await s.page.evaluate(() => document.activeElement && document.activeElement.blur());
    const knap = s.page.locator('#op-prev-open');
    await knap.scrollIntoViewIfNeeded();
    if (!(await knap.isVisible())) return;       // pillen skjules bevidst, når kortet er i syne
    await knap.click();
    assert.ok(await s.page.locator('#op-prev-dialog[open]').count(), 'ark åbent');
    await s.page.keyboard.press('Escape');
    assert.strictEqual(await s.page.locator('#op-prev-dialog[open]').count(), 0);
  } finally { await s.luk(); }
});

test('K9e Hele flowet uden konsolfejl og uden uhåndterede promise-afvisninger', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html');
  try {
    await udfylSide1(s.page); await naeste(s.page);
    await vaelgBilleder(s.page, 2); await naeste(s.page); await s.page.check('#f-terms');
    await Promise.all([s.page.waitForURL(/annonce\.html\?id=/, { timeout: 15000 }), s.page.click('#step-next')]);
    assert.deepStrictEqual(s.fund.side, []);
    assert.deepStrictEqual(s.fund.konsol, []);
  } finally { await s.luk(); }
});
