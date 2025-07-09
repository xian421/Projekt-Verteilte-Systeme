// backend/tests/api.test.js
const request = require('supertest');

describe('Chat-Backend API', () => {
  const BASE = 'http://localhost:8444';

  test('GET /rooms.json liefert Status 200 und Array', async () => {
    const res = await request(BASE).get('/rooms.json');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /blocklist.json ohne room → leeres Array', async () => {
    const res = await request(BASE).get('/blocklist.json');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toEqual([]);
  });
});
