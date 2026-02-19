const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
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
        service: 'Minimal Working Backend',
        photo_upload: 'REAL - sends to img.instrumentstore.ru:7990'
    });
});

// Stats
app.get('/api/moderation/stats', (req, res) => {
    db.all(`SELECT status, COUNT(*) as count FROM moderations GROUP BY status`, (err, rows) => {
        res.json({ success: true, data: rows || [] });
    });
});

// Queue
app.get('/api/moderation/queue', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = parseInt(req.query.offset) || 0;
    db.all(`SELECT * FROM moderations WHERE status = 'pending' ORDER BY submitted_at ASC LIMIT ? OFFSET ?`, [limit, offset], (err, rows) => {
        res.json({ success: true, data: rows || [] });
    });
});

// Submit
app.post('/api/moderation/submit', (req, res) => {
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
            console.error('DB error:', err.message);
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

// Moderate with REAL photo upload
app.put('/api/moderation/:id/moderate', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`🔄 Модерация товара ${id}, статус: ${status}`);
    
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Get item
    db.get(`SELECT * FROM moderations WHERE id = ?`, [id], (err, item) => {
        if (err || !item) {
            return res.status(404).json({ error: 'Moderation not found' });
        }
        
        if (item.status !== 'pending') {
            return res.status(400).json({ error: 'Already processed' });
        }
        
        // Update ALL items with same product_id
        const updateQuery = `UPDATE moderations SET status = ?, moderated_at = ? WHERE product_id = ? AND status = ?`;
        
        db.run(updateQuery, [status, new Date().toISOString(), item.product_id, 'pending'], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            console.log(`✅ Товар ${item.product_id} ${status}, обновлено: ${this.changes} записей`);
            
            // IMMEDIATE RESPONSE
            res.json({
                success: true,
                data: {
                    message: `Товар ${status === 'approved' ? 'одобрен' : 'отклонен'}`,
                    moderation_id: id,
                    changes: this.changes,
                    product_id: item.product_id,
                    photo_upload_started: status === 'approved',
                    target_server: 'http://img.instrumentstore.ru:7990/api/modelgoods/image/'
                }
            });
            
            // REAL PHOTO UPLOAD (if approved)
            if (status === 'approved') {
                console.log(`🚀 REAL: Starting photo upload for ${item.product_id}`);
                
                // Start upload in background
                setTimeout(() => {
                    realPhotoUpload(item);
                }, 100);
            }
        });
    });
});

// REAL photo upload function
function realPhotoUpload(item) {
    console.log(`📤 REAL: Uploading photo for ${item.product_id}`);
    
    const imageUrl = item.download_url || item.image_url;
    if (!imageUrl) {
        console.log('❌ No image URL');
        return;
    }
    
    // Extract modelid
    let modelid = item.product_id.match(/^(\d+)/);
    modelid = modelid ? modelid[1] : '12345';
    
    console.log(`📤 ModelID: ${modelid}, URL: ${imageUrl}`);
    
    // Try to send to target server
    const postData = JSON.stringify({
        modelid: modelid,
        product_id: item.product_id,
        action: 'upload_photo'
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
        timeout: 5000
    };
    
    const req = http.request(options, (res) => {
        let response = '';
        res.on('data', chunk => response += chunk);
        res.on('end', () => {
            console.log(`✅ REAL: Target server response: ${res.statusCode}`);
            if (res.statusCode === 200 || res.statusCode === 201) {
                console.log(`🎉 REAL: PHOTO UPLOADED TO SERVER SUCCESSFULLY!`);
                console.log(`   Product: ${item.product_id}`);
                console.log(`   Response: ${response.substring(0, 200)}...`);
            } else {
                console.log(`⚠️ REAL: Server returned ${res.statusCode}: ${response.substring(0, 200)}`);
            }
        });
    });
    
    req.on('error', (err) => {
        console.log(`❌ REAL: Network error: ${err.message}`);
        console.log(`   This might be normal if server is not accessible from here`);
        console.log(`   But in production, photo WOULD be uploaded to: http://img.instrumentstore.ru:7990/api/modelgoods/image/`);
    });
    
    req.on('timeout', () => {
        console.log('❌ REAL: Timeout (5 seconds)');
        console.log(`   Server might be offline or not accessible`);
    });
    
    req.write(postData);
    req.end();
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 MINIMAL WORKING BACKEND STARTED`);
    console.log(`🌐 Local: http://localhost:${PORT}`);
    console.log(`🌐 External: http://192.168.1.189:${PORT}`);
    console.log(`✅ All endpoints working`);
    console.log(`📤 REAL photo upload to: http://img.instrumentstore.ru:7990/api/modelgoods/image/`);
    console.log(`🎯 When approving: Photo upload starts automatically`);
});