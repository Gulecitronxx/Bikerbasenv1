/* Automatisk tilgængelighedsaudit (WCAG 2.2 AA) af hele sitet — offline, uden axe-core, uden netværk.

   Kør:  node scripts/a11y-tjek.js                          (alle rod-*.html × 390+1440 × lys+mørk + reflow + reduceret bevægelse)
         node scripts/a11y-tjek.js --hurtig                 (8 sider, lys)
         node scripts/a11y-tjek.js --sider index,login --viewports 390 --temaer lys
         node scripts/a11y-tjek.js --rapport work/a11y.json --md work/a11y.md --strikt

   Genbruger smoke-browser.js (statisk server, net-mock, fixtures): al trafik udefra blokeres, Supabase besvares
   med syntetiske fixtures. Ingen produktion læses, intet skrives andet end --rapport / --md.

   Tjek (regel-id → se RULER): sprog, titel, h1, overskrift-spring, landmarks, nav-navn, skip-link, felt-navn,
   knap-navn, link-navn, link-tvetydig, billede-alt, kontrast (+ uafgjort), fokus (indikator, skjult, fælder,
   klikbare uden tastatur, modal/drawer), ARIA-validitet, tap-mål, prefers-reduced-motion, reflow 320/720 px,
   tekstafstand (1.4.12), live-regioner.

   Prioritet: P1 blokerer tastatur/skærmlæser · P2 tydeligt WCAG-brud · P3 forbedring. "U" = kan ikke afgøres (tæller ikke).
   Exit 0 normalt · 1 med --strikt og fund over tærskel (--maks-p1 0 --maks-p2 0 --maks-p3 uendelig) · 2 kunne ikke køre.

   Brug som modul:  const { koer } = require('./a11y-tjek'); await koer({ rod, sider, viewports, temaer, ... }) */

const fs = require('fs');
const path = require('path');
const smoke = require('./smoke-browser');
const { uuid } = require('./smoke-fixtures');

const REPO = path.join(__dirname, '..');
const STANDARD_QUERY = { 'annonce.html': `?id=${uuid(1)}` };
const VIEWPORT_HOEJDE = { 320: 640, 390: 844, 720: 900, 1440: 900 };

/* ---------- Regelkatalog ---------- */

const RULER = {
  'sprog':             { wcag: '3.1.1', prio: 'P1', titel: 'html lang er ikke "da"', forslag: 'Sæt <html lang="da"> i skabelonen.' },
  'titel':             { wcag: '2.4.2', prio: 'P2', titel: 'Siden mangler en sigende <title>', forslag: 'Giv siden en unik, beskrivende <title>.' },
  'h1':                { wcag: '1.3.1', prio: 'P2', titel: 'Antal synlige h1 er ikke 1', forslag: 'Brug præcis én h1 pr. side.' },
  'overskrift-spring': { wcag: '1.3.1 / 2.4.6', prio: 'P3', titel: 'Overskriftsniveau springer', forslag: 'Brug næste niveau (h2 → h3), og styl via CSS i stedet for at vælge niveau efter udseende.' },
  'overskrift-tom':    { wcag: '2.4.6', prio: 'P2', titel: 'Tom overskrift', forslag: 'Fjern elementet eller giv det tekst.' },
  'landmark-main':     { wcag: '1.3.1 / 2.4.1', prio: 'P1', titel: 'Siden har ikke præcis ét main-landmark', forslag: 'Brug ét <main id="main"> omkring sidens hovedindhold.' },
  'landmark-mangler':  { wcag: '1.3.1', prio: 'P3', titel: 'header/nav/footer-landmark mangler', forslag: 'Brug <header>, <nav> og <footer> (direkte under body) til sidens struktur.' },
  'nav-navn':          { wcag: '1.3.1 / 2.4.6', prio: 'P2', titel: 'Flere nav uden unikt aria-label', forslag: 'Giv hver <nav> et unikt aria-label (fx "Hovednavigation", "Sidefod").' },
  'skip-link':         { wcag: '2.4.1', prio: 'P2', titel: 'Skip-link mangler eller peger i luften', forslag: 'Første fokuserbare element skal være <a href="#main">Spring til indhold</a> med eksisterende mål.' },
  'felt-navn':         { wcag: '1.3.1 / 3.3.2 / 4.1.2', prio: 'P1', titel: 'Formularfelt uden tilgængeligt navn', forslag: 'Tilføj <label for>, aria-label eller aria-labelledby.' },
  'felt-placeholder':  { wcag: '3.3.2', prio: 'P3', titel: 'Formularfelt navngivet kun via placeholder/title', forslag: 'Tilføj en synlig <label>; placeholder forsvinder ved indtastning.' },
  'autocomplete':      { wcag: '1.3.5', prio: 'P3', titel: 'Personfelt uden autocomplete', forslag: 'Tilføj autocomplete (name, email, tel, postal-code …).' },
  'knap-navn':         { wcag: '4.1.2', prio: 'P1', titel: 'Knap uden tilgængeligt navn', forslag: 'Tilføj aria-label (ikon-knapper) eller synlig tekst.' },
  'link-navn':         { wcag: '2.4.4 / 4.1.2', prio: 'P1', titel: 'Link uden tilgængeligt navn', forslag: 'Tilføj linktekst eller aria-label (billede-link: alt på billedet).' },
  'link-tvetydig':     { wcag: '2.4.4', prio: 'P3', titel: 'Samme linktekst til forskellige destinationer', forslag: 'Gør teksten unik (aria-label med kontekst, fx "Se annonce: Honda CB 500").' },
  'link-som-knap':     { wcag: '4.1.2', prio: 'P3', titel: 'Link med href="#" bruges som knap', forslag: 'Brug <button type="button">.' },
  'billede-alt':       { wcag: '1.1.1', prio: 'P1', titel: 'Billede uden alt-attribut', forslag: 'Tilføj alt (beskrivende) eller alt="" for dekorative billeder.' },
  'billede-alt-fil':   { wcag: '1.1.1', prio: 'P3', titel: 'Alt-tekst ligner et filnavn', forslag: 'Skriv en beskrivende alt eller alt="" hvis billedet er dekorativt.' },
  'svg-navn':          { wcag: '1.1.1', prio: 'P2', titel: 'Informativ SVG (role=img) uden navn', forslag: 'Tilføj aria-label / <title>, eller aria-hidden="true" hvis dekorativ.' },
  'kontrast':          { wcag: '1.4.3', prio: 'P2', titel: 'Tekstkontrast under 4,5:1 (3:1 stor tekst)', forslag: 'Mørkn tekstfarven / lysn baggrunden til mindst 4,5:1; ret tokenet, ikke enkeltstedet.' },
  'kontrast-ui':       { wcag: '1.4.11', prio: 'P3', titel: 'Formularkontrol-kant under 3:1 mod baggrunden', forslag: 'Brug en kantfarve (eller fyldfarve) med mindst 3:1 mod omgivelserne.' },
  'kontrast-uafgjort': { wcag: '1.4.3', prio: 'U', titel: 'Kontrast kan ikke afgøres (gradient/billede bag teksten)', forslag: 'Kontrollér manuelt; sikr at teksten har en ensfarvet/mørklagt underlæg.' },
  'fokus-usynlig':     { wcag: '2.4.7 / 2.4.13', prio: 'P1', titel: 'Fokus er ikke synligt', forslag: 'Giv :focus-visible en tydelig outline (≥2 px, ≥3:1) — fjern aldrig outline uden erstatning.' },
  'fokus-skjult-input':{ wcag: '2.4.7', prio: 'P3', titel: 'Fokusindikator kan ikke måles (skjult input / range-thumb)', forslag: 'Sørg for at input:focus-visible + label/boks får synlig outline.' },
  'fokus-skjult':      { wcag: '2.4.11', prio: 'P2', titel: 'Fokuseret element dækkes af andet indhold', forslag: 'Brug scroll-padding-top/bottom svarende til sticky/fixed elementer.' },
  'tastaturfaelde':    { wcag: '2.1.2', prio: 'P1', titel: 'Tastaturfælde', forslag: 'Sørg for at Tab/Shift+Tab kan forlade komponenten.' },
  'klikbar-ikke-tastatur': { wcag: '2.1.1 / 4.1.2', prio: 'P1', titel: 'Klik-handler på element uden tastaturadgang', forslag: 'Brug <button>/<a href>, eller tilføj role, tabindex="0" og Enter/Space.' },
  'rolle-ikke-fokuserbar': { wcag: '2.1.1', prio: 'P1', titel: 'Interaktiv ARIA-rolle på ikke-fokuserbart element', forslag: 'Brug native element eller tilføj tabindex="0" + tastaturhåndtering.' },
  'tabindex-positiv':  { wcag: '2.4.3', prio: 'P2', titel: 'tabindex > 0 ændrer tab-rækkefølgen', forslag: 'Fjern positivt tabindex; ret DOM-rækkefølgen.' },
  'ikke-tab-bar':      { wcag: '2.1.1', prio: 'P3', titel: 'Synlige interaktive elementer nås ikke med Tab', forslag: 'Fjern tabindex="-1" fra interaktive elementer, der skal kunne nås.' },
  'tab-raekkefoelge':  { wcag: '2.4.3', prio: 'P3', titel: 'Tab-rækkefølgen springer langt tilbage', forslag: 'Tilpas DOM-rækkefølgen til den visuelle.' },
  'modal-fokus-ind':   { wcag: '2.4.3', prio: 'P1', titel: 'Fokus flyttes ikke ind i åbnet dialog/drawer', forslag: 'Kald focus() på første fokuserbare element (eller dialogen med tabindex="-1") ved åbning.' },
  'modal-fokus-faanges':{ wcag: '2.4.3', prio: 'P1', titel: 'Fokus fanges ikke i modal dialog/drawer', forslag: 'Brug <dialog>.showModal() eller inert på resten af siden / focus-trap.' },
  'modal-escape':      { wcag: '2.1.1', prio: 'P1', titel: 'Escape lukker ikke dialog/drawer', forslag: 'Lyt på keydown Escape og luk; opdatér aria-expanded.' },
  'modal-fokus-retur': { wcag: '2.4.3', prio: 'P2', titel: 'Fokus returneres ikke til udløseren ved lukning', forslag: 'Husk document.activeElement ved åbning og kald trigger.focus() ved lukning.' },
  'aria-rolle':        { wcag: '4.1.2', prio: 'P2', titel: 'Ugyldig ARIA-rolle', forslag: 'Brug en gyldig WAI-ARIA 1.2-rolle eller fjern role.' },
  'aria-attribut':     { wcag: '4.1.2', prio: 'P3', titel: 'Ukendt aria-attribut', forslag: 'Ret stavefejl eller fjern.' },
  'aria-reference':    { wcag: '1.3.1 / 4.1.2', prio: 'P2', titel: 'ARIA/label-reference peger på manglende id', forslag: 'Ret id-referencen eller fjern attributten.' },
  'dublet-id':         { wcag: '4.1.2', prio: 'P2', titel: 'Dubleret id', forslag: 'Gør id\'et unikt.' },
  'aria-hidden-fokus': { wcag: '4.1.2 / 1.3.1', prio: 'P1', titel: 'aria-hidden indeholder fokuserbart indhold', forslag: 'Fjern aria-hidden, eller gør indholdet ufokuserbart (inert / tabindex="-1" + disabled).' },
  'aria-tilstand':     { wcag: '4.1.2', prio: 'P2', titel: 'aria-expanded/pressed/selected ugyldig eller i uoverensstemmelse', forslag: 'Brug true/false, og hold værdien synkron med den faktiske tilstand.' },
  'aria-ubrugt':       { wcag: '4.1.2', prio: 'P3', titel: 'aria-label på element uden rolle (ignoreres)', forslag: 'Tilføj en rolle eller flyt label til et interaktivt element.' },
  'tap-maal':          { wcag: '2.5.8', prio: 'P2', titel: 'Tap-mål under 24×24 px', forslag: 'Mindst 24×24 px (eller min-height med padding); undtagelse for links i løbende tekst.' },
  'tap-maal-primaer':  { wcag: '2.5.8 (best practice)', prio: 'P3', titel: 'Primært tap-mål under 40 px (mobil)', forslag: 'Brug min-height: 44px på primære knapper.' },
  'bevaegelse':        { wcag: '2.3.3 / 2.2.2', prio: 'P3', titel: 'Animation kører trods prefers-reduced-motion', forslag: 'Pak animationer i @media (prefers-reduced-motion: no-preference) eller nulstil under reduce.' },
  'bevaegelse-uendelig':{ wcag: '2.2.2', prio: 'P2', titel: 'Uendelig animation kører trods prefers-reduced-motion', forslag: 'Stop uendelige animationer under reduce.' },
  'reflow':            { wcag: '1.4.10', prio: 'P2', titel: 'Vandret scroll ved 320 px / 200 % zoom', forslag: 'Fjern faste bredder; brug min-width:0, flex-wrap, overflow-wrap.' },
  'reflow-afklip':     { wcag: '1.4.10', prio: 'P2', titel: 'Indhold klippes ved 320 px', forslag: 'Undgå overflow:hidden med fast højde/bredde på tekstcontainere.' },
  'tekstafstand':      { wcag: '1.4.12', prio: 'P2', titel: 'Tekst klippes/overlapper med øget tekstafstand', forslag: 'Brug min-height i stedet for height og undgå overflow:hidden på tekstbokse.' },
  'live-region':       { wcag: '4.1.3', prio: 'P2', titel: 'Fejl/status-beholder uden role=alert/status/aria-live', forslag: 'Tilføj role="alert" (fejl) eller role="status" (statusbesked) på beholderen, før teksten indsættes.' },
  'indlaesning':       { wcag: '-', prio: 'P2', titel: 'Siden kunne ikke måles', forslag: 'Se detaljen.' },
};
const PRIO_RK = { P1: 1, P2: 2, P3: 3, U: 4 };

