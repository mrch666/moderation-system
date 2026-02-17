# Инструкция по развертыванию системы модерации

## Требования
- Docker и Docker Compose
- Node.js 18+ (для локальной разработки)
- PostgreSQL 15+ (если не используете Docker)
- Redis 7+ (если не используете Docker)

## Быстрый старт с Docker

### 1. Клонирование и настройка
```bash
# Клонируйте проект
git clone <repository-url>
cd moderation-system

# Создайте файл окружения
cp backend/.env.example backend/.env
cp telegram-bot/.env.example telegram-bot/.env

# Отредактируйте файлы .env с вашими настройками
```

### 2. Настройка переменных окружения

**backend/.env:**
```env
DB_HOST=postgres
DB_PORT=5432
DB_NAME=moderation_system
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your_strong_jwt_secret_key
PORT=3000
NODE_ENV=production
```

**telegram-bot/.env:**
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
API_BASE_URL=http://backend:3000/api
API_KEY=your_api_key_for_bot
BOT_ADMIN_CHAT_ID=your_telegram_chat_id
```

### 3. Запуск системы
```bash
cd docker
docker-compose up -d
```

### 4. Проверка работы
```bash
# Проверка статуса контейнеров
docker-compose ps

# Просмотр логов
docker-compose logs -f backend
```

### 5. Доступ к приложениям
- **Frontend:** http://localhost:80
- **Backend API:** http://localhost:3000
- **API Documentation:** http://localhost:3000/api-docs (после настройки)
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379

## Ручная установка (без Docker)

### 1. Установка зависимостей
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# Telegram бот
cd ../telegram-bot
npm install
```

### 2. Настройка базы данных
```sql
-- Создайте базу данных
CREATE DATABASE moderation_system;

-- Выполните миграции
psql -U postgres -d moderation_system -f backend/migrations/001_initial_schema.sql
```

### 3. Запуск сервисов
```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend
cd frontend
npm start

# Terminal 3: Telegram бот
cd telegram-bot
npm start
```

## Настройка Telegram бота

### 1. Создание бота
1. Откройте Telegram и найдите @BotFather
2. Создайте нового бота: `/newbot`
3. Сохраните полученный токен в `telegram-bot/.env`
4. Настройте команды бота:
```
/start - Запуск бота
/queue - Очередь модерации
/stats - Статистика
/settings - Настройки (админы)
/users - Пользователи (админы)
```

### 2. Получение Chat ID
1. Напишите боту: `/start`
2. Перейдите по ссылке: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. Найдите `chat.id` в ответе
4. Добавьте его в `BOT_ADMIN_CHAT_ID`

## Создание первого API ключа

### Через API:
```bash
curl -X POST http://localhost:3000/api/settings/api-keys \
  -H "X-API-Key: ваш_временный_ключ" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Основной ключ",
    "permissions": ["read", "submit", "moderate"]
  }'
```

### Через базу данных:
```sql
INSERT INTO api_keys (key, name, permissions) VALUES (
  'ваш_api_ключ',
  'Основной ключ',
  '["read", "submit", "moderate"]'
);
```

## Использование API

### Отправка на модерацию:
```bash
curl -X POST http://localhost:3000/api/moderation/submit \
  -H "X-API-Key: ваш_api_ключ" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/image.jpg",
    "product_id": "PROD-123",
    "download_url": "https://example.com/download/image.jpg"
  }'
```

### Проверка статуса:
```bash
curl http://localhost:3000/api/moderation/status/<moderation_uuid>
```

### Получение очереди:
```bash
curl -H "X-API-Key: ваш_api_ключ" \
  http://localhost:3000/api/moderation/queue?limit=10
```

## Настройка фронтенда

### 1. Настройка API URL
Отредактируйте `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:3000/api
```

### 2. Аутентификация
1. Откройте фронтенд
2. В консоли браузера выполните:
```javascript
localStorage.setItem('api_key', 'ваш_api_ключ');
location.reload();
```

## Мониторинг и логи

### Просмотр логов Docker:
```bash
# Все логи
docker-compose logs

# Логи конкретного сервиса
docker-compose logs backend
docker-compose logs frontend
docker-compose logs telegram-bot

# Логи в реальном времени
docker-compose logs -f backend
```

### Логи приложения:
- Backend: `backend/logs/`
- Telegram бот: `telegram-bot/logs/`
- Docker: `docker logs <container_name>`

## Резервное копирование

### База данных:
```bash
# Экспорт
docker exec moderation-postgres pg_dump -U postgres moderation_system > backup.sql

# Импорт
cat backup.sql | docker exec -i moderation-postgres psql -U postgres moderation_system
```

### Redis:
```bash
# Сохранение
docker exec moderation-redis redis-cli SAVE

# Копирование файла дампа
docker cp moderation-redis:/data/dump.rdb ./redis-backup.rdb
```

## Обновление системы

### С Docker:
```bash
cd docker
docker-compose pull
docker-compose down
docker-compose up -d
```

### Без Docker:
```bash
# Backend
cd backend
git pull
npm install
npm run migrate
npm start

# Frontend
cd ../frontend
git pull
npm install
npm run build
# Запустите веб-сервер

# Telegram бот
cd ../telegram-bot
git pull
npm install
npm start
```

## Устранение неполадок

### 1. Проблемы с базой данных
```bash
# Проверка подключения
docker exec moderation-postgres pg_isready -U postgres

# Перезапуск миграций
docker exec moderation-backend node scripts/migrate.js
```

### 2. Проблемы с Redis
```bash
# Проверка подключения
docker exec moderation-redis redis-cli ping

# Очистка кэша
docker exec moderation-redis redis-cli FLUSHALL
```

### 3. Проблемы с API
```bash
# Проверка здоровья
curl http://localhost:3000/health

# Проверка логов
docker-compose logs backend --tail=50
```

### 4. Проблемы с фронтендом
- Очистите кэш браузера
- Проверьте консоль браузера на ошибки
- Убедитесь, что API доступен

## Безопасность

### Обязательные действия:
1. Измените все пароли по умолчанию
2. Настройте HTTPS для production
3. Ограничьте доступ к административным интерфейсам
4. Регулярно обновляйте зависимости
5. Настройте брандмауэр

### Рекомендуемые настройки:
- Используйте сложные JWT секреты
- Ограничьте частоту запросов к API
- Включите логирование всех действий
- Регулярно делайте резервные копии

## Масштабирование

### Для высоких нагрузок:
1. Добавьте балансировщик нагрузки перед backend
2. Настройте репликацию PostgreSQL
3. Используйте Redis кластер
4. Добавьте кэширование на уровне приложения
5. Настройте мониторинг и алертинг

## Поддержка
При возникновении проблем:
1. Проверьте логи
2. Убедитесь, что все сервисы запущены
3. Проверьте настройки окружения
4. Обратитесь к документации API

## Дальнейшие шаги
1. Настройте SSL/TLS сертификаты
2. Настройте мониторинг (Prometheus, Grafana)
3. Добавьте систему алертинга
4. Настройте CI/CD пайплайн
5. Добавьте тестирование