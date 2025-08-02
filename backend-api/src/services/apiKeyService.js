const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const database = require('../database/connection');
const { hashApiKey } = require('../middleware/auth');

class ApiKeyService {
  async createApiKey({ name, description, permissions }) {
    const keyId = uuidv4();
    const rawKey = this.generateApiKey();
    const keyHash = hashApiKey(rawKey);
    
    const apiKeyData = {
      id: keyId,
      name,
      description: description || '',
      key_hash: keyHash,
      permissions: JSON.stringify(permissions),
      is_active: true,
      created_at: new Date(),
      expires_at: null, // No expiration by default
      last_used_at: null
    };
    
    await database('api_keys').insert(apiKeyData);
    
    return {
      id: keyId,
      name,
      description,
      key: rawKey, // Only returned once
      permissions,
      createdAt: apiKeyData.created_at,
      expiresAt: apiKeyData.expires_at
    };
  }

  async getApiKeys() {
    const rows = await database('api_keys')
      .select('id', 'name', 'description', 'permissions', 'is_active', 'created_at', 'expires_at', 'last_used_at')
      .where('is_active', true)
      .orderBy('created_at', 'DESC');
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      permissions: JSON.parse(row.permissions || '[]'),
      isActive: row.is_active,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      lastUsedAt: row.last_used_at
    }));
  }

  async getApiKey(keyId) {
    const rows = await database('api_keys')
      .select('*')
      .where('id', keyId)
      .where('is_active', true)
      .limit(1);
    
    if (rows.length === 0) {
      return null;
    }
    
    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      permissions: JSON.parse(row.permissions || '[]'),
      isActive: row.is_active,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      lastUsedAt: row.last_used_at
    };
  }

  async revokeApiKey(keyId) {
    const result = await database('api_keys')
      .where('id', keyId)
      .update({
        is_active: false,
        updated_at: new Date()
      });
    
    return result > 0;
  }

  async updateApiKey(keyId, updates) {
    const allowedUpdates = ['name', 'description', 'permissions', 'expires_at'];
    const filteredUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        if (key === 'permissions') {
          filteredUpdates[key] = JSON.stringify(updates[key]);
        } else {
          filteredUpdates[key] = updates[key];
        }
      }
    });
    
    filteredUpdates.updated_at = new Date();
    
    const result = await database('api_keys')
      .where('id', keyId)
      .where('is_active', true)
      .update(filteredUpdates);
    
    return result > 0;
  }

  generateApiKey() {
    // Generate a secure random API key
    const prefix = 'wc_'; // WeightCha prefix
    const randomBytes = crypto.randomBytes(24); // 24 bytes = 48 hex chars
    return prefix + randomBytes.toString('hex');
  }

  async getUsageStats(keyId, startDate, endDate) {
    let query = database('verifications')
      .where('api_key_id', keyId);
    
    if (startDate) {
      query = query.where('submitted_at', '>=', startDate);
    }
    
    if (endDate) {
      query = query.where('submitted_at', '<=', endDate);
    }
    
    const results = await query.select(
      database.raw('COUNT(*) as total_requests'),
      database.raw('COUNT(CASE WHEN is_human = true THEN 1 END) as human_verifications'),
      database.raw('COUNT(CASE WHEN is_human = false THEN 1 END) as bot_detections'),
      database.raw('AVG(confidence) as avg_confidence'),
      database.raw('MIN(submitted_at) as first_request'),
      database.raw('MAX(submitted_at) as last_request')
    );
    
    return results[0];
  }

  async getApiKeyByHash(keyHash) {
    const rows = await database('api_keys')
      .select('*')
      .where('key_hash', keyHash)
      .where('is_active', true)
      .limit(1);
    
    if (rows.length === 0) {
      return null;
    }
    
    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      permissions: JSON.parse(row.permissions || '[]'),
      isActive: row.is_active,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      lastUsedAt: row.last_used_at
    };
  }
}

module.exports = new ApiKeyService();
