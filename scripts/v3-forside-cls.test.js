/* V3: forsiden må ikke flytte layout efter første maling, når siden åbnes efter andre sider (varm cache, flere faner
   parallelt) — regression fra sektionsbytningen, hvor typefliserne kom over folden på mobil. Tre kilder: font-skift der
   bryder sektionsoverskriften, for stor reservation til typefliserne-noten, og antal-linjen i søgekortet. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { koer, playwrightTilgaengelig } = require('./smoke-browser');

test('V3: index har CLS < 0,02 ved 390 og 768 (lys+mørk), også efter andre sider, 3 kørsler i træk', async t => {
  const kan = await playwrightTilgaengelig();
  if (!kan.ok) return t.skip(kan.grund);
  for (let i = 0; i < 3; i++){
    const r = await koer({ pw: kan.pw, sider: ['index.html', 'soegning.html', 'maerker.html', 'guides.html', 'login.html', 'index.html'],
      viewports: [390, 768], temaer: ['lys', 'mørk'], cls: 0.02, stille: true });
    const index = r.maalinger.filter(m => m.side === 'index.html');
    assert.ok(index.length >= 4);
    for (const m of index) assert.ok(m.cls < 0.02, `index ${m.viewport} ${m.tema} kørsel ${i + 1}: CLS ${m.cls}`);
  }
});
