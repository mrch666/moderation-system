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

// Проверяем наличие БД
if (!fs.existsSync('./moderation.db')) {
    console.error('❌ Файл БД не найден!');
    process.exit(1);
}

// Подключаем БД с обработкой ошибок
const db = new sqlite3.Database('./moderation.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к БД:', err.message);
        process.exit(1);
    }
    console.log('✅ База данных подключена');
});

// Функция загрузки изображения на целевой сервер (асинхронная, не блокирующая)
function uploadImageToTargetServer(item) {
    return new Promise((resolve) => {
        try {
            console.log(`📤 Начинаю загрузку изображения для товара ${item.product_id}...`);
            
            const downloadUrl = item.download_url || item.image_url;
            if (!downloadUrl) {
                console.log('❌ Нет URL для загрузки изображения');
                resolve({ success: false, error: 'No download URL' });
                return;
            }
            
            // Парсим product_id для modelid
            let modelid = item.product_id;
            // Убираем нецифровые символы в конце для modelid
            const match = item.product_id.match(/^(\d+)/);
            if (match) {
                modelid = match[1];
            }
            
            console.log(`📤 Загружаю изображение с URL: ${downloadUrl}`);
            console.log(`📤 ModelID для загрузки: ${modelid}`);
            
            // Создаем FormData
            const form = new FormData();
            form.append('modelid', modelid);
            
            // Скачиваем файл и добавляем в форму
            const protocol = downloadUrl.startsWith('https') ? https : http;
            
            protocol.get(downloadUrl, (response) => {
                if (response.statusCode !== 200) {
                    console.log(`❌ Ошибка скачивания файла: ${response.statusCode}`);
                    resolve({ success: false, error: `Download failed: ${response.statusCode}` });
                    return;
                }
                
                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    
                    // Определяем MIME тип
                    let mimeType = 'image/jpeg';
                    if (downloadUrl.includes('.png')) mimeType = 'image/png';
                    if (downloadUrl.includes('.gif')) mimeType = 'image/gif';
                    if (downloadUrl.includes('.webp')) mimeType = 'image/webp';
                    
                    form.append('file', buffer, {
                        filename: `product_${item.product_id}.jpg`,
                        contentType: mimeType
                    });
                    
                    // Отправляем на целевой сервер
                    const targetUrl = 'http://img.instrumentstore.ru:7990/api/modelgoods/image/';
                    console.log(`📤 Отправляю на целевой сервер: ${targetUrl}`);
                    
                    const request = http.request(targetUrl, {
                        method: 'POST',
                        headers: form.getHeaders()
                    }, (targetResponse) => {
                        let responseData = '';
                        targetResponse.on('data', (chunk) => responseData += chunk);
                        targetResponse.on('end', () => {
                            console.log(`✅ Ответ целевого сервера: ${targetResponse.statusCode}`);
                            
                            if (targetResponse.statusCode === 200 || targetResponse.statusCode === 201) {
                                console.log(`✅ Изображение успешно загружено для товара ${item.product_id}`);
                                resolve({ 
                                    success: true, 
                                    statusCode: targetResponse.statusCode,
                                    response: responseData 
                                });
                            } else {
                                console.log(`❌ Ошибка загрузки: ${targetResponse.statusCode}`);
                                resolve({ 
                                    success: false, 
                                    error: `Upload failed: ${targetResponse.statusCode}`,
                                    response: responseData 
                                });
                            }
                        });
                    });
                    
                    request.on('error', (err) => {
                        console.log(`❌ Ошибка сети при загрузке: ${err.message}`);
                        resolve({ success: false, error: `Network error: ${err.message}` });
                    });
                    
                    request.on('timeout', () => {
                        console.log('❌ Таймаут при загрузке');
                        request.destroy();
                        resolve({ success: false, error: 'Upload timeout' });
                    });
                    
                    request.setTimeout(30000); // 30 секунд таймаут
                    form.pipe(request);
                });
            }).on('error', (err) => {
                console.log(`❌ Ошибка скачивания: ${err.message}`);
                resolve({ success: false, error: `Download error: ${err.message}` });
            });
            
        } catch (error) {
            console.log(`❌ Неожиданная ошибка в uploadImageToTargetServer: ${error.message}`);
            resolve({ success: false, error: `Unexpected error: ${error.message}` });
        }
    });
}

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
        service: 'Moderation System',
        version: '1.0.0'
    });
});