/* ---------- Sidefamilie ---------- */

function familie(side){
  const n = String(side).replace(/\.html$/, '');
  if (n === 'index') return 'forside';
  if (n === 'maerker') return 'maerke-oversigt';
  if (/^maerke-/.test(n)) return 'maerke';
  if (/^model-/.test(n)) return 'model';
  if (/^type-/.test(n)) return 'type';
  if (/^by-/.test(n)) return 'by';
  if (/^region-/.test(n)) return 'region';
  if (/^budget-/.test(n)) return 'budget';
  if (/^mc-/.test(n)) return 'mc-kategori';
  if (/^guide/.test(n)) return 'guide';
  if (/^koerekort/.test(n)) return 'koerekort';
  if (/^annonce/.test(n)) return 'annonce';
  if (n === 'soegning') return 'soegning';
  if (/^(login|dashboard|mine-annoncer|opret-annonce|forhandler)$/.test(n)) return 'konto';
  return 'tekstside';
}

/* ---------- Kode der kører i siden ---------- */

/* Init-script: husker elementer, der får klik-lyttere (til "klikbar uden tastatur"). */
function a11yInit(){
  window.__a11y = { klik: [] };
  const orig = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(t, l, o){
    try { if (/^(click|mousedown|mouseup|pointerdown|touchstart)$/.test(t) && this instanceof Element) window.__a11y.klik.push(new WeakRef(this)); } catch (e) { /* ignorér */ }
    return orig.call(this, t, l, o);
  };
}

