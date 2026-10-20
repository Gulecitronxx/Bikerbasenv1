/* V5 mærkekrav: låser scripts/v5-maerke-krav.js. Hvert tjek bevises på små kontrolsider (ingen netværk):
     - en side der OVERHOLDER kontrakten giver 0 fund (tjekket kan bestå),
     - hver ødelagt variant giver det forventede fund (tjekket kan fejle).
   Selve sitet køres mod de samme tjek af scripts/v4-maerke-dakning.js (gruppe "v5"); de endnu ikke rettede fund står i
   scripts/v4-maerke-dakning.kendt.json, og testen nederst sikrer at KENDT-listen ikke skjuler andet end netop disse fund.
   Springes over uden Playwright. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const K = require('./v5-maerke-krav.js');
const sb = require('./smoke-browser.js');

const KENDT = path.join(__dirname, 'v4-maerke-dakning.kendt.json');

/* ---------- Kontrolsider ---------- */

/* mut: mængde af fejl, der sprøjtes ind. */
const andetSide = (mut = []) => `<!doctype html><meta charset="utf-8"><body>
<form novalidate>
 <div class="field"><label for="f-brand">Mærke</label><select id="f-brand" required></select></div>
 <div class="field" id="andet-felt" hidden>${mut.includes('nolabel') ? '' : '<label for="f-andet">Hvilket mærke?</label>'}<input id="f-andet" type="text" ${mut.includes('nomax') ? '' : 'maxlength="40"'} required></div>
 <div id="forhaand"></div>
</form>
<script>
const MUT = ${JSON.stringify(mut)};
const REG = ['Honda', 'Yamaha'];
window.BrandRegistry = { valgbare: () => REG.slice() };
window.Filtrering = { maerkeListe: l => [...new Set(l.map(x => x.brand).filter(b => b && !/^andet/i.test(b)))].map(navn => ({ navn })) };
const sel = document.getElementById('f-brand'), felt = document.getElementById('andet-felt'), inp = document.getElementById('f-andet');
sel.innerHTML = '<option value="">Vælg mærke</option>' + REG.map(b => '<option>' + b + '</option>').join('') + (MUT.includes('ingenAndet') ? '' : '<option value="Andet mærke">Andet mærke</option>');
sel.addEventListener('change', () => {
  const andet = sel.value === 'Andet mærke';
  if (!MUT.includes('ingenFelt')) felt.hidden = MUT.includes('bliver') ? false : !andet;
  if (!andet && !MUT.includes('rest')) inp.value = '';
  if (!andet && MUT.includes('bliver')) felt.hidden = false;
});
inp.addEventListener('input', () => { if (MUT.includes('xss')) document.getElementById('forhaand').innerHTML = inp.value; });
window.validateStep = () => {
  if (felt.hidden || MUT.includes('ingenValidering')) { inp.removeAttribute('aria-invalid'); return true; }
  const v = inp.value;
  const tomt = v.trim() === ''; let slet = false;
  if (tomt) slet = v === '' ? !MUT.includes('tomOK') : !MUT.includes('blankOK');
  else if (v.length > 40) slet = !MUT.includes('langOK');
  if (MUT.includes('gyldigAfvises') && v === 'Fantasi Motors') slet = true;
  if (slet) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid');
  return !slet;
};
window.collectFormData = () => {
  const andet = sel.value === 'Andet mærke';
  const d = { brand: andet ? (MUT.includes('leak') ? inp.value : 'Andet mærke') : sel.value, model: 'X' };
  if ((andet && !MUT.includes('tabt')) || MUT.includes('rest')) d.brandAndet = inp.value;
  return d;
};
</script>`;

