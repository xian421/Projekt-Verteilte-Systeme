// backend/tests/logger.test.js
const logger = require('../lib/logger');

describe('Logger', () => {
  let logs = [];
  beforeEach(() => {
    logs = [];
    jest.spyOn(console, 'log').mockImplementation((...args) => logs.push(args));
    jest.spyOn(console, 'warn').mockImplementation((...args) => logs.push(args));
    jest.spyOn(console, 'error').mockImplementation((...args) => logs.push(args));
  });

  afterEach(() => jest.restoreAllMocks());

  test('info logs with [HH:MM:SS] INFO: prefix and emits event', () => {
    const listener = jest.fn();
    logger.on('info', listener);
    logger.info('message');
    expect(logs.length).toBe(1);
    const [prefix, msg] = logs[0];
    expect(prefix).toMatch(/^\[\d{2}:\d{2}:\d{2}\] INFO:$/);
    expect(msg).toBe('message');
    expect(listener).toHaveBeenCalledWith('message');
  });

  test('warn logs and emits', () => {
    const listener = jest.fn();
    logger.on('warn', listener);
    logger.warn('warnmsg');
    expect(logs[0][0]).toMatch(/^\[\d{2}:\d{2}:\d{2}\] WARN:$/);
    expect(logs[0][1]).toBe('warnmsg');
    expect(listener).toHaveBeenCalledWith('warnmsg');
  });

  test('error logs and emits', () => {
    const listener = jest.fn();
    logger.on('error', listener);
    logger.error('errormsg');
    expect(logs[0][0]).toMatch(/^\[\d{2}:\d{2}:\d{2}\] ERR:$/);
    expect(logs[0][1]).toBe('errormsg');
    expect(listener).toHaveBeenCalledWith('errormsg');
  });
});