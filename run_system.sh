#!/bin/bash

# Скрипт для запуска системы модерации без Docker

set -e

echo "🚀 Запуск системы модерации изображений..."
echo "=========================================="

# Проверка зависимостей
echo "🔍 Проверка зависимостей..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm не установлен"
    exit 1
fi

echo "✅ Node.js и npm установлены"

# Создаем PID файлы
BACKEND_PID="backend.pid"
FRONTEND_PID="frontend.pid"
TELEGRAM_PID="telegram.pid"
SIMPLE_FRONTEND_PID="simple_frontend.pid"

# Функция для очистки
cleanup() {
    echo "🛑 Остановка системы..."
    
    if [ -f "$BACKEND_PID" ]; then
        kill $(cat "$BACKEND_PID") 2>/dev/null || true
        rm -f "$BACKEND_PID"
    fi
    
    if [ -f "$FRONTEND_PID" ]; then
        kill $(cat "$FRONTEND_PID") 2>/dev/null || true
        rm -f "$FRONTEND_PID"
    fi
    
    if [ -f "$TELEGRAM_PID" ]; then
        kill $(cat "$TELEGRAM_PID") 2>/dev/null || true
        rm -f "$TELEGRAM_PID"
    fi
    
    if [ -f "$SIMPLE_FRONTEND_PID" ]; then
        kill $(cat "$SIMPLE_FRONTEND_PID") 2>/dev/null || true
        rm -f "$SIMPLE_FRONTEND_PID"
    fi
    
    echo "✅ Система остановлена"
    exit 0
}

# Ловим сигналы завершения
trap cleanup INT TERM

# Запуск backend
echo "🔄 Запуск backend API..."
cd backend
npm start &
BACKEND_PROCESS=$!
echo $BACKEND_PROCESS > ../$BACKEND_PID
cd ..

echo "⏳ Ожидание запуска backend (10 секунд)..."
sleep 10

# Проверка backend
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Backend запущен на http://localhost:3000"
else
    echo "❌ Backend не запустился"
    cleanup
    exit 1
fi

# Запуск простого фронтенда
echo "🔄 Запуск простого фронтенда..."
cd simple-frontend
node server.js &
SIMPLE_FRONTEND_PROCESS=$!
echo $SIMPLE_FRONTEND_PROCESS > ../$SIMPLE_FRONTEND_PID
cd ..

echo "⏳ Ожидание запуска фронтенда (3 секунды)..."
sleep 3

# Проверка простого фронтенда
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ Простой фронтенд запущен на http://localhost:8080"
else
    echo "⚠️  Простой фронтенд не запустился, продолжаем без него"
    rm -f "$SIMPLE_FRONTEND_PID"
fi

# Запуск Telegram бота (если настроен токен)
echo "🔍 Проверка настроек Telegram бота..."
if grep -q "your_bot_token_here" telegram-bot/.env; then
    echo "⚠️  Telegram бот не настроен. Пропускаем запуск."
    echo "   Для настройки отредактируйте telegram-bot/.env"
else
    echo "🔄 Запуск Telegram бота..."
    cd telegram-bot
    npm start &
    TELEGRAM_PROCESS=$!
    echo $TELEGRAM_PROCESS > ../$TELEGRAM_PID
    cd ..
    echo "✅ Telegram бот запущен"
fi

echo ""
echo "=========================================="
echo "🎉 Система модерации успешно запущена!"
echo ""
echo "🌐 Доступные сервисы:"
echo "   Backend API:    http://localhost:3000"
echo "   API Endpoints:  http://localhost:3000/api"
echo "   Health check:   http://localhost:3000/health"
echo "   Простой фронтенд: http://localhost:8080"
echo ""
echo "🔑 API ключ по умолчанию: test_api_key_123456"
echo ""
echo "📋 Примеры использования API:"
echo "   curl -H 'X-API-Key: test_api_key_123456' \\"
echo "        http://localhost:3000/api/moderation/queue"
echo ""
echo "   curl -X POST http://localhost:3000/api/moderation/submit \\"
echo "        -H 'X-API-Key: test_api_key_123456' \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"image_url\":\"https://picsum.photos/800/600\",\"product_id\":\"TEST-001\",\"download_url\":\"https://picsum.photos/800/600\"}'"
echo ""
echo "🛑 Для остановки системы нажмите Ctrl+C"
echo "=========================================="

# Бесконечное ожидание
while true; do
    sleep 1
done