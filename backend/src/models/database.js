const { Pool } = require('pg');
const redis = require('redis');

class Database {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.redisClient = redis.createClient({
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
    });

    this.connectRedis();
  }

  async connectRedis() {
    try {
      await this.redisClient.connect();
      console.log('✅ Connected to Redis');
    } catch (error) {
      console.error('❌ Redis connection error:', error);
    }
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log(`📊 Executed query: ${text} - ${duration}ms`);
      return res;
    } catch (error) {
      console.error('❌ Database query error:', error);
      throw error;
    }
  }

  async getRedis(key) {
    try {
      return await this.redisClient.get(key);
    } catch (error) {
      console.error('❌ Redis get error:', error);
      return null;
    }
  }

  async setRedis(key, value, ttl = 3600) {
    try {
      await this.redisClient.set(key, value, { EX: ttl });
    } catch (error) {
      console.error('❌ Redis set error:', error);
    }
  }

  async delRedis(key) {
    try {
      await this.redisClient.del(key);
    } catch (error) {
      console.error('❌ Redis delete error:', error);
    }
  }

  async close() {
    await this.pool.end();
    await this.redisClient.quit();
  }
}

module.exports = new Database();