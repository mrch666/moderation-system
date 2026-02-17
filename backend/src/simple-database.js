const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class SimpleDatabase {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'moderation.db');
        this.initDatabase();
    }

    initDatabase() {
        // Создаем директорию для базы данных если нет
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('❌ Ошибка подключения к SQLite:', err.message);
            } else {
                console.log('✅ Подключено к SQLite базе данных');
                this.createTables();
            }
        });
    }

    createTables() {
        const queries = [
            // Пользователи
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id INTEGER UNIQUE,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'moderator', 'user')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1
            )`,

            // Настройки
            `CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT,
                description TEXT,
                category TEXT DEFAULT 'general',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Модерации
            `CREATE TABLE IF NOT EXISTS moderations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                moderation_uuid TEXT UNIQUE,
                image_url TEXT NOT NULL,
                product_id TEXT NOT NULL,
                download_url TEXT NOT NULL,
                status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing')),
                metadata TEXT,
                submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                moderated_at DATETIME,
                moderator_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (moderator_id) REFERENCES users (id)
            )`,

            // API ключи
            `CREATE TABLE IF NOT EXISTS api_keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                name TEXT,
                user_id INTEGER,
                permissions TEXT DEFAULT '["read", "submit"]',
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_used DATETIME,
                expires_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,

            // Telegram чаты
            `CREATE TABLE IF NOT EXISTS telegram_chats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chat_id INTEGER UNIQUE NOT NULL,
                chat_type TEXT CHECK (chat_type IN ('private', 'group', 'channel')),
                title TEXT,
                username TEXT,
                is_active BOOLEAN DEFAULT 1,
                settings TEXT DEFAULT '{"notifications": true}',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        queries.forEach((query, index) => {
            this.db.run(query, (err) => {
                if (err) {
                    console.error(`❌ Ошибка создания таблицы ${index + 1}:`, err.message);
                }
            });
        });

        // Добавляем начальные настройки
        this.initializeSettings();
        
        // Добавляем тестовый API ключ
        this.initializeApiKey();
    }

    initializeSettings() {
        const settings = [
            ['system_name', 'Moderation System', 'Название системы', 'general'],
            ['max_file_size', '10485760', 'Максимальный размер файла (байты)', 'upload'],
            ['allowed_image_types', 'jpg,jpeg,png,gif,webp', 'Разрешенные типы изображений', 'upload'],
            ['notification_enabled', 'true', 'Включить уведомления', 'notifications'],
            ['auto_approve_threshold', '0', 'Порог автоматического подтверждения', 'moderation'],
            ['retention_days', '90', 'Дни хранения логов', 'storage']
        ];

        settings.forEach(([key, value, description, category]) => {
            this.db.run(
                `INSERT OR IGNORE INTO settings (key, value, description, category) VALUES (?, ?, ?, ?)`,
                [key, value, description, category]
            );
        });
    }

    initializeApiKey() {
        const testApiKey = 'test_api_key_123456';
        this.db.run(
            `INSERT OR IGNORE INTO api_keys (key, name, permissions) VALUES (?, ?, ?)`,
            [testApiKey, 'Тестовый ключ', '["read", "submit", "moderate"]']
        );
    }

    query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}

module.exports = new SimpleDatabase();