/* Genererer scripts/kritisk-manifest.json: hvilke CSS-regler der tegner det, man ser, i hver sidefamilie.
   Kor:  node scripts/kritisk-gen.js [--familie koerekort,type] [--zone 1.5] [--maks 8] [--rod .] [--ud fil]

   Ingen Supabase, intet netvaerk: siderne serveres fra --rod (standard repoets rod) og al trafik udefra
   mockes med scripts/smoke-fixtures.js (samme net-mock som smoke-browser.js og visuel-regression.js).
   Den laeser kun committede sider + css/ og skriver kun manifestet.

   HVAD DER MAALES. For hver side i familien, ved 390x844 OG 1440x900, med friske cookies (cookiedialogen
   er oppe), paa to tidspunkter (efter DOMContentLoaded og efter at siden er faerdighydreret) og i tre
   temaer (as-is, data-theme=dark, data-theme=light):

     ZONE   = hvert element med en boks, hvis top ligger over --zone x viewporthoejden (standard 1,5),
              plus skjulte (boks-loese) elementer der staar FOER det sidste zone-element i dokumentet.
     KRIT   = hver regel, hvor en af vaelgerne (uden pseudo-elementer og hover/fokus/aktiv) rammer et
              ZONE-element; dertil enhver regel der skjuler/fastlaaser (display:none, visibility:hidden,
              position:fixed|sticky) og rammer et HVILKETSOM element paa siden — ellers ville en skjult
              menu/modal staa fremme, til det fulde ark lander.

   Foerste maling med udsnittet ser derfor samme kaskade som med det fulde ark for alt over folden. Hvad
   der IKKE fanges (et element, der foerst opstaar ved interaktion) behoever ikke vaere der ved foerste
   maling; det fulde ark lander kort efter. Se docs/review/gauntlet/builder-w12-kritisk.md. */

const fs = require('fs');
const path = require('path');
const sb = require('./smoke-browser');
const { uuid } = require('./smoke-fixtures');
const K = require('./kritisk-css');
const { FAMILIER } = require('./kritisk-familier');
const { lavBackend } = require('./w9-saelger-mock');

/* Sider bag login rendres med en fiktiv, indlogget forhandler (scripts/w9-saelger-mock.js) — ellers sendes man til login. */
const LOGGET_IND = new Set(['dashboard', 'mine-annoncer', 'opret-annonce']);

const REPO = path.join(__dirname, '..');
const MANIFEST = path.join(__dirname, 'kritisk-manifest.json');
const VIEWPORTE = [[390, 844], [1440, 900]];
const SKJUL = /display\s*:\s*none|visibility\s*:\s*hidden|position\s*:\s*(fixed|sticky)|content-visibility/i;

/* Vaelger uden det, der ikke findes ved foerste maling: pseudo-elementer og interaktionstilstande.
   Faar vi et tomt led (":hover > a"), saettes * ind. */
function rens(v){
  const M = '\u0001';
  const s = v
    .replace(/::?(before|after|first-line|first-letter|marker|placeholder|selection|backdrop|file-selector-button)(?![\w-])(\([^)]*\))?/gi, M)
    .replace(/::[\w-]+(\([^)]*\))?/g, M)
    .replace(/:(hover|active|focus|focus-visible|focus-within|visited|target|link|any-link)(?![\w-])/gi, M)
    // et fjernet led bliver til * hvis det stod alene i sin sammensatte vaelger; inde i :not() -> ugyldigt (= konservativt med)
    .replace(/\u0001/g, (m, off, str) => {
      const foer = off === 0 ? ' ' : str[off - 1], efter = off + 1 >= str.length ? ' ' : str[off + 1];
      if (foer === '(' && efter === ')') return '';
      return /[\s>+~(,]/.test(foer) && /[\s>+~),]/.test(efter) ? '*' : '';
    });
  return s.trim() || '*';
}

