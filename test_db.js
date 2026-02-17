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
