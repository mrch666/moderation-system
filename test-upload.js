// Простой тест загрузки изображений
const https = require('https');
const http = require('http');

console.log('=== ТЕСТ ЗАГРУЗКИ ИЗОБРАЖЕНИЙ ===');

const testItem = {
    product_id: '123TEST456',
    download_url: 'https://picsum.photos/800/600',
    image_url: 'https://picsum.photos/800/600'
};

// Парсим product_id для modelid
let modelid = testItem.product_id;
const match = testItem.product_id.match(/^(\d+)/);
if (match) {
    modelid = match[1];
}

console.log(`📤 Тестирую загрузку для товара ${testItem.product_id} (modelid: ${modelid})`);
console.log(`📤 URL: ${testItem.download_url}`);

const downloadUrl = testItem.download_url;
const protocol = downloadUrl.startsWith('https') ? https : http;

// Скачиваем изображение
protocol.get(downloadUrl, (response) => {
    console.log(`✅ Статус скачивания: ${response.statusCode}`);
    
    if (response.statusCode !== 200) {
        console.log('❌ Ошибка скачивания');
        return;
    }
    
    const chunks = [];
    response.on('data', (chunk) => chunks.push(chunk));
    response.on('end', () => {
        const imageBuffer = Buffer.concat(chunks);
        console.log(`✅ Изображение скачано (${imageBuffer.length} байт)`);
        
        // Пробуем отправить на целевой сервер
        const targetUrl = 'http://img.instrumentstore.ru:7990/api/modelgoods/image/';
        console.log(`📤 Отправляю на: ${targetUrl}`);
        
        // Пробуем разные форматы
        
        // 1. Формат FormData (как в оригинале)
        console.log('\n1. Тестирую FormData формат...');
        testFormDataUpload(modelid, imageBuffer);
        
        // 2. Формат JSON с base64
        console.log('\n2. Тестирую JSON формат...');
        testJsonUpload(modelid, imageBuffer);
    });
}).on('error', (err) => {
    console.log(`❌ Ошибка скачивания: ${err.message}`);
});

function testFormDataUpload(modelid, imageBuffer) {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('modelid', modelid);
    form.append('file', imageBuffer, {
        filename: `product_${modelid}.jpg`,
        contentType: 'image/jpeg'
    });
    
    const req = http.request({
        hostname: 'img.instrumentstore.ru',
        port: 7990,
        path: '/api/modelgoods/image/',
        method: 'POST',
        headers: form.getHeaders()
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log(`✅ FormData ответ: ${res.statusCode}`);
            console.log(`   Ответ сервера: ${data.substring(0, 200)}...`);
        });
    });
    
    req.on('error', (err) => {
        console.log(`❌ FormData ошибка: ${err.message}`);
    });
    
    req.setTimeout(10000, () => {
        console.log('❌ FormData таймаут');
        req.destroy();
    });
    
    form.pipe(req);
}

function testJsonUpload(modelid, imageBuffer) {
    const postData = JSON.stringify({
        modelid: modelid,
        image_data: imageBuffer.toString('base64'),
        filename: `product_${modelid}.jpg`
    });
    
    const options = {
        hostname: 'img.instrumentstore.ru',
        port: 7990,
        path: '/api/modelgoods/image/',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log(`✅ JSON ответ: ${res.statusCode}`);
            console.log(`   Ответ сервера: ${data.substring(0, 200)}...`);
        });
    });
    
    req.on('error', (err) => {
        console.log(`❌ JSON ошибка: ${err.message}`);
    });
    
    req.setTimeout(10000, () => {
        console.log('❌ JSON таймаут');
        req.destroy();
    });
    
    req.write(postData);
    req.end();
}