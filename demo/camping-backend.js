/**
 * Orillia Camping Resort - Contact Form Handler
 * Production example with WeightCha token validation
 */

const express = require('express');
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const Joi = require('joi');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));
app.use(express.static('.'));

// Rate limiting
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 contact form submissions per windowMs
  message: {
    error: 'Too many contact form submissions. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Email transporter (configure with your SMTP settings)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// WeightCha configuration
const WEIGHTCHA_CONFIG = {
  apiUrl: process.env.WEIGHTCHA_API_URL || 'https://api.weightcha.com/v1',
  secretKey: process.env.WEIGHTCHA_SECRET_KEY,
  enabled: process.env.WEIGHTCHA_ENABLED !== 'false'
};

// Validation schema
const contactSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(50).required(),
  lastName: Joi.string().trim().min(1).max(50).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().trim().max(20).optional().allow(''),
  inquiry: Joi.string().valid('reservation', 'general', 'group', 'facilities', 'other').required(),
  message: Joi.string().trim().min(10).max(2000).required(),
  'verification-token': Joi.string().when('$weightchaEnabled', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

/**
 * Validate WeightCha token
 */
async function validateWeightChaToken(token) {
  if (!WEIGHTCHA_CONFIG.enabled || !WEIGHTCHA_CONFIG.secretKey) {
    console.log('WeightCha validation skipped - service disabled or not configured');
    return { valid: true, reason: 'disabled' };
  }

  // For demo purposes, simulate validation based on token presence and format
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

  /* 
  // Production code - uncomment when using real WeightCha backend:
  try {
    const response = await fetch(`${WEIGHTCHA_CONFIG.apiUrl}/verification/validate-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WEIGHTCHA_CONFIG.secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      throw new Error(`WeightCha API error: ${response.status}`);
    }

    const result = await response.json();
    
    return {
      valid: result.success && result.data.valid && result.data.isHuman,
      confidence: result.data.confidence,
      verificationId: result.data.verificationId,
      reason: result.data.valid ? 'verified' : 'failed'
    };

  } catch (error) {
    console.error('WeightCha validation error:', error);
    
    return {
      valid: true, // Graceful degradation
      reason: 'service_unavailable',
      error: error.message
    };
  }
  */
}

/**
 * Send notification email to resort staff
 */
async function sendNotificationEmail(contactData, verification) {
  const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>New Contact Form Submission</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 20px; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #374151; }
        .value { margin-top: 5px; }
        .verification { background: #ecfdf5; border: 1px solid #10b981; padding: 15px; border-radius: 5px; margin-top: 20px; }
        .footer { background: #374151; color: white; padding: 20px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏕️ New Contact Form Submission</h1>
            <p>Orillia Camping Resort</p>
        </div>
        
        <div class="content">
            <div class="field">
                <div class="label">Name:</div>
                <div class="value">${contactData.firstName} ${contactData.lastName}</div>
            </div>
            
            <div class="field">
                <div class="label">Email:</div>
                <div class="value"><a href="mailto:${contactData.email}">${contactData.email}</a></div>
            </div>
            
            ${contactData.phone ? `
            <div class="field">
                <div class="label">Phone:</div>
                <div class="value"><a href="tel:${contactData.phone}">${contactData.phone}</a></div>
            </div>
            ` : ''}
            
            <div class="field">
                <div class="label">Inquiry Type:</div>
                <div class="value">${contactData.inquiry.charAt(0).toUpperCase() + contactData.inquiry.slice(1)}</div>
            </div>
            
            <div class="field">
                <div class="label">Message:</div>
                <div class="value">${contactData.message.replace(/\n/g, '<br>')}</div>
            </div>
            
            <div class="verification">
                <h3>🛡️ Verification Status</h3>
                <p><strong>Status:</strong> ${verification.valid ? '✅ Verified Human' : '❌ Verification Failed'}</p>
                ${verification.confidence ? `<p><strong>Confidence:</strong> ${(verification.confidence * 100).toFixed(1)}%</p>` : ''}
                <p><strong>Method:</strong> WeightCha Pressure Detection</p>
                ${verification.verificationId ? `<p><strong>Verification ID:</strong> ${verification.verificationId}</p>` : ''}
                <p><strong>Reason:</strong> ${verification.reason}</p>
            </div>
        </div>
        
        <div class="footer">
            <p>This message was sent through the Orillia Camping Resort contact form</p>
            <p>Powered by WeightCha spam protection</p>
        </div>
    </div>
</body>
</html>
  `;

  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@orillia-camping.com',
    to: process.env.CONTACT_EMAIL || 'reservations@orillia-camping.com',
    subject: `New ${contactData.inquiry} inquiry from ${contactData.firstName} ${contactData.lastName}`,
    html: emailTemplate
  };

  return await transporter.sendMail(mailOptions);
}

/**
 * Send confirmation email to customer
 */
async function sendConfirmationEmail(contactData) {
  const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Thank you for contacting us!</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .footer { background: #374151; color: white; padding: 20px; text-align: center; }
        .cta { background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏕️ Thank You, ${contactData.firstName}!</h1>
            <p>Your message has been received</p>
        </div>
        
        <div class="content">
            <h2>We'll be in touch soon!</h2>
            
            <p>Thank you for contacting Orillia Camping Resort. We've received your ${contactData.inquiry} inquiry and our team will respond within 24 hours.</p>
            
            <p><strong>What happens next?</strong></p>
            <ul>
                <li>Our reservations team will review your message</li>
                <li>We'll check availability for your preferred dates</li>
                <li>You'll receive a personalized response with next steps</li>
            </ul>
            
            <p>In the meantime, feel free to explore our amenities and plan your perfect camping experience!</p>
            
            <a href="https://orillia-camping.com/amenities" class="cta">Explore Our Amenities</a>
            
            <p><strong>Questions or need immediate assistance?</strong><br>
            📞 (705) 555-0123<br>
            📧 info@orillia-camping.com</p>
            
            <p>We can't wait to welcome you to Orillia Camping Resort!</p>
        </div>
        
        <div class="footer">
            <p>Orillia Camping Resort | 123 Nature Way, Orillia, ON</p>
            <p>Protected by WeightCha - Advanced Spam Prevention</p>
        </div>
    </div>
</body>
</html>
  `;

  const mailOptions = {
    from: process.env.SMTP_FROM || 'reservations@orillia-camping.com',
    to: contactData.email,
    subject: 'Thank you for contacting Orillia Camping Resort!',
    html: emailTemplate
  };

  return await transporter.sendMail(mailOptions);
}

/**
 * Contact form submission endpoint
 */
app.post('/api/contact', contactLimiter, async (req, res) => {
  try {
    // Validate request data
    const { error, value } = contactSchema.validate(req.body, {
      context: { weightchaEnabled: WEIGHTCHA_CONFIG.enabled }
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid form data',
        details: error.details.map(d => d.message)
      });
    }

    const contactData = value;
    const verificationToken = contactData['verification-token'];

    // Validate WeightCha token
    const verification = await validateWeightChaToken(verificationToken);
    
    if (!verification.valid && verification.reason !== 'disabled' && verification.reason !== 'service_unavailable') {
      // Log suspicious activity
      console.log('Blocked suspicious contact form submission:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        verification
      });

      return res.status(400).json({
        success: false,
        error: 'Human verification failed. Please try again.',
        code: 'VERIFICATION_FAILED'
      });
    }

    // Send emails
    try {
      await Promise.all([
        sendNotificationEmail(contactData, verification),
        sendConfirmationEmail(contactData)
      ]);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Continue with success response even if email fails
      // In production, you might want to queue this for retry
    }

    // Log successful submission
    console.log('Contact form submission successful:', {
      name: `${contactData.firstName} ${contactData.lastName}`,
      email: contactData.email,
      inquiry: contactData.inquiry,
      verification: verification.reason,
      ip: req.ip
    });

    // Success response
    res.json({
      success: true,
      message: 'Thank you for your message! We\'ll get back to you within 24 hours.',
      verification: {
        method: 'weightcha',
        status: verification.reason
      }
    });

  } catch (error) {
    console.error('Contact form error:', error);
    
    res.status(500).json({
      success: false,
      error: 'An error occurred while processing your message. Please try again.',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      weightcha: WEIGHTCHA_CONFIG.enabled,
      email: !!process.env.SMTP_HOST
    }
  });
});

/**
 * Serve the contact page
 */
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/orillia-camping-demo.html');
});

