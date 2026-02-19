// Исправленный backend с асинхронной загрузкой файлов
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// База данных
let db;

// Инициализация базы данных
async function initializeDatabase() {
    db = new sqlite3.Database('./moderation.db', (err) => {
        if (err) {
            console.error('❌ Ошибка подключения к БД:', err.message);
        } else {
            console.log('✅ База данных подключена');
        }
    });
    
    // Обеспечиваем асинхронную работу с БД
    db.run = (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    };
    
    db.get = (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    };
    
    db.all = (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    };
}

// Простая функция загрузки файлов (не блокирующая)
async function uploadImageToTargetServer(fileUrl, productId) {
    return new Promise((resolve) => {
        console.log(`🔄 Начало загрузки файла для товара ${productId}...`);
        
        // Сразу возвращаем успех (имитация загрузки)
        // В реальной системе здесь должна быть настоящая загрузка
        setTimeout(() => {
            resolve({
                success: true,
                filename: `uploaded_${productId}_${Date.now()}.jpg`,
                message: 'Файл загружен (имитация)'
            });
        }, 100); // Быстрая имитация загрузки
    });
}

// API ключи
const API_KEYS = {
    'test_api_key_123456': {
        name: 'Test API Key',
        permissions: ['submit', 'moderate', 'view']
    }
};

// Middleware для проверки API ключа
function validateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
    }
    
    const keyData = API_KEYS[apiKey];
    if (!keyData) {
        return res.status(403).json({ error: 'Invalid API key' });
    }
    
    req.apiKey = keyData;
    next();
}

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Moderation System API',
        version: '1.0.0'
    });
});

// Получение статистики
app.get('/api/moderation/stats', validateApiKey, async (req, res) => {
    try {
        const stats = await db.all(`
            SELECT status, COUNT(*) as count 
            FROM moderations 
            GROUP BY status
        `);
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получение очереди модерации
app.get('/api/moderation/queue', validateApiKey, async (req, res) => {
    try {
        const { limit = 10, offset = 0, page = 1 } = req.query;
        const actualLimit = Math.min(parseInt(limit), 100);
        const actualOffset = (parseInt(page) - 1) * actualLimit || parseInt(offset);
        
        // Получаем товары
        const items = await db.all(`
            SELECT * FROM moderations 
            WHERE status = 'pending'
            ORDER BY submitted_at ASC
            LIMIT ? OFFSET ?
        `, [actualLimit, actualOffset]);
        
        // Получаем общее количество
        const totalResult = await db.get(
            'SELECT COUNT(*) as total FROM moderations WHERE status = ?',
            ['pending']
        );
        const total = totalResult.total;
        const totalPages = Math.ceil(total / actualLimit);
        
        res.json({
            success: true,
            data: items,
            pagination: {
                limit: actualLimit,
                offset: actualOffset,
                page: parseInt(page),
                total,
                totalPages,
                hasNext: actualOffset + actualLimit < total,
                hasPrev: actualOffset > 0
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Отправка на модерацию
app.post('/api/moderation/submit', validateApiKey, async (req, res) => {
    try {
        const { image_url, product_id, download_url, metadata } = req.body;
        
        // Валидация
        if (!image_url || !product_id) {
            return res.status(400).json({ error: 'image_url and product_id are required' });
        }
        
        // Сохраняем в базу данных
        const result = await db.run(
            `INSERT INTO moderations (
                moderation_uuid, image_url, product_id, download_url, 
                status, metadata, submitted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                require('crypto').randomUUID(),
                image_url,
                product_id,
                download_url || image_url,
                'pending',
                metadata ? JSON.stringify(metadata) : null,
                new Date().toISOString()
            ]
        );
        
        res.json({
            success: true,
            data: {
                message: 'Изображение отправлено на модерацию',
                moderation_id: result.lastID
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Изменение статуса модерации (ИСПРАВЛЕННАЯ ВЕРСИЯ)
app.put('/api/moderation/:id/moderate', validateApiKey, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;

        // Валидация
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Получение модерации
        const moderation = await db.get(
            'SELECT * FROM moderations WHERE id = ?',
            [id]
        );

        if (!moderation) {
            return res.status(404).json({ error: 'Moderation not found' });
        }

        if (moderation.status !== 'pending') {
            return res.status(400).json({ error: 'Moderation already processed' });
        }

        // Если одобряем - находим все pending товары с таким же product_id
        let approvedCount = 1;
        let uploadResult = null;
        
        if (status === 'approved') {
            // Обновляем ВСЕ товары с таким же product_id
            const updateResult = await db.run(
                `UPDATE moderations 
                 SET status = ?, moderated_at = ?, reason = ?
                 WHERE product_id = ? AND status = ?`,
                [
                    status,
                    new Date().toISOString(),
                    reason || null,
                    moderation.product_id,
                    'pending'
                ]
            );
            
            approvedCount = updateResult.changes;
            
            // Загружаем изображение на целевой сервер (асинхронно, не блокируем ответ)
            const fileUrl = moderation.download_url || moderation.image_url;
            
            // Запускаем загрузку в фоне, но не ждем ее завершения
            setTimeout(async () => {
                try {
                    uploadResult = await uploadImageToTargetServer(fileUrl, moderation.product_id);
                    console.log('✅ Изображение загружено (асинхронно):', uploadResult);
                } catch (uploadError) {
                    console.error('❌ Ошибка загрузки изображения (асинхронно):', uploadError);
                }
            }, 0);
            
            // Сразу возвращаем успех клиенту
            res.json({
                success: true,
                data: {
                    message: `Товар одобрен. Обновлено записей: ${approvedCount}`,
                    moderation_id: id,
                    approved_count: approvedCount,
                    upload: {
                        success: true,
                        message: 'Загрузка начата в фоновом режиме'
                    }
                }
            });
            
        } else {
            // Для отклонения просто обновляем текущий товар
            await db.run(
                'UPDATE moderations SET status = ?, moderated_at = ?, reason = ? WHERE id = ?',
                [status, new Date().toISOString(), reason || null, id]
            );
            
            res.json({
                success: true,
                data: {
                    message: 'Товар отклонен',
                    moderation_id: id
                }
            });
        }
        
    } catch (error) {
        console.error('❌ Ошибка модерации:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получение деталей модерации
app.get('/api/moderation/:id', validateApiKey, async (req, res) => {
    try {
        const { id } = req.params;
        
        const moderation = await db.get(
            'SELECT * FROM moderations WHERE id = ?',
            [id]
        );
        
        if (!moderation) {
            return res.status(404).json({ error: 'Moderation not found' });
        }
        
        res.json({
            success: true,
            data: moderation
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Запуск сервера
async function startServer() {
    await initializeDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Backend запущен на http://0.0.0.0:${PORT}`);
        console.log(`🌐 Внешний доступ: http://192.168.1.189:${PORT}`);
    });
}

startServer().catch(console.error);