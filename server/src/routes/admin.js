const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');
const { adminOnly, isAdminEmail } = require('../middleware/admin');

const router = express.Router();

router.use(auth);
router.use(adminOnly);

const PERIOD_MAP = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '180d': 180
};

const getPeriodDays = (period) => PERIOD_MAP[period] || 30;

const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

const buildUsersFilters = (query) => {
  const conditions = [];
  const values = [];

  if (query.search) {
    values.push(`%${query.search.trim()}%`);
    conditions.push(`(u.email ILIKE $${values.length} OR COALESCE(u.name, '') ILIKE $${values.length})`);
  }

  if (query.role && ['user', 'admin'].includes(query.role)) {
    values.push(query.role);
    conditions.push(`u.role = $${values.length}`);
  }

  if (query.status === 'blocked') {
    conditions.push('u.is_blocked = true');
  }

  if (query.status === 'active') {
    conditions.push('u.is_blocked = false');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, values };
};

const getRetention = async (days) => {
  const result = await db.query(
    `WITH cohort AS (
       SELECT id, DATE(created_at) AS signup_day
       FROM users
       WHERE created_at >= CURRENT_DATE - ($1::int * INTERVAL '1 day')
     )
     SELECT
       COUNT(*)::int AS cohort_size,
       COUNT(*) FILTER (
         WHERE EXISTS (
           SELECT 1
           FROM user_activity ua
           WHERE ua.user_id = cohort.id
             AND ua.activity_date = cohort.signup_day + 1
         )
       )::int AS d1,
       COUNT(*) FILTER (
         WHERE EXISTS (
           SELECT 1
           FROM user_activity ua
           WHERE ua.user_id = cohort.id
             AND ua.activity_date = cohort.signup_day + 7
         )
       )::int AS d7,
       COUNT(*) FILTER (
         WHERE EXISTS (
           SELECT 1
           FROM user_activity ua
           WHERE ua.user_id = cohort.id
             AND ua.activity_date = cohort.signup_day + 30
         )
       )::int AS d30
     FROM cohort`,
    [days]
  );

  const base = result.rows[0];
  const cohortSize = base.cohort_size || 0;
  const percent = (value) => (cohortSize > 0 ? Number(((value / cohortSize) * 100).toFixed(2)) : 0);

  return {
    cohortSize,
    d1: { count: base.d1, rate: percent(base.d1) },
    d7: { count: base.d7, rate: percent(base.d7) },
    d30: { count: base.d30, rate: percent(base.d30) }
  };
};

router.get('/dashboard', async (req, res, next) => {
  try {
    const [
      usersCountRes,
      newUsers30Res,
      carsCountRes,
      remindersActiveRes,
      documentsCountRes,
      expensesStatsRes,
      registrationsByDayRes,
      activityByDayRes,
      recentUsersRes,
      dauRes,
      wauRes,
      mauRes,
      blockedUsersRes
    ] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS count FROM users'),
      db.query(
        `SELECT COUNT(*)::int AS count
         FROM users
         WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'`
      ),
      db.query('SELECT COUNT(*)::int AS count FROM cars'),
      db.query('SELECT COUNT(*)::int AS count FROM reminders WHERE is_completed = false'),
      db.query('SELECT COUNT(*)::int AS count FROM documents'),
      db.query(
        `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0)::numeric(12,2) AS total
         FROM expenses`
      ),
      db.query(
        `SELECT TO_CHAR(d.day, 'YYYY-MM-DD') AS date,
                COALESCE(COUNT(u.id), 0)::int AS count
         FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS d(day)
         LEFT JOIN users u ON DATE(u.created_at) = DATE(d.day)
         GROUP BY d.day
         ORDER BY d.day ASC`
      ),
      db.query(
        `SELECT TO_CHAR(d.day, 'YYYY-MM-DD') AS date,
                COALESCE(COUNT(DISTINCT ua.user_id), 0)::int AS count
         FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS d(day)
         LEFT JOIN user_activity ua ON ua.activity_date = DATE(d.day)
         GROUP BY d.day
         ORDER BY d.day ASC`
      ),
      db.query(
        `SELECT u.id,
                u.email,
                u.name,
                u.role,
                u.is_blocked,
                u.created_at,
                u.last_login_at,
                COUNT(c.id)::int AS cars_count
         FROM users u
         LEFT JOIN cars c ON c.user_id = u.id
         GROUP BY u.id, u.email, u.name, u.role, u.is_blocked, u.created_at, u.last_login_at
         ORDER BY u.created_at DESC
         LIMIT 15`
      ),
      db.query(`SELECT COUNT(DISTINCT user_id)::int AS count FROM user_activity WHERE activity_date = CURRENT_DATE`),
      db.query(`SELECT COUNT(DISTINCT user_id)::int AS count FROM user_activity WHERE activity_date >= CURRENT_DATE - INTERVAL '6 days'`),
      db.query(`SELECT COUNT(DISTINCT user_id)::int AS count FROM user_activity WHERE activity_date >= CURRENT_DATE - INTERVAL '29 days'`),
      db.query(`SELECT COUNT(*)::int AS count FROM users WHERE is_blocked = true`)
    ]);

    const retention = await getRetention(30);

    res.json({
      stats: {
        totalUsers: usersCountRes.rows[0].count,
        newUsers30Days: newUsers30Res.rows[0].count,
        totalCars: carsCountRes.rows[0].count,
        activeReminders: remindersActiveRes.rows[0].count,
        totalDocuments: documentsCountRes.rows[0].count,
        totalExpensesRecords: expensesStatsRes.rows[0].count,
        totalExpensesAmount: Number(expensesStatsRes.rows[0].total),
        blockedUsers: blockedUsersRes.rows[0].count,
        dau: dauRes.rows[0].count,
        wau: wauRes.rows[0].count,
        mau: mauRes.rows[0].count
      },
      retention,
      registrationsByDay: registrationsByDayRes.rows,
      activityByDay: activityByDayRes.rows,
      recentUsers: recentUsersRes.rows
    });
  } catch (error) {
    next(error);
  }
});

