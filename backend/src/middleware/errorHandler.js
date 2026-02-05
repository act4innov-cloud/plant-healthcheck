// ============================================================================
// Gestionnaire d'erreurs global
// ============================================================================
function errorHandler(err, req, res, next) {
  console.error('Error occurred:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    user: req.user?.email || 'anonymous'
  });

  // Erreur de validation Multer (fichier trop gros, type non autorisé)
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File too large',
        message: 'The uploaded file exceeds the maximum allowed size',
        maxSize: process.env.MAX_FILE_SIZE || '10MB'
      });
    }
    return res.status(400).json({
      success: false,
      error: 'File upload error',
      message: err.message
    });
  }

  // Erreur de validation express-validator
  if (err.array && typeof err.array === 'function') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.array()
    });
  }

  // Erreurs PostgreSQL
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        return res.status(409).json({
          success: false,
          error: 'Duplicate entry',
          message: 'A record with this value already exists',
          field: err.constraint
        });
      
      case '23503': // Foreign key violation
        return res.status(400).json({
          success: false,
          error: 'Invalid reference',
          message: 'Referenced record does not exist',
          field: err.constraint
        });
      
      case '23502': // Not null violation
        return res.status(400).json({
          success: false,
          error: 'Missing required field',
          message: 'A required field is missing',
          field: err.column
        });
      
      case '22P02': // Invalid text representation
        return res.status(400).json({
          success: false,
          error: 'Invalid data format',
          message: 'The provided data format is invalid'
        });
      
      case '42P01': // Undefined table
        return res.status(500).json({
          success: false,
          error: 'Database configuration error',
          message: 'A required database table is missing'
        });
    }
  }

  // Erreurs JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: 'The authentication token is invalid'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
      message: 'The authentication token has expired'
    });
  }

  // Erreur personnalisée avec status
  if (err.status) {
    return res.status(err.status).json({
      success: false,
      error: err.message || 'An error occurred',
      ...(err.details && { details: err.details })
    });
  }

  // Erreur générique
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

// ============================================================================
// Gestionnaire 404
// ============================================================================
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`,
    timestamp: new Date().toISOString()
  });
}

// ============================================================================
// Classe d'erreur personnalisée
// ============================================================================
class AppError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  AppError
};
