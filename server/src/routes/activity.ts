import express from 'express';
import LocalStorageManager from '../local-storage';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

router.get('/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }
    
    // Fetch activities from local storage
    const activities = await LocalStorageManager.getUserData(userAddress, 'activities') || [];
    
    res.json(activities);
  } catch (error) {
    console.error('Error in GET /api/activity:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to fetch activities' });
  }
});

export default router;