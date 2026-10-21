/* V5 sælger: Playwright mod lokal mock (scripts/w9-saelger-mock.js). Ingen produktion, ingen rigtige konti.
   Låser de V5-ændringer, der kan måles: række-layout og statistikstribe, fokus efter bekræftelsesdialog,
   tom tilstand, trinbjælke/fremdrift og den flydende forhåndsvisning på opret-annonce, dansk feltfejl uden browserboble
   på opret-konto, samt guidens fotokort og typefliser. Uden Playwright/Chromium springes testene tydeligt over. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const sb = require('../scripts/smoke-browser');
const { lavBackend, lavPng } = require('../scripts/w9-saelger-mock');

let kan, server, port, browser;
const URL = s => `http://127.0.0.1:${port}/${s}`;

test.before(async () => {
  kan = await sb.playwrightTilgaengelig();
  if (!kan.ok){ console.log(`# v5-saelger.test: SKIPPER browsertestene (${kan.grund})`); return; }
  ({ server, port } = await sb.startServer(path.join(__dirname, '..')));
  browser = await kan.pw.chromium.launch();
});
test.after(async () => { if (browser) await browser.close(); if (server) server.close(); });

async function aabn(opts, sti, viewport = { width: 1440, height: 900 }, tema = 'lys'){
  const bak = lavBackend(opts);
  const ctx = await browser.newContext({ viewport });
  await bak.installer(ctx, { tema });
  const page = await ctx.newPage();
  const fund = { side: [], konsol: [] };
  page.on('pageerror', e => fund.side.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/blockedbyclient|Failed to load resource/.test(m.text())) fund.konsol.push(m.text()); });
  await page.goto(URL(sti), { waitUntil: 'networkidle' });
  if (/^opret-annonce\.html/.test(sti)) await page.waitForSelector('body[data-op-klar]', { timeout: 10000 });
  return { bak, ctx, page, fund, t: bak.tilstand };
}

const ID = n => `bbbbbbbb-0000-4000-8000-00000000000${n}`;
const FOTO = (n, k) => Array.from({ length: k }, (_, i) => ({ id: `cccccccc-0000-4000-8000-0000000000${n}${i}`, storage_path: `u/${n}-${i}.png`, position: i }));
const RIG = () => [
  { id: ID(1), brand: 'Honda', model: 'CBR650R', type: 'sport', year: 2022, km: 12834, price: 99900, city: 'Aarhus', dageGammel: 3, photos: FOTO(1, 8) },
  { id: ID(2), brand: 'BMW', model: 'R 1250 GS', type: 'adventure', year: 2021, km: 18460, price: 189900, city: 'Odense', dageGammel: 9, photos: FOTO(2, 5) },
  { id: ID(3), brand: 'KTM', model: '390 Adventure', type: 'adventure', year: 2023, km: 4820, price: 59900, city: 'Esbjerg', status: 'hidden', dageGammel: 20, photos: FOTO(3, 3) },
];
const iDag = () => new Date().toISOString().slice(0, 10);
const rk = (page, id) => page.locator(`.db-row[data-listing-id="${id}"]`);
const aktivId = page => page.evaluate(() => { const a = document.activeElement; return a ? (a.id || a.className || a.tagName) : null; });
const overlap = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);

/* ---------------- Mine annoncer ---------------- */

