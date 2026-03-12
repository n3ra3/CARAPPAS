const db = require('../config/database');

const getAdminEmails = () => {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
};

const isAdminEmail = (email) => {
  if (!email) {
    return false;
  }

  return getAdminEmails().includes(email.toLowerCase());
};

const adminOnly = async (req, res, next) => {
  try {
    if (req.user?.isAdmin === true) {
      return next();
    }

    const result = await db.query('SELECT email, role FROM users WHERE id = $1', [req.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const { email, role } = result.rows[0];
    const hasAdminAccess = role === 'admin' || isAdminEmail(email);

    if (!hasAdminAccess) {
      return res.status(403).json({ error: 'Доступ только для администратора' });
    }

    req.user = {
      ...(req.user || {}),
      userId: req.userId,
      email,
      role,
      isAdmin: true
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  adminOnly,
  isAdminEmail
};
