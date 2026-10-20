/* V4 annonce: skærmbilleder af ekstern og intern annoncedetalje i 5 viewports x lys/mørk.

   Kør:  node scripts/v4-annonce-shots.js --ud docs/review/gauntlet/v4/annonce/foer [--viewports 375,430,768,1440,1920]
                                          [--temaer lys,moerk] [--cases ekstern,gul,intern,intern-eet,intern-nul]
                                          [--top]   (kun første skærm i stedet for hele siden) [--klip 1800]  (hele siden, men kun de første N px)

   Alt er mocket: ingen forespørgsel forlader maskinen, og intet læses fra eller skrives til produktion. Fremmede billedværter
   og Supabase Storage svarer med lokale billeder fra img/type, så siderne ser realistiske ud (smoke-browser bruger 1x1 px).
   Egne annoncer: 901 (otte fotos), 902 (ét foto), 903 (ingen fotos, ingen pris). Eksterne: smoke-fixtures (MC Syd, Gul og Gratis). */

const fs = require('fs');
const path = require('path');
const { startServer, playwrightTilgaengelig } = require('./smoke-browser');
const { eksterneRaekker, egneRaekker, uuid } = require('./smoke-fixtures');

const REPO = path.join(__dirname, '..');
const FOTOER = ['naked', 'sport', 'touring', 'cruiser', 'adventure', 'classic', 'cross', 'scooter']
  .map(t => fs.readFileSync(path.join(REPO, 'img', 'type', `${t}.webp`)));

function egne(){
  const raekker = egneRaekker();
  const a = raekker[0];
  a.description = 'Velholdt Kawasaki ZX-6R fra 2013. Nye dæk monteret i foråret, kæde og tandhjul skiftet ved 28.000 km. Servicebog haves, og motorcyklen er altid opbevaret indendørs. Kører og starter perfekt. Ingen tab eller skader. Pris kan diskuteres ved hurtig handel.\n\nKan besigtiges i Odense efter aftale. Bytte ikke aktuelt.';
  a.serviceHistorik = 'Fuld'; a.antal_ejere = 1;
  a.photos = Array.from({ length: 8 }, (_, p) => ({ id: `${a.id}-p${p}`, storage_path: `smoke/${a.id}/${p}.jpg`, position: p }));
  return raekker;
}

function installer(context, port){
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
  const eks = eksterneRaekker();
  return context.route('**/*', route => {
    const req = route.request();
    let u;
    try { u = new URL(req.url()); } catch (e) { return route.abort('blockedbyclient'); }
    if (u.hostname === '127.0.0.1' && Number(u.port) === port) return route.continue();
    if (/(^|\.)supabase\.co$/.test(u.hostname)){
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      if (u.pathname.startsWith('/rest/v1/')){
        const tabel = u.pathname.slice('/rest/v1/'.length);
        const body = tabel === 'eksterne_annoncer' ? eks : tabel === 'listings' ? egne() : [];
        return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
      if (u.pathname.startsWith('/storage/v1/')){
        const m = /\/(\d+)\.jpg/.exec(u.pathname);
        return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'image/webp' }, body: FOTOER[(m ? Number(m[1]) : 0) % FOTOER.length] });
      }
      return route.fulfill({ status: 401, headers: { ...cors, 'Content-Type': 'application/json' }, body: '{"message":"ingen session"}' });
    }
    if (req.resourceType() === 'image'){
      const m = /\/(\d+)\.jpg/.exec(u.pathname);
      return route.fulfill({ status: 200, headers: { 'Content-Type': 'image/webp' }, body: FOTOER[(m ? Number(m[1]) : 0) % FOTOER.length] });
    }
    return route.abort('blockedbyclient');
  });
}

const CASES = {
  ekstern: `annonce.html?id=${uuid(1)}`,          // MC Syd, forhandler, foto, 145 hk
  gul: `annonce.html?id=${uuid(13)}`,             // Gul og Gratis, MT-07 A2 (48 hk -> ikke afgjort)
  'ekstern-nul': `annonce.html?id=${uuid(17)}`,   // uden pris og foto
  intern: `annonce.html?id=${uuid(901)}`,         // otte fotos
  'intern-eet': `annonce.html?id=${uuid(902)}`,   // ét foto, forhandler
  'intern-nul': `annonce.html?id=${uuid(903)}`,   // ingen fotos, ingen pris
};
const HOEJDE = { 375: 812, 430: 932, 768: 1024, 1440: 900, 1920: 1080 };

async function main(){
  const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
  const ud = path.resolve(arg('--ud', 'docs/review/gauntlet/v4/annonce/shots'));
  const viewports = arg('--viewports', '375,430,768,1440,1920').split(',').map(Number);
  const temaer = arg('--temaer', 'lys,moerk').split(',');
  const cases = arg('--cases', 'ekstern,intern').split(',');
  const kunTop = process.argv.includes('--top');
  const klip = Number(arg('--klip', 0));   // fuld side, men kun de første N px
  fs.mkdirSync(ud, { recursive: true });
  const kan = await playwrightTilgaengelig();
  const { server, port } = await startServer(REPO);
  const browser = await kan.pw.chromium.launch({ headless: true });
  try {
    for (const vp of viewports) for (const t of temaer){
      const tema = /^(m|d)/i.test(t) ? 'dark' : 'light';
      const ctx = await browser.newContext({ viewport: { width: vp, height: HOEJDE[vp] || 900 }, colorScheme: tema, locale: 'da-DK', serviceWorkers: 'block' });
      await ctx.addInitScript(tm => {
        try { localStorage.setItem('bb_theme', tm); localStorage.setItem('bb_cookie_consent', JSON.stringify({ level: 'necessary', date: new Date().toISOString() })); } catch (e) {}
      }, tema);
      await installer(ctx, port);
      for (const c of cases){
        const page = await ctx.newPage();
        await page.goto(`http://127.0.0.1:${port}/${CASES[c] || c}`, { waitUntil: 'load' });
        await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
        await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
        await page.waitForTimeout(500);
        await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700){ window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 200)); });
        const fil = path.join(ud, `${c}-${vp}-${tema === 'dark' ? 'moerk' : 'lys'}.png`);
        await page.screenshot({ path: fil, fullPage: !kunTop, ...(klip ? { clip: { x: 0, y: 0, width: vp, height: klip } } : {}) });
        await page.close();
      }
      await ctx.close();
    }
  } finally {
    await browser.close().catch(() => {});
    server.close();
  }
  console.log('Skærmbilleder i ' + ud);
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { installer, CASES, egne };
