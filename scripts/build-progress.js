/* Genererer bar/progress.html — den levende status for aim-loopet.

   Den var håndskrevet før og holdt op med at passe efter runde 11. En
   statusside der lyver er værre end ingen: man holder op med at kigge på
   den, præcis når den betyder noget. Nu læses alt der KAN læses fra disken
   (skærmbilleder, Lighthouse-kørsler, git-historik), så kun dommene skal
   vedligeholdes i hånden.

   Kør: node scripts/build-progress.js  (eller som del af scripts/build.js) */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const BAR = path.join(ROOT, 'bar');

/* ---- Stykkerne. Dommen er det eneste der skrives i hånden. ---- */
const STYKKER = [
  { nr: 1, navn: 'Forside', runde: 9, status: 'wip', par: ['01-front'],
    gap: 'Hero-teksten var ulæselig over fotoet — lukket. Vi vælger foto hvor Bilbasen går direkte til søgefeltet.' },
  { nr: 2, navn: 'Søgeresultater (SRP)', runde: 18, status: 'wip', par: ['02-srp'],
    gap: 'Mobil-chrome skåret fra 445px til 347px over første kort (Bilbasen: 305px). Desktop: vi vinder — de gemmer alle facetter bag "Alle filtre".' },
  { nr: 3, navn: 'Annonce-detalje', runde: 7, status: 'wip', par: ['03-listing'],
    gap: 'Prisvurdering og sælgeranmeldelser mangler — begge kræver rigtigt lager for ikke at være opdigtet.' },
  { nr: 4, navn: 'Sælger / forhandler', runde: 6, status: 'wip', par: ['04-forhandler'],
    gap: '"CVR-verificeret virksomhed" var en påstand uden opslag — fjernet i r15. Nu "CVR oplyst af sælger" med link til datacvr.virk.dk.' },
  { nr: 5, navn: 'Opret annonce', runde: 13, status: 'done', par: ['05-opret-login'],
    gap: 'Otte fejl fundet ved at gå flowet igennem med rigtig session. Postnummer-kapløbet og "Stand: Som ny" som forvalg var de værste.' },
  { nr: 6, navn: 'Kontakt / besked', runde: 0, status: 'todo', par: [],
    gap: 'Ikke startet. Kræver to konti: en der skriver, en der modtager.' },
  { nr: 7, navn: 'Gulvet (perf + a11y)', runde: 6, status: 'done', par: [],
    gap: 'Nået: 14 af 15 sider ≥95 perf, a11y 100 på alle 15, alle CWV grønne.' },
  { nr: 8, navn: 'Verificering', runde: 15, status: 'wip', par: [],
    gap: 'Alt der ikke kunne bevises er fjernet. verify-profile er bygget og venter på en CVR-nøgle.' },
  { nr: 9, navn: 'Søgeagenter', runde: 17, status: 'wip', par: [],
    gap: 'Byggede hele kæden — den lovede en mail og skrev kun til localStorage. Mangler to secrets og migration 013.' },
];

/* Hvornår blev css/ eller js/ sidst rørt? En Lighthouse-kørsel fra FØR det
   tidspunkt måler en side, der ikke findes længere. Den slags tal er værre
   end ingen tal: de ser ud som om gulvet holder, længe efter man har revet
   gulvbrædderne op. */
function sidsteKodeaendring(){
  try {
    const t = execFileSync('git', ['log', '-1', '--format=%ct', '--', 'css', 'js'],
      { cwd: ROOT, encoding: 'utf8' }).trim();
    return Number(t) * 1000;
  } catch(e){ return 0; }
}
const KODE_AENDRET = sidsteKodeaendring();

