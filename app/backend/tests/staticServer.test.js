// backend/tests/staticServer.test.js
const fs = require('fs');
const path = require('path');
const { serveStatic, serveLanding, serve404 } = require('../lib/staticServer');
const httpUtils = require('../lib/httpUtils');

jest.mock('fs');
jest.mock('../lib/httpUtils', () => ({
  setSec: jest.fn(),
  streamFile: jest.fn(),
  normPath: jest.fn()
}));

const { PUBLIC_DIR } = require('../lib/config');

describe('staticServer', () => {
  let req, res;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { url: '', headers: { host: 'localhost' } };
    res = { writeHead: jest.fn().mockReturnThis(), end: jest.fn() };
  });

  test('serveLanding() ruft Landing-Page', () => {
    serveLanding(res);
    const landingPage = path.join(PUBLIC_DIR, 'pages', 'landing.html');
    expect(httpUtils.streamFile).toHaveBeenCalledWith(
      res, landingPage, 200, 'text/html'
    );
  });

  test('serve404() ruft 404-Seite', () => {
    serve404(res);
    const errPage = path.join(PUBLIC_DIR, '404.html');
    expect(httpUtils.streamFile).toHaveBeenCalledWith(
      res, errPage, 404, 'text/html'
    );
  });

  describe('serveStatic()', () => {
    test('Route /admin', () => {
      httpUtils.normPath.mockReturnValue('/admin');
      serveStatic(req, res);
      const adminPage = path.join(PUBLIC_DIR, 'pages', 'admin.html');
      expect(httpUtils.streamFile).toHaveBeenCalledWith(
        res, adminPage, 200, 'text/html'
      );
    });

    test('Route /index.html', () => {
      httpUtils.normPath.mockReturnValue('/index.html');
      serveStatic(req, res);
      const indexPage = path.join(PUBLIC_DIR, 'index.html');
      expect(httpUtils.streamFile).toHaveBeenCalledWith(
        res, indexPage, 200, 'text/html'
      );
    });

    test('existierendes Asset mit CORS (z.B. .json)', () => {
      const url = '/asset.json';
      httpUtils.normPath.mockReturnValue(url);
      const absPath = path.join(PUBLIC_DIR, 'asset.json');
      fs.existsSync.mockReturnValue(true);

      serveStatic(req, res);

      expect(httpUtils.streamFile).toHaveBeenCalledWith(
        res,
        absPath,
        200,
        undefined,
        true  // CORS für Web-Assets
      );
    });

    test('nicht-existierendes Asset liefert 404-Seite', () => {
      httpUtils.normPath.mockReturnValue('/does-not-exist.png');
      const errPage = path.join(PUBLIC_DIR, '404.html');
      fs.existsSync.mockReturnValue(false);

      const ret = serveStatic(req, res);

      expect(httpUtils.streamFile).toHaveBeenCalledWith(
        res,
        errPage,
        404,
        'text/html'
      );
      expect(ret).toBe(true);
    });
  });
});
