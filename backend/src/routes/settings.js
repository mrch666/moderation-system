const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Settings = require('../models/Settings');
const User = require('../models/User');
const { validateApiKey, requireAdmin } = require('../middleware/auth');

// Схема валидации для настроек
const settingSchema = Joi.object({
  key: Joi.string().required(),
  value: Joi.string().required(),
  description: Joi.string().optional(),
  category: Joi.string().optional()
});

// Схема валидации для API ключа
const apiKeySchema = Joi.object({
  name: Joi.string().required(),
  user_id: Joi.number().integer().optional(),
  permissions: Joi.array().items(Joi.string()).optional(),
  expires_at: Joi.date().optional()
});

// Схема валидации для Telegram чата
const telegramChatSchema = Joi.object({
  chat_id: Joi.number().integer().required(),
  chat_type: Joi.string().valid('private', 'group', 'channel').required(),
  title: Joi.string().optional(),
  username: Joi.string().optional(),
  settings: Joi.object().optional()
});

// Получение всех настроек (только для админов)
router.get('/', validateApiKey, requireAdmin, async (req, res) => {
  try {
    const settings = await Settings.getAll();
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Settings fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновление настройки
router.put('/:key', validateApiKey, requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    
    const { error, value } = settingSchema.validate({
      key,
      ...req.body
    });
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const setting = await Settings.set(
      value.key,
      value.value,
      value.description,
      value.category
    );

    res.json({
      success: true,
      data: setting
    });
  } catch (error) {
    console.error('Setting update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение API ключей
router.get('/api-keys', validateApiKey, requireAdmin, async (req, res) => {
  try {
    const apiKeys = await Settings.getApiKeys();
    
    res.json({
      success: true,
      data: apiKeys
    });
  } catch (error) {
    console.error('API keys fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Создание нового API ключа
router.post('/api-keys', validateApiKey, requireAdmin, async (req, res) => {
  try {
    const { error, value } = apiKeySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Генерация случайного ключа
    const crypto = require('crypto');
    const apiKey = `mod_${crypto.randomBytes(32).toString('hex')}`;

    const apiKeyData = await Settings.createApiKey({
      key: apiKey,
      ...value
    });

    // Возвращаем ключ только один раз
    const response = { ...apiKeyData };
    response.key = apiKey;

    res.status(201).json({
      success: true,
      data: response,
      warning: 'Save this API key now - it will not be shown again!'
    });
  } catch (error) {
    console.error('API key creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Удаление API ключа
router.delete('/api-keys/:id', validateApiKey, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'UPDATE api_keys SET is_active = false WHERE id = $1 RETURNING *';
    const db = require('../models/database');
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({
      success: true,
      message: 'API key deactivated'
    });
  } catch (error) {
    console.error('API key deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение Telegram чатов
router.get('/telegram-chats', validateApiKey, requireAdmin, async (req, res) => {
  try {
    const chats = await Settings.getTelegramChats();
    
    res.json({
      success: true,
      data: chats
    });
  } catch (error) {
    console.error('Telegram chats fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Добавление/обновление Telegram чата
router.post('/telegram-chats', validateApiKey, requireAdmin, async (req, res) => {
  try {
    const { error, value } = telegramChatSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const chat = await Settings.addTelegramChat(value);

    res.status(201).json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('Telegram chat update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновление настроек Telegram чата
router.put('/telegram-chats/:chatId/settings', validateApiKey, requireAdmin, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object required' });
    }

    const chat = await Settings.updateTelegramChatSettings(chatId, settings);

    res.json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('Telegram chat settings update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение настроек уведомлений
router.get('/notifications', validateApiKey, async (req, res) => {
  try {
    const settings = await Settings.getNotificationSettings();
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Notification settings fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение настроек загрузки
router.get('/upload', validateApiKey, async (req, res) => {
  try {
    const settings = await Settings.getUploadSettings();
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Upload settings fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение пользователей
router.get('/users', validateApiKey, requireAdmin, async (req, res) => {
  try {
    const { limit = 100, offset = 0, search } = req.query;
    
    let users;
    if (search) {
      users = await User.search(search);
    } else {
      users = await User.getAll(parseInt(limit), parseInt(offset));
    }

    res.json({
      success: true,
      data: users,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: users.length
      }
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Изменение роли пользователя
router.put('/users/:id/role', validateApiKey, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'moderator', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await User.updateRole(id, role);

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('User role update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение статистики пользователей
router.get('/users/stats', validateApiKey, requireAdmin, async (req, res) => {
  try {
    const stats = await User.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;