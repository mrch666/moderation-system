const jwt = require('jsonwebtoken');
const Settings = require('../models/Settings');
const db = require('../models/database');

// Middleware для проверки API ключа из заголовка
async function validateApiKey(req, res, next) {
  try {
    // Проверка API ключа из заголовка
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    // Проверка валидности API ключа
    const validKey = await Settings.validateApiKey(apiKey);
    if (!validKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Сохраняем информацию об API ключе в запросе
    req.apiKey = {
      id: validKey.id,
      user_id: validKey.user_id,
      permissions: validKey.permissions || []
    };

    // Обновляем время последнего использования
    await db.query(
      'UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE id = $1',
      [validKey.id]
    );

    next();
  } catch (error) {
    console.error('API key validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Middleware для проверки JWT токена
async function validateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.substring(7);

    // Проверка blacklist
    const blacklisted = await db.getRedis(`token_blacklist:${token}`);
    if (blacklisted) {
      return res.status(401).json({ error: 'Token revoked' });
    }

    // Верификация токена
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Проверка, что API ключ все еще активен
    const apiKeyResult = await db.query(
      'SELECT * FROM api_keys WHERE id = $1 AND is_active = true',
      [decoded.api_key_id]
    );

    if (apiKeyResult.rows.length === 0) {
      return res.status(401).json({ error: 'API key not found or inactive' });
    }

    const apiKey = apiKeyResult.rows[0];

    // Сохраняем информацию в запросе
    req.user = {
      api_key_id: apiKey.id,
      user_id: apiKey.user_id,
      permissions: apiKey.permissions || [],
      token_decoded: decoded
    };

    next();
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Middleware для проверки прав доступа
function requirePermission(permission) {
  return (req, res, next) => {
    const permissions = req.apiKey?.permissions || req.user?.permissions || [];
    
    if (!permissions.includes(permission)) {
      return res.status(403).json({ 
        error: `Permission denied. Required: ${permission}` 
      });
    }
    
    next();
  };
}

// Middleware для проверки роли администратора
async function requireAdmin(req, res, next) {
  try {
    const userId = req.apiKey?.user_id || req.user?.user_id;
    
    if (!userId) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Проверка роли пользователя в базе данных
    const User = require('../models/User');
    const user = await User.findById(userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Middleware для проверки роли модератора или администратора
async function requireModerator(req, res, next) {
  try {
    const userId = req.apiKey?.user_id || req.user?.user_id;
    
    if (!userId) {
      return res.status(403).json({ error: 'Moderator access required' });
    }

    // Проверка роли пользователя в базе данных
    const User = require('../models/User');
    const user = await User.findById(userId);
    
    if (!user || !['admin', 'moderator'].includes(user.role)) {
      return res.status(403).json({ error: 'Moderator access required' });
    }

    next();
  } catch (error) {
    console.error('Moderator check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Middleware для логирования запросов
function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Логируем после завершения запроса
  res.on('finish', () => {
    const duration = Date.now() - start;
    const userInfo = req.apiKey?.user_id 
      ? `API Key User: ${req.apiKey.user_id}` 
      : req.user?.user_id 
        ? `JWT User: ${req.user.user_id}`
        : 'Unauthenticated';
    
    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms - ${userInfo}`
    );
  });
  
  next();
}

// Middleware для ограничения скорости запросов
function rateLimitByApiKey(req, res, next) {
  // Эта функция должна использоваться вместе с express-rate-limit
  // Здесь можно добавить кастомную логику для разных API ключей
  next();
}

module.exports = {
  validateApiKey,
  validateToken,
  requirePermission,
  requireAdmin,
  requireModerator,
  requestLogger,
  rateLimitByApiKey
};