test('V5 mine annoncer: tællerne står i egen stribe nederst i rækken og rører ikke knapperne (1440, 1024, 768, 375)', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const w of [1440, 1024, 768, 375]){
    const bak = lavBackend({ loggetInd: true, annoncer: RIG(), saves: [{ listing: ID(1), saves: 18 }] });
    bak.tilstand.tabeller.listing_stats.push({ listing_id: ID(1), stat_day: iDag(), views: 642, contacts: 11 });
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    await bak.installer(ctx, { tema: 'lys' });
    const page = await ctx.newPage();
    try {
      await page.goto(URL('mine-annoncer.html'), { waitUntil: 'networkidle' });
      await page.waitForSelector(`.db-row[data-listing-id="${ID(1)}"] .db-nums`);
      const m = await page.evaluate(id => {
        const r = document.querySelector(`.db-row[data-listing-id="${id}"]`);
        const box = el => { const b = el.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom }; };
        return { row: box(r), nums: box(r.querySelector('.db-nums')), actions: box(r.querySelector('.db-actions')), status: box(r.querySelector('.db-status')),
          direkteBarn: r.querySelector('.db-nums').parentElement === r, tekst: r.querySelector('.db-nums').innerText, scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      }, ID(1));
      assert.ok(m.direkteBarn, `${w}: tællerne er et direkte barn af rækken (egen stribe)`);
      assert.ok(!overlap(m.nums, m.actions), `${w}: tællerne overlapper ikke knapperne`);
      assert.ok(!overlap(m.nums, m.status), `${w}: tællerne overlapper ikke statuskolonnen`);
      assert.ok(m.nums.left <= m.row.left + 1 && m.nums.right >= m.row.right - 1, `${w}: striben løber ud til rækkens kanter`);
      assert.match(m.tekst, /642[\s\S]*Visninger[\s\S]*18[\s\S]*Favoritter[\s\S]*11[\s\S]*Telefonvisninger/);
      assert.match(m.tekst, /Seneste 30 dage/);
      assert.ok(m.scroll <= 0, `${w}: ingen vandret overflow`);
    } finally { await ctx.close(); }
  }
});

test('V5 mine annoncer: statuskolonnen står samme sted i alle rækker (fast kolonnebredde) ved 1440', { timeout: 40000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true, annoncer: [...RIG(), { id: ID(4), brand: 'Yamaha', model: 'MT-07', status: 'sold', dageGammel: 40, photos: [] }] }, 'mine-annoncer.html');
  try {
    await s.page.waitForSelector('.db-row .db-badge');
    const lefts = await s.page.$$eval('.db-row .db-status', els => els.map(e => Math.round(e.getBoundingClientRect().left)));
    assert.ok(lefts.length >= 4);
    assert.strictEqual(new Set(lefts).size, 1, 'status-kolonnens venstre kant: ' + lefts.join(','));
    assert.deepStrictEqual(s.fund.side, []);
  } finally { await s.ctx.close(); }
});

test('V5 mine annoncer: efter Annuller lukker menuen og fokus står på ⋮-knappen (ikke <body>)', { timeout: 40000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true, annoncer: RIG() }, 'mine-annoncer.html');
  try {
    const p = s.page;
    await p.waitForSelector(`.db-row[data-listing-id="${ID(1)}"] summary`);
    for (const knap of ['[data-delete-listing]', '[data-mark-sold]']){
      await rk(p, ID(1)).locator('summary').click();
      await rk(p, ID(1)).locator(knap).click();
      await p.waitForSelector('dialog.bb-bekraeft[open]');
      await p.click('dialog.bb-bekraeft [data-bekraeft-nej]');
      await p.waitForSelector('dialog.bb-bekraeft', { state: 'detached' });
      const st = await p.evaluate(id => { const r = document.querySelector(`.db-row[data-listing-id="${id}"]`); const a = document.activeElement; return { aktivErSummary: a === r.querySelector('details.db-more > summary'), menuAaben: r.querySelector('details.db-more').open, body: a === document.body }; }, ID(1));
      assert.ok(!st.body, `${knap}: fokus faldt til <body>`);
      assert.ok(st.aktivErSummary, `${knap}: fokus på ⋮-knappen`);
      assert.ok(!st.menuAaben, `${knap}: menuen er lukket`);
    }
    assert.strictEqual(s.t.tabeller.listings.length, 3, 'intet blev slettet');
    assert.strictEqual(s.t.log.filter(l => l.metode === 'DELETE' && l.tabel === 'listings').length, 0);
    assert.deepStrictEqual(s.fund.side, []);
  } finally { await s.ctx.close(); }
});

