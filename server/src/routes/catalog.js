const express = require('express');
const db = require('../config/database');

const router = express.Router();

// GET /api/catalog/brands - Список марок
router.get('/brands', async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM car_brands';
    const params = [];

    if (search) {
      query += ' WHERE LOWER(name) LIKE LOWER($1)';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY name';

    const result = await db.query(query, params);
    res.json({ brands: result.rows });
  } catch (error) {
    next(error);
  }
});

// GET /api/catalog/brands/:id/models - Модели марки
router.get('/brands/:id/models', async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM car_models WHERE brand_id = $1';
    const params = [req.params.id];

    if (search) {
      query += ' AND LOWER(name) LIKE LOWER($2)';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY name';

    const result = await db.query(query, params);
    res.json({ models: result.rows });
  } catch (error) {
    next(error);
  }
});

// GET /api/catalog/models - Все модели с марками
router.get('/models', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT m.*, b.name as brand_name
       FROM car_models m
       JOIN car_brands b ON m.brand_id = b.id
       ORDER BY b.name, m.name`
    );
    res.json({ models: result.rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
