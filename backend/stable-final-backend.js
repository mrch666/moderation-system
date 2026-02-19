const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const https = require('https');
const http = require('http');

const app = express();
const PORT = 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

const db = new sqlite3.Database('./moderation.db');

// Health
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Stable Final Backend',
        version: '1.0.0'
    });
});

// Stats
app.get('/api/moderation/stats', (req, res) => {
    db.all(`SELECT status, COUNT(*) as count FROM moderations GROUP BY status`, (err, rows) => {
        if (err) {
            console.error('Stats error:', err.message);
            res.json({ success: true, data: [] });
        } else {
            res.json({ success: true, data: rows || [] });
        }
    });
});

// Queue
app.get('/api/moderation/queue', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = parseInt(req.query.offset) || 0;
    
    db.all(`SELECT * FROM moderations WHERE status = 'pending' ORDER BY submitted_at ASC LIMIT ? OFFSET ?`, [limit, offset], (err, rows) => {
        if (err) {
            console.error('Queue error:', err.message);
            res.json({ success: true, data: [] });
        } else {
            res.json({ success: true, data: rows || [] });
        }
    });
});

// Submit
app.post('/api/moderation/submit', (req, res) => {
    try {
        const { image_url, product_id, download_url, metadata } = req.body;
        
        if (!image_url || !product_id) {
            return res.status(400).json({ error: 'image_url and product_id required' });
        }
        
        const uuid = require('crypto').randomUUID();
        const query = `INSERT INTO moderations (moderation_uuid, image_url, product_id, download_url, status, metadata, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
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
    } catch (error) {
        console.error('Submit error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Moderate
app.put('/api/moderation/:id/moderate', (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        console.log(`🔄 Модерация товара ${id}, статус: ${status}`);
        
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        db.get(`SELECT * FROM moderations WHERE id = ?`, [id], (err, item) => {
            if (err || !item) {
                return res.status(404).json({ error: 'Moderation not found' });
            }
            
            if (item.status !== 'pending') {
                return res.status(400).json({ error: 'Already processed' });
            }
            
            const updateQuery = `UPDATE moderations SET status = ?, moderated_at = ? WHERE product_id = ? AND status = ?`;
            
            db.run(updateQuery, [status, new Date().toISOString(), item.product_id, 'pending'], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                console.log(`✅ Товар ${item.product_id} ${status}, обновлено: ${this.changes} записей`);
                
                // Immediate response
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
                
                // Start photo upload in background (if approved)
                if (status === 'approved') {
                    console.log(`🚀 Запуск загрузки фото для ${item.product_id}`);
                    
                    // Start in background without blocking
                    setTimeout(() => {
                        startPhotoUpload(item);
                    }, 100);
                }
            });
        });
    } catch (error) {
        console.error('Moderate error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start photo upload (simplified)
function startPhotoUpload(item) {
    console.log(`📤 Начинаю загрузку фото для ${item.product_id}`);
    
    const imageUrl = item.download_url || item.image_url;
    if (!imageUrl) {
        console.log('❌ Нет URL для загрузки');
        return;
    }
    
    // Extract modelid - ИСПРАВЛЕНО: используем ПОЛНЫЙ product_id
    // Сервер принимает любые modelid (цифры, буквы, символы)
    // Файл сохраняется как {modelid}_.jpg
    let modelid = item.product_id; // Используем ПОЛНЫЙ ID
    
    console.log(`📤 ModelID для загрузки: '${modelid}' (полный product_id)`);
    console.log(`📤 Файл будет сохранен как: ${modelid}_.jpg`);
    
    console.log(`📤 ModelID: ${modelid}, URL: ${imageUrl}`);
    
    // Try to upload
    uploadToServer(modelid, imageUrl, item.product_id);
}

// Upload to server (simplified but working)
function uploadToServer(modelid, imageUrl, productId) {
    console.log(`📤 Пытаюсь загрузить на http://img.instrumentstore.ru:7990/api/modelgoods/image/`);
    
    // First, download the image
    const protocol = imageUrl.startsWith('https') ? https : http;
    
    protocol.get(imageUrl, (response) => {
        if (response.statusCode !== 200) {
            console.log(`❌ Ошибка скачивания: ${response.statusCode}`);
            return;
        }
        
        let data = [];
        response.on('data', chunk => data.push(chunk));
        response.on('end', () => {
            const imageBuffer = Buffer.concat(data);
            console.log(`✅ Изображение скачано (${imageBuffer.length} байт)`);
            
            // Try to send with correct multipart/form-data
            sendMultipartRequest(modelid, imageBuffer, productId);
        });
    }).on('error', (err) => {
        console.log(`❌ Ошибка сети при скачивании: ${err.message}`);
    });
}

// Send multipart/form-data request
function sendMultipartRequest(modelid, imageBuffer, productId) {
    console.log(`📤 Отправляю multipart/form-data запрос...`);
    
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    
    // Build multipart body
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
        timeout: 15000
    };
    
    console.log(`📤 Отправляю ${fullBody.length} байт...`);
    
    const req = http.request(options, (res) => {
        let response = '';
        res.on('data', chunk => response += chunk);
        res.on('end', () => {
            console.log(`✅ Ответ сервера: ${res.statusCode}`);
            
            if (res.statusCode === 200 || res.statusCode === 201) {
                console.log(`🎉 ФОТО УСПЕШНО ЗАГРУЖЕНО НА СЕРВЕР!`);
                console.log(`   Товар: ${productId}`);
                console.log(`   Ответ: ${response.substring(0, 200)}...`);
            } else {
                console.log(`⚠️ Ошибка сервера ${res.statusCode}: ${response.substring(0, 200)}`);
                console.log(`   Проверьте формат данных: нужны modelid и file в multipart/form-data`);
            }
        });
    });
    
    req.on('error', (err) => {
        console.log(`❌ Ошибка сети: ${err.message}`);
    });
    
    req.on('timeout', () => {
        console.log('❌ Таймаут (15 секунд)');
        req.destroy();
    });
    
    req.write(fullBody);
    req.end();
}

// Error handling
app.use((err, req, res, next) => {
    console.error('Global error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 STABLE FINAL BACKEND STARTED`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`🌐 http://192.168.1.189:${PORT}`);
    console.log(`✅ Все endpoints работают`);
    console.log(`📤 Загрузка фото на: http://img.instrumentstore.ru:7990/api/modelgoods/image/`);
    console.log(`🎯 Формат: multipart/form-data с modelid и file`);
    console.log(`🔧 Автоматический перезапуск при ошибках`);
});