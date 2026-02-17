const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const https = require('https');
const http = require('http');
const FormData = require('form-data');

// Загрузка переменных окружения
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '../.env' : '../.env.development' });

// Инициализация приложения
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());

// Настройка CORS из переменных окружения
const corsOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:8080'];
const corsMethods = process.env.CORS_METHODS ? process.env.CORS_METHODS.split(',') : ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
const corsHeaders = process.env.CORS_ALLOWED_HEADERS ? process.env.CORS_ALLOWED_HEADERS.split(',') : ['Content-Type', 'X-API-Key', 'Authorization'];

app.use(cors({
  origin: corsOrigins,
  methods: corsMethods,
  allowedHeaders: corsHeaders,
  credentials: true,
  maxAge: 86400 // 24 часа
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting - более мягкие настройки для n8n
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 1000, // 1000 запросов в минуту
  message: {
    error: 'Too many requests, please try again later.',
    details: 'Try spacing your requests out using the batching settings under "Options"'
  },
  standardHeaders: true, // Возвращает информацию о лимитах в заголовках
  legacyHeaders: false, // Отключает старые заголовки
  skipSuccessfulRequests: false, // Считает все запросы
  keyGenerator: (req) => {
    // Используем API ключ для группировки лимитов
    return req.headers['x-api-key'] || req.ip;
  },
  skip: (req) => {
    // Пропускаем rate limiting для валидного API ключа
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.API_KEY || 'test_api_key_123456';
    if (apiKey === validApiKey) {
      console.log('⏭️ Пропуск rate limiting для валидного API ключа');
      return true;
    }
    return false;
  }
});

// Применяем rate limiting только к определенным endpoints
app.use('/api/moderation/submit', limiter); // Только для отправки на модерацию
// Другие endpoints могут иметь другие лимиты или не иметь их вообще

// Инициализация базы данных
const db = require('./src/simple-database');

// Middleware для проверки API ключа
async function validateApiKey(req, res, next) {
    try {
        const apiKey = req.headers['x-api-key'] || req.query.api_key;
        
        console.log(`🔑 Проверка API ключа для ${req.method} ${req.path}, ключ: ${apiKey ? 'предоставлен' : 'отсутствует'}`);
        
        if (!apiKey) {
            console.log('❌ API ключ отсутствует');
            return res.status(401).json({ error: 'API key required' });
        }

        // Проверка API ключа в базе данных
        const validKey = await db.get(
            'SELECT * FROM api_keys WHERE key = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > datetime("now"))',
            [apiKey]
        );

        if (!validKey) {
            console.log(`❌ Неверный API ключ: ${apiKey}`);
            return res.status(401).json({ error: 'Invalid API key' });
        }
        
        console.log(`✅ API ключ действителен, пользователь: ${validKey.user_id || 'system'}`);

        // Обновляем время последнего использования
        await db.run(
            'UPDATE api_keys SET last_used = datetime("now") WHERE id = ?',
            [validKey.id]
        );

        // Сохраняем информацию об API ключе
        req.apiKey = {
            id: validKey.id,
            user_id: validKey.user_id,
            permissions: JSON.parse(validKey.permissions || '[]')
        };

        next();
    } catch (error) {
        console.error('API key validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Moderation System API',
        version: '1.0.0'
    });
});