/* Kører i siden. Returnerer indeks i `vaelgere` (og `skjulVaelgere`), der rammer zonen / noget som helst. */
function iSiden({ vaelgere, skjulVaelgere, zone, temaer }){
  const vh = innerHeight, grænse = vh * zone;
  const alle = Array.from(document.querySelectorAll('*')).filter(e => document.body.contains(e) || e === document.body || e === document.documentElement);
  let sidst = -1;
  const harBoks = alle.map(e => e.getClientRects().length > 0);
  const zoneSæt = new Set();
  alle.forEach((e, i) => {
    if (!harBoks[i]) return;
    if (e === document.documentElement || e === document.body){ zoneSæt.add(e); sidst = Math.max(sidst, i); return; }
    const r = e.getBoundingClientRect();
    const top = r.top + scrollY;
    if (top < grænse && r.bottom + scrollY > 0 && (r.width > 0 || r.height > 0 || getComputedStyle(e).display === 'contents')){ zoneSæt.add(e); sidst = Math.max(sidst, i); }
  });
  alle.forEach((e, i) => { if (!harBoks[i] && i <= sidst && e !== document.documentElement) zoneSæt.add(e); });
  const rammer = new Set(), skjulRammer = new Set(), ugyldige = new Set();
  const gammelTema = document.documentElement.getAttribute('data-theme');
  for (const tema of temaer){
    if (tema === null) { /* as-is */ } else document.documentElement.setAttribute('data-theme', tema);
    vaelgere.forEach((s, i) => {
      if (rammer.has(i) || ugyldige.has(i)) return;
      try { for (const e of document.querySelectorAll(s)) if (zoneSæt.has(e)){ rammer.add(i); return; } }
      catch (err) { ugyldige.add(i); }
    });
    skjulVaelgere.forEach((s, i) => {
      if (skjulRammer.has(i)) return;
      try { if (document.querySelector(s)) skjulRammer.add(i); } catch (err) { skjulRammer.add(i); }
    });
  }
  if (gammelTema === null) document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', gammelTema);
  return { rammer: [...rammer], skjulRammer: [...skjulRammer], ugyldige: [...ugyldige], zoneStoerrelse: zoneSæt.size, elementer: alle.length };
}

/* Stilarkene en side bruger, i dokumentraekkefoelge (kun lokale css/*.css). */
function arkIside(html){
  const ud = [];
  for (const m of html.matchAll(/<link\b[^>]*\bhref="(css\/[a-zA-Z0-9._-]+\.css)(?:\?[^"]*)?"[^>]*>/g)){
    if (/rel="(stylesheet|preload)"/.test(m[0]) && !ud.includes(m[1])) ud.push(m[1]);
  }
  return ud;
}

function jævntUdvalg(liste, maks){
  if (liste.length <= maks) return liste;
  const ud = [];
  for (let i = 0; i < maks; i++) ud.push(liste[Math.round(i * (liste.length - 1) / (maks - 1))]);
  return [...new Set(ud)];
}

