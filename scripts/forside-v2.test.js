/* V2 forside: forbeholdsnoterne afkortes ikke, og tom/fejlet lager hopper ikke (CLS). Kør: node scripts/forside-v2.test.js */
const fs = require('fs'), path = require('path'), assert = require('assert');
const rod = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(rod, 'css/p-forside.css'), 'utf8');
const home = fs.readFileSync(path.join(rod, 'js/home.js'), 'utf8');

const regler = css.match(/body\.home \.(sek-note|kol-note)\s*\{[^}]*\}/g) || [];
assert(regler.length, 'ingen note-regler fundet');
regler.forEach(r => assert(!/text-overflow:\s*ellipsis/.test(r) && !/line-clamp/.test(r), 'note afkortes: ' + r));
assert(!/\.kol-note\{[^}]*ellipsis/.test(css), 'kol-note med ellipsis');
assert(/#featured-sub, #types-sub\):empty\{[^}]*min-height/.test(css), 'noterne mangler reserveret plads');
assert(!/udvalgHoved\.hidden\s*=\s*kandidater/.test(home), 'udvalg-hoved må ikke skjules (sælg-panelet hopper)');
console.log('forside-v2: ok');
