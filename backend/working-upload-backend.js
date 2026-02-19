const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const https = require('https');
const http = require('http');
const { Buffer } = require('buffer');

const app = express();
const PORT = 3000;

// Разрешаем CORS для всех
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key']
}));
app.use(express.json({ limit: '50mb' }));

// Подключаем БД
const db = new sqlite3.Database('./moderation.db');

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Working Upload Backend',
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

// Модерация с РАБОЧЕЙ загрузкой фото
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
                    upload_started: status === 'approved'
                }
            });
            
            // РАБОЧАЯ ЗАГРУЗКА ФОТО (только при одобрении)
            if (status === 'approved') {
                console.log(`🚀 ЗАПУСК РАБОЧЕЙ ЗАГРУЗКИ ФОТО ДЛЯ ${item.product_id}`);
                
                // Запускаем в фоне
                setTimeout(() => {
                    uploadPhotoToServer(item);
                }, 100);
            }
        });
    });
});

// РАБОЧАЯ функция загрузки фото
function uploadPhotoToServer(item) {
    console.log(`📤 НАЧИНАЮ РАБОЧУЮ ЗАГРУЗКУ ФОТО ДЛЯ ${item.product_id}`);
    
    const imageUrl = item.download_url || item.image_url;
    if (!imageUrl) {
        console.log('❌ Нет URL для загрузки фото');
        return;
    }
    
    // Извлекаем modelid из product_id
    let modelid = extractModelId(item.product_id);
    console.log(`📤 ModelID: ${modelid}, URL: ${imageUrl}`);
    
    // Скачиваем фото
    downloadImage(imageUrl)
        .then(imageBuffer => {
            console.log(`✅ Фото скачано (${imageBuffer.length} байт)`);
            return sendToTargetServer(modelid, imageBuffer, item.product_id);
        })
        .then(result => {
            if (result.success) {
                console.log(`🎉 ФОТО УСПЕШНО ЗАГРУЖЕНО НА СЕРВЕР!`);
                console.log(`   Товар: ${item.product_id}`);
                console.log(`   Ответ сервера: ${result.response.substring(0, 200)}...`);
            } else {
                console.log(`⚠️ Ошибка загрузки: ${result.error}`);
            }
        })
        .catch(error => {
            console.log(`❌ Ошибка: ${error.message}`);
        });
}

// Скачивание изображения
function downloadImage(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        
        protocol.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }
            
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
        }).on('error', reject);
    });
}

// Отправка на целевой сервер
function sendToTargetServer(modelid, imageBuffer, productId) {
    return new Promise((resolve, reject) => {
        console.log(`📤 ОТПРАВЛЯЮ ФОТО НА СЕРВЕР: http://img.instrumentstore.ru:7990/api/modelgoods/image/`);
        
        // Создаем multipart/form-data
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        
        let body = '';
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="modelid"\r\n\r\n`;
        body += `${modelid}\r\n`;
        
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="file"; filename="product_${productId}.jpg"\r\n`;
        body += `Content-Type: image/jpeg\r\n\r\n`;
        
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
            },
            timeout: 30000
        };
        
        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                console.log(`✅ Ответ сервера: ${res.statusCode}`);
                
                if (res.statusCode === 200 || res.statusCode === 201) {
                    resolve({
                        success: true,
                        statusCode: res.statusCode,
                        response: responseData
                    });
                } else {
                    resolve({
                        success: false,
                        statusCode: res.statusCode,
                        error: `HTTP ${res.statusCode}`,
                        response: responseData
                    });
                }
            });
        });
        
        req.on('error', (err) => {
            resolve({
                success: false,
                error: err.message
            });
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: false,
                error: 'Timeout (30 seconds)'
            });
        });
        
        req.write(fullBody);
        req.end();
    });
}

// Извлечение modelid
function extractModelId(productId) {
    const match = productId.match(/^(\d+)/);
    return match ? match[1] : '12345';
}

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 РАБОЧИЙ BACKEND С ЗАГРУЗКОЙ ФОТО ЗАПУЩЕН`);
    console.log(`🌐 Локальный: http://localhost:${PORT}`);
    console.log(`🌐 Внешний: http://192.168.1.189:${PORT}`);
    console.log(`✅ Все endpoints работают`);
    console.log(`📤 При одобрении: РЕАЛЬНАЯ загрузка фото на сервер`);
    console.log(`🎯 Целевой сервер: http://img.instrumentstore.ru:7990/api/modelgoods/image/`);
});