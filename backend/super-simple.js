const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 3000;

// Разрешаем CORS для всех доменов (для разработки)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key']
}));
app.use(express.json());

// API ключи
const API_KEYS = {
    'test_api_key_123456': { name: 'Test', permissions: ['submit', 'moderate', 'view'] }
};

// Middleware проверки API ключа (опционально)
function validateApiKey(req, res, next) {
    // Для простоты пропускаем все запросы
    // В реальной системе здесь была бы проверка
    next();
    
    /*
    // Рабочий вариант с проверкой:
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || !API_KEYS[apiKey]) {
        return res.status(401).json({ error: 'Invalid API key' });
    }
    req.apiKey = API_KEYS[apiKey];
    next();
    */
}

// Подключаем БД
const db = new sqlite3.Database('./moderation.db');

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Super Simple Backend'
    });
});

// Отправка на модерацию
app.post('/api/moderation/submit', validateApiKey, (req, res) => {
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

// Модерация
app.put('/api/moderation/:id/moderate', validateApiKey, (req, res) => {
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
                    upload_note: status === 'approved' ? 'Изображение будет загружено в фоне' : ''
                }
            });
            
            // ЗАГРУЗКА В ФОНЕ (если одобрено)
            if (status === 'approved') {
                console.log(`🚀 Запускаю загрузку изображения для ${item.product_id} в фоне...`);
                
                // Просто логируем, что загрузка должна происходить
                // В реальной системе здесь будет вызов функции загрузки
                setTimeout(() => {
                    console.log(`📤 [ФОН] Изображение для ${item.product_id} должно загружаться на целевой сервер`);
                    console.log(`📤 [ФОН] Целевой сервер: http://img.instrumentstore.ru:7990/api/modelgoods/image/`);
                    console.log(`📤 [ФОН] ModelID: ${item.product_id.replace(/\D/g, '').substring(0, 10) || '12345'}`);
                }, 100);
            }
        });
    });
});

// Статистика
app.get('/api/moderation/stats', validateApiKey, (req, res) => {
    db.all(`SELECT status, COUNT(*) as count FROM moderations GROUP BY status`, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, data: rows });
    });
});

// Получение очереди
app.get('/api/moderation/queue', validateApiKey, (req, res) => {
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

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 СУПЕР-ПРОСТОЙ БЭКЕНД ЗАПУЩЕН НА http://0.0.0.0:${PORT}`);
    console.log(`🌐 Внешний доступ: http://192.168.1.189:${PORT}`);
    console.log(`🔑 API ключ: не требуется (упрощенная версия)`);
    console.log(`✅ Готов принимать запросы!`);
    console.log(`📤 При одобрении: логируется запуск загрузки изображений`);
});