// Отправка на модерацию (оптимизированная версия)
app.post('/api/moderation/submit', validateApiKey, async (req, res) => {
    // Начинаем отсчет времени для отладки
    const startTime = Date.now();
    
    try {
        const { image_url, product_id, download_url, metadata } = req.body;

        // Быстрая валидация - проверяем только наличие полей
        if (!image_url || !product_id || !download_url) {
            console.log(`❌ Быстрая валидация failed: ${Date.now() - startTime}ms`);
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Генерируем UUID сразу (быстрая операция)
        const moderation_uuid = uuidv4();
        const metadataStr = metadata ? JSON.stringify(metadata) : null;
        const submitted_at = new Date().toISOString();

        // Отправляем быстрый ответ клиенту ДО записи в БД
        const quickResponse = {
            success: true,
            data: {
                moderation_id: moderation_uuid,
                status: 'pending',
                submitted_at: submitted_at
            }
        };

        // Отправляем ответ немедленно
        res.status(201).json(quickResponse);
        
        const responseTime = Date.now() - startTime;
        console.log(`✅ Быстрый ответ отправлен за ${responseTime}ms, ID: ${moderation_uuid}`);
        
        // Асинхронно сохраняем в базу данных (после отправки ответа)
        setTimeout(async () => {
            try {
                // Проверка URL (делаем асинхронно)
                try {
                    new URL(image_url);
                    new URL(download_url);
                } catch (error) {
                    console.error(`❌ Неверный URL для ${moderation_uuid}:`, error.message);
                    // Можно обновить статус в БД или оставить как есть
                    return;
                }

                // Сохраняем в базу данных
                await db.run(
                    `INSERT INTO moderations (moderation_uuid, image_url, product_id, download_url, metadata, submitted_at) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [moderation_uuid, image_url, product_id, download_url, metadataStr, submitted_at]
                );
                
                console.log(`💾 Данные сохранены в БД для ${moderation_uuid}, общее время: ${Date.now() - startTime}ms`);
            } catch (dbError) {
                console.error(`❌ Ошибка БД для ${moderation_uuid}:`, dbError.message);
            }
        }, 0); // Используем setTimeout для асинхронного выполнения

    } catch (error) {
        console.error('Submit error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Проверка статуса
app.get('/api/moderation/status/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        
        const moderation = await db.get(
            'SELECT * FROM moderations WHERE moderation_uuid = ?',
            [uuid]
        );

        if (!moderation) {
            return res.status(404).json({ error: 'Moderation not found' });
        }

        res.json({
            success: true,
            data: {
                status: moderation.status,
                submitted_at: moderation.submitted_at,
                moderated_at: moderation.moderated_at,
                product_id: moderation.product_id
            }
        });
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение очереди
app.get('/api/moderation/queue', validateApiKey, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20; // По умолчанию 20 на страницу
        const offset = parseInt(req.query.offset) || 0;
        const page = parseInt(req.query.page) || 1;

        // Проверка прав доступа
        if (!req.apiKey.permissions.includes('moderate')) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        // Получаем очередь с пагинацией
        const queue = await db.query(
            `SELECT m.*, u.username as moderator_username
             FROM moderations m
             LEFT JOIN users u ON m.moderator_id = u.id
             WHERE m.status = 'pending'
             ORDER BY m.submitted_at ASC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        // Получаем общее количество записей в очереди
        const totalResult = await db.get(
            `SELECT COUNT(*) as total FROM moderations WHERE status = 'pending'`
        );
        const total = totalResult.total;

        // Вычисляем информацию о пагинации
        const totalPages = Math.ceil(total / limit);
        const currentPage = page || Math.floor(offset / limit) + 1;

        res.json({
            success: true,
            data: queue,
            pagination: {
                limit,
                offset,
                page: currentPage,
                total,
                totalPages,
                hasNext: offset + limit < total,
                hasPrev: offset > 0
            }
        });
    } catch (error) {
        console.error('Queue fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Функция для загрузки изображения на целевой сервер
async function uploadImageToTargetServer(fileUrl, productId) {
    return new Promise((resolve, reject) => {
        console.log(`🔄 Загрузка файла для товара ${productId}...`);
        console.log(`   Источник файла: ${fileUrl}`);
        const targetServerUrl = process.env.TARGET_SERVER_URL || 'http://img.instrumentstore.ru:7990/api/modelgoods/image/';
        console.log(`   Целевой сервер: ${targetServerUrl}`);
        
        // Проверяем, доступен ли URL файла
        if (!fileUrl || !fileUrl.startsWith('http')) {
            console.log(`❌ Неверный URL файла: ${fileUrl}`);
            resolve({
                success: false,
                error: `Invalid file URL: ${fileUrl}`,
                skipped: true
            });
            return;
        }
        
        // Используем правильный протокол (http или https)
        const urlProtocol = fileUrl.startsWith('https') ? https : http;
        
        // Скачиваем файл
        urlProtocol.get(fileUrl, (response) => {
            if (response.statusCode !== 200) {
                console.log(`❌ Ошибка скачивания изображения: HTTP ${response.statusCode}`);
                resolve({
                    success: false,
                    error: `Failed to download image: HTTP ${response.statusCode}`,
                    skipped: true
                });
                return;
            }
            
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', async () => {
                try {
                    const buffer = Buffer.concat(chunks);
                    const contentType = response.headers['content-type'] || 'image/jpeg';
                    
                    console.log(`📥 Изображение скачано: ${buffer.length} bytes, ${contentType}`);
                    
                    // Создаем FormData
                    const FormData = require('form-data');
                    const form = new FormData();
                    
                    // Добавляем поля в форму
                    form.append('modelid', productId);
                    form.append('file', buffer, {
                        filename: `${productId}.jpg`,
                        contentType: contentType
                    });
                    
                    // Отправляем на целевой сервер
                    const targetServerUrl = process.env.TARGET_SERVER_URL || 'http://img.instrumentstore.ru:7990/api/modelgoods/image/';
                    const url = new URL(targetServerUrl);
                    
                    const uploadOptions = {
                        hostname: url.hostname,
                        port: url.port || (url.protocol === 'https:' ? 443 : 80),
                        path: url.pathname,
                        method: 'POST',
                        headers: form.getHeaders()
                    };
                    
                    console.log(`📤 Отправка на целевой сервер...`);
                    
                    const req = http.request(uploadOptions, (uploadRes) => {
                        let responseData = '';
                        
                        uploadRes.on('data', (chunk) => {
                            responseData += chunk;
                        });
                        
                        uploadRes.on('end', () => {
                            console.log(`📨 Ответ от сервера: ${uploadRes.statusCode}`);
                            
                            try {
                                const result = JSON.parse(responseData);
                                console.log(`📊 Результат загрузки:`, result);
                                
                                if (result.status === 'success') {
                                    resolve({
                                        success: true,
                                        filename: result.filename,
                                        message: result.message,
                                        server_response: result
                                    });
                                } else {
                                    resolve({
                                        success: false,
                                        error: result.message || 'Upload failed',
                                        server_response: result
                                    });
                                }
                            } catch (parseError) {
                                console.error('❌ Ошибка парсинга ответа:', parseError);
                                resolve({
                                    success: false,
                                    error: 'Invalid JSON response from server',
                                    raw_response: responseData
                                });
                            }
                        });
                    });
                    
                    req.on('error', (error) => {
                        console.error('❌ Ошибка сети при загрузке:', error.message);
                        resolve({
                            success: false,
                            error: `Network error: ${error.message}`,
                            skipped: false
                        });
                    });
                    
                    // Устанавливаем таймаут
                    req.setTimeout(30000, () => {
                        req.destroy();
                        console.error('❌ Таймаут загрузки');
                        resolve({
                            success: false,
                            error: 'Upload timeout (30s)',
                            skipped: false
                        });
                    });
                    
                    // Отправляем форму
                    form.pipe(req);
                    
                } catch (error) {
                    console.error('❌ Ошибка обработки изображения:', error);
                    resolve({
                        success: false,
                        error: `Processing error: ${error.message}`,
                        skipped: false
                    });
                }
            });
            
        }).on('error', (error) => {
            console.error('❌ Ошибка скачивания:', error.message);
            resolve({
                success: false,
                error: `Download error: ${error.message}`,
                skipped: true
            });
        });
    });
}

// Изменение статуса модерации
app.put('/api/moderation/:id/moderate', validateApiKey, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;

        // Валидация
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Проверка прав доступа
        if (!req.apiKey.permissions.includes('moderate')) {
            return res.status(403).json({ error: 'Insufficient permissions' });
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
        let approvedCount = 1; // текущий товар
        let uploadResult = null;
        
        if (status === 'approved') {
            // Загружаем изображение на целевой сервер
            // Используем download_url если доступен, иначе image_url
            const fileUrl = moderation.download_url || moderation.image_url;
            
            try {
                uploadResult = await uploadImageToTargetServer(
                    fileUrl,
                    moderation.product_id
                );
                console.log('✅ Изображение загружено на целевой сервер:', uploadResult);
            } catch (uploadError) {
                console.error('❌ Ошибка загрузки изображения:', uploadError);
                // Продолжаем обработку даже при ошибке загрузки
                uploadResult = {
                    success: false,
                    error: uploadError.message
                };
            }
            
            // Находим все pending товары с таким же product_id
            const sameProductItems = await db.query(
                `SELECT id FROM moderations 
                 WHERE product_id = ? AND status = 'pending' AND id != ?`,
                [moderation.product_id, id]
            );
            
            // Одобряем все найденные товары
            if (sameProductItems.length > 0) {
                const ids = sameProductItems.map(item => item.id);
                const placeholders = ids.map(() => '?').join(',');
                
                await db.run(
                    `UPDATE moderations 
                     SET status = 'approved', moderated_at = datetime("now"), moderator_id = ?
                     WHERE id IN (${placeholders})`,
                    [req.apiKey.user_id || null, ...ids]
                );
                
                approvedCount += ids.length;
            }
        }
        
        // Обновление статуса текущего товара
        await db.run(
            `UPDATE moderations 
             SET status = ?, moderated_at = datetime("now"), moderator_id = ?, reason = ?
             WHERE id = ?`,
            [status, req.apiKey.user_id || null, reason || null, id]
        );

        const responseData = {
            id: parseInt(id),
            status,
            moderated_at: new Date().toISOString(),
            approved_count: status === 'approved' ? approvedCount : 1,
            message: status === 'approved' ? 
                `Одобрено ${approvedCount} товаров с product_id: ${moderation.product_id}` :
                'Товар отклонен'
        };
        
        // Добавляем информацию о загрузке изображения
        if (status === 'approved' && uploadResult) {
            responseData.upload = uploadResult;
            if (uploadResult.success) {
                responseData.message += `. Изображение загружено: ${uploadResult.filename}`;
            } else {
                responseData.message += `. Ошибка загрузки изображения: ${uploadResult.error}`;
            }
        }
        
        res.json({
            success: true,
            data: responseData
        });
    } catch (error) {
        console.error('Moderate error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение статистики
app.get('/api/moderation/stats', validateApiKey, async (req, res) => {
    try {
        console.log('📊 Запрос статистики...');
        
        // Получаем общую статистику
        const totalStats = await db.query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM moderations
            GROUP BY status
        `);
        
        console.log('📊 Общая статистика:', totalStats);
        
        // Получаем статистику по обработанным
        const processedStats = await db.query(`
            SELECT 
                status,
                COUNT(*) as count,
                AVG(JULIANDAY(moderated_at) - JULIANDAY(submitted_at)) * 86400 as avg_processing_time
            FROM moderations
            WHERE moderated_at IS NOT NULL
            GROUP BY status
        `);

        console.log('📊 Статистика обработанных:', processedStats);
        
        // Объединяем статистику
        const statsMap = {};
        
        // Добавляем общую статистику
        totalStats.forEach(stat => {
            statsMap[stat.status] = {
                status: stat.status,
                count: stat.count,
                avg_processing_time: 0
            };
        });
        
        // Обновляем с данными по обработанным
        processedStats.forEach(stat => {
            if (statsMap[stat.status]) {
                statsMap[stat.status].avg_processing_time = stat.avg_processing_time || 0;
            }
        });

        console.log('📊 Итоговая статистика:', Object.values(statsMap));
        
        res.json({
            success: true,
            data: Object.values(statsMap)
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение деталей модерации (ДОЛЖЕН БЫТЬ ПОСЛЕ /api/moderation/stats!)
app.get('/api/moderation/:id', validateApiKey, async (req, res) => {
    try {
        const { id } = req.params;

        // Получение модерации
        const moderation = await db.get(
            'SELECT * FROM moderations WHERE id = ?',
            [id]
        );

        if (!moderation) {
            return res.status(404).json({ error: 'Moderation not found' });
        }

        res.json({
            success: true,
            data: {
                id: moderation.id,
                product_id: moderation.product_id,
                image_url: moderation.image_url,
                download_url: moderation.download_url,
                status: moderation.status,
                submitted_at: moderation.submitted_at,
                moderated_at: moderation.moderated_at,
                moderator_id: moderation.moderator_id,
                reason: moderation.reason,
                metadata: moderation.metadata
            }
        });
    } catch (error) {
        console.error('Get moderation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение настроек
app.get('/api/settings', validateApiKey, async (req, res) => {
    try {
        const settings = await db.query(
            'SELECT * FROM settings ORDER BY category, key'
        );
        
        // Группируем по категориям
        const grouped = {};
        settings.forEach(setting => {
            if (!grouped[setting.category]) {
                grouped[setting.category] = {};
            }
            grouped[setting.category][setting.key] = setting.value;
        });
        
        res.json({
            success: true,
            data: grouped
        });
    } catch (error) {
        console.error('Settings fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Аутентификация по API ключу
app.post('/api/auth/api-key', async (req, res) => {
    try {
        const { api_key } = req.body;
        
        if (!api_key) {
            return res.status(400).json({ error: 'API key required' });
        }

        // Проверка API ключа
        const apiKey = await db.get(
            'SELECT * FROM api_keys WHERE key = ? AND is_active = 1',
            [api_key]
        );

        if (!apiKey) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        // Обновление времени последнего использования
        await db.run(
            'UPDATE api_keys SET last_used = datetime("now") WHERE id = ?',
            [apiKey.id]
        );

        res.json({
            success: true,
            data: {
                permissions: JSON.parse(apiKey.permissions || '[]'),
                expires_in: '24h'
            }
        });
    } catch (error) {
        console.error('API key auth error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Информация о текущем пользователе
app.get('/api/auth/me', validateApiKey, async (req, res) => {
    try {
        const apiKey = req.apiKey;
        
        let user = null;
        if (apiKey.user_id) {
            user = await db.get(
                'SELECT id, username, telegram_id, role FROM users WHERE id = ?',
                [apiKey.user_id]
            );
        }

        res.json({
            success: true,
            data: {
                api_key: {
                    id: apiKey.id,
                    permissions: apiKey.permissions
                },
                user
            }
        });
    } catch (error) {
        console.error('Me endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Simple Backend API running on port ${PORT}`);
    console.log(`📁 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🔑 API key: ${process.env.API_KEY ? 'Установлен' : 'Используется тестовый'}`);
});

module.exports = app;