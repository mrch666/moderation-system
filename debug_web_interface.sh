#!/bin/bash

echo "🔍 Диагностика веб-интерфейса"
echo "============================="

echo ""
echo "1. Проверка доступности API изнутри сервера:"
if curl -s http://localhost:3000/health > /dev/null; then
    echo "   ✅ API доступен на localhost:3000"
    curl -s http://localhost:3000/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/health
else
    echo "   ❌ API недоступен на localhost:3000"
fi

echo ""
echo "2. Проверка веб-интерфейса:"
if curl -s http://localhost:8080 > /dev/null; then
    echo "   ✅ Веб-интерфейс доступен на localhost:8080"
    
    # Проверяем, какой API URL используется в HTML
    echo ""
    echo "3. Проверка API URL в HTML:"
    HTML_CONTENT=$(curl -s http://localhost:8080)
    if echo "$HTML_CONTENT" | grep -q "const API_URL ="; then
        API_URL_IN_HTML=$(echo "$HTML_CONTENT" | grep "const API_URL =" | sed "s/.*const API_URL = '\([^']*\)'.*/\1/")
        echo "   📍 API URL в HTML: $API_URL_IN_HTML"
    else
        echo "   ❌ Не найден API URL в HTML"
    fi
    
    # Проверяем CORS
    echo ""
    echo "4. Проверка CORS заголовков:"
    curl -s -I -X OPTIONS http://localhost:3000/api/moderation/queue 2>/dev/null | grep -i "access-control" || echo "   CORS заголовки не найдены"
    
else
    echo "   ❌ Веб-интерфейс недоступен"
fi

echo ""
echo "5. Проверка сетевых соединений:"
echo "   Порт 3000 (API):"
ss -tulpn | grep :3000 || echo "   ❌ Порт 3000 не слушает"
echo ""
echo "   Порт 8080 (веб-интерфейс):"
ss -tulpn | grep :8080 || echo "   ❌ Порт 8080 не слушает"

echo ""
echo "6. Проверка из браузера (имитация):"
echo "   Запрос к API с браузера:"
curl -s -H "Origin: http://localhost:8080" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-API-Key" \
     -X OPTIONS http://localhost:3000/api/moderation/queue 2>/dev/null | head -10

echo ""
echo "7. Простой тест API:"
curl -s -H "X-API-Key: test_api_key_123456" \
     http://localhost:3000/api/moderation/queue?limit=1 | python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    if data.get('success'):
        print('   ✅ API работает, очередь содержит:', data.get('data', [])[0].get('product_id', 'нет данных'))
    else:
        print('   ❌ API ошибка:', data.get('error', 'неизвестная ошибка'))
except:
    print('   ❌ Не удалось получить ответ от API')
" 2>/dev/null || echo "   ❌ Ошибка выполнения запроса"

