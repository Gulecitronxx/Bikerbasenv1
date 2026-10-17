/* Logo-vektoriser: gentegner et ensfarvet PNG-udkast (alfa-kanal) som ren SVG. Offline, deterministisk, uden npm-afhængigheder.

   Kør:  node scripts/logo-vektoriser.js --ind kilde.png --ud img/brands/yamaha.svg --navn Yamaha [--trim] [--min-areal 60] [--tolerance 1]
   Flag: --trim              beskær viewBox tæt om indholdet (+ polstring). Uden --trim bruges hele lærredet.
         --tol-smaa X        tolerance for konturer med areal under --smaa-graense (små detaljer forenkles mere; standard 0 = fra)
         --smaa-graense N    arealgrænse for --tol-smaa (kildepixel², standard 10000)
         --min-areal N       konturer med mindre areal (kildepixel²) fjernes som støj/pletter (standard 60)
         --tolerance X       maks. afvigelse i kildepixel for kurvetilpasning (standard 1.0; højere = mindre fil)
         --fjern x0,y0,x1,y1 fjern konturer, hvis boks ligger helt i rektanglet (kan gentages; ®, stray streger)
         --slet x0,y0,x1,y1  ryd alfa i rektanglet (halo/®, der rører andre former), før der tegnes (kan gentages)
         --behold x0,y0,x1,y1 behold kun konturer, hvis boksmidte ligger i rektanglet (kan gentages; varianter)
         --enhed N           længste side af viewBox i enheder (standard 1000)
         --decimaler N       decimaler i path-data (standard 0; enhed 1000 giver ca. 0,1 % præcision)
         --polstring F       polstring som andel af længste side (standard 0.03)
         --glat N            antal udjævningsrunder på konturen (standard 2)
         --vinkel G          hjørnevinkel i grader (standard 55)

   Metode: alfa -> skalarfelt, marching squares ved halv blæk-dækning (delpixel-præcision), udjævning, resampling,
   hjørnedetektion, Schneider-kurvetilpasning (kubiske Bézier-kurver, rette stykker bliver til l/h/v), fill-rule=evenodd
   så huller (O, A, R, D) bevares. Output er ÉN <path> med fill="currentColor".

   Brug som modul: const { vektoriser, konturer, fyldMaske, laesPng } = require('./logo-vektoriser'); */

const fs = require('fs');
const path = require('path');
const { dekodPng } = require('./visuel-regression');

const STANDARD = {
  navn: 'Logo', trim: true, minAreal: 60, tolerance: 1.0, tolSmaa: 0, smaaGraense: 10000, fjern: [], slet: [], behold: null,
  enhed: 1000, decimaler: 0, polstring: 0.03, glat: 2, vinkel: 55,
};

function laesPng(fil){ return dekodPng(fs.readFileSync(fil)); }

/* Returnerer en kopi af billedet, hvor alfa er nulstillet i rektanglerne [x0,y0,x1,y1] (kildepixel, x1/y1 eksklusive). */
function sletRegioner(png, rects){
  if (!rects || !rects.length) return png;
  const data = Buffer.from(png.data);
  for (const [x0, y0, x1, y1] of rects){
    for (let y = Math.max(0, Math.ceil(y0)); y < Math.min(png.h, Math.ceil(y1)); y++){
      for (let x = Math.max(0, Math.ceil(x0)); x < Math.min(png.w, Math.ceil(x1)); x++) data[(y * png.w + x) * 4 + 3] = 0;
    }
  }
  return { w: png.w, h: png.h, data };
}

/* ---------- Alfa-felt og blæk-niveau ---------- */

/* Blæk-niveau = 90. percentil af ikke-gennemsigtige alfa-værdier (0..1). Iso = halvdelen. */
function blaekNiveau(png){
  const hist = new Uint32Array(256);
  let n = 0;
  for (let i = 3; i < png.data.length; i += 4){ const a = png.data[i]; if (a > 40){ hist[a]++; n++; } }
  if (!n) return 1;
  let acc = 0;
  const maal = n * 0.9;
  for (let v = 0; v < 256; v++){ acc += hist[v]; if (acc >= maal) return Math.max(v, 128) / 255; }
  return 1;
}

