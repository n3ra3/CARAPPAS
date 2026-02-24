const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// GET /api/service/types - Типы сервисных работ
router.get('/types', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM service_types ORDER BY name');
    res.json({ types: result.rows });
  } catch (error) {
    next(error);
  }
});

// GET /api/service/car/:carId - Записи для автомобиля
router.get('/car/:carId', async (req, res, next) => {
  try {
    // Проверка владельца
    const carCheck = await db.query(
      'SELECT id FROM cars WHERE id = $1 AND user_id = $2',
      [req.params.carId, req.userId]
    );

    if (carCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }

    const result = await db.query(
      `SELECT sr.*, st.name as service_type_name
       FROM service_records sr
       LEFT JOIN service_types st ON sr.service_type_id = st.id
       WHERE sr.car_id = $1
       ORDER BY sr.date DESC`,
      [req.params.carId]
    );

    res.json({ records: result.rows });
  } catch (error) {
    next(error);
  }
});

// GET /api/service/:id - Одна запись
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT sr.*, st.name as service_type_name
       FROM service_records sr
       LEFT JOIN service_types st ON sr.service_type_id = st.id
       JOIN cars c ON sr.car_id = c.id
       WHERE sr.id = $1 AND c.user_id = $2`,
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    res.json({ record: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// POST /api/service - Добавление записи
router.post('/', [
  body('car_id').isInt(),
  body('service_type_id').isInt(),
  body('date').isDate(),
  body('mileage').optional().isInt({ min: 0 }),
  body('cost').optional().isDecimal()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { car_id, service_type_id, date, mileage, description, cost } = req.body;

    // Проверка владельца автомобиля
    const carCheck = await db.query(
      'SELECT id FROM cars WHERE id = $1 AND user_id = $2',
      [car_id, req.userId]
    );

    if (carCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }

    const result = await db.query(
      `INSERT INTO service_records (car_id, service_type_id, date, mileage, description, cost)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [car_id, service_type_id, date, mileage, description, cost]
    );

    // Обновляем пробег автомобиля, если указан
    if (mileage) {
      await db.query(
        'UPDATE cars SET mileage = GREATEST(mileage, $1) WHERE id = $2',
        [mileage, car_id]
      );
    }

    const record = await db.query(
      `SELECT sr.*, st.name as service_type_name
       FROM service_records sr
       LEFT JOIN service_types st ON sr.service_type_id = st.id
       WHERE sr.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({ record: record.rows[0] });
  } catch (error) {
    next(error);
  }
});

// PUT /api/service/:id - Обновление записи
router.put('/:id', async (req, res, next) => {
  try {
    const { service_type_id, date, mileage, description, cost } = req.body;

    // Проверка владельца
    const check = await db.query(
      `SELECT sr.id FROM service_records sr
       JOIN cars c ON sr.car_id = c.id
       WHERE sr.id = $1 AND c.user_id = $2`,
      [req.params.id, req.userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    const result = await db.query(
      `UPDATE service_records 
       SET service_type_id = COALESCE($1, service_type_id),
           date = COALESCE($2, date),
           mileage = COALESCE($3, mileage),
           description = COALESCE($4, description),
           cost = COALESCE($5, cost),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [service_type_id, date, mileage, description, cost, req.params.id]
    );

    const record = await db.query(
      `SELECT sr.*, st.name as service_type_name
       FROM service_records sr
       LEFT JOIN service_types st ON sr.service_type_id = st.id
       WHERE sr.id = $1`,
      [result.rows[0].id]
    );

    res.json({ record: record.rows[0] });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/service/:id - Удаление записи
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `DELETE FROM service_records sr
       USING cars c
       WHERE sr.car_id = c.id AND sr.id = $1 AND c.user_id = $2
       RETURNING sr.id`,
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
