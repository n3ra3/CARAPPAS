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
const expensesRoutes = require('../src/routes/expenses');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/expenses', expensesRoutes);
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
  });
  return app;
};

describe('Expenses routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/expenses/categories returns categories', async () => {
    const app = createApp();
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Топливо', icon: 'fuel' }] });

    const response = await request(app).get('/api/expenses/categories');

    expect(response.status).toBe(200);
    expect(response.body.categories).toHaveLength(1);
    expect(response.body.categories[0].name).toBe('Топливо');
  });

  test('POST /api/expenses returns 404 when car is not owned by user', async () => {
    const app = createApp();
    db.query.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .post('/api/expenses')
      .send({
        car_id: 999,
        category_id: 1,
        date: '2026-03-17',
        amount: '120.50'
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Автомобиль не найден');
  });

  test('POST /api/expenses creates expense successfully', async () => {
    const app = createApp();

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })
      .mockResolvedValueOnce({ rows: [{ id: 101 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 101,
          car_id: 10,
          amount: '250.00',
          category_name: 'Топливо',
          category_icon: 'fuel'
        }]
      });

    const response = await request(app)
      .post('/api/expenses')
      .send({
        car_id: 10,
        category_id: 1,
        date: '2026-03-17',
        amount: '250.00',
        mileage: 150000,
        fuel_volume: '40.0',
        fuel_price: '6.25',
        description: 'Заправка'
      });

    expect(response.status).toBe(201);
    expect(response.body.expense.id).toBe(101);
    expect(response.body.expense.category_name).toBe('Топливо');
  });

  test('GET /api/expenses/car/:carId returns expenses list', async () => {
    const app = createApp();

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })
      .mockResolvedValueOnce({
        rows: [{ id: 101, amount: '250.00', category_name: 'Топливо' }]
      });

    const response = await request(app).get('/api/expenses/car/10');

    expect(response.status).toBe(200);
    expect(response.body.expenses).toHaveLength(1);
    expect(response.body.expenses[0].id).toBe(101);
  });

  test('GET /api/expenses/car/:carId/stats returns computed fuel stats', async () => {
    const app = createApp();

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })
      .mockResolvedValueOnce({ rows: [{ name: 'Топливо', icon: 'fuel', total: '500.00' }] })
      .mockResolvedValueOnce({ rows: [{ month: '2026-03-01', total: '500.00' }] })
      .mockResolvedValueOnce({ rows: [{ total_volume: '80.00', total_cost: '500.00', refuels: '2' }] })
      .mockResolvedValueOnce({
        rows: [
          { fuel_volume: '40.00', mileage: 100000 },
          { fuel_volume: '40.00', mileage: 100500 }
        ]
      });

    const response = await request(app).get('/api/expenses/car/10/stats');

    expect(response.status).toBe(200);
    expect(response.body.stats.byCategory).toHaveLength(1);
    expect(response.body.stats.fuel.avgConsumption).toBe('8.0');
  });
});
