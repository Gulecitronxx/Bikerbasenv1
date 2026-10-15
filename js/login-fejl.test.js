/* Tests for fejltekst-mappingen på login-siden (js/login-fejl.js). Kør: npm test

   F-013: ved afbrudt forbindelse viste login og "glemt kode" browserens rå
   engelske tekst "Failed to fetch". Testene låser, at alle de former, en
   netværksfejl kommer i fra Chrome, Safari, Firefox og Supabase-klienten, giver
   den samme venlige danske tekst — og at kendte Supabase-fejl stadig
   oversættes, og at ukendt engelsk aldrig vises rå. */
const test = require('node:test');
const assert = require('node:assert');
const { daError, erNetvaerksfejl, NETVAERK_TEKST } = require('./login-fejl.js');

test('netværksfejl fra browserne giver den venlige tekst', () => {
  for (const msg of [
    'Failed to fetch',                                   // Chrome
    'Load failed',                                       // Safari
    'NetworkError when attempting to fetch resource.',   // Firefox
    'Network request failed',
    'TypeError: fetch failed',
  ]) {
    assert.strictEqual(daError(msg), NETVAERK_TEKST, msg);
  }
  assert.match(NETVAERK_TEKST, /forbindelse/);
  assert.doesNotMatch(NETVAERK_TEKST, /fetch/i);
});

test('Supabase AuthRetryableFetchError genkendes på navn og status 0', () => {
  const fejl = { name: 'AuthRetryableFetchError', message: 'noget helt andet', status: 0 };
  assert.ok(erNetvaerksfejl(fejl));
  assert.strictEqual(daError(fejl.message, fejl), NETVAERK_TEKST);
  assert.ok(erNetvaerksfejl({ message: 'x', status: 0 }));
});

test('almindelige login-fejl er stadig oversat', () => {
  assert.strictEqual(daError('Invalid login credentials'), 'Forkert e-mail eller adgangskode.');
  assert.match(daError('Email not confirmed'), /ikke bekræftet/);
  assert.match(daError('User already registered'), /findes allerede/);
  assert.match(daError('Password should be at least 6 characters'), /mindst 6 tegn/);
  assert.match(daError('Unable to validate email address: invalid format'), /ikke gyldig/);
  assert.match(daError('email rate limit exceeded'), /grænse pr\. time/);
  assert.match(daError('For security purposes, you can only request this after 20 seconds'), /For mange forsøg/);
});

test('en serverfejl er ikke en netværksfejl', () => {
  assert.ok(!erNetvaerksfejl({ message: 'Invalid login credentials', status: 400 }));
  assert.ok(!erNetvaerksfejl(null));
  assert.ok(!erNetvaerksfejl(undefined));
});

test('ukendt engelsk tekst vises aldrig rå', () => {
  const t = daError('Some unexpected upstream failure 0x7f');
  assert.strictEqual(t, 'Noget gik galt. Prøv igen om lidt.');
  assert.strictEqual(daError(''), 'Noget gik galt. Prøv igen om lidt.');
  assert.strictEqual(daError(undefined), 'Noget gik galt. Prøv igen om lidt.');
});

test('rate limit ved nulstilling nævner ikke bekræftelsesmails', () => {
  const t = daError('email rate limit exceeded', null, 'nulstil');
  assert.doesNotMatch(t, /bekræftelsesmail/);
  assert.match(t, /Vent lidt/);
  assert.match(daError('email rate limit exceeded'), /bekræftelsesmails/);
});
