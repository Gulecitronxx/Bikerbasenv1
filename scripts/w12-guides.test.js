/* Tests for w12-guides: tre nye guides (salg, vinteropbevaring, forårs-tjekliste). Kør: node --test scripts/w12-guides.test.js

   Låser det, der kan gå galt uden at nogen ser det: ingen beløb/procenter/selskaber/mærker, ægte kilder, dato,
   unikke kortbilleder, linkmål der findes, ingen kannibalisering af titler, og at oversigt, sitemap og llms.txt
   kender dem. Ingen netværk. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { renderGuide } = require('./build-guides');
const { GUIDES, SRC } = require('./guides-data');
const { AFSNIT } = require('./build-llms');

const ctx = { header: '<header class="site-header"></header>', footer: '<footer class="site-footer"></footer>', csp: '', populaer: '', maerker: [] };
const NYE = ['guide-saelg-motorcykel', 'guide-mc-vinteropbevaring', 'guide-mc-foraar-tjekliste'];
const get = slug => GUIDES.find(g => g.slug === slug);
const tekstAf = g => JSON.stringify(g.sections.map(s => s.html)) + ' ' + g.tldr.join(' ') + ' ' + g.ingress + ' ' + g.description;

test('de tre nye guides findes, er udgivet 2026-10-17 (dateModified ikke før det; løftet 18.10 af V3) og har mindst tre kilder, der findes', () => {
  for (const slug of NYE){
    const g = get(slug);
    assert.ok(g, slug);
    assert.strictEqual(g.file, slug + '.html');
    assert.strictEqual(g.published, '2026-10-17');
    assert.ok(g.modified >= '2026-10-17', slug + ': modified ikke før udgivelsen');   // V3 løftede dateModified til 2026-10-18 (fælles visning udvidet)
    assert.ok(g.sources.length >= 3, slug + ': kilder');
    for (const k of g.sources) assert.ok(SRC[k] && /^https:\/\//.test(SRC[k].url), slug + ': kilde ' + k);
    assert.ok(g.title.length <= 60, slug + ': title ' + g.title.length);
    assert.ok(g.description.length >= 120 && g.description.length <= 160, slug + ': description ' + g.description.length);
    assert.ok(g.tldr.length >= 3);
  }
});

test('intet opdigtet: ingen beløb, procenter, priser, selskaber eller mærkeanbefalinger', () => {
  for (const slug of NYE){
    const t = tekstAf(get(slug));
    assert.ok(!/\d[\d.]*\s?(kr\.|kr(?![\wæøå])|DKK|procent|%|euro|€)/i.test(t), slug + ': ingen beløb eller procenter');
    assert.ok(!/(Tryg|Alka|Topdanmark|Codan|Gjensidige|If Skadeforsikring|Lærerstandens|Købstædernes)/.test(t), slug + ': ingen selskaber');
    assert.ok(!/\b(Yamaha|Honda|Kawasaki|Suzuki|BMW|KTM|Ducati|Triumph|Harley|Michelin|Pirelli|Bridgestone|Dunlop|Castrol|Motul)\b/.test(t), slug + ': ingen mærker');
    assert.ok(!/garanti(er|eret)? for (at|din)|100 ?%|helt sikker/i.test(t), slug + ': ingen overdrevne løfter');
  }
});

test('salgsguiden: dokumenter, Bilbogen, svindel, Motorregistret; henviser til sikkerhed, opret-annonce og myndigheder; lover intet', () => {
  const g = get('guide-saelg-motorcykel');
  const html = renderGuide(g, ctx);
  assert.match(html, /registreringsattest/i);
  assert.match(html, /Bilbog/);
  assert.match(html, /Motorregistret/);
  assert.match(html, /href="sikkerhed\.html"/);
  assert.match(html, /href="opret-annonce\.html"/);
  assert.match(html, /Forbrugerombudsmanden/);
  assert.match(html, /Skatteforvaltningen/);
  assert.match(html, /indeks/);
  assert.match(html, /inden for 4 hverdage/);
  assert.match(html, /intet "sikker betaling"/);
  for (const k of ['forbrugerombudsmanden', 'skat', 'motorstyrelsen', 'ejerskifte', 'bilbogen']) assert.ok(g.sources.includes(k), k);
  assert.ok(!/skal (altid )?betale (skat|afgift)|er skattefri|skattefrit/i.test(tekstAf(g)), 'ingen skatteløfter: der henvises til Skatteforvaltningen');
});

test('vinter- og forårsguiden: generelle råd med henvisning til betjeningsvejledningen, og ingen tal for tryk, intervaller eller alder', () => {
  for (const slug of ['guide-mc-vinteropbevaring', 'guide-mc-foraar-tjekliste']){
    const g = get(slug);
    const html = renderGuide(g, ctx);
    assert.match(html, /betjeningsvejledning/i, slug);
    assert.match(html, /Bikerbasen er et indeks over annoncer og ikke et værksted/);
    const t = tekstAf(g);
    assert.ok(!/\b\d+([.,]\d+)?\s?(bar|psi|kpa|mm|km|måneder|uger|år|grader|°|volt|ah)\b/i.test(t.replace(/fire cifre|sidste fire/g, '')), slug + ': ingen opfundne tekniske tal');
  }
});

test('kortbilleder er unikke på tværs af alle guides, og billederne findes', () => {
  const b = GUIDES.map(g => g.cardImage);
  assert.strictEqual(new Set(b).size, b.length, b.join(', '));
  for (const slug of NYE) assert.ok(fs.existsSync(path.join(ROOT, get(slug).cardImage)), slug);
});

test('Læs også: højst tre, kun eksisterende, og alle tre har indlink fra en anden guide og fra oversigten', () => {
  for (const slug of NYE){
    const g = get(slug);
    assert.ok(g.related.length >= 1 && g.related.length <= 3);
    for (const r of g.related) assert.ok(get(r) && r !== slug, slug + ' -> ' + r);
    assert.ok(GUIDES.some(x => x.slug !== slug && (x.related || []).includes(slug)), slug + ': mangler Læs også-indlink');
    const fil = path.join(ROOT, 'guides.html');
    assert.ok(fs.readFileSync(fil, 'utf8').includes('href="' + slug + '.html"'), slug + ': mangler i den committede oversigt');
  }
});

test('interne links i de nye guides peger på filer, der findes', () => {
  for (const slug of NYE){
    const html = renderGuide(get(slug), ctx);
    const hrefs = [...html.matchAll(/<a [^>]*href="([^"#?]+\.html)(?:[?#][^"]*)?"/g)].map(m => m[1]);
    for (const h of hrefs) assert.ok(fs.existsSync(path.join(ROOT, h)) || GUIDES.some(g => g.file === h), `${slug}: ${h}`);
  }
});

test('kannibalisering: titlerne deler ikke stamme med brugt-/første-guiden eller hinanden', () => {
  const stamme = t => t.toLowerCase().split(/\s+/).slice(0, 3).join(' ');
  const alle = GUIDES.map(g => stamme(g.title));
  assert.strictEqual(new Set(alle).size, alle.length, 'ens titelstammer: ' + alle.join(' | '));
  assert.ok(!/køb|første motorcykel|brugt/i.test(get('guide-saelg-motorcykel').title));
  assert.ok(!/forår|efter vinteren/i.test(get('guide-mc-vinteropbevaring').title), 'vinter og forår holdes i hver sin guide');
  assert.ok(!/vinteropbevaring/i.test(get('guide-mc-foraar-tjekliste').title));
  const t = GUIDES.map(g => g.title.toLowerCase());
  assert.strictEqual(new Set(t).size, t.length);
});

test('de committede sider findes, og ingen har attributlignende strenge i kommentarer eller inline-scripts (udgiv.js-faldgruben)', () => {
  for (const slug of NYE){
    const f = path.join(ROOT, slug + '.html');
    assert.ok(fs.existsSync(f), slug + '.html er ikke genereret');
    const html = fs.readFileSync(f, 'utf8');
    const kommentarer = [...html.matchAll(/<!--([\s\S]*?)-->/g)].map(m => m[1]);
    for (const k of kommentarer) assert.ok(!/\b(href|src|srcset)="/.test(k), slug + ': attribut i kommentar');
    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    for (const s of inline) assert.ok(!/\b(?:href|srcset)="|[^.\w]src="/.test(s), slug + ': attribut i inline-script');
    assert.strictEqual((html.match(/<h1[ >]/g) || []).length, 1);
    assert.match(html, new RegExp('<link rel="canonical" href="https://[^"]+/' + slug + '">'));
  }
});

test('sitemap og llms.txt kender alle guides, og llms-listen har kun filer, der findes', () => {
  const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const guideAfsnit = AFSNIT.find(([h]) => h === 'Guides')[1].map(p => p[0]);
  for (const g of GUIDES){
    assert.ok(xml.includes('/' + g.file.replace(/\.html$/, '') + '</loc><lastmod>' + (g.modified || require('./guides-data').MODIFIED)), g.file + ' i sitemap');
    assert.ok(guideAfsnit.includes(g.file), g.file + ' i llms-listen');
  }
  for (const f of guideAfsnit) assert.ok(fs.existsSync(path.join(ROOT, f)), f);
});
