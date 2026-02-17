#!/bin/bash

echo "🚀 Запуск теста загрузки изображения"
echo "==================================="

API_URL="http://localhost:3000/api"
API_KEY="test_api_key_123456"

# Сначала посмотрим логи перед тестом
echo ""
echo "📋 Текущие логи backend:"
tail -5 backend/backend.log

echo ""
echo "1. Находим ID товара UPLOAD-TEST-001..."

ITEM_ID=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/queue" | \
  python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    for item in data.get('data', []):
        if item.get('product_id') == 'UPLOAD-TEST-001':
            print(item['id'])
            break
except:
    print('')
" 2>/dev/null)

if [ -z "$ITEM_ID" ]; then
    echo "   ❌ Товар не найден"
    exit 1
fi

echo "   ✅ Найден товар, ID: $ITEM_ID"

echo ""
echo "2. Выполняем одобрение с загрузкой изображения..."
echo "   (Смотрите логи в реальном времени)"

# Запускаем tail для логов в фоне
tail -f backend/backend.log &
TAIL_PID=$!

# Даем время для запуска tail
sleep 2

echo ""
echo "3. Отправляем запрос на одобрение..."

APPROVE_RESPONSE=$(curl -s -X PUT "$API_URL/moderation/$ITEM_ID/moderate" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"status": "approved", "reason": "Тест загрузки на целевой сервер"}')

echo ""
echo "4. Ответ сервера:"
echo "$APPROVE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$APPROVE_RESPONSE"

# Ждем немного для завершения логов
sleep 3

# Останавливаем tail
kill $TAIL_PID 2>/dev/null

echo ""
echo "5. Проверяем результат в логах:"
echo "   grep -A5 -B5 'Загрузка изображения' backend/backend.log"
grep -A5 -B5 "Загрузка изображения" backend/backend.log || echo "   ❌ Логи не найдены"

echo ""
echo "✅ Тест завершен!"
echo "📋 В логах должны быть:"
echo "   - 🔄 Загрузка изображения для товара..."
echo "   - 📥 Изображение скачано..."
echo "   - 📤 Отправка на целевой сервер..."
echo "   - 📨 Ответ от сервера..."