test('V5 mine annoncer: efter bekræftet sletning/solgt/pause lander fokus et fornuftigt sted', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true, annoncer: RIG() }, 'mine-annoncer.html');
  try {
    const p = s.page;
    await p.evaluate(() => { window.__bekraeftSvar = 'ja'; });
    const klikJa = async () => { await p.waitForSelector('dialog.bb-bekraeft[open]'); await p.click('dialog.bb-bekraeft [data-bekraeft-ok]'); await p.waitForSelector('dialog.bb-bekraeft', { state: 'detached' }); await p.waitForTimeout(120); await p.waitForFunction(() => document.activeElement && document.activeElement !== document.body, null, { timeout: 5000 }).catch(() => {}); };   /* V6: fokus sættes først, når mock-backendens svar er behandlet; under CPU-last var 120 ms ikke nok */
    // pause/aktivér: fokus bliver på samme rækkes statusknap
    await p.waitForSelector(`.db-row[data-listing-id="${ID(2)}"] [data-status-skift]`);
    await rk(p, ID(2)).locator('[data-status-skift]').click();
    await p.waitForFunction(id => document.querySelector(`.db-row[data-listing-id="${id}"]`).dataset.status === 'paused', ID(2));
    assert.strictEqual(await p.evaluate(id => document.activeElement === document.querySelector(`.db-row[data-listing-id="${id}"] [data-status-skift]`), ID(2)), true, 'pause: fokus på statusknappen');
    // markér solgt: fokus på rækkens titel
    await rk(p, ID(1)).locator('summary').click(); await rk(p, ID(1)).locator('[data-mark-sold]').click(); await klikJa();
    assert.strictEqual(await p.evaluate(id => document.activeElement === document.querySelector(`.db-row[data-listing-id="${id}"] .db-title`), ID(1)), true, 'solgt: fokus på rækkens titel');
    // slet: fokus på en række-titel eller overskriften — aldrig <body>
    await rk(p, ID(1)).locator('summary').click(); await rk(p, ID(1)).locator('[data-delete-listing]').click(); await klikJa();
    const slet = await p.evaluate(() => { const a = document.activeElement; return { body: a === document.body, titel: a.classList.contains('db-title'), overskrift: a.id === 'mine-heading' }; });
    assert.ok(!slet.body && (slet.titel || slet.overskrift), 'slet: fokus ' + JSON.stringify(slet));
    assert.deepStrictEqual(s.fund.side, []);
  } finally { await s.ctx.close(); }
});

test('V5 mine annoncer: tom tilstand har tre trin, opret-knap og guide-link, og ingen vandret overflow ved 375 og 1440', { timeout: 40000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const w of [375, 1440]){
    const s = await aabn({ loggetInd: true }, 'mine-annoncer.html', { width: w, height: 900 });
    try {
      await s.page.waitForSelector('#mine-empty', { state: 'visible' });
      const m = await s.page.evaluate(() => ({ trin: document.querySelectorAll('#mine-empty .db-empty-steps li').length, opret: !!document.querySelector('#mine-empty a[href="opret-annonce.html"]'), guide: !!document.querySelector('#mine-empty a[href="guide-saelg-motorcykel.html"]'), scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth, tekst: document.getElementById('mine-empty').innerText }));
      assert.strictEqual(m.trin, 3); assert.ok(m.opret && m.guide); assert.ok(m.scroll <= 0, `${w}: overflow ${m.scroll}`);
      assert.ok(!/\b(null|undefined|NaN)\b/.test(m.tekst));
    } finally { await s.ctx.close(); }
  }
});

/* ---------------- Opret annonce ---------------- */

