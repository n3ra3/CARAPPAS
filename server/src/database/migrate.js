require('dotenv').config();
const db = require('../config/database');

const migrate = async () => {
  try {
    console.log('Начало миграции базы данных...');

    // Таблица пользователей
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Таблица users создана');

    // Справочник марок автомобилей
    await db.query(`
      CREATE TABLE IF NOT EXISTS car_brands (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
      )
    `);
    console.log('✓ Таблица car_brands создана');

    // Справочник моделей автомобилей
    await db.query(`
      CREATE TABLE IF NOT EXISTS car_models (
        id SERIAL PRIMARY KEY,
        brand_id INTEGER REFERENCES car_brands(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        UNIQUE(brand_id, name)
      )
    `);
    console.log('✓ Таблица car_models создана');

    // Таблица автомобилей пользователя
    await db.query(`
      CREATE TABLE IF NOT EXISTS cars (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        brand_id INTEGER REFERENCES car_brands(id),
        model_id INTEGER REFERENCES car_models(id),
        year INTEGER,
        vin VARCHAR(17),
        license_plate VARCHAR(20),
        mileage INTEGER DEFAULT 0,
        photo_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Таблица cars создана');

    // Типы сервисных работ
    await db.query(`
      CREATE TABLE IF NOT EXISTS service_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT
      )
    `);
    console.log('✓ Таблица service_types создана');

    // Сервисные записи
    await db.query(`
      CREATE TABLE IF NOT EXISTS service_records (
        id SERIAL PRIMARY KEY,
        car_id INTEGER REFERENCES cars(id) ON DELETE CASCADE,
        service_type_id INTEGER REFERENCES service_types(id),
        date DATE NOT NULL,
        mileage INTEGER,
        description TEXT,
        cost DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Таблица service_records создана');

    // Категории расходов
    await db.query(`
      CREATE TABLE IF NOT EXISTS expense_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        icon VARCHAR(50)
      )
    `);
    console.log('✓ Таблица expense_categories создана');

    // Расходы
    await db.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        car_id INTEGER REFERENCES cars(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES expense_categories(id),
        date DATE NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        mileage INTEGER,
        fuel_volume DECIMAL(6, 2),
        fuel_price DECIMAL(6, 2),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Таблица expenses создана');

    // Напоминания
    await db.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id SERIAL PRIMARY KEY,
        car_id INTEGER REFERENCES cars(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('date', 'mileage')),
        due_date DATE,
        due_mileage INTEGER,
        is_completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Таблица reminders создана');

    // Документы пользователя
    await db.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        car_id INTEGER REFERENCES cars(id) ON DELETE SET NULL,
        title VARCHAR(200) NOT NULL,
        doc_type VARCHAR(50) NOT NULL,
        doc_number VARCHAR(100),
        issue_date DATE,
        expiry_date DATE,
        photo_url VARCHAR(500),
        notes TEXT,
        notify_days_before INTEGER DEFAULT 30,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Таблица documents создана');

    console.log('\n✓ Миграция успешно завершена!');
    process.exit(0);
  } catch (error) {
    console.error('Ошибка миграции:', error);
    process.exit(1);
  }
};

migrate();
