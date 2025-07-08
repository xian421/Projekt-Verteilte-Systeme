// backend/tests/adminRoutes.test.js
const request = require('supertest');
const http    = require('http');
const api     = require('../lib/apiRouter');  // das ist der Express-ähnliche Handler
const { PORT }= require('../lib/config');

// Wir bauen einen echten HTTP-Server nur für die Tests
let server;
beforeAll((done) => {
  server = http.createServer((req, res) => api(req, res));
  server.listen(PORT, () => done());
});
afterAll((done) => server.close(done));

describe('Admin-API Integration', () => {
  const base = `http://localhost:${PORT}`;
  const { ADMIN_TOKEN, ADMIN_PASSWORD } = require('../lib/config');
  let roomHash;

  test('POST /admin/login → valid password liefert Token', async () => {
    const res = await request(base)
      .post('/admin/login')
      .send({ password: ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.token).toBe(ADMIN_TOKEN);
  });

  test('POST /admin/add-room ohne Token → 403', async () => {
    const res = await request(base)
      .post('/admin/add-room')
      .send({ name: 'TestRoom' });
    expect(res.status).toBe(403);
  });

  test('POST /admin/add-room mit gültigem Token → 200 + Daten', async () => {
    const res = await request(base)
      .post('/admin/add-room')
      .send({ name: 'TestRoom', token: ADMIN_TOKEN });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.hash).toHaveLength(64);
    expect(res.body.data.name).toBe('TestRoom');
    roomHash = res.body.data.hash;
  });

  test('POST /admin/update-blocklist mit ungültigen Daten → 400', async () => {
    const res = await request(base)
      .post('/admin/update-blocklist')
      .send({ token: ADMIN_TOKEN, hash: roomHash, list: 'not-an-array' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  test('POST /admin/update-blocklist mit gültigen Daten → 200', async () => {
    const res = await request(base)
      .post('/admin/update-blocklist')
      .send({ token: ADMIN_TOKEN, hash: roomHash, list: ['1.2.3.4'] });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
