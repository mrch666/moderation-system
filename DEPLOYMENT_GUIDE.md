# 🚀 Руководство по развертыванию системы модерации

## 📋 Содержание

1. [Локальная разработка](#локальная-разработка)
2. [Docker развертывание](#docker-развертывание)
3. [Продакшн развертывание](#продакшн-развертывание)
4. [CI/CD настройка](#cicd-настройка)
5. [Мониторинг и обслуживание](#мониторинг-и-обслуживание)

## 🖥️ Локальная разработка

### Требования

- Node.js 18+
- npm 8+
- SQLite3 (встроен в Node.js)
- Git

### Установка

```bash
# 1. Клонирование репозитория
git clone https://github.com/yourusername/moderation-system.git
cd moderation-system

# 2. Настройка окружения
cp .env.example .env.development
# Отредактируйте .env.development под свои нужды

# 3. Установка зависимостей
cd backend
npm install

# 4. Генерация конфигурации frontend
cd ..
node generate-config-simple.js

# 5. Инициализация базы данных
cd backend
node scripts/init-db.js
```

### Запуск

```bash
# Запуск backend (в одном терминале)
cd backend
npm start

# Запуск frontend (в другом терминале)
cd ../simple-frontend
npm start
```

### Тестирование

```bash
# Запуск тестов
cd backend
npm test

# Тестирование API
cd ..
./test_simple.sh

# Проверка здоровья
curl http://localhost:3000/health
```

## 🐳 Docker развертывание

### Требования

- Docker 20.10+
- Docker Compose 2.0+

### Быстрый старт

```bash
# 1. Клонирование репозитория
git clone https://github.com/yourusername/moderation-system.git
cd moderation-system

# 2. Настройка окружения
cp .env.example .env
# Отредактируйте .env под свои нужды

# 3. Запуск системы
docker-compose -f docker/docker-compose.yml up -d

# 4. Проверка
docker-compose -f docker/docker-compose.yml ps
```

### Производственная конфигурация

```bash
# Используйте production конфигурацию
docker-compose -f docker/docker-compose.prod.yml up -d

# С SSL через Nginx
docker-compose -f docker/docker-compose.prod.yml -f docker/docker-compose.ssl.yml up -d
```

### Управление

```bash
# Остановка
docker-compose -f docker/docker-compose.prod.yml down

# Перезапуск
docker-compose -f docker/docker-compose.prod.yml restart

# Просмотр логов
docker-compose -f docker/docker-compose.prod.yml logs -f

# Обновление образов
docker-compose -f docker/docker-compose.prod.yml pull
docker-compose -f docker/docker-compose.prod.yml up -d
```

## 🌐 Продакшн развертывание

### Серверные требования

- Ubuntu 20.04+ / Debian 11+
- 2+ ядра CPU
- 4+ GB RAM
- 20+ GB SSD
- Статический IP адрес
- Доменное имя (рекомендуется)

### Шаг 1: Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Настройка firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### Шаг 2: Развертывание приложения

```bash
# Создание директории
sudo mkdir -p /opt/moderation-system
cd /opt/moderation-system

# Клонирование репозитория
sudo git clone https://github.com/yourusername/moderation-system.git .

# Настройка окружения
sudo cp .env.example .env
sudo nano .env  # Настройте переменные

# Запуск системы
sudo docker-compose -f docker/docker-compose.prod.yml up -d
```

### Шаг 3: Настройка Nginx с SSL (рекомендуется)

```bash
# Установка certbot
sudo apt install certbot python3-certbot-nginx -y

# Получение SSL сертификата
sudo certbot --nginx -d your-domain.com

# Настройка автоматического обновления
sudo certbot renew --dry-run
```

### Шаг 4: Настройка мониторинга

```bash
# Установка и настройка мониторинга
cd /opt/moderation-system
sudo docker-compose -f docker/docker-compose.monitoring.yml up -d
```

## 🔄 CI/CD настройка

### GitHub Actions

1. **Создайте репозиторий** на GitHub
2. **Настройте секреты** в Settings → Secrets and variables → Actions:
   - `API_KEY` - API ключ для продакшена
   - `TARGET_SERVER_URL` - URL целевого сервера
   - `PRODUCTION_SSH_KEY` - SSH ключ для продакшн сервера
   - `PRODUCTION_HOST` - Хост продакшн сервера
   - `PRODUCTION_USER` - Пользователь продакшн сервера
   - `SLACK_WEBHOOK` (опционально) - Webhook для уведомлений

3. **Настройте переменные** в Settings → Secrets and variables → Variables:
   - `DOCKER_REGISTRY` - ghcr.io
   - `IMAGE_NAME` - ваш-username/moderation-system

4. **Включите GitHub Actions** в репозитории

### GitLab CI/CD

1. **Создайте `.gitlab-ci.yml`** в корне репозитория
2. **Настройте переменные** в Settings → CI/CD → Variables
3. **Настройте runner** на вашем сервере

## 📊 Мониторинг и обслуживание

### Health checks

```bash
# Проверка здоровья backend
curl https://your-domain.com/api/health

# Проверка здоровья frontend
curl https://your-domain.com/

# Проверка метрик
curl https://your-domain.com/api/metrics
```

### Логирование

```bash
# Просмотр логов backend
docker logs moderation-backend --tail 100 -f

# Просмотр логов frontend
docker logs moderation-frontend --tail 100 -f

# Просмотр всех логов
docker-compose -f docker/docker-compose.prod.yml logs -f
```

### Резервное копирование

```bash
#!/bin/bash
# backup.sh - скрипт резервного копирования

BACKUP_DIR="/backups/moderation-system"
DATE=$(date +%Y%m%d_%H%M%S)

# Создание директории для бэкапов
mkdir -p $BACKUP_DIR

# Бэкап базы данных
docker exec moderation-postgres pg_dump -U moderation_user moderation_db > $BACKUP_DIR/db_$DATE.sql

# Бэкап загруженных файлов
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /opt/moderation-system/uploads/

# Бэкап логов
tar -czf $BACKUP_DIR/logs_$DATE.tar.gz /opt/moderation-system/logs/

# Удаление старых бэкапов (старше 30 дней)
find $BACKUP_DIR -type f -mtime +30 -delete

echo "✅ Бэкап создан: $BACKUP_DIR"
```

### Обновление

```bash
#!/bin/bash
# update.sh - скрипт обновления

cd /opt/moderation-system

# Получение последних изменений
git pull origin main

# Обновление Docker образов
docker-compose -f docker/docker-compose.prod.yml pull

# Перезапуск системы
docker-compose -f docker/docker-compose.prod.yml up -d --build

# Очистка старых образов
docker system prune -f

echo "✅ Система обновлена"
```

### Мониторинг ресурсов

```bash
# Установка мониторинга
cd /opt/moderation-system
docker-compose -f docker/docker-compose.monitoring.yml up -d

# Доступ к мониторингу
# Grafana: http://your-domain.com:3000 (admin/admin)
# Prometheus: http://your-domain.com:9090
```

## 🔐 Безопасность

### Рекомендации по безопасности

1. **Измените все пароли по умолчанию**
2. **Используйте HTTPS** для всех соединений
3. **Ограничьте доступ** по IP адресам
4. **Регулярно обновляйте** зависимости
5. **Настройте брандмауэр**
6. **Используйте сильные API ключи**
7. **Включите логирование** и мониторинг
8. **Регулярно делайте бэкапы**

### Конфигурация безопасности

```env
# .env файл для продакшена
NODE_ENV=production
API_KEY=strong_random_key_here_change_me
JWT_SECRET=another_strong_random_secret_here
SESSION_SECRET=yet_another_strong_secret_here
CORS_ORIGIN=https://your-domain.com
```

## 🆘 Устранение неполадок

### Распространенные проблемы

#### 1. Backend не запускается

```bash
# Проверка логов
docker logs moderation-backend

# Проверка портов
netstat -tulpn | grep :3000

# Перезапуск
docker-compose -f docker/docker-compose.prod.yml restart backend
```

#### 2. Frontend не подключается к backend

```bash
# Проверка CORS
curl -I https://your-domain.com/api/health

# Проверка сети
docker network ls
docker network inspect moderation-system_moderation-network

# Проверка конфигурации
cat simple-frontend/config.js
```

#### 3. Проблемы с базой данных

```bash
# Проверка подключения к БД
docker exec moderation-postgres psql -U moderation_user -d moderation_db -c "SELECT 1"

# Восстановление из бэкапа
docker exec -i moderation-postgres psql -U moderation_user -d moderation_db < backup.sql
```

#### 4. Проблемы с загрузкой файлов

```bash
# Проверка прав доступа
ls -la /opt/moderation-system/uploads/

# Проверка дискового пространства
df -h

# Проверка конфигурации целевого сервера
echo $TARGET_SERVER_URL
```

## 📞 Поддержка

### Полезные команды

```bash
# Статус системы
./manage.sh status

# Логи в реальном времени
./manage.sh logs -f

# Тестирование API
./test_simple.sh

# Генерация конфигурации
node generate-config-simple.js
```

### Контакты

- **Issues**: [GitHub Issues](https://github.com/yourusername/moderation-system/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/moderation-system/discussions)
- **Документация**: [README.md](README.md)

---

**Удачного развертывания! 🚀**