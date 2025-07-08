// backend/tests/roomStore.test.js
const {
  roomsMeta,
  liveRooms,
  findRoom,
  ensureLiveRoom,
  stripIpSpans,
  sendToAdmins,
  sendToAll,
  broadcastSystem,
  banIp
} = require('../lib/roomStore');
const logger = require('../lib/logger');

describe('roomStore', () => {
  beforeEach(() => {
    roomsMeta.clear();
    liveRooms.clear();
  });

  describe('findRoom and ensureLiveRoom', () => {
    test('findRoom returns undefined if not set', () => {
      expect(findRoom('nope')).toBeUndefined();
    });

    test('ensureLiveRoom initializes and caches', () => {
      roomsMeta.set('h', { blocklist: [], name: 'n' });
      const room1 = ensureLiveRoom('h');
      expect(room1).toBe(liveRooms.get('h'));

      // Second call returns same object
      const room2 = ensureLiveRoom('h');
      expect(room2).toBe(room1);
    });
  });

  describe('stripIpSpans', () => {
    test('removes spans in JSON string', () => {
      const input = JSON.stringify({ text: 'hi<span class="ip-info">x</span>bye' });
      const out = stripIpSpans(input);
      expect(JSON.parse(out).text).toBe('hibye');
    });

    test('removes spans in plain HTML', () => {
      const input = '<p>Hello<span class="ip-info">ip</span>World</p>';
      expect(stripIpSpans(input)).toBe('<p>HelloWorld</p>');
    });

    test('non-string payload unchanged', () => {
      const obj = { foo: 'bar' };
      expect(stripIpSpans(obj)).toEqual(obj);
    });
  });

  describe('sendToAdmins', () => {
    test('only sends to admin sockets and respects backpressure', () => {
      const sockA = { isAdmin: true, readyState: 1, OPEN: 1, bufferedAmount: 0, send: jest.fn(), close: jest.fn() };
      const sockB = { isAdmin: true, readyState: 1, OPEN: 1, bufferedAmount: 2 * 1024 * 1024, send: jest.fn(), close: jest.fn() };
      const sockC = { isAdmin: false, readyState: 1, OPEN: 1, bufferedAmount: 0, send: jest.fn(), close: jest.fn() };

      const clientMap = new Map([['ip', new Set([sockA, sockB, sockC])]]);
      sendToAdmins(clientMap, 'secret');

      // sockA is admin with no backpressure → gets message
      expect(sockA.send).toHaveBeenCalledWith('secret');

      // sockB is admin but excessive backpressure → closed
      expect(sockB.close).toHaveBeenCalled();

      // sockC is not admin → not sent
      expect(sockC.send).not.toHaveBeenCalled();
    });
  });

  describe('sendToAll', () => {
    test('sends to all open sockets, strips IP spans for non-admins', () => {
      const payload = 'msg<span class="ip-info">ip</span>';

      const sockA = { isAdmin: true, readyState: 1, OPEN: 1, bufferedAmount: 0, send: jest.fn(), close: jest.fn() };
      const sockB = { isAdmin: false, readyState: 1, OPEN: 1, bufferedAmount: 0, send: jest.fn(), close: jest.fn() };

      const clientMap = new Map([['ip', new Set([sockA, sockB])]]);
      sendToAll(clientMap, payload);

      // Admin sees full payload
      expect(sockA.send).toHaveBeenCalledWith(payload);

      // Non-admin gets stripped text
      expect(sockB.send).toHaveBeenCalledWith('msg');
    });
  });

  describe('broadcastSystem', () => {
    test('adds a system message to history', () => {
      // Prepare a new room
      roomsMeta.set('h', { blocklist: [], name: 'n' });
      const room = ensureLiveRoom('h');
      room.activeClients = new Map(); // no sockets needed for this test
      room.history = [];

      broadcastSystem('h', 'hello world');
      expect(room.history).toHaveLength(1);

      const msgObj = JSON.parse(room.history[0]);
      expect(msgObj).toEqual({ type: 'system', text: 'hello world' });
    });
  });

  describe('banIp', () => {
    test('adds to blocklist, closes active sockets and logs', () => {
      roomsMeta.set('h', { blocklist: [], name: 'n' });
      const room = ensureLiveRoom('h');

      const sock = { isAdmin: true, readyState: 1, OPEN: 1, bufferedAmount: 0, send: jest.fn(), close: jest.fn() };
      room.activeClients.set('1.2.3.4', new Set([sock]));
      room.history = [];

      const infoSpy = jest.spyOn(logger, 'info').mockImplementation();

      banIp('h', '1.2.3.4', { auto: false });

      // IP added to both meta and runtime blocklist
      expect(roomsMeta.get('h').blocklist).toContain('1.2.3.4');
      expect(room.blocklist).toContain('1.2.3.4');

      // Active socket should be closed
      expect(sock.close).toHaveBeenCalled();

      // History should include a system message with adminOnly flag
      const last = JSON.parse(room.history[room.history.length - 1]);
      expect(last).toMatchObject({ type: 'system' });
      expect(last.text).toContain('🚫 1.2.3.4');

      // Logger was called
      expect(infoSpy).toHaveBeenCalled();

      infoSpy.mockRestore();
    });
  });
});
