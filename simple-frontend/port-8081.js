#!/usr/bin/env node

/**
 * 🚀 Сервер на порту 8081
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8081;
const HOST = '0.0.0.0';

console.log(`🚀 Запуск сервера на порту ${PORT}`);

const server = http.createServer((req, res) => {
    console.log(`📥 ${req.method} ${req.url}`);
    
    if (req.url === '/' || req.url === '/index.html') {
        try {
            const content = fs.readFileSync(path.join(__dirname, 'simple-index.html'), 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(content);
        } catch (error) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>Система модерации</h1><p>Порт 8081</p>');
        }
    } else if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'OK',
            port: PORT,
            message: 'Сервер работает на порту 8081'
        }));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(PORT, HOST, () => {
    console.log(`✅ Сервер запущен:`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`   http://192.168.1.189:${PORT}`);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Останавливаю сервер...');
    server.close();
    process.exit(0);
});