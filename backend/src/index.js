import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

// Import routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import alertsRoutes from './routes/alerts.js';
import checklistsRoutes from './routes/checklists.js';
import dashboardRoutes from './routes/dashboard.js';
import documentsRoutes from './routes/documents.js';
import equipmentsRoutes from './routes/equipments.js';
import reportsRoutes from './routes/reports.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'PlantHealthCheck API',
    version: '1.0.0'
  });
});

// Routes
const API_PREFIX = '/api/v1';
app.use(\\/auth\, authRoutes);
app.use(\\/users\, usersRoutes);
app.use(\\/alerts\, alertsRoutes);
app.use(\\/checklists\, checklistsRoutes);
app.use(\\/dashboard\, dashboardRoutes);
app.use(\\/documents\, documentsRoutes);
app.use(\\/equipments\, equipmentsRoutes);
app.use(\\/reports\, reportsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: \Route \ \ not found\
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});

export default app;
