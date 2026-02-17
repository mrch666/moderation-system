#!/bin/bash

echo "🔧 Отладка статистики"
echo "===================="

API_URL="http://localhost:3000/api"
API_KEY="test_api_key_123456"

echo ""
echo "1. Проверяем другие endpoints:"

echo "   Health:"
curl -s http://localhost:3000/health | python3 -m json.tool

echo ""
echo "   Очередь:"
curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/queue?limit=1" | python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    if data.get('success'):
        print('   ✅ Работает, товаров:', len(data.get('data', [])))
    else:
        print('   ❌ Ошибка:', data.get('error', 'неизвестная'))
except:
    print('   ❌ Ошибка парсинга')
"

echo ""
echo "2. Проверяем логи на ошибки статистики:"
grep -i "stats" backend/backend.log | tail -5

echo ""
echo "3. Проверяем доступность базы данных через простой запрос:"

# Создаем простой тестовый endpoint
cat > test_db.js << 'JS'
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/moderation.db');

console.log('🔍 Проверка базы данных...');

// Проверяем количество записей
db.get('SELECT COUNT(*) as count FROM moderations', (err, row) => {
    if (err) {
        console.error('❌ Ошибка базы данных:', err.message);
    } else {
        console.log(`✅ Записей в moderations: ${row.count}`);
    }
    
    // Проверяем структуру
    db.all('PRAGMA table_info(moderations)', (err, rows) => {
        if (err) {
            console.error('❌ Ошибка структуры:', err.message);
        } else {
            console.log('✅ Структура таблицы moderations:');
            rows.forEach(r => console.log(`   ${r.name} (${r.type})`));
        }
        db.close();
    });
});
JS

cd backend && node ../test_db.js

echo ""
echo "4. Проверяем веб-интерфейс:"
echo "   🌐 Откройте: http://192.168.1.189:8080"
echo "   📋 Должны работать:"
echo "   - Дашборд (статистика)"
echo "   - Очередь"
echo "   - Отправка"
echo "   - Настройки"
