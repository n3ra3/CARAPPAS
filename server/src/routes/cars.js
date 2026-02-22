const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Все роуты требуют авторизации
router.use(auth);

// GET /api/cars - Список автомобилей пользователя
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT c.*, b.name as brand_name, m.name as model_name
       FROM cars c
       LEFT JOIN car_brands b ON c.brand_id = b.id
       LEFT JOIN car_models m ON c.model_id = m.id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC`,
      [req.userId]
    );

    res.json({ cars: result.rows });
  } catch (error) {
    next(error);
  }
});

// GET /api/cars/:id - Один автомобиль
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT c.*, b.name as brand_name, m.name as model_name
       FROM cars c
       LEFT JOIN car_brands b ON c.brand_id = b.id
       LEFT JOIN car_models m ON c.model_id = m.id
       WHERE c.id = $1 AND c.user_id = $2`,
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }

    res.json({ car: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// POST /api/cars - Добавление автомобиля
router.post('/', [
  body('brand_id').isInt(),
  body('model_id').isInt(),
  body('year').optional().isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
  body('vin').optional().isLength({ max: 17 }),
  body('license_plate').optional().isLength({ max: 20 }),
  body('mileage').optional().isInt({ min: 0 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { brand_id, model_id, year, vin, license_plate, mileage } = req.body;

    const result = await db.query(
      `INSERT INTO cars (user_id, brand_id, model_id, year, vin, license_plate, mileage)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.userId, brand_id, model_id, year, vin, license_plate, mileage || 0]
    );

    // Получаем полные данные с названиями
    const car = await db.query(
      `SELECT c.*, b.name as brand_name, m.name as model_name
       FROM cars c
       LEFT JOIN car_brands b ON c.brand_id = b.id
       LEFT JOIN car_models m ON c.model_id = m.id
       WHERE c.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({ car: car.rows[0] });
  } catch (error) {
    next(error);
  }
});

// PUT /api/cars/:id - Обновление автомобиля
router.put('/:id', async (req, res, next) => {
  try {
    const { brand_id, model_id, year, vin, license_plate, mileage, photo_url } = req.body;

    // Проверка владельца
    const check = await db.query(
      'SELECT id FROM cars WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }

    const result = await db.query(
      `UPDATE cars 
       SET brand_id = COALESCE($1, brand_id),
           model_id = COALESCE($2, model_id),
           year = COALESCE($3, year),
           vin = COALESCE($4, vin),
           license_plate = COALESCE($5, license_plate),
           mileage = COALESCE($6, mileage),
           photo_url = COALESCE($7, photo_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [brand_id, model_id, year, vin, license_plate, mileage, photo_url, req.params.id]
    );

    const car = await db.query(
      `SELECT c.*, b.name as brand_name, m.name as model_name
       FROM cars c
       LEFT JOIN car_brands b ON c.brand_id = b.id
       LEFT JOIN car_models m ON c.model_id = m.id
       WHERE c.id = $1`,
      [result.rows[0].id]
    );

    res.json({ car: car.rows[0] });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/cars/:id - Удаление автомобиля
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM cars WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }

    res.json({ message: 'Автомобиль удалён' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/cars/:id/mileage - Обновление пробега
router.put('/:id/mileage', [
  body('mileage').isInt({ min: 0 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await db.query(
      `UPDATE cars 
       SET mileage = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [req.body.mileage, req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }

    res.json({ car: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
