// backend/tests/router.test.js
const Router = require('../lib/router');
const httpUtils = require('../lib/httpUtils');
jest.mock('../lib/httpUtils', () => ({ normPath: jest.fn() }));

describe('Router', () => {
  let router, req, res;

  beforeEach(() => {
    router = new Router();
    req = { method: '', url: '', headers: { host: 'localhost' } };
    res = {};
  });

  test('handle() gibt false zurück, wenn keine Route passt', () => {
    httpUtils.normPath.mockReturnValue('/foo');
    req.method = 'GET'; req.url = '/foo';
    expect(router.handle(req, res)).toBe(false);
  });

  test('get() registriert GET-Handler', () => {
    const handler = jest.fn().mockReturnValue('ok');
    router.get('/bar', handler);
    httpUtils.normPath.mockReturnValue('/bar');
    req.method = 'GET'; req.url = '/bar';
    expect(router.handle(req, res)).toBe('ok');
    expect(handler).toHaveBeenCalledWith(req, res);
  });

  test('post() registriert POST-Handler', () => {
    const handler = jest.fn().mockReturnValue(true);
    router.post('/baz', handler);
    httpUtils.normPath.mockReturnValue('/baz');
    req.method = 'POST'; req.url = '/baz';
    expect(router.handle(req, res)).toBe(true);
    expect(handler).toHaveBeenCalledWith(req, res);
  });

  test('add() ist chainable', () => {
    const h1 = jest.fn();
    const h2 = jest.fn();
    router.add('GET','/one',h1).add('POST','/two',h2);

    httpUtils.normPath.mockReturnValue('/one');
    req.method = 'GET'; req.url = '/one';
    router.handle(req, res);
    expect(h1).toHaveBeenCalled();

    httpUtils.normPath.mockReturnValue('/two');
    req.method = 'POST'; req.url = '/two';
    router.handle(req, res);
    expect(h2).toHaveBeenCalled();
  });
});
