#!/usr/bin/env node
/* V7 QA: verifikation af ejerens paastande mod produktion (kun laesning) eller lokal build.
   Brug: node scripts/v7-baseline.js [--base https://bikerbasen.dk] [--ud docs/review/gauntlet/v7/qa/baseline]
   Skriver <ud>.json + skaermbilleder. Ingen skrivning til produktion: kun GET af sider og den Supabase-laesning,
   som siden selv laver. */
'use strict';
const fs = require('fs');
const path = require('path');
const pw = require('playwright');

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const LOKAL = process.argv.includes('--lokal');
let BASE = arg('--base', 'https://bikerbasen.dk').replace(/\/$/, '');
const UD = path.resolve(arg('--ud', 'docs/review/gauntlet/v7/qa/baseline'));
const SIDE = arg('--annonce', 'annonce-bmw-r45-1979-59d3a9a1.html');
fs.mkdirSync(UD, { recursive: true });

function pct(sorted, p) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p / 100 * sorted.length) - 1));
  return sorted[i];
}

(async () => {
  let srv = null;
  if (LOKAL) { srv = await require('./smoke-browser').startServer(process.cwd()); BASE = `http://127.0.0.1:${srv.port}`; }
  const browser = await pw.chromium.launch({ headless: true });
  const out = { base: BASE, taget: new Date().toISOString() };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'da-DK' });
  const page = await ctx.newPage();

  // ---- (1) privat annonce ----
  await page.goto(`${BASE}/${SIDE}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const ck = page.getByRole('button', { name: 'Kun nødvendige' });
  if (await ck.count()) { await ck.first().click(); await page.waitForTimeout(500); }
  out.annonce = await page.evaluate(() => {
    const side = document.body.innerText;
    const lenker = [...document.querySelectorAll('a[href]')].map(a => ({ t: (a.textContent || '').trim().slice(0, 60), h: a.getAttribute('href') }))
      .filter(x => /^(tel:|mailto:)/.test(x.h) || /login|kilde|kontakt|besked/i.test(x.h + x.t));
    const knapper = [...document.querySelectorAll('button')].map(b => (b.textContent || '').trim().slice(0, 60)).filter(Boolean);
    const form = [...document.querySelectorAll('form')].map(f => f.id || f.className || 'form');
    const sidebar = document.querySelector('.sidebar-card, .an-saelger, aside');
    return {
      titel: document.title,
      harBeskedNote: /Beskeder til sælger kan endnu ikke sendes via Bikerbasen/.test(side),
      harAnnonceKanIkke: /kan ikke kontaktes via Bikerbasen/.test(side),
      noter: [...document.querySelectorAll('.seller-locked-note, #seller-telefon-note, .an-note')].map(n => n.innerText.trim().slice(0, 200)),
      lenker, knapper: knapper.slice(0, 40), formularer: form, tekstarea: document.querySelectorAll('textarea').length,
      sidebarTekst: sidebar ? sidebar.innerText.slice(0, 600) : null,
      hentet: (side.match(/Set hos[^\n]*/) || [''])[0],
    };
  });
  for (const w of [1440, 390]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(UD, `annonce-${w}.png`), fullPage: false });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: path.join(UD, 'annonce-1440-fuld.png'), fullPage: true });

  // ---- (4) Lignende ----
  out.lignende = await page.evaluate(() => {
    const m = document.getElementById('similar-listings');
    if (!m) return null;
    return [...m.children].map(k => k.innerText.trim().replace(/\s+/g, ' ').slice(0, 140));
  });
  const sim = await page.$('.similar-strip');
  if (sim) { await sim.scrollIntoViewIfNeeded(); await page.waitForTimeout(500); await sim.screenshot({ path: path.join(UD, 'annonce-lignende.png') }); }

  // ---- (2)+(3) lager: alder + type ----
  await page.goto(`${BASE}/soegning.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const rows = await page.evaluate(() => {
    const alle = Store.getAllListings();
    const nu = Date.now();
    return alle.map(l => ({
      id: l.id, brand: l.brand, model: l.model, year: l.year, ccm: l.ccm, type: l.type || null,
      ekstern: !!l.isExternal, sidstSet: l.sidstSet || null, foerst: l.indekseretFoerste || null,
      alder: l.sidstSet ? Math.floor((nu - Date.parse(l.sidstSet)) / 864e5) : null,
      alderFoerst: l.indekseretFoerste ? Math.floor((nu - Date.parse(l.indekseretFoerste)) / 864e5) : null,
      saelger: l.saelgertype || (l.isDealer ? 'forhandler' : null),
    }));
  });
  out.lager = rows;
  const total = rows.length;
  const medType = rows.filter(r => r.type).length;
  const alder = rows.map(r => r.alder).filter(v => v != null).sort((a, b) => a - b);
  const foerst = rows.map(r => r.alderFoerst).filter(v => v != null).sort((a, b) => a - b);
  const typer = {};
  rows.forEach(r => { const k = r.type || '(ingen)'; typer[k] = (typer[k] || 0) + 1; });
  const buckets = [[0, 1], [2, 7], [8, 14], [15, 30], [31, 60], [61, 90], [91, 1e9]]
    .map(([a, b]) => ({ fra: a, til: b === 1e9 ? null : b, antal: alder.filter(v => v >= a && v <= b).length }));
  out.opsummering = {
    total, medType, udenType: total - medType, typer,
    alder: { n: alder.length, ingenDato: total - alder.length, min: alder[0], p25: pct(alder, 25), median: pct(alder, 50), p75: pct(alder, 75), p90: pct(alder, 90), p95: pct(alder, 95), max: alder[alder.length - 1], buckets },
    alderFoersteSet: { n: foerst.length, median: pct(foerst, 50), p90: pct(foerst, 90), max: foerst[foerst.length - 1] },
    cb1000: rows.filter(r => /cb\s*1000/i.test(`${r.model}`)).map(r => ({ id: r.id, model: r.model, year: r.year, alder: r.alder, alderFoerst: r.alderFoerst, type: r.type })).sort((a, b) => (b.alder || 0) - (a.alder || 0)),
    omkring63: rows.filter(r => r.alder >= 60 && r.alder <= 66).map(r => ({ id: r.id, brand: r.brand, model: r.model, alder: r.alder })).slice(0, 20),
  };
  out.soegeside = await page.evaluate(() => {
    const t = document.body.innerText;
    const fund = [];
    const re = /[^\n]*(bekræftet senest|uden type|ikke kategoris|Uden type|uden angivet type)[^\n]*/gi;
    let m; while ((m = re.exec(t))) fund.push(m[0].trim().slice(0, 240));
    const typeFilter = [...document.querySelectorAll('input[name="type"], input[name="types"], [data-type]')].map(i => i.value || i.dataset.type);
    return { fund, typeFilter };
  });
  await page.screenshot({ path: path.join(UD, 'soegning-1440.png') });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(UD, 'soegning-390.png') });
  await page.setViewportSize({ width: 1440, height: 900 });

  // ---- forside ----
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  out.forside = await page.evaluate(() => {
    const t = document.body.innerText;
    const fund = [];
    const re = /[^\n]*(bekræftet senest|uden type|annoncer)[^\n]*/gi;
    let m; while ((m = re.exec(t))) fund.push(m[0].trim().slice(0, 240));
    return { fund: [...new Set(fund)].slice(0, 25) };
  });
  await page.screenshot({ path: path.join(UD, 'forside-1440.png') });

  fs.writeFileSync(UD + '.json', JSON.stringify(out, null, 1));
  const kort = { ...out }; delete kort.lager;
  console.log(JSON.stringify(kort, null, 1));
  await browser.close();
  if (srv) srv.server.close();
})().catch(e => { console.error(e); process.exit(1); });
