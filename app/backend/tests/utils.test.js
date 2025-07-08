// backend/tests/utils.test.js
const { randHash, escapeHTML } = require('../lib/utils');

describe('utils', () => {
  test('randHash erzeugt 64-hex-Zeichen', () => {
    const h = randHash();
    expect(typeof h).toBe('string');
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });

  test('escapeHTML ersetzt Sonderzeichen korrekt', () => {
    const input = `& < > " ' \``;
    const out = escapeHTML(input);
    expect(out).toBe('&amp; &lt; &gt; &quot; &#39; &#96;');
  });

  test('escapeHTML mit undefined gibt leeren String', () => {
    expect(escapeHTML()).toBe('');
  });
});
