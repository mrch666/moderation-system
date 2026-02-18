#!/bin/bash

# 🚀 Создание репозитория на GitHub и отправка кода

set -e

echo ""
echo "🚀 СОЗДАНИЕ РЕПОЗИТОРИЯ НА GITHUB"
echo "================================"
echo ""

# Проверяем, что мы в Git репозитории
if [ ! -d ".git" ]; then
    echo "❌ Ошибка: Не Git репозиторий"
    exit 1
fi

echo "📋 ПРЕДВАРИТЕЛЬНЫЕ ТРЕБОВАНИЯ:"
echo ""
echo "1. У вас должен быть аккаунт на GitHub"
echo "2. Нужен Personal Access Token (PAT) с правами:"
echo "   - repo (полный доступ к репозиториям)"
echo "   - workflow (для GitHub Actions)"
echo ""
echo "Как получить PAT:"
echo "1. Зайдите на GitHub → Settings → Developer settings"
echo "2. Выберите Personal access tokens → Tokens (classic)"
echo "3. Нажмите Generate new token"
echo "4. Выберите срок действия и права"
echo "5. Скопируйте токен (он покажется только один раз!)"
echo ""

# Запрашиваем данные
read -p "👤 Имя пользователя GitHub: " GITHUB_USERNAME
read -p "🔑 Personal Access Token: " GITHUB_TOKEN
read -p "📁 Имя репозитория (например: moderation-system): " REPO_NAME
read -p "📝 Описание репозитория: " REPO_DESCRIPTION

# Устанавливаем значения по умолчанию
REPO_NAME=${REPO_NAME:-moderation-system}
REPO_DESCRIPTION=${REPO_DESCRIPTION:-"Система модерации изображений товаров с REST API, веб-интерфейсом и интеграцией с Telegram"}

echo ""
echo "📋 КОНФИГУРАЦИЯ:"
echo "   Пользователь: $GITHUB_USERNAME"
echo "   Репозиторий: $REPO_NAME"
echo "   Описание: $REPO_DESCRIPTION"
echo ""

# Подтверждение
read -p "Продолжить? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Отменено"
    exit 0
fi

echo "1. Создание репозитория на GitHub..."
# Создаем репозиторий через GitHub API
curl_response=$(curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d "{
    \"name\": \"$REPO_NAME\",
    \"description\": \"$REPO_DESCRIPTION\",
    \"private\": false,
    \"has_issues\": true,
    \"has_projects\": true,
    \"has_wiki\": true,
    \"auto_init\": false
  }")

# Проверяем ответ
if echo "$curl_response" | grep -q "Bad credentials"; then
    echo "❌ Ошибка: Неверный токен или имя пользователя"
    exit 1
elif echo "$curl_response" | grep -q "name already exists"; then
    echo "⚠️  Репозиторий уже существует, продолжаем..."
elif echo "$curl_response" | grep -q '"id"'; then
    echo "✅ Репозиторий создан на GitHub"
else
    echo "⚠️  Не удалось создать репозиторий через API, продолжаем вручную..."
    echo "   Создайте репозиторий вручную: https://github.com/new"
    echo "   Имя: $REPO_NAME"
    echo "   Описание: $REPO_DESCRIPTION"
    echo "   Public repository"
    echo "   Не добавляйте README, .gitignore или license"
    echo ""
    read -p "Нажмите Enter после создания репозитория..." -r
fi

# Добавляем remote
echo ""
echo "2. Настройка remote..."
GITHUB_URL="https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
git remote add origin "$GITHUB_URL"
echo "✅ Remote добавлен: $GITHUB_URL"

# Отправляем код
echo ""
echo "3. Отправка кода на GitHub..."
git push -u origin main
echo "✅ Код отправлен на GitHub"

# Создаем тег версии
echo ""
echo "4. Создание тега версии..."
read -p "Версия (например: v1.0.0, нажмите Enter чтобы пропустить): " VERSION

if [ -n "$VERSION" ]; then
    git tag -a "$VERSION" -m "Release $VERSION: $REPO_DESCRIPTION"
    git push origin --tags
    echo "✅ Тег создан и отправлен: $VERSION"
fi

# Настройка GitHub Pages (опционально)
echo ""
read -p "Включить GitHub Pages для документации? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "5. Настройка GitHub Pages..."
    # Создаем ветку gh-pages
    git checkout -b gh-pages
    echo "# Документация $REPO_NAME" > index.md
    echo "" >> index.md
    echo "Добро пожаловать в документацию системы модерации изображений." >> index.md
    echo "" >> index.md
    echo "[Документация](README.md)" >> index.md
    git add index.md
    git commit -m "docs: add GitHub Pages documentation"
    git push origin gh-pages
    git checkout main
    
    echo "✅ Ветка gh-pages создана"
    echo "   Настройте GitHub Pages в Settings → Pages"
    echo "   Source: Deploy from a branch"
    echo "   Branch: gh-pages"
    echo "   Folder: / (root)"
fi

echo ""
echo "================================"
echo "🎉 РЕПОЗИТОРИЙ СОЗДАН И КОД ОТПРАВЛЕН!"
echo ""
echo "🌐 ССЫЛКИ:"
echo "   Репозиторий: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo "   Код: https://github.com/$GITHUB_USERNAME/$REPO_NAME/tree/main"
echo "   Issues: https://github.com/$GITHUB_USERNAME/$REPO_NAME/issues"
echo ""
echo "🚀 СЛЕДУЮЩИЕ ШАГИ:"
echo ""
echo "1. Настройте секреты в GitHub Actions:"
echo "   Settings → Secrets and variables → Actions"
echo "   Добавьте:"
echo "   - API_KEY: Ключ API для продакшена"
echo "   - TARGET_SERVER_URL: URL целевого сервера"
echo "   - TELEGRAM_BOT_TOKEN: Токен Telegram бота (опционально)"
echo ""
echo "2. Включите GitHub Actions:"
echo "   Перейдите в Actions и включите workflows"
echo ""
echo "3. Настройте окружение:"
echo "   Скопируйте .env.example в .env.development"
echo "   Настройте переменные окружения"
echo ""
echo "4. Запустите систему:"
echo "   ./start_all.sh"
echo ""
echo "📚 ДОКУМЕНТАЦИЯ:"
echo "   - README.md - Основная документация"
echo "   - DEPLOYMENT_GUIDE.md - Руководство по развертыванию"
echo "   - QUICK_START.md - Быстрый старт"
echo ""
echo "🔧 КОМАНДЫ ДЛЯ РАБОТЫ:"
echo "   git pull origin main          # Получить обновления"
echo "   git push origin main          # Отправить изменения"
echo "   ./manage.sh start             # Запустить систему"
echo "   ./manage.sh logs              # Просмотр логов"
echo "   ./test_simple.sh              # Тестирование API"
echo ""
echo "================================"