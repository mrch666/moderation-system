#!/bin/bash

echo "🔧 Тестирование API загрузки изображений"
echo "======================================="

API_URL="http://localhost:3000/api"
API_KEY="test_api_key_123456"

echo ""
echo "1. Находим товар для теста:"

QUEUE_RESPONSE=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/queue?limit=5")

ITEM_ID=$(echo "$QUEUE_RESPONSE" | python3 -c "
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

if [ -n "$ITEM_ID" ]; then
    echo "   🆔 Найден товар UPLOAD-TEST-001, ID: $ITEM_ID"
    
    echo ""
    echo "2. Выполняем одобрение с загрузкой изображения:"
    echo "   (Проверяем логи backend для деталей загрузки)"
    
    APPROVE_RESPONSE=$(curl -s -X PUT "$API_URL/moderation/$ITEM_ID/moderate" \
        -H "X-API-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"status": "approved", "reason": "API тест загрузки изображения"}')
    
    echo "   📨 Ответ сервера:"
    echo "$APPROVE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$APPROVE_RESPONSE"
    
    echo ""
    echo "3. Проверяем логи backend:"
    echo "   Запустите в отдельном терминале:"
    echo "   cd moderation-system && tail -f backend/backend.log"
    echo ""
    echo "   Должны увидеть:"
    echo "   🔄 Загрузка изображения для товара UPLOAD-TEST-001..."
    echo "   📥 Изображение скачано: ... bytes"
    echo "   📤 Отправка на целевой сервер..."
    echo "   📨 Ответ от сервера: ..."
    
else
    echo "   ❌ Товар UPLOAD-TEST-001 не найден в очереди"
    echo "   📝 Добавьте его через веб-интерфейс или API"
fi

echo ""
echo "🌐 Веб-интерфейс для тестирования:"
echo "   http://192.168.1.189:8080"
echo ""
echo "📋 Ожидаемое поведение:"
echo "   1. При нажатии 'Одобрить' - предупреждение о загрузке"
echo "   2. В логах backend - процесс загрузки изображения"
echo "   3. В ответе API - информация о результате загрузки"
echo "   4. При ошибке - понятное сообщение"
