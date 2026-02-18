#!/usr/bin/env node

/**
 * 🚀 Исправленный сервер для frontend
 * Обслуживает config.js и HTML
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const HOST = '0.0.0.0';

console.log(`🚀 Исправленный frontend сервер запущен на ${HOST}:${PORT}`);

// Конфигурация
const CONFIG = {
    API_URL: 'http://localhost:3000/api',
    API_KEY: 'test_api_key_123456',
    DEBUG: true
};

const CONFIG_JS = `// 🚀 Конфигурация системы модерации
window.MODERATION_CONFIG = ${JSON.stringify(CONFIG, null, 2)};`;

const server = http.createServer((req, res) => {
    console.log(`📥 ${req.method} ${req.url}`);
    
    // CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (req.url === '/' || req.url === '/index.html') {
        serveFile(res, 'simple-index.html', 'text/html');
    } else if (req.url === '/config.js') {
        res.writeHead(200, { 
            'Content-Type': 'application/javascript; charset=utf-8',
            'Cache-Control': 'no-cache'
        });
        res.end(CONFIG_JS);
    } else if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'OK',
            service: 'Fixed Frontend Server',
            port: PORT,
            config: CONFIG
        }));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

function serveFile(res, filename, contentType) {
    const filePath = path.join(__dirname, filename);
    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error(`❌ Ошибка чтения ${filename}:`, err.message);
            res.writeHead(500);
            res.end('Error loading page');
            return;
        }
        
        res.writeHead(200, { 
            'Content-Type': contentType,
            'Cache-Control': 'no-cache'
        });
        res.end(data);
    });
}

server.listen(PORT, HOST, () => {
    console.log(`✅ Сервер запущен:`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`   http://192.168.1.189:${PORT}`);
    console.log('');
    console.log('📋 Endpoints:');
    console.log('   /          - Главная страница');
    console.log('   /config.js - Конфигурация');
    console.log('   /health    - Проверка здоровья');
});

process.on('SIGINT', () => {
    console.log('\n🛑 Останавливаю сервер...');
    server.close();
    process.exit(0);
});