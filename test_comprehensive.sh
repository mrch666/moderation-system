#!/bin/bash

echo "🧪 Комплексное тестирование системы модерации"
echo "============================================"

API_URL="http://localhost:3000/api"
API_KEY="test_api_key_123456"

# 1. Тест здоровья
echo ""
echo "1. Тест здоровья системы:"
curl -s "$API_URL/../health" | python3 -m json.tool 2>/dev/null || curl -s "$API_URL/../health"
echo ""

# 2. Тест аутентификации
echo "2. Тест аутентификации:"
curl -s -X POST "$API_URL/auth/api-key" \
  -H "Content-Type: application/json" \
  -d "{\"api_key\": \"$API_KEY\"}" | python3 -m json.tool 2>/dev/null || \
  curl -s -X POST "$API_URL/auth/api-key" \
    -H "Content-Type: application/json" \
    -d "{\"api_key\": \"$API_KEY\"}"
echo ""

# 3. Тест с неверным ключом
echo "3. Тест с неверным API ключом:"
curl -s -H "X-API-Key: wrong_key" "$API_URL/moderation/queue" | python3 -m json.tool 2>/dev/null || \
  curl -s -H "X-API-Key: wrong_key" "$API_URL/moderation/queue"
echo ""

# 4. Тест отправки с метаданными
echo "4. Тест отправки с метаданными:"
curl -s -X POST "$API_URL/moderation/submit" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://picsum.photos/800/600?random=999",
    "product_id": "PROD-META-001",
    "download_url": "https://picsum.photos/800/600?random=999",
    "metadata": {
      "category": "electronics",
      "price": 29999,
      "vendor": "Test Vendor",
      "tags": ["new", "featured", "sale"]
    }
  }' | python3 -m json.tool 2>/dev/null || \
  curl -s -X POST "$API_URL/moderation/submit" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "image_url": "https://picsum.photos/800/600?random=999",
      "product_id": "PROD-META-001",
      "download_url": "https://picsum.photos/800/600?random=999",
      "metadata": {
        "category": "electronics",
        "price": 29999,
        "vendor": "Test Vendor",
        "tags": ["new", "featured", "sale"]
      }
    }'
echo ""

# 5. Тест получения очереди
echo "5. Тест получения очереди:"
curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/queue?limit=5" | python3 -m json.tool 2>/dev/null || \
  curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/queue?limit=5"
echo ""

# 6. Тест статистики
echo "6. Тест статистики:"
curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/stats" | python3 -m json.tool 2>/dev/null || \
  curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/stats"
echo ""

# 7. Тест настроек
echo "7. Тест настроек:"
curl -s -H "X-API-Key: $API_KEY" "$API_URL/settings" | python3 -m json.tool 2>/dev/null || \
  curl -s -H "X-API-Key: $API_KEY" "$API_URL/settings"
echo ""

# 8. Тест информации о пользователе
echo "8. Тест информации о пользователе:"
curl -s -H "X-API-Key: $API_KEY" "$API_URL/auth/me" | python3 -m json.tool 2>/dev/null || \
  curl -s -H "X-API-Key: $API_KEY" "$API_URL/auth/me"
echo ""

echo "✅ Комплексное тестирование завершено"
