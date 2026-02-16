import express from 'express';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    res.json({ 
      success: true,
      message: 'User registered',
      email,
      displayName
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    res.json({ 
      success: true,
      message: 'User logged in',
      email
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', async (req, res) => {
  res.json({ message: 'User profile' });
});

export default router;
