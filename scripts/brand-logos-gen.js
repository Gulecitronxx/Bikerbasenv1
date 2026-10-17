#!/usr/bin/env node
/* Genererer js/brand-logos-data.js ud fra img/brands/manifest.json — den ENE kilde til mærkelogoer.

   Brug:
     node scripts/brand-logos-gen.js             valider manifestet, udfyld manglende hash/bredde/hoejde, skriv data-filen
     node scripts/brand-logos-gen.js --tjek      skriv intet; afslut med kode 1, hvis manifest og data-fil er ude af trit
     node scripts/brand-logos-gen.js --opdater   som første, men overskriv også hash/bredde/hoejde, hvis filen er ændret

   Deterministisk: samme manifest og samme SVG-filer giver byte-identisk uddata (ingen tidsstempler).
   Kun mærker med godkendt:true OG en fil kommer med logo-oplysninger i klientens data; alle andre er
   ordmærke/monogram. Kilde, licens og hash bliver i manifestet (de skal ikke sendes til browseren).

   Varianter (tekniske felter, ikke en godkendelse): et mærke kan have `varianter.emblem = { fil, hash, bredde, hoejde }` — en anden fil
   med samme tegning uden ordmærke (til små slots; js/brand-logos.js vælger den i 'sm'). Samme regler som hovedfilen (SVG-krav, hash,
   mål); proveniens arves fra mærket. Klientens data får kun emblemets src og mål (`l.e`).

   Intet netværk. Intet skrives uden for manifestet og js/brand-logos-data.js. */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(ROOT, 'img', 'brands', 'manifest.json');
const DATA = path.join(ROOT, 'js', 'brand-logos-data.js');
const MAX_SVG_BYTES = 6 * 1024;
const VARIANTER = ['emblem', 'lockup', 'ordmaerke'];
const UNDERVARIANTER = ['emblem', 'ordmaerke'];   // varianter.<navn> i manifestet; emblem (små slots) og ordmaerke (hero-lockup: emblem + ordmærke side om side) bruges af klienten
const FALLBACKS = ['ordmaerke', 'monogram'];
const FIL_MOENSTER = /^img\/brands\/[a-z0-9][a-z0-9-]*\.svg$/;

/* SVG'er indlæses via CSS-mask eller <img> og kører derfor aldrig script, men de bliver stadig kontrolleret:
   en fil, der en dag indsættes inline, må ikke kunne andet end tegne. */
