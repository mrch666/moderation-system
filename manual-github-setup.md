# 📋 Ручная настройка репозитория на GitHub

## Шаг 1: Создайте репозиторий на GitHub

1. **Зайдите на GitHub**: https://github.com
2. **Нажмите "+"** в правом верхнем углу → **"New repository"**
3. **Заполните форму**:
   - **Repository name**: `moderation-system` (или другое имя)
   - **Description**: `Система модерации изображений товаров с REST API, веб-интерфейсом и интеграцией с Telegram`
   - **Public** (рекомендуется) или **Private**
   - **НЕ** добавляйте:
     - README.md
     - .gitignore
     - License
4. **Нажмите "Create repository"**

## Шаг 2: Добавьте remote и отправьте код

После создания репозитория, GitHub покажет инструкции. Выполните в терминале:

```bash
# Перейдите в директорию проекта
cd moderation-system

# Добавьте remote (замените YOUR_USERNAME на ваш GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/moderation-system.git

# Отправьте код
git push -u origin main
```

## Шаг 3: Настройте GitHub Actions

1. **В репозитории** перейдите в **Settings** → **Secrets and variables** → **Actions**
2. **Добавьте секреты**:
   - `API_KEY` - Ключ API для продакшена (например: `production_api_key_secure`)
   - `TARGET_SERVER_URL` - URL целевого сервера для загрузки изображений
   - `TELEGRAM_BOT_TOKEN` - Токен Telegram бота (опционально)
   - `TELEGRAM_CHAT_ID` - ID чата для уведомлений (опционально)

3. **Включите GitHub Actions**:
   - Перейдите во вкладку **Actions**
   - Нажмите **"I understand my workflows, go ahead and enable them"**

## Шаг 4: Настройте окружение для разработки

```bash
# Скопируйте пример конфигурации
cp .env.example .env.development

# Отредактируйте конфигурацию
nano .env.development

# Основные настройки:
PORT=3000
API_KEY=test_api_key_123456
TARGET_SERVER_URL=http://img.instrumentstore.ru:7990/api/modelgoods/image/
CORS_ORIGIN=http://localhost:8080
```

## Шаг 5: Запустите систему

```bash
# Установите зависимости backend
cd backend
npm install

# Сгенерируйте конфигурацию frontend
cd ..
node generate-config-simple.js

# Запустите систему
./start_all.sh
```

## Шаг 6: Проверьте работу

Откройте в браузере:
- **Веб-интерфейс**: http://localhost:8080
- **API Health check**: http://localhost:3000/health
- **API документация**: http://localhost:3000/api-docs

## Дополнительные настройки

### GitHub Pages (для документации)

1. **Создайте ветку gh-pages**:
   ```bash
   git checkout -b gh-pages
   echo "# Документация" > index.md
   git add index.md
   git commit -m "docs: add GitHub Pages"
   git push origin gh-pages
   git checkout main
   ```

2. **Настройте GitHub Pages**:
   - Settings → Pages
   - Source: Deploy from a branch
   - Branch: gh-pages
   - Folder: / (root)

### Защита веток

1. **Settings** → **Branches** → **Add branch protection rule**
2. **Branch name pattern**: `main`
3. **Включите**:
   - Require pull request reviews before merging
   - Require status checks to pass before merging
   - Require conversation resolution before merging
4. **Нажмите "Create"**

### Настройка проекта

1. **Создайте проект**: Projects → New project
2. **Добавьте issues** для отслеживания задач
3. **Настройте labels** для категоризации

## Полезные ссылки

- **Репозиторий**: `https://github.com/YOUR_USERNAME/moderation-system`
- **Actions**: `https://github.com/YOUR_USERNAME/moderation-system/actions`
- **Issues**: `https://github.com/YOUR_USERNAME/moderation-system/issues`
- **Wiki**: `https://github.com/YOUR_USERNAME/moderation-system/wiki`

## Команды для работы

```bash
# Получить обновления
git pull origin main

# Отправить изменения
git add .
git commit -m "feat: add new feature"
git push origin main

# Создать тег версии
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin --tags

# Управление системой
./manage.sh start    # Запуск
./manage.sh stop     # Остановка
./manage.sh logs     # Логи
./manage.sh status   # Статус
./test_simple.sh     # Тестирование
```

## Устранение неполадок

### Ошибка аутентификации
```bash
# Настройте кэширование учетных данных
git config --global credential.helper cache
git config --global credential.helper 'cache --timeout=3600'
```

### Конфликты при push
```bash
# Получите последние изменения
git pull origin main --rebase

# Разрешите конфликты
# ... редактируйте файлы ...

# Продолжите rebase
git rebase --continue

# Отправьте изменения
git push origin main
```

### GitHub Actions не запускаются
1. Проверьте, что файл `.github/workflows/ci-cd.yml` существует
2. Убедитесь, что Actions включены в репозитории
3. Проверьте секреты в Settings → Secrets → Actions

---

**🎉 Система готова к использованию!**