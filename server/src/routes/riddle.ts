import express from 'express';
import GaiaConnector from '../gaia-connector';
import RiddleEngine from '../riddle-engine';
import LocalStorageManager from '../local-storage';
import dotenv from 'dotenv';
dotenv.config(); // ✅ Make sure this is before any other imports
import { ENV } from '../env';


const router = express.Router();

router.get('/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    // Check local storage for a custom riddle
    let riddle = await LocalStorageManager.getUserData(userAddress, 'riddle');
    if (!riddle) {
        const gaia = new GaiaConnector(
            ENV.RPC_URL,
            ENV.SCHRODINGER_ADDRESS,
            ENV.GAIA_ORACLE_ADDRESS,
            ENV.PRIVATE_KEY
          );
      const { question, answer } = await gaia.generateAndVerifyRiddle(userAddress);
      riddle = { id: 'riddle-id', question, answer };
      await LocalStorageManager.saveUserData(userAddress, 'riddle', riddle);
    }
    // Don't return the answer to the client
    const { answer, ...riddleWithoutAnswer } = riddle;
    res.json(riddleWithoutAnswer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    const { id, question, answer } = req.body;
    const riddle = { id, question, answer };
    await LocalStorageManager.saveUserData(userAddress, 'riddle', riddle);

    // Log the activity
    const activities = (await LocalStorageManager.getUserData(userAddress, 'activities')) || [];
    const newActivity = {
      id: `activity-${Date.now()}`,
      type: 'RiddleCreation',
      description: `Created riddle: ${question}`,
      timestamp: Date.now(),
    };
    activities.push(newActivity);
    await LocalStorageManager.saveUserData(userAddress, 'activities', activities);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/verify/:userAddress', async (req, res) => {
    try {
      const { userAddress } = req.params;
      const { riddleId, answer } = req.body;
      
      if (!riddleId || !answer) {
        return res.status(400).json({ error: 'Missing required fields: riddleId, answer' });
      }
      
      if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
        return res.status(400).json({ error: 'Invalid Ethereum address' });
      }
      
      const riddle = await LocalStorageManager.getUserData(userAddress, 'riddle');
      
      if (!riddle || riddle.id !== riddleId || riddle.answer !== answer) {
        return res.json({ success: false });
      }

      // Log the activity
    const activities = (await LocalStorageManager.getUserData(userAddress, 'activities')) || [];
    const newActivity = {
      id: `activity-${Date.now()}`,
      type: 'RiddleVerification',
      description: `Verified riddle: ${riddle.question}`,
      timestamp: Date.now(),
    };
    activities.push(newActivity);
    await LocalStorageManager.saveUserData(userAddress, 'activities', activities);
      
      // Riddle verification successful; no on-chain interaction
      res.json({ success: true });
    } catch (error) {
      console.error('Error in POST /api/riddle/verify:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to verify riddle' });
    }
  });

export default router;