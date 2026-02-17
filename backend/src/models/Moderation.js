const db = require('./database');

class Moderation {
  async create(data) {
    const { image_url, product_id, download_url, metadata = {} } = data;
    
    const query = `
      INSERT INTO moderations (image_url, product_id, download_url, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await db.query(query, [image_url, product_id, download_url, metadata]);
    return result.rows[0];
  }

  async findById(id) {
    const query = 'SELECT * FROM moderations WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  async findByUuid(uuid) {
    const query = 'SELECT * FROM moderations WHERE moderation_uuid = $1';
    const result = await db.query(query, [uuid]);
    return result.rows[0];
  }

  async updateStatus(id, status, moderatorId = null) {
    const query = `
      UPDATE moderations 
      SET status = $1, moderated_at = CURRENT_TIMESTAMP, moderator_id = $2
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await db.query(query, [status, moderatorId, id]);
    return result.rows[0];
  }

  async getQueue(limit = 50, offset = 0) {
    const query = `
      SELECT m.*, u.username as moderator_username
      FROM moderations m
      LEFT JOIN users u ON m.moderator_id = u.id
      WHERE m.status = 'pending'
      ORDER BY m.submitted_at ASC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await db.query(query, [limit, offset]);
    return result.rows;
  }

  async getStats() {
    const query = `
      SELECT 
        status,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (moderated_at - submitted_at))) as avg_processing_time
      FROM moderations
      WHERE moderated_at IS NOT NULL
      GROUP BY status
    `;
    
    const result = await db.query(query);
    return result.rows;
  }

  async search(filters = {}) {
    let query = 'SELECT * FROM moderations WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.product_id) {
      query += ` AND product_id = $${paramCount}`;
      params.push(filters.product_id);
      paramCount++;
    }

    if (filters.start_date) {
      query += ` AND submitted_at >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      query += ` AND submitted_at <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    query += ` ORDER BY submitted_at DESC LIMIT $${paramCount}`;
    params.push(filters.limit || 100);

    const result = await db.query(query, params);
    return result.rows;
  }

  async addLog(moderationId, userId, action, details = {}) {
    const query = `
      INSERT INTO moderation_logs (moderation_id, user_id, action, details)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await db.query(query, [moderationId, userId, action, details]);
    return result.rows[0];
  }

  async getLogs(moderationId) {
    const query = `
      SELECT ml.*, u.username, u.telegram_id
      FROM moderation_logs ml
      LEFT JOIN users u ON ml.user_id = u.id
      WHERE ml.moderation_id = $1
      ORDER BY ml.created_at DESC
    `;
    
    const result = await db.query(query, [moderationId]);
    return result.rows;
  }
}

module.exports = new Moderation();