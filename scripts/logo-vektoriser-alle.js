/* Deterministisk batch: vektoriserer de 20 AI-logoudkast til img/brands/<slug>.svg (+ varianter) og skriver img/brands/assets.json.

   Kør:  node scripts/logo-vektoriser-alle.js                      (byg SVG'er + assets.json)
         node scripts/logo-vektoriser-alle.js --maal               (byg + rasteriser i Chromium, mål IoU, lav kontaktark i %TEMP%\logo-assets)
         node scripts/logo-vektoriser-alle.js --kun yamaha,honda   (kun disse; skriver ikke assets.json)
   Flag: --kilde <mappe>   mappen med kilde-PNG'erne (standard: C:\Users\pasca\Desktop\Bikerbasen billeder)
         --param '{json}'  tilsidesæt vektoriser-parametre (kun til forsøg; kør ikke med --kun for endelig assets.json)
         --ud-ark <mappe>  hvor kontaktark/diff-billeder lægges (standard: %TEMP%\logo-assets)

   Kildefilerne ligger uden for repoet og læses kun. Intet sættes til godkendt: godkendt=false for alle (ejer/jurist skal godkende).
   Exit 0 = ok, 1 = et mål (IoU) ikke opfyldt, 2 = kunne ikke køre. */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { vektoriser, laesPng, alfaMaske, blaekNiveau, fyldMaske, sletRegioner } = require('./logo-vektoriser');
const { enkodPng, dekodPng } = require('./visuel-regression');

const REPO = path.join(__dirname, '..');
const UD_MAPPE = path.join(REPO, 'img', 'brands');
const KILDE_STANDARD = 'C:\\Users\\pasca\\Desktop\\Bikerbasen billeder';
const PRE = 'ChatGPT-billede 17. okt. 2026, ';
const PROCES = 'AI-udkast → vektoriseret med scripts/logo-vektoriser.js';
const LICENS = 'Varemærke tilhører producenten; udkast ikke verificeret mod officiel fil';
const IOU_KRAV = 0.97, IOU64_KRAV = 0.93, IOU24_KRAV = 0.85;

/* Pr.-mærke-parametre. fjern = rektangler [x0,y0,x1,y1] i kildepixel (konturer hvis boks ligger helt indeni fjernes).
   varianter.<navn> = { behold: [rektangler] } (konturer hvis boksmidte ligger i et rektangel beholdes).
   hovedform = hvad hovedfilen består af (lockup = emblem + ordmærke, ordmaerke, emblem). */
/* Opdeling i emblem (øverst) og ordmærke (nederst): konturer, hvis boksmidte ligger over/under delelinjen y. */
const deling = y => ({ emblem: { behold: [[0, 0, 1254, y]] }, ordmaerke: { behold: [[0, y, 1254, 1254]] } });
const KUN_ORD = y => ({ ordmaerke: { behold: [[0, y[0], 1254, y[1]]] } });

