// backend/tests/chatRouter.test.js
const http = require('http');
const path = require('path');
const chatRouter = require('../lib/chatRouter');

// Mock-Abhängigkeiten
jest.mock('../lib/config', () => ({
  PUBLIC_DIR: '/public'
}));
jest.mock('../lib/staticServer', () => {
   return { serveLanding: jest.fn() };
 });
 jest.mock('../lib/httpUtils', () => {
   return { streamFile: jest.fn(), normPath: jest.fn() };
 });
 jest.mock('../lib/roomStore', () => {
   return { findRoom: jest.fn() };
 });

 // Jetzt die gemockten Funktionen holen
 const { serveLanding } = require('../lib/staticServer');
 const { streamFile, normPath } = require('../lib/httpUtils');
 const { findRoom } = require('../lib/roomStore');
describe('chatRouter', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      writeHead: jest.fn().mockReturnThis(),
      end:       jest.fn()
    };
  });

  function makeReq(url, host = 'localhost') {
    return { url, headers: { host } };
  }

  test('Redirect bei valid ?room=hash', () => {
    const valid = 'a'.repeat(64);
    findRoom.mockReturnValueOnce({});        // Raum existiert
    req = makeReq(`/?room=${valid}`);
    const handled = chatRouter(req, res);
    expect(handled).toBe(true);
    expect(res.writeHead).toHaveBeenCalledWith(302, {
      Location: `/chat/${valid}`
    });
    expect(res.end).toHaveBeenCalled();
  });

  test('Landing-Routen', () => {
    for (const p of ['/', '/chat', '/chat.html']) {
      normPath.mockReturnValueOnce(p);
      req = makeReq(p);
      expect(chatRouter(req, res)).toBe(true);
      expect(serveLanding).toHaveBeenCalledWith(res);
    }
  });

  test('Chat-Shell mit vorhandenem Hash', () => {
    const hash = 'b'.repeat(64);
    normPath.mockReturnValueOnce(`/chat/${hash}`);
    findRoom.mockReturnValueOnce({});        // Raum existiert
    req = makeReq(`/chat/${hash}`);
    expect(chatRouter(req, res)).toBe(true);
    expect(streamFile).toHaveBeenCalledWith(
      res,
      path.join('/public', 'pages', 'chat.html'),
      200,
      'text/html'
    );
  });

  test('Chat-Shell unbekannter Hash → false', () => {
    const hash = 'c'.repeat(64);
    normPath.mockReturnValueOnce(`/chat/${hash}`);
    findRoom.mockReturnValueOnce(null);
    req = makeReq(`/chat/${hash}`);
    expect(chatRouter(req, res)).toBe(false);
  });

  test('Fallback unter /chat/... → Landing', () => {
    normPath.mockReturnValueOnce('/chat/extra/path');
    req = makeReq('/chat/extra/path');
    expect(chatRouter(req, res)).toBe(true);
    expect(serveLanding).toHaveBeenCalledWith(res);
  });

  test('Nicht-matchende Route → false', () => {
    normPath.mockReturnValueOnce('/foobar');
    req = makeReq('/foobar');
    expect(chatRouter(req, res)).toBe(false);
  });
});
