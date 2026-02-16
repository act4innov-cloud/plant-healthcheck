import express from 'express';
const router = express.Router();
router.get('/', async (req, res) => {
  res.json({ message: 'Alerts endpoint' });
});
export default router;
