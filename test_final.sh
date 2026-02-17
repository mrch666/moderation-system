#!/bin/bash

echo "🎯 Финальный тест новой функциональности"
echo "======================================="

API_URL="http://localhost:3000/api"
API_KEY="test_api_key_123456"

echo ""
echo "1. Проверяем работу отклонения (без подтверждения):"

# Находим товар для теста
TEST_ITEM=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/queue?limit=1" | \
  python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    if data.get('success') and data.get('data'):
        item = data['data'][0]
        print(f'{item[\"id\"]},{item[\"product_id\"]}')
except:
    print(',')
" 2>/dev/null)

if [ -n "$TEST_ITEM" ]; then
    ITEM_ID=$(echo "$TEST_ITEM" | cut -d',' -f1)
    PRODUCT_ID=$(echo "$TEST_ITEM" | cut -d',' -f2)
    
    echo "   🆔 Товар для теста: ID=$ITEM_ID, Product=$PRODUCT_ID"
    
    # Тест отклонения
    echo ""
    echo "2. Тестируем отклонение:"
    REJECT_RESPONSE=$(curl -s -X PUT "$API_URL/moderation/$ITEM_ID/moderate" \
        -H "X-API-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"status": "rejected", "reason": "Тест: отклонение без подтверждения"}')
    
    if echo "$REJECT_RESPONSE" | grep -q "success"; then
        echo "   ✅ Отклонение работает!"
        echo "   Ответ:"
        echo "$REJECT_RESPONSE" | python3 -m json.tool 2>/dev/null | grep -A5 -B5 "success"
    else
        echo "   ❌ Ошибка отклонения:"
        echo "$REJECT_RESPONSE"
    fi
fi

echo ""
echo "3. Тестируем групповое удаление:"
echo "   Добавляем 2 товара с одинаковым product_id..."

# Добавляем тестовые товары
for i in {1..2}; do
    ITEM_DATA="{\"image_url\":\"https://via.placeholder.com/400x300?text=Group+Test+${i}\",\"product_id\":\"GROUP-DELETE-TEST\",\"download_url\":\"http://test.com/img${i}.jpg\",\"metadata\":{\"name\":\"Групповой тест ${i}\"}}"
    
    curl -s -X POST "$API_URL/moderation/submit" \
        -H "X-API-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d "$ITEM_DATA" > /dev/null
    
    echo "   ✅ Товар ${i} добавлен"
    sleep 1
done

echo ""
echo "4. Проверяем добавленные товары:"
GROUP_COUNT=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/queue" | \
  python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    count = 0
    group_ids = []
    for item in data.get('data', []):
        if item.get('product_id') == 'GROUP-DELETE-TEST' and item.get('status') == 'pending':
            count += 1
            group_ids.append(item['id'])
    print(f'{count},{','.join(map(str, group_ids))}')
except:
    print('0,')
" 2>/dev/null)

GROUP_NUM=$(echo "$GROUP_COUNT" | cut -d',' -f1)
GROUP_IDS=$(echo "$GROUP_COUNT" | cut -d',' -f2)

if [ "$GROUP_NUM" -gt 0 ]; then
    echo "   📋 Найдено товаров GROUP-DELETE-TEST: $GROUP_NUM"
    echo "   🆔 ID товаров: $GROUP_IDS"
    
    # Берем первый ID для теста
    FIRST_GROUP_ID=$(echo "$GROUP_IDS" | cut -d',' -f1)
    
    echo ""
    echo "5. Тестируем одобрение с групповым удалением:"
    echo "   (В веб-интерфейсе должно быть предупреждение)"
    
    echo ""
    echo "   🔧 API команда для теста:"
    echo "   curl -X PUT $API_URL/moderation/$FIRST_GROUP_ID/moderate \\"
    echo "        -H 'X-API-Key: $API_KEY' \\"
    echo "        -H 'Content-Type: application/json' \\"
    echo "        -d '{\"status\": \"approved\", \"reason\": \"Групповое одобрение тест\"}'"
    
    echo ""
    echo "6. Проверяем веб-интерфейс:"
    echo "   🌐 Откройте: http://192.168.1.189:8080"
    echo "   📋 Перейдите во вкладку 'Очередь'"
    echo "   🧪 Найдите товары 'Групповой тест'"
    echo "   ✅ Нажмите 'Одобрить' - должно быть предупреждение"
    echo "   ❌ Нажмите 'Отклонить' - без предупреждения"
else
    echo "   ❌ Товары не найдены"
fi

echo ""
echo "✅ Тестирование завершено!"
