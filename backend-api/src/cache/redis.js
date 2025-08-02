const redis = require('redis');

// Create Redis client
const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
});

// Handle Redis connection events
client.on('connect', () => {
  console.log('Connected to Redis');
});

client.on('error', (error) => {
  console.error('Redis connection error:', error);
});

client.on('reconnecting', () => {
  console.log('Reconnecting to Redis...');
});

// Connect to Redis
(async () => {
  try {
    await client.connect();
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
})();

// Wrapper methods for easier usage
const redisClient = {
  // Basic operations
  async get(key) {
    try {
      return await client.get(key);
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  },

  async set(key, value, options = {}) {
    try {
      return await client.set(key, value, options);
    } catch (error) {
      console.error('Redis SET error:', error);
      return null;
    }
  },

  async setEx(key, seconds, value) {
    try {
      return await client.setEx(key, seconds, value);
    } catch (error) {
      console.error('Redis SETEX error:', error);
      return null;
    }
  },

  async del(key) {
    try {
      return await client.del(key);
    } catch (error) {
      console.error('Redis DEL error:', error);
      return 0;
    }
  },

  async exists(key) {
    try {
      return await client.exists(key);
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return 0;
    }
  },

  async expire(key, seconds) {
    try {
      return await client.expire(key, seconds);
    } catch (error) {
      console.error('Redis EXPIRE error:', error);
      return 0;
    }
  },

  async ttl(key) {
    try {
      return await client.ttl(key);
    } catch (error) {
      console.error('Redis TTL error:', error);
      return -1;
    }
  },

  // Hash operations
  async hGet(key, field) {
    try {
      return await client.hGet(key, field);
    } catch (error) {
      console.error('Redis HGET error:', error);
      return null;
    }
  },

  async hSet(key, field, value) {
    try {
      return await client.hSet(key, field, value);
    } catch (error) {
      console.error('Redis HSET error:', error);
      return 0;
    }
  },

  async hGetAll(key) {
    try {
      return await client.hGetAll(key);
    } catch (error) {
      console.error('Redis HGETALL error:', error);
      return {};
    }
  },

  async hDel(key, field) {
    try {
      return await client.hDel(key, field);
    } catch (error) {
      console.error('Redis HDEL error:', error);
      return 0;
    }
  },

  // List operations
  async lPush(key, ...values) {
    try {
      return await client.lPush(key, values);
    } catch (error) {
      console.error('Redis LPUSH error:', error);
      return 0;
    }
  },

  async rPop(key) {
    try {
      return await client.rPop(key);
    } catch (error) {
      console.error('Redis RPOP error:', error);
      return null;
    }
  },

  async lRange(key, start, stop) {
    try {
      return await client.lRange(key, start, stop);
    } catch (error) {
      console.error('Redis LRANGE error:', error);
      return [];
    }
  },

  // Set operations
  async sAdd(key, ...members) {
    try {
      return await client.sAdd(key, members);
    } catch (error) {
      console.error('Redis SADD error:', error);
      return 0;
    }
  },

  async sMembers(key) {
    try {
      return await client.sMembers(key);
    } catch (error) {
      console.error('Redis SMEMBERS error:', error);
      return [];
    }
  },

  async sIsMember(key, member) {
    try {
      return await client.sIsMember(key, member);
    } catch (error) {
      console.error('Redis SISMEMBER error:', error);
      return false;
    }
  },

  // Utility methods
  async ping() {
    try {
      return await client.ping();
    } catch (error) {
      console.error('Redis PING error:', error);
      throw error;
    }
  },

  async flushDb() {
    try {
      return await client.flushDb();
    } catch (error) {
      console.error('Redis FLUSHDB error:', error);
      return 'ERROR';
    }
  },

  async quit() {
    try {
      return await client.quit();
    } catch (error) {
      console.error('Redis QUIT error:', error);
    }
  },

  // Cache helper methods
  async cache(key, ttl, fetchFunction) {
    const cached = await this.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const data = await fetchFunction();
    await this.setEx(key, ttl, JSON.stringify(data));
    return data;
  },

  async invalidatePattern(pattern) {
    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        return await client.del(keys);
      }
      return 0;
    } catch (error) {
      console.error('Redis pattern invalidation error:', error);
      return 0;
    }
  }
};

module.exports = redisClient;
