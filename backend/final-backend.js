const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
const https = require('https');
const http = require('http');
const FormData = require('form-data');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Подключаем БД
const db = new sqlite3.Database('./moderation.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к БД:', err.message);
        process.exit(1);
    }
    console.log('✅ База данных подключена');
});

// API ключи
const API_KEYS = {
    'test_api_key_123456': { name: 'Test', permissions: ['submit', 'moderate', 'view'] }
};

// Middleware проверки API ключа
function validateApiKey(req, res, next) {
    try {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey || !API_KEYS[apiKey]) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        req.apiKey = API_KEYS[apiKey];
        next();
    } catch (error) {
        res.status(500).json({ error: 'API key validation error' });
    }
}

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Moderation System with Image Upload',
        version: '1.0.0'
    });
});

// Отправка на модерацию
app.post('/api/moderation/submit', validateApiKey, (req, res) => {
    try {
        console.log('📨 Получен запрос на отправку товара');
        
        const { image_url, product_id, download_url, metadata } = req.body;
        
        if (!image_url || !product_id) {
            return res.status(400).json({ error: 'image_url and product_id are required' });
        }
        
        const uuid = require('crypto').randomUUID();
        const query = `INSERT INTO moderations 
                      (moderation_uuid, image_url, product_id, download_url, status, metadata, submitted_at) 
                      VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        const params = [
            uuid,
            image_url,
            product_id,
            download_url || image_url,
            'pending',
            metadata ? JSON.stringify(metadata) : null,
            new Date().toISOString()
        ];
        
        db.run(query, params, function(err) {
            if (err) {
                console.error('❌ Ошибка БД при сохранении товара:', err.message);
                return res.status(500).json({ error: 'Database error: ' + err.message });
            }
            
            console.log(`✅ Товар сохранен: ${product_id} (ID: ${this.lastID})`);
            
            res.json({
                success: true,
                data: {
                    message: 'Изображение отправлено на модерацию',
                    moderation_id: this.lastID,
                    product_id: product_id,
                    timestamp: new Date().toISOString()
                }
            });
        });
        
    } catch (error) {
        console.error('❌ Неожиданная ошибка в submit:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Модерация С РАБОЧЕЙ ЗАГРУЗКОЙ ИЗОБРАЖЕНИЙ
app.put('/api/moderation/:id/moderate', validateApiKey, (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;
        
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        console.log(`🔄 Модерация товара ${id}, статус: ${status}`);
        
        // Получаем товар
        db.get(`SELECT * FROM moderations WHERE id = ?`, [id], (err, item) => {
            if (err || !item) {
                return res.status(404).json({ error: 'Moderation not found' });
            }
            
            if (item.status !== 'pending') {
                return res.status(400).json({ error: 'Moderation already processed' });
            }
            
            // Обновляем ВСЕ товары с таким же product_id
            const updateQuery = `UPDATE moderations SET status = ?, moderated_at = ?, reason = ? 
                               WHERE product_id = ? AND status = ?`;
            
            db.run(updateQuery, [
                status, 
                new Date().toISOString(), 
                reason || null,
                item.product_id, 
                'pending'
            ], function(err) {
                if (err) {
                    console.error('❌ Ошибка БД при модерации:', err.message);
                    return res.status(500).json({ error: err.message });
                }
                
                console.log(`✅ Товар ${item.product_id} ${status}, обновлено: ${this.changes} записей`);
                
                // НЕМЕДЛЕННЫЙ ОТВЕТ КЛИЕНТУ
                res.json({
                    success: true,
                    data: {
                        message: `Товар ${status === 'approved' ? 'одобрен' : 'отклонен'}`,
                        moderation_id: id,
                        changes: this.changes,
                        product_id: item.product_id
                    }
                });
                
                // ЗАГРУЗКА ИЗОБРАЖЕНИЙ В ФОНЕ (только при одобрении)
                if (status === 'approved') {
                    console.log(`🚀 Запускаю фоновую загрузку изображений для товара ${item.product_id}...`);
                    
                    // Запускаем в отдельном процессе чтобы не блокировать
                    setTimeout(() => {
                        uploadImageToTarget(item);
                    }, 100);
                }
            });
        });
    } catch (error) {
        console.error('❌ Ошибка в moderate:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// РАБОЧАЯ функция загрузки изображений
function uploadImageToTarget(item) {
    console.log(`📤 Начинаю загрузку изображения для товара ${item.product_id}`);
    
    const downloadUrl = item.download_url || item.image_url;
    if (!downloadUrl) {
        console.log('❌ Нет URL для загрузки изображения');
        return;
    }
    
    // Парсим product_id для modelid
    let modelid = item.product_id;
    const match = item.product_id.match(/^(\d+)/);
    if (match) {
        modelid = match[1];
    }
    
    console.log(`📤 ModelID: ${modelid}, URL: ${downloadUrl}`);
    
    // Скачиваем изображение
    const protocol = downloadUrl.startsWith('https') ? https : http;
    
    protocol.get(downloadUrl, (response) => {
        console.log(`📤 Статус скачивания: ${response.statusCode}`);
        
        if (response.statusCode !== 200) {
            console.log(`❌ Ошибка скачивания: ${response.statusCode}`);
            return;
        }
        
        const chunks = [];
        response.on('data', (chunk) => {
            chunks.push(chunk);
        });
        
        response.on('end', () => {
            const imageBuffer = Buffer.concat(chunks);
            console.log(`✅ Изображение скачано (${imageBuffer.length} байт)`);
            
            // Отправляем на целевой сервер
            sendToTargetServer(modelid, imageBuffer, item.product_id);
        });
        
    }).on('error', (err) => {
        console.log(`❌ Ошибка скачивания: ${err.message}`);
    });
}

// Отправка на целевой сервер
function sendToTargetServer(modelid, imageBuffer, productId) {
    const form = new FormData();
    form.append('modelid', modelid);
    form.append('file', imageBuffer, {
        filename: `product_${productId}.jpg`,
        contentType: 'image/jpeg'
    });
    
    const options = {
        hostname: 'img.instrumentstore.ru',
        port: 7990,
        path: '/api/modelgoods/image/',
        method: 'POST',
        headers: form.getHeaders()
    };
    
    console.log(`📤 Отправляю на целевой сервер: http://img.instrumentstore.ru:7990/api/modelgoods/image/`);
    
    const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
            responseData += chunk;
        });
        
        res.on('end', () => {
            console.log(`✅ Ответ целевого сервера: ${res.statusCode}`);
            
            if (res.statusCode === 200 || res.statusCode === 201) {
                console.log(`🎉 Изображение успешно загружено для товара ${productId}!`);
                console.log(`   Ответ сервера: ${responseData.substring(0, 200)}...`);
            } else {
                console.log(`⚠️ Ошибка загрузки: ${res.statusCode}`);
                console.log(`   Ответ сервера: ${responseData}`);
            }
        });
    });
    
    req.on('error', (err) => {
        console.log(`❌ Ошибка сети при загрузке: ${err.message}`);
    });
    
    req.setTimeout(30000, () => {
        console.log('❌ Таймаут при загрузке (30 секунд)');
        req.destroy();
    });
    
    form.pipe(req);
}

// Получение очереди
app.get('/api/moderation/queue', validateApiKey, (req, res) => {
    try {
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
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 BACKEND С РАБОЧЕЙ ЗАГРУЗКОЙ ИЗОБРАЖЕНИЙ ЗАПУЩЕН`);
    console.log(`🌐 Локальный: http://localhost:${PORT}`);
    console.log(`🌐 Внешний: http://192.168.1.189:${PORT}`);
    console.log(`🔑 API ключ: test_api_key_123456`);
    console.log(`✅ Изображения будут загружаться на: http://img.instrumentstore.ru:7990/api/modelgoods/image/`);
    console.log(`✅ Готов к работе!`);
});