test('V5 opret: trinbjælken får flueben, når en sektion er klar, og sidekortet tæller påkrævede felter', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html');
  try {
    const p = s.page;
    const n = () => p.evaluate(() => ({ tal: document.getElementById('op-klar-n').textContent, bar: document.getElementById('op-klar-bar').getAttribute('aria-valuenow'), trin: [...document.querySelectorAll('.step-item')].map(e => /done/.test(e.className)) }));
    let m = await n();
    assert.strictEqual(m.tal, '0 af 10'); assert.deepStrictEqual(m.trin, [false, false, false, false]);
    await p.locator('label.radio-card', { has: p.locator('input[name="bike-type"][value="naked"]') }).click();
    await p.selectOption('#f-brand', 'Yamaha'); await p.fill('#f-model', 'MT-07'); await p.fill('#f-year', '2021'); await p.fill('#f-km', '12500'); await p.fill('#f-ccm', '689');
    await p.waitForFunction(() => document.getElementById('op-klar-n').textContent === '6 af 10');
    assert.strictEqual((await n()).bar, '6');
    await p.setInputFiles('#photo-input', [{ name: 'a.png', mimeType: 'image/png', buffer: lavPng(640, 480) }]);
    await p.waitForFunction(() => document.querySelectorAll('#photo-grid img').length >= 1);
    await p.waitForFunction(() => /done/.test(document.querySelectorAll('.step-item')[1].className));
    m = await n();
    assert.strictEqual(m.trin[1], true, 'billeder-trinnet har flueben');
    assert.strictEqual(await p.evaluate(() => document.querySelectorAll('.step-item')[1].querySelector('.visually-hidden').textContent.includes('færdigt')), true, 'skærmlæsertekst siger færdigt');
    // resten udfyldes: alt klar
    await p.fill('#f-price', '69900'); await p.selectOption('#f-condition', { index: 1 }); await p.fill('#f-postnr', '8000');
    await p.waitForSelector('#postnr-list [role="option"], #postnr-list li, #postnr-list button', { timeout: 3000 }).catch(() => {});
    const valg = p.locator('#postnr-list [role="option"], #postnr-list li, #postnr-list button').first(); if (await valg.count()) await valg.click();
    await p.fill('#f-desc', 'Velholdt MT-07 med servicehistorik og nye dæk.');
    await p.waitForFunction(() => document.getElementById('op-klar-n').textContent === '10 af 10');
    assert.match(await p.innerText('#op-klar-tx'), /Alt påkrævet er udfyldt/);
    assert.deepStrictEqual(s.fund.side, []);
  } finally { await s.ctx.close(); }
});

test('V5 opret (mobil): den flydende forhåndsvisning dækker hverken handlingsknapperne eller valideringsfejl', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html', { width: 375, height: 812 });
  try {
    const p = s.page;
    const fab = () => p.evaluate(() => { const b = document.getElementById('op-prev-open'); return { skjult: b.classList.contains('skjult'), op: getComputedStyle(b).opacity, pe: getComputedStyle(b).pointerEvents }; });
    await p.evaluate(() => window.scrollTo(0, 600)); await p.waitForTimeout(250);
    const midt = await fab();
    assert.strictEqual(midt.skjult, false, 'pillen er synlig midt i formularen: ' + JSON.stringify(midt));
    await p.locator('#step-next').scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
    const ved = await fab();
    assert.ok(ved.skjult && ved.pe === 'none', 'pillen er væk, mens handlingsrækken er i syne: ' + JSON.stringify(ved));
    await p.click('#step-next'); await p.waitForTimeout(700);
    assert.ok(await p.locator('.felt-fejl').count() >= 1, 'validering viste fejl');
    await p.evaluate(() => window.scrollTo(0, document.getElementById('f-desc').getBoundingClientRect().top + scrollY - 300)); await p.waitForTimeout(250);
    const efter = await fab();
    assert.ok(efter.skjult && efter.pe === 'none', 'pillen er væk, mens der står en fejl: ' + JSON.stringify(efter));
    // fejlene rettes: pillen kommer tilbage
    await p.locator('label.radio-card', { has: p.locator('input[name="bike-type"][value="naked"]') }).click();
    await p.selectOption('#f-brand', 'Yamaha'); await p.fill('#f-model', 'MT-07'); await p.fill('#f-year', '2021'); await p.fill('#f-km', '1'); await p.fill('#f-ccm', '689');
    await p.fill('#f-price', '69900'); await p.selectOption('#f-condition', { index: 1 }); await p.fill('#f-postnr', '8000');
    const v = p.locator('#postnr-list [role="option"], #postnr-list li, #postnr-list button').first(); await p.waitForTimeout(300); if (await v.count()) await v.click();
    await p.fill('#f-desc', 'Test af beskrivelse til MT-07.');
    await p.click('#step-next'); await p.waitForTimeout(500);
    assert.strictEqual(await p.locator('[aria-invalid="true"]').count(), 0, 'ingen fejl tilbage');
    assert.deepStrictEqual(s.fund.side, []);
  } finally { await s.ctx.close(); }
});

