# 🖼️ Система модерации изображений товаров

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![License](https://img.shields.io/badge/license-MIT-yellow)

Полнофункциональная система для модерации изображений товаров с REST API, веб-интерфейсом и интеграцией с Telegram.

## ✨ Особенности

- **🚀 REST API** для интеграции с любыми системами
- **🖥️ Веб-интерфейс** с пагинацией и предпросмотром изображений
- **🔍 Детальный просмотр** с увеличением изображений
- **🤖 Telegram бот** для уведомлений
- **📊 Панель администратора** с настройками
- **⚡ Автоматическая загрузка** на целевой сервер
- **🔒 Безопасность** с API ключами и CORS

## 🏗️ Архитектура

```
moderation-system/
├── backend/           # Node.js/Express API сервер
├── simple-frontend/   # Веб-интерфейс (HTML/JS/CSS)
├── telegram-bot/      # Telegram бот для уведомлений
├── frontend/          # React frontend (опционально)
├── docker/            # Docker конфигурация
└── docs/              # Документация
```

## 🚀 Быстрый старт

### 1. Клонирование репозитория

```bash
git clone https://github.com/yourusername/moderation-system.git
cd moderation-system
```

### 2. Настройка окружения

```bash
# Скопируйте пример конфигурации
cp .env.example .env.development

# Отредактируйте конфигурацию
nano .env.development
```

### 3. Установка зависимостей

```bash
# Установите зависимости backend
cd backend
npm install

# Вернитесь в корневую директорию
cd ..
```

### 4. Запуск системы

```bash
# Сгенерируйте конфигурацию frontend
node generate-config-simple.js

# Запустите backend
cd backend
npm start

# В новом терминале запустите frontend
cd ../simple-frontend
npm start
```

### 5. Доступ к системе

- **Веб-интерфейс**: http://localhost:8080
- **API**: http://localhost:3000
- **Документация API**: http://localhost:3000/api-docs

## 🔧 Конфигурация

### Основные переменные окружения

Создайте файл `.env.development`:

```env
# Backend
PORT=3000
NODE_ENV=development
API_KEY=your_secure_api_key_here

# Frontend
FRONTEND_PORT=8080
FRONTEND_HOST=0.0.0.0

# Целевой сервер
TARGET_SERVER_URL=http://example.com/api/upload/

# База данных
DB_TYPE=sqlite
DB_PATH=./moderation.db

# CORS
CORS_ORIGIN=http://localhost:8080
```

### Конфигурация для продакшена

Для продакшена создайте `.env` файл:

```env
NODE_ENV=production
API_KEY=strong_production_api_key
TARGET_SERVER_URL=https://production-server.com/api/upload/
```

## 📡 API Документация

### Основные endpoints

#### Отправка изображения на модерацию

```bash
POST /api/moderation/submit
Content-Type: application/json
X-API-Key: your_api_key

{
  "product_id": "PRD-001",
  "image_url": "https://example.com/image.jpg",
  "download_url": "https://example.com/download/image.jpg",
  "metadata": {
    "name": "Product Name",
    "price": 1000,
    "category": "Category"
  }
}
```

#### Получение очереди модерации

```bash
GET /api/moderation/queue?limit=10&page=1
X-API-Key: your_api_key
```

#### Модерация элемента

```bash
PUT /api/moderation/{id}/moderate
Content-Type: application/json
X-API-Key: your_api_key

{
  "status": "approved",
  "reason": "Изображение соответствует требованиям"
}
```

### Полная документация

Откройте http://localhost:3000/api-docs после запуска backend.

## 🐳 Docker развертывание

### Использование Docker Compose

```bash
# Запуск всей системы
docker-compose -f docker/docker-compose.yml up -d

# Остановка
docker-compose -f docker/docker-compose.yml down

# Просмотр логов
docker-compose -f docker/docker-compose.yml logs -f
```

### Ручная сборка

```bash
# Сборка backend
cd backend
docker build -t moderation-backend .

# Сборка frontend
cd ../simple-frontend
docker build -t moderation-frontend .

# Запуск контейнеров
docker run -d -p 3000:3000 --env-file ../.env moderation-backend
docker run -d -p 8080:8080 moderation-frontend
```

## 🤖 Telegram бот

### Настройка бота

1. Создайте бота через [@BotFather](https://t.me/botfather)
2. Получите токен бота
3. Добавьте токен в `.env.development`:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

### Запуск бота

```bash
cd telegram-bot
npm install
npm start
```

## 📊 Администрирование

### Панель администратора

Доступна по адресу: http://localhost:8080/#settings

Возможности:
- Управление API ключами
- Настройка Telegram чатов
- Конфигурация серверов
- Просмотр статистики

### Управление через скрипты

```bash
# Запуск всей системы
./start_all.sh

# Остановка системы
./manage.sh stop

# Перезапуск
./manage.sh restart

# Просмотр логов
./manage.sh logs

# Тестирование API
./test_simple.sh
```

## 🔒 Безопасность

### Рекомендации для продакшена

1. **Измените API ключ** по умолчанию
2. **Настройте HTTPS** через reverse proxy (Nginx)
3. **Ограничьте CORS** только доверенным доменам
4. **Используйте брандмауэр** для ограничения доступа к портам
5. **Регулярно обновляйте** зависимости
6. **Настройте мониторинг** и логирование

### Миграция с SQLite на PostgreSQL

```env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=moderation_db
DB_USER=moderation_user
DB_PASSWORD=secure_password
```

## 🧪 Тестирование

### Unit тесты

```bash
cd backend
npm test
```

### Интеграционные тесты

```bash
# Запуск тестового сценария
./test_simple.sh

# Тестирование API
curl -H "X-API-Key: test_api_key_123456" \
  http://localhost:3000/api/moderation/queue?limit=1
```

### Нагрузочное тестирование

```bash
# Установите artillery
npm install -g artillery

# Запустите тест
artillery run load-test.yml
```

## 📈 Мониторинг

### Health checks

```bash
# Проверка здоровья backend
curl http://localhost:3000/health

# Проверка здоровья frontend
curl http://localhost:8080
```

### Метрики

Система предоставляет метрики в формате JSON:

```bash
GET /api/stats
X-API-Key: your_api_key
```

## 🤝 Вклад в проект

### Установка для разработки

```bash
# Клонируйте репозиторий
git clone https://github.com/yourusername/moderation-system.git
cd moderation-system

# Установите зависимости
npm run setup:dev

# Запустите в режиме разработки
npm run dev
```

### Структура проекта

```
src/
├── backend/
│   ├── src/
│   │   ├── models/      # Модели данных
│   │   ├── routes/      # Маршруты API
│   │   ├── middleware/  # Промежуточное ПО
│   │   └── utils/       # Утилиты
│   └── tests/           # Тесты
├── frontend/
│   ├── src/
│   │   ├── components/  # React компоненты
│   │   ├── pages/       # Страницы
│   │   └── services/    # Сервисы API
│   └── public/          # Статические файлы
└── shared/              # Общий код
```

### Правила коммитов

Используйте [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Новая функциональность
- `fix:` Исправление ошибок
- `docs:` Изменения в документации
- `style:` Форматирование кода
- `refactor:` Рефакторинг кода
- `test:` Добавление тестов
- `chore:` Обновление зависимостей, настройки

## 📄 Лицензия

Этот проект лицензирован под лицензией MIT - смотрите файл [LICENSE](LICENSE) для деталей.

## 📞 Поддержка

- **Issues**: [GitHub Issues](https://github.com/yourusername/moderation-system/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/moderation-system/discussions)
- **Email**: support@example.com

## 🙏 Благодарности

- [Express.js](https://expressjs.com/) - Веб-фреймворк для Node.js
- [SQLite](https://www.sqlite.org/) - Встроенная база данных
- [Telegram Bot API](https://core.telegram.org/bots/api) - API для Telegram ботов
- [Font Awesome](https://fontawesome.com/) - Иконки

---

**Разработано с ❤️ для эффективной модерации изображений товаров**