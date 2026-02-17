#!/bin/bash

# 🚀 Настройка Git репозитория для системы модерации

set -e

echo ""
echo "🚀 НАСТРОЙКА GIT РЕПОЗИТОРИЯ"
echo "============================="
echo ""

# Проверяем, что мы в правильной директории
if [ ! -f "package.json" ] && [ ! -f "backend/package.json" ]; then
    echo "❌ Ошибка: Запустите скрипт из корневой директории системы модерации"
    exit 1
fi

# Инициализируем Git репозиторий
if [ ! -d ".git" ]; then
    echo "1. Инициализация Git репозитория..."
    git init
    echo "✅ Репозиторий инициализирован"
else
    echo "1. Git репозиторий уже инициализирован"
fi

# Добавляем .gitignore
echo ""
echo "2. Настройка .gitignore..."
if [ -f ".gitignore" ]; then
    echo "✅ .gitignore уже существует"
else
    echo "❌ .gitignore не найден, создаем..."
    cat > .gitignore << 'EOF'
# Система модерации изображений - .gitignore

# Зависимости
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Конфигурационные файлы
.env
.env.local
.env.development.local
.env.production.local

# Базы данных
*.db
*.db-journal
*.sqlite
*.sqlite3

# Логи
*.log
logs/

# Временные файлы
*.tmp
*.temp
.tmp/
temp/

# Сгенерированные файлы
simple-frontend/config.js
dist/
build/
out/

# Идеи редакторов
.idea/
.vscode/
*.swp
*.swo

# Docker
docker-compose.override.yml
EOF
    echo "✅ .gitignore создан"
fi

# Создаем README.md если не существует
echo ""
echo "3. Настройка README.md..."
if [ -f "README_GITHUB.md" ]; then
    if [ ! -f "README.md" ]; then
        cp README_GITHUB.md README.md
        echo "✅ README.md создан из README_GITHUB.md"
    else
        echo "✅ README.md уже существует"
    fi
else
    echo "⚠️  README_GITHUB.md не найден"
fi

# Создаем LICENSE файл если не существует
echo ""
echo "4. Настройка LICENSE..."
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

# Добавляем все файлы в Git
echo ""
echo "5. Добавление файлов в Git..."
git add .
echo "✅ Файлы добавлены в staging area"

# Создаем первый коммит
echo ""
echo "6. Создание первого коммита..."
if git commit -m "Initial commit: Система модерации изображений

- Backend API на Node.js/Express
- Веб-интерфейс с пагинацией и предпросмотром
- Интеграция с Telegram
- Автоматическая загрузка на целевой сервер
- Конфигурация через переменные окружения
- Docker поддержка
- CI/CD конфигурация" 2>/dev/null; then
    echo "✅ Первый коммит создан"
else
    echo "⚠️  Не удалось создать коммит (возможно, нет изменений)"
fi

# Настройка remote репозитория
echo ""
echo "7. Настройка remote репозитория..."
read -p "Введите URL вашего GitHub репозитория (оставьте пустым чтобы пропустить): " repo_url

if [ -n "$repo_url" ]; then
    git remote add origin "$repo_url"
    echo "✅ Remote репозиторий добавлен: $repo_url"
    
    echo ""
    echo "8. Отправка в remote репозиторий..."
    read -p "Отправить изменения? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push -u origin main || git push -u origin master
        echo "✅ Изменения отправлены в remote репозиторий"
    else
        echo "⚠️  Отправка отменена"
    fi
else
    echo "⚠️  Remote репозиторий не добавлен"
fi

echo ""
echo "============================="
echo "🎉 НАСТРОЙКА ЗАВЕРШЕНА!"
echo ""
echo "Следующие шаги:"
echo "1. Создайте репозиторий на GitHub/GitLab"
echo "2. Добавьте remote: git remote add origin <url>"
echo "3. Отправьте изменения: git push -u origin main"
echo "4. Настройте секреты в GitHub/GitLab:"
echo "   - API_KEY"
echo "   - TARGET_SERVER_URL"
echo "   - TELEGRAM_BOT_TOKEN (опционально)"
echo "5. Включите GitHub Actions"
echo ""
echo "📁 Структура репозитория:"
echo "   .github/workflows/ci-cd.yml - CI/CD конфигурация"
echo "   docker/ - Docker конфигурация"
echo "   backend/ - Backend API"
echo "   simple-frontend/ - Веб-интерфейс"
echo "   telegram-bot/ - Telegram бот"
echo ""
echo "🔧 Команды для работы:"
echo "   ./setup-git.sh - Настройка Git"
echo "   ./start_all.sh - Запуск системы"
echo "   ./manage.sh - Управление системой"
echo "   node generate-config-simple.js - Генерация конфигурации"
echo "============================="