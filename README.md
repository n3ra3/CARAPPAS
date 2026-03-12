# CarApp

Полноценная платформа для владельцев автомобилей: веб-приложение, мобильный клиент и REST API для учета автопарка, расходов, обслуживания, документов и напоминаний.

Проект выполнен как дипломная работа и ориентирован на практическое использование в ежедневной эксплуатации автомобиля.

## Что внутри

- Веб-клиент для полноценной работы с данными на desktop.
- Мобильное приложение для быстрого ввода и контроля в дороге.
- Серверная часть с JWT-авторизацией и централизованной бизнес-логикой.
- PostgreSQL как основной источник данных.

## Ключевые возможности

- Управление автомобилями в личном гараже.
- Ведение сервисной истории (ТО, ремонт, замены).
- Учет расходов и базовая аналитика по категориям.
- Напоминания по дате и пробегу.
- Контроль сроков документов.
- Справочники марок и моделей для удобного ввода.

## Архитектура

```text
Web (React + Vite)            Mobile (React Native + Expo)
        |                                  |
        +--------------- REST API ----------+
                           |
                    Node.js + Express
                           |
                       PostgreSQL
```

## Технологический стек

- Backend: Node.js, Express, PostgreSQL, JWT, bcryptjs
- Web: React, Vite, React Router, Recharts, Leaflet
- Mobile: React Native, Expo, React Navigation
- API Client: Axios (web + mobile)

## Структура репозитория

```text
diplom/
  docs/      Документация и описание системы
  server/    REST API, миграции и seed-скрипты
  web/       Веб-клиент (React + Vite)
  mobile/    Мобильный клиент (React Native + Expo)
```

## Быстрый старт

### 1. Требования

- Node.js 18+
- npm 9+
- PostgreSQL 14+

### 2. Клонирование

```bash
git clone https://github.com/n3ra3/CARAPPAS.git
cd CARAPPAS
```

### 3. База данных

```bash
createdb carapp
```

Или через `psql`:

```bash
psql -U postgres -c "CREATE DATABASE carapp;"
```

### 4. Backend

```bash
cd server
npm install
copy .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

API по умолчанию: `http://localhost:3000`

### 5. Web

```bash
cd web
npm install
npm run dev
```

Web UI по умолчанию: `http://localhost:5173`

### 6. Mobile (опционально)

```bash
cd mobile
npm install
npm run start
```

Для корректной работы mobile-клиента настройте `API_URL` в `mobile/config.js`.

## Основные API-модули

- Auth: `/api/auth/*`
- Cars: `/api/cars/*`
- Service: `/api/service/*`
- Expenses: `/api/expenses/*`
- Reminders: `/api/reminders/*`
- Documents: `/api/documents/*`
- Catalog: `/api/catalog/*`

Подробные примеры и параметры см. в отдельных README модулей и документации в папке `docs`.

## Сценарий разработки

1. Поднять PostgreSQL.
2. Запустить backend.
3. Запустить web или mobile клиент.
4. Тестировать пользовательские сценарии по модулям: garage, service, expenses, reminders, documents.

## Статус проекта

- Тип: учебный/дипломный проект
- Год: 2026
- Язык интерфейса: русский

## Лицензия

Лицензия не указана. При необходимости можно добавить файл `LICENSE` с выбранной моделью распространения.
