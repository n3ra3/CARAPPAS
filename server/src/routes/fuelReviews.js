const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

const reviewValidation = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Оценка должна быть от 1 до 5'),
  body('comment').optional({ nullable: true }).isLength({ max: 500 }).withMessage('Комментарий максимум 500 символов')
];

router.get('/summary', async (req, res, next) => {
  try {
    const rawIds = String(req.query.stationIds || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    const stationIds = rawIds
      .map((id) => Number.parseInt(id, 10))
      .filter((id) => Number.isInteger(id) && id > 0)
      .slice(0, 200);

    if (stationIds.length === 0) {
      return res.json({ summaries: [] });
    }

    const result = await db.query(
      `SELECT station_osm_id,
              ROUND(AVG(rating)::numeric, 2) AS avg_rating,
              COUNT(*)::int AS reviews_count
       FROM fuel_station_reviews
       WHERE station_osm_id = ANY($1::bigint[])
       GROUP BY station_osm_id`,
      [stationIds]
    );

    res.json({ summaries: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get('/:stationId', async (req, res, next) => {
  try {
    const stationId = Number.parseInt(req.params.stationId, 10);
    if (!Number.isInteger(stationId) || stationId <= 0) {
      return res.status(400).json({ error: 'Некорректный stationId' });
    }

    const [summaryRes, reviewsRes, myReviewRes] = await Promise.all([
      db.query(
        `SELECT ROUND(AVG(rating)::numeric, 2) AS avg_rating,
                COUNT(*)::int AS reviews_count
         FROM fuel_station_reviews
         WHERE station_osm_id = $1`,
        [stationId]
      ),
      db.query(
        `SELECT r.id,
                r.station_osm_id,
                r.user_id,
                r.rating,
                r.comment,
                r.created_at,
                r.updated_at,
                COALESCE(u.name, u.email) AS author_name
         FROM fuel_station_reviews r
         LEFT JOIN users u ON u.id = r.user_id
         WHERE r.station_osm_id = $1
         ORDER BY r.created_at DESC
         LIMIT 20`,
        [stationId]
      ),
      db.query(
        `SELECT id, station_osm_id, user_id, rating, comment, created_at, updated_at
         FROM fuel_station_reviews
         WHERE station_osm_id = $1 AND user_id = $2`,
        [stationId, req.userId]
      )
    ]);

    const summaryRow = summaryRes.rows[0];
    res.json({
      summary: {
        avgRating: summaryRow?.avg_rating ? Number(summaryRow.avg_rating) : null,
        reviewsCount: summaryRow?.reviews_count || 0
      },
      myReview: myReviewRes.rows[0] || null,
      reviews: reviewsRes.rows
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:stationId', reviewValidation, async (req, res, next) => {
  try {
    const stationId = Number.parseInt(req.params.stationId, 10);
    if (!Number.isInteger(stationId) || stationId <= 0) {
      return res.status(400).json({ error: 'Некорректный stationId' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const rating = Number.parseInt(req.body.rating, 10);
    const comment = (req.body.comment || '').trim() || null;

    const result = await db.query(
      `INSERT INTO fuel_station_reviews (station_osm_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (station_osm_id, user_id)
       DO UPDATE SET
         rating = EXCLUDED.rating,
         comment = EXCLUDED.comment,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, station_osm_id, user_id, rating, comment, created_at, updated_at`,
      [stationId, req.userId, rating, comment]
    );

    res.json({ review: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