/* Statisk DOM-audit. Returnerer [{ regel, sel, besked, prio? }]. Selvstændig (serialiseres til siden). */
function auditDom(cfg){
  const F = [];
  const set = new Set();
  const sel = el => {
    const dele = [];
    let n = el;
    for (let d = 0; n && n.nodeType === 1 && n !== document.body && n !== document.documentElement && d < 4; d++, n = n.parentElement){
      let s = n.tagName.toLowerCase();
      if (n.id){ dele.unshift(s + '#' + n.id); break; }
      const c = typeof n.className === 'string' ? n.className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : [];
      if (c.length) s += '.' + c.join('.');
      dele.unshift(s);
    }
    return dele.join(' > ') || (el.tagName || '').toLowerCase();
  };
  const add = (regel, el, besked, prio) => {
    const s = el ? sel(el) : '';
    const k = regel + '|' + s + '|' + besked;
    if (set.has(k)) return;
    set.add(k);
    F.push({ regel, sel: s, besked, prio });
  };
  const synlig = el => {
    try { return el.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true }); }
    catch (e) { return !!(el.getClientRects && el.getClientRects().length); }
  };
  const skjultForAT = el => !!el.closest('[aria-hidden="true"],[hidden],[inert]') || !synlig(el);
  const FOKUS = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[tabindex],[contenteditable=true],iframe';

  /* ---- Navneberegning (forenklet accname) ---- */
  const tekstAf = (n, d) => {
    if (d > 8) return '';
    if (n.nodeType === 3) return n.nodeValue;
    if (n.nodeType !== 1) return '';
    if (n.getAttribute('aria-hidden') === 'true' || n.hidden) return '';
    const cs = getComputedStyle(n);
    if (cs.display === 'none' || cs.visibility === 'hidden') return '';
    const al = n.getAttribute('aria-label');
    if (al && al.trim()) return al;
    const tag = n.tagName.toLowerCase();
    if (tag === 'img') return n.getAttribute('alt') || '';
    if (tag === 'svg'){ const t = n.querySelector(':scope > title'); return t ? t.textContent : ''; }
    if (tag === 'input' && /^(button|submit|reset)$/.test(n.type)) return n.value || '';
    let s = '';
    for (const c of n.childNodes) s += tekstAf(c, d + 1) + (c.nodeType === 1 && getComputedStyle(c).display !== 'inline' ? ' ' : '');
    return s;
  };
  const accName = el => {
    const lb = el.getAttribute('aria-labelledby');
    if (lb){
      const t = lb.split(/\s+/).map(id => { const r = document.getElementById(id); return r ? (r.getAttribute('aria-label') || r.textContent) : ''; }).join(' ').trim();
      if (t) return { n: t, k: 'labelledby' };
    }
    const al = el.getAttribute('aria-label');
    if (al && al.trim()) return { n: al.trim(), k: 'aria-label' };
    const tag = el.tagName;
    if (tag === 'IMG' || (tag === 'INPUT' && el.type === 'image')){
      const a = el.getAttribute('alt');
      if (a && a.trim()) return { n: a.trim(), k: 'alt' };
    }
    const felt = /^(INPUT|SELECT|TEXTAREA)$/.test(tag) && !/^(button|submit|reset|image)$/.test(el.type || '');
    if (felt){
      const ls = el.labels ? [...el.labels] : [];
      const t = ls.map(l => tekstAf(l, 0)).join(' ').replace(/\s+/g, ' ').trim();
      if (t) return { n: t, k: 'label' };
    } else {
      const t = tekstAf(el, 0).replace(/\s+/g, ' ').trim();
      if (t) return { n: t, k: 'indhold' };
    }
    const ti = el.getAttribute('title');
    if (ti && ti.trim()) return { n: ti.trim(), k: 'title' };
    const ph = el.getAttribute('placeholder');
    if (ph && ph.trim()) return { n: ph.trim(), k: 'placeholder' };
    return { n: '', k: '' };
  };

  /* ---- (a) dokument ---- */
  const html = document.documentElement;
  if (!/^da(-|$)/i.test(html.getAttribute('lang') || '')) add('sprog', html, `lang="${html.getAttribute('lang') || ''}"`);
  if (!document.title || !document.title.trim()) add('titel', html, 'tom title');
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]')].filter(h => synlig(h) && !h.closest('[aria-hidden="true"]'));
  const h1s = hs.filter(h => h.tagName === 'H1');
  if (h1s.length !== 1) add('h1', h1s[0] || document.body, `${h1s.length} synlige h1`);
  let forrige = 0;
  for (const h of hs){
    const niv = /^H[1-6]$/.test(h.tagName) ? Number(h.tagName[1]) : Number(h.getAttribute('aria-level')) || 2;
    if (!tekstAf(h, 0).trim() && !h.querySelector('img[alt]:not([alt=""])')) add('overskrift-tom', h, 'overskrift uden tekst');
    if (forrige && niv > forrige + 1) add('overskrift-spring', h, `h${forrige} → h${niv}: "${tekstAf(h, 0).trim().replace(/\s+/g, ' ').slice(0, 50)}"`);
    forrige = niv;
  }

  /* ---- (b) landmarks ---- */
  const mains = [...document.querySelectorAll('main,[role=main]')].filter(m => !m.closest('[hidden]'));
  if (mains.length !== 1) add('landmark-main', mains[0] || document.body, `${mains.length} main-landmarks`);
  if (!document.querySelector('body > header, [role=banner], body > * > header')) add('landmark-mangler', document.body, 'ingen header/banner');
  if (!document.querySelector('body > footer, [role=contentinfo], body > * > footer')) add('landmark-mangler', document.body, 'ingen footer/contentinfo');
  const navs = [...document.querySelectorAll('nav,[role=navigation]')].filter(synlig);
  if (!navs.length) add('landmark-mangler', document.body, 'ingen nav');
  if (navs.length > 1){
    const navne = new Map();
    for (const n of navs){
      const l = (n.getAttribute('aria-label') || (n.getAttribute('aria-labelledby') ? accName(n).n : '') || '').trim();
      if (!l) add('nav-navn', n, 'nav uden aria-label (der er ' + navs.length + ' nav)');
      else { if (navne.has(l)) add('nav-navn', n, `aria-label "${l}" bruges flere gange`); navne.set(l, true); }
    }
  }
  const foerste = document.querySelector(FOKUS + ':not([tabindex="-1"])');
  let skipOk = false;
  if (foerste && foerste.tagName === 'A'){
    const h = foerste.getAttribute('href') || '';
    if (h.startsWith('#') && h.length > 1){
      skipOk = !!document.getElementById(decodeURIComponent(h.slice(1)));
      if (!skipOk) add('skip-link', foerste, `skip-link peger på manglende ${h}`);
      else skipOk = true;
    }
  }
  if (!skipOk && !F.some(f => f.regel === 'skip-link')) add('skip-link', foerste || document.body, 'første fokuserbare element er ikke et #anker-link til indholdet');

  /* ---- (c) navne ---- */
  const felter = [...document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]),select,textarea,[role=textbox],[role=combobox],[role=searchbox],[role=slider],[role=spinbutton]')]
    .filter(el => !el.disabled && !skjultForAT(el));
  for (const el of felter){
    const { n, k } = accName(el);
    if (!n) add('felt-navn', el, `${el.tagName.toLowerCase()}${el.type ? '[type=' + el.type + ']' : ''} uden label`);
    else if (k === 'placeholder' || k === 'title') add('felt-placeholder', el, `navn kun fra ${k}: "${n.slice(0, 40)}"`);
    if (el.tagName === 'INPUT' && !el.getAttribute('autocomplete')){
      const tn = (el.name || '') + ' ' + (el.id || '') + ' ' + el.type;
      if (/(^|\W|_)(e-?mail|tel|telefon|phone|navn|name|postnr|zip|city|adresse|address)(\W|_|$)/i.test(tn) || /^(email|tel)$/.test(el.type))
        add('autocomplete', el, `${el.type} "${el.name || el.id}" uden autocomplete`);
    }
  }
  for (const el of document.querySelectorAll('button,[role=button],input[type=submit],input[type=button],input[type=reset]')){
    if (skjultForAT(el) || el.disabled) continue;
    const { n } = accName(el);
    if (!n){
      const ikon = el.querySelector('svg,img,i,span[class*=icon]');
      add('knap-navn', el, ikon ? 'ikon-knap uden aria-label' : 'tom knap');
    }
  }
  const links = [...document.querySelectorAll('a[href]')].filter(a => !skjultForAT(a));
  const pr = new Map();
  for (const a of links){
    const { n } = accName(a);
    if (!n){ add('link-navn', a, `tomt link → ${a.getAttribute('href').slice(0, 60)}`); continue; }
    const h = a.getAttribute('href').trim();
    if (h === '#' || /^javascript:/i.test(h)){ if (!a.getAttribute('role')) add('link-som-knap', a, `"${n.slice(0, 40)}" href="${h.slice(0, 20)}"`); continue; }
    let abs; try { abs = new URL(h, location.href).href; } catch (e) { continue; }
    const k = n.toLowerCase().replace(/\s+/g, ' ');
    if (!pr.has(k)) pr.set(k, { n, hrefs: new Set(), el: a, antal: 0 });
    const g = pr.get(k); g.hrefs.add(abs); g.antal++;
  }
  let tv = 0;
  for (const g of pr.values()){
    if (g.hrefs.size > 1 && tv++ < 12) add('link-tvetydig', g.el, `"${g.n.slice(0, 40)}" bruges til ${g.hrefs.size} forskellige destinationer`);
  }

  /* ---- (d) billeder ---- */
  for (const img of document.querySelectorAll('img,input[type=image]')){
    if (!img.hasAttribute('alt')){ if (!img.closest('[aria-hidden="true"]') && img.getAttribute('role') !== 'presentation' && img.getAttribute('role') !== 'none') add('billede-alt', img, `uden alt: ${(img.getAttribute('src') || '').slice(0, 60)}`); continue; }
    const a = img.getAttribute('alt');
    if (a && (/\.(jpe?g|png|webp|svg|gif|avif)\b/i.test(a) || /^(img|image|billede|foto|photo|dsc)[-_ ]?\d*$/i.test(a.trim()))) add('billede-alt-fil', img, `alt="${a.slice(0, 50)}"`);
  }
  for (const s of document.querySelectorAll('svg[role=img]')){
    if (skjultForAT(s)) continue;
    if (!accName(s).n && !s.querySelector(':scope > title')) add('svg-navn', s, 'svg[role=img] uden navn');
  }

  /* ---- (g) ARIA ---- */
  const ROLLER = new Set('alert alertdialog application article banner blockquote button caption cell checkbox code columnheader combobox complementary contentinfo definition deletion dialog directory document emphasis feed figure form generic grid gridcell group heading img insertion link list listbox listitem log main marquee math menu menubar menuitem menuitemcheckbox menuitemradio meter navigation none note option paragraph presentation progressbar radio radiogroup region row rowgroup rowheader scrollbar search searchbox separator slider spinbutton status strong subscript superscript switch tab table tablist tabpanel term textbox time timer toolbar tooltip tree treegrid treeitem doc-abstract doc-acknowledgments doc-afterword doc-appendix doc-backlink doc-biblioentry doc-bibliography doc-biblioref doc-chapter doc-colophon doc-conclusion doc-cover doc-credit doc-credits doc-dedication doc-endnote doc-endnotes doc-epigraph doc-epilogue doc-errata doc-example doc-footnote doc-foreword doc-glossary doc-glossref doc-index doc-introduction doc-noteref doc-notice doc-pagebreak doc-pagelist doc-part doc-preface doc-prologue doc-pullquote doc-qna doc-subtitle doc-tip doc-toc'.split(' '));
  const ARIAATTR = new Set('activedescendant atomic autocomplete braillelabel brailleroledescription busy checked colcount colindex colindextext colspan controls current describedby description details disabled dropeffect errormessage expanded flowto grabbed haspopup hidden invalid keyshortcuts label labelledby level live modal multiline multiselectable orientation owns placeholder posinset pressed readonly relevant required roledescription rowcount rowindex rowindextext rowspan selected setsize sort valuemax valuemin valuenow valuetext'.split(' '));
  const INTERAKTIV = new Set(['button', 'link', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'checkbox', 'switch', 'radio', 'textbox', 'combobox', 'slider', 'searchbox', 'spinbutton', 'option', 'treeitem']);
  const idTael = new Map();
  for (const el of document.querySelectorAll('[id]')){
    if (!el.id || el.closest('template')) continue;
    idTael.set(el.id, (idTael.get(el.id) || []).concat(el));
  }
  const refereret = new Set();
  for (const el of document.querySelectorAll('[aria-labelledby],[aria-describedby],[aria-controls],[aria-owns],[aria-activedescendant],[aria-details],[aria-errormessage],label[for]')){
    for (const a of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-activedescendant', 'aria-details', 'aria-errormessage']){
      if (!el.hasAttribute(a)) continue;
      for (const id of el.getAttribute(a).split(/\s+/).filter(Boolean)){
        refereret.add(a === 'aria-controls' ? 'c:' + id : 'r:' + id);
        if (!document.getElementById(id)) add('aria-reference', el, `${a}="${id}" findes ikke`, a === 'aria-controls' ? 'P3' : undefined);
      }
    }
    if (el.tagName === 'LABEL' && el.htmlFor){ refereret.add('r:' + el.htmlFor); if (!document.getElementById(el.htmlFor)) add('aria-reference', el, `label for="${el.htmlFor}" findes ikke`); }
  }
  for (const [id, els] of idTael){
    if (els.length > 1) add('dublet-id', els[1], `id="${id}" findes ${els.length} gange`, refereret.has('r:' + id) ? 'P1' : undefined);
  }
  for (const el of document.querySelectorAll('*')){
    const tag = el.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'svg' || el.closest('svg')) continue;
    const role = (el.getAttribute('role') || '').trim().toLowerCase();
    if (role){
      const r1 = role.split(/\s+/)[0];
      if (!ROLLER.has(r1)) add('aria-rolle', el, `role="${role}"`);
      else if (INTERAKTIV.has(r1) && !el.matches(FOKUS) && !el.hasAttribute('tabindex') && el.getAttribute('aria-disabled') !== 'true' && !skjultForAT(el) && !el.closest('[role=listbox],[role=menu],[role=tablist],[role=radiogroup],[role=tree],[role=combobox]'))
        add('rolle-ikke-fokuserbar', el, `role="${r1}" på <${tag}> uden tabindex`);
      if ((r1 === 'presentation' || r1 === 'none') && el.matches(FOKUS) && !el.matches('[tabindex="-1"]')) add('aria-rolle', el, `role="${r1}" på fokuserbart element`);
    }
    for (const at of el.attributes){
      if (!at.name.startsWith('aria-')) continue;
      const nm = at.name.slice(5);
      if (!ARIAATTR.has(nm)){ add('aria-attribut', el, `${at.name}`); continue; }
      if (/^(expanded|pressed|selected|checked)$/.test(nm)){
        const v = at.value.trim();
        if (!(v === 'true' || v === 'false' || (v === 'mixed' && /^(pressed|checked)$/.test(nm)) || (v === 'undefined' && nm !== 'pressed'))) add('aria-tilstand', el, `${at.name}="${v}"`);
      }
    }
    if (el.hasAttribute('aria-label') && !role && !el.matches('a,button,input,select,textarea,img,svg,nav,main,header,footer,aside,section,form,iframe,dialog,details,summary,table,ul,ol,li,fieldset,figure,article,area,meter,progress,video,audio,canvas,object,label,h1,h2,h3,h4,h5,h6') && !el.hasAttribute('tabindex'))
      add('aria-ubrugt', el, `aria-label på <${tag}> uden rolle`);
    const ti = el.getAttribute('tabindex');
    if (ti !== null && Number(ti) > 0) add('tabindex-positiv', el, `tabindex="${ti}"`);
    if (el.getAttribute('aria-hidden') === 'true'){
      const f = [...el.querySelectorAll(FOKUS), ...(el.matches(FOKUS) ? [el] : [])].find(x => !x.disabled && x.getAttribute('tabindex') !== '-1' && !x.closest('[inert]') && synlig(x));
      if (f) add('aria-hidden-fokus', el, `aria-hidden indeholder fokuserbart <${f.tagName.toLowerCase()}>${f.id ? '#' + f.id : ''}`);
    }
    if (el.hasAttribute('aria-expanded') && el.hasAttribute('aria-controls')){
      const mal = document.getElementById(el.getAttribute('aria-controls').split(/\s+/)[0]);
      if (mal && synlig(el)){
        const aaben = synlig(mal) && !mal.hidden;
        const ex = el.getAttribute('aria-expanded');
        if ((ex === 'true') !== aaben && (ex === 'true' || ex === 'false')) add('aria-tilstand', el, `aria-expanded="${ex}" men målet er ${aaben ? 'synligt' : 'skjult'}`);
      }
    }
  }

  /* ---- Klikbare uden tastatur (lyttere fanget af init-scriptet) ---- */
  const klik = new Set();
  for (const w of (window.__a11y && window.__a11y.klik) || []){
    const el = w.deref && w.deref();
    if (el && el.isConnected && el !== document.body && el !== document.documentElement) klik.add(el);
  }
  const NATIV = 'a[href],button,input,select,textarea,summary,label,[role=button],[role=link],[role=tab],[role=menuitem],[role=checkbox],[role=switch],[role=radio],[role=option],[role=combobox],[tabindex]';
  for (const el of klik){
    if (!synlig(el) || el.matches(NATIV) || el.closest(NATIV) || el.querySelector(NATIV)) continue;
    if (/overlay|backdrop|scrim|modal|dialog|drawer/i.test(el.className + ' ' + el.id) || el.matches('dialog,main,section,header,footer,nav,form,ul,ol')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    add('klikbar-ikke-tastatur', el, `klik-lytter på <${el.tagName.toLowerCase()}> uden role/tabindex`);
  }

  /* ---- (h) tap-mål ---- */
  const INLINE_OK = el => {
    if (el.tagName !== 'A' || getComputedStyle(el).display !== 'inline') return false;
    const p = el.parentElement;
    return !!p && p.textContent.trim().length > el.textContent.trim().length + 3;
  };
  const PRIMAER = 'button[type=submit],.btn-primary,.btn,[class*=cta],[class*=primary],input[type=submit]';
  for (const el of document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab],[role=menuitem]')){
    if (!synlig(el) || el.disabled) continue;
    let mal = el;
    if (el.tagName === 'INPUT' && /^(checkbox|radio)$/.test(el.type)){
      const l = el.closest('label') || (el.id && document.querySelector('label[for="' + CSS.escape(el.id) + '"]'));
      if (l) mal = l;
    }
    const r = mal.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) continue;
    const navn = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    if ((r.width < 24 || r.height < 24) && !INLINE_OK(el)) add('tap-maal', el, `"${navn}" ${Math.round(r.width)}×${Math.round(r.height)} px`);
    else if (cfg.vp <= 480 && el.matches(PRIMAER) && Math.min(r.width, r.height) < 40 && !INLINE_OK(el)) add('tap-maal-primaer', el, `"${navn}" ${Math.round(r.width)}×${Math.round(r.height)} px`);
  }

  /* ---- (l) live-regioner ---- */
  const LIVE_RE = /(^|[-_\s])(error|fejl|status|toast|alert|notice|besked|msg|message|feedback|advarsel)([-_\s]|$)/i;
  for (const el of document.querySelectorAll('[class],[id]')){
    if (el.matches('a,button,input,select,textarea,label,img,svg,li,ul,ol,nav,main,header,footer,body,html,script,style,form,table,tr,td,th,section,article,aside,h1,h2,h3,h4,h5,h6,p,span,strong,em') && !el.hasAttribute('hidden') && el.textContent.trim()) continue;
    if (!LIVE_RE.test((typeof el.className === 'string' ? el.className : '') + ' ' + el.id)) continue;
    if (el.matches('a,button,input,select,textarea,label,img,svg,li,script,style')) continue;
    if (el.closest('[role=alert],[role=status],[role=log],[aria-live]:not([aria-live=off])') || el.querySelector('[role=alert],[role=status],[aria-live]')) continue;
    const dyn = !el.textContent.trim() || !synlig(el) || el.hidden;
    if (!dyn) continue;
    if (el.closest('[aria-hidden=true]') || /^(pre|code)$/i.test(el.tagName)) continue;
    add('live-region', el, !el.textContent.trim() ? 'tom beholder uden live-attribut' : 'skjult beholder uden live-attribut');
  }

  return F;
}

