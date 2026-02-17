#!/bin/bash

echo "🧪 Тестирование процесса модерации"
echo "================================="

API_URL="http://localhost:3000/api"
API_KEY="test_api_key_123456"

# Одобряем первую модерацию
echo ""
echo "1. Одобрение модерации #1:"
curl -s -X PUT "$API_URL/moderation/1/moderate" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved", "reason": "Тестовое одобрение"}' | python3 -m json.tool 2>/dev/null || \
  curl -s -X PUT "$API_URL/moderation/1/moderate" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"status": "approved", "reason": "Тестовое одобрение"}'
echo ""

# Отклоняем вторую модерацию
echo "2. Отклонение модерации #2:"
curl -s -X PUT "$API_URL/moderation/2/moderate" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "rejected", "reason": "Тестовое отклонение"}' | python3 -m json.tool 2>/dev/null || \
  curl -s -X PUT "$API_URL/moderation/2/moderate" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"status": "rejected", "reason": "Тестовое отклонение"}'
echo ""

# Проверяем обновленную очередь
echo "3. Проверка обновленной очереди:"
curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/queue?limit=5" | python3 -m json.tool 2>/dev/null || \
  curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/queue?limit=5"
echo ""

# Проверяем статистику
echo "4. Проверка статистики после модерации:"
curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/stats" | python3 -m json.tool 2>/dev/null || \
  curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/stats"
echo ""

# Проверяем статус конкретной модерации
echo "5. Проверка статуса модерации #1:"
curl -s "$API_URL/moderation/status/132195ca-beda-4873-a50a-eaf00c15013b" | python3 -m json.tool 2>/dev/null || \
  curl -s "$API_URL/moderation/status/132195ca-beda-4873-a50a-eaf00c15013b"
echo ""

echo "✅ Тестирование модерации завершено"
