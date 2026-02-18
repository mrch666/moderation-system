#!/usr/bin/env node

/**
 * 🚀 СУПЕР-ПРОСТОЙ сервер для frontend
 * Без зависимостей, без ошибок
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const HOST = '0.0.0.0'; // Слушаем на всех интерфейсах

console.log(`🚀 Запуск супер-простого frontend сервера на ${HOST}:${PORT}`);

// Простой config.js
const CONFIG_JS = `// 🚀 Конфигурация системы модерации
window.MODERATION_CONFIG = {
  "API_URL": "http://localhost:3000/api",
  "API_KEY": "test_api_key_123456",
  "DEBUG": true
};`;

// Читаем основной HTML файл
let MAIN_HTML = '';
try {
    MAIN_HTML = fs.readFileSync(path.join(__dirname, 'simple-index.html'), 'utf8');
    console.log('✅ Основной HTML файл загружен');
} catch (error) {
    MAIN_HTML = '<h1>Система модерации изображений</h1><p>Frontend сервер работает</p>';
    console.log('⚠️ Использую fallback HTML');
}

const server = http.createServer((req, res) => {
    console.log(`📥 ${req.method} ${req.url}`);
    
    // Устанавливаем CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(MAIN_HTML);
    } else if (req.url === '/config.js') {
        res.writeHead(200, { 
            'Content-Type': 'application/javascript; charset=utf-8',
            'Cache-Control': 'no-cache'
        });
        res.end(CONFIG_JS);
    } else if (req.url === '/test-simple.html') {
        try {
            const content = fs.readFileSync(path.join(__dirname, 'test-simple.html'), 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(content);
        } catch (error) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>Тестовая страница</h1><p>Файл не найден</p>');
        }
    } else if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'OK',
            service: 'Super Simple Frontend',
            port: PORT,
            host: HOST,
            timestamp: new Date().toISOString()
        }));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.on('error', (error) => {
    console.error('❌ Ошибка сервера:', error.message);
    if (error.code === 'EADDRINUSE') {
        console.log(`⚠️ Порт ${PORT} занят. Пробую порт ${PORT + 1}...`);
        // Можно добавить логику автоматического выбора порта
    }
});

server.listen(PORT, HOST, () => {
    console.log(`✅ Сервер запущен и слушает на:`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`   http://127.0.0.1:${PORT}`);
    console.log(`   http://192.168.1.189:${PORT}`);
    console.log(`   http://0.0.0.0:${PORT}`);
    console.log('');
    console.log('📋 Доступные endpoints:');
    console.log('   /              - Главная страница');
    console.log('   /config.js     - Конфигурация');
    console.log('   /test-simple.html - Тестовая страница');
    console.log('   /health        - Проверка здоровья');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Останавливаю сервер...');
    server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
});