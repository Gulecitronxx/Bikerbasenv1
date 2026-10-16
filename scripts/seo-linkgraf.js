/* Intern linkstruktur for de statiske sider (W7 SEO): hvem linker til hvem?

   Kør:  node scripts/seo-linkgraf.js          (læsbar rapport)
         node scripts/seo-linkgraf.js --json   (maskinlæsbar)

   Rører ingen filer og hverken netværk eller Supabase: læser de committede .html-filer i roden.
   Tre mål (opgave 1):
     - forældreløse: indekserbare sider uden ét eneste kontekstuelt indgående link,
     - tynde: indekserbare sider med under 3 kontekstuelle indgående links,
     - dybde: antal klik fra forsiden (bredde-først), og sider dybere end 3 klik.

   "Kontekstuelt" betyder links i <main>. Header og footer står på alle sider og tæller derfor ikke som
   et signal om, at én side er relateret til en anden; de tælles for sig (global) og bruges kun til
   dybden, fordi en besøgende reelt kan klikke dem. Links i JSON-LD, kommentarer og scripts tælles ikke. */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MIN_INDGAAENDE = 3;
const MAX_DYBDE = 3;

const fjernSkjult = html => html
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '');

/* Normalisér en href til en rod-filnavn ('maerke-bmw.html'), eller null for eksterne/anker-/mailto-links. */
function malFil(href, filer){
  let h = String(href || '').trim();
  if (!h || /^(mailto:|tel:|javascript:|#)/i.test(h)) return null;
  if (/^https?:\/\//i.test(h)){
    const m = h.match(/^https?:\/\/(?:www\.)?bikerbasen\.dk(\/[^?#]*)?/i);
    if (!m) return null;
    h = (m[1] || '/');
  }
  h = h.replace(/[?#].*$/, '').replace(/^\.?\//, '');
  if (h === '' ) return 'index.html';
  if (!/\.html$/.test(h) && filer.has(h + '.html')) h += '.html';
  return filer.has(h) ? h : null;
}

function linksI(html, filer){
  const ud = [];
  for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/gi)){
    const f = malFil(m[1], filer);
    if (f) ud.push(f);
  }
  return ud;
}

function hentDel(html, tag){
  const m = html.match(new RegExp('<' + tag + '\\b[\\s\\S]*?</' + tag + '>', 'i'));
  return m ? m[0] : '';
}

function erNoindex(html){
  return /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html);
}

/* Sidetype ud fra filnavnet, så rapporten kan grupperes. */
function sideType(f){
  if (f === 'index.html') return 'forside';
  if (f === 'guides.html' || f.startsWith('guide-')) return 'guide';
  if (f === 'maerker.html' || f.startsWith('maerke-')) return 'maerke';
  const m = f.match(/^(model|type|region|budget|by|koerekort|mc|annonce)-/);
  return m ? m[1] : 'andet';
}

function byggGraf(root = ROOT){
  const filnavne = fs.readdirSync(root).filter(f => f.endsWith('.html')).sort();
  const filer = new Set(filnavne);
  const sider = new Map();
  for (const f of filnavne){
    const raa = fs.readFileSync(path.join(root, f), 'utf8');
    const html = fjernSkjult(raa);
    const main = hentDel(html, 'main');
    const global = hentDel(html, 'header') + hentDel(html, 'footer');
    sider.set(f, {
      fil: f, type: sideType(f), noindex: erNoindex(raa),
      kontekst: new Set(linksI(main, filer).filter(x => x !== f)),
      global: new Set(linksI(global, filer).filter(x => x !== f)),
    });
  }
  const indgaaende = new Map(filnavne.map(f => [f, new Set()]));
  for (const s of sider.values()) for (const t of s.kontekst) indgaaende.get(t).add(s.fil);

  /* Dybde: bredde-først fra forsiden over alle links (kontekst + global). */
  const dybde = new Map();
  if (sider.has('index.html')){
    dybde.set('index.html', 0);
    const kø = ['index.html'];
    while (kø.length){
      const f = kø.shift();
      for (const t of new Set([...sider.get(f).kontekst, ...sider.get(f).global])){
        if (!dybde.has(t)){ dybde.set(t, dybde.get(f) + 1); kø.push(t); }
      }
    }
  }
  /* Dybde alene via kontekst + header (uden footer) er strengere, men footeren er et reelt menupunkt;
     vi bruger begge. */
  const rækker = filnavne.map(f => ({
    fil: f, type: sider.get(f).type, noindex: sider.get(f).noindex,
    ind: indgaaende.get(f).size, indFra: [...indgaaende.get(f)].sort(),
    ud: sider.get(f).kontekst.size, dybde: dybde.has(f) ? dybde.get(f) : null,
  }));
  const idx = rækker.filter(r => !r.noindex);
  return {
    raekker: rækker,
    foraeldreloese: idx.filter(r => r.ind === 0 && r.fil !== 'index.html').map(r => r.fil),
    tynde: idx.filter(r => r.ind > 0 && r.ind < MIN_INDGAAENDE).map(r => [r.fil, r.ind]),
    dybe: idx.filter(r => r.dybde === null || r.dybde > MAX_DYBDE).map(r => [r.fil, r.dybde]),
  };
}

if (require.main === module){
  const g = byggGraf();
  if (process.argv.includes('--json')){ console.log(JSON.stringify(g, null, 1)); process.exit(0); }
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`${pad('fil', 52)} ${pad('type', 9)} ${pad('idx', 8)} ${pad('ind', 4)} ${pad('ud', 4)} dybde`);
  for (const r of g.raekker) console.log(`${pad(r.fil, 52)} ${pad(r.type, 9)} ${pad(r.noindex ? 'noindex' : 'index', 8)} ${pad(r.ind, 4)} ${pad(r.ud, 4)} ${r.dybde === null ? 'nås ikke' : r.dybde}`);
  console.log('\nForældreløse (indekserbare, 0 kontekstuelle indgående):', g.foraeldreloese.length ? g.foraeldreloese.join(', ') : 'ingen');
  console.log(`Tynde (< ${MIN_INDGAAENDE} indgående):`, g.tynde.length ? g.tynde.map(([f, n]) => `${f} (${n})`).join(', ') : 'ingen');
  console.log(`Dybere end ${MAX_DYBDE} klik:`, g.dybe.length ? g.dybe.map(([f, d]) => `${f} (${d})`).join(', ') : 'ingen');
}

module.exports = { byggGraf, malFil, linksI, sideType, MIN_INDGAAENDE, MAX_DYBDE };
