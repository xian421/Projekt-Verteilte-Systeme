// backend/tests/config.test.js
const crypto = require('crypto');

describe('config module', () => {
  let originalEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  afterAll(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  test('Default-PARAMETER (PORT, ADMIN_PASSWORD, ADMIN_TOKEN)', () => {
    delete process.env.PORT;
    delete process.env.ADMIN_PASSWORD;
    process.env.NODE_ENV = 'development';

    const config = require('../lib/config');
    expect(config.PORT).toBe(4441);
    expect(config.ADMIN_PASSWORD).toBe('keule');

    // ADMIN_TOKEN ist SHA256 von 'keule'
    const expected = crypto
      .createHash('sha256')
      .update('keule')
      .digest('hex');
    expect(config.ADMIN_TOKEN).toBe(expected);
  });

  test('PUBLIC_DIR im Production-Mode', () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const cfg = require('../lib/config');
    expect(cfg.PUBLIC_DIR).toMatch(/frontend\/dist$/);
  });

  test('PUBLIC_DIR im Development-Mode', () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const cfg = require('../lib/config');
    expect(cfg.PUBLIC_DIR).toMatch(/frontend$/);
  });

  test('MIME_TYPES enthält gängige Einträge', () => {
    const cfg = require('../lib/config');
    expect(cfg.MIME_TYPES['.html']).toContain('text/html');
    expect(cfg.MIME_TYPES['.json']).toContain('application/json');
  });

  test('HASH_RE passt auf 64-stelligen Hex-String', () => {
    const { HASH_RE } = require('../lib/config');
    expect(HASH_RE.test('d'.repeat(64))).toBe(true);
    expect(HASH_RE.test('z'.repeat(64))).toBe(false);
  });
});