const FLERE_PILLER = [
  { navn: 'Zero', aliaser: ['Zero Motorcycles'] }, { navn: 'Norton', aliaser: [] }, { navn: 'AJP', aliaser: [] },
  { navn: 'Vincent', aliaser: [] }, { navn: 'Honda', aliaser: [] }, { navn: 'Yamaha', aliaser: [] },
];
const oversigtSide = (mut = []) => `<!doctype html><meta charset="utf-8"><body>
<input id="mk-hurtigsoeg-input" type="search"><p class="mk-hurtigsoeg-status" role="status"></p>
<ul id="mk-az-liste"><li data-mk-soeg="honda"><a href="maerke-honda.html">Honda</a></li><li data-mk-soeg="yamaha"><a href="maerke-yamaha.html">Yamaha</a></li></ul>
<h2 id="h">Flere mærker (4)</h2><p id="intro">Disse 4 mærker kender vi.</p>
<ul class="mk-flere"><li data-mk-soeg="zero|zero motorcycles">Zero</li><li data-mk-soeg="norton">Norton</li><li data-mk-soeg="ajp">AJP</li></ul>
<p><strong id="hh">Historiske mærker (1)</strong></p>
<ul class="mk-flere mk-flere-hist"><li data-mk-soeg="vincent">Vincent</li></ul>
<style>.mk-flere li { display: inline-flex; } li[hidden] { display: none !important; }</style>
<script>
const MUT = ${JSON.stringify(mut)};
window.LISTINGS = [];
window.Store = { getAllListings: () => [{ id: 'z1', brand: 'Zero' }] };
const input = document.getElementById('mk-hurtigsoeg-input'), status = document.querySelector('.mk-hurtigsoeg-status'), liste = document.getElementById('mk-az-liste');
const fold = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
function opdaterTal() {
  const piller = document.querySelectorAll('ul.mk-flere > li').length, hist = document.querySelectorAll('.mk-flere-hist > li').length;
  const t = MUT.includes('forkertTal') ? piller + 5 : piller;
  document.getElementById('h').textContent = 'Flere mærker (' + t + ')';
  document.getElementById('intro').textContent = 'Disse ' + t + ' mærker kender vi.';
  document.getElementById('hh').textContent = 'Historiske mærker (' + hist + ')';
}
/* Levende hydrering: pille -> A–Z-række med link, når lageret har annoncer for mærket. */
if (!MUT.includes('ingenHydrering')) {
  const brands = new Set(Store.getAllListings().map(l => fold(l.brand)));
  document.querySelectorAll('ul.mk-flere > li').forEach(li => {
    if (!brands.has(fold(li.textContent))) return;
    const ny = document.createElement('li');
    ny.setAttribute('data-mk-soeg', li.getAttribute('data-mk-soeg'));
    ny.innerHTML = '<a href="' + (MUT.includes('doedtLink') ? 'findes-ikke.html' : 'soegning.html?brands=' + encodeURIComponent(li.textContent.trim())) + '">' + li.textContent.trim() + '</a>';
    liste.appendChild(ny); li.remove();
  });
  opdaterTal();
}
function filtrer() {
  const q = fold(input.value);
  let n = 0;
  const alle = [...liste.querySelectorAll('li[data-mk-soeg]'), ...(MUT.includes('ingenPilleSoeg') ? [] : document.querySelectorAll('ul.mk-flere > li'))];
  alle.forEach(li => { const ok = !q || li.getAttribute('data-mk-soeg').split('|').some(h => fold(h).includes(q)); li.hidden = !ok; if (ok) n++; });
  status.textContent = !q ? '' : n === 0 ? 'Ingen mærker matcher.' : n + (n === 1 ? ' mærke matcher.' : ' mærker matcher.');
}
input.addEventListener('input', filtrer);
</script>`;

const h1Side = (mut = []) => `<!doctype html><meta charset="utf-8"><title>Søgning</title><meta name="description" content="Søg"><body><h1 id="h"></h1>
<script>
const KENDTE = ['Honda', 'Yamaha'];
const b = new URLSearchParams(location.search).getAll('brands');
const kendte = b.filter(x => KENDTE.some(k => k.toLowerCase() === x.toLowerCase()));
const brug = ${mut.includes('spejl') ? 'b' : 'kendte'};
document.getElementById('h').textContent = brug.length ? brug.join(', ') + ' til salg' : 'Motorcykler til salg';
${mut.includes('title') ? "document.title = b.join(', ') + ' til salg';" : ''}
</script>`;

