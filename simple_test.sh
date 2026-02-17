#!/bin/bash

echo "🧪 Простой тест новой функциональности"
echo "======================================"

API_URL="http://localhost:3000/api"
API_KEY="test_api_key_123456"

echo ""
echo "1. Проверяем текущую очередь:"

QUEUE_RESPONSE=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/queue?limit=5")

if echo "$QUEUE_RESPONSE" | grep -q "success"; then
    echo "   ✅ Очередь доступна"
    echo ""
    echo "   Первые 5 товаров в очереди:"
    echo "$QUEUE_RESPONSE" | python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    for i, item in enumerate(data.get('data', [])[:5], 1):
        name = 'Без названия'
        if item.get('metadata'):
            try:
                meta = json.loads(item['metadata'])
                if 'name' in meta:
                    name = meta['name'][:30] + ('...' if len(meta['name']) > 30 else '')
            except:
                pass
        print(f'{i}. ID: {item[\"id\"]} | Товар: {item[\"product_id\"]} | {name}')
except:
    print('Ошибка парсинга')
" 2>/dev/null
else
    echo "   ❌ Ошибка получения очереди"
fi

echo ""
echo "2. Тестируем API модерации:"
echo "   Найдем товар для теста..."

# Найдем первый товар в очереди
TEST_ID=$(echo "$QUEUE_RESPONSE" | python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    if data.get('data'):
        print(data['data'][0]['id'])
except:
    print('')
" 2>/dev/null)

if [ -n "$TEST_ID" ]; then
    echo "   🆔 ID товара для теста: $TEST_ID"
    
    echo ""
    echo "3. Тест отклонения (без подтверждения):"
    echo "   Выполняем запрос..."
    
    REJECT_RESPONSE=$(curl -s -X PUT "$API_URL/moderation/$TEST_ID/moderate" \
        -H "X-API-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"status": "rejected", "reason": "Тест отклонения без подтверждения"}')
    
    if echo "$REJECT_RESPONSE" | grep -q "success"; then
        echo "   ✅ Товар отклонен без подтверждения"
        echo "   Ответ:"
        echo "$REJECT_RESPONSE" | python3 -m json.tool 2>/dev/null | head -20
    else
        echo "   ❌ Ошибка:"
        echo "$REJECT_RESPONSE"
    fi
fi

echo ""
echo "4. Проверяем веб-интерфейс:"
echo "   🌐 Откройте: http://192.168.1.189:8080"
echo ""
echo "📋 Что должно работать:"
echo "   ✅ Отклонение - без подтверждения"
echo "   ✅ Одобрение - с предупреждением о групповом удалении"
echo "   ✅ Групповое удаление - все товары с одинаковым product_id"
