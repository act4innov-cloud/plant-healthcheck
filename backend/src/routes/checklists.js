import express from 'express';
const router = express.Router();
router.get('/', async (req, res) => {
  res.json({ message: 'Checklists endpoint' });
});
export default router;
