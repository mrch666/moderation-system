const db = require('./database');

class Settings {
  async getAll() {
    const query = 'SELECT * FROM settings ORDER BY category, key';
    const result = await db.query(query);
    
    // Группируем по категориям
    const grouped = {};
    result.rows.forEach(setting => {
      if (!grouped[setting.category]) {
        grouped[setting.category] = {};
      }
      grouped[setting.category][setting.key] = setting.value;
    });
    
    return grouped;
  }

  async getByKey(key) {
    const query = 'SELECT * FROM settings WHERE key = $1';
    const result = await db.query(query, [key]);
    return result.rows[0];
  }

  async getByCategory(category) {
    const query = 'SELECT * FROM settings WHERE category = $1';
    const result = await db.query(query, [category]);
    
    const settings = {};
    result.rows.forEach(setting => {
      settings[setting.key] = setting.value;
    });
    
    return settings;
  }

  async set(key, value, description = null, category = 'general') {
    const query = `
      INSERT INTO settings (key, value, description, category)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = EXCLUDED.value,
        description = COALESCE(EXCLUDED.description, settings.description),
        category = EXCLUDED.category,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await db.query(query, [key, value, description, category]);
    return result.rows[0];
  }

  async delete(key) {
    const query = 'DELETE FROM settings WHERE key = $1 RETURNING *';
    const result = await db.query(query, [key]);
    return result.rows[0];
  }

  async getApiKeys() {
    const query = `
      SELECT ak.*, u.username, u.telegram_id
      FROM api_keys ak
      LEFT JOIN users u ON ak.user_id = u.id
      WHERE ak.is_active = true
      ORDER BY ak.created_at DESC
    `;
    
    const result = await db.query(query);
    return result.rows;
  }

  async createApiKey(data) {
    const { key, name, user_id, permissions = ['read', 'submit'], expires_at = null } = data;
    
    const query = `
      INSERT INTO api_keys (key, name, user_id, permissions, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await db.query(query, [key, name, user_id, permissions, expires_at]);
    return result.rows[0];
  }

  async validateApiKey(apiKey) {
    const query = `
      SELECT * FROM api_keys 
      WHERE key = $1 
        AND is_active = true 
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `;
    
    const result = await db.query(query, [apiKey]);
    return result.rows[0];
  }

  async getTelegramChats() {
    const query = 'SELECT * FROM telegram_chats WHERE is_active = true ORDER BY created_at DESC';
    const result = await db.query(query);
    return result.rows;
  }

  async addTelegramChat(chatData) {
    const { chat_id, chat_type, title, username, settings = { notifications: true } } = chatData;
    
    const query = `
      INSERT INTO telegram_chats (chat_id, chat_type, title, username, settings)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (chat_id) 
      DO UPDATE SET 
        title = EXCLUDED.title,
        username = EXCLUDED.username,
        settings = EXCLUDED.settings,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await db.query(query, [chat_id, chat_type, title, username, settings]);
    return result.rows[0];
  }

  async updateTelegramChatSettings(chatId, settings) {
    const query = `
      UPDATE telegram_chats 
      SET settings = $1, updated_at = CURRENT_TIMESTAMP
      WHERE chat_id = $2
      RETURNING *
    `;
    
    const result = await db.query(query, [settings, chatId]);
    return result.rows[0];
  }

  async getNotificationSettings() {
    return this.getByCategory('notifications');
  }

  async getUploadSettings() {
    return this.getByCategory('upload');
  }
}

module.exports = new Settings();