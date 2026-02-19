const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const https = require('https');
const http = require('http');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Разрешаем CORS для всех
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key']
}));
app.use(express.json());

// Подключаем БД
const db = new sqlite3.Database('./moderation.db');

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Real Upload Backend',
        version: '1.0.0'
    });
});

// Статистика
app.get('/api/moderation/stats', (req, res) => {
    db.all(`SELECT status, COUNT(*) as count FROM moderations GROUP BY status`, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, data: rows });
    });
});

// Очередь
app.get('/api/moderation/queue', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = parseInt(req.query.offset) || 0;
    
    db.all(
        `SELECT * FROM moderations WHERE status = 'pending' ORDER BY submitted_at ASC LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, data: rows });
        }
    );
});

// Отправка на модерацию
app.post('/api/moderation/submit', (req, res) => {
    console.log('📨 Получен товар:', req.body.product_id);
    
    const { image_url, product_id, download_url, metadata } = req.body;
    
    if (!image_url || !product_id) {
        return res.status(400).json({ error: 'image_url and product_id required' });
    }
    
    const uuid = require('crypto').randomUUID();
    const query = `INSERT INTO moderations 
                  (moderation_uuid, image_url, product_id, download_url, status, metadata, submitted_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(query, [
        uuid,
        image_url,
        product_id,
        download_url || image_url,
        'pending',
        metadata ? JSON.stringify(metadata) : null,
        new Date().toISOString()
    ], function(err) {
        if (err) {
            console.error('❌ DB error:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        
        console.log(`✅ Товар сохранен: ${product_id} (ID: ${this.lastID})`);
        
        res.json({
            success: true,
            data: {
                message: 'Изображение отправлено на модерацию',
                moderation_id: this.lastID,
                product_id: product_id
            }
        });
    });
});

// Модерация с РЕАЛЬНОЙ загрузкой изображений
app.put('/api/moderation/:id/moderate', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`🔄 Модерация товара ${id}, статус: ${status}`);
    
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Получаем товар
    db.get(`SELECT * FROM moderations WHERE id = ?`, [id], (err, item) => {
        if (err || !item) {
            return res.status(404).json({ error: 'Moderation not found' });
        }
        
        if (item.status !== 'pending') {
            return res.status(400).json({ error: 'Already processed' });
        }
        
        // Обновляем ВСЕ товары с таким же product_id
        const updateQuery = `UPDATE moderations SET status = ?, moderated_at = ? WHERE product_id = ? AND status = ?`;
        
        db.run(updateQuery, [status, new Date().toISOString(), item.product_id, 'pending'], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            console.log(`✅ Товар ${item.product_id} ${status}, обновлено: ${this.changes} записей`);
            
            // НЕМЕДЛЕННЫЙ ОТВЕТ
            res.json({
                success: true,
                data: {
                    message: `Товар ${status === 'approved' ? 'одобрен' : 'отклонен'}`,
                    moderation_id: id,
                    changes: this.changes,
                    product_id: item.product_id,
                    upload_initiated: status === 'approved'
                }
            });
            
            // РЕАЛЬНАЯ ЗАГРУЗКА ИЗОБРАЖЕНИЙ (только при одобрении)
            if (status === 'approved') {
                console.log(`🚀 ЗАПУСКАЮ РЕАЛЬНУЮ ЗАГРУЗКУ ИЗОБРАЖЕНИЯ ДЛЯ ${item.product_id}`);
                
                // Запускаем в фоне
                setTimeout(() => {
                    realImageUpload(item);
                }, 100);
            }
        });
    });
});

