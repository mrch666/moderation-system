#!/bin/bash

echo "🚀 ГАРАНТИРОВАННЫЙ ЗАПУСК СИСТЕМЫ"
echo "================================"
echo "Время: $(date)"
echo ""

# Останавливаем всё
echo "🛑 Останавливаю всё..."
pkill -f "node.*(simple-index|server)" 2>/dev/null || true
sleep 3

# Запускаем backend
echo ""
echo "🔧 ЗАПУСК BACKEND..."
cd backend
nohup node simple-index.js > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
cd ..

echo "⏳ Жду 5 секунд для запуска backend..."
sleep 5

# Проверяем backend
echo ""
echo "📊 ПРОВЕРКА BACKEND:"
if timeout 3 curl -s "http://localhost:3000/health" >/dev/null; then
    echo "✅ Backend работает"
else
    echo "❌ Backend не запустился"
    echo "Проверьте логи: tail -f backend/backend.log"
    exit 1
fi

# Запускаем frontend в screen (гарантированно останется работать)
echo ""
echo "🌐 ЗАПУСК FRONTEND..."
cd simple-frontend

# Проверяем установлен ли screen
if command -v screen &> /dev/null; then
    echo "Использую screen для гарантированного запуска..."
    screen -dmS moderation-frontend node server.js
    echo "Frontend запущен в screen сессии: moderation-frontend"
else
    echo "Screen не установлен, запускаю обычным способом..."
    nohup node server.js > frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"
fi

cd ..

echo "⏳ Жду 3 секунды для запуска frontend..."
sleep 3

# Проверяем frontend
echo ""
echo "📊 ПРОВЕРКА FRONTEND:"
if timeout 3 curl -s "http://localhost:8080" >/dev/null; then
    echo "✅ Frontend работает"
else
    echo "⚠️  Frontend может не отвечать, проверяем процессы..."
    ps aux | grep "node.*server" | grep -v grep && echo "Процесс есть, но порт не отвечает" || echo "Процесса нет"
fi

echo ""
echo "🎉 СИСТЕМА ЗАПУЩЕНА!"
echo "=================="
echo ""
echo "🌐 ДОСТУП:"
echo "   Frontend: http://192.168.1.189:8080"
echo "   Backend:  http://192.168.1.189:3000"
echo "   API ключ: test_api_key_123456"
echo ""
echo "📋 КОМАНДЫ:"
echo "   Проверить процессы: ps aux | grep -E 'node.*(simple-index|server)' | grep -v grep"
echo "   Остановить всё: pkill -f 'node.*(simple-index|server)'"
echo "   Логи backend: tail -f backend/backend.log"
echo "   Логи frontend: tail -f simple-frontend/frontend.log"