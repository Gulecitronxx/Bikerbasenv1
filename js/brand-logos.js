/* BrandLogos — ÉN delt kerne til mærkelogoer, brugt af både browseren og generatorerne.

   Browser:  <script src="js/brand-logos-data.js"></script> <script src="js/brand-logos.js"></script>  ->  global BrandLogos
   Node:     const BrandLogos = require('./js/brand-logos.js');

   Ingen afhængigheder, intet fetch. Data (js/brand-logos-data.js) er GENERERET af scripts/brand-logos-gen.js ud fra
   img/brands/manifest.json — ét sted at tilføje et mærke.

   Standard er tekst: et mærke uden godkendt logo vises som monogram-cirkel (hvor navnet står som tekst ved siden af)
   eller som ordmærke i versaler (hvor logoet står alene). Et rigtigt logo kommer først på sitet, når manifestet siger
   godkendt:true og filen findes — uden kodeændring.

   API
     normaliser(navn)            -> slug | null     ('Ukendt', 'andet mærke', tomt -> null)
     logoFor(navn)               -> { slug, navn, harLogo, src, bredde, hoejde, monogram, variant, fallback, ensfarvet }
     logoHTML(navn, valg)        -> markup (streng); valg: { storrelse:'sm|md|lg|hero', variant, decorative, fallback }
     monogramFor(navn)           -> 1-3 tegn
     opret(data)                 -> en ny instans med samme API (til tests med eget manifest)

   Markup (fast slot -> ingen CLS; css/p-brand-logo.css):
     <span class="bl bl--md bl--logo" data-bl="slug" style="--bl-ar:1.2" aria-hidden="true">
       <span class="bl-mark" style="mask-image:..."></span>        ensfarvet logo som CSS-mask i currentColor (lys/mørk uden filskift)
       <img class="bl-probe" ... hidden>                            fanger fejl; ved fejl får .bl klassen bl--fejl -> fallback vises
       <span class="bl-fb ...">…</span>                             ordmærke/monogram, skjult så længe logoet virker
     </span>
   Uden logo: <span class="bl bl--md bl--mono|bl--ord" data-bl="slug"><span class="bl-fb …">…</span></span>
   Alt fra mærkenavne escapes; navnet indgår aldrig i en attribut uden escape. */
