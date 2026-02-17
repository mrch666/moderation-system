const fs = require('fs');
const path = require('path');

// Простой SQLite клиент без зависимостей
const dbPath = path.join(__dirname, 'backend/moderation.db');

// Проверяем существование файла
if (!fs.existsSync(dbPath)) {
    console.error('Файл базы данных не найден:', dbPath);
    process.exit(1);
}

console.log('Добавляем колонку reason в таблицу moderations...');

// Используем child process для выполнения sqlite3
const { exec } = require('child_process');

const commands = [
    'sqlite3 backend/moderation.db "ALTER TABLE moderations ADD COLUMN reason TEXT;"',
    'sqlite3 backend/moderation.db ".schema moderations"'
];

function runCommand(cmd, index) {
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            if (error.message.includes('command not found')) {
                console.log('sqlite3 не установлен. Используем альтернативный метод...');
                // Создаем простой скрипт для добавления колонки
                createMigrationScript();
                return;
            }
            if (error.message.includes('duplicate column name')) {
                console.log('Колонка reason уже существует');
            } else {
                console.error(`Ошибка выполнения команды: ${error.message}`);
            }
        } else {
            console.log(stdout);
        }
        
        if (index < commands.length - 1) {
            runCommand(commands[index + 1], index + 1);
        } else {
            console.log('✅ Готово!');
        }
    });
}

function createMigrationScript() {
    console.log('Создаем миграционный скрипт...');
    
    const migrationScript = `
// Миграция для добавления колонки reason
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('moderation.db');

db.serialize(() => {
    // Проверяем существование колонки
    db.get("PRAGMA table_info(moderations)", (err, rows) => {
        if (err) {
            console.error('Ошибка проверки структуры:', err);
            return;
        }
        
        const hasReason = rows.some(row => row.name === 'reason');
        
        if (!hasReason) {
            console.log('Добавляем колонку reason...');
            db.run("ALTER TABLE moderations ADD COLUMN reason TEXT", (err) => {
                if (err) {
                    console.error('Ошибка добавления колонки:', err);
                } else {
                    console.log('✅ Колонка reason добавлена');
                }
                db.close();
            });
        } else {
            console.log('✅ Колонка reason уже существует');
            db.close();
        }
    });
});
`;

    fs.writeFileSync(path.join(__dirname, 'backend/add_reason_column.js'), migrationScript);
    console.log('📄 Скрипт создан: backend/add_reason_column.js');
    console.log('Запустите: cd backend && node add_reason_column.js');
}

// Запускаем первую команду
runCommand(commands[0], 0);
