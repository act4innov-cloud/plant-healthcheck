require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

// Import routes
const equipmentsRoutes = require('./routes/equipments');
const checklistsRoutes = require('./routes/checklists');
const dashboardRoutes = require('./routes/dashboard');
const documentsRoutes = require('./routes/documents');
const reportsRoutes = require('./routes/reports');
const usersRoutes = require('./routes/users');
const alertsRoutes = require('./routes/alerts');

// Import middleware
const { authMiddleware } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(morgan('combined')); // Logging

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'PlantHealthCheck API',
    version: '1.0.0',
    documentation: '/api/v1/docs'
  });
});

// ============================================================================
// API ROUTES
// ============================================================================
const API_PREFIX = '/api/v1';

// Public routes (no auth required)
app.use(`${API_PREFIX}/auth`, require('./routes/auth'));

// Protected routes (auth required)
app.use(`${API_PREFIX}/equipments`, authMiddleware, equipmentsRoutes);
app.use(`${API_PREFIX}/checklists`, authMiddleware, checklistsRoutes);
app.use(`${API_PREFIX}/dashboard`, authMiddleware, dashboardRoutes);
app.use(`${API_PREFIX}/documents`, authMiddleware, documentsRoutes);
app.use(`${API_PREFIX}/reports`, authMiddleware, reportsRoutes);
app.use(`${API_PREFIX}/users`, authMiddleware, usersRoutes);
app.use(`${API_PREFIX}/alerts`, authMiddleware, alertsRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================
// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use(errorHandler);

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  console.log(`\n🚀 PlantHealthCheck API Server`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}${API_PREFIX}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`\n✅ Server ready to accept requests\n`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n📴 SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