const TABEL = [
  { slug: 'yamaha', navn: 'Yamaha', kilde: '13.14.47-1.png', hovedform: 'lockup', varianter: deling(880), autenticitet: 'ukendt' },
  { slug: 'honda', navn: 'Honda', kilde: '13.14.48-2.png', hovedform: 'lockup', varianter: deling(935), autenticitet: 'tvivlsom' },
  { slug: 'kawasaki', navn: 'Kawasaki', kilde: '13.14.48-3.png', hovedform: 'lockup', varianter: deling(750), autenticitet: 'ukendt' },
  { slug: 'bmw', navn: 'BMW', kilde: '13.14.49-4.png', hovedform: 'lockup', varianter: deling(850), autenticitet: 'ukendt' },
  { slug: 'ktm', navn: 'KTM', kilde: '13.14.50-5.png', hovedform: 'ordmaerke', autenticitet: 'ukendt' },
  { slug: 'ducati', navn: 'Ducati', kilde: '13.14.51-6.png', hovedform: 'emblem', autenticitet: 'tvivlsom' },
  { slug: 'suzuki', navn: 'Suzuki', kilde: '13.14.52-7.png', hovedform: 'lockup', varianter: deling(920), autenticitet: 'ukendt' },
  { slug: 'triumph', navn: 'Triumph', kilde: '13.14.53-8.png', hovedform: 'lockup', varianter: deling(895), autenticitet: 'tvivlsom' },
  { slug: 'harley-davidson', navn: 'Harley-Davidson', kilde: '13.14.54-9.png', hovedform: 'emblem', parametre: { tolerance: 0.9, glat: 1 },
    slet: [[1160, 720, 1200, 755]], autenticitet: 'ubrugelig', kraever_officiel_fil: true },
  { slug: 'royal-enfield', navn: 'Royal Enfield', kilde: '13.14.55-10.png', hovedform: 'lockup', varianter: deling(700), parametre: { tolerance: 0.8 }, autenticitet: 'tvivlsom' },
  { slug: 'aprilia', navn: 'Aprilia', kilde: '13.37.23-1.png', hovedform: 'ordmaerke', autenticitet: 'ukendt' },
  { slug: 'benelli', navn: 'Benelli', kilde: '13.37.24-2.png', hovedform: 'ordmaerke', parametre: { behold: [[0, 940, 1254, 1254]] },
    autenticitet: 'ubrugelig', kraever_officiel_fil: true,
    bemaerkninger: 'Kun ordmærket er med: løve-/laurbærkrans-emblemet (80 konturer) kan ikke kodes under 6 KB uden stort tab (13,9 KB ved IoU 0,962; 6,3 KB ved IoU 0,87). Skrifttypen er ikke Benellis egen.' },
  { slug: 'cfmoto', navn: 'CFMoto', kilde: '13.37.25-3.png', hovedform: 'lockup', varianter: deling(860), autenticitet: 'ukendt' },
  { slug: 'husqvarna', navn: 'Husqvarna', kilde: '13.37.26-4.png', hovedform: 'lockup', varianter: deling(870), autenticitet: 'tvivlsom' },
  { slug: 'indian', navn: 'Indian', kilde: '13.37.27-5.png', hovedform: 'lockup', varianter: deling(640), parametre: { tolerance: 1.2, glat: 1, minAreal: 100 },
    slet: [[1118, 862, 1168, 914]], autenticitet: 'ubrugelig', kraever_officiel_fil: true },
  { slug: 'moto-guzzi', navn: 'Moto Guzzi', kilde: '13.37.28-6.png', hovedform: 'lockup', varianter: deling(684), parametre: { tolerance: 0.5, glat: 1 }, autenticitet: 'tvivlsom' },
  { slug: 'mv-agusta', navn: 'MV Agusta', kilde: '13.37.28-7.png', hovedform: 'lockup', varianter: deling(975), parametre: { tolerance: 0.6, glat: 1 }, autenticitet: 'tvivlsom' },
  { slug: 'gasgas', navn: 'GasGas', kilde: '13.37.29-8.png', hovedform: 'lockup', varianter: deling(815), autenticitet: 'ukendt' },
  { slug: 'zero', navn: 'Zero', kilde: '13.37.30-9.png', hovedform: 'lockup', varianter: deling(700), slet: [[1158, 968, 1210, 1016]], autenticitet: 'ukendt' },
  { slug: 'piaggio', navn: 'Piaggio', kilde: '13.37.31-10.png', hovedform: 'lockup', varianter: deling(930), autenticitet: 'ukendt' },
];

const opts = b => Object.assign({ navn: b.navn, trim: true }, GLOBAL, b.parametre || {}, { fjern: b.fjern || [], slet: b.slet || [] });
const GLOBAL = { tolerance: 0.5, glat: 1 };
const hash = buf => crypto.createHash('sha256').update(buf).digest('hex');

function parseArgs(argv){
  const a = { maal: false, kun: null, kilde: KILDE_STANDARD, udArk: path.join(os.tmpdir(), 'logo-assets') };
  for (let i = 0; i < argv.length; i++){
    if (argv[i] === '--maal') a.maal = true;
    else if (argv[i] === '--kun') a.kun = argv[++i].split(',');
    else if (argv[i] === '--param') a.param = JSON.parse(argv[++i]);
    else if (argv[i] === '--kilde') a.kilde = argv[++i];
    else if (argv[i] === '--ud-ark') a.udArk = argv[++i];
    else throw new Error(`Ukendt flag: ${argv[i]}`);
  }
  return a;
}

