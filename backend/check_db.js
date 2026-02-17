// Простая проверка базы данных
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('moderation.db');

console.log('🔍 Проверка базы данных напрямую...');

// 1. Проверяем таблицу moderations
db.all('SELECT status, COUNT(*) as count FROM moderations GROUP BY status', (err, rows) => {
    if (err) {
        console.error('❌ Ошибка запроса moderations:', err.message);
    } else {
        console.log('📊 moderations статистика:');
        if (rows.length === 0) {
            console.log('   (таблица пуста)');
        } else {
            rows.forEach(row => {
                console.log(`   ${row.status}: ${row.count}`);
            });
        }
    }
    
    // 2. Проверяем общее количество
    db.get('SELECT COUNT(*) as total FROM moderations', (err, row) => {
        if (err) {
            console.error('❌ Ошибка подсчета:', err.message);
        } else {
            console.log(`📈 Всего записей: ${row.total}`);
        }
        
        db.close();
    });
});
