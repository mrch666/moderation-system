#!/bin/bash

echo "=== ТЕСТ С КНОПКАМИ В TELEGRAM ==="
echo ""

# Создаем JSON с метаданными
JSON_DATA='{
  "product_id": "buttons-test-'$(date +%s)'",
  "image_url": "https://via.placeholder.com/800x600/9C27B0/FFFFFF?text=Telegram+Buttons",
  "download_url": "https://via.placeholder.com/800x600/9C27B0/FFFFFF?text=Telegram+Buttons",
  "metadata": {
    "title": "Ноутбук ASUS ROG Strix G15",
    "description": "Игровой ноутбук с процессором Intel Core i9, видеокартой NVIDIA RTX 4070, 32 ГБ ОЗУ",
    "price": "159 990 руб.",
    "category": "Ноутбуки и компьютеры"
  }
}'

echo "Создаю модерацию с кнопками..."
RESPONSE=$(curl -s -X POST "http://localhost:3000/api/moderation/submit" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test_api_key_123456" \
  -d "$JSON_DATA")

echo "Ответ сервера:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

MODERATION_ID=$(echo "$RESPONSE" | grep -o '"moderation_id":"[^"]*"' | cut -d'"' -f4)

echo ""
echo "✅ Модерация создана! ID: $MODERATION_ID"
echo ""
echo "📱 Проверьте Telegram группу - должно прийти уведомление С КНОПКАМИ:"
echo ""
echo "   📢 НОВАЯ МОДЕРАЦИЯ!"
echo "   🆔 ID: $MODERATION_ID"
echo "   📦 Товар: buttons-test-..."
echo "   🏷️ Название: Ноутбук ASUS ROG Strix G15"
echo "   📝 Описание: Игровой ноутбук с процессором..."
echo "   💰 Цена: 159 990 руб."
echo "   📂 Категория: Ноутбуки и компьютеры"
echo ""
echo "   ⬇️ ПОД СООБЩЕНИЕМ ДОЛЖНЫ БЫТЬ КНОПКИ:"
echo "   [✅ Одобрить] [❌ Отклонить]"
echo "   [👁️ Просмотр деталей]"
echo "   [📋 Вся очередь]"
echo ""
echo "⏳ Жду 5 секунд для отправки уведомления..."
sleep 5
echo ""
echo "📋 Проверяю логи backend..."
tail -5 backend/backend.log 2>/dev/null || echo "Логи не найдены"