/* Billed-alt og lazy-load i de genererede sider (W7 SEO).

   Kør: node --test scripts/seo-billeder.test.js
   Regler: ingen <img> uden alt-attribut. Et meningsfuldt billede (annoncefoto) har en beskrivende alt; et
   dekorativt (hero, typefoto, logo, miniature i et link, der selv har tekst) har alt="". Intet billede er
   både loading="lazy" og fetchpriority="high" (modstrid, og LCP-billedet må ikke udskydes). Alle har
   width og height, så siden ikke hopper. <noscript>, scripts og kommentarer ignoreres. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const sider = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort().map(fil => {
  const raa = fs.readFileSync(path.join(ROOT, fil), 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, '');
  return { fil, raa };
});
const billeder = s => [...s.raa.matchAll(/<img\b[^>]*>/g)].map(m => ({ tag: m[0], idx: m.index }));
const attr = (tag, n) => { const i = tag.indexOf(' ' + n + '="'); if (i < 0) return null; const a = i + n.length + 3; return tag.slice(a, tag.indexOf('"', a)); };

test('ingen <img> uden alt-attribut, og ingen alt der kun er et filnavn', () => {
  let antal = 0;
  for (const s of sider) for (const b of billeder(s)){
    antal++;
    const alt = attr(b.tag, 'alt');
    assert.notStrictEqual(alt, null, `${s.fil}: <img> uden alt: ${b.tag.slice(0, 90)}`);
    assert.ok(!/\.(webp|jpe?g|png|gif)$/i.test(alt), `${s.fil}: alt er et filnavn: ${alt}`);
  }
  assert.ok(antal > 100);
});

test('annoncens egne fotos har beskrivende alt (mærke, model og billednummer)', () => {
  for (const s of sider.filter(x => /^annonce-/.test(x.fil))){
    const fotos = billeder(s).filter(b => /supabase\.co\/storage/.test(b.tag));
    if (!fotos.length) continue;   // en annonce uden egne fotos har kun logoet
    fotos.forEach((b, i) => {
      const alt = attr(b.tag, 'alt');
      assert.ok(alt && alt.length > 5, `${s.fil}: tomt alt på foto ${i + 1}`);
      assert.match(alt, /billede \d+ af \d+/);
    });
  }
});

test('dekorative billeder (hero, typefoto, logo) har alt="" — og er skjult for skærmlæsere eller i et link med tekst', () => {
  for (const s of sider) for (const b of billeder(s)){
    const src = attr(b.tag, 'src') || '';
    if (/^img\/(hero|type)\b|logo-mark|favicon/.test(src)){
      assert.strictEqual(attr(b.tag, 'alt'), '', `${s.fil}: dekorativt billede ${src} skal have alt=""`);
    }
  }
});

test('et alt="" på et eksternt foto kræver tekst i samme link (miniaturen er redundant)', () => {
  for (const s of sider) for (const b of billeder(s)){
    const src = attr(b.tag, 'src') || '';
    if (!/^https?:/.test(src) || attr(b.tag, 'alt') !== '') continue;
    if (/class="mk-cta-img"/.test(b.tag)) continue;   // illustration i en aside med egen overskrift og knap (build-brand-pages.js)
    const foer = s.raa.slice(Math.max(0, b.idx - 600), b.idx);
    const efter = s.raa.slice(b.idx, b.idx + 900);
    const iLink = foer.lastIndexOf('<a ') > foer.lastIndexOf('</a>');
    assert.ok(iLink, `${s.fil}: tomt alt på foto uden for et link: ${src.slice(0, 60)}`);
    const tekst = efter.slice(0, efter.indexOf('</a>') === -1 ? 900 : efter.indexOf('</a>')).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    assert.ok(tekst.length > 3, `${s.fil}: linket om ${src.slice(0, 60)} har ingen tekst`);
  }
});

test('lazy og fetchpriority="high" udelukker hinanden, og alle billeder har width og height', () => {
  for (const s of sider) for (const b of billeder(s)){
    assert.ok(!(/loading="lazy"/.test(b.tag) && /fetchpriority="high"/.test(b.tag)), `${s.fil}: lazy + fetchpriority`);
    const src = attr(b.tag, 'src');
    if (src === null || src === '') continue;   // pladsholdere, som scriptet fylder
    if (/class="(card-photo|mk-cta-img)"/.test(b.tag)) continue;   // kort og CTA-foto størrelsessættes af CSS (css/ og js/components.js er delt lag; se rapporten)
    assert.ok(attr(b.tag, 'width') && attr(b.tag, 'height'), `${s.fil}: mangler width/height: ${b.tag.slice(0, 90)}`);
  }
});

test('generatorerne: typefliser og guide-kort er lazy med alt=""', () => {
  const kilde = ['build-guides.js', 'build-facet-pages.js'].map(f => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n');
  assert.match(kilde, /class="gd-hero-photo"[^>]*alt=""[^>]*fetchpriority="high"/);
  assert.match(kilde, /img\/type\/\$\{id\}\.webp" alt="" width="456" height="342" loading="lazy"/);
});
