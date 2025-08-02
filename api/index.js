/**
 * Vercel Serverless Function for WeightCha Demo
 * API handler for contact form and health check
 */

const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');

// Rate limiting for Vercel (using in-memory store - for production use Redis)
const contactAttempts = new Map();

// Clean old attempts every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of contactAttempts.entries()) {
    if (now - data.lastAttempt > 15 * 60 * 1000) {
      contactAttempts.delete(key);
    }
  }
}, 15 * 60 * 1000);

// Simple rate limiting
function checkRateLimit(ip) {
  const now = Date.now();
  const attempts = contactAttempts.get(ip) || { count: 0, lastAttempt: now };
  
  // Reset count if more than 15 minutes have passed
  if (now - attempts.lastAttempt > 15 * 60 * 1000) {
    attempts.count = 0;
  }
  
  attempts.count++;
  attempts.lastAttempt = now;
  contactAttempts.set(ip, attempts);
  
  return attempts.count <= 5; // Max 5 attempts per 15 minutes
}

// Validation schema
const contactSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name must be less than 100 characters',
    'any.required': 'Name is required'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  }),
  phone: Joi.string().allow('').optional(),
  checkin: Joi.string().allow('').optional(),
  guests: Joi.number().min(1).max(20).allow('').optional(),
  message: Joi.string().min(10).max(2000).required().messages({
    'string.min': 'Message must be at least 10 characters',
    'string.max': 'Message must be less than 2000 characters',
    'any.required': 'Message is required'
  }),
  weightchaToken: Joi.string().when('$weightchaEnabled', {
    is: true,
    then: Joi.required().messages({
      'any.required': 'Human verification is required'
    }),
    otherwise: Joi.optional()
  })
});

// WeightCha token validation (demo mode)
async function validateWeightChaToken(token) {
  if (!token) {
    return { valid: false, reason: 'no_token' };
  }
  
  // Simple demo validation - in production this would call the WeightCha API
  if (token.length < 10) {
    return { valid: false, reason: 'invalid_token' };
  }

  // Simulate successful validation for demo
  return {
    valid: true,
    confidence: 0.95,
    verificationId: `demo-${Date.now()}`,
    reason: 'demo_validated'
  };
}

// CORS configuration
const corsOptions = {
  origin: true, // Allow all origins for demo
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Main handler
module.exports = async (req, res) => {
  // Apply CORS
  cors(corsOptions)(req, res, () => {});
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  const { method } = req;
  const path = req.url;

  try {
    // Health check endpoint
    if (method === 'GET' && path === '/api/health') {
      return res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          weightcha: true,
          email: false // Email disabled in demo
        }
      });
    }

    // WeightCha config endpoint
    if (method === 'GET' && path === '/api/weightcha/config') {
      return res.status(200).json({
        enabled: true,
        fallbackEnabled: true,
        methods: ['webHID', 'forceTouch', 'pointerEvents', 'motionSensors']
      });
    }

    // Contact form submission
    if (method === 'POST' && path === '/api/contact') {
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
      
      // Rate limiting
      if (!checkRateLimit(clientIP)) {
        return res.status(429).json({
          success: false,
          error: 'Too many contact form submissions. Please try again later.',
          code: 'RATE_LIMITED'
        });
      }

      // Validate request data
      const { error, value } = contactSchema.validate(req.body, {
        context: { weightchaEnabled: true }
      });

      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid form data',
          details: error.details.map(d => d.message)
        });
      }

      const contactData = value;
      const verificationToken = contactData.weightchaToken;

      // Validate WeightCha token
      const verification = await validateWeightChaToken(verificationToken);
      
      if (!verification.valid) {
        // Log suspicious activity
        console.log('Blocked suspicious contact form submission:', {
          ip: clientIP,
          userAgent: req.headers['user-agent'],
          verification
        });

        return res.status(400).json({
          success: false,
          error: 'Human verification failed. Please try again.',
          code: 'VERIFICATION_FAILED'
        });
      }

      // Log successful submission (in production, save to database)
      console.log('Contact form submission successful:', {
        name: contactData.name,
        email: contactData.email,
        verification: verification.reason,
        ip: clientIP,
        timestamp: new Date().toISOString()
      });

      // Success response
      return res.status(200).json({
        success: true,
        message: 'Thank you for your message! This is a demo - no actual email was sent.',
        verification: {
          method: 'weightcha',
          status: verification.reason,
          confidence: verification.confidence
        }
      });
    }

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return res.status(200).end();
    }

    // 404 for unknown endpoints
    return res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      code: 'NOT_FOUND'
    });

  } catch (error) {
    console.error('API error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};