// РЕАЛЬНАЯ функция загрузки изображений
function realImageUpload(item) {
    console.log(`📤 НАЧИНАЮ РЕАЛЬНУЮ ЗАГРУЗКУ ДЛЯ ${item.product_id}`);
    
    const downloadUrl = item.download_url || item.image_url;
    if (!downloadUrl) {
        console.log('❌ Нет URL для загрузки');
        return;
    }
    
    // Парсим product_id для modelid
    let modelid = item.product_id;
    const match = item.product_id.match(/^(\d+)/);
    if (match) {
        modelid = match[1];
    } else {
        modelid = '12345'; // fallback
    }
    
    console.log(`📤 ModelID: ${modelid}, URL: ${downloadUrl}`);
    
    // Целевой сервер
    const targetHost = 'img.instrumentstore.ru';
    const targetPort = 7990;
    const targetPath = '/api/modelgoods/image/';
    
    // Скачиваем изображение
    const protocol = downloadUrl.startsWith('https') ? https : http;
    
    protocol.get(downloadUrl, (response) => {
        console.log(`📤 Статус скачивания: ${response.statusCode}`);
        
        if (response.statusCode !== 200) {
            console.log(`❌ Ошибка скачивания: ${response.statusCode}`);
            // Пробуем альтернативное изображение
            useAlternativeImage(modelid, item.product_id);
            return;
        }
        
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
            const imageBuffer = Buffer.concat(chunks);
            console.log(`✅ Изображение скачано (${imageBuffer.length} байт)`);
            
            // Отправляем на целевой сервер
            uploadToTargetServer(modelid, imageBuffer, item.product_id);
        });
        
    }).on('error', (err) => {
        console.log(`❌ Ошибка сети при скачивании: ${err.message}`);
        useAlternativeImage(modelid, item.product_id);
    });
}

// Загрузка на целевой сервер
function uploadToTargetServer(modelid, imageBuffer, productId) {
    console.log(`📤 ОТПРАВЛЯЮ НА ЦЕЛЕВОЙ СЕРВЕР: http://img.instrumentstore.ru:7990/api/modelgoods/image/`);
    
    // Создаем multipart/form-data вручную
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    
    let body = '';
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="modelid"\r\n\r\n`;
    body += `${modelid}\r\n`;
    
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="product_${productId}.jpg"\r\n`;
    body += `Content-Type: image/jpeg\r\n\r\n`;
    
    // Конвертируем body в buffer
    const bodyStart = Buffer.from(body, 'utf8');
    const bodyEnd = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
    const fullBody = Buffer.concat([bodyStart, imageBuffer, bodyEnd]);
    
    const options = {
        hostname: 'img.instrumentstore.ru',
        port: 7990,
        path: '/api/modelgoods/image/',
        method: 'POST',
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': fullBody.length
        }
    };
    
    const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => responseData += chunk);
        res.on('end', () => {
            console.log(`✅ ОТВЕТ ЦЕЛЕВОГО СЕРВЕРА: ${res.statusCode}`);
            
            if (res.statusCode === 200 || res.statusCode === 201) {
                console.log(`🎉 ИЗОБРАЖЕНИЕ УСПЕШНО ЗАГРУЖЕНО В БАЗУ!`);
                console.log(`   Товар: ${productId}, ModelID: ${modelid}`);
                console.log(`   Ответ сервера: ${responseData.substring(0, 200)}...`);
            } else {
                console.log(`⚠️ Ошибка загрузки: ${res.statusCode}`);
                console.log(`   Ответ: ${responseData}`);
            }
        });
    });
    
    req.on('error', (err) => {
        console.log(`❌ Ошибка сети при загрузке: ${err.message}`);
    });
    
    req.setTimeout(30000, () => {
        console.log('❌ Таймаут загрузки (30 секунд)');
        req.destroy();
    });
    
    req.write(fullBody);
    req.end();
}

// Альтернативное изображение (если основное не скачивается)
function useAlternativeImage(modelid, productId) {
    console.log(`📤 Использую альтернативное изображение для ${productId}`);
    
    // Создаем простой JPEG изображение (красный квадрат)
    const simpleJpeg = Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
        'base64'
    );
    
    uploadToTargetServer(modelid, simpleJpeg, productId);
}

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 РЕАЛЬНЫЙ BACKEND С ЗАГРУЗКОЙ ИЗОБРАЖЕНИЙ ЗАПУЩЕН`);
    console.log(`🌐 Локальный: http://localhost:${PORT}`);
    console.log(`🌐 Внешний: http://192.168.1.189:${PORT}`);
    console.log(`✅ Endpoints:`);
    console.log(`   GET  /health`);
    console.log(`   GET  /api/moderation/stats`);
    console.log(`   GET  /api/moderation/queue`);
    console.log(`   POST /api/moderation/submit`);
    console.log(`   PUT  /api/moderation/:id/moderate`);
    console.log(`📤 При одобрении: РЕАЛЬНАЯ загрузка на http://img.instrumentstore.ru:7990/api/modelgoods/image/`);
});