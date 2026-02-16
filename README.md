# АвтоПомощник — Цифровая платформа для автолюбителей

Дипломный проект: веб-приложение + мобильное приложение для учёта автомобилей, сервисного обслуживания и расходов.

## Архитектура

```
┌─────────────────┐     ┌─────────────────┐
│  Веб-клиент     │     │ Мобильное       │
│  (React)        │     │ приложение      │
│  localhost:5173 │     │ (React Native)  │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────▼──────┐
              │  REST API   │
              │  (Express)  │
              │  :3000      │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │ PostgreSQL  │
              │  :5432      │
              └─────────────┘
```

## Технологии

- **Backend:** Node.js, Express, PostgreSQL
- **Frontend:** React, Vite, React Router, Recharts
- **Mobile:** React Native, Expo
- **Auth:** JWT (JSON Web Tokens)

## Быстрый старт

### 1. База данных

```bash
# Создать базу данных PostgreSQL
createdb autopomoshnik

# Или через psql
psql -U postgres -c "CREATE DATABASE autopomoshnik;"
```

### 2. Сервер (API)

```bash
cd server

# Скопировать конфигурацию
copy .env.example .env

# Отредактировать .env (указать пароль БД)
```

### 3. Веб-клиент

```bash
cd web

# Установить зависимости
npm install

# Запустить в режиме разработки
npm run dev
```

Приложение будет доступно: http://localhost:5173

### 4. Мобильное приложение (опционально)

```bash
cd mobile

# Установить зависимости
npm install

# Запустить через Expo
npx expo start
```

## Структура проекта

```
diplom/
├── docs/                 # Документация проекта
│   └── README.md         # Описание папки `docs`
├── mobile/               # Мобильное приложение
│   └── README.md         # Описание папки `mobile`
├── server/               # Серверная часть
│   └── README.md         # Описание папки `server`
├── web/                  # Веб-приложение
│   └── README.md         # Описание папки `web`
└── README.md             # Общая информация о проекте
```

## API Endpoints

### Авторизация
- `POST /api/auth/register` — Регистрация
- `POST /api/auth/login` — Вход
- `GET /api/auth/me` — Текущий пользователь

### Автомобили
- `GET /api/cars` — Список авто пользователя
- `POST /api/cars` — Добавить авто
- `PUT /api/cars/:id` — Обновить авто
- `DELETE /api/cars/:id` — Удалить авто

### Сервис
- `GET /api/service/types` — Типы работ
- `GET /api/service/car/:carId` — История обслуживания
- `POST /api/service` — Добавить запись

### Расходы
- `GET /api/expenses/categories` — Категории
- `GET /api/expenses/car/:carId` — Расходы авто
- `GET /api/expenses/car/:carId/stats` — Статистика
- `POST /api/expenses` — Добавить расход

### Напоминания
- `GET /api/reminders` — Все напоминания
- `GET /api/reminders/active` — Активные
- `POST /api/reminders` — Создать
- `PUT /api/reminders/:id/complete` — Выполнить

### Каталог
- `GET /api/catalog/brands` — Марки авто
- `GET /api/catalog/brands/:id/models` — Модели марки

## Функциональность

1. **Гараж** — управление автомобилями
2. **Сервисная книжка** — история ТО и ремонтов
3. **Расходы** — учёт затрат с графиками
4. **Напоминания** — по дате и пробегу
5. **Статистика** — расход топлива, расходы по категориям

## Автор

Дипломный проект студента технического университета, 2026 г.