function alfaMaske(png, iso){
  const m = new Uint8Array(png.w * png.h);
  const graense = iso * 255;
  for (let i = 0; i < m.length; i++) m[i] = png.data[i * 4 + 3] >= graense ? 1 : 0;
  return m;
}

/* ---------- Marching squares ---------- */

/* Returnerer lukkede konturer som arrays af [x, y] i billedkoordinater (pixelcentrum = +0.5). */
function marchingSquares(png, iso){
  const w = png.w, h = png.h, PW = w + 2, PH = h + 2;
  const felt = new Float32Array(PW * PH);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) felt[(y + 1) * PW + x + 1] = png.data[(y * w + x) * 4 + 3] / 255;
  const v = (x, y) => felt[y * PW + x];
  /* Kantnøgle: vandret kant (x,y)-(x+1,y) = 2*(y*PW+x); lodret kant (x,y)-(x,y+1) = 2*(y*PW+x)+1 */
  const adj = new Map();
  const bind = (a, b) => {
    let l = adj.get(a); if (!l){ l = []; adj.set(a, l); } l.push(b);
    l = adj.get(b); if (!l){ l = []; adj.set(b, l); } l.push(a);
  };
  for (let y = 0; y < PH - 1; y++){
    for (let x = 0; x < PW - 1; x++){
      const tl = v(x, y), tr = v(x + 1, y), br = v(x + 1, y + 1), bl = v(x, y + 1);
      const idx = (tl >= iso ? 8 : 0) | (tr >= iso ? 4 : 0) | (br >= iso ? 2 : 0) | (bl >= iso ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const T = 2 * (y * PW + x), B = 2 * ((y + 1) * PW + x), L = 2 * (y * PW + x) + 1, R = 2 * (y * PW + x + 1) + 1;
      switch (idx){
        case 1: bind(L, B); break; case 2: bind(B, R); break; case 3: bind(L, R); break;
        case 4: bind(T, R); break; case 6: bind(T, B); break; case 7: bind(T, L); break;
        case 8: bind(T, L); break; case 9: bind(T, B); break; case 11: bind(T, R); break;
        case 12: bind(L, R); break; case 13: bind(B, R); break; case 14: bind(L, B); break;
        case 5: case 10: {
          const midt = (tl + tr + br + bl) / 4 >= iso;
          if ((idx === 5) === midt){ bind(T, L); bind(B, R); } else { bind(T, R); bind(L, B); }
          break;
        }
      }
    }
  }
  const pos = key => {
    const horisontal = (key & 1) === 0, k = key >> 1, y = Math.floor(k / PW), x = k % PW;
    if (horisontal){ const a = v(x, y), b = v(x + 1, y); return [x + (iso - a) / (b - a) - 0.5, y - 0.5]; }
    const a = v(x, y), b = v(x, y + 1);
    return [x - 0.5, y + (iso - a) / (b - a) - 0.5];
  };
  const besoegt = new Set();
  const loops = [];
  const noegler = Array.from(adj.keys()).sort((a, b) => a - b);
  for (const start of noegler){
    if (besoegt.has(start)) continue;
    const loop = [];
    let forrige = -1, nu = start;
    while (nu !== undefined && !besoegt.has(nu)){
      besoegt.add(nu);
      loop.push(pos(nu));
      const naboer = adj.get(nu);
      const naeste = naboer[0] !== forrige ? naboer[0] : naboer[1];
      forrige = nu;
      nu = naeste;
    }
    if (loop.length >= 4) loops.push(loop);
  }
  return loops;
}

/* ---------- Geometri-hjælp ---------- */

