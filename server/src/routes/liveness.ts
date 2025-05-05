import express from 'express';
import LocalStorageManager from '../local-storage';

const router = express.Router();

// Get liveness data for a user
router.get('/:userAddress', async (req, res) => {
  const { userAddress } = req.params;

  try {
    const livenessData = (await LocalStorageManager.getUserData(userAddress, 'liveness')) || {
      referencePicture: null,
      faceTag: null,
      isFundsLocked: true,
    };
    res.json(livenessData);
  } catch (error) {
    console.error('Error fetching liveness data:', error);
    res.status(500).json({ error: 'Failed to fetch liveness data' });
  }
});

// Set reference picture
router.post('/reference/:userAddress', async (req, res) => {
  const { userAddress } = req.params;
  const { referencePicture, faceTag } = req.body;

  if (!referencePicture) {
    return res.status(400).json({ error: 'Reference picture is required' });
  }

  if (!faceTag) {
    return res.status(400).json({ error: 'Face tag is required' });
  }

  try {
    let livenessData = (await LocalStorageManager.getUserData(userAddress, 'liveness')) || {
      referencePicture: null,
      faceTag: null,
      isFundsLocked: true,
    };
    livenessData.referencePicture = referencePicture;
    livenessData.faceTag = faceTag;
    await LocalStorageManager.saveUserData(userAddress, 'liveness', livenessData);
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting reference picture:', error);
    res.status(500).json({ error: 'Failed to set reference picture' });
  }
});

// Remove reference picture
router.delete('/reference/:userAddress', async (req, res) => {
  const { userAddress } = req.params;

  try {
    let livenessData = (await LocalStorageManager.getUserData(userAddress, 'liveness')) || {
      referencePicture: null,
      faceTag: null,
      isFundsLocked: true,
    };
    livenessData.referencePicture = null;
    livenessData.faceTag = null;
    await LocalStorageManager.saveUserData(userAddress, 'liveness', livenessData);
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing reference picture:', error);
    res.status(500).json({ error: 'Failed to remove reference picture' });
  }
});

// Verify liveness
router.post('/verify/:userAddress', async (req, res) => {
  const { userAddress } = req.params;
  const { capturedPicture, faceTag } = req.body;

  if (!capturedPicture) {
    return res.status(400).json({ error: 'Captured picture is required' });
  }

  if (!faceTag) {
    return res.status(400).json({ error: 'Face tag is required' });
  }

  try {
    const livenessData = (await LocalStorageManager.getUserData(userAddress, 'liveness')) || {
      referencePicture: null,
      faceTag: null,
      isFundsLocked: true,
    };

    if (!livenessData.referencePicture || !livenessData.faceTag) {
      return res.status(400).json({ error: 'No reference picture or face tag set' });
    }

    // Simulate face verification by comparing face tags
    const verificationSuccess = livenessData.faceTag === faceTag;

    if (verificationSuccess) {
      livenessData.isFundsLocked = false;
      await LocalStorageManager.saveUserData(userAddress, 'liveness', livenessData);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Face does not match the reference picture' });
    }
  } catch (error) {
    console.error('Error verifying liveness:', error);
    res.status(500).json({ error: 'Failed to verify liveness' });
  }
});

export default router;