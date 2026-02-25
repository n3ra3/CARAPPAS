const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// GET /api/expenses/categories - Категории расходов
router.get('/categories', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM expense_categories ORDER BY id');
    res.json({ categories: result.rows });
  } catch (error) {
    next(error);
  }
});

// GET /api/expenses/car/:carId - Расходы для автомобиля
router.get('/car/:carId', async (req, res, next) => {
  try {
    const carCheck = await db.query(
      'SELECT id FROM cars WHERE id = $1 AND user_id = $2',
      [req.params.carId, req.userId]
    );

    if (carCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }

    const { from, to, category_id } = req.query;
    let query = `
      SELECT e.*, ec.name as category_name, ec.icon as category_icon
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.car_id = $1
    `;
    const params = [req.params.carId];
    let paramIndex = 2;

    if (from) {
      query += ` AND e.date >= $${paramIndex++}`;
      params.push(from);
    }
    if (to) {
      query += ` AND e.date <= $${paramIndex++}`;
      params.push(to);
    }
    if (category_id) {
      query += ` AND e.category_id = $${paramIndex++}`;
      params.push(category_id);
    }

    query += ' ORDER BY e.date DESC';

    const result = await db.query(query, params);
    res.json({ expenses: result.rows });
  } catch (error) {
    next(error);
  }
});

