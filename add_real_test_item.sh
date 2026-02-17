#!/bin/bash

echo "📦 Добавление тестового товара с реальным файлом на сервере"
echo "=========================================================="

API_URL="http://localhost:3000/api"
API_KEY="test_api_key_123456"

# Тестовый товар с реальным URL для скачивания
# Предполагаем, что файл доступен по http://img.instrumentstore.ru:5000/img/1_577050.jpg
REAL_ITEM='{
    "image_url": "https://static.onlinetrade.ru/img/items/b/pripoy_s_kanifolyu_sibrtekh_913385_d_2_mm_50_g_pos61_na_plastmassovoy_katushke_1611138252_1.jpg",
    "product_id": "REAL-FILE-TEST",
    "download_url": "http://img.instrumentstore.ru:5000/img/1_577050.jpg",
    "metadata": {
        "name": "Тестовый товар с реальным файлом на сервере",
        "category": "реальный-тест",
        "description": "Файл должен быть доступен по download_url"
    }
}'

echo ""
echo "1. Добавляем товар с реальным download_url:"
echo "   download_url: http://img.instrumentstore.ru:5000/img/1_577050.jpg"

RESPONSE=$(curl -s -X POST "$API_URL/moderation/submit" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$REAL_ITEM")

if echo "$RESPONSE" | grep -q "success"; then
    ITEM_ID=$(echo "$RESPONSE" | grep -o '"moderation_id":"[^"]*"' | cut -d'"' -f4)
    echo "   ✅ Товар добавлен, ID: $ITEM_ID"
    
    echo ""
    echo "2. Проверяем добавленный товар:"
    
    ITEM_DETAILS=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/queue" | \
      python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    for item in data.get('data', []):
        if item.get('product_id') == 'REAL-FILE-TEST':
            print(json.dumps(item, indent=2))
            break
except:
    print('{}')
" 2>/dev/null)
    
    if [ -n "$ITEM_DETAILS" ] && [ "$ITEM_DETAILS" != "{}" ]; then
        echo "$ITEM_DETAILS" | python3 -m json.tool
    fi
    
    echo ""
    echo "3. Тестируем загрузку файла:"
    echo "   Сначала проверим доступность файла на сервере..."
    
    # Проверяем доступность файла
    echo "   Проверка: curl -I http://img.instrumentstore.ru:5000/img/1_577050.jpg"
    echo "   (Если файл недоступен, тест не будет работать)"
    
    echo ""
    echo "4. Обновляем функцию загрузки в backend:"
    echo "   Нужно изменить логику:"
    echo "   1. Скачивать файл с download_url (а не image_url)"
    echo "   2. Загружать на целевой сервер :7990"
    
else
    echo "   ❌ Ошибка добавления товара"
    echo "$RESPONSE"
fi

echo ""
echo "📋 Следующие шаги:"
echo "   1. Обновить backend для использования download_url"
echo "   2. Протестировать скачивание реального файла"
echo "   3. Проверить загрузку на целевой сервер"