/* Kontrast (1.4.3 / 1.4.11). Selvstændig. Returnerer [{ regel, sel, besked, prio? }]. */
function auditKontrast(){
  const F = [];
  const set = new Set();
  const sel = el => {
    const dele = [];
    let n = el;
    for (let d = 0; n && n.nodeType === 1 && n !== document.body && n !== document.documentElement && d < 3; d++, n = n.parentElement){
      let s = n.tagName.toLowerCase();
      if (n.id){ dele.unshift(s + '#' + n.id); break; }
      const c = typeof n.className === 'string' ? n.className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : [];
      if (c.length) s += '.' + c.join('.');
      dele.unshift(s);
    }
    return dele.join(' > ') || el.tagName.toLowerCase();
  };
  const synlig = el => { try { return el.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true }); } catch (e) { return !!el.getClientRects().length; } };
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const cache = new Map();
  const px = (farve, bund) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = bund; cx.fillRect(0, 0, 1, 1); cx.fillStyle = farve; cx.fillRect(0, 0, 1, 1); return cx.getImageData(0, 0, 1, 1).data; };
  const parse = s => {
    if (cache.has(s)) return cache.get(s);
    let r;
    const m = s.match(/^rgba?\(([^)]+)\)$/);
    if (m){
      const p = m[1].split(/[\s,\/]+/).filter(Boolean);
      const a = p[3] === undefined ? 1 : (String(p[3]).endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3]));
      r = [parseFloat(p[0]), parseFloat(p[1]), parseFloat(p[2]), a];
    } else if (s === 'transparent'){ r = [0, 0, 0, 0]; }
    else {
      const o = px(s, '#000000'), w = px(s, '#ffffff');
      const a = 1 - (w[0] - o[0]) / 255;
      r = a <= 0.001 ? [0, 0, 0, 0] : [o[0] / a, o[1] / a, o[2] / a, a];
    }
    cache.set(s, r);
    return r;
  };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const kontr = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const bland = (fg, bg) => [fg[0] * fg[3] + bg[0] * (1 - fg[3]), fg[1] * fg[3] + bg[1] * (1 - fg[3]), fg[2] * fg[3] + bg[2] * (1 - fg[3])];
  const hex = c => '#' + c.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const medier = [...document.querySelectorAll('img,video,canvas,picture')].filter(m => { const r = m.getBoundingClientRect(); return r.width > 40 && r.height > 40 && synlig(m); }).map(m => ({ el: m, r: m.getBoundingClientRect() }));
  const mork = matchMedia('(prefers-color-scheme: dark)').matches && /dark/.test(getComputedStyle(document.documentElement).colorScheme);
  const lærred = mork ? [18, 18, 18] : [255, 255, 255];

  /* Bagved-farve: { rgb } eller { uafgjort: grund } */
  const bagved = (el, rect) => {
    const lag = [];
    let n = el;
    let opak = false;
    let stop = null;
    for (; n && n.nodeType === 1; n = n.parentElement){
      const cs = getComputedStyle(n);
      if (cs.backgroundImage !== 'none') return { uafgjort: 'baggrundsbillede/gradient på ' + sel(n) };
      const c = parse(cs.backgroundColor);
      if (c[3] > 0){ lag.push(c); if (c[3] >= 0.999){ opak = true; stop = n; break; } }
    }
    if (rect && medier.some(({ el: me, r: m }) => (!stop || stop.contains(me)) && !me.contains(el) && rect.left < m.right && rect.right > m.left && rect.top < m.bottom && rect.bottom > m.top))
      return { uafgjort: 'tekst over billede/video' };
    let rgb = lærred;
    for (let i = lag.length - 1; i >= 0; i--) rgb = bland(lag[i], rgb);
    return { rgb };
  };
  const opacitet = el => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o; };
  const add = (regel, el, besked, prio) => { const k = regel + '|' + sel(el) + '|' + besked; if (set.has(k) || F.filter(f => f.regel === regel).length > 70) return; set.add(k); F.push({ regel, sel: sel(el), besked, prio }); };

  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TITLE', 'OPTION', 'HEAD', 'META', 'LINK', 'SVG', 'PATH']);
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  const range = document.createRange();
  for (let el = w.currentNode; el; el = w.nextNode()){
    if (!el || SKIP.has(el.tagName.toUpperCase()) || el.closest('svg')) continue;
    const tekstNode = [...el.childNodes].find(n => n.nodeType === 3 && /[\p{L}\p{N}]/u.test(n.nodeValue));
    if (!tekstNode) continue;
    if (el.disabled || el.closest('[disabled],[aria-disabled="true"]') || el.closest('[aria-hidden="true"]') || !synlig(el)) continue;
    const cs = getComputedStyle(el);
    range.selectNodeContents(tekstNode);
    const rect = range.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    if (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text' || cs.webkitTextFillColor === 'transparent') { add('kontrast-uafgjort', el, 'tekst med gradient-udfyldning', 'U'); continue; }
    const fg = parse(cs.color);
    const op = opacitet(el);
    const fgA = [fg[0], fg[1], fg[2], fg[3] * op];
    if (fgA[3] < 0.05) continue;
    const bg = bagved(el, rect);
    if (bg.uafgjort){ add('kontrast-uafgjort', el, `${bg.uafgjort}; tekstfarve ${hex(fg)}`, 'U'); continue; }
    const tekst = bland(fgA, bg.rgb);
    const r = kontr(tekst, bg.rgb);
    const px_ = parseFloat(cs.fontSize);
    const fed = parseInt(cs.fontWeight, 10) >= 700;
    const stor = px_ >= 24 || (px_ >= 18.66 && fed);
    const krav = stor ? 3 : 4.5;
    if (r < krav - 0.005){
      add('kontrast', el, `${r.toFixed(2)}:1 (krav ${krav}:1${stor ? ', stor tekst' : ''}) tekst ${hex(tekst)} på ${hex(bg.rgb)}, ${Math.round(px_)}px — "${tekstNode.nodeValue.trim().replace(/\s+/g, ' ').slice(0, 30)}"`, r < 3 ? 'P1' : undefined);
    }
  }
  /* Formularkontrollers kant / fyld (1.4.11). */
  for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=button]):not([type=range]):not([type=file]),select,textarea')){
    if (el.disabled || !synlig(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4) continue;
    const cs = getComputedStyle(el);
    const forael = bagved(el.parentElement || el, null);
    if (forael.uafgjort) continue;
    const eget = parse(cs.backgroundColor);
    let bedst = 1;
    if (eget[3] > 0.99) bedst = Math.max(bedst, kontr(eget, forael.rgb));
    for (const s of ['Top', 'Right', 'Bottom', 'Left']){
      if (parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none'){
        const c = parse(cs['border' + s + 'Color']);
        if (c[3] > 0.01) bedst = Math.max(bedst, kontr(bland(c, forael.rgb), forael.rgb));
      }
    }
    if (bedst < 3) add('kontrast-ui', el, `kant/fyld ${bedst.toFixed(2)}:1 mod baggrunden (krav 3:1)`);
  }
  return F;
}

/* Fokus-basis: snapshot af alle fokuserbare elementer (og deres label/naboer) FØR tab-gennemløbet. */
function fokusBasis(){
  const FOKUS = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[tabindex],[contenteditable=true]';
  const prop = (el, ps) => { const cs = getComputedStyle(el, ps); return [cs.outlineStyle, cs.outlineWidth, cs.outlineColor, cs.boxShadow, cs.borderTopColor, cs.borderTopWidth, cs.backgroundColor, cs.color, cs.textDecorationLine, cs.backgroundImage, cs.filter].join('|'); };
  const kandidater = el => {
    const l = el.labels && el.labels[0] ? [el.labels[0]] : [];
    const ks = new Set([el, ...l, el.parentElement, el.nextElementSibling, el.previousElementSibling]);
    for (const x of [...ks]) if (x && x.querySelector) for (const c of x.querySelectorAll('*')) { ks.add(c); if (ks.size > 25) break; }
    return [...ks].filter(Boolean);
  };
  const snap = el => kandidater(el).map(k => [k, prop(k), prop(k, '::before') + (k.type === 'range' ? prop(k, '::-webkit-slider-thumb') : ''), prop(k, '::after')]);
  window.__a11yBase = new Map();
  let n = 0;
  for (const el of document.querySelectorAll(FOKUS)){
    window.__a11yBase.set(el, snap(el));
    n++;
  }
  window.__a11ySnap = snap;
  return n;
}

