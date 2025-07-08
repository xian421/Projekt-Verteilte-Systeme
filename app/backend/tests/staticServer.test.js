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

  test('serveLanding() ruft streamFile mit Landing-Page auf', () => {
    serveLanding(res);
    const LAN = path.join(PUBLIC_DIR, 'pages', 'landing.html');
    expect(httpUtils.streamFile).toHaveBeenCalledWith(res, LAN, 200, 'text/html');
  });

  test('serve404() ruft streamFile mit 404 auf', () => {
    serve404(res);
    const ERR = path.join(PUBLIC_DIR, '404.html');
    expect(httpUtils.streamFile).toHaveBeenCalledWith(res, ERR, 404, 'text/html');
  });

  describe('serveStatic()', () => {
    test('feste Route /admin', () => {
      httpUtils.normPath.mockReturnValue('/admin');
      serveStatic(req, res);
      const ADMIN = path.join(PUBLIC_DIR, 'pages', 'admin.html');
      expect(httpUtils.streamFile).toHaveBeenCalledWith(res, ADMIN, 200, 'text/html');
    });

    test('feste Route /index.html', () => {
      httpUtils.normPath.mockReturnValue('/index.html');
      serveStatic(req, res);
      const PAGE = path.join(PUBLIC_DIR, 'index.html');
      expect(httpUtils.streamFile).toHaveBeenCalledWith(res, PAGE, 200, 'text/html');
    });

    test('Pfad außerhalb PUBLIC_DIR → 403 + true', () => {
      httpUtils.normPath.mockReturnValue('/../etc/passwd');
      // fs.existsSync nicht relevant, da Security-Hürde zuerst greift
      const ret = serveStatic(req, res);
      expect(res.writeHead).toHaveBeenCalledWith(403);
      expect(res.end).toHaveBeenCalled();
      expect(ret).toBe(true);
    });

    test('bestehende Datei mit CORS für .json', () => {
      const url = '/asset.json';
      httpUtils.normPath.mockReturnValue(url);
      const abs = path.join(PUBLIC_DIR, 'asset.json');
      fs.existsSync.mockReturnValue(true);
      serveStatic(req, res);
      expect(httpUtils.streamFile).toHaveBeenCalledWith(
        res,
        abs,
        200,
        undefined,
        true  // CORS für typische Web-Assets
      );
    });

    test('Nicht existente Datei liefert 404-Seite + true', () => {
      httpUtils.normPath.mockReturnValue('/does-not-exist.png');
      const abs = path.join(PUBLIC_DIR, 'does-not-exist.png');
      fs.existsSync.mockReturnValue(false);
      const ret = serveStatic(req, res);
      const ERR = path.join(PUBLIC_DIR, '404.html');
      expect(httpUtils.streamFile).toHaveBeenCalledWith(res, ERR, 404, 'text/html');
      expect(ret).toBe(true);
    });
  });
});
