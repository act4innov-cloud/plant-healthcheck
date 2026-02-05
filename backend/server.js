import app from './src/app.js';
import dotenv from 'dotenv';

dotenv.config();

<<<<<<< HEAD
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
=======
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ API running on port ${PORT}`);
  console.log(`📡 API URL: http://localhost:${PORT}`);
>>>>>>> fc6ec64ec3e786690c530066aaabc0b0ac961d73
});
