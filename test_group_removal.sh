#!/bin/bash

echo "🧪 Тестирование группового удаления товаров"
echo "=========================================="

API_URL="http://localhost:3000/api"
API_KEY="test_api_key_123456"

echo ""
echo "1. Добавляем несколько товаров с одинаковым product_id:"

# Добавляем 3 товара с одинаковым product_id
for i in {1..3}; do
    ITEM_DATA=$(cat << JSON
{
    "image_url": "https://static.onlinetrade.ru/img/items/b/test_item_${i}_1611138252_1.jpg",
    "product_id": "GROUP-TEST-001",
    "download_url": "http://img.instrumentstore.ru:5000/img/test_${i}.jpg",
    "metadata": {
        "name": "Тестовый товар для группового удаления #${i}",
        "category": "тест",
        "batch": "группа-001"
    }
}
JSON
)
    
    echo "   Добавляем товар #${i}..."
    RESPONSE=$(curl -s -X POST "$API_URL/moderation/submit" \
        -H "X-API-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d "$ITEM_DATA")
    
    if echo "$RESPONSE" | grep -q "success"; then
        echo "     ✅ Успешно"
    else
        echo "     ❌ Ошибка"
    fi
    
    sleep 1
done

echo ""
echo "2. Проверяем, сколько товаров с product_id='GROUP-TEST-001' в очереди:"

QUEUE_RESPONSE=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/queue")

if echo "$QUEUE_RESPONSE" | grep -q "success"; then
    COUNT=$(echo "$QUEUE_RESPONSE" | python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    count = 0
    for item in data.get('data', []):
        if item.get('product_id') == 'GROUP-TEST-001':
            count += 1
    print(count)
except:
    print(0)
" 2>/dev/null)
    
    echo "   📋 Товаров с GROUP-TEST-001 в очереди: $COUNT"
    
    # Находим ID первого товара для теста
    FIRST_ID=$(echo "$QUEUE_RESPONSE" | python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    for item in data.get('data', []):
        if item.get('product_id') == 'GROUP-TEST-001':
            print(item['id'])
            break
except:
    print('')
" 2>/dev/null)
    
    if [ -n "$FIRST_ID" ]; then
        echo "   🆔 ID первого товара для теста: $FIRST_ID"
        
        echo ""
        echo "3. Тестируем одобрение (должно удалить все 3 товара):"
        echo "   Нажмите Enter для продолжения..."
        read
        
        APPROVE_RESPONSE=$(curl -s -X PUT "$API_URL/moderation/$FIRST_ID/moderate" \
            -H "X-API-Key: $API_KEY" \
            -H "Content-Type: application/json" \
            -d '{"status": "approved", "reason": "Тест группового удаления"}')
        
        echo "   Ответ сервера:"
        echo "$APPROVE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$APPROVE_RESPONSE"
        
        echo ""
        echo "4. Проверяем результат:"
        sleep 2
        
        QUEUE_AFTER=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/queue")
        COUNT_AFTER=$(echo "$QUEUE_AFTER" | python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    count = 0
    for item in data.get('data', []):
        if item.get('product_id') == 'GROUP-TEST-001' and item.get('status') == 'pending':
            count += 1
    print(count)
except:
    print('ошибка')
" 2>/dev/null)
        
        echo "   📋 Осталось товаров GROUP-TEST-001 в очереди: $COUNT_AFTER"
        
        if [ "$COUNT_AFTER" = "0" ]; then
            echo "   ✅ Все товары удалены из очереди!"
        else
            echo "   ❌ Ошибка: товары остались в очереди"
        fi
    fi
fi

echo ""
echo "5. Тестируем отклонение (не должно спрашивать подтверждение):"
echo "   Добавляем еще один тестовый товар..."

SINGLE_ITEM='{
    "image_url": "https://static.onlinetrade.ru/img/items/b/single_test_1611138252_1.jpg",
    "product_id": "SINGLE-TEST-001",
    "download_url": "http://img.instrumentstore.ru:5000/img/single_test.jpg",
    "metadata": {
        "name": "Тестовый товар для проверки отклонения",
        "category": "тест"
    }
}'

RESPONSE=$(curl -s -X POST "$API_URL/moderation/submit" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$SINGLE_ITEM")

if echo "$RESPONSE" | grep -q "success"; then
    SINGLE_ID=$(echo "$RESPONSE" | grep -o '"moderation_id":"[^"]*"' | cut -d'"' -f4)
    echo "   ✅ Товар добавлен, ID: $SINGLE_ID"
    
    echo ""
    echo "   🧪 Тест отклонения (не должно быть подтверждения):"
    echo "   curl -X PUT $API_URL/moderation/$SINGLE_ID/moderate \\"
    echo "        -H 'X-API-Key: $API_KEY' \\"
    echo "        -H 'Content-Type: application/json' \\"
    echo "        -d '{\"status\": \"rejected\", \"reason\": \"Тест отклонения без подтверждения\"}'"
else
    echo "   ❌ Ошибка добавления товара"
fi

echo ""
echo "🌐 Веб-интерфейс для тестирования:"
echo "   http://192.168.1.189:8080"
echo ""
echo "📋 Инструкция:"
echo "   1. Откройте веб-интерфейс"
echo "   2. Найдите товары 'GROUP-TEST-001' (их должно быть 3)"
echo "   3. Нажмите '✅ Одобрить' на одном из них"
echo "   4. Должно появиться предупреждение о групповом удалении"
echo "   5. После подтверждения все 3 товара исчезнут из очереди"
echo "   6. Для отклонения подтверждение не требуется"
