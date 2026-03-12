const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { isAdminEmail } = require('./admin');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Требуется авторизация' 
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userResult = await db.query(
      'SELECT id, email, role, is_blocked FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    const user = userResult.rows[0];
    if (user.is_blocked) {
      return res.status(403).json({ error: 'Ваш аккаунт заблокирован администратором' });
    }

    const isAdmin = user.role === 'admin' || isAdminEmail(user.email);

    await Promise.all([
      db.query(
        `INSERT INTO user_activity (user_id, activity_date, source)
         VALUES ($1, CURRENT_DATE, 'api')
         ON CONFLICT (user_id, activity_date) DO NOTHING`,
        [user.id]
      ),
      db.query(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      )
    ]);

    req.userId = user.id;
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      isAdmin
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Токен истёк' 
      });
    }
    return res.status(401).json({ 
      error: 'Недействительный токен' 
    });
  }
};

module.exports = auth;
