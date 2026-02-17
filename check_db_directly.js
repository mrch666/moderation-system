// Простая проверка базы данных
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/moderation.db');

console.log('🔍 Проверка базы данных напрямую...');

// 1. Проверяем таблицу moderations
db.all('SELECT status, COUNT(*) as count FROM moderations GROUP BY status', (err, rows) => {
    if (err) {
        console.error('❌ Ошибка запроса moderations:', err.message);
    } else {
        console.log('📊 moderations статистика:');
        rows.forEach(row => {
            console.log(`   ${row.status}: ${row.count}`);
        });
        if (rows.length === 0) {
            console.log('   (таблица пуста)');
        }
    }
    
    // 2. Проверяем таблицу api_keys
    db.all('SELECT key, user_id, is_active FROM api_keys', (err, keys) => {
        if (err) {
            console.error('❌ Ошибка запроса api_keys:', err.message);
        } else {
            console.log('🔑 API ключи:');
            keys.forEach(key => {
                console.log(`   ${key.key} (user: ${key.user_id}, active: ${key.is_active})`);
            });
        }
        
        db.close();
    });
});
