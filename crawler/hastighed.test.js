/* Tests for hastighedsgrænsen. Reglen er den, der holder aftalen med en
   forhandler: aldrig to samtidige kald mod samme domæne, og mindst
   crawl_delay_ms imellem dem. */

const test = require('node:test');
const assert = require('node:assert');
const { medHastighedsgraense, nulstil, sov } = require('./hastighed');

test('kald mod samme domæne kører aldrig parallelt', async () => {
  nulstil();
  let iLuften = 0, maks = 0;
  const kald = () => medHastighedsgraense('a.dk', 10, async () => {
    maks = Math.max(maks, ++iLuften);
    await sov(20);
    iLuften--;
  });
  await Promise.all([kald(), kald(), kald(), kald()]);
  assert.equal(maks, 1, `${maks} samtidige kald mod samme domæne`);
});

test('der går mindst delayMs mellem to kald', async () => {
  nulstil();
  const tider = [];
  const kald = () => medHastighedsgraense('b.dk', 60, async () => { tider.push(Date.now()); });
  await Promise.all([kald(), kald(), kald()]);
  for (let i = 1; i < tider.length; i++){
    // 5 ms slæk for timer-upræcision på Windows.
    assert.ok(tider[i] - tider[i - 1] >= 55, `kun ${tider[i] - tider[i - 1]} ms mellem kald ${i - 1} og ${i}`);
  }
});

test('to domæner venter ikke på hinanden', async () => {
  nulstil();
  const start = Date.now();
  await Promise.all([
    medHastighedsgraense('c.dk', 200, async () => {}),
    medHastighedsgraense('d.dk', 200, async () => {}),
  ]);
  assert.ok(Date.now() - start < 150, 'uafhængige domæner blev serialiseret');
});

test('et fejlet kald blokerer ikke køen — og springer ikke pausen over', async () => {
  nulstil();
  const tider = [];
  const fejlende = medHastighedsgraense('e.dk', 60, async () => {
    tider.push(Date.now());
    throw new Error('kilden var nede');
  });
  await assert.rejects(fejlende, /kilden var nede/);

  await medHastighedsgraense('e.dk', 60, async () => { tider.push(Date.now()); });
  assert.equal(tider.length, 2, 'næste kald i køen kørte ikke efter en fejl');
  assert.ok(tider[1] - tider[0] >= 55, 'pausen blev sprunget over efter en fejl');
});