function signeretAreal(p){
  let a = 0;
  for (let i = 0, n = p.length; i < n; i++){ const q = p[(i + 1) % n]; a += p[i][0] * q[1] - q[0] * p[i][1]; }
  return a / 2;
}
function boks(p){
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of p){ if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1 };
}
function udjaevn(p, runder){
  let q = p;
  for (let r = 0; r < runder; r++){
    const n = q.length, ny = new Array(n);
    for (let i = 0; i < n; i++){
      const a = q[(i + n - 1) % n], b = q[i], c = q[(i + 1) % n];
      ny[i] = [(a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4];
    }
    q = ny;
  }
  return q;
}
/* Resampler en lukket polylinje til jævn afstand (standard 1 px). */
function resample(p, trin){
  const n = p.length;
  const kumul = [0];
  for (let i = 0; i < n; i++){
    const a = p[i], b = p[(i + 1) % n];
    kumul.push(kumul[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = kumul[n];
  const antal = Math.max(8, Math.round(total / trin));
  const ud = [];
  let seg = 0;
  for (let k = 0; k < antal; k++){
    const s = total * k / antal;
    while (kumul[seg + 1] < s) seg++;
    const a = p[seg], b = p[(seg + 1) % n];
    const t = (s - kumul[seg]) / ((kumul[seg + 1] - kumul[seg]) || 1);
    ud.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return ud;
}

/* ---------- Hjørnedetektion ---------- */

function findHjoerner(p, vinkelGrader, vindue){
  const n = p.length, w = Math.min(vindue, Math.floor(n / 4));
  const vinkel = new Float64Array(n);
  for (let i = 0; i < n; i++){
    const a = p[(i - w + n) % n], b = p[i], c = p[(i + w) % n];
    const v1 = [b[0] - a[0], b[1] - a[1]], v2 = [c[0] - b[0], c[1] - b[1]];
    const l1 = Math.hypot(v1[0], v1[1]), l2 = Math.hypot(v2[0], v2[1]);
    if (!l1 || !l2){ vinkel[i] = 0; continue; }
    const cos = Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2)));
    vinkel[i] = Math.acos(cos) * 180 / Math.PI;
  }
  const hjoerner = [];
  for (let i = 0; i < n; i++){
    if (vinkel[i] < vinkelGrader) continue;
    let max = true;
    for (let k = 1; k <= w && max; k++){
      if (vinkel[(i - k + n) % n] >= vinkel[i] || vinkel[(i + k) % n] > vinkel[i]) max = false;
    }
    if (max) hjoerner.push(i);
  }
  /* Fjern dubletter fra plateauer: behold første i en gruppe nærmere end vinduet. */
  const rene = [];
  for (const i of hjoerner){
    if (rene.length && i - rene[rene.length - 1] < w) continue;
    rene.push(i);
  }
  if (rene.length > 1 && rene[0] + n - rene[rene.length - 1] < w) rene.pop();
  return rene;
}

/* ---------- Schneider-kurvetilpasning (Graphics Gems) ---------- */

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, s) => [a[0] * s, a[1] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const laengde = a => Math.hypot(a[0], a[1]);
function enhed(a){ const l = laengde(a); return l ? [a[0] / l, a[1] / l] : [0, 0]; }

const B0 = u => (1 - u) ** 3, B1 = u => 3 * u * (1 - u) ** 2, B2 = u => 3 * u * u * (1 - u), B3 = u => u ** 3;
function bezierAt(b, t){
  const m = 1 - t;
  return [
    m * m * m * b[0][0] + 3 * m * m * t * b[1][0] + 3 * m * t * t * b[2][0] + t * t * t * b[3][0],
    m * m * m * b[0][1] + 3 * m * m * t * b[1][1] + 3 * m * t * t * b[2][1] + t * t * t * b[3][1],
  ];
}
function chordParam(d, first, last){
  const u = [0];
  for (let i = first + 1; i <= last; i++) u.push(u[i - first - 1] + laengde(sub(d[i], d[i - 1])));
  const t = u[last - first] || 1;
  for (let i = 1; i <= last - first; i++) u[i] /= t;
  return u;
}
function genererBezier(d, first, last, u, t1, t2){
  const n = last - first + 1;
  const p0 = d[first], p3 = d[last];
  let c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
  for (let i = 0; i < n; i++){
    const a0 = mul(t1, B1(u[i])), a1 = mul(t2, B2(u[i]));
    c00 += dot(a0, a0); c01 += dot(a0, a1); c11 += dot(a1, a1);
    const tmp = sub(d[first + i], add(mul(p0, B0(u[i]) + B1(u[i])), mul(p3, B2(u[i]) + B3(u[i]))));
    x0 += dot(a0, tmp); x1 += dot(a1, tmp);
  }
  const det = c00 * c11 - c01 * c01;
  const detX = c00 * x1 - c01 * x0, detY = x0 * c11 - x1 * c01;
  let al = det === 0 ? 0 : detY / det, ar = det === 0 ? 0 : detX / det;
  const sl = laengde(sub(p3, p0)), eps = 1e-6 * sl;
  if (al < eps || ar < eps || al > sl * 1.5 || ar > sl * 1.5){ al = ar = sl / 3; }
  return [p0, add(p0, mul(t1, al)), add(p3, mul(t2, ar)), p3];
}
function nyParam(d, first, last, u, b){
  const ud = [];
  for (let i = 0; i <= last - first; i++){
    const t = u[i], m = 1 - t;
    const q = bezierAt(b, t);
    const q1 = [3 * m * m * (b[1][0] - b[0][0]) + 6 * m * t * (b[2][0] - b[1][0]) + 3 * t * t * (b[3][0] - b[2][0]),
      3 * m * m * (b[1][1] - b[0][1]) + 6 * m * t * (b[2][1] - b[1][1]) + 3 * t * t * (b[3][1] - b[2][1])];
    const q2 = [6 * m * (b[2][0] - 2 * b[1][0] + b[0][0]) + 6 * t * (b[3][0] - 2 * b[2][0] + b[1][0]),
      6 * m * (b[2][1] - 2 * b[1][1] + b[0][1]) + 6 * t * (b[3][1] - 2 * b[2][1] + b[1][1])];
    const diff = sub(q, d[first + i]);
    const taeller = dot(diff, q1), naevner = dot(q1, q1) + dot(diff, q2);
    ud.push(naevner === 0 ? t : Math.min(1, Math.max(0, t - taeller / naevner)));
  }
  return ud;
}
function maxFejl(d, first, last, b, u){
  let split = Math.floor((last - first + 1) / 2), maks = 0;
  for (let i = first + 1; i < last; i++){
    const dist = sub(bezierAt(b, u[i - first]), d[i]);
    const e = dot(dist, dist);
    if (e >= maks){ maks = e; split = i; }
  }
  return { maks, split };
}
function tilpasKubisk(d, first, last, t1, t2, fejl, ud, dybde){
  const nPts = last - first + 1;
  if (nPts === 2){
    const dist = laengde(sub(d[last], d[first])) / 3;
    ud.push([d[first], add(d[first], mul(t1, dist)), add(d[last], mul(t2, dist)), d[last]]);
    return;
  }
  let u = chordParam(d, first, last);
  let b = genererBezier(d, first, last, u, t1, t2);
  let { maks, split } = maxFejl(d, first, last, b, u);
  if (maks < fejl * fejl){ ud.push(b); return; }
  if (maks < fejl * fejl * 16){
    for (let i = 0; i < 6; i++){
      const u2 = nyParam(d, first, last, u, b);
      b = genererBezier(d, first, last, u2, t1, t2);
      const r = maxFejl(d, first, last, b, u2);
      if (r.maks < fejl * fejl){ ud.push(b); return; }
      maks = r.maks; split = r.split; u = u2;
    }
  }
  if (dybde > 40 || split <= first || split >= last){ ud.push(b); return; }
  const centrum = enhed(sub(d[split - 1], d[split + 1]));
  tilpasKubisk(d, first, split, t1, centrum, fejl, ud, dybde + 1);
  tilpasKubisk(d, split, last, mul(centrum, -1), t2, fejl, ud, dybde + 1);
}

/* Forsøg at tilpasse d[first..last] med ÉN kubisk kurve. Returnerer { b, ok }. */
function enKurve(d, first, last, t1, t2, fejl){
  if (last - first === 1){
    const dist = laengde(sub(d[last], d[first])) / 3;
    return { b: [d[first], add(d[first], mul(t1, dist)), add(d[last], mul(t2, dist)), d[last]], ok: true };
  }
  let u = chordParam(d, first, last);
  let b = genererBezier(d, first, last, u, t1, t2);
  let r = maxFejl(d, first, last, b, u);
  if (r.maks < fejl * fejl) return { b, ok: true };
  if (r.maks > fejl * fejl * 16) return { b, ok: false };
  for (let i = 0; i < 6; i++){
    u = nyParam(d, first, last, u, b);
    b = genererBezier(d, first, last, u, t1, t2);
    r = maxFejl(d, first, last, b, u);
    if (r.maks < fejl * fejl) return { b, ok: true };
  }
  return { b, ok: false };
}

/* Tilpas en åben punktfølge d[0..n-1] med givne ende-tangenter (enhedsvektorer, pegende ind i kurven).
   Grådig: længste præfiks, der kan beskrives af én kurve (binær søgning), så antallet af segmenter bliver lavt. */
function tilpasStykke(d, t1, t2, tolerance, m){
  const sidste = d.length - 1;
  const ud = [];
  let s = 0, tStart = t1;
  const tangentVed = (e, s0) => {
    const k = Math.max(1, Math.min(m, e - s0, sidste - e));
    return enhed(sub(d[e - k], d[e + k]));
  };
  while (s < sidste){
    const helt = enKurve(d, s, sidste, tStart, t2, tolerance);
    if (helt.ok){ ud.push(helt.b); break; }
    let lo = s + 1, hi = sidste - 1, bedst = null;
    let loRes = enKurve(d, s, lo, tStart, tangentVed(lo, s), tolerance);
    bedst = { e: lo, r: loRes };
    while (lo < hi){
      const mid = Math.ceil((lo + hi) / 2);
      const r = enKurve(d, s, mid, tStart, tangentVed(mid, s), tolerance);
      if (r.ok){ lo = mid; bedst = { e: mid, r }; } else hi = mid - 1;
    }
    ud.push(bedst.r.b);
    tStart = mul(tangentVed(bedst.e, s), -1);
    s = bedst.e;
  }
  return ud;
}

/* Gør en lukket kontur til en liste af segmenter: { type:'l', til } eller { type:'c', c1, c2, til }, start = punkt 0. */
function tilpasKontur(p, o){
  const n = p.length;
  const m = Math.min(4, Math.floor(n / 6));
  const tang = (i, retning) => enhed(sub(p[(i + retning * m + n * 4) % n], p[i]));
  let hjoerner = findHjoerner(p, o.vinkel, 4);
  let skaer;
  if (hjoerner.length === 0){
    skaer = [0, Math.floor(n / 2)];
    hjoerner = [];
  } else skaer = hjoerner;
  const erHjoerne = new Set(hjoerner);
  const segmenter = [];
  const k = skaer.length;
  const start = p[skaer[0]];
  for (let s = 0; s < k; s++){
    const i = skaer[s], j = skaer[(s + 1) % k];
    const pts = [];
    let idx = i;
    do { pts.push(p[idx]); idx = (idx + 1) % n; } while (idx !== j);
    pts.push(p[j]);
    if (pts.length < 2) continue;
    const t1 = erHjoerne.has(i) ? tang(i, 1) : enhed(sub(p[(i + m) % n], p[(i - m + n) % n]));
    const t2 = erHjoerne.has(j) ? tang(j, -1) : enhed(sub(p[(j - m + n) % n], p[(j + m) % n]));
    const kurver = tilpasStykke(pts, t1, t2, o.tolerance, m);
    for (const b of kurver) segmenter.push(sigVaerdi(b, o.tolerance));
  }
  return { start, segmenter };
}

/* Næsten rette kurver bliver til linjestykker. */
function sigVaerdi(b, tol){
  const [p0, c1, c2, p3] = b;
  const l = laengde(sub(p3, p0));
  if (l < 1e-9) return { type: 'l', til: p3 };
  const afst = c => Math.abs((c[0] - p0[0]) * (p3[1] - p0[1]) - (c[1] - p0[1]) * (p3[0] - p0[0])) / l;
  if (afst(c1) < tol * 0.8 && afst(c2) < tol * 0.8) return { type: 'l', til: p3 };
  return { type: 'c', c1, c2, til: p3 };
}

/* ---------- Path-data ---------- */

function tal(v, dec){
  let s = (Math.round(v * 10 ** dec) / 10 ** dec).toFixed(dec);
  if (dec > 0) s = s.replace(/\.?0+$/, '');
  if (s === '-0' || s === '') s = '0';
  s = s.replace(/^(-?)0\./, '$1.');
  return s;
}
function sammen(tegn, vaerdier, dec, forrigeSlutter){
  let s = tegn;
  vaerdier.forEach((v, i) => {
    const t = tal(v, dec);
    if (i > 0 || (tegn === '' && forrigeSlutter !== undefined)){
      const forrige = i > 0 ? tal(vaerdier[i - 1], dec) : forrigeSlutter;
      if (!t.startsWith('-') && !(t.startsWith('.') && forrige.includes('.'))) s += ' ';
    }
    s += t;
  });
  return s;
}

function lavPathData(konturer, o){
  const dec = o.decimaler, f = 10 ** dec;
  const r = v => Math.round(v * f) / f;
  const dele = [];
  for (const k of konturer){
    const tr = pt => [(pt[0] - o.x0) * o.skala + o.polstringEnh, (pt[1] - o.y0) * o.skala + o.polstringEnh];
    let nu = tr(k.start).map(r);
    let d = sammen('M', nu, dec);
    let sidsteKmd = 'M', sidsteTal = tal(nu[1], dec);
    const emit = (kmd, v) => {
      const bogstav = kmd === sidsteKmd && (kmd === 'c' || kmd === 'l') ? '' : kmd;
      d += sammen(bogstav, v, dec, sidsteTal);
      sidsteKmd = kmd; sidsteTal = tal(v[v.length - 1], dec);
    };
    for (const s of k.segmenter){
      const til = tr(s.til).map(r);
      if (s.type === 'l'){
        const dx = r(til[0] - nu[0]), dy = r(til[1] - nu[1]);
        if (dx === 0 && dy === 0) continue;
        if (dy === 0) emit('h', [dx]);
        else if (dx === 0) emit('v', [dy]);
        else emit('l', [dx, dy]);
      } else {
        const c1 = tr(s.c1).map(r), c2 = tr(s.c2).map(r);
        emit('c', [c1[0] - nu[0], c1[1] - nu[1], c2[0] - nu[0], c2[1] - nu[1], til[0] - nu[0], til[1] - nu[1]].map(r));
      }
      nu = til;
    }
    dele.push(d + 'z');
  }
  return dele.join('');
}

/* ---------- Fyld/polygon-maske (evenodd) til kvalitetsmåling ---------- */

/* Rasteriserer konturer (arrays af [x,y]) med evenodd; pixel (i,j) er sat hvis dens centre (i+.5, j+.5) er indenfor. */
function fyldMaske(konturListe, w, h){
  const m = new Uint8Array(w * h);
  const kryds = Array.from({ length: h }, () => []);
  for (const p of konturListe){
    const n = p.length;
    for (let i = 0; i < n; i++){
      const a = p[i], b = p[(i + 1) % n];
      if (a[1] === b[1]) continue;
      const [lav, hoej] = a[1] < b[1] ? [a, b] : [b, a];
      const j0 = Math.max(0, Math.ceil(lav[1] - 0.5)), j1 = Math.min(h - 1, Math.ceil(hoej[1] - 0.5) - 1);
      for (let j = j0; j <= j1; j++){
        const t = (j + 0.5 - lav[1]) / (hoej[1] - lav[1]);
        kryds[j].push(lav[0] + t * (hoej[0] - lav[0]));
      }
    }
  }
  for (let j = 0; j < h; j++){
    const xs = kryds[j].sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2){
      const i0 = Math.max(0, Math.ceil(xs[k] - 0.5)), i1 = Math.min(w - 1, Math.ceil(xs[k + 1] - 0.5) - 1);
      for (let i = i0; i <= i1; i++) m[j * w + i] = 1;
    }
  }
  return m;
}

/* ---------- Hovedfunktion ---------- */

const iBoks = (b, r) => b.x0 >= r[0] && b.y0 >= r[1] && b.x1 <= r[2] && b.y1 <= r[3];
const midtIBoks = (b, r) => { const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2; return cx >= r[0] && cx <= r[2] && cy >= r[1] && cy <= r[3]; };

function xmlEsc(s){ return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/* Udtrækker og klassificerer konturer: { rå (udjævnet, resamplet), boks, areal, status: 'behold'|'stoej'|'fjernet'|'andet' }. */
function konturer(png0, opt){
  const o = Object.assign({}, STANDARD, opt || {});
  const png = sletRegioner(png0, o.slet);
  const iso = blaekNiveau(png) * 0.5;
  const rå = marchingSquares(png, iso);
  const ud = rå.map(p => {
    const areal = Math.abs(signeretAreal(p));
    const b = boks(p);
    let status = 'behold';
    if (areal < o.minAreal) status = 'stoej';
    else if (o.fjern.some(r => iBoks(b, r))) status = 'fjernet';
    else if (o.behold && !o.behold.some(r => midtIBoks(b, r))) status = 'andet';
    return { raa: p, boks: b, areal, status };
  });
  return { konturer: ud, iso };
}

function vektoriser(png, opt){
  const o = Object.assign({}, STANDARD, opt || {});
  const { konturer: alle, iso } = konturer(png, o);
  const brugt = alle.filter(k => k.status === 'behold');
  if (!brugt.length) throw new Error('Ingen konturer tilbage efter filtrering');
  let bb = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const k of brugt){ bb.x0 = Math.min(bb.x0, k.boks.x0); bb.y0 = Math.min(bb.y0, k.boks.y0); bb.x1 = Math.max(bb.x1, k.boks.x1); bb.y1 = Math.max(bb.y1, k.boks.y1); }
  if (!o.trim) bb = { x0: 0, y0: 0, x1: png.w, y1: png.h };
  const bw = bb.x1 - bb.x0, bh = bb.y1 - bb.y0;
  const laengst = Math.max(bw, bh);
  const pad = laengst * o.polstring;
  const skala = o.enhed / (laengst + 2 * pad);
  const geo = {
    x0: bb.x0 - pad, y0: bb.y0 - pad, skala, polstringEnh: 0, decimaler: o.decimaler,
  };
  /* Koordinater omregnes: (x - geo.x0) * skala, så polstringen ligger i viewBox-origo. */
  const tilp = brugt.map(k => tilpasKontur(resample(udjaevn(k.raa, o.glat), 1), Object.assign({}, o, { tolerance: (o.tolSmaa && k.areal < o.smaaGraense) ? Math.max(o.tolerance, o.tolSmaa) : o.tolerance })));
  const d = lavPathData(tilp, { x0: geo.x0, y0: geo.y0, skala, polstringEnh: 0, decimaler: o.decimaler });
  const vbW = Math.round((bw + 2 * pad) * skala * 10 ** o.decimaler) / 10 ** o.decimaler;
  const vbH = Math.round((bh + 2 * pad) * skala * 10 ** o.decimaler) / 10 ** o.decimaler;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tal(vbW, o.decimaler)} ${tal(vbH, o.decimaler)}"><title>${xmlEsc(o.navn)}</title><path fill="currentColor" fill-rule="evenodd" d="${d}"/></svg>\n`;
  return {
    svg, d, iso,
    meta: {
      viewBox: [vbW, vbH], kildeX: geo.x0, kildeY: geo.y0, enhedPrPixel: skala,
      konturer: brugt.length, fjernet: alle.filter(k => k.status === 'fjernet').map(k => k.boks),
      stoej: alle.filter(k => k.status === 'stoej').length, andet: alle.filter(k => k.status === 'andet').length,
      huller: brugt.filter(k => signeretAreal(k.raa) < 0).length,
    },
    alle,
  };
}

