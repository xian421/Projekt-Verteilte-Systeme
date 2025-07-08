// backend/tests/adminRoutes.test.js
const request = require('supertest');
const api     = require('../lib/apiRouter');     // Dein Router-Handler
const { ADMIN_PASSWORD, ADMIN_TOKEN } = require('../lib/config');

describe('Admin-API Integration', () => {
  let roomHash;

  test('POST /admin/login → valid password liefert Token', async () => {
    const res = await request(api)
      .post('/admin/login')
      .send({ password: ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.token).toBe(ADMIN_TOKEN);
  });

  test('POST /admin/add-room ohne Token → 403 Forbidden', async () => {
    const res = await request(api)
      .post('/admin/add-room')
      .send({ name: 'TestRoom' });
    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  test('POST /admin/add-room mit gültigem Token → 200 + Daten', async () => {
    const res = await request(api)
      .post('/admin/add-room')
      .send({ token: ADMIN_TOKEN, name: 'TestRoom' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.hash).toHaveLength(64);
    expect(res.body.data.name).toBe('TestRoom');
    roomHash = res.body.data.hash;
  });

  test('POST /admin/update-blocklist mit ungültigen Daten → 400 Bad Request', async () => {
    const res = await request(api)
      .post('/admin/update-blocklist')
      .send({ token: ADMIN_TOKEN, hash: roomHash, list: 'not-an-array' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  test('POST /admin/update-blocklist mit gültigen Daten → 200 OK', async () => {
    const res = await request(api)
      .post('/admin/update-blocklist')
      .send({ token: ADMIN_TOKEN, hash: roomHash, list: ['1.2.3.4'] });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
