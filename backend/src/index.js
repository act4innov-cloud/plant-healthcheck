import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.get('/', (req, res) => {
  res.json({ service: 'PlantHealthCheck API' });
});

app.post('/api/auth/register', (req, res) => {
  res.json({ success: true, message: 'User registered' });
});

app.get('/api/users', (req, res) => {
  res.json({ message: 'Users endpoint' });
});

app.get('/api/alerts', (req, res) => {
  res.json({ message: 'Alerts endpoint' });
});

app.get('/api/checklists', (req, res) => {
  res.json({ message: 'Checklists endpoint' });
});

app.get('/api/dashboard', (req, res) => {
  res.json({ message: 'Dashboard endpoint' });
});

app.get('/api/documents', (req, res) => {
  res.json({ message: 'Documents endpoint' });
});

app.get('/api/equipments', (req, res) => {
  res.json({ message: 'Equipments endpoint' });
});

app.get('/api/reports', (req, res) => {
  res.json({ message: 'Reports endpoint' });
});

app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});

export default app;
