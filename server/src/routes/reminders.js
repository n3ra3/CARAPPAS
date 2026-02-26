const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// GET /api/reminders - Все напоминания пользователя
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT r.*, c.id as car_id, c.mileage as current_mileage,
              b.name as brand_name, m.name as model_name
       FROM reminders r
       JOIN cars c ON r.car_id = c.id
       LEFT JOIN car_brands b ON c.brand_id = b.id
       LEFT JOIN car_models m ON c.model_id = m.id
       WHERE c.user_id = $1
       ORDER BY 
         CASE WHEN r.is_completed THEN 1 ELSE 0 END,
         r.due_date NULLS LAST,
         r.created_at DESC`,
      [req.userId]
    );

    res.json({ reminders: result.rows });
  } catch (error) {
    next(error);
  }
});

// GET /api/reminders/active - Активные напоминания
router.get('/active', async (req, res, next) => {
  try {
    // Получаем напоминания по дате (ближайшие 30 дней)
    const byDate = await db.query(
      `SELECT r.*, c.id as car_id, b.name as brand_name, m.name as model_name
       FROM reminders r
       JOIN cars c ON r.car_id = c.id
       LEFT JOIN car_brands b ON c.brand_id = b.id
       LEFT JOIN car_models m ON c.model_id = m.id
       WHERE c.user_id = $1 
         AND r.is_completed = FALSE
         AND r.reminder_type = 'date'
         AND r.due_date <= CURRENT_DATE + INTERVAL '30 days'
       ORDER BY r.due_date`,
      [req.userId]
    );

    // Получаем напоминания по пробегу
    const byMileage = await db.query(
      `SELECT r.*, c.id as car_id, c.mileage as current_mileage,
              b.name as brand_name, m.name as model_name
       FROM reminders r
       JOIN cars c ON r.car_id = c.id
       LEFT JOIN car_brands b ON c.brand_id = b.id
       LEFT JOIN car_models m ON c.model_id = m.id
       WHERE c.user_id = $1 
         AND r.is_completed = FALSE
         AND r.reminder_type = 'mileage'
         AND r.due_mileage <= c.mileage + 1000
       ORDER BY (r.due_mileage - c.mileage)`,
      [req.userId]
    );

    res.json({
      reminders: {
        byDate: byDate.rows,
        byMileage: byMileage.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reminders/car/:carId - Напоминания для автомобиля
router.get('/car/:carId', async (req, res, next) => {
  try {
    const carCheck = await db.query(
      'SELECT id FROM cars WHERE id = $1 AND user_id = $2',
      [req.params.carId, req.userId]
    );

    if (carCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }

    const result = await db.query(
      `SELECT * FROM reminders
       WHERE car_id = $1
       ORDER BY is_completed, due_date NULLS LAST, due_mileage NULLS LAST`,
      [req.params.carId]
    );

    res.json({ reminders: result.rows });
  } catch (error) {
    next(error);
  }
});

// POST /api/reminders - Создание напоминания
router.post('/', [
  body('car_id').isInt(),
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('reminder_type').isIn(['date', 'mileage']),
  body('due_date').optional({ values: 'falsy' }).isDate(),
  body('due_mileage').optional({ values: 'falsy' }).isInt({ min: 0 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return res.status(400).json({ error: firstError.msg || 'Ошибка валидации', errors: errors.array() });
    }

    const { car_id, title, description, notes, reminder_type, due_date, due_mileage } = req.body;

    // Проверка владельца
    const carCheck = await db.query(
      'SELECT id FROM cars WHERE id = $1 AND user_id = $2',
      [car_id, req.userId]
    );

    if (carCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }

    // Валидация типа напоминания
    if (reminder_type === 'date' && !due_date) {
      return res.status(400).json({ error: 'Укажите дату напоминания' });
    }
    if (reminder_type === 'mileage' && !due_mileage) {
      return res.status(400).json({ error: 'Укажите пробег напоминания' });
    }

    const result = await db.query(
      `INSERT INTO reminders (car_id, title, description, reminder_type, due_date, due_mileage)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [car_id, title, description || notes || null, reminder_type, due_date || null, due_mileage || null]
    );

    res.status(201).json({ reminder: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// PUT /api/reminders/:id - Обновление напоминания
router.put('/:id', async (req, res, next) => {
  try {
    const { title, description, reminder_type, due_date, due_mileage, is_completed } = req.body;

    const check = await db.query(
      `SELECT r.id FROM reminders r
       JOIN cars c ON r.car_id = c.id
       WHERE r.id = $1 AND c.user_id = $2`,
      [req.params.id, req.userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Напоминание не найдено' });
    }

    const result = await db.query(
      `UPDATE reminders 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           reminder_type = COALESCE($3, reminder_type),
           due_date = COALESCE($4, due_date),
           due_mileage = COALESCE($5, due_mileage),
           is_completed = COALESCE($6, is_completed),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [title, description, reminder_type, due_date, due_mileage, is_completed, req.params.id]
    );

    res.json({ reminder: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// PUT /api/reminders/:id/complete - Отметить выполненным
router.put('/:id/complete', async (req, res, next) => {
  try {
    const check = await db.query(
      `SELECT r.id FROM reminders r
       JOIN cars c ON r.car_id = c.id
       WHERE r.id = $1 AND c.user_id = $2`,
      [req.params.id, req.userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Напоминание не найдено' });
    }

    const result = await db.query(
      `UPDATE reminders 
       SET is_completed = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    res.json({ reminder: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/reminders/:id - Удаление напоминания
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `DELETE FROM reminders r
       USING cars c
       WHERE r.car_id = c.id AND r.id = $1 AND c.user_id = $2
       RETURNING r.id`,
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Напоминание не найдено' });
    }

    res.json({ message: 'Напоминание удалено' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
