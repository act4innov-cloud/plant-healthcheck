const admin = require('firebase-admin');

let firebaseApp;

const initializeFirebase = () => {
  try {
    // Vérifier si déjà initialisé
    if (firebaseApp) {
      return firebaseApp;
    }

    // Option 1: Utiliser FIREBASE_SERVICE_ACCOUNT (JSON string)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
      
      console.log('✅ Firebase Admin initialized successfully');
      return firebaseApp;
    }
    
    // Option 2: Construire l'objet depuis variables séparées
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CERT_URL
      };

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
      
      console.log('✅ Firebase Admin initialized successfully');
      return firebaseApp;
    }

    throw new Error('Firebase credentials not found in environment variables');
    
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    throw error;
  }
};

// Initialiser Firebase
initializeFirebase();

// Middleware d'authentification
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'No token provided' 
      });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role || 'user'
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Invalid token' 
    });
  }
};

module.exports = { admin, authenticateUser };
