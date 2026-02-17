#!/bin/bash

echo "🎯 ФИНАЛЬНОЕ ТЕСТИРОВАНИЕ СИСТЕМЫ"
echo "================================"
echo ""

# 1. Проверка backend
echo "1. Проверка Backend API:"
if curl -s http://localhost:3000/health > /dev/null; then
    echo "   ✅ Backend работает"
else
    echo "   ❌ Backend не работает"
    exit 1
fi

# 2. Проверка фронтенда
echo ""
echo "2. Проверка веб-интерфейса:"
if curl -s http://localhost:8080 | grep -q "Система модерации изображений"; then
    echo "   ✅ Веб-интерфейс работает"
else
    echo "   ❌ Веб-интерфейс не работает"
    exit 1
fi

# 3. Тест API
echo ""
echo "3. Тест API функционала:"

# Создаем тестовую модерацию
echo "   - Отправка на модерацию:"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/moderation/submit \
  -H "X-API-Key: test_api_key_123456" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://picsum.photos/800/600?random=final",
    "product_id": "FINAL-TEST",
    "download_url": "https://picsum.photos/800/600?random=final"
  }')

if echo "$RESPONSE" | grep -q "success"; then
    echo "     ✅ Успешно"
    MOD_ID=$(echo "$RESPONSE" | grep -o '"moderation_id":"[^"]*"' | cut -d'"' -f4)
    echo "     📋 ID: $MOD_ID"
else
    echo "     ❌ Ошибка: $RESPONSE"
fi

# Проверяем очередь
echo "   - Проверка очереди:"
QUEUE_RESPONSE=$(curl -s -H "X-API-Key: test_api_key_123456" http://localhost:3000/api/moderation/queue?limit=1)
if echo "$QUEUE_RESPONSE" | grep -q "success"; then
    echo "     ✅ Успешно"
    QUEUE_COUNT=$(echo "$QUEUE_RESPONSE" | grep -o '"total":[0-9]*' | cut -d: -f2)
    echo "     📋 В очереди: $QUEUE_COUNT"
else
    echo "     ❌ Ошибка"
fi

# Проверяем статистику
echo "   - Проверка статистики:"
STATS_RESPONSE=$(curl -s -H "X-API-Key: test_api_key_123456" http://localhost:3000/api/moderation/stats)
if echo "$STATS_RESPONSE" | grep -q "success"; then
    echo "     ✅ Успешно"
else
    echo "     ❌ Ошибка"
fi

# 4. Проверка внешнего доступа
echo ""
echo "4. Проверка внешнего доступа:"
IP=$(hostname -I | awk '{print $1}')
echo "   🌐 Веб-интерфейс: http://$IP:8080"
echo "   🔧 API: http://$IP:3000"
echo "   🩺 Health check: http://$IP:3000/health"
echo "   🔑 API ключ: test_api_key_123456"

# 5. Проверка логов
echo ""
echo "5. Проверка логов:"
if [ -f "backend/backend.log" ]; then
    BACKEND_ERRORS=$(grep -i "error\|fail\|exception" backend/backend.log | wc -l)
    echo "   📋 Backend ошибок: $BACKEND_ERRORS"
else
    echo "   📋 Backend лог не найден"
fi

if [ -f "simple-frontend/frontend.log" ]; then
    FRONTEND_ERRORS=$(grep -i "error\|fail\|exception" simple-frontend/frontend.log | wc -l)
    echo "   📋 Frontend ошибок: $FRONTEND_ERRORS"
else
    echo "   📋 Frontend лог не найден"
fi

echo ""
echo "========================================"
echo "🎉 СИСТЕМА ГОТОВА К ИСПОЛЬЗОВАНИЮ!"
echo "========================================"
echo ""
echo "📋 ИНСТРУКЦИЯ:"
echo "1. Откройте в браузере: http://$IP:8080"
echo "2. API ключ уже введен"
echo "3. Используйте вкладки для управления:"
echo "   - 📊 Дашборд - статистика"
echo "   - 📋 Очередь - модерация изображений"
echo "   - 📤 Отправить - новая модерация"
echo "   - ⚙️ Настройки - управление системой"
echo ""
echo "🔧 API интеграция:"
echo "   curl -H 'X-API-Key: test_api_key_123456' \\"
echo "        http://$IP:3000/api/moderation/queue"
echo ""
echo "   curl -X POST http://$IP:3000/api/moderation/submit \\"
echo "        -H 'X-API-Key: test_api_key_123456' \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"image_url\":\"https://example.com/image.jpg\",\"product_id\":\"PROD-123\",\"download_url\":\"https://cdn.example.com/image.jpg\"}'"
