#!/usr/bin/env node

/**
 * 🚀 Генератор конфигурации для системы модерации
 * Создает config.js для frontend из переменных окружения
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.development' });

// Определяем API URL
let apiUrl;
if (process.env.NODE_ENV === 'production') {
    // В production используем текущий хост
    apiUrl = `http://${process.env.FRONTEND_HOST || 'localhost'}:${process.env.PORT || 3000}/api`;
} else {
    // В development используем настройки из .env или localhost
    apiUrl = process.env.API_URL || 'http://localhost:3000/api';
}

// Конфигурация для frontend
const config = {
    API_URL: apiUrl,
    API_KEY: process.env.API_KEY || 'test_api_key_123456',
    ITEMS_PER_PAGE: 10,
    IMAGE_PREVIEW_WIDTH: 200,
    IMAGE_PREVIEW_HEIGHT: 150,
    AUTO_REFRESH_INTERVAL: 30000,
    CONFIRM_APPROVAL: true,
    CONFIRM_REJECTION: false,
    SHOW_SUCCESS_NOTIFICATIONS: true,
    SHOW_ERROR_NOTIFICATIONS: true,
    DEBUG: process.env.NODE_ENV !== 'production',
    LOG_API_CALLS: process.env.NODE_ENV !== 'production'
};

// Генерируем JavaScript файл
const configContent = `// 🚀 Конфигурация frontend системы модерации
// Сгенерировано автоматически из переменных окружения
// Время генерации: ${new Date().toISOString()}
// NODE_ENV: ${process.env.NODE_ENV || 'development'}

window.MODERATION_CONFIG = ${JSON.stringify(config, null, 2)};`;

// Записываем файл
const configPath = path.join(__dirname, 'simple-frontend', 'config.js');
fs.writeFileSync(configPath, configContent);

console.log('✅ Конфигурация сгенерирована:');
console.log(`   Файл: ${configPath}`);
console.log(`   API URL: ${config.API_URL}`);
console.log(`   Режим: ${process.env.NODE_ENV || 'development'}`);