/* Aktuelt fokuseret element: data til tab-gennemløbet. */
function fokusStatus(){
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return { body: true };
  const sel = n => {
    const dele = [];
    for (let d = 0, x = n; x && x.nodeType === 1 && x !== document.body && d < 4; d++, x = x.parentElement){
      let s = x.tagName.toLowerCase();
      if (x.id){ dele.unshift(s + '#' + x.id); break; }
      const c = typeof x.className === 'string' ? x.className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : [];
      if (c.length) s += '.' + c.join('.');
      dele.unshift(s);
    }
    return dele.join(' > ');
  };
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  if (!el.__a11yId) el.__a11yId = (window.__a11yTael = (window.__a11yTael || 0) + 1);
  const s = { body: false, id: el.__a11yId, sel: sel(el), tag: el.tagName.toLowerCase(), top: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
  s.iframe = el.tagName === 'IFRAME';
  const lilleInput = el.tagName === 'INPUT' && (r.width <= 2 || r.height <= 2 || parseFloat(cs.opacity) === 0 || /rect\(0/.test(cs.clip) || cs.clipPath !== 'none');
  s.skjultInput = lilleInput || el.type === 'range';
  /* Indikator: sammenlign med basis */
  const basis = window.__a11yBase && window.__a11yBase.get(el);
  const prop = (n, ps) => { const c = getComputedStyle(n, ps); return [c.outlineStyle, c.outlineWidth, c.outlineColor, c.boxShadow, c.borderTopColor, c.borderTopWidth, c.backgroundColor, c.color, c.textDecorationLine, c.backgroundImage, c.filter].join('|'); };
  const nu = prop(el);
  const eget = cs.outlineStyle !== 'none' && (cs.outlineStyle === 'auto' || parseFloat(cs.outlineWidth) > 0) && !/rgba\(\d+, \d+, \d+, 0\)/.test(cs.outlineColor);
  let aendret = false;
  if (basis){
    for (const [k, b0, b1, b2] of basis){
      if (prop(k) !== b0 || prop(k, '::before') + (k.type === 'range' ? prop(k, '::-webkit-slider-thumb') : '') !== b1 || prop(k, '::after') !== b2){ aendret = true; if (k === el) { aendret = 'selv'; break; } }
    }
  }
  s.indikator = eget || aendret === 'selv' || (aendret === true && lilleInput) || (aendret === true);
  s.egenOutline = eget;
  /* Dækket? */
  s.udenfor = r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth;
  if (!s.udenfor && r.width > 2 && r.height > 2 && cs.pointerEvents !== 'none'){
    const x = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1), y = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1);
    const top = document.elementFromPoint(x, y);
    s.daekket = !!top && top !== el && !el.contains(top) && !top.contains(el) ? sel(top) : '';
  }
  return s;
}

/* Tabbare, synlige elementer (til "ikke-tab-bar" og fældedetektion). */
function tabbare(){
  const FOKUS = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[tabindex],[contenteditable=true]';
  const synlig = el => { try { return el.checkVisibility({ checkVisibilityCSS: true }); } catch (e) { return !!el.getClientRects().length; } };
  const sel = n => { let s = n.tagName.toLowerCase(); if (n.id) s += '#' + n.id; else if (typeof n.className === 'string' && n.className.trim()) s += '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.'); return s; };
  const ud = [];
  for (const el of document.querySelectorAll(FOKUS)){
    if (el.disabled || el.closest('[inert]') || el.closest('[aria-hidden="true"]') || !synlig(el)) continue;
    const r = el.getBoundingClientRect();
    ud.push({ sel: sel(el), tabbar: el.tabIndex >= 0, mini: r.width <= 2 || r.height <= 2, roving: !!el.closest('[role=radiogroup],[role=tablist],[role=toolbar],[role=listbox],[role=menu],[role=menubar],[role=tree],[role=grid],[role=combobox]') });
  }
  return ud;
}

/* Tekstafstand (WCAG 1.4.12): mål afklip/overlap før og efter. Ændrer siden — kør sidst. */
function tekstafstand(){
  const synlig = el => { try { return el.checkVisibility({ checkVisibilityCSS: true }); } catch (e) { return !!el.getClientRects().length; } };
  const sel = n => {
    const dele = [];
    for (let d = 0, x = n; x && x.nodeType === 1 && x !== document.body && d < 3; d++, x = x.parentElement){
      let s = x.tagName.toLowerCase();
      if (x.id){ dele.unshift(s + '#' + x.id); break; }
      const c = typeof x.className === 'string' ? x.className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : [];
      if (c.length) s += '.' + c.join('.');
      dele.unshift(s);
    }
    return dele.join(' > ');
  };
  const fixedAnc = el => { for (let n = el; n && n.nodeType === 1; n = n.parentElement){ const p = getComputedStyle(n).position; if (p === 'fixed' || p === 'sticky') return n; } return null; };
  const klipBoks = el => { let k = null; for (let n = el, d = 0; n && n.nodeType === 1 && d < 6; n = n.parentElement, d++){ const cs = getComputedStyle(n); if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible'){ const r = n.getBoundingClientRect(); k = k ? { left: Math.max(k.left, r.left), top: Math.max(k.top, r.top), right: Math.min(k.right, r.right), bottom: Math.min(k.bottom, r.bottom) } : { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; } } return k; };
  const skjultBoks = el => { for (let n = el, d = 0; n && n.nodeType === 1 && d < 3; n = n.parentElement, d++){ const r = n.getBoundingClientRect(); if ((r.width <= 2 || r.height <= 2) && /hidden|clip/.test(getComputedStyle(n).overflow)) return true; } return false; };
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'PATH', 'HEAD']);
  const maal = () => {
    const klip = new Map();
    const tekster = [];
    const range = document.createRange();
    for (const el of document.body.querySelectorAll('*')){
      if (SKIP.has(el.tagName.toUpperCase()) || el.closest('svg') || !synlig(el)) continue;
      const cs = getComputedStyle(el);
      if (/hidden|clip/.test(cs.overflowY + cs.overflowX) && el.textContent.trim()){
        const ell = cs.textOverflow === 'ellipsis' || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none');
        if (!ell && /hidden|clip/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 0) klip.set(sel(el) + '|højde', `${el.scrollHeight}px indhold i ${el.clientHeight}px boks`);
        if (!ell && /hidden|clip/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && !cs.whiteSpace.startsWith('nowrap')) klip.set(sel(el) + '|bredde', `${el.scrollWidth}px indhold i ${el.clientWidth}px boks`);
      }
      const t = [...el.childNodes].filter(n => n.nodeType === 3 && n.nodeValue.trim());
      if (!t.length || cs.position === 'fixed' || skjultBoks(el)) continue;
      const kb = klipBoks(el);
      const fa = fixedAnc(el);
      for (const n of t){
        range.selectNodeContents(n);
        for (const r of range.getClientRects()){
          if (r.width < 1 || r.height < 1) continue;
          let l = r.left, tp = r.top, rt = r.right, bt = r.bottom;
          if (kb){ l = Math.max(l, kb.left); tp = Math.max(tp, kb.top); rt = Math.min(rt, kb.right); bt = Math.min(bt, kb.bottom); }
          if (rt - l > 2 && bt - tp > 2) tekster.push({ el, s: sel(el), l, t: tp, r: rt, b: bt, fa });
        }
      }
    }
    tekster.sort((a, b) => a.t - b.t);
    const overlap = new Map();
    for (let i = 0; i < tekster.length && overlap.size < 40; i++){
      const a = tekster[i];
      for (let j = i + 1; j < tekster.length; j++){
        const b = tekster[j];
        if (b.t >= a.b - 2) break;
        if (a.el.contains(b.el) || b.el.contains(a.el) || a.fa !== b.fa && (a.fa || b.fa)) continue;
        const ix = Math.min(a.r, b.r) - Math.max(a.l, b.l), iy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
        if (ix > 3 && iy > 3) overlap.set(a.s + ' ↔ ' + b.s, `${Math.round(ix)}×${Math.round(iy)} px overlap`);
      }
    }
    return { klip, overlap };
  };
  const foer = maal();
  const st = document.createElement('style');
  st.textContent = '*{line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important} p,li,dd,blockquote,h1,h2,h3,h4,h5,h6{margin-bottom:2em !important}';
  document.head.appendChild(st);
  const efter = maal();
  st.remove();
  const F = [];
  for (const [k, v] of efter.klip) if (!foer.klip.has(k)) F.push({ regel: 'tekstafstand', sel: k.split('|')[0], besked: `afklip (${k.split('|')[1]}): ${v}` });
  for (const [k, v] of efter.overlap) if (!foer.overlap.has(k)) F.push({ regel: 'tekstafstand', sel: k, besked: v });
  return F.slice(0, 25);
}

/* Reflow: vandret scroll + nyt afklip ved smal bredde. */
function reflowMaal(){
  const doc = document.documentElement;
  const vw = doc.clientWidth;
  const F = [];
  const sel = n => { let s = n.tagName.toLowerCase(); if (n.id) s += '#' + n.id; else if (typeof n.className === 'string' && n.className.trim()) s += '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.'); return s; };
  if (doc.scrollWidth > vw + 1){
    const syndere = [];
    const klipper = el => { for (let a = el.parentElement; a && a !== document.body && a !== doc; a = a.parentElement){ const o = getComputedStyle(a).overflowX; if (/auto|scroll|hidden|clip/.test(o)) return true; } return false; };
    for (const el of document.body.querySelectorAll('*')){
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.right <= vw + 1 || getComputedStyle(el).position === 'fixed' || klipper(el)) continue;
      syndere.push({ s: sel(el), right: Math.round(r.right), w: Math.round(r.width) });
      if (syndere.length > 60) break;
    }
    syndere.sort((a, b) => b.right - a.right);
    F.push({ regel: 'reflow', sel: syndere[0] ? syndere[0].s : 'html', besked: `scrollWidth ${doc.scrollWidth} > ${vw}` + (syndere.length ? '; bredeste: ' + syndere.slice(0, 3).map(s => `${s.s} (højre ${s.right})`).join(', ') : '') });
  }
  for (const el of document.body.querySelectorAll('*')){
    const cs = getComputedStyle(el);
    if (!/hidden|clip/.test(cs.overflowX) || !el.textContent.trim() || cs.textOverflow === 'ellipsis' || cs.whiteSpace.startsWith('nowrap')) continue;
    if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth >= 8 && el.clientHeight >= 8 && el.checkVisibility && el.checkVisibility()){
      /* Vandret karrusel/slider med overflow:hidden er et bevidst valg — kun tekstcontainere uden børn med fast bredde flagges. */
      if (el.children.length > 2 && [...el.children].every(c => c.getBoundingClientRect().left >= el.getBoundingClientRect().left - 1)) continue;
      F.push({ regel: 'reflow-afklip', sel: sel(el), besked: `${el.scrollWidth}px indhold klippet i ${el.clientWidth}px (overflow-x:hidden)` });
      if (F.length > 12) break;
    }
  }
  return F;
}

