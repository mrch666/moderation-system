const http = require('http');
const fs = require('fs');
const path = require('path');

// Загружаем переменные окружения
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
    console.log('⚠️  Не удалось прочитать .env файл, используем значения по умолчанию');
}

const PORT = envVars.FRONTEND_PORT || 8080;
const HOST = envVars.FRONTEND_HOST || '0.0.0.0';
const API_URL = envVars.API_URL || 'http://localhost:3000/api';
const API_KEY = envVars.API_KEY || 'test_api_key_123456';

const server = http.createServer((req, res) => {
    // Обслуживаем simple-index.html
    if (req.url === '/' || req.url === '/index.html' || req.url === '/simple-index.html') {
        serveFile(res, 'simple-index.html');
        return;
    }
    
    // Обслуживаем test_browser.html
    if (req.url === '/test_browser.html') {
        serveFile(res, '../test_browser.html');
        return;
    }
    
    // Обслуживаем favicon
    if (req.url === '/favicon.ico') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    // Обслуживаем config.js
    if (req.url === '/config.js') {
        serveFile(res, 'config.js');
        return;
    }
    
    // Все остальные запросы - 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

function serveFile(res, filename) {
    const filePath = path.join(__dirname, filename);
    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error('Ошибка чтения файла:', err);
            res.writeHead(500);
            res.end('Error loading page');
            return;
        }
        
        res.writeHead(200, { 
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(data);
    });
}

server.on('error', (err) => {
    console.error('Ошибка сервера:', err);
});

server.listen(PORT, HOST, () => {
    console.log(`🚀 Простой фронтенд запущен на http://${HOST}:${PORT}`);
    console.log(`📁 Откройте в браузере: http://localhost:${PORT}`);
    console.log(`🔗 API доступен по адресу: ${API_URL}`);
    console.log(`🔑 API ключ: ${API_KEY ? 'Установлен' : 'По умолчанию'}`);
    console.log(`🌐 Внешний доступ: http://${HOST === '0.0.0.0' ? '192.168.1.189' : HOST}:${PORT}`);
});