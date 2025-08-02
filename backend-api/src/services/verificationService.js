const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const database = require('../database/database');
const redisClient = require('../cache/redis');
const challengeService = require('./challengeService');
const HumanPatternAnalyzer = require('./humanPatternAnalyzer');

class VerificationService {
  constructor() {
    this.analyzer = new HumanPatternAnalyzer();
  }

  async submitVerification({ challengeId, pressureData, motionData, deviceInfo, detectionMethod, clientInfo, apiKeyId }) {
    const verificationId = uuidv4();
    
    // Get challenge details
    const challenge = await challengeService.getChallenge(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }
    
    if (challenge.status !== 'pending') {
      throw new Error('Challenge is not in pending state');
    }
    
    if (new Date() > challenge.expiresAt) {
      throw new Error('Challenge has expired');
    }
    
    // Update challenge status to processing
    await challengeService.updateChallengeStatus(challengeId, 'processing');
    
    try {
      // Prepare verification data for analysis
      const verificationData = {
        pressureData: pressureData || [],
        motionData: motionData || [],
        deviceInfo: deviceInfo || {},
        detectionMethod: detectionMethod || 'unknown',
        challengeType: challenge.type,
        challengeDifficulty: challenge.difficulty
      };

      // Analyze pattern for human characteristics
      const analysisResult = this.analyzer.analyzePattern(verificationData);
      
      const verification = {
        id: verificationId,
        challengeId,
        status: 'completed',
        isHuman: analysisResult.isHuman,
        confidence: analysisResult.confidence,
        detectionMethod: analysisResult.detectionMethod,
        deviceProfile: analysisResult.deviceProfile,
        analysisDetails: analysisResult.analysis,
        submittedAt: new Date(),
        processedAt: new Date(),
        expiresAt: new Date(Date.now() + (parseInt(process.env.VERIFICATION_EXPIRY_MINUTES) || 30) * 60 * 1000),
        apiKeyId,
        clientInfo: clientInfo || {},
        rawData: {
          pressureData: pressureData?.slice(0, 100), // Limit stored data
          motionData: motionData?.slice(0, 50),
          deviceInfo
        }
      };
      
      // Generate verification token
      verification.token = this.generateVerificationToken(verification);
      
      // Store in database
      await database('verifications').insert({
        id: verification.id,
        challenge_id: verification.challengeId,
        status: verification.status,
        is_human: verification.isHuman,
        confidence: verification.confidence,
        analysis_details: JSON.stringify(verification.analysisDetails),
        submitted_at: verification.submittedAt,
        processed_at: verification.processedAt,
        expires_at: verification.expiresAt,
        api_key_id: verification.apiKeyId,
        client_info: JSON.stringify(verification.clientInfo),
        verification_token: verification.token
      });
      
      // Store pressure data separately for analytics
      await database('pressure_data').insert({
        id: uuidv4(),
        verification_id: verification.id,
        challenge_id: verification.challengeId,
        pressure_samples: JSON.stringify(pressureData),
        sample_count: pressureData.length,
        created_at: new Date()
      });
      
      // Cache verification result
      await redisClient.setEx(
        `verification:${verificationId}`,
        30 * 60, // 30 minutes
        JSON.stringify(verification)
      );
      
      // Update challenge status
      await challengeService.updateChallengeStatus(challengeId, 'completed');
      
      return verification;
      
    } catch (error) {
      // Update challenge status to failed
      await challengeService.updateChallengeStatus(challengeId, 'failed');
      throw error;
    }
  }

  async getVerification(verificationId) {
    // Try cache first
    const cached = await redisClient.get(`verification:${verificationId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Fallback to database
    const rows = await database('verifications')
      .select('*')
      .where('id', verificationId)
      .limit(1);
    
    if (rows.length === 0) {
      return null;
    }
    
    const row = rows[0];
    const verification = {
      id: row.id,
      challengeId: row.challenge_id,
      status: row.status,
      isHuman: row.is_human,
      confidence: row.confidence,
      analysisDetails: JSON.parse(row.analysis_details || '{}'),
      submittedAt: row.submitted_at,
      processedAt: row.processed_at,
      expiresAt: row.expires_at,
      apiKeyId: row.api_key_id,
      clientInfo: JSON.parse(row.client_info || '{}'),
      token: row.verification_token
    };
    
    // Cache for future requests
    const ttl = Math.max(0, Math.floor((verification.expiresAt - new Date()) / 1000));
    if (ttl > 0) {
      await redisClient.setEx(`verification:${verificationId}`, ttl, JSON.stringify(verification));
    }
    
    return verification;
  }

  async validateToken(token) {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get verification details
      const verification = await this.getVerification(decoded.verificationId);
      
      if (!verification) {
        return { valid: false };
      }
      
      // Check if verification has expired
      if (new Date() > verification.expiresAt) {
        return { valid: false };
      }
      
      return {
        valid: true,
        isHuman: verification.isHuman,
        confidence: verification.confidence,
        verifiedAt: verification.processedAt,
        expiresAt: verification.expiresAt
      };
      
    } catch (error) {
      return { valid: false };
    }
  }

  generateVerificationToken(verification) {
    const payload = {
      verificationId: verification.id,
      challengeId: verification.challengeId,
      isHuman: verification.isHuman,
      confidence: verification.confidence,
      processedAt: verification.processedAt
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: 'weightcha-api',
      subject: 'verification'
    });
  }

  async getVerificationStats(apiKeyId, startDate, endDate) {
    const query = database('verifications')
      .where('api_key_id', apiKeyId);
    
    if (startDate) {
      query.where('submitted_at', '>=', startDate);
    }
    
    if (endDate) {
      query.where('submitted_at', '<=', endDate);
    }
    
    const results = await query.select(
      database.raw('COUNT(*) as total_verifications'),
      database.raw('COUNT(CASE WHEN is_human = true THEN 1 END) as human_count'),
      database.raw('COUNT(CASE WHEN is_human = false THEN 1 END) as bot_count'),
      database.raw('AVG(confidence) as avg_confidence')
    );
    
    return results[0];
  }
}

module.exports = new VerificationService();
