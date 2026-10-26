/* Fælles harness til w5-funktion-testene (ikke selv en test).

   Browserscripts uden module.exports evalueres i en funktion, så testen kører den kode,
   browseren kører — samme mønster som js/annoncekort.test.js og js/annonce-skal.test.js.
   `Store` kan overstyres pr. kald (fx for at give getUser() en bruger). */

const fs = require('node:fs');
const path = require('node:path');

const læs = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

function stub(extraStore){
  return `
const noop = () => {};
const elStub = () => ({
  classList:{add:noop,remove:noop,toggle:noop,contains:()=>false}, style:{},
  appendChild:noop, setAttribute:noop, getAttribute:()=>null, addEventListener:noop,
  querySelector:()=>null, querySelectorAll:()=>[], dataset:{}, hidden:true,
  textContent:'', innerHTML:'', firstElementChild:null,
});
const document = {
  addEventListener:noop, querySelector:()=>null, querySelectorAll:()=>[],
  getElementById:()=>null, createElement:elStub, documentElement:elStub(),
  body:{classList:{add:noop,remove:noop,toggle:noop},appendChild:noop,style:{}},
  readyState:'loading', title:'',
};
const window = { location:{href:'',search:'',pathname:'/soegning.html'}, addEventListener:noop,
  matchMedia:()=>({matches:false,addEventListener:noop}), scrollTo:noop, history:{} };
const history = { scrollRestoration:'auto', replaceState:noop, pushState:noop };
const location = { href:'', search:'', pathname:'/soegning.html', origin:'http://localhost' };
const localStorage = { getItem:()=>null, setItem:noop, removeItem:noop };
const sessionStorage = { getItem:()=>null, setItem:noop, removeItem:noop };
const Store = Object.assign({ isComparing:()=>false, isFavorite:()=>false, getUser:()=>null }, ${extraStore || '{}'});
`;
}

/* kilder: filnavne i js/. navne: de globale navne testen vil have tilbage. */
function indlaes(kilder, navne, extraStore, foer){
  /* `foer` (valgfri): kode, der kører FØR kilderne — fx `const bbFlag = n => true;` til flag-tests (V7). */
  const kode = stub(extraStore) + (foer || '') + kilder.map(læs).join('\n') + `\nreturn { ${navne.join(', ')} };`;
  return new Function(kode)();
}

/* Som scripts/shared.js browserModules(), men med valgfrie ekstra navne (fx interne funktioner i broen). */
function broModuler(navne){
  const doc = { readyState: 'loading', addEventListener(){}, querySelector(){ return null; } };
  const store = { getUser: () => null, isFavorite: () => false, isComparing: () => false, getCompare: () => [] };
  const db = { enabled: false, photoUrl: p => p || null };
  const src = ['data.js', 'icons.js', 'bike-art.js', 'components.js', 'sortering.js', 'filtrering.js', 'backend-bridge.js']
    .map(læs).join('\n;\n');
  return new Function('document', 'Store', 'window', 'db', src + `\n;return { ${navne.join(', ')} };`)(doc, store, {}, db);
}

const KORT = ['icons.js', 'data.js', 'filtrering.js', 'components.js'];
const MED_ANNONCE = [...KORT, 'annonce.js'];
const MED_SOEGNING = [...KORT, 'sortering.js', 'search.js'];

module.exports = { læs, indlaes, broModuler, KORT, MED_ANNONCE, MED_SOEGNING };
