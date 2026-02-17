#!/bin/bash

echo "✅ Демонстрация процесса модерации"
echo "================================="

API_URL="http://localhost:3000/api"
API_KEY="test_api_key_123456"

echo ""
echo "1. Одобряем несколько товаров:"

# Одобряем товары с ID 6, 7, 8
for id in 6 7 8; do
    echo ""
    echo "   Одобрение товара #$id:"
    RESPONSE=$(curl -s -X PUT "$API_URL/moderation/$id/moderate" \
        -H "X-API-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"status": "approved", "reason": "Изображение соответствует требованиям"}')
    
    if echo "$RESPONSE" | grep -q "success"; then
        echo "     ✅ Одобрено"
    else
        echo "     ❌ Ошибка: $RESPONSE"
    fi
    sleep 1
done

echo ""
echo "2. Отклоняем один товар:"

# Отклоняем товар с ID 9
echo ""
echo "   Отклонение товара #9:"
RESPONSE=$(curl -s -X PUT "$API_URL/moderation/9/moderate" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"status": "rejected", "reason": "Низкое качество изображения"}')

if echo "$RESPONSE" | grep -q "success"; then
    echo "     ✅ Отклонено"
else
    echo "     ❌ Ошибка: $RESPONSE"
fi

echo ""
echo "3. Проверяем обновленную очередь:"

QUEUE_RESPONSE=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/queue?limit=10")

if echo "$QUEUE_RESPONSE" | grep -q "success"; then
    TOTAL=$(echo "$QUEUE_RESPONSE" | grep -o '"total":[0-9]*' | cut -d: -f2)
    echo "   📋 Осталось в очереди: $TOTAL товаров"
    
    echo ""
    echo "📋 Текущая очередь:"
    echo "------------------"
    
    echo "$QUEUE_RESPONSE" | python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    if data.get('success') and data.get('data'):
        for i, item in enumerate(data['data'], 1):
            print(f'{i}. ID: {item[\"id\"]}')
            print(f'   Товар: {item[\"product_id\"]}')
            if item.get('metadata'):
                try:
                    meta = json.loads(item['metadata'])
                    if 'name' in meta:
                        print(f'   Название: {meta[\"name\"]}')
                except:
                    pass
            print(f'   Статус: {item[\"status\"]}')
            print()
    else:
        print('Очередь пуста')
except Exception as e:
    print(f'Ошибка: {e}')
" 2>/dev/null || echo "$QUEUE_RESPONSE"
else
    echo "   ❌ Ошибка: $QUEUE_RESPONSE"
fi

echo ""
echo "4. Проверяем статистику:"

STATS_RESPONSE=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/stats")

if echo "$STATS_RESPONSE" | grep -q "success"; then
    echo ""
    echo "📊 Статистика модерации:"
    echo "----------------------"
    
    echo "$STATS_RESPONSE" | python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    if data.get('success') and data.get('data'):
        for stat in data['data']:
            status_ru = {'approved': 'Одобрено', 'rejected': 'Отклонено', 'pending': 'В ожидании'}.get(stat['status'], stat['status'])
            count = stat['count']
            if 'avg_processing_time' in stat and stat['avg_processing_time']:
                avg_time = round(stat['avg_processing_time'] / 60, 1)
                print(f'{status_ru}: {count} (среднее время: {avg_time} мин)')
            else:
                print(f'{status_ru}: {count}')
except Exception as e:
    print(f'Ошибка: {e}')
" 2>/dev/null || echo "$STATS_RESPONSE"
fi

echo ""
echo "🌐 Веб-интерфейс для продолжения модерации:"
echo "   http://192.168.1.189:8080"
echo ""
echo "✅ Демонстрация завершена!"