// Отправка на модерацию
app.post('/api/moderation/submit', validateApiKey, (req, res) => {
    try {
        console.log('📨 Получен запрос на отправку товара');
        
        const { image_url, product_id, download_url, metadata } = req.body;
        
        // Валидация
        if (!image_url || !product_id) {
            return res.status(400).json({ error: 'image_url and product_id are required' });
        }
        
        // Готовим данные
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
        
        // Выполняем запрос
        db.run(query, params, function(err) {
            if (err) {
                console.error('❌ Ошибка БД при сохранении товара:', err.message);
                return res.status(500).json({ error: 'Database error: ' + err.message });
            }
            
            console.log(`✅ Товар сохранен: ${product_id} (ID: ${this.lastID})`);
            
            // УСПЕШНЫЙ ОТВЕТ
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

// Получение очереди
app.get('/api/moderation/queue', validateApiKey, (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 100);
        const offset = parseInt(req.query.offset) || 0;
        const page = parseInt(req.query.page) || 1;
        const actualOffset = (page - 1) * limit || offset;
        
        db.all(
            `SELECT * FROM moderations WHERE status = 'pending' ORDER BY submitted_at ASC LIMIT ? OFFSET ?`,
            [limit, actualOffset],
            (err, rows) => {
                if (err) {
                    console.error('❌ Ошибка БД при получении очереди:', err.message);
                    return res.status(500).json({ error: err.message });
                }
                
                // Получаем общее количество
                db.get(`SELECT COUNT(*) as total FROM moderations WHERE status = 'pending'`, (err, countRow) => {
                    if (err) {
                        return res.json({ success: true, data: rows });
                    }
                    
                    res.json({
                        success: true,
                        data: rows,
                        pagination: {
                            limit,
                            offset: actualOffset,
                            page,
                            total: countRow.total,
                            totalPages: Math.ceil(countRow.total / limit)
                        }
                    });
                });
            }
        );
    } catch (error) {
        console.error('❌ Ошибка в queue:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Модерация
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
                    
                    // Запускаем в фоне без ожидания
                    setTimeout(async () => {
                        try {
                            const uploadResult = await uploadImageToTargetServer(item);
                            if (uploadResult.success) {
                                console.log(`🎉 Изображения успешно загружены в целевую базу для товара ${item.product_id}`);
                            } else {
                                console.log(`⚠️ Ошибка загрузки изображений для товара ${item.product_id}: ${uploadResult.error}`);
                            }
                        } catch (uploadError) {
                            console.log(`⚠️ Исключение при загрузке изображений: ${uploadError.message}`);
                        }
                    }, 100); // Небольшая задержка чтобы не блокировать ответ
                }
            });
        });
    } catch (error) {
        console.error('❌ Ошибка в moderate:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Статистика
app.get('/api/moderation/stats', validateApiKey, (req, res) => {
    try {
        db.all(`SELECT status, COUNT(*) as count FROM moderations GROUP BY status`, (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, data: rows });
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Детали товара
app.get('/api/moderation/:id', validateApiKey, (req, res) => {
    try {
        const { id } = req.params;
        db.get(`SELECT * FROM moderations WHERE id = ?`, [id], (err, row) => {
            if (err || !row) {
                return res.status(404).json({ error: 'Moderation not found' });
            }
            res.json({ success: true, data: row });
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('❌ Необработанная ошибка:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Запуск сервера
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 BACKEND ЗАПУЩЕН НА http://0.0.0.0:${PORT}`);
    console.log(`🌐 Внешний доступ: http://192.168.1.189:${PORT}`);
    console.log(`🔑 API ключ: test_api_key_123456`);
    console.log(`✅ Готов принимать запросы!`);
});

// Обработка завершения
process.on('SIGTERM', () => {
    console.log('🛑 Получен SIGTERM, завершаю работу...');
    server.close(() => {
        db.close();
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 Получен SIGINT, завершаю работу...');
    server.close(() => {
        db.close();
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
});

// Обработка необработанных ошибок
process.on('uncaughtException', (err) => {
    console.error('💥 НЕОБРАБОТАННАЯ ОШИБКА:', err);
    // Не завершаем процесс, пытаемся продолжить работу
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 НЕОБРАБОТАННЫЙ REJECTION:', reason);
});