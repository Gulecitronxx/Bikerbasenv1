/* V5 cross-browser: låser scripts/v5-krydsbrowser.js.
   - vurder()/sammenlignKanaler() KAN fejle (syntetiske resultater med konsolfejl, overflow, død cookiedialog, forskellig layouthøjde).
   - Lokal build i hver tilgængelig Chromium-kanal (bundlet Chromium, Google Chrome, Microsoft Edge): ingen konsol-/sidefejl,
     ingen mislykkede forespørgsler, intet vandret overflow, cookiedialog virker (vises, lukker, huskes, siden er klikbar),
     søgning (fritekst + mærkevælger + nulstil) og annoncesiden virker. Kanaler der ikke er installeret springes over.
   Live-kørsel (bikerbasen.dk) er ikke en del af testen (netværk): node scripts/v5-krydsbrowser.js --maal live. */
const test = require('node:test');
const assert = require('node:assert');
const K = require('./v5-krydsbrowser.js');
const sb = require('./smoke-browser.js');

const side = (over = {}) => ({ side: 'index', viewport: 375, tema: 'lys', status: 200, konsol: [], sidefejl: [], fejledeKald: [], http: [], kontrast: { antalUsynlig: 0, antalSvag: 0, eksempler: [], noegler: [] },
  maal: { overflow: 0, hoejde: 3000, h1n: 1, h1: { ff: 'Space Grotesk' }, header: { h: 54 }, kort: { w: 200, h: 300, t: 900 }, fonte: ['IBM Plex Sans', 'Space Grotesk'], tekstNull: false, brudteBilleder: [], antalKort: 8 }, ...over });
const ok = () => ({ kanal: 'chrome', maal: 'lokal', version: '1', probe: {}, sider: [side()], cookie: { vises: true, modal: true, lukker: true, huskes: true, klikbar: true, fejl: [] }, soegning: { alle: 50, fritekst: 10, fritekstKort: 5, maerke: 10, nulstil: 50, fejl: [] }, annonce: { h1: 'X', pris: true, billede: true, fejl: [] } });

test('vurder(): et rent resultat giver ingen fund', () => assert.deepStrictEqual(K.vurder(ok()), []));

test('vurder() kan fejle: konsolfejl, overflow, h1, død cookiedialog, tom søgning, tom annonce, ekstern fejl er kun advarsel', () => {
  const r = ok();
  r.sider = [side({ konsol: ['boom'], maal: { ...side().maal, overflow: 12, h1n: 2, brudteBilleder: ['a.png'], tekstNull: true } }), side({ fejledeKald: ['EKSTERN net::ERR_BLOCKED_BY_ORB assets.x.dk/img'] }), side({ kontrast: { antalUsynlig: 2, antalSvag: 0, eksempler: ['p.x|T (1.1:1)'], noegler: [] } })];
  r.cookie = { vises: true, modal: false, lukker: false, huskes: false, klikbar: false, fejl: ['x'] };
  r.soegning = { alle: 50, fritekst: 50, fritekstKort: 0, maerke: 0, nulstil: 9, fejl: ['y'] };
  r.annonce = { h1: '', pris: false, billede: false, fejl: ['z'] };
  const f = K.vurder(r);
  const tjek = new Set(f.map(x => x.tjek));
  for (const t of ['konsolfejl', 'vandret-overflow', 'h1-antal', 'brudt-billede', 'tekst-null', 'cookie-lukker-ikke', 'cookie-siden-doed', 'cookie-huskes-ikke', 'cookie-konsolfejl', 'soegning-fritekst', 'soegning-maerke', 'soegning-nulstil', 'soegning-konsolfejl', 'annonce-h1', 'annonce-konsolfejl', 'usynlig-tekst', 'ekstern-forespoergsel'])
    assert.ok(tjek.has(t), `mangler ${t}; fik ${[...tjek].join(', ')}`);
  assert.strictEqual(f.find(x => x.tjek === 'ekstern-forespoergsel').niveau, 'advarsel', 'ekstern fejl må ikke være en fejl');
  assert.strictEqual(K.vurder({ kanal: 'x', maal: 'lokal', fatal: 'kunne ikke starte' })[0].tjek, 'kunne-ikke-koere');
});

test('sammenlignKanaler() finder layoutforskelle mellem kanaler og tier om ens resultater', () => {
  const a = ok(); const b = { ...ok(), kanal: 'msedge' };
  assert.deepStrictEqual(K.sammenlignKanaler([a, b]), []);
  b.sider = [side({ maal: { ...side().maal, hoejde: 3400, header: { h: 70 }, fonte: ['IBM Plex Sans'] } })];
  const d = K.sammenlignKanaler([a, b]);
  assert.strictEqual(d.length, 1);
  assert.ok(d[0].headerForskel === 16 && d[0].fonte, JSON.stringify(d[0]));
});

for (const kanal of ['chromium', 'chrome', 'msedge']) {
  test(`browser (${kanal}): lokal build uden konsol-/sidefejl, overflow-fri, cookiedialog og søgning virker`, async (t) => {
    const kan = await sb.playwrightTilgaengelig();
    if (!kan.ok) return t.skip(kan.grund);
    const r = await K.koer({ pw: kan.pw, kanaler: [kanal], maal: ['lokal'], sider: ['index', 'soegning', 'annonce', 'maerker'], viewports: [375, 1440], temaer: ['lys'] });
    const res = r.resultater[0];
    if (res.fatal) return t.skip(`${kanal} kan ikke startes her: ${res.fatal}`);
    const fejl = r.fund.filter(f => f.niveau === 'fejl');
    assert.deepStrictEqual(fejl, [], JSON.stringify(fejl.slice(0, 5)));
    assert.ok(res.cookie.vises && res.cookie.lukker && res.cookie.huskes && res.cookie.klikbar, JSON.stringify(res.cookie));
    assert.ok(res.soegning.alle > 0 && res.soegning.fritekst > 0 && res.soegning.fritekst < res.soegning.alle && res.soegning.nulstil === res.soegning.alle, JSON.stringify(res.soegning));
    assert.ok(res.annonce.h1 && res.annonce.pris, JSON.stringify(res.annonce));
    assert.ok(res.sider.length === 8 && res.sider.every(s => s.maal && s.maal.fonte.length >= 2), 'fonte er indlæst på alle sider');
  });
}
