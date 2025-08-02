function errorHandler(logger) {
  return (error, req, res, next) => {
    // Log the error
    logger.error('Request error:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // Don't expose internal errors in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: isDevelopment ? error.message : 'Invalid request data'
      });
    }
    
    if (error.name === 'UnauthorizedError') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: isDevelopment ? error.message : 'Authentication required'
      });
    }
    
    if (error.name === 'ForbiddenError') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: isDevelopment ? error.message : 'Access denied'
      });
    }
    
    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: isDevelopment ? error.message : 'Resource not found'
      });
    }
    
    // Database errors
    if (error.code && error.code.startsWith('23')) {
      return res.status(400).json({
        success: false,
        error: 'Database constraint violation',
        message: isDevelopment ? error.message : 'Invalid data provided'
      });
    }
    
    // Rate limiting errors
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: 'Please try again later'
      });
    }
    
    // Default server error
    res.status(error.status || 500).json({
      success: false,
      error: 'Internal server error',
      message: isDevelopment ? error.message : 'An unexpected error occurred',
      ...(isDevelopment && { stack: error.stack })
    });
  };
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
