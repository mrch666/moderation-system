#!/bin/bash

echo "⏱️ Тестирование времени ответа сервера"
echo "====================================="

API_URL="http://localhost:3000"
API_KEY="test_api_key_123456"

echo ""
echo "1. Тест health endpoint (должен быть быстрым):"
time curl -s -o /dev/null -w "HTTP код: %{http_code}\nВремя: %{time_total} сек\n" \
  "$API_URL/health"

echo ""
echo "2. Тест отправки на модерацию:"

TEST_DATA='{
    "image_url": "https://arxion.ru/u/catalog_item_images/33237-913385-2.jpg",
    "product_id": "TEST-RESPONSE-TIME",
    "download_url": "https://arxion.ru/u/catalog_item_images/33237-913385-2.jpg",
    "metadata": {
        "name": "Тест времени ответа"
    }
}'

echo "   Запускаем тест..."
START_TIME=$(date +%s%N)
RESPONSE=$(curl -s -X POST "$API_URL/api/moderation/submit" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA")
END_TIME=$(date +%s%N)

DURATION_MS=$((($END_TIME - $START_TIME) / 1000000))
echo "   Время выполнения: $DURATION_MS ms"

if echo "$RESPONSE" | grep -q "success"; then
    echo "   ✅ Успешно за $DURATION_MS ms"
else
    echo "   ❌ Ошибка или таймаут"
    echo "   Ответ: $RESPONSE"
fi

echo ""
echo "3. Рекомендации для n8n:"
echo "   - Увеличить timeout минимум до 5000ms (5 секунд)"
echo "   - Или лучше до 30000ms (30 секунд)"
echo "   - Наш сервер выполняет:"
echo "     1. Валидацию данных"
echo "     2. Запись в базу данных"
echo "     3. Генерацию UUID"
echo "     4. Ответ клиенту"
echo ""
echo "4. Быстрое решение - оптимизировать endpoint:"
echo "   - Кэшировать соединение с БД"
echo "   - Упростить валидацию"
echo "   - Отвечать быстрее, отложив некоторые операции"
