#!/bin/bash

echo "🚀 Тестирование загрузки реального файла"
echo "======================================="

API_URL="http://localhost:3000/api"
API_KEY="test_api_key_123456"

echo ""
echo "1. Запускаем мониторинг логов в фоне..."
tail -f backend/backend.log &
TAIL_PID=$!
sleep 2

echo ""
echo "2. Выполняем одобрение товара ID 112..."
echo "   (Файл должен вернуть 404, система должна это обработать)"

APPROVE_RESPONSE=$(curl -s -X PUT "$API_URL/moderation/112/moderate" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"status": "approved", "reason": "Тест с реальным файлом (ожидается 404)"}')

echo ""
echo "3. Ответ сервера:"
echo "$APPROVE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$APPROVE_RESPONSE"

# Ждем завершения логов
sleep 3

# Останавливаем tail
kill $TAIL_PID 2>/dev/null

echo ""
echo "4. Анализ логов:"
echo "   grep -A3 -B3 'Загрузка файла' backend/backend.log"
grep -A3 -B3 "Загрузка файла" backend/backend.log || echo "   ❌ Логи не найдены"

echo ""
echo "5. Проверяем статус товара:"
ITEM_STATUS=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/112" | \
  python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    if data.get('success'):
        item = data['data']
        print(f'Статус: {item[\"status\"]}')
        print(f'Причина: {item[\"reason\"]}')
        if item.get('moderated_at'):
            print(f'Модерировано: {item[\"moderated_at\"]}')
except:
    print('Ошибка получения данных')
" 2>/dev/null)

echo "$ITEM_STATUS"

echo ""
echo "✅ Тест завершен!"
echo "📋 Ожидаемое поведение:"
echo "   - Система пытается скачать файл с :5000"
echo "   - Получает 404 ошибку"
echo "   - Корректно обрабатывает ошибку"
echo "   - Продолжает обработку модерации"
echo "   - В ответе есть информация об ошибке загрузки"