/**
 * Serve the debug page
 */
app.get('/debug', (req, res) => {
  res.sendFile(__dirname + '/debug.html');
});

/**
 * Serve the simple test page
 */
app.get('/test', (req, res) => {
  res.sendFile(__dirname + '/simple-test.html');
});

/**
 * Serve the trackpad test JavaScript
 */
app.get('/trackpad-test.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(__dirname + '/trackpad-test.js');
});

/**
 * Serve the Safari Force Touch test
 */
app.get('/safari', (req, res) => {
  res.sendFile(__dirname + '/safari-force-test.html');
});

/**
 * WeightCha configuration endpoint (for frontend)
 */
app.get('/api/weightcha/config', (req, res) => {
  res.json({
    enabled: WEIGHTCHA_CONFIG.enabled,
    fallbackEnabled: true,
    methods: ['webHID', 'forceTouch', 'pointerEvents', 'motionSensors']
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

// Start server
const HTTP_PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Start HTTP server
app.listen(HTTP_PORT, () => {
  console.log(`🏕️ Orillia Camping Resort HTTP server running on port ${HTTP_PORT}`);
  console.log(`WeightCha protection: ${WEIGHTCHA_CONFIG.enabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`Contact form available at: http://localhost:${HTTP_PORT}`);
});

// Start HTTPS server if certificates exist
try {
  if (fs.existsSync('./cert.pem') && fs.existsSync('./key.pem')) {
    const httpsOptions = {
      key: fs.readFileSync('./key.pem'),
      cert: fs.readFileSync('./cert.pem')
    };
    
    https.createServer(httpsOptions, app).listen(HTTPS_PORT, () => {
      console.log(`🔒 HTTPS server running on port ${HTTPS_PORT}`);
      console.log(`Secure contact form available at: https://localhost:${HTTPS_PORT}`);
      console.log(`Secure test page available at: https://localhost:${HTTPS_PORT}/test`);
      console.log('');
      console.log('⚠️  Safari users: Use the HTTPS URLs for Force Touch support');
      console.log('   You may need to accept the self-signed certificate warning');
    });
  } else {
    console.log('⚠️  HTTPS certificates not found. HTTPS server not started.');
    console.log('   Run: openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes');
  }
} catch (error) {
  console.log('⚠️  Could not start HTTPS server:', error.message);
}

module.exports = app;