/* ---------------- Login ---------------- */

test('V5 login: tom opret-konto-formular giver dansk fejl ved feltet (ingen engelsk browserboble), aria-describedby og fokus', { timeout: 40000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: false }, 'login.html');
  try {
    const p = s.page;
    await p.click('.lg-promo-cta'); await p.waitForTimeout(300);
    assert.strictEqual(await p.getAttribute('#register-form', 'novalidate'), '');
    await p.click('#register-form button[type=submit]'); await p.waitForTimeout(300);
    assert.strictEqual(await p.evaluate(() => document.activeElement.id), 'reg-name');
    assert.strictEqual(await p.getAttribute('#reg-name', 'aria-invalid'), 'true');
    const fejl = await p.locator('#reg-name-fejl').innerText();
    assert.match(fejl, /Skriv dit navn/);
    assert.strictEqual(await p.getAttribute('#reg-name', 'aria-describedby'), 'reg-name-fejl');
    await p.fill('#reg-name', 'Test Sælger'); await p.click('#register-form button[type=submit]'); await p.waitForTimeout(250);
    assert.strictEqual(await p.locator('#reg-name-fejl').count(), 0, 'gammel fejl er væk');
    assert.match(await p.locator('#reg-email-fejl').innerText(), /Skriv din e-mail/);
    await p.fill('#reg-email', 'ikke-en-mail'); await p.click('#register-form button[type=submit]'); await p.waitForTimeout(250);
    assert.match(await p.locator('#reg-email-fejl').innerText(), /navn@eksempel\.dk/);
    await p.fill('#reg-email', 'a@b.dk'); await p.fill('#reg-password', '123'); await p.click('#register-form button[type=submit]'); await p.waitForTimeout(250);
    assert.match(await p.locator('#reg-password-fejl').innerText(), /mindst 6 tegn/);
    assert.strictEqual(s.t.auth.filter(a => a.gren === 'signup').length, 0, 'intet signup-kald med ugyldige felter');
    // rettelse fjerner fejlen
    await p.fill('#reg-password', '123456'); await p.waitForTimeout(100);
    assert.strictEqual(await p.locator('#reg-password-fejl').count(), 0);
    assert.deepStrictEqual(s.fund.side, []);
  } finally { await s.ctx.close(); }
});

test('V5 login: opret-visningens højre kolonne får egen overskrift, og alle felter har ikon som i log ind', { timeout: 40000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: false }, 'login.html');
  try {
    const p = s.page;
    const synlig = () => p.evaluate(() => [...document.querySelectorAll('#lg-promo-title > span')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.textContent));
    assert.deepStrictEqual(await synlig(), ['Opret en konto på Bikerbasen']);
    await p.click('.lg-promo-cta'); await p.waitForTimeout(250);
    assert.deepStrictEqual(await synlig(), ['Det får du med en gratis konto']);
    const ikoner = await p.evaluate(() => ['reg-name', 'reg-email', 'reg-phone', 'reg-password'].map(id => !!document.getElementById(id).closest('.lg-input').querySelector('svg.lg-ic')));
    assert.deepStrictEqual(ikoner, [true, true, true, true]);
    assert.ok(!/\b(null|undefined|NaN)\b/.test(await p.innerText('main')));
  } finally { await s.ctx.close(); }
});

