#!/bin/bash

echo "🖼️ Тестирование загрузки изображений на целевой сервер"
echo "======================================================"

API_URL="http://localhost:3000/api"
API_KEY="test_api_key_123456"

echo ""
echo "1. Добавляем тестовый товар с корректным URL изображения:"

TEST_ITEM='{
    "image_url": "https://static.onlinetrade.ru/img/items/b/pripoy_s_kanifolyu_sibrtekh_913385_d_2_mm_50_g_pos61_na_plastmassovoy_katushke_1611138252_1.jpg",
    "product_id": "UPLOAD-TEST-001",
    "download_url": "http://img.instrumentstore.ru:5000/img/test_upload.jpg",
    "metadata": {
        "name": "Тестовый товар для проверки загрузки",
        "category": "тест-загрузка"
    }
}'

RESPONSE=$(curl -s -X POST "$API_URL/moderation/submit" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$TEST_ITEM")

if echo "$RESPONSE" | grep -q "success"; then
    ITEM_ID=$(echo "$RESPONSE" | grep -o '"moderation_id":"[^"]*"' | cut -d'"' -f4)
    echo "   ✅ Товар добавлен, ID: $ITEM_ID"
    
    echo ""
    echo "2. Тестируем одобрение с загрузкой изображения:"
    echo "   (Должно появиться предупреждение о загрузке на img.instrumentstore.ru:7990)"
    
    echo ""
    echo "   🔧 API команда:"
    echo "   curl -X PUT $API_URL/moderation/$ITEM_ID/moderate \\"
    echo "        -H 'X-API-Key: $API_KEY' \\"
    echo "        -H 'Content-Type: application/json' \\"
    echo "        -d '{\"status\": \"approved\", \"reason\": \"Тест загрузки изображения\"}'"
    
    echo ""
    echo "3. Проверяем веб-интерфейс:"
    echo "   🌐 Откройте: http://192.168.1.189:8080"
    echo "   📋 Найдите товар 'UPLOAD-TEST-001'"
    echo "   ✅ Нажмите 'Одобрить'"
    echo "   📝 Должно быть предупреждение о загрузке на img.instrumentstore.ru:7990"
    
else
    echo "   ❌ Ошибка добавления товара"
fi

echo ""
echo "4. Тестируем товар с неверным URL:"

BAD_URL_ITEM='{
    "image_url": "invalid-url",
    "product_id": "BAD-URL-TEST",
    "download_url": "http://test.com/img.jpg",
    "metadata": {
        "name": "Товар с неверным URL",
        "category": "тест-ошибка"
    }
}'

RESPONSE2=$(curl -s -X POST "$API_URL/moderation/submit" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$BAD_URL_ITEM")

if echo "$RESPONSE2" | grep -q "success"; then
    BAD_ITEM_ID=$(echo "$RESPONSE2" | grep -o '"moderation_id":"[^"]*"' | cut -d'"' -f4)
    echo "   ✅ Товар добавлен, ID: $BAD_ITEM_ID"
    echo "   📝 При одобрении будет ошибка загрузки (неверный URL)"
fi

echo ""
echo "5. Логи backend для отладки:"
echo "   cd moderation-system && ./manage.sh logs"
echo ""
echo "📋 Что тестируем:"
echo "   ✅ Предупреждение о загрузке на целевой сервер"
echo "   ✅ Фактическая загрузка изображения (в логах)"
echo "   ✅ Обработка ошибок при неверном URL"
echo "   ✅ Информация о результате в ответе API"
