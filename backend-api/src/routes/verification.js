const express = require('express');
const Joi = require('joi');
const router = express.Router();

const { authenticateApiKey } = require('../middleware/auth');
const verificationService = require('../services/verificationService');
const { validateRequest } = require('../middleware/validation');

// Validation schemas
const submitVerificationSchema = Joi.object({
  challengeId: Joi.string().uuid().required(),
  pressureData: Joi.array().items(
    Joi.object({
      timestamp: Joi.number().required(),
      pressure: Joi.number().min(0).max(1).required(),
      weight: Joi.number().min(0).optional(),
      deltaTime: Joi.number().min(0).optional(),
      touchArea: Joi.number().min(0).optional(),
      position: Joi.object({
        x: Joi.number().required(),
        y: Joi.number().required()
      }).optional()
    })
  ).min(5).max(10000).required(),
  motionData: Joi.array().items(
    Joi.object({
      timestamp: Joi.number().required(),
      acceleration: Joi.object({
        x: Joi.number().required(),
        y: Joi.number().required(),
        z: Joi.number().required()
      }).optional(),
      rotation: Joi.object({
        alpha: Joi.number().required(),
        beta: Joi.number().required(),
        gamma: Joi.number().required()
      }).optional()
    })
  ).max(5000).optional(),
  deviceInfo: Joi.object({
    userAgent: Joi.string().optional(),
    screen: Joi.object({
      width: Joi.number().integer().min(1).optional(),
      height: Joi.number().integer().min(1).optional(),
      pixelRatio: Joi.number().min(0.1).optional()
    }).optional(),
    trackpadType: Joi.string().optional(),
    browserSupport: Joi.array().items(Joi.string()).optional()
  }).optional(),
  detectionMethod: Joi.string().valid('webHID', 'forceTouch', 'pointerEvents', 'motionSensors', 'touchEvents').optional(),
  clientInfo: Joi.object({
    platform: Joi.string().optional(),
    version: Joi.string().optional(),
    sessionId: Joi.string().optional()
  }).optional()
});

const getVerificationSchema = Joi.object({
  id: Joi.string().uuid().required()
});

const validateTokenSchema = Joi.object({
  token: Joi.string().required()
});

/**
 * POST /api/v1/verification/submit
 * Submit pressure data for verification
 */
router.post('/submit',
  authenticateApiKey,
  validateRequest(submitVerificationSchema, 'body'),
  async (req, res, next) => {
    try {
      const { challengeId, pressureData, motionData, deviceInfo, detectionMethod, clientInfo } = req.body;
      const apiKeyId = req.apiKey.id;
      
      const verification = await verificationService.submitVerification({
        challengeId,
        pressureData,
        motionData,
        deviceInfo,
        detectionMethod,
        clientInfo,
        apiKeyId
      });

      res.status(201).json({
        success: true,
        data: {
          verificationId: verification.id,
          challengeId: verification.challengeId,
          status: verification.status,
          isHuman: verification.isHuman,
          confidence: verification.confidence,
          detectionMethod: verification.detectionMethod,
          deviceProfile: verification.deviceProfile,
          submittedAt: verification.submittedAt,
          token: verification.token
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/verification/:id
 * Get verification result
 */
router.get('/:id',
  authenticateApiKey,
  validateRequest(getVerificationSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const verification = await verificationService.getVerification(id);
      
      if (!verification) {
        return res.status(404).json({
          success: false,
          error: 'Verification not found'
        });
      }
      
      res.json({
        success: true,
        data: {
          id: verification.id,
          challengeId: verification.challengeId,
          status: verification.status,
          isHuman: verification.isHuman,
          confidence: verification.confidence,
          detectionMethod: verification.detectionMethod,
          deviceProfile: verification.deviceProfile,
          submittedAt: verification.submittedAt,
          expiresAt: verification.expiresAt
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/verification/validate-token
 * Validate a verification token (for website backend validation)
 */
router.post('/validate-token',
  authenticateApiKey,
  validateRequest(validateTokenSchema, 'body'),
  async (req, res, next) => {
    try {
      const { token } = req.body;
      const result = await verificationService.validateToken(token);
      
      res.json({
        success: true,
        data: {
          valid: result.valid,
          isHuman: result.isHuman,
          confidence: result.confidence,
          expiresAt: result.expiresAt,
          verificationId: result.verificationId
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/verification/bulk-validate
 * Validate multiple tokens at once
 */
router.post('/bulk-validate',
  authenticateApiKey,
  async (req, res, next) => {
    try {
      const { tokens } = req.body;
      
      if (!Array.isArray(tokens) || tokens.length === 0 || tokens.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Tokens must be an array with 1-100 items'
        });
      }
      
      const results = await Promise.all(
        tokens.map(async (token) => {
          try {
            const result = await verificationService.validateToken(token);
            return { token, ...result };
          } catch (error) {
            return { token, valid: false, error: error.message };
          }
        })
      );
      
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
      });
      
      res.status(201).json({
        success: true,
        data: {
          verificationId: verification.id,
          challengeId: verification.challengeId,
          status: verification.status,
          isHuman: verification.isHuman,
          confidence: verification.confidence,
          submittedAt: verification.submittedAt,
          token: verification.token // For website integration
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/verification/:id
 * Get verification result
 */
router.get('/:id',
  authenticateApiKey,
  validateRequest(getVerificationSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const verification = await verificationService.getVerification(id);
      
      if (!verification) {
        return res.status(404).json({
          success: false,
          error: 'Verification not found'
        });
      }
      
      res.json({
        success: true,
        data: {
          verificationId: verification.id,
          challengeId: verification.challengeId,
          status: verification.status,
          isHuman: verification.isHuman,
          confidence: verification.confidence,
          submittedAt: verification.submittedAt,
          processedAt: verification.processedAt,
          expiresAt: verification.expiresAt
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/verification/validate-token
 * Validate a verification token (for website integration)
 */
router.post('/validate-token',
  authenticateApiKey,
  validateRequest(Joi.object({
    token: Joi.string().required()
  }), 'body'),
  async (req, res, next) => {
    try {
      const { token } = req.body;
      const validation = await verificationService.validateToken(token);
      
      res.json({
        success: true,
        data: {
          valid: validation.valid,
          isHuman: validation.isHuman,
          confidence: validation.confidence,
          verifiedAt: validation.verifiedAt,
          expiresAt: validation.expiresAt
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
