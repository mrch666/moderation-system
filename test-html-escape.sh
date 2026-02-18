#!/bin/bash

echo "=== ТЕСТ HTML ЭКРАНИРОВАНИЯ ==="
echo ""

# Создаем JSON с специальными символами
cat > /tmp/test-moderation.json << EOF
{
  "product_id": "html-escape-test-$(date +%s)",
  "image_url": "https://via.placeholder.com/800x600/FF9800/FFFFFF?text=HTML+Escape+Test",
  "download_url": "https://via.placeholder.com/800x600/FF9800/FFFFFF?text=HTML+Escape+Test",
  "metadata": {
    "title": "Тест HTML экранирования <>&\"'",
    "description": "Проверка экранирования специальных символов: < > & \" ' и русский текст",
    "price": "7777 руб.",
    "category": "Тестирование HTML"
  }
}
EOF

echo "Создаю модерацию с HTML символами..."
RESPONSE=$(curl -s -X POST "http://localhost:3000/api/moderation/submit" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test_api_key_123456" \
  -d @/tmp/test-moderation.json)

echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

echo ""
echo "✅ Модерация создана!"
echo ""
echo "📱 Проверьте Telegram группу:"
echo "   - Должны отображаться ВСЕ символы"
echo "   - Не должно быть ошибок форматирования"
echo "   - Кнопки должны быть под сообщением"
echo ""
echo "Если всё отображается правильно - HTML экранирование работает!"