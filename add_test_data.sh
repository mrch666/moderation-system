#!/bin/bash

echo "📤 Добавление тестовых данных в очередь модерации"
echo "================================================"

API_URL="http://localhost:3000/api"
API_KEY="test_api_key_123456"

# Массив тестовых данных
declare -a test_items=(
    '{
        "image_url": "https://static.onlinetrade.ru/img/items/b/pripoy_s_kanifolyu_sibrtekh_913385_d_2_mm_50_g_pos61_na_plastmassovoy_katushke_1611138252_1.jpg",
        "product_id": "000001002CuQ",
        "download_url": "img.instrumentstore.ru:5000/img/1_577050.jpg",
        "metadata": {
            "name": "Колесо аппаратное поворотное SCg 55 125 мм (N) 1040530",
            "category": "инструменты",
            "source": "instrumentstore"
        }
    }'
    '{
        "image_url": "https://static.onlinetrade.ru/img/items/m/multimetr_resanta_dt_9208a_1611138252_1.jpg",
        "product_id": "DT9208A",
        "download_url": "img.instrumentstore.ru:5000/img/2_577051.jpg",
        "metadata": {
            "name": "Мультиметр Ресанта DT-9208A",
            "category": "электроника",
            "price": 1299
        }
    }'
    '{
        "image_url": "https://static.onlinetrade.ru/img/items/b/bokorezy_universalnye_stayer_0612_z01_1611138252_1.jpg",
        "product_id": "0612-Z01",
        "download_url": "img.instrumentstore.ru:5000/img/3_577052.jpg",
        "metadata": {
            "name": "Бокорезы универсальные STAYER 0612-Z01",
            "category": "инструменты",
            "brand": "STAYER"
        }
    }'
    '{
        "image_url": "https://static.onlinetrade.ru/img/items/b/bolt_krepezhnyy_m10_1_5h60_st_3_kp_1611138252_1.jpg",
        "product_id": "M10-60",
        "download_url": "img.instrumentstore.ru:5000/img/4_577053.jpg",
        "metadata": {
            "name": "Болт крепежный М10×1.5×60",
            "category": "крепеж",
            "material": "сталь"
        }
    }'
    '{
        "image_url": "https://static.onlinetrade.ru/img/items/b/bit_s_reztsom_ph2_50_mm_stayer_03042_z01_1611138252_1.jpg",
        "product_id": "03042-Z01",
        "download_url": "img.instrumentstore.ru:5000/img/5_577054.jpg",
        "metadata": {
            "name": "Бит с резцом PH2×50 мм STAYER 03042-Z01",
            "category": "инструменты",
            "type": "бит"
        }
    }'
)

echo ""
echo "Добавляю тестовые товары..."

for i in "${!test_items[@]}"; do
    echo ""
    echo "📦 Товар $((i+1)):"
    
    RESPONSE=$(curl -s -X POST "$API_URL/moderation/submit" \
        -H "X-API-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d "${test_items[$i]}")
    
    if echo "$RESPONSE" | grep -q "success"; then
        PRODUCT_NAME=$(echo "${test_items[$i]}" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
        MOD_ID=$(echo "$RESPONSE" | grep -o '"moderation_id":"[^"]*"' | cut -d'"' -f4)
        echo "   ✅ Добавлен: $PRODUCT_NAME"
        echo "   📋 ID модерации: $MOD_ID"
    else
        echo "   ❌ Ошибка: $RESPONSE"
    fi
    
    sleep 1
done

echo ""
echo "📊 Проверяем текущую очередь..."

QUEUE_RESPONSE=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/queue?limit=10")

if echo "$QUEUE_RESPONSE" | grep -q "success"; then
    TOTAL=$(echo "$QUEUE_RESPONSE" | grep -o '"total":[0-9]*' | cut -d: -f2)
    echo "   📋 Всего в очереди: $TOTAL товаров"
    
    echo ""
    echo "📋 Список товаров в очереди:"
    echo "----------------------------"
    
    # Извлекаем и выводим информацию о товарах
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
            print(f'   Отправлено: {item[\"submitted_at\"]}')
            print()
except Exception as e:
    print(f'Ошибка: {e}')
    print(sys.stdin.read())
" 2>/dev/null || echo "$QUEUE_RESPONSE"
else
    echo "   ❌ Ошибка получения очереди: $QUEUE_RESPONSE"
fi

echo ""
echo "🌐 Веб-интерфейс для модерации:"
echo "   http://192.168.1.189:8080"
echo ""
echo "🔧 API для проверки:"
echo "   curl -H 'X-API-Key: test_api_key_123456' \\"
echo "        http://192.168.1.189:3000/api/moderation/queue"
echo ""
echo "✅ Тестовые данные успешно добавлены!"
