import express from 'express';
import GaiaConnector from '../gaia-connector';
import LocalStorageManager from '../local-storage';
import { ENV } from '../env';
import dotenv from 'dotenv';
dotenv.config(); // ✅ Make sure this is before any other imports
import { Heir } from '../types';


const router = express.Router();

router.get('/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;

    // Validate userAddress format (basic Ethereum address check)
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }
    
    // Try to get from local storage first
    let heirs = await LocalStorageManager.getUserData(userAddress, 'heirs');
    
    if (!heirs) {
      // Validate environment variables before creating GaiaConnector
      const requiredEnvVars = [
        'RPC_URL',
        'SCHRODINGER_ADDRESS',
        'GAIA_ORACLE_ADDRESS',
        'PRIVATE_KEY'
      ];
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
      }

      const gaia = new GaiaConnector(
        ENV.RPC_URL,
        ENV.SCHRODINGER_ADDRESS,
        ENV.GAIA_ORACLE_ADDRESS,
        ENV.PRIVATE_KEY
      );
      
      heirs = await gaia.getHeirs(userAddress);
      await LocalStorageManager.saveUserData(userAddress, 'heirs', heirs);
    }
    
    res.json(heirs || []);
  } catch (error) {
    console.error('Error in GET /api/heirs:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to fetch heirs' });
  }
});

router.post('/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    const { heirAddress, share } = req.body;
    
    if (!heirAddress || typeof share !== 'number' || share <= 0 || share > 100) {
      return res.status(400).json({ error: 'Invalid heir address or share percentage' });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress) || !/^0x[a-fA-F0-9]{40}$/.test(heirAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    const requiredEnvVars = [
      'RPC_URL',
      'SCHRODINGER_ADDRESS',
      'GAIA_ORACLE_ADDRESS',
      'PRIVATE_KEY'
    ];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    const gaia = new GaiaConnector(
      ENV.RPC_URL,
      ENV.SCHRODINGER_ADDRESS,
      ENV.GAIA_ORACLE_ADDRESS,
      ENV.PRIVATE_KEY
    );
    
    // Fetch existing heirs from local storage
    let heirs = (await LocalStorageManager.getUserData(userAddress, 'heirs')) || [];
    heirs = Array.isArray(heirs) ? heirs : [];

    // Add the new heir
    heirs.push({ address: heirAddress, share: share.toString(), approved: false });
    await LocalStorageManager.saveUserData(userAddress, 'heirs', heirs)
    
    // Log the activity
    const activities = (await LocalStorageManager.getUserData(userAddress, 'activities')) || [];
    const newActivity = {
      id: `activity-${Date.now()}`,
      type: 'HeirAddition',
      description: `Added heir: ${heirAddress.slice(0, 6)}...${heirAddress.slice(-4)} with ${share}% share`,
      timestamp: Date.now(),
    };
    activities.push(newActivity);
    await LocalStorageManager.saveUserData(userAddress, 'activities', activities);;
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/heirs:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to add heir' });
  }
});

router.post('/approve/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    const { heirAddress } = req.body;

    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress) || !/^0x[a-fA-F0-9]{40}$/.test(heirAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    // Fetch existing heirs from local storage
    let heirs = (await LocalStorageManager.getUserData(userAddress, 'heirs')) || [];
    heirs = Array.isArray(heirs) ? heirs : [];

    // Find and update the heir's approval status
    const heirIndex = heirs.findIndex((h: Heir) => h.address.toLowerCase() === heirAddress.toLowerCase());
    if (heirIndex === -1) {
      return res.status(404).json({ error: 'Heir not found' });
    }

    heirs[heirIndex].approved = true;
    await LocalStorageManager.saveUserData(userAddress, 'heirs', heirs);

    // Log the activity
    const activities = (await LocalStorageManager.getUserData(userAddress, 'activities')) || [];
    const newActivity = {
      id: `activity-${Date.now()}`,
      type: 'HeirApproval',
      description: `Approved heir: ${heirAddress.slice(0, 6)}...${heirAddress.slice(-4)}`,
      timestamp: Date.now(),
    };
    activities.push(newActivity);
    await LocalStorageManager.saveUserData(userAddress, 'activities', activities);

    res.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/heirs/approve:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to approve heir' });
  }
});

export default router;