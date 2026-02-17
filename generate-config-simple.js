#!/usr/bin/env node

/**
 * 🚀 Простой генератор конфигурации для системы модерации
 */

const fs = require('fs');
const path = require('path');

// Читаем .env файл если существует
let envVars = {};
try {
    const envPath = path.join(__dirname, '.env.development');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                envVars[match[1]] = match[2];
            }
        });
    }
} catch (error) {
    console.log('⚠️  Не удалось прочитать .env файл, используем значения по умолчанию');
}

// Определяем API URL
const apiUrl = envVars.API_URL || 'http://localhost:3000/api';
const apiKey = envVars.API_KEY || 'test_api_key_123456';
const nodeEnv = envVars.NODE_ENV || 'development';

// Конфигурация для frontend
const config = {
    API_URL: apiUrl,
    API_KEY: apiKey,
    ITEMS_PER_PAGE: 10,
    IMAGE_PREVIEW_WIDTH: 200,
    IMAGE_PREVIEW_HEIGHT: 150,
    AUTO_REFRESH_INTERVAL: 30000,
    CONFIRM_APPROVAL: true,
    CONFIRM_REJECTION: false,
    SHOW_SUCCESS_NOTIFICATIONS: true,
    SHOW_ERROR_NOTIFICATIONS: true,
    DEBUG: nodeEnv !== 'production',
    LOG_API_CALLS: nodeEnv !== 'production'
};

// Генерируем JavaScript файл
const configContent = `// 🚀 Конфигурация frontend системы модерации
// Сгенерировано автоматически из переменных окружения
// Время генерации: ${new Date().toISOString()}
// NODE_ENV: ${nodeEnv}

window.MODERATION_CONFIG = ${JSON.stringify(config, null, 2)};`;

// Записываем файл
const configPath = path.join(__dirname, 'simple-frontend', 'config.js');
fs.writeFileSync(configPath, configContent);

console.log('✅ Конфигурация сгенерирована:');
console.log(`   Файл: ${configPath}`);
console.log(`   API URL: ${config.API_URL}`);
console.log(`   Режим: ${nodeEnv}`);
console.log(`   API Key: ${apiKey ? 'Установлен' : 'По умолчанию'}`);