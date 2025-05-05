import express from 'express';
import cors from 'cors';
import activityRoutes from './routes/activity';
import heirRoutes from './routes/heirs';
import riddleRoutes from './routes/riddle';
import livenessRoutes from './routes/liveness';
import dotenv from 'dotenv';
import LocalStorageManager from './local-storage';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/activity', activityRoutes);
app.use('/api/heirs', heirRoutes);
app.use('/api/riddle', riddleRoutes);
app.use('/api/liveness', livenessRoutes);

// Gaia webhook for voice verification
app.post('/api/webhook/gaia-voice', async (req, res) => {
  const { userAddress, verified } = req.body;

  try {
    if (verified) {
      // Update activities
      let activities = (await LocalStorageManager.getUserData(userAddress, 'activities')) || [];
      activities = Array.isArray(activities) ? activities : []; // Ensure activities is an array
      activities.push({
        timestamp: new Date().toISOString(),
        type: 'Voice Verification',
        completed: true,
      });
      await LocalStorageManager.saveUserData(userAddress, 'activities', activities);
    }
    res.json({ success: verified });
  } catch (error) {
    console.error('Error in webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});