/* ---- Lighthouse: nyeste kørsel pr. side ---- */
function lighthouse(){
  const filer = fs.readdirSync(BAR).filter(f => /^lh-.*\.json$/.test(f));
  const nyeste = new Map();
  for (const f of filer){
    const p = path.join(BAR, f);
    try {
      const j = JSON.parse(fs.readFileSync(p, 'utf8'));
      const side = (j.finalDisplayedUrl || j.requestedUrl || '').split('/').pop().split('?')[0] || '(forside)';
      const tid = fs.statSync(p).mtimeMs;
      if (!nyeste.has(side) || nyeste.get(side).tid < tid){
        const k = j.categories || {};
        nyeste.set(side, {
          tid, fil: f,
          forældet: tid < KODE_AENDRET,
          perf: k.performance ? Math.round(k.performance.score * 100) : null,
          a11y: k.accessibility ? Math.round(k.accessibility.score * 100) : null,
          lcp: j.audits?.['largest-contentful-paint']?.displayValue || '',
          cls: j.audits?.['cumulative-layout-shift']?.displayValue || '',
        });
      }
    } catch(e){ /* en halvskrevet kørsel må ikke vælte siden */ }
  }
  return [...nyeste.entries()].sort((a,b) => b[1].tid - a[1].tid);
}

