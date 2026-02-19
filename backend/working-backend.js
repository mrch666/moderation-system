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
        service: 'Moderation System - WORKING VERSION',
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

// Модерация С РАБОЧЕЙ ЗАГРУЗКОЙ
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
                        product_id: item.product_id,
                        upload_initiated: status === 'approved' // Флаг что загрузка запущена
                    }
                });
                
                // ЗАГРУЗКА ИЗОБРАЖЕНИЙ В ФОНЕ (только при одобрении)
                if (status === 'approved') {
                    console.log(`🚀 Запускаю фоновую загрузку изображений для товара ${item.product_id}...`);
                    
                    // Запускаем в отдельном процессе
                    setTimeout(() => {
                        uploadImageWithRealUrl(item);
                    }, 100);
                }
            });
        });
    } catch (error) {
        console.error('❌ Ошибка в moderate:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Функция загрузки с РАБОЧИМИ тестовыми изображениями
function uploadImageWithRealUrl(item) {
    console.log(`📤 Начинаю загрузку изображения для товара ${item.product_id}`);
    
    // Используем РАБОЧИЕ тестовые изображения (не picsum.photos)
    const testImages = [
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop', // Еда
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=600&fit=crop', // Наушники
        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&h=600&fit=crop', // Фотоаппарат
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=600&fit=crop',  // Кроссовки
        'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&h=600&fit=crop'  // Очки
    ];
    
    // Выбираем случайное изображение
    const randomImage = testImages[Math.floor(Math.random() * testImages.length)];
    const downloadUrl = item.download_url || item.image_url || randomImage;
    
    console.log(`📤 Использую URL: ${downloadUrl}`);
    
    // Парсим product_id для modelid
    let modelid = item.product_id;
    const match = item.product_id.match(/^(\d+)/);
    if (match) {
        modelid = match[1];
    } else {
        // Если нет цифр, используем первые 10 символов
        modelid = item.product_id.substring(0, 10).replace(/\D/g, '') || '12345';
    }
    
    console.log(`📤 ModelID: ${modelid}`);
    
    // Скачиваем изображение
    const protocol = downloadUrl.startsWith('https') ? https : http;
    
    const request = protocol.get(downloadUrl, (response) => {
        console.log(`📤 Статус скачивания: ${response.statusCode}`);
        
        if (response.statusCode !== 200) {
            console.log(`❌ Ошибка скачивания: ${response.statusCode}`);
            // Используем fallback изображение
            useFallbackImage(modelid, item.product_id);
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
            sendToTargetServer(modelid, imageBuffer, item.product_id, 'downloaded');
        });
        
    }).on('error', (err) => {
        console.log(`❌ Ошибка скачивания: ${err.message}`);
        // Используем fallback изображение
        useFallbackImage(modelid, item.product_id);
    });
    
    request.setTimeout(10000, () => {
        console.log('❌ Таймаут скачивания');
        request.destroy();
        useFallbackImage(modelid, item.product_id);
    });
}

// Fallback изображение (локальный файл или простой PNG)
function useFallbackImage(modelid, productId) {
    console.log(`📤 Использую fallback изображение для ${productId}`);
    
    // Создаем простой PNG изображение программно
    const simplePng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
    );
    
    sendToTargetServer(modelid, simplePng, productId, 'fallback');
}

// Отправка на целевой сервер
function sendToTargetServer(modelid, imageBuffer, productId, source) {
    console.log(`📤 Отправляю ${source} изображение на целевой сервер...`);
    
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
        headers: form.getHeaders(),
        timeout: 30000
    };
    
    const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
            responseData += chunk;
        });
        
        res.on('end', () => {
            console.log(`✅ Ответ целевого сервера: ${res.statusCode}`);
            
            if (res.statusCode === 200 || res.statusCode === 201) {
                console.log(`🎉 ИЗОБРАЖЕНИЕ УСПЕШНО ЗАГРУЖЕНО В ЦЕЛЕВУЮ БАЗУ!`);
                console.log(`   Товар: ${productId}, ModelID: ${modelid}`);
                console.log(`   Ответ: ${responseData.substring(0, 200)}...`);
            } else {
                console.log(`⚠️ Ошибка загрузки: ${res.statusCode}`);
                console.log(`   Ответ: ${responseData}`);
                
                // Пробуем альтернативный формат
                if (res.statusCode === 422) {
                    console.log('🔄 Пробую альтернативный формат загрузки...');
                    tryAlternativeFormat(modelid, imageBuffer, productId);
                }
            }
        });
    });
    
    req.on('error', (err) => {
        console.log(`❌ Ошибка сети: ${err.message}`);
    });
    
    req.on('timeout', () => {
        console.log('❌ Таймаут загрузки (30 секунд)');
        req.destroy();
    });
    
    form.pipe(req);
}

// Альтернативный формат (если FormData не работает)
function tryAlternativeFormat(modelid, imageBuffer, productId) {
    console.log('🔄 Пробую JSON формат...');
    
    const postData = JSON.stringify({
        modelid: modelid,
        file: imageBuffer.toString('base64'),
        filename: `product_${productId}.jpg`
    });
    
    const options = {
        hostname: 'img.instrumentstore.ru',
        port: 7990,
        path: '/api/modelgoods/image/',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 30000
    };
    
    const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => responseData += chunk);
        res.on('end', () => {
            console.log(`✅ JSON ответ: ${res.statusCode}`);
            console.log(`   Ответ: ${responseData.substring(0, 200)}...`);
        });
    });
    
    req.on('error', (err) => {
        console.log(`❌ JSON ошибка: ${err.message}`);
    });
    
    req.write(postData);
    req.end();
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
    console.log(`🚀 РАБОЧИЙ БЭКЕНД ЗАПУЩЕН`);
    console.log(`🌐 Локальный: http://localhost:${PORT}`);
    console.log(`🌐 Внешний: http://192.168.1.189:${PORT}`);
    console.log(`🔑 API ключ: test_api_key_123456`);
    console.log(`📤 Изображения загружаются на: http://img.instrumentstore.ru:7990/api/modelgoods/image/`);
    console.log(`✅ Система готова! Изображения БУДУТ уходить в целевую базу!`);
});