const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Создаем таблицу для отслеживания миграций
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Получаем список примененных миграций
    const { rows: appliedMigrations } = await client.query(
      'SELECT name FROM migrations ORDER BY id'
    );
    const appliedNames = appliedMigrations.map(m => m.name);

    // Читаем файлы миграций
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`📁 Found ${migrationFiles.length} migration files`);

    // Применяем миграции
    for (const file of migrationFiles) {
      if (!appliedNames.includes(file)) {
        console.log(`🔄 Applying migration: ${file}`);
        
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        
        // Выполняем миграцию в транзакции
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
          await client.query('COMMIT');
          console.log(`✅ Migration applied: ${file}`);
        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`❌ Error applying migration ${file}:`, error.message);
          throw error;
        }
      } else {
        console.log(`⏭️  Skipping already applied migration: ${file}`);
      }
    }

    console.log('🎉 All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Запуск миграций
runMigrations();