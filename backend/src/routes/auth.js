import express from 'express';
import authController from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', (req, res) => authController.register(req, res));
<<<<<<< HEAD
=======
router.post('/login', (req, res) => authController.login(req, res));
>>>>>>> fc6ec64ec3e786690c530066aaabc0b0ac961d73
router.get('/me', verifyToken, (req, res) => authController.getCurrentUser(req, res));

export default router;
