#!/bin/bash

echo "🔍 ПРОВЕРКА СИСТЕМЫ МОДЕРАЦИИ"
echo "============================"
echo "Время: $(date)"
echo ""

# Полные пути
BACKEND_DIR="/home/mrch/.openclaw/workspace/moderation-system/backend"
HTML_DIR="/home/mrch/.openclaw/workspace/moderation-system"

echo "📁 ДИРЕКТОРИИ:"
echo "   Backend: $BACKEND_DIR"
echo "   HTML файлы: $HTML_DIR"
echo ""

echo "📊 ПРОЦЕССЫ:"
PROCESSES=$(ps aux | grep -E "node.*simple-index" | grep -v grep)
if [ -z "$PROCESSES" ]; then
    echo "   ❌ Backend не запущен"
else
    echo "   ✅ Backend запущен:"
    echo "$PROCESSES" | while read line; do
        echo "      $line"
    done
fi
echo ""

echo "🌐 ПОРТЫ:"
echo "   Порт 3000 (backend): $(netstat -tln 2>/dev/null | grep :3000 >/dev/null && echo "✅ Открыт" || echo "❌ Закрыт")"
echo "   Порт 8080 (frontend): $(netstat -tln 2>/dev/null | grep :8080 >/dev/null && echo "✅ Открыт" || echo "❌ Закрыт")"
echo ""

echo "🔧 ПРОВЕРКА BACKEND:"
if curl -s "http://localhost:3000/health" >/dev/null 2>&1; then
    BACKEND_INFO=$(curl -s "http://localhost:3000/health" | python3 -c "import sys,json; data=json.load(sys.stdin); print(f'✅ {data[\"service\"]} v{data[\"version\"]}')" 2>/dev/null || echo "✅ Backend работает")
    echo "   $BACKEND_INFO"
    
    # Проверка API
    API_CHECK=$(curl -s "http://localhost:3000/api/moderation/queue?limit=1" -H "X-API-Key: test_api_key_123456" 2>/dev/null | python3 -c "import sys,json; data=json.load(sys.stdin); print(f'📊 Очередь: {data.get(\"pagination\",{}).get(\"total\",0)} элементов')" 2>/dev/null || echo "   📊 API доступен")
    echo "   $API_CHECK"
else
    echo "   ❌ Backend недоступен"
fi
echo ""

echo "📋 HTML ФАЙЛЫ:"
if [ -f "$HTML_DIR/ULTIMATE_WORKING.html" ]; then
    echo "   ✅ ULTIMATE_WORKING.html - Финальная версия"
else
    echo "   ❌ ULTIMATE_WORKING.html не найден"
fi

if [ -f "$HTML_DIR/local-moderation.html" ]; then
    echo "   ✅ local-moderation.html - Локальная версия"
else
    echo "   ❌ local-moderation.html не найден"
fi
echo ""

echo "📁 ЛОГИ:"
if [ -f "$BACKEND_DIR/backend.log" ]; then
    LOG_SIZE=$(du -h "$BACKEND_DIR/backend.log" | cut -f1)
    echo "   Backend лог: $BACKEND_DIR/backend.log ($LOG_SIZE)"
    echo "   Последние ошибки:"
    tail -5 "$BACKEND_DIR/backend.log" | grep -i "error\|fail\|❌" | head -3 | while read line; do
        echo "      - $line"
    done
else
    echo "   Backend лог: не найден"
fi
echo ""

echo "🎯 ИНСТРУКЦИЯ:"
echo "   1. Запустить backend: ./start-backend.sh"
echo "   2. Открыть в браузере: file://$HTML_DIR/ULTIMATE_WORKING.html"
echo "   3. Проверить: Нажать '🔧 Проверить Backend'"
echo "   4. Модерировать: Нажимать кнопки '✅ Одобрить' или '❌ Отклонить'"
echo ""
echo "🌐 Внешний доступ:"
echo "   Backend API: http://192.168.1.189:3000"
echo "   API ключ: test_api_key_123456"
echo ""