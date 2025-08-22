import jwt from 'jsonwebtoken';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  try {
    // Verify JWT token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'your-secret-key');
    
    if (req.method === 'GET') {
      // Get user's wallet from Firestore
      const userWalletRef = db.collection('userWallets').doc(decoded.id);
      const userWalletDoc = await userWalletRef.get();
      
      if (userWalletDoc.exists) {
        const data = userWalletDoc.data();
        return res.json({ 
          wallet: data.wallet,
          addedAt: data.addedAt,
          canChange: false // Once added, cannot be changed
        });
      } else {
        return res.json({ 
          wallet: null,
          canChange: true // Can add wallet if none exists
        });
      }
    }
    
    if (req.method === 'POST') {
      const { wallet } = req.body;
      
      if (!wallet || typeof wallet !== 'string' || wallet.trim() === '') {
        return res.status(400).json({ error: 'Valid wallet address is required' });
      }
      
      // Validate wallet format (basic validation for Abstract wallet)
      if (!wallet.startsWith('0x') || wallet.length !== 42) {
        return res.status(400).json({ error: 'Invalid wallet format. Must be a valid Ethereum address.' });
      }
      
      // Check if user already has a wallet
      const userWalletRef = db.collection('userWallets').doc(decoded.id);
      const userWalletDoc = await userWalletRef.get();
      
      if (userWalletDoc.exists) {
        return res.status(400).json({ 
          error: 'Wallet already added. Cannot change wallet address once added.',
          canChange: false
        });
      }
      
      // Save wallet to Firestore
      await userWalletRef.set({
        userId: decoded.id,
        wallet: wallet.trim(),
        addedAt: new Date(),
        displayName: decoded.displayName || 'User'
      });
      
      return res.json({ 
        success: true, 
        wallet: wallet.trim(),
        message: 'Wallet added successfully! You can now access NFT minting.',
        canChange: false
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Wallet API error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