(function (rod, fabrik){
  if (typeof module === 'object' && module.exports) module.exports = fabrik(require('./brand-logos-data.js'), rod);
  else rod.BrandLogos = fabrik(rod.BrandLogosData, rod);
})(typeof self !== 'undefined' ? self : this, function (standardData, rod){
  'use strict';

  const STORRELSER = ['sm', 'md', 'lg', 'hero'];
  /* [maks. højde, maks. bredde] i px — SKAL følge css/p-brand-logo.css (testet). Hero er desktop-målet; CSS formindsker på mobil. */
  const SLOT = { sm: [18, 28], md: [30, 60], lg: [40, 120], hero: [54, 235] };
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
      if (!slug) return { slug: null, navn: raa, aliaser: [], harLogo: false, src: null, bredde: null, hoejde: null, monogram: '', variant: null, fallback: 'ordmaerke', ensfarvet: true };
      const e = bySlug.get(slug);
      const visNavn = e ? e.n : raa;
      const l = e && e.l;
      return {
        slug, navn: visNavn, aliaser: e ? e.a.slice() : [],
        harLogo: !!(l && l.src && l.w > 0 && l.h > 0),
        src: l ? l.src : null, bredde: l ? l.w : null, hoejde: l ? l.h : null,
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

    function logoHTML(navn, valg){
      const o = valg || {};
      const l = logoFor(navn);
      if (!l.slug || !l.navn) return '';
      const str = STORRELSER.includes(o.storrelse) ? o.storrelse : 'md';
      const dekor = o.decorative !== false;
      let brugLogo = l.harLogo;
      if (brugLogo && o.variant && o.variant !== l.variant) brugLogo = false;
      /* I den mindste slot er et bredt ordmærke ulæseligt — så er monogrammet ærligere. */
      if (brugLogo && str === 'sm' && l.variant !== 'emblem' && l.bredde / l.hoejde > 1.6) brugLogo = false;
      let fbType = o.fallback === 'monogram' || o.fallback === 'ordmaerke' ? o.fallback : (dekor ? 'monogram' : l.fallback);
      if (str === 'sm') fbType = 'monogram';

      const navnE = esc(l.navn);
      const a11y = dekor ? ' aria-hidden="true"' : (brugLogo && l.ensfarvet ? ` role="img" aria-label="${navnE}-logo"` : (fbType === 'monogram' ? ` role="img" aria-label="${navnE}"` : ''));
      const slugE = esc(l.slug);

      if (!brugLogo){
        return `<span class="bl bl--${str} ${fbType === 'monogram' ? 'bl--mono' : 'bl--ord'}" data-bl="${slugE}"${a11y}>${fallbackHTML(l, fbType)}</span>`;
      }
      const ar = Math.round((l.bredde / l.hoejde) * 1000) / 1000;
      const [mh, mw] = SLOT[str];
      const w = Math.min(mw, mh * ar), h = w / ar;
      const src = esc(l.src);
      const fb = fallbackHTML(l, fbType);
      if (l.ensfarvet){
        return `<span class="bl bl--${str} bl--logo" data-bl="${slugE}" style="--bl-ar:${ar}"${a11y}>` +
          `<span class="bl-mark" style="-webkit-mask-image:url('${src}');mask-image:url('${src}')"></span>` +
          `<img class="bl-probe" src="${src}" alt="" width="${Math.round(w)}" height="${Math.round(h)}" hidden>${fb}</span>`;
      }
      const alt = dekor ? '' : `${navnE}-logo`;
      return `<span class="bl bl--${str} bl--logo bl--img" data-bl="${slugE}" style="--bl-ar:${ar}"${dekor ? ' aria-hidden="true"' : ''}>` +
        `<img class="bl-img" src="${src}" alt="${alt}" width="${Math.round(w)}" height="${Math.round(h)}" decoding="async">${fb}</span>`;
    }

    return { normaliser, logoFor, logoHTML, monogramFor, opret, STORRELSER, SLOT, esc, noegle, linjer, version: d.v };
  }

  const api = opret(standardData);

  /* Klienten: et logo, der ikke kan hentes, bliver aldrig et brudt billede — .bl får bl--fejl, og ordmærket/monogrammet
     (som allerede ligger i markup) tager over. Capture-lytteren fanger også billeder, der indsættes senere; en kort
     gennemgang ved DOMContentLoaded fanger dem, der allerede nåede at fejle, før scriptet kørte (SVG'er har altid width/
     height — kræves af gen-scriptet — så naturalWidth 0 efter complete betyder en fejlet hentning, ikke et mål-løst billede). */
  const doc = rod && rod.document;
  if (doc && doc.addEventListener){
    const markerFejl = t => {
      const bl = t.closest && t.closest('.bl');
      if (bl) bl.classList.add('bl--fejl');
    };
    const erLogoBillede = t => t && t.tagName === 'IMG' && t.classList && (t.classList.contains('bl-probe') || t.classList.contains('bl-img'));
    doc.addEventListener('error', ev => { if (erLogoBillede(ev && ev.target)) markerFejl(ev.target); }, true);
    const gennemgaa = () => {
      const liste = doc.querySelectorAll ? doc.querySelectorAll('.bl img.bl-probe, .bl img.bl-img') : [];
      for (let i = 0; i < liste.length; i++){ const im = liste[i]; if (im.complete && im.naturalWidth === 0) markerFejl(im); }
    };
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', gennemgaa); else gennemgaa();
    api.gennemgaa = gennemgaa;   // kan kaldes igen efter at markup er indsat dynamisk
  }

  return api;
});
