#!/bin/bash

echo "🔍 Полная проверка системы"
echo "========================="

API_URL="http://localhost:3000/api"
API_KEY="test_api_key_123456"

echo ""
echo "1. Проверка здоровья системы:"
if curl -s http://localhost:3000/health > /dev/null; then
    echo "   ✅ Backend работает"
else
    echo "   ❌ Backend не работает"
    exit 1
fi

echo ""
echo "2. Проверка веб-интерфейса:"
if curl -s http://localhost:8080 > /dev/null; then
    echo "   ✅ Веб-интерфейс работает"
else
    echo "   ❌ Веб-интерфейс не работает"
    exit 1
fi

echo ""
echo "3. Добавляем тестовый товар:"

TEST_ITEM='{
    "image_url": "https://via.placeholder.com/400x300?text=System+Test",
    "product_id": "SYSTEM-CHECK-001",
    "download_url": "https://via.placeholder.com/400x300?text=Download+Test",
    "metadata": {
        "name": "Тест системы на полный цикл",
        "category": "системный-тест"
    }
}'

RESPONSE=$(curl -s -X POST "$API_URL/moderation/submit" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$TEST_ITEM")

if echo "$RESPONSE" | grep -q "success"; then
    echo "   ✅ Товар добавлен"
    ITEM_ID=$(echo "$RESPONSE" | python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    if data.get('success'):
        # Находим числовой ID через очередь
        import subprocess
        queue_resp = subprocess.check_output([
            'curl', '-s', '-H', 'X-API-Key: test_api_key_123456',
            'http://localhost:3000/api/moderation/queue'
        ])
        queue_data = json.loads(queue_resp)
        for item in queue_data.get('data', []):
            if item.get('product_id') == 'SYSTEM-CHECK-001':
                print(item['id'])
                break
except:
    print('')
" 2>/dev/null)
    
    if [ -n "$ITEM_ID" ]; then
        echo "   🆔 ID товара: $ITEM_ID"
        
        echo ""
        echo "4. Тестируем отклонение (без подтверждения):"
        
        REJECT_RESPONSE=$(curl -s -X PUT "$API_URL/moderation/$ITEM_ID/moderate" \
            -H "X-API-Key: $API_KEY" \
            -H "Content-Type: application/json" \
            -d '{"status": "rejected", "reason": "Тест системы - отклонение"}')
        
        if echo "$REJECT_RESPONSE" | grep -q "success"; then
            echo "   ✅ Отклонение работает"
        else
            echo "   ❌ Ошибка отклонения:"
            echo "$REJECT_RESPONSE"
        fi
        
    else
        echo "   ❌ Не удалось найти ID товара"
    fi
else
    echo "   ❌ Ошибка добавления товара:"
    echo "$RESPONSE"
fi

echo ""
echo "5. Проверяем статистику:"

STATS_RESPONSE=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/stats")

if echo "$STATS_RESPONSE" | grep -q "success"; then
    echo "   ✅ Статистика работает"
    echo "$STATS_RESPONSE" | python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    if data.get('success'):
        print('   📊 Статистика модерации:')
        for stat in data.get('data', []):
            status = stat.get('status', 'unknown')
            count = stat.get('count', 0)
            if 'avg_processing_time' in stat and stat['avg_processing_time']:
                avg_time = round(stat['avg_processing_time'] / 60, 1)
                print(f'      {status}: {count} (среднее время: {avg_time} мин)')
            else:
                print(f'      {status}: {count}')
except:
    print('   ❌ Ошибка парсинга статистики')
" 2>/dev/null
else
    echo "   ❌ Ошибка получения статистики"
fi

echo ""
echo "6. Проверяем веб-интерфейс в браузере:"
echo "   🌐 Откройте: http://192.168.1.189:8080"
echo ""
echo "7. Проверяем логи на ошибки:"
ERROR_COUNT=$(grep -i "error\|exception\|fail" backend/backend.log | grep -v "HTTP 404" | grep -v "HTTP 403" | wc -l)
if [ "$ERROR_COUNT" -eq 0 ]; then
    echo "   ✅ Логи чистые (кроме ожидаемых HTTP ошибок)"
else
    echo "   ⚠️ Найдено ошибок в логах: $ERROR_COUNT"
    echo "   Последние ошибки:"
    grep -i "error\|exception\|fail" backend/backend.log | tail -5
fi

echo ""
echo "✅ Проверка завершена!"
