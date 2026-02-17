const db = require('./database');

class User {
  async createOrUpdateFromTelegram(telegramUser) {
    const { id, username, first_name, last_name } = telegramUser;
    
    const query = `
      INSERT INTO users (telegram_id, username, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (telegram_id) 
      DO UPDATE SET 
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        last_active = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await db.query(query, [id, username, first_name, last_name]);
    return result.rows[0];
  }

  async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  async findByTelegramId(telegramId) {
    const query = 'SELECT * FROM users WHERE telegram_id = $1';
    const result = await db.query(query, [telegramId]);
    return result.rows[0];
  }

  async updateRole(userId, role) {
    const query = `
      UPDATE users 
      SET role = $1 
      WHERE id = $2 
      RETURNING *
    `;
    
    const result = await db.query(query, [role, userId]);
    return result.rows[0];
  }

  async getAll(limit = 100, offset = 0) {
    const query = `
      SELECT * FROM users 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    
    const result = await db.query(query, [limit, offset]);
    return result.rows;
  }

  async getModerators() {
    const query = `
      SELECT * FROM users 
      WHERE role IN ('admin', 'moderator') 
      AND is_active = true
      ORDER BY username
    `;
    
    const result = await db.query(query);
    return result.rows;
  }

  async updateLastActive(userId) {
    const query = `
      UPDATE users 
      SET last_active = CURRENT_TIMESTAMP 
      WHERE id = $1
    `;
    
    await db.query(query, [userId]);
  }

  async search(queryText) {
    const query = `
      SELECT * FROM users 
      WHERE 
        username ILIKE $1 OR
        first_name ILIKE $1 OR
        last_name ILIKE $1 OR
        telegram_id::TEXT LIKE $1
      ORDER BY username
      LIMIT 50
    `;
    
    const result = await db.query(query, [`%${queryText}%`]);
    return result.rows;
  }

  async getStats() {
    const query = `
      SELECT 
        role,
        COUNT(*) as count,
        COUNT(CASE WHEN last_active > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 1 END) as active_last_week
      FROM users 
      WHERE is_active = true
      GROUP BY role
    `;
    
    const result = await db.query(query);
    return result.rows;
  }

  async deactivate(userId) {
    const query = `
      UPDATE users 
      SET is_active = false 
      WHERE id = $1 
      RETURNING *
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows[0];
  }

  async activate(userId) {
    const query = `
      UPDATE users 
      SET is_active = true 
      WHERE id = $1 
      RETURNING *
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows[0];
  }
}

module.exports = new User();