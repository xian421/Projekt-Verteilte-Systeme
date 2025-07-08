// backend/tests/httpUtils.test.js
const { EventEmitter } = require('events');
const httpUtils = require('../lib/httpUtils');
const { sendJSON, collectJSON, setSec, normPath } = httpUtils;

describe('httpUtils', () => {
  test('setSec setzt Security-Header', () => {
    const res = { setHeader: jest.fn() };
    setSec(res, false);
    expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(res.setHeader).toHaveBeenCalledWith('Cross-Origin-Resource-Policy', 'same-origin');
  });

  test('sendJSON schreibt Header + JSON', () => {
    const res = {
      headersSent: false,
      setHeader:  jest.fn(),
      writeHead:  jest.fn(),
      end:        jest.fn()
    };
    const obj = { foo: 'bar' };
    const ret = sendJSON(res, 201, obj);
    expect(ret).toBe(true);
    expect(res.writeHead).toHaveBeenCalledWith(201, { 'Content-Type': 'application/json' });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify(obj));
  });

  test('collectJSON parst Body korrekt', done => {
    const ee = new EventEmitter();
    ee.on = ee.addListener; // für manche Node-Versionen
    const req = ee;
    const res = {}; // im Erfolgsfall nicht gebraucht
    collectJSON(req, res, (body) => {
      expect(body).toEqual({ a: 1 });
      done();
    });
    req.emit('data', '{"a":1}');
    req.emit('end');
  });

  test('collectJSON bei invalid JSON sendet 400', () => {
    const ee = new EventEmitter();
    ee.on = ee.addListener;
    const req = ee;
    const res = {
      headersSent: false,
      setHeader:  jest.fn(),
      writeHead:  jest.fn(),
      end:        jest.fn()
    };
    // Spy auf sendJSON
    jest.spyOn(httpUtils, 'sendJSON');
    collectJSON(req, res, () => {});
    req.emit('data', 'not-json');
    req.emit('end');
    expect(httpUtils.sendJSON).toHaveBeenCalledWith(res, 400, {
      ok:    false,
      error: 'Bad JSON'
    });
  });

  test('normPath normalisiert URL-Pfade', () => {
    const req = { url: '/foo//bar/', headers: { host: 'example.org' } };
    const p = normPath(req);
    expect(p).toBe('/foo/bar');
  });
});
