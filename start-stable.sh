#!/bin/bash

echo "🚀 ЗАПУСК СТАБИЛЬНОЙ СИСТЕМЫ МОДЕРАЦИИ"
echo "======================================"

# Останавливаем всё
echo ""
echo "1. Останавливаю все процессы..."
pkill -f "node.*(server|simple-index)" 2>/dev/null || true
sleep 2

# Запускаем backend
echo ""
echo "2. Запускаю backend API..."
cd backend
nohup node simple-index.js > backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
sleep 3

# Проверяем backend
echo ""
echo "3. Проверяю backend..."
if curl -s "http://localhost:3000/health" > /dev/null; then
    echo "   ✅ Backend работает"
else
    echo "   ❌ Backend не отвечает"
    exit 1
fi

# Запускаем frontend
echo ""
echo "4. Запускаю стабильный frontend..."
cd ../simple-frontend
nohup node stable-server.js > stable-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"
sleep 3

# Проверяем frontend
echo ""
echo "5. Проверяю frontend..."
if curl -s "http://localhost:8080/health" > /dev/null; then
    echo "   ✅ Frontend работает"
else
    echo "   ❌ Frontend не отвечает"
    exit 1
fi

# Финальная проверка
echo ""
echo "6. Финальная проверка системы..."
echo ""
echo "   Backend health:"
curl -s "http://localhost:3000/health" | python3 -m json.tool 2>/dev/null | head -5
echo ""
echo "   Frontend health:"
curl -s "http://localhost:8080/health" | python3 -m json.tool 2>/dev/null | head -5
echo ""
echo "   Главная страница:"
curl -s "http://localhost:8080" | grep -o "<title>[^<]*</title>"
echo ""
echo "   Config.js:"
curl -s "http://localhost:8080/config.js" | grep -o '"API_URL":"[^"]*"' | head -1
echo ""

echo "🎉 СИСТЕМА УСПЕШНО ЗАПУЩЕНА!"
echo ""
echo "🌐 ВЕБ-ИНТЕРФЕЙС: http://localhost:8080"
echo "🔧 BACKEND API: http://localhost:3000"
echo "🔑 API КЛЮЧ: test_api_key_123456"
echo ""
echo "📊 ПРОЦЕССЫ:"
ps aux | grep -E "node.*(simple-index|stable-server)" | grep -v grep | awk '{print "   " $2 " " $11 " " $12}'
echo ""
echo "📋 ЛОГИ:"
echo "   Backend: tail -f backend/backend.log"
echo "   Frontend: tail -f simple-frontend/stable-frontend.log"
echo ""
echo "🔄 Для остановки: pkill -f \"node.*(simple-index|stable-server)\""