router.get('/analytics', async (req, res, next) => {
  try {
    const period = req.query.period || '30d';
    const days = getPeriodDays(period);

    const [registrationsRes, activityRes, summaryRes] = await Promise.all([
      db.query(
        `SELECT TO_CHAR(d.day, 'YYYY-MM-DD') AS date,
                COALESCE(COUNT(u.id), 0)::int AS registrations
         FROM generate_series(CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day'), CURRENT_DATE, INTERVAL '1 day') AS d(day)
         LEFT JOIN users u ON DATE(u.created_at) = DATE(d.day)
         GROUP BY d.day
         ORDER BY d.day ASC`,
        [days]
      ),
      db.query(
        `SELECT TO_CHAR(d.day, 'YYYY-MM-DD') AS date,
                COALESCE(COUNT(DISTINCT ua.user_id), 0)::int AS active_users
         FROM generate_series(CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day'), CURRENT_DATE, INTERVAL '1 day') AS d(day)
         LEFT JOIN user_activity ua ON ua.activity_date = DATE(d.day)
         GROUP BY d.day
         ORDER BY d.day ASC`,
        [days]
      ),
      db.query(
        `SELECT
          COUNT(*)::int FILTER (WHERE created_at >= CURRENT_DATE - ($1::int * INTERVAL '1 day')) AS new_users,
          COUNT(*)::int FILTER (WHERE is_blocked = true) AS blocked_users,
          COUNT(*)::int FILTER (WHERE role = 'admin') AS admins
         FROM users`,
        [days]
      )
    ]);

    const retention = await getRetention(days);

    const activityMap = new Map(activityRes.rows.map((row) => [row.date, row.active_users]));
    const reportByDay = registrationsRes.rows.map((row) => ({
      date: row.date,
      registrations: row.registrations,
      activeUsers: activityMap.get(row.date) || 0
    }));

    const totals = reportByDay.reduce(
      (acc, row) => {
        acc.registrations += row.registrations;
        acc.activeUsers += row.activeUsers;
        return acc;
      },
      { registrations: 0, activeUsers: 0 }
    );

    const averageDailyActiveUsers = reportByDay.length > 0
      ? Number((totals.activeUsers / reportByDay.length).toFixed(2))
      : 0;

    res.json({
      period,
      days,
      summary: {
        newUsers: summaryRes.rows[0].new_users,
        blockedUsers: summaryRes.rows[0].blocked_users,
        admins: summaryRes.rows[0].admins,
        averageDailyActiveUsers
      },
      retention,
      reportByDay
    });
  } catch (error) {
    next(error);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { whereClause, values } = buildUsersFilters(req.query);

    const countQuery = `SELECT COUNT(*)::int AS count FROM users u ${whereClause}`;
    const usersQuery = `
      SELECT
        u.id,
        u.email,
        u.name,
        u.role,
        u.is_blocked,
        u.created_at,
        u.last_login_at,
        COUNT(c.id)::int AS cars_count
      FROM users u
      LEFT JOIN cars c ON c.user_id = u.id
      ${whereClause}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    const [countRes, usersRes] = await Promise.all([
      db.query(countQuery, values),
      db.query(usersQuery, [...values, limit, offset])
    ]);

    const total = countRes.rows[0].count;

    res.json({
      users: usersRes.rows.map((user) => ({
        ...user,
        isAdmin: user.role === 'admin' || isAdminEmail(user.email)
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:id/block', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const isBlocked = Boolean(req.body.isBlocked);

    if (Number.isNaN(userId)) {
      return res.status(400).json({ error: 'Некорректный ID пользователя' });
    }

    if (userId === req.userId) {
      return res.status(400).json({ error: 'Нельзя изменить статус блокировки для собственного аккаунта' });
    }

    const result = await db.query(
      `UPDATE users
       SET is_blocked = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, email, name, role, is_blocked, created_at, last_login_at`,
      [isBlocked, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      user: {
        ...result.rows[0],
        isAdmin: result.rows[0].role === 'admin' || isAdminEmail(result.rows[0].email)
      }
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:id/role', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { role } = req.body;

    if (Number.isNaN(userId)) {
      return res.status(400).json({ error: 'Некорректный ID пользователя' });
    }

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Роль должна быть user или admin' });
    }

    if (userId === req.userId) {
      return res.status(400).json({ error: 'Нельзя изменить роль собственного аккаунта' });
    }

    const result = await db.query(
      `UPDATE users
       SET role = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, email, name, role, is_blocked, created_at, last_login_at`,
      [role, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      user: {
        ...result.rows[0],
        isAdmin: result.rows[0].role === 'admin' || isAdminEmail(result.rows[0].email)
      }
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);

    if (Number.isNaN(userId)) {
      return res.status(400).json({ error: 'Некорректный ID пользователя' });
    }

    if (userId === req.userId) {
      return res.status(400).json({ error: 'Нельзя удалить собственный аккаунт' });
    }

    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ message: 'Пользователь удален' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
