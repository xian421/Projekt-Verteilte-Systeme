// backend/tests/rateLimiter.test.js
jest.useFakeTimers();
const { RateLimiter } = require('../lib/rateLimiter');
const logger = require('../lib/logger');

describe('RateLimiter', () => {
  let limiter;
  beforeEach(() => {
    limiter = new RateLimiter(2, 1000);
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  test('allows requests up to max count in window', () => {
    expect(limiter.allowed('ip')).toBe(true);
    expect(limiter.allowed('ip')).toBe(true);
    expect(limiter.allowed('ip')).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith('Rate‑Limit: ip blocked (3/2)');
  });

  test('resets count after window', () => {
    limiter.allowed('ip');
    limiter.allowed('ip');
    jest.advanceTimersByTime(1001);
    expect(limiter.allowed('ip')).toBe(true);
  });
});