/* ---------- Harness ---------- */

async function medBrowser(t, fn) {
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) return t.skip(kan.grund);
  const browser = await kan.pw.chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'da-DK' });
    await fn(ctx);
    await ctx.close();
  } finally { await browser.close(); }
}
const samler = () => { const fund = []; return { fund, tilfoej: (gruppe, tjek, niveau, maerke, detalje) => fund.push({ gruppe, tjek, niveau, maerke, detalje }) }; };
const navne = fund => new Set(fund.map(f => f.tjek));
async function side(ctx, html) { const p = await ctx.newPage(); await p.setContent(html); return p; }

/* ---------- A: Andet mærke ---------- */

test('A. Andet mærke: en side der overholder kontrakten giver 0 fund', async (t) => {
  await medBrowser(t, async ctx => {
    const s = samler();
    await K.tjekAndetMaerke(await side(ctx, andetSide()), s.tilfoej);
    assert.deepStrictEqual(s.fund, [], JSON.stringify(s.fund));
  });
});

test('A. Andet mærke: hver ødelagt variant opdages', async (t) => {
  const tilfaelde = [
    [['ingenAndet'], 'v5-andet-mangler'],
    [['ingenFelt'], 'v5-andet-felt-mangler'],
    [['nolabel'], 'v5-andet-label'],
    [['nomax'], 'v5-andet-maxlength'],
    [['ingenValidering'], 'v5-andet-tom-accepteres'],
    [['tomOK'], 'v5-andet-tom-accepteres'],
    [['blankOK'], 'v5-andet-blank-accepteres'],
    [['langOK', 'nomax'], 'v5-andet-for-lang'],
    [['xss'], 'v5-andet-xss'],
    [['gyldigAfvises'], 'v5-andet-gyldig-afvises'],
    [['tabt'], 'v5-andet-tekst-gaar-tabt'],
    [['leak'], 'v5-andet-bliver-offentligt-maerke'],
    [['bliver'], 'v5-andet-felt-bliver'],
    [['rest'], 'v5-andet-rest-tekst'],
  ];
  await medBrowser(t, async ctx => {
    for (const [mut, forventet] of tilfaelde) {
      const s = samler();
      await K.tjekAndetMaerke(await side(ctx, andetSide(mut)), s.tilfoej);
      assert.ok(navne(s.fund).has(forventet), `${mut.join('+')}: forventede "${forventet}", fik ${[...navne(s.fund)].join(', ') || 'intet'}`);
    }
  });
});

/* ---------- B + C: Flere mærker ---------- */

const hydreringsOpts = { navn: 'Zero', registerAntal: 6, ventMs: 600, linkFindes: () => true };

test('B. Flere mærker: en side der hydrerer korrekt giver 0 fund', async (t) => {
  await medBrowser(t, async ctx => {
    const s = samler();
    await K.tjekFlereHydrering(await side(ctx, oversigtSide()), s.tilfoej, hydreringsOpts);
    assert.deepStrictEqual(s.fund, [], JSON.stringify(s.fund));
  });
});

test('B. Flere mærker: ingen hydrering, forkerte tal og dødt link opdages', async (t) => {
  await medBrowser(t, async ctx => {
    const a = samler();
    await K.tjekFlereHydrering(await side(ctx, oversigtSide(['ingenHydrering'])), a.tilfoej, hydreringsOpts);
    assert.ok(navne(a.fund).has('v5-flere-ikke-hydreret'), [...navne(a.fund)].join(','));
    const b = samler();
    await K.tjekFlereHydrering(await side(ctx, oversigtSide(['forkertTal'])), b.tilfoej, hydreringsOpts);
    assert.ok(navne(b.fund).has('v5-flere-tal-efter-hydrering'), [...navne(b.fund)].join(','));
    const c = samler();
    await K.tjekFlereHydrering(await side(ctx, oversigtSide(['doedtLink'])), c.tilfoej, { ...hydreringsOpts, linkFindes: h => !/findes-ikke/.test(h) });
    assert.ok(navne(c.fund).has('v5-flere-link-doed'), [...navne(c.fund)].join(','));
  });
});

