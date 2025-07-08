// backend/tests/roomStore.test.js
const {
  roomsMeta, liveRooms, findRoom, ensureLiveRoom,
  stripIpSpans, sendToAdmins, sendToAll,
  broadcastSystem, banIp
} = require('../lib/roomStore');
const logger = require('../lib/logger');

describe('roomStore', () => {
  beforeEach(() => {
    roomsMeta.clear();
    liveRooms.clear();
  });

  describe('findRoom and ensureLiveRoom', () => {
    test('findRoom returns undefined if not set', () => {
      expect(findRoom('no')).toBeUndefined();
    });
    test('ensureLiveRoom initializes and caches', () => {
      roomsMeta.set('h', { blocklist: [], name:'n' });
      const room1 = ensureLiveRoom('h');
      expect(room1).toBe(liveRooms.get('h'));
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
    test('removes spans in HTML', () => {
      const input = '<p>foo<span class="ip-info">x</span>bar</p>';
      expect(stripIpSpans(input)).toBe('<p>foobar</p>');
    });
    test('non-string payload unchanged', () => {
      expect(stripIpSpans({})).toEqual({});
    });
  });

  describe('sendToAdmins', () => {
    test('only sends to admin sockets and respects backpressure', () => {
      const sockA = { isAdmin:true, readyState:1, bufferedAmount:0, send:jest.fn(), close:jest.fn() };
      const sockB = { isAdmin:true, readyState:1, bufferedAmount:2*1024*1024, send:jest.fn(), close:jest.fn() };
      const sockC = { isAdmin:false, readyState:1, bufferedAmount:0, send:jest.fn(), close:jest.fn() };
      const cm = new Map([[ 'ip', new Set([sockA,sockB,sockC]) ]]);
      sendToAdmins(cm, 'msg');
      expect(sockA.send).toHaveBeenCalledWith('msg');
      expect(sockB.close).toHaveBeenCalled();
      expect(sockC.send).not.toHaveBeenCalled();
    });
  });

  describe('sendToAll', () => {
    test('sends to all open, strips for non-admin', () => {
      const payload = 'hello<span class="ip-info">ip</span>';
      const sockA = { isAdmin:true, readyState:1, bufferedAmount:0, send:jest.fn(), close:jest.fn() };
      const sockB = { isAdmin:false, readyState:1, bufferedAmount:0, send:jest.fn(), close:jest.fn() };
      const cm = new Map([['ip', new Set([sockA,sockB])]]);
      sendToAll(cm, payload);
      expect(sockA.send).toHaveBeenCalledWith(payload);
      expect(sockB.send).toHaveBeenCalledWith('hello');
    });
  });

  describe('broadcastSystem', () => {
    test('adds to history and calls sendToAll', () => {
      roomsMeta.set('h',{blocklist:[],name:'n'});
      const room = ensureLiveRoom('h');
      room.activeClients = new Map();
      room.history = [];
      const spy = jest.spyOn(require('../lib/roomStore'), 'sendToAll').mockImplementation();
      broadcastSystem('h','text');
      expect(room.history[0]).toContain('"type":"system"');
      expect(spy).toHaveBeenCalledWith(room.activeClients, room.history[0]);
      spy.mockRestore();
    });
  });

  describe('banIp', () => {
    test('adds to blocklist, closes sockets and logs', () => {
      roomsMeta.set('h',{blocklist:[],name:'n'});
      const room = ensureLiveRoom('h');
      const sock = { isAdmin:true, readyState:1, bufferedAmount:0, send:jest.fn(), close:jest.fn() };
      room.activeClients.set('1.2.3.4', new Set([sock]));
      room.history = [];
      const infoSpy = jest.spyOn(logger, 'info').mockImplementation();
      banIp('h','1.2.3.4',{auto:false});
      expect(roomsMeta.get('h').blocklist).toContain('1.2.3.4');
      expect(room.blocklist).toContain('1.2.3.4');
      expect(sock.close).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalled();
      infoSpy.mockRestore();
    });
  });
});
