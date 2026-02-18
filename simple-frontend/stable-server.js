#!/usr/bin/env node

/**
 * 🚀 Стабильный сервер для frontend системы модерации
 * С обработкой ошибок и автоматическим восстановлением
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Читаем переменные окружения из .env.development если существует
let envVars = {};
try {
    const envPath = path.join(__dirname, '..', '.env.development');
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
    console.log('⚠️ Не удалось прочитать .env файл, используем значения по умолчанию');
}

const PORT = envVars.FRONTEND_PORT || 8080;
const API_URL = envVars.API_URL || 'http://localhost:3000/api';
const API_KEY = envVars.API_KEY || 'test_api_key_123456';

console.log('🚀 Запуск стабильного frontend сервера...');
console.log(`📁 Рабочая директория: ${__dirname}`);
console.log(`🌐 Порт: ${PORT}`);
console.log(`🔗 API URL: ${API_URL}`);
console.log(`🔑 API Key: ${API_KEY ? 'Установлен' : 'Не установлен'}`);

// Функция для безопасного чтения файлов
function safeReadFile(filePath, res, contentType, fallback = '') {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error(`❌ Ошибка чтения файла ${filePath}:`, err.message);
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(fallback);
            return;
        }
        
        res.writeHead(200, { 
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.end(data);
    });
}

// Функция для проксирования запросов к backend
function proxyToBackend(req, res) {
    console.log(`🔍 PROXY: ${req.method} ${req.url}`);
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: req.url,
        method: req.method,
        headers: { 
            ...req.headers, 
            host: 'localhost:3000',
            connection: 'close'
        }
    };
    
    const proxyReq = http.request(options, (proxyRes) => {
        console.log(`🔍 PROXY RESPONSE: ${proxyRes.statusCode} ${req.url}`);
        
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
        console.error('❌ PROXY ERROR:', err.message);
        res.writeHead(502, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ 
            error: 'Bad Gateway', 
            message: 'Backend недоступен',
            details: err.message 
        }));
    });
    
    // Проксируем тело запроса если есть
    if (req.method === 'POST' || req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            proxyReq.write(body);
            proxyReq.end();
        });
    } else {
        proxyReq.end();
    }
}

// Функция для обслуживания config.js
function serveConfigJs(res) {
    const configContent = `// 🚀 Конфигурация frontend системы модерации
// Сгенерировано стабильным сервером
// Время: ${new Date().toISOString()}

window.MODERATION_CONFIG = {
  "API_URL": "/api",
  "API_KEY": "${API_KEY}",
  "ITEMS_PER_PAGE": 10,
  "IMAGE_PREVIEW_WIDTH": 200,
  "IMAGE_PREVIEW_HEIGHT": 150,
  "AUTO_REFRESH_INTERVAL": 30000,
  "CONFIRM_APPROVAL": true,
  "CONFIRM_REJECTION": false,
  "SHOW_SUCCESS_NOTIFICATIONS": true,
  "SHOW_ERROR_NOTIFICATIONS": true,
  "DEBUG": true,
  "LOG_API_CALLS": true
};`;
    
    res.writeHead(200, { 
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    res.end(configContent);
}

// Создаем HTTP сервер с обработкой ошибок
const server = http.createServer((req, res) => {
    try {
        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;
        
        // Устанавливаем CORS заголовки
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization');
        
        // Обработка OPTIONS запросов
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        
        console.log(`📥 ${req.method} ${req.url}`);
        
        // Маршрутизация
        if (pathname === '/' || pathname === '/index.html') {
            safeReadFile(
                path.join(__dirname, 'simple-index.html'),
                res,
                'text/html; charset=utf-8',
                '<h1>Система модерации изображений</h1><p>Frontend сервер работает</p>'
            );
        } else if (pathname === '/config.js') {
            serveConfigJs(res);
        } else if (pathname.startsWith('/api/')) {
            proxyToBackend(req, res);
        } else if (pathname === '/favicon.ico') {
            res.writeHead(204);
            res.end();
        } else if (pathname === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'OK',
                service: 'Moderation System Frontend',
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                endpoints: ['/', '/config.js', '/api/*', '/health']
            }));
        } else {
            // Пробуем найти статический файл
            const filePath = path.join(__dirname, pathname.substring(1));
            const extname = path.extname(filePath).toLowerCase();
            
            const mimeTypes = {
                '.html': 'text/html',
                '.js': 'application/javascript',
                '.css': 'text/css',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml'
            };
            
            const contentType = mimeTypes[extname] || 'application/octet-stream';
            
            fs.access(filePath, fs.constants.F_OK, (err) => {
                if (err) {
                    // Файл не найден
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Not Found');
                    return;
                }
                
                safeReadFile(filePath, res, contentType);
            });
        }
    } catch (error) {
        console.error('❌ Критическая ошибка в обработчике запроса:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'Internal Server Error',
            message: error.message,
            timestamp: new Date().toISOString()
        }));
    }
});

// Обработка ошибок сервера
server.on('error', (error) => {
    console.error('❌ Ошибка сервера:', error);
    
    if (error.code === 'EADDRINUSE') {
        console.log(`⚠️ Порт ${PORT} уже занят. Пробую порт ${parseInt(PORT) + 1}...`);
        // Можно реализовать автоматический выбор порта
    }
});

// Запуск сервера
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Стабильный frontend сервер запущен на http://0.0.0.0:${PORT}`);
    console.log(`🌐 Внешний доступ: http://192.168.1.189:${PORT}`);
    console.log(`📁 Главная страница: http://localhost:${PORT}`);
    console.log(`🔧 API прокси: http://localhost:${PORT}/api/* → http://localhost:3000/api/*`);
    console.log(`⚙️  Health check: http://localhost:${PORT}/health`);
});

// Обработка сигналов для graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Получен SIGINT, останавливаю сервер...');
    server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Получен SIGTERM, останавливаю сервер...');
    server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
});

// Обработка необработанных исключений
process.on('uncaughtException', (error) => {
    console.error('❌ Необработанное исключение:', error);
    // Не выходим из процесса, продолжаем работать
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Необработанный rejection:', reason);
});