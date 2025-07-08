// backend/tests/wsHandler.test.js
const attachWss = require('../lib/wsHandler');

describe('wsHandler', () => {
  test('attachWss registriert connection-Listener', () => {
    const on = jest.fn();
    const wss = { on };
    attachWss(wss);
    expect(on).toHaveBeenCalledWith('connection', expect.any(Function));
  });
});