test('V5 login: knappen viser indlæsning (aria-busy + spinner) mens kaldet kører', { timeout: 40000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: false }, 'login.html');
  try {
    const p = s.page;
    await p.route('**/auth/v1/token*', async route => { await new Promise(r => setTimeout(r, 900)); route.fulfill({ status: 400, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' }) }); });
    await p.fill('#login-email', 'a@b.dk'); await p.fill('#login-password', 'forkert1');
    await p.click('#login-form button[type=submit]');
    await p.waitForSelector('#login-form .lg-cta[aria-busy="true"]', { timeout: 3000 });
    const spinner = await p.evaluate(() => { const cs = getComputedStyle(document.querySelector('#login-form .lg-cta'), '::before'); return { content: cs.content, w: cs.width, anim: cs.animationName }; });
    assert.ok(spinner.content !== 'none' && spinner.w === '16px', JSON.stringify(spinner));
    await p.waitForSelector('#auth-error', { state: 'visible' });
  } finally { await s.ctx.close(); }
});

/* ---------------- Guides ---------------- */

test('V5 guide: typefliserne bruger hele kolonnen, "Læs også"-kortene har fotos med højde, og linjelængden holder sig under 80 tegn (1440)', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: false }, 'guide-foerste-motorcykel.html');
  try {
    const m = await s.page.evaluate(() => {
      const kol = document.querySelector('.gd-article').getBoundingClientRect().width;
      const typer = document.querySelector('ul.gd-types');
      const tile = typer.querySelector('.gd-type-link').getBoundingClientRect();
      const rel = [...document.querySelectorAll('.gd-rel-media')].map(e => { const b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; });
      const p = document.querySelector('.gd-article > .gd-sec > p').getBoundingClientRect().width;
      const klippet = [...document.querySelectorAll('.gd-type-go')].filter(e => e.scrollWidth > e.clientWidth + 1).length;
      const link = [...document.querySelectorAll('.gd-article p a')].find(a => a.parentElement.querySelectorAll('a').length === 1 && a.parentElement.children.length === 1);
      return { kol, typerW: typer.getBoundingClientRect().width, tile: tile.width, rel, p, klippet, linkDisplay: link ? getComputedStyle(link).display : 'ingen', steps: document.querySelectorAll('.gd-article > .gd-sec > ol').length, kilder: getComputedStyle(document.querySelector('#kilder > ul > li'), '::before').content };
    });
    assert.ok(m.typerW >= m.kol - 2, `typefliserne fylder kolonnen (${m.typerW} af ${m.kol})`);
    assert.ok(m.tile >= 160, `flise ${m.tile}px`);
    assert.strictEqual(m.klippet, 0, 'ingen klippede typelinks');
    assert.ok(m.rel.length === 3 && m.rel.every(r => r.h >= 60 && r.w >= 100), 'læs-også-fotos: ' + JSON.stringify(m.rel));
    assert.ok(m.p > 560 && m.p < 700, `brødtekstens bredde ${m.p}`);
    assert.ok(m.linkDisplay === 'inline' || m.linkDisplay === 'ingen', 'enkeltlink i afsnit er inline: ' + m.linkDisplay);
    assert.ok(m.steps >= 1);
    assert.notStrictEqual(m.kilder, 'none');
    assert.deepStrictEqual(s.fund.side, []);
  } finally { await s.ctx.close(); }
});

