const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('🔧 Исправление структуры базы данных...');

const db = new sqlite3.Database(path.join(__dirname, 'moderation.db'));

// Проверяем и добавляем недостающие колонки
const checkAndAddColumns = () => {
    return new Promise((resolve, reject) => {
        db.all("PRAGMA table_info(moderations)", (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            
            const columns = rows.map(row => row.name);
            console.log('Существующие колонки:', columns);
            
            const missingColumns = [];
            
            // Проверяем необходимые колонки
            if (!columns.includes('reason')) {
                missingColumns.push('reason TEXT');
            }
            
            if (missingColumns.length === 0) {
                console.log('✅ Все колонки существуют');
                resolve();
                return;
            }
            
            console.log('Добавляем недостающие колонки:', missingColumns);
            
            // SQLite не поддерживает ADD COLUMN IF NOT EXISTS, поэтому делаем через try-catch
            const addColumnPromises = missingColumns.map(colDef => {
                return new Promise((resolveCol, rejectCol) => {
                    const colName = colDef.split(' ')[0];
                    db.run(`ALTER TABLE moderations ADD COLUMN ${colDef}`, (err) => {
                        if (err) {
                            if (err.message.includes('duplicate column name')) {
                                console.log(`Колонка ${colName} уже существует`);
                                resolveCol();
                            } else {
                                rejectCol(err);
                            }
                        } else {
                            console.log(`✅ Колонка ${colName} добавлена`);
                            resolveCol();
                        }
                    });
                });
            });
            
            Promise.all(addColumnPromises)
                .then(resolve)
                .catch(reject);
        });
    });
};

// Запускаем исправление
checkAndAddColumns()
    .then(() => {
        console.log('✅ Структура базы данных исправлена');
        db.close();
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Ошибка:', err);
        db.close();
        process.exit(1);
    });
