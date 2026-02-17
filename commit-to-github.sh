#!/bin/bash

# 🚀 Коммит системы модерации в GitHub

set -e

echo ""
echo "🚀 КОММИТ СИСТЕМЫ МОДЕРАЦИИ В GITHUB"
echo "===================================="
echo ""

# Проверяем, что мы в правильной директории
if [ ! -f "backend/package.json" ]; then
    echo "❌ Ошибка: Запустите скрипт из корневой директории системы модерации"
    exit 1
fi

# Проверяем Git
if ! command -v git &> /dev/null; then
    echo "❌ Ошибка: Git не установлен"
    exit 1
fi

# Проверяем, инициализирован ли Git репозиторий
if [ ! -d ".git" ]; then
    echo "❌ Git репозиторий не инициализирован"
    echo ""
    echo "Запустите сначала:"
    echo "   ./setup-git.sh"
    exit 1
fi

# Проверяем изменения
echo "1. Проверка изменений..."
CHANGES=$(git status --porcelain)
if [ -z "$CHANGES" ]; then
    echo "   ✅ Нет изменений для коммита"
    exit 0
else
    echo "   📋 Изменения обнаружены:"
    git status --short
fi

# Показываем diff для проверки
echo ""
read -p "Показать diff? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git diff --stat
    echo ""
    read -p "Показать полный diff? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git diff
    fi
fi

# Спрашиваем тип коммита
echo ""
echo "2. Выбор типа коммита:"
echo "   feat     - Новая функциональность"
echo "   fix      - Исправление ошибок"
echo "   docs     - Документация"
echo "   style    - Форматирование кода"
echo "   refactor - Рефакторинг кода"
echo "   test     - Тесты"
echo "   chore    - Обслуживание"
echo "   build    - Сборка"
echo "   ci       - CI/CD"
echo ""

read -p "Тип коммита (default: chore): " COMMIT_TYPE
COMMIT_TYPE=${COMMIT_TYPE:-chore}

# Спрашиваем scope
read -p "Scope (опционально, например: backend, frontend, docker): " SCOPE

# Спрашиваем сообщение
echo ""
read -p "Сообщение коммита: " MESSAGE

if [ -z "$MESSAGE" ]; then
    echo "❌ Ошибка: Сообщение коммита обязательно"
    exit 1
fi

# Собираем полное сообщение
FULL_MESSAGE="$COMMIT_TYPE"
if [ -n "$SCOPE" ]; then
    FULL_MESSAGE+="($SCOPE)"
fi
FULL_MESSAGE+=": $MESSAGE"

# Добавляем описание системы
FULL_MESSAGE+="

Система модерации изображений товаров
- Backend API на Node.js/Express
- Веб-интерфейс с пагинацией и предпросмотром
- Интеграция с Telegram
- Автоматическая загрузка на целевой сервер
- Конфигурация через переменные окружения
- Docker поддержка
- CI/CD конфигурация"

# Показываем предпросмотр
echo ""
echo "📋 ПРЕДПРОСМОТР КОММИТА:"
echo "========================"
echo -e "$FULL_MESSAGE"
echo "========================"

# Подтверждение
echo ""
read -p "Создать коммит? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Отменено"
    exit 0
fi

# Создаем коммит
echo "3. Создание коммита..."
git add .
echo -e "$FULL_MESSAGE" | git commit -F -
echo "✅ Коммит создан"

# Показываем информацию о коммите
echo ""
echo "📊 ИНФОРМАЦИЯ О КОММИТЕ:"
git log -1 --pretty=format:"%C(yellow)%h%Creset - %C(green)%s%Creset %C(blue)(%cr)%Creset" --abbrev-commit
echo ""

# Спрашиваем про remote
echo "4. Настройка remote репозитория..."
if git remote -v | grep -q "origin"; then
    echo "   ✅ Remote 'origin' уже настроен"
    CURRENT_REMOTE=$(git remote get-url origin)
    echo "   📍 URL: $CURRENT_REMOTE"
else
    echo "   ❌ Remote 'origin' не настроен"
    read -p "Введите URL GitHub репозитория: " REPO_URL
    if [ -n "$REPO_URL" ]; then
        git remote add origin "$REPO_URL"
        echo "   ✅ Remote добавлен: $REPO_URL"
    else
        echo "   ⚠️  Remote не добавлен"
    fi
fi

# Спрашиваем про push
echo ""
read -p "Отправить в remote репозиторий? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if git remote -v | grep -q "origin"; then
        echo "5. Отправка в remote..."
        CURRENT_BRANCH=$(git branch --show-current)
        git push -u origin "$CURRENT_BRANCH"
        echo "✅ Отправлено в remote"
    else
        echo "❌ Не удалось отправить: remote не настроен"
    fi
fi

# Создаем тег версии
echo ""
read -p "Создать тег версии? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Версия (например: v1.0.0): " VERSION
    if [ -n "$VERSION" ]; then
        git tag -a "$VERSION" -m "Release $VERSION: Система модерации изображений"
        echo "✅ Тег создан: $VERSION"
        
        if git remote -v | grep -q "origin"; then
            read -p "Отправить теги в remote? (y/n): " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                git push origin --tags
                echo "✅ Теги отправлены в remote"
            fi
        fi
    fi
fi

echo ""
echo "===================================="
echo "🎉 СИСТЕМА МОДЕРАЦИИ ЗАКОММИТЕНА!"
echo ""
echo "📋 СВОДКА:"
echo "   Коммит: $(git log -1 --pretty=format:%h)"
echo "   Сообщение: $(git log -1 --pretty=format:%s)"
echo "   Ветка: $(git branch --show-current)"
if git remote -v | grep -q "origin"; then
    echo "   Remote: $(git remote get-url origin)"
fi
echo ""
echo "🚀 СЛЕДУЮЩИЕ ШАГИ:"
echo ""
echo "1. Настройте GitHub Actions секреты:"
echo "   - API_KEY"
echo "   - TARGET_SERVER_URL"
echo "   - TELEGRAM_BOT_TOKEN (опционально)"
echo ""
echo "2. Включите GitHub Actions в репозитории"
echo ""
echo "3. Настройте автоматическое развертывание"
echo ""
echo "4. Добавьте документацию в Wiki"
echo ""
echo "📚 ДОКУМЕНТАЦИЯ:"
echo "   - README.md - Основная документация"
echo "   - DEPLOYMENT_GUIDE.md - Руководство по развертыванию"
echo "   - API_EXAMPLES.md - Примеры API"
echo ""
echo "===================================="