test('V5 guide: ingen vandret overflow og ingen klippede kort ved 375, 430 og 768 (alle guides + oversigten)', { timeout: 120000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const sider = ['guides', 'guide-foerste-motorcykel', 'guide-mc-forsikring', 'guide-saelg-motorcykel', 'guide-mc-ordliste'];
  for (const w of [375, 430, 768]){
    const bak = lavBackend({});
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    await bak.installer(ctx, { tema: 'moerk' });
    const page = await ctx.newPage();
    try {
      for (const sd of sider){
        await page.goto(URL(sd + '.html'), { waitUntil: 'networkidle' });
        const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        assert.ok(ov <= 0, `${sd} ${w}px: overflow ${ov}`);
      }
    } finally { await ctx.close(); }
  }
});

/* ---------------- Statiske tjek (kører uden browser) ---------------- */

test('V5: alle formularer på sælgersiderne er novalidate (ingen engelsk browserboble), og krav-dialogen validerer selv', async t => {
  const fs = require('fs');
  const les = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  assert.match(les('login.html'), /<form id="register-form"[^>]*novalidate/);
  assert.match(les('login.html'), /<form id="login-form"[^>]*novalidate/);
  assert.match(les('opret-annonce.html'), /<form id="listing-form"[^>]*novalidate/);
  assert.match(les('dashboard.html'), /<form id="krav-dialog-form"[^>]*novalidate/);
  assert.match(les('js/dashboard.js'), /krav-dialog-doku-fejl/);
});

test('V5 guides: oversigten har et afsluttende link-felt, når antallet af kort er ulige, og det peger på søgningen', async t => {
  const fs = require('fs');
  const html = fs.readFileSync(path.join(__dirname, '..', 'guides.html'), 'utf8');
  const kort = (html.match(/<li class="gd-card gd-card-lille">/g) || []).length;
  const tile = (html.match(/<li class="gd-cta-tile">/g) || []).length;
  assert.strictEqual(tile, kort % 4 ? 1 : 0, `${kort} små kort -> ${tile} link-felt`);
  if (tile) assert.match(html, /<a class="gd-cta-link" href="soegning\.html">/);
});

test('V5 guides: "Læs også" bruger kategori og pil, og "Gå videre herfra" gentager ikke sidens sidste overskrift', async t => {
  const fs = require('fs');
  const html = fs.readFileSync(path.join(__dirname, '..', 'guide-foerste-motorcykel.html'), 'utf8');
  assert.match(html, /gd-rel-kicker/);
  assert.match(html, /gd-rel-go/);
  const h2 = [...html.matchAll(/<h2[^>]*>([^<]*)<\/h2>/g)].map(m => m[1].trim());
  assert.strictEqual(new Set(h2).size, h2.length, 'dubleret h2: ' + h2.join(' | '));
});

/* ---------------- Gemte annoncer uden login ---------------- */