/* ---- Skærmbilleder: kun par hvor BEGGE sider findes ---- */
function parFor(navne){
  return navne.map(n => {
    const vores = path.join(BAR, 'ours', 'mobile', n + '.png');
    const dem = path.join(BAR, 'mobile', n + '.png');
    if (!fs.existsSync(vores)) return null;
    return {
      navn: n,
      vores: 'ours/mobile/' + n + '.png',
      voresTid: new Date(fs.statSync(vores).mtime).toLocaleString('da-DK'),
      dem: fs.existsSync(dem) ? 'mobile/' + n + '.png' : null,
    };
  }).filter(Boolean);
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

let runder = [];
try {
  runder = execFileSync('git', ['log', '-14', '--pretty=%s'], { cwd: ROOT, encoding: 'utf8' })
    .trim().split('\n');
} catch(e){}

const lh = lighthouse();
const gaeldende = lh.filter(([,v]) => !v.forældet);
const gulvOk = gaeldende.filter(([,v]) => v.perf >= 95).length;
const a11yOk = gaeldende.filter(([,v]) => v.a11y === 100).length;
const forældede = lh.length - gaeldende.length;

const html = `<!doctype html><html lang="da"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="30">
<title>Aim-loop · Bikerbasen mod Bilbasen</title>
<style>
:root{--bg:#0f0d0a;--card:#1b1814;--line:#332d26;--fg:#f5f1eb;--mut:#a79e92;--ok:#4ade94;--bad:#ff6b61;--pri:#ff7c4c}
*{box-sizing:border-box}body{margin:0;font:15px/1.55 system-ui,-apple-system,Segoe UI,sans-serif;background:var(--bg);color:var(--fg)}
.wrap{max-width:1180px;margin:0 auto;padding:28px 20px 90px}
h1{font-size:26px;margin:0 0 4px}.sub{color:var(--mut);margin:0 0 26px}.sub b{color:var(--pri)}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.09em;color:var(--mut);margin:34px 0 12px}
.floor{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}
.metric{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px}
.metric .v{font-size:30px;font-weight:800;letter-spacing:-.02em}.metric .l{color:var(--mut);font-size:13px;margin-top:2px}
.metric.ok{border-color:#2f5c46}.metric.ok .v{color:var(--ok)}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
th,td{text-align:left;padding:11px 15px;border-bottom:1px solid var(--line);font-size:14px;vertical-align:top}
th{color:var(--mut);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.05em}
tr:last-child td{border-bottom:none}
.chip{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:700}
.chip.done{background:#12321f;color:var(--ok)}.chip.wip{background:#3a2214;color:var(--pri)}.chip.todo{background:#2a2620;color:var(--mut)}
.ab{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:10px 0 26px}
.ab figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.ab img{width:100%;display:block;background:#fff}
.ab figcaption{padding:9px 12px;font-size:12px;color:var(--mut)}
.gap{color:var(--fg);font-size:13px}
ol{padding-left:20px;color:var(--mut);font-size:13px}ol li{margin-bottom:4px}
code{background:#241f19;padding:1px 6px;border-radius:5px;font-size:12px}
</style></head><body><div class="wrap">
<h1>Bikerbasen mod Bilbasen</h1>
<p class="sub">Genereret <b>${new Date().toLocaleString('da-DK')}</b> · siden genindlæser hvert 30. sekund · <code>node scripts/build-progress.js</code></p>

<h2>Gulvet</h2>
<div class="floor">
  <div class="metric ${a11yOk === gaeldende.length && gaeldende.length ? 'ok' : ''}"><div class="v">${a11yOk}/${gaeldende.length}</div><div class="l">a11y 100 (gældende målinger)</div></div>
  <div class="metric ${gulvOk === gaeldende.length && gaeldende.length ? 'ok' : ''}"><div class="v">${gulvOk}/${gaeldende.length}</div><div class="l">perf ≥ 95 (gældende målinger)</div></div>
  <div class="metric ok"><div class="v">100</div><div class="l">krav: tilgængelighed</div></div>
  <div class="metric ok"><div class="v">95</div><div class="l">krav: ydelse</div></div>
</div>

<h2>Målt pr. side (nyeste kørsel)</h2>
<table><tr><th>Side</th><th>Ydelse</th><th>Tilgængelighed</th><th>LCP</th><th>CLS</th><th>Målt</th></tr>
${lh.map(([side, v]) => `<tr><td>${esc(side)}</td>
<td style="color:${v.perf >= 95 ? 'var(--ok)' : 'var(--pri)'}">${v.perf ?? '—'}</td>
<td style="color:${v.a11y === 100 ? 'var(--ok)' : 'var(--bad)'}">${v.a11y ?? '—'}</td>
<td>${esc(v.lcp)}</td><td>${esc(v.cls)}</td>
<td style="color:var(--mut)">${new Date(v.tid).toLocaleDateString('da-DK')}${v.forældet ? ' <span class="chip todo">forældet</span>' : ''}</td></tr>`).join('')}
</table>

<p style="color:var(--mut);font-size:13px;margin:10px 0 0">${forældede} af ${lh.length} kørsler er ældre end sidste ændring i <code>css/</code> eller <code>js/</code> og måler altså en side, der ikke findes længere. De er markeret <b>forældet</b> og tælles ikke med ovenfor. Mål dem forfra med <code>npx lighthouse</code>, før de bruges til noget.</p>

<h2>Stykkerne</h2>
<table><tr><th>#</th><th>Stykke</th><th>Runde</th><th>Status</th><th>Sidst navngivne hul</th></tr>
${STYKKER.map(s => `<tr><td>${s.nr}</td><td><b>${esc(s.navn)}</b></td><td>${s.runde || '—'}</td>
<td><span class="chip ${s.status}">${s.status === 'done' ? 'nået' : s.status === 'wip' ? 'i gang' : 'ikke startet'}</span></td>
<td class="gap">${esc(s.gap)}</td></tr>`).join('')}
</table>

${STYKKER.filter(s => s.par.length).map(s => {
  const par = parFor(s.par);
  if (!par.length) return '';
  return `<h2>${esc(s.navn)} — vores mod deres (mobil 390px)</h2>` + par.map(p => `<div class="ab">
  <figure><img src="${p.vores}" alt="Vores ${esc(s.navn)}"><figcaption>VORES · ${p.voresTid}</figcaption></figure>
  ${p.dem ? `<figure><img src="${p.dem}" alt="Bilbasen ${esc(s.navn)}"><figcaption>BILBASEN — baren</figcaption></figure>`
          : `<figure><figcaption>Ingen reference: auth-spærret hos Bilbasen. Dømmes på vores eget flow + gulvet.</figcaption></figure>`}
</div>`).join('');
}).join('')}

<h2>Seneste runder</h2>
<ol>${runder.map(r => `<li>${esc(r)}</li>`).join('')}</ol>
</div></body></html>`;

fs.writeFileSync(path.join(BAR, 'progress.html'), html);
console.log(`build-progress: ${STYKKER.length} stykker, ${lh.length} målte sider.`);
