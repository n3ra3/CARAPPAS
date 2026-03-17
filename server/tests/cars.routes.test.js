const express = require('express');
const request = require('supertest');

jest.mock('../src/config/database', () => ({
  query: jest.fn()
}));

jest.mock('../src/middleware/auth', () => (req, res, next) => {
  req.userId = 1;
  next();
});

const db = require('../src/config/database');
const carsRoutes = require('../src/routes/cars');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/cars', carsRoutes);
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
  });
  return app;
};

describe('Cars routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/cars creates car', async () => {
    const app = createApp();

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 5 }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 5,
          brand_id: 1,
          model_id: 2,
          year: 2022,
          brand_name: 'Toyota',
          model_name: 'Corolla'
        }]
      });

    const response = await request(app)
      .post('/api/cars')
      .send({ brand_id: 1, model_id: 2, year: 2022, mileage: 10000 });

    expect(response.status).toBe(201);
    expect(response.body.car.id).toBe(5);
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  test('GET /api/cars/:id returns 404 when not found', async () => {
    const app = createApp();
    db.query.mockResolvedValueOnce({ rows: [] });

    const response = await request(app).get('/api/cars/999');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Автомобиль не найден');
  });
});
