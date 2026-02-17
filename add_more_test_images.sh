#!/bin/bash

echo "📸 Добавление тестовых товаров с картинками"
echo "=========================================="

API_URL="http://localhost:3000/api"
API_KEY="test_api_key_123456"

# Массив тестовых товаров с реальными картинками
declare -a test_products=(
    '{
        "image_url": "https://static.onlinetrade.ru/img/items/m/multimetr_resanta_dt_9208a_1611138252_1.jpg",
        "product_id": "DT9208A-IMG",
        "download_url": "http://img.instrumentstore.ru:5000/img/multimeter.jpg",
        "metadata": {
            "name": "Мультиметр Ресанта DT-9208A с дисплеем",
            "category": "электроизмерительные",
            "price": 1299,
            "description": "Цифровой мультиметр с большим дисплеем"
        }
    }'
    '{
        "image_url": "https://static.onlinetrade.ru/img/items/b/bokorezy_universalnye_stayer_0612_z01_1611138252_1.jpg",
        "product_id": "BOKOREZ-0612",
        "download_url": "http://img.instrumentstore.ru:5000/img/bokorezy.jpg",
        "metadata": {
            "name": "Бокорезы универсальные STAYER 0612-Z01",
            "category": "ручной инструмент",
            "brand": "STAYER",
            "material": "хромованадиевая сталь"
        }
    }'
    '{
        "image_url": "https://static.onlinetrade.ru/img/items/b/bolt_krepezhnyy_m10_1_5h60_st_3_kp_1611138252_1.jpg",
        "product_id": "BOLT-M10-60",
        "download_url": "http://img.instrumentstore.ru:5000/img/bolt.jpg",
        "metadata": {
            "name": "Болт крепежный М10×1.5×60 оцинкованный",
            "category": "крепеж",
            "material": "сталь оцинкованная",
            "package": "100 шт"
        }
    }'
    '{
        "image_url": "https://static.onlinetrade.ru/img/items/b/bit_s_reztsom_ph2_50_mm_stayer_03042_z01_1611138252_1.jpg",
        "product_id": "BIT-PH2-50",
        "download_url": "http://img.instrumentstore.ru:5000/img/bit.jpg",
        "metadata": {
            "name": "Бит с резцом PH2×50 мм STAYER",
            "category": "расходники",
            "type": "бит крестообразный",
            "length": "50 мм"
        }
    }'
    '{
        "image_url": "https://static.onlinetrade.ru/img/items/s/svarochnyy_apparat_resanta_sai_190_1611138252_1.jpg",
        "product_id": "SAI-190",
        "download_url": "http://img.instrumentstore.ru:5000/img/svarochniy.jpg",
        "metadata": {
            "name": "Сварочный аппарат Ресанта SAI-190",
            "category": "сварочное оборудование",
            "power": "6.7 кВт",
            "weight": "8.5 кг"
        }
    }'
)

echo ""
echo "Добавляю товары с картинками..."

for i in "${!test_products[@]}"; do
    echo ""
    echo "📦 Товар $((i+1)):"
    
    RESPONSE=$(curl -s -X POST "$API_URL/moderation/submit" \
        -H "X-API-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d "${test_products[$i]}")
    
    if echo "$RESPONSE" | grep -q "success"; then
        PRODUCT_NAME=$(echo "${test_products[$i]}" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
        echo "   ✅ Добавлен: $PRODUCT_NAME"
    else
        echo "   ❌ Ошибка: $RESPONSE"
    fi
    
    sleep 1
done

echo ""
echo "📊 Итоговая статистика:"

STATS_RESPONSE=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/stats")
QUEUE_RESPONSE=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/queue?limit=1")

approved=$(echo "$STATS_RESPONSE" | grep -o '"approved".*"count":[0-9]*' | grep -o '[0-9]*' | head -1)
rejected=$(echo "$STATS_RESPONSE" | grep -o '"rejected".*"count":[0-9]*' | grep -o '[0-9]*' | head -1)
in_queue=$(echo "$QUEUE_RESPONSE" | grep -o '"total":[0-9]*' | cut -d: -f2)

echo "   ✅ Одобрено: ${approved:-0}"
echo "   ❌ Отклонено: ${rejected:-0}"
echo "   ⏳ В очереди: ${in_queue:-0}"
echo "   📈 Всего: $(( ${approved:-0} + ${rejected:-0} + ${in_queue:-0} ))"

echo ""
echo "🌐 Веб-интерфейс с картинками:"
echo "   http://192.168.1.189:8080"
echo ""
echo "🎯 Теперь в очереди есть разнообразные товары с картинками!"
