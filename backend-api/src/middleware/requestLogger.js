function requestLogger(logger) {
  return (req, res, next) => {
    const start = Date.now();
    
    // Override res.end to capture response details
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      const duration = Date.now() - start;
      
      // Log request details
      logger.info('Request completed', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        contentLength: res.get('Content-Length'),
        timestamp: new Date().toISOString()
      });
      
      originalEnd.call(this, chunk, encoding);
    };
    
    next();
  };
}

module.exports = {
  requestLogger
};
