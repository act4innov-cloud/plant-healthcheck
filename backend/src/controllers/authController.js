import { auth, db } from '../config/firebase.js';
import emailService from '../services/emailService.js';

class AuthController {
  async register(req, res) {
    try {
      const { email, password, displayName, phone } = req.body;

      const userRecord = await auth.createUser({
        email,
        password,
        displayName
      });

      await db.ref('users/' + userRecord.uid).set({
        uid: userRecord.uid,
        email,
        displayName,
        phone: phone || '',
        role: 'user',
        createdAt: new Date().toISOString()
      });

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

  async getCurrentUser(req, res) {
    try {
      const userId = req.user?.uid;
      const userRef = await db.ref('users/' + userId).get();
      
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
