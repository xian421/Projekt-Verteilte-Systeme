// backend/tests/adminMiddleware.test.js
jest.mock('../lib/httpUtils', () => ({
  collectJSON: jest.fn((req, res, cb) => cb(req._body || {})),
  sendJSON:    jest.fn((res, status, obj) => ({ status, obj }))
}));

const { requireAdmin } = require('../lib/admin');
const { ADMIN_TOKEN } = require('../lib/config');
const { sendJSON }    = require('../lib/httpUtils');

describe('requireAdmin-Middleware', () => {
  let req, res, handler, wrapped;

  beforeEach(() => {
    handler = jest.fn();
    req     = {};
    res     = {};
    sendJSON.mockClear();
  });

  test('ruft Handler auf, wenn Token korrekt ist', () => {
    req._body = { token: ADMIN_TOKEN, foo: 'bar' };
    wrapped   = requireAdmin(handler);
    wrapped(req, res);
    expect(handler).toHaveBeenCalledWith(req._body, req, res);
  });

  test('sendet 403, wenn Token fehlt oder falsch ist', () => {
    req._body = { token: 'nope' };
    wrapped   = requireAdmin(handler);
    wrapped(req, res);
    expect(sendJSON).toHaveBeenCalledWith(res, 403, {
      ok: false,
      error: 'Forbidden: Admins only'
    });
    expect(handler).not.toHaveBeenCalled();
  });
});
