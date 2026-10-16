/* Tester sweep-scriptet på eksempel-fixturen. Kør: node --test scripts/sweep-datakvalitet.test.js
   Fixturen (scripts/fixtures/eksterne-raekker-eksempel.json) er de navngivne eksempler fra
   detective-funktion.md som rå rækker — ikke et udtræk fra produktion. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { sweep, laes } = require('./sweep-datakvalitet.js');

const FIXTURE = path.join(__dirname, 'fixtures', 'eksterne-raekker-eksempel.json');

test('sweep tæller fundene på fixturen', () => {
  const r = sweep(laes(FIXTURE), new Date('2026-10-16T12:00:00Z'));
  assert.equal(r.antal, 22);
  assert.equal(r.ny.sigerNy, 5);
  assert.equal(r.ny.bekraeftet, 2, 'CB 650 R 2026 (MC Syd /Ny/) og CMX 500 Rebel 2023');
  assert.equal(r.ny.modsagt.length, 2, 'VZR1800 2007 og K 100 RT 1985');
  assert.equal(r.ny.ubevist.length, 1, 'MT-07 uden km og årgang');
  assert.equal(r.tal.ccmNulstillet.length, 3, 'GPZ 500S, XJ 900, T 120');
  assert.equal(r.efterspoergsel.length, 1);
  assert.equal(r.deeplink.maerkeFraStien.length, 1);
  assert.ok(r.deeplink.modelFraStien.length >= 1);
  assert.equal(r.jargon, 1);
  assert.ok(r.stavning.modellerRettet >= 1);
  assert.equal(r.friskhed.gammel, true);
  assert.equal(r.friskhed.seneste, '24. aug.');
});

test('scriptet kører fra kommandolinjen uden netværk, og uden argument beder det om en sti', () => {
  const ud = execFileSync(process.execPath, [path.join(__dirname, 'sweep-datakvalitet.js'), FIXTURE], { encoding: 'utf8' });
  assert.match(ud, /F-002/);
  const u = spawnSync(process.execPath, [path.join(__dirname, 'sweep-datakvalitet.js')], { encoding: 'utf8' });
  assert.equal(u.status, 2);
  assert.match(u.stderr, /Brug:/);
});
