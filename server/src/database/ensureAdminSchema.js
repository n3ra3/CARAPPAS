const db = require('../config/database');

const ensureAdminSchema = async () => {
  await db.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user',
    ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_activity (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      activity_date DATE NOT NULL,
      source VARCHAR(30) DEFAULT 'api',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, activity_date)
    )
  `);

  await db.query('CREATE INDEX IF NOT EXISTS idx_user_activity_date ON user_activity(activity_date)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_user_activity_user_date ON user_activity(user_id, activity_date)');

  await db.query(`
    CREATE TABLE IF NOT EXISTS fuel_station_reviews (
      id SERIAL PRIMARY KEY,
      station_osm_id BIGINT NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (station_osm_id, user_id)
    )
  `);
  await db.query('CREATE INDEX IF NOT EXISTS idx_fuel_reviews_station ON fuel_station_reviews(station_osm_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_fuel_reviews_user ON fuel_station_reviews(user_id)');
};

module.exports = ensureAdminSchema;
