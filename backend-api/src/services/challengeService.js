const { v4: uuidv4 } = require('uuid');
const database = require('../database/connection');
const redisClient = require('../cache/redis');

class ChallengeService {
  constructor() {
    this.challengeTypes = {
      pressure_pattern: {
        instructions: "Apply gentle, steady pressure on your trackpad for {duration} seconds",
        defaultDuration: 5,
        requiredSamples: 50
      },
      rhythm_test: {
        instructions: "Follow the rhythm pattern: tap-pause-tap-tap on your trackpad",
        defaultDuration: 8,
        requiredSamples: 30
      },
      sustained_pressure: {
        instructions: "Maintain light pressure while slowly moving your finger in a circle",
        defaultDuration: 10,
        requiredSamples: 100
      },
      progressive_pressure: {
        instructions: "Gradually increase pressure from light to firm over {duration} seconds",
        defaultDuration: 7,
        requiredSamples: 70
      }
    };
  }

  async createChallenge({ type, difficulty, duration, metadata, apiKeyId }) {
    const challengeId = uuidv4();
    const expiryMinutes = parseInt(process.env.CHALLENGE_EXPIRY_MINUTES) || 5;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    
    const challengeConfig = this.challengeTypes[type];
    if (!challengeConfig) {
      throw new Error(`Invalid challenge type: ${type}`);
    }
    
    const challenge = {
      id: challengeId,
      type,
      difficulty,
      duration: duration || challengeConfig.defaultDuration,
      instructions: challengeConfig.instructions.replace('{duration}', duration || challengeConfig.defaultDuration),
      status: 'pending',
      apiKeyId,
      metadata: metadata || {},
      createdAt: new Date(),
      expiresAt
    };
    
    // Store in database
    await database('challenges').insert({
      id: challenge.id,
      type: challenge.type,
      difficulty: challenge.difficulty,
      duration: challenge.duration,
      instructions: challenge.instructions,
      status: challenge.status,
      api_key_id: challenge.apiKeyId,
      metadata: JSON.stringify(challenge.metadata),
      created_at: challenge.createdAt,
      expires_at: challenge.expiresAt
    });
    
    // Cache for quick access
    await redisClient.setEx(
      `challenge:${challengeId}`,
      expiryMinutes * 60,
      JSON.stringify(challenge)
    );
    
    return challenge;
  }

  async getChallenge(challengeId) {
    // Try cache first
    const cached = await redisClient.get(`challenge:${challengeId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Fallback to database
    const rows = await database('challenges')
      .select('*')
      .where('id', challengeId)
      .limit(1);
    
    if (rows.length === 0) {
      return null;
    }
    
    const row = rows[0];
    const challenge = {
      id: row.id,
      type: row.type,
      difficulty: row.difficulty,
      duration: row.duration,
      instructions: row.instructions,
      status: row.status,
      apiKeyId: row.api_key_id,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      expiresAt: row.expires_at
    };
    
    // Cache for future requests
    const ttl = Math.max(0, Math.floor((challenge.expiresAt - new Date()) / 1000));
    if (ttl > 0) {
      await redisClient.setEx(`challenge:${challengeId}`, ttl, JSON.stringify(challenge));
    }
    
    return challenge;
  }

  async cancelChallenge(challengeId) {
    // Update database
    const result = await database('challenges')
      .where('id', challengeId)
      .update({
        status: 'cancelled',
        updated_at: new Date()
      });
    
    // Remove from cache
    await redisClient.del(`challenge:${challengeId}`);
    
    return result > 0;
  }

  async updateChallengeStatus(challengeId, status) {
    await database('challenges')
      .where('id', challengeId)
      .update({
        status,
        updated_at: new Date()
      });
    
    // Update cache
    const challenge = await this.getChallenge(challengeId);
    if (challenge) {
      challenge.status = status;
      const ttl = Math.max(0, Math.floor((challenge.expiresAt - new Date()) / 1000));
      if (ttl > 0) {
        await redisClient.setEx(`challenge:${challengeId}`, ttl, JSON.stringify(challenge));
      }
    }
  }

  getDifficultyMultiplier(difficulty) {
    const multipliers = {
      easy: 0.7,
      medium: 1.0,
      hard: 1.5
    };
    return multipliers[difficulty] || 1.0;
  }

  generateChallengeConfig(type, difficulty, duration) {
    const config = this.challengeTypes[type];
    const multiplier = this.getDifficultyMultiplier(difficulty);
    
    return {
      type,
      difficulty,
      duration,
      requiredSamples: Math.floor(config.requiredSamples * multiplier),
      instructions: config.instructions.replace('{duration}', duration),
      thresholds: this.generateThresholds(type, difficulty)
    };
  }

  generateThresholds(type, difficulty) {
    const baseThresholds = {
      pressure_pattern: {
        minVariance: 0.1,
        maxVariance: 0.3,
        consistencyThreshold: 0.8
      },
      rhythm_test: {
        timingAccuracy: 0.7,
        patternMatching: 0.8
      },
      sustained_pressure: {
        stabilityThreshold: 0.85,
        movementSmoothnessThreshold: 0.7
      },
      progressive_pressure: {
        rampConsistency: 0.8,
        finalPressureRatio: 0.9
      }
    };

    const thresholds = baseThresholds[type] || {};
    const difficultyMultiplier = this.getDifficultyMultiplier(difficulty);
    
    // Adjust thresholds based on difficulty
    Object.keys(thresholds).forEach(key => {
      thresholds[key] = Math.min(0.95, thresholds[key] * difficultyMultiplier);
    });
    
    return thresholds;
  }
}

module.exports = new ChallengeService();
