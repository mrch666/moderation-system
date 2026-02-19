const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const https = require('https');
const http = require('http');
const { Buffer } = require('buffer');
const FormData = require('form-data');

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
        service: 'Fixed Upload Backend',
        photo_upload: 'REAL multipart/form-data to img.instrumentstore.ru:7990'
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

// Moderate with FIXED photo upload
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
                    photo_upload: status === 'approved' ? 'started' : 'none'
                }
            });
            
            // FIXED photo upload (if approved)
            if (status === 'approved') {
                console.log(`🚀 FIXED: Starting REAL photo upload for ${item.product_id}`);
                
                setTimeout(() => {
                    uploadPhotoWithFormData(item);
                }, 100);
            }
        });
    });
});

// FIXED: Upload photo using multipart/form-data
function uploadPhotoWithFormData(item) {
    console.log(`📤 FIXED: Uploading photo for ${item.product_id} using multipart/form-data`);
    
    const imageUrl = item.download_url || item.image_url;
    if (!imageUrl) {
        console.log('❌ No image URL');
        return;
    }
    
    // Extract modelid
    let modelid = item.product_id.match(/^(\d+)/);
    modelid = modelid ? modelid[1] : '12345';
    
    console.log(`📤 ModelID: ${modelid}, URL: ${imageUrl}`);
    
    // Download image first
    downloadImage(imageUrl)
        .then(imageBuffer => {
            console.log(`✅ Image downloaded (${imageBuffer.length} bytes)`);
            
            // Create FormData
            const form = new FormData();
            form.append('modelid', modelid);
            form.append('file', imageBuffer, {
                filename: `product_${item.product_id}.jpg`,
                contentType: 'image/jpeg'
            });
            
            // Send to target server
            return sendFormData(form, item.product_id);
        })
        .then(result => {
            if (result.success) {
                console.log(`🎉 FIXED: PHOTO SUCCESSFULLY UPLOADED TO SERVER!`);
                console.log(`   Product: ${item.product_id}`);
                console.log(`   Response: ${result.response.substring(0, 200)}...`);
            } else {
                console.log(`⚠️ FIXED: Upload error: ${result.error}`);
            }
        })
        .catch(error => {
            console.log(`❌ FIXED: Error: ${error.message}`);
        });
}

// Download image
function downloadImage(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        
        protocol.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }
            
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
        }).on('error', reject);
    });
}

// Send FormData to target server
function sendFormData(form, productId) {
    return new Promise((resolve, reject) => {
        console.log(`📤 FIXED: Sending multipart/form-data to http://img.instrumentstore.ru:7990/api/modelgoods/image/`);
        
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
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                console.log(`✅ FIXED: Server response: ${res.statusCode}`);
                
                if (res.statusCode === 200 || res.statusCode === 201) {
                    resolve({
                        success: true,
                        statusCode: res.statusCode,
                        response: responseData
                    });
                } else {
                    resolve({
                        success: false,
                        statusCode: res.statusCode,
                        error: `HTTP ${res.statusCode}`,
                        response: responseData
                    });
                }
            });
        });
        
        req.on('error', (err) => {
            resolve({
                success: false,
                error: err.message
            });
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: false,
                error: 'Timeout (30 seconds)'
            });
        });
        
        // Pipe form data to request
        form.pipe(req);
    });
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 FIXED UPLOAD BACKEND STARTED`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`🌐 http://192.168.1.189:${PORT}`);
    console.log(`✅ All endpoints working`);
    console.log(`📤 REAL multipart/form-data upload to: http://img.instrumentstore.ru:7990/api/modelgoods/image/`);
    console.log(`🎯 When approving: Photo upload starts automatically with correct format`);
});