/* ---------- Byg ---------- */

function byg(a){
  const udgaver = [];
  for (const b of TABEL){
    if (a.kun && !a.kun.includes(b.slug)) continue;
    const png = laesPng(path.join(a.kilde, PRE + b.kilde));
    const hoved = vektoriser(png, Object.assign(opts(b), a.param || {}));
    fs.mkdirSync(UD_MAPPE, { recursive: true });
    const filer = { [b.hovedform]: { fil: `${b.slug}.svg`, r: hoved, behold: null } };
    fs.writeFileSync(path.join(UD_MAPPE, `${b.slug}.svg`), hoved.svg);
    const varianter = {};
    for (const [navn, v] of Object.entries(b.varianter || {})){
      const r = vektoriser(png, Object.assign(opts(b), a.param || {}, { behold: v.behold, navn: `${b.navn} (${navn === 'emblem' ? 'emblem' : 'ordmærke'})` }));
      const fil = `${b.slug}-${navn}.svg`;
      fs.writeFileSync(path.join(UD_MAPPE, fil), r.svg);
      varianter[navn] = { fil, r, behold: v.behold };
    }
    udgaver.push({ b, png, hoved, varianter });
  }
  return udgaver;
}

/* ---------- Måling (Chromium) ---------- */

function referenceMaske(png, r){
  const iso = blaekNiveau(png) * 0.5;
  const kilde = alfaMaske(png, iso);
  const fjernet = r.alle.filter(k => k.status !== 'behold').map(k => k.raa);
  const fjernMaske = fjernet.length ? fyldMaske(fjernet, png.w, png.h) : null;
  const ref = new Uint8Array(kilde.length);
  for (let i = 0; i < ref.length; i++) ref[i] = kilde[i] && !(fjernMaske && fjernMaske[i]) ? 1 : 0;
  return ref;
}

function fraFil(p){ return 'file:///' + p.replace(/\\/g, '/').replace(/^\/+/, ''); }

async function renderSvg(page, htmlSti, svgSti, boks, clip){
  const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#fff}img{position:absolute;display:block}</style><img src="${fraFil(svgSti)}" style="${boks}">`;
  fs.writeFileSync(htmlSti, html);
  await page.goto(fraFil(htmlSti));
  await page.waitForFunction(() => document.images[0].complete);
  return dekodPng(await page.screenshot({ clip, type: 'png' }));
}

function integralBillede(ref, w, h){
  const I = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++){
    let rad = 0;
    for (let x = 0; x < w; x++){ rad += ref[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + rad; }
  }
  return (x, y) => {
    x = Math.max(0, Math.min(w, x)); y = Math.max(0, Math.min(h, y));
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const g = (i, j) => I[Math.min(h, j) * (w + 1) + Math.min(w, i)];
    return g(x0, y0) * (1 - fx) * (1 - fy) + g(x0 + 1, y0) * fx * (1 - fy) + g(x0, y0 + 1) * (1 - fx) * fy + g(x0 + 1, y0 + 1) * fx * fy;
  };
}

