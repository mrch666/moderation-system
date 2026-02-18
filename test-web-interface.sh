#!/bin/bash

echo "=== ТЕСТ ВЕБ-ИНТЕРФЕЙСА ==="
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Проверка доступности
echo "1. 🔍 ПРОВЕРКА ДОСТУПНОСТИ СЕРВИСОВ:"
echo ""

# Frontend
if curl -s "http://localhost:8080" > /dev/null; then
    echo -e "${GREEN}✅ Frontend доступен: http://localhost:8080${NC}"
    TITLE=$(curl -s "http://localhost:8080" | grep -o "<title>[^<]*</title>" | sed 's/<title>//;s/<\/title>//')
    echo "   Заголовок: $TITLE"
else
    echo -e "${RED}❌ Frontend недоступен${NC}"
fi

# Backend API
if curl -s "http://localhost:3000/health" > /dev/null; then
    echo -e "${GREEN}✅ Backend API доступен: http://localhost:3000${NC}"
else
    echo -e "${RED}❌ Backend API недоступен${NC}"
fi

echo ""

# 2. Проверка config.js
echo "2. ⚙️ ПРОВЕРКА КОНФИГУРАЦИИ:"
echo ""

CONFIG_URL="http://localhost:8080/config.js"
CONFIG_CONTENT=$(curl -s "$CONFIG_URL")

if [ -n "$CONFIG_CONTENT" ]; then
    echo -e "${GREEN}✅ config.js доступен${NC}"
    echo "   URL: $CONFIG_URL"
    echo ""
    echo "   Содержимое:"
    echo "$CONFIG_CONTENT" | head -15
else
    echo -e "${RED}❌ config.js недоступен${NC}"
fi

echo ""

# 3. Проверка API очереди
echo "3. 📋 ПРОВЕРКА ОЧЕРЕДИ ЧЕРЕЗ API:"
echo ""

API_RESPONSE=$(curl -s "http://localhost:3000/api/moderation/queue?limit=3" \
  -H "X-API-Key: test_api_key_123456")

if echo "$API_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ API очередь работает${NC}"
    TOTAL=$(echo "$API_RESPONSE" | grep -o '"total":[0-9]*' | cut -d: -f2)
    echo "   Всего элементов в очереди: $TOTAL"
    
    # Показываем первые 3 элемента
    echo ""
    echo "   Первые 3 элемента:"
    echo "$API_RESPONSE" | python3 -m json.tool 2>/dev/null | grep -A5 '"data": \[' | tail -20
else
    echo -e "${RED}❌ API очередь не работает${NC}"
    echo "   Ответ: $API_RESPONSE"
fi

echo ""

# 4. Проверка CORS
echo "4. 🌐 ПРОВЕРКА CORS (важно для frontend):"
echo ""

CORS_RESPONSE=$(curl -s -I "http://localhost:3000/api/moderation/queue?limit=1" \
  -H "Origin: http://localhost:8080" \
  -H "X-API-Key: test_api_key_123456" | grep -i "access-control")

if [ -n "$CORS_RESPONSE" ]; then
    echo -e "${GREEN}✅ CORS настроен${NC}"
    echo "   Заголовки: $CORS_RESPONSE"
else
    echo -e "${YELLOW}⚠️  CORS заголовки не найдены${NC}"
    echo "   Frontend может не работать из-за CORS политик"
fi

echo ""

# 5. Инструкция по отладке
echo "5. 🔧 ИНСТРУКЦИЯ ПО ОТЛАДКЕ ВЕБ-ИНТЕРФЕЙСА:"
echo ""
echo "   Если очередь не отображается в браузере:"
echo "   1. Откройте консоль разработчика (F12)"
echo "   2. Перейдите на вкладку 'Console'"
echo "   3. Проверьте ошибки JavaScript"
echo "   4. Перейдите на вкладку 'Network'"
echo "   5. Проверьте запросы к API"
echo "   6. Убедитесь, что запросы возвращают данные"
echo ""
echo "   Проверьте:"
echo "   - Ошибки CORS в консоли"
echo "   - Загрузку config.js"
echo "   - Запросы к /api/moderation/queue"
echo "   - Ответы от API"

echo ""
echo "🎯 ТЕСТ ЗАВЕРШЕН!"