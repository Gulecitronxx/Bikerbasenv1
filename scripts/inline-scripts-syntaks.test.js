/* Vagt: hvert inline-script i de committede/byggede sider SKAL kunne parses. Et script, der genereres i en skabelonstreng
   (fx scripts/inline-cookie.js), mister enkelte bagslash — en regex blev til en kommentar og gav "Unexpected end of input"
   på ALLE sider. Browsertestene fangede det; den her gør det på sekunder uden browser. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROD = path.join(__dirname, '..');

test('alle inline-scripts i rod-*.html kan parses (ingen "Unexpected end of input")', () => {
  const fejl = [];
  let antal = 0;
  for (const f of fs.readdirSync(ROD).filter(x => x.endsWith('.html'))){
    const html = fs.readFileSync(path.join(ROD, f), 'utf8');
    const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g;
    let m;
    while ((m = re.exec(html))){
      const attrs = m[1], kode = m[2];
      if (!kode.trim() || /application\/ld\+json|type="importmap"|type="module"/.test(attrs)) continue;
      antal++;
      try { new vm.Script(kode); } catch (e){ fejl.push(`${f}: ${e.message}`); }
    }
  }
  assert.ok(antal > 50, 'fandt næsten ingen inline-scripts (' + antal + ')');
  assert.deepStrictEqual(fejl, []);
});
