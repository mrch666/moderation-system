const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Moderation = require('../models/Moderation');
const Settings = require('../models/Settings');
const User = require('../models/User');
const { validateApiKey } = require('../middleware/auth');

// Схема валидации для отправки на модерацию
const submitSchema = Joi.object({
  image_url: Joi.string().uri().required(),
  product_id: Joi.string().required(),
  download_url: Joi.string().uri().required(),
  metadata: Joi.object().optional()
});

// Схема валидации для изменения статуса
const moderateSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
  reason: Joi.string().optional()
});

// Отправка на модерацию (публичный эндпоинт)
router.post('/submit', validateApiKey, async (req, res) => {
  try {
    // Валидация входных данных
    const { error, value } = submitSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Проверка настроек загрузки
    const uploadSettings = await Settings.getUploadSettings();
    // Здесь можно добавить проверку размера файла и типа изображения

    // Создание модерации
    const moderation = await Moderation.create(value);

    // Логирование
    await Moderation.addLog(
      moderation.id, 
      req.apiKey?.user_id || null, 
      'submitted', 
      { source: 'api' }
    );

    // Отправка уведомлений в Telegram (если включено)
    const notificationSettings = await Settings.getNotificationSettings();
    if (notificationSettings.notification_enabled === 'true') {
      // Здесь будет логика отправки уведомлений
      console.log(`📢 New moderation submitted: ${moderation.id}`);
    }

    res.status(201).json({
      success: true,
      data: {
        moderation_id: moderation.moderation_uuid,
        status: moderation.status,
        submitted_at: moderation.submitted_at
      }
    });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение статуса модерации
router.get('/status/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    
    const moderation = await Moderation.findByUuid(uuid);
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

// Получение очереди модерации (только для авторизованных пользователей)
router.get('/queue', validateApiKey, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    // Проверка прав доступа
    if (!req.apiKey?.permissions?.includes('moderate')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const queue = await Moderation.getQueue(parseInt(limit), parseInt(offset));
    
    res.json({
      success: true,
      data: queue,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: queue.length
      }
    });
  } catch (error) {
    console.error('Queue fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Изменение статуса модерации
router.put('/:id/moderate', validateApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Валидация входных данных
    const { error, value } = moderateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Проверка прав доступа
    if (!req.apiKey?.permissions?.includes('moderate')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Получение модерации
    const moderation = await Moderation.findById(id);
    if (!moderation) {
      return res.status(404).json({ error: 'Moderation not found' });
    }

    if (moderation.status !== 'pending') {
      return res.status(400).json({ error: 'Moderation already processed' });
    }

    // Обновление статуса
    const updated = await Moderation.updateStatus(
      id, 
      value.status, 
      req.apiKey.user_id
    );

    // Логирование
    await Moderation.addLog(
      id,
      req.apiKey.user_id,
      `status_${value.status}`,
      { reason: value.reason }
    );

    // Отправка уведомления о результате
    console.log(`📢 Moderation ${id} ${value.status} by user ${req.apiKey.user_id}`);

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Moderate error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Поиск модераций
router.get('/search', validateApiKey, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      product_id: req.query.product_id,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      limit: req.query.limit || 100
    };

    const results = await Moderation.search(filters);
    
    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение статистики
router.get('/stats', validateApiKey, async (req, res) => {
  try {
    const stats = await Moderation.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение логов модерации
router.get('/:id/logs', validateApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    
    const logs = await Moderation.getLogs(id);
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Logs fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;