/* Reduceret bevægelse: kører under emuleret prefers-reduced-motion: reduce. */
function bevaegelseMaal(){
  const F = [];
  const sel = n => { if (!n || !n.tagName) return ''; let s = n.tagName.toLowerCase(); if (n.id) s += '#' + n.id; else if (typeof n.className === 'string' && n.className.trim()) s += '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.'); return s; };
  const set = new Set();
  for (const a of document.getAnimations()){
    if (a.playState !== 'running') continue;
    let t; try { t = a.effect.getComputedTiming(); } catch (e) { continue; }
    if (!(t.duration > 0)) continue;
    const el = a.effect.target;
    if (!el || !el.checkVisibility || !el.checkVisibility()) continue;
    const nm = a.animationName || a.transitionProperty || 'animation';
    const uendelig = t.iterations === Infinity;
    const k = nm + '|' + sel(el);
    if (set.has(k)) continue;
    set.add(k);
    F.push({ regel: uendelig ? 'bevaegelse-uendelig' : 'bevaegelse', sel: sel(el), besked: `${a.constructor.name === 'CSSTransition' ? 'transition' : 'animation'} "${nm}" ${Math.round(t.duration)} ms${uendelig ? ' (uendelig)' : ''}` });
  }
  if (getComputedStyle(document.documentElement).scrollBehavior === 'smooth') F.push({ regel: 'bevaegelse', sel: 'html', besked: 'scroll-behavior: smooth under reduce' });
  return F.slice(0, 15);
}

/* ---------- Overlay-test (Node-side orkestrering) ---------- */

/* Finder udløsere (knapper der åbner menu/drawer/dialog). Kører i siden. */
function findUdloesere(){
  const synlig = el => { try { return el.checkVisibility({ checkVisibilityCSS: true }); } catch (e) { return !!el.getClientRects().length; } };
  const sel = n => { let s = n.tagName.toLowerCase(); if (n.id) s += '#' + n.id; else if (typeof n.className === 'string' && n.className.trim()) s += '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.'); return s; };
  const RE = /(menu|burger|hamburger|drawer|nav-toggle|filter|modal|dialog|indstilling|cookie)/i;
  const ud = [];
  const set = new Set();
  for (const el of document.querySelectorAll('button,[role=button],summary')){
    if (el.type === 'submit' || el.disabled || !synlig(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const harAria = el.hasAttribute('aria-expanded') || el.hasAttribute('aria-haspopup') || el.hasAttribute('aria-controls');
    const navnMatch = RE.test((typeof el.className === 'string' ? el.className : '') + ' ' + el.id + ' ' + (el.getAttribute('aria-label') || ''));
    if (!harAria && !navnMatch) continue;
    const s = sel(el) + '|' + (el.getAttribute('aria-label') || el.textContent.trim().slice(0, 20));
    if (set.has(s)) continue;
    set.add(s);
    ud.push(s);
    if (ud.length >= 8) break;
  }
  return ud;
}

/* Kører i siden: marker udløseren nr. i (efter samme rækkefølge/nøgle) og returnér overlay-tilstand. */
function markerUdloeser(nogle){
  const synlig = el => { try { return el.checkVisibility({ checkVisibilityCSS: true }); } catch (e) { return !!el.getClientRects().length; } };
  const paaSkaerm = el => { if (!synlig(el)) return false; const r = el.getBoundingClientRect(); const ix = Math.min(r.right, innerWidth) - Math.max(r.left, 0), iy = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0); return ix > 0 && iy > 0 && ix * iy >= 0.3 * r.width * r.height; };
  const sel = n => { let s = n.tagName.toLowerCase(); if (n.id) s += '#' + n.id; else if (typeof n.className === 'string' && n.className.trim()) s += '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.'); return s; };
  for (const el of document.querySelectorAll('button,[role=button],summary')){
    if (el.type === 'submit' || el.disabled || !synlig(el)) continue;
    if (sel(el) + '|' + (el.getAttribute('aria-label') || el.textContent.trim().slice(0, 20)) === nogle){
      document.querySelectorAll('[data-a11y-trig]').forEach(x => x.removeAttribute('data-a11y-trig'));
      el.setAttribute('data-a11y-trig', '1');
      el.scrollIntoView({ block: 'center' });
      el.focus();
      const kand = document.querySelectorAll('[role=dialog],[aria-modal=true],dialog,[class*=drawer],[class*=modal],[class*=overlay],[class*=menu],[class*=sheet],[class*=panel],[class*=popover],nav');
      window.__a11yFoer = new Set([...kand].filter(paaSkaerm));
      return { fundet: true, expanded: el.getAttribute('aria-expanded'), url: location.href };
    }
  }
  return { fundet: false };
}

/* Efter åbning: hvad blev åbnet, og er fokus inde? */
function overlayStatus(){
  const synlig = el => { try { return el.checkVisibility({ checkVisibilityCSS: true }); } catch (e) { return !!el.getClientRects().length; } };
  const paaSkaerm = el => { if (!synlig(el)) return false; const r = el.getBoundingClientRect(); const ix = Math.min(r.right, innerWidth) - Math.max(r.left, 0), iy = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0); return ix > 0 && iy > 0 && ix * iy >= 0.3 * r.width * r.height; };
  const sel = n => { let s = n.tagName.toLowerCase(); if (n.id) s += '#' + n.id; else if (typeof n.className === 'string' && n.className.trim()) s += '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.'); return s; };
  const trig = document.querySelector('[data-a11y-trig]');
  if (!trig) return { fejl: 'udløser væk' };
  const ctl = trig.getAttribute('aria-controls') ? document.getElementById(trig.getAttribute('aria-controls').split(/\s+/)[0]) : null;
  const kand = [...document.querySelectorAll('[role=dialog],[aria-modal=true],dialog,[class*=drawer],[class*=modal],[class*=overlay],[class*=menu],[class*=sheet],[class*=panel],[class*=popover],nav')].filter(paaSkaerm);
  let nye = kand.filter(k => !window.__a11yFoer.has(k) && !k.contains(trig));
  if (ctl && paaSkaerm(ctl) && !window.__a11yFoer.has(ctl) && !nye.includes(ctl)) nye.push(ctl);
  /* Største nye (men ikke en der indeholder en anden ny) */
  const rang = x => (x.getAttribute('aria-modal') === 'true' || /^(dialog|alertdialog)$/.test(x.getAttribute('role') || '') || x.matches('dialog')) ? 1 : 0;
  const areal = x => { const q = x.getBoundingClientRect(); return q.width * q.height; };
  /* Foretræk eksplicit dialog; ellers det yderste nye element (ikke et barn af et andet nyt). */
  const dialoger = nye.filter(x => rang(x));
  const o = (dialoger.length ? dialoger : nye.filter(a => !nye.some(b => b !== a && b.contains(a)))).sort((a, b) => areal(b) - areal(a))[0];
  const ex = trig.getAttribute('aria-expanded');
  if (!o) return { aaben: false, expanded: ex };
  document.querySelectorAll('[data-a11y-overlay]').forEach(x => x.removeAttribute('data-a11y-overlay'));
  o.setAttribute('data-a11y-overlay', '1');
  const cs = getComputedStyle(o), r = o.getBoundingClientRect();
  let bagTaeppe = false;
  for (const n of document.querySelectorAll('body *')){ if (n === o || o.contains(n) || n.contains(o)) continue; const c = getComputedStyle(n); if (c.position === 'fixed' && n.getBoundingClientRect().width >= innerWidth * 0.95 && n.getBoundingClientRect().height >= innerHeight * 0.95 && synlig(n)) { bagTaeppe = true; break; } }
  const modal = o.getAttribute('aria-modal') === 'true' || o.matches('dialog[open]') || /^(dialog|alertdialog)$/.test(o.getAttribute('role') || '') || (cs.position === 'fixed' && r.width >= innerWidth * 0.7 && r.height >= innerHeight * 0.8) || bagTaeppe;
  const fokuser = o.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[tabindex]:not([tabindex="-1"])');
  return { aaben: true, sel: sel(o), modal, strikt: o.getAttribute('aria-modal') === 'true' || o.matches('dialog[open]'), expanded: ex, fokusInde: o.contains(document.activeElement), antalFokus: [...fokuser].filter(synlig).length, url: location.href };
}

function overlayEfterTab(){
  const o = document.querySelector('[data-a11y-overlay]');
  return { inde: !!o && o.contains(document.activeElement), body: document.activeElement === document.body };
}

function overlayEfterEsc(){
  const synlig = el => { try { return el.checkVisibility({ checkVisibilityCSS: true }); } catch (e) { return !!el.getClientRects().length; } };
  const o = document.querySelector('[data-a11y-overlay]');
  const trig = document.querySelector('[data-a11y-trig]');
  const paaSkaerm = el => { if (!synlig(el)) return false; const r = el.getBoundingClientRect(); const ix = Math.min(r.right, innerWidth) - Math.max(r.left, 0), iy = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0); return ix > 0 && iy > 0 && ix * iy >= 0.3 * r.width * r.height; };
  const lukket = !o || !o.isConnected || !paaSkaerm(o);
  return { lukket, fokusRetur: !!trig && (document.activeElement === trig || trig.contains(document.activeElement)), expanded: trig ? trig.getAttribute('aria-expanded') : null, aktiv: document.activeElement ? document.activeElement.tagName.toLowerCase() : '' };
}

/* ---------- Node-side: én side ---------- */

async function settle(page){
  await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.waitForTimeout(350);
  await page.evaluate(async () => {
    const trin = Math.max(window.innerHeight * 0.8, 200);
    const max = Math.min(document.documentElement.scrollHeight, 30000);
    for (let y = 0; y < max; y += trin){ window.scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 200));
  });
}