test('C. Hurtigsøgning af piller: korrekt side giver 0 fund; pille-blind søgning og forkert status opdages', async (t) => {
  await medBrowser(t, async ctx => {
    const ok = samler();
    await K.tjekHurtigsoegPiller(await side(ctx, oversigtSide()), ok.tilfoej, { piller: FLERE_PILLER });
    assert.deepStrictEqual(ok.fund, [], JSON.stringify(ok.fund));
    const blind = samler();
    await K.tjekHurtigsoegPiller(await side(ctx, oversigtSide(['ingenPilleSoeg'])), blind.tilfoej, { piller: FLERE_PILLER });
    assert.ok(navne(blind.fund).has('v5-hurtigsoeg-pille-filter'), [...navne(blind.fund)].join(','));
    assert.ok(navne(blind.fund).has('v5-hurtigsoeg-status'), [...navne(blind.fund)].join(','));
    const uden = samler();
    await K.tjekHurtigsoegPiller(await side(ctx, '<!doctype html><body><ul class="mk-flere"><li>AJP</li></ul>'), uden.tilfoej, { piller: FLERE_PILLER });
    assert.ok(navne(uden.fund).has('v5-hurtigsoeg-mangler'));
  });
});

/* ---------- D: ukendt ?brands i H1 ---------- */

async function h1Abn(ctx, mut) {
  await ctx.route('http://ctl.test/**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: h1Side(mut) }));
  return async sti => { const p = await ctx.newPage(); await p.goto('http://ctl.test/' + sti); return p; };
}

test('D. Ukendt ?brands=xyz i H1: ren side giver 0 fund; spejling i H1 og title opdages', async (t) => {
  await medBrowser(t, async ctx => {
    const ok = samler();
    await K.tjekUkendtMaerkeH1(await h1Abn(ctx, []), ok.tilfoej);
    assert.deepStrictEqual(ok.fund, [], JSON.stringify(ok.fund));
    await ctx.unroute('http://ctl.test/**');
    const d = samler();
    await K.tjekUkendtMaerkeH1(await h1Abn(ctx, ['spejl']), d.tilfoej);
    assert.ok(navne(d.fund).has('v5-ukendt-maerke-i-h1'), [...navne(d.fund)].join(','));
    await ctx.unroute('http://ctl.test/**');
    const e = samler();
    await K.tjekUkendtMaerkeH1(await h1Abn(ctx, ['title']), e.tilfoej);
    assert.ok(navne(e.fund).has('v5-ukendt-maerke-i-title'), [...navne(e.fund)].join(','));
  });
});

/* ---------- Kendt-listen ---------- */

test('kendt-listen: v5-poster er kun v5-tjek (og kun dem, kontrollerne kan udløse), ingen duplikater', () => {
  const kendt = JSON.parse(fs.readFileSync(KENDT, 'utf8'));
  assert.strictEqual(new Set(kendt).size, kendt.length, 'dubletter i kendt-listen');
  const v5 = kendt.filter(k => /^v5-/.test(k));
  assert.ok(v5.length >= 10, 'v5-krav skal stå som kendte fund indtil de er rettet: ' + v5.length);
  for (const k of v5) assert.ok(/\|\*$/.test(k), `v5-poster er jokere (tjek|*): ${k}`);
  /* Fejl i selve kontrollerne (kunne-ikke-koere) og konsolfejl er ægte regressioner og må aldrig være "kendte". */
  for (const k of v5) assert.ok(!/kunne-ikke-koere|konsolfejl|supabase-skrivning/.test(k), `må ikke være kendt: ${k}`);
});
