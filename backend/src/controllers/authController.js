import { auth, db } from '../config/firebase.js';
import jwt from 'jsonwebtoken';
import emailService from '../services/emailService.js';

class AuthController {
  async register(req, res) {
    try {
      const { email, password, displayName, phone } = req.body;

      // Create Firebase user
      const userRecord = await auth.createUser({
        email,
        password,
        displayName
      });

      // Save to database
      await db.ref(`users/${userRecord.uid}`).set({
        uid: userRecord.uid,
        email,
        displayName,
        phone: phone || '',
        role: 'user',
        createdAt: new Date().toISOString(),
        status: 'active'
      });

      // Send welcome email
      await emailService.sendWelcome(email, displayName);

      res.json({ 
        success: true, 
        message: 'Account created successfully',
        uid: userRecord.uid 
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Firebase handles authentication via SDK
      res.json({ 
        success: true, 
        message: 'Use Firebase SDK for login',
        hint: 'Login is handled by Firebase on the client side'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getCurrentUser(req, res) {
    try {
      const userId = req.user?.uid;
      const userRef = await db.ref(`users/${userId}`).get();
      
      if (!userRef.exists()) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(userRef.val());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new AuthController();
