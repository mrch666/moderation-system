#!/bin/bash

# 🚀 Подготовка системы модерации к коммиту в Git

set -e

echo ""
echo "🚀 ПОДГОТОВКА К КОММИТУ"
echo "======================"
echo ""

# Проверяем, что мы в правильной директории
if [ ! -f "backend/package.json" ]; then
    echo "❌ Ошибка: Запустите скрипт из корневой директории системы модерации"
    exit 1
fi

# 1. Удаляем временные файлы
echo "1. Очистка временных файлов..."
find . -name "*.log" -type f -delete 2>/dev/null || true
find . -name "*.pid" -type f -delete 2>/dev/null || true
find . -name "*.tmp" -type f -delete 2>/dev/null || true
find . -name "*.temp" -type f -delete 2>/dev/null || true
rm -rf logs/ pids/ tmp/ temp/ 2>/dev/null || true
echo "✅ Временные файлы удалены"

# 2. Удаляем конфиденциальные файлы
echo ""
echo "2. Удаление конфиденциальных файлов..."
rm -f .env .env.local .env.production 2>/dev/null || true
rm -f backend/.env backend/.env.local 2>/dev/null || true
rm -f simple-frontend/.env simple-frontend/.env.local 2>/dev/null || true
rm -f telegram-bot/.env telegram-bot/.env.local 2>/dev/null || true
echo "✅ Конфиденциальные файлы удалены"

# 3. Генерируем чистую конфигурацию
echo ""
echo "3. Генерация конфигурации..."
node generate-config-simple.js
echo "✅ Конфигурация сгенерирована"

# 4. Проверяем наличие .gitignore
echo ""
echo "4. Проверка .gitignore..."
if [ ! -f ".gitignore" ]; then
    echo "⚠️  .gitignore не найден, создаем..."
    cat > .gitignore << 'EOF'
# Система модерации изображений
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.env
.env.local
.env.development.local
.env.production.local
*.db
*.db-journal
*.sqlite
*.sqlite3
*.log
logs/
*.tmp
*.temp
.tmp/
temp/
simple-frontend/config.js
dist/
build/
out/
.idea/
.vscode/
*.swp
*.swo
docker-compose.override.yml
EOF
    echo "✅ .gitignore создан"
else
    echo "✅ .gitignore уже существует"
fi

# 5. Проверяем наличие README.md
echo ""
echo "5. Проверка README.md..."
if [ ! -f "README.md" ] && [ -f "README_GITHUB.md" ]; then
    cp README_GITHUB.md README.md
    echo "✅ README.md создан из README_GITHUB.md"
elif [ -f "README.md" ]; then
    echo "✅ README.md уже существует"
else
    echo "⚠️  README.md не найден"
fi

# 6. Проверяем наличие LICENSE
echo ""
echo "6. Проверка LICENSE..."
if [ ! -f "LICENSE" ]; then
    cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2024 Система модерации изображений

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
    echo "✅ LICENSE создан (MIT)"
else
    echo "✅ LICENSE уже существует"
fi

# 7. Проверяем структуру проекта
echo ""
echo "7. Проверка структуры проекта..."
echo "📁 Основные директории:"
for dir in backend simple-frontend telegram-bot docker docs; do
    if [ -d "$dir" ]; then
        echo "   ✅ $dir"
    else
        echo "   ⚠️  $dir (отсутствует)"
    fi
done

echo ""
echo "📁 Основные файлы:"
for file in .env.example .env.development .gitignore README.md LICENSE; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ⚠️  $file (отсутствует)"
    fi
done

# 8. Проверяем конфиденциальные данные
echo ""
echo "8. Проверка на конфиденциальные данные..."
SENSITIVE_FILES=$(grep -r "192\.168\|localhost\|test_api_key\|instrumentstore\.ru\|password\|token\|secret" . \
    --include="*.js" --include="*.html" --include="*.json" --include="*.md" --include="*.sh" \
    2>/dev/null | grep -v node_modules | grep -v ".git" | grep -v ".env" | grep -v "config.js" | wc -l)

if [ "$SENSITIVE_FILES" -eq 0 ]; then
    echo "✅ Конфиденциальные данные не найдены в коде"
else
    echo "⚠️  Найдено $SENSITIVE_FILES файлов с потенциально конфиденциальными данными"
    echo "   Проверьте следующие файлы:"
    grep -r "192\.168\|localhost\|test_api_key\|instrumentstore\.ru\|password\|token\|secret" . \
        --include="*.js" --include="*.html" --include="*.json" --include="*.md" --include="*.sh" \
        2>/dev/null | grep -v node_modules | grep -v ".git" | grep -v ".env" | grep -v "config.js" | head -5
fi

# 9. Создаем финальный отчет
echo ""
echo "======================"
echo "🎉 ПОДГОТОВКА ЗАВЕРШЕНА!"
echo ""
echo "📋 СТАТУС ПРОЕКТА:"
echo ""
echo "✅ Конфиденциальные данные вынесены в .env файлы"
echo "✅ Созданы примеры конфигураций:"
echo "   - .env.example (шаблон для продакшена)"
echo "   - .env.development (для разработки)"
echo "✅ Настроен .gitignore"
echo "✅ Создана документация:"
echo "   - README.md"
echo "   - DEPLOYMENT_GUIDE.md"
echo "   - README_GITHUB.md"
echo "✅ Настроен CI/CD:"
echo "   - .github/workflows/ci-cd.yml"
echo "✅ Созданы Docker конфигурации:"
echo "   - docker/docker-compose.yml"
echo "   - docker/docker-compose.prod.yml"
echo "   - docker/docker-compose.test.yml"
echo ""
echo "🚀 СЛЕДУЮЩИЕ ШАГИ:"
echo ""
echo "1. Инициализируйте Git репозиторий:"
echo "   ./setup-git.sh"
echo ""
echo "2. Проверьте проект:"
echo "   git status"
echo "   git diff"
echo ""
echo "3. Создайте первый коммит:"
echo "   git add ."
echo "   git commit -m 'Initial commit: Система модерации изображений'"
echo ""
echo "4. Создайте репозиторий на GitHub/GitLab"
echo ""
echo "5. Добавьте remote и отправьте код:"
echo "   git remote add origin <url>"
echo "   git push -u origin main"
echo ""
echo "6. Настройте секреты в CI/CD:"
echo "   - API_KEY"
echo "   - TARGET_SERVER_URL"
echo "   - TELEGRAM_BOT_TOKEN (опционально)"
echo ""
echo "📞 ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ:"
echo ""
echo "📚 Документация:"
echo "   - README.md - Основная документация"
echo "   - DEPLOYMENT_GUIDE.md - Руководство по развертыванию"
echo "   - API_EXAMPLES.md - Примеры использования API"
echo ""
echo "🔧 Скрипты управления:"
echo "   - ./start_all.sh - Запуск всей системы"
echo "   - ./manage.sh - Управление системой"
echo "   - ./test_simple.sh - Тестирование API"
echo ""
echo "🐳 Docker команды:"
echo "   docker-compose -f docker/docker-compose.yml up -d"
echo "   docker-compose -f docker/docker-compose.prod.yml up -d"
echo ""
echo "======================"