async function maalEn(page, tmp, u, variant, ra){
  const png = u.png;
  const r = ra.r;
  const meta = r.meta;
  const ref = referenceMaske(png, r, u.b);
  const [vbW, vbH] = meta.viewBox;
  const sc = meta.enhedPrPixel;
  const svgSti = path.join(UD_MAPPE, ra.fil);
  /* Fuld opløsning: 1254 px lærred, 1 enhed = 1/sc kildepixel */
  const imgW = vbW / sc, imgH = vbH / sc;
  const fuld = await renderSvg(page, path.join(tmp, 'm.html'), svgSti,
    `left:${meta.kildeX}px;top:${meta.kildeY}px;width:${imgW}px;height:${imgH}px`, { x: 0, y: 0, width: png.w, height: png.h });
  const raa = alfaMaske(png, blaekNiveau(png) * 0.5);
  let snit = 0, forening = 0, rSnit = 0, rForening = 0;
  const diff = Buffer.alloc(png.w * png.h * 4);
  for (let i = 0; i < ref.length; i++){
    const s = fuld.data[i * 4] < 128 ? 1 : 0, k = ref[i];
    if (s && raa[i]) rSnit++;
    if (s || raa[i]) rForening++;
    if (s && k) snit++;
    if (s || k) forening++;
    const d = i * 4;
    if (s && k){ diff[d] = diff[d + 1] = diff[d + 2] = 60; }
    else if (k){ diff[d] = 230; diff[d + 1] = 40; diff[d + 2] = 40; }
    else if (s){ diff[d] = 40; diff[d + 1] = 90; diff[d + 2] = 230; }
    else { diff[d] = diff[d + 1] = diff[d + 2] = 255; }
    diff[d + 3] = 255;
  }
  const iouFuld = forening ? snit / forening : 1;
  /* Blød IoU ved 64 og 24 px højde */
  const sum = integralBillede(ref, png.w, png.h);
  const blod = {};
  for (const H of [64, 24]){
    const W = Math.max(1, Math.round(vbW / vbH * H)), Wc = W;
    const rr = await renderSvg(page, path.join(tmp, 'm.html'), svgSti, `left:0;top:0;width:${W}px;height:${H}px`, { x: 0, y: 0, width: Wc, height: H });
    const pxX = W / vbW * sc, pxY = H / vbH * sc;
    let mn = 0, mx = 0;
    for (let j = 0; j < H; j++) for (let i = 0; i < Wc; i++){
      const x0 = meta.kildeX + i / pxX, x1 = meta.kildeX + (i + 1) / pxX;
      const y0 = meta.kildeY + j / pxY, y1 = meta.kildeY + (j + 1) / pxY;
      const areal = (x1 - x0) * (y1 - y0);
      const k = (sum(x1, y1) - sum(x0, y1) - sum(x1, y0) + sum(x0, y0)) / areal;
      const s = 1 - rr.data[(j * Wc + i) * 4] / 255;
      mn += Math.min(s, k); mx += Math.max(s, k);
    }
    blod[H] = mx ? mn / mx : 1;
  }
  return { fuld: iouFuld, fuldUfiltreret: rForening ? rSnit / rForening : 1, h64: blod[64], h24: blod[24], diff: { w: png.w, h: png.h, data: diff } };
}

function arkHtml(poster, tema, kolonner, flise){
  const lys = tema === 'lys';
  const bg = lys ? '#ffffff' : '#14141a', fg = lys ? '#1a1a1a' : '#f2f2f2', kant = lys ? '#d8d8dc' : '#33333c', tekst = lys ? '#555' : '#aaa';
  const [fw, fh, sw, sh] = flise;
  const celler = poster.map(p => {
    const [vw, vh] = p.viewBox;
    const sk = Math.min(sw / vw, sh / vh);
    const svg = p.svg.replace('<svg ', `<svg width="${(vw * sk).toFixed(2)}" height="${(vh * sk).toFixed(2)}" `);
    return `<div class="f"><div class="s">${svg}</div><div class="l">${p.etiket}</div></div>`;
  }).join('');
  return `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:${bg};color:${fg};font:12px/1.2 system-ui,sans-serif}
.g{display:grid;grid-template-columns:repeat(${kolonner},${fw}px);gap:0}.f{width:${fw}px;height:${fh}px;box-sizing:border-box;border:1px solid ${kant};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
.s{width:${sw}px;height:${sh}px;display:flex;align-items:center;justify-content:center;color:${fg}}.l{color:${tekst};font-size:11px}</style><div class="g">${celler}</div>`;
}

