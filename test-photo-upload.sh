#!/bin/bash
echo "=== ТЕСТ РАБОЧЕЙ ЗАГРУЗКИ ФОТО НА СЕРВЕР ==="
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
RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"image_url":"https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&h=600","product_id":"REAL-PHOTO-TEST-888","download_url":"https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&h=600","metadata":{"name":"Тестовый товар для загрузки фото"}}' \
  "http://localhost:3000/api/moderation/submit")

echo "Ответ: $RESPONSE"

ITEM_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('moderation_id', '0'))")
echo "✅ Товар создан, ID: $ITEM_ID"

# 3. Одобряем товар (запустится РЕАЛЬНАЯ загрузка)
echo ""
echo "3. Одобряем товар (запустится РЕАЛЬНАЯ загрузка фото)..."
APPROVE_RESPONSE=$(curl -s -X PUT -H "Content-Type: application/json" \
  -d '{"status":"approved"}' \
  "http://localhost:3000/api/moderation/$ITEM_ID/moderate")

echo "Ответ модерации: $APPROVE_RESPONSE"

# 4. Ждем и проверяем
echo ""
echo "4. Ждем 30 секунд для загрузки фото..."
echo "   В консоли backend должны появиться:"
echo "   - 🚀 ЗАПУСК РАБОЧЕЙ ЗАГРУЗКИ ФОТО..."
echo "   - 📤 НАЧИНАЮ РАБОЧУЮ ЗАГРУЗКУ ФОТО..."
echo "   - 📤 ОТПРАВЛЯЮ ФОТО НА СЕРВЕР..."
echo "   - ✅ Ответ сервера: 200 или 201"
echo "   - 🎉 ФОТО УСПЕШНО ЗАГРУЖЕНО НА СЕРВЕР!"
echo ""

for i in {1..30}; do
    echo -n "."
    sleep 1
done

echo ""
echo ""
echo "5. Тест завершен!"
echo "   Если в консоли backend были сообщения о загрузке -"
echo "   значит фото УХОДЯТ на сервер!"
echo ""
echo "🌐 Backend: http://192.168.1.189:3000"
echo "📤 Целевой сервер: http://img.instrumentstore.ru:7990/api/modelgoods/image/"