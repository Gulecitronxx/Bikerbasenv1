/* Fælles harness til w7-funktion-testene (ikke selv en test).

   Kører browserscripts (uden module.exports) mod en lille fake DOM, hvor getElementById opretter
   elementer efter behov og husker innerHTML/textContent/hændelseslyttere. Så kan testene kalde de
   rigtige render- og klikfunktioner og læse, hvad siden ville vise. Mønsteret er det samme som i
   js/w5-hjaelp.js: koden er den, browseren kører. */

const fs = require('node:fs');
const path = require('node:path');

const læs = f => fs.readFileSync(path.join(__dirname, /\.html$/.test(f) ? '..' : '.', f), 'utf8');

function lavDom(){
  const elementer = new Map();
  const noop = () => {};
  function lavEl(id){
    const attrs = {};
    const lyttere = {};
    const el = {
      id, innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, checked: false,
      style: { setProperty: noop }, dataset: {}, children: [], className: '',
      classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
      setAttribute(k, v){ attrs[k] = String(v); }, getAttribute(k){ return k in attrs ? attrs[k] : null; },
      removeAttribute(k){ delete attrs[k]; },
      attrs,
      addEventListener(t, fn){ (lyttere[t] = lyttere[t] || []).push(fn); },
      lyttere,
      async hændelse(t, ev){ for (const fn of (lyttere[t] || [])) await fn(Object.assign({ preventDefault: noop, currentTarget: el, target: el }, ev)); },
      appendChild(c){ el.children.push(c); return c; }, insertAdjacentElement(_, c){ el.children.push(c); return c; },
      querySelector: () => null, querySelectorAll: () => [], closest: () => null, remove: noop,
      focus(){ dom.fokus = el; }, click(){ return el.hændelse('click'); },
      firstChild: { textContent: '' }, firstElementChild: null, offsetParent: {},
    };
    return el;
  }
  const dom = {
    elementer, fokus: null, dcl: [],
    el(id){ if (!elementer.has(id)) elementer.set(id, lavEl(id)); return elementer.get(id); },
    document: null,
  };
  const doc = {
    readyState: 'loading', title: '',
    getElementById: id => dom.el(id),
    querySelector: () => null, querySelectorAll: () => [],
    createElement: () => lavEl(null),
    addEventListener: (t, fn) => { if (t === 'DOMContentLoaded') dom.dcl.push(fn); },
    documentElement: lavEl('html'),
    body: Object.assign(lavEl('body'), { classList: { add: noop, remove: noop, toggle: noop } }),
  };
  dom.document = doc;
  return dom;
}

/* indstillinger: { fri: boolean (FRI_ADGANG), betaling: boolean (BETALING_BYGGET), db: {...}, bruger: {...} }. */
function lavSide(kilder, navne, indstillinger){
  const o = Object.assign({ fri: true, betaling: false, db: { enabled: false } }, indstillinger || {});
  const dom = lavDom();
  const lager = {};
  const localStorage = { getItem: k => (k in lager ? lager[k] : null), setItem: (k, v) => { lager[k] = String(v); }, removeItem: k => { delete lager[k]; }, clear: () => { for (const k in lager) delete lager[k]; } };
  const toasts = [];
  const patch = (fil, kode) => {
    if (fil === 'data.js') return kode.replace(/const FRI_ADGANG = (true|false);/, `const FRI_ADGANG = ${o.fri};`);
    if (fil === 'store.js') return kode.replace(/const BETALING_BYGGET = (true|false);/, `const BETALING_BYGGET = ${o.betaling};`);
    return kode;
  };
  const noop = () => {};
  const timere = [];
  const src = (o.foer || '') + '\n;\n' + kilder.map(f => patch(f, læs(f))).join('\n;\n') + '\n;\n' + (o.efter || '');
  const window = { location: { href: '', search: o.search || '', pathname: '/x.html', hash: '' }, addEventListener: noop, matchMedia: () => ({ matches: false, addEventListener: noop }), scrollTo: noop };
  const location = { href: '', search: o.search || '', pathname: '/x.html', hash: '', origin: 'http://localhost', replace: noop };
  const history = { replaceState: noop, pushState: noop };
  const fn = new Function('document', 'window', 'db', 'localStorage', 'sessionStorage', 'location', 'history', 'confirm', 'navigator', 'console', '__toasts', 'setTimeout',
    src + `
;if (typeof toast === 'function') toast = (m, o) => __toasts.push({ m: String(m), o: o || {} });
return { ${navne.join(', ')} };`);
  const ud = fn(dom.document, window, o.db, localStorage, localStorage, location, history, () => true, {}, console, toasts, (fn) => { timere.push(fn); return timere.length; });
  return Object.assign(ud, { dom, localStorage, toasts, window, timere });
}

/* Afvis-/tæl-hjælp: lav en tekst ud fra html. */
const tekst = html => String(html).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

module.exports = { læs, lavDom, lavSide, tekst };