async function koer(opt = {}){
  const rod = path.resolve(opt.rod || REPO);
  const zone = Number(opt.zone) || 1.5;
  const maks = Number(opt.maks) || 8;
  const kunFamilier = opt.familie ? new Set(opt.familie) : null;
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) throw new Error(kan.grund);

  const htmlFiler = fs.readdirSync(rod).filter(f => f.endsWith('.html')).sort();
  const parset = {};   // css-fil -> {traeet, regler}
  const hentArk = fil => {
    if (!parset[fil]){
      const p = K.parse(fs.readFileSync(path.join(rod, fil), 'utf8'));
      if (p.farlig.length) throw new Error(`${fil}: ${p.farlig.join('; ')} — kan ikke afkortes sikkert`);
      parset[fil] = { traeet: p.traeet, regler: K.fladRegler(p.traeet) };
    }
    return parset[fil];
  };

  const { server, port } = await sb.startServer(rod);
  const browser = await kan.pw.chromium.launch({ headless: true });
  const blokeret = {};
  const resultat = {};
  try {
    for (const fam of FAMILIER){
      if (kunFamilier && !kunFamilier.has(fam.navn)) continue;
      const sider = jævntUdvalg(htmlFiler.filter(f => fam.re.test(f)), maks);
      if (!sider.length) continue;
      const krit = new Set();
      let ugyldige = 0;
      for (const [vw, vh] of VIEWPORTE){
        const context = await browser.newContext({ viewport: { width: vw, height: vh }, colorScheme: 'light', locale: 'da-DK', serviceWorkers: 'block' });
        if (LOGGET_IND.has(fam.navn)) await lavBackend({ loggetInd: true, forhandler: true, annoncer: [{}, {}, {}] }).installer(context, { tema: null, cookie: false });
        else await sb.installerMock(context, port, blokeret);
        for (const side of sider){
          const html = fs.readFileSync(path.join(rod, side), 'utf8');
          const ark = arkIside(html).map(hentArk);
          if (!ark.length) continue;
          const regler = ark.flatMap(a => a.regler);
          // Vaelgere (renset), unikke; kortlaeg til regler
          const unikke = new Map(), skjulUnikke = new Map();
          for (const r of regler){
            const erSkjul = SKJUL.test(r.krop);
            for (const v of K.splitVaelgere(r.vaelger)){
              const s = rens(v);
              const m = erSkjul ? skjulUnikke : unikke;
              if (!m.has(s)) m.set(s, []);
              m.get(s).push(r);
            }
          }
          const vaelgere = [...unikke.keys()], skjulVaelgere = [...skjulUnikke.keys()];
          const page = await context.newPage();
          const query = side === 'annonce.html' ? `?id=${uuid(1)}` : '';
          try {
            await page.goto(`http://127.0.0.1:${port}/${side}${query}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
            const maalSaet = [];
            const snap = async () => {
              for (let fors = 0; ; fors++){
                try {
                  // Maal foerst naar de fulde ark er anvendt — DCL kan fyres foer css'en er hentet (siden har ofte intet script, der venter paa den).
                  await page.waitForFunction(() => [...document.querySelectorAll('link[rel=stylesheet]')].every(l => l.sheet), null, { timeout: 20000 });
                  maalSaet.push(await page.evaluate(iSiden, { vaelgere, skjulVaelgere, zone, temaer: [null, 'dark', 'light'] })); return; }
                catch (e) { if (fors >= 3 || !/context was destroyed|navigat/i.test(String(e.message))) throw e; await page.waitForLoadState('load', { timeout: 20000 }).catch(() => {}); await page.waitForTimeout(300); }
              }
            };
            await snap();
            await page.waitForLoadState('load', { timeout: 20000 }).catch(() => {});
            await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
            await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
            await page.waitForTimeout(600);
            // Rolig DOM: ingen aendringer i 500 ms (hydrering/mock-svar kan komme sent paa en belastet maskine), max 10 s.
            await page.evaluate(() => new Promise(ok => { let t = setTimeout(ok, 500); const mo = new MutationObserver(() => { clearTimeout(t); t = setTimeout(ok, 500); }); mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true }); setTimeout(ok, 10000); })).catch(() => {});
            await snap();
            for (const m of maalSaet){
              for (const i of m.rammer) for (const r of unikke.get(vaelgere[i])) krit.add(r.noegle);
              for (const i of m.skjulRammer) for (const r of skjulUnikke.get(skjulVaelgere[i])) krit.add(r.noegle);
              // Ugyldige (browseren kan ikke parse den rensede vaelger): konservativt med.
              for (const i of m.ugyldige) for (const r of unikke.get(vaelgere[i])) krit.add(r.noegle);
              ugyldige += m.ugyldige.length;
            }
            if (!opt.stille) process.stderr.write('.');
          } catch (e) {
            process.stderr.write(`\n${fam.navn}/${side}@${vw}: ${String(e.message).split('\n')[0]}\n`);
            throw e;
          } finally {
            await page.close().catch(() => {});
          }
        }
        await context.close();
      }
      resultat[fam.navn] = { sider, krit, ugyldige };
      if (!opt.stille) process.stderr.write(` ${fam.navn}: ${sider.length} sider, ${krit.size} kritiske regler\n`);
    }
  } finally {
    await Promise.race([browser.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]);
    server.close();
  }

  // Manifest. `regler` = alle noegler (union over alle ark), `familier.<navn>.krit` = indeks heri.
  const alleArk = new Set();
  for (const f of htmlFiler) arkIside(fs.readFileSync(path.join(rod, f), 'utf8')).forEach(a => alleArk.add(a));
  for (const a of alleArk) hentArk(a);
  const noegler = [...new Set(Object.values(parset).flatMap(a => K.alleNoegler(a.traeet)))].sort();
  const indeks = new Map(noegler.map((n, i) => [n, i]));
  const familier = {};
  if (kunFamilier){
    try {
      const g = JSON.parse(fs.readFileSync(opt.ud || MANIFEST, 'utf8'));
      for (const [navn, f] of Object.entries(g.familier || {})){
        familier[navn] = { sider: f.sider, krit: f.krit.map(i => indeks.get(g.regler[i])).filter(i => i !== undefined).sort((a, b) => a - b) };
      }
    } catch (e) { /* intet gammelt manifest */ }
  }
  for (const [navn, r] of Object.entries(resultat)){
    familier[navn] = { sider: r.sider, krit: [...r.krit].map(k => indeks.get(k)).filter(i => i !== undefined).sort((a, b) => a - b) };
  }
  return { version: 1, zone, viewporte: VIEWPORTE.map(v => v.join('x')), regler: noegler, familier };
}

function parseArgs(argv){
  const o = {};
  for (let i = 0; i < argv.length; i++){
    const a = argv[i], n = () => argv[++i];
    if (a === '--familie') o.familie = n().split(',');
    else if (a === '--zone') o.zone = n();
    else if (a === '--maks') o.maks = n();
    else if (a === '--rod') o.rod = n();
    else if (a === '--ud') o.ud = path.resolve(n());
    else if (a === '--stille') o.stille = true;
    else throw new Error(`Ukendt argument: ${a}`);
  }
  return o;
}

module.exports = { koer, rens, arkIside, MANIFEST };

if (require.main === module){
  (async () => {
    const o = parseArgs(process.argv.slice(2));
    const m = await koer(o);
    fs.writeFileSync(o.ud || MANIFEST, JSON.stringify(m) + '\n');
    console.log(`kritisk-gen: ${Object.keys(m.familier).length} familier, ${m.regler.length} regler i manifestet -> ${o.ud || MANIFEST}`);
  })().catch(e => { console.error('kritisk-gen: ' + e.message); process.exit(1); });
}
