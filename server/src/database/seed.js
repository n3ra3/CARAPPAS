require('dotenv').config();
const db = require('../config/database');

const seed = async () => {
  try {
    console.log('Заполнение справочников...');

    // Марки автомобилей
    const brands = [
      'Audi', 'BMW', 'Chevrolet', 'Ford', 'Honda', 'Hyundai', 'Kia', 
      'Lada', 'Mazda', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 
      'Opel', 'Peugeot', 'Renault', 'Skoda', 'Toyota', 'Volkswagen', 'Volvo'
    ];

    for (const brand of brands) {
      await db.query(
        'INSERT INTO car_brands (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [brand]
      );
    }
    console.log('✓ Марки автомобилей добавлены');

    // Модели для популярных марок
    const models = {
      'Lada': ['Vesta', 'Granta', 'Niva', 'Largus', 'XRAY'],
      'Toyota': ['Camry', 'Corolla', 'RAV4', 'Land Cruiser', 'Highlander'],
      'Volkswagen': ['Polo', 'Golf', 'Tiguan', 'Passat', 'Jetta'],
      'Hyundai': ['Solaris', 'Creta', 'Tucson', 'Santa Fe', 'Elantra'],
      'Kia': ['Rio', 'Ceed', 'Sportage', 'Sorento', 'Optima'],
      'BMW': ['3 Series', '5 Series', 'X3', 'X5', 'X7'],
      'Mercedes-Benz': ['C-Class', 'E-Class', 'GLC', 'GLE', 'S-Class'],
      'Skoda': ['Octavia', 'Rapid', 'Kodiaq', 'Karoq', 'Superb'],
      'Renault': ['Logan', 'Duster', 'Kaptur', 'Arkana', 'Sandero'],
      'Nissan': ['Qashqai', 'X-Trail', 'Almera', 'Juke', 'Terrano']
    };

    for (const [brandName, modelList] of Object.entries(models)) {
      const brandResult = await db.query(
        'SELECT id FROM car_brands WHERE name = $1', [brandName]
      );
      if (brandResult.rows.length > 0) {
        const brandId = brandResult.rows[0].id;
        for (const modelName of modelList) {
          await db.query(
            'INSERT INTO car_models (brand_id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [brandId, modelName]
          );
        }
      }
    }
    console.log('✓ Модели автомобилей добавлены');

    // Типы сервисных работ
    const serviceTypes = [
      { name: 'Плановое ТО', description: 'Плановое техническое обслуживание' },
      { name: 'Ремонт', description: 'Ремонтные работы' },
      { name: 'Замена расходников', description: 'Замена расходных материалов' },
      { name: 'Шиномонтаж', description: 'Работы с шинами и дисками' },
      { name: 'Диагностика', description: 'Компьютерная диагностика' },
      { name: 'Кузовные работы', description: 'Кузовной ремонт и покраска' },
      { name: 'Прочее', description: 'Прочие работы' }
    ];

    for (const type of serviceTypes) {
      await db.query(
        'INSERT INTO service_types (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [type.name, type.description]
      );
    }
    console.log('✓ Типы сервисных работ добавлены');

    // Категории расходов
    const expenseCategories = [
      { name: 'Топливо', icon: 'fuel' },
      { name: 'Сервис', icon: 'wrench' },
      { name: 'Запчасти', icon: 'cog' },
      { name: 'Страховка', icon: 'shield' },
      { name: 'Налог', icon: 'file-text' },
      { name: 'Штрафы', icon: 'alert-triangle' },
      { name: 'Парковка', icon: 'map-pin' },
      { name: 'Мойка', icon: 'droplet' },
      { name: 'Прочее', icon: 'more-horizontal' }
    ];

    for (const category of expenseCategories) {
      await db.query(
        'INSERT INTO expense_categories (name, icon) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [category.name, category.icon]
      );
    }
    console.log('✓ Категории расходов добавлены');

    console.log('\n✓ Заполнение справочников завершено!');
    process.exit(0);
  } catch (error) {
    console.error('Ошибка заполнения:', error);
    process.exit(1);
  }
};

seed();
