const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 3000;

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
        service: 'Quick Upload Backend',
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

// Модерация с БЫСТРОЙ загрузкой
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
                    upload_status: status === 'approved' ? 'started' : 'none'
                }
            });
            
            // БЫСТРАЯ ЗАГРУЗКА (только при одобрении)
            if (status === 'approved') {
                console.log(`🚀 ЗАПУСК БЫСТРОЙ ЗАГРУЗКИ ДЛЯ ${item.product_id}`);
                
                // Запускаем простую загрузку
                quickUpload(item);
            }
        });
    });
});

// БЫСТРАЯ функция загрузки
function quickUpload(item) {
    console.log(`📤 БЫСТРАЯ ЗАГРУЗКА: ${item.product_id}`);
    
    // Просто логируем что загрузка должна происходить
    // В реальной системе здесь будет вызов API целевого сервера
    
    setTimeout(() => {
        console.log(`✅ [ЗАГРУЗКА] Товар ${item.product_id}: изображение должно загружаться на`);
        console.log(`✅ [ЗАГРУЗКА] http://img.instrumentstore.ru:7990/api/modelgoods/image/`);
        console.log(`✅ [ЗАГРУЗКА] ModelID: ${extractModelId(item.product_id)}`);
        
        // Здесь в реальной системе должен быть код загрузки
        // Например: uploadToTargetServer(item);
        
        console.log(`🎉 [ЗАГРУЗКА] ИЗОБРАЖЕНИЕ ДОЛЖНО БЫТЬ ЗАГРУЖЕНО В БАЗУ!`);
    }, 1000);
}

// Извлечение modelid из product_id
function extractModelId(productId) {
    const match = productId.match(/^(\d+)/);
    return match ? match[1] : '12345';
}

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 БЫСТРЫЙ BACKEND ЗАПУЩЕН НА http://0.0.0.0:${PORT}`);
    console.log(`🌐 Внешний доступ: http://192.168.1.189:${PORT}`);
    console.log(`✅ Все endpoints работают`);
    console.log(`📤 При одобрении: логируется запуск загрузки изображений`);
    console.log(`🔧 Для реальной загрузки нужно добавить вызов API целевого сервера`);
});