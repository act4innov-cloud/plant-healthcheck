const admin = require('firebase-admin');
const pool = require('../config/database');

// Initialiser Firebase Admin
let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) return;

  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    firebaseInitialized = true;
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    throw error;
  }
}

// Initialiser Firebase au démarrage
initializeFirebase();

// ============================================================================
// Middleware d'authentification
// ============================================================================
async function authMiddleware(req, res, next) {
  try {
    // Extraire le token du header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No authentication token provided',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
        code: 'AUTH_TOKEN_INVALID'
      });
    }

    // Vérifier le token Firebase
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      console.error('Token verification error:', error.message);
      
      if (error.code === 'auth/id-token-expired') {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
          code: 'AUTH_TOKEN_EXPIRED'
        });
      }
      
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'AUTH_TOKEN_INVALID'
      });
    }

    // Récupérer l'utilisateur depuis la base de données
    const userQuery = `
      SELECT id, firebase_uid, email, display_name, role, department, is_active
      FROM users
      WHERE firebase_uid = $1
    `;
    
    const userResult = await pool.query(userQuery, [decodedToken.uid]);

    if (userResult.rows.length === 0) {
      // Créer l'utilisateur s'il n'existe pas (première connexion)
      const createUserQuery = `
        INSERT INTO users (firebase_uid, email, display_name, role)
        VALUES ($1, $2, $3, 'inspector')
        RETURNING id, firebase_uid, email, display_name, role, department, is_active
      `;
      
      const newUserResult = await pool.query(createUserQuery, [
        decodedToken.uid,
        decodedToken.email,
        decodedToken.name || decodedToken.email.split('@')[0],
      ]);

      req.user = newUserResult.rows[0];
      
      console.log(`✅ New user created: ${req.user.email}`);
    } else {
      const user = userResult.rows[0];

      // Vérifier si l'utilisateur est actif
      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          error: 'User account is disabled',
          code: 'USER_DISABLED'
        });
      }

      req.user = user;

      // Mettre à jour last_login
      await pool.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );
    }

    // Ajouter les infos Firebase au contexte
    req.firebaseUser = decodedToken;

    next();

  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
}

// ============================================================================
// Middleware de vérification de rôle
// ============================================================================
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
}

// ============================================================================
// Middleware optionnel d'authentification (pour routes publiques)
// ============================================================================
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    const userQuery = 'SELECT * FROM users WHERE firebase_uid = $1';
    const userResult = await pool.query(userQuery, [decodedToken.uid]);
    
    if (userResult.rows.length > 0) {
      req.user = userResult.rows[0];
      req.firebaseUser = decodedToken;
    } else {
      req.user = null;
    }
  } catch (error) {
    req.user = null;
  }
  
  next();
}

module.exports = {
  authMiddleware,
  requireRole,
  optionalAuth
};
