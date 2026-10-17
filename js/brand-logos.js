/* BrandLogos — ÉN delt kerne til mærkelogoer, brugt af både browseren og generatorerne.

   Browser:  <script src="js/brand-logos-data.js"></script> <script src="js/brand-logos.js"></script>  ->  global BrandLogos
   Node:     const BrandLogos = require('./js/brand-logos.js');

   Ingen afhængigheder. Data (js/brand-logos-data.js) er GENERERET af scripts/brand-logos-gen.js ud fra
   img/brands/manifest.json — ét sted at tilføje et mærke.

   Standard er tekst: et mærke uden godkendt logo vises som monogram-cirkel (hvor navnet står som tekst ved siden af)
   eller som ordmærke i versaler (hvor logoet står alene). Et rigtigt logo kommer først på sitet, når manifestet siger
   godkendt:true og filen findes — uden kodeændring.

   API
     normaliser(navn)            -> slug | null     ('Ukendt', 'andet mærke', tomt -> null)
     logoFor(navn)               -> { slug, navn, harLogo, src, bredde, hoejde, emblem:{src,bredde,hoejde}|null, monogram, variant, fallback, ensfarvet }
     logoHTML(navn, valg)        -> markup (streng); valg: { storrelse:'sm|md|lg|xl|hero', variant, form:'emblem|fuld', decorative, fallback, statisk }
     monogramFor(navn)           -> 1-3 tegn
     opret(data)                 -> en ny instans med samme API (til tests med eget manifest)

   Slot pr. størrelse: [maks. højde, maks. bredde, k]. Bredden er min(maks. bredde, maks. højde · forhold, k · √forhold), så alle
   logoer — smalle, kvadratiske og brede — får næsten samme AREAL (k² = maks. areal): ens visuel vægt. 'sm' er en bred, lav slot
   til lister (A–Z, filter); dér vælges mærkets emblem-variant (hvis filen findes og forholdet ≤ 3), ellers hovedfilen skaleret ned.

   Markup (fast slot -> ingen CLS; css/p-brand-logo.css):
     <span class="bl bl--md bl--logo" data-bl="slug" style="--bl-ar:1.2;--bl-sa:1.095" aria-hidden="true">
       <span class="bl-mark" data-bl-src="img/brands/x.svg"></span>   ensfarvet logo som CSS-mask i currentColor (lys/mørk uden filskift).
                                                                  Klienten henter filen ÉN gang pr. unik fil (fetch) og sætter masken, når den er hentet;
                                                                  en fil, der ikke kan hentes, giver bl--fejl -> fallback. Ingen anden hentning af samme URL.
       <img class="bl-ref" src=".." hidden loading="lazy">            KUN med valg.statisk (generatorer): statisk filreference, så scripts/udgiv.js
                                                                  fanger en manglende fil. Skjult + lazy: henter intet.
       <span class="bl-fb ...">…</span>                              ordmærke/monogram, skjult så længe logoet virker
     </span>
   Uden logo: <span class="bl bl--md bl--mono|bl--ord" data-bl="slug"><span class="bl-fb …">…</span></span>
   Alt fra mærkenavne escapes; navnet indgår aldrig i en attribut uden escape. */
