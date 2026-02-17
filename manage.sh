#!/bin/bash

# Скрипт управления системой модерации

case "$1" in
    start)
        echo "🚀 Запуск системы модерации..."
        
        # Запуск backend если не запущен
        if ! pgrep -f "node simple-index.js" > /dev/null; then
            echo "🔄 Запуск Backend API..."
            cd backend
            nohup npm start > backend.log 2>&1 &
            echo $! > ../backend.pid
            cd ..
            sleep 3
        else
            echo "✅ Backend уже запущен"
        fi
        
        # Запуск фронтенда если не запущен
        if ! pgrep -f "node server.js" > /dev/null; then
            echo "🔄 Запуск веб-интерфейса..."
            cd simple-frontend
            nohup node server.js > frontend.log 2>&1 &
            echo $! > ../frontend.pid
            cd ..
            sleep 2
        else
            echo "✅ Веб-интерфейс уже запущен"
        fi
        
        echo ""
        echo "🎉 Система запущена!"
        echo "🌐 Веб-интерфейс: http://$(hostname -I | awk '{print $1}'):8080"
        echo "🔧 API: http://$(hostname -I | awk '{print $1}'):3000"
        echo "🔑 API ключ: test_api_key_123456"
        ;;
    
    stop)
        echo "🛑 Остановка системы..."
        
        if [ -f "backend.pid" ]; then
            kill $(cat backend.pid) 2>/dev/null || true
            rm -f backend.pid
            echo "✅ Backend остановлен"
        fi
        
        if [ -f "frontend.pid" ]; then
            kill $(cat frontend.pid) 2>/dev/null || true
            rm -f frontend.pid
            echo "✅ Веб-интерфейс остановлен"
        fi
        
        # Также убиваем процессы по имени
        pkill -f "node simple-index.js" 2>/dev/null || true
        pkill -f "node server.js" 2>/dev/null || true
        
        echo "✅ Система остановлена"
        ;;
    
    status)
        echo "📊 Статус системы модерации:"
        echo ""
        
        if pgrep -f "node simple-index.js" > /dev/null; then
            echo "✅ Backend API: ЗАПУЩЕН"
            echo "   URL: http://$(hostname -I | awk '{print $1}'):3000"
            echo "   Health: http://$(hostname -I | awk '{print $1}'):3000/health"
        else
            echo "❌ Backend API: ОСТАНОВЛЕН"
        fi
        
        echo ""
        
        if pgrep -f "node server.js" > /dev/null; then
            echo "✅ Веб-интерфейс: ЗАПУЩЕН"
            echo "   URL: http://$(hostname -I | awk '{print $1}'):8080"
        else
            echo "❌ Веб-интерфейс: ОСТАНОВЛЕН"
        fi
        
        echo ""
        echo "🔑 API ключ: test_api_key_123456"
        ;;
    
    test)
        echo "🧪 Тестирование системы..."
        echo ""
        
        # Проверка backend
        echo "1. Проверка Backend API:"
        if curl -s http://localhost:3000/health > /dev/null; then
            echo "   ✅ Backend работает"
            curl -s http://localhost:3000/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/health
        else
            echo "   ❌ Backend не отвечает"
        fi
        
        echo ""
        
        # Проверка фронтенда
        echo "2. Проверка веб-интерфейса:"
        if curl -s http://localhost:8080 > /dev/null; then
            echo "   ✅ Веб-интерфейс работает"
        else
            echo "   ❌ Веб-интерфейс не отвечает"
        fi
        
        echo ""
        
        # Тест API
        echo "3. Тест API модерации:"
        RESPONSE=$(curl -s -X POST http://localhost:3000/api/moderation/submit \
          -H "X-API-Key: test_api_key_123456" \
          -H "Content-Type: application/json" \
          -d '{
            "image_url": "https://picsum.photos/800/600?random='$(date +%s)'",
            "product_id": "TEST-'$(date +%s)'",
            "download_url": "https://picsum.photos/800/600?random='$(date +%s)'"
          }')
        
        if echo "$RESPONSE" | grep -q "success"; then
            echo "   ✅ API модерации работает"
            MOD_ID=$(echo "$RESPONSE" | grep -o '"moderation_id":"[^"]*"' | cut -d'"' -f4)
            echo "   📋 ID модерации: $MOD_ID"
        else
            echo "   ❌ API модерации не работает"
            echo "   Ошибка: $RESPONSE"
        fi
        
        echo ""
        echo "🌐 Внешние адреса:"
        echo "   Веб-интерфейс: http://$(hostname -I | awk '{print $1}'):8080"
        echo "   API: http://$(hostname -I | awk '{print $1}'):3000"
        ;;
    
    logs)
        echo "📋 Логи системы:"
        echo ""
        echo "1. Backend лог (последние 20 строк):"
        echo "-----------------------------------"
        tail -20 backend/backend.log 2>/dev/null || echo "Файл лога не найден"
        echo ""
        echo "2. Frontend лог (последние 10 строк):"
        echo "------------------------------------"
        tail -10 simple-frontend/frontend.log 2>/dev/null || echo "Файл лога не найден"
        ;;
    
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
    
    *)
        echo "Использование: $0 {start|stop|restart|status|test|logs}"
        echo ""
        echo "Команды:"
        echo "  start    - Запуск системы"
        echo "  stop     - Остановка системы"
        echo "  restart  - Перезапуск системы"
        echo "  status   - Статус системы"
        echo "  test     - Тестирование системы"
        echo "  logs     - Просмотр логов"
        echo ""
        echo "Пример:"
        echo "  $0 start   # Запустить систему"
        echo "  $0 status  # Показать статус"
        echo "  $0 test    # Протестировать систему"
        exit 1
        ;;
esac