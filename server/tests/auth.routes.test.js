const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');

jest.mock('../src/config/database', () => ({
  query: jest.fn()
}));

jest.mock('../src/middleware/admin', () => ({
  isAdminEmail: jest.fn(() => false)
}));

const db = require('../src/config/database');
const authRoutes = require('../src/routes/auth');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
  });
  return app;
};

describe('Auth routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test_secret';
    process.env.JWT_EXPIRES_IN = '1h';
  });

  test('POST /api/auth/register creates user and returns token', async () => {
    const app = createApp();

    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 10,
          email: 'user@example.com',
          name: 'Test User',
          role: 'user',
          is_blocked: false,
          created_at: '2026-03-17T00:00:00.000Z'
        }]
      });

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'User@Example.com', password: 'secret12', name: 'Test User' });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('user@example.com');
    expect(response.body.token).toBeDefined();
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  test('POST /api/auth/login returns 401 for wrong password', async () => {
    const app = createApp();
    const hash = await bcrypt.hash('correct_password', 10);

    db.query.mockResolvedValueOnce({
      rows: [{
        id: 1,
        email: 'user@example.com',
        password_hash: hash,
        name: 'User',
        role: 'user',
        is_blocked: false
      }]
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'wrong_password' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Неверный email или пароль');
  });
});
