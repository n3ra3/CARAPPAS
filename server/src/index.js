const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
  override: true
});
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const carsRoutes = require('./routes/cars');
const serviceRoutes = require('./routes/service');
const expensesRoutes = require('./routes/expenses');
const remindersRoutes = require('./routes/reminders');
const catalogRoutes = require('./routes/catalog');
const documentsRoutes = require('./routes/documents');
const adminRoutes = require('./routes/admin');
const fuelReviewsRoutes = require('./routes/fuelReviews');
const ensureAdminSchema = require('./database/ensureAdminSchema');

const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cars', carsRoutes);
app.use('/api/service', serviceRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/fuel-reviews', fuelReviewsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

const startServer = async () => {
  try {
    await ensureAdminSchema();
    app.listen(PORT, () => {
      console.log(`Сервер запущен на порту ${PORT}`);
    });
  } catch (error) {
    console.error('Ошибка инициализации схемы:', error.message || error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