// GET /api/expenses/car/:carId/stats - Статистика расходов
router.get('/car/:carId/stats', async (req, res, next) => {
  try {
    const carCheck = await db.query(
      'SELECT id FROM cars WHERE id = $1 AND user_id = $2',
      [req.params.carId, req.userId]
    );

    if (carCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }

    // Общая сумма по категориям
    const byCategory = await db.query(
      `SELECT ec.name, ec.icon, SUM(e.amount) as total
       FROM expenses e
       JOIN expense_categories ec ON e.category_id = ec.id
       WHERE e.car_id = $1
       GROUP BY ec.id, ec.name, ec.icon
       ORDER BY total DESC`,
      [req.params.carId]
    );

    // Расходы по месяцам
    const byMonth = await db.query(
      `SELECT 
         DATE_TRUNC('month', date) as month,
         SUM(amount) as total
       FROM expenses
       WHERE car_id = $1
       GROUP BY DATE_TRUNC('month', date)
       ORDER BY month DESC
       LIMIT 12`,
      [req.params.carId]
    );

    // Средний расход топлива
    const fuelStats = await db.query(
      `SELECT 
         SUM(fuel_volume) as total_volume,
         SUM(amount) as total_cost,
         COUNT(*) as refuels
       FROM expenses
       WHERE car_id = $1 AND fuel_volume IS NOT NULL`,
      [req.params.carId]
    );

    // Расчёт среднего расхода топлива
    let avgConsumption = null;

    // Метод 1: tank-to-tank (точный) — нужны 2+ заправки с пробегом
    const fuelConsumption = await db.query(
      `SELECT fuel_volume, mileage
       FROM expenses
       WHERE car_id = $1 AND fuel_volume IS NOT NULL AND mileage IS NOT NULL
       ORDER BY mileage`,
      [req.params.carId]
    );

    const fuelData = fuelConsumption.rows;
    if (fuelData.length >= 2) {
      const totalFuel = fuelData.slice(1).reduce((sum, r) => sum + parseFloat(r.fuel_volume), 0);
      const distance = fuelData[fuelData.length - 1].mileage - fuelData[0].mileage;
      if (distance > 0) {
        avgConsumption = ((totalFuel / distance) * 100).toFixed(1);
      }
    }

    // Метод 2: общий объём топлива / диапазон пробега из ВСЕХ расходов
    if (avgConsumption === null) {
      const totalVolume = parseFloat(fuelStats.rows[0].total_volume) || 0;
      if (totalVolume > 0) {
        const mileageRange = await db.query(
          `SELECT MIN(mileage) as min_m, MAX(mileage) as max_m
           FROM expenses
           WHERE car_id = $1 AND mileage IS NOT NULL`,
          [req.params.carId]
        );
        const range = mileageRange.rows[0];
        if (range && range.max_m && range.min_m && range.max_m > range.min_m) {
          const distance = range.max_m - range.min_m;
          avgConsumption = ((totalVolume / distance) * 100).toFixed(1);
        }
      }
    }

    // Метод 3: объём топлива / разница пробега авто
    if (avgConsumption === null) {
      const totalVolume = parseFloat(fuelStats.rows[0].total_volume) || 0;
      if (totalVolume > 0) {
        const carMileage = await db.query(
          `SELECT mileage FROM cars WHERE id = $1`,
          [req.params.carId]
        );
        const firstExpense = await db.query(
          `SELECT MIN(mileage) as first_m FROM expenses
           WHERE car_id = $1 AND mileage IS NOT NULL`,
          [req.params.carId]
        );
        const currentMileage = carMileage.rows[0]?.mileage;
        const firstMileage = firstExpense.rows[0]?.first_m;
        if (currentMileage && firstMileage && currentMileage > firstMileage) {
          const distance = currentMileage - firstMileage;
          avgConsumption = ((totalVolume / distance) * 100).toFixed(1);
        }
      }
    }

    res.json({
      stats: {
        byCategory: byCategory.rows,
        byMonth: byMonth.rows,
        fuel: {
          ...fuelStats.rows[0],
          avgConsumption
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/expenses - Добавление расхода
router.post('/', [
  body('car_id').isInt(),
  body('category_id').isInt(),
  body('date').isDate(),
  body('amount').isDecimal({ min: 0 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { car_id, category_id, date, amount, mileage, fuel_volume, fuel_price, description } = req.body;

    const carCheck = await db.query(
      'SELECT id FROM cars WHERE id = $1 AND user_id = $2',
      [car_id, req.userId]
    );

    if (carCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }

    const result = await db.query(
      `INSERT INTO expenses (car_id, category_id, date, amount, mileage, fuel_volume, fuel_price, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [car_id, category_id, date, amount, mileage, fuel_volume, fuel_price, description]
    );

    if (mileage) {
      await db.query(
        'UPDATE cars SET mileage = GREATEST(mileage, $1) WHERE id = $2',
        [mileage, car_id]
      );
    }

    const expense = await db.query(
      `SELECT e.*, ec.name as category_name, ec.icon as category_icon
       FROM expenses e
       LEFT JOIN expense_categories ec ON e.category_id = ec.id
       WHERE e.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({ expense: expense.rows[0] });
  } catch (error) {
    next(error);
  }
});

// PUT /api/expenses/:id - Обновление расхода
router.put('/:id', async (req, res, next) => {
  try {
    const { category_id, date, amount, mileage, fuel_volume, fuel_price, description } = req.body;

    const check = await db.query(
      `SELECT e.id FROM expenses e
       JOIN cars c ON e.car_id = c.id
       WHERE e.id = $1 AND c.user_id = $2`,
      [req.params.id, req.userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    const result = await db.query(
      `UPDATE expenses 
       SET category_id = COALESCE($1, category_id),
           date = COALESCE($2, date),
           amount = COALESCE($3, amount),
           mileage = COALESCE($4, mileage),
           fuel_volume = COALESCE($5, fuel_volume),
           fuel_price = COALESCE($6, fuel_price),
           description = COALESCE($7, description),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [category_id, date, amount, mileage, fuel_volume, fuel_price, description, req.params.id]
    );

    const expense = await db.query(
      `SELECT e.*, ec.name as category_name, ec.icon as category_icon
       FROM expenses e
       LEFT JOIN expense_categories ec ON e.category_id = ec.id
       WHERE e.id = $1`,
      [result.rows[0].id]
    );

    res.json({ expense: expense.rows[0] });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/expenses/:id - Удаление расхода
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `DELETE FROM expenses e
       USING cars c
       WHERE e.car_id = c.id AND e.id = $1 AND c.user_id = $2
       RETURNING e.id`,
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    res.json({ message: 'Запись удалена' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
