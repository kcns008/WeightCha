const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const router = express.Router();

const { authenticateApiKey } = require('../middleware/auth');
const challengeService = require('../services/challengeService');
const { validateRequest } = require('../middleware/validation');

// Validation schemas
const createChallengeSchema = Joi.object({
  type: Joi.string().valid('pressure_pattern', 'rhythm_test', 'sustained_pressure', 'progressive_pressure').default('pressure_pattern'),
  difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium'),
  duration: Joi.number().min(3).max(30).default(5),
  metadata: Joi.object().optional()
});

const getChallengeSchema = Joi.object({
  id: Joi.string().uuid().required()
});

/**
 * POST /api/v1/challenges
 * Create a new verification challenge
 */
router.post('/', 
  authenticateApiKey,
  validateRequest(createChallengeSchema, 'body'),
  async (req, res, next) => {
    try {
      const { type, difficulty, duration, metadata } = req.body;
      const apiKeyId = req.apiKey.id;
      
      const challenge = await challengeService.createChallenge({
        type,
        difficulty,
        duration,
        metadata,
        apiKeyId
      });
      
      res.status(201).json({
        success: true,
        data: {
          challengeId: challenge.id,
          type: challenge.type,
          difficulty: challenge.difficulty,
          duration: challenge.duration,
          instructions: challenge.instructions,
          expiresAt: challenge.expiresAt,
          websocketUrl: `ws://localhost:${process.env.PORT}/ws/challenge/${challenge.id}`
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/challenges/:id
 * Get challenge details
 */
router.get('/:id',
  authenticateApiKey,
  validateRequest(getChallengeSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const challenge = await challengeService.getChallenge(id);
      
      if (!challenge) {
        return res.status(404).json({
          success: false,
          error: 'Challenge not found'
        });
      }
      
      // Check if challenge has expired
      if (new Date() > challenge.expiresAt) {
        return res.status(410).json({
          success: false,
          error: 'Challenge has expired'
        });
      }
      
      res.json({
        success: true,
        data: {
          challengeId: challenge.id,
          type: challenge.type,
          difficulty: challenge.difficulty,
          duration: challenge.duration,
          instructions: challenge.instructions,
          status: challenge.status,
          createdAt: challenge.createdAt,
          expiresAt: challenge.expiresAt
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/challenges/:id
 * Cancel a challenge
 */
router.delete('/:id',
  authenticateApiKey,
  validateRequest(getChallengeSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const success = await challengeService.cancelChallenge(id);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Challenge not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Challenge cancelled successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