test('V5 favoritter: anonym trykker hjerte på ekstern annonce, åbner header-hjertet og ser listen uden login; ingen skrivning til Supabase', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const { eksterneRaekker } = require('../scripts/smoke-fixtures');
  const bak = lavBackend({ loggetInd: false });
  bak.tilstand.tabeller.eksterne_annoncer.push(...eksterneRaekker());
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await bak.installer(ctx, { tema: 'lys' });
  const page = await ctx.newPage();
  const fejl = []; page.on('pageerror', e => fejl.push(e.message));
  try {
    await page.goto(URL('soegning.html'), { waitUntil: 'networkidle' });
    const hjerte = page.locator('[data-fav-toggle][data-fav-ext]').first();
    await hjerte.waitFor({ state: 'visible', timeout: 15000 });
    const id = await hjerte.getAttribute('data-fav-toggle');
    await hjerte.click();
    assert.ok(await page.evaluate(i => JSON.parse(localStorage.getItem('bb_favorites_ext') || '[]').map(String).includes(String(i)), id), 'gemt lokalt');
    // headerens hjerte ("Gemte annoncer") åbner favoritfanen uden login-omvej
    await Promise.all([page.waitForURL(/mine-annoncer\.html\?tab=favoritter/), page.locator('a[href="mine-annoncer.html?tab=favoritter"]').first().click()]);
    await page.waitForSelector('#fav-grid .db-row[data-external="1"]', { timeout: 15000 });
    assert.match(page.url(), /mine-annoncer\.html\?tab=favoritter/, 'ingen omdirigering til login');
    assert.strictEqual(await page.locator(`#fav-grid .db-row[data-listing-id="${id}"]`).count(), 1, 'den gemte annonce står på listen');
    const tekst = await page.innerText('main');
    assert.match(tekst, /Gemt i denne browser — log ind for at gemme egne annoncer/);
    assert.ok(!(await page.locator('.db-stats').isVisible()), 'statistikkort skjult for anonyme');
    assert.ok(!(await page.locator('#db-panel-annoncer').isVisible()), 'egne annoncer skjult');
    assert.strictEqual(await page.locator('.db-tab:visible').count(), 1, 'kun favoritfanen vises');
    assert.ok(!/\b(null|undefined|NaN)\b/.test(tekst));
    // fjern igen fra listen: forsvinder fra listen og fra lageret
    await page.locator(`#fav-grid .db-row[data-listing-id="${id}"] [data-fav-toggle]`).click();
    await page.waitForFunction(i => !document.querySelector(`#fav-grid .db-row[data-listing-id="${i}"]`), id);
    assert.ok(await page.evaluate(i => !JSON.parse(localStorage.getItem('bb_favorites_ext') || '[]').map(String).includes(String(i)), id));
    // ingen skrivning til backend, og ingen auth-kald ud over læsning
    const skrivninger = bak.tilstand.log.filter(l => !['GET', 'HEAD'].includes(l.metode));
    assert.deepStrictEqual(skrivninger, [], 'skrivninger til Supabase: ' + JSON.stringify(skrivninger));
    assert.strictEqual(bak.tilstand.auth.filter(a => a.metode !== 'GET').length, 0, 'ingen auth-skrivning');
    assert.deepStrictEqual(fejl, []);
  } finally { await ctx.close(); }
});

test('V5 favoritter: anonym på de andre faner (?tab=aktive, mine, kladder, uden tab) sendes stadig til login', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const q of ['?tab=aktive', '?tab=mine', '?tab=kladder', '?tab=konto', '?tab=agenter', '']){
    const s = await aabn({ loggetInd: false }, 'mine-annoncer.html' + q);
    try {
      await s.page.waitForURL(/login\.html/, { timeout: 10000 });
      assert.match(decodeURIComponent(s.page.url()), /redirect=mine-annoncer\.html/, q);
    } finally { await s.ctx.close(); }
  }
});

test('V5 favoritter: anonym med egne (uuid) favoritter får en ærlig besked, og intet ryddes eller hentes fra databasen', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const bak = lavBackend({ loggetInd: false });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await bak.installer(ctx, { tema: 'lys' });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('__seedFav')){ sessionStorage.setItem('__seedFav', '1'); localStorage.setItem('bb_favorites', JSON.stringify(['aaaaaaaa-1111-4222-8333-444444444444'])); } } catch (e) {} });
  const page = await ctx.newPage();
  try {
    await page.goto(URL('mine-annoncer.html?tab=favoritter'), { waitUntil: 'networkidle' });
    await page.waitForSelector('#db-anon-egne:not([hidden])', { timeout: 10000 });
    assert.match(await page.innerText('#db-anon-egne'), /1 gemt annonce fra private sælgere på Bikerbasen/);
    assert.deepStrictEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('bb_favorites'))), ['aaaaaaaa-1111-4222-8333-444444444444'], 'ikke ryddet');
    assert.strictEqual(bak.tilstand.log.filter(l => l.tabel === 'listings' && l.metode === 'GET' && /aaaaaaaa-1111/.test(l.tabel)).length, 0);
    assert.deepStrictEqual(bak.tilstand.log.filter(l => !['GET', 'HEAD'].includes(l.metode)), []);
  } finally { await ctx.close(); }
});
