#!/bin/bash

# 🚀 Отправка кода в существующий GitHub репозиторий

set -e

echo ""
echo "🚀 ОТПРАВКА КОДА НА GITHUB"
echo "========================"
echo ""

# Проверяем Git
if [ ! -d ".git" ]; then
    echo "❌ Ошибка: Не Git репозиторий"
    echo "   Запустите сначала: git init"
    exit 1
fi

# Проверяем коммиты
if ! git log --oneline -1 &>/dev/null; then
    echo "❌ Ошибка: Нет коммитов"
    echo "   Создайте коммит: git add . && git commit -m 'Initial commit'"
    exit 1
fi

echo "📋 ТЕКУЩИЙ СТАТУС:"
echo "   Ветка: $(git branch --show-current)"
echo "   Последний коммит: $(git log -1 --pretty=format:'%h - %s')"
echo ""

# Проверяем remote
if git remote -v | grep -q "origin"; then
    CURRENT_REMOTE=$(git remote get-url origin)
    echo "✅ Remote 'origin' настроен:"
    echo "   $CURRENT_REMOTE"
    echo ""
    
    read -p "Использовать текущий remote? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        git remote remove origin
        echo "✅ Remote 'origin' удален"
        SET_NEW_REMOTE=true
    else
        SET_NEW_REMOTE=false
    fi
else
    SET_NEW_REMOTE=true
fi

# Настройка нового remote
if [ "$SET_NEW_REMOTE" = true ]; then
    echo ""
    echo "🌐 НАСТРОЙКА REMOTE РЕПОЗИТОРИЯ:"
    echo ""
    echo "1. Создайте репозиторий на GitHub:"
    echo "   https://github.com/new"
    echo ""
    echo "2. Настройки репозитория:"
    echo "   - Имя: moderation-system (или другое)"
    echo "   - Public repository"
    echo "   - НЕ добавляйте README, .gitignore, license"
    echo ""
    echo "3. После создания скопируйте URL репозитория"
    echo "   Формат: https://github.com/ВАШ_USERNAME/ИМЯ_РЕПОЗИТОРИЯ.git"
    echo ""
    
    read -p "Введите URL GitHub репозитория: " REPO_URL
    
    if [ -z "$REPO_URL" ]; then
        echo "❌ Ошибка: URL обязателен"
        exit 1
    fi
    
    # Добавляем remote
    git remote add origin "$REPO_URL"
    echo "✅ Remote добавлен: $REPO_URL"
fi

# Отправка кода
echo ""
echo "📤 ОТПРАВКА КОДА НА GITHUB..."
echo ""

CURRENT_BRANCH=$(git branch --show-current)

echo "1. Отправка ветки $CURRENT_BRANCH..."
if git push -u origin "$CURRENT_BRANCH"; then
    echo "✅ Код успешно отправлен"
else
    echo "❌ Ошибка при отправке"
    echo ""
    echo "Возможные причины:"
    echo "1. Нет доступа к репозиторию"
    echo "2. Репозиторий не существует"
    echo "3. Проблемы с аутентификацией"
    echo ""
    echo "Решение:"
    echo "1. Проверьте URL репозитория"
    echo "2. Убедитесь, что у вас есть права на запись"
    echo "3. Настройте аутентификацию:"
    echo "   git config --global credential.helper cache"
    exit 1
fi

# Создание тега
echo ""
read -p "Создать тег версии? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Версия (например: v1.0.0): " VERSION
    
    if [ -n "$VERSION" ]; then
        echo "2. Создание тега $VERSION..."
        git tag -a "$VERSION" -m "Release $VERSION: Система модерации изображений"
        git push origin --tags
        echo "✅ Тег создан и отправлен"
    fi
fi

# Создание ветки develop
echo ""
read -p "Создать ветку develop для разработки? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "3. Создание ветки develop..."
    git checkout -b develop
    git push -u origin develop
    git checkout main
    echo "✅ Ветка develop создана и отправлена"
fi

echo ""
echo "================================"
echo "🎉 КОД УСПЕШНО ОТПРАВЛЕН НА GITHUB!"
echo ""
echo "🌐 ССЫЛКИ:"
REPO_URL=$(git remote get-url origin)
REPO_PATH=$(echo "$REPO_URL" | sed 's|https://github.com/||' | sed 's|\.git$||')
echo "   Репозиторий: https://github.com/$REPO_PATH"
echo "   Код: https://github.com/$REPO_PATH/tree/$CURRENT_BRANCH"
echo "   Actions: https://github.com/$REPO_PATH/actions"
echo ""
echo "🚀 СЛЕДУЮЩИЕ ШАГИ:"
echo ""
echo "1. Настройте GitHub Actions секреты:"
echo "   Settings → Secrets and variables → Actions"
echo "   Добавьте: API_KEY, TARGET_SERVER_URL"
echo ""
echo "2. Включите GitHub Actions"
echo ""
echo "3. Настройте окружение разработки:"
echo "   cp .env.example .env.development"
echo "   nano .env.development"
echo ""
echo "4. Запустите систему:"
echo "   ./start_all.sh"
echo ""
echo "🔧 КОМАНДЫ ДЛЯ РАБОТЫ:"
echo "   git pull origin main          # Получить обновления"
echo "   git push origin main          # Отправить изменения"
echo "   ./manage.sh start             # Запустить систему"
echo "   ./test_simple.sh              # Протестировать API"
echo ""
echo "📚 ДОКУМЕНТАЦИЯ:"
echo "   README.md - Основная документация"
echo "   DEPLOYMENT_GUIDE.md - Развертывание"
echo "   manual-github-setup.md - Настройка GitHub"
echo ""
echo "================================"