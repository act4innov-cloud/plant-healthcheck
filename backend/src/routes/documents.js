import express from 'express';
const router = express.Router();
router.get('/', async (req, res) => {
  res.json({ message: 'Documents endpoint' });
});
export default router;
