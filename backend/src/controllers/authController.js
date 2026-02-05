import { auth, db } from '../config/firebase.js';
<<<<<<< HEAD
=======
import jwt from 'jsonwebtoken';
>>>>>>> fc6ec64ec3e786690c530066aaabc0b0ac961d73
import emailService from '../services/emailService.js';

class AuthController {
  async register(req, res) {
    try {
      const { email, password, displayName, phone } = req.body;

<<<<<<< HEAD
=======
      // Create Firebase user
>>>>>>> fc6ec64ec3e786690c530066aaabc0b0ac961d73
      const userRecord = await auth.createUser({
        email,
        password,
        displayName
      });

<<<<<<< HEAD
      await db.ref('users/' + userRecord.uid).set({
=======
      // Save to database
      await db.ref(`users/${userRecord.uid}`).set({
>>>>>>> fc6ec64ec3e786690c530066aaabc0b0ac961d73
        uid: userRecord.uid,
        email,
        displayName,
        phone: phone || '',
        role: 'user',
<<<<<<< HEAD
        createdAt: new Date().toISOString()
      });

=======
        createdAt: new Date().toISOString(),
        status: 'active'
      });

      // Send welcome email
>>>>>>> fc6ec64ec3e786690c530066aaabc0b0ac961d73
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

<<<<<<< HEAD
  async getCurrentUser(req, res) {
    try {
      const userId = req.user?.uid;
      const userRef = await db.ref('users/' + userId).get();
=======
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
>>>>>>> fc6ec64ec3e786690c530066aaabc0b0ac961d73
      
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
