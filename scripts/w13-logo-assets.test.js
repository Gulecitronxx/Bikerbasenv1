/* Test af de vektoriserede mærkelogoer (img/brands). Kør: node --test scripts/w13-logo-assets.test.js
   Struktur-, hash- og metadata-tests kører altid. Determinisme og IoU kræver kilde-PNG'erne (uden for repoet,
   standard C:\Users\pasca\Desktop\Bikerbasen billeder eller LOGO_KILDE) og, for IoU, Playwright/Chromium - ellers skippes de. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const REPO = path.join(__dirname, '..');
const DIR = path.join(REPO, 'img', 'brands');
/* V5: ti af de oprindelige 20 AI-udkast er erstattet af OFFICIELLE filer (scripts/v5-logo-import.js, testet i scripts/v5-logo-officielle.test.js).
   Her er kun de ti udkast, der stadig bruges. De officielle filer ligger i samme mappe og er ikke vektoriserede (flere paths, farver, > 6 KB). */
const SLUGS = ['yamaha', 'kawasaki', 'bmw', 'ktm', 'suzuki', 'aprilia', 'cfmoto', 'moto-guzzi', 'gasgas', 'zero'];
const KILDE = process.env.LOGO_KILDE || 'C:\\Users\\pasca\\Desktop\\Bikerbasen billeder';
const assets = JSON.parse(fs.readFileSync(path.join(DIR, 'assets.json'), 'utf8'));
const manifestPoster = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8')).maerker;
const officielleFiler = new Set(manifestPoster.filter(m => m.autenticitet === 'officiel').map(m => path.basename(m.fil)));
const alleSvg = fs.readdirSync(DIR).filter(f => f.endsWith('.svg') && !officielleFiler.has(f));

