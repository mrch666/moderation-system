#!/bin/bash

echo "🚀 ЗАПУСК BACKEND СИСТЕМЫ МОДЕРАЦИИ"
echo "=================================="

# Полный путь к backend
BACKEND_DIR="/home/mrch/.openclaw/workspace/moderation-system/backend"

# Переходим в директорию backend
cd "$BACKEND_DIR" || {
    echo "❌ Ошибка: Не могу перейти в директорию $BACKEND_DIR"
    exit 1
}

echo "📁 Директория: $BACKEND_DIR"
echo "🔧 Запускаю backend API..."

# Останавливаем старый процесс если есть
pkill -f "node.*simple-index" 2>/dev/null && echo "⚠️  Остановлен старый процесс"

# Запускаем backend
nohup node simple-index.js > backend.log 2>&1 &
BACKEND_PID=$!

echo "✅ Backend запущен (PID: $BACKEND_PID)"
echo "⏳ Жду 5 секунд для запуска..."
sleep 5

# Проверяем что backend работает
if curl -s "http://localhost:3000/health" >/dev/null 2>&1; then
    echo "🎉 Backend успешно запущен!"
    echo ""
    echo "📊 ИНФОРМАЦИЯ:"
    echo "   URL: http://localhost:3000"
    echo "   API: http://localhost:3000/api"
    echo "   API ключ: test_api_key_123456"
    echo "   PID: $BACKEND_PID"
    echo "   Логи: $BACKEND_DIR/backend.log"
    echo ""
    echo "🌐 Внешний доступ: http://192.168.1.189:3000"
else
    echo "❌ Backend не запустился. Проверьте логи:"
    echo "   tail -f $BACKEND_DIR/backend.log"
    exit 1
fi