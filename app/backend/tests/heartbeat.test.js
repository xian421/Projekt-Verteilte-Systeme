// backend/tests/heartbeat.test.js
jest.useFakeTimers();
const startHeartbeat = require('../lib/heartbeat');
const logger = require('../lib/logger');

describe('startHeartbeat', () => {
  let wss, wsAlive, wsDead;

  beforeEach(() => {
    wsAlive = { isAlive: true, ping: jest.fn(), terminate: jest.fn() };
    wsDead  = { isAlive: false, ping: jest.fn(), terminate: jest.fn() };
    wss = { clients: new Set([wsAlive, wsDead]) };
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  test('pingt lebende Sockets und markiert sie stale', () => {
    const iv = startHeartbeat(wss, 1000);
    // nach dem ersten Intervall
    jest.advanceTimersByTime(1000);
    // wsAlive war isAlive=true → ping gerufen, dann isAlive=false gesetzt
    expect(wsAlive.ping).toHaveBeenCalled();
    expect(wsAlive.isAlive).toBe(false);
    // wsDead war isAlive=false → terminate gerufen
    expect(logger.warn).toHaveBeenCalledWith('Client stale – terminating');
    expect(wsDead.terminate).toHaveBeenCalled();
    clearInterval(iv);
  });
});
