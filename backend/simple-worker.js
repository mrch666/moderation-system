const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Простая БД
const db = new sqlite3.Database('./moderation.db');

// API ключи
const API_KEYS = {
    'test_api_key_123456': { name: 'Test', permissions: ['submit', 'moderate', 'view'] }
};

// Middleware проверки API ключа
function validateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || !API_KEYS[apiKey]) {
        return res.status(401).json({ error: 'Invalid API key' });
    }
    req.apiKey = API_KEYS[apiKey];
    next();
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Отправка на модерацию (БЫСТРАЯ ВЕРСИЯ)
app.post('/api/moderation/submit', validateApiKey, (req, res) => {
    console.log('📨 Получен запрос на отправку товара:', req.body.product_id);
    
    const { image_url, product_id, download_url, metadata } = req.body;
    
    if (!image_url || !product_id) {
        return res.status(400).json({ error: 'image_url and product_id required' });
    }
    
    const uuid = require('crypto').randomUUID();
    const query = `INSERT INTO moderations (moderation_uuid, image_url, product_id, download_url, status, metadata, submitted_at) 
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
            console.error('❌ DB error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        console.log(`✅ Товар ${product_id} сохранен в БД (ID: ${this.lastID})`);
        
        // НЕМЕДЛЕННЫЙ ОТВЕТ
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
                        offset,
                        total: countRow.total,
                        totalPages: Math.ceil(countRow.total / limit)
                    }
                });
            });
        }
    );
});

// Модерация (БЫСТРАЯ ВЕРСИЯ)
app.put('/api/moderation/:id/moderate', validateApiKey, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    console.log(`🔄 Модерация товара ${id}, статус: ${status}`);
    
    // Сначала получаем товар
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
            
            console.log(`✅ Товар ${item.product_id} ${status === 'approved' ? 'одобрен' : 'отклонен'}, обновлено: ${this.changes} записей`);
            
            // НЕМЕДЛЕННЫЙ ОТВЕТ
            res.json({
                success: true,
                data: {
                    message: `Товар ${status === 'approved' ? 'одобрен' : 'отклонен'}. Обновлено: ${this.changes} записей`,
                    moderation_id: id,
                    changes: this.changes
                }
            });
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

// Детали товара
app.get('/api/moderation/:id', validateApiKey, (req, res) => {
    const { id } = req.params;
    db.get(`SELECT * FROM moderations WHERE id = ?`, [id], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: 'Moderation not found' });
        }
        res.json({ success: true, data: row });
    });
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 BACKEND ЗАПУЩЕН НА http://0.0.0.0:${PORT}`);
    console.log(`🌐 Внешний доступ: http://192.168.1.189:${PORT}`);
    console.log(`🔑 API ключ: test_api_key_123456`);
    console.log(`✅ Готов принимать запросы!`);
});