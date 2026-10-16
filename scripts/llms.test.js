/* Tests for llms.txt-trinnet (scripts/build-llms.js): bygges, er deterministisk, indeholder ingen
   tal-påstande om lageret, og alle links peger på filer, der findes. Samt: trinnet er registreret i
   build.js og filen står i udgiv.js' allowlist. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { byg } = require('./build-llms.js');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://bikerbasen.dk';

test('llms.txt er deterministisk', () => {
  assert.equal(byg(SITE), byg(SITE));
  const a = spawnSync(process.execPath, [path.join(__dirname, 'build-llms.js')], { encoding: 'utf8' });
  assert.equal(a.status, 0, a.stderr);
  const f1 = fs.readFileSync(path.join(ROOT, 'llms.txt'));
  spawnSync(process.execPath, [path.join(__dirname, 'build-llms.js')]);
  assert.ok(f1.equals(fs.readFileSync(path.join(ROOT, 'llms.txt'))), 'to kørsler giver samme bytes');
  assert.equal(f1.toString('utf8'), byg(SITE));
});

test('llms.txt påstår ingen tal om antal annoncer, mærker eller priser', () => {
  const t = byg(SITE);
  assert.doesNotMatch(t, /\d[\d.,]*\s*(annoncer|motorcykler|mærker|forhandlere|kilder|biler|sider)/i);
  assert.doesNotMatch(t, /\b(over|mere end|flere end|ca\.?|cirka)\s+\d/i);
  assert.doesNotMatch(t, /\d[\d.]*\s*(kr\b|,-)/i, 'ingen priser');
  assert.doesNotMatch(t, /\b(verificeret|anmeldelse|stjerne)/i);
});

test('llms.txt har titel, resumé, sitemap og guides/søgning/om/kontakt', () => {
  const t = byg(SITE);
  assert.match(t, /^# Bikerbasen\n\n> /);
  for (const m of ['sitemap.xml', 'soegning.html', 'guides.html', 'om-bikerbasen.html', 'om-indeksering.html'])
    assert.ok(t.includes(`${SITE}/${m}`), m);
  assert.match(t, /kontakt@bikerbasen\.dk/);
  assert.match(t, /[Kk]ilden står på hvert annoncekort/);
});

test('alle interne links i llms.txt peger på filer, der findes (sitemap.xml genereres af build)', () => {
  const links = [...byg(SITE).matchAll(/\]\((https:\/\/bikerbasen\.dk\/([^)]+))\)/g)].map(m => m[2]);
  assert.ok(links.length >= 8);
  for (const fil of links) assert.ok(fs.existsSync(path.join(ROOT, fil)), `${fil} findes`);
});

test('trinnet er registreret i build.js og filen er i udgiv.js allowlist', () => {
  const build = fs.readFileSync(path.join(__dirname, 'build.js'), 'utf8');
  assert.match(build, /'build-llms\.js'/);
  assert.ok(fs.existsSync(path.join(__dirname, 'build-llms.js')));
  const udgiv = fs.readFileSync(path.join(__dirname, 'udgiv.js'), 'utf8');
  assert.ok(udgiv.includes(String.raw`/^llms\.txt$/,`));
});
