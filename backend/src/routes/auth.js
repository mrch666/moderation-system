const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const Settings = require('../models/Settings');

// Схема валидации для аутентификации по API ключу
const apiAuthSchema = Joi.object({
  api_key: Joi.string().required()
});

// Аутентификация по API ключу
router.post('/api-key', async (req, res) => {
  try {
    const { error, value } = apiAuthSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Проверка API ключа
    const apiKey = await Settings.validateApiKey(value.api_key);
    if (!apiKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Обновление времени последнего использования
    const db = require('../models/database');
    await db.query(
      'UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE id = $1',
      [apiKey.id]
    );

    // Генерация JWT токена
    const token = jwt.sign(
      {
        api_key_id: apiKey.id,
        user_id: apiKey.user_id,
        permissions: apiKey.permissions
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      data: {
        token,
        expires_in: process.env.JWT_EXPIRES_IN || '24h',
        permissions: apiKey.permissions
      }
    });
  } catch (error) {
    console.error('API key auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Валидация токена
router.post('/validate', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      res.json({
        success: true,
        data: {
          valid: true,
          decoded
        }
      });
    } catch (error) {
      res.json({
        success: true,
        data: {
          valid: false,
          error: error.message
        }
      });
    }
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение информации о текущем пользователе
router.get('/me', async (req, res) => {
  try {
    // Извлечение токена из заголовка
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Получение информации об API ключе
      const db = require('../models/database');
      const apiKeyResult = await db.query(
        'SELECT * FROM api_keys WHERE id = $1 AND is_active = true',
        [decoded.api_key_id]
      );

      if (apiKeyResult.rows.length === 0) {
        return res.status(401).json({ error: 'API key not found or inactive' });
      }

      const apiKey = apiKeyResult.rows[0];

      // Получение информации о пользователе
      let user = null;
      if (apiKey.user_id) {
        const User = require('../models/User');
        user = await User.findById(apiKey.user_id);
      }

      res.json({
        success: true,
        data: {
          api_key: {
            id: apiKey.id,
            name: apiKey.name,
            permissions: apiKey.permissions,
            created_at: apiKey.created_at,
            last_used: apiKey.last_used
          },
          user: user ? {
            id: user.id,
            username: user.username,
            telegram_id: user.telegram_id,
            role: user.role
          } : null
        }
      });
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Me endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновление токена (refresh)
router.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Проверка, что API ключ все еще активен
      const db = require('../models/database');
      const apiKeyResult = await db.query(
        'SELECT * FROM api_keys WHERE id = $1 AND is_active = true',
        [decoded.api_key_id]
      );

      if (apiKeyResult.rows.length === 0) {
        return res.status(401).json({ error: 'API key not found or inactive' });
      }

      const apiKey = apiKeyResult.rows[0];

      // Генерация нового токена
      const newToken = jwt.sign(
        {
          api_key_id: apiKey.id,
          user_id: apiKey.user_id,
          permissions: apiKey.permissions
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      res.json({
        success: true,
        data: {
          token: newToken,
          expires_in: process.env.JWT_EXPIRES_IN || '24h'
        }
      });
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Выход (инвалидация токена)
// Note: JWT токены stateless, но мы можем добавить их в blacklist
router.post('/logout', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    // Добавление токена в Redis blacklist
    const db = require('../models/database');
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await db.setRedis(`token_blacklist:${token}`, '1', ttl);
        }
      }
    } catch (error) {
      // Игнорируем ошибки декодирования
    }

    res.json({
      success: true,
      message: 'Token invalidated'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;