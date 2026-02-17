#!/bin/bash

# Тестовый скрипт для проверки API системы модерации

set -e

API_URL="http://localhost:3000/api"
API_KEY="${1:-test_api_key_123}"

echo "🔍 Тестирование API системы модерации"
echo "API URL: $API_URL"
echo "API Key: $API_KEY"
echo ""

# Функция для выполнения запросов
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    echo "➡️  $method $endpoint"
    
    if [ -n "$data" ]; then
        curl -s -X "$method" \
            -H "X-API-Key: $API_KEY" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_URL$endpoint" | jq .
    else
        curl -s -H "X-API-Key: $API_KEY" \
            "$API_URL$endpoint" | jq .
    fi
    
    echo ""
    sleep 1
}

# Проверка здоровья системы
echo "1. Проверка здоровья системы..."
curl -s "$API_URL/../health" | jq .
echo ""

# Тестирование аутентификации
echo "2. Тестирование аутентификации..."
make_request "POST" "/auth/api-key" "{\"api_key\": \"$API_KEY\"}"

# Тестирование отправки на модерацию
echo "3. Отправка тестового изображения на модерацию..."
make_request "POST" "/moderation/submit" '{
    "image_url": "https://picsum.photos/800/600?random=1",
    "product_id": "TEST-001",
    "download_url": "https://picsum.photos/800/600?random=1",
    "metadata": {
        "category": "test",
        "description": "Тестовое изображение"
    }
}'

# Сохраняем UUID модерации
MODERATION_UUID=$(curl -s -X POST \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "image_url": "https://picsum.photos/800/600?random=2",
        "product_id": "TEST-002",
        "download_url": "https://picsum.photos/800/600?random=2"
    }' \
    "$API_URL/moderation/submit" | jq -r '.data.moderation_id')

echo "📋 Создана модерация с UUID: $MODERATION_UUID"
echo ""

# Проверка статуса
echo "4. Проверка статуса модерации..."
make_request "GET" "/moderation/status/$MODERATION_UUID"

# Получение очереди
echo "5. Получение очереди модерации..."
make_request "GET" "/moderation/queue?limit=5"

# Получение статистики
echo "6. Получение статистики..."
make_request "GET" "/moderation/stats"

# Поиск модераций
echo "7. Поиск модераций..."
make_request "GET" "/moderation/search?product_id=TEST-001"

# Получение настроек (требуются права администратора)
echo "8. Попытка получения настроек..."
curl -s -H "X-API-Key: $API_KEY" \
    "$API_URL/settings" | jq '.error // .data | {success: .success, has_data: (.data != null)}'

# Тестирование с неверным API ключом
echo "9. Тестирование с неверным API ключом..."
curl -s -H "X-API-Key: invalid_key" \
    "$API_URL/moderation/queue" | jq '.error // "Успешный запрос (не должно быть)"'

echo ""
echo "✅ Тестирование завершено!"
echo ""
echo "Для полного тестирования системы:"
echo "1. Запустите фронтенд: cd frontend && npm start"
echo "2. Откройте http://localhost:3000 в браузере"
echo "3. В консоли браузера выполните:"
echo "   localStorage.setItem('api_key', '$API_KEY'); location.reload();"
echo "4. Проверьте работу веб-интерфейса"
echo ""
echo "Для тестирования Telegram бота:"
echo "1. Настройте TELEGRAM_BOT_TOKEN в telegram-bot/.env"
echo "2. Запустите бота: cd telegram-bot && npm start"
echo "3. Напишите боту в Telegram: /start"