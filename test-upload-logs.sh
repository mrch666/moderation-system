#!/bin/bash
echo "=== ТЕСТ РЕАЛЬНОЙ ЗАГРУЗКИ ФОТО С ЛОГАМИ ==="
echo ""

# 1. Проверяем backend
echo "1. Проверяем backend..."
curl -s "http://localhost:3000/health" >/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Backend работает"
else
    echo "❌ Backend не работает"
    exit 1
fi

# 2. Создаем тестовый товар
echo ""
echo "2. Создаем тестовый товар..."
PRODUCT_ID="PHOTO-LOG-TEST-$(date +%s)"
RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"image_url\":\"https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&h=600\",\"product_id\":\"$PRODUCT_ID\",\"download_url\":\"https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&h=600\"}" \
  "http://localhost:3000/api/moderation/submit")

echo "Ответ создания: $RESPONSE"

ITEM_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('moderation_id', '0'))")
echo "✅ Товар создан: $PRODUCT_ID (ID: $ITEM_ID)"

# 3. Одобряем товар
echo ""
echo "3. Одобряем товар (запустится РЕАЛЬНАЯ загрузка фото)..."
echo "   Смотрите консоль backend для сообщений о загрузке!"
echo ""

APPROVE_RESPONSE=$(curl -s -X PUT -H "Content-Type: application/json" \
  -d '{"status":"approved"}' \
  "http://localhost:3000/api/moderation/$ITEM_ID/moderate")

echo "Ответ модерации: $APPROVE_RESPONSE"

# 4. Объясняем что должно произойти
echo ""
echo "4. В КОНСОЛИ BACKEND ДОЛЖНЫ ПОЯВИТЬСЯ:"
echo "   ------------------------------------"
echo "   🚀 SIMPLE REAL: Starting photo upload for $PRODUCT_ID"
echo "   📤 SIMPLE REAL: Uploading photo for $PRODUCT_ID"
echo "   📤 ModelID: ..., URL: ..."
echo "   📤 Testing upload to http://img.instrumentstore.ru:7990/api/modelgoods/image/"
echo "   ✅ Image downloaded (... bytes)"
echo "   📤 Creating multipart/form-data for upload..."
echo "   📤 Sending ... bytes to server..."
echo "   ✅ SERVER RESPONSE: 200 или 201"
echo "   🎉 SUCCESS! PHOTO UPLOADED TO SERVER!"
echo ""
echo "5. Если есть ошибки:"
echo "   ❌ Download failed: ... - проблема со скачиванием изображения"
echo "   ❌ Network error: ... - проблема с сетью"
echo "   ❌ Timeout (30 seconds) - сервер не отвечает"
echo "   ⚠️ Server error ... - сервер вернул ошибку"
echo ""
echo "6. Целевой сервер: http://img.instrumentstore.ru:7990/api/modelgoods/image/"
echo "   Требует: multipart/form-data с полями 'modelid' и 'file'"
echo ""
echo "✅ Тест запущен! Смотрите консоль backend для результатов."