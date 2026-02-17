#!/bin/bash

echo "⚡ Тестирование быстрого ответа"
echo "=============================="

API_URL="http://localhost:3000"
API_KEY="test_api_key_123456"

echo ""
echo "1. Тест с таймаутом 100ms (как в n8n):"

TEST_DATA='{
    "image_url": "https://arxion.ru/u/catalog_item_images/33237-913385-2.jpg",
    "product_id": "FAST-RESPONSE-TEST",
    "download_url": "https://arxion.ru/u/catalog_item_images/33237-913385-2.jpg",
    "metadata": {
        "name": "Тест быстрого ответа"
    }
}'

# Тест с таймаутом 100ms
timeout 0.1 curl -s -X POST "$API_URL/api/moderation/submit" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA" 2>/dev/null

if [ $? -eq 124 ]; then
    echo "   ❌ Таймаут 100ms (как в n8n)"
else
    echo "   ✅ Успешно за <100ms"
fi

echo ""
echo "2. Тест с нормальным таймаутом:"

RESPONSE=$(curl -s --max-time 5 -X POST "$API_URL/api/moderation/submit" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA")

if echo "$RESPONSE" | grep -q "success"; then
    echo "   ✅ Успешный ответ"
    echo "$RESPONSE" | python3 -m json.tool
else
    echo "   ❌ Ошибка: $RESPONSE"
fi

echo ""
echo "3. Проверяем логи:"
tail -5 backend/backend.log

echo ""
echo "4. Инструкция для n8n:"
echo "   В настройках HTTP Request node:"
echo "   - Установите 'Timeout' минимум 5000 (5 секунд)"
echo "   - Или лучше 30000 (30 секунд)"
echo "   - 'Max Redirects': 5"
echo "   - 'Follow Redirect': ✓"
echo "   - 'Ignore SSL Issues': если нужно"
echo ""
echo "   Альтернативно, можно изменить настройки в коде n8n:"
echo "   В Workflow Settings -> 'Execution Timeout' увеличьте значение"
