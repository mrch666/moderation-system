#!/bin/bash
echo "=== ФИНАЛЬНЫЙ ТЕСТ ЗАГРУЗКИ ИЗОБРАЖЕНИЙ ==="
echo ""

# 1. Создаем товар
echo "1. Создаю тестовый товар..."
RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -H "X-API-Key: test_api_key_123456" \
  -d '{"image_url":"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=600","product_id":"FINAL-UPLOAD-TEST-123","download_url":"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=600","metadata":{"name":"Наушники для теста загрузки"}}' \
  "http://localhost:3000/api/moderation/submit")

echo "Ответ создания: $RESPONSE"

# Извлекаем ID
ITEM_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('moderation_id', '0'))")
echo "✅ Товар создан, ID: $ITEM_ID"
echo ""

# 2. Одобряем товар
echo "2. Одобряю товар (запустится загрузка изображений)..."
APPROVE_RESPONSE=$(curl -s -X PUT -H "Content-Type: application/json" -H "X-API-Key: test_api_key_123456" \
  -d '{"status":"approved"}' \
  "http://localhost:3000/api/moderation/$ITEM_ID/moderate")

echo "Ответ модерации: $APPROVE_RESPONSE"
echo ""

# 3. Ждем и проверяем
echo "3. Жду 20 секунд для загрузки изображений..."
echo "   В консоли бэкенда должны появиться:"
echo "   - 🚀 Запускаю фоновую загрузку..."
echo "   - 📤 Отправляю изображение на целевой сервер..."
echo "   - 🎉 ИЗОБРАЖЕНИЕ УСПЕШНО ЗАГРУЖЕНО В ЦЕЛЕВУЮ БАЗУ!"
echo ""

for i in {1..20}; do
    echo -n "."
    sleep 1
done

echo ""
echo ""
echo "4. Тест завершен!"
echo "   Если в консоли бэкенда были сообщения о загрузке -"
echo "   значит изображения УХОДЯТ в целевую базу!"
echo ""
echo "🌐 Бэкенд: http://192.168.1.189:3000"
echo "📤 Целевой сервер: http://img.instrumentstore.ru:7990/api/modelgoods/image/"