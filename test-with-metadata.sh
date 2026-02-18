#!/bin/bash

echo "=== ТЕСТ С ПРАВИЛЬНЫМИ МЕТАДАННЫМИ ==="
echo ""

# Создаем правильный JSON с метаданными
JSON_DATA='{
  "product_id": "test-with-metadata-'$(date +%s)'",
  "image_url": "https://via.placeholder.com/800x600/FF5722/FFFFFF?text=With+Metadata",
  "download_url": "https://via.placeholder.com/800x600/FF5722/FFFFFF?text=With+Metadata",
  "metadata": {
    "title": "Телевизор Samsung QLED 4K",
    "description": "Телевизор с диагональю 55 дюймов, разрешение 4K, технология QLED",
    "price": "89 990 руб.",
    "category": "Телевизоры и аудио"
  }
}'

echo "JSON данные:"
echo "$JSON_DATA" | python3 -m json.tool
echo ""

echo "Отправляю запрос на создание модерации..."
RESPONSE=$(curl -s -X POST "http://localhost:3000/api/moderation/submit" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test_api_key_123456" \
  -d "$JSON_DATA")

echo "Ответ сервера:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

echo ""
echo "✅ Запрос отправлен!"
echo ""
echo "📱 Проверьте Telegram группу - должно прийти уведомление С МЕТАДАННЫМИ:"
echo "   - Название: Телевизор Samsung QLED 4K"
echo "   - Описание: Телевизор с диагональю 55 дюймов..."
echo "   - Цена: 89 990 руб."
echo "   - Категория: Телевизоры и аудио"