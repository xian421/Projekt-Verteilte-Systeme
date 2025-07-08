// backend/tests/respond.test.js
const { json } = require('../lib/respond');
const { setSec } = require('../lib/staticServer');

jest.mock('../lib/staticServer', () => ({
  setSec: jest.fn()
}));

describe('respond.json', () => {
  let res;
  beforeEach(() => {
    res = {
      headersSent: false,
      writeHead: jest.fn(),
      end: jest.fn()
    };
    setSec.mockClear();
  });

  test('sends JSON and returns true', () => {
    const obj = { a:1 };
    const ret = json(res, 201, obj);
    expect(setSec).toHaveBeenCalledWith(res, true);
    expect(res.writeHead).toHaveBeenCalledWith(201, {'Content-Type':'application/json'});
    expect(res.end).toHaveBeenCalledWith(JSON.stringify(obj));
    expect(ret).toBe(true);
  });

  test('returns true if headersSent', () => {
    res.headersSent = true;
    const ret = json(res);
    expect(ret).toBe(true);
    expect(setSec).not.toHaveBeenCalled();
  });
});