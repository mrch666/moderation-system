#!/bin/bash

echo "🧪 Тестирование rate limiting"
echo "============================"

API_URL="http://localhost:3000"
API_KEY="test_api_key_123456"

echo ""
echo "1. Отправляем 5 запросов подряд (имитация n8n):"

for i in {1..5}; do
    echo ""
    echo "   Запрос #$i:"
    
    TEST_DATA=$(cat << JSON
{
    "image_url": "https://basket-22.wbbasket.ru/vol3898/part389814/389814587/images/big/1.webp",
    "product_id": "TEST-RATE-$i",
    "download_url": "https://basket-22.wbbasket.ru/vol3898/part389814/389814587/images/big/1.webp",
    "metadata": {
        "name": "Тест rate limiting #$i"
    }
}
JSON
)
    
    RESPONSE=$(curl -s -X POST "$API_URL/api/moderation/submit" \
        -H "X-API-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d "$TEST_DATA")
    
    if echo "$RESPONSE" | grep -q "success"; then
        echo "     ✅ Успешно"
    elif echo "$RESPONSE" | grep -q "Too many requests"; then
        echo "     ❌ Rate limiting сработал!"
        echo "     Ответ: $RESPONSE"
        break
    else
        echo "     ❌ Другая ошибка: $RESPONSE"
    fi
    
    # Небольшая пауза между запросами
    sleep 0.1
done

echo ""
echo "2. Проверяем логи на наличие rate limiting:"
grep -i "rate\|limit\|too many" backend/backend.log | tail -5

echo ""
echo "3. Тест с другим API ключом (должен получить rate limiting):"

WRONG_KEY="wrong_key_123"
WRONG_RESPONSE=$(curl -s -X POST "$API_URL/api/moderation/submit" \
    -H "X-API-Key: $WRONG_KEY" \
    -H "Content-Type: application/json" \
    -d '{"image_url":"https://test.com/1.jpg","product_id":"WRONG-KEY-TEST","download_url":"https://test.com/1.jpg"}')

if echo "$WRONG_RESPONSE" | grep -q "Invalid API key"; then
    echo "   ✅ Правильная ошибка для неверного ключа"
elif echo "$WRONG_RESPONSE" | grep -q "Too many requests"; then
    echo "   ⚠️ Rate limiting для неверного ключа"
else
    echo "   ❌ Неожиданный ответ: $WRONG_RESPONSE"
fi

echo ""
echo "4. Рекомендации для n8n:"
echo "   Даже с отключенным rate limiting рекомендуется:"
echo "   - Использовать batching (пакетную обработку)"
echo "   - Добавлять задержки между запросами (100-500ms)"
echo "   - Использовать 'Wait' node между запросами"
echo "   - Обрабатывать возможные ошибки в workflow"
