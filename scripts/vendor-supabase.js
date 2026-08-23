/* Kopierer supabase-js fra node_modules til js/vendor/, saa sitet selv serverer
   SDK'et i stedet for at hente "den nyeste 2.x" fra cdn.jsdelivr.net.

   Hvorfor (audit 23.08.2026, B1): <script src="https://cdn.jsdelivr.net/npm/
   @supabase/supabase-js@2"> var et flydende major-tag uden integrity-hash.
   Et kompromitteret eller blot fejlbehaeftet publish paa det tag ville koere
   med fuld adgang til brugerens session paa vores origin — og vi ville vaere
   de sidste til at opdage det. Nu er det en fil i repoet med en kendt
   version og en kendt sha256, og CSP'en behoever ikke laengere tillade en
   fremmed script-vaert.

   Filen er dist/umd/supabase.js — samme build som jsdelivr serverer for @2.
   Den kopieres UROERT (ingen minificering: scripts/udgiv.js springer
   js/vendor/ over), saa sha256 i README'en kan efterproeves mod npm.

   Koer ved opgradering:  npm install @supabase/supabase-js@<ny> && node scripts/vendor-supabase.js
   Deploy-workflowet koerer IKKE npm install, saa js/vendor/ skal committes. */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const PKG = path.join(ROOT, 'node_modules/@supabase/supabase-js');
const KILDE = path.join(PKG, 'dist/umd/supabase.js');
const MAAL_DIR = path.join(ROOT, 'js/vendor');
const MAAL = path.join(MAAL_DIR, 'supabase.js');

if (!fs.existsSync(KILDE)) throw new Error(`Fandt ikke ${KILDE} — koer npm install foerst.`);
const version = require(path.join(PKG, 'package.json')).version;
const bytes = fs.readFileSync(KILDE);
const sha = crypto.createHash('sha256').update(bytes).digest('hex');

fs.mkdirSync(MAAL_DIR, { recursive: true });
fs.writeFileSync(MAAL, bytes);
fs.writeFileSync(path.join(MAAL_DIR, 'README.md'), `# js/vendor

Tredjepartskode, sitet selv serverer. Skrevet af \`scripts/vendor-supabase.js\` — ret ikke i haanden.

| Fil | Pakke | Version | sha256 |
| --- | --- | --- | --- |
| \`supabase.js\` | \`@supabase/supabase-js\` (\`dist/umd/supabase.js\`) | ${version} | \`${sha}\` |

Efterproev mod npm: \`npm pack @supabase/supabase-js@${version}\` og sammenlign \`package/dist/umd/supabase.js\`.

Opgradér: \`npm install @supabase/supabase-js@<ny> && node scripts/vendor-supabase.js\`, og commit baade
\`package-lock.json\` og denne mappe. \`scripts/stamp-version.js\` giver filen nyt \`?v=\` automatisk.
`);
console.log(`js/vendor/supabase.js <- @supabase/supabase-js ${version} (${(bytes.length / 1024).toFixed(0)} KB, sha256 ${sha.slice(0, 12)}…)`);
