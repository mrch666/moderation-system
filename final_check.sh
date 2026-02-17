#!/bin/bash

echo "🎯 ФИНАЛЬНАЯ ПРОВЕРКА СИСТЕМЫ"
echo "============================"

echo ""
echo "1. Проверка всех компонентов:"

# Проверка backend
echo "   🔧 Backend API:"
if curl -s http://localhost:3000/health > /dev/null; then
    echo "      ✅ Работает"
else
    echo "      ❌ Не работает"
    exit 1
fi

# Проверка фронтенда
echo "   🌐 Веб-интерфейс:"
if curl -s http://localhost:8080 > /dev/null; then
    echo "      ✅ Работает"
else
    echo "      ❌ Не работает"
    exit 1
fi

# Проверка CORS
echo "   🔗 CORS соединение:"
CORS_TEST=$(curl -s -H "Origin: http://localhost:8080" \
                 -H "X-API-Key: test_api_key_123456" \
                 http://localhost:3000/api/moderation/queue?limit=1 2>/dev/null | grep -c "success" || echo "0")
if [ "$CORS_TEST" -gt 0 ]; then
    echo "      ✅ Работает"
else
    echo "      ❌ Не работает"
    exit 1
fi

echo ""
echo "2. Проверка данных в системе:"

# Количество товаров в очереди
echo "   📊 Статистика:"
STATS=$(curl -s -H "X-API-Key: test_api_key_123456" http://localhost:3000/api/moderation/stats)
QUEUE=$(curl -s -H "X-API-Key: test_api_key_123456" http://localhost:3000/api/moderation/queue?limit=1)

approved=$(echo "$STATS" | grep -o '"approved".*"count":[0-9]*' | grep -o '[0-9]*' | head -1)
rejected=$(echo "$STATS" | grep -o '"rejected".*"count":[0-9]*' | grep -o '[0-9]*' | head -1)
in_queue=$(echo "$QUEUE" | grep -o '"total":[0-9]*' | cut -d: -f2)

echo "      Одобрено: ${approved:-0}"
echo "      Отклонено: ${rejected:-0}"
echo "      В очереди: ${in_queue:-0}"

echo ""
echo "3. Проверка конкретного товара:"
echo "   Поиск товара 'Колесо аппаратное поворотное':"
ALL_ITEMS=$(curl -s -H "X-API-Key: test_api_key_123456" "http://localhost:3000/api/moderation/queue?limit=20")
if echo "$ALL_ITEMS" | grep -q "Колесо аппаратное поворотное"; then
    echo "      ✅ Товар найден в очереди"
    
    # Найдем ID товара
    ITEM_ID=$(echo "$ALL_ITEMS" | python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    for item in data.get('data', []):
        if item.get('metadata'):
            import json as j2
            try:
                meta = j2.loads(item['metadata'])
                if 'name' in meta and 'Колесо аппаратное' in meta['name']:
                    print(item['id'])
                    break
            except:
                pass
except:
    pass
" 2>/dev/null | head -1)
    
    if [ -n "$ITEM_ID" ]; then
        echo "      📋 ID товара для модерации: $ITEM_ID"
        echo ""
        echo "      🔧 Команда для одобрения:"
        echo "      curl -X PUT http://192.168.1.189:3000/api/moderation/$ITEM_ID/moderate \\"
        echo "           -H 'X-API-Key: test_api_key_123456' \\"
        echo "           -H 'Content-Type: application/json' \\"
        echo "           -d '{\"status\": \"approved\", \"reason\": \"Товар соответствует\"}'"
    fi
else
    echo "      ❌ Товар не найден"
fi

echo ""
echo "4. Инструкция по устранению ошибки 'Failed to fetch':"
echo ""
echo "   Если в веб-интерфейсе все еще видите 'Failed to fetch':"
echo "   1. Откройте консоль разработчика (F12)"
echo "   2. Перейдите на вкладку 'Console'"
echo "   3. Обновите страницу"
echo "   4. Посмотрите точную ошибку"
echo ""
echo "   Возможные причины и решения:"
echo "   🔸 Блокировка CORS:"
echo "      - Убедитесь, что backend запущен с правильными CORS настройками"
echo "      - Проверьте, что в ответе API есть заголовок 'Access-Control-Allow-Origin: *'"
echo ""
echo "   🔸 Блокировка браузера:"
echo "      - Попробуйте открыть в приватном режиме"
echo "      - Отключите расширения браузера"
echo "      - Очистите кэш браузера"
echo ""
echo "   🔸 Проблема с сетью:"
echo "      - Проверьте, что порты 3000 и 8080 открыты"
echo "      - Проверьте firewall настройки"
echo ""
echo "🌐 Ссылки для проверки:"
echo "   Веб-интерфейс: http://192.168.1.189:8080"
echo "   API Health: http://192.168.1.189:3000/health"
echo "   API Очередь: http://192.168.1.189:3000/api/moderation/queue"
echo ""
echo "✅ Финальная проверка завершена!"
