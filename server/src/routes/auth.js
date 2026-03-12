const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');
const { isAdminEmail } = require('../middleware/admin');

const router = express.Router();

// Валидация
const registerValidation = [
  body('email').isEmail().withMessage('Некорректный email'),
  body('password').isLength({ min: 6 }).withMessage('Пароль минимум 6 символов'),
  body('name').optional().trim().isLength({ max: 100 })
];

const loginValidation = [
  body('email').isEmail().withMessage('Некорректный email'),
  body('password').notEmpty().withMessage('Введите пароль')
];

// POST /api/auth/register - Регистрация
router.post('/register', registerValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;

    // Проверка существующего пользователя
    const existing = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Пользователь с таким email уже существует' 
      });
    }

    // Хеширование пароля
    const passwordHash = await bcrypt.hash(password, 10);
    const normalizedEmail = email.toLowerCase();
    const role = isAdminEmail(normalizedEmail) ? 'admin' : 'user';

    // Создание пользователя
    const result = await db.query(
      `INSERT INTO users (email, password_hash, name, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, name, role, is_blocked, created_at`,
      [normalizedEmail, passwordHash, name || null, role]
    );

    const user = result.rows[0];
    const isAdmin = user.role === 'admin' || isAdminEmail(user.email);

    // Генерация токена
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        isAdmin
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'Регистрация успешна',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isBlocked: user.is_blocked,
        isAdmin
      },
      token
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login - Вход
router.post('/login', loginValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Поиск пользователя
    const result = await db.query(
      'SELECT id, email, password_hash, name, role, is_blocked FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Неверный email или пароль' 
      });
    }

    const user = result.rows[0];
    const isAdmin = user.role === 'admin' || isAdminEmail(user.email);

    if (user.is_blocked) {
      return res.status(403).json({ error: 'Ваш аккаунт заблокирован администратором' });
    }

    // Проверка пароля
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ 
        error: 'Неверный email или пароль' 
      });
    }

    // Генерация токена
    await Promise.all([
      db.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]),
      db.query(
        `INSERT INTO user_activity (user_id, activity_date, source)
         VALUES ($1, CURRENT_DATE, 'login')
         ON CONFLICT (user_id, activity_date) DO NOTHING`,
        [user.id]
      )
    ]);

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        isAdmin
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isBlocked: user.is_blocked,
        isAdmin
      },
      token
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me - Текущий пользователь
router.get('/me', auth, async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, email, name, role, is_blocked, created_at, last_login_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const user = result.rows[0];
    res.json({
      user: {
        ...user,
        isBlocked: user.is_blocked,
        isAdmin: user.role === 'admin' || isAdminEmail(user.email)
      }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/profile - Обновление профиля
router.put('/profile', auth, async (req, res, next) => {
  try {
    const { name } = req.body;

    const result = await db.query(
      `UPDATE users SET name = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, email, name, role, is_blocked`,
      [name, req.userId]
    );

    const user = result.rows[0];
    res.json({
      user: {
        ...user,
        isBlocked: user.is_blocked,
        isAdmin: user.role === 'admin' || isAdminEmail(user.email)
      }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/password - Смена пароля
router.put('/password', auth, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const result = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.userId]
    );

    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Неверный текущий пароль' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newHash, req.userId]
    );

    res.json({ message: 'Пароль успешно изменён' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
