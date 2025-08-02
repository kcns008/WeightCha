const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Joi = require('joi');
const router = express.Router();

const { authenticateApiKey } = require('../middleware/auth');
const apiKeyService = require('../services/apiKeyService');
const { validateRequest } = require('../middleware/validation');

// Validation schemas
const createApiKeySchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).optional(),
  permissions: Joi.array().items(
    Joi.string().valid('create_challenge', 'verify', 'read_analytics')
  ).default(['create_challenge', 'verify'])
});

/**
 * POST /api/v1/api-keys
 * Create a new API key
 */
router.post('/',
  validateRequest(createApiKeySchema, 'body'),
  async (req, res, next) => {
    try {
      const { name, description, permissions } = req.body;
      
      const apiKey = await apiKeyService.createApiKey({
        name,
        description,
        permissions
      });
      
      res.status(201).json({
        success: true,
        data: {
          id: apiKey.id,
          name: apiKey.name,
          description: apiKey.description,
          key: apiKey.key, // Only returned once during creation
          permissions: apiKey.permissions,
          createdAt: apiKey.createdAt,
          expiresAt: apiKey.expiresAt
        },
        message: 'API key created successfully. Please store it securely as it will not be shown again.'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/api-keys
 * List API keys (without showing the actual keys)
 */
router.get('/',
  authenticateApiKey,
  async (req, res, next) => {
    try {
      const apiKeys = await apiKeyService.getApiKeys();
      
      res.json({
        success: true,
        data: apiKeys.map(key => ({
          id: key.id,
          name: key.name,
          description: key.description,
          permissions: key.permissions,
          lastUsedAt: key.lastUsedAt,
          createdAt: key.createdAt,
          expiresAt: key.expiresAt,
          isActive: key.isActive
        }))
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/api-keys/:id
 * Revoke an API key
 */
router.delete('/:id',
  authenticateApiKey,
  validateRequest(Joi.object({
    id: Joi.string().uuid().required()
  }), 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const success = await apiKeyService.revokeApiKey(id);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'API key not found'
        });
      }
      
      res.json({
        success: true,
        message: 'API key revoked successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
