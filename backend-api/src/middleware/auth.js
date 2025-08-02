const database = require('../database/connection');
const redisClient = require('../cache/redis');

async function authenticateApiKey(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header'
      });
    }
    
    const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key is required'
      });
    }
    
    // Check cache first
    const cachedKey = await redisClient.get(`api_key:${apiKey}`);
    if (cachedKey) {
      req.apiKey = JSON.parse(cachedKey);
      return next();
    }
    
    // Query database
    const rows = await database('api_keys')
      .select('id', 'name', 'permissions', 'is_active', 'expires_at', 'last_used_at')
      .where('key_hash', hashApiKey(apiKey))
      .where('is_active', true)
      .limit(1);
    
    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }
    
    const apiKeyData = rows[0];
    
    // Check if API key has expired
    if (apiKeyData.expires_at && new Date() > apiKeyData.expires_at) {
      return res.status(401).json({
        success: false,
        error: 'API key has expired'
      });
    }
    
    // Update last used timestamp
    await database('api_keys')
      .where('id', apiKeyData.id)
      .update('last_used_at', new Date());
    
    // Cache the API key data
    await redisClient.setEx(`api_key:${apiKey}`, 300, JSON.stringify(apiKeyData)); // 5 minutes cache
    
    req.apiKey = apiKeyData;
    next();
    
  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const permissions = req.apiKey.permissions || [];
    if (!permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: `Permission '${permission}' required`
      });
    }
    
    next();
  };
}

function hashApiKey(apiKey) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

module.exports = {
  authenticateApiKey,
  requirePermission,
  hashApiKey
};
