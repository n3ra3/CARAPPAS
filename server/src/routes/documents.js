const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// Типы документов
const DOCUMENT_TYPES = [
  { id: 'license', name: 'Водительское удостоверение' },
  { id: 'osago', name: 'ОСАГО' },
  { id: 'kasko', name: 'КАСКО' },
  { id: 'sts', name: 'СТС' },
  { id: 'pts', name: 'ПТС' },
  { id: 'diagnostic', name: 'Диагностическая карта' },
  { id: 'passport', name: 'Паспорт' },
  { id: 'other', name: 'Другой документ' }
];

// GET /api/documents/types - Типы документов
router.get('/types', (req, res) => {
  res.json({ types: DOCUMENT_TYPES });
});

// GET /api/documents - Все документы пользователя
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT d.*, b.name as brand_name, m.name as model_name
       FROM documents d
       LEFT JOIN cars c ON d.car_id = c.id
       LEFT JOIN car_brands b ON c.brand_id = b.id
       LEFT JOIN car_models m ON c.model_id = m.id
       WHERE d.user_id = $1
       ORDER BY d.expiry_date NULLS LAST, d.created_at DESC`,
      [req.userId]
    );

    res.json({ documents: result.rows });
  } catch (error) {
    next(error);
  }
});

// GET /api/documents/expiring - Документы с истекающим сроком
router.get('/expiring', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT d.*, b.name as brand_name, m.name as model_name,
              EXTRACT(DAY FROM d.expiry_date - CURRENT_DATE) as days_left
       FROM documents d
       LEFT JOIN cars c ON d.car_id = c.id
       LEFT JOIN car_brands b ON c.brand_id = b.id
       LEFT JOIN car_models m ON c.model_id = m.id
       WHERE d.user_id = $1 
         AND d.expiry_date IS NOT NULL
         AND d.expiry_date <= CURRENT_DATE + (d.notify_days_before || ' days')::INTERVAL
       ORDER BY d.expiry_date`,
      [req.userId]
    );

    res.json({ documents: result.rows });
  } catch (error) {
    next(error);
  }
});

// GET /api/documents/:id - Один документ
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT d.*, b.name as brand_name, m.name as model_name
       FROM documents d
       LEFT JOIN cars c ON d.car_id = c.id
       LEFT JOIN car_brands b ON c.brand_id = b.id
       LEFT JOIN car_models m ON c.model_id = m.id
       WHERE d.id = $1 AND d.user_id = $2`,
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Документ не найден' });
    }

    res.json({ document: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// POST /api/documents - Добавление документа
router.post('/', [
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('doc_type').isIn(DOCUMENT_TYPES.map(t => t.id)),
  body('car_id').optional().isInt(),
  body('doc_number').optional().trim().isLength({ max: 100 }),
  body('issue_date').optional().isDate(),
  body('expiry_date').optional().isDate(),
  body('notify_days_before').optional().isInt({ min: 1, max: 365 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      title, doc_type, car_id, doc_number, 
      issue_date, expiry_date, photo_url, notes, notify_days_before 
    } = req.body;

    // Если указан car_id, проверяем владельца
    if (car_id) {
      const carCheck = await db.query(
        'SELECT id FROM cars WHERE id = $1 AND user_id = $2',
        [car_id, req.userId]
      );
      if (carCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Автомобиль не найден' });
      }
    }

    const result = await db.query(
      `INSERT INTO documents 
       (user_id, car_id, title, doc_type, doc_number, issue_date, expiry_date, photo_url, notes, notify_days_before)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        req.userId, car_id || null, title, doc_type, doc_number || null,
        issue_date || null, expiry_date || null, photo_url || null, 
        notes || null, notify_days_before || 30
      ]
    );

    res.status(201).json({ document: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// PUT /api/documents/:id - Обновление документа
router.put('/:id', async (req, res, next) => {
  try {
    const { 
      title, doc_type, car_id, doc_number, 
      issue_date, expiry_date, photo_url, notes, notify_days_before 
    } = req.body;

    // Проверка владельца документа
    const check = await db.query(
      'SELECT id FROM documents WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Документ не найден' });
    }

    // Если указан car_id, проверяем владельца автомобиля
    if (car_id) {
      const carCheck = await db.query(
        'SELECT id FROM cars WHERE id = $1 AND user_id = $2',
        [car_id, req.userId]
      );
      if (carCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Автомобиль не найден' });
      }
    }

    const result = await db.query(
      `UPDATE documents 
       SET title = COALESCE($1, title),
           doc_type = COALESCE($2, doc_type),
           car_id = $3,
           doc_number = COALESCE($4, doc_number),
           issue_date = $5,
           expiry_date = $6,
           photo_url = COALESCE($7, photo_url),
           notes = COALESCE($8, notes),
           notify_days_before = COALESCE($9, notify_days_before),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [
        title, doc_type, car_id || null, doc_number,
        issue_date, expiry_date, photo_url, notes, 
        notify_days_before, req.params.id
      ]
    );

    res.json({ document: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/documents/:id - Удаление документа
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM documents WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Документ не найден' });
    }

    res.json({ message: 'Документ удалён' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