/* ---------- Kommandolinje ---------- */

function parseArgs(argv){
  const a = { fjern: [], behold: [], slet: [] };
  const rect = s => { const r = String(s).split(',').map(Number); if (r.length !== 4 || r.some(Number.isNaN)) throw new Error(`Ugyldigt rektangel: ${s}`); return r; };
  for (let i = 0; i < argv.length; i++){
    const k = argv[i];
    const nxt = () => argv[++i];
    if (k === '--ind') a.ind = nxt();
    else if (k === '--ud') a.ud = nxt();
    else if (k === '--navn') a.navn = nxt();
    else if (k === '--trim') a.trim = true;
    else if (k === '--min-areal') a.minAreal = Number(nxt());
    else if (k === '--tolerance') a.tolerance = Number(nxt());
    else if (k === '--tol-smaa') a.tolSmaa = Number(nxt());
    else if (k === '--smaa-graense') a.smaaGraense = Number(nxt());
    else if (k === '--fjern') a.fjern.push(rect(nxt()));
    else if (k === '--behold') a.behold.push(rect(nxt()));
    else if (k === '--slet') a.slet.push(rect(nxt()));
    else if (k === '--enhed') a.enhed = Number(nxt());
    else if (k === '--decimaler') a.decimaler = Number(nxt());
    else if (k === '--polstring') a.polstring = Number(nxt());
    else if (k === '--glat') a.glat = Number(nxt());
    else if (k === '--vinkel') a.vinkel = Number(nxt());
    else throw new Error(`Ukendt flag: ${k}`);
  }
  return a;
}

function main(argv){
  const a = parseArgs(argv);
  if (!a.ind || !a.ud || !a.navn){ console.error('Brug: node scripts/logo-vektoriser.js --ind <png> --ud <svg> --navn <mærke> [--trim] [--min-areal N] [--tolerance X]'); return 2; }
  const opt = Object.assign({}, a, { trim: !!a.trim, behold: a.behold.length ? a.behold : null });
  const r = vektoriser(laesPng(a.ind), opt);
  fs.mkdirSync(path.dirname(path.resolve(a.ud)), { recursive: true });
  fs.writeFileSync(a.ud, r.svg);
  console.log(`${a.ud}: ${Buffer.byteLength(r.svg)} byte, ${r.meta.konturer} konturer (${r.meta.huller} huller), ${r.meta.stoej} støj-konturer, ${r.meta.fjernet.length} fjernet`);
  return 0;
}

if (require.main === module){
  try { process.exitCode = main(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exitCode = 1; }
}

module.exports = { vektoriser, konturer, fyldMaske, laesPng, sletRegioner, alfaMaske, blaekNiveau, marchingSquares, STANDARD, parseArgs };
