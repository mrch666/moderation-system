#!/bin/bash

echo "📤 Добавление корректного товара"
echo "================================"

API_URL="http://localhost:3000/api"
API_KEY="test_api_key_123456"

# Корректный товар с правильным URL
CORRECT_ITEM='{
    "image_url": "https://static.onlinetrade.ru/img/items/b/pripoy_s_kanifolyu_sibrtekh_913385_d_2_mm_50_g_pos61_na_plastmassovoy_katushke_1611138252_1.jpg",
    "product_id": "000001002CuQ",
    "download_url": "http://img.instrumentstore.ru:5000/img/1_577050.jpg",
    "metadata": {
        "name": "Колесо аппаратное поворотное SCg 55 125 мм (N) 1040530",
        "modelid": "000001002CuQ",
        "source": "instrumentstore"
    }
}'

echo ""
echo "1. Отправка корректного товара:"

RESPONSE=$(curl -s -X POST "$API_URL/moderation/submit" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$CORRECT_ITEM")

echo "Ответ:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

echo ""
echo "2. Проверка всех товаров в очереди:"

QUEUE_RESPONSE=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/queue?limit=20")

if echo "$QUEUE_RESPONSE" | grep -q "success"; then
    TOTAL=$(echo "$QUEUE_RESPONSE" | grep -o '"total":[0-9]*' | cut -d: -f2)
    echo "   📋 Всего товаров в очереди: $TOTAL"
    
    echo ""
    echo "📋 Детальный список:"
    echo "$QUEUE_RESPONSE" | python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    if data.get('success') and data.get('data'):
        print('ID  | Товар ID        | Название')
        print('----|-----------------|--------------------------------')
        for item in data['data']:
            name = 'Без названия'
            if item.get('metadata'):
                try:
                    meta = json.loads(item['metadata'])
                    if 'name' in meta:
                        name = meta['name'][:40] + ('...' if len(meta['name']) > 40 else '')
                except:
                    pass
            print(f'{item[\"id\"]:3} | {item[\"product_id\"]:15} | {name}')
except Exception as e:
    print(f'Ошибка: {e}')
" 2>/dev/null || echo "Не удалось распарсить JSON"
else
    echo "   ❌ Ошибка: $QUEUE_RESPONSE"
fi

echo ""
echo "3. Инструкция по модерации:"
echo "   🌐 Веб-интерфейс: http://192.168.1.189:8080"
echo "   🔧 API для модерации товара #11:"
echo "   curl -X PUT http://192.168.1.189:3000/api/moderation/11/moderate \\"
echo "        -H 'X-API-Key: test_api_key_123456' \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"status\": \"approved\", \"reason\": \"Товар соответствует\"}'"