(function (rod, fabrik){
  if (typeof module === 'object' && module.exports) module.exports = fabrik(require('./brand-logos-data.js'), rod);
  else rod.BrandLogos = fabrik(rod.BrandLogosData, rod);
})(typeof self !== 'undefined' ? self : this, function (standardData, rod){
  'use strict';

  const STORRELSER = ['sm', 'md', 'lg', 'xl', 'hero'];
  /* [maks. højde, maks. bredde, k] i px — SKAL følge css/p-brand-logo.css (testet). k² er det maksimale areal. xl (annoncens titelrække) og hero
     er desktop-målene; CSS formindsker dem på tablet/mobil. */
  const SLOT = { sm: [22, 56, 26.5], md: [30, 60, 34.6], lg: [40, 120, 45.8], xl: [64, 160, 84.9], hero: [72, 280, 97.5] };
  /* Et logo, der ved slottens mål ville blive lavere end dette, er ulæseligt — så er teksten ærligere. */
  const MIN_HOEJDE = 12;
  /* Emblem-varianten (uden ordmærke) vælges i 'sm', hvis den ikke er bredere end dette forhold; ellers hovedfilen. */
  const EMBLEM_MAKS_FORHOLD = 3;
  const UKENDT = new Set(['ukendt', 'andet-maerke', 'andet', 'unknown', 'ukendt-maerke', 'andre-maerker', 'ikke-oplyst', 'ingen']);

  function esc(s){
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* Samme foldning som scripts/slug.js (æ->ae, ø->oe, å->aa, derefter accenter væk). */
  function fold(s){
    return String(s).normalize('NFC').toLowerCase()
      .replace(/ø/g, 'oe').replace(/æ/g, 'ae').replace(/å/g, 'aa')
      .replace(/ß/g, 'ss').replace(/ł/g, 'l').replace(/þ/g, 'th').replace(/œ/g, 'oe').replace(/ı/g, 'i')
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function noegle(s){ return fold(s).replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

  function monogramRegel(navn){
    const ord = String(navn).split(/[\s-]+/).map(w => w.replace(/[^\p{L}\p{N}]/gu, '')).filter(Boolean);
    if (!ord.length) return '';
    return (ord.length > 1 ? ord[0].charAt(0) + ord[1].charAt(0) : ord[0].slice(0, 1)).toLocaleUpperCase('da');
  }

  /* Ordmærke i versaler; lange navne med mellemrum deles i to linjer så de passer i slottet. */
  function linjer(navn){
    const top = String(navn).trim().toLocaleUpperCase('da');
    const ord = top.split(/\s+/).filter(Boolean);
    if (ord.length < 2 || top.length <= 9) return [ord.join(' ')];
    let bedst = 1, bedstForskel = Infinity, sum = 0;
    const total = ord.join(' ').length;
    for (let i = 1; i < ord.length; i++){
      sum += ord[i - 1].length + 1;
      const f = Math.abs(total / 2 - sum);
      if (f < bedstForskel){ bedstForskel = f; bedst = i; }
    }
    return [ord.slice(0, bedst).join(' '), ord.slice(bedst).join(' ')];
  }

  /* Slottens pixelmål for et logo med forholdet ar: ens max-højde, ens max-bredde, ens max-areal. */
  function slotMaal(str, ar){
    const [mh, mw, k] = SLOT[str];
    const w = Math.min(mw, mh * ar, k * Math.sqrt(ar));
    return { w, h: w / ar };
  }

  function opret(data){
    const d = data && Array.isArray(data.m) ? data : { v: 1, m: [] };
    const bySlug = new Map();
    const alias = new Map();
    const kompakt = new Map();     // nøgle uden bindestreger -> slug (kun hvis entydig)
    const kompaktDobbelt = new Set();

    const tilfoej = (n, slug) => { if (n && !alias.has(n)) alias.set(n, slug); };
    for (const e of d.m){
      bySlug.set(e.s, e);
      tilfoej(e.s, e.s);
      tilfoej(noegle(e.n), e.s);
      for (const a of e.a || []) tilfoej(noegle(a), e.s);
    }
    for (const [n, slug] of alias){
      const k = n.replace(/-/g, '');
      if (kompakt.has(k) && kompakt.get(k) !== slug) kompaktDobbelt.add(k);
      else kompakt.set(k, slug);
    }
    for (const k of kompaktDobbelt) kompakt.delete(k);

    function normaliser(navn){
      if (typeof navn !== 'string' && typeof navn !== 'number') return null;
      const k = noegle(navn);
      if (!k || UKENDT.has(k)) return null;
      if (alias.has(k)) return alias.get(k);
      const c = k.replace(/-/g, '');
      if (kompakt.has(c)) return kompakt.get(c);
      return k.slice(0, 60).replace(/-+$/, '');
    }

    function logoFor(navn){
      const slug = normaliser(navn);
      const raa = (typeof navn === 'string' || typeof navn === 'number') ? String(navn).trim().replace(/\s+/g, ' ') : '';
      if (!slug) return { slug: null, navn: raa, aliaser: [], harLogo: false, src: null, bredde: null, hoejde: null, emblem: null, monogram: '', variant: null, fallback: 'ordmaerke', ensfarvet: true };
      const e = bySlug.get(slug);
      const visNavn = e ? e.n : raa;
      const l = e && e.l;
      const harLogo = !!(l && l.src && l.w > 0 && l.h > 0);
      const em = harLogo && l.e && l.e.src && l.e.w > 0 && l.e.h > 0 ? { src: l.e.src, bredde: l.e.w, hoejde: l.e.h } : null;
      return {
        slug, navn: visNavn, aliaser: e ? e.a.slice() : [],
        harLogo,
        src: l ? l.src : null, bredde: l ? l.w : null, hoejde: l ? l.h : null,
        emblem: em,
        monogram: e ? e.m : monogramRegel(visNavn),
        variant: e ? e.v : 'ordmaerke',
        fallback: e ? e.f : 'ordmaerke',
        ensfarvet: l ? l.c === 1 : true,
      };
    }

    function monogramFor(navn){ const l = logoFor(navn); return l.slug ? l.monogram : monogramRegel(l.navn); }

    function fallbackHTML(l, type){
      if (type === 'monogram'){
        return `<span class="bl-fb bl-mono" style="--bl-mn:${l.monogram.length}">${esc(l.monogram)}</span>`;
      }
      const ls = linjer(l.navn);
      const n = Math.max(...ls.map(x => x.length));
      return `<span class="bl-fb bl-wordmark" style="--bl-n:${n};--bl-nl:${ls.length}">${ls.map(x => `<span class="bl-l">${esc(x)}</span>`).join(' ')}</span>`;
    }

    /* Hvilken fil tegnes? Emblemet i 'sm' (eller med form:'emblem'), når det findes; ellers hovedfilen. form:'fuld' tvinger hovedfilen. */
    function vaelgFil(l, str, form){
      const hoved = { src: l.src, bredde: l.bredde, hoejde: l.hoejde, emblem: false };
      const em = l.emblem;
      if (!em || form === 'fuld') return hoved;
      const vil = form === 'emblem' || str === 'sm';
      if (vil && (form === 'emblem' || em.bredde / em.hoejde <= EMBLEM_MAKS_FORHOLD)) return { src: em.src, bredde: em.bredde, hoejde: em.hoejde, emblem: true };
      return hoved;
    }

    function logoHTML(navn, valg){
      const o = valg || {};
      const l = logoFor(navn);
      if (!l.slug || !l.navn) return '';
      const str = STORRELSER.includes(o.storrelse) ? o.storrelse : 'md';
      const dekor = o.decorative !== false;
      let brugLogo = l.harLogo;
      if (brugLogo && o.variant && o.variant !== l.variant) brugLogo = false;
      const fil = brugLogo ? vaelgFil(l, str, o.form) : null;
      const ar = fil ? Math.round((fil.bredde / fil.hoejde) * 1000) / 1000 : 1;
      const m = fil ? slotMaal(str, ar) : null;
      /* Et logo, der ved slottens mål bliver ulæseligt lavt, er ærligere som tekst. */
      if (fil && m.h < MIN_HOEJDE) brugLogo = false;
      let fbType = o.fallback === 'monogram' || o.fallback === 'ordmaerke' ? o.fallback : (dekor ? 'monogram' : l.fallback);
      if (str === 'sm') fbType = 'monogram';

      const navnE = esc(l.navn);
      const a11y = dekor ? ' aria-hidden="true"' : (brugLogo && l.ensfarvet ? ` role="img" aria-label="${navnE}-logo"` : (fbType === 'monogram' ? ` role="img" aria-label="${navnE}"` : ''));
      const slugE = esc(l.slug);

      if (!brugLogo){
        return `<span class="bl bl--${str} ${fbType === 'monogram' ? 'bl--mono' : 'bl--ord'}" data-bl="${slugE}"${a11y}>${fallbackHTML(l, fbType)}</span>`;
      }
      const sa = Math.round(Math.sqrt(ar) * 1000) / 1000;
      const src = esc(fil.src);
      const fb = fallbackHTML(l, fbType);
      const emCls = fil.emblem ? ' bl--emblem' : '';
      if (l.ensfarvet){
        const ref = o.statisk ? `<img class="bl-ref" src="${src}" alt="" width="${Math.round(m.w)}" height="${Math.round(m.h)}" loading="lazy" hidden>` : '';
        return `<span class="bl bl--${str} bl--logo${emCls}" data-bl="${slugE}" style="--bl-ar:${ar};--bl-sa:${sa}"${a11y}>` +
          `<span class="bl-mark" data-bl-src="${src}"></span>${ref}${fb}</span>`;
      }
      const alt = dekor ? '' : `${navnE}-logo`;
      return `<span class="bl bl--${str} bl--logo bl--img${emCls}" data-bl="${slugE}" style="--bl-ar:${ar};--bl-sa:${sa}"${dekor ? ' aria-hidden="true"' : ''}>` +
        `<img class="bl-img" src="${src}" alt="${alt}" width="${Math.round(m.w)}" height="${Math.round(m.h)}" decoding="async">${fb}</span>`;
    }

    return { normaliser, logoFor, logoHTML, monogramFor, opret, STORRELSER, SLOT, MIN_HOEJDE, EMBLEM_MAKS_FORHOLD, slotMaal, esc, noegle, linjer, version: d.v };
  }

  const api = opret(standardData);

  /* ---- Klienten ---------------------------------------------------------------------------------------------------------
     Kun i en browser (rod.document). Intet af dette kører i Node/generatorerne, og `opret()` ovenfor har intet DOM/netværk.

     ÉN hentning pr. unik logofil pr. sideindlæsning: det ensfarvede logo er en CSS-mask, og en maske kan ikke selv melde "404".
     Før lå der derfor et skjult billede med samme URL som maske-elementet (to kald pr. logo). Nu henter klienten hver fil én gang
     (HTTP-cachen gælder som normalt), lægger SVG'en som blob-URL og bruger den som maske på ALLE elementer med samme fil. Svarer filen
     ikke 200 med en SVG, får alle elementer med filen bl--fejl, og ordmærket/monogrammet (som altid ligger i markup) tager over —
     aldrig tom plads og aldrig en massiv blok (masken er skjult, til den er klar).
     Elementer, der er med i layoutet (også under folden), hentes straks — som en CSS-mask altid gjorde. Elementer, der ikke er det
     (et foldet filterpanel, display:none), hentes først, når de kommer til syne (IntersectionObserver): et skjult logo koster intet.
     Dynamisk indsat markup opdages af en MutationObserver. */
  const doc = rod && rod.document;
  if (doc && doc.addEventListener){
    const markerFejl = t => {
      const bl = t.closest && t.closest('.bl');
      if (bl) bl.classList.add('bl--fejl');
    };
    /* Flerfarvede logoer er et rigtigt billede (bl-img): browseren melder selv fejl. */
    const erLogoBillede = t => t && t.tagName === 'IMG' && t.classList && t.classList.contains('bl-img');
    doc.addEventListener('error', ev => { if (erLogoBillede(ev && ev.target)) markerFejl(ev.target); }, true);

    const FIL_OK = /^img\/brands\/[a-z0-9][a-z0-9-]*\.svg$/;
    const hentet = new Map();   // fil -> Promise<blob-URL | null>
    function hent(src){
      if (hentet.has(src)) return hentet.get(src);
      const p = (typeof rod.fetch === 'function' && rod.Blob && rod.URL && rod.URL.createObjectURL)
        ? rod.fetch(src, { credentials: 'same-origin' })
          .then(r => r.ok ? r.text() : Promise.reject(new Error('status ' + r.status)))
          .then(t => /<svg[\s>]/i.test(t) ? rod.URL.createObjectURL(new rod.Blob([t], { type: 'image/svg+xml' })) : Promise.reject(new Error('ikke svg')))
          .catch(() => null)
        : Promise.resolve(null);
      hentet.set(src, p);
      return p;
    }
    function indlaes(bl){
      const mark = bl.querySelector(':scope > .bl-mark');
      const src = mark && mark.getAttribute('data-bl-src');
      if (!mark || !src || !FIL_OK.test(src)){ if (mark) bl.classList.add('bl--fejl'); return; }
      hent(src).then(url => {
        if (!url){ bl.classList.add('bl--fejl'); return; }
        mark.style.setProperty('--bl-u', `url("${url}")`);
        bl.classList.add('bl--klar');
      });
    }
    const io = typeof rod.IntersectionObserver === 'function'
      ? new rod.IntersectionObserver(poster => {
        for (const p of poster) if (p.isIntersecting){ io.unobserve(p.target); indlaes(p.target); }
      }, { rootMargin: '200px' })
      : null;
    const gennemgaa = () => {
      const liste = doc.querySelectorAll ? doc.querySelectorAll('.bl--logo:not([data-bl-set])') : [];
      for (let i = 0; i < liste.length; i++){
        const bl = liste[i];
        bl.setAttribute('data-bl-set', '1');
        if (bl.classList.contains('bl--img')){
          const im = bl.querySelector(':scope > img.bl-img');
          if (im && im.complete && im.naturalWidth === 0) markerFejl(im);
        } else if (io && !bl.getClientRects().length) io.observe(bl);   // ikke i layoutet (skjult) -> vent til det vises
        else indlaes(bl);
      }
    };
    let planlagt = false;
    const planlaeg = () => { if (planlagt) return; planlagt = true; Promise.resolve().then(() => { planlagt = false; gennemgaa(); }); };
    if (typeof rod.MutationObserver === 'function'){
      new rod.MutationObserver(poster => {
        for (const p of poster) for (const n of p.addedNodes) if (n.nodeType === 1){ planlaeg(); return; }
      }).observe(doc.documentElement, { childList: true, subtree: true });
    }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', gennemgaa); else gennemgaa();
    api.gennemgaa = gennemgaa;   // kan kaldes igen efter at markup er indsat dynamisk
  }

  return api;
});
