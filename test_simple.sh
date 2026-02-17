#!/bin/bash

# Простой тест API системы модерации

API_URL="http://localhost:3000/api"
API_KEY="test_api_key_123456"

echo "🧪 Тестирование API системы модерации"
echo "====================================="

# Проверка здоровья
echo "1. Проверка здоровья системы..."
curl -s "$API_URL/../health" | jq . || echo "⚠️  jq не установлен, вывод сырым текстом:" && curl -s "$API_URL/../health"
echo ""

# Отправка тестовой модерации
echo "2. Отправка тестового изображения на модерацию..."
RESPONSE=$(curl -s -X POST "$API_URL/moderation/submit" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://picsum.photos/800/600?random=1",
    "product_id": "TEST-"$(date +%s),
    "download_url": "https://picsum.photos/800/600?random=1"
  }')

echo "Ответ:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

# Извлекаем UUID модерации
MODERATION_UUID=$(echo "$RESPONSE" | grep -o '"moderation_id":"[^"]*"' | cut -d'"' -f4)

if [ -n "$MODERATION_UUID" ]; then
    echo ""
    echo "📋 Создана модерация с UUID: $MODERATION_UUID"
    
    # Проверка статуса
    echo ""
    echo "3. Проверка статуса модерации..."
    curl -s "$API_URL/moderation/status/$MODERATION_UUID" | python3 -m json.tool 2>/dev/null || curl -s "$API_URL/moderation/status/$MODERATION_UUID"
fi

echo ""
echo "4. Получение очереди модерации..."
curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/queue?limit=3" | python3 -m json.tool 2>/dev/null || curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/queue?limit=3"

echo ""
echo "5. Получение статистики..."
curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/stats" | python3 -m json.tool 2>/dev/null || curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/stats"

echo ""
echo "====================================="
echo "✅ Тестирование завершено!"
echo ""
echo "🌐 Откройте в браузере: http://localhost:8080"
echo "🔑 API ключ: $API_KEY"
echo ""
echo "Для модерации через веб-интерфейс:"
echo "1. Откройте http://localhost:8080"
echo "2. API ключ уже введен"
echo "3. Перейдите во вкладку 'Очередь модерации'"
echo "4. Нажмите кнопки ✅ или ❌ для модерации"