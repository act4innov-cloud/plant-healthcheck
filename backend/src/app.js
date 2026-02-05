import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running' });
});

app.post('/api/auth/register', (req, res) => {
  const { email, displayName } = req.body;
  res.json({ 
    success: true,
    message: 'User created',
    email,
    displayName
  });
});

export default app;
