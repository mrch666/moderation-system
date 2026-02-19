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
        service: 'Simple Fixed Backend',
        photo_upload: 'REAL to img.instrumentstore.ru:7990'
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

// Moderate with SIMPLE but REAL upload
app.put('/api/moderation/:id/moderate', (req, res) => {
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
                    photo_upload: status === 'approved' ? 'REAL upload started' : 'none'
                }
            });
            
            // SIMPLE but REAL upload (if approved)
            if (status === 'approved') {
                console.log(`🚀 SIMPLE REAL: Starting photo upload for ${item.product_id}`);
                
                setTimeout(() => {
                    simpleRealUpload(item);
                }, 100);
            }
        });
    });
});

// SIMPLE but REAL upload function
function simpleRealUpload(item) {
    console.log(`📤 SIMPLE REAL: Uploading photo for ${item.product_id}`);
    
    const imageUrl = item.download_url || item.image_url;
    if (!imageUrl) {
        console.log('❌ No image URL');
        return;
    }
    
    // Extract modelid
    let modelid = item.product_id.match(/^(\d+)/);
    modelid = modelid ? modelid[1] : '12345';
    
    console.log(`📤 ModelID: ${modelid}, URL: ${imageUrl}`);
    
    // Create simple multipart/form-data manually
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    
    // We'll create a simple test request first
    testUpload(modelid, item.product_id, imageUrl);
}

// Test upload with simple request
function testUpload(modelid, productId, imageUrl) {
    console.log(`📤 Testing upload to http://img.instrumentstore.ru:7990/api/modelgoods/image/`);
    
    // First, try to download the image
    const protocol = imageUrl.startsWith('https') ? https : http;
    
    protocol.get(imageUrl, (response) => {
        if (response.statusCode !== 200) {
            console.log(`❌ Download failed: ${response.statusCode}`);
            return;
        }
        
        let data = [];
        response.on('data', chunk => data.push(chunk));
        response.on('end', () => {
            const imageBuffer = Buffer.concat(data);
            console.log(`✅ Image downloaded (${imageBuffer.length} bytes)`);
            
            // Now try to upload with correct multipart/form-data
            uploadWithMultipart(modelid, imageBuffer, productId);
        });
    }).on('error', (err) => {
        console.log(`❌ Download error: ${err.message}`);
    });
}

// Upload with multipart/form-data
function uploadWithMultipart(modelid, imageBuffer, productId) {
    console.log(`📤 Creating multipart/form-data for upload...`);
    
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    
    // Build multipart body manually
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
    
    console.log(`📤 Sending ${fullBody.length} bytes to server...`);
    
    const req = http.request(options, (res) => {
        let response = '';
        res.on('data', chunk => response += chunk);
        res.on('end', () => {
            console.log(`✅ SERVER RESPONSE: ${res.statusCode}`);
            console.log(`Response: ${response.substring(0, 200)}...`);
            
            if (res.statusCode === 200 || res.statusCode === 201) {
                console.log(`🎉 SUCCESS! PHOTO UPLOADED TO SERVER!`);
                console.log(`   Product: ${productId}, ModelID: ${modelid}`);
            } else {
                console.log(`⚠️ Server error ${res.statusCode}`);
            }
        });
    });
    
    req.on('error', (err) => {
        console.log(`❌ Network error: ${err.message}`);
    });
    
    req.on('timeout', () => {
        console.log('❌ Timeout (30 seconds)');
        req.destroy();
    });
    
    req.write(fullBody);
    req.end();
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SIMPLE FIXED BACKEND STARTED`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`🌐 http://192.168.1.189:${PORT}`);
    console.log(`✅ All endpoints working`);
    console.log(`📤 REAL photo upload with multipart/form-data`);
    console.log(`🎯 Target: http://img.instrumentstore.ru:7990/api/modelgoods/image/`);
});