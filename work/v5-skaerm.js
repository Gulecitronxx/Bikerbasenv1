/* V5 sælger: screenshot-harness. node work/v5-skaerm.js <mappe> [--vp 375,1440] [--tema lys,moerk] [--sider opret,login,mine,guide,guides] [--fuld] */
const path = require('path');
const sb = require('../scripts/smoke-browser');
const { lavBackend, lavPng } = require('../scripts/w9-saelger-mock');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const UD = path.resolve(process.argv[2]);
const VP = arg('vp', '375,1440').split(',').map(Number);
const TEMA = arg('tema', 'lys').split(',');
const SIDER = arg('sider', 'opret,login,mine,guide,guides').split(',');
const JPG = process.argv.includes('--jpg');
const FULD = !process.argv.includes('--topp');
const HOEJDE = { 375: 812, 430: 932, 768: 1024, 1440: 900, 1920: 1080 };
const ANN = [
  { brand: 'Honda', model: 'CBR650R', type: 'sport', year: 2022, km: 12834, price: 99900, city: 'Aarhus', dageGammel: 3 },
  { brand: 'BMW', model: 'R 1250 GS', type: 'adventure', year: 2021, km: 18460, price: 189900, city: 'Odense', dageGammel: 9 },
  { brand: 'KTM', model: '390 Adventure', type: 'adventure', year: 2023, km: 4820, price: 59900, city: 'Esbjerg', status: 'hidden', dageGammel: 20 },
];
const ID = n => `bbbbbbbb-0000-4000-8000-00000000000${n}`;
const FOTO = (n, k) => Array.from({ length: k }, (_, i) => ({ id: `cccccccc-0000-4000-8000-0000000000${n}${i}`, storage_path: `u/${n}-${i}.png`, position: i }));
const ANN_RIG = [
  { id: ID(1), brand: 'Honda', model: 'CBR650R', type: 'sport', year: 2022, km: 12834, price: 99900, city: 'Aarhus', dageGammel: 3, photos: FOTO(1, 8) },
  { id: ID(2), brand: 'BMW', model: 'R 1250 GS', type: 'adventure', year: 2021, km: 18460, price: 189900, city: 'Odense', dageGammel: 9, photos: FOTO(2, 5) },
  { id: ID(3), brand: 'KTM', model: '390 Adventure', type: 'adventure', year: 2023, km: 4820, price: 59900, city: 'Esbjerg', status: 'hidden', dageGammel: 20, photos: FOTO(3, 3) },
  { id: ID(4), brand: 'Yamaha', model: 'MT-07', type: 'naked', year: 2020, km: 21000, price: 64900, city: 'Odense', status: 'sold', dageGammel: 40, photos: FOTO(4, 2) },
];
const STAT = d => [
  { listing_id: ID(1), stat_day: d, views: 642, contacts: 11 }, { listing_id: ID(2), stat_day: d, views: 1024, contacts: 23 },
];
(async () => {
  const kan = await sb.playwrightTilgaengelig();
  const { server, port } = await sb.startServer(process.env.V5_ROD || path.join(__dirname, '..'));
  const browser = await kan.pw.chromium.launch();
  const SID = {
    opret: { sti: 'opret-annonce.html', ind: true },
    'opret-ud': { sti: 'opret-annonce.html', ind: false },
    login: { sti: 'login.html', ind: false },
    mine: { sti: 'mine-annoncer.html', ind: true, ann: ANN },
    'mine-tom': { sti: 'mine-annoncer.html', ind: true },
    guide: { sti: 'guide-foerste-motorcykel.html', ind: false },
    guides: { sti: 'guides.html', ind: false },
    saelg: { sti: 'guide-saelg-motorcykel.html', ind: false },
    forsikring: { sti: 'guide-mc-forsikring.html', ind: false },
    udstyr: { sti: 'guide-mc-udstyr.html', ind: false },
    dash: { sti: 'dashboard.html', ind: true, ann: ANN, dealer: true },
    'login-fejl': { sti: 'login.html', ind: false, login: () => ({ status: 400, msg: 'Invalid login credentials' }), act: async page => { await page.fill('#login-email', 'test@example.test'); await page.fill('#login-password', 'forkert1'); await page.click('#login-form button[type=submit]'); await page.waitForTimeout(700); } },
    'login-reg': { sti: 'login.html', ind: false, act: async page => { await page.click('.lg-promo-cta'); await page.waitForTimeout(400); } },
    'login-regfejl': { sti: 'login.html', ind: false, act: async page => { await page.click('.lg-promo-cta'); await page.waitForTimeout(300); await page.click('#register-form button[type=submit]'); await page.waitForTimeout(500); } },
    'login-glemt': { sti: 'login.html', ind: false, act: async page => { await page.click('#forgot-password-btn'); await page.waitForTimeout(400); } },
    'login-redirect': { sti: 'login.html?redirect=opret-annonce.html', ind: false },
    'dash-ann': { sti: 'dashboard.html', ind: true, ann: ANN, dealer: true, act: async page => { await page.locator('#dtab-annoncer').click(); await page.waitForTimeout(500); } },
    'mine-rig': { sti: 'mine-annoncer.html', ind: true, ann: ANN_RIG, rig: true },
  };
  for (const s of SIDER) for (const vp of VP) for (const t of TEMA){
    const d = SID[s]; if (!d) continue;
    const bak = lavBackend({ loggetInd: d.ind, annoncer: d.ann, stortFoto: !!d.rig, login: d.login, forhandler: !!d.dealer });
    if (d.rig){ bak.tilstand.tabeller.listing_stats.push(...STAT(new Date().toISOString().slice(0, 10))); bak.tilstand.saves = [{ listing: ID(1), saves: 18 }, { listing: ID(2), saves: 36 }]; }
    const ctx = await browser.newContext({ viewport: { width: vp, height: HOEJDE[vp] || 900 } });
    await bak.installer(ctx, { tema: t });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${port}/${d.sti}`, { waitUntil: 'networkidle' });
    if (/opret/.test(d.sti)) await page.waitForSelector('body[data-op-klar]', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);
    if (d.act) await d.act(page);
    /* lazy-billeder: rul igennem siden, så fullPage-screenshot viser dem */
    await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 500){ window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } window.scrollTo(0, 0); });
    await page.waitForTimeout(500);
    const y0 = Number(arg('y0', -1)), hh = Number(arg('h', 900));
    const navn = path.join(UD, `${s}-${vp}-${t}${y0 >= 0 ? '-y' + y0 : ''}.${JPG ? 'jpg' : 'png'}`);
    if (y0 >= 0) await page.screenshot({ path: navn, fullPage: true, clip: { x: 0, y: y0, width: vp, height: hh }, ...(JPG ? { type: 'jpeg', quality: 58 } : {}) });
    else await page.screenshot({ path: navn, fullPage: FULD, ...(JPG ? { type: 'jpeg', quality: 58 } : {}) });
    console.log('ok', s, vp, t);
    await ctx.close();
  }
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