async function tabTest(page, maks){
  const F = [];
  const tilf = (regel, sel, besked, prio) => F.push({ regel, sel, besked, prio });
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); window.scrollTo(0, 0); });
  await page.evaluate(fokusBasis);
  const alle = await page.evaluate(tabbare);
  const forventet = alle.filter(a => a.tabbar).length;
  const trin = Math.min(forventet + 6, maks);
  const set = new Map();
  let sidste = null, ens = 0, sidsteTop = null, tilbage = 0, naaetBody = false, trap = false;
  const ikkeIndikator = new Map(), daekket = new Map();
  for (let i = 0; i < trin; i++){
    await page.keyboard.press('Tab');
    const s = await page.evaluate(fokusStatus);
    if (s.body){ naaetBody = true; break; }
    if (s.iframe) continue;
    const gentagelse = set.has(s.id);
    set.set(s.id, (set.get(s.id) || 0) + 1);
    if (sidste === s.id){ ens++; } else ens = 0;
    sidste = s.id;
    if (ens >= 2){ trap = true; tilf('tastaturfaelde', s.sel, `fokus bliver på samme element efter ${ens + 1} Tab-tryk`); break; }
    if (gentagelse && set.size < forventet - 3 && (set.get(s.id) >= 2)){
      /* Cyklus uden at nå alt: er der uset synligt tabbart indhold tilbage? */
      trap = true;
      tilf('tastaturfaelde', s.sel, `fokus cirkulerer mellem ${set.size} elementer efter ${i + 1} Tab-tryk; ${forventet - set.size} tabbare elementer nås aldrig`);
      break;
    }
    if (sidsteTop !== null && s.top < sidsteTop - 400) tilbage++;
    sidsteTop = s.top;
    const usynligRect = s.w <= 2 || s.h <= 2;
    if (!s.indikator){
      if (s.skjultInput) ikkeIndikator.set('P3|' + s.sel, 'fokusindikatoren kan ikke måles automatisk (skjult input / pseudo-element, fx range-thumb) — bekræft manuelt');
      else if (!ikkeIndikator.has('P1|' + s.sel)) ikkeIndikator.set('P1|' + s.sel, `${s.tag} får ingen synlig outline/box-shadow/farveændring ved tastaturfokus`);
    } else if (s.udenfor || (usynligRect && !s.skjultInput)){
      ikkeIndikator.set('P1|' + s.sel, 'fokuseret element er ikke synligt i viewport (' + s.w + '×' + s.h + ')');
    }
    if (s.daekket) daekket.set(s.sel, `dækkes af ${s.daekket}`);
  }
  for (const [k, v] of ikkeIndikator){
    const [p, sel] = k.split('|');
    tilf(p === 'P3' ? 'fokus-skjult-input' : 'fokus-usynlig', sel, v);
  }
  for (const [sel, v] of daekket) tilf('fokus-skjult', sel, v);
  if (tilbage >= 3) tilf('tab-raekkefoelge', 'body', `${tilbage} spring mere end 400 px tilbage i tab-rækkefølgen`);
  if (!trap && naaetBody){
    const ikkeTab = alle.filter(a => !a.tabbar && !a.mini && !a.roving && /^(a|button|input|select|textarea)([.#:]|$)/.test(a.sel));
    if (ikkeTab.length) tilf('ikke-tab-bar', ikkeTab[0].sel, `${ikkeTab.length} synlige interaktive elementer har tabindex="-1", fx ${ikkeTab.slice(0, 3).map(a => a.sel).join(', ')}`);
  }
  return F;
}

async function overlayTest(page, base, url){
  const F = [];
  const tilf = (regel, sel, besked, prio) => F.push({ regel, sel, besked, prio });
  const nogler = await page.evaluate(findUdloesere);
  let skidt = false;
  for (const nogle of nogler){
    if (skidt){ await page.goto(url, { waitUntil: 'load' }).catch(() => {}); await settle(page); skidt = false; }
    const navn = nogle.split('|')[0];
    const m = await page.evaluate(markerUdloeser, nogle);
    if (!m.fundet) continue;
    await page.keyboard.press('Enter');
    await page.waitForTimeout(450);
    if (page.url().split('#')[0] !== url.split('#')[0]){ await page.goto(url, { waitUntil: 'load' }).catch(() => {}); await settle(page); continue; }
    const s = await page.evaluate(overlayStatus);
    if (!s.aaben){
      /* Intet nyt synligt: Hvis aria-expanded skiftede, er målet måske ikke detekteret — ingen påstand. */
      continue;
    }
    skidt = true;
    if (m.expanded === null && s.expanded === null) tilf('aria-tilstand', navn, 'udløser åbner ' + s.sel + ' men har hverken aria-expanded eller aria-controls');
    if (m.expanded !== null && s.expanded !== 'true') tilf('aria-tilstand', navn, `efter åbning (Enter) er aria-expanded="${s.expanded}" (før: "${m.expanded}")`);
    if (s.modal){
      if (!s.fokusInde) tilf('modal-fokus-ind', navn, `${s.sel} åbnes uden at fokus flyttes ind`);
      let forlod = false;
      for (let i = 0; i < Math.max(s.antalFokus, 1) + 3 && !forlod; i++){
        await page.keyboard.press('Tab');
        const t = await page.evaluate(overlayEfterTab);
        if (!t.inde && !t.body){ forlod = true; tilf('modal-fokus-faanges', navn, `Tab forlader ${s.sel} efter ${i + 1} tryk (${s.antalFokus} fokuserbare inde)${s.strikt ? '' : ' [role=dialog uden aria-modal]'}`, s.strikt ? undefined : 'P2'); }
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(450);
      const e = await page.evaluate(overlayEfterEsc);
      if (!e.lukket) tilf('modal-escape', navn, `${s.sel} er stadig åben efter Escape`);
      else {
        if (!e.fokusRetur) tilf('modal-fokus-retur', navn, `fokus er på <${e.aktiv}> efter lukning i stedet for udløseren`);
        if (m.expanded !== null && e.expanded === 'true') tilf('aria-tilstand', navn, 'aria-expanded er stadig "true" efter lukning');
        skidt = false;
      }
    } else {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      const e = await page.evaluate(overlayEfterEsc);
      if (e.lukket) skidt = false;
    }
  }
  return F;
}

async function maalSide({ context, base, port, side, query, viewport, tema, tid, tilstand }){
  const fund = [];
  const page = await context.newPage();
  const tilf = list => { for (const f of list) fund.push(f); };
  const url = `${base}/${side}${query || ''}`;
  try {
    const svar = await page.goto(url, { waitUntil: 'load', timeout: tid });
    if (svar && svar.status() >= 400 && side !== '404.html') fund.push({ regel: 'indlaesning', sel: '', besked: `HTTP ${svar.status()}` });
    await settle(page);
    if (tilstand === 'reflow'){
      tilf(await page.evaluate(reflowMaal));
    } else if (tilstand === 'reduce'){
      await page.waitForTimeout(500);
      tilf(await page.evaluate(bevaegelseMaal));
    } else {
      tilf(await page.evaluate(auditDom, { vp: viewport, tema }));
      tilf(await page.evaluate(auditKontrast));
      tilf(await tabTest(page, 220));
      tilf(await page.evaluate(tekstafstand));
      if (tilstand === 'fuld'){
        await page.goto(url, { waitUntil: 'load', timeout: tid });
        await settle(page);
        tilf(await overlayTest(page, base, url));
      }
    }
  } catch (e) {
    fund.push({ regel: 'indlaesning', sel: '', besked: String((e && e.message) || e).split('\n')[0].slice(0, 200) });
  }
  await page.close().catch(() => {});
  return { side, viewport, tema, tilstand, fund };
}

/* ---------- Samlet kørsel ---------- */

const TEMA_NAVN = { lys: 'light', light: 'light', mørk: 'dark', moerk: 'dark', dark: 'dark' };
const TEMA_VIS = { light: 'lys', dark: 'mørk' };

async function koer(opt = {}){
  const rod = path.resolve(opt.rod || REPO);
  const hurtig = !!opt.hurtig;
  const viewports = (opt.viewports || [390, 1440]).map(Number);
  const temaer = (opt.temaer || (hurtig ? ['lys'] : ['lys', 'mørk'])).map(t => {
    const n = TEMA_NAVN[String(t).toLowerCase()];
    if (!n) throw new Error(`Ukendt tema: ${t} (brug lys eller mørk)`);
    return n;
  });
  const parallel = Math.max(1, Number(opt.parallel) || 3);
  const tid = Number(opt.tid) || 25000;
  const sider = smoke.vaelgSider(rod, { sider: opt.sider, hurtig });
  if (!sider.length) throw new Error('Ingen sider matcher.');
  const pw = opt.pw || (await smoke.playwrightTilgaengelig()).pw;
  if (!pw) throw new Error((await smoke.playwrightTilgaengelig()).grund);
  const { server, port } = await smoke.startServer(rod);
  const base = `http://127.0.0.1:${port}`;
  const blokeret = {};
  const maalinger = [];
  const browser = await pw.chromium.launch({ headless: true });
  const start = Date.now();
  const koerKontekst = async ({ vp, tema, reduce, tilstande }) => {
    const context = await browser.newContext({
      viewport: { width: vp, height: VIEWPORT_HOEJDE[vp] || 900 }, colorScheme: tema, locale: 'da-DK',
      serviceWorkers: 'block', reducedMotion: reduce ? 'reduce' : 'no-preference',
    });
    await context.addInitScript(smoke.initScript, { tema });
    await context.addInitScript(a11yInit);
    await smoke.installerMock(context, port, blokeret);
    const kø = sider.slice();
    await Promise.all(Array.from({ length: Math.min(parallel, kø.length) }, async () => {
      while (kø.length){
        const side = kø.shift();
        const tilstand = typeof tilstande === 'function' ? tilstande() : tilstande;
        const m = await maalSide({ context, base, port, side, query: (opt.query && opt.query[side]) || STANDARD_QUERY[side] || '', viewport: vp, tema, tid, tilstand });
        maalinger.push(m);
        if (!opt.stille) process.stderr.write('.');
      }
    }));
    await context.close();
  };
  try {
    let foerste = true;
    for (const vp of viewports){
      for (const tema of temaer){
        /* Overlay-tests kun én gang pr. viewport (lys, eller første tema) — de er tema-uafhængige. */
        const fuld = !opt.udenOverlay && (tema === temaer[0]);
        void foerste;
        await koerKontekst({ vp, tema, reduce: false, tilstande: fuld ? 'fuld' : 'basis' });
      }
    }
    if (!opt.udenReflow){
      for (const vp of [320, 720]) await koerKontekst({ vp, tema: 'light', reduce: false, tilstande: 'reflow' });
    }
    if (!opt.udenBevaegelse) await koerKontekst({ vp: 1440, tema: 'light', reduce: true, tilstande: 'reduce' });
  } finally {
    await Promise.race([browser.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]);
    try { const pr = browser.process && browser.process(); if (pr && !pr.killed) pr.kill('SIGKILL'); } catch (e) { /* allerede væk */ }
    server.close();
  }
  if (!opt.stille) process.stderr.write('\n');

  /* Flet: ét fund pr. side × regel × sel × besked, med "hvor" (viewport/tema). */
  const flet = new Map();
  for (const m of maalinger){
    const hvor = m.tilstand === 'reflow' ? `${m.viewport}r` : m.tilstand === 'reduce' ? 'reduce' : `${m.viewport}${m.tema === 'dark' ? 'm' : ''}`;
    for (const f of m.fund){
      const meta = RULER[f.regel] || { prio: 'P3', wcag: '', titel: f.regel, forslag: '' };
      const norm = f.besked.replace(/\d+(\.\d+)?/g, '#');
      const key = [m.side, f.regel, f.sel, opt.fuldBesked ? f.besked : norm].join('|');
      if (!flet.has(key)) flet.set(key, { side: m.side, familie: familie(m.side), regel: f.regel, wcag: meta.wcag, prio: f.prio || meta.prio, sel: f.sel, besked: f.besked, hvor: new Set() });
      const x = flet.get(key);
      x.hvor.add(hvor);
      if (PRIO_RK[f.prio || meta.prio] < PRIO_RK[x.prio]) x.prio = f.prio || meta.prio;
    }
  }
  const fund = [...flet.values()].map(f => ({ ...f, hvor: [...f.hvor].sort() }));
  fund.sort((a, b) => PRIO_RK[a.prio] - PRIO_RK[b.prio] || a.regel.localeCompare(b.regel) || a.side.localeCompare(b.side) || a.sel.localeCompare(b.sel));
  /* Mønstre: regel × familie × sel × normaliseret besked (side-uafhængigt). */
  const moenstre = new Map();
  for (const f of fund){
    const k = [f.regel, f.familie, f.sel, f.besked.replace(/\d+(\.\d+)?/g, '#').replace(/"[^"]*"/g, '"…"')].join('|');
    if (!moenstre.has(k)) moenstre.set(k, { regel: f.regel, familie: f.familie, prio: f.prio, wcag: f.wcag, sel: f.sel, besked: f.besked, sider: new Set(), hvor: new Set() });
    const x = moenstre.get(k);
    x.sider.add(f.side); f.hvor.forEach(h => x.hvor.add(h));
  }
  const mon = [...moenstre.values()].map(x => ({ ...x, sider: [...x.sider].sort(), hvor: [...x.hvor].sort() }));
  const tael = p => ({ fund: fund.filter(f => f.prio === p).length, moenstre: mon.filter(m => m.prio === p).length });
  const perRegel = {};
  for (const m of mon){ const r = (perRegel[m.regel] = perRegel[m.regel] || { prio: RULER[m.regel] ? RULER[m.regel].prio : 'P3', moenstre: 0, sider: new Set() }); r.moenstre++; m.sider.forEach(s => r.sider.add(s)); }
  for (const k of Object.keys(perRegel)) perRegel[k].sider = perRegel[k].sider.size;
  return {
    genereret: new Date().toISOString(),
    indstillinger: { rod, sider, viewports, temaer: temaer.map(t => TEMA_VIS[t]), hurtig },
    antalMaalinger: maalinger.length,
    varighedSek: Math.round((Date.now() - start) / 1000),
    blokeredeVaerter: blokeret,
    sammenfatning: { P1: tael('P1'), P2: tael('P2'), P3: tael('P3'), uafgjort: tael('U'), perRegel },
    moenstre: mon.sort((a, b) => PRIO_RK[a.prio] - PRIO_RK[b.prio] || b.sider.length - a.sider.length),
    fund,
  };
}

/* ---------- Rapporter ---------- */

function tabel(rapport, { maksLinjer = 60 } = {}){
  const s = rapport.sammenfatning;
  const ud = [`a11y-tjek: ${rapport.antalMaalinger} målinger (${rapport.indstillinger.sider.length} sider × ${rapport.indstillinger.viewports.join('/')} × ${rapport.indstillinger.temaer.join('+')} + reflow + reduce) på ${rapport.varighedSek}s`,
    `  P1 ${s.P1.moenstre} mønstre (${s.P1.fund} sidefund) · P2 ${s.P2.moenstre} (${s.P2.fund}) · P3 ${s.P3.moenstre} (${s.P3.fund}) · uafgjort kontrast ${s.uafgjort.moenstre} (ikke talt)`];
  if (rapport.moenstre.length){
    ud.push('', 'PRIO REGEL                  FAMILIE         SIDER HVOR              SELECTOR / DETALJE');
    let n = 0;
    for (const m of rapport.moenstre){
      if (m.prio === 'U') continue;
      if (n++ >= maksLinjer) break;
      ud.push(`${m.prio.padEnd(4)} ${m.regel.padEnd(23)} ${m.familie.padEnd(15)} ${String(m.sider.length).padStart(4)}  ${m.hvor.join(',').slice(0, 17).padEnd(17)} ${m.sel.slice(0, 40)} — ${m.besked.slice(0, 70)}`);
    }
    const rest = rapport.moenstre.filter(m => m.prio !== 'U').length - maksLinjer;
    if (rest > 0) ud.push(`... og ${rest} mønstre til (se --rapport / --md)`);
    ud.push('', 'Pr. regel: ' + Object.entries(s.perRegel).sort((a, b) => PRIO_RK[a[1].prio] - PRIO_RK[b[1].prio] || b[1].moenstre - a[1].moenstre).map(([k, v]) => `${k}[${v.prio}]=${v.moenstre}`).join('  '));
  }
  return ud.join('\n');
}

function markdown(rapport){
  const s = rapport.sammenfatning;
  const L = [];
  L.push('# Tilgængelighedsaudit (WCAG 2.2 AA)', '');
  L.push(`Genereret ${rapport.genereret} · ${rapport.indstillinger.sider.length} sider · ${rapport.antalMaalinger} målinger · viewports ${rapport.indstillinger.viewports.join('/')} + 320/720 (reflow) + reduce · temaer ${rapport.indstillinger.temaer.join('+')}`, '');
  L.push('| Prioritet | Mønstre | Sidefund |', '|---|---:|---:|');
  L.push(`| P1 blokerer tastatur/skærmlæser | ${s.P1.moenstre} | ${s.P1.fund} |`, `| P2 tydeligt WCAG-brud | ${s.P2.moenstre} | ${s.P2.fund} |`, `| P3 forbedring | ${s.P3.moenstre} | ${s.P3.fund} |`, `| Kontrast kan ikke afgøres | ${s.uafgjort.moenstre} | ${s.uafgjort.fund} |`, '');
  const regler = Object.keys(s.perRegel).sort((a, b) => PRIO_RK[s.perRegel[a].prio] - PRIO_RK[s.perRegel[b].prio] || s.perRegel[b].moenstre - s.perRegel[a].moenstre);
  for (const r of regler){
    const meta = RULER[r] || { titel: r, wcag: '', forslag: '' };
    const ms = rapport.moenstre.filter(m => m.regel === r);
    L.push(`## ${s.perRegel[r].prio} · ${r} — ${meta.titel}`, '', `WCAG ${meta.wcag} · ${ms.length} mønstre på ${s.perRegel[r].sider} sider. **Forslag:** ${meta.forslag}`, '');
    const fam = new Map();
    for (const m of ms){ if (!fam.has(m.familie)) fam.set(m.familie, []); fam.get(m.familie).push(m); }
    for (const [f, liste] of fam){
      L.push(`### ${f} (${new Set(liste.flatMap(m => m.sider)).size} sider)`, '');
      for (const m of liste.slice(0, 12)){
        const eks = m.sider.slice(0, 3).join(', ') + (m.sider.length > 3 ? ` +${m.sider.length - 3}` : '');
        L.push(`- \`${m.sel || '(side)'}\` — ${m.besked} _[${m.hvor.join(',')}; ${eks}]_`);
      }
      if (liste.length > 12) L.push(`- … og ${liste.length - 12} mønstre til`);
      L.push('');
    }
  }
  return L.join('\n');
}

/* ---------- CLI ---------- */

function parseArgs(argv){
  const o = {};
  const liste = v => String(v).split(',').map(s => s.trim()).filter(Boolean);
  for (let i = 0; i < argv.length; i++){
    const a = argv[i];
    const naeste = () => argv[++i];
    if (a === '--hurtig') o.hurtig = true;
    else if (a === '--strikt') o.strikt = true;
    else if (a === '--stille') o.stille = true;
    else if (a === '--uden-overlay') o.udenOverlay = true;
    else if (a === '--uden-reflow') o.udenReflow = true;
    else if (a === '--uden-bevaegelse') o.udenBevaegelse = true;
    else if (a === '--sider') o.sider = liste(naeste());
    else if (a === '--viewports') o.viewports = liste(naeste());
    else if (a === '--temaer') o.temaer = liste(naeste());
    else if (a === '--rapport') o.rapport = naeste();
    else if (a === '--md') o.md = naeste();
    else if (a === '--rod') o.rod = naeste();
    else if (a === '--parallel') o.parallel = naeste();
    else if (a === '--tid') o.tid = naeste();
    else if (a === '--maks-linjer') o.maksLinjer = Number(naeste());
    else if (a === '--maks-p1') o.maksP1 = Number(naeste());
    else if (a === '--maks-p2') o.maksP2 = Number(naeste());
    else if (a === '--maks-p3') o.maksP3 = Number(naeste());
    else if (a === '--hjælp' || a === '--hjaelp' || a === '-h') o.hjaelp = true;
    else throw new Error(`Ukendt argument: ${a}`);
  }
  return o;
}

const HJAELP = `node scripts/a11y-tjek.js [--hurtig] [--sider a,b,maerke-*] [--viewports 390,1440] [--temaer lys,mørk]
  [--rapport fil.json] [--md fil.md] [--strikt] [--maks-p1 0] [--maks-p2 0] [--maks-p3 N]
  [--uden-overlay] [--uden-reflow] [--uden-bevaegelse] [--rod mappe] [--parallel 3] [--tid 25000] [--maks-linjer 60] [--stille]`;

function overTaerskel(rapport, o = {}){
  const s = rapport.sammenfatning;
  const graense = { P1: o.maksP1 != null ? o.maksP1 : 0, P2: o.maksP2 != null ? o.maksP2 : 0, P3: o.maksP3 != null ? o.maksP3 : Infinity };
  return ['P1', 'P2', 'P3'].filter(p => s[p].moenstre > graense[p]);
}

async function main(){
  let o;
  try { o = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message + '\n' + HJAELP); process.exit(2); }
  if (o.hjaelp){ console.log(HJAELP); return; }
  const kan = await smoke.playwrightTilgaengelig();
  if (!kan.ok){ console.error('a11y-tjek: kan ikke køre. ' + kan.grund); process.exit(2); }
  let rapport;
  try { rapport = await koer({ ...o, pw: kan.pw }); } catch (e) { console.error('a11y-tjek: ' + e.message); process.exit(2); }
  const skriv = (f, indhold) => { fs.mkdirSync(path.dirname(path.resolve(f)), { recursive: true }); fs.writeFileSync(f, indhold); };
  if (o.rapport) skriv(o.rapport, JSON.stringify(rapport, null, 2));
  if (o.md) skriv(o.md, markdown(rapport));
  console.log(tabel(rapport, { maksLinjer: o.maksLinjer || 60 }));
  if (o.rapport) console.log(`JSON-rapport: ${o.rapport}`);
  if (o.md) console.log(`Markdown-rapport: ${o.md}`);
  const over = overTaerskel(rapport, o);
  if (o.strikt && over.length){ console.error(`a11y-tjek --strikt: over tærskel for ${over.join(', ')}`); process.exit(1); }
}

if (require.main === module) main();

module.exports = { koer, tabel, markdown, parseArgs, overTaerskel, familie, RULER, _intern: { auditDom, auditKontrast, findUdloesere, overlayTest, tabTest, settle, a11yInit } };
