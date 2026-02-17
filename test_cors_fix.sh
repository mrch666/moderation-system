#!/bin/bash

echo "🔧 Тестирование исправления CORS"
echo "================================"

echo ""
echo "1. Проверка CORS заголовков API:"
curl -s -I -H "Origin: http://localhost:8080" \
     http://localhost:3000/api/moderation/queue 2>/dev/null | grep -i "access-control" || echo "   CORS заголовки не найдены"

echo ""
echo "2. Тест запроса с Origin (имитация браузера):"
curl -s -H "Origin: http://localhost:8080" \
     -H "X-API-Key: test_api_key_123456" \
     http://localhost:3000/api/moderation/queue?limit=1 | python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    if data.get('success'):
        print('   ✅ CORS работает! Очередь содержит:', len(data.get('data', [])), 'товаров')
        if data['data']:
            print('   📋 Первый товар:', data['data'][0].get('product_id'))
    else:
        print('   ❌ Ошибка API:', data.get('error', 'неизвестная ошибка'))
except Exception as e:
    print('   ❌ Ошибка:', str(e))
" 2>/dev/null

echo ""
echo "3. Проверка веб-интерфейса через curl:"
curl -s http://localhost:8080 | grep -q "Система модерации изображений" && \
    echo "   ✅ Веб-интерфейс загружается" || \
    echo "   ❌ Веб-интерфейс не загружается"

echo ""
echo "4. Создание простого HTML теста:"
cat > /tmp/test_cors.html << 'HTML'
<!DOCTYPE html>
<html>
<body>
<h1>Тест CORS</h1>
<button onclick="test()">Тест API</button>
<div id="result"></div>
<script>
async function test() {
    try {
        const response = await fetch('http://localhost:3000/api/moderation/queue?limit=1', {
            headers: { 'X-API-Key': 'test_api_key_123456' }
        });
        const data = await response.json();
        document.getElementById('result').innerHTML = 
            '<div style="color:green">✅ Успех! Товаров: ' + data.data.length + '</div>';
    } catch (error) {
        document.getElementById('result').innerHTML = 
            '<div style="color:red">❌ Ошибка: ' + error.message + '</div>';
    }
}
</script>
</body>
</html>
HTML
echo "   📄 Тестовая страница создана: /tmp/test_cors.html"

echo ""
echo "🌐 Доступные адреса:"
echo "   Веб-интерфейс: http://192.168.1.189:8080"
echo "   API: http://192.168.1.189:3000"
echo "   Тест CORS: Откройте /tmp/test_cors.html в браузере"
echo ""
echo "📋 Если ошибка 'Failed to fetch' осталась:"
echo "   1. Откройте консоль разработчика в браузере (F12)"
echo "   2. Перейдите на вкладку 'Network'"
echo "   3. Обновите страницу"
echo "   4. Посмотрите на запросы к API - будут видны ошибки CORS"