function tjekSvg(tekst){
  const fejl = [];
  const b = Buffer.byteLength(tekst, 'utf8');
  if (b >= MAX_SVG_BYTES) fejl.push(`${b} bytes (grænse ${MAX_SVG_BYTES - 1})`);
  if (!/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(tekst)) fejl.push('starter ikke med <svg>');
  if (/<script/i.test(tekst)) fejl.push('indeholder <script>');
  if (/\son[a-z]+\s*=/i.test(tekst)) fejl.push('indeholder on*-attribut');
  if (/<foreignObject/i.test(tekst)) fejl.push('indeholder <foreignObject>');
  if (/<image[\s>]/i.test(tekst)) fejl.push('indeholder <image>');
  if (/<!DOCTYPE|<!ENTITY/i.test(tekst)) fejl.push('indeholder DOCTYPE/ENTITY');
  if (/javascript:/i.test(tekst)) fejl.push('indeholder javascript:');
  if (/@import/i.test(tekst)) fejl.push('indeholder @import');
  for (const m of tekst.matchAll(/\b(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi)){
    if (!m[1].startsWith('#')) fejl.push(`ekstern href "${m[1].slice(0, 40)}"`);
  }
  for (const m of tekst.matchAll(/url\(\s*["']?([^)"']*)/gi)){
    if (!m[1].startsWith('#')) fejl.push(`url() uden for filen "${m[1].slice(0, 40)}"`);
  }
  return fejl;
}

/* viewBox (eller width/height) -> { bredde, hoejde } som tal. */
function maal(tekst){
  const vb = /viewBox\s*=\s*["']\s*([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)[\s,]+([-\d.eE]+)\s*["']/i.exec(tekst);
  if (vb){
    const w = Number(vb[3]), h = Number(vb[4]);
    if (w > 0 && h > 0) return { bredde: w, hoejde: h };
  }
  return null;
}

/* Hash over indholdet med LF-linjeskift: repoet er blandet (autocrlf), og samme fil må ikke få to hash afhængigt af checkout. */
const sha256 = buf => crypto.createHash('sha256')
  .update(Buffer.from(Buffer.from(buf).toString('utf8').split('\r\n').join('\n'), 'utf8')).digest('hex');

/* Rene funktioner: tager manifestet og en funktion, der læser en fil (relativt til repoets rod). */
function valider(manifest, laes){
  const fejl = [];
  const set = new Set();
  if (!manifest || !Array.isArray(manifest.maerker)) return ['manifest.maerker mangler'];
  manifest.maerker.forEach((m, i) => {
    const ref = `maerker[${i}] ${m && m.slug}`;
    if (!m || typeof m.slug !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(m.slug)) return fejl.push(`${ref}: ugyldig slug`);
    if (set.has(m.slug)) fejl.push(`${ref}: slug findes to gange`);
    set.add(m.slug);
    if (typeof m.navn !== 'string' || !m.navn.trim()) fejl.push(`${ref}: navn mangler`);
    if (!Array.isArray(m.aliaser) || m.aliaser.some(a => typeof a !== 'string' || !a.trim())) fejl.push(`${ref}: aliaser skal være en liste af tekster`);
    if (typeof m.godkendt !== 'boolean') fejl.push(`${ref}: godkendt skal være true/false`);
    if (!VARIANTER.includes(m.variant)) fejl.push(`${ref}: variant skal være ${VARIANTER.join('|')}`);
    if (!FALLBACKS.includes(m.fallback)) fejl.push(`${ref}: fallback skal være ${FALLBACKS.join('|')}`);
    if (typeof m.monogram !== 'string' || m.monogram.length < 1 || m.monogram.length > 3) fejl.push(`${ref}: monogram skal være 1-3 tegn`);
    if (typeof m.ensfarvet !== 'boolean') fejl.push(`${ref}: ensfarvet skal være true/false`);
    if (m.godkendt && !m.fil) fejl.push(`${ref}: godkendt:true kræver fil`);
    if (m.fil){
      if (!FIL_MOENSTER.test(m.fil)) return fejl.push(`${ref}: fil "${m.fil}" skal være img/brands/<navn>.svg`);
      let tekst;
      try { tekst = laes(m.fil); } catch (e){ return fejl.push(`${ref}: filen ${m.fil} findes ikke`); }
      for (const f of tjekSvg(tekst.toString('utf8'))) fejl.push(`${ref}: ${m.fil}: ${f}`);
      const mm = maal(tekst.toString('utf8'));
      if (!mm) fejl.push(`${ref}: ${m.fil} har ingen læsbar viewBox`);
      if (!m.kilde || !m.licens) fejl.push(`${ref}: fil kræver kilde og licens (proveniens)`);
    }
    if (m.varianter != null){
      if (typeof m.varianter !== 'object' || Array.isArray(m.varianter)) return fejl.push(`${ref}: varianter skal være et objekt`);
      for (const [navn, v] of Object.entries(m.varianter)){
        const vref = `${ref} varianter.${navn}`;
        if (!UNDERVARIANTER.includes(navn)){ fejl.push(`${vref}: ukendt variant (tilladt: ${UNDERVARIANTER.join('|')})`); continue; }
        if (!m.fil){ fejl.push(`${vref}: kræver at mærket selv har en fil`); continue; }
        if (!v || typeof v.fil !== 'string' || !FIL_MOENSTER.test(v.fil)){ fejl.push(`${vref}: fil skal være img/brands/<navn>.svg`); continue; }
        if (v.fil === m.fil){ fejl.push(`${vref}: samme fil som hovedfilen`); continue; }
        let tekst;
        try { tekst = laes(v.fil); } catch (e){ fejl.push(`${vref}: filen ${v.fil} findes ikke`); continue; }
        for (const f of tjekSvg(tekst.toString('utf8'))) fejl.push(`${vref}: ${v.fil}: ${f}`);
        if (!maal(tekst.toString('utf8'))) fejl.push(`${vref}: ${v.fil} har ingen læsbar viewBox`);
      }
    }
  });
  return fejl;
}

/* Udfylder (eller med opdater: overskriver) hash/bredde/hoejde for mærker med fil. Returnerer { manifest, aendret, fejl }. */
function udfyld(manifest, laes, opdater){
  const kopi = JSON.parse(JSON.stringify(manifest));
  const fejl = [];
  let aendret = false;
  for (const m of kopi.maerker){
    if (!m.fil) continue;
    let buf;
    try { buf = laes(m.fil); } catch (e){ continue; }
    const mm = maal(buf.toString('utf8'));
    const ny = { hash: sha256(buf), bredde: mm && mm.bredde, hoejde: mm && mm.hoejde };
    for (const k of ['hash', 'bredde', 'hoejde']){
      if (m[k] == null || m[k] === ''){ m[k] = ny[k]; aendret = true; }
      else if (m[k] !== ny[k]){
        if (opdater){ m[k] = ny[k]; aendret = true; }
        else fejl.push(`${m.slug}: ${k} i manifestet (${m[k]}) passer ikke til filen (${ny[k]}) — kør med --opdater, hvis filen med vilje er ændret`);
      }
    }
    for (const [navn, v] of Object.entries(m.varianter || {})){
      if (!v || !v.fil) continue;
      let vb;
      try { vb = laes(v.fil); } catch (e){ continue; }
      const vm = maal(vb.toString('utf8'));
      const vny = { hash: sha256(vb), bredde: vm && vm.bredde, hoejde: vm && vm.hoejde };
      for (const k of ['hash', 'bredde', 'hoejde']){
        if (v[k] == null || v[k] === ''){ v[k] = vny[k]; aendret = true; }
        else if (v[k] !== vny[k]){
          if (opdater){ v[k] = vny[k]; aendret = true; }
          else fejl.push(`${m.slug}: varianter.${navn}.${k} i manifestet (${v[k]}) passer ikke til filen (${vny[k]}) — kør med --opdater, hvis filen med vilje er ændret`);
        }
      }
    }
  }
  return { manifest: kopi, aendret, fejl };
}

const r3 = n => Math.round(n * 1000) / 1000;

/* Klientens data: kun det browseren skal bruge. Rækkefølgen følger manifestet. */
function byggData(manifest){
  return {
    v: 1,
    m: manifest.maerker.map(m => {
      const o = { s: m.slug, n: m.navn, a: m.aliaser.slice(), m: m.monogram, v: m.variant, f: m.fallback };
      if (m.godkendt && m.fil){
        o.l = { src: m.fil, w: r3(m.bredde), h: r3(m.hoejde), c: m.ensfarvet ? 1 : 0 };
        const em = m.varianter && m.varianter.emblem;
        if (em && em.fil && em.bredde > 0 && em.hoejde > 0) o.l.e = { src: em.fil, w: r3(em.bredde), h: r3(em.hoejde) };
        const om = m.varianter && m.varianter.ordmaerke;
        if (om && om.fil && om.bredde > 0 && om.hoejde > 0) o.l.o = { src: om.fil, w: r3(om.bredde), h: r3(om.hoejde) };
      }
      return o;
    }),
  };
}

function datafilTekst(manifest){
  const d = byggData(manifest);
  const linjer = d.m.map(o => '    ' + JSON.stringify(o));
  return `/* GENERERET af scripts/brand-logos-gen.js ud fra img/brands/manifest.json — redigér ikke i hånden.
   Kør: node scripts/brand-logos-gen.js   (--tjek i gaten). Kun godkendte mærker med fil har et "l"-felt. */
(function (rod, fabrik){
  if (typeof module === 'object' && module.exports) module.exports = fabrik();
  else rod.BrandLogosData = fabrik();
})(typeof self !== 'undefined' ? self : this, function (){
  return {
  v: ${d.v},
  m: [
${linjer.join(',\n')}
  ]
  };
});
`;
}

function laesRod(rel){ return fs.readFileSync(path.join(ROOT, rel)); }

function koer(argv){
  const tjek = argv.includes('--tjek');
  const opdater = argv.includes('--opdater');
  const raa = fs.readFileSync(MANIFEST, 'utf8');
  const manifest = JSON.parse(raa);
  const fejl = valider(manifest, laesRod);
  const u = udfyld(manifest, laesRod, opdater);
  fejl.push(...u.fejl);
  if (fejl.length){ console.error('brand-logos-gen: fejl\n  ' + fejl.join('\n  ')); return 1; }
  const nyData = datafilTekst(u.manifest);
  const nyManifest = JSON.stringify(u.manifest, null, 2) + '\n';
  if (tjek){
    let galt = 0;
    const gammel = fs.existsSync(DATA) ? fs.readFileSync(DATA, 'utf8').replace(/\r\n/g, '\n') : '';
    if (gammel !== nyData){ console.error('brand-logos-gen: js/brand-logos-data.js er ude af trit med manifestet — kør node scripts/brand-logos-gen.js'); galt = 1; }
    if (u.aendret){ console.error('brand-logos-gen: manifestet mangler hash/bredde/hoejde for en fil — kør node scripts/brand-logos-gen.js'); galt = 1; }
    if (!galt) console.log(`brand-logos-gen: ok (${manifest.maerker.length} mærker, ${manifest.maerker.filter(m => m.godkendt && m.fil).length} med godkendt logo)`);
    return galt;
  }
  if (u.aendret) fs.writeFileSync(MANIFEST, nyManifest, 'utf8');
  fs.writeFileSync(DATA, nyData, 'utf8');
  console.log(`brand-logos-gen: skrev js/brand-logos-data.js (${manifest.maerker.length} mærker, ${manifest.maerker.filter(m => m.godkendt && m.fil).length} med godkendt logo)${u.aendret ? '; manifestet fik hash/bredde/hoejde' : ''}`);
  return 0;
}

if (require.main === module) process.exit(koer(process.argv.slice(2)));

module.exports = { tjekSvg, maal, sha256, valider, udfyld, byggData, datafilTekst, MAX_SVG_BYTES, FIL_MOENSTER, MANIFEST, DATA };
