// ═══════════════════════════════════════════════════════════════════════════
// FILE: server.js
// Production-ready Express server with Firebase integration
// ═══════════════════════════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const bodyParser = require('body-parser');

dotenv.config();

const app = express();

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────

// Security
app.use(helmet());

// CORS
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// ─── ROUTES ───────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: '✅ API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// À connecter:
// app.use('/api/auth', require('./src/routes/auth'));
// app.use('/api/checklists', require('./src/routes/checklists'));
// app.use('/api/documents', require('./src/routes/documents'));
// app.use('/api/approvals', require('./src/routes/approvals'));
// app.use('/api/users', require('./src/routes/users'));

// ─── ERROR HANDLING ───────────────────────────────────────────────────────

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ─── START SERVER ─────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║  Plant HealthCheck API Server        ║`);
  console.log(`╚════════════════════════════════════════╝`);
  console.log(`✅ API running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`📡 API URL: ${process.env.NODE_ENV === 'production' 
    ? 'https://plant-healthcheck-api.onrender.com' 
    : `http://localhost:${PORT}`}`);
  console.log(`🔗 CORS enabled for: ${allowedOrigins.join(', ')}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📌 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;


// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/config/firebase.js
// Firebase Admin SDK configuration
// ═══════════════════════════════════════════════════════════════════════════

const admin = require('firebase-admin');
const path = require('path');

let serviceAccount;

// Try to load from file first (for local development)
try {
  serviceAccount = require(path.join(__dirname, '../../serviceAccountKey.json'));
} catch (err) {
  // In production, use environment variables
  if (process.env.FIREBASE_PRIVATE_KEY) {
    serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
    };
  }
}

if (!serviceAccount) {
  throw new Error('Firebase service account not configured');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL,
  storageBucket: process.env.STORAGE_BUCKET
});

module.exports = {
  admin,
  db: admin.database(),
  auth: admin.auth(),
  storage: admin.storage().bucket()
};


// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/middleware/authMiddleware.js
// JWT and Firebase authentication
// ═══════════════════════════════════════════════════════════════════════════

const { auth } = require('../config/firebase');

// Middleware to verify Firebase ID token
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Middleware to check user role
const requireRole = (roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check user role from database
    try {
      const { db } = require('../config/firebase');
      const userSnap = await db.ref(`users/${req.user.uid}`).once('value');
      const userData = userSnap.val();

      if (!userData || !roles.includes(userData.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      req.userRole = userData.role;
      next();
    } catch (error) {
      console.error('❌ Role check failed:', error);
      res.status(500).json({ error: 'Role verification failed' });
    }
  };
};

module.exports = {
  verifyToken,
  requireRole
};


// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/routes/checklists.js
// Checklist CRUD operations
// ═══════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { verifyToken } = require('../middleware/authMiddleware');

// GET all checklists for user
router.get('/', verifyToken, async (req, res) => {
  try {
    const checklistsRef = db.ref('checklists');
    const snapshot = await checklistsRef.once('value');
    const checklists = snapshot.val() || {};

    // Filter by user if not admin
    const filteredChecklists = Object.keys(checklists).reduce((acc, key) => {
      const checklist = checklists[key];
      if (checklist.userId === req.user.uid || req.user.role === 'admin') {
        acc[key] = checklist;
      }
      return acc;
    }, {});

    res.json({
      success: true,
      data: filteredChecklists,
      count: Object.keys(filteredChecklists).length
    });
  } catch (error) {
    console.error('❌ Error fetching checklists:', error);
    res.status(500).json({ error: 'Failed to fetch checklists' });
  }
});

// GET single checklist
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const snapshot = await db.ref(`checklists/${req.params.id}`).once('value');
    const checklist = snapshot.val();

    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    // Check permissions
    if (checklist.userId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ success: true, data: checklist });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch checklist' });
  }
});

// POST create new checklist
router.post('/', verifyToken, async (req, res) => {
  try {
    const { template, items, metadata } = req.body;

    if (!template || !items) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const checklistId = db.ref('checklists').push().key;
    const checklist = {
      id: checklistId,
      template,
      items,
      metadata,
      userId: req.user.uid,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvals: []
    };

    await db.ref(`checklists/${checklistId}`).set(checklist);

    res.status(201).json({
      success: true,
      message: 'Checklist created',
      data: checklist
    });
  } catch (error) {
    console.error('❌ Error creating checklist:', error);
    res.status(500).json({ error: 'Failed to create checklist' });
  }
});

// PUT update checklist
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const checklistSnapshot = await db.ref(`checklists/${req.params.id}`).once('value');
    const checklist = checklistSnapshot.val();

    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    if (checklist.userId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = {
      ...checklist,
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    await db.ref(`checklists/${req.params.id}`).set(updated);

    res.json({
      success: true,
      message: 'Checklist updated',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update checklist' });
  }
});

// DELETE checklist
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const checklistSnapshot = await db.ref(`checklists/${req.params.id}`).once('value');
    const checklist = checklistSnapshot.val();

    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    if (checklist.userId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.ref(`checklists/${req.params.id}`).remove();

    res.json({ success: true, message: 'Checklist deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete checklist' });
  }
});

module.exports = router;


// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/routes/documents.js
// Document upload and management
// ═══════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('../config/firebase');
const { verifyToken } = require('../middleware/authMiddleware');
const { db } = require('../config/firebase');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Upload document
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const filename = `documents/${req.user.uid}/${Date.now()}_${req.file.originalname}`;
    const file = storage.file(filename);

    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
        custom_metadata: {
          uploadedBy: req.user.uid,
          uploadedAt: new Date().toISOString(),
          originalName: req.file.originalname
        }
      }
    });

    // Save metadata to database
    const docId = db.ref('documents').push().key;
    const docMetadata = {
      id: docId,
      filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedBy: req.user.uid,
      uploadedAt: new Date().toISOString(),
      checklistId: req.body.checklistId || null
    };

    await db.ref(`documents/${docId}`).set(docMetadata);

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: docMetadata
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// List documents
router.get('/', verifyToken, async (req, res) => {
  try {
    const snapshot = await db.ref('documents').once('value');
    const documents = snapshot.val() || {};

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Download document
router.get('/:id/download', verifyToken, async (req, res) => {
  try {
    const docSnapshot = await db.ref(`documents/${req.params.id}`).once('value');
    const doc = docSnapshot.val();

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const file = storage.file(doc.filename);
    const [exists] = await file.exists();

    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.setHeader('Content-Type', doc.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.originalName}"`);

    file.createReadStream().pipe(res);
  } catch (error) {
    res.status(500).json({ error: 'Download failed' });
  }
});

// Delete document
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const docSnapshot = await db.ref(`documents/${req.params.id}`).once('value');
    const doc = docSnapshot.val();

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (doc.uploadedBy !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await storage.file(doc.filename).delete();
    await db.ref(`documents/${req.params.id}`).remove();

    res.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
