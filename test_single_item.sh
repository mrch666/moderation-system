#!/bin/bash

echo "🧪 Тестирование добавления одного товара"
echo "========================================"

API_URL="http://localhost:3000/api"
API_KEY="test_api_key_123456"

# Тестовый товар
TEST_ITEM='{
    "image_url": "https://static.onlinetrade.ru/img/items/b/pripoy_s_kanifolyu_sibrtekh_913385_d_2_mm_50_g_pos61_na_plastmassovoy_katushke_1611138252_1.jpg",
    "product_id": "TEST-ERROR-CHECK",
    "download_url": "img.instrumentstore.ru:5000/img/1_577050.jpg",
    "metadata": {
        "name": "Тестовый товар для проверки ошибок",
        "category": "тест"
    }
}'

echo ""
echo "1. Отправка товара на модерацию:"
echo "   Данные: $TEST_ITEM"

RESPONSE=$(curl -s -X POST "$API_URL/moderation/submit" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$TEST_ITEM")

echo ""
echo "2. Ответ сервера:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

echo ""
echo "3. Проверка очереди:"
QUEUE_RESPONSE=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/queue?limit=5")

if echo "$QUEUE_RESPONSE" | grep -q "success"; then
    echo "   ✅ Очередь доступна"
    TOTAL=$(echo "$QUEUE_RESPONSE" | grep -o '"total":[0-9]*' | cut -d: -f2)
    echo "   📋 Всего в очереди: $TOTAL"
else
    echo "   ❌ Ошибка получения очереди:"
    echo "$QUEUE_RESPONSE"
fi

echo ""
echo "4. Проверка внешнего доступа:"
echo "   Веб-интерфейс: http://192.168.1.189:8080"
echo "   API: http://192.168.1.189:3000"