async function lavArk(browser, tmp, udArk, udgaver){
  const poster = udgaver.map(u => ({ etiket: u.b.navn, svg: u.hoved.svg.replace(/<\?xml[^>]*>/, '').trim(), viewBox: u.hoved.meta.viewBox }));
  const filer = [];
  const side = await browser.newPage({ deviceScaleFactor: 1 });
  for (const [navn, tema, flise, dsf] of [
    ['kontaktark-lys', 'lys', [240, 170, 190, 96], 1],
    ['kontaktark-moerk', 'moerk', [240, 170, 190, 96], 1],
  ]){
    const html = arkHtml(poster, tema, 5, flise);
    const sti = path.join(tmp, navn + '.html');
    fs.writeFileSync(sti, html);
    await side.setViewportSize({ width: 5 * flise[0], height: Math.ceil(poster.length / 5) * flise[1] });
    await side.goto(fraFil(sti));
    const png = path.join(udArk, navn + '.png');
    await side.screenshot({ path: png, fullPage: false });
    filer.push(png);
  }
  /* 24 px-ark (1:1 og 3x zoom) i lys og mørk: hver logo 24 px højt */
  for (const [navn, tema, dsf] of [['ark-24px-lys', 'lys', 1], ['ark-24px-moerk', 'moerk', 1], ['ark-24px-lys-3x', 'lys', 3]]){
    const s2 = await browser.newPage({ deviceScaleFactor: dsf });
    const lys = tema === 'lys';
    const celler = udgaver.map(u => {
      const [vw, vh] = u.hoved.meta.viewBox;
      const svg = u.hoved.svg.replace('<svg ', `<svg width="${(vw / vh * 24).toFixed(2)}" height="24" `);
      return `<div class="f"><div class="s">${svg}</div><div class="l">${u.b.navn}</div></div>`;
    }).join('');
    const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:${lys ? '#fff' : '#14141a'};color:${lys ? '#1a1a1a' : '#f2f2f2'};font:11px system-ui,sans-serif}
.g{display:grid;grid-template-columns:repeat(4,200px)}.f{height:52px;display:flex;align-items:center;gap:10px;padding:0 10px;border-bottom:1px solid ${lys ? '#e4e4e8' : '#2a2a32'}}.s{width:90px;display:flex;align-items:center}.l{opacity:.7}</style><div class="g">${celler}</div>`;
    const sti = path.join(tmp, navn + '.html');
    fs.writeFileSync(sti, html);
    await s2.setViewportSize({ width: 800, height: Math.ceil(udgaver.length / 4) * 52 });
    await s2.goto(fraFil(sti));
    const png = path.join(udArk, navn + '.png');
    await s2.screenshot({ path: png });
    await s2.close();
    filer.push(png);
  }
  await side.close();
  return filer;
}

async function maal(a, udgaver){
  const sb = require('./smoke-browser');
  const tilg = await sb.playwrightTilgaengelig();
  if (!tilg.ok){ console.error(tilg.grund); return null; }
  const browser = await tilg.pw.chromium.launch({ headless: true });
  const tmp = path.join(os.tmpdir(), 'logo-assets', 'tmp');
  fs.mkdirSync(tmp, { recursive: true });
  fs.mkdirSync(a.udArk, { recursive: true });
  const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: 1254, height: 1254 } });
  const res = {};
  for (const u of udgaver){
    const ra = { fil: `${u.b.slug}.svg`, r: u.hoved };
    res[u.b.slug] = { hoved: await maalEn(page, tmp, u, 'hoved', ra), varianter: {} };
    fs.writeFileSync(path.join(a.udArk, `diff-${u.b.slug}.png`), enkodPng(res[u.b.slug].hoved.diff));
    delete res[u.b.slug].hoved.diff;
    for (const [navn, v] of Object.entries(u.varianter)){
      const m = await maalEn(page, tmp, u, navn, v);
      delete m.diff;
      res[u.b.slug].varianter[navn] = m;
    }
  }
  const filer = await lavArk(browser, tmp, a.udArk, udgaver);
  await browser.close();
  return { res, filer };
}

/* ---------- assets.json ---------- */

function skrivAssets(udgaver, maaling, eksisterende){
  const ud = {};
  for (const u of udgaver){
    const { b } = u;
    const filInfo = (fil, r) => {
      const buf = fs.readFileSync(path.join(UD_MAPPE, fil));
      return { fil: `img/brands/${fil}`, forhold: Math.round(r.meta.viewBox[0] / r.meta.viewBox[1] * 10000) / 10000, viewBox: `0 0 ${r.meta.viewBox[0]} ${r.meta.viewBox[1]}`, stoerrelse_bytes: buf.length, sha256: hash(buf) };
    };
    const hoved = filInfo(`${b.slug}.svg`, u.hoved);
    const m = maaling && maaling.res[b.slug];
    const gammel = eksisterende && eksisterende[b.slug];
    const iou = f => f ? { fuld: round(f.fuld), fuld_ufiltreret: round(f.fuldUfiltreret), h64: round(f.h64), h24: round(f.h24) } : null;
    const varianter = {};
    for (const [navn, v] of Object.entries(u.varianter)){
      varianter[navn] = Object.assign(filInfo(v.fil, v.r), { iou: m ? iou(m.varianter[navn]) : (gammel && gammel.varianter[navn] ? gammel.varianter[navn].iou : null) });
    }
    ud[b.slug] = {
      navn: b.navn,
      fil: hoved.fil,
      hovedform: b.hovedform,
      varianter,
      forhold: hoved.forhold,
      viewBox: hoved.viewBox,
      stoerrelse_bytes: hoved.stoerrelse_bytes,
      sha256: hoved.sha256,
      kildefil: PRE + b.kilde,
      proces: PROCES,
      licens: LICENS,
      autenticitet: b.autenticitet || 'ukendt',
      kraever_officiel_fil: !!b.kraever_officiel_fil,
      godkendt: false,
      iou: m ? iou(m.hoved) : (gammel ? gammel.iou : null),
      maaling: { kilde_x: round(u.hoved.meta.kildeX, 2), kilde_y: round(u.hoved.meta.kildeY, 2), enhed_pr_pixel: round(u.hoved.meta.enhedPrPixel, 5) },
      bemaerkninger: b.bemaerkninger || '',
    };
  }
  return ud;
}
const round = (v, d = 4) => Math.round(v * 10 ** d) / 10 ** d;

async function main(argv){
  const a = parseArgs(argv);
  const udgaver = byg(a);
  let maaling = null;
  if (a.maal) maaling = await maal(a, udgaver);
  let fejl = 0;
  if (maaling){
    console.log('mærke            bytes  konturer  IoU(1254)  rå-IoU  blød64  blød24');
    for (const u of udgaver){
      const m = maaling.res[u.b.slug].hoved;
      const bytes = Buffer.byteLength(u.hoved.svg);
      const ok = m.fuld >= IOU_KRAV && m.h64 >= IOU64_KRAV && m.h24 >= IOU24_KRAV && bytes < 6144;
      if (!ok) fejl++;
      console.log(`${u.b.slug.padEnd(16)} ${String(bytes).padStart(5)}  ${String(u.hoved.meta.konturer).padStart(8)}  ${m.fuld.toFixed(4).padStart(9)}  ${m.fuldUfiltreret.toFixed(4).padStart(6)}  ${m.h64.toFixed(3).padStart(6)}  ${m.h24.toFixed(3).padStart(6)} ${ok ? '' : ' <-- UNDER KRAV'}`);
      for (const [n, v] of Object.entries(maaling.res[u.b.slug].varianter)){
        const by = Buffer.byteLength(u.varianter[n].r.svg);
        console.log(`  ${n.padEnd(14)} ${String(by).padStart(5)}  ${String(u.varianter[n].r.meta.konturer).padStart(8)}  ${v.fuld.toFixed(4).padStart(9)}  ${' '.repeat(6)}  ${v.h64.toFixed(3).padStart(6)}  ${v.h24.toFixed(3).padStart(6)}`);
      }
    }
    console.log('Ark:\n  ' + maaling.filer.join('\n  '));
  } else {
    for (const u of udgaver) console.log(`${u.b.slug.padEnd(16)} ${String(Buffer.byteLength(u.hoved.svg)).padStart(5)} byte  ${u.hoved.meta.konturer} konturer`);
  }
  if (!a.kun){
    const stiAssets = path.join(UD_MAPPE, 'assets.json');
    let eks = null;
    try { eks = JSON.parse(fs.readFileSync(stiAssets, 'utf8')); } catch (e) { /* første kørsel */ }
    fs.writeFileSync(stiAssets, JSON.stringify(skrivAssets(udgaver, maaling, eks), null, 2) + '\n');
  }
  return fejl ? 1 : 0;
}

if (require.main === module){
  main(process.argv.slice(2)).then(c => { process.exitCode = c; }, e => { console.error(e.stack || e.message); process.exitCode = 2; });
}

module.exports = { TABEL, PRE, byg, referenceMaske, skrivAssets, IOU_KRAV, IOU64_KRAV, IOU24_KRAV };
