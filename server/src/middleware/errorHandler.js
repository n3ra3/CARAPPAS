const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message || err);

  if (err.type === 'validation') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors
    });
  }

  // PostgreSQL errors
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Record already exists'
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Related record not found'
    });
  }

  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'Database connection failed. Check PostgreSQL is running.'
    });
  }

  if (err.code === '28P01' || err.code === '28000') {
    return res.status(503).json({
      error: 'Database authentication failed. Check DB_PASSWORD in .env file.'
    });
  }

  if (err.code === '3D000') {
    return res.status(503).json({
      error: 'Database does not exist. Run: npm run db:migrate'
    });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
};

module.exports = errorHandler;