/* Minimal XML-velformethedstjek: tags balancerer, attributter er citerede, ingen DOCTYPE/entiteter/CDATA/kommentarer/PI. */
function tjekXml(s){
  assert.ok(!/<!(DOCTYPE|ENTITY|\[CDATA)|<\?|<!--/i.test(s), 'DOCTYPE/ENTITY/CDATA/PI/kommentar er ikke tilladt');
  const stak = [];
  const re = /<(\/?)([A-Za-z][\w:-]*)((?:\s+[\w:-]+="[^"<]*")*)\s*(\/?)>|([^<]+)/g;
  let m, pos = 0;
  while ((m = re.exec(s))){
    assert.strictEqual(m.index, pos, `ugyldig markup ved ${pos}`);
    pos = re.lastIndex;
    if (m[5] !== undefined){ assert.ok(!/[<>]/.test(m[5])); continue; }
    if (m[1]) assert.strictEqual(stak.pop(), m[2], `uparret lukketag ${m[2]}`);
    else if (!m[4]) stak.push(m[2]);
  }
  assert.strictEqual(pos, s.length, 'rester efter parsing');
  assert.strictEqual(stak.length, 0, 'ulukkede tags');
}

test('alle 10 hoved-SVG-filer findes, og assets.json har præcis disse 10 mærker (de øvrige er officielle)', () => {
  assert.strictEqual(officielleFiler.size, 21, 'V5: 21 officielle filer');
  for (const s of SLUGS) assert.ok(!officielleFiler.has(`${s}.svg`), `${s} er både udkast og officiel`);
  for (const s of SLUGS) assert.ok(fs.existsSync(path.join(DIR, `${s}.svg`)), `${s}.svg mangler`);
  assert.deepStrictEqual(Object.keys(assets).sort(), SLUGS.slice().sort());
});

test('hver SVG er under 6 KB, ren (ét path + title) og sikker', () => {
  assert.ok(alleSvg.length >= 10);   // 10 hovedfiler + emblem/ordmærke-varianter
  for (const f of alleSvg){
    const raw = fs.readFileSync(path.join(DIR, f), 'utf8');
    assert.ok(Buffer.byteLength(raw) < 6144, `${f}: ${Buffer.byteLength(raw)} byte`);
    assert.strictEqual((raw.match(/<path\b/g) || []).length, 1, `${f}: præcis ét <path>`);
    assert.strictEqual((raw.match(/<title>[^<]+<\/title>/g) || []).length, 1, `${f}: præcis ét <title>`);
    assert.ok(/<path fill="currentColor" fill-rule="evenodd" d="[^"]+"\/>/.test(raw), `${f}: fill/fill-rule`);
    const rod = raw.match(/<svg\b[^>]*>/)[0];
    assert.ok(!/\s(width|height)=/.test(rod), `${f}: roden må ikke have width/height`);
    assert.ok(/ viewBox="0 0 [\d.]+ [\d.]+"/.test(rod), `${f}: viewBox`);
    for (const forbudt of [/<script/i, /\son\w+\s*=/i, /href\s*=/i, /xlink/i, /<style/i, /<foreignObject/i, /<image/i, /<metadata/i, /<use\b/i, /javascript:/i, /https?:\/\/(?!www\.w3\.org\/2000\/svg)/i]){
      assert.ok(!forbudt.test(raw), `${f}: forbudt mønster ${forbudt}`);
    }
    tjekXml(raw);
    const d = raw.match(/ d="([^"]+)"/)[1];
    assert.ok(/^[MmLlHhVvCcZz0-9.,\s-]+$/.test(d), `${f}: ukendte tegn i path-data`);
  }
});

test('viewBox er positiv, og forholdet stemmer med assets.json', () => {
  for (const s of SLUGS){
    const a = assets[s];
    const filer = [[a.fil, a.forhold, a.viewBox]].concat(Object.values(a.varianter).map(v => [v.fil, v.forhold, v.viewBox]));
    for (const [fil, forhold, vb] of filer){
      const raw = fs.readFileSync(path.join(REPO, fil), 'utf8');
      const m = raw.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
      const w = Number(m[1]), h = Number(m[2]);
      assert.ok(w > 0 && h > 0, `${fil}: positiv viewBox`);
      assert.strictEqual(vb, `0 0 ${m[1]} ${m[2]}`);
      assert.ok(Math.abs(w / h - forhold) < 0.001, `${fil}: forhold ${w / h} vs ${forhold}`);
      assert.ok(Math.max(w, h) >= 300 && Math.max(w, h) <= 1000.5, `${fil}: viewBox-størrelse`);
    }
  }
});

test('filstørrelse og sha256 i assets.json stemmer med filerne, ingen forældreløse SVG-filer', () => {
  const kendte = new Set();
  for (const s of SLUGS){
    const a = assets[s];
    for (const x of [a].concat(Object.values(a.varianter))){
      const buf = fs.readFileSync(path.join(REPO, x.fil));
      assert.strictEqual(buf.length, x.stoerrelse_bytes, x.fil);
      assert.strictEqual(crypto.createHash('sha256').update(buf).digest('hex'), x.sha256, x.fil);
      kendte.add(path.basename(x.fil));
    }
    for (const [navn, v] of Object.entries(a.varianter)){
      assert.ok(['emblem', 'ordmaerke'].includes(navn));
      assert.strictEqual(v.fil, `img/brands/${s}-${navn}.svg`);
    }
  }
  for (const f of alleSvg) assert.ok(kendte.has(f), `${f} er ikke i assets.json`);
});

test('metadata: godkendt=false for alle, autenticitet og krav om officiel fil', () => {
  for (const s of SLUGS){
    const a = assets[s];
    assert.strictEqual(a.godkendt, false, `${s}: intet må være godkendt`);
    assert.ok(['ukendt', 'tvivlsom', 'ubrugelig'].includes(a.autenticitet), `${s}: autenticitet`);
    assert.strictEqual(typeof a.kraever_officiel_fil, 'boolean');
    assert.strictEqual(a.proces, 'AI-udkast → vektoriseret med scripts/logo-vektoriser.js');
    assert.strictEqual(a.licens, 'Varemærke tilhører producenten; udkast ikke verificeret mod officiel fil');
    assert.ok(/^ChatGPT-billede 17\. okt\. 2026, [\d.]+-\d+\.png$/.test(a.kildefil), `${s}: kildefil er kun filnavn`);
    assert.ok(['lockup', 'ordmaerke', 'emblem'].includes(a.hovedform));
  }
  /* Harley-Davidson, Benelli og Indian (før: 'ubrugelig', kraever_officiel_fil) har nu officielle filer og er ude af udkast-sættet */
  for (const s of ['harley-davidson', 'benelli', 'indian']) assert.strictEqual(assets[s], undefined, s);
});

test('gemte IoU-målinger lever op til kravene (0,97; 0,94 for mærker der kræver officiel fil)', () => {
  for (const s of SLUGS){
    const a = assets[s];
    assert.ok(a.iou, `${s}: iou mangler`);
    assert.ok(a.iou.fuld >= (a.kraever_officiel_fil ? 0.94 : 0.97), `${s}: IoU ${a.iou.fuld}`);
    assert.ok(a.iou.h64 >= (a.kraever_officiel_fil ? 0.92 : 0.93) && a.iou.h24 >= 0.85, `${s}: blød IoU ${a.iou.h64}/${a.iou.h24}`);
    for (const [n, v] of Object.entries(a.varianter)) assert.ok(v.iou.fuld >= 0.94, `${s}-${n}: IoU ${v.iou.fuld}`);
  }
});

test('ingen ®/™ eller slogans i filerne', () => {
  for (const f of alleSvg){
    const raw = fs.readFileSync(path.join(DIR, f), 'utf8');
    assert.ok(!/[®™]|&#174;|&#8482;/.test(raw), f);
    assert.ok(!/revs|ready to race|the one and only|pure sports/i.test(raw), f);
  }
});

const harKilder = fs.existsSync(path.join(KILDE, 'ChatGPT-billede 17. okt. 2026, 13.14.47-1.png'));
const BATCH = path.join(__dirname, 'logo-vektoriser-alle.js');

test('determinisme: to kørsler giver byte-identiske filer, identiske med de indcheckede', { skip: !harKilder && 'kilde-PNG-filer ikke tilgængelige', timeout: 120000 }, () => {
  const t1 = fs.mkdtempSync(path.join(os.tmpdir(), 'logo-det1-')), t2 = fs.mkdtempSync(path.join(os.tmpdir(), 'logo-det2-'));
  for (const t of [t1, t2]){
    const r = spawnSync(process.execPath, [BATCH, '--kilde', KILDE, '--ud-svg', t], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr);
  }
  for (const f of alleSvg){
    const a = fs.readFileSync(path.join(t1, f)), b = fs.readFileSync(path.join(t2, f));
    assert.ok(a.equals(b), `${f}: ikke deterministisk`);
    assert.ok(a.equals(fs.readFileSync(path.join(DIR, f))), `${f}: afviger fra den indcheckede fil (kør scripts/logo-vektoriser-alle.js)`);
  }
});

test('IoU mod kilde-PNG-alfa (Chromium, 1254 px lærred) opfylder kravene', { timeout: 300000 }, async t => {
  if (!harKilder) return t.skip('kilde-PNG-filer ikke tilgængelige');
  const sb = require('./smoke-browser');
  const tilg = await sb.playwrightTilgaengelig();
  if (!tilg.ok) return t.skip(tilg.grund);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'logo-iou-'));
  const r = spawnSync(process.execPath, [BATCH, '--kilde', KILDE, '--ud-svg', path.join(tmp, 'svg'), '--maal', '--ud-ark', path.join(tmp, 'ark')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, `batch --maal fejlede (status ${r.status}):\n${r.stdout}\n${r.stderr}`);
  assert.ok(fs.existsSync(path.join(tmp, 'ark', 'kontaktark-lys.png')));
});
